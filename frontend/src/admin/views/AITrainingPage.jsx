import React from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardList,
  Database,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import AdminFormModal from "../components/AdminFormModal";
import { fetchAdminAuditEvents } from "../../api/admin";
import { fetchDevices } from "../../api/devices";
import {
  activateAITrainingRun,
  cancelAITrainingRun,
  createAITrainingRun,
  deactivateAITrainingRun,
  deleteAITrainingRun,
  fetchAITrainingRuns,
  fetchAITrainingSummary,
  retryAITrainingRun,
  startAITrainingRun,
} from "../../api/aiTraining";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS_META = {
  pending: { variant: "neutral", label: "Pendiente" },
  running: { variant: "warning", label: "En ejecución" },
  completed: { variant: "success", label: "Completado" },
  failed: { variant: "error", label: "Fallido" },
  cancelled: { variant: "neutral", label: "Cancelado" },
};

const MODEL_TYPE_OPTIONS = [
  { value: "consumption_prediction", label: "Predicción de consumo" },
  { value: "anomaly_detection", label: "Detección de anomalías" },
  { value: "pattern_classification", label: "Clasificación de patrones" },
];

const EMPTY_NOTICE = { type: "", message: "" };

const EMPTY_FORM = {
  name: "",
  description: "",
  modelType: "consumption_prediction",
  dateFrom: "",
  dateTo: "",
  trainRatio: "70",
  validationRatio: "20",
  maxReadings: "",
  deviceIds: [],
  useReadyOnly: true,
};

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.pending;
}

