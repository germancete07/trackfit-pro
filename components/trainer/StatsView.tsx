"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface StudentStat {
  id: string;
  full_name: string;
  avatar_url: string | null;
  sessionsThisMonth: number;
  currentStreak: number;
  lastTraining: string | null;
  cycleProgressPct: number | null;
  daysWithoutTraining: number | null;
}

interface TopExercise {
  name: string;
  count: number;
}

interface WeekDay {
  label: string;
  thisWeek: number;
  lastWeek: number;
}

interface Props {
  totalStudents: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  mostActiveStudent: { id: string; name: string; sessions: number } | null;
  leastActiveStudent: { id: string; name: string; days: number } | null;
  totalExercises: number;
  weeklyChart: WeekDay[];
  studentStats: StudentStat[];
  topExercises: TopExercise[];
}

function fmtLastTraining(dateStr: string | null): string {
  if (!dateStr) return "Sin registro";
  const d = new Date(dateStr + "T12:00:00Z");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function WeeklyBarChart({ data }: { data: WeekDay[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.thisWeek, d.lastWeek]), 1);
  const chartH = 100;
  const barW = 18;
  const gap = 4;
  const colW = 52;
  const totalW = colW * 7;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + 28}`}
        className="w-full"
        style={{ minWidth: 280, maxWidth: "100%" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((d, i) => {
          const x = i * colW;
          const lastH = Math.round((d.lastWeek / maxVal) * chartH);
          const thisH = Math.round((d.thisWeek / maxVal) * chartH);
          const lastY = chartH - lastH;
          const thisY = chartH - thisH;
          const centerX = x + colW / 2;
          return (
            <g key={d.label}>
              {/* last week bar */}
              {lastH > 0 && (
                <rect
                  x={centerX - barW - gap / 2}
                  y={lastY}
                  width={barW}
                  height={lastH}
                  rx={3}
                  fill="rgba(83,74,183,0.20)"
                />
              )}
              {/* this week bar */}
              {thisH > 0 && (
                <rect
                  x={centerX + gap / 2}
                  y={thisY}
                  width={barW}
                  height={thisH}
                  rx={3}
                  fill="#534AB7"
                />
              )}
              {/* zero line placeholder */}
              {lastH === 0 && (
                <rect x={centerX - barW - gap / 2} y={chartH - 2} width={barW} height={2} rx={1} fill="rgba(83,74,183,0.10)" />
              )}
              {thisH === 0 && (
                <rect x={centerX + gap / 2} y={chartH - 2} width={barW} height={2} rx={1} fill="rgba(83,74,183,0.20)" />
              )}
              {/* day label */}
              <text
                x={centerX}
                y={chartH + 18}
                textAnchor="middle"
                fontSize={10}
                fill="rgba(100,100,120,0.8)"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {d.label}
              </text>
              {/* count label above bar */}
              {d.thisWeek > 0 && (
                <text
                  x={centerX + gap / 2 + barW / 2}
                  y={thisY - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#534AB7"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                >
                  {d.thisWeek}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: "#534AB7" }} />
          <span className="text-[11px] text-gray-500 font-medium">Esta semana</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: "rgba(83,74,183,0.20)" }} />
          <span className="text-[11px] text-gray-500 font-medium">Semana anterior</span>
        </div>
      </div>
    </div>
  );
}

export function StatsView({
  totalStudents,
  sessionsThisWeek,
  sessionsThisMonth,
  mostActiveStudent,
  leastActiveStudent,
  totalExercises,
  weeklyChart,
  studentStats,
  topExercises,
}: Props) {
  const [sortBy, setSortBy] = useState<"actividad" | "nombre">("actividad");

  const sortedStudents = [...studentStats].sort((a, b) => {
    if (sortBy === "actividad") return b.sessionsThisMonth - a.sessionsThisMonth;
    return a.full_name.localeCompare(b.full_name, "es");
  });

  const maxExCount = topExercises[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Resumen general ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resumen general</h2>

        {/* Row 1: alumnos + sesiones */}
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="flex flex-col gap-1">
            <p className="text-3xl font-black text-brand-600 leading-none">{totalStudents}</p>
            <p className="text-xs text-gray-500 font-medium">Alumnos activos</p>
          </Card>
          <Card padding="md" className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <p className="text-3xl font-black text-green-600 leading-none">{sessionsThisWeek}</p>
              <p className="text-base font-bold text-gray-400 leading-none mb-0.5">/ {sessionsThisMonth}</p>
            </div>
            <p className="text-xs text-gray-500 font-medium">Sesiones semana / mes</p>
          </Card>
        </div>

        {/* Row 2: más activo + sin entrenar */}
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">⭐ Más activo</span>
            </div>
            {mostActiveStudent ? (
              <>
                <Link href={`/dashboard/students/${mostActiveStudent.id}`}>
                  <p className="text-sm font-black text-gray-900 hover:text-brand-600 transition-colors leading-tight truncate">
                    {mostActiveStudent.name}
                  </p>
                </Link>
                <p className="text-xs text-gray-500">{mostActiveStudent.sessions} sesión{mostActiveStudent.sessions !== 1 ? "es" : ""} esta semana</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Sin sesiones esta semana</p>
            )}
          </Card>
          <Card padding="md" className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${leastActiveStudent && leastActiveStudent.days > 5 ? "text-red-500" : "text-gray-400"}`}>
                {leastActiveStudent && leastActiveStudent.days > 5 ? "⚠ Sin entrenar" : "Último activo"}
              </span>
            </div>
            {leastActiveStudent ? (
              <>
                <Link href={`/dashboard/students/${leastActiveStudent.id}`}>
                  <p className="text-sm font-black text-gray-900 hover:text-brand-600 transition-colors leading-tight truncate">
                    {leastActiveStudent.name}
                  </p>
                </Link>
                <p className={`text-xs font-medium ${leastActiveStudent.days > 5 ? "text-red-500" : "text-gray-500"}`}>
                  Hace {leastActiveStudent.days} día{leastActiveStudent.days !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Sin datos</p>
            )}
          </Card>
        </div>

        {/* Row 3: total ejercicios */}
        <Card padding="md" className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-black text-purple-700 leading-none">{totalExercises.toLocaleString("es")}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Ejercicios registrados en total</p>
          </div>
        </Card>
      </section>

      {/* ── Actividad semanal ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actividad semanal</h2>
        <Card padding="md">
          <WeeklyBarChart data={weeklyChart} />
        </Card>
      </section>

      {/* ── Por alumno ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Por alumno</h2>
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            {(["actividad", "nombre"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all capitalize ${
                  sortBy === opt ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
              >
                {opt === "actividad" ? "Actividad" : "Nombre"}
              </button>
            ))}
          </div>
        </div>

        {sortedStudents.length === 0 ? (
          <Card padding="md" className="text-center">
            <p className="text-sm text-gray-400">Sin alumnos activos</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedStudents.map((s) => {
              const alert = s.daysWithoutTraining !== null && s.daysWithoutTraining > 5;
              return (
                <Card key={s.id} padding="sm">
                  <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                        : <span className="text-brand-600 text-sm font-bold">{s.full_name.charAt(0).toUpperCase()}</span>
                      }
                    </div>

                    {/* Name + alert */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                        {alert && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {s.daysWithoutTraining}d sin entreno
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Último: {fmtLastTraining(s.lastTraining)}</p>
                    </div>

                    {/* Stats chips */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-medium">
                          {s.sessionsThisMonth} ses/mes
                        </span>
                        {s.currentStreak > 0 && (
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            🔥{s.currentStreak}
                          </span>
                        )}
                      </div>
                      {s.cycleProgressPct !== null && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${s.cycleProgressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-semibold">{s.cycleProgressPct}%</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Ejercicios más usados ────────────────────────────────────────────── */}
      {topExercises.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ejercicios más usados</h2>
          <Card padding="md" className="flex flex-col gap-3">
            {topExercises.map((ex, i) => (
              <div key={ex.name} className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-300 w-4 flex-shrink-0 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ex.name}</p>
                    <span className="text-xs text-gray-500 font-bold flex-shrink-0 ml-2">{ex.count}×</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((ex.count / maxExCount) * 100)}%`,
                        background: i === 0 ? "#534AB7" : i === 1 ? "#7c3aed" : i === 2 ? "#8b5cf6" : i === 3 ? "#a78bfa" : "#c4b5fd",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
