import React from "react";
import { Download, ScrollText, X } from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { fetchAdminAuditEvents } from "../../api/admin";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const MODULE_LABELS = {
  actions: "Acciones",
  admin: "Administración",
  auth: "Autenticación",
  dashboard: "Tablero",
  devices: "Dispositivos",
  equipment: "Equipos",
  factors: "Factores",
  files: "Archivos",
  iot: "IoT",
  notifications: "Notificaciones",
  organization_admin_settings: "Configuración general",
  profile: "Perfil",
  records: "Registros",
  session: "Sesiones",
  settings: "Configuración personal",
  targets: "Metas",
  user: "Usuarios",
  users: "Usuarios",
};

const ACTION_LABELS = {
  archive: "Archivado",
  clear_archived: "Limpieza de archivados",
  create: "Creación",
  default_change: "Cambio predeterminado",
  delete: "Eliminación",
  duplicate: "Duplicado",
  failure: "Acceso fallido",
  forgot_password: "Recuperación de contraseña",
  inactive_user: "Usuario inactivo",
  ingest: "Recepción de lectura",
  locked: "Bloqueo temporal",
  login: "Inicio de sesión",
  mark_all_read: "Marcado como leído",
  new_version: "Nueva versión",
  password_change: "Cambio de contraseña",
  password_reset: "Restablecimiento de contraseña",
  read: "Consulta",
  refresh: "Renovación de sesión",
  remove: "Eliminación",
  requested: "Solicitud",
  session_revoke: "Cierre de sesión",
  status_change: "Cambio de estado",
  success: "Acceso permitido",
  system: "Sistema",
  update: "Actualización",
  upload: "Carga de archivo",
};

const EVENT_LABELS = {
  "actions.create": "Acción creada",
  "actions.update": "Acción actualizada",
  "admin.government.read": "Configuración general consultada",
  "admin.government.update": "Configuración general actualizada",
  "admin.security.session_revoke": "Sesión remota cerrada",
  "auth.forgot_password.requested": "Solicitud de recuperación de contraseña",
  "auth.login.failure": "Intento de acceso fallido",
  "auth.login.inactive_user": "Intento de acceso con usuario inactivo",
  "auth.login.locked": "Cuenta bloqueada temporalmente",
  "auth.login.success": "Inicio de sesión exitoso",
  "auth.refresh.failure": "Renovación de sesión fallida",
  "dashboard.activity.update": "Actividad del tablero actualizada",
  "devices.create": "Dispositivo creado",
  "devices.duplicate": "Dispositivo duplicado",
  "devices.remove": "Dispositivo eliminado",
  "devices.status_change": "Estado de dispositivo actualizado",
  "devices.update": "Dispositivo actualizado",
  "equipment.create": "Equipo creado",
  "equipment.duplicate": "Equipo duplicado",
  "equipment.status_change": "Estado de equipo actualizado",
  "equipment.update": "Equipo actualizado",
  "factors.create": "Factor de emisión creado",
  "factors.default_change": "Factor predeterminado actualizado",
  "factors.new_version": "Nueva versión de factor creada",
  "factors.status_change": "Estado de factor actualizado",
  "factors.update": "Factor de emisión actualizado",
  "files.upload": "Archivo cargado",
  "iot.readings.ingest": "Lectura IoT recibida",
  "notifications.clear_archived": "Notificaciones archivadas limpiadas",
  "notifications.create": "Notificación creada",
  "notifications.mark_all_read": "Notificaciones marcadas como leídas",
  "notifications.read": "Notificaciones consultadas",
  "notifications.status_change": "Estado de notificación actualizado",
  "profile.password_change": "Cambio de contraseña",
  "records.archive": "Registro archivado",
  "records.create": "Registro creado",
  "records.files_attached": "Archivos adjuntados a registro",
  "settings.read": "Configuración personal consultada",
  "settings.update": "Configuración personal actualizada",
  "targets.create": "Meta creada",
  "targets.delete": "Meta eliminada",
  "targets.status_change": "Estado de meta actualizado",
  "targets.update": "Meta actualizada",
  "users.create": "Usuario creado",
  "users.password_reset": "Restablecimiento de contraseña",
  "users.status_change": "Estado de usuario actualizado",
  "users.update": "Usuario actualizado",
};

