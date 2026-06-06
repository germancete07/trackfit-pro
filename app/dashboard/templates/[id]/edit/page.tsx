import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { TemplateForm } from "@/components/trainer/TemplateForm";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: template } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!template) notFound();

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/templates">
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <h1 className="text-xl font-black text-gray-900">Editar rutina</h1>
      </div>
      <TemplateForm template={template as any} />
    </div>
  );
}
