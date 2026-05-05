import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  HelpCircle,
  Info,
  Link as LinkIcon,
  Monitor,
  MoonStar,
  RefreshCcw,
  Settings2,
  ShieldAlert,
  SunMedium,
  TimerReset,
  Workflow,
  Leaf,
  Activity,
  Check,
} from "lucide-react";
import { getBindingsMap } from "../lib/deviceBinding";
import { fetchDefaultFactorValue } from "../api/factors";
import { applySettings, fetchSettings, normalizeSettings, persistSettings, resetSettings } from "../api/settings";
import { isBackendConfigured } from "../api/config";
import { canUse } from "../lib/permissions";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const APP_VERSION = "1.0.0";
const backendConfigured = isBackendConfigured();
const TIMEZONE_OPTIONS = ["America/Monterrey", "America/Mexico_City", "UTC"];
const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: SunMedium, desc: "Tema luminoso" },
  { value: "dark", label: "Oscuro", icon: MoonStar, desc: "Modo nocturno" },
  { value: "system", label: "Sistema", icon: Monitor, desc: "Automático" },
];
const INTERVAL_OPTIONS = [
  { value: 60, label: "60 segundos" },
  { value: 300, label: "5 minutos" },
  { value: 900, label: "15 minutos" },
  { value: 3600, label: "60 minutos" },
];
const SHORTCUTS = [
  { label: "Factores de emisión", path: "/catalogos/factores" },
  { label: "Equipos registrados", path: "/catalogos/equipos" },
  { label: "Reportes", path: "/reportes" },
];

const pageWrap = {
  padding: "var(--page-pad-y) var(--page-pad-x)",
  maxWidth: "var(--content-max)",
  margin: "0 auto",
};

const sectionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
  gap: "var(--card-gap)",
  marginBottom: "var(--section-gap)",
};

const cardBase = {
  background: "var(--eco-card)",
  border: "1px solid var(--eco-border)",
  borderRadius: "var(--eco-radius-lg)",
  boxShadow: "var(--eco-shadow-sm)",
  padding: 24,
  transition: "box-shadow 0.25s ease, border-color 0.25s ease",
};

const inputBase = {
  width: "100%",
  height: 42,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 14px",
  background: "var(--eco-input-bg)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const subtleText = {
  margin: 0,
  fontFamily: fb,
  fontSize: 12,
  color: "var(--eco-text-soft)",
  lineHeight: 1.55,
};

const ICON_GRADIENT = "linear-gradient(135deg, var(--eco-primary-500), var(--eco-primary-600))";

