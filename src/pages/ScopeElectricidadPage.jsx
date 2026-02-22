import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Zap, Plus, Download, Eye, Calendar, RotateCcw, FileX, ExternalLink, X,
  CheckCircle2, TrendingUp, TrendingDown, Minus, Gauge, Activity, ChevronRight,
  ChevronDown, ChevronUp, ChevronLeft, Filter, AlertTriangle, Building2,
  Search, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";

const fd = "var(--eco-font-display)", fb = "var(--eco-font-body)", fm = "var(--eco-font-mono)";
const RECORDS_KEY = "carbontrack.records";
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const COLORS = ["#3B82F6","#22C55E","#8B5CF6","#EC4899","#06B6D4","#EAB308","#64748B","#94A3B8"];

/* ═══ INJECTED ANIMATION CSS ═══ */
const ANIM_CSS = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.85)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ctRowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:1024px){.ct-kpi-g{grid-template-columns:1fr 1fr!important}.ct-ch-main,.ct-ch-donuts{grid-template-columns:1fr!important}}
@media(max-width:640px){.ct-kpi-g{grid-template-columns:1fr!important}.ct-hdr-acts{flex-direction:column;width:100%}.ct-hdr-acts button{width:100%}}
`;

/* ═══ SEED DATA ═══ */
const SEED_RECORDS = [
  { id:"s1", dateISO:"2026-01-15", area:"CC 1", category:"electricidad", activity:"Equipos de cómputo encendidos", value:1250, unit:"kWh", factor:0.435, co2e_kg:543.75, co2e_t:0.544, status:"real", source:"Recibo", by:"Ana García" },
  { id:"s2", dateISO:"2026-01-15", area:"CC 2", category:"electricidad", activity:"Servidores y switches activos", value:1100, unit:"kWh", factor:0.435, co2e_kg:478.50, co2e_t:0.479, status:"real", source:"Medición", by:"Ana García" },
  { id:"s3", dateISO:"2026-01-20", area:"Aulas", category:"electricidad", activity:"Iluminación y proyectores aulas 1-8", value:340, unit:"kWh", factor:0.435, co2e_kg:147.90, co2e_t:0.148, status:"est", source:"Estimación", by:"Carlos López" },
  { id:"s4", dateISO:"2026-02-10", area:"Industrial", category:"electricidad", activity:"Máquinas taller industrial", value:920, unit:"kWh", factor:0.435, co2e_kg:400.20, co2e_t:0.400, status:"real", source:"Recibo", by:"Ana García" },
  { id:"s5", dateISO:"2026-02-15", area:"Agrícola", category:"combustible", activity:"Tractor — riego y traslado", value:35, unit:"L", factor:2.68, co2e_kg:93.80, co2e_t:0.094, status:"real", source:"Inventario", by:"Pedro Ruiz" },
  { id:"s6", dateISO:"2026-03-01", area:"Redes", category:"electricidad", activity:"Switches y routers 24/7", value:780, unit:"kWh", factor:0.435, co2e_kg:339.30, co2e_t:0.339, status:"real", source:"Medición", by:"Ana García" },
  { id:"s7", dateISO:"2026-03-12", area:"Admin", category:"electricidad", activity:"Oficinas administrativas", value:420, unit:"kWh", factor:0.435, co2e_kg:182.70, co2e_t:0.183, status:"real", source:"Recibo", by:"Carlos López" },
  { id:"s8", dateISO:"2026-03-20", area:"Agrícola", category:"combustible", activity:"Tractor — preparación de tierra", value:42, unit:"L", factor:2.68, co2e_kg:112.56, co2e_t:0.113, status:"real", source:"Inventario", by:"Pedro Ruiz" },
  { id:"s9", dateISO:"2026-04-05", area:"Aulas", category:"electricidad", activity:"Aulas 9-16 iluminación + AC", value:1580, unit:"kWh", factor:0.435, co2e_kg:687.30, co2e_t:0.687, status:"real", source:"Recibo", by:"Ana García" },
  { id:"s10", dateISO:"2026-04-18", area:"CC 1", category:"electricidad", activity:"Laboratorio de redes y servidores", value:1340, unit:"kWh", factor:0.435, co2e_kg:582.90, co2e_t:0.583, status:"real", source:"Medición", by:"Ana García" },
  { id:"s11", dateISO:"2026-05-02", area:"Aulas", category:"electricidad", activity:"Aulas — periodo de exámenes", value:290, unit:"kWh", factor:0.435, co2e_kg:126.15, co2e_t:0.126, status:"est", source:"Estimación", by:"Carlos López" },
  { id:"s12", dateISO:"2026-05-15", area:"Agrícola", category:"combustible", activity:"Tractor — cosecha", value:28, unit:"L", factor:2.68, co2e_kg:75.04, co2e_t:0.075, status:"real", source:"Inventario", by:"Pedro Ruiz" },
  { id:"s13", dateISO:"2026-06-01", area:"CC 2", category:"electricidad", activity:"Upgrade de equipos — mayor consumo", value:1420, unit:"kWh", factor:0.435, co2e_kg:617.70, co2e_t:0.618, status:"real", source:"Medición", by:"Ana García" },
  { id:"s14", dateISO:"2026-06-10", area:"Redes", category:"electricidad", activity:"Infraestructura de red campus", value:650, unit:"kWh", factor:0.435, co2e_kg:282.75, co2e_t:0.283, status:"real", source:"Recibo", by:"Ana García" },
  { id:"s15", dateISO:"2026-01-25", area:"Otros", category:"electricidad", activity:"Alumbrado exterior campus", value:180, unit:"kWh", factor:0.435, co2e_kg:78.30, co2e_t:0.078, status:"est", source:"Estimación", by:"Carlos López" },
];

/* ═══ STYLE CONSTANTS ═══ */
const ST_C = { real: { bg:"var(--eco-success-bg)", c:"var(--eco-success)", b:"#BBF7D0", l:"Real" }, est: { bg:"var(--eco-warning-bg)", c:"var(--eco-secondary-600)", b:"#FDE68A", l:"Estimado" } };
const TR_C = { up: { c:"var(--eco-danger)", i:<TrendingUp size={13}/>, bg:"var(--eco-danger-bg)" }, down: { c:"var(--eco-success)", i:<TrendingDown size={13}/>, bg:"var(--eco-success-bg)" }, neutral: { c:"var(--eco-gray-500)", i:<Minus size={13}/>, bg:"var(--eco-gray-100)" } };
const ST_ACC = { warning: { c:"var(--eco-warning)", b:"#FDE68A" }, danger: { c:"var(--eco-danger)", b:"#FECACA" }, success: { c:"var(--eco-success)", b:"#BBF7D0" } };

/* ═══ HOOKS ═══ */
function useCountUp(target, dur = 650) {
  const [v, setV] = useState(0); const ref = useRef(null);
  useEffect(() => { let s = null; const ease = t => 1 - Math.pow(1 - t, 3);
    const step = ts => { if (!s) s = ts; const p = Math.min((ts - s) / dur, 1); setV(ease(p) * target); if (p < 1) ref.current = requestAnimationFrame(step); else setV(target); };
    ref.current = requestAnimationFrame(step); return () => ref.current && cancelAnimationFrame(ref.current);
  }, [target, dur]); return v;
}

/* ═══ UTILS ═══ */
function fN(n, d = 1) { return Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fDate(iso) { if (!iso) return "—"; const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "—"; return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; }
function fMonth(iso) { if (!iso) return "—"; const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "—"; return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; }
function toKey(date) { const d = new Date(`${date}T12:00:00`); if (Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function normRec(r, fid) {
  const kwh = Number.isFinite(Number(r?.value)) ? Number(r.value) : 0;
  const fac = Number.isFinite(Number(r?.factor)) && Number(r?.factor) > 0 ? Number(r.factor) : 0.435;
  const co2 = Number.isFinite(Number(r?.co2e_kg)) && Number(r?.co2e_kg) > 0 ? Number(r.co2e_kg) : kwh * fac;
  return { id: r?.id || fid, dateISO: String(r?.dateISO || ""), area: String(r?.area || "Sin área"), activity: String(r?.activity || "Sin actividad"), category: "electricidad", value: kwh, unit: "kWh", factor: fac, co2e_kg: co2, co2e_t: co2 / 1000, status: r?.status === "est" ? "est" : "real", source: String(r?.source || "Medición"), by: String(r?.by || "—") };
}

function loadElec() {
  let err = "", parsed = [];
  try { const raw = window.localStorage.getItem(RECORDS_KEY); if (raw) { const j = JSON.parse(raw); if (Array.isArray(j)) parsed = j; } } catch { err = "No se pudo leer localStorage."; }
  const all = [...parsed, ...SEED_RECORDS];
  const elec = all.filter(r => { if (!r || typeof r !== "object") return false; return r.category === "electricidad" || String(r.unit || "").toLowerCase() === "kwh"; });
  const byId = new Map(); elec.forEach((row, i) => { const k = String(row?.id || `e-${i}`); if (!byId.has(k)) byId.set(k, normRec(row, k)); });
  return { records: Array.from(byId.values()), storageError: err };
}

function periodFilter(recs, mode, mo, yr, fd2, td) {
  if (mode === "mes") { const ym = `${yr}-${String(mo).padStart(2, "0")}`; return recs.filter(r => toKey(r.dateISO) === ym); }
  if (!fd2 && !td) return recs;
  return recs.filter(r => { const t = new Date(`${r.dateISO}T12:00:00`).getTime(); if (Number.isNaN(t)) return false; if (fd2 && t < new Date(`${fd2}T00:00:00`).getTime()) return false; if (td && t > new Date(`${td}T23:59:59`).getTime()) return false; return true; });
}

function buildCsv(rows) {
  const hd = ["Fecha","Área","Actividad","kWh","Factor","CO₂e (kg)","CO₂e (t)","Estado","Fuente","Capturó"];
  const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const data = rows.map(r => [r.dateISO, r.area, r.activity, r.value, r.factor, (r.co2e_kg || 0).toFixed(2), (r.co2e_t || 0).toFixed(4), r.status === "est" ? "Estimado" : "Real", r.source, r.by]);
  return [hd.map(esc).join(","), ...data.map(row => row.map(esc).join(","))].join("\n");
}

/* ═══════════════════════════════════════════════════════════════
   ATOMIC UI COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function Badge({ status }) { const c = ST_C[status] || ST_C.real; return <span style={{ fontFamily: fb, fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", padding: "2px 8px", borderRadius: "var(--eco-radius-full)", background: c.bg, color: c.c, border: `1px solid ${c.b}`, whiteSpace: "nowrap" }}>{c.l}</span>; }

function SectionLabel({ children, icon, delay = 0 }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both` }}>
    {icon && <div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-info-bg)", color: "var(--eco-info)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>}
    <h2 style={{ fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-gray-800)", margin: 0, letterSpacing: "-0.01em" }}>{children}</h2>
  </div>);
}

function EcoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (<div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)", border: "none", minWidth: 150 }}>
    <p style={{ margin: "0 0 6px", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>{label}</p>
    {payload.map((e, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} /><span style={{ fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,.7)", flex: 1 }}>{e.name}</span>
      <span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "white" }}>{fN(e.value, 1)}</span></div>)}
  </div>);
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null; const d = payload[0];
  return (<div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)", border: "none" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color || d.payload?.color }} /><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "white" }}>{d.name}</span></div>
    <span style={{ fontFamily: fm, fontSize: 16, fontWeight: 700, color: "white" }}>{fN(d.value, 1)}</span>
    <span style={{ fontFamily: fb, fontSize: 11, color: "rgba(255,255,255,.5)", marginLeft: 6 }}>({d.payload?.pct}%)</span>
  </div>);
}

/* ─── KPI Card with sparkline + status accent + pop delta ─── */
function KpiCard({ title, sub, value, unit, icon, iconBg, iconColor, delta, trend = "neutral", status, delay = 0, sparkData }) {
  const num = Number(String(value).replace(/[^0-9.\-]/g, "")) || 0;
  const anim = useCountUp(num, 700);
  const isNum = !isNaN(num) && String(value) !== "—";
  const tc = TR_C[trend] || TR_C.neutral;
  const sa = ST_ACC[status] || null;
  const spark = sparkData && sparkData.length > 1 ? (() => { const mx = Math.max(...sparkData), mn = Math.min(...sparkData), rng = mx - mn || 1; return sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 60},${22 - ((v - mn) / rng) * 22}`).join(" "); })() : null;

  return (<div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", padding: 18, border: `1px solid ${sa?.b || "var(--eco-gray-200)"}`, boxShadow: "var(--eco-shadow-sm)", transition: "all 200ms cubic-bezier(.33,1,.68,1)", animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`, position: "relative", overflow: "hidden" }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--eco-shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--eco-primary-300)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = sa?.b || "var(--eco-gray-200)"; }}>
    {sa && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: sa.c, borderRadius: "14px 14px 0 0" }} />}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: iconBg || "var(--eco-info-bg)", color: iconColor || "var(--eco-info)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <div><p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 500, color: "var(--eco-gray-500)", lineHeight: 1.2 }}>{title}</p>
        {sub && <p style={{ margin: 0, fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{sub}</p>}</div>
      </div>
      {spark && <svg width={60} height={22} style={{ flexShrink: 0, opacity: .5 }}><polyline points={spark} fill="none" stroke={tc.c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 6 }}>
      <span style={{ fontFamily: fm, fontSize: 26, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{isNum ? fN(anim, unit === "%" ? 0 : 1) : value}</span>
      <span style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-gray-400)" }}>{unit}</span>
    </div>
    <div style={{ minHeight: 22 }}>{delta ?
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "var(--eco-radius-full)", background: tc.bg, animation: "ctPop .4s cubic-bezier(.34,1.56,.64,1) .5s both" }}>
        <span style={{ display: "flex", color: tc.c }}>{tc.i}</span><span style={{ fontFamily: fm, fontSize: 11, fontWeight: 600, color: tc.c }}>{delta}</span></div>
      : <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)" }}>—</span>}
    </div>
  </div>);
}

