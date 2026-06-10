"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface LibraryExerciseData {
  name: string;
  name_en?: string | null;
  pattern?: string | null;
  muscle_primary?: string | null;
  muscle_secondary?: string | null;
  equipment?: string | null;
  level?: number;
  youtube_url?: string | null;
  description?: string | null;
}

export async function createLibraryExerciseAction(data: LibraryExerciseData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("exercise_library").insert({
    trainer_id: user.id,
    name: data.name.trim(),
    name_en: data.name_en ?? null,
    pattern: data.pattern ?? null,
    muscle_group: data.muscle_primary ?? "otro",
    muscle_primary: data.muscle_primary ?? null,
    muscle_secondary: data.muscle_secondary ?? null,
    equipment: data.equipment ?? null,
    level: data.level ?? 2,
    youtube_url: data.youtube_url ?? null,
    description: data.description ?? null,
    is_global: false,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/library");
  return { success: true };
}

export async function updateLibraryExerciseAction(id: string, data: LibraryExerciseData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("exercise_library").update({
    name: data.name.trim(),
    name_en: data.name_en ?? null,
    pattern: data.pattern ?? null,
    muscle_group: data.muscle_primary ?? "otro",
    muscle_primary: data.muscle_primary ?? null,
    muscle_secondary: data.muscle_secondary ?? null,
    equipment: data.equipment ?? null,
    level: data.level ?? 2,
    youtube_url: data.youtube_url ?? null,
    description: data.description ?? null,
  }).eq("id", id).eq("trainer_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/library");
  return { success: true };
}

export async function deleteLibraryExerciseAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("exercise_library").delete().eq("id", id).eq("trainer_id", user.id);
  revalidatePath("/dashboard/library");
  return { success: true };
}
