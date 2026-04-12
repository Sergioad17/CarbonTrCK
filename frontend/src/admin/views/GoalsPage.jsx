import React from "react";
import {
  Target, Plus, Edit3, Pause, Play, Trash2, MessageSquare, Link2,
  ShieldAlert, ShieldCheck, CheckCircle2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFormModal from "../components/AdminFormModal";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import { AdminTextField, AdminSelectField, AdminNumberField } from "../components/AdminFormSection";
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
  name: "", scope: 1, target: -10, baseline: 0, current: 0, unit: "kgCO2e",
  progress: 0, status: "in_progress", deadline: "", responsible: "",
  areas: [], description: "", notes: "", linkedRecords: [],
};

export default function GoalsPage() {
  const [goals, setGoals] = React.useState(mockGoals);
  const [selected, setSelected] = React.useState(null);
  const [modalGoal, setModalGoal] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setGoals(prev => modalGoal.id
        ? prev.map(g => g.id === modalGoal.id ? { ...modalGoal } : g)
        : [...prev, { ...modalGoal, id: "g" + (prev.length + 1) }]);
      setSaving(false);
      setModalGoal(null);
    }, 350);
  }

  function togglePause(goal) {
    const newStatus = goal.status === "paused" ? "in_progress" : "paused";
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g));
    setSelected(s => s && s.id === goal.id ? { ...s, status: newStatus } : s);
  }

  function handleDelete() {
    setGoals(prev => prev.filter(g => g.id !== confirmDelete.id));
    setSelected(null);
    setConfirmDelete(null);
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

  return (
    <div>
      <AdminPageHeader
        icon={Target}
        title="Metas, acciones y seguimiento"
        subtitle="Definición, progreso, acciones correctivas/preventivas y observaciones por meta."
        breadcrumb={["Control", "Metas"]}
        actions={
          <button onClick={() => setModalGoal({ ...EMPTY_GOAL })} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--eco-primary-500, #22C55E)", color: "#fff",
            fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(34,197,94,.25)",
          }}>
            <Plus size={14} /> Nueva meta
          </button>
        }
      />

      <div style={{
        display: "grid", gap: 14,
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      }}>
        {goals.map(g => (
          <GoalCard key={g.id} goal={g} onClick={() => setSelected(g)} />
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
            <button onClick={() => setConfirmDelete(selected)} style={btnDangerGhost}>
              <Trash2 size={13} /> Eliminar
            </button>
            <button onClick={() => togglePause(selected)} style={btnGhost}>
              {selected.status === "paused"
                ? <><Play size={13} /> Reactivar</>
                : <><Pause size={13} /> Pausar</>}
            </button>
            <button onClick={() => { setModalGoal({ ...selected }); setSelected(null); }} style={btnPrimary}>
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
                {goalActions.filter(a => a.goalId === selected.id).map(a => {
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
                      <span style={{ fontFamily: fm, fontSize: 11, fontWeight: 600, color: "var(--eco-primary-600)" }}>
                        {a.impact}
                      </span>
                    </div>
                  );
                })}
                {goalActions.filter(a => a.goalId === selected.id).length === 0 && (
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin acciones vinculadas.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <AdminFormModal
        open={!!modalGoal}
        onClose={() => setModalGoal(null)}
        title={modalGoal?.id ? "Editar meta" : "Nueva meta"}
        onSave={handleSave}
        saving={saving}
        width={620}
      >
        {modalGoal && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Nombre" required value={modalGoal.name}
                onChange={v => setModalGoal(p => ({ ...p, name: v }))} />
            </div>
            <AdminSelectField label="Scope" value={modalGoal.scope}
              onChange={v => setModalGoal(p => ({ ...p, scope: Number(v) }))}
              options={[{value:0,label:"Todos"},{value:1,label:"Scope 1"},{value:2,label:"Scope 2"},{value:3,label:"Scope 3"}]} />
            <AdminSelectField label="Estado" value={modalGoal.status}
              onChange={v => setModalGoal(p => ({ ...p, status: v }))}
              options={[
                {value:"in_progress",label:"En curso"},
                {value:"at_risk",label:"En riesgo"},
                {value:"completed",label:"Cumplida"},
                {value:"delayed",label:"Atrasada"},
                {value:"paused",label:"Pausada"},
              ]} />
            <AdminNumberField label="Objetivo (%)" value={modalGoal.target} step={1}
              onChange={v => setModalGoal(p => ({ ...p, target: v }))} />
            <AdminTextField label="Plazo" type="date" value={modalGoal.deadline}
              onChange={v => setModalGoal(p => ({ ...p, deadline: v }))} />
            <AdminNumberField label="Línea base" value={modalGoal.baseline} unit={modalGoal.unit}
              onChange={v => setModalGoal(p => ({ ...p, baseline: v }))} />
            <AdminNumberField label="Actual" value={modalGoal.current} unit={modalGoal.unit}
              onChange={v => setModalGoal(p => ({ ...p, current: v }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Responsable" value={modalGoal.responsible}
                onChange={v => setModalGoal(p => ({ ...p, responsible: v }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Descripción" multiline rows={3} value={modalGoal.description}
                onChange={v => setModalGoal(p => ({ ...p, description: v }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField
                label="Observaciones"
                multiline
                rows={3}
                value={modalGoal.notes}
                onChange={v => setModalGoal(p => ({ ...p, notes: v }))}
                placeholder="Comentarios internos, contexto o seguimiento de la meta."
              />
            </div>
          </div>
        )}
      </AdminFormModal>

      <AdminConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar meta"
        message={`¿Seguro que quieres eliminar "${confirmDelete?.name}"? Se perderán sus acciones y observaciones.`}
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

function GoalCard({ goal, onClick }) {
  const statusColor = goal.status === "at_risk" ? "#CA8A04"
    : goal.status === "completed" ? "#16A34A"
    : goal.status === "delayed" ? "#DC2626"
    : goal.status === "paused" ? "#64748B"
    : "#2563EB";
  const paused = goal.status === "paused";
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
    </div>
  );
}
