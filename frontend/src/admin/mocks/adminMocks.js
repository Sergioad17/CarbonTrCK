/* --- CarbonTrack Admin - Centralized Mock Data -------------------------
   All shapes mirror future API contracts.
   Replace each export with a real fetch when backend is ready.
   ------------------------------------------------------------------------ */

// --- Overview KPIs ------------------------------------------------------
// Admin navigation tree
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
    section: "Control IA",
    enabled: true,
    items: [
      { id: "admin-ai",             label: "Inteligencia artificial",   icon: "Sparkles",       enabled: true },
      { id: "admin-ai-training",    label: "Entrenamiento IA",          icon: "Brain",          enabled: true },
    ],
  },
  {
    section: "Soporte",
    enabled: true,
    items: [
      { id: "admin-reports",        label: "Reportes y exportaciones",  icon: "FileBarChart",   enabled: true },
      { id: "admin-backups",        label: "Respaldos y mantenimiento", icon: "HardDrive",      enabled: true },
      { id: "admin-help",           label: "Ayuda y documentación",     icon: "LifeBuoy",       enabled: true },
    ],
  },
];

/* ------------------------------------------------------------------------
   PART 2 - Users, Org Structure, Catalogs, Periods
   ------------------------------------------------------------------------ */

// --- Roles --------------------------------------------------------------
export const roles = [
  { id: "admin",     label: "Administrador", description: "Acceso total al sistema, gestión de usuarios y configuración.",    color: "#7C3AED", userCount: 2,  enabled: true  },
  { id: "directivo", label: "Directivo",     description: "Visibilidad completa, aprobación de metas y reportes ejecutivos.", color: "#2563EB", userCount: 4,  enabled: true  },
  { id: "operativo", label: "Operativo",     description: "Captura de datos, registro de consumos y gestión de evidencias.",  color: "#059669", userCount: 14, enabled: true  },
  { id: "consulta",  label: "Solo lectura",  description: "Visualización de dashboards y reportes sin capacidad de edición.", color: "#64748B", userCount: 0,  enabled: false },
];

// --- Permission modules & actions ---------------------------------------
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

// roleId -> moduleId -> actionId -> "active" | "blocked" | "inherited"
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

// --- Users --------------------------------------------------------------
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

// --- Campuses -----------------------------------------------------------
export const campuses = [
  { id:"campus-central", name:"Campus Central", code:"CC", city:"Monterrey",   responsible:"Dr. Roberto Garza",    status:"active", buildingCount:8, areaCount:15 },
  { id:"campus-norte",   name:"Campus Norte",   code:"CN", city:"San Nicolás", responsible:"Dra. Gabriela Flores", status:"active", buildingCount:4, areaCount:9 },
  { id:"campus-sur",     name:"Campus Sur",     code:"CS", city:"San Pedro",   responsible:"Lic. Camila Ortiz",    status:"active", buildingCount:3, areaCount:6 },
];

