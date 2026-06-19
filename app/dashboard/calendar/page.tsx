import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { MonthlyCalendar } from "@/components/student/MonthlyCalendar";
import { TrainerCalendar, type CalendarSession } from "@/components/trainer/TrainerCalendar";

function toLocalStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { student?: string; status?: string; month?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  // ── Trainer calendar ────────────────────────────────────────────────────
  if (profile.role === "trainer") {
    const today = toLocalStr(new Date());
    const currentMonth = searchParams.month ?? today.slice(0, 7); // "YYYY-MM"

    // Calculate grid date range (Mon–Sun grid that covers the full month)
    const [gy, gm] = currentMonth.split("-").map(Number);
    const firstOfMonth = new Date(gy, gm - 1, 1);
    const lastOfMonth = new Date(gy, gm, 0);

    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - startOffset);

    const endOffset2 = (7 - ((lastOfMonth.getDay() + 6) % 7 + 1)) % 7;
    const gridEnd = new Date(lastOfMonth);
    gridEnd.setDate(lastOfMonth.getDate() + endOffset2);
    // Ensure at least 42 cells
    while ((gridEnd.getTime() - gridStart.getTime()) / 86400000 < 41) {
      gridEnd.setDate(gridEnd.getDate() + 7);
    }

    const rangeStart = toLocalStr(gridStart);
    const rangeEnd = toLocalStr(gridEnd);

    const [{ data: students }, { data: rawSessions }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("trainer_id", user.id)
        .eq("archived", false)
        .order("full_name"),
      supabase
        .from("sessions")
        .select("id, scheduled_date, status, student_id, name, routine_day_name, completed_at, logged_by_trainer")
        .eq("trainer_id", user.id)
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd)
        .in("status", ["pending", "active", "completed"])
        .order("scheduled_date"),
    ]);

    const studentMap = new Map(
      (students ?? []).map(s => [s.id, s as { id: string; full_name: string; avatar_url: string | null }])
    );

    const sessions: CalendarSession[] = (rawSessions ?? []).map(s => {
      const st = studentMap.get(s.student_id);
      return {
        id: s.id,
        scheduled_date: s.scheduled_date,
        status: s.status as "pending" | "active" | "completed",
        student_id: s.student_id,
        session_name: (s as any).name ?? null,
        routine_day_name: s.routine_day_name ?? null,
        student_name: st?.full_name ?? "Alumno",
        student_avatar: st?.avatar_url ?? null,
        completed_at: (s as any).completed_at ?? null,
        logged_by_trainer: (s as any).logged_by_trainer ?? false,
      };
    });

    return (
      <div className="px-4 py-5 flex flex-col gap-4">
        <h1 className="text-xl font-black text-gray-900">Agenda de alumnos</h1>
        <TrainerCalendar
          sessions={sessions}
          currentMonth={currentMonth}
          today={today}
        />
      </div>
    );
  }

  // ── Student calendar ─────────────────────────────────────────────────────
  const { data: assignment } = await supabase
    .from("routine_assignments")
    .select("id, start_date, training_days, total_weeks, deload_every_weeks, session_templates(name)")
    .eq("student_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!assignment) {
    return (
      <div className="px-4 py-5 flex flex-col gap-4">
        <h1 className="text-xl font-black text-gray-900">Mi calendario</h1>
        <Card padding="lg" className="text-center flex flex-col items-center gap-2">
          <p className="text-3xl">📅</p>
          <p className="text-sm font-semibold text-gray-700">Sin rutina asignada</p>
          <p className="text-xs text-gray-400">Tu entrenador todavía no asignó tu plan de entrenamiento.</p>
        </Card>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, cycle_day, scheduled_date, status, is_deload, original_date, routine_day_name")
    .eq("assignment_id", assignment.id)
    .neq("status", "cancelled")
    .order("scheduled_date");

  const allSessions = sessions ?? [];
  const total = allSessions.length;
  const completed = allSessions.filter((s) => s.status === "completed").length;
  const routineName = (assignment.session_templates as { name?: string } | null)?.name ?? "Rutina";

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-black text-gray-900">Mi calendario</h1>
        <p className="text-sm text-brand-500 font-semibold">{routineName}</p>
      </div>
      <MonthlyCalendar
        sessions={allSessions as any}
        assignment={assignment as any}
        totalSessions={total}
        completedSessions={completed}
      />
    </div>
  );
}
