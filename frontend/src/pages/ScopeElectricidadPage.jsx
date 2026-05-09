import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Zap, Plus, Download, Eye, Calendar, RotateCcw, FileX, ExternalLink, Trash2, X,
  CheckCircle2, TrendingUp, TrendingDown, Minus, Gauge, Activity, ChevronRight,
  ChevronDown, ChevronUp, ChevronLeft, Filter, AlertTriangle, Building2,
  Search, ArrowRight, Paperclip, HelpCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";
import { createNotification } from "../api/notifications";
import { archiveEmissionRecord, fetchEmissionRecords } from "../api/records";
import { buildApiUrl } from "../api/config";
import RecordArchiveDialog from "../components/RecordArchiveDialog";
import NewRecordModal from "../components/NewRecordModal";
import { buildArchiveAuditPayload, canArchiveRecord, resolveArchiveActor } from "../lib/recordArchive";
import { getSession } from "../lib/sessionStore";
import { canUse, denyAction, disabledActionStyle } from "../lib/permissions";

const fd = "var(--eco-font-display)", fb = "var(--eco-font-body)", fm = "var(--eco-font-mono)";
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const COLORS = ["#3B82F6","#22C55E","#8B5CF6","#EC4899","#06B6D4","#EAB308","#64748B","#94A3B8"];
const ANIM_CSS = `
@keyframes ctFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctPop{from{opacity:0;transform:translateY(4px) scale(.85)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ctRowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctRingPulse{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.18)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0)}}

/* ─── Theme-aware tokens (used inline on hardcoded patterns) ─── */
:root{
  --ct-soft-grad-end:#FFFFFF;
  --ct-table-head-grad:linear-gradient(180deg,var(--eco-gray-50),#FFFFFF);
  --ct-table-pagination-grad:linear-gradient(180deg,#FFFFFF,var(--eco-gray-50));
  --ct-filter-open-grad:linear-gradient(180deg,#F8FAFC,#FFFFFF);
  --ct-req-info-grad:linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 70%);
  --ct-req-warn-grad:linear-gradient(135deg,#FEF9C3 0%,#FFFFFF 70%);
  --ct-kwh-emphasis:#1D4ED8;
  --ct-kwh-emphasis-soft:rgba(59,130,246,.06);
  --ct-eyebrow-bg:rgba(29,78,216,.08);
  --ct-eyebrow-border:rgba(29,78,216,.18);
  --ct-eyebrow-color:#1D4ED8;
  --ct-pill-icon-color:#3B82F6;
  --ct-area-grid-stroke:var(--eco-gray-100);
  --ct-empty-stage-bg:linear-gradient(135deg,rgba(59,130,246,.04),rgba(34,197,94,.04));
  --ct-empty-stage-border:rgba(59,130,246,.25);
  --ct-storage-error-border:#FDE68A;
}
:root[data-theme="dark"]{
  --ct-soft-grad-end:var(--eco-card);
  --ct-table-head-grad:linear-gradient(180deg,rgba(255,255,255,.03),var(--eco-card));
  --ct-table-pagination-grad:linear-gradient(180deg,var(--eco-card),rgba(255,255,255,.025));
  --ct-filter-open-grad:linear-gradient(180deg,rgba(255,255,255,.03),var(--eco-card));
  --ct-req-info-grad:linear-gradient(135deg,rgba(96,165,250,.12) 0%,var(--eco-card) 70%);
  --ct-req-warn-grad:linear-gradient(135deg,rgba(250,204,21,.10) 0%,var(--eco-card) 70%);
  --ct-kwh-emphasis:#93C5FD;
  --ct-kwh-emphasis-soft:rgba(96,165,250,.10);
  --ct-eyebrow-bg:rgba(96,165,250,.14);
  --ct-eyebrow-border:rgba(96,165,250,.32);
  --ct-eyebrow-color:#93C5FD;
  --ct-pill-icon-color:#60A5FA;
  --ct-area-grid-stroke:#1F2A3F;
  --ct-empty-stage-bg:linear-gradient(135deg,rgba(96,165,250,.05),rgba(74,222,128,.04));
  --ct-empty-stage-border:rgba(96,165,250,.22);
  --ct-storage-error-border:rgba(250,204,21,.30);
}

/* ─── Reusable icon-container helpers ─── */
.ct-icon-blue{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);color:#1D4ED8;box-shadow:inset 0 0 0 1px rgba(59,130,246,.16)}
.ct-icon-green{background:linear-gradient(135deg,#ECFDF5,#D1FAE5);color:#15803D;box-shadow:inset 0 0 0 1px rgba(34,197,94,.20)}

/* KPI icon tile variants — theme-aware, no hardcoded white frames */
.ct-kpi-icon-tile{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:11px;flex-shrink:0}
.ct-kpi-icon-tile[data-tone="info"]{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);color:#1D4ED8;box-shadow:inset 0 0 0 1px rgba(59,130,246,.18),0 4px 12px -6px rgba(59,130,246,.28)}
.ct-kpi-icon-tile[data-tone="emerald"]{background:linear-gradient(135deg,#ECFDF5,#D1FAE5);color:#15803D;box-shadow:inset 0 0 0 1px rgba(34,197,94,.20),0 4px 12px -6px rgba(34,197,94,.28)}
.ct-kpi-icon-tile[data-tone="cyan"]{background:linear-gradient(135deg,#F0F9FF,#E0F2FE);color:#0369A1;box-shadow:inset 0 0 0 1px rgba(56,189,248,.22),0 4px 12px -6px rgba(56,189,248,.28)}
.ct-kpi-icon-tile[data-tone="success"]{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);color:#15803D;box-shadow:inset 0 0 0 1px rgba(34,197,94,.22),0 4px 12px -6px rgba(34,197,94,.28)}
.ct-kpi-icon-tile[data-tone="neutral"]{background:linear-gradient(135deg,#F1F5F9,#E2E8F0);color:#475569;box-shadow:inset 0 0 0 1px rgba(100,116,139,.18),0 4px 12px -6px rgba(100,116,139,.18)}
:root[data-theme="dark"] .ct-kpi-icon-tile[data-tone="info"]{background:linear-gradient(135deg,rgba(96,165,250,.22),rgba(96,165,250,.08));color:#93C5FD;box-shadow:inset 0 0 0 1px rgba(96,165,250,.32),0 4px 12px -6px rgba(96,165,250,.36)}
:root[data-theme="dark"] .ct-kpi-icon-tile[data-tone="emerald"]{background:linear-gradient(135deg,rgba(74,222,128,.22),rgba(74,222,128,.08));color:#86EFAC;box-shadow:inset 0 0 0 1px rgba(74,222,128,.32),0 4px 12px -6px rgba(74,222,128,.36)}
:root[data-theme="dark"] .ct-kpi-icon-tile[data-tone="cyan"]{background:linear-gradient(135deg,rgba(56,189,248,.22),rgba(56,189,248,.08));color:#7DD3FC;box-shadow:inset 0 0 0 1px rgba(56,189,248,.32),0 4px 12px -6px rgba(56,189,248,.36)}
:root[data-theme="dark"] .ct-kpi-icon-tile[data-tone="success"]{background:linear-gradient(135deg,rgba(74,222,128,.22),rgba(74,222,128,.08));color:#86EFAC;box-shadow:inset 0 0 0 1px rgba(74,222,128,.32),0 4px 12px -6px rgba(74,222,128,.36)}
:root[data-theme="dark"] .ct-kpi-icon-tile[data-tone="neutral"]{background:linear-gradient(135deg,rgba(148,163,184,.18),rgba(148,163,184,.06));color:#CBD5E1;box-shadow:inset 0 0 0 1px rgba(148,163,184,.28),0 4px 12px -6px rgba(148,163,184,.24)}
.ct-eyebrow-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:var(--ct-eyebrow-bg);border:1px solid var(--ct-eyebrow-border);margin-bottom:6px}
.ct-eyebrow-chip-dot{width:6px;height:6px;border-radius:50%;background:var(--ct-eyebrow-color)}
.ct-eyebrow-chip-text{font-family:var(--eco-font-body);font-size:10.5px;font-weight:700;color:var(--ct-eyebrow-color);text-transform:uppercase;letter-spacing:.08em}
.ct-pill-icon{color:var(--ct-pill-icon-color)}
.ct-kwh-strong{color:var(--ct-kwh-emphasis)!important}
:root[data-theme="dark"] .ct-icon-blue{background:linear-gradient(135deg,rgba(96,165,250,.22),rgba(96,165,250,.10));color:#93C5FD;box-shadow:inset 0 0 0 1px rgba(96,165,250,.32)}
:root[data-theme="dark"] .ct-icon-green{background:linear-gradient(135deg,rgba(74,222,128,.20),rgba(74,222,128,.10));color:#6EE7A0;box-shadow:inset 0 0 0 1px rgba(74,222,128,.32)}

/* ─── Recharts dark-mode polish ─── */
:root[data-theme="dark"] .recharts-pie path[stroke="white"]{stroke:var(--eco-card)!important}
:root[data-theme="dark"] .recharts-line-dots circle[stroke="white"]{stroke:var(--eco-card)!important}
:root[data-theme="dark"] .recharts-area-dots circle[stroke="white"]{stroke:var(--eco-card)!important}
@keyframes ctSheen{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}
@keyframes ctOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ct-kpi{position:relative;overflow:hidden;isolation:isolate}
.ct-kpi::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 100% 0%,rgba(59,130,246,.08),transparent 55%);opacity:.7;pointer-events:none;transition:opacity 240ms ease;z-index:0}
.ct-kpi::after{content:"";position:absolute;top:0;left:0;width:60%;height:100%;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);transform:translateX(-120%) skewX(-18deg);pointer-events:none;z-index:0}
.ct-kpi:hover::after{animation:ctSheen 1.1s cubic-bezier(.4,0,.2,1) forwards}
.ct-kpi:hover::before{opacity:1}
.ct-kpi>*{position:relative;z-index:1}
.ct-chart{position:relative;overflow:hidden;transition:all 220ms cubic-bezier(.33,1,.68,1)}
.ct-chart::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3B82F6,#1D4ED8 60%,#22C55E);opacity:0;transition:opacity 220ms ease}
.ct-chart:hover{transform:translateY(-2px);box-shadow:0 14px 38px -22px rgba(15,23,42,.18),0 4px 12px -6px rgba(15,23,42,.06)!important;border-color:rgba(59,130,246,.25)!important}
.ct-chart:hover::before{opacity:1}
.ct-section-bar{display:inline-block;width:4px;height:22px;border-radius:999px;background:linear-gradient(180deg,#3B82F6,#1D4ED8);box-shadow:0 0 0 1px rgba(59,130,246,.18),0 4px 14px -4px rgba(59,130,246,.45)}
.ct-hero{position:relative;overflow:hidden;border-radius:18px;border:1px solid rgba(59,130,246,.18);background:linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 55%,#F0FDF4 110%);box-shadow:0 18px 40px -28px rgba(59,130,246,.30),0 4px 14px -10px rgba(15,23,42,.05);padding:18px 22px;margin-bottom:20px}
.ct-hero::before{content:"";position:absolute;top:-60px;right:-40px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.18),transparent 60%);pointer-events:none}
.ct-hero::after{content:"";position:absolute;bottom:-80px;left:-40px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.12),transparent 60%);pointer-events:none}
.ct-hero-glyph{position:relative;width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 28px -10px rgba(29,78,216,.55),inset 0 0 0 1px rgba(255,255,255,.18)}
.ct-hero-glyph::after{content:"";position:absolute;inset:-3px;border-radius:16px;border:1px solid rgba(59,130,246,.25);animation:ctRingPulse 2.4s ease-in-out infinite;pointer-events:none}
.ct-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-family:var(--eco-font-body);font-size:11.5px;font-weight:600;background:rgba(255,255,255,.7);border:1px solid rgba(59,130,246,.18);color:var(--eco-gray-700);backdrop-filter:blur(6px)}
.ct-pill-dot{width:7px;height:7px;border-radius:50%;background:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,.18)}
.ct-action-primary{position:relative;overflow:hidden}
.ct-action-primary::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.35) 50%,transparent 65%);transform:translateX(-100%);transition:transform 600ms ease}
.ct-action-primary:hover::after{transform:translateX(100%)}
.ct-filterbar{position:relative;overflow:hidden}
.ct-filterbar::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#3B82F6,#22C55E);opacity:.65}
.ct-table-row{transition:background 140ms ease,transform 200ms cubic-bezier(.4,0,.2,1)}
.ct-table-row:hover{background:rgba(59,130,246,.04)!important}
.ct-section-eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.ct-section-eyebrow h2{font-family:var(--eco-font-display);font-size:18px;font-weight:800;color:var(--eco-gray-900);margin:0;letter-spacing:-0.018em}
.ct-section-eyebrow p{font-family:var(--eco-font-body);font-size:11.5px;font-weight:500;color:var(--eco-gray-500);margin:2px 0 0;letter-spacing:.01em}
.ct-table-card{position:relative;overflow:hidden}
.ct-table-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#3B82F6,#22C55E);opacity:.55}
.ct-req-card{transition:transform 220ms cubic-bezier(.33,1,.68,1),box-shadow 220ms ease,border-color 220ms ease;position:relative;overflow:hidden}
.ct-req-card:hover{transform:translateY(-2px);box-shadow:0 16px 36px -22px rgba(15,23,42,.20),0 4px 12px -6px rgba(15,23,42,.05)}
.ct-req-card::before{content:"";position:absolute;top:0;left:0;width:4px;height:100%;background:linear-gradient(180deg,var(--ct-req-accent,#3B82F6),transparent);opacity:.85}

/* ─── Empty state silhouettes ─── */
@keyframes ctEmptyShimmer{0%{background-position:-150% 0}100%{background-position:150% 0}}
@keyframes ctEmptyBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes ctEmptyWave{0%,100%{opacity:.45}50%{opacity:.85}}
.ct-empty-stage{position:relative;width:100%;display:flex;align-items:center;justify-content:center;border-radius:12px;background:var(--ct-empty-stage-bg);border:1px dashed var(--ct-empty-stage-border);overflow:hidden;color:var(--eco-text-soft)}
.ct-empty-stage svg{display:block;animation:ctEmptyWave 2.6s ease-in-out infinite}
.ct-empty-shimmer{position:absolute;inset:0;background:linear-gradient(110deg,transparent 0%,rgba(59,130,246,.18) 35%,rgba(34,197,94,.16) 50%,rgba(59,130,246,.18) 65%,transparent 100%);background-size:220% 100%;animation:ctEmptyShimmer 2.8s linear infinite;pointer-events:none;mix-blend-mode:overlay}
.ct-empty-mark{position:absolute;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;z-index:3;animation:ctEmptyBob 3.2s ease-in-out infinite;text-align:center;padding:0 16px}
.ct-empty-mark-glyph{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,rgba(59,130,246,.18),rgba(34,197,94,.18));border:1.5px solid rgba(59,130,246,.32);color:#1D4ED8;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px -10px rgba(29,78,216,.45),inset 0 0 0 3px rgba(255,255,255,.55);position:relative;overflow:hidden}
.ct-empty-mark-glyph::after{content:"";position:absolute;inset:-2px;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.6) 50%,transparent 70%);transform:translateX(-100%) skewX(-20deg);animation:ctSheen 2.6s linear infinite}
.ct-empty-title{margin:0;font-family:var(--eco-font-display);font-size:13px;font-weight:800;color:var(--eco-text);letter-spacing:-.005em}
.ct-empty-sub{margin:0;font-family:var(--eco-font-body);font-size:11.5px;color:var(--eco-text-soft);line-height:1.4}

/* ─── Dark-mode adjustments ─── */
:root[data-theme="dark"] .ct-hero{background:linear-gradient(135deg,rgba(96,165,250,.10) 0%,var(--eco-card) 55%,rgba(74,222,128,.07) 110%);border-color:rgba(96,165,250,.22);box-shadow:0 18px 40px -28px rgba(96,165,250,.40),0 4px 14px -10px rgba(0,0,0,.45)}
:root[data-theme="dark"] .ct-hero::before{background:radial-gradient(circle,rgba(96,165,250,.22),transparent 60%)}
:root[data-theme="dark"] .ct-hero::after{background:radial-gradient(circle,rgba(74,222,128,.16),transparent 60%)}
:root[data-theme="dark"] .ct-hero-glyph{background:linear-gradient(135deg,#3B82F6,#1D4ED8);box-shadow:0 12px 28px -10px rgba(59,130,246,.55),inset 0 0 0 1px rgba(255,255,255,.18)}
:root[data-theme="dark"] .ct-hero-glyph::after{border-color:rgba(96,165,250,.30)}
:root[data-theme="dark"] .ct-pill{background:rgba(255,255,255,.04)!important;border-color:rgba(96,165,250,.22)!important;color:var(--eco-text)!important;backdrop-filter:none}
:root[data-theme="dark"] .ct-pill-dot{background:#60A5FA;box-shadow:0 0 0 3px rgba(96,165,250,.20)}
:root[data-theme="dark"] .ct-section-bar{background:linear-gradient(180deg,#60A5FA,#3B82F6);box-shadow:0 0 0 1px rgba(96,165,250,.25),0 4px 14px -4px rgba(96,165,250,.45)}
:root[data-theme="dark"] .ct-section-eyebrow h2{color:var(--eco-text-strong)}
:root[data-theme="dark"] .ct-section-eyebrow p{color:var(--eco-text-soft)}
:root[data-theme="dark"] .ct-kpi{background:var(--eco-card)!important;border-color:var(--eco-border)!important}
:root[data-theme="dark"] .ct-kpi::before{background:radial-gradient(120% 90% at 100% 0%,rgba(96,165,250,.10),transparent 55%)}
:root[data-theme="dark"] .ct-kpi::after{background:linear-gradient(110deg,transparent 30%,rgba(96,165,250,.16) 50%,transparent 70%)}
:root[data-theme="dark"] .ct-kpi:hover{box-shadow:0 18px 40px -22px rgba(96,165,250,.36),0 4px 12px -6px rgba(0,0,0,.45)!important;border-color:rgba(96,165,250,.34)!important}
:root[data-theme="dark"] .ct-chart{background:var(--eco-card)!important;border-color:var(--eco-border)!important}
:root[data-theme="dark"] .ct-chart::before{background:linear-gradient(90deg,#60A5FA,#3B82F6 60%,#4ADE80)}
:root[data-theme="dark"] .ct-chart:hover{box-shadow:0 14px 38px -22px rgba(96,165,250,.36),0 4px 12px -6px rgba(0,0,0,.40)!important;border-color:rgba(96,165,250,.30)!important}
:root[data-theme="dark"] .ct-req-card{background:var(--eco-card)!important}
:root[data-theme="dark"] .ct-req-card:hover{box-shadow:0 16px 36px -22px rgba(0,0,0,.55),0 4px 12px -6px rgba(0,0,0,.30)}
:root[data-theme="dark"] .ct-table-card{background:var(--eco-card)!important}
:root[data-theme="dark"] .ct-table-card::before{background:linear-gradient(90deg,#60A5FA,#4ADE80);opacity:.55}
:root[data-theme="dark"] .ct-table-row:hover{background:rgba(96,165,250,.06)!important}
:root[data-theme="dark"] .ct-filterbar{background:var(--eco-card)!important}
:root[data-theme="dark"] .ct-filterbar::before{background:linear-gradient(90deg,#60A5FA,#4ADE80);opacity:.55}
:root[data-theme="dark"] .ct-action-primary::after{background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.18) 50%,transparent 65%)}
:root[data-theme="dark"] .ct-empty-stage{background:linear-gradient(135deg,rgba(96,165,250,.05),rgba(74,222,128,.04));border-color:rgba(96,165,250,.22)}
:root[data-theme="dark"] .ct-empty-shimmer{background:linear-gradient(110deg,transparent 0%,rgba(96,165,250,.20) 35%,rgba(74,222,128,.18) 50%,rgba(96,165,250,.20) 65%,transparent 100%);mix-blend-mode:screen}
:root[data-theme="dark"] .ct-empty-mark-glyph{background:linear-gradient(135deg,rgba(96,165,250,.30),rgba(74,222,128,.26));border-color:rgba(96,165,250,.45);color:#93C5FD;box-shadow:0 12px 30px -10px rgba(96,165,250,.45),inset 0 0 0 3px rgba(15,23,42,.25)}
:root[data-theme="dark"] .ct-empty-mark-glyph::after{background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%)}
:root[data-theme="dark"] .ct-empty-title{color:var(--eco-text-strong)}
:root[data-theme="dark"] .ct-empty-sub{color:var(--eco-text-soft)}
@media(max-width:1024px){.ct-kpi-g{grid-template-columns:1fr 1fr!important}.ct-ch-main,.ct-ch-donuts{grid-template-columns:1fr!important}}
@media(max-width:640px){.ct-kpi-g{grid-template-columns:1fr!important}.ct-hdr-acts{flex-direction:column;width:100%}.ct-hdr-acts button{width:100%}}
`;

