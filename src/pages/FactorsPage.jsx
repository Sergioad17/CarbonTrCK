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
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { exportRowsToCsv } from "../lib/csvExport";
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
@media(max-width:900px){.ct-factors-grid{grid-template-columns:1fr!important}.ct-factors-actions{width:100%;justify-content:stretch}.ct-factors-actions button{flex:1}}
@media(max-width:760px){.ct-factor-header{flex-direction:column;align-items:flex-start!important}.ct-factor-toolbar{width:100%}.ct-factor-toolbar button{flex:1}.ct-factor-modal-grid{grid-template-columns:1fr!important}}
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

const inputStyle = {
  width: "100%",
  height: 40,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-gray-200)",
  padding: "0 12px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-gray-700)",
  background: "white",
};

const primaryButtonStyle = {
  height: 38,
  padding: "0 14px",
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
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-gray-200)",
  background: "white",
  color: "var(--eco-gray-700)",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const iconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: "var(--eco-radius-sm)",
  border: "1px solid var(--eco-gray-200)",
  background: "white",
  color: "var(--eco-gray-500)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const checkboxRowStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-gray-700)",
};

const radioCardStyle = (active) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 12,
  borderRadius: "var(--eco-radius-md)",
  border: `1px solid ${active ? "var(--eco-primary-300)" : "var(--eco-gray-200)"}`,
  background: active ? "var(--eco-primary-50)" : "white",
  cursor: "pointer",
});

const segmentedButtonStyle = (active) => ({
  flex: 1,
  border: "none",
  background: active ? "var(--eco-primary-50)" : "white",
  color: active ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
  fontFamily: fb,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

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
    neutral: {
      color: "var(--eco-gray-600)",
      background: "var(--eco-gray-100)",
      border: "var(--eco-gray-200)",
    },
  }[tone] || {
    color: "var(--eco-gray-600)",
    background: "var(--eco-gray-100)",
    border: "var(--eco-gray-200)",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
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

function SectionLabel({ icon, children, delay = 0 }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,
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
        {icon}
      </div>
      <h2
        style={{
          margin: 0,
          fontFamily: fd,
          fontSize: 17,
          fontWeight: 700,
          color: "var(--eco-gray-800)",
          letterSpacing: "-0.01em",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-500)" }}>{label}</span>
      {children}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
    </label>
  );
}

function IconActionButton({ label, onClick, icon }) {
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
        border: "1px solid var(--eco-gray-200)",
        background: "white",
        color: "var(--eco-gray-500)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 140ms",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = "var(--eco-primary-300)";
        event.currentTarget.style.color = "var(--eco-primary-600)";
        event.currentTarget.style.background = "var(--eco-primary-50)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "var(--eco-gray-200)";
        event.currentTarget.style.color = "var(--eco-gray-500)";
        event.currentTarget.style.background = "white";
      }}
    >
      {icon}
    </button>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 2600);
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
        background: "white",
        border: "1px solid var(--eco-gray-200)",
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
        <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>
          {toast.title}
        </p>
        <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
          {toast.message}
        </p>
      </div>
    </div>
  );
}

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
          background: "white",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          border: "1px solid var(--eco-gray-200)",
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
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-gray-900)" }}>
              {modal.title}
            </h3>
            <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", lineHeight: 1.55 }}>
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
          background: "white",
          boxShadow: "var(--eco-shadow-xl)",
          borderLeft: "1px solid var(--eco-gray-200)",
          display: "flex",
          flexDirection: "column",
          animation: "ctSlideR .25s cubic-bezier(.33,1,.68,1)",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>
              Catálogos / Factores / Detalle
            </p>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)" }}>
              Factor de emisión
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "linear-gradient(135deg,var(--eco-primary-50),#F8FFFB)",
              border: "1px solid var(--eco-primary-200)",
              borderRadius: "var(--eco-radius-xl)",
              padding: 18,
            }}
          >
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>
              Fórmula
            </p>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)" }}>CO₂e</span>
              <span style={{ color: "var(--eco-gray-400)", fontFamily: fm }}> = </span>
              <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)" }}>AD</span>
              <span style={{ color: "var(--eco-gray-400)", fontFamily: fm }}> × </span>
              <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-primary-700)" }}>EF</span>
            </div>
            <p style={{ margin: "12px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-600)", lineHeight: 1.55 }}>
              {factor.category === "electricidad"
                ? `Ejemplo: ${sampleAmount} kWh × ${numberFormat(factor.value, 3)} kgCO2e/kWh = ${numberFormat(sampleResult, 3)} kgCO2e`
                : `Ejemplo: ${sampleAmount} L × ${numberFormat(factor.value, 3)} kgCO2e/L = ${numberFormat(sampleResult, 3)} kgCO2e`}
            </p>
          </div>

          <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden" }}>
            {[
              ["Scope", factor.scope.replace("scope", "Scope ")],
              ["Categoría", factor.category],
              ["Valor", `${numberFormat(factor.value, 3)} ${factor.numeratorUnit}/${factor.denominatorUnit}`],
              ["Región", factor.region],
              ["Proveedor", factor.provider || "Sin proveedor"],
              ["Fuente", factor.sourceUrl || "Sin URL"],
              ["Vigencia", `${formatDate(factor.validFrom)} / ${factor.validTo ? formatDate(factor.validTo) : "Vigente"}`],
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
                  borderBottom: index < all.length - 1 ? "1px solid var(--eco-gray-100)" : "none",
                }}
              >
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{label}</span>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)", textAlign: "right", lineHeight: 1.5 }}>
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

