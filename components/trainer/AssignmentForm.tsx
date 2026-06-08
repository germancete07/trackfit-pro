"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { createAssignmentAction } from "@/app/dashboard/routines/assign/[templateId]/actions";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  preferred_training_days: number[];
}

interface Props {
  templateId: string;
  templateName: string;
  students: Student[];
  initialStudentId?: string;
}

const DAYS = [
  { value: 1, label: "L", full: "Lunes" },
  { value: 2, label: "M", full: "Martes" },
  { value: 3, label: "X", full: "Mié" },
  { value: 4, label: "J", full: "Jueves" },
  { value: 5, label: "V", full: "Viernes" },
  { value: 6, label: "S", full: "Sáb" },
  { value: 0, label: "D", full: "Dom" },
];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayLocal(dateStr: string): Date {
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d;
}

function formatDateShort(dateStr: string): string {
  const [y, m, day] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

export function AssignmentForm({ templateId, students, initialStudentId }: Props) {
  const { showToast } = useToast();
  const today = toLocalDateStr(new Date());

  const [studentId, setStudentId] = useState(initialStudentId ?? students[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today);
  const [trainingDays, setTrainingDays] = useState<number[]>(() => {
    const initial = initialStudentId
      ? students.find(s => s.id === initialStudentId)?.preferred_training_days ?? []
      : students[0]?.preferred_training_days ?? [];
    return initial;
  });
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [hasDeload, setHasDeload] = useState(false);
  const [deloadWeeks, setDeloadWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // "existing routine" confirmation state
  const [existingWarning, setExistingWarning] = useState<{ name: string; id: string } | null>(null);

  function handleStudentChange(id: string) {
    setStudentId(id);
    setExistingWarning(null);
    const student = students.find(s => s.id === id);
    if (student && student.preferred_training_days.length > 0) {
      setTrainingDays(student.preferred_training_days);
    }
  }

  function toggleDay(dow: number) {
    setTrainingDays(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]
    );
  }

  const { sessionCount, endDate } = useMemo(() => {
    if (!startDate || trainingDays.length === 0 || totalWeeks < 1) return { sessionCount: 0, endDate: null };

    const start = new Date(startDate + "T12:00:00");
    const monday = getMondayLocal(startDate);
    const sorted = [...trainingDays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

    let count = 0;
    let lastDate = start;

    for (let w = 0; w < totalWeeks; w++) {
      for (const dow of sorted) {
        const offset = dow === 0 ? 6 : dow - 1;
        const d = new Date(monday);
        d.setDate(monday.getDate() + w * 7 + offset);
        if (d >= start) {
          count++;
          if (d > lastDate) lastDate = d;
        }
      }
    }

    return { sessionCount: count, endDate: toLocalDateStr(lastDate) };
  }, [startDate, trainingDays, totalWeeks]);

  async function doSubmit(force = false) {
    if (!studentId) { setError("Seleccioná un alumno"); return; }
    if (trainingDays.length === 0) { setError("Seleccioná al menos un día de entrenamiento"); return; }
    if (totalWeeks < 1 || totalWeeks > 52) { setError("Duración entre 1 y 52 semanas"); return; }
    setError("");
    setLoading(true);

    const result = await createAssignmentAction({
      studentId, templateId, startDate, trainingDays, totalWeeks,
      deloadEveryWeeks: hasDeload ? deloadWeeks : null,
      force,
    });

    setLoading(false);

    // Success → createAssignmentAction does redirect(), so we'd never reach here normally.
    // Only returned values are errors or existingRoutine.
    if (!result) return; // redirect happened

    if ("existingRoutine" in result) {
      setExistingWarning(result.existingRoutine);
      return;
    }
    if ("error" in result) {
      setError(result.error);
    }
  }

  if (students.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-sm font-semibold text-gray-700">No tenés alumnos activos</p>
        <p className="text-xs text-gray-400 mt-1">Invitá alumnos desde Configuración para poder asignarles rutinas.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); doSubmit(false); }} className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* ── Existing routine warning ── */}
      {existingWarning && (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Este alumno ya tiene una rutina activa</p>
              <p className="text-xs text-amber-700 mt-0.5">
                <span className="font-semibold">"{existingWarning.name}"</span> se cancelará al reemplazar.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExistingWarning(null)}
              className="flex-1 h-10 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { setExistingWarning(null); doSubmit(true); }}
              disabled={loading}
              className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              {loading ? "Asignando..." : "Sí, reemplazar"}
            </button>
          </div>
        </div>
      )}

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Alumno</h2>
        <select
          value={studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
      </Card>

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Período</h2>
        <Input label="Fecha de inicio" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={today} required />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Duración</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min="1" max="52"
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 1)}
              className="h-11 w-24 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-500">semanas</span>
          </div>
        </div>
      </Card>

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Días de entrenamiento</h2>
        {(() => {
          const student = students.find(s => s.id === studentId);
          if (student?.preferred_training_days?.length) {
            return <p className="text-xs text-brand-500 -mt-2">Precargado desde el perfil del alumno</p>;
          }
          return null;
        })()}
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              title={d.full}
              className={cn(
                "flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-150",
                trainingDays.includes(d.value)
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        {trainingDays.length > 0 && (
          <p className="text-xs text-gray-500">
            {DAYS.filter(d => trainingDays.includes(d.value)).map(d => d.full).join(", ")}
          </p>
        )}
      </Card>

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Semana de descarga</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setHasDeload(!hasDeload)}
            className={cn(
              "h-6 w-11 rounded-full relative transition-colors duration-200 flex-shrink-0",
              hasDeload ? "bg-brand-500" : "bg-gray-200"
            )}
          >
            <div className={cn(
              "absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200",
              hasDeload ? "translate-x-5" : "translate-x-0.5"
            )} />
          </div>
          <span className="text-sm text-gray-700 font-medium">Incluir semanas de descarga</span>
        </label>
        {hasDeload && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Cada</span>
            <input
              type="number"
              inputMode="numeric"
              min="2" max="12"
              value={deloadWeeks}
              onChange={(e) => setDeloadWeeks(parseInt(e.target.value) || 4)}
              className="h-10 w-20 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-500">semanas</span>
          </div>
        )}
      </Card>

      {/* Preview */}
      {sessionCount > 0 && endDate && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl px-4 py-4 flex flex-col gap-1">
          <p className="text-sm font-bold text-brand-700">
            Se generarán {sessionCount} rutinas
          </p>
          <p className="text-xs text-brand-500">
            {formatDateShort(startDate)} → {formatDateShort(endDate)}
            {hasDeload && ` · Descarga: semanas ${Array.from({ length: Math.floor(totalWeeks / deloadWeeks) }, (_, i) => (i + 1) * deloadWeeks).join(", ")}`}
          </p>
        </div>
      )}

      {!existingWarning && (
        <Button type="submit" size="lg" loading={loading} disabled={trainingDays.length === 0} className="w-full">
          Asignar rutina con calendario
        </Button>
      )}
    </form>
  );
}
