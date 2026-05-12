import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileX,
  Filter,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  UserCog,
  Users,
  X,
  Clock,
  Sparkles,
  Copy,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { exportRowsToCsv } from "../lib/csvExport";
import { canUse } from "../lib/permissions";
import { createNotification } from "../api/notifications";
import { fetchProfileChangeRequests, subscribeProfileChangeRequests, updateProfileChangeRequest } from "../api/profileRequests";
import { fetchCurrentUser, fetchSession, persistSession } from "../api/session";
import { deleteUser, fetchUsersModuleData, resetUserPassword, saveUser, updateUserStatus } from "../api/users";
import { fetchAreas } from "../api/areas";
import { fetchOrgStructure } from "../api/admin";
import {
  USER_AREA_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_ROLE_SUMMARY,
  describeAreaAccess,
  filterUsers,
  getRoleLabel,
} from "../api/users";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const DEFAULT_CAMPUS = "CAMPUS-CT";
const ICON_GRADIENT = "linear-gradient(135deg, var(--eco-primary-500), var(--eco-primary-600))";

const PAGE_STYLES = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctCopied{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
@media(max-width:1120px){
  .ct-users-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .ct-users-header{flex-direction:column;align-items:flex-start!important}
  .ct-users-toolbar{width:100%}
  .ct-users-toolbar button{flex:1}
  .ct-users-table{min-width:980px}
}
@media(max-width:760px){
  .ct-users-kpis{grid-template-columns:1fr!important}
  .ct-users-filters{grid-template-columns:1fr!important}
  .ct-users-modal-grid{grid-template-columns:1fr!important}
  .ct-users-form-actions{flex-direction:column-reverse;align-items:stretch!important}
}
`;

/* â”€â”€â”€ Base styles â”€â”€â”€ */
const cardBase = {
  background: "var(--eco-card)",
  borderRadius: "var(--eco-radius-lg)",
  border: "1px solid var(--eco-border)",
  boxShadow: "var(--eco-shadow-sm)",
};

const inputBase = {
  width: "100%",
  height: 42,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 14px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg)",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const textAreaBase = {
  width: "100%",
  minHeight: 96,
  resize: "vertical",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "10px 14px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg)",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const subtleText = {
  margin: 0,
  fontFamily: fb,
  fontSize: 12,
  color: "var(--eco-text-soft)",
  lineHeight: 1.55,
};

const sectionLabel = {
  margin: 0,
  fontFamily: fb,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--eco-text-soft)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const roleBadgeTone = {
  admin: "primary",
  operativo: "success",
  directivo: "info",
};

const ROLE_COLORS = {
  admin: { bg: "var(--eco-primary-500)", text: "white" },
  operativo: { bg: "var(--eco-success)", text: "white" },
  directivo: { bg: "var(--eco-info)", text: "white" },
};

const emptyForm = (user) => ({
  id: user?.id || "",
  firstName: user?.firstName || "",
  paternalLastName: user?.paternalLastName || "",
  maternalLastName: user?.maternalLastName || "",
  fullName: user?.fullName || "",
  email: user?.email || "",
  internalIdentifier: user?.numericId || user?.internalIdentifier || "",
  role: user?.role || "",
  campusCode: user?.campusCode || "",
  areaAccessMode: user?.areaAccess?.mode || "all",
  areaCodes: user?.areaAccess?.areaCodes || [],
  isActive: typeof user?.isActive === "boolean" ? user.isActive : true,
  forcePasswordChange: typeof user?.forcePasswordChange === "boolean" ? user.forcePasswordChange : false,
  notes: user?.notes || "",
  tempPassword: "",
});

function buildFullName(firstName, paternalLastName, maternalLastName) {
  return [firstName, paternalLastName, maternalLastName].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
}

function requestTypeLabel(type) {
  return type === "password" ? "Cambio de contraseña" : "Cambio de correo";
}

const formatDateTime = (iso) => {
  if (!iso) return "Sin acceso";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isRecentLogin = (iso) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 7;
};

function generateTempPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%";
  const pick = (alphabet) => alphabet[Math.floor(Math.random() * alphabet.length)];
  const chars = [
    pick(uppercase),
    pick(lowercase),
    pick(numbers),
    pick(special),
  ];
  const pool = `${uppercase}${lowercase}${numbers}`;
  while (chars.length < 10) {
    chars.push(pick(pool));
  }
  return chars.sort(() => Math.random() - 0.5).join("");
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Reusable Components
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function Avatar({ name, role, size = 40 }) {
  const colors = ROLE_COLORS[role] || ROLE_COLORS.operativo;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--eco-radius-full)",
        background: colors.bg,
        color: colors.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fd,
        fontSize: size * 0.36,
        fontWeight: 800,
        letterSpacing: "0.02em",
        flexShrink: 0,
        boxShadow: `0 2px 8px ${role === "admin" ? "rgba(34,197,94,0.25)" : role === "directivo" ? "rgba(37,99,235,0.2)" : "rgba(22,163,74,0.2)"}`,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function Badge({ tone = "neutral", children, dot }) {
  const theme = {
    primary: { color: "var(--eco-primary-700)", background: "var(--eco-primary-50)", border: "var(--eco-primary-200)", dot: "var(--eco-primary-500)" },
    success: { color: "var(--eco-success)", background: "var(--eco-success-bg)", border: "#BBF7D0", dot: "var(--eco-success)" },
    neutral: { color: "var(--eco-text-soft)", background: "var(--eco-gray-100)", border: "var(--eco-border)", dot: "var(--eco-gray-400)" },
    warning: { color: "var(--eco-secondary-600)", background: "var(--eco-warning-bg)", border: "#FDE68A", dot: "var(--eco-warning)" },
    info: { color: "var(--eco-info)", background: "var(--eco-info-bg)", border: "#BFDBFE", dot: "var(--eco-info)" },
    danger: { color: "var(--eco-danger)", background: "var(--eco-danger-bg)", border: "#FECACA", dot: "var(--eco-danger)" },
  }[tone] || { color: "var(--eco-text-soft)", background: "var(--eco-gray-100)", border: "var(--eco-border)", dot: "var(--eco-gray-400)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--eco-radius-full)",
        fontFamily: fb,
        fontSize: 11,
        fontWeight: 700,
        background: theme.background,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.dot, flexShrink: 0 }} />
      )}
      {children}
    </span>
  );
}

/* â”€â”€â”€ Filter select (Emissions-style) â”€â”€â”€ */
function BarFilterSelect({ value, onChange, options, icon, placeholder }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {icon && (
        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--eco-gray-400)", display: "flex", pointerEvents: "none", zIndex: 1 }}>
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          height: 32,
          padding: `0 28px 0 ${icon ? 30 : 10}px`,
          borderRadius: "var(--eco-radius-full)",
          border: `1px solid ${value && value !== "all" ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
          background: value && value !== "all" ? "var(--eco-primary-50)" : "white",
          fontFamily: fb,
          fontSize: 12,
          fontWeight: value && value !== "all" ? 600 : 400,
          color: value && value !== "all" ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
          appearance: "none",
          cursor: "pointer",
          outline: "none",
          transition: "all 150ms",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--eco-gray-400)", pointerEvents: "none" }} />
    </div>
  );
}

function StyledInput(props) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...inputBase,
        ...(focused ? { borderColor: "var(--eco-primary-400)", boxShadow: "0 0 0 3px rgba(34,197,94,0.10)" } : {}),
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
        ...(focused ? { borderColor: "var(--eco-primary-400)", boxShadow: "0 0 0 3px rgba(34,197,94,0.10)" } : {}),
        ...props.style,
      }}
    />
  );
}

function StyledTextarea(props) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...textAreaBase,
        ...(focused ? { borderColor: "var(--eco-primary-400)", boxShadow: "0 0 0 3px rgba(34,197,94,0.10)" } : {}),
        ...props.style,
      }}
    />
  );
}

