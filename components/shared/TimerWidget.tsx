"use client";

import { useTimer } from "./TimerContext";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "60s", seconds: 60 },
  { label: "90s", seconds: 90 },
  { label: "2m",  seconds: 120 },
  { label: "3m",  seconds: 180 },
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function TimerWidget() {
  const { timer, start, pause, resume, dismiss } = useTimer();
  if (!timer) return null;

  const R = 28;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - (timer.remaining / (timer.duration || 1)));

  return (
    <div className="fixed bottom-28 right-4 z-50 md:bottom-10 md:right-6 flex flex-col items-center gap-2 pointer-events-auto">
      {/* Ring */}
      <div className={cn("relative", timer.done && "animate-bounce")}>
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={R} fill="none" stroke="#e5e7eb" strokeWidth="4" />
          <circle
            cx="36" cy="36" r={R}
            fill="none" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            stroke={timer.done ? "#22c55e" : "#534AB7"}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "text-sm font-black tabular-nums leading-none",
            timer.done ? "text-green-500 text-base" : "text-gray-800"
          )}>
            {timer.done ? "✓" : fmt(timer.remaining)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl px-3 py-2.5 shadow-xl shadow-black/10 border border-white/70 flex flex-col items-center gap-1.5 min-w-[120px]">
        <p className={cn(
          "text-[11px] font-bold",
          timer.done ? "text-green-600" : "text-gray-500"
        )}>
          {timer.done ? "¡Listo para continuar!" : "Descanso"}
        </p>

        {/* Presets */}
        <div className="flex gap-0.5 flex-wrap justify-center">
          {PRESETS.map((p) => (
            <button
              key={p.seconds}
              onClick={() => start(p.seconds)}
              className="text-[10px] font-bold text-brand-500 hover:text-brand-700 hover:bg-brand-50 px-1.5 py-0.5 rounded-lg transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Play/Pause + Close */}
        <div className="flex gap-2 mt-0.5">
          {!timer.done && (
            <button
              onClick={timer.running ? pause : resume}
              className="text-[10px] text-gray-500 hover:text-gray-800 font-semibold"
            >
              {timer.running ? "Pausar" : "Reanudar"}
            </button>
          )}
          <button
            onClick={dismiss}
            className="text-[10px] text-gray-400 hover:text-red-500 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
