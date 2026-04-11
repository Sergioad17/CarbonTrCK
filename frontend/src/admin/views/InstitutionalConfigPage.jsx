import React from "react";
import { Landmark, Upload, ImageIcon, Trash2, CheckCircle } from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import {
  AdminFormSection,
  AdminTextField,
  AdminSelectField,
  AdminToggleField,
} from "../components/AdminFormSection";
import { institutionalConfig } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const COUNTRIES = ["México", "Colombia", "Chile", "Argentina", "España", "Estados Unidos"];
const TIMEZONES = [
  { value: "America/Monterrey",   label: "America/Monterrey (UTC-6)" },
  { value: "America/Mexico_City", label: "America/Ciudad de México (UTC-6)" },
  { value: "America/Cancun",      label: "America/Cancún (UTC-5)" },
  { value: "America/Tijuana",     label: "America/Tijuana (UTC-8)" },
  { value: "America/Bogota",      label: "America/Bogotá (UTC-5)" },
  { value: "America/Santiago",    label: "America/Santiago (UTC-3)" },
];
const CURRENCIES = [
  { value: "MXN", label: "MXN – Peso mexicano" },
  { value: "USD", label: "USD – Dólar estadounidense" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "COP", label: "COP – Peso colombiano" },
];
const UNITS = [
  { value: "tCO₂e", label: "tCO₂e – Toneladas de CO₂ equivalente" },
  { value: "kgCO₂e", label: "kgCO₂e – Kilogramos de CO₂ equivalente" },
];
const PERIODS = [
  { value: "monthly",   label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual",    label: "Anual" },
];

/* ── Logo Upload Field ─────────────────────────────────────────────────── */
function LogoUploadField({ logo, logoName, logoSize, onUpload, onRemove }) {
  const inputRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return; // 2 MB limit
    const reader = new FileReader();
    reader.onload = () => onUpload?.(reader.result, file.name, file.size);
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }

  function fmtSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={{
        fontFamily: fb, fontSize: 12, fontWeight: 600,
        color: "var(--eco-text-soft, #64748B)", letterSpacing: ".02em",
        display: "block", marginBottom: 6,
      }}>
        Logo institucional
      </span>

      {logo ? (
        /* ── Preview state ── */
        <div style={{
          display: "flex", alignItems: "center", gap: 18,
          padding: "18px 22px",
          border: "1px solid var(--eco-primary-300, rgba(34,197,94,.3))",
          borderRadius: 12,
          background: "var(--eco-primary-50, rgba(34,197,94,.04))",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 14, overflow: "hidden",
            border: "2px solid var(--eco-border, #E2E8F0)",
            background: "var(--eco-card, #fff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <img src={logo} alt="Logo preview" style={{
              width: "100%", height: "100%", objectFit: "contain",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              color: "var(--eco-success, #16A34A)",
            }}>
              <CheckCircle size={14} /> Logo cargado correctamente
            </div>
            {logoName && (
              <div style={{
                fontFamily: fm, fontSize: 11.5, color: "var(--eco-text-soft, #94A3B8)",
                marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {logoName}{logoSize ? ` · ${fmtSize(logoSize)}` : ""}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => inputRef.current?.click()} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 13px", borderRadius: 8,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "var(--eco-card, #fff)",
                fontFamily: fb, fontSize: 12, fontWeight: 500,
                color: "var(--eco-text, #1E293B)", cursor: "pointer",
                transition: "background .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--eco-card, #fff)"}
              >
                <Upload size={12} /> Cambiar
              </button>
              <button onClick={onRemove} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 13px", borderRadius: 8,
                border: "1px solid rgba(239,68,68,.2)",
                background: "var(--eco-danger-bg, rgba(239,68,68,.05))",
                fontFamily: fb, fontSize: 12, fontWeight: 500,
                color: "var(--eco-danger, #DC2626)", cursor: "pointer",
                transition: "background .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--eco-danger-bg, rgba(239,68,68,.05))"}
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Dropzone state ── */
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            padding: "32px 24px",
            border: `2px dashed ${dragging ? "var(--eco-primary-400, #4ADE80)" : "var(--eco-border, #E2E8F0)"}`,
            borderRadius: 12,
            background: dragging ? "var(--eco-primary-50, rgba(34,197,94,.06))" : "var(--eco-card-muted, #F8FAFC)",
            cursor: "pointer",
            transition: "all .2s ease",
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: dragging ? "var(--eco-primary-100, rgba(34,197,94,.12))" : "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .2s",
          }}>
            <ImageIcon size={22} color={dragging ? "var(--eco-primary-500, #22C55E)" : "var(--eco-text-soft, #94A3B8)"} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: fb, fontSize: 13, fontWeight: 500,
              color: "var(--eco-text, #1E293B)",
            }}>
              {dragging ? "Suelta la imagen aquí" : "Arrastra una imagen o haz click para seleccionar"}
            </div>
            <div style={{
              fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #94A3B8)",
              marginTop: 4,
            }}>
              PNG o JPG · Máximo 2 MB · 256×256 px recomendado
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: "none" }}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}

