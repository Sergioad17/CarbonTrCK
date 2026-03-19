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
  Save,
  Search,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { exportRowsToCsv } from "../lib/csvExport";
import {
  EQUIPMENT_AREA_OPTIONS,
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  appendEstimatedRecord,
  buildEstimatedRecord,
  computeCo2eMonth,
  computeHoursMonth,
  computeKwhMonth,
  deactivate,
  duplicate,
  filterEquipment,
  getAll,
  getAreaLabel,
  getCategoryLabel,
  getTypeLabel,
  upsert,
} from "../lib/equipmentStore";
import { getDefaultElectricityFactor } from "../lib/factorsStore";

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

const DEMO_FACTOR = 0.433;

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

const textAreaStyle = {
  width: "100%",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-gray-200)",
  padding: "10px 12px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-gray-700)",
  background: "white",
  resize: "vertical",
  minHeight: 88,
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
};

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

const emptyForm = (item) => ({
  id: item?.id || "",
  campusCode: item?.campusCode || "CAMPUS-CT",
  areaCode: item?.areaCode || "Aulas",
  name: item?.name || "",
  category: item?.category || "electricidad",
  type: item?.type || "it",
  quantity: item?.quantity ?? 1,
  powerW: item?.powerW ?? 0,
  hoursPerDay: item?.usage?.hoursPerDay ?? 0,
  daysPerWeek: item?.usage?.daysPerWeek ?? 5,
  weeksPerMonth: item?.usage?.weeksPerMonth ?? 4.3,
  notes: item?.notes || "",
  isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
});

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

