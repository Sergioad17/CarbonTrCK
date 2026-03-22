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
import { add as addNotification } from "../lib/notificationsStore";
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

const fd = "var(--eco-font-display)",
  fb = "var(--eco-font-body)",
  fm = "var(--eco-font-mono)";
const fN = (n, d = 1) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const COLORS = ["#22C55E", "#EAB308", "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4", "#64748B", "#94A3B8"];
const RECORDS_KEY = "carbontrack.records";
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/* ═══════════════════════════════════════════════════════════════
   SEED DATA — matches Dashboard's style
   ═══════════════════════════════════════════════════════════════ */
const SEED_RECORDS = [
  {
    id: "s1",
    dateISO: "2026-01-15",
    area: "CC 1",
    category: "electricidad",
    activity: "Equipos de cómputo encendidos",
    value: 1250,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 543.75,
    co2e_t: 0.544,
    status: "real",
    source: "Recibo",
    by: "Ana García",
  },
  {
    id: "s2",
    dateISO: "2026-01-15",
    area: "CC 2",
    category: "electricidad",
    activity: "Servidores y switches activos",
    value: 1100,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 478.5,
    co2e_t: 0.479,
    status: "real",
    source: "Medición",
    by: "Ana García",
  },
  {
    id: "s3",
    dateISO: "2026-01-20",
    area: "Aulas",
    category: "electricidad",
    activity: "Iluminación y proyectores aulas 1-8",
    value: 340,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 147.9,
    co2e_t: 0.148,
    status: "est",
    source: "Estimación",
    by: "Carlos López",
  },
  {
    id: "s4",
    dateISO: "2026-02-10",
    area: "Industrial",
    category: "electricidad",
    activity: "Máquinas taller industrial",
    value: 920,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 400.2,
    co2e_t: 0.4,
    status: "real",
    source: "Recibo",
    by: "Ana García",
  },
  {
    id: "s5",
    dateISO: "2026-02-15",
    area: "Agrícola",
    category: "combustible",
    activity: "Tractor — riego y traslado",
    value: 35,
    unit: "L",
    factor: 2.68,
    co2e_kg: 93.8,
    co2e_t: 0.094,
    status: "real",
    source: "Inventario",
    by: "Pedro Ruiz",
  },
  {
    id: "s6",
    dateISO: "2026-03-01",
    area: "Redes",
    category: "electricidad",
    activity: "Switches y routers 24/7",
    value: 780,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 339.3,
    co2e_t: 0.339,
    status: "real",
    source: "Medición",
    by: "Ana García",
  },
  {
    id: "s7",
    dateISO: "2026-03-12",
    area: "Admin",
    category: "electricidad",
    activity: "Oficinas administrativas",
    value: 420,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 182.7,
    co2e_t: 0.183,
    status: "real",
    source: "Recibo",
    by: "Carlos López",
  },
  {
    id: "s8",
    dateISO: "2026-03-20",
    area: "Agrícola",
    category: "combustible",
    activity: "Tractor — preparación de tierra",
    value: 42,
    unit: "L",
    factor: 2.68,
    co2e_kg: 112.56,
    co2e_t: 0.113,
    status: "real",
    source: "Inventario",
    by: "Pedro Ruiz",
  },
  {
    id: "s9",
    dateISO: "2026-04-05",
    area: "Aulas",
    category: "electricidad",
    activity: "Aulas 9-16 iluminación + AC",
    value: 1580,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 687.3,
    co2e_t: 0.687,
    status: "real",
    source: "Recibo",
    by: "Ana García",
  },
  {
    id: "s10",
    dateISO: "2026-04-18",
    area: "CC 1",
    category: "electricidad",
    activity: "Laboratorio de redes y servidores",
    value: 1340,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 582.9,
    co2e_t: 0.583,
    status: "real",
    source: "Medición",
    by: "Ana García",
  },
  {
    id: "s11",
    dateISO: "2026-05-02",
    area: "Aulas",
    category: "electricidad",
    activity: "Aulas — periodo de exámenes",
    value: 290,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 126.15,
    co2e_t: 0.126,
    status: "est",
    source: "Estimación",
    by: "Carlos López",
  },
  {
    id: "s12",
    dateISO: "2026-05-15",
    area: "Agrícola",
    category: "combustible",
    activity: "Tractor — cosecha",
    value: 28,
    unit: "L",
    factor: 2.68,
    co2e_kg: 75.04,
    co2e_t: 0.075,
    status: "real",
    source: "Inventario",
    by: "Pedro Ruiz",
  },
  {
    id: "s13",
    dateISO: "2026-06-01",
    area: "CC 2",
    category: "electricidad",
    activity: "Upgrade de equipos — mayor consumo",
    value: 1420,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 617.7,
    co2e_t: 0.618,
    status: "real",
    source: "Medición",
    by: "Ana García",
  },
  {
    id: "s14",
    dateISO: "2026-06-10",
    area: "Redes",
    category: "electricidad",
    activity: "Infraestructura de red campus",
    value: 650,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 282.75,
    co2e_t: 0.283,
    status: "real",
    source: "Recibo",
    by: "Ana García",
  },
  {
    id: "s15",
    dateISO: "2026-01-25",
    area: "Otros",
    category: "electricidad",
    activity: "Alumbrado exterior campus",
    value: 180,
    unit: "kWh",
    factor: 0.435,
    co2e_kg: 78.3,
    co2e_t: 0.078,
    status: "est",
    source: "Estimación",
    by: "Carlos López",
  },
];

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [...SEED_RECORDS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SEED_RECORDS];
    const ids = new Set(parsed.map(r => r.id));
    const missing = SEED_RECORDS.filter(s => !ids.has(s.id));
    return [...parsed, ...missing];
  } catch {
    return [...SEED_RECORDS];
  }
}

