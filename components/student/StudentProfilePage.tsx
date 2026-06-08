"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { MeasurementsChart } from "@/components/student/MeasurementsChart";
import { ProgressPhotos } from "@/components/student/ProgressPhotos";
import { StudentCorrectionsView } from "@/components/student/StudentCorrectionsView";
import { useToast } from "@/components/shared/ToastProvider";
import { usePushPermission } from "@/components/shared/PushRegistration";
import {
  updateProfileAction,
  changePasswordAction,
  updateReminderAction,
  updatePreferredTrainingDaysAction,
} from "@/app/dashboard/profile/actions";
import { cn } from "@/lib/utils";
import type { Profile, BodyMeasurement, ProgressPhoto, VideoCorrection } from "@/lib/types";

const TABS = [
  { key: "datos",     label: "Datos" },
  { key: "medidas",   label: "Medidas" },
  { key: "fotos",     label: "Fotos" },
  { key: "videos",    label: "Videos" },
  { key: "notif",     label: "Notificaciones" },
  { key: "contrasena",label: "Contraseña" },
] as const;

const DAYS = [
  { value: 1, label: "L", full: "Lunes" },
  { value: 2, label: "M", full: "Martes" },
  { value: 3, label: "X", full: "Mié" },
  { value: 4, label: "J", full: "Jueves" },
  { value: 5, label: "V", full: "Viernes" },
  { value: 6, label: "S", full: "Sáb" },
  { value: 0, label: "D", full: "Dom" },
];

const OBJECTIVES = [
  "Hipertrofia",
  "Fuerza",
  "Pérdida de peso",
  "Resistencia",
  "General",
];

const EXPERIENCE_LEVELS = [
  { key: "beginner",     label: "Principiante" },
  { key: "intermediate", label: "Intermedio" },
  { key: "advanced",     label: "Avanzado" },
];

const SEX_OPTIONS = [
  { key: "male",              label: "Masculino" },
  { key: "female",            label: "Femenino" },
  { key: "prefer_not_to_say", label: "Prefiero no decir" },
];

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

interface Props {
  profile: Profile;
  activeTab: string;
  measurements: BodyMeasurement[] | null;
  photos: ProgressPhoto[] | null;
  corrections: VideoCorrection[] | null;
  userId: string;
  trainerId: string | null;
}

