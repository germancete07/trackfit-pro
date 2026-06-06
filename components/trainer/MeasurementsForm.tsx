"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/shared/ToastProvider";
import { addMeasurementAction, deleteMeasurementAction } from "@/app/dashboard/students/[id]/measurements/actions";
import type { BodyMeasurement } from "@/lib/types";

const today = () => new Date().toISOString().split("T")[0];

const FIELDS = [
  { key: "weight_kg", label: "Peso (kg)", placeholder: "75.5" },
  { key: "body_fat_pct", label: "% Grasa", placeholder: "18.0" },
  { key: "waist_cm", label: "Cintura (cm)", placeholder: "80" },
  { key: "hip_cm", label: "Cadera (cm)", placeholder: "95" },
  { key: "chest_cm", label: "Pecho (cm)", placeholder: "100" },
  { key: "arm_cm", label: "Brazo (cm)", placeholder: "35" },
  { key: "thigh_cm", label: "Muslo (cm)", placeholder: "55" },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

const EMPTY = () => ({
  measured_at: today(),
  weight_kg: "", body_fat_pct: "",
  waist_cm: "", hip_cm: "",
  chest_cm: "", arm_cm: "", thigh_cm: "",
});

interface Props {
  studentId: string;
  measurements: BodyMeasurement[];
}

export function MeasurementsForm({ studentId, measurements: initial }: Props) {
  const { showToast } = useToast();
  const [measurements, setMeasurements] = useState(initial);
  const [form, setForm] = useState(EMPTY());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.measured_at) { showToast("Ingresá la fecha", "error"); return; }
    setSaving(true);
    const result = await addMeasurementAction(studentId, form);
    setSaving(false);
    if (result?.error) { showToast(result.error, "error"); return; }
    showToast("Medidas guardadas");
    setShowForm(false);
    setForm(EMPTY());
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;
    await deleteMeasurementAction(id, studentId);
    setMeasurements(prev => prev.filter(m => m.id !== id));
    showToast("Registro eliminado");
  }

  function fmt(val: number | null) {
    if (val === null || val === undefined) return "—";
    return val.toString();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Medidas corporales</h2>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? "Cancelar" : "+ Nueva medición"}
        </Button>
      </div>

      {showForm && (
        <Card padding="md" className="flex flex-col gap-3 border-brand-200 bg-brand-50/30">
          <h3 className="text-sm font-bold text-gray-700">Nueva medición</h3>
          <Input label="Fecha" type="date" value={form.measured_at} onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(f => (
              <Input
                key={f.key}
                label={f.label}
                type="number"
                step="0.1"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            ))}
          </div>
          <Button size="sm" loading={saving} onClick={handleSave} className="w-full">Guardar</Button>
        </Card>
      )}

      {measurements.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sin medidas registradas aún.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {measurements.map(m => (
            <Card key={m.id} padding="sm" className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">{m.measured_at}</span>
                <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-x-3 gap-y-1">
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <p className="text-[9px] text-gray-400 uppercase font-semibold">{f.label}</p>
                    <p className="text-sm font-bold text-gray-800">{fmt(m[f.key as FieldKey] as number | null)}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
