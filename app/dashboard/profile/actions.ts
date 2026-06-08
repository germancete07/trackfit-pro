"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(data: {
  full_name: string;
  birth_date: string | null;
  training_goal: string | null;
  physical_limitations: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function changePasswordAction(newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (!newPassword || newPassword.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePreferredTrainingDaysAction(days: number[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_training_days: days })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateReminderAction(reminderHour: number | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { error } = await supabase
    .from("profiles")
    .update({ reminder_hour: reminderHour })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}
