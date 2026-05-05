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
  Plus,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import {
  createRole,
  deleteRole,
  fetchRolesPermissions,
  saveRolePermissions,
} from "../../api/users";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const MODULE_ACTIONS = {
  audit: ["view", "edit"],
  areas: ["view", "export"],
  catalogs: ["view"],
  dashboard: ["view"],
  devices: ["view", "create", "edit", "delete", "export"],
  electricity: ["view", "create", "delete", "export"],
  emissions: ["view", "export"],
  equipment: ["view", "create", "edit", "export"],
  factors: ["view", "create", "edit", "delete", "export"],
  fuel: ["view", "create", "delete", "export"],
  reports: ["view", "create", "export"],
  settings: ["view", "edit"],
  targets: ["view", "create", "edit", "delete", "validate", "export", "approve"],
  users: ["view", "create", "edit", "delete", "export"],
};
const permissionActions = [
  { id: "view", label: "Ver" },
  { id: "create", label: "Crear" },
  { id: "edit", label: "Editar" },
  { id: "delete", label: "Eliminar" },
  { id: "validate", label: "Validar" },
  { id: "export", label: "Exportar" },
  { id: "approve", label: "Aprobar" },
];
const MODULE_LABEL_OVERRIDES = {
  audit: "Panel admin",
  reports: "Reportes",
  targets: "Metas",
};
const permissionModules = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "electricity", label: "Electricidad", icon: "Zap" },
  { id: "fuel", label: "Combustible", icon: "Flame" },
  { id: "areas", label: "Áreas", icon: "Building2" },
  { id: "emissions", label: "Emisiones", icon: "Calculator" },
  { id: "factors", label: "Factores", icon: "FlaskConical" },
  { id: "equipment", label: "Equipos", icon: "Monitor" },
  { id: "devices", label: "Dispositivos", icon: "Cpu" },
  { id: "targets", label: "Metas", icon: "Target" },
  { id: "reports", label: "Reportes", icon: "FileBarChart" },
  { id: "users", label: "Usuarios", icon: "Users" },
  { id: "catalogs", label: "Catálogo", icon: "BookOpen" },
  { id: "settings", label: "Configuración", icon: "SlidersHorizontal" },
  { id: "audit", label: MODULE_LABEL_OVERRIDES.audit, icon: "ScrollText" },
];
const ROLE_COLORS = ["#7C3AED", "#2563EB", "#059669", "#64748B", "#EA580C", "#0891B2", "#CA8A04", "#DC2626"];
const LEGACY_PERMISSION_TO_UI = {
  "records:create": ["electricity:create", "fuel:create"],
  "records:delete_soft": ["electricity:delete", "fuel:delete"],
  "records:approve": ["electricity:validate", "fuel:validate"],
  "exports:run": ["electricity:export", "fuel:export", "areas:export", "emissions:export", "factors:export", "equipment:export", "devices:export", "targets:export", "reports:export", "users:export"],
  "targets:manage": ["targets:create", "targets:edit", "targets:delete", "targets:validate", "targets:approve"],
  "catalogs:manage": ["catalogs:view"],
  "users:manage": ["users:create", "users:edit", "users:delete"],
};
const REMOVED_ROLE_PERMISSION_CODES = new Set([
  "dashboard:export",
  "electricity:edit",
  "fuel:edit",
  "ai:view",
  "ai:create",
  "ai:edit",
  "ai:export",
  "ai:approve",
  "ml:run",
  "ml:review_anomalies",
]);
const UI_PERMISSION_CODES = new Set(
  permissionModules.flatMap((module) => (
    getModulePermissionActions(module.id).map((action) => `${module.id}:${action.id}`)
  )),
);
const LEGACY_PERMISSION_CODES = new Set(Object.keys(LEGACY_PERMISSION_TO_UI));

function cloneMatrix(matrix) {
  return JSON.parse(JSON.stringify(matrix));
}

function buildModulePermissions(activeActions = []) {
  const activeSet = new Set(activeActions);
  return Object.fromEntries(permissionActions.map((action) => [
    action.id,
    activeSet.has(action.id) ? "active" : "blocked",
  ]));
}

