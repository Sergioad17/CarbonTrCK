import { useState, useEffect, useRef } from 'react'
import {
  Leaf, Zap, Flame,
  Building2, TrendingDown, TrendingUp,
  Minus, ChevronRight, ChevronDown,
  ChevronLeft, LayoutDashboard, PieChart,
  ClipboardList, BarChart3, Shield,
  Target, Download, Plus,
  Calendar, Monitor, Factory,
  TreePine, Wifi, Beaker,
  CheckCircle2, Clock, AlertTriangle,
  AlertCircle, Info, ArrowRight,
  ExternalLink, FileX, WifiOff,
  Trophy, X, RefreshCw,
  Eye, Menu,
  LogOut, User, Settings,
  Users, Database, FileText,
  HelpCircle
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RPieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer
} from 'recharts'
import { useLocation, useNavigate } from 'react-router-dom'
import EmissionsPage from './EmissionsPage'
import ScopeCombustiblePage from './ScopeCombustiblePage'
import ScopeElectricidadPage from './ScopeElectricidadPage'
import AreasPage from './AreasPage'
import MetasPage from './MetasPage'
import MetasDetailPage from './MetasDetailPage'
import ReportsPage from './ReportsPage'
import FactorsPage from './FactorsPage'
import EquipmentPage from './EquipmentPage'
import UsersPage from './UsersPage'
import SettingsPage from './SettingsPage'
import ProfilePage from './ProfilePage'
import NotificationsBell from '../components/NotificationsBell'
import './BackgroundPatterns/Pattern1.css'


const fd = "var(--eco-font-display)",
  fb = "var(--eco-font-body)",
  fm = "var(--eco-font-mono)"
const fN = (n, d = 1) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d })
const COLORS = [
  "#22C55E",
  "#EAB308",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#64748B",
  "#94A3B8"]
const ACTIVITY_STORAGE_KEY = "carbontrack.activity"
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const BASE_ACTIVITY = [
  { status: "real", area: "CC1", dateISO: "2026-01-01", co2e_t: 0.544, time: "Hace 2h", by: "Ana Garcia" },
  { status: "est", area: "Aula 3", dateISO: "2026-01-01", co2e_t: 0.148, time: "Hace 5h", by: "Carlos Lopez" },
  { status: "real", area: "Taller Industrial", dateISO: "2026-01-01", co2e_t: 0.4, time: "Hace 1d", by: "Ana Garcia" }
]
const toMonthEs = (iso) => {
  if (!iso) return "Fecha invalida";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "Fecha invalida";
  return `${MONTHS_ES[dt.getMonth()]} ${dt.getFullYear()}`
}
const normalizeActivityItem = (it) => {
  if (!it || typeof it !== "object") return null;
  const co2e = Number(it.co2e_t);
  return {
    status: it.status === "est" ? "est" : "real",
    area: String(it.area || "Sin area"),
    dateISO: String(it.dateISO || new Date().toISOString().slice(0, 10)),
    co2e_t: Number.isFinite(co2e) ? co2e : 0,
    time: String(it.time || "Justo ahora"),
    by: String(it.by || "Tu")
  }
}
const activityKey = (a) => [a.status, a.area, a.dateISO, a.co2e_t, a.time, a.by].join("|")

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
      else setV(t)
    }; r.current = requestAnimationFrame(step);
    return () => r.current && cancelAnimationFrame(r.current)
  }, [t, dur]); return v
}

const monthlyData = [{
  mes: "Ene",
  scope2: 3.42,
  scope1: 0.23,
  est: 0.4
},
{
  mes: "Feb",
  scope2: 3.28,
  scope1: 0.25,
  est: 0.6
},
{
  mes: "Mar",
  scope2: 3.51,
  scope1: 0.21,
  est: 0.2
},
{
  mes: "Abr",
  scope2: 3.15,
  scope1: 0.24,
  est: 0.3
},
{
  mes: "May",
  scope2: 2.98,
  scope1: 0.22,
  est: 0.1
},
{
  mes: "Jun",
  scope2: 2.85,
  scope1: 0.20,
  est: 0.0
}]
const areaData = [{
  area: "CC 1",
  co2e: 3.21,
  pct: 16.3
},
{
  area: "CC 2",
  co2e: 2.84,
  pct: 14.4
},
{
  area: "Aulas",
  co2e: 7.80,
  pct: 39.7
},
{
  area: "Redes",
  co2e: 1.42,
  pct: 7.2
},
{
  area: "Industrial",
  co2e: 1.33,
  pct: 6.8
},
{
  area: "Agrícola",
  co2e: 2.15,
  pct: 10.9
},
{
  area: "Admin",
  co2e: 0.52,
  pct: 2.6
},
{
  area: "Otros",
  co2e: 0.40,
  pct: 2.0
}]
const scopeDonut = [{
  name: "Scope 2 — Electricidad",
  value: 17.52,
  pct: 89.1,
  color: "#22C55E"
},
{
  name: "Scope 1 — Combustible",
  value: 2.15,
  pct: 10.9,
  color: "#EAB308"
}]

const navItems = [{
  id: "dashboard",
  label: "Dashboard",
  icon: LayoutDashboard
},
{
  id: "emissions",
  label: "Emisiones",
  icon: Leaf,
  badge: 3
},
{
  id: "scopes",
  label: "Scopes",
  icon: PieChart,
  children: [{
    id: "scope2",
    label: "Electricidad",
    icon: Zap
  },
  {
    id: "scope1",
    label: "Combustible",
    icon: Flame
  }]
},
{
  id: "areas",
  label: "Áreas",
  icon: Building2
},
{
  id: "goals",
  label: "Metas",
  icon: Target
},
{
  id: "reports",
  label: "Reportes",
  icon: FileText
},
{
  type: "div"
},
{
  id: "catalog",
  label: "Catálogos",
  icon: Database,
  tag: "ADM",
  children: [{
    id: "factors",
    label: "Factores",
    icon: Beaker
  },
  {
    id: "equipment",
    label: "Equipos",
    icon: Monitor
  }]
},
{
  id: "users",
  label: "Usuarios",
  icon: Users,
  tag: "ADM"
},
{
  type: "div"
}, {
  id: "settings",
  label: "Configuración",
  icon: Settings
}]

const NAV_TO_PATH = {
  dashboard: "/",
  emissions: "/emisiones",
  scope2: "/scope/electricidad",
  scope1: "/scope/combustible",
  areas: "/areas",
  goals: "/metas",
  reports: "/reportes",
  factors: "/catalogos/factores",
  equipment: "/catalogos/equipos",
  users: "/admin/usuarios",
  settings: "/configuracion",
}

