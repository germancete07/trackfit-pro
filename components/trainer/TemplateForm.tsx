"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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

// ── Types ─────────────────────────────────────────────────────────────────────

/** Server-facing exercise shape — NO _id */
interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
  superset_group: string | null;
}

/** Client-only — carries a stable React key */
interface ExWithId extends ExDraft { _id: number; }

const DRAFT_KEY = "tf-new-template-draft";

// ── Group helpers ─────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  A: "#3b82f6", B: "#10b981", C: "#8b5cf6", D: "#f59e0b", E: "#ec4899",
};
const GROUP_LETTERS = ["A", "B", "C", "D", "E"];

function getGroupColor(grp: string): string { return GROUP_COLORS[grp] ?? "#6b7280"; }

function groupLabel(exercises: ExWithId[], i: number): string {
  const grp = exercises[i].superset_group;
  if (!grp) return String(i + 1);
  const before = exercises.slice(0, i).filter(e => e.superset_group === grp).length;
  return `${grp}${before + 1}`;
}

function countInGroup(exercises: ExWithId[], grp: string): number {
  return exercises.filter(e => e.superset_group === grp).length;
}

function groupTypeName(count: number): string { return count >= 3 ? "Circuito" : "Superserie"; }

/**
 * Sort exercises so blocks appear in A→B→C→…→no-block order.
 * Stable sort: relative order within each block is preserved.
 */
function autoSortByBlock(exercises: ExWithId[]): ExWithId[] {
  const order = (g: string | null) => {
    if (!g) return GROUP_LETTERS.length;
    const i = GROUP_LETTERS.indexOf(g);
    return i === -1 ? GROUP_LETTERS.length : i;
  };
  return [...exercises].sort((a, b) => order(a.superset_group) - order(b.superset_group));
}

function emptyExFields(id: number): ExWithId {
  return { _id: id, name: "", sets: 3, reps: "8-12", rest_seconds: 90, youtube_url: "", technical_note: "", superset_group: null };
}

// ── BlockHeader ───────────────────────────────────────────────────────────────

function BlockHeader({ group, count }: { group: string; count: number }) {
  const color = getGroupColor(group);
  const type = groupTypeName(count);
  return (
    <div className="flex items-center gap-2 px-1 pt-3 pb-0.5">
      <div
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>
        Bloque {group}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: color + "99" }}>
        — {type}
      </span>
      <div className="flex-1 h-px" style={{ background: `${color}35` }} />
      <span className="text-[10px] font-medium text-gray-400">{count} ej.</span>
    </div>
  );
}

function NoBlockHeader() {
  return (
    <div className="flex items-center gap-2 px-1 pt-3 pb-0.5">
      <div className="h-2 w-2 rounded-full flex-shrink-0 bg-gray-300" />
      <span className="text-xs font-semibold text-gray-400">Sin bloque</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ── JoinBlockPrompt ───────────────────────────────────────────────────────────

interface JoinPromptProps {
  block: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

function JoinBlockPrompt({ block, onConfirm, onDismiss }: JoinPromptProps) {
  const color = getGroupColor(block);
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: color + "12", border: `0.5px solid ${color}40` }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color }}>
          El ejercicio quedó junto al bloque {block}
        </p>
        <p className="text-xs mt-0.5" style={{ color: color + "bb" }}>¿Querés unirlo a este bloque?</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          No
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
          style={{ background: color }}
        >
          Unir al {block}
        </button>
      </div>
    </div>
  );
}

// ── ExerciseRow ───────────────────────────────────────────────────────────────

