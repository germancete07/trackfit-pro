"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/types";

const PATTERNS = [
  { value: "rodilla",    label: "Rodilla",    color: "#3b82f6" },
  { value: "cadera",     label: "Cadera",     color: "#8b5cf6" },
  { value: "unilateral", label: "Unilateral", color: "#10b981" },
  { value: "empuje-h",   label: "Empuje H",   color: "#f59e0b" },
  { value: "empuje-v",   label: "Empuje V",   color: "#f97316" },
  { value: "tiron-h",    label: "Tirón H",    color: "#ef4444" },
  { value: "tiron-v",    label: "Tirón V",    color: "#6366f1" },
  { value: "core",       label: "Core",       color: "#0891b2" },
  { value: "potencia",   label: "Potencia",   color: "#dc2626" },
  { value: "funcional",  label: "Funcional",  color: "#16a34a" },
];

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
  const [filterPattern, setFilterPattern] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("exercise_library")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setExercises(data ?? []);
        setLoading(false);
      });
  }, []);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 flex flex-col"
        style={{ maxHeight: "90vh" }}>
        {/* Sticky header */}
        <div className="p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Buscar en biblioteca</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              autoFocus
              type="search"
              placeholder="Buscar por nombre, músculo o equipo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            <button
              onClick={() => setFilterPattern(null)}
              className={cn("text-xs font-semibold px-2.5 py-1 rounded-full transition-colors",
                !filterPattern ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
            >
              Todos
            </button>
            {PATTERNS.map(p => {
              const active = filterPattern === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setFilterPattern(active ? null : p.value)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all"
                  style={active
                    ? { backgroundColor: p.color, color: "#fff" }
                    : { backgroundColor: p.color + "18", color: p.color }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-6">Cargando biblioteca...</p>
          ) : displayed.length === 0 ? (
            <div className="text-center py-8 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400">
                {exercises.length === 0
                  ? "La biblioteca está vacía."
                  : "Sin resultados. Probá otros términos."}
              </p>
              <a
                href="/dashboard/library"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Crear nuevo ejercicio en biblioteca
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {displayed.map(ex => {
                const pi = PATTERNS.find(p => p.value === ex.pattern);
                const muscle = ex.muscle_primary ?? ex.muscle_group ?? "";
                return (
                  <button
                    key={ex.id}
                    onClick={() => handleSelect(ex)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3 group"
                  >
                    {pi && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pi.color }} />
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
                    {pi && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: pi.color + "18", color: pi.color }}>
                        {pi.label}
                      </span>
                    )}
                    <svg className="h-4 w-4 text-brand-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: create new exercise */}
        {!loading && displayed.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <a
              href="/dashboard/library"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-brand-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              No encontré el ejercicio — Crear nuevo en biblioteca
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
