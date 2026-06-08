"use client";

import { useState, useTransition } from "react";
import { getPlan, isOnTrial, daysLeftInTrial } from "@/lib/plans";
import { changePlanAction, extendTrialAction } from "./actions";
import type { PlanKey } from "@/lib/plans";

interface Trainer {
  id: string;
  full_name: string;
  email: string;
  space_name: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  is_admin: boolean | null;
  created_at: string;
}

interface Props {
  trainer: Trainer;
  studentCount: number;
}

const PLAN_OPTIONS: PlanKey[] = ["starter", "pro", "elite"];

export function AdminTrainerRow({ trainer, studentCount }: Props) {
  const planDef = getPlan(trainer.plan);
  const onTrial = isOnTrial(trainer.trial_ends_at);
  const daysLeft = daysLeftInTrial(trainer.trial_ends_at);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handlePlanChange(plan: PlanKey) {
    startTransition(async () => {
      const result = await changePlanAction(trainer.id, plan);
      setFeedback(result.error ? `Error: ${result.error}` : "Plan actualizado ✓");
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function handleExtendTrial(days: number) {
    startTransition(async () => {
      const result = await extendTrialAction(trainer.id, days);
      setFeedback(result.error ? `Error: ${result.error}` : `Trial extendido ${days} días ✓`);
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  return (
    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900 text-sm">{trainer.full_name}</p>
          {trainer.is_admin && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">ADMIN</span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
            style={{
              background: `${planDef.color}18`,
              color: planDef.color,
            }}
          >
            {planDef.name}
          </span>
          {onTrial && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Trial · {daysLeft}d
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{trainer.email}</p>
        {trainer.space_name && (
          <p className="text-xs text-gray-400 truncate">{trainer.space_name}</p>
        )}
        <p className="text-xs text-gray-300 mt-0.5">
          {studentCount} alumno{studentCount !== 1 ? "s" : ""} · Registro:{" "}
          {new Date(trainer.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {feedback && (
          <span className="text-xs font-semibold text-green-600">{feedback}</span>
        )}

        {/* Plan selector */}
        <select
          defaultValue={trainer.plan ?? "starter"}
          disabled={isPending}
          onChange={(e) => handlePlanChange(e.target.value as PlanKey)}
          className="text-xs rounded-xl px-3 py-2 font-semibold cursor-pointer outline-none"
          style={{
            background: "rgba(0,0,0,0.04)",
            border: "0.5px solid rgba(0,0,0,0.1)",
            color: "#374151",
          }}
        >
          {PLAN_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {getPlan(p).name}
            </option>
          ))}
        </select>

        {/* Extend trial buttons */}
        <button
          disabled={isPending}
          onClick={() => handleExtendTrial(7)}
          className="text-xs rounded-xl px-3 py-2 font-semibold transition-colors hover:bg-gray-100 disabled:opacity-50"
          style={{ background: "rgba(0,0,0,0.04)", border: "0.5px solid rgba(0,0,0,0.1)", color: "#374151" }}
        >
          +7d trial
        </button>
        <button
          disabled={isPending}
          onClick={() => handleExtendTrial(30)}
          className="text-xs rounded-xl px-3 py-2 font-semibold transition-colors hover:bg-gray-100 disabled:opacity-50"
          style={{ background: "rgba(0,0,0,0.04)", border: "0.5px solid rgba(0,0,0,0.1)", color: "#374151" }}
        >
          +30d trial
        </button>
      </div>
    </div>
  );
}
