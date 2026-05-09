import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Battery,
  Building2,
  CalendarDays,
  Clock,
  Cpu,
  Database,
  KeyRound,
  MapPin,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminTabs from "../components/AdminTabs";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { fetchAdminAuditEvents, fetchOrgStructure } from "../../api/admin";
import {
  fetchDevices,
  fetchDeviceReadings,
  fetchDeviceTrainingReadings,
  removeDevice,
  removeDeviceReading,
  updateDeviceReadingTraining,
} from "../../api/devices";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS_META = {
  online: { variant: "success", label: "En línea", icon: Wifi },
  provisioning: { variant: "warning", label: "Provisionando", icon: Clock },
  offline: { variant: "error", label: "Sin conexión", icon: WifiOff },
  alert: { variant: "error", label: "Revisar", icon: AlertTriangle },
};

const DEVICE_TYPE_OPTIONS = [
  { value: "ESP32", label: "ESP32" },
  { value: "ESP8266", label: "ESP8266" },
  { value: "EDGE_GATEWAY", label: "Gateway de borde" },
  { value: "CUSTOM", label: "Personalizado" },
];

const STREAM_OPTIONS = [
  { value: "scheduled", label: "Programado" },
  { value: "realtime", label: "Tiempo real" },
];

const EMPTY_NOTICE = { type: "", message: "" };

function normalizeDeviceRow(device = {}) {
  const status = String(device.status || (device.enabled ? "provisioning" : "offline")).toLowerCase();
  const enabled = typeof device.enabled === "boolean" ? device.enabled : true;
  const intervalSeconds = Number(device.intervalSeconds || 60) || 60;
  const lastSeenAt = device.lastSeenAt || null;
  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const isStale = !lastSeenMs || Date.now() - lastSeenMs > Math.max(intervalSeconds * 2, 300) * 1000;

  return {
    ...device,
    id: String(device.id || ""),
    name: String(device.name || "").trim(),
    code: String(device.code || "").trim().toUpperCase(),
    campusCode: String(device.campusCode || "").trim().toUpperCase(),
    areaCode: String(device.areaCode || "").trim().toUpperCase(),
    protocol: String(device.protocol || "https").toLowerCase(),
    streamMode: String(device.streamMode || "scheduled").toLowerCase(),
    intervalSeconds: String(intervalSeconds),
    metric: String(device.metric || "electricity_consumption"),
    unit: String(device.unit || "kWh"),
    backendUrl: String(device.backendUrl || ""),
    endpointPath: String(device.endpointPath || "/iot/readings"),
    wifiProfile: String(device.wifiProfile || "Campus-IoT"),
    deviceType: String(device.deviceType || "ESP32").toUpperCase(),
    notes: String(device.notes || ""),
    tlsRequired: typeof device.tlsRequired === "boolean" ? device.tlsRequired : true,
    verifyServerCert: typeof device.verifyServerCert === "boolean" ? device.verifyServerCert : true,
    offlineBuffer: typeof device.offlineBuffer === "boolean" ? device.offlineBuffer : true,
    enabled,
    status: enabled ? status : "offline",
    lastSeenAt,
    firmwareVersion: String(device.firmwareVersion || ""),
    readingsToday: Number(device.readingsToday || 0),
    batteryLevel: Number.isFinite(Number(device.batteryLevel)) ? Number(device.batteryLevel) : null,
    batteryVoltage: Number.isFinite(Number(device.batteryVoltage)) ? Number(device.batteryVoltage) : null,
    batteryStatus: String(device.batteryStatus || "unknown"),
    isStale,
  };
}

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.provisioning;
}

