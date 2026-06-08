"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function savePhotoAction(photoUrl: string, photoType: string, takenAt: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles").select("trainer_id").eq("id", user.id).single();
  if (!profile?.trainer_id) return { error: "Sin entrenador asignado" };

  const { error } = await supabase.from("progress_photos").insert({
    student_id: user.id,
    trainer_id: profile.trainer_id,
    photo_url: photoUrl,
    photo_type: photoType,
    taken_at: takenAt,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/progress-photos");
  return { success: true };
}

export async function deletePhotoAction(photoId: string, photoUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Delete DB record first — if this fails, nothing is removed from Storage
  const { error: dbErr } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", photoId)
    .eq("student_id", user.id);

  if (dbErr) return { error: "Error al eliminar la foto" };

  // DB deletion confirmed — now remove the file from Storage
  try {
    const url = new URL(photoUrl);
    const marker = "/progress-photos/";
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const storagePath = url.pathname.slice(idx + marker.length);
      await supabase.storage.from("progress-photos").remove([storagePath]);
    }
  } catch {
    // Storage removal failing is non-fatal (file can be cleaned up later)
    // but DB record is already gone, so photo won't re-appear on next load
    console.warn("[deletePhotoAction] Storage removal failed for:", photoUrl);
  }

  revalidatePath("/dashboard/progress-photos");
  return { success: true };
}
