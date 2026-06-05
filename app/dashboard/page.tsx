import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrainerDashboard } from "@/components/trainer/TrainerDashboard";
import { StudentDashboard } from "@/components/student/StudentDashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.role === "trainer") {
    const { data: students } = await supabase
      .from("profiles")
      .select("*")
      .eq("trainer_id", user.id)
      .order("full_name");

    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("*, student:profiles!student_id(full_name)")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return <TrainerDashboard profile={profile} students={students ?? []} recentSessions={recentSessions ?? []} />;
  }

  // Student
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, exercises(id)")
    .eq("student_id", user.id)
    .order("scheduled_date", { ascending: false })
    .limit(5);

  return <StudentDashboard profile={profile} sessions={sessions ?? []} />;
}
