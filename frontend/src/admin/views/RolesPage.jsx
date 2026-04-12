import React from "react";
import {
  Shield,
  Users,
  Check,
  X as XIcon,
  Eye,
  ChevronDown,
  ChevronRight,
  Save,
  RotateCcw,
  Clock3,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminStatusBadge from "../components/AdminStatusBadge";
import {
  roles as mockRoles,
  permissionModules,
  permissionActions,
  permissionMatrix,
} from "../mocks/adminMocks";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

function cloneMatrix(matrix) {
  return JSON.parse(JSON.stringify(matrix));
}

function areEqualMatrix(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function PermCell({ status, onChange }) {
  const map = {
    active: { icon: Check, color: "var(--eco-success, #16A34A)", bg: "rgba(34,197,94,.10)", tip: "Activo" },
    blocked: { icon: XIcon, color: "var(--eco-danger, #DC2626)", bg: "rgba(239,68,68,.08)", tip: "Bloqueado" },
    inherited: { icon: Eye, color: "var(--eco-info, #2563EB)", bg: "rgba(37,99,235,.08)", tip: "Heredado" },
  };
  const current = map[status] || map.blocked;
  const Icon = current.icon;

  return (
    <button
      onClick={() => {
        const cycle = { active: "blocked", blocked: "inherited", inherited: "active" };
        onChange?.(cycle[status] || "active");
      }}
      title={current.tip}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: current.bg,
        border: "none",
        cursor: "pointer",
        transition: "all .12s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.opacity = ".75";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.opacity = "1";
      }}
    >
      <Icon size={14} color={current.color} strokeWidth={2.5} />
    </button>
  );
}

