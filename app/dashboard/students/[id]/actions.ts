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
    .update({ status: "completed", logged_by_trainer: true })
    .eq("id", sessionId);

  if (sessErr) return { error: "Error al completar la sesión: " + sessErr.message };

  revalidatePath(`/dashboard/students/${studentId}`);
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
