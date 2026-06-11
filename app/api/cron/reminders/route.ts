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
function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      "[cron/reminders] CRÍTICO: CRON_SECRET no está configurado. Request rechazado."
    );
    return false;
  }
  const expected = `Bearer ${secret}`;
  const provided = req.headers.get("authorization") ?? "";
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Vercel Cron: runs every hour — GET /api/cron/reminders
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const currentHour = now.getUTCHours();

  // Today's day of week (0=Sun, 1=Mon, ..., 6=Sat) in UTC
  const todayDow = now.getUTCDay();

  // Find students with a training day today and reminder_hour matching now
  const { data: targets } = await admin
    .from("profiles")
    .select("id, reminder_hour")
    .eq("role", "student")
    .eq("reminder_hour", currentHour)
    .eq("archived", false);

  if (!targets || targets.length === 0) return NextResponse.json({ sent: 0 });

  // Filter: student has training day today
  const studentIds = targets.map((t: { id: string }) => t.id);
  const { data: trainingToday } = await admin
    .from("training_days")
    .select("student_id")
    .in("student_id", studentIds)
    .eq("day_of_week", todayDow);

  const studentIdsToday = new Set((trainingToday ?? []).map((t: { student_id: string }) => t.student_id));

  // Filter: hasn't already trained today
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: alreadyTrained } = await admin
    .from("exercise_logs")
    .select("student_id")
    .in("student_id", Array.from(studentIdsToday))
    .gte("logged_at", todayStart.toISOString());

  const trainedSet = new Set((alreadyTrained ?? []).map((l: { student_id: string }) => l.student_id));

  const toNotify = Array.from(studentIdsToday).filter((id) => !trainedSet.has(id));
  if (toNotify.length === 0) return NextResponse.json({ sent: 0 });

  // Get push subscriptions
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", toNotify);

  const payload = Buffer.from(
    JSON.stringify({
      title: "Día de entrenamiento 💪",
      body: "Hoy es tu día de entrenamiento. Abrí TrackFit Pro para ver tu sesión.",
      url: "/dashboard/my-sessions",
    }),
    "utf8"
  );

  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { contentEncoding: "aes128gcm", TTL: 86400 }
      );
      sent++;
    } catch {}
  }

  return NextResponse.json({ sent });
}
