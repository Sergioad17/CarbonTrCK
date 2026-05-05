import { useEffect, useMemo, useState, useRef } from "react";
import { Target, Plus, Download, ExternalLink, Pause, Play, Trash2, Edit3, AlertTriangle, CheckCircle2, Clock, Filter, RotateCcw, X, Eye, FileX, ChevronDown, Calendar } from "lucide-react";
import { BarChart, Bar, PieChart as RPieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { buildCsv, buildTargetLine, computeTargetSummary, deleteTargetById, downloadCsv, fetchTargetsModuleData, persistAction, persistTarget, updateTargetStatus, uid } from "../api/targets";
import MetaDetailModal from "../components/MetaDetailModal";
import Accions_Goals_Edits from "../components/Accions_Goals_Edits";
import { fetchCurrentUser } from "../api/session";
import { canUse, denyAction, disabledActionStyle } from "../lib/permissions";

const fd="var(--eco-font-display)",fb="var(--eco-font-body)",fm="var(--eco-font-mono)";
const MONTHS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const CSS=`@keyframes ctUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes ctSlideR{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}@keyframes ctOverlay{from{opacity:0}to{opacity:1}}@keyframes ctPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes ctFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes ctBarGrow{from{width:0}to{width:var(--bw)}}@media(max-width:1024px){.ct-kpi-g{grid-template-columns:1fr 1fr!important}.ct-ch-m{grid-template-columns:1fr!important}.ct-cards-g{grid-template-columns:1fr!important}.ct-detail-top,.ct-detail-meta,.ct-detail-notes{grid-template-columns:1fr!important}}@media(max-width:640px){.ct-kpi-g{grid-template-columns:1fr!important}.ct-hdr-a{flex-direction:column;width:100%}.ct-hdr-a button{width:100%}.ct-detail-summary{grid-template-columns:1fr 1fr!important}.ct-detail-actions{flex-direction:column}.ct-detail-actions button{width:100%;justify-content:center}}`;
const inStyle={height:36,borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",padding:"0 10px",fontFamily:fb,fontSize:13,color:"var(--eco-gray-700)",background:"white",outline:"none",transition:"border-color 150ms"};
const fmt=(n,d=1)=>Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:d,maximumFractionDigits:d});
const badge=s=>s==="completed"?["Completada","var(--eco-success-bg)","#BBF7D0","var(--eco-success)"]:s==="at_risk"?["En riesgo","var(--eco-warning-bg)","#FDE68A","var(--eco-secondary-600)"]:s==="paused"?["Pausada","var(--eco-gray-100)","var(--eco-border)","var(--eco-gray-600)"]:["Activa","var(--eco-info-bg)","#BFDBFE","var(--eco-info)"];
const btnP={height:36,padding:"0 14px",borderRadius:"var(--eco-radius-md)",border:"none",background:"var(--eco-primary-500)",color:"white",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,boxShadow:"var(--eco-shadow-sm)",transition:"all 200ms cubic-bezier(.33,1,.68,1)"};
const btnS={height:36,padding:"0 14px",borderRadius:"var(--eco-radius-md)",border:"1px solid var(--eco-border)",background:"white",color:"var(--eco-gray-700)",fontFamily:fb,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 150ms"};
const hS=e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.color="var(--eco-primary-700)";};const lS=e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.color="var(--eco-gray-700)";};
const scopeFromCategory=c=>c==="electricidad"?"scope2":c==="combustible"?"scope1":c==="otros"?"scope3":"all";
const scopeLabel=value=>value==="scope1"?"Scope 1":value==="scope2"?"Scope 2":value==="scope3"?"Scope 3":"Todos";
const categoryLabel=value=>value==="electricidad"?"Electricidad":value==="combustible"?"Combustible":value==="otros"?"Otros":"Todas";
const typeLabel=value=>value==="absolute"?"Absoluto tCO2e":"Reduccion %";
const emptyText="No disponible";
const fmtDate=value=>{if(!value)return emptyText;const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});};
const fmtDateTime=value=>{if(!value)return emptyText;const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString("es-MX",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});};
const getCreatorName=user=>user?.fullName||user?.name||user?.email||"Usuario CarbonTrack";
const buildTargetForm=overrides=>({id:"",title:"",scope:"all",category:"all",areaId:"all",type:"reduction_percent",baselineStart:"",baselineEnd:"",baselineValue:"",targetStart:"",targetEnd:"",targetValue:"",description:"",status:"active",createdBy:"",createdById:"",pauseReason:"",...(overrides||{})});
function useCountUp(t,dur=650){const[v,setV]=useState(0);const ref=useRef(null);useEffect(()=>{let s=null;const ease=x=>1-Math.pow(1-x,3);const step=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);setV(ease(p)*t);if(p<1)ref.current=requestAnimationFrame(step);else setV(t);};ref.current=requestAnimationFrame(step);return()=>ref.current&&cancelAnimationFrame(ref.current);},[t,dur]);return v;}

