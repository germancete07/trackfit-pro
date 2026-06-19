"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { ExerciseLibraryPicker, type PickedExercise } from "@/components/trainer/ExerciseLibraryPicker";
import {
  trainerCreateManualSessionAction,
  getDayRoutineExercisesAction,
} from "@/app/dashboard/students/[id]/actions";

interface Props {
  studentId: string;
  studentName: string;
  defaultDate: string; // YYYY-MM-DD
  onClose: () => void;
}

interface ManualExItem {
  _id: number;
  library_exercise_id: string | null;
  name: string;
  sets: number;
  reps: string;
  weightKg: number | null;
}

let _nextId = 1;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  // dateStr = YYYY-MM-DD, display as "Lun 16 jun"
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function TrainerManualSessionModal({ studentId, studentName, defaultDate, onClose }: Props) {
  const [date, setDate] = useState(defaultDate || todayStr());
  const [exercises, setExercises] = useState<ManualExItem[]>([]);
  const [routineSessionName, setRoutineSessionName] = useState<string | null>(null);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadDayExercises = useCallback(async (d: string) => {
    setLoadingExercises(true);
    setError(null);
    const result = await getDayRoutineExercisesAction(studentId, d);
    setRoutineSessionName(result.sessionName);
    if (result.exercises.length > 0) {
      setExercises(result.exercises.map(ex => ({
        _id: _nextId++,
        library_exercise_id: ex.library_exercise_id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weightKg: null,
      })));
    } else {
      setExercises([]);
    }
    setLoadingExercises(false);
  }, [studentId]);

  useEffect(() => {
    loadDayExercises(date);
  }, [date, loadDayExercises]);

  function goDay(delta: number) {
    const next = offsetDate(date, delta);
    if (next > todayStr()) return;
    setDate(next);
  }

  function addExercise(picked: PickedExercise) {
    setExercises(prev => [...prev, {
      _id: _nextId++,
      library_exercise_id: picked.library_exercise_id,
      name: picked.name,
      sets: picked.sets || 3,
      reps: String(picked.reps || "8"),
      weightKg: null,
    }]);
  }

  function updateSets(id: number, delta: number) {
    setExercises(prev => prev.map(ex =>
      ex._id === id ? { ...ex, sets: Math.max(1, ex.sets + delta) } : ex
    ));
  }

  function updateWeight(id: number, delta: number) {
    setExercises(prev => prev.map(ex => {
      if (ex._id !== id) return ex;
      const current = ex.weightKg ?? 0;
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      return { ...ex, weightKg: next || null };
    }));
  }

  function updateReps(id: number, value: string) {
    setExercises(prev => prev.map(ex => ex._id === id ? { ...ex, reps: value } : ex));
  }

  function removeExercise(id: number) {
    setExercises(prev => prev.filter(ex => ex._id !== id));
  }

  async function handleSave() {
    if (exercises.length === 0) {
      setError("Agregá al menos un ejercicio.");
      return;
    }
    setSaving(true);
    setError(null);

    const result = await trainerCreateManualSessionAction(
      studentId,
      date,
      exercises.map((ex, i) => ({
        libraryExerciseId: ex.library_exercise_id ?? "",
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps || "1",
        weightKg: ex.weightKg,
        sortOrder: i,
      })),
      null
    );

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(onClose, 900);
    }
  }

  const isFuture = date > todayStr();
  const isToday = date === todayStr();

  return (
    <>
      <Modal
        title="Carga manual"
        subtitle={`Registrar sesión de ${studentName}`}
        onClose={onClose}
        zIndex={400}
        maxWidth={520}
        footer={
          <div style={{ padding: "12px 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {error && (
              <p style={{ margin: 0, fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</p>
            )}
            {saved ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 52, borderRadius: 16, background: "#dcfce7",
                color: "#16a34a", fontSize: 15, fontWeight: 700,
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Sesión guardada
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || exercises.length === 0 || loadingExercises}
                style={{
                  height: 52, borderRadius: 16, border: "none", cursor: exercises.length === 0 || saving ? "default" : "pointer",
                  background: exercises.length === 0 || saving ? "#e5e7eb" : "linear-gradient(135deg, #534AB7, #7C3AED)",
                  color: exercises.length === 0 || saving ? "#9ca3af" : "#fff",
                  fontSize: 16, fontWeight: 700, transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Guardar sesión
                  </>
                )}
              </button>
            )}
          </div>
        }
      >
        <div style={{ padding: "0 16px 4px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ── Date selector with arrows ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface-input, #f9fafb)",
            border: "1.5px solid var(--border-input, #e5e7eb)",
            borderRadius: 16, padding: "10px 4px",
          }}>
            <button
              type="button"
              onClick={() => goDay(-1)}
              style={{
                width: 44, height: 44, borderRadius: 12, border: "none",
                background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6b7280",
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary, #111827)", lineHeight: 1.2 }}>
                {formatDateDisplay(date)}
              </div>
              {isToday && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#534AB7", marginTop: 2 }}>Hoy</div>
              )}
              {routineSessionName && !loadingExercises && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#059669", marginTop: 2 }}>
                  {routineSessionName}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => goDay(1)}
              disabled={isFuture || isToday}
              style={{
                width: 44, height: 44, borderRadius: 12, border: "none",
                background: "none", cursor: isToday ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isToday ? "#d1d5db" : "#6b7280",
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* ── Exercise list ── */}
          {loadingExercises ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Cargando ejercicios...
            </div>
          ) : (
            <>
              {exercises.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {exercises.map((ex, i) => (
                    <div
                      key={ex._id}
                      style={{
                        border: "1.5px solid var(--border-input, #e5e7eb)",
                        borderRadius: 16,
                        background: "var(--surface-elevated, #fff)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Exercise header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: "1px solid var(--border-input, #f3f4f6)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", width: 18, flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text-primary, #111827)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ex.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExercise(ex._id)}
                          style={{ padding: 4, border: "none", background: "none", cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", flexShrink: 0 }}
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Touch-friendly inputs */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", padding: "12px 14px" }}>
                        {/* Sets */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
                            Series
                          </p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => updateSets(ex._id, -1)}
                              style={spinBtnStyle}
                            >−</button>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #111827)", minWidth: 24, textAlign: "center" }}>
                              {ex.sets}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateSets(ex._id, 1)}
                              style={spinBtnStyle}
                            >+</button>
                          </div>
                        </div>

                        {/* Reps */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
                            Reps
                          </p>
                          <input
                            type="text"
                            inputMode="text"
                            value={ex.reps}
                            onChange={e => updateReps(ex._id, e.target.value)}
                            style={{
                              width: "100%", boxSizing: "border-box",
                              height: 36, borderRadius: 10,
                              border: "1.5px solid var(--border-input, #e5e7eb)",
                              background: "var(--surface-input, #f9fafb)",
                              color: "var(--text-primary, #111827)",
                              textAlign: "center",
                              fontSize: 15, fontWeight: 700, outline: "none",
                            }}
                          />
                        </div>

                        {/* Weight */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
                            Kg
                          </p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => updateWeight(ex._id, -2.5)}
                              style={spinBtnStyle}
                            >−</button>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #111827)", minWidth: 28, textAlign: "center" }}>
                              {ex.weightKg != null ? ex.weightKg : "—"}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateWeight(ex._id, 2.5)}
                              style={spinBtnStyle}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add exercise */}
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "13px 16px", borderRadius: 14,
                  border: "2px dashed var(--border-input, #e5e7eb)",
                  background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600,
                  color: "#534AB7", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(83,74,183,0.05)"; e.currentTarget.style.borderColor = "#534AB7"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-input, #e5e7eb)"; }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Agregar ejercicio
              </button>
            </>
          )}

          {/* Info badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af", padding: "0 2px" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Sesión marcada con badge <strong style={{ color: "#534AB7" }}>"Manual"</strong> en el historial.
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Modal>

      {showPicker && (
        <ExerciseLibraryPicker
          onSelect={ex => { addExercise(ex); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

const spinBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  border: "1.5px solid var(--border-input, #e5e7eb)",
  background: "var(--surface-input, #f9fafb)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, fontWeight: 700, color: "#374151", flexShrink: 0,
  padding: 0,
};
