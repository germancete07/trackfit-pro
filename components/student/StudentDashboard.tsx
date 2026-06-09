import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { OnboardingModal } from "@/components/student/OnboardingModal";
import type { Profile } from "@/lib/types";

interface StreakDay { date: string; label: string; trained: boolean; }

interface Props {
  profile: Profile;
  todaySession: { id: string; name: string; scheduled_date: string; is_deload: boolean; routine_day_name?: string | null } | null;
  trainedToday: boolean;
  trainedTodayName: string | null;
  nextSession: { id: string; name: string; scheduled_date: string } | null;
  streakDays: StreakDay[];
  cycleProgress: { total: number; completed: number; routineName: string } | null;
  showOnboarding?: boolean;
  trainerName?: string;
}

export function StudentDashboard({
  profile,
  todaySession,
  trainedToday,
  trainedTodayName,
  nextSession,
  streakDays,
  cycleProgress,
  showOnboarding = false,
  trainerName = "Tu entrenador",
}: Props) {
  const firstName = profile.full_name?.split(" ")[0] || "Atleta";
  const trainedCount = streakDays.filter(d => d.trained).length;

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      {/* Onboarding modal — shown once for new students */}
      {showOnboarding && (
        <OnboardingModal studentName={firstName} trainerName={trainerName} />
      )}
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">
          {trainedToday ? `¡Bien hecho, ${firstName}!` : `Hola, ${firstName} 💪`}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {trainedToday
            ? "Ya entrenaste hoy. Seguí así."
            : todaySession
            ? "Tenés una rutina programada para hoy."
            : nextSession
            ? `Próxima rutina: ${formatDate(nextSession.scheduled_date)}`
            : "Sin rutinas programadas próximamente."}
        </p>
      </div>

      {/* TODAY'S WORKOUT — big card */}
      {!trainedToday && todaySession && (
        <Card className="bg-gradient-to-br from-brand-500 to-brand-700 border-0 shadow-lg shadow-brand-500/20" padding="lg">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                {todaySession.is_deload ? "HOY · SEMANA DE DESCARGA" : "HOY"}
              </p>
              <h2 className="text-xl font-black text-white leading-tight">{todaySession.name}</h2>
              {todaySession.routine_day_name && (
                <p className="text-white/70 text-sm font-semibold mt-0.5">{todaySession.routine_day_name}</p>
              )}
              <p className="text-white/60 text-sm mt-0.5">{formatDate(todaySession.scheduled_date)}</p>
            </div>
            <Link href={`/dashboard/my-sessions/${todaySession.id}`}>
              <Button className="w-full bg-white text-brand-700 hover:bg-brand-50 font-black text-base py-3 shadow-none border-0">
                Entrenar ahora →
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* TRAINED TODAY — congrats + next */}
      {trainedToday && (
        <Card className="bg-green-50 border-green-200" padding="md">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-green-800">
                {trainedTodayName ? `"${trainedTodayName}" completado` : "¡Rutina completada hoy!"}
              </p>
              {nextSession && (
                <p className="text-sm text-green-600 mt-1">
                  Próxima: <span className="font-semibold">{nextSession.name}</span> · {formatDate(nextSession.scheduled_date)}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* NEXT SESSION — show if no session today */}
      {!trainedToday && !todaySession && nextSession && (
        <Link href={`/dashboard/my-sessions/${nextSession.id}`}>
          <Card padding="md" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-600 text-lg font-black">→</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Próxima rutina</p>
              <p className="text-sm font-bold text-gray-900 truncate">{nextSession.name}</p>
              <p className="text-xs text-gray-400">{formatDate(nextSession.scheduled_date)}</p>
            </div>
          </Card>
        </Link>
      )}

      {/* WEEKLY STREAK */}
      <Card padding="md" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">Esta semana</p>
          <p className="text-xs font-bold text-brand-500">{trainedCount} de 7 días activo{trainedCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-1.5">
          {streakDays.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-8 w-full rounded-lg flex items-center justify-center ${
                  d.trained
                    ? "bg-brand-500 shadow-sm shadow-brand-500/30"
                    : d.date === new Date().toISOString().split("T")[0]
                    ? "bg-brand-100 ring-2 ring-brand-400"
                    : "bg-gray-100"
                }`}
              >
                {d.trained && (
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <span className={`text-[10px] font-bold ${d.trained ? "text-brand-600" : "text-gray-400"}`}>{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* CYCLE PROGRESS */}
      {cycleProgress && (
        <Card padding="md" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ciclo actual</p>
              <p className="text-sm font-black text-gray-900 truncate">{cycleProgress.routineName}</p>
            </div>
            <p className="text-sm font-black text-brand-600 flex-shrink-0 ml-3">
              {cycleProgress.completed} / {cycleProgress.total}
            </p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${cycleProgress.total > 0 ? Math.round((cycleProgress.completed / cycleProgress.total) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-right">
            {cycleProgress.total > 0 ? Math.round((cycleProgress.completed / cycleProgress.total) * 100) : 0}% completado
          </p>
        </Card>
      )}


      {/* EMPTY STATE */}
      {!todaySession && !trainedToday && !nextSession && !cycleProgress && (
        <Card padding="lg" className="text-center">
          <p className="text-gray-400 text-sm">Tu entrenador todavía no asignó rutinas.</p>
        </Card>
      )}
    </div>
  );
}
