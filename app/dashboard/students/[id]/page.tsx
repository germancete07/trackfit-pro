import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate, rpeColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!student) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, exercises(count)")
    .eq("trainer_id", user.id)
    .eq("student_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-600 font-bold text-lg">{student.full_name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900">{student.full_name}</h1>
          <p className="text-sm text-gray-400">{student.email}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Link href={`/dashboard/sessions/new?student=${params.id}`} className="flex-1">
          <Button size="sm" className="w-full">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva sesión
          </Button>
        </Link>
        <Link href={`/dashboard/students/${params.id}/history`} className="flex-1">
          <Button size="sm" variant="secondary" className="w-full">
            Historial
          </Button>
        </Link>
      </div>

      {/* Sessions */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-2">Sesiones</h2>
        {sessions && sessions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <Link key={s.id} href={`/dashboard/sessions/${s.id}`}>
                <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">
                      {s.scheduled_date ? formatDate(s.scheduled_date) : "Sin fecha"} ·{" "}
                      {(s.exercises as any)?.[0]?.count ?? 0} ejercicios
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                    s.status === "completed" ? "bg-green-100 text-green-700" :
                    s.status === "active" ? "bg-brand-100 text-brand-700" :
                    "bg-gray-100 text-gray-500"
                  )}>
                    {s.status === "completed" ? "Completada" : s.status === "active" ? "Activa" : "Pendiente"}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card padding="lg" className="text-center flex flex-col items-center gap-3">
            <p className="text-gray-400 text-sm">Sin sesiones asignadas todavía.</p>
            <Link href={`/dashboard/sessions/new?student=${params.id}`}>
              <Button size="sm">Crear primera sesión</Button>
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}
