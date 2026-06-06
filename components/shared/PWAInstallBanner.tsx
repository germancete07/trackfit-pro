"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "pwa-banner-dismissed";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as any).standalone === true) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_TTL) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const safari = /safari/i.test(ua) && !/chrome|crios|fxios|edgios/i.test(ua);

    if (ios && safari) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Android Chrome / desktop Chrome
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    await (deferredPrompt as any).userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-[4.75rem] md:bottom-6 left-3 right-3 z-40 max-w-md mx-auto">
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">💪</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Instalá TrackFit Pro</p>
          {isIOS ? (
            <p className="text-xs text-gray-400 mt-0.5">
              Tocá <span className="text-white font-semibold">Compartir ↑</span>{" "}→{" "}
              <span className="text-white font-semibold">Agregar a inicio</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              Acceso rápido desde tu pantalla de inicio
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIOS && (
            <button
              onClick={install}
              className="text-xs font-bold bg-brand-500 text-white px-3 py-2 rounded-xl"
            >
              Instalar
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="h-9 w-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
