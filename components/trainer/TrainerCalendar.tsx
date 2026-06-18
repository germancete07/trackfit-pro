"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TrainerManualSessionModal } from "@/components/trainer/TrainerManualSessionModal";

export interface CalendarSession {
  id: string;
  scheduled_date: string;
  status: "pending" | "active" | "completed";
  student_id: string;
  session_name: string | null;
  routine_day_name: string | null;
  student_name: string;
  student_avatar: string | null;
  completed_at: string | null;
  logged_by_trainer: boolean;
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

const STATUS_STYLE: Record<SessionStatus, { bg: string; text: string; dot: string; label: string }> = {
  completed:     { bg: "#dcfce7", text: "#16a34a", dot: "#16a34a", label: "Completó" },
  today_pending: { bg: "#fef9c3", text: "#b45309", dot: "#b45309", label: "Pendiente" },
  scheduled:     { bg: "#ede9fe", text: "#7c3aed", dot: "#7c3aed", label: "Programado" },
  missed:        { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626", label: "No entrenó" },
};

function getStatus(sess: CalendarSession, today: string): SessionStatus {
  if (sess.status === "completed") return "completed";
  if (sess.scheduled_date < today) return "missed";
  if (sess.scheduled_date === today) return "today_pending";
  return "scheduled";
}

function getDayAggStatus(daySessions: CalendarSession[], today: string): SessionStatus | null {
  if (daySessions.length === 0) return null;
  const statuses = daySessions.map(s => getStatus(s, today));
  if (statuses.every(s => s === "completed")) return "completed";
  if (statuses.every(s => s === "missed")) return "missed";
  const hasFuture = statuses.some(s => s === "scheduled");
  if (hasFuture && !statuses.some(s => s === "completed")) return "scheduled";
  return "today_pending";
}

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
  const startOffset = (first.getDay() + 6) % 7;
  const endOffset = (7 - ((last.getDay() + 6) % 7 + 1)) % 7;
  const dates: string[] = [];
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(first); d.setDate(first.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  for (let d = 1; d <= last.getDate(); d++) {
    dates.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  for (let i = 1; i <= endOffset; i++) {
    const d = new Date(last); d.setDate(last.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  while (dates.length < 42) {
    const last2 = dates[dates.length - 1];
    const d = new Date(last2 + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates.slice(0, 42);
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${FULL_DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function formatTime(isoStr: string | null): string | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// ── Three-dot menu ────────────────────────────────────────────────────────────

interface MenuProps {
  session: CalendarSession;
  date: string;
  top: number;
  left: number;
  onOpenManual: (studentId: string, studentName: string, date: string) => void;
  onClose: () => void;
}

function SessionMenu({ session, date, top, left, onOpenManual, onClose }: MenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onClose]);

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 9999,
        width: 200,
        background: "white",
        borderRadius: 12,
        border: "0.5px solid #e5e7eb",
        boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
        padding: "4px 0",
      }}
    >
      <Link
        href={`/dashboard/students/${session.student_id}?tab=rutina`}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        Ver rutina
      </Link>
      <Link
        href={`/dashboard/chat?student=${session.student_id}`}
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
        Escribir mensaje
      </Link>
      <button
        onClick={() => { onClose(); onOpenManual(session.student_id, session.student_name, date); }}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium w-full text-left transition-colors hover:bg-purple-50"
        style={{ color: "#534AB7", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Cargar sesión manual
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TrainerCalendar({ sessions, currentMonth, today, initialView = "calendar" }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">(initialView);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [manualTarget, setManualTarget] = useState<{ studentId: string; studentName: string; date: string } | null>(null);

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
    setOpenMenuId(null);
  }, [byDate]);

  const selectedSessions = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  function openManual(studentId: string, studentName: string, date: string) {
    setManualTarget({ studentId, studentName, date });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header: month nav + view toggle ─────────────────────────────── */}
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

        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 flex-shrink-0">
          {(["calendar", "list"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {v === "calendar" ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              )}
              {v === "calendar" ? "Calendario" : "Lista"}
            </button>
          ))}
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
              const aggStatus = getDayAggStatus(daySessions, today);
              const aggStyle = aggStatus ? STATUS_STYLE[aggStatus] : null;

              return (
                <div
                  key={date}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "bg-white min-h-[68px] sm:min-h-[80px] p-1.5 flex flex-col gap-1 transition-colors",
                    hasSessions ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : "cursor-default",
                    !isCurrentMonth && "bg-gray-50/60",
                    isSelected && "ring-2 ring-inset ring-brand-400"
                  )}
                  style={isSelected && aggStyle ? { backgroundColor: aggStyle.bg + "60" } : undefined}
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

                  {/* Aggregate status chip */}
                  {aggStyle && (
                    <>
                      {/* Desktop: chip with count */}
                      <div className="hidden sm:flex flex-col gap-0.5 flex-1">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-snug text-center"
                          style={{ backgroundColor: aggStyle.bg, color: aggStyle.text }}
                        >
                          {daySessions.length} {daySessions.length === 1 ? "alumno" : "alumnos"}
                        </span>
                        {/* Completed indicator */}
                        {aggStatus === "completed" && (
                          <span className="text-[9px] text-center font-semibold" style={{ color: aggStyle.text }}>
                            ✓ Todos
                          </span>
                        )}
                        {aggStatus === "today_pending" && daySessions.some(s => getStatus(s, today) === "completed") && (
                          <span className="text-[9px] text-center font-semibold" style={{ color: aggStyle.text }}>
                            {daySessions.filter(s => getStatus(s, today) === "completed").length}/{daySessions.length}
                          </span>
                        )}
                      </div>

                      {/* Mobile: single dot */}
                      <div className="sm:hidden flex justify-center mt-0.5">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: aggStyle.dot }}
                        />
                      </div>
                    </>
                  )}
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

          {/* ── Expanded detail panel (always inline below calendar) ─── */}
          {selectedDate && selectedSessions.length > 0 && (
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{formatDateFull(selectedDate)}</p>
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

              {/* Student list */}
              <div className="flex flex-col divide-y divide-gray-50 dark:divide-white/5">
                {selectedSessions.map(s => {
                  const st = getStatus(s, today);
                  const style = STATUS_STYLE[st];
                  const time = formatTime(s.completed_at);
                  const isMenuOpen = openMenuId === s.id;

                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.student_name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {s.routine_day_name ?? s.session_name ?? "Sin rutina"}
                          {st === "completed" && time && (
                            <span className="ml-1.5 text-green-600 font-semibold">· {time} ✓</span>
                          )}
                          {s.logged_by_trainer && (
                            <span className="ml-1.5 text-brand-500 font-semibold">· Cargado por vos</span>
                          )}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-flex"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>

                      {/* Three-dot menu */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (openMenuId === s.id) { setOpenMenuId(null); return; }
                          const r = e.currentTarget.getBoundingClientRect();
                          const mw = 200; const mh = 130;
                          setMenuPos({
                            top: window.innerHeight - r.bottom < mh + 8 ? r.top - mh - 4 : r.bottom + 4,
                            left: Math.min(r.right - mw, window.innerWidth - mw - 8),
                          });
                          setOpenMenuId(s.id);
                        }}
                        className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        title="Opciones"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {isMenuOpen && (
                        <SessionMenu session={s} date={selectedDate!} top={menuPos.top} left={menuPos.left} onOpenManual={openManual} onClose={() => setOpenMenuId(null)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="flex flex-col gap-4">
          {(() => {
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
                      const time = formatTime(s.completed_at);
                      const isMenuOpen = openMenuId === s.id;
                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border bg-white dark:bg-white/5 px-3.5 py-2.5",
                            st === "completed" ? "border-green-100 dark:border-green-500/20" : "border-gray-200 dark:border-white/10"
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
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.student_name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {s.routine_day_name ?? s.session_name ?? "—"}
                              {st === "completed" && time && <span className="ml-1 text-green-600 font-semibold">· {time}</span>}
                            </p>
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: style.bg, color: style.text }}
                          >
                            {style.label}
                          </span>
                          {/* Three-dot menu */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (openMenuId === s.id) { setOpenMenuId(null); return; }
                              const r = e.currentTarget.getBoundingClientRect();
                              const mw = 200; const mh = 130;
                              setMenuPos({
                                top: window.innerHeight - r.bottom < mh + 8 ? r.top - mh - 4 : r.bottom + 4,
                                left: Math.min(r.right - mw, window.innerWidth - mw - 8),
                              });
                              setOpenMenuId(s.id);
                            }}
                            className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {isMenuOpen && (
                            <SessionMenu session={s} date={date} top={menuPos.top} left={menuPos.left} onOpenManual={openManual} onClose={() => setOpenMenuId(null)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── Manual session modal ──────────────────────────────────────── */}
      {manualTarget && (
        <TrainerManualSessionModal
          studentId={manualTarget.studentId}
          studentName={manualTarget.studentName}
          defaultDate={manualTarget.date}
          onClose={() => setManualTarget(null)}
        />
      )}
    </div>
  );
}