function Badge({ tone = "neutral", children }) {
  const theme = {
    success: { color: "var(--eco-success)", background: "var(--eco-success-bg)", border: "#BBF7D0" },
    warning: { color: "var(--eco-secondary-600)", background: "var(--eco-warning-bg)", border: "#FDE68A" },
    info: { color: "var(--eco-info)", background: "var(--eco-info-bg)", border: "#BFDBFE" },
    neutral: { color: "var(--eco-gray-600)", background: "var(--eco-gray-100)", border: "var(--eco-gray-200)" },
  }[tone];

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

function Field({ label, error, helper, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-500)" }}>{label}</span>
      {children}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
      {!error && helper ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{helper}</span> : null}
    </label>
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
          width: "min(92vw, 500px)",
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

function IconActionButton({ label, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={iconButtonStyle}
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

function KpiCard({ icon, title, value, unit, sub, delay = 0, tone = "green" }) {
  const palette = {
    green: { bg: "var(--eco-primary-50)", color: "var(--eco-primary-700)" },
    blue: { bg: "var(--eco-info-bg)", color: "var(--eco-info)" },
    yellow: { bg: "var(--eco-warning-bg)", color: "var(--eco-secondary-600)" },
    gray: { bg: "var(--eco-gray-100)", color: "var(--eco-gray-600)" },
  }[tone];

  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        padding: 18,
        border: "1px solid var(--eco-gray-200)",
        boxShadow: "var(--eco-shadow-sm)",
        animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--eco-radius-md)",
            background: palette.bg,
            color: palette.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 500, color: "var(--eco-gray-500)" }}>{title}</p>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: fm, fontSize: 26, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{value}</span>
        <span style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-gray-400)" }}>{unit}</span>
      </div>
      {sub ? <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", lineHeight: 1.5 }}>{sub}</p> : null}
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
            height: 88,
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-gray-200)",
            background: "white",
            padding: 16,
            animation: `ctFadeUp .3s ease-out ${row * 50}ms both`,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, height: "100%" }}>
            {[0, 1, 2, 3, 4, 5].map((cell) => (
              <div key={cell} style={{ borderRadius: "var(--eco-radius-md)", background: shimmer, backgroundSize: "200% 100%", animation: "ctShimmer 1.4s ease-in-out infinite" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipmentModal({ state, onClose, onSubmit, onFormChange }) {
  if (!state) return null;
  const { form, errors, saving, equipment } = state;
  const isElectric = form.category === "electricidad";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "grid", placeItems: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(2px)", animation: "ctOverlay .18s ease-out" }} onClick={onClose} />
      <div
        style={{
          position: "relative",
          width: "min(94vw, 760px)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "white",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          border: "1px solid var(--eco-gray-200)",
          animation: "ctPop .2s ease-out",
        }}
      >
        <form onSubmit={onSubmit}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>Catálogos / Equipos / {equipment ? "Editar" : "Nuevo"}</p>
              <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)" }}>{equipment ? "Editar equipo" : "Nuevo equipo"}</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}><X size={16} /></button>
          </div>

          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg,var(--eco-primary-50),#F8FFFB)", border: "1px solid var(--eco-primary-200)", borderRadius: "var(--eco-radius-xl)", padding: 18 }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-primary-700)" }}>Consumo mensual estimado</p>
              <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.5 }}>
                kWh/mes = (W × horasMes × cantidad) / 1000, donde horasMes = horas/día × días/semana × semanas/mes.
              </p>
            </div>

            <div className="ct-equipment-modal-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
              <Field label="Nombre del equipo" error={errors.name}>
                <input name="name" defaultValue={form.name} style={inputStyle} placeholder="PC de escritorio" />
              </Field>
              <Field label="Campus" error={errors.campusCode}>
                <input name="campusCode" defaultValue={form.campusCode} style={inputStyle} placeholder="CAMPUS-CT" />
              </Field>
              <Field label="Área" error={errors.areaCode}>
                <select name="areaCode" defaultValue={form.areaCode} style={inputStyle}>
                  {EQUIPMENT_AREA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo" error={errors.type}>
                <select name="type" defaultValue={form.type} style={inputStyle}>
                  {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Categoría" error={errors.category}>
                <select name="category" value={form.category} onChange={(event) => onFormChange((prev) => ({ ...prev, category: event.target.value }))} style={inputStyle}>
                  {EQUIPMENT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad" error={errors.quantity}>
                <input name="quantity" type="number" min="0" step="1" defaultValue={form.quantity} style={inputStyle} />
              </Field>
            </div>

            {!isElectric ? (
              <div style={{ background: "var(--eco-warning-bg)", border: "1px solid #FDE68A", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Info size={15} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>Combustible: próximamente</p>
                  <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.5 }}>
                    En este MVP se guarda el inventario, pero los campos específicos como litros/hora se dejan listos para backend futuro.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="ct-equipment-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 }}>
              <Field label="Potencia por unidad (W)" error={errors.powerW} helper={isElectric ? "Solo aplica para electricidad." : "No aplica en combustible por ahora."}>
                <input name="powerW" type="number" min="0" step="0.1" defaultValue={form.powerW} style={{ ...inputStyle, background: isElectric ? "white" : "var(--eco-gray-50)" }} disabled={!isElectric} />
              </Field>
              <Field label="Horas por día" error={errors.hoursPerDay}>
                <input name="hoursPerDay" type="number" min="0" step="0.1" defaultValue={form.hoursPerDay} style={inputStyle} />
              </Field>
              <Field label="Días por semana" error={errors.daysPerWeek}>
                <input name="daysPerWeek" type="number" min="0" step="0.1" defaultValue={form.daysPerWeek} style={inputStyle} />
              </Field>
            </div>

            <div className="ct-equipment-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Semanas por mes" error={errors.weeksPerMonth} helper="Valor sugerido: 4.3">
                <input name="weeksPerMonth" type="number" min="0" step="0.1" defaultValue={form.weeksPerMonth} style={inputStyle} />
              </Field>
              <Field label="Estado">
                <div style={{ display: "flex", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-md)", overflow: "hidden", height: 40 }}>
                  <button type="button" onClick={() => onFormChange((prev) => ({ ...prev, isActive: true }))} style={segmentedButtonStyle(form.isActive)}>Activo</button>
                  <button type="button" onClick={() => onFormChange((prev) => ({ ...prev, isActive: false }))} style={segmentedButtonStyle(!form.isActive)}>Inactivo</button>
                </div>
                <input type="hidden" name="isActive" value={String(form.isActive)} readOnly />
              </Field>
            </div>

            <Field label="Notas" error={errors.notes}>
              <textarea name="notes" defaultValue={form.notes} style={textAreaStyle} placeholder="Comentarios, contexto del cálculo o supuestos." />
            </Field>
          </div>

          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--eco-gray-100)", background: "var(--eco-gray-50)" }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>Los cambios se guardan en localStorage y quedan listos para conectar backend después.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }}>
                <Save size={14} />
                {saving ? "Guardando..." : equipment ? "Actualizar equipo" : "Guardar equipo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

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
            <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>Catálogos / Equipos / Detalle</p>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)" }}>{equipment.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}><X size={16} /></button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "linear-gradient(135deg,var(--eco-primary-50),#F8FFFB)", border: "1px solid var(--eco-primary-200)", borderRadius: "var(--eco-radius-xl)", padding: 18 }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>Fórmula usada</p>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-900)" }}>kWh/mes = (W × horasMes × cantidad) / 1000</span>
              <span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-900)" }}>CO₂e = kWh × EF</span>
            </div>
          </div>

          {equipment.category !== "electricidad" ? (
            <div style={{ background: "var(--eco-warning-bg)", border: "1px solid #FDE68A", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Info size={15} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>Cálculo disponible próximamente</p>
                <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.5 }}>
                  Este registro se conserva en inventario, pero el cálculo para combustible se habilitará cuando exista el modelo de litros/hora.
                </p>
              </div>
            </div>
          ) : null}

          <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden" }}>
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
              <div key={label} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, borderBottom: index < all.length - 1 ? "1px solid var(--eco-gray-100)" : "none" }}>
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{label}</span>
                <span style={{ fontFamily: label === "CO₂e estimado" || label === "kWh/mes" ? fm : fb, fontSize: 12, fontWeight: 700, color: "var(--eco-gray-700)", textAlign: "right", lineHeight: 1.5 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: usingFallbackFactor ? "var(--eco-warning-bg)" : "var(--eco-info-bg)", border: `1px solid ${usingFallbackFactor ? "#FDE68A" : "#BFDBFE"}`, borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Info size={15} style={{ color: usingFallbackFactor ? "var(--eco-warning)" : "var(--eco-info)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>{usingFallbackFactor ? "Factor no configurado" : "Factor aplicado"}</p>
              <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.5 }}>
                {usingFallbackFactor ? "Se usa un valor de ejemplo para mantener el preview disponible." : factorSourceLabel}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <Field label="Mes del registro estimado">
              <input type="month" value={monthValue} onChange={(event) => onGenerate("draft-month", event.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={onEdit} style={secondaryButtonStyle}>
                <Pencil size={14} />
                Editar
              </button>
              <button type="button" onClick={() => onGenerate("confirm")} style={{ ...primaryButtonStyle, opacity: equipment.category === "electricidad" ? 1 : 0.7 }} disabled={equipment.category !== "electricidad"}>
                <Leaf size={14} />
                Generar registro estimado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseFormData(formElement, currentForm) {
  const formData = new FormData(formElement);
  return {
    id: currentForm.id || "",
    campusCode: String(formData.get("campusCode") || ""),
    areaCode: String(formData.get("areaCode") || ""),
    name: String(formData.get("name") || ""),
    category: String(formData.get("category") || "electricidad"),
    type: String(formData.get("type") || "it"),
    quantity: Number(formData.get("quantity") || 0),
    powerW: Number(formData.get("powerW") || 0),
    usage: {
      hoursPerDay: Number(formData.get("hoursPerDay") || 0),
      daysPerWeek: Number(formData.get("daysPerWeek") || 0),
      weeksPerMonth: Number(formData.get("weeksPerMonth") || 0),
    },
    notes: String(formData.get("notes") || ""),
    isActive: String(formData.get("isActive")) === "true",
  };
}

function validateEquipmentForm(payload) {
  const errors = {};
  if (!payload.name.trim()) errors.name = "Escribe un nombre.";
  if (!payload.campusCode.trim()) errors.campusCode = "Indica el campus.";
  if (!payload.areaCode.trim()) errors.areaCode = "Selecciona un área.";
  if (payload.quantity < 0 || !Number.isFinite(payload.quantity)) errors.quantity = "Debe ser un número válido.";
  if (payload.category === "electricidad" && (payload.powerW < 0 || !Number.isFinite(payload.powerW))) errors.powerW = "Debe ser un número válido.";
  if (payload.usage.hoursPerDay < 0 || !Number.isFinite(payload.usage.hoursPerDay)) errors.hoursPerDay = "Debe ser un número válido.";
  if (payload.usage.daysPerWeek < 0 || !Number.isFinite(payload.usage.daysPerWeek)) errors.daysPerWeek = "Debe ser un número válido.";
  if (payload.usage.weeksPerMonth < 0 || !Number.isFinite(payload.usage.weeksPerMonth)) errors.weeksPerMonth = "Debe ser un número válido.";
  return errors;
}

export default function EquipmentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoverRow, setHoverRow] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
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

  const loadEquipment = useCallback(() => {
    try {
      setLoading(true);
      setError("");
      setItems(getAll());
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

  const defaultFactor = useMemo(() => getDefaultElectricityFactor(), [items]);
  const factorValue = defaultFactor?.value ?? DEMO_FACTOR;
  const usingFallbackFactor = !defaultFactor;
  const factorSourceLabel = defaultFactor
    ? `Factor predeterminado de electricidad: ${defaultFactor.provider || defaultFactor.region || "Configurado"}`
    : "Factor no configurado (usa valor de ejemplo).";

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

  const activeFilterCount = [
    filters.search,
    filters.areaCode !== "all" ? filters.areaCode : "",
    filters.type !== "all" ? filters.type : "",
    filters.category !== "all" ? filters.category : "",
    !filters.onlyActive ? "all" : "",
  ].filter(Boolean).length;

  const openCreate = () => {
    setModalState({
      equipment: null,
      form: emptyForm(),
      errors: {},
      saving: false,
    });
  };

  const openEdit = (equipment) => {
    setModalState({
      equipment,
      form: emptyForm(equipment),
      errors: {},
      saving: false,
    });
  };

  const closeModal = () => setModalState(null);

  const openDetail = (equipment) => {
    setDetailState({
      equipment,
      factorValue,
      factorSourceLabel,
      usingFallbackFactor,
      monthValue: monthFieldValue(),
    });
  };

  const closeDetail = () => setDetailState(null);

  const persistModal = (event) => {
    event.preventDefault();
    if (!modalState) return;
    const payload = parseFormData(event.currentTarget, modalState.form);
    const errors = validateEquipmentForm(payload);
    if (Object.keys(errors).length > 0) {
      setModalState((prev) => ({ ...prev, errors }));
      return;
    }

    setModalState((prev) => ({ ...prev, saving: true, errors: {} }));
    try {
      const result = upsert(payload);
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

  const toggleActive = (equipment) => {
    const next = deactivate(equipment.id, !equipment.isActive);
    setItems(next);
    setToast({ title: "Estado actualizado", message: equipment.isActive ? "Equipo desactivado." : "Equipo activado." });
    if (detailState?.equipment?.id === equipment.id) {
      const refreshed = next.find((item) => item.id === equipment.id);
      if (refreshed) openDetail(refreshed);
    }
  };

  const handleDuplicate = (equipment) => {
    const result = duplicate(equipment.id);
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
      onConfirm: () => {
        const record = buildEstimatedRecord(detailState.equipment, {
          factor: detailState.factorValue,
          factorId: defaultFactor?.id || null,
          dateISO: recordDate,
        });
        appendEstimatedRecord(record);
        setConfirmModal(null);
        setToast({ title: "Registro estimado generado", message: `${detailState.equipment.name} · ${numberFormat(record.value, 2)} kWh` });
      },
    });
  };

  return (
    <>
      <style>{PAGE_ANIMATIONS}</style>
      <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        <div className="ct-equipment-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
          <div style={{ animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 22px rgba(34,197,94,.18)" }}>
                <Monitor size={18} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontFamily: fd, fontSize: 26, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>Equipos</h1>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>
                  Gestiona el inventario para estimar consumo eléctrico por área cuando no hay medición directa.
                </p>
              </div>
            </div>
          </div>

          <div className="ct-equipment-toolbar" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 80ms both" }}>
            <button type="button" onClick={() => setToast({ title: "Importación próximamente", message: "La interfaz queda preparada para conectar importación futura." })} style={secondaryButtonStyle}>
              <Upload size={14} />
              Importar
            </button>
            <button type="button" onClick={exportCsv} style={secondaryButtonStyle}>
              <Download size={14} />
              Exportar CSV
            </button>
            <button type="button" onClick={openCreate} style={primaryButtonStyle}>
              <Plus size={14} />
              Nuevo equipo
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 18, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 110ms both", background: usingFallbackFactor ? "linear-gradient(135deg,var(--eco-warning-bg),#FFFDF2)" : "linear-gradient(135deg,var(--eco-info-bg),#F8FBFF)", border: `1px solid ${usingFallbackFactor ? "#FDE68A" : "#BFDBFE"}`, borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: usingFallbackFactor ? "var(--eco-warning)" : "var(--eco-info)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{usingFallbackFactor ? "Factor no configurado" : "Factor listo para cálculo"}</p>
            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.5 }}>
              {usingFallbackFactor ? "Factor no configurado (usa valor de ejemplo)." : factorSourceLabel}
            </p>
          </div>
        </div>

        {error ? (
          <div style={{ marginBottom: 18, animation: "ctFadeUp .3s ease-out", background: "var(--eco-danger-bg)", border: "1px solid #FECACA", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} style={{ color: "var(--eco-danger)" }} />
              <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)" }}>{error}</span>
            </div>
            <button type="button" onClick={loadEquipment} style={secondaryButtonStyle}>Reintentar</button>
          </div>
        ) : null}

        <SectionLabel icon={<Filter size={14} />} delay={140}>Filtros</SectionLabel>
        <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", marginBottom: 20, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 160ms both" }}>
          <button type="button" onClick={() => setFiltersOpen((prev) => !prev)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: filtersOpen ? "1px solid var(--eco-gray-100)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-700)" }}>Refina el inventario</span>
              {activeFilterCount > 0 ? <span style={{ minWidth: 18, height: 18, borderRadius: "var(--eco-radius-full)", background: "var(--eco-primary-100)", color: "var(--eco-primary-700)", fontFamily: fm, fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 5px" }}>{activeFilterCount}</span> : null}
            </div>
            <ChevronDown size={16} style={{ color: "var(--eco-gray-400)", transform: filtersOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }} />
          </button>

          {filtersOpen ? (
            <div style={{ padding: 16 }}>
              <div className="ct-equipment-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(4,minmax(0,1fr))", gap: 12 }}>
                <Field label="Buscar">
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "var(--eco-gray-400)" }} />
                    <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} style={{ ...inputStyle, paddingLeft: 34 }} placeholder="Nombre o notas" />
                  </div>
                </Field>
                <Field label="Área">
                  <select value={filters.areaCode} onChange={(event) => setFilters((prev) => ({ ...prev, areaCode: event.target.value }))} style={inputStyle}>
                    <option value="all">Todas</option>
                    {EQUIPMENT_AREA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo">
                  <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))} style={inputStyle}>
                    <option value="all">Todos</option>
                    {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Categoría">
                  <select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))} style={inputStyle}>
                    <option value="all">Todas</option>
                    {EQUIPMENT_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Activos">
                  <div style={{ display: "flex", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-md)", overflow: "hidden", height: 40 }}>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, onlyActive: true }))} style={segmentedButtonStyle(filters.onlyActive)}>Activos</button>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, onlyActive: false }))} style={segmentedButtonStyle(!filters.onlyActive)}>Todos</button>
                  </div>
                </Field>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setFilters({ search: "", areaCode: "all", type: "all", category: "all", onlyActive: true })} style={secondaryButtonStyle}>
                  <RotateCcw size={13} />
                  Limpiar filtros
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <SectionLabel icon={<Zap size={14} />} delay={180}>Resumen</SectionLabel>
        <div className="ct-equipment-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 20 }}>
          <KpiCard icon={<Monitor size={18} />} title="Equipos activos" value={numberFormat(summary.activeCount, 0)} unit="" sub="Conteo según filtros" delay={200} tone="green" />
          <KpiCard icon={<Zap size={18} />} title="kWh estimados / mes" value={numberFormat(summary.totalKwh, 2)} unit="kWh" sub="Solo equipos eléctricos filtrados" delay={260} tone="blue" />
          <KpiCard icon={<Leaf size={18} />} title="CO₂e estimado / mes" value={numberFormat(summary.totalCo2eT, 4)} unit="tCO₂e" sub={usingFallbackFactor ? "Usa factor demo mientras no se configure uno real." : "Calculado con factor eléctrico predeterminado."} delay={320} tone="yellow" />
          <KpiCard icon={<Building2 size={18} />} title="Top área por consumo" value={summary.topArea ? summary.topArea.label : "—"} unit="" sub={summary.topArea ? `${numberFormat(summary.topArea.value, 2)} kWh/mes` : "Sin datos con los filtros actuales"} delay={380} tone="gray" />
        </div>

        <SectionLabel icon={<Calculator size={14} />} delay={220}>Inventario</SectionLabel>
        {loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", padding: "50px 24px", textAlign: "center", animation: "ctFadeUp .4s ease-out" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--eco-gray-100)", color: "var(--eco-gray-400)" }}>
              <FileX size={28} />
            </div>
            <p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin resultados</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", maxWidth: 360, marginInline: "auto", lineHeight: 1.55 }}>
              No hay equipos con estos filtros. Agrega un equipo para comenzar.
            </p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 240ms both" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--eco-gray-50)", borderBottom: "1px solid var(--eco-gray-200)" }}>
                    {["Área", "Equipo", "Tipo", "Cantidad", "Potencia (W)", "Uso", "kWh/mes", "CO₂e/mes", "Estado", "Acciones"].map((label) => (
                      <th key={label} style={{ padding: "11px 12px", textAlign: "left", fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{label}</th>
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
                          borderBottom: index < filtered.length - 1 ? "1px solid var(--eco-gray-100)" : "none",
                          background: hoverRow === equipment.id ? "var(--eco-gray-50)" : "white",
                          transition: "background 140ms",
                          animation: `ctFadeUp .24s ease-out ${Math.min(index * 28, 240)}ms both`,
                        }}
                        onMouseEnter={() => setHoverRow(equipment.id)}
                        onMouseLeave={() => setHoverRow(null)}
                      >
                        <td style={{ padding: "12px", color: "var(--eco-gray-700)", fontWeight: 600 }}>{getAreaLabel(equipment.areaCode)}</td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>{equipment.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <Badge tone="info">Estimación</Badge>
                              {equipment.category !== "electricidad" ? <Badge tone="warning">Próximamente</Badge> : null}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px", color: "var(--eco-gray-600)" }}>{getTypeLabel(equipment.type)}</td>
                        <td style={{ padding: "12px", fontFamily: fm, color: "var(--eco-gray-700)" }}>{numberFormat(equipment.quantity, 0)}</td>
                        <td style={{ padding: "12px", fontFamily: fm, color: "var(--eco-gray-700)" }}>{numberFormat(equipment.powerW, 1)}</td>
                        <td style={{ padding: "12px", color: "var(--eco-gray-600)" }}>{`${numberFormat(equipment.usage.hoursPerDay, 1)} h/día · ${numberFormat(equipment.usage.daysPerWeek, 1)} d/sem`}</td>
                        <td style={{ padding: "12px" }}><div style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{numberFormat(kwhMonth, 2)}</div></td>
                        <td style={{ padding: "12px" }}><div style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-gray-800)" }}>{numberFormat(co2eMonth.co2eT, 4)} t</div></td>
                        <td style={{ padding: "12px" }}>{equipment.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="warning">Inactivo</Badge>}</td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <IconActionButton label="Ver" onClick={() => openDetail(equipment)} icon={<Eye size={14} />} />
                            <IconActionButton label="Editar" onClick={() => openEdit(equipment)} icon={<Pencil size={14} />} />
                            <IconActionButton label="Duplicar" onClick={() => handleDuplicate(equipment)} icon={<Copy size={14} />} />
                            <IconActionButton label={equipment.isActive ? "Desactivar" : "Activar"} onClick={() => toggleActive(equipment)} icon={<Power size={14} />} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
