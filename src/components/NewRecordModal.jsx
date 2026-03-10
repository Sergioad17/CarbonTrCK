import { useEffect, useMemo, useState } from "react";
import {
  X, Zap, Flame, CheckCircle2, AlertTriangle, Calendar, Building2,
  FileText, Beaker, Calculator, Leaf, Save, Info, ChevronDown,
  AlertCircle, Loader2, Droplets, Fuel, ImagePlus, Trash2
} from "lucide-react";



const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const AREAS = [
  { value: "CC 1", label: "Centro de Cómputo 1", icon: "💻" },
  { value: "CC 2", label: "Centro de Cómputo 2", icon: "💻" },
  { value: "Aulas", label: "Aulas", icon: "🏫" },
  { value: "Redes", label: "Taller de Redes", icon: "🌐" },
  { value: "Industrial", label: "Taller Industrial", icon: "🏭" },
  { value: "Agrícola", label: "Innovación Agrícola", icon: "🌿" },
  { value: "Admin", label: "Administración", icon: "🏢" },
  { value: "Otros", label: "Otros", icon: "📍" },
];

const SOURCES = [
  { value: "Recibo", label: "Recibo CFE" },
  { value: "Medición", label: "Medición directa" },
  { value: "Encuesta", label: "Encuesta" },
  { value: "Inventario", label: "Inventario" },
  { value: "Estimación", label: "Estimación" },
];

const DEFAULT_FACTORS = {
  electricidad: 0.435,
  combustible: 2.68,
};

/* ─── Reusable styled input ─── */
function EcoInput({ type = "text", value, onChange, placeholder, hasError, mono, icon, unit, inputMode, ...rest }) {
  const [focused, setFocused] = useState(false);
  const bc = hasError ? "var(--eco-danger)" : focused ? "var(--eco-primary-500)" : "var(--eco-gray-300)";
  const ring = hasError ? "0 0 0 2px rgba(220,38,38,0.08)" : focused ? "0 0 0 2px rgba(34,197,94,0.10)" : "none";

  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{
          position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          color: focused ? "var(--eco-primary-500)" : "var(--eco-gray-400)",
          display: "flex", pointerEvents: "none", transition: "color 150ms",
        }}>{icon}</span>
      )}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        inputMode={inputMode}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", height: 40,
          padding: `0 ${unit ? 48 : 12}px 0 ${icon ? 36 : 12}px`,
          borderRadius: "var(--eco-radius-md)",
          border: `1px solid ${bc}`,
          background: "white",
          fontFamily: mono ? fm : fb,
          fontSize: mono ? 14 : 14,
          color: "var(--eco-gray-800)",
          outline: "none",
          transition: "all 150ms ease-out",
          boxShadow: ring,
        }}
        {...rest}
      />
      {unit && (
        <span style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          fontFamily: fm, fontSize: 12, color: "var(--eco-gray-400)", pointerEvents: "none",
        }}>{unit}</span>
      )}
    </div>
  );
}

/* ─── Reusable styled select ─── */
function EcoSelect({ value, onChange, options, hasError, icon, placeholder }) {
  const [focused, setFocused] = useState(false);
  const bc = hasError ? "var(--eco-danger)" : focused ? "var(--eco-primary-500)" : "var(--eco-gray-300)";

  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{
          position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          color: focused ? "var(--eco-primary-500)" : "var(--eco-gray-400)",
          display: "flex", pointerEvents: "none", transition: "color 150ms", zIndex: 1,
        }}>{icon}</span>
      )}
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", height: 40,
          padding: `0 32px 0 ${icon ? 36 : 12}px`,
          borderRadius: "var(--eco-radius-md)",
          border: `1px solid ${bc}`,
          background: "white",
          fontFamily: fb, fontSize: 14,
          color: value ? "var(--eco-gray-800)" : "var(--eco-gray-400)",
          appearance: "none", outline: "none", cursor: "pointer",
          transition: "all 150ms ease-out",
          boxShadow: focused ? "0 0 0 2px rgba(34,197,94,0.10)" : "none",
        }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
      <ChevronDown size={15} style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        color: "var(--eco-gray-400)", pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Field wrapper ─── */
