import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { AssignmentForm } from "@/components/trainer/AssignmentForm";

export default async function AssignRoutinePage({
  params,
  searchParams,
}: {
  params: { templateId: string };
  searchParams: { student?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  const { data: template } = await supabase
    .from("session_templates")
    .select("id, name, description")
    .eq("id", params.templateId)
    .eq("trainer_id", user.id)
    .single();

  if (!template) notFound();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, preferred_training_days")
    .eq("trainer_id", user.id)
    .eq("archived", false)
    .order("full_name");

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/routines">
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-gray-900">Asignar rutina</h1>
          <p className="text-sm text-brand-500 font-medium truncate">{template.name}</p>
        </div>
      </div>
      <AssignmentForm
        templateId={template.id}
        templateName={template.name}
        students={students ?? []}
        initialStudentId={searchParams.student}
      />
    </div>
  );
}
