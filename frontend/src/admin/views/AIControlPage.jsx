import React from "react";
import {
  Sparkles, Activity, Brain, Cpu, Database, TrendingUp, AlertTriangle,
  Lightbulb, Target, ClipboardEdit, MessageSquare, Power, RefreshCw,
  Eye, EyeOff, Lock, CheckCircle2, XCircle, Clock, ChevronRight,
  Zap, Bell, BarChart3, Sigma, Gauge, ShieldCheck, FileCheck2,
  GitCompare, Layers, ClipboardCheck, UserCheck, History, LineChart,
  SlidersHorizontal,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import {
  AdminFormSection, AdminToggleField, AdminSelectField,
} from "../components/AdminFormSection";
import {
  aiEngineStatus, aiMetrics, aiModuleToggles, aiPredictions,
  aiAnomalies, aiRecommendations, aiTrainingHistory, aiSmartAlerts,
  aiDataSources, aiDataQuality, aiModelObjectives, aiPerformanceHistory,
  aiModelVersions, aiTraceabilityItems, aiPermissionsMatrix,
  aiSecurityLimits, aiUsageLog,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const MODULE_ICON = {
  TrendingUp, AlertTriangle, Lightbulb, Target, ClipboardEdit, MessageSquare,
};

const SEVERITY_VARIANT = {
  critical: "error", warning: "warning", info: "info",
};

const SEVERITY_LABEL = {
  critical: "Crítica", warning: "Advertencia", info: "Informativa",
};

const ANOMALY_STATUS_VARIANT = {
  open: "warning", reviewed: "info", resolved: "success",
};

const ANOMALY_STATUS_LABEL = {
  open: "Pendiente", reviewed: "Revisada", resolved: "Resuelta",
};

const REC_STATUS_VARIANT = {
  new: "info", in_review: "warning", applied: "success", dismissed: "neutral",
};

const REC_STATUS_LABEL = {
  new: "Nueva", in_review: "En revisión", applied: "Aplicada", dismissed: "Descartada",
};

const VISIBILITY_OPTIONS = [
  { id: "admin",     label: "Administrador" },
  { id: "directivo", label: "Directivo" },
  { id: "operativo", label: "Operativo" },
  { id: "consulta",  label: "Solo lectura" },
];

const AI_VARIABLE_OPTIONS = [
  { id: "consumo", label: "Consumo" },
  { id: "scope", label: "Scope" },
  { id: "categoria", label: "Categoría" },
  { id: "area", label: "Área" },
  { id: "periodo", label: "Periodo" },
  { id: "factor", label: "Factor EF" },
  { id: "dispositivo", label: "Dispositivo" },
  { id: "estacionalidad", label: "Estacionalidad" },
];

const PERIOD_OPTIONS = [
  { id: "last-6m", label: "Últimos 6 meses" },
  { id: "last-12m", label: "Últimos 12 meses" },
  { id: "last-24m", label: "Últimos 24 meses" },
  { id: "all", label: "Todo el historial" },
];

const DATA_MODE_OPTIONS = [
  { id: "real", label: "Solo reales" },
  { id: "estimated", label: "Solo estimados" },
  { id: "both", label: "Reales y estimados" },
];

const MODEL_OPTIONS = [
  { id: "carbontrack-forecast", label: "CarbonTrack Forecast v1.4.2" },
  { id: "carbontrack-anomaly", label: "CarbonTrack Anomaly v1.2.0" },
  { id: "carbontrack-hybrid", label: "CarbonTrack Hybrid beta" },
];

const RECOMMENDATION_TYPE_OPTIONS = [
  { id: "energy", label: "Energía" },
  { id: "maintenance", label: "Mantenimiento" },
  { id: "goals", label: "Metas" },
  { id: "operations", label: "Operación" },
  { id: "devices", label: "Dispositivos" },
];

function fmtDate(ts) {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AIControlPage() {
  const [tab, setTab] = React.useState("overview");
  const [engine, setEngine] = React.useState(aiEngineStatus);
  const [modules, setModules] = React.useState(aiModuleToggles);
  const [recommendations, setRecommendations] = React.useState(aiRecommendations);
  const [anomalies, setAnomalies] = React.useState(aiAnomalies);
  const [analystNote, setAnalystNote] = React.useState("Observacion: revisar evidencia antes de aplicar acciones en campo.");
  const [aiConfig, setAiConfig] = React.useState({
    variables: ["consumo", "scope", "categoria", "area", "periodo", "factor"],
    periodRange: "last-24m",
    dataMode: "both",
    alertSensitivity: 72,
    canRetrain: ["admin"],
    recommendationTypes: ["energy", "maintenance", "goals", "operations"],
    scheduleFrequency: "monthly",
    scheduleTime: "03:00",
    selectedModel: "carbontrack-forecast",
    usageLimit: "role-area-period",
  });
  const [retraining, setRetraining] = React.useState(false);
  const [confirm, setConfirm] = React.useState(null);

  function toggleModule(id) {
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  }

  function toggleEngine() {
    setConfirm({
      title: engine.enabled ? "Desactivar motor IA" : "Activar motor IA",
      description: engine.enabled
        ? "Se detendrán las predicciones, anomalías y recomendaciones automáticas hasta que vuelvas a activarlo."
        : "El motor comenzará a generar predicciones y recomendaciones automáticamente.",
      danger: engine.enabled,
      onConfirm: () => {
        setEngine(p => ({ ...p, enabled: !p.enabled, status: !p.enabled ? "online" : "offline" }));
        setConfirm(null);
      },
    });
  }

  function handleRetrain() {
    setConfirm({
      title: "Reentrenar modelo",
      description: "El proceso puede tardar varias horas y consume recursos del servidor. ¿Continuar?",
      onConfirm: () => {
        setConfirm(null);
        setRetraining(true);
        setTimeout(() => setRetraining(false), 1500);
      },
    });
  }

  function toggleVisibility(roleId) {
    setEngine(prev => {
      const has = prev.visibleTo.includes(roleId);
      return {
        ...prev,
        visibleTo: has
          ? prev.visibleTo.filter(r => r !== roleId)
          : [...prev.visibleTo, roleId],
      };
    });
  }

  function updateRecommendation(id, status) {
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  function updateAnomaly(id, status) {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  function toggleConfigList(key, id) {
    setAiConfig(prev => {
      const values = prev[key] || [];
      const has = values.includes(id);
      return {
        ...prev,
        [key]: has ? values.filter(v => v !== id) : [...values, id],
      };
    });
  }

  function updateConfig(key, value) {
    setAiConfig(prev => ({ ...prev, [key]: value }));
  }

  // ── Predictions table ─────────────────────────────────────────
  const predictionColumns = [
    { key: "target", label: "Área / objetivo", render: v => <strong>{v}</strong> },
    { key: "scope", label: "Scope", width: 80, render: v => v === 0 ? "Todos" : `Scope ${v}` },
    { key: "period", label: "Periodo", width: 110, mono: true },
    { key: "predictedKgCO2e", label: "Predicción (kgCO₂e)", mono: true, align: "right", width: 170, render: v => v.toLocaleString("es-MX") },
    { key: "deltaPct", label: "Δ vs último", width: 110, align: "right", render: v => (
      <span style={{
        fontFamily: fm, fontSize: 11.5, fontWeight: 700,
        color: v < 0 ? "var(--eco-success, #16A34A)" : "var(--eco-danger, #DC2626)",
      }}>
        {v > 0 ? "+" : ""}{v}%
      </span>
    ) },
    { key: "confidence", label: "Confianza", width: 130, render: v => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 60, height: 5, borderRadius: 3,
          background: "var(--eco-card-muted)", overflow: "hidden",
        }}>
          <div style={{
            width: `${v * 100}%`, height: "100%",
            background: v >= 0.85 ? "var(--eco-success)" : v >= 0.7 ? "var(--eco-warning)" : "var(--eco-danger)",
          }} />
        </div>
        <span style={{ fontFamily: fm, fontSize: 11.5, fontWeight: 600 }}>
          {Math.round(v * 100)}%
        </span>
      </div>
    ) },
    { key: "generatedAt", label: "Generado", mono: true, width: 150, render: v => fmtDate(v) },
  ];

  // ── Anomalies table ───────────────────────────────────────────
  const anomalyColumns = [
    { key: "target", label: "Origen", render: v => <strong>{v}</strong> },
    { key: "metric", label: "Métrica", width: 130 },
    { key: "observed", label: "Observado", mono: true, align: "right", width: 100 },
    { key: "expected", label: "Esperado", mono: true, align: "right", width: 100 },
    { key: "deviation", label: "Desviación", mono: true, align: "right", width: 110, render: v => (
      <span style={{
        fontFamily: fm, fontSize: 12, fontWeight: 700,
        color: v.startsWith("-") ? "var(--eco-info, #2563EB)" : "var(--eco-danger, #DC2626)",
      }}>
        {v}
      </span>
    ) },
    { key: "severity", label: "Severidad", width: 130, render: v => (
      <AdminStatusBadge variant={SEVERITY_VARIANT[v]} label={SEVERITY_LABEL[v]} />
    ) },
    { key: "status", label: "Estado", width: 110, render: v => (
      <AdminStatusBadge variant={ANOMALY_STATUS_VARIANT[v]} label={ANOMALY_STATUS_LABEL[v]} />
    ) },
    { key: "ts", label: "Detectada", mono: true, width: 150, render: v => fmtDate(v) },
  ];

  // ── Training history table ────────────────────────────────────
  const trainingColumns = [
    { key: "ts", label: "Fecha", mono: true, width: 160, render: v => fmtDate(v) },
    { key: "version", label: "Versión", mono: true, width: 90, render: v => `v${v}` },
    { key: "samples", label: "Muestras", mono: true, align: "right", width: 110, render: v => v.toLocaleString("es-MX") },
    { key: "durationMin", label: "Duración", mono: true, width: 100, render: v => v ? `${v} min` : "—" },
    { key: "accuracy", label: "Accuracy", mono: true, align: "right", width: 100, render: v => v ? `${(v * 100).toFixed(1)}%` : "—" },
    { key: "rmse", label: "RMSE", mono: true, align: "right", width: 80, render: v => v || "—" },
    { key: "status", label: "Estado", width: 110, render: v => (
      <AdminStatusBadge variant={v === "completed" ? "success" : "error"} label={v === "completed" ? "Exitoso" : "Fallido"} />
    ) },
    { key: "triggeredBy", label: "Origen", width: 120 },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={Sparkles}
        title="Inteligencia artificial"
        subtitle="Control, métricas y resultados del motor de IA del sistema."
        breadcrumb={["Soporte", "IA"]}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleRetrain}
              disabled={retraining || !engine.enabled}
              style={{
                ...secondaryBtn,
                opacity: !engine.enabled ? .5 : 1,
                cursor: !engine.enabled || retraining ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw size={13} className={retraining ? "spin" : ""} />
              {retraining ? "Reentrenando…" : "Reentrenar"}
            </button>
            <button
              onClick={toggleEngine}
              style={{
                ...primaryBtn,
                background: engine.enabled ? "var(--eco-danger, #DC2626)" : "var(--eco-primary-500, #22C55E)",
                boxShadow: engine.enabled
                  ? "0 1px 3px rgba(239,68,68,.25)"
                  : "0 1px 3px rgba(34,197,94,.25)",
              }}
            >
              <Power size={13} />
              {engine.enabled ? "Desactivar IA" : "Activar IA"}
            </button>
          </div>
        }
      />

      {/* Status banner */}
      <div style={{
        marginBottom: 18,
        padding: "16px 22px", borderRadius: 12,
        background: engine.enabled
          ? engine.status === "online"
            ? "rgba(34,197,94,.06)"
            : "rgba(202,138,4,.06)"
          : "rgba(239,68,68,.06)",
        border: `1px solid ${
          engine.enabled
            ? engine.status === "online" ? "rgba(34,197,94,.20)" : "rgba(202,138,4,.20)"
            : "rgba(239,68,68,.20)"
        }`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: engine.enabled
            ? engine.status === "online" ? "rgba(34,197,94,.14)" : "rgba(202,138,4,.14)"
            : "rgba(239,68,68,.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Brain size={22} color={
            engine.enabled
              ? engine.status === "online" ? "var(--eco-success, #16A34A)" : "var(--eco-warning, #CA8A04)"
              : "var(--eco-danger, #DC2626)"
          } />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: fd, fontSize: 14.5, fontWeight: 800,
            color: "var(--eco-text)",
          }}>
            {engine.enabled
              ? engine.status === "online" ? "Motor IA en línea" : `Motor en estado: ${engine.status}`
              : "Motor IA desactivado"}
          </div>
          <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 3 }}>
            <strong style={{ fontFamily: fm }}>{engine.modelName} v{engine.modelVersion}</strong>{" · "}
            Último entrenamiento: {fmtDate(engine.lastTrainedAt)}{" · "}
            Latencia: <span style={{ fontFamily: fm }}>{engine.inferenceLatency}</span>
          </div>
        </div>
        <span style={{
          width: 12, height: 12, borderRadius: "50%",
          background: engine.enabled
            ? engine.status === "online" ? "var(--eco-success, #16A34A)" : "var(--eco-warning, #CA8A04)"
            : "var(--eco-danger, #DC2626)",
          boxShadow: "0 0 8px currentColor",
        }} />
      </div>

      <AdminTabs
        tabs={[
          { id: "overview",       label: "Resumen" },
          { id: "data",           label: "Datos" },
          { id: "performance",    label: "Desempeño" },
          { id: "modules",        label: "Módulos IA",      count: modules.length },
          { id: "predictions",    label: "Predicciones",    count: aiPredictions.length },
          { id: "anomalies",      label: "Anomalías",       count: anomalies.length },
          { id: "recommendations",label: "Recomendaciones", count: recommendations.length },
          { id: "alerts",         label: "Alertas IA",      count: aiSmartAlerts.length },
          { id: "training",       label: "Entrenamiento",   count: aiTrainingHistory.length },
          { id: "governance",     label: "Gobierno" },
          { id: "config",         label: "Configuración" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {/* ── Overview ─────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}>
            <MetricCard icon={Sigma}       label="Predicciones totales"  value={aiMetrics.predictionsTotal.toLocaleString("es-MX")} subtitle={`${aiMetrics.predictionsThisMonth} este mes`} accent="#22C55E" />
            <MetricCard icon={AlertTriangle} label="Anomalías detectadas" value={aiMetrics.anomaliesDetected} subtitle="Últimos 30 días" accent="#CA8A04" />
            <MetricCard icon={Lightbulb}   label="Recomendaciones"        value={aiMetrics.recommendationsCount} subtitle="Activas" accent="#7C3AED" />
            <MetricCard icon={Gauge}       label="Accuracy"               value={`${(aiMetrics.averageAccuracy * 100).toFixed(1)}%`} subtitle="Promedio del modelo" accent="#2563EB" />
            <MetricCard icon={BarChart3}   label="MAE"                    value={`${aiMetrics.meanAbsoluteError}%`} subtitle="Error absoluto medio" accent="#0891B2" />
            <MetricCard icon={Activity}    label="Drift"                  value={aiMetrics.driftScore} subtitle="0 = sin desvío" accent="#94A3B8" />
          </div>

          <SectionCard title="Detalle del modelo" icon={Brain}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <Field label="Nombre"             value={engine.modelName} mono />
              <Field label="Versión"             value={`v${engine.modelVersion}`} mono />
              <Field label="Liberado"             value={engine.releasedAt} />
              <Field label="Conjunto de datos"    value={engine.trainingDataset} />
              <Field label="Duración entrenamiento" value={engine.trainingDuration} />
              <Field label="Próximo reentrenamiento" value={fmtDate(engine.nextRetrainAt)} />
              <Field label="Latencia inferencia"   value={engine.inferenceLatency} mono />
              <Field label="Uptime"               value={`${engine.uptimePct}%`} mono />
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <MetricCard icon={FileCheck2} label="Datos completos" value={`${aiDataQuality.completenessPct}%`} subtitle="Registros con campos requeridos" accent="#22C55E" />
            <MetricCard icon={Database} label="Faltantes" value={aiDataQuality.missingRecords} subtitle="Registros por revisar" accent="#CA8A04" />
            <MetricCard icon={AlertTriangle} label="Atípicos" value={aiDataQuality.outliers} subtitle="Pendientes de validación" accent="#DC2626" />
            <MetricCard icon={History} label="Historial" value={aiDataQuality.historyQuality} subtitle={`Auditado ${fmtDate(aiDataQuality.lastAuditAt)}`} accent="#2563EB" />
          </div>

          <SectionCard title="Origen de datos" icon={Database}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {aiDataSources.map(source => (
                <div key={source.id} style={miniPanelStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 800, color: "var(--eco-text)" }}>{source.label}</div>
                      <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>{source.module} · {source.period}</div>
                    </div>
                    <AdminStatusBadge variant="success" label={source.dataType} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {source.variables.map(v => <Chip key={v}>{v}</Chip>)}
                  </div>
                  <ProgressBar value={source.coverage * 100} label="Cobertura" />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Calidad de datos" icon={ClipboardCheck}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {aiDataQuality.checks.map(check => (
                <div key={check.id} style={miniPanelStyle}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 700, color: "var(--eco-text)" }}>{check.label}</span>
                    <AdminStatusBadge variant={check.status === "good" ? "success" : "warning"} label={`${check.value}%`} />
                  </div>
                  <ProgressBar value={check.value} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Field label="Datos validados" value={`${aiDataQuality.validatedRowsPct}%`} mono />
              <Field label="Datos estimados" value={`${aiDataQuality.estimatedRowsPct}%`} mono />
              <Field label="Historial usado" value={aiDataQuality.historyQuality} />
            </div>
          </SectionCard>

          <SectionCard title="Objetivo del modelo" icon={Target}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {aiModelObjectives.map(obj => (
                <div key={obj.id} style={miniPanelStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={15} color="var(--eco-success)" />
                    <span style={{ fontFamily: fd, fontSize: 13, fontWeight: 800, color: "var(--eco-text)" }}>{obj.label}</span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", lineHeight: 1.45 }}>{obj.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "performance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <MetricCard icon={Gauge} label="Precisión" value={`${(aiPerformanceHistory[0].precision * 100).toFixed(1)}%`} subtitle="Clasificación útil" accent="#22C55E" />
            <MetricCard icon={LineChart} label="Recall" value={`${(aiPerformanceHistory[0].recall * 100).toFixed(1)}%`} subtitle="Sensibilidad anomalías" accent="#7C3AED" />
            <MetricCard icon={BarChart3} label="MAE" value={`${aiPerformanceHistory[0].mae}%`} subtitle="Error medio" accent="#0891B2" />
            <MetricCard icon={Activity} label="Drift" value={aiPerformanceHistory[0].drift} subtitle="Estabilidad histórica" accent="#CA8A04" />
          </div>

          <SectionCard title="Rendimiento historico" icon={BarChart3}>
            <AdminDataTable
              columns={[
                { key:"version", label:"Versión", mono:true, width:90, render:v => `v${v}` },
                { key:"period", label:"Periodo", width:110 },
                { key:"accuracy", label:"Accuracy", align:"right", mono:true, render:v => `${(v * 100).toFixed(1)}%` },
                { key:"precision", label:"Precisión", align:"right", mono:true, render:v => `${(v * 100).toFixed(1)}%` },
                { key:"recall", label:"Recall", align:"right", mono:true, render:v => `${(v * 100).toFixed(1)}%` },
                { key:"mae", label:"MAE", align:"right", mono:true, render:v => `${v}%` },
                { key:"rmse", label:"RMSE", align:"right", mono:true },
                { key:"drift", label:"Drift", align:"right", mono:true },
              ]}
              data={aiPerformanceHistory}
              sortable
              compact
            />
          </SectionCard>

          <SectionCard title="Historial de versiones del modelo" icon={GitCompare}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aiModelVersions.map(v => (
                <div key={v.id} style={{ ...miniPanelStyle, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: v.current ? "rgba(34,197,94,.12)" : "var(--eco-card-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GitCompare size={16} color={v.current ? "var(--eco-success)" : "var(--eco-text-soft)"} />
                  </div>
                  <div>
                    <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 800, color: "var(--eco-text)" }}>v{v.version} · {v.date}</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 3 }}>{v.reason}</div>
                  </div>
                  <AdminStatusBadge variant={v.current ? "success" : "neutral"} label={v.current ? "Actual" : v.change} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Modules ──────────────────────────────────────────── */}
      {tab === "modules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "rgba(34,197,94,.06)",
            border: "1px solid rgba(34,197,94,.18)",
            borderRadius: 12, padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: fb, fontSize: 12.5,
            color: "var(--eco-text)",
          }}>
            <Sparkles size={16} color="var(--eco-primary-600)" />
            <div>
              <strong>Activa o desactiva las funciones IA</strong>{" "}
              <span style={{ color: "var(--eco-text-soft)" }}>
                de manera independiente. Los datos históricos se conservan al desactivar un módulo.
              </span>
            </div>
          </div>

          {modules.map(m => {
            const Icon = MODULE_ICON[m.icon] || Sparkles;
            return (
              <div key={m.id} style={{
                background: "var(--eco-card)",
                border: "1px solid var(--eco-border)",
                borderRadius: 12, padding: "14px 20px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: m.enabled
                    ? "rgba(34,197,94,.10)"
                    : "var(--eco-card-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: m.enabled ? 1 : .6,
                }}>
                  <Icon size={18} color={m.enabled ? "var(--eco-primary-600)" : "var(--eco-text-soft)"} />
                </div>
                <div>
                  <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)" }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 4 }}>
                    {m.description}
                  </div>
                </div>
                <button
                  onClick={() => toggleModule(m.id)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none",
                    background: m.enabled ? "var(--eco-primary-500, #22C55E)" : "var(--eco-gray-300, #CBD5E1)",
                    padding: 2, cursor: "pointer",
                    transition: "background .2s",
                  }}
                >
                  <span style={{
                    display: "block", width: 20, height: 20, borderRadius: "50%",
                    background: "white",
                    transform: m.enabled ? "translateX(20px)" : "translateX(0)",
                    transition: "transform .2s",
                    boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Predictions ──────────────────────────────────────── */}
      {tab === "predictions" && (
        <AdminDataTable
          columns={predictionColumns}
          data={aiPredictions}
          sortable
          emptyMessage="No hay predicciones disponibles."
        />
      )}

      {/* ── Anomalies ───────────────────────────────────────── */}
      {tab === "anomalies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AdminDataTable
            columns={anomalyColumns}
            data={anomalies}
            sortable
            emptyMessage="No se han detectado anomalías."
          />
          <SectionCard title="Revisión humana de anomalías" icon={UserCheck}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {anomalies.filter(a => a.status !== "resolved").slice(0, 3).map(a => (
                <div key={a.id} style={miniPanelStyle}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: fd, fontSize: 13, fontWeight: 800, color: "var(--eco-text)" }}>{a.target}</div>
                      <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
                        {a.metric} · desviación {a.deviation}
                      </div>
                    </div>
                    <AdminStatusBadge variant={SEVERITY_VARIANT[a.severity]} label={SEVERITY_LABEL[a.severity]} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    <ReviewButton label="Sí era real" tone="success" onClick={() => updateAnomaly(a.id, "resolved")} />
                    <ReviewButton label="No útil" tone="neutral" onClick={() => updateAnomaly(a.id, "reviewed")} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Recommendations ─────────────────────────────────── */}
      {tab === "recommendations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recommendations.map(r => (
            <div key={r.id} style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 20px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(124,58,237,.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Lightbulb size={18} color="#7C3AED" />
              </div>
              <div>
                <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)" }}>
                  {r.title}
                </div>
                <div style={{
                  fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)",
                  marginTop: 4,
                  display: "flex", flexWrap: "wrap", gap: 12,
                }}>
                  <span><strong>Área:</strong> {r.area}</span>
                  <span><strong>Scope:</strong> {r.scope}</span>
                  <span><strong>Confianza:</strong> {Math.round(r.confidence * 100)}%</span>
                  <span style={{ color: "var(--eco-success, #16A34A)" }}>
                    <strong>Ahorro estimado:</strong> {r.estimatedSavingKgCO2e} kgCO₂e
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <AdminStatusBadge variant={REC_STATUS_VARIANT[r.status]} label={REC_STATUS_LABEL[r.status]} />
                <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
                  {fmtDate(r.ts)}
                </span>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <ReviewButton label="Aprobar" tone="success" onClick={() => updateRecommendation(r.id, "applied")} />
                  <ReviewButton label="Rechazar" tone="danger" onClick={() => updateRecommendation(r.id, "dismissed")} />
                </div>
              </div>
            </div>
          ))}
          <SectionCard title="Observaciones del analista" icon={UserCheck}>
            <textarea
              value={analystNote}
              onChange={e => setAnalystNote(e.target.value)}
              rows={3}
              style={{
                width: "100%", resize: "vertical", borderRadius: 10,
                border: "1px solid var(--eco-border)",
                background: "var(--eco-surface, #fff)",
                color: "var(--eco-text)",
                padding: "10px 12px", fontFamily: fb, fontSize: 13,
                outline: "none",
              }}
            />
          </SectionCard>
        </div>
      )}

      {/* ── Smart Alerts ─────────────────────────────────────── */}
      {tab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {aiSmartAlerts.map(a => (
            <div key={a.id} style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderLeft: `3px solid ${
                a.severity === "critical" ? "var(--eco-danger, #DC2626)"
                : a.severity === "warning" ? "var(--eco-warning, #CA8A04)"
                : "var(--eco-info, #2563EB)"
              }`,
              borderRadius: 12, padding: "14px 18px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: a.severity === "critical" ? "rgba(239,68,68,.10)"
                  : a.severity === "warning" ? "rgba(202,138,4,.10)"
                  : "rgba(37,99,235,.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bell size={17} color={
                  a.severity === "critical" ? "var(--eco-danger, #DC2626)"
                  : a.severity === "warning" ? "var(--eco-warning, #CA8A04)"
                  : "var(--eco-info, #2563EB)"
                } />
              </div>
              <div>
                <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 700, color: "var(--eco-text)" }}>
                  {a.title}
                </div>
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 3 }}>
                  {a.description}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                <AdminStatusBadge variant={SEVERITY_VARIANT[a.severity]} label={SEVERITY_LABEL[a.severity]} />
                <span style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
                  {fmtDate(a.ts)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Training history ──────────────────────────────────── */}
      {tab === "training" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: 12, padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center", gap: 12,
          }}>
            <div>
              <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)" }}>
                Reentrenamiento del modelo
              </div>
              <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 4 }}>
                Próximo programado: <strong>{fmtDate(engine.nextRetrainAt)}</strong>{" · "}
                Frecuencia: mensual.
              </div>
            </div>
            <button onClick={handleRetrain} disabled={retraining || !engine.enabled} style={{
              ...primaryBtn,
              opacity: !engine.enabled ? .5 : 1,
            }}>
              <RefreshCw size={13} className={retraining ? "spin" : ""} />
              {retraining ? "Reentrenando…" : "Reentrenar ahora"}
            </button>
          </div>
          <SectionCard title="Control de entrenamiento" icon={RefreshCw}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Field label="Último entrenamiento" value={fmtDate(engine.lastTrainedAt)} />
              <Field label="Ejecutado por" value={aiTrainingHistory[0].triggeredBy} />
              <Field label="Duración" value={engine.trainingDuration} />
              <Field label="Versión de datos" value="dataset-2026-Q1-validado" mono />
              <Field label="Estado" value={aiTrainingHistory[0].status === "completed" ? "Exitoso" : "Fallido"} />
            </div>
          </SectionCard>
          <AdminDataTable
            columns={trainingColumns}
            data={aiTrainingHistory}
            sortable
            emptyMessage="Sin entrenamientos registrados."
          />
        </div>
      )}

      {tab === "governance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Trazabilidad de resultados" icon={Layers}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aiTraceabilityItems.map(item => (
                <div key={item.id} style={miniPanelStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 800, color: "var(--eco-text)" }}>{item.result}</div>
                      <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
                        {item.sourceModule} · {item.period} · {item.reviewedData}
                      </div>
                    </div>
                    <AdminStatusBadge variant="info" label="explicable" />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {item.topVariables.map(v => <Chip key={v}>{v}</Chip>)}
                  </div>
                  <p style={{ margin: "10px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text)", lineHeight: 1.45 }}>{item.explanation}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Permisos del módulo" icon={ShieldCheck}>
            <AdminDataTable
              columns={[
                { key:"action", label:"Acción", render:v => <strong>{v}</strong> },
                { key:"admin", label:"Admin", align:"center", render:v => <PermissionDot allowed={v} /> },
                { key:"directivo", label:"Directivo", align:"center", render:v => <PermissionDot allowed={v} /> },
                { key:"operativo", label:"Operativo", align:"center", render:v => <PermissionDot allowed={v} /> },
                { key:"consulta", label:"Consulta", align:"center", render:v => <PermissionDot allowed={v} /> },
              ]}
              data={aiPermissionsMatrix}
              compact
            />
          </SectionCard>

          <SectionCard title="Seguridad y límites" icon={Lock}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {aiSecurityLimits.map(limit => (
                <Field key={limit.id} label={limit.label} value={limit.value} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Registro de uso del módulo" icon={History}>
            <AdminDataTable
              columns={[
                { key:"ts", label:"Fecha", mono:true, render:v => fmtDate(v), width:150 },
                { key:"user", label:"Usuario", width:150 },
                { key:"module", label:"Módulo", width:130 },
                { key:"action", label:"Acción" },
                { key:"outcome", label:"Resultado" },
              ]}
              data={aiUsageLog}
              compact
            />
          </SectionCard>
        </div>
      )}

      {/* ── Config ───────────────────────────────────────────── */}
      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Configuración editable de IA" icon={SlidersHorizontal}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <EditablePanel title="Variables usadas por el modelo" hint="Afecta nuevos análisis y próximos entrenamientos.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {AI_VARIABLE_OPTIONS.map(opt => (
                    <ToggleChip
                      key={opt.id}
                      active={aiConfig.variables.includes(opt.id)}
                      onClick={() => toggleConfigList("variables", opt.id)}
                    >
                      {opt.label}
                    </ToggleChip>
                  ))}
                </div>
              </EditablePanel>

              <EditablePanel title="Periodo de datos" hint="Ventana usada para nuevas inferencias.">
                <SegmentGroup
                  options={PERIOD_OPTIONS}
                  value={aiConfig.periodRange}
                  onChange={value => updateConfig("periodRange", value)}
                />
              </EditablePanel>

              <EditablePanel title="Tipo de datos" hint="Define si se consideran reales, estimados o ambos.">
                <SegmentGroup
                  options={DATA_MODE_OPTIONS}
                  value={aiConfig.dataMode}
                  onChange={value => updateConfig("dataMode", value)}
                />
              </EditablePanel>

              <EditablePanel title="Sensibilidad de alertas" hint="Mayor sensibilidad detecta más anomalías, con más falsos positivos.">
                <RangeControl
                  value={aiConfig.alertSensitivity}
                  onChange={value => updateConfig("alertSensitivity", value)}
                  min={30}
                  max={95}
                  suffix="%"
                />
              </EditablePanel>
            </div>
          </SectionCard>

          <SectionCard title="Entrenamiento y modelo" icon={RefreshCw}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              <EditablePanel title="Quién puede reentrenar" hint="Permiso operativo, no cambia entrenamientos ya registrados.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {VISIBILITY_OPTIONS.map(role => (
                    <ToggleChip
                      key={role.id}
                      active={aiConfig.canRetrain.includes(role.id)}
                      onClick={() => toggleConfigList("canRetrain", role.id)}
                    >
                      {role.label}
                    </ToggleChip>
                  ))}
                </div>
              </EditablePanel>

              <EditablePanel title="Programación de entrenamiento" hint="Aplica para futuros entrenamientos automáticos.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 }}>
                  <select
                    value={aiConfig.scheduleFrequency}
                    onChange={e => updateConfig("scheduleFrequency", e.target.value)}
                    style={selectStyle}
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                  </select>
                  <input
                    type="time"
                    value={aiConfig.scheduleTime}
                    onChange={e => updateConfig("scheduleTime", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </EditablePanel>

              <EditablePanel title="Modelo activo" hint="Selección preparada para futuros modelos disponibles.">
                <select
                  value={aiConfig.selectedModel}
                  onChange={e => updateConfig("selectedModel", e.target.value)}
                  style={selectStyle}
                >
                  {MODEL_OPTIONS.map(model => (
                    <option key={model.id} value={model.id}>{model.label}</option>
                  ))}
                </select>
              </EditablePanel>

              <EditablePanel title="Tipos de recomendaciones" hint="Controla qué nuevas sugerencias puede generar la IA.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {RECOMMENDATION_TYPE_OPTIONS.map(opt => (
                    <ToggleChip
                      key={opt.id}
                      active={aiConfig.recommendationTypes.includes(opt.id)}
                      onClick={() => toggleConfigList("recommendationTypes", opt.id)}
                    >
                      {opt.label}
                    </ToggleChip>
                  ))}
                </div>
              </EditablePanel>
            </div>
          </SectionCard>

          <SectionCard title="Visibilidad de resultados IA" icon={Eye}>
            <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text-soft)", marginBottom: 12 }}>
              Selecciona los roles que pueden ver predicciones, anomalías y recomendaciones generadas por IA.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {VISIBILITY_OPTIONS.map(role => {
                const visible = engine.visibleTo.includes(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => toggleVisibility(role.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 14px", borderRadius: 10,
                      border: `1px solid ${visible ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
                      background: visible ? "rgba(34,197,94,.08)" : "var(--eco-card)",
                      fontFamily: fb, fontSize: 13, fontWeight: 600,
                      color: visible ? "var(--eco-primary-700, #15803D)" : "var(--eco-text)",
                      cursor: "pointer",
                    }}
                  >
                    {visible ? <Eye size={14} /> : <EyeOff size={14} color="var(--eco-text-soft)" />}
                    {role.label}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Límites de uso y visibilidad" icon={Lock}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <EditablePanel title="Límite aplicado a consultas" hint="Controla el alcance de nuevas consultas IA.">
                <select
                  value={aiConfig.usageLimit}
                  onChange={e => updateConfig("usageLimit", e.target.value)}
                  style={selectStyle}
                >
                  <option value="role-area-period">Rol, área y periodo</option>
                  <option value="role-campus-period">Rol, campus y periodo</option>
                  <option value="admin-only">Solo administradores</option>
                </select>
              </EditablePanel>
              <ReadOnlyNotice
                title="Resultados protegidos"
                text="Predicciones, métricas, versiones, bitácora e historial no se editan aquí. Solo se consultan en Datos, Desempeño, Entrenamiento y Gobierno."
              />
            </div>
          </SectionCard>
        </div>
      )}

      <AdminConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.description}
        danger={confirm?.danger}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1.2s linear infinite; }
      `}</style>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, subtitle, accent }) {
  return (
    <div style={{
      background: "var(--eco-card)",
      border: "1px solid var(--eco-border)",
      borderRadius: 12, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accent || "var(--eco-primary-500, #22C55E)",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {Icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${accent}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={15} color={accent} />
          </div>
        )}
        <span style={{
          fontFamily: fb, fontSize: 11, fontWeight: 600,
          color: "var(--eco-text-soft)",
          textTransform: "uppercase", letterSpacing: ".05em",
        }}>{label}</span>
      </div>
      <div style={{ fontFamily: fm, fontSize: 22, fontWeight: 700, color: "var(--eco-text)" }}>{value}</div>
      {subtitle && (
        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: "var(--eco-card)",
      border: "1px solid var(--eco-border)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--eco-border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {Icon && <Icon size={15} color="var(--eco-primary-500, #22C55E)" />}
        <span style={{
          fontFamily: fb, fontSize: 13, fontWeight: 600,
          color: "var(--eco-text)",
          textTransform: "uppercase", letterSpacing: ".04em",
        }}>{title}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 9,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border)",
    }}>
      <div style={{
        fontFamily: fb, fontSize: 10.5, fontWeight: 600,
        color: "var(--eco-text-soft)",
        textTransform: "uppercase", letterSpacing: ".05em",
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? fm : fb,
        fontSize: 13.5, fontWeight: 600,
        color: "var(--eco-text)", marginTop: 4,
        wordBreak: "break-word",
      }}>{value}</div>
    </div>
  );
}

function EditablePanel({ title, hint, children }) {
  return (
    <div style={miniPanelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: fd, fontSize: 13, fontWeight: 800, color: "var(--eco-text)" }}>{title}</div>
          {hint && (
            <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3, lineHeight: 1.35 }}>
              {hint}
            </div>
          )}
        </div>
        <AdminStatusBadge variant="info" label="Editable" dot={false} />
      </div>
      {children}
    </div>
  );
}

