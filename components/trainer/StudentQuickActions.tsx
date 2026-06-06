"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  studentId: string;
  studentName: string;
  hasActiveRoutine: boolean;
  unreadMessages: number;
  pendingVideos: number;
}

export function StudentQuickActions({ studentId, studentName, hasActiveRoutine, unreadMessages, pendingVideos }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const hasBadge = unreadMessages > 0 || pendingVideos > 0;

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-colors relative",
          open ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        )}
        aria-label="Acciones rápidas"
      >
        {hasBadge && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
            {unreadMessages + pendingVideos > 9 ? "9+" : unreadMessages + pendingVideos}
          </span>
        )}
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setOpen(false); }} />

          {/* Action sheet */}
          <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 min-w-[200px]">
            <p className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">{studentName}</p>

            {unreadMessages > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); setOpen(false); router.push("/dashboard/chat"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Mensajes</p>
                  <p className="text-xs text-blue-600 font-medium">{unreadMessages} sin leer</p>
                </div>
              </button>
            )}

            {pendingVideos > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); setOpen(false); router.push(`/dashboard/students/${studentId}?tab=correcciones`); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3.5 w-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 9.75v9A2.25 2.25 0 004.5 18.75z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Videos</p>
                  <p className="text-xs text-purple-600 font-medium">{pendingVideos} pendiente{pendingVideos !== 1 ? "s" : ""}</p>
                </div>
              </button>
            )}

            <button
              onClick={(e) => { e.preventDefault(); setOpen(false); router.push(`/dashboard/students/${studentId}`); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <svg className="h-3.5 w-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Ver perfil</p>
            </button>

            {hasActiveRoutine && (
              <button
                onClick={(e) => { e.preventDefault(); setOpen(false); router.push(`/dashboard/students/${studentId}`); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900">Ver rutina activa</p>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
