import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileX,
  Filter,
  Info,
  Leaf,
  Monitor,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Upload,
  X,
  Zap,
  Activity,
  Clock,
} from "lucide-react";
import EquipmentModal, {
  createEmptyEquipmentForm,
  parseEquipmentFormData,
  validateEquipmentForm,
} from "../components/EquipmentModal";
import { exportRowsToCsv } from "../lib/csvExport";
import { createNotification } from "../api/notifications";
import {
  EQUIPMENT_AREA_OPTIONS,
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  createEquipmentEstimatedEmissionRecord,
  computeCo2eMonth,
  computeHoursMonth,
  computeKwhMonth,
  duplicateEquipment,
  fetchEquipment,
  fetchEquipmentElectricityFactor,
  filterEquipment,
  getAreaLabel,
  getCategoryLabel,
  getTypeLabel,
  persistEquipment,
  updateEquipmentStatus,
} from "../api/equipment";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const PAGE_ANIMATIONS = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@media(max-width:1100px){.ct-equipment-grid{grid-template-columns:1fr!important}.ct-equipment-kpis{grid-template-columns:1fr 1fr!important}}
@media(max-width:760px){.ct-equipment-header{flex-direction:column;align-items:flex-start!important}.ct-equipment-toolbar{width:100%}.ct-equipment-toolbar button{flex:1}.ct-equipment-kpis{grid-template-columns:1fr!important}.ct-equipment-modal-grid{grid-template-columns:1fr!important}}
`;


/* --- Base styles (dark-mode aware) --- */
const cardBase = {
  background: "var(--eco-card)",
  borderRadius: "var(--eco-radius-lg)",
  border: "1px solid var(--eco-border)",
  boxShadow: "var(--eco-shadow-sm)",
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
};

const numberFormat = (value, decimals = 2) =>
  Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const monthFieldValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthToFirstDay = (value) => (value ? `${value}-01` : new Date().toISOString().slice(0, 10));

/* --- Pill-style filter select (matches EmissionsPage) --- */
function FilterSelect({ value, onChange, options, icon }) {
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

/* --- Toggle pill for boolean filters --- */
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

/* --- Badge --- */
function Badge({ tone = "neutral", children }) {
  const theme = {
    success: { color: "var(--eco-success)", background: "var(--eco-success-bg)", border: "#BBF7D0" },
    warning: { color: "var(--eco-secondary-600)", background: "var(--eco-warning-bg)", border: "#FDE68A" },
    info: { color: "var(--eco-info)", background: "var(--eco-info-bg)", border: "#BFDBFE" },
    primary: { color: "var(--eco-primary-700)", background: "var(--eco-primary-50)", border: "var(--eco-primary-200)" },
    neutral: { color: "var(--eco-gray-600)", background: "var(--eco-gray-100)", border: "var(--eco-border)" },
  }[tone] || { color: "var(--eco-gray-600)", background: "var(--eco-gray-100)", border: "var(--eco-border)" };

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

/* --- Field --- */
function Field({ label, error, helper, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{label}</span>
      {children}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
      {!error && helper ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>{helper}</span> : null}
    </label>
  );
}

/* --- Icon Action Button --- */
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
      style={iconButtonStyle}
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

/* --- Toast --- */
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

/* --- Confirm Modal --- */
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
          width: "min(92vw, 500px)",
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

/* --- KPI Card --- */
function KpiCard({ icon, iconBg, title, value, unit, sub, delay = 0 }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
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
        <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{title}</p>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))", letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>{unit}</span>}
      </div>
      {sub ? <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))", lineHeight: 1.45 }}>{sub}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   Page Skeleton (dark-mode aware, comprehensive)
   --------------------------------------------------------------- */
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
          <div style={{ ...sa(0), width: 42, height: 42, borderRadius: "var(--eco-radius-md)", flexShrink: 0 }} />
          <div>
            <div style={{ ...sa(30), width: 140, height: 22, marginBottom: 6 }} />
            <div style={{ ...sa(60), width: 360, height: 14 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...sa(80), width: 100, height: 38, borderRadius: "var(--eco-radius-md)" }} />
          <div style={{ ...sa(100), width: 110, height: 38, borderRadius: "var(--eco-radius-md)" }} />
          <div style={{ ...sa(120), width: 130, height: 38, borderRadius: "var(--eco-radius-md)" }} />
        </div>
      </div>

      {/* Factor info banner */}
      <div style={{ ...card, padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ ...sa(80), width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...sa(100), width: 180, height: 14, marginBottom: 6 }} />
          <div style={{ ...sa(120), width: "75%", height: 12 }} />
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="ct-equipment-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...card, padding: "18px 20px", animation: `ctFadeUp .4s ease-out ${i * 60}ms both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...sa(i * 40), width: 42, height: 42, borderRadius: 12 }} />
              <div>
                <div style={{ ...sa(i * 40 + 20), width: 80, height: 12, marginBottom: 6 }} />
                <div style={{ ...sa(i * 40 + 40), width: 50, height: 10 }} />
              </div>
            </div>
            <div style={{ ...sa(i * 40 + 50), width: 90, height: 24, marginTop: 12 }} />
            <div style={{ ...sa(i * 40 + 60), width: "65%", height: 10, marginTop: 8 }} />
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
        {[90, 80, 100, 80, 70].map((w, i) => (
          <div key={i} style={{ ...sa(i * 30), width: w, height: 32, borderRadius: "var(--eco-radius-full)" }} />
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ ...sa(180), width: 180, height: 32, borderRadius: "var(--eco-radius-full)" }} />
      </div>

      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ ...sa(0), width: 28, height: 28, borderRadius: "var(--eco-radius-sm)" }} />
        <div style={{ ...sa(20), width: 130, height: 17 }} />
        <div style={{ ...sa(40), width: 26, height: 22, borderRadius: "var(--eco-radius-full)" }} />
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ ...sh, width: "100%", height: 42, borderRadius: 0, animationDelay: "0ms" }} />
        {[0, 1, 2, 3, 4].map((r) => (
          <div
            key={r}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderBottom: r < 4 ? "1px solid var(--eco-border)" : "none",
            }}
          >
            <div style={{ ...sa(r * 20), width: 60, height: 14 }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...sa(r * 20 + 10), width: 120, height: 14, marginBottom: 4 }} />
              <div style={{ ...sa(r * 20 + 20), width: 60, height: 18, borderRadius: "var(--eco-radius-full)" }} />
            </div>
            <div style={{ ...sa(r * 20 + 30), width: 55, height: 14 }} />
            <div style={{ ...sa(r * 20 + 35), width: 35, height: 14 }} />
            <div style={{ ...sa(r * 20 + 40), width: 45, height: 14 }} />
            <div style={{ ...sa(r * 20 + 45), width: 100, height: 14 }} />
            <div style={{ ...sa(r * 20 + 50), width: 55, height: 14 }} />
            <div style={{ ...sa(r * 20 + 55), width: 55, height: 14 }} />
            <div style={{ ...sa(r * 20 + 60), width: 50, height: 22, borderRadius: "var(--eco-radius-full)" }} />
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2, 3].map((b) => (
                <div key={b} style={{ ...sa(r * 20 + 65 + b * 8), width: 30, height: 30, borderRadius: "var(--eco-radius-sm)" }} />
              ))}
            </div>
          </div>
        ))}
        {/* Footer */}
        <div style={{ borderTop: "1px solid var(--eco-border)", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ ...sa(0), width: 180, height: 12 }} />
          <div style={{ ...sa(20), width: 70, height: 30, borderRadius: "var(--eco-radius-md)" }} />
        </div>
      </div>
    </div>
  );
}

