import React from "react";
import { SlidersHorizontal } from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import {
  AdminFormSection,
  AdminTextField,
  AdminSelectField,
  AdminToggleField,
  AdminNumberField,
  AdminChipList,
} from "../components/AdminFormSection";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { fetchAdminGovernmentSettings, saveAdminGovernmentSettings } from "../../api/admin";

const fb = "var(--eco-font-body)";

const DEFAULT_SYSTEM_FORM = {
  systemName: "",
  version: "",
  environment: "production",
  language: "es-MX",
  dateFormat: "DD/MM/YYYY",
  numberFormat: "1,234.56",
  timezone: "America/Mexico_City",
  systemEmail: "",
  notificationsEnabled: true,
  emailNotifications: true,
  pushNotifications: false,
  logsEnabled: true,
  logLevel: "info",
  maxUploadSize: 10,
  allowedFileTypes: ["pdf", "xlsx", "csv", "png", "jpg"],
  maxAttachmentSize: 5,
  primaryColor: "#22C55E",
  compactMode: false,
  showTips: true,
};

function normalizeSystemForm(input = {}) {
  const allowedFileTypes = Array.isArray(input.allowedFileTypes)
    ? input.allowedFileTypes.map((item) => String(item).replace(/^\./, "").trim().toLowerCase()).filter(Boolean)
    : DEFAULT_SYSTEM_FORM.allowedFileTypes;

  return {
    ...DEFAULT_SYSTEM_FORM,
    ...input,
    version: String(input.version || DEFAULT_SYSTEM_FORM.version).trim() || DEFAULT_SYSTEM_FORM.version,
    allowedFileTypes,
    maxUploadSize: Number.isFinite(Number(input.maxUploadSize)) ? Number(input.maxUploadSize) : DEFAULT_SYSTEM_FORM.maxUploadSize,
    maxAttachmentSize: Number.isFinite(Number(input.maxAttachmentSize)) ? Number(input.maxAttachmentSize) : DEFAULT_SYSTEM_FORM.maxAttachmentSize,
    notificationsEnabled: typeof input.notificationsEnabled === "boolean" ? input.notificationsEnabled : DEFAULT_SYSTEM_FORM.notificationsEnabled,
    emailNotifications: typeof input.emailNotifications === "boolean" ? input.emailNotifications : DEFAULT_SYSTEM_FORM.emailNotifications,
    pushNotifications: typeof input.pushNotifications === "boolean" ? input.pushNotifications : DEFAULT_SYSTEM_FORM.pushNotifications,
    logsEnabled: typeof input.logsEnabled === "boolean" ? input.logsEnabled : DEFAULT_SYSTEM_FORM.logsEnabled,
    compactMode: typeof input.compactMode === "boolean" ? input.compactMode : DEFAULT_SYSTEM_FORM.compactMode,
    showTips: typeof input.showTips === "boolean" ? input.showTips : DEFAULT_SYSTEM_FORM.showTips,
  };
}

