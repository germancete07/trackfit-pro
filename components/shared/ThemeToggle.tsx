"use client";

import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: "light", icon: "☀️", label: "Claro" },
  { value: "system", icon: "💻", label: "Sistema" },
  { value: "dark", icon: "🌙", label: "Oscuro" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-gray-700">Apariencia</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-sm font-semibold",
              theme === opt.value
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            )}
          >
            <span className="text-xl leading-none">{opt.icon}</span>
            <span className="text-xs">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
