"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addMeasurementAction(
  studentId: string,
  data: {
    measured_at: string;
    weight_kg: string; body_fat_pct: string;
    waist_cm: string; hip_cm: string;
    chest_cm: string; arm_cm: string; thigh_cm: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  function toNum(v: string) { const n = parseFloat(v); return isNaN(n) ? null : n; }

  const { error } = await supabase.from("body_measurements").insert({
    student_id: studentId,
    trainer_id: user.id,
    measured_at: data.measured_at,
    weight_kg: toNum(data.weight_kg),
    body_fat_pct: toNum(data.body_fat_pct),
    waist_cm: toNum(data.waist_cm),
    hip_cm: toNum(data.hip_cm),
    chest_cm: toNum(data.chest_cm),
    arm_cm: toNum(data.arm_cm),
    thigh_cm: toNum(data.thigh_cm),
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/students/${studentId}/measurements`);
  revalidatePath(`/dashboard/measurements`);
  return { success: true };
}

export async function deleteMeasurementAction(id: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("body_measurements").delete().eq("id", id).eq("trainer_id", user.id);
  revalidatePath(`/dashboard/students/${studentId}/measurements`);
  revalidatePath(`/dashboard/measurements`);
  return { success: true };
}