function Panel({title,breadcrumb,onClose,children}){useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[onClose]);return<div style={{position:"fixed",inset:0,zIndex:90,display:"flex",justifyContent:"flex-end"}} role="dialog" aria-modal="true"><div style={{position:"absolute",inset:0,background:"rgba(15,23,42,.35)",backdropFilter:"blur(3px)",animation:"ctOverlay .2s ease-out"}} onClick={onClose}/><div style={{position:"relative",width:"100%",maxWidth:560,background:"white",boxShadow:"0 20px 25px -5px rgba(15,23,42,.08)",display:"flex",flexDirection:"column",animation:"ctSlideR .3s cubic-bezier(.33,1,.68,1)"}}><div style={{padding:"16px 20px",borderBottom:"1px solid var(--eco-border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div>{breadcrumb&&<p style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)",margin:"0 0 2px",display:"flex",alignItems:"center",gap:4}}><Target size={10}/>{breadcrumb}</p>}<h3 style={{margin:0,fontFamily:fd,fontSize:18,fontWeight:700}}>{title}</h3></div><button onClick={onClose} aria-label="Cerrar" style={{width:32,height:32,borderRadius:"var(--eco-radius-sm)",border:"none",background:"var(--eco-gray-100)",cursor:"pointer",color:"var(--eco-gray-500)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 150ms"}} onMouseEnter={e=>e.currentTarget.style.background="var(--eco-border)"} onMouseLeave={e=>e.currentTarget.style.background="var(--eco-gray-100)"}><X size={16}/></button></div><div style={{flex:1,overflow:"auto",padding:20}}>{children}</div></div></div>;}

function KpiCard({title,value,unit,icon,iconBg,iconColor,sub,status,delay=0}){const num=Number(String(value).replace(/[^0-9.\-]/g,""))||0;const anim=useCountUp(num,700);const isNum=!isNaN(num)&&String(value)!=="-";const sa={warning:{c:"var(--eco-warning)",b:"#FDE68A"},danger:{c:"var(--eco-danger)",b:"#FECACA"},success:{c:"var(--eco-success)",b:"#BBF7D0"}}[status]||null;
  return<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",padding:18,border:`1px solid ${sa?.b||"var(--eco-border)"}`,boxShadow:"var(--eco-shadow-sm)",transition:"all 200ms cubic-bezier(.33,1,.68,1)",animation:`ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`,position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-md)";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="var(--eco-primary-300)";}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-sm)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=sa?.b||"var(--eco-border)";}}>
    {sa&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:sa.c,borderRadius:"14px 14px 0 0"}}/>}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{width:38,height:38,borderRadius:"var(--eco-radius-md)",background:iconBg||"var(--eco-primary-50)",color:iconColor||"var(--eco-primary-600)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div><p style={{margin:0,fontFamily:fb,fontSize:13,fontWeight:500,color:"var(--eco-gray-500)",lineHeight:1.2}}>{title}</p></div>
    <div style={{display:"flex",alignItems:"baseline",gap:5}}><span style={{fontFamily:fm,fontSize:26,fontWeight:700,color:"var(--eco-gray-900)",letterSpacing:"-0.02em"}}>{isNum?fmt(anim,unit==="%"?1:unit==="metas"?0:3):value}</span><span style={{fontFamily:fm,fontSize:12,color:"var(--eco-gray-400)"}}>{unit}</span></div>
    {sub&&<p style={{margin:"4px 0 0",fontFamily:fb,fontSize:11,color:"var(--eco-gray-400)"}}>{sub}</p>}
  </div>;}

