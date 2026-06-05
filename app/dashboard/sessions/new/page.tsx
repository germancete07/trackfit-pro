import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/trainer/SessionForm";

export default async function NewSessionPage({ searchParams }: { searchParams: { student?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("trainer_id", user.id)
    .order("full_name");

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-black text-gray-900 mb-5">Nueva sesión</h1>
      <SessionForm trainerId={user.id} students={students ?? []} defaultStudentId={searchParams.student} />
    </div>
  );
}
