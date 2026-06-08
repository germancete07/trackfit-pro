import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from "mercadopago";

export function getMPClient() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado");
  return new MercadoPagoConfig({ accessToken: token });
}

// Plan definitions — amounts in ARS
export const MP_PLANS = {
  starter: { title: "TrackFit Pro · Starter", amount: 12000, planKey: "starter" },
  pro:     { title: "TrackFit Pro · Pro",     amount: 20000, planKey: "pro"     },
  elite:   { title: "TrackFit Pro · Elite",   amount: 35000, planKey: "elite"   },
} as const;

export type MPPlanKey = keyof typeof MP_PLANS;

// Env var names that store the MP plan IDs (set after running create-mp-plans script)
export const MP_PLAN_ID_ENV: Record<MPPlanKey, string> = {
  starter: "MP_PLAN_ID_STARTER",
  pro:     "MP_PLAN_ID_PRO",
  elite:   "MP_PLAN_ID_ELITE",
};

function getPlanId(planKey: MPPlanKey): string {
  const envKey = MP_PLAN_ID_ENV[planKey];
  const id = process.env[envKey];
  if (!id) throw new Error(`${envKey} no configurado. Ejecutá scripts/create-mp-plans.ts primero.`);
  return id;
}

/**
 * Creates a preapproval (subscription) for a specific trainer
 * linked to a preapproval_plan. Returns the init_point URL to redirect the user.
 */
export async function createSubscription({
  planKey,
  payerEmail,
  trainerId,
}: {
  planKey: MPPlanKey;
  payerEmail: string;
  trainerId: string;
}): Promise<{ initPoint: string; preapprovalId: string }> {
  const def = MP_PLANS[planKey];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trackfitpro.app";
  const client = getMPClient();
  const preApproval = new PreApproval(client);

  // Create the preapproval with inline auto_recurring (NOT preapproval_plan_id).
  // This makes MP return an init_point where the user enters their card,
  // instead of attempting a server-side charge that requires a card_token.
  const result = await preApproval.create({
    body: {
      reason: def.title,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: def.amount,
        currency_id: "ARS",
      },
      back_url: `${appUrl}/dashboard/settings?mp=success&plan=${planKey}`,
      external_reference: `${trainerId}|${planKey}`,
      status: "pending",
    },
  });

  if (!result.init_point || !result.id) {
    throw new Error("MP no devolvió init_point");
  }

  return { initPoint: result.init_point, preapprovalId: result.id };
}

/**
 * Cancels an active preapproval subscription.
 */
export async function cancelSubscription(preapprovalId: string) {
  const client = getMPClient();
  const preApproval = new PreApproval(client);
  await preApproval.update({
    id: preapprovalId,
    body: { status: "cancelled" },
  });
}

/**
 * Creates all 3 plan templates in MP (run once via script).
 * Returns the plan IDs to store as env vars.
 */
export async function createAllMPPlans(backUrl: string) {
  const client = getMPClient();
  const planApi = new PreApprovalPlan(client);
  const results: Record<string, string> = {};

  for (const [key, def] of Object.entries(MP_PLANS)) {
    const plan = await planApi.create({
      body: {
        reason: def.title,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: def.amount,
          currency_id: "ARS",
          billing_day: 1,
          billing_day_proportional: true,
        },
        back_url: backUrl,
        payment_methods_allowed: {
          payment_types: [{}],
          payment_methods: [{}],
        },
      },
    });

    if (!plan.id) throw new Error(`No se pudo crear el plan ${key}`);
    results[key] = plan.id;
    console.log(`✓ Plan ${key}: ${plan.id}`);
  }

  return results;
}
