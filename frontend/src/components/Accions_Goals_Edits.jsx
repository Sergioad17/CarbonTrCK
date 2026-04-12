import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Layers,
  Leaf,
  Link2,
  PauseCircle,
  Tag,
  Target,
  User,
  X,
  Zap,
} from "lucide-react";

/* ─── Design tokens ─── */
const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

/* ─── Base input style (dark-mode aware) ─── */
const inBase = {
  height: 40,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 12px",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg, var(--eco-card))",
  outline: "none",
  width: "100%",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};

/* ─── Status color maps ─── */
const TARGET_STATUS_COLORS = {
  active: { bg: "var(--eco-info-bg)", color: "var(--eco-info)", border: "rgba(59,130,246,.25)" },
  paused: { bg: "var(--eco-card-muted)", color: "var(--eco-text-soft)", border: "var(--eco-border)" },
  completed: { bg: "var(--eco-success-bg)", color: "var(--eco-success)", border: "rgba(34,197,94,.25)" },
};

const ACTION_STATUS_COLORS = {
  planned: { bg: "var(--eco-card-muted)", color: "var(--eco-text-soft)", border: "var(--eco-border)" },
  in_progress: { bg: "var(--eco-info-bg)", color: "var(--eco-info)", border: "rgba(59,130,246,.25)" },
  done: { bg: "var(--eco-success-bg)", color: "var(--eco-success)", border: "rgba(34,197,94,.25)" },
  blocked: { bg: "var(--eco-danger-bg)", color: "var(--eco-danger)", border: "rgba(248,113,113,.25)" },
};

/* ─── Shimmer skeleton primitive ─── */
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

