import React from "react";
import {
  Bell, Plus, Mail, MessageSquare, Smartphone, History, Edit3, Users, Clock, Flag, X,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import { AdminTextField, AdminSelectField, AdminToggleField } from "../components/AdminFormSection";
import { alertRules as mockRules, notificationTemplates, notificationHistory, notificationChannels } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const SEVERITY = {
  critical: { variant: "error",   label: "Crítica" },
  warning:  { variant: "warning", label: "Advertencia" },
  info:     { variant: "info",    label: "Info" },
};

const CHANNEL_ICONS = { email: Mail, push: Bell, inapp: MessageSquare, sms: Smartphone };

const PRIORITY = {
  high:   { color: "#DC2626", label: "Alta" },
  normal: { color: "#2563EB", label: "Normal" },
  low:    { color: "#64748B", label: "Baja" },
};

const FREQUENCY_OPTIONS = [
  { value: "immediate", label: "Inmediata" },
  { value: "hourly",    label: "Por hora" },
  { value: "daily",     label: "Diaria" },
  { value: "weekly",    label: "Semanal" },
];

const FREQUENCY_LABEL = Object.fromEntries(FREQUENCY_OPTIONS.map(o => [o.value, o.label]));

const EMPTY_RULE = {
  name: "", type: "device", condition: "", severity: "warning",
  priority: "normal", frequency: "immediate",
  channels: ["email"], recipients: [],
  enabled: true, triggeredCount: 0,
};

export default function AlertsPage() {
  const [rules, setRules] = React.useState(mockRules);
  const [tab, setTab] = React.useState("rules");
  const [modalRule, setModalRule] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [recipientDraft, setRecipientDraft] = React.useState("");

  function addRecipient() {
    const v = recipientDraft.trim();
    if (!v || !modalRule) return;
    if (modalRule.recipients.includes(v)) { setRecipientDraft(""); return; }
    setModalRule(p => ({ ...p, recipients: [...(p.recipients || []), v] }));
    setRecipientDraft("");
  }
  function removeRecipient(r) {
    setModalRule(p => ({ ...p, recipients: p.recipients.filter(x => x !== r) }));
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setRules(prev => modalRule.id
        ? prev.map(r => r.id === modalRule.id ? { ...modalRule } : r)
        : [...prev, { ...modalRule, id: "ar" + (prev.length + 1) }]);
      setSaving(false);
      setModalRule(null);
    }, 350);
  }

  function toggleChannel(ch) {
    setModalRule(p => ({
      ...p,
      channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch],
    }));
  }

  function toggleRule(id) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  const ruleColumns = [
    { key: "name", label: "Regla", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)", fontFamily: fm }}>{row.condition}</div>
      </div>
    ) },
    { key: "type", label: "Tipo", width: 110 },
    { key: "priority", label: "Prioridad", width: 100, render: v => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11, fontWeight: 700,
        padding: "3px 9px", borderRadius: 12,
        background: `${PRIORITY[v]?.color}18`, color: PRIORITY[v]?.color,
      }}>
        <Flag size={10} /> {PRIORITY[v]?.label}
      </span>
    ) },
    { key: "frequency", label: "Frecuencia", width: 110, render: v => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11, fontWeight: 600,
        color: "var(--eco-text-soft)",
      }}>
        <Clock size={10} /> {FREQUENCY_LABEL[v] || v}
      </span>
    ) },
    { key: "severity", label: "Severidad", width: 120, render: v => (
      <AdminStatusBadge variant={SEVERITY[v]?.variant} label={SEVERITY[v]?.label} />
    ) },
    { key: "recipients", label: "Destinatarios", width: 130, render: v => (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)",
      }}>
        <Users size={11} /> {(v || []).length}
      </span>
    ) },
    { key: "channels", label: "Canales", width: 140, render: v => (
      <div style={{ display: "flex", gap: 5 }}>
        {v.map(ch => {
          const Icon = CHANNEL_ICONS[ch] || Bell;
          return (
            <span key={ch} title={ch} style={{
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
    { key: "enabled", label: "Estado", width: 90, render: (v, row) => (
      <button onClick={e => { e.stopPropagation(); toggleRule(row.id); }} style={{
        width: 36, height: 20, borderRadius: 10, border: "none",
        background: v ? "var(--eco-primary-500, #22C55E)" : "var(--eco-gray-300, #CBD5E1)",
        padding: 2, cursor: "pointer", display: "block",
      }}>
        <span style={{
          display: "block", width: 16, height: 16, borderRadius: "50%",
          background: "#fff",
          transform: v ? "translateX(16px)" : "translateX(0)",
          transition: "transform .2s",
          boxShadow: "0 1px 2px rgba(0,0,0,.15)",
        }} />
      </button>
    ) },
    { key: "_actions", label: "", width: 50, render: (_, row) => (
      <button onClick={e => { e.stopPropagation(); setModalRule({ ...row }); }} style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: "var(--eco-text-soft)", padding: 4,
      }}>
        <Edit3 size={14} />
      </button>
    ) },
  ];

  const templateColumns = [
    { key: "name", label: "Plantilla", render: v => <strong>{v}</strong> },
    { key: "subject", label: "Asunto", mono: true },
    { key: "channel", label: "Canal", width: 100 },
  ];

  const historyColumns = [
    { key: "ts", label: "Fecha", mono: true, width: 150, render: v => new Date(v).toLocaleString() },
    { key: "title", label: "Notificación" },
    { key: "channel", label: "Canal", width: 100 },
    { key: "recipients", label: "Dest.", mono: true, align: "right", width: 70 },
    { key: "status", label: "Estado", width: 110, render: v => (
      <AdminStatusBadge variant={v === "sent" ? "success" : "error"} label={v === "sent" ? "Enviado" : "Falló"} />
    ) },
  ];

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

      <AdminTabs
        tabs={[
          { id: "rules",     label: "Reglas",      count: rules.length },
          { id: "templates", label: "Plantillas",  count: notificationTemplates.length },
          { id: "history",   label: "Historial",   count: notificationHistory.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "rules" && (
        <AdminDataTable columns={ruleColumns} data={rules} sortable />
      )}
      {tab === "templates" && (
        <AdminDataTable columns={templateColumns} data={notificationTemplates} />
      )}
      {tab === "history" && (
        <AdminDataTable columns={historyColumns} data={notificationHistory} sortable />
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
              <AdminTextField label="Nombre" required value={modalRule.name}
                onChange={v => setModalRule(p => ({ ...p, name: v }))} />
            </div>
            <AdminSelectField label="Tipo" value={modalRule.type}
              onChange={v => setModalRule(p => ({ ...p, type: v }))}
              options={[
                {value:"device",label:"Dispositivo"},{value:"anomaly",label:"Anomalía"},
                {value:"factor",label:"Factor"},{value:"period",label:"Periodo"},
                {value:"goal",label:"Meta"},{value:"validation",label:"Validación"},
                {value:"security",label:"Seguridad"},
              ]} />
            <AdminSelectField label="Severidad" value={modalRule.severity}
              onChange={v => setModalRule(p => ({ ...p, severity: v }))}
              options={[{value:"info",label:"Info"},{value:"warning",label:"Advertencia"},{value:"critical",label:"Crítica"}]} />
            <AdminSelectField label="Prioridad" value={modalRule.priority}
              onChange={v => setModalRule(p => ({ ...p, priority: v }))}
              options={[{value:"low",label:"Baja"},{value:"normal",label:"Normal"},{value:"high",label:"Alta"}]} />
            <AdminSelectField label="Frecuencia de envío" value={modalRule.frequency}
              onChange={v => setModalRule(p => ({ ...p, frequency: v }))}
              options={FREQUENCY_OPTIONS} />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Condición" value={modalRule.condition}
                onChange={v => setModalRule(p => ({ ...p, condition: v }))}
                placeholder="ej: delta > 30% vs media" />
            </div>
            {/* Recipients */}
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
                  onChange={e => setRecipientDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addRecipient())}
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
                ) : modalRule.recipients.map(r => (
                  <span key={r} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 14,
                    background: "var(--eco-card-muted)",
                    border: "1px solid var(--eco-border)",
                    fontFamily: fb, fontSize: 11.5, fontWeight: 500,
                    color: "var(--eco-text)",
                  }}>
                    <Users size={11} /> {r}
                    <button type="button" onClick={() => removeRecipient(r)} style={{
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
                {notificationChannels.map(ch => {
                  const active = modalRule.channels.includes(ch.id);
                  const Icon = CHANNEL_ICONS[ch.id] || Bell;
                  return (
                    <button key={ch.id} type="button" onClick={() => toggleChannel(ch.id)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
                      background: active ? "rgba(34,197,94,.10)" : "var(--eco-card)",
                      color: active ? "var(--eco-primary-700, #15803D)" : "var(--eco-text-soft)",
                      fontFamily: fb, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                    }}>
                      <Icon size={13} /> {ch.label}
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
                onChange={v => setModalRule(p => ({ ...p, enabled: v }))}
              />
            </div>
          </div>
        )}
      </AdminFormModal>
    </div>
  );
}
