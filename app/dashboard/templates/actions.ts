"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
  superset_group: string | null;
  library_exercise_id?: string | null;
}

export interface DayDraft {
  /** DB id for existing days (undefined/null for brand-new days) */
  id?: string | null;
  day_number: number;
  name: string;
  exercises: ExDraft[];
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTemplateAction(
  name: string,
  description: string,
  days: DayDraft[],
  categoryId?: string | null,
  trainingType?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Insert template
  const { data: tpl, error: tErr } = await supabase
    .from("session_templates")
    .insert({
      trainer_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      training_type: trainingType || null,
    })
    .select()
    .single();

  if (tErr || !tpl) return { error: "Error al crear la rutina" };

  // Insert each day + its exercises
  for (const day of days) {
    const { data: rdRow, error: rdErr } = await supabase
      .from("routine_days")
      .insert({
        template_id: tpl.id,
        day_number: day.day_number,
        name: day.name || `Día ${day.day_number}`,
        sort_order: day.day_number - 1,
      })
      .select("id")
      .single();

    if (rdErr || !rdRow) {
      // Clean up template (cascades to routine_days & template_exercises)
      await supabase.from("session_templates").delete().eq("id", tpl.id);
      return { error: "Error al crear los días de la rutina. Intenta de nuevo." };
    }

    if (day.exercises.length > 0) {
      const { error: exErr } = await supabase.from("template_exercises").insert(
        day.exercises.map((ex, i) => ({
          template_id: tpl.id,
          routine_day_id: rdRow.id,
          name: ex.name.trim(),
          sets: ex.sets,
          reps: ex.reps.trim(),
          rest_seconds: ex.rest_seconds || null,
          youtube_url: ex.youtube_url.trim() || null,
          technical_note: ex.technical_note.trim() || null,
          sort_order: i,
          superset_group: ex.superset_group || null,
          library_exercise_id: ex.library_exercise_id ?? null,
        }))
      );
      if (exErr) {
        await supabase.from("session_templates").delete().eq("id", tpl.id);
        return { error: "Error al guardar los ejercicios. Intenta de nuevo." };
      }
    }
  }

  revalidatePath("/dashboard/routines");
  return { redirectTo: categoryId ? `/dashboard/routines/folder/${categoryId}` : "/dashboard/routines" };
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateTemplateAction(
  id: string,
  name: string,
  description: string,
  days: DayDraft[],
  categoryId?: string | null,
  trainingType?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verify ownership
  const { data: existing } = await supabase
    .from("session_templates")
    .select("id")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "Rutina no encontrada" };

  // Update template metadata
  const updateData: Record<string, unknown> = {
    name: name.trim(),
    description: description.trim() || null,
  };
  if (categoryId !== undefined) updateData.category_id = categoryId || null;
  if (trainingType !== undefined) updateData.training_type = trainingType || null;

  const { error: tErr } = await supabase
    .from("session_templates")
    .update(updateData)
    .eq("id", id)
    .eq("trainer_id", user.id);
  if (tErr) return { error: "Error al actualizar la rutina" };

  // Capture ALL existing exercise IDs (to delete after successful insert)
  const { data: existingExes } = await supabase
    .from("template_exercises")
    .select("id")
    .eq("template_id", id);

  // Capture existing day IDs
  const { data: existingDayRows } = await supabase
    .from("routine_days")
    .select("id")
    .eq("template_id", id);
  const existingDayIds = (existingDayRows ?? []).map((r: { id: string }) => r.id);

  // Resolve day IDs: update existing ones, insert new ones
  const newlyCreatedDayIds: string[] = [];
  const resolvedDays: Array<DayDraft & { resolvedId: string }> = [];

  for (const day of days) {
    if (day.id && existingDayIds.includes(day.id)) {
      // Update existing day
      await supabase
        .from("routine_days")
        .update({ name: day.name || `Día ${day.day_number}`, day_number: day.day_number, sort_order: day.day_number - 1 })
        .eq("id", day.id)
        .eq("template_id", id);
      resolvedDays.push({ ...day, resolvedId: day.id });
    } else {
      // Insert new day
      const { data: newDay, error: rdErr } = await supabase
        .from("routine_days")
        .insert({
          template_id: id,
          day_number: day.day_number,
          name: day.name || `Día ${day.day_number}`,
          sort_order: day.day_number - 1,
        })
        .select("id")
        .single();

      if (rdErr || !newDay) {
        // Roll back newly created days
        if (newlyCreatedDayIds.length > 0) {
          await supabase.from("routine_days").delete().in("id", newlyCreatedDayIds);
        }
        return { error: "Error al crear los días de la rutina" };
      }
      newlyCreatedDayIds.push(newDay.id);
      resolvedDays.push({ ...day, resolvedId: newDay.id });
    }
  }

  // Build all new exercises with their routine_day_id
  const allNewExercises = resolvedDays.flatMap(day =>
    day.exercises.map((ex, i) => ({
      template_id: id,
      routine_day_id: day.resolvedId,
      name: ex.name.trim(),
      sets: ex.sets,
      reps: ex.reps.trim(),
      rest_seconds: ex.rest_seconds || null,
      youtube_url: ex.youtube_url.trim() || null,
      technical_note: ex.technical_note.trim() || null,
      sort_order: i,
      superset_group: ex.superset_group || null,
      library_exercise_id: ex.library_exercise_id ?? null,
    }))
  );

  if (allNewExercises.length > 0) {
    const { error: insertErr } = await supabase.from("template_exercises").insert(allNewExercises);
    if (insertErr) {
      // Roll back newly created days (old exercises remain intact)
      if (newlyCreatedDayIds.length > 0) {
        await supabase.from("routine_days").delete().in("id", newlyCreatedDayIds);
      }
      return { error: "Error al guardar los ejercicios. Los cambios no fueron aplicados." };
    }
  }

  // Delete old exercises
  if (existingExes && existingExes.length > 0) {
    await supabase
      .from("template_exercises")
      .delete()
      .in("id", existingExes.map((e: { id: string }) => e.id));
  }

  // Delete removed days (those that existed before but aren't in the new set)
  const keptDayIds = new Set(days.filter(d => d.id).map(d => d.id!));
  const removedDayIds = existingDayIds.filter(dayId => !keptDayIds.has(dayId));
  if (removedDayIds.length > 0) {
    await supabase.from("routine_days").delete().in("id", removedDayIds);
  }

  revalidatePath("/dashboard/routines");
  return { success: true };
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: tpl } = await supabase
    .from("session_templates")
    .select("id")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .maybeSingle();
  if (!tpl) return { error: "Rutina no encontrada" };