function navFromPath(pathname) {
  if (pathname?.startsWith("/perfil")) return "profile";
  if (pathname?.startsWith("/metas")) return "goals";
  if (pathname?.startsWith("/areas")) return "areas";
  if (pathname?.startsWith("/scope/electricidad")) return "scope2";
  if (pathname?.startsWith("/scope/combustible")) return "scope1";
  if (pathname?.startsWith("/emisiones")) return "emissions";
  if (pathname?.startsWith("/reportes")) return "reports";
  if (pathname?.startsWith("/catalogos/factores")) return "factors";
  if (pathname?.startsWith("/catalogos/equipos")) return "equipment";
  if (pathname?.startsWith("/admin/usuarios")) return "users";
  if (pathname?.startsWith("/configuracion")) return "settings";
  return "dashboard";
}

function EcoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (<div style={{
    background: "var(--eco-gray-900)",
    borderRadius: "var(--eco-radius-md)",
    padding: "10px 14px",
    boxShadow: "var(--eco-shadow-lg)",
    border: "none",
    minWidth: 140
  }}>
    <p style={{
      fontFamily: fb,
      fontSize: 12,
      fontWeight: 600,
      color: "rgba(255,255,255,0.6)",
      margin: "0 0 6px"
    }}>
      {label}
    </p>{
      payload.map((p, i) => (<div key={i} style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: i < payload.length - 1 ? 4 : 0
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: p.color
        }} />
        <span style={{
          fontFamily: fb,
          fontSize: 12,
          color: "rgba(255,255,255,0.7)",
          flex: 1
        }}>
          {p.name}
        </span>
        <span style={{
          fontFamily: fm,
          fontSize: 13,
          fontWeight: 700,
          color: "white"
        }}>
          {fN(p.value, 2)}
        </span>
        <span style={{
          fontFamily: fb,
          fontSize: 10,
          color: "rgba(255,255,255,0.4)"
        }}>tCO₂e</span></div>))}
  </div>)
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null; const d = payload[0];
  return (
    <div
      style={{
        background: "var(--eco-gray-900)",
        borderRadius: "var(--eco-radius-md)",
        padding: "10px 14px",
        boxShadow: "var(--eco-shadow-lg)",
        border: "none"
      }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 4
      }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: d.payload.color
          }} />
        <span
          style={{
            fontFamily: fb,
            fontSize: 12,
            fontWeight: 600,
            color: "white"
          }}>
          {d.name}
        </span>
      </div>
      <span
        style={{
          fontFamily: fm,
          fontSize: 16,
          fontWeight: 700,
          color: "white"
        }}>
        {fN(d.value, 2)} tCO₂e
      </span>
      <span
        style={{
          fontFamily: fb,
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          marginLeft: 6
        }}>
        ({d.payload.pct}%)
      </span>
    </div>)
}

function SidebarNav({ collapsed, onToggle, activeId, onNav }) {
  const [expanded, setExpanded] = useState(["scopes", "catalog"]);
  const toggle = id => setExpanded(p => p.includes(id) ? p.filter(g => g !== id) : [...p, id]);
  const isActive = it => it.id === activeId || it.children?.some(c => c.id === activeId)
  const renderItem = (it, depth = 0) => {
    if (it.type === "div")
      return
    <div
      key={Math.random()}
      style={{
        height: 1,
        background: "rgba(255,255,255,0.06)",
        margin: "6px 12px"
      }} />;
    const Icon = it.icon;
    const act = isActive(it);
    const has = it.children?.length;
    const exp = expanded.includes(it.id);
    return (<div key={it.id}>
      <button onClick={() => {
        if (has && !collapsed) toggle(it.id);
        else onNav?.(it.id)
      }} title={collapsed ? it.label : undefined}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 10,
          padding: collapsed ? "10px 0" : `8px ${depth ? 16 : 12}px 8px ${depth ? 38 : 12}px`,
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: "var(--eco-radius-md)",
          background: act ? "rgba(34,197,94,0.12)" : "transparent",
          border: "none",
          cursor: "pointer",
          outline: "none",
          color: act ? "#4ADE80" : "rgba(255,255,255,0.5)",
          fontFamily: fb,
          fontSize: depth ? 13 : 14,
          fontWeight: act ? 600 : 400,
          transition: "all 150ms",
          position: "relative",
          margin: "1px 8px"
        }}
        onMouseEnter={e => {
          if (!act) {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "rgba(255,255,255,0.85)"
          }
        }}
        onMouseLeave={e => {
          if (!act) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)"
          }
        }}>
        {act && !has &&
          <div
            style={{
              position: "absolute",
              left: collapsed ? "50%" : 0,
              top: collapsed ? "auto" : "50%",
              bottom: collapsed ? 0 : "auto",
              transform: collapsed ? "translateX(-50%)" : "translateY(-50%)",
              width: collapsed ? 16 : 3,
              height: collapsed ? 3 : 18,
              borderRadius: 2,
              background: "#4ADE80"
            }} />}
        <Icon
          size={depth ? 15 : 18}
          style={{ flexShrink: 0 }} />
        {!collapsed && <>
          <span
            style={{
              flex: 1,
              textAlign: "left",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
            {it.label}
          </span>
          {it.badge &&
            <span
              style={{
                minWidth: 18,
                height: 18,
                borderRadius: "var(--eco-radius-full)",
                background: "var(--eco-primary-500)",
                color: "white",
                fontFamily: fm,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 5px"
              }}>
              {it.badge}
            </span>
          }{
            it.tag &&
            <span
              style={{
                fontFamily: fm,
                fontSize: 9,
                color: "rgba(255,255,255,0.2)"
              }}>
              {it.tag}
            </span>
          }{
            has && <ChevronDown
              size={14}
              style={{
                flexShrink: 0,
                transition: "transform 200ms",
                transform: exp ? "rotate(0)" : "rotate(-90deg)",
                opacity: 0.4
              }}
            />}
        </>
        }
      </button>
      {
        has && exp && !collapsed &&
        <div
          style={{
            animation: "eco-fadeIn 0.2s ease-out"
          }}>
          {it.children.map(c => renderItem(c, 1))}
        </div>}
    </div>
    )
  }
  return (<div
    style={{
      width: collapsed ? "var(--sidebar-collapsed-w)" : "var(--sidebar-w)",
      height: "100vh",
      background: "var(--eco-gray-900)",
      display: "flex",
      flexDirection: "column",
      transition: "width 250ms cubic-bezier(0.33,1,0.68,1)",
      overflow: "hidden",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 30,
      borderRight: "1px solid rgba(255,255,255,0.04)"
    }}>
    <div
      style={{
        height: "var(--header-h)",
        display: "flex",
        alignItems: "center",
        padding: collapsed ? "0" : "0 16px",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0
      }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--eco-radius-md)",
          background: "var(--eco-primary-500)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          animation: "eco-pulse 3s ease-in-out infinite"
        }}>
        <Leaf
          size={18}
          color="white" />
      </div>
      {!collapsed && <div><p style={{
        fontFamily: fd,
        fontSize: 15,
        fontWeight: 800,
        color: "white",
        margin: 0,
        lineHeight: 1.2
      }}>CarbonTrack</p>
        <p style={{
          fontFamily: fb,
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          margin: 0,
          letterSpacing: "0.05em"
        }}>HUELLA DE CARBONO</p>
      </div>}
    </div>
    <nav style={{
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      padding: "8px 0"
    }}>
      {navItems.map(it => renderItem(it))}
    </nav>
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 40,
        margin: "4px 8px 10px",
        borderRadius: "var(--eco-radius-md)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.35)",
        cursor: "pointer",
        fontFamily: fb,
        fontSize: 12,
        transition: "all 150ms"
      }} onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "rgba(255,255,255,0.6)"
      }} onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.color = "rgba(255,255,255,0.35)"
      }}>{collapsed ?
        <ChevronRight
          size={16} /> : <>
          <ChevronLeft
            size={16} />Colapsar</>}
    </button>
  </div>)
}

