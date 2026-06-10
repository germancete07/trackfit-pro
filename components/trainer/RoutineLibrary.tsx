"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { deleteTemplateAction, duplicateTemplateAction } from "@/app/dashboard/templates/actions";
import { deleteCategoryAction, renameCategoryAction, createCategoryAction, moveRoutineToCategoryAction } from "@/app/dashboard/routines/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuickAssignModal } from "@/components/trainer/QuickAssignModal";
import type { SessionTemplate, TemplateExercise, RoutineCategory, RoutineDay } from "@/lib/types";

type RoutineFull = SessionTemplate & {
  template_exercises?: TemplateExercise[];
  routine_days?: (RoutineDay & { template_exercises?: TemplateExercise[] })[];
};
type Student = { id: string; full_name: string; preferred_training_days: number[] };

const COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

const TRAINING_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  adaptacion:  { label: "Adaptación",  color: "#16a34a", bg: "#dcfce7" },
  fuerza:      { label: "Fuerza",      color: "#b45309", bg: "#fef3c7" },
  hipertrofia: { label: "Hipertrofia", color: "#7c3aed", bg: "#ede9fe" },
  resistencia: { label: "Resistencia", color: "#0369a1", bg: "#e0f2fe" },
  funcional:   { label: "Funcional",   color: "#0f766e", bg: "#ccfbf1" },
  otro:        { label: "Otro",        color: "#6b7280", bg: "#f3f4f6" },
};

interface Props {
  routines: RoutineFull[];
  categories: RoutineCategory[];
  students: Student[];
  categoryId?: string;
  newRoutineHref: string;
  preselectedStudentId?: string;
  activeCounts?: Record<string, number>;
}

