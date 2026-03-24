import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Beaker,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileX,
  Filter,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Upload,
  X,
  Zap,
  Flame,
  Globe,
  Activity,
  Star,
  Hash,
} from "lucide-react";
import { exportRowsToCsv } from "../lib/csvExport";
import { add as addNotification } from "../lib/notificationsStore";
import {
  deactivate,
  duplicateAsNewVersion,
  filterFactors,
  findDefaultConflict,
  getAll,
  getUsageCount,
  setDefault,
  upsert,
} from "../lib/factorsStore";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const PAGE_ANIMATIONS = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctPulse{0%,100%{opacity:1}50%{opacity:.6}}
@media(max-width:900px){.ct-factors-grid{grid-template-columns:1fr!important}.ct-factors-actions{width:100%;justify-content:stretch}.ct-factors-actions button{flex:1}}
@media(max-width:760px){.ct-factor-header{flex-direction:column;align-items:flex-start!important}.ct-factor-toolbar{width:100%}.ct-factor-toolbar button{flex:1}.ct-factor-modal-grid{grid-template-columns:1fr!important}}
@media(max-width:1120px){.ct-factors-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:640px){.ct-factors-kpis{grid-template-columns:1fr!important}}
`;

const scopeOptions = [
  { value: "all", label: "Todos" },
  { value: "scope1", label: "Scope 1" },
  { value: "scope2", label: "Scope 2" },
  { value: "scope3", label: "Scope 3" },
];

const categoryOptions = [
  { value: "all", label: "Todas" },
  { value: "electricidad", label: "Electricidad" },
  { value: "combustible", label: "Combustible" },
  { value: "otros", label: "Otros" },
];

const regionOptions = ["MX-SEN", "MX", "Tamaulipas", "Custom"];

const emptyForm = (factor) => ({
  id: factor?.id || "",
  scope: factor?.scope || "scope2",
  category: factor?.category || "electricidad",
  denominatorUnit: factor?.denominatorUnit || "kWh",
  value: factor?.value ?? "",
  region: regionOptions.includes(factor?.region) ? factor.region : "Custom",
  customRegion: regionOptions.includes(factor?.region) ? "" : factor?.region || "",
  provider: factor?.provider || "",
  sourceUrl: factor?.sourceUrl || "",
  validFrom: factor?.validFrom || new Date().toISOString().slice(0, 10),
  validTo: factor?.validTo || "",
  isDefault: Boolean(factor?.isDefault),
  isActive: typeof factor?.isActive === "boolean" ? factor.isActive : true,
  uncertaintyPct: factor?.uncertaintyPct ?? "",
  notes: factor?.notes || "",
  editMode: factor ? "newVersion" : "edit",
  confirmDirectEdit: false,
});

const numberFormat = (value, decimals = 3) =>
  Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatDate = (iso) => {
  if (!iso) return "Vigente";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const resolveDenominator = (category, currentValue) => {
  if (category === "electricidad") return "kWh";
  if (category === "combustible") return "L";
  return currentValue || "kWh";
};

/* ─── Base styles (dark-mode aware) ─── */
const cardBase = {
  background: "var(--eco-card)",
  borderRadius: "var(--eco-radius-lg)",
  border: "1px solid var(--eco-border)",
  boxShadow: "var(--eco-shadow-sm)",
};

const inputStyle = {
  width: "100%",
  height: 42,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 14px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg, var(--eco-surface))",
  transition: "border-color .2s ease, box-shadow .2s ease",
};

const primaryButtonStyle = {
  height: 38,
  padding: "0 16px",
  borderRadius: "var(--eco-radius-md)",
  border: "none",
  background: "var(--eco-primary-500)",
  color: "white",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  boxShadow: "var(--eco-shadow-sm)",
  transition: "all 180ms ease",
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "all 180ms ease",
};

const iconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: "var(--eco-radius-sm)",
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-gray-500)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 140ms",
};

const radioCardStyle = (active) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 12,
  borderRadius: "var(--eco-radius-md)",
  border: `1.5px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
  background: active ? "var(--eco-primary-50)" : "var(--eco-surface)",
  cursor: "pointer",
  transition: "all 180ms ease",
});

