"use client";

import { cn } from "@/lib/utils";

interface Props {
  trainingDays: number[];
  activeDates: string[];
}

const DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function getWeekDates(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset + i);
    return d;
  });
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthDates(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function WeeklyCalendar({ trainingDays, activeDates }: Props) {
  const today = new Date();
  const todayStr = toISO(today);
  const activeSet = new Set(activeDates);
  const weekDates = getWeekDates();

  // Monthly view
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthCells = getMonthDates(year, month);
  const monthName = today.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Esta semana ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Esta semana</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map((date, i) => {
            const dateStr = toISO(date);
            const isToday = dateStr === todayStr;
            const isTraining = trainingDays.includes(date.getDay());
            const isDone = activeSet.has(dateStr);
            const isPast = date < today && !isToday;

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {DAY_LABELS[i]}
                </p>
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: isDone ? "#EAF3DE" :
                      isToday ? "#534AB7" :
                      (isTraining && !isPast) ? "rgba(83,74,183,0.1)" :
                      (isTraining && isPast) ? "#F0EEE9" :
                      "transparent",
                    color: isDone ? "#3B6D11" :
                      isToday ? "white" :
                      isTraining ? "#534AB7" :
                      "#888780",
                  }}
                >
                  {isDone ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    date.getDate()
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
            Entrenado
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500 inline-block" />
            Hoy con entrenamiento
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-100 border border-brand-200 inline-block" />
            Dia planificado
          </span>
        </div>
      </section>

      {/* ── Asistencia del mes ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 capitalize">
          {monthName}
        </h2>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <p key={d} className="text-[10px] font-bold pb-1" style={{ color: "#888780" }}>{d}</p>
          ))}
          {monthCells.map((date, i) => {
            if (!date) return <div key={i} />;
            const dateStr = toISO(date);
            const isToday = dateStr === todayStr;
            const isDone = activeSet.has(dateStr);
            const isTraining = trainingDays.includes(date.getDay());

            return (
              <div key={i} className="flex items-center justify-center py-0.5">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                  style={{
                    background: isDone ? "#EAF3DE" : isToday ? "#534AB7" : isTraining ? "rgba(83,74,183,0.1)" : "transparent",
                    color: isDone ? "#3B6D11" : isToday ? "white" : isTraining ? "#534AB7" : "#888780",
                  }}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