function modelTypeLabel(value) {
  return MODEL_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatDateTime(value) {
  if (!value) return "—";
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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function errorMessage(error) {
  const code = error?.payload?.code || error?.code;
  const message = String(error?.payload?.message || error?.message || "").trim();
  if (code === "backend_not_configured") return "El backend no está configurado para esta sesión.";
  if (code === "NO_READY_READINGS") return message || "No hay lecturas listas e incluidas para entrenar.";
  if (code === "INVALID_DEVICES") return "Algunos dispositivos no son válidos para esta organización.";
  if (code === "READY_ONLY_REQUIRED") return "El entrenamiento solo puede usar lecturas listas e incluidas desde Preparación IA.";
  if (code === "INVALID_TRANSITION") return message || "El entrenamiento no permite esta acción en su estado actual.";
  if (code === "RUN_NOT_COMPLETED") return "Solo se puede activar el modelo de un entrenamiento completado.";
  if (code === "MODEL_VERSION_MISSING") return "El entrenamiento aún no tiene una versión de modelo registrada.";
  if (code === "MODEL_NOT_ACTIVE") return "El modelo no se encuentra activo.";
  if (code === "MODEL_ACTIVE") return "Desactiva el modelo activo antes de eliminar el entrenamiento.";
  if (code === "RUN_IS_RUNNING") return "Cancela el entrenamiento antes de eliminarlo.";
  if (code === "FORBIDDEN") return "No tienes permiso para esta acción.";
  if (message && message !== "request_failed") return message;
  return "No se pudo completar la operación. Revisa la conexión con el backend.";
}

export default function AITrainingPage() {
  const [loading, setLoading] = React.useState(true);
  const [runs, setRuns] = React.useState([]);
  const [summary, setSummary] = React.useState(null);
  const [devices, setDevices] = React.useState([]);
  const [auditEvents, setAuditEvents] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState("runs");
  const [notice, setNotice] = React.useState(EMPTY_NOTICE);
  const [selected, setSelected] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [acting, setActing] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [creating, setCreating] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const loadData = React.useCallback(async () => {
    setNotice(EMPTY_NOTICE);
    try {
      const [runItems, summaryData, deviceList, events] = await Promise.all([
        fetchAITrainingRuns(),
        fetchAITrainingSummary(),
        fetchDevices(),
        fetchAdminAuditEvents({ module: "ai_training_run" }).catch(() => []),
      ]);
      setRuns(runItems);
      setSummary(summaryData);
      setDevices(Array.isArray(deviceList) ? deviceList : []);
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
    const fresh = runs.find((run) => run.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [runs, selected]);

  const summaryCards = React.useMemo(() => {
    const totals = summary?.totals || { total: 0, running: 0, pending: 0, completed: 0, failed: 0, cancelled: 0 };
    const lastCompleted = summary?.lastCompletedRun || null;
    const activeModel = summary?.activeModel || null;
    const readingsAvailable = Number(summary?.readingsAvailable || 0);
    const lastMetric = lastCompleted?.metrics ? Object.entries(lastCompleted.metrics)[0] : null;
    const lastMetricLabel = lastMetric ? `${lastMetric[0]}: ${lastMetric[1]}` : "Sin métrica registrada";

    return [
      { id: "total", label: "Entrenamientos totales", value: totals.total, icon: ClipboardList, color: "#2563EB" },
      { id: "running", label: "En ejecución", value: totals.running, icon: Activity, color: "#CA8A04" },
      { id: "completed", label: "Completados", value: totals.completed, icon: CheckCircle2, color: "#16A34A" },
      {
        id: "lastFinished",
        label: "Último completado",
        value: lastCompleted ? formatDateTime(lastCompleted.finishedAt) : "—",
        icon: Brain,
        color: "#7C3AED",
        helper: lastCompleted ? lastCompleted.name : "Sin entrenamientos completados",
      },
      { id: "readings", label: "Lecturas listas para IA", value: readingsAvailable, icon: Database, color: "#0EA5E9" },
      {
        id: "active",
        label: "Modelo activo",
        value: activeModel ? activeModel.version : "—",
        icon: Sparkles,
        color: "#16A34A",
        helper: activeModel ? `${modelTypeLabel(activeModel.modelType)} · ${lastMetricLabel}` : "Sin modelo activado",
      },
    ];
  }, [summary]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    resetForm();
  }

  function validateForm(values) {
    if (!values.name.trim()) return "El nombre del entrenamiento es obligatorio.";
    if (!values.deviceIds.length) return "Selecciona al menos un dispositivo.";
    if (values.dateFrom && values.dateTo && values.dateFrom > values.dateTo) {
      return "La fecha desde no puede ser posterior a la fecha hasta.";
    }
    const train = Number(values.trainRatio);
    const validation = Number(values.validationRatio);
    if (!Number.isFinite(train) || train < 0 || train > 100) return "trainRatio debe estar entre 0 y 100.";
    if (!Number.isFinite(validation) || validation < 0 || validation > 100) return "validationRatio debe estar entre 0 y 100.";
    if (train + validation > 100) return "trainRatio + validationRatio no puede exceder 100.";
    if (values.maxReadings) {
      const max = Number(values.maxReadings);
      if (!Number.isFinite(max) || max <= 0) return "maxReadings debe ser un entero positivo.";
    }
    if (!values.useReadyOnly) return "Debes confirmar el uso exclusivo de lecturas listas e incluidas.";
    return "";
  }

  async function submitCreate() {
    const validation = validateForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }

    setCreating(true);
    setFormError("");
    try {
      await createAITrainingRun({
        name: form.name.trim(),
        description: form.description.trim(),
        modelType: form.modelType,
        dateFrom: form.dateFrom || null,
        dateTo: form.dateTo || null,
        trainRatio: Number(form.trainRatio),
        validationRatio: Number(form.validationRatio),
        maxReadings: form.maxReadings ? Number(form.maxReadings) : null,
        deviceIds: form.deviceIds,
        useReadyOnly: true,
      });
      closeCreate();
      setNotice({ type: "success", message: "Entrenamiento creado correctamente." });
      await loadData();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function performAction(action, run, label) {
    setActing(true);
    try {
      await action(run.id);
      setNotice({ type: "success", message: label });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setActing(false);
    }
  }

  function openConfirm(type, run) {
    setConfirm({ type, run });
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { type, run } = confirm;
    setActing(true);
    try {
      if (type === "cancel") {
        await cancelAITrainingRun(run.id);
        setNotice({ type: "success", message: "Entrenamiento cancelado." });
      } else if (type === "delete") {
        await deleteAITrainingRun(run.id);
        setNotice({ type: "success", message: "Entrenamiento eliminado." });
        if (selected?.id === run.id) setSelected(null);
      } else if (type === "deactivate") {
        await deactivateAITrainingRun(run.id);
        setNotice({ type: "success", message: "Modelo desactivado." });
      }
      setConfirm(null);
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setActing(false);
    }
  }

  const runColumns = [
    {
      key: "name",
      label: "Nombre",
      width: 230,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>{modelTypeLabel(row.modelType)}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Estado",
      width: 130,
      render: (value) => <AdminStatusBadge variant={statusMeta(value).variant} label={statusMeta(value).label} />,
    },
    {
      key: "devicesCount",
      label: "Dispositivos",
      width: 100,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{value}</span>,
    },
    {
      key: "readingsCount",
      label: "Lecturas",
      width: 110,
      align: "right",
      render: (value) => <span style={{ fontFamily: fm }}>{value}</span>,
    },
    {
      key: "dateFrom",
      label: "Rango",
      width: 200,
      render: (_, row) => (
        <div style={{ fontFamily: fm, fontSize: 11.5 }}>
          {row.dateFrom || "—"} → {row.dateTo || "—"}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Creado",
      width: 160,
      render: (value) => <span style={{ fontSize: 11.5 }}>{formatDateTime(value)}</span>,
    },
    {
      key: "finishedAt",
      label: "Finalizado",
      width: 160,
      render: (value) => <span style={{ fontSize: 11.5 }}>{value ? formatDateTime(value) : "—"}</span>,
    },
    {
      key: "modelVersion",
      label: "Modelo",
      width: 140,
      render: (value) => {
        if (!value) return <span style={{ color: "var(--eco-text-soft)" }}>Sin modelo</span>;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: fm, fontSize: 11.5 }}>{value.version}</span>
            <AdminStatusBadge variant={value.status === "active" ? "success" : "neutral"} label={value.status === "active" ? "Activo" : "Inactivo"} />
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Acciones",
      width: 230,
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(event) => event.stopPropagation()}>
          {row.status === "pending" && (
            <SmallButton onClick={() => performAction(startAITrainingRun, row, "Entrenamiento iniciado.")}>Iniciar</SmallButton>
          )}
          {(row.status === "pending" || row.status === "running") && (
            <SmallButton onClick={() => openConfirm("cancel", row)} danger>Cancelar</SmallButton>
          )}
          {(row.status === "failed" || row.status === "cancelled") && (
            <SmallButton onClick={() => performAction(retryAITrainingRun, row, "Entrenamiento reencolado.")}>Reintentar</SmallButton>
          )}
          {row.status === "completed" && row.modelVersion && row.modelVersion.status !== "active" && (
            <SmallButton onClick={() => performAction(activateAITrainingRun, row, "Modelo activado.")}>Activar modelo</SmallButton>
          )}
          {row.modelVersion?.status === "active" && (
            <SmallButton onClick={() => openConfirm("deactivate", row)}>Desactivar</SmallButton>
          )}
          {row.status !== "running" && row.modelVersion?.status !== "active" && (
            <SmallButton onClick={() => openConfirm("delete", row)} danger title="Eliminar entrenamiento">
              <Trash2 size={12} />
            </SmallButton>
          )}
        </div>
      ),
    },
  ];

  const modelRows = React.useMemo(
    () => runs.filter((run) => run.modelVersion).map((run) => ({
      id: run.modelVersion.id,
      runId: run.id,
      runName: run.name,
      modelType: run.modelVersion.modelType || run.modelType,
      version: run.modelVersion.version,
      status: run.modelVersion.status,
      activatedAt: run.modelVersion.activatedAt,
      metricsCount: run.modelVersion.metrics ? Object.keys(run.modelVersion.metrics).length : 0,
    })),
    [runs],
  );

  const modelColumns = [
    { key: "runName", label: "Entrenamiento", width: 220, render: (value) => <span style={{ fontWeight: 700 }}>{value}</span> },
    { key: "modelType", label: "Tipo", width: 200, render: (value) => modelTypeLabel(value) },
    { key: "version", label: "Versión", width: 120, render: (value) => <span style={{ fontFamily: fm }}>{value}</span> },
    {
      key: "status",
      label: "Estado",
      width: 120,
      render: (value) => <AdminStatusBadge variant={value === "active" ? "success" : "neutral"} label={value === "active" ? "Activo" : "Inactivo"} />,
    },
    { key: "activatedAt", label: "Activado", width: 170, render: (value) => formatDateTime(value) },
  ];

  const trainingAuditEvents = React.useMemo(() => {
    return auditEvents
      .filter((event) => String(event.eventType || "").startsWith("ai_training."))
      .slice(0, 50);
  }, [auditEvents]);

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={Brain}
        title="Entrenamiento IA"
        subtitle="Administración de entrenamientos de modelos con lecturas preparadas de dispositivos."
        breadcrumb={["Control IA", "Entrenamiento IA"]}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={loadData} style={secondaryButtonStyle}>
              <RefreshCw size={13} /> Actualizar
            </button>
            <button type="button" onClick={openCreate} style={primaryButtonStyle}>
              <Plus size={13} /> Nuevo entrenamiento
            </button>
          </div>
        }
      />

      {notice.message ? <Notice type={notice.type} message={notice.message} onClose={() => setNotice(EMPTY_NOTICE)} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        {summaryCards.map((card) => (
          <Mini key={card.id} label={card.label} value={card.value} icon={card.icon} color={card.color} helper={card.helper} />
        ))}
      </div>

      <AdminTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "runs", label: "Entrenamientos", count: runs.length },
          { id: "models", label: "Modelos", count: modelRows.length },
          { id: "audit", label: "Auditoría", count: trainingAuditEvents.length },
        ]}
      />

      {activeTab === "runs" && (
        <AdminDataTable
          columns={runColumns}
          data={runs}
          sortable
          onRowClick={setSelected}
          emptyMessage="Sin entrenamientos registrados. Crea uno nuevo a partir de las lecturas listas en Preparación IA."
        />
      )}

      {activeTab === "models" && (
        <AdminDataTable
          columns={modelColumns}
          data={modelRows}
          sortable
          emptyMessage="Aún no hay modelos generados. Activa uno desde un entrenamiento completado."
        />
      )}

      {activeTab === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {trainingAuditEvents.length === 0 ? (
            <div style={{ background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12, padding: 28, textAlign: "center", fontFamily: fb, color: "var(--eco-text-soft)" }}>
              Sin eventos de auditoría registrados.
            </div>
          ) : (
            trainingAuditEvents.map((event) => <AuditRow key={event.id || `${event.eventType}-${event.ts}`} event={event} />)
          )}
        </div>
      )}

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected ? modelTypeLabel(selected.modelType) : ""}
        badge={selected && <AdminStatusBadge variant={statusMeta(selected.status).variant} label={statusMeta(selected.status).label} />}
        width={560}
      >
        {selected && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Estado">{statusMeta(selected.status).label}</DrawerField>
              <DrawerField label="Tipo de modelo">{modelTypeLabel(selected.modelType)}</DrawerField>
              <DrawerField label="Dispositivos" mono>{selected.devicesCount}</DrawerField>
              <DrawerField label="Lecturas usadas" mono>{selected.readingsCount}</DrawerField>
              <DrawerField label="Desde" mono>{formatDate(selected.dateFrom)}</DrawerField>
              <DrawerField label="Hasta" mono>{formatDate(selected.dateTo)}</DrawerField>
              <DrawerField label="trainRatio" mono>{selected.trainRatio}%</DrawerField>
              <DrawerField label="validationRatio" mono>{selected.validationRatio}%</DrawerField>
              <DrawerField label="Máximo lecturas" mono>{selected.maxReadings ?? "Sin tope"}</DrawerField>
              <DrawerField label="Inicio" mono>{formatDateTime(selected.startedAt)}</DrawerField>
              <DrawerField label="Fin" mono>{formatDateTime(selected.finishedAt)}</DrawerField>
              <DrawerField label="Creado" mono>{formatDateTime(selected.createdAt)}</DrawerField>
            </div>

            {selected.description && (
              <div>
                <SectionTitle icon={ClipboardList} label="Descripción" />
                <p style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)", margin: 0 }}>{selected.description}</p>
              </div>
            )}

            <div>
              <SectionTitle icon={Database} label="Dispositivos incluidos" />
              {selected.devices.length === 0 ? (
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>Sin dispositivos asociados.</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selected.devices.map((device) => (
                    <span key={device.deviceId} style={chipStyle}>
                      {device.deviceCode}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionTitle icon={Sparkles} label="Modelo generado" />
              {selected.modelVersion ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <DrawerField label="Versión" mono>{selected.modelVersion.version}</DrawerField>
                  <DrawerField label="Estado">
                    <AdminStatusBadge
                      variant={selected.modelVersion.status === "active" ? "success" : "neutral"}
                      label={selected.modelVersion.status === "active" ? "Activo" : "Inactivo"}
                    />
                  </DrawerField>
                  <DrawerField label="Activado" mono>{formatDateTime(selected.modelVersion.activatedAt)}</DrawerField>
                  <DrawerField label="Artifact" mono>{selected.modelVersion.artifactPath || "Sin artifact"}</DrawerField>
                </div>
              ) : (
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                  Aún no hay versión de modelo registrada para este entrenamiento.
                </span>
              )}
            </div>

            {Object.keys(selected.metrics || {}).length > 0 && (
              <div>
                <SectionTitle icon={Activity} label="Métricas" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {Object.entries(selected.metrics).map(([key, value]) => (
                    <DrawerField key={key} label={key} mono>{String(value)}</DrawerField>
                  ))}
                </div>
              </div>
            )}

            {selected.errorMessage && (
              <div style={{ background: "rgba(220,38,38,.07)", border: "1px solid rgba(220,38,38,.25)", padding: "10px 12px", borderRadius: 8 }}>
                <SectionTitle icon={XCircle} label="Error" />
                <p style={{ fontFamily: fb, fontSize: 12.5, color: "#991B1B", margin: 0 }}>{selected.errorMessage}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.status === "pending" && (
                <ActionButton icon={Power} label="Iniciar" onClick={() => performAction(startAITrainingRun, selected, "Entrenamiento iniciado.")} disabled={acting} />
              )}
              {(selected.status === "pending" || selected.status === "running") && (
                <ActionButton icon={XCircle} label="Cancelar" danger onClick={() => openConfirm("cancel", selected)} disabled={acting} />
              )}
              {(selected.status === "failed" || selected.status === "cancelled") && (
                <ActionButton icon={RotateCcw} label="Reintentar" onClick={() => performAction(retryAITrainingRun, selected, "Entrenamiento reencolado.")} disabled={acting} />
              )}
              {selected.status === "completed" && selected.modelVersion && selected.modelVersion.status !== "active" && (
                <ActionButton icon={Sparkles} label="Activar modelo" onClick={() => performAction(activateAITrainingRun, selected, "Modelo activado.")} disabled={acting} />
              )}
              {selected.modelVersion?.status === "active" && (
                <ActionButton icon={PowerOff} label="Desactivar modelo" onClick={() => openConfirm("deactivate", selected)} disabled={acting} />
              )}
              {selected.status !== "running" && selected.modelVersion?.status !== "active" && (
                <ActionButton icon={Trash2} label="Eliminar" danger onClick={() => openConfirm("delete", selected)} disabled={acting} />
              )}
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <AdminFormModal
        open={createOpen}
        onClose={creating ? undefined : closeCreate}
        title="Nuevo entrenamiento"
        subtitle="Solo se utilizarán lecturas marcadas como listas e incluidas en Preparación IA."
        onSave={submitCreate}
        saving={creating}
        width={620}
      >
        <FormSection title="Identificación">
          <FormField label="Nombre" required>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              style={inputStyle}
              maxLength={160}
            />
          </FormField>
          <FormField label="Descripción">
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              style={{ ...inputStyle, height: 70, padding: "8px 10px", resize: "vertical" }}
              maxLength={2000}
            />
          </FormField>
        </FormSection>

        <FormSection title="Modelo y rango">
          <FormField label="Tipo de modelo" required>
            <select
              value={form.modelType}
              onChange={(event) => setForm((prev) => ({ ...prev, modelType: event.target.value }))}
              style={inputStyle}
            >
              {MODEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FormField label="Desde">
              <input
                type="date"
                value={form.dateFrom}
                onChange={(event) => setForm((prev) => ({ ...prev, dateFrom: event.target.value }))}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Hasta">
              <input
                type="date"
                value={form.dateTo}
                onChange={(event) => setForm((prev) => ({ ...prev, dateTo: event.target.value }))}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Parámetros">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <FormField label="Entrenamiento (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.trainRatio}
                onChange={(event) => setForm((prev) => ({ ...prev, trainRatio: event.target.value }))}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Validación (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.validationRatio}
                onChange={(event) => setForm((prev) => ({ ...prev, validationRatio: event.target.value }))}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Máximo lecturas">
              <input
                type="number"
                min={1}
                value={form.maxReadings}
                onChange={(event) => setForm((prev) => ({ ...prev, maxReadings: event.target.value }))}
                style={inputStyle}
                placeholder="Sin tope"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Dispositivos">
          {devices.length === 0 ? (
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
              No hay dispositivos disponibles. Verifica que existan en el inventario.
            </span>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {devices.map((device) => {
                const checked = form.deviceIds.includes(device.id);
                return (
                  <label key={device.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--eco-border, #E2E8F0)", cursor: "pointer", background: checked ? "rgba(34,197,94,.06)" : "transparent" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const isChecked = event.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          deviceIds: isChecked
                            ? Array.from(new Set([...prev.deviceIds, device.id]))
                            : prev.deviceIds.filter((id) => id !== device.id),
                        }));
                      }}
                    />
                    <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600 }}>{device.name || device.code}</span>
                    <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft)" }}>{device.code}</span>
                  </label>
                );
              })}
            </div>
          )}
        </FormSection>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.useReadyOnly}
            onChange={(event) => setForm((prev) => ({ ...prev, useReadyOnly: event.target.checked }))}
          />
          <span style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)" }}>
            Usar solo lecturas listas e incluidas desde Preparación IA.
          </span>
        </label>

        {formError && (
          <div style={{ background: "rgba(220,38,38,.07)", border: "1px solid rgba(220,38,38,.25)", borderRadius: 8, padding: "8px 10px", fontFamily: fb, fontSize: 12, color: "#991B1B" }}>
            {formError}
          </div>
        )}
      </AdminFormModal>

      <AdminConfirmDialog
        open={!!confirm}
        onClose={() => (acting ? null : setConfirm(null))}
        onConfirm={handleConfirm}
        loading={acting}
        title={
          confirm?.type === "delete"
            ? "Eliminar entrenamiento"
            : confirm?.type === "deactivate"
              ? "Desactivar modelo"
              : "Cancelar entrenamiento"
        }
        message={
          confirm?.type === "delete"
            ? `Vas a eliminar el entrenamiento "${confirm?.run?.name || ""}". Esta acción no se puede deshacer.`
            : confirm?.type === "deactivate"
              ? `Vas a desactivar el modelo asociado al entrenamiento "${confirm?.run?.name || ""}".`
              : `Vas a cancelar el entrenamiento "${confirm?.run?.name || ""}".`
        }
        confirmLabel={confirm?.type === "delete" ? "Eliminar" : confirm?.type === "deactivate" ? "Desactivar" : "Cancelar entrenamiento"}
        danger={confirm?.type === "delete" || confirm?.type === "cancel"}
      />
    </div>
  );
}

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--eco-primary-500, #22C55E)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(34,197,94,.25)",
};

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