function formatDateTime(value) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no válida";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateKey(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no válida";
  return date.toISOString().slice(0, 10);
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toLocaleString("es-MX", { maximumFractionDigits: 3 })}${suffix}`;
}

function getOperationalKey(device) {
  if (!device.enabled) return "inactive";
  if (device.status === "online") return "active";
  return "attention";
}

function getOperationalBadge(device) {
  const key = getOperationalKey(device);
  if (key === "active") return { variant: "success", label: "Operativo" };
  if (key === "inactive") return { variant: "neutral", label: "Desactivado" };
  return { variant: "warning", label: "Con seguimiento" };
}

function getHealthPercent(device) {
  if (!device.enabled) return 0;
  if (device.status === "online" && !device.isStale) return 100;
  if (device.status === "provisioning") return 70;
  if (device.status === "online") return 80;
  return 35;
}

function getBatteryBadge(device) {
  if (device.batteryLevel === null) return { variant: "neutral", label: "Sin dato" };
  if (device.batteryStatus === "critical") return { variant: "error", label: "Crítica" };
  if (device.batteryStatus === "low") return { variant: "warning", label: "Baja" };
  return { variant: "success", label: "Estable" };
}

function formatBattery(device) {
  if (device.batteryLevel === null) return "Sin lectura";
  const voltage = device.batteryVoltage !== null ? ` · ${device.batteryVoltage} V` : "";
  return `${device.batteryLevel}%${voltage}`;
}

function errorMessage(error) {
  const code = error?.payload?.code || error?.code;
  const field = error?.payload?.details?.field;
  const message = String(error?.payload?.message || error?.message || "").trim();

  if (code === "backend_not_configured") return "El backend no está configurado para esta sesión.";
  if (code === "DEVICE_CODE_ALREADY_EXISTS") return "Ya existe un dispositivo con ese código.";
  if (code === "INVALID_BINDING") return "El campus y el área seleccionados no existen o no pertenecen a la organización.";
  if (field === "backendUrl") return "La URL de ingesta debe ser absoluta y coincidir con el protocolo seleccionado.";
  if (field === "intervalSeconds") return "El intervalo debe ser un número entero positivo.";
  if (message && message !== "request_failed") return message;
  return "No se pudo completar la operación. Revisa la conexión con el backend.";
}

function buildAreaOptions(structure, campusCode) {
  const campus = structure.campuses.find((item) => item.code === campusCode);
  return structure.entities
    .filter((entity) => entity.status !== "inactive")
    .filter((entity) => entity.type !== "building")
    .filter((entity) => !campus || entity.campusId === campus.id)
    .map((entity) => ({ value: entity.code, label: `${entity.name} (${entity.code})`, campusId: entity.campusId }));
}

export default function DevicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [devices, setDevices] = React.useState([]);
  const [structure, setStructure] = React.useState({ campuses: [], entities: [] });
  const [auditEvents, setAuditEvents] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState("inventory");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ status: "all", type: "all", campus: "all" });
  const [readingFilters, setReadingFilters] = React.useState({ deviceId: "", dateFrom: "", dateTo: "" });
  const [readings, setReadings] = React.useState([]);
  const [readingsLoading, setReadingsLoading] = React.useState(false);
  const [trainingFilters, setTrainingFilters] = React.useState({ deviceId: "", dateFrom: "", dateTo: "" });
  const [trainingRows, setTrainingRows] = React.useState([]);
  const [trainingLoading, setTrainingLoading] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [confirm, setConfirm] = React.useState(null);
  const [notice, setNotice] = React.useState(EMPTY_NOTICE);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setNotice(EMPTY_NOTICE);
    try {
      const [deviceItems, orgStructure, events] = await Promise.all([
        fetchDevices(),
        fetchOrgStructure(),
        fetchAdminAuditEvents({ module: "device" }).catch(() => []),
      ]);
      setDevices((Array.isArray(deviceItems) ? deviceItems : []).map(normalizeDeviceRow));
      setStructure({
        campuses: Array.isArray(orgStructure?.campuses) ? orgStructure.campuses : [],
        entities: Array.isArray(orgStructure?.entities) ? orgStructure.entities : [],
      });
      setAuditEvents(Array.isArray(events) ? events : []);
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!selected) return;
    const fresh = devices.find((device) => device.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [devices, selected]);

  const loadReadings = React.useCallback(async () => {
    if (activeTab !== "readings" || devices.length === 0) return;
    const targetDeviceId = readingFilters.deviceId;
    if (!targetDeviceId) {
      setReadings([]);
      return;
    }

    setReadingsLoading(true);
    try {
      const items = await fetchDeviceReadings(targetDeviceId, {
        dateFrom: readingFilters.dateFrom,
        dateTo: readingFilters.dateTo,
        limit: 1000,
      });
      setReadings(items);
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
      setReadings([]);
    } finally {
      setReadingsLoading(false);
    }
  }, [activeTab, devices, readingFilters]);

  React.useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const loadTrainingRows = React.useCallback(async () => {
    if (activeTab !== "training" || devices.length === 0) return;
    const targetDeviceId = trainingFilters.deviceId;
    if (!targetDeviceId) {
      setTrainingRows([]);
      return;
    }

    setTrainingLoading(true);
    try {
      const items = await fetchDeviceTrainingReadings(targetDeviceId, {
        dateFrom: trainingFilters.dateFrom,
        dateTo: trainingFilters.dateTo,
        limit: 1000,
      });
      setTrainingRows(items);
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
      setTrainingRows([]);
    } finally {
      setTrainingLoading(false);
    }
  }, [activeTab, devices, trainingFilters]);

  React.useEffect(() => {
    loadTrainingRows();
  }, [loadTrainingRows]);

  const campusOptions = React.useMemo(
    () =>
      structure.campuses
        .filter((campus) => campus.status !== "inactive")
        .map((campus) => ({ value: campus.code, label: `${campus.name} (${campus.code})`, id: campus.id })),
    [structure.campuses],
  );

  const filtered = React.useMemo(
    () =>
      devices.filter((device) => {
        if (filters.status !== "all" && getOperationalKey(device) !== filters.status) return false;
        if (filters.type !== "all" && device.deviceType !== filters.type) return false;
        if (filters.campus !== "all" && device.campusCode !== filters.campus) return false;

        if (search.trim()) {
          const query = search.trim().toLowerCase();
          const haystack = [
            device.name,
            device.code,
            device.deviceType,
            device.campusCode,
            device.areaCode,
            device.protocol,
            device.firmwareVersion,
            device.batteryStatus,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }

        return true;
      }),
    [devices, filters, search],
  );

  const stats = React.useMemo(
    () => ({
      total: devices.length,
      active: devices.filter((device) => getOperationalKey(device) === "active").length,
      attention: devices.filter((device) => getOperationalKey(device) === "attention").length,
      offline: devices.filter((device) => device.status === "offline").length,
      lowBattery: devices.filter((device) => ["critical", "low"].includes(device.batteryStatus)).length,
      readingsToday: devices.reduce((sum, device) => sum + Number(device.readingsToday || 0), 0),
    }),
    [devices],
  );

  const readingStats = React.useMemo(
    () => ({
      total: readings.length,
      days: new Set(readings.map((reading) => formatDateKey(reading.recordedAt))).size,
      totalDelta: readings.reduce((sum, reading) => sum + (Number(reading.deltaKwh) || 0), 0),
      withBattery: readings.filter((reading) => reading.batteryLevel !== null).length,
    }),
    [readings],
  );

  const trainingStats = React.useMemo(
    () => ({
      total: trainingRows.length,
      ready: trainingRows.filter((reading) => reading.trainingStatus === "ready" && reading.trainingIncluded).length,
      review: trainingRows.filter((reading) => reading.trainingStatus === "review").length,
      excluded: trainingRows.filter((reading) => !reading.trainingIncluded || reading.trainingStatus === "excluded").length,
    }),
    [trainingRows],
  );

  const dailyReadingGroups = React.useMemo(() => {
    const groups = new Map();
    readings.forEach((reading) => {
      const key = formatDateKey(reading.recordedAt);
      const current = groups.get(key) || { id: key, date: key, count: 0, deltaKwh: 0, minBattery: null, lastReadingAt: null };
      current.count += 1;
      current.deltaKwh += Number(reading.deltaKwh) || 0;
      if (reading.batteryLevel !== null) {
        current.minBattery = current.minBattery === null ? reading.batteryLevel : Math.min(current.minBattery, reading.batteryLevel);
      }
      if (!current.lastReadingAt || new Date(reading.recordedAt) > new Date(current.lastReadingAt)) {
        current.lastReadingAt = reading.recordedAt;
      }
      groups.set(key, current);
    });
    return Array.from(groups.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [readings]);

  const selectedEvents = React.useMemo(
    () => auditEvents.filter((event) => String(event.target || event.details?.target || event.details?.code || "").includes(selected?.code || "") || event.details?.code === selected?.code || event.details?.sourceCode === selected?.code || String(event.details?.deviceCode || "") === selected?.code || String(event.details?.target || "") === selected?.code || String(event.target || "") === selected?.id).slice(0, 6),
    [auditEvents, selected],
  );

  async function refreshAfterMutation(message, selectedId) {
    const [deviceItems, events] = await Promise.all([
      fetchDevices(),
      fetchAdminAuditEvents({ module: "device" }).catch(() => []),
    ]);
    const nextDevices = (Array.isArray(deviceItems) ? deviceItems : []).map(normalizeDeviceRow);
    setDevices(nextDevices);
    setAuditEvents(Array.isArray(events) ? events : []);
    if (selectedId) {
      const nextSelected = nextDevices.find((device) => device.id === selectedId);
      if (nextSelected) setSelected(nextSelected);
    }
    setNotice({ type: "success", message });
  }

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.type === "reading") {
        await removeDeviceReading(confirm.deviceId, confirm.reading.id);
        setConfirm(null);
        await Promise.all([
          loadReadings(),
          refreshAfterMutation("Lectura eliminada correctamente.", confirm.deviceId),
        ]);
        return;
      }

      await removeDevice(confirm.device.id);
      setConfirm(null);
      setSelected((current) => (current?.id === confirm.device.id ? null : current));
      await refreshAfterMutation("Dispositivo eliminado correctamente.");
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setDeleting(false);
    }
  }

  async function handleTrainingUpdate(row, included) {
    try {
      const status = included ? (row.qualityIssues.length > 0 ? "review" : "ready") : "excluded";
      await updateDeviceReadingTraining(row.deviceId, row.id, {
        included,
        status,
        note: included ? "" : "Excluida desde el panel de administración.",
      });
      await loadTrainingRows();
      setNotice({ type: "success", message: included ? "Lectura incluida para preparación." : "Lectura excluida de la preparación." });
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    }
  }

  const columns = [
    {
      key: "name",
      label: "Dispositivo",
      width: 270,
      render: (value, row) => {
        const meta = statusMeta(row.status);
        const StatusIcon = meta.icon;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--eco-primary-600, #16A34A)", flexShrink: 0 }}>
              <StatusIcon size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{value || row.code}</div>
              <div style={{ fontSize: 11, color: "var(--eco-text-soft)", fontFamily: fm }}>{row.code}</div>
              <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <InlineChip icon={Building2} label={row.campusCode || "Sin campus"} />
                <InlineChip icon={MapPin} label={row.areaCode || "Sin área"} />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "deviceType",
      label: "Tipo",
      width: 150,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{DEVICE_TYPE_OPTIONS.find((item) => item.value === value)?.label || value}</div>
          <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>{row.protocol === "mqtt" ? "MQTT/TLS" : "HTTPS"}</div>
        </div>
      ),
    },
    {
      key: "enabled",
      label: "Operación",
      width: 150,
      render: (_, row) => {
        const badge = getOperationalBadge(row);
        return <AdminStatusBadge variant={badge.variant} label={badge.label} />;
      },
    },
    {
      key: "status",
      label: "Estado técnico",
      width: 170,
      render: (value, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AdminStatusBadge variant={statusMeta(value).variant} label={statusMeta(value).label} />
          <HealthBar value={getHealthPercent(row)} />
        </div>
      ),
    },
    {
      key: "lastSeenAt",
      label: "Actividad",
      width: 180,
      render: (value, row) => (
        <div>
          <div style={{ fontSize: 12 }}>{formatDateTime(value)}</div>
          <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
            {row.readingsToday} lecturas hoy
          </div>
        </div>
      ),
    },
    {
      key: "batteryLevel",
      label: "Pila",
      width: 130,
      render: (_, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <AdminStatusBadge variant={getBatteryBadge(row).variant} label={getBatteryBadge(row).label} />
          <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>{formatBattery(row)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: 90,
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(event) => event.stopPropagation()}>
          <IconButton title="Eliminar" icon={Trash2} danger onClick={() => setConfirm({ device: row })} />
        </div>
      ),
    },
  ];

  const readingColumns = [
    {
      key: "recordedAt",
      label: "Fecha de lectura",
      width: 190,
      render: (value) => (
        <div>
          <div style={{ fontWeight: 700 }}>{formatDateTime(value)}</div>
          <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 3 }}>{formatDateKey(value)}</div>
        </div>
      ),
    },
    {
      key: "totalKwh",
      label: "Total",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " kWh")}</span>,
    },
    {
      key: "deltaKwh",
      label: "Delta",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " kWh")}</span>,
    },
    {
      key: "voltage",
      label: "Voltaje",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " V")}</span>,
    },
    {
      key: "currentAmp",
      label: "Corriente",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " A")}</span>,
    },
    {
      key: "powerFactor",
      label: "FP",
      width: 90,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value)}</span>,
    },
    {
      key: "batteryLevel",
      label: "Pila",
      width: 120,
      render: (value, row) => (
        <span style={{ fontFamily: fm }}>
          {value === null ? "--" : `${value}%${row.batteryVoltage !== null ? ` · ${row.batteryVoltage} V` : ""}`}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: 90,
      render: (_, row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <IconButton title="Eliminar lectura" icon={Trash2} danger onClick={() => setConfirm({ type: "reading", deviceId: row.deviceId, reading: row })} />
        </div>
      ),
    },
  ];

  const dailyColumns = [
    { key: "date", label: "Fecha", width: 140, mono: true },
    { key: "count", label: "Lecturas", width: 100, align: "right" },
    {
      key: "deltaKwh",
      label: "Delta acumulado",
      width: 150,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " kWh")}</span>,
    },
    {
      key: "minBattery",
      label: "Pila mínima",
      width: 120,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{value === null ? "--" : `${value}%`}</span>,
    },
    {
      key: "lastReadingAt",
      label: "Última lectura",
      width: 180,
      render: (value) => formatDateTime(value),
    },
  ];

  const trainingColumns = [
    {
      key: "recordedAt",
      label: "Lectura",
      width: 190,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{formatDateTime(value)}</div>
          <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 3 }}>{row.deviceCode}</div>
        </div>
      ),
    },
    {
      key: "deltaKwh",
      label: "Delta",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " kWh")}</span>,
    },
    {
      key: "voltage",
      label: "Voltaje",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value, " V")}</span>,
    },
    {
      key: "powerFactor",
      label: "FP",
      width: 80,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{formatNumber(value)}</span>,
    },
    {
      key: "qualityIssues",
      label: "Calidad",
      width: 220,
      render: (value, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AdminStatusBadge
            variant={row.trainingStatus === "ready" ? "success" : row.trainingStatus === "excluded" ? "neutral" : "warning"}
            label={row.trainingStatus === "ready" ? "Lista" : row.trainingStatus === "excluded" ? "Excluida" : "Revisión"}
          />
          <span style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
            {value.length > 0 ? value.join(", ") : "Sin problemas detectados"}
          </span>
        </div>
      ),
    },
    {
      key: "trainingIncluded",
      label: "Entrenamiento",
      width: 140,
      render: (value) => (
        <AdminStatusBadge variant={value ? "success" : "neutral"} label={value ? "Incluida" : "Fuera"} />
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: 120,
      render: (_, row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleTrainingUpdate(row, !row.trainingIncluded)}
            style={secondaryButtonStyle}
          >
            {row.trainingIncluded ? "Excluir" : "Incluir"}
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={Cpu}
        title="Dispositivos"
        subtitle="Administración central de dispositivos IoT, credenciales, vínculos operativos y estado de captura."
        breadcrumb={["Operación", "Dispositivos"]}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate("/catalogos/dispositivos")}
              style={secondaryButtonStyle}
              title="Volver al módulo operativo de dispositivos"
            >
              <Cpu size={13} /> Dashboard / Dispositivos
            </button>
            <button type="button" onClick={loadData} style={secondaryButtonStyle}>
              <RefreshCw size={13} /> Actualizar
            </button>
          </div>
        }
      />

      {notice.message ? <Notice type={notice.type} message={notice.message} onClose={() => setNotice(EMPTY_NOTICE)} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Mini label="Inventario total" value={stats.total} icon={Cpu} color="#64748B" />
        <Mini label="Operativos" value={stats.active} icon={ShieldCheck} color="#16A34A" />
        <Mini label="Con seguimiento" value={stats.attention} icon={AlertTriangle} color="#CA8A04" />
        <Mini label="Sin conexión" value={stats.offline} icon={WifiOff} color="#DC2626" />
        <Mini label="Pila baja" value={stats.lowBattery} icon={Battery} color="#CA8A04" />
        <Mini label="Lecturas hoy" value={stats.readingsToday} icon={Activity} color="#7C3AED" />
      </div>

      <AdminTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "inventory", label: "Inventario", count: devices.length },
          { id: "readings", label: "Lecturas", count: readings.length },
          { id: "training", label: "Preparación IA", count: trainingRows.length },
        ]}
      />

      {activeTab === "inventory" ? (
      <>
      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre, código, campus, área, protocolo o firmware..."
          filters={[
            {
              key: "status",
              label: "Operación",
              options: [
                { value: "active", label: "Operativo" },
                { value: "attention", label: "Con seguimiento" },
                { value: "inactive", label: "Desactivado" },
              ],
            },
            { key: "type", label: "Tipo", options: DEVICE_TYPE_OPTIONS },
            { key: "campus", label: "Campus", options: campusOptions },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onClear={() => {
            setSearch("");
            setFilters({ status: "all", type: "all", campus: "all" });
          }}
        />
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setSelected}
        emptyMessage="Sin dispositivos registrados en backend."
      />
      </>
      ) : activeTab === "readings" ? (
        <ReadingsSection
          devices={devices}
          filters={readingFilters}
          onFiltersChange={setReadingFilters}
          readings={readings}
          readingStats={readingStats}
          dailyGroups={dailyReadingGroups}
          readingColumns={readingColumns}
          dailyColumns={dailyColumns}
          loading={readingsLoading}
          onRefresh={loadReadings}
        />
      ) : (
        <TrainingSection
          devices={devices}
          filters={trainingFilters}
          onFiltersChange={setTrainingFilters}
          rows={trainingRows}
          stats={trainingStats}
          columns={trainingColumns}
          loading={trainingLoading}
          onRefresh={loadTrainingRows}
        />
      )}

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected?.code || ""}
        badge={selected && <AdminStatusBadge variant={getOperationalBadge(selected).variant} label={getOperationalBadge(selected).label} />}
        width={600}
      >
        {selected && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <MetricCard icon={Building2} label="Campus" value={selected.campusCode || "--"} />
              <MetricCard icon={MapPin} label="Área" value={selected.areaCode || "--"} />
              <MetricCard icon={Battery} label="Pila" value={formatBattery(selected)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Tipo">{DEVICE_TYPE_OPTIONS.find((type) => type.value === selected.deviceType)?.label || selected.deviceType}</DrawerField>
              <DrawerField label="Protocolo" mono>{selected.protocol}</DrawerField>
              <DrawerField label="Modo de lectura">{STREAM_OPTIONS.find((mode) => mode.value === selected.streamMode)?.label || selected.streamMode}</DrawerField>
              <DrawerField label="Intervalo" mono>{selected.intervalSeconds}s</DrawerField>
              <DrawerField label="Métrica" mono>{selected.metric}</DrawerField>
              <DrawerField label="Unidad" mono>{selected.unit}</DrawerField>
              <DrawerField label="Endpoint" mono>{selected.endpointPath}</DrawerField>
              <DrawerField label="Firmware" mono>{selected.firmwareVersion || "--"}</DrawerField>
              <DrawerField label="Última conexión" mono>{formatDateTime(selected.lastSeenAt)}</DrawerField>
              <DrawerField label="Red WiFi">{selected.wifiProfile || "--"}</DrawerField>
              <DrawerField label="Voltaje nominal" mono>{selected.voltage || "--"} V</DrawerField>
              <DrawerField label="Factor de potencia" mono>{selected.powerFactor || "--"}</DrawerField>
              <DrawerField label="TLS requerido">{selected.tlsRequired ? "Sí" : "No"}</DrawerField>
              <DrawerField label="Certificado verificado">{selected.verifyServerCert ? "Sí" : "No"}</DrawerField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <StatusPanel title="Estado operativo" icon={ShieldCheck} variant={getOperationalBadge(selected).variant} label={getOperationalBadge(selected).label} helper={selected.enabled ? "Disponible para captura automatizada" : "Fuera del flujo de captura"} />
              <StatusPanel title="Estado técnico" icon={statusMeta(selected.status).icon} variant={statusMeta(selected.status).variant} label={statusMeta(selected.status).label} helper={selected.isStale ? "Sin actividad reciente suficiente" : "Actividad dentro del intervalo esperado"} />
              <StatusPanel title="Seguridad" icon={KeyRound} variant={selected.tlsRequired && selected.verifyServerCert ? "success" : "warning"} label={selected.tlsRequired && selected.verifyServerCert ? "TLS verificado" : "Revisar"} helper={selected.offlineBuffer ? "Buffer offline activo" : "Sin buffer offline"} />
              <StatusPanel title="Pila" icon={Battery} variant={getBatteryBadge(selected).variant} label={getBatteryBadge(selected).label} helper={formatBattery(selected)} />
            </div>

            <div>
              <div style={sectionTitleStyle}>
                <ScrollText size={13} /> Bitácora administrativa
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedEvents.length === 0 ? (
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin eventos administrativos recientes para este dispositivo.
                  </div>
                ) : (
                  selectedEvents.map((event) => (
                    <LogRow key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <AdminConfirmDialog
        open={!!confirm && confirm?.type === "reading"}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar lectura"
        message={`Vas a eliminar la lectura del ${formatDateTime(confirm?.reading?.recordedAt)}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
      />

      <AdminConfirmDialog
        open={!!confirm && confirm?.type !== "reading"}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title={confirm?.type === "reading" ? "Eliminar lectura" : "Eliminar dispositivo"}
        message={`Vas a eliminar "${confirm?.device?.name || ""}" (${confirm?.device?.code || ""}). Esta acción elimina su configuración, credencial y vínculo operativo.`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
      />
    </div>
  );
}

