import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/shared/Navbar";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { TimerProvider } from "@/components/shared/TimerContext";
import { TimerWidget } from "@/components/shared/TimerWidget";
import { PushRegistration } from "@/components/shared/PushRegistration";
import { PWAInstallBanner } from "@/components/shared/PWAInstallBanner";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { PageTransition } from "@/components/shared/PageTransition";
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
    { data: recentNotifications },
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
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const defaultTheme = (profile.theme_preference ?? "system") as "light" | "dark" | "system";

  return (
    <ThemeProvider defaultTheme={defaultTheme} userId={user.id}>
      <ToastProvider>
        <TimerProvider>
          <div className="min-h-screen">
            <Navbar
              profile={profile as Profile}
              unreadCount={unreadCount ?? 0}
              unreadMessages={unreadMessages ?? 0}
              notifications={(recentNotifications ?? []) as any}
            />
            <main className="pt-14 pb-nav md:pt-0 md:pb-8 md:ml-56">
              <div className="max-w-4xl mx-auto">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
            <TimerWidget />
            <PushRegistration userId={user.id} />
            <PWAInstallBanner />
          </div>
        </TimerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
