"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadProgressTable, type LoadPoint } from "@/components/student/LoadProgressTable";

interface PR {
  exercise_name: string;
  max_weight: number;
  last_logged: string;
  est_1rm: number;
  muscle_group: string | null;
}

interface WeeklyVol {
  week: string;
  volume: number;
}

interface RpeTrend {
  session_name: string;
  date: string;
  avg_rpe: number;
}

interface WeightPoint {
  week: string;
  max_weight: number;
}

interface ExerciseOption {
  id: string;
  name: string;
}

interface Props {
  prs: PR[];
  weeklyVolume: WeeklyVol[];
  rpeTrend: RpeTrend[];
  exercises: ExerciseOption[];
  weightHistory: Record<string, WeightPoint[]>;
  loadHistory?: Record<string, LoadPoint[]>;
}

function shortDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function BarChart({ data, maxValue, color = "bg-brand-500" }: {
  data: { label: string; value: number }[];
  maxValue: number;
  color?: string;
}) {
  if (data.length === 0) return <p className="text-xs text-gray-400">Sin datos suficientes.</p>;
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className={`w-full rounded-t-md ${color} transition-all`}
            style={{ height: `${Math.max((d.value / (maxValue || 1)) * 68, 2)}px` }}
            title={String(d.value)}
          />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points, color = "#534AB7" }: { points: number[]; color?: string }) {
  if (points.length < 2) return <p className="text-xs text-gray-400">Sin datos suficientes.</p>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const H = 64;
  const W = 100;
  const step = W / (points.length - 1);
  const coords = points.map((v, i) => `${i * step},${H - ((v - min) / range) * (H - 6)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {points.map((v, i) => (
        <circle key={i} cx={i * step} cy={H - ((v - min) / range) * (H - 6)} r="3" fill={color} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function PRGroupedList({ prs }: { prs: PR[] }) {
  const groups: Record<string, PR[]> = {};
  for (const pr of prs) {
    const key = pr.muscle_group ?? "Sin categoría";
    if (!groups[key]) groups[key] = [];
    groups[key].push(pr);
  }
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (a === "Sin categoría") return 1;
    if (b === "Sin categoría") return -1;
    return a.localeCompare(b);
  });

  let globalIdx = 0;
  return (
    <div className="flex flex-col gap-4">
      {sortedGroups.map(([group, items]) => (
        <div key={group}>
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">{group}</p>
          <div className="flex flex-col gap-2">
            {items.map((pr) => {
              const rank = globalIdx++;
              return (
                <div key={pr.exercise_name} className="flex items-center gap-2">
                  <span className="text-xs font-black w-5 text-center leading-none">
                    {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : <span className="text-gray-500">{rank + 1}</span>}
                  </span>
                  <p className="text-sm text-gray-800 flex-1 truncate font-medium">{pr.exercise_name}</p>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-brand-600 leading-none">{pr.max_weight} kg</span>
                    {pr.est_1rm > 0 && (
                      <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                        ~{pr.est_1rm} kg 1RM*
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-gray-400 text-right">* 1RM estimado (Epley) — teórico</p>
    </div>
  );
}

export function ProgressView({ prs, weeklyVolume, rpeTrend, exercises, weightHistory, loadHistory }: Props) {
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.name ?? "");
  const [view, setView] = useState<"tabla" | "graficos">("tabla");

  const maxVol = Math.max(...weeklyVolume.map((w) => w.volume), 1);
  const maxRpe = 10;

  const weightPoints = weightHistory[selectedExercise] ?? [];
  const hasLoadData = loadHistory && Object.keys(loadHistory).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* View toggle */}
      {hasLoadData && (
        <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-white/10 rounded-xl w-fit">
          {(["tabla", "graficos"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                view === v
                  ? "bg-white dark:bg-[#2A2A40] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70"
              }`}
            >
              {v === "tabla" ? "Tabla de cargas" : "Gráficos"}
            </button>
          ))}
        </div>
      )}

      {/* Tabla de cargas */}
      {view === "tabla" && hasLoadData && (
        <Card padding="md">
          <h2 className="text-sm font-bold text-gray-700 dark:text-white/80 mb-3">Progreso de cargas · últimas 6 semanas</h2>
          <LoadProgressTable loadHistory={loadHistory!} />
        </Card>
      )}

      {/* Gráficos view */}
      {(view === "graficos" || !hasLoadData) && (
        <>
          {/* PRs grouped by muscle_group */}
          <Card padding="md">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Récords personales</h2>
            {prs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-3xl">🏋️</p>
                <p className="text-sm font-bold text-gray-600">Sin récords todavía</p>
                <p className="text-xs text-gray-400">Completá tu primera rutina y tus récords aparecerán acá.</p>
              </div>
            ) : (
              <PRGroupedList prs={prs} />
            )}
          </Card>

          {/* Evolución de carga por ejercicio */}
          <Card padding="md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-gray-700">Evolucion de carga</h2>
              {exercises.length > 0 && (
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-2 py-1 outline-none max-w-[140px] truncate"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                  ))}
                </select>
              )}
            </div>
            {exercises.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Completá rutinas para ver tu evolución de carga.</p>
            ) : weightPoints.length >= 2 ? (
              <>
                <LineChart points={weightPoints.map((p) => p.max_weight)} />
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  {weightPoints.map((p, i) => (
                    <span key={i}>{shortDate(p.week)}</span>
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-semibold text-brand-600">
                  <span>{weightPoints[0].max_weight} kg</span>
                  <span className={weightPoints[weightPoints.length - 1].max_weight >= weightPoints[0].max_weight ? "text-green-600" : "text-red-400"}>
                    {weightPoints[weightPoints.length - 1].max_weight} kg
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">Se necesitan al menos 2 semanas de datos.</p>
            )}
          </Card>

          {/* Volumen semanal */}
          <Card padding="md">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Volumen semanal (kg)</h2>
            <BarChart
              data={weeklyVolume.map((w) => ({ label: shortDate(w.week), value: w.volume }))}
              maxValue={maxVol}
            />
            {weeklyVolume.length > 0 && (
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                <span>0 kg</span>
                <span>{maxVol.toLocaleString()} kg</span>
              </div>
            )}
          </Card>

          {/* RPE promedio por sesión */}
          <Card padding="md">
            <h2 className="text-sm font-bold text-gray-700 mb-3">RPE promedio por sesion</h2>
            {rpeTrend.length > 0 ? (
              <>
                <BarChart
                  data={rpeTrend.slice(-12).map((r) => ({ label: shortDate(r.date), value: r.avg_rpe }))}
                  maxValue={maxRpe}
                  color="bg-amber-400"
                />
                <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                  <span>RPE 0</span>
                  <span>RPE 10</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">Sin datos de sesiones completas.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
