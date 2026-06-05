"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createStudentAction(formData: FormData) {
  const fullName = (formData.get("fullName") as string).trim();
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Crear usuario sin afectar la sesión actual del entrenador
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "student" },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Error al crear el usuario" };
  }

  // Asignar nombre y entrenador
  const { error: profileErr } = await admin
    .from("profiles")
    .update({ full_name: fullName, trainer_id: user.id })
    .eq("id", data.user.id);

  if (profileErr) {
    return { error: "Usuario creado pero no se pudo asignar el entrenador: " + profileErr.message };
  }

  return { success: true };
}
