import React from "react";
import {
  Calendar,
  Plus,
  Edit3,
  Lock,
  Unlock,
  Star,
  AlertCircle,
  Eye,
  CalendarDays,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import { AdminTextField, AdminSelectField, AdminToggleField } from "../components/AdminFormSection";
import { periods as mockPeriods, periodTypes } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS_MAP = {
  open: { label: "Abierto", variant: "success", icon: Unlock, color: "var(--eco-success, #16A34A)" },
  closed: { label: "Cerrado", variant: "neutral", icon: Lock, color: "var(--eco-text-soft, #64748B)" },
  review: { label: "En revisión", variant: "warning", icon: Eye, color: "var(--eco-warning, #CA8A04)" },
};

const TYPE_LABELS = {
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semester: "Semestral",
  annual: "Anual",
};

const ROLE_LABELS = {
  admin: "Administración",
  directivo: "Directivo",
  operativo: "Operativo",
  consulta: "Consulta",
};

const EMPTY_PERIOD = {
  name: "",
  label: "",
  type: "quarterly",
  startDate: "",
  endDate: "",
  status: "open",
  isDefault: false,
  captureDeadline: "",
  validationDeadline: "",
  reportDeadline: "",
  lockCaptureOnClose: true,
  allowSpecialReopen: false,
  specialReopenRoles: ["admin"],
  specialReopenNote: "",
};

function normalizePeriod(period) {
  return {
    ...EMPTY_PERIOD,
    ...period,
    specialReopenRoles: period.specialReopenRoles?.length ? period.specialReopenRoles : ["admin"],
  };
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function PeriodStatusBadge({ status }) {
  const config = STATUS_MAP[status] || STATUS_MAP.closed;
  return <AdminStatusBadge variant={config.variant} label={config.label} />;
}

function RulePill({ icon: Icon, label, tone = "neutral" }) {
  const tones = {
    neutral: {
      background: "var(--eco-card-muted, #F1F5F9)",
      color: "var(--eco-text-soft, #64748B)",
      border: "var(--eco-border, #E2E8F0)",
    },
    warning: {
      background: "rgba(234,179,8,.08)",
      color: "var(--eco-warning, #CA8A04)",
      border: "rgba(234,179,8,.18)",
    },
    info: {
      background: "rgba(37,99,235,.06)",
      color: "var(--eco-info, #2563EB)",
      border: "rgba(37,99,235,.16)",
    },
    success: {
      background: "rgba(34,197,94,.08)",
      color: "var(--eco-success, #16A34A)",
      border: "rgba(34,197,94,.16)",
    },
  };
  const style = tones[tone] || tones.neutral;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 9px",
      borderRadius: 999,
      background: style.background,
      color: style.color,
      border: `1px solid ${style.border}`,
      fontFamily: fb,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      <Icon size={11} /> {label}
    </span>
  );
}

function TimelineCard({ period, onClick }) {
  const status = STATUS_MAP[period.status] || STATUS_MAP.closed;
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = period.status === "open" && period.endDate < today;

  return (
    <button
      onClick={() => onClick(period)}
      style={{
        flex: "0 0 auto",
        width: 240,
        padding: "16px 18px",
        background: "var(--eco-card, #fff)",
        border: period.isDefault ? "2px solid var(--eco-primary-500, #22C55E)" : "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
        transition: "all .15s",
        position: "relative",
        opacity: period.status === "closed" ? 0.8 : 1,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.08)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = "none";
      }}
    >
      {period.isDefault && (
        <div style={{
          position: "absolute",
          top: -1,
          right: 12,
          padding: "2px 8px",
          borderRadius: "0 0 6px 6px",
          background: "var(--eco-primary-500, #22C55E)",
          fontFamily: fb,
          fontSize: 9,
          fontWeight: 700,
          color: "#fff",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}>
          Activo
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <status.icon size={14} color={status.color} />
        <span style={{
          fontFamily: fd,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--eco-text, #1E293B)",
        }}>
          {period.name}
        </span>
      </div>

      <div style={{
        fontFamily: fb,
        fontSize: 12,
        color: "var(--eco-text-soft, #64748B)",
        marginBottom: 8,
      }}>
        {period.label}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <PeriodStatusBadge status={period.status} />
        <span style={{
          fontFamily: fm,
          fontSize: 10,
          color: "var(--eco-text-soft, #94A3B8)",
        }}>
          {TYPE_LABELS[period.type]}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <RulePill
          icon={period.lockCaptureOnClose ? Lock : Unlock}
          label={period.lockCaptureOnClose ? "Bloquea captura al cerrar" : "Captura abierta"}
          tone={period.lockCaptureOnClose ? "warning" : "success"}
        />
        {period.allowSpecialReopen && (
          <RulePill icon={RotateCcw} label="Reapertura especial" tone="info" />
        )}
      </div>

      {isOverdue && (
        <div style={{
          marginTop: 8,
          padding: "3px 8px",
          borderRadius: 6,
          background: "rgba(239,68,68,.08)",
          fontFamily: fb,
          fontSize: 10.5,
          fontWeight: 500,
          color: "var(--eco-danger, #DC2626)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          <AlertCircle size={10} /> Periodo vencido sin cerrar
        </div>
      )}

      <div style={{
        marginTop: 10,
        height: 4,
        borderRadius: 2,
        background: "var(--eco-card-muted, #E2E8F0)",
        overflow: "hidden",
      }}>
        {period.status !== "closed" && (() => {
          const start = new Date(period.startDate).getTime();
          const end = new Date(period.endDate).getTime();
          const now = new Date().getTime();
          const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
          return (
            <div style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: 2,
              background: isOverdue ? "var(--eco-danger, #DC2626)" : "var(--eco-primary-500, #22C55E)",
              transition: "width .3s",
            }} />
          );
        })()}
      </div>
    </button>
  );
}

function RulesSummary({ period }) {
  if (!period) return null;

  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 12,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div>
        <div style={{
          fontFamily: fb,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--eco-text-soft, #94A3B8)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 8,
        }}>
          Reglas operativas
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <RulePill
            icon={period.lockCaptureOnClose ? Lock : Unlock}
            label={period.lockCaptureOnClose ? "Bloqueo de captura al cerrar" : "Sin bloqueo automático"}
            tone={period.lockCaptureOnClose ? "warning" : "success"}
          />
          <RulePill
            icon={period.allowSpecialReopen ? RotateCcw : ShieldCheck}
            label={period.allowSpecialReopen ? "Reapertura con permisos especiales" : "Sin reapertura especial"}
            tone={period.allowSpecialReopen ? "info" : "neutral"}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <DrawerField label="Captura al cerrar">
          {period.lockCaptureOnClose ? "Se bloquea automáticamente" : "Permanece disponible"}
        </DrawerField>
        <DrawerField label="Perfiles para reapertura">
          {period.allowSpecialReopen
            ? period.specialReopenRoles.map((role) => ROLE_LABELS[role] || role).join(", ")
            : "No aplica"}
        </DrawerField>
      </div>

      {period.specialReopenNote && (
        <DrawerField label="Nota de reapertura">{period.specialReopenNote}</DrawerField>
      )}
    </div>
  );
}

export default function PeriodsPage() {
  const [periodsList, setPeriodsList] = React.useState(() => mockPeriods.map(normalizePeriod));
  const [viewMode, setViewMode] = React.useState("timeline");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [drawerPeriod, setDrawerPeriod] = React.useState(null);
  const [modalPeriod, setModalPeriod] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const filtered = React.useMemo(() => {
    let list = [...periodsList];
    if (search) {
      const query = search.toLowerCase();
      list = list.filter((period) => period.name.toLowerCase().includes(query) || period.label.toLowerCase().includes(query));
    }
    if (filters.status && filters.status !== "all") list = list.filter((period) => period.status === filters.status);
    if (filters.type && filters.type !== "all") list = list.filter((period) => period.type === filters.type);
    return list;
  }, [filters, periodsList, search]);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      const normalized = normalizePeriod(modalPeriod);
      if (normalized.id) {
        setPeriodsList((prev) => prev.map((period) => (period.id === normalized.id ? normalized : period)));
        setDrawerPeriod((current) => (current?.id === normalized.id ? normalized : current));
      } else {
        const created = { ...normalized, id: `p${Date.now()}` };
        setPeriodsList((prev) => [...prev, created]);
      }
      setSaving(false);
      setModalPeriod(null);
    }, 450);
  }

  const openCount = periodsList.filter((period) => period.status === "open").length;
  const reviewCount = periodsList.filter((period) => period.status === "review").length;
  const closedCount = periodsList.filter((period) => period.status === "closed").length;
  const lockedCount = periodsList.filter((period) => period.lockCaptureOnClose).length;
  const reopenableCount = periodsList.filter((period) => period.allowSpecialReopen).length;

  const columns = [
    {
      key: "name",
      label: "Periodo",
      width: "16%",
      render: (value, row) => (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{value}</span>
          {row.isDefault && <Star size={11} fill="var(--eco-warning, #CA8A04)" color="var(--eco-warning, #CA8A04)" />}
        </span>
      ),
    },
    { key: "label", label: "Descripción", width: "18%" },
    {
      key: "type",
      label: "Tipo",
      width: "10%",
      render: (value) => <span style={{ fontFamily: fb, fontSize: 12 }}>{TYPE_LABELS[value]}</span>,
    },
    {
      key: "startDate",
      label: "Inicio",
      width: "12%",
      nowrap: true,
      render: (value) => <span style={{ fontSize: 12, fontFamily: fm }}>{fmtDate(value)}</span>,
    },
    {
      key: "endDate",
      label: "Fin",
      width: "12%",
      nowrap: true,
      render: (value) => <span style={{ fontSize: 12, fontFamily: fm }}>{fmtDate(value)}</span>,
    },
    {
      key: "status",
      label: "Estado",
      width: "12%",
      render: (value) => <PeriodStatusBadge status={value} />,
    },
    {
      key: "rules",
      label: "Control operativo",
      width: "20%",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <RulePill icon={row.lockCaptureOnClose ? Lock : Unlock} label={row.lockCaptureOnClose ? "Bloquea captura" : "Captura abierta"} tone={row.lockCaptureOnClose ? "warning" : "success"} />
          {row.allowSpecialReopen && <RulePill icon={RotateCcw} label="Reapertura especial" tone="info" />}
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Periodos y ciclos de trabajo"
        subtitle={`${openCount} abiertos · ${reviewCount} en revisión · ${closedCount} cerrados`}
        icon={Calendar}
        breadcrumb={["Operación", "Periodos"]}
        actions={(
          <button
            onClick={() => setModalPeriod({ ...EMPTY_PERIOD })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--eco-primary-500, #22C55E)",
              fontFamily: fb,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              transition: "all .12s",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "var(--eco-primary-600, #16A34A)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "var(--eco-primary-500, #22C55E)";
            }}
          >
            <Plus size={14} /> Nuevo periodo
          </button>
        )}
      />

      <AdminTabs
        tabs={[
          { id: "timeline", label: "Timeline" },
          { id: "table", label: "Vista tabular", count: filtered.length },
        ]}
        activeTab={viewMode}
        onChange={setViewMode}
      />

      {viewMode === "timeline" ? (
        <>
          <div style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            padding: "6px 2px 14px",
            scrollbarWidth: "thin",
          }}>
            {periodsList
              .slice()
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((period) => (
                <TimelineCard key={period.id} period={period} onClick={setDrawerPeriod} />
              ))}
          </div>

          <div style={{
            marginTop: 10,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontFamily: fb,
            fontSize: 11.5,
            color: "var(--eco-text-soft, #64748B)",
          }}>
            {Object.entries(STATUS_MAP).map(([key, value]) => (
              <span key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <value.icon size={11} color={value.color} /> {value.label}
              </span>
            ))}
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Star size={11} fill="var(--eco-warning, #CA8A04)" color="var(--eco-warning, #CA8A04)" /> Periodo activo por defecto
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Lock size={11} color="var(--eco-warning, #CA8A04)" /> Bloqueo de captura al cierre
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <RotateCcw size={11} color="var(--eco-info, #2563EB)" /> Reapertura con permisos especiales
            </span>
          </div>

          <div style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}>
            {[
              { label: "Abiertos", value: openCount, icon: Unlock, color: "var(--eco-success, #16A34A)" },
              { label: "En revisión", value: reviewCount, icon: Eye, color: "var(--eco-warning, #CA8A04)" },
              { label: "Cerrados", value: closedCount, icon: Lock, color: "var(--eco-text-soft, #64748B)" },
              { label: "Captura bloqueable", value: lockedCount, icon: ShieldCheck, color: "var(--eco-warning, #CA8A04)" },
              { label: "Con reapertura especial", value: reopenableCount, icon: RotateCcw, color: "var(--eco-info, #2563EB)" },
              { label: "Total", value: periodsList.length, icon: CalendarDays, color: "var(--eco-info, #2563EB)" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "16px 18px",
                  background: "var(--eco-card, #fff)",
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: `${card.color}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <card.icon size={16} color={card.color} />
                </div>
                <div>
                  <div style={{
                    fontFamily: fd,
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--eco-text, #1E293B)",
                  }}>
                    {card.value}
                  </div>
                  <div style={{
                    fontFamily: fb,
                    fontSize: 11,
                    color: "var(--eco-text-soft, #94A3B8)",
                  }}>
                    {card.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <AdminFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar periodo..."
              filters={[
                { key: "status", label: "Estado", options: [{ value: "open", label: "Abierto" }, { value: "review", label: "En revisión" }, { value: "closed", label: "Cerrado" }] },
                { key: "type", label: "Tipo", options: periodTypes },
              ]}
              filterValues={filters}
              onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              onClear={() => {
                setSearch("");
                setFilters({});
              }}
            />
          </div>
          <AdminDataTable
            columns={columns}
            data={filtered}
            sortable
            onRowClick={setDrawerPeriod}
            maxHeight={440}
            emptyMessage="No se encontraron periodos con estos filtros."
          />
        </>
      )}

      <AdminEntityDrawer
        open={!!drawerPeriod}
        onClose={() => setDrawerPeriod(null)}
        title={drawerPeriod?.name}
        subtitle={drawerPeriod?.label}
        badge={drawerPeriod && <PeriodStatusBadge status={drawerPeriod.status} />}
        actions={drawerPeriod && (
          <button
            onClick={() => {
              setModalPeriod({ ...drawerPeriod });
              setDrawerPeriod(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              fontFamily: fb,
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--eco-text, #1E293B)",
              cursor: "pointer",
            }}
          >
            <Edit3 size={12} /> Editar
          </button>
        )}
      >
        {drawerPeriod && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Tipo">{TYPE_LABELS[drawerPeriod.type]}</DrawerField>
              <DrawerField label="Por defecto">
                {drawerPeriod.isDefault
                  ? <span style={{ color: "var(--eco-primary-600, #16A34A)", fontWeight: 600 }}>Sí</span>
                  : "No"}
              </DrawerField>
              <DrawerField label="Fecha inicio" mono>{fmtDate(drawerPeriod.startDate)}</DrawerField>
              <DrawerField label="Fecha fin" mono>{fmtDate(drawerPeriod.endDate)}</DrawerField>
            </div>

            <div style={{
              padding: "14px 0",
              borderTop: "1px solid var(--eco-border, #E2E8F0)",
            }}>
              <span style={{
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--eco-text-soft, #94A3B8)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}>
                Fechas límite
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
                <DrawerField label="Captura" mono>{fmtDate(drawerPeriod.captureDeadline)}</DrawerField>
                <DrawerField label="Validación" mono>{fmtDate(drawerPeriod.validationDeadline)}</DrawerField>
                <DrawerField label="Reporte" mono>{fmtDate(drawerPeriod.reportDeadline)}</DrawerField>
              </div>
            </div>

            <RulesSummary period={drawerPeriod} />
          </>
        )}
      </AdminEntityDrawer>

      <AdminFormModal
        open={!!modalPeriod}
        onClose={() => setModalPeriod(null)}
        title={modalPeriod?.id ? "Editar periodo" : "Nuevo periodo"}
        subtitle={modalPeriod?.id ? modalPeriod.label : "Configura un nuevo periodo de trabajo"}
        onSave={handleSave}
        saving={saving}
        width={620}
      >
        {modalPeriod && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <AdminTextField
                label="Nombre"
                required
                value={modalPeriod.name}
                onChange={(value) => setModalPeriod((period) => ({ ...period, name: value }))}
                placeholder="2026-Q3"
              />
              <AdminTextField
                label="Etiqueta descriptiva"
                value={modalPeriod.label}
                onChange={(value) => setModalPeriod((period) => ({ ...period, label: value }))}
                placeholder="Julio - Sep 2026"
              />
              <AdminSelectField
                label="Tipo"
                required
                value={modalPeriod.type}
                onChange={(value) => setModalPeriod((period) => ({ ...period, type: value }))}
                options={periodTypes}
              />
              <AdminSelectField
                label="Estado"
                value={modalPeriod.status}
                onChange={(value) => setModalPeriod((period) => ({ ...period, status: value }))}
                options={[
                  { value: "open", label: "Abierto" },
                  { value: "review", label: "En revisión" },
                  { value: "closed", label: "Cerrado" },
                ]}
              />
              <AdminTextField
                label="Fecha inicio"
                type="date"
                required
                value={modalPeriod.startDate}
                onChange={(value) => setModalPeriod((period) => ({ ...period, startDate: value }))}
              />
              <AdminTextField
                label="Fecha fin"
                type="date"
                required
                value={modalPeriod.endDate}
                onChange={(value) => setModalPeriod((period) => ({ ...period, endDate: value }))}
              />
            </div>

            <AdminToggleField
              label="Periodo activo por defecto"
              checked={modalPeriod.isDefault}
              onChange={(value) => setModalPeriod((period) => ({ ...period, isDefault: value }))}
              description="Se usará como periodo predeterminado para captura"
            />

            <div style={{
              paddingTop: 14,
              borderTop: "1px solid var(--eco-border, #E2E8F0)",
            }}>
              <span style={{
                fontFamily: fb,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--eco-text-soft, #64748B)",
                letterSpacing: ".02em",
                marginBottom: 10,
                display: "block",
              }}>
                Fechas límite
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <AdminTextField
                  label="Captura"
                  type="date"
                  value={modalPeriod.captureDeadline}
                  onChange={(value) => setModalPeriod((period) => ({ ...period, captureDeadline: value }))}
                />
                <AdminTextField
                  label="Validación"
                  type="date"
                  value={modalPeriod.validationDeadline}
                  onChange={(value) => setModalPeriod((period) => ({ ...period, validationDeadline: value }))}
                />
                <AdminTextField
                  label="Reporte"
                  type="date"
                  value={modalPeriod.reportDeadline}
                  onChange={(value) => setModalPeriod((period) => ({ ...period, reportDeadline: value }))}
                />
              </div>
            </div>

            <div style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              <div>
                <div style={{
                  fontFamily: fb,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--eco-text-soft, #94A3B8)",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}>
                  Control operativo del periodo
                </div>
                <div style={{
                  marginTop: 4,
                  fontFamily: fb,
                  fontSize: 12.5,
                  color: "var(--eco-text-soft, #64748B)",
                  lineHeight: 1.5,
                }}>
                  Define cómo se comporta la captura cuando el periodo se cierra y quién puede reabrirlo.
                </div>
              </div>

              <AdminToggleField
                label="Bloquear captura cuando el periodo se cierre"
                checked={modalPeriod.lockCaptureOnClose}
                onChange={(value) => setModalPeriod((period) => ({ ...period, lockCaptureOnClose: value }))}
                description="La UI deja visible que el cierre impide nuevas capturas sobre el periodo."
              />

              <AdminToggleField
                label="Permitir reapertura con permisos especiales"
                checked={modalPeriod.allowSpecialReopen}
                onChange={(value) => setModalPeriod((period) => ({ ...period, allowSpecialReopen: value }))}
                description="Solo perfiles autorizados podrán habilitar una reapertura excepcional."
              />

              <AdminSelectField
                label="Perfil principal para reapertura"
                value={modalPeriod.specialReopenRoles?.[0] || "admin"}
                onChange={(value) => setModalPeriod((period) => ({ ...period, specialReopenRoles: [value] }))}
                options={[
                  { value: "admin", label: ROLE_LABELS.admin },
                  { value: "directivo", label: ROLE_LABELS.directivo },
                  { value: "operativo", label: ROLE_LABELS.operativo },
                ]}
                disabled={!modalPeriod.allowSpecialReopen}
                hint="Puedes dejar un perfil principal aunque la lógica real aún sea frontend-only."
              />

              <AdminTextField
                label="Nota de reapertura"
                multiline
                rows={2}
                value={modalPeriod.specialReopenNote}
                onChange={(value) => setModalPeriod((period) => ({ ...period, specialReopenNote: value }))}
                placeholder="Describe la regla o criterio para permitir reaperturas"
              />
            </div>
          </>
        )}
      </AdminFormModal>
    </>
  );
}
