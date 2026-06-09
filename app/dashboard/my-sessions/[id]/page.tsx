import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseLogger } from "@/components/student/ExerciseLogger";

export default async function StudentSessionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("*, exercises(*, exercise_logs(*))")
    .eq("id", params.id)
    .eq("student_id", user.id)
    .single();

  if (!session) notFound();

  const exercises = (session.exercises as any[] ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

  return (
    <ExerciseLogger
      session={session as any}
      exercises={exercises}
      studentId={user.id}
      routineDayName={(session as any).routine_day_name ?? null}
    />
  );
}
