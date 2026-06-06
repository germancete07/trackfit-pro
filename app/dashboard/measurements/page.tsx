import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { MeasurementsChart } from "@/components/student/MeasurementsChart";

export default async function MeasurementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "student") redirect("/dashboard");

  const { data: measurements } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("student_id", user.id)
    .order("measured_at", { ascending: false });

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Mis medidas</h1>

      {!measurements || measurements.length === 0 ? (
        <Card padding="lg" className="text-center flex flex-col items-center gap-2">
          <p className="text-4xl">📏</p>
          <p className="text-sm font-bold text-gray-700">Sin medidas registradas</p>
          <p className="text-xs text-gray-400">Tu entrenador registrará tus medidas corporales en cada evaluación.</p>
        </Card>
      ) : (
        <Card padding="md">
          <MeasurementsChart measurements={measurements} />
        </Card>
      )}
    </div>
  );
}
