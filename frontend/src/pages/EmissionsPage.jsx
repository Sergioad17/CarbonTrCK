import { useState, useEffect, useRef, useMemo } from "react";
import {
  Leaf,
  Zap,
  Flame,
  Building2,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  PieChart,
  ClipboardList,
  BarChart3,
  Shield,
  Target,
  Download,
  Plus,
  Calendar,
  Monitor,
  Factory,
  TreePine,
  Beaker,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  ExternalLink,
  Trash2,
  X,
  Eye,
  Filter,
  Search,
  RotateCcw,
  FileText,
  Database,
  Users,
  Settings,
  ChevronLeft,
  Bell,
  LogOut,
  User,
  Menu,
  FileX,
  Hash,
  Clock,
  ArrowUpDown,
  ChevronUp,
} from "lucide-react";
import { createNotification } from "../api/notifications";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { archiveEmissionRecord, fetchEmissionRecords } from "../api/records";
import RecordArchiveDialog from "../components/RecordArchiveDialog";
import { buildArchiveAuditPayload, canArchiveRecord } from "../lib/recordArchive";

const fd = "var(--eco-font-display)",
  fb = "var(--eco-font-body)",
  fm = "var(--eco-font-mono)";
const fN = (n, d = 1) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const COLORS = ["#22C55E", "#EAB308", "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4", "#64748B", "#94A3B8"];
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmtDate = iso => {
  if (!iso) return "-";
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtMonth = iso => {
  if (!iso) return "-";
  const d = new Date(iso + "T12:00:00");
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
};

/* ═══ Reusable sub-components (same patterns as Dashboard) ═══ */

function useCount(t, dur = 650) {
  const [v, setV] = useState(0);
  const r = useRef();

  useEffect(() => {
    let s = null;
    const e = x => 1 - Math.pow(1 - x, 3);

    const step = ts => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      setV(e(p) * t);
      if (p < 1) r.current = requestAnimationFrame(step);
      else setV(t);
    };

    r.current = requestAnimationFrame(step);
    return () => r.current && cancelAnimationFrame(r.current);
  }, [t, dur]);

  return v;
}

function EcoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "var(--eco-gray-900)",
        borderRadius: "var(--eco-radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--eco-shadow-lg)",
        border: "none",
        minWidth: 140,
      }}
    >
      <p
        style={{
          fontFamily: fb,
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>

      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: i < payload.length - 1 ? 4 : 0,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1 }}>
            {p.name}
          </span>
          <span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "white" }}>
            {fN(p.value, 2)}
          </span>
          <span style={{ fontFamily: fb, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>tCO₂e</span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];

  return (
    <div
      style={{
        background: "var(--eco-gray-900)",
        borderRadius: "var(--eco-radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--eco-shadow-lg)",
        border: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.payload.color }} />
        <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "white" }}>{d.name}</span>
      </div>

      <span style={{ fontFamily: fm, fontSize: 16, fontWeight: 700, color: "white" }}>
        {fN(d.value, 2)} tCO₂e
      </span>
      <span style={{ fontFamily: fb, fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>
        ({d.payload.pct}%)
      </span>
    </div>
  );
}

function Kpi({
  title,
  sub,
  value,
  unit,
  icon,
  iconBg,
  iconColor,
  delta,
  trend,
  status,
  delay = 0,
  active,
  onClick,
}) {
  const av = useCount(value, 700);

  const tc = {
    up: { i: <TrendingUp size={13} />, c: "var(--eco-danger)" },
    down: { i: <TrendingDown size={13} />, c: "var(--eco-success)" },
    neutral: { i: <Minus size={13} />, c: "var(--eco-gray-500)" },
  }[trend || "neutral"];

  const stC = { success: "var(--eco-success)", warning: "var(--eco-warning)", danger: "var(--eco-danger)", info: "var(--eco-info)" };

  return (
    <div
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        padding: 20,
        border: `1.5px solid ${
          active
            ? "var(--eco-primary-400)"
            : status === "warning"
            ? "#FDE68A"
            : status === "success"
            ? "#BBF7D0"
            : status === "info"
            ? "#BFDBFE"
            : status === "danger"
            ? "#FECACA"
            : "var(--eco-border)"
        }`,
        boxShadow: active ? "0 0 0 3px var(--eco-primary-100)" : "var(--eco-shadow-sm)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 200ms cubic-bezier(0.33,1,0.68,1)",
        animation: `eco-fadeInUp 0.4s ease-out ${delay}ms both`,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = active
            ? "0 0 0 3px var(--eco-primary-200)"
            : "0 4px 16px -4px rgba(0,0,0,0.1), 0 2px 6px -2px rgba(0,0,0,0.06)";
          e.currentTarget.style.transform = "translateY(-3px)";
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = active ? "0 0 0 3px var(--eco-primary-100)" : "var(--eco-shadow-sm)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {status && stC[status] && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: stC[status] }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${iconBg || "var(--eco-primary-50)"}, transparent)`,
            color: iconColor || "var(--eco-primary-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)",
          }}
        >
          {icon}
        </div>

        <div>
          <p
            style={{
              fontFamily: fb,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--eco-gray-500)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </p>
          {sub && <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: 0 }}>{sub}</p>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: fm,
            fontSize: 26,
            fontWeight: 700,
            color: "var(--eco-gray-900)",
            letterSpacing: "-0.02em",
          }}
        >
          {fN(av)}
        </span>
        <span style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-gray-400)" }}>{unit}</span>
      </div>

      {delta != null && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: "var(--eco-radius-full)",
            background:
              trend === "down"
                ? "var(--eco-success-bg)"
                : trend === "up"
                ? "var(--eco-danger-bg)"
                : "var(--eco-gray-100)",
          }}
        >
          <span style={{ display: "flex", color: tc.c }}>{tc.i}</span>
          <span style={{ fontFamily: fm, fontSize: 11, fontWeight: 600, color: tc.c }}>
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, sub, children, delay = 0 }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        border: "1px solid var(--eco-border)",
        boxShadow: "var(--eco-shadow-sm)",
        overflow: "hidden",
        animation: `eco-fadeInUp 0.4s ease-out ${delay}ms both`,
        transition: "box-shadow 200ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px -4px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.04)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
      }}
    >
      <div
        style={{
          padding: "18px 20px 10px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-800)", margin: 0 }}>
            {title}
          </p>
          {sub && <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)", margin: "2px 0 0" }}>{sub}</p>}
        </div>
      </div>

      <div style={{ padding: "6px 12px 16px" }}>{children}</div>
    </div>
  );
}

