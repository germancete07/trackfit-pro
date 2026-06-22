"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrainerManualSessionModal } from "./TrainerManualSessionModal";
import { archiveStudentAction } from "@/app/dashboard/students/actions";

export interface StudentRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: "green" | "yellow" | "gray" | "red";
  subText: string;
  subClass: string;
}

const DOT: Record<StudentRow["status"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-300",
  red: "bg-red-500",
};

type MenuState = { id: string; top: number; left: number } | null;

export function ActiveStudentList({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuState>(null);
  const [showManual, setShowManual] = useState<string | null>(null);

  // Close menu on any click that reaches document (delayed one tick to avoid self-close)
  useEffect(() => {
    if (!menu) return;
    let removeListener: (() => void) | null = null;
    const timerId = setTimeout(() => {
      const handler = () => setMenu(null);
      document.addEventListener("click", handler, { once: true });
      removeListener = () => document.removeEventListener("click", handler);
    }, 0);
    return () => {
      clearTimeout(timerId);
      removeListener?.();
    };
  }, [menu?.id]);

  function openMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    if (menu?.id === id) { setMenu(null); return; }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 210; const H = 260;
    const top = window.innerHeight - r.bottom < H + 8 ? r.top - H - 4 : r.bottom + 4;
    const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
    setMenu({ id, top, left });
  }

  async function archiveStudent(id: string, name: string) {
    setMenu(null);
    if (!confirm(`¿Archivar a ${name}?`)) return;
    await archiveStudentAction(id, true);
    router.refresh();
  }

  const manualStudent = students.find(s => s.id === showManual);

  const menuPortal = menu && typeof document !== "undefined" ? createPortal(
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed",
        top: menu.top,
        left: menu.left,
        zIndex: 99999,
        width: 210,
        background: "white",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}
    >
      <MenuItem
        label="👤 Ver perfil"
        onClick={() => { setMenu(null); router.push(`/dashboard/students/${menu.id}`); }}
      />
      <MenuItem
        label="📋 Registrar sesión"
        onClick={() => { setShowManual(menu.id); setMenu(null); }}
      />
      <MenuItem
        label="💬 Enviar mensaje"
        onClick={() => { setMenu(null); router.push(`/dashboard/chat?student=${menu.id}`); }}
      />
      <MenuItem
        label="📅 Asignar rutina"
        onClick={() => { setMenu(null); router.push(`/dashboard/routines?assignTo=${menu.id}`); }}
      />
      <div style={{ height: 1, background: "#f3f4f6" }} />
      <MenuItem
        label="🗃️ Archivar alumno"
        danger
        onClick={() => archiveStudent(menu.id, students.find(s => s.id === menu.id)?.full_name ?? "")}
      />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        {students.map(s => (
          <Card key={s.id} padding="sm" className="flex items-center gap-3">
            <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative h-10 w-10 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {s.avatar_url
                  ? <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
                  : <span className="text-brand-600 font-bold">{s.full_name?.charAt(0).toUpperCase() ?? "?"}</span>}
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${DOT[s.status]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</p>
                <p className={`text-xs font-medium truncate ${s.subClass}`}>{s.subText}</p>
              </div>
            </Link>
            <button
              onClick={e => openMenu(e, s.id)}
              style={{ touchAction: "manipulation", cursor: "pointer", background: "none", border: "none", padding: "8px", fontSize: 20, lineHeight: 1, color: menu?.id === s.id ? "#534AB7" : "#9ca3af" }}
              aria-label="Opciones"
            >
              ⋮
            </button>
          </Card>
        ))}
      </div>

      {menuPortal}

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

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "11px 16px",
        fontSize: 14,
        color: danger ? "#E24B4A" : "#111827",
        background: "none",
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      {label}
    </button>
  );
}