function Field({ label, required, error, helper, children }) {
  return (
    <div>
      {label && (
        <label style={{
          fontFamily: fb, fontSize: 13, fontWeight: 600,
          color: "var(--eco-gray-700)",
          display: "flex", alignItems: "center", gap: 4,
          marginBottom: 6,
        }}>
          {label}
          {required && <span style={{ color: "var(--eco-danger)", fontSize: 11 }}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <p style={{
          fontFamily: fb, fontSize: 12, color: "var(--eco-danger)",
          margin: "5px 0 0", display: "flex", alignItems: "center", gap: 4,
          animation: "eco-fadeInUp 0.2s ease-out",
        }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {!error && helper && (
        <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: "5px 0 0" }}>
          {helper}
        </p>
      )}
    </div>
  );
}

/* ─── Section divider ─── */
function Section({ title, icon, children }) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 14, paddingBottom: 10,
        borderBottom: "1px solid var(--eco-gray-100)",
      }}>
        {icon && (
          <div style={{
            width: 28, height: 28, borderRadius: "var(--eco-radius-sm)",
            background: "var(--eco-primary-50)", color: "var(--eco-primary-600)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{icon}</div>
        )}
        <span style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ─── Scope selector card ─── */
function ScopeCard({ active, icon, label, desc, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        borderRadius: "var(--eco-radius-md)",
        cursor: "pointer", outline: "none", textAlign: "left",
        border: active ? `1.5px solid ${color}` : "1px solid var(--eco-gray-200)",
        background: active ? `${color}08` : hovered ? "var(--eco-gray-50)" : "white",
        transition: "all 180ms ease-out",
        transform: active ? "scale(1)" : hovered ? "scale(1.01)" : "scale(1)",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "var(--eco-radius-md)",
        background: active ? `${color}15` : "var(--eco-gray-100)",
        color: active ? color : "var(--eco-gray-400)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 180ms",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: fb, fontSize: 14, fontWeight: 600, margin: 0,
          color: active ? "var(--eco-gray-800)" : "var(--eco-gray-600)",
        }}>{label}</p>
        <p style={{
          fontFamily: fb, fontSize: 11, margin: "1px 0 0",
          color: "var(--eco-gray-400)",
        }}>{desc}</p>
      </div>
      {/* Radio dot */}
      <div style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        border: `1.5px solid ${active ? color : "var(--eco-gray-300)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 180ms",
      }}>
        {active && (
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: color,
            animation: "eco-scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        )}
      </div>
    </button>
  );
}

/* ─── Data toggle ─── */
function DataToggle({ isEstimated, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      borderRadius: "var(--eco-radius-md)",
      border: "1px solid var(--eco-gray-200)",
      overflow: "hidden",
    }}>
      {[
        { val: false, label: "Real", icon: <CheckCircle2 size={13} />, color: "var(--eco-success)" },
        { val: true, label: "Estimado", icon: <AlertTriangle size={13} />, color: "var(--eco-warning)" },
      ].map(opt => {
        const active = isEstimated === opt.val;
        return (
          <button key={String(opt.val)} onClick={() => onChange(opt.val)}
            style={{
              flex: 1, height: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              border: "none", cursor: "pointer", outline: "none",
              fontFamily: fb, fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? opt.color : "var(--eco-gray-500)",
              background: active ? (opt.val ? "var(--eco-warning-bg)" : "var(--eco-success-bg)") : "white",
              transition: "all 150ms ease-out",
            }}>
            {opt.icon} {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Calc result card ─── */
function CalcResult({ numericValue, unit, factorNum, co2eKg, co2e_t, cat }) {
  const hasData = numericValue > 0 && factorNum > 0;
  return (
    <div style={{
      background: hasData ? "var(--eco-primary-50)" : "var(--eco-gray-50)",
      border: `1px solid ${hasData ? "var(--eco-primary-200)" : "var(--eco-gray-200)"}`,
      borderRadius: "var(--eco-radius-lg)",
      padding: 16, transition: "all 300ms ease-out",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
      }}>
        <Calculator size={15} style={{ color: hasData ? "var(--eco-primary-600)" : "var(--eco-gray-400)" }} />
        <span style={{ fontFamily: fd, fontSize: 13, fontWeight: 700, color: hasData ? "var(--eco-primary-700)" : "var(--eco-gray-500)" }}>
          Cálculo de emisiones
        </span>
      </div>

      {hasData ? (
        <>
          {/* Formula */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            padding: "10px 12px", borderRadius: "var(--eco-radius-md)",
            background: "white", border: "1px solid var(--eco-primary-100)",
            marginBottom: 12,
          }}>
            <span style={{ fontFamily: fm, fontSize: 13, color: "var(--eco-gray-700)" }}>
              {numericValue.toLocaleString("es-MX")}
            </span>
            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{unit}</span>
            <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-400)" }}>×</span>
            <span style={{ fontFamily: fm, fontSize: 13, color: "var(--eco-gray-700)" }}>
              {factorNum}
            </span>
            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>kgCO₂e/{unit}</span>
            <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-400)" }}>=</span>
          </div>

          {/* Result */}
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{
              fontFamily: fm, fontSize: 28, fontWeight: 700,
              color: "var(--eco-primary-700)", margin: 0, letterSpacing: "-0.02em",
              animation: "eco-fadeInUp 0.3s ease-out",
            }}>
              {co2eKg.toLocaleString("es-MX", { maximumFractionDigits: 1 })}
            </p>
            <p style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-primary-600)", margin: "2px 0 0" }}>
              kgCO₂e
            </p>
            <div style={{
              marginTop: 8, padding: "4px 12px",
              display: "inline-flex", alignItems: "center", gap: 4,
              borderRadius: "var(--eco-radius-full)",
              background: "var(--eco-primary-100)",
            }}>
              <Leaf size={12} style={{ color: "var(--eco-primary-700)" }} />
              <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 600, color: "var(--eco-primary-700)" }}>
                ≈ {co2e_t.toLocaleString("es-MX", { maximumFractionDigits: 4 })} tCO₂e
              </span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontFamily: fm, fontSize: 24, color: "var(--eco-gray-300)", margin: 0 }}>—</p>
          <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)", margin: "4px 0 0" }}>
            Ingresa consumo y factor para calcular
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MODAL
   ═══════════════════════════════════════════════════════════════ */

export default function NewRecordModal({ open, onClose, onCreate }) {
  const [cat, setCat] = useState("electricidad");
  const [isEstimated, setIsEstimated] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [area, setArea] = useState("Aulas");
  const [source, setSource] = useState("Medición");
  const [activity, setActivity] = useState("");
  const [value, setValue] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [factor, setFactor] = useState(DEFAULT_FACTORS.electricidad);
  const [note, setNote] = useState("");
  const [evidenceEnabled, setEvidenceEnabled] = useState(false);
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceDataUrl, setEvidenceDataUrl] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false); setCat("electricidad"); setIsEstimated(false);
    setDate(new Date().toISOString().slice(0, 10)); setArea("Aulas");
    setSource("Medición"); setActivity(""); setValue("");
    setFuelType("Diesel"); setFactor(DEFAULT_FACTORS.electricidad); setNote("");
    setEvidenceEnabled(false);
    setEvidenceName(""); setEvidenceDataUrl(""); setEvidenceError("");
    setSaving(false);
  }, [open]);

  useEffect(() => {
    setFactor(cat === "electricidad" ? DEFAULT_FACTORS.electricidad : DEFAULT_FACTORS.combustible);
  }, [cat]);

  const unit = cat === "electricidad" ? "kWh" : "L";
  const categoryLabel = cat === "electricidad" ? "Electricidad" : "Combustible";
  const numericValue = Number(value);
  const factorNum = Number(factor);

  const co2eKg = useMemo(() => {
    if (!numericValue || !factorNum) return 0;
    return numericValue * factorNum;
  }, [numericValue, factorNum]);

  const co2e_t = useMemo(() => (co2eKg ? co2eKg / 1000 : 0), [co2eKg]);

  const handleEvidenceChange = (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setEvidenceError("Solo se permiten imágenes (jpg, png, webp).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setEvidenceError("La imagen supera 2 MB. Usa una captura más ligera.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceDataUrl(String(reader.result || ""));
      setEvidenceName(file.name || "evidencia.jpg");
      setEvidenceError("");
    };
    reader.onerror = () => setEvidenceError("No se pudo leer la imagen seleccionada.");
    reader.readAsDataURL(file);
  };

  const errors = useMemo(() => {
    const e = {};
    if (!date) e.date = "Selecciona una fecha";
    if (!area) e.area = "Selecciona un área";
    if (!source) e.source = "Selecciona una fuente";
    if (!activity.trim()) e.activity = "Describe la actividad";
    if (!numericValue || numericValue <= 0) e.value = `Ingresa un valor válido en ${unit}`;
    if (!factorNum || factorNum <= 0) e.factor = "Factor inválido";
    if (evidenceEnabled && !evidenceDataUrl) e.evidence = "Adjunta una imagen de evidencia";
    return e;
  }, [date, area, source, activity, numericValue, unit, factorNum, evidenceDataUrl, evidenceEnabled]);

  const canSave = Object.keys(errors).length === 0;

  const handleSave = () => {
    setTouched(true);
    if (!canSave) return;
    setSaving(true);
    setTimeout(() => {
        onCreate?.({
          category: cat, categoryLabel, dateISO: date, area, source, isEstimated,
          activity: activity.trim(), unit, value: numericValue, factor: factorNum,
          co2e_kg: co2eKg, co2e_t, fuelType: cat === "combustible" ? fuelType : null,
          note: note.trim(), hasEvidence: evidenceEnabled,
          evidence: evidenceEnabled ? evidenceName : "",
          evidenceUrl: evidenceEnabled ? evidenceName : "",
          evidenceImage: evidenceEnabled ? evidenceDataUrl : "",
        });
        setSaving(false);
      }, 800);
  };

  /* Handle Escape */
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 90,
        background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)",
        display: "grid", placeItems: "center", padding: 16,
        animation: "eco-fadeIn 0.15s ease-out",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          width: "min(920px, 100%)", maxHeight: "92vh",
          background: "white",
          borderRadius: "var(--eco-radius-xl)",
          border: "1px solid var(--eco-gray-200)",
          boxShadow: "var(--eco-shadow-xl)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "eco-scaleIn 0.2s cubic-bezier(0.33,1,0.68,1)",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--eco-gray-100)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--eco-radius-md)",
              background: cat === "electricidad" ? "var(--eco-primary-50)" : "var(--eco-secondary-50)",
              color: cat === "electricidad" ? "var(--eco-primary-600)" : "var(--eco-secondary-600)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 250ms ease-out",
            }}>
              {cat === "electricidad" ? <Zap size={18} /> : <Flame size={18} />}
            </div>
            <div>
              <h2 style={{ fontFamily: fd, fontSize: 16, fontWeight: 800, margin: 0, color: "var(--eco-gray-900)" }}>
                Nuevo registro de emisión
              </h2>
              <p style={{ fontFamily: fb, fontSize: 12, margin: "1px 0 0", color: "var(--eco-gray-400)" }}>
                Captura el consumo para calcular CO₂e automáticamente
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar (Esc)"
            style={{
              width: 34, height: 34, borderRadius: "var(--eco-radius-md)",
              border: "1px solid var(--eco-gray-200)", background: "white",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--eco-gray-500)", transition: "all 150ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--eco-gray-100)"; e.currentTarget.style.color = "var(--eco-gray-700)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "var(--eco-gray-500)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>

            {/* ═══ LEFT COLUMN — FORM ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Scope selector */}
              <Section title="Tipo de emisión" icon={<Leaf size={14} />}>
                <div style={{ display: "flex", gap: 10 }}>
                  <ScopeCard
                    active={cat === "electricidad"} onClick={() => setCat("electricidad")}
                    icon={<Zap size={20} />} label="Scope 2 — Electricidad" desc="Consumo eléctrico CFE"
                    color="#22C55E"
                  />
                  <ScopeCard
                    active={cat === "combustible"} onClick={() => setCat("combustible")}
                    icon={<Flame size={20} />} label="Scope 1 — Combustible" desc="Diésel tractor agrícola"
                    color="#EAB308"
                  />
                </div>
              </Section>

              {/* Location & date */}
              <Section title="Ubicación y periodo" icon={<Building2 size={14} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Fecha" required error={touched && errors.date}>
                    <EcoInput type="date" value={date} onChange={e => setDate(e.target.value)}
                      hasError={touched && errors.date} icon={<Calendar size={15} />} />
                  </Field>
                  <Field label="Área del campus" required error={touched && errors.area}>
                    <EcoSelect value={area} onChange={e => setArea(e.target.value)}
                      options={AREAS} hasError={touched && errors.area}
                      icon={<Building2 size={15} />} />
                  </Field>
                </div>
              </Section>

              {/* Source & data type */}
              <Section title="Fuente y tipo de dato" icon={<FileText size={14} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Fuente del dato" required error={touched && errors.source}>
                    <EcoSelect value={source} onChange={e => setSource(e.target.value)}
                      options={SOURCES} hasError={touched && errors.source} />
                  </Field>
                  <Field label="Tipo de dato">
                    <DataToggle isEstimated={isEstimated} onChange={setIsEstimated} />
                  </Field>
                </div>

                {cat === "combustible" && (
                  <div style={{ marginTop: 12 }}>
                    <Field label="Tipo de combustible">
                      <EcoSelect value={fuelType} onChange={e => setFuelType(e.target.value)}
                        options={[{ value: "Diesel", label: "Diésel" }, { value: "Gasolina", label: "Gasolina" }]} />
                    </Field>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <Field label="Actividad / descripción" required error={touched && errors.activity}
                    helper={cat === "electricidad" ? "Ej: Iluminación y equipos del aula" : "Ej: Riego y traslado de materiales"}>
                    <EcoInput value={activity} onChange={e => setActivity(e.target.value)}
                      placeholder={cat === "electricidad" ? "Centro de cómputo 1 (equipos encendidos)" : "Tractor (riego / traslado)"}
                      hasError={touched && errors.activity} />
                  </Field>
                </div>
              </Section>

              {/* Consumption & factor */}
              <Section title="Consumo y factor de emisión" icon={<Beaker size={14} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label={`Consumo (${unit})`} required error={touched && errors.value}>
                    <EcoInput value={value} onChange={e => setValue(e.target.value)}
                      inputMode="decimal" placeholder={cat === "electricidad" ? "1250" : "35"}
                      hasError={touched && errors.value} mono unit={unit} />
                  </Field>
                  <Field label={`Factor (kgCO₂e/${unit})`} required error={touched && errors.factor}
                    helper={cat === "electricidad" ? "SEMARNAT 2024" : "INECC 2023"}>
                    <EcoInput value={String(factor)} onChange={e => setFactor(e.target.value)}
                      inputMode="decimal" hasError={touched && errors.factor} mono
                      unit={`kgCO₂e/${unit}`} />
                  </Field>
                </div>
              </Section>

              {/* Notes */}
              <Field label="Nota (opcional)" helper="Observaciones sobre este registro, máx 250 caracteres">
                <EcoInput value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Ej: Lectura parcial del medidor, pendiente evidencia" />
              </Field>

              {/* Evidence */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Field label="Evidencia disponible">
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceEnabled((prev) => {
                        if (prev) { setEvidenceDataUrl(""); setEvidenceName(""); setEvidenceError(""); }
                        return !prev;
                      });
                    }}
                    style={{
                      width: "100%", height: 40, borderRadius: "var(--eco-radius-md)",
                      border: `1px solid ${evidenceEnabled ? "var(--eco-primary-300)" : "var(--eco-gray-300)"}`,
                      background: evidenceEnabled ? "var(--eco-primary-50)" : "white",
                      padding: "0 10px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)", transition: "all 150ms",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{evidenceEnabled ? "Activada" : "Desactivada"}</span>
                    <span
                      style={{
                        width: 38, height: 22, borderRadius: 999, position: "relative",
                        background: evidenceEnabled ? "var(--eco-primary-500)" : "var(--eco-gray-300)",
                        transition: "background 150ms",
                        display: "inline-block",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute", top: 2, left: evidenceEnabled ? 18 : 2,
                          width: 18, height: 18, borderRadius: "50%", background: "white",
                          boxShadow: "0 1px 3px rgba(15,23,42,.25)", transition: "left 150ms",
                        }}
                      />
                    </span>
                  </button>
                </Field>

                {evidenceEnabled && (
                  <Field
                    label="Evidencia (imagen)"
                    required
                    error={(touched && errors.evidence) || evidenceError}
                    helper="Sube una foto o captura del recibo/medición (máx. 2 MB)"
                  >
                    <label style={{
                      height: 40, borderRadius: "var(--eco-radius-md)",
                      border: `1px dashed ${(touched && errors.evidence) || evidenceError ? "var(--eco-danger)" : "var(--eco-gray-300)"}`,
                      background: "white", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontFamily: fb, fontSize: 13, color: "var(--eco-gray-600)", transition: "all 150ms",
                    }}>
                      <ImagePlus size={15} />
                      {evidenceName || "Seleccionar imagen o captura"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleEvidenceChange}
                        style={{ display: "none" }}
                      />
                    </label>
                    {evidenceDataUrl && (
                      <div style={{
                        marginTop: 8, padding: 8, borderRadius: "var(--eco-radius-md)",
                        border: "1px solid var(--eco-gray-200)", background: "var(--eco-gray-50)",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <img
                          src={evidenceDataUrl}
                          alt="Vista previa de evidencia"
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)" }}
                        />
                        <span style={{ flex: 1, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {evidenceName}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setEvidenceDataUrl(""); setEvidenceName(""); setEvidenceError(""); }}
                          style={{
                            width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)",
                            background: "white", color: "var(--eco-gray-500)", cursor: "pointer",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </Field>
                )}
              </div>
            </div>

            {/* ═══ RIGHT COLUMN — PREVIEW ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Calc */}
              <CalcResult
                numericValue={numericValue} unit={unit} factorNum={factorNum}
                co2eKg={co2eKg} co2e_t={co2e_t} cat={cat}
              />

              {/* Summary */}
              <div style={{
                background: "var(--eco-gray-50)", border: "1px solid var(--eco-gray-200)",
                borderRadius: "var(--eco-radius-lg)", padding: 14,
              }}>
                <p style={{ fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", margin: "0 0 10px" }}>
                  Resumen del registro
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Categoría", val: categoryLabel, icon: cat === "electricidad" ? <Zap size={12} /> : <Flame size={12} /> },
                    { label: "Tipo de dato", val: isEstimated ? "Estimado" : "Real", icon: isEstimated ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} /> },
                    { label: "Área", val: AREAS.find(a => a.value === area)?.label || area },
                    { label: "Fecha", val: date ? new Date(date + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—" },
                    { label: "Fuente", val: SOURCES.find(s => s.value === source)?.label || source },
                    { label: "Evidencia", val: evidenceEnabled ? (evidenceName || "Pendiente de carga") : "No disponible" },
                  ].map((r, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 10px", borderRadius: "var(--eco-radius-sm)",
                      background: "white", border: "1px solid var(--eco-gray-100)",
                    }}>
                      <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{r.label}</span>
                      <span style={{
                        fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {r.icon && <span style={{ display: "flex", color: "var(--eco-gray-400)" }}>{r.icon}</span>}
                        {r.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info tip */}
              <div style={{
                display: "flex", gap: 10, padding: "10px 12px",
                borderRadius: "var(--eco-radius-md)",
                background: "var(--eco-info-bg)", border: "1px solid #BFDBFE",
              }}>
                <Info size={15} style={{ color: "var(--eco-info)", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", margin: 0, lineHeight: 1.5 }}>
                  El cálculo usa la fórmula <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-gray-700)" }}>consumo × factor = CO₂e</span>. Adjunta evidencia con foto/captura para validar el registro.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: "1px solid var(--eco-gray-100)", flexShrink: 0,
          background: "var(--eco-gray-50)",
        }}>
          <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: 0 }}>
            {touched && !canSave ? (
              <span style={{ color: "var(--eco-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={12} /> Completa los campos requeridos
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: fm }}>Esc</span> para cerrar
              </span>
            )}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose}
              style={{
                height: 40, padding: "0 16px",
                borderRadius: "var(--eco-radius-md)",
                background: "white", border: "1px solid var(--eco-gray-200)",
                fontFamily: fb, fontSize: 13, fontWeight: 600,
                color: "var(--eco-gray-700)", cursor: "pointer",
                transition: "all 150ms",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--eco-gray-100)"}
              onMouseLeave={e => e.currentTarget.style.background = "white"}
            >
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{
                height: 40, padding: "0 20px",
                borderRadius: "var(--eco-radius-md)",
                background: saving ? "var(--eco-gray-300)" : canSave ? "var(--eco-primary-500)" : "var(--eco-gray-200)",
                color: canSave || saving ? "white" : "var(--eco-gray-500)",
                border: "none",
                fontFamily: fb, fontSize: 13, fontWeight: 700,
                cursor: saving ? "wait" : canSave ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: canSave && !saving ? "0 2px 8px rgba(34,197,94,0.25)" : "none",
                transition: "all 200ms ease-out",
              }}
              onMouseEnter={e => { if (canSave && !saving) { e.currentTarget.style.background = "var(--eco-primary-600)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={e => { if (canSave && !saving) { e.currentTarget.style.background = "var(--eco-primary-500)"; e.currentTarget.style.transform = "translateY(0)"; } }}
            >
              {saving ? (
                <><Loader2 size={15} style={{ animation: "eco-spin 0.8s linear infinite" }} /> Guardando…</>
              ) : (
                <><Save size={15} /> Guardar y calcular CO₂e</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
