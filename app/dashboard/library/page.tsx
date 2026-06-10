import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseLibrary } from "@/components/trainer/ExerciseLibrary";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const { data: exercises } = await supabase
    .from("exercise_library")
    .select("*")
    .or(`trainer_id.eq.${user.id},is_global.eq.true`)
    .order("name");

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Biblioteca de ejercicios</h1>
      <ExerciseLibrary exercises={exercises ?? []} trainerId={user.id} />
    </div>
  );
}