const secondaryButtonStyle = {
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text, #1E293B)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const sectionTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 10,
  fontFamily: fd,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--eco-text-soft)",
};

function ReadingsSection({
  devices,
  filters,
  onFiltersChange,
  readings,
  readingStats,
  dailyGroups,
  readingColumns,
  dailyColumns,
  loading,
  onRefresh,
}) {
  const deviceOptions = devices.map((device) => ({
    value: device.id,
    label: `${device.name || device.code} (${device.code})`,
  }));
  const selectedDeviceId = filters.deviceId || "";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Mini label="Lecturas cargadas" value={readingStats.total} icon={Database} color="#2563EB" />
        <Mini label="Días con lecturas" value={readingStats.days} icon={CalendarDays} color="#16A34A" />
        <Mini label="Delta acumulado" value={formatNumber(readingStats.totalDelta, " kWh")} icon={Activity} color="#7C3AED" />
        <Mini label="Con dato de pila" value={readingStats.withBattery} icon={Battery} color="#CA8A04" />
      </div>

      <div style={{ background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.3fr) repeat(2, minmax(150px, .7fr)) auto", gap: 10, alignItems: "end" }}>
          <FieldLite label="Dispositivo">
            <select
              value={selectedDeviceId}
              onChange={(event) => onFiltersChange((current) => ({ ...current, deviceId: event.target.value }))}
              style={{ ...inputLiteStyle, textAlign: "center", textAlignLast: "center" }}
            >
              <option value="">----------- Seleccionar dispositivo -----------</option>
              {deviceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FieldLite>
          <FieldLite label="Desde">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onFiltersChange((current) => ({ ...current, dateFrom: event.target.value }))}
              style={inputLiteStyle}
            />
          </FieldLite>
          <FieldLite label="Hasta">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onFiltersChange((current) => ({ ...current, dateTo: event.target.value }))}
              style={inputLiteStyle}
            />
          </FieldLite>
          <button type="button" onClick={onRefresh} style={secondaryButtonStyle}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12, padding: 28, textAlign: "center", fontFamily: fb, color: "var(--eco-text-soft)" }}>
          Cargando lecturas...
        </div>
      ) : (
        <>
          <div>
            <div style={sectionTitleStyle}>
              <CalendarDays size={13} /> Clasificación por fecha
            </div>
            <AdminDataTable columns={dailyColumns} data={dailyGroups} sortable emptyMessage="Sin lecturas para clasificar." />
          </div>

          <div>
            <div style={sectionTitleStyle}>
              <ScrollText size={13} /> Historial completo de lecturas
            </div>
            <AdminDataTable columns={readingColumns} data={readings} sortable emptyMessage="Sin lecturas registradas para el filtro seleccionado." />
          </div>
        </>
      )}
    </div>
  );
}