export default function SystemConfigPage() {
  const [form, setForm] = React.useState(null);
  const [settings, setSettings] = React.useState(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminGovernmentSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setForm(normalizeSystemForm(data?.system || {}));
        setDirty(false);
        setStatus(null);
      })
      .catch((error) => {
        console.error("admin_system_load_failed", error);
        setStatus({ type: "error", text: "No se pudo cargar la configuración del sistema." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
    setStatus(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveAdminGovernmentSettings({
        ...(settings || {}),
        system: normalizeSystemForm(form),
      });
      setSettings(saved);
      setForm(normalizeSystemForm(saved?.system || {}));
      setDirty(false);
      setStatus({ type: "success", text: "Configuración del sistema guardada." });
    } catch (error) {
      console.error("admin_system_save_failed", error);
      setStatus({ type: "error", text: "No se pudo guardar. Revisa la conexión con el backend." });
    } finally {
      setSaving(false);
    }
  }

  function handleRestore() {
    setForm(normalizeSystemForm(settings?.system || {}));
    setDirty(false);
    setStatus(null);
  }

  if (loading || !form) {
    return <AdminLoadingScreen />;
  }

  return (
    <>
      <AdminPageHeader
        title="Configuración del sistema"
        subtitle="Ajustes internos, formatos y preferencias de la plataforma"
        icon={SlidersHorizontal}
        breadcrumb={["Gobierno", "Config. del sistema"]}
        dirty={dirty}
        onSave={handleSave}
        onRestore={dirty ? handleRestore : undefined}
        saving={saving}
      />
      {status && (
        <div style={{
          marginBottom: 14,
          padding: "10px 14px",
          borderRadius: 8,
          border: status.type === "error" ? "1px solid rgba(239,68,68,.18)" : "1px solid rgba(34,197,94,.18)",
          background: status.type === "error" ? "rgba(239,68,68,.06)" : "rgba(34,197,94,.06)",
          fontFamily: fb,
          fontSize: 12.5,
          fontWeight: 500,
          color: status.type === "error" ? "var(--eco-danger, #DC2626)" : "var(--eco-success, #16A34A)",
        }}>
          {status.text}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* -- General ---------------------------------------------- */}
        <AdminFormSection title="General" description="Identificación y estado del sistema" columns={2}>
          <AdminTextField label="Nombre del sistema" value={form.systemName} onChange={v => update("systemName", v)} />
          <AdminTextField label="Versión" value={form.version} onChange={v => update("version", v)} />
          <AdminSelectField
            label="Ambiente"
            value={form.environment}
            onChange={v => update("environment", v)}
            options={[
              { value: "production", label: "Producción" },
              { value: "staging", label: "Staging" },
              { value: "development", label: "Desarrollo" },
            ]}
          />
          <AdminTextField label="Correo del sistema" value={form.systemEmail} onChange={v => update("systemEmail", v)} type="email" />
        </AdminFormSection>

        {/* -- Regionalización -------------------------------------- */}
        <AdminFormSection title="Regionalización" description="Idioma, formatos y zona horaria" columns={2}>
          <AdminSelectField
            label="Idioma"
            value={form.language}
            onChange={v => update("language", v)}
            options={[
              { value: "es-MX", label: "Español (México)" },
              { value: "es-ES", label: "Español (España)" },
              { value: "en-US", label: "English (US)" },
            ]}
          />
          <AdminSelectField
            label="Formato de fecha"
            value={form.dateFormat}
            onChange={v => update("dateFormat", v)}
            options={[
              { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
              { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
              { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
            ]}
          />
          <AdminSelectField
            label="Formato numérico"
            value={form.numberFormat}
            onChange={v => update("numberFormat", v)}
            options={[
              { value: "1,234.56", label: "1,234.56 (comas + punto)" },
              { value: "1.234,56", label: "1.234,56 (puntos + coma)" },
              { value: "1 234.56", label: "1 234.56 (espacios + punto)" },
            ]}
          />
          <AdminSelectField
            label="Zona horaria"
            value={form.timezone}
            onChange={v => update("timezone", v)}
            options={[
              { value: "America/Monterrey",   label: "America/Monterrey (UTC-6)" },
              { value: "America/Mexico_City", label: "America/Ciudad de México (UTC-6)" },
              { value: "America/Cancun",      label: "America/Cancún (UTC-5)" },
            ]}
          />
        </AdminFormSection>

        {/* -- Notificaciones --------------------------------------- */}
        <AdminFormSection title="Notificaciones" description="Canales y preferencias de notificación">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AdminToggleField
              label="Notificaciones habilitadas"
              checked={form.notificationsEnabled}
              onChange={v => update("notificationsEnabled", v)}
              description="Activa o desactiva todas las notificaciones del sistema"
            />
            <AdminToggleField
              label="Notificaciones por correo"
              checked={form.emailNotifications}
              onChange={v => update("emailNotifications", v)}
              description="Enviar alertas y avisos por correo electrónico"
              disabled={!form.notificationsEnabled}
            />
            <AdminToggleField
              label="Notificaciones push"
              checked={form.pushNotifications}
              onChange={v => update("pushNotifications", v)}
              description="Notificaciones push en navegador (requiere configuración adicional)"
              disabled={!form.notificationsEnabled}
            />
          </div>
        </AdminFormSection>

        {/* -- Logs -------------------------------------------------- */}
        <AdminFormSection title="Registro de actividad" description="Configuración de logging y auditoría" columns={2}>
          <AdminToggleField label="Logs habilitados" checked={form.logsEnabled} onChange={v => update("logsEnabled", v)} description="Registrar actividad del sistema para auditoría" />
          <AdminSelectField
            label="Nivel de log"
            value={form.logLevel}
            onChange={v => update("logLevel", v)}
            options={[
              { value: "error", label: "Solo errores" },
              { value: "warning", label: "Advertencias y errores" },
              { value: "info", label: "Información general" },
              { value: "debug", label: "Debug (detallado)" },
            ]}
            disabled={!form.logsEnabled}
          />
        </AdminFormSection>

        {/* -- Archivos ---------------------------------------------- */}
        <AdminFormSection title="Archivos y cargas" description="Límites y tipos de archivos permitidos" columns={2}>
          <AdminNumberField
            label="Tamaño máximo de carga"
            value={form.maxUploadSize}
            onChange={v => update("maxUploadSize", v)}
            min={1} max={100} unit="MB"
          />
          <AdminNumberField
            label="Tamaño máximo de adjuntos"
            value={form.maxAttachmentSize}
            onChange={v => update("maxAttachmentSize", v)}
            min={1} max={50} unit="MB"
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <AdminChipList
              label="Tipos de archivo permitidos"
              values={form.allowedFileTypes}
              hint="Extensiones que los usuarios pueden cargar al sistema"
            />
          </div>
        </AdminFormSection>

        {/* -- Personalización --------------------------------------- */}
        <AdminFormSection title="Personalización" description="Ajustes visuales y de experiencia">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AdminToggleField
              label="Modo compacto"
              checked={form.compactMode}
              onChange={v => update("compactMode", v)}
              description="Reduce espaciado y densidad visual para mostrar más información"
            />
            <AdminToggleField
              label="Mostrar tips de ayuda"
              checked={form.showTips}
              onChange={v => update("showTips", v)}
              description="Mostrar sugerencias contextuales en la interfaz"
            />
          </div>
        </AdminFormSection>
      </div>
    </>
  );
}
