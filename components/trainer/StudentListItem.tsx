"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrainerManualSessionModal } from "./TrainerManualSessionModal";
import { archiveStudentAction } from "@/app/dashboard/students/actions";

interface StudentWithStatus {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: "green" | "yellow" | "gray" | "red";
  subText: string;
  subClass: string;
}

const STATUS_DOT: Record<StudentWithStatus["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-300",
  red: "bg-red-500",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function StudentListItem({ student }: { student: StudentWithStatus }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [showManual, setShowManual] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 260;
    const top = (window.innerHeight - rect.bottom < menuHeight + 8)
      ? rect.top - menuHeight - 4
      : rect.bottom + 4;
    const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
    setMenuPos({ top, left });
    setOpen(true);
  }

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    if (!confirm(`¿Archivar a ${student.full_name}? El alumno dejará de aparecer en tu lista activa.`)) return;
    setArchiving(true);
    await archiveStudentAction(student.id, true);
    setArchiving(false);
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/dashboard/students/${student.id}`} className="flex-1 min-w-0">
          <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
            <div className="h-9 w-9 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
              {student.avatar_url
                ? <img src={student.avatar_url} alt={student.full_name} className="h-full w-full object-cover" />
                : <span className="text-brand-600 text-sm font-bold">{student.full_name?.charAt(0).toUpperCase() ?? "?"}</span>}
              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT[student.status]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{student.full_name}</p>
              <p className={`text-xs font-medium truncate ${student.subClass}`}>{student.subText}</p>
            </div>
            <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Card>
        </Link>

        <button
          ref={btnRef}
          type="button"
          onClick={handleMenuClick}
          disabled={archiving}
          className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Más opciones"
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999,
            width: 200,
            background: "white",
            borderRadius: 12,
            border: "0.5px solid #e5e7eb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.14)",
            padding: "4px 0",
          }}
        >
          <MenuItem href={`/dashboard/students/${student.id}`} onClick={() => setOpen(false)} icon={<UserIcon />} label="Ver perfil" />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setOpen(false); setShowManual(true); }}
            className={itemCls}
          >
            <span className="text-brand-500 flex-shrink-0"><EditIcon /></span>
            Registrar sesión
          </button>
          <MenuItem href={`/dashboard/chat?student=${student.id}`} onClick={() => setOpen(false)} icon={<ChatIcon />} label="Enviar mensaje" />
          <MenuItem href={`/dashboard/routines?assignTo=${student.id}`} onClick={() => setOpen(false)} icon={<RoutineIcon />} label="Asignar rutina" />
          <div style={{ height: 1, background: "#f3f4f6", margin: "4px 8px" }} />
          <button
            type="button"
            onClick={handleArchive}
            className={`${itemCls} !text-red-500 hover:!bg-red-50`}
          >
            <ArchiveIcon />
            Archivar alumno
          </button>
        </div>
      )}

      {showManual && (
        <TrainerManualSessionModal
          studentId={student.id}
          studentName={student.full_name}
          defaultDate={todayStr()}
          onClose={() => setShowManual(false)}
        />
      )}
    </>
  );
}

const itemCls = "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left" as const;

function MenuItem({ href, onClick, icon, label }: { href: string; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

function UserIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
}
function EditIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
}
function ChatIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>;
}
function RoutineIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>;
}
function ArchiveIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
}
