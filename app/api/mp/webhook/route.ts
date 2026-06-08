import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MercadoPagoConfig, PreApproval, Payment } from "mercadopago";
import crypto from "crypto";

// Always respond 200 to MP — if we return anything else MP retries indefinitely
const OK = NextResponse.json({ received: true }, { status: 200 });

function getMPClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
}

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Fail-closed: if the secret is not configured we cannot verify the request.
    // Log loudly so the operator knows, but never allow the webhook to proceed.
    console.error(
      "[MP webhook] CRÍTICO: MP_WEBHOOK_SECRET no está configurado. " +
      "El webhook fue rechazado. Configurá la variable de entorno."
    );
    return false;
  }

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";

  // MP format: "ts=...,v1=..."
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    })
  );
  const ts = parts["ts"] ?? "";
  const v1 = parts["v1"] ?? "";

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  // Timing-safe comparison to prevent timing oracle attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    // timingSafeEqual throws if buffers have different lengths — means v1 is malformed
    return false;
  }
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export async function POST(req: NextRequest) {
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    console.error("[MP webhook] No se pudo leer el body");
    return OK;
  }

  if (!verifySignature(req, rawBody)) {
    console.warn("[MP webhook] Firma inválida — ignorando");
    return OK; // still 200 to avoid MP retries on our end; invalid sig = not our payload
  }

  let payload: { type?: string; action?: string; data?: { id?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[MP webhook] Body no es JSON válido");
    return OK;
  }

  console.log("[MP webhook] Evento recibido:", payload.type, payload.action, payload.data?.id);

  const admin = createAdminClient();
  const client = getMPClient();

  try {
    // ── Preapproval (subscription lifecycle) ──────────────────────────────
    if (payload.type === "preapproval" && payload.data?.id) {
      const preapprovalId = String(payload.data.id);
      const preApproval = new PreApproval(client);
      const sub = await preApproval.get({ id: preapprovalId });

      const [trainerId, planKey] = (sub.external_reference ?? "").split("|");
      if (!trainerId || !planKey) {
        console.warn("[MP webhook] external_reference no válido:", sub.external_reference);
        return OK;
      }

      console.log("[MP webhook] Preapproval status:", sub.status, "trainer:", trainerId, "plan:", planKey);

      if (sub.status === "authorized") {
        const expiresAt = addMonths(new Date(), 1).toISOString();
        await admin.from("profiles").update({
          plan: planKey,
          plan_expires_at: expiresAt,
          mp_preapproval_id: preapprovalId,
          mp_plan_key: planKey,
        }).eq("id", trainerId);
        console.log("[MP webhook] ✓ Plan activado:", planKey, "para trainer:", trainerId);
      }

      if (sub.status === "cancelled" || sub.status === "paused") {
        await admin.from("profiles").update({
          mp_preapproval_id: null,
          mp_plan_key: null,
        }).eq("id", trainerId);
        console.log("[MP webhook] Suscripción cancelada/pausada para trainer:", trainerId);
      }
    }

    // ── Payment (recurring charge) ─────────────────────────────────────────
    if (payload.type === "payment" && payload.data?.id) {
      const paymentId = Number(payload.data.id);
      const payment = new Payment(client);
      const p = await payment.get({ id: paymentId });

      console.log("[MP webhook] Payment status:", p.status, "ref:", p.external_reference);

      if (p.status === "approved" && p.external_reference) {
        const [trainerId, planKey] = p.external_reference.split("|");
        if (trainerId && planKey) {
          const expiresAt = addMonths(new Date(), 1).toISOString();
          await admin.from("profiles").update({
            plan: planKey,
            plan_expires_at: expiresAt,
          }).eq("id", trainerId);
          console.log("[MP webhook] ✓ Renovación procesada:", planKey, "trainer:", trainerId);
        }
      }

      if (p.status === "rejected") {
        console.warn("[MP webhook] Pago rechazado. Ref:", p.external_reference);
      }
    }
  } catch (err) {
    // Log but still return 200 — don't let internal errors cause MP to retry forever
    console.error("[MP webhook] Error procesando evento:", err);
  }

  return OK;
}
