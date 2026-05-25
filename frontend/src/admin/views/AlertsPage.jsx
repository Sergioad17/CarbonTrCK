import React from "react";
import {
  Activity, AlertTriangle, Bell, Clock, Edit3, Flag, Mail, MessageSquare,
  Play, Plus, RefreshCw, Smartphone, Trash2, Users, Webhook, X,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import AdminEmptyState from "../components/AdminEmptyState";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { AdminSelectField, AdminTextField, AdminToggleField } from "../components/AdminFormSection";
import {
  createAdminAlertRule,
  createAdminAlertTemplate,
  deleteAdminAlertRule,
  deleteAdminAlertTemplate,
  fetchAdminAlerts,
  runAdminAlertRule,
  updateAdminAlertRule,
  updateAdminAlertRuleStatus,
  updateAdminAlertTemplate,
} from "../../api/admin";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const SEVERITY = {
  critical: { variant: "error", label: "Crítica" },
  warning: { variant: "warning", label: "Advertencia" },
  info: { variant: "info", label: "Info" },
};

const CHANNEL_ICONS = { email: Mail, push: Bell, inapp: MessageSquare, sms: Smartphone, webhook: Webhook };

const PRIORITY = {
  high: { color: "#DC2626", label: "Alta" },
  normal: { color: "#2563EB", label: "Normal" },
  low: { color: "#64748B", label: "Baja" },
};

const FREQUENCY_OPTIONS = [
  { value: "immediate", label: "Inmediata" },
  { value: "hourly", label: "Por hora" },
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
];
const FREQUENCY_LABEL = Object.fromEntries(FREQUENCY_OPTIONS.map((o) => [o.value, o.label]));

const TYPE_OPTIONS = [
  { value: "device", label: "Dispositivo" },
  { value: "anomaly", label: "Anomalía" },
  { value: "factor", label: "Factor" },
  { value: "period", label: "Periodo" },
  { value: "goal", label: "Meta" },
  { value: "validation", label: "Validación" },
  { value: "security", label: "Seguridad" },
  { value: "system", label: "Sistema" },
  { value: "custom", label: "Personalizado" },
];

const CONDITION_HINTS = {
  device: { label: "Horas sin reporte", key: "hours", suffix: "h" },
  validation: { label: "Días pendiente", key: "days", suffix: "d" },
  period: { label: "Días antes del cierre", key: "days", suffix: "d" },
  anomaly: { label: "Variación vs promedio (%)", key: "percent", suffix: "%" },
  security: { label: "Intentos en ventana", key: "attempts", suffix: "intentos" },
};

const EMPTY_RULE = {
  name: "",
  type: "device",
  condition: "",
  conditionJson: {},
  severity: "warning",
  priority: "normal",
  frequency: "immediate",
  channels: ["inapp"],
  recipients: [],
  enabled: true,
  triggeredCount: 0,
  templateId: "",
  webhookUrl: "",
  cooldownMinutes: "",
  quietHoursStart: "",
  quietHoursEnd: "",
};

const EMPTY_TEMPLATE = {
  code: "",
  name: "",
  channel: "email",
  subject: "",
  body: "",
  variables: [],
  enabled: true,
};

function normalize(input = {}) {
  return {
    rules: Array.isArray(input.rules) ? input.rules : [],
    templates: Array.isArray(input.templates) ? input.templates : [],
    history: Array.isArray(input.history) ? input.history : [],
    channels: Array.isArray(input.channels) ? input.channels : [],
    metrics: input.metrics && typeof input.metrics === "object" ? input.metrics : {},
  };
}

function MetricCard({ label, value, hint, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 140,
      padding: "12px 14px", borderRadius: 10,
      background: "var(--eco-card)", border: "1px solid var(--eco-border)",
    }}>
      <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontFamily: fm, fontSize: 22, fontWeight: 800, color: accent || "var(--eco-text-strong)", marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

export default function AlertsPage() {
  const [data, setData] = React.useState(() => normalize());
  const [tab, setTab] = React.useState("rules");
  const [modalRule, setModalRule] = React.useState(null);
  const [modalTemplate, setModalTemplate] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [recipientDraft, setRecipientDraft] = React.useState("");
  const [variableDraft, setVariableDraft] = React.useState("");

  const channels = data.channels.length > 0 ? data.channels : [
    { id: "inapp", label: "En la app" },
    { id: "email", label: "Correo" },
    { id: "webhook", label: "Webhook" },
  ];

  const loadAlerts = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(normalize(await fetchAdminAlerts()));
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadAlerts(); }, [loadAlerts]);

  function upsertRule(rule) {
    setData((c) => ({
      ...c,
      rules: c.rules.some((r) => r.id === rule.id)
        ? c.rules.map((r) => (r.id === rule.id ? rule : r))
        : [rule, ...c.rules],
    }));
  }
  function upsertTemplate(tpl) {
    setData((c) => ({
      ...c,
      templates: c.templates.some((t) => t.id === tpl.id)
        ? c.templates.map((t) => (t.id === tpl.id ? tpl : t))
        : [tpl, ...c.templates],
    }));
  }

  function addRecipient() {
    const v = recipientDraft.trim();
    if (!v || !modalRule) return;
    if (modalRule.recipients.includes(v)) { setRecipientDraft(""); return; }
    setModalRule((c) => ({ ...c, recipients: [...(c.recipients || []), v] }));
    setRecipientDraft("");
  }
  function removeRecipient(r) {
    setModalRule((c) => ({ ...c, recipients: c.recipients.filter((x) => x !== r) }));
  }
  function addVariable() {
    const v = variableDraft.trim();
    if (!v || !modalTemplate) return;
    if (modalTemplate.variables.includes(v)) { setVariableDraft(""); return; }
    setModalTemplate((c) => ({ ...c, variables: [...(c.variables || []), v] }));
    setVariableDraft("");
  }
  function removeVariable(v) {
    setModalTemplate((c) => ({ ...c, variables: c.variables.filter((x) => x !== v) }));
  }

  async function handleSaveRule() {
    if (!modalRule || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...modalRule,
        cooldownMinutes: modalRule.cooldownMinutes === "" ? null : Number(modalRule.cooldownMinutes),
        quietHoursStart: modalRule.quietHoursStart === "" ? null : Number(modalRule.quietHoursStart),
        quietHoursEnd: modalRule.quietHoursEnd === "" ? null : Number(modalRule.quietHoursEnd),
        templateId: modalRule.templateId || null,
        webhookUrl: modalRule.webhookUrl || null,
      };
      const saved = modalRule.id
        ? await updateAdminAlertRule(modalRule.id, payload)
        : await createAdminAlertRule(payload);
      upsertRule(saved);
      setModalRule(null);
    } catch (e) {
      setError(e?.message || "No se pudo guardar la regla.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTemplate() {
    if (!modalTemplate || saving) return;
    setSaving(true);
    setError("");
    try {
      const saved = modalTemplate.id
        ? await updateAdminAlertTemplate(modalTemplate.id, modalTemplate)
        : await createAdminAlertTemplate(modalTemplate);
      upsertTemplate(saved);
      setModalTemplate(null);
    } catch (e) {
      setError(e?.message || "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(id) {
    setModalRule((c) => ({
      ...c,
      channels: c.channels.includes(id) ? c.channels.filter((x) => x !== id) : [...c.channels, id],
    }));
  }

  async function toggleRule(rule) {
    const next = !rule.enabled;
    setData((c) => ({ ...c, rules: c.rules.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)) }));
    try {
      const updated = await updateAdminAlertRuleStatus(rule.id, next);
      upsertRule(updated);
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el estado.");
      setData((c) => ({ ...c, rules: c.rules.map((r) => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)) }));
    }
  }

  async function handleRunRule(rule) {
    try { await runAdminAlertRule(rule.id); loadAlerts(); }
    catch (e) { setError(e?.message || "No se pudo ejecutar la regla."); }
  }

  async function handleDeleteRule(rule) {
    if (!window.confirm(`Eliminar la regla "${rule.name}"?`)) return;
    try {
      await deleteAdminAlertRule(rule.id);
      setData((c) => ({ ...c, rules: c.rules.filter((r) => r.id !== rule.id) }));
    } catch (e) { setError(e?.message || "No se pudo eliminar."); }
  }

  async function handleDeleteTemplate(template) {
    if (!window.confirm(`Eliminar la plantilla "${template.name}"?`)) return;
    try {
      await deleteAdminAlertTemplate(template.id);
      setData((c) => ({ ...c, templates: c.templates.filter((t) => t.id !== template.id) }));
    } catch (e) { setError(e?.message || "No se pudo eliminar."); }
  }

  const ruleColumns = [
    { key: "name", label: "Regla", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)", fontFamily: fm }}>{row.condition}</div>
      </div>
    ) },
    { key: "type", label: "Tipo", width: 100 },
    { key: "priority", label: "Prioridad", width: 100, render: (v) => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11, fontWeight: 700,
        padding: "3px 9px", borderRadius: 12,
        background: `${PRIORITY[v]?.color || "#64748B"}18`, color: PRIORITY[v]?.color || "#64748B",
      }}><Flag size={10} /> {PRIORITY[v]?.label || v}</span>
    ) },
    { key: "frequency", label: "Frecuencia", width: 100, render: (v) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
        <Clock size={10} /> {FREQUENCY_LABEL[v] || v}
      </span>
    ) },
    { key: "severity", label: "Severidad", width: 110, render: (v) => (
      <AdminStatusBadge variant={SEVERITY[v]?.variant} label={SEVERITY[v]?.label || v} />
    ) },
    { key: "channels", label: "Canales", width: 140, render: (v = []) => (
      <div style={{ display: "flex", gap: 5 }}>
        {v.map((id) => {
          const Icon = CHANNEL_ICONS[id] || Bell;
          const label = channels.find((c) => c.id === id)?.label || id;
          return (
            <span key={id} title={label} style={{
              width: 24, height: 24, borderRadius: 6, background: "var(--eco-card-muted)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "var(--eco-text-soft)",
            }}><Icon size={12} /></span>
          );
        })}
      </div>
    ) },
    { key: "triggeredCount", label: "Disparos", mono: true, align: "right", width: 80 },
    { key: "deliveryFailures", label: "Fallos", mono: true, align: "right", width: 70, render: (v) => (
      <span style={{ color: Number(v) > 0 ? "var(--eco-danger, #DC2626)" : "var(--eco-text-soft)" }}>{Number(v) || 0}</span>
    ) },
    { key: "enabled", label: "Estado", width: 70, render: (v, row) => (
      <button onClick={(e) => { e.stopPropagation(); toggleRule(row); }} style={{
        width: 36, height: 20, borderRadius: 10, border: "none", padding: 2, cursor: "pointer", display: "block",
        background: v ? "var(--eco-primary-500, #22C55E)" : "var(--eco-gray-300, #CBD5E1)",
      }}>
        <span style={{
          display: "block", width: 16, height: 16, borderRadius: "50%", background: "white",
          transform: v ? "translateX(16px)" : "translateX(0)", transition: "transform .2s",
          boxShadow: "0 1px 2px rgba(0,0,0,.25)",
        }} />
      </button>
    ) },
    { key: "_actions", label: "", width: 110, render: (_, row) => (
      <div style={{ display: "flex", gap: 4 }}>
        <button title="Ejecutar ahora" onClick={(e) => { e.stopPropagation(); handleRunRule(row); }}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--eco-text-soft)", padding: 4 }}>
          <Play size={14} />
        </button>
        <button title="Editar" onClick={(e) => {
          e.stopPropagation();
          setModalRule({
            ...row,
            channels: [...row.channels],
            recipients: [...row.recipients],
            cooldownMinutes: row.cooldownMinutes ?? "",
            quietHoursStart: row.quietHoursStart ?? "",
            quietHoursEnd: row.quietHoursEnd ?? "",
            templateId: row.templateId || "",
            webhookUrl: row.webhookUrl || "",
            conditionJson: row.conditionJson || {},
          });
        }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--eco-text-soft)", padding: 4 }}>
          <Edit3 size={14} />
        </button>
        <button title="Eliminar" onClick={(e) => { e.stopPropagation(); handleDeleteRule(row); }}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--eco-danger, #DC2626)", padding: 4 }}>
          <Trash2 size={14} />
        </button>
      </div>
    ) },
  ];

  const templateColumns = [
    { key: "name", label: "Plantilla", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)", fontFamily: fm }}>{row.code}</div>
      </div>
    ) },
    { key: "channel", label: "Canal", width: 100 },
    { key: "subject", label: "Asunto", mono: true },
    { key: "enabled", label: "Estado", width: 80, render: (v) => (
      <AdminStatusBadge variant={v ? "success" : "neutral"} label={v ? "Activa" : "Inactiva"} />
    ) },
    { key: "_actions", label: "", width: 80, render: (_, row) => (
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={(e) => { e.stopPropagation(); setModalTemplate({ ...row, variables: [...(row.variables || [])] }); }}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--eco-text-soft)", padding: 4 }}>
          <Edit3 size={14} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(row); }}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--eco-danger, #DC2626)", padding: 4 }}>
          <Trash2 size={14} />
        </button>
      </div>
    ) },
  ];

  const historyColumns = [
    { key: "ts", label: "Fecha", mono: true, width: 150, render: (v) => new Date(v).toLocaleString() },
    { key: "title", label: "Notificación" },
    { key: "channel", label: "Canal", width: 90 },
    { key: "recipients", label: "Dest.", mono: true, align: "right", width: 60 },
    { key: "status", label: "Estado", width: 110, render: (v) => (
      <AdminStatusBadge
        variant={v === "sent" ? "success" : v === "skipped" ? "neutral" : v === "archived" ? "neutral" : "error"}
        label={v === "sent" ? "Enviado" : v === "failed" ? "Falló" : v === "skipped" ? "Omitido" : v === "bounced" ? "Rebotó" : v === "archived" ? "Archivado" : v}
      />
    ) },
    { key: "error", label: "Detalle", render: (v) => v ? (
      <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-danger, #DC2626)" }}>{v}</span>
    ) : null },
  ];

  if (loading) return <AdminLoadingScreen />;

  const conditionHint = modalRule ? CONDITION_HINTS[modalRule.type] : null;
  const m = data.metrics || {};

  return (
    <div>
      <AdminPageHeader
        icon={Bell}
        title="Alertas y notificaciones"
        subtitle="Motor de reglas, plantillas, entregas multicanal e historial."
        breadcrumb={["Control", "Alertas"]}
        actions={tab === "rules" ? (
          <button onClick={() => setModalRule({ ...EMPTY_RULE })} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--eco-primary-500, #22C55E)", color: "#fff",
            fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(34,197,94,.25)",
          }}><Plus size={14} /> Nueva regla</button>
        ) : tab === "templates" ? (
          <button onClick={() => setModalTemplate({ ...EMPTY_TEMPLATE })} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--eco-primary-500, #22C55E)", color: "#fff",
            fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}><Plus size={14} /> Nueva plantilla</button>
        ) : null}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <MetricCard label="Enviadas" value={m.sent || 0} accent="var(--eco-primary-600, #16A34A)" hint={`Últimas 24h: ${m.last24h || 0}`} />
        <MetricCard label="Fallidas" value={m.failed || 0} accent="var(--eco-danger, #DC2626)" />
        <MetricCard label="Omitidas" value={m.skipped || 0} hint="Canales sin proveedor" />
        <MetricCard label="Email" value={m.emailSent || 0} hint="vía Resend" />
        <MetricCard label="In-app" value={m.inappSent || 0} />
        <MetricCard label="Webhook" value={m.webhookSent || 0} />
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "10px 12px", marginBottom: 14, borderRadius: 8,
          background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.18)",
          color: "var(--eco-danger, #DC2626)", fontFamily: fb, fontSize: 13,
        }}>
          <span>{error}</span>
          <button onClick={loadAlerts} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "inherit", fontFamily: fb, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <AdminTabs
        tabs={[
          { id: "rules", label: "Reglas", count: data.rules.length },
          { id: "templates", label: "Plantillas", count: data.templates.length },
          { id: "history", label: "Historial", count: data.history.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "rules" && (
        data.rules.length > 0
          ? <AdminDataTable columns={ruleColumns} data={data.rules} sortable />
          : <AdminEmptyState icon={AlertTriangle} title="Sin reglas configuradas" description="Crea una regla para activar el monitoreo." />
      )}
      {tab === "templates" && (
        data.templates.length > 0
          ? <AdminDataTable columns={templateColumns} data={data.templates} sortable />
          : <AdminEmptyState icon={Activity} title="Sin plantillas" description="Crea una plantilla para reutilizar contenido en tus reglas." />
      )}
      {tab === "history" && (
        <AdminDataTable columns={historyColumns} data={data.history} emptyMessage="Sin entregas registradas" sortable />
      )}

      <AdminFormModal
        open={!!modalRule}
        onClose={() => setModalRule(null)}
        title={modalRule?.id ? "Editar regla de alerta" : "Nueva regla de alerta"}
        onSave={handleSaveRule}
        saving={saving}
        width={620}
      >
        {modalRule && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Nombre" required value={modalRule.name}
                onChange={(v) => setModalRule((c) => ({ ...c, name: v }))} />
            </div>
            <AdminSelectField label="Tipo" value={modalRule.type}
              onChange={(v) => setModalRule((c) => ({ ...c, type: v }))} options={TYPE_OPTIONS} />
            <AdminSelectField label="Severidad" value={modalRule.severity}
              onChange={(v) => setModalRule((c) => ({ ...c, severity: v }))}
              options={[{ value: "info", label: "Info" }, { value: "warning", label: "Advertencia" }, { value: "critical", label: "Crítica" }]} />
            <AdminSelectField label="Prioridad" value={modalRule.priority}
              onChange={(v) => setModalRule((c) => ({ ...c, priority: v }))}
              options={[{ value: "low", label: "Baja" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }]} />
            <AdminSelectField label="Frecuencia de envío" value={modalRule.frequency}
              onChange={(v) => setModalRule((c) => ({ ...c, frequency: v }))} options={FREQUENCY_OPTIONS} />

            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Etiqueta de condición (legible)" value={modalRule.condition}
                onChange={(v) => setModalRule((c) => ({ ...c, condition: v }))}
                placeholder="ej: delta > 30% vs media" required />
            </div>

            {conditionHint && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)", marginBottom: 6 }}>
                  Umbral estructurado · {conditionHint.label}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number" inputMode="numeric"
                    value={modalRule.conditionJson?.[conditionHint.key] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : Number(e.target.value);
                      setModalRule((c) => ({
                        ...c,
                        conditionJson: { ...c.conditionJson, [conditionHint.key]: value },
                      }));
                    }}
                    style={{
                      width: 140, padding: "8px 12px", fontFamily: fm, fontSize: 13,
                      background: "var(--eco-surface)", color: "var(--eco-text)",
                      border: "1px solid var(--eco-border)", borderRadius: 8,
                    }}
                  />
                  <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>{conditionHint.suffix}</span>
                </div>
              </div>
            )}

            {modalRule.type === "security" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)", marginBottom: 6 }}>
                  Ventana (minutos)
                </div>
                <input type="number" min={1} value={modalRule.conditionJson?.minutes ?? ""}
                  onChange={(e) => setModalRule((c) => ({ ...c, conditionJson: { ...c.conditionJson, minutes: e.target.value === "" ? null : Number(e.target.value) } }))}
                  style={{ width: 140, padding: "8px 12px", fontFamily: fm, fontSize: 13, background: "var(--eco-surface)", border: "1px solid var(--eco-border)", borderRadius: 8 }} />
              </div>
            )}

            <AdminSelectField
              label="Plantilla (opcional)"
              value={modalRule.templateId || ""}
              onChange={(v) => setModalRule((c) => ({ ...c, templateId: v }))}
              options={[{ value: "", label: "— Automática —" }, ...data.templates.map((t) => ({ value: t.id, label: t.name }))]}
            />
            <div>
              <AdminTextField
                label="Cooldown (min)"
                value={modalRule.cooldownMinutes}
                onChange={(v) => setModalRule((c) => ({ ...c, cooldownMinutes: v }))}
                placeholder="Opcional · sobreescribe frecuencia"
              />
            </div>
            <div>
              <AdminTextField label="Quiet hours · inicio (0-23)" value={modalRule.quietHoursStart}
                onChange={(v) => setModalRule((c) => ({ ...c, quietHoursStart: v }))} placeholder="ej: 22" />
            </div>
            <div>
              <AdminTextField label="Quiet hours · fin (0-23)" value={modalRule.quietHoursEnd}
                onChange={(v) => setModalRule((c) => ({ ...c, quietHoursEnd: v }))} placeholder="ej: 7" />
            </div>

            {modalRule.channels.includes("webhook") && (
              <div style={{ gridColumn: "1 / -1" }}>
                <AdminTextField label="Webhook URL" value={modalRule.webhookUrl}
                  onChange={(v) => setModalRule((c) => ({ ...c, webhookUrl: v }))}
                  placeholder="https://hooks.slack.com/services/..." />
              </div>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)", marginBottom: 6 }}>Destinatarios</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input value={recipientDraft} onChange={(e) => setRecipientDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRecipient())}
                  placeholder="Email, rol o nombre"
                  style={{ flex: 1, padding: "8px 12px", fontFamily: fb, fontSize: 12.5,
                    background: "var(--eco-surface)", color: "var(--eco-text)",
                    border: "1px solid var(--eco-border)", borderRadius: 8, outline: "none" }} />
                <button type="button" onClick={addRecipient} style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
                  fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Agregar</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(modalRule.recipients || []).length === 0 ? (
                  <span style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin destinatarios · se enviarán a los admins.
                  </span>
                ) : modalRule.recipients.map((r) => (
                  <span key={r} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 14,
                    background: "var(--eco-card-muted)", border: "1px solid var(--eco-border)",
                    fontFamily: fb, fontSize: 11.5, fontWeight: 500, color: "var(--eco-text)",
                  }}>
                    <Users size={11} /> {r}
                    <button type="button" onClick={() => removeRecipient(r)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--eco-text-soft)", padding: 0, display: "flex" }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)", marginBottom: 6 }}>Canales de envío</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {channels.map((ch) => {
                  const active = modalRule.channels.includes(ch.id);
                  const Icon = CHANNEL_ICONS[ch.id] || Bell;
                  return (
                    <button key={ch.id} type="button" onClick={() => toggleChannel(ch.id)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
                      background: active ? "rgba(34,197,94,.10)" : "var(--eco-card)",
                      color: active ? "var(--eco-primary-700, #15803D)" : "var(--eco-text-soft)",
                      fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      <Icon size={13} /> {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField label="Regla activa"
                description="Las alertas se dispararán cuando se cumpla la condición."
                checked={modalRule.enabled}
                onChange={(v) => setModalRule((c) => ({ ...c, enabled: v }))} />
            </div>
          </div>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={!!modalTemplate}
        onClose={() => setModalTemplate(null)}
        title={modalTemplate?.id ? "Editar plantilla" : "Nueva plantilla"}
        onSave={handleSaveTemplate}
        saving={saving}
        width={580}
      >
        {modalTemplate && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <AdminTextField label="Código" required value={modalTemplate.code}
              onChange={(v) => setModalTemplate((c) => ({ ...c, code: v }))}
              placeholder="ej: device-offline" />
            <AdminSelectField label="Canal" value={modalTemplate.channel}
              onChange={(v) => setModalTemplate((c) => ({ ...c, channel: v }))}
              options={[
                { value: "email", label: "Correo" },
                { value: "inapp", label: "En la app" },
                { value: "webhook", label: "Webhook" },
                { value: "push", label: "Push" },
                { value: "sms", label: "SMS" },
              ]} />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Nombre" required value={modalTemplate.name}
                onChange={(v) => setModalTemplate((c) => ({ ...c, name: v }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Asunto" value={modalTemplate.subject || ""}
                onChange={(v) => setModalTemplate((c) => ({ ...c, subject: v }))}
                placeholder="Acepta variables como {{deviceCode}}" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)", marginBottom: 6 }}>Cuerpo</div>
              <textarea value={modalTemplate.body}
                onChange={(e) => setModalTemplate((c) => ({ ...c, body: e.target.value }))}
                rows={6} style={{
                  width: "100%", padding: "10px 12px",
                  fontFamily: fm, fontSize: 12.5,
                  background: "var(--eco-surface)", color: "var(--eco-text)",
                  border: "1px solid var(--eco-border)", borderRadius: 8, resize: "vertical",
                }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft)", marginBottom: 6 }}>Variables</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input value={variableDraft} onChange={(e) => setVariableDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariable())}
                  placeholder="ej: deviceCode" style={{ flex: 1, padding: "8px 12px", fontFamily: fm, fontSize: 12.5, background: "var(--eco-surface)", border: "1px solid var(--eco-border)", borderRadius: 8 }} />
                <button type="button" onClick={addVariable} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--eco-primary-500, #22C55E)", color: "#fff", fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Agregar</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(modalTemplate.variables || []).map((v) => (
                  <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 14, background: "var(--eco-card-muted)", border: "1px solid var(--eco-border)", fontFamily: fm, fontSize: 11.5, color: "var(--eco-text)" }}>
                    {`{{${v}}}`}
                    <button type="button" onClick={() => removeVariable(v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--eco-text-soft)", padding: 0, display: "flex" }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField label="Plantilla activa" checked={modalTemplate.enabled}
                onChange={(v) => setModalTemplate((c) => ({ ...c, enabled: v }))} />
            </div>
          </div>
        )}
      </AdminFormModal>
    </div>
  );
}