function TrainingSection({
  devices,
  filters,
  onFiltersChange,
  rows,
  stats,
  columns,
  loading,
  onRefresh,
}) {
  const deviceOptions = devices.map((device) => ({
    value: device.id,
    label: `${device.name || device.code} (${device.code})`,
  }));
  const selectedDeviceId = filters.deviceId || "";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Mini label="Lecturas evaluadas" value={stats.total} icon={Database} color="#2563EB" />
        <Mini label="Listas" value={stats.ready} icon={ShieldCheck} color="#16A34A" />
        <Mini label="En revisión" value={stats.review} icon={AlertTriangle} color="#CA8A04" />
        <Mini label="Excluidas" value={stats.excluded} icon={Trash2} color="#64748B" />
      </div>

      <div style={{ background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.3fr) repeat(2, minmax(150px, .7fr)) auto", gap: 10, alignItems: "end" }}>
          <FieldLite label="Dispositivo">
            <select
              value={selectedDeviceId}
              onChange={(event) => onFiltersChange((current) => ({ ...current, deviceId: event.target.value }))}
              style={{ ...inputLiteStyle, textAlign: "center", textAlignLast: "center" }}
            >
              <option value="">----------- Seleccionar dispositivo -----------</option>
              {deviceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FieldLite>
          <FieldLite label="Desde">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onFiltersChange((current) => ({ ...current, dateFrom: event.target.value }))}
              style={inputLiteStyle}
            />
          </FieldLite>
          <FieldLite label="Hasta">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onFiltersChange((current) => ({ ...current, dateTo: event.target.value }))}
              style={inputLiteStyle}
            />
          </FieldLite>
          <button type="button" onClick={onRefresh} style={secondaryButtonStyle}>
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12, padding: 28, textAlign: "center", fontFamily: fb, color: "var(--eco-text-soft)" }}>
          Cargando preparación de lecturas...
        </div>
      ) : (
        <div>
          <div style={sectionTitleStyle}>
            <Database size={13} /> Control de preparación para entrenamiento
          </div>
          <AdminDataTable columns={columns} data={rows} sortable emptyMessage="Selecciona un dispositivo para revisar sus lecturas antes del entrenamiento." />
        </div>
      )}
    </div>
  );
}

