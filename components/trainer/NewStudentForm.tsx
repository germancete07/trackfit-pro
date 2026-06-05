"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStudentAction } from "@/app/dashboard/students/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function NewStudentForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createStudentAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Alumno creado correctamente.");
    setTimeout(() => router.push("/dashboard/students"), 1200);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-600">{success}</div>
      )}

      <Card padding="md" className="flex flex-col gap-4">
        <Input
          label="Nombre completo"
          name="fullName"
          placeholder="Juan Pérez"
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
        <Input
          label="Contraseña inicial"
          name="password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          required
        />
        <p className="text-xs text-gray-400">
          El alumno podrá cambiar su contraseña desde su perfil.
        </p>
      </Card>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        Crear alumno
      </Button>
    </form>
  );
}
