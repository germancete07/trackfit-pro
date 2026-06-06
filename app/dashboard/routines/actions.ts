"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

// ── Assign routine to student ────────────────────────────────

export async function assignRoutineAction(
  templateId: string,
  studentId: string,
  date: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: template } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", templateId)
    .eq("trainer_id", user.id)
    .single();

  if (!template) return { error: "Rutina no encontrada" };

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      trainer_id: user.id,
      student_id: studentId,
      name: template.name,
      scheduled_date: date || null,
      status: "pending",
    })
    .select().single();

  if (sErr || !session) return { error: "Error al asignar la rutina" };

  const exes = ((template.template_exercises ?? []) as any[])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ex, i) => ({
      session_id: session.id,
      name: ex.name, sets: ex.sets, reps: ex.reps,
      rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
      technical_note: ex.technical_note, sort_order: i,
    }));

  if (exes.length > 0) await supabase.from("exercises").insert(exes);

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


// ── Quick assign (no redirect — for modal use) ────────────────────────────

export async function quickAssignAction(data: {
  studentId: string;
  templateId: string;
  startDate: string;
  trainingDays: number[];
  totalWeeks: number;
  deloadEveryWeeks: number | null;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  if (data.trainingDays.length === 0) return { error: "Seleccioná al menos un día" };

  const { data: template } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", data.templateId)
    .eq("trainer_id", user.id)
    .single();
  if (!template) return { error: "Rutina no encontrada" };

  await supabase.from("routine_assignments")
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
  function getMondayUTC(dateStr: string): Date {
    const d = new Date(dateStr + "T12:00:00Z");
    const dow = d.getUTCDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  }
  function toDateStr(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }

  const startDate = new Date(data.startDate + "T12:00:00Z");
  const monday = getMondayUTC(data.startDate);
  const sortedDays = [...data.trainingDays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  const sessionsToInsert: object[] = [];
  let cycleDay = 1;

  for (let w = 0; w < data.totalWeeks; w++) {
    const isDeload = data.deloadEveryWeeks ? (w + 1) % data.deloadEveryWeeks === 0 : false;
    for (const dow of sortedDays) {
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

  if (sessionsToInsert.length === 0) return { error: "No se generaron sesiones" };
  const { data: inserted, error: sErr } = await supabase.from("sessions").insert(sessionsToInsert).select("id");
  if (sErr || !inserted) return { error: "Error al generar sesiones" };

  const exercises = (template.template_exercises ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  if (exercises.length > 0) {
    await supabase.from("exercises").insert(
      inserted.flatMap((sess: { id: string }) =>
        exercises.map((ex: any) => ({
          session_id: sess.id,
          name: ex.name, sets: ex.sets, reps: ex.reps,
          rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
          technical_note: ex.technical_note, sort_order: ex.sort_order,
          superset_group: ex.superset_group || null,
        }))
      )
    );
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
