import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
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

  const showArchived = searchParams.tab === "archived";

  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("trainer_id", user.id)
    .eq("archived", showArchived)
    .order("full_name");

  const today = todayStr();
  const todayDow = new Date().getDay();
  const threeDaysAgo = daysAgoStr(3);

  const studentIds = (students ?? []).map(s => s.id);

  const [{ data: todaySessions }, { data: allTrainingDays }, { data: recentSessions }] =
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
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

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
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            !showArchived ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Activos
        </Link>
        <Link
          href="/dashboard/students?tab=archived"
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            showArchived ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Archivados
        </Link>
      </div>

      {/* Status legend */}
      {!showArchived && (students ?? []).length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Entrenó hoy</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />Pendiente hoy</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />+3 días sin entrenar</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />Sin rutina</span>
        </div>
      )}

      {students && students.length > 0 ? (
        <div className="flex flex-col gap-2">
          {students.map((s) => {
            const status = getStatus(s.id);
            const sub = showArchived ? null : getSubline(s.id, status);
            return (
              <Link key={s.id} href={`/dashboard/students/${s.id}`}>
                <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-brand-600 font-bold">
                        {s.full_name ? s.full_name.charAt(0).toUpperCase() : "?"}
                      </span>
                    )}
                    {!showArchived && (
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT[status]}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</p>
                    {sub ? (
                      <p className={`text-xs font-medium truncate ${sub.className}`}>{sub.text}</p>
                    ) : (
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    )}
                  </div>
                  {s.archived && (
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
                      Archivado
                    </span>
                  )}
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
          title={showArchived ? "Sin alumnos archivados" : "Sin alumnos todavia"}
          description={
            showArchived
              ? "Los alumnos que archives apareceran aqui."
              : "Invita a tu primer alumno para empezar a armar sus rutinas."
          }
          action={
            !showArchived
              ? { label: "Agregar primer alumno", href: "/dashboard/students/new" }
              : undefined
          }
        />
      )}
    </div>
  );
}
