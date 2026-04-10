import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  Fingerprint,
  Globe,
  KeyRound,
  Link2,
  Lock,
  MapPin,
  Orbit,
  Package,
  Pencil,
  PlugZap,
  Radio,
  Router,
  Save,
  Search,
  Server,
  Shield,
  ShieldCheck,
  TimerReset,
  Wifi,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import {
  createDevice,
  createDeviceDraft,
  DEVICE_API_CONTRACT,
  duplicateDevice,
  fetchDevices,
  removeDevice,
  updateDevice,
  updateDeviceStatus,
} from "../api/devices";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const PAGE_STYLES = `
@keyframes ctGlow{0%,100%{box-shadow:0 0 0 rgba(34,197,94,0)}50%{box-shadow:0 0 0 8px rgba(34,197,94,.08)}}
@keyframes ctPulseRing{0%{transform:scale(.92);opacity:.7}50%{transform:scale(1.08);opacity:1}100%{transform:scale(.92);opacity:.7}}
@keyframes ctToastIn{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctToastOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(10px) scale(.96)}}
@keyframes ctCheckPop{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
@media(max-width:1180px){
  .ct-device-hero,
  .ct-device-main,
  .ct-device-kpis,
  .ct-device-inventory{grid-template-columns:1fr!important}
  .ct-device-sticky{position:static!important}
}
@media(max-width:760px){
  .ct-device-form-grid,
  .ct-device-security-grid,
  .ct-device-contract-grid{grid-template-columns:1fr!important}
  .ct-device-actions{flex-direction:column!important;align-items:stretch!important}
  .ct-device-toolbar{flex-direction:column!important;align-items:flex-start!important}
  .ct-device-kpis{grid-template-columns:repeat(2,1fr)!important}
}
@media(max-width:520px){
  .ct-device-kpis{grid-template-columns:1fr!important}
}
`;

const cardBase = {
  background: "var(--eco-card)",
  border: "1px solid var(--eco-border)",
  borderRadius: "var(--eco-radius-lg)",
  boxShadow: "var(--eco-shadow-sm)",
};

const inputBase = {
  width: "100%",
  height: 44,
  borderRadius: "var(--eco-radius-md)",
  border: "1.5px solid var(--eco-border)",
  padding: "0 14px",
  background: "var(--eco-input-bg, var(--eco-surface))",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 13,
  outline: "none",
  transition: "border-color .2s ease, box-shadow .2s ease",
};

const textAreaBase = {
  ...inputBase,
  minHeight: 92,
  height: "auto",
  padding: "12px 14px",
  resize: "vertical",
};

const primaryButtonStyle = {
  height: 42,
  padding: "0 20px",
  borderRadius: "var(--eco-radius-md)",
  border: "none",
  background: "linear-gradient(135deg, var(--eco-primary-500), #0f766e)",
  color: "white",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 4px 14px rgba(16,185,129,.22)",
  transition: "all 200ms ease",
};

const secondaryButtonStyle = {
  height: 40,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "1.5px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 200ms ease",
};

const subtleText = {
  margin: 0,
  fontFamily: fb,
  fontSize: 12,
  color: "var(--eco-text-soft)",
  lineHeight: 1.55,
};

const AREA_OPTIONS = [
  { value: "ADM", label: "Administracion" },
  { value: "LAB", label: "Laboratorio" },
  { value: "CC", label: "Centro de computo" },
  { value: "IND", label: "Taller industrial" },
  { value: "AUL", label: "Aulas" },
];

const CAMPUS_OPTIONS = [
  { value: "CAMPUS-CT", label: "Campus central" },
  { value: "CAMPUS-NORTE", label: "Campus norte" },
  { value: "CAMPUS-SUR", label: "Campus sur" },
];

const PROTOCOL_OPTIONS = [
  { value: "https", label: "HTTPS push" },
  { value: "mqtt", label: "MQTT sobre TLS" },
];

const STREAM_OPTIONS = [
  { value: "scheduled", label: "Periodico" },
  { value: "realtime", label: "Tiempo real" },
];

const STATUS_META = {
  provisioning: { label: "Provisionando", tone: { bg: "rgba(245,158,11,0.12)", color: "#B45309", border: "rgba(245,158,11,0.25)" }, icon: TimerReset },
  online: { label: "En linea", tone: { bg: "rgba(34,197,94,0.12)", color: "#15803D", border: "rgba(34,197,94,0.25)" }, icon: Wifi },
  offline: { label: "Sin conexion", tone: { bg: "rgba(148,163,184,0.16)", color: "#475569", border: "rgba(148,163,184,0.28)" }, icon: WifiOff },
  alert: { label: "Revisar", tone: { bg: "rgba(239,68,68,0.12)", color: "#B91C1C", border: "rgba(239,68,68,0.24)" }, icon: Shield },
};

const FLOW_STEPS = [
  { title: "Alta administrativa", body: "Define identidad, campus, area y modo de lectura antes de tocar el firmware.", icon: Package },
  { title: "Provisionamiento seguro", body: "Recibe la credencial unica emitida por backend y confirma endpoint, resguardo y politicas de conexion.", icon: KeyRound },
  { title: "Entrega tecnica", body: "Encargate de entregar la credencial correctamente al tecnico para que la vincule al dispositivo.", icon: PlugZap },
  { title: "Validacion operativa", body: "Confirma ultima lectura, heartbeat, area vinculada y postura de seguridad antes de liberar.", icon: ShieldCheck },
];

const DEFAULT_FORM = {
  id: "",
  name: "",
  code: "",
  campusCode: "CAMPUS-CT",
  areaCode: "LAB",
  protocol: "https",
  streamMode: "scheduled",
  intervalSeconds: "60",
  metric: "electricity_consumption",
  unit: "kWh",
  backendUrl: "https://api.example.edu",
  endpointPath: "/iot/readings",
  wifiProfile: "Campus-IoT",
  deviceType: "ESP32",
  notes: "",
  token: "",
  tlsRequired: true,
  verifyServerCert: true,
  offlineBuffer: true,
  enabled: true,
};

/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Helpers aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */

function createFormFromDevice(device) {
  return { ...DEFAULT_FORM, ...device };
}

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "administrador" || normalized === "admin") return "admin";
  return normalized;
}

function maskCredential(token) {
  if (!token) return "Pendiente de emision backend";
  const parts = token.split("-");
  return parts.map((part, index) => (index >= parts.length - 2 ? part : `${part.slice(0, 2)}\u2022\u2022\u2022\u2022\u2022`)).join("-");
}

function formatDateTime(value) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.provisioning;
}

/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Skeleton loader aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */

function DevicePageSkeleton() {
  const shimmer = {
    background: "linear-gradient(90deg, var(--eco-border) 25%, var(--eco-surface) 50%, var(--eco-border) 75%)",
    backgroundSize: "200% 100%",
    animation: "eco-shimmer 1.4s ease-in-out infinite",
    borderRadius: "var(--eco-radius-md)",
  };
  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto", animation: "eco-fadeIn 0.3s ease-out" }}>
      {/* Hero skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr .95fr", gap: 18, marginBottom: 22 }} className="ct-device-hero">
        <div style={{ ...cardBase, padding: 24 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ ...shimmer, width: 180, height: 26, borderRadius: "var(--eco-radius-full)" }} />
            <div style={{ ...shimmer, width: 70, height: 26 }} />
          </div>
          <div style={{ ...shimmer, width: "70%", height: 30, marginBottom: 12 }} />
          <div style={{ ...shimmer, width: "90%", height: 14, marginBottom: 6 }} />
          <div style={{ ...shimmer, width: "60%", height: 14, marginBottom: 20 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...shimmer, width: 170, height: 40 }} />
            <div style={{ ...shimmer, width: 140, height: 40 }} />
          </div>
        </div>
        <div style={{ ...cardBase, padding: 20 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ ...shimmer, width: 46, height: 46, borderRadius: 16 }} />
            <div>
              <div style={{ ...shimmer, width: 100, height: 12, marginBottom: 6 }} />
              <div style={{ ...shimmer, width: 200, height: 18 }} />
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, animation: `eco-fadeInUp 0.4s ease-out ${i * 80}ms both` }}>
              <div style={{ ...shimmer, width: 24, height: 24, borderRadius: 999 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...shimmer, width: "60%", height: 13, marginBottom: 4 }} />
                <div style={{ ...shimmer, width: "85%", height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="ct-device-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 22 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...cardBase, padding: 18, animation: `eco-fadeInUp 0.4s ease-out ${i * 70}ms both` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ ...shimmer, width: 110, height: 11, marginBottom: 12 }} />
                <div style={{ ...shimmer, width: 48, height: 28, marginBottom: 8 }} />
                <div style={{ ...shimmer, width: 140, height: 10 }} />
              </div>
              <div style={{ ...shimmer, width: 42, height: 42, borderRadius: 14 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="ct-device-main" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(330px, .92fr)", gap: 18 }}>
        <div style={{ ...cardBase, padding: 22 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ ...shimmer, width: 42, height: 42, borderRadius: "var(--eco-radius-md)" }} />
            <div>
              <div style={{ ...shimmer, width: 150, height: 18, marginBottom: 6 }} />
              <div style={{ ...shimmer, width: 280, height: 12 }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ animation: `eco-fadeInUp 0.4s ease-out ${i * 60}ms both` }}>
                <div style={{ ...shimmer, width: 100, height: 12, marginBottom: 8 }} />
                <div style={{ ...shimmer, width: "100%", height: 44 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 18 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ ...cardBase, padding: 20, animation: `eco-fadeInUp 0.5s ease-out ${i * 100}ms both` }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ ...shimmer, width: 42, height: 42, borderRadius: "var(--eco-radius-md)" }} />
                <div>
                  <div style={{ ...shimmer, width: 160, height: 16, marginBottom: 6 }} />
                  <div style={{ ...shimmer, width: 220, height: 11 }} />
                </div>
              </div>
              <div style={{ ...shimmer, width: "100%", height: 80 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Sub-components aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */

function SectionLabel({ icon: Icon, title, description, action, accentColor }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "var(--eco-radius-md)",
            background: accentColor || "linear-gradient(135deg, var(--eco-primary-500), #0f766e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: "0 8px 20px rgba(16,185,129,.16)",
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: fd, fontSize: 17, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-.01em" }}>{title}</h2>
          {description ? <p style={{ ...subtleText, marginTop: 3 }}>{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text)", display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {required ? <span style={{ color: "var(--eco-primary-500)", fontSize: 14, lineHeight: 1 }}>*</span> : null}
      </span>
      {children}
      {hint ? <span style={{ ...subtleText, fontSize: 11 }}>{hint}</span> : null}
    </label>
  );
}

function MetricCard({ icon: Icon, label, value, detail, accent, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardBase,
        padding: 18,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, ${accent}10 0%, var(--eco-card) 50%)`,
        transition: "transform 200ms ease, box-shadow 200ms ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 24px ${accent}18` : "var(--eco-shadow-sm)",
        animation: `eco-fadeInUp .45s ease ${delay}ms both`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</p>
          <p style={{ margin: "8px 0 4px", fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-.03em", lineHeight: 1.1 }}>{value}</p>
          <p style={{ ...subtleText, fontSize: 11 }}>{detail}</p>
        </div>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: `${accent}14`,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "transform 200ms ease",
            transform: hovered ? "scale(1.1)" : "scale(1)",
          }}
        >
          <Icon size={19} />
        </div>
      </div>
      {/* Decorative accent bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,opacity: hovered ? 1 : 0, transition: "opacity 200ms ease" }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  const isOnline = status === "online";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: "var(--eco-radius-full)",
        border: `1.5px solid ${meta.tone.border}`,
        background: meta.tone.bg,
        color: meta.tone.color,
        fontFamily: fb,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".02em",
      }}
    >
      {isOnline ? (
        <span style={{ position: "relative", width: 13, height: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: meta.tone.color, opacity: .3, animation: "ctPulseRing 2s ease-in-out infinite" }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.tone.color, position: "relative" }} />
        </span>
      ) : (
        <Icon size={12} />
      )}
      {meta.label}
    </span>
  );
}

function ToggleCard({ icon: Icon, title, description, checked, onChange }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: "var(--eco-radius-md)",
        border: `1.5px solid ${checked ? "var(--eco-primary-300)" : hovered ? "var(--eco-primary-200)" : "var(--eco-border)"}`,
        background: checked ? "linear-gradient(180deg, var(--eco-primary-50), var(--eco-card))" : "var(--eco-card)",
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        transition: "all .2s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,.06)" : "none",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: checked ? "rgba(34,197,94,.14)" : "var(--eco-gray-100)",
            color: checked ? "var(--eco-primary-700)" : "var(--eco-gray-400)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all .2s ease",
          }}
        >
          <Icon size={16} />
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text)" }}>{title}</p>
          <p style={{ ...subtleText, marginTop: 3, fontSize: 11 }}>{description}</p>
        </div>
      </div>
      {/* Toggle switch */}
      <span
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked ? "linear-gradient(135deg, var(--eco-primary-500), #0f766e)" : "var(--eco-gray-300)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
          padding: 2,
          transition: "all .2s ease",
          flexShrink: 0,
          boxShadow: checked ? "0 2px 8px rgba(16,185,129,.25)" : "inset 0 1px 3px rgba(0,0,0,.1)",
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 1px 4px rgba(0,0,0,.18)",
            transition: "all .2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked ? <Check size={10} style={{ color: "var(--eco-primary-600)" }} /> : null}
        </span>
      </span>
    </button>
  );
}

function FlowStep({ step, index }) {
  const Icon = step.icon;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardBase,
        padding: "20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        animation: `eco-fadeInUp .45s ease ${index * 80}ms both`,
        transition: "transform 200ms ease, box-shadow 200ms ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 20px rgba(0,0,0,.07)" : "var(--eco-shadow-sm)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(15,118,110,.15), rgba(34,197,94,.1))",
            color: "#0f766e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={17} />
        </div>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--eco-primary-500)",
            color: "white",
            fontFamily: fm,
            fontSize: 10,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(16,185,129,.3)",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
      </div>
      <div>
        <h3 style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 800, color: "var(--eco-text-strong)", lineHeight: 1.3 }}>{step.title}</h3>
        <p style={{ ...subtleText, marginTop: 6, fontSize: 11.5, lineHeight: 1.55 }}>{step.body}</p>
      </div>
    </div>
  );
}

