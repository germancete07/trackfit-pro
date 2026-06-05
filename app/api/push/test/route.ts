import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:admin@trackfit.pro", VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdminClient();

  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (subErr) {
    return NextResponse.json({ error: "Error al leer suscripciones: " + subErr.message }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      ok: false,
      message: "No hay suscripciones push registradas para este usuario. Activa las notificaciones push en tu perfil primero.",
      subscriptions: 0,
    });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "VAPID keys no configuradas" }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: "TrackFit Pro — Prueba exitosa",
    body: "Las notificaciones push estan funcionando correctamente.",
    url: "/dashboard",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").map((r) =>
    r.status === "rejected" ? String(r.reason) : ""
  );

  return NextResponse.json({
    ok: sent > 0,
    sent,
    total: subs.length,
    failed: failed.length > 0 ? failed : undefined,
  });
}
