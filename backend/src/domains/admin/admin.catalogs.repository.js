import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const CONTROLLED_VALUE_LABELS = Object.freeze({
  real: "Real",
  est: "Estimado",
  draft: "Borrador",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  meter: "Medidor",
  vehicle: "Vehículo",
  equipment: "Equipo",
  generator: "Generador",
  hvac: "HVAC",
  it_device: "Dispositivo TI",
  tractor: "Tractor",
  other: "Otro",
  receipt: "Recibo o factura",
  photo: "Fotografía",
  survey: "Encuesta",
  inventory: "Inventario",
  report: "Reporte",
  queued: "En cola",
  running: "En ejecución",
  done: "Completado",
  failed: "Fallido",
  csv: "CSV",
  pdf: "PDF",
  xlsx: "Excel",
  absolute: "Absoluta",
  reduction_percent: "Reducción porcentual",
  unread: "No leída",
  read: "Leída",
  archived: "Archivada",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  at_risk: "En riesgo",
  in_progress: "En progreso",
  blocked: "Bloqueado",
  all: "Todas las áreas",
  custom: "Áreas personalizadas",
  email: "Correo electrónico",
  password: "Contraseña",
  xgboost: "XGBoost",
  isolation_forest: "Isolation Forest",
  prophet: "Prophet",
  prediction: "Predicción",
  anomaly_detection: "Detección de anomalías",
  trend_forecast: "Pronóstico de tendencias",
  succeeded: "Exitoso",
  cancelled: "Cancelado",
  electricidad: "Electricidad",
  combustible: "Combustible",
  otros: "Otros",
  record_created: "Registro creado",
  record_imported: "Registro importado",
  record_archived: "Registro archivado",
  export_done: "Exportación finalizada",
  factor_updated: "Factor actualizado",
  goal_risk: "Meta en riesgo",
  system: "Sistema",
  ESP32: "ESP32",
  ESP8266: "ESP8266",
  EDGE_GATEWAY: "Gateway perimetral",
  CUSTOM: "Personalizado",
  https: "HTTPS",
  mqtt: "MQTT",
  scheduled: "Programado",
  realtime: "Tiempo real",
  it: "TI",
  iluminacion: "Iluminación",
  clima: "Clima",
  redes: "Redes",
  industrial: "Industrial",
  agricola: "Agrícola",
  admin: "Administrador",
  otro: "Otro",
  building: "Edificio",
  area: "Área",
  department: "Departamento",
  laboratory: "Laboratorio",
  workshop: "Taller",
  office: "Oficina",
  classroom: "Aula",
  zone: "Zona",
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semester: "Semestral",
  annual: "Anual",
  open: "Abierto",
  review: "En revisión",
  closed: "Cerrado",
  evidence: "Evidencia",
  light: "Claro",
  dark: "Oscuro",
  "DD/MM/YYYY": "DD/MM/YYYY",
  "YYYY-MM-DD": "YYYY-MM-DD",
  kg: "kg CO2e",
  t: "t CO2e",
  60: "60 segundos",
  300: "5 minutos",
  900: "15 minutos",
  3600: "1 hora",
  device: "Dispositivo",
  anomaly: "Anomalía",
  factor: "Factor",
  period: "Periodo",
  goal: "Meta",
  validation: "Validación",
  security: "Seguridad",
  critical: "Crítica",
  warning: "Advertencia",
  info: "Informativa",
  high: "Alta",
  normal: "Normal",
  low: "Baja",
  immediate: "Inmediata",
  daily: "Diaria",
  weekly: "Semanal",
  push: "Push",
  inapp: "En la app",
  sms: "SMS",
  dashboard: "Dashboard",
  category: "Categoría",
  goals: "Metas",
  users: "Usuarios",
  devices: "Dispositivos",
  comparative: "Comparativo",
  returned: "Devuelto",
  reviewed: "Revisado",
  resolved: "Resuelto",
  new: "Nueva",
  in_review: "En revisión",
  applied: "Aplicada",
  dismissed: "Descartada",
  consumo: "Consumo",
  scope: "Scope",
  categoria: "Categoría",
  periodo: "Periodo",
  dispositivo: "Dispositivo",
  estacionalidad: "Estacionalidad",
  "last-6m": "Últimos 6 meses",
  "last-12m": "Últimos 12 meses",
  "last-24m": "Últimos 24 meses",
  estimated: "Solo estimados",
  both: "Reales y estimados",
  "read-only": "Solo lectura",
  suggestions: "Lectura y sugerencias",
  records: "Registros",
  factors: "Factores",
  periods: "Periodos",
  audit: "Bitácora",
  passwords: "Contraseñas",
  tokens: "Tokens",
  "sensitive-personal": "Datos sensibles",
  "private-files": "Archivos privados",
  "raw-secrets": "Secretos técnicos",
  "role-area-period": "Rol, área y periodo",
  "role-campus-period": "Rol, campus y periodo",
  "admin-only": "Solo administradores",
  "carbontrack-forecast": "CarbonTrack Forecast v1.4.2",
  "carbontrack-anomaly": "CarbonTrack Anomaly v1.2.0",
  "carbontrack-hybrid": "CarbonTrack Hybrid beta",
  energy: "Energía",
  maintenance: "Mantenimiento",
  operations: "Operación",
  manual: "Revisión manual",
  "high-confidence": "Auto si confianza alta",
  "advisory-only": "Solo informativo",
  summary: "Resumen",
  standard: "Estándar",
  detailed: "Detallado",
  "emissions-forecast": "Pronóstico de emisiones",
  "smart-recommendations": "Recomendaciones inteligentes",
  "capture-assist": "Asistencia de captura",
  "natural-language": "Consulta en lenguaje natural",
  predict: "Predicción de emisiones",
  consumption: "Análisis de consumo",
});