const inputStyle = {
  width: "100%",
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text, #1E293B)",
  fontFamily: fb,
  fontSize: 13,
  padding: "0 10px",
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 999,
  background: "var(--eco-card-muted, #F1F5F9)",
  fontFamily: fm,
  fontSize: 11,
  color: "var(--eco-text)",
};

function SmallButton({ children, onClick, danger, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        height: 28,
        padding: "0 10px",
        borderRadius: 7,
        border: `1px solid ${danger ? "rgba(220,38,38,.25)" : "var(--eco-border, #E2E8F0)"}`,
        background: "var(--eco-card, #fff)",
        color: danger ? "#B91C1C" : "var(--eco-text, #1E293B)",
        fontFamily: fb,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 8,
        border: `1px solid ${danger ? "rgba(220,38,38,.25)" : "var(--eco-border, #E2E8F0)"}`,
        background: "var(--eco-card, #fff)",
        color: danger ? "#B91C1C" : "var(--eco-text, #1E293B)",
        fontFamily: fb,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function FormSection({ title, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: fd, fontSize: 11.5, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {title}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text)" }}>
        {label}
        {required && <span style={{ color: "#DC2626", marginLeft: 3 }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function Mini({ label, value, icon: Icon, color, helper }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text)", lineHeight: 1.1, wordBreak: "break-word" }}>{value}</div>
        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>{label}</div>
        {helper && <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>{helper}</div>}
      </div>
    </div>
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

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontFamily: fd, fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--eco-text-soft)" }}>
      <Icon size={12} />
      {label}
    </div>
  );
}

function AuditRow({ event }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 10 }}>
      <ScrollText size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--eco-text-soft)" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)" }}>
          <strong>{event.description || event.eventType}</strong>
        </div>
        <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
          {formatDateTime(event.ts)} · {event.user || "Sistema"}
        </div>
      </div>
      <span style={{ fontFamily: fm, fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#7C3AED", color: "#fff", textTransform: "uppercase", height: "fit-content" }}>
        {event.actionKey || "evento"}
      </span>
    </div>
  );
}
