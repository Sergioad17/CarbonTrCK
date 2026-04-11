import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Flame, Plus, Download, Eye, Calendar, RotateCcw, FileX, ExternalLink, Trash2, X, CheckCircle2, TrendingUp, TrendingDown, Minus, Droplets, Fuel, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Filter, AlertTriangle, Leaf, ArrowRight, Paperclip, } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Area, AreaChart, } from "recharts";
import { fetchScopeCombustibleRecords } from "../api/scopeCombustible";
import { archiveEmissionRecord } from "../api/records";
import RecordArchiveDialog from "../components/RecordArchiveDialog";
import { buildArchiveAuditPayload, canArchiveRecord } from "../lib/recordArchive";

const fd = "var(--eco-font-display)", fb = "var(--eco-font-body)", fm = "var(--eco-font-mono)";
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const COLORS = ["#EAB308","#3B82F6","#22C55E","#8B5CF6","#EC4899","#06B6D4","#64748B","#94A3B8"];

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

const ST_C={real:{bg:"var(--eco-success-bg)",c:"var(--eco-success)",b:"#BBF7D0",l:"Real"},est:{bg:"var(--eco-warning-bg)",c:"var(--eco-secondary-600)",b:"#FDE68A",l:"Estimado"}};
const TR_C={up:{c:"var(--eco-danger)",i:<TrendingUp size={13}/>,bg:"var(--eco-danger-bg)"},down:{c:"var(--eco-success)",i:<TrendingDown size={13}/>,bg:"var(--eco-success-bg)"},neutral:{c:"var(--eco-gray-500)",i:<Minus size={13}/>,bg:"var(--eco-gray-100)"}};
const ST_ACC={warning:{c:"var(--eco-warning)",b:"#FDE68A"},danger:{c:"var(--eco-danger)",b:"#FECACA"},success:{c:"var(--eco-success)",b:"#BBF7D0"}};

/* ═══ HOOKS ═══ */
function useCountUp(target,dur=650){const[v,setV]=useState(0);const ref=useRef(null);useEffect(()=>{let s=null;const ease=t=>1-Math.pow(1-t,3);const step=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);setV(ease(p)*target);if(p<1)ref.current=requestAnimationFrame(step);else setV(target);};ref.current=requestAnimationFrame(step);return()=>ref.current&&cancelAnimationFrame(ref.current);},[target,dur]);return v;}

