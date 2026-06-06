"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import {
  createLibraryExerciseAction,
  updateLibraryExerciseAction,
  deleteLibraryExerciseAction,
  importBaseExercisesAction,
} from "@/app/dashboard/library/actions";
import { cn } from "@/lib/utils";
import type { ExerciseLibraryItem } from "@/lib/types";

const MUSCLE_GROUPS = [
  { value: "pecho", label: "Pecho", color: "#3b82f6" },
  { value: "espalda", label: "Espalda", color: "#8b5cf6" },
  { value: "piernas", label: "Piernas", color: "#10b981" },
  { value: "hombros", label: "Hombros", color: "#f59e0b" },
  { value: "biceps", label: "Bíceps", color: "#ef4444" },
  { value: "triceps", label: "Tríceps", color: "#f97316" },
  { value: "core", label: "Core", color: "#6366f1" },
  { value: "gluteos", label: "Glúteos", color: "#ec4899" },
  { value: "cardio", label: "Cardio", color: "#06b6d4" },
];

const EMPTY_FORM = { name: "", muscle_group: "pecho", description: "", youtube_url: "", image_url: "" };

function getColor(group: string) {
  return MUSCLE_GROUPS.find(m => m.value === group)?.color ?? "#6b7280";
}
function getLabel(group: string) {
  return MUSCLE_GROUPS.find(m => m.value === group)?.label ?? group;
}

interface Props { exercises: ExerciseLibraryItem[]; }

export function ExerciseLibrary({ exercises: initial }: Props) {
  const { showToast } = useToast();
  const [exercises, setExercises] = useState(initial);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    const result = await importBaseExercisesAction();
    setImporting(false);
    if (result?.error) { showToast(result.error, "error"); return; }
    if (result?.added === 0) { showToast("Ya tenés todos los ejercicios base importados"); return; }
    showToast(`${result.added} ejercicios importados`);
    window.location.reload();
  }

  const displayed = exercises.filter(ex => {
    const matchGroup = !filter || ex.muscle_group === filter;
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  function startEdit(ex: ExerciseLibraryItem) {
    setEditId(ex.id);
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group,
      description: ex.description ?? "",
      youtube_url: ex.youtube_url ?? "",
      image_url: ex.image_url ?? "",
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast("Ingresá un nombre", "error"); return; }
    setSaving(true);
    const result = editId
      ? await updateLibraryExerciseAction(editId, form)
      : await createLibraryExerciseAction(form);
    setSaving(false);
    if (result?.error) { showToast(result.error, "error"); return; }
    if (editId) {
      setExercises(prev => prev.map(ex => ex.id === editId ? { ...ex, ...form } : ex));
      showToast("Ejercicio actualizado");
    } else {
      showToast("Ejercicio guardado");
      window.location.reload();
    }
    cancelForm();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ejercicio de la biblioteca?")) return;
    await deleteLibraryExerciseAction(id);
    setExercises(prev => prev.filter(ex => ex.id !== id));
    showToast("Ejercicio eliminado");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 h-10 rounded-xl border border-gray-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button size="sm" variant="secondary" loading={importing} onClick={handleImport} title="Importar 26 ejercicios base">
            Importar base
          </Button>
          <Button size="sm" onClick={() => { cancelForm(); setShowForm(true); }}>
            + Nuevo
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
              !filter ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Todos ({exercises.length})
          </button>
          {MUSCLE_GROUPS.map(mg => {
            const count = exercises.filter(ex => ex.muscle_group === mg.value).length;
            if (count === 0) return null;
            return (
              <button
                key={mg.value}
                onClick={() => setFilter(filter === mg.value ? null : mg.value)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                  filter === mg.value ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
                style={filter === mg.value ? { backgroundColor: mg.color } : {}}
              >
                {mg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <Card padding="md" className="flex flex-col gap-3 border-brand-200 bg-brand-50/30">
          <h3 className="text-sm font-bold text-gray-700">{editId ? "Editar ejercicio" : "Nuevo ejercicio"}</h3>
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Press banca con barra" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Grupo muscular</label>
            <div className="flex gap-1.5 flex-wrap">
              {MUSCLE_GROUPS.map(mg => (
                <button
                  key={mg.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, muscle_group: mg.value }))}
                  className={cn(
                    "text-xs font-bold px-3 py-1.5 rounded-full transition-all",
                    form.muscle_group === mg.value ? "text-white ring-2 ring-offset-1" : "bg-gray-100 text-gray-600"
                  )}
                  style={form.muscle_group === mg.value ? { backgroundColor: mg.color } : {}}
                >
                  {mg.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Descripción / notas técnicas" placeholder="Clave técnica, errores comunes..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Input label="Video YouTube (opcional)" type="url" placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} />
          <Input label="URL de imagen de referencia (opcional)" type="url" placeholder="https://..." value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={handleSave} className="flex-1">Guardar</Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Exercise list */}
      {displayed.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center gap-4">
          {exercises.length === 0 ? (
            <>
              <p className="text-sm text-gray-400">Tu biblioteca está vacía.</p>
              <Button loading={importing} onClick={handleImport} className="gap-2">
                Importar 26 ejercicios base
              </Button>
              <p className="text-xs text-gray-400">Podés editarlos o agregar los tuyos después.</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No hay ejercicios con ese filtro.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(ex => (
            <Card key={ex.id} padding="md" className="flex flex-col gap-2.5" style={{ borderLeft: `4px solid ${getColor(ex.muscle_group)}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-snug truncate">{ex.name}</p>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ backgroundColor: getColor(ex.muscle_group) + "20", color: getColor(ex.muscle_group) }}
                  >
                    {getLabel(ex.muscle_group)}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(ex)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(ex.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {ex.description && <p className="text-xs text-gray-500 line-clamp-2">{ex.description}</p>}
              {ex.image_url && (
                <img src={ex.image_url} alt={ex.name} className="w-full h-28 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="flex gap-2">
                {ex.youtube_url && (
                  <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-500 font-semibold flex items-center gap-1 hover:underline">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.84 1.56V6.81a4.85 4.85 0 01-1.07-.12z"/></svg>
                    Video
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
