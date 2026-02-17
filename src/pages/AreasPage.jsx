import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  FileX,
  Filter,
  Flame,
  Leaf,
  Plus,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";
const RECORDS_KEY = "carbontrack.records";
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const AREA_DEFS = [
  { id: "cc1", label: "Centro de computo 1", aliases: ["cc 1", "cc1", "centro de computo 1"] },
  { id: "cc2", label: "Centro de computo 2", aliases: ["cc 2", "cc2", "centro de computo 2"] },
  { id: "redes", label: "Taller de redes", aliases: ["redes", "taller de redes"] },
  { id: "aulas", label: "Aulas (16)", aliases: ["aulas", "aula"] },
  { id: "juntas", label: "Sala de juntas", aliases: ["juntas", "sala de juntas"] },
  { id: "admin", label: "Areas administrativas", aliases: ["admin", "administracion", "areas administrativas"] },
  { id: "agricola", label: "Innovacion agricola (tractor y vivero)", aliases: ["agricola", "tractor", "vivero"] },
  { id: "industrial", label: "Talleres Industrial y Calidad", aliases: ["industrial", "calidad", "industrial/calidad"] },
];

const SCOPE_COLORS = { electricidad: "#22C55E", combustible: "#EAB308", otros: "#64748B" };
const SOURCE_COLORS = { Recibo: "#22C55E", Medicion: "#3B82F6", Encuesta: "#EAB308", Inventario: "#06B6D4", Estimacion: "#94A3B8" };
const STATUS_COLORS = { real: "#22C55E", est: "#EAB308" };

const BASE_SEED = [
  { id: "ar-s1", dateISO: "2026-01-10", area: "CC 1", category: "electricidad", unit: "kWh", value: 1260, factor: 0.435, source: "Recibo", status: "real", activity: "Equipos de laboratorio" },
  { id: "ar-s2", dateISO: "2026-01-12", area: "CC 2", category: "electricidad", unit: "kWh", value: 1170, factor: 0.435, source: "Medicion", status: "real", activity: "Servidores y switches" },
  { id: "ar-s3", dateISO: "2026-01-15", area: "Taller de Redes", category: "electricidad", unit: "kWh", value: 770, factor: 0.435, source: "Medicion", status: "real", activity: "Rack de comunicaciones" },
  { id: "ar-s4", dateISO: "2026-01-20", area: "Aulas", category: "electricidad", unit: "kWh", value: 1680, factor: 0.435, source: "Recibo", status: "est", activity: "Iluminacion y proyectores" },
  { id: "ar-s5", dateISO: "2026-02-03", area: "Sala de juntas", category: "electricidad", unit: "kWh", value: 210, factor: 0.435, source: "Encuesta", status: "est", activity: "Reuniones administrativas" },
  { id: "ar-s6", dateISO: "2026-02-08", area: "Admin", category: "electricidad", unit: "kWh", value: 460, factor: 0.435, source: "Recibo", status: "real", activity: "Oficinas administrativas" },
  { id: "ar-s7", dateISO: "2026-02-16", area: "Agricola", category: "combustible", fuelType: "Diesel", unit: "L", value: 38, factor: 2.68, source: "Inventario", status: "real", activity: "Tractor de riego", evidenceUrl: "ticket-diesel-feb.pdf" },
  { id: "ar-s8", dateISO: "2026-02-22", area: "Vivero", category: "combustible", fuelType: "Gasolina", unit: "L", value: 26, factor: 2.31, source: "Recibo", status: "real", activity: "Traslado de insumos" },
  { id: "ar-s9", dateISO: "2026-03-07", area: "Industrial", category: "electricidad", unit: "kWh", value: 980, factor: 0.435, source: "Recibo", status: "real", activity: "Maquinas de taller" },
  { id: "ar-s10", dateISO: "2026-03-18", area: "Calidad", category: "electricidad", unit: "kWh", value: 540, factor: 0.435, source: "Medicion", status: "real", activity: "Banco de pruebas" },
  { id: "ar-s11", dateISO: "2026-04-10", area: "Aulas", category: "otros", unit: "unidad", value: 12, factor: 6.2, source: "Inventario", status: "est", activity: "Residuos no valorizables" },
  { id: "ar-s12", dateISO: "2026-04-12", area: "Sala de juntas", category: "electricidad", unit: "kWh", value: 180, factor: 0.435, source: "Recibo", status: "real", activity: "Climatizacion" },
];

const selectStyle = { height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)", background: "white", outline: "none" };
const inputStyle = { ...selectStyle };

