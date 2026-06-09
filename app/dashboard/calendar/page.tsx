import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { MonthlyCalendar } from "@/components/student/MonthlyCalendar";
import { cn } from "@/lib/utils";
import { toggleDeloadWeekAction } from "./actions";
import { CalendarFilters } from "@/components/trainer/CalendarFilters";

function toLocalStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const today = toLocalStr(new Date());
  const tomorrow = toLocalStr(new Date(Date.now() + 86400000));
  if (dateStr === today) return "Hoy";
  if (dateStr === tomorrow) return "Mañana";
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { student?: string; status?: string };
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
    const endDate = toLocalStr(new Date(Date.now() + 14 * 86400000));

    const filterStudent = searchParams.student ?? "";
    const filterStatus = searchParams.status ?? "";

    const [{ data: students }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("trainer_id", user.id)
        .eq("archived", false)
        .order("full_name"),
    ]);

    let query = supabase
      .from("sessions")
      .select("id, name, scheduled_date, status, student_id, is_deload")
      .eq("trainer_id", user.id)
      .gte("scheduled_date", today)
      .lte("scheduled_date", endDate)
      .order("scheduled_date");

    if (filterStudent) {
      query = query.eq("student_id", filterStudent);
    }

    if (filterStatus === "completed") {
      query = query.eq("status", "completed");
    } else if (filterStatus === "pending") {
      query = query.in("status", ["pending", "active"]);
    } else {
      query = query.in("status", ["pending", "active", "completed"]);
    }

    const { data: sessions } = await query;

    const studentMap = new Map(
      (students ?? []).map((s) => [s.id, s as { id: string; full_name: string; avatar_url: string | null }])
    );

    const grouped: Record<string, typeof sessions> = {};
    for (const sess of sessions ?? []) {
      const d = sess.scheduled_date;
      if (!grouped[d]) grouped[d] = [];
      grouped[d]!.push(sess);
    }
    const sortedDates = Object.keys(grouped).sort();

    return (
      <div className="px-4 py-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900">Agenda de alumnos</h1>
          <span className="text-xs text-gray-400">Próximos 14 días</span>
        </div>

        {/* Filters */}
        <CalendarFilters
          students={students ?? []}
          activeStudent={filterStudent}
          activeStatus={filterStatus}
        />

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-4 w-4 rounded flex items-center justify-center bg-amber-100 text-amber-600 font-black text-[9px]">↓</span>
            Toca ↓ para marcar semana de descarga
          </span>
        </div>

        {sortedDates.length === 0 ? (
          <Card padding="lg" className="text-center flex flex-col items-center gap-2">
            <p className="text-3xl">📅</p>
            <p className="text-sm font-semibold text-gray-700">Sin sesiones programadas</p>
            <p className="text-xs text-gray-400">No hay rutinas asignadas en los próximos 14 días.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedDates.map((date) => {
              const daySessions = grouped[date]!;
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-bold text-gray-900">{formatDayHeader(date)}</p>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">
                      {daySessions.length} rutina{daySessions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {daySessions.map((sess) => {
                      const student = studentMap.get(sess.student_id);
                      const isDeload = sess.is_deload as boolean;
                      const toggleAction = toggleDeloadWeekAction.bind(null, sess.id);

                      return (
                        <Card
                          key={sess.id}
                          padding="sm"
                          className={cn(
                            "flex items-center gap-3 transition-colors",
                            sess.status === "completed" && "opacity-60",
                            isDeload && "bg-amber-50 border-amber-200"
                          )}
                        >
                          {/* Student link */}
                          <Link href={`/dashboard/students/${sess.student_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {student?.avatar_url ? (
                                <img src={student.avatar_url} alt={student.full_name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-brand-600 font-bold text-xs">
                                  {student?.full_name?.charAt(0).toUpperCase() ?? "?"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {sess.name}
                                {isDeload && (
                                  <span className="ml-1 text-[10px] font-bold text-amber-600">· Descarga</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{student?.full_name ?? "Alumno"}</p>
                            </div>
                          </Link>

                          {/* Status badge */}
                          <span className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                            sess.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : sess.status === "active"
                              ? "bg-brand-100 text-brand-700"
                              : "bg-gray-100 text-gray-500"
                          )}>
                            {sess.status === "completed" ? "✓" : sess.status === "active" ? "Activa" : "Pend."}
                          </span>

                          {/* Deload toggle */}
                          <form action={toggleAction}>
                            <button
                              type="submit"
                              title={isDeload ? "Quitar descarga de esta semana" : "Marcar semana de descarga"}
                              className={cn(
                                "h-11 w-11 rounded-xl flex items-center justify-center text-sm font-black transition-colors flex-shrink-0",
                                isDeload
                                  ? "bg-amber-400 text-white hover:bg-amber-500"
                                  : "bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600"
                              )}
                            >
                              ↓
                            </button>
                          </form>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
