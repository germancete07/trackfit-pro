import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrainerDashboard } from "@/components/trainer/TrainerDashboard";
import { StudentDashboard } from "@/components/student/StudentDashboard";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function weekStartStr() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const today = todayStr();
  const todayDow = new Date().getDay();

  // ─── Trainer ─────────────────────────────────────────────────────────────
  if (profile.role === "trainer") {
    const weekStart = weekStartStr();
    const threeDaysAgo = daysAgoStr(3);

    const [
      { data: students },
      { data: todaySessions },
      { count: unreadMessages },
      { count: weeklyCompleted },
      { count: pendingCorrections },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("trainer_id", user.id)
        .eq("archived", false)
        .order("full_name"),
      supabase
        .from("sessions")
        .select("student_id, status, name, updated_at")
        .eq("trainer_id", user.id)
        .eq("scheduled_date", today),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("trainer_id", user.id)
        .eq("read", false)
        .neq("sender_id", user.id),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("trainer_id", user.id)
        .eq("status", "completed")
        .gte("scheduled_date", weekStart),
      supabase
        .from("video_corrections")
        .select("id", { count: "exact", head: true })
        .eq("trainer_id", user.id)
        .eq("status", "pending"),
    ]);

    const studentIds = (students ?? []).map(s => s.id);

    const [{ data: allTrainingDays }, { data: recentSessions }] =
      studentIds.length > 0
        ? await Promise.all([
            supabase
              .from("training_days")
              .select("student_id, day_of_week")
              .in("student_id", studentIds),
            supabase
              .from("sessions")
              .select("student_id, scheduled_date")
              .eq("trainer_id", user.id)
              .eq("status", "completed")
              .gte("scheduled_date", threeDaysAgo)
              .in("student_id", studentIds),
          ])
        : [{ data: [] }, { data: [] }];

    // trained today map: student_id → { name, time }
    const trainedTodayMap = new Map<string, { name: string; time: string | null }>();
    for (const s of todaySessions ?? []) {
      if (s.status === "completed") {
        const time = s.updated_at
          ? new Date(s.updated_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
          : null;
        trainedTodayMap.set(s.student_id, { name: s.name, time });
      }
    }

    // training days per student
    const trainingDaysMap = new Map<string, Set<number>>();
    for (const row of allTrainingDays ?? []) {
      if (!trainingDaysMap.has(row.student_id)) trainingDaysMap.set(row.student_id, new Set());
      trainingDaysMap.get(row.student_id)!.add(row.day_of_week);
    }

    // last trained date within 3-day window per student
    const lastTrainedMap = new Map<string, string>();
    for (const row of recentSessions ?? []) {
      const existing = lastTrainedMap.get(row.student_id);
      if (!existing || row.scheduled_date > existing) {
        lastTrainedMap.set(row.student_id, row.scheduled_date);
      }
    }

    const studentsWithStatus = (students ?? []).map(s => {
      const trained = trainedTodayMap.get(s.id);
      const trainedToday = !!trained;
      const hasRoutineToday = trainingDaysMap.get(s.id)?.has(todayDow) ?? false;
      const hasTrainingDays = (trainingDaysMap.get(s.id)?.size ?? 0) > 0;
      const lastTrained = lastTrainedMap.get(s.id);

      let daysWithoutTraining: number | null = null;
      if (hasTrainingDays && !trainedToday) {
        if (lastTrained) {
          const diffMs = new Date(today).getTime() - new Date(lastTrained).getTime();
          daysWithoutTraining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } else {
          daysWithoutTraining = 99;
        }
      }

      let status: "green" | "yellow" | "gray" | "red";
      if (trainedToday) {
        status = "green";
      } else if (hasRoutineToday) {
        status = "yellow";
      } else if (hasTrainingDays && daysWithoutTraining !== null && daysWithoutTraining > 3) {
        status = "red";
      } else {
        status = "gray";
      }

      return {
        ...s,
        trainedToday,
        todaySessionName: trained?.name ?? null,
        todaySessionTime: trained?.time ?? null,
        status,
        daysWithoutTraining,
        hasRoutineToday,
      };
    });

    return (
      <TrainerDashboard
        profile={profile}
        students={studentsWithStatus}
        stats={{
          unreadMessages: unreadMessages ?? 0,
          weeklyCompleted: weeklyCompleted ?? 0,
          pendingCorrections: pendingCorrections ?? 0,
        }}
      />
    );
  }

  // ─── Student ─────────────────────────────────────────────────────────────
  const sixDaysAgo = daysAgoStr(6);

  const [
    { data: todayPending },
    { data: todayCompleted },
    { data: nextSession },
    { data: assignment },
    { data: recentCompleted },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, scheduled_date, is_deload")
      .eq("student_id", user.id)
      .eq("scheduled_date", today)
      .in("status", ["pending", "active"])
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name")
      .eq("student_id", user.id)
      .eq("scheduled_date", today)
      .eq("status", "completed")
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name, scheduled_date")
      .eq("student_id", user.id)
      .eq("status", "pending")
      .gt("scheduled_date", today)
      .order("scheduled_date")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("routine_assignments")
      .select("id, session_templates(name)")
      .eq("student_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("scheduled_date")
      .eq("student_id", user.id)
      .eq("status", "completed")
      .gte("scheduled_date", sixDaysAgo)
      .lte("scheduled_date", today),
  ]);

  // Cycle progress
  let cycleProgress: { total: number; completed: number; routineName: string } | null = null;
  if (assignment) {
    const { data: assignSessions } = await supabase
      .from("sessions")
      .select("status")
      .eq("assignment_id", assignment.id);
    if (assignSessions) {
      cycleProgress = {
        total: assignSessions.length,
        completed: assignSessions.filter((s: { status: string }) => s.status === "completed").length,
        routineName: (assignment.session_templates as { name?: string } | null)?.name ?? "Ciclo actual",
      };
    }
  }

  // 7-day streak grid
  const completedDates = new Set((recentCompleted ?? []).map((s: { scheduled_date: string }) => s.scheduled_date));
  const streakDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dow = d.getDay();
    const labels = ["D", "L", "M", "X", "J", "V", "S"];
    return { date: dateStr, label: labels[dow], trained: completedDates.has(dateStr) };
  });

  return (
    <StudentDashboard
      profile={profile}
      todaySession={todayPending ?? null}
      trainedToday={!!todayCompleted}
      trainedTodayName={(todayCompleted as { name?: string } | null)?.name ?? null}
      nextSession={nextSession ?? null}
      streakDays={streakDays}
      cycleProgress={cycleProgress}
    />
  );
}
