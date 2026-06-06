import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProgressView } from "@/components/student/ProgressView";
import { Button } from "@/components/ui/Button";

export default async function StudentProgressPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!student) notFound();

  const studentId = params.id;
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const [{ data: logs }, { data: recentLogs }] = await Promise.all([
    supabase
      .from("exercise_logs")
      .select("weight_kg, rpe, completed_sets, session_id, logged_at, exercise_id, exercises(name, reps, muscle_group)")
      .eq("student_id", studentId)
      .not("weight_kg", "is", null),
    supabase
      .from("exercise_logs")
      .select("weight_kg, rpe, completed_sets, session_id, logged_at, exercise_id, exercises(name, reps, muscle_group)")
      .eq("student_id", studentId)
      .gte("logged_at", eightWeeksAgo.toISOString())
      .not("weight_kg", "is", null),
  ]);

  const allLogs = logs ?? [];
  const recent = recentLogs ?? [];

  function parseReps(s: string): number {
    if (!s) return 8;
    const x = s.match(/(\d+)/);
    return x ? parseInt(x[1]) : 8;
  }

  const prMap: Record<string, { max_weight: number; last_logged: string; reps: string; muscle_group: string | null }> = {};
  for (const l of allLogs) {
    const ex = l.exercises as any;
    const name = ex?.name as string | undefined;
    if (!name || !l.weight_kg) continue;
    if (!prMap[name] || l.weight_kg > prMap[name].max_weight) {
      prMap[name] = {
        max_weight: l.weight_kg,
        last_logged: l.logged_at,
        reps: ex?.reps ?? "8",
        muscle_group: ex?.muscle_group ?? null,
      };
    }
  }
  const prs = Object.entries(prMap)
    .map(([exercise_name, v]) => ({
      exercise_name,
      max_weight: v.max_weight,
      last_logged: v.last_logged,
      est_1rm: Math.round(v.max_weight * (1 + parseReps(v.reps) / 30) * 10) / 10,
      muscle_group: v.muscle_group,
    }))
    .sort((a, b) => b.max_weight - a.max_weight);

  const weekVol: Record<string, number> = {};
  for (const l of recent) {
    if (!l.weight_kg || !l.completed_sets) continue;
    const d = new Date(l.logged_at);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = monday.toISOString().split("T")[0];
    weekVol[key] = (weekVol[key] ?? 0) + l.weight_kg * l.completed_sets;
  }
  const weeklyVolume = Object.entries(weekVol)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, volume]) => ({ week, volume: Math.round(volume) }));

  const sessionRpe: Record<string, { sum: number; count: number; date: string }> = {};
  for (const l of recent) {
    if (!l.rpe || !l.session_id) continue;
    if (!sessionRpe[l.session_id])
      sessionRpe[l.session_id] = { sum: 0, count: 0, date: l.logged_at };
    sessionRpe[l.session_id].sum += l.rpe;
    sessionRpe[l.session_id].count++;
  }
  const rpeTrend = Object.entries(sessionRpe)
    .map(([, v]) => ({ session_name: "", date: v.date, avg_rpe: Math.round((v.sum / v.count) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const exerciseMap: Record<string, string> = {};
  for (const l of recent) {
    const name = (l.exercises as any)?.name as string | undefined;
    if (name && l.exercise_id) exerciseMap[name] = l.exercise_id;
  }
  const exercises = Object.entries(exerciseMap).map(([name, id]) => ({ id, name }));

  const whMap: Record<string, Record<string, number>> = {};
  for (const l of recent) {
    const name = (l.exercises as any)?.name as string | undefined;
    if (!name || !l.weight_kg) continue;
    const d = new Date(l.logged_at);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = monday.toISOString().split("T")[0];
    if (!whMap[name]) whMap[name] = {};
    whMap[name][key] = Math.max(whMap[name][key] ?? 0, l.weight_kg);
  }
  const weightHistory: Record<string, { week: string; max_weight: number }[]> = {};
  for (const [name, weeks] of Object.entries(whMap)) {
    weightHistory[name] = Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, max_weight]) => ({ week, max_weight }));
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/students/${params.id}`}>
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <h1 className="text-xl font-black text-gray-900 flex-1 truncate">
          Progreso de {student.full_name}
        </h1>
      </div>
      <ProgressView
        prs={prs}
        weeklyVolume={weeklyVolume}
        rpeTrend={rpeTrend}
        exercises={exercises}
        weightHistory={weightHistory}
      />
    </div>
  );
}
