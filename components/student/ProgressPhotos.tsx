"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/shared/ToastProvider";
import { savePhotoAction, deletePhotoAction } from "@/app/dashboard/progress-photos/actions";
import { cn } from "@/lib/utils";
import type { ProgressPhoto } from "@/lib/types";

const TYPES = [
  { value: "front", label: "Frente" },
  { value: "side", label: "Lado" },
  { value: "back", label: "Espalda" },
] as const;

type PhotoType = typeof TYPES[number]["value"];

interface Props {
  photos: ProgressPhoto[];
  studentId: string;
  readOnly?: boolean;
}

function groupByDate(photos: ProgressPhoto[]) {
  const map = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    const arr = map.get(p.taken_at) ?? [];
    arr.push(p);
    map.set(p.taken_at, arr);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export function ProgressPhotos({ photos: initial, studentId, readOnly = false }: Props) {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState<PhotoType>("front");
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [tab, setTab] = useState<"gallery" | "compare">("gallery");
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const grouped = groupByDate(photos);
  const dates = grouped.map(([d]) => d);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}.${ext}`;
    const path = `${studentId}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("progress-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      showToast("Error al subir la foto", "error");
      setUploading(false);
      e.target.value = "";
      return;
    }

    const { data: urlData } = supabase.storage.from("progress-photos").getPublicUrl(path);
    const result = await savePhotoAction(urlData.publicUrl, photoType, takenAt);

    if (result?.error) {
      showToast(result.error, "error");
    } else {
      showToast("Foto guardada");
      window.location.reload();
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(photo: ProgressPhoto) {
    if (!confirm("¿Eliminar esta foto?")) return;
    await deletePhotoAction(photo.id, photo.photo_url);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    showToast("Foto eliminada");
  }

  function getPhotosForDate(date: string) {
    return photos.filter(p => p.taken_at === date);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(["gallery", "compare"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
              tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            )}
          >
            {t === "gallery" ? "Galería" : "Comparar"}
          </button>
        ))}
      </div>

      {tab === "gallery" && (
        <>
          {/* Upload area — only for student */}
          {!readOnly && (
            <Card padding="md" className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-700">Subir foto</h3>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setPhotoType(t.value)}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-full transition-all",
                      photoType === t.value ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={takenAt}
                    onChange={e => setTakenAt(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <Button size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                  Elegir foto
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleUpload}
              />
            </Card>
          )}

          {/* Gallery grouped by date */}
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-4xl">📸</p>
              <p className="text-sm font-bold text-gray-700">
                {readOnly ? "Sin fotos todavía" : "Aún no hay fotos"}
              </p>
              <p className="text-xs text-gray-400">
                {readOnly
                  ? "El alumno aún no subió fotos de progreso."
                  : "Subí tu primera foto para empezar a registrar tu progreso visual."}
              </p>
            </div>
          ) : (
            grouped.map(([date, dayPhotos]) => (
              <div key={date} className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{date}</p>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(({ value: type, label }) => {
                    const photo = dayPhotos.find(p => p.photo_type === type);
                    return (
                      <div key={type} className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative group">
                        {photo ? (
                          <>
                            <img src={photo.photo_url} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-1.5 opacity-0 group-hover:opacity-100">
                              <span className="text-[10px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">{label}</span>
                              {!readOnly && (
                                <button
                                  onClick={() => handleDelete(photo)}
                                  className="text-white bg-red-500/80 rounded-full p-0.5"
                                >
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[10px] text-gray-300 font-semibold">{label}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "compare" && (
        <div className="flex flex-col gap-4">
          {dates.length < 2 ? (
            <p className="text-sm text-gray-400 text-center py-8">Necesitás fotos de al menos 2 fechas para comparar.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha A</label>
                  <select
                    value={compareA ?? ""}
                    onChange={e => setCompareA(e.target.value || null)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Elegir...</option>
                    {dates.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha B</label>
                  <select
                    value={compareB ?? ""}
                    onChange={e => setCompareB(e.target.value || null)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Elegir...</option>
                    {dates.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {compareA && compareB && (
                <div className="flex flex-col gap-3">
                  {TYPES.map(({ value: type, label }) => {
                    const photoA = getPhotosForDate(compareA).find(p => p.photo_type === type);
                    const photoB = getPhotosForDate(compareB).find(p => p.photo_type === type);
                    if (!photoA && !photoB) return null;
                    return (
                      <div key={type}>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1.5">{label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative">
                            {photoA
                              ? <img src={photoA.photo_url} alt={`${label} ${compareA}`} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><span className="text-xs text-gray-300">Sin foto</span></div>}
                            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full">{compareA}</span>
                          </div>
                          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative">
                            {photoB
                              ? <img src={photoB.photo_url} alt={`${label} ${compareB}`} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><span className="text-xs text-gray-300">Sin foto</span></div>}
                            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full">{compareB}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
