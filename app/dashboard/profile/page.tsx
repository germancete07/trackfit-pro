import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { ProfileForm } from "@/components/shared/ProfileForm";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      <h1 className="text-xl font-black text-gray-900">Mi perfil</h1>

      <AvatarUpload
        userId={user.id}
        currentUrl={profile.avatar_url}
        fullName={profile.full_name}
      />

      <ProfileForm profile={profile as Profile} />
    </div>
  );
}
