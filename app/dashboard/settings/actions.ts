"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSpaceNameAction(spaceName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({ space_name: spaceName.trim() || null })
    .eq("id", user.id);

  if (error) return { error: "Error al guardar" };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function inviteStudentAction(email: string, fullName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") return { error: "Solo los entrenadores pueden invitar alumnos" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName.trim(),
      role: "student",
      trainer_id: user.id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://trackfit-pro.vercel.app"}/dashboard`,
  });

  if (error) return { error: error.message };
  return { success: true };
}
