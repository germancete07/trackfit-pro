"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

interface Student { id: string; full_name: string; email: string; }

interface ExerciseDraft {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  youtube_url: string;
  technical_note: string;
}

const emptyExercise = (): ExerciseDraft => ({
  name: "", sets: 3, reps: "8-12", rest_seconds: 90, youtube_url: "", technical_note: "",
});

interface Props {
  trainerId: string;
  students: Student[];
}

export function SessionForm({ trainerId, students }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [name, setName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);

  function updateExercise(index: number, field: keyof ExerciseDraft, value: string | number) {
    setExercises((prev) => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) { setError("Seleccioná un alumno"); return; }
    if (!name.trim()) { setError("Ingresá un nombre para la sesión"); return; }
    if (exercises.some((ex) => !ex.name.trim())) { setError("Todos los ejercicios necesitan nombre"); return; }

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .insert({
        trainer_id: trainerId,
        student_id: studentId,
        name: name.trim(),
        scheduled_date: scheduledDate || null,
        notes: notes.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (sessionErr || !session) {
      setError("Error al crear la sesión");
      setLoading(false);
      return;
    }

    const exercisesPayload = exercises.map((ex, i) => ({
      session_id: session.id,
      name: ex.name.trim(),
      sets: ex.sets,
      reps: ex.reps.trim(),
      rest_seconds: ex.rest_seconds || null,
      youtube_url: ex.youtube_url.trim() || null,
      technical_note: ex.technical_note.trim() || null,
      sort_order: i,
    }));

    const { error: exErr } = await supabase.from("exercises").insert(exercisesPayload);

    if (exErr) {
      setError("Sesión creada pero hubo un error con los ejercicios");
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
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => router.push("/dashboard/students/new")}
        >
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

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Datos de la sesión</h2>

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

        <Input label="Nombre de la sesión" placeholder="Ej: Tren superior A" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Fecha programada" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        <Textarea label="Notas generales" placeholder="Instrucciones o contexto de la sesión..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Card>

      {/* Exercises */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Ejercicios ({exercises.length})
        </h2>

        {exercises.map((ex, i) => (
          <Card key={i} padding="md" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-500 uppercase tracking-wide">
                Ejercicio {i + 1}
              </span>
              {exercises.length > 1 && (
                <button type="button" onClick={() => removeExercise(i)} className="text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <Input
              placeholder="Nombre del ejercicio"
              value={ex.name}
              onChange={(e) => updateExercise(i, "name", e.target.value)}
              required
            />

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Series"
                type="number"
                min="1"
                max="20"
                value={ex.sets}
                onChange={(e) => updateExercise(i, "sets", parseInt(e.target.value) || 1)}
              />
              <Input
                label="Reps"
                placeholder="8-12"
                value={ex.reps}
                onChange={(e) => updateExercise(i, "reps", e.target.value)}
              />
              <Input
                label="Descanso (s)"
                type="number"
                min="0"
                value={ex.rest_seconds}
                onChange={(e) => updateExercise(i, "rest_seconds", parseInt(e.target.value) || 0)}
              />
            </div>

            <Input
              label="Video YouTube (opcional)"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={ex.youtube_url}
              onChange={(e) => updateExercise(i, "youtube_url", e.target.value)}
            />

            <Textarea
              label="Nota técnica (opcional)"
              placeholder="Clave técnica, errores comunes..."
              value={ex.technical_note}
              onChange={(e) => updateExercise(i, "technical_note", e.target.value)}
              rows={2}
            />
          </Card>
        ))}

        <Button type="button" variant="secondary" onClick={addExercise} className="w-full">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar ejercicio
        </Button>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        Crear sesión
      </Button>
    </form>
  );
}
