import React from "react";

const fm = "var(--eco-font-mono)";
const fd = "var(--eco-font-display)";

const BADGE_STYLES = {
  success:  { bg: "var(--eco-success-bg, rgba(34,197,94,.10))",  text: "var(--eco-success, #16A34A)", border: "rgba(34,197,94,.20)"  },
  warning:  { bg: "var(--eco-warning-bg, rgba(234,179,8,.10))",  text: "var(--eco-warning, #CA8A04)", border: "rgba(234,179,8,.20)"  },
  error:    { bg: "var(--eco-danger-bg, rgba(239,68,68,.10))",   text: "var(--eco-danger, #DC2626)",  border: "rgba(239,68,68,.20)"  },
  info:     { bg: "var(--eco-info-bg, rgba(37,99,235,.10))",     text: "var(--eco-info, #2563EB)",    border: "rgba(37,99,235,.20)"  },
  neutral:  { bg: "var(--eco-card-muted, #F1F5F9)",              text: "var(--eco-text-soft, #64748B)", border: "var(--eco-border, #E2E8F0)" },
  online:   { bg: "var(--eco-success-bg, rgba(34,197,94,.10))",  text: "var(--eco-success, #16A34A)", border: "rgba(34,197,94,.20)"  },
  offline:  { bg: "var(--eco-danger-bg, rgba(239,68,68,.10))",   text: "var(--eco-danger, #DC2626)",  border: "rgba(239,68,68,.20)"  },
  critical: { bg: "var(--eco-danger-bg, rgba(239,68,68,.10))",   text: "var(--eco-danger, #DC2626)",  border: "rgba(239,68,68,.20)"  },
  high:     { bg: "var(--eco-danger-bg, rgba(239,68,68,.10))",   text: "var(--eco-danger, #DC2626)",  border: "rgba(239,68,68,.20)"  },
  medium:   { bg: "var(--eco-warning-bg, rgba(234,179,8,.10))",  text: "var(--eco-warning, #CA8A04)", border: "rgba(234,179,8,.20)"  },
  low:      { bg: "var(--eco-info-bg, rgba(37,99,235,.10))",     text: "var(--eco-info, #2563EB)",    border: "rgba(37,99,235,.20)"  },
  pending:  { bg: "var(--eco-warning-bg, rgba(234,179,8,.10))",  text: "var(--eco-warning, #CA8A04)", border: "rgba(234,179,8,.20)"  },
};

const LABELS = {
  success: "Exitoso", warning: "Advertencia", error: "Error", info: "Info",
  online: "En línea", offline: "Sin conexión", critical: "Crítico",
  high: "Alto", medium: "Medio", low: "Bajo", pending: "Pendiente",
};

export default function AdminStatusBadge({ variant = "neutral", label, mono, dot, style }) {
  const s = BADGE_STYLES[variant] || BADGE_STYLES.neutral;
  const displayLabel = label || LABELS[variant] || variant;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20,
      background: s.bg, color: s.text,
      border: `1px solid ${s.border}`,
      fontFamily: mono ? fm : fd,
      fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
      lineHeight: "20px", whiteSpace: "nowrap",
      ...style,
    }}>
      {dot !== false && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: s.text, flexShrink: 0,
        }} />
      )}
      {displayLabel}
    </span>
  );
}
