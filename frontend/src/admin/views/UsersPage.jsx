import React from "react";
import {
  UserPlus,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit3,
  Shield,
  Building2,
  Users as UsersIcon,
  CheckCircle2,
  Download,
  Bell,
  X,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import { AdminToggleField } from "../components/AdminFormSection";
import { users as mockUsers, roles, campuses } from "../mocks/adminMocks";
import { exportRowsToCsv } from "../../lib/csvExport";
import { fetchProfileChangeRequests, subscribeProfileChangeRequests } from "../../api/profileRequests";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const fd = "var(--eco-font-display)";

const ROLE_COLORS = { admin: "#7C3AED", directivo: "#2563EB", operativo: "#059669", consulta: "#64748B" };
const ROLE_LABELS = { admin: "Admin", directivo: "Directivo", operativo: "Operativo", consulta: "Consulta" };
const ICON_GRADIENT = "linear-gradient(135deg, var(--eco-primary-500), var(--eco-primary-600))";

const EMPTY_USER = {
  name: "",
  email: "",
  identifier: "",
  role: "operativo",
  campus: "Campus Central",
  areas: [],
  status: "active",
  forcePasswordChange: false,
  notes: "",
};

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
    firstName: parts.firstName,
    paternalLastName: parts.paternalLastName,
    maternalLastName: parts.maternalLastName,
    email: user?.email || "",
    identifier: user?.identifier || "",
    role: user?.role || "operativo",
    campus: user?.campus || "Campus Central",
    areas: user?.areas || [],
    status: user?.status || "active",
    forcePasswordChange: typeof user?.forcePasswordChange === "boolean" ? user.forcePasswordChange : false,
    notes: user?.notes || "",
    tempPassword: "",
  };
}

const ALL_AREAS = [
  "Direccion General",
  "TI",
  "Sustentabilidad",
  "Mantenimiento",
  "Rectoria",
  "Laboratorios",
  "Instalaciones",
  "Direccion Academica",
  "Administracion",
  "Investigacion",
  "Direccion Administrativa",
];

const PAGE_STYLES = `
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctPop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
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
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createTemporaryPassword() {
  const block = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CT-${block}-${new Date().getMinutes().toString().padStart(2, "0")}`;
}

