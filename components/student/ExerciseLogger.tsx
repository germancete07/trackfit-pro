"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RPESlider } from "@/components/ui/RPESlider";
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
  routineDayName?: string | null;
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

// ── Group helpers ─────────────────────────────────────────────────────────────
const WORKOUT_GROUP_COLORS: Record<string, string> = {
  A: "#3b82f6", B: "#10b981", C: "#8b5cf6", D: "#f59e0b", E: "#ec4899",
  F: "#14b8a6", G: "#f97316", H: "#84cc16",
};
function wGroupColor(grp: string): string {
  return WORKOUT_GROUP_COLORS[grp] ?? "#6b7280";
}
function wGroupType(count: number): string {
  return count >= 3 ? "Circuito" : "Superserie";
}

// Build navigation blocks: consecutive exercises sharing the same superset_group
// form one block; exercises with no group are individual blocks.
type Block =
  | { type: "circuit"; group: string; exercises: ExerciseWithLogs[] }
  | { type: "single"; exercise: ExerciseWithLogs };

function buildBlocks(exercises: ExerciseWithLogs[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.superset_group) {
      const grp = ex.superset_group;
      const group: ExerciseWithLogs[] = [];
      while (i < exercises.length && exercises[i].superset_group === grp) {
        group.push(exercises[i]);
        i++;
      }
      blocks.push({ type: "circuit", group: grp, exercises: group });
    } else {
      blocks.push({ type: "single", exercise: ex });
      i++;
    }
  }
  return blocks;
}

// Parse "8", "8-12", "3x10", etc.
function parseReps(repsStr: string): number {
  const matches = repsStr.match(/\d+/g);
  if (!matches) return 8;
  const nums = matches.map(Number);
  if (nums.length === 1) return nums[0];
  if (repsStr.includes("x")) return nums[nums.length - 1];
  if (repsStr.includes("-")) return Math.round((nums[0] + nums[1]) / 2);
  return nums[0];
}

// ─────────────────────────────────────────────────────────────────────────────

