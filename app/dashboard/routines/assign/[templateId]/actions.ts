"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildSessionSlots, buildSessionRows, buildExerciseRows, type RoutineDayInfo } from "@/lib/assignRoutine";

export type AssignmentResult =
  | { error: string }
  | { existingRoutine: { name: string; id: string } }
  | undefined; // undefined = redirect happened (success)

export async function createAssignmentAction(data: {
  studentId: string;
  templateId: string;
  startDate: string;
  trainingDays: number[];
  totalWeeks: number;
  deloadEveryWeeks: number | null;
  force?: boolean;
}): Promise<AssignmentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (data.trainingDays.length === 0)
    return { error: "Seleccioná al menos un día de entrenamiento" };

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

  // Build day-exercise map and generate session slots with cyclic day distribution
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

  const slots = buildSessionSlots(
    data.startDate, data.trainingDays, data.totalWeeks, data.deloadEveryWeeks, numDays
  );
  if (slots.length === 0) return { error: "No se generaron sesiones con esos parámetros" };

  const sessionRows = buildSessionRows(
    user.id, data.studentId, template.name, assignment.id, slots, daysInfo
  );

  // Insert sessions and fetch back with routine_day_number to avoid relying on insert order
  const { data: insertedSessions, error: sErr } = await supabase
    .from("sessions")
    .insert(sessionRows)
    .select("id, routine_day_number");
  if (sErr || !insertedSessions) return { error: "Error al generar las sesiones" };

  // Map exercises using actual routine_day_number from DB (not assumed insert order)
  const sessionsWithDay = (insertedSessions as { id: string; routine_day_number: number | null }[]).map(s => ({
    id: s.id,
    routineDayNumber: s.routine_day_number ?? 1,
  }));

  const exRows = buildExerciseRows(sessionsWithDay, dayExercises);
  if (exRows.length > 0) {
    await supabase.from("exercises").insert(exRows);
  }

  // Notify student
  await supabase.from("notifications").insert({
    user_id: data.studentId,
    type: "routine_assigned",
    message: `Tu entrenador te asignó la rutina "${template.name}". ¡A entrenar!`,
    reference_id: user.id,
    read: false,
  });

  revalidatePath(`/dashboard/students/${data.studentId}`);
  redirect(`/dashboard/students/${data.studentId}`);
}

