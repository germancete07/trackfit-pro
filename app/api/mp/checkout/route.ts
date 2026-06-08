import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSubscription, MP_PLANS } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MPPlanKey } from "@/lib/mercadopago";

function isValidPlanKey(key: string): key is MPPlanKey {
  return key in MP_PLANS;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { planKey } = await req.json();
    if (!isValidPlanKey(planKey)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    // Verify trainer role
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, email, mp_preapproval_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "trainer") {
      return NextResponse.json({ error: "Solo entrenadores pueden suscribirse" }, { status: 403 });
    }

    const { initPoint, preapprovalId } = await createSubscription({
      planKey,
      payerEmail: profile.email ?? user.email ?? "",
      trainerId: user.id,
    });

    // Save preapproval ID (pending approval)
    await admin
      .from("profiles")
      .update({ mp_preapproval_id: preapprovalId, mp_plan_key: planKey })
      .eq("id", user.id);

    return NextResponse.json({ initPoint });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[MP checkout] RAW:", JSON.stringify(err, null, 2));
    return NextResponse.json(
      { error: "Error al crear la suscripción", detail: message },
      { status: 500 }
    );
  }
}