function RoleCard({ role, active, dirty, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 200px",
        minWidth: 180,
        padding: "18px 20px",
        background: "var(--eco-card, #fff)",
        border: active ? `2px solid ${role.color}` : "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
        transition: "all .15s",
        opacity: role.enabled ? 1 : 0.55,
        boxShadow: active ? `0 0 0 3px ${role.color}20` : "none",
        position: "relative",
      }}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.borderColor = role.color;
      }}
      onMouseLeave={(event) => {
        if (!active) event.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
      }}
    >
      {dirty && (
        <span style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "3px 8px",
          borderRadius: 999,
          background: "rgba(234,179,8,.1)",
          color: "var(--eco-warning, #CA8A04)",
          fontFamily: fb,
          fontSize: 10,
          fontWeight: 700,
        }}>
          Borrador
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: `${role.color}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Shield size={17} color={role.color} />
        </div>
        <div>
          <div style={{
            fontFamily: fd,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--eco-text, #1E293B)",
          }}>
            {role.label}
          </div>
          <div style={{
            fontFamily: fb,
            fontSize: 11,
            color: "var(--eco-text-soft, #94A3B8)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
          }}>
            <Users size={10} /> {role.userCount} usuarios
            {!role.enabled && (
              <span style={{
                marginLeft: 6,
                padding: "1px 6px",
                borderRadius: 6,
                background: "var(--eco-card-muted, #F1F5F9)",
                fontSize: 9,
                fontWeight: 600,
                color: "var(--eco-text-soft, #94A3B8)",
              }}>
                Proximamente
              </span>
            )}
          </div>
        </div>
      </div>
      <p style={{
        fontFamily: fb,
        fontSize: 12,
        lineHeight: 1.4,
        color: "var(--eco-text-soft, #64748B)",
        margin: 0,
      }}>
        {role.description}
      </p>
    </button>
  );
}

export default function RolesPage() {
  const [activeRole, setActiveRole] = React.useState("admin");
  const [savedMatrix, setSavedMatrix] = React.useState(() => cloneMatrix(permissionMatrix));
  const [draftMatrix, setDraftMatrix] = React.useState(() => cloneMatrix(permissionMatrix));
  const [viewMode, setViewMode] = React.useState("summary");
  const [expandedModules, setExpandedModules] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState(new Date().toISOString());

  const role = mockRoles.find((item) => item.id === activeRole);
  const rolePerms = draftMatrix[activeRole] || {};

  const dirtyRoleIds = React.useMemo(() => {
    return mockRoles
      .filter((item) => !areEqualMatrix(draftMatrix[item.id], savedMatrix[item.id]))
      .map((item) => item.id);
  }, [draftMatrix, savedMatrix]);

  const hasUnsavedChanges = dirtyRoleIds.length > 0;
  const roleHasUnsavedChanges = dirtyRoleIds.includes(activeRole);

  const currentStats = React.useMemo(() => {
    let active = 0;
    let inherited = 0;
    let blocked = 0;

    permissionModules.forEach((module) => {
      permissionActions.forEach((action) => {
        const status = rolePerms[module.id]?.[action.id] || "blocked";
        if (status === "active") active += 1;
        if (status === "inherited") inherited += 1;
        if (status === "blocked") blocked += 1;
      });
    });

    return { active, inherited, blocked, total: active + inherited + blocked };
  }, [rolePerms]);

  function toggleModule(moduleId) {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }

  function handlePermChange(moduleId, actionId, newStatus) {
    setDraftMatrix((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [moduleId]: {
          ...prev[activeRole]?.[moduleId],
          [actionId]: newStatus,
        },
      },
    }));
  }

  function handleSaveChanges() {
    if (!hasUnsavedChanges) return;
    setSaving(true);
    setTimeout(() => {
      setSavedMatrix(cloneMatrix(draftMatrix));
      setLastSavedAt(new Date().toISOString());
      setSaving(false);
    }, 450);
  }

  function handleRestoreChanges() {
    if (!hasUnsavedChanges) return;
    setDraftMatrix(cloneMatrix(savedMatrix));
  }

  function countEnabled(moduleId) {
    const permissions = rolePerms[moduleId] || {};
    return Object.values(permissions).filter((value) => value === "active" || value === "inherited").length;
  }

  return (
    <>
      <AdminPageHeader
        title="Roles y permisos"
        subtitle="Gestion de roles y configuracion de permisos por modulo"
        icon={Shield}
        breadcrumb={["Operacion", "Roles y permisos"]}
        dirty={hasUnsavedChanges}
        onSave={handleSaveChanges}
        onRestore={handleRestoreChanges}
        saving={saving}
      />

      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 22,
        flexWrap: "wrap",
      }}>
        {mockRoles.map((item) => (
          <RoleCard
            key={item.id}
            role={item}
            active={activeRole === item.id}
            dirty={dirtyRoleIds.includes(item.id)}
            onClick={() => setActiveRole(item.id)}
          />
        ))}
      </div>

      <div style={{
        marginBottom: 16,
        padding: "16px 18px",
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
        display: "grid",
        gridTemplateColumns: "minmax(240px, 1.4fr) repeat(4, minmax(120px, 1fr))",
        gap: 14,
        alignItems: "stretch",
      }}>
        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}>
            <div style={{
              fontFamily: fd,
              fontSize: 16,
              fontWeight: 800,
              color: "var(--eco-text, #1E293B)",
            }}>
              {role?.label}
            </div>
            <AdminStatusBadge
              variant={roleHasUnsavedChanges ? "warning" : "success"}
              label={roleHasUnsavedChanges ? "Cambios locales" : "Sincronizado"}
            />
          </div>
          <div style={{
            marginTop: 6,
            fontFamily: fb,
            fontSize: 12.5,
            color: "var(--eco-text-soft, #64748B)",
            lineHeight: 1.5,
          }}>
            {role?.description}
          </div>
          <div style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: fb,
            fontSize: 11.5,
            color: "var(--eco-text-soft, #94A3B8)",
            flexWrap: "wrap",
          }}>
            <Clock3 size={12} />
            Ultimo guardado local: {new Date(lastSavedAt).toLocaleString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        {[
          { label: "Activos", value: currentStats.active, color: "var(--eco-success, #16A34A)" },
          { label: "Heredados", value: currentStats.inherited, color: "var(--eco-info, #2563EB)" },
          { label: "Bloqueados", value: currentStats.blocked, color: "var(--eco-danger, #DC2626)" },
          { label: "Pendientes", value: dirtyRoleIds.length, color: "var(--eco-warning, #CA8A04)", helper: "roles con cambios" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: 88,
            }}
          >
            <span style={{
              fontFamily: fb,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--eco-text-soft, #94A3B8)",
              textTransform: "uppercase",
              letterSpacing: ".05em",
            }}>
              {item.label}
            </span>
            <span style={{
              marginTop: 6,
              fontFamily: fd,
              fontSize: 24,
              fontWeight: 800,
              color: item.color,
            }}>
              {item.value}
            </span>
            <span style={{
              marginTop: 4,
              fontFamily: fb,
              fontSize: 11.5,
              color: "var(--eco-text-soft, #64748B)",
            }}>
              {item.helper || "permisos del rol actual"}
            </span>
          </div>
        ))}
      </div>

      {hasUnsavedChanges && (
        <div style={{
          marginBottom: 16,
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid rgba(234,179,8,.2)",
          background: "rgba(234,179,8,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontFamily: fb,
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--eco-text, #1E293B)",
            }}>
              Cambios sin guardar en la matriz
            </div>
            <div style={{
              marginTop: 3,
              fontFamily: fb,
              fontSize: 12.5,
              color: "var(--eco-text-soft, #64748B)",
            }}>
              Has modificado {dirtyRoleIds.length} rol{dirtyRoleIds.length === 1 ? "" : "es"}. Puedes guardar el borrador local o restaurar el ultimo estado guardado.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleRestoreChanges}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "var(--eco-card, #fff)",
                fontFamily: fb,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--eco-text, #1E293B)",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={13} /> Restaurar
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: saving ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
                fontFamily: fb,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              <Save size={13} /> {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      <AdminTabs
        tabs={[
          { id: "summary", label: "Vista resumida" },
          { id: "detail", label: "Matriz detallada" },
        ]}
        activeTab={viewMode}
        onChange={setViewMode}
      />

      <div style={{
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {viewMode === "summary" ? (
          <div style={{ padding: 0 }}>
            {permissionModules.map((module, index) => {
              const expanded = expandedModules[module.id];
              const permissions = rolePerms[module.id] || {};
              const enabledCount = countEnabled(module.id);
              const total = permissionActions.length;

              return (
                <div
                  key={module.id}
                  style={{
                    borderBottom: index < permissionModules.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                  }}
                >
                  <button
                    onClick={() => toggleModule(module.id)}
                    style={{
                      width: "100%",
                      padding: "14px 20px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "background .12s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "transparent";
                    }}
                  >
                    {expanded
                      ? <ChevronDown size={14} color="var(--eco-text-soft, #94A3B8)" />
                      : <ChevronRight size={14} color="var(--eco-text-soft, #94A3B8)" />}
                    <span style={{
                      fontFamily: fb,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--eco-text, #1E293B)",
                      flex: 1,
                    }}>
                      {module.label}
                    </span>
                    <div style={{
                      width: 80,
                      height: 6,
                      borderRadius: 3,
                      background: "var(--eco-card-muted, #E2E8F0)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${(enabledCount / total) * 100}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: enabledCount === total
                          ? "var(--eco-success, #16A34A)"
                          : enabledCount === 0
                            ? "var(--eco-danger, #DC2626)"
                            : "var(--eco-warning, #CA8A04)",
                        transition: "width .3s",
                      }} />
                    </div>
                    <span style={{
                      fontFamily: fm,
                      fontSize: 11,
                      color: "var(--eco-text-soft, #64748B)",
                      minWidth: 35,
                      textAlign: "right",
                    }}>
                      {enabledCount}/{total}
                    </span>
                  </button>

                  {expanded && (
                    <div style={{
                      padding: "4px 20px 14px 46px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}>
                      {permissionActions.map((action) => {
                        const status = permissions[action.id] || "blocked";
                        return (
                          <div
                            key={action.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <PermCell
                              status={status}
                              onChange={(nextStatus) => handlePermChange(module.id, action.id, nextStatus)}
                            />
                            <span style={{
                              fontFamily: fb,
                              fontSize: 12,
                              color: status === "blocked" ? "var(--eco-text-soft, #94A3B8)" : "var(--eco-text, #1E293B)",
                              fontWeight: status === "active" ? 500 : 400,
                            }}>
                              {action.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: fb,
              fontSize: 12,
            }}>
              <thead>
                <tr style={{
                  background: "var(--eco-card-muted, #F8FAFC)",
                  borderBottom: "1px solid var(--eco-border, #E2E8F0)",
                }}>
                  <th style={{
                    padding: "10px 18px",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: 11,
                    color: "var(--eco-text-soft, #64748B)",
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    position: "sticky",
                    left: 0,
                    background: "var(--eco-card-muted, #F8FAFC)",
                    zIndex: 2,
                    minWidth: 160,
                  }}>
                    Modulo
                  </th>
                  {permissionActions.map((action) => (
                    <th
                      key={action.id}
                      style={{
                        padding: "10px 10px",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 10,
                        color: "var(--eco-text-soft, #64748B)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        minWidth: 60,
                      }}
                    >
                      {action.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionModules.map((module, index) => (
                  <tr
                    key={module.id}
                    style={{
                      borderBottom: index < permissionModules.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                    }}
                  >
                    <td style={{
                      padding: "10px 18px",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--eco-text, #1E293B)",
                      position: "sticky",
                      left: 0,
                      background: "var(--eco-card, #fff)",
                      zIndex: 1,
                    }}>
                      {module.label}
                    </td>
                    {permissionActions.map((action) => (
                      <td key={action.id} style={{ padding: "6px 10px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <PermCell
                            status={rolePerms[module.id]?.[action.id] || "blocked"}
                            onChange={(nextStatus) => handlePermChange(module.id, action.id, nextStatus)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 14,
        display: "flex",
        gap: 18,
        flexWrap: "wrap",
        fontFamily: fb,
        fontSize: 11.5,
        color: "var(--eco-text-soft, #64748B)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(34,197,94,.15)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={8} color="var(--eco-success, #16A34A)" />
          </span> Activo
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(239,68,68,.1)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={8} color="var(--eco-danger, #DC2626)" />
          </span> Bloqueado
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(37,99,235,.1)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Eye size={8} color="var(--eco-info, #2563EB)" />
          </span> Heredado
        </span>
        <span style={{ opacity: 0.6 }}>Haz clic en un permiso para cambiar su estado y usa Guardar cambios para cerrar la edicion.</span>
      </div>
    </>
  );
}
