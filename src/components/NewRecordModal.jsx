import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Zap,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  FileText,
  Beaker,
  Calculator,
  Leaf,
  Save,
  Info,
  ChevronDown,
  AlertCircle,
  Loader2,
  ImagePlus,
  Trash2,
  PlugZap,
  Upload,
  FileJson,
} from "lucide-react";
import {
  getDefaultBinding,
  getDeviceBinding,
  getLastTotal,
  setLastTotal,
  upsertDeviceBinding,
} from "../lib/deviceBinding";
import { parseDevicePayload } from "../lib/deviceParser";
import { add as addNotification } from "../lib/notificationsStore";
import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "../lib/storageKeys";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const AREAS = [
  { value: "CC 1", label: "Centro de Computo 1", icon: "CC" },
  { value: "CC 2", label: "Centro de Computo 2", icon: "CC" },
  { value: "Aulas", label: "Aulas", icon: "AU" },
  { value: "Redes", label: "Taller de Redes", icon: "RD" },
  { value: "Industrial", label: "Taller Industrial", icon: "IN" },
  { value: "Agricola", label: "Innovacion Agricola", icon: "AG" },
  { value: "Admin", label: "Administracion", icon: "AD" },
  { value: "Otros", label: "Otros", icon: "OT" },
];

const SOURCES = [
  { value: "Recibo", label: "Recibo CFE" },
  { value: "Medicion", label: "Medicion directa" },
  { value: "Encuesta", label: "Encuesta" },
  { value: "Inventario", label: "Inventario" },
  { value: "Estimacion", label: "Estimacion" },
];

const DEFAULT_FACTORS = {
  electricidad: 0.435,
  combustible: 2.68,
};

const DEVICE_ACTIVITY_TEXT = "Lectura automatica (ESP32)";

