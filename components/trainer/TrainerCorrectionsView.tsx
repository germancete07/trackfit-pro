"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/shared/ToastProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import type { VideoCorrection } from "@/lib/types";

type CorrectionWithStudent = Omit<VideoCorrection, "student"> & {
  student: { full_name: string } | null;
};

export function TrainerCorrectionsView({ corrections }: { corrections: CorrectionWithStudent[] }) {
  const { showToast } = useToast();
  const [localCorrections, setLocalCorrections] = useState(corrections);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  async function submitResponse(correction: CorrectionWithStudent) {
    const text = responses[correction.id]?.trim();
    if (!text) return;

    setSaving((p) => ({ ...p, [correction.id]: true }));
    const supabase = createClient();
    const { error } = await supabase
      .from("video_corrections")
      .update({ trainer_response: text, status: "reviewed", reviewed_at: new Date().toISOString() })
      .eq("id", correction.id);

    setSaving((p) => ({ ...p, [correction.id]: false }));
    if (error) {
      showToast("Error al enviar la corrección", "error");
      return;
    }
    setLocalCorrections((prev) =>
      prev.map((c) =>
        c.id === correction.id
          ? { ...c, status: "reviewed" as const, trainer_response: text, reviewed_at: new Date().toISOString() }
          : c
      )
    );
    setExpanded(null);
    showToast("Corrección enviada");
  }

  const pending = localCorrections.filter((c) => c.status === "pending");
  const reviewed = localCorrections.filter((c) => c.status === "reviewed");

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Correcciones de video</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
            Pendientes ({pending.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pending.map((c) => (
              <Card key={c.id} padding="md" className="flex flex-col gap-3 border-brand-200">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.exercise_name}</p>
                    <p className="text-xs text-gray-400">
                      {c.student?.full_name} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <Badge variant="warning">Pendiente</Badge>
                </div>

                {c.student_comment && (
                  <p className="text-xs text-gray-600 italic">"{c.student_comment}"</p>
                )}

                <a
                  href={c.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-500 font-medium"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Ver video del alumno
                </a>

                {expanded === c.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      placeholder="Escribí tu corrección técnica..."
                      value={responses[c.id] ?? ""}
                      onChange={(e) => setResponses((p) => ({ ...p, [c.id]: e.target.value }))}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => submitResponse(c)}
                        loading={saving[c.id]}
                        className="flex-1"
                      >
                        Enviar corrección
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setExpanded(c.id)} className="w-full">
                    Responder
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
            Respondidas ({reviewed.length})
          </h2>
          <div className="flex flex-col gap-2">
            {reviewed.map((c) => (
              <Card key={c.id} padding="sm" className="flex flex-col gap-1.5 opacity-70">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-700">{c.exercise_name}</p>
                  <Badge variant="success">Respondida</Badge>
                </div>
                <p className="text-xs text-gray-400">{c.student?.full_name} · {formatDate(c.created_at)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {localCorrections.length === 0 && (
        <EmptyState
          illustration="corrections"
          title="Sin correcciones pendientes"
          description="Cuando tus alumnos suban videos, aparecerán acá para que puedas responderlos."
        />
      )}
    </div>
  );
}
