import React from "react";
import {
  ShieldCheck, Lock, KeyRound, Clock, AlertTriangle, LogOut, Eye,
  ShieldAlert, CheckCircle,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import {
  AdminFormSection,
  AdminToggleField,
  AdminNumberField,
  AdminSelectField,
} from "../components/AdminFormSection";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import {
  securityConfig,
  activeSessions,
  securityEvents,
  securityRecommendations,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

function fmtDate(ts) {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function SecurityPage() {
  const [form, setForm] = React.useState({ ...securityConfig });
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => { setSaving(false); setDirty(false); }, 1200);
  }

  function handleRestore() {
    setForm({ ...securityConfig });
    setDirty(false);
  }

  const sessionColumns = [
    { key: "user",        label: "Usuario",          render: (v) => <strong style={{ fontWeight: 600 }}>{v}</strong> },
    { key: "role",        label: "Rol",              render: (v) => <AdminStatusBadge variant={v === "admin" ? "info" : "neutral"} label={v} dot={false} /> },
    { key: "device",      label: "Dispositivo" },
    { key: "ip",          label: "IP",               mono: true },
    { key: "lastActivity", label: "Última actividad", mono: true, nowrap: true, render: (v) => fmtDate(v) },
    {
      key: "id",
      label: "",
      width: 40,
      align: "center",
      render: () => (
        <button style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--eco-text-soft, #94A3B8)",
          transition: "color .15s",
        }}
        title="Cerrar sesión remota"
        onMouseEnter={e => e.currentTarget.style.color = "var(--eco-danger, #DC2626)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--eco-text-soft, #94A3B8)"}
        >
          <LogOut size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Seguridad"
        subtitle="Políticas de acceso, sesiones y protección del sistema"
        icon={ShieldCheck}
        breadcrumb={["Gobierno", "Seguridad"]}
        dirty={dirty}
        onSave={handleSave}
        onRestore={dirty ? handleRestore : undefined}
        saving={saving}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Recommendations banner ─────────────────────────────── */}
        <div style={{
          background: "rgba(234,179,8,.06)",
          border: "1px solid rgba(234,179,8,.18)",
          borderRadius: 12, padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-warning, #CA8A04)",
          }}>
            <ShieldAlert size={16} /> Recomendaciones de seguridad
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {securityRecommendations.map(rec => (
              <div key={rec.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                fontFamily: fb, fontSize: 12.5,
                color: "var(--eco-text, #1E293B)",
              }}>
                <AdminStatusBadge variant={rec.level} label={rec.level === "high" ? "Alta" : rec.level === "medium" ? "Media" : "Baja"} />
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Password Policy ────────────────────────────────────── */}
        <AdminFormSection title="Política de contraseñas" description="Requisitos mínimos para contraseñas de usuario" columns={2}>
          <AdminNumberField
            label="Longitud mínima"
            value={form.minPasswordLength}
            onChange={v => update("minPasswordLength", v)}
            min={6} max={32} unit="caracteres"
          />
          <div /> {/* spacer */}
          <AdminToggleField
            label="Requiere mayúsculas"
            checked={form.requireUppercase}
            onChange={v => update("requireUppercase", v)}
            description="Al menos una letra mayúscula (A-Z)"
          />
          <AdminToggleField
            label="Requiere números"
            checked={form.requireNumber}
            onChange={v => update("requireNumber", v)}
            description="Al menos un dígito numérico (0-9)"
          />
          <AdminToggleField
            label="Requiere caracteres especiales"
            checked={form.requireSpecialChar}
            onChange={v => update("requireSpecialChar", v)}
            description="Al menos un carácter especial (!@#$...)"
          />
          <AdminToggleField
            label="Cambio obligatorio al primer acceso"
            checked={form.forceChangeOnFirstLogin}
            onChange={v => update("forceChangeOnFirstLogin", v)}
            description="El usuario deberá cambiar su contraseña en el primer inicio de sesión"
          />
        </AdminFormSection>

        {/* ── Sessions & Lockout ──────────────────────────────────── */}
        <AdminFormSection title="Sesiones y bloqueo" description="Control de sesiones activas y protección contra acceso no autorizado" columns={2}>
          <AdminNumberField
            label="Tiempo de expiración de sesión"
            value={form.sessionTimeout}
            onChange={v => update("sessionTimeout", v)}
            min={5} max={480} unit="minutos"
          />
          <AdminNumberField
            label="Intentos fallidos antes de bloqueo"
            value={form.maxFailedAttempts}
            onChange={v => update("maxFailedAttempts", v)}
            min={3} max={15}
          />
          <AdminNumberField
            label="Duración de bloqueo"
            value={form.lockoutDuration}
            onChange={v => update("lockoutDuration", v)}
            min={5} max={120} unit="minutos"
          />
          <AdminToggleField
            label="Verificación de correo"
            checked={form.emailVerification}
            onChange={v => update("emailVerification", v)}
            description="Solicitar verificación de correo al registrarse"
          />
        </AdminFormSection>

        {/* ── Two-factor (future) ─────────────────────────────────── */}
        <AdminFormSection title="Autenticación de dos factores" description="Capa adicional de seguridad para cuentas críticas">
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: "var(--eco-card-muted, #F8FAFC)",
            borderRadius: 8,
          }}>
            <Lock size={18} color="var(--eco-text-soft, #94A3B8)" />
            <div>
              <div style={{
                fontFamily: fb, fontSize: 13, fontWeight: 500,
                color: "var(--eco-text, #1E293B)",
              }}>
                Doble factor de autenticación
              </div>
              <div style={{
                fontFamily: fb, fontSize: 12,
                color: "var(--eco-text-soft, #94A3B8)", marginTop: 2,
              }}>
                Esta función estará disponible en una próxima actualización. Podrás habilitar TOTP, SMS o correo como segundo factor.
              </div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: 12,
              background: "var(--eco-gray-200, #E2E8F0)",
              fontFamily: fb, fontSize: 10.5, fontWeight: 600,
              color: "var(--eco-text-soft, #94A3B8)",
              whiteSpace: "nowrap",
            }}>
              Próximamente
            </span>
          </div>
        </AdminFormSection>

        {/* ── Active Sessions ─────────────────────────────────────── */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-text, #1E293B)",
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            <Eye size={15} color="var(--eco-primary-500, #22C55E)" />
            Sesiones activas
            <span style={{
              fontFamily: fm, fontSize: 11, fontWeight: 700,
              padding: "2px 8px", borderRadius: 10,
              background: "var(--eco-success-bg, rgba(34,197,94,.08))", color: "var(--eco-success, #16A34A)",
            }}>
              {activeSessions.length}
            </span>
          </div>
          <AdminDataTable columns={sessionColumns} data={activeSessions} compact />
        </div>

        {/* ── Recent Security Events ──────────────────────────────── */}
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            fontFamily: fb, fontSize: 13, fontWeight: 600,
            color: "var(--eco-text, #1E293B)",
            textTransform: "uppercase", letterSpacing: ".04em",
          }}>
            <AlertTriangle size={15} color="var(--eco-warning, #CA8A04)" />
            Eventos de seguridad recientes
          </div>
          <div style={{
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {securityEvents.map((evt, i) => (
              <div key={evt.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 20px",
                borderBottom: i < securityEvents.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                transition: "background .12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <AdminStatusBadge variant={evt.severity} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: fb, fontSize: 13, fontWeight: 500,
                    color: "var(--eco-text, #1E293B)",
                  }}>
                    {evt.description}
                  </div>
                </div>
                <span style={{
                  fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)",
                  whiteSpace: "nowrap",
                }}>
                  {fmtDate(evt.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
