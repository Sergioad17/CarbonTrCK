import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileX,
  Filter,
  KeyRound,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { exportRowsToCsv } from "../lib/csvExport";
import {
  USER_AREA_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_ROLE_SUMMARY,
  activate,
  deactivate,
  describeAreaAccess,
  filterUsers,
  getAll,
  getRoleLabel,
  getStoreMeta,
  getRoles,
  resetPasswordMock,
  upsert,
} from "../lib/usersStore";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const DEFAULT_CAMPUS = "CAMPUS-CT";

const PAGE_ANIMATIONS = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@media(max-width:1120px){.ct-users-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.ct-users-header{flex-direction:column;align-items:flex-start!important}.ct-users-toolbar{width:100%}.ct-users-toolbar button{flex:1}.ct-users-table{min-width:980px}}
@media(max-width:760px){.ct-users-kpis{grid-template-columns:1fr!important}.ct-users-filters{grid-template-columns:1fr!important}.ct-users-modal-grid{grid-template-columns:1fr!important}.ct-users-form-actions{flex-direction:column-reverse;align-items:stretch!important}}
`;

const inputStyle = {
  width: "100%",
  height: 40,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-gray-200)",
  padding: "0 12px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-gray-700)",
  background: "white",
};

const textAreaStyle = {
  width: "100%",
  minHeight: 96,
  resize: "vertical",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-gray-200)",
  padding: "10px 12px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-gray-700)",
  background: "white",
};

const primaryButtonStyle = {
  height: 38,
  padding: "0 14px",
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
  justifyContent: "center",
  gap: 6,
  boxShadow: "var(--eco-shadow-sm)",
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-gray-200)",
  background: "white",
  color: "var(--eco-gray-700)",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const iconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: "var(--eco-radius-sm)",
  border: "1px solid var(--eco-gray-200)",
  background: "white",
  color: "var(--eco-gray-500)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 140ms",
};

const segmentedButtonStyle = (active) => ({
  flex: 1,
  height: 34,
  border: "none",
  background: active ? "var(--eco-primary-50)" : "white",
  color: active ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
  fontFamily: fb,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

const roleBadgeTone = {
  admin: "primary",
  operativo: "success",
  directivo: "neutral",
};

const emptyForm = (user) => ({
  id: user?.id || "",
  fullName: user?.fullName || "",
  email: user?.email || "",
  role: user?.role || "operativo",
  campusCode: user?.campusCode || DEFAULT_CAMPUS,
  areaAccessMode: user?.areaAccess?.mode || "all",
  areaCodes: user?.areaAccess?.areaCodes || [],
  isActive: typeof user?.isActive === "boolean" ? user.isActive : true,
  notes: user?.notes || "",
  tempPassword: "",
});

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
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "CT-";
  for (let index = 0; index < 10; index += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return password;
}

function Badge({ tone = "neutral", children }) {
  const theme = {
    primary: {
      color: "var(--eco-primary-700)",
      background: "var(--eco-primary-50)",
      border: "var(--eco-primary-200)",
    },
    success: {
      color: "var(--eco-success)",
      background: "var(--eco-success-bg)",
      border: "#BBF7D0",
    },
    neutral: {
      color: "var(--eco-gray-600)",
      background: "var(--eco-gray-100)",
      border: "var(--eco-gray-200)",
    },
    warning: {
      color: "var(--eco-secondary-600)",
      background: "var(--eco-warning-bg)",
      border: "#FDE68A",
    },
  }[tone] || {
    color: "var(--eco-gray-600)",
    background: "var(--eco-gray-100)",
    border: "var(--eco-gray-200)",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: "var(--eco-radius-full)",
        fontFamily: fb,
        fontSize: 11,
        fontWeight: 700,
        background: theme.background,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, required, error, helper, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-500)" }}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
      {!error && helper ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{helper}</span> : null}
    </label>
  );
}

function SectionLabel({ icon, children, delay = 0 }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,
      }}
    >
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
      <h2
        style={{
          margin: 0,
          fontFamily: fd,
          fontSize: 17,
          fontWeight: 700,
          color: "var(--eco-gray-800)",
          letterSpacing: "-0.01em",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function IconActionButton({ label, onClick, icon, danger = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        ...iconButtonStyle,
        color: danger ? "var(--eco-danger)" : iconButtonStyle.color,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = danger ? "#FCA5A5" : "var(--eco-primary-300)";
        event.currentTarget.style.background = danger ? "var(--eco-danger-bg)" : "var(--eco-primary-50)";
        event.currentTarget.style.color = danger ? "var(--eco-danger)" : "var(--eco-primary-700)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "var(--eco-gray-200)";
        event.currentTarget.style.background = "white";
        event.currentTarget.style.color = danger ? "var(--eco-danger)" : "var(--eco-gray-500)";
      }}
    >
      {icon}
    </button>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 2600);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 140,
        minWidth: 260,
        maxWidth: 360,
        background: "white",
        border: "1px solid var(--eco-gray-200)",
        borderRadius: "var(--eco-radius-lg)",
        boxShadow: "var(--eco-shadow-xl)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        animation: "ctSlideR .25s cubic-bezier(.33,1,.68,1)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--eco-radius-sm)",
          background: "var(--eco-success-bg)",
          color: "var(--eco-success)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <CheckCircle2 size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>
          {toast.title}
        </p>
        <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
          {toast.message}
        </p>
      </div>
    </div>
  );
}

function SkeletonRows() {
  const shimmer = "linear-gradient(90deg,var(--eco-gray-100) 25%,var(--eco-gray-200) 50%,var(--eco-gray-100) 75%)";
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            height: 74,
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-gray-200)",
            background: "white",
            padding: 16,
            animation: `ctFadeUp .3s ease-out ${row * 50}ms both`,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.2fr .8fr .9fr .8fr 1fr 1fr", gap: 12, height: "100%" }}>
            {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
              <div
                key={cell}
                style={{
                  borderRadius: "var(--eco-radius-md)",
                  background: shimmer,
                  backgroundSize: "200% 100%",
                  animation: "ctShimmer 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ title, value, sub, icon, tone = "neutral", delay = 0 }) {
  const topBar = {
    neutral: "var(--eco-gray-300)",
    primary: "var(--eco-primary-500)",
    success: "var(--eco-success)",
    warning: "var(--eco-warning)",
  }[tone];

  const iconTheme = {
    neutral: { background: "var(--eco-gray-100)", color: "var(--eco-gray-600)" },
    primary: { background: "var(--eco-primary-50)", color: "var(--eco-primary-600)" },
    success: { background: "var(--eco-success-bg)", color: "var(--eco-success)" },
    warning: { background: "var(--eco-warning-bg)", color: "var(--eco-secondary-600)" },
  }[tone];

  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        border: "1px solid var(--eco-gray-200)",
        boxShadow: "var(--eco-shadow-sm)",
        padding: 18,
        position: "relative",
        overflow: "hidden",
        animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: topBar }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--eco-radius-md)",
            background: iconTheme.background,
            color: iconTheme.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>{title}</p>
      </div>
      <p style={{ margin: 0, fontFamily: fm, fontSize: 28, fontWeight: 700, color: "var(--eco-gray-900)" }}>{value}</p>
      {sub ? <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)" }}>{sub}</p> : null}
    </div>
  );
}

function UserFormModal({ state, roles, onClose, onSubmit, onGeneratePassword }) {
  if (!state) return null;
  const { user, form, errors, saving } = state;
  const isEdit = Boolean(user);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(96vw, 860px)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "white",
          border: "1px solid var(--eco-gray-200)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          animation: "ctPop .22s ease-out",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)" }}>
              {isEdit ? "Editar usuario" : "Nuevo usuario"}
            </h3>
            <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", lineHeight: 1.55 }}>
              Configura identidad, rol y alcance de acceso. La estructura queda lista para conectarse a backend más adelante.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ct-users-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
            <Field label="Nombre completo" required error={errors.fullName}>
              <input
                value={form.fullName}
                onChange={(event) => state.setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                style={inputStyle}
                placeholder="Nombre y apellidos"
              />
            </Field>
            <Field label="Correo electrónico" required error={errors.email}>
              <input
                value={form.email}
                onChange={(event) => state.setForm((prev) => ({ ...prev, email: event.target.value }))}
                style={inputStyle}
                placeholder="usuario@carbontrack.lat"
              />
            </Field>
            <Field label="Rol" required error={errors.role}>
              <select
                value={form.role}
                onChange={(event) => {
                  const nextRole = event.target.value;
                  state.setForm((prev) => ({
                    ...prev,
                    role: nextRole,
                    areaAccessMode: nextRole === "admin" ? "all" : prev.areaAccessMode,
                    areaCodes: nextRole === "admin" ? [] : prev.areaCodes,
                  }));
                }}
                style={inputStyle}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Campus" helper="Campus fijo para esta primera versión.">
              <input value={DEFAULT_CAMPUS} style={{ ...inputStyle, background: "var(--eco-gray-50)" }} disabled />
            </Field>
          </div>

          {form.role === "admin" ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 14,
                borderRadius: "var(--eco-radius-lg)",
                background: "var(--eco-warning-bg)",
                border: "1px solid #FDE68A",
              }}
            >
              <AlertTriangle size={16} style={{ color: "var(--eco-secondary-600)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-800)" }}>
                  Los administradores pueden modificar catálogos y usuarios.
                </p>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.55 }}>
                  Este rol tiene acceso total a catálogos, exportaciones y gestión de cuentas.
                </p>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Acceso a áreas" required error={errors.areaCodes}>
              <div style={{ border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden" }}>
                <div style={{ display: "flex", borderBottom: "1px solid var(--eco-gray-200)" }}>
                  <button
                    type="button"
                    style={segmentedButtonStyle(form.areaAccessMode === "all")}
                    onClick={() => state.setForm((prev) => ({ ...prev, areaAccessMode: "all", areaCodes: [] }))}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    style={segmentedButtonStyle(form.areaAccessMode === "custom")}
                    onClick={() => state.setForm((prev) => ({ ...prev, areaAccessMode: "custom" }))}
                    disabled={form.role === "admin"}
                  >
                    Personalizado
                  </button>
                </div>
                <div style={{ padding: 14 }}>
                  {form.role === "admin" || form.areaAccessMode === "all" ? (
                    <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
                      Este usuario podrá consultar todas las áreas del campus.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                      {USER_AREA_OPTIONS.map((area) => {
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
                              border: `1px solid ${checked ? "var(--eco-primary-300)" : "var(--eco-gray-200)"}`,
                              background: checked ? "var(--eco-primary-50)" : "white",
                              cursor: "pointer",
                              fontFamily: fb,
                              fontSize: 12,
                              color: "var(--eco-gray-700)",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                state.setForm((prev) => ({
                                  ...prev,
                                  areaCodes: event.target.checked
                                    ? [...prev.areaCodes, area.value]
                                    : prev.areaCodes.filter((item) => item !== area.value),
                                }));
                              }}
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

            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>Resumen de permisos por rol</p>
              <div style={{ background: "var(--eco-gray-50)", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 14 }}>
                {USER_ROLE_SUMMARY[form.role].map((line) => (
                  <p key={line} style={{ margin: "0 0 6px", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.55 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {!isEdit ? (
            <div className="ct-users-modal-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr auto", gap: 14, alignItems: "end" }}>
              <Field label="Contraseña temporal" helper="Solo visible durante esta captura inicial.">
                <input
                  value={form.tempPassword}
                  onChange={(event) => state.setForm((prev) => ({ ...prev, tempPassword: event.target.value }))}
                  style={inputStyle}
                  placeholder="Genera o escribe una contraseña temporal"
                />
              </Field>
              <button type="button" onClick={onGeneratePassword} style={secondaryButtonStyle}>
                <KeyRound size={14} />
                Generar automáticamente
              </button>
            </div>
          ) : null}

          <div className="ct-users-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Estado">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 40,
                  borderRadius: "var(--eco-radius-md)",
                  border: "1px solid var(--eco-gray-200)",
                  padding: "0 12px",
                  fontFamily: fb,
                  fontSize: 13,
                  color: "var(--eco-gray-700)",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => state.setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Activo
              </label>
            </Field>
            <Field label="Nota" helper="Campo opcional para contexto operativo.">
              <textarea
                value={form.notes}
                onChange={(event) => state.setForm((prev) => ({ ...prev, notes: event.target.value }))}
                style={textAreaStyle}
                placeholder="Ejemplo: acceso temporal para auditoría interna."
              />
            </Field>
          </div>

          <div className="ct-users-form-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)" }}>
              Los campos obligatorios están marcados con asterisco.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }}>
                {isEdit ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDetailDrawer({ user, onClose, onEdit }) {
  if (!user) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.34)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(94vw, 560px)",
          height: "100%",
          background: "white",
          boxShadow: "var(--eco-shadow-xl)",
          borderLeft: "1px solid var(--eco-gray-200)",
          display: "flex",
          flexDirection: "column",
          animation: "ctSlideR .25s cubic-bezier(.33,1,.68,1)",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>Administración / Usuarios / Detalle</p>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)" }}>Detalle del usuario</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "linear-gradient(135deg,var(--eco-primary-50),#F8FFFB)",
              border: "1px solid var(--eco-primary-200)",
              borderRadius: "var(--eco-radius-xl)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-gray-900)" }}>{user.fullName}</h4>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>{user.email}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge tone={roleBadgeTone[user.role]}>{getRoleLabel(user.role)}</Badge>
                <Badge tone={user.isActive ? "success" : "warning"}>{user.isActive ? "Activo" : "Inactivo"}</Badge>
              </div>
            </div>
          </div>

          <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden" }}>
            {[
              ["Campus", user.campusCode],
              ["Acceso", user.areaAccess.mode === "all" ? "Todas las áreas" : "Personalizado"],
              ["Áreas asignadas", describeAreaAccess(user)],
              ["Creado", formatDateTime(user.createdAt)],
              ["Actualizado", formatDateTime(user.updatedAt)],
              ["Último acceso", formatDateTime(user.lastLoginAt)],
              ["Nota", user.notes || "Sin notas"],
            ].map(([label, value], index, all) => (
              <div
                key={label}
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 10,
                  borderBottom: index < all.length - 1 ? "1px solid var(--eco-gray-100)" : "none",
                }}
              >
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{label}</span>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)", textAlign: "right", lineHeight: 1.5 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 16 }}>
            <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>Permisos resumidos</p>
            {USER_ROLE_SUMMARY[user.role].map((line) => (
              <p key={line} style={{ margin: "0 0 6px", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", lineHeight: 1.55 }}>
                {line}
              </p>
            ))}
          </div>
        </div>

        <div style={{ padding: 20, borderTop: "1px solid var(--eco-gray-200)", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => onEdit(user)} style={primaryButtonStyle}>
            <Pencil size={14} />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, tempPassword, onCancel, onConfirm }) {
  if (!user) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(2px)", animation: "ctOverlay .18s ease-out" }}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "min(92vw, 520px)",
          background: "white",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          border: "1px solid var(--eco-gray-200)",
          padding: 22,
          animation: "ctPop .2s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--eco-radius-md)",
              background: tempPassword ? "var(--eco-success-bg)" : "var(--eco-warning-bg)",
              color: tempPassword ? "var(--eco-success)" : "var(--eco-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {tempPassword ? <CheckCircle2 size={18} /> : <KeyRound size={18} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-gray-900)" }}>
              {tempPassword ? "Contraseña temporal generada" : "Restablecer contraseña"}
            </h3>
            <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", lineHeight: 1.55 }}>
              {tempPassword
                ? "En producción esto se enviaría por correo. Copia la contraseña ahora: se muestra una sola vez."
                : `Se generará una contraseña temporal para ${user.fullName}.`}
            </p>
          </div>
        </div>

        {tempPassword ? (
          <div style={{ background: "var(--eco-gray-900)", color: "white", borderRadius: "var(--eco-radius-lg)", padding: 14 }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "rgba(255,255,255,.6)" }}>Contraseña temporal</p>
            <p style={{ margin: "6px 0 0", fontFamily: fm, fontSize: 20, fontWeight: 700, letterSpacing: "0.04em" }}>{tempPassword}</p>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
            {tempPassword ? "Cerrar" : "Cancelar"}
          </button>
          {!tempPassword ? (
            <button type="button" onClick={onConfirm} style={primaryButtonStyle}>
              Generar contraseña
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [formState, setFormState] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [passwordResetState, setPasswordResetState] = useState({ user: null, password: "" });
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "active",
    areaCode: "all",
  });

  const loadUsers = () => {
    try {
      setError("");
      setLoading(true);
      const nextRoles = getRoles();
      const nextUsers = getAll();
      const meta = getStoreMeta();
      setTimeout(() => {
        setRoles(nextRoles);
        setUsers(nextUsers);
        if (meta.seededFromEmpty) {
          setToast({ title: "Usuarios de ejemplo", message: "Se cargaron tres cuentas demo para comenzar." });
        }
        setLoading(false);
      }, 240);
    } catch {
      setError("No se pudieron cargar los usuarios. Intenta de nuevo.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    const syncUsers = (event) => setUsers(Array.isArray(event.detail) ? event.detail : getAll());
    window.addEventListener("carbontrack:users-changed", syncUsers);
    return () => window.removeEventListener("carbontrack:users-changed", syncUsers);
  }, []);

  const filteredUsers = useMemo(() => filterUsers(users, filters), [users, filters]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const adminUsers = users.filter((user) => user.role === "admin").length;
    const operativoUsers = users.filter((user) => user.role === "operativo").length;
    const directivoUsers = users.filter((user) => user.role === "directivo").length;
    const recentLoginUsers = users.filter((user) => isRecentLogin(user.lastLoginAt)).length;
    return { activeUsers, adminUsers, operativoUsers, directivoUsers, recentLoginUsers };
  }, [users]);

  const demoUsers = useMemo(
    () => users.filter((user) => user.notes === "Usuario de ejemplo" || user.email.endsWith("@carbontrack.lat")),
    [users]
  );

  const openCreateModal = () => {
    const state = {
      user: null,
      form: emptyForm(),
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
    setFormState(state);
  };

  const openEditModal = (user) => {
    const state = {
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
    setFormState(state);
  };

  const validateForm = (form, editingUserId) => {
    const errors = {};
    const email = String(form.email || "").trim().toLowerCase();
    const name = String(form.fullName || "").trim();

    if (!name) errors.fullName = "Escribe el nombre completo.";
    if (!email) errors.email = "Escribe un correo electrónico.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) errors.email = "Escribe un correo electrónico válido.";
    else {
      const duplicate = users.find((user) => user.id !== editingUserId && user.email.toLowerCase() === email);
      if (duplicate) errors.email = "Este correo ya está registrado.";
    }

    if (!form.role) errors.role = "Selecciona un rol.";
    if (form.role !== "admin" && form.areaAccessMode === "custom" && !form.areaCodes.length) {
      errors.areaCodes = "Selecciona al menos un área para acceso personalizado.";
    }

    return errors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState) return;
    const { user, form } = formState;
    const errors = validateForm(form, user?.id);
    if (Object.keys(errors).length > 0) {
      setFormState((prev) => (prev ? { ...prev, errors } : prev));
      return;
    }

    setFormState((prev) => (prev ? { ...prev, saving: true, errors: {} } : prev));

    const payload = {
      id: user?.id,
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      campusCode: DEFAULT_CAMPUS,
      areaAccess: {
        mode: form.role === "admin" ? "all" : form.areaAccessMode,
        areaCodes: form.role === "admin" || form.areaAccessMode === "all" ? [] : form.areaCodes,
      },
      isActive: form.isActive,
      notes: form.notes.trim(),
      lastLoginAt: user?.lastLoginAt || null,
    };

    const result = upsert(payload);
    if (!result.ok) {
      setFormState((prev) => (prev ? { ...prev, saving: false, errors: { email: "Este correo ya está registrado." } } : prev));
      return;
    }

    setUsers(result.users);
    setFormState(null);
    setToast({
      title: user ? "Usuario actualizado" : "Usuario creado",
      message: user ? `${payload.fullName} se actualizó correctamente.` : `${payload.fullName} ya está listo para usarse.`,
    });
  };

  const handleToggleStatus = (user) => {
    const nextUsers = user.isActive ? deactivate(user.id, false) : activate(user.id);
    setUsers(nextUsers);
    setToast({
      title: "Estado actualizado",
      message: `${user.fullName} ahora está ${user.isActive ? "inactivo" : "activo"}.`,
    });
  };

  const handleExportCsv = () => {
    exportRowsToCsv({
      filename: `carbontrack-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: filteredUsers,
      columns: [
        { label: "Nombre", get: (user) => user.fullName },
        { label: "Correo", get: (user) => user.email },
        { label: "Rol", get: (user) => getRoleLabel(user.role) },
        { label: "Estado", get: (user) => (user.isActive ? "Activo" : "Inactivo") },
        { label: "Acceso", get: (user) => (user.areaAccess.mode === "all" ? "Todas las áreas" : describeAreaAccess(user)) },
      ],
    });
    setToast({ title: "CSV exportado", message: "Se exportó el listado filtrado actual." });
  };

  const handleResetPassword = () => {
    if (!passwordResetState.user) return;
    const result = resetPasswordMock(passwordResetState.user.id);
    if (!result.ok) return;
    setUsers(getAll());
    setPasswordResetState({ user: passwordResetState.user, password: result.password });
    setToast({ title: "Contraseña temporal generada", message: `Se generó una nueva contraseña para ${passwordResetState.user.fullName}.` });
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      role: "all",
      status: "active",
      areaCode: "all",
    });
  };

  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", background: "var(--eco-gray-50)", minHeight: "100%" }}>
      <style>{PAGE_ANIMATIONS}</style>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
        <div className="ct-users-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>Usuarios</h1>
            <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 14, color: "var(--eco-gray-500)", maxWidth: 760 }}>
              Administra cuentas y roles. Esto controla quién puede capturar, exportar y modificar catálogos.
            </p>
          </div>
          <div className="ct-users-toolbar" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={openCreateModal} style={primaryButtonStyle}>
              <Plus size={14} />
              Nuevo usuario
            </button>
            <button type="button" onClick={handleExportCsv} style={secondaryButtonStyle}>
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        {demoUsers.length >= 3 ? (
          <div
            style={{
              marginBottom: 20,
              background: "linear-gradient(135deg,var(--eco-primary-50),#F8FFFB)",
              border: "1px solid var(--eco-primary-200)",
              borderRadius: "var(--eco-radius-xl)",
              padding: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 40ms both",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--eco-radius-md)",
                background: "var(--eco-primary-500)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 800, color: "var(--eco-gray-900)" }}>Usuarios de ejemplo</p>
              <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-600)", lineHeight: 1.55 }}>
                El módulo inició con cuentas demo para Administrador, Operativo y Directivo. Puedes editarlas o crear usuarios nuevos.
              </p>
            </div>
          </div>
        ) : null}

        <SectionLabel icon={<Filter size={14} />} delay={60}>Filtros</SectionLabel>
        <div
          style={{
            background: "white",
            border: "1px solid var(--eco-gray-200)",
            borderRadius: "var(--eco-radius-lg)",
            boxShadow: "var(--eco-shadow-sm)",
            padding: 16,
            marginBottom: 20,
            animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 80ms both",
          }}
        >
          <div className="ct-users-filters" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3,minmax(0,1fr)) auto", gap: 12, alignItems: "end" }}>
            <Field label="Buscar">
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "var(--eco-gray-400)" }} />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Nombre o correo"
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
              </div>
            </Field>
            <Field label="Rol">
              <select value={filters.role} onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))} style={inputStyle}>
                <option value="all">Todos</option>
                <option value="admin">Administrador</option>
                <option value="operativo">Operativo</option>
                <option value="directivo">Directivo</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={inputStyle}>
                <option value="active">Activos</option>
                <option value="all">Todos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </Field>
            <Field label="Área">
              <select value={filters.areaCode} onChange={(event) => setFilters((prev) => ({ ...prev, areaCode: event.target.value }))} style={inputStyle}>
                <option value="all">Todas</option>
                {USER_AREA_OPTIONS.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
              <RotateCcw size={14} />
              Limpiar filtros
            </button>
          </div>
        </div>

        <SectionLabel icon={<Shield size={14} />} delay={100}>Resumen</SectionLabel>
        <div className="ct-users-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 20 }}>
          <KpiCard title="Usuarios activos" value={stats.activeUsers} sub={`${stats.recentLoginUsers} con acceso reciente`} icon={<Users size={18} />} tone="primary" delay={120} />
          <KpiCard title="Administradores" value={stats.adminUsers} sub="Control total del sistema" icon={<Shield size={18} />} tone="warning" delay={160} />
          <KpiCard title="Operativos" value={stats.operativoUsers} sub="Captura y operación diaria" icon={<UserCog size={18} />} tone="success" delay={200} />
          <KpiCard title="Directivos" value={stats.directivoUsers} sub="Consulta y seguimiento" icon={<Eye size={18} />} tone="neutral" delay={240} />
        </div>

        <SectionLabel icon={<Users size={14} />} delay={140}>Listado de usuarios</SectionLabel>
        {error ? (
          <div
            style={{
              background: "white",
              border: "1px solid #FECACA",
              borderRadius: "var(--eco-radius-lg)",
              boxShadow: "var(--eco-shadow-sm)",
              padding: 22,
              marginBottom: 20,
              animation: "ctFadeUp .3s ease-out",
            }}
          >
            <p style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-danger)" }}>{error}</p>
          </div>
        ) : loading ? (
          <SkeletonRows />
        ) : filteredUsers.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "var(--eco-radius-lg)",
              border: "1px solid var(--eco-gray-200)",
              padding: "48px 24px",
              textAlign: "center",
              animation: "ctFadeUp .4s ease-out",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--eco-gray-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                color: "var(--eco-gray-400)",
              }}
            >
              <FileX size={28} />
            </div>
            <p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>
              No hay usuarios con estos filtros.
            </p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>
              Crea un usuario para comenzar.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: "white",
              borderRadius: "var(--eco-radius-lg)",
              border: "1px solid var(--eco-gray-200)",
              boxShadow: "var(--eco-shadow-sm)",
              overflow: "hidden",
              animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 160ms both",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table className="ct-users-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--eco-gray-50)" }}>
                    {["Nombre", "Correo", "Rol", "Acceso", "Estado", "Último acceso", "Acciones"].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "14px 16px",
                          textAlign: label === "Acciones" ? "right" : "left",
                          fontFamily: fb,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--eco-gray-500)",
                          borderBottom: "1px solid var(--eco-gray-200)",
                          whiteSpace: "nowrap",
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
                        animation: `ctFadeUp .25s ease-out ${index * 30}ms both`,
                        transition: "background 140ms",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "var(--eco-gray-50)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "white";
                      }}
                    >
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)" }}>
                        <div>
                          <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{user.fullName}</p>
                          <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>Creado: {formatDateTime(user.createdAt)}</p>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-600)" }}>
                        {user.email}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)" }}>
                        <Badge tone={roleBadgeTone[user.role]}>{getRoleLabel(user.role)}</Badge>
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <Badge tone={user.areaAccess.mode === "all" ? "primary" : "neutral"}>
                            {user.areaAccess.mode === "all" ? "Todas las áreas" : "Personalizado"}
                          </Badge>
                          {user.areaAccess.mode === "custom" ? (
                            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{describeAreaAccess(user)}</span>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)" }}>
                        <Badge tone={user.isActive ? "success" : "warning"}>{user.isActive ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
                        {formatDateTime(user.lastLoginAt)}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--eco-gray-100)", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <IconActionButton label="Ver" onClick={() => setDetailUser(user)} icon={<Eye size={15} />} />
                          <IconActionButton label="Editar" onClick={() => openEditModal(user)} icon={<Pencil size={15} />} />
                          <IconActionButton label={user.isActive ? "Desactivar" : "Activar"} onClick={() => handleToggleStatus(user)} icon={<Power size={15} />} danger={!user.isActive} />
                          <IconActionButton label="Restablecer contraseña" onClick={() => setPasswordResetState({ user, password: "" })} icon={<KeyRound size={15} />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <UserFormModal
        state={formState}
        roles={roles.length ? roles : USER_ROLE_OPTIONS}
        onClose={() => setFormState(null)}
        onSubmit={handleSubmit}
        onGeneratePassword={() => {
          setFormState((prev) => (prev ? { ...prev, form: { ...prev.form, tempPassword: generateTempPassword() } } : prev));
        }}
      />
      <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} onEdit={openEditModal} />
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
