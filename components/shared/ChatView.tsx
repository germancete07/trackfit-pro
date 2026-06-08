"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface Props {
  initialMessages: Message[];
  currentUserId: string;
  trainerId: string;
  studentId: string;
  otherName: string;
  otherAvatar?: string | null;
}

export function ChatView({ initialMessages, currentUserId, trainerId, studentId, otherName, otherAvatar }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Stable client instance — createClient() at component level re-creates it on every render,
  // making `supabase` an unstable dependency that breaks useCallback and useEffect deps.
  const supabase = useMemo(() => createClient(), []);

  const markRead = useCallback(async () => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("trainer_id", trainerId)
      .eq("student_id", studentId)
      .neq("sender_id", currentUserId)
      .eq("read", false);
  }, [trainerId, studentId, currentUserId, supabase]);

  useEffect(() => {
    markRead();
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${trainerId}:${studentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `trainer_id=eq.${trainerId}` },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.student_id !== studentId) return;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_id !== currentUserId) markRead();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trainerId, studentId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText("");

    const { error } = await supabase.from("messages").insert({
      trainer_id: trainerId,
      student_id: studentId,
      sender_id: currentUserId,
      content,
    });

    if (error) setText(content);
    setSending(false);
  }

  function groupedDate(isoStr: string) {
    const d = new Date(isoStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Hoy";
    if (d.toDateString() === yesterday.toDateString()) return "Ayer";
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  }

  function timeLabel(isoStr: string) {
    return new Date(isoStr).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }

  // Group messages by date
  const groups: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const label = groupedDate(msg.created_at);
    if (!groups.length || groups[groups.length - 1].date !== label) {
      groups.push({ date: label, msgs: [msg] });
    } else {
      groups[groups.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
            <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center mb-3">
              <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">Empezá la conversacion</p>
            <p className="text-xs text-gray-400 mt-1">Enviá el primer mensaje a {otherName}</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date} className="flex flex-col gap-1">
            <div className="flex items-center justify-center my-3">
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-0.5">{group.date}</span>
            </div>
            {group.msgs.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex gap-2 mb-0.5", isMe ? "justify-end" : "justify-start")}>
                  {!isMe && (
                    <div className="h-7 w-7 rounded-full bg-brand-100 flex-shrink-0 flex items-center justify-center self-end mb-0.5 overflow-hidden">
                      {otherAvatar
                        ? <img src={otherAvatar} alt={otherName} className="h-full w-full object-cover" />
                        : <span className="text-brand-600 font-bold text-[10px]">{otherName.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm",
                    isMe
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-white border border-gray-100 text-gray-900 shadow-sm rounded-bl-sm"
                  )}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn("text-[10px] mt-0.5", isMe ? "text-brand-200 text-right" : "text-gray-400")}>
                      {timeLabel(msg.created_at)}
                      {isMe && msg.read && <span className="ml-1">✓✓</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/10 bg-white/80 dark:bg-[#1E1E2E]/90 backdrop-blur-sm"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Mensaje a ${otherName}...`}
          className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-white/[0.12] bg-gray-50 dark:bg-white/[0.08] px-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as any);
            }
          }}
        />
        <Button type="submit" size="sm" loading={sending} disabled={!text.trim()}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </Button>
      </form>
    </div>
  );
}
