"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/types";
import { CATEGORIES, getCategoryInfo } from "@/lib/exerciseCategories";

export interface PickedExercise {
  library_exercise_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  youtube_url: string;
  technical_note: string;
}

interface Props {
  onSelect: (ex: PickedExercise) => void;
  onClose: () => void;
}

export function ExerciseLibraryPicker({ onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("exercise_library").select("*").order("name")
      .then(({ data }) => { setExercises(data ?? []); setLoading(false); });
  }, []);

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

  const displayed = exercises.filter(ex => {
    if (isSearching) {
      const q = search.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.name_en ?? "").toLowerCase().includes(q) ||
        (ex.muscle_primary ?? ex.muscle_group ?? "").toLowerCase().includes(q) ||
        (ex.equipment ?? "").toLowerCase().includes(q)
      );
    }
    if (activeSub) return ex.category === activeCat && ex.subcategory === activeSub;
    return false;
  });

  function handleSelect(ex: ExerciseLibraryItem) {
    onSelect({
      library_exercise_id: ex.id,
      name: ex.name,
      sets: 3,
      reps: "8-12",
      rest_seconds: 90,
      youtube_url: ex.youtube_url ?? "",
      technical_note: ex.description ?? "",
    });
    onClose();
  }

  const currentCat = getCategoryInfo(activeCat ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 flex flex-col"
        style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(activeCat || activeSub) && !isSearching && (
                <button onClick={() => activeSub ? setActiveSub(null) : setActiveCat(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              )}
              <h3 className="text-base font-bold text-gray-900">
                {isSearching ? "Resultados de búsqueda"
                  : activeSub ? currentCat?.subcategories.find(s => s.value === activeSub)?.label
                  : activeCat ? `${currentCat?.emoji} ${currentCat?.label}`
                  : "Elegí una categoría"}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input autoFocus type="search" placeholder="Buscar por nombre, músculo o equipo..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando biblioteca...</p>
          ) : isSearching ? (
            /* Search results */
            displayed.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center gap-3">
                <p className="text-sm text-gray-400">Sin resultados para &quot;{search}&quot;</p>
                <a href="/dashboard/library" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Crear nuevo ejercicio en biblioteca
                </a>
              </div>
            ) : (
              <ExerciseList exercises={displayed} onSelect={handleSelect} />
            )
          ) : !activeCat ? (
            /* Level 1: Category grid */
            <div className="grid grid-cols-2 gap-2 p-1">
              {CATEGORIES.map(cat => (
                <button key={cat.value}
                  onClick={() => { setActiveCat(cat.value); setActiveSub(null); }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all hover:shadow-sm active:scale-95"
                  style={{ backgroundColor: cat.bg, borderColor: cat.color + "40" }}>
                  <span className="text-2xl leading-none flex-shrink-0">{cat.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate" style={{ color: cat.color }}>{cat.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: cat.color + "99" }}>
                      {countByCat[cat.value] ?? 0} ej.
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : !activeSub && currentCat ? (
            /* Level 2: Subcategory list */
            <div className="flex flex-col gap-1.5 p-1">
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
          ) : (
            /* Level 3: Exercise list */
            displayed.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Sin ejercicios en esta categoría.</p>
            ) : (
              <ExerciseList exercises={displayed} onSelect={handleSelect} />
            )
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <a href="/dashboard/library" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-brand-600 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              No encontré el ejercicio — Crear en biblioteca
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseList({ exercises, onSelect }: {
  exercises: ExerciseLibraryItem[];
  onSelect: (ex: ExerciseLibraryItem) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {exercises.map(ex => {
        const cat = getCategoryInfo(ex.category ?? "");
        const muscle = ex.muscle_primary ?? ex.muscle_group ?? "";
        return (
          <button key={ex.id} onClick={() => onSelect(ex)}
            className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3 group">
            {cat && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 truncate">{ex.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {muscle && <span className="text-xs text-gray-400">{muscle}</span>}
                {ex.equipment && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{ex.equipment}</span>
                  </>
                )}
              </div>
            </div>
            <svg className="h-4 w-4 text-brand-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