export default function InstitutionalConfigPage() {
  const [form, setForm] = React.useState({ ...institutionalConfig });
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 1200);
  }

  function handleRestore() {
    setForm({ ...institutionalConfig });
    setDirty(false);
  }

  return (
    <>
      <AdminPageHeader
        title="Configuración institucional"
        subtitle="Datos generales de la institución y preferencias de operación"
        icon={Landmark}
        breadcrumb={["Gobierno", "Config. institucional"]}
        dirty={dirty}
        onSave={handleSave}
        onRestore={dirty ? handleRestore : undefined}
        saving={saving}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* ── Identidad ──────────────────────────────────────────── */}
        <AdminFormSection title="Identidad" description="Nombre, logo y datos de identificación de la institución" columns={2}>
          <AdminTextField label="Nombre de la institución" value={form.name} onChange={v => update("name", v)} required />
          <AdminTextField label="Siglas" value={form.acronym} onChange={v => update("acronym", v)} />
          <div style={{ gridColumn: "1 / -1" }}>
            <AdminTextField label="Descripción general" value={form.description} onChange={v => update("description", v)} multiline rows={3} />
          </div>
          {/* Logo upload */}
          <LogoUploadField
            logo={form.logo}
            logoName={form._logoName}
            logoSize={form._logoSize}
            onUpload={(dataUrl, name, size) => {
              update("logo", dataUrl);
              setForm(p => ({ ...p, _logoName: name, _logoSize: size }));
            }}
            onRemove={() => {
              update("logo", null);
              setForm(p => ({ ...p, _logoName: null, _logoSize: null }));
            }}
          />
        </AdminFormSection>

        {/* ── Ubicación ──────────────────────────────────────────── */}
        <AdminFormSection title="Ubicación" description="Localización física y sede principal" columns={2}>
          <AdminTextField label="Sede principal" value={form.headquarters} onChange={v => update("headquarters", v)} />
          <AdminSelectField label="País" value={form.country} onChange={v => update("country", v)} options={COUNTRIES} />
          <AdminTextField label="Estado / Provincia" value={form.state} onChange={v => update("state", v)} />
          <AdminTextField label="Ciudad" value={form.city} onChange={v => update("city", v)} />
        </AdminFormSection>

        {/* ── Parámetros operativos ──────────────────────────────── */}
        <AdminFormSection title="Parámetros operativos" description="Unidades, periodos y preferencias de medición" columns={2}>
          <AdminSelectField label="Zona horaria" value={form.timezone} onChange={v => update("timezone", v)} options={TIMEZONES} />
          <AdminSelectField label="Moneda" value={form.currency} onChange={v => update("currency", v)} options={CURRENCIES} />
          <AdminSelectField label="Unidad base de medición" value={form.baseUnit} onChange={v => update("baseUnit", v)} options={UNITS} />
          <AdminSelectField label="Periodo operativo por defecto" value={form.defaultPeriod} onChange={v => update("defaultPeriod", v)} options={PERIODS} />
        </AdminFormSection>

        {/* ── Contacto ───────────────────────────────────────────── */}
        <AdminFormSection title="Contacto" description="Datos de comunicación y responsable institucional" columns={2}>
          <AdminTextField label="Correo administrativo" value={form.adminEmail} onChange={v => update("adminEmail", v)} type="email" required />
          <AdminTextField label="Teléfono" value={form.phone} onChange={v => update("phone", v)} />
          <AdminTextField label="Responsable principal" value={form.responsiblePerson} onChange={v => update("responsiblePerson", v)} required />
        </AdminFormSection>

        {/* ── Estructura organizacional ───────────────────────────── */}
        <AdminFormSection title="Estructura organizacional" description="Define cómo se organiza la institución para la captura de datos">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AdminToggleField label="Trabaja por campus" checked={form.usesCampuses} onChange={v => update("usesCampuses", v)} description="Permite agrupar áreas por campus o sedes" />
            <AdminToggleField label="Trabaja por áreas" checked={form.usesAreas} onChange={v => update("usesAreas", v)} description="Organización principal por áreas funcionales" />
            <AdminToggleField label="Trabaja por departamentos" checked={form.usesDepartments} onChange={v => update("usesDepartments", v)} description="Subdivisión departamental dentro de las áreas" />
            <AdminToggleField label="Trabaja por edificios" checked={form.usesBuildings} onChange={v => update("usesBuildings", v)} description="Agrupación por infraestructura física" />
          </div>
        </AdminFormSection>

        {/* ── Scopes activos ─────────────────────────────────────── */}
        <AdminFormSection title="Scopes activos" description="Alcances de emisiones que la institución mide actualmente">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AdminToggleField
              label="Scope 1 – Emisiones directas"
              checked={form.activeScopes.includes(1)}
              onChange={v => {
                const scopes = v ? [...form.activeScopes, 1] : form.activeScopes.filter(s => s !== 1);
                update("activeScopes", scopes);
              }}
              description="Combustión estacionaria, móvil, fugitiva"
            />
            <AdminToggleField
              label="Scope 2 – Emisiones indirectas por energía"
              checked={form.activeScopes.includes(2)}
              onChange={v => {
                const scopes = v ? [...form.activeScopes, 2] : form.activeScopes.filter(s => s !== 2);
                update("activeScopes", scopes);
              }}
              description="Consumo de electricidad comprada"
            />
            <AdminToggleField
              label="Scope 3 – Otras emisiones indirectas"
              checked={form.activeScopes.includes(3)}
              onChange={v => {
                const scopes = v ? [...form.activeScopes, 3] : form.activeScopes.filter(s => s !== 3);
                update("activeScopes", scopes);
              }}
              description="Transporte, residuos, viajes de negocio (disponible próximamente)"
            />
          </div>
        </AdminFormSection>
      </div>
    </>
  );
}
