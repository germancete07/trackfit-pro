"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { completeOnboardingAction } from "@/app/dashboard/onboarding-actions";

interface Props {
  userId: string;
  initialSpaceName?: string | null;
}

const STEPS = 3;

export function TrainerOnboardingModal({ userId, initialSpaceName }: Props) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(1);
  const [spaceName, setSpaceName] = useState(initialSpaceName ?? "");
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?trainer=${userId}`
      : "";

  async function dismiss() {
    setSaving(true);
    await completeOnboardingAction(spaceName || undefined);
    setSaving(false);
    setOpen(false);
  }

  async function handleFinish() {
    setSaving(true);
    await completeOnboardingAction(spaceName || undefined);
    setOpen(false);
    setSaving(false);
  }

  function copyInvite() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md mx-auto bg-white dark:bg-[#1E1E2E] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-white/10">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${(step / STEPS) * 100}%` }}
          />
        </div>

        {/* Skip */}
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-xs text-gray-400 dark:text-white/40">
            Paso {step} de {STEPS}
          </span>
          <button
            onClick={dismiss}
            disabled={saving}
            className="text-xs text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 font-medium"
          >
            Saltar por ahora
          </button>
        </div>

        <div className="px-5 pb-6 pt-3">
          {/* ── Step 1: Space name ─────────────────────────────── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  ¡Bienvenido a TrackFit! 👋
                </h2>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                  Personalizá tu espacio en segundos.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-white/60">
                  Nombre de tu gym o estudio (opcional)
                </label>
                <input
                  value={spaceName}
                  onChange={e => setSpaceName(e.target.value)}
                  placeholder="ej. Box Atletismo Norte"
                  className="h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                Continuar →
              </Button>
            </div>
          )}

          {/* ── Step 2: Invite student ──────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  Invitá tu primer alumno
                </h2>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                  Compartí tu link de registro y el alumno quedará asociado a tu cuenta automáticamente.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-white/60">
                  Tu link de invitación
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 text-xs text-gray-500 dark:text-white/50 focus:outline-none select-all"
                  />
                  <button
                    onClick={copyInvite}
                    className="px-3 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold border border-brand-100 dark:border-brand-500/20 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors whitespace-nowrap"
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-white/60">
                    O anotá el email del alumno para recordar invitarlo
                  </label>
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    type="email"
                    placeholder="alumno@email.com"
                    className="h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  ← Atrás
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continuar →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: First routine ───────────────────────────── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  Creá tu primera rutina
                </h2>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                  Las rutinas son la base de TrackFit. Creá una plantilla y asignala a tus alumnos.
                </p>
              </div>

              <div className="flex flex-col gap-3 p-4 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-100 dark:border-brand-500/20">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 dark:text-brand-300 font-black text-base">1</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/70 pt-1">
                    Creá una plantilla con días y ejercicios.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 dark:text-brand-300 font-black text-base">2</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/70 pt-1">
                    Asignala a un alumno con fecha de inicio.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 dark:text-brand-300 font-black text-base">3</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/70 pt-1">
                    El alumno entrena y vos seguís su progreso en tiempo real.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                  ← Atrás
                </Button>
                <a href="/dashboard/templates/new" className="flex-1" onClick={handleFinish}>
                  <Button loading={saving} className="w-full">
                    Crear rutina →
                  </Button>
                </a>
              </div>

              <button
                onClick={handleFinish}
                disabled={saving}
                className="text-xs text-gray-400 dark:text-white/30 hover:underline text-center"
              >
                Explorar el dashboard primero
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
