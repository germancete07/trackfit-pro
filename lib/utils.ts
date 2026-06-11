import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getWeekStart(date: Date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&?/]+)/,
    /youtube\.com\/shorts\/([^&?/]+)/,
    /youtu\.be\/([^&?/]+)/,
    /youtube\.com\/embed\/([^&?/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getYoutubeThumbnail(url: string) {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function rpeColor(rpe: number) {
  if (rpe <= 5) return "text-green-600 bg-green-50";
  if (rpe <= 7) return "text-yellow-600 bg-yellow-50";
  if (rpe <= 9) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}