function buildEmptyRoleMatrix() {
  return Object.fromEntries(permissionModules.map((module) => [
    module.id,
    buildModulePermissions([]),
  ]));
}

function roleColor(role, index) {
  return role.color || ROLE_COLORS[index % ROLE_COLORS.length];
}

function normalizeRoleForView(role, index) {
  const key = String(role.key || role.value || role.name || role.label || "").toLowerCase();
  const isLecturista = key === "consulta" || String(role.label || role.name || "").toLowerCase() === "solo lectura";

  return {
    id: String(role.id || key || `role-${index}`),
    key,
    label: isLecturista ? "Lecturista" : String(role.label || role.name || key || "Rol").trim(),
    description: isLecturista
      ? "Lectura y consulta de información operativa sin capacidad de edición."
      : String(role.description || "Rol con permisos configurables.").trim(),
    color: roleColor(role, index),
    userCount: Number(role.userCount || 0),
    enabled: role.enabled !== false,
    isSystem: Boolean(role.isSystem),
    permissions: Array.isArray(role.permissions) ? role.permissions.map(String) : [],
  };
}

function permissionCode(moduleId, actionId) {
  return `${moduleId}:${actionId}`;
}

function expandBackendPermissions(permissionCodes = []) {
  const expanded = new Set(permissionCodes);

  permissionCodes.forEach((code) => {
    if (REMOVED_ROLE_PERMISSION_CODES.has(code)) return;
    (LEGACY_PERMISSION_TO_UI[code] || []).forEach((uiCode) => expanded.add(uiCode));
  });

  return expanded;
}

function buildMatrixFromRoles(roles) {
  return Object.fromEntries(roles.map((role) => {
    const expandedPermissions = expandBackendPermissions(role.permissions);
    return [
      role.id,
      Object.fromEntries(permissionModules.map((module) => [
        module.id,
        Object.fromEntries(permissionActions.map((action) => [
          action.id,
          expandedPermissions.has(permissionCode(module.id, action.id)) ? "active" : "blocked",
        ])),
      ])),
    ];
  }));
}

function matrixToPermissionCodes(roleMatrix = {}) {
  const codes = [];

  permissionModules.forEach((module) => {
    getModulePermissionActions(module.id).forEach((action) => {
      const status = roleMatrix[module.id]?.[action.id];
      if (status === "active" || status === "inherited") {
        codes.push(permissionCode(module.id, action.id));
      }
    });
  });

  return Array.from(new Set(codes));
}

function addOperationalBridgePermissions(codes) {
  const codeSet = new Set(codes);
  const hasAny = (items) => items.some((code) => codeSet.has(code));

  if (hasAny(["electricity:create", "fuel:create"])) codeSet.add("records:create");
  if (hasAny(["electricity:delete", "fuel:delete"])) codeSet.add("records:delete_soft");
  if (hasAny(["electricity:validate", "fuel:validate"])) codeSet.add("records:approve");
  if (Array.from(codeSet).some((code) => code.endsWith(":export"))) codeSet.add("exports:run");
  if (hasAny(["targets:create", "targets:edit", "targets:delete", "targets:validate", "targets:approve"])) codeSet.add("targets:manage");
  if (codeSet.has("catalogs:view")) codeSet.add("catalogs:manage");
  if (hasAny(["users:create", "users:edit", "users:delete"])) codeSet.add("users:manage");

  return Array.from(codeSet).filter((code) => !REMOVED_ROLE_PERMISSION_CODES.has(code)).sort();
}

function getModulePermissionActions(moduleId) {
  const allowedActions = MODULE_ACTIONS[moduleId];
  if (!allowedActions) return permissionActions;
  return permissionActions.filter((action) => allowedActions.includes(action.id));
}

