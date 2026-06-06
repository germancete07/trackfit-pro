"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => Promise<void>;
}

const Ctx = createContext<ThemeCtx>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: async () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

function getResolved(t: Theme): "light" | "dark" {
  if (t === "dark") return "dark";
  if (t === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: Theme) {
  const resolved = getResolved(t);
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  return resolved;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  userId,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  userId: string;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");

  // Apply on mount + handle system changes
  useEffect(() => {
    // Prefer localStorage for instant apply (anti-flash script already ran)
    const stored = localStorage.getItem("tf-theme") as Theme | null;
    const effective = stored ?? defaultTheme;
    setThemeState(effective);
    const r = applyTheme(effective);
    setResolved(r);

    // Listen to system changes when theme is "system"
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      setThemeState(prev => {
        if (prev === "system") {
          const r2 = applyTheme("system");
          setResolved(r2);
        }
        return prev;
      });
    }
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  const setTheme = useCallback(async (t: Theme) => {
    setThemeState(t);
    const r = applyTheme(t);
    setResolved(r);
    localStorage.setItem("tf-theme", t);

    // Persist to Supabase (best effort)
    try {
      const supabase = createClient();
      await supabase.from("profiles").update({ theme_preference: t }).eq("id", userId);
    } catch {
      // Ignore — localStorage is the source of truth
    }
  }, [userId]);

  return (
    <Ctx.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </Ctx.Provider>
  );
}
