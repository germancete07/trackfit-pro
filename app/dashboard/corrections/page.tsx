import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrainerCorrectionsView } from "@/components/trainer/TrainerCorrectionsView";
import { StudentCorrectionsView } from "@/components/student/StudentCorrectionsView";

export default async function CorrectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "trainer") {
    const { data: corrections } = await supabase
      .from("video_corrections")
      .select("*, student:profiles!student_id(full_name)")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false });

    return <TrainerCorrectionsView corrections={corrections ?? []} />;
  }

  // Student
  const { data: profile2 } = await supabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", user.id)
    .single();

  const { data: corrections } = await supabase
    .from("video_corrections")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <StudentCorrectionsView
      corrections={corrections ?? []}
      studentId={user.id}
      trainerId={profile2?.trainer_id ?? ""}
    />
  );
}
