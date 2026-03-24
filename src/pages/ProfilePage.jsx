import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  HelpCircle,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  MoonStar,
  Palette,
  PencilLine,
  Settings,
  Shield,
  ShieldCheck,
  SunMedium,
  User,
  X,
} from "lucide-react";
import { getSettings, saveSettings } from "../lib/settingsStore";
import { describeAreaAccess, getRoleLabel } from "../lib/usersStore";
import { ensureMockSession, getCurrentUser, getSession, updateCurrentUser } from "../lib/sessionStore";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const PAGE_CSS = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes eco-fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes eco-scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@media(max-width:860px){.ct-profile-grid{grid-template-columns:1fr!important}.ct-profile-sidebar{position:static!important}}
@media(max-width:600px){.ct-profile-session-grid{grid-template-columns:1fr!important}.ct-profile-data-grid{grid-template-columns:1fr!important}.ct-profile-theme-grid{grid-template-columns:1fr!important}}
`;

const pageWrap = { padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" };
const cardBase = { background: "var(--eco-card)", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)" };
const subtleText = { margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft)", lineHeight: 1.6 };
const inputBase = { width: "100%", height: 44, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", background: "var(--eco-input-bg)", color: "var(--eco-text)", padding: "0 14px", fontFamily: fb, fontSize: 14, outline: "none", transition: "border-color .2s ease" };

const themeOptions = [
  { value: "light", label: "Claro", icon: SunMedium, desc: "Fondo luminoso" },
  { value: "dark", label: "Oscuro", icon: MoonStar, desc: "Ahorra energía" },
  { value: "system", label: "Sistema", icon: Monitor, desc: "Se adapta solo" },
];

function formatDateTime(value) {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(value) {
  return String(value || "U").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function browserSummary() {
  if (typeof navigator === "undefined") return "Navegador local";
  const ua = navigator.userAgent;
  if (ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Navegador local";
}

/* ─── Section Header ─── */
function SectionHeader({ icon, title, subtitle, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--eco-radius-md)",
              background: "var(--eco-primary-50)",
              color: "var(--eco-primary-600)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <h2 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-0.01em" }}>{title}</h2>
          {subtitle && <p style={{ ...subtleText, marginTop: 4 }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Info Row ─── */
function InfoRow({ label, value, icon: Icon, mono }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0" }}>
      {Icon && (
        <div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-card-muted)", color: "var(--eco-text-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <Icon size={13} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: "4px 0 0", fontFamily: mono ? fm : fb, fontSize: 14, color: "var(--eco-text)", fontWeight: mono ? 600 : 400 }}>{value}</p>
      </div>
    </div>
  );
}

/* ─── Action Button ─── */
function ActionButton({ tone = "default", icon: Icon, children, style, ...props }) {
  const tones = {
    default: { background: "var(--eco-card)", color: "var(--eco-text)", border: "1px solid var(--eco-border)" },
    primary: { background: "var(--eco-primary-500)", color: "white", border: "1px solid var(--eco-primary-500)" },
    danger: { background: "var(--eco-danger-bg)", color: "var(--eco-danger)", border: "1px solid rgba(248,113,113,0.24)" },
  }[tone];
  return (
    <button
      {...props}
      type={props.type || "button"}
      style={{
        height: 40,
        padding: "0 16px",
        borderRadius: "var(--eco-radius-md)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: fb,
        fontSize: 13,
        fontWeight: 600,
        transition: "all 180ms ease",
        ...tones,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (tone === "primary") {
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(34,197,94,.22)";
          e.currentTarget.style.transform = "translateY(-1px)";
        } else if (tone === "danger") {
          e.currentTarget.style.background = "rgba(248,113,113,0.14)";
        } else {
          e.currentTarget.style.borderColor = "var(--eco-primary-300)";
          e.currentTarget.style.color = "var(--eco-primary-600)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
        if (tone === "default") {
          e.currentTarget.style.borderColor = "var(--eco-border)";
          e.currentTarget.style.color = "var(--eco-text)";
        }
        if (tone === "danger") e.currentTarget.style.background = tones.background;
      }}
    >
      {Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

/* ─── Toast ─── */
function Toast({ toast }) {
  if (!toast) return null;
  const Icon = toast.tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 120,
        minWidth: 290,
        maxWidth: 380,
        background: "var(--eco-card)",
        border: "1px solid var(--eco-border)",
        borderRadius: "var(--eco-radius-lg)",
        boxShadow: "var(--eco-shadow-xl)",
        padding: "16px 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        animation: "eco-scaleIn 0.26s ease both",
        borderLeft: `3px solid ${toast.tone === "error" ? "var(--eco-danger)" : "var(--eco-success)"}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--eco-radius-md)",
          background: toast.tone === "error" ? "var(--eco-danger-bg)" : "var(--eco-success-bg)",
          color: toast.tone === "error" ? "var(--eco-danger)" : "var(--eco-success)",
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

