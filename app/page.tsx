import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F3EE", colorScheme: "light" }}>

      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(245,243,238,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "#534AB7" }}
          >
            <span className="text-white text-xs font-black">TF</span>
          </div>
          <span className="font-black text-gray-900 tracking-tight">TrackFit Pro</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm transition-all hover:shadow-md"
            style={{ background: "#534AB7" }}
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 gap-6">
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
          style={{ background: "rgba(83,74,183,0.12)", color: "#534AB7", letterSpacing: "0.1em" }}
        >
          🎯 14 días gratis · Sin tarjeta de crédito
        </span>
        <h1
          className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight max-w-2xl"
          style={{ letterSpacing: "-1px" }}
        >
          Tu plataforma de entrenamiento personal
        </h1>
        <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
          Gestioná a tus alumnos, asigná rutinas, revisá videos y seguí el progreso de cada uno —
          todo desde un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link
            href="/register"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}
          >
            Crear cuenta gratis
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
        <p className="text-xs text-gray-400">14 días de prueba gratis. Luego desde $ 12.000 ARS/mes.</p>
      </section>

      {/* ── App mockup ── */}
      <section className="px-6 pb-16 flex justify-center">
        <div
          className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, #1A1A1A, #2C2C2A, #1E1E2E)" }}
        >
          {/* Window chrome */}
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-white/30 font-mono">trackfitpro.app/dashboard</span>
          </div>
          <div className="p-6 grid grid-cols-2 gap-3">
            {[
              { emoji: "👥", label: "8 alumnos activos", sub: "2 entrenaron hoy", color: "rgba(83,74,183,0.3)" },
              { emoji: "📋", label: "14 sesiones esta semana", sub: "Asignadas", color: "rgba(5,150,105,0.3)" },
              { emoji: "💬", label: "3 mensajes", sub: "Sin leer", color: "rgba(239,68,68,0.3)" },
              { emoji: "🎬", label: "2 videos", sub: "Para revisar", color: "rgba(245,158,11,0.3)" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{ background: card.color, border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-2xl">{card.emoji}</span>
                <p className="text-white font-bold text-sm">{card.label}</p>
                <p className="text-white/50 text-xs">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-2xl font-black text-gray-900 text-center mb-10"
            style={{ letterSpacing: "-0.5px" }}
          >
            Todo lo que necesitás como entrenador
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                title: "Rutinas inteligentes",
                desc: "Creá plantillas, asignalas con calendario automático y hacé seguimiento semana a semana.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 4-7" />
                  </svg>
                ),
                title: "Progreso en tiempo real",
                desc: "Tus alumnos registran sus cargas y vos ves el historial de peso, RPE y volumen.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                ),
                title: "Corrección de videos",
                desc: "Los alumnos suben videos de sus ejercicios y vos los revisás con comentarios.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: "Chat integrado",
                desc: "Mensajes directos con cada alumno. Notificaciones push para no perder nada.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                ),
                title: "Agenda visual",
                desc: "Ves todas las rutinas programadas de tus alumnos en los próximos 14 días.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M12 6.5a1 1 0 110-2 1 1 0 010 2z" fill="#534AB7"/><path d="M6.5 17.5l3-8 3 5 2-3 3 6" /><rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                ),
                title: "Biblioteca de ejercicios",
                desc: "Armá tu propia biblioteca con links de YouTube y notas técnicas para cada movimiento.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  border: "0.5px solid rgba(0,0,0,0.07)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(83,74,183,0.10)" }}
                >
                  {f.icon}
                </div>
                <p className="font-bold text-gray-900">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-6 pb-20" id="precios">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-black text-gray-900 text-center mb-2"
            style={{ letterSpacing: "-0.5px" }}
          >
            Planes simples y transparentes
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">
            14 días gratis en cualquier plan. Sin contratos anuales.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: "starter", name: "Starter", price: "12.000", students: 10, popular: false },
              { key: "pro", name: "Pro", price: "20.000", students: 30, popular: true },
              { key: "elite", name: "Elite", price: "35.000", students: 50, popular: false },
            ].map((plan) => (
              <div
                key={plan.key}
                className="rounded-2xl p-6 flex flex-col gap-4 relative"
                style={{
                  background: plan.popular
                    ? "linear-gradient(135deg, #534AB7, #4239A3)"
                    : "rgba(255,255,255,0.85)",
                  border: plan.popular ? "none" : "0.5px solid rgba(0,0,0,0.07)",
                  backdropFilter: "blur(8px)",
                  boxShadow: plan.popular ? "0 20px 60px rgba(83,74,183,0.35)" : "none",
                }}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-white text-purple-700">
                    Más popular
                  </span>
                )}
                <div>
                  <p className={`font-bold text-lg ${plan.popular ? "text-white" : "text-gray-900"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-3xl font-black ${plan.popular ? "text-white" : "text-gray-900"}`}>
                      ${plan.price}
                    </span>
                    <span className={`text-sm ${plan.popular ? "text-white/70" : "text-gray-400"}`}>
                      ARS/mes
                    </span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {[
                    `Hasta ${plan.students} alumnos`,
                    "Rutinas ilimitadas",
                    "Chat integrado",
                    "Corrección de videos",
                    "Historial de cargas",
                    "Notificaciones push",
                  ].map((feat) => (
                    <li
                      key={feat}
                      className={`flex items-center gap-2 text-sm ${plan.popular ? "text-white/90" : "text-gray-600"}`}
                    >
                      <svg
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: plan.popular ? "rgba(255,255,255,0.7)" : "#534AB7" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-2 inline-flex items-center justify-center rounded-xl py-3 text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    background: plan.popular ? "rgba(255,255,255,0.2)" : "#534AB7",
                    color: "#fff",
                    border: plan.popular ? "1px solid rgba(255,255,255,0.3)" : "none",
                  }}
                >
                  Empezar prueba gratis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 pb-20">
        <div
          className="max-w-xl mx-auto rounded-3xl p-10 text-center flex flex-col gap-4"
          style={{ background: "linear-gradient(135deg, #534AB7, #4239A3)" }}
        >
          <h2 className="text-2xl font-black text-white leading-tight">
            ¿Listo para organizarte mejor?
          </h2>
          <p className="text-white/80 text-sm">
            Empezá gratis hoy. Sin tarjeta de crédito, sin compromisos.
          </p>
          <Link
            href="/register"
            className="self-center inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:shadow-lg"
            style={{ background: "#fff", color: "#534AB7" }}
          >
            Crear mi cuenta
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 text-center" style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center"
            style={{ background: "#534AB7" }}
          >
            <span className="text-white text-[10px] font-black">TF</span>
          </div>
          <span className="font-black text-gray-700 text-sm">TrackFit Pro</span>
        </div>
        <p className="text-xs text-gray-400">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: "#534AB7" }}>
            Iniciá sesión
          </Link>
        </p>
      </footer>
    </div>
  );
}
