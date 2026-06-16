"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ExerciseLibraryPicker, type PickedExercise } from "@/components/trainer/ExerciseLibraryPicker";
import { trainerCreateManualSessionAction } from "@/app/dashboard/students/[id]/actions";

interface Props {
  studentId: string;
  studentName: string;
  defaultDate: string; // YYYY-MM-DD
  onClose: () => void;
}

interface ManualExItem {
  _id: number;
  library_exercise_id: string;
  name: string;
  sets: string;
  reps: string;
  weightKg: string;
}

let _nextId = 1;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function TrainerManualSessionModal({ studentId, studentName, defaultDate, onClose }: Props) {
  const [date, setDate] = useState(defaultDate || todayStr());
  const [exercises, setExercises] = useState<ManualExItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addExercise(picked: PickedExercise) {
    setExercises(prev => [...prev, {
      _id: _nextId++,
      library_exercise_id: picked.library_exercise_id,
      name: picked.name,
      sets: String(picked.sets || 3),
      reps: String(picked.reps || "8"),
      weightKg: "",
    }]);
  }

  function updateField(id: number, field: "sets" | "reps" | "weightKg", value: string) {
    setExercises(prev => prev.map(ex => ex._id === id ? { ...ex, [field]: value } : ex));
  }

  function removeExercise(id: number) {
    setExercises(prev => prev.filter(ex => ex._id !== id));
  }

  function moveUp(id: number) {
    setExercises(prev => {
      const idx = prev.findIndex(ex => ex._id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(id: number) {
    setExercises(prev => {
      const idx = prev.findIndex(ex => ex._id === id);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (exercises.length === 0) {
      setError("Agregá al menos un ejercicio.");
      return;
    }
    setSaving(true);
    setError(null);

    const result = await trainerCreateManualSessionAction(studentId, date, exercises.map((ex, i) => ({
      libraryExerciseId: ex.library_exercise_id,
      name: ex.name,
      sets: parseInt(ex.sets) || 1,
      reps: ex.reps || "1",
      weightKg: parseFloat(ex.weightKg) || null,
      sortOrder: i,
    })));

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <>
      <Modal
        title="Carga manual"
        subtitle={`Registrar sesión de ${studentName}`}
        onClose={onClose}
        zIndex={400}
        maxWidth={520}
        footer={
          <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {error && <p style={{ margin: 0, fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</p>}
            <Button onClick={handleSave} disabled={saving || exercises.length === 0} className="w-full">
              {saving ? "Guardando..." : "Guardar sesión manual"}
            </Button>
          </div>
        }
      >
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Date picker */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={todayStr()}
              style={{
                width: "100%", boxSizing: "border-box",
                height: 42, borderRadius: 12,
                border: "1.5px solid var(--border-input, #e5e7eb)",
                background: "var(--surface-input, #f9fafb)",
                color: "var(--text-primary, #111827)",
                padding: "0 12px", fontSize: 14, outline: "none",
              }}
            />
          </div>

          {/* Exercise list */}
          {exercises.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exercises.map((ex, i) => (
                <div
                  key={ex._id}
                  style={{
                    border: "1.5px solid var(--border-input, #e5e7eb)",
                    borderRadius: 14,
                    background: "var(--surface-elevated, #fff)",
                    overflow: "hidden",
                  }}
                >
                  {/* Exercise header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border-input, #e5e7eb)" }}>
                    {/* Up/down */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => moveUp(ex._id)}
                        disabled={i === 0}
                        style={{ padding: 2, border: "none", background: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.25 : 1 }}
                        title="Subir"
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6b7280">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(ex._id)}
                        disabled={i === exercises.length - 1}
                        style={{ padding: 2, border: "none", background: "none", cursor: i === exercises.length - 1 ? "default" : "pointer", opacity: i === exercises.length - 1 ? 0.25 : 1 }}
                        title="Bajar"
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6b7280">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {/* Index */}
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", width: 16, textAlign: "center", flexShrink: 0 }}>
                      {i + 1}
                    </span>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text-primary, #111827)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ex.name}
                    </span>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeExercise(ex._id)}
                      style={{ padding: 4, border: "none", background: "none", cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      title="Eliminar"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Inputs row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 12px" }}>
                    {[
                      { label: "Series", key: "sets" as const, placeholder: "3", type: "number" },
                      { label: "Reps", key: "reps" as const, placeholder: "10", type: "text" },
                      { label: "Peso (kg)", key: "weightKg" as const, placeholder: "—", type: "number" },
                    ].map(field => (
                      <div key={field.key}>
                        <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {field.label}
                        </p>
                        <input
                          type={field.type}
                          inputMode={field.type === "number" ? "decimal" : "text"}
                          placeholder={field.placeholder}
                          value={ex[field.key]}
                          onChange={e => updateField(ex._id, field.key, e.target.value)}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            height: 38, borderRadius: 10,
                            border: "1.5px solid var(--border-input, #e5e7eb)",
                            background: "var(--surface-input, #f9fafb)",
                            color: "var(--text-primary, #111827)",
                            paddingLeft: 10, paddingRight: 10,
                            fontSize: 14, fontWeight: 600, outline: "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add exercise button */}
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 16px", borderRadius: 14,
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

          {/* Manual badge info */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af", padding: "0 2px" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Esta sesión quedará marcada con el badge <strong style={{ color: "#534AB7" }}>"Manual"</strong> en el historial.
          </div>
        </div>
      </Modal>

      {/* Nested exercise picker */}
      {showPicker && (
        <ExerciseLibraryPicker
          onSelect={ex => { addExercise(ex); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
