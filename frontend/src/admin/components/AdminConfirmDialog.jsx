import React from "react";
import { AlertTriangle } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export default function AdminConfirmDialog({
  open, onClose, onConfirm, title = "Confirmar acción",
  message = "¿Estás seguro?", confirmLabel = "Confirmar",
  danger = false, loading = false,
}) {
  if (!open) return null;

  const accent = danger ? "var(--eco-danger, #DC2626)" : "var(--eco-primary-500, #22C55E)";
  const accentHover = danger ? "var(--eco-danger, #B91C1C)" : "var(--eco-primary-600, #16A34A)";

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,23,42,.45)", backdropFilter: "blur(3px)",
        animation: "adminFadeIn .18s ease-out",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 101,
        width: "min(420px, calc(100vw - 32px))",
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        animation: "adminFadeIn .22s ease-out",
        padding: "24px 24px 20px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {danger && (
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: "rgba(239,68,68,.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={20} color="var(--eco-danger, #DC2626)" />
            </div>
          )}
          <div>
            <h3 style={{
              fontFamily: fd, fontSize: 16, fontWeight: 700,
              color: "var(--eco-text, #1E293B)", margin: 0,
            }}>{title}</h3>
            <p style={{
              fontFamily: fb, fontSize: 13,
              color: "var(--eco-text-soft, #64748B)",
              margin: "6px 0 0", lineHeight: 1.5,
            }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 8,
            border: "1px solid var(--eco-border, #E2E8F0)",
            background: "var(--eco-card, #fff)",
            fontFamily: fb, fontSize: 13, fontWeight: 500,
            color: "var(--eco-text, #1E293B)", cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: loading ? "var(--eco-gray-300, #CBD5E1)" : accent,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "#fff", cursor: loading ? "wait" : "pointer",
            transition: "all .12s",
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = accentHover; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = accent; }}
          >{loading ? "Procesando..." : confirmLabel}</button>
        </div>
      </div>
    </>
  );
}
