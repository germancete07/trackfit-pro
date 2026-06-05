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
  const { user_id, message, type, reference_id } = notification;
  if (!user_id) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (!subs || subs.length === 0) return NextResponse.json({ ok: true });

  const title = typeToTitle(type);
  const payload = JSON.stringify({
    title,
    body: message,
    url: urlForType(type, reference_id),
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(() => {})
    )
  );

  return NextResponse.json({ ok: true });
}

function typeToTitle(type: string) {
  switch (type) {
    case "session_logged": return "TrackFit Pro";
    case "correction_submitted": return "Video nuevo";
    case "correction_reviewed": return "Correccion recibida";
    case "message_received": return "Mensaje nuevo";
    default: return "TrackFit Pro";
  }
}

function urlForType(type: string, referenceId?: string) {
  switch (type) {
    case "session_logged": return "/dashboard/students";
    case "correction_submitted": return "/dashboard/corrections";
    case "correction_reviewed": return "/dashboard/corrections";
    case "message_received": return referenceId ? `/dashboard/chat/${referenceId}` : "/dashboard/chat";
    default: return "/dashboard/notifications";
  }
}
