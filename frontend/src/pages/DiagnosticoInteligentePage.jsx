import React from "react";
import {
  BrainCircuit, Sparkles, Bot, Cpu, Radar,
  AlertTriangle, ShieldAlert, ShieldCheck, ActivitySquare,
  Database, Gauge, TrendingUp, TrendingDown, Target, Zap, Flame,
  CheckCircle2, ChevronDown, ChevronUp, Info, Lightbulb,
  ThumbsUp, ThumbsDown, Clock, FileDown, ClipboardCheck,
  PlayCircle, Search, Plus, ArrowRight, Bookmark,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Scatter, ReferenceLine, Area,
} from "recharts";

import {
  AI, RISK,
  KEYS,
  loadActions, loadFeedback, loadSavedRecs, loadAreaReviews,
  loadReductionPlans, loadDiagnosticReview,
  saveToStorage, formatDate,
} from "../components/diagnostico/helpers";
import CreateDiagnosticActionModal from "../components/diagnostico/CreateDiagnosticActionModal";
import FeedbackModal               from "../components/diagnostico/FeedbackModal";
import RelatedRecordsDrawer        from "../components/diagnostico/RelatedRecordsDrawer";
import AreaReviewModal             from "../components/diagnostico/AreaReviewModal";
import ReductionPlanModal          from "../components/diagnostico/ReductionPlanModal";
import ExportDiagnosticModal       from "../components/diagnostico/ExportDiagnosticModal";
import MarkReviewedModal           from "../components/diagnostico/MarkReviewedModal";

/* ─── Fonts ───────────────────────────────────────────────────────────── */
const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

/* ─── Inject one-time CSS for keyframes / responsive helpers ──────────── */
const DIAG_CSS = `
@keyframes diagFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes diagPulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,.45); } 50% { box-shadow: 0 0 0 10px rgba(139,92,246,0); } }
.diag-card { animation: diagFadeIn .28s ease-out both; }
.diag-grid-4 { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0,1fr)); }
.diag-grid-3 { display: grid; gap: 14px; grid-template-columns: repeat(3, minmax(0,1fr)); }
.diag-grid-2 { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0,1fr)); }
.diag-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
@media (max-width: 1100px) {
  .diag-grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .diag-grid-3 { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 700px) {
  .diag-grid-4, .diag-grid-3, .diag-grid-2 { grid-template-columns: 1fr; }
}
`;

/* ─── Safe localStorage reader ────────────────────────────────────────── */
function safeRead(key, fallback) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════════════════════════════════════ */

const summaryData = {
  status: "Riesgo moderado",
  diagnosis:
    "CarbonTrack detectó un aumento constante en las emisiones de electricidad del Centro de Cómputo 1. Si esta tendencia continúa, existe riesgo de superar la meta mensual establecida.",
  recommendation: "Revisar equipos de alto consumo y ajustar horarios de uso.",
  confidence: "Alta",
  chips: ["Riesgo moderado", "Confianza alta", "Prioridad alta", "IA predictiva"],
};

const indicatorCards = [
  {
    id: "risk",
    icon: AlertTriangle,
    title: "Riesgo de superar la meta",
    value: "72%",
    description:
      "Probabilidad estimada de superar el límite esperado si continúa la tendencia actual.",
    risk: "medium",
  },
  {
    id: "area",
    icon: Zap,
    title: "Área más afectada",
    value: "Centro de Cómputo 1",
    description:
      "Área con mayor variación detectada en el periodo analizado.",
    risk: "high",
  },
  {
    id: "quality",
    icon: Database,
    title: "Calidad de datos",
    value: "86% reales / 14% estimados",
    description:
      "Mientras más datos reales existan, más confiable será el diagnóstico.",
    risk: "low",
  },
  {
    id: "forecast",
    icon: TrendingUp,
    title: "Emisiones proyectadas",
    value: "+9% próximo mes",
    description:
      "Estimación de aumento si no se aplican acciones correctivas.",
    risk: "medium",
  },
];

const priorityAlerts = [
  {
    n: 1,
    title: "Consumo eléctrico fuera de patrón",
    area: "Centro de Cómputo 1",
    level: "high",
    cause: "Uso constante de equipos fuera del horario normal.",
    action: "Revisar horarios de uso y equipos con mayor consumo.",
  },
  {
    n: 2,
    title: "Uso de combustible mayor al esperado",
    area: "Área de innovación agrícola",
    level: "medium",
    cause: "Mayor uso del tractor o registros concentrados en pocos días.",
    action: "Validar registros y revisar actividades realizadas.",
  },
  {
    n: 3,
    title: "Alto porcentaje de datos estimados",
    area: "Aulas",
    level: "medium",
    cause: "Falta de registros reales recientes.",
    action: "Capturar datos reales para mejorar la precisión del diagnóstico.",
  },
];

const anomalyChartData = [
  { date: "01/04", real: 1.0, expected: 1.0, anomaly: null },
  { date: "04/04", real: 1.1, expected: 1.05, anomaly: null },
  { date: "08/04", real: 1.2, expected: 1.1, anomaly: null },
  { date: "12/04", real: 1.3, expected: 1.15, anomaly: null },
  { date: "15/04", real: 1.25, expected: 1.18, anomaly: null },
  { date: "18/04", real: 1.8, expected: 1.2, anomaly: 1.8 },
  { date: "21/04", real: 0.9, expected: 0.6, anomaly: 0.9 },
  { date: "24/04", real: 1.4, expected: 1.0, anomaly: 1.4 },
  { date: "27/04", real: 1.15, expected: 1.18, anomaly: null },
  { date: "30/04", real: 1.22, expected: 1.2, anomaly: null },
];

const anomalyTable = [
  { date: "18/04/2026", source: "Electricidad",  area: "Centro de Cómputo 1", real: "1.8 tCO₂e", expected: "1.2 tCO₂e", diff: "+34%", level: "high"   },
  { date: "21/04/2026", source: "Combustible",   area: "Área agrícola",       real: "0.9 tCO₂e", expected: "0.6 tCO₂e", diff: "+25%", level: "medium" },
  { date: "24/04/2026", source: "Electricidad",  area: "Taller de redes",     real: "1.4 tCO₂e", expected: "1.0 tCO₂e", diff: "+28%", level: "high"   },
];

