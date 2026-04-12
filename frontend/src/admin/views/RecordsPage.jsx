import React from "react";
import {
  Database, Paperclip, AlertTriangle, FileText, Edit3, History,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import { records as mockRecords, recordEvidence, recordTraceability, captureModes } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS = {
  validated: { variant: "success", label: "Validado" },
  pending:   { variant: "warning", label: "Pendiente" },
  rejected:  { variant: "error",   label: "Rechazado" },
};

export default function RecordsPage() {
  const [records] = React.useState(mockRecords);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ status: "all", consumptionType: "all", captureMode: "all", anomaly: "all" });
  const [selected, setSelected] = React.useState(null);

  const filtered = React.useMemo(() => {
    return records.filter(r => {
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.consumptionType !== "all" && r.consumptionType !== filters.consumptionType) return false;
      if (filters.captureMode !== "all" && r.captureMode !== filters.captureMode) return false;
      if (filters.anomaly === "yes" && !r.anomaly) return false;
      if (filters.anomaly === "no"  && r.anomaly)  return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.areaName.toLowerCase().includes(q) && !r.consumptionType.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, search, filters]);

  const consumptionOptions = Array.from(new Set(records.map(r => r.consumptionType))).map(c => ({ value: c, label: c }));

  const stats = React.useMemo(() => ({
    total:     records.length,
    validated: records.filter(r => r.status === "validated").length,
    pending:   records.filter(r => r.status === "pending").length,
    anomalies: records.filter(r => r.anomaly).length,
  }), [records]);

  const columns = [
    { key: "date", label: "Fecha", mono: true, width: 100 },
    { key: "areaName", label: "Área", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>{row.consumptionType}</div>
      </div>
    ) },
    { key: "value", label: "Consumo", mono: true, align: "right", render: (v, row) => (
      <span><strong>{v.toLocaleString()}</strong> <span style={{ opacity: .6 }}>{row.unit}</span></span>
    ) },
    { key: "emissions", label: "Emisiones", mono: true, align: "right", render: v => (
      <span><strong>{v.toFixed(2)}</strong> <span style={{ opacity: .6 }}>kgCO2e</span></span>
    ) },
    { key: "captureMode", label: "Captura", width: 110, render: v => {
      const m = captureModes.find(x => x.id === v);
      return <span style={{
        fontFamily: fb, fontSize: 11, fontWeight: 600,
        padding: "2px 9px", borderRadius: 12,
        background: `${m?.color || "#64748B"}18`, color: m?.color || "#64748B",
      }}>{m?.label || v}</span>;
    } },
    { key: "evidenceCount", label: "Ev.", align: "center", width: 50, render: v => v > 0 ? (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: fm, fontSize: 11.5 }}>
        <Paperclip size={11} /> {v}
      </span>
    ) : <span style={{ opacity: .3 }}>—</span> },
    { key: "anomaly", label: "", width: 30, align: "center", render: v => v && (
      <AlertTriangle size={14} color="var(--eco-warning, #CA8A04)" />
    ) },
    { key: "status", label: "Estado", width: 110, render: v => (
      <AdminStatusBadge variant={STATUS[v]?.variant || "neutral"} label={STATUS[v]?.label || v} />
    ) },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={Database}
        title="Gestión de registros"
        subtitle="Captura, evidencias, trazabilidad y detección de anomalías por registro."
        breadcrumb={["Operación", "Registros"]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <MiniStat label="Total" value={stats.total} color="#64748B" />
        <MiniStat label="Validados" value={stats.validated} color="#16A34A" />
        <MiniStat label="Pendientes" value={stats.pending} color="#CA8A04" />
        <MiniStat label="Con anomalía" value={stats.anomalies} color="#DC2626" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por área o consumo..."
          filters={[
            { key: "status", label: "Estado", options: [
              { value: "validated", label: "Validados" },
              { value: "pending",   label: "Pendientes" },
              { value: "rejected",  label: "Rechazados" },
            ]},
            { key: "consumptionType", label: "Consumo", options: consumptionOptions },
            { key: "captureMode", label: "Modo captura", options: captureModes.map(m => ({ value: m.id, label: m.label })) },
            { key: "anomaly", label: "Anomalía", options: [
              { value: "yes", label: "Con anomalía" },
              { value: "no",  label: "Sin anomalía" },
            ]},
          ]}
          filterValues={filters}
          onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
          onClear={() => { setSearch(""); setFilters({ status: "all", consumptionType: "all", captureMode: "all", anomaly: "all" }); }}
        />
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setSelected}
        emptyMessage="No hay registros que coincidan con los filtros."
      />

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.consumptionType} – ${selected.areaName}` : ""}
        subtitle={selected ? `${selected.date} · ${selected.id.toUpperCase()}` : ""}
        badge={selected && <AdminStatusBadge variant={STATUS[selected.status]?.variant} label={STATUS[selected.status]?.label} />}
        width={520}
      >
        {selected && (
          <>
            {selected.anomaly && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                background: "rgba(234,179,8,.10)",
                border: "1px solid rgba(234,179,8,.25)",
                borderRadius: 10,
                color: "var(--eco-warning, #CA8A04)",
                fontFamily: fb, fontSize: 12.5, fontWeight: 500,
              }}>
                <AlertTriangle size={15} />
                {selected.notes || "Anomalía detectada en este registro."}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Consumo" mono>{selected.value.toLocaleString()} {selected.unit}</DrawerField>
              <DrawerField label="Emisiones" mono>{selected.emissions.toFixed(2)} kgCO2e</DrawerField>
              <DrawerField label="Factor aplicado" mono>{selected.factorId}</DrawerField>
              <DrawerField label="Modo captura">{captureModes.find(m => m.id === selected.captureMode)?.label}</DrawerField>
              <DrawerField label="Capturado por">{selected.capturedBy}</DrawerField>
              <DrawerField label="Periodo" mono>{selected.periodId}</DrawerField>
            </div>

            {/* Evidence */}
            <div>
              <SectionTitle icon={Paperclip} label="Evidencia" />
              {(recordEvidence[selected.id] || []).length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin evidencia adjunta.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recordEvidence[selected.id].map(ev => (
                    <div key={ev.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px",
                      background: "var(--eco-card-muted, #F8FAFC)",
                      border: "1px solid var(--eco-border, #E2E8F0)",
                      borderRadius: 8,
                    }}>
                      <FileText size={14} color="var(--eco-info, #2563EB)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600 }}>{ev.name}</div>
                        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                          {ev.size} · {ev.uploadedAt}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: fm, fontSize: 10, fontWeight: 700,
                        padding: "2px 7px", borderRadius: 4,
                        background: "rgba(37,99,235,.10)", color: "var(--eco-info, #2563EB)",
                        textTransform: "uppercase",
                      }}>{ev.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Traceability */}
            <div>
              <SectionTitle icon={History} label="Trazabilidad" />
              {(recordTraceability[selected.id] || []).length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin eventos registrados.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4 }}>
                  {recordTraceability[selected.id].map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "var(--eco-primary-500, #22C55E)",
                        marginTop: 6, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)" }}>
                          <strong>{t.actor}</strong> {t.action.toLowerCase()}
                        </div>
                        <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
                          {new Date(t.ts).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </AdminEntityDrawer>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{
      padding: "14px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
    }}>
      <div style={{ fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
      fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: ".05em", color: "var(--eco-text-soft)",
    }}>
      <Icon size={13} /> {label}
    </div>
  );
}
