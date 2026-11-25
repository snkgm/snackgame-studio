import {db} from "../app/db.js?v=20261125n";
import {store} from "../app/store.js?v=20261125n";
import {lightbox} from "../app/lightbox.js?v=20261125n";
import {I} from "../app/icons.js?v=20261125n";
import {esc,toast,modal} from "../app/ui.js?v=20261125n";
import {fmtById} from "../app/formats.js?v=20261125n";
import {STAGES} from "../studio/pipeline.js?v=20261125n";
import {fmtMadrid,scheduleDates,parseList} from "../studio/schedule.js?v=20261125n";
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
      posts=await q("posts",`select=id,item_id,format,thumb_url,assets&campaign_id=eq.${id}`);
      if(alive)paint();
    }catch(e){if(alive)P.innerHTML=`<p class="hint">${esc(e.message)}</p>`}
  }
  const setC=async patch=>{await db.update("campaigns",id,patch);await load()};
  function paint(){
    if(!C){P.innerHTML='<p class="hint">Lista no encontrada.</p>';return}
    const now=Date.now(),nF=(C.formats||[]).length||1,n=C.images_per_post||1;
    const sch=items.filter(i=>i.status==="scheduled"),err=items.filter(i=>i.status==="error"),pend=items.filter(i=>i.status==="pending"),work=items.filter(i=>WORK.includes(i.status));
    const live=items.filter(i=>!["error","cancelled"].includes(i.status));
    const remaining=live.filter(i=>i.status!=="scheduled"||!i.scheduled_at||new Date(i.scheduled_at)>now).length;
    const next=sch.filter(i=>i.scheduled_at&&new Date(i.scheduled_at)>now).map(i=>i.scheduled_at).sort()[0];
    const pct=items.length?Math.round((sch.length+err.length)/items.length*100):0;
    const active=["running","done"].includes(C.status);
    const banner=remaining===0&&items.length&&active&&C.status!=="cancelled"?`<div class="banner banner--red"><b>LISTA AGOTADA</b><span>No quedan publicaciones por publicar. Añade más productos para continuar.</span></div>`:(C.status==="done"&&!err.length?`<div class="banner banner--ok"><b>COMPLETADA</b><span>Todas las publicaciones están programadas.</span></div>`:"");
    const errs=err.length?`<div class="banner banner--warn"><b>${err.length} incidencia${err.length>1?"s":""}</b><span>${[...new Set(err.map(e=>e.error||"Error"))].map(esc).join(" · ")}</span></div>`:"";
    const btns=[C.status==="draft"?`<button class="btn btn--accent" data-a="start">Iniciar</button>`:"",C.status==="running"?`<button class="btn" data-a="pause">Pausar</button>`:"",C.status==="paused"?`<button class="btn btn--accent" data-a="resume">Reanudar</button>`:"",err.length&&C.status!=="cancelled"?`<button class="btn" data-a="retry">Reintentar errores</button>`:"",C.status!=="cancelled"&&sch.length?`<button class="btn" data-a="regen">Regenerar imágenes</button>`:"",C.status!=="cancelled"?`<button class="btn" data-a="add">Añadir productos</button>`:"",!["cancelled","done"].includes(C.status)?`<button class="btn btn--ghost" data-a="cancel">Cancelar</button>`:""].join("");
    const tile=(k,v,c="")=>`<div class="tile ${c}"><b>${v}</b><span>${k}</span></div>`;
    P.innerHTML=`<a class="btn btn--sm auto__back" href="#/automatizaciones">${I["arrow-left"]}<span>Automatizaciones</span></a>
<div class="phead"><div><h1 class="auto__h">${esc(C.name)}</h1><span class="cst cst--${C.status}">${CST[C.status]}</span> <span class="hint">${esc(store.typeName(C.type_id))} · ${esc(store.catName(C.category_id))} · ${(C.formats||[]).map(f=>fmtById(f).short).join(", ")} · ${n} img/publicación</span></div><div class="bar">${btns}</div></div>
${banner}${errs}
<div class="tiles">${tile("Productos",items.length)}${tile("Publicaciones",items.length*nF)}${tile("Imágenes",items.length*nF*n)}${tile("Generadas",sch.length*nF*n,"ok")}${tile("Pendientes",pend.length+work.length)}${tile("Errores",err.length,err.length?"bad":"")}${tile("Quedan",remaining,remaining?"":"bad")}${tile("Próxima",next?fmtMadrid(next):"—","wide")}</div>
<div class="prog"><div class="bar-p bar-p--lg"><i style="width:${pct}%"></i></div><span>${pct}% · ${sch.length}/${items.length} programadas</span></div>
<p class="hint">Inicio: ${fmtMadrid(C.started_at)} · Se procesa en la nube (GitHub Actions) y sigue aunque cierres el navegador; este panel se actualiza solo.</p>
<div class="irows">${items.map(i=>{const ps=posts.filter(p=>p.item_id===i.id),w=(i.product&&i.product.warnings)||[];
  return `<div class="irow"><span class="irow__n">${i.pos}</span><span class="irow__t" ${ps[0]?`data-z="${i.id}"`:""}>${ps[0]&&ps[0].thumb_url?`<img src="${esc(ps[0].thumb_url)}" alt="">`:""}</span><div class="irow__m"><b>${esc(i.name)}</b><small>${esc(i.subtitle||"")}${w.length?` <i class="over">⚠ ${esc(w.join(" · "))}</i>`:""}${i.error?` <i class="over">${esc(i.error)}</i>`:""}</small></div><span class="irow__d">${fmtMadrid(i.scheduled_at)}</span><span class="stc stc--${i.status}${WORK.includes(i.status)?" is-work":""}">${STAGES[i.status]||i.status}${i.attempts>1&&i.status!=="scheduled"?` (${i.attempts})`:""}</span><span class="irow__a">${ps[0]?`<a class="btn btn--sm" href="#/editor/${ps[0].id}">Abrir en editor</a>`:""}${i.status==="error"&&C.status!=="cancelled"?`<button class="btn btn--sm" data-r="${i.id}">Reintentar</button>`:""}${WORK.includes(i.status)?"":`<button class="btn btn--sm btn--danger" data-del="${i.id}" title="Eliminar este producto de la lista">Eliminar</button>`}</span></div>`}).join("")}</div>`;
  }
  P.addEventListener("click",async e=>{
    const z=e.target.closest("[data-z]");
    if(z){const ps=posts.filter(p=>p.item_id===z.dataset.z),it=items.find(i=>i.id===z.dataset.z);lightbox(ps.flatMap(p=>(p.assets&&p.assets.finals)||[p.thumb_url]).filter(Boolean),it&&it.name);return}
    const b=e.target.closest("button");if(!b)return;
    try{
      if(b.dataset.del){const it=items.find(x=>x.id===b.dataset.del),np=posts.filter(p=>p.item_id===b.dataset.del).length;
        modal("Eliminar producto",`<p>Se quita «${esc(it?it.name:"")}» de la lista${np?` y se borran sus ${np} publicación${np>1?"es":""} programada${np>1?"s":""}`:""}. No se puede deshacer.</p>`,{ok:"Eliminar",onOk:async()=>{
          if(np)await fetch(`${db.REST}posts?item_id=eq.${b.dataset.del}`,{method:"DELETE",headers:db.H});
          await fetch(`${db.REST}campaign_items?id=eq.${b.dataset.del}`,{method:"DELETE",headers:db.H});await load();toast("Producto eliminado")}});return}
      if(b.dataset.r){await db.update("campaign_items",b.dataset.r,{status:"pending",attempts:0,error:null,locked_by:null});await setC({status:"running"});toast("Reintento en cola")}
      else if(b.dataset.a==="start"){await setC({status:"running",started_at:new Date().toISOString()});toast("Iniciada")}
      else if(b.dataset.a==="pause")await setC({status:"paused"});
      else if(b.dataset.a==="resume")await setC({status:"running"});
      else if(b.dataset.a==="retry"){await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}&status=eq.error`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"pending",attempts:0,error:null,locked_by:null})});await setC({status:"running"});toast("Errores en cola")}
      else if(b.dataset.a==="cancel"){modal("Cancelar lista","<p>Se detiene el procesamiento. Las publicaciones ya creadas y la lista original se conservan.</p>",{ok:"Cancelar lista",onOk:async()=>{await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}&status=eq.pending`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"cancelled"})});await setC({status:"cancelled"})}})}
      else if(b.dataset.a==="regen"){modal("Regenerar imágenes","<p>Se vuelven a generar todas las imágenes de la lista con el diseño actual. Las fechas se mantienen y las publicaciones anteriores se sustituyen.</p>",{ok:"Regenerar",onOk:async()=>{await fetch(`${db.REST}campaign_items?campaign_id=eq.${id}&status=in.(scheduled,error)`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"pending",attempts:0,error:null,locked_by:null,photos:null})});await setC({status:"running"});toast("En cola")}})}
      else if(b.dataset.a==="add")addMore();
    }catch(er){toast(er.message,{kind:"err"})}
  });
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
  return ()=>{alive=false;clearInterval(t);off()};
}
