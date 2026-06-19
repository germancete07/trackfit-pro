import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:admin@trackfit.pro", VAPID_PUBLIC, VAPID_PRIVATE);
}

/** Fail-closed: rejects when secret is missing. Uses timing-safe comparison. */
function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[push/send] CRÍTICO: PUSH_WEBHOOK_SECRET no está configurado. Request rechazado."
    );
    return false;
  }
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (provided.length !== secret.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

// Called by Supabase Database Webhook on notifications INSERT
export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // Supabase webhook sends { type, table, record, ... }
  const notification = body.record ?? body;
  const { id: notifId, user_id: rawUserId } = notification;
  if (!rawUserId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // Re-fetch from DB to guarantee UTF-8 strings.
  // Supabase webhook JSON payloads can arrive with Latin-1/UTF-8 double-encoding that corrupts
  // accented characters (e.g. "registrÃ³" instead of "registró"). A fresh DB read via
  // supabase-js always returns correctly decoded UTF-8, bypassing the webhook encoding issue.
  let message: string = notification.message ?? "";
  let type: string = notification.type ?? "";
  let reference_id: string | undefined = notification.reference_id;
  let user_id: string = rawUserId;

  if (notifId) {
    const { data: fresh, error: fetchErr } = await admin
      .from("notifications")
      .select("user_id, message, type, reference_id")
      .eq("id", notifId)
      .single();
    if (fetchErr) {
      console.warn("[push/send] Re-fetch failed, push may contain corrupted chars:", fetchErr.message);
    }
    if (fresh) {
      user_id = fresh.user_id;
      // Prefer fresh DB values — never fall back to webhook payload for text fields
      if (fresh.message !== null && fresh.message !== undefined) message = fresh.message;
      if (fresh.type !== null && fresh.type !== undefined) type = fresh.type;
      if (fresh.reference_id !== null && fresh.reference_id !== undefined) reference_id = fresh.reference_id;
    }
  } else {
    console.warn("[push/send] notifId missing in webhook payload — accented characters may be corrupted in push notification");
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (!subs || subs.length === 0) return NextResponse.json({ ok: true });

  const title = typeToTitle(type);
  // Pass JSON string directly — web-push handles UTF-8 encoding internally.
  // Using Buffer.from(..., "utf8") caused double-encoding on some runtimes.
  const payload = JSON.stringify({ title, body: message, url: urlForType(type, reference_id) });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { contentEncoding: "aes128gcm", TTL: 86400 }
      ).catch(() => {})
    )
  );

  return NextResponse.json({ ok: true });
}

function typeToTitle(type: string) {
  switch (type) {
    case "session_logged":        return "TrackFit Pro";
    case "correction_submitted":  return "Video nuevo";
    case "correction_reviewed":   return "Corrección recibida";
    case "message_received":      return "Mensaje nuevo";
    case "assignment_completed":  return "Ciclo completado";
    case "session_rescheduled":   return "Rutina reagendada";
    case "routine_assigned":      return "Nueva rutina asignada";
    default:                      return "TrackFit Pro";
  }
}

function urlForType(type: string, referenceId?: string) {
  switch (type) {
    // Trainer receives: student logged a session → go to that student's profile
    case "session_logged":
      return referenceId ? `/dashboard/students/${referenceId}` : "/dashboard";
    // Trainer receives: student submitted a correction video
    case "correction_submitted":
      return referenceId ? `/dashboard/students/${referenceId}?tab=correcciones` : "/dashboard/corrections";
    // Student receives: trainer reviewed their video
    case "correction_reviewed":
      return "/dashboard/profile?tab=videos";
    // Any user: new message → open the chat thread
    case "message_received":
      return referenceId ? `/dashboard/chat/${referenceId}` : "/dashboard/chat";
    // Trainer receives: student completed a cycle
    case "assignment_completed":
      return referenceId ? `/dashboard/students/${referenceId}` : "/dashboard";
    // Trainer receives: session was rescheduled
    case "session_rescheduled":
      return referenceId ? `/dashboard/students/${referenceId}` : "/dashboard";
    // Student receives: trainer assigned a new routine
    case "routine_assigned":
      return "/dashboard/my-sessions";
    default:
      return "/dashboard/notifications";
  }
}
