"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

interface Props {
  currentPlan: string;
  currentStudents: number;
  maxStudents: number;
  onClose: () => void;
}

const UPGRADE_MAP: Record<string, { next: string; price: number; students: number } | null> = {
  starter: { next: "pro",   price: 15, students: 30 },
  pro:     { next: "elite", price: 25, students: 50 },
  elite:   null,
};

export function PlanLimitModal({ currentPlan, currentStudents, maxStudents, onClose }: Props) {
  const upgrade = UPGRADE_MAP[currentPlan] ?? null;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleUpgrade() {
    if (!upgrade) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/mp/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planKey: upgrade.next }),
        });
        const data = await res.json();
        if (data.initPoint) {
          window.location.href = data.initPoint;
        } else {
          setError(data.error ?? "Error al iniciar el pago");
        }
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <Modal title="Límite de alumnos alcanzado" onClose={onClose} zIndex={300} maxWidth={400}>
      <div className="px-6 py-6 flex flex-col gap-5">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "rgba(239,68,68,0.1)" }}>
            🚫
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm text-gray-500 leading-relaxed">
            Tu plan <strong className="text-gray-700 capitalize">{currentPlan}</strong> permite hasta{" "}
            <strong className="text-gray-700">{maxStudents} alumnos</strong>. Actualmente tenés{" "}
            <strong className="text-gray-700">{currentStudents}</strong>.
          </p>
        </div>

        {/* Upgrade CTA */}
        {upgrade ? (
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "rgba(83,74,183,0.06)", border: "0.5px solid rgba(83,74,183,0.15)" }}>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                Actualizá al plan {upgrade.next.charAt(0).toUpperCase() + upgrade.next.slice(1)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Hasta {upgrade.students} alumnos · ${upgrade.price} USD/mes
              </p>
            </div>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            <button
              onClick={handleUpgrade}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-xl py-3 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}
            >
              {isPending ? "Redirigiendo a MercadoPago..." : "Actualizar plan con Mercado Pago →"}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">
            Estás en el plan máximo. Contactanos si necesitás más capacidad.
          </p>
        )}

        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-center"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
