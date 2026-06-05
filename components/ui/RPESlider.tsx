"use client";

import { cn, rpeColor } from "@/lib/utils";

interface RPESliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const RPE_LABELS: Record<number, string> = {
  1: "Muy fácil", 2: "Fácil", 3: "Leve", 4: "Moderado", 5: "Algo difícil",
  6: "Difícil", 7: "Muy difícil", 8: "Máx -2", 9: "Máx -1", 10: "Máximo",
};

export function RPESlider({ value, onChange, className }: RPESliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">RPE</label>
        <span className={cn("text-sm font-bold px-2 py-0.5 rounded-full", rpeColor(value))}>
          {value}/10 · {RPE_LABELS[value]}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 h-8 rounded-lg text-xs font-bold transition-all",
              value === n
                ? "bg-brand-500 text-white scale-105 shadow"
                : "bg-gray-100 text-gray-500 hover:bg-brand-100"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
