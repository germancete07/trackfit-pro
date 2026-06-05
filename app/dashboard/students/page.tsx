import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("trainer_id", user.id)
    .order("full_name");

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Alumnos</h1>
        <Link href="/dashboard/students/new">
          <Button size="sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo
          </Button>
        </Link>
      </div>

      {students && students.length > 0 ? (
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <Link key={s.id} href={`/dashboard/students/${s.id}`}>
              <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-600 font-bold">{s.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
                <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm">No tenés alumnos todavía.</p>
          <Link href="/dashboard/students/new">
            <Button size="sm">Agregar primer alumno</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
