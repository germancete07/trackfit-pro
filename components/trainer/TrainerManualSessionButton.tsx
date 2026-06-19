"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TrainerManualSessionModal } from "./TrainerManualSessionModal";

interface Props {
  studentId: string;
  studentName: string;
  /** Visual variant — defaults to "secondary" (fits the rutina tab) */
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  /** Label override */
  label?: string;
  /** When true renders as a plain div button (for use inside three-dots menus) */
  menuItem?: boolean;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function TrainerManualSessionButton({
  studentId,
  studentName,
  variant = "secondary",
  size = "sm",
  label = "Registrar sesión manual",
  menuItem = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const icon = (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );

  return (
    <>
      {menuItem ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <span className="text-brand-500">{icon}</span>
          {label}
        </button>
      ) : (
        <Button
          size={size}
          variant={variant}
          className="w-full"
          onClick={() => setOpen(true)}
        >
          {icon}
          {label}
        </Button>
      )}

      {open && (
        <TrainerManualSessionModal
          studentId={studentId}
          studentName={studentName}
          defaultDate={todayStr()}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
