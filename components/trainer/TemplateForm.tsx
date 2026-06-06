"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/shared/ToastProvider";
import { createTemplateAction, updateTemplateAction } from "@/app/dashboard/templates/actions";
import { ExerciseLibraryPicker } from "@/components/trainer/ExerciseLibraryPicker";
import { cn } from "@/lib/utils";
import type { SessionTemplate, TemplateExercise } from "@/lib/types";

interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
  superset_group: string | null;
}

const emptyEx = (): ExDraft => ({
  name: "", sets: 3, reps: "8-12", rest_seconds: 90,
  youtube_url: "", technical_note: "", superset_group: null,
});

// ── Group constants ───────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  A: "#3b82f6", B: "#10b981", C: "#8b5cf6", D: "#f59e0b", E: "#ec4899",
};
const GROUP_LETTERS = ["A", "B", "C", "D", "E"];

function getGroupColor(grp: string): string {
  return GROUP_COLORS[grp] ?? "#6b7280";
}

function groupLabel(exercises: ExDraft[], i: number): string {
  const grp = exercises[i].superset_group;
  if (!grp) return String(i + 1);
  const before = exercises.slice(0, i).filter((e) => e.superset_group === grp).length;
  return `${grp}${before + 1}`;
}

function countInGroup(exercises: ExDraft[], grp: string): number {
  return exercises.filter((e) => e.superset_group === grp).length;
}

function groupTypeName(count: number): string {
  return count >= 3 ? "Circuito" : "Superserie";
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  template?: SessionTemplate & { template_exercises: TemplateExercise[] };
  defaultCategoryId?: string;
}

