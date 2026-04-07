import { useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Edit3,
  FileText,
  Layers,
  Leaf,
  PauseCircle,
  PlayCircle,
  Plus,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildTargetLine, filterRecordsByTarget } from "../api/targets";

/* ─── Design tokens ─── */
const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const emptyText = "No disponible";

/* ─── Helpers ─── */
const fmt = (n, d = 1) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const fmtDate = (value) => {
  if (!value) return emptyText;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (value) => {
  if (!value) return emptyText;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

function getStatusConfig(state) {
  if (state === "completed")
    return {
      label: "Completada",
      bg: "var(--eco-success-bg)",
      border: "rgba(34,197,94,.3)",
      color: "var(--eco-success)",
      dot: "#22C55E",
    };
  if (state === "at_risk")
    return {
      label: "En riesgo",
      bg: "var(--eco-warning-bg)",
      border: "rgba(251,191,36,.3)",
      color: "var(--eco-warning)",
      dot: "#F59E0B",
    };
  if (state === "paused")
    return {
      label: "Pausada",
      bg: "var(--eco-card-muted)",
      border: "var(--eco-border)",
      color: "var(--eco-text-soft)",
      dot: "var(--eco-text-soft)",
    };
  return {
    label: "Activa",
    bg: "var(--eco-info-bg)",
    border: "rgba(59,130,246,.3)",
    color: "var(--eco-info)",
    dot: "#3B82F6",
  };
}

const scopeLabel = (v) =>
  v === "scope1" ? "Scope 1" : v === "scope2" ? "Scope 2" : v === "scope3" ? "Scope 3" : "Todos";
const categoryLabel = (v) =>
  v === "electricidad"
    ? "Electricidad"
    : v === "combustible"
      ? "Combustible"
      : v === "otros"
        ? "Otros"
        : "Todas";
const typeLabel = (v) =>
  v === "absolute" ? "Absoluto tCO2e" : "Reducción %";

/* ─── Shared style blocks ─── */
const card = {
  background: "var(--eco-card)",
  border: "1px solid var(--eco-border)",
  borderRadius: "var(--eco-radius-lg)",
  boxShadow: "var(--eco-shadow-sm)",
};

/* ─── Shimmer skeleton primitive ─── */
function Sk({ w, h, r, style }) {
  return (
    <div
      style={{
        width: w || "100%",
        height: h || 14,
        borderRadius: r ?? "var(--eco-radius-md)",
        background:
          "linear-gradient(90deg, var(--eco-border) 25%, var(--eco-surface) 50%, var(--eco-border) 75%)",
        backgroundSize: "200% 100%",
        animation: "eco-shimmer 1.4s ease-in-out infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/* ─── Full-modal skeleton ─── */
function ModalSkeleton() {
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr .95fr", gap: 16 }}>
        {/* Left dark card skeleton */}
        <div
          style={{
            ...card,
            background: "var(--eco-surface)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  background: "var(--eco-card-muted)",
                  border: "1px solid var(--eco-border)",
                  borderRadius: "var(--eco-radius-md)",
                  padding: "12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <Sk w="55%" h={10} style={{ animationDelay: `${i * 60}ms` }} />
                <Sk w="75%" h={14} style={{ animationDelay: `${i * 60 + 30}ms` }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Sk w={80} h={12} />
            <Sk w={40} h={12} />
          </div>
          <Sk h={12} r="var(--eco-radius-full)" />
          <Sk h={200} />
        </div>
        {/* Right side skeletons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <Sk w="40%" h={15} />
            <Sk h={12} style={{ animationDelay: "30ms" }} />
            <Sk h={12} w="85%" style={{ animationDelay: "60ms" }} />
            <Sk h={12} w="70%" style={{ animationDelay: "90ms" }} />
          </div>
          <div style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <Sk w="45%" h={15} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <Sk w="40%" h={12} style={{ animationDelay: `${i * 40}ms` }} />
                <Sk w="30%" h={12} style={{ animationDelay: `${i * 40 + 20}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info additional */}
      <div style={{ ...card, padding: 16 }}>
        <Sk w="35%" h={15} style={{ marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 14px" }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ paddingBottom: 10 }}>
              <Sk h={10} w="60%" style={{ marginBottom: 6, animationDelay: `${i * 30}ms` }} />
              <Sk h={13} w="80%" style={{ animationDelay: `${i * 30 + 15}ms` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Notes grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[0, 1].map((col) => (
          <div key={col} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <Sk w="50%" h={15} style={{ animationDelay: `${col * 100}ms` }} />
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Sk h={10} w="45%" style={{ animationDelay: `${col * 100 + i * 40}ms` }} />
                <Sk h={12} style={{ animationDelay: `${col * 100 + i * 40 + 20}ms` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Custom chart tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--eco-card)",
        border: "1px solid var(--eco-border)",
        borderRadius: "var(--eco-radius-md)",
        padding: "8px 12px",
        boxShadow: "var(--eco-shadow-md)",
      }}
    >
      <p style={{ margin: "0 0 6px", fontFamily: fd, fontSize: 12, fontWeight: 700, color: "var(--eco-text-strong)" }}>
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ margin: "3px 0", fontFamily: fb, fontSize: 11, color: entry.color }}>
          <span style={{ fontWeight: 600 }}>{entry.name}:</span>{" "}
          <span style={{ fontFamily: fm }}>{fmt(entry.value, 3)} tCO2e</span>
        </p>
      ))}
    </div>
  );
}

/* ─── Stat card (top 4 metrics) ─── */
function StatCard({ label, value, accent, delay }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.07)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: "var(--eco-radius-md)",
        padding: "12px 12px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        animation: `eco-fadeInUp .3s ease ${delay}ms both`,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: fb,
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(226,232,240,.65)",
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {label}
      </p>
      <p style={{ margin: 0, fontFamily: fm, fontSize: 15, fontWeight: 800, color: accent || "white" }}>
        {value}
      </p>
    </div>
  );
}

/* ─── Info row inside cards ─── */
function InfoRow({ label, value, mono, delay }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        animation: `eco-fadeIn .25s ease ${delay || 0}ms both`,
      }}
    >
      <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? fm : fb,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--eco-text-strong)",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value || emptyText}
      </span>
    </div>
  );
}

/* ─── Meta info grid item ─── */
function MetaField({ label, value, icon: Icon, delay }) {
  return (
    <div
      style={{
        paddingBottom: 10,
        borderBottom: "1px solid var(--eco-border)",
        animation: `eco-fadeInUp .25s ease ${delay || 0}ms both`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {Icon && <Icon size={11} style={{ color: "var(--eco-text-soft)", flexShrink: 0 }} />}
        <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", lineHeight: 1 }}>
          {label}
        </p>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: fb,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--eco-text-strong)",
          wordBreak: "break-word",
        }}
      >
        {value || emptyText}
      </p>
    </div>
  );
}

/* ─── Action button ─── */
function Btn({ icon: Icon, children, onClick, tone, style: extStyle }) {
  const tones = {
    default: {
      bg: "var(--eco-card)",
      border: "var(--eco-border)",
      color: "var(--eco-text)",
      hoverBg: "var(--eco-card-muted)",
    },
    primary: {
      bg: "var(--eco-primary-500)",
      border: "var(--eco-primary-500)",
      color: "white",
      hoverBg: "var(--eco-primary-600)",
    },
    warning: {
      bg: "var(--eco-warning-bg)",
      border: "rgba(251,191,36,.3)",
      color: "var(--eco-warning)",
      hoverBg: "rgba(251,191,36,.15)",
    },
    danger: {
      bg: "var(--eco-danger-bg)",
      border: "rgba(248,113,113,.3)",
      color: "var(--eco-danger)",
      hoverBg: "rgba(248,113,113,.15)",
    },
  }[tone || "default"];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 16px",
        borderRadius: "var(--eco-radius-md)",
        border: `1px solid ${tones.border}`,
        background: tones.bg,
        color: tones.color,
        fontFamily: fb,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
        ...extStyle,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = tones.hoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = tones.bg; }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function MetaDetailModal({
  target,
  records,
  actions,
  onClose,
  onEdit,
  onTogglePause,
  onDelete,
  onAddAction,
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 340);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const linkedRecords = useMemo(
    () => (target ? filterRecordsByTarget(records, target, "target") : []),
    [records, target]
  );
  const linkedActions = useMemo(
    () => (target ? actions.filter((row) => row.targetId === target.id) : []),
    [actions, target]
  );
  const line = useMemo(
    () => (target ? buildTargetLine(target, records) : []),
    [target, records]
  );

  if (!target) return null;

  const s = target.summary;
  const status = getStatusConfig(s.state);
  const latestRecord =
    linkedRecords
      .slice()
      .sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""))[0] || null;

  const progressPct = Math.max(0, Math.min(100, s.progressPct || 0));
  // CSS variables can't be interpolated inside gradient/shadow strings → use hex
  const progressHex =
    s.state === "completed" ? "#22C55E" : s.state === "at_risk" ? "#F59E0B" : "#16A34A";
  const progressColor =
    s.state === "completed"
      ? "var(--eco-success)"
      : s.state === "at_risk"
        ? "var(--eco-warning)"
        : "var(--eco-primary-500)";

  const chartData =
    line.length
      ? line
      : [{ label: "Sin datos", actual: s.actual, goal: s.targetAbsolute }];

  const infoFields = [
    { label: "Fecha de inicio", value: fmtDate(target.targetStart), icon: Calendar },
    { label: "Fecha límite", value: fmtDate(target.targetEnd), icon: Calendar },
    {
      label: "Última actualización",
      value: fmtDateTime(
        latestRecord?.dateISO ? `${latestRecord.dateISO}T12:00:00` : target.createdAt
      ),
      icon: Calendar,
    },
    { label: "Área", value: target.areaId === "all" ? "Todas las áreas" : target.areaId || emptyText, icon: Layers },
    { label: "Scope", value: scopeLabel(target.scope), icon: Tag },
    { label: "Categoría", value: categoryLabel(target.category), icon: Tag },
    { label: "Tipo de meta", value: typeLabel(target.type), icon: Target },
    { label: "Unidad / Indicador", value: "tCO2e", icon: BarChart2 },
    { label: "Responsable", value: target.createdBy || emptyText, icon: User },
    { label: "Registros vinculados", value: String(linkedRecords.length), icon: FileText },
    {
      label: "Fecha de cumplimiento",
      value:
        s.state === "completed"
          ? fmtDate(latestRecord?.dateISO || target.targetEnd)
          : emptyText,
      icon: CheckCircle2,
    },
    {
      label: "Motivo de pausa",
      value:
        target.status === "paused" && target.pauseReason?.trim()
          ? target.pauseReason.trim()
          : emptyText,
      icon: PauseCircle,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        display: "grid",
        placeItems: "center",
        padding: "20px 14px",
        animation: "eco-fadeIn .18s ease-out",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--eco-overlay)",
          backdropFilter: "blur(5px)",
        }}
      />

      {/* Modal shell */}
      <div
        style={{
          position: "relative",
          width: "min(1020px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "auto",
          background: "var(--eco-card)",
          border: "1px solid var(--eco-border)",
          borderRadius: "var(--eco-radius-xl)",
          boxShadow: "0 32px 64px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.05)",
          animation: "eco-scaleIn .24s cubic-bezier(.34,1.56,.64,1)",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--eco-border) transparent",
        }}
      >
        {/* ─── Sticky header ─── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            padding: "16px 20px",
            borderBottom: "1px solid var(--eco-border)",
            background: "var(--eco-card)",
            backdropFilter: "blur(12px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
            {/* Breadcrumb row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: "var(--eco-radius-full)",
                  background: "var(--eco-primary-50)",
                  border: "1px solid var(--eco-primary-200)",
                  color: "var(--eco-primary-700)",
                  fontFamily: fb,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                <Leaf size={10} />
                Meta de reducción
              </span>
              <ChevronRight size={12} style={{ color: "var(--eco-text-soft)" }} />
              <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                {scopeLabel(target.scope)} · {categoryLabel(target.category)} ·{" "}
                {target.areaId === "all" ? "Todas las áreas" : target.areaId || emptyText}
              </span>
            </div>

            {/* Title + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: fd,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--eco-text-strong)",
                  lineHeight: 1.2,
                }}
              >
                {target.title || "Meta sin nombre"}
              </h3>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: "var(--eco-radius-full)",
                  background: status.bg,
                  border: `1px solid ${status.border}`,
                  color: status.color,
                  fontFamily: fb,
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: status.dot,
                    flexShrink: 0,
                  }}
                />
                {status.label}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--eco-radius-md)",
              border: "1px solid var(--eco-border)",
              background: "var(--eco-card)",
              color: "var(--eco-text-soft)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--eco-danger-bg)";
              e.currentTarget.style.color = "var(--eco-danger)";
              e.currentTarget.style.borderColor = "rgba(248,113,113,.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--eco-card)";
              e.currentTarget.style.color = "var(--eco-text-soft)";
              e.currentTarget.style.borderColor = "var(--eco-border)";
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Body ─── */}
        {!ready ? (
          <ModalSkeleton />
        ) : (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ── TOP GRID: dark card + side cards ── */}
            <div
              className="ct-detail-top"
              style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr", gap: 16 }}
            >
              {/* Dark card: stats + progress + chart */}
              <div
                style={{
                  background: "linear-gradient(160deg, var(--eco-gray-900,#0F172A) 0%, #0a1628 100%)",
                  border: "1px solid rgba(148,163,184,.12)",
                  borderRadius: "var(--eco-radius-lg)",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* 4 stat cards */}
                <div
                  className="ct-detail-summary"
                  style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}
                >
                  <StatCard label="Baseline" value={`${fmt(s.baseline, 3)}`} delay={0} />
                  <StatCard label="Objetivo" value={`${fmt(s.targetAbsolute, 3)}`} delay={50} />
                  <StatCard label="Avance" value={`${fmt(s.actual, 3)}`} accent="#22C55E" delay={100} />
                  <StatCard label="Cumplimiento" value={`${fmt(progressPct, 1)}%`} accent={progressColor} delay={150} />
                </div>

                {/* Progress bar */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fb,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(226,232,240,.75)",
                      }}
                    >
                      Progreso hacia la meta
                    </span>
                    <span
                      style={{
                        fontFamily: fm,
                        fontSize: 11,
                        fontWeight: 800,
                        color: progressColor,
                      }}
                    >
                      {fmt(progressPct, 1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      borderRadius: "var(--eco-radius-full)",
                      background: "rgba(255,255,255,.10)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "var(--eco-radius-full)",
                        background: `linear-gradient(90deg, ${progressHex}, ${progressHex}bb)`,
                        width: `${progressPct}%`,
                        transition: "width .8s cubic-bezier(.4,0,.2,1)",
                        boxShadow: `0 0 8px ${progressHex}66`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 7,
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fb,
                        fontSize: 11,
                        color: "rgba(226,232,240,.55)",
                      }}
                    >
                      {fmt(s.actual, 3)} de {fmt(s.baseline, 3)} tCO2e registradas
                    </span>
                    <span
                      style={{
                        fontFamily: fb,
                        fontSize: 11,
                        color: "rgba(226,232,240,.55)",
                      }}
                    >
                      Reducido:{" "}
                      <span style={{ fontFamily: fm, fontWeight: 700, color: "#22C55E" }}>
                        {fmt(s.avoided, 3)} tCO2e
                      </span>
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(148,163,184,.12)" }} />

                {/* Chart */}
                <div>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontFamily: fd,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(226,232,240,.65)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    Evolución temporal
                  </p>
                  <div
                    style={{
                      height: 200,
                      background: "rgba(255,255,255,.03)",
                      border: "1px solid rgba(148,163,184,.10)",
                      borderRadius: "var(--eco-radius-md)",
                      padding: "8px 8px 2px",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 14, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,.12)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontFamily: fb, fontSize: 10, fill: "#94A3B8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontFamily: fm, fontSize: 10, fill: "#94A3B8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RTooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          name="Real"
                          stroke="#22C55E"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: "#22C55E", stroke: "#0F172A", strokeWidth: 2 }}
                          activeDot={{ r: 5.5, stroke: "#22C55E", strokeWidth: 2, fill: "#0F172A" }}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="goal"
                          name="Objetivo"
                          stroke="#60A5FA"
                          strokeWidth={1.8}
                          strokeDasharray="5 3"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right column: description + quick summary */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Descripción */}
                <div style={{ ...card, padding: 16, flex: "0 0 auto" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--eco-radius-md)",
                        background: "var(--eco-primary-50)",
                        color: "var(--eco-primary-600)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText size={13} />
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: fd,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--eco-text-strong)",
                      }}
                    >
                      Descripción
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fb,
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: "var(--eco-text-soft)",
                    }}
                  >
                    {target.description?.trim() || (
                      <span style={{ fontStyle: "italic" }}>{emptyText}</span>
                    )}
                  </p>
                </div>

                {/* Resumen rápido */}
                <div style={{ ...card, padding: 16, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--eco-radius-md)",
                        background: "var(--eco-success-bg)",
                        color: "var(--eco-success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Zap size={13} />
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: fd,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--eco-text-strong)",
                      }}
                    >
                      Resumen rápido
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <InfoRow
                      label="Faltante"
                      value={`${fmt(s.remaining, 3)} tCO2e`}
                      mono
                      delay={0}
                    />
                    <InfoRow
                      label="Ritmo requerido"
                      value={`${fmt(s.requiredMonthly, 3)} tCO2e/mes`}
                      mono
                      delay={30}
                    />
                    <InfoRow
                      label="Tipo de objetivo"
                      value={
                        target.type === "reduction_percent"
                          ? `${fmt(target.targetValue, 1)}%`
                          : `${fmt(target.targetValue, 3)} tCO2e`
                      }
                      mono
                      delay={60}
                    />

                    {/* Divider */}
                    <div style={{ height: 1, background: "var(--eco-border)", margin: "2px 0" }} />

                    <InfoRow
                      label="Acciones asociadas"
                      value={String(linkedActions.length)}
                      mono
                      delay={90}
                    />
                    <InfoRow
                      label="Registros vinculados"
                      value={String(linkedRecords.length)}
                      mono
                      delay={120}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── ADDITIONAL INFO GRID ── */}
            <div style={{ ...card, padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--eco-radius-md)",
                    background: "var(--eco-info-bg)",
                    color: "var(--eco-info)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Layers size={13} />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fd,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--eco-text-strong)",
                  }}
                >
                  Información adicional
                </p>
              </div>
              <div
                className="ct-detail-meta"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: "4px 14px",
                }}
              >
                {infoFields.map((field, i) => (
                  <MetaField
                    key={field.label}
                    label={field.label}
                    value={field.value}
                    icon={field.icon}
                    delay={i * 20}
                  />
                ))}
              </div>
            </div>

            {/* ── NOTES + ACTIONS GRID ── */}
            <div
              className="ct-detail-notes"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              {/* Trazabilidad */}
              <div style={{ ...card, padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--eco-radius-md)",
                      background: "var(--eco-warning-bg)",
                      color: "var(--eco-warning)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TrendingDown size={13} />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fd,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--eco-text-strong)",
                    }}
                  >
                    Trazabilidad y notas
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    {
                      label: "Observaciones",
                      value: target.description?.trim() || emptyText,
                    },
                    {
                      label: "Motivo de pausa",
                      value:
                        target.status === "paused" && target.pauseReason?.trim()
                          ? target.pauseReason.trim()
                          : emptyText,
                    },
                    {
                      label: "Último registro asociado",
                      value: latestRecord
                        ? `${fmtDate(latestRecord.dateISO)} · ${latestRecord.area || emptyText} · ${fmt(latestRecord.co2e_t, 4)} tCO2e`
                        : emptyText,
                    },
                  ].map((row, i) => (
                    <div
                      key={row.label}
                      style={{ animation: `eco-fadeInUp .25s ease ${i * 40}ms both` }}
                    >
                      <p
                        style={{
                          margin: "0 0 3px",
                          fontFamily: fb,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--eco-text-soft)",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                        }}
                      >
                        {row.label}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: fb,
                          fontSize: 13,
                          lineHeight: 1.55,
                          color:
                            row.value === emptyText
                              ? "var(--eco-text-soft)"
                              : "var(--eco-text)",
                          fontStyle: row.value === emptyText ? "italic" : "normal",
                        }}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones vinculadas */}
              <div style={{ ...card, padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--eco-radius-md)",
                        background: "var(--eco-success-bg)",
                        color: "var(--eco-success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={13} />
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: fd,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--eco-text-strong)",
                      }}
                    >
                      Acciones vinculadas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onAddAction}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: "var(--eco-radius-full)",
                      border: "1px solid var(--eco-primary-200)",
                      background: "var(--eco-primary-50)",
                      color: "var(--eco-primary-700)",
                      fontFamily: fb,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 150ms",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--eco-primary-500)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--eco-primary-50)";
                      e.currentTarget.style.color = "var(--eco-primary-700)";
                    }}
                  >
                    <Plus size={11} />
                    Agregar
                  </button>
                </div>

                {/* Counts */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {[
                    { label: "Acciones", value: linkedActions.length },
                    { label: "Registros", value: linkedRecords.length },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--eco-radius-md)",
                        background: "var(--eco-surface)",
                        border: "1px solid var(--eco-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fb,
                          fontSize: 11,
                          color: "var(--eco-text-soft)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontFamily: fm,
                          fontSize: 14,
                          fontWeight: 800,
                          color: "var(--eco-text-strong)",
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {linkedActions.length === 0 ? (
                    <div
                      style={{
                        padding: "16px 12px",
                        borderRadius: "var(--eco-radius-md)",
                        background: "var(--eco-surface)",
                        border: "1px dashed var(--eco-border)",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily: fb,
                          fontSize: 12,
                          color: "var(--eco-text-soft)",
                          fontStyle: "italic",
                        }}
                      >
                        No hay acciones vinculadas todavía.
                      </p>
                    </div>
                  ) : (
                    linkedActions.slice(0, 3).map((action, i) => (
                      <div
                        key={action.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "var(--eco-radius-md)",
                          background: "var(--eco-surface)",
                          border: "1px solid var(--eco-border)",
                          borderLeft: "3px solid var(--eco-primary-400)",
                          animation: `eco-fadeInUp .25s ease ${i * 50}ms both`,
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 3px",
                            fontFamily: fd,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--eco-text-strong)",
                          }}
                        >
                          {action.title || "Acción sin nombre"}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: fb,
                            fontSize: 11,
                            color: "var(--eco-text-soft)",
                          }}
                        >
                          {action.owner || emptyText} · {action.status || emptyText}
                        </p>
                      </div>
                    ))
                  )}
                  {linkedActions.length > 3 && (
                    <p
                      style={{
                        margin: 0,
                        fontFamily: fb,
                        fontSize: 11,
                        color: "var(--eco-text-soft)",
                        textAlign: "center",
                        paddingTop: 4,
                      }}
                    >
                      +{linkedActions.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── ACTION BAR ── */}
            <div
              className="ct-detail-actions"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                paddingTop: 4,
                borderTop: "1px solid var(--eco-border)",
              }}
            >
              {/* Left: destructive */}
              <Btn icon={Trash2} tone="danger" onClick={onDelete}>
                Eliminar meta
              </Btn>

              {/* Right: primary actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={onClose}>Cerrar</Btn>
                <Btn icon={Plus} onClick={onAddAction}>
                  Nueva acción
                </Btn>
                <Btn
                  icon={target.status === "paused" ? PlayCircle : PauseCircle}
                  tone="warning"
                  onClick={onTogglePause}
                >
                  {target.status === "paused" ? "Activar meta" : "Pausar meta"}
                </Btn>
                <Btn icon={Edit3} tone="primary" onClick={onEdit}>
                  Editar
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
