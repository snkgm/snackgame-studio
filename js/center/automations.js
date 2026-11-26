import {db} from "../app/db.js?v=20261127g";
import {store} from "../app/store.js?v=20261127g";
import {lightbox} from "../app/lightbox.js?v=20261127g";
import {I} from "../app/icons.js?v=20261127g";
import {esc,toast,modal} from "../app/ui.js?v=20261127g";
import {fmtById} from "../app/formats.js?v=20261127g";
import {STAGES} from "../studio/pipeline.js?v=20261127g";
import {schedBody,schedClick,schedChange} from "./schedUi.js?v=20261127g";
import {fmtMadrid,scheduleDates,parseList} from "../studio/schedule.js?v=20261127g";
const STG={pending:0,downloading:.15,removing_bg:.4,analyzing:.6,background:.7,composing:.82,saving:.95,scheduled:1,error:1,cancelled:1},STN={downloading:"descargando fotos",removing_bg:"quitando fondos",analyzing:"analizando colores",background:"generando fondo",composing:"componiendo",saving:"guardando"};
let drainBusy=false;
const IGD={mode:"prueba",loc:true,alt:"",collab:""};
const STALE=5*6e4;
const WORK=["downloading","removing_bg","analyzing","background","composing","saving"];
const CST={draft:"Borrador",running:"En marcha",paused:"Pausada",cancelled:"Cancelada",done:"Completada"};
const q=(t,s)=>db.list(t,s);
export function mountAutomations(root){
  root.innerHTML=`<div class="auto"><h1 class="auto__h">Automatizaciones</h1>
<div class="atool"><div><h2>Programación por lotes</h2><p class="hint">Pega una lista de productos y se generan y programan solas las publicaciones, aunque cierres el navegador.</p></div><a class="btn btn--accent" href="#/automatizaciones/nueva">Nueva lista</a></div>
<div id="list" class="clist"><p class="hint">Cargando…</p></div></div>`;
  let alive=true;
  const load=async()=>{
    try{
      const [cs,its]=await Promise.all([q("campaigns","select=*&order=created_at.desc"),q("campaign_items","select=campaign_id,status,scheduled_at")]);
      if(!alive)return;
      root.querySelector("#list").innerHTML=cs.map(c=>{const it=its.filter(i=>i.campaign_id===c.id),done=it.filter(i=>i.status==="scheduled").length,err=it.filter(i=>i.status==="error").length;
        return `<div class="ccardw"><a class="ccard" href="#/automatizaciones/${c.id}"><div><b>${esc(c.name)}</b><span class="hint">${CST[c.status]} · ${it.length} productos${err?` · <i class="over">${err} con error</i>`:""}</span></div><div class="bar-p"><i style="width:${it.length?Math.round(done/it.length*100):0}%"></i></div><em>${done}/${it.length}</em></a><button class="btn btn--ghost btn--icon" data-delc="${c.id}" aria-label="Eliminar lista" title="Eliminar lista">${I["trash-2"]}</button></div>`}).join("")||'<p class="hint">Aún no hay listas.</p>';
    }catch(e){if(alive)root.querySelector("#list").innerHTML=`<p class="hint">${esc(e.message)}</p>`}
  };
  root.addEventListener("click",e=>{const b=e.target.closest("[data-delc]");if(!b)return;const id=b.dataset.delc,n=b.closest(".ccardw").querySelector("b").textContent;
    modal("Eliminar lista",`<p>Se elimina «${esc(n)}» con todos sus productos y las publicaciones creadas desde ella. No se puede deshacer.</p>`,{ok:"Eliminar",onOk:async()=>{
      const its=await q("campaign_items",`select=id&campaign_id=eq.${id}`);
      if(its.length)await fetch(`${db.REST}posts?item_id=in.(${its.map(i=>i.id).join(",")})`,{method:"DELETE",headers:db.H});
      await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}`,{method:"DELETE",headers:db.H});
      await fetch(`${db.REST}campaigns?id=eq.${id}`,{method:"DELETE",headers:db.H});await load();toast("Lista eliminada")}})});
  load();const t=setInterval(load,5000);
  return ()=>{alive=false;clearInterval(t)};
}
export function mountCampaign(root,id){
  let alive=true,C=null,items=[],posts=[];
  root.innerHTML=`<div class="auto" id="p"><p class="hint">Cargando…</p></div>`;
  const P=root.querySelector("#p");
  async function load(){
    try{
      [C]=await q("campaigns",`select=*&id=eq.${id}`);
      items=await q("campaign_items",`select=*&campaign_id=eq.${id}&order=pos.asc`);
      const dead=items.filter(i=>WORK.includes(i.status)&&i.locked_at&&Date.now()-new Date(i.locked_at)>STALE&&C&&C.status==="running");
      if(dead.length){await Promise.all(dead.map(i=>db.update("campaign_items",i.id,i.attempts>=3?{status:"error",error:"Sin conexión: reintentos agotados",locked_by:null}:{status:"pending",locked_by:null})));items=await q("campaign_items",`select=*&campaign_id=eq.${id}&order=pos.asc`)}
      posts=await q("posts",`select=id,item_id,format,thumb_url,assets,caption,status,scheduled_at,error_msg&campaign_id=eq.${id}`);
      if(alive&&dragging===false)paint();
    }catch(e){if(alive)P.innerHTML=`<p class="hint">${esc(e.message)}</p>`}
  }
  const setC=async patch=>{await db.update("campaigns",id,patch);await load()};
  let dragging=false;
  function ics(){
    const fold=l=>{const o=[];while(l.length>73){o.push(l.slice(0,73));l=" "+l.slice(73)}o.push(l);return o.join("\r\n")},esc2=t=>String(t).replace(/[\\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n"),z=t=>new Date(t).toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
    const ev=items.filter(i=>i.status==="scheduled"&&i.scheduled_at&&new Date(i.scheduled_at)>Date.now()).map(i=>{const p=posts.find(x=>x.item_id===i.id),u=location.origin+location.pathname+(p?"#/editor/"+p.id:"#/automatizaciones/"+id);
      return ["BEGIN:VEVENT",`UID:${i.id}@snackgame-studio`,`DTSTAMP:${z(Date.now())}`,`DTSTART:${z(i.scheduled_at)}`,`DTEND:${z(new Date(i.scheduled_at).getTime()+15*6e4)}`,`SUMMARY:${esc2("Publicar: "+i.name)}`,`DESCRIPTION:${esc2("Revisa la publicación antes de que salga: "+u)}`,`URL:${u}`,"BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${esc2("Se publica en 5 min: "+i.name)}`,"TRIGGER:-PT5M","END:VALARM","END:VEVENT"].map(fold).join("\r\n")});
    if(!ev.length){toast("No hay publicaciones futuras que añadir");return}
    const t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SnackGame Studio//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${esc2(C.name)}`,...ev,"END:VCALENDAR"].join("\r\n")+"\r\n";
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/calendar;charset=utf-8"}));a.download=(C.name||"publicaciones").replace(/[^\w\-]+/g,"_")+".ics";document.body.appendChild(a);a.click();a.remove();toast(`${ev.length} eventos con aviso 5 min antes: ábrelo para añadirlos al calendario`)
  }
  async function reflow(list){
    const ds=C.schedule&&C.schedule.start?scheduleDates(C.schedule,list.length):[];
    await Promise.all(list.map(async(it,k)=>{const patch={};if(it.pos!==k+1)patch.pos=k+1;if(ds[k]&&it.scheduled_at!==ds[k])patch.scheduled_at=ds[k];if(!Object.keys(patch).length)return;
      await db.update("campaign_items",it.id,patch);
      if(patch.scheduled_at)await fetch(`${db.REST}posts?item_id=eq.${it.id}`,{method:"PATCH",headers:db.H,body:JSON.stringify({scheduled_at:patch.scheduled_at})})}));
  }
  async function move(from,to){
    if(from===to||to<0||to>=items.length)return;
    if(items.some(i=>WORK.includes(i.status))){toast("Espera a que termine el procesamiento para reordenar");return}
    const l=items.slice(),[x]=l.splice(from,1);l.splice(to,0,x);items=l;paint();
    await reflow(l);await load();toast("Orden actualizado")
  }
  const openIg=new Set(),igT={};
  const igOf=(ps,i)=>({...IGD,alt:i.name,...((ps[0]&&ps[0].assets&&ps[0].assets.ig)||{})});
  const igPanel=(i,ps)=>{
    if(!openIg.has(i.id))return "";
    if(!ps.length)return `<div class="ig"><p class="hint">Disponible cuando se generen las imágenes.</p></div>`;
    const g=igOf(ps,i),c=ps[0].caption||"",pub=ps.every(p=>p.status==="published");
    return `<div class="ig" data-igf="${i.id}"><div class="ig__w"><label>Descripción (con # y @)</label><textarea class="input area" data-k="caption" rows="6" maxlength="2200" placeholder="Escribe la descripción y los hashtags…"${pub?" disabled":""}>${esc(c)}</textarea><small class="hint" data-cnt>${c.length}/2200 · ${(c.match(/#[\p{L}\d_]+/gu)||[]).length}/5 hashtags</small></div>
<div class="ig__c"><label>Modo<select class="select" data-k="mode"${pub?" disabled":""}><option value="prueba"${g.mode!=="publicar"?" selected":""}>Prueba (valida, no publica)</option><option value="publicar"${g.mode==="publicar"?" selected":""}>Publicar en Instagram</option></select></label>
<label>Texto alternativo de las imágenes<input class="input" data-k="alt" value="${esc(g.alt)}"></label>
<label>Colaboradores (@usuario, separados por coma)<input class="input" data-k="collab" value="${esc(g.collab)}" placeholder="opcional"></label>
<label class="ig__k"><input type="checkbox" data-k="loc"${g.loc!==false?" checked":""}> Ubicación: Snackgame - Funko Store, Madrid</label>
<small class="hint">Cuenta @snackgame.es · ${ps.length} publicación${ps.length>1?"es":""}${pub?" · ya publicada":""}. En modo Publicar sale a su hora (≤5 min de margen).</small></div></div>`};
  const gOf=p=>(p.assets&&p.assets.ig)||{},mOf=p=>(p.assets&&p.assets.meta)||{};
  const psOf=i=>posts.filter(p=>p.item_id===i.id),isPub=ps=>ps.length>0&&ps.every(p=>p.status==="published");
  const whenOf=(i,ps)=>(ps[0]&&ps[0].scheduled_at)||i.scheduled_at;
  const pstate=(i,ps)=>{
    if(!ps.length)return null;if(isPub(ps))return["published","Publicada"];
    if(ps.some(p=>p.status==="error"))return["error","Error"];
    const m=mOf(ps[0]),t=new Date(whenOf(i,ps)).getTime(),now=Date.now();
    if(ps.some(p=>gOf(p).mode==="publicar")){
      if(m.publishing_at&&now-new Date(m.publishing_at)<6e5)return["publishing","Publicando"];
      if(t<=now)return now-t>18e5?["late","Retrasada"]:["publishing","Publicando"];
      return t-now<36e5?["next","Próxima a publicar"]:["queued","Programada"];
    }
    return m.test_ok?["tested","Prueba superada"]:["prepared","Preparada"];
  };
  const upcoming=()=>items.map(i=>({i,ps:psOf(i)})).filter(x=>x.ps.length&&!isPub(x.ps)).sort((a,b)=>new Date(whenOf(a.i,a.ps))-new Date(whenOf(b.i,b.ps)))[0]||null;
  const cdTxt=ms=>{if(ms<=0)return"Ahora";const s_=Math.floor(ms/1e3),d=Math.floor(s_/86400),h=Math.floor(s_%86400/3600),m=Math.floor(s_%3600/60),x=s_%60,z=n=>String(n).padStart(2,"0");return`${d}d ${z(h)}h ${z(m)}m ${z(x)}s`};
  const setAll=async mode=>{await Promise.all(posts.filter(p=>p.status!=="published").map(p=>{const it=items.find(x=>x.id===p.item_id)||{name:""};const patch={assets:{...p.assets,ig:{...igOf([p],it),mode}}};if(mode==="publicar"&&p.status==="review")patch.status="scheduled";Object.assign(p,patch);return db.update("posts",p.id,patch)}))};
  const swOn=()=>{const l=posts.filter(p=>p.status!=="published");return l.length>0&&l.every(p=>gOf(p).mode==="publicar")};
  function paint(){
    const ae=document.activeElement;if(ae&&ae.closest&&ae.closest(".ig"))return;
    if(!C){P.innerHTML='<p class="hint">Lista no encontrada.</p>';return}
    const now=Date.now(),beat=i=>i.locked_at?now-new Date(i.locked_at).getTime():0,quiet=i=>WORK.includes(i.status)&&beat(i)>9e4,nF=(C.formats||[]).length||1,n=C.images_per_post||1;
    const sch=items.filter(i=>i.status==="scheduled"),err=items.filter(i=>i.status==="error"),pend=items.filter(i=>i.status==="pending"),work=items.filter(i=>WORK.includes(i.status));
    const live=items.filter(i=>!["error","cancelled"].includes(i.status));
    const remaining=live.filter(i=>i.status!=="scheduled"||!i.scheduled_at||new Date(i.scheduled_at)>now).length;
    const next=sch.filter(i=>i.scheduled_at&&new Date(i.scheduled_at)>now).map(i=>i.scheduled_at).sort()[0];
    const pct=items.length?Math.round(items.reduce((t,i)=>t+(STG[i.status]??0),0)/items.length*100):0;
    const cur=work[0],avg=sch.length&&C.started_at?(now-new Date(C.started_at))/sch.length:0,eta=avg&&pend.length+work.length?Math.round(avg*(pend.length+work.length)/60000):0;
    const qline=work.length?`<p class="hint"><i class="spin"></i> Procesando <b>${esc(cur.name)}</b>: ${STN[cur.status]||cur.status}${work.length>1?` (+${work.length-1} en paralelo)`:""}${eta?` · tiempo restante estimado ~${eta} min`:""}</p>`:(pend.length&&["running"].includes(C.status)?`<p class="hint">⏳ En cola: esperando al trabajador de la nube. GitHub lo lanza de forma programada y puede tardar de 5 min a 1 h. Pulsa «Procesar ahora» para empezar ya desde este navegador.</p>`:"");
    const active=["running","done"].includes(C.status);
    const banner=remaining===0&&items.length&&active&&C.status!=="cancelled"?`<div class="banner banner--red"><b>LISTA AGOTADA</b><span>No quedan publicaciones por publicar. Añade más productos para continuar.</span></div>`:(C.status==="done"&&!err.length?`<div class="banner banner--ok"><b>COMPLETADA</b><span>Todas las publicaciones están programadas.</span><button class="btn btn--sm" data-a="ics">Añadir al calendario (aviso 5 min antes)</button></div>`:"");
    const errs=err.length?`<div class="banner banner--warn"><b>${err.length} incidencia${err.length>1?"s":""}</b><span>${[...new Set(err.map(e=>e.error||"Error"))].map(esc).join(" · ")}</span></div>`:"";
    const U=upcoming(),nT=items.filter(i=>i.status!=="cancelled").length,sts=items.map(i=>({i,st:i.status==="scheduled"?pstate(i,psOf(i)):null}));
    const btns=[U&&C.status!=="cancelled"?`<button class="btn btn--accent" data-a="pubnow" title="Publicar ahora la siguiente publicación">Publicar ahora</button>`:"",C.status!=="cancelled"?`<button class="btn" data-a="edit">Editar automatización</button>`:"",C.status==="draft"?`<button class="btn btn--accent" data-a="start">Iniciar</button>`:"",C.status==="running"?`<button class="btn" data-a="pause">Pausar</button>`:"",C.status==="running"&&(pend.length||work.length)?`<button class="btn btn--accent" data-a="now"${drainBusy?" disabled":""}>${drainBusy?"Procesando aquí…":"Procesar ahora"}</button>`:"",C.status==="paused"?`<button class="btn btn--accent" data-a="resume">Reanudar</button>`:"",err.length&&C.status!=="cancelled"?`<button class="btn" data-a="retry">Reintentar errores</button>`:"",sch.length?`<button class="btn" data-a="ics" title="Descarga un .ics con aviso 5 min antes de cada publicación">Añadir al calendario</button>`:"",C.status!=="cancelled"&&sch.length?`<button class="btn" data-a="regen">Regenerar imágenes</button>`:"",C.status!=="cancelled"?`<button class="btn" data-a="add">Añadir productos</button>`:"",!["cancelled","done"].includes(C.status)?`<button class="btn btn--ghost" data-a="cancel">Cancelar</button>`:""].join("");
    const nPub=sts.filter(x=>x.st&&x.st[0]==="published").length,nQ=sts.filter(x=>x.st&&["queued","next","publishing","late"].includes(x.st[0])).length,nPrep=sts.filter(x=>x.st&&["prepared","tested"].includes(x.st[0])).length,nErr=sts.filter(x=>(x.st&&x.st[0]==="error")||x.i.status==="error").length,nGen=pend.length+work.length;
    const w=n=>nT?(n/nT*100).toFixed(1)+"%":"0%",lastPub=posts.map(p=>mOf(p).published_at).filter(Boolean).sort().pop();
    const uWhen=U?whenOf(U.i,U.ps):null,uPub=U&&U.ps.some(p=>gOf(p).mode==="publicar");
    const sw=`<label class="sw${swOn()?" is-on":""}" title="Activa o desactiva la publicación automática de toda la lista"><input type="checkbox" data-a="swpub"${swOn()?" checked":""}><i></i><span>Publicar<small>${swOn()?"Activo":"Desactivado"}</small></span></label>`;
    const tile=(k,v,c="")=>`<div class="tile ${c}"><b>${v}</b><span>${k}</span></div>`;
    P.innerHTML=`<a class="btn btn--sm auto__back" href="#/automatizaciones">${I["arrow-left"]}<span>Automatizaciones</span></a>
<div class="phead"><div><h1 class="auto__h">${esc(C.name)}</h1><span class="cst cst--${C.status}">${CST[C.status]}</span> <span class="hint">${esc(store.typeName(C.type_id))} · ${esc(store.catName(C.category_id))} · ${(C.formats||[]).map(f=>fmtById(f).short).join(", ")} · ${n} img/publicación</span></div><div class="bar">${sw}${btns}</div></div>
${banner}${errs}
<div class="dash"><div class="cdc"><span class="cdc__l">Próxima publicación</span><b class="cdc__t" data-cd="${uWhen||""}">${uWhen?cdTxt(new Date(uWhen)-Date.now()):"—"}</b><span class="cdc__s">${U?`${esc(U.i.name)} · ${fmtMadrid(uWhen)}${uPub?"":" · <i class='over'>modo Prueba: no se publicará</i>"}`:"No quedan publicaciones por salir"}</span></div>
<div class="pbx"><div class="pbx__h"><b>Publicadas ${nPub}/${nT}</b><span>${lastPub?`Última: ${fmtMadrid(lastPub)}`:"Aún no se ha publicado ninguna"}</span></div>
<div class="seg-bar" title="Publicadas · Programadas · Preparadas · Generando · Errores"><i class="sb sb--pub" style="width:${w(nPub)}"></i><i class="sb sb--q" style="width:${w(nQ)}"></i><i class="sb sb--prep" style="width:${w(nPrep)}"></i><i class="sb sb--gen" style="width:${w(nGen)}"></i><i class="sb sb--err" style="width:${w(nErr)}"></i></div>
<div class="pbx__l"><span><i class="dot dot--pub"></i>Publicadas <b>${nPub}</b></span><span><i class="dot dot--q"></i>Programadas <b>${nQ}</b></span><span><i class="dot dot--prep"></i>Preparadas <b>${nPrep}</b></span>${nGen?`<span><i class="dot dot--gen"></i>Generando <b>${nGen}</b> (${pct}%)</span>`:""}${nErr?`<span><i class="dot dot--err"></i>Errores <b>${nErr}</b></span>`:""}</div></div></div>
<div class="tiles tiles--c">${tile("Productos",items.length)}${tile("Publicaciones",items.length*nF)}${tile("Imágenes",items.length*nF*n)}${tile("Generadas",sch.length*nF*n,"ok")}${tile("Pendientes",pend.length+work.length)}${tile("Errores",err.length,err.length?"bad":"")}${tile("Quedan",remaining,remaining?"":"bad")}</div>${qline}
<p class="hint">Inicio: ${fmtMadrid(C.started_at)} · Se procesa en la nube (GitHub Actions) y sigue aunque cierres el navegador; este panel se actualiza solo.</p>
<div class="irows">${items.map((i,k)=>{const ps=posts.filter(p=>p.item_id===i.id),w=(i.product&&i.product.warnings)||[],st=i.status==="scheduled"?pstate(i,ps):null,pe=ps.find(p=>p.status==="error"&&p.error_msg);
  return `<div class="irw"><div class="irow" data-row="${k}"><span class="irow__n" draggable="true" data-drag="${k}" title="Arrastra para reordenar">${k+1}</span><span class="irow__t" ${ps[0]?`data-z="${i.id}"`:""}>${ps[0]&&ps[0].thumb_url?`<img src="${esc(ps[0].thumb_url)}" alt="">`:""}</span><div class="irow__m" data-igt="${i.id}" title="Datos de publicación"><b>${openIg.has(i.id)?"▾":"▸"} ${esc(i.name)}${ps[0]&&ps[0].caption?"":""}</b><small>${esc(i.subtitle||"")}${w.length?` <i class="over">⚠ ${esc(w.join(" · "))}</i>`:""}${i.error?` <i class="over">${esc(i.error)}</i>`:""}${pe?` <i class="over">${esc(pe.error_msg)}</i>`:""}</small></div><span class="irow__d">${fmtMadrid(whenOf(i,ps))}</span><span class="stc stc--${st?st[0]:i.status}${WORK.includes(i.status)?(quiet(i)?" is-quiet":" is-work"):""}">${quiet(i)?`Reintentando en ${Math.max(1,Math.ceil((STALE-beat(i))/6e4))} min`:(st?st[1]:(STAGES[i.status]||i.status))}${i.attempts>1&&i.status!=="scheduled"?` (${i.attempts})`:""}</span><span class="irow__a"><button class="btn btn--sm" data-mv="${k}:-1" title="Subir"${k?"":" disabled"}>↑</button><button class="btn btn--sm" data-mv="${k}:1" title="Bajar"${k<items.length-1?"":" disabled"}>↓</button><span class="irow__s">${i.status==="error"&&C.status!=="cancelled"?`<button class="btn btn--sm" data-r="${i.id}">Reintentar</button>`:ps[0]?`<a class="btn btn--sm" href="#/editor/${ps[0].id}">Abrir en editor</a>`:""}</span><span class="irow__s">${WORK.includes(i.status)?"":`<button class="btn btn--sm btn--danger" data-del="${i.id}" title="Eliminar este producto de la lista">Eliminar</button>`}</span></span></div>${igPanel(i,ps)}</div>`}).join("")}</div>`;
  }
  P.addEventListener("click",async e=>{
    const tg=e.target.closest("[data-igt]");if(tg){const k=tg.dataset.igt;openIg.has(k)?openIg.delete(k):openIg.add(k);paint();return}
    const z=e.target.closest("[data-z]");
    if(z){const ps=posts.filter(p=>p.item_id===z.dataset.z),it=items.find(i=>i.id===z.dataset.z);lightbox(ps.flatMap(p=>(p.assets&&p.assets.finals)||[p.thumb_url]).filter(Boolean),it&&it.name);return}
    const b=e.target.closest("button");if(!b)return;
    try{
      if(b.dataset.mv){const [k,d]=b.dataset.mv.split(":").map(Number);await move(k,k+d);return}
      if(b.dataset.del){const it=items.find(x=>x.id===b.dataset.del),np=posts.filter(p=>p.item_id===b.dataset.del).length;
        modal("Eliminar producto",`<p>Se quita «${esc(it?it.name:"")}» de la lista${np?` y se borran sus ${np} publicación${np>1?"es":""} programada${np>1?"s":""}`:""}. No se puede deshacer.</p>`,{ok:"Eliminar",onOk:async()=>{
          if(np)await fetch(`${db.REST}posts?item_id=eq.${b.dataset.del}`,{method:"DELETE",headers:db.H});
          await fetch(`${db.REST}campaign_items?id=eq.${b.dataset.del}`,{method:"DELETE",headers:db.H});items=items.filter(x=>x.id!==b.dataset.del);await reflow(items);await load();toast("Producto eliminado")}});return}
      if(b.dataset.r){await db.update("campaign_items",b.dataset.r,{status:"pending",attempts:0,error:null,locked_by:null});await setC({status:"running"});toast("Reintento en cola")}
      else if(b.dataset.a==="start"){await setC({status:"running",started_at:new Date().toISOString()});toast("Iniciada")}
      else if(b.dataset.a==="now"){if(drainBusy)return;drainBusy=true;paint();toast("Procesando en este navegador: mantén esta pestaña abierta…");
        try{await import("../studio/worker.js?v=20261127g");const log=await window.__drain("web-"+Date.now(),40*60e3);const bad=log.filter(x=>x[1]!=="ok").length;toast(`Terminado: ${log.length-bad} correctas${bad?`, ${bad} con error`:""}`)}catch(er){toast(er.message||String(er),{kind:"err"})}finally{drainBusy=false;await load()}}
      else if(b.dataset.a==="pause")await setC({status:"paused"});
      else if(b.dataset.a==="resume")await setC({status:"running"});
      else if(b.dataset.a==="retry"){await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}&status=eq.error`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"pending",attempts:0,error:null,locked_by:null})});await setC({status:"running"});toast("Errores en cola")}
      else if(b.dataset.a==="cancel"){modal("Cancelar lista","<p>Se detiene el procesamiento. Las publicaciones ya creadas y la lista original se conservan.</p>",{ok:"Cancelar lista",onOk:async()=>{await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}&status=eq.pending`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"cancelled"})});await setC({status:"cancelled"})}})}
      else if(b.dataset.a==="regen"){modal("Regenerar imágenes","<p>Se vuelven a generar todas las imágenes de la lista con el diseño actual. Las fechas se mantienen y las publicaciones anteriores se sustituyen.</p>",{ok:"Regenerar",onOk:async()=>{await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}&status=in.(scheduled,error)`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"pending",attempts:0,error:null,locked_by:null,photos:null})});await setC({status:"running"});toast("En cola")}})}
      else if(b.dataset.a==="ics")ics();
      else if(b.dataset.a==="pubnow")pubNow();
      else if(b.dataset.a==="edit")editCamp();
      else if(b.dataset.a==="add")location.hash=`#/automatizaciones/nueva/${id}`;
    }catch(er){toast(er.message,{kind:"err"})}
  });
  const igSave=async f=>{
    const id_=f.dataset.igf,ps=posts.filter(p=>p.item_id===id_);if(!ps.length)return;
    const v=k=>f.querySelector(`[data-k=${k}]`),it=items.find(x=>x.id===id_);
    const ig={mode:v("mode").value,alt:v("alt").value.trim(),collab:v("collab").value.trim(),loc:v("loc").checked},caption=v("caption").value;
    try{await Promise.all(ps.map(p=>{const patch={caption,assets:{...p.assets,ig}};
      if(ig.mode==="publicar"&&p.status==="review")patch.status="scheduled";
      Object.assign(p,patch);return db.update("posts",p.id,patch)}));}catch(er){toast(er.message,{kind:"err"})}
  };
  P.addEventListener("change",async e=>{const t=e.target;if(!t.dataset||t.dataset.a!=="swpub")return;
    const on=t.checked,miss=posts.filter(p=>p.status!=="published"&&!(p.caption||"").trim()).length;
    const go=async()=>{try{await setAll(on?"publicar":"prueba");toast(on?"Publicación automática activada":"Publicación automática desactivada")}catch(er){toast(er.message,{kind:"err"})}paint()};
    if(on&&miss){t.checked=false;modal("Activar publicación",`<p>${miss} publicación${miss>1?"es":""} sin descripción darán error al llegar su hora. ¿Activar igualmente?</p>`,{ok:"Activar",onOk:go});return}
    if(on&&!posts.length){t.checked=false;toast("Aún no hay publicaciones generadas",{kind:"err"});return}
    await go()});
  function pubNow(){
    const U=upcoming();if(!U)return toast("No hay publicaciones pendientes");
    if(U.ps.some(p=>!(p.caption||"").trim())){openIg.add(U.i.id);paint();toast("Escribe primero la descripción de «"+U.i.name+"»",{kind:"err"});return}
    modal("Publicar ahora",`<p>Se publicará «${esc(U.i.name)}» en @snackgame.es en los próximos minutos (hasta 5 min). No se puede deshacer desde aquí.</p>`,{ok:"Publicar ahora",onOk:async()=>{
      const now=new Date().toISOString();
      await Promise.all(U.ps.map(p=>{const patch={scheduled_at:now,status:"scheduled",assets:{...p.assets,ig:{...igOf([p],U.i),mode:"publicar"},meta:{...mOf(p),ig_tries:0,test_ok:false}}};Object.assign(p,patch);return db.update("posts",p.id,patch)}));
      toast("En cola: se publica en unos minutos");paint()}});
  }
  function editCamp(){
    const td=new Date().toLocaleDateString("sv",{timeZone:"Europe/Madrid"}),c=C.schedule||{};
    const S={mode:c.mode||"weekdays",days:c.days||[0,2,4],every:c.every||1,hours:c.hours||6,time:c.time||"18:00",start:c.start&&c.start>td?c.start:td};
    const m=modal("Editar automatización",`<div class="field"><label for="en">Nombre</label><input class="input" id="en" value="${esc(C.name)}"></div>
<h3 class="mh">Frecuencia y horario</h3><p class="hint">Se reprograman las publicaciones sin publicar a partir del primer día indicado.</p><div id="sx" class="sx">${schedBody(S)}</div>
<h3 class="mh">Valores de publicación (todas las sin publicar)</h3>
<div class="row2"><div class="field"><label for="em">Modo</label><select class="select" id="em"><option value="">No cambiar</option><option value="prueba">Prueba</option><option value="publicar">Publicar en Instagram</option></select></div><div class="field"><label for="el">Ubicación</label><select class="select" id="el"><option value="">No cambiar</option><option value="1">Con ubicación de la tienda</option><option value="0">Sin ubicación</option></select></div></div>
<div class="field"><label for="ec">Colaboradores (@usuario, coma). Vacío = no cambiar</label><input class="input" id="ec" placeholder="opcional"></div>`,{ok:"Guardar cambios",wide:true,onOk:async f=>{
      const name=f.querySelector("#en").value.trim()||C.name,sched={...C.schedule,...S,tz:"Europe/Madrid"};
      const unpub=items.filter(i=>!isPub(psOf(i))),ds=scheduleDates(sched,unpub.length);
      await db.update("campaigns",id,{name,schedule:sched});C={...C,name,schedule:sched};
      await Promise.all(unpub.map(async(it,k)=>{if(!ds[k])return;await db.update("campaign_items",it.id,{scheduled_at:ds[k]});await fetch(`${db.REST}posts?item_id=eq.${it.id}&status=neq.published`,{method:"PATCH",headers:db.H,body:JSON.stringify({scheduled_at:ds[k]})})}));
      const mode=f.querySelector("#em").value,loc=f.querySelector("#el").value,col=f.querySelector("#ec").value.trim();
      if(mode||loc||col)await Promise.all(posts.filter(p=>p.status!=="published").map(p=>{const it=items.find(x=>x.id===p.item_id)||{name:""},g={...igOf([p],it)};if(mode)g.mode=mode;if(loc)g.loc=loc==="1";if(col)g.collab=col;
        const patch={assets:{...p.assets,ig:g}};if(g.mode==="publicar"&&p.status==="review")patch.status="scheduled";return db.update("posts",p.id,patch)}));
      await load();toast("Automatización actualizada")}});
    const me=m.el,re=()=>{me.querySelector("#sx").innerHTML=schedBody(S)};
    me.addEventListener("click",e=>{const t=e.target.closest("button");if(t&&schedClick(S,t))re()});
    me.addEventListener("change",e=>{if(schedChange(S,e.target))re()});
  }
  P.addEventListener("input",e=>{const f=e.target.closest("[data-igf]");if(!f)return;
    const t=f.querySelector("[data-k=caption]"),c=f.querySelector("[data-cnt]");if(c){const h=(t.value.match(/#[\p{L}\d_]+/gu)||[]).length;c.textContent=`${t.value.length}/2200 · ${h}/5 hashtags${h>5?" · máximo 5":""}`;c.style.color=h>5?"var(--c-danger,#f87171)":""}
    clearTimeout(igT[f.dataset.igf]);igT[f.dataset.igf]=setTimeout(()=>igSave(f),700)});
  P.addEventListener("change",e=>{const f=e.target.closest("[data-igf]");if(!f)return;clearTimeout(igT[f.dataset.igf]);igSave(f).then(()=>toast("Guardado"))});
  P.addEventListener("dragstart",e=>{const h=e.target.closest&&e.target.closest("[data-drag]");if(!h)return;dragging=h.dataset.drag;try{e.dataTransfer.setData("text/plain","x");e.dataTransfer.effectAllowed="move"}catch{}});
  P.addEventListener("dragover",e=>{if(dragging===false)return;const r=e.target.closest(".irow");if(r){e.preventDefault();P.querySelectorAll(".irow.is-over").forEach(x=>x.classList.remove("is-over"));r.classList.add("is-over")}});
  P.addEventListener("drop",e=>{const r=e.target.closest(".irow");if(dragging===false||!r)return;e.preventDefault();const from=+dragging,to=+r.dataset.row;dragging=false;move(from,to)});
  P.addEventListener("dragend",()=>{dragging=false;P.querySelectorAll(".is-over").forEach(x=>x.classList.remove("is-over"))});
  function addMore(){
    modal("Añadir productos",`<p class="hint">Una línea por producto: nombre, URL de snackgame.es y subtítulo opcional. Se programan a continuación de la última fecha.</p><textarea class="input area" id="am" spellcheck="false"></textarea>`,{ok:"Añadir",onOk:async f=>{
      const rows=parseList(f.querySelector("#am").value);if(!rows.length)throw new Error("Pega al menos un producto");
      const sc=C.schedule,ds=scheduleDates(sc,rows.length,items.length);
      await db.bulk("campaign_items",rows.map((r,i)=>({campaign_id:id,pos:items.length+i+1,name:r.name||"Sin nombre",url:r.url,subtitle:r.subtitle,scheduled_at:ds[i]||null})));
      await setC({status:C.status==="draft"?"draft":"running"});toast(`${rows.length} añadidos`);
    }});
  }
  const off=store.on(()=>{if(C)paint()});if(!store.loaded)store.load();
  load();const t=setInterval(load,4000);
  const tk=setInterval(()=>{const el=P.querySelector("[data-cd]");if(el&&el.dataset.cd)el.textContent=cdTxt(new Date(el.dataset.cd)-Date.now())},1000);
  return ()=>{alive=false;clearInterval(t);clearInterval(tk);off()};
}
