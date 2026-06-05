import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Profile, Session } from "@/lib/types";

interface Props {
  profile: Profile;
  sessions: (Session & { exercises: { id: string }[] })[];
}

export function StudentDashboard({ profile, sessions }: Props) {
  const firstName = profile.full_name.split(" ")[0] || "Atleta";
  const pending = sessions.filter((s) => s.status !== "completed");

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Hola, {firstName} 💪</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pending.length > 0
            ? `Tenés ${pending.length} ${pending.length === 1 ? "sesión pendiente" : "sesiones pendientes"}`
            : "Sin sesiones pendientes"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-brand-500 border-0" padding="md">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Sesiones</p>
          <p className="text-3xl font-black text-white mt-1">{sessions.length}</p>
        </Card>
        <Card className="bg-brand-50 border-brand-100" padding="md">
          <p className="text-brand-400 text-xs font-medium uppercase tracking-wide">Pendientes</p>
          <p className="text-3xl font-black text-brand-600 mt-1">{pending.length}</p>
        </Card>
      </div>

      {/* Quick actions */}
      <Link href="/dashboard/corrections/new">
        <Card className="flex items-center gap-4 border-dashed border-2 border-brand-200 bg-brand-50/50 hover:border-brand-400 transition-colors" padding="md">
          <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <VideoIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-700">Subir video para corrección</p>
            <p className="text-xs text-brand-400">Tu entrenador te responde con feedback</p>
          </div>
        </Card>
      </Link>

      {/* Sessions */}
      {sessions.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Mis sesiones</h2>
            <Link href="/dashboard/my-sessions" className="text-xs text-brand-500 font-medium">
              Ver todas
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <Link key={s.id} href={`/dashboard/my-sessions/${s.id}`}>
                <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">
                      {s.exercises?.length ?? 0} ejercicios ·{" "}
                      {s.scheduled_date ? formatDate(s.scheduled_date) : "Sin fecha"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      s.status === "completed" ? "success" :
                      s.status === "active" ? "info" : "default"
                    }
                  >
                    {s.status === "completed" ? "Hecha" : s.status === "active" ? "Activa" : "Pendiente"}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <Card padding="lg" className="text-center">
          <p className="text-gray-400 text-sm">
            Tu entrenador todavía no cargó sesiones para vos.
          </p>
        </Card>
      )}
    </div>
  );
}

function VideoIcon() {
  return (
    <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
