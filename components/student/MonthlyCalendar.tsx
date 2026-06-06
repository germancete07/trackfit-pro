"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { rescheduleSessionAction } from "@/app/dashboard/my-sessions/actions";
import { cn } from "@/lib/utils";

interface CalSession {
  id: string;
  name: string;
  cycle_day: number;
  scheduled_date: string;
  status: "pending" | "active" | "completed";
  is_deload: boolean;
  original_date?: string | null;
}

interface CalAssignment {
  start_date: string;
  training_days: number[];
  total_weeks: number;
  session_templates?: { name: string } | null;
}

interface Props {
  sessions: CalSession[];
  assignment: CalAssignment;
  totalSessions: number;
  completedSessions: number;
}

const DAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCurrentWeekMonday(): string {
  const d = new Date();
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toLocalDateStr(mon);
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: { date: Date; currentMonth: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - i - 1);
    days.push({ date: d, currentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), currentMonth: true });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(lastDay);
    d.setDate(lastDay.getDate() + i);
    days.push({ date: d, currentMonth: false });
  }
  return days;
}

function getAssignmentEndDate(assignment: CalAssignment): string {
  const d = new Date(assignment.start_date + "T12:00:00");
  d.setDate(d.getDate() + assignment.total_weeks * 7 - 1);
  return toLocalDateStr(d);
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function MonthlyCalendar({ sessions, assignment, totalSessions, completedSessions }: Props) {
  const { showToast } = useToast();
  const today = toLocalDateStr(new Date());
  const weekMonday = getCurrentWeekMonday();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedSession, setSelectedSession] = useState<CalSession | null>(null);
  const [newDate, setNewDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const days = getCalendarDays(year, month);
  const sessionsByDate: Record<string, CalSession> = {};
  for (const s of sessions) {
    if (s.scheduled_date) sessionsByDate[s.scheduled_date] = s;
  }

  const assignStart = assignment.start_date;
  const assignEnd = getAssignmentEndDate(assignment);

  function isWithinAssignment(dateStr: string) {
    return dateStr >= assignStart && dateStr <= assignEnd;
  }

  function isTrainingDay(date: Date) {
    const dow = date.getDay();
    return assignment.training_days.includes(dow);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function canReschedule(s: CalSession) {
    // Only pending sessions in current week or future
    return s.status === "pending" && s.scheduled_date >= weekMonday;
  }

  function handleCellClick(dateStr: string) {
    const s = sessionsByDate[dateStr];
    if (s && canReschedule(s)) {
      setSelectedSession(s);
      setNewDate(dateStr);
    }
  }

  function handleReschedule() {
    if (!selectedSession || !newDate) return;
    startTransition(async () => {
      const result = await rescheduleSessionAction(selectedSession.id, newDate);
      if (result?.error) showToast(result.error, "error");
      else {
        showToast("Rutina reagendada");
        setSelectedSession(null);
      }
    });
  }

  const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-gray-800">Progreso del ciclo</span>
          <span className="text-brand-600 font-bold">{completedSessions} / {totalSessions}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">{progressPct}% completado</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-500 inline-block" />Completado</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-500 inline-block" />Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400 inline-block" />Descarga</span>
        <span className="flex items-center gap-1.5"><span className="text-[10px]">↻</span>Reagendado</span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-base font-black text-gray-900">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="select-none">
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="text-center text-[11px] font-bold text-gray-400 py-1">{h}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, idx) => {
            const dateStr = toLocalDateStr(day.date);
            const session = sessionsByDate[dateStr];
            const isToday = dateStr === today;
            const withinPeriod = isWithinAssignment(dateStr) && day.currentMonth;
            const isRest = withinPeriod && !session && isTrainingDay(day.date);
            const isRestDay = withinPeriod && !session && !isTrainingDay(day.date);
            const isDeload = session?.is_deload;
            const isRescheduled = !!session?.original_date;
            const clickable = session ? canReschedule(session) : false;

            return (
              <div
                key={idx}
                onClick={() => day.currentMonth && handleCellClick(dateStr)}
                className={cn(
                  "relative flex flex-col items-center justify-start pt-1 pb-1.5 min-h-[56px] rounded-xl transition-colors",
                  !day.currentMonth && "opacity-30",
                  clickable && "cursor-pointer active:scale-95 hover:bg-gray-50",
                  isToday && !session && "ring-2 ring-brand-400 ring-offset-1",
                  isDeload && session?.status !== "completed" && "bg-amber-50",
                )}
              >
                {/* Day number */}
                <span className={cn(
                  "text-[11px] font-semibold leading-none mb-1",
                  isToday ? "text-brand-600 font-black" : "text-gray-400",
                  !day.currentMonth && "text-gray-300",
                )}>
                  {day.date.getDate()}
                </span>

                {/* Session badge */}
                {session && (
                  <div className={cn(
                    "rounded-lg px-1 py-0.5 text-[9px] font-black leading-none text-center w-full max-w-[44px] truncate",
                    session.status === "completed" && !isDeload && "bg-green-500 text-white",
                    session.status === "completed" && isDeload && "bg-amber-400 text-white",
                    session.status !== "completed" && !isDeload && (
                      isToday ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-600"
                    ),
                    session.status !== "completed" && isDeload && "bg-amber-400/70 text-amber-900",
                  )}>
                    {session.name ? session.name.slice(0, 5) : `D${session.cycle_day}`}
                  </div>
                )}

                {/* Deload label */}
                {session && isDeload && !isRescheduled && (
                  <span className="text-[8px] font-bold text-amber-600 leading-none mt-0.5">↓</span>
                )}

                {/* Rescheduled indicator */}
                {session && isRescheduled && (
                  <span className="text-[10px] font-bold text-blue-500 leading-none mt-0.5" title="Reagendado">↻</span>
                )}

                {/* Rest indicator */}
                {(isRest || isRestDay) && (
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1",
                    isRest ? "bg-gray-300" : "bg-gray-200",
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Tocá una rutina pendiente (semana actual o futura) para reagendarla
      </p>

      {/* Reschedule modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl mx-0">
            <h3 className="text-base font-bold text-gray-900">Reagendar rutina</h3>
            <p className="text-sm text-brand-500 font-medium mt-0.5 mb-4">
              {selectedSession.name || `Día ${selectedSession.cycle_day}`}
              {selectedSession.is_deload && " · Semana de descarga"}
              {selectedSession.original_date && (
                <span className="text-blue-400 text-xs ml-1">
                  · Original: {selectedSession.original_date}
                </span>
              )}
            </p>
            <Input
              label="Nueva fecha"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={today}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleReschedule} loading={isPending} className="flex-1">
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setSelectedSession(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
