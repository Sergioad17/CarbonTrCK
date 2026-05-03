import React from "react";
import { X } from "lucide-react";
import { AI } from "./helpers";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const SHELL_CSS = `
@keyframes diagModalFadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes diagModalScaleIn { from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(.985); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes diagDrawerSlide  { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
.diag-modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(15,23,42,.55);
  backdrop-filter: blur(4px);
  animation: diagModalFadeIn .18s ease-out both;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.diag-modal-card {
  position: fixed; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  background: var(--eco-card, #fff);
  color: var(--eco-text, #1E293B);
  border-radius: 16px;
  border: 1px solid ${AI.primaryBorder};
  box-shadow: 0 30px 80px -20px ${AI.glow}, 0 8px 30px rgba(15,23,42,.18);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 40px);
  width: 100%;
  animation: diagModalScaleIn .2s cubic-bezier(.33,1,.68,1) both;
  overflow: hidden;
}
.diag-modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  flex: 1; min-height: 0;
}
.diag-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--eco-border, #E2E8F0);
  display: flex; gap: 8px; justify-content: flex-end;
  flex-shrink: 0;
  background: var(--eco-card-muted, #F8FAFC);
}
.diag-drawer-card {
  position: fixed; right: 0; top: 0; bottom: 0;
  background: var(--eco-card, #fff);
  color: var(--eco-text, #1E293B);
  border-left: 1px solid ${AI.primaryBorder};
  box-shadow: -16px 0 40px -16px ${AI.glow};
  display: flex; flex-direction: column;
  width: 100%;
  max-width: 720px;
  animation: diagDrawerSlide .25s cubic-bezier(.33,1,.68,1) both;
}
@media (max-width: 640px) {
  .diag-modal-card { width: calc(100vw - 24px) !important; max-height: calc(100vh - 24px); }
  .diag-modal-body { padding: 14px 16px; }
  .diag-modal-footer { padding: 10px 16px; flex-wrap: wrap; }
}
`;

let _cssInjected = false;
function ensureCss() {
  if (_cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.setAttribute("data-diag-shell", "1");
  s.textContent = SHELL_CSS;
  document.head.appendChild(s);
  _cssInjected = true;
}

/* ─── Generic modal shell ─────────────────────────────────────────────── */
export default function DiagModalShell({
  open,
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  footer,
  width = 560,
  closeOnBackdrop = true,
  variant = "modal", // "modal" | "drawer"
}) {
  ensureCss();

  React.useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const isDrawer = variant === "drawer";

  return (
    <div
      className="diag-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) onClose?.();
      }}
      role="presentation"
    >
      <div
        className={isDrawer ? "diag-drawer-card" : "diag-modal-card"}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Diálogo"}
        style={isDrawer ? {} : { width: width, maxWidth: "calc(100vw - 40px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid var(--eco-border, #E2E8F0)",
          background: `linear-gradient(135deg, ${AI.primarySoft}, transparent)`,
          flexShrink: 0,
        }}>
          {Icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: AI.primarySoft,
              border: `1px solid ${AI.primaryBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px -6px ${AI.glow}`,
            }}>
              <Icon size={17} color={AI.primary} strokeWidth={2} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: fd, fontSize: 16, fontWeight: 800,
              color: "var(--eco-text-strong, #0F172A)",
              lineHeight: 1.25,
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{
                fontFamily: fb, fontSize: 12.5, lineHeight: 1.5,
                color: "var(--eco-text-soft, #64748B)",
                marginTop: 3,
              }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar diálogo"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--eco-border, #E2E8F0)",
              color: "var(--eco-text-soft, #64748B)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, transition: "all .15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = AI.primarySoft;
              e.currentTarget.style.borderColor = AI.primaryBorder;
              e.currentTarget.style.color = AI.primary;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
              e.currentTarget.style.color = "var(--eco-text-soft, #64748B)";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="diag-modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="diag-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable form fields & buttons (purple-themed) ──────────────────── */
const inputBase = {
  width: "100%",
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--eco-border, #E2E8F0)",
  padding: "0 12px",
  outline: "none",
  fontFamily: fb,
  fontSize: 13,
  color: "var(--eco-text, #1E293B)",
  background: "var(--eco-card, #fff)",
  transition: "border-color .15s, box-shadow .15s",
};

function focusOn(e) {
  e.currentTarget.style.borderColor = AI.primary;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${AI.primarySoft}`;
}
function focusOff(e) {
  e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
  e.currentTarget.style.boxShadow = "none";
}

export function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: "block", marginBottom: 4,
      fontFamily: fb, fontSize: 11.5, fontWeight: 700,
      color: "var(--eco-text-soft, #64748B)",
      textTransform: "uppercase", letterSpacing: ".05em",
    }}>
      {children}
      {required && <span style={{ color: "#EF4444", marginLeft: 4 }}>*</span>}
    </label>
  );
}

export function TextInput(props) {
  const { style, ...rest } = props;
  return (
    <input
      type="text"
      {...rest}
      onFocus={focusOn}
      onBlur={focusOff}
      style={{ ...inputBase, ...style }}
    />
  );
}

export function DateInput(props) {
  const { style, ...rest } = props;
  return (
    <input
      type="date"
      {...rest}
      onFocus={focusOn}
      onBlur={focusOff}
      style={{ ...inputBase, ...style }}
    />
  );
}

export function SelectInput({ options = [], style, ...rest }) {
  return (
    <select
      {...rest}
      onFocus={focusOn}
      onBlur={focusOff}
      style={{
        ...inputBase,
        appearance: "none",
        backgroundImage:
          "linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 16px) 50%, calc(100% - 12px) 50%",
        backgroundSize: "4px 4px, 4px 4px",
        backgroundRepeat: "no-repeat",
        paddingRight: 28,
        cursor: "pointer",
        ...style,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function TextArea({ style, ...rest }) {
  return (
    <textarea
      {...rest}
      onFocus={focusOn}
      onBlur={focusOff}
      style={{
        ...inputBase,
        height: "auto",
        minHeight: 76,
        padding: 10,
        lineHeight: 1.5,
        resize: "vertical",
        ...style,
      }}
    />
  );
}

export function ModalPrimaryBtn({ children, onClick, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 9, border: "none",
        background: disabled ? "var(--eco-gray-300, #CBD5E1)" : AI.primary,
        color: "#fff",
        fontFamily: fb, fontSize: 12.5, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 6px 18px -8px ${AI.glow}`,
        transition: "all .15s",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = AI.primaryDeep; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = AI.primary; }}
    >
      {children}
    </button>
  );
}

export function ModalSecondaryBtn({ children, onClick, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 13px", borderRadius: 9,
        border: "1px solid var(--eco-border, #E2E8F0)",
        background: "var(--eco-card, #fff)",
        color: "var(--eco-text, #1E293B)",
        fontFamily: fb, fontSize: 12.5, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1,
        transition: "all .15s",
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)";
        e.currentTarget.style.borderColor = AI.primaryBorder;
      }}
      onMouseLeave={e => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--eco-card, #fff)";
        e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
      }}
    >
      {children}
    </button>
  );
}

export function ModalDangerBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 13px", borderRadius: 9,
        border: "1px solid rgba(239,68,68,.35)",
        background: "rgba(239,68,68,.08)",
        color: "#EF4444",
        fontFamily: fb, fontSize: 12.5, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1,
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}
