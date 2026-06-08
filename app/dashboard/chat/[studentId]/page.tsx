import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ChatView } from "@/components/shared/ChatView";
import type { Message } from "@/lib/types";

export default async function TrainerChatPage({ params }: { params: { studentId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  // Only trainers use this route; students go to /dashboard/chat
  if (profile?.role !== "trainer") redirect("/dashboard/chat");

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", params.studentId)
    .eq("trainer_id", user.id)
    .single();

  if (!student) notFound();

  const { data: trainerProfile } = await supabase
    .from("profiles").select("full_name, avatar_url").eq("id", user.id).single();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("trainer_id", user.id)
    .eq("student_id", params.studentId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm">
        <Link href="/dashboard/chat">
          <Button variant="ghost" size="sm" className="p-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
        </Link>
        <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {student.avatar_url
            ? <img src={student.avatar_url} alt={student.full_name} className="h-full w-full object-cover" />
            : <span className="text-brand-600 font-bold text-sm">{student.full_name?.charAt(0).toUpperCase() ?? "?"}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{student.full_name}</p>
          <p className="text-xs text-gray-400">{student.email}</p>
        </div>
        <Link href={`/dashboard/students/${student.id}`}>
          <Button variant="ghost" size="sm" className="text-xs">Ver perfil</Button>
        </Link>
      </div>

      <ChatView
        initialMessages={(messages ?? []) as Message[]}
        currentUserId={user.id}
        trainerId={user.id}
        studentId={params.studentId}
        otherName={student.full_name}
        otherAvatar={student.avatar_url}
      />
    </div>
  );
}
