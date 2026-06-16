import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TrainingDaysPicker } from "@/components/trainer/TrainingDaysPicker";
import { TrainerNotesEditor } from "@/components/trainer/TrainerNotesEditor";
import { ArchiveButton } from "@/components/trainer/ArchiveButton";
import { ActiveAssignmentCard } from "@/components/trainer/ActiveAssignmentCard";
import { StudentCorrectionsPanel } from "@/components/trainer/StudentCorrectionsPanel";
import { MeasurementsForm } from "@/components/trainer/MeasurementsForm";
import { ProgressPhotos } from "@/components/student/ProgressPhotos";
import { ProgressView } from "@/components/student/ProgressView";
import { TrainerLogSessionButton } from "@/components/trainer/TrainerLogSessionButton";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const VALID_TABS = ["info", "rutina", "progreso", "medidas", "fotos", "correcciones"] as const;
type Tab = (typeof VALID_TABS)[number];

const DAY_SHORT: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
};
const SEX_LABELS: Record<string, string> = {
  male: "Masculino", female: "Femenino", prefer_not_to_say: "Prefiero no decir",
};
const EXP_LABELS: Record<string, string> = {
  beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado",
};

function formatAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function parseReps(s: string): number {
  if (!s) return 8;
  const x = s.match(/(\d+)/);
  return x ? parseInt(x[1]) : 8;
}

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

  // Verify student belongs to this trainer
  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();
  if (!student) notFound();

  const s = student as Profile;
  const activeTab: Tab =
    (VALID_TABS as readonly string[]).includes(searchParams.tab ?? "")
      ? (searchParams.tab as Tab)
      : "info";
  const age = formatAge(s.birth_date ?? null);

  // ── Data fetching per tab ─────────────────────────────────────

  // Active assignment — needed for info + rutina
  let activeAssignment: any = null;
  let assignmentProgress: { total: number; completed: number } | null = null;

  if (activeTab === "info" || activeTab === "rutina") {
    const { data: assignment } = await supabase
      .from("routine_assignments")
      .select("id, start_date, training_days, total_weeks, deload_every_weeks, template_id, session_templates(id, name, training_type)")
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .eq("status", "active")
      .maybeSingle();
    activeAssignment = assignment;

    // Fetch routine_days separately (avoids PostgREST schema-cache issues)
    if (assignment?.template_id) {
      const { data: rdRows } = await supabase
        .from("routine_days")
        .select("id, day_number, name, sort_order")
        .eq("template_id", assignment.template_id)
        .order("day_number");

      if (rdRows && rdRows.length > 0) {
        const dayIds = rdRows.map((d: { id: string }) => d.id);
        const { data: exRows } = await supabase
          .from("template_exercises")
          .select("id, name, sort_order, superset_group, routine_day_id")
          .in("routine_day_id", dayIds);

        const exByDay: Record<string, typeof exRows> = {};
        for (const ex of exRows ?? []) {
          const key = ex.routine_day_id as string;
          if (!exByDay[key]) exByDay[key] = [];
          exByDay[key]!.push(ex);
        }

        (activeAssignment as any).routineDays = rdRows.map((d: { id: string; day_number: number; name: string; sort_order: number }) => ({
          ...d,
          template_exercises: (exByDay[d.id] ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        }));
      }
    }

    if (assignment) {
      const { data: assignSessions } = await supabase
        .from("sessions")
        .select("status")
        .eq("assignment_id", assignment.id);
      if (assignSessions) {
        assignmentProgress = {
          total: assignSessions.length,
          completed: assignSessions.filter((ss: { status: string }) => ss.status === "completed").length,
        };
      }
    }
  }

  // History assignments — rutina tab only
  let historyAssignments: any[] = [];
  if (activeTab === "rutina") {
    const { data: history } = await supabase
      .from("routine_assignments")
      .select("id, start_date, total_weeks, status, created_at, session_templates(name)")
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .neq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);
    historyAssignments = history ?? [];
  }

  // Progress data — progreso tab only
  let prs: any[] = [];
  let weeklyVolume: any[] = [];
  let rpeTrend: any[] = [];
  let exercises: { id: string; name: string }[] = [];
  let weightHistory: Record<string, { week: string; max_weight: number }[]> = {};
  let attendanceStats: { total: number; completed: number; streak: number } | null = null;

  if (activeTab === "progreso") {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const [{ data: allLogs }, { data: recentLogs }, { data: allSessions }] = await Promise.all([
      supabase
        .from("exercise_logs")
        .select("weight_kg, rpe, completed_sets, session_id, logged_at, exercise_id, exercises(name, reps, muscle_group)")
        .eq("student_id", params.id)
        .gte("logged_at", twoYearsAgo.toISOString())
        .not("weight_kg", "is", null)
        .limit(5000),
      supabase
        .from("exercise_logs")
        .select("weight_kg, rpe, completed_sets, session_id, logged_at, exercise_id, exercises(name, reps, muscle_group)")
        .eq("student_id", params.id)
        .gte("logged_at", eightWeeksAgo.toISOString())
        .not("weight_kg", "is", null),
      supabase
        .from("sessions")
        .select("status, scheduled_date")
        .eq("student_id", params.id)
        .eq("trainer_id", user.id)
        .order("scheduled_date", { ascending: false })
        .limit(500),
    ]);

    // PRs
    const prMap: Record<string, { max_weight: number; last_logged: string; reps: string; muscle_group: string | null }> = {};
    for (const l of allLogs ?? []) {
      const ex = l.exercises as any;
      const name = ex?.name as string | undefined;
      if (!name || !l.weight_kg) continue;
      if (!prMap[name] || l.weight_kg > prMap[name].max_weight) {
        prMap[name] = { max_weight: l.weight_kg, last_logged: l.logged_at, reps: ex?.reps ?? "8", muscle_group: ex?.muscle_group ?? null };
      }
    }
    prs = Object.entries(prMap)
      .map(([exercise_name, v]) => ({
        exercise_name,
        max_weight: v.max_weight,
        last_logged: v.last_logged,
        est_1rm: Math.round(v.max_weight * (1 + parseReps(v.reps) / 30) * 10) / 10,
        muscle_group: v.muscle_group,
      }))
      .sort((a, b) => b.max_weight - a.max_weight);

    // Weekly volume
    const weekVol: Record<string, number> = {};
    for (const l of recentLogs ?? []) {
      if (!l.weight_kg || !l.completed_sets) continue;
      const d = new Date(l.logged_at);
      const dow = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const key = monday.toISOString().split("T")[0];
      weekVol[key] = (weekVol[key] ?? 0) + l.weight_kg * l.completed_sets;
    }
    weeklyVolume = Object.entries(weekVol)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, volume]) => ({ week, volume: Math.round(volume) }));

    // RPE trend
    const sessionRpe: Record<string, { sum: number; count: number; date: string }> = {};
    for (const l of recentLogs ?? []) {
      if (!l.rpe || !l.session_id) continue;
      if (!sessionRpe[l.session_id])
        sessionRpe[l.session_id] = { sum: 0, count: 0, date: l.logged_at };
      sessionRpe[l.session_id].sum += l.rpe;
      sessionRpe[l.session_id].count++;
    }
    rpeTrend = Object.values(sessionRpe)
      .map((v) => ({ session_name: "", date: v.date, avg_rpe: Math.round((v.sum / v.count) * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weight history per exercise
    const exerciseMap: Record<string, string> = {};
    for (const l of recentLogs ?? []) {
      const name = (l.exercises as any)?.name as string | undefined;
      if (name && l.exercise_id) exerciseMap[name] = l.exercise_id;
    }
    exercises = Object.entries(exerciseMap).map(([name, id]) => ({ id, name }));

    const whMap: Record<string, Record<string, number>> = {};
    for (const l of recentLogs ?? []) {
      const name = (l.exercises as any)?.name as string | undefined;
      if (!name || !l.weight_kg) continue;
      const d = new Date(l.logged_at);
      const dow = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const key = monday.toISOString().split("T")[0];
      if (!whMap[name]) whMap[name] = {};
      whMap[name][key] = Math.max(whMap[name][key] ?? 0, l.weight_kg);
    }
    for (const [name, weeks] of Object.entries(whMap)) {
      weightHistory[name] = Object.entries(weeks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, max_weight]) => ({ week, max_weight }));
    }

    // Attendance & streak
    const sessions = allSessions ?? [];
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((ss: { status: string }) => ss.status === "completed").length;
    let streak = 0;
    for (const sess of sessions) {
      if ((sess as { status: string }).status === "completed") streak++;
      else break;
    }
    attendanceStats = { total: totalSessions, completed: completedSessions, streak };
  }

  // Measurements — medidas tab only
  let measurements: any[] = [];
  if (activeTab === "medidas") {
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("student_id", params.id)
      .order("measured_at", { ascending: false });
    measurements = data ?? [];
  }

  // Photos — fotos tab only
  let photos: any[] = [];
  if (activeTab === "fotos") {
    const { data } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("student_id", params.id)
      .order("taken_at", { ascending: false });
    photos = data ?? [];
  }

  // Corrections — always count pending for badge; full list for correcciones tab
  let corrections: any[] = [];
  let pendingCorrectionsCount = 0;
  if (activeTab === "correcciones") {
    const { data } = await supabase
      .from("video_corrections")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .order("created_at", { ascending: false });
    corrections = data ?? [];
    pendingCorrectionsCount = corrections.filter((c: { status: string }) => c.status === "pending").length;
  } else {
    const { count } = await supabase
      .from("video_corrections")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .eq("student_id", params.id)
      .eq("status", "pending");
    pendingCorrectionsCount = count ?? 0;
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-brand-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
          {s.avatar_url ? (
            <img src={s.avatar_url} alt={s.full_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-brand-600 font-bold text-2xl">
              {s.full_name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-gray-900 truncate">{s.full_name || "(Sin nombre)"}</h1>
            {s.archived && <Badge variant="default">Archivado</Badge>}
          </div>
          <p className="text-sm text-gray-400 truncate">{s.email}</p>
          {s.training_goal && (
            <span className="inline-block mt-0.5 text-xs bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-100 dark:border-brand-500/20">
              {s.training_goal}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="px-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 pb-2 min-w-max">
          {(
            [
              { key: "info",          label: "Info" },
              { key: "rutina",        label: "Rutina" },
              { key: "progreso",      label: "Progreso" },
              { key: "medidas",       label: "Medidas" },
              { key: "fotos",         label: "Fotos" },
              { key: "correcciones",  label: "Correcciones", badge: pendingCorrectionsCount },
            ] as Array<{ key: string; label: string; badge?: number }>
          ).map(({ key, label, badge }) => (
            <Link
              key={key}
              href={`/dashboard/students/${params.id}?tab=${key}`}
              className={cn(
                "relative flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                activeTab === key
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15"
              )}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-white/10 mx-4 mb-1" />

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ════════════════════════════════════════════════════════
            Tab: INFO
            ════════════════════════════════════════════════════════ */}
        {activeTab === "info" && (
          <>
            {/* Datos del alumno */}
            <Card padding="md" className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-gray-700">Datos del alumno</h2>

              {/* Info grid */}
              {(age !== null || s.birth_date || s.sex || s.height_cm || s.weight_kg || s.experience_level || s.start_date) ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {age !== null && (
                    <div>
                      <p className="text-xs text-gray-400">Edad</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{age} años</p>
                    </div>
                  )}
                  {s.birth_date && (
                    <div>
                      <p className="text-xs text-gray-400">Nacimiento</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{fmtDate(s.birth_date)}</p>
                    </div>
                  )}
                  {s.sex && (
                    <div>
                      <p className="text-xs text-gray-400">Sexo</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{SEX_LABELS[s.sex] ?? s.sex}</p>
                    </div>
                  )}
                  {s.height_cm && (
                    <div>
                      <p className="text-xs text-gray-400">Altura</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{s.height_cm} cm</p>
                    </div>
                  )}
                  {s.weight_kg && (
                    <div>
                      <p className="text-xs text-gray-400">Peso</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{s.weight_kg} kg</p>
                    </div>
                  )}
                  {s.experience_level && (
                    <div>
                      <p className="text-xs text-gray-400">Experiencia</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{EXP_LABELS[s.experience_level] ?? s.experience_level}</p>
                    </div>
                  )}
                  {s.start_date && (
                    <div>
                      <p className="text-xs text-gray-400">Inicio entrenamiento</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{fmtDate(s.start_date)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">El alumno aún no completó su perfil.</p>
              )}

              {/* Objetivo */}
              {s.training_goal && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Objetivo</p>
                  <span className="inline-block bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-semibold px-3 py-1 rounded-full border border-brand-100 dark:border-brand-500/20">
                    {s.training_goal}
                  </span>
                </div>
              )}

              {/* Limitaciones físicas */}
              {s.physical_limitations && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">⚠ Limitaciones físicas</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{s.physical_limitations}</p>
                </div>
              )}

              {/* Días preferidos del alumno */}
              {s.preferred_training_days && s.preferred_training_days.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Días preferidos del alumno</p>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <span
                        key={d}
                        className={cn(
                          "text-xs font-semibold px-2.5 py-0.5 rounded-full",
                          s.preferred_training_days.includes(d)
                            ? "bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300"
                            : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/20"
                        )}
                      >
                        {DAY_SHORT[d]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Notas privadas del entrenador */}
            <Card padding="md">
              <TrainerNotesEditor studentId={params.id} initialNotes={s.trainer_notes ?? ""} />
            </Card>

            {/* Archivar */}
            <ArchiveButton studentId={params.id} archived={s.archived} studentName={s.full_name} />
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            Tab: RUTINA
            ════════════════════════════════════════════════════════ */}
        {activeTab === "rutina" && (
          <>
            <Link href={`/dashboard/routines?assignTo=${params.id}`}>
              <Button size="sm" className="w-full">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Asignar nueva rutina
              </Button>
            </Link>

            <TrainerLogSessionButton studentId={params.id} />

            <ActiveAssignmentCard
              assignment={activeAssignment}
              progress={assignmentProgress}
              studentId={params.id}
              templateId={activeAssignment?.template_id}
              routineDays={(activeAssignment as any)?.routineDays}
            />

            {/* Historial */}
            {historyAssignments.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-700 mb-2">Historial de rutinas</h2>
                <div className="flex flex-col gap-2">
                  {historyAssignments.map((ra: any) => (
                    <Card key={ra.id} padding="sm" className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {(() => {
                            const st = ra.session_templates;
                            const tpl = Array.isArray(st) ? st[0] : st;
                            return (tpl as { name?: string } | null)?.name ?? "Rutina eliminada";
                          })()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {fmtDate(ra.start_date)} · {ra.total_weeks} sem
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0",
                        ra.status === "completed"
                          ? "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50"
                      )}>
                        {ra.status === "completed" ? "Completada" : "Cancelada"}
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {historyAssignments.length === 0 && !activeAssignment && (
              <p className="text-sm text-gray-400 text-center py-6">Aún no se asignaron rutinas.</p>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            Tab: PROGRESO
            ════════════════════════════════════════════════════════ */}
        {activeTab === "progreso" && (
          <>
            {/* Stats de asistencia */}
            {attendanceStats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sesiones completadas", value: attendanceStats.completed },
                  { label: "Total asignadas",       value: attendanceStats.total },
                  { label: "Racha actual",          value: attendanceStats.streak > 0 ? `${attendanceStats.streak} 🔥` : "0" },
                ].map(({ label, value }) => (
                  <Card key={label} padding="sm" className="text-center">
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </Card>
                ))}
              </div>
            )}

            <ProgressView
              prs={prs}
              weeklyVolume={weeklyVolume}
              rpeTrend={rpeTrend}
              exercises={exercises}
              weightHistory={weightHistory}
            />
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            Tab: MEDIDAS
            ════════════════════════════════════════════════════════ */}
        {activeTab === "medidas" && (
          <MeasurementsForm studentId={params.id} measurements={measurements} />
        )}

        {/* ════════════════════════════════════════════════════════
            Tab: FOTOS
            ════════════════════════════════════════════════════════ */}
        {activeTab === "fotos" && (
          <ProgressPhotos photos={photos} studentId={params.id} readOnly />
        )}

        {/* ════════════════════════════════════════════════════════
            Tab: CORRECCIONES
            ════════════════════════════════════════════════════════ */}
        {activeTab === "correcciones" && (
          <StudentCorrectionsPanel corrections={corrections as any} />
        )}

      </div>
    </div>
  );
}
