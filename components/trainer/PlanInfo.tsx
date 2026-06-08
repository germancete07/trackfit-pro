"use client";

import { useState, useTransition } from "react";
import { getPlan, isOnTrial, daysLeftInTrial, getEffectiveLimit, FREE_TIER_LIMIT } from "@/lib/plans";

interface Props {
  plan: string | null;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  activeStudents: number;
  mpPreapprovalId?: string | null;
}

const PLAN_ORDER = ["starter", "pro", "elite"] as const;
const NEXT_PLAN: Record<string, string> = { starter: "pro", pro: "elite" };

function isSubscribed(planExpiresAt: string | null): boolean {
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) > new Date();
}

function daysUntilExpiry(planExpiresAt: string | null): number {
  if (!planExpiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / 86400000));
}

export function PlanInfo({ plan, trialEndsAt, planExpiresAt, activeStudents, mpPreapprovalId }: Props) {
  const planDef = getPlan(plan);
  const onTrial = isOnTrial(trialEndsAt);
  const daysLeft = daysLeftInTrial(trialEndsAt);
  const subscribed = isSubscribed(planExpiresAt);
  const expiryDays = daysUntilExpiry(planExpiresAt);
  const effectiveLimit = getEffectiveLimit(plan, trialEndsAt, planExpiresAt);
  const used = activeStudents;
  const pct = Math.min(100, Math.round((used / (onTrial ? 999 : effectiveLimit)) * 100));
  const nearLimit = pct >= 80;
  const nextPlan = NEXT_PLAN[plan ?? "starter"];

  const [isPending, startTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  function handleSubscribe(planKey: string) {
    setCheckoutError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/mp/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planKey }),
        });
        const data = await res.json();
        if (data.initPoint) {
          window.location.href = data.initPoint;
        } else {
          setCheckoutError(data.detail ?? data.error ?? "Error al iniciar el pago");
        }
      } catch {
        setCheckoutError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.85))", border: "0.5px solid var(--card-border, rgba(0,0,0,0.07))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tu plan actual</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-lg font-black" style={{ color: planDef.color }}>
              {planDef.name}
            </span>
            {onTrial && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                Trial · {daysLeft}d
              </span>
            )}
            {subscribed && !onTrial && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}>
                ✓ Activo
              </span>
            )}
            {!onTrial && !subscribed && plan !== "starter" && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.12)", color: "#DC2626" }}>
                Vencido
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-gray-900">{used}</p>
          <p className="text-xs text-gray-400">de {onTrial ? "∞" : planDef.maxStudents} alumnos</p>
        </div>
      </div>

      {/* Progress bar — only when not on trial */}
      {!onTrial && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: nearLimit
                  ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                  : "linear-gradient(90deg, #534AB7, #4239A3)",
              }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {used} / {planDef.maxStudents} alumnos
            {nearLimit && <span className="ml-2 font-semibold text-amber-600">· Cerca del límite</span>}
          </p>
        </div>
      )}

      {/* Trial banner */}
      {onTrial && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.2)" }}>
          <p className="font-semibold text-amber-700">🕐 Prueba gratuita: {daysLeft} días restantes</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Al vencer sin suscripción, quedás con un máximo de {FREE_TIER_LIMIT} alumnos activos.
            Suscribite para mantener el acceso completo.
          </p>
        </div>
      )}

      {/* Subscription expiry warning */}
      {subscribed && !onTrial && expiryDays <= 5 && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)" }}>
          <p className="font-semibold text-red-700">⚠️ Tu suscripción vence en {expiryDays} días</p>
          <p className="text-xs text-red-600 mt-0.5">Si MP procesa el cobro automáticamente se renueva sola.</p>
        </div>
      )}

      {/* Plan features grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Alumnos", value: onTrial ? "Ilimitados (trial)" : `Hasta ${planDef.maxStudents}` },
          { label: "Precio", value: `$ ${planDef.price.toLocaleString("es-AR")} ARS/mes` },
          { label: "Rutinas", value: "Ilimitadas" },
          { label: "Chat + Videos", value: "✓ Incluido" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {checkoutError && (
        <p className="text-sm text-red-600 font-medium text-center">{checkoutError}</p>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-2">
        {/* Subscribe to current plan (if trial ending or expired and no active subscription) */}
        {!subscribed && (
          <button
            onClick={() => handleSubscribe(plan ?? "starter")}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}
          >
            {isPending ? "Redirigiendo a MercadoPago..." : `Suscribirme al plan ${planDef.name} · $ ${planDef.price.toLocaleString("es-AR")} ARS/mes`}
          </button>
        )}

        {/* Upgrade to next plan */}
        {nextPlan && (subscribed || onTrial) && (
          <button
            onClick={() => handleSubscribe(nextPlan)}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all hover:shadow-md disabled:opacity-60"
            style={{
              background: "rgba(0,0,0,0.04)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              color: "#374151",
            }}
          >
            {isPending ? "..." : `Actualizar a ${getPlan(nextPlan).name} · $ ${getPlan(nextPlan).price.toLocaleString("es-AR")} ARS/mes →`}
          </button>
        )}
      </div>

      {/* MP branding */}
      <p className="text-xs text-gray-400 text-center">
        Pagos procesados de forma segura por{" "}
        <span className="font-semibold text-gray-500">Mercado Pago</span>
      </p>
    </div>
  );
}
