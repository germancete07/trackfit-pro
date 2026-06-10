"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { markNotificationReadAction } from "@/app/dashboard/notifications/actions";
import type { Notification } from "@/lib/types";

interface Props {
  count: number;
  notifications: Notification[];
  userRole?: string;
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
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
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

const ICONS: Record<Notification["type"], string> = {
  session_logged: "💪",
  correction_submitted: "🎥",
  correction_reviewed: "✅",
  assignment_completed: "🏁",
  session_rescheduled: "📅",
  message_received: "💬",
  routine_assigned: "📋",
};

export function NotificationBell({ count, notifications, userRole = "student" }: Props) {
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [unread, setUnread] = useState(count);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalNotifs(notifications);
    setUnread(count);
  }, [notifications, count]);

  // Calculate panel position relative to the button so it's always visible
  const calcPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panelW = 320;
    const margin = 8;
    const vw = window.innerWidth;

    // On mobile (< 640px): full-width panel pinned below topbar
    if (vw < 640) {
      setPanelStyle({ top: "3.75rem", left: margin, right: margin });
      return;
    }

    // Desktop: open to the right of the button, fall back to left if not enough room
    let left = rect.right + margin;
    if (left + panelW > vw - margin) {
      // not enough room on right → open to the left of the button
      left = rect.left - panelW - margin;
    }
    // Clamp vertically so panel doesn't go below viewport
    const top = Math.min(rect.bottom + margin, window.innerHeight - 400);

    setPanelStyle({ top, left, width: panelW });
  }, []);

  useEffect(() => {
    if (open) calcPosition();
  }, [open, calcPosition]);

  useEffect(() => {
    function handleClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideButton && !insidePanel) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("touchstart", handleClick);
      window.addEventListener("resize", calcPosition);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      window.removeEventListener("resize", calcPosition);
    };
  }, [open, calcPosition]);

  function handleItemClick(n: Notification) {
    setOpen(false);
    if (!n.read) {
      setLocalNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
      startTransition(() => { markNotificationReadAction(n.id); });
    }
  }

  return (
    <>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          "relative h-8 w-8 rounded-full flex items-center justify-center transition-colors",
          unread > 0 ? "text-brand-500 bg-brand-50 hover:bg-brand-100" : "text-gray-400 hover:bg-gray-100"
        )}
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel — fixed, positioned dynamically to always be visible */}
      {open && (
        <div
          ref={panelRef}
          style={{ ...panelStyle, background: "var(--surface-elevated)", border: "0.5px solid var(--surface-elevated-border)" }}
          className="fixed z-[200] shadow-2xl rounded-2xl overflow-hidden antialiased"
        >
          <NotifPanel
            notifs={localNotifs}
            unread={unread}
            userRole={userRole}
            onItemClick={handleItemClick}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}

function NotifPanel({
  notifs,
  unread,
  userRole,
  onItemClick,
  onClose,
}: {
  notifs: Notification[];
  unread: number;
  userRole: string;
  onItemClick: (n: Notification) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {unread} nueva{unread > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={onClose} className="h-6 w-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm text-gray-400">Sin notificaciones</p>
          </div>
        ) : (
          notifs.map((n) => (
            <Link
              key={n.id}
              href={notifUrl(n.type, n.reference_id, userRole)}
              onClick={() => onItemClick(n)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100",
                !n.read && "bg-brand-50/50"
              )}
            >
              <span className="text-lg leading-none flex-shrink-0 mt-0.5">{ICONS[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-snug", n.read ? "text-gray-600" : "text-gray-900 font-medium")}>
                  {n.message}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{absoluteTime(n.created_at)} · {relativeTime(n.created_at)}</p>
              </div>
              {!n.read && <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="block text-center text-xs font-semibold text-brand-500 hover:text-brand-600"
        >
          Ver todas →
        </Link>
      </div>
    </>
  );
}
