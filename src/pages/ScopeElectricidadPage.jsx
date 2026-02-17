import { useCallback, useEffect, useMemo, useState } from "react";
import { Zap, Plus, Download, Eye, Calendar, RotateCcw, FileX, Filter, Leaf, ChevronDown, ChevronRight, X, CheckCircle2, TrendingUp, TrendingDown, Minus, Activity, Gauge, Paperclip, AlertTriangle, ArrowRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const KEY = "carbontrack.records";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const AREAS = ["Aulas", "CC1", "CC2", "Redes", "Industrial/Calidad", "Agricola", "Administracion"];
const SOURCES = ["Recibo", "Medicion", "Encuesta", "Inventario", "Estimacion"];

const BASE = [
  { id: "e1", dateISO: "2026-01-09", area: "CC1", activity: "Servidores y equipos", category: "electricidad", value: 1260, unit: "kWh", factor: 0.435, status: "real", source: "Medicion", evidence: "medicion-cc1.jpg" },
  { id: "e2", dateISO: "2026-01-16", area: "CC2", activity: "Laboratorio de redes", category: "electricidad", value: 1125, unit: "kWh", factor: 0.435, status: "real", source: "Recibo", evidence: "cfe-cc2.pdf" },
  { id: "e3", dateISO: "2026-02-11", area: "Aulas", activity: "Aulas 1-8", category: "electricidad", value: 760, unit: "kWh", factor: 0.435, status: "est", source: "Estimacion", evidence: "" },
  { id: "e4", dateISO: "2026-03-03", area: "Redes", activity: "Switches 24/7", category: "electricidad", value: 680, unit: "kWh", factor: 0.435, status: "real", source: "Medicion", evidence: "" },
  { id: "e5", dateISO: "2026-03-19", area: "Industrial/Calidad", activity: "Taller industrial", category: "electricidad", value: 940, unit: "kWh", factor: 0.435, status: "real", source: "Recibo", evidence: "" },
  { id: "e6", dateISO: "2026-04-07", area: "Agricola", activity: "Bombeo de riego", category: "electricidad", value: 620, unit: "kWh", factor: 0.435, status: "est", source: "Encuesta", evidence: "" },
  { id: "e7", dateISO: "2026-04-21", area: "Administracion", activity: "Oficinas", category: "electricidad", value: 410, unit: "kWh", factor: 0.435, status: "real", source: "Inventario", evidence: "inventario-marzo.xlsx" },
  { id: "e8", dateISO: "2026-05-14", area: "Aulas", activity: "Aulas 9-16", category: "electricidad", value: 1320, unit: "kWh", factor: 0.435, status: "real", source: "Recibo", evidence: "cfe-aulas.pdf" }
];

const fmtN = (n, d = 1) => Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = iso => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? "-" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const mKey = iso => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const mLabel = iso => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? "-" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

function normalizeArea(a = "") {
  const t = String(a).toLowerCase();
  if (t.includes("cc 1") || t.includes("cc1")) return "CC1";
  if (t.includes("cc 2") || t.includes("cc2")) return "CC2";
  if (t.includes("red")) return "Redes";
  if (t.includes("aula")) return "Aulas";
  if (t.includes("industrial") || t.includes("calidad")) return "Industrial/Calidad";
  if (t.includes("agric")) return "Agricola";
  if (t.includes("admin")) return "Administracion";
  return AREAS.includes(a) ? a : "Aulas";
}

function normalizeSource(s = "") {
  const t = String(s).toLowerCase();
  if (t.includes("recibo") || t.includes("cfe")) return "Recibo";
  if (t.includes("medi")) return "Medicion";
  if (t.includes("encu")) return "Encuesta";
  if (t.includes("inven")) return "Inventario";
  if (t.includes("estim")) return "Estimacion";
  return SOURCES.includes(s) ? s : "Medicion";
}

function toRec(r, id) {
  const value = Number(r?.value) || 0;
  const factor = Number(r?.factor) > 0 ? Number(r.factor) : 0.435;
  const co2e = Number(r?.co2e_kg) > 0 ? Number(r.co2e_kg) : value * factor;
  return {
    id: String(r?.id || id),
    dateISO: String(r?.dateISO || ""),
    area: normalizeArea(r?.area),
    activity: String(r?.activity || "Sin actividad"),
    category: "electricidad",
    value,
    unit: "kWh",
    factor,
    co2e_kg: co2e,
    status: r?.status === "est" || r?.isEstimated ? "est" : "real",
    source: normalizeSource(r?.source),
    evidence: String(r?.evidence || r?.note || "")
  };
}

function loadAllRecords() {
  let storageError = "";
  let parsed = [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) { const j = JSON.parse(raw); if (Array.isArray(j)) parsed = j; }
  } catch {
    storageError = "No se pudieron cargar los datos...";
  }
  const all = [...parsed, ...BASE].filter(r => (r?.category === "electricidad") || String(r?.unit || "").toLowerCase() === "kwh" || (Number(r?.factor) > 0 && Number(r?.factor) < 1));
  const byId = new Map();
  all.forEach((r, i) => { const id = String(r?.id || `el-${i}`); if (!byId.has(id)) byId.set(id, toRec(r, id)); });
  return { records: Array.from(byId.values()), storageError };
}

function EcoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)", minWidth: 150 }}><p style={{ margin: "0 0 6px", fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,.7)" }}>{label}</p>{payload.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} /><span style={{ fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,.7)", flex: 1 }}>{p.name}</span><span style={{ fontFamily: fm, fontSize: 12, color: "white" }}>{fmtN(p.value, 1)}</span></div>)}</div>;
}

function Badge({ status }) { const real = status === "real"; return <span style={{ fontFamily: fb, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--eco-radius-full)", background: real ? "var(--eco-success-bg)" : "var(--eco-warning-bg)", color: real ? "var(--eco-success)" : "var(--eco-secondary-600)", border: `1px solid ${real ? "#BBF7D0" : "#FDE68A"}` }}>{real ? "Real" : "Estimado"}</span>; }

function DrillPanel({ title, onClose, children }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: "flex-end" }}><div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.35)" }} onClick={onClose} /><div style={{ width: "100%", maxWidth: 560, background: "white", boxShadow: "var(--eco-shadow-lg)", display: "flex", flexDirection: "column" }}><div style={{ padding: "16px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><h3 style={{ margin: 0, fontFamily: fd, fontSize: 18 }}>{title}</h3><button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", border: "none", background: "var(--eco-gray-100)", cursor: "pointer" }}><X size={16} /></button></div><div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div></div></div>;
}

