import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Building2, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FileX, Filter, Flame, Leaf, Paperclip, Plus, RotateCcw, TrendingDown, TrendingUp, Minus, X, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart as RPieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { fetchAreasRecords } from "../api/areas";

const fd = "var(--eco-font-display)", fb = "var(--eco-font-body)", fm = "var(--eco-font-mono)";
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const CSS = `
@keyframes ctUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.85)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ctRowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:1024px){.ct-kpi-g{grid-template-columns:1fr 1fr!important}.ct-ch-m,.ct-ch-d,.ct-area-g{grid-template-columns:1fr!important}}
@media(max-width:640px){.ct-kpi-g{grid-template-columns:1fr!important}.ct-hdr-a{flex-direction:column;width:100%}.ct-hdr-a button{width:100%}}
`;
const SCOPE_COL = { electricidad: "#22C55E", combustible: "#EAB308", otros: "#64748B" };
const SRC_COL = { Recibo: "#22C55E", Medicion: "#3B82F6", Encuesta: "#EAB308", Inventario: "#06B6D4", Estimacion: "#94A3B8" };
const ST_COL = { real: "#22C55E", est: "#EAB308" };

/* ═══ HOOKS ═══ */
function useCountUp(target, dur = 650) { const [v, setV] = useState(0); const ref = useRef(null); useEffect(() => { let s = null; const ease = t => 1 - Math.pow(1 - t, 3); const step = ts => { if (!s) s = ts; const p = Math.min((ts - s) / dur, 1); setV(ease(p) * target); if (p < 1) ref.current = requestAnimationFrame(step); else setV(target); }; ref.current = requestAnimationFrame(step); return () => ref.current && cancelAnimationFrame(ref.current); }, [target, dur]); return v; }

/* ═══ UTILS ═══ */
const fN = (n, d = 1) => Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const toMK = iso => { const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const toML = iso => { const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "-"; return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; };
const toDL = iso => { const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "-"; return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; };

function matchPer(r, pm, mo, yr, fd2, td) { if (pm === "mes") return toMK(r.dateISO) === `${yr}-${String(mo).padStart(2, "0")}`; const t = new Date(`${r.dateISO}T12:00:00`).getTime(); if (fd2 && t < new Date(`${fd2}T00:00:00`).getTime()) return false; if (td && t > new Date(`${td}T23:59:59`).getTime()) return false; return true; }
function runF(recs, f) { return recs.filter(r => { if (!matchPer(r, f.periodMode, f.month, f.year, f.fromDate, f.toDate)) return false; if (f.category && r.category !== f.category) return false; if (f.status && r.status !== f.status) return false; if (f.source && r.source !== f.source) return false; if (f.areaId && r.areaId !== f.areaId) return false; if (f.fuelType && r.category === "combustible" && String(r.fuelType || "").toLowerCase() !== f.fuelType.toLowerCase()) return false; return true; }); }
function buildCsv(rows) { const h = ["Fecha", "Area", "Categoria", "Actividad", "Valor", "Unidad", "Factor", "CO2e_kg", "CO2e_t", "Estado", "Fuente", "Evidencia"]; const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`; const b = rows.map(r => [r.dateISO, r.areaLabel, r.category, r.activity, r.value, r.unit, r.factor, r.co2e_kg, r.co2e_t, r.status === "real" ? "Real" : "Estimado", r.source, r.evidenceUrl || "-"]); return [h.map(esc).join(","), ...b.map(row => row.map(esc).join(","))].join("\n"); }
function dlCsv(fn, rows) { const csv = buildCsv(rows); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fn; a.click(); URL.revokeObjectURL(url); }

/* ═══════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS (design-system aligned)
   ═══════════════════════════════════════════════════════════════ */

function Badge({ status }) { const isR = status === "real"; return <span style={{ fontFamily: fb, fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", padding: "2px 8px", borderRadius: "var(--eco-radius-full)", background: isR ? "var(--eco-success-bg)" : "var(--eco-warning-bg)", color: isR ? "var(--eco-success)" : "var(--eco-secondary-600)", border: `1px solid ${isR ? "#BBF7D0" : "#FDE68A"}`, whiteSpace: "nowrap" }}>{isR ? "Real" : "Estimado"}</span>; }

function SectionLabel({ children, icon, action, actionLabel, delay = 0 }) {
  return (<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, animation: `ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{icon && <div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-primary-50)", color: "var(--eco-primary-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>}<h2 style={{ fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-gray-800)", margin: 0, letterSpacing: "-0.01em" }}>{children}</h2></div>
    {action && <button onClick={action} style={{ border: "none", background: "none", cursor: "pointer", fontFamily: fb, fontSize: 13, fontWeight: 500, color: "var(--eco-primary-600)", display: "flex", alignItems: "center", gap: 4, transition: "color 150ms" }} onMouseEnter={e => e.currentTarget.style.color = "var(--eco-primary-800)"} onMouseLeave={e => e.currentTarget.style.color = "var(--eco-primary-600)"}>{actionLabel || "Ver todo"}<ArrowRight size={14} /></button>}
  </div>);
}

function EcoTooltip({ active, payload, label }) { if (!active || !payload?.length) return null; return <div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)", border: "none", minWidth: 150 }}><p style={{ margin: "0 0 6px", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>{label}</p>{payload.map((e, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < payload.length - 1 ? 4 : 0 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} /><span style={{ fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,.7)", flex: 1 }}>{e.name}</span><span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "white" }}>{fN(e.value, 2)}</span></div>)}</div>; }

