"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { completeOnboardingAction } from "@/app/dashboard/onboarding/actions";

interface Props {
  studentName: string;
  trainerName: string;
}

const STEPS = [
  {
    emoji: "👋",
    title: (name: string) => `¡Hola, ${name}!`,
    subtitle: (trainer: string) =>
      `${trainer} ya configuró tu espacio de entrenamiento. Acá vas a poder ver tus rutinas, registrar tus cargas y seguir tu progreso.`,
    cta: "Siguiente",
  },
  {
    emoji: "💪",
    title: () => "Registrá tus cargas",
    subtitle: () =>
      "Cuando tengas una rutina programada, abrís el ejercicio, tocás cada serie y escribís el peso que levantaste. Así tu entrenador ve tu progreso en tiempo real.",
    cta: "Entendido",
    visual: true,
  },
  {
    emoji: "🔔",
    title: () => "Activá las notificaciones",
    subtitle: () =>
      "Te vamos a avisar cuando tu entrenador te asigne una nueva rutina, corrija un video o te mande un mensaje.",
    cta: "Activar notificaciones",
    isPush: true,
  },
];

export function OnboardingModal({ studentName, trainerName }: Props) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleCta() {
    if (current.isPush && !pushDone) {
      try {
        if ("Notification" in window) {
          const perm = await Notification.requestPermission();
          if (perm === "granted") setPushDone(true);
        }
      } catch {
        // ignore
      }
    }

    if (isLast) {
      setCompleting(true);
      await completeOnboardingAction();
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <Modal zIndex={300} maxWidth={400}>
      <div className="px-6 py-5 flex flex-col gap-5">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "6px",
                background: i === step ? "#534AB7" : "rgba(83,74,183,0.25)",
              }}
            />
          ))}
        </div>

        {/* Emoji + content */}
        <div className="flex flex-col items-center text-center gap-3">
          <span className="text-6xl leading-none">{current.emoji}</span>
          <h2 className="text-xl font-black text-gray-900">{current.title(studentName)}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {current.subtitle(trainerName)}
          </p>
        </div>

        {/* Visual explainer for step 2 */}
        {current.visual && (
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--card-bg)", border: "0.5px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "#534AB7" }}>
                <span className="text-white text-lg">🏋️</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Press de banca</p>
                <p className="text-xs text-gray-400">4 series × 8 reps</p>
              </div>
            </div>
            <div className="flex gap-2">
              {[80, 85, 87.5, 90].map((kg, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 rounded-lg py-2"
                  style={{ background: i < 2 ? "rgba(83,74,183,0.12)" : "rgba(83,74,183,0.04)", border: "1px solid rgba(83,74,183,0.15)" }}
                >
                  <span className="text-xs font-bold" style={{ color: "#534AB7" }}>{kg}kg</span>
                  <span className="text-[10px] text-gray-400">serie {i + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-center text-gray-400">← Tocás cada serie y escribís el peso →</p>
          </div>
        )}

        {/* Push notification visual for step 3 */}
        {current.isPush && (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--card-bg)", border: "0.5px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#534AB7" }}>
                <span className="text-white text-sm font-black">TF</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-900">TrackFit Pro</p>
                <p className="text-xs text-gray-500">{trainerName} te asignó una nueva rutina 🎯</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-2 pb-2">
          <Button size="lg" className="w-full" onClick={handleCta} loading={completing}>
            {pushDone && current.isPush ? "¡Todo listo!" : current.cta}
          </Button>
          {!isLast && (
            <button
              onClick={async () => {
                if (isLast || step === STEPS.length - 2) {
                  setCompleting(true);
                  await completeOnboardingAction();
                } else {
                  setStep(STEPS.length - 1);
                }
              }}
              className="text-xs text-gray-400 text-center py-1 hover:text-gray-600 transition-colors"
            >
              Saltar intro
            </button>
          )}
          {isLast && (
            <button
              onClick={async () => {
                setCompleting(true);
                await completeOnboardingAction();
              }}
              className="text-xs text-gray-400 text-center py-1 hover:text-gray-600 transition-colors"
            >
              Ahora no
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
