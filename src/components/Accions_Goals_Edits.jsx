import { X } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const inStyle = {
  height: 36,
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  padding: "0 10px",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-gray-700)",
  background: "white",
  outline: "none",
  transition: "border-color 150ms",
};

const btnP = {
  height: 36,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "none",
  background: "var(--eco-primary-500)",
  color: "white",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  boxShadow: "var(--eco-shadow-sm)",
  transition: "all 200ms cubic-bezier(.33,1,.68,1)",
};

const btnS = {
  height: 36,
  padding: "0 14px",
  borderRadius: "var(--eco-radius-md)",
  border: "1px solid var(--eco-border)",
  background: "white",
  color: "var(--eco-gray-700)",
  fontFamily: fb,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 150ms",
};

function Shell({ title, onClose, onSubmit, submitLabel, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        animation: "ctOverlay .2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,.35)",
          backdropFilter: "blur(3px)",
        }}
        onClick={onClose}
      />
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(860px,calc(100vw - 28px))",
          maxHeight: "calc(100vh - 40px)",
          overflow: "auto",
          position: "relative",
          background: "white",
          borderRadius: "var(--eco-radius-xl, 20px)",
          border: "1px solid var(--eco-border)",
          boxShadow: "0 20px 25px -5px rgba(15,23,42,.08)",
          animation: "ctPop .25s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--eco-gray-100)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--eco-radius-sm)",
              border: "1px solid var(--eco-border)",
              background: "white",
              cursor: "pointer",
              color: "var(--eco-gray-500)",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--eco-primary-300)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--eco-border)";
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--eco-gray-100)",
            background: "var(--eco-gray-50)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderRadius: "0 0 var(--eco-radius-xl, 20px) var(--eco-radius-xl, 20px)",
          }}
        >
          <button type="button" onClick={onClose} style={{ ...btnS, height: 34, fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" style={{ ...btnP, height: 34, fontSize: 13, fontWeight: 700 }}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Accions_Goals_Edits({
  mode,
  editing,
  onClose,
  onSubmit,
  targetForm,
  setTargetForm,
  actionForm,
  setActionForm,
  areas,
  targets,
  creatorName,
}) {
  if (!mode) return null;

  if (mode === "target") {
    const tf = targetForm;
    return (
      <Shell
        title={editing ? "Editar meta" : "Nueva meta"}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel="Guardar meta"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Nombre</span>
            <input value={tf.title} onChange={(e) => setTargetForm((p) => ({ ...p, title: e.target.value }))} style={inStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Categoría</span>
            <select value={tf.category} onChange={(e) => setTargetForm((p) => ({ ...p, category: e.target.value }))} style={inStyle}>
              <option value="all">Todas</option>
              <option value="electricidad">Electricidad</option>
              <option value="combustible">Combustible</option>
              <option value="otros">Otros</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Área</span>
            <select value={tf.areaId} onChange={(e) => setTargetForm((p) => ({ ...p, areaId: e.target.value }))} style={inStyle}>
              <option value="all">Todas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Tipo</span>
            <select value={tf.type} onChange={(e) => setTargetForm((p) => ({ ...p, type: e.target.value }))} style={inStyle}>
              <option value="reduction_percent">Reducción %</option>
              <option value="absolute">Absoluto tCO₂e</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Estado</span>
            <select value={tf.status} onChange={(e) => setTargetForm((p) => ({ ...p, status: e.target.value }))} style={inStyle}>
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
              <option value="completed">Completada</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Responsable</span>
            <input value={tf.createdBy || creatorName} readOnly style={{ ...inStyle, background: "var(--eco-gray-50)", color: "var(--eco-gray-500)", cursor: "default" }} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginTop: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Baseline desde</span>
            <input type="date" value={tf.baselineStart} onChange={(e) => setTargetForm((p) => ({ ...p, baselineStart: e.target.value }))} style={inStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Baseline hasta</span>
            <input type="date" value={tf.baselineEnd} onChange={(e) => setTargetForm((p) => ({ ...p, baselineEnd: e.target.value }))} style={inStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Baseline tCO₂e</span>
            <input type="number" step="0.001" value={tf.baselineValue} onChange={(e) => setTargetForm((p) => ({ ...p, baselineValue: e.target.value }))} style={inStyle} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginTop: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Objetivo desde</span>
            <input type="date" value={tf.targetStart} onChange={(e) => setTargetForm((p) => ({ ...p, targetStart: e.target.value }))} style={inStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Objetivo hasta</span>
            <input type="date" value={tf.targetEnd} onChange={(e) => setTargetForm((p) => ({ ...p, targetEnd: e.target.value }))} style={inStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
              {tf.type === "reduction_percent" ? "Objetivo %" : "Objetivo tCO₂e"}
            </span>
            <input type="number" step="0.001" value={tf.targetValue} onChange={(e) => setTargetForm((p) => ({ ...p, targetValue: e.target.value }))} style={inStyle} />
          </label>
        </div>

        <label style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Descripción</span>
          <textarea value={tf.description} onChange={(e) => setTargetForm((p) => ({ ...p, description: e.target.value }))} style={{ ...inStyle, height: 90, resize: "vertical", padding: "8px 10px" }} />
        </label>
      </Shell>
    );
  }

  const af = actionForm;
  return (
    <Shell title="Nueva acción" onClose={onClose} onSubmit={onSubmit} submitLabel="Guardar acción">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Meta asociada</span>
          <select value={af.targetId} onChange={(e) => setActionForm((p) => ({ ...p, targetId: e.target.value }))} style={inStyle}>
            <option value="">Seleccionar</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.title}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Nombre</span>
          <input value={af.title} onChange={(e) => setActionForm((p) => ({ ...p, title: e.target.value }))} style={inStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Responsable</span>
          <input value={af.owner} onChange={(e) => setActionForm((p) => ({ ...p, owner: e.target.value }))} style={inStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Estado</span>
          <select value={af.status} onChange={(e) => setActionForm((p) => ({ ...p, status: e.target.value }))} style={inStyle}>
            <option value="planned">Planificada</option>
            <option value="in_progress">En progreso</option>
            <option value="done">Completada</option>
            <option value="blocked">Bloqueada</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Inicio</span>
          <input type="date" value={af.startDate} onChange={(e) => setActionForm((p) => ({ ...p, startDate: e.target.value }))} style={inStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Fin</span>
          <input type="date" value={af.endDate} onChange={(e) => setActionForm((p) => ({ ...p, endDate: e.target.value }))} style={inStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Impacto tCO₂e</span>
          <input type="number" step="0.001" value={af.impact_tco2e} onChange={(e) => setActionForm((p) => ({ ...p, impact_tco2e: e.target.value }))} style={inStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Evidencia</span>
          <input value={af.evidence} onChange={(e) => setActionForm((p) => ({ ...p, evidence: e.target.value }))} style={inStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Notas</span>
          <input value={af.notes} onChange={(e) => setActionForm((p) => ({ ...p, notes: e.target.value }))} style={inStyle} />
        </label>
      </div>
    </Shell>
  );
}