  // Remove assignments first (ON DELETE RESTRICT constraint)
  const { error: assignErr } = await supabase
    .from("routine_assignments")
    .delete()
    .eq("template_id", id)
    .eq("trainer_id", user.id);
  if (assignErr) return { error: "Error al eliminar rutina. Intentá de nuevo." };

  // Delete template — cascades to routine_days → template_exercises
  const { data: deleted, error: tplErr } = await supabase
    .from("session_templates")
    .delete()
    .eq("id", id)
    .eq("trainer_id", user.id)
    .select("id");

  if (tplErr) return { error: "Error al eliminar la rutina. Intentá de nuevo." };
  if (!deleted || deleted.length === 0) return { error: "No se pudo eliminar la rutina." };

  revalidatePath("/dashboard/routines");
  return { success: true };
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateTemplateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: orig } = await supabase
    .from("session_templates")
    .select("*, routine_days(*, template_exercises(*))")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .single();

  if (!orig) return { error: "Rutina no encontrada" };

  const { data: copy, error: cErr } = await supabase
    .from("session_templates")
    .insert({ trainer_id: user.id, name: `${orig.name} (copia)`, description: orig.description })
    .select()
    .single();

  if (cErr || !copy) return { error: "Error al duplicar" };

  interface OrigDay {
    id: string; day_number: number; name: string; sort_order: number;
    template_exercises: Array<{
      name: string; sets: number; reps: string; rest_seconds: number | null;
      youtube_url: string | null; technical_note: string | null;
      sort_order: number; superset_group: string | null;
    }>;
  }

  const origDays = (orig.routine_days as OrigDay[] ?? []).sort((a, b) => a.day_number - b.day_number);

  for (const origDay of origDays) {
    const { data: newDay, error: rdErr } = await supabase
      .from("routine_days")
      .insert({
        template_id: copy.id,
        day_number: origDay.day_number,
        name: origDay.name,
        sort_order: origDay.sort_order,
      })
      .select("id")
      .single();

    if (rdErr || !newDay) continue; // best-effort

    const exes = (origDay.template_exercises ?? []).map(ex => ({
      template_id: copy.id,
      routine_day_id: newDay.id,
      name: ex.name, sets: ex.sets, reps: ex.reps,
      rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
      technical_note: ex.technical_note, sort_order: ex.sort_order,
      superset_group: ex.superset_group || null,
    }));

    if (exes.length > 0) {
      await supabase.from("template_exercises").insert(exes);
    }
  }

  revalidatePath("/dashboard/routines");
  return { success: true, template: copy };
}

// ── Save session as template ──────────────────────────────────────────────────

export async function saveSessionAsTemplateAction(
  sessionId: string, name: string, description: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

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
    .select()
    .single();

  if (tErr || !tpl) return { error: "Error al guardar como plantilla" };

  // Create default Día 1
  const { data: rdRow, error: rdErr } = await supabase
    .from("routine_days")
    .insert({ template_id: tpl.id, day_number: 1, name: "Día 1", sort_order: 0 })
    .select("id")
    .single();

  if (rdErr || !rdRow) {
    await supabase.from("session_templates").delete().eq("id", tpl.id);
    return { error: "Error al crear el día. Intenta de nuevo." };
  }

  const { error: exErr } = await supabase.from("template_exercises").insert(
    exercises.map((ex, i) => ({
      template_id: tpl.id,
      routine_day_id: rdRow.id,
      name: ex.name, sets: ex.sets, reps: ex.reps,
      rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
      technical_note: ex.technical_note, sort_order: i,
      superset_group: ex.superset_group || null,
    }))
  );

  if (exErr) {
    await supabase.from("session_templates").delete().eq("id", tpl.id);
    return { error: "Error al copiar los ejercicios. Intenta de nuevo." };
  }

  return { success: true };
}
