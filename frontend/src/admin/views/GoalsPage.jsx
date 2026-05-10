import React from "react";
import {
  Target, Plus, Edit3, Pause, Play, Trash2, MessageSquare, Link2,
  ShieldAlert, ShieldCheck, CheckCircle2, ListChecks, CalendarClock, Activity,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import Accions_Goals_Edits from "../../components/Accions_Goals_Edits";
import { goals as mockGoals, goalActions, records } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS = {
  in_progress: { variant: "info",    label: "En curso"  },
  at_risk:     { variant: "warning", label: "En riesgo" },
  completed:   { variant: "success", label: "Cumplida"  },
  delayed:     { variant: "error",   label: "Atrasada"  },
  paused:      { variant: "neutral", label: "Pausada"   },
};

const ACTION_STATUS = {
  pending:     { color: "#64748B", label: "Pendiente" },
  in_progress: { color: "#2563EB", label: "En curso"  },
  completed:   { color: "#16A34A", label: "Hecha"     },
  at_risk:     { color: "#CA8A04", label: "En riesgo" },
};

const ACTION_KIND = {
  preventive: { color: "#16A34A", label: "Preventiva", icon: ShieldCheck },
  corrective: { color: "#CA8A04", label: "Correctiva", icon: ShieldAlert },
};

const EMPTY_GOAL = {
  name: "", scope: 1, target: -10, baseline: 0, current: 0, unit: "tCO2e",
  progress: 0, status: "in_progress", deadline: "", responsible: "",
  areas: [], description: "", notes: "", linkedRecords: [],
  objectiveType: "reduction_pct",
  category: "all",
  applicationArea: "all",
  baselineStart: "",
  baselineEnd: "",
  targetStart: "",
  targetEnd: "",
};

const EMPTY_ACTION = {
  goalId: "",
  title: "",
  kind: "preventive",
  status: "pending",
  startDate: "",
  due: "",
  responsible: "",
  impact: "",
  evidence: "",
  notes: "",
};

const ADMIN_CREATOR_NAME = "Admin CarbonTrack Demo";

function buildTargetForm(overrides) {
  return {
    id: "",
    title: "",
    scope: "all",
    category: "",
    areaId: "",
    type: "",
    baselineStart: "",
    baselineEnd: "",
    baselineValue: "",
    targetStart: "",
    targetEnd: "",
    targetValue: "",
    description: "",
    status: "",
    createdBy: ADMIN_CREATOR_NAME,
    createdById: "admin-panel",
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

function collectAreaOptions(goals) {
  return Array.from(new Set(goals.flatMap(goal => goal.areas || []))).sort().map(area => ({
    value: area,
    label: area,
  }));
}

function categoryFromScope(scope) {
  if (scope === 2) return "electricidad";
  if (scope === 1) return "combustible";
  if (scope === 3) return "otros";
  return "all";
}

function scopeFromCategory(category) {
  if (category === "electricidad") return 2;
  if (category === "combustible") return 1;
  if (category === "otros") return 3;
  return 0;
}

function targetStatusFromGoalStatus(status) {
  if (status === "paused") return "paused";
  if (status === "completed") return "completed";
  return "active";
}

function goalStatusFromTargetStatus(status, previousStatus) {
  if (status === "paused") return "paused";
  if (status === "completed") return "completed";
  if (previousStatus === "at_risk" || previousStatus === "delayed") return previousStatus;
  return "in_progress";
}

function actionStatusToForm(status) {
  if (status === "completed") return "done";
  if (status === "at_risk") return "blocked";
  if (status === "in_progress") return "in_progress";
  return "planned";
}

function actionStatusFromForm(status) {
  if (status === "done") return "completed";
  if (status === "blocked") return "at_risk";
  if (status === "in_progress") return "in_progress";
  return "pending";
}

function computeProgress({ baseline, current, targetValue, type }) {
  if (!(baseline > 0) || !(targetValue > 0)) return 0;
  const reduction = Math.max(0, baseline - current);
  const targetReduction = type === "absolute"
    ? targetValue
    : baseline * (targetValue / 100);
  if (!(targetReduction > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((reduction / targetReduction) * 100)));
}

function normalizeGoal(goal) {
  return {
    ...goal,
    title: goal.title || goal.name,
    objectiveType: goal.objectiveType || "reduction_pct",
    category: goal.category || categoryFromScope(goal.scope),
    applicationArea: goal.applicationArea || (goal.areas?.[0] || "all"),
    baselineStart: goal.baselineStart || "",
    baselineEnd: goal.baselineEnd || "",
    targetStart: goal.targetStart || "",
    targetEnd: goal.targetEnd || goal.deadline || "",
    createdBy: goal.createdBy || ADMIN_CREATOR_NAME,
    createdById: goal.createdById || "admin-panel",
  };
}

function normalizeAction(action) {
  return {
    ...action,
    startDate: action.startDate || "",
    due: action.due || action.endDate || "",
    endDate: action.endDate || action.due || "",
    responsible: action.responsible || action.owner || "",
    impact: action.impact || "",
    evidence: action.evidence || "",
    notes: action.notes || "",
  };
}

function goalToTargetForm(goal) {
  return buildTargetForm({
    id: goal.id,
    title: goal.name,
    scope: goal.scope === 0 ? "all" : `scope${goal.scope}`,
    category: goal.category || categoryFromScope(goal.scope),
    areaId: goal.applicationArea || goal.areas?.[0] || "all",
    type: goal.objectiveType === "absolute" ? "absolute" : "reduction_percent",
    baselineStart: goal.baselineStart || "",
    baselineEnd: goal.baselineEnd || "",
    baselineValue: String(goal.baseline ?? ""),
    targetStart: goal.targetStart || "",
    targetEnd: goal.targetEnd || goal.deadline || "",
    targetValue: String(Math.abs(goal.target ?? "")),
    description: goal.description || goal.notes || "",
    status: targetStatusFromGoalStatus(goal.status),
    createdBy: goal.createdBy || ADMIN_CREATOR_NAME,
    createdById: goal.createdById || "admin-panel",
  });
}

function actionToActionForm(action) {
  return buildActionForm({
    id: action.id,
    targetId: action.goalId,
    title: action.title,
    owner: action.responsible || "",
    status: actionStatusToForm(action.status),
    startDate: action.startDate || "",
    endDate: action.endDate || action.due || "",
    impact_tco2e: String(parseFloat(String(action.impact || "").replace(/[^\d.-]/g, "")) || ""),
    evidence: action.evidence || "",
    notes: action.notes || "",
  });
}

export default function GoalsPage() {
  const [goals, setGoals] = React.useState(mockGoals.map(normalizeGoal));
  const [actions, setActions] = React.useState(goalActions.map(normalizeAction));
  const [selected, setSelected] = React.useState(null);
  const [modalGoal, setModalGoal] = React.useState(null);
  const [modalAction, setModalAction] = React.useState(null);
  const [editingGoal, setEditingGoal] = React.useState(false);
  const [targetForm, setTargetForm] = React.useState(() => buildTargetForm());
  const [actionForm, setActionForm] = React.useState(() => buildActionForm());
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [confirmDeleteAction, setConfirmDeleteAction] = React.useState(null);

  function handleGoalSave(event) {
    event.preventDefault();
    if (!targetForm.title.trim() || !targetForm.type || !targetForm.category || !targetForm.areaId || !targetForm.status) return;
    const baseline = Number(targetForm.baselineValue || 0);
    const currentGoal = goals.find(goal => goal.id === targetForm.id);
    const targetValue = Number(targetForm.targetValue || 0);
    const current = currentGoal?.current ?? baseline;
    const nextGoal = normalizeGoal({
      ...currentGoal,
      id: targetForm.id || `g${goals.length + 1}`,
      name: targetForm.title,
      title: targetForm.title,
      scope: scopeFromCategory(targetForm.category),
      target: targetForm.type === "absolute" ? -targetValue : -targetValue,
      baseline,
      current,
      unit: "tCO2e",
      progress: computeProgress({ baseline, current, targetValue, type: targetForm.type }),
      status: goalStatusFromTargetStatus(targetForm.status, currentGoal?.status),
      deadline: targetForm.targetEnd,
      responsible: currentGoal?.responsible || targetForm.createdBy || ADMIN_CREATOR_NAME,
      areas: targetForm.areaId === "all" ? ["Todas las áreas"] : [targetForm.areaId],
      description: targetForm.description,
      notes: currentGoal?.notes || "",
      linkedRecords: currentGoal?.linkedRecords || [],
      objectiveType: targetForm.type === "absolute" ? "absolute" : "reduction_pct",
      category: targetForm.category,
      applicationArea: targetForm.areaId,
      baselineStart: targetForm.baselineStart,
      baselineEnd: targetForm.baselineEnd,
      targetStart: targetForm.targetStart,
      targetEnd: targetForm.targetEnd,
      createdBy: targetForm.createdBy || ADMIN_CREATOR_NAME,
      createdById: targetForm.createdById || "admin-panel",
    });

    setGoals(prev => currentGoal
      ? prev.map(goal => goal.id === nextGoal.id ? nextGoal : goal)
      : [...prev, nextGoal]);
    setModalGoal(null);
  }

  function handleActionSave(event) {
    event.preventDefault();
    if (!actionForm.targetId || !actionForm.title.trim() || !actionForm.status) return;
    const existing = actions.find(action => action.id === actionForm.id);
    const impactValue = Number(actionForm.impact_tco2e || 0);
    const nextAction = normalizeAction({
      ...existing,
      id: actionForm.id || `ga${actions.length + 1}`,
      goalId: actionForm.targetId,
      title: actionForm.title,
      kind: existing?.kind || "preventive",
      status: actionStatusFromForm(actionForm.status),
      startDate: actionForm.startDate,
      due: actionForm.endDate,
      endDate: actionForm.endDate,
      responsible: actionForm.owner,
      impact: impactValue ? `-${impactValue} tCO2e` : "",
      evidence: actionForm.evidence,
      notes: actionForm.notes,
    });
    setActions(prev => existing
      ? prev.map(action => action.id === nextAction.id ? nextAction : action)
      : [...prev, nextAction]);
    setModalAction(null);
  }

  function togglePause(goal) {
    const newStatus = goal.status === "paused" ? "in_progress" : "paused";
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g));
    setSelected(s => s && s.id === goal.id ? { ...s, status: newStatus } : s);
  }

  function handleDelete() {
    setGoals(prev => prev.filter(g => g.id !== confirmDelete.id));
    setActions(prev => prev.filter(action => action.goalId !== confirmDelete.id));
    setSelected(null);
    setConfirmDelete(null);
  }

  function handleActionDelete() {
    setActions(prev => prev.filter(action => action.id !== confirmDeleteAction.id));
    setConfirmDeleteAction(null);
  }

  function openGoalModal(goal = null) {
    setEditingGoal(!!goal);
    setTargetForm(goal ? goalToTargetForm(goal) : buildTargetForm());
    setModalGoal(goal || EMPTY_GOAL);
  }

  function openActionModal(goalOrAction) {
    if (goalOrAction?.goalId) {
      setActionForm(actionToActionForm(goalOrAction));
      setModalAction(goalOrAction);
      return;
    }
    const goalId = goalOrAction?.id || selected?.id || goals[0]?.id || "";
    const owner = goalOrAction?.responsible || selected?.responsible || "";
    setActionForm(buildActionForm({ targetId: "", owner }));
    setModalAction({ ...EMPTY_ACTION, goalId, responsible: owner });
  }

  function updateActionStatus(action, nextStatus) {
    setActions(prev => prev.map(item => item.id === action.id ? { ...item, status: nextStatus } : item));
  }

  function complianceFor(goal) {
    if (goal.status === "completed") return { color: "#16A34A", label: "Meta cumplida" };
    if (goal.status === "delayed")   return { color: "#DC2626", label: "Incumplimiento declarado" };
    if (goal.status === "at_risk")   return { color: "#CA8A04", label: "En riesgo de incumplir" };
    if (goal.status === "paused")    return { color: "#64748B", label: "Seguimiento pausado" };
    if (goal.progress >= 75) return { color: "#16A34A", label: "En línea con el plan" };
    if (goal.progress >= 40) return { color: "#2563EB", label: "Avance moderado" };
    return { color: "#CA8A04", label: "Avance inicial" };
  }

  const stats = {
    totalGoals: goals.length,
    activeGoals: goals.filter(goal => goal.status !== "paused").length,
    atRiskGoals: goals.filter(goal => goal.status === "at_risk" || goal.status === "delayed").length,
    totalActions: actions.length,
    pendingActions: actions.filter(action => action.status === "pending" || action.status === "at_risk").length,
    inFlightActions: actions.filter(action => action.status === "in_progress").length,
  };

  const areaOptions = collectAreaOptions(goals).map(option => option.label);
  const targetOptions = goals.map(goal => ({ id: goal.id, title: goal.name }));

  return (
    <div>
      <AdminPageHeader
        icon={Target}
        title="Metas, acciones y seguimiento"
        subtitle="Definición, progreso, acciones correctivas/preventivas y observaciones por meta."
        breadcrumb={["Control", "Metas"]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => openActionModal(selected)} style={btnGhost}>
              <ListChecks size={14} /> Nueva acción
            </button>
            <button onClick={() => openGoalModal()} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "var(--eco-primary-500, #22C55E)", color: "#fff",
              fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}>
              <Plus size={14} /> Nueva meta
            </button>
          </div>
        }
      />

      <div style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        marginBottom: 16,
      }}>
        <MiniStat icon={Target} label="Metas activas" value={stats.activeGoals} color="#16A34A" />
        <MiniStat icon={ShieldAlert} label="Metas en riesgo" value={stats.atRiskGoals} color="#CA8A04" />
        <MiniStat icon={ListChecks} label="Acciones totales" value={stats.totalActions} color="#2563EB" />
        <MiniStat icon={CalendarClock} label="Pendientes o en riesgo" value={stats.pendingActions} color="#DC2626" />
        <MiniStat icon={Activity} label="Acciones en curso" value={stats.inFlightActions} color="#7C3AED" />
      </div>

      <div style={{
        display: "grid", gap: 14,
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      }}>
        {goals.map(g => (
          <GoalCard
            key={g.id}
            goal={g}
            actions={actions.filter(action => action.goalId === g.id)}
            onClick={() => setSelected(g)}
          />
        ))}
      </div>

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={`Scope ${selected?.scope} · ${selected?.responsible}`}
        badge={selected && <AdminStatusBadge variant={STATUS[selected.status]?.variant} label={STATUS[selected.status]?.label} />}
        actions={selected && (
          <>
            <button onClick={() => openActionModal(selected)} style={btnGhost}>
              <Plus size={13} /> Nueva acción
            </button>
            <button onClick={() => setConfirmDelete(selected)} style={btnDangerGhost}>
              <Trash2 size={13} /> Eliminar
            </button>
            <button onClick={() => togglePause(selected)} style={btnGhost}>
              {selected.status === "paused"
                ? <><Play size={13} /> Reactivar</>
                : <><Pause size={13} /> Pausar</>}
            </button>
            <button onClick={() => { openGoalModal(selected); setSelected(null); }} style={btnPrimary}>
              <Edit3 size={13} /> Editar
            </button>
          </>
        )}
        width={540}
      >
        {selected && (
          <>
            {selected.description && <DrawerField label="Descripción">{selected.description}</DrawerField>}

            {/* Compliance */}
            {(() => {
              const c = complianceFor(selected);
              return (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: `${c.color}10`,
                  border: `1px solid ${c.color}33`,
                  borderRadius: 10,
                }}>
                  <CheckCircle2 size={16} color={c.color} />
                  <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 700, color: c.color }}>
                    {c.label}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Objetivo" mono>{selected.target}%</DrawerField>
              <DrawerField label="Plazo" mono>{selected.deadline}</DrawerField>
              <DrawerField label="Línea base" mono>{selected.baseline.toLocaleString()} {selected.unit}</DrawerField>
              <DrawerField label="Actual" mono>{selected.current.toLocaleString()} {selected.unit}</DrawerField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <SummaryPill label="Acciones vinculadas" value={actions.filter(a => a.goalId === selected.id).length} color="#2563EB" />
              <SummaryPill label="En curso" value={actions.filter(a => a.goalId === selected.id && a.status === "in_progress").length} color="#16A34A" />
              <SummaryPill label="Con seguimiento" value={actions.filter(a => a.goalId === selected.id && (a.status === "pending" || a.status === "at_risk")).length} color="#CA8A04" />
            </div>
            <DrawerField label="Áreas">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {selected.areas.map((a, i) => (
                  <span key={i} style={{
                    fontFamily: fb, fontSize: 11, fontWeight: 500,
                    padding: "2px 9px", borderRadius: 12,
                    background: "var(--eco-card-muted)", color: "var(--eco-text-soft)",
                  }}>{a}</span>
                ))}
              </div>
            </DrawerField>

            {/* Progress visual */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)" }}>Progreso</span>
                <span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-600)" }}>
                  {selected.progress}%
                </span>
              </div>
              <div style={{
                height: 10, borderRadius: 6,
                background: "var(--eco-card-muted)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${selected.progress}%`,
                  background: selected.status === "at_risk"
                    ? "var(--eco-warning, #CA8A04)"
                    : selected.status === "paused"
                    ? "var(--eco-gray-300, #CBD5E1)"
                    : "var(--eco-primary-500, #22C55E)",
                  transition: "width .3s",
                }} />
              </div>
            </div>

            {/* Notes / observations */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)",
              }}>
                <MessageSquare size={13} /> Observaciones
              </div>
              {selected.notes ? (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--eco-card-muted)",
                  border: "1px solid var(--eco-border)",
                  borderRadius: 8,
                  fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)",
                  lineHeight: 1.5,
                }}>
                  {selected.notes}
                </div>
              ) : (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin observaciones registradas.
                </div>
              )}
            </div>

            {/* Linked records */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)",
              }}>
                <Link2 size={13} /> Registros vinculados ({(selected.linkedRecords || []).length})
              </div>
              {(selected.linkedRecords || []).length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin registros vinculados.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selected.linkedRecords.map(rid => {
                    const rec = records.find(r => r.id === rid);
                    if (!rec) return null;
                    return (
                      <div key={rid} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px",
                        background: "var(--eco-card-muted)",
                        border: "1px solid var(--eco-border)",
                        borderRadius: 8,
                      }}>
                        <span style={{
                          fontFamily: fm, fontSize: 10.5, fontWeight: 700,
                          padding: "2px 7px", borderRadius: 6,
                          background: "var(--eco-card)",
                          color: "var(--eco-text-soft)",
                        }}>{rid}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text)" }}>
                            {rec.consumptionType} · {rec.areaName}
                          </div>
                          <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 2 }}>
                            {rec.value.toLocaleString()} {rec.unit} · {rec.emissions.toFixed(2)} kgCO2e · {rec.date}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Linked actions */}
            <div>
              <div style={{
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)", marginBottom: 10,
              }}>
                Acciones vinculadas
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actions.filter(a => a.goalId === selected.id).map(a => {
                  const kind = ACTION_KIND[a.kind] || ACTION_KIND.preventive;
                  const KindIcon = kind.icon;
                  return (
                    <div key={a.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px",
                      background: "var(--eco-card-muted)",
                      border: "1px solid var(--eco-border)",
                      borderRadius: 10,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: ACTION_STATUS[a.status]?.color, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600, color: "var(--eco-text)" }}>
                            {a.title}
                          </span>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            fontFamily: fb, fontSize: 10, fontWeight: 700,
                            padding: "2px 7px", borderRadius: 10,
                            background: `${kind.color}18`, color: kind.color,
                          }}>
                            <KindIcon size={9} /> {kind.label}
                          </span>
                        </div>
                        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>
                          {a.responsible} · vence {a.due} · {ACTION_STATUS[a.status]?.label}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: fm, fontSize: 11, fontWeight: 600, color: "var(--eco-primary-600)" }}>
                          {a.impact}
                        </span>
                        <select
                          value={a.status}
                          onChange={e => updateActionStatus(a, e.target.value)}
                          style={actionSelectStyle}
                        >
                          {Object.entries(ACTION_STATUS).map(([value, meta]) => (
                            <option key={value} value={value}>{meta.label}</option>
                          ))}
                        </select>
                        <button onClick={() => openActionModal(a)} style={iconBtn}>
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => setConfirmDeleteAction(a)} style={{ ...iconBtn, color: "var(--eco-danger, #DC2626)" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {actions.filter(a => a.goalId === selected.id).length === 0 && (
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
        mode={modalGoal ? "target" : modalAction ? "action" : ""}
        editing={modalGoal ? editingGoal : !!modalAction?.id}
        onClose={() => {
          setModalGoal(null);
          setModalAction(null);
        }}
        onSubmit={modalGoal ? handleGoalSave : handleActionSave}
        targetForm={targetForm}
        setTargetForm={setTargetForm}
        actionForm={actionForm}
        setActionForm={setActionForm}
        areas={areaOptions}
        targets={targetOptions}
        creatorName={ADMIN_CREATOR_NAME}
      />

      <AdminConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar meta"
        message={`¿Seguro que quieres eliminar "${confirmDelete?.name}"? Se perderán sus acciones y observaciones.`}
        confirmLabel="Eliminar"
        danger
      />

      <AdminConfirmDialog
        open={!!confirmDeleteAction}
        onClose={() => setConfirmDeleteAction(null)}
        onConfirm={handleActionDelete}
        title="Eliminar acción"
        message={`¿Seguro que quieres eliminar "${confirmDeleteAction?.title}"? Esta acción se quitará del seguimiento de la meta.`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
  fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)", color: "var(--eco-text)",
  fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};
const btnDangerGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid rgba(239,68,68,.25)",
  background: "rgba(239,68,68,.08)", color: "var(--eco-danger, #DC2626)",
  fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
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

function GoalCard({ goal, actions, onClick }) {
  const statusColor = goal.status === "at_risk" ? "#CA8A04"
    : goal.status === "completed" ? "#16A34A"
    : goal.status === "delayed" ? "#DC2626"
    : goal.status === "paused" ? "#64748B"
    : "#2563EB";
  const paused = goal.status === "paused";
  const openActions = actions.filter(action => action.status === "pending" || action.status === "in_progress" || action.status === "at_risk").length;
  return (
    <div onClick={onClick} style={{
      padding: "18px 20px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 14,
      cursor: "pointer",
      opacity: paused ? 0.7 : 1,
      transition: "all .15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--eco-primary-400)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)", marginBottom: 4 }}>
            {goal.name}
          </div>
          <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
            Scope {goal.scope} · {goal.responsible}
          </div>
        </div>
        <AdminStatusBadge variant={STATUS[goal.status]?.variant} label={STATUS[goal.status]?.label} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>Progreso</span>
          <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: statusColor }}>{goal.progress}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: "var(--eco-card-muted)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${goal.progress}%`, background: statusColor, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 14,
        paddingTop: 12, borderTop: "1px dashed var(--eco-border)",
        fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)",
      }}>
        <span>Objetivo: <strong style={{ color: "var(--eco-text)" }}>{goal.target}%</strong></span>
        <span>Plazo: <strong style={{ color: "var(--eco-text)" }}>{goal.deadline}</strong></span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <CardChip label={`${actions.length} acciones`} color="#2563EB" />
        <CardChip label={`${openActions} abiertas`} color={openActions > 0 ? "#CA8A04" : "#16A34A"} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: `${color}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
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
    <div style={{
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${color}22`,
      background: `${color}10`,
    }}>
      <div style={{ fontFamily: fb, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color }}>
        {label}
      </div>
      <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function CardChip({ label, color }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 9px",
      borderRadius: 999,
      background: `${color}12`,
      color,
      fontFamily: fb,
      fontSize: 10.5,
      fontWeight: 700,
    }}>
      {label}
    </span>
  );
}
