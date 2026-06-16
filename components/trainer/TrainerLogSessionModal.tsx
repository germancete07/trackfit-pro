"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  getStudentPendingSessionsAction,
  trainerLogSessionAction,
  type TrainerLogExercise,
} from "@/app/dashboard/students/[id]/actions";

interface Props {
  studentId: string;
  onClose: () => void;
}

interface PendingSession {
  id: string;
  name: string;
  scheduled_date: string;
  routine_day_name: string | null;
  exercises: { id: string; name: string; sets: number; reps: string; sort_order: number }[];
}

interface ExState {
  weightKg: string;
  completedSets: string;
  rpe: string;
}

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS[parseInt(m)-1]} ${y}`;
}

export function TrainerLogSessionModal({ studentId, onClose }: Props) {
  const [sessions, setSessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<PendingSession | null>(null);
  const [exStates, setExStates] = useState<Record<string, ExState>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentPendingSessionsAction(studentId).then(data => {
      setSessions(data as PendingSession[]);
      setLoading(false);
    });
  }, [studentId]);

  function selectSession(s: PendingSession) {
    setSelectedSession(s);
    const initial: Record<string, ExState> = {};
    for (const ex of s.exercises) {
      initial[ex.id] = { weightKg: "", completedSets: String(ex.sets), rpe: "" };
    }
    setExStates(initial);
    setError(null);
  }

  async function handleSave() {
    if (!selectedSession) return;
    setSaving(true);
    setError(null);

    const exercises: TrainerLogExercise[] = selectedSession.exercises.map(ex => {
      const st = exStates[ex.id] ?? { weightKg: "", completedSets: "0", rpe: "" };
      const sets = parseInt(st.completedSets) || 0;
      const weight = parseFloat(st.weightKg) || null;
      const rpe = parseInt(st.rpe) || null;
      return { exerciseId: ex.id, weightKg: weight, completedSets: sets, rpe };
    });

    const result = await trainerLogSessionAction(selectedSession.id, studentId, exercises);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  const title = selectedSession ? "Registrar sesión" : "Seleccionar sesión";
  const subtitle = selectedSession
    ? `${selectedSession.name}${selectedSession.routine_day_name ? ` · ${selectedSession.routine_day_name}` : ""} · ${fmtDate(selectedSession.scheduled_date)}`
    : undefined;

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      zIndex={300}
      maxWidth={500}
      headerExtra={
        selectedSession ? (
          <button
            onClick={() => { setSelectedSession(null); setError(null); }}
            style={{ padding: 6, border: "none", background: "rgba(0,0,0,0.06)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", order: -1, marginRight: 4 }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        ) : undefined
      }
      footer={
        selectedSession ? (
          <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {error && (
              <p style={{ margin: 0, fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</p>
            )}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar sesión"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div style={{ padding: "8px 12px 12px" }}>
        {loading ? (
          <p style={{ textAlign: "center", fontSize: 14, color: "#9ca3af", padding: "32px 0" }}>
            Cargando sesiones...
          </p>
        ) : !selectedSession ? (
          sessions.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 14, color: "#9ca3af", padding: "32px 0" }}>
              No hay sesiones pendientes para este alumno.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 14px",
                    borderRadius: 14, border: "1.5px solid var(--border-input)",
                    background: "var(--surface-elevated)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      {s.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, marginTop: 2, color: "var(--text-secondary)" }}>
                      {s.routine_day_name ? `${s.routine_day_name} · ` : ""}{fmtDate(s.scheduled_date)} · {s.exercises.length} ejercicios
                    </p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Trainer-logged badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(83,74,183,0.1)", borderRadius: 10, padding: "8px 12px",
              fontSize: 12, fontWeight: 600, color: "#534AB7",
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Cargado por entrenador
            </div>

            {selectedSession.exercises.map(ex => {
              const st = exStates[ex.id] ?? { weightKg: "", completedSets: "", rpe: "" };
              return (
                <div key={ex.id} style={{
                  border: "1.5px solid var(--border-input)",
                  borderRadius: 14, padding: "12px 14px",
                  background: "var(--surface-elevated)",
                }}>
                  <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {ex.name}
                  </p>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-secondary)" }}>
                    Prescrito: {ex.sets} series · {ex.reps}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Peso (kg)", key: "weightKg", placeholder: "—", type: "number" },
                      { label: "Series",    key: "completedSets", placeholder: String(ex.sets), type: "number" },
                      { label: "RPE",       key: "rpe", placeholder: "—", type: "number" },
                    ].map(field => (
                      <div key={field.key}>
                        <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {field.label}
                        </p>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={st[field.key as keyof ExState]}
                          onChange={e => setExStates(prev => ({
                            ...prev,
                            [ex.id]: { ...prev[ex.id], [field.key]: e.target.value },
                          }))}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            height: 38, borderRadius: 10,
                            border: "1.5px solid var(--border-input)",
                            background: "var(--surface-input)",
                            color: "var(--text-primary)",
                            paddingLeft: 10, paddingRight: 10,
                            fontSize: 14, fontWeight: 600, outline: "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
