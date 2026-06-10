"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  /** Header title — omit to render no header bar */
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
  /** Sticky footer rendered below the scrollable body */
  footer?: React.ReactNode;
  /** Pixel width cap on desktop. Default 520 */
  maxWidth?: number;
  /** z-index. Default 200 */
  zIndex?: number;
  /** Extra content placed in the header row (next to title, before close btn) */
  headerExtra?: React.ReactNode;
  /** Override panel background color */
  panelBackground?: string;
}

/**
 * Base modal with:
 * - createPortal → renders at document.body, never clipped by parent transforms
 * - Mobile (<640 px): bottom sheet (rounded-t-2xl)
 * - Desktop (≥640 px): centered card (rounded-2xl, max-w-[520px])
 * - Sticky header with title + close button
 * - Scrollable body (overflow-y: auto, max-height: 90vh)
 * - Escape key closes
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 520,
  zIndex = 200,
  headerExtra,
  panelBackground,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <style>{`
        @media (min-width: 640px) {
          .modal-panel {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            bottom: auto !important;
            transform: translate(-50%, -50%) !important;
            border-radius: 16px !important;
            width: calc(100% - 32px) !important;
          }
        }
      `}</style>

      <div
        className="modal-panel"
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: panelBackground ?? "var(--surface-elevated, #fff)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            paddingBottom: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: 4,
              width: 36,
              borderRadius: 9999,
              backgroundColor: panelBackground ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
            }}
          />
        </div>

        {/* Sticky header */}
        {(title || onClose) && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px 12px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              backgroundColor: "var(--surface-elevated, #fff)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <p
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </p>
              )}
              {subtitle && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {headerExtra}

            {onClose && (
              <button
                onClick={onClose}
                style={{
                  flexShrink: 0,
                  height: 32,
                  width: 32,
                  borderRadius: 9999,
                  border: "none",
                  background: "rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid rgba(0,0,0,0.06)",
              backgroundColor: "var(--surface-elevated, #fff)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
