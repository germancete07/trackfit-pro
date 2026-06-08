"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function registerTrainerAction(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const spaceName = (formData.get("space_name") as string)?.trim();

  if (!fullName || !email || !password || !spaceName) {
    return { error: "Todos los campos son obligatorios." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = createAdminClient();

  // Check if this email already has an auth user (zombie from failed attempt)
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  let userId: string;

  if (existingUser) {
    // Check if they already have a complete trainer profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", existingUser.id)
      .single();

    if (existingProfile?.role === "trainer") {
      return { error: "Ya existe una cuenta con ese email. Iniciá sesión." };
    }

    // Has an auth user but incomplete/no profile — update the password and reuse the user
    await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      user_metadata: { role: "trainer", full_name: fullName },
    });
    userId = existingUser.id;
  } else {
    // Fresh registration
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "trainer", full_name: fullName },
    });

    if (authError || !authData.user) {
      console.error("[register] Auth error:", authError?.message);
      return { error: "Error al crear la cuenta. Intentá de nuevo." };
    }
    userId = authData.user.id;
  }

  // Upsert core profile fields
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: "trainer",
        space_name: spaceName,
        preferred_training_days: [],
        archived: false,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    console.error("[register] Profile upsert error:", profileError.message);
    return { error: "Error al configurar tu cuenta. Intentá de nuevo." };
  }

  // Set plan fields if migration_v11 has been applied (silently skips if not)
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("profiles")
    .update({ plan: "starter", trial_ends_at: trialEndsAt, onboarding_completed: false })
    .eq("id", userId)
    .then(({ error }) => {
      if (error) console.warn("[register] Plan fields not set:", error.message);
    });

  redirect("/login?registered=1");
}
