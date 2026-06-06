import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, student:profiles!student_id(full_name), exercises(id)")
    .eq("trainer_id", user.id)
    .order("scheduled_date", { ascending: false });

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Rutinas</h1>
        <Link href="/dashboard/sessions/new">
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva
          </Button>
        </Link>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/dashboard/sessions/${s.id}`}>
              <Card padding="sm" className="hover:border-brand-200 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(s.student as any)?.full_name} · {(s.exercises as any[])?.length ?? 0} ejercicios
                    </p>
                    {s.scheduled_date && (
                      <p className="text-xs text-gray-400">{formatDate(s.scheduled_date)}</p>
                    )}
                  </div>
                  <Badge
                    variant={s.status === "completed" ? "success" : s.status === "active" ? "info" : "default"}
                  >
                    {s.status === "completed" ? "Completada" : s.status === "active" ? "Activa" : "Pendiente"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm">No creaste rutinas todavía.</p>
          <Link href="/dashboard/sessions/new">
            <Button size="sm">Crear primera rutina</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
