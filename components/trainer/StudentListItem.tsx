"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrainerManualSessionModal } from "./TrainerManualSessionModal";
import { archiveStudentAction } from "@/app/dashboard/students/actions";

interface StudentData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: "green" | "yellow" | "gray" | "red";
  subText: string;
  subClass: string;
}

const STATUS_DOT: Record<StudentData["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-300",
  red: "bg-red-500",
};

export function StudentListItem({ student }: { student: StudentData }) {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [showManual, setShowManual] = useState(false);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 220;
    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;
    if (top + menuHeight > window.innerHeight) top = rect.top - menuHeight - 4;
    if (left < 0) left = 0;
    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
    setMenuPos({ top, left });
    setActiveMenu(activeMenu === student.id ? null : student.id);
  };

  async function handleArchive() {
    setActiveMenu(null);
    if (!confirm(`¿Archivar a ${student.full_name}?`)) return;
    await archiveStudentAction(student.id, true);
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
          onClick={openMenu}
          style={{ cursor: "pointer", background: "none", border: "none", padding: "8px", fontSize: "20px", lineHeight: 1, color: "#9ca3af" }}
        >
          ⋮
        </button>
      </div>

      {activeMenu && (
        <>
          <div
            onClick={() => setActiveMenu(null)}
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
          />
          <div style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999,
            background: "white",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            minWidth: "180px",
            overflow: "hidden",
          }}>
            <div
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { router.push(`/dashboard/students/${student.id}`); setActiveMenu(null); }}
            >👤 Ver perfil</div>
            <div
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { setActiveMenu(null); setShowManual(true); }}
            >📋 Registrar sesión</div>
            <div
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { router.push(`/dashboard/chat?student=${student.id}`); setActiveMenu(null); }}
            >💬 Enviar mensaje</div>
            <div
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { router.push(`/dashboard/routines?assignTo=${student.id}`); setActiveMenu(null); }}
            >📅 Asignar rutina</div>
            <div style={{ height: 1, background: "#f3f4f6" }} />
            <div
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#E24B4A" }}
              onClick={handleArchive}
            >🗃️ Archivar</div>
          </div>
        </>
      )}

      {showManual && (
        <TrainerManualSessionModal
          studentId={student.id}
          studentName={student.full_name}
          defaultDate={new Date().toISOString().split("T")[0]}
          onClose={() => setShowManual(false)}
        />
      )}
    </>
  );
}
