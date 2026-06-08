"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RPESlider } from "@/components/ui/RPESlider";
import { Badge } from "@/components/ui/Badge";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import { useToast } from "@/components/shared/ToastProvider";
import { useTimer } from "@/components/shared/TimerContext";
import { SessionComplete } from "@/components/student/SessionComplete";
import { finishSessionAction, getPrevMaxAction, notifyPRAction } from "@/app/dashboard/my-sessions/actions";
import type { Exercise, Session } from "@/lib/types";

interface ExerciseWithLogs extends Exercise {
  exercise_logs: { weight_kg: number | null; completed_sets: number | null; rpe: number | null; comment: string | null }[];
}

interface Props {
  session: Session;
  exercises: ExerciseWithLogs[];
  studentId: string;
}

interface LogState {
  weight_kg: string;
  completed_sets: string;
  rpe: number;
  comment: string;
  saved: boolean;
  saving: boolean;
  error: string;
}

// ── Superset group helpers ────────────────────────────────────────────────────
const WORKOUT_GROUP_COLORS: Record<string, string> = {
  A: "#3b82f6", B: "#10b981", C: "#8b5cf6", D: "#f59e0b", E: "#ec4899",
};
function wGroupColor(grp: string): string {
  return WORKOUT_GROUP_COLORS[grp] ?? "#6b7280";
}
function wGroupLabel(exercises: ExerciseWithLogs[], i: number): string {
  const grp = exercises[i].superset_group;
  if (!grp) return String(i + 1);
  const before = exercises.slice(0, i).filter((e) => e.superset_group === grp).length;
  return `${grp}${before + 1}`;
}
function wCountInGroup(exercises: ExerciseWithLogs[], grp: string): number {
  return exercises.filter((e) => e.superset_group === grp).length;
}
function wGroupType(exercises: ExerciseWithLogs[], grp: string): string {
  return wCountInGroup(exercises, grp) >= 3 ? "Circuito" : "Superserie";
}
// ─────────────────────────────────────────────────────────────────────────────

// Parse "8", "8-12", "3x10", etc. to a representative number for 1RM
function parseReps(repsStr: string): number {
  const matches = repsStr.match(/\d+/g);
  if (!matches) return 8;
  const nums = matches.map(Number);
  if (nums.length === 1) return nums[0];
  if (repsStr.includes("x")) return nums[nums.length - 1]; // 3x10 → 10
  if (repsStr.includes("-")) return Math.round((nums[0] + nums[1]) / 2); // 8-12 → 10
  return nums[0];
}

