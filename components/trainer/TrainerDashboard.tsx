import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Profile, Session } from "@/lib/types";

interface Props {
  profile: Profile;
  students: Profile[];
  recentSessions: (Session & { student: { full_name: string } | null })[];
}

export function TrainerDashboard({ profile, students, recentSessions }: Props) {
  const firstName = profile.full_name.split(" ")[0] || "Entrenador";

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Hola, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {students.length} {students.length === 1 ? "alumno activo" : "alumnos activos"}
        </p>
      </div>

      {/* Quick stats + actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-brand-500 border-0 text-white" padding="md">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Alumnos</p>
          <p className="text-3xl font-black mt-1">{students.length}</p>
        </Card>
        <Card className="bg-brand-50 border-brand-100" padding="md">
          <p className="text-brand-400 text-xs font-medium uppercase tracking-wide">Sesiones</p>
          <p className="text-3xl font-black text-brand-600 mt-1">{recentSessions.length}</p>
        </Card>
        <Link href="/dashboard/sessions/new" className="col-span-1">
          <Card padding="md" className="h-full flex items-center gap-3 hover:border-brand-300 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <PlusIcon className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nueva sesión</p>
          </Card>
        </Link>
        <Link href="/dashboard/students/new" className="col-span-1">
          <Card padding="md" className="h-full flex items-center gap-3 hover:border-brand-300 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <PlusIcon className="text-brand-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nuevo alumno</p>
          </Card>
        </Link>
      </div>

      {/* Students + Sessions side by side on desktop */}
      <div className="md:grid md:grid-cols-2 md:gap-6 flex flex-col gap-5">
        {/* Students */}
        {students.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Mis alumnos</h2>
              <Link href="/dashboard/students" className="text-xs text-brand-500 font-medium">
                Ver todos
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {students.slice(0, 5).map((s) => (
                <Link key={s.id} href={`/dashboard/students/${s.id}`}>
                  <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-600 text-sm font-bold">
                        {s.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <ChevronRightIcon />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Sesiones recientes</h2>
              <Link href="/dashboard/sessions" className="text-xs text-brand-500 font-medium">
                Ver todas
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {recentSessions.map((s) => (
                <Link key={s.id} href={`/dashboard/sessions/${s.id}`}>
                  <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">
                        {s.student?.full_name} · {s.scheduled_date ? formatDate(s.scheduled_date) : "Sin fecha"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        s.status === "completed" ? "success" :
                        s.status === "active" ? "info" : "default"
                      }
                    >
                      {s.status === "completed" ? "Completada" : s.status === "active" ? "Activa" : "Pendiente"}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
