/* ─── CarbonTrack Admin – Centralized Mock Data ─────────────────────────
   All shapes mirror future API contracts.
   Replace each export with a real fetch when backend is ready.
   ──────────────────────────────────────────────────────────────────────── */

// ─── Overview KPIs ──────────────────────────────────────────────────────
export const overviewKpis = {
  totalUsers:        24,
  activeUsers:       19,
  inactiveUsers:     5,
  areasRegistered:   8,
  openPeriods:       2,
  closedPeriods:     6,
  recordsCaptured:   1247,
  recordsPending:    38,
  activeGoals:       5,
  criticalAlerts:    3,
  devicesConnected:  12,
  devicesOffline:    2,
};

// ─── Service Health ─────────────────────────────────────────────────────
export const serviceHealth = [
  { id: "backend",  label: "Backend API",     status: "online",  latency: "42 ms",  updatedAt: "2026-04-11T08:12:00Z" },
  { id: "database", label: "Base de datos",   status: "online",  latency: "8 ms",   updatedAt: "2026-04-11T08:12:00Z" },
  { id: "storage",  label: "Almacenamiento",  status: "online",  latency: "120 ms", updatedAt: "2026-04-11T08:10:00Z" },
  { id: "email",    label: "Servicio correo", status: "warning", latency: "890 ms", updatedAt: "2026-04-11T08:05:00Z" },
  { id: "ia",       label: "Motor IA",        status: "offline", latency: "—",      updatedAt: "2026-04-11T07:50:00Z" },
];

// ─── System Alerts ──────────────────────────────────────────────────────
export const systemAlerts = [
  { id: 1, severity: "critical", title: "3 dispositivos sin reporte en 48 h",       module: "Dispositivos", ts: "2026-04-11T06:30:00Z", read: false },
  { id: 2, severity: "critical", title: "Factor de emisión eléctrica vencido",      module: "Factores",     ts: "2026-04-10T22:00:00Z", read: false },
  { id: 3, severity: "critical", title: "Periodo 2026-Q1 sin cierre programado",    module: "Periodos",     ts: "2026-04-10T18:45:00Z", read: false },
  { id: 4, severity: "warning",  title: "12 registros pendientes de validación",    module: "Registros",    ts: "2026-04-10T14:20:00Z", read: true  },
  { id: 5, severity: "info",     title: "Respaldo automático completado",           module: "Respaldos",    ts: "2026-04-10T03:00:00Z", read: true  },
  { id: 6, severity: "warning",  title: "Meta de reducción Scope 2 al 78 %",       module: "Metas",        ts: "2026-04-09T10:15:00Z", read: true  },
];

// ─── Recent Admin Activity ──────────────────────────────────────────────
export const recentActivity = [
  { id: 1, user: "Sergio Arellano",    action: "Actualizó configuración de seguridad",     module: "Seguridad",       ts: "2026-04-11T08:05:00Z", icon: "shield" },
  { id: 2, user: "María López",        action: "Cerró periodo 2025-Q4",                    module: "Periodos",        ts: "2026-04-11T07:30:00Z", icon: "calendar" },
  { id: 3, user: "Carlos Méndez",      action: "Registró 45 lecturas de electricidad",     module: "Captura",         ts: "2026-04-10T16:20:00Z", icon: "zap" },
  { id: 4, user: "Ana Torres",         action: "Creó nueva área: Edificio C",              module: "Áreas",           ts: "2026-04-10T14:00:00Z", icon: "building" },
  { id: 5, user: "Sistema",            action: "Respaldo automático ejecutado",             module: "Respaldos",       ts: "2026-04-10T03:00:00Z", icon: "database" },
  { id: 6, user: "Sergio Arellano",    action: "Actualizó factores de emisión Scope 1",    module: "Factores",        ts: "2026-04-09T11:45:00Z", icon: "beaker" },
  { id: 7, user: "María López",        action: "Exportó reporte mensual",                  module: "Reportes",        ts: "2026-04-09T09:10:00Z", icon: "file" },
  { id: 8, user: "Admin",              action: "Modificó estructura organizacional",        module: "Organización",    ts: "2026-04-08T17:30:00Z", icon: "sitemap" },
];

// ─── Quick Actions ──────────────────────────────────────────────────────
export const quickActions = [
  { id: "new-user",      label: "Nuevo usuario",       icon: "UserPlus",       viewId: "admin-users",    available: true  },
  { id: "new-period",    label: "Abrir periodo",        icon: "CalendarPlus",   viewId: "admin-periods",  available: true  },
  { id: "run-backup",    label: "Ejecutar respaldo",    icon: "DatabaseBackup", viewId: "admin-backups",  available: false },
  { id: "export-report", label: "Exportar reporte",     icon: "FileDown",       viewId: "admin-reports",  available: false },
  { id: "view-audit",    label: "Ver bitácora",         icon: "ScrollText",     viewId: "admin-audit",    available: true  },
  { id: "check-health",  label: "Estado de servicios",  icon: "Activity",       viewId: null,             available: true, scrollTo: "admin-health-card" },
];

// ─── Pending Tasks ──────────────────────────────────────────────────────
export const pendingTasks = [
  { id: 1, title: "Cerrar periodo 2026-Q1",                    priority: "high",   dueDate: "2026-04-15", assignee: "Admin" },
  { id: 2, title: "Validar 38 registros pendientes",           priority: "high",   dueDate: "2026-04-12", assignee: "María López" },
  { id: 3, title: "Actualizar factor eléctrico CFE 2026",      priority: "medium", dueDate: "2026-04-20", assignee: "Sergio Arellano" },
  { id: 4, title: "Revisar dispositivos desconectados",        priority: "medium", dueDate: "2026-04-13", assignee: "Carlos Méndez" },
  { id: 5, title: "Generar reporte trimestral Scope 1+2",      priority: "low",    dueDate: "2026-04-30", assignee: "Ana Torres" },
];

// ─── Institutional Config (default values) ──────────────────────────────
export const institutionalConfig = {
  name:                "Universidad Ejemplo",
  acronym:             "UEJM",
  logo:                null,
  headquarters:        "Campus Central",
  description:         "Institución de educación superior comprometida con la sustentabilidad y reducción de huella de carbono.",
  country:             "México",
  state:               "Nuevo León",
  city:                "Monterrey",
  timezone:            "America/Monterrey",
  currency:            "MXN",
  baseUnit:            "tCO₂e",
  defaultPeriod:       "quarterly",
  adminEmail:          "admin@universidad-ejemplo.edu.mx",
  phone:               "+52 81 1234 5678",
  responsiblePerson:   "Dr. Roberto Garza",
  usesCampuses:        true,
  usesAreas:           true,
  usesDepartments:     false,
  usesBuildings:       true,
  activeScopes:        [1, 2],
};

// ─── System Config ──────────────────────────────────────────────────────
export const systemConfig = {
  systemName:          "CarbonTrack",
  version:             "2.1.0",
  environment:         "production",
  language:            "es-MX",
  dateFormat:          "DD/MM/YYYY",
  numberFormat:        "1,234.56",
  timezone:            "America/Monterrey",
  systemEmail:         "system@carbontrack.app",
  notificationsEnabled: true,
  emailNotifications:  true,
  pushNotifications:   false,
  logsEnabled:         true,
  logLevel:            "info",
  maxUploadSize:       10,
  allowedFileTypes:    ["pdf", "xlsx", "csv", "png", "jpg"],
  maxAttachmentSize:   5,
  primaryColor:        "#22C55E",
  compactMode:         false,
  showTips:            true,
};

// ─── Security Config ────────────────────────────────────────────────────
export const securityConfig = {
  minPasswordLength:      8,
  requireUppercase:       true,
  requireNumber:          true,
  requireSpecialChar:     false,
  forceChangeOnFirstLogin: true,
  sessionTimeout:         30,
  maxFailedAttempts:      5,
  lockoutDuration:        15,
  emailVerification:      true,
  twoFactorEnabled:       false,
  twoFactorReady:         false,
};

// ─── Active Sessions (mock) ─────────────────────────────────────────────
export const activeSessions = [
  { id: "s1", user: "Sergio Arellano",  email: "sergio@uni.mx",  role: "admin",      ip: "192.168.1.40",  device: "Chrome / Windows",  startedAt: "2026-04-11T07:45:00Z", lastActivity: "2026-04-11T08:12:00Z" },
  { id: "s2", user: "María López",      email: "maria@uni.mx",   role: "operativo",  ip: "192.168.1.55",  device: "Firefox / macOS",   startedAt: "2026-04-11T07:30:00Z", lastActivity: "2026-04-11T08:10:00Z" },
  { id: "s3", user: "Carlos Méndez",    email: "carlos@uni.mx",  role: "operativo",  ip: "10.0.0.12",     device: "Chrome / Android",  startedAt: "2026-04-11T06:00:00Z", lastActivity: "2026-04-11T07:55:00Z" },
  { id: "s4", user: "Ana Torres",       email: "ana@uni.mx",     role: "directivo",  ip: "192.168.1.70",  device: "Safari / iOS",      startedAt: "2026-04-10T22:30:00Z", lastActivity: "2026-04-11T06:45:00Z" },
];

// ─── Security Alerts (mock) ─────────────────────────────────────────────
export const securityEvents = [
  { id: 1, type: "failed_login",   description: "3 intentos fallidos desde 189.203.x.x",    severity: "warning",  ts: "2026-04-11T04:20:00Z" },
  { id: 2, type: "session_expired", description: "Sesión expirada por inactividad: ana@uni.mx", severity: "info", ts: "2026-04-10T23:15:00Z" },
  { id: 3, type: "password_change", description: "Cambio de contraseña: carlos@uni.mx",     severity: "info",     ts: "2026-04-10T16:00:00Z" },
  { id: 4, type: "role_change",    description: "Rol actualizado: operativo → directivo (ana@uni.mx)", severity: "warning", ts: "2026-04-09T11:00:00Z" },
];

