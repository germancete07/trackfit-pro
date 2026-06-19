"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboardingAction(spaceName?: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const updates: Record<string, unknown> = { onboarding_completed: true };
  if (spaceName?.trim()) updates.space_name = spaceName.trim();

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