function Kpi({ title, sub, value, unit, icon, iconBg, iconColor, delta, trend, status, delay = 0, onClick, spark }) {
  const av = useCount(value, 700);
  const tc = {
    up: {
      i: <TrendingUp size={13} />,
      c: "var(--eco-danger)"
    },
    down: {
      i: <TrendingDown size={13} />,
      c: "var(--eco-success)"
    },
    neutral: {
      i: <Minus size={13} />,
      c: "var(--eco-gray-500)"
    }
  }[trend || "neutral"];
  const stC = {
    success: "var(--eco-success)",
    warning: "var(--eco-warning)",
    danger: "var(--eco-danger)"
  };
  const sparkPts = spark?.length > 1 ? (() => {
    const mx = Math.max(...spark),
      mn = Math.min(...spark),
      rng = mx - mn || 1;
    return spark.map(
      (v, i) => `${(i / (spark.length - 1)) * 80},${28 - ((v - mn) / rng) * 28}`).join(" ")
  }
  )() : null;
  const sparkArea = spark?.length > 1 ? (() => {
    const mx = Math.max(...spark),
      mn = Math.min(...spark),
      rng = mx - mn || 1;
    const pts = spark.map(
      (v, i) => `${(i / (spark.length - 1)) * 80},${28 - ((v - mn) / rng) * 28}`);
    return `0,28 ${pts.join(" ")} 80,28`;
  })() : null;
  return (<div
    onClick={onClick}
    tabIndex={onClick ? 0 : undefined}
    role={onClick ? "button" : undefined}
    style={{
      background: "white",
      borderRadius: "var(--eco-radius-lg)",
      padding: 20,
      border: `1px solid ${status === "danger" ? "#FECACA" : status === "warning" ? "#FDE68A" : "var(--eco-border)"}`,
      boxShadow: "var(--eco-shadow-sm)",
      cursor: onClick ? "pointer" : "default",
      transition: "all 250ms cubic-bezier(0.33,1,0.68,1)",
      animation: `eco-fadeInUp 0.4s ease-out ${delay}ms both`,
      position: "relative",
      overflow: "hidden"
    }}
    onMouseEnter={e => {
      if (onClick) {
        e.currentTarget.style.boxShadow = "0 8px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -5px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(-3px)"
      }
    }}
    onMouseLeave={e => {
      if (onClick) {
        e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)"
      }
    }}>
    {status && stC[status] && <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: stC[status]
    }} />}
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 14
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: iconBg ? `linear-gradient(135deg, ${iconBg}, ${iconBg}dd)` : "linear-gradient(135deg, var(--eco-primary-50), var(--eco-primary-100))",
            color: iconColor || "var(--eco-primary-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${iconBg ? iconBg + "40" : "rgba(34,197,94,0.15)"}`
          }}>
          {icon}
        </div>
        <div>
          <p style={{
            fontFamily: fb,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--eco-gray-500)",
            margin: 0,
            lineHeight: 1.2
          }}>
            {title}
          </p>{sub && <p style={{
            fontFamily: fb,
            fontSize: 11,
            color: "var(--eco-gray-400)",
            margin: "2px 0 0"
          }}>
            {sub}
          </p>}
        </div>
      </div>
      {sparkPts &&
        <svg
          width={80}
          height={28}
          style={{
            flexShrink: 0,
            marginTop: 2
          }}>
          <defs>
            <linearGradient id={`sparkGrad-${title?.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tc.c === "var(--eco-success)" ? "#22C55E" : tc.c === "var(--eco-danger)" ? "#EF4444" : "#94A3B8"} stopOpacity="0.2" />
              <stop offset="100%" stopColor={tc.c === "var(--eco-success)" ? "#22C55E" : tc.c === "var(--eco-danger)" ? "#EF4444" : "#94A3B8"} stopOpacity="0" />
            </linearGradient>
          </defs>
          {sparkArea && <polygon
            points={sparkArea}
            fill={`url(#sparkGrad-${title?.replace(/\s/g,"")})`}
          />}
          <polyline
            points={sparkPts}
            fill="none"
            stroke={tc.c === "var(--eco-success)" ? "#22C55E" : tc.c === "var(--eco-danger)" ? "#EF4444" : "#94A3B8"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round" />
        </svg>}
    </div>
    <div style={{
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      marginBottom: 8
    }}>
      <span style={{
        fontFamily: fm,
        fontSize: 28,
        fontWeight: 700,
        color: "var(--eco-gray-900)",
        letterSpacing: "-0.02em",
        lineHeight: 1
      }}>
        {fN(av)}
      </span>
      <span style={{
        fontFamily: fm,
        fontSize: 12,
        color: "var(--eco-gray-400)"
      }}>
        {unit}
      </span>
    </div>
    {delta != null && <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 10px",
      borderRadius: "var(--eco-radius-full)",
      background: trend === "down" ? "var(--eco-success-bg)" : trend === "up" ? "var(--eco-danger-bg)" : "var(--eco-gray-100)",
      animation: "eco-deltaPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.5s both"
    }}>
      <span
        style={{
          display: "flex",
          color: tc.c
        }}>
        {tc.i}
      </span>
      <span
        style={{
          fontFamily: fm,
          fontSize: 11,
          fontWeight: 600,
          color: tc.c
        }}>
        {delta > 0 ? "+" : ""}
        {delta}%</span>
    </div>}
  </div>)
}

