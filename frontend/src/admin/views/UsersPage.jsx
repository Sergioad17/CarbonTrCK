import React from "react";
import {
  UserPlus,
  KeyRound,
  ToggleRight,
  UserMinus,
  Edit3,
  Shield,
  Building2,
  Users as UsersIcon,
  Check,
  CheckCircle2,
  Download,
  Bell,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import { AdminToggleField } from "../components/AdminFormSection";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { exportRowsToCsv } from "../../lib/csvExport";
import { fetchProfileChangeRequests, subscribeProfileChangeRequests, updateProfileChangeRequest } from "../../api/profileRequests";
import { deleteUser, fetchUsersModuleData, resetUserPassword, saveUser, updateUserStatus } from "../../api/users";
import { fetchAreas } from "../../api/areas";

const DEFAULT_CAMPUS_CODE = "CAMPUS-CT";

function mapApiUser(apiUser, campusOptions = []) {
  if (!apiUser) return null;
  const fullName = apiUser.fullName
    || [apiUser.firstName, apiUser.paternalLastName, apiUser.maternalLastName].filter(Boolean).join(" ").trim()
    || apiUser.email
    || "Usuario";
  const role = apiUser.roleKey || apiUser.role || "operativo";
  const campusCode = apiUser.campusCode || DEFAULT_CAMPUS_CODE;
  const campusName = campusOptions.find((item) => item.code === campusCode || item.id === campusCode)?.name
    || campusCode;
  const areas = apiUser.areaAccess?.mode === "custom" && Array.isArray(apiUser.areaAccess?.areaCodes)
    ? apiUser.areaAccess.areaCodes
    : [];
  return {
    id: apiUser.id,
    apiUser,
    name: fullName,
    firstName: apiUser.firstName || "",
    paternalLastName: apiUser.paternalLastName || "",
    maternalLastName: apiUser.maternalLastName || "",
    email: apiUser.email || "",
    identifier: apiUser.numericId ? String(apiUser.numericId) : "",
    role,
    campus: campusName,
    campusCode,
    areas,
    status: apiUser.isActive ? "active" : "inactive",
    createdAt: apiUser.createdAt || null,
    lastAccess: apiUser.lastLoginAt || null,
    forcePasswordChange: false,
    notes: apiUser.notes || "",
  };
}

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const fd = "var(--eco-font-display)";

const ROLE_COLORS = { admin: "#7C3AED", directivo: "#2563EB", operativo: "#059669", consulta: "#64748B" };
const ROLE_LABELS = { admin: "Admin", directivo: "Directivo", operativo: "Operativo", consulta: "Consulta" };
const ICON_GRADIENT = "linear-gradient(135deg, var(--eco-primary-500), var(--eco-primary-600))";

function splitNameParts(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    paternalLastName: parts[1] || "",
    maternalLastName: parts.slice(2).join(" "),
  };
}

function buildFullName(firstName, paternalLastName, maternalLastName) {
  return [firstName, paternalLastName, maternalLastName].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
}

function emptyUserForm(user) {
  const parts = splitNameParts(user?.name);
  return {
    id: user?.id || "",
    firstName: user?.firstName || parts.firstName,
    paternalLastName: user?.paternalLastName || parts.paternalLastName,
    maternalLastName: user?.maternalLastName || parts.maternalLastName,
    email: user?.email || "",
    identifier: user?.identifier || "",
    role: user?.role || "operativo",
    campus: user?.campusCode || user?.campus || DEFAULT_CAMPUS_CODE,
    areas: user?.areas || [],
    status: user?.status || "active",
    forcePasswordChange: typeof user?.forcePasswordChange === "boolean" ? user.forcePasswordChange : false,
    notes: user?.notes || "",
    tempPassword: "",
  };
}


const PAGE_STYLES = `
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctPop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.ct-users-admin-spin{animation:ctSpin .9s linear infinite}
@media(max-width:860px){
  .ct-users-admin-modal-grid{grid-template-columns:1fr!important}
  .ct-users-admin-modal-actions{flex-direction:column-reverse!important;align-items:stretch!important}
}
`;

const inputBase = {
  width: "100%",
  height: 42,
  borderRadius: "var(--eco-radius-md, 12px)",
  border: "1px solid var(--eco-border, #E2E8F0)",
  padding: "0 14px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text, #0F172A)",
  background: "var(--eco-input-bg, var(--eco-card, #fff))",
  transition: "border-color .18s ease, box-shadow .18s ease, background .18s ease",
};

const textAreaBase = {
  ...inputBase,
  minHeight: 96,
  height: "auto",
  padding: "10px 14px",
  resize: "vertical",
};

const subtleText = {
  margin: 0,
  fontFamily: fb,
  fontSize: 12,
  color: "var(--eco-text-soft, #64748B)",
  lineHeight: 1.55,
};

const sectionLabel = {
  margin: 0,
  fontFamily: fb,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--eco-text-soft, #64748B)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
};

const primaryHeaderBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid var(--eco-primary-500, #22C55E)",
  background: "var(--eco-primary-500, #22C55E)",
  color: "#fff",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(34,197,94,.18)",
};

const secondaryHeaderBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text, #0F172A)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || "#64748B";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 9px",
      borderRadius: 10,
      background: `${color}14`,
      fontFamily: fb,
      fontSize: 11,
      fontWeight: 600,
      color,
      whiteSpace: "nowrap",
    }}>
      <Shield size={10} /> {ROLE_LABELS[role] || role}
    </span>
  );
}

