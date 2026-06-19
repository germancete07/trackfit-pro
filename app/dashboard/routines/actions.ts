"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { buildSessionSlots, buildSessionRows, buildExerciseRows, type RoutineDayInfo } from "@/lib/assignRoutine";

// ── Categories ───────────────────────────────────────────────

export async function createCategoryAction(name: string, color: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("routine_categories")
    .insert({ trainer_id: user.id, name: name.trim(), color });

  if (error) return { error: "Error al crear la carpeta" };
  revalidatePath("/dashboard/routines");
  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("routine_categories").delete().eq("id", id).eq("trainer_id", user.id);
  revalidatePath("/dashboard/routines");
  return { success: true };
}

export async function renameCategoryAction(id: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("routine_categories")
    .update({ name: name.trim() })
    .eq("id", id).eq("trainer_id", user.id);

  revalidatePath("/dashboard/routines");
  return { success: true };
}

// ── Move routine to category ─────────────────────────────────

export async function moveRoutineToCategoryAction(routineId: string, categoryId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("session_templates")
    .update({ category_id: categoryId })
    .eq("id", routineId).eq("trainer_id", user.id);

  revalidatePath("/dashboard/routines");
  return { success: true };
}

// ── Quick assign (no redirect — for modal use) ───────────────

export type QuickAssignResult =
  | { success: true }
  | { error: string }
  | { existingRoutine: { name: string; id: string } };

export async function quickAssignAction(data: {
  studentId: string;
  templateId: string;
  startDate: string;
  trainingDays: number[];
  totalWeeks: number;
  deloadEveryWeeks: number | null;
  force?: boolean;
}): Promise<QuickAssignResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (data.trainingDays.length === 0) return { error: "Seleccioná al menos un día" };
  if (!data.totalWeeks || data.totalWeeks < 1 || data.totalWeeks > 52) {
    return { error: "La duración debe estar entre 1 y 52 semanas" };
  }

  // Verify template ownership AND student ownership in parallel.
  // NOTE: routine_days is fetched WITHOUT nested template_exercises to avoid
  // PostgREST schema-cache issues with the routine_day_id FK (migration_v17).
  const [{ data: template }, { data: student }, { data: routineDays }] = await Promise.all([
    supabase
      .from("session_templates")
      .select("name")
      .eq("id", data.templateId)
      .eq("trainer_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("id")
      .eq("id", data.studentId)
      .eq("trainer_id", user.id)
      .maybeSingle(),
    supabase
      .from("routine_days")
      .select("id, day_number, name")
      .eq("template_id", data.templateId)
      .order("day_number"),
  ]);
  if (!template) return { error: "Rutina no encontrada" };
  if (!student) return { error: "Alumno no encontrado" };

  // Fetch exercises for each routine day (separate query, avoids schema-cache FK issues)
  type RawExercise = {
    routine_day_id: string | null;
    name: string; sets: number; reps: string; rest_seconds: number | null;
    youtube_url: string | null; technical_note: string | null;
    sort_order: number; superset_group: string | null;
    library_exercise_id: string | null;
  };

  const resolvedDays = routineDays ?? [];
  const dayIds = resolvedDays.map((d: { id: string }) => d.id);

  const { data: rawExercises } = dayIds.length > 0
    ? await supabase
        .from("template_exercises")
        .select("routine_day_id, name, sets, reps, rest_seconds, youtube_url, technical_note, sort_order, superset_group, library_exercise_id")
        .in("routine_day_id", dayIds)
        .order("sort_order")
    : { data: [] as RawExercise[] };

  // Check for existing active assignment (unless force=true)
  if (!data.force) {
    const { data: existing } = await supabase
      .from("routine_assignments")
      .select("id, session_templates(name)")
      .eq("trainer_id", user.id)
      .eq("student_id", data.studentId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      const existingName =
        (existing.session_templates as { name?: string } | null)?.name ?? "una rutina activa";
      return { existingRoutine: { name: existingName, id: existing.id } };
    }
  }

  // Cancel existing active assignment + its pending sessions
  const { data: oldAssignment } = await supabase
    .from("routine_assignments")
    .select("id")
    .eq("trainer_id", user.id)
    .eq("student_id", data.studentId)
    .eq("status", "active")
    .maybeSingle();

  if (oldAssignment) {
    await supabase
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("assignment_id", oldAssignment.id)
      .in("status", ["pending", "active"])
      .gte("scheduled_date", new Date().toISOString().split("T")[0]);
    await supabase
      .from("routine_assignments")
      .update({ status: "cancelled" })
      .eq("id", oldAssignment.id);
  }

  // Create new assignment
  const { data: assignment, error: aErr } = await supabase
    .from("routine_assignments")
    .insert({
      trainer_id: user.id,
      student_id: data.studentId,
      template_id: data.templateId,
      start_date: data.startDate,
      training_days: data.trainingDays,
      total_weeks: data.totalWeeks,
      deload_every_weeks: data.deloadEveryWeeks,
      status: "active",
    })
    .select()
    .single();
  if (aErr || !assignment) {
    if (aErr?.code === "23505") {
      return { error: "Este alumno ya tiene una rutina activa. Recargá la página e intentá de nuevo." };
    }
    return { error: "Error al crear la asignación" };
  }

  // Build day-exercise map (day_number → sorted exercises)
  const numDays = resolvedDays.length || 1;

  const daysInfo: RoutineDayInfo[] = resolvedDays.map((d: { id: string; day_number: number; name: string }) => ({
    id: d.id, day_number: d.day_number, name: d.name,
  }));

  const dayExercises = resolvedDays.map((d: { id: string; day_number: number }) => ({
    day_id: d.id,
    day_number: d.day_number,
    exercises: (rawExercises ?? [])
      .filter((ex: RawExercise) => ex.routine_day_id === d.id),
  }));

  // Generate session slots with cyclic day distribution
  const slots = buildSessionSlots(
    data.startDate, data.trainingDays, data.totalWeeks, data.deloadEveryWeeks, numDays
  );
  if (slots.length === 0) return { error: "No se generaron sesiones" };

  const sessionRows = buildSessionRows(
    user.id, data.studentId, template.name, assignment.id, slots, daysInfo
  );

  // Insert sessions and fetch back with routine_day_number to avoid relying on insert order
  const { data: inserted, error: sErr } = await supabase
    .from("sessions")
    .insert(sessionRows)
    .select("id, routine_day_number");
  if (sErr || !inserted) return { error: "Error al generar sesiones" };

  // Map exercises using actual routine_day_number from DB (not assumed insert order)
  const sessionsWithDay = (inserted as { id: string; routine_day_number: number | null }[]).map(s => ({
    id: s.id,
    routineDayNumber: s.routine_day_number ?? 1,
  }));

  const exRows = buildExerciseRows(sessionsWithDay, dayExercises);
  if (exRows.length > 0) {
    await supabase.from("exercises").insert(exRows);
  }

  await supabase.from("notifications").insert({
    user_id: data.studentId,
    type: "routine_assigned",
    message: `Tu entrenador te asignó la rutina "${template.name}". ¡A entrenar!`,
    reference_id: user.id,
    read: false,
  });

  revalidatePath("/dashboard/routines");
  revalidatePath(`/dashboard/students/${data.studentId}`);
  return { success: true };
}