export default function ScopeElectricidadPage({ onOpenRecord }) {
  const today = new Date();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [periodMode, setPeriodMode] = useState("mes");
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fArea, setFArea] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSource, setFSource] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [drill, setDrill] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const d = loadAllRecords();
      setRecords(d.records.sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
      setStorageError(d.storageError);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { const h = e => { reload(); if (e?.detail?.category === "electricidad") setToast({ title: "Registro guardado", message: `${normalizeArea(e.detail.area)} - ${fmtN(e.detail.co2e_kg, 1)} kgCO2e` }); }; window.addEventListener("carbontrack:newrecord", h); window.addEventListener("storage", h); return () => { window.removeEventListener("carbontrack:newrecord", h); window.removeEventListener("storage", h); }; }, [reload]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const pFiltered = useMemo(() => {
    if (periodMode === "mes") { const ym = `${year}-${String(month).padStart(2, "0")}`; return records.filter(r => mKey(r.dateISO) === ym); }
    return records.filter(r => { const t = new Date(`${r.dateISO}T12:00:00`).getTime(); if (fromDate && t < new Date(`${fromDate}T00:00:00`).getTime()) return false; if (toDate && t > new Date(`${toDate}T23:59:59`).getTime()) return false; return true; });
  }, [records, periodMode, month, year, fromDate, toDate]);

  const filtered = useMemo(() => pFiltered.filter(r => (!fArea || r.area === fArea) && (!fStatus || r.status === fStatus) && (!fSource || r.source === fSource)), [pFiltered, fArea, fStatus, fSource]);
  const lineData = useMemo(() => { const m = {}; filtered.forEach(r => { const k = mLabel(r.dateISO); if (!m[k]) m[k] = { label: k, kwh: 0, co2e: 0 }; m[k].kwh += r.value; m[k].co2e += r.co2e_kg; }); return Object.values(m); }, [filtered]);
  const areaBars = useMemo(() => { const m = {}; filtered.forEach(r => { m[r.area] = (m[r.area] || 0) + r.co2e_kg; }); return Object.keys(m).map(k => ({ area: k, co2e: m[k] })); }, [filtered]);
  const sourceDonut = useMemo(() => { const m = {}; filtered.forEach(r => { m[r.source] = (m[r.source] || 0) + r.co2e_kg; }); const t = Object.values(m).reduce((s, v) => s + v, 0) || 1; const c = { Recibo: "#22C55E", Medicion: "#3B82F6", Encuesta: "#EAB308", Inventario: "#06B6D4", Estimacion: "#94A3B8" }; return Object.keys(m).map(k => ({ name: k, value: m[k], pct: Math.round((m[k] / t) * 100), color: c[k] || "#94A3B8" })); }, [filtered]);
  const statusDonut = useMemo(() => { const r = filtered.filter(x => x.status === "real").length; const e = filtered.filter(x => x.status === "est").length; const t = r + e || 1; return [{ name: "Real", value: r, pct: Math.round((r / t) * 100), color: "#22C55E" }, { name: "Estimado", value: e, pct: Math.round((e / t) * 100), color: "#EAB308" }].filter(x => x.value > 0); }, [filtered]);

  const kwh = filtered.reduce((s, r) => s + r.value, 0);
  const co2 = filtered.reduce((s, r) => s + r.co2e_kg, 0);
  const factor = kwh > 0 ? co2 / kwh : null;
  const pctReal = filtered.length ? Math.round((filtered.filter(r => r.status === "real").length / filtered.length) * 100) : 0;
  const change = "—";

  const exportCsv = () => { const header = ["Fecha", "Area", "Actividad", "kWh", "Factor", "CO2eKg", "Estado", "Fuente", "Evidencia"]; const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`; const body = filtered.map(r => [r.dateISO, r.area, r.activity, r.value, r.factor, r.co2e_kg, r.status === "real" ? "Real" : "Estimado", r.source, r.evidence || ""]); const csv = [header.map(esc).join(","), ...body.map(row => row.map(esc).join(","))].join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `scope2-electricidad-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url); setToast({ title: "Exportacion lista", message: `${filtered.length} registros exportados.` }); };

  const clear = () => { setPeriodMode("mes"); setMonth(today.getMonth() + 1); setYear(today.getFullYear()); setFromDate(""); setToDate(""); setFArea(""); setFStatus(""); setFSource(""); };
  const related = useMemo(() => drill ? filtered.filter(r => r.id !== drill.id).slice(0, 5) : [], [drill, filtered]);

  return (<>
    <div style={{ padding: "var(--page-pad-y,24px) var(--page-pad-x,24px)", maxWidth: "var(--content-max,1440px)", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}><div style={{ display: "flex", gap: 10 }}><div style={{ width: 38, height: 38, borderRadius: "var(--eco-radius-md)", background: "linear-gradient(135deg,#22C55E,#15803D)", display: "grid", placeItems: "center" }}><Zap size={18} color="white" /></div><div><h1 style={{ margin: 0, fontFamily: fd, fontSize: 24 }}>Scope 2 — Electricidad</h1><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>Analiza consumo electrico (kWh) y emisiones (CO2e). Haz clic en graficas para filtrar.</p></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={onOpenRecord} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "none", background: "var(--eco-primary-500)", color: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={14} />Nuevo registro</button><button onClick={exportCsv} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={14} />Exportar</button><button onClick={() => setDrill(filtered[0] || null)} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Eye size={14} />Ver trazabilidad</button></div></div>

      {storageError && <div style={{ marginBottom: 12, border: "1px solid #FECACA", background: "var(--eco-danger-bg)", borderRadius: "var(--eco-radius-md)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} style={{ color: "var(--eco-danger)" }} /><span style={{ fontFamily: fb, fontSize: 12 }}>No se pudieron cargar los datos...</span></div>}

      <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", marginBottom: 20 }}><button onClick={() => setFiltersOpen(v => !v)} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Filter size={14} /><span style={{ fontFamily: fd, fontSize: 14 }}>Filtros</span></div><ChevronDown size={16} /></button>{filtersOpen && <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}><select value={periodMode} onChange={e => setPeriodMode(e.target.value)}><option value="mes">Mes / Ano</option><option value="rango">Rango</option></select>{periodMode === "mes" ? <><select value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select><select value={year} onChange={e => setYear(Number(e.target.value))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></> : <><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></>}<select value={fArea} onChange={e => setFArea(e.target.value)}><option value="">Todas las areas</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select><select value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="">Real/Estimado</option><option value="real">Real</option><option value="est">Estimado</option></select><select value={fSource} onChange={e => setFSource(e.target.value)}><option value="">Todas las fuentes</option>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select><button onClick={clear} style={{ height: 34, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><RotateCcw size={12} />Limpiar filtros</button></div>}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 20 }}>{[{ t: "kWh total", v: fmtN(kwh, 1), u: "kWh", i: <Activity size={16} /> }, { t: "CO2e total", v: fmtN(co2, 1), u: "kg", i: <Leaf size={16} /> }, { t: "Factor promedio", v: factor ? fmtN(factor, 3) : "—", u: "kgCO2e/kWh", i: <Gauge size={16} /> }, { t: "% Real", v: `${pctReal}`, u: "%", i: <CheckCircle2 size={16} /> }, { t: "Cambio", v: change, u: "", i: <Minus size={16} /> }].map(c => <div key={c.t} style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 14 }}><div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-primary-50)", color: "var(--eco-primary-600)", display: "grid", placeItems: "center" }}>{c.i}</div><span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{c.t}</span></div><div style={{ fontFamily: fm, fontSize: 24, fontWeight: 700 }}>{c.v} <span style={{ fontSize: 11, color: "var(--eco-gray-400)" }}>{c.u}</span></div></div>)}</div>

      {loading ? <div style={{ padding: 30, background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", fontFamily: fb }}>Cargando...</div> : <>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}><div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 10 }}><ResponsiveContainer width="100%" height={240}><LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="label" /><YAxis yAxisId="l" /><YAxis yAxisId="r" orientation="right" /><RTooltip content={<EcoTooltip />} /><Line yAxisId="l" dataKey="kwh" name="kWh" stroke="#22C55E" /><Line yAxisId="r" dataKey="co2e" name="CO2e (kg)" stroke="#3B82F6" /></LineChart></ResponsiveContainer></div><div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 10 }}><ResponsiveContainer width="100%" height={240}><BarChart data={areaBars}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="area" /><YAxis /><RTooltip content={<EcoTooltip />} /><Bar dataKey="co2e" name="CO2e" onClick={d => setFArea(p => p === d.area ? "" : d.area)}>{areaBars.map((a, i) => <Cell key={a.area} fill={i % 2 ? "#86EFAC" : "#22C55E"} />)}</Bar></BarChart></ResponsiveContainer></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}><div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 10 }}><ResponsiveContainer width="100%" height={220}><RPieChart><Pie data={sourceDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} onClick={d => setFSource(p => p === d.name ? "" : d.name)}>{sourceDonut.map(d => <Cell key={d.name} fill={d.color} />)}</Pie><RTooltip content={<EcoTooltip />} /></RPieChart></ResponsiveContainer></div><div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 10 }}><ResponsiveContainer width="100%" height={220}><RPieChart><Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} onClick={d => setFStatus(p => p === (d.name === "Real" ? "real" : "est") ? "" : (d.name === "Real" ? "real" : "est"))}>{statusDonut.map(d => <Cell key={d.name} fill={d.color} />)}</Pie><RTooltip content={<EcoTooltip />} /></RPieChart></ResponsiveContainer></div></div>

        {filtered.length === 0 ? <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 40, textAlign: "center" }}><FileX size={28} style={{ color: "var(--eco-gray-400)" }} /><p style={{ fontFamily: fd, margin: "8px 0 4px" }}>Sin registros</p><p style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", margin: 0 }}>No hay registros con estos filtros...</p></div> : <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}><thead><tr style={{ background: "var(--eco-gray-50)" }}>{["Fecha", "Area", "Actividad", "kWh", "Factor", "CO2e", "Estado", "Fuente", "Evidencia", ""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--eco-gray-500)" }}>{h}</th>)}</tr></thead><tbody>{filtered.map((r, i) => <tr key={r.id} style={{ borderTop: i ? "1px solid var(--eco-gray-100)" : "none" }}><td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12 }}>{fmtDate(r.dateISO)}</td><td style={{ padding: "10px 12px", fontWeight: 600 }}>{r.area}</td><td style={{ padding: "10px 12px" }}>{r.activity}</td><td style={{ padding: "10px 12px", fontFamily: fm }}>{fmtN(r.value, 1)} kWh</td><td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12 }}>{fmtN(r.factor, 3)}</td><td style={{ padding: "10px 12px", fontFamily: fm, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fmtN(r.co2e_kg, 1)} kg</td><td style={{ padding: "10px 12px" }}><Badge status={r.status} /></td><td style={{ padding: "10px 12px", fontSize: 12 }}>{r.source}</td><td style={{ padding: "10px 12px", fontSize: 12 }}>{r.evidence ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Paperclip size={11} />{r.evidence}</span> : "—"}</td><td style={{ padding: "10px 12px" }}><button onClick={() => setDrill(r)} style={{ height: 28, padding: "0 10px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 11, cursor: "pointer" }}>Ver trazabilidad</button></td></tr>)}</tbody></table></div></div>}
      </>}
    </div>

    {toast && <div style={{ position: "fixed", right: 20, bottom: 20, background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-lg)", padding: "12px 14px", minWidth: 260, zIndex: 120 }}><p style={{ margin: 0, fontFamily: fd, fontSize: 14 }}>{toast.title}</p><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{toast.message}</p></div>}

    {drill && <DrillPanel title="Trazabilidad de electricidad" onClose={() => setDrill(null)}><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><div style={{ background: "var(--eco-primary-50)", border: "1px solid #BBF7D0", borderRadius: "var(--eco-radius-md)", padding: 14, textAlign: "center" }}><p style={{ margin: "0 0 8px", fontFamily: fb, fontSize: 12 }}>Calculo: consumo × factor = CO2e</p><p style={{ margin: 0, fontFamily: fm, fontSize: 18 }}>{fmtN(drill.value, 1)} kWh × {fmtN(drill.factor, 3)} kgCO2e/kWh = <span style={{ color: "var(--eco-primary-700)", fontWeight: 700 }}>{fmtN(drill.co2e_kg, 1)} kgCO2e</span></p></div><div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-md)" }}>{[{ l: "Area", v: drill.area }, { l: "Periodo", v: periodMode === "mes" ? `${MONTHS[month - 1]} ${year}` : `${fromDate || "-"} a ${toDate || "-"}` }, { l: "Fuente", v: drill.source }, { l: "Estado", v: drill.status === "real" ? "Real" : "Estimado" }, { l: "Evidencia", v: drill.evidence || "—" }].map(r => <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderTop: "1px solid var(--eco-gray-100)" }}><span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{r.l}</span><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600 }}>{r.v}</span></div>)}</div><div><p style={{ margin: "0 0 8px", fontFamily: fd, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><ArrowRight size={12} />Registros relacionados</p>{related.length ? related.map(r => <button key={r.id} onClick={() => setDrill(r)} style={{ width: "100%", marginBottom: 6, border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-md)", background: "white", padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-gray-500)", minWidth: 70 }}>{fmtDate(r.dateISO).slice(0, 6)}</span><span style={{ flex: 1, textAlign: "left", fontFamily: fb, fontSize: 12 }}>{r.activity}</span><Badge status={r.status} /><span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fmtN(r.co2e_kg, 1)} kg</span><ChevronRight size={12} /></button>) : <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>No hay registros relacionados.</p>}</div></div></DrillPanel>}
  </>);
}
