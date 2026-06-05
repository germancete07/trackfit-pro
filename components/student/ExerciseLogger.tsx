"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RPESlider } from "@/components/ui/RPESlider";
import { Badge } from "@/components/ui/Badge";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import type { Exercise, Session } from "@/lib/types";

interface ExerciseWithLogs extends Exercise {
  exercise_logs: { weight_kg: number | null; completed_sets: number | null; rpe: number | null; comment: string | null }[];
}

interface Props {
  session: Session;
  exercises: ExerciseWithLogs[];
  studentId: string;
}

interface LogState {
  weight_kg: string;
  completed_sets: string;
  rpe: number;
  comment: string;
  saved: boolean;
  saving: boolean;
  error: string;
}

export function ExerciseLogger({ session, exercises, studentId }: Props) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  const [logs, setLogs] = useState<Record<string, LogState>>(() => {
    const init: Record<string, LogState> = {};
    exercises.forEach((ex) => {
      const prev = ex.exercise_logs?.[0];
      init[ex.id] = {
        weight_kg: prev?.weight_kg?.toString() ?? "",
        completed_sets: prev?.completed_sets?.toString() ?? ex.sets.toString(),
        rpe: prev?.rpe ?? 7,
        comment: prev?.comment ?? "",
        saved: ex.exercise_logs?.length > 0,
        saving: false,
        error: "",
      };
    });
    return init;
  });

  function updateLog(exerciseId: string, field: keyof LogState, value: string | number | boolean) {
    setLogs((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: value, saved: false },
    }));
  }

  async function saveLog(exercise: ExerciseWithLogs) {
    const log = logs[exercise.id];
    if (!log.weight_kg) {
      updateLog(exercise.id, "error", "Ingresá el peso");
      return;
    }
    updateLog(exercise.id, "saving", true);
    updateLog(exercise.id, "error", "");

    const supabase = createClient();
    const { error } = await supabase.from("exercise_logs").upsert({
      exercise_id: exercise.id,
      student_id: studentId,
      session_id: session.id,
      weight_kg: parseFloat(log.weight_kg),
      completed_sets: parseInt(log.completed_sets) || exercise.sets,
      rpe: log.rpe,
      comment: log.comment.trim() || null,
      logged_at: new Date().toISOString(),
    }, { onConflict: "exercise_id,student_id" });

    if (error) {
      updateLog(exercise.id, "error", "Error al guardar");
      updateLog(exercise.id, "saving", false);
    } else {
      setLogs((prev) => ({
        ...prev,
        [exercise.id]: { ...prev[exercise.id], saved: true, saving: false, error: "" },
      }));
      if (activeIndex < exercises.length - 1) {
        setTimeout(() => setActiveIndex(activeIndex + 1), 300);
      }
    }
  }

  const allSaved = exercises.every((ex) => logs[ex.id]?.saved);

  async function finishSession() {
    const supabase = createClient();
    await supabase.from("sessions").update({ status: "completed" }).eq("id", session.id);
    router.push("/dashboard");
    router.refresh();
  }

  const ex = exercises[activeIndex];
  const log = ex ? logs[ex.id] : null;
  const embedUrl = ex?.youtube_url ? getYoutubeEmbedUrl(ex.youtube_url) : null;
  const doneCount = exercises.filter((e) => logs[e.id]?.saved).length;

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900">{session.name}</h1>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / exercises.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 flex-shrink-0">
            {doneCount}/{exercises.length} ejercicios
          </span>
        </div>
      </div>

      {/* Exercise tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {exercises.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setActiveIndex(i)}
            className={`flex-shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-all ${
              i === activeIndex
                ? "bg-brand-500 text-white shadow-sm"
                : logs[e.id]?.saved
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {logs[e.id]?.saved ? "✓ " : `${i + 1}. `}
            {e.name.length > 12 ? e.name.slice(0, 12) + "…" : e.name}
          </button>
        ))}
      </div>

      {/* Main content: two columns on desktop */}
      {ex && log && (
        <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start flex flex-col gap-3">

          {/* Left: exercise info */}
          <div className="flex flex-col gap-3 md:sticky md:top-20">
            <Card padding="md" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-brand-500 font-bold uppercase tracking-wide mb-0.5">
                    Ejercicio {activeIndex + 1} de {exercises.length}
                  </p>
                  <h2 className="text-lg font-black text-gray-900">{ex.name}</h2>
                  <p className="text-sm text-brand-600 font-semibold mt-0.5">
                    {ex.sets} series × {ex.reps} reps
                  </p>
                  {ex.rest_seconds && (
                    <p className="text-xs text-gray-400 mt-0.5">{ex.rest_seconds}s de descanso</p>
                  )}
                </div>
                {log.saved && <Badge variant="success">✓ Guardado</Badge>}
              </div>

              {ex.technical_note && (
                <div className="bg-brand-50 rounded-xl px-3 py-2.5 border border-brand-100">
                  <p className="text-xs font-semibold text-brand-600 mb-0.5">📌 Nota técnica</p>
                  <p className="text-sm text-brand-700">{ex.technical_note}</p>
                </div>
              )}
            </Card>

            {/* Video */}
            {embedUrl && (
              <Card padding="none" className="overflow-hidden">
                {expandedVideo === ex.id ? (
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title={ex.name}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpandedVideo(ex.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 shadow">
                      <svg className="h-4 w-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Ver video de referencia</span>
                  </button>
                )}
              </Card>
            )}

            {/* Desktop prev/next */}
            <div className="hidden md:flex gap-2">
              {activeIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setActiveIndex(activeIndex - 1)} className="flex-1">
                  ← Anterior
                </Button>
              )}
              {activeIndex < exercises.length - 1 && (
                <Button variant="secondary" size="sm" onClick={() => setActiveIndex(activeIndex + 1)} className="flex-1">
                  Siguiente →
                </Button>
              )}
            </div>
          </div>

          {/* Right: log form */}
          <div className="flex flex-col gap-3">
            <Card padding="md" className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-700">Registrá tu carga</h3>

              {log.error && (
                <p className="text-xs text-red-500 font-medium">{log.error}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Peso (kg)"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="ej: 80"
                  value={log.weight_kg}
                  onChange={(e) => updateLog(ex.id, "weight_kg", e.target.value)}
                />
                <Input
                  label="Series realizadas"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="20"
                  value={log.completed_sets}
                  onChange={(e) => updateLog(ex.id, "completed_sets", e.target.value)}
                />
              </div>

              <RPESlider
                value={log.rpe}
                onChange={(v) => updateLog(ex.id, "rpe", v)}
              />

              <Textarea
                label="Comentario (opcional)"
                placeholder="¿Cómo se sintió? ¿Alguna molestia?"
                value={log.comment}
                onChange={(e) => updateLog(ex.id, "comment", e.target.value)}
                rows={2}
              />

              <Button
                onClick={() => saveLog(ex)}
                loading={log.saving}
                variant={log.saved ? "secondary" : "primary"}
                className="w-full"
              >
                {log.saved ? "✓ Guardado · Modificar" : "Guardar"}
              </Button>
            </Card>

            {/* Mobile prev/next */}
            <div className="flex gap-2 md:hidden">
              {activeIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setActiveIndex(activeIndex - 1)} className="flex-1">
                  ← Anterior
                </Button>
              )}
              {activeIndex < exercises.length - 1 && (
                <Button variant="secondary" size="sm" onClick={() => setActiveIndex(activeIndex + 1)} className="flex-1">
                  Siguiente →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finish */}
      {allSaved && (
        <Button size="lg" className="w-full md:max-w-sm md:mx-auto" onClick={finishSession}>
          🎉 Finalizar sesión
        </Button>
      )}
    </div>
  );
}
