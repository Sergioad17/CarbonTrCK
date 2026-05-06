import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Info,
  Layers,
  Pencil,
  Plus,
  Power,
  Save,
  Settings,
  X,
  Zap,
} from "lucide-react";
import {
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
} from "../api/equipment";

/* ─── Design tokens ─── */
const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

/* ─── Base input ─── */
const inBase = {
  width: "100%",
  height: 36,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 12px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg, var(--eco-card))",
  transition: "border-color .18s ease, box-shadow .18s ease",
};

/* ─── Focus / blur ─── */
const onFocus = (e) => {
  e.currentTarget.style.borderColor = "var(--eco-primary-400)";
  e.currentTarget.style.boxShadow = "0 0 0 3px var(--eco-primary-100,rgba(34,197,94,.12))";
};
const onBlur = (e) => {
  e.currentTarget.style.borderColor = "var(--eco-border)";
  e.currentTarget.style.boxShadow = "none";
};

/* ─── Shimmer skeleton ─── */
function Sk({ w, h, r, delay, style: ext }) {
  return (
    <div
      style={{
        width: w || "100%",
        height: h || 40,
        borderRadius: r ?? "var(--eco-radius-md)",
        background:
          "linear-gradient(90deg,var(--eco-border) 25%,var(--eco-surface) 50%,var(--eco-border) 75%)",
        backgroundSize: "200% 100%",
        animation: `eco-shimmer 1.4s ease-in-out ${delay || 0}ms infinite`,
        flexShrink: 0,
        ...ext,
      }}
    />
  );
}

