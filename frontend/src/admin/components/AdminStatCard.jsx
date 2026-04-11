import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

export default function AdminStatCard({ label, value, subtitle, icon: Icon, trend, trendLabel, accentColor, onClick, highlight }) {
  const [hovered, setHovered] = React.useState(false);
  const accent = accentColor || "var(--eco-primary-500, #22C55E)";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--eco-card, #fff)",
        border: highlight
          ? "1px solid var(--eco-danger, rgba(239,68,68,.35))"
          : "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
        padding: "20px 22px 18px",
        display: "flex", flexDirection: "column", gap: 10,
        position: "relative", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "all .2s ease",
        transform: hovered && onClick ? "translateY(-2px)" : "none",
        boxShadow: highlight
          ? "0 0 0 1px var(--eco-danger, rgba(239,68,68,.12)), 0 2px 8px rgba(239,68,68,.08)"
          : hovered && onClick
            ? "var(--eco-shadow-md)"
            : "var(--eco-shadow-sm)",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accent, opacity: highlight ? 1 : .7, borderRadius: "12px 12px 0 0",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontFamily: fb, fontSize: 12, fontWeight: 500,
          color: "var(--eco-text-soft, #64748B)",
          textTransform: "uppercase", letterSpacing: ".06em",
        }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "var(--eco-card-muted, rgba(34,197,94,.06))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={17} color={accent} strokeWidth={2} />
          </div>
        )}
      </div>

      <span style={{
        fontFamily: fm, fontSize: 28, fontWeight: 700,
        color: "var(--eco-text, #1E293B)", lineHeight: 1.1,
      }}>
        {value}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {trend !== undefined && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontFamily: fm, fontSize: 11, fontWeight: 600,
            color: trend >= 0 ? "var(--eco-success, #16A34A)" : "var(--eco-danger, #DC2626)",
          }}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
        {(subtitle || trendLabel) && (
          <span style={{
            fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #64748B)",
          }}>
            {subtitle || trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}
