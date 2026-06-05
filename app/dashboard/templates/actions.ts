"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface ExDraft {
  name: string; sets: number; reps: string;
  rest_seconds: number; youtube_url: string; technical_note: string;
}

export async function createTemplateAction(name: string, description: string, exercises: ExDraft[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: tpl, error: tErr } = await supabase
    .from("session_templates")
    .insert({ trainer_id: user.id, name: name.trim(), description: description.trim() || null })
    .select().single();

  if (tErr || !tpl) return { error: "Error al crear la plantilla" };

  await supabase.from("template_exercises").insert(
    exercises.map((ex, i) => ({
      template_id: tpl.id,
      name: ex.name.trim(), sets: ex.sets, reps: ex.reps.trim(),
      rest_seconds: ex.rest_seconds || null,
      youtube_url: ex.youtube_url.trim() || null,
      technical_note: ex.technical_note.trim() || null,
      sort_order: i,
    }))
  );

  revalidatePath("/dashboard/templates");
  redirect("/dashboard/templates");
}

export async function updateTemplateAction(
  id: string, name: string, description: string, exercises: ExDraft[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: tErr } = await supabase
    .from("session_templates")
    .update({ name: name.trim(), description: description.trim() || null })
    .eq("id", id).eq("trainer_id", user.id);

  if (tErr) return { error: "Error al actualizar la plantilla" };

  await supabase.from("template_exercises").delete().eq("template_id", id);
  await supabase.from("template_exercises").insert(
    exercises.map((ex, i) => ({
      template_id: id,
      name: ex.name.trim(), sets: ex.sets, reps: ex.reps.trim(),
      rest_seconds: ex.rest_seconds || null,
      youtube_url: ex.youtube_url.trim() || null,
      technical_note: ex.technical_note.trim() || null,
      sort_order: i,
    }))
  );

  revalidatePath("/dashboard/templates");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("session_templates").delete().eq("id", id).eq("trainer_id", user.id);
  revalidatePath("/dashboard/templates");
  return { success: true };
}

export async function duplicateTemplateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: orig } = await supabase
    .from("session_templates")
    .select("*, template_exercises(*)")
    .eq("id", id).eq("trainer_id", user.id).single();

  if (!orig) return { error: "Plantilla no encontrada" };

  const { data: copy, error: cErr } = await supabase
    .from("session_templates")
    .insert({ trainer_id: user.id, name: `${orig.name} (copia)`, description: orig.description })
    .select().single();

  if (cErr || !copy) return { error: "Error al duplicar" };

  const exes = (orig.template_exercises ?? []).map((ex: any) => ({
    template_id: copy.id, name: ex.name, sets: ex.sets, reps: ex.reps,
    rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
    technical_note: ex.technical_note, sort_order: ex.sort_order,
  }));

  if (exes.length > 0) await supabase.from("template_exercises").insert(exes);
  revalidatePath("/dashboard/templates");
  return { success: true };
}

export async function saveSessionAsTemplateAction(
  sessionId: string, name: string, description: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: exercises } = await supabase
    .from("exercises").select("*").eq("session_id", sessionId).order("sort_order");

  if (!exercises) return { error: "No se encontraron ejercicios" };

  const { data: tpl, error: tErr } = await supabase
    .from("session_templates")
    .insert({ trainer_id: user.id, name: name.trim(), description: description.trim() || null })
    .select().single();

  if (tErr || !tpl) return { error: "Error al guardar como plantilla" };

  await supabase.from("template_exercises").insert(
    exercises.map((ex, i) => ({
      template_id: tpl.id, name: ex.name, sets: ex.sets, reps: ex.reps,
      rest_seconds: ex.rest_seconds, youtube_url: ex.youtube_url,
      technical_note: ex.technical_note, sort_order: i,
    }))
  );

  return { success: true };
}
