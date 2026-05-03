import React from "react";
import {
  ShieldCheck, MapPin, AlertTriangle, CheckCircle2, ClipboardEdit, Lightbulb,
} from "lucide-react";
import DiagModalShell, {
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import {
  uid, appendItem, KEYS, AI, RISK, formatDateTime,
} from "./helpers";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const DEFAULT_CHECKLIST = [
  { id: "review_records",   label: "Revisar registros recientes" },
  { id: "confirm_activity", label: "Confirmar actividad realizada" },
  { id: "validate_consumption", label: "Validar consumo capturado" },
  { id: "create_action",    label: "Crear acción correctiva" },
  { id: "mark_reviewed",    label: "Marcar área como revisada" },
];

export default function AreaReviewModal({
  open, recommendation, onClose, onMarkedReviewed, onCreateAction,
}) {
  const detail = React.useMemo(() => buildAreaDetail(recommendation), [recommendation]);
  const [checks, setChecks] = React.useState(() => emptyChecks());

  React.useEffect(() => { if (open) setChecks(emptyChecks()); }, [open]);

  function toggle(id) {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleMarkReviewed() {
    const item = {
      id: uid("area"),
      area: detail.name,
      checklist: { ...checks, mark_reviewed: true },
      recommendationId: recommendation?.id || null,
      reviewedAt: new Date().toISOString(),
      origin: "diagnostico-inteligente",
    };
    appendItem(KEYS.areaReviews, item);
    onMarkedReviewed?.(item);
  }

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={ShieldCheck}
      title={`Revisión de área · ${detail.name}`}
      subtitle="Revisa el estado del área y registra acciones de seguimiento."
      width={620}
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cerrar</ModalSecondaryBtn>
          <ModalSecondaryBtn onClick={() => onCreateAction?.(recommendation)}>
            <ClipboardEdit size={13} /> Crear acción
          </ModalSecondaryBtn>
          <ModalPrimaryBtn onClick={handleMarkReviewed}>
            <CheckCircle2 size={13} /> Marcar área como revisada
          </ModalPrimaryBtn>
        </>
      }
    >
      {/* Area summary */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 10, marginBottom: 14,
      }}>
        <Stat icon={MapPin}   label="Nombre del área"    value={detail.name} />
        <Stat                 label="Estado del área"     value={detail.status} highlight={detail.statusTone} />
        <Stat                 label="Fuente principal"    value={detail.source} />
        <Stat                 label="Último valor"        value={detail.lastValue} />
        <Stat                 label="Valor esperado"      value={detail.expectedValue} />
        <Stat                 label="Diferencia"          value={detail.diff} highlight={detail.diffTone} />
      </div>

      {/* Risk + recommendation banner */}
      <div style={{
        padding: 12, marginBottom: 14, borderRadius: 11,
        background: AI.primarySoft,
        border: `1px solid ${AI.primaryBorder}`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
          fontFamily: fb, fontSize: 11, fontWeight: 700,
          color: AI.primary, textTransform: "uppercase", letterSpacing: ".05em",
        }}>
          <Lightbulb size={12} /> Recomendación principal
        </div>
        <div style={{
          fontFamily: fb, fontSize: 13, lineHeight: 1.55,
          color: "var(--eco-text, #1E293B)",
        }}>
          {detail.recommendation}
        </div>
        <div style={{ marginTop: 8 }}>
          <RiskBadge level={detail.riskLevel} />
        </div>
      </div>

      {/* Checklist */}
      <div style={{
        fontFamily: fd, fontSize: 13, fontWeight: 800,
        color: "var(--eco-text-strong, #0F172A)",
        marginBottom: 8,
      }}>
        Lista de revisión
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DEFAULT_CHECKLIST.map(item => {
          const checked = !!checks[item.id];
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              type="button"
              aria-pressed={checked}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 9,
                border: checked
                  ? `1px solid ${AI.primary}`
                  : "1px solid var(--eco-border, #E2E8F0)",
                background: checked ? AI.primarySoft : "var(--eco-card, #fff)",
                color: "var(--eco-text, #1E293B)",
                fontFamily: fb, fontSize: 13,
                fontWeight: checked ? 600 : 500,
                cursor: "pointer", textAlign: "left",
                transition: "all .15s",
                width: "100%",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 5,
                background: checked ? AI.primary : "transparent",
                border: checked ? `1px solid ${AI.primary}` : "1.5px solid var(--eco-border, #CBD5E1)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#fff", flexShrink: 0,
                transition: "all .15s",
              }}>
                {checked && <CheckCircle2 size={11} />}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 14, padding: "8px 12px", borderRadius: 8,
        background: "var(--eco-card-muted, #F8FAFC)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        fontFamily: fb, fontSize: 11.5,
        color: "var(--eco-text-soft, #64748B)",
      }}>
        Última actualización del área: {formatDateTime()}
      </div>
    </DiagModalShell>
  );
}

