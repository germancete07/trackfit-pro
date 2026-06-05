import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const showArchived = searchParams.tab === "archived";

  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("trainer_id", user.id)
    .eq("archived", showArchived)
    .order("full_name");

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Alumnos</h1>
        <Link href="/dashboard/students/new">
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start">
        <Link
          href="/dashboard/students"
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            !showArchived ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Activos
        </Link>
        <Link
          href="/dashboard/students?tab=archived"
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            showArchived ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Archivados
        </Link>
      </div>

      {students && students.length > 0 ? (
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <Link key={s.id} href={`/dashboard/students/${s.id}`}>
              <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                <div className="h-10 w-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-brand-600 font-bold">
                      {s.full_name ? s.full_name.charAt(0).toUpperCase() : "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
                {s.archived && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
                    Archivado
                  </span>
                )}
                <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          illustration="students"
          title={showArchived ? "Sin alumnos archivados" : "Sin alumnos todavia"}
          description={
            showArchived
              ? "Los alumnos que archives apareceran aqui."
              : "Invita a tu primer alumno para empezar a armar sus rutinas."
          }
          action={
            !showArchived
              ? { label: "Agregar primer alumno", href: "/dashboard/students/new" }
              : undefined
          }
        />
      )}
    </div>
  );
}