export function ExerciseLogger({ session, exercises, studentId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { start: startTimer } = useTimer();
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [prInfo, setPrInfo] = useState<{ exerciseName: string; weight: number } | null>(null);
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ totalWeight: number; avgRpe: number }>({ totalWeight: 0, avgRpe: 0 });

  const [logs, setLogs] = useState<Record<string, LogState>>(() => {
    const init: Record<string, LogState> = {};
    exercises.forEach((ex) => {
      const prev = ex.exercise_logs?.[0];
      init[ex.id] = {
        weight_kg: prev?.weight_kg?.toString() ?? "",
        completed_sets: prev?.completed_sets?.toString() ?? ex.sets.toString(),
        rpe: prev?.rpe ?? 7,
        comment: prev?.comment ?? "",
        saved: ex.exercise_logs?.length > 0,
        saving: false,
        error: "",
      };
    });
    return init;
  });

  function updateLog(exerciseId: string, field: keyof LogState, value: string | number | boolean) {
    setLogs((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: value, saved: false },
    }));
  }

  async function saveLog(exercise: ExerciseWithLogs) {
    const log = logs[exercise.id];
    const newWeight = parseFloat(log.weight_kg);
    if (!newWeight) {
      updateLog(exercise.id, "error", "Ingresá el peso");
      return;
    }
    updateLog(exercise.id, "saving", true);
    updateLog(exercise.id, "error", "");

    // Check previous PR before saving (parallel-safe: read before write)
    const prevMax = await getPrevMaxAction(exercise.name);

    const supabase = createClient();
    const { error } = await supabase.from("exercise_logs").upsert({
      exercise_id: exercise.id,
      student_id: studentId,
      session_id: session.id,
      weight_kg: newWeight,
      completed_sets: parseInt(log.completed_sets) || exercise.sets,
      rpe: log.rpe,
      comment: log.comment.trim() || null,
      logged_at: new Date().toISOString(),
    }, { onConflict: "exercise_id,student_id" });

    if (error) {
      showToast("Error al guardar. Intentá de nuevo.", "error");
      updateLog(exercise.id, "error", "Error al guardar");
      updateLog(exercise.id, "saving", false);
    } else {
      setLogs((prev) => ({
        ...prev,
        [exercise.id]: { ...prev[exercise.id], saved: true, saving: false, error: "" },
      }));
      // "pop" animation on the exercise tab
      setJustSaved(prev => new Set(prev).add(exercise.id));
      setTimeout(() => setJustSaved(prev => { const s = new Set(prev); s.delete(exercise.id); return s; }), 600);
      showToast(`${exercise.name} guardado`);

      // PR detection
      if (newWeight > prevMax) {
        setPrInfo({ exerciseName: exercise.name, weight: newWeight });
        setTimeout(() => setPrInfo(null), 3500);
        void notifyPRAction(exercise.name, newWeight);
      }

      // Don't auto-advance when in a superset — the student uses the "Siguiente" button
      const nextInSave = activeIndex < exercises.length - 1 ? exercises[activeIndex + 1] : null;
      const inSuperset = !!(exercise.superset_group && nextInSave?.superset_group === exercise.superset_group);
      if (activeIndex < exercises.length - 1 && !inSuperset) {
        setTimeout(() => setActiveIndex(activeIndex + 1), 300);
      }
    }
  }

  // Guard against vacuous truth: [].every(fn) is true in JS — session with 0 exercises
  // would show the "Finalizar" button immediately without any work logged.
  const allSaved = exercises.length > 0 && exercises.every((ex) => logs[ex.id]?.saved);
  const doneCount = exercises.filter((e) => logs[e.id]?.saved).length;

  async function finishSession() {
    if (finishLoading) return;
    setFinishLoading(true);

    // Compute summary stats from saved logs
    const savedLogs = exercises
      .filter(ex => logs[ex.id]?.saved)
      .map(ex => logs[ex.id]);
    const totalWeight = Math.round(savedLogs.reduce((sum, l) => {
      return sum + (parseFloat(l.weight_kg) || 0) * (parseInt(l.completed_sets) || 0);
    }, 0));
    const rpeVals = savedLogs.map(l => l.rpe as number).filter(r => r > 0);
    const avgRpe = rpeVals.length > 0
      ? Math.round(rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length * 10) / 10
      : 0;
    setSummary({ totalWeight, avgRpe });

    const result = await finishSessionAction(session.id);
    setFinishLoading(false);

    if (!result || "error" in result) {
      showToast(result?.error ?? "Error al guardar la sesión. Intentá de nuevo.");
      return;
    }

    setShowCelebration(true);
  }

  const ex = exercises[activeIndex];
  const log = ex ? logs[ex.id] : null;
  const embedUrl = ex?.youtube_url ? getYoutubeEmbedUrl(ex.youtube_url) : null;
  const prevLog = ex?.exercise_logs?.[0];
  const nextEx = activeIndex < exercises.length - 1 ? exercises[activeIndex + 1] : null;
  const isSuperset = !!(ex?.superset_group && nextEx?.superset_group === ex.superset_group);

  // 1RM based on planned reps
  const current1rm = log?.saved && ex && parseFloat(log.weight_kg) > 0
    ? parseFloat(log.weight_kg) * (1 + parseReps(ex.reps) / 30)
    : null;

  // Deload suggested weight
  const deloadSuggested = session.is_deload && prevLog?.weight_kg
    ? Math.round(prevLog.weight_kg * 0.6 * 2) / 2 // round to nearest 0.5
    : null;

  return (
    <>
      {/* ── PR Celebration Overlay ──────────────────────────────── */}
      {prInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPrInfo(null)}
        >
          <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-yellow-400 text-center mx-6 max-w-xs w-full">
            <div className="text-6xl mb-3 animate-bounce">🏆</div>
            <p className="text-2xl font-black text-gray-900">¡Nuevo récord!</p>
            <p className="text-brand-600 font-bold mt-1 text-lg">{prInfo.exerciseName}</p>
            <div className="mt-3 bg-yellow-50 rounded-2xl p-4">
              <p className="text-4xl font-black text-yellow-500">{prInfo.weight} kg</p>
              <p className="text-xs text-yellow-600 mt-0.5 font-semibold">Récord personal</p>
            </div>
            <p className="text-xs text-gray-400 mt-4">Tocá para cerrar</p>
          </div>
        </div>
      )}

      {/* ── Exercise Detail Sheet ──────────────────────────────── */}
      {detailOpen && ex && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl mx-0 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-gray-900 truncate">{ex.name}</h3>
                <p className="text-xs text-brand-600 font-semibold">{ex.sets} series × {ex.reps} reps</p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="ml-3 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4 pb-10">
              {ex.muscle_group && (
                <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 w-fit capitalize">
                  {ex.muscle_group}
                </span>
              )}
              {ex.rest_seconds && (
                <p className="text-xs text-gray-400">Descanso entre series: {ex.rest_seconds}s</p>
              )}
              {ex.technical_note ? (
                <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
                  <p className="text-xs font-bold text-brand-500 uppercase tracking-wide mb-2">Descripción y notas técnicas</p>
                  <p className="text-sm text-brand-900 leading-relaxed">{ex.technical_note}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">Sin descripción disponible para este ejercicio.</p>
              )}
              {embedUrl && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Video de referencia</p>
                  <div className="aspect-video rounded-2xl overflow-hidden shadow">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={ex.name} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
        <SessionComplete
          sessionName={session.name}
          exerciseCount={doneCount}
          totalWeightKg={summary.totalWeight}
          avgRpe={summary.avgRpe}
          onFinish={() => { router.push("/dashboard"); router.refresh(); }}
        />
      )}

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* ── Deload Banner ──────────────────────────────────────── */}
        {session.is_deload && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🔋</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Semana de descarga</p>
              <p className="text-xs text-amber-600">Reducí el peso al 60% para recuperar. Es una sugerencia, no obligatorio.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-gray-900">{session.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / exercises.length) * 100}%`, background: "#534AB7" }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 flex-shrink-0">
              {doneCount}/{exercises.length} ejercicios
            </span>
          </div>
        </div>

        {/* Exercise tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {exercises.map((e, i) => {
            const isActive = i === activeIndex;
            const saved = !!logs[e.id]?.saved;
            const grp = e.superset_group;
            const label = grp ? wGroupLabel(exercises, i) : (saved ? "✓" : `${i + 1}.`);
            const shortName = e.name.slice(0, grp ? 9 : 12) + (e.name.length > (grp ? 9 : 12) ? "…" : "");
            const grpColor = grp ? wGroupColor(grp) : null;
            return (
              <button
                key={e.id}
                onClick={() => setActiveIndex(i)}
                className={`flex-shrink-0 h-9 px-3 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand-500 text-white shadow-sm"
                    : saved
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                } ${justSaved.has(e.id) ? "scale-110" : "scale-100"}`}
                style={{ transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              >
                {grp && !isActive && !saved && grpColor ? (
                  <span style={{ color: grpColor }} className="font-black">{label}</span>
                ) : (
                  label
                )}{" "}{shortName}
              </button>
            );
          })}
        </div>

        {/* Main content: two columns on desktop */}
        {ex && log && (
          <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start flex flex-col gap-3">

            {/* Left: exercise info */}
            <div className="flex flex-col gap-3 md:sticky md:top-20">
              <Card padding="md" className={session.is_deload ? "border-amber-200" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {ex.superset_group ? (
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: wGroupColor(ex.superset_group) }}
                        />
                        <span
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: wGroupColor(ex.superset_group) }}
                        >
                          {wGroupType(exercises, ex.superset_group)} {ex.superset_group}
                          {" · "}
                          {wGroupLabel(exercises, activeIndex)}/{wCountInGroup(exercises, ex.superset_group)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-brand-500 font-bold uppercase tracking-wide mb-0.5">
                        Ejercicio {activeIndex + 1} de {exercises.length}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailOpen(true)}
                      className="text-lg font-black text-gray-900 text-left hover:text-brand-600 transition-colors flex items-center gap-1.5"
                    >
                      {ex.name}
                      <svg className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </button>
                    <p className="text-sm text-brand-600 font-semibold mt-0.5">
                      {ex.sets} series × {ex.reps} reps
                    </p>
                    {ex.rest_seconds && (
                      <p className="text-xs text-gray-400 mt-0.5">{ex.rest_seconds}s de descanso</p>
                    )}
                    {ex.muscle_group && (
                      <p className="text-xs text-gray-400 mt-0.5">{ex.muscle_group}</p>
                    )}
                  </div>
                  {log.saved && <Badge variant="success">✓ Guardado</Badge>}
                </div>

                {/* Deload suggestion */}
                {session.is_deload && (
                  <div className="mt-3 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700">
                      🔋 Sugerido esta semana:
                      {deloadSuggested
                        ? <span className="text-amber-900 font-black ml-1">{deloadSuggested} kg</span>
                        : <span className="ml-1">~60% de tu peso habitual</span>
                      }
                    </p>
                  </div>
                )}

                {ex.technical_note && (
                  <div className="mt-3 bg-brand-50 rounded-xl px-3 py-2.5 border border-brand-100">
                    <p className="text-xs font-semibold text-brand-600 mb-0.5">📌 Nota técnica</p>
                    <p className="text-sm text-brand-700">{ex.technical_note}</p>
                  </div>
                )}
              </Card>

              {/* Video */}
              {embedUrl && (
                <Card padding="none" className="overflow-hidden">
                  {expandedVideo === ex.id ? (
                    <div className="aspect-video">
                      <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={ex.name} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpandedVideo(ex.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 shadow">
                        <svg className="h-4 w-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">Ver video de referencia</span>
                    </button>
                  )}
                </Card>
              )}

              {/* Desktop prev/next */}
              <div className="hidden md:flex gap-2">
                {activeIndex > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setActiveIndex(activeIndex - 1)} className="flex-1">
                    ← Anterior
                  </Button>
                )}
                {activeIndex < exercises.length - 1 && (
                  <Button variant="secondary" size="sm" onClick={() => setActiveIndex(activeIndex + 1)} className="flex-1">
                    Siguiente →
                  </Button>
                )}
              </div>
            </div>

            {/* Right: log form */}
            <div className="flex flex-col gap-3">
              <Card padding="md" className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-700">Registrá tu carga</h3>

                {log.error && (
                  <p className="text-xs text-red-500 font-medium">{log.error}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Peso (kg)"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder="ej: 80"
                    value={log.weight_kg}
                    onChange={(e) => updateLog(ex.id, "weight_kg", e.target.value)}
                  />
                  <Input
                    label="Series realizadas"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="20"
                    value={log.completed_sets}
                    onChange={(e) => updateLog(ex.id, "completed_sets", e.target.value)}
                  />
                </div>

                <RPESlider value={log.rpe} onChange={(v) => updateLog(ex.id, "rpe", v)} />

                <Textarea
                  label="Comentario (opcional)"
                  placeholder="¿Cómo se sintió? ¿Alguna molestia?"
                  value={log.comment}
                  onChange={(e) => updateLog(ex.id, "comment", e.target.value)}
                  rows={2}
                />

                <Button
                  onClick={() => saveLog(ex)}
                  loading={log.saving}
                  variant={log.saved ? "secondary" : "primary"}
                  className="w-full"
                >
                  {log.saved ? "✓ Guardado · Modificar" : "Guardar"}
                </Button>

                {/* 1RM estimate */}
                {current1rm !== null && (
                  <p className="text-xs text-center text-gray-400">
                    1RM estimado: <span className="font-black text-brand-600">{current1rm.toFixed(1)} kg</span>
                    <span className="text-gray-300"> · estimado teórico, no ejecutar</span>
                  </p>
                )}

                {log.saved && isSuperset ? (
                  <button
                    type="button"
                    onClick={() => setActiveIndex(activeIndex + 1)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors"
                    style={{
                      backgroundColor: wGroupColor(ex.superset_group!) + "0d",
                      borderColor: wGroupColor(ex.superset_group!) + "55",
                    }}
                  >
                    <div className="text-left">
                      <p
                        className="text-xs font-black uppercase tracking-wide"
                        style={{ color: wGroupColor(ex.superset_group!) }}
                      >
                        {wGroupType(exercises, ex.superset_group!)} — sin descanso
                      </p>
                      <p className="text-sm font-semibold text-gray-700">
                        Siguiente: {nextEx!.name}
                      </p>
                    </div>
                    <svg
                      className="h-5 w-5 flex-shrink-0"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      style={{ color: wGroupColor(ex.superset_group!) }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                ) : log.saved ? (
                  <button
                    type="button"
                    onClick={() => startTimer(ex.rest_seconds ?? 90)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-50 border border-brand-100 text-sm font-semibold text-brand-600 hover:bg-brand-100 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Descanso {ex.rest_seconds ? `${ex.rest_seconds}s` : "90s"}
                  </button>
                ) : null}
              </Card>

              {/* Mobile prev/next */}
              <div className="flex gap-2 md:hidden">
                {activeIndex > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setActiveIndex(activeIndex - 1)} className="flex-1">
                    ← Anterior
                  </Button>
                )}
                {activeIndex < exercises.length - 1 && (
                  <Button variant="secondary" size="sm" onClick={() => setActiveIndex(activeIndex + 1)} className="flex-1">
                    Siguiente →
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Finish */}
        {allSaved && (
          <Button size="lg" className="w-full md:max-w-sm md:mx-auto" onClick={finishSession} loading={finishLoading} disabled={finishLoading}>
            Finalizar rutina
          </Button>
        )}
      </div>
    </>
  );
}
