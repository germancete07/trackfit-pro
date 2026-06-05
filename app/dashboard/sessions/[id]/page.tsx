import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, getYoutubeThumbnail } from "@/lib/utils";
import { SaveAsTemplateButton } from "@/components/trainer/SaveAsTemplateButton";
import Image from "next/image";

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select(`
      *,
      student:profiles!student_id(id, full_name, email),
      exercises(*, exercise_logs(*, student:profiles!student_id(full_name)))
    `)
    .eq("id", params.id)
    .eq("trainer_id", user.id)
    .single();

  if (!session) notFound();

  const exercises = (session.exercises as any[] ?? []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-gray-900">{session.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {(session.student as any)?.full_name}
            {session.scheduled_date && ` · ${formatDate(session.scheduled_date)}`}
          </p>
        </div>
        <Badge variant={session.status === "completed" ? "success" : session.status === "active" ? "info" : "default"}>
          {session.status === "completed" ? "Completada" : session.status === "active" ? "Activa" : "Pendiente"}
        </Badge>
      </div>

      {session.notes && (
        <Card padding="sm" className="bg-amber-50 border-amber-100">
          <p className="text-xs text-amber-700">{session.notes}</p>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <Link href={`/dashboard/students/${(session.student as any)?.id}/history`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">Ver historial</Button>
        </Link>
        <SaveAsTemplateButton sessionId={session.id} sessionName={session.name} />
      </div>

      {/* Exercises */}
      <div className="flex flex-col gap-3">
        {exercises.map((ex: any, i: number) => {
          const lastLog = ex.exercise_logs?.sort((a: any, b: any) =>
            new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
          )[0];
          const thumb = ex.youtube_url ? getYoutubeThumbnail(ex.youtube_url) : null;

          return (
            <Card key={ex.id} padding="none" className="overflow-hidden">
              {thumb && (
                <div className="relative h-32 w-full bg-gray-900">
                  <Image src={thumb} alt={ex.name} fill className="object-cover opacity-70" />
                  <a
                    href={ex.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <svg className="h-5 w-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </a>
                </div>
              )}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-brand-500 font-bold">#{i + 1}</span>
                    <h3 className="text-sm font-bold text-gray-900">{ex.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">{ex.sets}×{ex.reps}</p>
                    {ex.rest_seconds && (
                      <p className="text-xs text-gray-400">{ex.rest_seconds}s descanso</p>
                    )}
                  </div>
                </div>

                {ex.technical_note && (
                  <div className="bg-brand-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-brand-700">📌 {ex.technical_note}</p>
                  </div>
                )}

                {lastLog && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                    <span className="text-gray-500">Último registro:</span>
                    <span className="font-semibold">{lastLog.weight_kg}kg</span>
                    <span className="text-gray-400">{lastLog.completed_sets} series</span>
                    <span className={`font-bold ${lastLog.rpe >= 8 ? "text-red-500" : "text-green-600"}`}>
                      RPE {lastLog.rpe}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
