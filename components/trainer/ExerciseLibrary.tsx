"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import {
  createLibraryExerciseAction,
  updateLibraryExerciseAction,
  deleteLibraryExerciseAction,
} from "@/app/dashboard/library/actions";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/types";

const PATTERNS = [
  { value: "rodilla",   label: "Rodilla dominante",    color: "#3b82f6" },
  { value: "cadera",    label: "Cadera dominante",     color: "#8b5cf6" },
  { value: "unilateral",label: "Unilateral",           color: "#10b981" },
  { value: "empuje-h",  label: "Empuje horizontal",    color: "#f59e0b" },
  { value: "empuje-v",  label: "Empuje vertical",      color: "#f97316" },
  { value: "tiron-h",   label: "Tirón horizontal",     color: "#ef4444" },
  { value: "tiron-v",   label: "Tirón vertical",       color: "#6366f1" },
  { value: "core",      label: "Core",                 color: "#0891b2" },
  { value: "potencia",  label: "Potencia / Pliométrico", color: "#dc2626" },
  { value: "funcional", label: "Funcional / Cardio",   color: "#16a34a" },
];

const LEVELS = [
  { value: 1, label: "Principiante", color: "#16a34a", bg: "#dcfce7" },
  { value: 2, label: "Intermedio",   color: "#b45309", bg: "#fef3c7" },
  { value: 3, label: "Avanzado",     color: "#7c3aed", bg: "#ede9fe" },
];

const EMPTY_FORM = {
  name: "", name_en: "", pattern: "", muscle_primary: "",
  muscle_secondary: "", equipment: "", level: 2,
  youtube_url: "", description: "",
};

function patternInfo(p: string | null) {
  return PATTERNS.find(x => x.value === p) ?? null;
}
function levelInfo(l: number | null) {
  return LEVELS.find(x => x.value === l) ?? LEVELS[1];
}

interface Props { exercises: ExerciseLibraryItem[]; trainerId: string; }

