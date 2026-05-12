import React from "react";
import {
  AlertTriangle, Bell, Clock, Edit3, Flag, Mail, MessageSquare, Plus, RefreshCw, Smartphone, Users, X,
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
  fetchAdminAlerts,
  updateAdminAlertRule,
  updateAdminAlertRuleStatus,
} from "../../api/admin";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const SEVERITY = {
  critical: { variant: "error", label: "Crítica" },
  warning: { variant: "warning", label: "Advertencia" },
  info: { variant: "info", label: "Info" },
};

const CHANNEL_ICONS = { email: Mail, push: Bell, inapp: MessageSquare, sms: Smartphone };

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

const FREQUENCY_LABEL = Object.fromEntries(FREQUENCY_OPTIONS.map((option) => [option.value, option.label]));

const EMPTY_RULE = {
  name: "",
  type: "device",
  condition: "",
  severity: "warning",
  priority: "normal",
  frequency: "immediate",
  channels: ["inapp"],
  recipients: [],
  enabled: true,
  triggeredCount: 0,
};

function normalizeAlertsData(input = {}) {
  return {
    rules: Array.isArray(input.rules) ? input.rules : [],
    templates: Array.isArray(input.templates) ? input.templates : [],
    history: Array.isArray(input.history) ? input.history : [],
    channels: Array.isArray(input.channels) ? input.channels : [],
  };
}

