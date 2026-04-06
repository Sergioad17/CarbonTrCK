import {
  Activity,
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  Power,
  Save,
  X,
} from "lucide-react";
import {
  EQUIPMENT_AREA_OPTIONS,
  EQUIPMENT_CATEGORY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
} from "../lib/equipmentStore";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

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

const textAreaStyle = {
  width: "100%",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "10px 14px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text)",
  background: "var(--eco-input-bg, var(--eco-surface))",
  resize: "vertical",
  minHeight: 88,
  transition: "border-color .2s ease",
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
  width: 30,
  height: 30,
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

function Field({ label, error, helper, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-text-soft, var(--eco-gray-500))" }}>
        {label}
      </span>
      {children}
      {helper ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>{helper}</span> : null}
      {error ? <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-danger)" }}>{error}</span> : null}
    </label>
  );
}

export const createEmptyEquipmentForm = (item) => ({
  id: item?.id || "",
  campusCode: item?.campusCode || "CAMPUS-CT",
  areaCode: item?.areaCode || "Aulas",
  name: item?.name || "",
  category: item?.category || "electricidad",
  type: item?.type || "it",
  quantity: item?.quantity ?? 1,
  powerW: item?.powerW ?? 0,
  hoursPerDay: item?.usage?.hoursPerDay ?? 0,
  daysPerWeek: item?.usage?.daysPerWeek ?? 5,
  weeksPerMonth: item?.usage?.weeksPerMonth ?? 4.3,
  notes: item?.notes || "",
  isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
});

export function parseEquipmentFormData(formElement, currentForm) {
  const formData = new FormData(formElement);
  return {
    id: currentForm.id || "",
    campusCode: String(formData.get("campusCode") || ""),
    areaCode: String(formData.get("areaCode") || ""),
    name: String(formData.get("name") || ""),
    category: String(formData.get("category") || "electricidad"),
    type: String(formData.get("type") || "it"),
    quantity: Number(formData.get("quantity") || 0),
    powerW: Number(formData.get("powerW") || 0),
    usage: {
      hoursPerDay: Number(formData.get("hoursPerDay") || 0),
      daysPerWeek: Number(formData.get("daysPerWeek") || 0),
      weeksPerMonth: Number(formData.get("weeksPerMonth") || 0),
    },
    notes: String(formData.get("notes") || ""),
    isActive: String(formData.get("isActive")) === "true",
  };
}

export function validateEquipmentForm(payload) {
  const errors = {};
  if (!payload.name.trim()) errors.name = "Escribe un nombre.";
  if (!payload.campusCode.trim()) errors.campusCode = "Indica el campus.";
  if (!payload.areaCode.trim()) errors.areaCode = "Selecciona un area.";
  if (payload.quantity < 0 || !Number.isFinite(payload.quantity)) errors.quantity = "Debe ser un numero valido.";
  if (payload.category === "electricidad" && (payload.powerW < 0 || !Number.isFinite(payload.powerW))) errors.powerW = "Debe ser un numero valido.";
  if (payload.usage.hoursPerDay < 0 || !Number.isFinite(payload.usage.hoursPerDay)) errors.hoursPerDay = "Debe ser un numero valido.";
  if (payload.usage.daysPerWeek < 0 || !Number.isFinite(payload.usage.daysPerWeek)) errors.daysPerWeek = "Debe ser un numero valido.";
  if (payload.usage.weeksPerMonth < 0 || !Number.isFinite(payload.usage.weeksPerMonth)) errors.weeksPerMonth = "Debe ser un numero valido.";
  return errors;
}