function ReadOnlyNotice({ title, text }) {
  return (
    <div style={{
      ...miniPanelStyle,
      background: "var(--eco-card-muted, #F8FAFC)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Lock size={14} color="var(--eco-text-soft)" />
        <span style={{ fontFamily: fd, fontSize: 13, fontWeight: 800, color: "var(--eco-text)" }}>{title}</span>
      </div>
      <p style={{ margin: "8px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", lineHeight: 1.45 }}>
        {text}
      </p>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 8px", borderRadius: 999,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border)",
      fontFamily: fm, fontSize: 10.5, fontWeight: 700,
      color: "var(--eco-text-soft)",
    }}>
      {children}
    </span>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "7px 10px", borderRadius: 999,
      border: `1px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
      background: active ? "rgba(34,197,94,.10)" : "var(--eco-card)",
      color: active ? "var(--eco-primary-700, #15803D)" : "var(--eco-text)",
      fontFamily: fb, fontSize: 12, fontWeight: 700,
      cursor: "pointer",
      transition: "all .15s",
    }}>
      {active ? <CheckCircle2 size={13} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: "1px solid var(--eco-border)" }} />}
      {children}
    </button>
  );
}

function SegmentGroup({ options, value, onChange }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      gap: 6,
    }}>
      {options.map(option => {
        const active = option.id === value;
        return (
          <button key={option.id} onClick={() => onChange?.(option.id)} style={{
            padding: "8px 10px", borderRadius: 8,
            border: `1px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
            background: active ? "rgba(34,197,94,.10)" : "var(--eco-card)",
            color: active ? "var(--eco-primary-700, #15803D)" : "var(--eco-text-soft)",
            fontFamily: fb, fontSize: 11.5, fontWeight: 700,
            cursor: "pointer",
          }}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function RangeControl({ value, onChange, min = 0, max = 100, suffix = "" }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>Nivel</span>
        <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 800, color: "var(--eco-text)" }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange?.(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--eco-primary-500)" }}
      />
    </div>
  );
}