const CATALOG_DEFINITIONS = Object.freeze([
  {
    id: "emission-categories",
    label: "Categorías de emisión",
    table: "emission_categories",
    supportsStatus: true,
    canCreate: true,
    canEditCode: true,
    fields: [
      { key: "scopeId", label: "Scope", type: "select", source: "emissionScopes", required: true },
      { key: "defaultMetricId", label: "Métrica predeterminada", type: "select", source: "metrics", required: true },
      { key: "defaultUnitId", label: "Unidad predeterminada", type: "select", source: "units", required: true },
    ],
  },
  {
    id: "measurement-units",
    label: "Unidades de medida",
    table: "units",
    supportsStatus: true,
    canCreate: true,
    canEditCode: true,
    fields: [
      { key: "symbol", label: "Símbolo", type: "text" },
      { key: "dimension", label: "Dimensión", type: "text", required: true },
      { key: "toBaseMultiplier", label: "Multiplicador a base", type: "number", required: true, min: 0.0000000001, step: 0.0001 },
    ],
  },
  {
    id: "metrics",
    label: "Métricas",
    table: "metrics",
    supportsStatus: true,
    canCreate: true,
    canEditCode: true,
    fields: [
      { key: "dimension", label: "Dimensión", type: "text", required: true },
      { key: "baseUnitId", label: "Unidad base", type: "select", source: "units", required: true },
    ],
  },
  {
    id: "data-sources",
    label: "Fuentes de datos",
    table: "data_sources",
    supportsStatus: true,
    canCreate: true,
    canEditCode: true,
    fields: [
      { key: "reliabilityRank", label: "Confiabilidad", type: "number", required: true, min: 1, max: 5, step: 1 },
    ],
  },
  {
    id: "estimation-methods",
    label: "Métodos de estimación",
    table: "estimation_methods",
    supportsStatus: true,
    canCreate: true,
    canEditCode: true,
    fields: [],
  },
  {
    id: "fuel-types",
    label: "Tipos de combustible",
    table: "fuel_types",
    supportsStatus: true,
    canCreate: true,
    canEditCode: true,
    fields: [],
  },
  {
    id: "emission-scopes",
    label: "Scopes de emisión",
    table: "emission_scopes",
    supportsStatus: false,
    canCreate: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "activity-types",
    label: "Tipos de actividad",
    table: "activity_types",
    supportsStatus: true,
    canCreate: true,
    canEditCode: false,
    usesCode: false,
    fields: [
      { key: "categoryId", label: "Categoría de emisión", type: "select", source: "emissionCategories", required: true },
      { key: "suggestedAssetType", label: "Activo sugerido", type: "select", source: "assetTypes" },
    ],
  },
  {
    id: "record-statuses",
    label: "Estados de registro",
    table: "record_status",
    controlled: true,
    sourceEnum: "record_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "target-statuses",
    label: "Estados de meta",
    table: "target_status",
    controlled: true,
    sourceEnum: "target_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "action-statuses",
    label: "Estados de acción",
    table: "action_status",
    controlled: true,
    sourceEnum: "action_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "notification-statuses",
    label: "Estados de notificación",
    table: "notif_status",
    controlled: true,
    sourceEnum: "notif_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "asset-types",
    label: "Tipos de activo",
    table: "asset_type",
    controlled: true,
    sourceEnum: "asset_type",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "file-kinds",
    label: "Tipos de evidencia",
    table: "file_kind",
    controlled: true,
    sourceEnum: "file_kind",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "export-statuses",
    label: "Estados de exportación",
    table: "export_status",
    controlled: true,
    sourceEnum: "export_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "export-formats",
    label: "Formatos de exportación",
    table: "export_format",
    controlled: true,
    sourceEnum: "export_format",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "target-types",
    label: "Tipos de meta",
    table: "target_type",
    controlled: true,
    sourceEnum: "target_type",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "equipment-categories",
    label: "Categorías de equipo",
    table: "equipment_inventory.category_code",
    controlled: true,
    staticValues: ["electricidad", "combustible", "otros"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "area-access-modes",
    label: "Modos de acceso por área",
    table: "area_access_mode",
    controlled: true,
    sourceEnum: "area_access_mode",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "profile-change-types",
    label: "Tipos de solicitud de perfil",
    table: "profile_change_type",
    controlled: true,
    sourceEnum: "profile_change_type",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "profile-change-statuses",
    label: "Estados de solicitud de perfil",
    table: "profile_change_status",
    controlled: true,
    sourceEnum: "profile_change_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ml-model-families",
    label: "Familias de modelo IA",
    table: "ml_model_family",
    controlled: true,
    sourceEnum: "ml_model_family",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ml-model-uses",
    label: "Usos de modelo IA",
    table: "ml_model_use",
    controlled: true,
    sourceEnum: "ml_model_use",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ml-run-statuses",
    label: "Estados de ejecución IA",
    table: "ml_run_status",
    controlled: true,
    sourceEnum: "ml_run_status",
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "notification-types",
    label: "Tipos de notificación",
    table: "notifications.type",
    controlled: true,
    staticValues: ["record_created", "record_imported", "record_archived", "export_done", "factor_updated", "goal_risk", "system"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "device-types",
    label: "Tipos de dispositivo IoT",
    table: "iot_devices.device_type",
    controlled: true,
    staticValues: ["ESP32", "ESP8266", "EDGE_GATEWAY", "CUSTOM"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "device-protocols",
    label: "Protocolos de dispositivo IoT",
    table: "iot_devices.protocol",
    controlled: true,
    staticValues: ["https", "mqtt"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "device-stream-modes",
    label: "Modos de transmisión IoT",
    table: "iot_devices.stream_mode",
    controlled: true,
    staticValues: ["scheduled", "realtime"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "equipment-types",
    label: "Tipos de equipo",
    table: "equipment_inventory.type",
    controlled: true,
    staticValues: ["it", "iluminacion", "clima", "redes", "industrial", "agricola", "admin", "otro"],
    staticLabels: { admin: "Administrativo" },
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "org-entity-types",
    label: "Tipos de entidad organizacional",
    table: "org_units.type",
    controlled: true,
    staticValues: ["building", "area", "department", "laboratory", "workshop", "office", "classroom", "zone"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "period-types",
    label: "Tipos de periodo",
    table: "periods.type",
    controlled: true,
    staticValues: ["monthly", "bimonthly", "quarterly", "semester", "annual"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "period-statuses",
    label: "Estados de periodo",
    table: "periods.status",
    controlled: true,
    staticValues: ["open", "review", "closed"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "record-file-purposes",
    label: "Propósitos de evidencia",
    table: "record_files.purpose",
    controlled: true,
    staticValues: ["evidence"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "user-setting-themes",
    label: "Temas de interfaz",
    table: "user_settings.theme",
    controlled: true,
    staticValues: ["light", "dark", "system"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "date-formats",
    label: "Formatos de fecha",
    table: "user_settings.locale.dateFormat",
    controlled: true,
    staticValues: ["DD/MM/YYYY", "YYYY-MM-DD"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "co2e-display-units",
    label: "Unidades de visualización CO2e",
    table: "user_settings.units.co2e",
    controlled: true,
    staticValues: ["kg", "t"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "device-default-intervals",
    label: "Intervalos predeterminados de dispositivo",
    table: "user_settings.defaults.defaultIntervalSeconds",
    controlled: true,
    staticValues: ["60", "300", "900", "3600"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "alert-types",
    label: "Tipos de alerta",
    table: "alert_rules.type",
    controlled: true,
    staticValues: ["device", "anomaly", "factor", "period", "goal", "validation", "security"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "alert-severities",
    label: "Severidades de alerta",
    table: "alert_rules.severity",
    controlled: true,
    staticValues: ["info", "warning", "critical"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "alert-priorities",
    label: "Prioridades de alerta",
    table: "alert_rules.priority",
    controlled: true,
    staticValues: ["low", "normal", "high"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "alert-frequencies",
    label: "Frecuencias de alerta",
    table: "alert_rules.frequency",
    controlled: true,
    staticValues: ["immediate", "daily", "weekly"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "notification-channels",
    label: "Canales de notificación",
    table: "notification_channels",
    controlled: true,
    staticValues: ["email", "push", "inapp", "sms", "dashboard", "audit"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "report-categories",
    label: "Categorías de reporte",
    table: "report_templates.category",
    controlled: true,
    staticValues: ["period", "area", "scope", "category", "goals", "users", "devices", "comparative"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "validation-outcomes",
    label: "Resultados de validación",
    table: "validation_decisions.decision",
    controlled: true,
    staticValues: ["approved", "rejected", "returned"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-anomaly-statuses",
    label: "Estados de anomalía IA",
    table: "ai_anomalies.status",
    controlled: true,
    staticValues: ["open", "reviewed", "resolved"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-recommendation-statuses",
    label: "Estados de recomendación IA",
    table: "ai_recommendations.status",
    controlled: true,
    staticValues: ["new", "in_review", "applied", "dismissed"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-variables",
    label: "Variables disponibles para IA",
    table: "ai_config.variables",
    controlled: true,
    staticValues: ["consumo", "scope", "categoria", "area", "periodo", "factor", "dispositivo", "estacionalidad"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-period-ranges",
    label: "Rangos de entrenamiento IA",
    table: "ai_config.periodRange",
    controlled: true,
    staticValues: ["last-6m", "last-12m", "last-24m", "all"],
    staticLabels: { all: "Todo el historial" },
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-data-modes",
    label: "Modos de datos IA",
    table: "ai_config.dataMode",
    controlled: true,
    staticValues: ["real", "estimated", "both"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-access-modes",
    label: "Modos de acceso IA",
    table: "ai_config.accessMode",
    controlled: true,
    staticValues: ["read-only", "suggestions"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-allowed-data",
    label: "Datos permitidos para IA",
    table: "ai_config.allowedData",
    controlled: true,
    staticValues: ["records", "factors", "goals", "periods", "devices", "audit"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-restricted-data",
    label: "Datos restringidos para IA",
    table: "ai_config.restrictedData",
    controlled: true,
    staticValues: ["passwords", "tokens", "sensitive-personal", "private-files", "raw-secrets"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-usage-limits",
    label: "Límites de uso IA",
    table: "ai_config.usageLimit",
    controlled: true,
    staticValues: ["role-area-period", "role-campus-period", "admin-only"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-models",
    label: "Modelos IA configurables",
    table: "ai_config.selectedModel",
    controlled: true,
    staticValues: ["carbontrack-forecast", "carbontrack-anomaly", "carbontrack-hybrid"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-recommendation-types",
    label: "Tipos de recomendación IA",
    table: "ai_config.recommendationTypes",
    controlled: true,
    staticValues: ["energy", "maintenance", "goals", "operations", "devices"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-approval-policies",
    label: "Políticas de aprobación IA",
    table: "ai_config.approvalPolicy",
    controlled: true,
    staticValues: ["manual", "high-confidence", "advisory-only"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-explanation-levels",
    label: "Niveles de explicación IA",
    table: "ai_config.explanationLevel",
    controlled: true,
    staticValues: ["summary", "standard", "detailed"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-modules",
    label: "Módulos IA",
    table: "ai_modules.id",
    controlled: true,
    staticValues: ["emissions-forecast", "anomaly-detection", "smart-recommendations", "goal-risk", "capture-assist", "natural-language"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
  {
    id: "ai-objectives",
    label: "Objetivos IA",
    table: "ai_model_objectives.id",
    controlled: true,
    staticValues: ["predict", "anomaly", "goals", "consumption", "operations"],
    supportsStatus: false,
    canCreate: false,
    canEdit: false,
    canEditCode: false,
    fields: [],
  },
]);

const DEFINITION_BY_ID = new Map(CATALOG_DEFINITIONS.map((definition) => [definition.id, definition]));

function cleanString(value) {
  return String(value ?? "").trim();
}

function requireDefinition(catalogId) {
  const definition = DEFINITION_BY_ID.get(cleanString(catalogId));
  if (!definition) {
    throw new AppError({
      statusCode: 404,
      code: "CATALOG_NOT_FOUND",
      message: "The requested catalog does not exist.",
    });
  }
  return definition;
}

function requireText(payload, field, maxLength = 120) {
  const value = cleanString(payload?.[field]);
  if (!value || value.length > maxLength) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} is required or exceeds the allowed length.`,
      details: { field },
    });
  }
  return value;
}

function optionalText(payload, field, maxLength = 500) {
  const value = cleanString(payload?.[field]);
  if (value.length > maxLength) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} exceeds the allowed length.`,
      details: { field },
    });
  }
  return value || null;
}

function statusToBoolean(status) {
  return cleanString(status || "active") !== "inactive";
}

function buildAuditPayload(actor, auditContext, details = {}) {
  return {
    organizationId: actor.organizationId,
    userId: actor.id,
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
    details,
  };
}

function normalizeUnit(row, index) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || `Dimensión: ${row.dimension}`,
    status: row.is_active ? "active" : "inactive",
    isDefault: false,
    order: index + 1,
    symbol: row.symbol || "",
    dimension: row.dimension,
    toBaseMultiplier: Number(row.to_base_multiplier),
  };
}

function normalizeMetric(row, index) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    status: row.is_active ? "active" : "inactive",
    isDefault: false,
    order: index + 1,
    dimension: row.dimension,
    baseUnitId: row.base_unit_id,
  };
}

function normalizeDataSource(row, index) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    status: row.is_active ? "active" : "inactive",
    isDefault: row.code === "metered",
    order: index + 1,
    reliabilityRank: Number(row.reliability_rank),
  };
}

function normalizeSimple(row, index) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    status: row.is_active ? "active" : "inactive",
    isDefault: false,
    order: index + 1,
  };
}

function normalizeScope(row, index) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    status: "active",
    isDefault: row.code === "scope2",
    order: index + 1,
  };
}

function normalizeCategory(row, index) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || row.scope_name || "",
    status: row.is_active ? "active" : "inactive",
    isDefault: false,
    order: index + 1,
    scopeId: row.scope_id,
    defaultMetricId: row.default_metric_id,
    defaultUnitId: row.default_unit_id,
    scopeCode: row.scope_code,
  };
}

function normalizeActivityType(row, index) {
  return {
    id: row.id,
    code: row.suggested_asset_type || "actividad",
    name: row.name,
    description: row.description || row.category_name || "",
    status: row.is_active ? "active" : "inactive",
    isDefault: false,
    order: index + 1,
    categoryId: row.category_id,
    suggestedAssetType: row.suggested_asset_type || "",
  };
}

function labelControlledValue(value) {
  return CONTROLLED_VALUE_LABELS[value] || String(value || "");
}

function normalizeControlledValue(value, index, source = "Sistema", labels = {}) {
  return {
    id: `${source}-${value}`,
    code: value,
    name: labels[value] || labelControlledValue(value),
    description: `Valor controlado por ${source}.`,
    status: "active",
    isDefault: false,
    order: index + 1,
    controlled: true,
  };
}

async function listEnumEntries(enumName, client = { query }) {
  const result = await client.query(
    `
      SELECT e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = $1
      ORDER BY e.enumsortorder
    `,
    [enumName],
  );
  return result.rows.map((row, index) => normalizeControlledValue(row.value, index, enumName));
}

async function fetchOptions(client = { query }) {
  const scopes = await client.query(`SELECT id, code::text AS code, name FROM emission_scopes ORDER BY code::text`);
  const units = await client.query(`SELECT id, code, name, symbol, dimension FROM units WHERE is_active = true ORDER BY code`);
  const metrics = await client.query(`SELECT id, code, name, dimension FROM metrics WHERE is_active = true ORDER BY code`);
  const categories = await client.query(
    `
      SELECT ec.id, ec.code, ec.name, es.code::text AS scope_code
      FROM emission_categories ec
      JOIN emission_scopes es ON es.id = ec.scope_id
      WHERE ec.is_active = true
      ORDER BY es.code::text, ec.code
    `,
  );

  return {
    emissionScopes: scopes.rows.map((row) => ({ value: row.id, label: `${row.code} - ${row.name}` })),
    units: units.rows.map((row) => ({ value: row.id, label: `${row.code}${row.symbol ? ` (${row.symbol})` : ""} - ${row.name}` })),
    metrics: metrics.rows.map((row) => ({ value: row.id, label: `${row.code} - ${row.name}` })),
    emissionCategories: categories.rows.map((row) => ({ value: row.id, label: `${row.scope_code} / ${row.code} - ${row.name}` })),
    assetTypes: [
      { value: "", label: "Sin sugerencia" },
      { value: "meter", label: "Medidor" },
      { value: "vehicle", label: "Vehículo" },
      { value: "equipment", label: "Equipo" },
      { value: "generator", label: "Generador" },
      { value: "hvac", label: "HVAC" },
      { value: "it_device", label: "Dispositivo TI" },
      { value: "tractor", label: "Tractor" },
      { value: "other", label: "Otro" },
    ],
  };
}

async function listEntries(definition, client = { query }) {
  if (definition.sourceEnum) {
    return listEnumEntries(definition.sourceEnum, client);
  }

  if (definition.staticValues) {
    return definition.staticValues.map((value, index) => normalizeControlledValue(value, index, definition.table, definition.staticLabels));
  }

  switch (definition.id) {
    case "measurement-units": {
      const result = await client.query(`SELECT id, code, name, symbol, dimension, to_base_multiplier, is_active FROM units ORDER BY code`);
      return result.rows.map(normalizeUnit);
    }
    case "metrics": {
      const result = await client.query(`SELECT id, code, name, dimension, base_unit_id, description, is_active FROM metrics ORDER BY code`);
      return result.rows.map(normalizeMetric);
    }
    case "data-sources": {
      const result = await client.query(`SELECT id, code, name, reliability_rank, description, is_active FROM data_sources ORDER BY reliability_rank, code`);
      return result.rows.map(normalizeDataSource);
    }
    case "estimation-methods": {
      const result = await client.query(`SELECT id, code, name, description, is_active FROM estimation_methods ORDER BY code`);
      return result.rows.map(normalizeSimple);
    }
    case "fuel-types": {
      const result = await client.query(`SELECT id, code, name, NULL::text AS description, is_active FROM fuel_types ORDER BY code`);
      return result.rows.map(normalizeSimple);
    }
    case "emission-scopes": {
      const result = await client.query(`SELECT id, code::text AS code, name, description FROM emission_scopes ORDER BY code::text`);
      return result.rows.map(normalizeScope);
    }
    case "emission-categories": {
      const result = await client.query(
        `
          SELECT
            ec.id,
            ec.code,
            ec.name,
            ec.scope_id,
            ec.default_metric_id,
            ec.default_unit_id,
            ec.is_active,
            es.code::text AS scope_code,
            es.name AS scope_name
          FROM emission_categories ec
          JOIN emission_scopes es ON es.id = ec.scope_id
          ORDER BY es.code::text, ec.code
        `,
      );
      return result.rows.map(normalizeCategory);
    }
    case "activity-types": {
      const result = await client.query(
        `
          SELECT
            at.id,
            at.category_id,
            at.name,
            at.suggested_asset_type::text AS suggested_asset_type,
            at.description,
            at.is_active,
            ec.name AS category_name
          FROM activity_types at
          JOIN emission_categories ec ON ec.id = at.category_id
          JOIN emission_scopes es ON es.id = ec.scope_id
          ORDER BY es.code::text, ec.code, at.name
        `,
      );
      return result.rows.map(normalizeActivityType);
    }
    default:
      return [];
  }
}

export async function listAdminCatalogs() {
  return withTransaction(async (client) => {
    const entries = {};
    for (const definition of CATALOG_DEFINITIONS) {
      entries[definition.id] = await listEntries(definition, client);
    }

    return {
      definitions: CATALOG_DEFINITIONS.map((definition) => ({
        id: definition.id,
        label: definition.label,
        status: "active",
        count: entries[definition.id]?.length || 0,
        supportsStatus: definition.supportsStatus,
        canCreate: definition.canCreate,
        canEdit: definition.canEdit !== false,
        canEditCode: definition.canEditCode,
        usesCode: definition.usesCode !== false,
        controlled: Boolean(definition.controlled),
        fields: definition.fields,
      })),
      entries,
      options: await fetchOptions(client),
    };
  });
}

async function ensureReference(client, table, id, field) {
  const result = await client.query(`SELECT id FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
  if (result.rowCount < 1) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} does not reference an existing value.`,
      details: { field },
    });
  }
}

async function insertEntry(client, definition, payload) {
  const code = requireText(payload, "code", 60).toLowerCase();
  const name = requireText(payload, "name", 120);
  const description = optionalText(payload, "description", 500);
  const isActive = statusToBoolean(payload.status);

  switch (definition.id) {
    case "measurement-units": {
      const dimension = requireText(payload, "dimension", 30);
      const toBaseMultiplier = Number(payload.toBaseMultiplier || 1);
      if (!Number.isFinite(toBaseMultiplier) || toBaseMultiplier <= 0) {
        throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "toBaseMultiplier must be greater than zero.", details: { field: "toBaseMultiplier" } });
      }
      const result = await client.query(
        `INSERT INTO units (code, name, symbol, dimension, to_base_multiplier, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [code, name, optionalText(payload, "symbol", 20), dimension, toBaseMultiplier, isActive],
      );
      return normalizeUnit(result.rows[0], 0);
    }
    case "metrics": {
      const dimension = requireText(payload, "dimension", 30);
      await ensureReference(client, "units", payload.baseUnitId, "baseUnitId");
      const result = await client.query(
        `INSERT INTO metrics (code, name, dimension, base_unit_id, description, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [code, name, dimension, payload.baseUnitId, description, isActive],
      );
      return normalizeMetric(result.rows[0], 0);
    }
    case "data-sources": {
      const reliabilityRank = Number(payload.reliabilityRank || 3);
      const result = await client.query(
        `INSERT INTO data_sources (code, name, reliability_rank, description, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [code, name, reliabilityRank, description, isActive],
      );
      return normalizeDataSource(result.rows[0], 0);
    }
    case "estimation-methods": {
      const result = await client.query(
        `INSERT INTO estimation_methods (code, name, description, is_active) VALUES ($1,$2,$3,$4) RETURNING *`,
        [code, name, description, isActive],
      );
      return normalizeSimple(result.rows[0], 0);
    }
    case "fuel-types": {
      const result = await client.query(
        `INSERT INTO fuel_types (code, name, is_active) VALUES ($1,$2,$3) RETURNING id, code, name, NULL::text AS description, is_active`,
        [code, name, isActive],
      );
      return normalizeSimple(result.rows[0], 0);
    }
    case "emission-categories": {
      await ensureReference(client, "emission_scopes", payload.scopeId, "scopeId");
      await ensureReference(client, "metrics", payload.defaultMetricId, "defaultMetricId");
      await ensureReference(client, "units", payload.defaultUnitId, "defaultUnitId");
      const result = await client.query(
        `
          INSERT INTO emission_categories (scope_id, code, name, default_metric_id, default_unit_id, is_active)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING id, code, name, scope_id, default_metric_id, default_unit_id, is_active
        `,
        [payload.scopeId, code, name, payload.defaultMetricId, payload.defaultUnitId, isActive],
      );
      return normalizeCategory(result.rows[0], 0);
    }
    case "activity-types": {
      await ensureReference(client, "emission_categories", payload.categoryId, "categoryId");
      const result = await client.query(
        `
          INSERT INTO activity_types (category_id, name, suggested_asset_type, description, is_active)
          VALUES ($1,$2,$3::asset_type,$4,$5)
          RETURNING id, category_id, name, suggested_asset_type::text AS suggested_asset_type, description, is_active
        `,
        [payload.categoryId, name, cleanString(payload.suggestedAssetType) || null, description, isActive],
      );
      return normalizeActivityType(result.rows[0], 0);
    }
    default:
      throw new AppError({ statusCode: 405, code: "CATALOG_READ_ONLY", message: "This catalog cannot create entries." });
  }
}

async function updateEntry(client, definition, entryId, payload) {
  const name = requireText(payload, "name", 120);
  const description = optionalText(payload, "description", 500);
  const isActive = statusToBoolean(payload.status);

  switch (definition.id) {
    case "measurement-units": {
      const dimension = requireText(payload, "dimension", 30);
      const toBaseMultiplier = Number(payload.toBaseMultiplier || 1);
      const result = await client.query(
        `UPDATE units SET code = $2, name = $3, symbol = $4, dimension = $5, to_base_multiplier = $6, is_active = $7 WHERE id = $1 RETURNING *`,
        [entryId, requireText(payload, "code", 40).toLowerCase(), name, optionalText(payload, "symbol", 20), dimension, toBaseMultiplier, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeUnit(result.rows[0], 0);
    }
    case "metrics": {
      const dimension = requireText(payload, "dimension", 30);
      await ensureReference(client, "units", payload.baseUnitId, "baseUnitId");
      const result = await client.query(
        `UPDATE metrics SET code = $2, name = $3, dimension = $4, base_unit_id = $5, description = $6, is_active = $7 WHERE id = $1 RETURNING *`,
        [entryId, requireText(payload, "code", 60).toLowerCase(), name, dimension, payload.baseUnitId, description, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeMetric(result.rows[0], 0);
    }
    case "data-sources": {
      const reliabilityRank = Number(payload.reliabilityRank || 3);
      const result = await client.query(
        `UPDATE data_sources SET code = $2, name = $3, reliability_rank = $4, description = $5, is_active = $6 WHERE id = $1 RETURNING *`,
        [entryId, requireText(payload, "code", 40).toLowerCase(), name, reliabilityRank, description, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeDataSource(result.rows[0], 0);
    }
    case "estimation-methods": {
      const result = await client.query(
        `UPDATE estimation_methods SET code = $2, name = $3, description = $4, is_active = $5 WHERE id = $1 RETURNING *`,
        [entryId, requireText(payload, "code", 60).toLowerCase(), name, description, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeSimple(result.rows[0], 0);
    }
    case "fuel-types": {
      const result = await client.query(
        `UPDATE fuel_types SET code = $2, name = $3, is_active = $4 WHERE id = $1 RETURNING id, code, name, NULL::text AS description, is_active`,
        [entryId, requireText(payload, "code", 40).toLowerCase(), name, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeSimple(result.rows[0], 0);
    }
    case "emission-scopes": {
      const result = await client.query(
        `UPDATE emission_scopes SET name = $2, description = $3 WHERE id = $1 RETURNING id, code::text AS code, name, description`,
        [entryId, name, description],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeScope(result.rows[0], 0);
    }
    case "emission-categories": {
      await ensureReference(client, "emission_scopes", payload.scopeId, "scopeId");
      await ensureReference(client, "metrics", payload.defaultMetricId, "defaultMetricId");
      await ensureReference(client, "units", payload.defaultUnitId, "defaultUnitId");
      const result = await client.query(
        `
          UPDATE emission_categories
          SET scope_id = $2, code = $3, name = $4, default_metric_id = $5, default_unit_id = $6, is_active = $7
          WHERE id = $1
          RETURNING id, code, name, scope_id, default_metric_id, default_unit_id, is_active
        `,
        [entryId, payload.scopeId, requireText(payload, "code", 60).toLowerCase(), name, payload.defaultMetricId, payload.defaultUnitId, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeCategory(result.rows[0], 0);
    }
    case "activity-types": {
      await ensureReference(client, "emission_categories", payload.categoryId, "categoryId");
      const result = await client.query(
        `
          UPDATE activity_types
          SET category_id = $2, name = $3, suggested_asset_type = $4::asset_type, description = $5, is_active = $6
          WHERE id = $1
          RETURNING id, category_id, name, suggested_asset_type::text AS suggested_asset_type, description, is_active
        `,
        [entryId, payload.categoryId, name, cleanString(payload.suggestedAssetType) || null, description, isActive],
      );
      if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
      return normalizeActivityType(result.rows[0], 0);
    }
    default:
      throw new AppError({ statusCode: 405, code: "CATALOG_READ_ONLY", message: "This catalog cannot be edited." });
  }
}

export async function createAdminCatalogEntry(actor, catalogId, payload, auditContext) {
  const definition = requireDefinition(catalogId);
  if (!definition.canCreate) {
    throw new AppError({ statusCode: 405, code: "CATALOG_READ_ONLY", message: "This catalog is controlled by database enums and cannot create entries here." });
  }

  return withTransaction(async (client) => {
    const entry = await insertEntry(client, definition, payload);
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { catalogId, code: entry.code, name: entry.name }),
      eventType: "catalogs.create",
      entityType: definition.table,
      entityId: entry.id,
    });
    return entry;
  });
}

export async function updateAdminCatalogEntry(actor, catalogId, entryId, payload, auditContext) {
  const definition = requireDefinition(catalogId);
  if (definition.canEdit === false) {
    throw new AppError({ statusCode: 405, code: "CATALOG_READ_ONLY", message: "This catalog is controlled by the system and cannot be edited here." });
  }

  return withTransaction(async (client) => {
    const entry = await updateEntry(client, definition, entryId, payload);
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { catalogId, code: entry.code, name: entry.name }),
      eventType: "catalogs.update",
      entityType: definition.table,
      entityId: entry.id,
    });
    return entry;
  });
}

export async function updateAdminCatalogEntryStatus(actor, catalogId, entryId, payload, auditContext) {
  const definition = requireDefinition(catalogId);
  if (!definition.supportsStatus) {
    throw new AppError({ statusCode: 405, code: "STATUS_NOT_SUPPORTED", message: "This catalog does not support status changes." });
  }

  return withTransaction(async (client) => {
    const current = await listEntries(definition, client);
    const entry = current.find((item) => item.id === entryId);
    if (!entry) throw new AppError({ statusCode: 404, code: "ENTRY_NOT_FOUND", message: "The catalog entry does not exist." });
    const updated = await updateEntry(client, definition, entryId, { ...entry, status: payload.status });
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { catalogId, code: updated.code, status: updated.status }),
      eventType: "catalogs.status_change",
      entityType: definition.table,
      entityId: updated.id,
    });
    return updated;
  });
}
