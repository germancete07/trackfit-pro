import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "@/components/shared/ChatView";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, trainer_id, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Student: show their chat with the trainer directly
  if (profile.role === "student") {
    if (!profile.trainer_id) {
      return (
        <div className="px-4 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-5xl">💬</p>
          <p className="text-base font-bold text-gray-700">Sin entrenador asignado</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Una vez que un entrenador te agregue a su cuenta vas a poder chatear con él acá.
          </p>
        </div>
      );
    }

    const { data: trainer } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", profile.trainer_id)
      .single();

    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("trainer_id", profile.trainer_id)
      .eq("student_id", user.id)
      .order("created_at", { ascending: true });

    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm">
          <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {trainer?.avatar_url
              ? <img src={trainer.avatar_url} alt={trainer.full_name} className="h-full w-full object-cover" />
              : <span className="text-brand-600 font-bold text-sm">{trainer?.full_name.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{trainer?.full_name}</p>
            <p className="text-xs text-gray-400">Entrenador</p>
          </div>
        </div>
        <ChatView
          initialMessages={(messages ?? []) as Message[]}
          currentUserId={user.id}
          trainerId={profile.trainer_id}
          studentId={user.id}
          otherName={trainer?.full_name ?? "Entrenador"}
          otherAvatar={trainer?.avatar_url}
        />
      </div>
    );
  }

  // Trainer: show conversation list
  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("trainer_id", user.id)
    .eq("archived", false)
    .order("full_name");

  const studentIds = (students ?? []).map((s) => s.id);

  // Fetch last message + unread count per student
  const { data: allMessages } = studentIds.length > 0
    ? await supabase
        .from("messages")
        .select("*")
        .eq("trainer_id", user.id)
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const msgs = (allMessages ?? []) as Message[];

  // Build per-student summary
  const summaryMap: Record<string, { last: Message; unread: number }> = {};
  for (const msg of msgs) {
    if (!summaryMap[msg.student_id]) {
      summaryMap[msg.student_id] = { last: msg, unread: 0 };
    }
    if (!msg.read && msg.sender_id !== user.id) {
      summaryMap[msg.student_id].unread++;
    }
  }

  const studentList = (students ?? []).sort((a, b) => {
    const aTime = summaryMap[a.id]?.last.created_at ?? "0";
    const bTime = summaryMap[b.id]?.last.created_at ?? "0";
    return bTime.localeCompare(aTime);
  });

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <h1 className="text-xl font-black text-gray-900">Mensajes</h1>

      {studentList.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-5xl">💬</p>
          <p className="text-base font-bold text-gray-700">Sin conversaciones</p>
          <p className="text-sm text-gray-400">Agregá alumnos para poder chatear con ellos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {studentList.map((student) => {
            const summary = summaryMap[student.id];
            return (
              <Link key={student.id} href={`/dashboard/chat/${student.id}`}>
                <Card padding="sm" className="flex items-center gap-3 hover:border-brand-200 transition-colors cursor-pointer">
                  <div className="h-11 w-11 rounded-full bg-brand-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {student.avatar_url
                      ? <img src={student.avatar_url} alt={student.full_name} className="h-full w-full object-cover" />
                      : <span className="text-brand-600 font-bold">{student.full_name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-semibold truncate", summary?.unread ? "text-gray-900" : "text-gray-700")}>
                        {student.full_name}
                      </p>
                      {summary?.last && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {new Date(summary.last.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">
                        {summary?.last
                          ? (summary.last.sender_id === user.id ? "Vos: " : "") + summary.last.content
                          : "Sin mensajes aun"
                        }
                      </p>
                      {summary?.unread > 0 && (
                        <span className="flex-shrink-0 h-5 min-w-[1.25rem] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {summary.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
