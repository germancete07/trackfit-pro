import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrainingDaysPicker } from "@/components/trainer/TrainingDaysPicker";
import { TrainerNotesEditor } from "@/components/trainer/TrainerNotesEditor";
import { ArchiveButton } from "@/components/trainer/ArchiveButton";
import { ActiveAssignmentCard } from "@/components/trainer/ActiveAssignmentCard";
import { StudentCorrectionsPanel } from "@/components/trainer/StudentCorrectionsPanel";
import { formatDate, cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!student) notFound();

  const activeTab = searchParams.tab === "correcciones" ? "correcciones" : "info";

  const [{ data: sessions }, { data: trainingDaysRows }, { data: activeAssignment }, { data: corrections }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*, exercises(count)")
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .is("assignment_id", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("training_days")
      .select("day_of_week")
      .eq("student_id", params.id),
    supabase
      .from("routine_assignments")
      .select("id, start_date, training_days, total_weeks, deload_every_weeks, template_id, session_templates(name)")
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("video_corrections")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const pendingCorrectionsCount = (corrections ?? []).filter(c => c.status === "pending").length;

  const trainingDays = (trainingDaysRows ?? []).map((r: { day_of_week: number }) => r.day_of_week);
  const s = student as Profile;

  let assignmentProgress: { total: number; completed: number } | null = null;
  if (activeAssignment) {
    const { data: assignSessions } = await supabase
      .from("sessions")
      .select("status")
      .eq("assignment_id", activeAssignment.id);
    if (assignSessions) {
      assignmentProgress = {
        total: assignSessions.length,
        completed: assignSessions.filter((s: { status: string }) => s.status === "completed").length,
      };
    }
  }

  function formatAge(birthDate: string | null) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  const age = formatAge(s.birth_date ?? null);

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-brand-100 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
          {s.avatar_url ? (
            <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-brand-600 font-bold text-xl">
              {s.full_name ? s.full_name.charAt(0).toUpperCase() : "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</h1>
            {s.archived && <Badge variant="default">Archivado</Badge>}
          </div>
          <p className="text-sm text-gray-400">{s.email}</p>
        </div>
      </div>

      {/* Tabs: Info | Correcciones */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 self-start">
        <Link
          href={`/dashboard/students/${params.id}`}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "info" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Info
        </Link>
        <Link
          href={`/dashboard/students/${params.id}?tab=correcciones`}
          className={`relative px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "correcciones" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
          }`}
        >
          Correcciones
          {pendingCorrectionsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {pendingCorrectionsCount}
            </span>
          )}
        </Link>
      </div>

      {/* ── Tab: Correcciones ──────────────────────────────────── */}
      {activeTab === "correcciones" && (
        <StudentCorrectionsPanel corrections={(corrections ?? []) as any} />
      )}

      {/* ── Tab: Info ─────────────────────────────────────────── */}
      {activeTab === "info" && (
      <>
      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/dashboard/sessions/new?student=${params.id}`} className="flex-1 min-w-[120px]">
          <Button size="sm" className="w-full">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva rutina
          </Button>
        </Link>
        <Link href={`/dashboard/students/${params.id}/history`}>
          <Button size="sm" variant="secondary">Historial</Button>
        </Link>
        <Link href={`/dashboard/students/${params.id}/progress`}>
          <Button size="sm" variant="ghost">Progreso</Button>
        </Link>
        <Link href={`/dashboard/students/${params.id}/measurements`}>
          <Button size="sm" variant="ghost">Medidas</Button>
        </Link>
        <Link href={`/dashboard/students/${params.id}/photos`}>
          <Button size="sm" variant="ghost">Fotos</Button>
        </Link>
      </div>

      {/* Datos personales */}
      <Card padding="md" className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700">Datos del alumno</h2>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {age !== null && (
            <div>
              <p className="text-xs text-gray-400">Edad</p>
              <p className="font-semibold text-gray-800">{age} anos</p>
            </div>
          )}
          {s.birth_date && (
            <div>
              <p className="text-xs text-gray-400">Nacimiento</p>
              <p className="font-semibold text-gray-800">{formatDate(s.birth_date)}</p>
            </div>
          )}
          {s.start_date && (
            <div>
              <p className="text-xs text-gray-400">Inicio entrenamiento</p>
              <p className="font-semibold text-gray-800">{formatDate(s.start_date)}</p>
            </div>
          )}
        </div>

        {!age && !s.birth_date && !s.start_date && !s.training_goal && !s.physical_limitations && (
          <p className="text-xs text-gray-400">El alumno aun no completo su perfil.</p>
        )}

        {s.training_goal && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Objetivo</p>
            <p className="text-sm text-gray-700">{s.training_goal}</p>
          </div>
        )}

        {s.physical_limitations && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-600 mb-0.5">Limitaciones fisicas</p>
            <p className="text-sm text-amber-800">{s.physical_limitations}</p>
          </div>
        )}
      </Card>

      {/* Asignación activa */}
      <ActiveAssignmentCard
        assignment={activeAssignment as any}
        progress={assignmentProgress}
        studentId={params.id}
        templateId={activeAssignment?.template_id}
      />

      {/* Dias de entrenamiento */}
      <Card padding="md" className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700">Dias de entrenamiento</h2>
        <TrainingDaysPicker
          studentId={params.id}
          trainerId={user.id}
          initialDays={trainingDays}
        />
      </Card>

      {/* Notas privadas del entrenador */}
      <Card padding="md">
        <TrainerNotesEditor
          studentId={params.id}
          initialNotes={s.trainer_notes ?? ""}
        />
      </Card>

      {/* Rutinas */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-2">Rutinas</h2>
        {sessions && sessions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sessions.map((sess) => (
              <Link key={sess.id} href={`/dashboard/sessions/${sess.id}`}>
                <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{sess.name}</p>
                    <p className="text-xs text-gray-400">
                      {sess.scheduled_date ? formatDate(sess.scheduled_date) : "Sin fecha"} ·{" "}
                      {(sess.exercises as { count: number }[])?.[0]?.count ?? 0} ejercicios
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                    sess.status === "completed" ? "bg-green-100 text-green-700" :
                    sess.status === "active" ? "bg-brand-100 text-brand-700" :
                    "bg-gray-100 text-gray-500"
                  )}>
                    {sess.status === "completed" ? "Completada" : sess.status === "active" ? "Activa" : "Pendiente"}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            illustration="sessions"
            title="Sin rutinas asignadas"
            description="Crea la primera rutina para este alumno."
            action={{ label: "Crear rutina", href: `/dashboard/sessions/new?student=${params.id}` }}
          />
        )}
      </section>

      {/* Archivar / Desarchivar */}
      <ArchiveButton
        studentId={params.id}
        archived={s.archived}
        studentName={s.full_name}
      />
      </>
      )}
    </div>
  );
}
