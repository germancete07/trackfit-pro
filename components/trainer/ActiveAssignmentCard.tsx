"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { cancelAssignmentAction } from "@/app/dashboard/routines/assign/[templateId]/actions";

interface Assignment {
  id: string;
  start_date: string;
  training_days: number[];
  total_weeks: number;
  deload_every_weeks: number | null;
  template_id: string;
  session_templates?: { name: string } | null;
}

interface Props {
  assignment: Assignment | null;
  progress: { total: number; completed: number } | null;
  studentId: string;
  templateId?: string;
}

const DAY_LABELS: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function getEndDate(startDate: string, totalWeeks: number) {
  const d = new Date(startDate + "T12:00:00");
  d.setDate(d.getDate() + totalWeeks * 7 - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day)} ${months[d.getMonth()]} ${y}`;
}

export function ActiveAssignmentCard({ assignment, progress, studentId, templateId }: Props) {
  const { showToast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  if (!assignment) {
    return (
      <Card padding="md" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Asignación activa</h2>
          {templateId && (
            <Link href={`/dashboard/routines/assign/${templateId}?student=${studentId}`}>
              <Button size="sm" variant="secondary">Asignar rutina</Button>
            </Link>
          )}
        </div>
        <p className="text-xs text-gray-400">Sin rutina asignada actualmente.</p>
        <Link href="/dashboard/routines">
          <Button size="sm" className="w-full">Ir a Rutinas para asignar</Button>
        </Link>
      </Card>
    );
  }

  const routineName = (assignment.session_templates as { name?: string } | null)?.name ?? "Rutina";
  const pct = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const sortedDays = [...assignment.training_days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

  async function handleCancel() {
    if (!confirm("¿Cancelar la asignación activa? Las rutinas pendientes no se eliminarán.")) return;
    setCancelling(true);
    const r = await cancelAssignmentAction(assignment!.id, studentId);
    setCancelling(false);
    if (r?.error) showToast(r.error, "error");
    else showToast("Asignación cancelada");
  }

  return (
    <Card padding="md" className="flex flex-col gap-3 border-brand-200 bg-brand-50/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
            <h2 className="text-sm font-bold text-gray-700">Asignación activa</h2>
          </div>
          <p className="text-base font-black text-gray-900 mt-0.5 truncate">{routineName}</p>
        </div>
        <Link href={`/dashboard/routines/assign/${assignment.template_id}?student=${studentId}`}>
          <Button size="sm" variant="secondary">Cambiar</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>
          {formatDate(assignment.start_date)} → {getEndDate(assignment.start_date, assignment.total_weeks)}
        </span>
        <span>{assignment.total_weeks} semanas</span>
        {assignment.deload_every_weeks && (
          <span>Descarga c/{assignment.deload_every_weeks} sem</span>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        {sortedDays.map(d => (
          <span key={d} className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
            {DAY_LABELS[d]}
          </span>
        ))}
      </div>

      {progress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Progreso</span>
            <span className="font-bold text-gray-800">{progress.completed} / {progress.total} rutinas</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <Button
        variant="ghost" size="sm"
        loading={cancelling}
        onClick={handleCancel}
        className="text-red-400 hover:text-red-600 hover:bg-red-50 self-start"
      >
        Cancelar asignación
      </Button>
    </Card>
  );
}