export function ExerciseLogger({ session, exercises, studentId, routineDayName }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { start: startTimer } = useTimer();

  const blocks = buildBlocks(exercises);
  const [activeBlock, setActiveBlock] = useState(0);
  // Which exercises have their detail panel expanded (notes + video + RPE)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Which exercises have their YouTube video open
  const [expandedVideoIds, setExpandedVideoIds] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [prInfo, setPrInfo] = useState<{ exerciseName: string; weight: number } | null>(null);
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

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleVideo(id: string) {
    setExpandedVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
      showToast(`${exercise.name} guardado`);

      if (newWeight > prevMax) {
        setPrInfo({ exerciseName: exercise.name, weight: newWeight });
        setTimeout(() => setPrInfo(null), 3500);
        void notifyPRAction(exercise.name, newWeight);
      }
    }
  }

  const allSaved = exercises.length > 0 && exercises.every((ex) => logs[ex.id]?.saved);
  const doneCount = exercises.filter((e) => logs[e.id]?.saved).length;

  async function finishSession() {
    if (finishLoading) return;
    setFinishLoading(true);
    const savedLogs = exercises.filter(ex => logs[ex.id]?.saved).map(ex => logs[ex.id]);
    const totalWeight = Math.round(
      savedLogs.reduce((sum, l) => sum + (parseFloat(l.weight_kg) || 0) * (parseInt(l.completed_sets) || 0), 0)
    );
    const rpeVals = savedLogs.map(l => l.rpe as number).filter(r => r > 0);
    const avgRpe = rpeVals.length > 0 ? Math.round(rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length * 10) / 10 : 0;
    setSummary({ totalWeight, avgRpe });
    const result = await finishSessionAction(session.id);
    setFinishLoading(false);
    if (!result || "error" in result) {
      showToast(result?.error ?? "Error al guardar la sesión. Intentá de nuevo.");
      return;
    }
    setShowCelebration(true);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function blockIsDone(block: Block): boolean {
    if (block.type === "single") return !!logs[block.exercise.id]?.saved;
    return block.exercises.every(ex => logs[ex.id]?.saved);
  }

  function blockRestSeconds(block: Block): number {
    if (block.type === "single") return block.exercise.rest_seconds ?? 90;
    const found = block.exercises.find(ex => ex.rest_seconds);
    return found?.rest_seconds ?? 90;
  }

  // ── Single exercise row card ─────────────────────────────────────────────────

  function ExerciseRow({ ex, circuitIndex, inCircuit }: { ex: ExerciseWithLogs; circuitIndex: number; inCircuit: boolean }) {
    const log = logs[ex.id];
    const isExpanded = expandedIds.has(ex.id);
    const isVideoExpanded = expandedVideoIds.has(ex.id);
    const embedUrl = ex.youtube_url ? getYoutubeEmbedUrl(ex.youtube_url) : null;
    const hasDetail = !!(ex.technical_note || embedUrl);

    const current1rm = log?.saved && parseFloat(log.weight_kg) > 0
      ? parseFloat(log.weight_kg) * (1 + parseReps(ex.reps) / 30)
      : null;

    const prevLog = ex.exercise_logs?.[0];
    const deloadSuggested = session.is_deload && prevLog?.weight_kg
      ? Math.round(prevLog.weight_kg * 0.6 * 2) / 2
      : null;

    return (
      <div
        className={`flex flex-col rounded-2xl overflow-hidden transition-all ${
          log?.saved
            ? "border border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/20"
            : "border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E1E2E]"
        }`}
      >
        {/* Main content */}
        <div className="px-4 pt-4 pb-3 flex flex-col gap-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* Circuit letter badge (A1, A2…) */}
              {inCircuit && ex.superset_group && (
                <span
                  className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                  style={{ backgroundColor: wGroupColor(ex.superset_group) }}
                >
                  {ex.superset_group}{circuitIndex + 1}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleExpanded(ex.id)}
                  className="text-base font-black text-gray-900 dark:text-white text-left flex items-center gap-1.5 w-full"
                >
                  <span className="truncate block">{ex.name}</span>
                  {hasDetail && (
                    <svg
                      className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180 text-brand-500" : "text-gray-300 dark:text-white/20"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  )}
                </button>
                <p className="text-xs text-brand-500 font-semibold mt-0.5">
                  {ex.sets} series × {ex.reps} reps
                  {ex.muscle_group && (
                    <span className="text-gray-400 dark:text-white/30 font-normal"> · {ex.muscle_group}</span>
                  )}
                </p>
              </div>
            </div>
            {log?.saved && (
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mt-0.5">
                <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            )}
          </div>

          {/* Deload suggestion */}
          {session.is_deload && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 border border-amber-100 dark:border-amber-800/40">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                🔋 Sugerido esta semana:
                {deloadSuggested
                  ? <span className="text-amber-900 dark:text-amber-300 font-black ml-1">{deloadSuggested} kg (60%)</span>
                  : <span className="ml-1">~60% del peso habitual</span>
                }
              </p>
            </div>
          )}

          {/* Error */}
          {log?.error && (
            <p className="text-xs text-red-500 font-medium -mb-1">{log.error}</p>
          )}

          {/* Weight + Sets inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Peso (kg)"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="ej: 80"
              value={log?.weight_kg ?? ""}
              onChange={(e) => updateLog(ex.id, "weight_kg", e.target.value)}
            />
            <Input
              label="Series realizadas"
              type="number"
              inputMode="numeric"
              min="0"
              max="20"
              value={log?.completed_sets ?? ""}
              onChange={(e) => updateLog(ex.id, "completed_sets", e.target.value)}
            />
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveLog(ex)}
            loading={log?.saving}
            variant={log?.saved ? "secondary" : "primary"}
            size="sm"
            className="w-full"
          >
            {log?.saved ? "✓ Guardado · Modificar" : "Guardar"}
          </Button>

          {/* 1RM estimate */}
          {current1rm !== null && (
            <p className="text-xs text-center text-gray-400 dark:text-white/30 -mt-1">
              1RM estimado: <span className="font-black text-brand-500">{current1rm.toFixed(1)} kg</span>
              <span className="text-gray-300 dark:text-white/20"> · estimado teórico</span>
            </p>
          )}
        </div>

        {/* Hint to expand when detail exists but not yet expanded */}
        {!isExpanded && hasDetail && (
          <button
            type="button"
            onClick={() => toggleExpanded(ex.id)}
            className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-2 w-full text-xs text-gray-400 dark:text-white/30 flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Tocá para ver descripción
            {embedUrl && " y video"}
          </button>
        )}

        {/* Expandable detail: notes, video, RPE, comment */}
        {isExpanded && (
          <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-4 flex flex-col gap-3 bg-gray-50/60 dark:bg-white/[0.025]">
            {ex.technical_note && (
              <div className="bg-brand-50 dark:bg-brand-500/10 rounded-xl px-3 py-3 border border-brand-100 dark:border-brand-500/20">
                <p className="text-xs font-bold text-brand-500 uppercase tracking-wide mb-1.5">📌 Descripción y notas técnicas</p>
                <p className="text-sm text-brand-800 dark:text-brand-300 leading-relaxed">{ex.technical_note}</p>
              </div>
            )}

            {embedUrl && (
              <div>
                {isVideoExpanded ? (
                  <div>
                    <div className="aspect-video rounded-xl overflow-hidden shadow">
                      <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={ex.name} />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleVideo(ex.id)}
                      className="w-full text-xs text-gray-400 dark:text-white/30 py-2 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
                    >
                      Cerrar video ↑
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleVideo(ex.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.09] transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 shadow">
                      <svg className="h-3.5 w-3.5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-white/80">Ver video de referencia</span>
                  </button>
                )}
              </div>
            )}

            <RPESlider value={log?.rpe ?? 7} onChange={(v) => updateLog(ex.id, "rpe", v)} />

            <Textarea
              label="Comentario (opcional)"
              placeholder="¿Cómo se sintió? ¿Alguna molestia?"
              value={log?.comment ?? ""}
              onChange={(e) => updateLog(ex.id, "comment", e.target.value)}
              rows={2}
            />

            {/* Collapse button */}
            <button
              type="button"
              onClick={() => toggleExpanded(ex.id)}
              className="w-full text-xs text-gray-400 dark:text-white/30 flex items-center justify-center gap-1 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
            >
              <svg className="h-3 w-3 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              Cerrar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Block renderer ───────────────────────────────────────────────────────────

  function renderBlock(block: Block) {
    const done = blockIsDone(block);
    const restSecs = blockRestSeconds(block);
    const isLastBlock = activeBlock >= blocks.length - 1;

    if (block.type === "single") {
      const ex = block.exercise;
      const flatIdx = exercises.findIndex(e => e.id === ex.id);

      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-brand-500 dark:text-brand-400 font-bold uppercase tracking-wide">
            Ejercicio {flatIdx + 1} de {exercises.length}
          </p>
          <ExerciseRow ex={ex} circuitIndex={0} inCircuit={false} />

          {done && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startTimer(restSecs)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/15 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Descanso {restSecs}s
              </button>
              {!isLastBlock && (
                <button
                  type="button"
                  onClick={() => setActiveBlock(activeBlock + 1)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-800 dark:hover:bg-white/90 transition-colors"
                >
                  Siguiente
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── Circuit / Superset block ─────────────────────────────────────────────
    const grpColor = wGroupColor(block.group);
    const savedCount = block.exercises.filter(ex => logs[ex.id]?.saved).length;
    const total = block.exercises.length;

    return (
      <div className="flex flex-col gap-3">
        {/* Circuit header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: grpColor }} />
            <span className="text-sm font-black uppercase tracking-wide" style={{ color: grpColor }}>
              {wGroupType(total)} {block.group}
            </span>
            <span className="text-xs text-gray-400 dark:text-white/40 font-medium">
              · {total} ejercicios · sin descanso entre ellos
            </span>
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-white/40 flex-shrink-0 ml-2">
            {savedCount}/{total}
          </span>
        </div>

        {/* All exercises shown simultaneously */}
        {block.exercises.map((ex, i) => (
          <ExerciseRow key={ex.id} ex={ex} circuitIndex={i} inCircuit />
        ))}

        {/* After completing the full circuit round: rest + next block */}
        {done && (
          <div
            className="rounded-2xl px-4 py-4 flex flex-col gap-3"
            style={{ background: grpColor + "14", border: `1.5px solid ${grpColor}50` }}
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: grpColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-black" style={{ color: grpColor }}>
                ¡{wGroupType(total)} {block.group} completado!
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-white/40 -mt-1">
              Descansá antes de pasar al siguiente bloque.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startTimer(restSecs)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: grpColor + "20", color: grpColor }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Descanso {restSecs}s
              </button>
              {!isLastBlock && (
                <button
                  type="button"
                  onClick={() => setActiveBlock(activeBlock + 1)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-800 dark:hover:bg-white/90 transition-colors"
                >
                  Siguiente bloque
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Block tab bar ────────────────────────────────────────────────────────────

  function BlockTabBar() {
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {blocks.map((block, i) => {
          const isActive = i === activeBlock;
          const done = blockIsDone(block);
          let label: string;
          let sub: string;

          if (block.type === "circuit") {
            label = `${wGroupType(block.exercises.length).slice(0, 4)} ${block.group}`;
            sub = `${block.exercises.length} ej.`;
          } else {
            const flatIdx = exercises.findIndex(e => e.id === block.exercise.id);
            label = `${flatIdx + 1}.`;
            sub = block.exercise.name.slice(0, 10) + (block.exercise.name.length > 10 ? "…" : "");
          }

          return (
            <button
              key={i}
              onClick={() => setActiveBlock(i)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-w-[60px] ${
                isActive
                  ? "bg-brand-500 text-white shadow-sm"
                  : done
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              <span>{done && !isActive ? "✓" : label}</span>
              <span className={`text-[10px] font-normal mt-0.5 ${isActive ? "text-white/80" : done ? "text-green-600 dark:text-green-500" : "text-gray-400 dark:text-white/30"}`}>
                {sub}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Full render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* PR Celebration */}
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
        {/* Deload Banner */}
        {session.is_deload && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🔋</span>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Semana de descarga</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Reducí el peso al 60% para recuperar. Es una sugerencia, no obligatorio.
              </p>
            </div>
          </div>
        )}

        {/* Session header + global progress */}
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{session.name}</h1>
          {routineDayName && (
            <p className="text-sm font-semibold text-brand-500 dark:text-brand-400 mt-0.5">{routineDayName}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / exercises.length) * 100}%`, background: "#534AB7" }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-white/40 flex-shrink-0">
              {doneCount}/{exercises.length} ejercicios
            </span>
          </div>
        </div>

        {/* Block navigation tabs */}
        <BlockTabBar />

        {/* Active block */}
        {blocks[activeBlock] && renderBlock(blocks[activeBlock])}

        {/* Global prev/next navigation */}
        <div className="flex gap-2">
          {activeBlock > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setActiveBlock(activeBlock - 1)} className="flex-1">
              ← Anterior
            </Button>
          )}
          {activeBlock < blocks.length - 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveBlock(activeBlock + 1)}
              className={activeBlock > 0 ? "flex-1" : "w-full"}
            >
              Siguiente →
            </Button>
          )}
        </div>

        {/* Finish session */}
        {allSaved && (
          <Button
            size="lg"
            className="w-full md:max-w-sm md:mx-auto"
            onClick={finishSession}
            loading={finishLoading}
            disabled={finishLoading}
          >
            Finalizar rutina
          </Button>
        )}
      </div>
    </>
  );
}
