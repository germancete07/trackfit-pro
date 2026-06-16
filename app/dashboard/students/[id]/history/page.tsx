import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeeklyLoadChart } from "@/components/trainer/WeeklyLoadChart";
import { Card } from "@/components/ui/Card";
import { formatDate, rpeColor, cn } from "@/lib/utils";

function parseReps(repsStr: string): number {
  const matches = repsStr?.match(/\d+/g);
  if (!matches) return 8;
  const nums = matches.map(Number);
  if (nums.length === 1) return nums[0];
  if (repsStr.includes("x")) return nums[nums.length - 1];
  if (repsStr.includes("-")) return Math.round((nums[0] + nums[1]) / 2);
  return nums[0];
}

function epley(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export default async function StudentHistoryPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!student) notFound();

  // Last 8 weeks of logs
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("*, exercise:exercises(name, reps, session:sessions(name, logged_by_trainer))")
    .eq("student_id", params.id)
    .gte("logged_at", eightWeeksAgo.toISOString())
    .order("logged_at", { ascending: false });

  // Group by week
  const weeklyData: Record<string, { volume: number; sessions: Set<string>; rpeSum: number; count: number }> = {};

  (logs ?? []).forEach((log) => {
    const date = new Date(log.logged_at);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const key = weekStart.toISOString().split("T")[0];

    if (!weeklyData[key]) weeklyData[key] = { volume: 0, sessions: new Set(), rpeSum: 0, count: 0 };
    weeklyData[key].volume += (log.weight_kg ?? 0) * (log.completed_sets ?? 0);
    weeklyData[key].sessions.add(log.session_id);
    if (log.rpe) { weeklyData[key].rpeSum += log.rpe; weeklyData[key].count++; }
  });

  const weeks = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, d]) => ({
      week,
      volume: Math.round(d.volume),
      sessions: d.sessions.size,
      avg_rpe: d.count > 0 ? Math.round(d.rpeSum / d.count * 10) / 10 : 0,
    }));

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black text-gray-900">Historial de carga</h1>
        <p className="text-sm text-gray-500">{student.full_name} · últimas 8 semanas</p>
      </div>

      {weeks.length > 0 ? (
        <>
          <WeeklyLoadChart weeks={weeks} />

          {/* Weekly table */}
          <div className="flex flex-col gap-2">
            {weeks.slice().reverse().map((w) => (
              <Card key={w.week} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Semana del {formatDate(w.week)}</p>
                    <p className="text-xs text-gray-400">{w.sessions} sesión{w.sessions !== 1 ? "es" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Volumen</p>
                      <p className="text-sm font-bold text-gray-900">{w.volume.toLocaleString()} kg</p>
                    </div>
                    {w.avg_rpe > 0 && (
                      <div>
                        <p className="text-xs text-gray-400">RPE</p>
                        <span className={cn("text-sm font-bold px-1.5 py-0.5 rounded-full", rpeColor(w.avg_rpe))}>
                          {w.avg_rpe}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent logs */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">Registros recientes</h2>
            <div className="flex flex-col gap-2">
              {(logs ?? []).slice(0, 10).map((log) => (
                <Card key={log.id} padding="sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {(log.exercise as any)?.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(log.exercise as any)?.session?.name} · {formatDate(log.logged_at)}
                      </p>
                      {(log.exercise as any)?.session?.logged_by_trainer && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-100 dark:border-brand-500/20">
                          Cargado por entrenador
                        </span>
                      )}
                      {log.comment && <p className="text-xs text-gray-500 mt-0.5 italic">"{log.comment}"</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{log.weight_kg}kg</p>
                      <p className="text-xs text-gray-400">{log.completed_sets} series</p>
                      {log.weight_kg && (log.exercise as any)?.reps && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          1RM ~<span className="font-semibold text-brand-500">
                            {epley(log.weight_kg, parseReps((log.exercise as any).reps))}kg
                          </span>{" "}
                          <span className="text-gray-300">est.</span>
                        </p>
                      )}
                      {log.rpe && (
                        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full", rpeColor(log.rpe))}>
                          RPE {log.rpe}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-gray-400 text-sm">
            {student.full_name} todavía no registró actividad.
          </p>
        </Card>
      )}
    </div>
  );
}
