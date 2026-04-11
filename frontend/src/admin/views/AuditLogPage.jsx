import React from "react";
import { ScrollText, X, ExternalLink } from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import { auditLog } from "../mocks/adminMocks";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const ACTION_LABELS = {
  create: "Creación", update: "Actualización", delete: "Eliminación",
  export: "Exportación", login: "Acceso", system: "Sistema",
};
const ACTION_VARIANTS = {
  create: "success", update: "info", delete: "error",
  export: "neutral", login: "neutral", system: "neutral",
};
const STATUS_VARIANTS = { success: "success", warning: "warning", error: "error" };

function fmtDate(ts) {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ module: "all", action: "all", status: "all" });
  const [selected, setSelected] = React.useState(null);

  /* Unique values for filter dropdowns */
  const modules = [...new Set(auditLog.map(e => e.module))].sort();
  const actions = [...new Set(auditLog.map(e => e.action))].sort();

  /* Filtered data */
  const filtered = React.useMemo(() => {
    return auditLog.filter(evt => {
      if (search) {
        const q = search.toLowerCase();
        const match = [evt.user, evt.description, evt.module, evt.target]
          .some(f => f?.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filters.module !== "all" && evt.module !== filters.module) return false;
      if (filters.action !== "all" && evt.action !== filters.action) return false;
      if (filters.status !== "all" && evt.status !== filters.status) return false;
      return true;
    });
  }, [search, filters]);

  const columns = [
    {
      key: "ts", label: "Fecha", mono: true, nowrap: true, width: 150,
      render: (v) => <span style={{ fontSize: 11.5 }}>{fmtDate(v)}</span>,
    },
    {
      key: "user", label: "Usuario", width: 140,
      render: (v) => <strong style={{ fontWeight: 600 }}>{v}</strong>,
    },
    {
      key: "action", label: "Acción", width: 110,
      render: (v) => <AdminStatusBadge variant={ACTION_VARIANTS[v] || "neutral"} label={ACTION_LABELS[v] || v} dot={false} />,
    },
    { key: "module", label: "Módulo", width: 120 },
    {
      key: "description", label: "Descripción",
      render: (v) => (
        <span style={{
          display: "block", maxWidth: 320,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {v}
        </span>
      ),
    },
    {
      key: "severity", label: "Severidad", width: 90, align: "center",
      render: (v) => <AdminStatusBadge variant={v} label={v === "high" ? "Alta" : v === "medium" ? "Media" : "Baja"} dot />,
    },
    {
      key: "status", label: "Estado", width: 90, align: "center",
      render: (v) => <AdminStatusBadge variant={STATUS_VARIANTS[v] || "neutral"} label={v === "success" ? "OK" : v === "warning" ? "Adv." : "Error"} />,
    },
  ];

  function clearFilters() {
    setSearch("");
    setFilters({ module: "all", action: "all", status: "all" });
  }

  return (
    <>
      <AdminPageHeader
        title="Bitácora y auditoría"
        subtitle="Registro completo de actividad administrativa del sistema"
        icon={ScrollText}
        breadcrumb={["Gobierno", "Bitácora y auditoría"]}
        actions={
          <button style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 14px", borderRadius: 8,
            border: "1px solid var(--eco-border, #E2E8F0)",
            background: "var(--eco-card, #fff)",
            fontFamily: fb, fontSize: 12.5, fontWeight: 500,
            color: "var(--eco-text, #1E293B)", cursor: "pointer",
            transition: "all .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--eco-card, #fff)"}
          >
            <ExternalLink size={13} /> Exportar
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ── Filter bar ──────────────────────────────────────────── */}
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar usuario, descripción, módulo..."
          filters={[
            { key: "module", label: "Todos los módulos", options: modules },
            {
              key: "action", label: "Todas las acciones",
              options: actions.map(a => ({ value: a, label: ACTION_LABELS[a] || a })),
            },
            {
              key: "status", label: "Todos los estados",
              options: [
                { value: "success", label: "Exitoso" },
                { value: "warning", label: "Advertencia" },
                { value: "error", label: "Error" },
              ],
            },
          ]}
          filterValues={filters}
          onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
          onClear={clearFilters}
        />

        {/* ── Results count ───────────────────────────────────────── */}
        <div style={{
          fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #94A3B8)",
          padding: "0 2px",
        }}>
          Mostrando <strong style={{ fontFamily: fm, fontWeight: 700, color: "var(--eco-text, #1E293B)" }}>{filtered.length}</strong> de {auditLog.length} registros
        </div>

        {/* ── Data Table ──────────────────────────────────────────── */}
        <AdminDataTable
          columns={columns}
          data={filtered}
          sortable
          onRowClick={setSelected}
          emptyMessage="No se encontraron registros con los filtros aplicados"
          maxHeight={520}
        />
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              background: "rgba(15,23,42,.3)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Drawer */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: 420, maxWidth: "90vw",
            zIndex: 61,
            background: "var(--eco-card, #fff)",
            boxShadow: "-8px 0 30px rgba(0,0,0,.10)",
            display: "flex", flexDirection: "column",
            animation: "adminFadeIn .2s ease-out",
          }}>
            {/* Drawer header */}
            <div style={{
              padding: "18px 22px",
              borderBottom: "1px solid var(--eco-border, #E2E8F0)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{
                fontFamily: fd, fontSize: 15, fontWeight: 700,
                color: "var(--eco-text, #1E293B)",
              }}>
                Detalle del evento
              </span>
              <button onClick={() => setSelected(null)} style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--eco-text-soft, #94A3B8)",
              }}>
                <X size={14} />
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 22px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  ["Fecha y hora",      fmtDate(selected.ts)],
                  ["Usuario",           selected.user],
                  ["Acción",            ACTION_LABELS[selected.action] || selected.action],
                  ["Módulo",            selected.module],
                  ["Descripción",       selected.description],
                  ["Elemento afectado", selected.target],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{
                      fontFamily: fb, fontSize: 11, fontWeight: 600,
                      color: "var(--eco-text-soft, #94A3B8)",
                      textTransform: "uppercase", letterSpacing: ".05em",
                      marginBottom: 4,
                    }}>
                      {label}
                    </div>
                    <div style={{
                      fontFamily: fb, fontSize: 13.5,
                      color: "var(--eco-text, #1E293B)",
                      lineHeight: 1.5,
                    }}>
                      {val}
                    </div>
                  </div>
                ))}

                {/* Status + severity badges */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div>
                    <div style={{
                      fontFamily: fb, fontSize: 11, fontWeight: 600,
                      color: "var(--eco-text-soft, #94A3B8)",
                      textTransform: "uppercase", letterSpacing: ".05em",
                      marginBottom: 6,
                    }}>
                      Estado
                    </div>
                    <AdminStatusBadge variant={STATUS_VARIANTS[selected.status] || "neutral"} label={selected.status === "success" ? "Exitoso" : selected.status === "warning" ? "Advertencia" : "Error"} />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: fb, fontSize: 11, fontWeight: 600,
                      color: "var(--eco-text-soft, #94A3B8)",
                      textTransform: "uppercase", letterSpacing: ".05em",
                      marginBottom: 6,
                    }}>
                      Severidad
                    </div>
                    <AdminStatusBadge variant={selected.severity} label={selected.severity === "high" ? "Alta" : selected.severity === "medium" ? "Media" : "Baja"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
