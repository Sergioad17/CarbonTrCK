import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Layers,
  Pencil,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Star,
  Tag,
  X,
} from "lucide-react";

/* ─── Design tokens ─── */
const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

/* ─── Exported option constants (unchanged) ─── */
export const scopeOptions = [
  { value: "all", label: "Todos" },
  { value: "scope1", label: "Scope 1" },
  { value: "scope2", label: "Scope 2" },
  { value: "scope3", label: "Scope 3" },
];

export const categoryOptions = [
  { value: "all", label: "Todas" },
  { value: "electricidad", label: "Electricidad" },
  { value: "combustible", label: "Combustible" },
  { value: "otros", label: "Otros" },
];

export const regionOptions = ["MX-SEN", "MX", "Tamaulipas", "Custom"];

/* ─── Exported factory/helpers (unchanged) ─── */
export const createEmptyFactorForm = (factor) => ({
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

export const resolveFactorDenominator = (category, currentValue) => {
  if (category === "electricidad") return "kWh";
  if (category === "combustible") return "L";
  return currentValue || "kWh";
};

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
function ModalSkeleton({ isEdit }) {
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Edit mode selector skeleton */}
      {isEdit && (
        <div
          style={{
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: "var(--eco-radius-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "9px 14px",
              borderBottom: "1px solid var(--eco-border)",
              background: "var(--eco-surface)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sk w={30} h={30} r="var(--eco-radius-md)" />
            <Sk w={140} h={13} delay={10} />
          </div>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Sk h={70} delay={20} />
            <Sk h={70} delay={40} />
          </div>
        </div>
      )}

      {/* Section skeletons */}
      {[
        { cols: 3, rows: 2, delay: 0 },
        { cols: 2, rows: 2, delay: 60 },
        { cols: 2, rows: 1, delay: 120 },
      ].map((sec, si) => (
        <div
          key={si}
          style={{
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: "var(--eco-radius-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "9px 14px",
              borderBottom: "1px solid var(--eco-border)",
              background: "var(--eco-surface)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sk w={30} h={30} r="var(--eco-radius-md)" delay={sec.delay} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Sk w={120} h={13} delay={sec.delay + 10} />
              <Sk w={200} h={10} delay={sec.delay + 20} />
            </div>
          </div>
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
                    <Sk w="50%" h={11} delay={sec.delay + ri * 40 + ci * 20} />
                    <Sk h={40} delay={sec.delay + ri * 40 + ci * 20 + 12} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Toggles skeleton */}
      <div style={{ display: "flex", gap: 10 }}>
        <Sk w={160} h={38} r="var(--eco-radius-md)" delay={180} />
        <Sk w={130} h={38} r="var(--eco-radius-md)" delay={200} />
      </div>
    </div>
  );
}

/* ─── Field wrapper ─── */
function Field({ label, error, hint, required, children }) {
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
      {hint && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.4 }}>
          {hint}
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
      <div style={{ padding: "10px 14px" }}>{children}</div>
    </div>
  );
}

/* ─── Toggle pill (isDefault / isActive) ─── */
function TogglePill({ checked, onChange, icon: Icon, label, activeColor, activeBg, activeBorder }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 34,
        padding: "0 12px",
        borderRadius: "var(--eco-radius-md)",
        border: `1px solid ${checked ? (activeBorder || "var(--eco-primary-200)") : "var(--eco-border)"}`,
        background: checked ? (activeBg || "var(--eco-primary-50)") : "var(--eco-card)",
        color: checked ? (activeColor || "var(--eco-primary-700)") : "var(--eco-text-soft)",
        cursor: "pointer",
        fontFamily: fb,
        fontSize: 12,
        fontWeight: 700,
        transition: "all 160ms ease",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
      />
      {/* Custom checkbox dot */}
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "var(--eco-radius-sm)",
          border: `1.5px solid ${checked ? (activeColor || "var(--eco-primary-500)") : "var(--eco-border)"}`,
          background: checked ? (activeColor || "var(--eco-primary-500)") : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 160ms ease",
        }}
      >
        {checked && <CheckCircle2 size={10} style={{ color: "white" }} />}
      </span>
      <Icon size={13} style={{ color: checked ? (activeColor || "var(--eco-primary-500)") : "var(--eco-text-soft)" }} />
      {label}
    </label>
  );
}

/* ─── Radio option card ─── */
function RadioCard({ active, value, name, onChange, title, description, badge }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        borderRadius: "var(--eco-radius-md)",
        border: `1.5px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
        background: active ? "var(--eco-primary-50)" : "var(--eco-surface)",
        cursor: "pointer",
        transition: "all 180ms ease",
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={onChange}
        style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
      />
      {/* Custom radio */}
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${active ? "var(--eco-primary-500)" : "var(--eco-border)"}`,
          background: active ? "var(--eco-primary-500)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          transition: "all 160ms ease",
        }}
      >
        {active && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "white",
            }}
          />
        )}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: fd,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--eco-text-strong)",
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                padding: "2px 7px",
                borderRadius: "var(--eco-radius-full)",
                background: "var(--eco-success-bg)",
                border: "1px solid rgba(34,197,94,.3)",
                color: "var(--eco-success)",
                fontFamily: fb,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          style={{
            margin: "3px 0 0",
            fontFamily: fb,
            fontSize: 12,
            color: "var(--eco-text-soft)",
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
      </div>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function FactorModal({ state, onClose, onSubmit }) {
  const [ready, setReady] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // Stable key: only changes when a different item is opened, not on every form change
  const modalKey = state ? (state.factor?.id ?? "__new__") : null;

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

  const { factor, form, errors, saving, usageCount } = state;
  const isEdit = Boolean(factor);

  const headerSubtitle = isEdit && form.editMode === "newVersion"
    ? "Crear nueva versión es lo recomendado para mantener trazabilidad histórica."
    : isEdit
      ? "Modifica los valores del factor de emisión existente."
      : "Completa los datos del nuevo factor de emisión CO₂e.";

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

      {/* Modal shell */}
      <div
        style={{
          position: "relative",
          width: "min(96vw, 880px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          overflowX: "hidden",
          background: "var(--eco-card)",
          border: "1px solid var(--eco-border)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "0 28px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.05)",
          animation: "eco-scaleIn .24s cubic-bezier(.34,1.56,.64,1)",
          display: "flex",
          flexDirection: "column",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--eco-border) transparent",
        }}
      >
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
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--eco-radius-md)",
                background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isEdit ? <Pencil size={17} /> : <Plus size={17} />}
            </div>
            <div>
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
                {isEdit ? "Editar factor de emisión" : "Nuevo factor de emisión"}
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: fb,
                  fontSize: 12,
                  color: "var(--eco-text-soft)",
                  lineHeight: 1.4,
                  maxWidth: 500,
                }}
              >
                {headerSubtitle}
              </p>
              {errors.editMode && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontFamily: fb,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--eco-danger)",
                  }}
                >
                  {errors.editMode}
                </p>
              )}
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
        <form onSubmit={onSubmit} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!ready ? (
            <ModalSkeleton isEdit={isEdit} />
          ) : (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* ── Modo de edición (solo en edit) ── */}
              {isEdit && (
                <Section
                  icon={ShieldCheck}
                  iconBg="var(--eco-info-bg)"
                  iconColor="var(--eco-info)"
                  title="Modo de edición"
                  subtitle="Elige cómo aplicar los cambios al factor existente."
                  delay={0}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <RadioCard
                      active={form.editMode === "newVersion"}
                      value="newVersion"
                      name="editMode"
                      onChange={() => state.setForm((p) => ({ ...p, editMode: "newVersion" }))}
                      title="Crear nueva versión"
                      description="Recomendado. Conserva el historial de cálculos y reportes existentes."
                      badge="Recomendado"
                    />
                    <RadioCard
                      active={form.editMode === "edit"}
                      value="edit"
                      name="editMode"
                      onChange={() => state.setForm((p) => ({ ...p, editMode: "edit" }))}
                      title="Editar este registro directamente"
                      description="Úsalo solo si el factor no ha sido utilizado aún, o si confirmas el cambio directo."
                    />

                    {/* Confirmación para edición directa con uso previo */}
                    {usageCount > 0 && form.editMode === "edit" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: "var(--eco-radius-md)",
                          background: "var(--eco-warning-bg)",
                          border: "1px solid rgba(251,191,36,.3)",
                          marginTop: 4,
                          animation: "eco-fadeInUp .2s ease both",
                        }}
                      >
                        <AlertTriangle size={14} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 2 }} />
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.confirmDirectEdit}
                            onChange={(e) =>
                              state.setForm((p) => ({ ...p, confirmDirectEdit: e.target.checked }))
                            }
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text)", lineHeight: 1.5 }}>
                            Confirmo editar directamente un factor ya utilizado en{" "}
                            <strong>{usageCount} registro(s)</strong>. Entiendo que esto puede afectar cálculos previos.
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* ── SECTION 1: Clasificación ── */}
              <Section
                icon={Tag}
                iconBg="var(--eco-primary-50)"
                iconColor="var(--eco-primary-600)"
                title="Clasificación del factor"
                subtitle="Scope, categoría y unidad de denominador del factor de emisión."
                delay={isEdit ? 60 : 0}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                  <Field label="Scope" error={errors.scope} required>
                    <select
                      value={form.scope}
                      onChange={(e) => state.setForm((p) => ({ ...p, scope: e.target.value }))}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {scopeOptions.slice(1).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Categoría" error={errors.category} required>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        state.setForm((p) => ({
                          ...p,
                          category: e.target.value,
                          denominatorUnit: resolveFactorDenominator(e.target.value, p.denominatorUnit),
                        }))
                      }
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {categoryOptions.slice(1).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Unidad denominador" hint="Se asigna automáticamente según la categoría.">
                    <div style={{ position: "relative" }}>
                      <input
                        value={form.denominatorUnit}
                        readOnly
                        style={{
                          ...inBase,
                          background: "var(--eco-surface)",
                          color: "var(--eco-text-soft)",
                          cursor: "default",
                          paddingLeft: 36,
                        }}
                      />
                      <Layers
                        size={13}
                        style={{
                          position: "absolute",
                          left: 11,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </Field>
                </div>
              </Section>

              {/* ── SECTION 2: Valores del factor ── */}
              <Section
                icon={BarChart2}
                iconBg="var(--eco-success-bg)"
                iconColor="var(--eco-success)"
                title="Valores del factor"
                subtitle="Valor EF, incertidumbre, región y proveedor de la fuente."
                delay={isEdit ? 120 : 60}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                  <Field label="Valor EF (tCO₂e)" error={errors.value} required>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={form.value}
                        onChange={(e) => state.setForm((p) => ({ ...p, value: e.target.value }))}
                        placeholder="0.0000"
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{ ...inBase, paddingRight: 50 }}
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
                          color: "var(--eco-success)",
                          pointerEvents: "none",
                        }}
                      >
                        tCO₂e
                      </span>
                    </div>
                  </Field>

                  <Field
                    label="Incertidumbre (%)"
                    error={errors.uncertaintyPct}
                    hint="Variabilidad porcentual estimada."
                  >
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.uncertaintyPct}
                        onChange={(e) => state.setForm((p) => ({ ...p, uncertaintyPct: e.target.value }))}
                        placeholder="Ej. 5.0"
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{ ...inBase, paddingRight: 28 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontFamily: fm,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      >
                        %
                      </span>
                    </div>
                  </Field>

                  <Field label="Región" error={errors.region}>
                    <select
                      value={form.region}
                      onChange={(e) => state.setForm((p) => ({ ...p, region: e.target.value }))}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                    >
                      {regionOptions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </Field>

                  {form.region === "Custom" && (
                    <Field label="Región personalizada" error={errors.customRegion}>
                      <input
                        value={form.customRegion}
                        onChange={(e) => state.setForm((p) => ({ ...p, customRegion: e.target.value }))}
                        placeholder="Escribe el nombre de la región"
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={inBase}
                      />
                    </Field>
                  )}

                  <Field label="Proveedor / Fuente" error={errors.provider}>
                    <input
                      value={form.provider}
                      onChange={(e) => state.setForm((p) => ({ ...p, provider: e.target.value }))}
                      placeholder="Ej. SENER, CFE, IPCC..."
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={inBase}
                    />
                  </Field>
                </div>
              </Section>

              {/* ── SECTION 3: Vigencia y fuente ── */}
              <Section
                icon={Calendar}
                iconBg="var(--eco-info-bg)"
                iconColor="var(--eco-info)"
                title="Vigencia y fuente de datos"
                subtitle="Período de validez del factor y referencia documental de respaldo."
                delay={isEdit ? 180 : 120}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                  <Field label="Vigente desde" error={errors.validFrom}>
                    <input
                      type="date"
                      value={form.validFrom}
                      onChange={(e) => state.setForm((p) => ({ ...p, validFrom: e.target.value }))}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={inBase}
                    />
                  </Field>
                  <Field label="Vigente hasta" error={errors.validTo} hint="Deja vacío si no tiene fecha de vencimiento.">
                    <input
                      type="date"
                      value={form.validTo}
                      onChange={(e) => state.setForm((p) => ({ ...p, validTo: e.target.value }))}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={inBase}
                    />
                  </Field>
                  <Field label="Fuente (URL)" error={errors.sourceUrl}>
                    <div style={{ position: "relative" }}>
                      <Globe
                        size={13}
                        style={{
                          position: "absolute",
                          left: 11,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--eco-text-soft)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        value={form.sourceUrl}
                        onChange={(e) => state.setForm((p) => ({ ...p, sourceUrl: e.target.value }))}
                        placeholder="https://..."
                        onFocus={onFocus}
                        onBlur={onBlur}
                        style={{ ...inBase, paddingLeft: 30 }}
                      />
                    </div>
                  </Field>
                </div>
              </Section>

              {/* ── SECTION 4: Notas ── */}
              <Section
                icon={FileText}
                iconBg="var(--eco-warning-bg)"
                iconColor="var(--eco-warning)"
                title="Notas y observaciones"
                subtitle="Información adicional, contexto o supuestos del factor."
                delay={isEdit ? 240 : 180}
              >
                <Field label="Observaciones" error={errors.notes}>
                  <textarea
                    value={form.notes}
                    onChange={(e) => state.setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Describe el contexto, fuente de verificación u observaciones relevantes sobre este factor..."
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{
                      ...inBase,
                      height: "auto",
                      minHeight: 68,
                      resize: "vertical",
                      padding: "10px 12px",
                      lineHeight: 1.55,
                    }}
                  />
                </Field>
              </Section>

              {/* ── Toggles: Predeterminado / Activo ── */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  animation: `eco-fadeInUp .26s ease ${isEdit ? 300 : 240}ms both`,
                }}
              >
                <TogglePill
                  checked={form.isDefault}
                  onChange={(e) => state.setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                  icon={Star}
                  label="Predeterminado"
                  activeColor="var(--eco-primary-700)"
                  activeBg="var(--eco-primary-50)"
                  activeBorder="var(--eco-primary-200)"
                />
                <TogglePill
                  checked={form.isActive}
                  onChange={(e) => state.setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  icon={Power}
                  label="Factor activo"
                  activeColor="var(--eco-success)"
                  activeBg="var(--eco-success-bg)"
                  activeBorder="rgba(34,197,94,.3)"
                />
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
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
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
                padding: "0 20px",
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
                minWidth: 170,
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.background = "var(--eco-primary-600)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(34,197,94,.35)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = saving ? "var(--eco-primary-400)" : "var(--eco-primary-500)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,.25)";
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
