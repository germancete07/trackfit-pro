"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/shared/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import type { VideoCorrection } from "@/lib/types";

interface Props {
  corrections: VideoCorrection[];
  studentId: string;
  trainerId: string;
}

export function StudentCorrectionsView({ corrections, studentId, trainerId }: Props) {
  const { showToast } = useToast();
  const [localCorrections, setLocalCorrections] = useState(corrections);
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

    const { data, error: err } = await supabase.from("video_corrections").insert({
      student_id: studentId,
      trainer_id: trainerId,
      exercise_name: exerciseName.trim(),
      video_url: videoUrl.trim(),
      student_comment: comment.trim() || null,
    }).select().single();

    if (err || !data) {
      setError("Error al enviar. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    setLocalCorrections((prev) => [data as VideoCorrection, ...prev]);
    setShowForm(false);
    setExerciseName("");
    setVideoUrl("");
    setComment("");
    setLoading(false);
    showToast("Video enviado al entrenador");
  }

  const pending = localCorrections.filter((c) => c.status === "pending");
  const reviewed = localCorrections.filter((c) => c.status === "reviewed");

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

      {/* Historial agrupado por ejercicio */}
      {localCorrections.length > 0 && !showForm && (() => {
        const groups: Record<string, typeof localCorrections> = {};
        for (const c of localCorrections) {
          if (!groups[c.exercise_name]) groups[c.exercise_name] = [];
          groups[c.exercise_name].push(c);
        }
        return Object.entries(groups).map(([exName, items]) => (
          <section key={exName}>
            <h2 className="text-sm font-bold text-gray-600 mb-2">{exName}</h2>
            <div className="flex flex-col gap-2">
              {items.map((c) => (
                <Card key={c.id} padding="md" className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                    <Badge variant={c.status === "reviewed" ? "success" : "warning"}>
                      {c.status === "reviewed" ? "Respondida" : "Pendiente"}
                    </Badge>
                  </div>
                  <a
                    href={c.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:underline"
                  >
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Ver video
                  </a>
                  {c.student_comment && (
                    <p className="text-xs text-gray-500 italic">"{c.student_comment}"</p>
                  )}
                  {c.trainer_response && (
                    <div className="bg-brand-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-semibold text-brand-600 mb-1">Correccion del entrenador</p>
                      <p className="text-sm text-brand-800 whitespace-pre-wrap">{c.trainer_response}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ));
      })()}

      {localCorrections.length === 0 && !showForm && (
        <EmptyState
          illustration="corrections"
          title="Sin videos enviados"
          description="Grabá tu técnica y enviásela a tu entrenador para recibir feedback personalizado."
          action={{ label: "Subir mi primer video", onClick: () => setShowForm(true) }}
        />
      )}
    </div>
  );
}
