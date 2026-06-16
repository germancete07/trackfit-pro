"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/shared/ToastProvider";
import { createTemplateAction, updateTemplateAction, type DayDraft } from "@/app/dashboard/templates/actions";
import { ExerciseLibraryPicker, type PickedExercise } from "@/components/trainer/ExerciseLibraryPicker";
import { cn } from "@/lib/utils";
import type { SessionTemplate, TemplateExercise } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
  superset_group: string | null;
  library_exercise_id?: string | null;
}

interface ExWithId extends ExDraft { _id: number; }

interface DayState {
  _key: number;         // stable React key (client-only)
  id?: string | null;   // DB id for existing days
  day_number: number;
  name: string;
  exercises: ExWithId[];
}

const DRAFT_KEY = "tf-new-template-draft-v2";

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

function autoSortByBlock(exercises: ExWithId[]): ExWithId[] {
  const order = (g: string | null) => {
    if (!g) return GROUP_LETTERS.length;
    const i = GROUP_LETTERS.indexOf(g);
    return i === -1 ? GROUP_LETTERS.length : i;
  };
  return [...exercises].sort((a, b) => order(a.superset_group) - order(b.superset_group));
}

function emptyExFields(id: number): ExWithId {
  return { _id: id, name: "", sets: 3, reps: "8-12", rest_seconds: 90, youtube_url: "", technical_note: "", superset_group: null, library_exercise_id: null };
}

function mapTemplateExercises(exs: TemplateExercise[], idCounter: { current: number }): ExWithId[] {
  return exs.sort((a, b) => a.sort_order - b.sort_order).map(ex => ({
    _id: idCounter.current++,
    name: ex.name, sets: ex.sets, reps: ex.reps,
    rest_seconds: ex.rest_seconds ?? 90,
    youtube_url: ex.youtube_url ?? "",
    technical_note: ex.technical_note ?? "",
    superset_group: ex.superset_group ?? null,
    library_exercise_id: ex.library_exercise_id ?? null,
  }));
}

// ── BlockHeader ───────────────────────────────────────────────────────────────

