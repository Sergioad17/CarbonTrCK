import React from "react";
import { X, Save } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export default function AdminFormModal({
  open, onClose, title, subtitle, children, onSave, saving, width = 560,
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(15,23,42,.45)",
          backdropFilter: "blur(3px)",
          animation: "adminFadeIn .18s ease-out",
        }}
      />
      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 101,
        width: `min(${width}px, calc(100vw - 32px))`,
        maxHeight: "calc(100vh - 48px)",
        display: "flex", flexDirection: "column",
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        animation: "adminFadeIn .22s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--eco-border, #E2E8F0)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              fontFamily: fd, fontSize: 17, fontWeight: 800,
              color: "var(--eco-text, #1E293B)", margin: 0,
            }}>{title}</h2>
            {subtitle && (
              <p style={{
                fontFamily: fb, fontSize: 12,
                color: "var(--eco-text-soft, #64748B)",
                margin: "3px 0 0",
              }}>{subtitle}</p>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            border: "1px solid var(--eco-border, #E2E8F0)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--eco-text-soft, #94A3B8)",
            transition: "all .12s", flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "18px 22px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {children}
        </div>

        {/* Footer */}
        {onSave && (
          <div style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--eco-border, #E2E8F0)",
            display: "flex", justifyContent: "flex-end", gap: 10,
            flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              fontFamily: fb, fontSize: 13, fontWeight: 500,
              color: "var(--eco-text, #1E293B)", cursor: "pointer",
              transition: "all .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--eco-card, #fff)"}
            >
              Cancelar
            </button>
            <button onClick={onSave} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: saving ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: saving ? "wait" : "pointer",
              transition: "all .12s",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--eco-primary-600, #16A34A)"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "var(--eco-primary-500, #22C55E)"; }}
            >
              <Save size={13} /> {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
