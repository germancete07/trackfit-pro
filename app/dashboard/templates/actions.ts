"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
  superset_group: string | null;
}

export async function createTemplateAction(
  name: string, description: string, exercises: ExDraft[], categoryId?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: tpl, error: tErr } = await supabase
    .from("session_templates")
    .insert({
      trainer_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
    })
    .select().single();

  if (tErr || !tpl) return { error: "Error al crear la rutina" };

  if (exercises.length > 0) {
    const { error: exErr } = await supabase.from("template_exercises").insert(
      exercises.map((ex, i) => ({
        template_id: tpl.id,
        name: ex.name.trim(), sets: ex.sets, reps: ex.reps.trim(),
        rest_seconds: ex.rest_seconds || null,
        youtube_url: ex.youtube_url.trim() || null,
        technical_note: ex.technical_note.trim() || null,
        sort_order: i,
        superset_group: ex.superset_group || null,
      }))
    );
    if (exErr) {
      // Template was created but exercises failed — delete the template to avoid orphan
      await supabase.from("session_templates").delete().eq("id", tpl.id);
      return { error: "Error al guardar los ejercicios. Intenta de nuevo." };
    }
  }

  revalidatePath("/dashboard/routines");
  // Return redirect target instead of calling redirect() — calling redirect() inside a Server Action
  // invoked from a Client Component causes a client-side "Application error" crash.
  return { redirectTo: categoryId ? `/dashboard/routines/folder/${categoryId}` : "/dashboard/routines" };
}

export async function updateTemplateAction(
  id: string, name: string, description: string, exercises: ExDraft[], categoryId?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const updateData: Record<string, unknown> = {
    name: name.trim(),
    description: description.trim() || null,
  };
  if (categoryId !== undefined) updateData.category_id = categoryId || null;

  const { error: tErr } = await supabase
    .from("session_templates")
    .update(updateData)
    .eq("id", id).eq("trainer_id", user.id);

  if (tErr) return { error: "Error al actualizar la rutina" };

  // Safe update strategy: INSERT new exercises first, DELETE old ones only on success.
  // This prevents data loss if the insert fails — original exercises remain untouched.

  // 1. Capture existing exercise IDs before any changes
  const { data: existingExes } = await supabase
    .from("template_exercises")
    .select("id")
    .eq("template_id", id);

  // 2. Insert the new exercises
  const { error: insertErr } = await supabase.from("template_exercises").insert(
    exercises.map((ex, i) => ({
      template_id: id,
      name: ex.name.trim(), sets: ex.sets, reps: ex.reps.trim(),
      rest_seconds: ex.rest_seconds || null,
      youtube_url: ex.youtube_url.trim() || null,
      technical_note: ex.technical_note.trim() || null,
      sort_order: i,
      superset_group: ex.superset_group || null,
    }))
  );

  if (insertErr) {
    // Insert failed — original exercises are intact, nothing was lost
    return { error: "Error al guardar los ejercicios. Los cambios no fueron aplicados." };
  }

  // 3. Insert succeeded — now safely delete the old exercise rows by their specific IDs
  if (existingExes && existingExes.length > 0) {
    await supabase
      .from("template_exercises")
      .delete()
      .in("id", existingExes.map((e: { id: string }) => e.id));
  }

  revalidatePath("/dashboard/routines");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("session_templates").delete().eq("id", id).eq("trainer_id", user.id);
  revalidatePath("/dashboard/templates");
  return { success: true };
}

export async function duplicateTemplateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: orig } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", id).eq("trainer_id", user.id).single();

  if (!orig) return { error: "Rutina no encontrada" };

  const { data: copy, error: cErr } = await supabase
    .from("session_templates")
    .insert({ trainer_id: user.id, name: `${orig.name} (copia)`, description: orig.description })
    .select().single();

  if (cErr || !copy) return { error: "Error al duplicar" };

  interface TemplateExerciseRow {
    name: string; sets: number; reps: string; rest_seconds: number | null;
    youtube_url: string | null; technical_note: string | null;
    sort_order: number; superset_group: string | null;
  }
  const exes = (orig.template_exercises as TemplateExerciseRow[] ?? []).map((ex) => ({
    template_id: copy.id, name: ex.name, sets: ex.sets, reps: ex.reps,
    rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
    technical_note: ex.technical_note, sort_order: ex.sort_order,
    superset_group: ex.superset_group || null,
  }));

  if (exes.length > 0) {
    const { data: insertedExes } = await supabase.from("template_exercises").insert(exes).select();
    revalidatePath("/dashboard/templates");
    return { success: true, template: { ...copy, template_exercises: insertedExes ?? [] } };
  }
  revalidatePath("/dashboard/templates");
  return { success: true, template: { ...copy, template_exercises: [] } };
}

export async function saveSessionAsTemplateAction(
  sessionId: string, name: string, description: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Ownership check: verify the session belongs to this trainer
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("trainer_id", user.id)
    .maybeSingle();

  if (!session) return { error: "Sesión no encontrada" };

  const { data: exercises } = await supabase
    .from("exercises").select("*").eq("session_id", sessionId).order("sort_order");

  if (!exercises || exercises.length === 0) return { error: "No se encontraron ejercicios" };

  const { data: tpl, error: tErr } = await supabase
    .from("session_templates")
    .insert({ trainer_id: user.id, name: name.trim(), description: description.trim() || null })
    .select().single();

  if (tErr || !tpl) return { error: "Error al guardar como plantilla" };

  const { error: exErr } = await supabase.from("template_exercises").insert(
    exercises.map((ex, i) => ({
      template_id: tpl.id, name: ex.name, sets: ex.sets, reps: ex.reps,
      rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
      technical_note: ex.technical_note, sort_order: i,
      superset_group: ex.superset_group || null,
    }))
  );

  if (exErr) {
    // Template created but exercises failed — clean up to avoid orphan
    await supabase.from("session_templates").delete().eq("id", tpl.id);
    return { error: "Error al copiar los ejercicios. Intenta de nuevo." };
  }

  return { success: true };
}