// ─── Audit Log (mock events) ────────────────────────────────────────────
export const auditLog = [
  { id: 1,  user: "Sergio Arellano",   action: "update",  module: "Seguridad",        description: "Cambió longitud mínima de contraseña a 8",               target: "security.config",        status: "success", severity: "medium",  ts: "2026-04-11T08:05:00Z" },
  { id: 2,  user: "María López",       action: "update",  module: "Periodos",         description: "Cerró periodo 2025-Q4",                                 target: "period:2025-Q4",         status: "success", severity: "high",    ts: "2026-04-11T07:30:00Z" },
  { id: 3,  user: "Carlos Méndez",     action: "create",  module: "Registros",        description: "Capturó 45 registros de electricidad",                   target: "records:electricity",    status: "success", severity: "low",     ts: "2026-04-10T16:20:00Z" },
  { id: 4,  user: "Ana Torres",        action: "create",  module: "Áreas",            description: "Creó área Edificio C",                                  target: "area:edificio-c",        status: "success", severity: "low",     ts: "2026-04-10T14:00:00Z" },
  { id: 5,  user: "Sistema",           action: "system",  module: "Respaldos",        description: "Respaldo automático ejecutado correctamente",            target: "backup:auto-2026-04-10", status: "success", severity: "low",     ts: "2026-04-10T03:00:00Z" },
  { id: 6,  user: "Sergio Arellano",   action: "update",  module: "Factores",         description: "Actualizó factor de emisión Scope 1 – Gas Natural",     target: "factor:gas-natural",     status: "success", severity: "medium",  ts: "2026-04-09T11:45:00Z" },
  { id: 7,  user: "María López",       action: "export",  module: "Reportes",         description: "Exportó reporte mensual marzo 2026",                    target: "report:mar-2026",        status: "success", severity: "low",     ts: "2026-04-09T09:10:00Z" },
  { id: 8,  user: "Admin",             action: "update",  module: "Organización",     description: "Modificó estructura: agregó Departamento de Ingeniería", target: "org:dept-ing",           status: "success", severity: "medium",  ts: "2026-04-08T17:30:00Z" },
  { id: 9,  user: "Carlos Méndez",     action: "delete",  module: "Registros",        description: "Baja lógica de 2 registros duplicados",                 target: "records:archive",        status: "success", severity: "high",    ts: "2026-04-08T10:15:00Z" },
  { id: 10, user: "Sistema",           action: "system",  module: "Notificaciones",   description: "Envío masivo: recordatorio cierre periodo",             target: "notification:batch",     status: "warning", severity: "low",     ts: "2026-04-07T08:00:00Z" },
  { id: 11, user: "Sergio Arellano",   action: "create",  module: "Usuarios",         description: "Creó usuario: pedro@uni.mx (operativo)",                target: "user:pedro",             status: "success", severity: "medium",  ts: "2026-04-06T15:20:00Z" },
  { id: 12, user: "Ana Torres",        action: "update",  module: "Metas",            description: "Actualizó meta de reducción Scope 2 a -15%",            target: "goal:scope2-reduction",  status: "success", severity: "medium",  ts: "2026-04-05T12:00:00Z" },
  { id: 13, user: "María López",       action: "login",   module: "Autenticación",    description: "Inicio de sesión exitoso",                              target: "session:maria",          status: "success", severity: "low",     ts: "2026-04-05T07:30:00Z" },
  { id: 14, user: "Desconocido",       action: "login",   module: "Autenticación",    description: "Intento de login fallido (3 intentos) desde 189.203.x.x", target: "auth:failed",          status: "error",   severity: "high",    ts: "2026-04-04T22:10:00Z" },
  { id: 15, user: "Sistema",           action: "system",  module: "Mantenimiento",    description: "Limpieza de sesiones expiradas: 12 removidas",          target: "maintenance:sessions",   status: "success", severity: "low",     ts: "2026-04-04T03:00:00Z" },
];

// ─── Admin Nav Tree ─────────────────────────────────────────────────────
export const adminNavTree = [
  {
    section: "Gobierno",
    enabled: true,
    items: [
      { id: "admin-home",          label: "Inicio",                 icon: "LayoutDashboard", enabled: true  },
      { id: "admin-institutional",  label: "Config. institucional",  icon: "Landmark",        enabled: true  },
      { id: "admin-system",         label: "Config. del sistema",    icon: "SlidersHorizontal", enabled: true },
      { id: "admin-security",       label: "Seguridad",             icon: "ShieldCheck",     enabled: true  },
      { id: "admin-audit",          label: "Bitácora y auditoría",  icon: "ScrollText",      enabled: true  },
    ],
  },
  {
    section: "Operación",
    enabled: true,
    items: [
      { id: "admin-users",          label: "Usuarios y permisos",       icon: "Users",          enabled: true  },
      { id: "admin-roles",          label: "Roles y permisos",          icon: "ShieldCheck",    enabled: true  },
      { id: "admin-org",            label: "Estructura organizacional", icon: "Network",        enabled: true  },
      { id: "admin-catalogs",       label: "Catálogos",                 icon: "BookOpen",       enabled: true  },
      { id: "admin-periods",        label: "Periodos",                  icon: "Calendar",       enabled: true  },
      { id: "admin-factors",        label: "Factores",                  icon: "FlaskConical",   enabled: true  },
      { id: "admin-capture",        label: "Captura de datos",          icon: "ClipboardEdit",  enabled: true  },
      { id: "admin-devices",        label: "Dispositivos",              icon: "Cpu",            enabled: true  },
      { id: "admin-records",        label: "Registros",                 icon: "Database",       enabled: true  },
    ],
  },
  {
    section: "Control",
    enabled: true,
    items: [
      { id: "admin-validation",     label: "Validación y aprobación",   icon: "CheckSquare",    enabled: true  },
      { id: "admin-emissions",      label: "Emisiones y cálculo",       icon: "Calculator",     enabled: true  },
      { id: "admin-targets",        label: "Metas y acciones",          icon: "Target",         enabled: true  },
      { id: "admin-alerts",         label: "Alertas y notificaciones",  icon: "Bell",           enabled: true  },
    ],
  },
  {
    section: "Soporte",
    enabled: false,
    items: [
      { id: "admin-reports",        label: "Reportes y exportaciones",  icon: "FileBarChart",   enabled: false },
      { id: "admin-backups",        label: "Respaldos y mantenimiento", icon: "HardDrive",      enabled: false },
      { id: "admin-help",           label: "Ayuda y documentación",     icon: "LifeBuoy",       enabled: false },
      { id: "admin-ai",             label: "Inteligencia artificial",   icon: "Sparkles",       enabled: false },
    ],
  },
];

// ─── Security Recommendations ───────────────────────────────────────────
export const securityRecommendations = [
  { id: 1, level: "high",   text: "Activar verificación en dos pasos para cuentas administrativas",  status: "pending" },
  { id: 2, level: "medium", text: "Reducir tiempo de expiración de sesión a 20 minutos",            status: "pending" },
  { id: 3, level: "medium", text: "Habilitar requisito de caracteres especiales en contraseñas",     status: "pending" },
  { id: 4, level: "low",    text: "Configurar notificación automática de inicios de sesión nuevos",  status: "pending" },
];

/* ════════════════════════════════════════════════════════════════════════
   PART 2 — Users, Org Structure, Catalogs, Periods
   ════════════════════════════════════════════════════════════════════════ */

// ─── Roles ──────────────────────────────────────────────────────────────
export const roles = [
  { id: "admin",     label: "Administrador", description: "Acceso total al sistema, gestión de usuarios y configuración.",    color: "#7C3AED", userCount: 2,  enabled: true  },
  { id: "directivo", label: "Directivo",     description: "Visibilidad completa, aprobación de metas y reportes ejecutivos.", color: "#2563EB", userCount: 4,  enabled: true  },
  { id: "operativo", label: "Operativo",     description: "Captura de datos, registro de consumos y gestión de evidencias.",  color: "#059669", userCount: 14, enabled: true  },
  { id: "consulta",  label: "Solo lectura",  description: "Visualización de dashboards y reportes sin capacidad de edición.", color: "#64748B", userCount: 0,  enabled: false },
];

// ─── Permission modules & actions ───────────────────────────────────────
export const permissionModules = [
  { id: "dashboard", label: "Dashboard",        icon: "LayoutDashboard" },
  { id: "records",   label: "Registros",        icon: "Database" },
  { id: "emissions", label: "Emisiones",        icon: "Calculator" },
  { id: "factors",   label: "Factores",         icon: "FlaskConical" },
  { id: "devices",   label: "Dispositivos",     icon: "Cpu" },
  { id: "targets",   label: "Metas y acciones", icon: "Target" },
  { id: "reports",   label: "Reportes",         icon: "FileBarChart" },
  { id: "users",     label: "Usuarios",         icon: "Users" },
  { id: "settings",  label: "Configuración",    icon: "SlidersHorizontal" },
  { id: "audit",     label: "Bitácora",         icon: "ScrollText" },
  { id: "ai",        label: "Herramientas IA",  icon: "Sparkles" },
];

export const permissionActions = [
  { id: "view",     label: "Ver" },
  { id: "create",   label: "Crear" },
  { id: "edit",     label: "Editar" },
  { id: "delete",   label: "Eliminar" },
  { id: "validate", label: "Validar" },
  { id: "export",   label: "Exportar" },
  { id: "approve",  label: "Aprobar" },
];

