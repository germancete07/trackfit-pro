"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerTrainerAction } from "./actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerTrainerAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(135deg, #F5F3EE 0%, #DDD9D0 50%, #C4BFB4 100%)", colorScheme: "light" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "#534AB7" }}
        >
          <span className="text-white text-sm font-black">TF</span>
        </div>
        <span className="font-black text-gray-900 text-xl tracking-tight">TrackFit Pro</span>
      </Link>
      <p className="text-sm text-gray-500 -mt-4 mb-2 text-center">
        La plataforma de seguimiento para entrenadores personales
      </p>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl p-8 shadow-xl"
        style={{
          background: "rgba(255,255,255,0.9)",
          border: "0.5px solid rgba(0,0,0,0.07)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900" style={{ letterSpacing: "-0.5px" }}>
            Crear cuenta gratis
          </h1>
          <p className="text-sm text-gray-500 mt-1">14 días de prueba · Sin tarjeta de crédito</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Nombre completo
            </label>
            <input
              name="full_name"
              type="text"
              required
              placeholder="Juan García"
              autoComplete="name"
              className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "0.5px solid rgba(0,0,0,0.1)",
              }}
              onFocus={(e) => (e.target.style.border = "0.5px solid #534AB7")}
              onBlur={(e) => (e.target.style.border = "0.5px solid rgba(0,0,0,0.1)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Nombre de tu espacio / gym
            </label>
            <input
              name="space_name"
              type="text"
              required
              placeholder="FitZone Training"
              className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "0.5px solid rgba(0,0,0,0.1)",
              }}
              onFocus={(e) => (e.target.style.border = "0.5px solid #534AB7")}
              onBlur={(e) => (e.target.style.border = "0.5px solid rgba(0,0,0,0.1)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="juan@ejemplo.com"
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "0.5px solid rgba(0,0,0,0.1)",
              }}
              onFocus={(e) => (e.target.style.border = "0.5px solid #534AB7")}
              onBlur={(e) => (e.target.style.border = "0.5px solid rgba(0,0,0,0.1)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "0.5px solid rgba(0,0,0,0.1)",
              }}
              onFocus={(e) => (e.target.style.border = "0.5px solid #534AB7")}
              onBlur={(e) => (e.target.style.border = "0.5px solid rgba(0,0,0,0.1)")}
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-red-700"
              style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}
          >
            {isPending ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: "#534AB7" }}>
            Iniciá sesión
          </Link>
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        Al registrarte aceptás los términos de uso. Tu prueba gratuita dura 14 días.
      </p>

      {/* Student disclaimer */}
      <div
        className="mt-4 w-full max-w-sm rounded-2xl px-4 py-3 text-center"
        style={{ background: "rgba(83,74,183,0.08)", border: "0.5px solid rgba(83,74,183,0.2)" }}
      >
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-bold" style={{ color: "#534AB7" }}>¿Sos alumno?</span>{" "}
          Esta plataforma es solo para entrenadores. Si sos alumno, pedile el link de acceso a tu entrenador — él te enviará una invitación por email.
        </p>
      </div>
    </div>
  );
}
