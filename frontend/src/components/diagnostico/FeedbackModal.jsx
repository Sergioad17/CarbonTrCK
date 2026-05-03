import React from "react";
import { ThumbsDown, MessageSquare } from "lucide-react";
import DiagModalShell, {
  FieldLabel, TextArea,
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import { uid, appendItem, KEYS, AI } from "./helpers";

const fb = "var(--eco-font-body)";

const REASONS = [
  { id: "no_aplica",   label: "No aplica al área."          },
  { id: "dato_incorrecto", label: "El dato parece incorrecto."  },
  { id: "ya_realizado", label: "Ya se realizó esta acción." },
  { id: "no_prioridad", label: "No es prioridad."            },
  { id: "otro",        label: "Otro motivo."                  },
];

export default function FeedbackModal({
  open, recommendation, onClose, onSaved,
}) {
  const [reason, setReason] = React.useState(REASONS[0].id);
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setReason(REASONS[0].id);
      setComment("");
    }
  }, [open]);

  function handleSave() {
    const fb_item = {
      id: uid("fb"),
      recommendationId: recommendation?.id || null,
      type: "not_useful",
      reason,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    appendItem(KEYS.feedback, fb_item);
    onSaved?.(fb_item);
  }

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={ThumbsDown}
      title="¿Por qué esta recomendación no fue útil?"
      subtitle="Tu retroalimentación ayuda a mejorar las próximas recomendaciones de la IA."
      width={520}
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cancelar</ModalSecondaryBtn>
          <ModalPrimaryBtn onClick={handleSave}>Enviar retroalimentación</ModalPrimaryBtn>
        </>
      }
    >
      {recommendation?.title && (
        <div style={{
          marginBottom: 14, padding: 10, borderRadius: 9,
          background: AI.primarySoft,
          border: `1px solid ${AI.primaryBorder}`,
          fontFamily: fb, fontSize: 12.5,
          color: "var(--eco-text, #1E293B)",
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: AI.primary,
            textTransform: "uppercase", letterSpacing: ".05em",
            marginBottom: 3,
          }}>
            Recomendación
          </div>
          {recommendation.title}
        </div>
      )}

      <FieldLabel>Motivo</FieldLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {REASONS.map(r => (
          <ReasonRadio
            key={r.id}
            id={r.id}
            label={r.label}
            checked={reason === r.id}
            onChange={() => setReason(r.id)}
          />
        ))}
      </div>

      <FieldLabel>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <MessageSquare size={11} /> Comentario (opcional)
        </span>
      </FieldLabel>
      <TextArea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Cuéntanos brevemente por qué la recomendación no aplica."
        rows={3}
      />
    </DiagModalShell>
  );
}

function ReasonRadio({ id, label, checked, onChange }) {
  return (
    <label
      htmlFor={`feedback-reason-${id}`}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 12px", borderRadius: 9,
        border: checked ? `1px solid ${AI.primary}` : "1px solid var(--eco-border, #E2E8F0)",
        background: checked ? AI.primarySoft : "var(--eco-card, #fff)",
        cursor: "pointer",
        fontFamily: fb, fontSize: 13,
        color: checked ? "var(--eco-text-strong, #0F172A)" : "var(--eco-text, #1E293B)",
        fontWeight: checked ? 600 : 500,
        transition: "all .15s",
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: "50%",
        border: checked ? `5px solid ${AI.primary}` : "1.5px solid var(--eco-border, #CBD5E1)",
        background: "transparent",
        display: "inline-block",
        flexShrink: 0,
        transition: "all .15s",
      }} />
      <input
        id={`feedback-reason-${id}`}
        type="radio"
        name="feedback-reason"
        value={id}
        checked={checked}
        onChange={onChange}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      {label}
    </label>
  );
}