function Field({ label, required, error, helper, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text)", letterSpacing: "0.01em" }}>
        {label}
        {required && <span style={{ color: "var(--eco-danger)", marginLeft: 2 }}>*</span>}
      </span>
      {children}
      {error && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)", display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={11} />
          {error}
        </span>
      )}
      {!error && helper && <span style={{ ...subtleText, fontSize: 11 }}>{helper}</span>}
    </label>
  );
}

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
      boxShadow: hovered ? "0 4px 12px rgba(34,197,94,0.25)" : "0 2px 6px rgba(34,197,94,0.15)",
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

function IconButton({ label, onClick, icon, tone = "default", size = 34 }) {
  const [hovered, setHovered] = useState(false);
  const toneMap = {
    default: {
      bg: hovered ? "var(--eco-primary-50)" : "var(--eco-card)",
      border: hovered ? "var(--eco-primary-300)" : "var(--eco-border)",
      color: hovered ? "var(--eco-primary-700)" : "var(--eco-text-soft)",
    },
    danger: {
      bg: hovered ? "var(--eco-danger-bg)" : "var(--eco-card)",
      border: hovered ? "#FCA5A5" : "var(--eco-border)",
      color: "var(--eco-danger)",
    },
  }[tone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size,
        height: size,
        borderRadius: "var(--eco-radius-md)",
        border: `1px solid ${toneMap.border}`,
        background: toneMap.bg,
        color: toneMap.color,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.18s ease",
      }}
    >
      {icon}
    </button>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isError = toast.tone === "error";
  const toneColor = isError ? "var(--eco-danger)" : "var(--eco-success)";
  const toneBg = isError ? "var(--eco-danger-bg)" : "var(--eco-success-bg)";
  const ToneIcon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 140,
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
        animation: "ctPop .25s cubic-bezier(.33,1,.68,1)",
        borderLeft: `3px solid ${toneColor}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--eco-radius-md)",
          background: toneBg,
          color: toneColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <ToneIcon size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong)" }}>{toast.title}</p>
        <p style={{ ...subtleText, marginTop: 3 }}>{toast.message}</p>
      </div>
    </div>
  );
}

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
    <div style={{ display: "grid", gap: 20 }}>

      {/* Demo Banner Skeleton */}
      <div style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, animation: "ctFadeUp .3s ease-out both" }}>
        <div style={{ ...sa(0), width: 40, height: 40, borderRadius: "var(--eco-radius-md)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...sa(40), width: 200, height: 14, marginBottom: 8 }} />
          <div style={{ ...sa(80), width: "80%", height: 11 }} />
        </div>
      </div>

      {/* KPI Skeletons */}
      <div className="ct-users-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...card, padding: 20, overflow: "hidden", position: "relative", animation: `ctFadeUp .3s ease-out ${60 + i * 60}ms both` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ ...sa(i * 80 + 40), height: 12, width: "55%", borderRadius: 6 }} />
              <div style={{ ...sa(i * 80 + 80), width: 38, height: 38, borderRadius: "var(--eco-radius-md)" }} />
            </div>
            <div style={{ ...sa(i * 80 + 120), height: 28, width: "40%", borderRadius: 8, marginBottom: 8 }} />
            <div style={{ ...sa(i * 80 + 160), height: 10, width: "65%", borderRadius: 5 }} />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div style={{ ...card, border: "1.5px solid var(--eco-primary-500)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, animation: "ctFadeUp .3s ease-out 320ms both" }}>
        <div style={{ ...sa(340), width: 15, height: 15, borderRadius: "50%", flexShrink: 0 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...sa(360 + i * 40), width: 110, height: 32, borderRadius: "var(--eco-radius-full)", flexShrink: 0 }} />
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ ...sa(500), width: 180, height: 32, borderRadius: "var(--eco-radius-full)", flexShrink: 0 }} />
      </div>

      {/* Table Section Label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", animation: "ctFadeUp .3s ease-out 440ms both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...sa(460), width: 14, height: 14, borderRadius: 4 }} />
          <div style={{ ...sa(480), height: 13, width: 140, borderRadius: 6 }} />
        </div>
        <div style={{ ...sa(500), height: 10, width: 90, borderRadius: 5 }} />
      </div>

      {/* Table Skeleton */}
      <div style={{ ...card, overflow: "hidden", animation: "ctFadeUp .3s ease-out 500ms both" }}>
        {/* Table header */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 42 }} />
          {["1.3fr","1.2fr",".7fr",".7fr",".8fr",".5fr"].map((_, c) => (
            <div key={c} style={{ ...sa(520 + c * 20), height: 10, flex: _, borderRadius: 5, width: "70%" }} />
          ))}
        </div>
        {/* Table rows */}
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, borderBottom: row < 5 ? "1px solid var(--eco-border)" : "none" }}>
            <div style={{ ...sa(560 + row * 50), width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.3fr 1.2fr .7fr .7fr .8fr .5fr", gap: 16, alignItems: "center" }}>
              {[0, 1, 2, 3, 4, 5].map((c) => (
                <div key={c} style={{ ...sa(580 + row * 50 + c * 25), height: c === 0 ? 15 : 11, borderRadius: 6, width: c === 0 ? "80%" : "60%" }} />
              ))}
            </div>
          </div>
        ))}
        {/* Table footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--eco-border)", display: "flex", justifyContent: "space-between" }}>
          <div style={{ ...sa(900), height: 10, width: 120, borderRadius: 5 }} />
          <div style={{ ...sa(920), height: 10, width: 80, borderRadius: 5 }} />
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ KPI Card â”€â”€â”€ */
function KpiCard({ title, value, sub, icon, tone = "neutral", delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const toneMap = {
    neutral: { accent: "var(--eco-gray-400)", iconBg: "var(--eco-gray-100)", iconColor: "var(--eco-gray-600)" },
    primary: { accent: "var(--eco-primary-500)", iconBg: "var(--eco-primary-50)", iconColor: "var(--eco-primary-600)" },
    success: { accent: "var(--eco-success)", iconBg: "var(--eco-success-bg)", iconColor: "var(--eco-success)" },
    warning: { accent: "var(--eco-warning)", iconBg: "var(--eco-warning-bg)", iconColor: "var(--eco-secondary-600)" },
    info: { accent: "var(--eco-info)", iconBg: "var(--eco-info-bg)", iconColor: "var(--eco-info)" },
  }[tone];
  const accent = toneMap.accent;
  const iconAccent = toneMap.iconColor;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardBase,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,
        transition: "transform 0.25s cubic-bezier(.33,1,.68,1), box-shadow 0.25s cubic-bezier(.33,1,.68,1), border-color 0.25s ease",
        border: `1px solid color-mix(in srgb, ${accent} ${hovered ? 45 : 22}%, var(--eco-border))`,
        ...(hovered
          ? {
              boxShadow: `0 10px 22px -10px color-mix(in srgb, ${accent} 35%, transparent), 0 4px 10px -4px rgba(15,23,42,0.10)`,
              transform: "translateY(-3px)",
            }
          : {}),
      }}
    >
      {/* Decorative tinted glow in top-right corner */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(130% 90% at 100% 0%, color-mix(in srgb, ${accent} 14%, transparent) 0%, transparent 55%)`, pointerEvents: "none", zIndex: 0 }} />
      {/* Top accent gradient bar */}
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, transparent) 65%, transparent 100%)`, borderRadius: "3px 3px 0 0", zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontWeight: 600, letterSpacing: "-0.005em" }}>{title}</p>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, color-mix(in srgb, ${iconAccent} 22%, transparent) 0%, color-mix(in srgb, ${iconAccent} 10%, transparent) 100%)`,
              border: `1px solid color-mix(in srgb, ${iconAccent} 30%, transparent)`,
              color: iconAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 6px 14px -6px color-mix(in srgb, ${iconAccent} 50%, transparent), inset 0 1px 0 color-mix(in srgb, white 30%, transparent)`,
            }}
          >
            {icon}
          </div>
        </div>
        <p style={{ margin: 0, fontFamily: fm, fontSize: 30, fontWeight: 700, color: "var(--eco-text-strong)", letterSpacing: "-0.025em", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1.2 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   User Form Modal
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function UserFormModal({ state, roles, campusOptions, areaOptions, onClose, onSubmit, onGeneratePassword }) {
  if (!state) return null;
  const { user, form, errors, saving } = state;
  const isEdit = Boolean(user);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: "64px 16px 56px" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "var(--eco-overlay)", backdropFilter: "blur(4px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(96vw, 880px)",
          maxHeight: "calc(100vh - 132px)",
          overflow: "hidden",
          background: "var(--eco-card)",
          border: "1px solid var(--eco-border)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          animation: "ctPop .22s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--eco-radius-lg)",
                background: ICON_GRADIENT,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(34,197,94,0.22)",
              }}
            >
              {isEdit ? <Pencil size={20} /> : <Plus size={20} />}
            </div>
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
              <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-0.01em" }}>
                {isEdit ? "Editar usuario" : "Nuevo usuario"}
              </h3>
              <p style={{ ...subtleText, marginTop: 4, maxWidth: 460 }}>
                {isEdit
                  ? "Modifica la identidad, rol y alcance de acceso del usuario."
                  : "Configura identidad, rol y permisos. La estructura está lista para conectarse a backend."}
              </p>
            </div>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={16} />} />
        </div>

        {/* Form body */}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", minHeight: 0 }}>
          {/* Identity section */}
          <div>
            <p style={{ ...sectionLabel, marginBottom: 12 }}>Identidad</p>
            <div className="ct-users-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
              <Field label="Nombre" required error={errors.firstName}>
                <StyledInput
                  value={form.firstName}
                  onChange={(e) => state.setForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Nombre"
                />
              </Field>
              <Field label="Apellido paterno" required error={errors.paternalLastName}>
                <StyledInput
                  value={form.paternalLastName}
                  onChange={(e) => state.setForm((p) => ({ ...p, paternalLastName: e.target.value }))}
                  placeholder="Apellido paterno"
                />
              </Field>
              <Field label="Apellido materno">
                <StyledInput
                  value={form.maternalLastName}
                  onChange={(e) => state.setForm((p) => ({ ...p, maternalLastName: e.target.value }))}
                  placeholder="Apellido materno"
                />
              </Field>
              <Field label="Correo electrónico" required error={errors.email}>
                <StyledInput
                  value={form.email}
                  onChange={(e) => state.setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="usuario@itsmante.edu.mx"
                />
              </Field>
              <Field label="Identificador interno">
                <StyledInput
                  value={form.internalIdentifier}
                  onChange={(e) => state.setForm((p) => ({ ...p, internalIdentifier: e.target.value }))}
                  placeholder="ADM-001"
                />
              </Field>
              <Field label="Rol" required error={errors.role}>
                <StyledSelect
                  required
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    state.setForm((p) => ({
                      ...p,
                      role: nextRole,
                      areaAccessMode: nextRole === "admin" ? "all" : p.areaAccessMode,
                      areaCodes: nextRole === "admin" ? [] : p.areaCodes,
                    }));
                  }}
                >
                  <option value="" disabled>-- Seleccionar --</option>
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </StyledSelect>
              </Field>
              <Field label="Campus" required error={errors.campusCode} helper="Selecciona el campus donde se registrará el usuario.">
                <StyledSelect
                  required
                  value={form.campusCode}
                  onChange={(e) => {
                    const nextCampus = e.target.value;
                    state.setForm((p) => ({
                      ...p,
                      campusCode: nextCampus,
                      areaCodes: p.areaCodes.filter((code) => areaOptions.some((area) => area.value === code && area.campusCode === nextCampus)),
                    }));
                  }}
                >
                  <option value="" disabled>-- Seleccionar --</option>
                  {campusOptions.map((campus) => (
                    <option key={campus.code} value={campus.code}>{campus.name || campus.code}</option>
                  ))}
                </StyledSelect>
              </Field>
            </div>
          </div>

          {/* Admin warning */}
          {form.role === "admin" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 16,
                borderRadius: "var(--eco-radius-lg)",
                background: "var(--eco-warning-bg)",
                border: "1px solid #FDE68A",
                animation: "ctFadeUp .2s ease-out",
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-md)", background: "rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={16} style={{ color: "var(--eco-secondary-600)" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong)" }}>
                  Permisos elevados
                </p>
                <p style={{ ...subtleText, marginTop: 3, color: "var(--eco-text)" }}>
                  Los administradores tienen acceso total a catálogos, exportaciones y gestión de cuentas.
                </p>
              </div>
            </div>
          )}

          {/* Area access section */}
          <div>
            <p style={{ ...sectionLabel, marginBottom: 12 }}>Acceso a áreas</p>
            <Field label="Modo de acceso" required error={errors.areaCodes}>
              <div style={{ border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden" }}>
                <div style={{ display: "flex", borderBottom: "1px solid var(--eco-border)" }}>
                  {[
                    { key: "all", label: "Todas las áreas" },
                    { key: "custom", label: "Personalizado" },
                  ].map((opt) => {
                    const active = form.areaAccessMode === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        style={{
                          flex: 1,
                          height: 38,
                          border: "none",
                          background: active ? "var(--eco-primary-50)" : "var(--eco-card)",
                          color: active ? "var(--eco-primary-700)" : "var(--eco-text-soft)",
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: form.role === "admin" && opt.key === "custom" ? "not-allowed" : "pointer",
                          opacity: form.role === "admin" && opt.key === "custom" ? 0.5 : 1,
                          transition: "all 0.15s ease",
                          position: "relative",
                        }}
                        onClick={() => opt.key === "all"
                          ? state.setForm((p) => ({ ...p, areaAccessMode: "all", areaCodes: [] }))
                          : state.setForm((p) => ({ ...p, areaAccessMode: "custom" }))}
                        disabled={form.role === "admin" && opt.key === "custom"}
                      >
                        {active && <span style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, borderRadius: 1, background: "var(--eco-primary-500)" }} />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: 16 }}>
                  {form.role === "admin" || form.areaAccessMode === "all" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={14} style={{ color: "var(--eco-primary-500)" }} />
                      <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                        Este usuario podrá consultar todas las áreas del campus.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                      {areaOptions.filter((area) => !area.campusCode || area.campusCode === form.campusCode).map((area) => {
                        const checked = form.areaCodes.includes(area.value);
                        return (
                          <label
                            key={area.value}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "10px 12px",
                              borderRadius: "var(--eco-radius-md)",
                              border: `1.5px solid ${checked ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                              background: checked ? "var(--eco-primary-50)" : "var(--eco-card)",
                              cursor: "pointer",
                              fontFamily: fb,
                              fontSize: 12,
                              color: checked ? "var(--eco-primary-700)" : "var(--eco-text)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: `1.5px solid ${checked ? "var(--eco-primary-500)" : "var(--eco-gray-300)"}`,
                                background: checked ? "var(--eco-primary-500)" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease",
                                flexShrink: 0,
                              }}
                            >
                              {checked && <Check size={12} color="white" strokeWidth={3} />}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                state.setForm((p) => ({
                                  ...p,
                                  areaCodes: e.target.checked
                                    ? [...p.areaCodes, area.value]
                                    : p.areaCodes.filter((i) => i !== area.value),
                                }));
                              }}
                              style={{ display: "none" }}
                            />
                            {area.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Field>
          </div>

          {/* Permissions summary */}
          <div style={{ borderRadius: "var(--eco-radius-lg)", background: "var(--eco-card-muted)", border: "1px dashed var(--eco-border)", padding: 16 }}>
            <p style={{ ...sectionLabel, marginBottom: 10 }}>Permisos del rol: {form.role ? getRoleLabel(form.role) : "--"}</p>
            <div style={{ display: "grid", gap: 4 }}>
              {(USER_ROLE_SUMMARY[form.role] || []).map((line) => (
                <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <ChevronRight size={12} style={{ color: "var(--eco-primary-500)", marginTop: 2, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text)", lineHeight: 1.55 }}>{line}</p>
                </div>
              ))}
              {!form.role ? (
                <p style={{ ...subtleText }}>Selecciona un rol para ver sus permisos.</p>
              ) : null}
            </div>
          </div>

          {/* Password for new users */}
          {!isEdit && (
            <div>
              <p style={{ ...sectionLabel, marginBottom: 12 }}>Credenciales iniciales</p>
              <div className="ct-users-modal-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr auto", gap: 14, alignItems: "start" }}>
                <Field label="Contraseña temporal" error={state.errors.tempPassword} helper="Solo visible durante esta captura inicial.">
                  <StyledInput
                    value={form.tempPassword}
                    onChange={(e) => state.setForm((p) => ({ ...p, tempPassword: e.target.value }))}
                    placeholder="Genera o escribe una contraseña"
                  />
                </Field>
                <div style={{ paddingTop: 22, display: "flex", alignItems: "flex-start" }}>
                  <ActionButton type="button" icon={KeyRound} onClick={onGeneratePassword}>
                    Generar
                  </ActionButton>
                </div>
              </div>
              <p style={{ ...subtleText, marginTop: 8 }}>
                Si se deja vacío, el sistema generará una contraseña segura automáticamente y la mostrará al guardar.
              </p>
            </div>
          )}

          {/* Status & notes */}
          <div>
            <p style={{ ...sectionLabel, marginBottom: 12 }}>Estado y notas</p>
            <div className="ct-users-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Estado del usuario">
                <button
                  type="button"
                  onClick={() => state.setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: "var(--eco-radius-md)",
                    border: `1.5px solid ${form.isActive ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                    background: form.isActive ? "var(--eco-primary-50)" : "var(--eco-card)",
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: form.isActive ? "var(--eco-primary-700)" : "var(--eco-text-soft)" }}>
                    {form.isActive ? "Activo" : "Inactivo"}
                  </span>
                  <span
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: "var(--eco-radius-full)",
                      background: form.isActive ? "var(--eco-primary-500)" : "var(--eco-gray-300)",
                      padding: 3,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: form.isActive ? "flex-end" : "flex-start",
                      transition: "background 0.25s ease",
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#FAFBFC", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "transform 0.2s ease" }} />
                  </span>
                </button>
              </Field>
              <Field label="Forzar cambio de contraseña">
                <button
                  type="button"
                  onClick={() => state.setForm((p) => ({ ...p, forcePasswordChange: !p.forcePasswordChange }))}
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: "var(--eco-radius-md)",
                    border: `1.5px solid ${form.forcePasswordChange ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                    background: form.forcePasswordChange ? "var(--eco-primary-50)" : "var(--eco-card)",
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: form.forcePasswordChange ? "var(--eco-primary-700)" : "var(--eco-text-soft)" }}>
                    {form.forcePasswordChange ? "Activado" : "Desactivado"}
                  </span>
                  <span
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: "var(--eco-radius-full)",
                      background: form.forcePasswordChange ? "var(--eco-primary-500)" : "var(--eco-gray-300)",
                      padding: 3,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: form.forcePasswordChange ? "flex-end" : "flex-start",
                      transition: "background 0.25s ease",
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#FAFBFC", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "transform 0.2s ease" }} />
                  </span>
                </button>
              </Field>
              <Field label="Nota interna" helper="Campo opcional para contexto operativo.">
                <StyledTextarea
                  value={form.notes}
                  onChange={(e) => state.setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ej: acceso temporal para auditoría interna."
                  style={{ minHeight: 72 }}
                />
              </Field>
            </div>
          </div>
          </div>

          {/* Footer */}
          <div
            className="ct-users-form-actions"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "14px 22px",
              borderTop: "1px solid var(--eco-border)",
              background: "var(--eco-card)",
              flexShrink: 0,
            }}
          >
            <p style={{ ...subtleText, fontSize: 11 }}>Los campos con * son obligatorios.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <ActionButton type="button" onClick={onClose}>Cancelar</ActionButton>
              <ActionButton type="submit" tone="primary" icon={isEdit ? Check : Plus} disabled={saving}>
                {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
              </ActionButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   User Detail Drawer
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function UserDetailDrawer({ user, onClose, onEdit, canEdit }) {
  if (!user) return null;

  const detailRows = [
    { icon: MapPin, label: "Campus", value: user.campusCode },
    { icon: Shield, label: "Acceso", value: user.areaAccess.mode === "all" ? "Todas las áreas" : "Personalizado" },
    { icon: Users, label: "Áreas asignadas", value: describeAreaAccess(user) },
    { icon: Clock, label: "Creado", value: formatDateTime(user.createdAt) },
    { icon: Clock, label: "Actualizado", value: formatDateTime(user.updatedAt) },
    { icon: Clock, label: "Último acceso", value: formatDateTime(user.lastLoginAt) },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "var(--eco-overlay)", backdropFilter: "blur(4px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(94vw, 520px)",
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
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ ...subtleText, fontSize: 11, marginBottom: 4 }}>Administración / Usuarios</p>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>Detalle del usuario</h3>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={16} />} />
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* User identity card */}
          <div
            style={{
              background: "linear-gradient(135deg, var(--eco-primary-50), var(--eco-card-muted))",
              border: "1px solid var(--eco-primary-200)",
              borderRadius: "var(--eco-radius-xl)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={user.fullName} role={user.role} size={52} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong)" }}>{user.fullName}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Mail size={12} style={{ color: "var(--eco-text-soft)" }} />
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft)" }}>{user.email}</p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Badge tone={roleBadgeTone[user.role]} dot>{getRoleLabel(user.role)}</Badge>
              <Badge tone={user.isActive ? "success" : "warning"} dot>{user.isActive ? "Activo" : "Inactivo"}</Badge>
              {isRecentLogin(user.lastLoginAt) && <Badge tone="info" dot>Acceso reciente</Badge>}
            </div>
          </div>

          {/* Detail rows */}
          <div style={{ borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)", overflow: "hidden" }}>
            {detailRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label + idx}
                  style={{
                    padding: "13px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    borderBottom: idx < detailRows.length - 1 ? "1px solid var(--eco-border)" : "none",
                    background: idx % 2 === 0 ? "var(--eco-card)" : "var(--eco-card-muted)",
                  }}
                >
                  <Icon size={14} style={{ color: "var(--eco-text-soft)", marginTop: 1, flexShrink: 0 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", flex: 1, gap: 10 }}>
                    <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>{row.label}</span>
                    <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-strong)", textAlign: "right", lineHeight: 1.5 }}>{row.value}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {user.notes && (
            <div style={{ borderRadius: "var(--eco-radius-lg)", border: "1px dashed var(--eco-border)", padding: 16, background: "var(--eco-card-muted)" }}>
              <p style={{ ...sectionLabel, marginBottom: 8 }}>Nota interna</p>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text)", lineHeight: 1.6 }}>{user.notes}</p>
            </div>
          )}

          {/* Permissions summary */}
          <div style={{ borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)", padding: 16 }}>
            <p style={{ ...sectionLabel, marginBottom: 10 }}>Permisos del rol</p>
            <div style={{ display: "grid", gap: 4 }}>
              {USER_ROLE_SUMMARY[user.role].map((line) => (
                <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <ChevronRight size={12} style={{ color: "var(--eco-primary-500)", marginTop: 2, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text)", lineHeight: 1.55 }}>{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--eco-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <ActionButton type="button" onClick={onClose}>Cerrar</ActionButton>
          {canEdit ? <ActionButton type="button" tone="primary" icon={Pencil} onClick={() => onEdit(user)}>Editar usuario</ActionButton> : null}
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Reset Password Modal
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function ResetPasswordModal({ user, tempPassword, onCancel, onConfirm }) {
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const handleCopy = () => {
    if (!tempPassword) return;
    navigator.clipboard?.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "var(--eco-overlay)", backdropFilter: "blur(4px)", animation: "ctOverlay .18s ease-out" }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(92vw, 500px)",
          background: "var(--eco-card)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          border: "1px solid var(--eco-border)",
          padding: 24,
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--eco-radius-md)",
              background: tempPassword ? "var(--eco-success-bg)" : "var(--eco-warning-bg)",
              color: tempPassword ? "var(--eco-success)" : "var(--eco-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {tempPassword ? <CheckCircle2 size={20} /> : <KeyRound size={20} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong)" }}>
              {tempPassword ? "Contraseña generada" : "Restablecer contraseña"}
            </h3>
            <p style={{ ...subtleText, marginTop: 4 }}>
              {tempPassword
                ? "Copia la contraseña ahora. En producción se enviaría por correo."
                : `Se generará una contraseña temporal para ${user.fullName}.`}
            </p>
          </div>
        </div>

        {tempPassword && (
          <div
            style={{
              background: "var(--eco-card-muted)",
              color: "var(--eco-text-strong)",
              borderRadius: "var(--eco-radius-lg)",
              border: "1px solid var(--eco-border)",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contraseña temporal</p>
              <p style={{ margin: "6px 0 0", fontFamily: fm, fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", color: "var(--eco-text-strong)", overflowWrap: "anywhere", lineHeight: 1.35 }}>{tempPassword}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar al portapapeles"
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--eco-radius-md)",
                border: copied ? "1px solid var(--eco-success)" : "1px solid var(--eco-border)",
                background: copied ? "var(--eco-success-bg)" : "var(--eco-card)",
                color: copied ? "var(--eco-success)" : "var(--eco-text-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <ActionButton type="button" onClick={onCancel}>
            {tempPassword ? "Cerrar" : "Cancelar"}
          </ActionButton>
          {!tempPassword && (
            <ActionButton type="button" tone="primary" icon={KeyRound} onClick={onConfirm}>
              Generar contraseña
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Main Page
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function RequestsPanel({ open, requests, canManage, onClose, onApprove, onReject }) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 135, display: "grid", placeItems: "start end", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "var(--eco-overlay)", backdropFilter: "blur(4px)", animation: "ctOverlay .2s ease-out" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(460px, calc(100vw - 32px))",
          maxHeight: "min(78vh, 720px)",
          marginTop: 72,
          background: "var(--eco-card)",
          border: "1px solid var(--eco-border)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "ctPop .22s ease-out",
        }}
      >
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--eco-radius-md)", background: ICON_GRADIENT, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={15} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text-strong)" }}>Peticiones</p>
              <p style={{ ...subtleText, marginTop: 2 }}>{requests.filter((item) => item.status === "pending").length} pendientes</p>
            </div>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={16} />} />
        </div>
        <div style={{ padding: 8, overflowY: "auto", flex: 1 }}>
          {requests.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-text-strong)" }}>Sin peticiones registradas</p>
              <p style={{ ...subtleText, marginTop: 6 }}>Las solicitudes de cambio de correo o contraseña aparecerán aquí.</p>
            </div>
          ) : (
            requests.map((request) => {
              const pending = request.status === "pending";
              const tone = pending ? "warning" : request.status === "approved" ? "success" : "danger";
              return (
                <div key={request.id} style={{ border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", padding: 14, marginBottom: 8, background: "var(--eco-card-muted)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong)" }}>{requestTypeLabel(request.type)}</p>
                      <p style={{ ...subtleText, marginTop: 4 }}>{request.userName}</p>
                    </div>
                    <Badge tone={tone}>{pending ? "Pendiente" : request.status === "approved" ? "Aprobada" : "Rechazada"}</Badge>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text)" }}><strong>Actual:</strong> {request.currentValue || "Sin dato"}</p>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text)" }}><strong>Solicitado:</strong> {request.requestedValue || "Sin dato"}</p>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text)" }}><strong>Motivo:</strong> {request.reason || "Sin motivo"}</p>
                    <p style={{ ...subtleText, fontSize: 11 }}>Creada: {formatDateTime(request.createdAt)}</p>
                    {request.resolvedAt ? <p style={{ ...subtleText, fontSize: 11 }}>Resuelta: {formatDateTime(request.resolvedAt)}</p> : null}
                    {request.resolutionDetail ? <p style={{ ...subtleText, fontSize: 11 }}>{request.resolutionDetail}</p> : null}
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                    {request.history.map((entry) => (
                      <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--eco-primary-500)", marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text)" }}>{entry.actorName}</p>
                          <p style={{ ...subtleText, marginTop: 2 }}>{entry.detail}</p>
                          <p style={{ ...subtleText, marginTop: 2, fontSize: 11 }}>{formatDateTime(entry.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && pending ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <ActionButton type="button" tone="primary" icon={Check} onClick={() => onApprove(request)}>Aprobar</ActionButton>
                      <ActionButton type="button" tone="danger" icon={X} onClick={() => onReject(request)}>Rechazar</ActionButton>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage({ user }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [campusOptions, setCampusOptions] = useState([{ code: DEFAULT_CAMPUS, name: DEFAULT_CAMPUS }]);
  const [areaOptions, setAreaOptions] = useState(USER_AREA_OPTIONS.map((area) => ({ ...area, campusCode: DEFAULT_CAMPUS })));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [formState, setFormState] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [passwordResetState, setPasswordResetState] = useState({ user: null, password: "" });
  const [filters, setFilters] = useState({ search: "", role: "all", status: "active", areaCode: "all" });
  const [requests, setRequests] = useState(() => fetchProfileChangeRequests());
  const [requestsOpen, setRequestsOpen] = useState(false);
  const currentUser = useMemo(() => fetchCurrentUser(), []);
  const permissionUser = user || currentUser;
  const canViewUsers = canUse(permissionUser, "users:view");
  const canCreateUsers = canUse(permissionUser, "users:create");
  const canEditUsers = canUse(permissionUser, "users:edit");
  const canDeleteUsers = canUse(permissionUser, "users:delete");
  const canExportUsers = canUse(permissionUser, "users:export");
  const canManageUsers = canCreateUsers || canEditUsers || canDeleteUsers;

  const loadUsers = async () => {
    try {
      setError("");
      setLoading(true);
      const [{ users: nextUsers, roles: nextRoles }, fetchedAreas, orgStructure] = await Promise.all([
        fetchUsersModuleData(),
        fetchAreas().catch(() => []),
        fetchOrgStructure().catch(() => ({ campuses: [] })),
      ]);
      const nextCampusOptions = Array.from(
        new Map(
          [
            ...nextUsers.map((item) => [item.campusCode || DEFAULT_CAMPUS, {
              code: item.campusCode || DEFAULT_CAMPUS,
              name: item.campusCode || DEFAULT_CAMPUS,
            }]),
            ...fetchedAreas.map((area) => [area.campusCode || DEFAULT_CAMPUS, {
              code: area.campusCode || DEFAULT_CAMPUS,
              name: area.campusCode || DEFAULT_CAMPUS,
            }]),
            ...(orgStructure?.campuses || []).map((campus) => [campus.code || DEFAULT_CAMPUS, {
              code: campus.code || DEFAULT_CAMPUS,
              name: campus.name || campus.code || DEFAULT_CAMPUS,
            }]),
          ].filter(([code]) => code)
        ).values()
      );
      const nextAreaOptions = fetchedAreas.length
        ? fetchedAreas
            .filter((area) => area.isActive !== false)
            .map((area) => ({
              value: area.code,
              label: area.name || area.code,
              campusCode: area.campusCode || DEFAULT_CAMPUS,
            }))
        : USER_AREA_OPTIONS.map((area) => ({ ...area, campusCode: DEFAULT_CAMPUS }));
      setRoles(nextRoles);
      setUsers(nextUsers);
      setCampusOptions(nextCampusOptions.length ? nextCampusOptions : [{ code: DEFAULT_CAMPUS, name: DEFAULT_CAMPUS }]);
      setAreaOptions(nextAreaOptions);
    } catch {
      setError("No se pudieron cargar los usuarios. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => subscribeProfileChangeRequests(setRequests), []);

  const filteredUsers = useMemo(() => filterUsers(users, filters), [users, filters]);
  const pendingRequests = useMemo(() => requests.filter((item) => item.status === "pending"), [requests]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.isActive).length;
    const adminUsers = users.filter((u) => u.role === "admin").length;
    const operativoUsers = users.filter((u) => u.role === "operativo").length;
    const directivoUsers = users.filter((u) => u.role === "directivo").length;
    const recentLoginUsers = users.filter((u) => isRecentLogin(u.lastLoginAt)).length;
    return { activeUsers, adminUsers, operativoUsers, directivoUsers, recentLoginUsers };
  }, [users]);

  const openCreateModal = () => {
    if (!canCreateUsers) return;
    const s = {
      user: null,
      form: emptyForm(null),
      errors: {},
      saving: false,
      setForm: (updater) => {
        setFormState((prev) => {
          if (!prev) return prev;
          const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
          return { ...prev, form: nextForm };
        });
      },
    };
    setFormState(s);
  };

  const openEditModal = (user) => {
    if (!canEditUsers) return;
    const s = {
      user,
      form: emptyForm(user),
      errors: {},
      saving: false,
      setForm: (updater) => {
        setFormState((prev) => {
          if (!prev) return prev;
          const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
          return { ...prev, form: nextForm };
        });
      },
    };
    setDetailUser(null);
    setFormState(s);
  };

  const validateForm = (form, editingUserId) => {
    const errs = {};
    const email = String(form.email || "").trim().toLowerCase();
    const firstName = String(form.firstName || "").trim();
    const paternalLastName = String(form.paternalLastName || "").trim();
    if (!firstName) errs.firstName = "Escribe el nombre.";
    if (!paternalLastName) errs.paternalLastName = "Escribe el apellido paterno.";
    if (!email) errs.email = "Escribe un correo electrónico.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) errs.email = "Escribe un correo electrónico válido.";
    else {
      const dup = users.find((u) => u.id !== editingUserId && u.email.toLowerCase() === email);
      if (dup) errs.email = "Este correo ya está registrado.";
    }
    if (!form.role) errs.role = "Selecciona un rol.";
    if (!form.campusCode) errs.campusCode = "Selecciona un campus.";
    if (form.role !== "admin" && form.areaAccessMode === "custom" && !form.areaCodes.length) {
      errs.areaCodes = "Selecciona al menos un área para acceso personalizado.";
    }
    return errs;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState) return;
    const { user, form } = formState;
    if (user && !canEditUsers) return;
    if (!user && !canCreateUsers) return;
    const errs = validateForm(form, user?.id);
    if (Object.keys(errs).length > 0) {
      setFormState((prev) => (prev ? { ...prev, errors: errs } : prev));
      return;
    }
    setFormState((prev) => (prev ? { ...prev, saving: true, errors: {} } : prev));
    const fullName = buildFullName(form.firstName, form.paternalLastName, form.maternalLastName);
    const payload = {
      id: user?.id,
      firstName: form.firstName.trim(),
      paternalLastName: form.paternalLastName.trim(),
      maternalLastName: form.maternalLastName.trim(),
      fullName,
      email: form.email.trim().toLowerCase(),
      numericId: form.internalIdentifier.trim(),
      role: form.role,
      campusCode: form.campusCode,
      areaAccess: {
        mode: form.role === "admin" ? "all" : form.areaAccessMode,
        areaCodes: form.role === "admin" || form.areaAccessMode === "all" ? [] : form.areaCodes,
      },
      isActive: form.isActive,
      forcePasswordChange: form.forcePasswordChange,
      notes: form.notes.trim(),
      lastLoginAt: user?.lastLoginAt || null,
    };
    if (!user && form.tempPassword.trim()) {
      payload.temporaryPassword = form.tempPassword.trim();
    }

    const result = await saveUser(payload).catch((requestError) => ({ ok: false, error: requestError }));
    if (!result.ok) {
      const code = result.error?.payload?.code;
      const message = result.error?.payload?.message;
      const nextErrors =
        code === "INVALID_PASSWORD"
          ? { tempPassword: message || "La contraseña no cumple la política de seguridad." }
          : { email: code === "CONFLICT" ? "Este correo ya está registrado." : message || "No se pudo guardar el usuario." };
      setFormState((prev) => (prev ? { ...prev, saving: false, errors: nextErrors } : prev));
      return;
    }
    setUsers(result.users);
    setFormState(null);
    if (!user && result.temporaryPassword) {
      setPasswordResetState({ user: result.user, password: result.temporaryPassword });
    }
    setToast({
      title: user ? "Usuario actualizado" : "Usuario creado",
      message: user ? `${payload.fullName} se actualizó correctamente.` : `${payload.fullName} ya está listo para iniciar sesión.`,
    });
  };

  const handleToggleStatus = async (user) => {
    if (!canDeleteUsers) return;
    const nextUsers = await updateUserStatus(user, !user.isActive).catch(() => null);
    if (!nextUsers) {
      setToast({ title: "No se pudo actualizar", message: "Intenta de nuevo en un momento.", tone: "error" });
      return;
    }
    setUsers(nextUsers);
    setToast({
      title: "Estado actualizado",
      message: `${user.fullName} ahora está ${user.isActive ? "inactivo" : "activo"}.`,
    });
  };

  const handleDeleteUser = async (user) => {
    if (!canDeleteUsers) return;
    const confirmed = window.confirm(`¿Dar de baja completamente a ${user.fullName}? Esta acción eliminará la cuenta del sistema.`);
    if (!confirmed) return;

    const nextUsers = await deleteUser(user.id).catch((requestError) => {
      setToast({
        title: "No se pudo borrar",
        message: requestError?.payload?.message || "La cuenta tiene actividad relacionada o no se puede eliminar.",
        tone: "error",
      });
      return null;
    });

    if (!nextUsers) return;
    setUsers(nextUsers);
    setDetailUser((current) => (current?.id === user.id ? null : current));
    setToast({
      title: "Usuario eliminado",
      message: `${user.fullName} fue dado de baja completamente.`,
    });
  };

  const handleExportCsv = () => {
    if (!canExportUsers) return;
    exportRowsToCsv({
      filename: `carbontrack-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: filteredUsers,
      columns: [
        { label: "Nombre", get: (u) => u.fullName },
        { label: "Correo", get: (u) => u.email },
        { label: "Rol", get: (u) => getRoleLabel(u.role) },
        { label: "Estado", get: (u) => (u.isActive ? "Activo" : "Inactivo") },
        { label: "Acceso", get: (u) => (u.areaAccess.mode === "all" ? "Todas las áreas" : describeAreaAccess(u)) },
      ],
    });
    setToast({ title: "CSV exportado", message: "Se exportó el listado filtrado actual." });
    createNotification({
      type: "export_done",
      title: "CSV exportado",
      message: "Se exportó el listado filtrado actual.",
      link: "/admin/usuarios",
      meta: { count: filteredUsers.length, resource: "users" },
    });
  };

  const handleResetPassword = async () => {
    if (!canEditUsers) return;
    if (!passwordResetState.user) return;
    const result = await resetUserPassword(passwordResetState.user.id).catch((requestError) => ({ ok: false, error: requestError }));
    if (!result.ok) {
      setToast({
        title: "No se pudo restablecer",
        message: result.error?.payload?.message || "Intenta de nuevo en un momento.",
        tone: "error",
      });
      return;
    }
    await loadUsers();
    setPasswordResetState({ user: passwordResetState.user, password: result.password });
    setToast({ title: "Contraseña temporal generada", message: `Nueva contraseña para ${passwordResetState.user.fullName}.` });
  };

  const handleApproveRequest = async (request) => {
    if (!canEditUsers) return;
    const actorName = currentUser?.fullName || "Administrador";
    let resolutionDetail = "";

    if (request.type === "email") {
      const targetUser = users.find((item) => item.id === request.userId);
      if (!targetUser) {
        setToast({ title: "No se pudo aprobar", message: "El usuario asociado ya no existe.", tone: "error" });
        return;
      }
      const result = await saveUser({ ...targetUser, email: request.requestedValue, fullName: targetUser.fullName }).catch(() => ({ ok: false }));
      if (!result.ok) {
        setToast({ title: "Correo duplicado", message: "No fue posible aplicar el cambio solicitado.", tone: "error" });
        return;
      }
      setUsers(result.users);
      const activeSession = fetchSession();
      if (activeSession?.userId === targetUser.id) {
        persistSession({ ...activeSession, email: request.requestedValue, role: targetUser.role });
      }
      resolutionDetail = `Se sustituyó ${request.currentValue} por ${request.requestedValue} tras validación administrativa.`;
    } else {
      resolutionDetail = "Se autorizó sustituir la contraseña anterior por una nueva credencial protegida.";
    }

    await updateProfileChangeRequest(request.id, (current) => ({
      ...current,
      status: "approved",
      resolvedAt: new Date().toISOString(),
      resolvedByUserId: currentUser?.id || null,
      resolvedByName: actorName,
      resolutionDetail,
      history: [
        ...(current.history || []),
        {
          action: "approved",
          actorUserId: currentUser?.id || null,
          actorName,
          detail: resolutionDetail,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    await createNotification({
      type: "system",
      title: "Petición aprobada",
      message: `${request.userName}: ${requestTypeLabel(request.type)} aprobada.`,
      link: "/admin/usuarios",
      meta: { requestId: request.id, requestType: request.type, status: "approved" },
    });
    setToast({ title: "Petición aprobada", message: resolutionDetail });
  };

  const handleRejectRequest = async (request) => {
    if (!canEditUsers) return;
    const actorName = currentUser?.fullName || "Administrador";
    const resolutionDetail = request.type === "email"
      ? `Se rechazó sustituir ${request.currentValue} por ${request.requestedValue}.`
      : "Se rechazó el cambio de contraseña solicitado.";

    await updateProfileChangeRequest(request.id, (current) => ({
      ...current,
      status: "rejected",
      resolvedAt: new Date().toISOString(),
      resolvedByUserId: currentUser?.id || null,
      resolvedByName: actorName,
      resolutionDetail,
      history: [
        ...(current.history || []),
        {
          action: "rejected",
          actorUserId: currentUser?.id || null,
          actorName,
          detail: resolutionDetail,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    await createNotification({
      type: "system",
      title: "Petición rechazada",
      message: `${request.userName}: ${requestTypeLabel(request.type)} rechazada.`,
      link: "/admin/usuarios",
      meta: { requestId: request.id, requestType: request.type, status: "rejected" },
    });
    setToast({ title: "Petición rechazada", message: resolutionDetail });
  };

  const clearFilters = () => setFilters({ search: "", role: "all", status: "active", areaCode: "all" });
  const hasActiveFilters = filters.search || filters.role !== "all" || filters.status !== "active" || filters.areaCode !== "all";

  if (!canViewUsers) {
    return (
      <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", minHeight: "100%" }}>
        <style>{PAGE_STYLES}</style>
        <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
          <div style={{ ...cardBase, padding: 24, borderColor: "rgba(220,38,38,0.18)", background: "var(--eco-danger-bg)" }}>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-danger)" }}>Acceso restringido</p>
            <p style={{ ...subtleText, marginTop: 6, color: "var(--eco-danger)" }}>Tu rol no tiene permiso para ver este apartado.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", minHeight: "100%" }}>
      <style>{PAGE_STYLES}</style>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>

        {/* â”€â”€â”€ Page Header â”€â”€â”€ */}
        <div
          className="ct-users-header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--eco-radius-lg)",
                background: ICON_GRADIENT,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(34,197,94,0.2)",
              }}
            >
              <Users size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-0.02em" }}>Usuarios</h1>
              <p style={{ ...subtleText, marginTop: 5, maxWidth: 560 }}>
                {canManageUsers
                  ? "Administra cuentas, roles, permisos y peticiones de cambio de perfil."
                  : "Consulta usuarios y peticiones. Los directivos solo pueden visualizar esta sección."}
              </p>
            </div>
          </div>
          <div className="ct-users-toolbar" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canCreateUsers ? (
              <ActionButton type="button" tone="primary" icon={Plus} onClick={openCreateModal}>
                Nuevo usuario
              </ActionButton>
            ) : null}
            {canExportUsers ? (
              <ActionButton type="button" icon={Download} onClick={handleExportCsv}>
                Exportar CSV
              </ActionButton>
            ) : null}
          </div>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : (
          <>
        <div
          style={{
            ...cardBase,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 30ms both",
          }}
        >
          <div>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text-strong)" }}>Peticiones</p>
            <p style={{ ...subtleText, marginTop: 4 }}>Solicitudes de cambio de correo o contraseña enviadas desde Perfil.</p>
          </div>
          <ActionButton type="button" tone="primary" icon={Bell} onClick={() => setRequestsOpen(true)}>
            Ver peticiones ({pendingRequests.length})
          </ActionButton>
        </div>

        {/* â”€â”€â”€ KPI Cards â”€â”€â”€ */}
        <div className="ct-users-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
          <KpiCard title="Usuarios activos" value={stats.activeUsers} sub={`${stats.recentLoginUsers} con acceso reciente`} icon={<Users size={18} />} tone="primary" delay={80} />
          <KpiCard title="Administradores" value={stats.adminUsers} sub="Control total del sistema" icon={<Shield size={18} />} tone="warning" delay={120} />
          <KpiCard title="Operativos" value={stats.operativoUsers} sub="Captura y operación diaria" icon={<UserCog size={18} />} tone="success" delay={160} />
          <KpiCard title="Directivos" value={stats.directivoUsers} sub="Consulta y seguimiento" icon={<Eye size={18} />} tone="info" delay={200} />
        </div>

        {/* â”€â”€â”€ Filters â”€â”€â”€ */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--eco-radius-lg)",
            border: "1.5px solid var(--eco-primary-500)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            boxShadow: "var(--eco-shadow-sm)",
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 100ms both",
          }}
        >
          <Filter size={15} style={{ color: "var(--eco-gray-400)", flexShrink: 0 }} />

          <BarFilterSelect
            value={filters.role}
            onChange={v => setFilters(p => ({ ...p, role: v }))}
            icon={<Shield size={13} />}
            placeholder="Rol"
            options={[
              { value: "all", label: "Todos los roles" },
              { value: "admin", label: "Administrador" },
              { value: "operativo", label: "Operativo" },
              { value: "directivo", label: "Directivo" },
            ]}
          />

          <BarFilterSelect
            value={filters.status}
            onChange={v => setFilters(p => ({ ...p, status: v }))}
            icon={<CheckCircle2 size={13} />}
            placeholder="Estado"
            options={[
              { value: "active", label: "Activos" },
              { value: "all", label: "Todos" },
              { value: "inactive", label: "Inactivos" },
            ]}
          />

          <BarFilterSelect
            value={filters.areaCode}
            onChange={v => setFilters(p => ({ ...p, areaCode: v }))}
            icon={<Building2 size={13} />}
            placeholder="Área"
            options={[
              { value: "all", label: "Todas las áreas" },
              ...areaOptions.map(a => ({ value: a.value, label: a.label })),
            ]}
          />

          <div style={{ flex: 1 }} />

          <div style={{ position: "relative", display: "inline-flex" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--eco-gray-400)", pointerEvents: "none" }} />
            <input
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              placeholder="Buscar usuario..."
              style={{
                height: 32,
                width: 180,
                padding: "0 10px 0 32px",
                borderRadius: "var(--eco-radius-full)",
                border: "1px solid var(--eco-border)",
                fontFamily: fb,
                fontSize: 12,
                outline: "none",
                transition: "all 150ms",
                color: "var(--eco-gray-700)",
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: "var(--eco-radius-full)",
                border: "1px solid var(--eco-border)",
                background: "var(--eco-danger-bg)",
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--eco-danger)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RotateCcw size={12} />
              Limpiar
            </button>
          )}
        </div>

        {/* â”€â”€â”€ Users Table â”€â”€â”€ */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 120ms both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={14} style={{ color: "var(--eco-text-soft)" }} />
              <p style={{ ...sectionLabel, margin: 0 }}>Listado de usuarios</p>
            </div>
            <p style={{ ...subtleText, fontSize: 11 }}>
              {filteredUsers.length} de {users.length} usuario{users.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {error ? (
          <div
            style={{
              ...cardBase,
              borderColor: "rgba(220,38,38,0.24)",
              background: "var(--eco-danger-bg)",
              padding: 22,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              animation: "eco-shake .4s ease",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "var(--eco-radius-md)", background: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertCircle size={18} style={{ color: "var(--eco-danger)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-danger)" }}>Error al cargar usuarios</p>
              <p style={{ ...subtleText, color: "var(--eco-danger)", marginTop: 3, opacity: 0.85 }}>{error}</p>
            </div>
            <ActionButton type="button" icon={RotateCcw} onClick={loadUsers}>Reintentar</ActionButton>
          </div>
        ) : users.length === 0 ? (
          <div
            style={{
              ...cardBase,
              padding: "56px 24px",
              textAlign: "center",
              animation: "ctFadeUp .4s ease-out",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--eco-gray-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--eco-text-soft)",
              }}
            >
              <Users size={30} />
            </div>
            <p style={{ margin: "0 0 6px", fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-text-strong)" }}>
              Sin usuarios registrados
            </p>
            <p style={{ ...subtleText, maxWidth: 360, margin: "0 auto 16px" }}>
              Este módulo está listo para listar usuarios desde backend. Mientras no existan registros, la tabla permanece vacía.
            </p>
            {canCreateUsers ? (
              <ActionButton type="button" tone="primary" icon={Plus} onClick={openCreateModal}>
                Crear usuario
              </ActionButton>
            ) : null}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div
            style={{
              ...cardBase,
              padding: "56px 24px",
              textAlign: "center",
              animation: "ctFadeUp .4s ease-out",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--eco-gray-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--eco-text-soft)",
              }}
            >
              <FileX size={30} />
            </div>
            <p style={{ margin: "0 0 6px", fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-text-strong)" }}>
              Sin resultados
            </p>
            <p style={{ ...subtleText, maxWidth: 320, margin: "0 auto 16px" }}>
              No hay usuarios que coincidan con los filtros actuales. Prueba ajustando los criterios de búsqueda.
            </p>
            {hasActiveFilters && (
              <ActionButton type="button" icon={RotateCcw} onClick={clearFilters}>Limpiar filtros</ActionButton>
            )}
          </div>
        ) : (
          <div
            style={{
              ...cardBase,
              overflow: "hidden",
              animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 160ms both",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table className="ct-users-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Usuario", "Correo", "Rol", "Acceso", "Estado", "Último acceso", "Acciones"].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "12px 16px",
                          textAlign: label === "Acciones" ? "right" : "left",
                          fontFamily: fb,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--eco-text-soft)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          borderBottom: "2px solid var(--eco-border)",
                          whiteSpace: "nowrap",
                          background: "var(--eco-table-head)",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      style={{
                        animation: `ctFadeUp .25s ease-out ${index * 25}ms both`,
                        transition: "background 160ms",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--eco-card-muted)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--eco-card)"; }}
                      onClick={(e) => {
                        if (e.target.closest("button")) return;
                        setDetailUser(user);
                      }}
                    >
                      {/* User */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar name={user.fullName} role={user.role} size={36} />
                          <div>
                            <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong)" }}>{user.fullName}</p>
                            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                              {formatDateTime(user.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)", fontFamily: fb, fontSize: 13, color: "var(--eco-text)" }}>
                        {user.email}
                      </td>
                      {/* Role */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)" }}>
                        <Badge tone={roleBadgeTone[user.role]} dot>{getRoleLabel(user.role)}</Badge>
                      </td>
                      {/* Access */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <Badge tone={user.areaAccess.mode === "all" ? "primary" : "neutral"}>
                            {user.areaAccess.mode === "all" ? "Todas" : "Custom"}
                          </Badge>
                          {user.areaAccess.mode === "custom" && (
                            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>{describeAreaAccess(user)}</span>
                          )}
                        </div>
                      </td>
                      {/* Status */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)" }}>
                        <Badge tone={user.isActive ? "success" : "warning"} dot>{user.isActive ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      {/* Last login */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isRecentLogin(user.lastLoginAt) && (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--eco-success)", flexShrink: 0 }} />
                          )}
                          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                            {formatDateTime(user.lastLoginAt)}
                          </span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-border)", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <IconButton label="Ver detalle" onClick={() => setDetailUser(user)} icon={<Eye size={15} />} />
                          {canEditUsers ? <IconButton label="Editar" onClick={() => openEditModal(user)} icon={<Pencil size={15} />} /> : null}
                          {canDeleteUsers ? (
                            <IconButton
                              label={user.isActive ? "Desactivar" : "Activar"}
                              onClick={() => handleToggleStatus(user)}
                              icon={<Power size={15} />}
                              tone={user.isActive ? "default" : "danger"}
                            />
                          ) : null}
                          {canEditUsers ? <IconButton label="Restablecer contraseña" onClick={() => setPasswordResetState({ user, password: "" })} icon={<KeyRound size={15} />} /> : null}
                          {canDeleteUsers ? <IconButton label="Eliminar usuario" onClick={() => handleDeleteUser(user)} icon={<Trash2 size={15} />} tone="danger" /> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--eco-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ ...subtleText, fontSize: 11 }}>
                Mostrando {filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""}
              </p>
              <p style={{ ...subtleText, fontSize: 11 }}>
                Haz clic en una fila para ver el detalle
              </p>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      <UserFormModal
        state={formState}
        roles={roles.length ? roles : USER_ROLE_OPTIONS}
        campusOptions={campusOptions}
        areaOptions={areaOptions}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmit}
        onGeneratePassword={() => {
          setFormState((prev) => (prev ? { ...prev, form: { ...prev.form, tempPassword: generateTempPassword() } } : prev));
        }}
      />
      <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} onEdit={openEditModal} canEdit={canEditUsers} />
      <RequestsPanel open={requestsOpen} requests={requests} canManage={canEditUsers} onClose={() => setRequestsOpen(false)} onApprove={handleApproveRequest} onReject={handleRejectRequest} />
      <ResetPasswordModal
        user={passwordResetState.user}
        tempPassword={passwordResetState.password}
        onCancel={() => setPasswordResetState({ user: null, password: "" })}
        onConfirm={handleResetPassword}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
