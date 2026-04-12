import React from "react";
import {
  Calculator, TrendingDown, TrendingUp, RefreshCw, History,
  Lock, Unlock, CheckCircle2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import {
  emissionCalculations, emissionSummary, recalculationHistory, periods,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const PERIOD_STATUS = {
  open:   { color: "#16A34A", label: "Abierto",  icon: Unlock,       locked: false },
  review: { color: "#CA8A04", label: "Revisión", icon: CheckCircle2, locked: false },
  closed: { color: "#DC2626", label: "Cerrado",  icon: Lock,         locked: true },
};

export default function EmissionsCalcPage() {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ scope: "all" });
  const [selected, setSelected] = React.useState(null);
  const [history, setHistory] = React.useState(recalculationHistory);
  const [recalcBanner, setRecalcBanner] = React.useState(null);

  const currentPeriod = periods.find(p => p.name === emissionSummary.period)
    || periods.find(p => p.isDefault)
    || periods[periods.length - 1];
  const periodCfg = PERIOD_STATUS[currentPeriod?.status] || PERIOD_STATUS.open;
  const PeriodIcon = periodCfg.icon;
  const periodLocked = periodCfg.locked;

  const filtered = React.useMemo(() => emissionCalculations.filter(e => {
    if (filters.scope !== "all" && String(e.scope) !== filters.scope) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.area.toLowerCase().includes(q) && !e.source.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [search, filters]);

  function handleRecalculate(target) {
    if (periodLocked) return;
    const now = new Date().toISOString();
    const entry = {
      id: "rch" + (history.length + 1),
      ts: now,
      by: "Usuario actual",
      trigger: target
        ? `Recálculo manual: ${target.source} – ${target.area}`
        : `Recálculo global del periodo ${currentPeriod.name}`,
      recordsAffected: target ? 1 : filtered.length,
      deltaEmissions: 0,
    };
    setHistory(prev => [entry, ...prev]);
    setRecalcBanner(entry);
    setTimeout(() => setRecalcBanner(null), 2800);
  }

  const columns = [
    { key: "scope", label: "Scope", width: 70, render: v => (
      <span style={{
        fontFamily: fm, fontSize: 11, fontWeight: 700,
        padding: "2px 9px", borderRadius: 12,
        background: v === 1 ? "rgba(234,88,12,.12)" : v === 2 ? "rgba(37,99,235,.12)" : "rgba(124,58,237,.12)",
        color: v === 1 ? "#EA580C" : v === 2 ? "#2563EB" : "#7C3AED",
      }}>S{v}</span>
    ) },
    { key: "source", label: "Fuente", width: 140 },
    { key: "area", label: "Área" },
    { key: "consumption", label: "Consumo", mono: true, align: "right", render: (v, r) => (
      <span><strong>{v.toLocaleString()}</strong> <span style={{ opacity: .6 }}>{r.unit}</span></span>
    ) },
    { key: "factor", label: "Factor", mono: true, align: "right", width: 100 },
    { key: "emissions", label: "Emisiones", mono: true, align: "right", render: v => (
      <span style={{ color: "var(--eco-primary-600)" }}><strong>{v.toFixed(2)}</strong> kgCO2e</span>
    ) },
    { key: "trend", label: "Tendencia", width: 110, render: v => {
      const positive = v.startsWith("+");
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontFamily: fm, fontSize: 11.5, fontWeight: 600,
          color: positive ? "var(--eco-danger)" : "var(--eco-success)",
        }}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {v}
        </span>
      );
    } },
    { key: "_actions", label: "", width: 50, render: (_, row) => (
      <button
        onClick={e => { e.stopPropagation(); handleRecalculate(row); }}
        disabled={periodLocked}
        title={periodLocked ? "Periodo cerrado" : "Recalcular fila"}
        style={{
          background: "transparent", border: "none",
          cursor: periodLocked ? "not-allowed" : "pointer",
          color: periodLocked ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-text-soft)",
          padding: 4,
        }}>
        <RefreshCw size={14} />
      </button>
    ) },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={Calculator}
        title="Emisiones y cálculo"
        subtitle="Detalle de cálculos de emisiones por scope, área y periodo, con recálculo y bloqueo de periodo."
        breadcrumb={["Control", "Emisiones"]}
        actions={
          <button
            onClick={() => handleRecalculate(null)}
            disabled={periodLocked}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: periodLocked ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
              color: "#fff",
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              cursor: periodLocked ? "not-allowed" : "pointer",
              boxShadow: periodLocked ? "none" : "0 1px 3px rgba(34,197,94,.25)",
            }}
            title={periodLocked ? "Periodo cerrado: recálculo bloqueado" : "Recalcular todas las emisiones del periodo"}
          >
            <RefreshCw size={14} /> Recalcular periodo
          </button>
        }
      />

      {/* Period lock banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 18px", marginBottom: 14,
        background: `${periodCfg.color}10`,
        border: `1px solid ${periodCfg.color}33`,
        borderLeft: `3px solid ${periodCfg.color}`,
        borderRadius: 10,
      }}>
        <PeriodIcon size={18} color={periodCfg.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text)" }}>
            Periodo {currentPeriod.name} · <span style={{ color: periodCfg.color }}>{periodCfg.label}</span>
          </div>
          <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 2 }}>
            {currentPeriod.label} · {currentPeriod.startDate} → {currentPeriod.endDate}
            {periodLocked && " · Recálculo deshabilitado hasta reapertura autorizada."}
          </div>
        </div>
      </div>

      {recalcBanner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", marginBottom: 12,
          background: "rgba(34,197,94,.10)",
          border: "1px solid rgba(34,197,94,.25)",
          borderRadius: 10,
        }}>
          <RefreshCw size={14} color="var(--eco-primary-600, #16A34A)" />
          <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-primary-700, #15803D)" }}>
            <strong>Recálculo aplicado.</strong> {recalcBanner.trigger} — {recalcBanner.recordsAffected} registro(s).
          </div>
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
        gap: 14, marginBottom: 18,
      }}>
        <div style={{
          padding: "18px 22px",
          background: "linear-gradient(135deg, rgba(34,197,94,.10), rgba(34,197,94,.04))",
          border: "1px solid rgba(34,197,94,.20)",
          borderRadius: 14,
        }}>
          <div style={{ fontFamily: fb, fontSize: 11.5, fontWeight: 600, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Total {emissionSummary.period}
          </div>
          <div style={{ fontFamily: fd, fontSize: 30, fontWeight: 800, color: "var(--eco-primary-700, #15803D)", lineHeight: 1.1, marginTop: 6 }}>
            {emissionSummary.total.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600 }}>{emissionSummary.unit}</span>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginTop: 8, padding: "3px 10px", borderRadius: 12,
            background: "rgba(34,197,94,.15)",
            fontFamily: fm, fontSize: 11.5, fontWeight: 700,
            color: "var(--eco-primary-700, #15803D)",
          }}>
            <TrendingDown size={12} /> {emissionSummary.vsLastPeriod}% vs periodo anterior
          </div>
        </div>
        <ScopeCard scope={1} value={emissionSummary.totalScope1} color="#EA580C" />
        <ScopeCard scope={2} value={emissionSummary.totalScope2} color="#2563EB" />
        <ScopeCard scope={3} value={emissionSummary.totalScope3} color="#7C3AED" />
      </div>

      {/* Formula card */}
      <div style={{
        padding: "16px 22px", marginBottom: 16,
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
      }}>
        <div style={{ fontFamily: fd, fontSize: 12, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
          Fórmula aplicada
        </div>
        <div style={{
          fontFamily: fm, fontSize: 14, fontWeight: 600,
          color: "var(--eco-text)",
          padding: "12px 16px",
          background: "var(--eco-card-muted)",
          borderRadius: 8,
        }}>
          Emisiones (kgCO2e) = Consumo × Factor de emisión × Ajuste de pérdidas
        </div>
        <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 8 }}>
          El factor se selecciona automáticamente según el tipo de consumo y la vigencia del periodo.
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por área o fuente..."
          filters={[
            { key: "scope", label: "Scope", options: [
              { value: "1", label: "Scope 1" },
              { value: "2", label: "Scope 2" },
              { value: "3", label: "Scope 3" },
            ]},
          ]}
          filterValues={filters}
          onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
          onClear={() => { setSearch(""); setFilters({ scope: "all" }); }}
        />
      </div>

      <AdminDataTable columns={columns} data={filtered} sortable onRowClick={setSelected} />

      {/* Recalculation history */}
      <div style={{ marginTop: 22 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text)",
        }}>
          <History size={15} color="var(--eco-text-soft)" /> Historial de recálculos
        </div>
        <div style={{
          background: "var(--eco-card, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {history.map((r, i) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px",
              borderBottom: i < history.length - 1 ? "1px solid var(--eco-border)" : "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(37,99,235,.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <RefreshCw size={16} color="var(--eco-info, #2563EB)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text)" }}>
                  {r.trigger}
                </div>
                <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
                  {new Date(r.ts).toLocaleString()} · {r.by} · {r.recordsAffected} registros afectados
                </div>
              </div>
              {r.deltaEmissions !== 0 && (
                <span style={{
                  fontFamily: fm, fontSize: 12, fontWeight: 700,
                  color: r.deltaEmissions < 0 ? "var(--eco-success)" : "var(--eco-danger)",
                }}>
                  {r.deltaEmissions > 0 ? "+" : ""}{r.deltaEmissions.toFixed(2)} kgCO2e
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.source} – ${selected.area}` : ""}
        subtitle={selected ? `Scope ${selected.scope} · ${selected.period}` : ""}
        width={520}
        actions={selected && (
          <button
            onClick={() => handleRecalculate(selected)}
            disabled={periodLocked}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: periodLocked ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
              color: "#fff",
              fontFamily: fb, fontSize: 12.5, fontWeight: 600,
              cursor: periodLocked ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={13} /> Recalcular
          </button>
        )}
      >
        {selected && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Scope">{`Scope ${selected.scope}`}</DrawerField>
              <DrawerField label="Periodo" mono>{selected.period}</DrawerField>
              <DrawerField label="Fuente">{selected.source}</DrawerField>
              <DrawerField label="Área">{selected.area}</DrawerField>
              <DrawerField label="Consumo" mono>{selected.consumption.toLocaleString()} {selected.unit}</DrawerField>
              <DrawerField label="Unidad" mono>{selected.unit}</DrawerField>
              <DrawerField label="Factor" mono>{selected.factor} kgCO2e / {selected.unit}</DrawerField>
              <DrawerField label="Tendencia" mono>{selected.trend}</DrawerField>
            </div>

            {/* Applied formula */}
            <div>
              <div style={{
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)", marginBottom: 8,
              }}>
                Fórmula aplicada
              </div>
              <div style={{
                fontFamily: fm, fontSize: 13, fontWeight: 600,
                padding: "12px 14px",
                background: "var(--eco-card-muted)",
                borderRadius: 8,
                color: "var(--eco-text)",
              }}>
                {selected.consumption.toLocaleString()} {selected.unit} × {selected.factor} = <span style={{ color: "var(--eco-primary-600)" }}>{selected.emissions.toFixed(2)} kgCO2e</span>
              </div>
            </div>

            {/* Period status */}
            <div>
              <div style={{
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft)", marginBottom: 8,
              }}>
                Estado del periodo
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: `${periodCfg.color}10`,
                border: `1px solid ${periodCfg.color}33`,
                borderRadius: 8,
              }}>
                <PeriodIcon size={16} color={periodCfg.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 700, color: periodCfg.color }}>
                    {periodCfg.label}
                  </div>
                  <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>
                    {periodLocked
                      ? "Recálculo deshabilitado. Requiere reapertura autorizada."
                      : "Recálculo permitido para este periodo."}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>
    </div>
  );
}

function ScopeCard({ scope, value, color }) {
  return (
    <div style={{
      padding: "16px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{
        display: "inline-block",
        fontFamily: fm, fontSize: 11, fontWeight: 700,
        padding: "2px 9px", borderRadius: 12,
        background: `${color}18`, color,
      }}>SCOPE {scope}</div>
      <div style={{ fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text)", marginTop: 8, lineHeight: 1 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 4 }}>
        kgCO2e
      </div>
    </div>
  );
}
