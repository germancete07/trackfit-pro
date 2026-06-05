import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpaceNameForm } from "@/components/trainer/SpaceNameForm";
import { InviteStudentForm } from "@/components/trainer/InviteStudentForm";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Configuracion</h1>

      {profile.role === "trainer" && (
        <>
          <SpaceNameForm current={profile.space_name} />
          <InviteStudentForm />
        </>
      )}

      <Card padding="md" className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700">Cuenta</h2>
        <Link href="/dashboard/profile">
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Editar perfil y contraseña
          </Button>
        </Link>
        <Link href="/dashboard/notifications">
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Notificaciones
          </Button>
        </Link>
      </Card>

      {profile.role === "trainer" && (
        <Card padding="md" className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-gray-700">Alumnos</h2>
          <Link href="/dashboard/students">
            <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Gestionar alumnos (archivar, etc.)
            </Button>
          </Link>
          <Link href="/dashboard/templates">
            <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Biblioteca de plantillas
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
