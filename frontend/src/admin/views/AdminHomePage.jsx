import React from "react";
import {
  LayoutDashboard, Users, UserCheck, UserX, Building2,
  CalendarClock, ClipboardList, ClipboardCheck, Target, AlertTriangle,
  Wifi, ArrowRight, UserPlus, CalendarPlus, DatabaseBackup,
  FileDown, ScrollText, Activity, Zap, Lock,
} from "lucide-react";
import { useAdminNavigate } from "../AdminContext";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminStatCard from "../components/AdminStatCard";
import AdminHealthCard from "../components/AdminHealthCard";
import AdminTimeline from "../components/AdminTimeline";
import AdminStatusBadge from "../components/AdminStatusBadge";
import {
  overviewKpis as kpi,
  serviceHealth,
  systemAlerts,
  recentActivity,
  pendingTasks,
  quickActions,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const SEVERITY_MAP = { critical: "error", warning: "warning", info: "info" };
const PRIORITY_MAP = { high: "error", medium: "warning", low: "info" };

const QA_ICON_MAP = {
  UserPlus, CalendarPlus, DatabaseBackup, FileDown, ScrollText, Activity,
};

/* ─── Quick Action Button ──────────────────────────────────────────────── */
function QuickActionButton({ item, onAction }) {
  const [hovered, setHovered] = React.useState(false);
  const Icon = QA_ICON_MAP[item.icon] || Zap;
  const disabled = !item.available;

  return (
    <button
      onClick={() => onAction(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "16px 10px 14px",
        background: hovered && !disabled
          ? "var(--eco-primary-50, rgba(34,197,94,.06))"
          : "var(--eco-card, #fff)",
        border: `1px solid ${hovered && !disabled
          ? "var(--eco-primary-300, rgba(34,197,94,.3))"
          : "var(--eco-border, #E2E8F0)"}`,
        borderRadius: 12,
        cursor: disabled ? "default" : "pointer",
        transition: "all .2s ease",
        transform: hovered && !disabled ? "translateY(-2px)" : "none",
        boxShadow: hovered && !disabled ? "0 4px 12px rgba(34,197,94,.10)" : "none",
        minWidth: 0,
        opacity: disabled ? .65 : 1,
        position: "relative",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: disabled
          ? "var(--eco-card-muted, rgba(100,116,139,.06))"
          : "var(--eco-primary-50, rgba(34,197,94,.08))",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background .2s",
      }}>
        <Icon
          size={17}
          color={disabled ? "var(--eco-text-soft, #94A3B8)" : "var(--eco-primary-500, #22C55E)"}
          strokeWidth={2}
        />
      </div>
      <span style={{
        fontFamily: fb, fontSize: 11.5, fontWeight: 500,
        color: disabled ? "var(--eco-text-soft, #94A3B8)" : "var(--eco-text, #1E293B)",
        textAlign: "center", lineHeight: 1.3,
      }}>
        {item.label}
      </span>
      {disabled && (
        <span style={{
          position: "absolute", top: 6, right: 6,
          display: "flex", alignItems: "center", gap: 3,
          padding: "1px 6px", borderRadius: 8,
          background: "var(--eco-card-muted, rgba(100,116,139,.08))",
          fontFamily: fb, fontSize: 9, fontWeight: 600,
          color: "var(--eco-text-soft, #94A3B8)",
          letterSpacing: ".02em",
        }}>
          <Lock size={8} /> Próx.
        </span>
      )}
    </button>
  );
}

/* ─── "Coming soon" toast ──────────────────────────────────────────────── */
function ComingSoonToast({ label, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 100,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 20px", borderRadius: 12,
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      boxShadow: "var(--eco-shadow-lg)",
      animation: "adminFadeIn .25s ease-out",
    }}>
      <Lock size={15} color="var(--eco-text-soft, #94A3B8)" />
      <div>
        <div style={{
          fontFamily: fb, fontSize: 13, fontWeight: 600,
          color: "var(--eco-text, #1E293B)",
        }}>
          {label} — Próximamente
        </div>
        <div style={{
          fontFamily: fb, fontSize: 11.5,
          color: "var(--eco-text-soft, #94A3B8)", marginTop: 1,
        }}>
          Este módulo estará disponible en una próxima fase.
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function AdminHomePage() {
  const adminNavigate = useAdminNavigate();
  const [toast, setToast] = React.useState(null);
  const criticalCount = systemAlerts.filter(a => a.severity === "critical" && !a.read).length;

  function handleQuickAction(item) {
    /* Available actions with a target viewId → navigate there */
    if (item.available && item.viewId) {
      adminNavigate(item.viewId);
      return;
    }

    /* Available action with scrollTo → smooth-scroll within this page */
    if (item.available && item.scrollTo) {
      const el = document.getElementById(item.scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        /* brief highlight flash */
        el.style.boxShadow = "0 0 0 3px var(--eco-primary-300, rgba(34,197,94,.35))";
        setTimeout(() => { el.style.boxShadow = ""; }, 1200);
      }
      return;
    }

    /* Unavailable actions → show coming-soon toast */
    setToast(item.label);
  }

  return (
    <>
      <AdminPageHeader
        title="Inicio administrativo"
        subtitle="Resumen ejecutivo del sistema CarbonTrack"
        icon={LayoutDashboard}
        breadcrumb={["Inicio"]}
      />

      {/* ── Critical banner ─────────────────────────────────────── */}
      {criticalCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 18px", marginBottom: 18,
          background: "var(--eco-danger-bg, rgba(239,68,68,.06))",
          border: "1px solid rgba(239,68,68,.18)",
          borderRadius: 10,
          borderLeft: "4px solid var(--eco-danger, #DC2626)",
        }}>
          <AlertTriangle size={18} color="var(--eco-danger, #DC2626)" />
          <span style={{
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-danger, #DC2626)",
          }}>
            {criticalCount} alerta{criticalCount > 1 ? "s" : ""} crítica{criticalCount > 1 ? "s" : ""} requiere{criticalCount > 1 ? "n" : ""} atención inmediata
          </span>
          <span style={{
            marginLeft: "auto", fontFamily: fb, fontSize: 12, fontWeight: 500,
            color: "var(--eco-danger, #DC2626)", opacity: .7,
          }}>
            Ver alertas abajo
          </span>
        </div>
      )}

      {/* ── KPI Grid ──────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 14, marginBottom: 22,
      }}>
        <AdminStatCard label="Usuarios totales"      value={kpi.totalUsers}       icon={Users}          accentColor="var(--eco-info, #2563EB)" subtitle={`${kpi.activeUsers} activos`} />
        <AdminStatCard label="Usuarios activos"       value={kpi.activeUsers}      icon={UserCheck}      accentColor="var(--eco-success, #16A34A)" />
        <AdminStatCard label="Usuarios inactivos"     value={kpi.inactiveUsers}    icon={UserX}          accentColor="var(--eco-danger, #DC2626)" />
        <AdminStatCard label="Áreas registradas"      value={kpi.areasRegistered}  icon={Building2}      accentColor="var(--eco-chart-4, #8B5CF6)" />
        <AdminStatCard label="Periodos abiertos"      value={kpi.openPeriods}      icon={CalendarClock}  accentColor="var(--eco-warning, #CA8A04)" subtitle={`${kpi.closedPeriods} cerrados`} />
        <AdminStatCard label="Registros capturados"   value={kpi.recordsCaptured.toLocaleString()} icon={ClipboardList} accentColor="var(--eco-primary-500, #22C55E)" trend={12} trendLabel="vs. mes anterior" />
        <AdminStatCard label="Registros pendientes"   value={kpi.recordsPending}   icon={ClipboardCheck} accentColor="var(--eco-secondary-500, #EAB308)" />
        <AdminStatCard label="Metas activas"          value={kpi.activeGoals}      icon={Target}         accentColor="var(--eco-chart-6, #06B6D4)" />
        <AdminStatCard label="Alertas críticas"       value={kpi.criticalAlerts}   icon={AlertTriangle}  accentColor="var(--eco-danger, #DC2626)" highlight={kpi.criticalAlerts > 0} />
        <AdminStatCard label="Dispositivos conectados" value={kpi.devicesConnected} icon={Wifi}          accentColor="var(--eco-primary-500, #22C55E)" subtitle={`${kpi.devicesOffline} sin conexión`} />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div style={{
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12, padding: "16px 20px 18px",
        marginBottom: 22,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        }}>
          <Zap size={15} color="var(--eco-primary-500, #22C55E)" />
          <span style={{
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-text, #1E293B)",
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            Accesos rápidos
          </span>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 10,
        }}>
          {quickActions.map(qa => (
            <QuickActionButton key={qa.id} item={qa} onAction={handleQuickAction} />
          ))}
        </div>
      </div>

      {/* ── Two-column: Health + Alerts ──────────────────────────── */}
      <div className="admin-home-grid-2col" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 22,
      }}>
        <div id="admin-health-card" style={{ transition: "box-shadow .4s ease", borderRadius: 12 }}>
          <AdminHealthCard services={serviceHealth} />
        </div>

        {/* Alerts panel */}
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
            <AlertTriangle size={15} color="var(--eco-danger, #DC2626)" />
            <span style={{
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              color: "var(--eco-text, #1E293B)",
              textTransform: "uppercase", letterSpacing: ".04em",
            }}>
              Alertas del sistema
            </span>
            <span style={{
              marginLeft: "auto",
              fontFamily: fm, fontSize: 11, fontWeight: 700,
              padding: "2px 8px", borderRadius: 10,
              background: "var(--eco-danger-bg, rgba(239,68,68,.08))",
              color: "var(--eco-danger, #DC2626)",
            }}>
              {systemAlerts.filter(a => !a.read).length} nuevas
            </span>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {systemAlerts.map((alert, i) => (
              <div key={alert.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 20px",
                borderBottom: i < systemAlerts.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                opacity: alert.read ? .65 : 1,
                transition: "background .12s",
                borderLeft: !alert.read && alert.severity === "critical"
                  ? "3px solid var(--eco-danger, #DC2626)" : "3px solid transparent",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <AdminStatusBadge variant={SEVERITY_MAP[alert.severity]} dot />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: fb, fontSize: 13, fontWeight: alert.read ? 400 : 500,
                    color: "var(--eco-text, #1E293B)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {alert.title}
                  </div>
                  <div style={{
                    fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)", marginTop: 1,
                  }}>
                    {alert.module}
                  </div>
                </div>
                {!alert.read && (
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--eco-danger, #DC2626)", flexShrink: 0,
                    boxShadow: "0 0 6px var(--eco-danger, rgba(220,38,38,.4))",
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column: Activity + Tasks ─────────────────────────── */}
      <div className="admin-home-grid-2col" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 22,
      }}>
        <AdminTimeline items={recentActivity} />

        {/* Pending tasks */}
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
            <ClipboardCheck size={15} color="var(--eco-primary-500, #22C55E)" />
            <span style={{
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              color: "var(--eco-text, #1E293B)",
              textTransform: "uppercase", letterSpacing: ".04em",
            }}>
              Tareas pendientes
            </span>
          </div>
          <div>
            {pendingTasks.map((task, i) => {
              const isOverdue = new Date(task.dueDate) < new Date();
              return (
                <div key={task.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 20px",
                  borderBottom: i < pendingTasks.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                  transition: "background .12s",
                  borderLeft: task.priority === "high"
                    ? "3px solid var(--eco-danger, #DC2626)" : "3px solid transparent",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <AdminStatusBadge variant={PRIORITY_MAP[task.priority]} label={task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: fb, fontSize: 13, fontWeight: 500,
                      color: "var(--eco-text, #1E293B)",
                    }}>
                      {task.title}
                    </div>
                    <div style={{
                      fontFamily: fb, fontSize: 11,
                      color: isOverdue ? "var(--eco-danger, #DC2626)" : "var(--eco-text-soft, #94A3B8)",
                      fontWeight: isOverdue ? 600 : 400,
                      marginTop: 1,
                    }}>
                      {task.assignee} · {isOverdue ? "Vencida" : "Vence"} {new Date(task.dueDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--eco-text-soft, #CBD5E1)" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Coming-soon toast ─────────────────────────────────────── */}
      {toast && <ComingSoonToast label={toast} onClose={() => setToast(null)} />}
    </>
  );
}
