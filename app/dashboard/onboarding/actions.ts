"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboardingAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
  revalidatePath("/dashboard");
  return { success: true };
}
