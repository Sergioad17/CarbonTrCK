import React from "react";
import { Lock } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export default function AdminEmptyState({
  icon: Icon = Lock,
  title = "Próximamente",
  description = "Este módulo estará disponible en una próxima actualización.",
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: compact ? "40px 24px" : "60px 32px",
      textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "var(--eco-gray-100, #F1F5F9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <Icon size={24} color="var(--eco-text-soft, #94A3B8)" strokeWidth={1.5} />
      </div>
      <div style={{
        fontFamily: fd, fontSize: 15, fontWeight: 700,
        color: "var(--eco-text, #1E293B)", marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: fb, fontSize: 13,
        color: "var(--eco-text-soft, #64748B)",
        maxWidth: 340, lineHeight: 1.5,
      }}>
        {description}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 18, padding: "8px 20px",
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "#fff", background: "var(--eco-primary-500, #22C55E)",
            border: "none", borderRadius: 8, cursor: "pointer",
            transition: "opacity .15s",
          }}
          onMouseEnter={e => e.target.style.opacity = ".85"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
