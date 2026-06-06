"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(dateStr: string): Date {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export async function createAssignmentAction(data: {
  studentId: string;
  templateId: string;
  startDate: string;
  trainingDays: number[];
  totalWeeks: number;
  deloadEveryWeeks: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (data.trainingDays.length === 0) return { error: "Seleccioná al menos un día de entrenamiento" };

  const { data: template } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", data.templateId)
    .eq("trainer_id", user.id)
    .single();

  if (!template) return { error: "Rutina no encontrada" };

  // Cancel previous active assignment for this student from this trainer
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

  if (aErr || !assignment) return { error: "Error al crear la asignación" };

  // Generate sessions
  const startDate = new Date(data.startDate + "T12:00:00Z");
  const monday = getMondayOfWeek(data.startDate);
  const sortedDays = [...data.trainingDays].sort((a, b) => {
    // Sort Mon→Sun: convert 0(Sun)→7 for sorting
    const av = a === 0 ? 7 : a;
    const bv = b === 0 ? 7 : b;
    return av - bv;
  });

  const sessionsToInsert: object[] = [];
  let cycleDay = 1;

  for (let w = 0; w < data.totalWeeks; w++) {
    const isDeload = data.deloadEveryWeeks
      ? (w + 1) % data.deloadEveryWeeks === 0
      : false;

    for (const dow of sortedDays) {
      // offset from Monday (0): Mon=0,Tue=1,...,Sat=5,Sun=6
      const offset = dow === 0 ? 6 : dow - 1;
      const sessionDate = new Date(monday);
      sessionDate.setUTCDate(monday.getUTCDate() + w * 7 + offset);

      if (sessionDate < startDate) continue;

      sessionsToInsert.push({
        trainer_id: user.id,
        student_id: data.studentId,
        name: template.name,
        scheduled_date: toDateStr(sessionDate),
        status: "pending",
        assignment_id: assignment.id,
        cycle_day: cycleDay,
        is_deload: isDeload,
      });
      cycleDay++;
    }
  }

  if (sessionsToInsert.length === 0) return { error: "No se generaron sesiones con esos parámetros" };

  const { data: insertedSessions, error: sErr } = await supabase
    .from("sessions")
    .insert(sessionsToInsert)
    .select("id");

  if (sErr || !insertedSessions) return { error: "Error al generar las sesiones" };

  const exercises = (template.template_exercises ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  if (exercises.length > 0) {
    const exerciseRows = insertedSessions.flatMap((sess: { id: string }) =>
      exercises.map((ex: {
        name: string; sets: number; reps: string;
        rest_seconds: number | null; youtube_url: string | null;
        technical_note: string | null; sort_order: number;
        superset_group: string | null;
      }) => ({
        session_id: sess.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        youtube_url: ex.youtube_url,
        technical_note: ex.technical_note,
        sort_order: ex.sort_order,
        superset_group: ex.superset_group || null,
      }))
    );
    await supabase.from("exercises").insert(exerciseRows);
  }

  // Notify student about the new routine
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
