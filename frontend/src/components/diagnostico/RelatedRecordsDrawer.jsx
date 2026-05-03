import React from "react";
import { Database, Zap, Flame, Activity, Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DiagModalShell, {
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import { safeParseArray, KEYS, AI, RISK, formatDate } from "./helpers";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const DEMO_RECORDS = [
  { id: "d1", date: "2026-04-18", area: "Centro de Cómputo 1", source: "Electricidad", type: "Real",      emissions: 1.8, status: "anomaly", diff: "+34%" },
  { id: "d2", date: "2026-04-21", area: "Área de innovación agrícola", source: "Combustible", type: "Real",      emissions: 0.9, status: "anomaly", diff: "+25%" },
  { id: "d3", date: "2026-04-24", area: "Taller de redes", source: "Electricidad", type: "Real",      emissions: 1.4, status: "anomaly", diff: "+28%" },
  { id: "d4", date: "2026-04-12", area: "Aulas",               source: "Electricidad", type: "Estimado",  emissions: 0.7, status: "ok",      diff: "—"   },
  { id: "d5", date: "2026-04-10", area: "Centro de Cómputo 1", source: "Electricidad", type: "Real",      emissions: 1.3, status: "ok",      diff: "+8%"  },
  { id: "d6", date: "2026-04-08", area: "Aulas",               source: "Electricidad", type: "Estimado",  emissions: 0.5, status: "ok",      diff: "—"   },
  { id: "d7", date: "2026-04-05", area: "Área de innovación agrícola", source: "Combustible", type: "Real",      emissions: 0.6, status: "ok",      diff: "+5%"  },
  { id: "d8", date: "2026-04-03", area: "Centro de Cómputo 1", source: "Electricidad", type: "Real",      emissions: 1.25, status: "ok",     diff: "+5%"  },
];

const FILTERS = [
  { id: "all",        label: "Todos"        },
  { id: "elec",       label: "Electricidad" },
  { id: "fuel",       label: "Combustible"  },
  { id: "estimated",  label: "Estimados"    },
  { id: "anomaly",    label: "Anomalías"    },
];

/**
 * @param scope "all" | "rec" — when "rec", filters to records linked to the given recommendation
 */
export default function RelatedRecordsDrawer({
  open, scope = "all", recommendation, onClose,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => { if (open) setFilter("all"); }, [open]);

  /* Try real records, fall back to demo */
  const { records, isDemo } = React.useMemo(() => {
    const real = safeParseArray(KEYS.records);
    if (Array.isArray(real) && real.length) {
      return { records: normalizeReal(real), isDemo: false };
    }
    return { records: DEMO_RECORDS, isDemo: true };
  }, [open]);

  /* Scope filter (recommendation context) */
  const scoped = React.useMemo(() => {
    if (scope !== "rec" || !recommendation) return records;
    const text = `${recommendation.title || ""} ${recommendation.reason || ""}`.toLowerCase();
    return records.filter(r => {
      const area = (r.area || "").toLowerCase();
      const src  = (r.source || "").toLowerCase();
      if (text.includes("centro de cómputo") && area.includes("centro de cómputo")) return true;
      if (text.includes("aulas") && area.includes("aulas")) return true;
      if (text.includes("tractor") && area.includes("agríc")) return true;
      if ((text.includes("eléctric") || text.includes("electricidad") || text.includes("proyector")) && src.includes("electric")) return true;
      if ((text.includes("combustible") || text.includes("tractor")) && src.includes("combust")) return true;
      if (text.includes("estimad") && r.type === "Estimado") return true;
      return false;
    });
  }, [records, scope, recommendation]);

  /* Filter chips */
  const visible = React.useMemo(() => {
    return scoped.filter(r => {
      if (filter === "all") return true;
      if (filter === "elec") return (r.source || "").toLowerCase().includes("electric");
      if (filter === "fuel") return (r.source || "").toLowerCase().includes("combust");
      if (filter === "estimated") return r.type === "Estimado";
      if (filter === "anomaly") return r.status === "anomaly";
      return true;
    });
  }, [scoped, filter]);

  function handleGoToEmissions() {
    try {
      navigate("/emisiones");
      onClose?.();
    } catch {
      // eslint-disable-next-line no-console
      console.log("[Diagnóstico] No se pudo navegar a /emisiones");
    }
  }

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={Database}
      variant="drawer"
      title="Registros relacionados"
      subtitle="Estos registros influyeron en el diagnóstico generado por la IA."
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cerrar</ModalSecondaryBtn>
          <ModalPrimaryBtn onClick={handleGoToEmissions}>
            <ArrowRight size={13} /> Ir a Emisiones
          </ModalPrimaryBtn>
        </>
      }
    >
      {isDemo && (
        <div style={{
          padding: "8px 12px", marginBottom: 12, borderRadius: 8,
          background: AI.primarySoft,
          border: `1px solid ${AI.primaryBorder}`,
          fontFamily: fb, fontSize: 12, color: AI.primary, fontWeight: 600,
        }}>
          Datos demo usados para vista previa del diagnóstico.
        </div>
      )}

      {recommendation?.title && scope === "rec" && (
        <div style={{
          padding: "10px 12px", marginBottom: 12, borderRadius: 9,
          background: "var(--eco-card-muted, #F8FAFC)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          fontFamily: fb, fontSize: 12.5,
        }}>
          <div style={{
            fontFamily: fb, fontSize: 10.5, fontWeight: 700,
            color: "var(--eco-text-soft, #64748B)",
            textTransform: "uppercase", letterSpacing: ".05em",
            marginBottom: 3,
          }}>
            Recomendación origen
          </div>
          {recommendation.title}
        </div>
      )}

      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12,
      }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "5px 11px", borderRadius: 999,
                border: active
                  ? `1px solid ${AI.primary}`
                  : "1px solid var(--eco-border, #E2E8F0)",
                background: active ? AI.primarySoft : "var(--eco-card, #fff)",
                color: active ? AI.primary : "var(--eco-text, #1E293B)",
                fontFamily: fb, fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", transition: "all .15s",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Stats summary row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0,1fr))",
        gap: 8, marginBottom: 12,
      }}>
        <SummaryStat icon={Activity} label="Registros" value={visible.length} />
        <SummaryStat icon={Zap}      label="Eléctricos" value={visible.filter(r => (r.source || "").toLowerCase().includes("electric")).length} />
        <SummaryStat icon={Flame}    label="Combustible" value={visible.filter(r => (r.source || "").toLowerCase().includes("combust")).length} />
      </div>

      {visible.length === 0 ? (
        <div style={{
          padding: 24, borderRadius: 11,
          background: "var(--eco-card-muted, #F8FAFC)",
          border: "1px dashed var(--eco-border, #E2E8F0)",
          textAlign: "center",
          fontFamily: fb, fontSize: 12.5,
          color: "var(--eco-text-soft, #64748B)",
        }}>
          <Search size={20} color="var(--eco-text-soft, #94A3B8)" />
          <div style={{ marginTop: 6 }}>
            No hay registros que coincidan con el filtro seleccionado.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse",
            fontFamily: fb, fontSize: 12.5,
          }}>
            <thead>
              <tr style={{
                background: "var(--eco-card-muted, #F8FAFC)",
                color: "var(--eco-text-soft, #64748B)",
                fontFamily: fd, fontSize: 10.5, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>
                <Th>Fecha</Th>
                <Th>Área</Th>
                <Th>Fuente</Th>
                <Th>Tipo</Th>
                <Th>Emisiones</Th>
                <Th>Estado</Th>
                <Th>Diferencia</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr
                  key={r.id}
                  style={{
                    borderTop: "1px solid var(--eco-border, #E2E8F0)",
                    color: "var(--eco-text, #1E293B)",
                  }}
                >
                  <Td>{formatDate(r.date)}</Td>
                  <Td>{r.area || "—"}</Td>
                  <Td>{r.source || "—"}</Td>
                  <Td>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999,
                      background: r.type === "Estimado"
                        ? "rgba(234,179,8,.10)"
                        : "rgba(34,197,94,.10)",
                      color: r.type === "Estimado" ? "#CA8A04" : "#16A34A",
                      fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                    }}>
                      {r.type || "—"}
                    </span>
                  </Td>
                  <Td>{Number.isFinite(Number(r.emissions)) ? `${Number(r.emissions).toFixed(2)} tCO₂e` : "—"}</Td>
                  <Td>
                    {r.status === "anomaly" ? (
                      <span style={{
                        padding: "2px 8px", borderRadius: 999,
                        background: RISK.high.bg,
                        color: RISK.high.color,
                        border: `1px solid ${RISK.high.border}`,
                        fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                      }}>
                        Anomalía
                      </span>
                    ) : (
                      <span style={{
                        padding: "2px 8px", borderRadius: 999,
                        background: RISK.low.bg,
                        color: RISK.low.color,
                        border: `1px solid ${RISK.low.border}`,
                        fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                      }}>
                        Normal
                      </span>
                    )}
                  </Td>
                  <Td style={{
                    color: r.status === "anomaly" ? RISK.high.color : "var(--eco-text, #1E293B)",
                    fontWeight: r.status === "anomaly" ? 700 : 500,
                  }}>
                    {r.diff || "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DiagModalShell>
  );
}

