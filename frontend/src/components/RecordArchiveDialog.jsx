import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const CONFIRM_WORD = "BAJA";
const MIN_REASON = 12;

const DIALOG_CSS = `
@keyframes archiveOverlayIn{from{opacity:0}to{opacity:1}}
@keyframes archiveSlideUp{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes archiveShake{0%,100%{transform:translateX(0)}15%,45%,75%{transform:translateX(-4px)}30%,60%,90%{transform:translateX(4px)}}
@keyframes archivePulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes archiveCheckIn{0%{transform:scale(0) rotate(-45deg);opacity:0}60%{transform:scale(1.15) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes archiveStepGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}50%{box-shadow:0 0 0 6px rgba(239,68,68,.08)}}
.archive-textarea:focus{border-color:var(--eco-danger)!important;box-shadow:0 0 0 3px rgba(239,68,68,.08)!important}
.archive-confirm-input:focus{border-color:var(--eco-danger)!important;box-shadow:0 0 0 3px rgba(239,68,68,.08)!important}
.archive-btn-cancel:hover{background:var(--eco-gray-50)!important;border-color:var(--eco-gray-300)!important}
.archive-btn-submit:not(:disabled):hover{filter:brightness(1.06);transform:translateY(-1px)}
.archive-btn-submit:not(:disabled):active{transform:translateY(0);filter:brightness(.97)}
`;

function fmtDate(iso) {
  if (!iso) return "-";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtValue(record) {
  const value = Number(record?.value || 0);
  const decimals = record?.unit === "kWh" ? 0 : 1;
  return `${value.toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${record?.unit || ""}`.trim();
}

function fmtEmissions(record) {
  const total = Number(record?.co2e_t || 0);
  return `${total.toLocaleString("es-MX", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} tCO\u2082e`;
}

function StepIndicator({ step, total }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i < step ? 18 : 8,
            height: 4,
            borderRadius: 2,
            background: i < step ? "var(--eco-danger)" : "var(--eco-gray-200)",
            transition: "all .3s cubic-bezier(.4,0,.2,1)",
          }}
        />
      ))}
    </div>
  );
}

