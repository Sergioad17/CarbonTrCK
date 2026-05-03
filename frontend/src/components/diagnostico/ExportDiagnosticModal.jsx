import React from "react";
import {
  FileDown, FileJson, FileSpreadsheet, Printer, CheckCircle2,
} from "lucide-react";
import DiagModalShell, {
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import { downloadJSON, downloadCSV, AI } from "./helpers";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const SECTIONS = [
  { id: "summary",        label: "Resumen ejecutivo"          },
  { id: "indicators",     label: "Indicadores principales"    },
  { id: "priorities",     label: "Prioridades detectadas"     },
  { id: "anomalies",      label: "Anomalías"                  },
  { id: "predictions",    label: "Predicciones"               },
  { id: "recommendations", label: "Recomendaciones"           },
  { id: "confidence",     label: "Confiabilidad del diagnóstico" },
  { id: "models",         label: "Detalle técnico de modelos" },
];

const FORMATS = [
  { id: "json", label: "JSON",   icon: FileJson,        description: "Datos estructurados para integraciones." },
  { id: "csv",  label: "CSV",    icon: FileSpreadsheet, description: "Hoja de cálculo con datos principales."  },
  { id: "pdf",  label: "PDF",    icon: Printer,         description: "Vista imprimible (ventana del navegador)." },
];

export default function ExportDiagnosticModal({
  open, payload, onClose, onExported,
}) {
  const [selected, setSelected] = React.useState(() => allSelected());
  const [format, setFormat] = React.useState("json");

  React.useEffect(() => {
    if (open) {
      setSelected(allSelected());
      setFormat("json");
    }
  }, [open]);

  function toggle(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function buildPayload() {
    const out = {
      meta: {
        title: "Diagnóstico Inteligente · CarbonTrack",
        exportedAt: new Date().toISOString(),
        format,
      },
    };
    SECTIONS.forEach(s => {
      if (selected[s.id]) out[s.id] = payload?.[s.id] ?? null;
    });
    return out;
  }

  function buildCsvRows(p) {
    /* Flatten the most relevant rows (priorities, anomalies, recommendations) */
    const rows = [];
    if (selected.priorities && Array.isArray(p.priorities)) {
      p.priorities.forEach(it => rows.push({
        section: "Prioridad",
        title: it.title || "",
        area: it.area || "",
        level: it.level || "",
        cause: it.cause || "",
        action: it.action || "",
      }));
    }
    if (selected.anomalies && Array.isArray(p.anomalies)) {
      p.anomalies.forEach(a => rows.push({
        section: "Anomalía",
        title: `${a.source || ""} · ${a.area || ""}`,
        area: a.area || "",
        level: a.level || "",
        cause: `Real ${a.real || ""} vs esperado ${a.expected || ""} (${a.diff || ""})`,
        action: "",
      }));
    }
    if (selected.recommendations && Array.isArray(p.recommendations)) {
      p.recommendations.forEach(r => rows.push({
        section: "Recomendación",
        title: r.title || "",
        area: "",
        level: r.priority || "",
        cause: r.reason || "",
        action: r.impact || "",
      }));
    }
    return rows;
  }

  function handleExport() {
    const data = buildPayload();
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadJSON(`diagnostico-inteligente-${stamp}.json`, data);
    } else if (format === "csv") {
      const rows = buildCsvRows(payload || {});
      if (rows.length === 0) {
        rows.push({ section: "Diagnóstico", title: "Sin secciones tabulares seleccionadas", area: "", level: "", cause: "", action: "" });
      }
      downloadCSV(`diagnostico-inteligente-${stamp}.csv`, rows);
    } else if (format === "pdf") {
      try { window.print(); } catch { /* noop */ }
    }
    onExported?.(format);
  }

  const noneSelected = !Object.values(selected).some(Boolean);

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={FileDown}
      title="Exportar diagnóstico"
      subtitle="Elige las secciones y el formato de salida."
      width={580}
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cancelar</ModalSecondaryBtn>
          <ModalPrimaryBtn onClick={handleExport} disabled={noneSelected}>
            <FileDown size={13} /> Exportar
          </ModalPrimaryBtn>
        </>
      }
    >
      <div style={{
        fontFamily: fb, fontSize: 11, fontWeight: 700,
        color: "var(--eco-text-soft, #64748B)",
        textTransform: "uppercase", letterSpacing: ".05em",
        marginBottom: 8,
      }}>
        Secciones a incluir
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
        gap: 6, marginBottom: 14,
      }}>
        {SECTIONS.map(s => {
          const checked = !!selected[s.id];
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              type="button"
              aria-pressed={checked}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8,
                border: checked ? `1px solid ${AI.primary}` : "1px solid var(--eco-border, #E2E8F0)",
                background: checked ? AI.primarySoft : "var(--eco-card, #fff)",
                color: "var(--eco-text, #1E293B)",
                fontFamily: fb, fontSize: 12.5, fontWeight: checked ? 600 : 500,
                cursor: "pointer", textAlign: "left",
                transition: "all .15s",
              }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 4,
                background: checked ? AI.primary : "transparent",
                border: checked ? `1px solid ${AI.primary}` : "1.5px solid var(--eco-border, #CBD5E1)",
                color: "#fff", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {checked && <CheckCircle2 size={10} />}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{
        fontFamily: fb, fontSize: 11, fontWeight: 700,
        color: "var(--eco-text-soft, #64748B)",
        textTransform: "uppercase", letterSpacing: ".05em",
        marginBottom: 8,
      }}>
        Formato de salida
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0,1fr))",
        gap: 8,
      }}>
        {FORMATS.map(f => {
          const Icon = f.icon;
          const active = format === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              type="button"
              aria-pressed={active}
              style={{
                display: "flex", flexDirection: "column", gap: 4,
                padding: "12px 10px", borderRadius: 10,
                border: active ? `1px solid ${AI.primary}` : "1px solid var(--eco-border, #E2E8F0)",
                background: active ? AI.primarySoft : "var(--eco-card, #fff)",
                cursor: "pointer", textAlign: "left",
                transition: "all .15s",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                color: active ? AI.primary : "var(--eco-text, #1E293B)",
              }}>
                <Icon size={14} />
                <span style={{
                  fontFamily: fd, fontSize: 13, fontWeight: 800,
                }}>
                  {f.label}
                </span>
              </div>
              <div style={{
                fontFamily: fb, fontSize: 11.5, lineHeight: 1.45,
                color: "var(--eco-text-soft, #64748B)",
              }}>
                {f.description}
              </div>
            </button>
          );
        })}
      </div>
    </DiagModalShell>
  );
}

function allSelected() {
  return Object.fromEntries(SECTIONS.map(s => [s.id, true]));
}
