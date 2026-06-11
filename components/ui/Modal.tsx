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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  const bg = panelBackground ?? "var(--surface-elevated, #fff)";

  return createPortal(
    <>
      <style>{`
        .tf-modal-overlay-${zIndex} {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: ${zIndex};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .tf-modal-container-${zIndex} {
          border-radius: 16px;
          width: 100%;
          max-width: ${maxWidth}px;
          max-height: calc(100vh - 32px);
          display: flex;
          flex-direction: column;
          position: relative;
          margin: auto;
          box-shadow: 0 8px 40px rgba(0,0,0,0.22);
        }
        .tf-modal-header-${zIndex} {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          flex-shrink: 0;
          position: sticky;
          top: 0;
          border-radius: 16px 16px 0 0;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tf-modal-body-${zIndex} {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1;
        }
        .tf-modal-footer-${zIndex} {
          padding: 12px 20px;
          border-top: 1px solid rgba(0,0,0,0.07);
          flex-shrink: 0;
          border-radius: 0 0 16px 16px;
        }
        @media (max-width: 639px) {
          .tf-modal-overlay-${zIndex} {
            align-items: flex-end;
            padding: 0;
          }
          .tf-modal-container-${zIndex} {
            border-radius: 16px 16px 0 0;
            max-height: 90vh;
          }
          .tf-modal-header-${zIndex} {
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>

      <div
        className={`tf-modal-overlay-${zIndex}`}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <div
          className={`tf-modal-container-${zIndex}`}
          style={{ background: bg }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || onClose || headerExtra) && (
            <div
              className={`tf-modal-header-${zIndex}`}
              style={{ background: bg }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {title && (
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {title}
                  </p>
                )}
                {subtitle && (
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {subtitle}
                  </p>
                )}
              </div>

              {headerExtra}

              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    flexShrink: 0, height: 32, width: 32, borderRadius: 9999,
                    border: "none", background: "rgba(0,0,0,0.06)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280",
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className={`tf-modal-body-${zIndex}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className={`tf-modal-footer-${zIndex}`}
              style={{ background: bg }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
