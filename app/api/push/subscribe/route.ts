import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { userId, endpoint, p256dh, auth } = await req.json();
  if (!userId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "user_id,endpoint" });

  return NextResponse.json({ ok: true });
}
