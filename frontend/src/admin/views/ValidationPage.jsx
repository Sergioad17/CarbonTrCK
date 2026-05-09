import React from "react";
import {
  CheckSquare, CheckCircle2, XCircle, AlertTriangle, Clock, Check,
  RotateCcw, History, MessageSquare, RefreshCw, X, Paperclip, Image as ImageIcon,
  FileText, Trash2, Eye,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import RecordArchiveDialog from "../../components/RecordArchiveDialog";
import {
  archiveEmissionRecord,
  decideRecordValidation,
  fetchEmissionRecords,
  fetchRecordValidationDecisions,
  fetchRecordValidationQueue,
} from "../../api/records";
import { buildApiUrl } from "../../api/config";
import { buildArchiveAuditPayload, canArchiveRecord } from "../../lib/recordArchive";
import { getSession } from "../../lib/sessionStore";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const validationCriteria = [
  { id: "evidence", label: "La evidencia respalda el consumo reportado.", required: true },
  { id: "period", label: "La fecha corresponde al periodo operativo correcto.", required: true },
  { id: "factor", label: "El factor de emisión aplicado es coherente.", required: true },
  { id: "area", label: "El campus y el área están correctamente asignados.", required: true },
  { id: "notes", label: "Las notas explican cualquier variación relevante.", required: false },
];

const PRIORITY = {
  high: { variant: "error", label: "Alta" },
  normal: { variant: "info", label: "Normal" },
  low: { variant: "neutral", label: "Baja" },
};

const DECISION = {
  approved: { color: "#16A34A", label: "Aprobado", icon: CheckCircle2 },
  rejected: { color: "#DC2626", label: "Rechazado", icon: XCircle },
  returned: { color: "#CA8A04", label: "Devuelto", icon: RotateCcw },
};

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "").slice(0, 10) || "Sin fecha";
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "") || "Sin fecha";
  return date.toLocaleString("es-MX", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function errorMessage(error) {
  const code = error?.payload?.code || error?.code;
  const message = String(error?.payload?.message || error?.message || "").trim();
  if (code === "backend_not_configured") return "El backend no está configurado para esta sesión.";
  if (code === "UNAUTHENTICATED") return "Sesión expirada. Vuelve a iniciar sesión.";
  if (code === "FORBIDDEN") return "No tienes permiso para validar registros.";
  if (code === "CONFLICT") return "Uno o más registros ya fueron procesados. Actualiza la cola.";
  if (message.includes("required validation criteria")) return "Antes de aprobar, todos los criterios obligatorios deben estar marcados como cumplidos.";
  if (message.includes("at least one required validation criterion")) return "Para devolver un registro, al menos un criterio obligatorio debe quedar sin cumplir.";
  if (message && message !== "request_failed") return message;
  return "No se pudo completar la operación de validación.";
}

function defaultCriteriaState() {
  return Object.fromEntries(validationCriteria.map((criterion) => [criterion.id, false]));
}

function getAuthToken() {
  return getSession()?.token || null;
}

function resolveEvidenceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  if (raw.startsWith("//") && typeof window !== "undefined") return `${window.location.protocol}${raw}`;
  try {
    return buildApiUrl(raw);
  } catch {
    return typeof window !== "undefined" ? new URL(raw, window.location.origin).toString() : raw;
  }
}

function evidenceList(record) {
  if (!record) return [];
  const files = Array.isArray(record.evidenceFiles) ? record.evidenceFiles : [];
  const items = files
    .map((file, index) => {
      const url = String(file?.url || file?.downloadUrl || "").trim();
      const name = String(file?.fileName || file?.name || file?.originalName || "").trim();
      if (!url && !name) return null;
      return {
        id: String(file?.id || file?.fileId || `file-${index + 1}`),
        name: name || "Evidencia",
        url,
        mimeType: String(file?.mimeType || file?.contentType || "").trim(),
      };
    })
    .filter(Boolean);

  if (items.length === 0) {
    const fallbackUrl = String(record.evidenceUrl || record.evidence || "").trim();
    const fallbackName = String(record.evidence || "").trim();
    if (fallbackUrl || fallbackName) {
      items.push({
        id: String(record.evidenceFileId || "evidence-primary"),
        name: fallbackName || "Evidencia",
        url: fallbackUrl,
        mimeType: "",
      });
    }
  }

  return items;
}