export function StudentProfilePage({
  profile,
  activeTab,
  measurements,
  photos,
  corrections,
  userId,
  trainerId,
}: Props) {
  const { showToast } = useToast();
  const { requestPermission } = usePushPermission();

  // ── Datos form state ──────────────────────────────────────────
  const [fullName, setFullName]                 = useState(profile.full_name ?? "");
  const [birthDate, setBirthDate]               = useState(profile.birth_date ?? "");
  const [sex, setSex]                           = useState<string>(profile.sex ?? "");
  const [weightKg, setWeightKg]                 = useState<string>(profile.weight_kg != null ? String(profile.weight_kg) : "");
  const [heightCm, setHeightCm]                 = useState<string>(profile.height_cm != null ? String(profile.height_cm) : "");
  const [objective, setObjective]               = useState<string>(profile.training_goal ?? "");
  const [experienceLevel, setExperienceLevel]   = useState<string>(profile.experience_level ?? "");
  const [physicalLimitations, setPhysicalLimitations] = useState(profile.physical_limitations ?? "");
  const [saving, setSaving]                     = useState(false);

  // ── Training days ─────────────────────────────────────────────
  const [prefDays, setPrefDays]   = useState<number[]>(profile.preferred_training_days ?? []);
  const [savingDays, setSavingDays] = useState(false);

  // ── Push notifications ────────────────────────────────────────
  const [pushEnabled, setPushEnabled]     = useState(false);
  const [reminderHour, setReminderHour]   = useState<string>(
    profile.reminder_hour != null ? String(profile.reminder_hour) : ""
  );
  const [savingReminder, setSavingReminder] = useState(false);

  // ── Password ──────────────────────────────────────────────────
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw]         = useState(false);

  // ── Computed age ──────────────────────────────────────────────
  const age = calcAge(birthDate);

  // ── Handlers ─────────────────────────────────────────────────
  async function handleSaveDatos(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    const r = await updateProfileAction({
      full_name:             fullName.trim(),
      birth_date:            birthDate || null,
      training_goal:         objective || null,
      physical_limitations:  physicalLimitations.trim() || null,
      sex:                   sex || null,
      weight_kg:             weightKg ? parseFloat(weightKg) : null,
      height_cm:             heightCm ? parseFloat(heightCm) : null,
      experience_level:      experienceLevel || null,
    });
    setSaving(false);
    if (r?.error) showToast(r.error, "error");
    else showToast("Perfil actualizado");
  }

  async function handleSaveDays() {
    setSavingDays(true);
    const r = await updatePreferredTrainingDaysAction(prefDays);
    setSavingDays(false);
    if (r?.error) showToast(r.error, "error");
    else showToast("Días guardados");
  }

  async function handleSaveReminder() {
    setSavingReminder(true);
    const h = reminderHour === "" ? null : parseInt(reminderHour);
    const r = await updateReminderAction(h);
    setSavingReminder(false);
    if (r?.error) showToast(r.error, "error");
    else showToast("Recordatorio guardado");
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    setChangingPw(true);
    const r = await changePasswordAction(newPassword);
    setChangingPw(false);
    if (r?.error) showToast(r.error, "error");
    else {
      showToast("Contraseña actualizada");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="flex flex-col">
      {/* Avatar header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-black text-gray-900 mb-3">Mi perfil</h1>
        <AvatarUpload userId={userId} currentUrl={profile.avatar_url} fullName={profile.full_name} />
      </div>

      {/* Tab navigation */}
      <div className="px-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 pb-2 min-w-max">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/dashboard/profile?tab=${key}`}
              scroll={false}
              className={cn(
                "flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                activeTab === key
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-white/10 mx-4 mb-1" />

      {/* ── Tab: Datos ─────────────────────────────────────────── */}
      {activeTab === "datos" && (
        <div className="px-4 py-4 flex flex-col gap-4">
          <Card padding="md">
            <form onSubmit={handleSaveDatos} className="flex flex-col gap-5">
              <h2 className="text-sm font-bold text-gray-700">Datos personales</h2>

              {/* Nombre + email */}
              <Input
                label="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Email"
                value={profile.email}
                disabled
                className="opacity-60 cursor-not-allowed"
              />

              {/* Fecha de nacimiento + edad auto */}
              <div>
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                {age !== null && (
                  <p className="mt-1 text-xs text-brand-600 font-semibold">
                    {age} años
                  </p>
                )}
              </div>

              {/* Sexo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-900 dark:text-white/90">Sexo</label>
                <div className="flex gap-2 flex-wrap">
                  {SEX_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSex(sex === key ? "" : key)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all border",
                        sex === key
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-white/50 border-transparent"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Peso + altura */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Peso actual (kg)"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="20"
                  max="300"
                  placeholder="Ej: 75.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
                <Input
                  label="Altura (cm)"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="100"
                  max="250"
                  placeholder="Ej: 175"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>

              {/* Objetivo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-900 dark:text-white/90">Objetivo principal</label>
                <div className="flex gap-2 flex-wrap">
                  {OBJECTIVES.map((obj) => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setObjective(objective === obj ? "" : obj)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all border",
                        objective === obj
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-white/50 border-transparent"
                      )}
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel de experiencia */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-900 dark:text-white/90">Nivel de experiencia</label>
                <div className="flex gap-2">
                  {EXPERIENCE_LEVELS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setExperienceLevel(experienceLevel === key ? "" : key)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-semibold transition-all border",
                        experienceLevel === key
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-white/50 border-transparent"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesiones */}
              <Textarea
                label="Lesiones o limitaciones físicas"
                placeholder="Ej: Dolor lumbar, lesión en rodilla derecha, evitar saltos..."
                value={physicalLimitations}
                onChange={(e) => setPhysicalLimitations(e.target.value)}
                rows={3}
              />

              <Button type="submit" loading={saving}>Guardar cambios</Button>
            </form>
          </Card>

          {/* Training days */}
          <Card padding="md" className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-700">Mis días de entrenamiento</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Tu entrenador los usará para precargar los días al asignarte una rutina.
              </p>
            </div>
            <div className="flex gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  title={d.full}
                  onClick={() =>
                    setPrefDays((prev) =>
                      prev.includes(d.value)
                        ? prev.filter((v) => v !== d.value)
                        : [...prev, d.value]
                    )
                  }
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-150",
                    prefDays.includes(d.value)
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                      : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-white/50 hover:bg-gray-200"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={savingDays}
              onClick={handleSaveDays}
            >
              Guardar días
            </Button>
          </Card>
        </div>
      )}

      {/* ── Tab: Medidas ───────────────────────────────────────── */}
      {activeTab === "medidas" && (
        <div className="px-4 py-4">
          {!measurements || measurements.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-gray-400 text-sm">Tu entrenador aún no ha registrado medidas.</p>
            </Card>
          ) : (
            <Card padding="md">
              <MeasurementsChart measurements={measurements} />
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Fotos ─────────────────────────────────────────── */}
      {activeTab === "fotos" && (
        <div className="px-4 py-4">
          <ProgressPhotos photos={photos ?? []} studentId={userId} />
        </div>
      )}

      {/* ── Tab: Videos ────────────────────────────────────────── */}
      {activeTab === "videos" && (
        <StudentCorrectionsView
          corrections={corrections ?? []}
          studentId={userId}
          trainerId={trainerId ?? ""}
        />
      )}

      {/* ── Tab: Notificaciones ────────────────────────────────── */}
      {activeTab === "notif" && (
        <div className="px-4 py-4 flex flex-col gap-4">
          <Card padding="md" className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-gray-700">Notificaciones push</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const ok = await requestPermission(profile.id);
                if (ok) {
                  setPushEnabled(true);
                  showToast("Notificaciones activadas");
                } else {
                  showToast("No se pudo activar", "error");
                }
              }}
              className={pushEnabled ? "opacity-60" : ""}
            >
              {pushEnabled ? "✓ Notificaciones activadas" : "Activar notificaciones push"}
            </Button>
            <p className="text-xs text-gray-400">
              Recibirás avisos cuando tu entrenador responda un video o el día que te toca entrenar.
            </p>
          </Card>

          <Card padding="md" className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-700">Hora del recordatorio</h2>
            <div className="flex gap-2 items-center">
              <select
                value={reminderHour}
                onChange={(e) => setReminderHour(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-gray-200/80 bg-gray-50/80 dark:bg-white/8 dark:border-white/12 dark:text-white px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="">Sin recordatorio</option>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={savingReminder}
                onClick={handleSaveReminder}
              >
                Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Contraseña ────────────────────────────────────── */}
      {activeTab === "contrasena" && (
        <div className="px-4 py-4">
          <Card padding="md">
            <form onSubmit={handlePassword} className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-gray-700">Cambiar contraseña</h2>
              <Input
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" loading={changingPw}>
                Actualizar contraseña
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
