import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { registered?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex flex-col items-center justify-center p-4" style={{ colorScheme: "light" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-2xl font-black">TF</span>
          </div>
          <h1 className="text-white text-2xl font-black">TrackFit Pro</h1>
          <p className="text-white/70 text-sm mt-1">Entrenamiento personalizado</p>
        </div>

        {/* Registered success banner */}
        {searchParams.registered === "1" && (
          <div className="mb-4 rounded-2xl px-4 py-3 text-sm text-green-800 font-medium text-center"
            style={{ background: "rgba(255,255,255,0.9)" }}>
            🎉 ¡Cuenta creada! Iniciá sesión para comenzar tu prueba gratuita.
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <LoginForm />
        </div>

        {/* Register link */}
        <p className="text-center text-white/70 text-sm mt-5">
          ¿Sos entrenador?{" "}
          <Link href="/register" className="text-white font-bold hover:underline">
            Registrate gratis →
          </Link>
        </p>
      </div>
    </div>
  );
}
