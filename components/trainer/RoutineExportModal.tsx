"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { SessionTemplate, TemplateExercise, RoutineDay } from "@/lib/types";

type RoutineFull = SessionTemplate & {
  template_exercises?: TemplateExercise[];
  routine_days?: (RoutineDay & { template_exercises?: TemplateExercise[] })[];
};

interface Props {
  routine: RoutineFull;
  trainerName: string;
  onClose: () => void;
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  adaptacion: "Adaptación", fuerza: "Fuerza", hipertrofia: "Hipertrofia",
  resistencia: "Resistencia", funcional: "Funcional", otro: "Otro",
};

function formatDate(): string {
  return new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function fmtRest(seconds: number | null): string {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}″`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}′${s}″` : `${m}′`;
}

// ── PDF content (white bg) ────────────────────────────────────────────────────
function PdfContent({ routine, trainerName }: { routine: RoutineFull; trainerName: string }) {
  const typeLabel = routine.training_type ? TRAINING_TYPE_LABELS[routine.training_type] : null;
  const days = (routine.routine_days ?? []).slice().sort((a, b) => a.day_number - b.day_number);
  const hasMultiDay = days.length > 0;

  const allExercises: (TemplateExercise & { dayLabel?: string })[] = hasMultiDay
    ? days.flatMap(d =>
        (d.template_exercises ?? [])
          .slice().sort((a, b) => a.sort_order - b.sort_order)
          .map(ex => ({ ...ex, dayLabel: d.name || `Día ${d.day_number}` }))
      )
    : (routine.template_exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div style={{
      width: 480,
      background: "#ffffff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "36px 32px 32px",
      color: "#111827",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 900, letterSpacing: -0.5 }}>TF</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#534AB7", lineHeight: 1 }}>TrackFit Pro</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{trainerName}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#E5E7EB", marginBottom: 20 }} />

      {/* Routine name */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#111827", lineHeight: 1.2 }}>{routine.name}</div>
        {typeLabel && (
          <span style={{
            display: "inline-block", marginTop: 6,
            fontSize: 11, fontWeight: 700, color: "#534AB7",
            background: "#EDE9FE", padding: "2px 10px", borderRadius: 20,
          }}>{typeLabel}</span>
        )}
        {routine.description && (
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8, lineHeight: 1.5 }}>{routine.description}</div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 24 }}>Generado el {formatDate()}</div>

      {/* Exercises by day */}
      {hasMultiDay ? (
        days.map(d => {
          const exs = (d.template_exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={d.id} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 12, fontWeight: 800, color: "#534AB7",
                background: "#F5F3FF", padding: "5px 12px", borderRadius: 8,
                marginBottom: 10, letterSpacing: 0.3,
              }}>
                {d.name || `Día ${d.day_number}`}
              </div>
              {exs.map((ex, idx) => (
                <ExerciseRow key={ex.id} ex={ex} idx={idx} dark={false} />
              ))}
            </div>
          );
        })
      ) : (
        <div>
          {allExercises.map((ex, idx) => (
            <ExerciseRow key={ex.id} ex={ex} idx={idx} dark={false} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
        <div style={{ fontSize: 10, color: "#D1D5DB", textAlign: "center" }}>Generado con TrackFit Pro</div>
      </div>
    </div>
  );
}

// ── Image content (gradient bg) ───────────────────────────────────────────────
function ImageContent({ routine, trainerName }: { routine: RoutineFull; trainerName: string }) {
  const typeLabel = routine.training_type ? TRAINING_TYPE_LABELS[routine.training_type] : null;
  const days = (routine.routine_days ?? []).slice().sort((a, b) => a.day_number - b.day_number);
  const hasMultiDay = days.length > 0;

  return (
    <div style={{
      width: 480,
      background: "linear-gradient(150deg, #534AB7 0%, #7C3AED 60%, #312e81 100%)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "36px 32px 40px",
      color: "#ffffff",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "rgba(255,255,255,0.15)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: -0.5 }}>TF</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", lineHeight: 1 }}>TrackFit Pro</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{trainerName}</div>
        </div>
      </div>

      {/* Routine name */}
      <div style={{
        background: "rgba(255,255,255,0.10)",
        borderRadius: 16, padding: "16px 20px", marginBottom: 20,
        border: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{routine.name}</div>
        {typeLabel && (
          <span style={{
            display: "inline-block", marginTop: 8,
            fontSize: 11, fontWeight: 700, color: "#fff",
            background: "rgba(255,255,255,0.20)",
            padding: "3px 10px", borderRadius: 20,
          }}>{typeLabel}</span>
        )}
        {routine.description && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 8, lineHeight: 1.5 }}>{routine.description}</div>
        )}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>{formatDate()}</div>
      </div>

      {/* Days */}
      {hasMultiDay ? (
        days.map(d => {
          const exs = (d.template_exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={d.id} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.9)",
                background: "rgba(255,255,255,0.12)",
                padding: "4px 12px", borderRadius: 8, marginBottom: 8,
                display: "inline-block", letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                {d.name || `Día ${d.day_number}`}
              </div>
              {exs.map((ex, idx) => (
                <ExerciseRow key={ex.id} ex={ex} idx={idx} dark={true} />
              ))}
            </div>
          );
        })
      ) : (
        (routine.template_exercises ?? [])
          .slice().sort((a, b) => a.sort_order - b.sort_order)
          .map((ex, idx) => <ExerciseRow key={ex.id} ex={ex} idx={idx} dark={true} />)
      )}

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
        Generado con TrackFit Pro
      </div>
    </div>
  );
}

