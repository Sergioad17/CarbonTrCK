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
import { systemConfig } from "../mocks/adminMocks";

export default function SystemConfigPage() {
  const [form, setForm] = React.useState({ ...systemConfig });
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
    setForm({ ...systemConfig });
    setDirty(false);
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* ── General ────────────────────────────────────────────── */}
        <AdminFormSection title="General" description="Identificación y estado del sistema" columns={2}>
          <AdminTextField label="Nombre del sistema" value={form.systemName} onChange={v => update("systemName", v)} />
          <AdminTextField label="Versión" value={form.version} onChange={v => update("version", v)} disabled />
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

        {/* ── Regionalización ────────────────────────────────────── */}
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

        {/* ── Notificaciones ─────────────────────────────────────── */}
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

        {/* ── Logs ────────────────────────────────────────────────── */}
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

        {/* ── Archivos ────────────────────────────────────────────── */}
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

        {/* ── Personalización ─────────────────────────────────────── */}
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