export function ExerciseLibrary({ exercises: initial, trainerId }: Props) {
  const { showToast } = useToast();
  const [exercises, setExercises] = useState(initial);
  const [filterPattern, setFilterPattern] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const displayed = exercises.filter(ex => {
    const matchPattern = !filterPattern || ex.pattern === filterPattern;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      ex.name.toLowerCase().includes(q) ||
      (ex.name_en ?? "").toLowerCase().includes(q) ||
      (ex.muscle_primary ?? ex.muscle_group ?? "").toLowerCase().includes(q) ||
      (ex.equipment ?? "").toLowerCase().includes(q);
    return matchPattern && matchSearch;
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(ex: ExerciseLibraryItem) {
    setEditId(ex.id);
    setForm({
      name: ex.name,
      name_en: ex.name_en ?? "",
      pattern: ex.pattern ?? "",
      muscle_primary: ex.muscle_primary ?? ex.muscle_group ?? "",
      muscle_secondary: ex.muscle_secondary ?? "",
      equipment: ex.equipment ?? "",
      level: ex.level ?? 2,
      youtube_url: ex.youtube_url ?? "",
      description: ex.description ?? "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast("Ingresá un nombre", "error"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      name_en: form.name_en.trim() || null,
      pattern: form.pattern || null,
      muscle_primary: form.muscle_primary.trim() || null,
      muscle_secondary: form.muscle_secondary.trim() || null,
      equipment: form.equipment.trim() || null,
      level: form.level,
      youtube_url: form.youtube_url.trim() || null,
      description: form.description.trim() || null,
    };
    const result = editId
      ? await updateLibraryExerciseAction(editId, payload)
      : await createLibraryExerciseAction(payload);
    setSaving(false);
    if (result?.error) { showToast(result.error, "error"); return; }
    if (editId) {
      setExercises(prev => prev.map(ex => ex.id === editId
        ? { ...ex, ...payload, name_en: payload.name_en ?? null, pattern: payload.pattern ?? null,
            muscle_primary: payload.muscle_primary ?? null, muscle_secondary: payload.muscle_secondary ?? null,
            equipment: payload.equipment ?? null, level: payload.level, youtube_url: payload.youtube_url ?? null,
            description: payload.description ?? null }
        : ex));
      showToast("Ejercicio actualizado");
    } else {
      showToast("Ejercicio guardado");
      window.location.reload();
    }
    closeModal();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ejercicio de tu biblioteca?")) return;
    await deleteLibraryExerciseAction(id);
    setExercises(prev => prev.filter(ex => ex.id !== id));
    showToast("Ejercicio eliminado");
  }

  const ownCount = exercises.filter(ex => !ex.is_global).length;
  const globalCount = exercises.filter(ex => ex.is_global).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, músculo o equipamiento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="flex-shrink-0 gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar ejercicio
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span>{globalCount} ejercicios globales</span>
        <span className="text-gray-300">·</span>
        <span>{ownCount} ejercicios míos</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-gray-700">{displayed.length} mostrando</span>
      </div>

      {/* Pattern filters */}
      <div className="flex gap-1.5 flex-wrap -mt-1">
        <button
          onClick={() => setFilterPattern(null)}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
            !filterPattern ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Todos ({exercises.length})
        </button>
        {PATTERNS.map(p => {
          const count = exercises.filter(ex => ex.pattern === p.value).length;
          if (count === 0) return null;
          const active = filterPattern === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setFilterPattern(active ? null : p.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={active
                ? { backgroundColor: p.color, color: "#fff" }
                : { backgroundColor: p.color + "18", color: p.color }
              }
            >
              {p.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Exercise grid */}
      {displayed.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-3">
          <svg className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-sm text-gray-400">
            {exercises.length === 0 ? "La biblioteca está vacía." : "Sin resultados con ese filtro."}
          </p>
          {exercises.length === 0 && (
            <Button size="sm" onClick={openCreate}>Agregar primer ejercicio</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(ex => {
            const pi = patternInfo(ex.pattern);
            const li = levelInfo(ex.level);
            const isOwn = !ex.is_global && ex.trainer_id === trainerId;
            return (
              <Card key={ex.id} padding="sm" className="flex flex-col gap-2.5 overflow-hidden"
                style={{ borderLeft: `4px solid ${pi?.color ?? "#e5e7eb"}` }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm leading-snug">{ex.name}</p>
                      {ex.is_global && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">
                          Global
                        </span>
                      )}
                      {isOwn && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "#ede9fe", color: "#7c3aed" }}>
                          Mío
                        </span>
                      )}
                    </div>
                    {ex.name_en && (
                      <p className="text-xs text-gray-400 italic mt-0.5">{ex.name_en}</p>
                    )}
                  </div>
                  {isOwn && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => openEdit(ex)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(ex.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {pi && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: pi.color + "18", color: pi.color }}>
                      {pi.label}
                    </span>
                  )}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: li.bg, color: li.color }}>
                    {li.label}
                  </span>
                </div>

                {/* Muscles + Equipment */}
                <div className="flex flex-col gap-0.5">
                  {(ex.muscle_primary ?? ex.muscle_group) && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Músculo: </span>
                      {ex.muscle_primary ?? ex.muscle_group}
                      {ex.muscle_secondary && <span className="text-gray-400"> → {ex.muscle_secondary}</span>}
                    </p>
                  )}
                  {ex.equipment && (
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Equipo: </span>{ex.equipment}
                    </p>
                  )}
                </div>

                {/* Note */}
                {ex.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{ex.description}</p>
                )}

                {/* Video */}
                {ex.youtube_url && (
                  <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-red-500 font-semibold flex items-center gap-1 hover:underline w-fit">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/>
                    </svg>
                    Ver video
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 flex flex-col"
            style={{ maxHeight: "90vh" }}>
            {/* Sticky header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900">
                {editId ? "Editar ejercicio" : "Agregar ejercicio"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <Input
                label="Nombre en español *"
                placeholder="Ej: Press banca con barra"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Nombre en inglés (opcional)"
                placeholder="Ej: Barbell Bench Press"
                value={form.name_en}
                onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
              />

              {/* Pattern selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Patrón de movimiento</label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setForm(f => ({ ...f, pattern: "" }))}
                    className={cn("text-xs font-bold px-3 py-1.5 rounded-full transition-all",
                      !form.pattern ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                    Sin especificar
                  </button>
                  {PATTERNS.map(p => {
                    const active = form.pattern === p.value;
                    return (
                      <button key={p.value} type="button"
                        onClick={() => setForm(f => ({ ...f, pattern: p.value }))}
                        className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                        style={active
                          ? { backgroundColor: p.color, color: "#fff" }
                          : { backgroundColor: p.color + "18", color: p.color }
                        }>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Músculo principal"
                  placeholder="Ej: Pecho, Cuádriceps"
                  value={form.muscle_primary}
                  onChange={e => setForm(f => ({ ...f, muscle_primary: e.target.value }))}
                />
                <Input
                  label="Músculo secundario"
                  placeholder="Ej: Tríceps (opcional)"
                  value={form.muscle_secondary}
                  onChange={e => setForm(f => ({ ...f, muscle_secondary: e.target.value }))}
                />
              </div>

              <Input
                label="Equipamiento necesario"
                placeholder="Ej: Barra, Mancuernas, Peso corporal"
                value={form.equipment}
                onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
              />

              {/* Level selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Nivel de dificultad</label>
                <div className="flex gap-2">
                  {LEVELS.map(l => (
                    <button key={l.value} type="button"
                      onClick={() => setForm(f => ({ ...f, level: l.value }))}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border"
                      style={form.level === l.value
                        ? { backgroundColor: l.bg, color: l.color, borderColor: l.color }
                        : { backgroundColor: "#f9fafb", color: "#9ca3af", borderColor: "#e5e7eb" }
                      }>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Link de video YouTube (opcional)"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={form.youtube_url}
                onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              />
              <Textarea
                label="Nota técnica / puntos clave (opcional)"
                placeholder="Clave técnica, errores comunes, puntos de ejecución..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Sticky footer */}
            <div className="flex gap-2 p-5 border-t border-gray-100 flex-shrink-0">
              <Button loading={saving} onClick={handleSave} className="flex-1">
                {editId ? "Guardar cambios" : "Agregar ejercicio"}
              </Button>
              <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
