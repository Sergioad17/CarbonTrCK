import { Pencil, Plus, Power, Save, Star, X } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export const scopeOptions = [
  { value: "all", label: "Todos" },
  { value: "scope1", label: "Scope 1" },
  { value: "scope2", label: "Scope 2" },
  { value: "scope3", label: "Scope 3" },
];

export const categoryOptions = [
  { value: "all", label: "Todas" },
  { value: "electricidad", label: "Electricidad" },
  { value: "combustible", label: "Combustible" },
  { value: "otros", label: "Otros" },
];

export const regionOptions = ["MX-SEN", "MX", "Tamaulipas", "Custom"];

export const createEmptyFactorForm = (factor) => ({
  id: factor?.id || "",
  scope: factor?.scope || "scope2",
  category: factor?.category || "electricidad",
  denominatorUnit: factor?.denominatorUnit || "kWh",
  value: factor?.value ?? "",
  region: regionOptions.includes(factor?.region) ? factor.region : "Custom",
  customRegion: regionOptions.includes(factor?.region) ? "" : factor?.region || "",
  provider: factor?.provider || "",
  sourceUrl: factor?.sourceUrl || "",
  validFrom: factor?.validFrom || new Date().toISOString().slice(0, 10),
  validTo: factor?.validTo || "",
  isDefault: Boolean(factor?.isDefault),
  isActive: typeof factor?.isActive === "boolean" ? factor.isActive : true,
  uncertaintyPct: factor?.uncertaintyPct ?? "",
  notes: factor?.notes || "",
  editMode: factor ? "newVersion" : "edit",
  confirmDirectEdit: false,
});

export const resolveFactorDenominator = (category, currentValue) => {
  if (category === "electricidad") return "kWh";
  if (category === "combustible") return "L";
  return currentValue || "kWh";
};

const inputStyle = {
  width: "100%",
  height: 42,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 14px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg, var(--eco-surface))",
  transition: "border-color .2s ease, box-shadow .2s ease",
};

const primaryButtonStyle = {
  height: 38,
  padding: "0 16px",
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
  transition: "all 180ms ease",
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-text)",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "all 180ms ease",
};

const iconButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: "var(--eco-radius-sm)",
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)",
  color: "var(--eco-gray-500)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 140ms",
};

const radioCardStyle = (active) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 12,
  borderRadius: "var(--eco-radius-md)",
  border: `1.5px solid ${active ? "var(--eco-primary-400)" : "var(--eco-border)"}`,
  background: active ? "var(--eco-primary-50)" : "var(--eco-surface)",
  cursor: "pointer",
  transition: "all 180ms ease",
});

function Field({ label, error, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{label}</span>
      {children}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
    </label>
  );
}

