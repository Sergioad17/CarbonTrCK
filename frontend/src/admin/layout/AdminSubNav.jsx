import React from "react";
import {
  LayoutDashboard, Landmark, SlidersHorizontal, ShieldCheck, ScrollText,
  Users, Network, BookOpen, Calendar, FlaskConical, ClipboardEdit, Cpu,
  Database, CheckSquare, Calculator, Target, Bell, FileBarChart,
  HardDrive, LifeBuoy, Sparkles, Brain, Lock, ChevronDown, ChevronRight, X,
} from "lucide-react";
import { adminNavTree } from "../mocks/adminMocks";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const ICON_MAP = {
  LayoutDashboard, Landmark, SlidersHorizontal, ShieldCheck, ScrollText,
  Users, Network, BookOpen, Calendar, FlaskConical, ClipboardEdit, Cpu,
  Database, CheckSquare, Calculator, Target, Bell, FileBarChart,
  HardDrive, LifeBuoy, Sparkles, Brain, Lock,
};

export default function AdminSubNav({ activeView, onNavigate, onClose, visible }) {
  const [expandedSections, setExpandedSections] = React.useState(() => {
    const initial = {};
    adminNavTree.forEach(s => { initial[s.section] = s.enabled; });
    return initial;
  });

  function toggleSection(section) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {visible && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(15,23,42,.35)",
            backdropFilter: "blur(2px)",
            display: "none",
          }}
          className="admin-subnav-backdrop"
        />
      )}

      <nav
        style={{
          width: visible ? 252 : 0,
          minWidth: visible ? 252 : 0,
          height: "100%",
          background: "var(--eco-card, #fff)",
          borderRight: visible ? "1px solid var(--eco-border, #E2E8F0)" : "none",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          transition: "width .28s cubic-bezier(.33,1,.68,1), min-width .28s cubic-bezier(.33,1,.68,1)",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 18px 14px",
          borderBottom: "1px solid var(--eco-border, #E2E8F0)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: fd, fontSize: 13, fontWeight: 800,
              color: "var(--eco-text, #1E293B)",
              textTransform: "uppercase", letterSpacing: ".08em",
            }}>
              Administración
            </div>
            <div style={{
              fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)",
              marginTop: 2,
            }}>
              Panel avanzado
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--eco-text-soft, #94A3B8)",
              transition: "all .15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)";
              e.currentTarget.style.color = "var(--eco-text, #1E293B)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--eco-text-soft, #94A3B8)";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable nav */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "10px 0",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--eco-gray-200, #E2E8F0) transparent",
        }}>
          {adminNavTree.map((section) => {
            const expanded = expandedSections[section.section];
            return (
              <div key={section.section} style={{ marginBottom: 4 }}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.section)}
                  style={{
                    width: "100%", border: "none", background: "transparent",
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px",
                    fontFamily: fd, fontSize: 10.5, fontWeight: 700,
                    color: "var(--eco-text-soft, #94A3B8)",
                    textTransform: "uppercase", letterSpacing: ".08em",
                    cursor: "pointer",
                  }}
                >
                  {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  {section.section}
                  {!section.enabled && (
                    <span style={{
                      marginLeft: "auto",
                      padding: "1px 7px", borderRadius: 10,
                      background: "var(--eco-gray-100, #F1F5F9)",
                      fontSize: 9, fontWeight: 600, fontFamily: fb,
                      color: "var(--eco-text-soft, #94A3B8)",
                      letterSpacing: ".01em", textTransform: "none",
                    }}>
                      Próximamente
                    </span>
                  )}
                </button>

                {/* Section items */}
                {expanded && section.items.map(item => {
                  const Icon = ICON_MAP[item.icon] || Lock;
                  const active = activeView === item.id;
                  const disabled = !item.enabled;

                  return (
                    <button
                      key={item.id}
                      onClick={() => !disabled && onNavigate?.(item.id)}
                      disabled={disabled}
                      style={{
                        width: "100%", border: "none",
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 18px 9px 30px",
                        fontFamily: fb, fontSize: 13, fontWeight: active ? 600 : 400,
                        color: disabled
                          ? "var(--eco-text-soft, #94A3B8)"
                          : active
                            ? "var(--eco-primary-600, #16A34A)"
                            : "var(--eco-text, #1E293B)",
                        background: active ? "rgba(34,197,94,.07)" : "transparent",
                        borderLeft: active ? "3px solid var(--eco-primary-500, #22C55E)" : "3px solid transparent",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? .5 : 1,
                        transition: "all .15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => {
                        if (!disabled && !active) {
                          e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!disabled && !active) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.label}
                      </span>
                      {disabled && (
                        <Lock size={10} style={{ flexShrink: 0, opacity: .5 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--eco-border, #E2E8F0)",
          fontFamily: fb, fontSize: 10.5,
          color: "var(--eco-text-soft, #94A3B8)",
          textAlign: "center",
        }}>
          CarbonTrack Admin v2.1
        </div>
      </nav>

      {/* Responsive styles injected once */}
      <style>{`
        @media (max-width: 768px) {
          .admin-subnav-backdrop { display: block !important; }
        }
      `}</style>
    </>
  );
}
