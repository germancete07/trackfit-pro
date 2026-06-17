import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { RoutineLibrary } from "@/components/trainer/RoutineLibrary";

export default async function FolderPage({ params }: { params: { categoryId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const { data: category } = await supabase
    .from("routine_categories")
    .select("*")
    .eq("id", params.categoryId)
    .eq("trainer_id", user.id)
    .single();

  if (!category) notFound();

  const [{ data: routines }, { data: allCategories }, { data: students }, { data: activeAssigns }] = await Promise.all([
    supabase
      .from("session_templates")
      .select("*, routine_days(id, day_number, name, sort_order, template_exercises(id, name, sort_order, sets, reps, superset_group, routine_day_id))")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("routine_categories")
      .select("*")
      .eq("trainer_id", user.id)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name, preferred_training_days")
      .eq("trainer_id", user.id)
      .eq("archived", false)
      .order("full_name"),
    supabase
      .from("routine_assignments")
      .select("template_id")
      .eq("trainer_id", user.id)
      .eq("status", "active"),
  ]);

  const activeCounts: Record<string, number> = {};
  for (const a of activeAssigns ?? []) {
    activeCounts[a.template_id] = (activeCounts[a.template_id] ?? 0) + 1;
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/routines">
          <Button variant="ghost" size="sm">← Rutinas</Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-3.5 w-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
          <h1 className="text-xl font-black text-gray-900 truncate">{category.name}</h1>
        </div>
        <Link href={`/dashboard/templates/new?category=${params.categoryId}`}>
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva
          </Button>
        </Link>
      </div>

      <RoutineLibrary
        routines={routines as any ?? []}
        categories={allCategories ?? []}
        students={students ?? []}
        categoryId={params.categoryId}
        newRoutineHref={`/dashboard/templates/new?category=${params.categoryId}`}
        activeCounts={activeCounts}
        trainerName={profile?.full_name ?? ""}
      />
    </div>
  );
}
