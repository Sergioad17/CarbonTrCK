import React from "react";
import {
  Activity,
  CheckCircle2,
  Edit3,
  ListChecks,
  MessageSquare,
  Pause,
  Play,
  Plus,
  ShieldAlert,
  Target,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import Accions_Goals_Edits from "../../components/Accions_Goals_Edits";
import {
  computeTargetSummary,
  deleteActionById,
  deleteTargetById,
  fetchTargetsModuleData,
  persistAction,
  persistTarget,
  updateTargetStatus,
} from "../../api/targets";
import { fetchCurrentUser } from "../../api/session";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const EMPTY_OPTIONS = { types: [], statuses: [], categories: [], areas: [] };

const STATUS = {
  active: { variant: "info", label: "Activa" },
  at_risk: { variant: "warning", label: "En riesgo" },
  completed: { variant: "success", label: "Completada" },
  paused: { variant: "neutral", label: "Pausada" },
};

const ACTION_STATUS = {
  planned: { color: "#64748B", label: "Planificada" },
  in_progress: { color: "#2563EB", label: "En progreso" },
  done: { color: "#16A34A", label: "Completada" },
  blocked: { color: "#CA8A04", label: "Bloqueada" },
};

function getCreatorName(user) {
  return user?.fullName || user?.name || user?.email || "Admin CarbonTrack";
}

function buildTargetForm(overrides) {
  return {
    id: "",
    title: "",
    scope: "",
    category: "",
    areaId: "",
    type: "",
    metric: "",
    unit: "",
    baselineStart: "",
    baselineEnd: "",
    baselineValue: "",
    targetStart: "",
    targetEnd: "",
    targetValue: "",
    description: "",
    status: "",
    createdBy: "",
    createdById: "",
    pauseReason: "",
    ...(overrides || {}),
  };
}

function buildActionForm(overrides) {
  return {
    id: "",
    targetId: "",
    title: "",
    owner: "",
    status: "",
    startDate: "",
    endDate: "",
    impact_tco2e: "",
    evidence: "",
    notes: "",
    ...(overrides || {}),
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeSelectOptions(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const value = clean(item?.value || item?.code || item?.id);
      const label = clean(item?.label || item?.name || value);
      return { ...item, value, label };
    })
    .filter((item) => {
      if (!item.value || !item.label || seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
}

function normalizeTargetOptions(options) {
  return {
    types: normalizeSelectOptions(options?.types || []),
    statuses: normalizeSelectOptions(options?.statuses || []),
    categories: normalizeSelectOptions(options?.categories || []).map((item) => ({
      value: item.value,
      label: item.label,
      scope: clean(item.scope),
      metric: clean(item.metric),
      unit: clean(item.unit),
    })),
    areas: normalizeSelectOptions(options?.areas || []).map((item) => ({
      value: item.value,
      label: item.label,
      campus: clean(item.campus),
    })),
  };
}

function scopeLabel(scope) {
  if (scope === "scope1") return "Scope 1";
  if (scope === "scope2") return "Scope 2";
  if (scope === "scope3") return "Scope 3";
  return "Todos";
}

function fmt(value, digits = 1) {
  return Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function targetToForm(target, creatorName, creatorId) {
  return buildTargetForm({
    ...target,
    baselineValue: String(target.baselineValue || ""),
    targetValue: String(target.targetValue || ""),
    createdBy: target.createdBy || creatorName,
    createdById: target.createdById || creatorId || "",
    pauseReason: target.pauseReason || "",
  });
}

function actionToForm(action) {
  return buildActionForm({
    ...action,
    impact_tco2e: String(action.impact_tco2e || ""),
  });
}

export default function GoalsPage() {
  const currentUser = React.useMemo(() => fetchCurrentUser(), []);
  const creatorName = React.useMemo(() => getCreatorName(currentUser), [currentUser]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [targets, setTargets] = React.useState([]);
  const [actions, setActions] = React.useState([]);
  const [records, setRecords] = React.useState([]);
  const [catalogOptions, setCatalogOptions] = React.useState(EMPTY_OPTIONS);
  const [selectedId, setSelectedId] = React.useState("");
  const [targetModalOpen, setTargetModalOpen] = React.useState(false);
  const [actionModalOpen, setActionModalOpen] = React.useState(false);
  const [editingTarget, setEditingTarget] = React.useState(null);
  const [editingAction, setEditingAction] = React.useState(null);
  const [targetForm, setTargetForm] = React.useState(() => buildTargetForm());
  const [actionForm, setActionForm] = React.useState(() => buildActionForm());
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [confirmDeleteAction, setConfirmDeleteAction] = React.useState(null);

  const areaLabelMap = React.useMemo(
    () => new Map((catalogOptions.areas || []).map((area) => [area.value, area.label])),
    [catalogOptions.areas],
  );

  const rows = React.useMemo(
    () =>
      targets.map((target) => ({
        ...target,
        summary: computeTargetSummary(target, records, actions),
      })),
    [targets, records, actions],
  );

  const selected = rows.find((target) => target.id === selectedId) || null;

  async function loadData() {
    setLoading(true);
    setError("");
    const data = await fetchTargetsModuleData().catch(() => null);
    if (!data) {
      setError("No se pudieron cargar las metas y acciones.");
      setLoading(false);
      return;
    }
    setTargets(data.targets);
    setActions(data.actions);
    setRecords(data.records);
    setCatalogOptions(normalizeTargetOptions(data.options || EMPTY_OPTIONS));
    setLoading(false);
  }

  React.useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchTargetsModuleData().catch(() => null);
      if (!active) return;
      if (!data) {
        setError("No se pudieron cargar las metas y acciones.");
        setLoading(false);
        return;
      }
      setTargets(data.targets);
      setActions(data.actions);
      setRecords(data.records);
      setCatalogOptions(normalizeTargetOptions(data.options || EMPTY_OPTIONS));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function areaLabel(value) {
    if (!value || value === "all") return "Todas las áreas";
    return areaLabelMap.get(value) || value;
  }

  function openGoalModal(target = null) {
    setEditingTarget(target);
    setTargetForm(target ? targetToForm(target, creatorName, currentUser?.id) : buildTargetForm({
      createdBy: creatorName,
      createdById: currentUser?.id || "",
    }));
    setTargetModalOpen(true);
  }

  function openActionModal(targetOrAction = null) {
    if (targetOrAction?.targetId) {
      setEditingAction(targetOrAction);
      setActionForm(actionToForm(targetOrAction));
    } else {
      setEditingAction(null);
      const targetId = targetOrAction?.id || "";
      setActionForm(buildActionForm({ targetId }));
    }
    setActionModalOpen(true);
  }

  async function handleGoalSave(event) {
    event.preventDefault();
    const selectedCategory = catalogOptions.categories.find((item) => item.value === targetForm.category);
    const selectedArea = catalogOptions.areas.find((item) => item.value === targetForm.areaId);
    const baselineValue = Number(targetForm.baselineValue);
    const targetValue = Number(targetForm.targetValue);

    if (
      !targetForm.title.trim() ||
      !targetForm.type ||
      !selectedCategory ||
      !targetForm.areaId ||
      !targetForm.status ||
      !targetForm.baselineStart ||
      !targetForm.baselineEnd ||
      !targetForm.targetStart ||
      !targetForm.targetEnd ||
      !(baselineValue > 0) ||
      !(targetValue > 0) ||
      (targetForm.type === "reduction_percent" && targetValue > 100)
    ) {
      setError("Revisa los campos de la meta antes de guardar.");
      return;
    }

    setSaving(true);
    const payload = {
      ...targetForm,
      id: editingTarget ? targetForm.id : undefined,
      scope: selectedCategory.scope,
      category: selectedCategory.value,
      campus: targetForm.areaId === "all" ? "all" : selectedArea?.campus || "all",
      area: targetForm.areaId,
      metric: selectedCategory.metric,
      unit: selectedCategory.unit,
      baselineValue,
      targetValue,
      createdBy: editingTarget?.createdBy || targetForm.createdBy || creatorName,
      createdById: editingTarget?.createdById || targetForm.createdById || currentUser?.id || "",
      pauseReason: targetForm.pauseReason || editingTarget?.pauseReason || "",
    };
    const result = await persistTarget(payload).catch(() => null);
    setSaving(false);

    if (!result?.ok) {
      setError("No se pudo guardar la meta.");
      return;
    }
    setTargets(result.targets);
    setTargetModalOpen(false);
    setEditingTarget(null);
    setError("");
  }

  async function handleActionSave(event) {
    event.preventDefault();
    if (!actionForm.targetId || !actionForm.title.trim() || !actionForm.status) {
      setError("Selecciona una meta, nombre y estado para la acción.");
      return;
    }

    setSaving(true);
    const payload = {
      ...actionForm,
      id: editingAction ? actionForm.id : undefined,
      impact_tco2e: Number(actionForm.impact_tco2e || 0),
    };
    const result = await persistAction(payload).catch(() => null);
    setSaving(false);

    if (!result?.ok) {
      setError("No se pudo guardar la acción.");
      return;
    }
    setActions(result.actions);
    setActionModalOpen(false);
    setEditingAction(null);
    setError("");
  }

  async function togglePause(target) {
    const nextStatus = target.status === "paused" ? "active" : "paused";
    const patch = {
      status: nextStatus,
      pauseReason: nextStatus === "paused" ? target.pauseReason || "Pausada desde panel admin." : "",
    };
    const result = await updateTargetStatus(target, patch).catch(() => null);
    if (!result?.ok) {
      setError("No se pudo actualizar el estado de la meta.");
      return;
    }
    setTargets(result.targets);
    setError("");
  }

  async function updateActionStatus(action, nextStatus) {
    const result = await persistAction({ ...action, status: nextStatus }).catch(() => null);
    if (!result?.ok) {
      setError("No se pudo actualizar el estado de la acción.");
      return;
    }
    setActions(result.actions);
    setError("");
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const result = await deleteTargetById(confirmDelete.id).catch(() => null);
    if (!result?.ok) {
      setError("No se pudo eliminar la meta.");
      return;
    }
    setTargets(result.targets);
    setActions(result.actions);
    setSelectedId("");
    setConfirmDelete(null);
    setError("");
  }

  async function handleActionDelete() {
    if (!confirmDeleteAction) return;
    const result = await deleteActionById(confirmDeleteAction.id).catch(() => null);
    if (!result?.ok) {
      setError("No se pudo eliminar la acción.");
      return;
    }
    setTargets(result.targets);
    setActions(result.actions);
    setConfirmDeleteAction(null);
    setError("");
  }

  const stats = {
    activeGoals: rows.filter((target) => target.status !== "paused").length,
    atRiskGoals: rows.filter((target) => target.summary.state === "at_risk").length,
    totalActions: actions.length,
    pendingActions: actions.filter((action) => action.status === "planned" || action.status === "blocked").length,
    inFlightActions: actions.filter((action) => action.status === "in_progress").length,
  };

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={Target}
        title="Metas, acciones y seguimiento"
        subtitle="Definición, progreso, acciones correctivas/preventivas y observaciones por meta."
        breadcrumb={["Control", "Metas"]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => openActionModal()} style={btnGhost} disabled={saving}>
              <ListChecks size={14} /> Nueva acción
            </button>
            <button onClick={() => openGoalModal()} style={btnPrimary} disabled={saving}>
              <Plus size={14} /> Nueva meta
            </button>
          </div>
        }
      />

      {error && (
        <div style={noticeStyle}>
          <span>{error}</span>
          <button type="button" onClick={loadData} style={noticeButtonStyle}>Reintentar</button>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
        <MiniStat icon={Target} label="Metas activas" value={stats.activeGoals} color="#16A34A" />
        <MiniStat icon={ShieldAlert} label="Metas en riesgo" value={stats.atRiskGoals} color="#CA8A04" />
        <MiniStat icon={ListChecks} label="Acciones totales" value={stats.totalActions} color="#2563EB" />
        <MiniStat icon={CheckCircle2} label="Pendientes o bloqueadas" value={stats.pendingActions} color="#DC2626" />
        <MiniStat icon={Activity} label="Acciones en progreso" value={stats.inFlightActions} color="#7C3AED" />
      </div>

      {!rows.length ? (
        <div style={emptyStateStyle}>Aún no hay metas registradas.</div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {rows.map((target) => (
            <GoalCard
              key={target.id}
              target={target}
              areaLabel={areaLabel(target.areaId)}
              actions={actions.filter((action) => action.targetId === target.id)}
              onClick={() => setSelectedId(target.id)}
            />
          ))}
        </div>
      )}

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelectedId("")}
        title={selected?.title || ""}
        subtitle={selected ? `${scopeLabel(selected.scope)} · ${areaLabel(selected.areaId)} · ${selected.createdBy || creatorName}` : ""}
        badge={selected && <AdminStatusBadge variant={STATUS[selected.summary.state]?.variant || STATUS[selected.status]?.variant} label={STATUS[selected.summary.state]?.label || STATUS[selected.status]?.label} />}
        actions={selected && (
          <>
            <button onClick={() => openActionModal(selected)} style={btnGhost}>
              <Plus size={13} /> Nueva acción
            </button>
            <button onClick={() => setConfirmDelete(selected)} style={btnDangerGhost}>
              <Trash2 size={13} /> Eliminar
            </button>
            <button onClick={() => togglePause(selected)} style={btnGhost}>
              {selected.status === "paused" ? <><Play size={13} /> Reactivar</> : <><Pause size={13} /> Pausar</>}
            </button>
            <button onClick={() => openGoalModal(selected)} style={btnPrimary}>
              <Edit3 size={13} /> Editar
            </button>
          </>
        )}
        width={540}
      >
        {selected && (
          <>
            {selected.description && <DrawerField label="Descripción">{selected.description}</DrawerField>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Objetivo" mono>
                {selected.type === "reduction_percent" ? `${fmt(selected.targetValue, 1)}%` : `${fmt(selected.targetValue, 3)} tCO2e`}
              </DrawerField>
              <DrawerField label="Plazo" mono>{selected.targetEnd || "No disponible"}</DrawerField>
              <DrawerField label="Línea base" mono>{fmt(selected.summary.baseline, 3)} tCO2e</DrawerField>
              <DrawerField label="Actual" mono>{fmt(selected.summary.actual, 3)} tCO2e</DrawerField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <SummaryPill label="Acciones vinculadas" value={actions.filter((action) => action.targetId === selected.id).length} color="#2563EB" />
              <SummaryPill label="En progreso" value={actions.filter((action) => action.targetId === selected.id && action.status === "in_progress").length} color="#16A34A" />
              <SummaryPill label="Bloqueadas" value={actions.filter((action) => action.targetId === selected.id && action.status === "blocked").length} color="#CA8A04" />
            </div>

            <DrawerField label="Área">{areaLabel(selected.areaId)}</DrawerField>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)" }}>Progreso</span>
                <span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-600)" }}>
                  {fmt(selected.summary.progressPct, 1)}%
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 6, background: "var(--eco-card-muted)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, selected.summary.progressPct)}%`,
                    background: selected.summary.state === "at_risk" ? "var(--eco-warning, #CA8A04)" : "var(--eco-primary-500, #22C55E)",
                    transition: "width .3s",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>
                <MessageSquare size={13} /> Observaciones
              </div>
              <div style={notesBoxStyle}>{selected.description || "Sin observaciones registradas."}</div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Acciones vinculadas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actions.filter((action) => action.targetId === selected.id).map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    onStatusChange={(nextStatus) => updateActionStatus(action, nextStatus)}
                    onEdit={() => openActionModal(action)}
                    onDelete={() => setConfirmDeleteAction(action)}
                  />
                ))}
                {actions.filter((action) => action.targetId === selected.id).length === 0 && (
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin acciones vinculadas.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <Accions_Goals_Edits
        mode={targetModalOpen ? "target" : actionModalOpen ? "action" : ""}
        editing={targetModalOpen ? !!editingTarget : !!editingAction}
        onClose={() => {
          setTargetModalOpen(false);
          setActionModalOpen(false);
          setEditingTarget(null);
          setEditingAction(null);
        }}
        onSubmit={targetModalOpen ? handleGoalSave : handleActionSave}
        targetForm={targetForm}
        setTargetForm={setTargetForm}
        actionForm={actionForm}
        setActionForm={setActionForm}
        areas={catalogOptions.areas}
        targets={targets}
        targetOptions={catalogOptions}
        creatorName={creatorName}
      />

      <AdminConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar meta"
        message={`¿Seguro que quieres eliminar "${confirmDelete?.title}"? Se perderán sus acciones vinculadas.`}
        confirmLabel="Eliminar"
        danger
      />

      <AdminConfirmDialog
        open={!!confirmDeleteAction}
        onClose={() => setConfirmDeleteAction(null)}
        onConfirm={handleActionDelete}
        title="Eliminar acción"
        message={`¿Seguro que quieres eliminar "${confirmDeleteAction?.title}"?`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--eco-primary-500, #22C55E)",
  color: "#fff",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDangerGhost = {
  ...btnGhost,
  border: "1px solid rgba(239,68,68,.25)",
  background: "rgba(239,68,68,.08)",
  color: "var(--eco-danger, #DC2626)",
};

const noticeStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  marginBottom: 14,
  borderRadius: 8,
  border: "1px solid rgba(202,138,4,.3)",
  background: "rgba(202,138,4,.08)",
  color: "var(--eco-warning, #CA8A04)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 600,
};

const noticeButtonStyle = {
  ...btnGhost,
  height: 30,
  padding: "0 10px",
  fontSize: 12,
};

const emptyStateStyle = {
  padding: "34px 20px",
  border: "1px solid var(--eco-border)",
  borderRadius: 12,
  background: "var(--eco-card)",
  color: "var(--eco-text-soft)",
  fontFamily: fb,
  fontSize: 13,
  textAlign: "center",
};

const sectionTitleStyle = {
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
};

const notesBoxStyle = {
  padding: "10px 14px",
  background: "var(--eco-card-muted)",
  border: "1px solid var(--eco-border)",
  borderRadius: 8,
  fontFamily: fb,
  fontSize: 12.5,
  color: "var(--eco-text)",
  lineHeight: 1.5,
};

const iconBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-text-soft)",
  cursor: "pointer",
};

const actionSelectStyle = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 11.5,
};

function GoalCard({ target, actions, areaLabel, onClick }) {
  const statusColor = target.summary.state === "at_risk" ? "#CA8A04"
    : target.summary.state === "completed" ? "#16A34A"
    : target.status === "paused" ? "#64748B"
    : "#2563EB";
  const openActions = actions.filter((action) => action.status === "planned" || action.status === "in_progress" || action.status === "blocked").length;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "18px 20px",
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 14,
        cursor: "pointer",
        opacity: target.status === "paused" ? 0.7 : 1,
        transition: "all .15s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = "var(--eco-primary-400)";
        event.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)", marginBottom: 4 }}>
            {target.title}
          </div>
          <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
            {scopeLabel(target.scope)} · {areaLabel}
          </div>
        </div>
        <AdminStatusBadge variant={STATUS[target.summary.state]?.variant || STATUS[target.status]?.variant} label={STATUS[target.summary.state]?.label || STATUS[target.status]?.label} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>Progreso</span>
          <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: statusColor }}>{fmt(target.summary.progressPct, 1)}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: "var(--eco-card-muted)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, target.summary.progressPct)}%`, background: statusColor, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--eco-border)", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
        <span>Objetivo: <strong style={{ color: "var(--eco-text)" }}>{target.type === "reduction_percent" ? `${fmt(target.targetValue, 1)}%` : `${fmt(target.targetValue, 2)} tCO2e`}</strong></span>
        <span>Plazo: <strong style={{ color: "var(--eco-text)" }}>{target.targetEnd || "-"}</strong></span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <CardChip label={`${actions.length} acciones`} color="#2563EB" />
        <CardChip label={`${openActions} abiertas`} color={openActions > 0 ? "#CA8A04" : "#16A34A"} />
      </div>
    </div>
  );
}