function ChartCard({title,sub,children,delay=0}){return<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",overflow:"hidden",animation:`ctUp .4s cubic-bezier(.33,1,.68,1) ${delay}ms both`}}><div style={{padding:"16px 18px 8px"}}><p style={{margin:0,fontFamily:fd,fontSize:15,fontWeight:700,color:"var(--eco-gray-800)"}}>{title}</p>{sub&&<p style={{margin:"2px 0 0",fontFamily:fb,fontSize:12,color:"var(--eco-gray-400)"}}>{sub}</p>}</div><div style={{padding:"4px 10px 14px"}}>{children}</div></div>;}

function PageSkeleton(){
  const sh={background:"linear-gradient(90deg,var(--eco-border) 25%,var(--eco-surface) 50%,var(--eco-border) 75%)",backgroundSize:"200% 100%",animation:"ctShimmer 1.5s ease-in-out infinite",borderRadius:"var(--eco-radius-md)"};
  const card={background:"var(--eco-surface)",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)"};
  return(
    <div style={{padding:"var(--page-pad-y,24px) var(--page-pad-x,24px)",maxWidth:"var(--content-max,1440px)",margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{...sh,width:38,height:38,borderRadius:"var(--eco-radius-md)"}}/>
          <div>
            <div style={{...sh,width:120,height:24,marginBottom:6}}/>
            <div style={{...sh,width:300,height:14}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <div style={{...sh,width:110,height:34}}/>
          <div style={{...sh,width:110,height:34}}/>
          <div style={{...sh,width:100,height:34}}/>
          <div style={{...sh,width:110,height:34}}/>
        </div>
      </div>
      {/* Filters */}
      <div style={{...card,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
        <div style={{...sh,width:28,height:28,borderRadius:"var(--eco-radius-sm)"}}/>
        <div style={{...sh,width:80,height:14}}/>
        <div style={{flex:1}}/>
        <div style={{...sh,width:80,height:30,borderRadius:"var(--eco-radius-sm)"}}/>
      </div>
      {/* KPIs */}
      <div className="ct-kpi-g" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{...card,padding:20,animation:`ctUp .3s ease-out ${i*50}ms both`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{...sh,width:38,height:38,borderRadius:10}}/>
              <div style={{...sh,width:90,height:12}}/>
            </div>
            <div style={{...sh,width:80,height:26,marginBottom:6}}/>
            <div style={{...sh,width:50,height:12}}/>
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="ct-ch-m" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        {[0,1].map(i=>(
          <div key={i} style={{...card,overflow:"hidden",animation:`ctUp .3s ease-out ${250+i*60}ms both`}}>
            <div style={{padding:"16px 18px 10px"}}>
              <div style={{...sh,width:160,height:14,marginBottom:4}}/>
              <div style={{...sh,width:100,height:10}}/>
            </div>
            <div style={{padding:"6px 12px 16px"}}>
              <div style={{...sh,width:"100%",height:250}}/>
            </div>
          </div>
        ))}
      </div>
      {/* Line chart */}
      <div style={{...card,overflow:"hidden",marginBottom:20,animation:"ctUp .3s ease-out 400ms both"}}>
        <div style={{padding:"16px 18px 10px"}}>
          <div style={{...sh,width:200,height:14,marginBottom:4}}/>
          <div style={{...sh,width:120,height:10}}/>
        </div>
        <div style={{padding:"6px 12px 16px"}}>
          <div style={{...sh,width:"100%",height:240}}/>
        </div>
      </div>
      {/* Target cards */}
      <div className="ct-cards-g" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{...card,padding:16,animation:`ctUp .3s ease-out ${500+i*50}ms both`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{...sh,width:140,height:14,marginBottom:6}}/>
                <div style={{...sh,width:180,height:10}}/>
              </div>
              <div style={{...sh,width:60,height:20,borderRadius:"var(--eco-radius-full)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div style={{...sh,width:"100%",height:60,borderRadius:"var(--eco-radius-md)"}}/>
              <div style={{...sh,width:"100%",height:60,borderRadius:"var(--eco-radius-md)"}}/>
            </div>
            <div style={{...sh,width:"100%",height:8,borderRadius:4,marginBottom:10}}/>
            <div style={{...sh,width:"100%",height:30,borderRadius:"var(--eco-radius-md)"}}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toast({toast}){if(!toast)return null;return<div role="alert" style={{position:"fixed",right:20,bottom:20,zIndex:120,background:"white",border:"1px solid var(--eco-border)",boxShadow:"0 20px 25px -5px rgba(15,23,42,.08)",borderRadius:"var(--eco-radius-lg)",padding:"14px 16px",minWidth:260,maxWidth:340,display:"flex",alignItems:"flex-start",gap:10,animation:"ctSlideR .3s cubic-bezier(.33,1,.68,1)"}}><div style={{width:28,height:28,borderRadius:"var(--eco-radius-sm)",background:"var(--eco-success-bg)",color:"var(--eco-success)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><CheckCircle2 size={14}/></div><div><p style={{margin:0,fontFamily:fd,fontSize:14,fontWeight:700,color:"var(--eco-gray-800)"}}>{toast.title}</p><p style={{margin:"2px 0 0",fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{toast.message}</p></div></div>;}

function FilterSel({label,value,onChange,options,icon}){return<label style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontFamily:fb,fontSize:12,fontWeight:500,color:"var(--eco-gray-500)",display:"flex",alignItems:"center",gap:4}}>{icon&&<span style={{display:"flex",color:"var(--eco-gray-400)"}}>{icon}</span>}{label}</span><select value={value} onChange={onChange} style={inStyle} onFocus={e=>e.target.style.borderColor="var(--eco-primary-300)"} onBlur={e=>e.target.style.borderColor="var(--eco-border)"}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>;}

export default function MetasPage({ user }){
  const today=new Date().toISOString().slice(0,10);
  const currentUser=useMemo(()=>fetchCurrentUser(),[]);
  const creatorName=useMemo(()=>getCreatorName(currentUser),[currentUser]);
  const[loading,setLoading]=useState(true),[error,setError]=useState(""),[targets,setTargets]=useState([]),[actions,setActions]=useState([]),[records,setRecords]=useState([]),[toast,setToast]=useState(null),[traceOpen,setTraceOpen]=useState(false);
  const[periodMode,setPeriodMode]=useState("todos"),[month,setMonth]=useState(new Date().getMonth()+1),[year,setYear]=useState(new Date().getFullYear()),[fromDate,setFromDate]=useState(""),[toDate,setToDate]=useState(""),[category,setCategory]=useState("all"),[area,setArea]=useState("all"),[status,setStatus]=useState("all"),[stateFilter,setStateFilter]=useState("all"),[lineFocus,setLineFocus]=useState("global");
  const[tModal,setTModal]=useState(false),[aModal,setAModal]=useState(false),[editing,setEditing]=useState(null),[filtersOpen,setFiltersOpen]=useState(true),[detailId,setDetailId]=useState("");
  const[tf,setTf]=useState(()=>buildTargetForm({createdBy:creatorName,createdById:currentUser?.id||""}));
  const[af,setAf]=useState({id:"",targetId:"",title:"",owner:"",status:"planned",startDate:"",endDate:"",impact_tco2e:"",evidence:"",notes:""});
  const canCreateTarget=canUse(user,"targets:create");
  const canEditTarget=canUse(user,"targets:edit");
  const canDeleteTarget=canUse(user,"targets:delete");
  const canExportTarget=canUse(user,"targets:export");

  useEffect(()=>{let active=true;(async()=>{const data=await fetchTargetsModuleData().catch(()=>null);if(!active)return;if(!data){setError("No se pudieron cargar las metas.");setLoading(false);return;}setTargets(data.targets);setActions(data.actions);setRecords(data.records);setError(data.error||"");setLoading(false);})();return()=>{active=false;};},[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),3000);return()=>clearTimeout(t);},[toast]);

  const areas=useMemo(()=>Array.from(new Set([...records.map(r=>r.area),...targets.map(r=>r.areaId).filter(x=>x&&x!=="all")])).sort(),[records,targets]);
  const rows=useMemo(()=>targets.map(t=>({...t,summary:computeTargetSummary(t,records,actions,today)})),[targets,records,actions,today]);
  const filtered=useMemo(()=>rows.filter(t=>{const okP=periodMode==="mes"?((!t.targetStart||t.targetStart.slice(0,7)<=`${year}-${String(month).padStart(2,"0")}`)&&(!t.targetEnd||t.targetEnd.slice(0,7)>=`${year}-${String(month).padStart(2,"0")}`)): (((t.targetStart||"0000-01-01")<=(toDate||"9999-12-31"))&&((t.targetEnd||"9999-12-31")>=(fromDate||"0000-01-01")));return okP&&(category==="all"||t.category===category)&&(area==="all"||t.areaId===area)&&(status==="all"||t.status===status)&&(stateFilter==="all"||t.summary.state===stateFilter);}),[rows,periodMode,month,year,fromDate,toDate,category,area,status,stateFilter]);
  const visRows=filtered;
  const detailTarget=useMemo(()=>rows.find(row=>row.id===detailId)||null,[rows,detailId]);
  const k=useMemo(()=>({active:visRows.filter(x=>x.status==="active").length,avg:visRows.length?visRows.reduce((a,b)=>a+b.summary.progressPct,0)/visRows.length:0,avoided:visRows.reduce((a,b)=>a+b.summary.avoided,0),risk:visRows.filter(x=>x.summary.state==="at_risk").length}),[visRows]);
  const donut=useMemo(()=>{const s={active:0,at_risk:0,completed:0};visRows.forEach(r=>{if(s[r.summary.state]!=null)s[r.summary.state]+=1;});return[{state:"active",name:"Activa",value:s.active,color:"#22C55E"},{state:"at_risk",name:"En riesgo",value:s.at_risk,color:"#EAB308"},{state:"completed",name:"Completada",value:s.completed,color:"#EF4444"}];},[visRows]);
  const bars=useMemo(()=>visRows.map(r=>({id:r.id,title:r.title,progress:Number(r.summary.progressPct.toFixed(1))})),[visRows]);
  const line=useMemo(()=>{if(lineFocus!=="global"){const f=filtered.find(r=>r.id===lineFocus);if(f)return buildTargetLine(f,records);}const g=records.reduce((a,r)=>{const key=(r.dateISO||"").slice(0,7);if(!key)return a;a[key]=(a[key]||0)+Number(r.co2e_t||0);return a;},{});const keys=Object.keys(g).sort();if(!keys.length)return [];const b=g[keys[0]],l=g[keys[keys.length-1]],st=Math.max(keys.length-1,1);return keys.map((key,i)=>{const[yy,mm]=key.split("-").map(Number);return{label:`${MONTHS[(mm||1)-1]} ${yy}`,actual:g[key],goal:b+((l*0.9-b)*i)/st};});},[lineFocus,filtered,records]);
  const activeFC=useMemo(()=>[category!=="all"?category:"",area!=="all"?area:"",status!=="all"?status:"",stateFilter!=="all"?stateFilter:""].filter(Boolean).length,[category,area,status,stateFilter]);
  useEffect(()=>{if(detailId&&!rows.some(row=>row.id===detailId))setDetailId("");},[detailId,rows]);

  const clear=()=>{setPeriodMode("todos");setMonth(new Date().getMonth()+1);setYear(new Date().getFullYear());setFromDate("");setToDate("");setCategory("all");setArea("all");setStatus("all");setStateFilter("all");};
  const openTarget=(x=null)=>{if(x&&!canEditTarget){denyAction(setToast);return;}if(!x&&!canCreateTarget){denyAction(setToast);return;}setEditing(x);setTf(x?buildTargetForm({...x,baselineValue:String(x.baselineValue||""),targetValue:String(x.targetValue||""),createdBy:x.createdBy||creatorName,createdById:x.createdById||currentUser?.id||"",pauseReason:x.pauseReason||""}):buildTargetForm({createdBy:creatorName,createdById:currentUser?.id||""}));setTModal(true);};
  const openDetail=(targetId="")=>{if(targetId)setDetailId(targetId);};
  const openAction=(targetId="")=>{if(!canCreateTarget){denyAction(setToast);return;}setAf({id:"",targetId:targetId||filtered[0]?.id||targets[0]?.id||"",title:"",owner:"",status:"planned",startDate:"",endDate:"",impact_tco2e:"",evidence:"",notes:""});setAModal(true);};
  const saveTargetForm=async e=>{e.preventDefault();if(editing&&!canEditTarget){denyAction(setToast);return;}if(!editing&&!canCreateTarget){denyAction(setToast);return;}const b=Number(tf.baselineValue),t=Number(tf.targetValue);if(!tf.title.trim()||!tf.baselineStart||!tf.baselineEnd||!tf.targetStart||!tf.targetEnd||!(b>0)||!(t>0)||(tf.type==="reduction_percent"&&t>100)){setToast({title:"Validación",message:"Revisa los campos de la meta."});return;}const payload={...tf,id:tf.id||uid("target"),scope:scopeFromCategory(tf.category),baselineValue:b,targetValue:t,createdBy:editing?.createdBy||tf.createdBy||creatorName,createdById:editing?.createdById||tf.createdById||currentUser?.id||"",pauseReason:tf.pauseReason||editing?.pauseReason||"",createdAt:editing?.createdAt||new Date().toISOString()};const result=await persistTarget(payload).catch(()=>null);if(!result?.ok){setToast({title:"Error",message:"No se pudo guardar la meta."});return;}setTargets(result.targets);setTModal(false);setToast({title:editing?"Meta actualizada":"Meta creada",message:payload.title});};
  const saveActionForm=async e=>{e.preventDefault();if(!canCreateTarget){denyAction(setToast);return;}if(!af.targetId||!af.title.trim()){setToast({title:"Validación",message:"Selecciona meta y nombre."});return;}const payload={...af,id:af.id||uid("action"),impact_tco2e:Number(af.impact_tco2e||0)};const result=await persistAction(payload).catch(()=>null);if(!result?.ok){setToast({title:"Error",message:"No se pudo guardar la acción."});return;}setActions(result.actions);setAModal(false);setToast({title:"Acción creada",message:payload.title});};
  const sw=async t=>{if(!canEditTarget){denyAction(setToast);return;}if(t.status==="paused"){const result=await updateTargetStatus(t,{status:"active",pauseReason:t.pauseReason||""}).catch(()=>null);if(!result?.ok){setToast({title:"Error",message:"No se pudo actualizar la meta."});return;}setTargets(result.targets);setToast({title:"Meta activada",message:t.title});return;}const reason=window.prompt("Motivo de pausa",t.pauseReason||"");if(reason===null)return;const result=await updateTargetStatus(t,{status:"paused",pauseReason:reason.trim()}).catch(()=>null);if(!result?.ok){setToast({title:"Error",message:"No se pudo actualizar la meta."});return;}setTargets(result.targets);setToast({title:"Meta pausada",message:t.title});};
  const del=async t=>{if(!canDeleteTarget){denyAction(setToast);return;}if(!window.confirm(`Eliminar meta "${t.title}"?`))return;const result=await deleteTargetById(t.id).catch(()=>null);if(!result?.ok){setToast({title:"Error",message:"No se pudo eliminar la meta."});return;}setTargets(result.targets);setActions(result.actions);setToast({title:"Meta eliminada",message:t.title});};
  const exp=()=>{if(!canExportTarget){denyAction(setToast);return;}const csv=buildCsv(filtered,[{label:"Meta",get:r=>r.title},{label:"Scope",get:r=>r.scope},{label:"Categoria",get:r=>r.category},{label:"Area",get:r=>r.areaId},{label:"Baseline",get:r=>r.summary.baseline.toFixed(3)},{label:"Objetivo",get:r=>r.summary.targetAbsolute.toFixed(3)},{label:"Actual",get:r=>r.summary.actual.toFixed(3)},{label:"Avance%",get:r=>r.summary.progressPct.toFixed(1)}]);downloadCsv(`metas-${Date.now()}.csv`,csv);setToast({title:"Exportado",message:`${filtered.length} metas`});};

  if(loading)return<><style>{CSS}</style><PageSkeleton/></>;
  return<><style>{CSS}</style>
    <div style={{padding:"var(--page-pad-y,24px) var(--page-pad-x,24px)",maxWidth:"var(--content-max,1440px)",margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:20,animation:"ctUp .4s cubic-bezier(.33,1,.68,1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:38,height:38,borderRadius:"var(--eco-radius-md)",background:"linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(34,197,94,.2)",flexShrink:0}}><Target size={18} color="white"/></div><div><h1 style={{margin:0,fontFamily:fd,fontSize:24,fontWeight:800,color:"var(--eco-gray-900)",letterSpacing:"-0.02em"}}>Metas</h1><p style={{margin:"2px 0 0",fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Define objetivos de reducción y da seguimiento con acciones</p></div></div>
        <div className="ct-hdr-a" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>openTarget()} style={disabledActionStyle(canCreateTarget,btnP)} onMouseEnter={e=>{if(canCreateTarget){e.currentTarget.style.background="var(--eco-primary-600)";e.currentTarget.style.transform="translateY(-1px)";}}} onMouseLeave={e=>{if(canCreateTarget){e.currentTarget.style.background="var(--eco-primary-500)";e.currentTarget.style.transform="translateY(0)";}}}><Plus size={14}/>Nueva meta</button>
          <button onClick={()=>openAction()} style={disabledActionStyle(canCreateTarget,btnS)} onMouseEnter={canCreateTarget?hS:undefined} onMouseLeave={canCreateTarget?lS:undefined}><Plus size={14}/>Nueva acción</button>
          <button onClick={exp} style={disabledActionStyle(canExportTarget,btnS)} onMouseEnter={canExportTarget?hS:undefined} onMouseLeave={canExportTarget?lS:undefined}><Download size={14}/>Exportar</button>
          <button onClick={()=>setTraceOpen(true)} style={btnS} onMouseEnter={hS} onMouseLeave={lS}><Eye size={14}/>Trazabilidad</button>
        </div>
      </div>

      {/* Collapsible filters */}
      <div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1.5px solid var(--eco-primary-500)",boxShadow:"var(--eco-shadow-sm)",marginBottom:20,overflow:"hidden",animation:"ctUp .4s cubic-bezier(.33,1,.68,1) 60ms both"}}>
        <button onClick={()=>setFiltersOpen(!filtersOpen)} style={{width:"100%",padding:"12px 16px",border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:filtersOpen?"1px solid var(--eco-gray-100)":"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Filter size={15} style={{color:"var(--eco-gray-500)"}}/><span style={{fontFamily:fd,fontSize:14,fontWeight:600,color:"var(--eco-gray-700)"}}>Filtros</span>{activeFC>0&&<span style={{minWidth:18,height:18,borderRadius:"var(--eco-radius-full)",background:"var(--eco-primary-100)",color:"var(--eco-primary-700)",fontFamily:fm,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{activeFC}</span>}</div>
          <ChevronDown size={16} style={{color:"var(--eco-gray-400)",transition:"transform 200ms",transform:filtersOpen?"rotate(180deg)":"rotate(0)"}}/>
        </button>
        {filtersOpen&&<div style={{padding:"14px 16px"}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          <FilterSel label="Periodo" value={periodMode} onChange={e=>setPeriodMode(e.target.value)} icon={<Calendar size={11}/>} options={[{v:"todos",l:"Todos"},{v:"mes",l:"Mes/Año"},{v:"rango",l:"Rango"}]}/>
          {periodMode==="mes"?<><FilterSel label="Mes" value={month} onChange={e=>setMonth(Number(e.target.value))} options={MONTHS.map((m,i)=>({v:i+1,l:m}))}/><FilterSel label="Año" value={year} onChange={e=>setYear(Number(e.target.value))} options={[2024,2025,2026,2027,2028].map(y=>({v:y,l:String(y)}))}/></>:periodMode==="rango"?<><label style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontFamily:fb,fontSize:12,fontWeight:500,color:"var(--eco-gray-500)"}}>Desde</span><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={inStyle} onFocus={e=>e.target.style.borderColor="var(--eco-primary-300)"} onBlur={e=>e.target.style.borderColor="var(--eco-border)"}/></label><label style={{display:"flex",flexDirection:"column",gap:5}}><span style={{fontFamily:fb,fontSize:12,fontWeight:500,color:"var(--eco-gray-500)"}}>Hasta</span><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={inStyle} onFocus={e=>e.target.style.borderColor="var(--eco-primary-300)"} onBlur={e=>e.target.style.borderColor="var(--eco-border)"}/></label></>:null}
          <FilterSel label="Categoría" value={category} onChange={e=>setCategory(e.target.value)} options={[{v:"all",l:"Todas"},{v:"electricidad",l:"Electricidad"},{v:"combustible",l:"Combustible"},{v:"otros",l:"Otros"}]}/>
          <FilterSel label="Área" value={area} onChange={e=>setArea(e.target.value)} options={[{v:"all",l:"Todas"},...areas.map(a=>({v:a,l:a}))]}/>
          <FilterSel label="Estado" value={status} onChange={e=>setStatus(e.target.value)} options={[{v:"all",l:"Todos"},{v:"active",l:"Activa"},{v:"paused",l:"Pausada"},{v:"completed",l:"Completada"}]}/>
        </div><div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button onClick={clear} style={{height:32,padding:"0 12px",borderRadius:"var(--eco-radius-sm)",border:"1px solid var(--eco-border)",background:"white",fontFamily:fb,fontSize:12,fontWeight:600,color:"var(--eco-gray-600)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"all 150ms"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--eco-primary-300)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--eco-border)"}><RotateCcw size={12}/>Limpiar</button></div></div>}
      </div>

      {/* KPIs */}
      <div className="ct-kpi-g" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <KpiCard title="Metas activas" value={k.active} unit="metas" icon={<Clock size={18}/>} delay={120}/>
        <KpiCard title="Avance promedio" value={k.avg} unit="%" icon={<Target size={18}/>} delay={180} status={k.avg>=70?"success":k.avg>=40?"warning":"danger"}/>
        <KpiCard title="CO₂e evitadas" value={k.avoided} unit="tCO₂e" icon={<CheckCircle2 size={18}/>} iconBg="var(--eco-success-bg)" iconColor="var(--eco-success)" delay={240}/>
        <KpiCard title="Metas en riesgo" value={k.risk} unit="metas" icon={<AlertTriangle size={18}/>} iconBg="var(--eco-warning-bg)" iconColor="var(--eco-warning)" delay={300} status={k.risk>0?"warning":undefined}/>
      </div>

      {/* Charts */}
      {!error&&<><div className="ct-ch-m" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
        <ChartCard title="Avance por meta" sub="Clic para abrir detalle" delay={350}><ResponsiveContainer width="100%" height={250}><BarChart data={bars} margin={{top:8,right:8,left:-12,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false}/><XAxis dataKey="title" tick={{fontFamily:"var(--eco-font-body)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><RTooltip cursor={{ fill: "rgba(136,136,136,0.15)" }}/><Bar dataKey="progress" radius={[5,5,0,0]} fill="#22C55E" cursor="pointer" onClick={r=>r?.id&&openDetail(r.id)}/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Distribución por estado" sub="Clic para filtrar" delay={410}><div style={{position:"relative"}}><ResponsiveContainer width="100%" height={250}><RPieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={3} onClick={e=>setStateFilter(p=>p===e.state?"all":e.state)}>{donut.map(d=><Cell key={d.state} fill={stateFilter===d.state?"#1D4ED8":d.color} stroke="white" strokeWidth={2} cursor="pointer"/>)}</Pie></RPieChart></ResponsiveContainer><div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",pointerEvents:"none"}}><div style={{textAlign:"center"}}><p style={{margin:0,fontFamily:fm,fontSize:20,fontWeight:700}}>{visRows.length}</p><p style={{margin:0,fontFamily:fb,fontSize:10,color:"var(--eco-gray-400)"}}>metas</p></div></div></div></ChartCard>
      </div>
      <ChartCard title="Emisiones vs trayectoria objetivo" sub={lineFocus==="global"?"Vista global":"Meta seleccionada"} delay={470}><div style={{display:"flex",justifyContent:"flex-end",padding:"0 8px 8px"}}><select value={lineFocus} onChange={e=>setLineFocus(e.target.value)} style={{...inStyle,height:30,maxWidth:240,fontSize:12}}><option value="global">Global</option>{visRows.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></div><ResponsiveContainer width="100%" height={240}><LineChart data={line} margin={{top:8,right:12,left:-12,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--eco-gray-100)" vertical={false}/><XAxis dataKey="label" tick={{fontFamily:"var(--eco-font-body)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><YAxis tick={{fontFamily:"var(--eco-font-mono)",fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/><RTooltip/><Line type="monotone" dataKey="actual" name="Real" stroke="#22C55E" strokeWidth={2.5} dot={{r:4,fill:"#22C55E",stroke:"white",strokeWidth:2}} activeDot={{r:6,stroke:"#22C55E",strokeWidth:2,fill:"white"}} connectNulls/><Line type="monotone" dataKey="goal" name="Objetivo" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 3" dot={false}/></LineChart></ResponsiveContainer></ChartCard></>}

      {/* Target cards */}
      <div style={{marginTop:20}}>{error?<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid #FECACA",padding:"22px 20px",boxShadow:"var(--eco-shadow-sm)",animation:"ctUp .3s ease-out"}}><p style={{margin:0,fontFamily:fd,fontSize:16,fontWeight:700,color:"var(--eco-danger)"}}>No se pudieron cargar las metas.</p></div>:!loading&&!visRows.length?<div style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",padding:"48px 24px",textAlign:"center",animation:"ctUp .4s ease-out"}}><div style={{width:64,height:64,borderRadius:"50%",background:"var(--eco-gray-100)",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--eco-gray-400)",animation:"ctFloat 3s ease-in-out infinite"}}><FileX size={28}/></div><p style={{margin:"0 0 5px",fontFamily:fd,fontSize:16,fontWeight:700,color:"var(--eco-gray-700)"}}>Aún no hay metas</p><p style={{margin:0,fontFamily:fb,fontSize:13,color:"var(--eco-gray-500)"}}>Crea tu primera meta para comenzar.</p></div>
      :<div className="ct-cards-g" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>{visRows.map((t,i)=>{const[l,bg,bd,c]=badge(t.summary.state);return<div key={t.id} style={{background:"white",borderRadius:"var(--eco-radius-lg)",border:"1px solid var(--eco-border)",boxShadow:"var(--eco-shadow-sm)",padding:16,transition:"all 200ms cubic-bezier(.33,1,.68,1)",animation:`ctUp .4s cubic-bezier(.33,1,.68,1) ${Math.min(i*40,280)}ms both`,position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-md)";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="var(--eco-primary-300)";}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="var(--eco-shadow-sm)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="var(--eco-border)";}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}><div><p style={{margin:"0 0 2px",fontFamily:fd,fontSize:15,fontWeight:700,color:"var(--eco-gray-800)"}}>{t.title}</p><p style={{margin:0,fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>{t.scope} | {t.category} | {t.areaId==="all"?"Todas":t.areaId}</p></div><span style={{fontFamily:fb,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:"var(--eco-radius-full)",background:bg,border:`1px solid ${bd}`,color:c,whiteSpace:"nowrap"}}>{l}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}><div style={{background:"var(--eco-gray-50)",borderRadius:"var(--eco-radius-md)",padding:10}}><p style={{margin:0,fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>Baseline</p><p style={{margin:"3px 0 0",fontFamily:fm,fontSize:13,fontWeight:700,color:"var(--eco-gray-800)"}}>{fmt(t.summary.baseline,3)} tCO₂e</p><p style={{margin:"2px 0 0",fontFamily:fb,fontSize:10,color:"var(--eco-gray-400)"}}>{t.baselineStart} a {t.baselineEnd}</p></div><div style={{background:"var(--eco-gray-50)",borderRadius:"var(--eco-radius-md)",padding:10}}><p style={{margin:0,fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>Objetivo</p><p style={{margin:"3px 0 0",fontFamily:fm,fontSize:13,fontWeight:700,color:"var(--eco-gray-800)"}}>{t.type==="reduction_percent"?`${fmt(t.targetValue,1)}%`:`${fmt(t.targetValue,2)} tCO₂e`}</p><p style={{margin:"2px 0 0",fontFamily:fb,fontSize:10,color:"var(--eco-gray-400)"}}>Límite: {t.targetEnd||"-"}</p></div></div>
        <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>Avance</span><span style={{fontFamily:fm,fontSize:11,fontWeight:700,color:"var(--eco-gray-700)"}}>{fmt(t.summary.progressPct,1)}%</span></div><div style={{width:"100%",height:8,borderRadius:"var(--eco-radius-full)",background:"var(--eco-gray-100)",overflow:"hidden"}}><div style={{width:`${Math.min(100,t.summary.progressPct)}%`,height:"100%",borderRadius:"var(--eco-radius-full)",background:t.summary.state==="completed"?"var(--eco-success)":t.summary.state==="at_risk"?"var(--eco-warning)":"var(--eco-info)",transition:"width 800ms cubic-bezier(.25,.1,.25,1)"}}/></div></div>
        <div style={{marginTop:8}}><span style={{fontFamily:fb,fontSize:11,color:"var(--eco-gray-500)"}}>Evitadas: <span style={{fontFamily:fm,fontWeight:700,color:"var(--eco-primary-700)"}}>{fmt(t.summary.avoided,3)} tCO₂e</span></span></div>
        <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>openDetail(t.id)} style={{...btnS,height:30,fontSize:12,borderRadius:"var(--eco-radius-sm)"}} onMouseEnter={hS} onMouseLeave={lS}><ExternalLink size={12}/>Detalle</button>
          <button onClick={()=>openTarget(t)} style={disabledActionStyle(canEditTarget,{...btnS,height:30,fontSize:12,borderRadius:"var(--eco-radius-sm)"})} onMouseEnter={canEditTarget?hS:undefined} onMouseLeave={canEditTarget?lS:undefined}><Edit3 size={12}/>Editar</button>
          <button onClick={()=>sw(t)} style={disabledActionStyle(canEditTarget,{...btnS,height:30,fontSize:12,borderRadius:"var(--eco-radius-sm)"})} onMouseEnter={canEditTarget?hS:undefined} onMouseLeave={canEditTarget?lS:undefined}>{t.status==="paused"?<Play size={12}/>:<Pause size={12}/>}{t.status==="paused"?"Activar":"Pausar"}</button>
          <button onClick={()=>del(t)} style={disabledActionStyle(canDeleteTarget,{height:30,padding:"0 10px",borderRadius:"var(--eco-radius-sm)",border:"1px solid #FECACA",background:"var(--eco-danger-bg)",fontFamily:fb,fontSize:12,fontWeight:700,color:"var(--eco-danger)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all 150ms"})}><Trash2 size={12}/>Eliminar</button>
        </div>
      </div>;})}</div>}</div>
    </div>

    {traceOpen&&<Panel title="Trazabilidad de metas" breadcrumb="Metas → Trazabilidad" onClose={()=>setTraceOpen(false)}><div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:"var(--eco-info-bg)",border:"1px solid #BFDBFE",borderRadius:"var(--eco-radius-md)",padding:14,animation:"ctUp .3s ease-out"}}><p style={{margin:"0 0 4px",fontFamily:fd,fontSize:13,fontWeight:700,color:"var(--eco-info)"}}>Fórmula de trazabilidad</p><p style={{margin:0,fontFamily:fb,fontSize:12,color:"var(--eco-gray-600)"}}>consumo × factor = CO₂e</p></div>{records.slice(0,20).map((r,i)=><div key={r.id||i} style={{border:"1px solid var(--eco-border)",borderRadius:"var(--eco-radius-md)",padding:"10px 12px",background:"white",transition:"all 150ms",animation:`ctUp .3s ease-out ${Math.min(i*30,300)}ms both`}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--eco-primary-300)";e.currentTarget.style.background="var(--eco-primary-50)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--eco-border)";e.currentTarget.style.background="white";}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:fb,fontSize:12,color:"var(--eco-gray-500)"}}>{r.dateISO} - {r.area}</span><span style={{fontFamily:fb,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:"var(--eco-radius-full)",background:r.status==="est"?"var(--eco-warning-bg)":"var(--eco-success-bg)",color:r.status==="est"?"var(--eco-secondary-600)":"var(--eco-success)",border:`1px solid ${r.status==="est"?"#FDE68A":"#BBF7D0"}`}}>{r.status==="est"?"Estimado":"Real"}</span></div><p style={{margin:"5px 0 0",fontFamily:fm,fontSize:12,color:"var(--eco-gray-700)"}}>{fmt(r.value,2)} {r.unit||"u"} × {fmt(r.factor,3)} = <strong style={{color:"var(--eco-primary-700)"}}>{fmt(r.co2e_t,4)} tCO₂e</strong></p></div>)}</div></Panel>}

    <Accions_Goals_Edits mode={tModal?"target":aModal?"action":""} editing={editing} onClose={()=>{setTModal(false);setAModal(false);}} onSubmit={tModal?saveTargetForm:saveActionForm} targetForm={tf} setTargetForm={setTf} actionForm={af} setActionForm={setAf} areas={areas} targets={targets} creatorName={creatorName}/>

    {detailTarget&&<MetaDetailModal target={detailTarget} records={records} actions={actions} onClose={()=>setDetailId("")} onEdit={()=>{setDetailId("");openTarget(detailTarget);}} onTogglePause={()=>sw(detailTarget)} onDelete={()=>{setDetailId("");del(detailTarget);}} onAddAction={()=>{setDetailId("");openAction(detailTarget.id);}}/>}
    <Toast toast={toast}/>
  </>;
}
