"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { archiveStudentAction } from "@/app/dashboard/students/actions";

interface Props {
  studentId: string;
  archived: boolean;
  studentName: string;
}

export function ArchiveButton({ studentId, archived, studentName }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleAction() {
    if (!archived && !confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    const result = await archiveStudentAction(studentId, !archived);
    setLoading(false);
    setConfirm(false);
    if (result?.error) {
      showToast(result.error, "error");
    } else {
      showToast(archived ? `${studentName} desarchivado` : `${studentName} archivado`);
      router.push("/dashboard/students");
    }
  }

  if (confirm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-amber-800">
          Archivar a {studentName}?
        </p>
        <p className="text-xs text-amber-600">
          El alumno no aparecera en la lista activa. Podes desarchivarlo cuando quieras.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setConfirm(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            size="sm"
            loading={loading}
            onClick={handleAction}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={loading}
      onClick={handleAction}
      className="text-gray-400 hover:text-amber-600 self-center"
    >
      {archived ? "Desarchivar alumno" : "Archivar alumno"}
    </Button>
  );
}
