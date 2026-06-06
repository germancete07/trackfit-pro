import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { TemplateLibrary } from "@/components/trainer/TemplateLibrary";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const [{ data: templates }, { data: activeAssignments }] = await Promise.all([
    supabase
      .from("session_templates")
      .select("*, template_exercises(*)")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("routine_assignments")
      .select("template_id")
      .eq("trainer_id", user.id)
      .eq("status", "active"),
  ]);

  // count active assignments per template
  const assignedCounts: Record<string, number> = {};
  for (const a of activeAssignments ?? []) {
    if (a.template_id) {
      assignedCounts[a.template_id] = (assignedCounts[a.template_id] ?? 0) + 1;
    }
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Rutinas</h1>
        <Link href="/dashboard/templates/new">
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva
          </Button>
        </Link>
      </div>
      <TemplateLibrary initial={templates as any ?? []} assignedCounts={assignedCounts} />
    </div>
  );
}
