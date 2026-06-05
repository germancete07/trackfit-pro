import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { WeeklyLoadChart } from "@/components/trainer/WeeklyLoadChart";
import { formatDate, rpeColor, cn } from "@/lib/utils";

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("*, exercise:exercises(name, session:sessions(name))")
    .eq("student_id", user.id)
    .gte("logged_at", eightWeeksAgo.toISOString())
    .order("logged_at", { ascending: false });

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
      <h1 className="text-xl font-black text-gray-900">Mi historial</h1>

      {weeks.length > 0 ? (
        <>
          <WeeklyLoadChart weeks={weeks} />

          <div className="flex flex-col gap-2">
            {(logs ?? []).slice(0, 20).map((log) => (
              <Card key={log.id} padding="sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {(log.exercise as any)?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(log.exercise as any)?.session?.name} · {formatDate(log.logged_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{log.weight_kg}kg</p>
                    <p className="text-xs text-gray-400">{log.completed_sets} series</p>
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
        </>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-gray-400 text-sm">Todavía no registraste actividad.</p>
        </Card>
      )}
    </div>
  );
}