function BlockHeader({ group, count }: { group: string; count: number }) {
  const color = getGroupColor(group);
  return (
    <div className="flex items-center gap-2 px-1 pt-3 pb-0.5">
      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>Bloque {group}</span>
      <span className="text-[10px] font-semibold" style={{ color: color + "99" }}>— {groupTypeName(count)}</span>
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

function JoinBlockPrompt({ block, onConfirm, onDismiss }: { block: string; onConfirm: () => void; onDismiss: () => void; }) {
  const color = getGroupColor(block);
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: color + "12", border: `0.5px solid ${color}40` }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color }}>El ejercicio quedó junto al bloque {block}</p>
        <p className="text-xs mt-0.5" style={{ color: color + "bb" }}>¿Querés unirlo a este bloque?</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button type="button" onClick={onDismiss} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1">No</button>
        <button type="button" onClick={onConfirm} className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: color }}>
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
  onMoveUp, onMoveDown, onDragStart, onDragEnter, onDragOver, onDrop, onDragEnd,
}: ExerciseRowProps) {
  const [localYt, setLocalYt] = useState(ex.youtube_url);
  const [localNote, setLocalNote] = useState(ex.technical_note);
  // String state so inputs can be temporarily empty without forcing to 0/1
  const [localSets, setLocalSets] = useState(String(ex.sets));
  const [localRest, setLocalRest] = useState(String(ex.rest_seconds));

  const prevYt = useRef(ex.youtube_url);
  const prevNote = useRef(ex.technical_note);
  if (prevYt.current !== ex.youtube_url) { prevYt.current = ex.youtube_url; if (localYt !== ex.youtube_url) setLocalYt(ex.youtube_url); }
  if (prevNote.current !== ex.technical_note) { prevNote.current = ex.technical_note; if (localNote !== ex.technical_note) setLocalNote(ex.technical_note); }

  const id = ex._id;

  return (
    <div
      onDragEnter={() => onDragEnter(index)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, index)}
      style={{ touchAction: "pan-y" }}
      className={cn(
        "rounded-2xl border bg-white transition-all duration-150",
        isDragging && "opacity-40 shadow-lg",
        isOver && "border-brand-400 ring-2 ring-brand-100 shadow-sm",
        !isOver && !isDragging && (isExpanded ? "border-brand-200 shadow-sm" : "border-gray-200")
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <div className="flex flex-col gap-px flex-shrink-0 sm:hidden -ml-0.5 mr-0.5">
          <button type="button" onClick={() => onMoveUp(id)} disabled={!canMoveUp}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors" aria-label="Subir">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
          </button>
          <button type="button" onClick={() => onMoveDown(id)} disabled={!canMoveDown}
            className="h-5 w-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors" aria-label="Bajar">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <div
          draggable
          onDragStart={e => onDragStart(e, index)}
          onDragEnd={onDragEnd}
          style={{ touchAction: "none" }}
          className="hidden sm:flex flex-shrink-0 cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-gray-300 hover:text-gray-500 transition-colors"
          title="Arrastrar para reordenar"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
          </svg>
        </div>

        {ex.superset_group && groupColor ? (
          <span className="text-[11px] font-black w-6 h-5 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: groupColor + "22", color: groupColor }}>{label}</span>
        ) : (
          <span className="text-xs font-black text-gray-300 w-4 text-center flex-shrink-0">{index + 1}</span>
        )}

        <button type="button" onClick={() => onToggleExpand(id)} className="flex-1 flex items-center gap-2 min-w-0 text-left py-0.5">
          <span className={cn("text-sm font-semibold flex-1 truncate", ex.name ? "text-gray-900" : "text-gray-400 italic")}>
            {ex.name || "Nuevo ejercicio"}
          </span>
          {ex.name && <span className="text-xs font-medium text-gray-400 flex-shrink-0">{ex.sets}×{ex.reps}</span>}
        </button>

        <button type="button" onClick={() => onToggleExpand(id)}
          className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors" aria-label={isExpanded ? "Colapsar" : "Expandir"}>
          <svg className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {totalCount > 1 && (
          <button type="button" onClick={() => onRemove(id)}
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Eliminar ejercicio">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-3 border-t border-gray-100">
          <div className="flex items-center gap-2 py-0.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Ejercicio</span>
            <span className="text-sm font-semibold text-gray-900 flex-1 truncate">{ex.name || "Sin nombre"}</span>
            {ex.library_exercise_id && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 flex-shrink-0">Biblioteca</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label="Series" type="number" inputMode="numeric" min="1" max="20"
              value={localSets}
              onChange={e => setLocalSets(e.target.value)}
              onBlur={() => { const v = parseInt(localSets); onUpdateField(id, "sets", isNaN(v) ? 1 : Math.max(1, v)); setLocalSets(String(isNaN(v) ? 1 : Math.max(1, v))); }} />
            <Input label="Reps" placeholder="8-12" value={ex.reps}
              onChange={e => onUpdateField(id, "reps", e.target.value)} />
            <Input label="Descanso (s)" type="number" inputMode="numeric" min="0"
              value={localRest}
              onChange={e => setLocalRest(e.target.value)}
              onBlur={() => { const v = parseInt(localRest); onUpdateField(id, "rest_seconds", isNaN(v) ? 0 : Math.max(0, v)); setLocalRest(String(isNaN(v) ? 0 : Math.max(0, v))); }} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bloque / Superserie</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => onUpdateBlock(id, null)}
                className={cn("text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
                  !ex.superset_group ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")}>
                Sin bloque
              </button>
              {GROUP_LETTERS.map(letter => {
                const active = ex.superset_group === letter;
                const c = getGroupColor(letter);
                return (
                  <button key={letter} type="button" onClick={() => onUpdateBlock(id, letter)}
                    className="text-xs font-black px-3 py-1.5 rounded-full border transition-all min-w-[2.5rem]"
                    style={{ backgroundColor: active ? c : c + "18", color: active ? "#fff" : c, borderColor: active ? c : c + "50" }}>
                    {letter}
                  </button>
                );
              })}
            </div>
            {ex.superset_group && (
              <p className="text-xs text-gray-400">
                {groupCount} ejercicio{groupCount !== 1 ? "s" : ""} en bloque {ex.superset_group}
                {" · "}<span style={{ color: getGroupColor(ex.superset_group) }} className="font-semibold">{groupTypeName(groupCount)}</span>
                {" · "}<span className="text-gray-400">Se reordena automáticamente</span>
              </p>
            )}
          </div>

          <Input label="Video YouTube (opcional)" type="url" placeholder="youtube.com/watch?v=..., youtu.be/..., /shorts/..." value={localYt}
            onChange={e => { setLocalYt(e.target.value); onUpdateField(id, "youtube_url", e.target.value); }}
            onBlur={() => onUpdateField(id, "youtube_url", localYt)} />
          <Textarea label="Nota técnica (opcional)" placeholder="Clave técnica, errores comunes..." value={localNote}
            onChange={e => { setLocalNote(e.target.value); onUpdateField(id, "technical_note", e.target.value); }}
            onBlur={() => onUpdateField(id, "technical_note", localNote)} rows={2} />
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
  const [trainingType, setTrainingType] = useState(template?.training_type ?? "");

  const nextIdRef = useRef(0);

  // ── Day state ─────────────────────────────────────────────────────────────

  const [days, setDays] = useState<DayState[]>(() => {
    if (template) {
      const routineDays = template.routine_days;
      if (routineDays && routineDays.length > 0) {
        return routineDays
          .sort((a, b) => a.day_number - b.day_number)
          .map(day => ({
            _key: nextIdRef.current++,
            id: day.id,
            day_number: day.day_number,
            name: day.name || `Día ${day.day_number}`,
            exercises: mapTemplateExercises(day.template_exercises ?? [], nextIdRef),
          }));
      }
      // Backward compat: old template without routine_days
      return [{
        _key: nextIdRef.current++,
        id: null,
        day_number: 1,
        name: "Día 1",
        exercises: mapTemplateExercises(template.template_exercises ?? [], nextIdRef),
      }];
    }
    const firstKey = nextIdRef.current++;
    return [{
      _key: firstKey,
      id: null,
      day_number: 1,
      name: "Día 1",
      exercises: [],
    }];
  });

  const [activeDayKey, setActiveDayKey] = useState<number>(() => days[0]?._key ?? 0);

  const activeDayIdx = days.findIndex(d => d._key === activeDayKey);
  const activeDay = days[activeDayIdx >= 0 ? activeDayIdx : 0];

  // ── Form UI state ─────────────────────────────────────────────────────────

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [joinPrompt, setJoinPrompt] = useState<{ id: number; block: string } | null>(null);

  const exercisesRef = useRef<ExWithId[]>(activeDay?.exercises ?? []);
  useEffect(() => { exercisesRef.current = activeDay?.exercises ?? []; }, [activeDay]);

  // ── Draft autosave (new format v2) ────────────────────────────────────────

  const [hasDraft, setHasDraft] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      const hasContent = draft.name?.trim() ||
        draft.days?.some((d: { exercises: ExDraft[] }) => d.exercises?.some((e: ExDraft) => e.name?.trim()));
      if (hasContent) setHasDraft(true);
    } catch { /* ignore */ }
  }, [isEdit]);

  const draftRef = useRef({ name, description, days });
  useEffect(() => { draftRef.current = { name, description, days }; }, [name, description, days]);

  useEffect(() => {
    if (isEdit) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name, description,
          days: days.map(d => ({
            id: d.id, day_number: d.day_number, name: d.name,
            exercises: d.exercises.map(({ _id, ...rest }) => rest),
          })),
        }));
      } catch { /* ignore */ }
    }, 1000);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [name, description, days, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    return () => {
      const { name: n, description: d, days: ds } = draftRef.current;
      const hasContent = n?.trim() || ds?.some(day => day.exercises?.some(ex => ex.name?.trim()));
      if (hasContent) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            name: n, description: d,
            days: ds.map(day => ({
              id: day.id, day_number: day.day_number, name: day.name,
              exercises: day.exercises.map(({ _id, ...rest }) => rest),
            })),
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
      const restoredDays: DayState[] = (draft.days ?? []).map((d: {
        id?: string; day_number: number; name: string; exercises: Partial<ExDraft>[];
      }) => ({
        _key: nextIdRef.current++,
        id: d.id ?? null,
        day_number: d.day_number,
        name: d.name,
        exercises: (d.exercises ?? []).map((ex) => ({
          _id: nextIdRef.current++,
          name: ex.name ?? "", sets: ex.sets ?? 3, reps: ex.reps ?? "8-12",
          rest_seconds: ex.rest_seconds ?? 90, youtube_url: ex.youtube_url ?? "",
          technical_note: ex.technical_note ?? "", superset_group: ex.superset_group ?? null,
        })),
      }));
      setName(draft.name ?? "");
      setDescription(draft.description ?? "");
      const finalDays = restoredDays.length > 0 ? restoredDays : [{
        _key: nextIdRef.current++, id: null, day_number: 1, name: "Día 1",
        exercises: [emptyExFields(nextIdRef.current++)],
      }];
      setDays(finalDays);
      setActiveDayKey(finalDays[0]._key);
      setHasDraft(false);
    } catch { /* ignore */ }
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setHasDraft(false);
  }

  // ── Day management ────────────────────────────────────────────────────────

  function addDay() {
    const newKey = nextIdRef.current++;
    const newDayNumber = days.length + 1;
    const newDay: DayState = {
      _key: newKey,
      id: null,
      day_number: newDayNumber,
      name: `Día ${newDayNumber}`,
      exercises: [],
    };
    setDays(prev => [...prev, newDay]);
    setActiveDayKey(newKey);
  }

  function removeDay(dayKey: number) {
    if (days.length <= 1) return;
    const newDays = days
      .filter(d => d._key !== dayKey)
      .map((d, i) => ({ ...d, day_number: i + 1 }));
    setDays(newDays);
    if (activeDayKey === dayKey) {
      setActiveDayKey(newDays[0]?._key ?? days[0]._key);
    }
  }

  function updateDayName(dayKey: number, newName: string) {
    setDays(prev => prev.map(d => d._key === dayKey ? { ...d, name: newName } : d));
  }

  // ── Exercise handlers (scoped to active day) ──────────────────────────────

  const onUpdateField = useCallback((id: number, field: keyof ExDraft, value: string | number | null) => {
    setDays(prev => prev.map(d => d._key !== activeDayKey ? d : {
      ...d,
      exercises: d.exercises.map(ex => ex._id === id ? { ...ex, [field]: value } : ex),
    }));
  }, [activeDayKey]);

  const onUpdateBlock = useCallback((id: number, newGroup: string | null) => {
    setJoinPrompt(null);
    setDays(prev => prev.map(d => d._key !== activeDayKey ? d : {
      ...d,
      exercises: autoSortByBlock(d.exercises.map(ex => ex._id === id ? { ...ex, superset_group: newGroup } : ex)),
    }));
  }, [activeDayKey]);

  const addExercise = useCallback((presetEx?: Partial<ExDraft>) => {
    const newId = nextIdRef.current++;
    setDays(prev => prev.map(d => d._key !== activeDayKey ? d : {
      ...d,
      exercises: [...d.exercises, { ...emptyExFields(newId), ...(presetEx ?? {}), _id: newId, superset_group: null }],
    }));
    setExpandedId(newId);
  }, [activeDayKey]);

  const removeExercise = useCallback((id: number) => {
    setDays(prev => prev.map(d => d._key !== activeDayKey ? d : {
      ...d,
      exercises: d.exercises.filter(ex => ex._id !== id),
    }));
    setExpandedId(prev => prev === id ? null : prev);
  }, [activeDayKey]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const onMoveUp = useCallback((id: number) => {
    setDays(prev => prev.map(d => {
      if (d._key !== activeDayKey) return d;
      const idx = d.exercises.findIndex(ex => ex._id === id);
      if (idx <= 0) return d;
      const arr = [...d.exercises];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return { ...d, exercises: arr };
    }));
  }, [activeDayKey]);

  const onMoveDown = useCallback((id: number) => {
    setDays(prev => prev.map(d => {
      if (d._key !== activeDayKey) return d;
      const idx = d.exercises.findIndex(ex => ex._id === id);
      if (idx === -1 || idx >= d.exercises.length - 1) return d;
      const arr = [...d.exercises];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return { ...d, exercises: arr };
    }));
  }, [activeDayKey]);

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
      setDays(prev => prev.map(d => {
        if (d._key !== activeDayKey) return d;
        const fromIdx = d.exercises.findIndex(ex => ex._id === fromId);
        if (fromIdx === -1 || fromIdx === targetIdx) return d;
        const arr = [...d.exercises];
        const [moved] = arr.splice(fromIdx, 1);
        const finalIdx = fromIdx < targetIdx ? targetIdx - 1 : targetIdx;
        arr.splice(finalIdx, 0, moved);
        const before = arr[finalIdx - 1];
        const after = arr[finalIdx + 1];
        const neighbor = [before, after].find(n => n?.superset_group && n.superset_group !== moved.superset_group);
        if (neighbor?.superset_group) setJoinPrompt({ id: fromId, block: neighbor.superset_group });
        return { ...d, exercises: arr };
      }));
      setDropTargetIdx(null);
      return null;
    });
  }, [activeDayKey]);

  const resetDrag = useCallback(() => {
    setDragId(null);
    setDropTargetIdx(null);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Ingresá un nombre para la rutina"); return; }
    for (const day of days) {
      if (day.exercises.length === 0) { setError(`${day.name} no tiene ejercicios`); return; }
      if (day.exercises.some(ex => !ex.name.trim())) {
        setError(`Todos los ejercicios de "${day.name}" necesitan nombre`);
        return;
      }
    }
    setError("");
    setLoading(true);

    const categoryId = template?.category_id ?? defaultCategoryId ?? null;
    const daysToSave: DayDraft[] = days.map((day, i) => ({
      id: day.id ?? undefined,
      day_number: i + 1,
      name: day.name.trim() || `Día ${i + 1}`,
      exercises: day.exercises.map(({ _id, ...rest }) => rest),
    }));

    const result = isEdit
      ? await updateTemplateAction(template!.id, name, description, daysToSave, categoryId, trainingType || null)
      : await createTemplateAction(name, description, daysToSave, categoryId, trainingType || null);

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

  const exercises = activeDay?.exercises ?? [];
  const hasAnyBlock = exercises.some(ex => ex.superset_group);
  let prevGroup: string | null | undefined = undefined;
  let seenFirstNoBlock = false;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6">
      {/* Draft banner */}
      {hasDraft && (
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "rgba(83,74,183,0.07)", border: "0.5px solid rgba(83,74,183,0.25)" }}>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: "#534AB7" }}>💾 Tenés un borrador guardado</p>
            <p className="text-xs text-gray-500 mt-0.5">¿Querés recuperarlo?</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={discardDraft} className="text-xs font-semibold text-gray-400 hover:text-gray-600 px-2 py-1">Descartar</button>
            <button type="button" onClick={restoreDraft} className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}>Recuperar</button>
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
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Tipo de entrenamiento</label>
          <select
            value={trainingType}
            onChange={e => setTrainingType(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Sin tipo especificado</option>
            <option value="adaptacion">Adaptación</option>
            <option value="fuerza">Fuerza</option>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="resistencia">Resistencia</option>
            <option value="funcional">Funcional</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </Card>

      {/* Library picker */}
      {showPicker && (
        <ExerciseLibraryPicker
          onSelect={(ex: PickedExercise) => addExercise({ ...ex })}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── Day tabs ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {days.map(day => (
            <div key={day._key} className="flex items-center gap-0 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setActiveDayKey(day._key); setJoinPrompt(null); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold antialiased transition-all rounded-l-xl",
                  days.length > 1 ? "rounded-r-none" : "rounded-xl",
                  activeDayKey === day._key
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {day.name || `Día ${day.day_number}`}
              </button>
              {days.length > 1 && (
                <button
                  type="button"
                  title={`Eliminar ${day.name}`}
                  onClick={() => removeDay(day._key)}
                  className={cn(
                    "h-[2.125rem] w-6 flex items-center justify-center rounded-r-xl text-[10px] transition-all border-l",
                    activeDayKey === day._key
                      ? "bg-brand-700 text-white/70 hover:text-white border-brand-700"
                      : "bg-gray-100 text-gray-300 hover:text-red-500 hover:bg-red-50 border-gray-200"
                  )}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addDay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand-600 border border-dashed border-gray-200 flex-shrink-0 transition-all"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar día
          </button>
        </div>

        {/* Day name input */}
        {activeDay && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Nombre:</span>
            <input
              type="text"
              value={activeDay.name}
              onChange={e => updateDayName(activeDayKey, e.target.value)}
              placeholder={`Día ${activeDayIdx + 1}`}
              maxLength={40}
              className="flex-1 text-sm font-semibold text-gray-700 bg-transparent border-b border-gray-200 focus:border-brand-400 outline-none pb-0.5 transition-colors min-w-0"
            />
          </div>
        )}

        {/* Exercise list header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Ejercicios ({exercises.length})
          </h2>
        </div>

        {/* Exercises */}
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
                ex={ex} index={i} totalCount={exercises.length}
                isExpanded={expandedId === ex._id}
                isDragging={isDragging} isOver={isOver}
                groupColor={groupColor} groupCount={cnt} label={lbl}
                canMoveUp={i > 0} canMoveDown={i < exercises.length - 1}
                onToggleExpand={toggleExpand} onUpdateField={onUpdateField}
                onUpdateBlock={onUpdateBlock} onRemove={removeExercise}
                onMoveUp={onMoveUp} onMoveDown={onMoveDown}
                onDragStart={onDragStart} onDragEnter={onDragEnter}
                onDragOver={onDragOver} onDrop={onDrop} onDragEnd={resetDrag}
              />
            </React.Fragment>
          );
        })}

        {joinPrompt && (
          <JoinBlockPrompt
            block={joinPrompt.block}
            onConfirm={() => { onUpdateBlock(joinPrompt.id, joinPrompt.block); setJoinPrompt(null); }}
            onDismiss={() => setJoinPrompt(null)}
          />
        )}

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/30 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar ejercicio desde biblioteca
        </button>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {isEdit ? "Guardar cambios" : "Crear rutina"}
      </Button>
    </form>
  );
}
