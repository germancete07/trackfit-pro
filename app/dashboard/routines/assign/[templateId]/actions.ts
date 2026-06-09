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

  // Verify template ownership AND student ownership + fetch routine days in parallel
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
      .select("id, day_number, name, template_exercises(*)")
      .eq("template_id", data.templateId)
      .order("day_number"),
  ]);
  if (!template) return { error: "Rutina no encontrada" };
  if (!student) return { error: "Alumno no encontrado" };

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

  // Cancel existing active assignment
  await supabase
    .from("routine_assignments")
    .update({ status: "cancelled" })
    .eq("trainer_id", user.id)
    .eq("student_id", data.studentId)
    .eq("status", "active");

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

  // Generate sessions using shared helper
  const numDays = (routineDays ?? []).length || 1;
  const slots = buildSessionSlots(
    data.startDate, data.trainingDays, data.totalWeeks, data.deloadEveryWeeks, numDays
  );
  if (slots.length === 0) return { error: "No se generaron sesiones con esos parámetros" };

  const daysInfo: RoutineDayInfo[] = (routineDays ?? []).map((d: { id: string; day_number: number; name: string }) => ({
    id: d.id, day_number: d.day_number, name: d.name,
  }));

  const sessionRows = buildSessionRows(
    user.id, data.studentId, template.name, assignment.id, slots, daysInfo
  );
  const { data: insertedSessions, error: sErr } = await supabase
    .from("sessions").insert(sessionRows).select("id");
  if (sErr || !insertedSessions) return { error: "Error al generar las sesiones" };

  const sessionsWithDay = (insertedSessions as { id: string }[]).map((s, i) => ({
    id: s.id,
    routineDayNumber: slots[i]!.routineDayNumber,
  }));

  interface RawExercise {
    name: string; sets: number; reps: string; rest_seconds: number | null;
    youtube_url: string | null; technical_note: string | null;
    sort_order: number; superset_group: string | null;
  }

  const dayExercises = (routineDays ?? []).map((d: { day_number: number; template_exercises: unknown[] }) => ({
    day_number: d.day_number,
    exercises: ([...(d.template_exercises ?? [])] as RawExercise[]).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
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

  await supabase
    .from("routine_assignments")
    .update({ status: "cancelled" })
    .eq("id", assignmentId)
    .eq("trainer_id", user.id);

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}
