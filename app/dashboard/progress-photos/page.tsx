import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProgressPhotos } from "@/components/student/ProgressPhotos";

export default async function ProgressPhotosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "student") redirect("/dashboard");

  const { data: photos } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("student_id", user.id)
    .order("taken_at", { ascending: false });

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Fotos de progreso</h1>
      <ProgressPhotos photos={photos ?? []} studentId={user.id} />
    </div>
  );
}
