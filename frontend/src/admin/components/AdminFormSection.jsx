import React from "react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

export function AdminFormSection({ title, description, children, columns = 1 }) {
  return (
    <div style={{
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12, overflow: "hidden",
    }}>
      {title && (
        <div style={{
          padding: "16px 22px 12px",
          borderBottom: "1px solid var(--eco-border, #E2E8F0)",
        }}>
          <div style={{
            fontFamily: fd, fontSize: 14, fontWeight: 700,
            color: "var(--eco-text, #1E293B)",
          }}>
            {title}
          </div>
          {description && (
            <div style={{
              fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #64748B)",
              marginTop: 3,
            }}>
              {description}
            </div>
          )}
        </div>
      )}
      <div style={{
        padding: "18px 22px 22px",
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "16px 20px",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Text Input ───────────────────────────────────────────────────────── */
export function AdminTextField({ label, value, onChange, placeholder, type = "text", disabled, hint, required, multiline, rows = 3 }) {
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: multiline ? "10px 14px" : "8px 14px",
    fontFamily: fb, fontSize: 13,
    color: "var(--eco-text, #1E293B)",
    background: disabled ? "var(--eco-card-muted, #F8FAFC)" : "var(--eco-surface, #fff)",
    border: "1px solid var(--eco-border, #E2E8F0)",
    borderRadius: 8, outline: "none",
    transition: "border-color .15s, box-shadow .15s",
    opacity: disabled ? .6 : 1,
    resize: multiline ? "vertical" : undefined,
  };
  const El = multiline ? "textarea" : "input";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <span style={{
          fontFamily: fb, fontSize: 12, fontWeight: 600,
          color: "var(--eco-text-soft, #64748B)",
          letterSpacing: ".02em",
        }}>
          {label}{required && <span style={{ color: "var(--eco-danger, #DC2626)" }}> *</span>}
        </span>
      )}
      <El
        type={type}
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={multiline ? rows : undefined}
        style={inputStyle}
        onFocus={e => {
          e.target.style.borderColor = "var(--eco-primary-400, #4ADE80)";
          e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.12)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "var(--eco-border, #E2E8F0)";
          e.target.style.boxShadow = "none";
        }}
      />
      {hint && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/* ── Select ───────────────────────────────────────────────────────────── */
export function AdminSelectField({ label, value, onChange, options = [], disabled, hint, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <span style={{
          fontFamily: fb, fontSize: 12, fontWeight: 600,
          color: "var(--eco-text-soft, #64748B)",
          letterSpacing: ".02em",
        }}>
          {label}{required && <span style={{ color: "var(--eco-danger, #DC2626)" }}> *</span>}
        </span>
      )}
      <select
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "8px 14px", fontFamily: fb, fontSize: 13,
          color: "var(--eco-text, #1E293B)",
          background: disabled ? "var(--eco-card-muted, #F8FAFC)" : "var(--eco-surface, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 8, outline: "none",
          transition: "border-color .15s",
          opacity: disabled ? .6 : 1,
          cursor: "pointer",
        }}
        onFocus={e => e.target.style.borderColor = "var(--eco-primary-400, #4ADE80)"}
        onBlur={e => e.target.style.borderColor = "var(--eco-border, #E2E8F0)"}
      >
        {options.map(o => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      {hint && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/* ── Toggle ───────────────────────────────────────────────────────────── */
export function AdminToggleField({ label, checked, onChange, disabled, description }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      opacity: disabled ? .5 : 1,
    }}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: checked ? "var(--eco-primary-500, #22C55E)" : "var(--eco-gray-300, #CBD5E1)",
          border: "none", padding: 2, cursor: disabled ? "not-allowed" : "pointer",
          transition: "background .2s", flexShrink: 0, marginTop: 1,
          position: "relative",
        }}
      >
        <span style={{
          display: "block", width: 18, height: 18, borderRadius: "50%",
          background: "white",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          transition: "transform .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.15)",
        }} />
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {label && (
          <span style={{
            fontFamily: fb, fontSize: 13, fontWeight: 500,
            color: "var(--eco-text, #1E293B)",
          }}>
            {label}
          </span>
        )}
        {description && (
          <span style={{
            fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #94A3B8)",
          }}>
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Chip List (for file types, tags, etc.) ───────────────────────────── */
export function AdminChipList({ label, values = [], onRemove, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <span style={{
          fontFamily: fb, fontSize: 12, fontWeight: 600,
          color: "var(--eco-text-soft, #64748B)",
          letterSpacing: ".02em",
        }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.map(v => (
          <span key={v} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 16,
            background: "rgba(34,197,94,.08)",
            border: "1px solid rgba(34,197,94,.18)",
            fontFamily: "var(--eco-font-mono)", fontSize: 11, fontWeight: 600,
            color: "var(--eco-success, #16A34A)",
          }}>
            .{v}
            {onRemove && (
              <button onClick={() => onRemove(v)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--eco-success, #16A34A)", fontWeight: 700, fontSize: 13, padding: 0, lineHeight: 1,
              }}>×</button>
            )}
          </span>
        ))}
      </div>
      {hint && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/* ── Number Field ─────────────────────────────────────────────────────── */
export function AdminNumberField({ label, value, onChange, min, max, step, unit, disabled, hint, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <span style={{
          fontFamily: fb, fontSize: 12, fontWeight: 600,
          color: "var(--eco-text-soft, #64748B)",
          letterSpacing: ".02em",
        }}>
          {label}{required && <span style={{ color: "var(--eco-danger, #DC2626)" }}> *</span>}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          value={value ?? ""}
          onChange={e => onChange?.(Number(e.target.value))}
          min={min} max={max} step={step}
          disabled={disabled}
          style={{
            width: unit ? "calc(100% - 40px)" : "100%", boxSizing: "border-box",
            padding: "8px 14px",
            fontFamily: "var(--eco-font-mono)", fontSize: 13,
            color: "var(--eco-text, #1E293B)",
            background: disabled ? "var(--eco-card-muted, #F8FAFC)" : "var(--eco-surface, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 8, outline: "none",
            transition: "border-color .15s",
            opacity: disabled ? .6 : 1,
          }}
          onFocus={e => e.target.style.borderColor = "var(--eco-primary-400, #4ADE80)"}
          onBlur={e => e.target.style.borderColor = "var(--eco-border, #E2E8F0)"}
        />
        {unit && (
          <span style={{
            fontFamily: fb, fontSize: 12, fontWeight: 500,
            color: "var(--eco-text-soft, #64748B)", whiteSpace: "nowrap",
          }}>
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