/* ─── Animating card wrapper ─── */
function AnimatedCard({ children, delay = 0, style = {} }) {
  return (
    <section
      style={{
        ...cardBase,
        ...style,
        animation: `eco-fadeInUp 0.45s ease ${delay}ms both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--eco-shadow-md)";
        e.currentTarget.style.borderColor = "var(--eco-primary-200)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
        e.currentTarget.style.borderColor = "var(--eco-border)";
      }}
    >
      {children}
    </section>
  );
}

/* ─── Section header with gradient icon ─── */
function SectionLabel({ icon, title, description }) {
  const Icon = icon;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--eco-radius-md)",
          background: ICON_GRADIENT,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(34,197,94,0.22)",
        }}
      >
        <Icon size={19} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-text-strong)", letterSpacing: "-0.01em" }}>{title}</h2>
        {description && <p style={{ ...subtleText, marginTop: 4 }}>{description}</p>}
      </div>
    </div>
  );
}

/* ─── Form field ─── */
function Field({ label, hint, children, error }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text)", letterSpacing: "0.01em" }}>{label}</span>
      {children}
      {hint && <span style={subtleText}>{hint}</span>}
      {error && (
        <span style={{ ...subtleText, color: "var(--eco-danger)", display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={11} />
          {error}
        </span>
      )}
    </label>
  );
}

/* ─── Toggle switch ─── */
function ToggleRow({ label, hint, checked, onChange }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        borderRadius: "var(--eco-radius-md)",
        border: `1.5px solid ${checked ? "var(--eco-primary-300)" : hovered ? "var(--eco-primary-200)" : "var(--eco-border)"}`,
        background: checked ? "var(--eco-primary-50)" : "var(--eco-card)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
      }}
    >
      <div>
        <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text)" }}>{label}</p>
        <p style={{ ...subtleText, marginTop: 3 }}>{hint}</p>
      </div>
      <span
        aria-hidden="true"
        style={{
          width: 46,
          height: 26,
          borderRadius: "var(--eco-radius-full)",
          background: checked ? "var(--eco-primary-500)" : "var(--eco-gray-300)",
          padding: 3,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
          flexShrink: 0,
          transition: "background 0.25s ease",
          boxShadow: checked ? "0 0 0 3px rgba(34,197,94,0.12)" : "none",
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#FAFBFC",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transition: "transform 0.2s cubic-bezier(.4,0,.2,1)",
            transform: checked ? "scale(1.05)" : "scale(1)",
          }}
        />
      </span>
    </button>
  );
}

/* ─── Action button with hover state ─── */
function ActionButton({ tone = "default", icon, children, ...props }) {
  const [hovered, setHovered] = useState(false);
  const tones = {
    default: {
      background: hovered ? "var(--eco-gray-50)" : "var(--eco-card)",
      color: "var(--eco-text)",
      border: "1.5px solid var(--eco-border)",
    },
    primary: {
      background: hovered ? "var(--eco-primary-600)" : "var(--eco-primary-500)",
      color: "white",
      border: "1.5px solid var(--eco-primary-500)",
      boxShadow: hovered ? "0 4px 12px rgba(34,197,94,0.25)" : "none",
    },
    danger: {
      background: hovered ? "rgba(220,38,38,0.12)" : "var(--eco-danger-bg)",
      color: "var(--eco-danger)",
      border: "1.5px solid rgba(220,38,38,0.28)",
    },
  }[tone];
  const Icon = icon;
  return (
    <button
      {...props}
      onMouseEnter={(e) => { setHovered(true); props.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); props.onMouseLeave?.(e); }}
      style={{
        height: 40,
        padding: "0 16px",
        borderRadius: "var(--eco-radius-md)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontFamily: fb,
        fontSize: 13,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: props.disabled ? 0.55 : 1,
        transition: "all 0.2s ease",
        ...tones,
      }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/* ─── Stat mini-card ─── */
function StatMini({ icon, label, value, accent }) {
  const Icon = icon;
  return (
    <div
      style={{
        borderRadius: "var(--eco-radius-md)",
        border: "1px solid var(--eco-border)",
        background: "var(--eco-card-muted)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon size={13} style={{ color: accent || "var(--eco-text-soft)" }} />
        <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>{label}</p>
      </div>
      <p style={{ margin: 0, fontFamily: fm, fontSize: 20, fontWeight: 700, color: accent || "var(--eco-text-strong)", lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

/* ─── Toast notification ─── */
function Toast({ toast }) {
  if (!toast) return null;
  const tones = {
    success: { icon: CheckCircle2, bg: "var(--eco-success-bg)", color: "var(--eco-success)", accent: "rgba(34,197,94,0.15)" },
    error: { icon: AlertCircle, bg: "var(--eco-danger-bg)", color: "var(--eco-danger)", accent: "rgba(220,38,38,0.15)" },
    info: { icon: Info, bg: "var(--eco-info-bg)", color: "var(--eco-info)", accent: "rgba(37,99,235,0.15)" },
  };
  const tone = tones[toast.tone || "success"];
  const Icon = tone.icon;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 120,
        minWidth: 300,
        maxWidth: 380,
        background: "var(--eco-card)",
        border: "1px solid var(--eco-border)",
        borderRadius: "var(--eco-radius-lg)",
        boxShadow: "var(--eco-shadow-xl)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "eco-scaleIn 0.28s ease both",
        borderLeft: `3px solid ${tone.color}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--eco-radius-md)",
          background: tone.bg,
          color: tone.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong)" }}>{toast.title}</p>
        <p style={{ ...subtleText, marginTop: 4 }}>{toast.message}</p>
      </div>
    </div>
  );
}