function ChartCard({ title, sub, children, delay = 0, onExpand, legend }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        border: "1px solid var(--eco-border)",
        boxShadow: "var(--eco-shadow-sm)",
        overflow: "hidden",
        animation: `eco-fadeInUp 0.4s ease-out ${delay}ms both`,
        transition: "box-shadow 250ms, transform 250ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px -4px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
      }}
    >
      <div
        style={{
          padding: "18px 20px 8px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: fd,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--eco-gray-800)",
              margin: 0,
            }}
          >
            {title}
          </p>

          {sub && (
            <p
              style={{
                fontFamily: fb,
                fontSize: 12,
                color: "var(--eco-gray-400)",
                margin: "2px 0 0",
              }}
            >
              {sub}
            </p>
          )}
        </div>

        {onExpand && (
          <button
            onClick={onExpand}
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
        )}
      </div>

      {legend && (
        <div style={{ padding: "4px 20px 0", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {legend.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                background: item.color,
                display: "inline-block",
                ...(item.dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0, ${item.color} 4px, transparent 4px, transparent 7px)`, background: "transparent" } : {})
              }} />
              <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: "4px 10px 16px" }}>{children}</div>
    </div>
  );
}

function GoalMini({ title, current, target, unit = "tCO₂e", deadline }) {
  const pct = Math.min((current / target) * 100, 100);
  const ap = useCount(pct, 800);
  const st =
    pct >= 100 ? "achieved" : pct >= 70 ? "ontrack" : pct >= 40 ? "behind" : "atrisk";

  const sc = {
    achieved: { c: "var(--eco-success)", l: "Alcanzada", i: <Trophy size={13} /> },
    ontrack: { c: "var(--eco-primary-600)", l: "En camino", i: <TrendingDown size={13} /> },
    behind: { c: "var(--eco-warning)", l: "Retrasado", i: <AlertTriangle size={13} /> },
    atrisk: { c: "var(--eco-danger)", l: "En riesgo", i: <AlertCircle size={13} /> },
  }[st];

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--eco-gray-100)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: fb,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--eco-gray-700)",
          }}
        >
          {title}
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontFamily: fb,
            fontSize: 11,
            fontWeight: 600,
            color: sc.c,
          }}
        >
          {sc.i}
          {sc.l}
        </span>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: "var(--eco-radius-full)",
          background: "var(--eco-gray-100)",
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "var(--eco-radius-full)",
            background: sc.c,
            width: `${ap}%`,
            transition: "width 0.8s cubic-bezier(0.25,0.1,0.25,1)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: fm, fontSize: 12, color: "var(--eco-gray-600)" }}>
          {fN(current, 1)} / {fN(target, 1)} {unit}
        </span>

        <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)" }}>
          {deadline}
        </span>
      </div>
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
          maxWidth: 540,
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
          <h3
            style={{
              fontFamily: fd,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--eco-gray-900)",
              margin: 0,
            }}
          >
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

function SectionLabel({ children, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <h2
        style={{
          fontFamily: fd,
          fontSize: 17,
          fontWeight: 700,
          color: "var(--eco-gray-800)",
          margin: 0,
          paddingLeft: 12,
          borderLeft: "3px solid var(--eco-primary-500)",
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
          Ver todo
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  const shimmerStyle = {
    background: "linear-gradient(90deg, var(--eco-gray-100) 25%, var(--eco-gray-50) 50%, var(--eco-gray-100) 75%)",
    backgroundSize: "200% 100%",
    animation: "eco-shimmer 1.4s ease-in-out infinite",
    borderRadius: "var(--eco-radius-md)",
  };
  return (
    <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", animation: "eco-fadeIn 0.3s ease-out" }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ ...shimmerStyle, width: 280, height: 28, marginBottom: 8 }} />
          <div style={{ ...shimmerStyle, width: 200, height: 16 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...shimmerStyle, width: 120, height: 34 }} />
          <div style={{ ...shimmerStyle, width: 130, height: 34 }} />
        </div>
      </div>

      {/* KPI skeletons */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...shimmerStyle, width: 140, height: 20, marginBottom: 12 }} />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
        gap: 16,
        marginBottom: 28,
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            background: "white",
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-border)",
            padding: 20,
            animation: `eco-fadeInUp 0.4s ease-out ${i * 80}ms both`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ ...shimmerStyle, width: 42, height: 42, borderRadius: 12 }} />
              <div>
                <div style={{ ...shimmerStyle, width: 90, height: 14, marginBottom: 4 }} />
                <div style={{ ...shimmerStyle, width: 60, height: 10 }} />
              </div>
            </div>
            <div style={{ ...shimmerStyle, width: 100, height: 28, marginBottom: 8 }} />
            <div style={{ ...shimmerStyle, width: 70, height: 20 }} />
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 12,
        marginBottom: 28,
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            background: "white",
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-border)",
            padding: "14px 16px",
            animation: `eco-fadeInUp 0.4s ease-out ${350 + i * 60}ms both`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...shimmerStyle, width: 36, height: 36, borderRadius: 10 }} />
              <div style={{ ...shimmerStyle, width: 80, height: 14 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...shimmerStyle, width: 160, height: 20, marginBottom: 12 }} />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: 16,
        marginBottom: 28,
      }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            background: "white",
            borderRadius: "var(--eco-radius-lg)",
            border: "1px solid var(--eco-border)",
            padding: 20,
            animation: `eco-fadeInUp 0.4s ease-out ${600 + i * 80}ms both`,
          }}>
            <div style={{ ...shimmerStyle, width: 140, height: 16, marginBottom: 6 }} />
            <div style={{ ...shimmerStyle, width: 200, height: 12, marginBottom: 16 }} />
            <div style={{ ...shimmerStyle, width: "100%", height: 200 }} />
          </div>
        ))}
      </div>

      {/* Activity skeleton */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...shimmerStyle, width: 150, height: 20, marginBottom: 12 }} />
      </div>
      <div style={{
        background: "white",
        borderRadius: "var(--eco-radius-lg)",
        border: "1px solid var(--eco-border)",
        overflow: "hidden",
        animation: "eco-fadeInUp 0.4s ease-out 800ms both",
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            padding: "14px 18px",
            borderBottom: i < 3 ? "1px solid var(--eco-gray-100)" : "none",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{ ...shimmerStyle, width: 10, height: 10, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...shimmerStyle, width: "70%", height: 14, marginBottom: 4 }} />
              <div style={{ ...shimmerStyle, width: "40%", height: 10 }} />
            </div>
            <div style={{ ...shimmerStyle, width: 60, height: 20 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionCard({ icon, label, primary, onClick }) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: "var(--eco-radius-lg)",
        border: primary ? "1px solid var(--eco-primary-500)" : "1px solid var(--eco-border)",
        background: primary ? "var(--eco-primary-500)" : "var(--eco-bg, white)",
        cursor: "pointer",
        fontFamily: fb,
        fontSize: 13,
        fontWeight: 500,
        color: primary ? "white" : "var(--eco-gray-700)",
        transition: "all 200ms cubic-bezier(0.33,1,0.68,1)",
        boxShadow: "var(--eco-shadow-sm)",
        textAlign: "left",
        width: "100%",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        if (primary) {
          e.currentTarget.style.background = "#16a34a";
          e.currentTarget.style.boxShadow = "0 4px 16px -2px rgba(34,197,94,0.35)";
        } else {
          e.currentTarget.style.boxShadow = "0 4px 12px -2px rgba(0,0,0,0.08)";
          e.currentTarget.style.borderColor = "var(--eco-primary-200)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--eco-shadow-sm)";
        if (primary) {
          e.currentTarget.style.background = "var(--eco-primary-500)";
          e.currentTarget.style.borderColor = "var(--eco-primary-500)";
        } else {
          e.currentTarget.style.borderColor = "var(--eco-border)";
        }
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: primary ? "rgba(255,255,255,0.2)" : "var(--eco-gray-100)",
        color: primary ? "white" : "var(--eco-gray-600)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={17} />
      </div>
      <span>{label}</span>
    </button>
  );
}


export default function DashboardPage({ user, onLogout, onUserChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(() => navFromPath(location.pathname));
  const [periodo, setPeriodo] = useState("ene-jun-2026");
  const [showEst, setShowEst] = useState(true);
  const [drill, setDrill] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [activity, setActivity] = useState(BASE_ACTIVITY);
  const [NewRecordModalComponent, setNewRecordModalComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  const profRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = e => {
      if (profRef.current && !profRef.current.contains(e.target)) setProfileOpen(false);
    };

    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    let mounted = true;
    import("../components/NewRecordModal.jsx")
      .then(mod => {
        if (!mounted) return;
        const Comp = mod?.default;
        if (typeof Comp === "function") setNewRecordModalComponent(() => Comp);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const fromStorage = parsed.map(normalizeActivityItem).filter(Boolean);
      const merged = [...fromStorage, ...BASE_ACTIVITY]
        .filter((item, idx, arr) => arr.findIndex(x => activityKey(x) === activityKey(item)) === idx)
        .slice(0, 20);
      setActivity(merged);
    } catch {
      setActivity(BASE_ACTIVITY);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity.slice(0, 20)));
    } catch {}
  }, [activity]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setActiveNav(navFromPath(location.pathname));
  }, [location.pathname]);

  const handleLogout = () => {
    try {
      window.sessionStorage.setItem("carbontrack.flash", JSON.stringify({
        title: "Sesión cerrada",
        message: "Tu sesión local se cerró correctamente."
      }));
    } catch {}
    onLogout?.();
  };

  const handleNav = (id) => {
    setActiveNav(id);
    if (NAV_TO_PATH[id]) navigate(NAV_TO_PATH[id]);
  };

  const handleNotificationNavigate = (path) => {
    if (!path) return;
    setActiveNav(navFromPath(path));
    navigate(path);
  };

  const initials =
    (user?.fullName || user?.name)?.split(" ").map(w => w[0]).slice(0, 2).join("") || "U";
  const visibleActivity = activity.slice(0, 6);

  const handleCreateRecord = (rec) => {
    const co2e = Number(rec?.co2e_t);
    const nextItem = normalizeActivityItem({
      status: rec?.isEstimated ? "est" : "real",
      area: rec?.area,
      dateISO: rec?.dateISO,
      co2e_t: Number.isFinite(co2e) ? co2e : 0,
      by: user?.name || "Tu",
      time: "Justo ahora"
    });
    if (!nextItem) return;
    setActivity(prev => [nextItem, ...prev]
      .filter((item, idx, arr) => arr.findIndex(x => activityKey(x) === activityKey(item)) === idx)
      .slice(0, 20));
    if (!rec?.persisted) {
    try {
      const RKEY = "carbontrack.records";
      const existing = JSON.parse(localStorage.getItem(RKEY) || "[]");
      const newRec = { id: "u" + Date.now(), dateISO: rec?.dateISO, area: rec?.area, category: rec?.category || "electricidad", activity: rec?.activity || "", value: Number(rec?.value) || 0, unit: rec?.unit || "kWh", factor: Number(rec?.factor) || 0, co2e_kg: Number(rec?.co2e_kg) || 0, co2e_t: Number.isFinite(co2e) ? co2e : 0, status: rec?.isEstimated ? "est" : "real", source: rec?.source || "Medición", hasEvidence: Boolean(rec?.hasEvidence), evidence: rec?.evidence || rec?.evidenceUrl || "", evidenceUrl: rec?.evidenceUrl || rec?.evidence || "", evidenceImage: rec?.evidenceImage || "", by: user?.name || "Tu" };
      localStorage.setItem(RKEY, JSON.stringify([newRec, ...existing].slice(0, 200)));
      window.dispatchEvent(new CustomEvent("carbontrack:newrecord", { detail: newRec }));
    } catch {}
    }
    setNewRecordOpen(false);
    setToast({
      title: "Registro guardado",
      message: `${nextItem.area} - ${fN(nextItem.co2e_t, 3)} tCO2e`
    });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = (user?.fullName || user?.name)?.split(" ")[0] || "Usuario";
  const todayFormatted = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--eco-gray-50)",
        fontFamily: fb,
      }}
    >
      <SidebarNav
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        activeId={activeNav}
        onNav={handleNav}
      />

      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
            onClick={() => setMobileOpen(false)}
          />

          <div style={{ position: "relative", zIndex: 1, animation: "eco-slideInLeft 0.25s ease-out" }}>
            <SidebarNav
              activeId={activeNav}
              onNav={id => {
                handleNav(id);
                setMobileOpen(false);
              }}
              onToggle={() => {}}
            />
          </div>
        </div>
      )}

      <div
        className="eco-pattern1"
        onMouseMove={(e) => {
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top + el.scrollTop;
          el.style.setProperty("--glow-x", x + "px");
          el.style.setProperty("--glow-y", y + "px");
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.setProperty("--glow-x", "-9999px");
          el.style.setProperty("--glow-y", "-9999px");
        }}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          marginLeft: collapsed ? "var(--sidebar-collapsed-w)" : "var(--sidebar-w)",
          transition: "margin-left 250ms cubic-bezier(0.33,1,0.68,1)",
        }}
      >
        <header
          style={{
            height: "var(--header-h)",
            background: "white",
            borderBottom: "1px solid var(--eco-border)",
            display: "flex",
            alignItems: "center",
            padding: "0 var(--page-pad-x)",
            gap: 12,
            position: "sticky",
            top: 0,
            zIndex: 20,
            boxShadow: "var(--eco-shadow-sm)",
          }}
        >
          <nav>
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              <li
                style={{
                  fontFamily: fb,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--eco-gray-800)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {activeNav === "emissions"
                  ? <><Leaf size={13} /> Emisiones</>
                  : activeNav === "profile"
                  ? <><User size={13} /> Mi perfil</>
                  : activeNav === "scope2"
                  ? <><Zap size={13} /> Scope 2 / Electricidad</>
                  : activeNav === "scope1"
                  ? <><Flame size={13} /> Scope 1 / Combustible</>
                  : activeNav === "areas"
                  ? <><Building2 size={13} /> Áreas</>
                  : activeNav === "goals"
                  ? <><Target size={13} /> Metas</>
                  : activeNav === "factors"
                  ? <><Beaker size={13} /> Catálogos / Factores</>
                  : activeNav === "equipment"
                  ? <><Monitor size={13} /> Catálogos / Equipos</>
                  : activeNav === "users"
                  ? <><Users size={13} /> Administración / Usuarios</>
                  : activeNav === "reports"
                  ? <><FileText size={13} /> Reportes</>
                  : activeNav === "settings"
                  ? <><Settings size={13} /> Configuración</>
                  : <><LayoutDashboard size={13} /> Dashboard</>}
              </li>
            </ol>
          </nav>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={14} style={{ color: "var(--eco-gray-400)" }} />
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              style={{
                height: 32,
                padding: "0 26px 0 6px",
                borderRadius: "var(--eco-radius-sm)",
                border: "1px solid var(--eco-border)",
                fontFamily: fb,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--eco-gray-700)",
                background: "white",
                appearance: "none",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="ene-jun-2026">Ene – Jun 2026</option>
              <option value="jul-dic-2025">Jul – Dic 2025</option>
            </select>
          </div>

          <NotificationsBell
            onNavigate={handleNotificationNavigate}
            onToast={setToast}
          />

          <div style={{ position: "relative" }} ref={profRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px 4px 4px",
                borderRadius: "var(--eco-radius-md)",
                border: "1px solid var(--eco-border)",
                background: profileOpen ? "var(--eco-gray-50)" : "white",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "var(--eco-radius-sm)",
                  background: "var(--eco-primary-100)",
                  color: "var(--eco-primary-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fd,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {initials}
              </div>

              <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    fontFamily: fb,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--eco-gray-800)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {(user?.fullName || user?.name)?.split(" ").slice(0, 2).join(" ")}
                </p>
                <p
                  style={{
                    fontFamily: fb,
                    fontSize: 10,
                    color: "var(--eco-gray-400)",
                    margin: 0,
                  }}
                >
                  {user?.roleLabel || user?.role}
                </p>
              </div>

              <ChevronDown size={14} style={{ color: "var(--eco-gray-400)" }} />
            </button>

            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  width: 190,
                  background: "white",
                  border: "1px solid var(--eco-border)",
                  borderRadius: "var(--eco-radius-md)",
                  boxShadow: "var(--eco-shadow-lg)",
                  animation: "eco-scaleIn 0.15s ease-out",
                  padding: 4,
                  zIndex: 30,
                }}
              >
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/perfil");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: "var(--eco-radius-sm)",
                    border: "none",
                    background: "none",
                    fontFamily: fb,
                    fontSize: 13,
                    color: "var(--eco-gray-700)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <User size={14} />
                  Mi perfil
                </button>

                <div style={{ height: 1, background: "var(--eco-gray-100)", margin: "4px 0" }} />

                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: "var(--eco-radius-sm)",
                    border: "none",
                    background: "none",
                    fontFamily: fb,
                    fontSize: 13,
                    color: "var(--eco-danger)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: activeNav === "emissions" || activeNav === "scope1" || activeNav === "scope2" || activeNav === "areas" || activeNav === "goals" || activeNav === "reports" || activeNav === "factors" || activeNav === "equipment" || activeNav === "users" || activeNav === "settings" || activeNav === "profile" ? 0 : "var(--page-pad-y) var(--page-pad-x)",
          }}
        >
          {activeNav === "emissions" ? (
            <EmissionsPage user={user} onOpenRecord={() => {
              if (NewRecordModalComponent) { setNewRecordOpen(true); return; }
              setToast({ title: "Modal no disponible", message: "NewRecordModal.jsx no exporta un componente utilizable." });
            }} />
          ) : activeNav === "areas" ? (
            <AreasPage onOpenRecord={() => {
              if (NewRecordModalComponent) { setNewRecordOpen(true); return; }
              setToast({ title: "Modal no disponible", message: "NewRecordModal.jsx no exporta un componente utilizable." });
            }} />
          ) : activeNav === "scope2" ? (
            <ScopeElectricidadPage onOpenRecord={() => {
              if (NewRecordModalComponent) { setNewRecordOpen(true); return; }
              setToast({ title: "Modal no disponible", message: "NewRecordModal.jsx no exporta un componente utilizable." });
            }} />
          ) : activeNav === "scope1" ? (
            <ScopeCombustiblePage onOpenRecord={() => {
              if (NewRecordModalComponent) { setNewRecordOpen(true); return; }
              setToast({ title: "Modal no disponible", message: "NewRecordModal.jsx no exporta un componente utilizable." });
            }} />
          ) : activeNav === "reports" ? (
            <ReportsPage onOpenRecord={() => {
              if (NewRecordModalComponent) { setNewRecordOpen(true); return; }
              setToast({ title: "Modal no disponible", message: "NewRecordModal.jsx no exporta un componente utilizable." });
            }} />
          ) : activeNav === "factors" ? (
            <FactorsPage />
          ) : activeNav === "equipment" ? (
            <EquipmentPage />
          ) : activeNav === "users" ? (
            <UsersPage />
          ) : activeNav === "settings" ? (
            <SettingsPage />
          ) : activeNav === "profile" ? (
            <ProfilePage user={user} onLogout={handleLogout} onUserChange={onUserChange} />
          ) : activeNav === "goals" ? (
            location.pathname?.startsWith("/metas/") ? (
              <MetasDetailPage />
            ) : (
              <MetasPage />
            )
          ) : loading ? (
            <DashboardSkeleton />
          ) : (
          <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
            {/* Welcome Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 24,
                animation: "eco-fadeInUp 0.4s ease-out both",
              }}
            >
              <div>
                <h1
                  style={{
                    fontFamily: fd,
                    fontSize: 26,
                    fontWeight: 800,
                    color: "var(--eco-gray-900)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {greeting}, {firstName}
                </h1>

                <p
                  style={{
                    fontFamily: fb,
                    fontSize: 14,
                    color: "var(--eco-gray-500)",
                    margin: "6px 0 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Calendar size={13} style={{ opacity: 0.6 }} />
                  {todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)} · {periodo === "ene-jun-2026" ? "Enero – Junio 2026" : "Julio – Diciembre 2025"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowEst(!showEst)}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: "var(--eco-radius-md)",
                    border: `1px solid ${
                      showEst ? "var(--eco-primary-300)" : "var(--eco-border)"
                    }`,
                    background: showEst ? "var(--eco-primary-50)" : "white",
                    fontFamily: fb,
                    fontSize: 13,
                    fontWeight: 500,
                    color: showEst ? "var(--eco-primary-700)" : "var(--eco-gray-600)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Eye size={14} />
                  {showEst ? "Estimados: ON" : "Estimados: OFF"}
                </button>

                <button
                  onClick={() => {
                    if (NewRecordModalComponent) {
                      setNewRecordOpen(true);
                      return;
                    }
                    setToast({
                      title: "Modal no disponible",
                      message: "NewRecordModal.jsx no exporta un componente utilizable."
                    });
                  }}
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
                    boxShadow: "0 2px 8px rgba(34,197,94,0.25)",
                    transition: "all 200ms",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(34,197,94,0.35)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.25)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <Plus size={14} />
                  Nuevo registro
                </button>
              </div>
            </div>

            {/* KPI Section */}
            <SectionLabel>Indicadores clave</SectionLabel>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <Kpi
                title="Emisiones totales"
                sub="Scope 1+2"
                value={19.67}
                unit="tCO₂e"
                icon={<Leaf size={19} />}
                delta={-8.3}
                trend="down"
                status="success"
                onClick={() => setDrill({ type: "total" })}
                delay={0}
                spark={[22.1, 21.5, 21.8, 20.9, 19.8, 19.67]}
              />
              <Kpi
                title="Electricidad"
                sub="Scope 2"
                value={17.52}
                unit="tCO₂e"
                icon={<Zap size={19} />}
                iconBg="var(--eco-info-bg)"
                iconColor="var(--eco-info)"
                delta={-5.1}
                trend="down"
                onClick={() => setDrill({ type: "scope2" })}
                delay={60}
                spark={[19.2, 18.8, 19.0, 18.5, 18.0, 17.52]}
              />
              <Kpi
                title="Combustible"
                sub="Scope 1"
                value={2.15}
                unit="tCO₂e"
                icon={<Flame size={19} />}
                iconBg="var(--eco-secondary-50)"
                iconColor="var(--eco-secondary-600)"
                delta={12.4}
                trend="up"
                status="warning"
                onClick={() => setDrill({ type: "scope1" })}
                delay={120}
              />
              <Kpi
                title="Áreas completas"
                sub="Con datos"
                value={14}
                unit="de 18"
                icon={<Building2 size={19} />}
                iconBg="var(--eco-gray-100)"
                iconColor="var(--eco-gray-600)"
                delta={0}
                trend="neutral"
                onClick={() => setDrill({ type: "areas" })}
                delay={180}
              />
            </div>

            {/* Quick Actions Strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
                marginBottom: 24,
                animation: "eco-fadeInUp 0.4s ease-out 200ms both",
              }}
            >
              <QuickActionCard
                icon={Plus}
                label="Nuevo registro"
                primary
                onClick={() => {
                  if (NewRecordModalComponent) {
                    setNewRecordOpen(true);
                    return;
                  }
                  setToast({
                    title: "Modal no disponible",
                    message: "NewRecordModal.jsx no exporta un componente utilizable."
                  });
                }}
              />
              <QuickActionCard
                icon={FileText}
                label="Ver reportes"
                onClick={() => handleNav("reports")}
              />
              <QuickActionCard
                icon={Target}
                label="Gestionar metas"
                onClick={() => handleNav("goals")}
              />
              <QuickActionCard
                icon={Download}
                label="Exportar datos"
                onClick={() => {
                  setToast({ title: "Exportar", message: "Ve a Reportes para exportar datos." });
                }}
              />
            </div>

            {/* Charts Row 1 */}
            <SectionLabel>Tendencias y distribución</SectionLabel>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <ChartCard
                title="Tendencia mensual"
                sub="tCO₂e por scope — Ene a Jun 2026"
                delay={250}
                onExpand={() => setDrill({ type: "trend" })}
                legend={[
                  { label: "Scope 2", color: "#22C55E" },
                  { label: "Scope 1", color: "#EAB308" },
                  ...(showEst ? [{ label: "Estimado", color: "#94A3B8", dashed: true }] : []),
                ]}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontFamily: "DM Sans", fontSize: 12, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RTooltip content={<EcoTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="scope2"
                      name="Scope 2"
                      stroke="#22C55E"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }}
                      activeDot={{ r: 6, stroke: "#22C55E", strokeWidth: 2, fill: "white" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="scope1"
                      name="Scope 1"
                      stroke="#EAB308"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#EAB308", stroke: "white", strokeWidth: 2 }}
                    />
                    {showEst && (
                      <Line
                        type="monotone"
                        dataKey="est"
                        name="Estimado"
                        stroke="#94A3B8"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Por scope" sub="Periodo actual" delay={310}>
                <div style={{ position: "relative" }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <RPieChart>
                      <Pie
                        data={scopeDonut}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        style={{ cursor: "pointer" }}
                        onClick={d => setDrill({ type: d.name.includes("1") ? "scope1" : "scope2" })}
                      >
                        {scopeDonut.map((e, i) => (
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
                    <p
                      style={{
                        fontFamily: fm,
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--eco-gray-900)",
                        margin: 0,
                      }}
                    >
                      19.67
                    </p>
                    <p style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-gray-400)", margin: 0 }}>
                      tCO₂e
                    </p>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <ChartCard
                title="Emisiones por área"
                sub="Top 8 áreas — tCO₂e"
                delay={350}
                onExpand={() => setDrill({ type: "areas" })}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={areaData}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                    <XAxis
                      dataKey="area"
                      tick={{ fontFamily: "DM Sans", fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RTooltip content={<EcoTooltip />} cursor={{ fill: "rgba(136,136,136,0.15)" }} />
                    <Bar
                      dataKey="co2e"
                      name="CO₂e"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={d => setDrill({ type: "area", data: d })}
                    >
                      {areaData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Metas de reducción" sub="Progreso del periodo" delay={400}>
                <div style={{ padding: "0 4px" }}>
                  <GoalMini title="Reducción anual 10%" current={15.2} target={20} deadline="Dic 2026" />
                  <GoalMini
                    title="Eficiencia eléctrica"
                    current={42.0}
                    target={40.0}
                    unit="MWh"
                    deadline="Jun 2026"
                  />
                  <GoalMini title="Áreas 100% datos" current={14} target={18} unit="áreas" deadline="Mar 2026" />
                </div>
              </ChartCard>
            </div>

            {/* Activity Feed */}
            <SectionLabel action={() => {}}>Actividad reciente</SectionLabel>

            <div
              style={{
                background: "white",
                borderRadius: "var(--eco-radius-lg)",
                border: "1px solid var(--eco-border)",
                boxShadow: "var(--eco-shadow-sm)",
                overflow: "hidden",
                animation: "eco-fadeInUp 0.4s ease-out 450ms both",
              }}
            >
              {visibleActivity.length === 0 ? (
                <div style={{
                  padding: "40px 20px",
                  textAlign: "center",
                }}>
                  <ClipboardList size={36} style={{ color: "var(--eco-gray-300)", marginBottom: 10 }} />
                  <p style={{ fontFamily: fb, fontSize: 14, fontWeight: 600, color: "var(--eco-gray-500)", margin: "0 0 4px" }}>
                    Sin actividad reciente
                  </p>
                  <p style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-400)", margin: 0 }}>
                    Los nuevos registros de emisiones aparecerán aquí.
                  </p>
                </div>
              ) : (
                visibleActivity.map((a, i) => (
                <div
                  key={activityKey(a)}
                  style={{
                    padding: "13px 18px",
                    borderBottom: i < visibleActivity.length - 1 ? "1px solid var(--eco-gray-100)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    transition: "background 100ms",
                    background: i % 2 === 1 ? "var(--eco-gray-50)" : "white",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,197,94,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? "var(--eco-gray-50)" : "white")}
                >
                  {/* Status indicator dot */}
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: a.status === "real" ? "var(--eco-success)" : "var(--eco-warning)",
                    flexShrink: 0,
                    boxShadow: a.status === "real" ? "0 0 0 3px rgba(34,197,94,0.15)" : "0 0 0 3px rgba(234,179,8,0.15)",
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: fb,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--eco-gray-700)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {`${a.area} - ${toMonthEs(a.dateISO)} - ${fN(a.co2e_t, 3)} tCO2e`}
                    </p>
                    <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: "2px 0 0" }}>
                      {a.by} · {a.time}
                    </p>
                  </div>

                  <span
                    style={{
                      fontFamily: fb,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "var(--eco-radius-full)",
                      background: a.status === "real" ? "var(--eco-success-bg)" : "var(--eco-warning-bg)",
                      color: a.status === "real" ? "var(--eco-success)" : "var(--eco-secondary-600)",
                      border: `1px solid ${a.status === "real" ? "#BBF7D0" : "#FDE68A"}`,
                    }}
                  >
                    {a.status === "real" ? "Real" : "Estimado"}
                  </span>

                  <ChevronRight size={14} style={{ color: "var(--eco-gray-300)" }} />
                </div>
              )))}
            </div>

            {/* Footer Info Strip */}
            <div
              style={{
                marginTop: 24,
                padding: "12px 0",
                textAlign: "center",
                animation: "eco-fadeIn 0.4s ease-out 600ms both",
              }}
            >
              <p style={{
                fontFamily: fb,
                fontSize: 11,
                color: "var(--eco-gray-400)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}>
                <RefreshCw size={11} style={{ opacity: 0.5 }} />
                Última actualización: hace 5 min
              </p>
            </div>
            </div>
          )}
        </main>
      </div>

      {newRecordOpen && NewRecordModalComponent && (
        <NewRecordModalComponent
          open={newRecordOpen}
          isOpen={newRecordOpen}
          onClose={() => setNewRecordOpen(false)}
          onCreate={handleCreateRecord}
          onCreateRecord={handleCreateRecord}
          onSave={handleCreateRecord}
        />
      )}

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
            padding: "0",
            minWidth: 280,
            animation: "eco-fadeInUp 0.25s ease-out",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {/* Green left accent */}
          <div style={{
            width: 4,
            background: "var(--eco-success)",
            flexShrink: 0,
            borderRadius: "var(--eco-radius-lg) 0 0 var(--eco-radius-lg)",
          }} />
          <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
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
                background: "var(--eco-gray-100)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--eco-gray-400)",
                flexShrink: 0,
                transition: "all 150ms",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--eco-gray-200)";
                e.currentTarget.style.color = "var(--eco-gray-600)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--eco-gray-100)";
                e.currentTarget.style.color = "var(--eco-gray-400)";
              }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {drill && (
        <DrillPanel
          title={
            drill.type === "area"
              ? `Área: ${drill.data?.area}`
              : drill.type === "scope2"
              ? "Scope 2 — Electricidad"
              : drill.type === "scope1"
              ? "Scope 1 — Combustible"
              : "Detalle"
          }
          onClose={() => setDrill(null)}
        >
          {drill.type === "area" && drill.data && (
            <div
              style={{
                background: "var(--eco-gray-50)",
                borderRadius: "var(--eco-radius-md)",
                padding: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: fb,
                    fontSize: 12,
                    color: "var(--eco-gray-500)",
                    margin: "0 0 2px",
                  }}
                >
                  Emisiones
                </p>
                <p
                  style={{
                    fontFamily: fm,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--eco-primary-700)",
                    margin: 0,
                  }}
                >
                  {drill.data.co2e} tCO₂e
                </p>
              </div>

              <div>
                <p
                  style={{
                    fontFamily: fb,
                    fontSize: 12,
                    color: "var(--eco-gray-500)",
                    margin: "0 0 2px",
                  }}
                >
                  % del total
                </p>
                <p
                  style={{
                    fontFamily: fm,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--eco-gray-800)",
                    margin: 0,
                  }}
                >
                  {drill.data.pct}%
                </p>
              </div>
            </div>
          )}

          <p
            style={{
              fontFamily: fb,
              fontSize: 14,
              color: "var(--eco-gray-600)",
              lineHeight: 1.6,
              marginTop: 12,
            }}
          >
            Vista de trazabilidad completa: registros por mes con consumo × factor = CO₂e.
          </p>

          {areaData.slice(0, 5).map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: "var(--eco-radius-md)",
                border: "1px solid var(--eco-border)",
                cursor: "pointer",
                transition: "all 150ms",
                marginTop: 8,
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
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i] }} />
              <span style={{ fontFamily: fb, fontSize: 14, color: "var(--eco-gray-700)", flex: 1 }}>
                {a.area}
              </span>
              <span style={{ fontFamily: fm, fontSize: 13, fontWeight: 700, color: "var(--eco-primary-700)" }}>
                {a.co2e} t
              </span>
              <ChevronRight size={14} style={{ color: "var(--eco-gray-300)" }} />
            </div>
          ))}
        </DrillPanel>
      )}
    </div>
  );
}
