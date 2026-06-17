import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TrainerOnboardingModal } from "@/components/trainer/TrainerOnboardingModal";
import type { Profile } from "@/lib/types";

interface StudentWithStatus {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trainedToday: boolean;
  todaySessionName: string | null;
  todaySessionTime: string | null;
  status: "green" | "yellow" | "gray" | "red";
  daysWithoutTraining: number | null;
  hasRoutineToday: boolean;
}

interface TrainerStats {
  unreadMessages: number;
  weeklyCompleted: number;
  pendingCorrections: number;
}

interface Props {
  profile: Profile;
  students: StudentWithStatus[];
  stats: TrainerStats;
  activeStudents: number;
  showOnboarding?: boolean;
}

const STATUS_DOT: Record<StudentWithStatus["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-300",
  red: "bg-red-500",
};

function statusSubline(s: StudentWithStatus): { text: string; className: string } {
  if (s.status === "green" && s.todaySessionName) {
    const suffix = s.todaySessionTime ? ` · ${s.todaySessionTime}` : "";
    return { text: `✓ ${s.todaySessionName}${suffix}`, className: "text-green-600" };
  }
  if (s.status === "yellow") {
    return { text: "Rutina pendiente hoy", className: "text-yellow-600" };
  }
  if (s.status === "red") {
    const days = s.daysWithoutTraining ?? 0;
    return { text: `Sin entrenar hace ${days > 90 ? "varios" : days} día${days !== 1 ? "s" : ""}`, className: "text-red-500" };
  }
  return { text: "Sin rutina hoy", className: "text-gray-400" };
}

export function TrainerDashboard({ profile, students, stats, activeStudents, showOnboarding }: Props) {
  const firstName = profile.full_name?.split(" ")[0] || "Entrenador";
  const trainedCount = students.filter(s => s.trainedToday).length;
  const totalStudents = students.length;

  // Mini trial banner: only show when ≤7 days left on trial
  const trialDaysLeft = profile.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const showTrialBanner = trialDaysLeft !== null && trialDaysLeft <= 7 && trialDaysLeft > 0;

  return (
    <>
      {showOnboarding && (
        <TrainerOnboardingModal
          userId={profile.id}
          initialSpaceName={profile.space_name}
        />
      )}
    <div className="px-4 py-5 flex flex-col gap-5">
      {/* Urgent trial banner — only ≤7 days remaining */}
      {showTrialBanner && (
        <Link href="/dashboard/settings">
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
            style={{ background: "rgba(245,158,11,0.10)", border: "0.5px solid rgba(245,158,11,0.30)" }}
          >
            <span className="font-medium text-amber-700">
              ⏳ Tu prueba gratuita vence en <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "día" : "días"}</strong>
            </span>
            <span className="font-bold text-amber-700 underline underline-offset-2">Suscribirte →</span>
          </div>
        </Link>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Hola, {firstName} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalStudents === 0
            ? "Todavía no tenés alumnos."
            : `${trainedCount} de ${totalStudents} ${totalStudents === 1 ? "alumno entrenó" : "alumnos entrenaron"} hoy`}
        </p>
      </div>

      {/* Stats — horizontal scroll row */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {[
          { value: trainedCount, label: "Activos hoy", color: "text-green-600" },
          { value: stats.weeklyCompleted, label: "Rutinas semana", color: "text-brand-600" },
          { value: stats.unreadMessages, label: "Mensajes", color: stats.unreadMessages > 0 ? "text-blue-600" : "text-gray-400" },
          { value: stats.pendingCorrections, label: "Videos", color: stats.pendingCorrections > 0 ? "text-amber-500" : "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="flex-none w-[calc(25%-8px)] min-w-[72px] bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex flex-col gap-0.5">
            <p className={`text-xl font-black leading-none ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stats shortcut */}
      <Link href="/dashboard/stats" className="flex items-center justify-between rounded-2xl px-4 py-3 bg-brand-50 border border-brand-100 hover:bg-brand-100 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-brand-800">Ver estadísticas</p>
            <p className="text-xs text-brand-500">Actividad, alumnos y más</p>
          </div>
        </div>
        <svg className="h-4 w-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/templates/new">
          <Card padding="md" className="h-full flex items-center gap-3 hover:border-brand-300 transition-colors cursor-pointer">
            <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <PlusIcon className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">Nueva rutina</p>
              <p className="text-xs text-gray-400">Crear rutina</p>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/students/new">
          <Card padding="md" className="h-full flex items-center gap-3 hover:border-brand-300 transition-colors cursor-pointer">
            <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <UserPlusIcon className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">Nuevo alumno</p>
              <p className="text-xs text-gray-400">Invitar</p>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/calendar">
          <Card padding="md" className="h-full flex items-center gap-3 hover:border-brand-300 transition-colors cursor-pointer">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">Agenda</p>
              <p className="text-xs text-gray-400">Ver completa</p>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/chat">
          <Card padding="md" className="h-full flex items-center gap-3 hover:border-brand-300 transition-colors cursor-pointer">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${stats.unreadMessages > 0 ? "bg-blue-500" : "bg-gray-100"}`}>
              <ChatIcon className={stats.unreadMessages > 0 ? "text-white" : "text-gray-500"} />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">Mensajes</p>
              <p className="text-xs text-gray-400">
                {stats.unreadMessages > 0 ? `${stats.unreadMessages} sin leer` : "Sin pendientes"}
              </p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Students */}
      {totalStudents > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Alumnos hoy</h2>
            <Link href="/dashboard/students" className="text-xs text-brand-500 font-medium">Ver todos</Link>
          </div>
          <div className="flex flex-col gap-2">
            {students.slice(0, 8).map(s => {
              const sub = statusSubline(s);
              return (
                <Link key={s.id} href={`/dashboard/students/${s.id}`}>
                  <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                        : <span className="text-brand-600 text-sm font-bold">{s.full_name?.charAt(0).toUpperCase() ?? "?"}</span>}
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT[s.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                      <p className={`text-xs font-medium truncate ${sub.className}`}>{sub.text}</p>
                    </div>
                    <ChevronIcon />
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {totalStudents === 0 && (
        <Card padding="lg" className="text-center flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm">Todavía no tenés alumnos registrados.</p>
          <Link href="/dashboard/students/new">
            <Button size="sm">Agregar primer alumno</Button>
          </Link>
        </Card>
      )}
    </div>
    </>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 ${className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