const inputLiteStyle = {
  width: "100%",
  height: 38,
  borderRadius: 8,
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text, #1E293B)",
  fontFamily: fb,
  fontSize: 13,
  padding: "0 10px",
};

function FieldLite({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text)" }}>{label}</span>
      {children}
    </label>
  );
}

function Notice({ type, message, onClose }) {
  const isError = type === "error";
  return (
    <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid ${isError ? "rgba(220,38,38,.25)" : "rgba(34,197,94,.25)"}`, background: isError ? "rgba(220,38,38,.07)" : "rgba(34,197,94,.07)", display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: fb, fontSize: 13, color: isError ? "#991B1B" : "#166534" }}>{message}</span>
      <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", fontWeight: 700 }}>
        Cerrar
      </button>
    </div>
  );
}

function HealthBar({ value }) {
  const color = value >= 90 ? "#16A34A" : value >= 70 ? "#CA8A04" : "#DC2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 5, background: "var(--eco-card-muted, #F1F5F9)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, transition: "width .3s" }} />
      </div>
      <span style={{ fontFamily: fm, fontSize: 11, fontWeight: 700, color, minWidth: 34, textAlign: "right" }}>
        {value}%
      </span>
    </div>
  );
}

function Mini({ label, value, icon: Icon, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function InlineChip({ icon: Icon, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "var(--eco-card-muted, #F8FAFC)", color: "var(--eco-text-soft, #64748B)", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap" }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--eco-border, #E2E8F0)", background: "var(--eco-card, #fff)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--eco-text-soft)" }}>
        <Icon size={13} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text)" }}>{value}</div>
    </div>
  );
}

function StatusPanel({ title, icon: Icon, variant, label, helper }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--eco-border, #E2E8F0)", background: "var(--eco-card, #fff)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--eco-text-soft)" }}>
        <Icon size={13} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{title}</span>
      </div>
      <AdminStatusBadge variant={variant} label={label} />
      <div style={{ fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 8 }}>{helper}</div>
    </div>
  );
}

function IconButton({ title, icon: Icon, onClick, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${danger ? "rgba(220,38,38,.25)" : "var(--eco-border, #E2E8F0)"}`,
        background: "var(--eco-card, #fff)",
        color: danger ? "#B91C1C" : "var(--eco-text, #1E293B)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function LogRow({ event }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 12px", background: "rgba(37,99,235,.06)", borderLeft: "3px solid #2563EB", borderRadius: 6 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text)" }}>
          <strong>{event.description || event.eventType}</strong>
        </div>
        <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 2 }}>
          {formatDateTime(event.ts)} · {event.user || "Sistema"}
        </div>
      </div>
      <span style={{ fontFamily: fm, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#2563EB", color: "#fff", textTransform: "uppercase", height: "fit-content" }}>
        {event.actionKey || "evento"}
      </span>
    </div>
  );
}
