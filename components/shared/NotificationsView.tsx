"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/dashboard/notifications/actions";
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
    case "session_logged":      return ref ? `/dashboard/students/${ref}` : "/dashboard";
    case "correction_submitted":return "/dashboard/corrections";
    case "correction_reviewed": return "/dashboard/profile?tab=videos";
    case "assignment_completed":return ref ? `/dashboard/students/${ref}` : "/dashboard";
    case "session_rescheduled": return ref ? `/dashboard/students/${ref}` : "/dashboard/calendar";
    case "message_received":    return role === "trainer" && ref ? `/dashboard/chat/${ref}` : "/dashboard/chat";
    case "routine_assigned":    return "/dashboard/my-sessions";
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

export function NotificationsView({ notifications: initialNotifications, userRole = "student" }: { notifications: Notification[]; userRole?: string }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [, startTransition] = useTransition();

  const unreadCount = notifications.filter(n => !n.read).length;

  function handleClick(n: Notification) {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      startTransition(() => { markNotificationReadAction(n.id); });
    }
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    startTransition(() => { markAllNotificationsReadAction(); });
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Notificaciones</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🔔</span>
          <p className="text-sm font-semibold text-gray-700">Sin notificaciones</p>
          <p className="text-xs text-gray-400 mt-1">Acá van a aparecer tus novedades</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={notifUrl(n.type, n.reference_id, userRole)}
              onClick={() => handleClick(n)}
              className={cn(
                "flex items-start gap-3 p-3.5 rounded-2xl transition-all",
                n.read
                  ? "bg-white border border-gray-100 hover:bg-gray-50"
                  : "bg-brand-50 border border-brand-100 hover:bg-brand-100/60"
              )}
            >
              <span className="text-xl leading-none flex-shrink-0 mt-0.5">{ICONS[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm leading-snug",
                  n.read ? "text-gray-600" : "text-gray-900 font-medium"
                )}>
                  {n.message}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {absoluteTime(n.created_at)}
                  <span className="mx-1.5 text-gray-300">·</span>
                  {relativeTime(n.created_at)}
                </p>
              </div>
              {!n.read && (
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
