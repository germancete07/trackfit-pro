"use client";

import { useState } from "react";
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
import { CATEGORIES, getCategoryInfo, getSubcategoryLabel } from "@/lib/exerciseCategories";

const LEVELS = [
  { value: 1, label: "Principiante", color: "#16a34a", bg: "#dcfce7" },
  { value: 2, label: "Intermedio",   color: "#b45309", bg: "#fef3c7" },
  { value: 3, label: "Avanzado",     color: "#7c3aed", bg: "#ede9fe" },
];

function levelInfo(l: number | null) {
  return LEVELS.find(x => x.value === l) ?? LEVELS[1];
}

const EMPTY_FORM = {
  name: "", name_en: "", category: "", subcategory: "",
  muscle_primary: "", muscle_secondary: "", equipment: "",
  level: 2, youtube_url: "", description: "",
};

interface Props { exercises: ExerciseLibraryItem[]; trainerId: string; }

// ── Exercise card ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex, trainerId, onEdit }: {
  ex: ExerciseLibraryItem; trainerId: string; onEdit: (ex: ExerciseLibraryItem) => void;
}) {
  const cat = getCategoryInfo(ex.category ?? "");
  const subLabel = ex.category && ex.subcategory
    ? getSubcategoryLabel(ex.category, ex.subcategory) : null;
  const lv = levelInfo(ex.level);
  const isOwn = !ex.is_global && ex.trainer_id === trainerId;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">{ex.name}</p>
          {ex.name_en && <p className="text-xs text-gray-400 mt-0.5">{ex.name_en}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isOwn && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">Mío</span>}
          {isOwn && (
            <button onClick={() => onEdit(ex)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {cat && subLabel && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cat.bg, color: cat.color }}>{subLabel}</span>
        )}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: lv.bg, color: lv.color }}>{lv.label}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {ex.muscle_primary && <span className="text-xs text-gray-600 font-medium">{ex.muscle_primary}</span>}
        {ex.muscle_secondary && <span className="text-xs text-gray-400">+ {ex.muscle_secondary}</span>}
        {ex.equipment && <span className="text-xs text-gray-400">· {ex.equipment}</span>}
      </div>

      {ex.description && <p className="text-xs text-gray-500 leading-relaxed">{ex.description}</p>}

      {ex.youtube_url && (
        <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.64 12.64 0 00-8.45 0A4.83 4.83 0 014.41 6.69 48 48 0 003 12a48 48 0 001.41 5.31 4.83 4.83 0 003.77 2.75 12.64 12.64 0 008.45 0 4.83 4.83 0 003.77-2.75A48 48 0 0021 12a48 48 0 00-1.41-5.31zM9.75 15V9l6 3-6 3z" />
          </svg>
          Ver video
        </a>
      )}
    </div>
  );
}

// ── Exercise modal ────────────────────────────────────────────────────────────

