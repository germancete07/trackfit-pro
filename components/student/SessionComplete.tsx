"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  sessionName: string;
  exerciseCount: number;
  onFinish: () => void;
}

export function SessionComplete({ sessionName, exerciseCount, onFinish }: Props) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; color: string; size: number; delay: number }[]>([]);

  useEffect(() => {
    const colors = ["#534AB7", "#7C74E0", "#A89EF0", "#FFD700", "#FF6B6B", "#4ECDC4"];
    setParticles(
      Array.from({ length: 32 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 60 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.6,
      }))
    );
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: visible ? 0 : 1,
              transform: visible ? `translateY(-120px) rotate(${Math.random() * 360}deg)` : "translateY(0)",
              transition: `all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center gap-5"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.85) translateY(20px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Trophy */}
        <div className="relative">
          <div
            className="h-24 w-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/40"
            style={{
              transform: visible ? "scale(1) rotate(0deg)" : "scale(0) rotate(-30deg)",
              transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s",
            }}
          >
            <span className="text-4xl">🏆</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900">¡Sesión completada!</h2>
          <p className="text-gray-500 text-sm mt-1">{sessionName}</p>
        </div>

        {/* Stats */}
        <div className="w-full bg-brand-50 rounded-2xl p-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-black text-brand-600">{exerciseCount}</p>
            <p className="text-xs text-brand-400 font-medium">ejercicios</p>
          </div>
          <div className="h-8 w-px bg-brand-200" />
          <div className="text-center">
            <p className="text-3xl font-black text-brand-600">100%</p>
            <p className="text-xs text-brand-400 font-medium">completado</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 -mt-1">
          ¡Buen trabajo! Cada entrenamiento te acerca a tu objetivo.
        </p>

        <Button size="lg" className="w-full" onClick={onFinish}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
