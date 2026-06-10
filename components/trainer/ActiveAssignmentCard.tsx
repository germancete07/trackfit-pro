"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { cancelAssignmentAction, regenerateSessionsAction } from "@/app/dashboard/routines/assign/[templateId]/actions";

interface RoutineDayInfo {
  id: string;
  day_number: number;
  name: string;
  sort_order: number;
  template_exercises?: { id: string; name: string; sort_order: number; superset_group: string | null }[];
}

interface Assignment {
  id: string;
  start_date: string;
  training_days: number[];
  total_weeks: number;
  deload_every_weeks: number | null;
  template_id: string;
  session_templates?: { id?: string; name: string; training_type?: string | null } | null;
}

interface Props {
  assignment: Assignment | null;
  progress: { total: number; completed: number } | null;
  studentId: string;
  templateId?: string;
  routineDays?: RoutineDayInfo[];
}

const DAY_LABELS: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
};

const TRAINING_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  adaptacion:  { label: "Adaptación",  color: "#16a34a", bg: "#dcfce7" },
  fuerza:      { label: "Fuerza",      color: "#b45309", bg: "#fef3c7" },
  hipertrofia: { label: "Hipertrofia", color: "#7c3aed", bg: "#ede9fe" },
  resistencia: { label: "Resistencia", color: "#0369a1", bg: "#e0f2fe" },
  funcional:   { label: "Funcional",   color: "#0f766e", bg: "#ccfbf1" },
  otro:        { label: "Otro",        color: "#6b7280", bg: "#f3f4f6" },
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function getEndDate(startDate: string, totalWeeks: number) {
  const d = new Date(startDate + "T12:00:00");
  d.setDate(d.getDate() + totalWeeks * 7 - 1);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function ActiveAssignmentCard({ assignment, progress, studentId, templateId, routineDays }: Props) {
  const { showToast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const template = assignment.session_templates as { id?: string; name: string; training_type?: string | null } | null;
  const routineName = template?.name ?? "Rutina";
  const trainingType = template?.training_type ?? null;
  const typeInfo = trainingType ? TRAINING_TYPE_LABELS[trainingType] : null;

  const pct = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const sortedDays = [...assignment.training_days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  const sortedRoutineDays = (routineDays ?? []).slice().sort((a, b) => a.day_number - b.day_number);

  async function handleCancel() {
    if (!confirm("¿Cancelar la asignación activa? Las rutinas pendientes se cancelarán.")) return;
    setCancelling(true);
    const r = await cancelAssignmentAction(assignment!.id, studentId);
    setCancelling(false);
    if (r?.error) showToast(r.error, "error");
    else showToast("Asignación cancelada");
  }

  async function handleRegenerate() {
    if (!confirm("¿Regenerar todas las sesiones pendientes? Esto corrige la rotación de días y la descarga.\n\nLas sesiones completadas no se tocan.")) return;
    setRegenerating(true);
    const r = await regenerateSessionsAction(assignment!.id, studentId);
    setRegenerating(false);
    if ("error" in r) showToast(r.error, "error");
    else showToast(`✓ ${r.generated} sesiones regeneradas correctamente`);
  }

  return (
    <Card padding="md" className="flex flex-col gap-4 border-brand-200 bg-brand-50/30">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
            <span className="text-xs font-semibold text-green-700">Rutina activa</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-black text-gray-900">{routineName}</p>
            {typeInfo && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: typeInfo.color, background: typeInfo.bg }}
              >
                {typeInfo.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
          <Link href={`/dashboard/templates/${assignment.template_id}/edit`}>
            <Button size="sm" variant="secondary" className="w-full">Editar rutina</Button>
          </Link>
          <Link href={`/dashboard/routines?assignTo=${studentId}`}>
            <Button size="sm" variant="secondary" className="w-full">Cambiar</Button>
          </Link>
        </div>
      </div>

      {/* Period + days */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
          <span>{formatDate(assignment.start_date)} → {getEndDate(assignment.start_date, assignment.total_weeks)}</span>
          <span className="text-gray-300">·</span>
          <span>{assignment.total_weeks} semanas</span>
          {assignment.deload_every_weeks && (
            <>
              <span className="text-gray-300">·</span>
              <span>Descarga c/{assignment.deload_every_weeks} sem</span>
            </>
          )}
        </div>

        {/* Training days chips */}
        <div className="flex gap-1 flex-wrap">
          {sortedDays.map(d => (
            <span key={d} className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
              {DAY_LABELS[d]}
            </span>
          ))}
        </div>
      </div>

      {/* Routine days breakdown */}
      {sortedRoutineDays.length > 0 && (
        <div className="flex flex-col gap-1.5 bg-white/60 rounded-2xl p-3 border border-brand-100">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Estructura de la rutina</p>
          {sortedRoutineDays.map((day) => {
            const exs = day.template_exercises ?? [];
            const shown = exs.slice(0, 3);
            const extra = exs.length - shown.length;
            return (
              <div key={day.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    D{day.day_number}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 truncate">{day.name}</span>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{exs.length} ej.</span>
                </div>
                {shown.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-7">
                    {shown.map((ex) => (
                      <span key={ex.id} className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                        {ex.name}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="text-[11px] text-gray-400 rounded-full px-1.5 py-0.5">+{extra} más</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {assignment.template_id && (
            <Link
              href={`/dashboard/templates/${assignment.template_id}/edit`}
              className="mt-1 text-xs text-brand-500 font-semibold hover:underline self-start"
            >
              Ver rutina completa →
            </Link>
          )}
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Progreso del ciclo</span>
            <span className="font-bold text-gray-800">{progress.completed} / {progress.total} sesiones</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-3 -mt-1 flex-wrap">
        <Button
          variant="ghost" size="sm"
          loading={regenerating}
          onClick={handleRegenerate}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 flex items-center gap-1.5"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Regenerar sesiones
        </Button>
        <Button
          variant="ghost" size="sm"
          loading={cancelling}
          onClick={handleCancel}
          className="text-red-400 hover:text-red-600 hover:bg-red-50"
        >
          Cancelar asignación
        </Button>
      </div>
    </Card>
  );
}
