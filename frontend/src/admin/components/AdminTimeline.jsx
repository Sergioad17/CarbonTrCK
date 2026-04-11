import React from "react";
import {
  Shield, Calendar, Zap, Building2, Database, FlaskConical,
  FileText, Network, User, Clock,
} from "lucide-react";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const ICON_MAP = {
  shield: Shield, calendar: Calendar, zap: Zap, building: Building2,
  database: Database, beaker: FlaskConical, file: FileText,
  sitemap: Network, user: User, default: Clock,
};

function fmtTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3.6e6;
  if (diffH < 1) return `hace ${Math.max(1, Math.round(diffMs / 6e4))} min`;
  if (diffH < 24) return `hace ${Math.round(diffH)} h`;
  if (diffH < 48) return "ayer";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function AdminTimeline({ items = [], maxItems = 8, title = "Actividad reciente" }) {
  const visible = items.slice(0, maxItems);
  return (
    <div style={{
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--eco-border, #E2E8F0)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Clock size={15} color="var(--eco-primary-500, #22C55E)" />
        <span style={{
          fontFamily: fb, fontSize: 13, fontWeight: 600,
          color: "var(--eco-text, #1E293B)",
          textTransform: "uppercase", letterSpacing: ".04em",
        }}>
          {title}
        </span>
      </div>

      <div style={{ padding: "8px 0" }}>
        {visible.map((item, i) => {
          const Icon = ICON_MAP[item.icon] || ICON_MAP.default;
          return (
            <div key={item.id || i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 20px",
              transition: "background .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Icon + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "var(--eco-primary-50, rgba(34,197,94,.08))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={13} color="var(--eco-primary-500, #22C55E)" />
                </div>
                {i < visible.length - 1 && (
                  <div style={{
                    width: 1, flex: 1, minHeight: 12,
                    background: "var(--eco-border, #E2E8F0)",
                    marginTop: 4,
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: fb, fontSize: 13, fontWeight: 500,
                  color: "var(--eco-text, #1E293B)", lineHeight: 1.4,
                }}>
                  <strong style={{ fontWeight: 600 }}>{item.user}</strong>{" "}
                  <span style={{ fontWeight: 400 }}>{item.action}</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginTop: 3,
                }}>
                  <span style={{
                    fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)",
                  }}>
                    {item.module}
                  </span>
                  <span style={{
                    fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft, #94A3B8)",
                  }}>
                    {fmtTime(item.ts)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