export default function ValidationPage() {
  const [loading, setLoading] = React.useState(true);
  const [completedLoading, setCompletedLoading] = React.useState(false);
  const [queue, setQueue] = React.useState([]);
  const [completedRecords, setCompletedRecords] = React.useState([]);
  const [decisions, setDecisions] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [openItem, setOpenItem] = React.useState(null);
  const [openCompleted, setOpenCompleted] = React.useState(null);
  const [archiveDialog, setArchiveDialog] = React.useState(null);
  const [archivingId, setArchivingId] = React.useState("");
  const [removingIds, setRemovingIds] = React.useState([]);
  const [confirm, setConfirm] = React.useState(null);
  const [comment, setComment] = React.useState("");
  const [notice, setNotice] = React.useState({ type: "", message: "" });
  const [saving, setSaving] = React.useState(false);
  const [criteria, setCriteria] = React.useState(defaultCriteriaState);
  const archivePermission = React.useMemo(() => canArchiveRecord(), []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setCompletedLoading(true);
    setNotice({ type: "", message: "" });
    try {
      const [queueItems, decisionItems] = await Promise.all([
        fetchRecordValidationQueue(),
        fetchRecordValidationDecisions(),
      ]);
      setQueue(queueItems);
      setDecisions(decisionItems);
      setSelectedIds([]);
      setOpenItem(null);
      setOpenCompleted(null);
    } catch (error) {
      setQueue([]);
      setDecisions([]);
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }

    try {
      const completedItems = await fetchEmissionRecords({ status: "approved" });
      setCompletedRecords(completedItems);
    } catch (error) {
      setCompletedRecords([]);
      setNotice((prev) => prev.message ? prev : { type: "error", message: "No se pudieron cargar los registros completados." });
    } finally {
      setCompletedLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    setComment("");
    setCriteria(defaultCriteriaState());
  }, [openItem?.id]);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.length === queue.length ? [] : queue.map((item) => item.id)));
  }

  function evaluatedCriteria() {
    return validationCriteria
      .map((criterion) => ({ id: criterion.id, label: criterion.label, required: criterion.required, passed: Boolean(criteria[criterion.id]) }));
  }

  function missingRequiredCriteria() {
    return validationCriteria.filter((criterion) => criterion.required && !criteria[criterion.id]);
  }

  function openConfirm(kind, ids) {
    const targetIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (targetIds.length < 1) {
      setNotice({ type: "error", message: "Selecciona al menos un registro para continuar." });
      return;
    }

    const missing = missingRequiredCriteria();
    if (kind === "approved" && missing.length > 0) {
      setNotice({ type: "error", message: `No puedes aprobar todavía. Faltan criterios obligatorios: ${missing.map((item) => item.label).join(" ")}` });
      return;
    }

    if (kind === "returned" && missing.length < 1) {
      setNotice({ type: "error", message: "Para devolver un registro, deja sin marcar al menos un criterio obligatorio que deba corregirse." });
      return;
    }

    if (kind !== "approved" && comment.trim().length < 8) {
      setNotice({ type: "error", message: "Agrega un comentario de al menos 8 caracteres antes de devolver o rechazar registros." });
      return;
    }
    setConfirm({ kind, ids: targetIds });
  }

  async function handleDecision(ids, kind) {
    setSaving(true);
    setNotice({ type: "", message: "" });
    try {
      const result = await decideRecordValidation({
        ids,
        decision: kind,
        comment,
        criteria: evaluatedCriteria(),
      });
      setQueue(result.queue);
      if (kind === "approved") {
        const refreshedCompleted = await fetchEmissionRecords({ status: "approved" }).catch(() => completedRecords);
        setCompletedRecords(refreshedCompleted);
      }
      setDecisions((prev) => [...result.decisions, ...prev.filter((item) => !result.decisions.some((next) => next.id === item.id))]);
      setSelectedIds([]);
      setOpenItem(null);
      setConfirm(null);
      setComment("");
      setCriteria(defaultCriteriaState());
      setNotice({ type: "success", message: "Decisión registrada correctamente en el backend." });
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  function openArchiveDialog(record) {
    if (!archivePermission.allowed) {
      setNotice({ type: "error", message: archivePermission.message });
      return;
    }
    setArchiveDialog(record);
  }

  async function handleArchiveConfirm({ reason }) {
    if (!archiveDialog?.id || !archivePermission.allowed) return;
    const recordToArchive = archiveDialog;
    setArchivingId(recordToArchive.id);
    setNotice({ type: "", message: "" });
    try {
      await archiveEmissionRecord(recordToArchive.id, buildArchiveAuditPayload(archivePermission.actor, reason));
      setRemovingIds((prev) => (prev.includes(recordToArchive.id) ? prev : [...prev, recordToArchive.id]));
      window.setTimeout(() => {
        setCompletedRecords((prev) => prev.filter((record) => record.id !== recordToArchive.id));
        setRemovingIds((prev) => prev.filter((id) => id !== recordToArchive.id));
        setOpenCompleted((prev) => (prev?.id === recordToArchive.id ? null : prev));
        setArchiveDialog(null);
        setArchivingId("");
        setNotice({ type: "success", message: "Registro dado de baja con trazabilidad conservada." });
      }, 280);
    } catch (error) {
      setArchivingId("");
      setNotice({ type: "error", message: errorMessage(error) || "No se pudo dar de baja el registro." });
    }
  }

  const stats = {
    total: queue.length,
    high: queue.filter((item) => item.priority === "high").length,
    over5: queue.filter((item) => (Date.now() - new Date(item.submittedAt).getTime()) / 86400000 > 5).length,
    decisions: decisions.length,
    completed: completedRecords.length,
  };

  const columns = [
    { key: "_select", label: "", width: 40, render: (_, row) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(row.id)}
        onChange={(event) => { event.stopPropagation(); toggleSelect(row.id); }}
        onClick={(event) => event.stopPropagation()}
        style={{ cursor: "pointer", accentColor: "var(--eco-primary-500)" }}
      />
    ) },
    { key: "priority", label: "Prioridad", width: 100, render: (value) => (
      <AdminStatusBadge variant={PRIORITY[value]?.variant} label={PRIORITY[value]?.label || "Normal"} />
    ) },
    { key: "record", label: "Registro", render: (_, row) => row.record && (
      <div>
        <div style={{ fontWeight: 600 }}>{row.record.category} - {row.record.area}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
          {formatNumber(row.record.value)} {row.record.unit} · {formatNumber(row.record.co2e_kg)} kgCO2e
        </div>
      </div>
    ) },
    { key: "reason", label: "Motivo", maxWidth: 260, render: (value, row) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {row.latestValidationDecision === "returned" && (
          <AdminStatusBadge variant="warning" label="Devuelto" />
        )}
        <span style={{ fontSize: 12, color: "var(--eco-text-soft)" }}>{value}</span>
      </div>
    ) },
    { key: "submittedAt", label: "Enviado", mono: true, width: 120, render: formatDate },
    { key: "assignedTo", label: "Asignado a", width: 140 },
  ];

  const completedColumns = [
    { key: "dateISO", label: "Fecha", mono: true, width: 110, render: formatDate },
    { key: "category", label: "Categoría", width: 120, render: (value) => (
      <AdminStatusBadge variant={value === "combustible" ? "warning" : "info"} label={value === "combustible" ? "Combustible" : "Electricidad"} />
    ) },
    { key: "activity", label: "Registro", render: (_, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{row.activityText || row.activity}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
          {row.area} · {formatNumber(row.value)} {row.unit}
        </div>
      </div>
    ) },
    { key: "co2e_kg", label: "Emisiones", width: 130, mono: true, render: (value) => `${formatNumber(value)} kgCO2e` },
    { key: "approvedAt", label: "Aprobado", width: 120, mono: true, render: formatDate },
    { key: "approvedBy", label: "Validado por", width: 160, render: (value) => value || "Administrador" },
    { key: "evidence", label: "Evidencia", width: 110, render: (_, row) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: row.hasEvidence || evidenceList(row).length ? "var(--eco-primary-700)" : "var(--eco-text-soft)" }}>
        <Paperclip size={12} />
        {row.hasEvidence || evidenceList(row).length ? "Disponible" : "Sin evidencia"}
      </span>
    ) },
    { key: "_view", label: "", width: 48, render: (_, row) => (
      <button
        type="button"
        aria-label={`Ver ${row.activityText || row.activity}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpenCompleted(row);
        }}
        style={iconButtonStyle}
      >
        <Eye size={13} />
      </button>
    ) },
  ];

  const relatedDecisions = openItem
    ? decisions.filter((decision) => decision.recordId === openItem.recordId)
    : [];

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={CheckSquare}
        title="Validación y aprobación"
        subtitle="Cola real de registros pendientes con revisión por criterios, comentarios e historial de decisiones."
        breadcrumb={["Control", "Validación"]}
        actions={
          <button type="button" onClick={loadData} style={secondaryButtonStyle}>
            <RefreshCw size={13} /> Actualizar
          </button>
        }
      />

      {notice.message ? <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: "", message: "" })} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard label="En cola" value={stats.total} icon={Clock} color="#2563EB" />
        <KpiCard label="Prioridad alta" value={stats.high} icon={AlertTriangle} color="#DC2626" />
        <KpiCard label="Más de 5 días" value={stats.over5} icon={Clock} color="#CA8A04" />
        <KpiCard label="Decisiones" value={stats.decisions} icon={History} color="#7C3AED" />
        <KpiCard label="Completados" value={stats.completed} icon={CheckCircle2} color="#16A34A" />
      </div>

      {selectedIds.length > 0 && (
        <div style={selectionPanelStyle}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700, #15803D)", marginBottom: 8 }}>
              {selectedIds.length} seleccionado{selectedIds.length > 1 ? "s" : ""}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Comentario para devolución o rechazo"
              rows={2}
              style={textareaStyle}
            />
            <div style={{ marginTop: 10 }}>
              <CriteriaChecklist criteria={criteria} onChange={setCriteria} compact />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => openConfirm("rejected", selectedIds)} style={btnDanger}>
              <XCircle size={14} /> Rechazar
            </button>
            <button onClick={() => openConfirm("returned", selectedIds)} style={btnWarning}>
              <RotateCcw size={14} /> Devolver
            </button>
            <button onClick={() => openConfirm("approved", selectedIds)} style={btnPrimary}>
              <CheckCircle2 size={14} /> Aprobar
            </button>
          </div>
        </div>
      )}

      <div style={selectAllStyle}>
        <input
          type="checkbox"
          checked={selectedIds.length === queue.length && queue.length > 0}
          onChange={toggleAll}
          style={{ cursor: "pointer", accentColor: "var(--eco-primary-500)" }}
        />
        <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
          Seleccionar todo ({queue.length})
        </span>
      </div>

      <AdminDataTable
        columns={columns}
        data={queue}
        onRowClick={setOpenItem}
        emptyMessage="No hay registros pendientes de validación."
        maxHeight={360}
      />

      <div style={{ marginTop: 24 }}>
        <SectionTitle icon={CheckCircle2} label={`Registros completados (${completedRecords.length})`} />
        <AdminDataTable
          columns={completedColumns}
          data={completedRecords.filter((record) => !removingIds.includes(record.id))}
          onRowClick={setOpenCompleted}
          emptyMessage={completedLoading ? "Cargando registros completados..." : "No hay registros completados por un administrador."}
          maxHeight={360}
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <SectionTitle icon={History} label="Historial de decisiones" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {decisions.length === 0 ? (
            <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
              Sin decisiones registradas todavía.
            </div>
          ) : decisions.map((decision) => <DecisionRow key={decision.id} decision={decision} />)}
        </div>
      </div>

      <AdminEntityDrawer
        open={!!openItem}
        onClose={() => setOpenItem(null)}
        title={openItem?.record ? `${openItem.record.category} - ${openItem.record.area}` : ""}
        subtitle={openItem ? `Registro ${openItem.recordId} · Prioridad ${PRIORITY[openItem.priority]?.label || "Normal"}` : ""}
        badge={openItem && <AdminStatusBadge variant={PRIORITY[openItem.priority]?.variant} label={PRIORITY[openItem.priority]?.label || "Normal"} />}
        actions={openItem && (
          <>
            <button onClick={() => openConfirm("rejected", [openItem.id])} style={btnDanger}>
              <XCircle size={14} /> Rechazar
            </button>
            <button onClick={() => openConfirm("returned", [openItem.id])} style={btnWarning}>
              <RotateCcw size={14} /> Devolver
            </button>
            <button onClick={() => openConfirm("approved", [openItem.id])} style={btnPrimary}>
              <CheckCircle2 size={14} /> Aprobar
            </button>
          </>
        )}
        width={540}
      >
        {openItem && openItem.record && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Consumo" mono>{formatNumber(openItem.record.value)} {openItem.record.unit}</DrawerField>
              <DrawerField label="Emisiones" mono>{formatNumber(openItem.record.co2e_kg)} kgCO2e</DrawerField>
              <DrawerField label="Capturado por">{openItem.record.by || "--"}</DrawerField>
              <DrawerField label="Fecha" mono>{formatDate(openItem.record.dateISO)}</DrawerField>
              <DrawerField label="Campus" mono>{openItem.record.campusCode || "--"}</DrawerField>
              <DrawerField label="Área" mono>{openItem.record.areaCode || "--"}</DrawerField>
              <DrawerField label="Origen">{openItem.record.source || "--"}</DrawerField>
              <DrawerField label="Factor" mono>{formatNumber(openItem.record.factor, 6)}</DrawerField>
            </div>
            <DrawerField label="Actividad">{openItem.record.activityText || openItem.record.activity || "--"}</DrawerField>
            <DrawerField label="Motivo de envío">{openItem.reason}</DrawerField>

            <EvidencePanel record={openItem.record} />

            <div>
              <SectionTitle icon={Check} label="Criterios de validación" />
              <CriteriaChecklist criteria={criteria} onChange={setCriteria} />
            </div>

            <div>
              <SectionTitle icon={MessageSquare} label="Comentario de revisión" />
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Observaciones para el capturista; obligatorio al devolver o rechazar"
                rows={3}
                style={textareaStyle}
              />
            </div>

            <div>
              <SectionTitle icon={History} label="Historial del registro" />
              {relatedDecisions.length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin decisiones previas.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {relatedDecisions.map((decision) => <DecisionRow key={decision.id} decision={decision} />)}
                </div>
              )}
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <AdminEntityDrawer
        open={!!openCompleted}
        onClose={() => setOpenCompleted(null)}
        title={openCompleted ? `${openCompleted.category} - ${openCompleted.area}` : ""}
        subtitle={openCompleted ? `Registro completado · ${formatDate(openCompleted.approvedAt || openCompleted.dateISO)}` : ""}
        badge={<AdminStatusBadge variant="success" label="Completado" />}
        width={560}
      >
        {openCompleted && (
          <>
            <div style={completedStatsStyle}>
              <p style={{ margin: "0 0 8px", fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700, #15803D)" }}>
                Estadísticas del registro validado
              </p>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 800, color: "var(--eco-text)" }}>{formatNumber(openCompleted.value, openCompleted.unit === "kWh" ? 0 : 1)}</span>
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>{openCompleted.unit}</span>
                <span style={{ fontFamily: fm, fontSize: 14, color: "var(--eco-text-soft)" }}>x</span>
                <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 800, color: "var(--eco-text)" }}>{formatNumber(openCompleted.factor, 4)}</span>
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>factor</span>
                <span style={{ fontFamily: fm, fontSize: 14, color: "var(--eco-text-soft)" }}>=</span>
                <span style={{ fontFamily: fm, fontSize: 22, fontWeight: 800, color: "var(--eco-primary-700, #15803D)" }}>{formatNumber(openCompleted.co2e_t, 4)}</span>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700, #15803D)" }}>tCO2e</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Fecha" mono>{formatDate(openCompleted.dateISO)}</DrawerField>
              <DrawerField label="Categoría">{openCompleted.category}</DrawerField>
              <DrawerField label="Consumo" mono>{formatNumber(openCompleted.value)} {openCompleted.unit}</DrawerField>
              <DrawerField label="Emisiones" mono>{formatNumber(openCompleted.co2e_kg)} kgCO2e</DrawerField>
              <DrawerField label="Campus" mono>{openCompleted.campusCode || "--"}</DrawerField>
              <DrawerField label="Área" mono>{openCompleted.areaCode || "--"}</DrawerField>
              <DrawerField label="Validado por">{openCompleted.approvedBy || "Administrador"}</DrawerField>
              <DrawerField label="Aprobado" mono>{formatDate(openCompleted.approvedAt)}</DrawerField>
            </div>
            <DrawerField label="Actividad">{openCompleted.activityText || openCompleted.activity || "--"}</DrawerField>
            <EvidencePanel record={openCompleted} />

            <div style={archivePanelStyle}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: "0 0 3px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text, #1E293B)" }}>Baja lógica con trazabilidad</p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", lineHeight: 1.5 }}>
                  Oculta este registro completado del flujo operativo. Conserva archivos, revisiones y auditoría.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openArchiveDialog(openCompleted)}
                disabled={!archivePermission.allowed || archivingId === openCompleted.id}
                style={{
                  ...archiveActionButtonStyle,
                  background: archivePermission.allowed ? "linear-gradient(135deg, #EF4444, #DC2626)" : "var(--eco-gray-200)",
                  color: archivePermission.allowed ? "#fff" : "var(--eco-gray-400)",
                  cursor: archivePermission.allowed ? "pointer" : "not-allowed",
                  boxShadow: archivePermission.allowed ? "0 6px 16px -6px rgba(220,38,38,.45)" : "none",
                }}
                onMouseEnter={(event) => {
                  if (!archivePermission.allowed) return;
                  event.currentTarget.style.transform = "translateY(-1px)";
                  event.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(220,38,38,.55)";
                  event.currentTarget.style.filter = "brightness(1.06)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = "translateY(0)";
                  event.currentTarget.style.boxShadow = archivePermission.allowed ? "0 6px 16px -6px rgba(220,38,38,.45)" : "none";
                  event.currentTarget.style.filter = "brightness(1)";
                }}
              >
                <Trash2 size={13} /> Dar de baja
              </button>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <AdminConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === "approved" ? "Aprobar registros" :
          confirm?.kind === "returned" ? "Devolver para corrección" :
          "Rechazar registros"
        }
        message={
          confirm?.kind === "approved"
            ? `¿Confirmas la aprobación de ${confirm?.ids.length} registro(s)? El backend los marcará como validados.`
            : confirm?.kind === "returned"
            ? `¿Devolver ${confirm?.ids.length} registro(s) al capturista para corrección? Se guardará el comentario de revisión.`
            : `¿Confirmas el rechazo de ${confirm?.ids.length} registro(s)? El registro quedará fuera de la cola activa.`
        }
        confirmLabel={
          confirm?.kind === "approved" ? "Aprobar" :
          confirm?.kind === "returned" ? "Devolver" :
          "Rechazar"
        }
        danger={confirm?.kind === "rejected"}
        loading={saving}
        onConfirm={() => handleDecision(confirm.ids, confirm.kind)}
      />

      <RecordArchiveDialog
        open={Boolean(archiveDialog)}
        record={archiveDialog}
        permission={archivePermission}
        submitting={Boolean(archivingId)}
        onClose={() => {
          if (!archivingId) setArchiveDialog(null);
        }}
        onConfirm={handleArchiveConfirm}
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
      fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: ".05em", color: "var(--eco-text-soft)",
    }}>
      <Icon size={13} /> {label}
    </div>
  );
}

function EvidencePanel({ record }) {
  const items = evidenceList(record);
  const [preview, setPreview] = React.useState({ src: "", failed: false, loading: false });
  const primary = items[0] || null;

  React.useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    setPreview({ src: "", failed: false, loading: Boolean(primary?.url) });

    if (!primary?.url) return undefined;
    const resolvedUrl = resolveEvidenceUrl(primary.url);
    if (!resolvedUrl) {
      setPreview({ src: "", failed: true, loading: false });
      return undefined;
    }
    if (resolvedUrl.startsWith("data:") || resolvedUrl.startsWith("blob:")) {
      setPreview({ src: resolvedUrl, failed: false, loading: false });
      return undefined;
    }

    const token = getAuthToken();
    fetch(resolvedUrl, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error("evidence_not_available"))))
      .then((blob) => {
        if (cancelled) return;
        if (!blob.type.startsWith("image/")) {
          setPreview({ src: "", failed: true, loading: false });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setPreview({ src: objectUrl, failed: false, loading: false });
      })
      .catch(() => {
        if (!cancelled) setPreview({ src: "", failed: true, loading: false });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [primary?.url]);

  return (
    <div style={evidencePanelStyle}>
      <SectionTitle icon={Paperclip} label="Evidencia del registro" />
      {items.length === 0 ? (
        <div style={emptyEvidenceStyle}>
          <FileText size={16} />
          <span>Este registro no tiene evidencia adjunta.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items.map((item) => (
              <span key={item.id} style={evidenceChipStyle}>
                <Paperclip size={11} />
                {item.name || "Evidencia"}
              </span>
            ))}
          </div>
          {preview.loading ? (
            <div style={emptyEvidenceStyle}>
              <ImageIcon size={16} />
              <span>Cargando vista previa de la evidencia...</span>
            </div>
          ) : preview.src ? (
            <div style={evidenceImageWrapStyle}>
              <img src={preview.src} alt="Evidencia del registro" style={evidenceImageStyle} />
            </div>
          ) : (
            <div style={emptyEvidenceStyle}>
              <FileText size={16} />
              <span>La evidencia existe, pero no es una imagen disponible para vista previa.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CriteriaChecklist({ criteria, onChange, compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
      {validationCriteria.map((criterion) => (
        <label key={criterion.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: compact ? "7px 10px" : "9px 12px",
          background: criteria[criterion.id] ? "rgba(34,197,94,.08)" : "var(--eco-card-muted)",
          border: `1px solid ${criteria[criterion.id] ? "rgba(34,197,94,.25)" : "var(--eco-border)"}`,
          borderRadius: 8, cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={!!criteria[criterion.id]}
            onChange={(event) => onChange((prev) => ({ ...prev, [criterion.id]: event.target.checked }))}
            style={{ accentColor: "var(--eco-primary-500)", flexShrink: 0 }}
          />
          <span style={{ fontFamily: fb, fontSize: compact ? 12 : 12.5, color: "var(--eco-text)", flex: 1, lineHeight: 1.35 }}>
            {criterion.label}
          </span>
          {criterion.required && <span style={requiredStyle}>Obligatorio</span>}
        </label>
      ))}
    </div>
  );
}

function DecisionRow({ decision }) {
  const cfg = DECISION[decision.decision] || DECISION.approved;
  const Icon = cfg.icon;
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "10px 12px",
      background: `${cfg.color}10`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 6,
    }}>
      <Icon size={14} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: fb, fontSize: 11.5, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text)" }}>· {decision.actor}</span>
          <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>· {formatDateTime(decision.ts)}</span>
          <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>· {decision.recordId}</span>
        </div>
        {decision.comment && (
          <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3, lineHeight: 1.4 }}>
            {decision.comment}
          </div>
        )}
        {Array.isArray(decision.criteria) && decision.criteria.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
            {decision.criteria.map((criterion) => {
              const passed = criterion.passed !== false;
              return (
                <span key={criterion.id || criterion.label} style={{
                  fontFamily: fb,
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  color: passed ? "#166534" : "#991B1B",
                  background: passed ? "rgba(34,197,94,.10)" : "rgba(220,38,38,.08)",
                  border: `1px solid ${passed ? "rgba(34,197,94,.20)" : "rgba(220,38,38,.20)"}`,
                }}>
                  {passed ? "Cumple" : "Falta"}: {criterion.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ type, message, onClose }) {
  const isError = type === "error";
  return (
    <div style={{
      marginBottom: 14, padding: "10px 12px", borderRadius: 10,
      border: `1px solid ${isError ? "rgba(220,38,38,.25)" : "rgba(34,197,94,.25)"}`,
      background: isError ? "rgba(220,38,38,.07)" : "rgba(34,197,94,.07)",
      display: "flex", justifyContent: "space-between", gap: 12,
    }}>
      <span style={{ fontFamily: fb, fontSize: 13, color: isError ? "#991B1B" : "#166534" }}>{message}</span>
      <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit" }}>
        <X size={14} />
      </button>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
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

const btnPrimary = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
  fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 1px 3px rgba(34,197,94,.25)",
};

const btnDanger = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid rgba(239,68,68,.25)",
  background: "rgba(239,68,68,.08)", color: "var(--eco-danger)",
  fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const btnWarning = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid rgba(202,138,4,.25)",
  background: "rgba(202,138,4,.08)", color: "#CA8A04",
  fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const iconButtonStyle = {
  height: 28,
  width: 28,
  borderRadius: "var(--eco-radius-sm, 8px)",
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text-soft)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 150ms ease",
};

const completedStatsStyle = {
  background: "var(--eco-primary-50, rgba(34,197,94,.08))",
  border: "1px solid rgba(34,197,94,.20)",
  borderRadius: 12,
  padding: 16,
  textAlign: "center",
};

const archivePanelStyle = {
  background: "rgba(239,68,68,.04)",
  border: "1px solid rgba(239,68,68,.12)",
  borderRadius: "var(--eco-radius-lg, 14px)",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  transition: "all .2s ease",
};

const archiveActionButtonStyle = {
  height: 36,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md, 10px)",
  border: "none",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  transition: "all .2s cubic-bezier(.4,0,.2,1)",
  flexShrink: 0,
};

const evidencePanelStyle = {
  border: "1px solid var(--eco-border, #E2E8F0)",
  borderRadius: 12,
  padding: 14,
  background: "var(--eco-card, #fff)",
};

const emptyEvidenceStyle = {
  minHeight: 52,
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px dashed var(--eco-border, #CBD5E1)",
  background: "var(--eco-card-muted, #F8FAFC)",
  color: "var(--eco-text-soft)",
  fontFamily: fb,
  fontSize: 12.5,
};

const evidenceChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(34,197,94,.20)",
  background: "rgba(34,197,94,.08)",
  color: "var(--eco-primary-700, #15803D)",
  fontFamily: fb,
  fontSize: 11.5,
  fontWeight: 700,
};

const evidenceImageWrapStyle = {
  borderRadius: 10,
  overflow: "hidden",
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card-muted, #F8FAFC)",
  display: "flex",
  justifyContent: "center",
};

const evidenceImageStyle = {
  width: "100%",
  maxHeight: 280,
  objectFit: "contain",
  display: "block",
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

const selectionPanelStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "12px 18px",
  marginBottom: 12,
  background: "rgba(34,197,94,.08)",
  border: "1px solid rgba(34,197,94,.20)",
  borderRadius: 12,
  flexWrap: "wrap",
};

const selectAllStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 18px",
  marginBottom: 0,
  background: "var(--eco-card, #fff)",
  border: "1px solid var(--eco-border, #E2E8F0)",
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
};

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  fontFamily: fb,
  fontSize: 12.5,
  background: "var(--eco-surface, #fff)",
  color: "var(--eco-text, #1E293B)",
  border: "1px solid var(--eco-border)",
  borderRadius: 8,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};

const requiredStyle = {
  fontFamily: fb,
  fontSize: 10,
  fontWeight: 700,
  color: "var(--eco-danger)",
  textTransform: "uppercase",
  letterSpacing: ".05em",
};