export default function AlertsPage() {
  const [data, setData] = React.useState(() => normalizeAlertsData());
  const [tab, setTab] = React.useState("rules");
  const [modalRule, setModalRule] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [recipientDraft, setRecipientDraft] = React.useState("");

  const channels = data.channels.length > 0 ? data.channels : [{ id: "inapp", label: "En la app" }];

  const loadAlerts = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(normalizeAlertsData(await fetchAdminAlerts()));
    } catch (loadError) {
      setError(loadError?.message || "No se pudieron cargar las alertas y notificaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  function upsertRule(rule) {
    setData((current) => ({
      ...current,
      rules: current.rules.some((item) => item.id === rule.id)
        ? current.rules.map((item) => (item.id === rule.id ? rule : item))
        : [rule, ...current.rules],
    }));
  }

  function addRecipient() {
    const value = recipientDraft.trim();
    if (!value || !modalRule) return;
    if (modalRule.recipients.includes(value)) {
      setRecipientDraft("");
      return;
    }
    setModalRule((current) => ({ ...current, recipients: [...(current.recipients || []), value] }));
    setRecipientDraft("");
  }

  function removeRecipient(recipient) {
    setModalRule((current) => ({ ...current, recipients: current.recipients.filter((item) => item !== recipient) }));
  }

  async function handleSave() {
    if (!modalRule || saving) return;
    setSaving(true);
    setError("");
    try {
      const saved = modalRule.id
        ? await updateAdminAlertRule(modalRule.id, modalRule)
        : await createAdminAlertRule(modalRule);
      upsertRule(saved);
      setModalRule(null);
    } catch (saveError) {
      setError(saveError?.message || "No se pudo guardar la regla de alerta.");
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(channelId) {
    setModalRule((current) => ({
      ...current,
      channels: current.channels.includes(channelId)
        ? current.channels.filter((channel) => channel !== channelId)
        : [...current.channels, channelId],
    }));
  }

  async function toggleRule(rule) {
    const nextEnabled = !rule.enabled;
    setData((current) => ({
      ...current,
      rules: current.rules.map((item) => (item.id === rule.id ? { ...item, enabled: nextEnabled } : item)),
    }));
    try {
      const updated = await updateAdminAlertRuleStatus(rule.id, nextEnabled);
      upsertRule(updated);
    } catch (toggleError) {
      setError(toggleError?.message || "No se pudo actualizar el estado de la regla.");
      setData((current) => ({
        ...current,
        rules: current.rules.map((item) => (item.id === rule.id ? { ...item, enabled: rule.enabled } : item)),
      }));
    }
  }

  const ruleColumns = [
    { key: "name", label: "Regla", render: (value, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)", fontFamily: fm }}>{row.condition}</div>
      </div>
    ) },
    { key: "type", label: "Tipo", width: 110 },
    { key: "priority", label: "Prioridad", width: 100, render: (value) => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11, fontWeight: 700,
        padding: "3px 9px", borderRadius: 12,
        background: `${PRIORITY[value]?.color || "#64748B"}18`, color: PRIORITY[value]?.color || "#64748B",
      }}>
        <Flag size={10} /> {PRIORITY[value]?.label || value}
      </span>
    ) },
    { key: "frequency", label: "Frecuencia", width: 110, render: (value) => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11, fontWeight: 600,
        color: "var(--eco-text-soft)",
      }}>
        <Clock size={10} /> {FREQUENCY_LABEL[value] || value}
      </span>
    ) },
    { key: "severity", label: "Severidad", width: 120, render: (value) => (
      <AdminStatusBadge variant={SEVERITY[value]?.variant} label={SEVERITY[value]?.label || value} />
    ) },
    { key: "recipients", label: "Destinatarios", width: 130, render: (value) => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)",
      }}>
        <Users size={11} /> {(value || []).length}
      </span>
    ) },
    { key: "channels", label: "Canales", width: 140, render: (value = []) => (
      <div style={{ display: "flex", gap: 5 }}>
        {value.map((channel) => {
          const Icon = CHANNEL_ICONS[channel] || Bell;
          const label = channels.find((item) => item.id === channel)?.label || channel;
          return (
            <span key={channel} title={label} style={{
              width: 24, height: 24, borderRadius: 6,
              background: "var(--eco-card-muted)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "var(--eco-text-soft)",
            }}>
              <Icon size={12} />
            </span>
          );
        })}
      </div>
    ) },
    { key: "triggeredCount", label: "Disparos", mono: true, align: "right", width: 90 },
    { key: "enabled", label: "Estado", width: 90, render: (value, row) => (
      <button onClick={(event) => { event.stopPropagation(); toggleRule(row); }} style={{
        width: 36, height: 20, borderRadius: 10, border: "none",
        background: value ? "var(--eco-primary-500, #22C55E)" : "var(--eco-gray-300, #CBD5E1)",
        padding: 2, cursor: "pointer", display: "block",
      }}>
        <span style={{
          display: "block", width: 16, height: 16, borderRadius: "50%",
          background: "white",
          transform: value ? "translateX(16px)" : "translateX(0)",
          transition: "transform .2s",
          boxShadow: "0 1px 2px rgba(0,0,0,.25)",
        }} />
      </button>
    ) },
    { key: "_actions", label: "", width: 50, render: (_, row) => (
      <button onClick={(event) => { event.stopPropagation(); setModalRule({ ...row, channels: [...row.channels], recipients: [...row.recipients] }); }} style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: "var(--eco-text-soft)", padding: 4,
      }}>
        <Edit3 size={14} />
      </button>
    ) },
  ];

  const templateColumns = [
    { key: "name", label: "Plantilla", render: (value) => <strong>{value}</strong> },
    { key: "subject", label: "Asunto", mono: true },
    { key: "channel", label: "Canal", width: 100 },
  ];

  const historyColumns = [
    { key: "ts", label: "Fecha", mono: true, width: 150, render: (value) => new Date(value).toLocaleString() },
    { key: "title", label: "Notificación" },
    { key: "channel", label: "Canal", width: 100 },
    { key: "recipients", label: "Dest.", mono: true, align: "right", width: 70 },
    { key: "status", label: "Estado", width: 110, render: (value) => (
      <AdminStatusBadge
        variant={value === "sent" ? "success" : value === "archived" ? "neutral" : "error"}
        label={value === "sent" ? "Enviado" : value === "archived" ? "Archivado" : "Falló"}
      />
    ) },
  ];

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={Bell}
        title="Alertas y notificaciones"
        subtitle="Reglas, plantillas e historial de envíos del sistema."
        breadcrumb={["Control", "Alertas"]}
        actions={tab === "rules" && (
          <button onClick={() => setModalRule({ ...EMPTY_RULE })} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--eco-primary-500, #22C55E)", color: "#fff",
            fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(34,197,94,.25)",
          }}>
            <Plus size={14} /> Nueva regla
          </button>
        )}
      />

      {error && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "10px 12px", marginBottom: 14, borderRadius: 8,
          background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.18)",
          color: "var(--eco-danger, #DC2626)", fontFamily: fb, fontSize: 13,
        }}>
          <span>{error}</span>
          <button onClick={loadAlerts} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "none", background: "transparent", color: "inherit",
            fontFamily: fb, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
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
          : <AdminEmptyState icon={AlertTriangle} title="Sin reglas configuradas" description="Crea una regla para activar el monitoreo de alertas del sistema." />
      )}
      {tab === "templates" && (
        <AdminDataTable columns={templateColumns} data={data.templates} emptyMessage="Sin plantillas registradas" />
      )}
      {tab === "history" && (
        <AdminDataTable columns={historyColumns} data={data.history} emptyMessage="Sin notificaciones enviadas" sortable />
      )}

      <AdminFormModal
        open={!!modalRule}
        onClose={() => setModalRule(null)}
        title={modalRule?.id ? "Editar regla de alerta" : "Nueva regla de alerta"}
        onSave={handleSave}
        saving={saving}
        width={580}
      >
        {modalRule && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField
                label="Nombre"
                required
                value={modalRule.name}
                onChange={(value) => setModalRule((current) => ({ ...current, name: value }))}
              />
            </div>
            <AdminSelectField
              label="Tipo"
              value={modalRule.type}
              onChange={(value) => setModalRule((current) => ({ ...current, type: value }))}
              options={[
                { value: "device", label: "Dispositivo" },
                { value: "anomaly", label: "Anomalía" },
                { value: "factor", label: "Factor" },
                { value: "period", label: "Periodo" },
                { value: "goal", label: "Meta" },
                { value: "validation", label: "Validación" },
                { value: "security", label: "Seguridad" },
                { value: "system", label: "Sistema" },
              ]}
            />
            <AdminSelectField
              label="Severidad"
              value={modalRule.severity}
              onChange={(value) => setModalRule((current) => ({ ...current, severity: value }))}
              options={[{ value: "info", label: "Info" }, { value: "warning", label: "Advertencia" }, { value: "critical", label: "Crítica" }]}
            />
            <AdminSelectField
              label="Prioridad"
              value={modalRule.priority}
              onChange={(value) => setModalRule((current) => ({ ...current, priority: value }))}
              options={[{ value: "low", label: "Baja" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }]}
            />
            <AdminSelectField
              label="Frecuencia de envío"
              value={modalRule.frequency}
              onChange={(value) => setModalRule((current) => ({ ...current, frequency: value }))}
              options={FREQUENCY_OPTIONS}
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField
                label="Condición"
                value={modalRule.condition}
                onChange={(value) => setModalRule((current) => ({ ...current, condition: value }))}
                placeholder="ej: delta > 30% vs media"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{
                fontFamily: fb, fontSize: 12, fontWeight: 600,
                color: "var(--eco-text-soft)", marginBottom: 6,
              }}>
                Destinatarios
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  value={recipientDraft}
                  onChange={(event) => setRecipientDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addRecipient())}
                  placeholder="Email, rol o nombre"
                  style={{
                    flex: 1, padding: "8px 12px",
                    fontFamily: fb, fontSize: 12.5,
                    background: "var(--eco-surface, #fff)",
                    color: "var(--eco-text, #1E293B)",
                    border: "1px solid var(--eco-border)", borderRadius: 8,
                    outline: "none",
                  }}
                />
                <button type="button" onClick={addRecipient} style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
                  fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Agregar</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(modalRule.recipients || []).length === 0 ? (
                  <span style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                    Sin destinatarios configurados.
                  </span>
                ) : modalRule.recipients.map((recipient) => (
                  <span key={recipient} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 14,
                    background: "var(--eco-card-muted)",
                    border: "1px solid var(--eco-border)",
                    fontFamily: fb, fontSize: 11.5, fontWeight: 500,
                    color: "var(--eco-text)",
                  }}>
                    <Users size={11} /> {recipient}
                    <button type="button" onClick={() => removeRecipient(recipient)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--eco-text-soft)", padding: 0, display: "flex",
                    }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{
                fontFamily: fb, fontSize: 12, fontWeight: 600,
                color: "var(--eco-text-soft)", marginBottom: 6,
              }}>
                Canales de envío
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {channels.map((channel) => {
                  const active = modalRule.channels.includes(channel.id);
                  const Icon = CHANNEL_ICONS[channel.id] || Bell;
                  return (
                    <button key={channel.id} type="button" onClick={() => toggleChannel(channel.id)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
                      background: active ? "rgba(34,197,94,.10)" : "var(--eco-card)",
                      color: active ? "var(--eco-primary-700, #15803D)" : "var(--eco-text-soft)",
                      fontFamily: fb, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                    }}>
                      <Icon size={13} /> {channel.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField
                label="Regla activa"
                description="Las alertas se dispararán cuando se cumpla la condición."
                checked={modalRule.enabled}
                onChange={(value) => setModalRule((current) => ({ ...current, enabled: value }))}
              />
            </div>
          </div>
        )}
      </AdminFormModal>
    </div>
  );
}
