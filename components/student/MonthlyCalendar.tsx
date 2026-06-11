"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { rescheduleSessionAction } from "@/app/dashboard/my-sessions/actions";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

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

const COLORS = {
  completed: "#3B6D11",
  pending:   "#534AB7",
  deload:    "#854F0B",
  rescheduled: "#444441",
} as const;

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

function getBadgeColor(session: CalSession): string {
  if (session.original_date) return COLORS.rescheduled;
  if (session.is_deload)     return COLORS.deload;
  if (session.status === "completed") return COLORS.completed;
  return COLORS.pending;
}

function getBadgeLabel(session: CalSession): string {
  if (session.name) {
    // Try to extract "Día N" pattern first
    const match = session.name.match(/[Dd]ía\s*(\d+)/);
    if (match) return `Día ${match[1]}`;
    return session.name.slice(0, 6);
  }
  return `Día ${session.cycle_day}`;
}

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
    return assignment.training_days.includes(date.getDay());
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
          <span className="font-bold" style={{ color: COLORS.pending }}>{completedSessions} / {totalSessions}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${COLORS.pending}, #4239A3)` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">{progressPct}% completado</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
        {[
          { color: COLORS.completed,   label: "Completado" },
          { color: COLORS.pending,     label: "Pendiente" },
          { color: COLORS.deload,      label: "Descarga" },
          { color: COLORS.rescheduled, label: "Reagendado" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block flex-shrink-0"
              style={{
                width: 14, height: 14,
                borderRadius: 4,
                background: color,
              }}
            />
            <span style={{ color: "#374151" }}>{label}</span>
          </span>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-black/05 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-base font-black text-gray-900">{MONTH_NAMES[month]} {year}</h2>
        <button
          onClick={nextMonth}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-black/05 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="select-none">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="text-center text-[11px] font-bold py-1" style={{ color: "#888780" }}>{h}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const dateStr = toLocalDateStr(day.date);
            const session = sessionsByDate[dateStr];
            const isToday = dateStr === today;
            const withinPeriod = isWithinAssignment(dateStr) && day.currentMonth;
            const isScheduledTrainingDay = withinPeriod && !session && isTrainingDay(day.date);
            const clickable = session ? canReschedule(session) : false;
            const badgeColor = session ? getBadgeColor(session) : null;

            return (
              <div
                key={idx}
                onClick={() => day.currentMonth && handleCellClick(dateStr)}
                style={{
                  opacity: !day.currentMonth ? 0.3 : 1,
                  cursor: clickable ? "pointer" : "default",
                  border: isToday ? "2px solid #534AB7" : "2px solid transparent",
                  background: isToday ? "rgba(83,74,183,0.08)" : "transparent",
                  borderRadius: 12,
                  minHeight: 62,
                  padding: "4px 2px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
              >
                {/* Day number */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isToday ? 900 : 600,
                    color: isToday ? "#534AB7" : "#888780",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {day.date.getDate()}
                </span>

                {/* Session badge */}
                {session && badgeColor && (
                  <div
                    style={{
                      background: badgeColor,
                      color: "#fff",
                      borderRadius: 8,
                      padding: "3px 5px",
                      fontSize: 9,
                      fontWeight: 900,
                      lineHeight: 1.2,
                      textAlign: "center",
                      width: "100%",
                      maxWidth: 46,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      letterSpacing: "-0.2px",
                    }}
                    title={session.name || `Día ${session.cycle_day}`}
                  >
                    {getBadgeLabel(session)}
                  </div>
                )}

                {/* Rescheduled indicator */}
                {session?.original_date && (
                  <span
                    style={{ fontSize: 10, fontWeight: 800, color: COLORS.rescheduled, lineHeight: 1, marginTop: 2 }}
                    title="Reagendado"
                  >
                    ↻
                  </span>
                )}

                {/* Deload arrow (if not rescheduled) */}
                {session?.is_deload && !session.original_date && (
                  <span
                    style={{ fontSize: 9, fontWeight: 800, color: COLORS.deload, lineHeight: 1, marginTop: 2 }}
                  >
                    ↓desc
                  </span>
                )}

                {/* Dot: scheduled training day with no session (missed / upcoming empty slot) */}
                {isScheduledTrainingDay && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dateStr < today ? "rgba(0,0,0,0.18)" : "rgba(83,74,183,0.25)",
                      marginTop: 4,
                    }}
                  />
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
        <Modal
          title="Reagendar rutina"
          subtitle={[
            selectedSession.name || `Día ${selectedSession.cycle_day}`,
            selectedSession.is_deload ? "Semana de descarga" : null,
          ].filter(Boolean).join(" · ")}
          onClose={() => setSelectedSession(null)}
          zIndex={50}
          maxWidth={400}
        >
          <div className="px-5 py-5 flex flex-col gap-4">
            {selectedSession.original_date && (
              <p className="text-xs text-gray-400">
                Fecha original: {selectedSession.original_date}
              </p>
            )}
            <Input
              label="Nueva fecha"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={today}
            />
            <div className="flex gap-2">
              <Button onClick={handleReschedule} loading={isPending} className="flex-1">
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setSelectedSession(null)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
