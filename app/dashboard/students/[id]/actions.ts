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

export async function getStudentActiveCyclesAction(studentId: string): Promise<
  { id: string; name: string; start_date: string }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("routine_assignments")
    .select("id, start_date, session_templates(name)")
    .eq("student_id", studentId)
    .eq("trainer_id", user.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(10);

  return (data ?? []).map((ra: any) => ({
    id: ra.id,
    name: (ra.session_templates as { name?: string } | null)?.name ?? "Ciclo activo",
    start_date: ra.start_date,
  }));
}

export async function trainerCreateManualSessionAction(
  studentId: string,
  date: string,
  exercises: ManualExerciseInput[],
  assignmentId?: string | null
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

  // Cancel any pending session for this student+date to avoid unique constraint violation
  await admin
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("student_id", studentId)
    .eq("scheduled_date", date)
    .eq("status", "pending");

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
      ...(assignmentId ? { assignment_id: assignmentId } : {}),
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

export async function getDayRoutineExercisesAction(studentId: string, date: string): Promise<{
  sessionId: string | null;
  sessionName: string | null;
  exercises: { id: string; name: string; sets: number; reps: string; sort_order: number; library_exercise_id: string | null }[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sessionId: null, sessionName: null, exercises: [] };

  const { data } = await supabase
    .from("sessions")
    .select("id, name, routine_day_name, exercises(id, name, sets, reps, sort_order, library_exercise_id)")
    .eq("student_id", studentId)
    .eq("trainer_id", user.id)
    .eq("scheduled_date", date)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (!data) return { sessionId: null, sessionName: null, exercises: [] };

  return {
    sessionId: data.id,
    sessionName: (data as any).routine_day_name ?? data.name ?? null,
    exercises: ((data as any).exercises ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets ?? 3,
        reps: String(ex.reps ?? "8"),
        sort_order: ex.sort_order,
        library_exercise_id: ex.library_exercise_id ?? null,
      })),
  };
}
