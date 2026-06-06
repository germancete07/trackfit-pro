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

  await supabase.from("progress_photos").delete().eq("id", photoId).eq("student_id", user.id);

  try {
    const url = new URL(photoUrl);
    const marker = "/progress-photos/";
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const storagePath = url.pathname.slice(idx + marker.length);
      await supabase.storage.from("progress-photos").remove([storagePath]);
    }
  } catch {}

  revalidatePath("/dashboard/progress-photos");
  return { success: true };
}
