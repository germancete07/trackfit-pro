"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/types";

const MUSCLE_GROUPS = [
  { value: "pecho", label: "Pecho" },
  { value: "espalda", label: "Espalda" },
  { value: "piernas", label: "Piernas" },
  { value: "hombros", label: "Hombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "core", label: "Core" },
  { value: "gluteos", label: "Glúteos" },
  { value: "cardio", label: "Cardio" },
];

interface ImportedExercise {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
}

interface Props {
  onSelect: (ex: ImportedExercise) => void;
  onClose: () => void;
}

export function ExerciseLibraryPicker({ onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("exercise_library").select("*").order("name").then(({ data }) => {
      setExercises(data ?? []);
      setLoading(false);
    });
  }, []);

  const displayed = exercises.filter(ex => {
    const matchGroup = !filter || ex.muscle_group === filter;
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  function handleSelect(ex: ExerciseLibraryItem) {
    onSelect({
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
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Biblioteca de ejercicios</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            autoFocus
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={cn("text-xs font-semibold px-2.5 py-1 rounded-full transition-colors",
                !filter ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600")}
            >
              Todos
            </button>
            {MUSCLE_GROUPS.map(mg => (
              <button
                key={mg.value}
                onClick={() => setFilter(filter === mg.value ? null : mg.value)}
                className={cn("text-xs font-semibold px-2.5 py-1 rounded-full transition-colors",
                  filter === mg.value ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600")}
              >
                {mg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>
          ) : displayed.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                {exercises.length === 0
                  ? "Tu biblioteca está vacía. Agregá ejercicios desde Rutinas → Biblioteca."
                  : "Sin resultados con ese filtro."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {displayed.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => handleSelect(ex)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-brand-50 active:bg-brand-100 transition-colors flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">{ex.name}</p>
                    {ex.description && <p className="text-xs text-gray-400 truncate">{ex.description}</p>}
                  </div>
                  <span className="text-xs font-bold text-gray-400 flex-shrink-0 capitalize">{ex.muscle_group}</span>
                  <svg className="h-4 w-4 text-brand-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