interface ExerciseRowProps {
  ex: ExWithId;
  index: number;
  totalCount: number;
  isExpanded: boolean;
  isDragging: boolean;
  isOver: boolean;
  groupColor: string | null;
  groupCount: number;
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleExpand: (id: number) => void;
  onUpdateField: (id: number, field: keyof ExDraft, value: string | number | null) => void;
  onUpdateBlock: (id: number, newGroup: string | null) => void;
  onRemove: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragEnter: (idx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
}

const ExerciseRow = React.memo(function ExerciseRow({
  ex, index, totalCount, isExpanded, isDragging, isOver,
  groupColor, groupCount, label, canMoveUp, canMoveDown,
  onToggleExpand, onUpdateField, onUpdateBlock, onRemove,
  onMoveUp, onMoveDown,
  onDragStart, onDragEnter, onDragOver, onDrop, onDragEnd,
}: ExerciseRowProps) {
  // Local state for slow fields — only syncs to parent on blur
  const [localYt, setLocalYt] = useState(ex.youtube_url);
  const [localNote, setLocalNote] = useState(ex.technical_note);

  // Sync from parent on external changes
  const prevYt = useRef(ex.youtube_url);
  const prevNote = useRef(ex.technical_note);
  if (prevYt.current !== ex.youtube_url) { prevYt.current = ex.youtube_url; if (localYt !== ex.youtube_url) setLocalYt(ex.youtube_url); }
  if (prevNote.current !== ex.technical_note) { prevNote.current = ex.technical_note; if (localNote !== ex.technical_note) setLocalNote(ex.technical_note); }

  const id = ex._id;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, index)}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-2xl border bg-white transition-all duration-150",
        isDragging && "opacity-40 shadow-lg",
        isOver && "border-brand-400 ring-2 ring-brand-100 shadow-sm",
        !isOver && !isDragging && (isExpanded ? "border-brand-200 shadow-sm" : "border-gray-200")
      )}
    >
      {/* ── Collapsed summary row ── */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">

        {/* Mobile: up/down arrows */}
        <div className="flex flex-col gap-px flex-shrink-0 sm:hidden -ml-0.5 mr-0.5">
          <button
            type="button"
            onClick={() => onMoveUp(id)}
            disabled={!canMoveUp}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
            aria-label="Subir"
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(id)}
            disabled={!canMoveDown}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
            aria-label="Bajar"
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Desktop: drag handle */}
        <div
          className="hidden sm:flex flex-shrink-0 cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-gray-300 hover:text-gray-500 transition-colors"
          title="Arrastrar para reordenar"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
          </svg>
        </div>

        {/* Number / group badge */}
        {ex.superset_group && groupColor ? (
          <span
            className="text-[11px] font-black w-6 h-5 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: groupColor + "22", color: groupColor }}
          >
            {label}
          </span>
        ) : (
          <span className="text-xs font-black text-gray-300 w-4 text-center flex-shrink-0">
            {index + 1}
          </span>
        )}

        {/* Name + sets×reps (tap to expand) */}
        <button
          type="button"
          onClick={() => onToggleExpand(id)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left py-0.5"
        >
          <span className={cn("text-sm font-semibold flex-1 truncate", ex.name ? "text-gray-900" : "text-gray-400 italic")}>
            {ex.name || "Nuevo ejercicio"}
          </span>
          {ex.name && (
            <span className="text-xs font-medium text-gray-400 flex-shrink-0">{ex.sets}×{ex.reps}</span>
          )}
        </button>

        {/* Chevron */}
        <button
          type="button"
          onClick={() => onToggleExpand(id)}
          className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label={isExpanded ? "Colapsar" : "Expandir"}
        >
          <svg className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {totalCount > 1 && (
          <button
            type="button"
            onClick={() => onRemove(id)}
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
            onChange={e => onUpdateField(id, "name", e.target.value)}
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Series"
              type="number"
              inputMode="numeric"
              min="1" max="20"
              value={ex.sets}
              onChange={e => onUpdateField(id, "sets", parseInt(e.target.value) || 1)}
            />
            <Input
              label="Reps"
              placeholder="8-12"
              value={ex.reps}
              onChange={e => onUpdateField(id, "reps", e.target.value)}
            />
            <Input
              label="Descanso (s)"
              type="number"
              inputMode="numeric"
              min="0"
              value={ex.rest_seconds}
              onChange={e => onUpdateField(id, "rest_seconds", parseInt(e.target.value) || 0)}
            />
          </div>

          {/* ── Block selector ── */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bloque / Superserie</p>
            <div className="flex flex-wrap gap-1.5">
              {/* "Sin bloque" */}
              <button
                type="button"
                onClick={() => onUpdateBlock(id, null)}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                  !ex.superset_group
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                )}
              >
                Sin bloque
              </button>
              {GROUP_LETTERS.map(letter => {
                const active = ex.superset_group === letter;
                const c = getGroupColor(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => onUpdateBlock(id, letter)}
                    className="text-xs font-black px-3 py-1.5 rounded-full border transition-all min-w-[2.5rem]"
                    style={{
                      backgroundColor: active ? c : c + "18",
                      color: active ? "#fff" : c,
                      borderColor: active ? c : c + "50",
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            {ex.superset_group && (
              <p className="text-xs text-gray-400">
                {groupCount} ejercicio{groupCount !== 1 ? "s" : ""} en bloque {ex.superset_group}
                {" · "}
                <span style={{ color: getGroupColor(ex.superset_group) }} className="font-semibold">
                  {groupTypeName(groupCount)}
                </span>
                {" · "}
                <span className="text-gray-400">Se reordena automáticamente</span>
              </p>
            )}
          </div>

          {/* YouTube — local state + onBlur */}
          <Input
            label="Video YouTube (opcional)"
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={localYt}
            onChange={e => setLocalYt(e.target.value)}
            onBlur={() => onUpdateField(id, "youtube_url", localYt)}
          />
          {/* Note — local state + onBlur */}
          <Textarea
            label="Nota técnica (opcional)"
            placeholder="Clave técnica, errores comunes..."
            value={localNote}
            onChange={e => setLocalNote(e.target.value)}
            onBlur={() => onUpdateField(id, "technical_note", localNote)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
});

// ── Main form ─────────────────────────────────────────────────────────────────

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

  // nextIdRef always holds the next available stable _id
  const nextIdRef = useRef(0);

  const [exercises, setExercises] = useState<ExWithId[]>(() => {
    if (template?.template_exercises?.length) {
      return template.template_exercises
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(ex => ({
          _id: nextIdRef.current++,
          name: ex.name, sets: ex.sets, reps: ex.reps,
          rest_seconds: ex.rest_seconds ?? 90,
          youtube_url: ex.youtube_url ?? "",
          technical_note: ex.technical_note ?? "",
          superset_group: ex.superset_group ?? null,
        }));
    }
    return [emptyExFields(nextIdRef.current++)]; // _id = 0
  });

  // Track expanded by _id (survives auto-sort reordering)
  const [expandedId, setExpandedId] = useState<number | null>(isEdit ? null : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  // DnD — track by _id (not index)
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [joinPrompt, setJoinPrompt] = useState<{ id: number; block: string } | null>(null);

  // Ref to current exercises for stable DnD callbacks
  const exercisesRef = useRef<ExWithId[]>(exercises);
  useEffect(() => { exercisesRef.current = exercises; }, [exercises]);

  // ── Draft autosave ────────────────────────────────────────────────────────

  const [hasDraft, setHasDraft] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      const hasContent = draft.name?.trim() || draft.exercises?.some((e: ExDraft) => e.name?.trim());
      if (hasContent) setHasDraft(true);
    } catch { /* ignore */ }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        // Strip _id before saving
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name, description,
          exercises: exercises.map(({ _id, ...rest }) => rest),
        }));
      } catch { /* ignore */ }
    }, 1000);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [name, description, exercises, isEdit]);

  const draftRef = useRef({ name, description, exercises });
  useEffect(() => { draftRef.current = { name, description, exercises }; }, [name, description, exercises]);
  useEffect(() => {
    if (isEdit) return;
    return () => {
      const { name: n, description: d, exercises: e } = draftRef.current;
      const hasContent = n?.trim() || e?.some(ex => ex.name?.trim());
      if (hasContent) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            name: n, description: d,
            exercises: e.map(({ _id, ...rest }) => rest),
          }));
        } catch { /* ignore */ }
      }
    };
  }, [isEdit]);

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      const restored: ExWithId[] = (draft.exercises ?? []).map((ex: Partial<ExDraft>) => ({
        _id: nextIdRef.current++,
        name: ex.name ?? "", sets: ex.sets ?? 3, reps: ex.reps ?? "8-12",
        rest_seconds: ex.rest_seconds ?? 90, youtube_url: ex.youtube_url ?? "",
        technical_note: ex.technical_note ?? "", superset_group: ex.superset_group ?? null,
      }));
      setName(draft.name ?? "");
      setDescription(draft.description ?? "");
      setExercises(restored.length ? restored : [emptyExFields(nextIdRef.current++)]);
      setHasDraft(false);
    } catch { /* ignore */ }
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setHasDraft(false);
  }

  // ── Stable handlers ───────────────────────────────────────────────────────

  /** Update any field EXCEPT superset_group (no auto-sort) */
  const onUpdateField = useCallback((id: number, field: keyof ExDraft, value: string | number | null) => {
    setExercises(prev => prev.map(ex => ex._id === id ? { ...ex, [field]: value } : ex));
  }, []);

  /** Update superset_group → triggers auto-sort */
  const onUpdateBlock = useCallback((id: number, newGroup: string | null) => {
    setJoinPrompt(null);
    setExercises(prev => {
      const updated = prev.map(ex => ex._id === id ? { ...ex, superset_group: newGroup } : ex);
      return autoSortByBlock(updated);
    });
  }, []);

  const addExercise = useCallback((presetEx?: Partial<ExDraft>) => {
    const newId = nextIdRef.current++;
    setExercises(prev => [
      ...prev,
      { ...emptyExFields(newId), ...(presetEx ?? {}), _id: newId, superset_group: null },
    ]);
    setExpandedId(newId);
  }, []);

  const removeExercise = useCallback((id: number) => {
    setExercises(prev => prev.filter(ex => ex._id !== id));
    setExpandedId(prev => prev === id ? null : prev);
  }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const onMoveUp = useCallback((id: number) => {
    setExercises(prev => {
      const idx = prev.findIndex(ex => ex._id === id);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }, []);

  const onMoveDown = useCallback((id: number) => {
    setExercises(prev => {
      const idx = prev.findIndex(ex => ex._id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }, []);

  // DnD
  const onDragStart = useCallback((e: React.DragEvent, idx: number) => {
    const id = exercisesRef.current[idx]?._id ?? null;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragEnter = useCallback((idx: number) => {
    setDragId(fromId => {
      if (fromId !== null) setDropTargetIdx(idx);
      return fromId;
    });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragId(fromId => {
      if (fromId === null) { setDropTargetIdx(null); return null; }
      setExercises(prev => {
        const fromIdx = prev.findIndex(ex => ex._id === fromId);
        if (fromIdx === -1 || fromIdx === targetIdx) return prev;
        const arr = [...prev];
        const [moved] = arr.splice(fromIdx, 1);
        const finalIdx = fromIdx < targetIdx ? targetIdx - 1 : targetIdx;
        arr.splice(finalIdx, 0, moved);

        // Suggest joining a nearby block
        const before = arr[finalIdx - 1];
        const after = arr[finalIdx + 1];
        const neighbor = [before, after].find(
          n => n?.superset_group && n.superset_group !== moved.superset_group
        );
        if (neighbor?.superset_group) {
          setJoinPrompt({ id: fromId, block: neighbor.superset_group });
        }

        return arr;
      });
      setDropTargetIdx(null);
      return null;
    });
  }, []);

  const resetDrag = useCallback(() => {
    setDragId(null);
    setDropTargetIdx(null);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Ingresá un nombre para la rutina"); return; }
    if (exercises.some(ex => !ex.name.trim())) { setError("Todos los ejercicios necesitan nombre"); return; }
    setError("");
    setLoading(true);

    const categoryId = template?.category_id ?? defaultCategoryId ?? null;
    // Strip _id before sending to server
    const exToSave = exercises.map(({ _id, ...rest }) => rest);
    const result = isEdit
      ? await updateTemplateAction(template!.id, name, description, exToSave, categoryId)
      : await createTemplateAction(name, description, exToSave, categoryId);

    setLoading(false);
    if (result && "error" in result) {
      setError((result as { error: string }).error ?? "Error desconocido");
      return;
    }
    if (isEdit) {
      showToast("Rutina actualizada");
    } else {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      if (result && "redirectTo" in result) {
        router.push((result as { redirectTo: string }).redirectTo);
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasAnyBlock = exercises.some(ex => ex.superset_group);
  let prevGroup: string | null | undefined = undefined;
  let seenFirstNoBlock = false;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6">
      {/* Draft banner */}
      {hasDraft && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "rgba(83,74,183,0.07)", border: "0.5px solid rgba(83,74,183,0.25)" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: "#534AB7" }}>💾 Tenés un borrador guardado</p>
            <p className="text-xs text-gray-500 mt-0.5">¿Querés recuperarlo?</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={discardDraft} className="text-xs font-semibold text-gray-400 hover:text-gray-600 px-2 py-1">
              Descartar
            </button>
            <button type="button" onClick={restoreDraft} className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}>
              Recuperar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Routine info */}
      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Datos de la rutina</h2>
        <Input label="Nombre" placeholder="Ej: Tren superior — Fuerza" value={name} onChange={e => setName(e.target.value)} required />
        <Textarea label="Descripción (opcional)" placeholder="Para qué sirve esta rutina..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
      </Card>

      {/* Library picker */}
      {showPicker && (
        <ExerciseLibraryPicker
          onSelect={ex => addExercise({ ...ex })}
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

        {/* Exercises with block headers */}
        {exercises.map((ex, i) => {
          const currentGroup = ex.superset_group;
          const showBlockHeader = currentGroup !== prevGroup && !!currentGroup;
          const showNoBlockHeader = hasAnyBlock && !currentGroup && !seenFirstNoBlock;

          if (showBlockHeader) prevGroup = currentGroup;
          if (showNoBlockHeader) { seenFirstNoBlock = true; prevGroup = null; }

          const isDragging = dragId === ex._id;
          const isOver = dropTargetIdx === i && dragId !== null;
          const groupColor = currentGroup ? getGroupColor(currentGroup) : null;
          const cnt = currentGroup ? countInGroup(exercises, currentGroup) : 0;
          const lbl = groupLabel(exercises, i);

          return (
            <React.Fragment key={ex._id}>
              {showBlockHeader && <BlockHeader group={currentGroup!} count={countInGroup(exercises, currentGroup!)} />}
              {showNoBlockHeader && <NoBlockHeader />}
              <ExerciseRow
                ex={ex}
                index={i}
                totalCount={exercises.length}
                isExpanded={expandedId === ex._id}
                isDragging={isDragging}
                isOver={isOver}
                groupColor={groupColor}
                groupCount={cnt}
                label={lbl}
                canMoveUp={i > 0}
                canMoveDown={i < exercises.length - 1}
                onToggleExpand={toggleExpand}
                onUpdateField={onUpdateField}
                onUpdateBlock={onUpdateBlock}
                onRemove={removeExercise}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onDragStart={onDragStart}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={resetDrag}
              />
            </React.Fragment>
          );
        })}

        {/* Join block prompt (shown after DnD) */}
        {joinPrompt && (
          <JoinBlockPrompt
            block={joinPrompt.block}
            onConfirm={() => { onUpdateBlock(joinPrompt.id, joinPrompt.block); setJoinPrompt(null); }}
            onDismiss={() => setJoinPrompt(null)}
          />
        )}

        {/* Add exercise */}
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