export default function FactorModal({
  state,
  onClose,
  onSubmit,
}) {
  if (!state) return null;

  const { factor, form, errors, saving, usageCount } = state;
  const isEdit = Boolean(factor);
  const title = isEdit ? "Editar factor" : "Nuevo factor de emision";
  const helper =
    isEdit && form.editMode === "newVersion"
      ? "Crear nueva version es la opcion recomendada para mantener trazabilidad."
      : isEdit
        ? "Modifica los valores del factor existente."
        : "Completa los datos base del factor de emision.";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "grid", placeItems: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "min(96vw, 860px)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--eco-card)",
          border: "1px solid var(--eco-border)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          animation: "ctPop .22s ease-out",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {isEdit ? <Pencil size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>{title}</h3>
              <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>{helper}</p>
              {errors.editMode ? <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{errors.editMode}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {isEdit && (
            <div style={{ background: "var(--eco-surface)", borderRadius: "var(--eco-radius-lg)", padding: 14, border: "1px solid var(--eco-border)" }}>
              <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>
                Modo de edicion
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={radioCardStyle(form.editMode === "edit")}>
                  <input type="radio" name="editMode" value="edit" checked={form.editMode === "edit"} onChange={() => state.setForm((prev) => ({ ...prev, editMode: "edit" }))} />
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Editar este registro</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))", marginTop: 2 }}>
                      Usalo si todavia no se ha usado o si confirmas cambiarlo directamente.
                    </div>
                  </div>
                </label>
                <label style={radioCardStyle(form.editMode === "newVersion")}>
                  <input type="radio" name="editMode" value="newVersion" checked={form.editMode === "newVersion"} onChange={() => state.setForm((prev) => ({ ...prev, editMode: "newVersion" }))} />
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Crear nueva version</div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-500))", marginTop: 2 }}>
                      Recomendado para conservar historicos de calculos y reportes.
                    </div>
                  </div>
                </label>
              </div>
              {usageCount > 0 && form.editMode === "edit" && (
                <label style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 10, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))" }}>
                  <input
                    type="checkbox"
                    checked={form.confirmDirectEdit}
                    onChange={(event) => state.setForm((prev) => ({ ...prev, confirmDirectEdit: event.target.checked }))}
                    style={{ marginTop: 2 }}
                  />
                  Confirmo editar un factor ya usado en {usageCount} registro(s).
                </label>
              )}
            </div>
          )}

          <div className="ct-factor-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
            <Field label="Scope" error={errors.scope}>
              <select value={form.scope} onChange={(event) => state.setForm((prev) => ({ ...prev, scope: event.target.value }))} style={inputStyle}>
                {scopeOptions.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Categoria" error={errors.category}>
              <select
                value={form.category}
                onChange={(event) =>
                  state.setForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                    denominatorUnit: resolveFactorDenominator(event.target.value, prev.denominatorUnit),
                  }))
                }
                style={inputStyle}
              >
                {categoryOptions.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Unidad del denominador" error={errors.denominatorUnit}>
              <input value={form.denominatorUnit} readOnly style={{ ...inputStyle, background: "var(--eco-surface)", opacity: 0.7 }} />
            </Field>
            <Field label="Valor EF" error={errors.value}>
              <input type="number" min="0" step="0.0001" value={form.value} onChange={(event) => state.setForm((prev) => ({ ...prev, value: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Region" error={errors.region}>
              <select value={form.region} onChange={(event) => state.setForm((prev) => ({ ...prev, region: event.target.value }))} style={inputStyle}>
                {regionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor" error={errors.provider}>
              <input value={form.provider} onChange={(event) => state.setForm((prev) => ({ ...prev, provider: event.target.value }))} style={inputStyle} placeholder="Ej. SENER, CFE..." />
            </Field>
            {form.region === "Custom" && (
              <Field label="Region personalizada" error={errors.customRegion}>
                <input value={form.customRegion} onChange={(event) => state.setForm((prev) => ({ ...prev, customRegion: event.target.value }))} style={inputStyle} />
              </Field>
            )}
            <Field label="Fuente (URL opcional)" error={errors.sourceUrl}>
              <input value={form.sourceUrl} onChange={(event) => state.setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))} style={inputStyle} placeholder="https://..." />
            </Field>
            <Field label="Vigencia desde" error={errors.validFrom}>
              <input type="date" value={form.validFrom} onChange={(event) => state.setForm((prev) => ({ ...prev, validFrom: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Vigencia hasta" error={errors.validTo}>
              <input type="date" value={form.validTo} onChange={(event) => state.setForm((prev) => ({ ...prev, validTo: event.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Incertidumbre %" error={errors.uncertaintyPct}>
              <input type="number" min="0" step="0.1" value={form.uncertaintyPct} onChange={(event) => state.setForm((prev) => ({ ...prev, uncertaintyPct: event.target.value }))} style={inputStyle} placeholder="Ej. 5.0" />
            </Field>
            <Field label="Notas" error={errors.notes}>
              <textarea value={form.notes} onChange={(event) => state.setForm((prev) => ({ ...prev, notes: event.target.value }))} style={{ ...inputStyle, minHeight: 100, paddingTop: 10, resize: "vertical" }} placeholder="Observaciones adicionales..." />
            </Field>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: fb, fontSize: 13, color: "var(--eco-text, var(--eco-gray-700))", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isDefault} onChange={(event) => state.setForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
              <Star size={14} style={{ color: form.isDefault ? "var(--eco-primary-500)" : "var(--eco-gray-400)" }} />
              Predeterminado
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: fb, fontSize: 13, color: "var(--eco-text, var(--eco-gray-700))", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => state.setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              <Power size={14} style={{ color: form.isActive ? "var(--eco-success)" : "var(--eco-gray-400)" }} />
              Activo
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                opacity: saving ? 0.7 : 1,
                minWidth: 160,
              }}
            >
              <Save size={14} />
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear factor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
