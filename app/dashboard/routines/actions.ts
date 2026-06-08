"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { buildSessionSlots, buildSessionRows, buildExerciseRows } from "@/lib/assignRoutine";

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

  const { data: template } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", data.templateId)
    .eq("trainer_id", user.id)
    .single();
  if (!template) return { error: "Rutina no encontrada" };

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
  if (aErr || !assignment) return { error: "Error al crear la asignación" };

  // Generate sessions using shared helper
  const slots = buildSessionSlots(
    data.startDate, data.trainingDays, data.totalWeeks, data.deloadEveryWeeks
  );
  if (slots.length === 0) return { error: "No se generaron sesiones" };

  const sessionRows = buildSessionRows(
    user.id, data.studentId, template.name, assignment.id, slots
  );
  const { data: inserted, error: sErr } = await supabase
    .from("sessions").insert(sessionRows).select("id");
  if (sErr || !inserted) return { error: "Error al generar sesiones" };

  const exercises = (template.template_exercises ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  if (exercises.length > 0) {
    await supabase.from("exercises").insert(
      buildExerciseRows(inserted.map((s: { id: string }) => s.id), exercises)
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
