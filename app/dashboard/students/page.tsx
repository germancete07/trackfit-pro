import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { ActiveStudentList } from "@/components/trainer/ActiveStudentList";

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
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

type StatusColor = "green" | "yellow" | "gray" | "red";

const STATUS_DOT: Record<StatusColor, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-300",
  red: "bg-red-500",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab ?? "activos";
  const showArchived = tab === "archived";
  const showResumen = tab === "resumen";

  // For resumen + active tabs, always fetch active students
  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("trainer_id", user.id)
    .eq("archived", showArchived)
    .order("full_name");

  const today = todayStr();
  const todayDow = new Date().getDay();
  const threeDaysAgo = daysAgoStr(3);
  const weekStart = weekStartStr();

  const studentIds = (students ?? []).map(s => s.id);

  const [
    { data: todaySessions }, { data: allTrainingDays }, { data: recentSessions },
    { data: unreadMsgs }, { data: pendingVids }, { data: activeAssigns },
  ] =
    studentIds.length > 0 && !showArchived
      ? await Promise.all([
          supabase
            .from("sessions")
            .select("student_id, status")
            .eq("trainer_id", user.id)
            .eq("scheduled_date", today)
            .in("student_id", studentIds),
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
          supabase
            .from("messages")
            .select("sender_id")
            .eq("trainer_id", user.id)
            .eq("read", false)
            .in("sender_id", studentIds),
          supabase
            .from("video_corrections")
            .select("student_id")
            .eq("trainer_id", user.id)
            .eq("status", "pending")
            .in("student_id", studentIds),
          supabase
            .from("routine_assignments")
            .select("student_id")
            .eq("trainer_id", user.id)
            .eq("status", "active")
            .in("student_id", studentIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  // trained today set
  const trainedTodaySet = new Set<string>();
  for (const s of todaySessions ?? []) {
    if (s.status === "completed") trainedTodaySet.add(s.student_id);
  }

  // training days per student
  const trainingDaysMap = new Map<string, Set<number>>();
  for (const row of allTrainingDays ?? []) {
    if (!trainingDaysMap.has(row.student_id)) trainingDaysMap.set(row.student_id, new Set());
    trainingDaysMap.get(row.student_id)!.add(row.day_of_week);
  }

  // last trained date per student
  const lastTrainedMap = new Map<string, string>();
  for (const row of recentSessions ?? []) {
    const existing = lastTrainedMap.get(row.student_id);
    if (!existing || row.scheduled_date > existing) {
      lastTrainedMap.set(row.student_id, row.scheduled_date);
    }
  }

  // unread messages per student
  const unreadMsgsMap = new Map<string, number>();
  for (const msg of unreadMsgs ?? []) {
    unreadMsgsMap.set(msg.sender_id, (unreadMsgsMap.get(msg.sender_id) ?? 0) + 1);
  }

  // pending videos per student
  const pendingVidsMap = new Map<string, number>();
  for (const vid of pendingVids ?? []) {
    pendingVidsMap.set(vid.student_id, (pendingVidsMap.get(vid.student_id) ?? 0) + 1);
  }

  // active routine per student
  const activeRoutineIds: string[] = (activeAssigns ?? []).map((a: any) => a.student_id);
  const activeRoutineSet = new Set<string>(activeRoutineIds);

  function getStatus(studentId: string): StatusColor {
    if (showArchived) return "gray";
    const trainedToday = trainedTodaySet.has(studentId);
    const hasRoutineToday = trainingDaysMap.get(studentId)?.has(todayDow) ?? false;
    const hasTrainingDays = (trainingDaysMap.get(studentId)?.size ?? 0) > 0;
    const lastTrained = lastTrainedMap.get(studentId);

    if (trainedToday) return "green";
    if (hasRoutineToday) return "yellow";

    if (hasTrainingDays) {
      let daysWithout = 99;
      if (lastTrained) {
        const diffMs = new Date(today).getTime() - new Date(lastTrained).getTime();
        daysWithout = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
      if (daysWithout > 3) return "red";
    }
    return "gray";
  }

  function getSubline(studentId: string, status: StatusColor): { text: string; className: string } {
    if (status === "green") return { text: "Entrenó hoy", className: "text-green-600" };
    if (status === "yellow") return { text: "Rutina pendiente hoy", className: "text-yellow-600" };
    if (status === "red") {
      const lastTrained = lastTrainedMap.get(studentId);
      let days = 99;
      if (lastTrained) {
        const diffMs = new Date(today).getTime() - new Date(lastTrained).getTime();
        days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
      return { text: `Sin entrenar hace ${days > 90 ? "varios" : days} días`, className: "text-red-500" };
    }
    return { text: "Sin rutina hoy", className: "text-gray-400" };
  }

  // ── Resumen tab: extra data ─────────────────────────────────────────
  let resumenData: Map<string, {
    routineName: string | null;
    sessionsThisWeek: number;
    totalSessions: number;
    lastDate: string | null;
    streak: number;
  }> = new Map();

  if (showResumen && studentIds.length > 0) {
    const [{ data: activeAssignments }, { data: weekSessions }, { data: allCompleted }] = await Promise.all([
      supabase
        .from("routine_assignments")
        .select("student_id, template:session_templates(name)")
        .eq("trainer_id", user.id)
        .eq("status", "active")
        .in("student_id", studentIds),
      supabase
        .from("sessions")
        .select("student_id")
        .eq("trainer_id", user.id)
        .eq("status", "completed")
        .gte("scheduled_date", weekStart)
        .in("student_id", studentIds),
      supabase
        .from("sessions")
        .select("student_id, scheduled_date")
        .eq("trainer_id", user.id)
        .eq("status", "completed")
        .in("student_id", studentIds)
        .order("scheduled_date", { ascending: false }),
    ]);

    // Map routine names
    const routineNameMap = new Map<string, string>();
    for (const a of activeAssignments ?? []) {
      routineNameMap.set(a.student_id, (a.template as any)?.name ?? "");
    }

    // Map weekly sessions
    const weeklyCountMap = new Map<string, number>();
    for (const s of weekSessions ?? []) {
      weeklyCountMap.set(s.student_id, (weeklyCountMap.get(s.student_id) ?? 0) + 1);
    }

    // Map total sessions + last date + streak
    const allCompletedByStudent = new Map<string, string[]>();
    for (const s of allCompleted ?? []) {
      if (!allCompletedByStudent.has(s.student_id)) allCompletedByStudent.set(s.student_id, []);
      allCompletedByStudent.get(s.student_id)!.push(s.scheduled_date);
    }

    for (const sid of studentIds) {
      const dates = allCompletedByStudent.get(sid) ?? [];
      // streak: count consecutive days from most recent
      let streak = 0;
      if (dates.length > 0) {
        const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
        const msPerDay = 1000 * 60 * 60 * 24;
        let expected = new Date(today + "T12:00:00Z");
        for (const d of uniqueDates) {
          const diff = Math.round((expected.getTime() - new Date(d + "T12:00:00Z").getTime()) / msPerDay);
          if (diff <= 1) { streak++; expected = new Date(d + "T12:00:00Z"); expected.setUTCDate(expected.getUTCDate() - 1); }
          else break;
        }
      }
      resumenData.set(sid, {
        routineName: routineNameMap.get(sid) ?? null,
        sessionsThisWeek: weeklyCountMap.get(sid) ?? 0,
        totalSessions: dates.length,
        lastDate: dates[0] ?? null,
        streak,
      });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Alumnos</h1>
        <Link href="/dashboard/students/new">
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start">
        <Link
          href="/dashboard/students"
          className={cn("px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", tab === "activos" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
        >
          Activos
        </Link>
        <Link
          href="/dashboard/students?tab=resumen"
          className={cn("px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", tab === "resumen" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
        >
          Resumen
        </Link>
        <Link
          href="/dashboard/students?tab=archived"
          className={cn("px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", tab === "archived" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
        >
          Archivados
        </Link>
      </div>

      {/* ── RESUMEN TAB ── */}
      {showResumen && (
        <>
          {students && students.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-1 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <span>Alumno</span>
                <span className="text-center w-16">Esta sem.</span>
                <span className="text-center w-14">Racha</span>
                <span className="text-center w-16">Total</span>
                <span className="w-4" />
              </div>
              {students.map((s) => {
                const rd = resumenData.get(s.id);
                const status = getStatus(s.id);
                return (
                  <Link key={s.id} href={`/dashboard/students/${s.id}`}>
                    <Card padding="sm" className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center hover:border-brand-200 transition-colors">
                      {/* Name + routine */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", STATUS_DOT[status])} />
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                        </div>
                        {rd?.routineName ? (
                          <p className="text-xs text-brand-500 font-medium truncate pl-4">{rd.routineName}</p>
                        ) : (
                          <p className="text-xs text-gray-400 pl-4">Sin rutina activa</p>
                        )}
                      </div>
                      {/* Sessions this week */}
                      <div className="text-center w-16">
                        <span className={cn(
                          "text-sm font-bold",
                          (rd?.sessionsThisWeek ?? 0) > 0 ? "text-green-600" : "text-gray-300"
                        )}>
                          {rd?.sessionsThisWeek ?? 0}
                        </span>
                        <p className="text-[10px] text-gray-400">sesiones</p>
                      </div>
                      {/* Streak */}
                      <div className="text-center w-14">
                        {(rd?.streak ?? 0) > 0 ? (
                          <>
                            <span className="text-sm font-bold text-orange-500">{rd!.streak}</span>
                            <p className="text-[10px] text-gray-400">días</p>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-gray-300">—</span>
                        )}
                      </div>
                      {/* Total */}
                      <div className="text-center w-16">
                        <span className="text-sm font-bold text-gray-700">{rd?.totalSessions ?? 0}</span>
                        <p className="text-[10px] text-gray-400">total</p>
                      </div>
                      <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              illustration="students"
              title="Sin alumnos activos"
              description="Agregá tu primer alumno para ver el resumen de progreso."
              action={{ label: "Agregar alumno", href: "/dashboard/students/new" }}
            />
          )}
        </>
      )}

      {/* ── ACTIVOS TAB ── */}
      {!showResumen && !showArchived && (
        <>
          {/* Status legend */}
          {(students ?? []).length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Entrenó hoy</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />Pendiente hoy</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />+3 días sin entrenar</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />Sin rutina</span>
            </div>
          )}
          {students && students.length > 0 ? (
            <ActiveStudentList
              students={students.map(s => {
                const status = getStatus(s.id);
                const sub = getSubline(s.id, status);
                return { id: s.id, full_name: s.full_name || "(Sin nombre)", avatar_url: s.avatar_url, status, subText: sub.text, subClass: sub.className };
              })}
            />
          ) : (
            <EmptyState
              illustration="students"
              title="Sin alumnos todavia"
              description="Invita a tu primer alumno para empezar a armar sus rutinas."
              action={{ label: "Agregar primer alumno", href: "/dashboard/students/new" }}
            />
          )}
        </>
      )}

      {/* ── ARCHIVED TAB ── */}
      {showArchived && (
        <>
          {students && students.length > 0 ? (
            <div className="flex flex-col gap-2">
              {students.map((s) => (
                <Link key={s.id} href={`/dashboard/students/${s.id}`}>
                  <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-brand-600 font-bold">
                          {s.full_name ? s.full_name.charAt(0).toUpperCase() : "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
                      Archivado
                    </span>
                    <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="students"
              title="Sin alumnos archivados"
              description="Los alumnos que archives apareceran aqui."
            />
          )}
        </>
      )}
    </div>
  );
}