function saveRecords(recs) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(recs.slice(0, 200)));
  } catch {}
}

const fmtDate = iso => {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtMonth = iso => {
  if (!iso) return "—";
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

  const stC = { success: "var(--eco-success)", warning: "var(--eco-warning)", danger: "var(--eco-danger)" };

  return (
    <div
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        padding: 18,
        border: `1.5px solid ${
          active ? "var(--eco-primary-400)" : status === "warning" ? "#FDE68A" : "var(--eco-border)"
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
          e.currentTarget.style.boxShadow = active ? "0 0 0 3px var(--eco-primary-200)" : "var(--eco-shadow-md)";
          e.currentTarget.style.transform = "translateY(-2px)";
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
            width: 38,
            height: 38,
            borderRadius: "var(--eco-radius-md)",
            background: iconBg || "var(--eco-primary-50)",
            color: iconColor || "var(--eco-primary-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
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
      }}
    >
      <div
        style={{
          padding: "16px 18px 8px",
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

      <div style={{ padding: "4px 10px 14px" }}>{children}</div>
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
      <h2 style={{ fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-gray-800)", margin: 0 }}>
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
      }}
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */

export default function EmissionsPage({ user, onOpenRecord }) {
  const [records, setRecords] = useState(() => loadRecords());
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
  const PER_PAGE = 8;

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /* Listen for new records from modal */
  useEffect(() => {
    const h = () => setRecords(loadRecords());
    window.addEventListener("carbontrack:newrecord", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("carbontrack:newrecord", h);
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
    addNotification({
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
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--eco-primary-300)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--eco-border)")}
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
            border: "1px solid var(--eco-border)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
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
                <RTooltip content={<EcoTooltip />} />
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
              padding: "50px 24px",
              textAlign: "center",
              animation: "eco-fadeInUp 0.3s ease-out",
            }}
          >
            <FileX size={36} style={{ color: "var(--eco-gray-300)", margin: "0 auto 12px", display: "block" }} />
            <p style={{ fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)", margin: "0 0 4px" }}>
              Sin resultados
            </p>
            <p style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", margin: 0 }}>
              No hay registros con estos filtros. Prueba otra combinación.
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  marginTop: 14,
                  height: 34,
                  padding: "0 16px",
                  borderRadius: "var(--eco-radius-md)",
                  border: "none",
                  background: "var(--eco-primary-500)",
                  color: "white",
                  fontFamily: fb,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
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
                      { key: null, label: "", w: 50 },
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
                          background: "var(--eco-gray-50)",
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
                        transition: "background 100ms",
                        cursor: "pointer",
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
                        <Badge variant={r.category}>{r.category === "electricidad" ? "⚡ Electricidad" : "🔥 Combustible"}</Badge>
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
            boxShadow: "var(--eco-shadow-lg)",
            borderRadius: "var(--eco-radius-lg)",
            padding: "12px 14px",
            minWidth: 260,
            animation: "eco-fadeInUp 0.25s ease-out",
          }}
        >
          <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>
            {toast.title}
          </p>
          <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>
            {toast.message}
          </p>
        </div>
      )}

      {/* ═══ DRILL-DOWN ═══ */}
      {drill && (
        <DrillPanel title="Trazabilidad del registro" onClose={() => setDrill(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Calc preview */}
            <div
              style={{
                background: "var(--eco-primary-50)",
                border: "1px solid var(--eco-primary-200)",
                borderRadius: "var(--eco-radius-lg)",
                padding: 16,
                textAlign: "center",
              }}
            >
              <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-primary-600)", margin: "0 0 6px", fontWeight: 600 }}>
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
                { l: "Categoría", v: drill.category === "electricidad" ? "⚡ Electricidad (Scope 2)" : "🔥 Combustible (Scope 1)" },
                { l: "Actividad", v: drill.activity },
                { l: "Fuente del dato", v: drill.source },
                { l: "Estado", v: drill.status === "real" ? "✅ Real" : "⚠️ Estimado" },
                { l: "Capturado por", v: drill.by || "—" },
                { l: "CO₂e (kg)", v: `${fN(drill.co2e_kg || 0, 1)} kgCO₂e` },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 14px",
                    borderBottom: i < 7 ? "1px solid var(--eco-gray-100)" : "none",
                  }}
                >
                  <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{row.l}</span>
                  <span style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-gray-700)", textAlign: "right" }}>
                    {row.v}
                  </span>
                </div>
              ))}
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
