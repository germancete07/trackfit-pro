"use client";

import { Card } from "@/components/ui/Card";

interface WeekData {
  week: string;
  volume: number;
  sessions: number;
  avg_rpe: number;
}

export function WeeklyLoadChart({ weeks }: { weeks: WeekData[] }) {
  if (weeks.length === 0) return null;

  const maxVolume = Math.max(...weeks.map((w) => w.volume), 1);

  const shortDate = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <Card padding="md">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Volumen semanal (kg)</h3>
      <div className="flex items-end gap-1.5 h-24">
        {weeks.map((w) => (
          <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-brand-500 transition-all"
              style={{ height: `${(w.volume / maxVolume) * 80}px`, minHeight: "4px" }}
              title={`${w.volume.toLocaleString()} kg`}
            />
            <span className="text-[9px] text-gray-400 leading-none">{shortDate(w.week)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>0 kg</span>
        <span>{maxVolume.toLocaleString()} kg</span>
      </div>
    </Card>
  );
}
