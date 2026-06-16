"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
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
  const currentSubLabel = currentCat?.subcategories.find(s => s.value === activeSub)?.label;

  function goBack() {
    if (isSearching) { setSearch(""); return; }
    if (activeSub) { setActiveSub(null); return; }
    if (activeCat) { setActiveCat(null); return; }
  }

  const showBack = isSearching || !!activeCat;

  // Breadcrumb subtitle
  let subtitle: string | undefined;
  if (!isSearching && activeCat && currentCat) {
    subtitle = `Biblioteca › ${currentCat.label}${activeSub && currentSubLabel ? ` › ${currentSubLabel}` : ""}`;
  }

  // Title
  const title = isSearching
    ? "Resultados"
    : activeSub
    ? (currentSubLabel ?? "Ejercicios")
    : activeCat
    ? `${currentCat?.emoji ?? ""} ${currentCat?.label ?? ""}`
    : "Agregar ejercicio";

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      zIndex={9999}
      maxWidth={540}
      headerExtra={
        showBack ? (
          <button
            onClick={goBack}
            style={{
              padding: 6,
              border: "none",
              background: "rgba(0,0,0,0.06)",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              order: -1,
              marginRight: 4,
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        ) : undefined
      }
      footer={
        !loading ? (
          <div style={{ padding: "10px 16px 16px" }}>
            <a
              href="/dashboard/library"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              No encontré el ejercicio — Crear en biblioteca
            </a>
          </div>
        ) : undefined
      }
    >
      {/* Search bar */}
      <div style={{ padding: "12px 16px 8px", position: "sticky", top: 0, backgroundColor: "var(--surface-elevated, #fff)", zIndex: 1 }}>
        <div style={{ position: "relative" }}>
          <svg
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af", pointerEvents: "none" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            autoFocus
            type="search"
            placeholder="Buscar ejercicio, músculo o equipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              height: 40, borderRadius: 12,
              border: "1.5px solid var(--border-input)", background: "var(--surface-input)",
              paddingLeft: 34, paddingRight: 12,
              fontSize: 14, outline: "none",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "8px 12px 4px" }}>
        {loading ? (
          <p style={{ textAlign: "center", fontSize: 14, color: "#9ca3af", padding: "32px 0" }}>
            Cargando biblioteca...
          </p>
        ) : isSearching ? (
          displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Sin resultados para &quot;{search}&quot;</p>
              <a href="/dashboard/library" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 14, fontWeight: 600, color: "#534AB7", textDecoration: "none" }}>
                + Crear en biblioteca
              </a>
            </div>
          ) : (
            <ExerciseList exercises={displayed} onSelect={handleSelect} />
          )
        ) : !activeCat ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingBottom: 12 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.value}
                onClick={() => { setActiveCat(cat.value); setActiveSub(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 16, textAlign: "left",
                  backgroundColor: cat.bg, border: `2px solid ${cat.color}33`,
                  cursor: "pointer", transition: "box-shadow 0.15s",
                }}>
                <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: cat.color, lineHeight: 1.2 }}>{cat.label}</p>
                  <p style={{ margin: 0, fontSize: 10, marginTop: 2, color: cat.color + "99" }}>
                    {countByCat[cat.value] ?? 0} ej.
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : !activeSub && currentCat ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 12 }}>
            {currentCat.subcategories.map(sub => {
              const count = countBySub[`${activeCat}/${sub.value}`] ?? 0;
              return (
                <button key={sub.value} onClick={() => setActiveSub(sub.value)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 16, textAlign: "left",
                    backgroundColor: currentCat.bg, border: `2px solid ${currentCat.color}33`,
                    cursor: "pointer",
                  }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: currentCat.color }}>{sub.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    backgroundColor: currentCat.color + "20", color: currentCat.color,
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        ) : (
          displayed.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 14, color: "#9ca3af", padding: "32px 0" }}>
              Sin ejercicios en esta categoría.
            </p>
          ) : (
            <ExerciseList exercises={displayed} onSelect={handleSelect} />
          )
        )}
      </div>
    </Modal>
  );
}

function ExerciseList({ exercises, onSelect }: {
  exercises: ExerciseLibraryItem[];
  onSelect: (ex: ExerciseLibraryItem) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 12 }}>
      {exercises.map(ex => {
        const cat = getCategoryInfo(ex.category ?? "");
        const muscle = ex.muscle_primary ?? ex.muscle_group ?? "";
        return (
          <button key={ex.id} onClick={() => onSelect(ex)}
            style={{
              width: "100%", textAlign: "left", padding: "10px 12px",
              borderRadius: 12, border: "none", background: "none",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--surface-input)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {cat && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cat.color, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {ex.name}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
                {[muscle, ex.equipment].filter(Boolean).join(" · ")}
              </p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