/* ─── Modal skeleton ─── */
function ModalSkeleton() {
  const sectionDef = [
    { cols: 3, rows: 2, delay: 0 },
    { cols: 3, rows: 1, delay: 80 },
    { cols: 2, rows: 1, delay: 160 },
  ];
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {sectionDef.map((sec, si) => (
        <div
          key={si}
          style={{
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: "var(--eco-radius-lg)",
            overflow: "hidden",
          }}
        >
          {/* Section header skeleton */}
          <div
            style={{
              padding: "9px 14px",
              borderBottom: "1px solid var(--eco-border)",
              background: "var(--eco-surface)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Sk w={30} h={30} r="var(--eco-radius-md)" delay={sec.delay} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Sk w={120} h={13} delay={sec.delay + 10} />
              <Sk w={190} h={10} delay={sec.delay + 20} />
            </div>
          </div>
          {/* Fields skeleton */}
          <div style={{ padding: "10px 14px" }}>
            {[...Array(sec.rows)].map((_, ri) => (
              <div
                key={ri}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${sec.cols},minmax(0,1fr))`,
                  gap: 10,
                  marginBottom: ri < sec.rows - 1 ? 10 : 0,
                }}
              >
                {[...Array(sec.cols)].map((_, ci) => (
                  <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Sk w="55%" h={11} delay={sec.delay + ri * 40 + ci * 20} />
                    <Sk h={40} delay={sec.delay + ri * 40 + ci * 20 + 12} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Field wrapper ─── */
function Field({ label, error, helper, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontFamily: fb,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--eco-text-soft)",
          textTransform: "uppercase",
          letterSpacing: ".04em",
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--eco-danger)", fontSize: 12 }}>*</span>}
      </span>
      {children}
      {helper && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.4 }}>
          {helper}
        </span>
      )}
      {error && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)", fontWeight: 600 }}>
          {error}
        </span>
      )}
    </label>
  );
}

/* ─── Section block ─── */
function Section({ icon: Icon, iconBg, iconColor, title, subtitle, children, delay }) {
  return (
    <div
      style={{
        background: "var(--eco-card)",
        border: "1px solid var(--eco-border)",
        borderRadius: "var(--eco-radius-lg)",
        overflow: "hidden",
        animation: `eco-fadeInUp .26s ease ${delay || 0}ms both`,
      }}
    >
      <div
        style={{
          padding: "11px 16px",
          borderBottom: "1px solid var(--eco-border)",
          background: "var(--eco-surface)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--eco-radius-md)",
            background: iconBg || "var(--eco-primary-50)",
            color: iconColor || "var(--eco-primary-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={14} />
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong)", lineHeight: 1.2 }}>
            {title}
          </p>
          {subtitle && (
            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.3 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

/* ─── Exported helpers (preserved exactly) ─── */
export const createEmptyEquipmentForm = (item) => ({
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

export function parseEquipmentFormData(formElement, currentForm) {
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

export function validateEquipmentForm(payload) {
  const errors = {};
  if (!payload.name.trim()) errors.name = "Escribe un nombre.";
  if (!payload.campusCode.trim()) errors.campusCode = "Indica el campus.";
  if (!payload.areaCode.trim()) errors.areaCode = "Selecciona un area.";
  if (payload.quantity < 0 || !Number.isFinite(payload.quantity)) errors.quantity = "Debe ser un numero valido.";
  if (payload.category === "electricidad" && (payload.powerW < 0 || !Number.isFinite(payload.powerW))) errors.powerW = "Debe ser un numero valido.";
  if (payload.usage.hoursPerDay < 0 || !Number.isFinite(payload.usage.hoursPerDay)) errors.hoursPerDay = "Debe ser un numero valido.";
  if (payload.usage.daysPerWeek < 0 || !Number.isFinite(payload.usage.daysPerWeek)) errors.daysPerWeek = "Debe ser un numero valido.";
  if (payload.usage.weeksPerMonth < 0 || !Number.isFinite(payload.usage.weeksPerMonth)) errors.weeksPerMonth = "Debe ser un numero valido.";
  return errors;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function EquipmentModal({ state, onClose, onSubmit, onFormChange, areaOptions = [] }) {
  const [ready, setReady] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // Stable key: only changes when the modal opens a different item (not on every form change)
  const modalKey = state ? (state.equipment?.id ?? "__new__") : null;

  useEffect(() => {
    if (!modalKey) { setReady(false); return; }
    setReady(false);
    const t = setTimeout(() => setReady(true), 300);
    const onKey = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [modalKey]);

  if (!state) return null;

  const { form, errors, saving, equipment } = state;
  const isElectric = form.category === "electricidad";
  const isEdit = Boolean(equipment);
  const availableAreaOptions = areaOptions;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        display: "grid",
        placeItems: "center",
        padding: "16px 14px",
        animation: "eco-fadeIn .18s ease-out",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--eco-overlay)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "min(94vw, 780px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          overflowX: "hidden",
          background: "var(--eco-card)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "0 28px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.05)",
          border: "1px solid var(--eco-border)",
          animation: "eco-scaleIn .24s cubic-bezier(.34,1.56,.64,1)",
          display: "flex",
          flexDirection: "column",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--eco-border) transparent",
        }}
      >
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>

          {/* ─── Header ─── */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              padding: "14px 20px",
              borderBottom: "1px solid var(--eco-border)",
              background: "var(--eco-card)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--eco-radius-md)",
                  background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isEdit ? <Pencil size={16} /> : <Plus size={16} />}
              </div>
              <div>
                <p
                  style={{
                    margin: "0 0 2px",
                    fontFamily: fb,
                    fontSize: 11,
                    color: "var(--eco-text-soft)",
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    fontWeight: 600,
                  }}
                >
                  Catálogos / Equipos / {isEdit ? "Editar" : "Nuevo"}
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: fd,
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--eco-text-strong)",
                    lineHeight: 1.2,
                  }}
                >
                  {isEdit ? "Editar equipo" : "Nuevo equipo"}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--eco-radius-md)",
                border: "1px solid var(--eco-border)",
                background: "var(--eco-card)",
                color: "var(--eco-text-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--eco-danger-bg)";
                e.currentTarget.style.color = "var(--eco-danger)";
                e.currentTarget.style.borderColor = "rgba(248,113,113,.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--eco-card)";
                e.currentTarget.style.color = "var(--eco-text-soft)";
                e.currentTarget.style.borderColor = "var(--eco-border)";
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* ─── Body ─── */}
          {!ready ? (
            <ModalSkeleton />
          ) : (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* ── SECTION 1: Identificación ── */}
              <Section
                icon={Layers}
                iconBg="var(--eco-primary-50)"
                iconColor="var(--eco-primary-600)"
                title="Identificación del equipo"
                subtitle="Datos básicos de ubicación, tipo y cantidad."
                delay={0}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                  <Field label="Nombre del equipo" error={errors.name} required>
                    <input
                      name="name"
                      defaultValue={form.name}
                      placeholder="Ej. PC de escritorio"
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={inBase}
                    />
                  </Field>
                  <Field label="Campus" error={errors.campusCode}>
                    <input
                      name="campusCode"
                      defaultValue={form.campusCode}
                      placeholder="CAMPUS-CT"
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={inBase}
                    />
                  </Field>
                  <Field label="Área" error={errors.areaCode}>
                    <select
                      name="areaCode"
                      defaultValue={form.areaCode}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {availableAreaOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tipo de equipo" error={errors.type}>
                    <select
                      name="type"
                      defaultValue={form.type}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {EQUIPMENT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Categoría" error={errors.category}>
                    <select
                      name="category"
                      value={form.category}
                      onChange={(e) => onFormChange((p) => ({ ...p, category: e.target.value }))}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {EQUIPMENT_CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cantidad de unidades" error={errors.quantity}>
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={form.quantity}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={inBase}
                    />
                  </Field>
                </div>
              </Section>

              {/* ── SECTION 2: Consumo eléctrico ── */}
              <Section
                icon={Zap}
                iconBg="var(--eco-warning-bg)"
                iconColor="var(--eco-warning)"
                title="Parámetros de consumo"
                subtitle={
                  isElectric
                    ? "kWh/mes = (W × horas/día × días/sem × sem/mes × cantidad) ÷ 1 000"
                    : "Combustible: inventario disponible; algunos parámetros requieren datos adicionales del equipo."
                }
                delay={60}
              >
                {!isElectric && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: "var(--eco-radius-md)",
                      background: "var(--eco-warning-bg)",
                      border: "1px solid rgba(251,191,36,.3)",
                      marginBottom: 12,
                    }}
                  >
                    <Info size={14} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ margin: 0, fontFamily: fd, fontSize: 12, fontWeight: 700, color: "var(--eco-text-strong)" }}>
                        Combustible: parámetros pendientes de integración
                      </p>
                      <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.5 }}>
                        El inventario ya puede registrarse. Los parámetros específicos de combustible requieren un endpoint dedicado.
                      </p>
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                  <Field
                    label="Potencia (W)"
                    error={errors.powerW}
                    helper={isElectric ? "Por unidad." : "No aplica."}
                  >
                    <div style={{ position: "relative" }}>
                      <input
                        name="powerW"
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={form.powerW}
                        disabled={!isElectric}
                        onFocus={isElectric ? onFocus : undefined}
                        onBlur={isElectric ? onBlur : undefined}
                        style={{
                          ...inBase,
                          paddingRight: 30,
                          opacity: isElectric ? 1 : 0.5,
                          cursor: isElectric ? "text" : "not-allowed",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 9,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontFamily: fm,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      >
                        W
                      </span>
                    </div>
                  </Field>
                  <Field label="Horas / día" error={errors.hoursPerDay}>
                    <div style={{ position: "relative" }}>
                      <input
                        name="hoursPerDay"
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={form.hoursPerDay}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{ ...inBase, paddingRight: 32 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontFamily: fm,
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      >
                        h/d
                      </span>
                    </div>
                  </Field>
                  <Field label="Días / semana" error={errors.daysPerWeek}>
                    <div style={{ position: "relative" }}>
                      <input
                        name="daysPerWeek"
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={form.daysPerWeek}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{ ...inBase, paddingRight: 32 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontFamily: fm,
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      >
                        d/s
                      </span>
                    </div>
                  </Field>
                  <Field label="Semanas / mes" error={errors.weeksPerMonth} helper="Sugerido: 4.3">
                    <div style={{ position: "relative" }}>
                      <input
                        name="weeksPerMonth"
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={form.weeksPerMonth}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{ ...inBase, paddingRight: 32 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontFamily: fm,
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      >
                        s/m
                      </span>
                    </div>
                  </Field>
                </div>
              </Section>

              {/* ── SECTION 3: Estado y notas ── */}
              <Section
                icon={Settings}
                iconBg="var(--eco-success-bg)"
                iconColor="var(--eco-success)"
                title="Estado y notas"
                subtitle="Define si el equipo está operativo y agrega comentarios o supuestos del cálculo."
                delay={120}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Toggle activo/inactivo */}
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontFamily: fb,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--eco-text-soft)",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        marginBottom: 6,
                      }}
                    >
                      Estado del equipo
                    </span>
                    <div
                      style={{
                        display: "inline-flex",
                        border: "1px solid var(--eco-border)",
                        borderRadius: "var(--eco-radius-md)",
                        overflow: "hidden",
                        height: 38,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onFormChange((p) => ({ ...p, isActive: true }))}
                        style={{
                          minWidth: 120,
                          border: "none",
                          borderRight: "1px solid var(--eco-border)",
                          background: form.isActive
                            ? "var(--eco-success-bg)"
                            : "var(--eco-surface)",
                          color: form.isActive ? "var(--eco-success)" : "var(--eco-text-soft)",
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 160ms ease",
                          padding: "0 14px",
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Activo
                      </button>
                      <button
                        type="button"
                        onClick={() => onFormChange((p) => ({ ...p, isActive: false }))}
                        style={{
                          minWidth: 120,
                          border: "none",
                          background: !form.isActive
                            ? "var(--eco-warning-bg)"
                            : "var(--eco-surface)",
                          color: !form.isActive ? "var(--eco-warning)" : "var(--eco-text-soft)",
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 160ms ease",
                          padding: "0 14px",
                        }}
                      >
                        <Power size={13} />
                        Inactivo
                      </button>
                    </div>
                    <input type="hidden" name="isActive" value={String(form.isActive)} readOnly />
                  </div>

                  {/* Notas */}
                  <Field label="Notas y observaciones" error={errors.notes}>
                    <textarea
                      name="notes"
                      defaultValue={form.notes}
                      placeholder="Comentarios, contexto del cálculo o supuestos técnicos..."
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{
                        ...inBase,
                        height: "auto",
                        minHeight: 80,
                        resize: "vertical",
                        padding: "10px 12px",
                        lineHeight: 1.55,
                      }}
                    />
                  </Field>
                </div>
              </Section>

              {/* ── Info banner ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: "var(--eco-radius-md)",
                  background: "var(--eco-primary-50)",
                  border: "1px solid var(--eco-primary-200)",
                  animation: "eco-fadeInUp .26s ease 180ms both",
                }}
              >
                <Activity size={13} style={{ color: "var(--eco-primary-600)", flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-primary-700)", lineHeight: 1.55 }}>
                  <strong>Consumo estimado:</strong> kWh/mes = (W × h/día × d/semana × s/mes × cantidad) ÷ 1 000.
                  Si no hay factor eléctrico configurado, el equipo se guarda sin cálculo de CO₂e asociado.
                </p>
              </div>
            </div>
          )}

          {/* ─── Footer ─── */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 2,
              padding: "12px 20px",
              borderTop: "1px solid var(--eco-border)",
              background: "var(--eco-surface)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.4, maxWidth: 340 }}>
              Los cambios del inventario quedan listos para persistencia remota cuando el endpoint de equipos esté disponible.
            </p>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 38,
                  padding: "0 16px",
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
                  gap: 6,
                  transition: "all 150ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--eco-card-muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--eco-card)"; }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  height: 38,
                  padding: "0 18px",
                  borderRadius: "var(--eco-radius-md)",
                  border: "none",
                  background: saving ? "var(--eco-primary-400)" : "var(--eco-primary-500)",
                  color: "white",
                  fontFamily: fb,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  boxShadow: "0 2px 8px rgba(34,197,94,.25)",
                  transition: "all 160ms ease",
                  minWidth: 160,
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.background = "var(--eco-primary-600)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = saving ? "var(--eco-primary-400)" : "var(--eco-primary-500)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Save size={14} />
                {saving ? "Guardando..." : isEdit ? "Actualizar equipo" : "Crear equipo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
