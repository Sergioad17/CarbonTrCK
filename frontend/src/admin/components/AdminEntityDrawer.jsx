import React from "react";
import { X } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export default function AdminEntityDrawer({
  open, onClose, title, subtitle, badge, children, width = 440, actions,
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 90,
        background: "rgba(15,23,42,.3)",
        backdropFilter: "blur(2px)",
        animation: "adminFadeIn .15s ease-out",
      }} />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 91,
        width: `min(${width}px, calc(100vw - 20px))`,
        background: "var(--eco-card, #fff)",
        borderLeft: "1px solid var(--eco-border, #E2E8F0)",
        boxShadow: "-8px 0 30px rgba(0,0,0,.1)",
        display: "flex", flexDirection: "column",
        animation: "adminDrawerIn .22s cubic-bezier(.2,.8,.2,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--eco-border, #E2E8F0)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{
                fontFamily: fd, fontSize: 16, fontWeight: 800,
                color: "var(--eco-text, #1E293B)", margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{title}</h2>
              {badge}
            </div>
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
            flexShrink: 0, transition: "all .12s",
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
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          {children}
        </div>

        {/* Footer actions */}
        {actions && (
          <div style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--eco-border, #E2E8F0)",
            display: "flex", gap: 8, flexWrap: "wrap",
            flexShrink: 0,
          }}>
            {actions}
          </div>
        )}
      </div>

    </>
  );
}

/* ── Drawer field row helper ─────────────────────────────────────────── */
export function DrawerField({ label, children, mono }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{
        fontFamily: fb, fontSize: 11, fontWeight: 600,
        color: "var(--eco-text-soft, #94A3B8)",
        textTransform: "uppercase", letterSpacing: ".05em",
      }}>{label}</span>
      <span style={{
        fontFamily: mono ? "var(--eco-font-mono)" : fb,
        fontSize: 13, color: "var(--eco-text, #1E293B)",
        lineHeight: 1.5,
      }}>
        {children || <span style={{ opacity: .4 }}>—</span>}
      </span>
    </div>
  );
}
