"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function NewStudentForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Completá todos los campos");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setError("");
    setLoading(true);

    const supabase = createClient();

    // Create user via admin API (requires service role) — using signUp for now
    // In production: call a server action or API route with admin privileges
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role: "student" },
      },
    });

    if (signUpErr || !data.user) {
      setError(signUpErr?.message ?? "Error al crear el usuario");
      setLoading(false);
      return;
    }

    // Update profile with name and trainer_id
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), trainer_id: trainerId })
      .eq("id", data.user.id);

    if (profileErr) {
      setError("Usuario creado pero no se pudo asignar el entrenador");
      setLoading(false);
      return;
    }

    setSuccess(`Alumno ${fullName} creado correctamente.`);
    setTimeout(() => router.push("/dashboard/students"), 1500);
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
          placeholder="Juan Pérez"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoCapitalize="words"
        />
        <Input
          label="Email"
          type="email"
          placeholder="alumno@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contraseña inicial"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