export default function EquipmentModal({ state, onClose, onSubmit, onFormChange }) {
  if (!state) return null;
  const { form, errors, saving, equipment } = state;
  const isElectric = form.category === "electricidad";
  const isEdit = Boolean(equipment);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "grid", placeItems: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.36)", backdropFilter: "blur(2px)", animation: "ctOverlay .18s ease-out" }} onClick={onClose} />
      <div
        style={{
          position: "relative",
          width: "min(94vw, 760px)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--eco-card)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "var(--eco-shadow-xl)",
          border: "1px solid var(--eco-border)",
          animation: "ctPop .2s ease-out",
        }}
      >
        <form onSubmit={onSubmit}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {isEdit ? <Pencil size={16} /> : <Plus size={16} />}
              </div>
              <div>
                <p style={{ margin: "0 0 3px", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>Catalogos / Equipos / {isEdit ? "Editar" : "Nuevo"}</p>
                <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-text-strong, var(--eco-gray-900))" }}>{isEdit ? "Editar equipo" : "Nuevo equipo"}</h3>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" style={iconButtonStyle}><X size={16} /></button>
          </div>

          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg,var(--eco-primary-50),var(--eco-surface))", border: "1.5px solid var(--eco-primary-200)", borderRadius: "var(--eco-radius-xl)", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-primary-500)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Activity size={12} />
                </div>
                <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>Consumo mensual estimado</span>
              </div>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.5 }}>
                kWh/mes = (W x horasMes x cantidad) / 1 000, donde horasMes = horas/dia x dias/semana x semanas/mes.
              </p>
            </div>

            <div className="ct-equipment-modal-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
              <Field label="Nombre del equipo" error={errors.name}>
                <input name="name" defaultValue={form.name} style={inputStyle} placeholder="Ej. PC de escritorio" />
              </Field>
              <Field label="Campus" error={errors.campusCode}>
                <input name="campusCode" defaultValue={form.campusCode} style={inputStyle} placeholder="CAMPUS-CT" />
              </Field>
              <Field label="Area" error={errors.areaCode}>
                <select name="areaCode" defaultValue={form.areaCode} style={inputStyle}>
                  {EQUIPMENT_AREA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo" error={errors.type}>
                <select name="type" defaultValue={form.type} style={inputStyle}>
                  {EQUIPMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Categoria" error={errors.category}>
                <select name="category" value={form.category} onChange={(event) => onFormChange((prev) => ({ ...prev, category: event.target.value }))} style={inputStyle}>
                  {EQUIPMENT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad" error={errors.quantity}>
                <input name="quantity" type="number" min="0" step="1" defaultValue={form.quantity} style={inputStyle} />
              </Field>
            </div>

            {!isElectric ? (
              <div style={{ background: "var(--eco-warning-bg)", border: "1px solid #FDE68A", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Info size={15} style={{ color: "var(--eco-warning)", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text-strong, var(--eco-gray-800))" }}>Combustible: proximamente</p>
                  <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, var(--eco-gray-600))", lineHeight: 1.5 }}>
                    En este MVP se guarda el inventario, pero los campos especificos como litros/hora se dejan listos para backend futuro.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="ct-equipment-modal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 }}>
              <Field label="Potencia por unidad (W)" error={errors.powerW} helper={isElectric ? "Solo aplica para electricidad." : "No aplica en combustible por ahora."}>
                <input name="powerW" type="number" min="0" step="0.1" defaultValue={form.powerW} style={{ ...inputStyle, opacity: isElectric ? 1 : 0.6 }} disabled={!isElectric} />
              </Field>
              <Field label="Horas por dia" error={errors.hoursPerDay}>
                <input name="hoursPerDay" type="number" min="0" step="0.1" defaultValue={form.hoursPerDay} style={inputStyle} />
              </Field>
              <Field label="Dias por semana" error={errors.daysPerWeek}>
                <input name="daysPerWeek" type="number" min="0" step="0.1" defaultValue={form.daysPerWeek} style={inputStyle} />
              </Field>
            </div>

            <div className="ct-equipment-modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Semanas por mes" error={errors.weeksPerMonth} helper="Valor sugerido: 4.3">
                <input name="weeksPerMonth" type="number" min="0" step="0.1" defaultValue={form.weeksPerMonth} style={inputStyle} />
              </Field>
              <Field label="Estado">
                <div style={{ display: "flex", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-md)", overflow: "hidden", height: 42 }}>
                  <button
                    type="button"
                    onClick={() => onFormChange((prev) => ({ ...prev, isActive: true }))}
                    style={{
                      flex: 1,
                      border: "none",
                      background: form.isActive ? "var(--eco-primary-50)" : "var(--eco-surface)",
                      color: form.isActive ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
                      fontFamily: fb,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      transition: "all 150ms",
                    }}
                  >
                    <CheckCircle2 size={12} /> Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormChange((prev) => ({ ...prev, isActive: false }))}
                    style={{
                      flex: 1,
                      border: "none",
                      borderLeft: "1px solid var(--eco-border)",
                      background: !form.isActive ? "var(--eco-warning-bg)" : "var(--eco-surface)",
                      color: !form.isActive ? "var(--eco-secondary-600)" : "var(--eco-gray-600)",
                      fontFamily: fb,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      transition: "all 150ms",
                    }}
                  >
                    <Power size={12} /> Inactivo
                  </button>
                </div>
                <input type="hidden" name="isActive" value={String(form.isActive)} readOnly />
              </Field>
            </div>

            <Field label="Notas" error={errors.notes}>
              <textarea name="notes" defaultValue={form.notes} style={textAreaStyle} placeholder="Comentarios, contexto del calculo o supuestos..." />
            </Field>
          </div>

          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--eco-border)", background: "var(--eco-surface)" }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, var(--eco-gray-400))" }}>Los cambios se guardan en localStorage y quedan listos para conectar backend despues.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancelar</button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButtonStyle,
                  opacity: saving ? 0.7 : 1,
                  minWidth: 150,
                }}
              >
                <Save size={14} />
                {saving ? "Guardando..." : isEdit ? "Actualizar equipo" : "Crear equipo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
