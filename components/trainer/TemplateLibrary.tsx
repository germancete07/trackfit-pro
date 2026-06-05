"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { deleteTemplateAction, duplicateTemplateAction } from "@/app/dashboard/templates/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SessionTemplate, TemplateExercise } from "@/lib/types";

type TemplateFull = SessionTemplate & { template_exercises: TemplateExercise[] };

export function TemplateLibrary({ initial }: { initial: TemplateFull[] }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    setLoading(id + "-del");
    await deleteTemplateAction(id);
    setTemplates((p) => p.filter((t) => t.id !== id));
    setLoading(null);
    showToast("Plantilla eliminada");
  }

  async function handleDuplicate(id: string) {
    setLoading(id + "-dup");
    const result = await duplicateTemplateAction(id);
    setLoading(null);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast("Plantilla duplicada — recargá la página para verla");
      window.location.reload();
    }
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        illustration="sessions"
        title="Sin plantillas aun"
        description="Crea tu primera plantilla para reutilizar bloques de entrenamiento."
        action={{ label: "Nueva plantilla", href: "/dashboard/templates/new" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => (
        <Card key={t.id} padding="md" className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{t.name}</h3>
              {t.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
              )}
              <p className="text-xs text-brand-500 font-semibold mt-1">
                {t.template_exercises.length} ejercicio{t.template_exercises.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {t.template_exercises.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.template_exercises
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((ex) => (
                  <span key={ex.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 font-medium">
                    {ex.name} {ex.sets}×{ex.reps}
                  </span>
                ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Link href={`/dashboard/templates/${t.id}/edit`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">Editar</Button>
            </Link>
            <Button
              variant="secondary" size="sm"
              loading={loading === t.id + "-dup"}
              onClick={() => handleDuplicate(t.id)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
              Duplicar
            </Button>
            <Button
              variant="ghost" size="sm"
              loading={loading === t.id + "-del"}
              onClick={() => handleDelete(t.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
