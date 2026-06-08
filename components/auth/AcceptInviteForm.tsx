"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Status = "loading" | "ready" | "invalid" | "already_has_account";

export function AcceptInviteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();

      // Case 1: the page was navigated to by AuthHashHandler after the session
      // was already set. Check if there's a current session.
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const name = session.user.user_metadata?.full_name ?? "";

        // If user already has a password set (they signed up before), they
        // don't need this page — send them straight to the dashboard.
        // Supabase doesn't expose "has_password" directly, but invited users
        // have `app_metadata.provider === "email"` with no confirmed password.
        // The safest heuristic: if the user's last sign-in was NOT via "invite"
        // and they have no `invited_at` in metadata, treat as existing account.
        // We rely on the invite token type stored in user_metadata by us.
        const role = session.user.user_metadata?.role;
        if (role !== "student") {
          // Not a student invite — something unexpected; go to dashboard
          router.replace("/dashboard");
          return;
        }

        setUserName(name);
        setStatus("ready");
        return;
      }

      // Case 2: user landed here directly with a hash in the URL
      // (e.g. if redirectTo was configured to point here).
      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (accessToken && refreshToken && type === "invite") {
          const { data, error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionErr && data.user) {
            const name = data.user.user_metadata?.full_name ?? "";
            setUserName(name);
            setStatus("ready");
            // Clean the hash from the URL
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
        }
      }

      // No valid session and no valid hash
      setStatus("invalid");
    }

    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }

    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setError("Error al guardar la contraseña. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Verificando tu invitación…</p>
      </div>
    );
  }

  // ── Invalid / expired link ───────────────────────────────────────────────────
  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🔗</div>
          <h2 className="text-xl font-bold text-gray-900">Link inválido o vencido</h2>
          <p className="text-sm text-gray-500 mt-1">
            Este link de invitación ya fue usado o expiró. Pedile a tu entrenador que te reenvíe la invitación.
          </p>
        </div>
        <Link
          href="/login"
          className="w-full flex items-center justify-center rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  // ── Ready: set password ──────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <div className="text-2xl mb-2">👋</div>
        <h2 className="text-xl font-black text-gray-900">
          {userName ? `¡Hola, ${userName.split(" ")[0]}!` : "¡Bienvenido!"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Creá tu contraseña para acceder a tu cuenta de entrenamiento.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Input
        label="Contraseña"
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        autoFocus
      />
      <Input
        label="Confirmar contraseña"
        type="password"
        placeholder="Repetí la contraseña"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
      />

      <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
        Crear contraseña y entrar
      </Button>

      <p className="text-center text-xs text-gray-400">
        ¿Ya tenés una cuenta?{" "}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: "#534AB7" }}>
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