/* ═══ UTILS ═══ */
function fN(n,d=1){return Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:d,maximumFractionDigits:d})}
function fDate(iso){if(!iso)return"-";const d=new Date(`${iso}T12:00:00`);if(Number.isNaN(d.getTime()))return"-";return`${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`}
function fMonth(iso){if(!iso)return"-";const d=new Date(`${iso}T12:00:00`);if(Number.isNaN(d.getTime()))return"-";return`${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`}
function toKey(date){const d=new Date(`${date}T12:00:00`);if(Number.isNaN(d.getTime()))return"";return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function inferEq(a=""){const t=a.toLowerCase();if(t.includes("tractor"))return"Tractor";if(t.includes("planta"))return"Planta";if(t.includes("camioneta"))return"Camioneta";return""}

function normRec(r,fid){
  const lit=Number.isFinite(Number(r?.value))?Number(r.value):0;const fac=Number.isFinite(Number(r?.factor))&&Number(r?.factor)>0?Number(r.factor):2.68;
  const co2=Number.isFinite(Number(r?.co2e_kg))&&Number(r?.co2e_kg)>0?Number(r.co2e_kg):lit*fac;
  return{id:r?.id||fid,dateISO:String(r?.dateISO||""),area:String(r?.area||"Sin area"),activity:String(r?.activity||"Sin actividad"),category:"combustible",fuelType:r?.fuelType==="Gasolina"?"Gasolina":"Diesel",value:lit,unit:"L",factor:fac,co2e_kg:co2,co2e_t:co2/1000,status:r?.status==="est"?"est":"real",source:String(r?.source||"Medicion"),equipment:String(r?.equipment||inferEq(r?.activity||"")),evidence:String(r?.evidence||"")};
}

function periodFilter(recs,mode,mo,yr,fd2,td){
  if(mode==="mes"){const ym=`${yr}-${String(mo).padStart(2,"0")}`;return recs.filter(r=>toKey(r.dateISO)===ym);}
  if(!fd2&&!td)return recs;
  return recs.filter(r=>{const t=new Date(`${r.dateISO}T12:00:00`).getTime();if(Number.isNaN(t))return false;if(fd2&&t<new Date(`${fd2}T00:00:00`).getTime())return false;if(td&&t>new Date(`${td}T23:59:59`).getTime())return false;return true;});
}

function buildCsv(rows){
  const hd=["Fecha","Area","Actividad","TipoCombustible","Litros","Factor","CO2e (kg)","CO2e (t)","Estado","Fuente","Equipo","Evidencia"];
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const data=rows.map(r=>[r.dateISO,r.area,r.activity,r.fuelType,r.value,r.factor,(r.co2e_kg||0).toFixed(2),(r.co2e_t||0).toFixed(4),r.status==="est"?"Estimado":"Real",r.source,r.equipment||"",r.evidence||""]);
  return[hd.map(esc).join(","),...data.map(row=>row.map(esc).join(","))].join("\n");
}

/* ═══════════════════════════════════════════════════════════════
   ATOMIC UI COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function Badge({status}){const c=ST_C[status]||ST_C.real;return<span style={{fontFamily:fb,fontSize:10,fontWeight:700,letterSpacing:"0.02em",padding:"2px 8px",borderRadius:"var(--eco-radius-full)",background:c.bg,color:c.c,border:`1px solid ${c.b}`,whiteSpace:"nowrap"}}>{c.l}</span>}

function SectionLabel({children,icon,delay=0}){return(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,animation:`ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`}}>{icon&&<div style={{width:28,height:28,borderRadius:"var(--eco-radius-sm)",background:"var(--eco-secondary-50)",color:"var(--eco-secondary-600)",display:"flex",alignItems:"center",justifyContent:"center"}}>{icon}</div>}<h2 style={{fontFamily:fd,fontSize:17,fontWeight:700,color:"var(--eco-gray-800)",margin:0,letterSpacing:"-0.01em"}}>{children}</h2></div>)}

function EcoTooltip({active,payload,label}){if(!active||!payload?.length)return null;return(<div style={{background:"var(--eco-gray-900)",borderRadius:"var(--eco-radius-md)",padding:"10px 14px",boxShadow:"var(--eco-shadow-lg)",border:"none",minWidth:150}}><p style={{margin:"0 0 6px",fontFamily:fb,fontSize:12,fontWeight:600,color:"rgba(255,255,255,.6)"}}>{label}</p>{payload.map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<payload.length-1?4:0}}><span style={{width:8,height:8,borderRadius:"50%",background:e.color,flexShrink:0}}/><span style={{fontFamily:fb,fontSize:12,color:"rgba(255,255,255,.7)",flex:1}}>{e.name}</span><span style={{fontFamily:fm,fontSize:13,fontWeight:700,color:"white"}}>{fN(e.value,1)}</span></div>)}</div>)}

function DonutTooltip({active,payload}){if(!active||!payload?.length)return null;const d=payload[0];return(<div style={{background:"var(--eco-gray-900)",borderRadius:"var(--eco-radius-md)",padding:"10px 14px",boxShadow:"var(--eco-shadow-lg)",border:"none"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{width:8,height:8,borderRadius:"50%",background:d.color||d.payload?.color}}/><span style={{fontFamily:fb,fontSize:12,fontWeight:600,color:"white"}}>{d.name}</span></div><span style={{fontFamily:fm,fontSize:16,fontWeight:700,color:"white"}}>{fN(d.value,1)}</span><span style={{fontFamily:fb,fontSize:11,color:"rgba(255,255,255,.5)",marginLeft:6}}>({d.payload?.pct}%)</span></div>)}

function KpiCard({title,sub,value,unit,icon,iconBg,iconColor,delta,trend="neutral",status,delay=0,sparkData}){
  const num=Number(String(value).replace(/[^0-9.\-]/g,""))||0;const anim=useCountUp(num,700);const isNum=!isNaN(num)&&String(value)!=="-";
  const tc=TR_C[trend]||TR_C.neutral;const sa=ST_ACC[status]||null;
  const spark=sparkData&&sparkData.length>1?(()=>{const mx=Math.max(...sparkData),mn=Math.min(...sparkData),rng=mx-mn||1;return sparkData.map((v,i)=>`${(i/(sparkData.length-1))*60},${22-((v-mn)/rng)*22}`).join(" ");})():null;
  return(<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",padding:18,border:`1px solid ${sa?.b||"var(--eco-border)"}`,boxShadow:"var(--eco-shadow-sm)",transition:"all 200ms cubic-bezier(.33,1,.68,1)",animation:`ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,position:"relative",overflow:"hidden"}}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-md)";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="var(--eco-primary-300)";}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-sm)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=sa?.b||"var(--eco-border)";}}>
    {sa&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:sa.c,borderRadius:"14px 14px 0 0"}}/>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:"var(--eco-radius-md)",background:iconBg||"var(--eco-secondary-50)",color:iconColor||"var(--eco-secondary-600)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div>
        <div><p style={{margin:0,fontFamily:fb,fontSize:13,fontWeight:500,color:"var(--eco-gray-500)",lineHeight:1.2}}>{title}</p>{sub&&<p style={{margin:0,fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)"}}>{sub}</p>}</div>
      </div>
      {spark&&<svg width={60} height={22} style={{flexShrink:0,opacity:.5}}><polyline points={spark} fill="none" stroke={tc.c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
    <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:6}}>
      <span style={{fontFamily:fm,fontSize:26,fontWeight:700,color:"var(--eco-gray-900)",letterSpacing:"-0.02em"}}>{isNum?fN(anim,unit==="%"?0:1):value}</span>
      <span style={{fontFamily:fm,fontSize:12,color:"var(--eco-gray-400)"}}>{unit}</span>
    </div>
    <div style={{minHeight:22}}>{delta?<div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:"var(--eco-radius-full)",background:tc.bg,animation:"ctPop .4s cubic-bezier(.34,1.56,.64,1) .5s both"}}><span style={{display:"flex",color:tc.c}}>{tc.i}</span><span style={{fontFamily:fm,fontSize:11,fontWeight:600,color:tc.c}}>{delta}</span></div>:<span style={{fontFamily:fb,fontSize:12,color:"var(--eco-gray-400)"}}>-</span>}</div>
  </div>);
}

function ChartCard({title,sub,children,delay=0}){return(<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",overflow:"hidden",animation:`ctFadeUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,position:"relative"}}><div style={{padding:"16px 18px 8px"}}><p style={{margin:0,fontFamily:fd,fontSize:15,fontWeight:700,color:"var(--eco-gray-800)"}}>{title}</p>{sub&&<p style={{margin:"2px 0 0",fontFamily:fb,fontSize:12,color:"var(--eco-gray-400)"}}>{sub}</p>}</div><div style={{padding:"4px 10px 14px"}}>{children}</div></div>)}

function PageSkeleton(){
  const sh={background:"linear-gradient(90deg,var(--eco-border) 25%,var(--eco-surface) 50%,var(--eco-border) 75%)",backgroundSize:"200% 100%",animation:"ctShimmer 1.5s ease-in-out infinite",borderRadius:"var(--eco-radius-md)"};
  const card={background:"var(--eco-surface)",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)"};
  return(
    <div style={{padding:"var(--page-pad-y,24px) var(--page-pad-x,24px)"}}>
      <div style={{maxWidth:"var(--content-max,1440px)",margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{...sh,width:38,height:38,borderRadius:"var(--eco-radius-md)"}}/>
            <div>
              <div style={{...sh,width:160,height:24,marginBottom:6}}/>
              <div style={{...sh,width:280,height:14}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{...sh,width:120,height:34}}/>
            <div style={{...sh,width:100,height:34}}/>
            <div style={{...sh,width:110,height:34}}/>
          </div>
        </div>
        {/* Filters */}
        <div style={{...card,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <div style={{...sh,width:28,height:28,borderRadius:"var(--eco-radius-sm)"}}/>
          <div style={{...sh,width:100,height:14}}/>
          <div style={{flex:1}}/>
          <div style={{...sh,width:80,height:30,borderRadius:"var(--eco-radius-sm)"}}/>
        </div>
        {/* KPI label */}
        <div style={{...sh,width:140,height:18,marginBottom:12}}/>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:24}}>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{...card,padding:20,animation:`ctFadeUp .3s ease-out ${i*50}ms both`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{...sh,width:38,height:38,borderRadius:10}}/>
                <div>
                  <div style={{...sh,width:80,height:12,marginBottom:6}}/>
                  <div style={{...sh,width:50,height:10}}/>
                </div>
              </div>
              <div style={{...sh,width:90,height:24,marginBottom:8}}/>
              <div style={{...sh,width:60,height:16,borderRadius:"var(--eco-radius-full)"}}/>
            </div>
          ))}
        </div>
        {/* Charts label */}
        <div style={{...sh,width:100,height:18,marginBottom:12}}/>
        {/* Charts row 1 */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
          {[0,1].map(i=>(
            <div key={i} style={{...card,overflow:"hidden",animation:`ctFadeUp .3s ease-out ${250+i*60}ms both`}}>
              <div style={{padding:"16px 18px 10px"}}>
                <div style={{...sh,width:180,height:14,marginBottom:4}}/>
                <div style={{...sh,width:120,height:10}}/>
              </div>
              <div style={{padding:"6px 12px 16px"}}>
                <div style={{...sh,width:"100%",height:250}}/>
              </div>
            </div>
          ))}
        </div>
        {/* Charts row 2 (donuts) */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
          {[0,1].map(i=>(
            <div key={i} style={{...card,overflow:"hidden",animation:`ctFadeUp .3s ease-out ${370+i*60}ms both`}}>
              <div style={{padding:"16px 18px 10px"}}>
                <div style={{...sh,width:140,height:14,marginBottom:4}}/>
                <div style={{...sh,width:100,height:10}}/>
              </div>
              <div style={{padding:"6px 12px 16px"}}>
                <div style={{...sh,width:"100%",height:240}}/>
              </div>
            </div>
          ))}
        </div>
        {/* Table label */}
        <div style={{...sh,width:120,height:18,marginBottom:12}}/>
        {/* Table */}
        <div style={{...card,overflow:"hidden",animation:"ctFadeUp .3s ease-out 500ms both"}}>
          <div style={{...sh,width:"100%",height:40,borderRadius:0}}/>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"12px 16px",borderBottom:i<4?"1px solid var(--eco-border)":"none"}}>
              <div style={{...sh,width:70,height:14}}/>
              <div style={{...sh,width:60,height:14}}/>
              <div style={{...sh,width:140,height:14,flex:1}}/>
              <div style={{...sh,width:50,height:14}}/>
              <div style={{...sh,width:50,height:14}}/>
              <div style={{...sh,width:60,height:20,borderRadius:"var(--eco-radius-full)"}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrillPanel({title,breadcrumb,onClose,children}){
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[onClose]);
  return(<div style={{position:"fixed",inset:0,zIndex:90,display:"flex",justifyContent:"flex-end"}} role="dialog" aria-modal="true">
    <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,.35)",backdropFilter:"blur(3px)",animation:"ctOverlay .2s ease-out"}} onClick={onClose}/>
    <div style={{position:"relative",width:"100%",maxWidth:560,background:"white",boxShadow:"var(--eco-shadow-xl, var(--eco-shadow-lg))",display:"flex",flexDirection:"column",animation:"ctSlideR .3s cubic-bezier(.33,1,.68,1)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid var(--eco-border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>{breadcrumb&&<p style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)",margin:"0 0 2px",display:"flex",alignItems:"center",gap:4}}><Flame size={10}/>{breadcrumb}</p>}<h3 style={{margin:0,fontFamily:fd,fontSize:18,fontWeight:700,color:"var(--eco-gray-900)"}}>{title}</h3></div>
        <button onClick={onClose} aria-label="Cerrar" style={{width:32,height:32,borderRadius:"var(--eco-radius-sm)",border:"none",cursor:"pointer",background:"var(--eco-gray-100)",color:"var(--eco-gray-500)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 150ms"}} onMouseEnter={e=>e.currentTarget.style.background="var(--eco-border)"} onMouseLeave={e=>e.currentTarget.style.background="var(--eco-gray-100)"}><X size={16}/></button>
      </div>
      <div style={{flex:1,padding:20,overflow:"auto"}}>{children}</div>
    </div>
  </div>);
}