const forecastChartData = [
  { period: "Ene", real: 7.1, predicted: null, target: 9.5 },
  { period: "Feb", real: 7.4, predicted: null, target: 9.5 },
  { period: "Mar", real: 8.0, predicted: null, target: 9.5 },
  { period: "Abr", real: 8.4, predicted: 8.4, target: 9.5 },
  { period: "May", real: null, predicted: 8.9, target: 9.5 },
  { period: "Jun", real: null, predicted: 9.4, target: 9.5 },
  { period: "Jul", real: null, predicted: 9.8, target: 9.5 },
];

const forecastTable = [
  { period: "Mayo",  expected: "8.9 tCO₂e", level: "medium", comment: "Tendencia estable con ligero aumento" },
  { period: "Junio", expected: "9.4 tCO₂e", level: "high",   comment: "Posible acercamiento a la meta"        },
  { period: "Julio", expected: "9.8 tCO₂e", level: "high",   comment: "Riesgo de superar el límite esperado" },
];

const recommendations = [
  {
    id: "r1",
    title: "Revisar equipos del Centro de Cómputo 1",
    reason: "El consumo eléctrico fue 34% mayor al comportamiento esperado.",
    impact: "Reducción aproximada de 0.8 tCO₂e",
    priority: "high",
    confidence: "high",
    cta: "Crear acción",
  },
  {
    id: "r2",
    title: "Ajustar horarios de uso de proyectores",
    reason: "Las aulas muestran consumo elevado en horarios repetidos.",
    impact: "Reducción aproximada de 0.4 tCO₂e",
    priority: "medium",
    confidence: "medium",
    cta: "Crear acción",
  },
  {
    id: "r3",
    title: "Validar registros estimados con datos reales",
    reason: "El porcentaje de datos estimados puede afectar la precisión del diagnóstico.",
    impact: "Mejora de la confiabilidad del análisis",
    priority: "medium",
    confidence: "high",
    cta: "Ver registros",
  },
  {
    id: "r4",
    title: "Revisar consumo de combustible del tractor",
    reason: "El uso de combustible fue mayor al promedio esperado.",
    impact: "Reducción aproximada de 0.6 tCO₂e",
    priority: "high",
    confidence: "medium",
    cta: "Revisar área",
  },
];

const modelCards = [
  { name: "XGBoost",          desc: "Predicción de emisiones futuras a partir de datos históricos." },
  { name: "Prophet",          desc: "Análisis de tendencias por periodo y comportamiento temporal." },
  { name: "LSTM Autoencoder", desc: "Detección avanzada de anomalías en series temporales."        },
  { name: "Isolation Forest", desc: "Identificación rápida de datos atípicos o fuera de patrón."   },
];

