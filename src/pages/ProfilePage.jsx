import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, CheckCircle2, ChevronRight, KeyRound, LogOut, Mail, Monitor, MoonStar, PencilLine, Settings, ShieldCheck, SunMedium, User, X } from "lucide-react";
import { getSettings, saveSettings } from "../lib/settingsStore";
import { describeAreaAccess, getRoleLabel } from "../lib/usersStore";
import { ensureMockSession, getCurrentUser, getSession, updateCurrentUser } from "../lib/sessionStore";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const pageWrap = { padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" };
const cardBase = { background: "var(--eco-card)", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)" };
const subtleText = { margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft)", lineHeight: 1.6 };
const inputBase = { width: "100%", height: 44, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", background: "var(--eco-input-bg)", color: "var(--eco-text)", padding: "0 14px", fontFamily: fb, fontSize: 14, outline: "none" };
const themeOptions = [
  { value: "light", label: "Claro", icon: SunMedium },
  { value: "dark", label: "Oscuro", icon: MoonStar },
  { value: "system", label: "Sistema", icon: Monitor },
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

function ActionButton({ tone = "default", icon: Icon, children, style, ...props }) {
  const tones = {
    default: { background: "var(--eco-card)", color: "var(--eco-text)", border: "1px solid var(--eco-border)" },
    primary: { background: "var(--eco-primary-500)", color: "white", border: "1px solid var(--eco-primary-500)" },
    danger: { background: "var(--eco-danger-bg)", color: "var(--eco-danger)", border: "1px solid rgba(248,113,113,0.24)" },
  }[tone];
  return (
    <button {...props} type={props.type || "button"} style={{ height: 40, padding: "0 16px", borderRadius: "var(--eco-radius-md)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: fb, fontSize: 13, fontWeight: 600, ...tones, ...style }}>
      {Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const Icon = toast.tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div role="alert" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 120, minWidth: 290, maxWidth: 380, background: "var(--eco-card)", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-xl)", padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start", animation: "eco-scaleIn 0.26s ease both", borderLeft: `3px solid ${toast.tone === "error" ? "var(--eco-danger)" : "var(--eco-success)"}` }}>
      <div style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-md)", background: toast.tone === "error" ? "var(--eco-danger-bg)" : "var(--eco-success-bg)", color: toast.tone === "error" ? "var(--eco-danger)" : "var(--eco-success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong)" }}>{toast.title}</p>
        <p style={{ ...subtleText, marginTop: 4 }}>{toast.message}</p>
      </div>
    </div>
  );
}

function ModalShell({ title, description, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--eco-overlay)", backdropFilter: "blur(4px)" }} />
      <div role="dialog" aria-modal="true" style={{ ...cardBase, position: "relative", width: "100%", maxWidth: 560, padding: 24, animation: "eco-fadeInUp 0.25s ease both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text-strong)" }}>{title}</h3>
            {description ? <p style={{ ...subtleText, marginTop: 6 }}>{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", background: "var(--eco-card-muted)", color: "var(--eco-text-soft)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>
        <div>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>{footer}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, error, readOnly = false, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text)" }}>{label}</span>
      <input {...props} readOnly={readOnly} style={{ ...inputBase, borderColor: error ? "var(--eco-danger)" : "var(--eco-border)", background: readOnly ? "var(--eco-card-muted)" : "var(--eco-input-bg)" }} />
      {hint ? <span style={subtleText}>{hint}</span> : null}
      {error ? <span style={{ ...subtleText, color: "var(--eco-danger)" }}>{error}</span> : null}
    </label>
  );
}

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
    }, 180);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
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
    setToast({ title: "Preferencias guardadas", message: "La apariencia se actualizó correctamente.", tone: "success" });
  };

  const toggleReducedMotion = () => {
    const nextSettings = saveSettings({ ...settings, ui: { ...settings.ui, reducedMotion: !settings.ui.reducedMotion } });
    setSettings(nextSettings);
    setToast({ title: "Preferencias guardadas", message: "La preferencia visual se actualizó correctamente.", tone: "success" });
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

  if (loading) return <div style={pageWrap}><div style={{ ...cardBase, padding: 24 }}><p style={{ ...subtleText }}>Cargando perfil...</p></div></div>;
  if (error) return <div style={pageWrap}><div style={{ ...cardBase, padding: 24, borderColor: "rgba(248,113,113,0.28)", background: "var(--eco-danger-bg)" }}><p style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-danger)" }}>No se pudo cargar tu perfil.</p><p style={{ ...subtleText, marginTop: 8, color: "var(--eco-danger)" }}>{error}</p></div></div>;
  if (!canRender) return <div style={pageWrap}><div style={{ ...cardBase, padding: 24 }}><h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-text-strong)" }}>Mi perfil</h1><p style={{ ...subtleText, marginTop: 8 }}>No hay sesión activa. Inicia sesión para ver tu perfil.</p><div style={{ marginTop: 18 }}><ActionButton tone="primary" icon={ChevronRight} onClick={() => navigate("/login")}>Ir a Login</ActionButton></div></div></div>;

  return (
    <>
      <div style={pageWrap}>
        <div style={{ ...cardBase, padding: 24, marginBottom: "var(--section-gap)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", animation: "eco-fadeInUp 0.35s ease both" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: fd, fontSize: 30, fontWeight: 800, color: "var(--eco-text-strong)" }}>Mi perfil</h1>
            <p style={{ ...subtleText, marginTop: 8 }}>Administra tu información y preferencias de cuenta.</p>
          </div>
          <ActionButton icon={Settings} onClick={() => navigate("/configuracion")}>Ir a Configuración</ActionButton>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,360px) minmax(0,1fr)", gap: "var(--card-gap)", alignItems: "start" }}>
          <section style={{ ...cardBase, padding: 24, animation: "eco-fadeInUp 0.4s ease 60ms both", position: "sticky", top: "calc(var(--header-h) + 24px)" }}>
            <div style={{ width: 92, height: 92, borderRadius: 28, background: "linear-gradient(135deg, var(--eco-primary-500), var(--eco-primary-700))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fd, fontSize: 30, fontWeight: 800, boxShadow: "0 18px 30px rgba(34,197,94,0.20)", marginBottom: 18 }}>{initials(profile.fullName || profile.name)}</div>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-text-strong)" }}>{profile.fullName || profile.name}</p>
            <p style={{ ...subtleText, marginTop: 6 }}>{profile.email}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-primary-50)", color: "var(--eco-primary-700)", border: "1px solid var(--eco-primary-200)", fontFamily: fb, fontSize: 12, fontWeight: 700 }}><ShieldCheck size={13} />{roleLabel}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-success-bg)", color: "var(--eco-success)", border: "1px solid rgba(74,222,128,0.24)", fontFamily: fb, fontSize: 12, fontWeight: 700 }}><CheckCircle2 size={13} />Activo</span>
            </div>
            <div style={{ borderTop: "1px solid var(--eco-border)", paddingTop: 16, display: "grid", gap: 12, marginTop: 16 }}>
              {[{ label: "Acceso", value: areaLabel }, { label: "Campus/Institución", value: profile.campusCode || "Sin campus asignado" }, { label: "Estado", value: profile.isActive ? "Activo" : "Inactivo" }, { label: "Último acceso", value: formatDateTime(profile.lastLoginAt || session?.createdAt) }].map((item) => (
                <div key={item.label}>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                  <p style={{ margin: "5px 0 0", fontFamily: fb, fontSize: 14, color: "var(--eco-text)" }}>{item.value}</p>
                </div>
              ))}
            </div>
            <ActionButton icon={PencilLine} onClick={openEdit} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>Editar datos</ActionButton>
          </section>

          <div style={{ display: "grid", gap: "var(--card-gap)" }}>
            <section style={{ ...cardBase, padding: 24, animation: "eco-fadeInUp 0.4s ease 120ms both" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                <div><h2 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>Editar datos</h2><p style={{ ...subtleText, marginTop: 6 }}>Actualiza tu nombre y tu correo. El rol y el acceso son solo lectura.</p></div>
                <ActionButton icon={PencilLine} onClick={openEdit}>Editar datos</ActionButton>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
                {[{ label: "Nombre completo", value: profile.fullName }, { label: "Correo", value: profile.email }, { label: "Rol", value: roleLabel }, { label: "Acceso", value: areaLabel }].map((item) => (
                  <div key={item.label} style={{ ...cardBase, background: "var(--eco-card-muted)", padding: 16, boxShadow: "none" }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 14, color: "var(--eco-text)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ ...subtleText, marginTop: 14 }}>Solo un administrador puede cambiar esto.</p>
            </section>

            <section style={{ ...cardBase, padding: 24, animation: "eco-fadeInUp 0.4s ease 180ms both" }}>
              <h2 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>Preferencias rápidas</h2>
              <p style={{ ...subtleText, marginTop: 6, marginBottom: 18 }}>Usa el sistema existente de tema y movimiento.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const active = settings.theme === option.value;
                  return <button key={option.value} type="button" onClick={() => saveTheme(option.value)} style={{ borderRadius: "var(--eco-radius-md)", border: `1.5px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`, background: active ? "var(--eco-primary-50)" : "var(--eco-card)", color: active ? "var(--eco-primary-700)" : "var(--eco-text)", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: fb, fontSize: 12, fontWeight: 700, position: "relative" }}>
                    {active ? <span style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "var(--eco-primary-500)", display: "grid", placeItems: "center" }}><Check size={11} color="white" strokeWidth={3} /></span> : null}
                    <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: active ? "var(--eco-primary-100)" : "var(--eco-card-muted)", display: "grid", placeItems: "center" }}><Icon size={18} /></div>
                    {option.label}
                  </button>;
                })}
              </div>
              <div style={{ ...cardBase, background: settings.ui.reducedMotion ? "var(--eco-primary-50)" : "var(--eco-card-muted)", padding: 16, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 12 }}>
                <div><p style={{ margin: 0, fontFamily: fb, fontSize: 14, fontWeight: 700, color: "var(--eco-text)" }}>Reducir animaciones</p><p style={{ ...subtleText, marginTop: 4 }}>Disminuye las transiciones no esenciales del sistema.</p></div>
                <button type="button" onClick={toggleReducedMotion} style={{ width: 48, height: 28, borderRadius: "var(--eco-radius-full)", border: "none", background: settings.ui.reducedMotion ? "var(--eco-primary-500)" : "var(--eco-gray-300)", padding: 4, display: "flex", justifyContent: settings.ui.reducedMotion ? "flex-end" : "flex-start", cursor: "pointer" }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--eco-surface)", boxShadow: "var(--eco-shadow-sm)" }} /></button>
              </div>
              <button type="button" onClick={() => navigate("/configuracion")} style={{ width: "100%", borderRadius: "var(--eco-radius-md)", border: "1px dashed var(--eco-border)", background: "transparent", color: "var(--eco-text)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: fb, fontSize: 13, fontWeight: 600 }}>Ir a Configuración para opciones avanzadas<ChevronRight size={15} /></button>
            </section>

            <section style={{ ...cardBase, padding: 24, animation: "eco-fadeInUp 0.4s ease 240ms both" }}>
              <h2 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>Seguridad</h2>
              <p style={{ ...subtleText, marginTop: 6, marginBottom: 18 }}>En producción esto se validaría en servidor.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
                {[{ label: "Rol", value: roleLabel }, { label: "Acceso", value: areaLabel }].map((item) => (
                  <div key={item.label} style={{ ...cardBase, background: "var(--eco-card-muted)", padding: 16, boxShadow: "none" }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 14, color: "var(--eco-text)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}><ActionButton tone="primary" icon={KeyRound} onClick={() => { setPasswordErrors({}); setPasswordOpen(true); }}>Cambiar contraseña</ActionButton></div>
            </section>

            <section style={{ ...cardBase, padding: 24, animation: "eco-fadeInUp 0.4s ease 300ms both" }}>
              <h2 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>Sesión</h2>
              <p style={{ ...subtleText, marginTop: 6, marginBottom: 18 }}>Consulta tu actividad reciente y cierra la sesión local cuando lo necesites.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
                {[{ label: "Último acceso", value: formatDateTime(profile.lastLoginAt || session?.createdAt) }, { label: "Acceso actual", value: formatDateTime(session?.createdAt) }, { label: "Dispositivo/Navegador", value: browserSummary() }].map((item) => (
                  <div key={item.label} style={{ ...cardBase, background: "var(--eco-card-muted)", padding: 16, boxShadow: "none" }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 11, fontWeight: 700, color: "var(--eco-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                    <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 14, color: "var(--eco-text)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18 }}><ActionButton tone="danger" icon={LogOut} onClick={() => setLogoutOpen(true)}>Cerrar sesión</ActionButton></div>
            </section>

            <section style={{ ...cardBase, padding: 24, animation: "eco-fadeInUp 0.4s ease 360ms both" }}>
              <h2 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong)" }}>Ayuda</h2>
              <p style={{ ...subtleText, marginTop: 8 }}>Si necesitas cambiar rol o acceso, contacta a un administrador.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <ActionButton icon={Mail} onClick={() => { window.location.href = "mailto:soporte@carbontrack.local?subject=Soporte%20CarbonTrack"; }}>Contactar soporte</ActionButton>
                <ActionButton icon={User} onClick={() => navigate("/admin/usuarios")}>Ver administración de usuarios</ActionButton>
              </div>
            </section>
          </div>
        </div>
      </div>

      {editOpen ? <ModalShell title="Editar datos" description="Actualiza tu nombre y tu correo. El rol y el acceso permanecen protegidos." onClose={() => setEditOpen(false)} footer={<><ActionButton onClick={() => setEditOpen(false)}>Cancelar</ActionButton><ActionButton tone="primary" icon={Check} onClick={saveProfile}>Guardar cambios</ActionButton></>}>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Nombre completo" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} error={formErrors.fullName} />
          <Field label="Correo" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} error={formErrors.email} />
          <Field label="Rol" value={roleLabel} readOnly hint="Solo un administrador puede cambiar esto." />
          <Field label="Acceso" value={areaLabel} readOnly hint="Solo un administrador puede cambiar esto." />
        </div>
      </ModalShell> : null}

      {passwordOpen ? <ModalShell title="Cambiar contraseña" description="En producción esto se validaría en servidor." onClose={() => setPasswordOpen(false)} footer={<><ActionButton onClick={() => setPasswordOpen(false)}>Cancelar</ActionButton><ActionButton tone="primary" icon={KeyRound} onClick={savePassword}>Actualizar contraseña</ActionButton></>}>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Contraseña actual" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} error={passwordErrors.currentPassword} />
          <Field label="Nueva contraseña" type="password" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))} error={passwordErrors.nextPassword} hint="Usa al menos 8 caracteres." />
          <Field label="Confirmar nueva contraseña" type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} error={passwordErrors.confirmPassword} />
        </div>
      </ModalShell> : null}

      {logoutOpen ? <ModalShell title="Cerrar sesión" description="¿Seguro que deseas cerrar sesión?" onClose={() => setLogoutOpen(false)} footer={<><ActionButton onClick={() => setLogoutOpen(false)}>Cancelar</ActionButton><ActionButton tone="danger" icon={LogOut} onClick={handleLogout}>Cerrar sesión</ActionButton></>}>
        <p style={subtleText}>Se limpiará la sesión local actual y volverás a la pantalla de acceso.</p>
      </ModalShell> : null}

      <Toast toast={toast} />
    </>
  );
}
