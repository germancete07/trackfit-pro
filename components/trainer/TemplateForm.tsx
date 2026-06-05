"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/shared/ToastProvider";
import { createTemplateAction, updateTemplateAction } from "@/app/dashboard/templates/actions";
import type { SessionTemplate, TemplateExercise } from "@/lib/types";

interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
}

const emptyEx = (): ExDraft => ({
  name: "", sets: 3, reps: "8-12", rest_seconds: 90, youtube_url: "", technical_note: "",
});

interface Props {
  template?: SessionTemplate & { template_exercises: TemplateExercise[] };
}

export function TemplateForm({ template }: Props) {
  const { showToast } = useToast();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [exercises, setExercises] = useState<ExDraft[]>(
    template?.template_exercises?.length
      ? template.template_exercises
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ex) => ({
            name: ex.name, sets: ex.sets, reps: ex.reps,
            rest_seconds: ex.rest_seconds ?? 90,
            youtube_url: ex.youtube_url ?? "", technical_note: ex.technical_note ?? "",
          }))
      : [emptyEx()]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateEx(i: number, field: keyof ExDraft, value: string | number) {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Ingresá un nombre para la plantilla"); return; }
    if (exercises.some((ex) => !ex.name.trim())) { setError("Todos los ejercicios necesitan nombre"); return; }
    setError("");
    setLoading(true);

    const result = isEdit
      ? await updateTemplateAction(template!.id, name, description, exercises)
      : await createTemplateAction(name, description, exercises);

    setLoading(false);
    if (result && "error" in result) {
      setError(result.error ?? "Error desconocido");
    } else if (isEdit) {
      showToast("Plantilla actualizada");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Datos de la plantilla</h2>
        <Input label="Nombre" placeholder="Ej: Tren superior — Fuerza" value={name} onChange={(e) => setName(e.target.value)} required />
        <Textarea label="Descripcion (opcional)" placeholder="Para qué sirve esta plantilla..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ejercicios ({exercises.length})</h2>

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
            <Input placeholder="Nombre del ejercicio" value={ex.name} onChange={(e) => updateEx(i, "name", e.target.value)} required />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Series" type="number" min="1" max="20" value={ex.sets} onChange={(e) => updateEx(i, "sets", parseInt(e.target.value) || 1)} />
              <Input label="Reps" placeholder="8-12" value={ex.reps} onChange={(e) => updateEx(i, "reps", e.target.value)} />
              <Input label="Descanso (s)" type="number" min="0" value={ex.rest_seconds} onChange={(e) => updateEx(i, "rest_seconds", parseInt(e.target.value) || 0)} />
            </div>
            <Input label="Video YouTube (opcional)" type="url" placeholder="https://youtube.com/watch?v=..." value={ex.youtube_url} onChange={(e) => updateEx(i, "youtube_url", e.target.value)} />
            <Textarea label="Nota tecnica (opcional)" placeholder="Clave técnica, errores comunes..." value={ex.technical_note} onChange={(e) => updateEx(i, "technical_note", e.target.value)} rows={2} />
          </Card>
        ))}

        <Button type="button" variant="secondary" onClick={() => setExercises((p) => [...p, emptyEx()])} className="w-full">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar ejercicio
        </Button>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {isEdit ? "Guardar cambios" : "Crear plantilla"}
      </Button>
    </form>
  );
}