const fN = (n, d = 1) => Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const toMonthKey = (iso) => { const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const toMonthLabel = (iso) => { const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "—"; return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; };
const toDateLabel = (iso) => { const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "—"; return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; };

function normalizeSource(source) {
  const t = String(source || "").toLowerCase();
  if (t.includes("recibo") || t.includes("cfe")) return "Recibo";
  if (t.includes("medi")) return "Medicion";
  if (t.includes("encu")) return "Encuesta";
  if (t.includes("inven")) return "Inventario";
  if (t.includes("estim")) return "Estimacion";
  return "Medicion";
}

function normalizeCategory(r) {
  const c = String(r?.category || "").toLowerCase();
  const unit = String(r?.unit || "").toLowerCase();
  if (c.includes("elec") || unit === "kwh") return "electricidad";
  if (c.includes("comb") || unit === "l" || unit === "lt" || unit === "litros") return "combustible";
  return c === "otros" ? "otros" : "electricidad";
}

function normalizeArea(raw) {
  const t = String(raw || "").toLowerCase().trim();
  const found = AREA_DEFS.find(a => a.aliases.some(alias => t.includes(alias)));
  return found || AREA_DEFS[0];
}

function toNormalizedRecord(input, fallbackId) {
  const area = normalizeArea(input?.area);
  const category = normalizeCategory(input);
  const unit = String(input?.unit || (category === "combustible" ? "L" : category === "electricidad" ? "kWh" : "unidad"));
  const value = Number(input?.value) || 0;
  const factor = Number(input?.factor) > 0 ? Number(input?.factor) : category === "combustible" ? 2.68 : category === "electricidad" ? 0.435 : 1;
  const co2eKg = Number(input?.co2e_kg) > 0 ? Number(input?.co2e_kg) : value * factor;
  const isEstimated = Boolean(input?.isEstimated) || input?.status === "est";
  return { id: String(input?.id || fallbackId), dateISO: String(input?.dateISO || new Date().toISOString().slice(0, 10)), areaId: area.id, areaLabel: area.label, category, unit, value, factor, co2e_kg: co2eKg, co2e_t: co2eKg / 1000, isEstimated, status: isEstimated ? "est" : "real", source: normalizeSource(input?.source), activity: String(input?.activity || "Sin actividad"), note: String(input?.note || ""), evidenceUrl: String(input?.evidenceUrl || input?.evidence || ""), fuelType: String(input?.fuelType || "") };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const fromStorage = Array.isArray(parsed) ? parsed : [];
    const merged = [...fromStorage, ...BASE_SEED];
    const byId = new Map();
    merged.forEach((r, i) => { const id = String(r?.id || `rec-${i}`); if (!byId.has(id)) byId.set(id, toNormalizedRecord(r, id)); });
    return { records: Array.from(byId.values()), error: "" };
  } catch {
    return { records: BASE_SEED.map((r, i) => toNormalizedRecord(r, `seed-${i}`)), error: "No se pudieron cargar los datos. Reintenta." };
  }
}

function matchesPeriod(record, periodMode, month, year, fromDate, toDate) {
  if (periodMode === "mes") return toMonthKey(record.dateISO) === `${year}-${String(month).padStart(2, "0")}`;
  const t = new Date(`${record.dateISO}T12:00:00`).getTime();
  if (fromDate && t < new Date(`${fromDate}T00:00:00`).getTime()) return false;
  if (toDate && t > new Date(`${toDate}T23:59:59`).getTime()) return false;
  return true;
}

function runFilters(records, filters) {
  return records.filter(r => {
    if (!matchesPeriod(r, filters.periodMode, filters.month, filters.year, filters.fromDate, filters.toDate)) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.source && r.source !== filters.source) return false;
    if (filters.areaId && r.areaId !== filters.areaId) return false;
    if (filters.fuelType && r.category === "combustible" && String(r.fuelType || "").toLowerCase() !== filters.fuelType.toLowerCase()) return false;
    return true;
  });
}

function buildCsv(rows) {
  const headers = ["Fecha", "Area", "Categoria", "Actividad", "Valor", "Unidad", "Factor", "CO2e_kg", "CO2e_t", "Estado", "Fuente", "Evidencia"];
  const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const body = rows.map(r => [r.dateISO, r.areaLabel, r.category, r.activity, r.value, r.unit, r.factor, r.co2e_kg, r.co2e_t, r.status === "real" ? "Real" : "Estimado", r.source, r.evidenceUrl || "—"]);
  return [headers.map(esc).join(","), ...body.map(row => row.map(esc).join(","))].join("\n");
}

function downloadCsv(filename, rows) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SectionLabel({ children, action, actionLabel }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ margin: 0, fontFamily: fd, fontSize: 17, fontWeight: 700, color: "var(--eco-gray-800)" }}>{children}</h2>{action && <button onClick={action} style={{ fontFamily: fb, fontSize: 13, fontWeight: 500, color: "var(--eco-primary-600)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>{actionLabel || "Ver todo"}<ArrowRight size={14} /></button>}</div>;
}

function ChartCard({ title, sub, children }) {
  return <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden", animation: "eco-fadeInUp 0.35s ease-out" }}><div style={{ padding: "16px 18px 8px" }}><p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-800)" }}>{title}</p>{sub && <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)" }}>{sub}</p>}</div><div style={{ padding: "4px 10px 14px" }}>{children}</div></div>;
}