function AdminActionButton({ icon: Icon, label, onClick, accent = "default" }) {
  const styles = {
    default: {
      border: "1px solid var(--eco-border, #E2E8F0)",
      background: "var(--eco-card, #fff)",
      color: "var(--eco-text, #1E293B)",
      hover: "var(--eco-card-muted, #F8FAFC)",
    },
    info: {
      border: "1px solid rgba(37,99,235,.18)",
      background: "rgba(37,99,235,.06)",
      color: "var(--eco-info, #2563EB)",
      hover: "rgba(37,99,235,.12)",
    },
    warning: {
      border: "1px solid rgba(234,179,8,.2)",
      background: "rgba(234,179,8,.08)",
      color: "var(--eco-warning, #CA8A04)",
      hover: "rgba(234,179,8,.14)",
    },
    danger: {
      border: "1px solid rgba(239,68,68,.2)",
      background: "rgba(239,68,68,.06)",
      color: "var(--eco-danger, #DC2626)",
      hover: "rgba(239,68,68,.12)",
    },
    success: {
      border: "1px solid rgba(34,197,94,.18)",
      background: "rgba(34,197,94,.08)",
      color: "var(--eco-success, #16A34A)",
      hover: "rgba(34,197,94,.14)",
    },
  };

  const style = styles[accent] || styles.default;

  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "7px 12px",
        borderRadius: 8,
        fontFamily: fb,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all .12s",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = style.hover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = style.background;
      }}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

function FeedbackBanner({ feedback, onClose }) {
  if (!feedback) return null;

  const tones = {
    success: {
      border: "rgba(34,197,94,.2)",
      background: "rgba(34,197,94,.08)",
      color: "var(--eco-success, #16A34A)",
      icon: CheckCircle2,
    },
    info: {
      border: "rgba(37,99,235,.18)",
      background: "rgba(37,99,235,.06)",
      color: "var(--eco-info, #2563EB)",
      icon: Bell,
    },
  };

  const tone = tones[feedback.tone] || tones.info;
  const Icon = tone.icon;

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 16,
      padding: "12px 16px",
      borderRadius: 12,
      border: `1px solid ${tone.border}`,
      background: tone.background,
      color: tone.color,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "rgba(255,255,255,.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} color={tone.color} />
        </div>
        <div>
          <div style={{
            fontFamily: fb,
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--eco-text, #1E293B)",
          }}>
            {feedback.title}
          </div>
          <div style={{
            marginTop: 3,
            fontFamily: fb,
            fontSize: 12.5,
            color: "var(--eco-text-soft, #475569)",
            lineHeight: 1.5,
          }}>
            {feedback.message}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--eco-text-soft, #64748B)",
          cursor: "pointer",
          fontFamily: fb,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Cerrar
      </button>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createTemporaryPassword() {
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

function requestTypeLabel(type) {
  return type === "password" ? "Cambio de contraseña" : "Cambio de correo";
}

function StyledInput(props) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      {...props}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={{
        ...inputBase,
        ...(focused ? { borderColor: "var(--eco-primary-400, #4ADE80)", boxShadow: "0 0 0 3px rgba(34,197,94,.12)" } : null),
        ...props.style,
      }}
    />
  );
}

function StyledSelect(props) {
  const [focused, setFocused] = React.useState(false);
  return (
    <select
      {...props}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={{
        ...inputBase,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 34,
        cursor: "pointer",
        ...(focused ? { borderColor: "var(--eco-primary-400, #4ADE80)", boxShadow: "0 0 0 3px rgba(34,197,94,.12)" } : null),
        ...props.style,
      }}
    />
  );
}

function StyledTextarea(props) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...props}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={{
        ...textAreaBase,
        ...(focused ? { borderColor: "var(--eco-primary-400, #4ADE80)", boxShadow: "0 0 0 3px rgba(34,197,94,.12)" } : null),
        ...props.style,
      }}
    />
  );
}

function Field({ label, required, helper, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text, #0F172A)" }}>
        {label}
        {required ? <span style={{ color: "var(--eco-danger, #DC2626)", marginLeft: 3 }}>*</span> : null}
      </span>
      {children}
      {error ? (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger, #DC2626)" }}>{error}</span>
      ) : helper ? (
        <span style={{ ...subtleText, fontSize: 11 }}>{helper}</span>
      ) : null}
    </label>
  );
}