function SummaryChip({ label, value, mono }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "8px 0",
      }}
    >
      <span
        style={{
          fontFamily: fb,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--eco-gray-400)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? fm : fb,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--eco-text, var(--eco-gray-800))",
          lineHeight: 1.35,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function RecordArchiveDialog({
  open,
  record,
  permission,
  submitting = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [confirmWord, setConfirmWord] = useState("");
  const [touched, setTouched] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const reasonRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeydown = (event) => {
      if (event.key === "Escape" && !submitting) onClose?.();
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (open && permission?.allowed) {
      const timeout = setTimeout(() => reasonRef.current?.focus(), 350);
      return () => clearTimeout(timeout);
    }
  }, [open, permission?.allowed]);

  useEffect(() => {
    if (!open) {
      setReason("");
      setConfirmWord("");
      setTouched(false);
      setShakeKey(0);
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const reasonFilled = trimmedReason.length >= MIN_REASON;
  const confirmMatches = confirmWord.trim().toUpperCase() === CONFIRM_WORD;
  const canSubmit = permission?.allowed && reasonFilled && confirmMatches;
  const reasonError = touched && !reasonFilled;
  const confirmError = touched && !confirmMatches;

  const currentStep = reasonFilled ? (confirmMatches ? 3 : 2) : 1;

  const summary = useMemo(
    () => [
      { label: "Fecha", value: fmtDate(record?.dateISO) },
      { label: "Area", value: record?.area || "-" },
      { label: "Actividad", value: record?.activity || "-" },
      { label: "Consumo", value: fmtValue(record) },
      { label: "Emisiones", value: fmtEmissions(record), mono: true },
    ],
    [record]
  );

  if (!open || !record) return null;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit || submitting) {
      setShakeKey((prev) => prev + 1);
      return;
    }
    onConfirm?.({
      reason: trimmedReason,
      confirmationWord: confirmWord.trim().toUpperCase(),
    });
  };

  return (
    <>
      <style>{DIALOG_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar baja logica del registro"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 130,
          display: "grid",
          placeItems: "center",
          padding: 16,
        }}
      >
        {/* Overlay */}
        <div
          onClick={() => !submitting && onClose?.()}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: "archiveOverlayIn .22s ease-out",
          }}
        />

        {/* Card */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 520,
            background: "var(--eco-card, #fff)",
            borderRadius: "var(--eco-radius-xl, 20px)",
            border: "1px solid var(--eco-border)",
            boxShadow:
              "0 25px 60px -12px rgba(0,0,0,.18), 0 0 0 1px rgba(239,68,68,.06)",
            overflow: "hidden",
            animation: "archiveSlideUp .32s cubic-bezier(.33,1,.68,1)",
          }}
        >
          {/* Top danger strip */}
          <div
            style={{
              height: 3,
              background: "linear-gradient(90deg, #EF4444 0%, #F97316 50%, #EF4444 100%)",
              backgroundSize: "200% 100%",
              opacity: submitting ? 1 : 0.85,
              animation: submitting ? "archivePulse 1.2s ease-in-out infinite" : "none",
            }}
          />

          {/* Header */}
          <div
            style={{
              padding: "20px 22px 16px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "linear-gradient(145deg, rgba(239,68,68,.12), rgba(239,68,68,.06))",
                  border: "1px solid rgba(239,68,68,.15)",
                  color: "var(--eco-danger, #EF4444)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  animation: "archiveStepGlow 2.5s ease-in-out infinite",
                }}
              >
                <Archive size={20} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: fd,
                      fontSize: 17,
                      fontWeight: 800,
                      color: "var(--eco-text, var(--eco-gray-900))",
                      lineHeight: 1.2,
                    }}
                  >
                    Baja logica del registro
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fb,
                    fontSize: 12.5,
                    color: "var(--eco-gray-500)",
                    lineHeight: 1.55,
                  }}
                >
                  El registro se retira del flujo operativo. Archivos, revisiones y trazabilidad se conservan para auditoria.
                </p>
              </div>
            </div>

            <button
              onClick={() => !submitting && onClose?.()}
              aria-label="Cerrar"
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--eco-radius-md, 10px)",
                border: "1px solid var(--eco-border)",
                background: "var(--eco-surface, transparent)",
                color: "var(--eco-gray-400)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: submitting ? "wait" : "pointer",
                transition: "all .15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (submitting) return;
                e.currentTarget.style.color = "var(--eco-gray-600)";
                e.currentTarget.style.borderColor = "var(--eco-gray-300)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--eco-gray-400)";
                e.currentTarget.style.borderColor = "var(--eco-border)";
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Record summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "2px 14px",
                padding: "12px 14px",
                borderRadius: "var(--eco-radius-lg, 14px)",
                background: "var(--eco-surface, var(--eco-gray-50))",
                border: "1px solid var(--eco-border)",
              }}
            >
              {summary.map((item) => (
                <SummaryChip key={item.label} label={item.label} value={item.value} mono={item.mono} />
              ))}
            </div>

            {/* Permission banner */}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "10px 13px",
                borderRadius: "var(--eco-radius-lg, 14px)",
                background: permission?.allowed
                  ? "rgba(239,68,68,.05)"
                  : "rgba(239,68,68,.08)",
                border: `1px solid ${permission?.allowed ? "rgba(239,68,68,.12)" : "rgba(239,68,68,.2)"}`,
                transition: "all .2s ease",
              }}
            >
              {permission?.allowed ? (
                <ShieldCheck size={16} style={{ color: "var(--eco-danger, #EF4444)", flexShrink: 0, opacity: 0.8 }} />
              ) : (
                <Lock size={16} style={{ color: "var(--eco-danger, #EF4444)", flexShrink: 0 }} />
              )}
              <p
                style={{
                  margin: 0,
                  fontFamily: fb,
                  fontSize: 12,
                  color: permission?.allowed ? "var(--eco-gray-600)" : "var(--eco-danger, #EF4444)",
                  lineHeight: 1.5,
                  fontWeight: permission?.allowed ? 400 : 600,
                }}
              >
                {permission?.allowed
                  ? "Esta operacion queda registrada en la auditoria del sistema."
                  : (permission?.message || "Solo administradores y capturistas pueden dar de baja registros.")}
              </p>
            </div>

            {/* Step progress */}
            {permission?.allowed && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontFamily: fb,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--eco-gray-400)",
                  }}
                >
                  Paso {currentStep} de 3
                </span>
                <StepIndicator step={currentStep} total={3} />
              </div>
            )}

            {/* Reason textarea */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="archive-reason"
                style={{
                  fontFamily: fb,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--eco-text, var(--eco-gray-700))",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Fingerprint size={12} style={{ color: "var(--eco-gray-400)", opacity: 0.7 }} />
                Motivo de baja
                <span style={{ color: "var(--eco-danger)" }}>*</span>
              </label>
              <textarea
                ref={reasonRef}
                id="archive-reason"
                className="archive-textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe por que este registro debe darse de baja. Ej: captura duplicada del recibo de marzo, error en monto de consumo..."
                rows={3}
                disabled={!permission?.allowed || submitting}
                style={{
                  width: "100%",
                  resize: "vertical",
                  minHeight: 80,
                  maxHeight: 160,
                  borderRadius: "var(--eco-radius-md, 10px)",
                  border: `1.5px solid ${reasonError ? "var(--eco-danger)" : "var(--eco-border)"}`,
                  padding: "10px 12px",
                  fontFamily: fb,
                  fontSize: 13,
                  color: "var(--eco-text, var(--eco-gray-700))",
                  outline: "none",
                  background: permission?.allowed ? "var(--eco-card, #fff)" : "var(--eco-gray-50)",
                  transition: "border-color .2s ease, box-shadow .2s ease",
                  lineHeight: 1.55,
                  boxSizing: "border-box",
                  animation: reasonError && touched ? `archiveShake .4s ease ${shakeKey}` : "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontFamily: fb,
                    fontSize: 11,
                    color: reasonError ? "var(--eco-danger)" : "var(--eco-gray-400)",
                    transition: "color .2s ease",
                  }}
                >
                  {reasonError
                    ? "El motivo debe tener al menos 12 caracteres."
                    : "Este motivo se incluye en el registro de auditoria."}
                </span>
                <span
                  style={{
                    fontFamily: fm,
                    fontSize: 10,
                    color: reasonFilled ? "var(--eco-primary-600, #16A34A)" : "var(--eco-gray-400)",
                    fontWeight: reasonFilled ? 600 : 400,
                    transition: "color .2s ease",
                  }}
                >
                  {trimmedReason.length}/{MIN_REASON}
                </span>
              </div>
            </div>

            {/* Confirm word input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="archive-confirm"
                style={{
                  fontFamily: fb,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--eco-text, var(--eco-gray-700))",
                }}
              >
                Escribe{" "}
                <code
                  style={{
                    fontFamily: fm,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(239,68,68,.08)",
                    color: "var(--eco-danger, #EF4444)",
                    border: "1px solid rgba(239,68,68,.12)",
                    letterSpacing: ".08em",
                  }}
                >
                  {CONFIRM_WORD}
                </code>{" "}
                para confirmar
              </label>
              <div style={{ position: "relative" }}>
                <input
                  ref={confirmRef}
                  id="archive-confirm"
                  className="archive-confirm-input"
                  value={confirmWord}
                  onChange={(event) => setConfirmWord(event.target.value)}
                  disabled={!permission?.allowed || submitting}
                  placeholder={CONFIRM_WORD}
                  autoComplete="off"
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: "var(--eco-radius-md, 10px)",
                    border: `1.5px solid ${confirmError ? "var(--eco-danger)" : confirmMatches && confirmWord ? "var(--eco-primary-400, #4ADE80)" : "var(--eco-border)"}`,
                    padding: "0 36px 0 12px",
                    fontFamily: fm,
                    fontSize: 14,
                    letterSpacing: ".12em",
                    color: "var(--eco-text, var(--eco-gray-800))",
                    background: permission?.allowed ? "var(--eco-card, #fff)" : "var(--eco-gray-50)",
                    outline: "none",
                    transition: "border-color .2s ease, box-shadow .2s ease",
                    boxSizing: "border-box",
                    animation: confirmError && touched ? `archiveShake .4s ease ${shakeKey}` : "none",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
                {confirmMatches && confirmWord && (
                  <CheckCircle2
                    size={16}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--eco-primary-500, #22C55E)",
                      animation: "archiveCheckIn .35s cubic-bezier(.34,1.56,.64,1)",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontFamily: fb,
                  fontSize: 11,
                  color: confirmError ? "var(--eco-danger)" : "var(--eco-gray-400)",
                  transition: "color .2s ease",
                }}
              >
                {confirmError
                  ? "La palabra de confirmacion no coincide."
                  : "Revisiones, archivos y trazabilidad se conservan intactos."}
              </span>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                paddingTop: 6,
                borderTop: "1px solid var(--eco-border)",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--eco-gray-400)",
                  flex: "1 1 200px",
                  minWidth: 0,
                }}
              >
                <Clock size={12} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontFamily: fb,
                    fontSize: 11,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Baja logica — no elimina datos fisicamente
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  className="archive-btn-cancel"
                  onClick={() => !submitting && onClose?.()}
                  style={{
                    height: 38,
                    padding: "0 14px",
                    borderRadius: "var(--eco-radius-md, 10px)",
                    border: "1px solid var(--eco-border)",
                    background: "var(--eco-card, #fff)",
                    color: "var(--eco-text, var(--eco-gray-700))",
                    fontFamily: fb,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitting ? "wait" : "pointer",
                    transition: "all .15s ease",
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="archive-btn-submit"
                  onClick={handleSubmit}
                  disabled={!permission?.allowed || submitting}
                  style={{
                    height: 38,
                    padding: "0 18px",
                    borderRadius: "var(--eco-radius-md, 10px)",
                    border: "none",
                    background:
                      canSubmit && !submitting
                        ? "linear-gradient(135deg, #EF4444, #DC2626)"
                        : "var(--eco-gray-200, #E5E7EB)",
                    color: canSubmit && !submitting ? "#fff" : "var(--eco-gray-400)",
                    fontFamily: fb,
                    fontSize: 13,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    cursor: !permission?.allowed || submitting ? "not-allowed" : "pointer",
                    boxShadow:
                      canSubmit && !submitting ? "0 8px 20px -8px rgba(220,38,38,.5)" : "none",
                    transition: "all .2s cubic-bezier(.4,0,.2,1)",
                    opacity: submitting ? 0.85 : 1,
                  }}
                >
                  {submitting ? (
                    <Loader2
                      size={14}
                      style={{ animation: "eco-spin 0.8s linear infinite" }}
                    />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                  {submitting ? "Procesando..." : "Confirmar baja"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