/* ─── Modal Shell ─── */
function ModalShell({ title, description, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--eco-overlay)", backdropFilter: "blur(4px)", animation: "ctOverlay .18s ease-out" }} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          ...cardBase,
          position: "relative",
          width: "100%",
          maxWidth: 560,
          padding: 0,
          overflow: "hidden",
          animation: "ctPop .2s ease-out",
        }}
      >
        {/* Modal header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>{title}</h3>
            {description ? <p style={{ ...subtleText, marginTop: 6 }}>{description}</p> : null}
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
              background: "var(--eco-card-muted)",
              color: "var(--eco-text-soft)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 140ms",
            }}
          >
            <X size={16} />
          </button>
        </div>
        {/* Modal body */}
        <div style={{ padding: "20px 24px" }}>{children}</div>
        {/* Modal footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--eco-border)", background: "var(--eco-surface)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ─── Field ─── */
function Field({ label, hint, error, readOnly = false, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text)" }}>{label}</span>
      <input
        {...props}
        readOnly={readOnly}
        style={{
          ...inputBase,
          borderColor: error ? "var(--eco-danger)" : "var(--eco-border)",
          background: readOnly ? "var(--eco-card-muted)" : "var(--eco-input-bg)",
        }}
      />
      {hint ? <span style={{ ...subtleText, fontSize: 11 }}>{hint}</span> : null}
      {error ? <span style={{ ...subtleText, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PageSkeleton (dark-mode aware, comprehensive)
   ═══════════════════════════════════════════════════════════════ */
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
    <div style={pageWrap}>
      {/* Page header skeleton */}
      <div style={{ ...card, padding: 24, marginBottom: "var(--section-gap, 20px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ ...sa(0), width: 180, height: 28, marginBottom: 8 }} />
          <div style={{ ...sa(30), width: 300, height: 14 }} />
        </div>
        <div style={{ ...sa(60), width: 150, height: 40, borderRadius: "var(--eco-radius-md)" }} />
      </div>

      {/* Two-column layout */}
      <div className="ct-profile-grid" style={{ display: "grid", gridTemplateColumns: "minmax(300px,360px) minmax(0,1fr)", gap: "var(--card-gap, 20px)", alignItems: "start" }}>
        {/* Sidebar skeleton */}
        <div style={{ ...card, padding: 24 }}>
          <div style={{ ...sa(0), width: 92, height: 92, borderRadius: 28, marginBottom: 18 }} />
          <div style={{ ...sa(40), width: 180, height: 22, marginBottom: 8 }} />
          <div style={{ ...sa(60), width: 200, height: 14, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <div style={{ ...sa(80), width: 90, height: 28, borderRadius: "var(--eco-radius-full)" }} />
            <div style={{ ...sa(100), width: 70, height: 28, borderRadius: "var(--eco-radius-full)" }} />
          </div>
          <div style={{ borderTop: "1px solid var(--eco-border)", paddingTop: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <div style={{ ...sa(100 + i * 25), width: 28, height: 28, borderRadius: "var(--eco-radius-sm)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...sa(110 + i * 25), width: 60, height: 10, marginBottom: 6 }} />
                  <div style={{ ...sa(120 + i * 25), width: 140, height: 14 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...sa(220), width: "100%", height: 40, borderRadius: "var(--eco-radius-md)", marginTop: 16 }} />
        </div>

        {/* Main content skeleton */}
        <div style={{ display: "grid", gap: "var(--card-gap, 20px)" }}>
          {/* Edit data section */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div style={{ ...sa(40), width: 36, height: 36, borderRadius: "var(--eco-radius-md)" }} />
              <div>
                <div style={{ ...sa(60), width: 130, height: 18, marginBottom: 6 }} />
                <div style={{ ...sa(80), width: 260, height: 13 }} />
              </div>
            </div>
            <div className="ct-profile-data-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ ...card, padding: 16, boxShadow: "none" }}>
                  <div style={{ ...sa(100 + i * 20), width: 60, height: 10, marginBottom: 8 }} />
                  <div style={{ ...sa(110 + i * 20), width: 110, height: 14 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Preferences section */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div style={{ ...sa(80), width: 36, height: 36, borderRadius: "var(--eco-radius-md)" }} />
              <div>
                <div style={{ ...sa(100), width: 170, height: 18, marginBottom: 6 }} />
                <div style={{ ...sa(120), width: 220, height: 13 }} />
              </div>
            </div>
            <div className="ct-profile-theme-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ ...card, padding: 16, boxShadow: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ ...sa(140 + i * 25), width: 38, height: 38, borderRadius: "var(--eco-radius-md)" }} />
                  <div style={{ ...sa(150 + i * 25), width: 50, height: 12 }} />
                  <div style={{ ...sa(160 + i * 25), width: 70, height: 10 }} />
                </div>
              ))}
            </div>
            <div style={{ ...card, padding: 16, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ ...sa(200), width: 140, height: 14, marginBottom: 6 }} />
                <div style={{ ...sa(220), width: 220, height: 12 }} />
              </div>
              <div style={{ ...sa(240), width: 48, height: 28, borderRadius: "var(--eco-radius-full)" }} />
            </div>
          </div>

          {/* Security section */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div style={{ ...sa(120), width: 36, height: 36, borderRadius: "var(--eco-radius-md)" }} />
              <div>
                <div style={{ ...sa(140), width: 100, height: 18, marginBottom: 6 }} />
                <div style={{ ...sa(160), width: 240, height: 13 }} />
              </div>
            </div>
            <div className="ct-profile-data-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ ...card, padding: 16, boxShadow: "none" }}>
                  <div style={{ ...sa(180 + i * 20), width: 50, height: 10, marginBottom: 8 }} />
                  <div style={{ ...sa(190 + i * 20), width: 100, height: 14 }} />
                </div>
              ))}
            </div>
            <div style={{ ...sa(230), width: 170, height: 40, borderRadius: "var(--eco-radius-md)", marginTop: 16 }} />
          </div>

          {/* Session section */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div style={{ ...sa(160), width: 36, height: 36, borderRadius: "var(--eco-radius-md)" }} />
              <div>
                <div style={{ ...sa(180), width: 80, height: 18, marginBottom: 6 }} />
                <div style={{ ...sa(200), width: 300, height: 13 }} />
              </div>
            </div>
            <div className="ct-profile-session-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ ...card, padding: 16, boxShadow: "none" }}>
                  <div style={{ ...sa(220 + i * 20), width: 70, height: 10, marginBottom: 8 }} />
                  <div style={{ ...sa(230 + i * 20), width: 120, height: 14 }} />
                </div>
              ))}
            </div>
            <div style={{ ...sa(290), width: 140, height: 40, borderRadius: "var(--eco-radius-md)", marginTop: 18 }} />
          </div>

          {/* Help section */}
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div style={{ ...sa(200), width: 36, height: 36, borderRadius: "var(--eco-radius-md)" }} />
              <div>
                <div style={{ ...sa(220), width: 60, height: 18, marginBottom: 6 }} />
                <div style={{ ...sa(240), width: 280, height: 13 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ ...sa(260), width: 150, height: 40, borderRadius: "var(--eco-radius-md)" }} />
              <div style={{ ...sa(280), width: 200, height: 40, borderRadius: "var(--eco-radius-md)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function ProfilePage({ user, onLogout, onUserChange }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(() => getSettings());
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [formErrors, setFormErrors] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", nextPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const activeSession = getSession() || ensureMockSession();
        const currentUser = getCurrentUser({ ensureMock: true }) || user || null;
        setSession(activeSession);
        setProfile(currentUser);
        setSettings(getSettings());
      } catch {
        setError("No se pudo cargar tu perfil.");
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const roleLabel = useMemo(() => getRoleLabel(profile?.roleKey || profile?.role), [profile]);
  const areaLabel = useMemo(() => (profile ? describeAreaAccess(profile) : "Sin acceso"), [profile]);
  const canRender = Boolean(profile && session);

  const openEdit = () => {
    if (!profile) return;
    setForm({ fullName: profile.fullName || profile.name || "", email: profile.email || "" });
    setFormErrors({});
    setEditOpen(true);
  };

  const saveProfile = () => {
    const errors = {};
    const fullName = String(form.fullName || "").trim();
    const email = String(form.email || "").trim().toLowerCase();
    if (!fullName) errors.fullName = "Escribe tu nombre completo.";
    if (!email) errors.email = "Escribe tu correo.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) errors.email = "Escribe un correo válido.";
    if (Object.keys(errors).length > 0) return setFormErrors(errors);
    const result = updateCurrentUser({ fullName, email });
    if (!result.ok) return setFormErrors({ email: "No se pudieron guardar los cambios." });
    setProfile(result.user);
    setSession(result.session);
    onUserChange?.(result.user);
    setEditOpen(false);
    setToast({ title: "Perfil actualizado", message: "Tus datos básicos se guardaron en este dispositivo.", tone: "success" });
  };

  const saveTheme = (theme) => {
    const nextSettings = saveSettings({ ...settings, theme });
    setSettings(nextSettings);
    setToast({ title: "Tema actualizado", message: `Apariencia cambiada a "${themeOptions.find((o) => o.value === theme)?.label || theme}".`, tone: "success" });
  };

  const toggleReducedMotion = () => {
    const nextSettings = saveSettings({ ...settings, ui: { ...settings.ui, reducedMotion: !settings.ui.reducedMotion } });
    setSettings(nextSettings);
    setToast({ title: "Preferencia guardada", message: nextSettings.ui.reducedMotion ? "Animaciones reducidas activadas." : "Animaciones restauradas.", tone: "success" });
  };

  const savePassword = () => {
    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = "Escribe tu contraseña actual.";
    if (!passwordForm.nextPassword || passwordForm.nextPassword.length < 8) errors.nextPassword = "La nueva contraseña debe tener al menos 8 caracteres.";
    if (passwordForm.confirmPassword !== passwordForm.nextPassword) errors.confirmPassword = "La confirmación no coincide.";
    if (Object.keys(errors).length > 0) return setPasswordErrors(errors);
    setPasswordOpen(false);
    setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    setPasswordErrors({});
    setToast({ title: "Contraseña actualizada (demo)", message: "En producción esto se validaría en servidor.", tone: "success" });
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("carbontrack.flash", JSON.stringify({ title: "Sesión cerrada", message: "Tu sesión local se cerró correctamente." }));
    }
    onLogout?.();
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <>
        <style>{PAGE_CSS}</style>
        <PageSkeleton />
      </>
    );
  }

  /* ─── Error ─── */
  if (error) {
    return (
      <>
        <style>{PAGE_CSS}</style>
        <div style={pageWrap}>
          <div style={{ ...cardBase, padding: 24, borderColor: "rgba(248,113,113,0.28)", background: "var(--eco-danger-bg)" }}>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-danger)" }}>No se pudo cargar tu perfil.</p>
            <p style={{ ...subtleText, marginTop: 8, color: "var(--eco-danger)" }}>{error}</p>
          </div>
        </div>
      </>
    );
  }

  /* ─── No session ─── */
  if (!canRender) {
    return (
      <>
        <style>{PAGE_CSS}</style>
        <div style={pageWrap}>
          <div style={{ ...cardBase, padding: 24 }}>
            <h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-text-strong)" }}>Mi perfil</h1>
            <p style={{ ...subtleText, marginTop: 8 }}>No hay sesión activa. Inicia sesión para ver tu perfil.</p>
            <div style={{ marginTop: 18 }}>
              <ActionButton tone="primary" icon={ChevronRight} onClick={() => navigate("/login")}>Ir a Login</ActionButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{PAGE_CSS}</style>
      <div style={pageWrap}>
        {/* ═══ PAGE HEADER ═══ */}
        <div
          style={{
            ...cardBase,
            padding: "20px 24px",
            marginBottom: "var(--section-gap, 20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--eco-radius-md)",
                background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 20px rgba(34,197,94,.18)",
              }}
            >
              <User size={19} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontFamily: fd, fontSize: 26, fontWeight: 800, color: "var(--eco-text-strong)", letterSpacing: "-0.02em" }}>Mi perfil</h1>
              <p style={{ ...subtleText, marginTop: 4 }}>Administra tu información y preferencias de cuenta.</p>
            </div>
          </div>
          <ActionButton icon={Settings} onClick={() => navigate("/configuracion")}>Configuración</ActionButton>
        </div>

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div
          className="ct-profile-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px,360px) minmax(0,1fr)",
            gap: "var(--card-gap, 20px)",
            alignItems: "start",
          }}
        >
          {/* ─── SIDEBAR: Profile Card ─── */}
          <section
            className="ct-profile-sidebar"
            style={{
              ...cardBase,
              padding: 24,
              animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 60ms both",
              position: "sticky",
              top: "calc(var(--header-h, 64px) + 24px)",
            }}
          >
            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 28,
                  background: "linear-gradient(135deg, var(--eco-primary-500), var(--eco-primary-700))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fd,
                  fontSize: 30,
                  fontWeight: 800,
                  boxShadow: "0 18px 30px rgba(34,197,94,0.20)",
                  marginBottom: 14,
                }}
              >
                {initials(profile.fullName || profile.name)}
              </div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text-strong)", textAlign: "center" }}>
                {profile.fullName || profile.name}
              </p>
              <p style={{ ...subtleText, marginTop: 4, textAlign: "center" }}>{profile.email}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, justifyContent: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: "var(--eco-radius-full)",
                    background: "var(--eco-primary-50)",
                    color: "var(--eco-primary-700)",
                    border: "1px solid var(--eco-primary-200)",
                    fontFamily: fb,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <ShieldCheck size={13} />{roleLabel}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: "var(--eco-radius-full)",
                    background: "var(--eco-success-bg)",
                    color: "var(--eco-success)",
                    border: "1px solid rgba(74,222,128,0.24)",
                    fontFamily: fb,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={13} />Activo
                </span>
              </div>
            </div>

            {/* Details */}
            <div style={{ borderTop: "1px solid var(--eco-border)", paddingTop: 14 }}>
              <InfoRow label="Acceso" value={areaLabel} icon={Globe} />
              <InfoRow label="Campus" value={profile.campusCode || "Sin campus asignado"} icon={Shield} />
              <InfoRow label="Estado" value={profile.isActive ? "Activo" : "Inactivo"} icon={CheckCircle2} />
              <InfoRow label="Último acceso" value={formatDateTime(profile.lastLoginAt || session?.createdAt)} icon={Clock} />
            </div>

            {/* Edit button */}
            <ActionButton
              icon={PencilLine}
              tone="primary"
              onClick={openEdit}
              style={{ width: "100%", justifyContent: "center", marginTop: 16, height: 42, fontSize: 14 }}
            >
              Editar datos
            </ActionButton>
          </section>

          {/* ─── MAIN CONTENT ─── */}
          <div style={{ display: "grid", gap: "var(--card-gap, 20px)" }}>

            {/* ═══ DATOS PERSONALES ═══ */}
            <section style={{ ...cardBase, padding: 24, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 120ms both" }}>
              <SectionHeader
                icon={<PencilLine size={16} />}
                title="Datos personales"
                subtitle="Tu nombre y correo son editables. El rol y acceso los controla un administrador."
              >
                <ActionButton icon={PencilLine} onClick={openEdit}>Editar</ActionButton>
              </SectionHeader>
              <div className="ct-profile-data-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Nombre completo", value: profile.fullName || profile.name },
                  { label: "Correo electrónico", value: profile.email },
                  { label: "Rol asignado", value: roleLabel },
                  { label: "Acceso por áreas", value: areaLabel },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      ...cardBase,
                      background: "var(--eco-card-muted)",
                      padding: 16,
                      boxShadow: "none",
                      transition: "border-color 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--eco-primary-200)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--eco-border)"; }}
                  >
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 14, fontWeight: 500, color: "var(--eco-text)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ PREFERENCIAS ═══ */}
            <section style={{ ...cardBase, padding: 24, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 180ms both" }}>
              <SectionHeader
                icon={<Palette size={16} />}
                title="Preferencias de apariencia"
                subtitle="Elige cómo se ve el sistema para ti."
              />

              {/* Theme selector */}
              <div className="ct-profile-theme-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 18 }}>
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const active = settings.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => saveTheme(option.value)}
                      style={{
                        borderRadius: "var(--eco-radius-lg)",
                        border: `1.5px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
                        background: active ? "var(--eco-primary-50)" : "var(--eco-card)",
                        color: active ? "var(--eco-primary-700)" : "var(--eco-text)",
                        padding: "18px 12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: fb,
                        fontSize: 13,
                        fontWeight: 700,
                        position: "relative",
                        transition: "all 180ms ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.borderColor = "var(--eco-primary-200)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.borderColor = "var(--eco-border)";
                      }}
                    >
                      {active && (
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "var(--eco-primary-500)",
                            display: "grid",
                            placeItems: "center",
                            boxShadow: "0 2px 6px rgba(34,197,94,.2)",
                          }}
                        >
                          <Check size={11} color="white" strokeWidth={3} />
                        </span>
                      )}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "var(--eco-radius-md)",
                          background: active ? "var(--eco-primary-100)" : "var(--eco-card-muted)",
                          display: "grid",
                          placeItems: "center",
                          transition: "background 180ms",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      {option.label}
                      <span style={{ fontFamily: fb, fontSize: 10, fontWeight: 400, color: "var(--eco-text-soft)", marginTop: -2 }}>{option.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Reduced motion toggle */}
              <div
                style={{
                  ...cardBase,
                  background: settings.ui.reducedMotion ? "var(--eco-primary-50)" : "var(--eco-card-muted)",
                  border: `1px solid ${settings.ui.reducedMotion ? "var(--eco-primary-200)" : "var(--eco-border)"}`,
                  padding: 16,
                  boxShadow: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  marginBottom: 14,
                  transition: "all 200ms ease",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 14, fontWeight: 700, color: "var(--eco-text)" }}>Reducir animaciones</p>
                  <p style={{ ...subtleText, marginTop: 4, fontSize: 12 }}>Disminuye las transiciones no esenciales del sistema.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleReducedMotion}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: "var(--eco-radius-full)",
                    border: "none",
                    background: settings.ui.reducedMotion ? "var(--eco-primary-500)" : "var(--eco-gray-300)",
                    padding: 4,
                    display: "flex",
                    alignItems: settings.ui.reducedMotion ? "center" : "center",
                    justifyContent: settings.ui.reducedMotion ? "flex-end" : "flex-start",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--eco-surface)",
                      boxShadow: "var(--eco-shadow-sm)",
                      transition: "all 200ms ease",
                    }}
                  />
                </button>
              </div>

              {/* Config link */}
              <button
                type="button"
                onClick={() => navigate("/configuracion")}
                style={{
                  width: "100%",
                  borderRadius: "var(--eco-radius-md)",
                  border: "1px dashed var(--eco-border)",
                  background: "transparent",
                  color: "var(--eco-text)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontFamily: fb,
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 150ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--eco-primary-300)";
                  e.currentTarget.style.color = "var(--eco-primary-600)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--eco-border)";
                  e.currentTarget.style.color = "var(--eco-text)";
                }}
              >
                Ir a Configuración para opciones avanzadas
                <ChevronRight size={15} />
              </button>
            </section>

            {/* ═══ SEGURIDAD ═══ */}
            <section style={{ ...cardBase, padding: 24, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 240ms both" }}>
              <SectionHeader
                icon={<Shield size={16} />}
                title="Seguridad"
                subtitle="Gestiona tu contraseña y permisos de acceso."
              />
              <div className="ct-profile-data-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginBottom: 16 }}>
                {[
                  { label: "Rol", value: roleLabel },
                  { label: "Acceso", value: areaLabel },
                ].map((item) => (
                  <div key={item.label} style={{ ...cardBase, background: "var(--eco-card-muted)", padding: 16, boxShadow: "none" }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 14, fontWeight: 500, color: "var(--eco-text)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ ...subtleText, fontSize: 11, marginBottom: 14 }}>En producción la contraseña se valida en servidor.</p>
              <ActionButton
                tone="primary"
                icon={KeyRound}
                onClick={() => { setPasswordErrors({}); setPasswordOpen(true); }}
              >
                Cambiar contraseña
              </ActionButton>
            </section>

            {/* ═══ SESIÓN ═══ */}
            <section style={{ ...cardBase, padding: 24, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 300ms both" }}>
              <SectionHeader
                icon={<Clock size={16} />}
                title="Sesión"
                subtitle="Tu actividad reciente y sesión local activa."
              />
              <div className="ct-profile-session-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Último acceso", value: formatDateTime(profile.lastLoginAt || session?.createdAt) },
                  { label: "Acceso actual", value: formatDateTime(session?.createdAt) },
                  { label: "Dispositivo", value: browserSummary() },
                ].map((item) => (
                  <div key={item.label} style={{ ...cardBase, background: "var(--eco-card-muted)", padding: 16, boxShadow: "none" }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 14, fontWeight: 500, color: "var(--eco-text)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18 }}>
                <ActionButton tone="danger" icon={LogOut} onClick={() => setLogoutOpen(true)}>Cerrar sesión</ActionButton>
              </div>
            </section>

            {/* ═══ AYUDA ═══ */}
            <section style={{ ...cardBase, padding: 24, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 360ms both" }}>
              <SectionHeader
                icon={<HelpCircle size={16} />}
                title="Ayuda"
                subtitle="Si necesitas cambiar tu rol o acceso, contacta a un administrador."
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ActionButton
                  icon={Mail}
                  onClick={() => { window.location.href = "mailto:soporte@carbontrack.local?subject=Soporte%20CarbonTrack"; }}
                >
                  Contactar soporte
                </ActionButton>
                <ActionButton icon={User} onClick={() => navigate("/admin/usuarios")}>Ver administración de usuarios</ActionButton>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {editOpen ? (
        <ModalShell
          title="Editar datos"
          description="Actualiza tu nombre y tu correo. El rol y el acceso permanecen protegidos."
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <ActionButton onClick={() => setEditOpen(false)}>Cancelar</ActionButton>
              <ActionButton tone="primary" icon={Check} onClick={saveProfile}>Guardar cambios</ActionButton>
            </>
          }
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Nombre completo" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} error={formErrors.fullName} />
            <Field label="Correo electrónico" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} error={formErrors.email} />
            <Field label="Rol" value={roleLabel} readOnly hint="Solo un administrador puede cambiar esto." />
            <Field label="Acceso" value={areaLabel} readOnly hint="Solo un administrador puede cambiar esto." />
          </div>
        </ModalShell>
      ) : null}

      {passwordOpen ? (
        <ModalShell
          title="Cambiar contraseña"
          description="Ingresa tu contraseña actual y define una nueva."
          onClose={() => setPasswordOpen(false)}
          footer={
            <>
              <ActionButton onClick={() => setPasswordOpen(false)}>Cancelar</ActionButton>
              <ActionButton tone="primary" icon={KeyRound} onClick={savePassword}>Actualizar contraseña</ActionButton>
            </>
          }
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Contraseña actual" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} error={passwordErrors.currentPassword} />
            <Field label="Nueva contraseña" type="password" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))} error={passwordErrors.nextPassword} hint="Usa al menos 8 caracteres." />
            <Field label="Confirmar nueva contraseña" type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} error={passwordErrors.confirmPassword} />
          </div>
        </ModalShell>
      ) : null}

      {logoutOpen ? (
        <ModalShell
          title="Cerrar sesión"
          description="¿Seguro que deseas cerrar sesión?"
          onClose={() => setLogoutOpen(false)}
          footer={
            <>
              <ActionButton onClick={() => setLogoutOpen(false)}>Cancelar</ActionButton>
              <ActionButton tone="danger" icon={LogOut} onClick={handleLogout}>Cerrar sesión</ActionButton>
            </>
          }
        >
          <div
            style={{
              background: "var(--eco-warning-bg)",
              border: "1px solid #FDE68A",
              borderRadius: "var(--eco-radius-lg)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertCircle size={16} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ ...subtleText, color: "var(--eco-text)" }}>Se limpiará la sesión local actual y volverás a la pantalla de acceso.</p>
          </div>
        </ModalShell>
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
