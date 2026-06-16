"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface TrainerLogExercise {
  exerciseId: string;
  weightKg: number | null;
  completedSets: number;
  rpe: number | null;
}

export async function trainerLogSessionAction(
  sessionId: string,
  studentId: string,
  exercises: TrainerLogExercise[]
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verify trainer owns this student
  const { data: student } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .eq("trainer_id", user.id)
    .single();
  if (!student) return { error: "Sin permisos sobre este alumno" };

  // Verify session belongs to this student
  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id")
    .eq("id", sessionId)
    .eq("student_id", studentId)
    .single();
  if (!session) return { error: "Sesión no encontrada" };

  // Use admin client to bypass RLS for inserting student's logs
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Upsert exercise logs (same as student flow but with logged_by_trainer=true)
  const logRows = exercises.map(ex => ({
    exercise_id: ex.exerciseId,
    student_id: studentId,
    session_id: sessionId,
    weight_kg: ex.weightKg,
    completed_sets: ex.completedSets,
    rpe: ex.rpe,
    logged_at: now,
    logged_by_trainer: true,
  }));

  const { error: logErr } = await admin
    .from("exercise_logs")
    .upsert(logRows, { onConflict: "exercise_id,student_id" });

  if (logErr) return { error: "Error al guardar los registros: " + logErr.message };

  // Mark session as completed and flag as trainer-logged
  const { error: sessErr } = await admin
    .from("sessions")
    .update({ status: "completed", logged_by_trainer: true, completed_at: now })
    .eq("id", sessionId);

  if (sessErr) return { error: "Error al completar la sesión: " + sessErr.message };

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

// ── Manual session creation ────────────────────────────────────────────────────

export interface ManualExerciseInput {
  libraryExerciseId: string;
  name: string;
  sets: number;
  reps: string;
  weightKg: number | null;
  sortOrder: number;
}

export async function trainerCreateManualSessionAction(
  studentId: string,
  date: string,
  exercises: ManualExerciseInput[]
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verify trainer owns this student
  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", studentId)
    .eq("trainer_id", user.id)
    .single();
  if (!student) return { error: "Sin permisos sobre este alumno" };

  if (exercises.length === 0) return { error: "Agregá al menos un ejercicio." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Create the session
  const { data: newSession, error: sessErr } = await admin
    .from("sessions")
    .insert({
      trainer_id: user.id,
      student_id: studentId,
      name: "Sesión manual",
      scheduled_date: date,
      status: "completed",
      logged_by_trainer: true,
      is_manual: true,
      completed_at: now,
    })
    .select("id")
    .single();

  if (sessErr || !newSession) return { error: "Error al crear la sesión: " + sessErr?.message };

  const sessionId = newSession.id;

  // 2. Create exercise rows
  const exerciseRows = exercises.map(ex => ({
    session_id: sessionId,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    rest_seconds: null,
    youtube_url: null,
    technical_note: null,
    sort_order: ex.sortOrder,
    superset_group: null,
    library_exercise_id: ex.libraryExerciseId,
  }));

  const { data: insertedExercises, error: exErr } = await admin
    .from("exercises")
    .insert(exerciseRows)
    .select("id, sort_order");

  if (exErr || !insertedExercises) return { error: "Error al guardar ejercicios: " + exErr?.message };

  // 3. Create exercise_log rows
  const logRows = insertedExercises.map((ex: { id: string; sort_order: number }) => {
    const input = exercises.find(e => e.sortOrder === ex.sort_order);
    return {
      exercise_id: ex.id,
      student_id: studentId,
      session_id: sessionId,
      weight_kg: input?.weightKg ?? null,
      completed_sets: input?.sets ?? 1,
      rpe: null,
      logged_at: now,
      logged_by_trainer: true,
    };
  });

  const { error: logErr } = await admin.from("exercise_logs").insert(logRows);
  if (logErr) return { error: "Error al guardar registros: " + logErr.message };

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/calendar");
  return { success: true };
}

export async function getStudentPendingSessionsAction(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("sessions")
    .select("id, name, scheduled_date, routine_day_name, exercises(id, name, sets, reps, sort_order)")
    .eq("student_id", studentId)
    .eq("trainer_id", user.id)
    .in("status", ["pending"])
    .order("scheduled_date", { ascending: true })
    .limit(30);

  return (data ?? []).map((s: any) => ({
    ...s,
    exercises: (s.exercises ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));
}