/* ═══ STYLE CONSTANTS ═══ */
const ST_C = { real: { bg:"var(--eco-success-bg)", c:"var(--eco-success)", b:"#BBF7D0", l:"Real" }, est: { bg:"var(--eco-warning-bg)", c:"var(--eco-secondary-600)", b:"#FDE68A", l:"Estimado" } };
const TR_C = { up: { c:"var(--eco-danger)", i:<TrendingUp size={13}/>, bg:"var(--eco-danger-bg)" }, down: { c:"var(--eco-success)", i:<TrendingDown size={13}/>, bg:"var(--eco-success-bg)" }, neutral: { c:"var(--eco-gray-500)", i:<Minus size={13}/>, bg:"var(--eco-gray-100)" } };
const ST_ACC = { warning: { c:"var(--eco-warning)", b:"#FDE68A" }, danger: { c:"var(--eco-danger)", b:"#FECACA" }, success: { c:"var(--eco-success)", b:"#BBF7D0" } };

/* ═══ AUTH-AWARE IMAGE ═══ */
function getAuthToken() { return getSession()?.token || null; }
function resolveEvidenceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  if (raw.startsWith("//") && typeof window !== "undefined") return `${window.location.protocol}${raw}`;
  try { return buildApiUrl(raw); } catch { return typeof window !== "undefined" ? new URL(raw, window.location.origin).toString() : raw; }
}
function EvidenceImage({ url, accentColor = "var(--eco-info)" }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const resolvedUrl = resolveEvidenceUrl(url);
    setSrc(null);
    setFailed(false);
    if (!resolvedUrl) return;
    if (resolvedUrl.startsWith("data:") || resolvedUrl.startsWith("blob:")) { setSrc(resolvedUrl); return; }
    let objUrl = null;
    const token = getAuthToken();
    fetch(resolvedUrl, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => { if (!blob.type.startsWith("image/")) { setFailed(true); return; } objUrl = URL.createObjectURL(blob); setSrc(objUrl); })
      .catch(() => setFailed(true));
    return () => { if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [url]);
  if (!url || failed || !src) return null;
  return (
    <div style={{ borderRadius: "var(--eco-radius-sm)", overflow: "hidden", border: "1px solid var(--eco-border)", animation: "ctFadeUp .35s ease-out both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--eco-gray-50)", borderBottom: "1px solid var(--eco-border)" }}>
        <Paperclip size={11} style={{ color: accentColor, flexShrink: 0 }} />
        <span style={{ fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)" }}>Evidencia adjunta</span>
      </div>
      <div style={{ background: "var(--eco-gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={src} alt="Evidencia" style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }} />
      </div>
    </div>
  );
}

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
function fDate(iso) { if (!iso) return "-"; const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "-"; return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; }
function fMonth(iso) { if (!iso) return "-"; const d = new Date(`${iso}T12:00:00`); if (Number.isNaN(d.getTime())) return "-"; return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`; }
function toKey(date) { const d = new Date(`${date}T12:00:00`); if (Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function normRec(r, fid) {
  const kwh = Number.isFinite(Number(r?.value)) ? Number(r.value) : 0;
  const fac = Number.isFinite(Number(r?.factor)) && Number(r?.factor) > 0 ? Number(r.factor) : 0.435;
  const co2 = Number.isFinite(Number(r?.co2e_kg)) && Number(r?.co2e_kg) > 0 ? Number(r.co2e_kg) : kwh * fac;
  return { id: r?.id || fid, dateISO: String(r?.dateISO || ""), area: String(r?.area || "Sin área"), activity: String(r?.activity || "Sin actividad"), note: String(r?.note || ""), category: "electricidad", value: kwh, unit: "kWh", factor: fac, co2e_kg: co2, co2e_t: co2 / 1000, status: r?.status === "est" ? "est" : "real", validationStatus: String(r?.validationStatus || "pending"), latestValidationDecision: String(r?.latestValidationDecision || ""), latestValidationComment: String(r?.latestValidationComment || ""), latestValidationAt: String(r?.latestValidationAt || ""), source: String(r?.source || "Medición"), by: String(r?.by || "-"), evidenceUrl: String(r?.evidenceUrl || "") };
}

async function loadElec() {
  let err = "";
  const all = await fetchEmissionRecords().catch(() => {
    err = "No se pudieron cargar los registros.";
    return [];
  });
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

/* ─── Empty-state silhouettes (shimmery placeholders with a question mark) ─── */
function EmptyMark({ title = "Sin datos por mostrar", sub = "Aplica otros filtros o registra nueva información para ver resultados aquí." }) {
  return (
    <div className="ct-empty-mark">
      <div className="ct-empty-mark-glyph"><HelpCircle size={24} strokeWidth={2.4} /></div>
      <p className="ct-empty-title">{title}</p>
      <p className="ct-empty-sub">{sub}</p>
    </div>
  );
}

function EmptyAreaSilhouette({ height = 250, title, sub }) {
  return (
    <div className="ct-empty-stage" style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="emptyAreaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="0" y1="40" x2="400" y2="40" stroke="currentColor" strokeOpacity="0.10" strokeDasharray="4 6" />
        <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeOpacity="0.10" strokeDasharray="4 6" />
        <line x1="0" y1="160" x2="400" y2="160" stroke="currentColor" strokeOpacity="0.10" strokeDasharray="4 6" />
        <path d="M0,150 C40,118 80,135 120,108 C170,76 210,98 250,82 C300,62 340,98 400,75 L400,200 L0,200 Z" fill="url(#emptyAreaGrad)" />
        <path d="M0,150 C40,118 80,135 120,108 C170,76 210,98 250,82 C300,62 340,98 400,75" fill="none" stroke="#3B82F6" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="ct-empty-shimmer" />
      <EmptyMark title={title} sub={sub} />
    </div>
  );
}

function EmptyBarSilhouette({ height = 250, title, sub }) {
  const bars = [62, 96, 48, 130, 78, 110];
  return (
    <div className="ct-empty-stage" style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="emptyBarGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.10" />
          </linearGradient>
        </defs>
        <line x1="0" y1="40" x2="400" y2="40" stroke="currentColor" strokeOpacity="0.10" strokeDasharray="4 6" />
        <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeOpacity="0.10" strokeDasharray="4 6" />
        <line x1="0" y1="160" x2="400" y2="160" stroke="currentColor" strokeOpacity="0.10" strokeDasharray="4 6" />
        {bars.map((h, i) => (
          <rect key={i} x={20 + i * 62} y={196 - h} width={42} height={h} rx={5} fill="url(#emptyBarGrad)" />
        ))}
      </svg>
      <div className="ct-empty-shimmer" />
      <EmptyMark title={title} sub={sub} />
    </div>
  );
}

function EmptyDonutSilhouette({ height = 240, title, sub }) {
  return (
    <div className="ct-empty-stage" style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 240 240" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="emptyDonutGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#22C55E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.30" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r="78" fill="none" stroke="url(#emptyDonutGrad)" strokeWidth="22" strokeDasharray="20 8" strokeLinecap="round" />
        <circle cx="120" cy="120" r="50" fill="none" stroke="currentColor" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="3 4" />
      </svg>
      <div className="ct-empty-shimmer" />
      <EmptyMark title={title} sub={sub} />
    </div>
  );
}

function EmptyRowsSilhouette({ rows = 4, title, sub }) {
  return (
    <div className="ct-empty-stage" style={{ minHeight: 180, padding: "26px 20px", display: "flex", alignItems: "stretch" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, opacity: 0.8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, animation: "ctEmptyWave 2.6s ease-in-out infinite", animationDelay: `${i * 90}ms` }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,rgba(59,130,246,.20),rgba(34,197,94,.16))", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 9, width: `${72 - i * 6}%`, borderRadius: 999, background: "linear-gradient(90deg,rgba(59,130,246,.22),rgba(34,197,94,.18) 60%,rgba(59,130,246,.10))" }} />
              <div style={{ height: 7, width: `${52 - i * 5}%`, borderRadius: 999, background: "linear-gradient(90deg,rgba(59,130,246,.14),rgba(34,197,94,.10) 60%,rgba(59,130,246,.06))" }} />
            </div>
            <div style={{ width: 60, height: 18, borderRadius: 999, background: "linear-gradient(135deg,rgba(59,130,246,.22),rgba(34,197,94,.18))", flexShrink: 0 }} />
          </div>
        ))}
      </div>
      <div className="ct-empty-shimmer" />
      <EmptyMark title={title} sub={sub} />
    </div>
  );
}

function SectionLabel({ children, icon, delay = 0, sub, action }) {
  return (
    <div className="ct-section-eyebrow" style={{ marginBottom: 14, animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`, justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span className="ct-section-bar" />
        {icon && (
          <div className="ct-icon-blue" style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h2>{children}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function RequestTable({ title, rows, emptyText, tone = "info", onOpen, onEdit, editLabel = "Corregir y reenviar" }) {
  const accent = tone === "warning" ? "var(--eco-warning)" : "var(--eco-info)";
  const bg = tone === "warning" ? "var(--eco-warning-bg)" : "var(--eco-info-bg)";
  const accentSolid = tone === "warning" ? "#CA8A04" : "#3B82F6";
  const headerGrad = tone === "warning" ? "var(--ct-req-warn-grad)" : "var(--ct-req-info-grad)";
  const showEdit = typeof onEdit === "function";
  const headers = showEdit ? ["Fecha", "Área", "Actividad", "CO₂e", "Nota", ""] : ["Fecha", "Área", "Actividad", "CO₂e", "Nota"];
  return (
    <div className="ct-req-card" style={{ background: "white", borderRadius: 14, border: `1px solid ${accent}33`, boxShadow: "0 2px 6px -3px rgba(15,23,42,.05)", overflow: "hidden", minWidth: 0, "--ct-req-accent": accentSolid }}>
      <div style={{ padding: "13px 16px", borderBottom: `1px solid ${accent}22`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: headerGrad }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${bg},${bg} 60%,var(--ct-soft-grad-end))`, color: accent, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 0 0 1px ${accent}33, 0 4px 10px -6px ${accent}55` }}>{tone === "warning" ? <AlertTriangle size={14} /> : <Activity size={14} />}</span>
          <p style={{ margin: 0, fontFamily: fd, fontSize: 13.5, fontWeight: 800, color: "var(--eco-gray-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-.005em" }}>{title}</p>
        </div>
        <span style={{ fontFamily: fm, fontSize: 11.5, fontWeight: 800, color: accent, padding: "3px 10px", borderRadius: 999, background: bg, border: `1px solid ${accent}33` }}>{rows.length}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        {rows.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 12 }}>
            <thead><tr style={{ borderBottom: `1px solid ${accent}18`, background: "var(--eco-gray-50)" }}>
              {headers.map((h, hi) => <th key={`${h}-${hi}`} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: "var(--eco-gray-500)", letterSpacing: "0.05em", whiteSpace: "nowrap", fontWeight: 700 }}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.slice(0, 6).map((row, index) => (
              <tr key={row.id} onClick={() => onOpen?.(row)} className="ct-table-row" style={{ cursor: "pointer", borderBottom: index < Math.min(rows.length, 6) - 1 ? "1px solid var(--eco-gray-100)" : "none" }}>
                <td style={{ padding: "10px 12px", fontFamily: fm, color: "var(--eco-gray-600)", whiteSpace: "nowrap" }}>{fDate(row.dateISO)}</td>
                <td style={{ padding: "10px 12px", color: "var(--eco-gray-700)", fontWeight: 600, whiteSpace: "nowrap" }}>{row.area}</td>
                <td style={{ padding: "10px 12px", color: "var(--eco-gray-600)", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.activity}</td>
                <td style={{ padding: "10px 12px", fontFamily: fm, fontWeight: 800, color: "var(--eco-primary-700)", whiteSpace: "nowrap" }}>{fN(row.co2e_t, 3)} <span style={{ fontWeight: 600, color: "var(--eco-gray-400)" }}>t</span></td>
                <td style={{ padding: "10px 12px", color: "var(--eco-gray-500)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.latestValidationComment || row.note || "-"}</td>
                {showEdit && (
                  <td style={{ padding: "6px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onEdit(row); }}
                      title={editLabel}
                      style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1px solid ${accent}55`, background: bg, color: accent, fontFamily: fb, fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 180ms cubic-bezier(.4,0,.2,1)", boxShadow: `0 1px 0 ${accent}11` }}
                      onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "white"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 18px -8px ${accent}aa`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.color = accent; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 1px 0 ${accent}11`; }}
                    >
                      <RotateCcw size={12} />
                      Corregir
                    </button>
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <div style={{ padding: 14 }}>
            <EmptyRowsSilhouette rows={3} title={tone === "warning" ? "Sin devoluciones" : "Sin peticiones activas"} sub={emptyText} />
          </div>
        )}
      </div>
    </div>
  );
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
function KpiCard({ title, sub, value, unit, icon, tone = "info", delta, trend = "neutral", status, delay = 0, sparkData }) {
  const num = Number(String(value).replace(/[^0-9.\-]/g, "")) || 0;
  const anim = useCountUp(num, 700);
  const isNum = !isNaN(num) && String(value) !== "-";
  const tc = TR_C[trend] || TR_C.neutral;
  const sa = ST_ACC[status] || null;
  const sparkW = 72, sparkH = 26;
  const sparkColor = tone === "success" || tone === "emerald" ? "#22C55E" : tone === "cyan" ? "#0284C7" : tone === "neutral" ? "#64748B" : "#3B82F6";
  const spark = sparkData && sparkData.length > 1 ? (() => { const mx = Math.max(...sparkData), mn = Math.min(...sparkData), rng = mx - mn || 1; return sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * sparkW},${sparkH - ((v - mn) / rng) * sparkH}`).join(" "); })() : null;
  const sparkFill = spark ? `0,${sparkH} ${spark} ${sparkW},${sparkH}` : null;
  const gradId = `kpiSpark-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="ct-kpi" style={{ background: "white", borderRadius: 14, padding: 18, border: `1px solid ${sa?.b || "var(--eco-border)"}`, boxShadow: "0 2px 6px -3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)", transition: "all 220ms cubic-bezier(.33,1,.68,1)", animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both` }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 18px 40px -22px rgba(59,130,246,.32), 0 4px 12px -6px rgba(15,23,42,.08)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = sa?.c || "rgba(59,130,246,.30)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 6px -3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = sa?.b || "var(--eco-border)"; }}>
      {sa && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${sa.c},${sa.c}80)`, borderRadius: "14px 14px 0 0", zIndex: 2 }} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div className="ct-kpi-icon-tile" data-tone={tone}>{icon}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-gray-700)", lineHeight: 1.25, letterSpacing: ".005em" }}>{title}</p>
            {sub && <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</p>}
          </div>
        </div>
        {spark && (
          <svg width={sparkW} height={sparkH} style={{ flexShrink: 0, opacity: .9 }} viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity="0.32" />
                <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={sparkFill} fill={`url(#${gradId})`} />
            <polyline points={spark} fill="none" stroke={sparkColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: fm, fontSize: 30, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.025em", lineHeight: 1 }}>{isNum ? fN(anim, unit === "%" ? 0 : 1) : value}</span>
        {unit && <span style={{ fontFamily: fm, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-500)" }}>{unit}</span>}
      </div>
      <div style={{ minHeight: 22 }}>
        {delta ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: tc.bg, border: `1px solid ${tc.c}22`, animation: "ctPop .4s cubic-bezier(.34,1.56,.64,1) .5s both" }}>
            <span style={{ display: "flex", color: tc.c }}>{tc.i}</span>
            <span style={{ fontFamily: fm, fontSize: 11, fontWeight: 700, color: tc.c, letterSpacing: ".01em" }}>{delta}</span>
          </div>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: fb, fontSize: 11.5, color: "var(--eco-gray-400)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--eco-gray-300)" }} />
            Sin variación previa
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children, delay = 0, accentIcon }) {
  return (
    <div className="ct-chart" style={{ background: "white", borderRadius: 14, border: "1px solid var(--eco-border)", boxShadow: "0 2px 6px -3px rgba(15,23,42,.05)", animation: `ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both` }}>
      <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px dashed var(--eco-border)" }}>
        {accentIcon && (
          <div className="ct-icon-blue" style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {accentIcon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-900)", letterSpacing: "-0.01em" }}>{title}</p>
          {sub && <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11.5, color: "var(--eco-gray-500)" }}>{sub}</p>}
        </div>
      </div>
      <div style={{ padding: "10px 12px 14px" }}>{children}</div>
    </div>
  );
}

function PageSkeleton() {
  const sh = {
    background: "linear-gradient(90deg,var(--eco-border) 25%,var(--eco-surface) 50%,var(--eco-border) 75%)",
    backgroundSize: "200% 100%",
    animation: "ctShimmer 1.5s ease-in-out infinite",
    borderRadius: "var(--eco-radius-md)",
  };
  const card = { background: "var(--eco-surface)", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)" };
  return (
    <div style={{ padding: "var(--page-pad-y,24px) var(--page-pad-x,24px)" }}>
      <div style={{ maxWidth: "var(--content-max,1440px)", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...sh, width: 38, height: 38, borderRadius: "var(--eco-radius-md)" }} />
            <div>
              <div style={{ ...sh, width: 160, height: 24, marginBottom: 6 }} />
              <div style={{ ...sh, width: 280, height: 14 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...sh, width: 120, height: 34 }} />
            <div style={{ ...sh, width: 100, height: 34 }} />
            <div style={{ ...sh, width: 110, height: 34 }} />
          </div>
        </div>
        {/* Filters */}
        <div style={{ ...card, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...sh, width: 28, height: 28, borderRadius: "var(--eco-radius-sm)" }} />
          <div style={{ ...sh, width: 100, height: 14 }} />
          <div style={{ flex: 1 }} />
          <div style={{ ...sh, width: 80, height: 30, borderRadius: "var(--eco-radius-sm)" }} />
        </div>
        {/* KPI label */}
        <div style={{ ...sh, width: 140, height: 18, marginBottom: 12 }} />
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ ...card, padding: 20, animation: `ctFadeUp .3s ease-out ${i * 50}ms both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ ...sh, width: 38, height: 38, borderRadius: 10 }} />
                <div>
                  <div style={{ ...sh, width: 80, height: 12, marginBottom: 6 }} />
                  <div style={{ ...sh, width: 50, height: 10 }} />
                </div>
              </div>
              <div style={{ ...sh, width: 90, height: 24, marginBottom: 8 }} />
              <div style={{ ...sh, width: 60, height: 16, borderRadius: "var(--eco-radius-full)" }} />
            </div>
          ))}
        </div>
        {/* Charts label */}
        <div style={{ ...sh, width: 100, height: 18, marginBottom: 12 }} />
        {/* Charts row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ ...card, overflow: "hidden", animation: `ctFadeUp .3s ease-out ${250 + i * 60}ms both` }}>
              <div style={{ padding: "16px 18px 10px" }}>
                <div style={{ ...sh, width: 180, height: 14, marginBottom: 4 }} />
                <div style={{ ...sh, width: 120, height: 10 }} />
              </div>
              <div style={{ padding: "6px 12px 16px" }}>
                <div style={{ ...sh, width: "100%", height: 250 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Charts row 2 (donuts) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ ...card, overflow: "hidden", animation: `ctFadeUp .3s ease-out ${370 + i * 60}ms both` }}>
              <div style={{ padding: "16px 18px 10px" }}>
                <div style={{ ...sh, width: 140, height: 14, marginBottom: 4 }} />
                <div style={{ ...sh, width: 100, height: 10 }} />
              </div>
              <div style={{ padding: "6px 12px 16px" }}>
                <div style={{ ...sh, width: "100%", height: 240 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Table label */}
        <div style={{ ...sh, width: 120, height: 18, marginBottom: 12 }} />
        {/* Table */}
        <div style={{ ...card, overflow: "hidden", animation: "ctFadeUp .3s ease-out 500ms both" }}>
          <div style={{ ...sh, width: "100%", height: 40, borderRadius: 0 }} />
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", borderBottom: i < 4 ? "1px solid var(--eco-border)" : "none" }}>
              <div style={{ ...sh, width: 70, height: 14 }} />
              <div style={{ ...sh, width: 60, height: 14 }} />
              <div style={{ ...sh, width: 140, height: 14, flex: 1 }} />
              <div style={{ ...sh, width: 50, height: 14 }} />
              <div style={{ ...sh, width: 50, height: 14 }} />
              <div style={{ ...sh, width: 60, height: 20, borderRadius: "var(--eco-radius-full)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrillPanel({ title, breadcrumb, onClose, children }) {
  useEffect(() => { const h = e => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return (<div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: "flex-end" }} role="dialog" aria-modal="true">
    <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.35)", backdropFilter: "blur(3px)", animation: "ctOverlay .2s ease-out" }} onClick={onClose} />
    <div style={{ position: "relative", width: "100%", maxWidth: 560, background: "white", boxShadow: "var(--eco-shadow-xl, var(--eco-shadow-lg))", display: "flex", flexDirection: "column", animation: "ctSlideR .3s cubic-bezier(.33,1,.68,1)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--eco-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>{breadcrumb && <p style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-400)", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 4 }}><Zap size={10} />{breadcrumb}</p>}
          <h3 style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 700, color: "var(--eco-gray-900)" }}>{title}</h3></div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: "var(--eco-radius-sm)", border: "none", cursor: "pointer", background: "var(--eco-gray-100)", color: "var(--eco-gray-500)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 150ms" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--eco-border)"} onMouseLeave={e => e.currentTarget.style.background = "var(--eco-gray-100)"}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, padding: 20, overflow: "auto" }}>{children}</div>
    </div>
  </div>);
}

function FilterSel({ label, value, onChange, options, icon }) {
  return (<label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)", display: "flex", alignItems: "center", gap: 4 }}>
      {icon && <span style={{ display: "flex", color: "var(--eco-gray-400)" }}>{icon}</span>}{label}</span>
    <select value={value} onChange={onChange} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)", background: "white", cursor: "pointer", transition: "border-color 150ms", outline: "none" }}
      onFocus={e => e.target.style.borderColor = "var(--eco-primary-300)"} onBlur={e => e.target.style.borderColor = "var(--eco-border)"}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </label>);
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (<div role="alert" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120, background: "white", border: "1px solid var(--eco-border)", boxShadow: "var(--eco-shadow-xl, var(--eco-shadow-lg))", borderRadius: "var(--eco-radius-lg)", padding: "14px 16px", minWidth: 260, maxWidth: 340, display: "flex", alignItems: "flex-start", gap: 10, animation: "ctSlideR .3s cubic-bezier(.33,1,.68,1)" }}>
    <div style={{ width: 28, height: 28, borderRadius: "var(--eco-radius-sm)", background: "var(--eco-success-bg)", color: "var(--eco-success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><CheckCircle2 size={14} /></div>
    <div style={{ flex: 1 }}><p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-gray-800)" }}>{toast.title}</p><p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{toast.message}</p></div>
    <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--eco-gray-400)", padding: 2, flexShrink: 0, display: "flex" }}><X size={14} /></button>
  </div>);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function Scope2Page({ user, onOpenRecord }) {
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
  const [archiveDialog, setArchiveDialog] = useState(null);
  const [archivingId, setArchivingId] = useState("");
  const [removingIds, setRemovingIds] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancellingId, setCancellingId] = useState("");
  const [sortCol, setSortCol] = useState("dateISO");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 8;
  const archivePermission = useMemo(() => {
    const base = canArchiveRecord();
    if (!canUse(user, "electricity:delete")) {
      return { ...base, allowed: false, message: "Tu rol no permite eliminar registros de electricidad." };
    }
    return base;
  }, [user]);
  const canCreate = canUse(user, "electricity:create");
  const canExport = canUse(user, "electricity:export");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const ld = await loadElec();
    setRecords(ld.records.sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
    setStorageError(ld.storageError);
    setLoading(false);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const h = () => loadAll(); window.addEventListener("carbontrack:newrecord", h); window.addEventListener("carbontrack:record-archived", h); window.addEventListener("storage", h); return () => { window.removeEventListener("carbontrack:newrecord", h); window.removeEventListener("carbontrack:record-archived", h); window.removeEventListener("storage", h); }; }, [loadAll]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const areas = useMemo(() => [...new Set(records.map(r => r.area))].sort(), [records]);
  const sources = useMemo(() => [...new Set(records.map(r => r.source))].sort(), [records]);
  const completedRecords = useMemo(() => records.filter(r => r.validationStatus === "approved"), [records]);
  const allPeriodRecords = useMemo(() => periodMode === "todos" ? records : periodFilter(records, periodMode, month, year, fromDate, toDate), [records, periodMode, month, year, fromDate, toDate]);
  const pFiltered = useMemo(() => periodMode === "todos" ? completedRecords : periodFilter(completedRecords, periodMode, month, year, fromDate, toDate), [completedRecords, periodMode, month, year, fromDate, toDate]);
  const requestRows = useMemo(() => {
    let d = [...allPeriodRecords];
    if (fArea) d = d.filter(r => r.area === fArea);
    if (fSource) d = d.filter(r => r.source === fSource);
    return {
      pending: d.filter(r => r.validationStatus !== "approved" && r.validationStatus !== "rejected" && r.latestValidationDecision !== "returned"),
      returned: d.filter(r => r.latestValidationDecision === "returned"),
    };
  }, [allPeriodRecords, fArea, fSource]);

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
  useEffect(() => { if (page === 0) return; if (page > Math.max(totalPages - 1, 0)) setPage(Math.max(totalPages - 1, 0)); }, [page, totalPages]);
  const activeFC = useMemo(() => [fArea, fStatus, fSource].filter(Boolean).length, [fArea, fStatus, fSource]);

  const summaryFilters = useMemo(() => {
    const v = [];
    v.push(periodMode === "mes" ? `${MONTHS_ES[month - 1]} ${year}` : periodMode === "rango" ? `${fromDate || "-"} a ${toDate || "-"}` : "Todo el periodo");
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
      const cur = completedRecords.filter(sh).filter(r => { const d = new Date(`${r.dateISO}T12:00:00`); return d >= s1 && d < e1; }).reduce((s, r) => s + r.co2e_kg, 0);
      const prev = completedRecords.filter(sh).filter(r => { const d = new Date(`${r.dateISO}T12:00:00`); return d >= ps && d < pe; }).reduce((s, r) => s + r.co2e_kg, 0);
      if (prev > 0) { const pct = ((cur - prev) / prev) * 100; ch = `${pct > 0 ? "+" : ""}${fN(pct, 1)}%`; tr = pct > 0 ? "up" : pct < 0 ? "down" : "neutral"; }
    }
    return { kwh, co2Kg, co2T, factorAvg: fAvg, pctReal: pR, change: ch, trend: tr };
  }, [filtered, periodMode, month, year, completedRecords, fArea, fStatus, fSource]);

  const lineData = useMemo(() => { const m = {}; filtered.forEach(r => { const k = fMonth(r.dateISO); if (!m[k]) m[k] = { label: k, kwh: 0, co2e: 0 }; m[k].kwh += r.value; m[k].co2e += r.co2e_t; }); return Object.values(m).sort((a, b) => { const [am, ay] = a.label.split(" "); const [bm, by] = b.label.split(" "); if (ay !== by) return Number(ay) - Number(by); return MONTHS_ES.indexOf(am) - MONTHS_ES.indexOf(bm); }); }, [filtered]);

  const areaBars = useMemo(() => { const m = {}; filtered.forEach(r => { if (!m[r.area]) m[r.area] = { area: r.area, co2e: 0, kwh: 0 }; m[r.area].co2e += r.co2e_t; m[r.area].kwh += r.value; }); return Object.values(m).sort((a, b) => b.co2e - a.co2e); }, [filtered]);

  const sourceDonut = useMemo(() => { const m = {}; filtered.forEach(r => { const s = r.source || "Otro"; if (!m[s]) m[s] = { name: s, value: 0 }; m[s].value += r.co2e_t; }); const arr = Object.values(m).sort((a, b) => b.value - a.value); const t = arr.reduce((s, x) => s + x.value, 0) || 1; return arr.map((x, i) => ({ ...x, pct: Math.round((x.value / t) * 100), color: COLORS[i % COLORS.length] })); }, [filtered]);

  const statusDonut = useMemo(() => { const re = filtered.filter(r => r.status === "real").length; const es = filtered.filter(r => r.status === "est").length; const t = re + es || 1; return [{ name: "Real", value: re, pct: Math.round((re / t) * 100), color: "#22C55E" }, { name: "Estimado", value: es, pct: Math.round((es / t) * 100), color: "#EAB308" }].filter(d => d.value > 0); }, [filtered]);

  const clearFilters = () => { setPeriodMode("todos"); setMonth(today.getMonth() + 1); setYear(today.getFullYear()); setFromDate(""); setToDate(""); setFArea(""); setFStatus(""); setFSource(""); setPage(0); setToast({ title: "Filtros reiniciados", message: "Se restauraron los filtros." }); };
  const exportCsv = () => { if (!canExport) { denyAction(setToast, "Tu rol no permite exportar registros de electricidad."); return; } const csv = buildCsv(filtered); const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `scope2-electricidad-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url); setToast({ title: "Exportación lista", message: `${filtered.length} registros exportados.` }); };
  const openTrace = row => { if (row) { setDrill(row); return; } if (filtered.length) { setDrill(filtered[0]); return; } setToast({ title: "Sin registros", message: "No hay registros para mostrar." }); };
  const openEdit = row => { if (!canCreate) { denyAction(setToast, "Tu rol no permite corregir registros de electricidad."); return; } if (!row) return; setEditRecord(row); };
  const handleEditSubmitted = () => { setEditRecord(null); loadAll(); setToast({ title: "Corrección reenviada", message: "El registro corregido se envió a revisión." }); };
  const requestCancel = row => { if (!row?.id) return; setCancelDialog(row); };
  const confirmCancel = async () => {
    const target = cancelDialog;
    if (!target?.id) return;
    setCancellingId(target.id);
    try {
      await archiveEmissionRecord(target.id, buildArchiveAuditPayload(archivePermission.actor || resolveArchiveActor(user), "Petición cancelada por el usuario"));
      setRecords(prev => prev.filter(record => record.id !== target.id));
      setDrill(prev => (prev?.id === target.id ? null : prev));
      setCancelDialog(null);
      setCancellingId("");
      setToast({ title: "Petición cancelada", message: "El registro salió de la cola de revisión." });
    } catch (error) {
      setCancellingId("");
      setToast({ title: "No se pudo cancelar", message: error?.payload?.message || error?.message || "Intenta nuevamente." });
    }
  };
  const openArchiveDialog = row => { if (!archivePermission.allowed) { setToast({ title: "Accion restringida", message: archivePermission.message }); return; } if (row?.validationStatus === "approved") { setToast({ title: "Acción no permitida", message: "Los registros completados solo pueden darse de baja desde el panel de administración." }); return; } setArchiveDialog(row); };
  const handleArchiveConfirm = async ({ reason }) => {
    if (!archiveDialog?.id || !archivePermission.allowed) return;
    const recordToArchive = archiveDialog;
    setArchivingId(recordToArchive.id);
    try {
      await archiveEmissionRecord(recordToArchive.id, buildArchiveAuditPayload(archivePermission.actor, reason));
      createNotification({
        type: "record_archived",
        title: "Registro dado de baja",
        message: `Se dio de baja el registro de electricidad "${recordToArchive.activity}" con trazabilidad conservada.`,
        link: "/scope-2/electricidad",
        meta: { recordId: recordToArchive.id, category: recordToArchive.category, scope: "scope_2" },
      }).catch(() => null);
      setRemovingIds(prev => (prev.includes(recordToArchive.id) ? prev : [...prev, recordToArchive.id]));
      window.setTimeout(() => {
        setRecords(prev => prev.filter(record => record.id !== recordToArchive.id));
        setRemovingIds(prev => prev.filter(id => id !== recordToArchive.id));
        setDrill(prev => (prev?.id === recordToArchive.id ? null : prev));
        setArchiveDialog(null);
        setArchivingId("");
        setToast({ title: "Registro dado de baja", message: "Salio del flujo operativo y mantuvo su trazabilidad." });
      }, 280);
    } catch (error) {
      setArchivingId("");
      setToast({ title: "No se pudo dar de baja", message: error?.status === 404 ? "El backend aun no expone esta baja logica." : "La baja no se completo. Intenta nuevamente." });
    }
  };
  const related = useMemo(() => { if (!drill) return []; return filtered.filter(r => r.id !== drill.id).filter(r => r.area === drill.area).slice(0, 5); }, [drill, filtered]);
  const toggleSort = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } setPage(0); };

  const btnPrimary = { height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "none", background: "var(--eco-primary-500)", color: "white", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "var(--eco-shadow-sm)", transition: "all 200ms cubic-bezier(.33,1,.68,1)" };
  const btnSec = { height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", background: "white", color: "var(--eco-gray-700)", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 150ms" };
  const hoverSec = e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.color = "var(--eco-primary-700)"; };
  const leaveSec = e => { e.currentTarget.style.borderColor = "var(--eco-border)"; e.currentTarget.style.color = "var(--eco-gray-700)"; };

  /* ═══ RENDER ═══ */
  if (loading) return (<><style>{ANIM_CSS}</style><PageSkeleton /></>);
  return (<>
    <style>{ANIM_CSS}</style>
    <div style={{ padding: "var(--page-pad-y,24px) var(--page-pad-x,24px)" }}>
      <div style={{ maxWidth: "var(--content-max,1440px)", margin: "0 auto" }}>

        {/* ═══ HERO HEADER ═══ */}
        <div className="ct-hero" style={{ animation: "ctFadeUp .45s cubic-bezier(.33,1,.68,1)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto" }}>
              <div className="ct-hero-glyph" aria-hidden="true">
                <Zap size={26} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="ct-eyebrow-chip">
                  <span className="ct-eyebrow-chip-dot" />
                  <span className="ct-eyebrow-chip-text">Scope 2 · Indirectas</span>
                </div>
                <h1 style={{ margin: 0, fontFamily: fd, fontSize: 28, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.025em", lineHeight: 1.1 }}>Electricidad</h1>
                <p style={{ margin: "4px 0 0", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-500)", lineHeight: 1.5 }}>Consumo eléctrico (kWh) y emisiones (CO₂e) · Clic en gráficas para filtrar</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <span className="ct-pill"><span className="ct-pill-dot" />{filtered.length} registros</span>
                  <span className="ct-pill"><Calendar size={11} className="ct-pill-icon" />{summaryFilters[0]}</span>
                  {areas.length > 0 && <span className="ct-pill"><Building2 size={11} className="ct-pill-icon" />{areas.length} {areas.length === 1 ? "área" : "áreas"}</span>}
                </div>
              </div>
            </div>
            <div className="ct-hdr-acts" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
              <button className="ct-action-primary" onClick={() => { if (!canCreate) { denyAction(setToast, "Tu rol no permite crear registros de electricidad."); return; } onOpenRecord?.(); }} style={disabledActionStyle(canCreate, { ...btnPrimary, background: "linear-gradient(135deg,#22C55E,#15803D)", boxShadow: "0 8px 18px -10px rgba(21,128,61,.5)" })} onMouseEnter={e => { if (!canCreate) return; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 12px 24px -10px rgba(21,128,61,.6)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 18px -10px rgba(21,128,61,.5)"; }}><Plus size={14} />Nuevo registro</button>
              <button onClick={exportCsv} style={disabledActionStyle(canExport, btnSec)} onMouseEnter={e => { if (canExport) hoverSec(e); }} onMouseLeave={leaveSec}><Download size={14} />Exportar</button>
              <button onClick={() => openTrace()} style={btnSec} onMouseEnter={hoverSec} onMouseLeave={leaveSec}><Eye size={14} />Trazabilidad</button>
            </div>
          </div>
        </div>

        {storageError && <div role="alert" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--ct-storage-error-border)", background: "var(--eco-warning-bg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, animation: "ctFadeUp .3s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} style={{ color: "var(--eco-warning)", flexShrink: 0 }} /><span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-700)" }}>{storageError}</span></div>
          <button onClick={loadAll} style={{ border: "1px solid var(--eco-border)", background: "white", borderRadius: "var(--eco-radius-sm)", padding: "4px 10px", fontFamily: fb, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--eco-gray-700)" }}>Reintentar</button>
        </div>}

        {/* ═══ FILTERS (collapsible) ═══ */}
        <div className="ct-filterbar" style={{ background: "white", borderRadius: 14, border: "1px solid rgba(59,130,246,.20)", boxShadow: "0 2px 6px -3px rgba(15,23,42,.05)", marginBottom: 22, overflow: "hidden", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 60ms both" }}>
          <button onClick={() => setFiltersOpen(!filtersOpen)} style={{ width: "100%", padding: "14px 18px", border: "none", background: filtersOpen ? "var(--ct-filter-open-grad)" : "var(--eco-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: filtersOpen ? "1px solid var(--eco-border)" : "none", transition: "background 180ms ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="ct-icon-blue" style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Filter size={14} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontFamily: fd, fontSize: 14, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.005em" }}>Filtros y periodo</span>
                <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>Ajusta lo que aparece en KPIs y gráficas</span>
              </div>
              {activeFC > 0 && <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", color: "white", fontFamily: fm, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 7px", marginLeft: 6, boxShadow: "0 4px 10px -4px rgba(29,78,216,.45)" }}>{activeFC}</span>}
            </div>
            <ChevronDown size={16} style={{ color: "var(--eco-gray-400)", transition: "transform 220ms cubic-bezier(.4,0,.2,1)", transform: filtersOpen ? "rotate(180deg)" : "rotate(0)" }} />
          </button>
          {filtersOpen && <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
              <FilterSel label="Periodo" value={periodMode} onChange={e => { setPeriodMode(e.target.value); setPage(0); }} icon={<Calendar size={11} />} options={[{ v: "todos", l: "Todos" }, { v: "mes", l: "Mes / Año" }, { v: "rango", l: "Rango" }]} />
              {periodMode === "mes" ? <>
                <FilterSel label="Mes" value={month} onChange={e => { setMonth(Number(e.target.value)); setPage(0); }} options={MONTHS_ES.map((m, i) => ({ v: i + 1, l: m }))} />
                <FilterSel label="Año" value={year} onChange={e => { setYear(Number(e.target.value)); setPage(0); }} options={[2025, 2026, 2027].map(y => ({ v: y, l: String(y) }))} />
              </> : periodMode === "rango" ? <>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)" }}>Desde</span><input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0); }} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)" }} /></label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: fb, fontSize: 12, fontWeight: 500, color: "var(--eco-gray-500)" }}>Hasta</span><input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(0); }} style={{ height: 36, borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", padding: "0 10px", fontFamily: fb, fontSize: 13, color: "var(--eco-gray-700)" }} /></label>
              </> : null}
              <FilterSel label="Área" value={fArea} onChange={e => { setFArea(e.target.value); setPage(0); }} icon={<Building2 size={11} />} options={[{ v: "", l: "Todas" }, ...areas.map(a => ({ v: a, l: a }))]} />
              <FilterSel label="Estado" value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(0); }} icon={<CheckCircle2 size={11} />} options={[{ v: "", l: "Todos" }, { v: "real", l: "Real" }, { v: "est", l: "Estimado" }]} />
              <FilterSel label="Fuente" value={fSource} onChange={e => { setFSource(e.target.value); setPage(0); }} options={[{ v: "", l: "Todas" }, ...sources.map(s => ({ v: s, l: s }))]} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={clearFilters} style={{ height: 32, padding: "0 12px", borderRadius: "var(--eco-radius-sm)", border: "1px solid var(--eco-border)", background: "white", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-600)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 150ms" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--eco-primary-300)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--eco-border)"}><RotateCcw size={12} />Limpiar filtros</button>
            </div>
          </div>}
        </div>

        {/* ═══ KPIs ═══ */}
        <SectionLabel icon={<Gauge size={14} />} delay={100} sub="Resumen del consumo y emisiones del periodo seleccionado">Indicadores clave</SectionLabel>
        <div className="ct-kpi-g" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
          <KpiCard title="Consumo eléctrico" sub={`${filtered.length} registros`} value={kpis.kwh} unit="kWh" icon={<Zap size={18} />} tone="info" delay={120} sparkData={lineData.map(d => d.kwh)} />
          <KpiCard title="CO₂e total" sub="Emisiones indirectas" value={kpis.co2T} unit="tCO₂e" icon={<Activity size={18} />} tone="emerald" delay={180} sparkData={lineData.map(d => d.co2e)} status={kpis.co2T > 3 ? "danger" : kpis.co2T > 1.5 ? "warning" : undefined} />
          <KpiCard title="Factor promedio" value={kpis.factorAvg ? fN(kpis.factorAvg, 3) : "-"} unit="kgCO₂e/kWh" icon={<Gauge size={18} />} tone="cyan" delay={240} />
          <KpiCard title="Datos reales" sub="Calidad de datos" value={kpis.pctReal} unit="%" icon={<CheckCircle2 size={18} />} tone="success" delay={300} status={kpis.pctReal >= 80 ? "success" : kpis.pctReal >= 60 ? "warning" : "danger"} />
          <KpiCard title="Variación" sub="vs periodo anterior" value={kpis.change || "-"} unit="" icon={<Calendar size={18} />} tone="neutral" delta={kpis.change} trend={kpis.trend} delay={360} />
        </div>

        {/* ═══ CHARTS ═══ */}
        <SectionLabel icon={<TrendingDown size={14} />} delay={200} sub="Tendencias por mes, área, fuente y calidad del dato">Gráficas</SectionLabel>
        <div className="ct-ch-main" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
          <ChartCard title="Consumo y emisiones por mes" sub="kWh (área) + tCO₂e (línea)" delay={250} accentIcon={<TrendingDown size={14} />}>
            {lineData.length === 0 ? (
              <EmptyAreaSilhouette title="Aún no hay tendencias" sub="Cuando se registren consumos en el periodo, verás aquí kWh y tCO₂e por mes." />
            ) : (
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
            )}
          </ChartCard>
          <ChartCard title="CO₂e por área" sub="Clic para filtrar" delay={310} accentIcon={<Building2 size={14} />}>
            {areaBars.length === 0 ? (
              <EmptyBarSilhouette title="Sin distribución por área" sub="Las áreas con consumo aparecerán aquí cuando haya registros aprobados." />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={areaBars} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false} />
                  <XAxis dataKey="area" tick={{ fontFamily: "var(--eco-font-body)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: "var(--eco-font-mono)", fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <RTooltip content={<EcoTooltip />} cursor={{ fill: "rgba(136,136,136,0.15)" }} />
                  <Bar dataKey="co2e" name="CO₂e (t)" radius={[5, 5, 0, 0]} cursor="pointer" onClick={d => { setFArea(p => p === d.area ? "" : d.area); setPage(0); }}>
                    {areaBars.map((row, i) => <Cell key={row.area} fill={fArea === row.area ? "#1D4ED8" : i % 2 ? "#93C5FD" : "#3B82F6"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
        <div className="ct-ch-donuts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          <ChartCard title="Por fuente de dato" sub="Clic para filtrar" delay={370} accentIcon={<Search size={14} />}>
            {sourceDonut.length === 0 ? (
              <EmptyDonutSilhouette title="Sin fuentes registradas" sub="Cuando captures datos por recibo, medición o estimación verás su distribución." />
            ) : (
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
            )}
          </ChartCard>
          <ChartCard title="Real vs Estimado" sub="Clic para filtrar" delay={430} accentIcon={<CheckCircle2 size={14} />}>
            {statusDonut.length === 0 ? (
              <EmptyDonutSilhouette title="Sin calidad de dato registrada" sub="La proporción de datos reales contra estimados aparecerá aquí." />
            ) : (
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
            )}
          </ChartCard>
        </div>

        <SectionLabel icon={<Activity size={14} />} delay={280} sub={`${requestRows.pending.length} en revisión · ${requestRows.returned.length} devueltas`}>Peticiones</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 28, animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 300ms both" }}>
          <RequestTable title="Enviadas a revisión" rows={requestRows.pending} emptyText="No hay registros esperando revisión." onOpen={openTrace} />
          <RequestTable title="Devueltas para corregir" rows={requestRows.returned} emptyText="No hay registros devueltos por el administrador." tone="warning" onOpen={openTrace} onEdit={canCreate ? openEdit : undefined} />
        </div>

        {/* ═══ TABLE ═══ */}
        <SectionLabel icon={<CheckCircle2 size={14} />} delay={300} sub="Registros aprobados que cuentan en el inventario de emisiones">{`Registros completados (${filtered.length})`}</SectionLabel>
        {filtered.length === 0 ?
          <div style={{ animation: "ctFadeUp .4s ease-out" }}>
            <EmptyRowsSilhouette rows={5} title="Sin registros aprobados" sub="No hay resultados para esta combinación de filtros. Prueba con otro periodo o limpia los filtros." />
          </div>
        : <div className="ct-table-card" style={{ background: "white", borderRadius: 14, border: "1px solid var(--eco-border)", boxShadow: "0 2px 6px -3px rgba(15,23,42,.05)", overflow: "hidden", animation: "ctFadeUp .4s cubic-bezier(.33,1,.68,1) 350ms both" }}>
          <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px dashed var(--eco-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div className="ct-icon-green" style={{ width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={14} />
              </div>
              <div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 13.5, fontWeight: 800, color: "var(--eco-gray-900)", letterSpacing: "-0.005em" }}>Tabla detallada</p>
                <p style={{ margin: "1px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-gray-500)" }}>Ordena por columna · clic en una fila para abrir trazabilidad</p>
              </div>
            </div>
            <span style={{ fontFamily: fm, fontSize: 11.5, fontWeight: 800, color: "var(--eco-primary-700)", padding: "3px 10px", borderRadius: 999, background: "var(--eco-primary-50)", border: "1px solid rgba(34,197,94,.20)" }}>{filtered.length}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fb, fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--eco-border)", background: "var(--ct-table-head-grad)" }}>
                {[{ k: "dateISO", l: "Fecha" }, { k: "area", l: "Área" }, { k: "activity", l: "Actividad" }, { k: "value", l: "kWh" }, { k: "factor", l: "Factor" }, { k: "co2e_kg", l: "CO₂e (kg)" }, { k: "co2e_t", l: "CO₂e (t)" }, { k: "status", l: "Estado" }, { k: "source", l: "Fuente" }, { k: null, l: "" }].map((col, ci) => <th key={ci} onClick={col.k ? () => toggleSort(col.k) : undefined} style={{ padding: "11px 12px", textAlign: "left", fontFamily: fb, fontSize: 10.5, fontWeight: 700, color: "var(--eco-gray-500)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", cursor: col.k ? "pointer" : "default", userSelect: "none" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{col.l}{sortCol === col.k && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span></th>)}
              </tr></thead>
              <tbody>{paged.map((r, i) =>
                <tr key={r.id} style={{ borderBottom: i < paged.length - 1 ? "1px solid var(--eco-gray-100)" : "none", background: hovRow === r.id ? "rgba(59,130,246,.05)" : "white", transition: "background 140ms, opacity 220ms ease, transform 220ms ease, filter 220ms ease", cursor: "pointer", animation: `ctRowIn .3s ease-out ${Math.min(i * 30, 300)}ms both`, opacity: removingIds.includes(r.id) ? 0 : 1, transform: removingIds.includes(r.id) ? "translateX(18px) scale(0.985)" : "translateX(0) scale(1)", filter: removingIds.includes(r.id) ? "blur(2px)" : "none", pointerEvents: removingIds.includes(r.id) ? "none" : "auto" }}
                  onMouseEnter={() => setHovRow(r.id)} onMouseLeave={() => setHovRow(null)} onClick={() => openTrace(r)}>
                  <td style={{ padding: "11px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-600)", whiteSpace: "nowrap" }}>{fDate(r.dateISO)}</td>
                  <td style={{ padding: "11px 12px", color: "var(--eco-gray-800)", fontWeight: 700 }}>{r.area}</td>
                  <td style={{ padding: "11px 12px", color: "var(--eco-gray-600)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.activity}</td>
                  <td className="ct-kwh-strong" style={{ padding: "11px 12px", fontFamily: fm, fontSize: 12, fontWeight: 700 }}>{fN(r.value, 0)}</td>
                  <td style={{ padding: "11px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-500)" }}>{fN(r.factor, 3)}</td>
                  <td style={{ padding: "11px 12px", fontFamily: fm, fontSize: 12, color: "var(--eco-gray-700)" }}>{fN(r.co2e_kg, 1)}</td>
                  <td style={{ padding: "11px 12px", fontFamily: fm, fontWeight: 800, color: "var(--eco-primary-700)" }}>{fN(r.co2e_t, 3)}</td>
                  <td style={{ padding: "11px 12px" }}><Badge status={r.status} /></td>
                  <td style={{ padding: "11px 12px", color: "var(--eco-gray-500)", fontSize: 12 }}>{r.source}</td>
                  <td style={{ padding: "11px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}><button onClick={e => { e.stopPropagation(); openTrace(r); }} aria-label={`Ver ${r.activity}`} style={{ height: 30, width: 30, borderRadius: 8, border: "1px solid var(--eco-border)", background: "var(--eco-card)", color: "var(--eco-text-soft)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 180ms cubic-bezier(.4,0,.2,1)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,.45)"; e.currentTarget.style.color = "var(--ct-kwh-emphasis)"; e.currentTarget.style.background = "var(--ct-kwh-emphasis-soft)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-border)"; e.currentTarget.style.color = "var(--eco-text-soft)"; e.currentTarget.style.background = "var(--eco-card)"; e.currentTarget.style.transform = "translateY(0)"; }}><ExternalLink size={13} /></button></div></td>
                </tr>
              )}</tbody>
            </table>
          </div>
          {totalPages > 1 && <div style={{ padding: "12px 18px", borderTop: "1px solid var(--eco-gray-100)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--ct-table-pagination-grad)" }}>
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-600)" }}>Mostrando <strong style={{ color: "var(--eco-gray-800)" }}>{page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)}</strong> de <strong style={{ color: "var(--eco-gray-800)" }}>{filtered.length}</strong></span>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--eco-border)", background: "white", cursor: page === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--eco-gray-500)", opacity: page === 0 ? 0.4 : 1, transition: "all 150ms" }}><ChevronLeft size={15} /></button>
              {Array.from({ length: totalPages }, (_, i) => <button key={i} onClick={() => setPage(i)} style={{ minWidth: 32, height: 32, padding: "0 8px", borderRadius: 8, border: `1px solid ${page === i ? "transparent" : "var(--eco-border)"}`, background: page === i ? "linear-gradient(135deg,#3B82F6,#1D4ED8)" : "white", fontFamily: fm, fontSize: 12, fontWeight: page === i ? 800 : 600, color: page === i ? "white" : "var(--eco-gray-600)", cursor: "pointer", transition: "all 180ms cubic-bezier(.4,0,.2,1)", boxShadow: page === i ? "0 6px 14px -8px rgba(29,78,216,.55)" : "none" }}>{i + 1}</button>)}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--eco-border)", background: "white", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--eco-gray-500)", opacity: page >= totalPages - 1 ? 0.4 : 1, transition: "all 150ms" }}><ChevronRight size={15} /></button>
            </div>
          </div>}
        </div>}
      </div>
    </div>

    <Toast toast={toast} onDismiss={() => setToast(null)} />

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

    <NewRecordModal
      open={Boolean(editRecord)}
      editRecord={editRecord}
      onClose={() => setEditRecord(null)}
      onCreate={handleEditSubmitted}
    />

    {cancelDialog && (
      <div role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget && !cancellingId) setCancelDialog(null); }}
        style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(15,23,42,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 16, animation: "ctFadeUp .2s ease-out" }}>
        <div style={{ width: "min(420px, 100%)", background: "white", borderRadius: "var(--eco-radius-lg)", border: "1px solid var(--eco-border)", boxShadow: "var(--eco-shadow-lg)", overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--eco-gray-100)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--eco-radius-md)", background: "rgba(239,68,68,.1)", color: "var(--eco-danger)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-gray-900)" }}>Cancelar petición</p>
              <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{cancelDialog.activity}</p>
            </div>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <p style={{ margin: 0, fontFamily: fb, fontSize: 13.5, color: "var(--eco-gray-700)", lineHeight: 1.5 }}>¿Seguro que quieres cancelar esta petición? El registro saldrá de la cola de revisión.</p>
          </div>
          <div style={{ padding: "12px 18px 16px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { if (!cancellingId) setCancelDialog(null); }} disabled={Boolean(cancellingId)}
              style={{ height: 36, padding: "0 16px", borderRadius: "var(--eco-radius-md)", border: "1px solid var(--eco-border)", background: "white", color: "var(--eco-gray-700)", fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: cancellingId ? "not-allowed" : "pointer" }}>
              No
            </button>
            <button type="button" onClick={confirmCancel} disabled={Boolean(cancellingId)}
              style={{ height: 36, padding: "0 16px", borderRadius: "var(--eco-radius-md)", border: "none", background: "linear-gradient(135deg, #EF4444, #DC2626)", color: "white", fontFamily: fb, fontSize: 13, fontWeight: 700, cursor: cancellingId ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: cancellingId ? 0.7 : 1 }}>
              Sí, cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ═══ DRILL-DOWN PANEL ═══ */}
    {drill && <DrillPanel title="Trazabilidad de electricidad" breadcrumb="Scope 2 → Electricidad → Detalle" onClose={() => setDrill(null)}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--eco-info-bg)", border: "1px solid #BFDBFE", borderRadius: "var(--eco-radius-lg)", padding: 16, textAlign: "center", animation: "ctFadeUp .3s ease-out" }}>
          <p style={{ margin: "0 0 8px", fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-info)" }}>Cálculo de emisiones - Scope 2</p>
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
          {[{ l: "Fecha", v: fDate(drill.dateISO) }, { l: "Área", v: drill.area }, { l: "Scope", v: "Scope 2 - Electricidad" }, { l: "Actividad", v: drill.activity }, { l: "Consumo", v: `${fN(drill.value, 0)} kWh` }, { l: "Factor aplicado", v: `${fN(drill.factor, 3)} kgCO₂e/kWh (SEMARNAT 2024)` }, { l: "CO₂e (kg)", v: `${fN(drill.co2e_kg, 1)} kgCO₂e` }, { l: "Estado", v: null, badge: true }, { l: "Fuente", v: drill.source }, { l: "Capturado por", v: drill.by || "-" }].map((row, i) =>
            <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: i < 9 ? "1px solid var(--eco-gray-100)" : "none", animation: `ctFadeUp .3s ease-out ${i * 30}ms both` }}>
              <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-gray-500)" }}>{row.l}</span>
              {row.badge ? <Badge status={drill.status} /> : <span style={{ fontFamily: fb, fontSize: 12, fontWeight: 600, color: "var(--eco-gray-700)", textAlign: "right" }}>{row.v}</span>}
            </div>
          )}
        </div>

        <div style={{ background: "var(--eco-surface, white)", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-md)", padding: 14, display: "flex", flexDirection: "column", gap: 12, animation: "ctFadeUp .3s ease-out 120ms both" }}>
          <p style={{ margin: 0, fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)" }}>Detalle capturado</p>

          <EvidenceImage url={drill.evidenceUrl} accentColor="var(--eco-info)" />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "10px 12px", borderRadius: "var(--eco-radius-sm)", background: "var(--eco-gray-50)", border: "1px solid var(--eco-gray-100)" }}>
              <p style={{ margin: "0 0 4px", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)" }}>Actividad / descripción</p>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 12.5, color: "var(--eco-gray-700)", lineHeight: 1.6 }}>{drill.activity || "Sin actividad registrada."}</p>
            </div>

            <div style={{ padding: "10px 12px", borderRadius: "var(--eco-radius-sm)", background: "var(--eco-gray-50)", border: "1px solid var(--eco-gray-100)" }}>
              <p style={{ margin: "0 0 4px", fontFamily: fb, fontSize: 11, fontWeight: 600, color: "var(--eco-gray-500)" }}>Nota (opcional)</p>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 12.5, color: drill.note ? "var(--eco-gray-700)" : "var(--eco-gray-400)", lineHeight: 1.6 }}>{drill.note || "Sin nota adicional."}</p>
            </div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid var(--eco-border)", borderRadius: "var(--eco-radius-md)", padding: 12 }}>
          <p style={{ margin: "0 0 8px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", display: "flex", alignItems: "center", gap: 6 }}><Filter size={12} />Filtros activos</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{summaryFilters.map(item => <span key={item} style={{ fontFamily: fb, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: "var(--eco-radius-full)", background: "var(--eco-gray-100)", color: "var(--eco-gray-600)" }}>{item}</span>)}</div>
        </div>

        {drill.validationStatus === "approved" ? (
          <div style={{ background: "var(--eco-info-bg, rgba(59,130,246,.06))", border: "1px solid rgba(59,130,246,.18)", borderRadius: "var(--eco-radius-lg)", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <CheckCircle2 size={16} style={{ color: "var(--eco-info)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: "0 0 3px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text, var(--eco-gray-800))" }}>Registro completado</p>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 11.5, color: "var(--eco-gray-500)", lineHeight: 1.5 }}>Los registros aprobados solo pueden darse de baja desde el panel de administración para preservar la auditoría.</p>
            </div>
          </div>
        ) : drill.latestValidationDecision === "returned" ? null : (
          <div style={{ background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.12)", borderRadius: "var(--eco-radius-lg)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", transition: "all .2s ease" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ margin: "0 0 3px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-text, var(--eco-gray-800))" }}>Cancelar petición</p>
              <p style={{ margin: 0, fontFamily: fb, fontSize: 11.5, color: "var(--eco-gray-500)", lineHeight: 1.5 }}>Retira esta petición de la cola de revisión. La acción no se podrá volver a revertir.</p>
            </div>
            <button onClick={() => requestCancel(drill)} disabled={cancellingId === drill.id} style={{ height: 36, padding: "0 14px", borderRadius: "var(--eco-radius-md)", border: "none", background: "linear-gradient(135deg, #EF4444, #DC2626)", color: "#fff", fontFamily: fb, fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, cursor: cancellingId === drill.id ? "wait" : "pointer", boxShadow: "0 6px 16px -6px rgba(220,38,38,.45)", transition: "all .2s cubic-bezier(.4,0,.2,1)", flexShrink: 0, opacity: cancellingId === drill.id ? 0.7 : 1 }}
              onMouseEnter={e => { if (cancellingId === drill.id) return; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(220,38,38,.55)"; e.currentTarget.style.filter = "brightness(1.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 16px -6px rgba(220,38,38,.45)"; e.currentTarget.style.filter = "brightness(1)"; }}><X size={13} />Cancelar petición</button>
          </div>
        )}

        <div>
          <p style={{ margin: "0 0 10px", fontFamily: fd, fontSize: 13, fontWeight: 700, color: "var(--eco-gray-700)", display: "flex", alignItems: "center", gap: 6 }}><ArrowRight size={12} />Registros relacionados</p>
          {related.length ? related.map((row, i) =>
            <button key={row.id} onClick={() => setDrill(row)} style={{ width: "100%", border: "1px solid var(--eco-border)", background: "white", borderRadius: "var(--eco-radius-md)", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 6, transition: "all 150ms", animation: `ctFadeUp .3s ease-out ${i * 40}ms both` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--eco-primary-300)"; e.currentTarget.style.background = "var(--eco-primary-50)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--eco-border)"; e.currentTarget.style.background = "white"; }}>
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