// --- Org Entities (tree) ------------------------------------------------
export const orgEntities = [
  { id:"e1",  name:"Edificio A - Rectoría",      type:"building",   code:"CC-A",    campusId:"campus-central", parentId:null,  responsible:"Dr. Roberto Garza",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:true,  description:"Edificio principal administrativo." },
  { id:"e2",  name:"Edificio B - Ciencias",       type:"building",   code:"CC-B",    campusId:"campus-central", parentId:null,  responsible:"Dr. Andrés Navarro",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Laboratorios y aulas de ciencias." },
  { id:"e3",  name:"Edificio C - Ingenierías",    type:"building",   code:"CC-C",    campusId:"campus-central", parentId:null,  responsible:"Ing. Pedro Ramírez",   status:"active",   usesElectricity:true,  usesFuel:true,  hasDevices:true,  inReductionGoals:true,  description:"Talleres y laboratorios de ingeniería." },
  { id:"e4",  name:"Edificio D - Biblioteca",     type:"building",   code:"CC-D",    campusId:"campus-central", parentId:null,  responsible:"Lic. Sofía Medina",    status:"active",   usesElectricity:true,  usesFuel:false, hasDevices:true,  inReductionGoals:false, description:"Biblioteca central y salas de estudio." },
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

// --- Periods ------------------------------------------------------------
export const periods = [
  { id:"p1", name:"2025-Q1",    label:"Enero - Marzo 2025",   type:"quarterly", startDate:"2025-01-01", endDate:"2025-03-31", status:"closed", isDefault:false, captureDeadline:"2025-04-10", validationDeadline:"2025-04-20", reportDeadline:"2025-04-30", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin"],               specialReopenNote:"Solo administracion central puede autorizar reapertura por auditoria." },
  { id:"p2", name:"2025-Q2",    label:"Abril - Junio 2025",   type:"quarterly", startDate:"2025-04-01", endDate:"2025-06-30", status:"closed", isDefault:false, captureDeadline:"2025-07-10", validationDeadline:"2025-07-20", reportDeadline:"2025-07-31", lockCaptureOnClose:true,  allowSpecialReopen:false, specialReopenRoles:["admin"],               specialReopenNote:"" },
  { id:"p3", name:"2025-Q3",    label:"Julio - Sep 2025",     type:"quarterly", startDate:"2025-07-01", endDate:"2025-09-30", status:"closed", isDefault:false, captureDeadline:"2025-10-10", validationDeadline:"2025-10-20", reportDeadline:"2025-10-31", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin","directivo"],   specialReopenNote:"La reapertura requiere justificacion y visto bueno de direccion." },
  { id:"p4", name:"2025-Q4",    label:"Octubre - Dic 2025",   type:"quarterly", startDate:"2025-10-01", endDate:"2025-12-31", status:"closed", isDefault:false, captureDeadline:"2026-01-10", validationDeadline:"2026-01-20", reportDeadline:"2026-01-31", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin"],               specialReopenNote:"Disponible para ajustes extraordinarios de cierre anual." },
  { id:"p5", name:"2025-Anual", label:"Año fiscal 2025",      type:"annual",    startDate:"2025-01-01", endDate:"2025-12-31", status:"closed", isDefault:false, captureDeadline:"2026-01-31", validationDeadline:"2026-02-15", reportDeadline:"2026-02-28", lockCaptureOnClose:true,  allowSpecialReopen:false, specialReopenRoles:["admin"],               specialReopenNote:"" },
  { id:"p6", name:"2026-Q1",    label:"Enero - Marzo 2026",   type:"quarterly", startDate:"2026-01-01", endDate:"2026-03-31", status:"review", isDefault:false, captureDeadline:"2026-04-10", validationDeadline:"2026-04-20", reportDeadline:"2026-04-30", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin","directivo"],   specialReopenNote:"Se permite reapertura durante revision para correcciones validadas." },
  { id:"p7", name:"2026-Q2",    label:"Abril - Junio 2026",   type:"quarterly", startDate:"2026-04-01", endDate:"2026-06-30", status:"open",   isDefault:true,  captureDeadline:"2026-07-10", validationDeadline:"2026-07-20", reportDeadline:"2026-07-31", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin"],               specialReopenNote:"Reapertura reservada para ajustes posteriores al cierre." },
  { id:"p8", name:"2026-Q3",    label:"Julio - Sep 2026",     type:"quarterly", startDate:"2026-07-01", endDate:"2026-09-30", status:"open",   isDefault:false, captureDeadline:"2026-10-10", validationDeadline:"2026-10-20", reportDeadline:"2026-10-31", lockCaptureOnClose:true,  allowSpecialReopen:false, specialReopenRoles:["admin"],               specialReopenNote:"" },
  { id:"p9", name:"2026-Anual", label:"Año fiscal 2026",      type:"annual",    startDate:"2026-01-01", endDate:"2026-12-31", status:"open",   isDefault:false, captureDeadline:"2027-01-31", validationDeadline:"2027-02-15", reportDeadline:"2027-02-28", lockCaptureOnClose:true,  allowSpecialReopen:true,  specialReopenRoles:["admin","directivo"],   specialReopenNote:"La reapertura anual queda restringida a perfiles de gobierno." },
];

export const periodTypes = [
  { value:"monthly",   label:"Mensual" },
  { value:"bimonthly", label:"Bimestral" },
  { value:"quarterly", label:"Trimestral" },
  { value:"semester",  label:"Semestral" },
  { value:"annual",    label:"Anual" },
];

/* ------------------------------------------------------------------------
   PART 3 - Capture, Devices, Records, Validation,
            Emissions, Goals, Alerts
   ------------------------------------------------------------------------ */

// --- Devices & Integrations ---------------------------------------------
export const devices = [
  { id:"d1",  name:"Medidor CFE Edif. A",   type:"electric_meter", protocol:"Modbus TCP", areaId:"e1",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T08:00:00Z", lastValue:"1,245.6 kWh", health:98, ip:"192.168.10.21", serial:"SM-CC-001", installedAt:"2025-02-10", firmware:"v2.14.3", frequency:"15 min", assignedTo:"Carlos Méndez" },
  { id:"d2",  name:"Medidor CFE Edif. B",   type:"electric_meter", protocol:"Modbus TCP", areaId:"e2",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T08:00:00Z", lastValue:"2,108.3 kWh", health:96, ip:"192.168.10.22", serial:"SM-CC-002", installedAt:"2025-02-10", firmware:"v2.14.3", frequency:"15 min", assignedTo:"Carlos Méndez" },
  { id:"d3",  name:"Medidor CFE Edif. C",   type:"electric_meter", protocol:"Modbus TCP", areaId:"e3",  campusId:"campus-central", status:"warning", lastReading:"2026-04-11T05:30:00Z", lastValue:"890.2 kWh",   health:72, ip:"192.168.10.23", serial:"SM-CC-003", installedAt:"2025-02-10", firmware:"v2.14.1", frequency:"15 min", assignedTo:"Carlos Méndez" },
  { id:"d4",  name:"Medidor Gas Lab Quim.", type:"gas_meter",      protocol:"BACnet",     areaId:"e7",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T07:45:00Z", lastValue:"45.8 m3",     health:94, ip:"192.168.10.30", serial:"GM-CC-001", installedAt:"2025-04-15", firmware:"v1.8.0",  frequency:"1 h",    assignedTo:"Ana Torres" },
  { id:"d5",  name:"Sensor Diésel Taller",  type:"flow_sensor",    protocol:"Modbus RTU", areaId:"e9",  campusId:"campus-central", status:"online",  lastReading:"2026-04-11T07:00:00Z", lastValue:"32.4 L",      health:91, ip:"-",             serial:"FS-CC-001", installedAt:"2025-05-20", firmware:"v1.2.5",  frequency:"1 h",    assignedTo:"María López" },
  { id:"d6",  name:"Medidor Norte Edif. A", type:"electric_meter", protocol:"Modbus TCP", areaId:"e12", campusId:"campus-norte",   status:"online",  lastReading:"2026-04-11T08:00:00Z", lastValue:"1,567.8 kWh", health:95, ip:"192.168.20.21", serial:"SM-CN-001", installedAt:"2025-03-12", firmware:"v2.14.3", frequency:"15 min", assignedTo:"Diego Herrera" },
  { id:"d7",  name:"Medidor Nave Industrial",type:"electric_meter",protocol:"Modbus TCP", areaId:"e13", campusId:"campus-norte",   status:"offline", lastReading:"2026-04-09T22:30:00Z", lastValue:"3,210.5 kWh", health:0,  ip:"192.168.20.22", serial:"SM-CN-002", installedAt:"2025-03-12", firmware:"v2.13.9", frequency:"15 min", assignedTo:"Diego Herrera" },
  { id:"d8",  name:"API CONAGUA Sur",       type:"api_integration",protocol:"REST",       areaId:"e17", campusId:"campus-sur",     status:"online",  lastReading:"2026-04-11T06:00:00Z", lastValue:"125 m3",      health:99, ip:"api.conagua.gob.mx", serial:"-",        installedAt:"2025-08-01", firmware:"-",        frequency:"6 h",    assignedTo:"Sofía Medina" },
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

// --- Records ------------------------------------------------------------
export const records = [
  { id:"r1",  date:"2026-04-10", periodId:"p7", consumptionType:"Electricidad", areaId:"e1",  areaName:"Edificio A - Rectoría",  value:1245.6, unit:"kWh",  factorId:"f1", emissions:541.84, captureMode:"device",   capturedBy:"Sistema",        status:"validated", evidenceCount:0, anomaly:false, notes:"" },
  { id:"r2",  date:"2026-04-10", periodId:"p7", consumptionType:"Electricidad", areaId:"e2",  areaName:"Edificio B - Ciencias",   value:2108.3, unit:"kWh",  factorId:"f1", emissions:917.11, captureMode:"device",   capturedBy:"Sistema",        status:"validated", evidenceCount:0, anomaly:false, notes:"" },
  { id:"r3",  date:"2026-04-10", periodId:"p7", consumptionType:"Electricidad", areaId:"e3",  areaName:"Edificio C - Ingenierías",value:890.2,  unit:"kWh",  factorId:"f1", emissions:387.24, captureMode:"device",   capturedBy:"Sistema",        status:"pending",   evidenceCount:0, anomaly:true,  notes:"Lectura anómala detectada por delta -42%." },
  { id:"r4",  date:"2026-04-09", periodId:"p7", consumptionType:"Gas natural",  areaId:"e7",  areaName:"Laboratorio de Química",  value:45.8,   unit:"m3",   factorId:"f2", emissions:86.10,  captureMode:"manual",   capturedBy:"Carlos Méndez",  status:"pending",   evidenceCount:1, anomaly:false, notes:"" },
  { id:"r5",  date:"2026-04-08", periodId:"p7", consumptionType:"Diésel",       areaId:"e9",  areaName:"Taller de Mecánica",      value:32.4,   unit:"L",    factorId:"f3", emissions:86.83,  captureMode:"file",     capturedBy:"María López",    status:"validated", evidenceCount:1, anomaly:false, notes:"" },
  { id:"r6",  date:"2026-04-07", periodId:"p7", consumptionType:"Electricidad", areaId:"e12", areaName:"Edificio Principal",      value:1567.8, unit:"kWh",  factorId:"f1", emissions:681.99, captureMode:"device",   capturedBy:"Sistema",        status:"validated", evidenceCount:0, anomaly:false, notes:"" },
  { id:"r7",  date:"2026-04-07", periodId:"p7", consumptionType:"Gas LP",       areaId:"e11", areaName:"Cafetería Central",       value:18.2,   unit:"L",    factorId:"f4", emissions:29.30,  captureMode:"manual",   capturedBy:"Carlos Méndez",  status:"rejected",  evidenceCount:0, anomaly:true,  notes:"Sin evidencia adjunta - rechazado." },
  { id:"r8",  date:"2026-04-06", periodId:"p7", consumptionType:"Gasolina",     areaId:"e3",  areaName:"Edificio C - Ingenierías",value:78.5,   unit:"L",    factorId:"f5", emissions:181.34, captureMode:"assisted", capturedBy:"Pedro Ramírez",  status:"pending",   evidenceCount:1, anomaly:false, notes:"" },
  { id:"r9",  date:"2026-04-05", periodId:"p7", consumptionType:"Electricidad", areaId:"e15", areaName:"Laboratorio de Materiales",value:678.2, unit:"kWh", factorId:"f1", emissions:295.02, captureMode:"device",   capturedBy:"Sistema",        status:"pending",   evidenceCount:0, anomaly:true,  notes:"Health del medidor en 65%." },
  { id:"r10", date:"2026-04-04", periodId:"p7", consumptionType:"Diésel",       areaId:"e13", areaName:"Nave Industrial",         value:120.0,  unit:"L",    factorId:"f3", emissions:321.60, captureMode:"file",     capturedBy:"Diego Herrera",  status:"validated", evidenceCount:2, anomaly:false, notes:"" },
  { id:"r11", date:"2026-04-03", periodId:"p7", consumptionType:"Electricidad", areaId:"e17", areaName:"Edificio Administrativo Sur",value:456.7,unit:"kWh",factorId:"f1",emissions:198.66, captureMode:"manual",   capturedBy:"Sofía Medina",   status:"pending",   evidenceCount:1, anomaly:false, notes:"" },
  { id:"r12", date:"2026-04-02", periodId:"p7", consumptionType:"Agua",         areaId:"e17", areaName:"Edificio Administrativo Sur",value:125,  unit:"m3", factorId:"f7", emissions:43.00,  captureMode:"api",      capturedBy:"Sistema",        status:"pending",   evidenceCount:0, anomaly:false, notes:"Factor en borrador." },
];

// --- Validation Queue ---------------------------------------------------
export const validationQueue = [
  { id:"v1", recordId:"r3",  priority:"high",   reason:"Anomalía detectada (-42% delta)",     submittedAt:"2026-04-10T05:30:00Z", submittedBy:"Sistema",        assignedTo:"Ana Torres" },
  { id:"v2", recordId:"r4",  priority:"normal", reason:"Captura manual con evidencia",         submittedAt:"2026-04-09T10:16:00Z", submittedBy:"Carlos Méndez",  assignedTo:"Ana Torres" },
  { id:"v3", recordId:"r8",  priority:"normal", reason:"Captura asistida pendiente revisión",  submittedAt:"2026-04-06T13:00:00Z", submittedBy:"Pedro Ramírez",  assignedTo:"María López" },
  { id:"v4", recordId:"r9",  priority:"high",   reason:"Health del dispositivo bajo (65%)",    submittedAt:"2026-04-05T07:15:00Z", submittedBy:"Sistema",        assignedTo:"Ana Torres" },
  { id:"v5", recordId:"r11", priority:"low",    reason:"Captura manual estándar",              submittedAt:"2026-04-03T16:00:00Z", submittedBy:"Sofía Medina",   assignedTo:"María López" },
  { id:"v6", recordId:"r12", priority:"normal", reason:"Factor en borrador - verificar",       submittedAt:"2026-04-02T07:30:00Z", submittedBy:"Sistema",        assignedTo:"Ana Torres" },
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

// --- Emission Calculations ----------------------------------------------
export const emissionCalculations = [
  { id:"ec1", scope:1, source:"Gas natural",  area:"Laboratorio de Química",     period:"2026-Q2", consumption:45.8,   unit:"m3",  factor:1.880, emissions:86.10,  trend:"+2.3%" },
  { id:"ec2", scope:1, source:"Diésel",       area:"Taller de Mecánica",         period:"2026-Q2", consumption:32.4,   unit:"L",   factor:2.680, emissions:86.83,  trend:"-1.5%" },
  { id:"ec3", scope:1, source:"Diésel",       area:"Nave Industrial",            period:"2026-Q2", consumption:120.0,  unit:"L",   factor:2.680, emissions:321.60, trend:"+5.2%" },
  { id:"ec4", scope:1, source:"Gas LP",       area:"Cafetería Central",          period:"2026-Q2", consumption:18.2,   unit:"L",   factor:1.610, emissions:29.30,  trend:"-3.0%" },
  { id:"ec5", scope:1, source:"Gasolina",     area:"Edificio C - Ingenierías",   period:"2026-Q2", consumption:78.5,   unit:"L",   factor:2.310, emissions:181.34, trend:"+0.8%" },
  { id:"ec6", scope:2, source:"Electricidad", area:"Edificio A - Rectoría",      period:"2026-Q2", consumption:1245.6, unit:"kWh", factor:0.435, emissions:541.84, trend:"-2.1%" },
  { id:"ec7", scope:2, source:"Electricidad", area:"Edificio B - Ciencias",      period:"2026-Q2", consumption:2108.3, unit:"kWh", factor:0.435, emissions:917.11, trend:"+1.4%" },
  { id:"ec8", scope:2, source:"Electricidad", area:"Edificio C - Ingenierías",   period:"2026-Q2", consumption:890.2,  unit:"kWh", factor:0.435, emissions:387.24, trend:"-8.5%" },
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

// --- Goals & Actions ----------------------------------------------------
export const goals = [
  { id:"g1", name:"Reducir Scope 2 -15% vs 2024", scope:2, target:-15,  baseline:5400, current:4590, unit:"kgCO2e", progress:78, status:"in_progress", deadline:"2026-12-31", responsible:"Ana Torres",      areas:["Edificio A - Rectoría","Edificio B - Ciencias"], description:"Meta institucional de reducción de electricidad.", notes:"Revisión trimestral en curso. Buen avance gracias al cambio a LED.", linkedRecords:["r1","r2","r6"] },
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

// --- Alerts & Notifications ---------------------------------------------
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

/* ------------------------------------------------------------------------
   PART 3 - SOPORTE
   - Reports & exports
   - Backups & maintenance
   - Help & documentation
   - AI control
   ------------------------------------------------------------------------ */

// --- Reports: predefined templates --------------------------------------
export const reportTemplates = [
  { id:"rt-period",     name:"Reporte por periodo",       description:"Resumen completo de emisiones del periodo seleccionado.",          category:"period",     icon:"Calendar",      formats:["pdf","xlsx","csv"], lastRun:"2026-04-09T09:10:00Z" },
  { id:"rt-area",       name:"Reporte por área",          description:"Emisiones agrupadas por área, edificio o laboratorio.",            category:"area",       icon:"Building2",     formats:["pdf","xlsx","csv"], lastRun:"2026-04-05T11:30:00Z" },
  { id:"rt-scope",      name:"Reporte por scope",         description:"Desglose Scope 1 / 2 / 3 con totales y comparativos.",              category:"scope",      icon:"Layers",        formats:["pdf","xlsx"],       lastRun:"2026-04-08T16:00:00Z" },
  { id:"rt-category",   name:"Reporte por categoría",     description:"Consumos agrupados por categoría (electricidad, gas, etc.).",       category:"category",   icon:"BookOpen",      formats:["pdf","xlsx","csv"], lastRun:"2026-04-02T14:20:00Z" },
  { id:"rt-goals",      name:"Reporte de metas",          description:"Avance de metas y acciones de reducción.",                          category:"goals",      icon:"Target",        formats:["pdf","xlsx"],       lastRun:"2026-03-30T08:00:00Z" },
  { id:"rt-users",      name:"Reporte de usuarios",       description:"Actividad, accesos y registros capturados por usuario.",            category:"users",      icon:"Users",         formats:["pdf","xlsx","csv"], lastRun:"2026-03-28T10:00:00Z" },
  { id:"rt-devices",    name:"Reporte de dispositivos",   description:"Estado, lecturas y disponibilidad de dispositivos IoT.",            category:"devices",    icon:"Cpu",           formats:["pdf","xlsx","csv"], lastRun:"2026-04-10T07:30:00Z" },
  { id:"rt-comparative",name:"Reporte comparativo",       description:"Comparación entre periodos, áreas o campus.",                       category:"comparative",icon:"GitCompare",    formats:["pdf","xlsx"],       lastRun:"2026-04-01T09:00:00Z" },
];

// --- Reports: export history --------------------------------------------
export const reportExportHistory = [
  { id:"ex1", reportName:"Emisiones 2026-Q1 - Resumen completo",     templateId:"rt-period",     format:"pdf",  size:"2.4 MB",  generatedBy:"María López",       ts:"2026-04-09T09:10:00Z", status:"completed", evidences:12, periodLabel:"2026-Q1" },
  { id:"ex2", reportName:"Comparativo Edificios Campus Central",     templateId:"rt-comparative",format:"xlsx", size:"1.1 MB",  generatedBy:"Sergio Arellano",   ts:"2026-04-08T16:00:00Z", status:"completed", evidences:0,  periodLabel:"2026-Q1" },
  { id:"ex3", reportName:"Scope 1 - Combustibles",                   templateId:"rt-scope",      format:"pdf",  size:"890 KB",  generatedBy:"Sergio Arellano",   ts:"2026-04-08T15:20:00Z", status:"completed", evidences:6,  periodLabel:"2026-Q1" },
  { id:"ex4", reportName:"Avance metas institucionales 2026",        templateId:"rt-goals",      format:"pdf",  size:"1.8 MB",  generatedBy:"Ana Torres",        ts:"2026-04-05T11:30:00Z", status:"completed", evidences:4,  periodLabel:"2026" },
  { id:"ex5", reportName:"Actividad usuarios marzo",                 templateId:"rt-users",      format:"csv",  size:"320 KB",  generatedBy:"Sergio Arellano",   ts:"2026-04-02T14:20:00Z", status:"completed", evidences:0,  periodLabel:"2026-03" },
  { id:"ex6", reportName:"Dispositivos - estado abril",              templateId:"rt-devices",    format:"xlsx", size:"720 KB",  generatedBy:"Carlos Méndez",     ts:"2026-04-01T09:00:00Z", status:"completed", evidences:0,  periodLabel:"2026-04" },
  { id:"ex7", reportName:"Emisiones por área - Campus Norte",        templateId:"rt-area",       format:"pdf",  size:"1.4 MB",  generatedBy:"Diego Herrera",     ts:"2026-03-28T10:00:00Z", status:"completed", evidences:3,  periodLabel:"2026-Q1" },
  { id:"ex8", reportName:"Categorías - Resumen 2026",                templateId:"rt-category",   format:"xlsx", size:"640 KB",  generatedBy:"María López",       ts:"2026-03-25T11:45:00Z", status:"completed", evidences:0,  periodLabel:"2026" },
  { id:"ex9", reportName:"Reporte personalizado scope 2",            templateId:"rt-scope",      format:"pdf",  size:"-",       generatedBy:"Ana Torres",        ts:"2026-04-11T08:00:00Z", status:"failed",    evidences:0,  periodLabel:"2026-Q2" },
  { id:"ex10",reportName:"Auditoría energética - borrador",          templateId:"rt-comparative",format:"pdf",  size:"-",       generatedBy:"Sergio Arellano",   ts:"2026-04-11T07:30:00Z", status:"pending",   evidences:0,  periodLabel:"2026-Q1" },
];

// --- Reports: mock preview data -----------------------------------------
export const reportPreviewSample = {
  title:        "Emisiones por scope - 2026-Q1",
  generatedAt:  "2026-04-09T09:10:00Z",
  generatedBy:  "María López",
  periodLabel:  "2026-Q1 (enero - marzo)",
  campus:       "Todos los campus",
  totals: {
    scope1:     705.17,
    scope2:     2528.18,
    scope3:     43.00,
    total:      3276.35,
    unit:       "kgCO2e",
    vsPrev:     -1.8,
  },
  breakdown: [
    { label:"Electricidad",      value:2528.18, pct:77.2 },
    { label:"Diésel",             value:408.43, pct:12.5 },
    { label:"Gas natural",        value:86.10,  pct:2.6  },
    { label:"Gasolina",           value:181.34, pct:5.5  },
    { label:"Gas LP",             value:29.30,  pct:0.9  },
    { label:"Otros (Scope 3)",   value:43.00,  pct:1.3  },
  ],
};

// --- Backups: list ------------------------------------------------------
export const backupList = [
  { id:"bk-2026-04-11", name:"backup_auto_2026-04-11.tar.gz", type:"automatic", size:"412 MB", createdAt:"2026-04-11T03:00:00Z", durationSec:184, status:"completed", retention:"30d", checksumOk:true },
  { id:"bk-2026-04-10", name:"backup_auto_2026-04-10.tar.gz", type:"automatic", size:"408 MB", createdAt:"2026-04-10T03:00:00Z", durationSec:179, status:"completed", retention:"30d", checksumOk:true },
  { id:"bk-2026-04-09", name:"backup_auto_2026-04-09.tar.gz", type:"automatic", size:"405 MB", createdAt:"2026-04-09T03:00:00Z", durationSec:181, status:"completed", retention:"30d", checksumOk:true },
  { id:"bk-2026-04-08", name:"backup_manual_pre-update.tar.gz", type:"manual", size:"398 MB", createdAt:"2026-04-08T19:30:00Z", durationSec:201, status:"completed", retention:"90d", checksumOk:true, note:"Antes de actualización 2.1" },
  { id:"bk-2026-04-07", name:"backup_auto_2026-04-07.tar.gz", type:"automatic", size:"390 MB", createdAt:"2026-04-07T03:00:00Z", durationSec:172, status:"completed", retention:"30d", checksumOk:true },
  { id:"bk-2026-04-01", name:"backup_quarter_2026-Q1.tar.gz", type:"manual",    size:"410 MB", createdAt:"2026-04-01T20:00:00Z", durationSec:212, status:"completed", retention:"perm", checksumOk:true, note:"Cierre 2026-Q1" },
  { id:"bk-2026-03-15", name:"backup_auto_2026-03-15.tar.gz", type:"automatic", size:"380 MB", createdAt:"2026-03-15T03:00:00Z", durationSec:175, status:"completed", retention:"30d", checksumOk:true },
  { id:"bk-2026-02-29", name:"backup_failed_2026-02-29",      type:"automatic", size:"-",      createdAt:"2026-02-29T03:00:00Z", durationSec:0,   status:"failed",    retention:"-",  checksumOk:false, note:"Disco lleno - espacio insuficiente" },
];

// --- Backups: schedule --------------------------------------------------
export const backupSchedule = {
  enabled:        true,
  frequency:      "daily",    // daily | weekly | monthly
  hour:           "03:00",
  retentionDays:  30,
  destination:    "s3://carbontrack-backups/auto",
  encrypted:      true,
  notifyOnFail:   true,
  notifyOnSuccess:false,
  lastBackupAt:   "2026-04-11T03:00:00Z",
  nextBackupAt:   "2026-04-12T03:00:00Z",
};

// --- System resources / health detail -----------------------------------
export const systemResources = {
  storage: {
    totalGB:    500,
    usedGB:     186,
    backupsGB:  42,
    evidencesGB:54,
    databaseGB: 28,
    logsGB:     11,
    otherGB:    51,
  },
  database: {
    status:        "online",
    size:          "28.4 GB",
    connections:   12,
    maxConnections:50,
    uptime:        "32 d 14 h",
    lastVacuum:    "2026-04-08T03:30:00Z",
    slowQueries:   3,
    indexHealth:   "good",
  },
  server: {
    status:    "online",
    cpu:       42,
    ram:       63,
    diskIo:    18,
    uptime:    "32 d 14 h",
    threads:   8,
    nodeVer:   "20.11.1",
    apiVersion:"2.1.0",
  },
  services: [
    { id:"backend",   label:"Backend API",     status:"online",  uptime:"32d 14h", canRestart:true },
    { id:"database",  label:"Base de datos",    status:"online",  uptime:"32d 14h", canRestart:false },
    { id:"storage",   label:"Almacenamiento",   status:"online",  uptime:"32d 14h", canRestart:false },
    { id:"queue",     label:"Cola de tareas",   status:"online",  uptime:"5d 02h",  canRestart:true },
    { id:"email",     label:"Servicio correo",  status:"warning", uptime:"1d 04h",  canRestart:true },
    { id:"ia",        label:"Motor IA",         status:"offline", uptime:"-",       canRestart:true },
  ],
};

// --- Maintenance: cleanup tasks -----------------------------------------
export const cleanupTasks = [
  { id:"ct-temp",     label:"Archivos temporales",       description:"Vista previa de reportes, descargas pendientes y caché temporal.",  size:"412 MB", lastRun:"2026-04-08T03:00:00Z", icon:"Trash2"    },
  { id:"ct-sessions", label:"Sesiones expiradas",         description:"Sesiones inactivas con más de 30 días.",                            size:"24 KB",  lastRun:"2026-04-10T03:00:00Z", icon:"LogOut"     },
  { id:"ct-logs",     label:"Logs antiguos",              description:"Bitácora del sistema con más de 180 días.",                         size:"1.2 GB", lastRun:"2026-03-15T03:00:00Z", icon:"FileText"   },
  { id:"ct-orphans",  label:"Evidencias huérfanas",       description:"Archivos adjuntos sin registro asociado.",                          size:"86 MB",  lastRun:"2026-04-01T03:00:00Z", icon:"FileQuestion" },
  { id:"ct-cache",    label:"Caché del sistema",          description:"Caché de cálculos de emisiones y agregados.",                       size:"180 MB", lastRun:"2026-04-09T03:00:00Z", icon:"Zap"        },
  { id:"ct-notifs",   label:"Notificaciones leídas",      description:"Notificaciones marcadas como leídas hace más de 90 días.",          size:"4.5 MB", lastRun:"2026-04-05T03:00:00Z", icon:"Bell"       },
];

// --- Maintenance: status ------------------------------------------------
export const maintenanceStatus = {
  maintenanceMode: false,
  scheduledWindow: null, // { from, to, message }
  lastReboot:      "2026-03-10T02:30:00Z",
  pendingUpdates:  1,
};

/* --- Help / Documentation -------------------------------------------- */

// Quick guides
export const helpQuickGuides = [
  { id:"qg-1", title:"Capturar tu primer registro",  steps:5, time:"3 min", icon:"ClipboardEdit", level:"basic"      },
  { id:"qg-2", title:"Adjuntar evidencias",           steps:4, time:"2 min", icon:"Paperclip",     level:"basic"      },
  { id:"qg-3", title:"Validar registros pendientes",  steps:6, time:"5 min", icon:"CheckSquare",   level:"intermediate" },
  { id:"qg-4", title:"Configurar un dispositivo IoT", steps:8, time:"10 min", icon:"Cpu",          level:"advanced"   },
  { id:"qg-5", title:"Generar y exportar reportes",   steps:5, time:"4 min", icon:"FileBarChart",  level:"basic"      },
  { id:"qg-6", title:"Crear y dar seguimiento a metas", steps:7, time:"7 min", icon:"Target",      level:"intermediate" },
];

// Manuals (links/sections)
export const helpManuals = [
  { id:"mn-admin", audience:"Administrador", title:"Manual del administrador",  description:"Configuración completa del sistema, seguridad, usuarios y mantenimiento.", pages:48, updatedAt:"2026-03-20", format:"pdf" },
  { id:"mn-user",  audience:"Capturista",    title:"Manual del usuario",         description:"Captura de datos, registros, evidencias y consulta de tableros.",          pages:24, updatedAt:"2026-03-20", format:"pdf" },
  { id:"mn-board", audience:"Directivo",     title:"Manual del directivo",       description:"Tableros ejecutivos, validación, metas y reportes de alto nivel.",         pages:18, updatedAt:"2026-03-20", format:"pdf" },
  { id:"mn-iot",   audience:"Mantenimiento", title:"Guía técnica IoT",            description:"Instalación, calibración y diagnóstico de dispositivos.",                pages:32, updatedAt:"2026-02-10", format:"pdf" },
];

// FAQ
export const helpFaq = [
  { id:"faq-1", category:"Captura",   question:"¿Cómo capturo una lectura de electricidad?", answer:"Ve a Capturar -> selecciona el área y dispositivo -> ingresa la lectura del periodo, adjunta evidencia y guarda. Si tu rol lo permite, queda en estado pendiente para validación." },
  { id:"faq-2", category:"Captura",   question:"¿Qué hago si el dispositivo no aparece?",     answer:"Verifica que estés en el campus correcto y que el dispositivo esté activo. Si persiste, contacta al administrador para revisar la configuración." },
  { id:"faq-3", category:"Reportes",  question:"¿Por qué un reporte se queda en pendiente?",   answer:"Los reportes pesados se procesan en cola. Si tarda más de 5 minutos, revisa el estado en Soporte -> Historial de exportaciones, o reintenta con un periodo más corto." },
  { id:"faq-4", category:"Scopes",    question:"¿Qué diferencia hay entre Scope 1, 2 y 3?",    answer:"Scope 1: emisiones directas (combustibles propios). Scope 2: emisiones indirectas por electricidad comprada. Scope 3: otras emisiones indirectas (cadena de valor)." },
  { id:"faq-5", category:"Factores",  question:"¿Qué pasa si un factor está vencido?",         answer:"Las nuevas capturas usan el factor más reciente vigente. Si no hay vigente, se bloquea el cálculo y el sistema genera una alerta crítica." },
  { id:"faq-6", category:"Cuenta",    question:"¿Cómo cambio mi contraseña?",                  answer:"En tu perfil -> Seguridad -> Cambiar contraseña. La política mínima la define el administrador." },
  { id:"faq-7", category:"IA",        question:"¿Puedo desactivar las recomendaciones IA?",    answer:"Sí, desde Soporte -> Inteligencia artificial puedes activar/desactivar módulos individualmente. Los datos históricos se conservan." },
  { id:"faq-8", category:"Soporte",   question:"¿A quién contacto si algo deja de funcionar?", answer:"Usa el botón Contactar soporte. Adjunta el módulo, fecha y captura del error si es posible." },
];

// Module explanations
export const helpModules = [
  { id:"hm-dashboard", icon:"LayoutDashboard", label:"Dashboard",     summary:"Indicadores clave, tendencias y alertas en tiempo real.",     deepLink:"/dashboard" },
  { id:"hm-records",   icon:"Database",        label:"Registros",     summary:"Captura y gestión de lecturas históricas por área y scope.",   deepLink:"/registros" },
  { id:"hm-emissions", icon:"Calculator",      label:"Emisiones",     summary:"Cálculo automático de emisiones a partir de consumo y factores.", deepLink:"/emisiones" },
  { id:"hm-factors",   icon:"FlaskConical",    label:"Factores",      summary:"Catálogo de factores de emisión vigentes por país/región.",    deepLink:"/factores" },
  { id:"hm-devices",   icon:"Cpu",             label:"Dispositivos",  summary:"Sensores IoT y medidores conectados al sistema.",              deepLink:"/dispositivos" },
  { id:"hm-targets",   icon:"Target",          label:"Metas",         summary:"Definición y seguimiento de metas de reducción.",              deepLink:"/metas" },
  { id:"hm-reports",   icon:"FileBarChart",    label:"Reportes",      summary:"Generación y exportación de reportes oficiales.",              deepLink:"/admin/avanzado?view=admin-reports" },
  { id:"hm-ai",        icon:"Sparkles",        label:"Herramientas IA", summary:"Predicciones, anomalías y recomendaciones automáticas.",   deepLink:"/admin/avanzado?view=admin-ai" },
];

// Common errors
export const helpCommonErrors = [
  { id:"err-1", code:"ERR_FACTOR_EXPIRED", title:"Factor de emisión vencido",         description:"No se puede calcular emisiones con un factor vencido. Actualiza el factor y reintenta.",                action:"Ir a Factores" },
  { id:"err-2", code:"ERR_PERIOD_CLOSED",  title:"Periodo cerrado",                    description:"No se permite capturar registros en un periodo cerrado. Si requieres ajuste, solicítalo al administrador.", action:"Ver periodos" },
  { id:"err-3", code:"ERR_DEVICE_OFFLINE", title:"Dispositivo sin conexión",           description:"El dispositivo no ha enviado lectura en las últimas 24h. Verifica energía y red.",                       action:"Ver dispositivo" },
  { id:"err-4", code:"ERR_FILE_TOO_LARGE", title:"Archivo demasiado grande",            description:"El tamaño máximo permitido es 10 MB. Comprime o divide la evidencia.",                                  action:"Reintentar" },
  { id:"err-5", code:"ERR_PERMISSION",     title:"Permiso insuficiente",                description:"Tu rol no permite esta acción. Contacta a un administrador.",                                          action:"Ir a inicio" },
];

// Version / changelog
export const helpVersion = {
  current:    "2.1.0",
  channel:    "production",
  releasedAt: "2026-03-20",
  buildHash:  "a7f3c2b",
  apiVersion: "2.1.0",
  dbVersion:  "27",
};

export const helpChangelog = [
  { id:"v210", version:"2.1.0", date:"2026-03-20", changes:[
    "Nuevo módulo Soporte: reportes, respaldos, ayuda e IA.",
    "Mejoras de validación masiva de registros.",
    "Nueva vista de huella por edificio.",
    "Optimización de cálculo de emisiones (x3 más rápido).",
  ]},
  { id:"v201", version:"2.0.1", date:"2026-02-10", changes:[
    "Corrección en exportación de reportes Scope 3.",
    "Refresco automático de factores vencidos.",
    "Fix: dispositivos sin lectura aparecían como activos.",
  ]},
  { id:"v200", version:"2.0.0", date:"2026-01-15", changes:[
    "Rediseño completo del panel administrativo.",
    "Sistema de roles y permisos granulares.",
    "Soporte multi-campus y multi-edificio.",
    "Integración inicial con motores IoT.",
  ]},
  { id:"v110", version:"1.1.0", date:"2025-10-05", changes:[
    "Tableros de metas y acciones de reducción.",
    "Nuevas notificaciones por correo.",
  ]},
];

// Support contact
export const helpSupportContact = {
  email:   "soporte@carbontrack.app",
  phone:   "+52 81 1234 5678",
  hours:   "Lunes a viernes, 9:00 - 18:00 (CST)",
  portal:  "https://soporte.carbontrack.app",
  channels:[
    { id:"email",  label:"Correo",       value:"soporte@carbontrack.app", icon:"Mail" },
    { id:"phone",  label:"Teléfono",     value:"+52 81 1234 5678",         icon:"Phone" },
    { id:"chat",   label:"Chat en vivo", value:"L-V 9-18 h",               icon:"MessageSquare" },
    { id:"ticket", label:"Ticket",       value:"Crear ticket",             icon:"Ticket" },
  ],
};

/* --- Inteligencia artificial ---------------------------------------- */

// AI engine status
export const aiEngineStatus = {
  enabled:           true,
  status:            "online",          // online | training | offline | error
  modelName:         "carbontrack-forecast",
  modelVersion:      "1.4.2",
  releasedAt:        "2026-03-15",
  lastTrainedAt:     "2026-04-02T03:00:00Z",
  trainingDuration:  "1 h 24 min",
  trainingDataset:   "registros 2024-2025 (12 480 muestras)",
  nextRetrainAt:     "2026-05-02T03:00:00Z",
  inferenceLatency:  "180 ms",
  uptimePct:         99.6,
  visibleTo:         ["admin","directivo"],   // role ids
};

// AI metrics
export const aiMetrics = {
  predictionsTotal:    1842,
  predictionsThisMonth: 312,
  anomaliesDetected:   47,
  recommendationsCount:23,
  averageAccuracy:     0.91,
  meanAbsoluteError:   3.2,    // %
  rmse:                4.8,    // %
  driftScore:          0.04,
  confidenceMean:      0.87,
};

// AI module toggles (which areas of the system use AI)
export const aiModuleToggles = [
  { id:"emissions-forecast", label:"Pronóstico de emisiones",    description:"Proyecciones de emisiones futuras a partir del histórico.", enabled:true,  icon:"TrendingUp" },
  { id:"anomaly-detection",  label:"Detección de anomalías",     description:"Alertas automáticas cuando una lectura es atípica.",         enabled:true,  icon:"AlertTriangle" },
  { id:"smart-recommendations",label:"Recomendaciones inteligentes",description:"Sugerencias para reducir emisiones y eficiencia.",       enabled:true,  icon:"Lightbulb" },
  { id:"goal-risk",          label:"Riesgo de meta",              description:"Estima la probabilidad de cumplir cada meta activa.",        enabled:true,  icon:"Target" },
  { id:"capture-assist",     label:"Asistencia de captura",       description:"Auto-completado y validación inteligente al capturar.",      enabled:false, icon:"ClipboardEdit" },
  { id:"natural-language",   label:"Consulta en lenguaje natural", description:"Permite hacer preguntas en texto libre al sistema.",        enabled:false, icon:"MessageSquare" },
];

// AI predictions
export const aiPredictions = [
  { id:"pr1", target:"Edificio A - Rectoría",     scope:2, period:"2026-Q3", predictedKgCO2e:1320, confidence:0.92, deltaPct:-3.2, generatedAt:"2026-04-10T10:00:00Z" },
  { id:"pr2", target:"Edificio B - Ciencias",     scope:2, period:"2026-Q3", predictedKgCO2e:2180, confidence:0.88, deltaPct:+1.4, generatedAt:"2026-04-10T10:00:00Z" },
  { id:"pr3", target:"Nave Industrial",            scope:1, period:"2026-Q3", predictedKgCO2e:340,  confidence:0.83, deltaPct:+5.6, generatedAt:"2026-04-10T10:00:00Z" },
  { id:"pr4", target:"Laboratorio de Química",    scope:1, period:"2026-Q3", predictedKgCO2e:92,   confidence:0.90, deltaPct:-2.1, generatedAt:"2026-04-10T10:00:00Z" },
  { id:"pr5", target:"Campus Sur (consolidado)",   scope:0, period:"2026-Q3", predictedKgCO2e:540,  confidence:0.79, deltaPct:+0.6, generatedAt:"2026-04-10T10:00:00Z" },
];

// AI anomalies
export const aiAnomalies = [
  { id:"an1", target:"Sensor GLP Cafetería",       metric:"consumo",     observed:42.5, expected:18.2, deviation:"+133%", severity:"critical", ts:"2026-04-10T22:15:00Z", status:"open" },
  { id:"an2", target:"Edificio C - Ingenierías",   metric:"electricidad",observed:1450, expected:920,  deviation:"+58%",  severity:"warning",  ts:"2026-04-09T16:40:00Z", status:"open" },
  { id:"an3", target:"Taller de Mecánica",         metric:"diésel",      observed:65,   expected:32,   deviation:"+103%", severity:"warning",  ts:"2026-04-08T09:10:00Z", status:"reviewed" },
  { id:"an4", target:"Edificio Principal Norte",   metric:"electricidad",observed:850,  expected:1540, deviation:"-45%",  severity:"info",     ts:"2026-04-07T19:00:00Z", status:"reviewed" },
  { id:"an5", target:"Lab. Materiales (Norte)",    metric:"gas natural", observed:8.4,  expected:21.5, deviation:"-61%",  severity:"info",     ts:"2026-04-05T11:20:00Z", status:"resolved" },
];

// AI recommendations
export const aiRecommendations = [
  { id:"rc1", title:"Apagar HVAC fuera de horario en Edif. B",   estimatedSavingKgCO2e:120, scope:2, area:"Edificio B - Ciencias", confidence:0.87, status:"new",       ts:"2026-04-10T10:00:00Z" },
  { id:"rc2", title:"Sustituir caldera Lab. Química por eléctrica", estimatedSavingKgCO2e:180, scope:1, area:"Laboratorio de Química", confidence:0.81, status:"in_review", ts:"2026-04-09T10:00:00Z" },
  { id:"rc3", title:"Programar mantenimiento de iluminación - Edif. A", estimatedSavingKgCO2e:60, scope:2, area:"Edificio A - Rectoría", confidence:0.74, status:"applied",   ts:"2026-03-28T10:00:00Z" },
  { id:"rc4", title:"Revisar fuga GLP - Cafetería Central",        estimatedSavingKgCO2e:95, scope:1, area:"Cafetería Central",     confidence:0.92, status:"new",       ts:"2026-04-10T22:30:00Z" },
  { id:"rc5", title:"Instalar sensores presencia en aulas Norte",  estimatedSavingKgCO2e:75, scope:2, area:"Aulas Norte",           confidence:0.68, status:"new",       ts:"2026-04-08T10:00:00Z" },
];

// AI training history
export const aiTrainingHistory = [
  { id:"th1", ts:"2026-04-02T03:00:00Z", version:"1.4.2", samples:12480, durationMin:84, accuracy:0.91, rmse:4.8, status:"completed", triggeredBy:"Programado" },
  { id:"th2", ts:"2026-03-15T03:00:00Z", version:"1.4.1", samples:11920, durationMin:79, accuracy:0.90, rmse:5.0, status:"completed", triggeredBy:"Manual"      },
  { id:"th3", ts:"2026-02-15T03:00:00Z", version:"1.4.0", samples:11200, durationMin:81, accuracy:0.88, rmse:5.4, status:"completed", triggeredBy:"Programado" },
  { id:"th4", ts:"2026-01-15T03:00:00Z", version:"1.3.5", samples:10540, durationMin:74, accuracy:0.87, rmse:5.7, status:"completed", triggeredBy:"Programado" },
  { id:"th5", ts:"2025-12-15T03:00:00Z", version:"1.3.4", samples:9980,  durationMin:0,  accuracy:0,    rmse:0,   status:"failed",    triggeredBy:"Programado" },
];

// AI smart alerts
export const aiSmartAlerts = [
  { id:"sa1", title:"Tendencia ascendente Scope 2",          description:"Las emisiones eléctricas crecen 4.2% mensual los últimos 3 meses.", severity:"warning",  ts:"2026-04-10T08:00:00Z" },
  { id:"sa2", title:"Meta de reducción en riesgo",            description:"La meta 'Reducir consumo de agua -8%' tiene 78% de probabilidad de NO cumplirse.", severity:"critical", ts:"2026-04-09T08:00:00Z" },
  { id:"sa3", title:"Patrón inusual los fines de semana",     description:"Edificio C reporta consumos no esperados en sábados.", severity:"info",     ts:"2026-04-08T08:00:00Z" },
];

export const aiDataSources = [
  { id:"records", label:"Registros validados", module:"Registros", variables:["consumo","unidad","scope","categoria","area"], period:"2024-Q1 a 2026-Q1", dataType:"real", status:"active", coverage:0.96 },
  { id:"devices", label:"Lecturas IoT", module:"Dispositivos", variables:["lectura","latencia","estado","intervalo"], period:"ultimos 18 meses", dataType:"real", status:"active", coverage:0.88 },
  { id:"factors", label:"Factores de emision", module:"Factores", variables:["factor","vigencia","region","unidad"], period:"catalogo vigente e historico", dataType:"real", status:"active", coverage:0.99 },
  { id:"goals", label:"Metas y acciones", module:"Metas", variables:["meta","avance","fecha objetivo","impacto"], period:"2025 a 2026", dataType:"estimado", status:"active", coverage:0.82 },
  { id:"calendar", label:"Calendario operativo", module:"Periodos", variables:["periodo","dias habiles","estacionalidad"], period:"2024 a 2026", dataType:"ambos", status:"active", coverage:0.91 },
];

export const aiDataQuality = {
  completenessPct: 94,
  missingRecords: 128,
  outliers: 37,
  historyQuality: "Alta",
  validatedRowsPct: 91,
  estimatedRowsPct: 7,
  lastAuditAt: "2026-04-10T06:30:00Z",
  checks: [
    { id:"complete", label:"Datos completos", value:94, status:"good" },
    { id:"fresh", label:"Actualizacion reciente", value:89, status:"good" },
    { id:"consistent", label:"Consistencia de unidades", value:96, status:"good" },
    { id:"outliers", label:"Atipicos pendientes", value:76, status:"warning" },
  ],
};

export const aiModelObjectives = [
  { id:"predict", label:"Prediccion de emisiones", description:"Proyecta emisiones por scope, area y periodo.", enabled:true },
  { id:"anomaly", label:"Deteccion de anomalias", description:"Identifica consumos fuera del comportamiento esperado.", enabled:true },
  { id:"goals", label:"Apoyo a metas", description:"Evalua riesgo de cumplimiento y acciones con mayor impacto.", enabled:true },
  { id:"consumption", label:"Analisis de consumo", description:"Explica variaciones por categoria, area y estacionalidad.", enabled:true },
  { id:"operations", label:"Recomendaciones operativas", description:"Sugiere acciones de ahorro revisables por analistas.", enabled:true },
];

export const aiPerformanceHistory = [
  { id:"ph1", version:"1.4.2", accuracy:0.91, precision:0.89, recall:0.84, mae:3.2, rmse:4.8, drift:0.04, period:"2026-Q1" },
  { id:"ph2", version:"1.4.1", accuracy:0.90, precision:0.87, recall:0.82, mae:3.5, rmse:5.0, drift:0.05, period:"2025-Q4" },
  { id:"ph3", version:"1.4.0", accuracy:0.88, precision:0.84, recall:0.79, mae:3.9, rmse:5.4, drift:0.08, period:"2025-Q3" },
  { id:"ph4", version:"1.3.5", accuracy:0.87, precision:0.82, recall:0.77, mae:4.1, rmse:5.7, drift:0.10, period:"2025-Q2" },
];

export const aiModelVersions = [
  { id:"mv1", version:"1.4.2", date:"2026-04-02", change:"+1.1% accuracy", reason:"Se agregaron lecturas IoT validadas y normalizacion de periodos.", current:true },
  { id:"mv2", version:"1.4.1", date:"2026-03-15", change:"+0.8% recall", reason:"Ajuste de umbrales para anomalias de combustible.", current:false },
  { id:"mv3", version:"1.4.0", date:"2026-02-15", change:"+2.0% precision", reason:"Nuevo set de variables por area y categoria.", current:false },
  { id:"mv4", version:"1.3.5", date:"2026-01-15", change:"base", reason:"Version inicial con prediccion por scope.", current:false },
];

export const aiTraceabilityItems = [
  { id:"tr1", result:"Meta de reduccion en riesgo", sourceModule:"Metas", period:"2026-Q2", reviewedData:"metas activas, consumos Q1, avance mensual", topVariables:["avance real","consumo electrico","dias habiles"], explanation:"El avance de reduccion esta por debajo de la tendencia necesaria y el consumo electrico aumento en los ultimos dos cierres." },
  { id:"tr2", result:"Anomalia GLP Cafeteria", sourceModule:"Dispositivos", period:"Abr 2026", reviewedData:"lecturas GLP, historial cafeteria, factores vigentes", topVariables:["consumo observado","promedio historico","horario"], explanation:"La lectura supero mas del doble el patron esperado para ese horario y area." },
  { id:"tr3", result:"Recomendacion HVAC Edif. B", sourceModule:"Registros", period:"2026-Q1", reviewedData:"electricidad, horarios de uso, tendencias por edificio", topVariables:["consumo nocturno","ocupacion","temperatura"], explanation:"Se detecto consumo sostenido fuera de horario con baja ocupacion registrada." },
];

export const aiPermissionsMatrix = [
  { id:"view", action:"Ver predicciones", admin:true, directivo:true, operativo:false, consulta:false },
  { id:"retrain", action:"Reentrenar modelo", admin:true, directivo:false, operativo:false, consulta:false },
  { id:"approve", action:"Aprobar recomendaciones", admin:true, directivo:true, operativo:false, consulta:false },
  { id:"toggle", action:"Apagar modulo IA", admin:true, directivo:false, operativo:false, consulta:false },
  { id:"audit", action:"Ver trazabilidad", admin:true, directivo:true, operativo:true, consulta:false },
];

export const aiSecurityLimits = [
  { id:"read", label:"Modo de acceso", value:"Solo lectura sobre datos operativos; genera sugerencias, no modifica registros." },
  { id:"allowed", label:"Datos permitidos", value:"Registros, factores, metas, periodos, dispositivos y bitacora tecnica." },
  { id:"blocked", label:"Datos restringidos", value:"Contrasenas, tokens, datos personales sensibles y archivos privados no asociados." },
  { id:"scope", label:"Limites de consulta", value:"Respeta rol, campus, area asignada y periodo disponible para el usuario." },
  { id:"log", label:"Registro de uso", value:"Cada consulta, recomendacion y reentrenamiento queda en bitacora administrativa." },
];

export const aiUsageLog = [
  { id:"ul1", ts:"2026-04-11T09:20:00Z", user:"Sergio Arellano", action:"Reviso anomalia", module:"Anomalias", outcome:"marcada como util" },
  { id:"ul2", ts:"2026-04-10T16:45:00Z", user:"Ana Torres", action:"Aprobo recomendacion", module:"Recomendaciones", outcome:"enviada a metas" },
  { id:"ul3", ts:"2026-04-10T08:00:00Z", user:"Sistema", action:"Genero predicciones", module:"Predicciones", outcome:"5 resultados" },
  { id:"ul4", ts:"2026-04-02T03:00:00Z", user:"Sistema", action:"Entreno modelo", module:"Entrenamiento", outcome:"exitoso" },
];