function DonutTooltip({ active, payload }) { if (!active || !payload?.length) return null; const d = payload[0]; return <div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)", border: "none" }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: d.payload?.color || d.color }} /><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "white" }}>{d.name}</span></div><span style={{ fontFamily: fm, fontSize: 16, fontWeight: 700, color: "white" }}>{fN(d.value, 2)}</span><span style={{ marginLeft: 6, fontFamily: fb, fontSize: 11, color: "rgba(255,255,255,.5)" }}>({d.payload?.pct || 0}%)</span></div>; }
function DonutCenter({ pct = 0, caption = "Participacion" }) { return <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}><p style={{ margin: 0, fontFamily: fm, fontSize: 24, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{`${Math.max(0, Math.round(pct))}%`}</p><p style={{ margin: 0, fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)" }}>{caption}</p></div>; }

function KpiCard({ title, value, unit, icon, iconBg, iconColor, sub, status, delay = 0 }) {
  const num = Number(String(value).replace(/[^0-9.\-]/g, "")) || 0; const anim = useCountUp(num, 700); const isNum = !isNaN(num) && String(value) !== "-";
  const sa = { warning: { c: "var(--eco-warning)", b: "#FDE68A" }, danger: { c: "var(--eco-danger)", b: "#FECACA" }, success: { c: "var(--eco-success)", b: "#BBF7D0" } }[status] || null;
  return (<div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", padding: 18, border: `1px solid ${sa?.b || "var(--eco-border)"}`, boxShadow: "var(--eco-shadow-sm)", transition: "all 200ms cubic-bezier(.33,1,.68,1)", animation: `ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`, position: "relative", overflow: "hidden" }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--eco-shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--eco-primary-300)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = sa?.b || "var(--eco-border)"; }}>
    {sa && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: sa.c, borderRadius: "14px 14px 0 0" }} />}
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: iconBg || "var(--eco-primary-50)", color: iconColor || "var(--eco-primary-600)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div><p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 500, color: "var(--eco-gray-500)", lineHeight: 1.2 }}>{title}</p></div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}><span style={{ fontFamily: fm, fontSize: 26, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{isNum ? fN(anim, unit === "%" ? 0 : 2) : value}</span><span style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-gray-400)" }}>{unit}</span></div>
    {sub && <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{sub}</p>}
  </div>);
}

function ChartCard({ title, sub, children, delay = 0 }) { return <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: `ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both` }}><div style={{ padding: "16px 18px 8px" }}><p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-800)" }}>{title}</p>{sub && <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)" }}>{sub}</p>}</div><div style={{ padding: "4px 10px 14px" }}>{children}</div></div>; }

