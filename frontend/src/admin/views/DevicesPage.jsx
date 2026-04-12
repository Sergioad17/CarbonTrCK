import React from "react";
import {
  Activity, AlertTriangle, Building2, Clock, Cpu, Key, MapPin,
  ScrollText, ShieldCheck, Wifi, WifiOff, Plug, ServerCog,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminTabs from "../components/AdminTabs";
import {
  campuses,
  devices as mockDevices,
  deviceTypes,
  deviceLogs,
  deviceIntegrations as mockIntegrations,
  integrationLogs,
  orgEntities,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const TECH_STATUS = {
  online: { variant: "success", label: "En linea" },
  warning: { variant: "warning", label: "Advertencia" },
  offline: { variant: "error", label: "Sin conexion" },
};

const OPERATING_STATUS = {
  active: { variant: "success", label: "Operativo" },
  attention: { variant: "warning", label: "Con seguimiento" },
  inactive: { variant: "neutral", label: "Desactivado" },
};

const HEALTH_STATUS = {
  healthy: { variant: "success", label: "Estable" },
  degraded: { variant: "warning", label: "Degradado" },
  critical: { variant: "error", label: "Critico" },
};

const AREAS = orgEntities.filter(entity => entity.status === "active");

function normalizeDevice(device) {
  return {
    ...device,
    campusId: device.campusId || "campus-central",
    areaId: device.areaId || "",
    isActive: typeof device.isActive === "boolean" ? device.isActive : true,
  };
}

function getArea(areaId) {
  return AREAS.find(area => area.id === areaId) || null;
}

function getCampus(campusId) {
  return campuses.find(campus => campus.id === campusId) || null;
}

function getHealthState(value) {
  if (value >= 90) return HEALTH_STATUS.healthy;
  if (value >= 70) return HEALTH_STATUS.degraded;
  return HEALTH_STATUS.critical;
}

function getOperationalKey(device) {
  if (!device.isActive) return "inactive";
  if (device.status === "warning" || device.health < 70) return "attention";
  return "active";
}

function getDeviceActivity(device) {
  const logs = deviceLogs
    .filter(log => log.deviceId === device.id)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));
  if (logs[0]) return logs[0];
  return {
    id: `${device.id}-last-reading`,
    level: device.status === "offline" ? "error" : "info",
    ts: device.lastReading,
    message: device.status === "offline"
      ? "Sin lectura reciente reportada."
      : `Ultima lectura registrada: ${device.lastValue}.`,
  };
}

