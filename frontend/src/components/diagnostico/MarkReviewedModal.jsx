import React from "react";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import DiagModalShell, {
  FieldLabel, TextArea,
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import { saveToStorage, KEYS, AI } from "./helpers";

const fb = "var(--eco-font-body)";

export default function MarkReviewedModal({
  open, alreadyReviewed, onClose, onConfirmed,
}) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => { if (open) setNote(""); }, [open]);

  function handleConfirm() {
    const payload = {
      reviewed: true,
      reviewedAt: new Date().toISOString(),
      note: note.trim(),
      source: "diagnostico-inteligente",
    };
    saveToStorage(KEYS.diagnosticReview, payload);
    onConfirmed?.(payload);
  }

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={ClipboardCheck}
      title="Marcar diagnóstico como revisado"
      subtitle="Esta acción registrará que el diagnóstico inteligente fue revisado. Podrás seguir viendo la información, pero quedará marcado como atendido."
      width={520}
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cancelar</ModalSecondaryBtn>
          <ModalPrimaryBtn onClick={handleConfirm}>
            <CheckCircle2 size={13} /> Confirmar revisión
          </ModalPrimaryBtn>
        </>
      }
    >
      {alreadyReviewed && (
        <div style={{
          padding: "8px 12px", marginBottom: 12, borderRadius: 8,
          background: AI.primarySoft,
          border: `1px solid ${AI.primaryBorder}`,
          fontFamily: fb, fontSize: 12,
          color: AI.primary, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <CheckCircle2 size={13} />
          Este diagnóstico ya fue marcado como revisado anteriormente. Puedes
          actualizar la nota o confirmar nuevamente.
        </div>
      )}

      <FieldLabel>Nota de revisión (opcional)</FieldLabel>
      <TextArea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Por ejemplo: revisado en sesión semanal del comité ambiental."
        rows={3}
      />
    </DiagModalShell>
  );
}
