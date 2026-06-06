"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function toggleDeloadWeekAction(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get the session to find its week boundaries
  const { data: session } = await supabase
    .from("sessions")
    .select("scheduled_date, student_id, is_deload, trainer_id")
    .eq("id", sessionId)
    .eq("trainer_id", user.id)
    .single();

  if (!session) return;

  const d = new Date((session.scheduled_date as string) + "T12:00:00");
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = toLocalDateStr(monday);
  const weekEnd = toLocalDateStr(sunday);
  const newDeload = !(session.is_deload as boolean);

  await supabase
    .from("sessions")
    .update({ is_deload: newDeload })
    .eq("trainer_id", user.id)
    .eq("student_id", session.student_id as string)
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekEnd);

  revalidatePath("/dashboard/calendar");
}