/* ─── Form skeleton ─── */
function FormSkeleton({ isTarget }) {
  const cols = isTarget ? 3 : 3;
  const rows = isTarget ? 4 : 3;

  return (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
      {[...Array(rows)].map((_, row) => (
        <div key={row}>
          {/* Section header skeleton */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sk w={28} h={28} r="var(--eco-radius-md)" delay={row * 50} />
            <Sk w={140} h={14} delay={row * 50 + 15} />
          </div>
          {/* Grid of field skeletons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
              gap: 10,
            }}
          >
            {[...Array(row === rows - 1 ? 1 : cols)].map((_, col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk w="50%" h={11} delay={row * 50 + col * 25} />
                <Sk h={40} delay={row * 50 + col * 25 + 10} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Focus/blur handlers for inputs ─── */
const onFocus = (e) => {
  e.currentTarget.style.borderColor = "var(--eco-primary-400)";
  e.currentTarget.style.boxShadow = "0 0 0 3px var(--eco-primary-100,rgba(34,197,94,.12))";
};
const onBlur = (e) => {
  e.currentTarget.style.borderColor = "var(--eco-border)";
  e.currentTarget.style.boxShadow = "none";
};

/* ─── Field wrapper ─── */
function Field({ label, hint, required, children }) {
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
          gap: 4,
        }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--eco-danger)", fontSize: 12, lineHeight: 1 }}>*</span>
        )}
      </span>
      {children}
      {hint && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.4 }}>
          {hint}
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
        animation: `eco-fadeInUp .28s ease ${delay || 0}ms both`,
      }}
    >
      {/* Section header */}
      <div
        style={{
          padding: "12px 16px",
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
          <p
            style={{
              margin: 0,
              fontFamily: fd,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--eco-text-strong)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </p>
          {subtitle && (
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: fb,
                fontSize: 11,
                color: "var(--eco-text-soft)",
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Section body */}
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

/* ─── Status pill select ─── */
function StatusSelect({ value, onChange, options, colorMap }) {
  const current = colorMap[value] || {};
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          ...inBase,
          appearance: "none",
          WebkitAppearance: "none",
          paddingLeft: 32,
          paddingRight: 32,
          background: current.bg || "var(--eco-card)",
          borderColor: current.border || "var(--eco-border)",
          color: current.color || "var(--eco-text)",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Left dot indicator */}
      <span
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: current.color || "var(--eco-text-soft)",
          pointerEvents: "none",
        }}
      />
      {/* Right chevron */}
      <ChevronRight
        size={13}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)",
          color: current.color || "var(--eco-text-soft)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ─── Shell modal wrapper ─── */
function Shell({ title, subtitle, onClose, onSubmit, submitLabel, children, isLoading }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: "20px 14px",
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

      {/* Form card */}
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(900px, calc(100vw - 28px))",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          background: "var(--eco-card)",
          borderRadius: "var(--eco-radius-xl)",
          border: "1px solid var(--eco-border)",
          boxShadow: "0 28px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)",
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
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                {subtitle}
              </p>
            )}
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
        <div style={{ flex: 1, minHeight: 0 }}>
          {isLoading ? children : children}
        </div>

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
            style={{
              height: 38,
              padding: "0 20px",
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
              gap: 7,
              boxShadow: "0 2px 8px rgba(34,197,94,.25)",
              transition: "all 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--eco-primary-600)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(34,197,94,.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--eco-primary-500)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,.25)";
            }}
          >
            <CheckCircle2 size={14} />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════ */
export default function Accions_Goals_Edits({
  mode,
  editing,
  onClose,
  onSubmit,
  targetForm,
  setTargetForm,
  actionForm,
  setActionForm,
  areas,
  targets,
  creatorName,
}) {
  const [ready, setReady] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mode) return undefined;
    setReady(false);
    const t = setTimeout(() => setReady(true), 280);
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [mode]);

  if (!mode) return null;

  /* ────────────────────────────────────
     TARGET FORM
  ──────────────────────────────────── */
  if (mode === "target") {
    const tf = targetForm;
    const set = (key) => (e) => setTargetForm((p) => ({ ...p, [key]: e.target.value }));

    return (
      <Shell
        title={editing ? "Editar meta" : "Nueva meta de reducción"}
        subtitle={
          editing
            ? "Modifica los datos de la meta seleccionada."
            : "Define un objetivo de reducción de emisiones CO₂e para tu organización."
        }
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel={editing ? "Guardar cambios" : "Crear meta"}
      >
        {!ready ? (
          <FormSkeleton isTarget />
        ) : (
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── SECTION 1: Identificación ── */}
            <Section
              icon={Leaf}
              iconBg="var(--eco-primary-50)"
              iconColor="var(--eco-primary-600)"
              title="Identificación de la meta"
              subtitle="Nombre, tipo, alcance y área de aplicación."
              delay={0}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 10,
                }}
              >
                <Field label="Nombre de la meta" required>
                  <input
                    value={tf.title}
                    onChange={set("title")}
                    placeholder="Ej. Reducir 20% electricidad 2025"
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={inBase}
                  />
                </Field>

                <Field label="Tipo de objetivo">
                  <select
                    value={tf.type}
                    onChange={set("type")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                  >
                    <option value="reduction_percent">Reducción %</option>
                    <option value="absolute">Absoluto tCO₂e</option>
                  </select>
                </Field>

                <Field label="Categoría">
                  <select
                    value={tf.category}
                    onChange={set("category")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="electricidad">Electricidad</option>
                    <option value="combustible">Combustible</option>
                    <option value="otros">Otros</option>
                  </select>
                </Field>

                <Field label="Área de aplicación">
                  <select
                    value={tf.areaId}
                    onChange={set("areaId")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{ ...inBase, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                  >
                    <option value="all">Todas las áreas</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Estado de la meta">
                  <StatusSelect
                    value={tf.status}
                    onChange={set("status")}
                    colorMap={TARGET_STATUS_COLORS}
                    options={[
                      { value: "active", label: "Activa" },
                      { value: "paused", label: "Pausada" },
                      { value: "completed", label: "Completada" },
                    ]}
                  />
                </Field>

                <Field label="Responsable" hint="Creador registrado en el sistema.">
                  <input
                    value={tf.createdBy || creatorName}
                    readOnly
                    style={{
                      ...inBase,
                      background: "var(--eco-surface)",
                      color: "var(--eco-text-soft)",
                      cursor: "default",
                    }}
                  />
                </Field>
              </div>
            </Section>

            {/* ── SECTION 2: Baseline ── */}
            <Section
              icon={BarChart2}
              iconBg="var(--eco-info-bg)"
              iconColor="var(--eco-info)"
              title="Período de referencia (Baseline)"
              subtitle="Define el intervalo histórico y la emisión base para calcular la reducción."
              delay={60}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 10,
                }}
              >
                <Field label="Inicio del baseline">
                  <input
                    type="date"
                    value={tf.baselineStart}
                    onChange={set("baselineStart")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={inBase}
                  />
                </Field>

                <Field label="Fin del baseline">
                  <input
                    type="date"
                    value={tf.baselineEnd}
                    onChange={set("baselineEnd")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={inBase}
                  />
                </Field>

                <Field label="Emisión baseline" hint="tCO₂e registradas en el período base.">
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.001"
                      value={tf.baselineValue}
                      onChange={set("baselineValue")}
                      placeholder="0.000"
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, paddingRight: 52 }}
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
                      tCO₂e
                    </span>
                  </div>
                </Field>
              </div>
            </Section>

            {/* ── SECTION 3: Período objetivo ── */}
            <Section
              icon={Target}
              iconBg="var(--eco-success-bg)"
              iconColor="var(--eco-success)"
              title="Período y valor objetivo"
              subtitle="Define las fechas de vigencia y la meta de reducción a alcanzar."
              delay={120}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 10,
                }}
              >
                <Field label="Inicio del período objetivo">
                  <input
                    type="date"
                    value={tf.targetStart}
                    onChange={set("targetStart")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={inBase}
                  />
                </Field>

                <Field label="Fin del período objetivo">
                  <input
                    type="date"
                    value={tf.targetEnd}
                    onChange={set("targetEnd")}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={inBase}
                  />
                </Field>

                <Field
                  label={tf.type === "reduction_percent" ? "Meta de reducción (%)" : "Meta de reducción (tCO₂e)"}
                  hint={
                    tf.type === "reduction_percent"
                      ? "Porcentaje a reducir respecto al baseline."
                      : "Toneladas absolutas a reducir."
                  }
                >
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.001"
                      value={tf.targetValue}
                      onChange={set("targetValue")}
                      placeholder="0.000"
                      onFocus={onFocus}
                      onBlur={onBlur}
                      style={{ ...inBase, paddingRight: tf.type === "reduction_percent" ? 36 : 52 }}
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
                        color: "var(--eco-primary-600)",
                        pointerEvents: "none",
                      }}
                    >
                      {tf.type === "reduction_percent" ? "%" : "tCO₂e"}
                    </span>
                  </div>
                </Field>
              </div>
            </Section>

            {/* ── SECTION 4: Descripción ── */}
            <Section
              icon={FileText}
              iconBg="var(--eco-warning-bg)"
              iconColor="var(--eco-warning)"
              title="Descripción y contexto"
              subtitle="Agrega observaciones o información adicional sobre la meta."
              delay={180}
            >
              <Field label="Descripción / Observaciones">
                <textarea
                  value={tf.description}
                  onChange={set("description")}
                  placeholder="Describe el contexto de esta meta, estrategia de reducción u observaciones relevantes..."
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{
                    ...inBase,
                    height: 88,
                    resize: "vertical",
                    padding: "10px 12px",
                    lineHeight: 1.55,
                  }}
                />
              </Field>
            </Section>
          </div>
        )}
      </Shell>
    );
  }

  /* ────────────────────────────────────
     ACTION FORM
  ──────────────────────────────────── */
  const af = actionForm;
  const setA = (key) => (e) => setActionForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <Shell
      title={editing ? "Editar acción" : "Nueva acción de reducción"}
      subtitle={editing
        ? "Ajusta los datos de la acción seleccionada sin perder su vínculo con la meta."
        : "Registra una acción concreta vinculada a una meta para rastrear su impacto."}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={editing ? "Guardar cambios" : "Guardar acción"}
    >
      {!ready ? (
        <FormSkeleton isTarget={false} />
      ) : (
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── SECTION 1: Vinculación y nombre ── */}
          <Section
            icon={Link2}
            iconBg="var(--eco-primary-50)"
            iconColor="var(--eco-primary-600)"
            title="Identificación y vinculación"
            subtitle="Asocia esta acción a una meta de reducción y asigna un responsable."
            delay={0}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <Field label="Meta asociada" required>
                <select
                  value={af.targetId}
                  onChange={setA("targetId")}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={{
                    ...inBase,
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                >
                  <option value="">— Selecciona una meta —</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nombre de la acción" required>
                <input
                  value={af.title}
                  onChange={setA("title")}
                  placeholder="Ej. Instalar paneles solares en planta A"
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inBase}
                />
              </Field>

              <Field label="Responsable">
                <div style={{ position: "relative" }}>
                  <User
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
                    value={af.owner}
                    onChange={setA("owner")}
                    placeholder="Nombre del responsable"
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{ ...inBase, paddingLeft: 30 }}
                  />
                </div>
              </Field>
            </div>
          </Section>

          {/* ── SECTION 2: Planificación temporal ── */}
          <Section
            icon={Calendar}
            iconBg="var(--eco-info-bg)"
            iconColor="var(--eco-info)"
            title="Planificación y estado"
            subtitle="Define el cronograma de ejecución y el estado actual de la acción."
            delay={60}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <Field label="Estado de la acción">
                <StatusSelect
                  value={af.status}
                  onChange={setA("status")}
                  colorMap={ACTION_STATUS_COLORS}
                  options={[
                    { value: "planned", label: "Planificada" },
                    { value: "in_progress", label: "En progreso" },
                    { value: "done", label: "Completada" },
                    { value: "blocked", label: "Bloqueada" },
                  ]}
                />
              </Field>

              <Field label="Fecha de inicio">
                <input
                  type="date"
                  value={af.startDate}
                  onChange={setA("startDate")}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inBase}
                />
              </Field>

              <Field label="Fecha de fin">
                <input
                  type="date"
                  value={af.endDate}
                  onChange={setA("endDate")}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inBase}
                />
              </Field>
            </div>
          </Section>

          {/* ── SECTION 3: Impacto y evidencia ── */}
          <Section
            icon={Zap}
            iconBg="var(--eco-success-bg)"
            iconColor="var(--eco-success)"
            title="Impacto y evidencia"
            subtitle="Registra el impacto estimado en CO₂e y la evidencia que lo respalda."
            delay={120}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <Field label="Impacto estimado" hint="Reducción esperada en tCO₂e.">
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.001"
                    value={af.impact_tco2e}
                    onChange={setA("impact_tco2e")}
                    placeholder="0.000"
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{ ...inBase, paddingRight: 52 }}
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
                      color: "var(--eco-success)",
                      pointerEvents: "none",
                    }}
                  >
                    tCO₂e
                  </span>
                </div>
              </Field>

              <Field label="Evidencia" hint="URL, documento o referencia que valide la acción.">
                <input
                  value={af.evidence}
                  onChange={setA("evidence")}
                  placeholder="URL o referencia de respaldo"
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inBase}
                />
              </Field>

              <Field label="Notas adicionales">
                <input
                  value={af.notes}
                  onChange={setA("notes")}
                  placeholder="Comentarios u observaciones breves"
                  onFocus={onFocus}
                  onBlur={onBlur}
                  style={inBase}
                />
              </Field>
            </div>
          </Section>
        </div>
      )}
    </Shell>
  );
}