function DrillPanel({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
        animation: "eco-fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.3)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          background: "white",
          boxShadow: "var(--eco-shadow-lg)",
          display: "flex",
          flexDirection: "column",
          animation: "eco-fadeInUp 0.3s cubic-bezier(0.33,1,0.68,1)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--eco-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)", margin: 0 }}>
            {title}
          </h3>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--eco-radius-sm)",
              border: "none",
              background: "var(--eco-gray-100)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--eco-gray-500)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function SectionLabel({ children, action, actionLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h2
        style={{
          fontFamily: fd,
          fontSize: 17,
          fontWeight: 700,
          color: "var(--eco-gray-800)",
          margin: 0,
          paddingLeft: 0,
        }}
      >
        {children}
      </h2>

      {action && (
        <button
          onClick={action}
          style={{
            fontFamily: fb,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--eco-primary-600)",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {actionLabel || "Ver todo"}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

/* ─── Filter pill ─── */
function FilterPill({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: "var(--eco-radius-full)",
        border: `1px solid ${active ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
        background: active ? "var(--eco-primary-50)" : "white",
        fontFamily: fb,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 150ms",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.borderColor = "var(--eco-primary-200)";
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.borderColor = "var(--eco-border)";
      }}
    >
      {label}
    </button>
  );
}

/* ─── Filter select ─── */
function FilterSelect({ value, onChange, options, icon, placeholder }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--eco-gray-400)",
            display: "flex",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {icon}
        </span>
      )}

      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          height: 32,
          padding: `0 28px 0 ${icon ? 30 : 10}px`,
          borderRadius: "var(--eco-radius-full)",
          border: `1px solid ${value ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
          background: value ? "var(--eco-primary-50)" : "white",
          fontFamily: fb,
          fontSize: 12,
          fontWeight: value ? 600 : 400,
          color: value ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
          appearance: "none",
          cursor: "pointer",
          outline: "none",
          transition: "all 150ms",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value || o} value={o.value || o}>
            {o.label || o}
          </option>
        ))}
      </select>

      <ChevronDown
        size={13}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--eco-gray-400)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ─── Badge ─── */
function Badge({ children, variant = "default" }) {
  const cfg =
    {
      real: { bg: "var(--eco-success-bg)", c: "var(--eco-success)", b: "#BBF7D0" },
      est: { bg: "var(--eco-warning-bg)", c: "var(--eco-secondary-600)", b: "#FDE68A" },
      electricidad: { bg: "var(--eco-primary-50)", c: "var(--eco-primary-700)", b: "var(--eco-primary-200)" },
      combustible: { bg: "var(--eco-secondary-50)", c: "var(--eco-secondary-600)", b: "#FDE68A" },
      default: { bg: "var(--eco-gray-100)", c: "var(--eco-gray-600)", b: "var(--eco-border)" },
    }[variant] || cfg.default;

  return (
    <span
      style={{
        fontFamily: fb,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: "var(--eco-radius-full)",
        background: cfg.bg,
        color: cfg.c,
        border: `1px solid ${cfg.b}`,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Page Skeleton ─── */
function PageSkeleton() {
  const shimmer = {
    background: "linear-gradient(90deg, var(--eco-border) 25%, var(--eco-surface) 50%, var(--eco-border) 75%)",
    backgroundSize: "200% 100%",
    animation: "eco-shimmer 1.4s ease-in-out infinite",
    borderRadius: "var(--eco-radius-md)",
  };

  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
        {/* Header skeleton */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ ...shimmer, width: 180, height: 28, marginBottom: 8 }} />
            <div style={{ ...shimmer, width: 320, height: 16 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...shimmer, width: 120, height: 34, borderRadius: "var(--eco-radius-md)" }} />
            <div style={{ ...shimmer, width: 140, height: 34, borderRadius: "var(--eco-radius-md)" }} />
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div
          style={{
            background: "var(--eco-surface)",
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-border)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {[90, 100, 70, 80, 70].map((w, i) => (
            <div key={i} style={{ ...shimmer, width: w, height: 32, borderRadius: "var(--eco-radius-full)" }} />
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ ...shimmer, width: 180, height: 32, borderRadius: "var(--eco-radius-full)" }} />
        </div>

        {/* KPI cards skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "var(--card-gap)",
            marginBottom: "var(--section-gap)",
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                background: "var(--eco-surface)",
                borderRadius: "var(--eco-radius-lg)",
                padding: 20,
                border: "1px solid var(--eco-border)",
                animation: `eco-fadeInUp 0.4s ease-out ${i * 60}ms both`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ ...shimmer, width: 42, height: 42, borderRadius: 12 }} />
                <div>
                  <div style={{ ...shimmer, width: 80, height: 14, marginBottom: 4 }} />
                  <div style={{ ...shimmer, width: 50, height: 10 }} />
                </div>
              </div>
              <div style={{ ...shimmer, width: 100, height: 28, marginBottom: 8 }} />
              <div style={{ ...shimmer, width: 60, height: 20, borderRadius: "var(--eco-radius-full)" }} />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--card-gap)",
            marginBottom: "var(--section-gap)",
          }}
        >
          {[0, 1].map(i => (
            <div
              key={i}
              style={{
                background: "var(--eco-surface)",
                borderRadius: "var(--eco-radius-lg)",
                border: "1px solid var(--eco-border)",
                overflow: "hidden",
                animation: `eco-fadeInUp 0.4s ease-out ${200 + i * 60}ms both`,
              }}
            >
              <div style={{ padding: "18px 20px 10px" }}>
                <div style={{ ...shimmer, width: 140, height: 16, marginBottom: 4 }} />
                <div style={{ ...shimmer, width: 100, height: 12 }} />
              </div>
              <div style={{ padding: "6px 12px 16px" }}>
                <div style={{ ...shimmer, width: "100%", height: 220 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...shimmer, width: 120, height: 20 }} />
        </div>
        <div
          style={{
            background: "var(--eco-surface)",
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-border)",
            overflow: "hidden",
            animation: "eco-fadeInUp 0.4s ease-out 350ms both",
          }}
        >
          {/* Table header */}
          <div style={{ ...shimmer, width: "100%", height: 40, borderRadius: 0 }} />
          {/* Table rows */}
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                borderBottom: i < 4 ? "1px solid var(--eco-gray-100)" : "none",
              }}
            >
              <div style={{ ...shimmer, width: 70, height: 14 }} />
              <div style={{ ...shimmer, width: 60, height: 14 }} />
              <div style={{ ...shimmer, width: 80, height: 20, borderRadius: "var(--eco-radius-full)" }} />
              <div style={{ ...shimmer, width: 160, height: 14, flex: 1 }} />
              <div style={{ ...shimmer, width: 50, height: 14 }} />
              <div style={{ ...shimmer, width: 40, height: 14 }} />
              <div style={{ ...shimmer, width: 60, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */

export default function EmissionsPage({ user, onOpenRecord }) {
  const [records, setRecords] = useState([]);
  const [fArea, setFArea] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSource, setFSource] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [sortCol, setSortCol] = useState("dateISO");
  const [sortAsc, setSortAsc] = useState(false);
  const [drill, setDrill] = useState(null);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [archiveDialog, setArchiveDialog] = useState(null);
  const [archivingId, setArchivingId] = useState("");
  const [removingIds, setRemovingIds] = useState([]);
  const PER_PAGE = 8;
  const archivePermission = useMemo(() => canArchiveRecord(user), [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const nextRecords = await fetchEmissionRecords().catch(() => []);
      if (cancelled) return;
      setRecords(nextRecords);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /* Listen for new records from modal */
  useEffect(() => {
    const h = async () => {
      const nextRecords = await fetchEmissionRecords().catch(() => []);
      setRecords(nextRecords);
    };
    window.addEventListener("carbontrack:newrecord", h);
    window.addEventListener("carbontrack:record-archived", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("carbontrack:newrecord", h);
      window.removeEventListener("carbontrack:record-archived", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const hasFilters = fArea || fCat || fStatus || fSource || fSearch;

  const clearFilters = () => {
    setFArea("");
    setFCat("");
    setFStatus("");
    setFSource("");
    setFSearch("");
    setPage(0);
  };

  const openArchiveDialog = record => {
    if (!archivePermission.allowed) {
      setToast({ title: "Accion restringida", message: archivePermission.message });
      return;
    }
    setArchiveDialog(record);
  };

  const handleArchiveConfirm = async ({ reason }) => {
    if (!archiveDialog?.id || !archivePermission.allowed) return;
    const recordToArchive = archiveDialog;
    setArchivingId(recordToArchive.id);
    try {
      await archiveEmissionRecord(recordToArchive.id, buildArchiveAuditPayload(archivePermission.actor, reason));
      setRemovingIds(prev => (prev.includes(recordToArchive.id) ? prev : [...prev, recordToArchive.id]));
      window.setTimeout(() => {
        setRecords(prev => prev.filter(record => record.id !== recordToArchive.id));
        setRemovingIds(prev => prev.filter(id => id !== recordToArchive.id));
        setDrill(prev => (prev?.id === recordToArchive.id ? null : prev));
        setArchiveDialog(null);
        setArchivingId("");
        setToast({
          title: "Registro dado de baja",
          message: "Se oculto del flujo operativo y se preservo su trazabilidad.",
        });
      }, 280);
      createNotification({
        type: "record_archived",
        title: "Registro dado de baja",
        message: `Se dio de baja el registro "${recordToArchive.activity}" con trazabilidad conservada.`,
        link: "/emisiones",
        meta: { recordId: recordToArchive.id, category: recordToArchive.category },
      }).catch(() => null);
    } catch (error) {
      setArchivingId("");
      setToast({
        title: "No se pudo dar de baja",
        message:
          error?.status === 404
            ? "El backend aun no expone la baja logica para registros."
            : "La baja no se completo. Intenta nuevamente en unos segundos.",
      });
    }
  };

  /* ─── Filtered + sorted ─── */
  const filtered = useMemo(() => {
    let r = [...records];

    if (fArea) r = r.filter(x => x.area === fArea);
    if (fCat) r = r.filter(x => x.category === fCat);
    if (fStatus) r = r.filter(x => x.status === fStatus);
    if (fSource) r = r.filter(x => x.source === fSource);

    if (fSearch) {
      const q = fSearch.toLowerCase();
      r = r.filter(
        x => (x.activity || "").toLowerCase().includes(q) || (x.area || "").toLowerCase().includes(q)
      );
    }

    r.sort((a, b) => {
      let va = a[sortCol],
        vb = b[sortCol];
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });

    return r;
  }, [records, fArea, fCat, fStatus, fSource, fSearch, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  useEffect(() => {
    if (page === 0) return;
    if (page > Math.max(totalPages - 1, 0)) setPage(Math.max(totalPages - 1, 0));
  }, [page, totalPages]);

  /* ─── Derived stats ─── */
  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (r.co2e_t || 0), 0);
    const elec = filtered.filter(r => r.category === "electricidad").reduce((s, r) => s + (r.co2e_t || 0), 0);
    const comb = filtered.filter(r => r.category === "combustible").reduce((s, r) => s + (r.co2e_t || 0), 0);

    const realCount = filtered.filter(r => r.status === "real").length;
    const pctReal = filtered.length ? Math.round((realCount / filtered.length) * 100) : 0;

    return { total, elec, comb, pctReal, count: filtered.length };
  }, [filtered]);

  /* ─── Chart data ─── */
  const monthlyChart = useMemo(() => {
    const map = {};

    filtered.forEach(r => {
      const m = fmtMonth(r.dateISO);
      if (!map[m]) map[m] = { mes: m, scope2: 0, scope1: 0 };
      if (r.category === "combustible") map[m].scope1 += r.co2e_t || 0;
      else map[m].scope2 += r.co2e_t || 0;
    });

    return Object.values(map).sort((a, b) => {
      const ma = MONTHS_ES.indexOf(a.mes.split(" ")[0]);
      const mb = MONTHS_ES.indexOf(b.mes.split(" ")[0]);
      return ma - mb;
    });
  }, [filtered]);

  const areaChart = useMemo(() => {
    const map = {};

    filtered.forEach(r => {
      if (!map[r.area]) map[r.area] = { area: r.area, co2e: 0 };
      map[r.area].co2e += r.co2e_t || 0;
    });

    return Object.values(map).sort((a, b) => b.co2e - a.co2e);
  }, [filtered]);

  const catDonut = useMemo(() => {
    const t = stats.total || 1;

    return [
      { name: "Electricidad", value: stats.elec, pct: Math.round((stats.elec / t) * 100), color: "#22C55E" },
      { name: "Combustible", value: stats.comb, pct: Math.round((stats.comb / t) * 100), color: "#EAB308" },
    ].filter(d => d.value > 0);
  }, [stats]);

  const statusDonut = useMemo(() => {
    const real = filtered.filter(r => r.status === "real").length;
    const est = filtered.filter(r => r.status === "est").length;
    const t = filtered.length || 1;

    return [
      { name: "Real", value: real, pct: Math.round((real / t) * 100), color: "#22C55E" },
      { name: "Estimado", value: est, pct: Math.round((est / t) * 100), color: "#EAB308" },
    ].filter(d => d.value > 0);
  }, [filtered]);

  /* ─── CSV export ─── */
  const exportCSV = () => {
    const hdr = ["Fecha", "Área", "Categoría", "Actividad", "Valor", "Unidad", "Factor", "CO₂e (kg)", "CO₂e (t)", "Estado", "Fuente", "Capturó"];
    const rows = filtered.map(r =>
      [
        r.dateISO,
        r.area,
        r.category,
        r.activity,
        r.value,
        r.unit,
        r.factor,
        r.co2e_kg?.toFixed(2),
        r.co2e_t?.toFixed(4),
        r.status,
        r.source,
        r.by,
      ].join(",")
    );

    const csv = [hdr.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emisiones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    createNotification({
      type: "export_done",
      title: "CSV exportado",
      message: `Se exportaron ${filtered.length} registros.`,
      link: "/emisiones",
      meta: { count: filtered.length, resource: "records" },
    });
    setToast({ title: "CSV exportado", message: `${filtered.length} registros descargados` });
  };

  const toggleSort = col => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const areas = [...new Set(records.map(r => r.area))].sort();
  const sources = [...new Set(records.map(r => r.source))].filter(Boolean).sort();

  if (loading) return <PageSkeleton />;

  return (
    <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
        {/* ═══ PAGE HEADER ═══ */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: fd,
                fontSize: 24,
                fontWeight: 800,
                color: "var(--eco-gray-900)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Leaf size={22} style={{ color: "var(--eco-primary-500)" }} /> Emisiones
            </h1>

            <p style={{ fontFamily: fb, fontSize: 14, color: "var(--eco-gray-500)", margin: "4px 0 0" }}>
              Explora emisiones por periodo, área y categoría. Haz clic en gráficas para filtrar.
            </p>

            <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)", margin: "2px 0 0" }}>
              {hasFilters
                ? `Mostrando ${filtered.length} de ${records.length} registros filtrados`
                : `${records.length} registros totales`}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={exportCSV}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: "var(--eco-radius-md)",
                border: "1px solid var(--eco-border)",
                background: "white",
                fontFamily: fb,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--eco-gray-600)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 150ms",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--eco-primary-300)";
                e.currentTarget.style.background = "var(--eco-primary-50)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--eco-border)";
                e.currentTarget.style.background = "white";
              }}
            >
              <Download size={14} />
              Exportar CSV
            </button>

            <button
              onClick={() => onOpenRecord?.()}
              style={{
                height: 34,
                padding: "0 14px",
                borderRadius: "var(--eco-radius-md)",
                background: "var(--eco-primary-500)",
                color: "white",
                border: "none",
                fontFamily: fb,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "var(--eco-shadow-sm)",
                transition: "all 150ms",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--eco-primary-600)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--eco-primary-500)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus size={14} />
              Nuevo registro
            </button>
          </div>
        </div>

        {/* ═══ FILTERS BAR ═══ */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--eco-radius-lg)",
            border: "1.5px solid var(--eco-primary-500)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            boxShadow: "var(--eco-shadow-sm)",
            animation: "eco-fadeInUp 0.3s ease-out",
          }}
        >

          <Filter size={15} style={{ color: "var(--eco-gray-400)", flexShrink: 0 }} />

          <FilterSelect
            value={fArea}
            onChange={v => {
              setFArea(v);
              setPage(0);
            }}
            options={areas.map(a => ({ value: a, label: a }))}
            icon={<Building2 size={13} />}
            placeholder="Área"
          />

          <FilterSelect
            value={fCat}
            onChange={v => {
              setFCat(v);
              setPage(0);
            }}
            options={[
              { value: "electricidad", label: "Electricidad" },
              { value: "combustible", label: "Combustible" },
            ]}
            icon={<Zap size={13} />}
            placeholder="Categoría"
          />

          <FilterPill
            label={
              <>
                <CheckCircle2 size={12} /> Real
              </>
            }
            active={fStatus === "real"}
            onClick={() => {
              setFStatus(fStatus === "real" ? "" : "real");
              setPage(0);
            }}
          />

          <FilterPill
            label={
              <>
                <AlertTriangle size={12} /> Estimado
              </>
            }
            active={fStatus === "est"}
            onClick={() => {
              setFStatus(fStatus === "est" ? "" : "est");
              setPage(0);
            }}
          />

          <FilterSelect
            value={fSource}
            onChange={v => {
              setFSource(v);
              setPage(0);
            }}
            options={sources.map(s => ({ value: s, label: s }))}
            placeholder="Fuente"
          />

          <div style={{ flex: 1 }} />

          <div style={{ position: "relative", display: "inline-flex" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--eco-gray-400)",
                pointerEvents: "none",
              }}
            />
            <input
              value={fSearch}
              onChange={e => {
                setFSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar actividad…"
              style={{
                height: 32,
                width: 180,
                padding: "0 10px 0 32px",
                borderRadius: "var(--eco-radius-full)",
                border: "1px solid var(--eco-border)",
                fontFamily: fb,
                fontSize: 12,
                outline: "none",
                transition: "all 150ms",
                color: "var(--eco-gray-700)",
              }}
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: "var(--eco-radius-full)",
                border: "1px solid var(--eco-border)",
                background: "var(--eco-danger-bg)",
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--eco-danger)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RotateCcw size={12} />
              Limpiar
            </button>
          )}
        </div>

        {/* ═══ KPIs ═══ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "var(--card-gap)",
            marginBottom: "var(--section-gap)",
          }}
        >
          <Kpi
            title="Total emisiones"
            sub={`${stats.count} registros`}
            value={stats.total}
            unit="tCO₂e"
            icon={<Leaf size={19} />}
            delta={-8.3}
            trend="down"
            status="success"
            delay={0}
          />

          <Kpi
            title="Electricidad"
            sub="Scope 2"
            value={stats.elec}
            unit="tCO₂e"
            icon={<Zap size={19} />}
            iconBg="var(--eco-info-bg)"
            iconColor="var(--eco-info)"
            status="info"
            delay={60}
            active={fCat === "electricidad"}
            onClick={() => {
              setFCat(fCat === "electricidad" ? "" : "electricidad");
              setPage(0);
            }}
          />

          <Kpi
            title="Combustible"
            sub="Scope 1"
            value={stats.comb}
            unit="tCO₂e"
            icon={<Flame size={19} />}
            iconBg="var(--eco-secondary-50)"
            iconColor="var(--eco-secondary-600)"
            status="warning"
            delay={120}
            active={fCat === "combustible"}
            onClick={() => {
              setFCat(fCat === "combustible" ? "" : "combustible");
              setPage(0);
            }}
          />

          <Kpi
            title="Datos reales"
            sub={`${stats.pctReal}% del total`}
            value={stats.pctReal}
            unit="%"
            icon={<CheckCircle2 size={19} />}
            iconBg="var(--eco-success-bg)"
            iconColor="var(--eco-success)"
            delay={180}
            active={fStatus === "real"}
            onClick={() => {
              setFStatus(fStatus === "real" ? "" : "real");
              setPage(0);
            }}
          />
        </div>

        {/* ═══ CHARTS ═══ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--card-gap)",
            marginBottom: "var(--section-gap)",
          }}
        >
          <ChartCard title="Tendencia mensual" sub="tCO₂e por scope" delay={200}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyChart} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <RTooltip content={<EcoTooltip />} />
                <Line
                  type="monotone"
                  dataKey="scope2"
                  name="Electricidad"
                  stroke="#22C55E"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="scope1"
                  name="Combustible"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#EAB308", stroke: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Emisiones por área" sub="Click para filtrar" delay={260}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={areaChart} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                <XAxis dataKey="area" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <RTooltip content={<EcoTooltip />} cursor={{ fill: "rgba(136,136,136,0.15)" }} />
                <Bar
                  dataKey="co2e"
                  name="CO₂e"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={d => {
                    setFArea(fArea === d.area ? "" : d.area);
                    setPage(0);
                  }}
                >
                  {areaChart.map((d, i) => (
                    <Cell key={i} fill={d.area === fArea ? "#166534" : COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--card-gap)",
            marginBottom: "var(--section-gap)",
          }}
        >
          <ChartCard title="Por categoría" sub="Electricidad vs Combustible" delay={300}>
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={200}>
                <RPieChart>
                  <Pie
                    data={catDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    style={{ cursor: "pointer" }}
                    onClick={d => {
                      setFCat(fCat === d.name.toLowerCase() ? "" : d.name.toLowerCase());
                      setPage(0);
                    }}
                  >
                    {catDonut.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RTooltip content={<DonutTooltip />} />
                </RPieChart>
              </ResponsiveContainer>

              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <p style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)", margin: 0 }}>
                  {fN(stats.total, 2)}
                </p>
                <p style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)", margin: 0 }}>tCO₂e</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Real vs Estimado" sub="Distribución por estado" delay={340}>
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={200}>
                <RPieChart>
                  <Pie
                    data={statusDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    style={{ cursor: "pointer" }}
                    onClick={d => {
                      setFStatus(fStatus === d.name.toLowerCase() ? "" : d.name.toLowerCase());
                      setPage(0);
                    }}
                  >
                    {statusDonut.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RTooltip content={<DonutTooltip />} />
                </RPieChart>
              </ResponsiveContainer>

              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <p style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)", margin: 0 }}>
                  {stats.count}
                </p>
                <p style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)", margin: 0 }}>registros</p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ═══ TABLE ═══ */}
        <SectionLabel>{`Registros (${filtered.length})`}</SectionLabel>

        {filtered.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "var(--eco-radius-lg)",
              border: "1px solid var(--eco-border)",
              padding: "60px 24px",
              textAlign: "center",
              animation: "eco-fadeInUp 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "var(--eco-gray-50)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <FileX size={32} style={{ color: "var(--eco-gray-300)" }} />
            </div>
            <p style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-700)", margin: "0 0 6px" }}>
              Sin resultados
            </p>
            <p style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", margin: "0 0 4px", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
              No hay registros con estos filtros. Prueba otra combinación.
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  marginTop: 18,
                  height: 36,
                  padding: "0 18px",
                  borderRadius: "var(--eco-radius-md)",
                  border: "none",
                  background: "var(--eco-primary-500)",
                  color: "white",
                  fontFamily: fb,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "white",
              borderRadius: "var(--eco-radius-lg)",
              border: "1px solid var(--eco-border)",
              boxShadow: "var(--eco-shadow-sm)",
              overflow: "hidden",
              animation: "eco-fadeInUp 0.3s ease-out 100ms both",
              position: "relative",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--eco-border)" }}>
                    {[
                      { key: "dateISO", label: "Fecha", w: 100 },
                      { key: "area", label: "Área", w: 110 },
                      { key: "category", label: "Categoría", w: 100 },
                      { key: "activity", label: "Actividad", w: 200 },
                      { key: "value", label: "Valor", w: 90 },
                      { key: "factor", label: "Factor", w: 90 },
                      { key: "co2e_t", label: "CO₂e", w: 90 },
                      { key: "status", label: "Estado", w: 80 },
                      { key: "source", label: "Fuente", w: 90 },
                      { key: null, label: "", w: 86 },
                    ].map((col, ci) => (
                      <th
                        key={ci}
                        onClick={col.key ? () => toggleSort(col.key) : undefined}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontFamily: fb,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--eco-gray-500)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background: "var(--eco-gray-100)",
                          cursor: col.key ? "pointer" : "default",
                          whiteSpace: "nowrap",
                          minWidth: col.w,
                          userSelect: "none",
                          transition: "color 100ms",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {col.label}
                          {sortCol === col.key && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paged.map((r, ri) => (
                    <tr
                      key={r.id || ri}
                      style={{
                        borderBottom: ri < paged.length - 1 ? "1px solid var(--eco-gray-100)" : "none",
                        transition: "background 150ms ease, opacity 220ms ease, transform 220ms ease, filter 220ms ease",
                        cursor: "pointer",
                        opacity: removingIds.includes(r.id) ? 0 : 1,
                        transform: removingIds.includes(r.id) ? "translateX(18px) scale(0.985)" : "translateX(0) scale(1)",
                        filter: removingIds.includes(r.id) ? "blur(2px)" : "none",
                        pointerEvents: removingIds.includes(r.id) ? "none" : "auto",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--eco-gray-50)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "white")}
                      onClick={() => setDrill(r)}
                    >
                      <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-600)" }}>
                        {fmtDate(r.dateISO)}
                      </td>

                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--eco-gray-700)" }}>{r.area}</td>

                      <td style={{ padding: "10px 12px" }}>
                        <Badge variant={r.category}>
                          {r.category === "electricidad" ? (
                            <><Zap size={10} style={{ marginRight: 2 }} />Electricidad</>
                          ) : (
                            <><Flame size={10} style={{ marginRight: 2 }} />Combustible</>
                          )}
                        </Badge>
                      </td>

                      <td
                        style={{
                          padding: "10px 12px",
                          color: "var(--eco-gray-600)",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.activity}
                      </td>

                      <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-700)" }}>
                        {r.value?.toLocaleString("es-MX")} {r.unit}
                      </td>

                      <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 11, color: "var(--eco-gray-400)" }}>
                        {r.factor}
                      </td>

                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700)" }}>
                          {fN(r.co2e_t || 0, 3)}
                        </span>
                        <span style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)", marginLeft: 2 }}>t</span>
                      </td>

                      <td style={{ padding: "10px 12px" }}>
                        <Badge variant={r.status}>{r.status === "real" ? "Real" : "Estimado"}</Badge>
                      </td>

                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--eco-gray-500)" }}>{r.source}</td>

                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openArchiveDialog(r);
                            }}
                            aria-label={archivePermission.allowed ? `Dar de baja ${r.activity}` : archivePermission.message}
                            title={archivePermission.allowed ? "Dar de baja logica" : archivePermission.message}
                            disabled={!archivePermission.allowed || archivingId === r.id}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "var(--eco-radius-sm)",
                              border: `1px solid ${archivePermission.allowed ? "rgba(239,68,68,.15)" : "var(--eco-border)"}`,
                              background: archivePermission.allowed ? "rgba(239,68,68,.06)" : "var(--eco-card, white)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: archivePermission.allowed ? "pointer" : "not-allowed",
                              color: archivePermission.allowed ? "var(--eco-danger)" : "var(--eco-gray-300)",
                              transition: "all .2s cubic-bezier(.4,0,.2,1)",
                              opacity: archivingId === r.id ? 0.5 : 1,
                            }}
                            onMouseEnter={e => {
                              if (!archivePermission.allowed) return;
                              e.currentTarget.style.transform = "translateY(-1px) scale(1.08)";
                              e.currentTarget.style.background = "rgba(239,68,68,.12)";
                              e.currentTarget.style.borderColor = "rgba(239,68,68,.3)";
                              e.currentTarget.style.boxShadow = "0 6px 16px -6px rgba(239,68,68,.4)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = "translateY(0) scale(1)";
                              e.currentTarget.style.background = "rgba(239,68,68,.06)";
                              e.currentTarget.style.borderColor = "rgba(239,68,68,.15)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDrill(r);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "var(--eco-radius-sm)",
                            border: "1px solid var(--eco-border)",
                            background: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "var(--eco-gray-400)",
                            transition: "all 150ms",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "var(--eco-primary-300)";
                            e.currentTarget.style.color = "var(--eco-primary-600)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--eco-border)";
                            e.currentTarget.style.color = "var(--eco-gray-400)";
                          }}
                        >
                          <ExternalLink size={13} />
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid var(--eco-gray-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
                  {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length}
                </span>

                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "var(--eco-radius-sm)",
                      border: "1px solid var(--eco-border)",
                      background: "white",
                      cursor: page === 0 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--eco-gray-500)",
                      opacity: page === 0 ? 0.4 : 1,
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => {
                      if (page > 0) e.currentTarget.style.borderColor = "var(--eco-primary-300)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--eco-border)";
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "var(--eco-radius-sm)",
                        border: `1px solid ${page === i ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                        background: page === i ? "var(--eco-primary-50)" : "white",
                        fontFamily: fm,
                        fontSize: 12,
                        fontWeight: page === i ? 700 : 400,
                        color: page === i ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                      onMouseEnter={e => {
                        if (page !== i) e.currentTarget.style.borderColor = "var(--eco-primary-200)";
                      }}
                      onMouseLeave={e => {
                        if (page !== i) e.currentTarget.style.borderColor = "var(--eco-border)";
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "var(--eco-radius-sm)",
                      border: "1px solid var(--eco-border)",
                      background: "white",
                      cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--eco-gray-500)",
                      opacity: page >= totalPages - 1 ? 0.4 : 1,
                      transition: "all 150ms",
                    }}
                    onMouseEnter={e => {
                      if (page < totalPages - 1) e.currentTarget.style.borderColor = "var(--eco-primary-300)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--eco-border)";
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ TOAST ═══ */}
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 120,
            background: "white",
            border: "1px solid var(--eco-border)",
            borderLeft: "4px solid var(--eco-primary-500)",
            boxShadow: "var(--eco-shadow-lg)",
            borderRadius: "var(--eco-radius-lg)",
            padding: "12px 14px",
            minWidth: 260,
            animation: "eco-fadeInUp 0.25s ease-out",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>
              {toast.title}
            </p>
            <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              width: 24,
              height: 24,
              borderRadius: "var(--eco-radius-sm)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--eco-gray-400)",
              flexShrink: 0,
              transition: "color 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--eco-gray-600)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--eco-gray-400)")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══ DRILL-DOWN ═══ */}
      <RecordArchiveDialog
        open={Boolean(archiveDialog)}
        record={archiveDialog}
        permission={archivePermission}
        submitting={Boolean(archivingId)}
        onClose={() => {
          if (!archivingId) setArchiveDialog(null);
        }}
        onConfirm={handleArchiveConfirm}
      />

      {drill && (
        <DrillPanel title="Trazabilidad del registro" onClose={() => setDrill(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Calc preview */}
            <div
              style={{
                background: "var(--eco-primary-50)",
                border: "1px solid var(--eco-primary-200)",
                borderRadius: "var(--eco-radius-lg)",
                padding: 18,
                textAlign: "center",
                boxShadow: "0 2px 12px -4px rgba(34,197,94,0.12)",
              }}
            >
              <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-primary-600)", margin: "0 0 8px", fontWeight: 600 }}>
                Cálculo de emisiones
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontFamily: fm, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-800)" }}>
                  {drill.value?.toLocaleString("es-MX")}
                </span>
                <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>{drill.unit}</span>
                <span style={{ color: "var(--eco-gray-400)" }}>×</span>
                <span style={{ fontFamily: fm, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-800)" }}>{drill.factor}</span>
                <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>kgCO₂e/{drill.unit}</span>
                <span style={{ color: "var(--eco-gray-400)" }}>=</span>
                <span style={{ fontFamily: fm, fontSize: 20, fontWeight: 700, color: "var(--eco-primary-700)" }}>
                  {fN(drill.co2e_t || 0, 4)}
                </span>
                <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-primary-600)", fontWeight: 600 }}>tCO₂e</span>
              </div>
            </div>

            {/* Summary rows */}
            <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-md)", overflow: "hidden" }}>
              {[
                { l: "Fecha", v: fmtDate(drill.dateISO) },
                { l: "Área", v: drill.area },
                {
                  l: "Categoría",
                  v: drill.category === "electricidad"
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Zap size={12} /> Electricidad (Scope 2)</span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Flame size={12} /> Combustible (Scope 1)</span>,
                },
                { l: "Actividad", v: drill.activity },
                { l: "Fuente del dato", v: drill.source },
                {
                  l: "Estado",
                  v: drill.status === "real"
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Real</span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> Estimado</span>,
                },
                { l: "Capturado por", v: drill.by || "-" },
                { l: "CO₂e (kg)", v: `${fN(drill.co2e_kg || 0, 1)} kgCO₂e` },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: i < 7 ? "1px solid var(--eco-gray-100)" : "none",
                  }}
                >
                  <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)", fontWeight: 500 }}>{row.l}</span>
                  <span style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-gray-700)", textAlign: "right" }}>
                    {row.v}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid var(--eco-border)",
                borderRadius: "var(--eco-radius-md)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)" }}>
                Detalle capturado
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--eco-radius-sm)",
                    background: "var(--eco-gray-50)",
                    border: "1px solid var(--eco-gray-100)",
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)" }}>
                    Actividad / descripción
                  </p>
                  <p style={{ margin: 0, fontFamily: fb, fontSize: 12.5, color: "var(--eco-gray-700)", lineHeight: 1.6 }}>
                    {drill.activity || "Sin actividad registrada."}
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--eco-radius-sm)",
                    background: "var(--eco-gray-50)",
                    border: "1px solid var(--eco-gray-100)",
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)" }}>
                    Nota (opcional)
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fb,
                      fontSize: 12.5,
                      color: drill.note ? "var(--eco-gray-700)" : "var(--eco-gray-400)",
                      lineHeight: 1.6,
                    }}
                  >
                    {drill.note || "Sin nota adicional."}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                background: archivePermission.allowed ? "rgba(239,68,68,.04)" : "var(--eco-surface, var(--eco-gray-50))",
                border: `1px solid ${archivePermission.allowed ? "rgba(239,68,68,.12)" : "var(--eco-border)"}`,
                borderRadius: "var(--eco-radius-lg)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
                transition: "all .2s ease",
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: "0 0 3px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text, var(--eco-gray-800))" }}>
                  Baja logica con trazabilidad
                </p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 11.5, color: "var(--eco-gray-500)", lineHeight: 1.5 }}>
                  Oculta el registro del flujo operativo. Conserva archivos, revisiones y auditoria.
                </p>
              </div>

              <button
                onClick={() => openArchiveDialog(drill)}
                disabled={!archivePermission.allowed || archivingId === drill.id}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: "var(--eco-radius-md)",
                  border: "none",
                  background: archivePermission.allowed ? "linear-gradient(135deg, #EF4444, #DC2626)" : "var(--eco-gray-200)",
                  color: archivePermission.allowed ? "#fff" : "var(--eco-gray-400)",
                  fontFamily: fb,
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: archivePermission.allowed ? "pointer" : "not-allowed",
                  boxShadow: archivePermission.allowed ? "0 6px 16px -6px rgba(220,38,38,.45)" : "none",
                  transition: "all .2s cubic-bezier(.4,0,.2,1)",
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  if (!archivePermission.allowed) return;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(220,38,38,.55)";
                  e.currentTarget.style.filter = "brightness(1.06)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = archivePermission.allowed ? "0 6px 16px -6px rgba(220,38,38,.45)" : "none";
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                <Trash2 size={13} />
                Dar de baja
              </button>
            </div>

            {/* Related records */}
            <div>
              <p style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-700)", margin: "0 0 8px" }}>
                Registros del mismo área
              </p>

              {records
                .filter(r => r.area === drill.area && r.id !== drill.id)
                .slice(0, 4)
                .map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: "var(--eco-radius-sm)",
                      border: "1px solid var(--eco-gray-100)",
                      marginBottom: 6,
                      cursor: "pointer",
                      transition: "all 100ms",
                    }}
                    onClick={() => setDrill(r)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--eco-gray-50)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                  >
                    <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-gray-500)", minWidth: 65 }}>
                      {fmtDate(r.dateISO).slice(0, 6)}
                    </span>
                    <span
                      style={{
                        fontFamily: fb,
                        fontSize: 12,
                        color: "var(--eco-gray-600)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.activity}
                    </span>
                    <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>
                      {fN(r.co2e_t || 0, 3)} t
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </DrillPanel>
      )}
    </div>
  );
}