function requestTypeLabel(type) {
  return type === "password" ? "Cambio de contrasena" : "Cambio de correo";
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

  function toggleArea(area) {
    setForm((current) => ({
      ...current,
      areas: current.areas.includes(area)
        ? current.areas.filter((item) => item !== area)
        : [...current.areas, area],
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
                  : "Configura el nuevo usuario con el mismo flujo operativo del modulo principal de usuarios."}
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
              <Field label="Correo electronico" required error={errors.email}>
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
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>Permisos y asignacion</p>
              <p style={{ ...subtleText, marginTop: 3 }}>Alineado al panel principal: rol, campus y areas del usuario.</p>
            </div>
            <div className="ct-users-admin-modal-grid" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <Field label="Rol">
                <StyledSelect value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </StyledSelect>
              </Field>
              <Field label="Campus">
                <StyledSelect value={form.campus} onChange={(event) => setForm((current) => ({ ...current, campus: event.target.value }))}>
                  {campusOptions.map((campus) => (
                    <option key={campus.id} value={campus.name}>{campus.name}</option>
                  ))}
                </StyledSelect>
              </Field>
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <p style={{ ...sectionLabel, marginBottom: 10 }}>Areas asignadas</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {areaOptions.map((area) => {
                  const selected = form.areas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
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
                      {area}
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
              <Field label="Contrasena temporal" helper="Solo para flujo frontend. En backend real se enviaria por un canal seguro.">
                <div style={{ display: "flex", gap: 8 }}>
                  <StyledInput value={form.tempPassword} readOnly placeholder="Genera una clave temporal" />
                  <ActionButton type="button" onClick={onGeneratePassword}>Generar</ActionButton>
                </div>
              </Field>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <AdminToggleField
                  label="Forzar cambio de contrasena en el siguiente acceso"
                  checked={form.forcePasswordChange}
                  onChange={(checked) => setForm((current) => ({ ...current, forcePasswordChange: checked }))}
                  hint="Mantiene la cuenta protegida tras la entrega inicial."
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Observaciones">
                  <StyledTextarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notas administrativas, alcance de acceso o contexto de operacion." />
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

function RequestsPanel({ open, requests, onClose }) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 125, display: "grid", placeItems: "start end", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "var(--eco-overlay, rgba(15,23,42,.45))", backdropFilter: "blur(4px)", animation: "ctOverlay .18s ease-out" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(460px, calc(100vw - 32px))",
          maxHeight: "min(78vh, 720px)",
          marginTop: 72,
          background: "var(--eco-card, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 22,
          boxShadow: "var(--eco-shadow-xl, 0 24px 64px rgba(15,23,42,.18))",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--eco-border, #E2E8F0)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: ICON_GRADIENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={15} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>Peticiones</p>
              <p style={{ ...subtleText, marginTop: 2 }}>{requests.filter((item) => item.status === "pending").length} pendientes</p>
            </div>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={16} />} />
        </div>
        <div style={{ padding: 8, overflowY: "auto", flex: 1 }}>
          {requests.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>Sin peticiones registradas</p>
              <p style={{ ...subtleText, marginTop: 6 }}>Las solicitudes de perfil y contrasena apareceran aqui para seguimiento administrativo.</p>
            </div>
          ) : (
            requests.map((request) => {
              const pending = request.status === "pending";
              const toneStyles = pending
                ? { color: "var(--eco-warning, #CA8A04)", background: "rgba(234,179,8,.12)" }
                : request.status === "approved"
                  ? { color: "var(--eco-success, #16A34A)", background: "rgba(34,197,94,.12)" }
                  : { color: "var(--eco-danger, #DC2626)", background: "rgba(239,68,68,.10)" };

              return (
                <div key={request.id} style={{ border: "1px solid var(--eco-border, #E2E8F0)", borderRadius: 16, padding: 14, marginBottom: 8, background: "var(--eco-card-muted, #F8FAFC)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 800, color: "var(--eco-text-strong, #0F172A)" }}>{requestTypeLabel(request.type)}</p>
                      <p style={{ ...subtleText, marginTop: 4 }}>{request.userName}</p>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, fontFamily: fb, fontSize: 11, fontWeight: 700, ...toneStyles }}>
                      {pending ? "Pendiente" : request.status === "approved" ? "Aprobada" : "Rechazada"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text, #0F172A)" }}><strong>Actual:</strong> {request.currentValue || "Sin dato"}</p>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text, #0F172A)" }}><strong>Solicitado:</strong> {request.requestedValue || "Sin dato"}</p>
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text, #0F172A)" }}><strong>Motivo:</strong> {request.reason || "Sin motivo"}</p>
                    <p style={{ ...subtleText, fontSize: 11 }}>Creada: {fmtDateTime(request.createdAt)}</p>
                    {request.resolvedAt ? <p style={{ ...subtleText, fontSize: 11 }}>Resuelta: {fmtDateTime(request.resolvedAt)}</p> : null}
                    {request.resolutionDetail ? <p style={{ ...subtleText, fontSize: 11 }}>{request.resolutionDetail}</p> : null}
                  </div>
                  {(request.history || []).length > 0 ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                      {(request.history || []).map((entry) => (
                        <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--eco-primary-500, #22C55E)", marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-text, #0F172A)" }}>{entry.actorName}</p>
                            <p style={{ ...subtleText, marginTop: 2 }}>{entry.detail}</p>
                            <p style={{ ...subtleText, marginTop: 2, fontSize: 11 }}>{fmtDateTime(entry.createdAt)}</p>
                          </div>
                        </div>
                      ))}
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

function ResetPasswordModal({ user, tempPassword, onCancel, onConfirm }) {
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
              {tempPassword ? "Contrasena generada" : "Restablecer contrasena"}
            </h3>
            <p style={{ ...subtleText, marginTop: 4 }}>
              {tempPassword
                ? "Copia la contrasena temporal ahora. Este flujo es local y no modifica backend."
                : `Se generara una contrasena temporal para ${user.name}.`}
            </p>
          </div>
        </div>

        {tempPassword ? (
          <div style={{ background: "#0F172A", color: "#fff", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "rgba(255,255,255,.56)", textTransform: "uppercase", letterSpacing: ".05em" }}>Contrasena temporal</p>
              <p style={{ margin: "6px 0 0", fontFamily: fm, fontSize: 20, fontWeight: 700, letterSpacing: ".04em" }}>{tempPassword}</p>
            </div>
            <ActionButton type="button" onClick={handleCopy}>{copied ? "Copiada" : "Copiar"}</ActionButton>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <ActionButton type="button" onClick={onCancel}>{tempPassword ? "Cerrar" : "Cancelar"}</ActionButton>
          {!tempPassword ? (
            <ActionButton type="button" tone="primary" icon={KeyRound} onClick={onConfirm}>
              Generar contrasena
            </ActionButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [usersList, setUsersList] = React.useState(mockUsers);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [drawerUser, setDrawerUser] = React.useState(null);
  const [formState, setFormState] = React.useState(null);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [passwordResetState, setPasswordResetState] = React.useState({ user: null, password: "" });
  const [requests, setRequests] = React.useState(() => fetchProfileChangeRequests());
  const [requestsOpen, setRequestsOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);

  const areaOptions = React.useMemo(() => {
    return Array.from(new Set([
      ...ALL_AREAS,
      ...usersList.flatMap((user) => user.areas || []),
    ])).sort((a, b) => a.localeCompare(b));
  }, [usersList]);

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
      list = list.filter((user) => user.campus === filters.campus);
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

  function handleSaveUser(event) {
    event.preventDefault();
    if (!formState) return;
    const { user, form } = formState;
    const errors = validateForm(form, user?.id);
    if (Object.keys(errors).length > 0) {
      setFormState((prev) => (prev ? { ...prev, errors } : prev));
      return;
    }

    setFormState((prev) => (prev ? { ...prev, saving: true, errors: {} } : prev));
    const name = buildFullName(form.firstName, form.paternalLastName, form.maternalLastName);
    const nextUser = {
      id: user?.id || `u${Date.now()}`,
      name,
      email: form.email.trim().toLowerCase(),
      identifier: form.identifier.trim() || (user?.identifier || `USR-${Date.now().toString().slice(-4)}`),
      role: form.role,
      campus: form.campus,
      areas: form.areas,
      status: form.status,
      createdAt: user?.createdAt || new Date().toISOString().slice(0, 10),
      lastAccess: user?.lastAccess || null,
      forcePasswordChange: form.forcePasswordChange,
      notes: form.notes.trim(),
    };

    setUsersList((prev) => user
      ? prev.map((item) => (item.id === user.id ? nextUser : item))
      : [...prev, nextUser]);
    if (user) syncSelectedUser(user.id, () => nextUser);
    setFormState(null);
    setFeedback({
      tone: "success",
      title: user ? "Usuario actualizado" : "Usuario creado",
      message: user
        ? `Se actualizaron los datos administrativos de ${nextUser.name}.`
        : `La cuenta de ${nextUser.name} quedó lista para asignación y seguimiento.`,
    });
  }

  function handleToggleStatus(user) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    setUsersList((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)));
    syncSelectedUser(user.id, (current) => ({ ...current, status: nextStatus }));
    setFeedback({
      tone: "info",
      title: nextStatus === "active" ? "Usuario reactivado" : "Usuario desactivado",
      message: nextStatus === "active"
        ? `${user.name} ya puede volver a iniciar sesion.`
        : `${user.name} quedo sin acceso al panel hasta nueva activacion.`,
    });
    setConfirmAction(null);
  }

  function handleDeleteUser(user) {
    setUsersList((prev) => prev.filter((item) => item.id !== user.id));
    setDrawerUser(null);
    setPasswordResetState({ user: null, password: "" });
    setFeedback({
      tone: "info",
      title: "Usuario eliminado",
      message: `La cuenta de ${user.name} fue retirada del listado local.`,
    });
    setConfirmAction(null);
  }

  function openPasswordReset(user) {
    setPasswordResetState({ user, password: "" });
  }

  function handleResetPassword() {
    if (!passwordResetState.user) return;
    const temporaryPassword = createTemporaryPassword();
    const updatedFields = {
      forcePasswordChange: true,
      lastPasswordResetAt: new Date().toISOString(),
      notes: passwordResetState.user.notes,
    };

    setUsersList((prev) => prev.map((user) => (
      user.id === passwordResetState.user.id ? { ...user, ...updatedFields } : user
    )));
    syncSelectedUser(passwordResetState.user.id, (user) => ({ ...user, ...updatedFields }));
    setFeedback({
      tone: "success",
      title: "Contraseña temporal generada",
      message: `Nueva contraseña para ${passwordResetState.user.name}: ${temporaryPassword}.`,
    });
    setPasswordResetState({ user: passwordResetState.user, password: temporaryPassword });
  }

  function handleExportCsv() {
    exportRowsToCsv({
      filename: `carbontrack-admin-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: filtered,
      columns: [
        { label: "Nombre", get: (user) => user.name },
        { label: "Correo", get: (user) => user.email },
        { label: "Identificador", get: (user) => user.identifier },
        { label: "Rol", get: (user) => ROLE_LABELS[user.role] || user.role },
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
      label: "Area",
      width: "16%",
      render: (value = []) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>
            {value[0] || "Sin area"}
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
      label: "Ultimo acceso",
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
        </div>
      ),
    },
  ];

  const pendingRequests = requests.filter((item) => item.status === "pending");

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <AdminPageHeader
        title="Usuarios y permisos"
        subtitle={`${activeCount} activos · ${inactiveCount} inactivos · ${usersList.length} total`}
        icon={UsersIcon}
        breadcrumb={["Operacion", "Usuarios"]}
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
            { key: "role", label: "Rol", options: roles.filter((role) => role.enabled).map((role) => ({ value: role.id, label: role.label })) },
            { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
            { key: "campus", label: "Campus", options: campuses.map((campus) => ({ value: campus.name, label: campus.name })) },
            { key: "area", label: "Area", options: areaOptions.map((area) => ({ value: area, label: area })) },
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
      }}>
        {filtered.length === usersList.length
          ? `${usersList.length} usuarios`
          : `${filtered.length} de ${usersList.length} usuarios`}
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setDrawerUser}
        maxHeight={520}
        emptyMessage="No se encontraron usuarios con estos filtros."
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
              icon={drawerUser.status === "active" ? ToggleRight : ToggleLeft}
              label={drawerUser.status === "active" ? "Desactivar" : "Activar"}
              accent={drawerUser.status === "active" ? "warning" : "success"}
              onClick={() => setConfirmAction({ type: "toggle", user: drawerUser })}
            />
            <AdminActionButton
              icon={Trash2}
              label="Eliminar"
              accent="danger"
              onClick={() => setConfirmAction({ type: "delete", user: drawerUser })}
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
              <DrawerField label="Ultimo acceso">{fmtDateTime(drawerUser.lastAccess)}</DrawerField>
              <DrawerField label="Cambio obligatorio">
                {drawerUser.forcePasswordChange
                  ? <span style={{ color: "var(--eco-warning, #CA8A04)", fontWeight: 600 }}>Si</span>
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
                <AdminActionButton icon={KeyRound} label="Restablecer contrasena" accent="warning" onClick={() => openPasswordReset(drawerUser)} />
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
                Areas asignadas
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
                    {area}
                  </span>
                )) : <span style={{ opacity: 0.4, fontSize: 12 }}>Sin areas asignadas</span>}
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
        roles={roles.filter((role) => role.enabled)}
        campuses={campuses}
        areaOptions={areaOptions}
        onClose={() => setFormState(null)}
        onSubmit={handleSaveUser}
        onGeneratePassword={() => {
          setFormState((prev) => (prev ? { ...prev, form: { ...prev.form, tempPassword: createTemporaryPassword() } } : prev));
        }}
      />

      <RequestsPanel open={requestsOpen} requests={requests} onClose={() => setRequestsOpen(false)} />

      <ResetPasswordModal
        user={passwordResetState.user}
        tempPassword={passwordResetState.password}
        onCancel={() => setPasswordResetState({ user: null, password: "" })}
        onConfirm={handleResetPassword}
      />

      <AdminConfirmDialog
        open={confirmAction?.type === "toggle"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleToggleStatus(confirmAction.user)}
        title={confirmAction?.user?.status === "active" ? "Desactivar usuario" : "Activar usuario"}
        message={confirmAction?.user?.status === "active"
          ? `¿Desactivar la cuenta de ${confirmAction?.user?.name}? No podra iniciar sesion.`
          : `¿Reactivar la cuenta de ${confirmAction?.user?.name}?`
        }
        confirmLabel={confirmAction?.user?.status === "active" ? "Desactivar" : "Activar"}
        danger={confirmAction?.user?.status === "active"}
      />

      <AdminConfirmDialog
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleDeleteUser(confirmAction.user)}
        title="Eliminar usuario"
        message={`¿Eliminar permanentemente a ${confirmAction?.user?.name}? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  );
}