function Th({ children }) {
  return (
    <th style={{
      textAlign: "left", padding: "9px 10px", whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}
function Td({ children, style }) {
  return (
    <td style={{
      padding: "9px 10px", whiteSpace: "nowrap", ...style,
    }}>
      {children}
    </td>
  );
}

function SummaryStat({ icon: Icon, label, value }) {
  return (
    <div style={{
      padding: 10, borderRadius: 9,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: AI.primarySoft, border: `1px solid ${AI.primaryBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={13} color={AI.primary} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: fb, fontSize: 10, fontWeight: 700,
          color: "var(--eco-text-soft, #64748B)",
          textTransform: "uppercase", letterSpacing: ".05em",
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: fd, fontSize: 14, fontWeight: 800,
          color: "var(--eco-text-strong, #0F172A)",
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ─── Normalize possibly-real records to the drawer's row shape ───────── */
function normalizeReal(rows) {
  return rows.map((r, i) => ({
    id: r.id || `r${i}`,
    date: r.dateISO || r.date || "",
    area: r.area || "—",
    source: r.category || r.source || r.fuente || "",
    type: (r.status === "est" || r.isEstimated) ? "Estimado" : "Real",
    emissions: Number(r.co2e_t || r.emissions || 0),
    status: r.anomaly ? "anomaly" : "ok",
    diff: r.diff || "—",
  }));
}
