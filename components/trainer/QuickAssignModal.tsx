"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { quickAssignAction } from "@/app/dashboard/routines/actions";
import { cn } from "@/lib/utils";

interface Student { id: string; full_name: string; preferred_training_days: number[] }

interface Props {
  templateId: string;
  templateName: string;
  students: Student[];
  onClose: () => void;
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

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function QuickAssignModal({ templateId, templateName, students, onClose }: Props) {
  const { showToast } = useToast();
  const today = toLocalDateStr(new Date());

  const [step, setStep] = useState<"confirm" | "assign">("confirm");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today);
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [trainingDays, setTrainingDays] = useState<number[]>(() =>
    students[0]?.preferred_training_days ?? []
  );
  const [hasDeload, setHasDeload] = useState(false);
  const [deloadWeeks, setDeloadWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleStudentChange(id: string) {
    setStudentId(id);
    const s = students.find(x => x.id === id);
    if (s?.preferred_training_days?.length) setTrainingDays(s.preferred_training_days);
  }

  function toggleDay(dow: number) {
    setTrainingDays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);
  }

  const sessionCount = useMemo(() => {
    if (!startDate || trainingDays.length === 0 || totalWeeks < 1) return 0;
    const start = new Date(startDate + "T12:00:00");
    const d = new Date(startDate + "T12:00:00");
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + offset);
    const sorted = [...trainingDays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
    let count = 0;
    for (let w = 0; w < totalWeeks; w++) {
      for (const dow of sorted) {
        const off = dow === 0 ? 6 : dow - 1;
        const sd = new Date(monday);
        sd.setDate(monday.getDate() + w * 7 + off);
        if (sd >= start) count++;
      }
    }
    return count;
  }, [startDate, trainingDays, totalWeeks]);

  async function handleAssign() {
    if (!studentId) { setError("Seleccioná un alumno"); return; }
    if (trainingDays.length === 0) { setError("Seleccioná al menos un día"); return; }
    setLoading(true);
    setError("");
    const result = await quickAssignAction({
      studentId, templateId, startDate, trainingDays, totalWeeks,
      deloadEveryWeeks: hasDeload ? deloadWeeks : null,
    });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    showToast("Rutina asignada correctamente");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
          className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: "var(--surface-elevated)", border: "0.5px solid var(--surface-elevated-border)" }}
        >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-4 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">Asignar rutina</h2>
              <p className="text-xs text-brand-500 font-medium truncate max-w-[220px]">{templateName}</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-600">{error}</div>
          )}

          {/* Alumno */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Alumno</label>
            <select
              value={studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          {/* Días */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Días de entrenamiento</label>
            <div className="flex gap-1.5">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    "flex-1 h-10 rounded-xl text-sm font-bold transition-all",
                    trainingDays.includes(d.value)
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha inicio + semanas */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Inicio"
              type="date"
              value={startDate}
              min={today}
              onChange={e => setStartDate(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Semanas</label>
              <input
                type="number"
                min="1" max="52"
                value={totalWeeks}
                onChange={e => setTotalWeeks(parseInt(e.target.value) || 1)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Descarga toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setHasDeload(!hasDeload)}
              className={cn("h-6 w-11 rounded-full relative transition-colors flex-shrink-0", hasDeload ? "bg-brand-500" : "bg-gray-200")}
            >
              <div className={cn("absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform", hasDeload ? "translate-x-5" : "translate-x-0.5")} />
            </div>
            <span className="text-sm text-gray-700 font-medium">Semanas de descarga</span>
            {hasDeload && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-gray-500">cada</span>
                <input
                  type="number" min="2" max="12"
                  value={deloadWeeks}
                  onChange={e => setDeloadWeeks(parseInt(e.target.value) || 4)}
                  className="h-8 w-14 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-xs text-gray-500">sem.</span>
              </div>
            )}
          </label>

          {/* Preview */}
          {sessionCount > 0 && (
            <div className="bg-brand-50 rounded-2xl px-4 py-3 border border-brand-100">
              <p className="text-sm font-bold text-brand-700">
                Se van a generar <span className="text-brand-600">{sessionCount}</span> rutinas en {totalWeeks} semanas
              </p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleAssign}
            loading={loading}
            disabled={trainingDays.length === 0 || !studentId}
          >
            Asignar rutina
          </Button>
        </div>
      </div>
    </div>
  );
}
