import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Download, FileText, RotateCcw, X, Eye, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Zap, Flame, Leaf, Calendar, Building2, ArrowRight, BarChart3, Filter, Paperclip, ClipboardList, Settings2, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart as RPieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { buildCsvText, downloadCsvFile } from "../lib/exportCsv";
import { add as addNotification } from "../lib/notificationsStore";

const fd="var(--eco-font-display)",fb="var(--eco-font-body)",fm="var(--eco-font-mono)";
const RECORDS_KEY="carbontrack.records",ACTIVITY_KEY="carbontrack.activity";
const MONTHS_ES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const AREA_OPTIONS=["Aulas","CC1","CC2","Redes","Industrial/Calidad","Agricola","Administracion"];
const CAT_COL={electricidad:"#22C55E",combustible:"#EAB308",otros:"#64748B"};
const CSS=`
@keyframes ctUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes ctSlideR{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes ctSlideL{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctSlideRt{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctOverlay{from{opacity:0}to{opacity:1}}
@keyframes ctPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ctRowIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes ctPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.3)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
@keyframes ctCheck{from{transform:scale(0) rotate(-45deg)}to{transform:scale(1) rotate(0)}}
@media(max-width:1024px){.ct-kpi-g{grid-template-columns:1fr 1fr!important}.ct-ch-m{grid-template-columns:1fr!important}}
@media(max-width:640px){.ct-kpi-g{grid-template-columns:1fr!important}.ct-hdr-a{flex-direction:column;width:100%}.ct-hdr-a button{width:100%}.ct-wiz-grid{grid-template-columns:1fr!important}}
`;

