/**
 * Run ONCE to create the 3 TrackFit Pro plans in MercadoPago.
 *
 * Usage:
 *   MP_ACCESS_TOKEN=TU_TOKEN npx ts-node --project tsconfig.scripts.json scripts/create-mp-plans.ts
 *
 * After running, copy the printed IDs to Vercel env vars:
 *   MP_PLAN_ID_STARTER=...
 *   MP_PLAN_ID_PRO=...
 *   MP_PLAN_ID_ELITE=...
 */

import { createAllMPPlans } from "../lib/mercadopago";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trackfitpro.app";

async function main() {
  console.log("🚀 Creando planes en MercadoPago...\n");

  const plans = await createAllMPPlans(`${APP_URL}/dashboard/settings`);

  console.log("\n✅ Planes creados. Agregá estas variables en Vercel:\n");
  console.log(`MP_PLAN_ID_STARTER=${plans.starter}`);
  console.log(`MP_PLAN_ID_PRO=${plans.pro}`);
  console.log(`MP_PLAN_ID_ELITE=${plans.elite}`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