export default function DevicesPage() {
  const [devices] = React.useState(mockDevices.map(normalizeDevice));
  const [integrations] = React.useState(mockIntegrations);
  const [tab, setTab] = React.useState("devices");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ status: "all", type: "all", campus: "all" });
  const [selected, setSelected] = React.useState(null);
  const [selectedIntegration, setSelectedIntegration] = React.useState(null);

  const filtered = React.useMemo(() => devices.filter(device => {
    if (filters.status !== "all" && getOperationalKey(device) !== filters.status) return false;
    if (filters.type !== "all" && device.type !== filters.type) return false;
    if (filters.campus !== "all" && device.campusId !== filters.campus) return false;
    if (search) {
      const query = search.toLowerCase();
      const area = getArea(device.areaId);
      const campus = getCampus(device.campusId);
      const haystack = [
        device.name,
        device.serial,
        device.assignedTo,
        area?.name,
        campus?.name,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }), [devices, search, filters]);

  const stats = React.useMemo(() => ({
    total: devices.length,
    active: devices.filter(device => device.isActive).length,
    attention: devices.filter(device => getOperationalKey(device) === "attention").length,
    offline: devices.filter(device => device.status === "offline").length,
    assigned: devices.filter(device => !!device.assignedTo).length,
    stale: devices.filter(device => (Date.now() - new Date(device.lastReading).getTime()) > 24 * 60 * 60 * 1000).length,
  }), [devices]);

  const integrationStats = React.useMemo(() => ({
    total: integrations.length,
    online: integrations.filter(integration => integration.status === "online").length,
    warning: integrations.filter(integration => integration.status === "warning").length,
    records: integrations.reduce((sum, integration) => sum + integration.recordsPulled, 0),
    linked: integrations.filter(integration => integration.deviceId).length,
  }), [integrations]);

  const columns = [
    {
      key: "name",
      label: "Dispositivo",
      width: 260,
      render: (value, row) => {
        const type = deviceTypes.find(item => item.id === row.type);
        const campus = getCampus(row.campusId);
        const area = getArea(row.areaId);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${type?.color || "#64748B"}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: type?.color || "#64748B",
              flexShrink: 0,
            }}>
              <Cpu size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--eco-text-soft)", fontFamily: fm }}>{row.serial || "--"}</div>
              <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <InlineChip icon={Building2} label={campus?.name || "Sin campus"} />
                <InlineChip icon={MapPin} label={area?.name || "Sin area"} />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "assignedTo",
      label: "Asignacion",
      width: 180,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value || "Sin responsable"}</div>
          <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
            {deviceTypes.find(type => type.id === row.type)?.label || row.type}
          </div>
        </div>
      ),
    },
    {
      key: "operational",
      label: "Operacion",
      width: 170,
      render: (_, row) => {
        const key = getOperationalKey(row);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AdminStatusBadge variant={OPERATING_STATUS[key].variant} label={OPERATING_STATUS[key].label} />
            <span style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
              {row.isActive ? "Asignado al flujo operativo" : "Fuera de operacion por decision administrativa"}
            </span>
          </div>
        );
      },
    },
    {
      key: "technical",
      label: "Tecnico",
      width: 190,
      render: (_, row) => {
        const health = getHealthState(row.health);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <AdminStatusBadge variant={TECH_STATUS[row.status]?.variant} label={TECH_STATUS[row.status]?.label} />
              <AdminStatusBadge variant={health.variant} label={health.label} />
            </div>
            <HealthBar value={row.health} />
          </div>
        );
      },
    },
    {
      key: "lastReading",
      label: "Actividad reciente",
      width: 180,
      render: (_, row) => {
        const activity = getDeviceActivity(row);
        return (
          <div>
            <div style={{ fontSize: 11.5, color: "var(--eco-text)" }}>{activity.message}</div>
            <div style={{ fontSize: 10.5, color: "var(--eco-text-soft)", fontFamily: fm, marginTop: 4 }}>
              {new Date(activity.ts).toLocaleString()}
            </div>
          </div>
        );
      },
    },
  ];

  const integrationColumns = [
    {
      key: "name",
      label: "Integracion",
      width: 240,
      render: (value, row) => {
        const linkedDevice = devices.find(device => device.id === row.deviceId);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(124,58,237,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7C3AED",
              flexShrink: 0,
            }}>
              <Plug size={15} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
                {row.provider} · {linkedDevice?.name || "Sin dispositivo vinculado"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "endpoint",
      label: "Endpoint",
      width: 230,
      render: value => (
        <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft)" }}>{value}</span>
      ),
    },
    {
      key: "authType",
      label: "Auth",
      width: 110,
      render: value => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5 }}>
          <Key size={11} /> {value}
        </span>
      ),
    },
    {
      key: "syncFrequency",
      label: "Frecuencia",
      width: 120,
      render: value => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
          <Clock size={11} /> {value}
        </span>
      ),
    },
    {
      key: "lastSync",
      label: "Ultima sync",
      width: 150,
      render: value => <span style={{ fontFamily: fm, fontSize: 11 }}>{new Date(value).toLocaleString()}</span>,
    },
    {
      key: "recordsPulled",
      label: "Procesados",
      width: 110,
      align: "right",
      render: value => <span style={{ fontFamily: fm }}>{value}</span>,
    },
    {
      key: "status",
      label: "Estado",
      width: 130,
      render: value => <AdminStatusBadge variant={TECH_STATUS[value]?.variant} label={TECH_STATUS[value]?.label} />,
    },
  ];

  const selectedDeviceActivity = selected ? getDeviceActivity(selected) : null;
  const selectedIntegrationLogs = selectedIntegration
    ? integrationLogs.filter(log => log.integrationId === selectedIntegration.id)
    : [];

  return (
    <div>
      <AdminPageHeader
        icon={Cpu}
        title="Dispositivos e integraciones"
        subtitle="Rastreo administrativo de medidores, sensores e integraciones. El alta y la vinculacion operativa se gestionan desde Dashboard > Dispositivos."
        breadcrumb={["Operacion", "Dispositivos"]}
      />

      {tab === "devices" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <Mini label="Inventario total" value={stats.total} icon={Cpu} color="#64748B" />
          <Mini label="Operativos" value={stats.active} icon={ShieldCheck} color="#16A34A" />
          <Mini label="Con seguimiento" value={stats.attention} icon={AlertTriangle} color="#CA8A04" />
          <Mini label="Sin conexion" value={stats.offline} icon={WifiOff} color="#DC2626" />
          <Mini label="Asignados" value={stats.assigned} icon={Building2} color="#2563EB" />
          <Mini label="Sin actividad 24 h" value={stats.stale} icon={Clock} color="#7C3AED" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <Mini label="Integraciones" value={integrationStats.total} icon={Plug} color="#7C3AED" />
          <Mini label="Estables" value={integrationStats.online} icon={Wifi} color="#16A34A" />
          <Mini label="Con alertas" value={integrationStats.warning} icon={AlertTriangle} color="#CA8A04" />
          <Mini label="Registros procesados" value={integrationStats.records} icon={ServerCog} color="#2563EB" />
          <Mini label="Vinculadas a dispositivo" value={integrationStats.linked} icon={Cpu} color="#059669" />
        </div>
      )}

      <AdminTabs
        tabs={[
          { id: "devices", label: "Dispositivos", count: devices.length },
          { id: "integrations", label: "Integraciones", count: integrations.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "devices" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <AdminFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre, serial, responsable o ubicacion..."
              filters={[
                {
                  key: "status",
                  label: "Operacion",
                  options: [
                    { value: "active", label: "Operativo" },
                    { value: "attention", label: "Con seguimiento" },
                    { value: "inactive", label: "Desactivado" },
                  ],
                },
                { key: "type", label: "Tipo", options: deviceTypes.map(type => ({ value: type.id, label: type.label })) },
                { key: "campus", label: "Campus", options: campuses.map(campus => ({ value: campus.id, label: campus.name })) },
              ]}
              filterValues={filters}
              onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
              onClear={() => { setSearch(""); setFilters({ status: "all", type: "all", campus: "all" }); }}
            />
          </div>

          <AdminDataTable
            columns={columns}
            data={filtered}
            sortable
            onRowClick={setSelected}
            emptyMessage="Sin dispositivos."
          />
        </>
      )}

      {tab === "integrations" && (
        <>
          <AdminDataTable
            columns={integrationColumns}
            data={integrations}
            sortable
            onRowClick={setSelectedIntegration}
            emptyMessage="Sin integraciones configuradas."
          />

          <div style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, .8fr)",
            gap: 16,
          }}>
            <div style={{
              background: "var(--eco-card, #fff)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{
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
              }}>
                <ScrollText size={13} /> Bitacora de sincronizaciones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {integrationLogs.map(log => {
                  const integration = integrations.find(item => item.id === log.integrationId);
                  return <LogRow key={log.id} color={getLogColor(log.level)} title={integration?.name || "Integracion"} message={log.message} ts={log.ts} level={log.level} />;
                })}
              </div>
            </div>

            <div style={{
              background: "var(--eco-card, #fff)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{
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
              }}>
                <Activity size={13} /> Resumen operativo
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {integrations.map(integration => {
                  const linkedDevice = devices.find(device => device.id === integration.deviceId);
                  return (
                    <div key={integration.id} style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--eco-border, #E2E8F0)",
                      background: selectedIntegration?.id === integration.id ? "var(--eco-card-muted, #F8FAFC)" : "transparent",
                      cursor: "pointer",
                    }} onClick={() => setSelectedIntegration(integration)}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>{integration.name}</div>
                        <AdminStatusBadge variant={TECH_STATUS[integration.status]?.variant} label={TECH_STATUS[integration.status]?.label} />
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 4 }}>
                        {integration.provider} · {integration.syncFrequency} · {linkedDevice?.name || "Sin dispositivo vinculado"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected?.serial || ""}
        badge={selected && <AdminStatusBadge variant={OPERATING_STATUS[getOperationalKey(selected)].variant} label={OPERATING_STATUS[getOperationalKey(selected)].label} />}
        width={560}
      >
        {selected && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 6,
            }}>
              <MetricCard icon={Building2} label="Campus" value={getCampus(selected.campusId)?.name || "--"} />
              <MetricCard icon={MapPin} label="Area" value={getArea(selected.areaId)?.name || "--"} />
              <MetricCard icon={ShieldCheck} label="Responsable" value={selected.assignedTo || "Sin asignar"} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Tipo">{deviceTypes.find(type => type.id === selected.type)?.label}</DrawerField>
              <DrawerField label="Protocolo" mono>{selected.protocol}</DrawerField>
              <DrawerField label="IP / Host" mono>{selected.ip || "--"}</DrawerField>
              <DrawerField label="Firmware" mono>{selected.firmware || "--"}</DrawerField>
              <DrawerField label="Frecuencia">{selected.frequency}</DrawerField>
              <DrawerField label="Instalado" mono>{selected.installedAt}</DrawerField>
              <DrawerField label="Ultima lectura" mono>{selected.lastValue}</DrawerField>
              <DrawerField label="Ultima conexion" mono>{new Date(selected.lastReading).toLocaleString()}</DrawerField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <StatusPanel title="Estado operativo" icon={ShieldCheck} variant={OPERATING_STATUS[getOperationalKey(selected)].variant} label={OPERATING_STATUS[getOperationalKey(selected)].label} helper={selected.isActive ? "Disponible para captura automatizada" : "Retirado del flujo administrativo"} />
              <StatusPanel title="Estado tecnico" icon={selected.status === "offline" ? WifiOff : Wifi} variant={TECH_STATUS[selected.status]?.variant} label={TECH_STATUS[selected.status]?.label} helper={selected.status === "offline" ? "Requiere revision de enlace" : "Comunicacion disponible"} />
              <StatusPanel title="Salud" icon={Activity} variant={getHealthState(selected.health).variant} label={getHealthState(selected.health).label} helper={`${selected.health}% de estabilidad`} />
            </div>

            <div>
              <div style={{
                fontFamily: fd,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".05em",
                color: "var(--eco-text-soft)",
                marginBottom: 8,
              }}>
                Salud del dispositivo
              </div>
              <HealthBar value={selected.health} large />
            </div>

            <div style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px solid var(--eco-border, #E2E8F0)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
                fontFamily: fd,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".05em",
                color: "var(--eco-text-soft)",
              }}>
                <Clock size={13} /> Actividad reciente
              </div>
              <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)" }}>{selectedDeviceActivity?.message}</div>
              <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 4 }}>
                {selectedDeviceActivity ? new Date(selectedDeviceActivity.ts).toLocaleString() : "--"}
              </div>
            </div>

            <div>
              <div style={{
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
              }}>
                <ScrollText size={13} /> Bitacora reciente
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {deviceLogs.filter(log => log.deviceId === selected.id).length === 0 ? (
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin eventos registrados.
                  </div>
                ) : deviceLogs
                  .filter(log => log.deviceId === selected.id)
                  .map(log => (
                    <LogRow key={log.id} color={getLogColor(log.level)} title={selected.name} message={log.message} ts={log.ts} level={log.level} />
                  ))}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <AdminEntityDrawer
        open={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        title={selectedIntegration?.name || ""}
        subtitle={selectedIntegration?.provider || ""}
        badge={selectedIntegration && <AdminStatusBadge variant={TECH_STATUS[selectedIntegration.status]?.variant} label={TECH_STATUS[selectedIntegration.status]?.label} />}
        width={520}
      >
        {selectedIntegration && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Endpoint" mono>{selectedIntegration.endpoint}</DrawerField>
              <DrawerField label="Autenticacion">{selectedIntegration.authType}</DrawerField>
              <DrawerField label="Frecuencia de sync">{selectedIntegration.syncFrequency}</DrawerField>
              <DrawerField label="Ultima sync" mono>{new Date(selectedIntegration.lastSync).toLocaleString()}</DrawerField>
              <DrawerField label="Registros procesados" mono>{selectedIntegration.recordsPulled}</DrawerField>
              <DrawerField label="Dispositivo relacionado">
                {devices.find(device => device.id === selectedIntegration.deviceId)?.name || "Sin vinculo directo"}
              </DrawerField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <StatusPanel title="Estado" icon={Plug} variant={TECH_STATUS[selectedIntegration.status]?.variant} label={TECH_STATUS[selectedIntegration.status]?.label} helper="Disponibilidad actual de la integracion" />
              <StatusPanel title="Frecuencia" icon={Clock} variant="info" label={selectedIntegration.syncFrequency} helper="Cadencia configurada en frontend" />
              <StatusPanel title="Procesamiento" icon={ServerCog} variant="success" label={`${selectedIntegration.recordsPulled} registros`} helper="Total acumulado mostrado en panel" />
            </div>

            <div>
              <div style={{
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
              }}>
                <ScrollText size={13} /> Historial de sincronizacion
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedIntegrationLogs.length === 0 ? (
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin eventos registrados para esta integracion.
                  </div>
                ) : selectedIntegrationLogs.map(log => (
                  <LogRow key={log.id} color={getLogColor(log.level)} title={selectedIntegration.name} message={log.message} ts={log.ts} level={log.level} />
                ))}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

    </div>
  );
}