function isModuleActionAvailable(moduleId, actionId) {
  return getModulePermissionActions(moduleId).some((action) => action.id === actionId);
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
                Próximamente
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
  const [rolesList, setRolesList] = React.useState([]);
  const [activeRole, setActiveRole] = React.useState("");
  const [savedMatrix, setSavedMatrix] = React.useState({});
  const [draftMatrix, setDraftMatrix] = React.useState({});
  const [viewMode, setViewMode] = React.useState("summary");
  const [expandedModules, setExpandedModules] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState(new Date().toISOString());
  const [creatingRole, setCreatingRole] = React.useState(false);
  const [roleForm, setRoleForm] = React.useState({
    label: "",
    description: "",
    color: "#22C55E",
    baseRoleId: "blank",
  });
  const [roleFormError, setRoleFormError] = React.useState("");
  const [deleteRoleMessage, setDeleteRoleMessage] = React.useState("");
  const [loadError, setLoadError] = React.useState("");

  const applyRolesPayload = React.useCallback((payload, preferredRoleId = "") => {
    const nextRoles = (payload.roles || []).map(normalizeRoleForView);
    const nextMatrix = buildMatrixFromRoles(nextRoles);
    setRolesList(nextRoles);
    setSavedMatrix(cloneMatrix(nextMatrix));
    setDraftMatrix(cloneMatrix(nextMatrix));
    setActiveRole((current) => (
      preferredRoleId && nextRoles.some((item) => item.id === preferredRoleId)
        ? preferredRoleId
        : nextRoles.some((item) => item.id === current)
          ? current
          : nextRoles[0]?.id || ""
    ));
    setLastSavedAt(new Date().toISOString());
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      setLoading(true);
      setLoadError("");
      try {
        const payload = await fetchRolesPermissions();
        if (!cancelled) applyRolesPayload(payload);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.payload?.message || error?.message || "No se pudo cargar roles y permisos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [applyRolesPayload]);

  const role = rolesList.find((item) => item.id === activeRole);
  const rolePerms = draftMatrix[activeRole] || {};

  const dirtyRoleIds = React.useMemo(() => {
    return rolesList
      .filter((item) => !areEqualMatrix(draftMatrix[item.id], savedMatrix[item.id]))
      .map((item) => item.id);
  }, [rolesList, draftMatrix, savedMatrix]);

  const hasUnsavedChanges = dirtyRoleIds.length > 0;
  const roleHasUnsavedChanges = dirtyRoleIds.includes(activeRole);

  const currentStats = React.useMemo(() => {
    let active = 0;
    let inherited = 0;
    let blocked = 0;

    permissionModules.forEach((module) => {
      getModulePermissionActions(module.id).forEach((action) => {
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

  async function handleSaveChanges() {
    if (!hasUnsavedChanges) return;
    setSaving(true);
    setLoadError("");
    try {
      const changedRoleIds = dirtyRoleIds;
      let latestPayload = null;

      for (const roleId of changedRoleIds) {
        const roleSnapshot = rolesList.find((item) => item.id === roleId);
        const hiddenPermissions = (roleSnapshot?.permissions || []).filter((code) => (
          !UI_PERMISSION_CODES.has(code) && !LEGACY_PERMISSION_CODES.has(code) && !REMOVED_ROLE_PERMISSION_CODES.has(code)
        ));
        const permissions = addOperationalBridgePermissions([
          ...matrixToPermissionCodes(draftMatrix[roleId]),
          ...hiddenPermissions,
        ]);
        latestPayload = await saveRolePermissions(roleId, permissions);
      }

      if (latestPayload) {
        applyRolesPayload(latestPayload, activeRole);
      } else {
        setSavedMatrix(cloneMatrix(draftMatrix));
      }
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      setLoadError(error?.payload?.message || error?.message || "No se pudieron guardar los permisos.");
    } finally {
      setSaving(false);
    }
  }

  function handleRestoreChanges() {
    if (!hasUnsavedChanges) return;
    setDraftMatrix(cloneMatrix(savedMatrix));
  }

  async function handleCreateRole(event) {
    event.preventDefault();
    const label = roleForm.label.trim();
    const description = roleForm.description.trim();

    if (!label) {
      setRoleFormError("Escribe el nombre del rol.");
      return;
    }

    if (rolesList.some((item) => item.label.trim().toLowerCase() === label.toLowerCase())) {
      setRoleFormError("Ya existe un rol con ese nombre.");
      return;
    }

    const baseMatrix = roleForm.baseRoleId === "blank"
      ? buildEmptyRoleMatrix()
      : cloneMatrix(draftMatrix[roleForm.baseRoleId] || buildEmptyRoleMatrix());
    const permissions = addOperationalBridgePermissions(matrixToPermissionCodes(baseMatrix));

    setSaving(true);
    try {
      const payload = await createRole({
        name: label,
        description: description || "Rol personalizado con permisos configurables.",
        color: roleForm.color,
        permissions,
      });
      const createdRole = payload.roles.find((item) => String(item.label || item.name || "").toLowerCase() === label.toLowerCase());
      applyRolesPayload(payload, createdRole?.id);
      setCreatingRole(false);
      setRoleForm({
        label: "",
        description: "",
        color: "#22C55E",
        baseRoleId: "blank",
      });
      setRoleFormError("");
      setDeleteRoleMessage("");
    } catch (error) {
      setRoleFormError(error?.payload?.message || error?.message || "No se pudo crear el rol.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole() {
    if (!role) return;

    if (role.isSystem) {
      setDeleteRoleMessage(`No se puede dar de baja el rol ${role.label} porque es un rol del sistema.`);
      return;
    }

    if (role.userCount > 0) {
      setDeleteRoleMessage(`No se puede dar de baja el rol ${role.label} porque tiene ${role.userCount} usuario${role.userCount === 1 ? "" : "s"} asignado${role.userCount === 1 ? "" : "s"}.`);
      return;
    }

    if (rolesList.length <= 1) {
      setDeleteRoleMessage("No se puede dar de baja el último rol disponible.");
      return;
    }

    setSaving(true);
    try {
      const deletedRoleLabel = role.label;
      const payload = await deleteRole(role.id);
      applyRolesPayload(payload);
      setDeleteRoleMessage(`El rol ${deletedRoleLabel} fue dado de baja correctamente.`);
    } catch (error) {
      setDeleteRoleMessage(error?.payload?.message || error?.message || "No se pudo dar de baja el rol.");
    } finally {
      setSaving(false);
    }
  }

  function countEnabled(moduleId) {
    const permissions = rolePerms[moduleId] || {};
    return getModulePermissionActions(moduleId).filter((action) => {
      const value = permissions[action.id];
      return value === "active" || value === "inherited";
    }).length;
  }

  if (loading) {
    return <AdminLoadingScreen />;
  }

  return (
    <>
      <AdminPageHeader
        title="Roles y permisos"
        subtitle="Gestión de roles y configuración de permisos por módulo"
        icon={Shield}
        breadcrumb={["Operación", "Roles y permisos"]}
        dirty={hasUnsavedChanges}
        onSave={handleSaveChanges}
        onRestore={handleRestoreChanges}
        saving={saving}
      />

      {loadError && (
        <div style={{
          marginBottom: 16,
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid rgba(220,38,38,.2)",
          background: "rgba(239,68,68,.08)",
          color: "var(--eco-danger, #DC2626)",
          fontFamily: fb,
          fontSize: 12.5,
          fontWeight: 600,
        }}>
          {loadError}
        </div>
      )}

      <div style={{
        marginBottom: 16,
        display: "flex",
        justifyContent: "flex-end",
      }}>
        <button
          onClick={() => {
            setCreatingRole((prev) => !prev);
            setRoleFormError("");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--eco-primary-500, #22C55E)",
            color: "#fff",
            fontFamily: fb,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Crear rol
        </button>
      </div>

      {creatingRole && (
        <form
          onSubmit={handleCreateRole}
          style={{
            marginBottom: 18,
            padding: 18,
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft, #64748B)", textTransform: "uppercase" }}>
              Nombre del rol
            </span>
            <input
              value={roleForm.label}
              onChange={(event) => {
                setRoleForm((prev) => ({ ...prev, label: event.target.value }));
                setRoleFormError("");
              }}
              placeholder="Ej. Supervisor"
              style={{
                height: 38,
                borderRadius: 8,
                border: "1px solid var(--eco-border, #E2E8F0)",
                padding: "0 12px",
                fontFamily: fb,
                fontSize: 13,
                color: "var(--eco-text, #1E293B)",
                background: "var(--eco-card, #fff)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft, #64748B)", textTransform: "uppercase" }}>
              Descripción
            </span>
            <input
              value={roleForm.description}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe el alcance del rol"
              style={{
                height: 38,
                borderRadius: 8,
                border: "1px solid var(--eco-border, #E2E8F0)",
                padding: "0 12px",
                fontFamily: fb,
                fontSize: 13,
                color: "var(--eco-text, #1E293B)",
                background: "var(--eco-card, #fff)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft, #64748B)", textTransform: "uppercase" }}>
              Color
            </span>
            <input
              type="color"
              value={roleForm.color}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, color: event.target.value }))}
              style={{
                height: 38,
                width: "100%",
                borderRadius: 8,
                border: "1px solid var(--eco-border, #E2E8F0)",
                padding: 4,
                background: "var(--eco-card, #fff)",
                cursor: "pointer",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft, #64748B)", textTransform: "uppercase" }}>
              Permisos base
            </span>
            <select
              value={roleForm.baseRoleId}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, baseRoleId: event.target.value }))}
              style={{
                height: 38,
                borderRadius: 8,
                border: "1px solid var(--eco-border, #E2E8F0)",
                padding: "0 10px",
                fontFamily: fb,
                fontSize: 13,
                color: "var(--eco-text, #1E293B)",
                background: "var(--eco-card, #fff)",
              }}
            >
              <option value="blank">Sin permisos</option>
              {rolesList.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--eco-primary-500, #22C55E)",
              color: "#fff",
              fontFamily: fb,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Guardar rol
          </button>

          {roleFormError && (
            <div style={{
              gridColumn: "1 / -1",
              fontFamily: fb,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--eco-danger, #DC2626)",
            }}>
              {roleFormError}
            </div>
          )}
        </form>
      )}

      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 22,
        flexWrap: "wrap",
      }}>
        {rolesList.map((item) => (
          <RoleCard
            key={item.id}
            role={item}
            active={activeRole === item.id}
            dirty={dirtyRoleIds.includes(item.id)}
            onClick={() => {
              setActiveRole(item.id);
              setDeleteRoleMessage("");
            }}
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
          {deleteRoleMessage && (
            <div style={{
              marginTop: 10,
              fontFamily: fb,
              fontSize: 12,
              fontWeight: 600,
              color: deleteRoleMessage.includes("correctamente")
                ? "var(--eco-success, #16A34A)"
                : "var(--eco-danger, #DC2626)",
            }}>
              {deleteRoleMessage}
            </div>
          )}
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
            Último guardado local: {new Date(lastSavedAt).toLocaleString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <button
            onClick={handleDeleteRole}
            title={role?.isSystem
              ? "No se puede dar de baja un rol del sistema"
              : role?.userCount > 0
                ? "Solo se puede dar de baja un rol sin usuarios asignados"
                : "Dar de baja rol"}
            style={{
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(220,38,38,.25)",
              background: role?.isSystem || role?.userCount > 0 ? "var(--eco-card-muted, #F8FAFC)" : "rgba(239,68,68,.08)",
              color: role?.isSystem || role?.userCount > 0 ? "var(--eco-text-soft, #94A3B8)" : "var(--eco-danger, #DC2626)",
              fontFamily: fb,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} /> Dar de baja rol
          </button>
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
              Has modificado {dirtyRoleIds.length} rol{dirtyRoleIds.length === 1 ? "" : "es"}. Puedes guardar el borrador local o restaurar el último estado guardado.
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
              const moduleActions = getModulePermissionActions(module.id);
              const enabledCount = countEnabled(module.id);
              const total = moduleActions.length;

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
                      {moduleActions.map((action) => {
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
                    Módulo
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
                    {permissionActions.map((action) => {
                      const available = isModuleActionAvailable(module.id, action.id);
                      return (
                        <td key={action.id} style={{ padding: "6px 10px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            {available ? (
                              <PermCell
                                status={rolePerms[module.id]?.[action.id] || "blocked"}
                                onChange={(nextStatus) => handlePermChange(module.id, action.id, nextStatus)}
                              />
                            ) : (
                              <span
                                title="No aplica"
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 7,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "var(--eco-card-muted, #F8FAFC)",
                                  color: "var(--eco-text-soft, #94A3B8)",
                                  fontFamily: fm,
                                  fontSize: 13,
                                }}
                              >
                                -
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
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
        <span style={{ opacity: 0.6 }}>Haz clic en un permiso para cambiar su estado y usa Guardar cambios para cerrar la edición.</span>
      </div>
    </>
  );
}