/* ─── Pill-style filter select (matches EmissionsPage) ─── */
function FilterSelect({ value, onChange, options, icon, placeholder }) {
  const isActive = value && value !== "all";
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: isActive ? "var(--eco-primary-500)" : "var(--eco-gray-400)",
            display: "flex",
            pointerEvents: "none",
            zIndex: 1,
            transition: "color 150ms",
          }}
        >
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 32,
          padding: `0 28px 0 ${icon ? 30 : 10}px`,
          borderRadius: "var(--eco-radius-full)",
          border: `1px solid ${isActive ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
          background: isActive ? "var(--eco-primary-50)" : "var(--eco-card)",
          fontFamily: fb,
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
          appearance: "none",
          cursor: "pointer",
          outline: "none",
          transition: "all 150ms",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--eco-gray-400)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ─── Toggle pill for boolean filters ─── */
function TogglePill({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: "var(--eco-radius-full)",
        border: `1px solid ${active ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
        background: active ? "var(--eco-primary-50)" : "var(--eco-card)",
        color: active ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
        fontFamily: fb,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        transition: "all 150ms",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Badge ─── */
function Badge({ tone = "neutral", children }) {
  const theme = {
    success: {
      color: "var(--eco-success)",
      background: "var(--eco-success-bg)",
      border: "#BBF7D0",
    },
    warning: {
      color: "var(--eco-secondary-600)",
      background: "var(--eco-warning-bg)",
      border: "#FDE68A",
    },
    info: {
      color: "var(--eco-info)",
      background: "var(--eco-info-bg)",
      border: "#BFDBFE",
    },
    primary: {
      color: "var(--eco-primary-700)",
      background: "var(--eco-primary-50)",
      border: "var(--eco-primary-200)",
    },
    neutral: {
      color: "var(--eco-gray-600)",
      background: "var(--eco-gray-100)",
      border: "var(--eco-border)",
    },
  }[tone] || {
    color: "var(--eco-gray-600)",
    background: "var(--eco-gray-100)",
    border: "var(--eco-border)",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: "var(--eco-radius-full)",
        fontFamily: fb,
        fontSize: 11,
        fontWeight: 700,
        background: theme.background,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ─── Field ─── */
function Field({ label, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{label}</span>
      {children}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
    </label>
  );
}

/* ─── Icon Action Button ─── */
function IconActionButton({ label, onClick, icon, tone }) {
  const toneColors = {
    danger: { hover: "var(--eco-danger-bg, #FEE2E2)", color: "var(--eco-danger)", border: "#FECACA" },
    success: { hover: "var(--eco-success-bg)", color: "var(--eco-success)", border: "#BBF7D0" },
  };
  const t = toneColors[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: "var(--eco-radius-sm)",
        border: "1px solid var(--eco-border)",
        background: "var(--eco-card)",
        color: "var(--eco-gray-500)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 140ms",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = t ? t.border : "var(--eco-primary-300)";
        event.currentTarget.style.color = t ? t.color : "var(--eco-primary-600)";
        event.currentTarget.style.background = t ? t.hover : "var(--eco-primary-50)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "var(--eco-border)";
        event.currentTarget.style.color = "var(--eco-gray-500)";
        event.currentTarget.style.background = "var(--eco-card)";
      }}
    >
      {icon}
    </button>
  );
}

/* ─── Toast ─── */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 130,
        minWidth: 260,
        maxWidth: 360,
        background: "var(--eco-card)",
        border: "1px solid var(--eco-border)",
        borderRadius: "var(--eco-radius-lg)",
        boxShadow: "var(--eco-shadow-xl)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        animation: "ctSlideR .25s cubic-bezier(.33,1,.68,1)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--eco-radius-sm)",
          background: "var(--eco-success-bg)",
          color: "var(--eco-success)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <CheckCircle2 size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>
          {toast.title}
        </p>
        <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>
          {toast.message}
        </p>
      </div>
    </div>
  );
}

/* ─── Confirm Modal ─── */
function ConfirmModal({ modal, onCancel, onConfirm }) {
  if (!modal) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(2px)", animation: "ctOverlay .18s ease-out" }}
        onClick={onCancel}
      />
      <div
        style={{
          position: "relative",
          width: "min(92vw, 480px)",
          background: "var(--eco-card)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          border: "1px solid var(--eco-border)",
          padding: 22,
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--eco-radius-md)",
              background: "var(--eco-warning-bg)",
              color: "var(--eco-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>
              {modal.title}
            </h3>
            <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))", lineHeight: 1.55 }}>
              {modal.message}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>Cancelar</button>
          <button type="button" onClick={onConfirm} style={primaryButtonStyle}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Drawer ─── */
