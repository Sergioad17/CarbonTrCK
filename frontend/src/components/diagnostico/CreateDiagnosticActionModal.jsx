import React from "react";
import { ClipboardEdit, AlertCircle } from "lucide-react";
import DiagModalShell, {
  FieldLabel, TextInput, DateInput, SelectInput, TextArea,
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import { uid, appendItem, KEYS } from "./helpers";

const fb = "var(--eco-font-body)";

const PRIORITY_OPTIONS = [
  { value: "high",   label: "Alta"  },
  { value: "medium", label: "Media" },
  { value: "low",    label: "Baja"  },
];

const CONFIDENCE_OPTIONS = [
  { value: "high",   label: "Alta"  },
  { value: "medium", label: "Media" },
  { value: "low",    label: "Baja"  },
];

const STATUS_OPTIONS = [
  { value: "pendiente",   label: "Pendiente"    },
  { value: "en-progreso", label: "En progreso"  },
  { value: "completada",  label: "Completada"   },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function CreateDiagnosticActionModal({
  open, recommendation, onClose, onCreated,
}) {
  const [form, setForm] = React.useState(() => buildInitial(recommendation));
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setForm(buildInitial(recommendation));
      setError("");
    }
  }, [open, recommendation]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!form.title.trim()) {
      setError("El título de la acción es obligatorio.");
      return;
    }
    const action = {
      id: uid("act"),
      title: form.title.trim(),
      area: form.area.trim(),
      source: form.source.trim(),
      priority: form.priority,
      confidence: form.confidence,
      expectedImpact: form.expectedImpact.trim(),
      status: form.status,
      responsible: form.responsible.trim(),
      dueDate: form.dueDate,
      description: form.description.trim(),
      notes: form.notes.trim(),
      recommendationId: recommendation?.id || null,
      createdAt: new Date().toISOString(),
      origin: "diagnostico-inteligente",
    };
    appendItem(KEYS.actions, action);
    onCreated?.(action);
  }

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={ClipboardEdit}
      title="Crear acción correctiva"
      subtitle="Convertir esta recomendación de IA en una acción rastreable."
      width={620}
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cancelar</ModalSecondaryBtn>
          <ModalPrimaryBtn onClick={handleSave}>Guardar acción</ModalPrimaryBtn>
        </>
      }
    >
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px", marginBottom: 12, borderRadius: 8,
          background: "rgba(239,68,68,.08)",
          border: "1px solid rgba(239,68,68,.35)",
          color: "#EF4444",
          fontFamily: fb, fontSize: 12, fontWeight: 600,
        }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <Row>
        <Field label="Título de la acción" required>
          <TextInput
            value={form.title}
            onChange={e => update("title", e.target.value)}
            placeholder="Ej. Revisar equipos del Centro de Cómputo 1"
          />
        </Field>
      </Row>

      <Row two>
        <Field label="Área relacionada">
          <TextInput
            value={form.area}
            onChange={e => update("area", e.target.value)}
            placeholder="Ej. Centro de Cómputo 1"
          />
        </Field>
        <Field label="Fuente de emisión">
          <TextInput
            value={form.source}
            onChange={e => update("source", e.target.value)}
            placeholder="Ej. Electricidad"
          />
        </Field>
      </Row>

      <Row three>
        <Field label="Prioridad">
          <SelectInput
            value={form.priority}
            onChange={e => update("priority", e.target.value)}
            options={PRIORITY_OPTIONS}
          />
        </Field>
        <Field label="Confianza">
          <SelectInput
            value={form.confidence}
            onChange={e => update("confidence", e.target.value)}
            options={CONFIDENCE_OPTIONS}
          />
        </Field>
        <Field label="Estado">
          <SelectInput
            value={form.status}
            onChange={e => update("status", e.target.value)}
            options={STATUS_OPTIONS}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Impacto esperado">
          <TextInput
            value={form.expectedImpact}
            onChange={e => update("expectedImpact", e.target.value)}
            placeholder="Ej. Reducción aproximada de 0.8 tCO₂e"
          />
        </Field>
      </Row>

      <Row two>
        <Field label="Responsable">
          <TextInput
            value={form.responsible}
            onChange={e => update("responsible", e.target.value)}
            placeholder="Nombre o equipo responsable"
          />
        </Field>
        <Field label="Fecha límite">
          <DateInput
            value={form.dueDate}
            onChange={e => update("dueDate", e.target.value)}
            min={todayISO()}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Descripción">
          <TextArea
            value={form.description}
            onChange={e => update("description", e.target.value)}
            placeholder="Describe brevemente el alcance de la acción."
            rows={3}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Notas adicionales">
          <TextArea
            value={form.notes}
            onChange={e => update("notes", e.target.value)}
            placeholder="Comentarios opcionales para el responsable."
            rows={2}
          />
        </Field>
      </Row>
    </DiagModalShell>
  );
}

/* ─── Local layout helpers ────────────────────────────────────────────── */
function Row({ children, two, three }) {
  const cols = three ? 3 : two ? 2 : 1;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
      gap: 10, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </div>
  );
}

function buildInitial(rec) {
  return {
    title:           rec?.title           || "",
    area:            rec?.area            || inferAreaFromRec(rec),
    source:          rec?.source          || inferSourceFromRec(rec),
    priority:        rec?.priority        || "medium",
    confidence:      rec?.confidence      || "medium",
    expectedImpact:  rec?.impact           || "",
    status:          "pendiente",
    responsible:     "",
    dueDate:         defaultDueDate(),
    description:     rec?.reason          || "",
    notes:           "",
  };
}

/* Best-effort inference from the recommendation title/reason */
function inferAreaFromRec(rec) {
  if (!rec) return "";
  const text = `${rec.title || ""} ${rec.reason || ""}`.toLowerCase();
  if (text.includes("centro de cómputo")) return "Centro de Cómputo 1";
  if (text.includes("aulas") || text.includes("proyector")) return "Aulas";
  if (text.includes("tractor") || text.includes("agríc")) return "Área de innovación agrícola";
  return "";
}

function inferSourceFromRec(rec) {
  if (!rec) return "";
  const text = `${rec.title || ""} ${rec.reason || ""}`.toLowerCase();
  if (text.includes("eléctric") || text.includes("electricidad") || text.includes("equipos") || text.includes("proyector")) return "Electricidad";
  if (text.includes("combustible") || text.includes("tractor")) return "Combustible";
  return "";
}
