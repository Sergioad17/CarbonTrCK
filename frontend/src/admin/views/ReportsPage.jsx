import React from "react";
import {
  FileBarChart, FileDown, FileSpreadsheet, FileText, FileCode2,
  Calendar, Building2, Layers, BookOpen, Target, Users, Cpu, GitCompare,
  Eye, Download, Paperclip, RefreshCw, Plus, X, CheckCircle2, Clock, AlertCircle,
  Filter,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminFormModal from "../components/AdminFormModal";
import AdminEmptyState from "../components/AdminEmptyState";
import {
  AdminTextField, AdminSelectField, AdminToggleField,
} from "../components/AdminFormSection";
import {
  reportTemplates, reportExportHistory, reportPreviewSample, campuses,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const TPL_ICON = {
  Calendar, Building2, Layers, BookOpen, Target, Users, Cpu, GitCompare,
};

const FORMAT_ICON = {
  pdf:  FileText,
  xlsx: FileSpreadsheet,
  csv:  FileCode2,
};

const FORMAT_COLOR = {
  pdf:  "#DC2626",
  xlsx: "#16A34A",
  csv:  "#2563EB",
};

const STATUS_VARIANT = {
  completed: "success",
  pending:   "warning",
  failed:    "error",
};

const STATUS_LABEL = {
  completed: "Completado",
  pending:   "En proceso",
  failed:    "Fallido",
};

function fmtDate(ts) {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtNumber(n) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportsPage() {
  const [tab, setTab] = React.useState("templates");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [activeTpl, setActiveTpl] = React.useState(null);
  const [history, setHistory] = React.useState(reportExportHistory);

  // Generation modal state
  const [genForm, setGenForm] = React.useState({
    templateId: "rt-period",
    periodFrom: "2026-01-01",
    periodTo:   "2026-03-31",
    campus:     "all",
    area:       "all",
    scope:      "all",
    status:     "all",
    format:     "pdf",
    includeEvidences: true,
  });
  const [generating, setGenerating] = React.useState(false);

  function openGenerator(template) {
    setActiveTpl(template);
    setGenForm(prev => ({
      ...prev,
      templateId: template.id,
      format: template.formats[0],
    }));
  }

  function closeGenerator() {
    setActiveTpl(null);
  }

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => {
      const tpl = reportTemplates.find(t => t.id === genForm.templateId);
      const newRow = {
        id: "ex" + Date.now(),
        reportName: `${tpl?.name} – ${genForm.periodFrom} a ${genForm.periodTo}`,
        templateId: genForm.templateId,
        format: genForm.format,
        size: "—",
        generatedBy: "Sergio Arellano",
        ts: new Date().toISOString(),
        status: "pending",
        evidences: genForm.includeEvidences ? 4 : 0,
        periodLabel: `${genForm.periodFrom} → ${genForm.periodTo}`,
      };
      setHistory(prev => [newRow, ...prev]);
      setGenerating(false);
      setActiveTpl(null);
      setTab("history");
    }, 900);
  }

  // ── History columns ───────────────────────────────────────────────
  const historyColumns = [
    { key: "reportName", label: "Reporte", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600, color: "var(--eco-text)" }}>{v}</div>
        <div style={{ fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>
          {row.periodLabel}
        </div>
      </div>
    ) },
    { key: "format", label: "Formato", width: 100, render: v => {
      const Icon = FORMAT_ICON[v] || FileText;
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: fm, fontSize: 11, fontWeight: 700,
          padding: "3px 9px", borderRadius: 12,
          background: `${FORMAT_COLOR[v]}14`,
          color: FORMAT_COLOR[v],
          textTransform: "uppercase",
        }}>
          <Icon size={11} /> {v}
        </span>
      );
    } },
    { key: "size", label: "Tamaño", mono: true, width: 90, align: "right" },
    { key: "evidences", label: "Evidencias", width: 110, render: v => v > 0 ? (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)",
      }}>
        <Paperclip size={11} /> {v}
      </span>
    ) : <span style={{ color: "var(--eco-text-soft)", fontSize: 11.5 }}>—</span> },
    { key: "generatedBy", label: "Generado por", width: 150 },
    { key: "ts", label: "Fecha", mono: true, width: 160, render: v => fmtDate(v) },
    { key: "status", label: "Estado", width: 120, render: v => (
      <AdminStatusBadge variant={STATUS_VARIANT[v] || "neutral"} label={STATUS_LABEL[v]} />
    ) },
    { key: "_actions", label: "", width: 110, render: (_, row) => (
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={e => { e.stopPropagation(); setPreviewOpen(true); }} title="Vista previa" style={iconBtn}>
          <Eye size={14} />
        </button>
        <button title="Descargar" disabled={row.status !== "completed"} style={{
          ...iconBtn,
          opacity: row.status === "completed" ? 1 : .35,
          cursor: row.status === "completed" ? "pointer" : "not-allowed",
        }}>
          <Download size={14} />
        </button>
      </div>
    ) },
  ];

  const filteredHistory = history.filter(row => {
    const q = search.trim().toLowerCase();
    if (q && !row.reportName.toLowerCase().includes(q)) return false;
    if (filters.format && filters.format !== "all" && row.format !== filters.format) return false;
    if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
    return true;
  });

  return (
    <div>
      <AdminPageHeader
        icon={FileBarChart}
        title="Reportes y exportaciones"
        subtitle="Generación, vista previa y descarga de reportes oficiales del sistema."
        breadcrumb={["Soporte", "Reportes"]}
        actions={
          <button
            onClick={() => openGenerator(reportTemplates[0])}
            style={primaryBtn}
            onMouseEnter={e => e.currentTarget.style.background = "var(--eco-primary-600, #16A34A)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--eco-primary-500, #22C55E)"}
          >
            <Plus size={14} /> Generar reporte
          </button>
        }
      />

      <AdminTabs
        tabs={[
          { id: "templates", label: "Reportes disponibles", count: reportTemplates.length },
          { id: "history",   label: "Historial",            count: history.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "templates" && (
        <>
          {/* Quick info banner */}
          <div style={{
            background: "rgba(34,197,94,.06)",
            border: "1px solid rgba(34,197,94,.18)",
            borderRadius: 12, padding: "14px 18px",
            marginBottom: 18,
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: fb, fontSize: 12.5,
            color: "var(--eco-text)",
          }}>
            <FileBarChart size={18} color="var(--eco-primary-500, #22C55E)" />
            <div>
              <strong>8 plantillas disponibles.</strong>{" "}
              <span style={{ color: "var(--eco-text-soft)" }}>
                Selecciona un reporte para personalizar el periodo, área, scope y formato de exportación.
              </span>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {reportTemplates.map(tpl => {
              const Icon = TPL_ICON[tpl.icon] || FileBarChart;
              return (
                <div key={tpl.id} style={{
                  background: "var(--eco-card, #fff)",
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  borderRadius: 12,
                  padding: "18px 20px 16px",
                  display: "flex", flexDirection: "column", gap: 10,
                  transition: "all .18s ease",
                  cursor: "pointer",
                }}
                onClick={() => openGenerator(tpl)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--eco-shadow-md, 0 6px 20px rgba(0,0,0,.06))";
                  e.currentTarget.style.borderColor = "var(--eco-primary-300, #86EFAC)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
                }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: "rgba(34,197,94,.10)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={17} color="var(--eco-primary-600, #16A34A)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: fd, fontSize: 14, fontWeight: 700,
                        color: "var(--eco-text)",
                      }}>
                        {tpl.name}
                      </div>
                      <div style={{
                        fontFamily: fb, fontSize: 11.5,
                        color: "var(--eco-text-soft)",
                        marginTop: 2, lineHeight: 1.45,
                      }}>
                        {tpl.description}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginTop: 4, paddingTop: 10,
                    borderTop: "1px solid var(--eco-border, #E2E8F0)",
                  }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {tpl.formats.map(f => {
                        const FmtIcon = FORMAT_ICON[f] || FileText;
                        return (
                          <span key={f} style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            fontFamily: fm, fontSize: 10, fontWeight: 700,
                            padding: "2px 8px", borderRadius: 10,
                            background: `${FORMAT_COLOR[f]}14`,
                            color: FORMAT_COLOR[f],
                            textTransform: "uppercase",
                          }}>
                            <FmtIcon size={9} /> {f}
                          </span>
                        );
                      })}
                    </div>
                    <span style={{
                      fontFamily: fb, fontSize: 10.5,
                      color: "var(--eco-text-soft)",
                    }}>
                      <Clock size={10} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />
                      {tpl.lastRun ? fmtDate(tpl.lastRun) : "Nunca"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "history" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <AdminFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar reporte por nombre…"
              filters={[
                { key: "format", label: "Formato", options: [
                  { value: "pdf", label: "PDF" },
                  { value: "xlsx", label: "Excel" },
                  { value: "csv", label: "CSV" },
                ]},
                { key: "status", label: "Estado", options: [
                  { value: "completed", label: "Completado" },
                  { value: "pending", label: "En proceso" },
                  { value: "failed", label: "Fallido" },
                ]},
              ]}
              filterValues={filters}
              onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
              onClear={() => { setSearch(""); setFilters({}); }}
            />
          </div>

          <AdminDataTable
            columns={historyColumns}
            data={filteredHistory}
            sortable
            emptyMessage="Sin exportaciones registradas con esos filtros."
          />
        </>
      )}

      {/* ── Generator modal ─────────────────────────────────────── */}
      <AdminFormModal
        open={!!activeTpl}
        onClose={closeGenerator}
        title={activeTpl ? `Generar: ${activeTpl.name}` : ""}
        subtitle="Configura los parámetros del reporte antes de exportar."
        onSave={handleGenerate}
        saving={generating}
        width={620}
      >
        {activeTpl && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <AdminTextField
              label="Desde"
              type="date"
              value={genForm.periodFrom}
              onChange={v => setGenForm(p => ({ ...p, periodFrom: v }))}
            />
            <AdminTextField
              label="Hasta"
              type="date"
              value={genForm.periodTo}
              onChange={v => setGenForm(p => ({ ...p, periodTo: v }))}
            />
            <AdminSelectField
              label="Campus"
              value={genForm.campus}
              onChange={v => setGenForm(p => ({ ...p, campus: v }))}
              options={[
                { value: "all", label: "Todos los campus" },
                ...campuses.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
            <AdminSelectField
              label="Área"
              value={genForm.area}
              onChange={v => setGenForm(p => ({ ...p, area: v }))}
              options={[
                { value: "all", label: "Todas las áreas" },
                { value: "edif-a", label: "Edificio A – Rectoría" },
                { value: "edif-b", label: "Edificio B – Ciencias" },
                { value: "edif-c", label: "Edificio C – Ingenierías" },
                { value: "lab-quim", label: "Laboratorio de Química" },
              ]}
            />
            <AdminSelectField
              label="Scope"
              value={genForm.scope}
              onChange={v => setGenForm(p => ({ ...p, scope: v }))}
              options={[
                { value: "all", label: "Todos" },
                { value: "1", label: "Scope 1" },
                { value: "2", label: "Scope 2" },
                { value: "3", label: "Scope 3" },
              ]}
            />
            <AdminSelectField
              label="Estado de registros"
              value={genForm.status}
              onChange={v => setGenForm(p => ({ ...p, status: v }))}
              options={[
                { value: "all", label: "Todos" },
                { value: "approved", label: "Aprobados" },
                { value: "pending", label: "Pendientes" },
              ]}
            />

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{
                fontFamily: fb, fontSize: 12, fontWeight: 600,
                color: "var(--eco-text-soft)", marginBottom: 8,
              }}>
                Formato de exportación
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {activeTpl.formats.map(f => {
                  const FmtIcon = FORMAT_ICON[f] || FileText;
                  const active = genForm.format === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setGenForm(p => ({ ...p, format: f }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 8,
                        border: `1px solid ${active ? FORMAT_COLOR[f] : "var(--eco-border)"}`,
                        background: active ? `${FORMAT_COLOR[f]}12` : "var(--eco-card)",
                        color: active ? FORMAT_COLOR[f] : "var(--eco-text-soft)",
                        fontFamily: fb, fontSize: 12.5, fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      <FmtIcon size={13} /> {f}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField
                label="Incluir evidencias y anexos"
                description="Adjunta archivos cargados (facturas, recibos, fotos) al exportar."
                checked={genForm.includeEvidences}
                onChange={v => setGenForm(p => ({ ...p, includeEvidences: v }))}
              />
            </div>

            <div style={{
              gridColumn: "1 / -1",
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 8,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px solid var(--eco-border)",
              fontFamily: fb, fontSize: 11.5,
              color: "var(--eco-text-soft)",
            }}>
              <Eye size={14} />
              <span>
                Tras generar, podrás ver una vista previa antes de descargar el archivo final.
              </span>
            </div>
          </div>
        )}
      </AdminFormModal>

      {/* ── Preview modal ────────────────────────────────────────── */}
      {previewOpen && (
        <ReportPreviewModal onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

/* ─── Preview modal ──────────────────────────────────────────────── */
function ReportPreviewModal({ onClose }) {
  const r = reportPreviewSample;
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,23,42,.45)", backdropFilter: "blur(3px)",
        animation: "adminFadeIn .16s ease-out",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 101,
        width: "min(720px, calc(100vw - 32px))",
        maxHeight: "calc(100vh - 48px)",
        display: "flex", flexDirection: "column",
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        animation: "adminModalIn .2s cubic-bezier(.2,.8,.2,1)",
      }}>
        <div style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--eco-border)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ fontFamily: fd, fontSize: 17, fontWeight: 800, margin: 0, color: "var(--eco-text)" }}>
              Vista previa del reporte
            </h2>
            <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", margin: "3px 0 0" }}>
              Generado el {fmtDate(r.generatedAt)} por {r.generatedBy}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--eco-text-soft)", padding: 4,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", overflowY: "auto" }}>
          {/* Title */}
          <div style={{
            padding: "16px 20px", borderRadius: 10,
            background: "rgba(34,197,94,.06)",
            border: "1px solid rgba(34,197,94,.18)",
            marginBottom: 18,
          }}>
            <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text)" }}>
              {r.title}
            </div>
            <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 4 }}>
              {r.periodLabel} · {r.campus}
            </div>
          </div>

          {/* Totals */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10, marginBottom: 18,
          }}>
            {[
              { label: "Scope 1",  value: r.totals.scope1, color: "#DC2626" },
              { label: "Scope 2",  value: r.totals.scope2, color: "#2563EB" },
              { label: "Scope 3",  value: r.totals.scope3, color: "#7C3AED" },
              { label: "Total",    value: r.totals.total,  color: "#16A34A", strong: true },
            ].map(b => (
              <div key={b.label} style={{
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${b.strong ? b.color : "var(--eco-border)"}`,
                background: b.strong ? `${b.color}10` : "var(--eco-card)",
              }}>
                <div style={{
                  fontFamily: fb, fontSize: 10.5, fontWeight: 600,
                  color: "var(--eco-text-soft)",
                  textTransform: "uppercase", letterSpacing: ".05em",
                }}>{b.label}</div>
                <div style={{
                  fontFamily: fm, fontSize: 18, fontWeight: 700,
                  color: b.color, marginTop: 4,
                }}>
                  {fmtNumber(b.value)}
                </div>
                <div style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-text-soft)" }}>
                  {r.totals.unit}
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div style={{
            fontFamily: fd, fontSize: 13, fontWeight: 700,
            color: "var(--eco-text)", marginBottom: 8,
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            Desglose por categoría
          </div>
          <div style={{
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {r.breakdown.map((b, i) => (
              <div key={b.label} style={{
                padding: "10px 14px",
                borderBottom: i < r.breakdown.length - 1 ? "1px solid var(--eco-border)" : "none",
                display: "grid", gridTemplateColumns: "1fr 100px 70px",
                alignItems: "center", gap: 12,
              }}>
                <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 500, color: "var(--eco-text)" }}>
                  {b.label}
                </div>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: "var(--eco-card-muted, #F1F5F9)",
                  overflow: "hidden", position: "relative",
                }}>
                  <div style={{
                    width: `${b.pct}%`, height: "100%",
                    background: "var(--eco-primary-500, #22C55E)",
                  }} />
                </div>
                <div style={{
                  fontFamily: fm, fontSize: 12, fontWeight: 600,
                  color: "var(--eco-text)", textAlign: "right",
                }}>
                  {fmtNumber(b.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: "14px 22px",
          borderTop: "1px solid var(--eco-border)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={onClose} style={secondaryBtn}>Cerrar</button>
          <button style={primaryBtn}>
            <Download size={14} /> Descargar
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Shared button styles ───────────────────────────────────────── */
const primaryBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
  fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 1px 3px rgba(34,197,94,.25)",
  transition: "background .15s",
};

const secondaryBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)", color: "var(--eco-text)",
  fontFamily: fb, fontSize: 13, fontWeight: 500, cursor: "pointer",
};

const iconBtn = {
  background: "transparent", border: "1px solid var(--eco-border)",
  color: "var(--eco-text-soft)", padding: 5, borderRadius: 6,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
