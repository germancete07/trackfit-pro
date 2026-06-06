"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/shared/ToastProvider";
import type { VideoCorrection } from "@/lib/types";

export function StudentCorrectionsPanel({ corrections }: { corrections: VideoCorrection[] }) {
  const { showToast } = useToast();
  const [local, setLocal] = useState(corrections);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  async function submitResponse(c: VideoCorrection) {
    const text = responses[c.id]?.trim();
    if (!text) return;
    setSaving(p => ({ ...p, [c.id]: true }));
    const supabase = createClient();
    const { error } = await supabase
      .from("video_corrections")
      .update({ trainer_response: text, status: "reviewed", reviewed_at: new Date().toISOString() })
      .eq("id", c.id);
    setSaving(p => ({ ...p, [c.id]: false }));
    if (error) { showToast("Error al enviar la corrección", "error"); return; }
    setLocal(prev => prev.map(x => x.id === c.id
      ? { ...x, status: "reviewed" as const, trainer_response: text, reviewed_at: new Date().toISOString() }
      : x
    ));
    setExpanded(null);
    showToast("Corrección enviada");
  }

  const pending = local.filter(c => c.status === "pending");
  const reviewed = local.filter(c => c.status === "reviewed");

  if (local.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Este alumno no tiene videos enviados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Pendientes ({pending.length})
          </p>
          {pending.map(c => (
            <Card key={c.id} padding="md" className="flex flex-col gap-3 border-amber-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{c.exercise_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
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
                Ver video
              </a>
              {expanded === c.id ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Escribí tu corrección técnica..."
                    value={responses[c.id] ?? ""}
                    onChange={e => setResponses(p => ({ ...p, [c.id]: e.target.value }))}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submitResponse(c)} loading={saving[c.id]} className="flex-1">
                      Enviar corrección
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={() => setExpanded(c.id)} className="w-full">Responder</Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Respondidas ({reviewed.length})
          </p>
          {reviewed.map(c => (
            <Card key={c.id} padding="sm" className="flex items-center justify-between gap-2 opacity-70">
              <p className="text-sm font-semibold text-gray-700 truncate">{c.exercise_name}</p>
              <Badge variant="success">Respondida</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