function FilterSel({label,value,onChange,options,icon}){return(<label style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontFamily:fb,fontSize:12,fontWeight:500,color:"var(--eco-gray-500)",display:"flex",alignItems:"center",gap:4}}>{icon&&<span style={{display:"flex",color:"var(--eco-gray-400)"}}>{icon}</span>}{label}</span><select value={value} onChange={onChange} style={{height:36,borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",padding:"0 10px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-700)",background:"white",cursor:"pointer",transition:"border-color 150ms",outline:"none"}} onFocus={e=>e.target.style.borderColor="var(--eco-primary-300)"} onBlur={e=>e.target.style.borderColor="var(--eco-border)"}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>)}

function Toast({toast,onDismiss}){if(!toast)return null;return(<div role="alert" style={{position:"fixed",right:20,bottom:20,zIndex:120,background:"white",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-xl, var(--eco-shadow-lg))",borderRadius:"var(--eco-radius-lg)",padding:"14px 16px",minWidth:260,maxWidth:340,display:"flex",alignItems:"flex-start",gap:10,animation:"ctSlideR .3s cubic-bezier(.33,1,.68,1)"}}><div style={{width:28,height:28,borderRadius:"var(--eco-radius-sm)",background:"var(--eco-success-bg)",color:"var(--eco-success)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><CheckCircle2 size={14}/></div><div style={{flex:1}}><p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:"var(--eco-gray-800)"}}>{toast.title}</p><p style={{margin:"2px 0 0",fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{toast.message}</p></div><button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",color:"var(--eco-gray-400)",padding:2,flexShrink:0,display:"flex"}}><X size={14}/></button></div>)}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ScopeCombustiblePage({onOpenRecord}){
  const today=new Date();
  const[records,setRecords]=useState([]);const[loading,setLoading]=useState(true);const[storageError,setStorageError]=useState("");
  const[periodMode,setPeriodMode]=useState("todos");const[month,setMonth]=useState(today.getMonth()+1);const[year,setYear]=useState(today.getFullYear());
  const[fromDate,setFromDate]=useState("");const[toDate,setToDate]=useState("");
  const[fArea,setFArea]=useState("");const[fStatus,setFStatus]=useState("");const[fSource,setFSource]=useState("");const[fFuel,setFFuel]=useState("");const[fEquipment,setFEquipment]=useState("");
  const[filtersOpen,setFiltersOpen]=useState(true);const[drill,setDrill]=useState(null);const[toast,setToast]=useState(null);const[hovRow,setHovRow]=useState(null);
  const[archiveDialog,setArchiveDialog]=useState(null);const[archivingId,setArchivingId]=useState("");const[removingIds,setRemovingIds]=useState([]);
  const[sortCol,setSortCol]=useState("dateISO");const[sortAsc,setSortAsc]=useState(false);const[page,setPage]=useState(0);const PER_PAGE=8;
  const archivePermission=useMemo(()=>canArchiveRecord(),[]);

  const loadAll=useCallback(async()=>{setLoading(true);const data=await fetchScopeCombustibleRecords();setRecords(data.records.sort((a,b)=>b.dateISO.localeCompare(a.dateISO)));setStorageError(data.storageError);setLoading(false);},[]);
  useEffect(()=>{loadAll();},[loadAll]);
  useEffect(()=>{const h=()=>loadAll();window.addEventListener("carbontrack:newrecord",h);window.addEventListener("carbontrack:record-archived",h);window.addEventListener("storage",h);return()=>{window.removeEventListener("carbontrack:newrecord",h);window.removeEventListener("carbontrack:record-archived",h);window.removeEventListener("storage",h);};},[loadAll]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),3000);return()=>clearTimeout(t);},[toast]);

  const areas=useMemo(()=>[...new Set(records.map(r=>r.area))].sort(),[records]);
  const sources=useMemo(()=>[...new Set(records.map(r=>r.source))].sort(),[records]);
  const equips=useMemo(()=>[...new Set(records.map(r=>r.equipment).filter(Boolean))],[records]);
  const pFiltered=useMemo(()=>periodMode==="todos"?records:periodFilter(records,periodMode,month,year,fromDate,toDate),[records,periodMode,month,year,fromDate,toDate]);

  const filtered=useMemo(()=>{
    let d=[...pFiltered];if(fArea)d=d.filter(r=>r.area===fArea);if(fStatus)d=d.filter(r=>r.status===fStatus);if(fSource)d=d.filter(r=>r.source===fSource);if(fFuel)d=d.filter(r=>r.fuelType===fFuel);if(fEquipment)d=d.filter(r=>r.equipment===fEquipment);
    d.sort((a,b)=>{let va=a[sortCol],vb=b[sortCol];if(typeof va==="string")return sortAsc?va.localeCompare(vb):vb.localeCompare(va);return sortAsc?va-vb:vb-va;});
    return d;
  },[pFiltered,fArea,fStatus,fSource,fFuel,fEquipment,sortCol,sortAsc]);

  const totalPages=Math.ceil(filtered.length/PER_PAGE);const paged=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
  useEffect(()=>{if(page===0)return;if(page>Math.max(totalPages-1,0))setPage(Math.max(totalPages-1,0));},[page,totalPages]);
  const activeFC=useMemo(()=>[fArea,fStatus,fSource,fFuel,fEquipment].filter(Boolean).length,[fArea,fStatus,fSource,fFuel,fEquipment]);

  const summaryFilters=useMemo(()=>{const v=[];v.push(periodMode==="mes"?`${MONTHS_ES[month-1]} ${year}`:periodMode==="rango"?`${fromDate||"-"} a ${toDate||"-"}`:"Todo el periodo");if(fArea)v.push(`Área: ${fArea}`);if(fStatus)v.push(fStatus==="est"?"Estimado":"Real");if(fSource)v.push(fSource);if(fFuel)v.push(fFuel);if(fEquipment)v.push(fEquipment);return v;},[periodMode,month,year,fromDate,toDate,fArea,fStatus,fSource,fFuel,fEquipment]);

  const kpis=useMemo(()=>{
    const lit=filtered.reduce((s,r)=>s+r.value,0);const co2Kg=filtered.reduce((s,r)=>s+r.co2e_kg,0);const co2T=filtered.reduce((s,r)=>s+r.co2e_t,0);
    const w=filtered.reduce((s,r)=>s+r.value*r.factor,0);const fAvg=lit>0?w/lit:null;
    const rc=filtered.filter(r=>r.status==="real").length;const pR=filtered.length?Math.round((rc/filtered.length)*100):0;
    let ch=null,tr="neutral";
    if(periodMode==="mes"){
      const s1=new Date(year,month-1,1),e1=new Date(year,month,1),ps=new Date(year,month-2,1),pe=new Date(year,month-1,1);
      const sh=rec=>{if(fArea&&rec.area!==fArea)return false;if(fStatus&&rec.status!==fStatus)return false;if(fSource&&rec.source!==fSource)return false;if(fFuel&&rec.fuelType!==fFuel)return false;if(fEquipment&&rec.equipment!==fEquipment)return false;return true;};
      const cur=records.filter(sh).filter(r=>{const d=new Date(`${r.dateISO}T12:00:00`);return d>=s1&&d<e1;}).reduce((s,r)=>s+r.co2e_kg,0);
      const prev=records.filter(sh).filter(r=>{const d=new Date(`${r.dateISO}T12:00:00`);return d>=ps&&d<pe;}).reduce((s,r)=>s+r.co2e_kg,0);
      if(prev>0){const pct=((cur-prev)/prev)*100;ch=`${pct>0?"+":""}${fN(pct,1)}%`;tr=pct>0?"up":pct<0?"down":"neutral";}
    }
    return{liters:lit,co2Kg,co2T,factorAvg:fAvg,pctReal:pR,change:ch,trend:tr};
  },[filtered,periodMode,month,year,records,fArea,fStatus,fSource,fFuel,fEquipment]);

  const lineData=useMemo(()=>{const m={};filtered.forEach(r=>{const k=fMonth(r.dateISO);if(!m[k])m[k]={label:k,litros:0,co2e:0};m[k].litros+=r.value;m[k].co2e+=r.co2e_t;});return Object.values(m).sort((a,b)=>{const[am,ay]=a.label.split(" ");const[bm,by]=b.label.split(" ");if(ay!==by)return Number(ay)-Number(by);return MONTHS_ES.indexOf(am)-MONTHS_ES.indexOf(bm);});},[filtered]);
  const areaBars=useMemo(()=>{const m={};filtered.forEach(r=>{if(!m[r.area])m[r.area]={area:r.area,co2e:0};m[r.area].co2e+=r.co2e_kg;});return Object.values(m).sort((a,b)=>b.co2e-a.co2e);},[filtered]);
  const fuelDonut=useMemo(()=>{const di=filtered.filter(r=>r.fuelType==="Diesel").reduce((s,r)=>s+r.co2e_kg,0);const ga=filtered.filter(r=>r.fuelType==="Gasolina").reduce((s,r)=>s+r.co2e_kg,0);const t=di+ga||1;return[{name:"Diésel",value:di,pct:Math.round((di/t)*100),color:"#EAB308"},{name:"Gasolina",value:ga,pct:Math.round((ga/t)*100),color:"#3B82F6"}].filter(d=>d.value>0);},[filtered]);
  const statusDonut=useMemo(()=>{const re=filtered.filter(r=>r.status==="real").length;const es=filtered.filter(r=>r.status==="est").length;const t=re+es||1;return[{name:"Real",value:re,pct:Math.round((re/t)*100),color:"#22C55E"},{name:"Estimado",value:es,pct:Math.round((es/t)*100),color:"#EAB308"}].filter(d=>d.value>0);},[filtered]);

  const clearFilters=()=>{setPeriodMode("todos");setMonth(today.getMonth()+1);setYear(today.getFullYear());setFromDate("");setToDate("");setFArea("");setFStatus("");setFSource("");setFFuel("");setFEquipment("");setPage(0);setToast({title:"Filtros reiniciados",message:"Se restauraron los filtros."});};
  const exportCsv=()=>{const csv=buildCsv(filtered);const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`scope1-combustible-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);setToast({title:"Exportación lista",message:`${filtered.length} registros exportados.`});};
  const openTrace=row=>{if(row){setDrill(row);return;}if(filtered.length){setDrill(filtered[0]);return;}setToast({title:"Sin registros",message:"No hay registros."});};
  const openArchiveDialog=row=>{if(!archivePermission.allowed){setToast({title:"Accion restringida",message:archivePermission.message});return;}setArchiveDialog(row);};
  const handleArchiveConfirm=async({reason})=>{if(!archiveDialog?.id||!archivePermission.allowed)return;const recordToArchive=archiveDialog;setArchivingId(recordToArchive.id);try{await archiveEmissionRecord(recordToArchive.id,buildArchiveAuditPayload(archivePermission.actor,reason));setRemovingIds(prev=>prev.includes(recordToArchive.id)?prev:[...prev,recordToArchive.id]);window.setTimeout(()=>{setRecords(prev=>prev.filter(record=>record.id!==recordToArchive.id));setRemovingIds(prev=>prev.filter(id=>id!==recordToArchive.id));setDrill(prev=>prev?.id===recordToArchive.id?null:prev);setArchiveDialog(null);setArchivingId("");setToast({title:"Registro dado de baja",message:"Salio del flujo operativo y mantuvo su trazabilidad."});},280);}catch(error){setArchivingId("");setToast({title:"No se pudo dar de baja",message:error?.status===404?"El backend aun no expone esta baja logica.":"La baja no se completo. Intenta nuevamente."});}};
  const related=useMemo(()=>{if(!drill)return[];return filtered.filter(r=>r.id!==drill.id).filter(r=>r.area===drill.area||r.fuelType===drill.fuelType).slice(0,5);},[drill,filtered]);
  const toggleSort=(col)=>{if(sortCol===col)setSortAsc(!sortAsc);else{setSortCol(col);setSortAsc(true);}setPage(0);};

  const btnPrimary={height:36,padding:"0 14px",borderRadius:"var(--eco-radius-md)",border:"none",background:"var(--eco-primary-500)",color:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,boxShadow:"var(--eco-shadow-sm)",transition:"all 200ms cubic-bezier(.33,1,.68,1)"};
  const btnSec={height:36,padding:"0 14px",borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",background:"white",color:"var(--eco-gray-700)",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 150ms"};
  const hoverSec=e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.color="var(--eco-primary-700)";};
  const leaveSec=e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.color="var(--eco-gray-700)";};

  /* ═══ RENDER ═══ */
  if(loading)return(<><style>{ANIM_CSS}</style><PageSkeleton/></>);
  return(<>
    <style>{ANIM_CSS}</style>
    <div style={{padding:"var(--page-pad-y,24px) var(--page-pad-x,24px)"}}>
      <div style={{maxWidth:"var(--content-max,1440px)",margin:"0 auto"}}>

        {/* ═══ HEADER ═══ */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:20,animation:"ctFadeUp .4s cubic-bezier(.33,1,.68,1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:"var(--eco-radius-md)",background:"linear-gradient(135deg,#EAB308,#CA8A04)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(234,179,8,.2)",flexShrink:0}}><Flame size={20} color="white"/></div>
            <div>
              <h1 style={{margin:0,fontFamily:fd,fontSize:24,fontWeight:800,color:"var(--eco-gray-900)",letterSpacing:"-0.02em"}}>Combustible</h1>
              <p style={{margin:"2px 0 0",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Consumo de combustible (L) y emisiones (CO₂e) · Clic en gráficas para filtrar</p>
            </div>
          </div>
          <div className="ct-hdr-acts" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={onOpenRecord} style={btnPrimary} onMouseEnter={e=>{e.currentTarget.style.background="var(--eco-primary-600)";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.background="var(--eco-primary-500)";e.currentTarget.style.transform="translateY(0)";}}><Plus size={14}/>Nuevo registro</button>
            <button onClick={exportCsv} style={btnSec} onMouseEnter={hoverSec} onMouseLeave={leaveSec}><Download size={14}/>Exportar</button>
            <button onClick={()=>openTrace()} style={btnSec} onMouseEnter={hoverSec} onMouseLeave={leaveSec}><Eye size={14}/>Trazabilidad</button>
          </div>
        </div>

        {storageError&&<div role="alert" style={{marginBottom:14,padding:"10px 14px",borderRadius:"var(--eco-radius-md)",border:"1px solid #FDE68A",background:"var(--eco-warning-bg)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,animation:"ctFadeUp .3s ease-out"}}><div style={{display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={14} style={{color:"var(--eco-warning)",flexShrink:0}}/><span style={{fontFamily:fb,fontSize:12,color:"var(--eco-gray-700)"}}>{storageError}</span></div><button onClick={loadAll} style={{border:"1px solid var(--eco-border)",background:"white",borderRadius:"var(--eco-radius-sm)",padding:"4px 10px",fontFamily:fb,fontSize:12,fontWeight:600,cursor:"pointer",color:"var(--eco-gray-700)"}}>Reintentar</button></div>}

        {/* ═══ FILTERS (collapsible) ═══ */}
        <div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1.5px solid var(--eco-primary-500)",boxShadow:"var(--eco-shadow-sm)",marginBottom:20,overflow:"hidden",animation:"ctFadeUp .4s cubic-bezier(.33,1,.68,1) 60ms both"}}>
          <button onClick={()=>setFiltersOpen(!filtersOpen)} style={{width:"100%",padding:"12px 16px",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:filtersOpen?"1px solid var(--eco-gray-100)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Filter size={15} style={{color:"var(--eco-gray-500)"}}/>
              <span style={{fontFamily:fd,fontSize:14,fontWeight:600,color:"var(--eco-gray-700)"}}>Filtros</span>
              {activeFC>0&&<span style={{minWidth:18,height:18,borderRadius:"var(--eco-radius-full)",background:"var(--eco-primary-100)",color:"var(--eco-primary-700)",fontFamily:fm,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{activeFC}</span>}
            </div>
            <ChevronDown size={16} style={{color:"var(--eco-gray-400)",transition:"transform 200ms",transform:filtersOpen?"rotate(180deg)":"rotate(0)"}}/>
          </button>
          {filtersOpen&&<div style={{padding:"14px 16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
              <FilterSel label="Periodo" value={periodMode} onChange={e=>{setPeriodMode(e.target.value);setPage(0);}} icon={<Calendar size={11}/>} options={[{v:"todos",l:"Todos"},{v:"mes",l:"Mes / Año"},{v:"rango",l:"Rango"}]}/>
              {periodMode==="mes"?<>
                <FilterSel label="Mes" value={month} onChange={e=>{setMonth(Number(e.target.value));setPage(0);}} options={MONTHS_ES.map((m,i)=>({v:i+1,l:m}))}/>
                <FilterSel label="Año" value={year} onChange={e=>{setYear(Number(e.target.value));setPage(0);}} options={[2025,2026,2027].map(y=>({v:y,l:String(y)}))}/>
              </>:periodMode==="rango"?<>
                <label style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontFamily:fb,fontSize:12,fontWeight:500,color:"var(--eco-gray-500)"}}>Desde</span><input type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setPage(0);}} style={{height:36,borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",padding:"0 10px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-700)"}}/></label>
                <label style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontFamily:fb,fontSize:12,fontWeight:500,color:"var(--eco-gray-500)"}}>Hasta</span><input type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setPage(0);}} style={{height:36,borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",padding:"0 10px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-700)"}}/></label>
              </>:null}
              <FilterSel label="Área" value={fArea} onChange={e=>{setFArea(e.target.value);setPage(0);}} icon={<Flame size={11}/>} options={[{v:"",l:"Todas"},...areas.map(a=>({v:a,l:a}))]}/>
              <FilterSel label="Estado" value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(0);}} icon={<CheckCircle2 size={11}/>} options={[{v:"",l:"Todos"},{v:"real",l:"Real"},{v:"est",l:"Estimado"}]}/>
              <FilterSel label="Fuente" value={fSource} onChange={e=>{setFSource(e.target.value);setPage(0);}} options={[{v:"",l:"Todas"},...sources.map(s=>({v:s,l:s}))]}/>
              <FilterSel label="Combustible" value={fFuel} onChange={e=>{setFFuel(e.target.value);setPage(0);}} options={[{v:"",l:"Todos"},{v:"Diesel",l:"Diésel"},{v:"Gasolina",l:"Gasolina"}]}/>
              {equips.length>0&&<FilterSel label="Equipo" value={fEquipment} onChange={e=>{setFEquipment(e.target.value);setPage(0);}} options={[{v:"",l:"Todos"},...equips.map(eq=>({v:eq,l:eq}))]}/>}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
              <button onClick={clearFilters} style={{height:32,padding:"0 12px",borderRadius:"var(--eco-radius-sm)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:12,fontWeight:600,color:"var(--eco-gray-600)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 150ms"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--eco-primary-300)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--eco-border)"}><RotateCcw size={12}/>Limpiar filtros</button>
            </div>
          </div>}
        </div>

        {/* ═══ KPIs ═══ */}
        <SectionLabel icon={<Flame size={14}/>} delay={100}>Indicadores clave</SectionLabel>
        <div className="ct-kpi-g" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:24}}>
          <KpiCard title="Litros totales" sub={`${filtered.length} registros`} value={kpis.liters} unit="L" icon={<Droplets size={18}/>} delay={120} sparkData={lineData.map(d=>d.litros)}/>
          <KpiCard title="CO₂e total" sub="Emisiones directas" value={kpis.co2T} unit="tCO₂e" icon={<Flame size={18}/>} iconBg="var(--eco-danger-bg)" iconColor="var(--eco-danger)" delay={180} sparkData={lineData.map(d=>d.co2e)} status={kpis.co2T>0.3?"danger":kpis.co2T>0.15?"warning":undefined}/>
          <KpiCard title="Factor promedio" value={kpis.factorAvg?fN(kpis.factorAvg,3):"-"} unit="kgCO₂e/L" icon={<Fuel size={18}/>} delay={240}/>
          <KpiCard title="Datos reales" sub="Calidad de datos" value={kpis.pctReal} unit="%" icon={<CheckCircle2 size={18}/>} iconBg="var(--eco-success-bg)" iconColor="var(--eco-success)" delay={300} status={kpis.pctReal>=80?"success":kpis.pctReal>=60?"warning":"danger"}/>
          <KpiCard title="Variación" sub="vs periodo anterior" value={kpis.change||"-"} unit="" icon={<Calendar size={18}/>} iconBg="var(--eco-gray-100)" iconColor="var(--eco-gray-600)" delta={kpis.change} trend={kpis.trend} delay={360}/>
        </div>

        {/* ═══ CHARTS ═══ */}
        <SectionLabel icon={<TrendingDown size={14}/>} delay={200}>Gráficas</SectionLabel>
        <div className="ct-ch-main" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
          <ChartCard title="Consumo y emisiones por mes" sub="Litros (área) + tCO₂e (línea)" delay={250}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={lineData} margin={{top:8,right:14,left:-8,bottom:0}}>
                <defs><linearGradient id="gLit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EAB308" stopOpacity={0.15}/><stop offset="95%" stopColor="#EAB308" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false}/>
                <XAxis dataKey="label" tick={{fontFamily:"var(--eco-font-body)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="lit" tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="co2e" orientation="right" tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                <RTooltip content={<EcoTooltip/>}/>
                <Area yAxisId="lit" type="monotone" dataKey="litros" name="Litros" stroke="#EAB308" strokeWidth={2} fill="url(#gLit)" dot={{r:3,fill:"#EAB308",stroke:"white",strokeWidth:2}}/>
                <Line yAxisId="co2e" type="monotone" dataKey="co2e" name="CO₂e (t)" stroke="#22C55E" strokeWidth={2.5} dot={{r:4,fill:"#22C55E",stroke:"white",strokeWidth:2}} activeDot={{r:6,stroke:"#22C55E",strokeWidth:2,fill:"white"}}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="CO₂e por área" sub="Clic para filtrar" delay={310}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaBars} margin={{top:8,right:10,left:-8,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false}/>
                <XAxis dataKey="area" tick={{fontFamily:"var(--eco-font-body)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                <RTooltip content={<EcoTooltip/>} cursor={{ fill: "rgba(136,136,136,0.15)" }}/>
                <Bar dataKey="co2e" name="CO₂e (kg)" radius={[5,5,0,0]} cursor="pointer" onClick={d=>{setFArea(p=>p===d.area?"":d.area);setPage(0);}}>
                  {areaBars.map((row,i)=><Cell key={row.area} fill={fArea===row.area?"#CA8A04":i%2?"#FDE68A":"#EAB308"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="ct-ch-donuts" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
          <ChartCard title="Tipo de combustible" sub="Clic para filtrar" delay={370}>
            <div style={{position:"relative"}}>
              <ResponsiveContainer width="100%" height={240}>
                <RPieChart><Pie data={fuelDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} cursor="pointer" onClick={d=>{setFFuel(p=>p===(d.name==="Diésel"?"Diesel":"Gasolina")?"":(d.name==="Diésel"?"Diesel":"Gasolina"));setPage(0);}}>
                  {fuelDonut.map(d=><Cell key={d.name} fill={fFuel===(d.name==="Diésel"?"Diesel":"Gasolina")?"#CA8A04":d.color} stroke="white" strokeWidth={2}/>)}
                </Pie><RTooltip content={<DonutTooltip/>}/></RPieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",pointerEvents:"none"}}><div style={{textAlign:"center"}}><p style={{margin:0,fontFamily:fm,fontSize:20,fontWeight:700,color:"var(--eco-gray-900)"}}>{fN(kpis.co2T,2)}</p><p style={{margin:0,fontFamily:fb,fontSize:10,color:"var(--eco-gray-400)"}}>tCO₂e</p></div></div>
            </div>
          </ChartCard>
          <ChartCard title="Real vs Estimado" sub="Clic para filtrar" delay={430}>
            <div style={{position:"relative"}}>
              <ResponsiveContainer width="100%" height={240}>
                <RPieChart><Pie data={statusDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} cursor="pointer" onClick={d=>{setFStatus(p=>{const n=d.name==="Real"?"real":"est";return p===n?"":n;});setPage(0);}}>
                  {statusDonut.map(d=>{const k=d.name==="Real"?"real":"est";return<Cell key={d.name} fill={fStatus===k?"#15803D":d.color} stroke="white" strokeWidth={2}/>;})}
                </Pie><RTooltip content={<DonutTooltip/>}/></RPieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",pointerEvents:"none"}}><div style={{textAlign:"center"}}><p style={{margin:0,fontFamily:fm,fontSize:20,fontWeight:700,color:"var(--eco-gray-900)"}}>{kpis.pctReal}%</p><p style={{margin:0,fontFamily:fb,fontSize:10,color:"var(--eco-gray-400)"}}>real</p></div></div>
            </div>
          </ChartCard>
        </div>

        {/* ═══ TABLE ═══ */}
        <SectionLabel icon={<Leaf size={14}/>} delay={300}>{`Registros (${filtered.length})`}</SectionLabel>
        {filtered.length===0?
          <div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",padding:"48px 24px",textAlign:"center",animation:"ctFadeUp .4s ease-out"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"var(--eco-gray-100)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"var(--eco-gray-400)",animation:"ctFloat 3s ease-in-out infinite"}}><FileX size={28}/></div>
            <p style={{margin:"0 0 4px",fontFamily:fd,fontSize:16,fontWeight:700,color:"var(--eco-gray-700)"}}>Sin registros</p>
            <p style={{margin:0,fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)",maxWidth:320,marginInline:"auto",lineHeight:1.5}}>No hay resultados para esta combinación de filtros.</p>
          </div>
        :<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",overflow:"hidden",animation:"ctFadeUp .4s cubic-bezier(.33,1,.68,1) 350ms both"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fb,fontSize:13}}>
              <thead><tr style={{borderBottom:"1px solid var(--eco-border)",background:"var(--eco-gray-50)"}}>
                {[{k:"dateISO",l:"Fecha"},{k:"area",l:"Área"},{k:"activity",l:"Actividad"},{k:"fuelType",l:"Combustible"},{k:"value",l:"Litros"},{k:"factor",l:"Factor"},{k:"co2e_kg",l:"CO₂e (kg)"},{k:"co2e_t",l:"CO₂e (t)"},{k:"status",l:"Estado"},{k:"source",l:"Fuente"},{k:null,l:"Evidencia"},{k:null,l:""}].map((col,ci)=><th key={ci} onClick={col.k?()=>toggleSort(col.k):undefined} style={{padding:"10px 12px",textAlign:"left",fontFamily:fb,fontSize:11,fontWeight:600,color:"var(--eco-gray-500)",textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap",cursor:col.k?"pointer":"default",userSelect:"none"}}><span style={{display:"inline-flex",alignItems:"center",gap:3}}>{col.l}{sortCol===col.k&&(sortAsc?<ChevronUp size={12}/>:<ChevronDown size={12}/>)}</span></th>)}
              </tr></thead>
              <tbody>{paged.map((r,i)=>
                <tr key={r.id} style={{borderBottom:i<paged.length-1?"1px solid var(--eco-gray-100)":"none",background:hovRow===r.id?"var(--eco-gray-50)":"white",transition:"background 100ms, opacity 220ms ease, transform 220ms ease, filter 220ms ease",cursor:"pointer",animation:`ctRowIn .3s ease-out ${Math.min(i*30,300)}ms both`,opacity:removingIds.includes(r.id)?0:1,transform:removingIds.includes(r.id)?"translateX(18px) scale(0.985)":"translateX(0) scale(1)",filter:removingIds.includes(r.id)?"blur(2px)":"none",pointerEvents:removingIds.includes(r.id)?"none":"auto"}}
                  onMouseEnter={()=>setHovRow(r.id)} onMouseLeave={()=>setHovRow(null)} onClick={()=>openTrace(r)}>
                  <td style={{padding:"10px 12px",fontFamily:fm,fontSize:12,color:"var(--eco-gray-600)",whiteSpace:"nowrap"}}>{fDate(r.dateISO)}</td>
                  <td style={{padding:"10px 12px",color:"var(--eco-gray-700)",fontWeight:600}}>{r.area}</td>
                  <td style={{padding:"10px 12px",color:"var(--eco-gray-600)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.activity}</td>
                  <td style={{padding:"10px 12px",color:"var(--eco-gray-700)"}}>{r.fuelType}</td>
                  <td style={{padding:"10px 12px",fontFamily:fm,fontSize:12,fontWeight:600,color:"var(--eco-secondary-600)"}}>{fN(r.value,1)}</td>
                  <td style={{padding:"10px 12px",fontFamily:fm,fontSize:12,color:"var(--eco-gray-500)"}}>{fN(r.factor,3)}</td>
                  <td style={{padding:"10px 12px",fontFamily:fm,fontSize:12,color:"var(--eco-gray-700)"}}>{fN(r.co2e_kg,1)}</td>
                  <td style={{padding:"10px 12px",fontFamily:fm,fontWeight:700,color:"var(--eco-primary-700)"}}>{fN(r.co2e_t,3)}</td>
                  <td style={{padding:"10px 12px"}}><Badge status={r.status}/></td>
                  <td style={{padding:"10px 12px",color:"var(--eco-gray-500)",fontSize:12}}>{r.source}</td>
                  <td style={{padding:"10px 12px",color:"var(--eco-gray-500)",fontSize:12}}>{r.evidence?<span style={{display:"inline-flex",alignItems:"center",gap:3}}><Paperclip size={11}/>{r.evidence.length>16?r.evidence.slice(0,14)+"…":r.evidence}</span>:"-"}</td>
                  <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}><button onClick={e=>{e.stopPropagation();openArchiveDialog(r);}} aria-label={archivePermission.allowed?`Dar de baja ${r.activity}`:archivePermission.message} title={archivePermission.allowed?"Dar de baja logica":archivePermission.message} disabled={!archivePermission.allowed||archivingId===r.id} style={{height:28,width:28,borderRadius:"var(--eco-radius-sm)",border:`1px solid ${archivePermission.allowed?"rgba(239,68,68,.15)":"var(--eco-border)"}`,background:archivePermission.allowed?"rgba(239,68,68,.06)":"var(--eco-card, white)",color:archivePermission.allowed?"var(--eco-danger)":"var(--eco-gray-300)",cursor:archivePermission.allowed?"pointer":"not-allowed",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all .2s cubic-bezier(.4,0,.2,1)",opacity:archivingId===r.id?0.5:1}} onMouseEnter={e=>{if(!archivePermission.allowed)return;e.currentTarget.style.transform="translateY(-1px) scale(1.08)";e.currentTarget.style.background="rgba(239,68,68,.12)";e.currentTarget.style.borderColor="rgba(239,68,68,.3)";e.currentTarget.style.boxShadow="0 6px 16px -6px rgba(239,68,68,.4)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.background="rgba(239,68,68,.06)";e.currentTarget.style.borderColor="rgba(239,68,68,.15)";e.currentTarget.style.boxShadow="none";}}><Trash2 size={13}/></button><button onClick={e=>{e.stopPropagation();openTrace(r);}} aria-label={`Ver ${r.activity}`} style={{height:28,width:28,borderRadius:"var(--eco-radius-sm)",border:"1px solid var(--eco-border)",background:"white",color:"var(--eco-gray-400)",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 150ms"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.color="var(--eco-primary-600)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.color="var(--eco-gray-400)";}}><ExternalLink size={13}/></button></div></td>
                </tr>
              )}</tbody>
            </table>
          </div>
          {totalPages>1&&<div style={{padding:"10px 16px",borderTop:"1px solid var(--eco-gray-100)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{page*PER_PAGE+1}–{Math.min((page+1)*PER_PAGE,filtered.length)} de {filtered.length}</span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setPage(Math.max(0,page-1))} disabled={page===0} style={{width:30,height:30,borderRadius:"var(--eco-radius-sm)",border:"1px solid var(--eco-border)",background:"white",cursor:page===0?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--eco-gray-500)",opacity:page===0?0.4:1}}><ChevronLeft size={15}/></button>
              {Array.from({length:totalPages},(_,i)=><button key={i} onClick={()=>setPage(i)} style={{width:30,height:30,borderRadius:"var(--eco-radius-sm)",border:`1px solid ${page===i?"var(--eco-secondary-500)":"var(--eco-border)"}`,background:page===i?"var(--eco-secondary-50)":"white",fontFamily:fm,fontSize:12,fontWeight:page===i?700:400,color:page===i?"var(--eco-secondary-600)":"var(--eco-gray-600)",cursor:"pointer"}}>{i+1}</button>)}
              <button onClick={()=>setPage(Math.min(totalPages-1,page+1))} disabled={page>=totalPages-1} style={{width:30,height:30,borderRadius:"var(--eco-radius-sm)",border:"1px solid var(--eco-border)",background:"white",cursor:page>=totalPages-1?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--eco-gray-500)",opacity:page>=totalPages-1?0.4:1}}><ChevronRight size={15}/></button>
            </div>
          </div>}
        </div>}
      </div>
    </div>

    <Toast toast={toast} onDismiss={()=>setToast(null)}/>

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

    {/* ═══ DRILL-DOWN PANEL ═══ */}
    {drill&&<DrillPanel title="Trazabilidad de combustible" breadcrumb="Scope 1 → Combustible → Detalle" onClose={()=>setDrill(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:"var(--eco-secondary-50)",border:"1px solid #FDE68A",borderRadius:"var(--eco-radius-lg)",padding:16,textAlign:"center",animation:"ctFadeUp .3s ease-out"}}>
          <p style={{margin:"0 0 8px",fontFamily:fb,fontSize:12,fontWeight:600,color:"var(--eco-secondary-600)"}}>Cálculo de emisiones - Scope 1</p>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:fm,fontSize:18,fontWeight:700,color:"var(--eco-gray-800)"}}>{fN(drill.value,1)}</span><span style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>L</span>
            <span style={{color:"var(--eco-gray-400)",fontFamily:fm,fontSize:14}}>×</span>
            <span style={{fontFamily:fm,fontSize:18,fontWeight:700,color:"var(--eco-gray-800)"}}>{fN(drill.factor,3)}</span><span style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>kgCO₂e/L</span>
            <span style={{color:"var(--eco-gray-400)",fontFamily:fm,fontSize:14}}>=</span>
            <span style={{fontFamily:fm,fontSize:22,fontWeight:700,color:"var(--eco-primary-700)"}}>{fN(drill.co2e_kg,1)}</span><span style={{fontFamily:fb,fontSize:12,color:"var(--eco-primary-600)",fontWeight:600}}>kgCO₂e</span>
          </div>
        </div>

        <div style={{background:"var(--eco-gray-50)",borderRadius:"var(--eco-radius-md)",overflow:"hidden"}}>
          {[{l:"Fecha",v:fDate(drill.dateISO)},{l:"Área",v:drill.area},{l:"Scope",v:"Scope 1 - Combustible"},{l:"Actividad",v:drill.activity},{l:"Combustible",v:drill.fuelType},{l:"Consumo",v:`${fN(drill.value,1)} L`},{l:"Factor aplicado",v:`${fN(drill.factor,3)} kgCO₂e/L`},{l:"CO₂e (kg)",v:`${fN(drill.co2e_kg,1)} kgCO₂e`},{l:"Estado",v:null,badge:true},{l:"Fuente",v:drill.source},{l:"Equipo",v:drill.equipment||"-"},{l:"Evidencia",v:drill.evidence||"-"}].map((row,i)=>
            <div key={row.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:i<11?"1px solid var(--eco-gray-100)":"none",animation:`ctFadeUp .3s ease-out ${i*30}ms both`}}>
              <span style={{fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{row.l}</span>
              {row.badge?<Badge status={drill.status}/>:<span style={{fontFamily:fb,fontSize:12,fontWeight:600,color:"var(--eco-gray-700)",textAlign:"right"}}>{row.v}</span>}
            </div>
          )}
        </div>

        <div style={{background:"white",border:"1px solid var(--eco-border)",borderRadius:"var(--eco-radius-md)",padding:12}}>
          <p style={{margin:"0 0 8px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-gray-700)",display:"flex",alignItems:"center",gap:6}}><Filter size={12}/>Filtros activos</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{summaryFilters.map(item=><span key={item} style={{fontFamily:fb,fontSize:11,fontWeight:500,padding:"3px 8px",borderRadius:"var(--eco-radius-full)",background:"var(--eco-gray-100)",color:"var(--eco-gray-600)"}}>{item}</span>)}</div>
        </div>

        <div style={{background:archivePermission.allowed?"rgba(239,68,68,.04)":"var(--eco-surface, var(--eco-gray-50))",border:`1px solid ${archivePermission.allowed?"rgba(239,68,68,.12)":"var(--eco-border)"}`,borderRadius:"var(--eco-radius-lg)",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",transition:"all .2s ease"}}>
          <div style={{flex:1,minWidth:180}}>
            <p style={{margin:"0 0 3px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-text, var(--eco-gray-800))"}}>Baja logica con trazabilidad</p>
            <p style={{margin:0,fontFamily:fb,fontSize:11.5,color:"var(--eco-gray-500)",lineHeight:1.5}}>Oculta el registro de combustible del flujo operativo. Conserva archivos, revisiones y auditoria.</p>
          </div>
          <button onClick={()=>openArchiveDialog(drill)} disabled={!archivePermission.allowed||archivingId===drill.id} style={{height:36,padding:"0 14px",borderRadius:"var(--eco-radius-md)",border:"none",background:archivePermission.allowed?"linear-gradient(135deg, #EF4444, #DC2626)":"var(--eco-gray-200)",color:archivePermission.allowed?"#fff":"var(--eco-gray-400)",fontFamily:fb,fontSize:12.5,fontWeight:700,display:"inline-flex",alignItems:"center",gap:7,cursor:archivePermission.allowed?"pointer":"not-allowed",boxShadow:archivePermission.allowed?"0 6px 16px -6px rgba(220,38,38,.45)":"none",transition:"all .2s cubic-bezier(.4,0,.2,1)",flexShrink:0}}
            onMouseEnter={e=>{if(!archivePermission.allowed)return;e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 20px -6px rgba(220,38,38,.55)";e.currentTarget.style.filter="brightness(1.06)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=archivePermission.allowed?"0 6px 16px -6px rgba(220,38,38,.45)":"none";e.currentTarget.style.filter="brightness(1)";}}><Trash2 size={13}/>Dar de baja</button>
        </div>

        <div>
          <p style={{margin:"0 0 10px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-gray-700)",display:"flex",alignItems:"center",gap:6}}><ArrowRight size={12}/>Registros relacionados</p>
          {related.length?related.map((row,i)=>
            <button key={row.id} onClick={()=>setDrill(row)} style={{width:"100%",border:"1px solid var(--eco-border)",background:"white",borderRadius:"var(--eco-radius-md)",padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,marginBottom:6,transition:"all 150ms",animation:`ctFadeUp .3s ease-out ${i*40}ms both`}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.background="var(--eco-primary-50)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.background="white";}}>
              <span style={{fontFamily:fm,fontSize:11,color:"var(--eco-gray-500)",minWidth:70,textAlign:"left"}}>{fDate(row.dateISO).slice(0,6)}</span>
              <span style={{flex:1,textAlign:"left",fontFamily:fb,fontSize:12,color:"var(--eco-gray-600)"}}>{row.activity}</span>
              <Badge status={row.status}/>
              <span style={{fontFamily:fm,fontSize:12,fontWeight:700,color:"var(--eco-primary-700)"}}>{fN(row.co2e_kg,1)} kg</span>
              <ChevronRight size={13} style={{color:"var(--eco-gray-300)"}}/>
            </button>
          ):<p style={{margin:0,fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>No hay registros relacionados.</p>}
        </div>
      </div>
    </DrillPanel>}
  </>);
}
