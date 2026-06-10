"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CalendarSession {
  id: string;
  scheduled_date: string;
  status: "pending" | "active" | "completed";
  student_id: string;
  routine_day_name: string | null;
  student_name: string;
  student_avatar: string | null;
}

interface Props {
  sessions: CalendarSession[];
  currentMonth: string; // "YYYY-MM"
  today: string;        // "YYYY-MM-DD"
  initialView?: "calendar" | "list";
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAYS_ES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const FULL_DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

type SessionStatus = "completed" | "today_pending" | "scheduled" | "missed";

function getStatus(sess: CalendarSession, today: string): SessionStatus {
  if (sess.status === "completed") return "completed";
  if (sess.scheduled_date < today) return "missed";
  if (sess.scheduled_date === today) return "today_pending";
  return "scheduled";
}

const STATUS_STYLE: Record<SessionStatus, { bg: string; text: string; dot: string; label: string }> = {
  completed:     { bg: "#dcfce7", text: "#16a34a", dot: "#16a34a", label: "Completó" },
  today_pending: { bg: "#fef9c3", text: "#b45309", dot: "#b45309", label: "Pendiente hoy" },
  scheduled:     { bg: "#ede9fe", text: "#7c3aed", dot: "#7c3aed", label: "Programado" },
  missed:        { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626", label: "No entrenó" },
};

function monthStr(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? monthStr(y - 1, 12) : monthStr(y, m - 1);
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? monthStr(y + 1, 1) : monthStr(y, m + 1);
}

function buildGrid(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  // Monday-first: getDay() 0=Sun → 6, 1=Mon → 0, ...
  const startOffset = (first.getDay() + 6) % 7; // 0=Mon ... 6=Sun
  const endOffset = (7 - ((last.getDay() + 6) % 7 + 1)) % 7;

  const dates: string[] = [];
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  for (let d = 1; d <= last.getDate(); d++) {
    dates.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  for (let i = 1; i <= endOffset; i++) {
    const d = new Date(last);
    d.setDate(last.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  // ensure 6 rows × 7 = 42 cells
  while (dates.length < 42) {
    const last2 = dates[dates.length - 1];
    const d = new Date(last2 + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates.slice(0, 42);
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${FULL_DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function abbreviate(name: string, maxLen = 9) {
  const parts = name.trim().split(" ");
  if (parts[0].length <= maxLen) return parts[0];
  return parts[0].slice(0, maxLen - 1) + "…";
}

export function TrainerCalendar({ sessions, currentMonth, today, initialView = "calendar" }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">(initialView);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group sessions by date
  const byDate = new Map<string, CalendarSession[]>();
  for (const s of sessions) {
    const arr = byDate.get(s.scheduled_date) ?? [];
    arr.push(s);
    byDate.set(s.scheduled_date, arr);
  }

  const [ym_y, ym_m] = currentMonth.split("-").map(Number);
  const grid = buildGrid(currentMonth);

  function goMonth(ym: string) {
    router.push(`/dashboard/calendar?month=${ym}`);
    setSelectedDate(null);
  }

  const handleDayClick = useCallback((date: string) => {
    const hasSessions = (byDate.get(date)?.length ?? 0) > 0;
    if (!hasSessions) return;
    setSelectedDate(prev => prev === date ? null : date);
  }, [byDate]);

  const selectedSessions = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  // ── Calendar grid ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Header: month nav + view toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goMonth(prevMonth(currentMonth))}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-base font-black text-gray-900 min-w-[160px] text-center">
            {MONTHS_ES[ym_m - 1]} {ym_y}
          </h2>
          <button
            onClick={() => goMonth(nextMonth(currentMonth))}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          {currentMonth !== today.slice(0, 7) && (
            <button
              onClick={() => goMonth(today.slice(0, 7))}
              className="text-xs font-semibold text-brand-600 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 transition-colors ml-1"
            >
              Hoy
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 flex-shrink-0">
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12zm0 3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm-3-6h.008v.008H9V12zm0 3h.008v.008H9v-.008zm0 3h.008v.008H9v-.008zm6-6h.008v.008h-.008V12zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            Calendario
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Lista
          </button>
        </div>
      </div>

      {/* ── CALENDAR VIEW ─────────────────────────────────────────────── */}
      {view === "calendar" && (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
            {grid.map(date => {
              const isCurrentMonth = date.slice(0, 7) === currentMonth;
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const daySessions = byDate.get(date) ?? [];
              const dayNum = parseInt(date.split("-")[2]);
              const hasSessions = daySessions.length > 0;

              return (
                <div
                  key={date}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "bg-white min-h-[72px] sm:min-h-[88px] p-1.5 flex flex-col gap-1 transition-colors",
                    hasSessions ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : "cursor-default",
                    !isCurrentMonth && "bg-gray-50/60",
                    isSelected && "ring-2 ring-inset ring-brand-400 bg-brand-50/30"
                  )}
                >
                  {/* Day number */}
                  <div className="flex justify-end">
                    <span className={cn(
                      "text-xs font-bold leading-none h-5 w-5 flex items-center justify-center rounded-full transition-colors",
                      isToday ? "bg-brand-600 text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-300"
                    )}>
                      {dayNum}
                    </span>
                  </div>

                  {/* Desktop chips */}
                  <div className="hidden sm:flex flex-col gap-0.5 flex-1">
                    {daySessions.slice(0, 2).map(s => {
                      const st = getStatus(s, today);
                      const style = STATUS_STYLE[st];
                      return (
                        <span
                          key={s.id}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate leading-snug"
                          style={{ backgroundColor: style.bg, color: style.text }}
                          title={s.student_name}
                        >
                          {abbreviate(s.student_name)}
                        </span>
                      );
                    })}
                    {daySessions.length > 2 && (
                      <span className="text-[10px] font-semibold text-gray-400 pl-1">
                        +{daySessions.length - 2} más
                      </span>
                    )}
                  </div>

                  {/* Mobile dots */}
                  <div className="sm:hidden flex flex-wrap gap-0.5 justify-center mt-0.5">
                    {daySessions.slice(0, 5).map(s => {
                      const st = getStatus(s, today);
                      const style = STATUS_STYLE[st];
                      return (
                        <span
                          key={s.id}
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: style.dot }}
                        />
                      );
                    })}
                    {daySessions.length > 5 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold">
            {Object.entries(STATUS_STYLE).map(([key, style]) => (
              <span key={key} className="flex items-center gap-1.5 text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
                {style.label}
              </span>
            ))}
          </div>

          {/* ── Detail panel (desktop: inline, mobile: bottom sheet) ──── */}
          {selectedDate && (
            <>
              {/* Mobile bottom sheet backdrop */}
              <div
                className="fixed inset-0 z-30 bg-black/30 sm:hidden"
                onClick={() => setSelectedDate(null)}
              />

              {/* Panel */}
              <div className={cn(
                "bg-white rounded-2xl border border-gray-200 shadow-lg",
                // Mobile: fixed bottom sheet
                "fixed inset-x-0 bottom-0 z-40 rounded-b-none sm:rounded-2xl",
                // Desktop: relative inline
                "sm:relative sm:inset-auto sm:z-auto sm:shadow-none sm:border-brand-200 sm:bg-brand-50/20"
              )}>
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-black text-gray-900">{formatDateFull(selectedDate)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedSessions.length} alumno{selectedSessions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Session list */}
                <div className="flex flex-col divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {selectedSessions.map(s => {
                    const st = getStatus(s, today);
                    const style = STATUS_STYLE[st];
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.student_avatar ? (
                            <img src={s.student_avatar} alt={s.student_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-brand-600 font-bold text-sm">
                              {s.student_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.student_name}</p>
                          {s.routine_day_name && (
                            <p className="text-xs text-gray-400 truncate">{s.routine_day_name}</p>
                          )}
                        </div>

                        {/* Status badge */}
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0">
                          {st === "completed" && (
                            <Link
                              href={`/dashboard/chat?student=${s.student_id}`}
                              className="h-8 px-2.5 flex items-center text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors gap-1"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                              </svg>
                              Escribir
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/students/${s.student_id}`}
                            className="h-8 px-2.5 flex items-center text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Ver
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="flex flex-col gap-4">
          {(() => {
            // Show sessions for current month, sorted by date
            const sorted = [...sessions].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
            const grouped: Record<string, CalendarSession[]> = {};
            for (const s of sorted) {
              if (!grouped[s.scheduled_date]) grouped[s.scheduled_date] = [];
              grouped[s.scheduled_date].push(s);
            }
            const dates = Object.keys(grouped).sort();

            if (dates.length === 0) {
              return (
                <div className="text-center py-14 flex flex-col items-center gap-2">
                  <p className="text-2xl">📅</p>
                  <p className="text-sm font-semibold text-gray-700">Sin rutinas este mes</p>
                  <p className="text-xs text-gray-400">No hay sesiones programadas en {MONTHS_ES[ym_m - 1].toLowerCase()} {ym_y}.</p>
                </div>
              );
            }

            return dates.map(date => {
              const daySessions = grouped[date]!;
              const isToday = date === today;
              const isPast = date < today;
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-sm font-bold",
                      isToday ? "text-brand-600" : isPast ? "text-gray-400" : "text-gray-900"
                    )}>
                      {isToday ? "Hoy — " : ""}{formatDateFull(date)}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">{daySessions.length} rutina{daySessions.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {daySessions.map(s => {
                      const st = getStatus(s, today);
                      const style = STATUS_STYLE[st];
                      return (
                        <Link
                          key={s.id}
                          href={`/dashboard/students/${s.student_id}`}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-2.5 hover:bg-gray-50 transition-colors",
                            st === "completed" ? "border-green-100" : "border-gray-200"
                          )}
                        >
                          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {s.student_avatar ? (
                              <img src={s.student_avatar} alt={s.student_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-brand-600 font-bold text-xs">
                                {s.student_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.student_name}</p>
                            {s.routine_day_name && (
                              <p className="text-xs text-gray-400 truncate">{s.routine_day_name}</p>
                            )}
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: style.bg, color: style.text }}
                          >
                            {style.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
