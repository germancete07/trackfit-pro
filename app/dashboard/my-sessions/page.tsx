import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export default async function MySessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, exercises(id)")
    .eq("student_id", user.id)
    .order("scheduled_date", { ascending: false, nullsFirst: false });

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Mis sesiones</h1>

      {sessions && sessions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/dashboard/my-sessions/${s.id}`}>
              <Card padding="sm" className="hover:border-brand-200 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(s.exercises as any[])?.length ?? 0} ejercicios
                      {s.scheduled_date && ` · ${formatDate(s.scheduled_date)}`}
                    </p>
                  </div>
                  <Badge
                    variant={s.status === "completed" ? "success" : s.status === "active" ? "info" : "default"}
                  >
                    {s.status === "completed" ? "Hecha" : s.status === "active" ? "Activa" : "Pendiente"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-gray-400 text-sm">Tu entrenador todavía no cargó sesiones para vos.</p>
        </Card>
      )}
    </div>
  );
}