function HealthBar({ value, large }) {
  const color = value >= 90 ? "#16A34A" : value >= 70 ? "#CA8A04" : "#DC2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1,
        height: large ? 10 : 6,
        borderRadius: 5,
        background: "var(--eco-card-muted, #F1F5F9)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          transition: "width .3s",
        }} />
      </div>
      <span style={{ fontFamily: fm, fontSize: large ? 13 : 11, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
        {value}%
      </span>
    </div>
  );
}

function Mini({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: `${color}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
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
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 999,
      background: "var(--eco-card-muted, #F8FAFC)",
      color: "var(--eco-text-soft, #64748B)",
      fontSize: 10.5,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid var(--eco-border, #E2E8F0)",
      background: "var(--eco-card, #fff)",
    }}>
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
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid var(--eco-border, #E2E8F0)",
      background: "var(--eco-card, #fff)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--eco-text-soft)" }}>
        <Icon size={13} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{title}</span>
      </div>
      <AdminStatusBadge variant={variant} label={label} />
      <div style={{ fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 8 }}>{helper}</div>
    </div>
  );
}

function LogRow({ color, title, message, ts, level }) {
  return (
    <div style={{
      display: "flex",
      gap: 10,
      padding: "8px 12px",
      background: `${color}10`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text)" }}>
          <strong>{title}</strong> - {message}
        </div>
        <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 2 }}>
          {new Date(ts).toLocaleString()}
        </div>
      </div>
      <span style={{
        fontFamily: fm,
        fontSize: 9.5,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 4,
        background: color,
        color: "#fff",
        textTransform: "uppercase",
        height: "fit-content",
      }}>
        {level}
      </span>
    </div>
  );
}

function getLogColor(level) {
  if (level === "error") return "#DC2626";
  if (level === "warning") return "#CA8A04";
  return "#2563EB";
}
