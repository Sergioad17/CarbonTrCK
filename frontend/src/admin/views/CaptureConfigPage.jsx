import React from "react";
import {
  ClipboardEdit, Plus, Edit3, Paperclip, ShieldCheck, Lock, Unlock, Sigma, LayoutGrid, TableIcon,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminDataTable from "../components/AdminDataTable";
import AdminFormModal from "../components/AdminFormModal";
import AdminTabs from "../components/AdminTabs";
import {
  AdminTextField, AdminSelectField, AdminToggleField,
} from "../components/AdminFormSection";
import { captureRules as mockRules, captureModes } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const VALIDATION = {
  strict:    { color: "#DC2626", label: "Estricta" },
  flexible:  { color: "#CA8A04", label: "Flexible" },
  automatic: { color: "#16A34A", label: "Automática" },
};

const APPLIES_TO = {
  global:   { label: "Global",     icon: "🌐" },
  area:     { label: "Por área",   icon: "📍" },
  category: { label: "Categoría",  icon: "🏷" },
};

const EMPTY_RULE = {
  consumptionType: "", category: "", scope: 1, appliesTo: "global", areaRef: "",
  mode: "manual", frequency: "Mensual", unit: "",
  evidenceRequired: true, allowEstimated: false, allowPostEdit: false, requiresPreApproval: false,
  validation: "strict", responsibleRole: "operativo", autoCalc: true, notes: "",
};

export default function CaptureConfigPage() {
  const [rules, setRules] = React.useState(mockRules);
  const [modalRule, setModalRule] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [view, setView] = React.useState("table");

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setRules(prev => modalRule.id
        ? prev.map(r => r.id === modalRule.id ? { ...modalRule } : r)
        : [...prev, { ...modalRule, id: "cr" + (prev.length + 1) }]);
      setSaving(false);
      setModalRule(null);
    }, 350);
  }

  const columns = [
    { key: "consumptionType", label: "Tipo de consumo", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)" }}>
          {row.category} · Scope {row.scope}
        </div>
      </div>
    ) },
    { key: "appliesTo", label: "Alcance", width: 130, render: (v, row) => (
      <div style={{ fontFamily: fb, fontSize: 11.5 }}>
        <div style={{ fontWeight: 600, color: "var(--eco-text)" }}>{APPLIES_TO[v]?.label || v}</div>
        {row.areaRef && <div style={{ color: "var(--eco-text-soft)", fontSize: 10.5 }}>{row.areaRef}</div>}
      </div>
    ) },
    { key: "mode", label: "Modo", width: 130, render: v => {
      const m = captureModes.find(x => x.id === v);
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 12,
          background: `${m?.color || "#64748B"}18`,
          color: m?.color || "#64748B",
          fontFamily: fb, fontSize: 11.5, fontWeight: 600,
        }}>{m?.label || v}</span>
      );
    } },
    { key: "frequency", label: "Frecuencia", width: 100 },
    { key: "unit", label: "Unidad", width: 70, mono: true },
    { key: "_flags", label: "Banderas", width: 170, render: (_, row) => (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {row.evidenceRequired && <Flag label="Evid." title="Evidencia obligatoria" color="#2563EB" icon={Paperclip} />}
        {row.allowEstimated   && <Flag label="Est." title="Permite estimados" color="#CA8A04" icon={Sigma} />}
        {row.allowPostEdit    && <Flag label="Edit" title="Edición posterior" color="#059669" icon={Edit3} />}
        {row.requiresPreApproval && <Flag label="Aprob." title="Aprobación previa" color="#7C3AED" icon={ShieldCheck} />}
      </div>
    ) },
    { key: "validation", label: "Validación", width: 110, render: v => (
      <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: VALIDATION[v]?.color }}>
        {VALIDATION[v]?.label || v}
      </span>
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

  return (
    <div>
      <AdminPageHeader
        icon={ClipboardEdit}
        title="Configuración de captura"
        subtitle="Reglas por consumo, categoría y alcance. Estimados, edición posterior y aprobación previa."
        breadcrumb={["Operación", "Captura"]}
        actions={
          <button onClick={() => setModalRule({ ...EMPTY_RULE })} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--eco-primary-500, #22C55E)", color: "#fff",
            fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(34,197,94,.25)",
          }}>
            <Plus size={14} /> Nueva regla
          </button>
        }
      />

      {/* Capture modes legend */}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${captureModes.length}, 1fr)`,
        gap: 10, marginBottom: 16,
      }}>
        {captureModes.map(m => {
          const count = rules.filter(r => r.mode === m.id).length;
          return (
            <div key={m.id} style={{
              padding: "12px 14px",
              background: "var(--eco-card, #fff)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              borderLeft: `3px solid ${m.color}`,
              borderRadius: 10,
            }}>
              <div style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: m.color, textTransform: "uppercase", letterSpacing: ".05em" }}>
                {m.label}
              </div>
              <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text)", lineHeight: 1, marginTop: 4 }}>
                {count}
              </div>
              <div style={{ fontFamily: fb, fontSize: 10.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
                regla{count !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>

      <AdminTabs
        tabs={[
          { id: "table", label: "Tabla" },
          { id: "cards", label: "Tarjetas" },
        ]}
        activeTab={view}
        onChange={setView}
      />

      {view === "table" && <AdminDataTable columns={columns} data={rules} sortable />}
      {view === "cards" && (
        <div style={{
          display: "grid", gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        }}>
          {rules.map(r => <RuleCard key={r.id} rule={r} onEdit={() => setModalRule({ ...r })} />)}
        </div>
      )}

      <AdminFormModal
        open={!!modalRule}
        onClose={() => setModalRule(null)}
        title={modalRule?.id ? "Editar regla de captura" : "Nueva regla de captura"}
        subtitle="Define alcance, modo, banderas y validación para este tipo de consumo."
        onSave={handleSave}
        saving={saving}
        width={640}
      >
        {modalRule && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <AdminTextField label="Tipo de consumo" required value={modalRule.consumptionType}
              onChange={v => setModalRule(p => ({ ...p, consumptionType: v }))} />
            <AdminTextField label="Categoría" value={modalRule.category}
              onChange={v => setModalRule(p => ({ ...p, category: v }))} placeholder="Energía, Combustión, Transporte..." />
            <AdminSelectField label="Scope" value={modalRule.scope}
              onChange={v => setModalRule(p => ({ ...p, scope: Number(v) }))}
              options={[{value:1,label:"Scope 1"},{value:2,label:"Scope 2"},{value:3,label:"Scope 3"}]} />
            <AdminSelectField label="Modo" value={modalRule.mode}
              onChange={v => setModalRule(p => ({ ...p, mode: v }))}
              options={captureModes.map(m => ({ value: m.id, label: m.label }))} />
            <AdminSelectField label="Alcance" value={modalRule.appliesTo}
              onChange={v => setModalRule(p => ({ ...p, appliesTo: v }))}
              options={[
                {value:"global",label:"Global (todas las áreas)"},
                {value:"area",label:"Por área específica"},
                {value:"category",label:"Por categoría"},
              ]} />
            <AdminTextField label="Referencia (área/categoría)" value={modalRule.areaRef}
              onChange={v => setModalRule(p => ({ ...p, areaRef: v }))}
              disabled={modalRule.appliesTo === "global"}
              placeholder={modalRule.appliesTo === "global" ? "—" : "ej: Centro de Datos"} />
            <AdminTextField label="Frecuencia" value={modalRule.frequency}
              onChange={v => setModalRule(p => ({ ...p, frequency: v }))} />
            <AdminTextField label="Unidad" value={modalRule.unit}
              onChange={v => setModalRule(p => ({ ...p, unit: v }))} />
            <AdminSelectField label="Validación" value={modalRule.validation}
              onChange={v => setModalRule(p => ({ ...p, validation: v }))}
              options={[{value:"strict",label:"Estricta"},{value:"flexible",label:"Flexible"},{value:"automatic",label:"Automática"}]} />
            <AdminSelectField label="Rol responsable" value={modalRule.responsibleRole}
              onChange={v => setModalRule(p => ({ ...p, responsibleRole: v }))}
              options={[{value:"operativo",label:"Operativo"},{value:"directivo",label:"Directivo"},{value:"admin",label:"Administrador"}]} />

            {/* Flags */}
            <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10, padding: "14px 16px", background: "var(--eco-card-muted)", borderRadius: 10, border: "1px solid var(--eco-border)" }}>
              <div style={{ fontFamily: fd, fontSize: 12, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                Reglas de captura
              </div>
              <AdminToggleField
                label="Evidencia obligatoria"
                description="Requiere adjuntar comprobante al guardar."
                checked={modalRule.evidenceRequired}
                onChange={v => setModalRule(p => ({ ...p, evidenceRequired: v }))}
              />
              <AdminToggleField
                label="Permite valores estimados"
                description="Se aceptan estimados cuando no hay lectura real disponible."
                checked={modalRule.allowEstimated}
                onChange={v => setModalRule(p => ({ ...p, allowEstimated: v }))}
              />
              <AdminToggleField
                label="Edición posterior permitida"
                description="El capturista puede modificar el registro tras guardarlo (antes de cerrar el periodo)."
                checked={modalRule.allowPostEdit}
                onChange={v => setModalRule(p => ({ ...p, allowPostEdit: v }))}
              />
              <AdminToggleField
                label="Aprobación previa a publicar"
                description="El registro queda pendiente hasta que un rol autorizado lo apruebe."
                checked={modalRule.requiresPreApproval}
                onChange={v => setModalRule(p => ({ ...p, requiresPreApproval: v }))}
              />
              <AdminToggleField
                label="Cálculo automático de emisiones"
                description="Aplica el factor vigente al guardar."
                checked={modalRule.autoCalc}
                onChange={v => setModalRule(p => ({ ...p, autoCalc: v }))}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Notas" multiline rows={2} value={modalRule.notes}
                onChange={v => setModalRule(p => ({ ...p, notes: v }))} />
            </div>
          </div>
        )}
      </AdminFormModal>
    </div>
  );
}

function Flag({ label, title, color, icon: Icon }) {
  return (
    <span title={title} style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: 10,
      background: `${color}14`, color,
      fontFamily: fb, fontSize: 10, fontWeight: 700,
    }}>
      <Icon size={9} /> {label}
    </span>
  );
}

function RuleCard({ rule, onEdit }) {
  const m = captureModes.find(x => x.id === rule.mode);
  return (
    <div style={{
      padding: "16px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)" }}>
            {rule.consumptionType}
          </div>
          <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>
            {rule.category} · Scope {rule.scope} · {APPLIES_TO[rule.appliesTo]?.label}
            {rule.areaRef && ` (${rule.areaRef})`}
          </div>
        </div>
        <button onClick={onEdit} style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--eco-text-soft)", padding: 4,
        }}>
          <Edit3 size={14} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{
          padding: "3px 10px", borderRadius: 12,
          background: `${m?.color}18`, color: m?.color,
          fontFamily: fb, fontSize: 11, fontWeight: 600,
        }}>{m?.label}</span>
        <span style={{
          padding: "3px 10px", borderRadius: 12,
          background: "var(--eco-card-muted)",
          fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)",
        }}>{rule.frequency} · {rule.unit}</span>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {rule.evidenceRequired    && <Flag label="Evidencia"      title="Evidencia obligatoria"  color="#2563EB" icon={Paperclip} />}
        {rule.allowEstimated      && <Flag label="Estimados"      title="Permite estimados"      color="#CA8A04" icon={Sigma} />}
        {rule.allowPostEdit       ? <Flag label="Edición abierta" title="Edición posterior"     color="#059669" icon={Unlock} />
                                  : <Flag label="Sin edición"     title="No admite edición"      color="#64748B" icon={Lock} />}
        {rule.requiresPreApproval && <Flag label="Aprobación"     title="Aprobación previa"      color="#7C3AED" icon={ShieldCheck} />}
      </div>
    </div>
  );
}
