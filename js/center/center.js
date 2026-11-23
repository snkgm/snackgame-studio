import {openBatch} from "./batch.js?v=20261123k";
import {store} from "../app/store.js?v=20261123k";
import {I} from "../app/icons.js?v=20261123k";
import {esc,STATUS,STATUS_KEYS,toast,openMenu,modal,thumbHtml} from "../app/ui.js?v=20261123k";
import {MONTHS,DOW,monthGrid,weekDays,same,ymd,time,longDate,toInput,fromInput,moveToDay,addDays,startOfWeek} from "../app/dates.js?v=20261123k";
import {openWizard} from "./wizard.js?v=20261123k";
const LS="sg.center";
const load=()=>{try{return JSON.parse(localStorage.getItem(LS))||{}}catch{return{}}};
const save=s=>{try{localStorage.setItem(LS,JSON.stringify(s))}catch{}};
export function mountCenter(root){
  const saved=load();
  const S={view:saved.view||"month",cur:new Date(),f:{status:"",type:"",cat:"",q:""},...{}};
  S.cur.setHours(12,0,0,0);
  const visible=()=>store.posts.filter(p=>{
    const f=S.f;
    if(f.status&&p.status!==f.status)return false;
    if(f.type&&p.type_id!==f.type)return false;
    if(f.cat&&p.category_id!==f.cat)return false;
    if(f.q&&!p.title.toLowerCase().includes(f.q.toLowerCase()))return false;
    return true;
  });
  const byDay=list=>{const m={};list.filter(p=>p.scheduled_at).forEach(p=>(m[ymd(new Date(p.scheduled_at))]??=[]).push(p));Object.values(m).forEach(a=>a.sort((x,y)=>x.scheduled_at.localeCompare(y.scheduled_at)));return m};
  const count=s=>store.posts.filter(p=>p.status===s).length;
  const title=()=>{
    if(S.view==="week"){const d=weekDays(S.cur);const a=d[0],b=d[6];return `${a.getDate()}${a.getMonth()!==b.getMonth()?" "+MONTHS[a.getMonth()].slice(0,3):""} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0,3)} ${b.getFullYear()}`}
    return `${MONTHS[S.cur.getMonth()]} ${S.cur.getFullYear()}`;
  };
  const chip=p=>`<div class="chip" draggable="true" data-id="${p.id}" data-s="${p.status}" title="${esc(p.title)} · ${STATUS[p.status].label}"><span class="chip__thumb">${thumbHtml(p)}</span><span class="dot" data-s="${p.status}"></span>${p.scheduled_at?`<span class="chip__time">${time(p.scheduled_at)}</span>`:""}<span class="chip__title">${esc(p.title)}</span><button class="chip__more" data-more aria-label="Acciones">${I.ellipsis}</button></div>`;
  const monthHtml=list=>{
    const days=monthGrid(S.cur),map=byDay(list),today=new Date();
    return `<div class="mgrid">${DOW.map(d=>`<div class="mgrid__dow">${d}</div>`).join("")}${days.map(d=>{
      const k=ymd(d),ps=map[k]||[],out=d.getMonth()!==S.cur.getMonth();
      return `<div class="day${out?" is-out":""}${same(d,today)?" is-today":""}" data-day="${k}"><div class="day__head"><span class="day__n">${d.getDate()}</span><button class="day__add" data-add aria-label="Nueva publicación">${I.plus}</button></div><div class="day__list">${ps.slice(0,3).map(chip).join("")}${ps.length>3?`<button class="day__more" data-open-day="${k}">+${ps.length-3} más</button>`:""}</div></div>`}).join("")}</div>`;
  };
  const weekHtml=list=>{
    const days=weekDays(S.cur),map=byDay(list),today=new Date();
    return `<div class="wgrid">${days.map((d,i)=>{const k=ymd(d),ps=map[k]||[];
      return `<div class="wday${same(d,today)?" is-today":""}" data-day="${k}"><div class="wday__head"><span>${DOW[i]} <b>${d.getDate()}</b></span><span class="badge">${ps.length?ps.length+(ps.length>1?" publicaciones":" publicación"):""}</span><button class="day__add" data-add aria-label="Nueva publicación">${I.plus}</button></div><div class="wday__list">${ps.map(p=>`<div class="wcard" draggable="true" data-id="${p.id}"><div class="wcard__img">${thumbHtml(p)}</div><div class="wcard__body"><div class="wcard__title">${esc(p.title)}</div><div class="wcard__meta"><span class="badge"><span class="dot" data-s="${p.status}"></span>${STATUS[p.status].label}</span><span class="badge">${time(p.scheduled_at)}</span></div></div><button class="chip__more" data-more aria-label="Acciones">${I.ellipsis}</button></div>`).join("")}</div></div>`}).join("")}</div>`;
  };
  const listHtml=list=>{
    const rows=[...list].sort((a,b)=>(a.scheduled_at||"9").localeCompare(b.scheduled_at||"9"));
    if(!rows.length)return `<div class="empty">Sin publicaciones con estos filtros.</div>`;
    return `<div class="lrows"><div class="lrow lrow--head"><span></span><span>Título</span><span>Tipo · categoría</span><span>Fecha y hora</span><span>Estado</span><span></span></div>${rows.map(p=>`<div class="lrow" data-id="${p.id}"><span class="lrow__thumb">${thumbHtml(p)}</span><span class="lrow__title">${esc(p.title)}</span><span class="lrow__meta">${esc([store.typeName(p.type_id),store.catName(p.category_id)].filter(Boolean).join(" · "))||"—"}</span><span class="lrow__date">${p.scheduled_at?longDate(p.scheduled_at)+" · "+time(p.scheduled_at):"Sin fecha"}</span><span class="badge"><span class="dot" data-s="${p.status}"></span>${STATUS[p.status].label}</span><button class="btn btn--ghost btn--icon btn--sm" data-more aria-label="Acciones">${I.ellipsis}</button></div>`).join("")}</div>`;
  };
  function render(){
    if(!store.loaded){root.innerHTML=store.error?`<div class="empty">No se pudo conectar con Supabase: ${esc(store.error)}<br><br><button class="btn" id="retry">Reintentar</button></div>`:`<div class="empty">Cargando…</div>`;root.querySelector("#retry")?.addEventListener("click",()=>{store.error=null;render();store.load()});return}
    const list=visible(),undated=list.filter(p=>!p.scheduled_at);
    const errs=count("error");
    root.innerHTML=`<div class="center">
<div class="ctools">
 <div class="ctools__nav">${S.view!=="list"?`<button class="btn btn--icon" data-nav="-1" aria-label="Anterior">${I["chevron-left"]}</button><button class="btn" data-nav="0">Hoy</button><button class="btn btn--icon" data-nav="1" aria-label="Siguiente">${I["chevron-right"]}</button>`:""}<h1 class="ctools__title">${S.view==="list"?"Todas las publicaciones":title()}</h1></div>
 <div class="seg" role="tablist">${[["month","Mes","calendar"],["week","Semana","calendar-days"],["list","Lista","list"]].map(([v,l])=>`<button data-view="${v}" class="${S.view===v?"is-on":""}">${l}</button>`).join("")}</div>
 <span class="grow"></span>
 <button class="btn" data-batch>${I["calendar-clock"]}Programar en lote</button>
 <button class="btn btn--accent" data-new>${I.plus}Nueva publicación</button>
</div>
<div class="cbar">
 <div class="sum">${[["scheduled","Programadas"],["draft","Borradores"],["review","Pendientes"],["published","Publicadas"]].map(([s,l])=>`<button class="sum__i${S.f.status===s?" is-on":""}" data-sum="${s}"><span class="dot" data-s="${s}"></span><b>${count(s)}</b>${l}</button>`).join("")}${errs?`<button class="sum__i sum__i--err${S.f.status==="error"?" is-on":""}" data-sum="error"><span class="dot" data-s="error"></span><b>${errs}</b>Con error</button>`:""}</div>
 <span class="grow"></span>
 <div class="filters">
  <div class="search">${I.search}<input class="input" id="f-q" placeholder="Buscar" value="${esc(S.f.q)}"></div>
  <select class="select" id="f-status"><option value="">Todos los estados</option>${STATUS_KEYS.map(s=>`<option value="${s}"${S.f.status===s?" selected":""}>${STATUS[s].label}</option>`).join("")}</select>
  <select class="select" id="f-type"><option value="">Todos los tipos</option>${store.types.map(t=>`<option value="${t.id}"${S.f.type===t.id?" selected":""}>${esc(t.name)}</option>`).join("")}</select>
  <select class="select" id="f-cat"><option value="">Todas las categorías</option>${store.cats.map(t=>`<option value="${t.id}"${S.f.cat===t.id?" selected":""}>${esc(t.name)}</option>`).join("")}</select>
  ${S.f.status||S.f.type||S.f.cat||S.f.q?`<button class="btn btn--icon" data-clear aria-label="Quitar filtros" title="Quitar filtros">${I["filter-x"]}</button>`:""}
 </div>
</div>
${S.view!=="list"&&undated.length?`<div class="tray"><span class="label">Sin fecha</span>${undated.map(chip).join("")}</div>`:""}
<div class="cbody">${S.view==="month"?monthHtml(list):S.view==="week"?weekHtml(list):listHtml(list)}</div>
</div>`;
  }
  function actions(p,at){
    const items=[{label:"Editar",icon:"pencil",run:()=>location.hash=`#/editor/${p.id}`},{label:"Duplicar",icon:"copy",run:async()=>{try{await store.duplicate(p.id);toast("Publicación duplicada")}catch(e){toast(e.message,{kind:"err"})}}},{label:"Fecha y hora…",icon:"calendar-clock",run:()=>schedule(p)},"-"];
    STATUS_KEYS.filter(s=>s!==p.status).forEach(s=>items.push({label:"Marcar como "+STATUS[s].label.toLowerCase(),dot:s,run:()=>setStatus(p,s)}));
    items.push("-",{label:"Eliminar",icon:"trash-2",danger:true,run:()=>store.remove(p.id)});
    openMenu(at.anchor,items,at.xy);
  }
  async function setStatus(p,s){
    if(s==="scheduled"&&!p.scheduled_at)return schedule(p,"scheduled");
    try{await store.patchPost(p.id,{status:s})}catch(e){toast(e.message,{kind:"err"})}
  }
  function schedule(p,toStatus){
    modal("Fecha y hora",`<div class="field"><label for="m-dt">Programar para</label><input class="input" type="datetime-local" id="m-dt" value="${toInput(p.scheduled_at)}"></div><p class="hint">La programación es interna: no publica en Instagram.</p>`,{ok:toStatus?"Programar":"Guardar",onOk:async f=>{
      const iso=fromInput(f.querySelector("#m-dt").value);
      if(toStatus&&!iso)throw new Error("Elige fecha y hora");
      const patch={scheduled_at:iso};
      if(toStatus)patch.status=toStatus;
      else if(!iso&&p.status==="scheduled")patch.status="draft";
      await store.patchPost(p.id,patch);
    }});
  }
  function create(dayKey){openWizard(dayKey)}
  let drag=null;
  root.addEventListener("click",e=>{
    const t=e.target;
    const more=t.closest("[data-more]");
    if(more){e.stopPropagation();const el=more.closest("[data-id]");actions(store.post(el.dataset.id),{anchor:more});return}
    if(t.closest("[data-add]")){create(t.closest("[data-day]").dataset.day);return}
    const od=t.closest("[data-open-day]");if(od){const d=new Date(od.dataset.openDay+"T12:00");S.cur=d;S.view="week";save({view:S.view});render();return}
    const nav=t.closest("[data-nav]");if(nav){const n=+nav.dataset.nav;if(!n)S.cur=new Date(),S.cur.setHours(12);else if(S.view==="month")S.cur=new Date(S.cur.getFullYear(),S.cur.getMonth()+n,1,12);else S.cur=addDays(S.cur,7*n);render();return}
    const v=t.closest("[data-view]");if(v){S.view=v.dataset.view;save({view:S.view});render();return}
    const sm=t.closest("[data-sum]");if(sm){S.f.status=S.f.status===sm.dataset.sum?"":sm.dataset.sum;render();return}
    if(t.closest("[data-batch]")){openBatch();return}
    if(t.closest("[data-new]")){create();return}
    if(t.closest("[data-clear]")){S.f={status:"",type:"",cat:"",q:""};render();return}
    const open=t.closest(".chip,.wcard,.lrow:not(.lrow--head)");if(open)location.hash=`#/editor/${open.dataset.id}`;
  });
  root.addEventListener("dblclick",e=>{const d=e.target.closest(".day,.wday");if(d&&!e.target.closest("[data-id]"))create(d.dataset.day)});
  root.addEventListener("contextmenu",e=>{const el=e.target.closest("[data-id]");if(el){e.preventDefault();actions(store.post(el.dataset.id),{xy:{x:e.clientX,y:e.clientY}})}});
  root.addEventListener("input",e=>{if(e.target.id==="f-q"){S.f.q=e.target.value;clearTimeout(S.qt);S.qt=setTimeout(()=>{render();const i=root.querySelector("#f-q");i.focus();i.setSelectionRange(i.value.length,i.value.length)},200)}});
  root.addEventListener("change",e=>{const m={"f-status":"status","f-type":"type","f-cat":"cat"}[e.target.id];if(m){S.f[m]=e.target.value;render()}});
  root.addEventListener("dragstart",e=>{const el=e.target.closest("[data-id]");if(!el)return;drag=el.dataset.id;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",drag);el.classList.add("is-drag")});
  root.addEventListener("dragend",()=>{drag=null;root.querySelectorAll(".is-drag,.is-over").forEach(n=>n.classList.remove("is-drag","is-over"))});
  root.addEventListener("dragover",e=>{const d=e.target.closest("[data-day]");if(!d||!drag)return;e.preventDefault();root.querySelectorAll(".is-over").forEach(n=>n!==d&&n.classList.remove("is-over"));d.classList.add("is-over")});
  root.addEventListener("drop",async e=>{
    const d=e.target.closest("[data-day]");if(!d||!drag)return;e.preventDefault();
    const p=store.post(drag);drag=null;if(!p)return;
    if(p.status==="published"){toast("Una publicación ya publicada no se puede mover");render();return}
    try{await store.patchPost(p.id,{scheduled_at:moveToDay(p.scheduled_at,new Date(d.dataset.day+"T12:00"))})}catch(err){toast(err.message,{kind:"err"})}
  });
  const off=store.on(render);render();
  if(!store.loaded&&!store.error)store.load();
  return()=>off();
}
