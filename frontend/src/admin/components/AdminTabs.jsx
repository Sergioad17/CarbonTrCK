import React from "react";

const fb = "var(--eco-font-body)";

export default function AdminTabs({ tabs = [], activeTab, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 0,
      borderBottom: "2px solid var(--eco-border, #E2E8F0)",
      marginBottom: 18, overflowX: "auto",
    }}>
      {tabs.map(t => {
        const active = t.id === activeTab;
        return (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            style={{
              padding: "10px 20px",
              fontFamily: fb, fontSize: 13, fontWeight: active ? 600 : 400,
              color: active ? "var(--eco-primary-600, #16A34A)" : "var(--eco-text-soft, #64748B)",
              background: "transparent",
              border: "none",
              borderBottom: active ? "2px solid var(--eco-primary-500, #22C55E)" : "2px solid transparent",
              marginBottom: -2, cursor: "pointer",
              transition: "all .15s",
              whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.color = "var(--eco-text, #1E293B)";
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.color = "var(--eco-text-soft, #64748B)";
            }}
          >
            {t.label}
            {t.count != null && (
              <span style={{
                padding: "1px 7px", borderRadius: 10,
                background: active ? "rgba(34,197,94,.10)" : "var(--eco-card-muted, #F1F5F9)",
                fontSize: 11, fontWeight: 600,
                color: active ? "var(--eco-primary-600, #16A34A)" : "var(--eco-text-soft, #94A3B8)",
              }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
