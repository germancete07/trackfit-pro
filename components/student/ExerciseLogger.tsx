"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import { useToast } from "@/components/shared/ToastProvider";
import { useTimer } from "@/components/shared/TimerContext";
import { SessionComplete } from "@/components/student/SessionComplete";
import { finishSessionAction, getPrevMaxAction, notifyPRAction } from "@/app/dashboard/my-sessions/actions";
import { Modal } from "@/components/ui/Modal";
import type { Exercise, Session } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseWithLogs extends Exercise {
  exercise_logs: {
    weight_kg: number | null;
    completed_sets: number | null;
    rpe: number | null;
    comment: string | null;
  }[];
}

interface Props {
  session: Session;
  exercises: ExerciseWithLogs[];
  studentId: string;
  routineDayName?: string | null;
}

interface SetState {
  weight: string;
  checked: boolean;
}

interface ExState {
  sets: SetState[];
  rpe: number;
  saved: boolean;
  saving: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  A: "#8b5cf6",
  B: "#14b8a6",
  C: "#f97316",
  D: "#f59e0b",
  E: "#ec4899",
  F: "#3b82f6",
  G: "#84cc16",
  H: "#06b6d4",
};
function groupColor(g: string) { return GROUP_COLORS[g] ?? "#6b7280"; }
function groupType(n: number) { return n >= 3 ? "Circuito" : "Superserie"; }

// ── Block builder ─────────────────────────────────────────────────────────────

type Block =
  | { type: "single"; exercise: ExerciseWithLogs }
  | { type: "circuit"; group: string; exercises: ExerciseWithLogs[] };

function buildBlocks(exercises: ExerciseWithLogs[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.superset_group) {
      const grp = ex.superset_group;
      const group: ExerciseWithLogs[] = [];
      while (i < exercises.length && exercises[i].superset_group === grp) {
        group.push(exercises[i++]);
      }
      blocks.push({ type: "circuit", group: grp, exercises: group });
    } else {
      blocks.push({ type: "single", exercise: ex });
      i++;
    }
  }
  return blocks;
}

// ── Date helper ───────────────────────────────────────────────────────────────

function formatSessionDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function rpeLabel(v: number): string {
  if (v <= 3) return "Muy fácil";
  if (v <= 5) return "Moderado";
  if (v <= 7) return "Difícil";
  if (v <= 9) return "Muy difícil";
  return "Máximo esfuerzo";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExerciseLogger({ session, exercises, studentId, routineDayName }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { timer, start: startTimer, dismiss: dismissTimer } = useTimer();

  const blocks = buildBlocks(exercises);

  // Accordion: only one exercise open at a time
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [prInfo, setPrInfo] = useState<{ exerciseName: string; weight: number } | null>(null);
  const [summary, setSummary] = useState<{ totalWeight: number; avgRpe: number }>({ totalWeight: 0, avgRpe: 0 });

  // Per-exercise state: per-set weights + checked status
  const [exStates, setExStates] = useState<Record<string, ExState>>(() => {
    const init: Record<string, ExState> = {};
    for (const ex of exercises) {
      const prev = ex.exercise_logs?.[0];
      const numSets = Math.max(ex.sets || 1, 1);
      const checkedCount = Math.min(prev?.completed_sets ?? 0, numSets);
      const savedWeight = prev?.weight_kg?.toString() ?? "";
      init[ex.id] = {
        sets: Array.from({ length: numSets }, (_, i) => ({
          weight: savedWeight,
          checked: i < checkedCount,
        })),
        rpe: prev?.rpe ?? 7,
        saved: !!prev,
        saving: false,
      };
    }
    return init;
  });

  // Fill the full content area on desktop — removes max-w-4xl from the layout wrapper
  useEffect(() => {
    document.body.classList.add("training-active");
    return () => document.body.classList.remove("training-active");
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
    // Close video when switching exercises
    if (openVideoId !== null) setOpenVideoId(null);
  }

  function updateSetWeight(exId: string, setIdx: number, weight: string) {
    setExStates(prev => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        sets: prev[exId].sets.map((s, i) => i === setIdx ? { ...s, weight } : s),
      },
    }));
  }

  function updateRpe(exId: string, rpe: number) {
    setExStates(prev => ({ ...prev, [exId]: { ...prev[exId], rpe } }));
  }

  async function toggleSetCheck(exId: string, setIdx: number) {
    const ex = exercises.find(e => e.id === exId)!;
    const prevState = exStates[exId];
    const wasChecked = prevState.sets[setIdx].checked;

    const newSets = prevState.sets.map((s, i) =>
      i === setIdx ? { ...s, checked: !s.checked } : s
    );
    const newState: ExState = { ...prevState, sets: newSets, saving: true };
    setExStates(prev => ({ ...prev, [exId]: newState }));

    // Start rest timer on check (not uncheck)
    if (!wasChecked) {
      startTimer(ex.rest_seconds ?? 90);
    }

    // Compute weight/sets for save
    const checkedCount = newSets.filter(s => s.checked).length;
    const checkedWeights = newSets
      .filter(s => s.checked && s.weight.trim())
      .map(s => parseFloat(s.weight))
      .filter(w => !isNaN(w) && w > 0);
    const maxWeight = checkedWeights.length > 0 ? Math.max(...checkedWeights) : null;

    // Auto-save to Supabase
    const supabase = createClient();
    const { error } = await supabase.from("exercise_logs").upsert({
      exercise_id: exId,
      student_id: studentId,
      session_id: session.id,
      weight_kg: maxWeight,
      completed_sets: checkedCount,
      rpe: prevState.rpe,
      logged_at: new Date().toISOString(),
    }, { onConflict: "exercise_id,student_id" });

    if (error) {
      showToast("Error al guardar. Intentá de nuevo.", "error");
      setExStates(prev => ({ ...prev, [exId]: { ...prevState, saving: false } }));
      return;
    }

    setExStates(prev => ({ ...prev, [exId]: { ...prev[exId], saving: false, saved: true } }));

    // PR check (only when checking with a weight)
    if (!wasChecked && maxWeight && maxWeight > 0) {
      const prevMax = await getPrevMaxAction(ex.name);
      if (maxWeight > prevMax) {
        setPrInfo({ exerciseName: ex.name, weight: maxWeight });
        setTimeout(() => setPrInfo(null), 3500);
        void notifyPRAction(ex.name, maxWeight);
      }
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  function exIsDone(exId: string): boolean {
    const s = exStates[exId];
    return !!s && s.sets.length > 0 && s.sets.every(set => set.checked);
  }

  function exLabel(ex: ExerciseWithLogs): string {
    if (!ex.superset_group) {
      return String(exercises.findIndex(e => e.id === ex.id) + 1);
    }
    const grp = ex.superset_group;
    const groupExs = exercises.filter(e => e.superset_group === grp);
    const idx = groupExs.findIndex(e => e.id === ex.id);
    return `${grp}${idx + 1}`;
  }

  function exStatusLine(ex: ExerciseWithLogs): string {
    const s = exStates[ex.id];
    if (!s) return `${ex.sets} × ${ex.reps}`;
    const checkedCount = s.sets.filter(set => set.checked).length;
    const maxW = Math.max(
      ...s.sets
        .filter(set => set.checked && set.weight.trim())
        .map(set => parseFloat(set.weight))
        .filter(w => !isNaN(w) && w > 0),
      0
    );
    if (checkedCount === 0) return `${ex.sets} × ${ex.reps} · Tocá para registrar`;
    if (checkedCount === ex.sets && maxW > 0) return `${ex.sets} × ${ex.reps} · ${maxW} kg`;
    if (maxW > 0) return `${checkedCount}/${ex.sets} series · ${maxW} kg`;
    return `${checkedCount}/${ex.sets} series completadas`;
  }

  const doneCount = exercises.filter(ex => exIsDone(ex.id)).length;
  const allDone = exercises.length > 0 && doneCount === exercises.length;
  const progressPct = exercises.length > 0 ? Math.round((doneCount / exercises.length) * 100) : 0;

  // ── Finish ────────────────────────────────────────────────────────────────

  async function finishSession() {
    if (finishLoading) return;
    setFinishLoading(true);

    // Compute actual volume from per-set weights
    let totalWeight = 0;
    const rpeVals: number[] = [];
    for (const ex of exercises) {
      const s = exStates[ex.id];
      if (!s) continue;
      for (const set of s.sets) {
        if (set.checked && set.weight.trim()) {
          const w = parseFloat(set.weight);
          if (!isNaN(w) && w > 0) totalWeight += w;
        }
      }
      if (s.saved && s.rpe > 0) rpeVals.push(s.rpe);
    }
    const avgRpe =
      rpeVals.length > 0
        ? Math.round((rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length) * 10) / 10
        : 0;

    setSummary({ totalWeight: Math.round(totalWeight), avgRpe });

    const result = await finishSessionAction(session.id);
    setFinishLoading(false);
    if (!result || "error" in result) {
      showToast(result?.error ?? "Error al guardar la sesión. Intentá de nuevo.", "error");
      return;
    }
    setShowCelebration(true);
  }

  // ── Render helpers (functions, not components — avoids remount on each render) ──

  function renderSetRow(exId: string, setIdx: number, restSecs: number) {
    const s = exStates[exId]?.sets[setIdx];
    if (!s) return null;
    const ex = exercises.find(e => e.id === exId)!;
    const deloadSuggested =
      session.is_deload && ex.exercise_logs?.[0]?.weight_kg
        ? Math.round(ex.exercise_logs[0].weight_kg * 0.6 * 2) / 2
        : null;

    return (
      <div
        key={setIdx}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
          s.checked ? "bg-green-500/10" : "bg-white/[0.04]"
        )}
      >
        {/* Set label */}
        <span className="text-xs font-black text-white/25 w-6 text-center flex-shrink-0 tabular-nums">
          S{setIdx + 1}
        </span>

        {/* Weight input */}
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          placeholder={deloadSuggested ? `~${deloadSuggested}` : "—"}
          value={s.weight}
          onChange={e => updateSetWeight(exId, setIdx, e.target.value)}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-b text-center font-black text-base outline-none py-0.5 transition-colors",
            s.checked
              ? "border-green-500/40 text-green-400"
              : "border-white/10 text-white focus:border-brand-500"
          )}
        />

        <span className="text-xs text-white/25 flex-shrink-0">kg</span>

        {/* Check button */}
        <button
          type="button"
          onClick={() => toggleSetCheck(exId, setIdx)}
          className={cn(
            "h-9 w-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-95",
            s.checked
              ? "bg-green-500 border-green-500"
              : "border-white/20 hover:border-brand-400/60"
          )}
        >
          {s.checked && (
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  function renderExerciseCard(ex: ExerciseWithLogs) {
    const isExpanded = expandedId === ex.id;
    const isDone = exIsDone(ex.id);
    const state = exStates[ex.id];
    const label = exLabel(ex);
    const color = ex.superset_group ? groupColor(ex.superset_group) : "rgba(255,255,255,0.10)";
    const embedUrl = ex.youtube_url ? getYoutubeEmbedUrl(ex.youtube_url) : null;
    const isVideoOpen = openVideoId === ex.id;
    const restSecs = ex.rest_seconds ?? 90;

    return (
      <div
        key={ex.id}
        className={cn(
          "rounded-2xl border overflow-hidden transition-all",
          isDone
            ? "border-green-500/20 bg-green-500/[0.04]"
            : "border-white/[0.07] bg-white/[0.03]"
        )}
      >
        {/* ── Collapsed row ───────────────────────────── */}
        <button
          type="button"
          onClick={() => toggleExpand(ex.id)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.03] transition-colors"
        >
          {/* Letter/number badge */}
          <span
            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white"
            style={{ background: color }}
          >
            {label}
          </span>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="font-[500] text-white/90 text-sm truncate">{ex.name}</p>
            <p className="text-xs text-white/35 mt-0.5">{exStatusLine(ex)}</p>
          </div>

          {/* Done check / chevron */}
          {isDone ? (
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
          ) : (
            <svg
              className={cn("h-4 w-4 flex-shrink-0 transition-transform text-white/20", isExpanded && "rotate-90")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          )}
        </button>

        {/* ── Expanded content ─────────────────────────── */}
        {isExpanded && (
          <div className="border-t border-white/[0.05] px-4 py-4 flex flex-col gap-4">
            {/* Deload suggestion */}
            {session.is_deload && (
              <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                <span className="text-lg flex-shrink-0">🔋</span>
                <p className="text-xs text-amber-300/90 font-medium leading-snug">
                  Semana de descarga — apuntá a ~60% del peso habitual
                  {ex.exercise_logs?.[0]?.weight_kg
                    ? ` (${Math.round(ex.exercise_logs[0].weight_kg * 0.6 * 2) / 2} kg sugerido)`
                    : ""}
                </p>
              </div>
            )}

            {/* YouTube button */}
            {embedUrl && !isVideoOpen && (
              <button
                type="button"
                onClick={() => setOpenVideoId(ex.id)}
                className="flex items-center gap-3 bg-red-950/50 border border-red-900/30 rounded-xl px-4 py-3 hover:bg-red-900/40 transition-colors active:scale-[0.99]"
              >
                <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow shadow-red-900/50">
                  <svg className="h-4 w-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/70 truncate">{ex.name}</span>
              </button>
            )}
            {embedUrl && isVideoOpen && (
              <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                <div className="aspect-video bg-black">
                  <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={ex.name} />
                </div>
                <button
                  onClick={() => setOpenVideoId(null)}
                  className="w-full text-xs text-white/25 py-2 hover:text-white/50 transition-colors bg-black/40"
                >
                  Cerrar video ↑
                </button>
              </div>
            )}

            {/* Technical note */}
            {ex.technical_note && (
              <div className="border-l-2 border-brand-500/60 bg-brand-500/[0.07] rounded-r-xl pl-3 pr-3 py-3">
                <p className="text-[11px] font-bold text-brand-400/70 uppercase tracking-wide mb-1.5">
                  Nota del entrenador
                </p>
                <p className="text-sm text-white/65 leading-relaxed">{ex.technical_note}</p>
              </div>
            )}

            {/* Per-set rows */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold text-white/25 uppercase tracking-wide px-1 mb-0.5">
                Tus series
              </p>
              {state?.sets.map((_, i) => renderSetRow(ex.id, i, restSecs))}
            </div>

            {/* RPE buttons */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] font-bold text-white/25 uppercase tracking-wide">RPE</p>
                <p className="text-[11px] text-white/30">{rpeLabel(state?.rpe ?? 7)}</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateRpe(ex.id, n)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-black transition-all",
                      (state?.rpe ?? 7) === n
                        ? "bg-brand-500 text-white shadow shadow-brand-500/30"
                        : "bg-white/[0.05] text-white/35 hover:bg-white/[0.09] hover:text-white/60"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Collapse */}
            <button
              type="button"
              onClick={() => setExpandedId(null)}
              className="text-xs text-white/20 flex items-center justify-center gap-1.5 hover:text-white/40 transition-colors pt-1"
            >
              <svg className="h-3 w-3 rotate-[270deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Cerrar
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderBlock(block: Block) {
    if (block.type === "single") {
      return renderExerciseCard(block.exercise);
    }

    const color = groupColor(block.group);
    const type = groupType(block.exercises.length);
    const doneInGroup = block.exercises.filter(ex => exIsDone(ex.id)).length;
    const restSecs = block.exercises.find(ex => ex.rest_seconds)?.rest_seconds ?? 90;

    return (
      <div key={block.group} className="flex flex-col gap-2">
        {/* Circuit header */}
        <div className="flex items-center gap-2 px-1 pt-1">
          <div className="h-4 w-1 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-xs font-black uppercase tracking-wide" style={{ color }}>
            {type} {block.group}
          </span>
          <div className="flex-1 h-px" style={{ background: `${color}22` }} />
          <span className="text-[11px] text-white/25 font-medium flex-shrink-0">
            {block.exercises.length} ejercicios · {restSecs}s descanso
          </span>
          <span
            className="text-[11px] font-black flex-shrink-0 tabular-nums"
            style={{ color: doneInGroup === block.exercises.length ? "#22c55e" : "rgba(255,255,255,0.25)" }}
          >
            {doneInGroup}/{block.exercises.length}
          </span>
        </div>

        {block.exercises.map(ex => renderExerciseCard(ex))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── PR Modal ─────────────────────────────────── */}
      {prInfo && (
        <Modal zIndex={60} maxWidth={340} panelBackground="#1A1A2E">
          <div
            style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => setPrInfo(null)}
          >
            <div className="text-6xl animate-bounce">🏆</div>
            <p className="text-2xl font-black text-white">¡Nuevo récord!</p>
            <p className="text-brand-400 font-bold">{prInfo.exerciseName}</p>
            <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
              <p className="text-4xl font-black text-yellow-400">{prInfo.weight} kg</p>
              <p className="text-xs text-yellow-500/60 mt-1 font-semibold">Récord personal</p>
            </div>
            <p className="text-xs text-white/25">Tocá para cerrar</p>
          </div>
        </Modal>
      )}

      {/* ── Session complete ──────────────────────────── */}
      {showCelebration && (
        <SessionComplete
          sessionName={session.name}
          exerciseCount={doneCount}
          totalWeightKg={summary.totalWeight}
          avgRpe={summary.avgRpe}
          onFinish={() => { router.push("/dashboard"); router.refresh(); }}
        />
      )}

      {/* ── Dark wrapper ─────────────────────────────── */}
      <div className="min-h-dvh bg-[#0A0A14] pb-nav">

        {/* ── Sticky header ─────────────────────────── */}
        <div className="sticky top-0 z-30 bg-[#0A0A14]/96 backdrop-blur-md border-b border-white/[0.05] px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] text-white/25 uppercase tracking-widest font-bold">
              {formatSessionDate((session as any).scheduled_date)}
            </p>
            {session.is_deload && (
              <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                🔋 Descarga
              </span>
            )}
          </div>

          <h1 className="text-lg font-black text-white leading-tight">
            {routineDayName ?? session.name}
          </h1>
          {routineDayName && (
            <p className="text-xs text-white/35 font-medium mt-0.5">{session.name}</p>
          )}

          {/* Progress bar */}
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-white/25 flex-shrink-0 tabular-nums">
              {doneCount}/{exercises.length}
            </span>
          </div>
        </div>

        {/* ── Rest timer chip ───────────────────────── */}
        {timer && (
          <div className="mx-4 mt-2.5 flex items-center gap-3 bg-brand-500/15 border border-brand-500/25 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {timer.done ? (
                <span className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
              ) : (
                <svg className="h-5 w-5 text-brand-400/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-black text-white tabular-nums">
                {timer.done ? "¡Listo para continuar!" : `Descanso · ${fmtTime(timer.remaining)}`}
              </span>
            </div>
            <button
              type="button"
              onClick={dismissTimer}
              className="text-xs font-semibold text-white/35 hover:text-white/70 transition-colors flex-shrink-0"
            >
              Saltar
            </button>
          </div>
        )}

        {/* ── Exercise blocks ───────────────────────── */}
        <div className="px-4 pt-3 flex flex-col gap-3">
          {blocks.map(block => renderBlock(block))}

          {/* ── Complete button ─────────────────────── */}
          <div className="pt-3 pb-2">
            <button
              type="button"
              onClick={finishSession}
              disabled={!allDone || finishLoading}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-base transition-all duration-200",
                allDone && !finishLoading
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25 active:scale-[0.98]"
                  : "bg-white/[0.05] text-white/25 cursor-not-allowed"
              )}
            >
              {finishLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </span>
              ) : allDone ? (
                "Completar día de entrenamiento →"
              ) : (
                `${exercises.length - doneCount} ejercicio${exercises.length - doneCount !== 1 ? "s" : ""} restante${exercises.length - doneCount !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