function ExerciseModal({ editing, onClose }: {
  editing: ExerciseLibraryItem | null; onClose: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(editing ? {
    name: editing.name, name_en: editing.name_en ?? "",
    category: editing.category ?? "", subcategory: editing.subcategory ?? "",
    muscle_primary: editing.muscle_primary ?? "", muscle_secondary: editing.muscle_secondary ?? "",
    equipment: editing.equipment ?? "", level: editing.level ?? 2,
    youtube_url: editing.youtube_url ?? "", description: editing.description ?? "",
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedCat = CATEGORIES.find(c => c.value === form.category);

  function setField(field: string, val: string | number) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setLoading(true);
    const payload = {
      name: form.name, name_en: form.name_en || null,
      category: form.category || null, subcategory: form.subcategory || null,
      muscle_primary: form.muscle_primary || null, muscle_secondary: form.muscle_secondary || null,
      equipment: form.equipment || null, level: form.level,
      youtube_url: form.youtube_url || null, description: form.description || null,
    };
    const res = editing
      ? await updateLibraryExerciseAction(editing.id, payload)
      : await createLibraryExerciseAction(payload);
    setLoading(false);
    if (res && "error" in res) { showToast(res.error as string, "error"); return; }
    showToast(editing ? "Ejercicio actualizado" : "Ejercicio creado");
    onClose();
  }

  async function handleDelete() {
    if (!editing) return;
    setDeleting(true);
    await deleteLibraryExerciseAction(editing.id);
    setDeleting(false);
    showToast("Ejercicio eliminado");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 flex flex-col"
        style={{ maxHeight: "92vh" }}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">{editing ? "Editar ejercicio" : "Nuevo ejercicio"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <Input label="Nombre en español *" placeholder="Ej: Sentadilla frontal" value={form.name}
            onChange={e => setField("name", e.target.value)} />
          <Input label="Nombre en inglés" placeholder="Front Squat" value={form.name_en}
            onChange={e => setField("name_en", e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Categoría</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  onClick={() => setForm(prev => ({ ...prev, category: c.value, subcategory: "" }))}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                  style={form.category === c.value
                    ? { backgroundColor: c.color, color: "#fff", borderColor: c.color }
                    : { backgroundColor: c.bg, color: c.color, borderColor: c.color + "60" }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {selectedCat && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Subcategoría</label>
              <div className="flex flex-wrap gap-1.5">
                {selectedCat.subcategories.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => setField("subcategory", s.value)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                    style={form.subcategory === s.value
                      ? { backgroundColor: selectedCat.color, color: "#fff", borderColor: selectedCat.color }
                      : { backgroundColor: selectedCat.bg, color: selectedCat.color, borderColor: selectedCat.color + "60" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Músculo principal" placeholder="Cuádriceps" value={form.muscle_primary}
              onChange={e => setField("muscle_primary", e.target.value)} />
            <Input label="Músculo secundario" placeholder="Glúteos" value={form.muscle_secondary}
              onChange={e => setField("muscle_secondary", e.target.value)} />
          </div>
          <Input label="Equipamiento" placeholder="Barra, Mancuernas..." value={form.equipment}
            onChange={e => setField("equipment", e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Nivel</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l.value} type="button" onClick={() => setField("level", l.value)}
                  className="flex-1 text-xs font-bold py-2 rounded-xl border transition-all"
                  style={form.level === l.value
                    ? { backgroundColor: l.color, color: "#fff", borderColor: l.color }
                    : { backgroundColor: l.bg, color: l.color, borderColor: l.color + "60" }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Video YouTube (opcional)" type="url" placeholder="https://youtube.com/watch?v=..." value={form.youtube_url}
            onChange={e => setField("youtube_url", e.target.value)} />
          <Textarea label="Nota técnica (opcional)" placeholder="Claves técnicas, errores comunes..." value={form.description}
            onChange={e => setField("description", e.target.value)} rows={3} />
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2 flex-shrink-0">
          {editing && (
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-xs font-semibold text-red-400 hover:text-red-600 px-3 py-2 transition-colors">
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2">Cancelar</button>
          <Button size="sm" onClick={handleSave} loading={loading} disabled={!form.name.trim()}>
            {editing ? "Guardar" : "Crear ejercicio"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ExerciseLibrary({ exercises, trainerId }: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEx, setEditingEx] = useState<ExerciseLibraryItem | null>(null);

  const isSearching = search.trim().length > 0;

  const countByCat: Record<string, number> = {};
  const countBySub: Record<string, number> = {};
  for (const ex of exercises) {
    if (ex.category) countByCat[ex.category] = (countByCat[ex.category] ?? 0) + 1;
    if (ex.category && ex.subcategory) {
      const key = `${ex.category}/${ex.subcategory}`;
      countBySub[key] = (countBySub[key] ?? 0) + 1;
    }
  }

  const listedExercises = exercises.filter(ex => {
    if (isSearching) {
      const q = search.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.name_en ?? "").toLowerCase().includes(q) ||
        (ex.muscle_primary ?? "").toLowerCase().includes(q) ||
        (ex.equipment ?? "").toLowerCase().includes(q)
      );
    }
    if (activeSub) return ex.category === activeCat && ex.subcategory === activeSub;
    return false;
  });

  const currentCat = getCategoryInfo(activeCat ?? "");
  const currentSub = currentCat?.subcategories.find(s => s.value === activeSub);

  return (
    <div className="flex flex-col gap-4">
      {/* Search + add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="search" placeholder="Buscar en toda la biblioteca..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <Button size="sm" onClick={() => { setEditingEx(null); setShowModal(true); }}>+ Agregar</Button>
      </div>

      {/* Breadcrumb */}
      {!isSearching && (activeCat || activeSub) && (
        <div className="flex items-center gap-1 text-xs font-semibold flex-wrap">
          <button onClick={() => { setActiveCat(null); setActiveSub(null); }}
            className="text-brand-600 hover:underline">Biblioteca</button>
          {activeCat && currentCat && (
            <>
              <span className="text-gray-300">›</span>
              <button onClick={() => setActiveSub(null)}
                className={cn(activeSub ? "text-brand-600 hover:underline" : "text-gray-700")}>
                {currentCat.emoji} {currentCat.label}
              </button>
            </>
          )}
          {activeSub && currentSub && (
            <>
              <span className="text-gray-300">›</span>
              <span className="text-gray-700">{currentSub.label}</span>
            </>
          )}
        </div>
      )}

      {/* Level 1: Category grid */}
      {!isSearching && !activeCat && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button key={cat.value}
              onClick={() => { setActiveCat(cat.value); setActiveSub(null); }}
              className="flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95"
              style={{ backgroundColor: cat.bg, borderColor: cat.color + "40" }}>
              <span className="text-3xl leading-none">{cat.emoji}</span>
              <div>
                <p className="text-sm font-bold leading-tight" style={{ color: cat.color }}>{cat.label}</p>
                <p className="text-xs mt-0.5" style={{ color: cat.color + "99" }}>
                  {countByCat[cat.value] ?? 0} ejercicios
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Level 2: Subcategory list */}
      {!isSearching && activeCat && !activeSub && currentCat && (
        <div className="flex flex-col gap-2">
          {currentCat.subcategories.map(sub => {
            const count = countBySub[`${activeCat}/${sub.value}`] ?? 0;
            return (
              <button key={sub.value} onClick={() => setActiveSub(sub.value)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-left transition-all hover:shadow-sm"
                style={{ backgroundColor: currentCat.bg, borderColor: currentCat.color + "40" }}>
                <span className="text-sm font-bold" style={{ color: currentCat.color }}>{sub.label}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: currentCat.color + "18", color: currentCat.color }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Level 3 + search: Exercise cards */}
      {(isSearching || (activeCat && activeSub)) && (
        listedExercises.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-400">Sin resultados.</p>
            <button onClick={() => { setEditingEx(null); setShowModal(true); }}
              className="text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors">
              + Crear nuevo ejercicio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {listedExercises.map(ex => (
              <ExerciseCard key={ex.id} ex={ex} trainerId={trainerId}
                onEdit={ex2 => { setEditingEx(ex2); setShowModal(true); }} />
            ))}
          </div>
        )
      )}

      {showModal && (
        <ExerciseModal editing={editingEx}
          onClose={() => { setShowModal(false); setEditingEx(null); }} />
      )}
    </div>
  );
}