/* ═══ UTILS (same logic) ═══ */
const fN=(n,d=1)=>Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:d,maximumFractionDigits:d});
const mKey=iso=>{const d=new Date(`${iso}T12:00:00`);if(Number.isNaN(d.getTime()))return"";return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
const dLabel=iso=>{const d=new Date(`${iso}T12:00:00`);if(Number.isNaN(d.getTime()))return"-";return`${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;};
function useCountUp(target,dur=650){const[v,setV]=useState(0);const ref=useRef(null);useEffect(()=>{let s=null;const ease=t=>1-Math.pow(1-t,3);const step=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);setV(ease(p)*target);if(p<1)ref.current=requestAnimationFrame(step);else setV(target);};ref.current=requestAnimationFrame(step);return()=>ref.current&&cancelAnimationFrame(ref.current);},[target,dur]);return v;}

function normArea(raw){const t=String(raw||"").toLowerCase();if(t.includes("aula"))return"Aulas";if(t.includes("cc 1")||t.includes("cc1")||t.includes("computo 1"))return"CC1";if(t.includes("cc 2")||t.includes("cc2")||t.includes("computo 2"))return"CC2";if(t.includes("redes"))return"Redes";if(t.includes("industrial")||t.includes("calidad"))return"Industrial/Calidad";if(t.includes("agri")||t.includes("vivero")||t.includes("tractor"))return"Agricola";return"Administracion";}
function normCat(r){const c=String(r?.category||"").toLowerCase(),u=String(r?.unit||"").toLowerCase();if(c.includes("elec")||u==="kwh")return"electricidad";if(c.includes("comb")||u==="l"||u==="lt"||u.includes("lit"))return"combustible";if(c.includes("otro"))return"otros";return"electricidad";}
function normSrc(raw,st){const s=String(raw||"").toLowerCase();if(s.includes("recibo")||s.includes("cfe"))return"Recibo";if(s.includes("medi"))return"Medicion";if(s.includes("encu"))return"Encuesta";if(s.includes("inven"))return"Inventario";if(s.includes("estim"))return"Estimacion";return st==="est"?"Estimacion":"Medicion";}
function toRec(inp,idx){const st=inp?.status==="est"||inp?.isEstimated?"est":"real";const cat=normCat(inp);const fac=Number(inp?.factor)||(cat==="combustible"?2.68:cat==="electricidad"?0.435:1);const val=Number(inp?.value)||0;const co2=Number(inp?.co2e_kg)>0?Number(inp?.co2e_kg):val*fac;const co2t=Number(inp?.co2e_t)>0?Number(inp?.co2e_t):co2/1000;return{id:String(inp?.id||`r-${idx}`),dateISO:String(inp?.dateISO||new Date().toISOString().slice(0,10)),area:normArea(inp?.area),category:cat,activity:String(inp?.activity||"Sin actividad"),value:val,unit:String(inp?.unit||(cat==="combustible"?"L":"kWh")),factor:fac,co2e_kg:co2,co2e_t:co2t,status:st,source:normSrc(inp?.source,st),evidence:String(inp?.evidenceUrl||inp?.evidence||"")};}
function loadRecs(){try{const raw=JSON.parse(window.localStorage.getItem(RECORDS_KEY)||"[]");const main=Array.isArray(raw)?raw.map((r,i)=>toRec(r,i)):[];const aRaw=JSON.parse(window.localStorage.getItem(ACTIVITY_KEY)||"[]");const act=Array.isArray(aRaw)?aRaw.map((r,i)=>toRec({...r,id:r?.id||`a-${i}`,category:"electricidad",source:r?.source||(r?.status==="est"?"Estimacion":"Medicion")},i+1000)):[];const map=new Map();[...main,...act].forEach(r=>{const k=`${r.dateISO}|${r.area}|${r.activity}|${r.co2e_t}`;if(!map.has(k))map.set(k,r);});return{records:Array.from(map.values()).sort((a,b)=>b.dateISO.localeCompare(a.dateISO)),error:""};}catch{return{records:[],error:"No se pudo cargar datos."};}}
function matchPer(row,f){if(f.periodMode==="mes")return mKey(row.dateISO)===`${f.year}-${String(f.month).padStart(2,"0")}`;const t=new Date(`${row.dateISO}T12:00:00`).getTime();if(f.fromDate&&t<new Date(`${f.fromDate}T00:00:00`).getTime())return false;if(f.toDate&&t>new Date(`${f.toDate}T23:59:59`).getTime())return false;return true;}
function runF(recs,f){return recs.filter(r=>{if(!matchPer(r,f))return false;if(f.category!=="all"&&r.category!==f.category)return false;if(f.area!=="all"&&r.area!==f.area)return false;if(f.realMode==="real"&&r.status!=="real")return false;if(f.realMode==="est"&&r.status!=="est")return false;if(f.source!=="all"&&r.source!==f.source)return false;return true;});}
function buildSum(rows){const tot=rows.reduce((a,r)=>a+r.co2e_t,0);const elec=rows.filter(r=>r.category==="electricidad").reduce((a,r)=>a+r.co2e_t,0);const comb=rows.filter(r=>r.category==="combustible").reduce((a,r)=>a+r.co2e_t,0);const real=rows.filter(r=>r.status==="real").reduce((a,r)=>a+r.co2e_t,0);const est=rows.filter(r=>r.status==="est").reduce((a,r)=>a+r.co2e_t,0);const byAM=rows.reduce((a,r)=>{a[r.area]=(a[r.area]||0)+r.co2e_t;return a;},{});const byArea=Object.entries(byAM).map(([area,co2e])=>({area,co2e,pct:tot>0?(co2e/tot)*100:0})).sort((a,b)=>b.co2e-a.co2e);const byCM=rows.reduce((a,r)=>{a[r.category]=(a[r.category]||0)+r.co2e_t;return a;},{});const byCat=Object.entries(byCM).map(([n,co2e])=>({name:n,label:n==="electricidad"?"Electricidad":n==="combustible"?"Combustible":"Otros",co2e,pct:tot>0?(co2e/tot)*100:0,color:CAT_COL[n]||"#94A3B8"})).sort((a,b)=>b.co2e-a.co2e);const byMM=rows.reduce((a,r)=>{const k=mKey(r.dateISO);a[k]=(a[k]||0)+r.co2e_t;return a;},{});const trend=Object.entries(byMM).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,co2e])=>{const[y,m]=k.split("-").map(Number);return{key:k,label:`${MONTHS_ES[(m||1)-1]} ${y}`,co2e};});return{total:tot,electricidad:elec,combustible:comb,realPct:tot>0?(real/tot)*100:0,estPct:tot>0?(est/tot)*100:0,topAreas:byArea.slice(0,3),byArea,byCategory:byCat,trend};}

/* ═══════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
function Badge({status}){const isR=status==="real";return<span style={{fontFamily:fb,fontSize:10,fontWeight:700,letterSpacing:"0.02em",padding:"2px 8px",borderRadius:"var(--eco-radius-full)",background:isR?"var(--eco-success-bg)":"var(--eco-warning-bg)",color:isR?"var(--eco-success)":"var(--eco-secondary-600)",border:`1px solid ${isR?"#BBF7D0":"#FDE68A"}`,whiteSpace:"nowrap"}}>{isR?"Real":"Estimado"}</span>;}
function EcoTooltip({active,payload,label}){if(!active||!payload?.length)return null;return<div style={{background:"var(--eco-gray-900)",borderRadius:"var(--eco-radius-md)",padding:"10px 14px",boxShadow:"var(--eco-shadow-lg)",border:"none",minWidth:140}}><p style={{margin:"0 0 6px",fontFamily:fb,fontSize:12,fontWeight:600,color:"rgba(255,255,255,.6)"}}>{label}</p>{payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:"50%",background:p.color}}/><span style={{flex:1,fontFamily:fb,fontSize:12,color:"rgba(255,255,255,.7)"}}>{p.name}</span><span style={{fontFamily:fm,fontSize:12,fontWeight:700,color:"white"}}>{fN(p.value,2)}</span></div>)}</div>;}
function Toast({toast}){if(!toast)return null;return<div role="alert" style={{position:"fixed",right:20,bottom:20,zIndex:120,background:"white",border:"1px solid var(--eco-border)",boxShadow:"0 20px 25px -5px rgba(15,23,42,.08)",borderRadius:"var(--eco-radius-lg)",padding:"14px 16px",minWidth:260,maxWidth:340,display:"flex",alignItems:"flex-start",gap:10,animation:"ctSlideR .3s cubic-bezier(.33,1,.68,1)"}}><div style={{width:28,height:28,borderRadius:"var(--eco-radius-sm)",background:"var(--eco-success-bg)",color:"var(--eco-success)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><CheckCircle2 size={14}/></div><div><p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:"var(--eco-gray-800)"}}>{toast.title}</p><p style={{margin:"2px 0 0",fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{toast.message}</p></div></div>;}
function DrillPanel({title,breadcrumb,onClose,children}){useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[onClose]);return<div style={{position:"fixed",inset:0,zIndex:90,display:"flex",justifyContent:"flex-end"}} role="dialog" aria-modal="true"><div style={{position:"absolute",inset:0,background:"rgba(15,23,42,.35)",backdropFilter:"blur(3px)",animation:"ctOverlay .2s ease-out"}} onClick={onClose}/><div style={{position:"relative",width:"100%",maxWidth:560,background:"white",boxShadow:"0 20px 25px -5px rgba(15,23,42,.08)",display:"flex",flexDirection:"column",animation:"ctSlideR .3s cubic-bezier(.33,1,.68,1)"}}><div style={{padding:"16px 20px",borderBottom:"1px solid var(--eco-border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div>{breadcrumb&&<p style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)",margin:"0 0 2px",display:"flex",alignItems:"center",gap:4}}><FileText size={10}/>{breadcrumb}</p>}<h3 style={{margin:0,fontFamily:fd,fontSize:18,fontWeight:700,color:"var(--eco-gray-900)"}}>{title}</h3></div><button onClick={onClose} aria-label="Cerrar" style={{width:32,height:32,borderRadius:"var(--eco-radius-sm)",border:"none",cursor:"pointer",background:"var(--eco-gray-100)",color:"var(--eco-gray-500)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 150ms"}} onMouseEnter={e=>e.currentTarget.style.background="var(--eco-border)"} onMouseLeave={e=>e.currentTarget.style.background="var(--eco-gray-100)"}><X size={16}/></button></div><div style={{flex:1,overflow:"auto",padding:20}}>{children}</div></div></div>;}
function KpiCard({title,value,unit,icon,iconBg,iconColor,sub,delay=0}){const num=Number(String(value).replace(/[^0-9.\-]/g,""))||0;const anim=useCountUp(num,700);const isNum=!isNaN(num)&&String(value)!=="-";return<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",padding:18,border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",transition:"all 200ms cubic-bezier(.33,1,.68,1)",animation:`ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-md)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-sm)";e.currentTarget.style.transform="translateY(0)";}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{width:38,height:38,borderRadius:"var(--eco-radius-md)",background:iconBg||"var(--eco-primary-50)",color:iconColor||"var(--eco-primary-600)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div><p style={{margin:0,fontFamily:fb,fontSize:13,fontWeight:500,color:"var(--eco-gray-500)",lineHeight:1.2}}>{title}</p></div><div style={{display:"flex",alignItems:"baseline",gap:5}}><span style={{fontFamily:fm,fontSize:26,fontWeight:700,color:"var(--eco-gray-900)",letterSpacing:"-0.02em"}}>{isNum?fN(anim,unit==="%"?1:3):value}</span><span style={{fontFamily:fm,fontSize:12,color:"var(--eco-gray-400)"}}>{unit}</span></div>{sub&&<p style={{margin:"4px 0 0",fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)"}}>{sub}</p>}</div>;}
function ChartCard({title,sub,children,delay=0}){return<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",overflow:"hidden",animation:`ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`}}><div style={{padding:"16px 18px 8px"}}><p style={{margin:0,fontFamily:fd,fontSize:15,fontWeight:700,color:"var(--eco-gray-800)"}}>{title}</p>{sub&&<p style={{margin:"2px 0 0",fontFamily:fb,fontSize:12,color:"var(--eco-gray-400)"}}>{sub}</p>}</div><div style={{padding:"4px 10px 14px"}}>{children}</div></div>;}
function Skeleton({h=120,delay=0}){const sh="linear-gradient(90deg,var(--eco-gray-100) 25%,var(--eco-border) 50%,var(--eco-gray-100) 75%)";return<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",height:h,animation:`ctUp .3s ease-out ${delay}ms both`}}><div style={{height:"100%",borderRadius:"var(--eco-radius-lg)",background:sh,backgroundSize:"200% 100%",animation:"ctShimmer 1.5s ease-in-out infinite"}}/></div>;}

/* ═══ WIZARD STEP SELECTOR (chip-style) ═══ */
function StepChip({label,value,active,onClick,icon}){return<button onClick={onClick} style={{height:38,padding:"0 14px",borderRadius:"var(--eco-radius-full)",border:`1.5px solid ${active?"var(--eco-primary-500)":"var(--eco-border)"}`,background:active?"var(--eco-primary-50)":"white",color:active?"var(--eco-primary-700)":"var(--eco-gray-600)",fontFamily:fb,fontSize:13,fontWeight:active?600:500,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 200ms cubic-bezier(.33,1,.68,1)",boxShadow:active?"0 0 0 3px rgba(34,197,94,.1)":"none"}} onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.background="var(--eco-gray-50)";}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.background="white";}}}>{icon}{label}{active&&<CheckCircle2 size={13} style={{color:"var(--eco-primary-500)"}}/>}</button>;}

const selS={height:38,borderRadius:"var(--eco-radius-full)",border:"1.5px solid var(--eco-border)",padding:"0 14px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-700)",background:"white",cursor:"pointer",transition:"border-color 150ms",outline:"none"};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT - WIZARD-STYLE REPORT BUILDER
   ═══════════════════════════════════════════════════════════════ */
export default function ReportsPage(){
  const today=new Date();
  const[records,setRecords]=useState([]);const[toast,setToast]=useState(null);const[error,setError]=useState("");
  const[loadingGen,setLoadingGen]=useState(false);const[generated,setGenerated]=useState(false);
  const[previewRows,setPreviewRows]=useState([]);const[summary,setSummary]=useState(null);
  const[traceOpen,setTraceOpen]=useState(false);const[hovRow,setHovRow]=useState(null);
  const[step,setStep]=useState(1); // wizard step: 1=periodo, 2=alcance, 3=opciones
  const[filters,setFilters]=useState({periodMode:"mes",month:today.getMonth()+1,year:today.getFullYear(),fromDate:"",toDate:"",category:"all",area:"all",realMode:"all",source:"all",format:"csv",includeTrace:true,detailLevel:"summary"});

  const reload=useCallback(()=>{const ld=loadRecs();setRecords(ld.records);setError(ld.error);},[]);
  useEffect(()=>{reload();},[reload]);
  useEffect(()=>{const h=()=>reload();window.addEventListener("carbontrack:newrecord",h);window.addEventListener("storage",h);return()=>{window.removeEventListener("carbontrack:newrecord",h);window.removeEventListener("storage",h);};},[reload]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),3000);return()=>clearTimeout(t);},[toast]);

  const canDownload=generated&&previewRows.length>0&&filters.format==="csv";
  const stepLabels=[{n:1,label:"Periodo",icon:<Calendar size={14}/>},{n:2,label:"Alcance",icon:<Building2 size={14}/>},{n:3,label:"Opciones",icon:<Settings2 size={14}/>}];

  const onGenerate=()=>{setError("");setLoadingGen(true);setGenerated(false);setTimeout(()=>{try{const filtered=runF(records,filters);const s=buildSum(filtered);setPreviewRows(filtered);setSummary(s);setGenerated(true);setLoadingGen(false);setToast({title:"Reporte generado",message:`${filtered.length} registros procesados.`});}catch{setLoadingGen(false);setGenerated(false);setError("No se pudo generar el reporte.");}},420);};

  const onClear=()=>{setFilters({periodMode:"mes",month:today.getMonth()+1,year:today.getFullYear(),fromDate:"",toDate:"",category:"all",area:"all",realMode:"all",source:"all",format:"csv",includeTrace:true,detailLevel:"summary"});setGenerated(false);setPreviewRows([]);setSummary(null);setError("");setStep(1);};

  const onDownload=()=>{if(!canDownload||!summary)return;const pp=filters.periodMode==="mes"?`${filters.year}-${String(filters.month).padStart(2,"0")}`:`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;const name=`carbontrack_reporte_${filters.category}_${filters.area}_${pp}.csv`;
    if(filters.detailLevel==="summary"){const rows=[...summary.byArea.map(r=>({tipo:"Area",nombre:r.area,co2e_t:r.co2e,porcentaje:r.pct})),...summary.byCategory.map(r=>({tipo:"Categoria",nombre:r.label,co2e_t:r.co2e,porcentaje:r.pct})),{tipo:"Total",nombre:"Total CO2e",co2e_t:summary.total,porcentaje:100}];const csv=buildCsvText(rows,[{label:"Tipo",get:r=>r.tipo},{label:"Nombre",get:r=>r.nombre},{label:"CO2e_t",get:r=>fN(r.co2e_t,3)},{label:"%",get:r=>fN(r.porcentaje,1)}]);downloadCsvFile(name,csv);}
    else{const cols=[{label:"Fecha",get:r=>r.dateISO},{label:"Area",get:r=>r.area},{label:"Categoria",get:r=>r.category},{label:"Actividad",get:r=>r.activity},{label:"Valor",get:r=>r.value},{label:"Unidad",get:r=>r.unit},...(filters.includeTrace?[{label:"Factor",get:r=>r.factor}]:[]),{label:"CO2e_kg",get:r=>fN(r.co2e_kg,2)},{label:"CO2e_t",get:r=>fN(r.co2e_t,3)},{label:"Estado",get:r=>r.status==="real"?"Real":"Estimado"},...(filters.includeTrace?[{label:"Fuente",get:r=>r.source},{label:"Evidencia",get:r=>r.evidence||"-"}]:[])];const csv=buildCsvText(previewRows,cols);downloadCsvFile(name,csv);}
    addNotification({type:"export_done",title:"CSV exportado",message:`Se exportó el reporte ${name}.`,link:"/reportes",meta:{filename:name,count:previewRows.length,resource:"reports"}});
    setToast({title:"CSV descargado",message:name});};

  const topBars=useMemo(()=>(summary?.byArea||[]).slice(0,6).map((r,i)=>({...r,color:["#22C55E","#86EFAC","#4ADE80","#16A34A","#15803D","#65A30D"][i%6]})),[summary]);

  /* ─── Wizard step summary text ─── */
  const stepSummary=useMemo(()=>{
    const p=filters.periodMode==="mes"?`${MONTHS_ES[filters.month-1]} ${filters.year}`:`${filters.fromDate||"-"} a ${filters.toDate||"-"}`;
    const c=filters.category==="all"?"Todas":filters.category==="electricidad"?"Electricidad":filters.category==="combustible"?"Combustible":"Otros";
    const a=filters.area==="all"?"Todas":filters.area;
    return{periodo:p,categoria:c,area:a,estado:filters.realMode==="all"?"Todos":filters.realMode==="real"?"Real":"Estimado",formato:filters.format.toUpperCase(),nivel:filters.detailLevel==="summary"?"Resumen":"Detallado"};
  },[filters]);

  /* ═══ RENDER ═══ */
  return(<><style>{CSS}</style>
    <div style={{padding:"var(--page-pad-y,24px) var(--page-pad-x,24px)",maxWidth:"var(--content-max,1440px)",margin:"0 auto"}}>

      {/* ═══ HEADER ═══ */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:24,animation:"ctUp .4s cubic-bezier(.33,1,.68,1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:"var(--eco-radius-md)",background:"linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(34,197,94,.2)",flexShrink:0}}><FileText size={18} color="white"/></div>
          <div><h1 style={{margin:0,fontFamily:fd,fontSize:24,fontWeight:800,color:"var(--eco-gray-900)",letterSpacing:"-0.02em"}}>Genera un reporte necesario</h1>
            <p style={{margin:"2px 0 0",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Configura paso a paso y genera reportes con trazabilidad completa</p></div>
        </div>
        <div className="ct-hdr-a" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={onClear} style={{height:36,padding:"0 14px",borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,color:"var(--eco-gray-700)",transition:"all 150ms"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";}}><RotateCcw size={14}/>Reiniciar</button>
        </div>
      </div>

      {/* ═══ STEPPER BAR ═══ */}
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:24,animation:"ctUp .4s cubic-bezier(.33,1,.68,1) 60ms both"}}>
        {stepLabels.map((s,i)=>{const done=generated||step>s.n;const active=step===s.n&&!generated;return<div key={s.n} style={{display:"flex",alignItems:"center",flex:i<2?1:"none"}}>
          <button onClick={()=>{if(!generated)setStep(s.n);}} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:"var(--eco-radius-full)",border:`1.5px solid ${active?"var(--eco-primary-500)":done?"var(--eco-success)":"var(--eco-border)"}`,background:active?"var(--eco-primary-50)":done?"var(--eco-success-bg)":"white",cursor:generated?"default":"pointer",transition:"all 200ms"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:active?"var(--eco-primary-500)":done?"var(--eco-success)":"var(--eco-border)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:fm,fontSize:11,fontWeight:700,transition:"all 200ms"}}>{done?<CheckCircle2 size={14}/>:s.n}</div>
            <div style={{textAlign:"left"}}><p style={{margin:0,fontFamily:fb,fontSize:13,fontWeight:active?700:500,color:active?"var(--eco-primary-700)":done?"var(--eco-success)":"var(--eco-gray-500)"}}>{s.label}</p></div>
          </button>
          {i<2&&<div style={{flex:1,height:2,background:done?"var(--eco-success)":"var(--eco-border)",margin:"0 8px",borderRadius:1,transition:"background 300ms"}}/>}
        </div>;})}
      </div>

      {error&&<div style={{background:"white",border:"1px solid #FECACA",borderRadius:"var(--eco-radius-lg)",padding:14,marginBottom:14,animation:"ctUp .3s ease-out"}}><p style={{margin:0,fontFamily:fd,fontSize:14,color:"var(--eco-danger)",display:"flex",alignItems:"center",gap:6}}><AlertCircle size={14}/>{error}</p></div>}

      {/* ═══ WIZARD STEPS (before generation) ═══ */}
      {!generated&&!loadingGen&&<div style={{background:"white",border:"1.5px solid var(--eco-primary-500)",borderRadius:"var(--eco-radius-xl, var(--eco-radius-lg))",boxShadow:"var(--eco-shadow-sm)",overflow:"hidden",marginBottom:24,animation:"ctUp .4s cubic-bezier(.33,1,.68,1) 120ms both"}}>

        {/* Step 1: Periodo */}
        {step===1&&<div style={{padding:24,animation:"ctSlideRt .3s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Calendar size={18} style={{color:"var(--eco-primary-600)"}}/><h3 style={{margin:0,fontFamily:fd,fontSize:18,fontWeight:700,color:"var(--eco-gray-800)"}}>¿Qué periodo quieres reportar?</h3></div>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <StepChip label="Mes específico" active={filters.periodMode==="mes"} onClick={()=>setFilters(p=>({...p,periodMode:"mes"}))} icon={<Calendar size={13}/>}/>
            <StepChip label="Rango de fechas" active={filters.periodMode==="rango"} onClick={()=>setFilters(p=>({...p,periodMode:"rango"}))} icon={<ArrowRight size={13}/>}/>
          </div>
          {filters.periodMode==="mes"?<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <select value={filters.month} onChange={e=>setFilters(p=>({...p,month:Number(e.target.value)}))} style={selS}>{MONTHS_ES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
            <select value={filters.year} onChange={e=>setFilters(p=>({...p,year:Number(e.target.value)}))} style={selS}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select>
          </div>:<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <input type="date" value={filters.fromDate} onChange={e=>setFilters(p=>({...p,fromDate:e.target.value}))} style={selS} onFocus={e=>e.target.style.borderColor="var(--eco-primary-300)"} onBlur={e=>e.target.style.borderColor="var(--eco-border)"}/>
            <input type="date" value={filters.toDate} onChange={e=>setFilters(p=>({...p,toDate:e.target.value}))} style={selS} onFocus={e=>e.target.style.borderColor="var(--eco-primary-300)"} onBlur={e=>e.target.style.borderColor="var(--eco-border)"}/>
          </div>}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}><button onClick={()=>setStep(2)} style={{height:38,padding:"0 20px",borderRadius:"var(--eco-radius-full)",border:"none",background:"var(--eco-primary-500)",color:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 200ms"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--eco-primary-600)";}} onMouseLeave={e=>{e.currentTarget.style.background="var(--eco-primary-500)";}}>Siguiente<ChevronRight size={15}/></button></div>
        </div>}

        {/* Step 2: Alcance */}
        {step===2&&<div style={{padding:24,animation:"ctSlideRt .3s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Building2 size={18} style={{color:"var(--eco-primary-600)"}}/><h3 style={{margin:0,fontFamily:fd,fontSize:18,fontWeight:700,color:"var(--eco-gray-800)"}}>¿Qué quieres incluir?</h3></div>
          <p style={{margin:"0 0 12px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Categoría de emisión</p>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <StepChip label="Todas" active={filters.category==="all"} onClick={()=>setFilters(p=>({...p,category:"all"}))} icon={<Leaf size={13}/>}/>
            <StepChip label="Electricidad" active={filters.category==="electricidad"} onClick={()=>setFilters(p=>({...p,category:"electricidad"}))} icon={<Zap size={13}/>}/>
            <StepChip label="Combustible" active={filters.category==="combustible"} onClick={()=>setFilters(p=>({...p,category:"combustible"}))} icon={<Flame size={13}/>}/>
            <StepChip label="Otros" active={filters.category==="otros"} onClick={()=>setFilters(p=>({...p,category:"otros"}))}/>
          </div>
          <p style={{margin:"0 0 12px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Área</p>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <StepChip label="Todas" active={filters.area==="all"} onClick={()=>setFilters(p=>({...p,area:"all"}))} icon={<Building2 size={13}/>}/>
            {AREA_OPTIONS.map(a=><StepChip key={a} label={a} active={filters.area===a} onClick={()=>setFilters(p=>({...p,area:a}))}/>)}
          </div>
          <p style={{margin:"0 0 12px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Estado de datos</p>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <StepChip label="Todos" active={filters.realMode==="all"} onClick={()=>setFilters(p=>({...p,realMode:"all"}))}/>
            <StepChip label="Solo Real" active={filters.realMode==="real"} onClick={()=>setFilters(p=>({...p,realMode:"real"}))} icon={<CheckCircle2 size={13}/>}/>
            <StepChip label="Solo Estimado" active={filters.realMode==="est"} onClick={()=>setFilters(p=>({...p,realMode:"est"}))}/>
          </div>
          <p style={{margin:"0 0 12px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Fuente de datos</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["all","Recibo","Medicion","Encuesta","Inventario","Estimacion"].map(s=><StepChip key={s} label={s==="all"?"Todas":s} active={filters.source===s} onClick={()=>setFilters(p=>({...p,source:s}))}/>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}>
            <button onClick={()=>setStep(1)} style={{height:38,padding:"0 16px",borderRadius:"var(--eco-radius-full)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,color:"var(--eco-gray-600)",transition:"all 150ms"}}><ChevronLeft size={15}/>Periodo</button>
            <button onClick={()=>setStep(3)} style={{height:38,padding:"0 20px",borderRadius:"var(--eco-radius-full)",border:"none",background:"var(--eco-primary-500)",color:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 200ms"}} onMouseEnter={e=>e.currentTarget.style.background="var(--eco-primary-600)"} onMouseLeave={e=>e.currentTarget.style.background="var(--eco-primary-500)"}>Siguiente<ChevronRight size={15}/></button>
          </div>
        </div>}

        {/* Step 3: Opciones + Generar */}
        {step===3&&<div style={{padding:24,animation:"ctSlideRt .3s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Settings2 size={18} style={{color:"var(--eco-primary-600)"}}/><h3 style={{margin:0,fontFamily:fd,fontSize:18,fontWeight:700,color:"var(--eco-gray-800)"}}>Opciones del reporte</h3></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}} className="ct-wiz-grid">
            <div style={{padding:14,borderRadius:"var(--eco-radius-lg)",border:`1.5px solid ${filters.detailLevel==="summary"?"var(--eco-primary-500)":"var(--eco-border)"}`,background:filters.detailLevel==="summary"?"var(--eco-primary-50)":"white",cursor:"pointer",transition:"all 200ms",textAlign:"center"}} onClick={()=>setFilters(p=>({...p,detailLevel:"summary"}))}>
              <ClipboardList size={22} style={{color:filters.detailLevel==="summary"?"var(--eco-primary-600)":"var(--eco-gray-400)",margin:"0 auto 6px",display:"block"}}/>
              <p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:filters.detailLevel==="summary"?"var(--eco-primary-700)":"var(--eco-gray-700)"}}>Resumen</p>
              <p style={{margin:"2px 0 0",fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>Totales por área y categoría</p>
            </div>
            <div style={{padding:14,borderRadius:"var(--eco-radius-lg)",border:`1.5px solid ${filters.detailLevel==="detailed"?"var(--eco-primary-500)":"var(--eco-border)"}`,background:filters.detailLevel==="detailed"?"var(--eco-primary-50)":"white",cursor:"pointer",transition:"all 200ms",textAlign:"center"}} onClick={()=>setFilters(p=>({...p,detailLevel:"detailed"}))}>
              <BarChart3 size={22} style={{color:filters.detailLevel==="detailed"?"var(--eco-primary-600)":"var(--eco-gray-400)",margin:"0 auto 6px",display:"block"}}/>
              <p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:filters.detailLevel==="detailed"?"var(--eco-primary-700)":"var(--eco-gray-700)"}}>Detallado</p>
              <p style={{margin:"2px 0 0",fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>Cada registro individual</p>
            </div>
            <label style={{padding:14,borderRadius:"var(--eco-radius-lg)",border:`1.5px solid ${filters.includeTrace?"var(--eco-primary-500)":"var(--eco-border)"}`,background:filters.includeTrace?"var(--eco-primary-50)":"white",cursor:"pointer",transition:"all 200ms",textAlign:"center",display:"block"}}>
              <input type="checkbox" checked={filters.includeTrace} onChange={e=>setFilters(p=>({...p,includeTrace:e.target.checked}))} style={{display:"none"}}/>
              <Paperclip size={22} style={{color:filters.includeTrace?"var(--eco-primary-600)":"var(--eco-gray-400)",margin:"0 auto 6px",display:"block"}}/>
              <p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:filters.includeTrace?"var(--eco-primary-700)":"var(--eco-gray-700)"}}>Trazabilidad</p>
              <p style={{margin:"2px 0 0",fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>{filters.includeTrace?"Incluida":"No incluida"}</p>
            </label>
          </div>
          {/* Summary card before generating */}
          <div style={{background:"var(--eco-gray-50)",borderRadius:"var(--eco-radius-lg)",padding:16,marginBottom:20}}>
            <p style={{margin:"0 0 8px",fontFamily:fd,fontSize:14,fontWeight:700,color:"var(--eco-gray-800)",display:"flex",alignItems:"center",gap:6}}><Sparkles size={14} style={{color:"var(--eco-primary-500)"}}/>Tu reporte incluirá</p>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {[{l:"Periodo",v:stepSummary.periodo},{l:"Categoría",v:stepSummary.categoria},{l:"Área",v:stepSummary.area},{l:"Estado",v:stepSummary.estado},{l:"Nivel",v:stepSummary.nivel}].map(i=><div key={i.l}><p style={{margin:0,fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>{i.l}</p><p style={{margin:0,fontFamily:fb,fontSize:13,fontWeight:600,color:"var(--eco-gray-700)"}}>{i.v}</p></div>)}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(2)} style={{height:38,padding:"0 16px",borderRadius:"var(--eco-radius-full)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,color:"var(--eco-gray-600)"}}><ChevronLeft size={15}/>Alcance</button>
            <button onClick={onGenerate} disabled={loadingGen} style={{height:42,padding:"0 24px",borderRadius:"var(--eco-radius-full)",border:"none",background:"linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-600))",color:"white",fontFamily:fb,fontSize:14,fontWeight:700,cursor:loadingGen?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(34,197,94,.3)",transition:"all 200ms",opacity:loadingGen?.65:1,animation:"ctPulse 2s ease-in-out infinite"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(34,197,94,.4)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 14px rgba(34,197,94,.3)";}}><Sparkles size={16}/>Generar reporte</button>
          </div>
        </div>}
      </div>}

      {/* Loading */}
      {loadingGen&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:16}} className="ct-kpi-g">{[0,1,2,3].map(i=><Skeleton key={i} h={140} delay={i*50}/>)}</div>}

      {/* ═══ GENERATED RESULTS ═══ */}
      {!loadingGen&&generated&&previewRows.length===0&&<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",padding:"48px 24px",textAlign:"center",animation:"ctUp .4s ease-out"}}><div style={{width:64,height:64,borderRadius:"50%",background:"var(--eco-gray-100)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"var(--eco-gray-400)",animation:"ctFloat 3s ease-in-out infinite"}}><FileText size={28}/></div><p style={{margin:"0 0 4px",fontFamily:fd,fontSize:16,fontWeight:700,color:"var(--eco-gray-700)"}}>Sin registros</p><p style={{margin:0,fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)",maxWidth:340,marginInline:"auto"}}>No hay datos para los filtros seleccionados. Prueba cambiar el periodo o área.</p></div>}

      {!loadingGen&&generated&&summary&&previewRows.length>0&&<>
        {/* Action bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:20,padding:"14px 18px",background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",animation:"ctUp .4s cubic-bezier(.33,1,.68,1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--eco-success-bg)",color:"var(--eco-success)",display:"flex",alignItems:"center",justifyContent:"center",animation:"ctCheck .4s cubic-bezier(.34,1.56,.64,1)"}}><CheckCircle2 size={16}/></div>
            <div><p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:"var(--eco-gray-800)"}}>Reporte generado - {previewRows.length} registros</p><p style={{margin:0,fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{stepSummary.periodo} · {stepSummary.categoria} · {stepSummary.area}</p></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onDownload} disabled={!canDownload} style={{height:36,padding:"0 16px",borderRadius:"var(--eco-radius-full)",border:"none",background:canDownload?"var(--eco-primary-500)":"var(--eco-gray-300)",color:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:canDownload?"pointer":"not-allowed",display:"inline-flex",alignItems:"center",gap:6,transition:"all 200ms"}} onMouseEnter={e=>{if(canDownload)e.currentTarget.style.background="var(--eco-primary-600)";}} onMouseLeave={e=>{if(canDownload)e.currentTarget.style.background="var(--eco-primary-500)";}}><Download size={14}/>Descargar CSV</button>
            <button onClick={()=>setTraceOpen(true)} style={{height:36,padding:"0 14px",borderRadius:"var(--eco-radius-full)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,color:"var(--eco-gray-700)",transition:"all 150ms"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";}}><Eye size={14}/>Trazabilidad</button>
            <button onClick={onClear} style={{height:36,padding:"0 14px",borderRadius:"var(--eco-radius-full)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,color:"var(--eco-gray-700)",transition:"all 150ms"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";}}><RotateCcw size={14}/>Nuevo reporte</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="ct-kpi-g" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
          <KpiCard title="Total CO₂e" value={summary.total} unit="tCO₂e" icon={<Leaf size={18}/>} delay={100}/>
          <KpiCard title="Electricidad" value={summary.electricidad} unit="tCO₂e" icon={<Zap size={18}/>} iconBg="var(--eco-info-bg)" iconColor="var(--eco-info)" delay={160}/>
          <KpiCard title="Combustible" value={summary.combustible} unit="tCO₂e" icon={<Flame size={18}/>} iconBg="var(--eco-secondary-50)" iconColor="var(--eco-secondary-600)" delay={220}/>
          <KpiCard title="% Real" value={summary.realPct} unit="%" icon={<CheckCircle2 size={18}/>} iconBg="var(--eco-success-bg)" iconColor="var(--eco-success)" sub={`${fN(summary.estPct,1)}% estimado`} delay={280}/>
        </div>

        {/* Charts */}
        <div className="ct-ch-m" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
          <ChartCard title="CO₂e por área" sub="Top áreas del reporte" delay={300}><ResponsiveContainer width="100%" height={240}><BarChart data={topBars} margin={{top:8,right:12,left:-8,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false}/><XAxis dataKey="area" tick={{fontFamily:"var(--eco-font-body)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><RTooltip content={<EcoTooltip/>} cursor={{ fill: "rgba(136,136,136,0.15)" }}/><Bar dataKey="co2e" name="CO₂e" radius={[5,5,0,0]}>{topBars.map(r=><Cell key={r.area} fill={r.color}/>)}</Bar></BarChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Por categoría" sub="Distribución de emisiones" delay={360}><ResponsiveContainer width="100%" height={240}><RPieChart><Pie data={summary.byCategory} dataKey="co2e" nameKey="label" innerRadius={55} outerRadius={82} paddingAngle={3}>{summary.byCategory.map(d=><Cell key={d.name} fill={d.color} stroke="white" strokeWidth={2}/>)}</Pie><RTooltip content={<EcoTooltip/>}/></RPieChart></ResponsiveContainer></ChartCard>
        </div>
        <ChartCard title="Tendencia temporal" sub="CO₂e por periodo" delay={420}><ResponsiveContainer width="100%" height={220}><LineChart data={summary.trend} margin={{top:8,right:12,left:-8,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false}/><XAxis dataKey="label" tick={{fontFamily:"var(--eco-font-body)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><RTooltip content={<EcoTooltip/>}/><Line type="monotone" dataKey="co2e" name="CO₂e" stroke="#22C55E" strokeWidth={2.5} dot={{r:4,fill:"#22C55E",stroke:"white",strokeWidth:2}} activeDot={{r:6,stroke:"#22C55E",strokeWidth:2,fill:"white"}}/></LineChart></ResponsiveContainer></ChartCard>

        {/* Detail table */}
        {filters.detailLevel==="detailed"&&<div style={{marginTop:14,background:"white",border:"1px solid var(--eco-border)",borderRadius:"var(--eco-radius-lg)",boxShadow:"var(--eco-shadow-sm)",overflow:"hidden",animation:"ctUp .4s cubic-bezier(.33,1,.68,1) 480ms both"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid var(--eco-border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}><p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:"var(--eco-gray-800)"}}>Registros ({previewRows.length})</p></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontFamily:fb,fontSize:13}}><thead><tr style={{borderBottom:"1px solid var(--eco-border)",background:"var(--eco-gray-50)"}}>
            {["Fecha","Área","Categoría","Actividad","Valor","Factor","CO₂e","Estado","Fuente","Evidencia",""].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontFamily:fb,fontSize:11,fontWeight:600,color:"var(--eco-gray-500)",textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{previewRows.map((r,i)=><tr key={r.id} style={{borderBottom:i<previewRows.length-1?"1px solid var(--eco-gray-100)":"none",background:hovRow===r.id?"var(--eco-gray-50)":"white",transition:"background 100ms",cursor:"pointer",animation:`ctRowIn .3s ease-out ${Math.min(i*30,300)}ms both`}} onMouseEnter={()=>setHovRow(r.id)} onMouseLeave={()=>setHovRow(null)}>
              <td style={{padding:"10px 12px",fontFamily:fm,fontSize:12,color:"var(--eco-gray-600)",whiteSpace:"nowrap"}}>{dLabel(r.dateISO)}</td>
              <td style={{padding:"10px 12px",color:"var(--eco-gray-700)",fontWeight:600}}>{r.area}</td>
              <td style={{padding:"10px 12px",color:"var(--eco-gray-600)"}}>{r.category==="electricidad"?"Electricidad":r.category==="combustible"?"Combustible":"Otros"}</td>
              <td style={{padding:"10px 12px",color:"var(--eco-gray-600)",maxWidth:220,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.activity}</td>
              <td style={{padding:"10px 12px",fontFamily:fm,color:"var(--eco-gray-700)"}}>{fN(r.value,1)} {r.unit}</td>
              <td style={{padding:"10px 12px",fontFamily:fm,fontSize:12,color:"var(--eco-gray-500)"}}>{filters.includeTrace?fN(r.factor,3):"-"}</td>
              <td style={{padding:"10px 12px"}}><span style={{fontFamily:fm,fontSize:13,fontWeight:700,color:"var(--eco-primary-700)"}}>{fN(r.co2e_kg,1)} kg</span><span style={{marginLeft:6,fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)"}}>{fN(r.co2e_t,3)} t</span></td>
              <td style={{padding:"10px 12px"}}><Badge status={r.status}/></td>
              <td style={{padding:"10px 12px",fontSize:12,color:"var(--eco-gray-500)"}}>{filters.includeTrace?r.source:"-"}</td>
              <td style={{padding:"10px 12px",fontSize:12,color:"var(--eco-gray-500)"}}>{filters.includeTrace?(r.evidence?<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Paperclip size={11}/>{r.evidence.length>16?r.evidence.slice(0,14)+"…":r.evidence}</span>:"-"):"-"}</td>
              <td style={{padding:"10px 12px"}}><button onClick={()=>setTraceOpen(true)} style={{height:28,width:28,borderRadius:"var(--eco-radius-sm)",border:"1px solid var(--eco-border)",background:"white",color:"var(--eco-gray-400)",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 150ms"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.color="var(--eco-primary-600)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.color="var(--eco-gray-400)";}}><Eye size={13}/></button></td>
            </tr>)}</tbody></table></div>
        </div>}
      </>}

      {/* ═══ DRILL PANEL ═══ */}
      {traceOpen&&<DrillPanel title="Trazabilidad del reporte" breadcrumb="Reportes → Trazabilidad" onClose={()=>setTraceOpen(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"var(--eco-primary-50)",border:"1px solid var(--eco-primary-200)",borderRadius:"var(--eco-radius-lg)",padding:14,animation:"ctUp .3s ease-out"}}>
            <p style={{margin:"0 0 8px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-primary-700)",display:"flex",alignItems:"center",gap:6}}><Filter size={12}/>Configuración del reporte</p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{[{l:"Periodo",v:stepSummary.periodo},{l:"Categoría",v:stepSummary.categoria},{l:"Área",v:stepSummary.area},{l:"Estado",v:stepSummary.estado},{l:"Nivel",v:stepSummary.nivel}].map(i=><div key={i.l}><p style={{margin:0,fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>{i.l}</p><p style={{margin:0,fontFamily:fb,fontSize:12,fontWeight:600,color:"var(--eco-gray-700)"}}>{i.v}</p></div>)}</div>
          </div>
          <div style={{background:"var(--eco-gray-50)",borderRadius:"var(--eco-radius-md)",padding:14,animation:"ctUp .3s ease-out 60ms both"}}>
            <p style={{margin:"0 0 6px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-gray-700)"}}>Fórmula de cálculo</p>
            <p style={{margin:0,fontFamily:fm,fontSize:14,fontWeight:600,color:"var(--eco-primary-700)"}}>CO₂e = Actividad × Factor de emisión</p>
          </div>
          <div><p style={{margin:"0 0 10px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-gray-700)",display:"flex",alignItems:"center",gap:6}}><ArrowRight size={12}/>Registros incluidos</p>
            {(previewRows||[]).slice(0,5).map((r,i)=><div key={r.id} style={{border:"1px solid var(--eco-border)",borderRadius:"var(--eco-radius-md)",padding:"10px 12px",marginBottom:6,background:"white",transition:"all 150ms",animation:`ctUp .3s ease-out ${i*40}ms both`}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.background="var(--eco-primary-50)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.background="white";}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:4}}><p style={{margin:0,fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-gray-800)"}}>{r.activity}</p><Badge status={r.status}/></div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontFamily:fm,fontSize:12,color:"var(--eco-gray-600)"}}>{fN(r.value,1)} {r.unit}</span><span style={{color:"var(--eco-gray-400)",fontFamily:fm}}>×</span><span style={{fontFamily:fm,fontSize:12,color:"var(--eco-gray-600)"}}>{fN(r.factor,3)}</span><span style={{color:"var(--eco-gray-400)",fontFamily:fm}}>=</span><span style={{fontFamily:fm,fontSize:13,fontWeight:700,color:"var(--eco-primary-700)"}}>{fN(r.co2e_kg,1)} kgCO₂e</span></div>
              <p style={{margin:"4px 0 0",fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>{r.area} · {dLabel(r.dateISO)} · {r.source}</p>
            </div>)}
          </div>
        </div>
      </DrillPanel>}

      <Toast toast={toast}/>
    </div>
  </>);
}
