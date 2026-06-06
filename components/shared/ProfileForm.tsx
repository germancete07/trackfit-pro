"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { usePushPermission } from "@/components/shared/PushRegistration";
import { updateProfileAction, changePasswordAction, updateReminderAction, updatePreferredTrainingDaysAction } from "@/app/dashboard/profile/actions";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile.full_name);
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? "");
  const [trainingGoal, setTrainingGoal] = useState(profile.training_goal ?? "");
  const [physicalLimitations, setPhysicalLimitations] = useState(profile.physical_limitations ?? "");
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [reminderHour, setReminderHour] = useState<string>(
    profile.reminder_hour != null ? String(profile.reminder_hour) : ""
  );
  const [savingReminder, setSavingReminder] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { requestPermission } = usePushPermission();

  const PREF_DAYS = [
    { value: 1, label: "L", full: "Lunes" },
    { value: 2, label: "M", full: "Martes" },
    { value: 3, label: "X", full: "Mié" },
    { value: 4, label: "J", full: "Jueves" },
    { value: 5, label: "V", full: "Viernes" },
    { value: 6, label: "S", full: "Sáb" },
    { value: 0, label: "D", full: "Dom" },
  ];
  const [prefDays, setPrefDays] = useState<number[]>(profile.preferred_training_days ?? []);
  const [savingDays, setSavingDays] = useState(false);

  async function handleSaveDays() {
    setSavingDays(true);
    const r = await updatePreferredTrainingDaysAction(prefDays);
    setSavingDays(false);
    if (r?.error) showToast(r.error, "error");
    else showToast("Días guardados");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    const result = await updateProfileAction({
      full_name: fullName.trim(),
      birth_date: birthDate || null,
      training_goal: trainingGoal.trim() || null,
      physical_limitations: physicalLimitations.trim() || null,
    });
    setSaving(false);
    if (result?.error) showToast(result.error, "error");
    else showToast("Perfil actualizado");
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
    const result = await changePasswordAction(newPassword);
    setChangingPw(false);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast("Contraseña actualizada");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Datos personales */}
      <Card padding="md">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-700">Datos personales</h2>

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
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          {profile.role === "student" && (
            <>
              <Textarea
                label="Objetivo de entrenamiento"
                placeholder="Ej: Ganar masa muscular, bajar de peso, mejorar resistencia..."
                value={trainingGoal}
                onChange={(e) => setTrainingGoal(e.target.value)}
                rows={2}
              />
              <Textarea
                label="Lesiones o limitaciones fisicas"
                placeholder="Ej: Dolor lumbar, lesion en rodilla derecha, evitar saltos..."
                value={physicalLimitations}
                onChange={(e) => setPhysicalLimitations(e.target.value)}
                rows={2}
              />
            </>
          )}

          <Button type="submit" loading={saving}>
            Guardar cambios
          </Button>
        </form>
      </Card>

      {/* Días de entrenamiento — solo alumnos */}
      {profile.role === "student" && (
        <Card padding="md" className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-700">Mis días de entrenamiento</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tu entrenador los usará para precargar los días al asignarte una rutina.</p>
          </div>
          <div className="flex gap-2">
            {PREF_DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                title={d.full}
                onClick={() => setPrefDays(prev =>
                  prev.includes(d.value) ? prev.filter(v => v !== d.value) : [...prev, d.value]
                )}
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-150",
                  prefDays.includes(d.value)
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" loading={savingDays} onClick={handleSaveDays}>
            Guardar días
          </Button>
        </Card>
      )}

      {/* Notificaciones push */}
      <Card padding="md" className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-gray-700">Notificaciones push</h2>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={async () => {
              const ok = await requestPermission(profile.id);
              if (ok) { setPushEnabled(true); showToast("Notificaciones activadas"); }
              else showToast("No se pudo activar", "error");
            }}
            className={pushEnabled ? "opacity-60" : ""}
          >
            {pushEnabled ? "✓ Notificaciones activadas" : "Activar notificaciones push"}
          </Button>
          <p className="text-xs text-gray-400">
            {profile.role === "student"
              ? "Recibiras avisos cuando tu entrenador responda un video o el dia que te toca entrenar."
              : "Recibiras avisos cuando un alumno suba un video para correccion o complete una sesion."}
          </p>
        </div>
        {profile.role === "student" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Hora del recordatorio</label>
            <div className="flex gap-2 items-center">
              <select
                value={reminderHour}
                onChange={(e) => setReminderHour(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
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
                onClick={async () => {
                  setSavingReminder(true);
                  const h = reminderHour === "" ? null : parseInt(reminderHour);
                  const r = await updateReminderAction(h);
                  setSavingReminder(false);
                  if (r?.error) showToast(r.error, "error");
                  else showToast("Recordatorio guardado");
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Cambiar contraseña */}
      <Card padding="md">
        <form onSubmit={handlePassword} className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-700">Cambiar contraseña</h2>
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimo 6 caracteres"
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
  );
}
