"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Notification } from "@/lib/types";

interface NavbarProps {
  profile: Profile;
  unreadCount?: number;
  unreadMessages?: number;
  notifications?: Notification[];
}

interface NavLink {
  href: string;
  label: string;
  icon: ({ className }: { className?: string }) => JSX.Element;
  exact?: boolean;
  isChatBadge?: boolean;
}

const trainerMobileLinks: NavLink[] = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon, exact: true },
  { href: "/dashboard/students", label: "Alumnos", icon: UsersIcon },
  { href: "/dashboard/routines", label: "Rutinas", icon: TemplateIcon },
  { href: "/dashboard/calendar", label: "Agenda", icon: CalendarGridIcon },
  { href: "/dashboard/chat", label: "Chat", icon: ChatIcon, isChatBadge: true },
];

const trainerDesktopLinks: NavLink[] = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon, exact: true },
  { href: "/dashboard/students", label: "Alumnos", icon: UsersIcon },
  { href: "/dashboard/routines", label: "Rutinas", icon: TemplateIcon },
  { href: "/dashboard/calendar", label: "Agenda", icon: CalendarGridIcon },
  { href: "/dashboard/library", label: "Biblioteca", icon: LibraryIcon },
  { href: "/dashboard/corrections", label: "Correcciones", icon: VideoIcon },
  { href: "/dashboard/chat", label: "Chat", icon: ChatIcon, isChatBadge: true },
];

const studentLinks: NavLink[] = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon, exact: true },
  { href: "/dashboard/my-sessions", label: "Rutinas", icon: CalendarIcon },
  { href: "/dashboard/calendar", label: "Calendario", icon: CalendarGridIcon },
  { href: "/dashboard/progress", label: "Progreso", icon: ChartIcon },
  { href: "/dashboard/chat", label: "Chat", icon: ChatIcon, isChatBadge: true },
];

export function Navbar({ profile, unreadCount = 0, unreadMessages = 0, notifications = [] }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isTrainer = profile.role === "trainer";
  const mobileLinks = isTrainer ? trainerMobileLinks : studentLinks;
  const desktopLinks = isTrainer ? trainerDesktopLinks : studentLinks;
  const appName = (isTrainer && profile.space_name) ? profile.space_name : "TrackFit Pro";

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 z-40 overflow-y-auto"
        style={{ background: "var(--sidebar-bg, #2C2C2A)" }}>

        {/* Logo */}
        <div className="px-4 pt-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: "#534AB7" }}>
              <span className="text-white text-xs font-black tracking-tight">TF</span>
            </div>
            <span className="font-black text-white tracking-tight truncate text-sm leading-tight">
              {appName}
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
          {desktopLinks.map(({ href, label, icon: Icon, exact, isChatBadge }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
                  active
                    ? "text-white"
                    : "hover:bg-white/5 transition-colors"
                )}
                style={active ? { background: "rgba(255,255,255,0.12)", color: "#fff" } : { color: "rgba(255,255,255,0.45)" }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
                {isChatBadge && unreadMessages > 0 && (
                  <span className="ml-auto h-4.5 min-w-[1.125rem] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-5 flex flex-col gap-0.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="pt-3 px-1 pb-1">
            <NotificationBell count={unreadCount} notifications={notifications} userRole={profile.role} />
          </div>
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
              isActive("/dashboard/settings")
                ? "text-white"
                : "hover:bg-white/5"
            )}
            style={
              isActive("/dashboard/settings")
                ? { background: "rgba(255,255,255,0.12)", color: "#fff" }
                : { color: "rgba(255,255,255,0.45)" }
            }
          >
            <GearIcon className="h-4 w-4 flex-shrink-0" />
            Configuración
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150"
          >
            <div className="relative h-7 w-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: "#534AB7" }}>
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.full_name ?? ""} fill sizes="28px" className="object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {profile.full_name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
              {profile.full_name}
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left hover:bg-white/5 transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <LogoutIcon className="h-4 w-4 flex-shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ─────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 safe-top"
        style={{
          background: "var(--header-bg, rgba(255,255,255,0.80))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "0.5px solid var(--header-border, rgba(0,0,0,0.08))",
          transition: "background 300ms ease",
        }}>
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: "#534AB7" }}>
              <span className="text-white text-xs font-black tracking-tight">TF</span>
            </div>
            <span className="font-black tracking-tight truncate max-w-[140px] text-sm text-gray-900">
              {appName}
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <NotificationBell count={unreadCount} notifications={notifications} userRole={profile.role} />
            <Link
              href="/dashboard/settings"
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(0,0,0,0.06)", color: "#666" }}
              title="Configuración"
            >
              <GearIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/profile"
              className="relative h-8 w-8 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-brand-300 transition-all flex-shrink-0"
              style={{ background: "#534AB7" }}
              title="Mi perfil"
            >
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.full_name ?? ""} fill sizes="32px" className="object-cover" />
              ) : (
                <span className="text-white font-bold text-xs">
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.06)", color: "#888" }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom pill nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-5 inset-x-0 z-50 flex justify-center px-4">
        <div
          className="w-full max-w-sm flex items-center rounded-full px-1 py-1 shadow-xl shadow-black/10 gap-0.5"
          style={{
            background: "var(--nav-bg, rgba(255,255,255,0.92))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "0.5px solid var(--nav-border, rgba(0,0,0,0.08))",
            transition: "background 300ms ease",
          }}
        >
          {mobileLinks.map(({ href, label, icon: Icon, exact, isChatBadge }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-0.5 px-1 py-2 rounded-full text-[10px] font-semibold transition-all duration-200 min-w-0",
                  active ? "text-white shadow-md shadow-brand-500/30" : ""
                )}
                style={
                  active
                    ? { background: "#534AB7", color: "#fff" }
                    : { color: "rgba(128,128,128,0.9)" }
                }
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span className="truncate w-full text-center leading-none">{label}</span>
                {isChatBadge && unreadMessages > 0 && (
                  <span className="absolute top-0.5 right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75v-5.25h-4.5V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
function CalendarGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}
function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}
function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}
