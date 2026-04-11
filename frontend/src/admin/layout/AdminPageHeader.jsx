import React from "react";
import { ChevronRight, Save, RotateCcw } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export default function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  breadcrumb = [],
  actions,
  dirty,
  onSave,
  onRestore,
  saving,
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      marginBottom: 22,
    }}>
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: fb, fontSize: 12,
          color: "var(--eco-text-soft, #94A3B8)",
        }}>
          <span style={{ cursor: "default" }}>Administración</span>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={11} style={{ opacity: .5 }} />
              <span style={{
                color: i === breadcrumb.length - 1 ? "var(--eco-text, #1E293B)" : undefined,
                fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
              }}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Title row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {Icon && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(34,197,94,.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={18} color="var(--eco-primary-500, #22C55E)" strokeWidth={2} />
            </div>
          )}
          <div>
            <h1 style={{
              fontFamily: fd, fontSize: 20, fontWeight: 800,
              color: "var(--eco-text, #1E293B)",
              margin: 0, lineHeight: 1.2,
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                fontFamily: fb, fontSize: 13,
                color: "var(--eco-text-soft, #64748B)",
                margin: "2px 0 0",
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions area */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Dirty indicator + save/restore */}
          {dirty && (
            <span style={{
              fontFamily: fb, fontSize: 11.5, fontWeight: 500,
              color: "var(--eco-warning, #CA8A04)", padding: "4px 10px",
              background: "rgba(234,179,8,.08)",
              borderRadius: 6, marginRight: 4,
            }}>
              Cambios sin guardar
            </span>
          )}
          {onRestore && (
            <button onClick={onRestore} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              fontFamily: fb, fontSize: 12.5, fontWeight: 500,
              color: "var(--eco-text, #1E293B)", cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--eco-card, #fff)"}
            >
              <RotateCcw size={13} /> Restaurar
            </button>
          )}
          {onSave && (
            <button onClick={onSave} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 16px", borderRadius: 8,
              border: "none",
              background: saving ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
              fontFamily: fb, fontSize: 12.5, fontWeight: 600,
              color: "#fff", cursor: saving ? "wait" : "pointer",
              transition: "all .15s",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--eco-primary-600, #16A34A)"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "var(--eco-primary-500, #22C55E)"; }}
            >
              <Save size={13} /> {saving ? "Guardando..." : "Guardar"}
            </button>
          )}

          {/* Custom actions */}
          {actions}
        </div>
      </div>
    </div>
  );
}