const STATUS_LABELS = { success: "Exitoso", warning: "Advertencia", error: "Error", pending: "Pendiente" };
const STATUS_VARIANTS = { success: "success", warning: "warning", error: "error", pending: "pending" };
const SEVERITY_LABELS = { high: "Alta", medium: "Media", low: "Baja" };
const SEVERITY_VARIANTS = { high: "high", medium: "medium", low: "low" };
const ACTION_VARIANTS = {
  create: "success",
  update: "info",
  delete: "error",
  remove: "error",
  archive: "warning",
  login: "neutral",
  refresh: "warning",
  failure: "error",
  locked: "warning",
  status_change: "info",
};

function fmtDate(ts) {
  if (!ts) return "N/D";
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function labelFromToken(value) {
  return String(value || "")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function moduleLabel(value) {
  const key = String(value || "").toLowerCase();
  return MODULE_LABELS[key] || labelFromToken(value) || "Sistema";
}

function actionLabel(value) {
  const key = String(value || "").toLowerCase();
  return ACTION_LABELS[key] || labelFromToken(value) || "Evento";
}

function targetLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Sin elemento específico";
  const mapped = MODULE_LABELS[raw.toLowerCase()];
  return mapped || raw;
}

function fallbackEventLabel(eventType) {
  const key = String(eventType || "").toLowerCase();
  if (!key) return "Evento del sistema";
  const [moduleKey, actionKey, subActionKey] = key.split(".");
  return `${moduleLabel(moduleKey)}: ${[actionLabel(actionKey), actionLabel(subActionKey)].filter(Boolean).join(" - ")}`;
}

function isTechnicalText(value) {
  return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(String(value || "").trim());
}

function normalizeAuditEvent(evt) {
  const eventType = String(evt.eventType || (isTechnicalText(evt.description) ? evt.description : "") || "").trim();
  const [moduleKeyFromType, actionKeyFromType, subActionKeyFromType] = eventType.split(".");
  const actionKey = String(evt.action || subActionKeyFromType || actionKeyFromType || "system").toLowerCase();
  const moduleKey = String(evt.moduleKey || moduleKeyFromType || evt.module || "system").toLowerCase();
  const status = String(evt.status || "success").toLowerCase();
  const severity = String(evt.severity || (status === "error" ? "high" : "low")).toLowerCase();
  const humanDescription = isTechnicalText(evt.description)
    ? EVENT_LABELS[eventType.toLowerCase()] || fallbackEventLabel(eventType)
    : (evt.description || EVENT_LABELS[eventType.toLowerCase()] || fallbackEventLabel(eventType));

  return {
    ...evt,
    eventType,
    actionKey,
    moduleKey,
    status,
    severity,
    user: evt.user || "Sistema",
    actionLabel: actionLabel(actionKey),
    moduleLabel: moduleLabel(evt.module || moduleKey),
    descriptionLabel: humanDescription,
    targetLabel: targetLabel(evt.target),
    statusLabel: STATUS_LABELS[status] || labelFromToken(status),
    severityLabel: SEVERITY_LABELS[severity] || labelFromToken(severity),
    searchText: [
      evt.user,
      humanDescription,
      actionLabel(actionKey),
      moduleLabel(evt.module || moduleKey),
      targetLabel(evt.target),
      STATUS_LABELS[status],
      evt.ipAddress,
      evt.userAgent,
    ].join(" ").toLowerCase(),
  };
}

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function detailLabel(key) {
  return {
    email: "Correo",
    enabled: "Activo",
    force: "Forzar cambio",
    lockoutDuration: "Duración de bloqueo",
    maxFailedAttempts: "Intentos permitidos",
    nextStatus: "Estado nuevo",
    previousStatus: "Estado anterior",
    reason: "Motivo",
    revoked: "Sesión cerrada",
    section: "Sección",
    sessionId: "Sesión",
    status: "Estado",
    tokenHint: "Token",
    type: "Tipo",
    updatedCount: "Registros actualizados",
  }[key] || labelFromToken(key);
}

function detailValue(key, value) {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (key === "reason") {
    return {
      invalid_password: "Contraseña incorrecta",
      user_not_found: "Usuario no encontrado",
      too_many_failed_attempts: "Demasiados intentos fallidos",
      invalid_refresh_token: "Token de sesión inválido",
      missing_refresh_token: "Token de sesión no enviado",
    }[value] || labelFromToken(value);
  }
  if (key === "tokenHint") {
    return value === "provided" ? "Enviado" : value === "missing" ? "No enviado" : String(value);
  }
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function detailEntries(details) {
  return Object.entries(details || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
}

function exportCsv(rows) {
  const headers = ["Fecha", "Usuario", "Acción", "Módulo", "Descripción", "Elemento", "Estado", "Severidad", "IP"];
  const body = rows.map((row) => [
    fmtDate(row.ts),
    row.user,
    row.actionLabel,
    row.moduleLabel,
    row.descriptionLabel,
    row.targetLabel,
    row.statusLabel,
    row.severityLabel,
    row.ipAddress || "",
  ].map(escapeCsv).join(","));
  const blob = new Blob([[headers.map(escapeCsv).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bitacora-y-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ module: "all", action: "all", status: "all" });
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminAuditEvents()
      .then((items) => {
        if (cancelled) return;
        setEvents(items.map(normalizeAuditEvent));
      })
      .catch((loadError) => {
        console.error("admin_audit_load_failed", loadError);
        if (!cancelled) setError("No se pudo cargar la bitácora desde el backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const modules = React.useMemo(() => (
    [...new Map(events.map((event) => [event.moduleLabel, event.moduleLabel])).values()].sort()
  ), [events]);

  const actions = React.useMemo(() => (
    [...new Map(events.map((event) => [event.actionLabel, event.actionLabel])).values()].sort()
  ), [events]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((evt) => {
      if (q && !evt.searchText.includes(q)) return false;
      if (filters.module !== "all" && evt.moduleLabel !== filters.module) return false;
      if (filters.action !== "all" && evt.actionLabel !== filters.action) return false;
      if (filters.status !== "all" && evt.status !== filters.status) return false;
      return true;
    });
  }, [events, search, filters]);

  const columns = [
    {
      key: "ts", label: "Fecha", mono: true, nowrap: true, width: 160,
      render: (v) => <span style={{ fontSize: 11.5 }}>{fmtDate(v)}</span>,
    },
    {
      key: "user", label: "Usuario", minWidth: 150,
      render: (v) => <strong style={{ fontWeight: 600 }}>{v}</strong>,
    },
    {
      key: "actionLabel", label: "Acción", width: 150,
      render: (v, row) => <AdminStatusBadge variant={ACTION_VARIANTS[row.actionKey] || "neutral"} label={v} dot={false} />,
    },
    { key: "moduleLabel", label: "Módulo", width: 150 },
    {
      key: "descriptionLabel", label: "Descripción", minWidth: 260,
      render: (v, row) => (
        <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
          <span style={{ fontSize: 11.5, color: "var(--eco-text-soft, #64748B)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.targetLabel}
          </span>
        </span>
      ),
    },
    {
      key: "severity", label: "Severidad", width: 100, align: "center",
      render: (v, row) => <AdminStatusBadge variant={SEVERITY_VARIANTS[v] || "low"} label={row.severityLabel} dot />,
    },
    {
      key: "status", label: "Estado", width: 100, align: "center",
      render: (v, row) => <AdminStatusBadge variant={STATUS_VARIANTS[v] || "neutral"} label={row.statusLabel} />,
    },
  ];

  function clearFilters() {
    setSearch("");
    setFilters({ module: "all", action: "all", status: "all" });
  }

  if (loading || error) {
    return <AdminLoadingScreen />;
  }

  return (
    <>
      <AdminPageHeader
        title="Bitácora y auditoría"
        subtitle="Registro completo de actividad administrativa del sistema"
        icon={ScrollText}
        breadcrumb={["Gobierno", "Bitácora y auditoría"]}
        actions={
          <button
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              fontFamily: fb, fontSize: 12.5, fontWeight: 500,
              color: "var(--eco-text, #1E293B)", cursor: filtered.length ? "pointer" : "not-allowed",
              opacity: filtered.length ? 1 : .55,
              transition: "all .15s",
            }}
            onMouseEnter={e => { if (filtered.length) e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"; }}
            onMouseLeave={e => e.currentTarget.style.background = "var(--eco-card, #fff)"}
          >
            <Download size={13} /> Exportar
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,.18)",
            background: "rgba(239,68,68,.06)",
            fontFamily: fb,
            fontSize: 12.5,
            color: "var(--eco-danger, #DC2626)",
          }}>
            {error}
          </div>
        )}

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar usuario, descripción, módulo, IP..."
          filters={[
            { key: "module", label: "Todos los módulos", options: modules },
            { key: "action", label: "Todas las acciones", options: actions },
            {
              key: "status", label: "Todos los estados",
              options: [
                { value: "success", label: "Exitoso" },
                { value: "warning", label: "Advertencia" },
                { value: "error", label: "Error" },
                { value: "pending", label: "Pendiente" },
              ],
            },
          ]}
          filterValues={filters}
          onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
          onClear={clearFilters}
        />

        <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #94A3B8)", padding: "0 2px" }}>
          Mostrando <strong style={{ fontFamily: fm, fontWeight: 700, color: "var(--eco-text, #1E293B)" }}>{filtered.length}</strong> de {events.length} registros
        </div>

        <AdminDataTable
          columns={columns}
          data={filtered}
          sortable
          onRowClick={setSelected}
          emptyMessage={loading ? "Cargando registros..." : "No se encontraron registros con los filtros aplicados"}
          maxHeight={520}
        />
      </div>

      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,.3)", backdropFilter: "blur(2px)" }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: 460, maxWidth: "92vw",
            zIndex: 61,
            background: "var(--eco-card, #fff)",
            boxShadow: "-8px 0 30px rgba(0,0,0,.10)",
            display: "flex", flexDirection: "column",
            animation: "adminDrawerIn .22s cubic-bezier(.2,.8,.2,1)",
          }}>
            <div style={{
              padding: "18px 22px",
              borderBottom: "1px solid var(--eco-border, #E2E8F0)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-text, #1E293B)" }}>
                Detalle del evento
              </span>
              <button onClick={() => setSelected(null)} style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--eco-text-soft, #94A3B8)",
              }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "20px 22px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  ["Fecha y hora", fmtDate(selected.ts)],
                  ["Usuario", selected.user],
                  ["Acción", selected.actionLabel],
                  ["Módulo", selected.moduleLabel],
                  ["Descripción", selected.descriptionLabel],
                  ["Elemento afectado", selected.targetLabel],
                  ["Dirección IP", selected.ipAddress || "No registrada"],
                  ["Navegador o agente", selected.userAgent || "No registrado"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{
                      fontFamily: fb, fontSize: 11, fontWeight: 600,
                      color: "var(--eco-text-soft, #94A3B8)",
                      textTransform: "uppercase", letterSpacing: ".05em",
                      marginBottom: 4,
                    }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: fb, fontSize: 13.5, color: "var(--eco-text, #1E293B)", lineHeight: 1.5, wordBreak: "break-word" }}>
                      {val}
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-text-soft, #94A3B8)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                      Estado
                    </div>
                    <AdminStatusBadge variant={STATUS_VARIANTS[selected.status] || "neutral"} label={selected.statusLabel} />
                  </div>
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-text-soft, #94A3B8)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                      Severidad
                    </div>
                    <AdminStatusBadge variant={SEVERITY_VARIANTS[selected.severity] || "low"} label={selected.severityLabel} />
                  </div>
                </div>

                {detailEntries(selected.details).length > 0 && (
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-text-soft, #94A3B8)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                      Datos adicionales
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {detailEntries(selected.details).map(([key, value]) => (
                        <div key={key} style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: "var(--eco-card-muted, #F8FAFC)",
                          border: "1px solid var(--eco-border, #E2E8F0)",
                        }}>
                          <div style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-text-soft, #64748B)", marginBottom: 2 }}>
                            {detailLabel(key)}
                          </div>
                          <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text, #1E293B)", wordBreak: "break-word" }}>
                            {detailValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
