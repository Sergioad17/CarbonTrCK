import { useEffect } from "react";
import {
  X,
  ExternalLink,
  ArrowRight,
  Calendar,
  User,
  FileText,
  Link2,
  Building2,
  Tag,
  Sigma,
  Gauge,
  Activity,
} from "lucide-react";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

function InfoGrid({ items, columns = 2 }) {
  const visibleItems = items.filter((item) => item?.value);
  if (!visibleItems.length) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 10,
      }}
    >
      {visibleItems.map((item) => (
        <div
          key={item.label}
          style={{
            background: "var(--eco-surface)",
            border: "1px solid var(--eco-border)",
            borderRadius: "var(--eco-radius-md)",
            padding: "12px 14px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 6,
              color: "var(--eco-gray-500)",
            }}
          >
            {item.icon}
            <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>
              {item.label}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: item.mono ? fm : fb,
              fontSize: item.compact ? 13 : 14,
              fontWeight: 600,
              color: "var(--eco-gray-800)",
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ tone = "real", label }) {
  const isEstimated = tone === "est";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: "var(--eco-radius-full)",
        fontFamily: fb,
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${isEstimated ? "#FDE68A" : "#BBF7D0"}`,
        background: isEstimated ? "var(--eco-warning-bg)" : "var(--eco-success-bg)",
        color: isEstimated ? "var(--eco-secondary-600)" : "var(--eco-success)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Section({ title, children }) {
  if (!children) return null;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h4 style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{title}</h4>
      {children}
    </section>
  );
}

export default function RecentActivityDetailSheet({
  open,
  detail,
  onClose,
  onNavigateToRecord,
  onNavigateToModule,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !detail) return null;

  const summaryItems = [
    { label: "Área", value: detail.area, icon: <Building2 size={13} /> },
    { label: "Categoría", value: detail.categoryLabel, icon: <Tag size={13} /> },
    { label: "Scope", value: detail.scopeLabel, icon: <Sigma size={13} /> },
    { label: "Periodo", value: detail.periodLabel, icon: <Calendar size={13} /> },
  ];

  const metricItems = [
    { label: "Valor capturado", value: detail.valueDisplay, icon: <Activity size={13} />, mono: true },
    { label: "Unidad", value: detail.unitLabel, icon: <Gauge size={13} />, mono: true },
    { label: "Factor aplicado", value: detail.factorDisplay, icon: <Sigma size={13} />, mono: true, compact: true },
    { label: "Resultado", value: detail.resultDisplay, icon: <FileText size={13} />, mono: true },
  ];

  const traceItems = [
    { label: "Registró", value: detail.by, icon: <User size={13} /> },
    { label: "Fecha del registro", value: detail.recordedAtLabel, icon: <Calendar size={13} /> },
    { label: "Última actualización", value: detail.updatedAtLabel, icon: <Calendar size={13} /> },
    { label: "Estado", value: detail.stateLabel, icon: <Tag size={13} /> },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        justifyContent: "flex-end",
        animation: "eco-fadeIn 0.18s ease-out",
      }}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.42)",
          backdropFilter: "blur(3px)",
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de actividad reciente"
        style={{
          position: "relative",
          width: "min(560px, 100vw)",
          height: "100vh",
          background: "var(--eco-surface, white)",
          borderLeft: "1px solid var(--eco-border)",
          boxShadow: "var(--eco-shadow-lg)",
          display: "flex",
          flexDirection: "column",
          animation: "eco-fadeInUp 0.22s cubic-bezier(0.33,1,0.68,1)",
        }}
      >
        <div
          style={{
            padding: "18px 20px 16px",
            borderBottom: "1px solid var(--eco-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <StatusBadge tone={detail.status} label={detail.typeLabel} />
              {detail.sourceLabel ? (
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--eco-radius-full)",
                    border: "1px solid var(--eco-border)",
                    background: "var(--eco-surface)",
                    color: "var(--eco-gray-600)",
                    fontFamily: fb,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {detail.sourceLabel}
                </span>
              ) : null}
            </div>
            <h3 style={{ margin: 0, fontFamily: fd, fontSize: 20, fontWeight: 800, color: "var(--eco-gray-900)", lineHeight: 1.2 }}>
              {detail.title}
            </h3>
            {detail.subtitle ? (
              <p style={{ margin: "8px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", lineHeight: 1.5 }}>
                {detail.subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            autoFocus
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--eco-radius-md)",
              border: "1px solid var(--eco-border)",
              background: "var(--eco-surface)",
              color: "var(--eco-gray-500)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          <Section title="Resumen">
            <InfoGrid items={summaryItems} />
          </Section>

          <Section title="Datos del registro">
            <InfoGrid items={metricItems} />
          </Section>

          <Section title="Trazabilidad">
            <InfoGrid items={traceItems} />
          </Section>

          {detail.notes ? (
            <Section title="Observaciones">
              <div
                style={{
                  background: "var(--eco-surface)",
                  border: "1px solid var(--eco-border)",
                  borderRadius: "var(--eco-radius-md)",
                  padding: "14px 16px",
                }}
              >
                <p style={{ margin: 0, fontFamily: fb, fontSize: 13, lineHeight: 1.7, color: "var(--eco-gray-700)", whiteSpace: "pre-wrap" }}>
                  {detail.notes}
                </p>
              </div>
            </Section>
          ) : null}

          {(detail.evidenceLabel || detail.relatedGoalLabel) ? (
            <Section title="Vínculos y evidencia">
              <InfoGrid
                items={[
                  { label: "Evidencia", value: detail.evidenceLabel, icon: <FileText size={13} />, compact: true },
                  { label: "Meta relacionada", value: detail.relatedGoalLabel, icon: <Link2 size={13} />, compact: true },
                ]}
              />
            </Section>
          ) : null}
        </div>

        <div
          style={{
            padding: 20,
            borderTop: "1px solid var(--eco-border)",
            background: "var(--eco-surface)",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onNavigateToRecord}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: "var(--eco-radius-md)",
              border: "1px solid var(--eco-border)",
              background: "var(--eco-surface, white)",
              color: "var(--eco-gray-700)",
              fontFamily: fb,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ExternalLink size={14} />
            Ver registro completo
          </button>

          <button
            type="button"
            onClick={onNavigateToModule}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: "var(--eco-radius-md)",
              border: "1px solid rgba(34,197,94,0.18)",
              background: "var(--eco-primary-500)",
              color: "white",
              fontFamily: fb,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowRight size={14} />
            {detail.moduleActionLabel}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: "var(--eco-radius-md)",
              border: "1px solid var(--eco-border)",
              background: "var(--eco-surface, white)",
              color: "var(--eco-gray-600)",
              fontFamily: fb,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </aside>
    </div>
  );
}
