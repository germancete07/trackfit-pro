import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-5 shadow-xl"
        style={{
          background: "var(--card-bg, rgba(255,255,255,0.85))",
          border: "0.5px solid var(--card-border, rgba(0,0,0,0.07))",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Logo */}
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "#534AB7" }}>
          <span className="text-white text-lg font-black tracking-tight">TF</span>
        </div>

        {/* 404 */}
        <div className="text-7xl font-black text-gray-900 leading-none" style={{ letterSpacing: "-2px" }}>
          404
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-bold text-gray-900">Página no encontrada</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            La página que buscás no existe o fue movida.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(to bottom, #534AB7, #4239A3)" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75v-5.25h-4.5V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
          </svg>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