function ActionButton({ tone = "default", icon: Icon, children, ...props }) {
  const palette = {
    default: {
      border: "1px solid var(--eco-border, #E2E8F0)",
      background: "var(--eco-card, #fff)",
      color: "var(--eco-text, #0F172A)",
    },
    primary: {
      border: "1px solid var(--eco-primary-500, #22C55E)",
      background: "var(--eco-primary-500, #22C55E)",
      color: "#fff",
    },
    danger: {
      border: "1px solid rgba(239,68,68,.22)",
      background: "rgba(239,68,68,.08)",
      color: "var(--eco-danger, #DC2626)",
    },
  }[tone] || {};

  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 40,
        padding: "0 16px",
        borderRadius: 10,
        fontFamily: fb,
        fontSize: 13,
        fontWeight: 700,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...palette,
        ...props.style,
      }}
    >
      {Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

function IconButton({ label, onClick, icon }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "1px solid var(--eco-border, #E2E8F0)",
        background: "var(--eco-card, #fff)",
        color: "var(--eco-text-soft, #64748B)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
}

function UserFormModal({ state, roles: roleOptions, campuses: campusOptions, areaOptions, onClose, onSubmit, onGeneratePassword }) {
  if (!state) return null;
  const { user, form, errors, saving, setForm } = state;
  const isEdit = Boolean(user);

  function toggleArea(areaCode) {
    setForm((current) => ({
      ...current,
      areas: current.areas.includes(areaCode)
        ? current.areas.filter((item) => item !== areaCode)
        : [...current.areas, areaCode],
    }));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "var(--eco-overlay, rgba(15,23,42,.45))", backdropFilter: "blur(4px)", animation: "ctOverlay .18s ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(96vw, 880px)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--eco-card, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 24,
          boxShadow: "var(--eco-shadow-xl, 0 24px 64px rgba(15,23,42,.18))",
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--eco-border, #E2E8F0)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: ICON_GRADIENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {isEdit ? <Edit3 size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontFamily: fd, fontSize: 21, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>
                {isEdit ? "Editar usuario" : "Nuevo usuario"}
              </h3>
              <p style={{ ...subtleText, marginTop: 4, maxWidth: 520 }}>
                {isEdit
                  ? "Actualiza identidad, alcance y estado del usuario sin salir del panel administrativo."
                  : "Configura el nuevo usuario con el mismo flujo operativo del módulo principal de usuarios."}
              </p>
            </div>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={16} />} />
        </div>

        <form onSubmit={onSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--eco-card-muted, #F8FAFC)", borderBottom: "1px solid var(--eco-border, #E2E8F0)" }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>Identidad del usuario</p>
              <p style={{ ...subtleText, marginTop: 3 }}>Datos base para identificar la cuenta y su acceso institucional.</p>
            </div>
            <div className="ct-users-admin-modal-grid" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <Field label="Nombre" required error={errors.firstName}>
                <StyledInput value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} placeholder="Nombre" />
              </Field>
              <Field label="Apellido paterno" required error={errors.paternalLastName}>
                <StyledInput value={form.paternalLastName} onChange={(event) => setForm((current) => ({ ...current, paternalLastName: event.target.value }))} placeholder="Apellido paterno" />
              </Field>
              <Field label="Apellido materno">
                <StyledInput value={form.maternalLastName} onChange={(event) => setForm((current) => ({ ...current, maternalLastName: event.target.value }))} placeholder="Apellido materno" />
              </Field>
              <Field label="Correo electrónico" required error={errors.email}>
                <StyledInput type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="usuario@dominio.com" />
              </Field>
              <Field label="Identificador interno" helper="Puedes conservar la clave existente o registrar una nueva.">
                <StyledInput value={form.identifier} onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))} placeholder="ADM-001" />
              </Field>
              <Field label="Estado de la cuenta">
                <StyledSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </StyledSelect>
              </Field>
            </div>
          </div>

          <div style={{ border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--eco-card-muted, #F8FAFC)", borderBottom: "1px solid var(--eco-border, #E2E8F0)" }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>Permisos y asignación</p>
              <p style={{ ...subtleText, marginTop: 3 }}>Alineado al panel principal: rol, campus y áreas del usuario.</p>
            </div>
            <div className="ct-users-admin-modal-grid" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <Field label="Rol">
                <StyledSelect value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.key || role.id}>{role.label}</option>
                  ))}
                </StyledSelect>
              </Field>
              <Field label="Campus">
                <StyledSelect value={form.campus} onChange={(event) => setForm((current) => ({ ...current, campus: event.target.value, areas: [] }))}>
                  {campusOptions.map((campus) => (
                    <option key={campus.id} value={campus.code}>{campus.name}</option>
                  ))}
                </StyledSelect>
              </Field>
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <p style={{ ...sectionLabel, marginBottom: 10 }}>Áreas asignadas</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {areaOptions.filter((area) => !area.campusCode || area.campusCode === form.campus).map((area) => {
                  const selected = form.areas.includes(area.value);
                  return (
                    <button
                      key={area.value}
                      type="button"
                      onClick={() => toggleArea(area.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${selected ? "var(--eco-primary-300, #86EFAC)" : "var(--eco-border, #E2E8F0)"}`,
                        background: selected ? "var(--eco-primary-50, #F0FDF4)" : "var(--eco-card, #fff)",
                        color: selected ? "var(--eco-primary-700, #15803D)" : "var(--eco-text, #0F172A)",
                        fontFamily: fb,
                        fontSize: 12,
                        fontWeight: selected ? 700 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {area.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--eco-card-muted, #F8FAFC)", borderBottom: "1px solid var(--eco-border, #E2E8F0)" }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>Seguridad y contexto</p>
              <p style={{ ...subtleText, marginTop: 3 }}>Administra restablecimiento de clave temporal y notas internas.</p>
            </div>
            <div className="ct-users-admin-modal-grid" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <Field
                label="Contraseña inicial (opcional)"
                helper={isEdit
                  ? "Solo aplica al crear. Para cambiarla usa el botón Restablecer contraseña."
                  : "Si se deja vacío, el sistema generará una contraseña segura automáticamente y la mostrará al guardar."}
                error={errors.tempPassword}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <StyledInput
                    value={form.tempPassword}
                    onChange={(event) => setForm((current) => ({ ...current, tempPassword: event.target.value }))}
                    placeholder={isEdit ? "No editable desde aquí" : "Mínimo 8 caracteres con mayúscula y número"}
                    disabled={isEdit}
                  />
                  <ActionButton type="button" onClick={onGeneratePassword} disabled={isEdit}>Generar</ActionButton>
                </div>
              </Field>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <AdminToggleField
                  label="Forzar cambio de contraseña en el siguiente acceso"
                  checked={form.forcePasswordChange}
                  onChange={(checked) => setForm((current) => ({ ...current, forcePasswordChange: checked }))}
                  hint="Mantiene la cuenta protegida tras la entrega inicial."
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Observaciones">
                  <StyledTextarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notas administrativas, alcance de acceso o contexto de operación." />
                </Field>
              </div>
            </div>
          </div>

          <div className="ct-users-admin-modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <ActionButton type="button" onClick={onClose}>Cancelar</ActionButton>
            <ActionButton type="submit" tone="primary" icon={isEdit ? Edit3 : UserPlus} disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestsPanel({ open, requests, onClose, onApprove, onReject, resolvingId }) {
  if (!open) return null;
  const pendingCount = requests.filter((item) => item.status === "pending").length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 125, display: "grid", placeItems: "start end", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,.46)", backdropFilter: "blur(4px)", animation: "ctOverlay .18s ease-out" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(410px, calc(100vw - 16px))",
          maxHeight: "min(82vh, 720px)",
          marginTop: 72,
          background: "#111827",
          border: "1px solid #26354A",
          borderRadius: 12,
          boxShadow: "0 24px 70px rgba(2,6,23,.45)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ padding: "16px 14px 14px", borderBottom: "1px solid #26354A", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#4ADE80", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={15} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 16, lineHeight: 1.05, fontWeight: 800, color: "#F8FAFC" }}>Peticiones</p>
              <p style={{ margin: "3px 0 0", fontFamily: fb, fontSize: 12, color: "#94A3B8" }}>{pendingCount} pendientes</p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar" title="Cerrar" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #334155", background: "#162235", color: "#94A3B8", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 10, overflowY: "auto", flex: 1 }}>
          {requests.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center", border: "1px solid #26354A", borderRadius: 12, background: "#0F172A" }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "#F8FAFC" }}>Sin peticiones registradas</p>
              <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 12, color: "#9FB2CA" }}>Las solicitudes de perfil y contraseña aparecerán aquí para seguimiento administrativo.</p>
            </div>
          ) : (
            requests.map((request) => {
              const pending = request.status === "pending";
              const toneStyles = pending
                ? { color: "#FDE047", background: "rgba(234,179,8,.12)", borderColor: "rgba(253,224,71,.35)" }
                : request.status === "approved"
                  ? { color: "#86EFAC", background: "rgba(34,197,94,.12)", borderColor: "rgba(134,239,172,.28)" }
                  : { color: "#FCA5A5", background: "rgba(239,68,68,.10)", borderColor: "rgba(252,165,165,.28)" };
              const resolving = resolvingId === request.id;

              return (
                <div key={request.id} style={{ border: "1px solid #26354A", borderRadius: 12, padding: 12, marginBottom: 8, background: "#0F172A" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 800, color: "#F8FAFC" }}>{requestTypeLabel(request.type)}</p>
                      <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 11, color: "#93C5FD" }}>{request.userName}</p>
                    </div>
                    <span style={{ padding: "4px 9px", borderRadius: 999, border: "1px solid", fontFamily: fb, fontSize: 10.5, fontWeight: 800, ...toneStyles }}>
                      {pending ? "Pendiente" : request.status === "approved" ? "Aprobada" : "Rechazada"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "#E2E8F0" }}><strong style={{ color: "#F8FAFC" }}>Actual:</strong> {request.currentValue || "Sin dato"}</p>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "#E2E8F0" }}><strong style={{ color: "#F8FAFC" }}>Solicitado:</strong> {request.requestedValue || "Sin dato"}</p>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "#E2E8F0" }}><strong style={{ color: "#F8FAFC" }}>Motivo:</strong> {request.reason || "Sin motivo"}</p>
                    <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "#94A3B8" }}>Creada: {fmtDateTime(request.createdAt)}</p>
                    {request.resolvedAt ? <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "#94A3B8" }}>Resuelta: {fmtDateTime(request.resolvedAt)}</p> : null}
                    {request.resolutionDetail ? <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "#9FB2CA" }}>{request.resolutionDetail}</p> : null}
                  </div>
                  {(request.history || []).length > 0 ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                      {(request.history || []).map((entry) => (
                        <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 800, color: "#F8FAFC" }}>{entry.actorName}</p>
                            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "#9FB2CA" }}>{entry.detail}</p>
                            <p style={{ margin: "5px 0 0", fontFamily: fb, fontSize: 11, color: "#93C5FD" }}>{fmtDateTime(entry.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {pending ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => onApprove(request)}
                        disabled={resolving}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 8,
                          border: "1px solid #4ADE80",
                          background: "#4ADE80",
                          color: "#fff",
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: resolving ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          opacity: resolving ? 0.72 : 1,
                        }}
                      >
                        <Check size={14} /> Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(request)}
                        disabled={resolving}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(248,113,113,.4)",
                          background: "rgba(127,29,29,.45)",
                          color: "#F87171",
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: resolving ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          opacity: resolving ? 0.72 : 1,
                        }}
                      >
                        <X size={14} /> Rechazar
                      </button>
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

function ResetPasswordModal({ user, tempPassword, loading = false, onCancel, onConfirm }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setCopied(false);
  }, [tempPassword, user?.id]);

  if (!user) return null;

  async function handleCopy() {
    if (!tempPassword || !navigator?.clipboard?.writeText) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "var(--eco-overlay, rgba(15,23,42,.45))", backdropFilter: "blur(4px)", animation: "ctOverlay .18s ease-out" }} onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(92vw, 500px)",
          background: "var(--eco-card, #fff)",
          borderRadius: 22,
          boxShadow: "var(--eco-shadow-xl, 0 24px 64px rgba(15,23,42,.18))",
          border: "1px solid var(--eco-border, #E2E8F0)",
          padding: 24,
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: tempPassword ? "rgba(34,197,94,.12)" : "rgba(234,179,8,.12)", color: tempPassword ? "var(--eco-success, #16A34A)" : "var(--eco-warning, #CA8A04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {tempPassword ? <CheckCircle2 size={20} /> : <KeyRound size={20} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>
              {tempPassword ? "Contraseña generada" : "Restablecer contraseña"}
            </h3>
            <p style={{ ...subtleText, marginTop: 4 }}>
              {tempPassword
                ? "Copia la contraseña temporal ahora - solo se mostrará una vez. La contraseña anterior fue invalidada y las sesiones activas del usuario fueron cerradas."
                : `Se generará una nueva contraseña temporal para ${user.name}. La actual quedará invalidada de inmediato.`}
            </p>
          </div>
        </div>

        {tempPassword ? (
          <div style={{ background: "var(--eco-card-muted, #F8FAFC)", color: "var(--eco-text-strong, #0F172A)", border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #64748B)", textTransform: "uppercase", letterSpacing: ".05em" }}>Contraseña temporal</p>
              <p style={{ margin: "6px 0 0", fontFamily: fm, fontSize: 20, fontWeight: 700, letterSpacing: ".04em", color: "var(--eco-text-strong, #0F172A)", overflowWrap: "anywhere", lineHeight: 1.35 }}>{tempPassword}</p>
            </div>
            <ActionButton type="button" onClick={handleCopy}>{copied ? "Copiada" : "Copiar"}</ActionButton>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <ActionButton type="button" onClick={onCancel} disabled={loading}>{tempPassword ? "Cerrar" : "Cancelar"}</ActionButton>
          {!tempPassword ? (
            <ActionButton type="button" tone="primary" icon={loading ? Loader2 : KeyRound} onClick={onConfirm} disabled={loading}>
              {loading ? "Generando..." : "Generar contraseña"}
            </ActionButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [usersList, setUsersList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [drawerUser, setDrawerUser] = React.useState(null);
  const [formState, setFormState] = React.useState(null);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [passwordResetState, setPasswordResetState] = React.useState({ user: null, password: "", loading: false });
  const [requests, setRequests] = React.useState(() => fetchProfileChangeRequests());
  const [requestsOpen, setRequestsOpen] = React.useState(false);
  const [resolvingRequestId, setResolvingRequestId] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);
  const [roleOptions, setRoleOptions] = React.useState([]);
  const [campusOptions, setCampusOptions] = React.useState([]);
  const [areaOptions, setAreaOptions] = React.useState([]);

  const reloadUsers = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [{ users, roles: fetchedRoles }, fetchedAreas] = await Promise.all([
        fetchUsersModuleData(),
        fetchAreas(),
      ]);
      const nextCampusOptions = Array.from(
        new Map(
          [
            ...users.map((user) => [user.campusCode || DEFAULT_CAMPUS_CODE, {
              id: user.campusCode || DEFAULT_CAMPUS_CODE,
              code: user.campusCode || DEFAULT_CAMPUS_CODE,
              name: user.campusCode || DEFAULT_CAMPUS_CODE,
            }]),
            ...fetchedAreas.map((area) => [area.campusCode || DEFAULT_CAMPUS_CODE, {
              id: area.campusCode || DEFAULT_CAMPUS_CODE,
              code: area.campusCode || DEFAULT_CAMPUS_CODE,
              name: area.campusCode || DEFAULT_CAMPUS_CODE,
            }]),
          ].filter(([code]) => code)
        ).values()
      );
      const nextAreaOptions = fetchedAreas
        .filter((area) => area.isActive !== false)
        .map((area) => ({ value: area.code, label: area.name || area.code, campusCode: area.campusCode || DEFAULT_CAMPUS_CODE }));

      setRoleOptions(fetchedRoles.filter((role) => role.enabled !== false));
      setCampusOptions(nextCampusOptions.length ? nextCampusOptions : [{ id: DEFAULT_CAMPUS_CODE, code: DEFAULT_CAMPUS_CODE, name: DEFAULT_CAMPUS_CODE }]);
      setAreaOptions(nextAreaOptions);
      setUsersList(users.map((user) => mapApiUser(user, nextCampusOptions)).filter(Boolean));
    } catch (error) {
      setLoadError(error?.payload?.message || error?.message || "No se pudo cargar la lista de usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reloadUsers();
  }, [reloadUsers]);

  const visibleAreaOptions = React.useMemo(() => {
    const labelsByCode = new Map(areaOptions.map((area) => [area.value, area.label]));
    usersList.flatMap((user) => user.areas || []).forEach((code) => {
      if (!labelsByCode.has(code)) labelsByCode.set(code, code);
    });
    return Array.from(labelsByCode, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [areaOptions, usersList]);

  const roleLabels = React.useMemo(() => {
    return Object.fromEntries(roleOptions.map((role) => [role.key || role.id, role.label]));
  }, [roleOptions]);

  const areaLabels = React.useMemo(() => {
    return Object.fromEntries(visibleAreaOptions.map((area) => [area.value, area.label]));
  }, [visibleAreaOptions]);

  const filtered = React.useMemo(() => {
    let list = [...usersList];

    if (search) {
      const query = search.toLowerCase();
      list = list.filter((user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.identifier.toLowerCase().includes(query)
      );
    }

    if (filters.role && filters.role !== "all") {
      list = list.filter((user) => user.role === filters.role);
    }
    if (filters.status && filters.status !== "all") {
      list = list.filter((user) => user.status === filters.status);
    }
    if (filters.campus && filters.campus !== "all") {
      list = list.filter((user) => user.campusCode === filters.campus);
    }
    if (filters.area && filters.area !== "all") {
      list = list.filter((user) => (user.areas || []).includes(filters.area));
    }

    return list;
  }, [filters, search, usersList]);

  React.useEffect(() => subscribeProfileChangeRequests(setRequests), []);

  function syncSelectedUser(userId, updater) {
    setDrawerUser((current) => (current?.id === userId ? updater(current) : current));
    setPasswordResetState((current) => (current?.user?.id === userId ? { ...current, user: updater(current.user) } : current));
  }

  function openCreateModal() {
    setFormState({
      user: null,
      form: emptyUserForm(),
      errors: {},
      saving: false,
      setForm: (updater) => {
        setFormState((prev) => {
          if (!prev) return prev;
          const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
          return { ...prev, form: nextForm };
        });
      },
    });
  }

  function openEditModal(user) {
    setDrawerUser(null);
    setFormState({
      user,
      form: emptyUserForm(user),
      errors: {},
      saving: false,
      setForm: (updater) => {
        setFormState((prev) => {
          if (!prev) return prev;
          const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
          return { ...prev, form: nextForm };
        });
      },
    });
  }

  function validateForm(form, editingUserId) {
    const errors = {};
    const firstName = String(form.firstName || "").trim();
    const paternalLastName = String(form.paternalLastName || "").trim();
    const email = String(form.email || "").trim().toLowerCase();
    if (!firstName) errors.firstName = "Escribe el nombre.";
    if (!paternalLastName) errors.paternalLastName = "Escribe el apellido paterno.";
    if (!email) errors.email = "Escribe un correo electrónico.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) errors.email = "Escribe un correo electrónico válido.";
    else {
      const duplicate = usersList.find((user) => user.id !== editingUserId && user.email.toLowerCase() === email);
      if (duplicate) errors.email = "Este correo ya está registrado.";
    }
    return errors;
  }

  async function handleSaveUser(event) {
    event.preventDefault();
    if (!formState) return;
    const { user, form } = formState;
    const errors = validateForm(form, user?.id);
    if (Object.keys(errors).length > 0) {
      setFormState((prev) => (prev ? { ...prev, errors } : prev));
      return;
    }

    setFormState((prev) => (prev ? { ...prev, saving: true, errors: {} } : prev));
    const fullName = buildFullName(form.firstName, form.paternalLastName, form.maternalLastName);
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedIdentifier = form.identifier.trim();
    const numericIdPayload = /^\d+$/.test(trimmedIdentifier) ? trimmedIdentifier : null;
    const isActive = form.status === "active";

    const payload = {
      id: user?.id,
      firstName: form.firstName.trim(),
      paternalLastName: form.paternalLastName.trim(),
      maternalLastName: form.maternalLastName.trim(),
      fullName,
      email: trimmedEmail,
      role: form.role,
      campusCode: form.campus || user?.apiUser?.campusCode || DEFAULT_CAMPUS_CODE,
      areaAccess: form.areas.length > 0
        ? { mode: "custom", areaCodes: form.areas }
        : { mode: "all", areaCodes: [] },
      isActive,
      notes: form.notes.trim(),
      numericId: numericIdPayload,
    };

    if (form.tempPassword) {
      payload.password = form.tempPassword;
      payload.temporaryPassword = form.tempPassword;
    }

    try {
      const result = await saveUser(payload);
      const mappedUsers = (result.users || []).map((item) => mapApiUser(item, campusOptions)).filter(Boolean);
      setUsersList(mappedUsers);
      const updated = mappedUsers.find((item) => item.id === (result.user?.id || user?.id)) || null;
      if (updated) syncSelectedUser(updated.id, () => updated);
      setFormState(null);
      const issuedPassword = !user
        ? (form.tempPassword.trim() || result.temporaryPassword || "")
        : "";
      setFeedback({
        tone: "success",
        title: user ? "Usuario actualizado" : "Usuario creado",
        message: user
          ? `Se actualizaron los datos de ${fullName}.`
          : `La cuenta de ${fullName} se creó correctamente y ya puede iniciar sesión con el correo ${trimmedEmail}.`,
      });
      if (!user && updated && issuedPassword) {
        setPasswordResetState({ user: updated, password: issuedPassword, loading: false });
      }
    } catch (error) {
      const code = error?.payload?.code || "";
      const message = error?.payload?.message || error?.message || "";
      const nextErrors = {};
      if (code === "INVALID_PASSWORD") {
        nextErrors.tempPassword = "La contraseña no cumple la política de seguridad vigente.";
      } else if (/email/i.test(message) || /correo/i.test(message)) {
        nextErrors.email = message || "Este correo ya está registrado.";
      }
      setFormState((prev) => (prev ? { ...prev, saving: false, errors: nextErrors } : prev));
      setFeedback({
        tone: "info",
        title: user ? "No se pudo actualizar" : "No se pudo crear el usuario",
        message: message || "Revisa los datos e intenta de nuevo.",
      });
    }
  }

  async function handleToggleStatus(user) {
    const nextActive = user.status !== "active";
    try {
      const apiUsers = await updateUserStatus({ id: user.id }, nextActive);
      const mappedUsers = (apiUsers || []).map((item) => mapApiUser(item, campusOptions)).filter(Boolean);
      setUsersList(mappedUsers);
      const updated = mappedUsers.find((item) => item.id === user.id);
      if (updated) syncSelectedUser(user.id, () => updated);
      setFeedback({
        tone: "info",
        title: nextActive ? "Usuario reactivado" : "Usuario dado de baja",
        message: nextActive
          ? `${user.name} ya puede volver a iniciar sesión.`
          : `${user.name} quedó sin acceso al sistema. Sus sesiones activas fueron revocadas.`,
      });
    } catch (error) {
      const message = error?.payload?.message || error?.message || "Intenta de nuevo en unos segundos.";
      setFeedback({
        tone: "info",
        title: "No se pudo actualizar el estado",
        message,
      });
    } finally {
      setConfirmAction(null);
    }
  }

  async function handleDeleteUser(user) {
    if (!user?.id) return;
    try {
      const apiUsers = await deleteUser(user.id);
      const mappedUsers = (apiUsers || []).map((item) => mapApiUser(item, campusOptions)).filter(Boolean);
      setUsersList(mappedUsers);
      setDrawerUser(null);
      setPasswordResetState((current) => (current.user?.id === user.id ? { user: null, password: "", loading: false } : current));
      setFeedback({
        tone: "success",
        title: "Usuario eliminado",
        message: `La cuenta de ${user.name} fue eliminada correctamente porque no tenía datos operativos asociados.`,
      });
    } catch (error) {
      const code = error?.payload?.code || error?.code || "";
      const fallback = error?.payload?.message || error?.message || "No se pudo eliminar el usuario.";
      const messages = {
        USER_HAS_ACTIVITY: "Este usuario tiene datos operativos asociados. Para proteger el historial del sistema, no se puede eliminar; puedes darlo de baja.",
        SELF_DELETE_FORBIDDEN: "No puedes eliminar tu propia cuenta desde esta pantalla.",
        LAST_ADMIN_CONFLICT: "No se puede eliminar el último administrador activo del sistema.",
      };
      setFeedback({
        tone: "info",
        title: "No se pudo eliminar el usuario",
        message: messages[code] || fallback,
      });
    } finally {
      setConfirmAction(null);
    }
  }

  function openPasswordReset(user) {
    setPasswordResetState({ user, password: "", loading: false });
  }

  async function handleResetPassword() {
    if (!passwordResetState.user) return;
    setPasswordResetState((prev) => ({ ...prev, loading: true }));
    try {
      const result = await resetUserPassword(passwordResetState.user.id);
      if (!result.ok || !result.password) {
        throw new Error("password_reset_failed");
      }
      setPasswordResetState({ user: passwordResetState.user, password: result.password, loading: false });
      setFeedback({
        tone: "success",
        title: "Contraseña temporal generada",
        message: `Se asignó una nueva contraseña a ${passwordResetState.user.name}. Compártesela por un canal seguro.`,
      });
      reloadUsers();
    } catch (error) {
      setPasswordResetState((prev) => ({ ...prev, loading: false }));
      const code = error?.payload?.code || error?.code || "";
      const messages = {
        USER_INACTIVE: "Activa el usuario antes de generar una nueva contraseña.",
      };
      setFeedback({
        tone: "info",
        title: "No se pudo restablecer la contraseña",
        message: messages[code] || error?.payload?.message || error?.message || "Intenta de nuevo en unos segundos.",
      });
    }
  }

  async function handleApproveRequest(request) {
    if (!request?.id) return;
    const resolutionDetail = request.type === "email"
      ? `Se aprobó sustituir ${request.currentValue || "el dato actual"} por ${request.requestedValue || "el dato solicitado"}.`
      : "Se autorizó sustituir la contraseña anterior por una nueva credencial protegida.";
    setResolvingRequestId(request.id);
    try {
      await updateProfileChangeRequest(request.id, (current) => ({
        ...current,
        status: "approved",
        resolutionDetail,
      }));
      setFeedback({
        tone: "success",
        title: "Petición aprobada",
        message: `${request.userName || "Usuario"}: ${requestTypeLabel(request.type)} aprobada.`,
      });
    } catch (error) {
      setFeedback({
        tone: "info",
        title: "No se pudo aprobar la petición",
        message: error?.payload?.message || error?.message || "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setResolvingRequestId(null);
    }
  }

  async function handleRejectRequest(request) {
    if (!request?.id) return;
    const resolutionDetail = request.type === "email"
      ? `Se rechazó sustituir ${request.currentValue || "el dato actual"} por ${request.requestedValue || "el dato solicitado"}.`
      : "Se rechazó el cambio de contraseña solicitado.";
    setResolvingRequestId(request.id);
    try {
      await updateProfileChangeRequest(request.id, (current) => ({
        ...current,
        status: "rejected",
        resolutionDetail,
      }));
      setFeedback({
        tone: "info",
        title: "Petición rechazada",
        message: `${request.userName || "Usuario"}: ${requestTypeLabel(request.type)} rechazada.`,
      });
    } catch (error) {
      setFeedback({
        tone: "info",
        title: "No se pudo rechazar la petición",
        message: error?.payload?.message || error?.message || "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setResolvingRequestId(null);
    }
  }

  function handleExportCsv() {
    exportRowsToCsv({
      filename: `carbontrack-admin-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: filtered,
      columns: [
        { label: "Nombre", get: (user) => user.name },
        { label: "Correo", get: (user) => user.email },
        { label: "Identificador", get: (user) => user.identifier },
        { label: "Rol", get: (user) => roleLabels[user.role] || ROLE_LABELS[user.role] || user.role },
        { label: "Campus", get: (user) => user.campus },
        { label: "Estado", get: (user) => (user.status === "active" ? "Activo" : "Inactivo") },
      ],
    });
    setFeedback({
      tone: "success",
      title: "CSV exportado",
      message: "Se exportó el listado filtrado actual.",
    });
  }

  const activeCount = usersList.filter((user) => user.status === "active").length;
  const inactiveCount = usersList.filter((user) => user.status === "inactive").length;

  const columns = [
    {
      key: "name",
      label: "Usuario",
      width: "28%",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
            fontSize: 11.5,
            color: "var(--eco-text-soft, #94A3B8)",
            fontFamily: fm,
            flexWrap: "wrap",
          }}>
            <span>{row.email}</span>
            <span>{row.identifier}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      width: "12%",
      render: (value) => <RoleBadge role={value} />,
    },
    {
      key: "areas",
      label: "Área",
      width: "16%",
      render: (value = []) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>
            {areaLabels[value[0]] || value[0] || "Sin área"}
          </span>
          {value.length > 1 && (
            <span style={{ fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
              +{value.length - 1} asignada{value.length > 2 ? "s" : ""}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "campus",
      label: "Campus",
      width: "14%",
      render: (value) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Building2 size={12} color="var(--eco-text-soft, #94A3B8)" />
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      width: "10%",
      render: (value) => (
        <AdminStatusBadge
          variant={value === "active" ? "success" : "neutral"}
          label={value === "active" ? "Activo" : "Inactivo"}
        />
      ),
    },
    {
      key: "lastAccess",
      label: "Último acceso",
      width: "14%",
      nowrap: true,
      render: (value) => (
        <span style={{ fontSize: 12, color: "var(--eco-text-soft, #64748B)" }}>
          {fmtDateTime(value)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "18%",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <AdminActionButton
            icon={Edit3}
            label="Editar"
            onClick={(event) => {
              event.stopPropagation();
              openEditModal(row);
            }}
          />
          <AdminActionButton
            icon={KeyRound}
            label="Clave"
            accent="warning"
            onClick={(event) => {
              event.stopPropagation();
              openPasswordReset(row);
            }}
          />
          <AdminActionButton
            icon={Trash2}
            label="Eliminar"
            accent="danger"
            onClick={(event) => {
              event.stopPropagation();
              setConfirmAction({ type: "delete", user: row });
            }}
          />
        </div>
      ),
    },
  ];

  const pendingRequests = requests.filter((item) => item.status === "pending");

  if (loading && usersList.length === 0) {
    return <AdminLoadingScreen />;
  }

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <AdminPageHeader
        title="Usuarios y permisos"
        subtitle={`${activeCount} activos · ${inactiveCount} inactivos · ${usersList.length} total`}
        icon={UsersIcon}
        breadcrumb={["Operación", "Usuarios"]}
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={openCreateModal} style={primaryHeaderBtn}>
              <UserPlus size={14} /> Nuevo usuario
            </button>
            <button onClick={handleExportCsv} style={secondaryHeaderBtn}>
              <Download size={14} /> Exportar CSV
            </button>
            <button onClick={() => setRequestsOpen(true)} style={secondaryHeaderBtn}>
              <Bell size={14} /> Ver peticiones ({pendingRequests.length})
            </button>
          </div>
        )}
      />

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <div style={{ marginBottom: 16 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre, correo o ID..."
          filters={[
            { key: "role", label: "Rol", options: roleOptions.map((role) => ({ value: role.key || role.id, label: role.label })) },
            { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
            { key: "campus", label: "Campus", options: campusOptions.map((campus) => ({ value: campus.code, label: campus.name })) },
            { key: "area", label: "Área", options: visibleAreaOptions.map((area) => ({ value: area.value, label: area.label })) },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onClear={() => {
            setSearch("");
            setFilters({});
          }}
        />
      </div>

      <div style={{
        fontFamily: fb,
        fontSize: 12,
        color: "var(--eco-text-soft, #64748B)",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        {loading ? (
          <>
            <Loader2 size={12} className="ct-users-admin-spin" /> Cargando usuarios...
          </>
        ) : filtered.length === usersList.length ? (
          `${usersList.length} usuarios`
        ) : (
          `${filtered.length} de ${usersList.length} usuarios`
        )}
      </div>

      {loadError ? (
        <div style={{
          padding: "12px 16px",
          marginBottom: 12,
          borderRadius: 12,
          border: "1px solid rgba(239,68,68,.22)",
          background: "rgba(239,68,68,.08)",
          color: "var(--eco-danger, #DC2626)",
          fontFamily: fb,
          fontSize: 12.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <span>{loadError}</span>
          <button
            onClick={reloadUsers}
            style={{
              border: "1px solid rgba(239,68,68,.3)",
              background: "var(--eco-card, #fff)",
              color: "var(--eco-danger, #DC2626)",
              borderRadius: 8,
              padding: "6px 12px",
              fontFamily: fb,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setDrawerUser}
        maxHeight={520}
        emptyMessage={loading ? "Cargando usuarios..." : "No se encontraron usuarios con estos filtros."}
      />

      <AdminEntityDrawer
        open={!!drawerUser}
        onClose={() => setDrawerUser(null)}
        title={drawerUser?.name}
        subtitle={drawerUser?.email}
        badge={drawerUser && <RoleBadge role={drawerUser.role} />}
        width={470}
        actions={drawerUser && (
          <>
            <AdminActionButton icon={Edit3} label="Editar" onClick={() => openEditModal(drawerUser)} />
            <AdminActionButton icon={KeyRound} label="Restablecer clave" accent="warning" onClick={() => openPasswordReset(drawerUser)} />
            <AdminActionButton
              icon={Trash2}
              label="Eliminar"
              accent="danger"
              onClick={() => setConfirmAction({ type: "delete", user: drawerUser })}
            />
            <AdminActionButton
              icon={drawerUser.status === "active" ? UserMinus : ToggleRight}
              label={drawerUser.status === "active" ? "Dar de baja" : "Reactivar"}
              accent={drawerUser.status === "active" ? "danger" : "success"}
              onClick={() => setConfirmAction({ type: "toggle", user: drawerUser })}
            />
          </>
        )}
      >
        {drawerUser && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Identificador">{drawerUser.identifier}</DrawerField>
              <DrawerField label="Estado">
                <AdminStatusBadge
                  variant={drawerUser.status === "active" ? "success" : "neutral"}
                  label={drawerUser.status === "active" ? "Activo" : "Inactivo"}
                />
              </DrawerField>
              <DrawerField label="Campus">{drawerUser.campus}</DrawerField>
              <DrawerField label="Fecha de alta">{fmtDate(drawerUser.createdAt)}</DrawerField>
              <DrawerField label="Último acceso">{fmtDateTime(drawerUser.lastAccess)}</DrawerField>
              <DrawerField label="Cambio obligatorio">
                {drawerUser.forcePasswordChange
                  ? <span style={{ color: "var(--eco-warning, #CA8A04)", fontWeight: 600 }}>Sí</span>
                  : "No"}
              </DrawerField>
            </div>

            <div style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px solid var(--eco-border, #E2E8F0)",
            }}>
              <div style={{
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--eco-text-soft, #94A3B8)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
                marginBottom: 8,
              }}>
                Acciones administrativas
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <AdminActionButton icon={KeyRound} label="Restablecer contraseña" accent="warning" onClick={() => openPasswordReset(drawerUser)} />
                <AdminActionButton icon={Trash2} label="Eliminar usuario" accent="danger" onClick={() => setConfirmAction({ type: "delete", user: drawerUser })} />
              </div>
            </div>

            <div>
              <span style={{
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--eco-text-soft, #94A3B8)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}>
                Áreas asignadas
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                {drawerUser.areas.length > 0 ? drawerUser.areas.map((area) => (
                  <span
                    key={area}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 8,
                      background: "var(--eco-card-muted, #F1F5F9)",
                      fontFamily: fb,
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: "var(--eco-text, #1E293B)",
                    }}
                  >
                    {areaLabels[area] || area}
                  </span>
                )) : <span style={{ opacity: 0.4, fontSize: 12 }}>Sin áreas asignadas</span>}
              </div>
            </div>

            {drawerUser.notes && (
              <DrawerField label="Observaciones">{drawerUser.notes}</DrawerField>
            )}
          </>
        )}
      </AdminEntityDrawer>

      <UserFormModal
        state={formState}
        roles={roleOptions}
        campuses={campusOptions}
        areaOptions={areaOptions}
        onClose={() => setFormState(null)}
        onSubmit={handleSaveUser}
        onGeneratePassword={() => {
          setFormState((prev) => (prev ? { ...prev, form: { ...prev.form, tempPassword: createTemporaryPassword() } } : prev));
        }}
      />

      <RequestsPanel
        open={requestsOpen}
        requests={requests}
        onClose={() => setRequestsOpen(false)}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        resolvingId={resolvingRequestId}
      />

      <ResetPasswordModal
        user={passwordResetState.user}
        tempPassword={passwordResetState.password}
        loading={passwordResetState.loading}
        onCancel={() => setPasswordResetState({ user: null, password: "", loading: false })}
        onConfirm={handleResetPassword}
      />

      <AdminConfirmDialog
        open={confirmAction?.type === "toggle"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleToggleStatus(confirmAction.user)}
        title={confirmAction?.user?.status === "active" ? "Dar de baja al usuario" : "Reactivar usuario"}
        message={confirmAction?.user?.status === "active"
          ? `¿Dar de baja la cuenta de ${confirmAction?.user?.name}? Conservaremos su historial de auditoría, pero no podrá iniciar sesión y sus sesiones activas serán revocadas. Podrás reactivarla más adelante.`
          : `¿Reactivar la cuenta de ${confirmAction?.user?.name}? Recuperará el acceso al sistema con sus permisos previos.`
        }
        confirmLabel={confirmAction?.user?.status === "active" ? "Dar de baja" : "Reactivar"}
        danger={confirmAction?.user?.status === "active"}
      />

      <AdminConfirmDialog
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleDeleteUser(confirmAction.user)}
        title="Eliminar usuario"
        message={`¿Eliminar definitivamente la cuenta de ${confirmAction?.user?.name}? Solo se borrará si el backend confirma que no tiene datos operativos asociados. Si existen registros, equipos, metas o acciones relacionadas, el sistema bloqueará la eliminación para evitar datos huérfanos.`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  );
}
