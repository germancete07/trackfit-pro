import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { ProfileForm } from "@/components/shared/ProfileForm";
import { StudentProfilePage } from "@/components/student/StudentProfilePage";
import type { Profile, BodyMeasurement, ProgressPhoto, VideoCorrection } from "@/lib/types";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  // Trainers: keep simple single-page profile
  if (profile.role === "trainer") {
    return (
      <div className="px-4 py-5 flex flex-col gap-5">
        <h1 className="text-xl font-black text-gray-900">Mi perfil</h1>
        <AvatarUpload userId={user.id} currentUrl={profile.avatar_url} fullName={profile.full_name} />
        <ProfileForm profile={profile as Profile} />
      </div>
    );
  }

  // Students: tabbed profile
  const tab = searchParams?.tab ?? "datos";

  let measurements: BodyMeasurement[] | null = null;
  let photos: ProgressPhoto[] | null = null;
  let corrections: VideoCorrection[] | null = null;

  if (tab === "medidas") {
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("student_id", user.id)
      .order("measured_at", { ascending: false });
    measurements = data;
  } else if (tab === "fotos") {
    const { data } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("student_id", user.id)
      .order("taken_at", { ascending: false });
    photos = data;
  } else if (tab === "videos") {
    const { data } = await supabase
      .from("video_corrections")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    corrections = data;
  }

  return (
    <StudentProfilePage
      profile={profile as Profile}
      activeTab={tab}
      measurements={measurements}
      photos={photos}
      corrections={corrections}
      userId={user.id}
      trainerId={(profile as Profile).trainer_id ?? null}
    />
  );
}
