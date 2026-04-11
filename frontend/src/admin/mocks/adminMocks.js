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
  { id: "new-user",      label: "Nuevo usuario",       icon: "UserPlus",       viewId: "admin-users",    available: false },
  { id: "new-period",    label: "Abrir periodo",        icon: "CalendarPlus",   viewId: "admin-periods",  available: false },
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
    enabled: false,
    items: [
      { id: "admin-users",          label: "Usuarios y permisos",       icon: "Users",          enabled: false },
      { id: "admin-org",            label: "Estructura organizacional", icon: "Network",        enabled: false },
      { id: "admin-catalogs",       label: "Catálogos",                 icon: "BookOpen",       enabled: false },
      { id: "admin-periods",        label: "Periodos",                  icon: "Calendar",       enabled: false },
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