function ActionRow({ action, onStatusChange, onEdit, onDelete }) {
  const status = ACTION_STATUS[action.status] || ACTION_STATUS.planned;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--eco-card-muted)", border: "1px solid var(--eco-border)", borderRadius: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600, color: "var(--eco-text)" }}>{action.title}</div>
        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>
          {action.owner || "Sin responsable"} · vence {action.endDate || "sin fecha"} · {status.label}
        </div>
      </div>
      <span style={{ fontFamily: fm, fontSize: 11, fontWeight: 600, color: "var(--eco-primary-600)" }}>
        {fmt(action.impact_tco2e, 3)} tCO2e
      </span>
      <select value={action.status} onChange={(event) => onStatusChange(event.target.value)} style={actionSelectStyle}>
        {Object.entries(ACTION_STATUS).map(([value, meta]) => (
          <option key={value} value={value}>{meta.label}</option>
        ))}
      </select>
      <button onClick={onEdit} style={iconBtn} type="button" aria-label="Editar acción">
        <Edit3 size={12} />
      </button>
      <button onClick={onDelete} style={{ ...iconBtn, color: "var(--eco-danger, #DC2626)" }} type="button" aria-label="Eliminar acción">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--eco-card, #fff)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: fd, fontSize: 21, fontWeight: 800, color: "var(--eco-text)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, color }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${color}22`, background: `${color}10` }}>
      <div style={{ fontFamily: fb, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color }}>{label}</div>
      <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function CardChip({ label, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, background: `${color}12`, color, fontFamily: fb, fontSize: 10.5, fontWeight: 700 }}>
      {label}
    </span>
  );
}