function Drawer({ factor, onClose }) {
  if (!factor) return null;
  const sampleAmount = factor.category === "electricidad" ? 100 : 10;
  const sampleResult = sampleAmount * Number(factor.value || 0);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.34)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "min(94vw, 560px)",
          height: "100%",
          background: "var(--eco-card)",
          boxShadow: "var(--eco-shadow-xl)",
          borderLeft: "1px solid var(--eco-border)",
          display: "flex",
          flexDirection: "column",
          animation: "ctSlideR .25s cubic-bezier(.33,1,.68,1)",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>
              Catálogos / Factores / Detalle
            </p>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>
              Factor de emisión
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Formula card */}
          <div
            style={{
              background: "linear-gradient(135deg,var(--eco-primary-50),var(--eco-surface))",
              border: "1.5px solid var(--eco-primary-200)",
              borderRadius: "var(--eco-radius-xl)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-primary-500)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={12} />
              </div>
              <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>
                Fórmula de cálculo
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>CO₂e</span>
              <span style={{ color: "var(--eco-gray-400)", fontFamily: fm }}> = </span>
              <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>AD</span>
              <span style={{ color: "var(--eco-gray-400)", fontFamily: fm }}> × </span>
              <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-primary-700)" }}>EF</span>
            </div>
            <p style={{ margin: "12px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.55 }}>
              {factor.category === "electricidad"
                ? `Ejemplo: ${sampleAmount} kWh × ${numberFormat(factor.value, 3)} kgCO₂e/kWh = ${numberFormat(sampleResult, 3)} kgCO₂e`
                : `Ejemplo: ${sampleAmount} L × ${numberFormat(factor.value, 3)} kgCO₂e/L = ${numberFormat(sampleResult, 3)} kgCO₂e`}
            </p>
          </div>

          {/* Details list */}
          <div style={{ background: "var(--eco-surface)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden", border: "1px solid var(--eco-border)" }}>
            {[
              ["Scope", factor.scope.replace("scope", "Scope ")],
              ["Categoría", factor.category],
              ["Valor", `${numberFormat(factor.value, 3)} ${factor.numeratorUnit}/${factor.denominatorUnit}`],
              ["Región", factor.region],
              ["Proveedor", factor.provider || "Sin proveedor"],
              ["Fuente", factor.sourceUrl || "Sin URL"],
              ["Vigencia", `${formatDate(factor.validFrom)} → ${factor.validTo ? formatDate(factor.validTo) : "Vigente"}`],
              ["Predeterminado", factor.isDefault ? "Sí" : "No"],
              ["Estado", factor.isActive ? "Activo" : "Inactivo"],
              ["Incertidumbre", factor.uncertaintyPct === null ? "Sin dato" : `${numberFormat(factor.uncertaintyPct, 1)}%`],
              ["Notas", factor.notes || "Sin notas"],
            ].map(([label, value], index, all) => (
              <div
                key={label}
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 10,
                  borderBottom: index < all.length - 1 ? "1px solid var(--eco-border)" : "none",
                }}
              >
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{label}</span>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-strong, var(--eco-gray-700))", textAlign: "right", lineHeight: 1.5 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon, iconBg, label, value, sub, delay = 0 }) {
  return (
    <div
      style={{
        ...cardBase,
        padding: "18px 20px",
        animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,
        transition: "box-shadow 200ms, transform 200ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(34,197,94,.10)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: iconBg,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{label}</p>
          <p style={{ margin: "2px 0 0", fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))", letterSpacing: "-0.02em" }}>{value}</p>
        </div>
      </div>
      {sub && (
        <p style={{ margin: "10px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-500))", lineHeight: 1.45 }}>{sub}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Page Skeleton (dark-mode aware)
   ═══════════════════════════════════════════════════════════════ */
function PageSkeleton() {
  const sh = {
    background: "linear-gradient(90deg, var(--eco-border) 25%, var(--eco-surface) 50%, var(--eco-border) 75%)",
    backgroundSize: "200% 100%",
    animation: "ctShimmer 1.4s ease-in-out infinite",
    borderRadius: "var(--eco-radius-md)",
  };
  const card = {
    background: "var(--eco-surface)",
    borderRadius: "var(--eco-radius-lg)",
    border: "1px solid var(--eco-border)",
    boxShadow: "var(--eco-shadow-sm)",
  };
  const sa = (delay) => ({ ...sh, animationDelay: `${delay}ms` });

  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...sa(0), width: 40, height: 40, borderRadius: "var(--eco-radius-md)", flexShrink: 0 }} />
          <div>
            <div style={{ ...sa(30), width: 200, height: 22, marginBottom: 6 }} />
            <div style={{ ...sa(60), width: 340, height: 14 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...sa(80), width: 100, height: 38, borderRadius: "var(--eco-radius-md)" }} />
          <div style={{ ...sa(100), width: 110, height: 38, borderRadius: "var(--eco-radius-md)" }} />
          <div style={{ ...sa(120), width: 120, height: 38, borderRadius: "var(--eco-radius-md)" }} />
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ ...card, padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ ...sa(80), width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...sa(100), width: 160, height: 14, marginBottom: 6 }} />
          <div style={{ ...sa(120), width: "80%", height: 12 }} />
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="ct-factors-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...card, padding: "18px 20px", animation: `ctFadeUp .4s ease-out ${i * 60}ms both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...sa(i * 40), width: 42, height: 42, borderRadius: 12 }} />
              <div>
                <div style={{ ...sa(i * 40 + 20), width: 70, height: 12, marginBottom: 6 }} />
                <div style={{ ...sa(i * 40 + 40), width: 50, height: 22 }} />
              </div>
            </div>
            <div style={{ ...sa(i * 40 + 60), width: "60%", height: 10, marginTop: 12 }} />
          </div>
        ))}
      </div>

      {/* Filter bar with green border */}
      <div
        style={{
          ...card,
          border: "1.5px solid var(--eco-primary-500)",
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ ...sa(0), width: 15, height: 15, borderRadius: 4 }} />
        {[90, 100, 80, 70, 80].map((w, i) => (
          <div key={i} style={{ ...sa(i * 30), width: w, height: 32, borderRadius: "var(--eco-radius-full)" }} />
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ ...sa(180), width: 180, height: 32, borderRadius: "var(--eco-radius-full)" }} />
      </div>

      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ ...sa(0), width: 28, height: 28, borderRadius: "var(--eco-radius-sm)" }} />
        <div style={{ ...sa(20), width: 160, height: 17 }} />
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ ...sh, width: "100%", height: 42, borderRadius: 0, animationDelay: "0ms" }} />
        {/* Data rows */}
        {[0, 1, 2, 3, 4].map((r) => (
          <div
            key={r}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 16px",
              borderBottom: r < 4 ? "1px solid var(--eco-border)" : "none",
            }}
          >
            <div style={{ ...sa(r * 20), width: 60, height: 14 }} />
            <div style={{ ...sa(r * 20 + 10), width: 70, height: 14 }} />
            <div style={{ ...sa(r * 20 + 20), width: 100, height: 14 }} />
            <div style={{ ...sa(r * 20 + 30), width: 60, height: 14 }} />
            <div style={{ ...sa(r * 20 + 40), width: 80, height: 14, flex: 1 }} />
            <div style={{ ...sa(r * 20 + 50), width: 70, height: 22, borderRadius: "var(--eco-radius-full)" }} />
            <div style={{ ...sa(r * 20 + 60), width: 50, height: 22, borderRadius: "var(--eco-radius-full)" }} />
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((b) => (
                <div key={b} style={{ ...sa(r * 20 + 70 + b * 10), width: 30, height: 30, borderRadius: "var(--eco-radius-sm)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Factor Modal ─── */
function FactorModal({ state, onClose, onSubmit }) {
  if (!state) return null;
  const { factor, form, errors, saving, usageCount } = state;
  const isEdit = Boolean(factor);
  const title = isEdit ? "Editar factor" : "Nuevo factor de emisión";
  const helper =
    isEdit && form.editMode === "newVersion"
      ? "Crear nueva versión es la opción recomendada para mantener trazabilidad."
      : isEdit
        ? "Modifica los valores del factor existente."
        : "Completa los datos base del factor de emisión.";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "min(96vw, 860px)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--eco-card)",
          border: "1px solid var(--eco-border)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          animation: "ctPop .22s ease-out",
        }}
      >
        {/* Modal header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {isEdit ? <Pencil size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>{title}</h3>
              <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{helper}</p>
              {errors.editMode ? <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{errors.editMode}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Edit mode selector */}
          {isEdit && (
            <div style={{ background: "var(--eco-surface)", borderRadius: "var(--eco-radius-lg)", padding: 14, border: "1px solid var(--eco-border)" }}>
              <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>
                Modo de edición
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={radioCardStyle(form.editMode === "edit")}>
                  <input type="radio" name="editMode" value="edit" checked={form.editMode === "edit"} onChange={() => state.setForm((prev) => ({ ...prev, editMode: "edit" }))} />
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Editar este registro</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))", marginTop: 2 }}>
                      Úsalo si todavía no se ha usado o si confirmas cambiarlo directamente.
                    </div>
                  </div>
                </label>
                <label style={radioCardStyle(form.editMode === "newVersion")}>
                  <input type="radio" name="editMode" value="newVersion" checked={form.editMode === "newVersion"} onChange={() => state.setForm((prev) => ({ ...prev, editMode: "newVersion" }))} />
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Crear nueva versión</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))", marginTop: 2 }}>
                      Recomendado para conservar históricos de cálculos y reportes.
                    </div>
                  </div>
                </label>
              </div>
              {usageCount > 0 && form.editMode === "edit" && (
                <label style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 10, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))" }}>
                  <input
                    type="checkbox"
                    checked={form.confirmDirectEdit}
                    onChange={(event) => state.setForm((prev) => ({ ...prev, confirmDirectEdit: event.target.checked }))}
                    style={{ marginTop: 2 }}
                  />
                  Confirmo editar un factor ya usado en {usageCount} registro(s).
                </label>
              )}
            </div>
          )}

          {/* Form grid */}
          <div className="ct-factor-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
            <Field label="Scope" error={errors.scope}>
              <select value={form.scope} onChange={(event) => state.setForm((prev) => ({ ...prev, scope: event.target.value }))} style={inputStyle}>
                {scopeOptions.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Categoría" error={errors.category}>
              <select
                value={form.category}
                onChange={(event) =>
                  state.setForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                    denominatorUnit: resolveDenominator(event.target.value, prev.denominatorUnit),
                  }))
                }
                style={inputStyle}
              >
                {categoryOptions.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidad del denominador" error={errors.denominatorUnit}>
              <input value={form.denominatorUnit} readOnly style={{ ...inputStyle, background: "var(--eco-surface)", opacity: 0.7 }} />
            </Field>
            <Field label="Valor EF" error={errors.value}>
              <input type="number" min="0" step="0.0001" value={form.value} onChange={(event) => state.setForm((prev) => ({ ...prev, value: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Región" error={errors.region}>
              <select value={form.region} onChange={(event) => state.setForm((prev) => ({ ...prev, region: event.target.value }))} style={inputStyle}>
                {regionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor" error={errors.provider}>
              <input value={form.provider} onChange={(event) => state.setForm((prev) => ({ ...prev, provider: event.target.value }))} style={inputStyle} placeholder="Ej. SENER, CFE..." />
            </Field>
            {form.region === "Custom" && (
              <Field label="Región personalizada" error={errors.customRegion}>
                <input value={form.customRegion} onChange={(event) => state.setForm((prev) => ({ ...prev, customRegion: event.target.value }))} style={inputStyle} />
              </Field>
            )}
            <Field label="Fuente (URL opcional)" error={errors.sourceUrl}>
              <input value={form.sourceUrl} onChange={(event) => state.setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))} style={inputStyle} placeholder="https://..." />
            </Field>
            <Field label="Vigencia desde" error={errors.validFrom}>
              <input type="date" value={form.validFrom} onChange={(event) => state.setForm((prev) => ({ ...prev, validFrom: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Vigencia hasta" error={errors.validTo}>
              <input type="date" value={form.validTo} onChange={(event) => state.setForm((prev) => ({ ...prev, validTo: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Incertidumbre %" error={errors.uncertaintyPct}>
              <input type="number" min="0" step="0.1" value={form.uncertaintyPct} onChange={(event) => state.setForm((prev) => ({ ...prev, uncertaintyPct: event.target.value }))} style={inputStyle} placeholder="Ej. 5.0" />
            </Field>
            <Field label="Notas" error={errors.notes}>
              <textarea value={form.notes} onChange={(event) => state.setForm((prev) => ({ ...prev, notes: event.target.value }))} style={{ ...inputStyle, minHeight: 100, paddingTop: 10, resize: "vertical" }} placeholder="Observaciones adicionales..." />
            </Field>
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: fb, fontSize: 13, color: "var(--eco-text, var(--eco-gray-700))", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isDefault} onChange={(event) => state.setForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
              <Star size={14} style={{ color: form.isDefault ? "var(--eco-primary-500)" : "var(--eco-gray-400)" }} />
              Predeterminado
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: fb, fontSize: 13, color: "var(--eco-text, var(--eco-gray-700))", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => state.setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              <Power size={14} style={{ color: form.isActive ? "var(--eco-success)" : "var(--eco-gray-400)" }} />
              Activo
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                opacity: saving ? 0.7 : 1,
                minWidth: 160,
              }}
            >
              <Save size={14} />
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear factor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function FactorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [factors, setFactors] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [modalState, setModalState] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    scope: "all",
    category: "all",
    onlyActive: true,
    onlyCurrent: true,
  });

  const loadFactors = () => {
    try {
      setLoading(true);
      const next = getAll();
      setFactors(next);
      setError("");
    } catch {
      setError("No se pudieron cargar los factores. Intenta de nuevo.");
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const filtered = useMemo(
    () => filterFactors(factors, { ...filters, today: todayIso() }),
    [factors, filters]
  );

  const hasActiveFilters = useMemo(() => {
    return filters.search || filters.scope !== "all" || filters.category !== "all" || !filters.onlyActive || !filters.onlyCurrent;
  }, [filters]);

  /* KPI data */
  const kpis = useMemo(() => {
    const total = factors.length;
    const active = factors.filter((f) => f.isActive).length;
    const defaults = factors.filter((f) => f.isDefault && f.isActive).length;
    const scopes = new Set(factors.filter((f) => f.isActive).map((f) => f.scope)).size;
    return { total, active, defaults, scopes };
  }, [factors]);

  const openCreate = () => {
    const setForm = (updater) => setModalState((prev) => {
      const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
      return { ...prev, form: nextForm };
    });
    setModalState({ factor: null, form: emptyForm(), errors: {}, saving: false, usageCount: 0, setForm });
  };

  const openEdit = (factor, mode = "newVersion") => {
    const usageCount = getUsageCount(factor.id);
    const setForm = (updater) => setModalState((prev) => {
      const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
      return { ...prev, form: nextForm };
    });
    setModalState({
      factor,
      form: { ...emptyForm(factor), editMode: mode },
      errors: {},
      saving: false,
      usageCount,
      setForm,
    });
  };

  const closeModal = () => setModalState(null);

  const validateForm = (form, usageCount, isEdit) => {
    const errors = {};
    const numericValue = Number(form.value);
    const region = form.region === "Custom" ? form.customRegion.trim() : form.region;

    if (!form.scope) errors.scope = "Selecciona un scope.";
    if (!form.category) errors.category = "Selecciona una categoría.";
    if (!form.denominatorUnit) errors.denominatorUnit = "Falta la unidad.";
    if (!Number.isFinite(numericValue) || numericValue <= 0) errors.value = "El valor debe ser mayor a 0.";
    if (!region) errors.region = "Selecciona una región.";
    if (form.region === "Custom" && !form.customRegion.trim()) errors.customRegion = "Escribe la región personalizada.";
    if (!form.validFrom) errors.validFrom = "La fecha desde es obligatoria.";
    if (form.validTo && form.validTo < form.validFrom) errors.validTo = "La vigencia final no puede ser anterior a la inicial.";
    if (!isValidUrl(form.sourceUrl)) errors.sourceUrl = "La URL debe iniciar con http:// o https://";
    if (form.uncertaintyPct !== "" && (!Number.isFinite(Number(form.uncertaintyPct)) || Number(form.uncertaintyPct) < 0)) {
      errors.uncertaintyPct = "La incertidumbre debe ser un número válido.";
    }
    if (isEdit && form.editMode === "edit" && usageCount > 0 && !form.confirmDirectEdit) {
      errors.editMode = "Confirma que quieres editar un factor ya usado.";
    }
    return errors;
  };

  const persistModal = (forceDefaultOverride = false) => {
    if (!modalState) return;
    const { factor, form, usageCount } = modalState;
    const errors = validateForm(form, usageCount, Boolean(factor));
    if (Object.keys(errors).length > 0) {
      setModalState((prev) => ({ ...prev, errors }));
      return;
    }

    const payload = {
      id: form.id || undefined,
      scope: form.scope,
      category: form.category,
      metric: form.category === "electricidad" ? "electricity_consumption" : form.category === "combustible" ? "fuel_volume" : "custom",
      numeratorUnit: "kgCO2e",
      denominatorUnit: resolveDenominator(form.category, form.denominatorUnit),
      value: Number(form.value),
      region: form.region === "Custom" ? form.customRegion.trim() : form.region,
      provider: form.provider.trim(),
      sourceUrl: form.sourceUrl.trim(),
      validFrom: form.validFrom,
      validTo: form.validTo || null,
      isDefault: form.isDefault,
      isActive: form.isActive,
      uncertaintyPct: form.uncertaintyPct === "" ? null : Number(form.uncertaintyPct),
      notes: form.notes.trim(),
    };

    const conflict = findDefaultConflict(
      factors,
      { ...payload, isDefault: payload.isDefault, isActive: payload.isActive },
      factor?.id
    );
    if (payload.isDefault && conflict && !forceDefaultOverride) {
      setConfirmModal({
        title: "Actualizar factor predeterminado",
        message: `Ya existe un predeterminado activo para ${conflict.scope.replace("scope", "Scope ")} / ${conflict.category} / ${conflict.region}. Si continúas, ese factor dejará de ser predeterminado.`,
        onConfirm: () => {
          setConfirmModal(null);
          persistModal(true);
        },
      });
      return;
    }

    setModalState((prev) => ({ ...prev, saving: true, errors: {} }));

    try {
      const result = factor && form.editMode === "newVersion"
        ? duplicateAsNewVersion(factor.id, payload, { forceDefaultOverride })
        : upsert({ ...factor, ...payload }, { forceDefaultOverride });

      if (!result.ok) {
        throw new Error("save_failed");
      }

      setFactors(result.factors);
      closeModal();
      addNotification({
        type: "factor_updated",
        title: factor ? (form.editMode === "newVersion" ? "Nueva versión de factor" : "Factor actualizado") : "Factor guardado",
        message: `${payload.scope.replace("scope", "Scope ")} / ${payload.category} / ${payload.region}`,
        link: "/catalogos/factores",
        meta: {
          factorId: result.factor?.id || factor?.id || null,
          scope: payload.scope,
          category: payload.category,
          region: payload.region,
          isDefault: payload.isDefault,
        },
      });
      setToast({
        title: factor ? (form.editMode === "newVersion" ? "Nueva versión creada" : "Factor actualizado") : "Factor guardado",
        message: `${payload.scope.replace("scope", "Scope ")} / ${payload.category} / ${payload.region}`,
      });
    } catch {
      setModalState((prev) => ({ ...prev, saving: false }));
      setError("No se pudieron cargar los factores. Intenta de nuevo.");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    persistModal(false);
  };

  const handleDefault = (factor) => {
    const result = setDefault(factor.id);
    if (!result.ok && result.reason === "default_conflict") {
      setConfirmModal({
        title: "Cambiar factor predeterminado",
        message: `Se reemplazará el predeterminado activo de ${result.conflict.scope.replace("scope", "Scope ")} / ${result.conflict.category} / ${result.conflict.region}.`,
        onConfirm: () => {
          const forced = setDefault(factor.id, { force: true });
          if (forced.ok) {
            setFactors(forced.factors);
            addNotification({
              type: "factor_updated",
              title: "Factor predeterminado actualizado",
              message: `${factor.scope.replace("scope", "Scope ")} / ${factor.category} ahora usa un nuevo predeterminado.`,
              link: "/catalogos/factores",
              meta: { factorId: factor.id, isDefault: true },
            });
            setToast({ title: "Factor predeterminado actualizado", message: "La combinación ya tiene un nuevo predeterminado." });
          }
          setConfirmModal(null);
        },
      });
      return;
    }
    if (result.ok) {
      setFactors(result.factors);
      addNotification({
        type: "factor_updated",
        title: "Factor predeterminado actualizado",
        message: `${factor.scope.replace("scope", "Scope ")} / ${factor.category} ahora usa un nuevo predeterminado.`,
        link: "/catalogos/factores",
        meta: { factorId: factor.id, isDefault: true },
      });
      setToast({ title: "Factor predeterminado actualizado", message: "La combinación ya tiene un nuevo predeterminado." });
    }
  };

  const toggleActive = (factor) => {
    const next = deactivate(factor.id, !factor.isActive);
    setFactors(next);
    setToast({ title: "Factor actualizado", message: factor.isActive ? "Factor desactivado." : "Factor activado." });
  };

  const exportCsv = () => {
    exportRowsToCsv({
      filename: `factors-${todayIso()}.csv`,
      rows: filtered,
      columns: [
        { label: "Scope", get: (row) => row.scope },
        { label: "Categoria", get: (row) => row.category },
        { label: "Valor", get: (row) => row.value },
        { label: "Unidad", get: (row) => `${row.numeratorUnit}/${row.denominatorUnit}` },
        { label: "Region", get: (row) => row.region },
        { label: "Proveedor", get: (row) => row.provider },
        { label: "ValidFrom", get: (row) => row.validFrom },
        { label: "ValidTo", get: (row) => row.validTo || "" },
        { label: "Default", get: (row) => (row.isDefault ? "Si" : "No") },
        { label: "Activo", get: (row) => (row.isActive ? "Si" : "No") },
        { label: "Fuente", get: (row) => row.sourceUrl },
        { label: "Notas", get: (row) => row.notes },
      ],
    });
    addNotification({
      type: "export_done",
      title: "CSV exportado",
      message: `Se exportaron ${filtered.length} factor(es) del catálogo.`,
      link: "/catalogos/factores",
      meta: { count: filtered.length, resource: "factors" },
    });
    setToast({ title: "CSV exportado", message: `Se exportaron ${filtered.length} factor(es).` });
  };

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <>
        <style>{PAGE_ANIMATIONS}</style>
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <style>{PAGE_ANIMATIONS}</style>
      <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>

        {/* ═══ HEADER ═══ */}
        <div
          className="ct-factor-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--eco-radius-md)",
                  background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 20px rgba(34,197,94,.18)",
                }}
              >
                <Beaker size={19} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontFamily: fd, fontSize: 26, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))", letterSpacing: "-0.02em" }}>
                  Factores de emisión
                </h1>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>
                  Administra los factores (EF) para convertir consumo en CO₂e.
                </p>
              </div>
            </div>
          </div>
          <div
            className="ct-factor-toolbar ct-factors-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 80ms both",
            }}
          >
            <button
              type="button"
              onClick={() => setToast({ title: "Importación próximamente", message: "La estructura está lista para conectar backend más adelante." })}
              style={secondaryButtonStyle}
            >
              <Upload size={14} />
              Importar
            </button>
            <button type="button" onClick={exportCsv} style={secondaryButtonStyle}>
              <Download size={14} />
              Exportar
            </button>
            <button
              type="button"
              onClick={openCreate}
              style={primaryButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(34,197,94,.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
              }}
            >
              <Plus size={14} />
              Nuevo factor
            </button>
          </div>
        </div>

        {/* ═══ DEMO WARNING ═══ */}
        <div
          style={{
            marginBottom: 18,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 100ms both",
            background: "linear-gradient(135deg,var(--eco-warning-bg),var(--eco-surface))",
            border: "1px solid #FDE68A",
            borderRadius: "var(--eco-radius-lg)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <AlertTriangle size={16} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Valores de ejemplo</p>
            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.5 }}>
              Se cargan factores demo para que la pantalla se vea funcionando. Edítalos con una fuente oficial antes de usarlos en producción.
            </p>
          </div>
        </div>

        {/* ═══ ERROR BANNER ═══ */}
        {error && (
          <div
            style={{
              marginBottom: 18,
              animation: "ctFadeUp .3s ease-out",
              background: "var(--eco-danger-bg)",
              border: "1px solid #FECACA",
              borderRadius: "var(--eco-radius-lg)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} style={{ color: "var(--eco-danger)" }} />
              <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-text, var(--eco-gray-700))" }}>{error}</span>
            </div>
            <button type="button" onClick={loadFactors} style={secondaryButtonStyle}>Reintentar</button>
          </div>
        )}

        {/* ═══ KPI CARDS ═══ */}
        <div
          className="ct-factors-kpis"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 120ms both",
          }}
        >
          <KpiCard
            icon={<Hash size={18} />}
            iconBg="linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))"
            label="Total factores"
            value={kpis.total}
            sub={`${filtered.length} visible${filtered.length !== 1 ? "s" : ""} con filtros actuales`}
            delay={120}
          />
          <KpiCard
            icon={<CheckCircle2 size={18} />}
            iconBg="linear-gradient(135deg,#22C55E,#16A34A)"
            label="Activos"
            value={kpis.active}
            sub={`${kpis.total - kpis.active} inactivo${kpis.total - kpis.active !== 1 ? "s" : ""}`}
            delay={160}
          />
          <KpiCard
            icon={<Star size={18} />}
            iconBg="linear-gradient(135deg,#EAB308,#CA8A04)"
            label="Predeterminados"
            value={kpis.defaults}
            sub="Factores marcados como default activos"
            delay={200}
          />
          <KpiCard
            icon={<Shield size={18} />}
            iconBg="linear-gradient(135deg,#3B82F6,#2563EB)"
            label="Scopes cubiertos"
            value={kpis.scopes}
            sub="Scopes con al menos un factor activo"
            delay={240}
          />
        </div>

        {/* ═══ FILTER BAR (horizontal pill style, green border) ═══ */}
        <div
          style={{
            ...cardBase,
            border: "1.5px solid var(--eco-primary-500)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 260ms both",
          }}
        >
          <Filter size={15} style={{ color: "var(--eco-gray-400)", flexShrink: 0 }} />

          <FilterSelect
            value={filters.scope}
            onChange={(v) => setFilters((prev) => ({ ...prev, scope: v }))}
            options={scopeOptions}
            icon={<Shield size={13} />}
            placeholder="Scope"
          />

          <FilterSelect
            value={filters.category}
            onChange={(v) => setFilters((prev) => ({ ...prev, category: v }))}
            options={categoryOptions}
            icon={<Zap size={13} />}
            placeholder="Categoría"
          />

          <TogglePill
            label="Solo activos"
            icon={<CheckCircle2 size={12} />}
            active={filters.onlyActive}
            onClick={() => setFilters((prev) => ({ ...prev, onlyActive: !prev.onlyActive }))}
          />

          <TogglePill
            label="Vigentes hoy"
            icon={<Calendar size={12} />}
            active={filters.onlyCurrent}
            onClick={() => setFilters((prev) => ({ ...prev, onlyCurrent: !prev.onlyCurrent }))}
          />

          <div style={{ flex: 1 }} />

          {/* Search input */}
          <div style={{ position: "relative", display: "inline-flex" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--eco-gray-400)",
                pointerEvents: "none",
              }}
            />
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar factor..."
              style={{
                height: 32,
                width: 190,
                padding: "0 10px 0 30px",
                borderRadius: "var(--eco-radius-full)",
                border: `1px solid ${filters.search ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                background: filters.search ? "var(--eco-primary-50)" : "var(--eco-card)",
                fontFamily: fb,
                fontSize: 12,
                color: "var(--eco-text, var(--eco-gray-700))",
                outline: "none",
                transition: "all 150ms",
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ search: "", scope: "all", category: "all", onlyActive: true, onlyCurrent: true })}
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: "var(--eco-radius-full)",
                border: "1px solid var(--eco-border)",
                background: "var(--eco-card)",
                color: "var(--eco-gray-500)",
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "all 150ms",
              }}
            >
              <RotateCcw size={11} />
              Limpiar
            </button>
          )}
        </div>

        {/* ═══ TABLE SECTION ═══ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 280ms both",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--eco-radius-sm)",
              background: "var(--eco-primary-50)",
              color: "var(--eco-primary-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={14} />
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: fd,
              fontSize: 17,
              fontWeight: 700,
              color: "var(--eco-text-strong, var(--eco-gray-800))",
              letterSpacing: "-0.01em",
            }}
          >
            Listado de factores
          </h2>
          <span
            style={{
              marginLeft: 4,
              minWidth: 22,
              height: 22,
              borderRadius: "var(--eco-radius-full)",
              background: "var(--eco-primary-50)",
              color: "var(--eco-primary-700)",
              fontFamily: fm,
              fontSize: 11,
              fontWeight: 700,
              display: "inline-grid",
              placeItems: "center",
              padding: "0 7px",
            }}
          >
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              ...cardBase,
              padding: "50px 24px",
              textAlign: "center",
              animation: "ctFadeUp .4s ease-out",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                margin: "0 auto 14px",
                display: "grid",
                placeItems: "center",
                background: "var(--eco-gray-100)",
                color: "var(--eco-gray-400)",
              }}
            >
              <FileX size={28} />
            </div>
            <p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-700))" }}>Sin coincidencias</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))", maxWidth: 340, marginInline: "auto", lineHeight: 1.55 }}>
              No hay factores con estos filtros. Prueba cambiar el scope o desactivar un filtro.
            </p>
          </div>
        ) : (
          <div
            style={{
              ...cardBase,
              overflow: "hidden",
              animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 300ms both",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--eco-surface)", borderBottom: "1px solid var(--eco-border)" }}>
                    {["Scope", "Categoría", "Valor", "Región", "Vigencia", "Predeterminado", "Estado", "Acciones"].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "11px 12px",
                          textAlign: "left",
                          fontFamily: fb,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--eco-text-soft, var(--eco-gray-500))",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((factor, index) => {
                    const scopeColors = {
                      scope1: { bg: "var(--eco-primary-50)", color: "var(--eco-primary-700)", icon: <Flame size={12} /> },
                      scope2: { bg: "#EFF6FF", color: "#2563EB", icon: <Zap size={12} /> },
                      scope3: { bg: "#F5F3FF", color: "#7C3AED", icon: <Globe size={12} /> },
                    };
                    const sc = scopeColors[factor.scope] || scopeColors.scope2;

                    return (
                      <tr
                        key={factor.id}
                        style={{
                          borderBottom: index < filtered.length - 1 ? "1px solid var(--eco-border)" : "none",
                          background: hoverRow === factor.id ? "var(--eco-surface)" : "transparent",
                          transition: "background 140ms",
                          animation: `ctFadeUp .24s ease-out ${Math.min(index * 28, 240)}ms both`,
                        }}
                        onMouseEnter={() => setHoverRow(factor.id)}
                        onMouseLeave={() => setHoverRow(null)}
                      >
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 9px",
                              borderRadius: "var(--eco-radius-full)",
                              background: sc.bg,
                              color: sc.color,
                              fontFamily: fb,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {sc.icon}
                            {factor.scope.replace("scope", "Scope ")}
                          </span>
                        </td>
                        <td style={{ padding: "12px", color: "var(--eco-text, var(--eco-gray-600))", fontWeight: 500 }}>
                          {factor.category}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>
                            {numberFormat(factor.value, 3)}
                          </div>
                          <div style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-text-soft, var(--eco-gray-400))", marginTop: 2 }}>
                            {factor.numeratorUnit}/{factor.denominatorUnit} · {factor.provider || "Sin proveedor"}
                          </div>
                        </td>
                        <td style={{ padding: "12px", color: "var(--eco-text, var(--eco-gray-600))", fontSize: 12 }}>
                          {factor.region}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))" }}>
                            <Calendar size={12} style={{ color: "var(--eco-gray-400)" }} />
                            <span>{formatDate(factor.validFrom)} → {factor.validTo ? formatDate(factor.validTo) : "Vigente"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {factor.isDefault ? (
                            <Badge tone="success">
                              <Star size={10} /> Default
                            </Badge>
                          ) : (
                            <Badge>—</Badge>
                          )}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {factor.isActive ? (
                            <Badge tone="success">Activo</Badge>
                          ) : (
                            <Badge tone="warning">Inactivo</Badge>
                          )}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <IconActionButton label="Ver detalle" onClick={() => setSelectedFactor(factor)} icon={<Eye size={14} />} />
                            <IconActionButton label="Editar" onClick={() => openEdit(factor, "edit")} icon={<Pencil size={14} />} />
                            <IconActionButton label="Nueva versión" onClick={() => openEdit(factor, "newVersion")} icon={<Copy size={14} />} />
                            {!factor.isDefault && factor.isActive && !factor.validTo ? (
                              <IconActionButton label="Marcar predeterminado" onClick={() => handleDefault(factor)} icon={<CheckCircle2 size={14} />} />
                            ) : null}
                            <IconActionButton
                              label={factor.isActive ? "Desactivar" : "Activar"}
                              onClick={() => toggleActive(factor)}
                              icon={<Power size={14} />}
                              tone={factor.isActive ? "danger" : "success"}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div
              style={{
                borderTop: "1px solid var(--eco-border)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--eco-surface)",
              }}
            >
              <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>
                Mostrando {filtered.length} de {factors.length} factor{factors.length !== 1 ? "es" : ""}
              </span>
              <button
                type="button"
                onClick={exportCsv}
                style={{
                  ...secondaryButtonStyle,
                  height: 30,
                  fontSize: 11,
                  padding: "0 10px",
                }}
              >
                <Download size={12} />
                CSV
              </button>
            </div>
          </div>
        )}
      </div>

      <FactorModal state={modalState} onClose={closeModal} onSubmit={handleSubmit} />
      <Drawer factor={selectedFactor} onClose={() => setSelectedFactor(null)} />
      <ConfirmModal
        modal={confirmModal}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => {
          const action = confirmModal?.onConfirm;
          if (action) action();
        }}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