export function TemplateForm({ template, defaultCategoryId }: Props) {
  const { showToast } = useToast();
  const router = useRouter();
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
            superset_group: ex.superset_group ?? null,
          }))
      : [emptyEx()]
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(isEdit ? null : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  function updateEx(i: number, field: keyof ExDraft, value: string | number | null) {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
  }

  function addExercise(newEx?: ExDraft) {
    const ex = newEx ?? emptyEx();
    const newIdx = exercises.length;
    setExercises((p) => [...p, ex]);
    setExpandedIdx(newIdx);
  }

  function removeExercise(i: number) {
    setExercises((p) => p.filter((_, idx) => idx !== i));
    setExpandedIdx((prev) => {
      if (prev === null) return null;
      if (prev === i) return null;
      if (prev > i) return prev - 1;
      return prev;
    });
  }

  // DnD
  function onDragStart(e: React.DragEvent, i: number) {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragEnter(i: number) {
    if (dragIdx !== null && dragIdx !== i) setDropIdx(i);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { resetDrag(); return; }
    const arr = [...exercises];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    setExercises(arr);
    setExpandedIdx((prev) => {
      if (prev === null) return null;
      if (prev === dragIdx) return i;
      const from = dragIdx, to = i;
      if (from < to && prev > from && prev <= to) return prev - 1;
      if (from > to && prev >= to && prev < from) return prev + 1;
      return prev;
    });
    resetDrag();
  }
  function resetDrag() { setDragIdx(null); setDropIdx(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Ingresá un nombre para la rutina"); return; }
    if (exercises.some((ex) => !ex.name.trim())) { setError("Todos los ejercicios necesitan nombre"); return; }
    setError("");
    setLoading(true);

    const categoryId = template?.category_id ?? defaultCategoryId ?? null;
    const result = isEdit
      ? await updateTemplateAction(template!.id, name, description, exercises, categoryId)
      : await createTemplateAction(name, description, exercises, categoryId);

    setLoading(false);
    if (result && "error" in result) {
      setError((result as { error: string }).error ?? "Error desconocido");
      return;
    }
    if (isEdit) {
      showToast("Rutina actualizada");
    } else if (result && "redirectTo" in result) {
      router.push((result as { redirectTo: string }).redirectTo);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Routine info */}
      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Datos de la rutina</h2>
        <Input
          label="Nombre"
          placeholder="Ej: Tren superior — Fuerza"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Textarea
          label="Descripción (opcional)"
          placeholder="Para qué sirve esta rutina..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </Card>

      {/* Library picker modal */}
      {showPicker && (
        <ExerciseLibraryPicker
          onSelect={(ex) => addExercise({ ...ex, superset_group: null })}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Exercise list */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Ejercicios ({exercises.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="text-xs text-brand-500 font-semibold flex items-center gap-1.5 hover:text-brand-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Desde biblioteca
          </button>
        </div>

        {exercises.map((ex, i) => {
          const isExpanded = expandedIdx === i;
          const isDragging = dragIdx === i;
          const isOver = dropIdx === i && dragIdx !== null && dragIdx !== i;
          const nextEx = exercises[i + 1];
          const linkedToNext = !!(ex.superset_group && nextEx?.superset_group === ex.superset_group);
          const groupColor = ex.superset_group ? getGroupColor(ex.superset_group) : null;
          const cnt = ex.superset_group ? countInGroup(exercises, ex.superset_group) : 0;

          return (
            <React.Fragment key={i}>
              <div
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragEnter={() => onDragEnter(i)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={resetDrag}
                className={cn(
                  "rounded-2xl border bg-white transition-all duration-150",
                  isDragging && "opacity-40 shadow-lg",
                  isOver && "border-brand-400 ring-2 ring-brand-100 shadow-sm",
                  !isOver && !isDragging && (isExpanded ? "border-brand-200 shadow-sm" : "border-gray-200")
                )}
              >
                {/* ── Collapsed summary row ── */}
                <div className="flex items-center gap-1.5 px-3 py-2.5">
                  {/* Drag handle */}
                  <div
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-gray-300 hover:text-gray-500 transition-colors"
                    title="Arrastrar para reordenar"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <circle cx="7" cy="5"  r="1.5" /><circle cx="13" cy="5"  r="1.5" />
                      <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
                      <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
                    </svg>
                  </div>

                  {/* Number / group badge */}
                  {ex.superset_group && groupColor ? (
                    <span
                      className="text-[11px] font-black w-6 h-5 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: groupColor + "22",
                        color: groupColor,
                      }}
                    >
                      {groupLabel(exercises, i)}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-gray-300 w-4 text-center flex-shrink-0">
                      {i + 1}
                    </span>
                  )}

                  {/* Tap to expand */}
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left py-0.5"
                  >
                    <span className={cn(
                      "text-sm font-semibold flex-1 truncate",
                      ex.name ? "text-gray-900" : "text-gray-400 italic"
                    )}>
                      {ex.name || "Nuevo ejercicio"}
                    </span>
                    {ex.name && (
                      <span className="text-xs font-medium text-gray-400 flex-shrink-0">
                        {ex.sets}×{ex.reps}
                      </span>
                    )}
                  </button>

                  {/* Chevron */}
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    aria-label={isExpanded ? "Colapsar" : "Expandir"}
                  >
                    <svg
                      className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(i)}
                      className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Eliminar ejercicio"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* ── Expanded fields ── */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-3 border-t border-gray-100">
                    <Input
                      label="Nombre del ejercicio"
                      placeholder="Ej: Press banca con barra"
                      value={ex.name}
                      onChange={(e) => updateEx(i, "name", e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Series"
                        type="number"
                        inputMode="numeric"
                        min="1" max="20"
                        value={ex.sets}
                        onChange={(e) => updateEx(i, "sets", parseInt(e.target.value) || 1)}
                      />
                      <Input
                        label="Reps"
                        placeholder="8-12"
                        value={ex.reps}
                        onChange={(e) => updateEx(i, "reps", e.target.value)}
                      />
                      <Input
                        label="Descanso (s)"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={ex.rest_seconds}
                        onChange={(e) => updateEx(i, "rest_seconds", parseInt(e.target.value) || 0)}
                      />
                    </div>

                    {/* ── Group selector ── */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Superserie / Circuito
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateEx(i, "superset_group", null)}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                            !ex.superset_group
                              ? "bg-gray-800 text-white border-gray-800"
                              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          Solo
                        </button>
                        {GROUP_LETTERS.map((letter) => {
                          const active = ex.superset_group === letter;
                          const c = getGroupColor(letter);
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => updateEx(i, "superset_group", letter)}
                              className="text-xs font-black px-3 py-1.5 rounded-full border transition-all"
                              style={{
                                backgroundColor: active ? c : c + "18",
                                color: active ? "#fff" : c,
                                borderColor: active ? c : c + "50",
                              }}
                            >
                              Grupo {letter}
                            </button>
                          );
                        })}
                      </div>
                      {ex.superset_group && (
                        <p className="text-xs text-gray-400">
                          {cnt} ejercicio{cnt !== 1 ? "s" : ""} en grupo {ex.superset_group}
                          {" · "}
                          <span style={{ color: getGroupColor(ex.superset_group) }} className="font-semibold">
                            {groupTypeName(cnt)}
                          </span>
                        </p>
                      )}
                    </div>

                    <Input
                      label="Video YouTube (opcional)"
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={ex.youtube_url}
                      onChange={(e) => updateEx(i, "youtube_url", e.target.value)}
                    />
                    <Textarea
                      label="Nota técnica (opcional)"
                      placeholder="Clave técnica, errores comunes..."
                      value={ex.technical_note}
                      onChange={(e) => updateEx(i, "technical_note", e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* ── Group connector between consecutive same-group exercises ── */}
              {linkedToNext && groupColor && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 border -mt-1"
                  style={{
                    backgroundColor: groupColor + "0e",
                    borderColor: groupColor + "35",
                  }}
                >
                  <div
                    className="w-0.5 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: groupColor + "80" }}
                  />
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: groupColor }}
                  >
                    {groupTypeName(cnt)} {ex.superset_group}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: groupColor + "30" }} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Add exercise — always visible */}
        <button
          type="button"
          onClick={() => addExercise()}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/30 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar ejercicio
        </button>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {isEdit ? "Guardar cambios" : "Crear rutina"}
      </Button>
    </form>
  );
}