function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ marginTop: 12 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>{label}</span>
          <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-text)", fontWeight: 700 }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ height: 6, borderRadius: 999, background: "var(--eco-card-muted)", overflow: "hidden", border: "1px solid var(--eco-border)" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: pct >= 88 ? "var(--eco-success)" : pct >= 70 ? "var(--eco-warning)" : "var(--eco-danger)",
        }} />
      </div>
    </div>
  );
}

function ReviewButton({ label, tone = "neutral", onClick }) {
  const styles = {
    success: { color: "var(--eco-success)", background: "var(--eco-success-bg)", border: "rgba(34,197,94,.24)" },
    danger: { color: "var(--eco-danger)", background: "var(--eco-danger-bg)", border: "rgba(239,68,68,.24)" },
    neutral: { color: "var(--eco-text)", background: "var(--eco-card-muted)", border: "var(--eco-border)" },
  };
  const s = styles[tone] || styles.neutral;
  return (
    <button onClick={onClick} style={{
      padding: "5px 9px", borderRadius: 7,
      border: `1px solid ${s.border}`,
      background: s.background,
      color: s.color,
      fontFamily: fb, fontSize: 11.5, fontWeight: 700,
      cursor: "pointer",
    }}>
      {label}
    </button>
  );
}

function PermissionDot({ allowed }) {
  return allowed
    ? <CheckCircle2 size={15} color="var(--eco-success)" />
    : <XCircle size={15} color="var(--eco-text-soft)" />;
}

const miniPanelStyle = {
  background: "var(--eco-card)",
  border: "1px solid var(--eco-border)",
  borderRadius: 12,
  padding: "14px 16px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid var(--eco-border)",
  background: "var(--eco-surface, #fff)",
  color: "var(--eco-text)",
  borderRadius: 8,
  padding: "8px 10px",
  fontFamily: fb,
  fontSize: 12.5,
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const primaryBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
  fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 1px 3px rgba(34,197,94,.25)",
};

const secondaryBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "7px 14px", borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)", color: "var(--eco-text)",
  fontFamily: fb, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
};
