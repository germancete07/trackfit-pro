"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteStudentAction, createStudentAction } from "@/app/dashboard/students/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PlanLimitModal } from "@/components/shared/PlanLimitModal";

type Mode = "invite" | "direct";

interface PlanLimitData { current: number; limit: number; plan: string }

export function NewStudentForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("invite");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [planLimit, setPlanLimit] = useState<PlanLimitData | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = mode === "invite"
      ? await inviteStudentAction(formData)
      : await createStudentAction(formData);

    setLoading(false);

    if (result?.error) {
      // Parse plan limit error code: "PLAN_LIMIT:current:limit:plan"
      if (result.error.startsWith("PLAN_LIMIT:")) {
        const parts = result.error.split(":");
        setPlanLimit({
          current: Number(parts[1]),
          limit:   Number(parts[2]),
          plan:    parts[3] ?? "starter",
        });
        return;
      }
      setError(result.error);
      return;
    }

    const msg = mode === "invite"
      ? "Invitación enviada. El alumno recibirá un email para crear su cuenta."
      : "Alumno creado correctamente.";
    setSuccess(msg);
    setTimeout(() => router.push("/dashboard/students"), 1800);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Plan limit modal — shown instead of raw error code */}
      {planLimit && (
        <PlanLimitModal
          currentPlan={planLimit.plan}
          currentStudents={planLimit.current}
          maxStudents={planLimit.limit}
          onClose={() => setPlanLimit(null)}
        />
      )}
      {/* Mode selector */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => { setMode("invite"); setError(""); }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            mode === "invite" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Invitar por email
        </button>
        <button
          type="button"
          onClick={() => { setMode("direct"); setError(""); }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            mode === "direct" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Crear con contraseña
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        <Card padding="md" className="flex flex-col gap-4">
          <Input
            label="Nombre completo"
            name="fullName"
            placeholder="Juan Perez"
            required
            autoCapitalize="words"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="alumno@email.com"
            required
          />
          {mode === "direct" && (
            <>
              <Input
                label="Contraseña inicial"
                name="password"
                type="password"
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-400">
                El alumno podra cambiar su contraseña desde su perfil.
              </p>
            </>
          )}
          {mode === "invite" && (
            <p className="text-xs text-gray-400">
              El alumno recibira un email con un link para configurar su contraseña y acceder a la app.
            </p>
          )}
        </Card>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {mode === "invite" ? "Enviar invitacion" : "Crear alumno"}
        </Button>
      </form>
    </div>
  );
}
