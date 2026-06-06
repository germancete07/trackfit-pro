"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { assignRoutineAction } from "@/app/dashboard/routines/actions";

interface Student { id: string; full_name: string; }

interface Props {
  templateId: string;
  templateName: string;
  students: Student[];
  onClose: () => void;
}

export function AssignRoutineModal({ templateId, templateName, students, onClose }: Props) {
  const { showToast } = useToast();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAssign() {
    if (!studentId) { showToast("Seleccioná un alumno", "error"); return; }
    setLoading(true);
    const result = await assignRoutineAction(templateId, studentId, date || null);
    setLoading(false);
    if (result?.error) showToast(result.error, "error");
    else {
      const student = students.find((s) => s.id === studentId);
      showToast(`Rutina asignada a ${student?.full_name ?? "alumno"}`);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl p-6 pb-10 md:pb-6 shadow-2xl mx-4 md:mx-0">
        <h3 className="text-base font-bold text-gray-900">Asignar rutina</h3>
        <p className="text-sm text-brand-500 font-medium mt-0.5 mb-4 truncate">{templateName}</p>

        {students.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No tenés alumnos activos aún.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Alumno</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <Input label="Fecha programada (opcional)" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAssign} loading={loading} className="flex-1">
                Asignar rutina
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
