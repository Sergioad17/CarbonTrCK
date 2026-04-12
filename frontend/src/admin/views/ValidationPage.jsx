import React from "react";
import {
  CheckSquare, CheckCircle2, XCircle, AlertTriangle, Clock, Check,
  RotateCcw, History, MessageSquare,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import {
  validationQueue as mockQueue, records, validationCriteria,
  validationDecisions as mockDecisions,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const PRIORITY = {
  high:   { variant: "error",   label: "Alta" },
  normal: { variant: "info",    label: "Normal" },
  low:    { variant: "neutral", label: "Baja" },
};

const DECISION = {
  approved: { color: "#16A34A", label: "Aprobado",  icon: CheckCircle2 },
  rejected: { color: "#DC2626", label: "Rechazado", icon: XCircle },
  returned: { color: "#CA8A04", label: "Devuelto",  icon: RotateCcw },
};

export default function ValidationPage() {
  const [queue, setQueue] = React.useState(mockQueue);
  const [decisions, setDecisions] = React.useState(mockDecisions);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [openItem, setOpenItem] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [comment, setComment] = React.useState("");
  const [criteria, setCriteria] = React.useState(() =>
    Object.fromEntries(validationCriteria.map(c => [c.id, false]))
  );

  const enriched = React.useMemo(() =>
    queue.map(q => ({ ...q, record: records.find(r => r.id === q.recordId) }))
  , [queue]);

  React.useEffect(() => {
    setComment("");
    setCriteria(Object.fromEntries(validationCriteria.map(c => [c.id, false])));
  }, [openItem?.id]);

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    setSelectedIds(prev => prev.length === enriched.length ? [] : enriched.map(q => q.id));
  }

  function recordDecisions(ids, kind, commentText) {
    const now = new Date().toISOString();
    const newDecisions = ids.map((qid, i) => {
      const q = queue.find(x => x.id === qid);
      return {
        id: "vdn" + (decisions.length + i + 1),
        recordId: q?.recordId,
        decision: kind,
        actor: "Usuario actual",
        ts: now,
        comment: commentText || (kind === "approved" ? "Aprobado sin comentarios." : ""),
      };
    });
    setDecisions(prev => [...newDecisions, ...prev]);
  }

  function handleDecision(ids, kind) {
    recordDecisions(ids, kind, comment);
    setQueue(prev => prev.filter(q => !ids.includes(q.id)));
    setSelectedIds([]);
    setOpenItem(null);
    setConfirm(null);
    setComment("");
  }

  const stats = {
    total: enriched.length,
    high:  enriched.filter(q => q.priority === "high").length,
    over5: enriched.filter(q => (Date.now() - new Date(q.submittedAt).getTime()) / 86400000 > 5).length,
  };

  const columns = [
    { key: "_select", label: "", width: 40, render: (_, row) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(row.id)}
        onChange={e => { e.stopPropagation(); toggleSelect(row.id); }}
        onClick={e => e.stopPropagation()}
        style={{ cursor: "pointer", accentColor: "var(--eco-primary-500)" }}
      />
    ) },
    { key: "priority", label: "Prioridad", width: 100, render: v => (
      <AdminStatusBadge variant={PRIORITY[v]?.variant} label={PRIORITY[v]?.label} />
    ) },
    { key: "record", label: "Registro", render: (_, row) => row.record && (
      <div>
        <div style={{ fontWeight: 600 }}>{row.record.consumptionType} – {row.record.areaName}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
          {row.record.value.toLocaleString()} {row.record.unit} · {row.record.emissions.toFixed(2)} kgCO2e
        </div>
      </div>
    ) },
    { key: "reason", label: "Motivo", maxWidth: 240, render: v => (
      <span style={{ fontSize: 12, color: "var(--eco-text-soft)" }}>{v}</span>
    ) },
    { key: "submittedAt", label: "Enviado", mono: true, width: 110, render: v => v.split("T")[0] },
    { key: "assignedTo", label: "Asignado a", width: 130 },
  ];

  const relatedDecisions = openItem
    ? decisions.filter(d => d.recordId === openItem.recordId)
    : [];

  return (
    <div>
      <AdminPageHeader
        icon={CheckSquare}
        title="Validación y aprobación"
        subtitle="Cola de registros pendientes con revisión por criterios, comentarios e historial de decisiones."
        breadcrumb={["Control", "Validación"]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard label="En cola" value={stats.total} icon={Clock} color="#2563EB" />
        <KpiCard label="Prioridad alta" value={stats.high} icon={AlertTriangle} color="#DC2626" />
        <KpiCard label="Más de 5 días" value={stats.over5} icon={Clock} color="#CA8A04" />
        <KpiCard label="Decisiones" value={decisions.length} icon={History} color="#7C3AED" />
      </div>

      {selectedIds.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", marginBottom: 12,
          background: "rgba(34,197,94,.08)",
          border: "1px solid rgba(34,197,94,.20)",
          borderRadius: 12,
        }}>
          <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-primary-700, #15803D)" }}>
            {selectedIds.length} seleccionado{selectedIds.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirm({ kind: "rejected", ids: selectedIds })} style={btnDanger}>
              <XCircle size={14} /> Rechazar
            </button>
            <button onClick={() => setConfirm({ kind: "returned", ids: selectedIds })} style={btnWarning}>
              <RotateCcw size={14} /> Devolver
            </button>
            <button onClick={() => setConfirm({ kind: "approved", ids: selectedIds })} style={btnPrimary}>
              <CheckCircle2 size={14} /> Aprobar
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 18px", marginBottom: 0,
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
      }}>
        <input
          type="checkbox"
          checked={selectedIds.length === enriched.length && enriched.length > 0}
          onChange={toggleAll}
          style={{ cursor: "pointer", accentColor: "var(--eco-primary-500)" }}
        />
        <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
          Seleccionar todo ({enriched.length})
        </span>
      </div>

      <div style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <AdminDataTable
          columns={columns}
          data={enriched}
          onRowClick={setOpenItem}
          emptyMessage="No hay registros en cola."
        />
      </div>

      {/* Global decisions history */}
      <div style={{ marginTop: 22 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
          fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: ".05em", color: "var(--eco-text-soft)",
        }}>
          <History size={13} /> Historial de decisiones
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {decisions.length === 0 ? (
            <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
              Sin decisiones registradas todavía.
            </div>
          ) : decisions.map(d => <DecisionRow key={d.id} decision={d} />)}
        </div>
      </div>

      <AdminEntityDrawer
        open={!!openItem}
        onClose={() => setOpenItem(null)}
        title={openItem?.record ? `${openItem.record.consumptionType} – ${openItem.record.areaName}` : ""}
        subtitle={openItem ? `Registro ${openItem.recordId} · Prioridad ${PRIORITY[openItem.priority]?.label}` : ""}
        badge={openItem && <AdminStatusBadge variant={PRIORITY[openItem.priority]?.variant} label={PRIORITY[openItem.priority]?.label} />}
        actions={openItem && (
          <>
            <button onClick={() => setConfirm({ kind: "rejected", ids: [openItem.id] })} style={btnDanger}>
              <XCircle size={14} /> Rechazar
            </button>
            <button onClick={() => setConfirm({ kind: "returned", ids: [openItem.id] })} style={btnWarning}>
              <RotateCcw size={14} /> Devolver
            </button>
            <button onClick={() => setConfirm({ kind: "approved", ids: [openItem.id] })} style={btnPrimary}>
              <CheckCircle2 size={14} /> Aprobar
            </button>
          </>
        )}
        width={520}
      >
        {openItem && openItem.record && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Consumo" mono>
                {openItem.record.value.toLocaleString()} {openItem.record.unit}
              </DrawerField>
              <DrawerField label="Emisiones" mono>{openItem.record.emissions.toFixed(2)} kgCO2e</DrawerField>
              <DrawerField label="Capturado por">{openItem.record.capturedBy}</DrawerField>
              <DrawerField label="Fecha" mono>{openItem.record.date}</DrawerField>
            </div>
            <DrawerField label="Motivo de envío">{openItem.reason}</DrawerField>

            {/* Criteria checklist */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)",
              }}>
                <Check size={13} /> Criterios de validación
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {validationCriteria.map(c => (
                  <label key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px",
                    background: criteria[c.id] ? "rgba(34,197,94,.08)" : "var(--eco-card-muted)",
                    border: `1px solid ${criteria[c.id] ? "rgba(34,197,94,.25)" : "var(--eco-border)"}`,
                    borderRadius: 8, cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={!!criteria[c.id]}
                      onChange={e => setCriteria(p => ({ ...p, [c.id]: e.target.checked }))}
                      style={{ accentColor: "var(--eco-primary-500)" }}
                    />
                    <span style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)", flex: 1 }}>
                      {c.label}
                    </span>
                    {c.required && (
                      <span style={{
                        fontFamily: fb, fontSize: 10, fontWeight: 700,
                        color: "var(--eco-danger)",
                        textTransform: "uppercase", letterSpacing: ".05em",
                      }}>
                        Req.
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Review comment */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)",
              }}>
                <MessageSquare size={13} /> Comentario de revisión
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Observaciones para el capturista (obligatorio al devolver o rechazar)"
                rows={3}
                style={{
                  width: "100%", padding: "10px 12px",
                  fontFamily: fb, fontSize: 12.5,
                  background: "var(--eco-surface, #fff)",
                  color: "var(--eco-text, #1E293B)",
                  border: "1px solid var(--eco-border)", borderRadius: 8,
                  outline: "none", resize: "vertical",
                }}
              />
            </div>

            {/* History for this record */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)",
              }}>
                <History size={13} /> Historial del registro
              </div>
              {relatedDecisions.length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin decisiones previas.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {relatedDecisions.map(d => <DecisionRow key={d.id} decision={d} />)}
                </div>
              )}
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
            ? `¿Confirmas la aprobación de ${confirm?.ids.length} registro(s)? Esta acción los marcará como validados.`
            : confirm?.kind === "returned"
            ? `¿Devolver ${confirm?.ids.length} registro(s) al capturista para corrección? Incluirá el comentario de revisión.`
            : `¿Confirmas el rechazo de ${confirm?.ids.length} registro(s)? Deberán recapturarse.`
        }
        confirmLabel={
          confirm?.kind === "approved" ? "Aprobar" :
          confirm?.kind === "returned" ? "Devolver" :
          "Rechazar"
        }
        danger={confirm?.kind === "rejected"}
        onConfirm={() => handleDecision(confirm.ids, confirm.kind)}
      />
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
          <span style={{ fontFamily: fb, fontSize: 11.5, fontWeight: 700, color: cfg.color }}>
            {cfg.label}
          </span>
          <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text)" }}>
            · {decision.actor}
          </span>
          <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
            · {new Date(decision.ts).toLocaleString()}
          </span>
          <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
            · {decision.recordId}
          </span>
        </div>
        {decision.comment && (
          <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3, lineHeight: 1.4 }}>
            {decision.comment}
          </div>
        )}
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