/* ─── Skeleton loader ─── */
function SkeletonCard({ delay = 0 }) {
  const shimmer = {
    background: "linear-gradient(90deg,var(--eco-gray-100) 25%,var(--eco-border) 50%,var(--eco-gray-100) 75%)",
    backgroundSize: "200% 100%",
  };
  return (
    <div style={{ ...cardBase, minHeight: 240, animation: `eco-fadeIn 0.3s ease ${delay}ms both` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: "var(--eco-radius-md)", ...shimmer, animation: "eco-shimmer 1.3s ease-in-out infinite" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: "50%", borderRadius: 6, ...shimmer, animation: "eco-shimmer 1.3s ease-in-out infinite" }} />
          <div style={{ height: 10, width: "70%", borderRadius: 6, marginTop: 8, ...shimmer, animation: "eco-shimmer 1.3s ease-in-out 80ms infinite" }} />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 48, borderRadius: "var(--eco-radius-md)", ...shimmer, animation: `eco-shimmer 1.3s ease-in-out ${(i + 1) * 100}ms infinite`, marginBottom: 12 }} />
      ))}
    </div>
  );
}

/* ─── Storage usage bar ─── */


/* ─── Themed input with focus ring ─── */
function StyledInput(props) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...inputBase,
        ...(focused ? {
          borderColor: "var(--eco-primary-400)",
          boxShadow: "0 0 0 3px rgba(34,197,94,0.10)",
        } : {}),
        ...props.style,
      }}
    />
  );
}

function StyledSelect(props) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...inputBase,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 34,
        cursor: "pointer",
        ...(focused ? {
          borderColor: "var(--eco-primary-400)",
          boxShadow: "0 0 0 3px rgba(34,197,94,0.10)",
        } : {}),
        ...props.style,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   SettingsPage
   ═══════════════════════════════════════════════════════ */
