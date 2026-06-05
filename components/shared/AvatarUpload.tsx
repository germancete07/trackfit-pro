"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/shared/ToastProvider";

interface Props {
  userId: string;
  currentUrl: string | null;
  fullName: string;
}

export function AvatarUpload({ userId, currentUrl, fullName }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Máximo 2 MB por imagen", "error");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      showToast("Error al subir la imagen", "error");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    showToast("Foto de perfil actualizada");
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <div className="h-20 w-20 rounded-2xl bg-brand-100 overflow-hidden flex items-center justify-center shadow-sm">
          {preview ? (
            <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-brand-600 font-bold text-2xl">{initials || "?"}</span>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 text-left"
        >
          Cambiar foto
        </button>
        <p className="text-xs text-gray-400">JPG, PNG o WEBP · Máx 2 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
