import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewStudentForm } from "@/components/trainer/NewStudentForm";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-black text-gray-900 mb-5">Nuevo alumno</h1>
      <NewStudentForm trainerId={user.id} />
    </div>
  );
}
