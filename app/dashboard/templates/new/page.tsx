import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { TemplateForm } from "@/components/trainer/TemplateForm";

export default async function NewTemplatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "trainer") redirect("/dashboard");

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/templates">
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <h1 className="text-xl font-black text-gray-900">Nueva plantilla</h1>
      </div>
      <TemplateForm />
    </div>
  );
}
