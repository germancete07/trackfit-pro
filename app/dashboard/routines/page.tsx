import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { RoutineLibrary } from "@/components/trainer/RoutineLibrary";
import { ExerciseLibrary } from "@/components/trainer/ExerciseLibrary";

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const activeTab = searchParams.tab === "biblioteca" ? "biblioteca" : "rutinas";

  if (activeTab === "biblioteca") {
    const { data: exercises } = await supabase
      .from("exercise_library")
      .select("*")
      .eq("trainer_id", user.id)
      .order("muscle_group")
      .order("name");

    return (
      <div className="px-4 py-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900">Rutinas</h1>
          <Link href="/dashboard/templates/new">
            <Button size="sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva rutina
            </Button>
          </Link>
        </div>
        <RoutineTabs active="biblioteca" />
        <ExerciseLibrary exercises={exercises ?? []} />
      </div>
    );
  }

  const [{ data: routines }, { data: categories }, { data: students }] = await Promise.all([
    supabase
      .from("session_templates")
      .select("*, template_exercises(*)")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("routine_categories")
      .select("*")
      .eq("trainer_id", user.id)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("trainer_id", user.id)
      .eq("archived", false)
      .order("full_name"),
  ]);

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Rutinas</h1>
        <Link href="/dashboard/templates/new">
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva rutina
          </Button>
        </Link>
      </div>

      <RoutineTabs active="rutinas" />

      <RoutineLibrary
        routines={routines as any ?? []}
        categories={categories ?? []}
        students={students ?? []}
        newRoutineHref="/dashboard/templates/new"
      />
    </div>
  );
}

function RoutineTabs({ active }: { active: "rutinas" | "biblioteca" }) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start">
      <Link
        href="/dashboard/routines"
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
          active === "rutinas" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
        }`}
      >
        Mis rutinas
      </Link>
      <Link
        href="/dashboard/routines?tab=biblioteca"
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
          active === "biblioteca" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
        }`}
      >
        Biblioteca
      </Link>
    </div>
  );
}
