import React from "react";
import { Activity, Wifi, WifiOff, AlertTriangle } from "lucide-react";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const STATUS_MAP = {
  online:  { color: "var(--eco-success, #16A34A)", bg: "var(--eco-success-bg, rgba(34,197,94,.08))", icon: Wifi,          label: "En línea"    },
  warning: { color: "var(--eco-warning, #CA8A04)", bg: "var(--eco-warning-bg, rgba(234,179,8,.08))", icon: AlertTriangle, label: "Advertencia" },
  offline: { color: "var(--eco-danger, #DC2626)",  bg: "var(--eco-danger-bg, rgba(239,68,68,.08))",  icon: WifiOff,       label: "Sin conexión"},
};

export default function AdminHealthCard({ services = [] }) {
  return (
    <div style={{
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--eco-border, #E2E8F0)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Activity size={15} color="var(--eco-primary-500, #22C55E)" />
        <span style={{
          fontFamily: fb, fontSize: 13, fontWeight: 600,
          color: "var(--eco-text, #1E293B)",
          textTransform: "uppercase", letterSpacing: ".04em",
        }}>
          Estado de servicios
        </span>
      </div>

      {/* Service rows */}
      {services.map((svc, i) => {
        const s = STATUS_MAP[svc.status] || STATUS_MAP.offline;
        const Icon = s.icon;
        return (
          <div key={svc.id || i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px",
            borderBottom: i < services.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
            transition: "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: s.bg, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={14} color={s.color} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: fb, fontSize: 13, fontWeight: 500,
                color: "var(--eco-text, #1E293B)",
              }}>
                {svc.label}
              </div>
            </div>

            <span style={{
              fontFamily: fm, fontSize: 11, fontWeight: 600,
              color: "var(--eco-text-soft, #64748B)",
              minWidth: 52, textAlign: "right",
            }}>
              {svc.latency}
            </span>

            {/* Dot indicator */}
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: s.color, flexShrink: 0,
              boxShadow: `0 0 6px rgba(0,0,0,.15)`,
            }} />
          </div>
        );
      })}
    </div>
  );
}