/* --- Detail Drawer --- */
function DetailDrawer({ state, onClose, onEdit, onGenerate }) {
  if (!state) return null;
  const { equipment, factorValue, factorSourceLabel, usingFallbackFactor, monthValue } = state;
  const hoursMonth = computeHoursMonth(equipment);
  const kwhMonth = computeKwhMonth(equipment);
  const { co2eKg, co2eT } = computeCo2eMonth(equipment, factorValue);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.34)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }} onClick={onClose} />
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
        {/* Drawer header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>Catálogos / Equipos / Detalle</p>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>{equipment.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}><X size={16} /></button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Formula card */}
          <div style={{ background: "linear-gradient(135deg,var(--eco-primary-50),var(--eco-surface))", border: "1.5px solid var(--eco-primary-200)", borderRadius: "var(--eco-radius-xl)", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-primary-500)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={12} />
              </div>
              <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>Fórmula usada</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>kWh/mes = (W × horasMes × cantidad) / 1 000</span>
              <span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>CO₂e = kWh × EF</span>
            </div>
          </div>

          {/* Combustible notice */}
          {equipment.category !== "electricidad" ? (
            <div style={{ background: "var(--eco-warning-bg)", border: "1px solid #FDE68A", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Info size={15} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Cálculo no disponible para esta categoría</p>
                <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.5 }}>
                  Este registro se conserva en inventario, pero el cálculo para combustible se habilitará cuando exista el modelo de litros/hora.
                </p>
              </div>
            </div>
          ) : null}

          {/* Details list */}
          <div style={{ background: "var(--eco-surface)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden", border: "1px solid var(--eco-border)" }}>
            {[
              ["Área", getAreaLabel(equipment.areaCode)],
              ["Tipo", getTypeLabel(equipment.type)],
              ["Categoría", getCategoryLabel(equipment.category)],
              ["Cantidad", equipment.quantity],
              ["Potencia", `${numberFormat(equipment.powerW, 1)} W`],
              ["Uso", `${numberFormat(equipment.usage.hoursPerDay, 1)} h/día · ${numberFormat(equipment.usage.daysPerWeek, 1)} días/sem`],
              ["horasMes", numberFormat(hoursMonth, 2)],
              ["kWh/mes", numberFormat(kwhMonth, 2)],
              ["EF usado", `${numberFormat(factorValue, 3)} kgCO₂e/kWh`],
              ["CO₂e estimado", `${numberFormat(co2eKg, 2)} kgCO₂e · ${numberFormat(co2eT, 4)} tCO₂e`],
            ].map(([label, value], index, all) => (
              <div key={label} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, borderBottom: index < all.length - 1 ? "1px solid var(--eco-border)" : "none" }}>
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{label}</span>
                <span style={{ fontFamily: label === "CO₂e estimado" || label === "kWh/mes" ? fm : fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-700))", textAlign: "right", lineHeight: 1.5 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Factor status card */}
          <div style={{ background: usingFallbackFactor ? "var(--eco-warning-bg)" : "var(--eco-info-bg)", border: `1px solid ${usingFallbackFactor ? "#FDE68A" : "#BFDBFE"}`, borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Info size={15} style={{ color: usingFallbackFactor ? "var(--eco-warning)" : "var(--eco-info)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>{usingFallbackFactor ? "Factor requerido" : "Factor aplicado"}</p>
              <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.5 }}>
                {usingFallbackFactor ? "El cálculo de CO₂e requiere configurar un factor eléctrico activo." : factorSourceLabel}
              </p>
            </div>
          </div>

          {/* Generate record action */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <Field label="Mes del registro estimado">
              <input type="month" value={monthValue} onChange={(event) => onGenerate("draft-month", event.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={onEdit} style={secondaryButtonStyle}>
                <Pencil size={14} />
                Editar
              </button>
              <button type="button" onClick={() => onGenerate("confirm")} style={{ ...primaryButtonStyle, opacity: equipment.category === "electricidad" && !usingFallbackFactor ? 1 : 0.7 }} disabled={equipment.category !== "electricidad" || usingFallbackFactor}>
                <Leaf size={14} />
                Generar registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN PAGE
   --------------------------------------------------------------- */
export default function EquipmentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [defaultFactor, setDefaultFactor] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    areaCode: "all",
    type: "all",
    category: "all",
    onlyActive: true,
  });
  const [toast, setToast] = useState(null);
  const [modalState, setModalState] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [detailState, setDetailState] = useState(null);

  const loadEquipment = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [nextItems, nextFactor] = await Promise.all([
        fetchEquipment(),
        fetchEquipmentElectricityFactor().catch(() => null),
      ]);
      setItems(nextItems);
      setDefaultFactor(nextFactor);
    } catch {
      setError("No se pudieron cargar los equipos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  useEffect(() => {
    const handleRefresh = () => loadEquipment();
    window.addEventListener("carbontrack:equipment-changed", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    return () => {
      window.removeEventListener("carbontrack:equipment-changed", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [loadEquipment]);

  const factorValue = defaultFactor?.value ?? 0;
  const usingFallbackFactor = !defaultFactor;
  const factorSourceLabel = defaultFactor
    ? `Factor predeterminado de electricidad: ${defaultFactor.provider || defaultFactor.region || "Configurado"}`
    : "No hay factor eléctrico predeterminado disponible.";

  const filtered = useMemo(() => filterEquipment(items, filters), [items, filters]);

  const summary = useMemo(() => {
    const activeFiltered = filtered.filter((item) => item.isActive);
    const electricityRows = filtered.filter((item) => item.category === "electricidad");
    const totalKwh = electricityRows.reduce((acc, item) => acc + computeKwhMonth(item), 0);
    const totalCo2eT = electricityRows.reduce((acc, item) => acc + computeCo2eMonth(item, factorValue).co2eT, 0);
    const byArea = electricityRows.reduce((acc, item) => {
      const key = item.areaCode;
      acc[key] = (acc[key] || 0) + computeKwhMonth(item);
      return acc;
    }, {});
    const topAreaEntry = Object.entries(byArea).sort((left, right) => right[1] - left[1])[0] || null;

    return {
      activeCount: activeFiltered.length,
      totalKwh,
      totalCo2eT,
      topArea: topAreaEntry ? { label: getAreaLabel(topAreaEntry[0]), value: topAreaEntry[1] } : null,
    };
  }, [filtered, factorValue]);

  const hasActiveFilters = useMemo(() => {
    return filters.search || filters.areaCode !== "all" || filters.type !== "all" || filters.category !== "all" || !filters.onlyActive;
  }, [filters]);

  const openCreate = () => {
    setModalState({ equipment: null, form: createEmptyEquipmentForm(), errors: {}, saving: false });
  };

  const openEdit = (equipment) => {
    setModalState({ equipment, form: createEmptyEquipmentForm(equipment), errors: {}, saving: false });
  };

  const closeModal = () => setModalState(null);

  const openDetail = (equipment) => {
    setDetailState({ equipment, factorValue, factorSourceLabel, usingFallbackFactor, monthValue: monthFieldValue() });
  };

  const closeDetail = () => setDetailState(null);

  const persistModal = async (event) => {
    event.preventDefault();
    if (!modalState) return;
    const payload = parseEquipmentFormData(event.currentTarget, modalState.form);
    const errors = validateEquipmentForm(payload);
    if (Object.keys(errors).length > 0) {
      setModalState((prev) => ({ ...prev, errors }));
      return;
    }

    setModalState((prev) => ({ ...prev, saving: true, errors: {} }));
    try {
      const result = await persistEquipment(payload);
      setItems(result.items);
      closeModal();
      setToast({
        title: modalState.equipment ? "Equipo actualizado" : "Equipo guardado",
        message: `${payload.name} · ${getAreaLabel(payload.areaCode)}`,
      });
    } catch {
      setModalState((prev) => ({ ...prev, saving: false }));
      setError("No se pudieron cargar los equipos. Intenta de nuevo.");
    }
  };

  const toggleActive = async (equipment) => {
    const next = await updateEquipmentStatus(equipment.id, !equipment.isActive).catch(() => null);
    if (!next) {
      setError("No se pudo actualizar el estado del equipo.");
      return;
    }
    setItems(next);
    setToast({ title: "Estado actualizado", message: equipment.isActive ? "Equipo desactivado." : "Equipo activado." });
    if (detailState?.equipment?.id === equipment.id) {
      const refreshed = next.find((item) => item.id === equipment.id);
      if (refreshed) openDetail(refreshed);
    }
  };

  const handleDuplicate = async (equipment) => {
    const result = await duplicateEquipment(equipment.id).catch(() => ({ ok: false }));
    if (!result.ok) return;
    setItems(result.items);
    setToast({ title: "Equipo duplicado", message: `${equipment.name} tiene una copia lista para editar.` });
  };

  const exportCsv = () => {
    exportRowsToCsv({
      filename: `equipment-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: filtered.map((item) => ({
        ...item,
        areaLabel: getAreaLabel(item.areaCode),
        typeLabel: getTypeLabel(item.type),
        kwhMonth: computeKwhMonth(item),
        co2eMonth: computeCo2eMonth(item, factorValue).co2eT,
        hoursMonth: computeHoursMonth(item),
      })),
      columns: [
        { label: "Area", get: (row) => row.areaLabel },
        { label: "Equipo", get: (row) => row.name },
        { label: "Categoria", get: (row) => row.category },
        { label: "Tipo", get: (row) => row.typeLabel },
        { label: "Cantidad", get: (row) => row.quantity },
        { label: "Potencia_W", get: (row) => row.powerW },
        { label: "Horas_dia", get: (row) => row.usage.hoursPerDay },
        { label: "Dias_semana", get: (row) => row.usage.daysPerWeek },
        { label: "Semanas_mes", get: (row) => row.usage.weeksPerMonth },
        { label: "Horas_mes", get: (row) => numberFormat(row.hoursMonth, 2) },
        { label: "kWh_mes", get: (row) => numberFormat(row.kwhMonth, 2) },
        { label: "tCO2e_mes", get: (row) => numberFormat(row.co2eMonth, 4) },
        { label: "Activo", get: (row) => (row.isActive ? "Si" : "No") },
        { label: "Notas", get: (row) => row.notes },
      ],
    });
    createNotification({
      type: "export_done",
      title: "CSV exportado",
      message: `Se exportaron ${filtered.length} equipo(s).`,
      link: "/catalogos/equipos",
      meta: { count: filtered.length, resource: "equipment" },
    });
    setToast({ title: "CSV exportado", message: `Se exportaron ${filtered.length} equipo(s).` });
  };

  const handleGenerateRecord = (action, nextMonthValue) => {
    if (!detailState) return;
    if (action === "draft-month") {
      setDetailState((prev) => ({ ...prev, monthValue: nextMonthValue }));
      return;
    }

    const recordDate = monthToFirstDay(detailState.monthValue);
    setConfirmModal({
      title: "Generar registro estimado",
      message: `Se creará un registro Scope 2 estimado para ${detailState.equipment.name} con fecha ${recordDate}. Confirma para evitar duplicados.`,
      onConfirm: async () => {
        try {
          const { record } = await createEquipmentEstimatedEmissionRecord({
            equipment: detailState.equipment,
            factorValue: detailState.factorValue,
            factorId: defaultFactor?.id || null,
            dateISO: recordDate,
          });
          setConfirmModal(null);
          setToast({ title: "Registro estimado generado", message: `${detailState.equipment.name} · ${numberFormat(record.value, 2)} kWh` });
        } catch {
          setConfirmModal(null);
          setError("No se pudo generar el registro estimado.");
        }
      },
    });
  };

  /* --- Loading skeleton --- */
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

        {/* HEADER */}
        <div className="ct-equipment-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
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
                <Monitor size={19} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontFamily: fd, fontSize: 26, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))", letterSpacing: "-0.02em" }}>Equipos</h1>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>
                  Gestiona el inventario para estimar consumo eléctrico por área.
                </p>
              </div>
            </div>
          </div>

          <div className="ct-equipment-toolbar" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 80ms both" }}>
            <button type="button" onClick={() => setToast({ title: "Importación no disponible", message: "La importación masiva para esta pantalla aún requiere un endpoint dedicado." })} style={secondaryButtonStyle}>
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
              Nuevo equipo
            </button>
          </div>
        </div>

        {/* FACTOR STATUS BANNER */}
        <div
          style={{
            marginBottom: 18,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 100ms both",
            background: usingFallbackFactor ? "linear-gradient(135deg,var(--eco-warning-bg),var(--eco-surface))" : "linear-gradient(135deg,var(--eco-info-bg),var(--eco-surface))",
            border: `1px solid ${usingFallbackFactor ? "#FDE68A" : "#BFDBFE"}`,
            borderRadius: "var(--eco-radius-lg)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {usingFallbackFactor
            ? <AlertTriangle size={16} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
            : <CheckCircle2 size={16} style={{ color: "var(--eco-info)", flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>
              {usingFallbackFactor ? "Factor requerido" : "Factor disponible"}
            </p>
            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.5 }}>
              {usingFallbackFactor ? "Las estimaciones de CO₂e quedan en espera hasta contar con un factor eléctrico vigente." : factorSourceLabel}
            </p>
          </div>
        </div>

        {/* ERROR BANNER */}
        {error ? (
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
            <button type="button" onClick={loadEquipment} style={secondaryButtonStyle}>Reintentar</button>
          </div>
        ) : null}

        {/* KPI CARDS */}
        <div
          className="ct-equipment-kpis"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 14,
            marginBottom: 20,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 120ms both",
          }}
        >
          <KpiCard
            icon={<Monitor size={18} />}
            iconBg="linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))"
            title="Equipos activos"
            value={numberFormat(summary.activeCount, 0)}
            unit=""
            sub="Conteo según filtros actuales"
            delay={120}
          />
          <KpiCard
            icon={<Zap size={18} />}
            iconBg="linear-gradient(135deg,#3B82F6,#2563EB)"
            title="kWh estimados / mes"
            value={numberFormat(summary.totalKwh, 2)}
            unit="kWh"
            sub="Solo equipos eléctricos filtrados"
            delay={160}
          />
          <KpiCard
            icon={<Leaf size={18} />}
            iconBg="linear-gradient(135deg,#EAB308,#CA8A04)"
            title="CO₂e estimado / mes"
            value={numberFormat(summary.totalCo2eT, 4)}
            unit="tCO₂e"
            sub={usingFallbackFactor ? "Requiere factor eléctrico configurado." : "Con factor eléctrico predeterminado."}
            delay={200}
          />
          <KpiCard
            icon={<Building2 size={18} />}
            iconBg="linear-gradient(135deg,#64748B,#475569)"
            title="Top área por consumo"
            value={summary.topArea ? summary.topArea.label : "—"}
            unit=""
            sub={summary.topArea ? `${numberFormat(summary.topArea.value, 2)} kWh/mes` : "Sin datos con filtros actuales"}
            delay={240}
          />
        </div>

        {/* FILTER BAR (horizontal pill style, green border) */}
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
            value={filters.areaCode}
            onChange={(v) => setFilters((prev) => ({ ...prev, areaCode: v }))}
            options={[{ value: "all", label: "Todas las áreas" }, ...EQUIPMENT_AREA_OPTIONS]}
            icon={<Building2 size={13} />}
            placeholder="Área"
          />

          <FilterSelect
            value={filters.type}
            onChange={(v) => setFilters((prev) => ({ ...prev, type: v }))}
            options={[{ value: "all", label: "Todos los tipos" }, ...EQUIPMENT_TYPE_OPTIONS]}
            icon={<Monitor size={13} />}
            placeholder="Tipo"
          />

          <FilterSelect
            value={filters.category}
            onChange={(v) => setFilters((prev) => ({ ...prev, category: v }))}
            options={[{ value: "all", label: "Todas" }, ...EQUIPMENT_CATEGORY_OPTIONS]}
            icon={<Zap size={13} />}
            placeholder="Categoría"
          />

          <TogglePill
            label="Solo activos"
            icon={<CheckCircle2 size={12} />}
            active={filters.onlyActive}
            onClick={() => setFilters((prev) => ({ ...prev, onlyActive: !prev.onlyActive }))}
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
              placeholder="Buscar equipo..."
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
              onClick={() => setFilters({ search: "", areaCode: "all", type: "all", category: "all", onlyActive: true })}
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

        {/* TABLE SECTION */}
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
            <Calculator size={14} />
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
            Inventario
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
            <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--eco-gray-100)", color: "var(--eco-gray-400)" }}>
              <FileX size={28} />
            </div>
            <p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-700))" }}>Sin resultados</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))", maxWidth: 360, marginInline: "auto", lineHeight: 1.55 }}>
              {items.length === 0 ? "No hay equipos registrados todavía." : "No hay equipos con estos filtros."}
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
                    {["Área", "Equipo", "Tipo", "Cant.", "Potencia", "Uso", "kWh/mes", "CO₂e/mes", "Estado", "Acciones"].map((label) => (
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
                  {filtered.map((equipment, index) => {
                    const kwhMonth = computeKwhMonth(equipment);
                    const co2eMonth = computeCo2eMonth(equipment, factorValue);
                    return (
                      <tr
                        key={equipment.id}
                        style={{
                          borderBottom: index < filtered.length - 1 ? "1px solid var(--eco-border)" : "none",
                          background: hoverRow === equipment.id ? "var(--eco-surface)" : "transparent",
                          transition: "background 140ms",
                          animation: `ctFadeUp .24s ease-out ${Math.min(index * 28, 240)}ms both`,
                        }}
                        onMouseEnter={() => setHoverRow(equipment.id)}
                        onMouseLeave={() => setHoverRow(null)}
                      >
                        <td style={{ padding: "12px", color: "var(--eco-text, var(--eco-gray-700))", fontWeight: 600, fontSize: 12 }}>
                          {getAreaLabel(equipment.areaCode)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>{equipment.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                              <Badge tone="info">Estimación</Badge>
                              {equipment.category !== "electricidad" ? <Badge tone="warning">Requiere endpoint dedicado</Badge> : null}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px", color: "var(--eco-text-soft, var(--eco-gray-600))", fontSize: 12 }}>{getTypeLabel(equipment.type)}</td>
                        <td style={{ padding: "12px", fontFamily: fm, color: "var(--eco-text, var(--eco-gray-700))", fontSize: 12 }}>{numberFormat(equipment.quantity, 0)}</td>
                        <td style={{ padding: "12px", fontFamily: fm, color: "var(--eco-text, var(--eco-gray-700))", fontSize: 12 }}>{numberFormat(equipment.powerW, 1)} W</td>
                        <td style={{ padding: "12px", color: "var(--eco-text-soft, var(--eco-gray-600))", fontSize: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} style={{ color: "var(--eco-gray-400)" }} />
                            {`${numberFormat(equipment.usage.hoursPerDay, 1)}h/d · ${numberFormat(equipment.usage.daysPerWeek, 1)}d/s`}
                          </div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{numberFormat(kwhMonth, 2)}</span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>{numberFormat(co2eMonth.co2eT, 4)} t</span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {equipment.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="warning">Inactivo</Badge>}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <IconActionButton label="Ver detalle" onClick={() => openDetail(equipment)} icon={<Eye size={14} />} />
                            <IconActionButton label="Editar" onClick={() => openEdit(equipment)} icon={<Pencil size={14} />} />
                            <IconActionButton label="Duplicar" onClick={() => handleDuplicate(equipment)} icon={<Copy size={14} />} />
                            <IconActionButton
                              label={equipment.isActive ? "Desactivar" : "Activar"}
                              onClick={() => toggleActive(equipment)}
                              icon={<Power size={14} />}
                              tone={equipment.isActive ? "danger" : "success"}
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
                Mostrando {filtered.length} de {items.length} equipo{items.length !== 1 ? "s" : ""}
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

      <EquipmentModal
        state={modalState}
        onClose={closeModal}
        onSubmit={persistModal}
        onFormChange={(updater) => setModalState((prev) => ({ ...prev, form: typeof updater === "function" ? updater(prev.form) : updater }))}
      />
      <DetailDrawer
        state={detailState}
        onClose={closeDetail}
        onEdit={() => {
          if (!detailState) return;
          closeDetail();
          openEdit(detailState.equipment);
        }}
        onGenerate={handleGenerateRecord}
      />
      <ConfirmModal modal={confirmModal} onCancel={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm?.()} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

