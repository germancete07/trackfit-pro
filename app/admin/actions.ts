"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PlanKey } from "@/lib/plans";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && profile?.email !== "gerkann@gmail.com") {
    redirect("/dashboard");
  }

  return user;
}

export async function changePlanAction(trainerId: string, plan: PlanKey) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ plan })
    .eq("id", trainerId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { success: true };
}

export async function extendTrialAction(trainerId: string, days: number) {
  await requireAdmin();
  const admin = createAdminClient();

  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("profiles")
    .update({ trial_ends_at: trialEndsAt })
    .eq("id", trainerId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { success: true };
}
