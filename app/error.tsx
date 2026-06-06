"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
          style={{ background: "linear-gradient(135deg, #F5F3EE 0%, #DDD9D0 50%, #C4BFB4 100%)" }}>
          <div
            className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-5 shadow-xl"
            style={{ background: "rgba(255,255,255,0.85)", border: "0.5px solid rgba(0,0,0,0.07)", backdropFilter: "blur(8px)" }}
          >
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "#534AB7" }}>
              <span className="text-white text-lg font-black">TF</span>
            </div>
            <div className="text-4xl">⚠️</div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Algo salió mal</h1>
              <p className="text-sm text-gray-500">Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(to bottom, #534AB7, #4239A3)" }}
              >
                Intentar de nuevo
              </button>
              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-center"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