export async function cancelAssignmentAction(assignmentId: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Cancel all non-completed future sessions so they vanish from the calendar
  await supabase
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("assignment_id", assignmentId)
    .in("status", ["pending", "active"])
    .gte("scheduled_date", new Date().toISOString().split("T")[0]);

  await supabase
    .from("routine_assignments")
    .update({ status: "cancelled" })
    .eq("id", assignmentId)
    .eq("trainer_id", user.id);

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath(`/dashboard/students/${studentId}/rutina`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Regenerate sessions for an existing assignment ────────────────────────────

export async function regenerateSessionsAction(
  assignmentId: string,
  studentId: string
): Promise<{ success: true; generated: number } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Fetch assignment
  const { data: assignment } = await supabase
    .from("routine_assignments")
    .select("id, start_date, training_days, total_weeks, deload_every_weeks, template_id, session_templates(name)")
    .eq("id", assignmentId)
    .eq("trainer_id", user.id)
    .single();
  if (!assignment) return { error: "Asignación no encontrada" };

  const templateName =
    (assignment.session_templates as { name?: string } | null)?.name ?? "Rutina";

  // Fetch routine_days (separate query, avoids PostgREST schema-cache issues)
  const { data: routineDays } = await supabase
    .from("routine_days")
    .select("id, day_number, name")
    .eq("template_id", assignment.template_id)
    .order("day_number");

  const resolvedDays = routineDays ?? [];
  const dayIds = resolvedDays.map((d: { id: string }) => d.id);

  type RawEx = {
    routine_day_id: string | null; name: string; sets: number; reps: string;
    rest_seconds: number | null; youtube_url: string | null;
    technical_note: string | null; sort_order: number; superset_group: string | null;
    library_exercise_id: string | null;
  };
  const { data: rawExercises } = dayIds.length > 0
    ? await supabase
        .from("template_exercises")
        .select("routine_day_id, name, sets, reps, rest_seconds, youtube_url, technical_note, sort_order, superset_group, library_exercise_id")
        .in("routine_day_id", dayIds)
        .order("sort_order")
    : { data: [] as RawEx[] };

  // Cancel all pending sessions for this assignment
  await supabase
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("assignment_id", assignmentId)
    .eq("status", "pending");

  // Treat deload_every_weeks=1 (or 0) as no deload (defensive fix)
  const rawDeload = assignment.deload_every_weeks as number | null;
  const safeDeload = rawDeload && rawDeload >= 2 ? rawDeload : null;

  const numDays = resolvedDays.length || 1;
  const daysInfo: RoutineDayInfo[] = resolvedDays.map(
    (d: { id: string; day_number: number; name: string }) => ({ id: d.id, day_number: d.day_number, name: d.name })
  );
  const dayExercises = resolvedDays.map((d: { id: string; day_number: number }) => ({
    day_id: d.id,
    day_number: d.day_number,
    exercises: (rawExercises ?? []).filter((ex: RawEx) => ex.routine_day_id === d.id),
  }));

  const allSlots = buildSessionSlots(
    assignment.start_date,
    assignment.training_days,
    assignment.total_weeks,
    safeDeload,
    numDays
  );

  // Only insert future slots — past completed sessions would violate the unique index
  // sessions_student_date_active_uniq (student_id, scheduled_date) WHERE status != 'cancelled'
  const today = new Date().toISOString().split("T")[0];
  const slots = allSlots.filter(s => s.date >= today);
  if (slots.length === 0) {
    revalidatePath(`/dashboard/students/${studentId}`);
    revalidatePath("/dashboard/calendar");
    return { success: true, generated: 0 };
  }

  const sessionRows = buildSessionRows(user.id, studentId, templateName, assignmentId, slots, daysInfo);

  // upsert with ignoreDuplicates as second line of defense against unique constraint violations
  const { data: inserted, error: sErr } = await supabase
    .from("sessions")
    .upsert(sessionRows, { ignoreDuplicates: true })
    .select("id, routine_day_number");
  if (sErr || !inserted) return { error: `Error al generar sesiones: ${sErr?.message ?? "desconocido"}` };

  const sessionsWithDay = (inserted as { id: string; routine_day_number: number | null }[]).map(s => ({
    id: s.id,
    routineDayNumber: s.routine_day_number ?? 1,
  }));

  const exRows = buildExerciseRows(sessionsWithDay, dayExercises);
  if (exRows.length > 0) {
    await supabase.from("exercises").insert(exRows);
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/calendar");
  return { success: true, generated: slots.length };
}

// ── Update training days for an active assignment ─────────────────────────────

export async function updateAssignmentTrainingDaysAction(
  assignmentId: string,
  studentId: string,
  newDays: number[]
): Promise<{ success: true; generated: number } | { error: string }> {
  if (newDays.length === 0) return { error: "Seleccioná al menos un día." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Fetch assignment and verify ownership
  const { data: assignment } = await supabase
    .from("routine_assignments")
    .select("id, start_date, training_days, total_weeks, deload_every_weeks, template_id, session_templates(name)")
    .eq("id", assignmentId)
    .eq("trainer_id", user.id)
    .single();
  if (!assignment) return { error: "Asignación no encontrada" };

  const templateName =
    (assignment.session_templates as { name?: string } | null)?.name ?? "Rutina";

  // 1. Update assignment training_days
  const { error: updErr } = await supabase
    .from("routine_assignments")
    .update({ training_days: newDays })
    .eq("id", assignmentId);
  if (updErr) return { error: "Error al actualizar días: " + updErr.message };

  // 2. Replace training_days table rows for student (used by dashboard status dots)
  await supabase.from("training_days").delete().eq("student_id", studentId);
  if (newDays.length > 0) {
    await supabase.from("training_days").insert(
      newDays.map(d => ({ student_id: studentId, day_of_week: d }))
    );
  }

  // 3. Cancel all pending sessions for this assignment
  const { error: cancelErr } = await supabase
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("assignment_id", assignmentId)
    .eq("status", "pending");
  if (cancelErr) return { error: "Error al cancelar sesiones pendientes: " + cancelErr.message };

  // 4. Count completed sessions to preserve rotation continuity
  const { count: completedCount } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("status", "completed");
  const cc = completedCount ?? 0;

  // 5. Regenerate sessions (only future ones)
  const { data: routineDays } = await supabase
    .from("routine_days")
    .select("id, day_number, name")
    .eq("template_id", assignment.template_id)
    .order("day_number");

  const resolvedDays = routineDays ?? [];
  const dayIds = resolvedDays.map((d: { id: string }) => d.id);

  type RawEx = {
    routine_day_id: string | null; name: string; sets: number; reps: string;
    rest_seconds: number | null; youtube_url: string | null;
    technical_note: string | null; sort_order: number; superset_group: string | null;
    library_exercise_id: string | null;
  };
  const { data: rawExercises } = dayIds.length > 0
    ? await supabase
        .from("template_exercises")
        .select("routine_day_id, name, sets, reps, rest_seconds, youtube_url, technical_note, sort_order, superset_group, library_exercise_id")
        .in("routine_day_id", dayIds)
        .order("sort_order")
    : { data: [] as RawEx[] };

  const rawDeload = assignment.deload_every_weeks as number | null;
  const safeDeload = rawDeload && rawDeload >= 2 ? rawDeload : null;
  const numDays = resolvedDays.length || 1;

  const daysInfo: RoutineDayInfo[] = resolvedDays.map(
    (d: { id: string; day_number: number; name: string }) => ({ id: d.id, day_number: d.day_number, name: d.name })
  );
  const dayExercises = resolvedDays.map((d: { id: string; day_number: number }) => ({
    day_id: d.id,
    day_number: d.day_number,
    exercises: (rawExercises ?? []).filter((ex: RawEx) => ex.routine_day_id === d.id),
  }));

  // Build all slots then keep only future ones, re-indexing cycle from completed count
  const today = new Date().toISOString().split("T")[0];
  const allSlots = buildSessionSlots(
    assignment.start_date, newDays, assignment.total_weeks, safeDeload, numDays
  );
  const futureSlots = allSlots.filter(s => s.date >= today);
  // Re-number cycleDay and routineDayNumber so the rotation continues from the
  // actual number of completed sessions (not from the virtual new-schedule sequence).
  futureSlots.forEach((slot, idx) => {
    slot.cycleDay = cc + idx + 1;
    slot.routineDayNumber = numDays <= 1 ? 1 : ((cc + idx) % numDays) + 1;
  });
  if (futureSlots.length === 0) {
    revalidatePath(`/dashboard/students/${studentId}`);
    revalidatePath("/dashboard/calendar");
    return { success: true, generated: 0 };
  }

  const sessionRows = buildSessionRows(user.id, studentId, templateName, assignmentId, futureSlots, daysInfo);

  const { data: inserted, error: sErr } = await supabase
    .from("sessions")
    .insert(sessionRows)
    .select("id, routine_day_number");
  if (sErr || !inserted) return { error: `Error al generar sesiones: ${sErr?.message ?? "desconocido"}` };

  const sessionsWithDay = (inserted as { id: string; routine_day_number: number | null }[]).map(s => ({
    id: s.id,
    routineDayNumber: s.routine_day_number ?? 1,
  }));

  const exRows = buildExerciseRows(sessionsWithDay, dayExercises);
  if (exRows.length > 0) {
    await supabase.from("exercises").insert(exRows);
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/calendar");
  return { success: true, generated: futureSlots.length };
}

// ── Clean duplicate sessions for an assignment ────────────────────────────────
// Detects sessions where the same student_id + scheduled_date has multiple
// non-cancelled records, keeps the "best" one (completed > pending, then earliest),
// and cancels the rest.

export async function cleanDuplicateSessionsAction(
  assignmentId: string,
  studentId: string
): Promise<{ success: true; cleaned: number } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verify ownership
  const { data: assignment } = await supabase
    .from("routine_assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("trainer_id", user.id)
    .single();
  if (!assignment) return { error: "Asignación no encontrada" };

  // Fetch all non-cancelled sessions for this assignment
  const { data: sessions, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, status, scheduled_date")
    .eq("assignment_id", assignmentId)
    .neq("status", "cancelled")
    .order("scheduled_date");

  if (fetchErr) return { error: "Error al leer sesiones: " + fetchErr.message };

  // Group by date
  const byDate = new Map<string, { id: string; status: string }[]>();
  for (const s of sessions ?? []) {
    const key = s.scheduled_date as string;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push({ id: s.id, status: s.status });
  }

  // For each date with duplicates, keep completed > pending, cancel the rest
  const toCancel: string[] = [];
  Array.from(byDate.values()).forEach(group => {
    if (group.length <= 1) return;
    const completed = group.find((s: { id: string; status: string }) => s.status === "completed");
    const keep = completed ?? group[0]!;
    group.forEach((s: { id: string; status: string }) => {
      if (s.id !== keep.id) toCancel.push(s.id);
    });
  });

  if (toCancel.length === 0) {
    return { success: true, cleaned: 0 };
  }

  const { error: cancelErr } = await supabase
    .from("sessions")
    .update({ status: "cancelled" })
    .in("id", toCancel);

  if (cancelErr) return { error: "Error al cancelar duplicados: " + cancelErr.message };

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/calendar");
  return { success: true, cleaned: toCancel.length };
}