/* ═══════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function SectionTitle({ icon: Icon, title, subtitle, accent = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12,
    }}>
      {Icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: accent ? AI.primarySoft : "var(--eco-card-muted, #F8FAFC)",
          border: accent ? `1px solid ${AI.primaryBorder}` : "1px solid var(--eco-border, #E2E8F0)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color={accent ? AI.primary : "var(--eco-text, #1E293B)"} strokeWidth={2} />
        </div>
      )}
      <div>
        <div style={{
          fontFamily: fd, fontSize: 14, fontWeight: 800,
          color: "var(--eco-text-strong, var(--eco-text, #1E293B))",
          letterSpacing: ".01em",
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontFamily: fb, fontSize: 12,
            color: "var(--eco-text-soft, #64748B)",
            marginTop: 2, lineHeight: 1.5,
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "var(--eco-card-muted, #F8FAFC)", color: "var(--eco-text, #1E293B)", border: "var(--eco-border, #E2E8F0)" },
    ai:      { bg: AI.primarySoft, color: AI.primary, border: AI.primaryBorder },
    medium:  { bg: RISK.medium.bg, color: RISK.medium.color, border: RISK.medium.border },
    high:    { bg: RISK.high.bg,   color: RISK.high.color,   border: RISK.high.border   },
    low:     { bg: RISK.low.bg,    color: RISK.low.color,    border: RISK.low.border    },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999,
      background: t.bg, color: t.color,
      fontFamily: fb, fontSize: 11, fontWeight: 600,
      border: `1px solid ${t.border}`,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Card({ children, accent = false, style }) {
  return (
    <div className="diag-card" style={{
      background: "var(--eco-card, #fff)",
      border: accent
        ? `1px solid ${AI.primaryBorder}`
        : "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 14,
      padding: 18,
      boxShadow: accent
        ? `0 6px 22px -10px ${AI.glow}`
        : "0 1px 3px rgba(15,23,42,.04)",
      ...style,
    }}>
      {children}
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
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: r.color, flexShrink: 0,
      }} />
      {level === "low"    && "Bajo"}
      {level === "medium" && "Medio"}
      {level === "high"   && "Alto"}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function DiagnosticoInteligentePage() {
  /* Read records (optional, safe) */
  const records = React.useMemo(
    () => safeRead("carbontrack.records", []),
    []
  );
  const targets = React.useMemo(
    () => safeRead("carbontrack.targets", []),
    []
  );

  /* Decide whether to show empty state. Demo data is always available, but
     if the records key explicitly exists and is empty, we still show
     diagnostics with demo data — the empty-state shows only when the user
     explicitly has zero history AND no demo fallback is desired.
     For UX we keep the page useful, so empty state renders only if the
     consumer has explicitly stored an empty placeholder. */
  const hasNoData =
    Array.isArray(records) && records.length === 0 &&
    typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("carbontrack.records.suppressDemo") === "1";

  const [techOpen, setTechOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  /* ─── Persistent state derived from localStorage ────────────────────── */
  const [actions, setActions]               = React.useState(() => loadActions());
  const [feedbackList, setFeedbackList]     = React.useState(() => loadFeedback());
  const [savedRecs, setSavedRecs]           = React.useState(() => loadSavedRecs());
  const [areaReviews, setAreaReviews]       = React.useState(() => loadAreaReviews());
  const [diagnosticReview, setDiagnosticReview] = React.useState(() => loadDiagnosticReview());

  /* ─── Derived per-recommendation state for visual badges ────────────── */
  const recState = React.useMemo(() => {
    const map = {};
    recommendations.forEach(r => {
      const usefulFb     = feedbackList.find(f => f.recommendationId === r.id && f.type === "useful");
      const notUsefulFb  = feedbackList.find(f => f.recommendationId === r.id && f.type === "not_useful");
      const saved        = savedRecs.includes(r.id);
      const action       = actions.find(a => a.recommendationId === r.id);
      map[r.id] = {
        feedback: usefulFb ? "useful" : (notUsefulFb ? "not_useful" : null),
        savedForLater: saved,
        actionCreated:  !!action,
      };
    });
    return map;
  }, [feedbackList, savedRecs, actions]);

  /* ─── Modal state ─────────────────────────────────────────────────────
     Single state machine: { kind, payload } */
  const [modal, setModal] = React.useState(null);
  function openModal(kind, payload = null) { setModal({ kind, payload }); }
  function closeModal() { setModal(null); }

  function notify(message) {
    setToast(message);
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[Diagnóstico Inteligente]", message);
    }
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 2600);
  }

  /* ─── Recommendation actions ────────────────────────────────────────── */
  function handleRecPrimary(rec) {
    /* CTA differs per recommendation:
       - "Ver registros" → records drawer scoped to the recommendation
       - "Revisar área"  → area review modal
       - default         → create-action modal */
    if (rec.cta === "Ver registros") {
      openModal("recordsRec", rec);
    } else if (rec.cta === "Revisar área") {
      openModal("area", rec);
    } else {
      openModal("createAction", rec);
    }
  }

  function handleUseful(rec) {
    /* Toggle: if already useful, remove. Otherwise mark as useful and clear
       any prior "not_useful" entry for this recommendation. */
    const cur = recState[rec.id];
    let next;
    if (cur?.feedback === "useful") {
      next = feedbackList.filter(f => !(f.recommendationId === rec.id && f.type === "useful"));
      notify("Marca de \"Útil\" eliminada.");
    } else {
      const cleaned = feedbackList.filter(f => f.recommendationId !== rec.id);
      next = [...cleaned, {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        recommendationId: rec.id,
        type: "useful",
        reason: "",
        comment: "",
        createdAt: new Date().toISOString(),
      }];
      notify("Recomendación marcada como útil.");
    }
    saveToStorage(KEYS.feedback, next);
    setFeedbackList(next);
  }

  function handleNotUseful(rec) {
    openModal("feedback", rec);
  }

  function handleLater(rec) {
    const isSaved = savedRecs.includes(rec.id);
    const next = isSaved ? savedRecs.filter(id => id !== rec.id) : [...savedRecs, rec.id];
    saveToStorage(KEYS.saved, next);
    setSavedRecs(next);
    notify(isSaved
      ? "Recomendación quitada de \"Pendientes\"."
      : "Recomendación guardada para revisar después.");
  }

  /* ─── Quick action buttons ──────────────────────────────────────────── */
  function handleCreatePlan()        { openModal("plan"); }
  function handleViewRelatedAll()    { openModal("recordsAll"); }
  function handleExport()            { openModal("export"); }
  function handleMarkReviewed()      { openModal("markReviewed"); }

  /* ─── Empty-state helpers (kept) ────────────────────────────────────── */
  function handleEmptyAction(label)  { notify(`${label} (demo)`); }

  /* ═══════════════════════════════════════════════════════════════════ */
  if (hasNoData) {
    return (
      <PageShell>
        <style>{DIAG_CSS}</style>
        <DiagHeader />
        <Card accent style={{ padding: 36, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: AI.primarySoft, border: `1px solid ${AI.primaryBorder}`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14,
          }}>
            <BrainCircuit size={26} color={AI.primary} />
          </div>
          <div style={{
            fontFamily: fd, fontSize: 18, fontWeight: 800,
            color: "var(--eco-text, #1E293B)", marginBottom: 6,
          }}>
            No hay suficientes registros para generar un diagnóstico confiable.
          </div>
          <div style={{
            fontFamily: fb, fontSize: 13,
            color: "var(--eco-text-soft, #64748B)",
            maxWidth: 540, margin: "0 auto 18px", lineHeight: 1.6,
          }}>
            Agrega más registros reales de electricidad o combustible para que
            CarbonTrack pueda detectar patrones, generar predicciones y proponer
            recomendaciones.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryButton onClick={() => handleEmptyAction("Ir a Emisiones")}>
              Ir a Emisiones
            </PrimaryButton>
            <SecondaryButton onClick={() => handleEmptyAction("Agregar registro")}>
              <Plus size={13} /> Agregar registro
            </SecondaryButton>
          </div>
        </Card>
      </PageShell>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <PageShell>
      <style>{DIAG_CSS}</style>

      {/* ─── 1. HEADER ────────────────────────────────────────────────── */}
      <DiagHeader showFullSubtitle showTagline review={diagnosticReview} />


      {/* ─── 2. EXECUTIVE SUMMARY ─────────────────────────────────────── */}
      <div
        className="diag-card"
        style={{
          background: `linear-gradient(135deg, ${AI.primarySoft}, rgba(139,92,246,0.04))`,
          border: `1px solid ${AI.primaryBorder}`,
          borderRadius: 16,
          padding: "20px 22px",
          marginBottom: 18,
          boxShadow: `0 10px 30px -16px ${AI.glow}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 180, height: 180, borderRadius: "50%",
          background: `radial-gradient(circle, ${AI.glow}, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
          flexWrap: "wrap", position: "relative",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: AI.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 18px -4px ${AI.glow}`,
          }}>
            <BrainCircuit size={20} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{
              fontFamily: fd, fontSize: 11, fontWeight: 800,
              color: AI.primary, letterSpacing: ".08em",
              textTransform: "uppercase",
            }}>
              Resumen ejecutivo
            </div>
            <div style={{
              fontFamily: fd, fontSize: 18, fontWeight: 800,
              color: "var(--eco-text-strong, #0F172A)", marginTop: 2,
            }}>
              Estado actual: {summaryData.status}
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 14 }}>
          <div style={{
            fontFamily: fb, fontSize: 11, fontWeight: 700,
            color: "var(--eco-text-soft, #64748B)",
            textTransform: "uppercase", letterSpacing: ".06em",
            marginBottom: 4,
          }}>
            Diagnóstico generado
          </div>
          <div style={{
            fontFamily: fb, fontSize: 14, lineHeight: 1.6,
            color: "var(--eco-text, #1E293B)",
          }}>
            “{summaryData.diagnosis}”
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 14 }}>
          <div style={{
            fontFamily: fb, fontSize: 11, fontWeight: 700,
            color: "var(--eco-text-soft, #64748B)",
            textTransform: "uppercase", letterSpacing: ".06em",
            marginBottom: 4,
          }}>
            Recomendación principal
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(139,92,246,.18)",
            border: `1px dashed ${AI.primaryBorder}`,
            fontFamily: fb, fontSize: 13.5, fontWeight: 600,
            color: "var(--eco-text-strong, #0F172A)",
          }}>
            <Lightbulb size={14} color={AI.primary} />
            {summaryData.recommendation}
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 14 }}>
          <div style={{
            fontFamily: fb, fontSize: 11, fontWeight: 700,
            color: "var(--eco-text-soft, #64748B)",
            textTransform: "uppercase", letterSpacing: ".06em",
            marginBottom: 4,
          }}>
            Confianza del diagnóstico
          </div>
          <div style={{
            fontFamily: fd, fontSize: 14, fontWeight: 700,
            color: AI.primary,
          }}>
            {summaryData.confidence}
          </div>
        </div>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
          position: "relative",
        }}>
          {summaryData.chips.map((c, i) => (
            <Chip key={i} tone={i === 0 ? "medium" : i === 1 ? "low" : i === 2 ? "high" : "ai"}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      {/* ─── 3. INDICATOR CARDS ───────────────────────────────────────── */}
      <div className="diag-grid-4" style={{ marginBottom: 22 }}>
        {indicatorCards.map(c => {
          const r = RISK[c.risk];
          const Icon = c.icon;
          return (
            <Card key={c.id}>
              <div style={{
                display: "flex", alignItems: "center", gap: 9, marginBottom: 9,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: r.bg, border: `1px solid ${r.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} color={r.color} strokeWidth={2} />
                </div>
                <RiskBadge level={c.risk} />
              </div>
              <div style={{
                fontFamily: fb, fontSize: 11, fontWeight: 700,
                color: "var(--eco-text-soft, #64748B)",
                textTransform: "uppercase", letterSpacing: ".05em",
                marginBottom: 4,
              }}>
                {c.title}
              </div>
              <div style={{
                fontFamily: fd, fontSize: 17, fontWeight: 800,
                color: "var(--eco-text-strong, #0F172A)",
                marginBottom: 6, lineHeight: 1.25,
              }}>
                {c.value}
              </div>
              <div style={{
                fontFamily: fb, fontSize: 12,
                color: "var(--eco-text-soft, #64748B)",
                lineHeight: 1.5,
              }}>
                {c.description}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── 4. PRIORITIES ────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 22 }}>
        <SectionTitle
          icon={ShieldAlert}
          title="Qué requiere atención primero"
          subtitle="Las 3 prioridades más relevantes detectadas por la IA."
          accent
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {priorityAlerts.map(p => {
            const r = RISK[p.level];
            return (
              <div
                key={p.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 14, alignItems: "flex-start",
                  padding: 14, borderRadius: 11,
                  background: "var(--eco-card-muted, #F8FAFC)",
                  border: `1px solid var(--eco-border, #E2E8F0)`,
                  borderLeft: `3px solid ${r.color}`,
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: r.bg, border: `1px solid ${r.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: fd, fontSize: 13, fontWeight: 800, color: r.color,
                }}>
                  {p.n}
                </div>
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                    marginBottom: 4,
                  }}>
                    <div style={{
                      fontFamily: fd, fontSize: 13.5, fontWeight: 700,
                      color: "var(--eco-text-strong, #0F172A)",
                    }}>
                      {p.title}
                    </div>
                    <RiskBadge level={p.level} />
                  </div>
                  <div style={{
                    fontFamily: fb, fontSize: 12,
                    color: "var(--eco-text-soft, #64748B)",
                    marginBottom: 6,
                  }}>
                    Área: <strong style={{ color: "var(--eco-text, #1E293B)" }}>{p.area}</strong>
                  </div>
                  <div style={{
                    fontFamily: fb, fontSize: 12.5, lineHeight: 1.55,
                    color: "var(--eco-text, #1E293B)", marginBottom: 4,
                  }}>
                    <strong>Causa probable: </strong>{p.cause}
                  </div>
                  <div style={{
                    fontFamily: fb, fontSize: 12.5, lineHeight: 1.55,
                    color: "var(--eco-text, #1E293B)",
                  }}>
                    <strong>Acción sugerida: </strong>{p.action}
                  </div>
                </div>
                <SecondaryButton small onClick={() => openModal("recordsAll")}>
                  Detalle <ArrowRight size={11} />
                </SecondaryButton>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── 5. ANOMALIES ─────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 22 }}>
        <SectionTitle
          icon={Radar}
          title="Anomalías detectadas"
          subtitle="Una anomalía es un dato que se comporta diferente a lo esperado. Puede indicar consumo fuera de lo normal, un error de captura o una actividad especial."
          accent
        />
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap",
          marginBottom: 12,
        }}>
          <Chip tone="ai">LSTM Autoencoder</Chip>
          <Chip tone="ai">Isolation Forest</Chip>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <ComposedChart data={anomalyChartData} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,.18)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: fb, fill: "var(--eco-text-soft, #64748B)" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: fb, fill: "var(--eco-text-soft, #64748B)" }} />
              <Tooltip
                contentStyle={{
                  fontFamily: fb, fontSize: 12,
                  background: "var(--eco-card, #fff)",
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontFamily: fb, fontSize: 11.5 }} />
              <Line type="monotone" dataKey="expected" name="Valor esperado" stroke="#94A3B8" strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="real" name="Valor real" stroke={AI.primary} strokeWidth={2.2} dot={{ r: 3 }} />
              <Scatter dataKey="anomaly" name="Anomalía" fill="#EF4444" shape="circle" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="diag-table-wrap" style={{ marginTop: 12 }}>
          <table style={{
            width: "100%", borderCollapse: "collapse",
            fontFamily: fb, fontSize: 12.5,
          }}>
            <thead>
              <tr style={{
                background: "var(--eco-card-muted, #F8FAFC)",
                color: "var(--eco-text-soft, #64748B)",
                fontFamily: fd, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Fuente</th>
                <th style={thStyle}>Área</th>
                <th style={thStyle}>Valor real</th>
                <th style={thStyle}>Valor esperado</th>
                <th style={thStyle}>Diferencia</th>
                <th style={thStyle}>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {anomalyTable.map((a, i) => (
                <tr key={i} style={{
                  borderTop: "1px solid var(--eco-border, #E2E8F0)",
                  color: "var(--eco-text, #1E293B)",
                }}>
                  <td style={tdStyle}>{a.date}</td>
                  <td style={tdStyle}>{a.source}</td>
                  <td style={tdStyle}>{a.area}</td>
                  <td style={tdStyle}>{a.real}</td>
                  <td style={tdStyle}>{a.expected}</td>
                  <td style={{ ...tdStyle, color: RISK[a.level].color, fontWeight: 700 }}>{a.diff}</td>
                  <td style={tdStyle}><RiskBadge level={a.level} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── 6. FORECAST ──────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 22 }}>
        <SectionTitle
          icon={TrendingUp}
          title="Predicción de emisiones"
          subtitle="Qué podría pasar en los próximos meses si no se aplican acciones correctivas."
          accent
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <Chip tone="ai">XGBoost</Chip>
          <Chip tone="ai">Prophet</Chip>
          <Chip tone="ai">LSTM</Chip>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={forecastChartData} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,.18)" strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fontFamily: fb, fill: "var(--eco-text-soft, #64748B)" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: fb, fill: "var(--eco-text-soft, #64748B)" }} />
              <Tooltip
                contentStyle={{
                  fontFamily: fb, fontSize: 12,
                  background: "var(--eco-card, #fff)",
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontFamily: fb, fontSize: 11.5 }} />
              <ReferenceLine y={9.5} stroke="#EF4444" strokeDasharray="4 4" label={{ value: "Meta", fill: "#EF4444", fontSize: 11, fontFamily: fb }} />
              <Line type="monotone" dataKey="real" name="Emisiones reales" stroke="#22C55E" strokeWidth={2.2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="predicted" name="Emisiones predichas" stroke={AI.primary} strokeWidth={2.4} strokeDasharray="6 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="diag-table-wrap" style={{ marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 12.5 }}>
            <thead>
              <tr style={{
                background: "var(--eco-card-muted, #F8FAFC)",
                color: "var(--eco-text-soft, #64748B)",
                fontFamily: fd, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>
                <th style={thStyle}>Periodo</th>
                <th style={thStyle}>Emisión esperada</th>
                <th style={thStyle}>Riesgo</th>
                <th style={thStyle}>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {forecastTable.map((f, i) => (
                <tr key={i} style={{
                  borderTop: "1px solid var(--eco-border, #E2E8F0)",
                  color: "var(--eco-text, #1E293B)",
                }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{f.period}</td>
                  <td style={tdStyle}>{f.expected}</td>
                  <td style={tdStyle}><RiskBadge level={f.level} /></td>
                  <td style={tdStyle}>{f.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── 7. RECOMMENDATIONS ───────────────────────────────────────── */}
      <Card style={{ marginBottom: 22 }} accent>
        <SectionTitle
          icon={Lightbulb}
          title="Recomendaciones inteligentes"
          subtitle="Acciones priorizadas con impacto estimado para reducir emisiones."
          accent
        />
        <div className="diag-grid-2">
          {recommendations.map(rec => {
            const state = recState[rec.id] || {};
            return (
              <div
                key={rec.id}
                style={{
                  background: "var(--eco-card-muted, #F8FAFC)",
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  borderRadius: 12, padding: 14,
                  display: "flex", flexDirection: "column", gap: 10,
                  borderLeft: `3px solid ${AI.primary}`,
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                }}>
                  <RiskBadge level={rec.priority} />
                  <Chip tone="ai">
                    Confianza {rec.confidence === "high" ? "alta" : rec.confidence === "medium" ? "media" : "baja"}
                  </Chip>
                  {state.actionCreated && (
                    <Chip tone="low">
                      <CheckCircle2 size={10} style={{ marginRight: 2 }} /> Acción creada
                    </Chip>
                  )}
                  {state.savedForLater && (
                    <Chip tone="medium">
                      <Bookmark size={10} style={{ marginRight: 2 }} /> Pendiente de revisión
                    </Chip>
                  )}
                </div>
                <div style={{
                  fontFamily: fd, fontSize: 14, fontWeight: 700,
                  color: "var(--eco-text-strong, #0F172A)",
                  lineHeight: 1.3,
                }}>
                  {rec.title}
                </div>
                <div style={{
                  fontFamily: fb, fontSize: 12.5, lineHeight: 1.55,
                  color: "var(--eco-text-soft, #64748B)",
                }}>
                  <strong style={{ color: "var(--eco-text, #1E293B)" }}>Motivo: </strong>{rec.reason}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 10px", borderRadius: 8,
                  background: "rgba(34,197,94,.07)",
                  border: "1px solid rgba(34,197,94,.25)",
                  fontFamily: fb, fontSize: 12, fontWeight: 600,
                  color: "var(--eco-primary-600, #16A34A)",
                  width: "fit-content",
                }}>
                  <TrendingDown size={13} /> {rec.impact}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  marginTop: 4,
                }}>
                  <PrimaryButton small onClick={() => handleRecPrimary(rec)}>
                    {state.actionCreated && rec.cta === "Crear acción"
                      ? <><CheckCircle2 size={12} /> Acción creada</>
                      : rec.cta}
                  </PrimaryButton>
                  <FeedbackButton
                    active={state.feedback === "useful"}
                    aria-label="Marcar recomendación como útil"
                    onClick={() => handleUseful(rec)}
                  >
                    <ThumbsUp size={11} /> Útil
                  </FeedbackButton>
                  <FeedbackButton
                    active={state.feedback === "not_useful"}
                    aria-label="Marcar recomendación como no útil"
                    onClick={() => handleNotUseful(rec)}
                  >
                    <ThumbsDown size={11} /> No útil
                  </FeedbackButton>
                  <FeedbackButton
                    active={state.savedForLater}
                    aria-label="Guardar recomendación para revisar después"
                    onClick={() => handleLater(rec)}
                  >
                    <Clock size={11} /> Revisar después
                  </FeedbackButton>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── 8 + 9: Why + Confidence (two columns) ────────────────────── */}
      <div className="diag-grid-2" style={{ marginBottom: 22 }}>
        {/* Why */}
        <Card>
          <SectionTitle
            icon={Info}
            title="Por qué la IA recomienda esto"
            subtitle="Cómo se generaron las recomendaciones de forma transparente."
            accent
          />
          <div style={{
            fontFamily: fb, fontSize: 13, lineHeight: 1.6,
            color: "var(--eco-text, #1E293B)", marginBottom: 12,
          }}>
            La IA comparó los registros recientes contra el comportamiento esperado
            de meses anteriores. Al detectar un aumento constante en electricidad y
            una diferencia alta entre valor real y valor esperado, generó
            recomendaciones enfocadas en reducir consumo en las áreas con mayor
            impacto.
          </div>
          <ul style={{
            listStyle: "none", padding: 0, margin: 0,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {[
              "Comparó datos reales y estimados.",
              "Detectó cambios fuera del patrón normal.",
              "Revisó tendencia de los próximos meses.",
              "Priorizó acciones con mayor impacto estimado.",
            ].map((t, i) => (
              <li key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                fontFamily: fb, fontSize: 12.5,
                color: "var(--eco-text, #1E293B)",
              }}>
                <CheckCircle2 size={14} color={AI.primary} style={{ flexShrink: 0, marginTop: 2 }} />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        {/* Confidence */}
        <Card>
          <SectionTitle
            icon={Gauge}
            title="Confiabilidad del diagnóstico"
            subtitle="Indicadores de calidad detrás del análisis."
            accent
          />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 8,
          }}>
            <div style={{
              fontFamily: fb, fontSize: 12,
              color: "var(--eco-text-soft, #64748B)",
            }}>
              Confianza actual
            </div>
            <div style={{
              fontFamily: fd, fontSize: 14, fontWeight: 800,
              color: AI.primary,
            }}>
              Alta · 86%
            </div>
          </div>
          <div style={{
            width: "100%", height: 8, borderRadius: 999,
            background: "var(--eco-card-muted, #F1F5F9)",
            overflow: "hidden", marginBottom: 14,
          }}>
            <div style={{
              width: "86%", height: "100%",
              background: `linear-gradient(90deg, ${AI.primary}, ${AI.primaryLight})`,
              boxShadow: `0 0 12px ${AI.glow}`,
            }} />
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
            marginBottom: 12,
          }}>
            <Stat label="Datos reales"      value="86%"    />
            <Stat label="Datos estimados"   value="14%"    />
            <Stat label="Registros"         value="128"    />
            <Stat label="Última actualización" value="Hoy" />
          </div>
          <div style={{
            fontFamily: fb, fontSize: 12, lineHeight: 1.55,
            color: "var(--eco-text-soft, #64748B)",
            padding: 10, borderRadius: 8,
            background: AI.primarySoft,
            border: `1px solid ${AI.primaryBorder}`,
          }}>
            La confiabilidad puede mejorar si se agregan más registros reales y se
            reducen los datos estimados.
          </div>
        </Card>
      </div>

      {/* ─── 11. RISK SEMAPHORE ───────────────────────────────────────── */}
      <Card style={{ marginBottom: 22 }}>
        <SectionTitle
          icon={ActivitySquare}
          title="Semáforo de riesgo"
          subtitle="Estado simplificado para una lectura rápida."
        />
        <div className="diag-grid-3">
          <SemaphoreItem level="low"    title="Verde"     desc="Todo normal." active={false} />
          <SemaphoreItem level="medium" title="Amarillo"  desc="Se recomienda revisar el comportamiento." active={true} />
          <SemaphoreItem level="high"   title="Rojo"      desc="Riesgo alto de superar la meta o anomalía." active={false} />
        </div>
        <div style={{
          marginTop: 12,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 10,
          background: AI.primarySoft, border: `1px solid ${AI.primaryBorder}`,
          fontFamily: fd, fontSize: 12, fontWeight: 700,
          color: AI.primary,
        }}>
          <Sparkles size={13} /> Estado actual: Riesgo moderado
        </div>
      </Card>

      {/* ─── 10. TECH DETAILS (collapsible) ───────────────────────────── */}
      <Card style={{ marginBottom: 22 }}>
        <button
          onClick={() => setTechOpen(o => !o)}
          aria-expanded={techOpen}
          aria-label="Mostrar detalle técnico del diagnóstico"
          style={{
            width: "100%", border: "none", background: "transparent",
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", padding: 0, textAlign: "left",
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "var(--eco-card-muted, #F8FAFC)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Cpu size={15} color="var(--eco-text, #1E293B)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: fd, fontSize: 14, fontWeight: 800,
              color: "var(--eco-text-strong, #0F172A)",
            }}>
              Ver detalle técnico del diagnóstico
            </div>
            <div style={{
              fontFamily: fb, fontSize: 12,
              color: "var(--eco-text-soft, #64748B)", marginTop: 2,
            }}>
              Modelos de inteligencia artificial usados en este análisis.
            </div>
          </div>
          {techOpen
            ? <ChevronUp size={16} color="var(--eco-text-soft, #64748B)" />
            : <ChevronDown size={16} color="var(--eco-text-soft, #64748B)" />}
        </button>
        {techOpen && (
          <div className="diag-grid-2" style={{ marginTop: 14 }}>
            {modelCards.map(m => (
              <div
                key={m.name}
                style={{
                  background: "var(--eco-card-muted, #F8FAFC)",
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  borderRadius: 11, padding: 12,
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: AI.primarySoft, border: `1px solid ${AI.primaryBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Bot size={13} color={AI.primary} />
                </div>
                <div>
                  <div style={{
                    fontFamily: fd, fontSize: 13, fontWeight: 700,
                    color: "var(--eco-text-strong, #0F172A)",
                  }}>
                    {m.name}
                  </div>
                  <div style={{
                    fontFamily: fb, fontSize: 12, lineHeight: 1.5,
                    color: "var(--eco-text-soft, #64748B)", marginTop: 3,
                  }}>
                    {m.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ─── 12. QUICK ACTIONS ────────────────────────────────────────── */}
      <Card style={{ marginBottom: 22 }}>
        <SectionTitle
          icon={ClipboardCheck}
          title="Acciones rápidas"
          subtitle="Atajos para usar el diagnóstico en flujos de trabajo."
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PrimaryButton onClick={handleCreatePlan}>
            <Target size={13} /> Crear plan de reducción
          </PrimaryButton>
          <SecondaryButton onClick={handleViewRelatedAll}>
            <Search size={13} /> Ver registros relacionados
          </SecondaryButton>
          <SecondaryButton onClick={handleExport}>
            <FileDown size={13} /> Exportar diagnóstico
          </SecondaryButton>
          <SecondaryButton onClick={handleMarkReviewed}>
            <CheckCircle2 size={13} />
            {diagnosticReview ? "Revisado" : "Marcar como revisado"}
          </SecondaryButton>
        </div>
      </Card>

      {/* ─── MODALS ───────────────────────────────────────────────────── */}
      <CreateDiagnosticActionModal
        open={modal?.kind === "createAction"}
        recommendation={modal?.payload}
        onClose={closeModal}
        onCreated={(action) => {
          setActions(prev => [...prev, action]);
          closeModal();
          notify("Acción creada correctamente.");
        }}
      />

      <FeedbackModal
        open={modal?.kind === "feedback"}
        recommendation={modal?.payload}
        onClose={closeModal}
        onSaved={(item) => {
          /* Replace any prior feedback for this recommendation with the new
             "not_useful" entry */
          const cleaned = feedbackList.filter(f => f.recommendationId !== item.recommendationId);
          const next = [...cleaned, item];
          saveToStorage(KEYS.feedback, next);
          setFeedbackList(next);
          closeModal();
          notify("Gracias, tu retroalimentación fue guardada.");
        }}
      />

      <RelatedRecordsDrawer
        open={modal?.kind === "recordsRec"}
        scope="rec"
        recommendation={modal?.payload}
        onClose={closeModal}
      />

      <RelatedRecordsDrawer
        open={modal?.kind === "recordsAll"}
        scope="all"
        onClose={closeModal}
      />

      <AreaReviewModal
        open={modal?.kind === "area"}
        recommendation={modal?.payload}
        onClose={closeModal}
        onMarkedReviewed={(item) => {
          setAreaReviews(prev => [...prev, item]);
          closeModal();
          notify("Área marcada como revisada.");
        }}
        onCreateAction={(rec) => openModal("createAction", rec)}
      />

      <ReductionPlanModal
        open={modal?.kind === "plan"}
        recommendations={recommendations}
        onClose={closeModal}
        onCreated={() => {
          closeModal();
          notify("Plan de reducción creado correctamente.");
        }}
      />

      <ExportDiagnosticModal
        open={modal?.kind === "export"}
        payload={{
          summary: summaryData,
          indicators: indicatorCards,
          priorities: priorityAlerts,
          anomalies: anomalyTable,
          predictions: forecastTable,
          recommendations,
          confidence: { level: "Alta", real: "86%", estimated: "14%", records: 128 },
          models: modelCards,
        }}
        onClose={closeModal}
        onExported={(fmt) => {
          closeModal();
          notify(`Diagnóstico exportado correctamente (${fmt.toUpperCase()}).`);
        }}
      />

      <MarkReviewedModal
        open={modal?.kind === "markReviewed"}
        alreadyReviewed={!!diagnosticReview}
        onClose={closeModal}
        onConfirmed={(payload) => {
          setDiagnosticReview(payload);
          closeModal();
          notify("Diagnóstico marcado como revisado.");
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed", bottom: 20, right: 20,
            zIndex: 100,
            background: "var(--eco-card, #fff)",
            border: `1px solid ${AI.primaryBorder}`,
            color: "var(--eco-text-strong, #0F172A)",
            fontFamily: fb, fontSize: 12.5, fontWeight: 600,
            padding: "10px 14px", borderRadius: 10,
            boxShadow: `0 10px 30px -8px ${AI.glow}`,
            display: "flex", alignItems: "center", gap: 8,
            animation: "diagFadeIn .2s ease-out both",
          }}
        >
          <Sparkles size={14} color={AI.primary} />
          {toast}
        </div>
      )}
    </PageShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SMALL UI HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const thStyle = {
  textAlign: "left",
  padding: "9px 12px",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 12px",
  fontFamily: fb,
  whiteSpace: "nowrap",
};

/* ─── Page shell (own padding + bg, since main has padding 0 here) ────── */
function PageShell({ children }) {
  return (
    <div style={{
      width: "100%",
      minHeight: "100%",
      padding: "var(--page-pad-y, 24px) var(--page-pad-x, 28px)",
      background: "var(--eco-page-bg, transparent)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Custom AI-themed header (replaces AdminPageHeader) ──────────────── */
function DiagHeader({ showFullSubtitle = false, showTagline = false, review = null }) {
  const subtitle = showFullSubtitle
    ? "Análisis predictivo, detección de anomalías y recomendaciones automáticas para mejorar la gestión de emisiones de CarbonTrack."
    : "Análisis predictivo, detección de anomalías y recomendaciones automáticas.";
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      marginBottom: showTagline ? 8 : 22,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: AI.primarySoft,
            border: `1px solid ${AI.primaryBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 14px -6px ${AI.glow}`,
          }}>
            <BrainCircuit size={18} color={AI.primary} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{
              fontFamily: fd, fontSize: 20, fontWeight: 800,
              color: "var(--eco-text, #1E293B)",
              margin: 0, lineHeight: 1.2,
            }}>
              Diagnóstico Inteligente
            </h1>
            <p style={{
              fontFamily: fb, fontSize: 13,
              color: "var(--eco-text-soft, #64748B)",
              margin: "2px 0 0", maxWidth: 720, lineHeight: 1.5,
            }}>
              {subtitle}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {review && (
            <span
              title={`Revisado el ${formatDate(review.reviewedAt)}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 11px", borderRadius: 999,
                background: "rgba(34,197,94,.10)",
                color: "#16A34A",
                border: "1px solid rgba(34,197,94,.35)",
                fontFamily: fd, fontSize: 11, fontWeight: 800,
                letterSpacing: ".06em",
              }}
            >
              <CheckCircle2 size={12} /> Diagnóstico revisado
            </span>
          )}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 11px", borderRadius: 999,
            background: AI.primarySoft, color: AI.primary,
            border: `1px solid ${AI.primaryBorder}`,
            fontFamily: fd, fontSize: 11, fontWeight: 800,
            letterSpacing: ".06em",
          }}>
            <Sparkles size={12} /> IA PROFESIONAL
          </span>
        </div>
      </div>
      {showTagline && (
        <p style={{
          fontFamily: fb, fontSize: 12.5,
          color: "var(--eco-text-soft, #64748B)",
          margin: "0 0 14px", maxWidth: 760, lineHeight: 1.55,
        }}>
          Este módulo interpreta los registros de emisiones y genera
          recomendaciones para apoyar la toma de decisiones.
        </p>
      )}
      {review && (
        <div style={{
          padding: "8px 12px", borderRadius: 9,
          background: "rgba(34,197,94,.08)",
          border: "1px solid rgba(34,197,94,.30)",
          fontFamily: fb, fontSize: 12,
          color: "#16A34A", fontWeight: 600,
          display: "inline-flex", alignItems: "center", gap: 6,
          marginBottom: 14, width: "fit-content",
        }}>
          <CheckCircle2 size={12} />
          Diagnóstico revisado · {formatDate(review.reviewedAt)}
          {review.note && (
            <span style={{ color: "var(--eco-text-soft, #64748B)", fontWeight: 500 }}>
              · {review.note}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, small = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: small ? "6px 12px" : "8px 14px",
        borderRadius: 9, border: "none",
        background: AI.primary,
        color: "#fff",
        fontFamily: fb, fontSize: small ? 12 : 12.5, fontWeight: 700,
        cursor: "pointer",
        boxShadow: `0 6px 18px -8px ${AI.glow}`,
        transition: "all .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = AI.primaryDeep}
      onMouseLeave={e => e.currentTarget.style.background = AI.primary}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, small = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: small ? "6px 10px" : "7px 13px",
        borderRadius: 9,
        border: "1px solid var(--eco-border, #E2E8F0)",
        background: "var(--eco-card, #fff)",
        color: "var(--eco-text, #1E293B)",
        fontFamily: fb, fontSize: small ? 12 : 12.5, fontWeight: 600,
        cursor: "pointer",
        transition: "all .15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)";
        e.currentTarget.style.borderColor = AI.primaryBorder;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--eco-card, #fff)";
        e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
      }}
    >
      {children}
    </button>
  );
}

function FeedbackButton({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "5px 10px", borderRadius: 999,
        border: `1px solid ${active ? AI.primaryBorder : "var(--eco-border, #E2E8F0)"}`,
        background: active ? AI.primarySoft : "var(--eco-card, #fff)",
        color: active ? AI.primary : "var(--eco-text-soft, #64748B)",
        fontFamily: fb, fontSize: 11, fontWeight: 600,
        cursor: "pointer", transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }) {
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
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: fd, fontSize: 14, fontWeight: 800,
        color: "var(--eco-text-strong, #0F172A)",
        marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  );
}

function SemaphoreItem({ level, title, desc, active }) {
  const r = RISK[level];
  return (
    <div style={{
      padding: 14, borderRadius: 11,
      background: active ? r.bg : "var(--eco-card-muted, #F8FAFC)",
      border: active
        ? `1px solid ${r.border}`
        : "1px solid var(--eco-border, #E2E8F0)",
      boxShadow: active ? `0 0 0 3px ${AI.primarySoft}` : "none",
      position: "relative",
      transition: "all .2s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
      }}>
        <span style={{
          width: 12, height: 12, borderRadius: "50%",
          background: r.color,
          boxShadow: active ? `0 0 0 4px ${r.bg}` : "none",
        }} />
        <div style={{
          fontFamily: fd, fontSize: 13, fontWeight: 800,
          color: "var(--eco-text-strong, #0F172A)",
        }}>
          {title}
        </div>
        {active && (
          <span style={{
            marginLeft: "auto",
            padding: "2px 8px", borderRadius: 999,
            background: AI.primary, color: "#fff",
            fontFamily: fd, fontSize: 9, fontWeight: 800,
            letterSpacing: ".06em",
          }}>
            ACTUAL
          </span>
        )}
      </div>
      <div style={{
        fontFamily: fb, fontSize: 12, lineHeight: 1.5,
        color: "var(--eco-text-soft, #64748B)",
      }}>
        {desc}
      </div>
    </div>
  );
}