function SkeletonRows() {
  const shimmer = "linear-gradient(90deg,var(--eco-gray-100) 25%,var(--eco-gray-200) 50%,var(--eco-gray-100) 75%)";
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            height: 76,
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-gray-200)",
            background: "white",
            padding: 16,
            animation: `ctFadeUp .3s ease-out ${row * 50}ms both`,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, height: "100%" }}>
            {[0, 1, 2, 3, 4].map((cell) => (
              <div
                key={cell}
                style={{
                  borderRadius: "var(--eco-radius-md)",
                  background: shimmer,
                  backgroundSize: "200% 100%",
                  animation: "ctShimmer 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FactorModal({ state, onClose, onSubmit }) {
  if (!state) return null;
  const { factor, form, errors, saving, usageCount } = state;
  const isEdit = Boolean(factor);
  const title = isEdit ? "Editar factor" : "Nuevo factor";
  const helper =
    isEdit && form.editMode === "newVersion"
      ? "Crear nueva versión es la opción recomendada para mantener trazabilidad."
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
          background: "white",
          border: "1px solid var(--eco-gray-200)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          animation: "ctPop .22s ease-out",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)" }}>{title}</h3>
            <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>{helper}</p>
            {errors.editMode ? <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{errors.editMode}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {isEdit && (
            <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-lg)", padding: 14, border: "1px solid var(--eco-gray-200)" }}>
              <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>
                Modo de edición
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={radioCardStyle(form.editMode === "edit")}>
                  <input type="radio" name="editMode" value="edit" checked={form.editMode === "edit"} onChange={() => state.setForm((prev) => ({ ...prev, editMode: "edit" }))} />
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>Editar este registro</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)", marginTop: 2 }}>
                      Úsalo si todavía no se ha usado o si confirmas cambiarlo directamente.
                    </div>
                  </div>
                </label>
                <label style={radioCardStyle(form.editMode === "newVersion")}>
                  <input type="radio" name="editMode" value="newVersion" checked={form.editMode === "newVersion"} onChange={() => state.setForm((prev) => ({ ...prev, editMode: "newVersion" }))} />
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>Crear nueva versión</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)", marginTop: 2 }}>
                      Recomendado para conservar históricos de cálculos y reportes.
                    </div>
                  </div>
                </label>
              </div>
              {usageCount > 0 && form.editMode === "edit" && (
                <label style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 10, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>
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
              <input value={form.denominatorUnit} readOnly style={{ ...inputStyle, background: "var(--eco-gray-50)" }} />
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
              <input value={form.provider} onChange={(event) => state.setForm((prev) => ({ ...prev, provider: event.target.value }))} style={inputStyle} />
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
              <input type="number" min="0" step="0.1" value={form.uncertaintyPct} onChange={(event) => state.setForm((prev) => ({ ...prev, uncertaintyPct: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Notas" error={errors.notes}>
              <textarea value={form.notes} onChange={(event) => state.setForm((prev) => ({ ...prev, notes: event.target.value }))} style={{ ...inputStyle, minHeight: 100, paddingTop: 10, resize: "vertical" }} />
            </Field>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={form.isDefault} onChange={(event) => state.setForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
              Predeterminado
            </label>
            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => state.setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              Activo
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }}>
              <Save size={14} />
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar factor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FactorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [factors, setFactors] = useState([]);
  const [toast, setToast] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
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
      setTimeout(() => setLoading(false), 220);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const filtered = useMemo(
    () => filterFactors(factors, { ...filters, today: todayIso() }),
    [factors, filters]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count += 1;
    if (filters.scope !== "all") count += 1;
    if (filters.category !== "all") count += 1;
    if (!filters.onlyActive) count += 1;
    if (!filters.onlyCurrent) count += 1;
    return count;
  }, [filters]);

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
            setToast({ title: "Factor predeterminado actualizado", message: "La combinación ya tiene un nuevo predeterminado." });
          }
          setConfirmModal(null);
        },
      });
      return;
    }
    if (result.ok) {
      setFactors(result.factors);
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
    setToast({ title: "CSV exportado", message: `Se exportaron ${filtered.length} factor(es).` });
  };

  return (
    <>
      <style>{PAGE_ANIMATIONS}</style>
      <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        <div className="ct-factor-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
          <div style={{ animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 22px rgba(34,197,94,.18)" }}>
                <Beaker size={18} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontFamily: fd, fontSize: 26, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>
                  Factores de emisión
                </h1>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>
                  Administra factores (EF) para convertir consumo a CO₂e. Cambios afectan cálculos y reportes.
                </p>
              </div>
            </div>
          </div>
          <div className="ct-factor-toolbar ct-factors-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 80ms both" }}>
            <button type="button" onClick={() => setToast({ title: "Importación próximamente", message: "La estructura está lista para conectar backend más adelante." })} style={secondaryButtonStyle}>
              <Upload size={14} />
              Importar
            </button>
            <button type="button" onClick={exportCsv} style={secondaryButtonStyle}>
              <Download size={14} />
              Exportar CSV
            </button>
            <button type="button" onClick={openCreate} style={primaryButtonStyle}>
              <Plus size={14} />
              Nuevo factor
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 18, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 120ms both", background: "linear-gradient(135deg,var(--eco-warning-bg),#FFFDF2)", border: "1px solid #FDE68A", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>Valores de ejemplo</p>
            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.5 }}>
              Se cargan factores demo para que la pantalla se vea funcionando. Edítalos con una fuente oficial antes de usarlos en producción.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 18, animation: "ctFadeUp .3s ease-out", background: "var(--eco-danger-bg)", border: "1px solid #FECACA", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} style={{ color: "var(--eco-danger)" }} />
              <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)" }}>{error}</span>
            </div>
            <button type="button" onClick={loadFactors} style={secondaryButtonStyle}>Reintentar</button>
          </div>
        )}

        <SectionLabel icon={<Filter size={14} />} delay={140}>Filtros</SectionLabel>
        <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", marginBottom: 20, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 160ms both" }}>
          <button type="button" onClick={() => setFiltersOpen((prev) => !prev)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: filtersOpen ? "1px solid var(--eco-gray-100)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-700)" }}>Refina el catálogo</span>
              {activeFilterCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: "var(--eco-radius-full)", background: "var(--eco-primary-100)", color: "var(--eco-primary-700)", fontFamily: fm, fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 5px" }}>{activeFilterCount}</span>}
            </div>
            <ChevronDown size={16} style={{ color: "var(--eco-gray-400)", transform: filtersOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }} />
          </button>
          {filtersOpen && (
            <div style={{ padding: 16 }}>
              <div className="ct-factors-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,minmax(0,1fr))", gap: 12 }}>
                <Field label="Buscar">
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "var(--eco-gray-400)" }} />
                    <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} style={{ ...inputStyle, paddingLeft: 34 }} placeholder="Proveedor, región o notas" />
                  </div>
                </Field>
                <Field label="Scope">
                  <select value={filters.scope} onChange={(event) => setFilters((prev) => ({ ...prev, scope: event.target.value }))} style={inputStyle}>
                    {scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Categoría">
                  <select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))} style={inputStyle}>
                    {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Activos">
                  <div style={{ display: "flex", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-md)", overflow: "hidden", height: 40 }}>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, onlyActive: true }))} style={segmentedButtonStyle(filters.onlyActive)}>Activos</button>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, onlyActive: false }))} style={segmentedButtonStyle(!filters.onlyActive)}>Todos</button>
                  </div>
                </Field>
                <Field label="Vigencia">
                  <div style={{ display: "flex", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-md)", overflow: "hidden", height: 40 }}>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, onlyCurrent: true }))} style={segmentedButtonStyle(filters.onlyCurrent)}>Vigentes hoy</button>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, onlyCurrent: false }))} style={segmentedButtonStyle(!filters.onlyCurrent)}>Todos</button>
                  </div>
                </Field>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setFilters({ search: "", scope: "all", category: "all", onlyActive: true, onlyCurrent: true })} style={secondaryButtonStyle}>
                  <RotateCcw size={13} />
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        <SectionLabel icon={<ShieldCheck size={14} />} delay={180}>Listado de factores</SectionLabel>
        {loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", padding: "50px 24px", textAlign: "center", animation: "ctFadeUp .4s ease-out" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--eco-gray-100)", color: "var(--eco-gray-400)" }}>
              <FileX size={28} />
            </div>
            <p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin coincidencias</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", maxWidth: 340, marginInline: "auto", lineHeight: 1.55 }}>
              No hay factores con estos filtros. Prueba cambiar el scope o activar “Todos”.
            </p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 220ms both" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--eco-gray-50)", borderBottom: "1px solid var(--eco-gray-200)" }}>
                    {["Scope", "Categoría", "Valor", "Región", "Vigencia", "Predeterminado", "Estado", "Acciones"].map((label) => (
                      <th key={label} style={{ padding: "11px 12px", textAlign: "left", fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((factor, index) => (
                    <tr
                      key={factor.id}
                      style={{
                        borderBottom: index < filtered.length - 1 ? "1px solid var(--eco-gray-100)" : "none",
                        background: hoverRow === factor.id ? "var(--eco-gray-50)" : "white",
                        transition: "background 140ms",
                        animation: `ctFadeUp .24s ease-out ${Math.min(index * 28, 240)}ms both`,
                      }}
                      onMouseEnter={() => setHoverRow(factor.id)}
                      onMouseLeave={() => setHoverRow(null)}
                    >
                      <td style={{ padding: "12px" }}><div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>{factor.scope.replace("scope", "Scope ")}</div></td>
                      <td style={{ padding: "12px", color: "var(--eco-gray-600)" }}>{factor.category}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{numberFormat(factor.value, 3)} {factor.numeratorUnit}/{factor.denominatorUnit}</div>
                        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", marginTop: 2 }}>{factor.provider || "Sin proveedor"}</div>
                      </td>
                      <td style={{ padding: "12px", color: "var(--eco-gray-600)" }}>{factor.region}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>
                          <Calendar size={13} style={{ color: "var(--eco-gray-400)" }} />
                          <span>{formatDate(factor.validFrom)} / {factor.validTo ? formatDate(factor.validTo) : "Vigente"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>{factor.isDefault ? <Badge tone="success">Predeterminado</Badge> : <Badge>Sin default</Badge>}</td>
                      <td style={{ padding: "12px" }}>{factor.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="warning">Inactivo</Badge>}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <IconActionButton label="Ver" onClick={() => setSelectedFactor(factor)} icon={<Eye size={14} />} />
                          <IconActionButton label="Editar" onClick={() => openEdit(factor, "edit")} icon={<Pencil size={14} />} />
                          <IconActionButton label="Versionar" onClick={() => openEdit(factor, "newVersion")} icon={<Copy size={14} />} />
                          {!factor.isDefault && factor.isActive && !factor.validTo ? <IconActionButton label="Definir predeterminado" onClick={() => handleDefault(factor)} icon={<CheckCircle2 size={14} />} /> : null}
                          <IconActionButton label={factor.isActive ? "Desactivar" : "Activar"} onClick={() => toggleActive(factor)} icon={<Power size={14} />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <FactorModal state={modalState} onClose={closeModal} onSubmit={handleSubmit} />
      <Drawer factor={selectedFactor} onClose={() => setSelectedFactor(null)} />
      <ConfirmModal modal={confirmModal} onCancel={() => setConfirmModal(null)} onConfirm={() => {
        const action = confirmModal?.onConfirm;
        if (action) action();
      }} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
