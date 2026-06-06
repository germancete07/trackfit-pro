import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:admin@trackfit.pro", VAPID_PUBLIC, VAPID_PRIVATE);
}

// Called by Supabase Database Webhook on notifications INSERT
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // Supabase webhook sends { type, table, record, ... }
  const notification = body.record ?? body;
  const { id: notifId, user_id: rawUserId } = notification;
  if (!rawUserId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // Re-fetch from DB to guarantee UTF-8 strings (webhook payload encoding can corrupt accented chars)
  let message: string = notification.message ?? "";
  let type: string = notification.type ?? "";
  let reference_id: string | undefined = notification.reference_id;
  let user_id: string = rawUserId;

  if (notifId) {
    const { data: fresh } = await admin
      .from("notifications")
      .select("user_id, message, type, reference_id")
      .eq("id", notifId)
      .single();
    if (fresh) {
      user_id = fresh.user_id;
      message = fresh.message ?? message;
      type = fresh.type ?? type;
      reference_id = fresh.reference_id ?? reference_id;
    }
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (!subs || subs.length === 0) return NextResponse.json({ ok: true });

  const title = typeToTitle(type);
  // Explicit UTF-8 Buffer avoids encoding ambiguity in web-push for Spanish characters
  const payload = Buffer.from(
    JSON.stringify({ title, body: message, url: urlForType(type, reference_id) }),
    "utf8"
  );

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
    case "session_logged": return "TrackFit Pro";
    case "correction_submitted": return "Video nuevo";
    case "correction_reviewed": return "Corrección recibida";
    case "message_received": return "Mensaje nuevo";
    case "assignment_completed": return "Ciclo completado";
    case "session_rescheduled": return "Rutina reagendada";
    case "message_received": return "Mensaje nuevo";
    case "routine_assigned": return "Nueva rutina asignada";
    default: return "TrackFit Pro";
  }
}

function urlForType(type: string, referenceId?: string) {
  switch (type) {
    case "session_logged": return "/dashboard/students";
    case "correction_submitted": return "/dashboard/corrections";
    case "correction_reviewed": return "/dashboard/corrections";
    case "message_received": return referenceId ? `/dashboard/chat/${referenceId}` : "/dashboard/chat";
    case "assignment_completed": return referenceId ? `/dashboard/students/${referenceId}` : "/dashboard/students";
    case "session_rescheduled": return referenceId ? `/dashboard/students/${referenceId}` : "/dashboard/students";
    case "message_received": return referenceId ? `/dashboard/chat/${referenceId}` : "/dashboard/chat";
    case "routine_assigned": return "/dashboard/my-sessions";
    default: return "/dashboard/notifications";
  }
}