function PageSkeleton() {
  const sh = { background: "linear-gradient(90deg,var(--eco-border) 25%,var(--eco-surface) 50%,var(--eco-border) 75%)", backgroundSize: "200% 100%", animation: "ctShimmer 1.5s ease-in-out infinite", borderRadius: "var(--eco-radius-md)" };
  const card = { background: "var(--eco-surface)", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)" };
  return (
    <div style={{ padding: "var(--page-pad-y,24px) var(--page-pad-x,24px)", maxWidth: "var(--content-max,1440px)", margin: "0 auto" }}>
      {/* FiltersHeader skeleton */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14, animation: "ctUp .3s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...sh, width: 38, height: 38, borderRadius: "var(--eco-radius-md)" }} />
          <div>
            <div style={{ ...sh, width: 100, height: 24, marginBottom: 6 }} />
            <div style={{ ...sh, width: 340, height: 13 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...sh, width: 130, height: 36 }} />
          <div style={{ ...sh, width: 100, height: 36 }} />
          <div style={{ ...sh, width: 110, height: 36 }} />
        </div>
      </div>
      {/* Collapsible filters */}
      <div style={{ ...card, boxShadow: "var(--eco-shadow-sm)", marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ ...sh, width: 15, height: 15, borderRadius: 3 }} />
            <div style={{ ...sh, width: 60, height: 14 }} />
          </div>
          <div style={{ ...sh, width: 16, height: 16, borderRadius: 3 }} />
        </div>
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--eco-border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
            {[90, 70, 70, 90, 70, 70].map((w, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ ...sh, width: w * 0.6, height: 12 }} />
                <div style={{ ...sh, width: "100%", height: 36 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <div style={{ ...sh, width: 120, height: 32, borderRadius: "var(--eco-radius-sm)" }} />
          </div>
        </div>
      </div>

      {/* SectionLabel: Indicadores clave */}
      <div style={{ ...sh, width: 150, height: 18, marginBottom: 12 }} />
      {/* 5 KPIs */}
      <div className="ct-kpi-g" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...card, padding: 18, animation: `ctUp .3s ease-out ${100 + i * 50}ms both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ ...sh, width: 38, height: 38, borderRadius: "var(--eco-radius-md)" }} />
              <div style={{ ...sh, width: 80, height: 13 }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
              <div style={{ ...sh, width: 70, height: 26 }} />
              <div style={{ ...sh, width: 40, height: 12 }} />
            </div>
          </div>
        ))}
      </div>

      {/* SectionLabel: Listado de Áreas */}
      <div style={{ ...sh, width: 140, height: 18, marginBottom: 12 }} />
      {/* Area cards */}
      <div className="ct-area-g" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 24 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ ...card, boxShadow: "var(--eco-shadow-sm)", padding: 16, animation: `ctUp .3s ease-out ${200 + i * 40}ms both` }}>
            {/* Title + badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
              <div style={{ ...sh, width: 100, height: 14 }} />
              <div style={{ ...sh, width: 54, height: 20, borderRadius: "var(--eco-radius-full)" }} />
            </div>
            {/* Big value */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
              <div style={{ ...sh, width: 90, height: 24 }} />
              <div style={{ ...sh, width: 35, height: 11 }} />
            </div>
            {/* Elec / Fuel / Real % */}
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <div style={{ ...sh, width: 50, height: 11 }} />
              <div style={{ ...sh, width: 50, height: 11 }} />
              <div style={{ ...sh, width: 60, height: 11 }} />
            </div>
            {/* 2-col stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              <div style={{ ...sh, width: "100%", height: 44, borderRadius: "var(--eco-radius-sm)" }} />
              <div style={{ ...sh, width: "100%", height: 44, borderRadius: "var(--eco-radius-sm)" }} />
            </div>
            {/* Last date */}
            <div style={{ ...sh, width: 140, height: 11, marginBottom: 8 }} />
            {/* Ver detalle */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ ...sh, width: 80, height: 12 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1: 2fr 1fr */}
      <div className="ct-ch-m" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ ...card, boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: `ctUp .3s ease-out ${500 + i * 60}ms both` }}>
            <div style={{ padding: "16px 18px 8px" }}>
              <div style={{ ...sh, width: i === 0 ? 140 : 100, height: 15, marginBottom: 4 }} />
              <div style={{ ...sh, width: i === 0 ? 180 : 90, height: 12 }} />
            </div>
            <div style={{ padding: "4px 10px 14px" }}>
              <div style={{ ...sh, width: "100%", height: 250 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Charts row 2: 1fr 1fr */}
      <div className="ct-ch-d" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ ...card, boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: `ctUp .3s ease-out ${620 + i * 60}ms both` }}>
            <div style={{ padding: "16px 18px 8px" }}>
              <div style={{ ...sh, width: i === 0 ? 120 : 140, height: 15, marginBottom: 4 }} />
              <div style={{ ...sh, width: 100, height: 12 }} />
            </div>
            <div style={{ padding: "4px 10px 14px" }}>
              <div style={{ ...sh, width: "100%", height: 220 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrillPanel({ title, breadcrumb, onClose, children }) {
  useEffect(() => { const h = e => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: "flex-end" }} role="dialog" aria-modal="true">
    <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.35)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }} onClick={onClose} />
    <div style={{ position: "relative", width: "100%", maxWidth: 560, background: "white", boxShadow: "0 20px 25px -5px rgba(15,23,42,.08),0 8px 10px -6px rgba(15,23,42,.04)", display: "flex", flexDirection: "column", animation: "ctSlideR .3s cubic-bezier(.33,1,.68,1)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div>{breadcrumb && <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 4 }}><Building2 size={10} />{breadcrumb}</p>}<h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)" }}>{title}</h3></div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", border: "none", cursor: "pointer", background: "var(--eco-gray-100)", color: "var(--eco-gray-500)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms" }} onMouseEnter={e => e.currentTarget.style.background = "var(--eco-border)"} onMouseLeave={e => e.currentTarget.style.background = "var(--eco-gray-100)"}><X size={16} /></button></div>
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div>
    </div></div>;
}

function Toast({ toast }) { if (!toast) return null; return <div role="alert" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120, background: "white", border: "1px solid var(--eco-border)", boxShadow: "0 20px 25px -5px rgba(15,23,42,.08)", borderRadius: "var(--eco-radius-lg)", padding: "14px 16px", minWidth: 260, maxWidth: 340, display: "flex", alignItems: "flex-start", gap: 10, animation: "ctSlideR .3s cubic-bezier(.33,1,.68,1)" }}><div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-success-bg)", color: "var(--eco-success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><CheckCircle2 size={14} /></div><div><p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{toast.title}</p><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{toast.message}</p></div></div>; }

function FilterSel({ label, value, onChange, options, icon }) { return <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)", display: "flex", alignItems: "center", gap: 4 }}>{icon && <span style={{ display: "flex", color: "var(--eco-gray-400)" }}>{icon}</span>}{label}</span><select value={value} onChange={onChange} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)", background: "white", cursor: "pointer", transition: "border-color 150ms", outline: "none" }} onFocus={e => e.target.style.borderColor = "var(--eco-primary-300)"} onBlur={e => e.target.style.borderColor = "var(--eco-border)"}>{options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></label>; }

const btnP = { height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "none", background: "var(--eco-primary-500)", color: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "var(--eco-shadow-sm)", transition: "all 200ms cubic-bezier(.33,1,.68,1)" };
const btnS = { height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", background: "white", color: "var(--eco-gray-700)", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 150ms" };
const hS = e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.color = "var(--eco-primary-700)"; };
const lS = e => { e.currentTarget.style.borderColor = "var(--eco-border)"; e.currentTarget.style.color = "var(--eco-gray-700)"; };

/* ═══════════════════════════════════════════════════════════════
   SHARED FILTERS + HEADER
   ═══════════════════════════════════════════════════════════════ */
function FiltersHeader({ title, titleIcon, microcopy, onOpenRecord, onExport, onTrace, filters, setFilters, showFuelFilter, onClear, filtersOpen, setFiltersOpen, activeFC }) {
  return (<>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20, animation: "ctUp .4s cubic-bezier(.33,1,.68,1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {titleIcon && <div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(34,197,94,.2)", flexShrink: 0 }}>{titleIcon}</div>}
        <div><h1 style={{ margin: 0, fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{title}</h1><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>{microcopy}</p></div>
      </div>
      <div className="ct-hdr-a" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onOpenRecord} style={btnP} onMouseEnter={e => { e.currentTarget.style.background = "var(--eco-primary-600)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--eco-primary-500)"; e.currentTarget.style.transform = "translateY(0)"; }}><Plus size={14} />Nuevo registro</button>
        <button onClick={onExport} style={btnS} onMouseEnter={hS} onMouseLeave={lS}><Download size={14} />Exportar</button>
        <button onClick={onTrace} style={btnS} onMouseEnter={hS} onMouseLeave={lS}><Eye size={14} />Trazabilidad</button>
      </div>
    </div>
    <div style={{ background: "white", border: "1.5px solid var(--eco-primary-500)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", marginBottom: 20, overflow: "hidden", animation: "ctUp .4s cubic-bezier(.33,1,.68,1) 60ms both" }}>
      <button onClick={() => setFiltersOpen(!filtersOpen)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: filtersOpen ? "1px solid var(--eco-gray-100)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Filter size={15} style={{ color: "var(--eco-gray-500)" }} /><span style={{ fontFamily: fd, fontSize: 14, fontWeight: 600, color: "var(--eco-gray-700)" }}>Filtros</span>
          {activeFC > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: "var(--eco-radius-full)", background: "var(--eco-primary-100)", color: "var(--eco-primary-700)", fontFamily: fm, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{activeFC}</span>}
        </div><ChevronDown size={16} style={{ color: "var(--eco-gray-400)", transition: "transform 200ms", transform: filtersOpen ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {filtersOpen && <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
          <FilterSel label="Periodo" value={filters.periodMode} onChange={e => setFilters(p => ({ ...p, periodMode: e.target.value }))} icon={<Calendar size={11} />} options={[{ v: "todos", l: "Todos" }, { v: "mes", l: "Mes / Año" }, { v: "rango", l: "Rango" }]} />
          {filters.periodMode === "mes" ? <><FilterSel label="Mes" value={filters.month} onChange={e => setFilters(p => ({ ...p, month: Number(e.target.value) }))} options={MONTHS_ES.map((m, i) => ({ v: i + 1, l: m }))} /><FilterSel label="Año" value={filters.year} onChange={e => setFilters(p => ({ ...p, year: Number(e.target.value) }))} options={[2024, 2025, 2026, 2027].map(y => ({ v: y, l: String(y) }))} /></>
            : filters.periodMode === "rango" ? <><label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)" }}>Desde</span><input type="date" value={filters.fromDate} onChange={e => setFilters(p => ({ ...p, fromDate: e.target.value }))} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: "0 10px", fontFamily: fb, fontSize: 13, outline: "none" }} onFocus={e => e.target.style.borderColor = "var(--eco-primary-300)"} onBlur={e => e.target.style.borderColor = "var(--eco-border)"} /></label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)" }}>Hasta</span><input type="date" value={filters.toDate} onChange={e => setFilters(p => ({ ...p, toDate: e.target.value }))} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: "0 10px", fontFamily: fb, fontSize: 13, outline: "none" }} onFocus={e => e.target.style.borderColor = "var(--eco-primary-300)"} onBlur={e => e.target.style.borderColor = "var(--eco-border)"} /></label></> : null}
          <FilterSel label="Categoría" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))} options={[{ v: "", l: "Todas" }, { v: "electricidad", l: "Electricidad" }, { v: "combustible", l: "Combustible" }, { v: "otros", l: "Otros" }]} />
          <FilterSel label="Estado" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} options={[{ v: "", l: "Todos" }, { v: "real", l: "Real" }, { v: "est", l: "Estimado" }]} />
          <FilterSel label="Fuente" value={filters.source} onChange={e => setFilters(p => ({ ...p, source: e.target.value }))} options={[{ v: "", l: "Todas" }, ...Object.keys(SRC_COL).map(s => ({ v: s, l: s }))]} />
          {showFuelFilter && <FilterSel label="Combustible" value={filters.fuelType} onChange={e => setFilters(p => ({ ...p, fuelType: e.target.value }))} options={[{ v: "", l: "Todos" }, { v: "Diesel", l: "Diésel" }, { v: "Gasolina", l: "Gasolina" }]} />}
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}><button onClick={onClear} style={{ height: 32, padding: "0 12px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-border)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-600)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 150ms" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--eco-primary-300)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--eco-border)"}><RotateCcw size={12} />Limpiar filtros</button></div>
      </div>}
    </div>
  </>);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AreasPage({ onOpenRecord }) {
  const navigate = useNavigate(), location = useLocation(), today = new Date();
  const [records, setRecords] = useState([]); const [areas, setAreas] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [toast, setToast] = useState(null); const [drill, setDrill] = useState(null);
  const [filters, setFilters] = useState({ periodMode: "todos", month: today.getMonth() + 1, year: today.getFullYear(), fromDate: "", toDate: "", category: "", status: "", source: "", areaId: "", fuelType: "" });
  const [filtersOpen, setFiltersOpen] = useState(true); const [hovRow, setHovRow] = useState(null);

  const areaId = useMemo(() => { const m = location.pathname.match(/^\/areas\/([^/]+)/); return m ? m[1] : null; }, [location.pathname]);
  const isDetail = Boolean(areaId); const activeArea = areas.find(a => a.code === areaId) || null;
  const activeFC = useMemo(() => [filters.category, filters.status, filters.source, filters.fuelType].filter(Boolean).length, [filters]);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchAreasRecords();
    setRecords(data.records.sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
    if (data.areas?.length) setAreas(data.areas);
    setError(data.error);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { const h = () => { reload(); setToast({ title: "Actualización", message: "Registro guardado." }); }; window.addEventListener("carbontrack:newrecord", h); window.addEventListener("storage", h); return () => { window.removeEventListener("carbontrack:newrecord", h); window.removeEventListener("storage", h); }; }, [reload]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (!loading && areas.length > 0 && isDetail && !activeArea) navigate("/areas", { replace: true }); }, [loading, areas, isDetail, activeArea, navigate]);

  const listF = useMemo(() => runF(records, { ...filters, areaId: "", fuelType: "" }), [records, filters]);
  const detailF = useMemo(() => runF(records, { ...filters, areaId: areaId || "", fuelType: filters.category === "combustible" ? filters.fuelType : "" }), [records, filters, areaId]);
  const visList = listF;
  const visDetail = detailF;
  const curRows = isDetail ? detailF : listF;

  /* ─── List KPIs ─── */
  const gKpis = useMemo(() => { const tot = visList.reduce((s, r) => s + r.co2e_t, 0); const s2 = visList.filter(r => r.category === "electricidad").reduce((s, r) => s + r.co2e_t, 0); const s1 = visList.filter(r => r.category === "combustible").reduce((s, r) => s + r.co2e_t, 0); const pR = visList.length ? Math.round((visList.filter(r => r.status === "real").length / visList.length) * 100) : 0; let ch = "-"; if (filters.periodMode === "mes") { const pm = filters.month === 1 ? 12 : filters.month - 1, py = filters.month === 1 ? filters.year - 1 : filters.year; const prev = runF(records, { ...filters, month: pm, year: py, areaId: "", fuelType: "" }).reduce((s, r) => s + r.co2e_t, 0); if (prev > 0) { const d = ((tot - prev) / prev) * 100; ch = `${d > 0 ? "+" : ""}${fN(d, 1)}%`; } } return { total: tot, scope2: s2, scope1: s1, pctReal: pR, change: ch }; }, [visList, filters, records]);

  /* ─── Area cards ─── */
  const areaCards = useMemo(() => areas.map(area => { const rows = visList.filter(r => r.areaId === area.code); const allRows = records.filter(r => r.areaId === area.code); const tot = rows.reduce((s, r) => s + r.co2e_t, 0); const elec = rows.filter(r => r.category === "electricidad").reduce((s, r) => s + r.co2e_t, 0); const fuel = rows.filter(r => r.category === "combustible").reduce((s, r) => s + r.co2e_t, 0); const real = rows.filter(r => r.status === "real").length; const est = rows.filter(r => r.status === "est").length; const lastDate = (allRows[0]?.dateISO) || rows[0]?.dateISO || ""; return { ...area, id: area.code, label: area.name, totalT: tot, elec, fuel, dominant: real >= est ? "real" : "est", pctReal: rows.length ? Math.round((real / rows.length) * 100) : 0, rowCount: rows.length, lastDate }; }), [areas, visList, records]);

  /* ─── List charts ─── */
  const areaBars = useMemo(() => areaCards.map(a => ({ areaId: a.id, area: a.label, co2e: a.totalT })), [areaCards]);
  const catDonut = useMemo(() => { const e = visList.filter(r => r.category === "electricidad").reduce((s, r) => s + r.co2e_t, 0), c = visList.filter(r => r.category === "combustible").reduce((s, r) => s + r.co2e_t, 0), o = visList.filter(r => r.category === "otros").reduce((s, r) => s + r.co2e_t, 0), t = e + c + o || 1; return [{ name: "Electricidad", key: "electricidad", value: e, pct: Math.round((e / t) * 100), color: SCOPE_COL.electricidad }, { name: "Combustible", key: "combustible", value: c, pct: Math.round((c / t) * 100), color: SCOPE_COL.combustible }, { name: "Otros", key: "otros", value: o, pct: Math.round((o / t) * 100), color: SCOPE_COL.otros }].filter(x => x.value > 0); }, [visList]);
  const stDonut = useMemo(() => { const r = visList.filter(x => x.status === "real").length, e = visList.filter(x => x.status === "est").length, t = r + e || 1; return [{ name: "Real", key: "real", value: r, pct: Math.round((r / t) * 100), color: ST_COL.real }, { name: "Estimado", key: "est", value: e, pct: Math.round((e / t) * 100), color: ST_COL.est }].filter(x => x.value > 0); }, [visList]);
  const trendD = useMemo(() => { const g = {}; visList.forEach(r => { const k = toMK(r.dateISO); if (!g[k]) g[k] = { key: k, label: toML(r.dateISO), co2e: 0 }; g[k].co2e += r.co2e_t; }); return Object.values(g).sort((a, b) => a.key.localeCompare(b.key)); }, [visList]);
  const topCatDonut = catDonut.reduce((a, b) => b.pct > a.pct ? b : a, catDonut[0] || { pct: 0, name: "Categorias" });
  const topStDonut = stDonut.reduce((a, b) => b.pct > a.pct ? b : a, stDonut[0] || { pct: 0, name: "Estado" });

  /* ─── Detail KPIs + charts ─── */
  const dKpis = useMemo(() => { const tot = visDetail.reduce((s, r) => s + r.co2e_t, 0); const eR = visDetail.filter(r => r.category === "electricidad"), cR = visDetail.filter(r => r.category === "combustible"); const eKwh = eR.reduce((s, r) => s + (r.unit.toLowerCase() === "kwh" ? r.value : 0), 0), eT = eR.reduce((s, r) => s + r.co2e_t, 0), cL = cR.reduce((s, r) => s + (r.unit.toLowerCase() === "l" ? r.value : 0), 0), cT = cR.reduce((s, r) => s + r.co2e_t, 0); const pR = visDetail.length ? Math.round((visDetail.filter(r => r.status === "real").length / visDetail.length) * 100) : 0; const sc = visDetail.reduce((a, r) => { a[r.source] = (a[r.source] || 0) + 1; return a; }, {}); const ts = Object.keys(sc).sort((a, b) => sc[b] - sc[a])[0] || "-"; return { totalT: tot, eKwh, eT, cL, cT, pctReal: pR, topSource: ts }; }, [visDetail]);
  const dTrend = useMemo(() => { const g = {}; visDetail.forEach(r => { const k = toMK(r.dateISO); if (!g[k]) g[k] = { key: k, label: toML(r.dateISO), co2e: 0 }; g[k].co2e += r.co2e_t; }); return Object.values(g).sort((a, b) => a.key.localeCompare(b.key)); }, [visDetail]);
  const dCats = useMemo(() => { const by = { electricidad: 0, combustible: 0, otros: 0 }; visDetail.forEach(r => { by[r.category] = (by[r.category] || 0) + r.co2e_t; }); return [{ name: "Electricidad", key: "electricidad", value: by.electricidad, color: SCOPE_COL.electricidad }, { name: "Combustible", key: "combustible", value: by.combustible, color: SCOPE_COL.combustible }, { name: "Otros", key: "otros", value: by.otros, color: SCOPE_COL.otros }].filter(x => x.value > 0); }, [visDetail]);
  const dStatus = useMemo(() => { const r = visDetail.filter(x => x.status === "real").length, e = visDetail.filter(x => x.status === "est").length, t = r + e || 1; return [{ name: "Real", key: "real", value: r, pct: Math.round((r / t) * 100), color: ST_COL.real }, { name: "Estimado", key: "est", value: e, pct: Math.round((e / t) * 100), color: ST_COL.est }].filter(x => x.value > 0); }, [visDetail]);
  const dSrcs = useMemo(() => { const by = {}; visDetail.forEach(r => { by[r.source] = (by[r.source] || 0) + r.co2e_t; }); return Object.keys(by).map(s => ({ name: s, value: by[s], color: SRC_COL[s] || "#94A3B8" })); }, [visDetail]);
  const topDStatus = dStatus.reduce((a, b) => b.pct > a.pct ? b : a, dStatus[0] || { pct: 0, name: "Estado" });
  const sortedDR = useMemo(() => [...detailF].sort((a, b) => b.dateISO.localeCompare(a.dateISO)), [detailF]);

  const clearF = () => setFilters(p => ({ ...p, periodMode: "todos", month: today.getMonth() + 1, year: today.getFullYear(), fromDate: "", toDate: "", category: "", status: "", source: "", fuelType: "" }));
  const exportCur = () => { const rows = isDetail ? sortedDR : listF; const name = isDetail ? `areas-${areaId}-${new Date().toISOString().slice(0, 10)}.csv` : `areas-resumen-${new Date().toISOString().slice(0, 10)}.csv`; dlCsv(name, rows); setToast({ title: "Exportación", message: "CSV exportado." }); };
  const openTrace = (row = null) => setDrill({ row: row || curRows[0] || null });
  const navCat = cat => { navigate(cat === "combustible" ? "/scope/combustible" : "/scope/electricidad"); setDrill(null); };
  const fhProps = { onOpenRecord, onExport: exportCur, onTrace: () => openTrace(null), filters, setFilters, onClear: clearF, filtersOpen, setFiltersOpen, activeFC };

  /* ═══ LIST VIEW ═══ */
  const renderList = () => (<>
    <FiltersHeader title="Áreas" titleIcon={<Building2 size={18} color="white" />} microcopy="Selecciona un área para ver consumo, emisiones (CO₂e) y registros. Clic en gráficas para filtrar." showFuelFilter={false} {...fhProps} />

    <SectionLabel icon={<Leaf size={14} />} delay={100}>Indicadores clave</SectionLabel>
    <div className="ct-kpi-g" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
      <KpiCard title="Total CO₂e" value={gKpis.total} unit="tCO₂e" icon={<Leaf size={18} />} delay={120} />
      <KpiCard title="Scope 2" value={gKpis.scope2} unit="tCO₂e" icon={<Zap size={18} />} iconBg="var(--eco-info-bg)" iconColor="var(--eco-info)" delay={180} />
      <KpiCard title="Scope 1" value={gKpis.scope1} unit="tCO₂e" icon={<Flame size={18} />} iconBg="var(--eco-secondary-50)" iconColor="var(--eco-secondary-600)" delay={240} />
      <KpiCard title="Datos reales" value={gKpis.pctReal} unit="%" icon={<CheckCircle2 size={18} />} iconBg="var(--eco-success-bg)" iconColor="var(--eco-success)" delay={300} status={gKpis.pctReal >= 80 ? "success" : gKpis.pctReal >= 60 ? "warning" : "danger"} />
      <KpiCard title="Variación" value={gKpis.change} unit="" icon={<Calendar size={18} />} iconBg="var(--eco-gray-100)" iconColor="var(--eco-gray-600)" delay={360} />
    </div>

    <SectionLabel icon={<Building2 size={14} />} delay={200}>Listado de Áreas</SectionLabel>
    <div className="ct-area-g" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 24 }}>
      {areaCards.map((card, ci) => <div key={card.id} style={{ background: "white", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", padding: 16, cursor: "pointer", transition: "all 200ms cubic-bezier(.33,1,.68,1)", animation: `ctUp .4s cubic-bezier(.33,1,.68,1) ${200 + ci * 40}ms both`, position: "relative", overflow: "hidden" }} onClick={() => navigate(`/areas/${card.id}`)}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--eco-shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--eco-primary-300)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--eco-border)"; }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}><p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{card.label}</p><Badge status={card.dominant} /></div>
        <p style={{ margin: "0 0 4px", fontFamily: fm, fontSize: 24, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{fN(card.totalT, 3)} <span style={{ fontSize: 11, color: "var(--eco-gray-400)", fontWeight: 500 }}>tCO₂e</span></p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)", display: "flex", alignItems: "center", gap: 3 }}><Zap size={10} style={{ color: "var(--eco-primary-500)" }} />{fN(card.elec, 2)} t</span><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)", display: "flex", alignItems: "center", gap: 3 }}><Flame size={10} style={{ color: "var(--eco-secondary-500)" }} />{fN(card.fuel, 2)} t</span><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>Real {card.pctReal}%</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <div style={{ padding: "6px 8px", borderRadius: "var(--eco-radius-sm)", background: "var(--eco-gray-50)", border: "1px solid var(--eco-gray-100)" }}><p style={{ margin: 0, fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)" }}>Registros</p><p style={{ margin: 0, fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)" }}>{card.rowCount}</p></div>
          <div style={{ padding: "6px 8px", borderRadius: "var(--eco-radius-sm)", background: "var(--eco-gray-50)", border: "1px solid var(--eco-gray-100)" }}><p style={{ margin: 0, fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)" }}>Estado</p><p style={{ margin: 0, fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)" }}>{card.rowCount ? `${card.pctReal}% real` : "Sin datos"}</p></div>
        </div>
        <p style={{ margin: "0 0 8px", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>{card.lastDate ? `Último corte: ${toML(card.lastDate)}` : "Sin registros cargados"}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, color: "var(--eco-primary-600)", fontFamily: fb, fontSize: 12, fontWeight: 600 }}><span>Ver detalle</span><ChevronRight size={14} /></div>
      </div>)}
    </div>

    <div className="ct-ch-m" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
      <ChartCard title="CO₂e por área" sub="Clic en barra para ir al detalle" delay={300}><ResponsiveContainer width="100%" height={250}><BarChart data={areaBars} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="area" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} cursor={{ fill: "rgba(136,136,136,0.15)" }} /><Bar dataKey="co2e" name="CO₂e" radius={[5, 5, 0, 0]} cursor="pointer" onClick={d => d?.areaId && navigate(`/areas/${d.areaId}`)}>{areaBars.map((row, i) => <Cell key={row.areaId} fill={i % 2 === 0 ? "#22C55E" : "#86EFAC"} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Categorías" sub="Clic para filtrar" delay={360}><div style={{ position: "relative" }}><ResponsiveContainer width="100%" height={250}><RPieChart><Pie data={catDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={84} paddingAngle={3} onClick={d => setFilters(p => ({ ...p, category: p.category === d.key ? "" : d.key }))} cursor="pointer">{catDonut.map(d => <Cell key={d.key} fill={d.color} stroke="white" strokeWidth={2} />)}</Pie><RTooltip content={<DonutTooltip />} /></RPieChart></ResponsiveContainer><DonutCenter pct={topCatDonut.pct} caption={topCatDonut.name} /></div></ChartCard>
    </div>
    <div className="ct-ch-d" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
      <ChartCard title="Real vs Estimado" sub="Clic para filtrar" delay={420}><div style={{ position: "relative" }}><ResponsiveContainer width="100%" height={220}><RPieChart><Pie data={stDonut} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} onClick={d => setFilters(p => ({ ...p, status: p.status === d.key ? "" : d.key }))} cursor="pointer">{stDonut.map(d => <Cell key={d.key} fill={d.color} stroke="white" strokeWidth={2} />)}</Pie><RTooltip content={<DonutTooltip />} /></RPieChart></ResponsiveContainer><DonutCenter pct={topStDonut.pct} caption={topStDonut.name} /></div></ChartCard>
      <ChartCard title="Tendencia general" sub="CO₂e por periodo" delay={480}><ResponsiveContainer width="100%" height={220}><LineChart data={trendD} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="label" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Line type="monotone" dataKey="co2e" name="CO₂e" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "#22C55E", strokeWidth: 2, fill: "white" }} /></LineChart></ResponsiveContainer></ChartCard>
    </div>
    {!loading && listF.length === 0 && <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)", padding: "48px 24px", textAlign: "center", animation: "ctUp .4s ease-out" }}><div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--eco-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--eco-gray-400)", animation: "ctFloat 3s ease-in-out infinite" }}><FileX size={28} /></div><p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin resultados</p><p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", maxWidth: 320, marginInline: "auto", lineHeight: 1.5 }}>No hay registros para los filtros seleccionados.</p></div>}
  </>);

  /* ═══ DETAIL VIEW ═══ */
  const renderDetail = () => (<>
    <div style={{ marginBottom: 14, animation: "ctUp .3s ease-out" }}><button onClick={() => navigate("/areas")} style={{ ...btnS, height: 32, fontSize: 12 }} onMouseEnter={hS} onMouseLeave={lS}><ChevronLeft size={12} />Volver a Áreas</button></div>
    <FiltersHeader title={`Área: ${activeArea?.name || activeArea?.label || ""}`} titleIcon={<Building2 size={18} color="white" />} microcopy="Revisa consumo y emisiones. Clic en gráficas para filtrar." showFuelFilter={filters.category === "combustible"} {...fhProps} />

    <SectionLabel icon={<Leaf size={14} />} delay={100}>Indicadores del área</SectionLabel>
    <div className="ct-kpi-g" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
      <KpiCard title="Total CO₂e" value={dKpis.totalT} unit="tCO₂e" icon={<Leaf size={18} />} delay={120} />
      <KpiCard title="Electricidad" value={dKpis.eKwh} unit="kWh" icon={<Zap size={18} />} iconBg="var(--eco-info-bg)" iconColor="var(--eco-info)" sub={`${fN(dKpis.eT, 3)} tCO₂e`} delay={180} />
      <KpiCard title="Combustible" value={dKpis.cL} unit="L" icon={<Flame size={18} />} iconBg="var(--eco-secondary-50)" iconColor="var(--eco-secondary-600)" sub={`${fN(dKpis.cT, 3)} tCO₂e`} delay={240} />
      <KpiCard title="Datos reales" value={dKpis.pctReal} unit="%" icon={<CheckCircle2 size={18} />} iconBg="var(--eco-success-bg)" iconColor="var(--eco-success)" delay={300} status={dKpis.pctReal >= 80 ? "success" : dKpis.pctReal >= 60 ? "warning" : "danger"} />
      <KpiCard title="Top fuente" value={dKpis.topSource} unit="" icon={<BarChart3 size={18} />} delay={360} />
    </div>

    <div className="ct-ch-m" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
      <ChartCard title="Tendencia del área" sub="CO₂e por periodo" delay={250}><ResponsiveContainer width="100%" height={250}><LineChart data={dTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="label" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Line type="monotone" dataKey="co2e" name="CO₂e" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "#22C55E", strokeWidth: 2, fill: "white" }} /></LineChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Por categoría" sub="Clic para filtrar" delay={310}><ResponsiveContainer width="100%" height={250}><BarChart data={dCats} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="name" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} cursor={{ fill: "rgba(136,136,136,0.15)" }} /><Bar dataKey="value" name="CO₂e" radius={[5, 5, 0, 0]} cursor="pointer" onClick={d => setFilters(p => ({ ...p, category: p.category === d.key ? "" : d.key }))}>{dCats.map(d => <Cell key={d.key} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
    </div>
    <div className="ct-ch-d" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
      <ChartCard title="Real vs Estimado" sub="Clic para filtrar" delay={370}><div style={{ position: "relative" }}><ResponsiveContainer width="100%" height={230}><RPieChart><Pie data={dStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} cursor="pointer" onClick={d => setFilters(p => ({ ...p, status: p.status === d.key ? "" : d.key }))}>{dStatus.map(d => <Cell key={d.key} fill={d.color} stroke="white" strokeWidth={2} />)}</Pie><RTooltip content={<DonutTooltip />} /></RPieChart></ResponsiveContainer><DonutCenter pct={topDStatus.pct} caption={topDStatus.name} /></div></ChartCard>
      <ChartCard title="Por fuente" sub="Clic para filtrar" delay={430}><ResponsiveContainer width="100%" height={230}><BarChart data={dSrcs} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="name" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} cursor={{ fill: "rgba(136,136,136,0.15)" }} /><Bar dataKey="value" name="CO₂e" radius={[5, 5, 0, 0]} cursor="pointer" onClick={d => setFilters(p => ({ ...p, source: p.source === d.name ? "" : d.name }))}>{dSrcs.map(d => <Cell key={d.name} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
    </div>

    <SectionLabel icon={<Paperclip size={14} />} delay={300}>{`Registros (${sortedDR.length})`}</SectionLabel>
    {sortedDR.length === 0 ? <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)", padding: "48px 24px", textAlign: "center", animation: "ctUp .4s ease-out" }}><div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--eco-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--eco-gray-400)", animation: "ctFloat 3s ease-in-out infinite" }}><FileX size={28} /></div><p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin resultados</p><p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>No hay registros para los filtros seleccionados.</p></div>
      : <div style={{ background: "white", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: "ctUp .4s cubic-bezier(.33,1,.68,1) 350ms both" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}><thead><tr style={{ borderBottom: "1px solid var(--eco-border)", background: "var(--eco-gray-50)" }}>
        {["Fecha", "Categoría", "Actividad", "Valor", "Factor", "CO₂e", "Estado", "Fuente", "Evidencia", ""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
        <tbody>{sortedDR.map((r, i) => <tr key={r.id} style={{ borderBottom: i < sortedDR.length - 1 ? "1px solid var(--eco-gray-100)" : "none", background: hovRow === r.id ? "var(--eco-gray-50)" : "white", transition: "background 100ms", cursor: "pointer", animation: `ctRowIn .3s ease-out ${Math.min(i * 30, 300)}ms both` }}
          onMouseEnter={() => setHovRow(r.id)} onMouseLeave={() => setHovRow(null)} onClick={() => openTrace(r)}>
          <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-600)", whiteSpace: "nowrap" }}>{toDL(r.dateISO)}</td>
          <td style={{ padding: "10px 12px", color: "var(--eco-gray-700)", fontWeight: 600 }}>{r.category === "electricidad" ? "Electricidad" : r.category === "combustible" ? "Combustible" : "Otros"}</td>
          <td style={{ padding: "10px 12px", color: "var(--eco-gray-600)", maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.activity}</td>
          <td style={{ padding: "10px 12px", fontFamily: fm, color: "var(--eco-gray-700)" }}>{fN(r.value, 1)} {r.unit}</td>
          <td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-500)" }}>{fN(r.factor, 3)}</td>
          <td style={{ padding: "10px 12px" }}><span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(r.co2e_kg, 1)} kg</span><span style={{ marginLeft: 6, fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{fN(r.co2e_t, 3)} t</span></td>
          <td style={{ padding: "10px 12px" }}><Badge status={r.status} /></td>
          <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--eco-gray-500)" }}>{r.source}</td>
          <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--eco-gray-500)" }}>{r.evidenceUrl ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Paperclip size={11} />{r.evidenceUrl.length > 16 ? r.evidenceUrl.slice(0, 14) + "…" : r.evidenceUrl}</span> : "-"}</td>
          <td style={{ padding: "10px 12px" }}><button onClick={e => { e.stopPropagation(); openTrace(r); }} style={{ height: 28, width: 28, borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-border)", background: "white", color: "var(--eco-gray-400)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 150ms" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.color = "var(--eco-primary-600)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-border)"; e.currentTarget.style.color = "var(--eco-gray-400)"; }}><ExternalLink size={13} /></button></td>
        </tr>)}</tbody></table></div></div>}
  </>);

  /* ═══ MAIN RETURN ═══ */
  if (loading) return (<><style>{CSS}</style><PageSkeleton /></>);
  return (<><style>{CSS}</style>
    <div style={{ padding: "var(--page-pad-y,24px) var(--page-pad-x,24px)", maxWidth: "var(--content-max,1440px)", margin: "0 auto" }}>
      {error && <div style={{ marginBottom: 14, border: "1px solid #FECACA", background: "var(--eco-danger-bg)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", fontFamily: fb, fontSize: 12, color: "var(--eco-danger)", animation: "ctUp .3s ease-out" }}>{error}</div>}
      {isDetail ? renderDetail() : renderList()}
    </div>

    {drill && <DrillPanel title="Trazabilidad" breadcrumb={`Áreas → ${activeArea?.label || "Global"} → Detalle`} onClose={() => setDrill(null)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Filter summary */}
        <div style={{ background: "var(--eco-primary-50)", border: "1px solid var(--eco-primary-200)", borderRadius: "var(--eco-radius-lg)", padding: 14, animation: "ctUp .3s ease-out" }}>
          <p style={{ margin: "0 0 8px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700)", display: "flex", alignItems: "center", gap: 6 }}><Filter size={12} />Resumen del filtro</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Área: {activeArea?.label || "Global"}</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Registros: {curRows.length}</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Periodo: {filters.periodMode === "mes" ? `${MONTHS_ES[filters.month - 1]} ${filters.year}` : filters.periodMode === "rango" ? `${filters.fromDate || "-"} a ${filters.toDate || "-"}` : "Todo el periodo"}</p>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Estado: {filters.status ? filters.status === "real" ? "Real" : "Estimado" : "Todos"}</p>
          </div>
        </div>

        {/* Calculation */}
        <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-md)", padding: 14, animation: "ctUp .3s ease-out 60ms both" }}>
          <p style={{ margin: "0 0 6px", fontFamily: fd, fontSize: 13, color: "var(--eco-gray-700)", fontWeight: 700 }}>Cálculo</p>
          {drill.row ? <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-800)" }}>{fN(drill.row.value, 2)}</span><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>{drill.row.unit}</span><span style={{ color: "var(--eco-gray-400)", fontFamily: fm }}>×</span><span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-800)" }}>{fN(drill.row.factor, 3)}</span><span style={{ color: "var(--eco-gray-400)", fontFamily: fm }}>=</span><span style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(drill.row.co2e_kg, 2)}</span><span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-primary-600)", fontWeight: 600 }}>kgCO₂e</span></div>
            : <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Selecciona un registro para ver el cálculo.</p>}
        </div>

        {/* Related records */}
        <div>
          <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", display: "flex", alignItems: "center", gap: 6 }}><ArrowRight size={12} />Registros relevantes</p>
          {curRows.slice(0, 5).map((r, i) => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", marginBottom: 6, background: "white", transition: "all 150ms", cursor: "pointer", animation: `ctUp .3s ease-out ${i * 40}ms both` }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.background = "var(--eco-primary-50)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-border)"; e.currentTarget.style.background = "white"; }}>
            <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-gray-500)", minWidth: 70 }}>{toDL(r.dateISO).slice(0, 6)}</span>
            <span style={{ flex: 1, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.activity}</span>
            <Badge status={r.status} />
            <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(r.co2e_t, 3)} t</span>
          </div>)}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navCat("electricidad")} style={{ ...btnS, height: 34, fontSize: 12 }} onMouseEnter={hS} onMouseLeave={lS}><Zap size={12} />Ir a Electricidad</button>
          <button onClick={() => navCat("combustible")} style={{ ...btnS, height: 34, fontSize: 12 }} onMouseEnter={hS} onMouseLeave={lS}><Flame size={12} />Ir a Combustible</button>
        </div>
      </div>
    </DrillPanel>}

    <Toast toast={toast} />
  </>);
}