function ChartCard({ title, sub, children, delay = 0 }) {
  return (<div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`, position: "relative" }}>
    <div style={{ padding: "16px 18px 8px" }}><p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-800)" }}>{title}</p>
    {sub && <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)" }}>{sub}</p>}</div>
    <div style={{ padding: "4px 10px 14px" }}>{children}</div>
  </div>);
}

function Skeleton({ h = 120, delay = 0 }) {
  const shimmer = "linear-gradient(90deg,var(--eco-gray-100) 25%,var(--eco-gray-200) 50%,var(--eco-gray-100) 75%)";
  return (<div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", height: h, animation: `ctFadeUp .3s ease-out ${delay}ms both` }}>
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: shimmer, backgroundSize: "200% 100%", animation: "ctShimmer 1.5s ease-in-out infinite" }} /><div style={{ flex: 1 }}><div style={{ width: "60%", height: 12, borderRadius: 4, background: shimmer, backgroundSize: "200% 100%", animation: "ctShimmer 1.5s ease-in-out infinite", marginBottom: 6 }} /><div style={{ width: "35%", height: 10, borderRadius: 4, background: shimmer, backgroundSize: "200% 100%", animation: "ctShimmer 1.5s ease-in-out infinite" }} /></div></div>
      <div style={{ flex: 1, borderRadius: "var(--eco-radius-md)", background: shimmer, backgroundSize: "200% 100%", animation: "ctShimmer 1.5s ease-in-out infinite" }} />
    </div>
  </div>);
}

function DrillPanel({ title, breadcrumb, onClose, children }) {
  useEffect(() => { const h = e => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return (<div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: "flex-end" }} role="dialog" aria-modal="true">
    <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.35)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }} onClick={onClose} />
    <div style={{ position: "relative", width: "100%", maxWidth: 560, background: "white", boxShadow: "var(--eco-shadow-xl, var(--eco-shadow-lg))", display: "flex", flexDirection: "column", animation: "ctSlideR .3s cubic-bezier(.33,1,.68,1)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>{breadcrumb && <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 4 }}><Zap size={10} />{breadcrumb}</p>}
          <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)" }}>{title}</h3></div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", border: "none", cursor: "pointer", background: "var(--eco-gray-100)", color: "var(--eco-gray-500)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--eco-gray-200)"} onMouseLeave={e => e.currentTarget.style.background = "var(--eco-gray-100)"}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, padding: 20, overflow: "auto" }}>{children}</div>
    </div>
  </div>);
}

function FilterSel({ label, value, onChange, options, icon }) {
  return (<label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)", display: "flex", alignItems: "center", gap: 4 }}>
      {icon && <span style={{ display: "flex", color: "var(--eco-gray-400)" }}>{icon}</span>}{label}</span>
    <select value={value} onChange={onChange} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)", background: "white", cursor: "pointer", transition: "border-color 150ms", outline: "none" }}
      onFocus={e => e.target.style.borderColor = "var(--eco-primary-300)"} onBlur={e => e.target.style.borderColor = "var(--eco-gray-200)"}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </label>);
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (<div role="alert" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120, background: "white", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-xl, var(--eco-shadow-lg))", borderRadius: "var(--eco-radius-lg)", padding: "14px 16px", minWidth: 260, maxWidth: 340, display: "flex", alignItems: "flex-start", gap: 10, animation: "ctSlideR .3s cubic-bezier(.33,1,.68,1)" }}>
    <div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-success-bg)", color: "var(--eco-success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><CheckCircle2 size={14} /></div>
    <div style={{ flex: 1 }}><p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{toast.title}</p><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{toast.message}</p></div>
    <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--eco-gray-400)", padding: 2, flexShrink: 0, display: "flex" }}><X size={14} /></button>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function Scope2Page({ onOpenRecord }) {
  const today = new Date();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [periodMode, setPeriodMode] = useState("todos");
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fArea, setFArea] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSource, setFSource] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [drill, setDrill] = useState(null);
  const [toast, setToast] = useState(null);
  const [hovRow, setHovRow] = useState(null);
  const [sortCol, setSortCol] = useState("dateISO");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 8;

  const loadAll = useCallback(() => { setLoading(true); setTimeout(() => { const ld = loadElec(); setRecords(ld.records.sort((a, b) => b.dateISO.localeCompare(a.dateISO))); setStorageError(ld.storageError); setLoading(false); }, 420); }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const h = () => loadAll(); window.addEventListener("carbontrack:newrecord", h); window.addEventListener("storage", h); return () => { window.removeEventListener("carbontrack:newrecord", h); window.removeEventListener("storage", h); }; }, [loadAll]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const areas = useMemo(() => [...new Set(records.map(r => r.area))].sort(), [records]);
  const sources = useMemo(() => [...new Set(records.map(r => r.source))].sort(), [records]);
  const pFiltered = useMemo(() => periodMode === "todos" ? records : periodFilter(records, periodMode, month, year, fromDate, toDate), [records, periodMode, month, year, fromDate, toDate]);

  const filtered = useMemo(() => {
    let d = [...pFiltered];
    if (fArea) d = d.filter(r => r.area === fArea);
    if (fStatus) d = d.filter(r => r.status === fStatus);
    if (fSource) d = d.filter(r => r.source === fSource);
    d.sort((a, b) => { let va = a[sortCol], vb = b[sortCol]; if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va); return sortAsc ? va - vb : vb - va; });
    return d;
  }, [pFiltered, fArea, fStatus, fSource, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const activeFC = useMemo(() => [fArea, fStatus, fSource].filter(Boolean).length, [fArea, fStatus, fSource]);

  const summaryFilters = useMemo(() => {
    const v = [];
    v.push(periodMode === "mes" ? `${MONTHS_ES[month - 1]} ${year}` : periodMode === "rango" ? `${fromDate || "—"} a ${toDate || "—"}` : "Todo el periodo");
    if (fArea) v.push(`Área: ${fArea}`); if (fStatus) v.push(fStatus === "est" ? "Estimado" : "Real"); if (fSource) v.push(fSource);
    return v;
  }, [periodMode, month, year, fromDate, toDate, fArea, fStatus, fSource]);

  const kpis = useMemo(() => {
    const kwh = filtered.reduce((s, r) => s + r.value, 0);
    const co2Kg = filtered.reduce((s, r) => s + r.co2e_kg, 0);
    const co2T = filtered.reduce((s, r) => s + r.co2e_t, 0);
    const w = filtered.reduce((s, r) => s + r.value * r.factor, 0);
    const fAvg = kwh > 0 ? w / kwh : null;
    const rc = filtered.filter(r => r.status === "real").length;
    const pR = filtered.length ? Math.round((rc / filtered.length) * 100) : 0;
    let ch = null, tr = "neutral";
    if (periodMode === "mes") {
      const s1 = new Date(year, month - 1, 1), e1 = new Date(year, month, 1), ps = new Date(year, month - 2, 1), pe = new Date(year, month - 1, 1);
      const sh = rec => { if (fArea && rec.area !== fArea) return false; if (fStatus && rec.status !== fStatus) return false; if (fSource && rec.source !== fSource) return false; return true; };
      const cur = records.filter(sh).filter(r => { const d = new Date(`${r.dateISO}T12:00:00`); return d >= s1 && d < e1; }).reduce((s, r) => s + r.co2e_kg, 0);
      const prev = records.filter(sh).filter(r => { const d = new Date(`${r.dateISO}T12:00:00`); return d >= ps && d < pe; }).reduce((s, r) => s + r.co2e_kg, 0);
      if (prev > 0) { const pct = ((cur - prev) / prev) * 100; ch = `${pct > 0 ? "+" : ""}${fN(pct, 1)}%`; tr = pct > 0 ? "up" : pct < 0 ? "down" : "neutral"; }
    }
    return { kwh, co2Kg, co2T, factorAvg: fAvg, pctReal: pR, change: ch, trend: tr };
  }, [filtered, periodMode, month, year, records, fArea, fStatus, fSource]);

  const lineData = useMemo(() => { const m = {}; filtered.forEach(r => { const k = fMonth(r.dateISO); if (!m[k]) m[k] = { label: k, kwh: 0, co2e: 0 }; m[k].kwh += r.value; m[k].co2e += r.co2e_t; }); return Object.values(m).sort((a, b) => { const [am, ay] = a.label.split(" "); const [bm, by] = b.label.split(" "); if (ay !== by) return Number(ay) - Number(by); return MONTHS_ES.indexOf(am) - MONTHS_ES.indexOf(bm); }); }, [filtered]);

  const areaBars = useMemo(() => { const m = {}; filtered.forEach(r => { if (!m[r.area]) m[r.area] = { area: r.area, co2e: 0, kwh: 0 }; m[r.area].co2e += r.co2e_t; m[r.area].kwh += r.value; }); return Object.values(m).sort((a, b) => b.co2e - a.co2e); }, [filtered]);

  const sourceDonut = useMemo(() => { const m = {}; filtered.forEach(r => { const s = r.source || "Otro"; if (!m[s]) m[s] = { name: s, value: 0 }; m[s].value += r.co2e_t; }); const arr = Object.values(m).sort((a, b) => b.value - a.value); const t = arr.reduce((s, x) => s + x.value, 0) || 1; return arr.map((x, i) => ({ ...x, pct: Math.round((x.value / t) * 100), color: COLORS[i % COLORS.length] })); }, [filtered]);

  const statusDonut = useMemo(() => { const re = filtered.filter(r => r.status === "real").length; const es = filtered.filter(r => r.status === "est").length; const t = re + es || 1; return [{ name: "Real", value: re, pct: Math.round((re / t) * 100), color: "#22C55E" }, { name: "Estimado", value: es, pct: Math.round((es / t) * 100), color: "#EAB308" }].filter(d => d.value > 0); }, [filtered]);

  const clearFilters = () => { setPeriodMode("todos"); setMonth(today.getMonth() + 1); setYear(today.getFullYear()); setFromDate(""); setToDate(""); setFArea(""); setFStatus(""); setFSource(""); setPage(0); setToast({ title: "Filtros reiniciados", message: "Se restauraron los filtros." }); };
  const exportCsv = () => { const csv = buildCsv(filtered); const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `scope2-electricidad-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url); setToast({ title: "Exportación lista", message: `${filtered.length} registros exportados.` }); };
  const openTrace = row => { if (row) { setDrill(row); return; } if (filtered.length) { setDrill(filtered[0]); return; } setToast({ title: "Sin registros", message: "No hay registros para mostrar." }); };
  const related = useMemo(() => { if (!drill) return []; return filtered.filter(r => r.id !== drill.id).filter(r => r.area === drill.area).slice(0, 5); }, [drill, filtered]);
  const toggleSort = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } setPage(0); };

  const btnPrimary = { height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "none", background: "var(--eco-primary-500)", color: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "var(--eco-shadow-sm)", transition: "all 200ms cubic-bezier(.33,1,.68,1)" };
  const btnSec = { height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", color: "var(--eco-gray-700)", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 150ms" };
  const hoverSec = e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.color = "var(--eco-primary-700)"; };
  const leaveSec = e => { e.currentTarget.style.borderColor = "var(--eco-gray-200)"; e.currentTarget.style.color = "var(--eco-gray-700)"; };

  /* ═══ RENDER ═══ */
  return (<>
    <style>{ANIM_CSS}</style>
    <div style={{ padding: "var(--page-pad-y,24px) var(--page-pad-x,24px)" }}>
      <div style={{ maxWidth: "var(--content-max,1440px)", margin: "0 auto" }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(59,130,246,.2)", flexShrink: 0 }}><Zap size={20} color="white" /></div>
            <div>
              <h1 style={{ margin: 0, fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>Electricidad</h1>
              <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>Consumo eléctrico (kWh) y emisiones (CO₂e) · Clic en gráficas para filtrar</p>
            </div>
          </div>
          <div className="ct-hdr-acts" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={onOpenRecord} style={btnPrimary} onMouseEnter={e => { e.currentTarget.style.background = "var(--eco-primary-600)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--eco-primary-500)"; e.currentTarget.style.transform = "translateY(0)"; }}><Plus size={14} />Nuevo registro</button>
            <button onClick={exportCsv} style={btnSec} onMouseEnter={hoverSec} onMouseLeave={leaveSec}><Download size={14} />Exportar</button>
            <button onClick={() => openTrace()} style={btnSec} onMouseEnter={hoverSec} onMouseLeave={leaveSec}><Eye size={14} />Trazabilidad</button>
          </div>
        </div>

        {storageError && <div role="alert" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid #FDE68A", background: "var(--eco-warning-bg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, animation: "ctFadeUp .3s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} style={{ color: "var(--eco-warning)", flexShrink: 0 }} /><span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-700)" }}>{storageError}</span></div>
          <button onClick={loadAll} style={{ border: "1px solid var(--eco-gray-200)", background: "white", borderRadius: "var(--eco-radius-sm)", padding: "4px 10px", fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--eco-gray-700)" }}>Reintentar</button>
        </div>}

        {/* ═══ FILTERS (collapsible) ═══ */}
        <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", marginBottom: 20, overflow: "hidden", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 60ms both" }}>
          <button onClick={() => setFiltersOpen(!filtersOpen)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: filtersOpen ? "1px solid var(--eco-gray-100)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={15} style={{ color: "var(--eco-gray-500)" }} />
              <span style={{ fontFamily: fd, fontSize: 14, fontWeight: 600, color: "var(--eco-gray-700)" }}>Filtros</span>
              {activeFC > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: "var(--eco-radius-full)", background: "var(--eco-primary-100)", color: "var(--eco-primary-700)", fontFamily: fm, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{activeFC}</span>}
            </div>
            <ChevronDown size={16} style={{ color: "var(--eco-gray-400)", transition: "transform 200ms", transform: filtersOpen ? "rotate(180deg)" : "rotate(0)" }} />
          </button>
          {filtersOpen && <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
              <FilterSel label="Periodo" value={periodMode} onChange={e => { setPeriodMode(e.target.value); setPage(0); }} icon={<Calendar size={11} />} options={[{ v: "todos", l: "Todos" }, { v: "mes", l: "Mes / Año" }, { v: "rango", l: "Rango" }]} />
              {periodMode === "mes" ? <>
                <FilterSel label="Mes" value={month} onChange={e => { setMonth(Number(e.target.value)); setPage(0); }} options={MONTHS_ES.map((m, i) => ({ v: i + 1, l: m }))} />
                <FilterSel label="Año" value={year} onChange={e => { setYear(Number(e.target.value)); setPage(0); }} options={[2025, 2026, 2027].map(y => ({ v: y, l: String(y) }))} />
              </> : periodMode === "rango" ? <>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)" }}>Desde</span><input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0); }} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)" }} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)" }}>Hasta</span><input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0); }} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)" }} /></label>
              </> : null}
              <FilterSel label="Área" value={fArea} onChange={e => { setFArea(e.target.value); setPage(0); }} icon={<Building2 size={11} />} options={[{ v: "", l: "Todas" }, ...areas.map(a => ({ v: a, l: a }))]} />
              <FilterSel label="Estado" value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(0); }} icon={<CheckCircle2 size={11} />} options={[{ v: "", l: "Todos" }, { v: "real", l: "Real" }, { v: "est", l: "Estimado" }]} />
              <FilterSel label="Fuente" value={fSource} onChange={e => { setFSource(e.target.value); setPage(0); }} options={[{ v: "", l: "Todas" }, ...sources.map(s => ({ v: s, l: s }))]} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={clearFilters} style={{ height: 32, padding: "0 12px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-600)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 150ms" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--eco-primary-300)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--eco-gray-200)"}><RotateCcw size={12} />Limpiar filtros</button>
            </div>
          </div>}
        </div>

        {/* ═══ KPIs ═══ */}
        <SectionLabel icon={<Zap size={14} />} delay={100}>Indicadores clave</SectionLabel>
        {loading ? <div className="ct-kpi-g" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} h={140} delay={i * 50} />)}</div>
        : <div className="ct-kpi-g" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
          <KpiCard title="Consumo eléctrico" sub={`${filtered.length} registros`} value={kpis.kwh} unit="kWh" icon={<Zap size={18} />} delay={120} sparkData={lineData.map(d => d.kwh)} />
          <KpiCard title="CO₂e total" sub="Emisiones indirectas" value={kpis.co2T} unit="tCO₂e" icon={<Activity size={18} />} iconBg="var(--eco-primary-50)" iconColor="var(--eco-primary-600)" delay={180} sparkData={lineData.map(d => d.co2e)} status={kpis.co2T > 3 ? "danger" : kpis.co2T > 1.5 ? "warning" : undefined} />
          <KpiCard title="Factor promedio" value={kpis.factorAvg ? fN(kpis.factorAvg, 3) : "—"} unit="kgCO₂e/kWh" icon={<Gauge size={18} />} iconBg="#F0F9FF" iconColor="#0369A1" delay={240} />
          <KpiCard title="Datos reales" sub="Calidad de datos" value={kpis.pctReal} unit="%" icon={<CheckCircle2 size={18} />} iconBg="var(--eco-success-bg)" iconColor="var(--eco-success)" delay={300} status={kpis.pctReal >= 80 ? "success" : kpis.pctReal >= 60 ? "warning" : "danger"} />
          <KpiCard title="Variación" sub="vs periodo anterior" value={kpis.change || "—"} unit="" icon={<Calendar size={18} />} iconBg="var(--eco-gray-100)" iconColor="var(--eco-gray-600)" delta={kpis.change} trend={kpis.trend} delay={360} />
        </div>}

        {/* ═══ CHARTS ═══ */}
        <SectionLabel icon={<TrendingDown size={14} />} delay={200}>Gráficas</SectionLabel>
        <div className="ct-ch-main" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
          <ChartCard title="Consumo y emisiones por mes" sub="kWh (área) + tCO₂e (línea)" delay={250}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={lineData} margin={{ top: 8, right: 14, left: -8, bottom: 0 }}>
                <defs><linearGradient id="gKwh2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="kwh" tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="co2e" orientation="right" tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <RTooltip content={<EcoTooltip />} />
                <Area yAxisId="kwh" type="monotone" dataKey="kwh" name="Consumo kWh" stroke="#3B82F6" strokeWidth={2} fill="url(#gKwh2)" dot={{ r: 3, fill: "#3B82F6", stroke: "white", strokeWidth: 2 }} />
                <Line yAxisId="co2e" type="monotone" dataKey="co2e" name="CO₂e (t)" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "#22C55E", strokeWidth: 2, fill: "white" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="CO₂e por área" sub="Clic para filtrar" delay={310}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaBars} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                <XAxis dataKey="area" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <RTooltip content={<EcoTooltip />} />
                <Bar dataKey="co2e" name="CO₂e (t)" radius={[5, 5, 0, 0]} cursor="pointer" onClick={d => { setFArea(p => p === d.area ? "" : d.area); setPage(0); }}>
                  {areaBars.map((row, i) => <Cell key={row.area} fill={fArea === row.area ? "#1D4ED8" : i % 2 ? "#93C5FD" : "#3B82F6"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="ct-ch-donuts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          <ChartCard title="Por fuente de dato" sub="Clic para filtrar" delay={370}>
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={240}>
                <RPieChart><Pie data={sourceDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} cursor="pointer"
                  onClick={d => { setFSource(p => p === d.name ? "" : d.name); setPage(0); }}>
                  {sourceDonut.map(d => <Cell key={d.name} fill={fSource === d.name ? "#1D4ED8" : d.color} stroke="white" strokeWidth={2} />)}
                </Pie><RTooltip content={<DonutTooltip />} /></RPieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}><div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: fm, fontSize: 20, fontWeight: 700, color: "var(--eco-gray-900)" }}>{fN(kpis.co2T, 2)}</p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)" }}>tCO₂e</p>
              </div></div>
            </div>
          </ChartCard>
          <ChartCard title="Real vs Estimado" sub="Clic para filtrar" delay={430}>
            <div style={{ position: "relative" }}>
              <ResponsiveContainer width="100%" height={240}>
                <RPieChart><Pie data={statusDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} cursor="pointer"
                  onClick={d => { setFStatus(p => { const n = d.name === "Real" ? "real" : "est"; return p === n ? "" : n; }); setPage(0); }}>
                  {statusDonut.map(d => { const k = d.name === "Real" ? "real" : "est"; return <Cell key={d.name} fill={fStatus === k ? "#15803D" : d.color} stroke="white" strokeWidth={2} />; })}
                </Pie><RTooltip content={<DonutTooltip />} /></RPieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}><div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: fm, fontSize: 20, fontWeight: 700, color: "var(--eco-gray-900)" }}>{kpis.pctReal}%</p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)" }}>real</p>
              </div></div>
            </div>
          </ChartCard>
        </div>

        {/* ═══ TABLE ═══ */}
        <SectionLabel icon={<Activity size={14} />} delay={300}>{`Registros (${filtered.length})`}</SectionLabel>
        {filtered.length === 0 ?
          <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", padding: "48px 24px", textAlign: "center", animation: "ctFadeUp .4s ease-out" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--eco-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--eco-gray-400)", animation: "ctFloat 3s ease-in-out infinite" }}><FileX size={28} /></div>
            <p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin registros</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", maxWidth: 320, marginInline: "auto", lineHeight: 1.5 }}>No hay resultados para esta combinación de filtros.</p>
          </div>
        : <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 350ms both" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--eco-gray-200)", background: "var(--eco-gray-50)" }}>
                {[{ k: "dateISO", l: "Fecha" }, { k: "area", l: "Área" }, { k: "activity", l: "Actividad" }, { k: "value", l: "kWh" }, { k: "factor", l: "Factor" }, { k: "co2e_kg", l: "CO₂e (kg)" }, { k: "co2e_t", l: "CO₂e (t)" }, { k: "status", l: "Estado" }, { k: "source", l: "Fuente" }, { k: null, l: "" }].map((col, ci) => <th key={ci} onClick={col.k ? () => toggleSort(col.k) : undefined} style={{ padding: "10px 12px", textAlign: "left", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", cursor: col.k ? "pointer" : "default", userSelect: "none" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{col.l}{sortCol === col.k && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span></th>)}
              </tr></thead>
              <tbody>{paged.map((r, i) =>
                <tr key={r.id} style={{ borderBottom: i < paged.length - 1 ? "1px solid var(--eco-gray-100)" : "none", background: hovRow === r.id ? "var(--eco-gray-50)" : "white", transition: "background 100ms", cursor: "pointer", animation: `ctRowIn .3s ease-out ${Math.min(i * 30, 300)}ms both` }}
                  onMouseEnter={() => setHovRow(r.id)} onMouseLeave={() => setHovRow(null)} onClick={() => openTrace(r)}>
                  <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-600)", whiteSpace: "nowrap" }}>{fDate(r.dateISO)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--eco-gray-700)", fontWeight: 600 }}>{r.area}</td>
                  <td style={{ padding: "10px 12px", color: "var(--eco-gray-600)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.activity}</td>
                  <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, fontWeight: 600, color: "var(--eco-info)" }}>{fN(r.value, 0)}</td>
                  <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-500)" }}>{fN(r.factor, 3)}</td>
                  <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-700)" }}>{fN(r.co2e_kg, 1)}</td>
                  <td style={{ padding: "10px 12px", fontFamily: fm, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(r.co2e_t, 3)}</td>
                  <td style={{ padding: "10px 12px" }}><Badge status={r.status} /></td>
                  <td style={{ padding: "10px 12px", color: "var(--eco-gray-500)", fontSize: 12 }}>{r.source}</td>
                  <td style={{ padding: "10px 12px" }}><button onClick={e => { e.stopPropagation(); openTrace(r); }} aria-label={`Ver ${r.activity}`} style={{ height: 28, width: 28, borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", color: "var(--eco-gray-400)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 150ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.color = "var(--eco-primary-600)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-gray-200)"; e.currentTarget.style.color = "var(--eco-gray-400)"; }}><ExternalLink size={13} /></button></td>
                </tr>
              )}</tbody>
            </table>
          </div>
          {totalPages > 1 && <div style={{ padding: "10px 16px", borderTop: "1px solid var(--eco-gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ width: 30, height: 30, borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", cursor: page === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--eco-gray-500)", opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, i) => <button key={i} onClick={() => setPage(i)} style={{ width: 30, height: 30, borderRadius: "var(--eco-radius-sm)", border: `1px solid ${page === i ? "var(--eco-info)" : "var(--eco-gray-200)"}`, background: page === i ? "var(--eco-info-bg)" : "white", fontFamily: fm, fontSize: 12, fontWeight: page === i ? 700 : 400, color: page === i ? "var(--eco-info)" : "var(--eco-gray-600)", cursor: "pointer" }}>{i + 1}</button>)}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ width: 30, height: 30, borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--eco-gray-500)", opacity: page >= totalPages - 1 ? 0.4 : 1 }}><ChevronRight size={15} /></button>
            </div>
          </div>}
        </div>}
      </div>
    </div>

    <Toast toast={toast} onDismiss={() => setToast(null)} />

    {/* ═══ DRILL-DOWN PANEL ═══ */}
    {drill && <DrillPanel title="Trazabilidad de electricidad" breadcrumb="Scope 2 → Electricidad → Detalle" onClose={() => setDrill(null)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--eco-info-bg)", border: "1px solid #BFDBFE", borderRadius: "var(--eco-radius-lg)", padding: 16, textAlign: "center", animation: "ctFadeUp .3s ease-out" }}>
          <p style={{ margin: "0 0 8px", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-info)" }}>Cálculo de emisiones — Scope 2</p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-800)" }}>{fN(drill.value, 0)}</span>
            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>kWh</span>
            <span style={{ color: "var(--eco-gray-400)", fontFamily: fm, fontSize: 14 }}>×</span>
            <span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-800)" }}>{fN(drill.factor, 3)}</span>
            <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>kgCO₂e/kWh</span>
            <span style={{ color: "var(--eco-gray-400)", fontFamily: fm, fontSize: 14 }}>=</span>
            <span style={{ fontFamily: fm, fontSize: 22, fontWeight: 700, color: "var(--eco-info)" }}>{fN(drill.co2e_t, 4)}</span>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-info)", fontWeight: 600 }}>tCO₂e</span>
          </div>
        </div>

        <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-md)", overflow: "hidden" }}>
          {[{ l: "Fecha", v: fDate(drill.dateISO) }, { l: "Área", v: drill.area }, { l: "Scope", v: "⚡ Scope 2 — Electricidad" }, { l: "Actividad", v: drill.activity }, { l: "Consumo", v: `${fN(drill.value, 0)} kWh` }, { l: "Factor aplicado", v: `${fN(drill.factor, 3)} kgCO₂e/kWh (SEMARNAT 2024)` }, { l: "CO₂e (kg)", v: `${fN(drill.co2e_kg, 1)} kgCO₂e` }, { l: "Estado", v: null, badge: true }, { l: "Fuente", v: drill.source }, { l: "Capturado por", v: drill.by || "—" }].map((row, i) =>
            <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: i < 9 ? "1px solid var(--eco-gray-100)" : "none", animation: `ctFadeUp .3s ease-out ${i * 30}ms both` }}>
              <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{row.l}</span>
              {row.badge ? <Badge status={drill.status} /> : <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)", textAlign: "right" }}>{row.v}</span>}
            </div>
          )}
        </div>

        <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-md)", padding: 12 }}>
          <p style={{ margin: "0 0 8px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", display: "flex", alignItems: "center", gap: 6 }}><Filter size={12} />Filtros activos</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{summaryFilters.map(item => <span key={item} style={{ fontFamily: fb, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-gray-100)", color: "var(--eco-gray-600)" }}>{item}</span>)}</div>
        </div>

        <div>
          <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", display: "flex", alignItems: "center", gap: 6 }}><ArrowRight size={12} />Registros relacionados</p>
          {related.length ? related.map((row, i) =>
            <button key={row.id} onClick={() => setDrill(row)} style={{ width: "100%", border: "1px solid var(--eco-gray-200)", background: "white", borderRadius: "var(--eco-radius-md)", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 6, transition: "all 150ms", animation: `ctFadeUp .3s ease-out ${i * 40}ms both` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.background = "var(--eco-primary-50)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-gray-200)"; e.currentTarget.style.background = "white"; }}>
              <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-gray-500)", minWidth: 70, textAlign: "left" }}>{fDate(row.dateISO).slice(0, 6)}</span>
              <span style={{ flex: 1, textAlign: "left", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>{row.activity}</span>
              <Badge status={row.status} />
              <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(row.co2e_t, 3)} t</span>
              <ChevronRight size={13} style={{ color: "var(--eco-gray-300)" }} />
            </button>
          ) : <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>No hay registros relacionados.</p>}
        </div>
      </div>
    </DrillPanel>}
  </>);
}