"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
  clearReadNotificationsAction,
} from "@/app/dashboard/notifications/actions";
import type { Notification } from "@/lib/types";

const ICONS: Record<Notification["type"], string> = {
  session_logged: "💪",
  correction_submitted: "🎥",
  correction_reviewed: "✅",
  assignment_completed: "🏁",
  session_rescheduled: "📅",
  message_received: "💬",
  routine_assigned: "📋",
};

function notifUrl(type: Notification["type"], ref: string | null, role = "student"): string {
  switch (type) {
    case "session_logged":       return ref ? `/dashboard/students/${ref}` : "/dashboard";
    case "correction_submitted": return "/dashboard/corrections";
    case "correction_reviewed":  return "/dashboard/profile?tab=videos";
    case "assignment_completed": return ref ? `/dashboard/students/${ref}` : "/dashboard";
    case "session_rescheduled":  return ref ? `/dashboard/students/${ref}` : "/dashboard/calendar";
    case "message_received":     return role === "trainer" && ref ? `/dashboard/chat/${ref}` : "/dashboard/chat";
    case "routine_assigned":     return "/dashboard/my-sessions";
    default: return "/dashboard/notifications";
  }
}

function absoluteTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const timeStr = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Hoy ${timeStr}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer ${timeStr}`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) + ` ${timeStr}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Swipeable notification row ────────────────────────────────────────────────

function NotifRow({
  n,
  userRole,
  onRead,
  onDelete,
}: {
  n: Notification;
  userRole: string;
  onRead: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // touch swipe state
  const touchStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setSwiped(false);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeOffset(Math.max(dx, -80));
  }
  function onTouchEnd() {
    if (swipeOffset < -40) {
      setSwiped(true);
      setSwipeOffset(-72);
    } else {
      setSwipeOffset(0);
    }
    touchStartX.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete button revealed on swipe */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 rounded-2xl"
        style={{ width: 72, opacity: swiped || swipeOffset < -10 ? 1 : 0, transition: "opacity 0.15s" }}
      >
        <button
          onClick={onDelete}
          className="w-full h-full flex items-center justify-center"
          aria-label="Eliminar"
        >
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Notification content */}
      <div
        style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? "transform 0.2s" : "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative"
      >
        <Link
          href={notifUrl(n.type, n.reference_id, userRole)}
          onClick={onRead}
          className={cn(
            "flex items-start gap-3 p-3.5 rounded-2xl transition-colors",
            n.read
              ? "bg-white border border-gray-100 dark:bg-white/5 dark:border-white/[0.08]"
              : "bg-brand-50 border border-brand-100 dark:bg-brand-500/10 dark:border-brand-500/25"
          )}
          style={{
            backgroundColor: hovered
              ? (n.read ? "rgba(0,0,0,0.04)" : undefined)
              : undefined,
          }}
        >
          <span className="text-xl leading-none flex-shrink-0 mt-0.5">{ICONS[n.type]}</span>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm leading-snug",
              n.read ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-medium"
            )}>
              {n.message}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {absoluteTime(n.created_at)}
              <span className="mx-1.5 text-gray-300">·</span>
              {relativeTime(n.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!n.read && (
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500 mt-1" />
            )}
            {/* X button on desktop hover */}
            {hovered && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                className="h-6 w-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                aria-label="Eliminar"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function NotificationsView({
  notifications: initialNotifications,
  userRole = "student",
}: {
  notifications: Notification[];
  userRole?: string;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [, startTransition] = useTransition();

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  function handleRead(n: Notification) {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      startTransition(() => { markNotificationReadAction(n.id); });
    }
  }

  function handleDelete(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    startTransition(() => { deleteNotificationAction(id); });
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    startTransition(() => { markAllNotificationsReadAction(); });
  }

  function handleClearRead() {
    setNotifications(prev => prev.filter(n => !n.read));
    startTransition(() => { clearReadNotificationsAction(); });
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-4 antialiased">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Notificaciones</h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
            >
              Marcar leídas
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={handleClearRead}
              className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
            >
              Limpiar leídas
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🔔</span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sin notificaciones</p>
          <p className="text-xs text-gray-400 mt-1">Acá van a aparecer tus novedades</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {notifications.map((n) => (
            <NotifRow
              key={n.id}
              n={n}
              userRole={userRole}
              onRead={() => handleRead(n)}
              onDelete={() => handleDelete(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
