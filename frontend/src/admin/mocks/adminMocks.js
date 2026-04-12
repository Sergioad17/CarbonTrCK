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
      { id: "admin-factors",        label: "Factores",                  icon: "FlaskConical",   enabled: false },
      { id: "admin-capture",        label: "Captura de datos",          icon: "ClipboardEdit",  enabled: false },
      { id: "admin-devices",        label: "Dispositivos",              icon: "Cpu",            enabled: false },
      { id: "admin-records",        label: "Registros",                 icon: "Database",       enabled: false },
    ],
  },
  {
    section: "Control",
    enabled: false,
    items: [
      { id: "admin-validation",     label: "Validación y aprobación",   icon: "CheckSquare",    enabled: false },
      { id: "admin-emissions",      label: "Emisiones y cálculo",       icon: "Calculator",     enabled: false },
      { id: "admin-targets",        label: "Metas y acciones",          icon: "Target",         enabled: false },
      { id: "admin-alerts",         label: "Alertas y notificaciones",  icon: "Bell",           enabled: false },
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
