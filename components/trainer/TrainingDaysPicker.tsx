"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/shared/ToastProvider";

const DAYS = [
  { label: "L", full: "Lunes",     value: 1 },
  { label: "M", full: "Martes",    value: 2 },
  { label: "X", full: "Miercoles", value: 3 },
  { label: "J", full: "Jueves",    value: 4 },
  { label: "V", full: "Viernes",   value: 5 },
  { label: "S", full: "Sabado",    value: 6 },
  { label: "D", full: "Domingo",   value: 0 },
];

interface Props {
  studentId: string;
  trainerId: string;
  initialDays: number[];
}

export function TrainingDaysPicker({ studentId, trainerId, initialDays }: Props) {
  const { showToast } = useToast();
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set(initialDays));
  const [loading, setLoading] = useState<number | null>(null);

  async function toggleDay(dayValue: number) {
    if (loading !== null) return;
    setLoading(dayValue);

    const supabase = createClient();
    const isActive = activeDays.has(dayValue);

    if (isActive) {
      const { error } = await supabase
        .from("training_days")
        .delete()
        .eq("student_id", studentId)
        .eq("day_of_week", dayValue);

      if (!error) {
        setActiveDays((prev) => { const next = new Set(prev); next.delete(dayValue); return next; });
      }
    } else {
      const { error } = await supabase
        .from("training_days")
        .insert({ student_id: studentId, trainer_id: trainerId, day_of_week: dayValue });

      if (!error) {
        setActiveDays((prev) => new Set(prev).add(dayValue));
      } else {
        showToast("Error al guardar", "error");
      }
    }

    setLoading(null);
  }

  const selected = DAYS.filter((d) => activeDays.has(d.value)).map((d) => d.full);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {DAYS.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
            disabled={loading !== null}
            title={day.full}
            className={cn(
              "h-9 w-9 rounded-full text-xs font-bold transition-all duration-200 flex-shrink-0",
              activeDays.has(day.value)
                ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200",
              loading === day.value && "opacity-50"
            )}
          >
            {day.label}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-400">
          {selected.join(", ")}
        </p>
      )}
    </div>
  );
}