function emptyChecks() {
  return {
    review_records: false,
    confirm_activity: false,
    validate_consumption: false,
    create_action: false,
    mark_reviewed: false,
  };
}

function Stat({ icon: Icon, label, value, highlight }) {
  let color = "var(--eco-text-strong, #0F172A)";
  if (highlight === "high")   color = RISK.high.color;
  if (highlight === "medium") color = RISK.medium.color;
  if (highlight === "low")    color = RISK.low.color;
  return (
    <div style={{
      padding: 10, borderRadius: 9,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border, #E2E8F0)",
    }}>
      <div style={{
        fontFamily: fb, fontSize: 10.5, fontWeight: 700,
        color: "var(--eco-text-soft, #64748B)",
        textTransform: "uppercase", letterSpacing: ".05em",
        marginBottom: 3,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div style={{
        fontFamily: fd, fontSize: 13.5, fontWeight: 700,
        color, lineHeight: 1.3,
      }}>
        {value || "—"}
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const r = RISK[level] || RISK.medium;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999,
      background: r.bg, color: r.color,
      border: `1px solid ${r.border}`,
      fontFamily: fb, fontSize: 11, fontWeight: 700,
    }}>
      <AlertTriangle size={11} />
      Riesgo {r.label.toLowerCase()}
    </span>
  );
}

function buildAreaDetail(rec) {
  /* Best-effort detail derived from the recommendation context */
  if (!rec) {
    return {
      name: "Área no disponible",
      status: "Pendiente de revisión",
      statusTone: "medium",
      source: "—",
      lastValue: "—",
      expectedValue: "—",
      diff: "—",
      diffTone: undefined,
      riskLevel: "medium",
      recommendation: "Sin recomendación disponible.",
    };
  }
  const text = `${rec.title || ""} ${rec.reason || ""}`.toLowerCase();
  if (text.includes("centro de cómputo") || text.includes("equipos")) {
    return {
      name: "Centro de Cómputo 1",
      status: "Consumo fuera de patrón",
      statusTone: "high",
      source: "Electricidad",
      lastValue: "1.8 tCO₂e",
      expectedValue: "1.2 tCO₂e",
      diff: "+34%",
      diffTone: "high",
      riskLevel: "high",
      recommendation: rec.title,
    };
  }
  if (text.includes("aulas") || text.includes("proyector")) {
    return {
      name: "Aulas",
      status: "Consumo elevado en horarios repetidos",
      statusTone: "medium",
      source: "Electricidad",
      lastValue: "0.7 tCO₂e",
      expectedValue: "0.5 tCO₂e",
      diff: "+28%",
      diffTone: "medium",
      riskLevel: "medium",
      recommendation: rec.title,
    };
  }
  if (text.includes("tractor") || text.includes("agríc") || text.includes("combustible")) {
    return {
      name: "Área de innovación agrícola",
      status: "Uso de combustible mayor al esperado",
      statusTone: "high",
      source: "Combustible",
      lastValue: "0.9 tCO₂e",
      expectedValue: "0.6 tCO₂e",
      diff: "+25%",
      diffTone: "high",
      riskLevel: "high",
      recommendation: rec.title,
    };
  }
  return {
    name: rec.title || "Área detectada",
    status: "Pendiente de revisión",
    statusTone: "medium",
    source: "—",
    lastValue: "—",
    expectedValue: "—",
    diff: "—",
    diffTone: undefined,
    riskLevel: "medium",
    recommendation: rec.title || "—",
  };
}
