"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { saveSessionAsTemplateAction } from "@/app/dashboard/templates/actions";

export function SaveAsTemplateButton({ sessionId, sessionName }: { sessionId: string; sessionName: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sessionName);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    const result = await saveSessionAsTemplateAction(sessionId, name, description);
    setLoading(false);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast("Guardado como rutina");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        Guardar como rutina
      </Button>
    );
  }

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-brand-800">Guardar como rutina</h3>
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea label="Descripcion (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="flex gap-2">
        <Button size="sm" loading={loading} onClick={handleSave} className="flex-1">Guardar</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
