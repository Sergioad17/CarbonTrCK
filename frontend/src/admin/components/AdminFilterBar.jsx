import React from "react";
import { Search, X } from "lucide-react";

const fb = "var(--eco-font-body)";

export default function AdminFilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters = [],
  filterValues = {},
  onFilterChange,
  onClear,
}) {
  const hasFilters = searchValue || Object.values(filterValues).some(v => v && v !== "all");

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
      padding: "12px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        flex: "1 1 200px", minWidth: 180,
        padding: "7px 12px",
        background: "var(--eco-surface, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 8,
      }}>
        <Search size={14} color="var(--eco-text-soft, #94A3B8)" />
        <input
          value={searchValue}
          onChange={e => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            flex: 1, border: "none", outline: "none",
            fontFamily: fb, fontSize: 13,
            color: "var(--eco-text, #1E293B)",
            background: "transparent",
          }}
        />
      </div>

      {/* Filter selects */}
      {filters.map(f => (
        <select
          key={f.key}
          value={filterValues[f.key] ?? "all"}
          onChange={e => onFilterChange?.(f.key, e.target.value)}
          style={{
            padding: "7px 12px", fontFamily: fb, fontSize: 12, fontWeight: 500,
            color: "var(--eco-text, #1E293B)",
            background: "var(--eco-surface, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 8, cursor: "pointer", outline: "none",
          }}
        >
          <option value="all">{f.label}</option>
          {f.options.map(o => (
            <option key={typeof o === "string" ? o : o.value}
                    value={typeof o === "string" ? o : o.value}>
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      ))}

      {/* Clear all */}
      {hasFilters && onClear && (
        <button onClick={onClear} style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "6px 12px", borderRadius: 7,
          background: "rgba(239,68,68,.06)",
          border: "1px solid rgba(239,68,68,.15)",
          fontFamily: fb, fontSize: 11.5, fontWeight: 600,
          color: "var(--eco-danger, #DC2626)", cursor: "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.12)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.06)"}
        >
          <X size={12} /> Limpiar
        </button>
      )}
    </div>
  );
}
