export const PLANS = {
  starter: {
    name: "Starter",
    maxStudents: 10,
    price: 12000,
    description: "Para entrenadores que empiezan",
    color: "#6B7280",
    badge: "bg-gray-100 text-gray-700",
  },
  pro: {
    name: "Pro",
    maxStudents: 30,
    price: 20000,
    description: "Para entrenadores establecidos",
    color: "#534AB7",
    badge: "bg-brand-100 text-brand-700",
  },
  elite: {
    name: "Elite",
    maxStudents: 50,
    price: 35000,
    description: "Para entrenadores con alta demanda",
    color: "#059669",
    badge: "bg-green-100 text-green-700",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function isOnTrial(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

export function daysLeftInTrial(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export const FREE_TIER_LIMIT = 5; // alumnos cuando ni trial ni suscripción están activos

export function isSubscriptionActive(planExpiresAt: string | null | undefined): boolean {
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) > new Date();
}

export function getEffectiveLimit(
  plan: string | null | undefined,
  trialEndsAt: string | null | undefined,
  planExpiresAt?: string | null | undefined
): number {
  // Trial activo → ilimitado
  if (isOnTrial(trialEndsAt)) return 999;
  // Suscripción activa → límite del plan
  if (isSubscriptionActive(planExpiresAt)) {
    const key = (plan ?? "starter") as PlanKey;
    return PLANS[key]?.maxStudents ?? PLANS.starter.maxStudents;
  }
  // Sin trial ni suscripción → tier gratuito de 5 alumnos
  return FREE_TIER_LIMIT;
}

export function getPlan(plan: string | null | undefined) {
  const key = (plan ?? "starter") as PlanKey;
  return PLANS[key] ?? PLANS.starter;
}
