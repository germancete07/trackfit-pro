import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsView } from "@/components/shared/NotificationsView";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: notifications }, { data: profile }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single(),
  ]);

  return <NotificationsView notifications={notifications ?? []} userRole={profile?.role ?? "student"} />;
}
