import React from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  History,
  Lock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Unlock,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import {
  fetchAdminEmissionCalculation,
  recalculateAdminEmissions,
} from "../../api/admin";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const EMPTY_NOTICE = { type: "", message: "" };

const PERIOD_STATUS = {
  open: { color: "#16A34A", label: "Abierto", icon: Unlock, locked: false },
  review: { color: "#CA8A04", label: "Revisión", icon: CheckCircle2, locked: false },
  closed: { color: "#DC2626", label: "Cerrado", icon: Lock, locked: true },
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function formatNumber(value, fractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("es-MX", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDate(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) return "Sin fecha";
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) return "Sin fecha";
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error) {
  const code = error?.payload?.code || error?.code;
  const message = normalizeText(error?.payload?.message || error?.message);

  if (code === "backend_not_configured") return "El backend no está configurado para esta sesión.";
  if (code === "UNAUTHENTICATED") return "Sesión expirada. Vuelve a iniciar sesión.";
  if (code === "FORBIDDEN") return "No tienes permiso para administrar emisiones.";
  if (code === "PERIOD_CLOSED") return message || "El periodo está cerrado y bloquea el recálculo.";
  if (message && message !== "request_failed") return message;
  return "No se pudo completar la operación de emisiones y cálculo.";
}

function normalizePayload(payload) {
  return {
    period: payload?.period || null,
    summary: payload?.summary || {
      totalScope1: 0,
      totalScope2: 0,
      totalScope3: 0,
      total: 0,
      unit: "kgCO2e",
      period: "Periodo actual",
      vsLastPeriod: 0,
      records: 0,
    },
    calculations: Array.isArray(payload?.calculations) ? payload.calculations : [],
    history: Array.isArray(payload?.history) ? payload.history : [],
  };
}

export default function EmissionsCalcPage() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [notice, setNotice] = React.useState(EMPTY_NOTICE);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ category: "all" });
  const [selected, setSelected] = React.useState(null);
  const [data, setData] = React.useState(() => normalizePayload(null));
  const [recalcBanner, setRecalcBanner] = React.useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setNotice(EMPTY_NOTICE);
    try {
      const payload = await fetchAdminEmissionCalculation();
      setData(normalizePayload(payload));
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
      setData(normalizePayload(null));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const currentPeriod = data.period || {
    name: data.summary.period,
    label: "Periodo actual",
    startDate: "",
    endDate: "",
    status: "open",
  };
  const periodCfg = PERIOD_STATUS[currentPeriod?.status] || PERIOD_STATUS.open;
  const PeriodIcon = periodCfg.icon;
  const periodLocked = periodCfg.locked;

  const filtered = React.useMemo(() => data.calculations.filter((item) => {
    if (filters.category !== "all" && normalizeText(item.category) !== filters.category) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      item.area,
      item.areaCode,
      item.campusCode,
      item.source,
      item.category,
      item.activity,
    ].some((value) => normalizeText(value).toLowerCase().includes(query));
  }), [data.calculations, search, filters]);

  async function handleRecalculate(target) {
    if (periodLocked || actionLoading) return;
    setActionLoading(true);
    setNotice(EMPTY_NOTICE);
    try {
      const response = await recalculateAdminEmissions({
        recordId: target?.id || "",
        trigger: target
          ? `Recálculo manual: ${target.source} - ${target.area}`
          : `Recálculo global del periodo ${currentPeriod.name}`,
      });
      const normalized = normalizePayload(response);
      setData(normalized);
      setSelected((current) => {
        if (!current?.id) return current;
        return normalized.calculations.find((item) => item.id === current.id) || current;
      });
      setRecalcBanner(response?.result || {
        trigger: target ? `Recálculo manual: ${target.source} - ${target.area}` : `Recálculo global del periodo ${currentPeriod.name}`,
        recordsAffected: 0,
      });
      setTimeout(() => setRecalcBanner(null), 2800);
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
    } finally {
      setActionLoading(false);
    }
  }

  const columns = [
    { key: "scope", label: "Scope", width: 70, render: (value) => (
      <span style={{
        fontFamily: fm,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 12,
        background: value === 1 ? "rgba(234,88,12,.12)" : value === 2 ? "rgba(37,99,235,.12)" : "rgba(124,58,237,.12)",
        color: value === 1 ? "#EA580C" : value === 2 ? "#2563EB" : "#7C3AED",
      }}>
        S{value || "-"}
      </span>
    ) },
    { key: "source", label: "Fuente", width: 150 },
    { key: "area", label: "Área" },
    { key: "consumption", label: "Consumo", mono: true, align: "right", render: (value, row) => (
      <span><strong>{formatNumber(value, 2)}</strong> <span style={{ opacity: 0.6 }}>{row.unit}</span></span>
    ) },
    { key: "factor", label: "Factor", mono: true, align: "right", width: 110, render: (value) => formatNumber(value, 6) },
    { key: "emissions", label: "Emisiones", mono: true, align: "right", render: (value) => (
      <span style={{ color: "var(--eco-primary-600)" }}><strong>{formatNumber(value, 2)}</strong> kgCO2e</span>
    ) },
    { key: "trend", label: "Tendencia", width: 110, render: (value) => {
      const positive = normalizeText(value).startsWith("+");
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: fm,
          fontSize: 11.5,
          fontWeight: 600,
          color: positive ? "var(--eco-danger)" : "var(--eco-success)",
        }}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {value || "0.0%"}
        </span>
      );
    } },
    { key: "_actions", label: "", width: 50, render: (_, row) => (
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); handleRecalculate(row); }}
        disabled={periodLocked || actionLoading}
        title={periodLocked ? "Periodo cerrado" : "Recalcular fila"}
        style={{
          background: "transparent",
          border: "none",
          cursor: periodLocked || actionLoading ? "not-allowed" : "pointer",
          color: periodLocked || actionLoading ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-text-soft)",
          padding: 4,
        }}>
        <RefreshCw size={14} />
      </button>
    ) },
  ];

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={Calculator}
        title="Emisiones y cálculo"
        subtitle="Detalle real de cálculos de emisiones por scope, área y periodo, con recálculo administrativo controlado."
        breadcrumb={["Control", "Emisiones"]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={loadData} style={secondaryButtonStyle}>
              <RefreshCw size={13} /> Actualizar
            </button>
            <button
              type="button"
              onClick={() => handleRecalculate(null)}
              disabled={periodLocked || actionLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: periodLocked || actionLoading ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
                color: "#fff",
                fontFamily: fb,
                fontSize: 13,
                fontWeight: 600,
                cursor: periodLocked || actionLoading ? "not-allowed" : "pointer",
                boxShadow: periodLocked || actionLoading ? "none" : "0 1px 3px rgba(34,197,94,.25)",
              }}
              title={periodLocked ? "Periodo cerrado: recálculo bloqueado" : "Recalcular todas las emisiones del periodo"}
            >
              <RefreshCw size={14} /> {actionLoading ? "Recalculando..." : "Recalcular periodo"}
            </button>
          </div>
        }
      />

      {notice.message ? <Notice type={notice.type} message={notice.message} onClose={() => setNotice(EMPTY_NOTICE)} /> : null}

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        marginBottom: 14,
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
            {currentPeriod.label || "Periodo administrativo"} · {currentPeriod.startDate || "Sin inicio"} → {currentPeriod.endDate || "Sin fin"}
            {periodLocked && " · Recálculo deshabilitado hasta reapertura autorizada."}
          </div>
        </div>
      </div>

      {recalcBanner && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          marginBottom: 12,
          background: "rgba(34,197,94,.10)",
          border: "1px solid rgba(34,197,94,.25)",
          borderRadius: 10,
        }}>
          <RefreshCw size={14} color="var(--eco-primary-600, #16A34A)" />
          <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-primary-700, #15803D)" }}>
            <strong>Recálculo aplicado.</strong> {recalcBanner.trigger} - {recalcBanner.recordsAffected} registro(s).
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
        <div style={{
          padding: "18px 22px",
          background: "linear-gradient(135deg, rgba(34,197,94,.10), rgba(34,197,94,.04))",
          border: "1px solid rgba(34,197,94,.20)",
          borderRadius: 14,
        }}>
          <div style={{ fontFamily: fb, fontSize: 11.5, fontWeight: 600, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Total {data.summary.period}
          </div>
          <div style={{ fontFamily: fd, fontSize: 30, fontWeight: 800, color: "var(--eco-primary-700, #15803D)", lineHeight: 1.1, marginTop: 6 }}>
            {formatNumber(data.summary.total, 2)} <span style={{ fontSize: 14, fontWeight: 600 }}>{data.summary.unit}</span>
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            padding: "3px 10px",
            borderRadius: 12,
            background: "rgba(34,197,94,.15)",
            fontFamily: fm,
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--eco-primary-700, #15803D)",
          }}>
            <TrendingDown size={12} /> {formatNumber(data.summary.vsLastPeriod, 1)}% vs periodo anterior
          </div>
        </div>
        <ScopeCard label="Combustible" value={data.summary.totalScope1} color="#EA580C" />
        <ScopeCard label="Electricidad" value={data.summary.totalScope2} color="#2563EB" />
        <ScopeCard label="No disponible" value={data.summary.totalScope3} color="#7C3AED" />
      </div>

      <div style={formulaCardStyle}>
        <div style={{ fontFamily: fd, fontSize: 12, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
          Fórmula aplicada
        </div>
        <div style={formulaBoxStyle}>
          Emisiones (kgCO2e) = Consumo x Factor de emisión
        </div>
        <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 8 }}>
          El factor se selecciona en backend según scope, categoría, métrica, unidad y vigencia de la fecha del registro.
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por área, fuente, categoría o actividad..."
          filters={[
            { key: "category", label: "Clasificador", options: [
              { value: "combustible", label: "Combustible" },
              { value: "electricidad", label: "Electricidad" },
            ] },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
          onClear={() => { setSearch(""); setFilters({ category: "all" }); }}
        />
      </div>

      <AdminDataTable columns={columns} data={filtered} sortable onRowClick={setSelected} />

      <div style={{ marginTop: 22 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          fontFamily: fd,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--eco-text)",
        }}>
          <History size={15} color="var(--eco-text-soft)" /> Historial de recálculos
        </div>
        <div style={historyListStyle}>
          {data.history.length < 1 ? (
            <div style={{ padding: "18px", fontFamily: fb, fontSize: 12.5, color: "var(--eco-text-soft)" }}>
              No hay recálculos administrativos registrados para esta organización.
            </div>
          ) : data.history.map((item, index) => (
            <div key={item.id || index} style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderBottom: index < data.history.length - 1 ? "1px solid var(--eco-border)" : "none",
            }}>
              <div style={historyIconStyle}>
                <RefreshCw size={16} color="var(--eco-info, #2563EB)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text)" }}>
                  {item.trigger}
                </div>
                <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 3 }}>
                  {formatDateTime(item.ts)} · {item.by} · {item.recordsAffected} registros afectados
                </div>
              </div>
              {Number(item.deltaEmissions) !== 0 && (
                <span style={{
                  fontFamily: fm,
                  fontSize: 12,
                  fontWeight: 700,
                  color: Number(item.deltaEmissions) < 0 ? "var(--eco-success)" : "var(--eco-danger)",
                }}>
                  {Number(item.deltaEmissions) > 0 ? "+" : ""}{formatNumber(item.deltaEmissions, 2)} kgCO2e
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.source} - ${selected.area}` : ""}
        subtitle={selected ? `Scope ${selected.scope} · ${selected.period}` : ""}
        width={520}
        actions={selected && (
          <button
            type="button"
            onClick={() => handleRecalculate(selected)}
            disabled={periodLocked || actionLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: periodLocked || actionLoading ? "var(--eco-gray-300, #CBD5E1)" : "var(--eco-primary-500, #22C55E)",
              color: "#fff",
              fontFamily: fb,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: periodLocked || actionLoading ? "not-allowed" : "pointer",
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
              <DrawerField label="Campus" mono>{selected.campusCode || "Sin campus"}</DrawerField>
              <DrawerField label="Fecha" mono>{formatDate(selected.dateISO)}</DrawerField>
              <DrawerField label="Consumo" mono>{formatNumber(selected.consumption, 2)} {selected.unit}</DrawerField>
              <DrawerField label="Factor" mono>{formatNumber(selected.factor, 6)} kgCO2e / {selected.unit}</DrawerField>
              <DrawerField label="Emisiones" mono>{formatNumber(selected.emissions, 2)} kgCO2e</DrawerField>
              <DrawerField label="Tendencia" mono>{selected.trend}</DrawerField>
            </div>

            <div>
              <div style={drawerSectionTitleStyle}>Fórmula aplicada</div>
              <div style={formulaBoxStyle}>
                {formatNumber(selected.consumption, 2)} {selected.unit} x {formatNumber(selected.factor, 6)} ={" "}
                <span style={{ color: "var(--eco-primary-600)" }}>{formatNumber(selected.emissions, 2)} kgCO2e</span>
              </div>
            </div>

            <div>
              <div style={drawerSectionTitleStyle}>Estado del periodo</div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
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

function ScopeCard({ label, value, color }) {
  return (
    <div style={{
      padding: "16px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{
        display: "inline-block",
        fontFamily: fm,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 12,
        background: `${color}18`,
        color,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text)", marginTop: 8, lineHeight: 1 }}>
        {formatNumber(value, 2)}
      </div>
      <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 4 }}>
        kgCO2e
      </div>
    </div>
  );
}

function Notice({ type, message, onClose }) {
  const isError = type === "error";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      marginBottom: 14,
      borderRadius: 10,
      border: `1px solid ${isError ? "rgba(220,38,38,.25)" : "rgba(37,99,235,.25)"}`,
      background: isError ? "rgba(220,38,38,.08)" : "rgba(37,99,235,.08)",
      color: isError ? "var(--eco-danger)" : "var(--eco-info)",
      fontFamily: fb,
      fontSize: 12.5,
    }}>
      <AlertTriangle size={15} />
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" onClick={onClose} style={noticeCloseStyle}>Cerrar</button>
    </div>
  );
}

const secondaryButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const noticeCloseStyle = {
  border: "none",
  background: "transparent",
  color: "inherit",
  fontFamily: fb,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const formulaCardStyle = {
  padding: "16px 22px",
  marginBottom: 16,
  background: "var(--eco-card, #fff)",
  border: "1px solid var(--eco-border, #E2E8F0)",
  borderRadius: 12,
};

const formulaBoxStyle = {
  fontFamily: fm,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--eco-text)",
  padding: "12px 16px",
  background: "var(--eco-card-muted)",
  borderRadius: 8,
};

const historyListStyle = {
  background: "var(--eco-card, #fff)",
  border: "1px solid var(--eco-border, #E2E8F0)",
  borderRadius: 12,
  overflow: "hidden",
};

const historyIconStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(37,99,235,.10)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const drawerSectionTitleStyle = {
  fontFamily: fd,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--eco-text-soft)",
  marginBottom: 8,
};