function AdminLockedState() {
  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
      <style>{PAGE_STYLES}</style>
      <section
        style={{
          ...cardBase,
          padding: 28,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 18,
          alignItems: "center",
          background: "linear-gradient(135deg, rgba(239,68,68,.08), rgba(251,191,36,.1))",
          animation: "eco-fadeInUp .45s ease both",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            background: "rgba(239,68,68,.12)",
            color: "#B91C1C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Lock size={24} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-text-strong)" }}>Dispositivos solo para administracion</h1>
          <p style={{ ...subtleText, marginTop: 8, fontSize: 13 }}>
            Esta vista concentra provisionamiento, seguridad y vinculacion tecnica del hardware con el sistema. Solo se habilita para perfiles administradores.
          </p>
        </div>
      </section>
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, alignItems: "start" }}>
      <Icon size={14} style={{ color: "var(--eco-primary-600)", marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontFamily: fb, fontSize: 10.5, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</p>
        <p style={{ margin: "3px 0 0", fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text)" }}>{value}</p>
      </div>
    </div>
  );
}

function CodeBlock({ label, value, onCopy, copied, multiline = false }) {
  const [hovered, setHovered] = useState(false);
  const canCopy = typeof onCopy === "function";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1.5px solid ${hovered ? "var(--eco-primary-200)" : "var(--eco-border)"}`,
        borderRadius: "var(--eco-radius-md)",
        overflow: "hidden",
        transition: "border-color .2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", background: "var(--eco-gray-100)", borderBottom: "1px solid var(--eco-border)" }}>
        <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-gray-600)", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
        <button
          type="button"
          onClick={onCopy}
          disabled={!canCopy}
          aria-disabled={!canCopy}
          style={{
            ...secondaryButtonStyle,
            height: 28,
            padding: "0 10px",
            fontSize: 11,
            border: "1px solid var(--eco-border)",
            opacity: canCopy ? 1 : 0.6,
            cursor: canCopy ? "pointer" : "not-allowed",
          }}
        >
          {canCopy ? (copied ? <Check size={12} style={{ animation: "ctCheckPop .3s ease both" }} /> : <Copy size={12} />) : <Lock size={12} />}
          {canCopy ? (copied ? "Listo" : "Copiar") : "Protegido"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "12px 14px", fontFamily: fm, fontSize: 11.5, lineHeight: multiline ? 1.7 : 1.5, color: "var(--eco-text-strong)", background: "rgba(15,23,42,.02)", whiteSpace: multiline ? "pre-wrap" : "nowrap", overflowX: "auto" }}>{value}</pre>
    </div>
  );
}

function MetaChip({ icon: Icon, value, mono = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-gray-100)", color: "var(--eco-gray-700)", fontFamily: mono ? fm : fb, fontSize: 11, fontWeight: 700 }}>
      <Icon size={12} />
      {value}
    </span>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 50,
        ...cardBase,
        background: "var(--eco-gray-900)",
        color: "white",
        border: "none",
        padding: "14px 18px",
        minWidth: 290,
        maxWidth: 380,
        boxShadow: "0 12px 40px rgba(0,0,0,.25)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "ctToastIn .3s ease both",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: "rgba(34,197,94,.18)",
          color: "#22c55e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 700 }}>{toast.title}</p>
        <p style={{ margin: "3px 0 0", fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.4 }}>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,.4)",
          cursor: "pointer",
          padding: 2,
          display: "flex",
          transition: "color .15s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.8)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,.4)"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ApiPill({ label, accent }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: fb,
        background: accent === "primary" ? "rgba(34,197,94,.12)" : "var(--eco-gray-100)",
        color: accent === "primary" ? "var(--eco-primary-700)" : "var(--eco-text-soft)",
        border: "1px solid var(--eco-border)",
      }}
    >
      {label}
    </span>
  );
}

function IssuedCredentialModal({ credential, copied, onCopy, onClose }) {
  if (!credential?.token) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "eco-fadeIn .2s ease both",
      }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.52)", backdropFilter: "blur(4px)" }} />
      <div
        style={{
          ...cardBase,
          position: "relative",
          width: "100%",
          maxWidth: 620,
          padding: "28px 24px 24px",
          boxShadow: "0 24px 70px rgba(0,0,0,.25)",
          animation: "ctToastIn .25s ease both",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(34,197,94,.16), rgba(15,118,110,.12))",
                color: "var(--eco-primary-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontFamily: fd, fontSize: 19, fontWeight: 800, color: "var(--eco-text-strong)" }}>Credencial emitida</h3>
              <p style={{ ...subtleText, marginTop: 4 }}>
                {credential.mode === "duplicate"
                  ? `Se emitió una nueva credencial para ${credential.name}.`
                  : `La credencial de ${credential.name} ya está lista para provisionar el dispositivo.`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--eco-text-soft)", cursor: "pointer", padding: 2, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            borderRadius: "var(--eco-radius-md)",
            border: "1.5px dashed var(--eco-primary-300)",
            background: "linear-gradient(180deg, rgba(34,197,94,.05), rgba(15,118,110,.06))",
            padding: "16px 18px",
            marginBottom: 14,
          }}
        >
          <p style={{ margin: 0, fontFamily: fm, fontSize: 13, lineHeight: 1.9, color: "var(--eco-text-strong)", wordBreak: "break-word", letterSpacing: ".06em" }}>
            {credential.token}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: "var(--eco-radius-md)", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.18)", marginBottom: 18 }}>
          <Shield size={13} style={{ color: "#B45309", flexShrink: 0 }} />
          <p style={{ margin: 0, fontFamily: fb, fontSize: 11.5, color: "#92400E", lineHeight: 1.5, fontWeight: 600 }}>
            Cópiala y resguárdala ahora. Después de cerrar esta ventana, la interfaz solo la mostrará enmascarada y el sistema no podrá recuperarla desde base de datos.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => onCopy(credential.token, "issued-credential")} style={primaryButtonStyle}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copiada" : "Copiar credencial"}
          </button>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Main component aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */

export default function DevicePage({ user }) {
  const isAdmin = normalizeRole(user?.roleKey || user?.role) === "admin";
  const [pageReady, setPageReady] = useState(false);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(() => createFormFromDevice(createDeviceDraft()));
  const [selectedId, setSelectedId] = useState("");
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState(null);
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => setPageReady(true), 220);
    fetchDevices()
      .then((items) => {
        if (!mounted) return;
        setDevices(items);
      })
      .catch(() => {
        if (!mounted) return;
        setToast({ title: "Sin inventario remoto", message: "No se pudo sincronizar el inventario de dispositivos." });
      });
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => setCopied(""), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((item) => item.status === "online").length;
    const provisioning = devices.filter((item) => item.status === "provisioning").length;
    const secured = devices.filter((item) => item.tlsRequired && item.verifyServerCert).length;
    return {
      total,
      online,
      provisioning,
      securedPct: total ? Math.round((secured / total) * 100) : 0,
    };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.campusCode.toLowerCase().includes(q) ||
        d.areaCode.toLowerCase().includes(q) ||
        (statusMeta(d.status).label || "").toLowerCase().includes(q)
    );
  }, [devices, searchQuery]);
  const payloadPreview = useMemo(
    () =>
      JSON.stringify(
        {
          deviceCode: form.code || "BUNKER-LAB-01",
          recordedAt: "2026-04-09T12:00:00Z",
          totalKwh: 1523.44,
          deltaKwh: 1.27,
          voltage: 127.4,
          powerFactor: 0.96,
          intervalSeconds: Number(form.intervalSeconds || 60),
          payload: {
            firmwareVersion: "1.0.0",
            wifiProfile: form.wifiProfile || "Campus-IoT",
          },
        },
        null,
        2
      ),
    [form.code, form.intervalSeconds, form.wifiProfile]
  );

  const authorizationPreview = useMemo(() => {
    if (!form.token) return "Bearer <issued-by-backend-on-create>";
    return `Bearer ${maskCredential(form.token)}`;
  }, [form.token]);

  const adminApiPreview = useMemo(
    () =>
      [
        `GET ${DEVICE_API_CONTRACT.list}`,
        `POST ${DEVICE_API_CONTRACT.create}`,
        `PATCH ${DEVICE_API_CONTRACT.update(":id")}`,
        `PATCH ${DEVICE_API_CONTRACT.status(":id")}`,
        `POST ${DEVICE_API_CONTRACT.duplicate(":id")}`,
        `DELETE ${DEVICE_API_CONTRACT.remove(":id")}`,
      ].join("\n"),
    []
  );

  if (!isAdmin) return <AdminLockedState />;
  if (!pageReady) return <DevicePageSkeleton />;

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setSelectedId("");
    setForm(createFormFromDevice(createDeviceDraft()));
  };

  const handleCopy = async (value, key) => {
    if (!value) {
      setToast({ title: "Sin credencial emitida", message: "La credencial aparecera cuando el backend confirme el alta del dispositivo." });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setToast({ title: "Copiado al portapapeles", message: "La informacion esta lista para pegar donde la necesites." });
    } catch {
      setToast({ title: "No se pudo copiar", message: "Intenta seleccionar el texto manualmente." });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.backendUrl.trim()) {
      setToast({ title: "Campos obligatorios", message: "Completa nombre, codigo y backend URL antes de guardar." });
      return;
    }
    try {
      const nextDevice = selectedId ? await updateDevice(form) : await createDevice(form);
      setDevices((current) => (selectedId ? current.map((item) => (item.id === selectedId ? nextDevice : item)) : [nextDevice, ...current]));
      setSelectedId(nextDevice.id);
      setForm(createFormFromDevice(nextDevice));
      if (!selectedId && nextDevice.token) {
        setIssuedCredential({
          mode: "create",
          name: nextDevice.name,
          token: nextDevice.token,
        });
      }
      setToast({
        title: selectedId ? "Dispositivo actualizado" : "Dispositivo registrado",
        message: selectedId
          ? `${nextDevice.name} quedo alineado al contrato de backend.`
          : `${nextDevice.name} quedo registrado y su credencial ya esta lista para copiarse.`,
      });
    } catch {
      setToast({ title: "No se pudo guardar", message: "Revisa el contrato de la API de dispositivos y vuelve a intentar." });
    }
  };

  const handleEdit = (device) => {
    setSelectedId(device.id);
    setForm(createFormFromDevice(device));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = async (device) => {
    try {
      const duplicate = await duplicateDevice(device.id);
      setDevices((current) => [duplicate, ...current]);
      setSelectedId(duplicate.id);
      setForm(createFormFromDevice(duplicate));
      if (duplicate.token) {
        setIssuedCredential({
          mode: "duplicate",
          name: duplicate.name,
          token: duplicate.token,
        });
      }
      setToast({ title: "Duplicado listo", message: "Se creo un nuevo dispositivo con su propia credencial lista para copiarse." });
    } catch {
      setToast({ title: "No se pudo duplicar", message: "La API de duplicado no devolvio un dispositivo valido." });
    }
  };

  const handleToggleDevice = async (device) => {
    const nextEnabled = !device.enabled;
    try {
      const updated = await updateDeviceStatus(device.id, nextEnabled);
      setDevices((current) => current.map((item) => (item.id === device.id ? updated : item)));
      if (selectedId === device.id) {
        setForm(createFormFromDevice(updated));
      }
    } catch {
      setToast({ title: "No se pudo actualizar", message: "La API de estado del dispositivo rechazo el cambio." });
    }
  };

  const openDeleteConfirm = (device) => {
    setDeleteConfirm(device);
    setDeleteInput("");
  };

  const handleDelete = async () => {
    if (!deleteConfirm || deleteInput.trim() !== deleteConfirm.name.trim()) return;
    const deletedName = deleteConfirm.name;
    try {
      await removeDevice(deleteConfirm.id);
      setDevices((current) => current.filter((item) => item.id !== deleteConfirm.id));
      if (selectedId === deleteConfirm.id) {
        resetForm();
      }
      setDeleteConfirm(null);
      setDeleteInput("");
      setToast({ title: "Dispositivo eliminado", message: `${deletedName} fue removido del inventario permanentemente.` });
    } catch {
      setToast({ title: "No se pudo eliminar", message: "La API de dispositivos no confirmo la eliminacion." });
    }
  };

  const CHECKLIST_ITEMS = [
    { text: "El deviceCode del firmware coincide con el codigo registrado.", critical: true },
    { text: "La red autorizada permite salida al backend privado o broker seguro.", critical: true },
    { text: "La credencial unica se copio y resguardo al momento del registro.", critical: true },
    { text: "El area y campus quedan correctos para clasificar las lecturas.", critical: false },
    { text: "Se probo al menos un envio con timestamp, token y payload validos.", critical: false },
  ];

  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
      <style>{PAGE_STYLES}</style>

      {/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Hero aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
      <section className="ct-device-hero" style={{ display: "grid", gridTemplateColumns: "1.25fr .95fr", gap: 18, marginBottom: 20, animation: "eco-fadeInUp .45s ease both" }}>
        <div
          style={{
            ...cardBase,
            padding: "26px 24px",
            background: "radial-gradient(ellipse at top right, rgba(16,185,129,.14), transparent 50%), linear-gradient(135deg, rgba(15,118,110,.06), rgba(34,197,94,.07))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background orb */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,.08), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: "var(--eco-radius-full)", background: "rgba(15,118,110,.12)", color: "#0f766e", fontFamily: fb, fontSize: 11, fontWeight: 700, letterSpacing: ".02em" }}>
              <ShieldCheck size={13} />
              Administracion de hardware
            </span>
            <span style={{ fontFamily: fm, fontSize: 10, color: "var(--eco-text-soft)", padding: "4px 8px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-gray-100)" }}>Solo admin</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 900, color: "var(--eco-text-strong)", letterSpacing: "-.04em", lineHeight: 1.1, position: "relative" }}>
            Dispositivos
          </h1>
          <p style={{ margin: "12px 0 0", fontFamily: fb, fontSize: 13, lineHeight: 1.65, color: "var(--eco-text-soft)", maxWidth: 660, position: "relative" }}>
            Registra cada equipo con su identidad, llave unica, politica de seguridad, area vinculada y contrato de conexion. La credencial se genera una sola vez al dar de alta el dispositivo.
          </p>
          <div className="ct-device-actions" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18, position: "relative" }}>
            <button
              type="button"
              style={{ ...primaryButtonStyle, opacity: 0.82, cursor: "default", boxShadow: "0 4px 14px rgba(16,185,129,.18)" }}
              disabled
              aria-disabled="true"
            >
              <Shield size={15} />
              {form.token ? "Visible solo al registrar" : "Disponible al registrar"}
            </button>
          </div>
        </div>
        <div style={{ ...cardBase, padding: 20, display: "grid", alignContent: "space-between", gap: 14, animation: "eco-fadeInUp .55s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, rgba(34,197,94,.14), rgba(15,118,110,.1))", color: "var(--eco-primary-700)", display: "flex", alignItems: "center", justifyContent: "center", animation: "ctGlow 2.2s ease-in-out infinite" }}>
              <Cpu size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 10, fontWeight: 700, color: "var(--eco-text-soft)", letterSpacing: ".06em", textTransform: "uppercase" }}>Flujo de trabajo</p>
              <p style={{ margin: "3px 0 0", fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-.02em" }}>Provisionamiento listo</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {FLOW_STEPS.slice(0, 3).map((step, index) => (
              <div key={step.title} style={{ display: "grid", gridTemplateColumns: "26px 1fr 16px", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: "var(--eco-radius-md)", background: "var(--eco-surface)", transition: "background .15s ease" }}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: "linear-gradient(135deg, var(--eco-primary-50), rgba(34,197,94,.15))", color: "var(--eco-primary-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: fm, fontSize: 10, fontWeight: 800 }}>{index + 1}</span>
                <div>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 12.5, fontWeight: 700, color: "var(--eco-text)" }}>{step.title}</p>
                  <p style={{ ...subtleText, marginTop: 2, fontSize: 10.5 }}>{step.body}</p>
                </div>
                <ChevronRight size={14} style={{ color: "var(--eco-gray-300)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ KPIs aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
      <section className="ct-device-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        <MetricCard icon={Cpu} label="Registrados" value={stats.total} detail="Inventario disponible para vincular." accent="#16A34A" delay={0} />
        <MetricCard icon={Wifi} label="En linea" value={stats.online} detail="Reportando heartbeat o lecturas." accent="#0284C7" delay={60} />
        <MetricCard icon={TimerReset} label="Provisionando" value={stats.provisioning} detail="Listos para validar en sitio." accent="#D97706" delay={120} />
        <MetricCard icon={ShieldCheck} label="Cobertura segura" value={`${stats.securedPct}%`} detail="TLS + verificacion de certificado activas." accent="#0F766E" delay={180} />
      </section>

      {/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Main content aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
      <section className="ct-device-main" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(330px, .92fr)", gap: 18, alignItems: "start", marginBottom: 20 }}>
        <div style={{ display: "grid", gap: 18 }}>
          {/* Form section */}
          <section style={{ ...cardBase, padding: 22, animation: "eco-fadeInUp .5s ease both" }}>
            <SectionLabel
              icon={Link2}
              title="Alta y vinculacion"
              description="Configura el dispositivo completo antes de provisionarlo en sitio."
              action={
                selectedId ? (
                  <button
                    type="button"
                    style={{ ...secondaryButtonStyle, height: 36 }}
                    onClick={resetForm}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--eco-border)"; }}
                  >
                    <Pencil size={14} />
                    Nuevo
                  </button>
                ) : null
              }
            />

            {selectedId ? (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg, rgba(34,197,94,.06), rgba(15,118,110,.04))", border: "1px solid var(--eco-primary-200)", display: "flex", alignItems: "center", gap: 10, animation: "eco-fadeInUp .3s ease both" }}>
                <Pencil size={14} style={{ color: "var(--eco-primary-600)", flexShrink: 0 }} />
                <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-primary-700)", fontWeight: 600 }}>
                  Editando: <strong>{form.name || form.code}</strong>
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <div className="ct-device-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                <Field label="Nombre operativo" hint="Como lo vera administracion dentro del sistema." required>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Medidor Laboratorio 01"
                    style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
                  />
                </Field>
                <Field label="Codigo de dispositivo" hint="Unico por equipo. Ideal para etiqueta y firmware." required>
                  <input
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                    placeholder="BUNKER-LAB-01"
                    style={{ ...inputBase, fontFamily: fm, letterSpacing: ".04em" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
                  />
                </Field>
                <Field label="Campus">
                  <select value={form.campusCode} onChange={(event) => updateForm("campusCode", event.target.value)} style={inputBase}>
                    {CAMPUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Area vinculada">
                  <select value={form.areaCode} onChange={(event) => updateForm("areaCode", event.target.value)} style={inputBase}>
                    {AREA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Protocolo de conexion">
                  <select value={form.protocol} onChange={(event) => updateForm("protocol", event.target.value)} style={inputBase}>
                    {PROTOCOL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Modo de envio">
                  <select value={form.streamMode} onChange={(event) => updateForm("streamMode", event.target.value)} style={inputBase}>
                    {STREAM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Intervalo de lectura (seg)" hint="Recomendado: 30, 60 o 300 segun consumo esperado.">
                  <input value={form.intervalSeconds} onChange={(event) => updateForm("intervalSeconds", event.target.value.replace(/[^\d]/g, ""))} placeholder="60" style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
                  />
                </Field>
                <Field label="Perfil WiFi" hint="Informativo para la entrega tecnica.">
                  <input value={form.wifiProfile} onChange={(event) => updateForm("wifiProfile", event.target.value)} placeholder="Campus-IoT" style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
                  />
                </Field>
                <Field label="Backend URL" hint="Privada, segura y accesible desde la red autorizada." required>
                  <input value={form.backendUrl} onChange={(event) => updateForm("backendUrl", event.target.value)} placeholder="https://api.example.edu" style={inputBase}
                    onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
                  />
                </Field>
              </div>

              <Field label="Notas de implementacion" hint="Contexto operativo: instalacion, energia o acceso fisico.">
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Ej: instalar junto al tablero norte, validar senal WiFi en horario de clases."
                  style={textAreaBase}
                  onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
                />
              </Field>

              {/* Security toggles */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(15,118,110,.1)", color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck size={14} />
                  </div>
                  <h3 style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text-strong)" }}>Postura de seguridad</h3>
                </div>
                <div className="ct-device-security-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  <ToggleCard icon={Lock} title="TLS obligatorio" description="Fuerza canal seguro para todas las lecturas." checked={form.tlsRequired} onChange={(value) => updateForm("tlsRequired", value)} />
                  <ToggleCard icon={Shield} title="Validar certificado" description="Bloquea conexiones a hosts no confiables." checked={form.verifyServerCert} onChange={(value) => updateForm("verifyServerCert", value)} />
                  <ToggleCard icon={TimerReset} title="Buffer offline" description="Conserva lecturas si se corta la red." checked={form.offlineBuffer} onChange={(value) => updateForm("offlineBuffer", value)} />
                </div>
              </div>

              {/* Actions */}
              <div className="ct-device-actions" style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
                <button
                  type="submit"
                  style={primaryButtonStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(16,185,129,.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(16,185,129,.22)"; }}
                >
                  <Save size={15} />
                  {selectedId ? "Guardar cambios" : "Registrar dispositivo"}
                </button>
                {selectedId ? null : (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={resetForm}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--eco-border)"; }}
                  >
                    <X size={15} />
                    Limpiar formulario
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Flow steps */}
          <section style={{ display: "grid", gap: 14 }}>
            <SectionLabel icon={Orbit} title="Ruta de implementacion" description="El mismo flujo funciona para un solo dispositivo o un conjunto distribuido." />
            <div className="ct-device-inventory" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
              {FLOW_STEPS.map((step, index) => <FlowStep key={step.title} step={step} index={index} />)}
            </div>
          </section>
        </div>

        {/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Sidebar aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <div className="ct-device-sticky" style={{ display: "grid", gap: 16, position: "sticky", top: "calc(var(--header-h) + 18px)" }}>
          {/* Credential */}
          <section style={{ ...cardBase, padding: 20, animation: "eco-fadeInUp .58s ease both" }}>
            <SectionLabel
              icon={KeyRound}
              title="Credencial única"
              description="La llave aparecera cuando se de de alta el dispositivo y el puerta trasera confirme su registro. Copiala y resguarda para la entrega tecnica."
              action={
                <button
                  type="button"
                  style={{ ...secondaryButtonStyle, height: 34, fontSize: 12, opacity: 0.72, cursor: "default" }}
                  disabled
                  aria-disabled="true"
                >
                  <Lock size={13} />
                  Irrecuperable
                </button>
              }
            />
            <div
              style={{
                borderRadius: "var(--eco-radius-md)",
                border: "1.5px dashed var(--eco-primary-300)",
                background: "linear-gradient(180deg, rgba(34,197,94,.05), rgba(15,118,110,.06))",
                padding: "14px 16px",
                marginBottom: 14,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--eco-primary-300), transparent)" }} />
              <p style={{ margin: 0, fontFamily: fm, fontSize: 11.5, lineHeight: 1.85, color: "var(--eco-text-strong)", wordBreak: "break-word", letterSpacing: ".05em" }}>{form.token ? maskCredential(form.token) : "Se emitira al registrar un dispositivo nuevo."}</p>
            </div>
            {/* Immutable credential notice */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: "var(--eco-radius-md)", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.18)", marginBottom: 14 }}>
              <Shield size={13} style={{ color: "#B45309", flexShrink: 0 }} />
              <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "#92400E", lineHeight: 1.45, fontWeight: 600 }}>
                {form.token
                  ? "Copiala y resguardala ahora. Una vez registrado el dispositivo, esta llave no podra editarse ni regenerarse."
                  : "Backend emitira la credencial al confirmar el alta. Copiala en ese momento y resguardala como llave fija del dispositivo."}
              </p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <MetaRow icon={Cpu} label="Codigo esperado en firmware" value={form.code || "Sin definir"} />
              <MetaRow icon={MapPin} label="Binding operativo" value={`${form.campusCode} \u00B7 ${form.areaCode}`} />
              <MetaRow icon={Server} label="Backend create" value={`POST ${DEVICE_API_CONTRACT.create}`} />
              <MetaRow icon={ShieldCheck} label="Politica de credencial" value="Llave única por dispositivo" />
            </div>
          </section>

          {/* Connection contract */}
          <section style={{ ...cardBase, padding: 20, animation: "eco-fadeInUp .64s ease both" }}>
            <SectionLabel icon={Server} title="Contrato de conexion" description="Vista lista para firmware, QA y handoff con backend." />
            <div className="ct-device-contract-grid" style={{ display: "grid", gap: 10 }}>
                            <CodeBlock label="Authorization" value={authorizationPreview} copied={false} />
              <CodeBlock label="Payload base" value={payloadPreview} onCopy={() => handleCopy(payloadPreview, "payload")} copied={copied === "payload"} multiline />
              <CodeBlock label="Admin API handoff" value={adminApiPreview} onCopy={() => handleCopy(adminApiPreview, "admin-api")} copied={copied === "admin-api"} multiline />
            </div>
          </section>

          {/* Checklist */}
          <section style={{ ...cardBase, padding: 20, animation: "eco-fadeInUp .7s ease both" }}>
            <SectionLabel icon={CheckCircle2} title="Checklist de entrega" description="Valida antes de liberar el equipo." />
            <div style={{ display: "grid", gap: 8 }}>
              {CHECKLIST_ITEMS.map((item, i) => (
                <div
                  key={item.text}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "22px 1fr",
                    gap: 10,
                    alignItems: "start",
                    padding: "8px 10px",
                    borderRadius: "var(--eco-radius-md)",
                    background: "var(--eco-surface)",
                    animation: `eco-fadeInUp .35s ease ${i * 50}ms both`,
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: item.critical ? "rgba(34,197,94,.14)" : "var(--eco-gray-100)", color: item.critical ? "var(--eco-primary-600)" : "var(--eco-gray-400)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    <CheckCircle2 size={12} />
                  </div>
                  <p style={{ ...subtleText, color: "var(--eco-text)", fontSize: 12, lineHeight: 1.5 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      {/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Inventory aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
      <section style={{ ...cardBase, padding: 22, animation: "eco-fadeInUp .76s ease both" }}>
        <SectionLabel
          icon={Router}
          title="Inventario vinculado"
          description="Equipos registrados y su estado operativo actual."
          action={
            <div className="ct-device-toolbar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft)", padding: "4px 10px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-gray-100)" }}>
                {filteredDevices.length} de {devices.length}
              </span>
            </div>
          }
        />

        {/* Search bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: "relative", maxWidth: 360 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--eco-text-soft)", pointerEvents: "none" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, codigo, campus o estado"
              style={{ ...inputBase, paddingLeft: 36, height: 40, fontSize: 12 }}
              onFocus={(e) => { e.target.style.borderColor = "var(--eco-primary-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--eco-border)"; e.target.style.boxShadow = "none"; }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--eco-text-soft)", cursor: "pointer", padding: 2, display: "flex" }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filteredDevices.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", animation: "eco-fadeInUp .3s ease both" }}>
              <Search size={32} style={{ color: "var(--eco-gray-300)", marginBottom: 10 }} />
              <p style={{ margin: 0, fontFamily: fb, fontSize: 14, fontWeight: 700, color: "var(--eco-text-soft)" }}>Sin resultados</p>
              <p style={{ ...subtleText, marginTop: 4 }}>Prueba con otro termino de busqueda.</p>
            </div>
          ) : null}
          {filteredDevices.map((device, i) => (
            <article
              key={device.id}
              style={{
                border: `1.5px solid ${selectedId === device.id ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                borderRadius: "var(--eco-radius-lg)",
                padding: 18,
                background: selectedId === device.id ? "linear-gradient(180deg, rgba(34,197,94,.04), var(--eco-card))" : "var(--eco-card)",
                boxShadow: selectedId === device.id ? "0 8px 24px rgba(34,197,94,.08)" : "none",
                transition: "all .2s ease",
                animation: `eco-fadeInUp .35s ease ${i * 60}ms both`,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 14 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: device.enabled ? (device.status === "online" ? "#22c55e" : "#f59e0b") : "#94a3b8", flexShrink: 0 }} />
                    <h3 style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text-strong)" }}>{device.name}</h3>
                    <StatusBadge status={device.status} />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-gray-100)", color: "var(--eco-gray-600)", fontFamily: fb, fontSize: 11, fontWeight: 700 }}>
                      {device.protocol === "mqtt" ? <Radio size={11} /> : <Globe size={11} />}
                      {device.protocol === "mqtt" ? "MQTT/TLS" : "HTTPS"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <MetaChip icon={Fingerprint} value={device.code} mono />
                    <MetaChip icon={MapPin} value={`${device.campusCode} \u00B7 ${device.areaCode}`} />
                    <MetaChip icon={TimerReset} value={`${device.intervalSeconds}s`} />
                    <MetaChip icon={Activity} value={`${device.readingsToday || 0} lecturas hoy`} />
                  </div>
                  <p style={{ ...subtleText, maxWidth: 720, fontSize: 11.5 }}>
                    Última actividad: <strong style={{ color: "var(--eco-text)", fontWeight: 600 }}>{formatDateTime(device.lastSeenAt)}</strong>
                    {" \u00B7 "}
                    Firmware: <strong style={{ color: "var(--eco-text)", fontWeight: 600 }}>{device.firmwareVersion || "Sin version"}</strong>
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-start", justifyContent: "flex-end" }}>
                  {[
                    { label: "Editar", icon: Pencil, onClick: () => handleEdit(device) },
                    { label: "Duplicar", icon: Package, onClick: () => handleDuplicate(device) },
                    { label: device.enabled ? "Desactivar" : "Activar", icon: device.enabled ? WifiOff : Wifi, onClick: () => handleToggleDevice(device) },
                    { label: "Eliminar", icon: Trash2, onClick: () => openDeleteConfirm(device), danger: true },
                  ].map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      style={{
                        ...secondaryButtonStyle,
                        height: 36,
                        padding: "0 12px",
                        fontSize: 12,
                        ...(action.danger ? { color: "#B91C1C", borderColor: "rgba(239,68,68,.3)" } : {}),
                      }}
                      onClick={action.onClick}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = action.danger ? "rgba(239,68,68,.5)" : "var(--eco-primary-300)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        if (action.danger) e.currentTarget.style.background = "rgba(239,68,68,.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = action.danger ? "rgba(239,68,68,.3)" : "var(--eco-border)";
                        e.currentTarget.style.transform = "translateY(0)";
                        if (action.danger) e.currentTarget.style.background = "var(--eco-card)";
                      }}
                    >
                      <action.icon size={13} />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Delete confirmation modal aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬aÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
      {deleteConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "eco-fadeIn .2s ease both",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => { setDeleteConfirm(null); setDeleteInput(""); }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
          />
          {/* Modal */}
          <div
            style={{
              ...cardBase,
              position: "relative",
              width: "100%",
              maxWidth: 440,
              padding: "28px 24px 24px",
              boxShadow: "0 20px 60px rgba(0,0,0,.2)",
              animation: "ctToastIn .25s ease both",
            }}
          >
            {/* Header icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(239,68,68,.1)",
                  color: "#B91C1C",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong)" }}>Eliminar dispositivo</h3>
                <p style={{ ...subtleText, marginTop: 3 }}>Esta accion no se puede deshacer.</p>
              </div>
            </div>

            {/* Warning */}
            <div style={{ padding: "12px 14px", borderRadius: "var(--eco-radius-md)", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", marginBottom: 18 }}>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text)", lineHeight: 1.55 }}>
                Se eliminara <strong>{deleteConfirm.name}</strong> ({deleteConfirm.code}) y toda su configuracion, credencial y vinculacion del inventario.
              </p>
            </div>

            {/* Confirmation input */}
            <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text)" }}>
                Escribe <span style={{ fontFamily: fm, padding: "2px 6px", borderRadius: 4, background: "var(--eco-gray-100)", fontSize: 11.5 }}>{deleteConfirm.name}</span> para confirmar
              </span>
              <input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={deleteConfirm.name}
                autoFocus
                style={{
                  ...inputBase,
                  borderColor: deleteInput.trim() && deleteInput.trim() !== deleteConfirm.name.trim() ? "rgba(239,68,68,.4)" : "var(--eco-border)",
                }}
                onFocus={(e) => { e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,.08)"; }}
                onBlur={(e) => { e.target.style.boxShadow = "none"; }}
                onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
              />
            </label>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => { setDeleteConfirm(null); setDeleteInput(""); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteInput.trim() !== deleteConfirm.name.trim()}
                onClick={handleDelete}
                style={{
                  ...primaryButtonStyle,
                  background: deleteInput.trim() === deleteConfirm.name.trim()
                    ? "linear-gradient(135deg, #DC2626, #B91C1C)"
                    : "var(--eco-gray-200)",
                  color: deleteInput.trim() === deleteConfirm.name.trim() ? "white" : "var(--eco-gray-400)",
                  boxShadow: deleteInput.trim() === deleteConfirm.name.trim()
                    ? "0 4px 14px rgba(220,38,38,.25)"
                    : "none",
                  cursor: deleteInput.trim() === deleteConfirm.name.trim() ? "pointer" : "not-allowed",
                }}
              >
                <Trash2 size={15} />
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <IssuedCredentialModal
        credential={issuedCredential}
        copied={copied === "issued-credential"}
        onCopy={handleCopy}
        onClose={() => setIssuedCredential(null)}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}



