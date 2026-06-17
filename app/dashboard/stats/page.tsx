import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatsView } from "@/components/trainer/StatsView";

function getMonday(offsetWeeks = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  return d.toISOString().split("T")[0];
}

function addDays(base: string, n: number): string {
  const d = new Date(base + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const today = new Date().toISOString().split("T")[0];
  const weekStart = getMonday(0);
  const lastWeekStart = getMonday(-1);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const sixtyDaysAgo = addDays(today, -60);

  const [
    { data: students },
    { data: thisWeekSess },
    { data: lastWeekSess },
    { data: monthSess },
    { data: recentSess },
    { data: activeAssignments },
    { data: exercisesRaw },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("trainer_id", user.id)
      .eq("archived", false)
      .order("full_name"),
    supabase
      .from("sessions")
      .select("student_id, scheduled_date")
      .eq("trainer_id", user.id)
      .eq("status", "completed")
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", today),
    supabase
      .from("sessions")
      .select("student_id, scheduled_date")
      .eq("trainer_id", user.id)
      .eq("status", "completed")
      .gte("scheduled_date", lastWeekStart)
      .lt("scheduled_date", weekStart),
    supabase
      .from("sessions")
      .select("student_id")
      .eq("trainer_id", user.id)
      .eq("status", "completed")
      .gte("scheduled_date", monthStart)
      .lte("scheduled_date", today),
    supabase
      .from("sessions")
      .select("student_id, scheduled_date")
      .eq("trainer_id", user.id)
      .eq("status", "completed")
      .gte("scheduled_date", sixtyDaysAgo)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("routine_assignments")
      .select("id, student_id")
      .eq("trainer_id", user.id)
      .eq("status", "active"),
    supabase
      .from("exercises")
      .select("name, sessions!inner(trainer_id)")
      .eq("sessions.trainer_id", user.id)
      .limit(5000),
  ]);

  // Cycle progress per assignment
  const assignmentIds = (activeAssignments ?? []).map(a => a.id);
  const { data: assignSessions } = assignmentIds.length > 0
    ? await supabase
        .from("sessions")
        .select("assignment_id, status")
        .in("assignment_id", assignmentIds)
        .neq("status", "cancelled")
    : { data: [] };

  // ── Compute derived stats ──────────────────────────────────────────────────

  const studentList = students ?? [];
  const totalStudents = studentList.length;
  const sessionsThisWeek = (thisWeekSess ?? []).length;
  const sessionsThisMonth = (monthSess ?? []).length;

  // Weekly chart: Mon(0)..Sun(6)
  const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const thisWeekCountByDate = new Map<string, number>();
  const lastWeekCountByDate = new Map<string, number>();
  for (const s of thisWeekSess ?? []) {
    thisWeekCountByDate.set(s.scheduled_date, (thisWeekCountByDate.get(s.scheduled_date) ?? 0) + 1);
  }
  for (const s of lastWeekSess ?? []) {
    lastWeekCountByDate.set(s.scheduled_date, (lastWeekCountByDate.get(s.scheduled_date) ?? 0) + 1);
  }
  const weeklyChart = Array.from({ length: 7 }, (_, i) => ({
    label: DAY_LABELS[i],
    thisWeek: thisWeekCountByDate.get(addDays(weekStart, i)) ?? 0,
    lastWeek: lastWeekCountByDate.get(addDays(lastWeekStart, i)) ?? 0,
  }));

  // Sessions this week per student
  const weeklyByStudent = new Map<string, number>();
  for (const s of thisWeekSess ?? []) {
    weeklyByStudent.set(s.student_id, (weeklyByStudent.get(s.student_id) ?? 0) + 1);
  }

  // Sessions this month per student
  const monthlyByStudent = new Map<string, number>();
  for (const s of monthSess ?? []) {
    monthlyByStudent.set(s.student_id, (monthlyByStudent.get(s.student_id) ?? 0) + 1);
  }

  // Last training per student (from recentSess, already ordered desc)
  const lastTrainedMap = new Map<string, string>();
  for (const s of recentSess ?? []) {
    if (!lastTrainedMap.has(s.student_id)) lastTrainedMap.set(s.student_id, s.scheduled_date);
  }

  // Streak per student
  function computeStreak(studentId: string): number {
    const dates = (recentSess ?? [])
      .filter(s => s.student_id === studentId)
      .map(s => s.scheduled_date)
      .sort((a, b) => b.localeCompare(a));
    if (dates.length === 0) return 0;
    let streak = 0;
    let check = today;
    const dateSet = new Set(dates);
    while (dateSet.has(check)) {
      streak++;
      const prev = new Date(check + "T12:00:00Z");
      prev.setUTCDate(prev.getUTCDate() - 1);
      check = prev.toISOString().split("T")[0];
    }
    // If didn't train today, start from last trained date
    if (streak === 0 && dates.length > 0) {
      check = dates[0];
      const checkSet = new Set(dates);
      while (checkSet.has(check)) {
        streak++;
        const prev = new Date(check + "T12:00:00Z");
        prev.setUTCDate(prev.getUTCDate() - 1);
        check = prev.toISOString().split("T")[0];
      }
    }
    return streak;
  }

  // Cycle progress per student
  const cycleProgressMap = new Map<string, number>();
  for (const assignment of activeAssignments ?? []) {
    const sessForAssignment = (assignSessions ?? []).filter(s => s.assignment_id === assignment.id);
    const total = sessForAssignment.length;
    const completed = sessForAssignment.filter(s => s.status === "completed").length;
    if (total > 0) cycleProgressMap.set(assignment.student_id, Math.round((completed / total) * 100));
  }

  // Days without training
  function daysWithout(studentId: string): number | null {
    const last = lastTrainedMap.get(studentId);
    if (!last) return null;
    const diffMs = new Date(today + "T12:00:00Z").getTime() - new Date(last + "T12:00:00Z").getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Most active this week
  let mostActiveStudent: { id: string; name: string; sessions: number } | null = null;
  let maxWeeklySessions = 0;
  for (const s of studentList) {
    const n = weeklyByStudent.get(s.id) ?? 0;
    if (n > maxWeeklySessions) {
      maxWeeklySessions = n;
      mostActiveStudent = { id: s.id, name: s.full_name ?? "—", sessions: n };
    }
  }
  if (mostActiveStudent?.sessions === 0) mostActiveStudent = null;

  // Least active (most days without training, only for students with training history)
  let leastActiveStudent: { id: string; name: string; days: number } | null = null;
  let maxDaysWithout = 0;
  for (const s of studentList) {
    const d = daysWithout(s.id);
    if (d !== null && d > maxDaysWithout) {
      maxDaysWithout = d;
      leastActiveStudent = { id: s.id, name: s.full_name ?? "—", days: d };
    }
  }

  // Total exercises
  const totalExercises = (exercisesRaw ?? []).length;

  // Top 5 exercises by name
  const exerciseCount = new Map<string, number>();
  for (const ex of exercisesRaw ?? []) {
    if (ex.name) exerciseCount.set(ex.name, (exerciseCount.get(ex.name) ?? 0) + 1);
  }
  const topExercises = Array.from(exerciseCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Student stats
  const studentStats = studentList.map(s => ({
    id: s.id,
    full_name: s.full_name ?? "—",
    avatar_url: s.avatar_url,
    sessionsThisMonth: monthlyByStudent.get(s.id) ?? 0,
    currentStreak: computeStreak(s.id),
    lastTraining: lastTrainedMap.get(s.id) ?? null,
    cycleProgressPct: cycleProgressMap.get(s.id) ?? null,
    daysWithoutTraining: daysWithout(s.id),
  }));

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Estadísticas</h1>
      </div>
      <StatsView
        totalStudents={totalStudents}
        sessionsThisWeek={sessionsThisWeek}
        sessionsThisMonth={sessionsThisMonth}
        mostActiveStudent={mostActiveStudent}
        leastActiveStudent={leastActiveStudent}
        totalExercises={totalExercises}
        weeklyChart={weeklyChart}
        studentStats={studentStats}
        topExercises={topExercises}
      />
    </div>
  );
}
