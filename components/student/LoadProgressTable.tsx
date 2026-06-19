"use client";

import { useState } from "react";

export interface LoadPoint {
  week: string;
  weightKg: number;
  sets: number;
  muscleGroup: string | null;
}

interface Props {
  loadHistory: Record<string, LoadPoint[]>;
}

function getLast6Weeks(loadHistory: Record<string, LoadPoint[]>): string[] {
  const allWeeks = new Set<string>();
  for (const pts of Object.values(loadHistory)) {
    for (const p of pts) allWeeks.add(p.week);
  }
  return Array.from(allWeeks).sort().slice(-6);
}

function calcTrend(pts: LoadPoint[], weeks: string[]): "up" | "down" | "same" {
  const filled = weeks.map(w => pts.find(p => p.week === w)).filter(Boolean) as LoadPoint[];
  if (filled.length < 2) return "same";
  const first = filled[0].weightKg;
  const last = filled[filled.length - 1].weightKg;
  if (last > first) return "up";
  if (last < first) return "down";
  return "same";
}

export function LoadProgressTable({ loadHistory }: Props) {
  const weeks = getLast6Weeks(loadHistory);
  const [muscleFilter, setMuscleFilter] = useState("all");

  const allMuscleGroups = Array.from(new Set(
    Object.values(loadHistory).flatMap(pts =>
      pts.map(p => p.muscleGroup ?? "Sin categoría")
    )
  )).sort();

  const exercises = Object.entries(loadHistory)
    .filter(([, pts]) => {
      if (muscleFilter === "all") return true;
      return pts.some(p => (p.muscleGroup ?? "Sin categoría") === muscleFilter);
    })
    .sort(([, apts], [, bpts]) => {
      const aGroup = apts[0]?.muscleGroup ?? "zzz";
      const bGroup = bpts[0]?.muscleGroup ?? "zzz";
      return aGroup.localeCompare(bGroup);
    });

  if (weeks.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Sin datos de carga para mostrar.
      </p>
    );
  }

  const weekLabels = weeks.map(w => {
    const d = new Date(w + "T12:00:00");
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  return (
    <div className="flex flex-col gap-3">
      {allMuscleGroups.length > 1 && (
        <select
          value={muscleFilter}
          onChange={e => setMuscleFilter(e.target.value)}
          className="self-start text-xs font-semibold text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-100 dark:border-brand-500/20 rounded-lg px-2 py-1 outline-none"
        >
          <option value="all">Todos los músculos</option>
          {allMuscleGroups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      )}

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 bg-white dark:bg-[#1E1E2E] text-left font-bold text-gray-500 dark:text-white/40 py-2 pr-4 pl-0 border-b border-gray-100 dark:border-white/10"
                style={{ minWidth: 110 }}
              >
                Ejercicio
              </th>
              {weekLabels.map((label, i) => (
                <th
                  key={i}
                  className="text-center font-semibold text-gray-400 dark:text-white/40 py-2 px-2 border-b border-gray-100 dark:border-white/10 whitespace-nowrap"
                  style={{ minWidth: 72 }}
                >
                  <span className="text-[10px] text-gray-400 dark:text-white/30 block">S{i + 1}</span>
                  <span>{label}</span>
                </th>
              ))}
              <th
                className="text-center font-semibold text-gray-400 dark:text-white/40 py-2 px-2 border-b border-gray-100 dark:border-white/10"
                style={{ minWidth: 44 }}
              >
                ↕
              </th>
            </tr>
          </thead>
          <tbody>
            {exercises.map(([name, pts], rowIdx) => {
              const t = calcTrend(pts, weeks);
              return (
                <tr
                  key={name}
                  className={
                    rowIdx % 2 === 0
                      ? ""
                      : "bg-gray-50/60 dark:bg-white/[0.02]"
                  }
                >
                  <td
                    className="sticky left-0 z-10 bg-inherit py-2 pr-4 pl-0 font-medium text-gray-800 dark:text-white/90 max-w-[110px] truncate"
                    title={name}
                  >
                    {name}
                  </td>
                  {weeks.map((w, i) => {
                    const pt = pts.find(p => p.week === w);
                    return (
                      <td
                        key={i}
                        className="text-center py-2 px-2 whitespace-nowrap"
                      >
                        {pt ? (
                          <span className="font-semibold text-gray-700 dark:text-white/80">
                            {pt.weightKg}kg
                            <span className="text-gray-400 dark:text-white/30 font-normal">
                              ×{pt.sets}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-white/20">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center py-2 px-2">
                    {t === "up" && (
                      <span className="text-green-600 font-bold text-sm">↑</span>
                    )}
                    {t === "down" && (
                      <span className="text-red-500 font-bold text-sm">↓</span>
                    )}
                    {t === "same" && (
                      <span className="text-gray-300 dark:text-white/20">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 text-right">
        Últimas {weeks.length} semanas · peso máximo × series registradas
      </p>
    </div>
  );
}