function formatDateLabel(date) {
  if (!date) return "Sin fecha";
  const dt = new Date(`${date}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return date;
  return dt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatNumber(value, digits = 3) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("es-MX", { maximumFractionDigits: digits });
}

function buildRecordId(prefix = "u") {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

function writeDeviceRecord(record) {
  const existing = safeReadJson(STORAGE_KEYS.records, []);
  const nextRows = Array.isArray(existing) ? existing : [];
  safeWriteJson(STORAGE_KEYS.records, [record, ...nextRows].slice(0, 200));
}

function ModePill({ active, disabled, icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: "var(--eco-radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        outline: "none",
        textAlign: "left",
        border: active ? "1.5px solid var(--eco-primary-400)" : "1px solid var(--eco-gray-200)",
        background: active ? "var(--eco-primary-50)" : "white",
        color: disabled ? "var(--eco-gray-400)" : "var(--eco-gray-700)",
        opacity: disabled ? 0.75 : 1,
        transition: "all 180ms ease-out",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--eco-radius-md)",
          background: active ? "rgba(34,197,94,0.12)" : "var(--eco-gray-100)",
          color: active ? "var(--eco-primary-600)" : "var(--eco-gray-400)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: fb, fontSize: 14, fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ fontFamily: fb, fontSize: 11, margin: "1px 0 0", color: "var(--eco-gray-400)" }}>{hint}</p>
      </div>
    </button>
  );
}

function EcoInput({
  type = "text",
  value,
  onChange,
  placeholder,
  hasError,
  mono,
  icon,
  unit,
  inputMode,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError
    ? "var(--eco-danger)"
    : focused
    ? "var(--eco-primary-500)"
    : "var(--eco-gray-300)";
  const ring = hasError
    ? "0 0 0 2px rgba(220,38,38,0.08)"
    : focused
    ? "0 0 0 2px rgba(34,197,94,0.10)"
    : "none";

  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: focused ? "var(--eco-primary-500)" : "var(--eco-gray-400)",
            display: "flex",
            pointerEvents: "none",
            transition: "color 150ms",
          }}
        >
          {icon}
        </span>
      )}

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: 40,
          padding: `0 ${unit ? 48 : 12}px 0 ${icon ? 36 : 12}px`,
          borderRadius: "var(--eco-radius-md)",
          border: `1px solid ${borderColor}`,
          background: "white",
          fontFamily: mono ? fm : fb,
          fontSize: 14,
          color: "var(--eco-gray-800)",
          outline: "none",
          transition: "all 150ms ease-out",
          boxShadow: ring,
        }}
        {...rest}
      />

      {unit && (
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: fm,
            fontSize: 12,
            color: "var(--eco-gray-400)",
            pointerEvents: "none",
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

function EcoSelect({ value, onChange, options, hasError, icon, placeholder, disabled }) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError
    ? "var(--eco-danger)"
    : focused
    ? "var(--eco-primary-500)"
    : "var(--eco-gray-300)";

  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: focused ? "var(--eco-primary-500)" : "var(--eco-gray-400)",
            display: "flex",
            pointerEvents: "none",
            transition: "color 150ms",
            zIndex: 1,
          }}
        >
          {icon}
        </span>
      )}

      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: 40,
          padding: `0 32px 0 ${icon ? 36 : 12}px`,
          borderRadius: "var(--eco-radius-md)",
          border: `1px solid ${borderColor}`,
          background: disabled ? "var(--eco-gray-50)" : "white",
          fontFamily: fb,
          fontSize: 14,
          color: value ? "var(--eco-gray-800)" : "var(--eco-gray-400)",
          appearance: "none",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 150ms ease-out",
          boxShadow: focused ? "0 0 0 2px rgba(34,197,94,0.10)" : "none",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--eco-gray-400)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function Field({ label, required, error, helper, children }) {
  return (
    <div>
      {label && (
        <label
          style={{
            fontFamily: fb,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--eco-gray-700)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 6,
          }}
        >
          {label}
          {required && <span style={{ color: "var(--eco-danger)", fontSize: 11 }}>*</span>}
        </label>
      )}

      {children}

      {error && (
        <p
          style={{
            fontFamily: fb,
            fontSize: 12,
            color: "var(--eco-danger)",
            margin: "5px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 4,
            animation: "eco-fadeInUp 0.2s ease-out",
          }}
        >
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {!error && helper && (
        <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: "5px 0 0" }}>{helper}</p>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: "1px solid var(--eco-gray-100)",
        }}
      >
        {icon && (
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
        )}

        <span style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{title}</span>
      </div>

      {children}
    </div>
  );
}

function ScopeCard({ active, icon, label, desc, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: "var(--eco-radius-md)",
        cursor: "pointer",
        outline: "none",
        textAlign: "left",
        border: active ? `1.5px solid ${color}` : "1px solid var(--eco-gray-200)",
        background: active ? `${color}08` : "white",
        transition: "all 180ms ease-out",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--eco-radius-md)",
          background: active ? `${color}15` : "var(--eco-gray-100)",
          color: active ? color : "var(--eco-gray-400)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: fb, fontSize: 14, fontWeight: 600, margin: 0, color: "var(--eco-gray-800)" }}>{label}</p>
        <p style={{ fontFamily: fb, fontSize: 11, margin: "1px 0 0", color: "var(--eco-gray-400)" }}>{desc}</p>
      </div>

      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${active ? color : "var(--eco-gray-300)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />}
      </div>
    </button>
  );
}

function DataToggle({ isEstimated, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderRadius: "var(--eco-radius-md)",
        border: "1px solid var(--eco-gray-200)",
        overflow: "hidden",
      }}
    >
      {[
        { value: false, label: "Real", icon: <CheckCircle2 size={13} />, color: "var(--eco-success)" },
        { value: true, label: "Estimado", icon: <AlertTriangle size={13} />, color: "var(--eco-warning)" },
      ].map((option) => {
        const active = isEstimated === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              flex: 1,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              border: "none",
              cursor: "pointer",
              outline: "none",
              fontFamily: fb,
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? option.color : "var(--eco-gray-500)",
              background: active ? (option.value ? "var(--eco-warning-bg)" : "var(--eco-success-bg)") : "white",
            }}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function CalcResult({ numericValue, unit, factorNum, co2eKg, co2eT }) {
  const hasData = numericValue > 0 && factorNum > 0;

  return (
    <div
      style={{
        background: hasData ? "var(--eco-primary-50)" : "var(--eco-gray-50)",
        border: `1px solid ${hasData ? "var(--eco-primary-200)" : "var(--eco-gray-200)"}`,
        borderRadius: "var(--eco-radius-lg)",
        padding: 16,
        transition: "all 300ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Calculator size={15} style={{ color: hasData ? "var(--eco-primary-600)" : "var(--eco-gray-400)" }} />
        <span
          style={{
            fontFamily: fd,
            fontSize: 13,
            fontWeight: 700,
            color: hasData ? "var(--eco-primary-700)" : "var(--eco-gray-500)",
          }}
        >
          Calculo de emisiones
        </span>
      </div>

      {hasData ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              padding: "10px 12px",
              borderRadius: "var(--eco-radius-md)",
              background: "white",
              border: "1px solid var(--eco-primary-100)",
              marginBottom: 12,
            }}
          >
            <span style={{ fontFamily: fm, fontSize: 13, color: "var(--eco-gray-700)" }}>{formatNumber(numericValue)}</span>
            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{unit}</span>
            <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-400)" }}>x</span>
            <span style={{ fontFamily: fm, fontSize: 13, color: "var(--eco-gray-700)" }}>{factorNum}</span>
            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>kgCO2e/{unit}</span>
            <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-400)" }}>=</span>
          </div>

          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p
              style={{
                fontFamily: fm,
                fontSize: 28,
                fontWeight: 700,
                color: "var(--eco-primary-700)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {formatNumber(co2eKg, 1)}
            </p>
            <p style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-primary-600)", margin: "2px 0 0" }}>kgCO2e</p>
            <div
              style={{
                marginTop: 8,
                padding: "4px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderRadius: "var(--eco-radius-full)",
                background: "var(--eco-primary-100)",
              }}
            >
              <Leaf size={12} style={{ color: "var(--eco-primary-700)" }} />
              <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 600, color: "var(--eco-primary-700)" }}>
                {`~ ${formatNumber(co2eT, 4)} tCO2e`}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontFamily: fm, fontSize: 24, color: "var(--eco-gray-300)", margin: 0 }}>-</p>
          <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)", margin: "4px 0 0" }}>
            Ingresa consumo y factor para calcular
          </p>
        </div>
      )}
    </div>
  );
}

function DeviceNotice({ tone = "info", title, body, lines = [] }) {
  const styles = {
    info: {
      background: "var(--eco-info-bg)",
      border: "#BFDBFE",
      color: "var(--eco-info)",
      icon: <Info size={15} />,
    },
    success: {
      background: "var(--eco-success-bg)",
      border: "#BBF7D0",
      color: "var(--eco-success)",
      icon: <CheckCircle2 size={15} />,
    },
    warn: {
      background: "var(--eco-warning-bg)",
      border: "#FDE68A",
      color: "var(--eco-secondary-600)",
      icon: <AlertTriangle size={15} />,
    },
    error: {
      background: "var(--eco-danger-bg)",
      border: "#FECACA",
      color: "var(--eco-danger)",
      icon: <AlertCircle size={15} />,
    },
  }[tone];

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        borderRadius: "var(--eco-radius-md)",
        background: styles.background,
        border: `1px solid ${styles.border}`,
      }}
    >
      <span style={{ color: styles.color, display: "flex", marginTop: 1 }}>{styles.icon}</span>
      <div>
        <p style={{ fontFamily: fd, fontSize: 13, fontWeight: 700, margin: 0, color: "var(--eco-gray-800)" }}>{title}</p>
        <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", margin: "2px 0 0", lineHeight: 1.5 }}>{body}</p>
        {lines.map((line) => (
          <p key={line} style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", margin: "4px 0 0" }}>
            - {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function NewRecordModal({ open, onClose, onCreate, onCreateRecord, onSave }) {
  const notify = onCreate || onCreateRecord || onSave;
  const fileInputRef = useRef(null);

  const [cat, setCat] = useState("electricidad");
  const [recordMode, setRecordMode] = useState("manual");
  const [isEstimated, setIsEstimated] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [area, setArea] = useState("Aulas");
  const [source, setSource] = useState("Medicion");
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

  const [deviceInput, setDeviceInput] = useState("");
  const [deviceFileName, setDeviceFileName] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("empty");
  const [deviceErrors, setDeviceErrors] = useState([]);
  const [deviceWarnings, setDeviceWarnings] = useState([]);
  const [devicePayload, setDevicePayload] = useState(null);
  const [deviceSummary, setDeviceSummary] = useState(null);
  const [devicePreparedItems, setDevicePreparedItems] = useState([]);
  const [deviceCounts, setDeviceCounts] = useState({ total: 0, valid: 0, invalid: 0, registrable: 0, blocked: 0 });
  const [deviceBinding, setDeviceBinding] = useState(getDefaultBinding(""));
  const [deviceToast, setDeviceToast] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setCat("electricidad");
    setRecordMode("manual");
    setIsEstimated(false);
    setDate(new Date().toISOString().slice(0, 10));
    setArea("Aulas");
    setSource("Medicion");
    setActivity("");
    setValue("");
    setFuelType("Diesel");
    setFactor(DEFAULT_FACTORS.electricidad);
    setNote("");
    setEvidenceEnabled(false);
    setEvidenceName("");
    setEvidenceDataUrl("");
    setEvidenceError("");
    setSaving(false);
    setDeviceInput("");
    setDeviceFileName("");
    setDeviceStatus("empty");
    setDeviceErrors([]);
    setDeviceWarnings([]);
    setDevicePayload(null);
    setDeviceSummary(null);
    setDevicePreparedItems([]);
    setDeviceCounts({ total: 0, valid: 0, invalid: 0, registrable: 0, blocked: 0 });
    setDeviceBinding(getDefaultBinding(""));
    setDeviceToast(null);
  }, [open]);

  useEffect(() => {
    setFactor(cat === "electricidad" ? DEFAULT_FACTORS.electricidad : DEFAULT_FACTORS.combustible);
    if (cat !== "electricidad") {
      setRecordMode("manual");
      setSource("Medicion");
    }
  }, [cat]);

  useEffect(() => {
    if (!deviceToast) return;
    const timer = window.setTimeout(() => setDeviceToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [deviceToast]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const unit = cat === "electricidad" ? "kWh" : "L";
  const categoryLabel = cat === "electricidad" ? "Electricidad" : "Combustible";
  const numericValue = Number(value);
  const factorNum = Number(factor);
  const previewValue = recordMode === "device" && deviceSummary ? Number(deviceSummary.registeredKWh) || 0 : numericValue;
  const previewEstimated = recordMode === "device" ? false : isEstimated;
  const previewActivity = recordMode === "device" ? DEVICE_ACTIVITY_TEXT : activity;
  const previewSource = recordMode === "device" ? "Medicion" : source;
  const previewCo2eKg = previewValue > 0 && factorNum > 0 ? previewValue * factorNum : 0;
  const previewCo2eT = previewCo2eKg ? previewCo2eKg / 1000 : 0;

  const co2eKg = useMemo(() => {
    if (!numericValue || !factorNum) return 0;
    return numericValue * factorNum;
  }, [numericValue, factorNum]);

  const co2eT = useMemo(() => (co2eKg ? co2eKg / 1000 : 0), [co2eKg]);

  const errors = useMemo(() => {
    if (recordMode === "device") return {};
    const nextErrors = {};
    if (!date) nextErrors.date = "Selecciona una fecha";
    if (!area) nextErrors.area = "Selecciona un area";
    if (!source) nextErrors.source = "Selecciona una fuente";
    if (!activity.trim()) nextErrors.activity = "Describe la actividad";
    if (!numericValue || numericValue <= 0) nextErrors.value = `Ingresa un valor valido en ${unit}`;
    if (!factorNum || factorNum <= 0) nextErrors.factor = "Factor invalido";
    if (evidenceEnabled && !evidenceDataUrl) nextErrors.evidence = "Adjunta una imagen de evidencia";
    return nextErrors;
  }, [recordMode, date, area, source, activity, numericValue, unit, factorNum, evidenceEnabled, evidenceDataUrl]);

  const canSaveDevice = Boolean(deviceCounts.registrable > 0 && factorNum > 0);
  const canSave = recordMode === "device" ? canSaveDevice : Object.keys(errors).length === 0;

  function resetDevicePreview(nextStatus = "empty") {
    setDeviceStatus(nextStatus);
    setDeviceErrors([]);
    setDeviceWarnings([]);
    setDevicePayload(null);
    setDeviceSummary(null);
    setDevicePreparedItems([]);
    setDeviceCounts({ total: 0, valid: 0, invalid: 0, registrable: 0, blocked: 0 });
  }

  function handleEvidenceChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setEvidenceError("Solo se permiten imagenes (jpg, png, webp).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setEvidenceError("La imagen supera 2 MB. Usa una captura mas ligera.");
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
  }

  function normalizeBindingFromPayload(payload) {
    const existingBinding = getDeviceBinding(payload.deviceId);
    if (existingBinding) return existingBinding;
    return {
      ...getDefaultBinding(payload.deviceId),
      areaCode: area,
      defaults: {
        voltage: Number(payload.electrical?.voltageV_rms_assumed) > 0 ? Number(payload.electrical?.voltageV_rms_assumed) : 127,
        powerFactor:
          Number(payload.electrical?.powerFactor_assumed) > 0 ? Number(payload.electrical?.powerFactor_assumed) : 0.9,
        intervalSeconds: Number(payload.intervalSeconds) > 0 ? Number(payload.intervalSeconds) : 900,
      },
    };
  }

  function evaluateDeviceReading(payload, historyMap = {}, bindingOverride = null) {
    const nextBinding = bindingOverride || normalizeBindingFromPayload(payload);
    const lastTotal = historyMap[payload.deviceId] || getLastTotal(payload.deviceId);
    const warnings = [];
    let block = false;
    let delta = Number(payload.energy.deltaKWh);
    let deltaSource = "payload";
    const deltaFromPayload = Number.isFinite(delta) && delta > 0;

    if (!deltaFromPayload) {
      deltaSource = "history";
      if (lastTotal && Number.isFinite(Number(lastTotal.lastTotalKWh))) {
        delta = Number(payload.energy.totalKWh) - Number(lastTotal.lastTotalKWh);
      } else {
        delta = null;
        block = true;
        warnings.push("No hay una lectura previa para calcular deltaKWh automaticamente.");
      }
    }

    if (lastTotal?.lastTimestamp) {
      const currentTime = new Date(payload.timestamp).getTime();
      const previousTime = new Date(lastTotal.lastTimestamp).getTime();
      if (Number.isFinite(currentTime) && Number.isFinite(previousTime) && currentTime < previousTime) {
        block = true;
        warnings.push("Timestamp fuera de orden respecto a la ultima lectura almacenada.");
      }
    }

    if (delta != null && delta < 0) {
      block = true;
      warnings.push("Posible reinicio o lectura fuera de orden.");
    }

    if (delta === 0) warnings.push("La lectura no genero consumo incremental.");

    return {
      payload,
      binding: nextBinding,
      totalKWh: Number(payload.energy.totalKWh),
      deltaKWh: delta,
      registeredKWh: delta != null && delta > 0 ? delta : 0,
      deltaSource,
      warnings,
      block,
    };
  }

  function processDeviceInput(rawText, label = "") {
    const text = String(rawText || "");
    setDeviceInput(text);
    setDeviceFileName(label);

    if (!text.trim()) {
      resetDevicePreview("empty");
      setDeviceBinding(getDefaultBinding(""));
      return;
    }

    setDeviceStatus("loading");

    window.setTimeout(() => {
      const parsed = parseDevicePayload(text);
      if (!parsed.ok && !parsed.summary?.valid) {
        setDeviceStatus("error");
        setDeviceErrors(parsed.errors || []);
        setDeviceWarnings([]);
        setDevicePayload(null);
        setDeviceSummary(null);
        setDevicePreparedItems([]);
        setDeviceCounts(parsed.summary || { total: 0, valid: 0, invalid: 0, registrable: 0, blocked: 0 });
        return;
      }

      const historyMap = {};
      const preparedItems = parsed.validItems.map((item) => {
        const prepared = evaluateDeviceReading(item.payload, historyMap);
        if (!prepared.block) {
          historyMap[item.payload.deviceId] = {
            lastTotalKWh: prepared.totalKWh,
            lastTimestamp: item.payload.timestamp,
          };
        }
        return prepared;
      });

      const preview = preparedItems[0] || null;
      const previewPayload = preview?.payload || parsed.payload;
      const nextBinding = previewPayload ? normalizeBindingFromPayload(previewPayload) : getDefaultBinding("");
      const warnings = [];
      const blockedCount = preparedItems.filter((item) => item.block).length;
      const registrableCount = preparedItems.length - blockedCount;

      warnings.push(`${parsed.summary.valid} validas y ${parsed.summary.invalid} invalidas.`);
      if (parsed.summary.invalid) warnings.push(...parsed.errors);
      if (blockedCount) warnings.push(`${blockedCount} lectura(s) validas requieren revision manual antes de registrarse.`);
      if (preview?.warnings?.length) warnings.push(...preview.warnings);

      setDeviceBinding(nextBinding);
      setArea(nextBinding.areaCode);
      setDate(previewPayload?.dateISO || new Date().toISOString().slice(0, 10));
      setSource("Medicion");
      setIsEstimated(false);
      setDeviceErrors(parsed.summary.invalid ? parsed.errors : []);
      setDeviceWarnings(warnings);
      setDevicePayload(previewPayload || null);
      setDeviceSummary(preview || null);
      setDevicePreparedItems(preparedItems);
      setDeviceCounts({
        total: parsed.summary.total,
        valid: parsed.summary.valid,
        invalid: parsed.summary.invalid,
        registrable: registrableCount,
        blocked: blockedCount,
      });
      setDeviceStatus(registrableCount > 0 ? (warnings.length ? "warn" : "ready") : "warn");
    }, 220);
  }

  function handleDeviceFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processDeviceInput(String(reader.result || ""), file.name || "lectura.json");
    reader.onerror = () => {
      setDeviceStatus("error");
      setDeviceErrors(["No se pudo leer el archivo .json seleccionado."]);
      setDeviceWarnings([]);
      setDevicePayload(null);
      setDeviceSummary(null);
      setDevicePreparedItems([]);
      setDeviceCounts({ total: 0, valid: 0, invalid: 0, registrable: 0, blocked: 0 });
    };
    reader.readAsText(file);
  }

  function saveBindingDraft() {
    if (!devicePayload?.deviceId) return;
    const saved = upsertDeviceBinding({
      ...deviceBinding,
      deviceId: devicePayload.deviceId,
      areaCode: deviceBinding.areaCode || area,
      defaults: {
        voltage: Number(deviceBinding.defaults?.voltage) > 0 ? Number(deviceBinding.defaults?.voltage) : 127,
        powerFactor:
          Number(deviceBinding.defaults?.powerFactor) > 0 ? Number(deviceBinding.defaults?.powerFactor) : 0.9,
        intervalSeconds:
          Number(deviceBinding.defaults?.intervalSeconds) > 0 ? Number(deviceBinding.defaults?.intervalSeconds) : 900,
      },
    });

    if (!saved) return;
    setDeviceBinding(saved);
    setArea(saved.areaCode);
    setDeviceToast({ title: "Configuracion guardada", message: `Dispositivo ${saved.deviceId} vinculado a ${saved.areaCode}.` });
  }

  function buildManualRecord() {
    return {
      category: cat,
      categoryLabel,
      dateISO: date,
      area,
      source,
      isEstimated,
      activity: activity.trim(),
      unit,
      value: numericValue,
      factor: factorNum,
      co2e_kg: co2eKg,
      co2e_t: co2eT,
      fuelType: cat === "combustible" ? fuelType : null,
      note: note.trim(),
      hasEvidence: evidenceEnabled,
      evidence: evidenceEnabled ? evidenceName : "",
      evidenceUrl: evidenceEnabled ? evidenceName : "",
      evidenceImage: evidenceEnabled ? evidenceDataUrl : "",
    };
  }

  function buildDeviceRecords() {
    const historyMap = {};
    const createdRecords = [];
    const skipped = [];

    devicePreparedItems.forEach((item, index) => {
      const baseBinding =
        devicePayload?.deviceId && item.payload.deviceId === devicePayload.deviceId
          ? {
              ...deviceBinding,
              deviceId: item.payload.deviceId,
              areaCode: deviceBinding.areaCode || area,
              defaults: {
                voltage: Number(deviceBinding.defaults?.voltage) > 0 ? Number(deviceBinding.defaults?.voltage) : 127,
                powerFactor:
                  Number(deviceBinding.defaults?.powerFactor) > 0 ? Number(deviceBinding.defaults?.powerFactor) : 0.9,
                intervalSeconds:
                  Number(deviceBinding.defaults?.intervalSeconds) > 0 ? Number(deviceBinding.defaults?.intervalSeconds) : 900,
              },
            }
          : normalizeBindingFromPayload(item.payload);

      const prepared = evaluateDeviceReading(item.payload, historyMap, baseBinding);
      if (prepared.block) {
        skipped.push(`Item #${index + 1}: ${prepared.warnings.join(", ")}`);
        return;
      }

      const savedBinding = upsertDeviceBinding(baseBinding);
      const record = {
        id: buildRecordId("dev"),
        persisted: true,
        scope: "scope2",
        metric: "electricity_consumption",
        category: "electricidad",
        categoryLabel: "Electricidad",
        dateISO: item.payload.dateISO || date,
        area: savedBinding?.areaCode || baseBinding.areaCode || area,
        areaCode: savedBinding?.areaCode || baseBinding.areaCode || area,
        campusCode: savedBinding?.campusCode || baseBinding.campusCode || "campus-carbontrack",
        source: "Medicion",
        dataSource: "medicion",
        isEstimated: false,
        status: "real",
        activity: DEVICE_ACTIVITY_TEXT,
        activityText: DEVICE_ACTIVITY_TEXT,
        unit: "kWh",
        value: Number(prepared.registeredKWh) || 0,
        factor: factorNum,
        co2e_kg: (Number(prepared.registeredKWh) || 0) * factorNum,
        co2e_t: ((Number(prepared.registeredKWh) || 0) * factorNum) / 1000,
        note: note.trim(),
        hasEvidence: false,
        evidence: "",
        evidenceUrl: "",
        evidenceImage: "",
        deviceId: item.payload.deviceId,
        readingId: item.payload.readingId,
        readingTimestamp: item.payload.timestamp,
        measurementType: item.payload.measurementType,
        sensorType: item.payload.sensorType,
        totalKWh: Number(prepared.totalKWh) || 0,
        deltaKWh: Number(prepared.deltaKWh) || 0,
        intervalSeconds: item.payload.intervalSeconds,
        quality: item.payload.quality || {},
      };

      writeDeviceRecord(record);
      setLastTotal(item.payload.deviceId, {
        lastTotalKWh: Number(prepared.totalKWh) || 0,
        lastTimestamp: item.payload.timestamp,
      });
      historyMap[item.payload.deviceId] = {
        lastTotalKWh: Number(prepared.totalKWh) || 0,
        lastTimestamp: item.payload.timestamp,
      };
      createdRecords.push(record);
    });

    return { createdRecords, skipped };
  }

  function handleSave() {
    setTouched(true);
    if (!canSave) return;

    setSaving(true);

    window.setTimeout(() => {
      if (recordMode === "device") {
        const result = buildDeviceRecords();
        if (result.createdRecords.length > 0) {
          addNotification({
            type: "record_imported",
            title: result.createdRecords.length > 1 ? "Lecturas importadas" : "Lectura importada",
            message:
              result.createdRecords.length > 1
                ? `${result.createdRecords.length} lecturas del dispositivo se registraron correctamente.`
                : `Se importó una lectura en ${result.createdRecords[0]?.area || area}.`,
            link: "/emisiones",
            meta: {
              count: result.createdRecords.length,
              deviceId: result.createdRecords[0]?.deviceId || null,
              skipped: result.skipped.length,
            },
          });
        }
        result.createdRecords.forEach((record) => notify?.(record));
        setDeviceToast({
          title: result.createdRecords.length > 1 ? `Importadas ${result.createdRecords.length} lecturas` : "Lectura registrada",
          message:
            result.createdRecords.length > 1
              ? `${result.createdRecords.length} lecturas registradas.${result.skipped.length ? ` ${result.skipped.length} quedaron en revision.` : ""}`
              : `${formatNumber(result.createdRecords[0]?.value || 0)} kWh importados en ${result.createdRecords[0]?.area || area}.`,
        });
      } else {
        const record = buildManualRecord();
        addNotification({
          type: "record_created",
          title: "Registro guardado",
          message: `${record.area} · ${formatNumber(record.co2e_t, 3)} tCO2e registradas.`,
          link: "/emisiones",
          meta: {
            category: record.category,
            area: record.area,
            source: record.source,
            isEstimated: record.isEstimated,
          },
        });
        notify?.(record);
      }
      setSaving(false);
    }, recordMode === "device" ? 320 : 800);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        animation: "eco-fadeIn 0.15s ease-out",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          maxHeight: "92vh",
          background: "white",
          borderRadius: "var(--eco-radius-xl)",
          border: "1px solid var(--eco-gray-200)",
          boxShadow: "var(--eco-shadow-xl)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "eco-scaleIn 0.2s cubic-bezier(0.33,1,0.68,1)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--eco-gray-100)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--eco-radius-md)",
                background: cat === "electricidad" ? "var(--eco-primary-50)" : "var(--eco-secondary-50)",
                color: cat === "electricidad" ? "var(--eco-primary-600)" : "var(--eco-secondary-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 250ms ease-out",
              }}
            >
              {cat === "electricidad" ? <Zap size={18} /> : <Flame size={18} />}
            </div>

            <div>
              <h2 style={{ fontFamily: fd, fontSize: 16, fontWeight: 800, margin: 0, color: "var(--eco-gray-900)" }}>
                Nuevo registro de emision
              </h2>
              <p style={{ fontFamily: fb, fontSize: 12, margin: "1px 0 0", color: "var(--eco-gray-400)" }}>
                Captura el consumo para calcular CO2e automaticamente
              </p>
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
              border: "1px solid var(--eco-gray-200)",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--eco-gray-500)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Section title="Tipo de emision" icon={<Leaf size={14} />}>
                <div style={{ display: "flex", gap: 10 }}>
                  <ScopeCard
                    active={cat === "electricidad"}
                    onClick={() => setCat("electricidad")}
                    icon={<Zap size={20} />}
                    label="Scope 2 - Electricidad"
                    desc="Consumo electrico CFE"
                    color="#22C55E"
                  />
                  <ScopeCard
                    active={cat === "combustible"}
                    onClick={() => setCat("combustible")}
                    icon={<Flame size={20} />}
                    label="Scope 1 - Combustible"
                    desc="Diesel tractor agricola"
                    color="#EAB308"
                  />
                </div>
              </Section>

              {cat === "electricidad" && (
                <Section title="Fuente de registro" icon={<PlugZap size={14} />}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <ModePill
                      active={recordMode === "manual"}
                      icon={<FileText size={18} />}
                      label="Manual"
                      hint="Captura normal con calculadora y evidencia"
                      onClick={() => setRecordMode("manual")}
                    />
                    <ModePill
                      active={recordMode === "device"}
                      icon={<PlugZap size={18} />}
                      label="Dispositivo"
                      hint="Pega JSON o sube un archivo .json"
                      onClick={() => setRecordMode("device")}
                    />
                  </div>
                </Section>
              )}

              <Section title="Ubicacion y periodo" icon={<Building2 size={14} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Fecha" required={recordMode !== "device"} error={touched && errors.date}>
                    <EcoInput
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      hasError={touched && errors.date}
                      icon={<Calendar size={15} />}
                      disabled={recordMode === "device"}
                    />
                  </Field>

                  <Field label="Area del campus" required error={touched && errors.area}>
                    <EcoSelect
                      value={area}
                      onChange={(event) => {
                        setArea(event.target.value);
                        setDeviceBinding((prev) => ({ ...prev, areaCode: event.target.value }));
                      }}
                      options={AREAS}
                      hasError={touched && errors.area}
                      icon={<Building2 size={15} />}
                    />
                  </Field>
                </div>
              </Section>

              {recordMode === "manual" ? (
                <>
                  <Section title="Fuente y tipo de dato" icon={<FileText size={14} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Fuente del dato" required error={touched && errors.source}>
                        <EcoSelect value={source} onChange={(event) => setSource(event.target.value)} options={SOURCES} hasError={touched && errors.source} />
                      </Field>

                      <Field label="Tipo de dato">
                        <DataToggle isEstimated={isEstimated} onChange={setIsEstimated} />
                      </Field>
                    </div>

                    {cat === "combustible" && (
                      <div style={{ marginTop: 12 }}>
                        <Field label="Tipo de combustible">
                          <EcoSelect
                            value={fuelType}
                            onChange={(event) => setFuelType(event.target.value)}
                            options={[
                              { value: "Diesel", label: "Diesel" },
                              { value: "Gasolina", label: "Gasolina" },
                            ]}
                          />
                        </Field>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <Field
                        label="Actividad / descripcion"
                        required
                        error={touched && errors.activity}
                        helper={
                          cat === "electricidad"
                            ? "Ej: Iluminacion y equipos del aula"
                            : "Ej: Riego y traslado de materiales"
                        }
                      >
                        <EcoInput
                          value={activity}
                          onChange={(event) => setActivity(event.target.value)}
                          placeholder={
                            cat === "electricidad"
                              ? "Centro de computo 1 (equipos encendidos)"
                              : "Tractor (riego / traslado)"
                          }
                          hasError={touched && errors.activity}
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section title="Consumo y factor de emision" icon={<Beaker size={14} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label={`Consumo (${unit})`} required error={touched && errors.value}>
                        <EcoInput
                          value={value}
                          onChange={(event) => setValue(event.target.value)}
                          inputMode="decimal"
                          placeholder={cat === "electricidad" ? "1250" : "35"}
                          hasError={touched && errors.value}
                          mono
                          unit={unit}
                        />
                      </Field>

                      <Field
                        label={`Factor (kgCO2e/${unit})`}
                        required
                        error={touched && errors.factor}
                        helper={cat === "electricidad" ? "SEMARNAT 2024" : "INECC 2023"}
                      >
                        <EcoInput
                          value={String(factor)}
                          onChange={(event) => setFactor(event.target.value)}
                          inputMode="decimal"
                          hasError={touched && errors.factor}
                          mono
                          unit={`kgCO2e/${unit}`}
                        />
                      </Field>
                    </div>
                  </Section>

                  <Field label="Nota (opcional)" helper="Observaciones sobre este registro, max 250 caracteres">
                    <EcoInput
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Ej: Lectura parcial del medidor, pendiente evidencia"
                    />
                  </Field>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="Evidencia disponible">
                      <button
                        type="button"
                        onClick={() => {
                          setEvidenceEnabled((prev) => {
                            if (prev) {
                              setEvidenceDataUrl("");
                              setEvidenceName("");
                              setEvidenceError("");
                            }
                            return !prev;
                          });
                        }}
                        style={{
                          width: "100%",
                          height: 40,
                          borderRadius: "var(--eco-radius-md)",
                          border: `1px solid ${evidenceEnabled ? "var(--eco-primary-300)" : "var(--eco-gray-300)"}`,
                          background: evidenceEnabled ? "var(--eco-primary-50)" : "white",
                          padding: "0 10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontFamily: fb,
                          fontSize: 13,
                          color: "var(--eco-gray-700)",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{evidenceEnabled ? "Activada" : "Desactivada"}</span>
                        <span
                          style={{
                            width: 38,
                            height: 22,
                            borderRadius: 999,
                            position: "relative",
                            background: evidenceEnabled ? "var(--eco-primary-500)" : "var(--eco-gray-300)",
                            display: "inline-block",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: 2,
                              left: evidenceEnabled ? 18 : 2,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "white",
                              boxShadow: "0 1px 3px rgba(15,23,42,.25)",
                              transition: "left 150ms",
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
                        helper="Sube una foto o captura del recibo/medicion (max. 2 MB)"
                      >
                        <label
                          style={{
                            height: 40,
                            borderRadius: "var(--eco-radius-md)",
                            border: `1px dashed ${
                              (touched && errors.evidence) || evidenceError ? "var(--eco-danger)" : "var(--eco-gray-300)"
                            }`,
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            fontFamily: fb,
                            fontSize: 13,
                            color: "var(--eco-gray-600)",
                          }}
                        >
                          <ImagePlus size={15} />
                          {evidenceName || "Seleccionar imagen o captura"}
                          <input type="file" accept="image/*" capture="environment" onChange={handleEvidenceChange} style={{ display: "none" }} />
                        </label>

                        {evidenceDataUrl && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 8,
                              borderRadius: "var(--eco-radius-md)",
                              border: "1px solid var(--eco-gray-200)",
                              background: "var(--eco-gray-50)",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <img
                              src={evidenceDataUrl}
                              alt="Vista previa de evidencia"
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: "var(--eco-radius-sm)",
                                border: "1px solid var(--eco-gray-200)",
                              }}
                            />
                            <span
                              style={{
                                flex: 1,
                                fontFamily: fb,
                                fontSize: 12,
                                color: "var(--eco-gray-600)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {evidenceName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEvidenceDataUrl("");
                                setEvidenceName("");
                                setEvidenceError("");
                              }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "var(--eco-radius-sm)",
                                border: "1px solid var(--eco-gray-200)",
                                background: "white",
                                color: "var(--eco-gray-500)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </Field>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Section title="Conectar dispositivo" icon={<PlugZap size={14} />}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          height: 36,
                          padding: "0 12px",
                          borderRadius: "var(--eco-radius-md)",
                          border: "1px solid var(--eco-gray-200)",
                          background: "white",
                          color: "var(--eco-gray-700)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontFamily: fb,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Upload size={14} />
                        Subir .json
                      </button>

                      <div
                        style={{
                          height: 36,
                          padding: "0 12px",
                          borderRadius: "var(--eco-radius-md)",
                          border: "1px solid var(--eco-gray-200)",
                          background: "var(--eco-gray-50)",
                          color: "var(--eco-gray-500)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          fontFamily: fb,
                          fontSize: 12,
                        }}
                      >
                        <FileJson size={14} />
                        {deviceFileName || "Sin archivo"}
                      </div>
                    </div>

                    <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleDeviceFile} style={{ display: "none" }} />

                    <Field label="Pegar JSON" helper="Simula la conexion del dispositivo pegando la lectura o subiendo un archivo.">
                      <textarea
                        value={deviceInput}
                        onChange={(event) => processDeviceInput(event.target.value, event.target.value.trim() ? "JSON pegado" : "")}
                        rows={10}
                        spellCheck={false}
                        style={{
                          width: "100%",
                          borderRadius: "var(--eco-radius-md)",
                          border: `1px solid ${
                            deviceStatus === "error" ? "var(--eco-danger)" : deviceStatus === "ready" ? "var(--eco-primary-300)" : "var(--eco-gray-300)"
                          }`,
                          background: "white",
                          padding: 12,
                          fontFamily: fm,
                          fontSize: 12,
                          color: "var(--eco-gray-800)",
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                    </Field>

                    <div style={{ marginTop: 12 }}>
                      {deviceStatus === "empty" && (
                        <DeviceNotice
                          tone="info"
                          title="Sin lectura cargada"
                          body="Pega el JSON del ESP32 o sube un archivo .json para preparar el registro."
                        />
                      )}

                      {deviceStatus === "loading" && (
                        <DeviceNotice
                          tone="info"
                          title="Procesando lectura"
                          body="Validando schemaVersion, deviceId, timestamp, energy.totalKWh e intervalSeconds."
                        />
                      )}

                      {deviceStatus === "error" && (
                        <DeviceNotice
                          tone="error"
                          title="JSON invalido"
                          body={`0 validas y ${deviceCounts.invalid || 0} invalidas.`}
                          lines={deviceErrors}
                        />
                      )}

                      {(deviceStatus === "warn" || deviceStatus === "ready") && deviceSummary && (
                        <DeviceNotice
                          tone={deviceWarnings.length ? "warn" : "success"}
                          title={deviceCounts.valid > 1 ? "Lote listo para importar" : "Lectura lista"}
                          body={
                            deviceCounts.valid > 1
                              ? `${deviceCounts.registrable} de ${deviceCounts.valid} lecturas validas se pueden registrar ahora.`
                              : "La lectura ya se tradujo al formato de CarbonTrack."
                          }
                          lines={deviceWarnings}
                        />
                      )}
                    </div>
                  </Section>

                  <Section title="Vincular dispositivo" icon={<Building2 size={14} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="deviceId">
                        <EcoInput value={devicePayload?.deviceId || deviceBinding.deviceId || ""} mono readOnly placeholder="esp32-ct-001" />
                      </Field>

                      <Field label="campusCode">
                        <EcoInput
                          value={deviceBinding.campusCode || ""}
                          onChange={(event) => setDeviceBinding((prev) => ({ ...prev, campusCode: event.target.value }))}
                          mono
                          placeholder="campus-carbontrack"
                        />
                      </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      <Field label="Area vinculada">
                        <EcoSelect
                          value={deviceBinding.areaCode || area}
                          onChange={(event) => {
                            setDeviceBinding((prev) => ({ ...prev, areaCode: event.target.value }));
                            setArea(event.target.value);
                          }}
                          options={AREAS}
                        />
                      </Field>

                      <Field label="Intervalo por defecto (s)">
                        <EcoInput
                          value={String(deviceBinding.defaults?.intervalSeconds || "")}
                          onChange={(event) =>
                            setDeviceBinding((prev) => ({
                              ...prev,
                              defaults: { ...prev.defaults, intervalSeconds: event.target.value },
                            }))
                          }
                          mono
                          inputMode="numeric"
                        />
                      </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      <Field label="Voltaje por defecto">
                        <EcoInput
                          value={String(deviceBinding.defaults?.voltage || "")}
                          onChange={(event) =>
                            setDeviceBinding((prev) => ({
                              ...prev,
                              defaults: { ...prev.defaults, voltage: event.target.value },
                            }))
                          }
                          mono
                          inputMode="decimal"
                        />
                      </Field>

                      <Field label="Power factor por defecto">
                        <EcoInput
                          value={String(deviceBinding.defaults?.powerFactor || "")}
                          onChange={(event) =>
                            setDeviceBinding((prev) => ({
                              ...prev,
                              defaults: { ...prev.defaults, powerFactor: event.target.value },
                            }))
                          }
                          mono
                          inputMode="decimal"
                        />
                      </Field>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={saveBindingDraft}
                        disabled={!devicePayload?.deviceId}
                        style={{
                          height: 38,
                          padding: "0 14px",
                          borderRadius: "var(--eco-radius-md)",
                          border: "1px solid var(--eco-primary-300)",
                          background: devicePayload?.deviceId ? "var(--eco-primary-50)" : "var(--eco-gray-100)",
                          color: devicePayload?.deviceId ? "var(--eco-primary-700)" : "var(--eco-gray-400)",
                          fontFamily: fb,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: devicePayload?.deviceId ? "pointer" : "not-allowed",
                        }}
                      >
                        Guardar vinculacion
                      </button>
                    </div>
                  </Section>

                  <Section title="Resumen de lectura" icon={<Calculator size={14} />}>
                    {deviceSummary ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "Lecturas en lote", value: `${deviceCounts.valid} validas / ${deviceCounts.invalid} invalidas` },
                          { label: "Se registraran", value: `${deviceCounts.registrable} lectura(s)` },
                          { label: "Total kWh actual", value: `${formatNumber(deviceSummary.totalKWh)} kWh` },
                          {
                            label: "deltaKWh usado",
                            value:
                              deviceSummary.deltaKWh == null ? "No disponible" : `${formatNumber(deviceSummary.deltaKWh)} kWh`,
                          },
                          { label: "kWh registrado", value: `${formatNumber(deviceSummary.registeredKWh)} kWh` },
                          { label: "CO2e estimado", value: `${formatNumber(previewCo2eKg, 2)} kgCO2e` },
                          {
                            label: "Origen del delta",
                            value: deviceSummary.deltaSource === "payload" ? "deltaKWh del JSON" : "Ultimo total guardado",
                          },
                        ].map((row) => (
                          <div
                            key={row.label}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              borderRadius: "var(--eco-radius-sm)",
                              background: "var(--eco-gray-50)",
                              border: "1px solid var(--eco-gray-200)",
                            }}
                          >
                            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{row.label}</span>
                            <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-gray-800)" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <DeviceNotice
                        tone="info"
                        title="Esperando lectura"
                        body="Cuando el JSON sea valido, aqui veras el total, el delta usado y el CO2e estimado."
                      />
                    )}
                  </Section>

                  <Section title="Factor y nota" icon={<Beaker size={14} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Factor (kgCO2e/kWh)">
                        <EcoInput
                          value={String(factor)}
                          onChange={(event) => setFactor(event.target.value)}
                          inputMode="decimal"
                          mono
                          unit="kgCO2e/kWh"
                        />
                      </Field>

                      <Field label="Nota (opcional)">
                        <EcoInput value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observaciones sobre la lectura" />
                      </Field>
                    </div>
                  </Section>
                </>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <CalcResult
                numericValue={recordMode === "device" ? previewValue : numericValue}
                unit={recordMode === "device" ? "kWh" : unit}
                factorNum={factorNum}
                co2eKg={recordMode === "device" ? previewCo2eKg : co2eKg}
                co2eT={recordMode === "device" ? previewCo2eT : co2eT}
              />

              <div
                style={{
                  background: "var(--eco-gray-50)",
                  border: "1px solid var(--eco-gray-200)",
                  borderRadius: "var(--eco-radius-lg)",
                  padding: 14,
                }}
              >
                <p style={{ fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", margin: "0 0 10px" }}>
                  Resumen del registro
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Categoria", value: categoryLabel },
                    { label: "Modo", value: recordMode === "device" ? "Dispositivo" : "Manual" },
                    { label: "Tipo de dato", value: previewEstimated ? "Estimado" : "Real" },
                    { label: "Area", value: AREAS.find((item) => item.value === area)?.label || area },
                    { label: "Fecha", value: formatDateLabel(date) },
                    { label: "Fuente", value: SOURCES.find((item) => item.value === previewSource)?.label || previewSource },
                    { label: "Actividad", value: previewActivity || "Pendiente" },
                    {
                      label: "Consumo",
                      value: `${formatNumber(previewValue)} ${recordMode === "device" ? "kWh" : unit}`,
                    },
                    {
                      label: "Evidencia",
                      value: recordMode === "device" ? "No aplica" : evidenceEnabled ? evidenceName || "Pendiente de carga" : "No disponible",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: "var(--eco-radius-sm)",
                        background: "white",
                        border: "1px solid var(--eco-gray-100)",
                      }}
                    >
                      <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{row.label}</span>
                      <span
                        style={{
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--eco-gray-700)",
                          textAlign: "right",
                          maxWidth: "58%",
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: "var(--eco-radius-md)",
                  background: "var(--eco-info-bg)",
                  border: "1px solid #BFDBFE",
                }}
              >
                <Info size={15} style={{ color: "var(--eco-info)", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", margin: 0, lineHeight: 1.5 }}>
                  {recordMode === "device"
                    ? "La conexion actual es simulada: acepta una lectura, un arreglo de lecturas o NDJSON para importar el lote."
                    : "El calculo usa la formula consumo x factor = CO2e. Adjunta evidencia con foto o captura para validar el registro."}
                </p>
              </div>

              {deviceToast && <DeviceNotice tone="success" title={deviceToast.title} body={deviceToast.message} />}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--eco-gray-100)",
            flexShrink: 0,
            background: "var(--eco-gray-50)",
          }}
        >
          <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: 0 }}>
            {touched && !canSave ? (
              <span style={{ color: "var(--eco-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={12} />
                {recordMode === "device" ? "Carga una lectura valida para registrar" : "Completa los campos requeridos"}
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: fm }}>Esc</span>
                para cerrar
              </span>
            )}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: "var(--eco-radius-md)",
                background: "white",
                border: "1px solid var(--eco-gray-200)",
                fontFamily: fb,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--eco-gray-700)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSave}
              style={{
                height: 40,
                padding: "0 20px",
                borderRadius: "var(--eco-radius-md)",
                background: saving ? "var(--eco-gray-300)" : canSave ? "var(--eco-primary-500)" : "var(--eco-gray-200)",
                color: canSave || saving ? "white" : "var(--eco-gray-500)",
                border: "none",
                fontFamily: fb,
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "wait" : canSave ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: canSave && !saving ? "0 2px 8px rgba(34,197,94,0.25)" : "none",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={15} style={{ animation: "eco-spin 0.8s linear infinite" }} />
                  {recordMode === "device" ? "Procesando..." : "Guardando..."}
                </>
              ) : (
                <>
                  {recordMode === "device" ? <PlugZap size={15} /> : <Save size={15} />}
                  {recordMode === "device"
                    ? deviceCounts.valid > 1
                      ? `Importar ${deviceCounts.registrable || deviceCounts.valid} lecturas`
                      : "Tomar lectura y registrar"
                    : "Guardar y calcular CO2e"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
