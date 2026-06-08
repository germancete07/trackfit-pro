"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveLimit } from "@/lib/plans";

async function checkStudentLimit(trainerId: string): Promise<{ allowed: boolean; current: number; limit: number; plan: string }> {
  const admin = createAdminClient();

  const [profileRes, countRes] = await Promise.all([
    admin.from("profiles").select("plan, trial_ends_at, plan_expires_at").eq("id", trainerId).single(),
    admin.from("profiles").select("id", { count: "exact", head: true })
      .eq("trainer_id", trainerId)
      .eq("archived", false),
  ]);

  const plan = profileRes.data?.plan ?? "starter";
  const trialEndsAt = profileRes.data?.trial_ends_at ?? null;
  const planExpiresAt = profileRes.data?.plan_expires_at ?? null;
  const current = countRes.count ?? 0;
  const limit = getEffectiveLimit(plan, trialEndsAt, planExpiresAt);

  return { allowed: current < limit, current, limit, plan };
}

export async function createStudentAction(formData: FormData) {
  const fullName = (formData.get("fullName") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!fullName || !email || !password) {
    return { error: "Todos los campos son obligatorios" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Role guard — only trainers can create students
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") return { error: "No autorizado" };

  // Plan limit check
  const { allowed, current, limit, plan } = await checkStudentLimit(user.id);
  if (!allowed) {
    return { error: `PLAN_LIMIT:${current}:${limit}:${plan}` };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "student", full_name: fullName, trainer_id: user.id },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Error al crear el usuario" };
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ full_name: fullName, trainer_id: user.id })
    .eq("id", data.user.id);

  if (profileErr) {
    return { error: "Usuario creado pero no se pudo asignar el entrenador: " + profileErr.message };
  }

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function inviteStudentAction(formData: FormData) {
  const fullName = (formData.get("fullName") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim();

  if (!fullName || !email) {
    return { error: "Todos los campos son obligatorios" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Role guard — only trainers can invite students
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") return { error: "No autorizado" };

  // Plan limit check
  const { allowed, current, limit, plan } = await checkStudentLimit(user.id);
  if (!allowed) {
    return { error: `PLAN_LIMIT:${current}:${limit}:${plan}` };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: "student", full_name: fullName, trainer_id: user.id },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Error al enviar la invitación" };
  }

  // The trigger creates the profile row; update it with name and trainer_id.
  // This is critical — if it fails, the student is orphaned (no trainer_id).
  const { error: profileErr } = await admin
    .from("profiles")
    .update({ full_name: fullName, trainer_id: user.id })
    .eq("id", data.user.id);

  if (profileErr) {
    // The invite email was already sent but the profile link failed.
    // Return a specific error so the trainer knows to follow up manually.
    console.error("[inviteStudentAction] Profile update failed:", profileErr.message);
    return {
      error:
        "La invitación fue enviada pero hubo un error al vincular el alumno. " +
        "Contactá soporte con el email: " + email,
    };
  }

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function archiveStudentAction(studentId: string, archived: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ archived })
    .eq("id", studentId)
    .eq("trainer_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function updateStudentNotesAction(studentId: string, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({ trainer_notes: notes || null })
    .eq("id", studentId)
    .eq("trainer_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateStudentProfileAction(studentId: string, data: {
  start_date: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", studentId)
    .eq("trainer_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}
