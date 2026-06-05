"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { updateStudentNotesAction } from "@/app/dashboard/students/actions";

interface Props {
  studentId: string;
  initialNotes: string;
}

export function TrainerNotesEditor({ studentId, initialNotes }: Props) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateStudentNotesAction(studentId, notes);
    setSaving(false);
    if (result?.error) showToast(result.error, "error");
    else { showToast("Notas guardadas"); setDirty(false); }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-gray-700 flex-1">Notas privadas</h2>
        <span className="text-xs text-gray-400">Solo vos las ves</span>
      </div>
      <Textarea
        placeholder="Observaciones sobre el alumno, progreso, cosas a tener en cuenta..."
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
        rows={3}
      />
      {dirty && (
        <Button size="sm" variant="secondary" loading={saving} onClick={handleSave}>
          Guardar notas
        </Button>
      )}
    </div>
  );
}