// roleId → moduleId → actionId → "active" | "blocked" | "inherited"
export const permissionMatrix = {
  admin: {
    dashboard: { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    records:   { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    emissions: { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    factors:   { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    devices:   { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    targets:   { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    reports:   { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"active",  export:"active",  approve:"active" },
    users:     { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"blocked", export:"active",  approve:"blocked" },
    settings:  { view:"active", create:"active",  edit:"active",  delete:"active",  validate:"blocked", export:"active",  approve:"blocked" },
    audit:     { view:"active", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    ai:        { view:"active", create:"active",  edit:"active",  delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
  },
  directivo: {
    dashboard: { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"active",  export:"active",  approve:"active" },
    records:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"active",  export:"active",  approve:"active" },
    emissions: { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"active",  export:"active",  approve:"active" },
    factors:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"active",  export:"active",  approve:"blocked" },
    devices:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    targets:   { view:"active",  create:"active",  edit:"active",  delete:"blocked", validate:"active",  export:"active",  approve:"active" },
    reports:   { view:"active",  create:"active",  edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    users:     { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    settings:  { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    audit:     { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    ai:        { view:"active",  create:"active",  edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
  },
  operativo: {
    dashboard: { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    records:   { view:"active",  create:"active",  edit:"active",  delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    emissions: { view:"active",  create:"active",  edit:"active",  delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    factors:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    devices:   { view:"active",  create:"active",  edit:"active",  delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    targets:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    reports:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    users:     { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    settings:  { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    audit:     { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    ai:        { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
  },
  consulta: {
    dashboard: { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    records:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    emissions: { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    factors:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    devices:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    targets:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    reports:   { view:"active",  create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"active",  approve:"blocked" },
    users:     { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    settings:  { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    audit:     { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
    ai:        { view:"blocked", create:"blocked", edit:"blocked", delete:"blocked", validate:"blocked", export:"blocked", approve:"blocked" },
  },
};

// ─── Users ──────────────────────────────────────────────────────────────
export const users = [
  { id:"u1",  name:"Sergio Arellano",   email:"sergio@uni.mx",    identifier:"ADM-001", role:"admin",     campus:"Campus Central", areas:["Dirección General","TI"],       status:"active",   lastAccess:"2026-04-11T08:12:00Z", createdAt:"2024-08-15", forcePasswordChange:false, notes:"Administrador principal del sistema." },
  { id:"u2",  name:"María López",       email:"maria@uni.mx",     identifier:"OPR-012", role:"operativo", campus:"Campus Central", areas:["Sustentabilidad"],               status:"active",   lastAccess:"2026-04-11T08:10:00Z", createdAt:"2025-01-10", forcePasswordChange:false, notes:"" },
  { id:"u3",  name:"Carlos Méndez",     email:"carlos@uni.mx",    identifier:"OPR-013", role:"operativo", campus:"Campus Norte",   areas:["Mantenimiento"],                 status:"active",   lastAccess:"2026-04-11T07:55:00Z", createdAt:"2025-02-20", forcePasswordChange:false, notes:"Responsable de lecturas eléctricas Campus Norte." },
  { id:"u4",  name:"Ana Torres",        email:"ana@uni.mx",       identifier:"DIR-004", role:"directivo", campus:"Campus Central", areas:["Rectoría","Sustentabilidad"],    status:"active",   lastAccess:"2026-04-11T06:45:00Z", createdAt:"2024-11-05", forcePasswordChange:false, notes:"Directora de sustentabilidad institucional." },
  { id:"u5",  name:"Roberto Garza",     email:"roberto@uni.mx",   identifier:"DIR-002", role:"directivo", campus:"Campus Central", areas:["Rectoría"],                      status:"active",   lastAccess:"2026-04-10T18:30:00Z", createdAt:"2024-08-15", forcePasswordChange:false, notes:"Responsable general del programa de carbono." },
  { id:"u6",  name:"Laura Sánchez",     email:"laura@uni.mx",     identifier:"OPR-014", role:"operativo", campus:"Campus Sur",     areas:["Laboratorios"],                  status:"active",   lastAccess:"2026-04-10T15:20:00Z", createdAt:"2025-03-12", forcePasswordChange:false, notes:"" },
  { id:"u7",  name:"Pedro Ramírez",     email:"pedro@uni.mx",     identifier:"OPR-015", role:"operativo", campus:"Campus Central", areas:["Mantenimiento","Instalaciones"], status:"active",   lastAccess:"2026-04-09T14:00:00Z", createdAt:"2026-04-06", forcePasswordChange:true,  notes:"Usuario recién creado." },
  { id:"u8",  name:"Gabriela Flores",   email:"gabriela@uni.mx",  identifier:"DIR-005", role:"directivo", campus:"Campus Norte",   areas:["Dirección Académica"],           status:"active",   lastAccess:"2026-04-08T11:00:00Z", createdAt:"2025-06-01", forcePasswordChange:false, notes:"" },
  { id:"u9",  name:"Fernando Ríos",     email:"fernando@uni.mx",  identifier:"OPR-016", role:"operativo", campus:"Campus Central", areas:["TI"],                            status:"inactive", lastAccess:"2026-03-15T09:00:00Z", createdAt:"2025-01-20", forcePasswordChange:false, notes:"Cuenta desactivada por cambio de puesto." },
  { id:"u10", name:"Isabel Moreno",     email:"isabel@uni.mx",    identifier:"OPR-017", role:"operativo", campus:"Campus Sur",     areas:["Administración"],                status:"inactive", lastAccess:"2026-02-28T10:30:00Z", createdAt:"2025-04-15", forcePasswordChange:false, notes:"Baja temporal por licencia." },
  { id:"u11", name:"Diego Herrera",     email:"diego@uni.mx",     identifier:"OPR-018", role:"operativo", campus:"Campus Norte",   areas:["Mantenimiento"],                 status:"active",   lastAccess:"2026-04-10T12:00:00Z", createdAt:"2025-07-10", forcePasswordChange:false, notes:"" },
  { id:"u12", name:"Valentina Cruz",    email:"valentina@uni.mx", identifier:"OPR-019", role:"operativo", campus:"Campus Central", areas:["Sustentabilidad"],               status:"active",   lastAccess:"2026-04-10T16:45:00Z", createdAt:"2025-09-01", forcePasswordChange:false, notes:"" },
  { id:"u13", name:"Andrés Navarro",    email:"andres@uni.mx",    identifier:"OPR-020", role:"operativo", campus:"Campus Central", areas:["Laboratorios","Investigación"],  status:"active",   lastAccess:"2026-04-09T17:20:00Z", createdAt:"2025-08-20", forcePasswordChange:false, notes:"" },
  { id:"u14", name:"Camila Ortiz",      email:"camila@uni.mx",    identifier:"DIR-006", role:"directivo", campus:"Campus Sur",     areas:["Dirección Administrativa"],      status:"active",   lastAccess:"2026-04-10T10:15:00Z", createdAt:"2025-05-15", forcePasswordChange:false, notes:"" },
  { id:"u15", name:"Javier Domínguez",  email:"javier@uni.mx",    identifier:"OPR-021", role:"operativo", campus:"Campus Norte",   areas:["Instalaciones"],                 status:"inactive", lastAccess:"2026-01-20T08:00:00Z", createdAt:"2025-03-01", forcePasswordChange:false, notes:"Cuenta suspendida por inactividad." },
  { id:"u16", name:"Sofía Medina",      email:"sofia@uni.mx",     identifier:"OPR-022", role:"operativo", campus:"Campus Central", areas:["Administración"],                status:"active",   lastAccess:"2026-04-11T07:30:00Z", createdAt:"2025-10-10", forcePasswordChange:false, notes:"" },
  { id:"u17", name:"Emilio Vega",       email:"emilio@uni.mx",    identifier:"OPR-023", role:"operativo", campus:"Campus Central", areas:["Mantenimiento"],                 status:"active",   lastAccess:"2026-04-10T13:50:00Z", createdAt:"2025-11-01", forcePasswordChange:false, notes:"" },
  { id:"u18", name:"Daniela Reyes",     email:"daniela@uni.mx",   identifier:"OPR-024", role:"operativo", campus:"Campus Norte",   areas:["Sustentabilidad"],               status:"active",   lastAccess:"2026-04-09T16:10:00Z", createdAt:"2025-12-01", forcePasswordChange:false, notes:"" },
  { id:"u19", name:"Ricardo Luna",      email:"ricardo@uni.mx",   identifier:"ADM-002", role:"admin",     campus:"Campus Central", areas:["TI","Dirección General"],        status:"active",   lastAccess:"2026-04-11T07:00:00Z", createdAt:"2025-02-01", forcePasswordChange:false, notes:"Segundo administrador de respaldo." },
  { id:"u20", name:"Patricia Castro",   email:"patricia@uni.mx",  identifier:"OPR-025", role:"operativo", campus:"Campus Sur",     areas:["Laboratorios"],                  status:"inactive", lastAccess:"2026-03-01T11:00:00Z", createdAt:"2025-06-20", forcePasswordChange:false, notes:"En proceso de reactivación." },
];

// ─── Campuses ───────────────────────────────────────────────────────────
export const campuses = [
  { id:"campus-central", name:"Campus Central", code:"CC", city:"Monterrey",   responsible:"Dr. Roberto Garza",    status:"active", buildingCount:8, areaCount:15 },
  { id:"campus-norte",   name:"Campus Norte",   code:"CN", city:"San Nicolás", responsible:"Dra. Gabriela Flores", status:"active", buildingCount:4, areaCount:9 },
  { id:"campus-sur",     name:"Campus Sur",     code:"CS", city:"San Pedro",   responsible:"Lic. Camila Ortiz",    status:"active", buildingCount:3, areaCount:6 },
];

// ─── Org Entities (tree) ────────────────────────────────────────────────
export const orgEntities = [
  { id:"e1",  name:"Edificio A – Rectoría",      type:"building",   code:"CC-A",    campusId:"campus-central", parentId:null,  responsible:"Dr. Roberto Garza",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:true,  description:"Edificio principal administrativo." },
  { id:"e2",  name:"Edificio B – Ciencias",       type:"building",   code:"CC-B",    campusId:"campus-central", parentId:null,  responsible:"Dr. Andrés Navarro",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Laboratorios y aulas de ciencias." },
  { id:"e3",  name:"Edificio C – Ingenierías",    type:"building",   code:"CC-C",    campusId:"campus-central", parentId:null,  responsible:"Ing. Pedro Ramírez",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Talleres y laboratorios de ingeniería." },
  { id:"e4",  name:"Edificio D – Biblioteca",     type:"building",   code:"CC-D",    campusId:"campus-central", parentId:null,  responsible:"Lic. Sofía Medina",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:false, description:"Biblioteca central y salas de estudio." },
  { id:"e5",  name:"Dirección General",           type:"area",       code:"CC-A-01", campusId:"campus-central", parentId:"e1",  responsible:"Dr. Roberto Garza",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:false, inReductionGoals:false, description:"" },
  { id:"e6",  name:"Oficina de Sustentabilidad",  type:"area",       code:"CC-A-02", campusId:"campus-central", parentId:"e1",  responsible:"Dra. Ana Torres",      status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:true,  description:"Coordinación de programas ambientales." },
  { id:"e7",  name:"Laboratorio de Química",      type:"laboratory", code:"CC-B-L1", campusId:"campus-central", parentId:"e2",  responsible:"Dr. Andrés Navarro",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Laboratorio principal de química analítica." },
  { id:"e8",  name:"Laboratorio de Biología",     type:"laboratory", code:"CC-B-L2", campusId:"campus-central", parentId:"e2",  responsible:"Dra. Laura Sánchez",   status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:false, description:"" },
  { id:"e9",  name:"Taller de Mecánica",          type:"workshop",   code:"CC-C-T1", campusId:"campus-central", parentId:"e3",  responsible:"Ing. Emilio Vega",     status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Taller de prácticas de ingeniería mecánica." },
  { id:"e10", name:"Centro de Datos",             type:"area",       code:"CC-A-03", campusId:"campus-central", parentId:"e1",  responsible:"Ing. Ricardo Luna",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:true,  description:"Infraestructura de servidores y red." },
  { id:"e11", name:"Cafetería Central",           type:"zone",       code:"CC-Z-01", campusId:"campus-central", parentId:null,  responsible:"Lic. Sofía Medina",    status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:false, inReductionGoals:false, description:"" },
  { id:"e12", name:"Edificio Principal",          type:"building",   code:"CN-A",    campusId:"campus-norte",   parentId:null,  responsible:"Dra. Gabriela Flores", status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:true,  description:"" },
  { id:"e13", name:"Nave Industrial",             type:"workshop",   code:"CN-N1",   campusId:"campus-norte",   parentId:null,  responsible:"Ing. Diego Herrera",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Talleres pesados y maquinaria." },
  { id:"e14", name:"Aulas Norte",                 type:"building",   code:"CN-B",    campusId:"campus-norte",   parentId:null,  responsible:"Dra. Daniela Reyes",   status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:false, inReductionGoals:false, description:"" },
  { id:"e15", name:"Laboratorio de Materiales",   type:"laboratory", code:"CN-A-L1", campusId:"campus-norte",   parentId:"e12", responsible:"Ing. Diego Herrera",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"" },
  { id:"e16", name:"Bodega Norte",                type:"zone",       code:"CN-Z-01", campusId:"campus-norte",   parentId:null,  responsible:"Ing. Carlos Méndez",   status:"inactive", usesElectricity:true,  usesFuel:false, hasDevices:false, inReductionGoals:false, description:"Fuera de operación por remodelación." },
  { id:"e17", name:"Edificio Administrativo Sur", type:"building",   code:"CS-A",    campusId:"campus-sur",     parentId:null,  responsible:"Lic. Camila Ortiz",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:false, description:"" },
  { id:"e18", name:"Laboratorio Ambiental",       type:"laboratory", code:"CS-A-L1", campusId:"campus-sur",     parentId:"e17", responsible:"Dra. Laura Sánchez",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Laboratorio de análisis ambiental." },
  { id:"e19", name:"Estacionamiento Sur",         type:"zone",       code:"CS-Z-01", campusId:"campus-sur",     parentId:null,  responsible:"Lic. Camila Ortiz",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:false, inReductionGoals:false, description:"" },
];

export const orgEntityTypes = [
  { id:"building",   label:"Edificio",        icon:"Building2",     color:"#2563EB" },
  { id:"area",       label:"Área",            icon:"MapPin",        color:"#7C3AED" },
  { id:"department", label:"Departamento",    icon:"Briefcase",     color:"#0891B2" },
  { id:"laboratory", label:"Laboratorio",     icon:"FlaskConical",  color:"#DC2626" },
  { id:"workshop",   label:"Taller",          icon:"Wrench",        color:"#EA580C" },
  { id:"office",     label:"Oficina",         icon:"DoorOpen",      color:"#64748B" },
  { id:"classroom",  label:"Salón",           icon:"GraduationCap", color:"#059669" },
  { id:"zone",       label:"Zona operativa",  icon:"MapPin",        color:"#CA8A04" },
];

// ─── Catalogs ───────────────────────────────────────────────────────────
export const catalogDefinitions = [
  { id:"consumption-types",     label:"Tipos de consumo",           count:5, status:"active" },
  { id:"fuel-types",            label:"Tipos de combustible",       count:6, status:"active" },
  { id:"emission-sources",      label:"Fuentes de emisión",         count:4, status:"active" },
  { id:"measurement-units",     label:"Unidades de medida",         count:8, status:"active" },
  { id:"record-categories",     label:"Categorías de registro",     count:4, status:"active" },
  { id:"goal-statuses",         label:"Estados de meta",            count:5, status:"active" },
  { id:"record-statuses",       label:"Estados de registro",        count:4, status:"active" },
  { id:"device-types",          label:"Tipos de dispositivo",       count:5, status:"active" },
  { id:"alert-types",           label:"Tipos de alerta",            count:4, status:"active" },
  { id:"evidence-types",        label:"Tipos de evidencia",         count:4, status:"active" },
  { id:"user-types",            label:"Tipos de usuario",           count:4, status:"active" },
  { id:"report-types",          label:"Tipos de reporte",           count:5, status:"active" },
  { id:"notification-types",    label:"Tipos de notificación",      count:4, status:"active" },
  { id:"activity-types",        label:"Tipos de actividad",         count:6, status:"active" },
  { id:"emission-factor-types", label:"Tipos de factor de emisión", count:3, status:"active" },
];

export const catalogEntries = {
  "consumption-types": [
    { id:"ct1", code:"ELEC",  name:"Electricidad",   description:"Consumo de energía eléctrica de la red",              status:"active",   isDefault:true,  order:1 },
    { id:"ct2", code:"GAS-N", name:"Gas natural",    description:"Consumo de gas natural para calefacción o procesos",   status:"active",   isDefault:false, order:2 },
    { id:"ct3", code:"DIESEL",name:"Diésel",         description:"Consumo de diésel para generadores o vehículos",       status:"active",   isDefault:false, order:3 },
    { id:"ct4", code:"GLP",   name:"Gas LP",         description:"Consumo de gas licuado de petróleo",                   status:"active",   isDefault:false, order:4 },
    { id:"ct5", code:"WATER", name:"Agua",           description:"Consumo de agua potable",                              status:"inactive", isDefault:false, order:5 },
  ],
  "fuel-types": [
    { id:"ft1", code:"GN",   name:"Gas natural",    description:"Gas natural seco",                  status:"active",   isDefault:true,  order:1 },
    { id:"ft2", code:"DSL",  name:"Diésel",         description:"Diésel automotriz e industrial",    status:"active",   isDefault:false, order:2 },
    { id:"ft3", code:"GLP",  name:"Gas LP",         description:"Gas licuado de petróleo",           status:"active",   isDefault:false, order:3 },
    { id:"ft4", code:"GSL",  name:"Gasolina",       description:"Gasolina regular y premium",        status:"active",   isDefault:false, order:4 },
    { id:"ft5", code:"BIO",  name:"Biodiésel",      description:"Combustible de origen biológico",   status:"inactive", isDefault:false, order:5 },
    { id:"ft6", code:"CARB", name:"Carbón",         description:"Carbón mineral",                    status:"inactive", isDefault:false, order:6 },
  ],
  "emission-sources": [
    { id:"es1", code:"STAT",  name:"Combustión estacionaria", description:"Calderas, hornos, generadores",             status:"active", isDefault:true,  order:1 },
    { id:"es2", code:"MOBIL", name:"Combustión móvil",        description:"Vehículos y transporte propio",             status:"active", isDefault:false, order:2 },
    { id:"es3", code:"FUGI",  name:"Emisiones fugitivas",     description:"Fugas de refrigerantes y gases",            status:"active", isDefault:false, order:3 },
    { id:"es4", code:"ELECT", name:"Electricidad comprada",   description:"Emisiones indirectas por consumo eléctrico",status:"active", isDefault:true,  order:4 },
  ],
  "measurement-units": [
    { id:"mu1", code:"kWh",   name:"Kilowatt-hora",    description:"Unidad de energía eléctrica",          status:"active",   isDefault:true,  order:1 },
    { id:"mu2", code:"m3",    name:"Metro cúbico",     description:"Volumen de gas",                       status:"active",   isDefault:false, order:2 },
    { id:"mu3", code:"L",     name:"Litro",            description:"Volumen de líquidos",                  status:"active",   isDefault:false, order:3 },
    { id:"mu4", code:"kg",    name:"Kilogramo",        description:"Masa",                                 status:"active",   isDefault:false, order:4 },
    { id:"mu5", code:"tCO2e", name:"Tonelada CO₂e",   description:"Tonelada de CO₂ equivalente",          status:"active",   isDefault:true,  order:5 },
    { id:"mu6", code:"GJ",    name:"Gigajoule",        description:"Unidad de energía térmica",            status:"active",   isDefault:false, order:6 },
    { id:"mu7", code:"MWh",   name:"Megawatt-hora",    description:"Unidad de energía eléctrica (mayor)",  status:"active",   isDefault:false, order:7 },
    { id:"mu8", code:"gal",   name:"Galón",            description:"Volumen en galones",                   status:"inactive", isDefault:false, order:8 },
  ],
  "record-categories": [
    { id:"rc1", code:"S1",  name:"Scope 1", description:"Emisiones directas",                 status:"active",   isDefault:true,  order:1 },
    { id:"rc2", code:"S2",  name:"Scope 2", description:"Emisiones indirectas por energía",   status:"active",   isDefault:true,  order:2 },
    { id:"rc3", code:"S3",  name:"Scope 3", description:"Otras emisiones indirectas",         status:"inactive", isDefault:false, order:3 },
    { id:"rc4", code:"OTH", name:"Otros",   description:"Registros generales no categorizados",status:"active",  isDefault:false, order:4 },
  ],
  "goal-statuses": [
    { id:"gs1", code:"DRAFT",  name:"Borrador",   description:"Meta en preparación",           status:"active", isDefault:true,  order:1 },
    { id:"gs2", code:"ACTIVE", name:"Activa",     description:"Meta en seguimiento activo",     status:"active", isDefault:false, order:2 },
    { id:"gs3", code:"REVIEW", name:"En revisión",description:"Meta en proceso de evaluación",  status:"active", isDefault:false, order:3 },
    { id:"gs4", code:"DONE",   name:"Cumplida",   description:"Meta alcanzada exitosamente",    status:"active", isDefault:false, order:4 },
    { id:"gs5", code:"CANCEL", name:"Cancelada",  description:"Meta cancelada o descartada",    status:"active", isDefault:false, order:5 },
  ],
  "record-statuses": [
    { id:"rs1", code:"PEND",   name:"Pendiente", description:"Registro capturado sin validar",   status:"active", isDefault:true,  order:1 },
    { id:"rs2", code:"VALID",  name:"Validado",  description:"Registro verificado y aprobado",    status:"active", isDefault:false, order:2 },
    { id:"rs3", code:"REJECT", name:"Rechazado", description:"Registro devuelto para corrección", status:"active", isDefault:false, order:3 },
    { id:"rs4", code:"ARCH",   name:"Archivado", description:"Registro archivado",                status:"active", isDefault:false, order:4 },
  ],
  "device-types": [
    { id:"dt1", code:"METER",  name:"Medidor eléctrico", description:"Medidor de consumo eléctrico inteligente", status:"active",   isDefault:true,  order:1 },
    { id:"dt2", code:"SENSOR", name:"Sensor ambiental",  description:"Sensor de temperatura, humedad, CO₂",      status:"active",   isDefault:false, order:2 },
    { id:"dt3", code:"FLOW",   name:"Medidor de flujo",  description:"Medidor de flujo de gas o agua",            status:"active",   isDefault:false, order:3 },
    { id:"dt4", code:"GWAY",   name:"Gateway IoT",       description:"Concentrador de datos IoT",                 status:"active",   isDefault:false, order:4 },
    { id:"dt5", code:"CAM",    name:"Cámara térmica",    description:"Cámara de monitoreo térmico",               status:"inactive", isDefault:false, order:5 },
  ],
  "alert-types": [
    { id:"at1", code:"SYS",   name:"Sistema",       description:"Alertas del sistema operativo",          status:"active", isDefault:true,  order:1 },
    { id:"at2", code:"LIMIT", name:"Umbral",        description:"Alerta por exceder umbral configurado",  status:"active", isDefault:false, order:2 },
    { id:"at3", code:"MAINT", name:"Mantenimiento", description:"Alertas de mantenimiento preventivo",    status:"active", isDefault:false, order:3 },
    { id:"at4", code:"SEC",   name:"Seguridad",     description:"Alertas de seguridad del sistema",       status:"active", isDefault:false, order:4 },
  ],
  "evidence-types": [
    { id:"ev1", code:"PHOTO", name:"Fotografía",       description:"Evidencia fotográfica",                 status:"active", isDefault:true,  order:1 },
    { id:"ev2", code:"DOC",   name:"Documento",        description:"Documento PDF o escaneado",             status:"active", isDefault:false, order:2 },
    { id:"ev3", code:"SHEET", name:"Hoja de cálculo",  description:"Archivo Excel o CSV",                   status:"active", isDefault:false, order:3 },
    { id:"ev4", code:"BILL",  name:"Recibo o factura", description:"Comprobante fiscal o recibo de servicio",status:"active", isDefault:false, order:4 },
  ],
  "user-types": [
    { id:"ut1", code:"INT",  name:"Interno",  description:"Personal de la institución",       status:"active", isDefault:true,  order:1 },
    { id:"ut2", code:"EXT",  name:"Externo",  description:"Consultor o auditor externo",      status:"active", isDefault:false, order:2 },
    { id:"ut3", code:"SYS",  name:"Sistema",  description:"Cuenta de servicio automatizada",  status:"active", isDefault:false, order:3 },
    { id:"ut4", code:"TEMP", name:"Temporal", description:"Acceso temporal por proyecto",      status:"active", isDefault:false, order:4 },
  ],
  "report-types": [
    { id:"rt1", code:"MONTH",  name:"Mensual",       description:"Reporte mensual de emisiones",         status:"active", isDefault:true,  order:1 },
    { id:"rt2", code:"QUART",  name:"Trimestral",    description:"Reporte trimestral consolidado",       status:"active", isDefault:false, order:2 },
    { id:"rt3", code:"ANNUAL", name:"Anual",         description:"Reporte anual de huella de carbono",   status:"active", isDefault:false, order:3 },
    { id:"rt4", code:"AUDIT",  name:"Auditoría",     description:"Reporte para auditoría externa",       status:"active", isDefault:false, order:4 },
    { id:"rt5", code:"CUSTOM", name:"Personalizado", description:"Reporte con filtros personalizados",   status:"active", isDefault:false, order:5 },
  ],
  "notification-types": [
    { id:"nt1", code:"ALERT",  name:"Alerta",           description:"Notificación de alerta del sistema",    status:"active", isDefault:true,  order:1 },
    { id:"nt2", code:"REMIND", name:"Recordatorio",     description:"Recordatorio de tarea o vencimiento",   status:"active", isDefault:false, order:2 },
    { id:"nt3", code:"INFO",   name:"Informativa",      description:"Notificación general informativa",      status:"active", isDefault:false, order:3 },
    { id:"nt4", code:"ACTION", name:"Acción requerida", description:"Requiere intervención del usuario",     status:"active", isDefault:false, order:4 },
  ],
  "activity-types": [
    { id:"ac1", code:"LOGIN",  name:"Inicio de sesión", description:"Acceso al sistema",                              status:"active", isDefault:false, order:1 },
    { id:"ac2", code:"CRUD",   name:"Operación CRUD",   description:"Creación, lectura, actualización o eliminación", status:"active", isDefault:true,  order:2 },
    { id:"ac3", code:"EXPORT", name:"Exportación",      description:"Exportación de datos o reportes",                status:"active", isDefault:false, order:3 },
    { id:"ac4", code:"CONFIG", name:"Configuración",    description:"Cambio en configuración del sistema",            status:"active", isDefault:false, order:4 },
    { id:"ac5", code:"VALID",  name:"Validación",       description:"Acción de validación o aprobación",              status:"active", isDefault:false, order:5 },
    { id:"ac6", code:"SYSTEM", name:"Sistema",          description:"Acción automatizada del sistema",                status:"active", isDefault:false, order:6 },
  ],
  "emission-factor-types": [
    { id:"ef1", code:"GRID",   name:"Factor de red eléctrica", description:"Factor de emisión por kWh de la red",             status:"active", isDefault:true,  order:1 },
    { id:"ef2", code:"FUEL",   name:"Factor por combustible",  description:"Factor de emisión por tipo de combustible",       status:"active", isDefault:false, order:2 },
    { id:"ef3", code:"CUSTOM", name:"Factor personalizado",    description:"Factor calculado o proporcionado por auditor",    status:"active", isDefault:false, order:3 },
  ],
};

// ─── Periods ────────────────────────────────────────────────────────────
export const periods = [
  { id:"p1", name:"2025-Q1",    label:"Enero – Marzo 2025",   type:"quarterly", startDate:"2025-01-01", endDate:"2025-03-31", status:"closed", isDefault:false, captureDeadline:"2025-04-10", validationDeadline:"2025-04-20", reportDeadline:"2025-04-30", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin"],               specialReopenNote:"Solo administracion central puede autorizar reapertura por auditoria." },
  { id:"p2", name:"2025-Q2",    label:"Abril – Junio 2025",   type:"quarterly", startDate:"2025-04-01", endDate:"2025-06-30", status:"closed", isDefault:false, captureDeadline:"2025-07-10", validationDeadline:"2025-07-20", reportDeadline:"2025-07-31", lockCaptureOnClose:true,  allowSpecialReopen:false, specialReopenRoles:["admin"],               specialReopenNote:"" },
  { id:"p3", name:"2025-Q3",    label:"Julio – Sep 2025",     type:"quarterly", startDate:"2025-07-01", endDate:"2025-09-30", status:"closed", isDefault:false, captureDeadline:"2025-10-10", validationDeadline:"2025-10-20", reportDeadline:"2025-10-31", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin","directivo"],   specialReopenNote:"La reapertura requiere justificacion y visto bueno de direccion." },
  { id:"p4", name:"2025-Q4",    label:"Octubre – Dic 2025",   type:"quarterly", startDate:"2025-10-01", endDate:"2025-12-31", status:"closed", isDefault:false, captureDeadline:"2026-01-10", validationDeadline:"2026-01-20", reportDeadline:"2026-01-31", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin"],               specialReopenNote:"Disponible para ajustes extraordinarios de cierre anual." },
  { id:"p5", name:"2025-Anual", label:"Año fiscal 2025",      type:"annual",    startDate:"2025-01-01", endDate:"2025-12-31", status:"closed", isDefault:false, captureDeadline:"2026-01-31", validationDeadline:"2026-02-15", reportDeadline:"2026-02-28", lockCaptureOnClose:true,  allowSpecialReopen:false, specialReopenRoles:["admin"],               specialReopenNote:"" },
  { id:"p6", name:"2026-Q1",    label:"Enero – Marzo 2026",   type:"quarterly", startDate:"2026-01-01", endDate:"2026-03-31", status:"review", isDefault:false, captureDeadline:"2026-04-10", validationDeadline:"2026-04-20", reportDeadline:"2026-04-30", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin","directivo"],   specialReopenNote:"Se permite reapertura durante revision para correcciones validadas." },
  { id:"p7", name:"2026-Q2",    label:"Abril – Junio 2026",   type:"quarterly", startDate:"2026-04-01", endDate:"2026-06-30", status:"open",   isDefault:true,  captureDeadline:"2026-07-10", validationDeadline:"2026-07-20", reportDeadline:"2026-07-31", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin"],               specialReopenNote:"Reapertura reservada para ajustes posteriores al cierre." },
  { id:"p8", name:"2026-Q3",    label:"Julio – Sep 2026",     type:"quarterly", startDate:"2026-07-01", endDate:"2026-09-30", status:"open",   isDefault:false, captureDeadline:"2026-10-10", validationDeadline:"2026-10-20", reportDeadline:"2026-10-31", lockCaptureOnClose:true,  allowSpecialReopen:false, specialReopenRoles:["admin"],               specialReopenNote:"" },
  { id:"p9", name:"2026-Anual", label:"Año fiscal 2026",      type:"annual",    startDate:"2026-01-01", endDate:"2026-12-31", status:"open",   isDefault:false, captureDeadline:"2027-01-31", validationDeadline:"2027-02-15", reportDeadline:"2027-02-28", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin","directivo"],   specialReopenNote:"La reapertura anual queda restringida a perfiles de gobierno." },
];

export const periodTypes = [
  { value:"monthly",   label:"Mensual" },
  { value:"bimonthly", label:"Bimestral" },
  { value:"quarterly", label:"Trimestral" },
  { value:"semester",  label:"Semestral" },
  { value:"annual",    label:"Anual" },
];

/* ════════════════════════════════════════════════════════════════════════
   PART 3 — Factors, Capture, Devices, Records, Validation,
            Emissions, Goals, Alerts
   ════════════════════════════════════════════════════════════════════════ */

// ─── Emission Factors ───────────────────────────────────────────────────
export const emissionFactors = [
  { id:"f1", code:"GRID-MX-2026", name:"Red eléctrica nacional (MX)", scope:2, type:"electricity", unit:"kgCO2e/kWh",  value:0.435, source:"SENER 2026", validFrom:"2026-01-01", validUntil:"2026-12-31", status:"active",  version:"v3.0", official:true,  notes:"Factor oficial publicado por SENER en enero 2026." },
  { id:"f2", code:"NG-IPCC",      name:"Gas natural (IPCC)",         scope:1, type:"fuel",        unit:"kgCO2e/m3",   value:1.880, source:"IPCC 2019",  validFrom:"2025-01-01", validUntil:"2027-12-31", status:"active",  version:"v2.1", official:true,  notes:"" },
  { id:"f3", code:"DSL-IPCC",     name:"Diésel (IPCC)",              scope:1, type:"fuel",        unit:"kgCO2e/L",    value:2.680, source:"IPCC 2019",  validFrom:"2025-01-01", validUntil:"2027-12-31", status:"active",  version:"v2.1", official:true,  notes:"" },
  { id:"f4", code:"GLP-IPCC",     name:"Gas LP (IPCC)",              scope:1, type:"fuel",        unit:"kgCO2e/L",    value:1.610, source:"IPCC 2019",  validFrom:"2025-01-01", validUntil:"2027-12-31", status:"active",  version:"v2.1", official:true,  notes:"" },
  { id:"f5", code:"GSL-IPCC",     name:"Gasolina (IPCC)",            scope:1, type:"fuel",        unit:"kgCO2e/L",    value:2.310, source:"IPCC 2019",  validFrom:"2025-01-01", validUntil:"2027-12-31", status:"active",  version:"v2.1", official:true,  notes:"" },
  { id:"f6", code:"GRID-MX-2025", name:"Red eléctrica nacional (MX)", scope:2, type:"electricity", unit:"kgCO2e/kWh",  value:0.458, source:"SENER 2025", validFrom:"2025-01-01", validUntil:"2025-12-31", status:"expired", version:"v2.0", official:false, notes:"Factor vigente durante 2025." },
  { id:"f7", code:"WATER-CMT",    name:"Agua potable municipal",     scope:3, type:"water",       unit:"kgCO2e/m3",   value:0.344, source:"CONAGUA",    validFrom:"2025-01-01", validUntil:"2026-12-31", status:"draft",   version:"v1.0", official:false, notes:"En revisión interna." },
];

// factorId → array of historical versions
export const factorVersions = {
  "f1": [
    { version:"v3.0", value:0.435, changedAt:"2026-01-15", changedBy:"Sergio Arellano", note:"Actualización SENER 2026." },
    { version:"v2.0", value:0.458, changedAt:"2025-01-12", changedBy:"Sergio Arellano", note:"Actualización SENER 2025." },
    { version:"v1.0", value:0.494, changedAt:"2024-01-10", changedBy:"Admin",           note:"Carga inicial del factor." },
  ],
  "f2": [
    { version:"v2.1", value:1.880, changedAt:"2025-03-01", changedBy:"Sergio Arellano", note:"Ajuste menor IPCC." },
    { version:"v2.0", value:1.890, changedAt:"2024-06-15", changedBy:"Admin",           note:"Migración a IPCC 2019." },
  ],
  "f3": [
    { version:"v2.1", value:2.680, changedAt:"2025-03-01", changedBy:"Sergio Arellano", note:"Ajuste menor IPCC." },
  ],
  "f4": [
    { version:"v2.1", value:1.610, changedAt:"2025-03-01", changedBy:"Sergio Arellano", note:"Ajuste menor IPCC." },
  ],
  "f5": [
    { version:"v2.1", value:2.310, changedAt:"2025-03-01", changedBy:"Sergio Arellano", note:"Ajuste menor IPCC." },
  ],
  "f6": [
    { version:"v2.0", value:0.458, changedAt:"2025-01-12", changedBy:"Sergio Arellano", note:"Actualización SENER 2025." },
  ],
  "f7": [
    { version:"v1.0", value:0.344, changedAt:"2025-11-05", changedBy:"Ana Torres", note:"Borrador inicial pendiente de validación." },
  ],
};

// ─── Capture Configuration ──────────────────────────────────────────────
export const captureRules = [
  { id:"cr1", consumptionType:"Electricidad",  category:"Energía", scope:2, appliesTo:"global", areaRef:"",             mode:"manual",   frequency:"Mensual",  unit:"kWh",  evidenceRequired:true,  allowEstimated:false, allowPostEdit:false, requiresPreApproval:true,  validation:"strict",  responsibleRole:"operativo", autoCalc:true,  notes:"Captura manual con evidencia obligatoria (recibo CFE)." },
  { id:"cr2", consumptionType:"Electricidad",  category:"Energía", scope:2, appliesTo:"area",   areaRef:"Centro de Datos", mode:"device",   frequency:"Diaria",   unit:"kWh",  evidenceRequired:false, allowEstimated:false, allowPostEdit:false, requiresPreApproval:false, validation:"automatic", responsibleRole:"operativo", autoCalc:true,  notes:"Lectura automática desde medidores inteligentes." },
  { id:"cr3", consumptionType:"Gas natural",   category:"Combustión", scope:1, appliesTo:"category", areaRef:"Laboratorios", mode:"manual",   frequency:"Mensual",  unit:"m3",   evidenceRequired:true,  allowEstimated:true,  allowPostEdit:true,  requiresPreApproval:true,  validation:"strict",  responsibleRole:"operativo", autoCalc:true,  notes:"" },
  { id:"cr4", consumptionType:"Diésel",        category:"Combustión", scope:1, appliesTo:"global", areaRef:"",             mode:"file",     frequency:"Mensual",  unit:"L",    evidenceRequired:true,  allowEstimated:false, allowPostEdit:true,  requiresPreApproval:false, validation:"flexible", responsibleRole:"operativo", autoCalc:true,  notes:"Carga por archivo CSV con bitácora de despacho." },
  { id:"cr5", consumptionType:"Gas LP",        category:"Combustión", scope:1, appliesTo:"global", areaRef:"",             mode:"manual",   frequency:"Mensual",  unit:"L",    evidenceRequired:true,  allowEstimated:true,  allowPostEdit:false, requiresPreApproval:true,  validation:"strict",  responsibleRole:"operativo", autoCalc:true,  notes:"" },
  { id:"cr6", consumptionType:"Gasolina",      category:"Transporte", scope:1, appliesTo:"category", areaRef:"Flotilla", mode:"assisted", frequency:"Quincenal",unit:"L",    evidenceRequired:false, allowEstimated:true,  allowPostEdit:true,  requiresPreApproval:false, validation:"flexible", responsibleRole:"operativo", autoCalc:true,  notes:"Captura asistida vía formulario móvil." },
  { id:"cr7", consumptionType:"Agua",          category:"Recursos",   scope:3, appliesTo:"global", areaRef:"",             mode:"api",      frequency:"Diaria",   unit:"m3",   evidenceRequired:false, allowEstimated:false, allowPostEdit:false, requiresPreApproval:false, validation:"automatic", responsibleRole:"operativo", autoCalc:false, notes:"Sincronización con API municipal (en piloto)." },
];

export const captureModes = [
  { id:"manual",   label:"Manual",      icon:"Edit3",       color:"#2563EB" },
  { id:"assisted", label:"Asistida",    icon:"Wand2",       color:"#7C3AED" },
  { id:"device",   label:"Dispositivo", icon:"Cpu",         color:"#059669" },
  { id:"api",      label:"API externa", icon:"Plug",        color:"#0891B2" },
  { id:"file",     label:"Archivo",     icon:"FileSpreadsheet", color:"#EA580C" },
];

// ─── Devices & Integrations ─────────────────────────────────────────────
export const devices = [
  { id:"d1",  name:"Medidor CFE Edif. A",   type:"electric_meter", protocol:"Modbus TCP", areaId:"e1",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T08:00:00Z", lastValue:"1,245.6 kWh", health:98, ip:"192.168.10.21", serial:"SM-CC-001", installedAt:"2025-02-10", firmware:"v2.14.3", frequency:"15 min", assignedTo:"Carlos Méndez" },
  { id:"d2",  name:"Medidor CFE Edif. B",   type:"electric_meter", protocol:"Modbus TCP", areaId:"e2",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T08:00:00Z", lastValue:"2,108.3 kWh", health:96, ip:"192.168.10.22", serial:"SM-CC-002", installedAt:"2025-02-10", firmware:"v2.14.3", frequency:"15 min", assignedTo:"Carlos Méndez" },
  { id:"d3",  name:"Medidor CFE Edif. C",   type:"electric_meter", protocol:"Modbus TCP", areaId:"e3",  campusId:"campus-central", status:"warning", lastReading:"2026-04-11T05:30:00Z", lastValue:"890.2 kWh",   health:72, ip:"192.168.10.23", serial:"SM-CC-003", installedAt:"2025-02-10", firmware:"v2.14.1", frequency:"15 min", assignedTo:"Carlos Méndez" },
  { id:"d4",  name:"Medidor Gas Lab Quim.", type:"gas_meter",      protocol:"BACnet",     areaId:"e7",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T07:45:00Z", lastValue:"45.8 m3",     health:94, ip:"192.168.10.30", serial:"GM-CC-001", installedAt:"2025-04-15", firmware:"v1.8.0",  frequency:"1 h",    assignedTo:"Ana Torres" },
  { id:"d5",  name:"Sensor Diésel Taller",  type:"flow_sensor",    protocol:"Modbus RTU", areaId:"e9",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T07:00:00Z", lastValue:"32.4 L",      health:91, ip:"-",             serial:"FS-CC-001", installedAt:"2025-05-20", firmware:"v1.2.5",  frequency:"1 h",    assignedTo:"María López" },
  { id:"d6",  name:"Medidor Norte Edif. A", type:"electric_meter", protocol:"Modbus TCP", areaId:"e12", campusId:"campus-norte",   status:"online",  lastReading:"2026-04-11T08:00:00Z", lastValue:"1,567.8 kWh", health:95, ip:"192.168.20.21", serial:"SM-CN-001", installedAt:"2025-03-12", firmware:"v2.14.3", frequency:"15 min", assignedTo:"Diego Herrera" },
  { id:"d7",  name:"Medidor Nave Industrial",type:"electric_meter",protocol:"Modbus TCP", areaId:"e13", campusId:"campus-norte",   status:"offline", lastReading:"2026-04-09T22:30:00Z", lastValue:"3,210.5 kWh", health:0,  ip:"192.168.20.22", serial:"SM-CN-002", installedAt:"2025-03-12", firmware:"v2.13.9", frequency:"15 min", assignedTo:"Diego Herrera" },
  { id:"d8",  name:"API CONAGUA Sur",       type:"api_integration",protocol:"REST",       areaId:"e17", campusId:"campus-sur",     status:"online",  lastReading:"2026-04-11T06:00:00Z", lastValue:"125 m3",      health:99, ip:"api.conagua.gob.mx", serial:"-",        installedAt:"2025-08-01", firmware:"—",        frequency:"6 h",    assignedTo:"Sofía Medina" },
  { id:"d9",  name:"Medidor Lab Materiales",type:"electric_meter", protocol:"Modbus TCP", areaId:"e15", campusId:"campus-norte",   status:"warning", lastReading:"2026-04-11T07:15:00Z", lastValue:"678.2 kWh",   health:65, ip:"192.168.20.30", serial:"SM-CN-003", installedAt:"2025-04-01", firmware:"v2.14.0", frequency:"15 min", assignedTo:"Pedro Ramírez" },
  { id:"d10", name:"Sensor GLP Cafetería",  type:"flow_sensor",    protocol:"Modbus RTU", areaId:"e11", campusId:"campus-central", status:"offline", lastReading:"2026-04-08T14:00:00Z", lastValue:"18.2 L",      health:0,  ip:"-",             serial:"FS-CC-002", installedAt:"2025-09-10", firmware:"v1.2.3",  frequency:"1 h",    assignedTo:"Carlos Méndez" },
];

export const deviceIntegrations = [
  {
    id:"int1", name:"API CONAGUA Sur", provider:"CONAGUA", deviceId:"d8",
    endpoint:"https://api.conagua.gob.mx/v1/consumo", authType:"API Key",
    syncFrequency:"Cada 6 horas", lastSync:"2026-04-11T06:00:00Z",
    status:"online", recordsPulled:184,
  },
  {
    id:"int2", name:"CFE Facturación", provider:"CFE", deviceId:null,
    endpoint:"https://factura.cfe.mx/api/consumo", authType:"OAuth 2.0",
    syncFrequency:"Mensual", lastSync:"2026-04-01T03:15:00Z",
    status:"online", recordsPulled:36,
  },
  {
    id:"int3", name:"Pemex Despacho", provider:"Pemex", deviceId:null,
    endpoint:"https://despacho.pemex.com/api/v2/consumo", authType:"Token",
    syncFrequency:"Diaria", lastSync:"2026-04-10T23:45:00Z",
    status:"warning", recordsPulled:58,
  },
];

export const integrationLogs = [
  { id:"il1", integrationId:"int1", ts:"2026-04-11T06:00:00Z", level:"info",    message:"Sincronización completada: 8 lecturas nuevas." },
  { id:"il2", integrationId:"int1", ts:"2026-04-11T00:00:00Z", level:"info",    message:"Sincronización completada: 8 lecturas nuevas." },
  { id:"il3", integrationId:"int2", ts:"2026-04-01T03:15:00Z", level:"info",    message:"Descarga mensual de facturación CFE exitosa." },
  { id:"il4", integrationId:"int3", ts:"2026-04-10T23:45:00Z", level:"warning", message:"Respuesta con campos faltantes en 2 de 60 registros." },
  { id:"il5", integrationId:"int3", ts:"2026-04-09T23:45:00Z", level:"info",    message:"Sincronización diaria completada." },
];

export const deviceTypes = [
  { id:"electric_meter", label:"Medidor eléctrico", icon:"Zap",      color:"#2563EB" },
  { id:"gas_meter",      label:"Medidor de gas",    icon:"Flame",    color:"#EA580C" },
  { id:"flow_sensor",    label:"Sensor de flujo",   icon:"Activity", color:"#059669" },
  { id:"api_integration",label:"Integración API",   icon:"Plug",     color:"#7C3AED" },
];

export const deviceLogs = [
  { id:"dl1", deviceId:"d3",  ts:"2026-04-11T05:30:00Z", level:"warning", message:"Lectura fuera de rango esperado (delta -42%)." },
  { id:"dl2", deviceId:"d7",  ts:"2026-04-09T22:30:00Z", level:"error",   message:"Conexión perdida con dispositivo." },
  { id:"dl3", deviceId:"d10", ts:"2026-04-08T14:00:00Z", level:"error",   message:"Tiempo de espera agotado en lectura." },
  { id:"dl4", deviceId:"d9",  ts:"2026-04-11T07:15:00Z", level:"warning", message:"Health degradado (65%)." },
  { id:"dl5", deviceId:"d1",  ts:"2026-04-11T08:00:00Z", level:"info",    message:"Lectura normal completada." },
  { id:"dl6", deviceId:"d2",  ts:"2026-04-11T08:00:00Z", level:"info",    message:"Lectura normal completada." },
];

// ─── Records ────────────────────────────────────────────────────────────
export const records = [
  { id:"r1",  date:"2026-04-10", periodId:"p7", consumptionType:"Electricidad", areaId:"e1",  areaName:"Edificio A – Rectoría",  value:1245.6, unit:"kWh",  factorId:"f1", emissions:541.84, captureMode:"device",   capturedBy:"Sistema",        status:"validated", evidenceCount:0, anomaly:false, notes:"" },
  { id:"r2",  date:"2026-04-10", periodId:"p7", consumptionType:"Electricidad", areaId:"e2",  areaName:"Edificio B – Ciencias",   value:2108.3, unit:"kWh",  factorId:"f1", emissions:917.11, captureMode:"device",   capturedBy:"Sistema",        status:"validated", evidenceCount:0, anomaly:false, notes:"" },
  { id:"r3",  date:"2026-04-10", periodId:"p7", consumptionType:"Electricidad", areaId:"e3",  areaName:"Edificio C – Ingenierías",value:890.2,  unit:"kWh",  factorId:"f1", emissions:387.24, captureMode:"device",   capturedBy:"Sistema",        status:"pending",   evidenceCount:0, anomaly:true,  notes:"Lectura anómala detectada por delta -42%." },
  { id:"r4",  date:"2026-04-09", periodId:"p7", consumptionType:"Gas natural",  areaId:"e7",  areaName:"Laboratorio de Química",  value:45.8,   unit:"m3",   factorId:"f2", emissions:86.10,  captureMode:"manual",   capturedBy:"Carlos Méndez",  status:"pending",   evidenceCount:1, anomaly:false, notes:"" },
  { id:"r5",  date:"2026-04-08", periodId:"p7", consumptionType:"Diésel",       areaId:"e9",  areaName:"Taller de Mecánica",      value:32.4,   unit:"L",    factorId:"f3", emissions:86.83,  captureMode:"file",     capturedBy:"María López",    status:"validated", evidenceCount:1, anomaly:false, notes:"" },
  { id:"r6",  date:"2026-04-07", periodId:"p7", consumptionType:"Electricidad", areaId:"e12", areaName:"Edificio Principal",      value:1567.8, unit:"kWh",  factorId:"f1", emissions:681.99, captureMode:"device",   capturedBy:"Sistema",        status:"validated", evidenceCount:0, anomaly:false, notes:"" },
  { id:"r7",  date:"2026-04-07", periodId:"p7", consumptionType:"Gas LP",       areaId:"e11", areaName:"Cafetería Central",       value:18.2,   unit:"L",    factorId:"f4", emissions:29.30,  captureMode:"manual",   capturedBy:"Carlos Méndez",  status:"rejected",  evidenceCount:0, anomaly:true,  notes:"Sin evidencia adjunta — rechazado." },
  { id:"r8",  date:"2026-04-06", periodId:"p7", consumptionType:"Gasolina",     areaId:"e3",  areaName:"Edificio C – Ingenierías",value:78.5,   unit:"L",    factorId:"f5", emissions:181.34, captureMode:"assisted", capturedBy:"Pedro Ramírez",  status:"pending",   evidenceCount:1, anomaly:false, notes:"" },
  { id:"r9",  date:"2026-04-05", periodId:"p7", consumptionType:"Electricidad", areaId:"e15", areaName:"Laboratorio de Materiales",value:678.2, unit:"kWh", factorId:"f1", emissions:295.02, captureMode:"device",   capturedBy:"Sistema",        status:"pending",   evidenceCount:0, anomaly:true,  notes:"Health del medidor en 65%." },
  { id:"r10", date:"2026-04-04", periodId:"p7", consumptionType:"Diésel",       areaId:"e13", areaName:"Nave Industrial",         value:120.0,  unit:"L",    factorId:"f3", emissions:321.60, captureMode:"file",     capturedBy:"Diego Herrera",  status:"validated", evidenceCount:2, anomaly:false, notes:"" },
  { id:"r11", date:"2026-04-03", periodId:"p7", consumptionType:"Electricidad", areaId:"e17", areaName:"Edificio Administrativo Sur",value:456.7,unit:"kWh",factorId:"f1",emissions:198.66, captureMode:"manual",   capturedBy:"Sofía Medina",   status:"pending",   evidenceCount:1, anomaly:false, notes:"" },
  { id:"r12", date:"2026-04-02", periodId:"p7", consumptionType:"Agua",         areaId:"e17", areaName:"Edificio Administrativo Sur",value:125,  unit:"m3", factorId:"f7", emissions:43.00,  captureMode:"api",      capturedBy:"Sistema",        status:"pending",   evidenceCount:0, anomaly:false, notes:"Factor en borrador." },
];

export const recordEvidence = {
  "r4":  [{ id:"ev1", name:"recibo-gas-marzo.pdf",     type:"pdf", size:"245 KB", uploadedAt:"2026-04-09" }],
  "r5":  [{ id:"ev2", name:"bitacora-despacho.csv",    type:"csv", size:"12 KB",  uploadedAt:"2026-04-08" }],
  "r8":  [{ id:"ev3", name:"ticket-gasolinera.jpg",    type:"jpg", size:"890 KB", uploadedAt:"2026-04-06" }],
  "r10": [
    { id:"ev4", name:"factura-diesel-abril.pdf",       type:"pdf", size:"312 KB", uploadedAt:"2026-04-04" },
    { id:"ev5", name:"vale-despacho.pdf",              type:"pdf", size:"98 KB",  uploadedAt:"2026-04-04" },
  ],
  "r11": [{ id:"ev6", name:"recibo-cfe-marzo.pdf",     type:"pdf", size:"267 KB", uploadedAt:"2026-04-03" }],
};

export const recordTraceability = {
  "r4": [
    { ts:"2026-04-09T10:15:00Z", actor:"Carlos Méndez", action:"Capturó el registro" },
    { ts:"2026-04-09T10:16:00Z", actor:"Sistema",       action:"Calculó emisiones automáticamente" },
    { ts:"2026-04-09T11:00:00Z", actor:"Sistema",       action:"Marcó como pendiente de validación" },
  ],
  "r5": [
    { ts:"2026-04-08T08:30:00Z", actor:"María López",   action:"Cargó archivo CSV" },
    { ts:"2026-04-08T08:31:00Z", actor:"Sistema",       action:"Calculó emisiones automáticamente" },
    { ts:"2026-04-08T14:20:00Z", actor:"Ana Torres",    action:"Validó el registro" },
  ],
};

// ─── Validation Queue ───────────────────────────────────────────────────
export const validationQueue = [
  { id:"v1", recordId:"r3",  priority:"high",   reason:"Anomalía detectada (-42% delta)",     submittedAt:"2026-04-10T05:30:00Z", submittedBy:"Sistema",        assignedTo:"Ana Torres" },
  { id:"v2", recordId:"r4",  priority:"normal", reason:"Captura manual con evidencia",         submittedAt:"2026-04-09T10:16:00Z", submittedBy:"Carlos Méndez",  assignedTo:"Ana Torres" },
  { id:"v3", recordId:"r8",  priority:"normal", reason:"Captura asistida pendiente revisión",  submittedAt:"2026-04-06T13:00:00Z", submittedBy:"Pedro Ramírez",  assignedTo:"María López" },
  { id:"v4", recordId:"r9",  priority:"high",   reason:"Health del dispositivo bajo (65%)",    submittedAt:"2026-04-05T07:15:00Z", submittedBy:"Sistema",        assignedTo:"Ana Torres" },
  { id:"v5", recordId:"r11", priority:"low",    reason:"Captura manual estándar",              submittedAt:"2026-04-03T16:00:00Z", submittedBy:"Sofía Medina",   assignedTo:"María López" },
  { id:"v6", recordId:"r12", priority:"normal", reason:"Factor en borrador — verificar",       submittedAt:"2026-04-02T07:30:00Z", submittedBy:"Sistema",        assignedTo:"Ana Torres" },
];

export const validationDecisions = [
  { id:"vd1", recordId:"r5",  decision:"approved",  actor:"Ana Torres",  ts:"2026-04-08T14:20:00Z", comment:"Archivo CSV consistente con despacho de diésel." },
  { id:"vd2", recordId:"r7",  decision:"rejected",  actor:"Ana Torres",  ts:"2026-04-07T16:40:00Z", comment:"Sin evidencia adjunta del recibo de gas LP." },
  { id:"vd3", recordId:"r10", decision:"approved",  actor:"María López", ts:"2026-04-04T12:00:00Z", comment:"Factura y vale coinciden." },
  { id:"vd4", recordId:"r4",  decision:"returned",  actor:"Ana Torres",  ts:"2026-04-09T12:30:00Z", comment:"Falta especificar turno y medidor de referencia. Se devuelve para corrección." },
];

export const validationCriteria = [
  { id:"vc1", label:"Evidencia adjunta",                  required:true  },
  { id:"vc2", label:"Valor dentro del rango histórico",   required:true  },
  { id:"vc3", label:"Factor de emisión vigente",          required:true  },
  { id:"vc4", label:"Responsable identificado",           required:true  },
  { id:"vc5", label:"Sin anomalías detectadas",           required:false },
  { id:"vc6", label:"Periodo abierto",                    required:true  },
];

// ─── Emission Calculations ──────────────────────────────────────────────
export const emissionCalculations = [
  { id:"ec1", scope:1, source:"Gas natural",  area:"Laboratorio de Química",     period:"2026-Q2", consumption:45.8,   unit:"m3",  factor:1.880, emissions:86.10,  trend:"+2.3%" },
  { id:"ec2", scope:1, source:"Diésel",       area:"Taller de Mecánica",         period:"2026-Q2", consumption:32.4,   unit:"L",   factor:2.680, emissions:86.83,  trend:"-1.5%" },
  { id:"ec3", scope:1, source:"Diésel",       area:"Nave Industrial",            period:"2026-Q2", consumption:120.0,  unit:"L",   factor:2.680, emissions:321.60, trend:"+5.2%" },
  { id:"ec4", scope:1, source:"Gas LP",       area:"Cafetería Central",          period:"2026-Q2", consumption:18.2,   unit:"L",   factor:1.610, emissions:29.30,  trend:"-3.0%" },
  { id:"ec5", scope:1, source:"Gasolina",     area:"Edificio C – Ingenierías",   period:"2026-Q2", consumption:78.5,   unit:"L",   factor:2.310, emissions:181.34, trend:"+0.8%" },
  { id:"ec6", scope:2, source:"Electricidad", area:"Edificio A – Rectoría",      period:"2026-Q2", consumption:1245.6, unit:"kWh", factor:0.435, emissions:541.84, trend:"-2.1%" },
  { id:"ec7", scope:2, source:"Electricidad", area:"Edificio B – Ciencias",      period:"2026-Q2", consumption:2108.3, unit:"kWh", factor:0.435, emissions:917.11, trend:"+1.4%" },
  { id:"ec8", scope:2, source:"Electricidad", area:"Edificio C – Ingenierías",   period:"2026-Q2", consumption:890.2,  unit:"kWh", factor:0.435, emissions:387.24, trend:"-8.5%" },
  { id:"ec9", scope:2, source:"Electricidad", area:"Edificio Principal (Norte)", period:"2026-Q2", consumption:1567.8, unit:"kWh", factor:0.435, emissions:681.99, trend:"+3.2%" },
];

export const emissionSummary = {
  totalScope1: 705.17,
  totalScope2: 2528.18,
  totalScope3: 43.00,
  total:       3276.35,
  unit:        "kgCO2e",
  period:      "2026-Q2",
  vsLastPeriod: -1.8,
};

export const recalculationHistory = [
  { id:"rh1", ts:"2026-04-10T08:00:00Z", trigger:"Actualización factor f1 (v3.0)", recordsAffected:6, deltaEmissions:-58.42, by:"Sergio Arellano" },
  { id:"rh2", ts:"2026-03-15T10:30:00Z", trigger:"Corrección manual r5",            recordsAffected:1, deltaEmissions:+12.10, by:"María López" },
  { id:"rh3", ts:"2026-02-20T14:00:00Z", trigger:"Cierre periodo 2025-Q4",          recordsAffected:142,deltaEmissions:0,     by:"Sistema" },
];

// ─── Goals & Actions ────────────────────────────────────────────────────
export const goals = [
  { id:"g1", name:"Reducir Scope 2 -15% vs 2024", scope:2, target:-15,  baseline:5400, current:4590, unit:"kgCO2e", progress:78, status:"in_progress", deadline:"2026-12-31", responsible:"Ana Torres",      areas:["Edificio A – Rectoría","Edificio B – Ciencias"], description:"Meta institucional de reducción de electricidad.", notes:"Revisión trimestral en curso. Buen avance gracias al cambio a LED.", linkedRecords:["r1","r2","r6"] },
  { id:"g2", name:"Reducir Gas natural -10%",      scope:1, target:-10,  baseline:600,  current:540,  unit:"kgCO2e", progress:60, status:"in_progress", deadline:"2026-12-31", responsible:"Carlos Méndez",   areas:["Laboratorio de Química"], description:"", notes:"", linkedRecords:["r4"] },
  { id:"g3", name:"Cero diésel en flotilla",       scope:1, target:-100, baseline:400,  current:387,  unit:"kgCO2e", progress:13, status:"in_progress", deadline:"2027-12-31", responsible:"Diego Herrera",   areas:["Nave Industrial","Taller de Mecánica"], description:"Migración gradual a electromovilidad.", notes:"Depende de asignación presupuestal 2027.", linkedRecords:["r5","r10"] },
  { id:"g4", name:"Eficiencia energética Norte",   scope:2, target:-12,  baseline:2200, current:2100, unit:"kgCO2e", progress:38, status:"in_progress", deadline:"2026-12-31", responsible:"Diego Herrera",   areas:["Edificio Principal","Nave Industrial"], description:"", notes:"", linkedRecords:["r6","r7"] },
  { id:"g5", name:"Carbono neutro 2030",            scope:0, target:-100, baseline:13000,current:11800,unit:"kgCO2e", progress:9,  status:"in_progress", deadline:"2030-12-31", responsible:"Dr. Roberto Garza", areas:["Todos"], description:"Meta institucional de largo plazo.", notes:"Compromiso publicado en reporte institucional 2025.", linkedRecords:[] },
  { id:"g6", name:"Reducir consumo de agua -8%",   scope:3, target:-8,   baseline:500,  current:495,  unit:"kgCO2e", progress:12, status:"at_risk",     deadline:"2026-12-31", responsible:"Lic. Camila Ortiz", areas:["Campus Sur"], description:"En riesgo por temporada seca.", notes:"Requiere plan de acción correctivo antes de junio.", linkedRecords:["r12"] },
];

export const goalActions = [
  { id:"ga1", goalId:"g1", title:"Cambio a iluminación LED en Edificio A",    kind:"preventive", status:"completed",  due:"2026-02-28", responsible:"Pedro Ramírez", impact:"-120 kgCO2e/mes" },
  { id:"ga2", goalId:"g1", title:"Sensor de presencia en aulas Edif. B",     kind:"preventive", status:"in_progress",due:"2026-05-30", responsible:"Pedro Ramírez", impact:"-80 kgCO2e/mes" },
  { id:"ga3", goalId:"g1", title:"Auditoría energética laboratorios",        kind:"preventive", status:"pending",    due:"2026-06-30", responsible:"Andrés Navarro", impact:"-200 kgCO2e/mes" },
  { id:"ga4", goalId:"g2", title:"Calibración calderas Lab Química",         kind:"corrective", status:"completed",  due:"2026-03-15", responsible:"Carlos Méndez", impact:"-40 kgCO2e/mes" },
  { id:"ga5", goalId:"g2", title:"Sustitución por equipos eléctricos",       kind:"preventive", status:"in_progress",due:"2026-09-30", responsible:"Carlos Méndez", impact:"-60 kgCO2e/mes" },
  { id:"ga6", goalId:"g3", title:"Compra de 2 vehículos eléctricos",         kind:"preventive", status:"pending",    due:"2026-12-31", responsible:"Diego Herrera", impact:"-150 kgCO2e/mes" },
  { id:"ga7", goalId:"g4", title:"Aislamiento térmico Edif. Principal",      kind:"preventive", status:"in_progress",due:"2026-08-15", responsible:"Diego Herrera", impact:"-90 kgCO2e/mes" },
  { id:"ga8", goalId:"g6", title:"Sistema de captación de agua de lluvia",   kind:"corrective", status:"at_risk",    due:"2026-07-30", responsible:"Camila Ortiz",  impact:"-30 kgCO2e/mes" },
];

// ─── Alerts & Notifications ─────────────────────────────────────────────
export const alertRules = [
  { id:"ar1", name:"Dispositivo desconectado",       type:"device",       condition:"sin lectura > 24h",     severity:"critical", priority:"high",   frequency:"immediate", channels:["email","push","inapp"], recipients:["admin","Ing. Ricardo Luna","Mantenimiento"], enabled:true,  triggeredCount:8 },
  { id:"ar2", name:"Lectura fuera de rango",         type:"anomaly",      condition:"delta > 30% vs media",  severity:"warning",  priority:"normal", frequency:"immediate", channels:["email","inapp"],        recipients:["Dra. Ana Torres","María López"],             enabled:true,  triggeredCount:23 },
  { id:"ar3", name:"Factor de emisión vencido",      type:"factor",       condition:"validUntil < hoy",      severity:"critical", priority:"high",   frequency:"daily",     channels:["email","inapp"],        recipients:["admin","Sergio Arellano"],                   enabled:true,  triggeredCount:1 },
  { id:"ar4", name:"Periodo próximo a cerrar",       type:"period",       condition:"endDate <= 7 días",     severity:"info",     priority:"low",    frequency:"daily",     channels:["email","inapp"],        recipients:["directivo","operativo"],                     enabled:true,  triggeredCount:2 },
  { id:"ar5", name:"Meta en riesgo",                 type:"goal",         condition:"progreso < 50% al 75% del plazo", severity:"warning", priority:"high", frequency:"weekly", channels:["email","inapp"], recipients:["Dra. Ana Torres","Dr. Roberto Garza"], enabled:true, triggeredCount:1 },
  { id:"ar6", name:"Registro pendiente > 5 días",    type:"validation",   condition:"submittedAt > 5 días",  severity:"warning",  priority:"normal", frequency:"daily",     channels:["inapp"],                recipients:["Validadores"],                                enabled:true,  triggeredCount:5 },
  { id:"ar7", name:"Login fallido reiterado",        type:"security",     condition:"5 intentos en 10 min",  severity:"critical", priority:"high",   frequency:"immediate", channels:["email"],                recipients:["admin"],                                      enabled:false, triggeredCount:0 },
];

export const notificationTemplates = [
  { id:"nt-1", name:"Dispositivo desconectado",      subject:"[CarbonTrack] Dispositivo {{deviceName}} sin reporte", body:"El dispositivo {{deviceName}} en {{areaName}} no ha enviado lectura desde {{lastReading}}.", channel:"email" },
  { id:"nt-2", name:"Anomalía detectada",            subject:"[CarbonTrack] Lectura anómala en {{areaName}}",         body:"Se detectó una variación de {{delta}}% en la lectura del {{date}}.",                          channel:"email" },
  { id:"nt-3", name:"Factor vencido",                subject:"[CarbonTrack] Factor {{factorCode}} vencido",            body:"El factor {{factorCode}} venció el {{validUntil}}. Actualícelo lo antes posible.",          channel:"email" },
  { id:"nt-4", name:"Cierre de periodo",             subject:"[CarbonTrack] Periodo {{periodName}} próximo a cerrar",  body:"El periodo {{periodName}} cierra el {{endDate}}. Captura pendiente: {{pendingCount}}.",       channel:"email" },
];

export const notificationHistory = [
  { id:"nh1", ts:"2026-04-11T06:30:00Z", ruleId:"ar1", title:"Dispositivo Medidor Nave Industrial sin reporte",   recipients:3, status:"sent",   channel:"email" },
  { id:"nh2", ts:"2026-04-10T22:00:00Z", ruleId:"ar3", title:"Factor GRID-MX-2025 vencido",                       recipients:2, status:"sent",   channel:"email" },
  { id:"nh3", ts:"2026-04-10T05:30:00Z", ruleId:"ar2", title:"Lectura anómala en Edificio C",                     recipients:4, status:"sent",   channel:"email" },
  { id:"nh4", ts:"2026-04-09T18:45:00Z", ruleId:"ar4", title:"Periodo 2026-Q1 cierre en 7 días",                  recipients:8, status:"sent",   channel:"email" },
  { id:"nh5", ts:"2026-04-09T10:15:00Z", ruleId:"ar5", title:"Meta Reducir consumo de agua en riesgo",            recipients:2, status:"sent",   channel:"email" },
  { id:"nh6", ts:"2026-04-08T14:00:00Z", ruleId:"ar1", title:"Sensor GLP Cafetería sin reporte",                  recipients:3, status:"sent",   channel:"email" },
  { id:"nh7", ts:"2026-04-07T09:00:00Z", ruleId:"ar6", title:"5 registros pendientes > 5 días",                   recipients:2, status:"failed", channel:"email" },
];

export const notificationChannels = [
  { id:"email",  label:"Correo",       icon:"Mail" },
  { id:"push",   label:"Push",         icon:"Bell" },
  { id:"inapp",  label:"En la app",    icon:"MessageSquare" },
  { id:"sms",    label:"SMS",          icon:"Smartphone" },
];
