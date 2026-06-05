"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { updateSpaceNameAction } from "@/app/dashboard/settings/actions";

export function SpaceNameForm({ current }: { current: string | null }) {
  const { showToast } = useToast();
  const [name, setName] = useState(current ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateSpaceNameAction(name);
    setSaving(false);
    if (result?.error) showToast(result.error, "error");
    else showToast("Nombre del espacio actualizado");
  }

  return (
    <Card padding="md">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-700">Nombre de tu espacio</h2>
          <p className="text-xs text-gray-400 mt-0.5">Se muestra en la barra de navegacion para tus alumnos.</p>
        </div>
        <Input
          label="Nombre del espacio"
          placeholder="Ej: GymTrack por German"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <Button type="submit" size="sm" loading={saving}>Guardar</Button>
      </form>
    </Card>
  );
}
