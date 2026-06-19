"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrainerManualSessionModal } from "./TrainerManualSessionModal";
import { archiveStudentAction } from "@/app/dashboard/students/actions";

interface StudentRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: "green" | "yellow" | "gray" | "red";
  subText: string;
  subClass: string;
}

const STATUS_DOT: Record<StudentRow["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-300",
  red: "bg-red-500",
};

export function ActiveStudentList({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showManual, setShowManual] = useState<string | null>(null); // studentId

  const openMenu = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setActiveMenu(activeMenu === studentId ? null : studentId);
  };

  async function handleArchive(studentId: string, name: string) {
    setActiveMenu(null);
    if (!confirm(`¿Archivar a ${name}?`)) return;
    await archiveStudentAction(studentId, true);
    router.refresh();
  }

  const manualStudent = students.find(s => s.id === showManual);

  return (
    <>
      <div className="flex flex-col gap-2">
        {students.map((s) => (
          <Card key={s.id} padding="sm" className="flex items-center gap-3">
            <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-brand-600 font-bold">{s.full_name?.charAt(0).toUpperCase() ?? "?"}</span>
                )}
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${STATUS_DOT[s.status]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</p>
                <p className={`text-xs font-medium truncate ${s.subClass}`}>{s.subText}</p>
              </div>
            </Link>
            <button
              onClick={(e) => openMenu(e, s.id)}
              style={{ cursor: "pointer", background: "none", border: "none", padding: "8px", fontSize: "20px", lineHeight: 1, color: "#9ca3af" }}
            >
              ⋮
            </button>
          </Card>
        ))}
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
            right: menuPos.right,
            zIndex: 9999,
            background: "white",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            minWidth: "180px",
            overflow: "hidden",
          }}>
            <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { router.push(`/dashboard/students/${activeMenu}`); setActiveMenu(null); }}>
              👤 Ver perfil
            </div>
            <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { setShowManual(activeMenu); setActiveMenu(null); }}>
              📋 Registrar sesión
            </div>
            <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { router.push(`/dashboard/chat?student=${activeMenu}`); setActiveMenu(null); }}>
              💬 Enviar mensaje
            </div>
            <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14 }}
              onClick={() => { router.push(`/dashboard/routines?assignTo=${activeMenu}`); setActiveMenu(null); }}>
              📅 Asignar rutina
            </div>
            <div style={{ height: 1, background: "#f3f4f6" }} />
            <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#E24B4A" }}
              onClick={() => handleArchive(activeMenu!, students.find(s => s.id === activeMenu)?.full_name ?? "")}>
              🗃️ Archivar
            </div>
          </div>
        </>
      )}

      {showManual && manualStudent && (
        <TrainerManualSessionModal
          studentId={manualStudent.id}
          studentName={manualStudent.full_name}
          defaultDate={new Date().toISOString().split("T")[0]}
          onClose={() => setShowManual(null)}
        />
      )}
    </>
  );
}
