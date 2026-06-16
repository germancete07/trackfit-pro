"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TrainerLogSessionModal } from "./TrainerLogSessionModal";

interface Props {
  studentId: string;
}

export function TrainerLogSessionButton({ studentId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Registrar sesión del alumno
      </Button>

      {open && (
        <TrainerLogSessionModal
          studentId={studentId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