function ExerciseRow({ ex, idx, dark }: { ex: TemplateExercise; idx: number; dark: boolean }) {
  const textMain = dark ? "rgba(255,255,255,0.95)" : "#111827";
  const textMeta = dark ? "rgba(255,255,255,0.55)" : "#6B7280";
  const bg = dark ? "rgba(255,255,255,0.07)" : (idx % 2 === 0 ? "#F9FAFB" : "#fff");
  const border = dark ? "rgba(255,255,255,0.08)" : "#F3F4F6";

  const metaParts: string[] = [`${ex.sets} × ${ex.reps}`];
  if (ex.rest_seconds) metaParts.push(fmtRest(ex.rest_seconds) + " desc.");

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8, padding: "8px 12px",
      marginBottom: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: textMain, flex: 1 }}>{ex.name}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: dark ? "rgba(196,181,253,0.9)" : "#534AB7", flexShrink: 0 }}>
          {ex.sets}×{ex.reps}
        </div>
      </div>
      {ex.rest_seconds && (
        <div style={{ fontSize: 11, color: textMeta }}>Descanso: {fmtRest(ex.rest_seconds)}</div>
      )}
      {ex.technical_note && (
        <div style={{ fontSize: 11, color: textMeta, fontStyle: "italic", marginTop: 1 }}>
          📝 {ex.technical_note}
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function RoutineExportModal({ routine, trainerName, onClose }: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  async function exportPdf() {
    if (!pdfRef.current) return;
    setLoadingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let imgW = pageW;
      let imgH = imgW / ratio;
      if (imgH > pageH) { imgH = pageH; imgW = imgH * ratio; }
      pdf.addImage(imgData, "PNG", (pageW - imgW) / 2, 0, imgW, imgH);
      pdf.save(`${routine.name.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("Error generando PDF:", e);
    }
    setLoadingPdf(false);
  }

  async function exportImage() {
    if (!imgRef.current) return;
    setLoadingImg(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(imgRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${routine.name.replace(/\s+/g, "_")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (e) {
      console.error("Error generando imagen:", e);
    }
    setLoadingImg(false);
  }

  return (
    <Modal title="Exportar rutina" onClose={onClose} maxWidth={420}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Elegí el formato para exportar <strong className="text-gray-800">{routine.name}</strong>
        </p>

        {/* PDF option */}
        <button
          onClick={exportPdf}
          disabled={loadingPdf || loadingImg}
          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-brand-300 hover:bg-brand-50/40 transition-all text-left disabled:opacity-50"
        >
          <div className="h-11 w-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Exportar como PDF</p>
              {loadingPdf && <span className="text-xs text-brand-500 animate-pulse">Generando…</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Listo para imprimir o compartir digitalmente</p>
          </div>
          <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Image option */}
        <button
          onClick={exportImage}
          disabled={loadingPdf || loadingImg}
          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-brand-300 hover:bg-brand-50/40 transition-all text-left disabled:opacity-50"
        >
          <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #534AB7, #7C3AED)" }}>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Exportar como imagen</p>
              {loadingImg && <span className="text-xs text-brand-500 animate-pulse">Generando…</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">PNG optimizado para compartir por WhatsApp</p>
          </div>
          <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Hidden render targets — fixed off-screen so html2canvas can read them */}
      <div style={{ position: "fixed", top: -9999, left: -9999, zIndex: -1, pointerEvents: "none" }}>
        <div ref={pdfRef}>
          <PdfContent routine={routine} trainerName={trainerName} />
        </div>
      </div>
      <div style={{ position: "fixed", top: -9999, left: -9000, zIndex: -1, pointerEvents: "none" }}>
        <div ref={imgRef}>
          <ImageContent routine={routine} trainerName={trainerName} />
        </div>
      </div>
    </Modal>
  );
}
