"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { inviteStudentAction } from "@/app/dashboard/settings/actions";

export function InviteStudentForm() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;
    setLoading(true);
    const result = await inviteStudentAction(email.trim(), fullName.trim());
    setLoading(false);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast(`Invitacion enviada a ${email}`);
      setEmail("");
      setFullName("");
    }
  }

  return (
    <Card padding="md">
      <form onSubmit={handleInvite} className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-700">Invitar alumno</h2>
          <p className="text-xs text-gray-400 mt-0.5">El alumno recibirá un email para crear su cuenta.</p>
        </div>
        <Input label="Nombre completo" placeholder="Juan Perez" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="Email" type="email" placeholder="alumno@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" size="sm" loading={loading}>Enviar invitacion</Button>
      </form>
    </Card>
  );
}
