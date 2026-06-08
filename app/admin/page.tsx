import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getPlan, isOnTrial, daysLeftInTrial } from "@/lib/plans";
import { AdminTrainerRow } from "./AdminTrainerRow";

export default async function AdminPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: selfProfile } = await admin
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!selfProfile?.is_admin && selfProfile?.email !== "gerkann@gmail.com") {
    redirect("/dashboard");
  }

  // Fetch all trainers
  const { data: trainers } = await admin
    .from("profiles")
    .select("id, full_name, email, space_name, plan, trial_ends_at, plan_expires_at, is_admin, created_at")
    .eq("role", "trainer")
    .order("created_at", { ascending: false });

  // Fetch student counts per trainer
  const { data: studentCounts } = await admin
    .from("profiles")
    .select("trainer_id")
    .eq("role", "student")
    .eq("archived", false)
    .not("trainer_id", "is", null);

  const countMap: Record<string, number> = {};
  for (const row of studentCounts ?? []) {
    if (row.trainer_id) {
      countMap[row.trainer_id] = (countMap[row.trainer_id] ?? 0) + 1;
    }
  }

  // Stats
  const totalTrainers = trainers?.length ?? 0;
  const onTrial = trainers?.filter((t) => isOnTrial(t.trial_ends_at)).length ?? 0;
  const totalStudents = Object.values(countMap).reduce((a, b) => a + b, 0);
  const planCounts = { starter: 0, pro: 0, elite: 0 };
  for (const t of trainers ?? []) {
    const p = (t.plan ?? "starter") as keyof typeof planCounts;
    if (p in planCounts) planCounts[p]++;
  }

  return (
    <div className="min-h-screen p-6" style={{ background: "#F5F3EE" }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "#534AB7" }}>
            <span className="text-white text-sm font-black">TF</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900" style={{ letterSpacing: "-0.5px" }}>
              Panel de administración
            </h1>
            <p className="text-sm text-gray-500">TrackFit Pro · {user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Entrenadores", value: totalTrainers, emoji: "👤" },
            { label: "En trial", value: onTrial, emoji: "⏳" },
            { label: "Alumnos activos", value: totalStudents, emoji: "💪" },
            { label: "Starter / Pro / Elite", value: `${planCounts.starter} / ${planCounts.pro} / ${planCounts.elite}`, emoji: "📊" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.9)", border: "0.5px solid rgba(0,0,0,0.07)" }}
            >
              <p className="text-2xl mb-1">{s.emoji}</p>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Trainer list */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.9)", border: "0.5px solid rgba(0,0,0,0.07)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}
          >
            <h2 className="font-black text-gray-900">Entrenadores</h2>
            <span className="text-xs text-gray-400">{totalTrainers} registrados</span>
          </div>

          <div className="divide-y divide-gray-50">
            {!trainers?.length ? (
              <div className="py-12 text-center text-gray-400">No hay entrenadores aún</div>
            ) : (
              trainers.map((trainer) => (
                <AdminTrainerRow
                  key={trainer.id}
                  trainer={trainer}
                  studentCount={countMap[trainer.id] ?? 0}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
