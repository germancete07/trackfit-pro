import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { WeeklyCalendar } from "@/components/student/WeeklyCalendar";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") redirect("/dashboard");

  // Training days for this student
  const { data: trainingDaysRows } = await supabase
    .from("training_days")
    .select("day_of_week")
    .eq("student_id", user.id);

  const trainingDays = (trainingDaysRows ?? []).map((r: { day_of_week: number }) => r.day_of_week);

  // Exercise activity dates (last 60 days)
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("logged_at")
    .eq("student_id", user.id)
    .gte("logged_at", since.toISOString());

  const seen: Record<string, true> = {};
  const activeDates: string[] = [];
  for (const l of (logs ?? []) as { logged_at: string }[]) {
    const d = l.logged_at.split("T")[0];
    if (!seen[d]) { seen[d] = true; activeDates.push(d); }
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      <h1 className="text-xl font-black text-gray-900">Mi calendario</h1>

      {trainingDays.length === 0 ? (
        <Card padding="lg" className="text-center flex flex-col items-center gap-2">
          <p className="text-2xl">📅</p>
          <p className="text-sm font-semibold text-gray-700">Sin dias asignados</p>
          <p className="text-xs text-gray-400">
            Tu entrenador aun no asigno tus dias de entrenamiento.
          </p>
        </Card>
      ) : (
        <Card padding="md">
          <WeeklyCalendar trainingDays={trainingDays} activeDates={activeDates} />
        </Card>
      )}
    </div>
  );
}
