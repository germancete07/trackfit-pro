"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { ExerciseLibraryPicker } from "@/components/trainer/ExerciseLibraryPicker";
import type { SessionTemplate, TemplateExercise } from "@/lib/types";

interface Student { id: string; full_name: string; email: string; }

interface ExerciseDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
}

const emptyExercise = (): ExerciseDraft => ({
  name: "", sets: 3, reps: "8-12", rest_seconds: 90, youtube_url: "", technical_note: "",
});

interface Props {
  trainerId: string;
  students: Student[];
  defaultStudentId?: string;
  templates?: (SessionTemplate & { template_exercises: TemplateExercise[] })[];
}

export function SessionForm({ trainerId, students, defaultStudentId, templates = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [studentId, setStudentId] = useState(defaultStudentId ?? students[0]?.id ?? "");
  const [name, setName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  function updateExercise(index: number, field: keyof ExerciseDraft, value: string | number) {
    setExercises((prev) => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  }

  function loadTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setName(tpl.name);
    setExercises(
      tpl.template_exercises
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ex) => ({
          name: ex.name, sets: ex.sets, reps: ex.reps,
          rest_seconds: ex.rest_seconds ?? 90,
          youtube_url: ex.youtube_url ?? "", technical_note: ex.technical_note ?? "",
        }))
    );
    setSelectedTemplate(templateId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) { setError("Seleccioná un alumno"); return; }
    if (!name.trim()) { setError("Ingresá un nombre para la rutina"); return; }
    if (exercises.some((ex) => !ex.name.trim())) { setError("Todos los ejercicios necesitan nombre"); return; }

    setError("");
    setLoading(true);
    const supabase = createClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({
        trainer_id: trainerId, student_id: studentId,
        name: name.trim(), scheduled_date: scheduledDate || null,
        notes: notes.trim() || null, status: "pending",
      })
      .select().single();

    if (sessionErr || !session) {
      setError("Error al crear la rutina");
      setLoading(false);
      return;
    }

    const { error: exErr } = await supabase.from("exercises").insert(
      exercises.map((ex, i) => ({
        session_id: session.id, name: ex.name.trim(), sets: ex.sets,
        reps: ex.reps.trim(), rest_seconds: ex.rest_seconds || null,
        youtube_url: ex.youtube_url.trim() || null,
        technical_note: ex.technical_note.trim() || null,
        sort_order: i,
      }))
    );

    if (exErr) {
      setError("Rutina creada pero hubo un error con los ejercicios");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/sessions/${session.id}`);
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-gray-500 text-sm">Primero tenés que agregar alumnos.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push("/dashboard/students/new")}>
          Agregar alumno
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Load from template */}
      {templates.length > 0 && (
        <Card padding="sm" className="bg-brand-50 border-brand-100">
          <div className="flex gap-2 items-center">
            <svg className="h-4 w-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <select
              value={selectedTemplate}
              onChange={(e) => loadTemplate(e.target.value)}
              className="flex-1 text-sm bg-transparent text-brand-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">Cargar desde rutina...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.template_exercises.length} ejercicios)</option>
              ))}
            </select>
          </div>
        </Card>
      )}

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Datos de la rutina</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Alumno</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        <Input label="Nombre de la rutina" placeholder="Ej: Tren superior A" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Fecha programada" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        <Textarea label="Notas generales" placeholder="Instrucciones o contexto de la rutina..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Card>

      {showPicker && (
        <ExerciseLibraryPicker
          onSelect={(ex) => setExercises(p => [...p, ex])}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ejercicios ({exercises.length})</h2>
          <button type="button" onClick={() => setShowPicker(true)} className="text-xs text-brand-500 font-semibold hover:underline flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            Desde biblioteca
          </button>
        </div>

        {exercises.map((ex, i) => (
          <Card key={i} padding="md" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-500 uppercase tracking-wide">Ejercicio {i + 1}</span>
              {exercises.length > 1 && (
                <button type="button" onClick={() => setExercises((p) => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <Input placeholder="Nombre del ejercicio" value={ex.name} onChange={(e) => updateExercise(i, "name", e.target.value)} required />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Series" type="number" inputMode="numeric" min="1" max="20" value={ex.sets} onChange={(e) => updateExercise(i, "sets", parseInt(e.target.value) || 1)} />
              <Input label="Reps" placeholder="8-12" inputMode="numeric" value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)} />
              <Input label="Descanso (s)" type="number" inputMode="numeric" min="0" value={ex.rest_seconds} onChange={(e) => updateExercise(i, "rest_seconds", parseInt(e.target.value) || 0)} />
            </div>
            <Input label="Video YouTube (opcional)" type="url" placeholder="https://youtube.com/watch?v=..." value={ex.youtube_url} onChange={(e) => updateExercise(i, "youtube_url", e.target.value)} />
            <Textarea label="Nota tecnica (opcional)" placeholder="Clave técnica, errores comunes..." value={ex.technical_note} onChange={(e) => updateExercise(i, "technical_note", e.target.value)} rows={2} />
          </Card>
        ))}

        <Button type="button" variant="secondary" onClick={() => setExercises((p) => [...p, emptyExercise()])} className="w-full">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar ejercicio
        </Button>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">Crear rutina</Button>
    </form>
  );
}
