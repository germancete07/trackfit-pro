"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate } from "@/lib/utils";
import type { VideoCorrection } from "@/lib/types";

interface Props {
  corrections: VideoCorrection[];
  studentId: string;
  trainerId: string;
}

export function StudentCorrectionsView({ corrections, studentId, trainerId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseName.trim() || !videoUrl.trim()) {
      setError("Completá el ejercicio y el link del video");
      return;
    }
    if (!trainerId) {
      setError("No tenés un entrenador asignado");
      return;
    }

    setError("");
    setLoading(true);
    const supabase = createClient();

    const { error: err } = await supabase.from("video_corrections").insert({
      student_id: studentId,
      trainer_id: trainerId,
      exercise_name: exerciseName.trim(),
      video_url: videoUrl.trim(),
      student_comment: comment.trim() || null,
    });

    if (err) {
      setError("Error al enviar. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    setShowForm(false);
    setExerciseName("");
    setVideoUrl("");
    setComment("");
    setLoading(false);
    window.location.reload();
  }

  const pending = corrections.filter((c) => c.status === "pending");
  const reviewed = corrections.filter((c) => c.status === "reviewed");

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Videos para corrección</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Subir
          </Button>
        )}
      </div>

      {showForm && (
        <Card padding="md" className="border-brand-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-700">Nuevo video para corrección</h2>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <Input
              label="Ejercicio"
              placeholder="Ej: Sentadilla, Peso muerto..."
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              required
            />
            <Input
              label="Link del video"
              type="url"
              placeholder="https://youtube.com/... o drive.google.com/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
            />
            <Textarea
              label="Comentario (opcional)"
              placeholder="¿Qué dudas tenés? ¿Qué querés que revisen?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={loading} className="flex-1">Enviar</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Respondidas</h2>
          <div className="flex flex-col gap-3">
            {reviewed.map((c) => (
              <Card key={c.id} padding="md" className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">{c.exercise_name}</p>
                  <Badge variant="success">Respondida</Badge>
                </div>
                <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                {c.trainer_response && (
                  <div className="bg-brand-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs font-semibold text-brand-600 mb-1">Corrección del entrenador</p>
                    <p className="text-sm text-brand-800 whitespace-pre-wrap">{c.trainer_response}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Esperando respuesta</h2>
          <div className="flex flex-col gap-2">
            {pending.map((c) => (
              <Card key={c.id} padding="sm" className="flex items-center justify-between opacity-70">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{c.exercise_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                </div>
                <Badge variant="warning">Pendiente</Badge>
              </Card>
            ))}
          </div>
        </section>
      )}

      {corrections.length === 0 && !showForm && (
        <Card padding="lg" className="text-center flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm">No enviaste videos todavía.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Subir mi primer video</Button>
        </Card>
      )}
    </div>
  );
}
