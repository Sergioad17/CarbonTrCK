import React from "react";
import {
  FlaskConical, Plus, Edit3, History, AlertTriangle, CheckCircle2, Clock, FileText, Star, BadgeCheck, Copy,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import { AdminTextField, AdminSelectField, AdminNumberField } from "../components/AdminFormSection";
import { emissionFactors as mockFactors, factorVersions as mockVersions } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS = {
  active:  { variant: "success", label: "Vigente" },
  expired: { variant: "error",   label: "Vencido" },
  draft:   { variant: "warning", label: "Borrador" },
};

const TYPE_LABELS = {
  electricity: "Electricidad",
  fuel:        "Combustible",
  water:       "Agua",
};

const EMPTY_FACTOR = {
  code: "", name: "", scope: 2, type: "electricity", unit: "kgCO2e/kWh",
  value: 0, source: "", validFrom: "", validUntil: "", status: "draft",
  version: "v1.0", official: false, notes: "",
};

function detectDuplicateCode(factors, factor) {
  return factors.find(f => f.id !== factor.id && f.code.trim().toLowerCase() === (factor.code || "").trim().toLowerCase());
}
function detectOverlap(factors, factor) {
  if (!factor.validFrom || !factor.validUntil) return null;
  return factors.find(f =>
    f.id !== factor.id &&
    f.scope === factor.scope &&
    f.type === factor.type &&
    f.status === "active" &&
    f.validFrom && f.validUntil &&
    !(factor.validUntil < f.validFrom || factor.validFrom > f.validUntil)
  );
}

export default function EmissionFactorsPage() {
  const [factors, setFactors] = React.useState(mockFactors);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ status: "all", scope: "all", type: "all" });
  const [selected, setSelected] = React.useState(null);
  const [modalFactor, setModalFactor] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const filtered = React.useMemo(() => {
    return factors.filter(f => {
      if (filters.status !== "all" && f.status !== filters.status) return false;
      if (filters.scope !== "all" && String(f.scope) !== filters.scope) return false;
      if (filters.type !== "all" && f.type !== filters.type) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!f.code.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [factors, search, filters]);

  const stats = React.useMemo(() => ({
    total:   factors.length,
    active:  factors.filter(f => f.status === "active").length,
    expired: factors.filter(f => f.status === "expired").length,
    draft:   factors.filter(f => f.status === "draft").length,
  }), [factors]);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setFactors(prev => {
        let next;
        if (modalFactor.id) {
          next = prev.map(f => f.id === modalFactor.id ? { ...modalFactor } : f);
        } else {
          next = [...prev, { ...modalFactor, id: "f" + (prev.length + 1) }];
        }
        // If marked official, unmark others of same scope+type
        if (modalFactor.official) {
          next = next.map(f =>
            f.id !== (modalFactor.id || next[next.length - 1].id) &&
            f.scope === modalFactor.scope && f.type === modalFactor.type
              ? { ...f, official: false } : f
          );
        }
        return next;
      });
      setSaving(false);
      setModalFactor(null);
    }, 350);
  }

  function markAsOfficial(factor) {
    setFactors(prev => prev.map(f => {
      if (f.id === factor.id) return { ...f, official: true };
      if (f.scope === factor.scope && f.type === factor.type) return { ...f, official: false };
      return f;
    }));
    setSelected(s => s && s.id === factor.id ? { ...s, official: true } : s);
  }

  const dupCode = modalFactor ? detectDuplicateCode(factors, modalFactor) : null;
  const overlap = modalFactor ? detectOverlap(factors, modalFactor) : null;

  const columns = [
    { key: "code", label: "Código", mono: true, width: 150, render: (v, row) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {row.official && row.status === "active" && (
          <Star size={12} color="#CA8A04" fill="#CA8A04" strokeWidth={2} />
        )}
        <span style={{ opacity: row.status === "expired" ? 0.55 : 1 }}>{v}</span>
      </div>
    ) },
    { key: "name", label: "Nombre", render: (v, row) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 600, opacity: row.status === "expired" ? 0.55 : 1 }}>{v}</span>
        <span style={{ fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
          Scope {row.scope} · {TYPE_LABELS[row.type]}
          {row.status === "expired" && " · Histórico"}
        </span>
      </div>
    ) },
    { key: "value", label: "Valor", mono: true, align: "right", render: (v, row) => (
      <span><strong>{v.toFixed(3)}</strong> <span style={{ opacity: .6 }}>{row.unit}</span></span>
    ) },
    { key: "version", label: "Versión", mono: true, width: 70 },
    { key: "validUntil", label: "Vigencia", mono: true, width: 110, render: v => v || "—" },
    { key: "status", label: "Estado", width: 110, render: v => (
      <AdminStatusBadge variant={STATUS[v]?.variant || "neutral"} label={STATUS[v]?.label || v} />
    ) },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={FlaskConical}
        title="Factores de emisión"
        subtitle="Gestión versionada de factores oficiales por tipo, fuente y vigencia."
        breadcrumb={["Operación", "Factores"]}
        actions={
          <button onClick={() => setModalFactor({ ...EMPTY_FACTOR })} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--eco-primary-500, #22C55E)", color: "#fff",
            fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(34,197,94,.25)",
          }}>
            <Plus size={14} /> Nuevo factor
          </button>
        }
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total" value={stats.total} icon={FileText} color="#64748B" />
        <StatCard label="Vigentes" value={stats.active} icon={CheckCircle2} color="#16A34A" />
        <StatCard label="Vencidos" value={stats.expired} icon={AlertTriangle} color="#DC2626" />
        <StatCard label="Borradores" value={stats.draft} icon={Clock} color="#CA8A04" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por código o nombre..."
          filters={[
            { key: "status", label: "Estado", options: [
              { value: "active", label: "Vigentes" },
              { value: "expired", label: "Vencidos" },
              { value: "draft", label: "Borradores" },
            ]},
            { key: "scope", label: "Alcance", options: [
              { value: "1", label: "Scope 1" },
              { value: "2", label: "Scope 2" },
              { value: "3", label: "Scope 3" },
            ]},
            { key: "type", label: "Tipo", options: [
              { value: "electricity", label: "Electricidad" },
              { value: "fuel", label: "Combustible" },
              { value: "water", label: "Agua" },
            ]},
          ]}
          filterValues={filters}
          onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
          onClear={() => { setSearch(""); setFilters({ status: "all", scope: "all", type: "all" }); }}
        />
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setSelected}
        emptyMessage="No hay factores que coincidan con los filtros."
      />

      {/* Detail drawer */}
      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected?.code}
        badge={selected && (
          <div style={{ display: "flex", gap: 6 }}>
            <AdminStatusBadge variant={STATUS[selected.status]?.variant} label={STATUS[selected.status]?.label} />
            {selected.official && selected.status === "active" && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 10px", borderRadius: 20,
                background: "rgba(234,179,8,.12)",
                border: "1px solid rgba(234,179,8,.25)",
                fontFamily: fd, fontSize: 11, fontWeight: 700,
                color: "#CA8A04",
              }}>
                <Star size={11} fill="#CA8A04" /> Oficial
              </span>
            )}
          </div>
        )}
        actions={selected && (
          <>
            {!selected.official && selected.status === "active" && (
              <button onClick={() => markAsOfficial(selected)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid rgba(234,179,8,.35)",
                background: "rgba(234,179,8,.10)", color: "#CA8A04",
                fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}>
                <BadgeCheck size={13} /> Marcar oficial
              </button>
            )}
            <button onClick={() => { setModalFactor({ ...selected }); setSelected(null); }} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: "var(--eco-primary-500, #22C55E)", color: "#fff",
              fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            }}>
              <Edit3 size={13} /> Editar
            </button>
          </>
        )}
      >
        {selected && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Scope">{selected.scope}</DrawerField>
              <DrawerField label="Tipo">{TYPE_LABELS[selected.type]}</DrawerField>
              <DrawerField label="Valor" mono>{selected.value.toFixed(3)} {selected.unit}</DrawerField>
              <DrawerField label="Versión actual" mono>{selected.version}</DrawerField>
              <DrawerField label="Vigencia desde" mono>{selected.validFrom}</DrawerField>
              <DrawerField label="Vigencia hasta" mono>{selected.validUntil}</DrawerField>
            </div>
            <DrawerField label="Fuente">{selected.source}</DrawerField>
            <DrawerField label="Notas">{selected.notes}</DrawerField>

            {/* Version history */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft, #64748B)",
              }}>
                <History size={13} /> Historial de versiones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(mockVersions[selected.id] || []).map((v, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12,
                    padding: "10px 12px",
                    background: "var(--eco-card-muted, #F8FAFC)",
                    border: "1px solid var(--eco-border, #E2E8F0)",
                    borderRadius: 8,
                  }}>
                    <div style={{
                      fontFamily: fm, fontSize: 11.5, fontWeight: 700,
                      color: "var(--eco-primary-600, #16A34A)",
                      minWidth: 38,
                    }}>{v.version}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600, color: "var(--eco-text, #1E293B)" }}>
                        {v.value} <span style={{ fontWeight: 400, color: "var(--eco-text-soft)" }}>{selected.unit}</span>
                      </div>
                      <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
                        {v.changedAt} · {v.changedBy}
                      </div>
                      {v.note && (
                        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #64748B)", marginTop: 3, fontStyle: "italic" }}>
                          {v.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      {/* Form modal */}
      <AdminFormModal
        open={!!modalFactor}
        onClose={() => setModalFactor(null)}
        title={modalFactor?.id ? "Editar factor de emisión" : "Nuevo factor de emisión"}
        subtitle="Captura los datos básicos del factor y su vigencia."
        onSave={handleSave}
        saving={saving}
        width={620}
      >
        {modalFactor && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {(dupCode || overlap) && (
              <div style={{ gridColumn: "1 / -1" }}>
                {dupCode && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "10px 14px", marginBottom: 8,
                    background: "rgba(239,68,68,.08)",
                    border: "1px solid rgba(239,68,68,.25)",
                    borderRadius: 8,
                    color: "var(--eco-danger)",
                    fontFamily: fb, fontSize: 12,
                  }}>
                    <Copy size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Código duplicado:</strong> ya existe un factor con código <code style={{ fontFamily: fm }}>{dupCode.code}</code> ({dupCode.name}).
                    </div>
                  </div>
                )}
                {overlap && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "10px 14px", marginBottom: 8,
                    background: "rgba(234,179,8,.08)",
                    border: "1px solid rgba(234,179,8,.25)",
                    borderRadius: 8,
                    color: "var(--eco-warning)",
                    fontFamily: fb, fontSize: 12,
                  }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Vigencia traslapada:</strong> el factor <code style={{ fontFamily: fm }}>{overlap.code}</code> cubre {overlap.validFrom} → {overlap.validUntil} en el mismo scope/tipo.
                    </div>
                  </div>
                )}
              </div>
            )}
            <AdminTextField label="Código" required value={modalFactor.code}
              onChange={v => setModalFactor(p => ({ ...p, code: v }))} placeholder="GRID-MX-2026" />
            <AdminTextField label="Versión" value={modalFactor.version}
              onChange={v => setModalFactor(p => ({ ...p, version: v }))} placeholder="v1.0" />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Nombre" required value={modalFactor.name}
                onChange={v => setModalFactor(p => ({ ...p, name: v }))} />
            </div>
            <AdminSelectField label="Scope" value={modalFactor.scope}
              onChange={v => setModalFactor(p => ({ ...p, scope: Number(v) }))}
              options={[{value:1,label:"Scope 1"},{value:2,label:"Scope 2"},{value:3,label:"Scope 3"}]} />
            <AdminSelectField label="Tipo" value={modalFactor.type}
              onChange={v => setModalFactor(p => ({ ...p, type: v }))}
              options={[{value:"electricity",label:"Electricidad"},{value:"fuel",label:"Combustible"},{value:"water",label:"Agua"}]} />
            <AdminNumberField label="Valor" required value={modalFactor.value} step={0.001}
              onChange={v => setModalFactor(p => ({ ...p, value: v }))} />
            <AdminTextField label="Unidad" value={modalFactor.unit}
              onChange={v => setModalFactor(p => ({ ...p, unit: v }))} placeholder="kgCO2e/kWh" />
            <AdminTextField label="Vigencia desde" type="date" value={modalFactor.validFrom}
              onChange={v => setModalFactor(p => ({ ...p, validFrom: v }))} />
            <AdminTextField label="Vigencia hasta" type="date" value={modalFactor.validUntil}
              onChange={v => setModalFactor(p => ({ ...p, validUntil: v }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Fuente" value={modalFactor.source}
                onChange={v => setModalFactor(p => ({ ...p, source: v }))} placeholder="SENER 2026" />
            </div>
            <AdminSelectField label="Estado" value={modalFactor.status}
              onChange={v => setModalFactor(p => ({ ...p, status: v }))}
              options={[{value:"draft",label:"Borrador"},{value:"active",label:"Vigente"},{value:"expired",label:"Vencido"}]} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
              <input
                id="fact-official"
                type="checkbox"
                checked={!!modalFactor.official}
                onChange={e => setModalFactor(p => ({ ...p, official: e.target.checked }))}
                style={{ accentColor: "#CA8A04", cursor: "pointer", width: 16, height: 16 }}
              />
              <label htmlFor="fact-official" style={{
                fontFamily: fb, fontSize: 12.5, fontWeight: 600,
                color: "var(--eco-text)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <Star size={13} color="#CA8A04" fill={modalFactor.official ? "#CA8A04" : "transparent"} />
                Factor oficial vigente
              </label>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminTextField label="Notas" multiline rows={3} value={modalFactor.notes}
                onChange={v => setModalFactor(p => ({ ...p, notes: v }))} />
            </div>
          </div>
        )}
      </AdminFormModal>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
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
        <div style={{ fontFamily: "var(--eco-font-display)", fontSize: 22, fontWeight: 800, color: "var(--eco-text, #1E293B)", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #64748B)", marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
