import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

export default function AdminDataTable({
  columns = [],
  data = [],
  emptyMessage = "Sin registros",
  onRowClick,
  sortable = false,
  maxHeight,
  compact = false,
}) {
  const [sortCol, setSortCol] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("asc");

  const sorted = React.useMemo(() => {
    if (!sortable || !sortCol) return data;
    const col = columns.find(c => c.key === sortCol);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir, sortable, columns]);

  function handleSort(key) {
    if (!sortable) return;
    if (sortCol === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  }

  const py = compact ? 8 : 11;
  const px = compact ? 14 : 18;

  return (
    <div style={{
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{ overflowX: "auto", maxHeight, overflowY: maxHeight ? "auto" : undefined }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontFamily: fb, fontSize: 13,
        }}>
          <thead>
            <tr style={{
              background: "var(--eco-card-muted, #F8FAFC)",
              borderBottom: "1px solid var(--eco-border, #E2E8F0)",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: `${py}px ${px}px`,
                    textAlign: col.align || "left",
                    fontFamily: fb, fontSize: 11, fontWeight: 600,
                    color: "var(--eco-text-soft, #64748B)",
                    textTransform: "uppercase", letterSpacing: ".05em",
                    cursor: sortable ? "pointer" : "default",
                    userSelect: "none", whiteSpace: "nowrap",
                    width: col.width,
                    minWidth: col.minWidth,
                    borderBottom: "1px solid var(--eco-border, #E2E8F0)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {sortable && (
                      sortCol === col.key
                        ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                        : <ChevronsUpDown size={12} style={{ opacity: .3 }} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: "40px 20px", textAlign: "center",
                  color: "var(--eco-text-soft, #64748B)", fontSize: 13,
                }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : sorted.map((row, ri) => (
              <tr
                key={row.id ?? ri}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: ri < sorted.length - 1 ? "1px solid var(--eco-border, #E2E8F0)" : "none",
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background .12s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: `${py}px ${px}px`,
                    color: "var(--eco-text, #1E293B)",
                    textAlign: col.align || "left",
                    fontFamily: col.mono ? fm : fb,
                    fontSize: 13, whiteSpace: col.nowrap ? "nowrap" : undefined,
                    maxWidth: col.maxWidth, minWidth: col.minWidth, overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
