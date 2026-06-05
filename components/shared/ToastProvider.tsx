"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl shadow-black/10 border text-sm font-medium transition-all duration-300 pointer-events-auto",
        "backdrop-blur-xl",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        {
          success: "bg-white/90 border-green-100 text-gray-800",
          error: "bg-white/90 border-red-100 text-gray-800",
          info: "bg-white/90 border-brand-100 text-gray-800",
        }[toast.type]
      )}
    >
      <span className="text-base">
        {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
      </span>
      {toast.message}
    </div>
  );
}