function KpiCard({ title, value, unit, icon, sub }) {
  return <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", padding: 16, border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-sm)", animation: "eco-fadeInUp 0.35s ease-out" }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 36, height: 36, borderRadius: "var(--eco-radius-md)", background: "var(--eco-primary-50)", color: "var(--eco-primary-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div><p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", fontWeight: 500 }}>{title}</p></div><p style={{ margin: 0, fontFamily: fm, fontSize: 25, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.02em" }}>{value} <span style={{ fontSize: 12, color: "var(--eco-gray-400)", fontWeight: 500 }}>{unit}</span></p>{sub && <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{sub}</p>}</div>;
}

function Badge({ status }) { const isReal = status === "real"; return <span style={{ fontFamily: fb, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--eco-radius-full)", background: isReal ? "var(--eco-success-bg)" : "var(--eco-warning-bg)", color: isReal ? "var(--eco-success)" : "var(--eco-secondary-600)", border: `1px solid ${isReal ? "#BBF7D0" : "#FDE68A"}` }}>{isReal ? "Real" : "Estimado"}</span>; }

function EcoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)", minWidth: 150 }}><p style={{ margin: "0 0 6px", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{label}</p>{payload.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} /><span style={{ flex: 1, fontFamily: fb, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{p.name}</span><span style={{ fontFamily: fm, fontSize: 12, color: "white" }}>{fN(p.value, 2)}</span></div>)}</div>;
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return <div style={{ background: "var(--eco-gray-900)", borderRadius: "var(--eco-radius-md)", padding: "10px 14px", boxShadow: "var(--eco-shadow-lg)" }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: d.payload?.color || d.color }} /><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "white" }}>{d.name}</span></div><span style={{ fontFamily: fm, fontSize: 14, fontWeight: 700, color: "white" }}>{fN(d.value, 2)}</span><span style={{ marginLeft: 6, fontFamily: fb, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>({d.payload?.pct || 0}%)</span></div>;
}

function DrillPanel({ title, onClose, children }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end", animation: "eco-fadeIn 0.2s ease-out" }}><div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.3)", backdropFilter: "blur(2px)" }} onClick={onClose} /><div style={{ position: "relative", width: "100%", maxWidth: 560, background: "white", boxShadow: "var(--eco-shadow-lg)", display: "flex", flexDirection: "column", animation: "eco-fadeInUp 0.3s ease-out" }}><div style={{ padding: "16px 20px", borderBottom: "1px solid var(--eco-gray-200)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)" }}>{title}</h3><button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", border: "none", background: "var(--eco-gray-100)", color: "var(--eco-gray-500)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button></div><div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div></div></div>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120, background: "white", border: "1px solid var(--eco-gray-200)", boxShadow: "var(--eco-shadow-lg)", borderRadius: "var(--eco-radius-lg)", padding: "12px 14px", minWidth: 260, animation: "eco-fadeInUp 0.25s ease-out" }}><p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{toast.title}</p><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{toast.message}</p></div>;
}

function SkeletonBlock({ height = 120 }) {
  return <div style={{ background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", height, overflow: "hidden" }}><div style={{ height: "100%", background: "linear-gradient(90deg, var(--eco-gray-100) 25%, var(--eco-gray-200) 50%, var(--eco-gray-100) 75%)", backgroundSize: "200% 100%", animation: "eco-shimmer 1.6s ease-in-out infinite" }} /></div>;
}
function FiltersHeader({ title, microcopy, onOpenRecord, onExport, onTrace, filters, setFilters, showFuelFilter, onClear }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: fd, fontSize: 24, fontWeight: 800, color: "var(--eco-gray-900)" }}>{title}</h1>
          <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>{microcopy}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onOpenRecord} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "none", background: "var(--eco-primary-500)", color: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={14} />Nuevo registro</button>
          <button onClick={onExport} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={14} />Exportar</button>
          <button onClick={onTrace} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Eye size={14} />Ver trazabilidad</button>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: 14, marginBottom: 18, animation: "eco-fadeInUp 0.35s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Filter size={14} style={{ color: "var(--eco-gray-500)" }} /><span style={{ fontFamily: fd, fontSize: 14, color: "var(--eco-gray-700)", fontWeight: 700 }}>Filtros</span></div>
        <p style={{ margin: "0 0 10px", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Filtra para ver resultados precisos.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          <select value={filters.periodMode} onChange={e => setFilters(prev => ({ ...prev, periodMode: e.target.value }))} style={selectStyle}><option value="mes">Mes / Año</option><option value="rango">Rango</option></select>
          {filters.periodMode === "mes" ? (
            <>
              <select value={filters.month} onChange={e => setFilters(prev => ({ ...prev, month: Number(e.target.value) }))} style={selectStyle}>{MONTHS_ES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
              <select value={filters.year} onChange={e => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))} style={selectStyle}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
            </>
          ) : (
            <>
              <input type="date" value={filters.fromDate} onChange={e => setFilters(prev => ({ ...prev, fromDate: e.target.value }))} style={inputStyle} />
              <input type="date" value={filters.toDate} onChange={e => setFilters(prev => ({ ...prev, toDate: e.target.value }))} style={inputStyle} />
            </>
          )}
          <select value={filters.category} onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))} style={selectStyle}><option value="">Todas las categorias</option><option value="electricidad">Electricidad</option><option value="combustible">Combustible</option><option value="otros">Otros</option></select>
          <select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))} style={selectStyle}><option value="">Real / Estimado</option><option value="real">Real</option><option value="est">Estimado</option></select>
          <select value={filters.source} onChange={e => setFilters(prev => ({ ...prev, source: e.target.value }))} style={selectStyle}><option value="">Todas las fuentes</option>{Object.keys(SOURCE_COLORS).map(s => <option key={s} value={s}>{s}</option>)}</select>
          {showFuelFilter && <select value={filters.fuelType} onChange={e => setFilters(prev => ({ ...prev, fuelType: e.target.value }))} style={selectStyle}><option value="">Tipo combustible</option><option value="Diesel">Diesel</option><option value="Gasolina">Gasolina</option></select>}
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}><button onClick={onClear} style={{ height: 32, padding: "0 12px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-600)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><RotateCcw size={12} />Limpiar filtros</button></div>
      </div>
    </>
  );
}

