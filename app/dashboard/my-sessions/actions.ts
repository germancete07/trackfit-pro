"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function finishSessionAction(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, assignment_id, student_id, trainer_id, name")
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .single();

  if (!session) return { error: "Rutina no encontrada" };

  // Update with ownership filter re-asserted on the UPDATE itself (prevents TOCTOU)
  const { error: updateErr } = await supabase
    .from("sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("student_id", user.id);

  if (updateErr) return { error: "Error al guardar la sesión. Intentá de nuevo." };

  // Check if the whole assignment cycle is now complete
  if (session.assignment_id) {
    const { data: remaining } = await supabase
      .from("sessions")
      .select("id")
      .eq("assignment_id", session.assignment_id)
      .neq("id", sessionId)
      .in("status", ["pending", "active"]); // exclude cancelled and already completed

    if (remaining && remaining.length === 0) {
      await supabase
        .from("routine_assignments")
        .update({ status: "completed" })
        .eq("id", session.assignment_id);

      const { data: assignment } = await supabase
        .from("routine_assignments")
        .select("session_templates(name)")
        .eq("id", session.assignment_id)
        .single();

      const routineName = (assignment?.session_templates as { name?: string } | null)?.name ?? "rutina";
      const { data: studentProfile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();

      await supabase.from("notifications").insert({
        user_id: session.trainer_id,
        type: "assignment_completed",
        message: `${studentProfile?.full_name ?? "Tu alumno"} completó el ciclo de ${routineName}. ¡Hora de asignar la siguiente rutina!`,
        reference_id: user.id,
        read: false,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { success: true };
}

export async function rescheduleSessionAction(sessionId: string, newDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Validate new date is not in the past
  const today = new Date().toISOString().split("T")[0];
  if (newDate < today) return { error: "No podés mover una rutina al pasado" };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, scheduled_date, original_date, trainer_id, student_id, name")
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .eq("status", "pending")
    .single();

  if (!session) return { error: "Rutina no encontrada o ya completada" };

  // Only allow rescheduling sessions from current week onward
  const sessionDate = session.scheduled_date as string;
  const currentWeekMonday = (() => {
    const d = new Date();
    const dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return mon.toISOString().split("T")[0];
  })();

  if (sessionDate < currentWeekMonday) {
    return { error: "Solo podés reagendar rutinas de la semana actual o futura" };
  }

  // Preserve the very first original date
  const originalDate = (session.original_date as string | null) ?? sessionDate;

  await supabase
    .from("sessions")
    .update({ scheduled_date: newDate, original_date: originalDate })
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .eq("status", "pending");

  // Notify trainer
  if (session.trainer_id) {
    const { data: studentProfile } = await supabase
      .from("profiles").select("full_name").eq("id", user.id).single();

    const d = new Date(newDate + "T12:00:00");
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const friendlyDate = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;

    await supabase.from("notifications").insert({
      user_id: session.trainer_id,
      type: "session_rescheduled",
      message: `${studentProfile?.full_name ?? "Tu alumno"} reagendó "${session.name}" para el ${friendlyDate}`,
      reference_id: user.id,
      read: false,
    });
  }

  revalidatePath("/dashboard/calendar");
  return { success: true };
}

// ─── Personal Record actions ──────────────────────────────────────────────

export async function getPrevMaxAction(exerciseName: string): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Get all session IDs for this student
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("student_id", user.id);

  const sessionIds = sessions?.map(s => s.id) ?? [];
  if (sessionIds.length === 0) return 0;

  // Get all exercise IDs with this name in the student's sessions
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id")
    .in("session_id", sessionIds)
    .eq("name", exerciseName);

  const exIds = exercises?.map(e => e.id) ?? [];
  if (exIds.length === 0) return 0;

  // Max weight logged for any of these exercises
  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("weight_kg")
    .in("exercise_id", exIds)
    .eq("student_id", user.id)
    .order("weight_kg", { ascending: false })
    .limit(1);

  return logs?.[0]?.weight_kg ?? 0;
}

export async function notifyPRAction(exerciseName: string, weight: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs?.length) return;

  const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:admin@trackfit.pro", VAPID_PUBLIC, VAPID_PRIVATE);

  const payload = Buffer.from(
    JSON.stringify({
      title: "¡Nuevo récord personal! 🏆",
      body: `¡Superaste tu récord en ${exerciseName}! Nuevo PR: ${weight} kg`,
      url: "/dashboard/progress",
    }),
    "utf8"
  );

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { contentEncoding: "aes128gcm", TTL: 86400 }
      ).catch(() => {})
    )
  );
}