export function RoutineLibrary({ routines, categories, students, categoryId, newRoutineHref, preselectedStudentId, activeCounts = {} }: Props) {
  const { showToast } = useToast();
  const [localRoutines, setLocalRoutines] = useState(routines);
  const [localCategories, setLocalCategories] = useState(categories);
  const [loading, setLoading] = useState<string | null>(null);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(COLORS[0]);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ templateId: string; templateName: string } | null>(null);

  const displayRoutines = categoryId
    ? localRoutines.filter((r) => r.category_id === categoryId)
    : localRoutines.filter((r) => !r.category_id);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta rutina?")) return;
    setLoading(id + "-del");
    const result = await deleteTemplateAction(id);
    setLoading(null);
    if (result?.error) { showToast(result.error, "error"); return; }
    setLocalRoutines((p) => p.filter((r) => r.id !== id));
    showToast("Rutina eliminada");
  }

  async function handleDuplicate(routine: RoutineFull) {
    setLoading(routine.id + "-dup");
    const result = await duplicateTemplateAction(routine.id);
    setLoading(null);
    if (result?.error) { showToast(result.error, "error"); return; }
    const newTemplate = (result as any).template;
    if (newTemplate) {
      setLocalRoutines((p) => [newTemplate, ...p]);
      setAssignModal({ templateId: newTemplate.id, templateName: newTemplate.name });
    } else {
      showToast("Rutina duplicada");
      window.location.reload();
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm("¿Eliminar esta carpeta? Las rutinas que contenga quedarán sin carpeta.")) return;
    setLoading("folder-" + id);
    await deleteCategoryAction(id);
    setLocalCategories((p) => p.filter((c) => c.id !== id));
    setLocalRoutines((p) => p.map((r) => r.category_id === id ? { ...r, category_id: null } : r));
    setLoading(null);
    showToast("Carpeta eliminada");
  }

  async function handleRenameFolder(id: string) {
    if (!renameName.trim()) return;
    await renameCategoryAction(id, renameName);
    setLocalCategories((p) => p.map((c) => c.id === id ? { ...c, name: renameName.trim() } : c));
    setRenameId(null);
    showToast("Carpeta renombrada");
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const result = await createCategoryAction(newFolderName.trim(), newFolderColor);
    setCreatingFolder(false);
    if (result?.error) { showToast(result.error, "error"); return; }
    showToast("Carpeta creada");
    setShowNewFolder(false);
    setNewFolderName("");
    window.location.reload();
  }

  async function handleMove(routineId: string, catId: string | null) {
    await moveRoutineToCategoryAction(routineId, catId);
    setLocalRoutines((p) => p.map((r) => r.id === routineId ? { ...r, category_id: catId } : r));
    setMoveTarget(null);
    showToast("Rutina movida");
  }

  return (
    <>
      {assignModal && students.length > 0 && (
        <QuickAssignModal
          templateId={assignModal.templateId}
          templateName={assignModal.templateName}
          students={students}
          onClose={() => setAssignModal(null)}
          initialStudentId={preselectedStudentId}
          lockStudent={!!preselectedStudentId}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* Folders */}
        {!categoryId && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Carpetas</h2>
              <button
                onClick={() => setShowNewFolder(true)}
                className="text-xs text-brand-500 font-semibold hover:underline"
              >+ Nueva carpeta</button>
            </div>

            {showNewFolder && (
              <Card padding="sm" className="border-brand-200 bg-brand-50/50">
                <div className="flex flex-col gap-3">
                  <input
                    autoFocus
                    placeholder="Nombre de la carpeta"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    className="h-10 w-full rounded-xl border border-brand-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewFolderColor(c)}
                        className="h-7 w-7 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: newFolderColor === c ? "#1e1b4b" : "transparent" }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={creatingFolder} onClick={handleCreateFolder} className="flex-1">Crear</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>Cancelar</Button>
                  </div>
                </div>
              </Card>
            )}

            {localCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {localCategories.map((cat) => (
                  <div key={cat.id} className="relative group">
                    {renameId === cat.id ? (
                      <Card padding="sm" className="flex flex-col gap-2" style={{ borderLeft: `4px solid ${cat.color}` }}>
                        <input
                          autoFocus
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameFolder(cat.id); if (e.key === "Escape") setRenameId(null); }}
                          className="h-8 w-full rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleRenameFolder(cat.id)} className="flex-1 text-xs py-1">OK</Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenameId(null)} className="text-xs py-1">✕</Button>
                        </div>
                      </Card>
                    ) : (
                      <Link href={`/dashboard/routines/folder/${cat.id}`}>
                        <Card padding="sm" className="cursor-pointer hover:shadow-md transition-all" style={{ borderLeft: `4px solid ${cat.color}` }}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: cat.color }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                                <p className="text-sm font-bold text-gray-900 truncate">{cat.name}</p>
                              </div>
                              {(() => {
                                const catRoutines = localRoutines.filter((r) => r.category_id === cat.id);
                                const preview = catRoutines.slice(0, 2).map(r => r.name);
                                const extra = catRoutines.length - preview.length;
                                return (
                                  <>
                                    <p className="text-xs text-gray-400">
                                      {catRoutines.length} rutina{catRoutines.length !== 1 ? "s" : ""}
                                    </p>
                                    {preview.length > 0 && (
                                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                        {preview.join(" · ")}{extra > 0 ? ` · +${extra} más` : ""}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                              <button
                                onClick={(e) => { e.preventDefault(); setRenameId(cat.id); setRenameName(cat.name); }}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); handleDeleteFolder(cat.id); }}
                                className="p-1 text-gray-400 hover:text-red-500 rounded"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !showNewFolder && (
                <p className="text-sm text-gray-400 text-center py-3">
                  Creá carpetas para organizar tus rutinas (ej: Adaptación, Fuerza, Hipertrofia)
                </p>
              )
            )}
          </section>
        )}

        {/* Routines list */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            {categoryId ? "Rutinas en esta carpeta" : "Rutinas sin carpeta"}
          </h2>

          {displayRoutines.length === 0 ? (
            <EmptyState
              illustration="sessions"
              title="Sin rutinas aun"
              description={categoryId ? "Creá una rutina dentro de esta carpeta." : "Creá tu primera rutina para empezar a asignarla a tus alumnos."}
              action={{ label: "Nueva rutina", href: newRoutineHref }}
            />
          ) : (
            displayRoutines.map((r) => <RoutineCard
              key={r.id}
              routine={r}
              categories={localCategories}
              categoryId={categoryId}
              moveTarget={moveTarget}
              loading={loading}
              students={students}
              activeCount={activeCounts[r.id] ?? 0}
              onAssign={() => setAssignModal({ templateId: r.id, templateName: r.name })}
              onDuplicate={() => handleDuplicate(r)}
              onDelete={() => handleDelete(r.id)}
              onMove={(catId) => handleMove(r.id, catId)}
              onToggleMove={() => setMoveTarget(moveTarget === r.id ? null : r.id)}
              onRename={() => { setRenameId(null); }}
            />)
          )}
        </section>
      </div>
    </>
  );
}

// ── RoutineCard ───────────────────────────────────────────────────────────────

interface CardProps {
  routine: RoutineFull;
  categories: RoutineCategory[];
  categoryId?: string;
  moveTarget: string | null;
  loading: string | null;
  students: Student[];
  activeCount: number;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (catId: string | null) => void;
  onToggleMove: () => void;
  onRename: () => void;
}

function RoutineCard({ routine: r, categories, categoryId, moveTarget, loading, students, activeCount, onAssign, onDuplicate, onDelete, onMove, onToggleMove }: CardProps) {
  const typeInfo = r.training_type ? TRAINING_TYPE_LABELS[r.training_type] : null;

  // Build days list from routine_days (or fall back to a synthetic Día 1 from template_exercises)
  const sortedDays = (r.routine_days ?? []).slice().sort((a, b) => a.day_number - b.day_number);

  // Stats
  const totalExercises = sortedDays.reduce((sum, d) => sum + (d.template_exercises?.length ?? 0), 0)
    || (r.template_exercises?.length ?? 0);
  const allExercises = sortedDays.flatMap(d => d.template_exercises ?? []);
  const uniqueGroups = new Set(allExercises.filter(ex => ex.superset_group).map(ex => ex.superset_group)).size;

  return (
    <Card padding="md" className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 truncate">{r.name}</p>
            {typeInfo && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: typeInfo.color, background: typeInfo.bg }}
              >
                {typeInfo.label}
              </span>
            )}
          </div>
          {r.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.description}</p>}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Move to folder */}
          {!categoryId && categories.length > 0 && (
            <div className="relative">
              <button
                onClick={onToggleMove}
                className="text-xs text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                title="Mover a carpeta"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </button>
              {moveTarget === r.id && (
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => onMove(cat.id)}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Move out of folder */}
          {categoryId && (
            <button
              onClick={() => onMove(null)}
              className="text-xs text-gray-400 hover:text-gray-600 rounded p-1.5 hover:bg-gray-100"
              title="Quitar de carpeta"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        {sortedDays.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 inline-block" />
            {sortedDays.length} día{sortedDays.length !== 1 ? "s" : ""}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" />
          {totalExercises} ejercicio{totalExercises !== 1 ? "s" : ""}
        </span>
        {uniqueGroups > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 inline-block" />
            {uniqueGroups} bloque{uniqueGroups !== 1 ? "s" : ""}
          </span>
        )}
        {activeCount > 0 && (
          <span className="flex items-center gap-1 ml-auto">
            <svg className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="text-green-600 font-semibold">{activeCount} activo{activeCount !== 1 ? "s" : ""}</span>
          </span>
        )}
      </div>

      {/* Days breakdown */}
      {sortedDays.length > 0 && (
        <div className="flex flex-col gap-2">
          {sortedDays.map((day) => {
            const exs = (day.template_exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
            const shown = exs.slice(0, 3);
            const extra = exs.length - shown.length;
            return (
              <div key={day.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    {day.name || `Día ${day.day_number}`}
                  </span>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{exs.length} ej.</span>
                </div>
                {shown.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-7">
                    {shown.map((ex) => (
                      <span key={ex.id} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                        {ex.name} {ex.sets}×{ex.reps}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="text-[11px] bg-gray-50 text-gray-400 rounded-full px-2 py-0.5 font-medium border border-gray-200">
                        +{extra} más
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        {students.length > 0 && (
          <Button size="sm" className="flex-1" onClick={onAssign}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Asignar
          </Button>
        )}
        <Link href={`/dashboard/templates/${r.id}/edit`}>
          <Button variant="secondary" size="sm">Editar</Button>
        </Link>
        <Button
          variant="secondary" size="sm"
          loading={loading === r.id + "-dup"}
          onClick={onDuplicate}
          title="Duplicar rutina"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        </Button>
        <Button
          variant="ghost" size="sm"
          loading={loading === r.id + "-del"}
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 hover:bg-red-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </Button>
      </div>
    </Card>
  );
}
