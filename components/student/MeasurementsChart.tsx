"use client";

import { useState } from "react";
import type { BodyMeasurement } from "@/lib/types";

const METRICS = [
  { key: "weight_kg", label: "Peso", unit: "kg", color: "#6366f1" },
  { key: "body_fat_pct", label: "% Grasa", unit: "%", color: "#f59e0b" },
  { key: "waist_cm", label: "Cintura", unit: "cm", color: "#ef4444" },
  { key: "hip_cm", label: "Cadera", unit: "cm", color: "#ec4899" },
  { key: "chest_cm", label: "Pecho", unit: "cm", color: "#3b82f6" },
  { key: "arm_cm", label: "Brazo", unit: "cm", color: "#10b981" },
  { key: "thigh_cm", label: "Muslo", unit: "cm", color: "#8b5cf6" },
] as const;

type MetricKey = typeof METRICS[number]["key"];

interface Props { measurements: BodyMeasurement[]; }

export function MeasurementsChart({ measurements }: Props) {
  const [selected, setSelected] = useState<MetricKey>("weight_kg");

  const metric = METRICS.find(m => m.key === selected)!;
  const sorted = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const points = sorted
    .map(m => ({ date: m.measured_at, val: m[selected] as number | null }))
    .filter(p => p.val !== null) as { date: string; val: number }[];

  const W = 320, H = 120, PAD = { top: 12, right: 16, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  function renderChart() {
    if (points.length < 2) return null;
    const vals = points.map(p => p.val);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const xStep = chartW / (points.length - 1);

    function px(i: number) { return PAD.left + i * xStep; }
    function py(v: number) { return PAD.top + chartH - ((v - min) / range) * chartH; }

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(p.val).toFixed(1)}`).join(" ");
    const areaD = `${pathD} L${px(points.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${px(0).toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

    const yLabels = [min, min + range / 2, max];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        {/* Grid */}
        {yLabels.map((v, i) => {
          const y = py(v);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#9ca3af">
                {v % 1 === 0 ? v : v.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill={metric.color} fillOpacity={0.08} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={metric.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p.val)} r={3} fill="white" stroke={metric.color} strokeWidth={2} />
        ))}

        {/* X labels — first, middle, last */}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(i => (
            <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">
              {points[i].date.slice(5)}
            </text>
          ))}
      </svg>
    );
  }

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = latest && previous ? latest.val - previous.val : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Metric selector */}
      <div className="flex gap-1.5 flex-wrap">
        {METRICS.map(m => {
          const hasData = measurements.some(meas => meas[m.key] !== null);
          if (!hasData) return null;
          return (
            <button
              key={m.key}
              onClick={() => setSelected(m.key)}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={selected === m.key
                ? { backgroundColor: m.color, color: "white" }
                : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Latest value */}
      {latest && (
        <div className="flex items-end gap-3">
          <div>
            <p className="text-xs text-gray-400">{metric.label} actual</p>
            <p className="text-3xl font-black" style={{ color: metric.color }}>
              {latest.val}{metric.unit}
            </p>
          </div>
          {delta !== null && (
            <p className={`text-sm font-bold mb-1 ${delta < 0 ? "text-green-500" : delta > 0 ? "text-red-400" : "text-gray-400"}`}>
              {delta > 0 ? "+" : ""}{delta.toFixed(1)}{metric.unit}
            </p>
          )}
        </div>
      )}

      {/* Chart */}
      {points.length >= 2 ? renderChart() : (
        <p className="text-xs text-gray-400 text-center py-4">
          {points.length === 0 ? "Sin datos para esta métrica." : "Necesitás al menos 2 registros para ver la evolución."}
        </p>
      )}

      {/* History table */}
      {points.length > 0 && (
        <div className="flex flex-col gap-1">
          {[...points].reverse().map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-400 text-xs">{p.date}</span>
              <span className="font-semibold text-gray-800">{p.val} {metric.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
