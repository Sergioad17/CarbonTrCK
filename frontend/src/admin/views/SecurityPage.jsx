import React from "react";
import {
  ShieldCheck, Lock, AlertTriangle, LogOut, Eye,
  ShieldAlert,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import {
  AdminFormSection,
  AdminToggleField,
  AdminNumberField,
} from "../components/AdminFormSection";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import {
  fetchAdminAuditEvents,
  fetchAdminGovernmentSettings,
  fetchAdminSessions,
  revokeOtherAdminSessions,
  revokeAdminSession,
  saveAdminGovernmentSettings,
} from "../../api/admin";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const DEFAULT_SECURITY_FORM = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  forceChangeOnFirstLogin: false,
  sessionTimeout: 30,
  maxFailedAttempts: 5,
  lockoutDuration: 15,
  emailVerification: false,
  twoFactorEnabled: false,
  twoFactorReady: false,
};

function fmtDate(ts) {
  if (!ts) return "N/D";
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDevice(userAgent) {
  const raw = String(userAgent || "").trim();
  if (!raw || raw === "N/D") return "Dispositivo no identificado";

  const browser = raw.includes("Edg/")
    ? "Microsoft Edge"
    : raw.includes("Chrome/")
      ? "Chrome"
      : raw.includes("Firefox/")
        ? "Firefox"
        : raw.includes("Safari/")
          ? "Safari"
          : "Navegador";
  const os = raw.includes("Windows")
    ? "Windows"
    : raw.includes("Android")
      ? "Android"
      : raw.includes("iPhone") || raw.includes("iPad")
        ? "iOS"
        : raw.includes("Mac OS")
          ? "macOS"
          : raw.includes("Linux")
            ? "Linux"
            : "";

  return os ? `${browser} en ${os}` : browser;
}

function roleLabel(role) {
  const value = String(role || "").toLowerCase();
  if (value === "admin") return "Administrador";
  if (value === "manager") return "Gestor";
  if (value === "operativo" || value === "operator") return "Operativo";
  if (value === "auditor") return "Auditor";
  return value || "Usuario";
}

function normalizeSecurityForm(input = {}) {
  return {
    ...DEFAULT_SECURITY_FORM,
    ...input,
    minPasswordLength: Number.isFinite(Number(input.minPasswordLength)) ? Number(input.minPasswordLength) : DEFAULT_SECURITY_FORM.minPasswordLength,
    requireUppercase: typeof input.requireUppercase === "boolean" ? input.requireUppercase : DEFAULT_SECURITY_FORM.requireUppercase,
    requireNumber: typeof input.requireNumber === "boolean" ? input.requireNumber : DEFAULT_SECURITY_FORM.requireNumber,
    requireSpecialChar: typeof input.requireSpecialChar === "boolean" ? input.requireSpecialChar : DEFAULT_SECURITY_FORM.requireSpecialChar,
    forceChangeOnFirstLogin: false,
    sessionTimeout: Number.isFinite(Number(input.sessionTimeout)) ? Number(input.sessionTimeout) : DEFAULT_SECURITY_FORM.sessionTimeout,
    maxFailedAttempts: Number.isFinite(Number(input.maxFailedAttempts)) ? Number(input.maxFailedAttempts) : DEFAULT_SECURITY_FORM.maxFailedAttempts,
    lockoutDuration: Number.isFinite(Number(input.lockoutDuration)) ? Number(input.lockoutDuration) : DEFAULT_SECURITY_FORM.lockoutDuration,
    emailVerification: false,
    twoFactorEnabled: false,
    twoFactorReady: false,
  };
}

function securityRecommendationsFor(form) {
  const items = [];
  if (form.minPasswordLength < 10) {
    items.push({ id: "min-length", level: "medium", text: "Se recomienda usar al menos 10 caracteres para nuevas contraseñas." });
  }
  if (!form.requireNumber || !form.requireUppercase) {
    items.push({ id: "complexity", level: "high", text: "Activa mayúsculas y números para endurecer la política de contraseñas." });
  }
  if (form.sessionTimeout > 120) {
    items.push({ id: "session-timeout", level: "medium", text: "Reduce la expiración de sesión en equipos compartidos o públicos." });
  }
  if (form.maxFailedAttempts > 5) {
    items.push({ id: "failed-attempts", level: "medium", text: "Mantener 5 intentos o menos reduce ataques de fuerza bruta." });
  }
  return items.length ? items : [{ id: "ok", level: "low", text: "La política actual cubre los controles activos del sistema." }];
}

function translateTechnicalEvent(value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase();
  const map = {
    "actions.create": "Acción creada",
    "actions.update": "Acción actualizada",
    "admin.government.read": "Configuración general consultada",
    "admin.government.update": "Configuración general actualizada",
    "admin.security.session_revoke": "Sesión remota cerrada",
    "admin.security.sessions_revoke_all": "Sesiones remotas cerradas",
    "ai.engine.update": "Motor IA actualizado",
    "ai.module.update": "Módulo IA actualizado",
    "ai.model.execute": "Modelo IA ejecutado",
    "auth.forgot_password.requested": "Solicitud de recuperación de contraseña",
    "auth.login.failure": "Intento de acceso fallido",
    "auth.login.inactive_user": "Intento de acceso con usuario inactivo",
    "auth.login.locked": "Cuenta bloqueada temporalmente por intentos fallidos",
    "auth.login.success": "Inicio de sesión exitoso",
    "auth.logout.success": "Cierre de sesión exitoso",
    "auth.refresh.failure": "Renovación de sesión fallida",
    "auth.refresh.success": "Sesión renovada correctamente",
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
  if (map[key]) return map[key];
  if (!/[._]/.test(raw)) return raw || "Evento de seguridad";

  const tokens = key.split(/[._-]+/).filter(Boolean);
  const module = readableModule(tokens[0]);
  const translated = tokens.map((token) => ({
    auth: "",
    admin: "",
    actions: "acciones",
    dashboard: "tablero",
    devices: "dispositivos",
    equipment: "equipos",
    factors: "factores",
    files: "archivos",
    iot: "IoT",
    notifications: "notificaciones",
    records: "registros",
    settings: "configuración",
    targets: "metas",
    users: "usuarios",
    user: "usuario",
    profile: "perfil",
    security: "seguridad",
    government: "configuración",
    login: "inicio de sesión",
    logout: "cierre de sesión",
    refresh: "renovación de sesión",
    inactive: "usuario inactivo",
    failure: "fallida",
    failed: "fallida",
    success: "completada",
    locked: "bloqueada",
    requested: "solicitada",
    password: "contraseña",
    reset: "restablecida",
    change: "cambiada",
    status: "estado",
    session: "sesión",
    revoke: "cerrada",
    update: "actualizada",
    create: "creada",
    duplicate: "duplicada",
    remove: "eliminada",
    archive: "archivado",
    attached: "adjuntados",
    upload: "cargado",
    ingest: "recibida",
    readings: "lecturas",
    read: "consulta",
    mark: "marcadas",
    all: "todas",
    clear: "limpieza",
    archived: "archivadas",
    default: "predeterminado",
    new: "nueva",
    version: "versión",
    delete: "eliminada",
  }[token] || token)).filter(Boolean).join(" ");

  return translated ? `${module}: ${translated}` : "Evento de seguridad";
}

function securityEventText(evt) {
  return translateTechnicalEvent(evt.description || evt.action);
}

function readableModule(value) {
  const key = String(value || "").toLowerCase();
  const map = {
    auth: "Autenticación",
    authentication: "Autenticación",
    actions: "Acciones",
    admin: "Administración",
    dashboard: "Tablero",
    devices: "Dispositivos",
    equipment: "Equipos",
    factors: "Factores",
    files: "Archivos",
    iot: "IoT",
    notifications: "Notificaciones",
    records: "Registros",
    targets: "Metas",
    user: "Usuarios",
    users: "Usuarios",
    profile: "Perfil",
    session: "Sesiones",
    security: "Seguridad",
    settings: "Configuración",
    organization_admin_settings: "Configuración general",
  };
  return map[key] || value || "Seguridad";
}

function readableAction(value) {
  const key = String(value || "").toLowerCase();
  const map = {
    login: "Inicio de sesión",
    success: "Acceso permitido",
    failure: "Acceso fallido",
    inactive_user: "Usuario inactivo",
    locked: "Bloqueo temporal",
    refresh: "Renovación de sesión",
    requested: "Solicitud",
    forgot_password: "Recuperación de contraseña",
    create: "Creación",
    update: "Actualización",
    status_change: "Cambio de estado",
    duplicate: "Duplicado",
    remove: "Eliminación",
    archive: "Archivado",
    upload: "Carga de archivo",
    ingest: "Recepción de lectura",
    read: "Consulta",
    mark_all_read: "Marcado como leído",
    clear_archived: "Limpieza",
    new_version: "Nueva versión",
    default_change: "Cambio predeterminado",
    delete: "Eliminación",
    password_reset: "Restablecimiento de contraseña",
    password_change: "Cambio de contraseña",
    session_revoke: "Cierre de sesión",
  };
  return map[key] || value || "Evento";
}

function readableStatus(value) {
  const key = String(value || "success").toLowerCase();
  const map = {
    success: "Completado",
    error: "Error",
    warning: "Advertencia",
    pending: "Pendiente",
  };
  return map[key] || value;
}

function readableTarget(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const map = {
    auth: "Autenticación",
    actions: "Acción",
    admin: "Administración",
    dashboard: "Tablero",
    devices: "Dispositivo",
    equipment: "Equipo",
    factors: "Factor",
    files: "Archivo",
    iot: "Lectura IoT",
    notifications: "Notificación",
    records: "Registro",
    settings: "Configuración",
    targets: "Meta",
    user: "Cuenta de usuario",
    users: "Cuenta de usuario",
    profile: "Perfil de usuario",
    session: "Sesión",
    organization_admin_settings: "Ajustes globales",
  };
  return map[raw.toLowerCase()] || raw;
}

function normalizeSecurityEvent(evt) {
  return {
    ...evt,
    severity: eventSeverity(evt),
    description: securityEventText(evt),
    moduleLabel: readableModule(evt.module),
    actionLabel: readableAction(evt.action),
    statusLabel: readableStatus(evt.status),
    targetLabel: readableTarget(evt.target),
    actorLabel: evt.user || "Sistema",
  };
}

function isSecurityEvent(evt) {
  const haystack = [
    evt.description,
    evt.action,
    evt.module,
    evt.target,
    evt.status,
    JSON.stringify(evt.details || {}),
  ].join(" ").toLowerCase();

  return [
    "auth.",
    "login",
    "password",
    "contraseña",
    "security",
    "seguridad",
    "session",
    "sesión",
    "blocked",
    "bloque",
  ].some((token) => haystack.includes(token));
}

function eventSeverity(evt) {
  const text = [evt.status, evt.description, evt.action].join(" ").toLowerCase();
  if (text.includes("error") || text.includes("failure") || text.includes("failed") || text.includes("fallid")) return "error";
  if (evt.severity === "high") return "warning";
  return evt.severity || "low";
}

function normalizeSession(session) {
  return {
    ...session,
    deviceLabel: formatDevice(session.device),
    roleLabel: roleLabel(session.role),
  };
}

export default function SecurityPage() {
  const [form, setForm] = React.useState(null);
  const [settings, setSettings] = React.useState(null);
  const [sessions, setSessions] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [closingSessions, setClosingSessions] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchAdminGovernmentSettings(),
      fetchAdminSessions(),
      fetchAdminAuditEvents(),
    ])
      .then(([data, liveSessions, auditEvents]) => {
        if (cancelled) return;
        setSettings(data);
        setForm(normalizeSecurityForm(data?.security || {}));
        setSessions(liveSessions.map(normalizeSession));
        setEvents(auditEvents.filter(isSecurityEvent).slice(0, 8).map(normalizeSecurityEvent));
        setDirty(false);
        setStatus(null);
      })
      .catch((error) => {
        console.error("admin_security_load_failed", error);
        setStatus({ type: "error", text: "No se pudo cargar la configuración de seguridad." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
    setStatus(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveAdminGovernmentSettings({
        ...(settings || {}),
        security: normalizeSecurityForm(form),
      });
      setSettings(saved);
      setForm(normalizeSecurityForm(saved?.security || {}));
      const liveSessions = await fetchAdminSessions();
      setSessions(liveSessions.map(normalizeSession));
      setDirty(false);
      setStatus({ type: "success", text: "Políticas de seguridad aplicadas al sistema." });
    } catch (error) {
      console.error("admin_security_save_failed", error);
      setStatus({ type: "error", text: "No se pudo guardar. Revisa la conexión con el backend." });
    } finally {
      setSaving(false);
    }
  }

  function handleRestore() {
    setForm(normalizeSecurityForm(settings?.security || {}));
    setDirty(false);
    setStatus(null);
  }

  async function handleRevokeSession(id) {
    try {
      await revokeAdminSession(id);
      const liveSessions = await fetchAdminSessions();
      setSessions(liveSessions.map(normalizeSession));
      setStatus({ type: "success", text: "Sesión remota cerrada correctamente." });
    } catch (error) {
      console.error("admin_session_revoke_failed", error);
      setStatus({ type: "error", text: "No se pudo cerrar la sesión remota." });
    }
  }

  async function handleRevokeOtherSessions() {
    const remoteCount = sessions.filter((session) => !session.current).length;
    if (remoteCount < 1 || closingSessions) return;
    const confirmed = window.confirm(`Se cerrarán ${remoteCount} sesiones remotas. Tu sesión actual seguirá activa.`);
    if (!confirmed) return;

    setClosingSessions(true);
    try {
      const result = await revokeOtherAdminSessions();
      const liveSessions = await fetchAdminSessions();
      setSessions(liveSessions.map(normalizeSession));
      setStatus({
        type: "success",
        text: result.revokedCount === 1
          ? "Se cerró 1 sesión remota."
          : `Se cerraron ${result.revokedCount} sesiones remotas.`,
      });
    } catch (error) {
      console.error("admin_sessions_revoke_all_failed", error);
      setStatus({ type: "error", text: "No se pudieron cerrar las sesiones remotas." });
    } finally {
      setClosingSessions(false);
    }
  }

  if (loading || !form) {
    return <AdminLoadingScreen />;
  }

  const remoteSessionCount = sessions.filter((session) => !session.current).length;
  const sessionColumns = [
    {
      key: "user",
      label: "Usuario",
      minWidth: 220,
      render: (v, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <strong style={{ fontWeight: 600 }}>{v || "Usuario sin nombre"}</strong>
          <span style={{ color: "var(--eco-text-soft, #64748B)", fontSize: 12 }}>{row.email || "Sin correo registrado"}</span>
        </div>
      ),
    },
    {
      key: "roleLabel",
      label: "Rol",
      render: (v, row) => (
        <AdminStatusBadge
          variant={row.role === "admin" ? "info" : "neutral"}
          label={v}
          dot={false}
        />
      ),
    },
    {
      key: "deviceLabel",
      label: "Dispositivo",
      maxWidth: 280,
      render: (v, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span>{v}</span>
          <span style={{ color: "var(--eco-text-soft, #64748B)", fontSize: 11 }}>Inicio: {fmtDate(row.startedAt)}</span>
        </div>
      ),
    },
    { key: "ip",          label: "IP",               mono: true, nowrap: true },
    { key: "lastActivity", label: "Última actividad", mono: true, nowrap: true, render: (v, row) => row.current ? "Sesión actual" : fmtDate(v) },
    {
      key: "id",
      label: "",
      width: 40,
      align: "center",
      render: (_value, row) => row.current ? (
        <AdminStatusBadge variant="success" label="Actual" dot={false} />
      ) : (
        <button
          onClick={(event) => { event.stopPropagation(); handleRevokeSession(row.id); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--eco-text-soft, #94A3B8)",
            transition: "color .15s",
          }}
          title="Cerrar sesión remota"
          onMouseEnter={e => e.currentTarget.style.color = "var(--eco-danger, #DC2626)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--eco-text-soft, #94A3B8)"}
        >
          <LogOut size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Seguridad"
        subtitle="Políticas de acceso, sesiones y protección del sistema"
        icon={ShieldCheck}
        breadcrumb={["Gobierno", "Seguridad"]}
        dirty={dirty}
        onSave={handleSave}
        onRestore={dirty ? handleRestore : undefined}
        saving={saving}
      />
      {status && (
        <div style={{
          marginBottom: 14,
          padding: "10px 14px",
          borderRadius: 8,
          border: status.type === "error" ? "1px solid rgba(239,68,68,.18)" : "1px solid rgba(34,197,94,.18)",
          background: status.type === "error" ? "rgba(239,68,68,.06)" : "rgba(34,197,94,.06)",
          fontFamily: fb,
          fontSize: 12.5,
          fontWeight: 500,
          color: status.type === "error" ? "var(--eco-danger, #DC2626)" : "var(--eco-success, #16A34A)",
        }}>
          {status.text}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Recommendations banner */}
        <div style={{
          background: "rgba(234,179,8,.06)",
          border: "1px solid rgba(234,179,8,.18)",
          borderRadius: 12, padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-warning, #CA8A04)",
          }}>
            <ShieldAlert size={16} /> Recomendaciones de seguridad
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {securityRecommendationsFor(form).map(rec => (
              <div key={rec.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                fontFamily: fb, fontSize: 12.5,
                color: "var(--eco-text, #1E293B)",
              }}>
                <AdminStatusBadge variant={rec.level} label={rec.level === "high" ? "Alta" : rec.level === "medium" ? "Media" : "Baja"} />
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Password Policy */}
        <AdminFormSection title="Política de contraseñas" description="Requisitos mínimos para contraseñas de usuario" columns={2}>
          <AdminNumberField
            label="Longitud mínima"
            value={form.minPasswordLength}
            onChange={v => update("minPasswordLength", v)}
            min={6} max={32} unit="caracteres"
          />
          <div /> {/* spacer */}
          <AdminToggleField
            label="Requiere mayúsculas"
            checked={form.requireUppercase}
            onChange={v => update("requireUppercase", v)}
            description="Al menos una letra mayúscula (A-Z)"
          />
          <AdminToggleField
            label="Requiere números"
            checked={form.requireNumber}
            onChange={v => update("requireNumber", v)}
            description="Al menos un dígito numérico (0-9)"
          />
          <AdminToggleField
            label="Requiere caracteres especiales"
            checked={form.requireSpecialChar}
            onChange={v => update("requireSpecialChar", v)}
            description="Al menos un carácter especial (!@#$...)"
          />
          <AdminToggleField
            label="Cambio obligatorio al primer acceso"
            checked={form.forceChangeOnFirstLogin}
            onChange={() => {}}
            disabled
            description="No disponible: requiere flujo de primer acceso y estado por usuario"
          />
        </AdminFormSection>

        {/* Sessions & Lockout */}
        <AdminFormSection title="Sesiones y bloqueo" description="Control de sesiones activas y protección contra acceso no autorizado" columns={2}>
          <AdminNumberField
            label="Tiempo de expiración de sesión"
            value={form.sessionTimeout}
            onChange={v => update("sessionTimeout", v)}
            min={5} max={480} unit="minutos"
          />
          <AdminNumberField
            label="Intentos fallidos antes de bloqueo"
            value={form.maxFailedAttempts}
            onChange={v => update("maxFailedAttempts", v)}
            min={3} max={15}
          />
          <AdminNumberField
            label="Duración de bloqueo"
            value={form.lockoutDuration}
            onChange={v => update("lockoutDuration", v)}
            min={5} max={120} unit="minutos"
          />
          <AdminToggleField
            label="Verificación de correo"
            checked={form.emailVerification}
            onChange={() => {}}
            disabled
            description="No disponible: requiere flujo de verificación de correo"
          />
        </AdminFormSection>

        {/* Two-factor (future) */}
        <AdminFormSection title="Autenticación de dos factores" description="Capa adicional de seguridad para cuentas críticas">
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: "var(--eco-card-muted, #F8FAFC)",
            borderRadius: 8,
          }}>
            <Lock size={18} color="var(--eco-text-soft, #94A3B8)" />
            <div>
              <div style={{
                fontFamily: fb, fontSize: 13, fontWeight: 500,
                color: "var(--eco-text, #1E293B)",
              }}>
                Doble factor de autenticación
              </div>
              <div style={{
                fontFamily: fb, fontSize: 12,
                color: "var(--eco-text-soft, #94A3B8)", marginTop: 2,
              }}>
                Esta función estará disponible en una próxima actualización. Podrás habilitar TOTP, SMS o correo como segundo factor.
              </div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: 12,
              background: "var(--eco-gray-200, #E2E8F0)",
              fontFamily: fb, fontSize: 10.5, fontWeight: 600,
              color: "var(--eco-text-soft, #94A3B8)",
              whiteSpace: "nowrap",
            }}>
              Próximamente
            </span>
          </div>
        </AdminFormSection>

        {/* Active Sessions */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-text, #1E293B)",
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            <Eye size={15} color="var(--eco-primary-500, #22C55E)" />
            Sesiones activas
            <span style={{
              fontFamily: fm, fontSize: 11, fontWeight: 700,
              padding: "2px 8px", borderRadius: 10,
              background: "var(--eco-success-bg, rgba(34,197,94,.08))", color: "var(--eco-success, #16A34A)",
            }}>
              {sessions.length}
            </span>
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={remoteSessionCount < 1 || closingSessions}
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 30,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--eco-danger-soft, rgba(239,68,68,.28))",
                background: remoteSessionCount < 1 || closingSessions
                  ? "var(--eco-card-muted, #F8FAFC)"
                  : "rgba(239,68,68,.08)",
                color: remoteSessionCount < 1 || closingSessions
                  ? "var(--eco-text-soft, #94A3B8)"
                  : "var(--eco-danger, #DC2626)",
                fontFamily: fb,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: remoteSessionCount < 1 || closingSessions ? "not-allowed" : "pointer",
                textTransform: "none",
                letterSpacing: 0,
                transition: "background .15s, border-color .15s",
              }}
              title="Cerrar todas las sesiones excepto la sesión actual"
            >
              <LogOut size={14} />
              {closingSessions ? "Cerrando..." : "Cerrar otras sesiones"}
            </button>
          </div>
          <div style={{
            marginBottom: 10,
            fontFamily: fb,
            fontSize: 12.5,
            color: "var(--eco-text-soft, #64748B)",
          }}>
            Sesiones vigentes del sistema. La sesión actual queda marcada y las demás pueden cerrarse de forma remota.
          </div>
          <AdminDataTable columns={sessionColumns} data={sessions} compact emptyMessage="No hay sesiones activas" />
        </div>

        {/* Recent Security Events */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-text, #1E293B)",
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            <AlertTriangle size={15} color="var(--eco-warning, #CA8A04)" />
            Eventos de seguridad recientes
          </div>
          <div style={{
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {events.length === 0 && (
              <div style={{
                padding: "28px 20px",
                fontFamily: fb,
                fontSize: 13,
                color: "var(--eco-text-soft, #64748B)",
                textAlign: "center",
              }}>
                Sin eventos de seguridad recientes
              </div>
            )}
            {events.map((evt, i) => (
              <div key={evt.id} style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                alignItems: "start",
                gap: 12,
                padding: "14px 20px",
                borderBottom: i < events.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                transition: "background .12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <AdminStatusBadge variant={evt.severity} label={evt.statusLabel} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: fb, fontSize: 13.5, fontWeight: 600,
                    color: "var(--eco-text, #1E293B)",
                    lineHeight: 1.35,
                  }}>
                    {evt.description}
                  </div>
                  <div style={{
                    marginTop: 3,
                    fontFamily: fb,
                    fontSize: 12.5,
                    color: "var(--eco-text, #334155)",
                  }}>
                    {evt.actorLabel} - {evt.actionLabel} - {evt.moduleLabel}
                  </div>
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 8px",
                    marginTop: 8,
                    fontFamily: fb,
                    fontSize: 11.5,
                    color: "var(--eco-text-soft, #64748B)",
                  }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--eco-card-muted, #F8FAFC)",
                      border: "1px solid var(--eco-border, #E2E8F0)",
                    }}>Usuario: {evt.actorLabel}</span>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--eco-card-muted, #F8FAFC)",
                      border: "1px solid var(--eco-border, #E2E8F0)",
                    }}>M{"ó"}dulo: {evt.moduleLabel}</span>
                    {evt.targetLabel && (
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--eco-card-muted, #F8FAFC)",
                        border: "1px solid var(--eco-border, #E2E8F0)",
                      }}>Destino: {evt.targetLabel}</span>
                    )}
                    {evt.ipAddress && (
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "var(--eco-card-muted, #F8FAFC)",
                        border: "1px solid var(--eco-border, #E2E8F0)",
                        fontFamily: fm,
                      }}>IP: {evt.ipAddress}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)",
                  whiteSpace: "nowrap",
                  paddingTop: 3,
                }}>
                  {fmtDate(evt.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