export default function AreasPage({ onOpenRecord }) {
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [drill, setDrill] = useState(null);
  const [filters, setFilters] = useState({ periodMode: "mes", month: today.getMonth() + 1, year: today.getFullYear(), fromDate: "", toDate: "", category: "", status: "", source: "", areaId: "", fuelType: "" });

  const areaId = useMemo(() => { const m = location.pathname.match(/^\/areas\/([^/]+)/); return m ? m[1] : null; }, [location.pathname]);
  const isDetail = Boolean(areaId);
  const activeArea = AREA_DEFS.find(a => a.id === areaId) || null;

  const reload = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const data = loadRecords();
      setRecords(data.records.sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
      setError(data.error);
      setLoading(false);
    }, 260);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const onNew = () => { reload(); setToast({ title: "Actualización", message: "Registro guardado y aplicado al área." }); };
    window.addEventListener("carbontrack:newrecord", onNew);
    window.addEventListener("storage", onNew);
    return () => { window.removeEventListener("carbontrack:newrecord", onNew); window.removeEventListener("storage", onNew); };
  }, [reload]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (isDetail && !activeArea) navigate("/areas", { replace: true }); }, [isDetail, activeArea, navigate]);

  const listFiltered = useMemo(() => runFilters(records, { ...filters, areaId: "", fuelType: "" }), [records, filters]);
  const detailFiltered = useMemo(() => runFilters(records, { ...filters, areaId: areaId || "", fuelType: filters.category === "combustible" ? filters.fuelType : "" }), [records, filters, areaId]);
  const currentRows = isDetail ? detailFiltered : listFiltered;

  const globalKpis = useMemo(() => {
    const total = listFiltered.reduce((sum, r) => sum + r.co2e_t, 0);
    const scope2 = listFiltered.filter(r => r.category === "electricidad").reduce((sum, r) => sum + r.co2e_t, 0);
    const scope1 = listFiltered.filter(r => r.category === "combustible").reduce((sum, r) => sum + r.co2e_t, 0);
    const pctReal = listFiltered.length ? Math.round((listFiltered.filter(r => r.status === "real").length / listFiltered.length) * 100) : 0;
    let change = "—";
    if (filters.periodMode === "mes") {
      const prevMonth = filters.month === 1 ? 12 : filters.month - 1;
      const prevYear = filters.month === 1 ? filters.year - 1 : filters.year;
      const prev = runFilters(records, { ...filters, month: prevMonth, year: prevYear, areaId: "", fuelType: "" }).reduce((sum, r) => sum + r.co2e_t, 0);
      if (prev > 0) { const delta = ((total - prev) / prev) * 100; change = `${delta > 0 ? "+" : ""}${fN(delta, 1)}%`; }
    }
    return { total, scope2, scope1, pctReal, change };
  }, [listFiltered, filters, records]);

  const areaCards = useMemo(() => AREA_DEFS.map(area => {
    const rows = listFiltered.filter(r => r.areaId === area.id);
    const totalT = rows.reduce((sum, r) => sum + r.co2e_t, 0);
    const elec = rows.filter(r => r.category === "electricidad").reduce((sum, r) => sum + r.co2e_t, 0);
    const fuel = rows.filter(r => r.category === "combustible").reduce((sum, r) => sum + r.co2e_t, 0);
    const real = rows.filter(r => r.status === "real").length;
    const est = rows.filter(r => r.status === "est").length;
    return { ...area, totalT, elec, fuel, dominant: real >= est ? "real" : "est", pctReal: rows.length ? Math.round((real / rows.length) * 100) : 0 };
  }), [listFiltered]);

  const areaBars = useMemo(() => areaCards.map(a => ({ areaId: a.id, area: a.label, co2e: a.totalT })), [areaCards]);
  const categoryDonut = useMemo(() => {
    const e = listFiltered.filter(r => r.category === "electricidad").reduce((s, r) => s + r.co2e_t, 0);
    const c = listFiltered.filter(r => r.category === "combustible").reduce((s, r) => s + r.co2e_t, 0);
    const o = listFiltered.filter(r => r.category === "otros").reduce((s, r) => s + r.co2e_t, 0);
    const total = e + c + o || 1;
    return [{ name: "Electricidad", key: "electricidad", value: e, pct: Math.round((e / total) * 100), color: SCOPE_COLORS.electricidad }, { name: "Combustible", key: "combustible", value: c, pct: Math.round((c / total) * 100), color: SCOPE_COLORS.combustible }, { name: "Otros", key: "otros", value: o, pct: Math.round((o / total) * 100), color: SCOPE_COLORS.otros }].filter(x => x.value > 0);
  }, [listFiltered]);
  const statusDonut = useMemo(() => {
    const r = listFiltered.filter(x => x.status === "real").length;
    const e = listFiltered.filter(x => x.status === "est").length;
    const total = r + e || 1;
    return [{ name: "Real", key: "real", value: r, pct: Math.round((r / total) * 100), color: STATUS_COLORS.real }, { name: "Estimado", key: "est", value: e, pct: Math.round((e / total) * 100), color: STATUS_COLORS.est }].filter(x => x.value > 0);
  }, [listFiltered]);
  const trendData = useMemo(() => {
    const grouped = {};
    listFiltered.forEach(r => { const key = toMonthKey(r.dateISO); if (!grouped[key]) grouped[key] = { key, label: toMonthLabel(r.dateISO), co2e: 0 }; grouped[key].co2e += r.co2e_t; });
    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  }, [listFiltered]);

  const detailKpis = useMemo(() => {
    const totalT = detailFiltered.reduce((s, r) => s + r.co2e_t, 0);
    const eRows = detailFiltered.filter(r => r.category === "electricidad");
    const cRows = detailFiltered.filter(r => r.category === "combustible");
    const eKwh = eRows.reduce((s, r) => s + (r.unit.toLowerCase() === "kwh" ? r.value : 0), 0);
    const eT = eRows.reduce((s, r) => s + r.co2e_t, 0);
    const cLiters = cRows.reduce((s, r) => s + (r.unit.toLowerCase() === "l" ? r.value : 0), 0);
    const cT = cRows.reduce((s, r) => s + r.co2e_t, 0);
    const pctReal = detailFiltered.length ? Math.round((detailFiltered.filter(r => r.status === "real").length / detailFiltered.length) * 100) : 0;
    const sourceCount = detailFiltered.reduce((acc, r) => { acc[r.source] = (acc[r.source] || 0) + 1; return acc; }, {});
    const topSource = Object.keys(sourceCount).sort((a, b) => sourceCount[b] - sourceCount[a])[0] || "—";
    return { totalT, eKwh, eT, cLiters, cT, pctReal, topSource };
  }, [detailFiltered]);

  const detailTrend = useMemo(() => {
    const grouped = {};
    detailFiltered.forEach(r => { const key = toMonthKey(r.dateISO); if (!grouped[key]) grouped[key] = { key, label: toMonthLabel(r.dateISO), co2e: 0 }; grouped[key].co2e += r.co2e_t; });
    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  }, [detailFiltered]);
  const detailCategories = useMemo(() => {
    const by = { electricidad: 0, combustible: 0, otros: 0 };
    detailFiltered.forEach(r => { by[r.category] = (by[r.category] || 0) + r.co2e_t; });
    return [{ name: "Electricidad", key: "electricidad", value: by.electricidad, color: SCOPE_COLORS.electricidad }, { name: "Combustible", key: "combustible", value: by.combustible, color: SCOPE_COLORS.combustible }, { name: "Otros", key: "otros", value: by.otros, color: SCOPE_COLORS.otros }].filter(x => x.value > 0);
  }, [detailFiltered]);
  const detailStatus = useMemo(() => {
    const real = detailFiltered.filter(r => r.status === "real").length;
    const est = detailFiltered.filter(r => r.status === "est").length;
    const total = real + est || 1;
    return [{ name: "Real", key: "real", value: real, pct: Math.round((real / total) * 100), color: STATUS_COLORS.real }, { name: "Estimado", key: "est", value: est, pct: Math.round((est / total) * 100), color: STATUS_COLORS.est }].filter(x => x.value > 0);
  }, [detailFiltered]);
  const detailSources = useMemo(() => {
    const by = {};
    detailFiltered.forEach(r => { by[r.source] = (by[r.source] || 0) + r.co2e_t; });
    return Object.keys(by).map(s => ({ name: s, value: by[s], color: SOURCE_COLORS[s] || "#94A3B8" }));
  }, [detailFiltered]);
  const sortedDetailRows = useMemo(() => [...detailFiltered].sort((a, b) => b.dateISO.localeCompare(a.dateISO)), [detailFiltered]);

  const clearFilters = () => setFilters(prev => ({ ...prev, periodMode: "mes", month: today.getMonth() + 1, year: today.getFullYear(), fromDate: "", toDate: "", category: "", status: "", source: "", fuelType: "" }));
  const exportCurrent = () => { const rows = isDetail ? sortedDetailRows : listFiltered; const name = isDetail ? `areas-${areaId}-${new Date().toISOString().slice(0, 10)}.csv` : `areas-resumen-${new Date().toISOString().slice(0, 10)}.csv`; downloadCsv(name, rows); setToast({ title: "Exportación", message: "CSV exportado." }); };
  const openTrace = (row = null) => setDrill({ row: row || currentRows[0] || null });
  const navigateCategory = (cat) => { navigate(cat === "combustible" ? "/scope/combustible" : "/scope/electricidad"); setDrill(null); };
  const renderList = () => (
    <>
      <FiltersHeader title="Áreas" microcopy="Selecciona un área para ver consumo, emisiones (CO₂e) y registros. Haz clic en gráficas para filtrar." onOpenRecord={onOpenRecord} onExport={exportCurrent} onTrace={() => openTrace(null)} filters={filters} setFilters={setFilters} showFuelFilter={false} onClear={clearFilters} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard title="Total CO2e" value={fN(globalKpis.total, 2)} unit="tCO2e" icon={<Leaf size={17} />} />
        <KpiCard title="Scope 2" value={fN(globalKpis.scope2, 2)} unit="tCO2e" icon={<Zap size={17} />} />
        <KpiCard title="Scope 1" value={fN(globalKpis.scope1, 2)} unit="tCO2e" icon={<Flame size={17} />} />
        <KpiCard title="% Real" value={String(globalKpis.pctReal)} unit="%" icon={<CheckCircle2 size={17} />} />
        <KpiCard title="Cambio vs periodo anterior" value={globalKpis.change} unit="" icon={<Calendar size={17} />} />
      </div>

      <SectionLabel>Listado de Áreas</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: 18 }}>
        {areaCards.map(card => (
          <div key={card.id} style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", padding: 14, cursor: "pointer", transition: "all 150ms", animation: "eco-fadeInUp 0.35s ease-out" }} onClick={() => navigate(`/areas/${card.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}><p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{card.label}</p><Badge status={card.dominant} /></div>
            <p style={{ margin: "0 0 2px", fontFamily: fm, fontSize: 22, fontWeight: 700, color: "var(--eco-gray-900)" }}>{fN(card.totalT, 3)} <span style={{ fontSize: 11, color: "var(--eco-gray-400)", fontWeight: 500 }}>tCO2e</span></p>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>Electricidad: {fN(card.elec, 2)} t</span><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>Combustible: {fN(card.fuel, 2)} t</span><span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>Real {card.pctReal}%</span></div>
            <button style={{ marginTop: 10, height: 30, padding: "0 10px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)", cursor: "pointer" }}>Ver detalle</button>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 18 }}>
        <ChartCard title="CO2e por area" sub="Click en barra para ir al detalle"><ResponsiveContainer width="100%" height={250}><BarChart data={areaBars} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="area" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Bar dataKey="co2e" name="CO2e" radius={[4, 4, 0, 0]} cursor="pointer" onClick={d => d?.areaId && navigate(`/areas/${d.areaId}`)}>{areaBars.map((row, i) => <Cell key={row.areaId} fill={i % 2 === 0 ? "#22C55E" : "#86EFAC"} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Categorias" sub="Click para filtrar"><ResponsiveContainer width="100%" height={250}><RPieChart><Pie data={categoryDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={84} paddingAngle={3} onClick={d => setFilters(prev => ({ ...prev, category: prev.category === d.key ? "" : d.key }))} cursor="pointer">{categoryDonut.map(d => <Cell key={d.key} fill={d.color} stroke="white" strokeWidth={2} />)}</Pie><RTooltip content={<DonutTooltip />} /></RPieChart></ResponsiveContainer></ChartCard>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ChartCard title="Real vs Estimado" sub="Click para filtrar estado"><ResponsiveContainer width="100%" height={220}><RPieChart><Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} onClick={d => setFilters(prev => ({ ...prev, status: prev.status === d.key ? "" : d.key }))} cursor="pointer">{statusDonut.map(d => <Cell key={d.key} fill={d.color} stroke="white" strokeWidth={2} />)}</Pie><RTooltip content={<DonutTooltip />} /></RPieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Tendencia general" sub="CO2e por tiempo"><ResponsiveContainer width="100%" height={220}><LineChart data={trendData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="label" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Line type="monotone" dataKey="co2e" name="CO2e" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></ChartCard>
      </div>

      {!loading && listFiltered.length === 0 && <div style={{ marginTop: 16, background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-gray-200)", padding: "40px 24px", textAlign: "center", animation: "eco-fadeInUp 0.3s ease-out" }}><FileX size={34} style={{ color: "var(--eco-gray-300)", margin: "0 auto 10px", display: "block" }} /><p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin resultados</p><p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>No hay registros para los filtros seleccionados. Prueba cambiar el periodo, la categoría o el estado.</p></div>}
    </>
  );

  const renderDetail = () => (
    <>
      <div style={{ marginBottom: 12 }}><button onClick={() => navigate("/areas")} style={{ height: 30, padding: "0 10px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><ChevronLeft size={12} />Volver a Áreas</button></div>
      <FiltersHeader title={`Área: ${activeArea?.label || ""}`} microcopy="Revisa consumo y emisiones. Haz clic en gráficas para filtrar y ver registros relacionados." onOpenRecord={onOpenRecord} onExport={exportCurrent} onTrace={() => openTrace(null)} filters={filters} setFilters={setFilters} showFuelFilter={filters.category === "combustible"} onClear={clearFilters} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 16 }}><KpiCard title="Total CO2e" value={fN(detailKpis.totalT, 3)} unit="tCO2e" icon={<Leaf size={17} />} /><KpiCard title="Electricidad" value={fN(detailKpis.eKwh, 1)} unit="kWh" icon={<Zap size={17} />} sub={`${fN(detailKpis.eT, 3)} tCO2e`} /><KpiCard title="Combustible" value={fN(detailKpis.cLiters, 1)} unit="L" icon={<Flame size={17} />} sub={`${fN(detailKpis.cT, 3)} tCO2e`} /><KpiCard title="% Real" value={String(detailKpis.pctReal)} unit="%" icon={<CheckCircle2 size={17} />} /><KpiCard title="Top fuente" value={detailKpis.topSource} unit="" icon={<BarChart3 size={17} />} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
        <ChartCard title="Tendencia del area" sub="CO2e por tiempo"><ResponsiveContainer width="100%" height={250}><LineChart data={detailTrend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="label" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Line type="monotone" dataKey="co2e" name="CO2e" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Por categoria" sub="Click para filtrar"><ResponsiveContainer width="100%" height={250}><BarChart data={detailCategories} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="name" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Bar dataKey="value" name="CO2e" radius={[4, 4, 0, 0]} cursor="pointer" onClick={d => setFilters(prev => ({ ...prev, category: prev.category === d.key ? "" : d.key }))}>{detailCategories.map(d => <Cell key={d.key} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <ChartCard title="Real vs Estimado" sub="Click para filtrar"><ResponsiveContainer width="100%" height={230}><RPieChart><Pie data={detailStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} cursor="pointer" onClick={d => setFilters(prev => ({ ...prev, status: prev.status === d.key ? "" : d.key }))}>{detailStatus.map(d => <Cell key={d.key} fill={d.color} stroke="white" strokeWidth={2} />)}</Pie><RTooltip content={<DonutTooltip />} /></RPieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Por fuente" sub="Click para filtrar"><ResponsiveContainer width="100%" height={230}><BarChart data={detailSources} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} /><XAxis dataKey="name" tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} /><RTooltip content={<EcoTooltip />} /><Bar dataKey="value" name="CO2e" radius={[4, 4, 0, 0]} cursor="pointer" onClick={d => setFilters(prev => ({ ...prev, source: prev.source === d.name ? "" : d.name }))}>{detailSources.map(d => <Cell key={d.name} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
      </div>

      <SectionLabel>{`Registros (${sortedDetailRows.length})`}</SectionLabel>
      {sortedDetailRows.length === 0 ? (
        <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", padding: "40px 24px", textAlign: "center" }}><FileX size={30} style={{ color: "var(--eco-gray-300)", margin: "0 auto 10px", display: "block" }} /><p style={{ margin: "0 0 4px", fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-gray-700)" }}>Sin resultados</p><p style={{ margin: 0, fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)" }}>No hay registros para los filtros seleccionados. Prueba cambiar el periodo, la categoría o el estado.</p></div>
      ) : (
        <div style={{ background: "white", border: "1px solid var(--eco-gray-200)", borderRadius: "var(--eco-radius-lg)", boxShadow: "var(--eco-shadow-sm)", overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}><thead><tr style={{ borderBottom: "1px solid var(--eco-gray-200)", background: "var(--eco-gray-50)" }}>{["Fecha", "Categoria", "Actividad", "Valor", "Factor usado", "CO2e", "Estado", "Fuente", "Evidencia", "Accion"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{sortedDetailRows.map((r, i) => <tr key={r.id} style={{ borderBottom: i < sortedDetailRows.length - 1 ? "1px solid var(--eco-gray-100)" : "none" }}><td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-600)" }}>{toDateLabel(r.dateISO)}</td><td style={{ padding: "10px 12px", color: "var(--eco-gray-700)", fontWeight: 600 }}>{r.category === "electricidad" ? "Electricidad" : r.category === "combustible" ? "Combustible" : "Otros"}</td><td style={{ padding: "10px 12px", color: "var(--eco-gray-600)", maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.activity}</td><td style={{ padding: "10px 12px", fontFamily: fm, color: "var(--eco-gray-700)" }}>{fN(r.value, 1)} {r.unit}</td><td style={{ padding: "10px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-500)" }}>{fN(r.factor, 3)}</td><td style={{ padding: "10px 12px" }}><span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(r.co2e_kg, 1)} kg</span><span style={{ marginLeft: 6, fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>{fN(r.co2e_t, 3)} t</span></td><td style={{ padding: "10px 12px" }}><Badge status={r.status} /></td><td style={{ padding: "10px 12px", fontSize: 12, color: "var(--eco-gray-500)" }}>{r.source}</td><td style={{ padding: "10px 12px", fontSize: 12, color: "var(--eco-gray-500)" }}>{r.evidenceUrl || "—"}</td><td style={{ padding: "10px 12px" }}><button onClick={() => openTrace(r)} style={{ height: 28, padding: "0 10px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 11, cursor: "pointer" }}>Ver trazabilidad</button></td></tr>)}</tbody></table></div></div>
      )}
    </>
  );

  return (
    <>
      <div style={{ padding: "var(--page-pad-y) var(--page-pad-x)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        {loading ? (
          <>
            <SkeletonBlock height={80} />
            <div style={{ height: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>{[1, 2, 3, 4, 5].map(i => <SkeletonBlock key={i} height={120} />)}</div>
            <div style={{ height: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}><SkeletonBlock height={280} /><SkeletonBlock height={280} /></div>
          </>
        ) : (
          <>
            {error && <div style={{ marginBottom: 12, border: "1px solid #FECACA", background: "var(--eco-danger-bg)", borderRadius: "var(--eco-radius-md)", padding: "10px 12px", fontFamily: fb, fontSize: 12, color: "var(--eco-danger)" }}>{error}</div>}
            {isDetail ? renderDetail() : renderList()}
          </>
        )}
      </div>

      {drill && (
        <DrillPanel title="Trazabilidad" onClose={() => setDrill(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--eco-primary-50)", border: "1px solid var(--eco-primary-200)", borderRadius: "var(--eco-radius-lg)", padding: 14 }}>
              <p style={{ margin: "0 0 8px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700)" }}>Resumen del filtro</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Area: {activeArea?.label || "Global"}</p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Registros: {currentRows.length}</p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Periodo: {filters.periodMode === "mes" ? `${MONTHS_ES[filters.month - 1]} ${filters.year}` : `${filters.fromDate || "—"} a ${filters.toDate || "—"}`}</p>
                <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Estado: {filters.status ? (filters.status === "real" ? "Real" : "Estimado") : "Todos"}</p>
              </div>
            </div>

            <div style={{ background: "var(--eco-gray-50)", borderRadius: "var(--eco-radius-md)", padding: 14 }}>
              <p style={{ margin: "0 0 6px", fontFamily: fd, fontSize: 13, color: "var(--eco-gray-700)", fontWeight: 700 }}>Calculo</p>
              {drill.row ? (
                <p style={{ margin: 0, fontFamily: fm, fontSize: 14, color: "var(--eco-gray-700)" }}>{fN(drill.row.value, 2)} {drill.row.unit} x {fN(drill.row.factor, 3)} = <strong style={{ color: "var(--eco-primary-700)" }}>{fN(drill.row.co2e_kg, 2)} kgCO2e</strong></p>
              ) : (
                <p style={{ margin: 0, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>Selecciona un registro para ver el calculo detallado.</p>
              )}
            </div>

            <div>
              <p style={{ margin: "0 0 8px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)" }}>Registros relevantes</p>
              {currentRows.slice(0, 5).map(r => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-gray-200)", marginBottom: 6 }}><span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-gray-500)", minWidth: 68 }}>{toDateLabel(r.dateISO).slice(0, 6)}</span><span style={{ flex: 1, fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.activity}</span><span style={{ fontFamily: fm, fontSize: 12, fontWeight: 700, color: "var(--eco-primary-700)" }}>{fN(r.co2e_t, 3)} t</span></div>)}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => navigateCategory("electricidad")} style={{ height: 34, padding: "0 12px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Ir a detalle por categoria (Electricidad)</button>
              <button onClick={() => navigateCategory("combustible")} style={{ height: 34, padding: "0 12px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-gray-200)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Ir a detalle por categoria (Combustible)</button>
            </div>
          </div>
        </DrillPanel>
      )}

      <Toast toast={toast} />
    </>
  );
}

