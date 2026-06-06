import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

function todayStr() { return new Date().toISOString().split("T")[0]; }

export default async function MyRoutinesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayStr();

  const { data: assignment } = await supabase
    .from("routine_assignments")
    .select("id, session_templates(name), start_date, total_weeks, training_days")
    .eq("student_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const [{ data: assignmentSessions }, { data: standaloneSessions }] = await Promise.all([
    assignment
      ? supabase
          .from("sessions")
          .select("id, name, scheduled_date, status, cycle_day, is_deload")
          .eq("assignment_id", assignment.id)
          .order("scheduled_date")
      : Promise.resolve({ data: [] }),
    supabase
      .from("sessions")
      .select("id, name, scheduled_date, status")
      .eq("student_id", user.id)
      .is("assignment_id", null)
      .order("scheduled_date", { ascending: false }),
  ]);

  const sessions = assignmentSessions ?? [];
  const standalone = standaloneSessions ?? [];

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const routineName = (assignment?.session_templates as { name?: string } | null)?.name ?? "Ciclo actual";

  const todaySession = sessions.find(s => s.scheduled_date === today && s.status !== "completed");
  const upcoming = sessions.filter(s => s.scheduled_date > today && s.status === "pending").slice(0, 8);
  const completed = sessions.filter(s => s.status === "completed").slice(-10).reverse();

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      <h1 className="text-xl font-black text-gray-900">Mis Rutinas</h1>

      {/* ─── Active cycle ─────────────────────────────────────────────── */}
      {assignment ? (
        <div className="flex flex-col gap-4">
          {/* Cycle header */}
          <Card padding="md" className="border-brand-200 bg-brand-50/30 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ciclo activo</p>
            </div>
            <p className="text-lg font-black text-gray-900 -mt-1">{routineName}</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{completedSessions} de {totalSessions} días completados</span>
                <span className="font-black text-brand-600">{progressPct}%</span>
              </div>
              <div className="h-2.5 bg-brand-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </Card>

          {/* TODAY */}
          {todaySession && (
            <section>
              <p className="text-xs font-black text-brand-600 uppercase tracking-widest mb-2">Hoy</p>
              <Link href={`/dashboard/my-sessions/${todaySession.id}`}>
                <Card
                  padding="md"
                  className={`flex items-center gap-4 border-brand-300 bg-brand-50 hover:bg-brand-100/50 transition-colors ${todaySession.is_deload ? "border-amber-300 bg-amber-50" : ""}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${todaySession.is_deload ? "bg-amber-200" : "bg-brand-200"}`}>
                    <span className="text-lg">{todaySession.is_deload ? "🔽" : "💪"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 truncate">{todaySession.name}</p>
                    <p className="text-xs text-gray-500">
                      {todaySession.is_deload ? "Semana de descarga · " : ""}
                      Día {todaySession.cycle_day} del ciclo
                    </p>
                  </div>
                  <Button size="sm" className="flex-shrink-0">Entrenar</Button>
                </Card>
              </Link>
            </section>
          )}

          {/* UPCOMING */}
          {upcoming.length > 0 && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Próximas</p>
              <div className="flex flex-col gap-1.5">
                {upcoming.map(s => (
                  <Link key={s.id} href={`/dashboard/my-sessions/${s.id}`}>
                    <Card padding="sm" className={`flex items-center gap-3 hover:border-brand-200 transition-colors ${s.is_deload ? "border-amber-100" : ""}`}>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black ${s.is_deload ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                        {s.cycle_day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.scheduled_date ? formatDate(s.scheduled_date) : "Sin fecha"}</p>
                      </div>
                      {s.is_deload && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Descarga</span>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* COMPLETED */}
          {completed.length > 0 && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Completadas</p>
              <div className="flex flex-col gap-1.5">
                {completed.map(s => (
                  <Link key={s.id} href={`/dashboard/my-sessions/${s.id}`}>
                    <Card padding="sm" className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                      <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.scheduled_date ? formatDate(s.scheduled_date) : "Sin fecha"}</p>
                      </div>
                      <Badge variant="success">Hecha</Badge>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card padding="lg" className="text-center flex flex-col items-center gap-2">
          <p className="text-3xl">📋</p>
          <p className="text-sm font-semibold text-gray-700">Sin ciclo asignado</p>
          <p className="text-xs text-gray-400">Tu entrenador todavía no asignó tu plan.</p>
        </Card>
      )}

      {/* ─── Standalone sessions ─────────────────────────────────────── */}
      {standalone.length > 0 && (
        <section>
          <p className="text-sm font-bold text-gray-700 mb-2">Rutinas individuales</p>
          <div className="flex flex-col gap-2">
            {standalone.map(s => (
              <Link key={s.id} href={`/dashboard/my-sessions/${s.id}`}>
                <Card padding="sm" className="flex items-start justify-between gap-2 hover:border-brand-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.scheduled_date ? formatDate(s.scheduled_date) : "Sin fecha"}
                    </p>
                  </div>
                  <Badge variant={s.status === "completed" ? "success" : s.status === "active" ? "info" : "default"}>
                    {s.status === "completed" ? "Hecha" : s.status === "active" ? "Activa" : "Pendiente"}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