export default function SettingsPage({ user }) {
  const navigate = useNavigate();
  const saveTimerRef = useRef(null);
  const initializedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState(() => fetchSettings());
  const [bindingMap, setBindingMap] = useState({});
  const [factorHints, setFactorHints] = useState({ electricity: null, fuel: null });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const savedTimerRef = useRef(null);
  const canEditSettings = canUse(user, "settings:edit");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [electricityFactor, fuelFactor] = await Promise.all([
          fetchDefaultFactorValue("scope2", "electricidad").catch(() => null),
          fetchDefaultFactorValue("scope1", "combustible").catch(() => null),
        ]);
        if (!active) return;
        setSettings(fetchSettings());
        setBindingMap(getBindingsMap());
        setFactorHints({
          electricity: electricityFactor,
          fuel: fuelFactor,
        });
        initializedRef.current = true;
        setLoading(false);
      } catch {
        if (!active) return;
        setError("No se pudo cargar configuración. Restablece a valores por defecto.");
        setLoading(false);
      }
    };

    load();

    const handleExternalRefresh = () => {
      setBindingMap(getBindingsMap());
      setSettings(fetchSettings());
    };

    window.addEventListener("carbontrack:storage-restored", handleExternalRefresh);

    return () => {
      active = false;
      window.removeEventListener("carbontrack:storage-restored", handleExternalRefresh);
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current || loading) return;
    setDirty(true);
  }, [settings, loading]);

  const handleManualSave = async () => {
    if (!dirty || saving) return;
    if (!canEditSettings) {
      setToast({ tone: "info", title: "Permiso insuficiente", message: "Tu rol no permite realizar esta acción." });
      return;
    }
    setSaving(true);
    window.clearTimeout(saveTimerRef.current);
    window.clearTimeout(savedTimerRef.current);
    try {
      const persisted = await persistSettings(settings);
      setSettings(persisted);
      setError("");
      setSaved(true);
      setDirty(false);
      savedTimerRef.current = window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const bindingEntries = useMemo(() => Object.values(bindingMap || {}), [bindingMap]);
  const connectedSummary = bindingEntries.length
    ? `${bindingEntries[0]?.deviceId || "Sin ID"}${bindingEntries.length > 1 ? ` y ${bindingEntries.length - 1} más` : ""}`
    : "Sin binding activo";

  const errors = useMemo(() => {
    const next = {};
    if (!(Number(settings.defaults.assumedVoltageVrms) > 0)) next.vrms = "El voltaje debe ser mayor a 0.";
    const pf = Number(settings.defaults.assumedPowerFactor);
    if (!(pf >= 0 && pf <= 1)) next.powerFactor = "El factor de potencia debe estar entre 0 y 1.";
    if (![60, 300, 900, 3600].includes(Number(settings.defaults.defaultIntervalSeconds))) next.interval = "Selecciona un intervalo permitido.";
    if (Number(settings.rounding.co2eDecimals) < 0 || Number(settings.rounding.co2eDecimals) > 4) next.co2eDecimals = "Usa entre 0 y 4 decimales.";
    if (Number(settings.rounding.activityDecimals) < 0 || Number(settings.rounding.activityDecimals) > 4) next.activityDecimals = "Usa entre 0 y 4 decimales.";
    return next;
  }, [settings]);

  const updateSettings = (updater) => {
    if (!canEditSettings) {
      setToast({ tone: "info", title: "Permiso insuficiente", message: "Tu rol no permite realizar esta acción." });
      return;
    }
    setSettings((current) => {
      const next = normalizeSettings(typeof updater === "function" ? updater(current) : updater);
      applySettings(next);
      return next;
    });
  };

  const restoreDefaults = async () => {
    if (!canEditSettings) {
      setToast({ tone: "info", title: "Permiso insuficiente", message: "Tu rol no permite realizar esta acción." });
      return;
    }
    try {
      const next = await resetSettings();
      setSettings(next);
      setDirty(false);
      setError("");
      setToast({ tone: "success", title: "Configuración restaurada", message: "Se aplicaron los valores por defecto." });
    } catch {
      setToast({ tone: "error", title: "No se pudo restaurar", message: "El backend no aceptó la configuración por defecto." });
    }
  };

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, animation: "eco-fadeIn 0.3s ease both" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--eco-radius-lg)", background: ICON_GRADIENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings2 size={22} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-text-strong)" }}>Configuración</h1>
            </div>
          </div>
          <p style={{ ...subtleText, marginTop: 6, marginLeft: 54 }}>Cargando tus preferencias...</p>
        </div>
        {false && <div style={sectionGrid}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={80} />
          <SkeletonCard delay={160} />
          <SkeletonCard delay={240} />
        </div>}
      </div>
    );
  }

  return (
    <>
      <div style={pageWrap}>
        {/* ─── Page header ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
            animation: "eco-fadeInUp 0.4s ease both",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--eco-radius-lg)",
                background: ICON_GRADIENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(34,197,94,0.2)",
                flexShrink: 0,
              }}
            >
              <Settings2 size={24} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-0.02em" }}>Configuración</h1>
                {(saving || saved) && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 10px",
                      borderRadius: "var(--eco-radius-full)",
                      background: saving ? "var(--eco-warning-bg)" : "var(--eco-success-bg)",
                      color: saving ? "var(--eco-secondary-600)" : "var(--eco-success)",
                      fontFamily: fb,
                      fontSize: 11,
                      fontWeight: 600,
                      animation: "eco-scaleIn 0.25s cubic-bezier(.33,1,.68,1) both",
                      transition: "background 0.3s ease, color 0.3s ease",
                    }}
                  >
                    {saving ? (
                      <span style={{ width: 12, height: 12, border: "2px solid var(--eco-secondary-600)", borderTopColor: "transparent", borderRadius: "50%", animation: "eco-spin 0.6s linear infinite", flexShrink: 0 }} />
                    ) : (
                      <Check size={12} />
                    )}
                    {saving ? "Guardando..." : "Guardado"}
                  </span>
                )}
              </div>
              <p style={{ ...subtleText, marginTop: 5, maxWidth: 560 }}>
                Personaliza la interfaz, ajusta parámetros de cálculo y administra la información disponible en este entorno.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionButton type="button" tone="primary" icon={saving ? null : Check} onClick={handleManualSave} disabled={!dirty || saving || !canEditSettings}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </ActionButton>
            <ActionButton type="button" icon={RefreshCcw} onClick={restoreDefaults} disabled={!canEditSettings}>
              Restablecer preferencias
            </ActionButton>
          </div>
        </div>

        {/* ─── Error banner ─── */}
        {error && (
          <div
            role="alert"
            style={{
              ...cardBase,
              borderColor: "rgba(220,38,38,0.28)",
              background: "var(--eco-danger-bg)",
              marginBottom: "var(--section-gap)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              animation: "eco-shake 0.4s ease",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "var(--eco-radius-md)", background: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertCircle size={18} style={{ color: "var(--eco-danger)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-danger)" }}>Error de configuración</p>
              <p style={{ ...subtleText, color: "var(--eco-danger)", marginTop: 4, opacity: 0.85 }}>{error}</p>
            </div>
            <ActionButton type="button" tone="danger" icon={RefreshCcw} onClick={restoreDefaults} disabled={!canEditSettings}>Usar valores por defecto</ActionButton>
          </div>
        )}

        {/* ═══ Row 1: Apariencia + Formato ═══ */}
        <div style={sectionGrid}>
          <AnimatedCard delay={60}>
            <SectionLabel icon={SunMedium} title="Apariencia" description="Define el aspecto visual de CarbonTrack: tema de color, densidad y comportamiento de la interfaz." />
            <div style={{ display: "grid", gap: 14 }}>
              {/* Theme picker */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = settings.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateSettings((current) => ({ ...current, theme: option.value }))}
                      style={{
                        borderRadius: "var(--eco-radius-md)",
                        border: `1.5px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
                        background: active ? "var(--eco-primary-50)" : "var(--eco-card)",
                        color: active ? "var(--eco-primary-700)" : "var(--eco-text)",
                        padding: "16px 12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: fb,
                        fontSize: 12,
                        fontWeight: 600,
                        position: "relative",
                        transition: "all 0.2s ease",
                        boxShadow: active ? "0 0 0 3px rgba(34,197,94,0.08)" : "none",
                      }}
                    >
                      {active && (
                        <span
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "var(--eco-primary-500)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            animation: "eco-scaleIn 0.2s ease both",
                          }}
                        >
                          <Check size={10} color="white" strokeWidth={3} />
                        </span>
                      )}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--eco-radius-md)",
                          background: active ? "var(--eco-primary-100)" : "var(--eco-gray-100)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s ease",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      {option.label}
                      <span style={{ fontWeight: 400, fontSize: 10, color: "var(--eco-text-soft)", marginTop: -4 }}>{option.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ borderTop: "1px solid var(--eco-border)", paddingTop: 14 }}>
                <p style={{ ...subtleText, fontWeight: 600, color: "var(--eco-text)", marginBottom: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preferencias de interfaz</p>
                <div style={{ display: "grid", gap: 10 }}>
                  <ToggleRow label="Reducir animaciones" hint="Desactiva transiciones y animaciones no esenciales." checked={settings.ui.reducedMotion} onChange={(v) => updateSettings((c) => ({ ...c, ui: { ...c.ui, reducedMotion: v } }))} />
                  <ToggleRow label="Modo compacto" hint="Reduce espaciado para aprovechar mejor la pantalla." checked={settings.ui.denseMode} onChange={(v) => updateSettings((c) => ({ ...c, ui: { ...c.ui, denseMode: v } }))} />
                  <ToggleRow label="Mostrar tooltips" hint="Mantiene activas las ayudas contextuales." checked={settings.ui.showTooltips} onChange={(v) => updateSettings((c) => ({ ...c, ui: { ...c.ui, showTooltips: v } }))} />
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={120}>
            <SectionLabel icon={Workflow} title="Formato y unidades" description="Controla unidades, formato de fecha, redondeo y zona horaria para reportes y vistas." />
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Unidad de CO₂e" hint="Preferencia visual general; cada pantalla puede mostrar su propio detalle.">
                <StyledSelect value={settings.units.co2e} onChange={(e) => updateSettings((c) => ({ ...c, units: { ...c.units, co2e: e.target.value } }))}>
                  <option value="kg">kg CO₂e</option>
                  <option value="t">t CO₂e</option>
                </StyledSelect>
              </Field>

              <div>
                <p style={{ ...subtleText, fontWeight: 600, color: "var(--eco-text)", marginBottom: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Precisión decimal</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <Field label="Decimales CO₂e" error={errors.co2eDecimals}>
                    <StyledInput type="number" min="0" max="4" value={settings.rounding.co2eDecimals} onChange={(e) => updateSettings((c) => ({ ...c, rounding: { ...c.rounding, co2eDecimals: Number(e.target.value) } }))} />
                  </Field>
                  <Field label="Decimales actividad" error={errors.activityDecimals}>
                    <StyledInput type="number" min="0" max="4" value={settings.rounding.activityDecimals} onChange={(e) => updateSettings((c) => ({ ...c, rounding: { ...c.rounding, activityDecimals: Number(e.target.value) } }))} />
                  </Field>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--eco-border)", paddingTop: 14 }}>
                <p style={{ ...subtleText, fontWeight: 600, color: "var(--eco-text)", marginBottom: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Localización</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <Field label="Formato de fecha">
                    <StyledSelect value={settings.locale.dateFormat} onChange={(e) => updateSettings((c) => ({ ...c, locale: { ...c.locale, dateFormat: e.target.value } }))}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (MX)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    </StyledSelect>
                  </Field>
                  <Field label="Zona horaria">
                    <StyledSelect value={settings.locale.timezone} onChange={(e) => updateSettings((c) => ({ ...c, locale: { ...c.locale, timezone: e.target.value } }))}>
                      {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz.replace("America/", "")}</option>)}
                    </StyledSelect>
                  </Field>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* ═══ Row 2: Parámetros + Dispositivos ═══ */}
        <div style={sectionGrid}>
          <AnimatedCard delay={180}>
            <SectionLabel icon={TimerReset} title="Parámetros por defecto" description="Valores de respaldo cuando una lectura no incluye medición real de voltaje o factor de potencia." />
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <p style={{ ...subtleText, fontWeight: 600, color: "var(--eco-text)", marginBottom: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Medición eléctrica</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <Field label="Vrms asumido" error={errors.vrms} hint="Voltaje RMS de referencia.">
                    <StyledInput type="number" min="1" value={settings.defaults.assumedVoltageVrms} onChange={(e) => updateSettings((c) => ({ ...c, defaults: { ...c.defaults, assumedVoltageVrms: Number(e.target.value) } }))} />
                  </Field>
                  <Field label="Factor de potencia" error={errors.powerFactor} hint="Rango válido: 0 a 1.">
                    <StyledInput type="number" min="0" max="1" step="0.01" value={settings.defaults.assumedPowerFactor} onChange={(e) => updateSettings((c) => ({ ...c, defaults: { ...c.defaults, assumedPowerFactor: Number(e.target.value) } }))} />
                  </Field>
                </div>
              </div>

              <Field label="Intervalo de muestreo" error={errors.interval} hint="Frecuencia con la que el dispositivo envía lecturas.">
                <StyledSelect value={settings.defaults.defaultIntervalSeconds} onChange={(e) => updateSettings((c) => ({ ...c, defaults: { ...c.defaults, defaultIntervalSeconds: Number(e.target.value) } }))}>
                  {INTERVAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </StyledSelect>
              </Field>

              <div style={{ borderTop: "1px solid var(--eco-border)", paddingTop: 14 }}>
                <p style={{ ...subtleText, fontWeight: 600, color: "var(--eco-text)", marginBottom: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Factores de emisión</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <Field label="Electricidad (kgCO₂e/kWh)" hint={factorHints.electricity ? `Activo: ${factorHints.electricity.value}` : "Opcional; se usa el del catálogo."}>
                    <StyledInput type="number" step="0.0001" value={settings.defaults.defaultElectricityEF ?? ""} onChange={(e) => updateSettings((c) => ({ ...c, defaults: { ...c.defaults, defaultElectricityEF: e.target.value === "" ? null : Number(e.target.value) } }))} placeholder="Automático" />
                  </Field>
                  <Field label="Combustible (kgCO₂e/L)" hint={factorHints.fuel ? `Activo: ${factorHints.fuel.value}` : "Opcional; se usa el del catálogo."}>
                    <StyledInput type="number" step="0.0001" value={settings.defaults.defaultFuelEF ?? ""} onChange={(e) => updateSettings((c) => ({ ...c, defaults: { ...c.defaults, defaultFuelEF: e.target.value === "" ? null : Number(e.target.value) } }))} placeholder="Automático" />
                  </Field>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={240}>
            <SectionLabel icon={Monitor} title="Dispositivos" description="Bindings activos, respaldos automáticos y estado actual de conexión." />
            <div style={{ display: "grid", gap: 16 }}>
              {/* Connection status */}
              <div
                style={{
                  borderRadius: "var(--eco-radius-md)",
                  border: `1.5px solid ${bindingEntries.length ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                  background: bindingEntries.length ? "var(--eco-primary-50)" : "var(--eco-card-muted)",
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "var(--eco-radius-md)",
                    background: bindingEntries.length ? "var(--eco-primary-100)" : "var(--eco-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Activity size={20} style={{ color: bindingEntries.length ? "var(--eco-primary-600)" : "var(--eco-text-soft)" }} />
                  {bindingEntries.length > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--eco-primary-500)",
                        border: "2px solid var(--eco-card)",
                        animation: "eco-pulse 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-text-strong)" }}>
                      {bindingEntries.length ? `${bindingEntries.length} binding${bindingEntries.length > 1 ? "s" : ""} activo${bindingEntries.length > 1 ? "s" : ""}` : "Sin dispositivos"}
                    </p>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "var(--eco-radius-full)",
                        background: bindingEntries.length ? "var(--eco-success-bg)" : "var(--eco-border)",
                        color: bindingEntries.length ? "var(--eco-success)" : "var(--eco-text-soft)",
                        fontFamily: fb,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {bindingEntries.length ? "Conectado" : "Offline"}
                    </span>
                  </div>
                  <p style={{ ...subtleText, marginTop: 4 }}>{bindingEntries.length ? connectedSummary : "No se han configurado bindings todavía."}</p>
                </div>
              </div>

              <div>
                <p style={{ ...subtleText, fontWeight: 600, color: "var(--eco-text)", marginBottom: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Respaldos</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <Field label="Respaldos automáticos">
                    <StyledSelect value={String(settings.storage.autoBackupEnabled)} onChange={(e) => updateSettings((c) => ({ ...c, storage: { ...c.storage, autoBackupEnabled: e.target.value === "true" } }))}>
                      <option value="false">Desactivados</option>
                      <option value="true">Activados</option>
                    </StyledSelect>
                  </Field>
                  <Field label="Máximo de snapshots">
                    <StyledInput type="number" min="1" max="20" value={settings.storage.autoBackupMax} onChange={(e) => updateSettings((c) => ({ ...c, storage: { ...c.storage, autoBackupMax: Number(e.target.value) } }))} />
                  </Field>
                </div>
              </div>

              <p style={{ ...subtleText, padding: "10px 14px", borderRadius: "var(--eco-radius-md)", background: "var(--eco-card-muted)", border: "1px dashed var(--eco-border)" }}>
                {backendConfigured
                  ? <>Los bindings y snapshots mantienen caché temporal para respuesta rápida y sincronización con backend.</>
                  : <>Los bindings y snapshots se mantienen en almacenamiento del navegador mientras no haya backend configurado.</>}
              </p>
            </div>
          </AnimatedCard>
        </div>

        {/* ═══ Row 3: Datos locales + Sistema ═══ */}
        {false && <div style={sectionGrid}>
          <AnimatedCard delay={300}>
            <SectionLabel icon={Database} title="Datos almacenados" description="Exporta, importa o limpia la información persistida por el frontend en este entorno." />
            <div style={{ display: "grid", gap: 16 }}>
              {/* Storage stats */}
              <div
                style={{
                  borderRadius: "var(--eco-radius-md)",
                  border: "1px solid var(--eco-border)",
                  background: "var(--eco-card-muted)",
                  padding: 16,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
                  <StatMini icon={HardDrive} label="Uso" value={`${usage.kilobytes} KB`} accent="var(--eco-primary-600)" />
                  <StatMini icon={Package} label="Items" value={usage.items} />
                  <StatMini icon={Key} label="Keys" value={getManagedStorageKeys().length} />
                </div>
                <UsageBar used={usage.kilobytes} />
              </div>

              {/* Export / Import */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ActionButton type="button" tone="primary" icon={Download} onClick={handleExport}>
                  Exportar datos
                </ActionButton>
                <ActionButton type="button" icon={Import} onClick={handleImportClick} disabled={importing}>
                  {importing ? "Importando..." : "Importar respaldo"}
                </ActionButton>
                <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportChange} />
              </div>

              {/* Danger zone */}
              <div
                style={{
                  borderRadius: "var(--eco-radius-md)",
                  border: "1.5px solid rgba(220,38,38,0.22)",
                  background: "var(--eco-danger-bg)",
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "var(--eco-radius-md)", background: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldAlert size={15} style={{ color: "var(--eco-danger)" }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-danger)" }}>Zona peligrosa</p>
                    <p style={{ ...subtleText, color: "var(--eco-danger)", opacity: 0.8, marginTop: 2 }}>Esta acción es irreversible.</p>
                  </div>
                </div>
                <p style={{ ...subtleText, color: "var(--eco-danger)", marginBottom: 14, opacity: 0.85 }}>
                  Borra registros, factores, equipos, usuarios, bindings, metas, acciones y configuración guardada en este entorno.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <StyledInput
                    value={resetWord}
                    onChange={(e) => setResetWord(e.target.value)}
                    placeholder='Escribe BORRAR para confirmar'
                    style={{ width: 220, borderColor: "rgba(220,38,38,0.25)" }}
                  />
                  <ActionButton type="button" tone="danger" icon={Trash2} onClick={handleResetAll} disabled={resetWord !== "BORRAR"}>
                    Restablecer todo
                  </ActionButton>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={360}>
            <SectionLabel icon={HelpCircle} title="Información del sistema" description="Resumen del entorno actual y accesos directos de administración." />
            <div style={{ display: "grid", gap: 14 }}>
              {/* System info cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                <div style={{ borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Versión</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Leaf size={14} style={{ color: "var(--eco-primary-500)" }} />
                    <p style={{ margin: 0, fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-text-strong)" }}>v{APP_VERSION}</p>
                  </div>
                </div>
                <div style={{ borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ambiente</p>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 14, fontWeight: 600, color: "var(--eco-text-strong)" }}>{backendConfigured ? "Integrado con backend" : "Sin backend configurado"}</p>
                  <span style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-text-soft)" }}>{backendConfigured ? "Backend configurado por VITE_API_URL" : "Sin backend configurado"}</span>
                </div>
                <div style={{ borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Dispositivo</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: bindingEntries.length ? "var(--eco-success)" : "var(--eco-gray-400)",
                        flexShrink: 0,
                      }}
                    />
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text-strong)" }}>
                      {bindingEntries.length ? "Conectado" : "No conectado"}
                    </p>
                  </div>
                </div>
                <div style={{ borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Última modificación</p>
                  <p style={{ margin: 0, fontFamily: fm, fontSize: 13, fontWeight: 600, color: "var(--eco-text-strong)" }}>
                    {settings.updatedAt.slice(0, 10)}
                  </p>
                  <span style={{ fontFamily: fm, fontSize: 10, color: "var(--eco-text-soft)" }}>
                    {settings.updatedAt.slice(11, 19)}
                  </span>
                </div>
              </div>

              {/* Shortcuts */}
              <div style={{ borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: 16 }}>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 12 }}>Accesos rápidos</p>
                <div style={{ display: "grid", gap: 6 }}>
                  {SHORTCUTS.map((s) => (
                    <button
                      key={s.path}
                      type="button"
                      onClick={() => navigate(s.path)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "var(--eco-radius-md)",
                        border: "1px solid var(--eco-border)",
                        background: "var(--eco-card)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        fontFamily: fb,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--eco-text)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--eco-primary-50)";
                        e.currentTarget.style.borderColor = "var(--eco-primary-200)";
                        e.currentTarget.style.color = "var(--eco-primary-700)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--eco-card)";
                        e.currentTarget.style.borderColor = "var(--eco-border)";
                        e.currentTarget.style.color = "var(--eco-text)";
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <LinkIcon size={13} />
                        {s.label}
                      </span>
                      <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Deploy notes */}
              <div style={{ borderRadius: "var(--eco-radius-md)", padding: "14px 16px", background: "var(--eco-card-muted)", border: "1px dashed var(--eco-border)" }}>
                <p style={{ ...subtleText, lineHeight: 1.6 }}>
                  Cuando el backend esté disponible, estas opciones podrán persistirse en servidor. Mientras tanto, el frontend mantiene separadas preferencias, parámetros de cálculo y mantenimiento para facilitar la integración.
                </p>
              </div>
            </div>
          </AnimatedCard>
        </div>}
      </div>
      <Toast toast={toast} />
    </>
  );
}

