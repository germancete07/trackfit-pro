import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { MeasurementsForm } from "@/components/trainer/MeasurementsForm";

export default async function StudentMeasurementsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();
  if (!student) notFound();

  const { data: measurements } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("student_id", params.id)
    .order("measured_at", { ascending: false });

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/students/${params.id}`}>
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <h1 className="text-lg font-black text-gray-900 truncate">{student.full_name}</h1>
      </div>

      <MeasurementsForm studentId={params.id} measurements={measurements ?? []} />
    </div>
  );
}
