import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/Navbar";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { TimerProvider } from "@/components/shared/TimerContext";
import { TimerWidget } from "@/components/shared/TimerWidget";
import { PushRegistration } from "@/components/shared/PushRegistration";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isTrainer = profile.role === "trainer";
  const trainerId = isTrainer ? user.id : profile.trainer_id;

  const [
    { count: unreadCount },
    { count: unreadMessages },
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
    trainerId
      ? supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq(isTrainer ? "trainer_id" : "student_id", user.id)
          .neq("sender_id", user.id)
          .eq("read", false)
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <ToastProvider>
      <TimerProvider>
        <div className="min-h-screen">
          <Navbar
            profile={profile as Profile}
            unreadCount={unreadCount ?? 0}
            unreadMessages={unreadMessages ?? 0}
          />
          <main className="pt-14 pb-nav md:pb-8">
            <div className="max-w-5xl mx-auto">
              {children}
            </div>
          </main>
          <TimerWidget />
          <PushRegistration userId={user.id} />
        </div>
      </TimerProvider>
    </ToastProvider>
  );
}
