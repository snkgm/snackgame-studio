import {store} from "../app/store.js?v=20261126z";
import {db} from "../app/db.js?v=20261126z";
import {FORMATS,fmtById} from "../app/formats.js?v=20261126z";
import {lightbox} from "../app/lightbox.js?v=20261126z";
import {I} from "../app/icons.js?v=20261126z";
import {esc,toast} from "../app/ui.js?v=20261126z";
import {scheduleDates,fmtMadrid,parseList} from "../studio/schedule.js?v=20261126z";
import {fetchProduct,validateGallery,usable,handleOf} from "../studio/gallery.js?v=20261126z";
const LIM={name:40,sub:60},DAYS=["L","M","X","J","V","S","D"],pad=n=>String(n).padStart(2,"0");
const thumb=(src,w=140)=>{try{const u=new URL(src);u.searchParams.set("width",w);return u.toString()}catch{return src}};
export function mountCampaignNew(root,addTo){
  let A=null;
  const d=new Date();d.setDate(d.getDate()+1);
  const S={typeId:(store.types.find(t=>t.name==="Diario")||{}).id||"",catId:(store.cats.find(c=>c.name==="Funkos")||{}).id||"",fmts:new Set(["post-3x4"]),n:2,tpls:{},sched:{mode:"weekdays",days:[0,2,4],every:1,time:"18:00",start:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`},text:"",rows:[],name:""};
  root.innerHTML=`<div class="auto"><a class="btn btn--sm auto__back" href="#/automatizaciones${addTo?"/"+addTo:""}">${I["arrow-left"]}<span>${addTo?"Volver a la lista":"Automatizaciones"}</span></a><h1 class="auto__h">${addTo?"Añadir productos":"Programación por lotes"}</h1><div id="blocks" class="auto__blocks"></div></div>`;
  const B=root.querySelector("#blocks");
  const opts=(arr,v)=>arr.map(t=>`<option value="${t.id}"${t.id===v?" selected":""}>${esc(t.name)}</option>`).join("");
  const pills=(arr,v,k)=>`<div class="pills">${arr.map(t=>`<button type="button" class="pill${t.id===v?" is-on":""}" data-${k}="${t.id}">${esc(t.name)}</button>`).join("")}</div>`;
  const tplFor=f=>S.tpls[f]!==undefined?S.tpls[f]:(store.resolveTemplate(S.typeId||null,S.catId||null,f)||{}).id||"";
  const dates=()=>scheduleDates({...S.sched},S.rows.length,A?S.skip:0);
  function fmtRow(f){const list=store.templates.filter(t=>t.format===f.id),cur=tplFor(f.id);
    return `<div class="fmt"><label class="chk"><input type="checkbox" data-f="${f.id}"${S.fmts.has(f.id)?" checked":""}> ${esc(f.short)} <em>${f.w}×${f.h}</em></label>${S.fmts.has(f.id)?`<select class="select" data-t="${f.id}"><option value="">Diseño básico automático</option>${opts(list,cur)}</select>`:""}</div>`}
  let uid=0;const mk=r=>({id:"p"+Date.now().toString(36)+(uid++),name:"",url:"",subtitle:"",gallery:null,sel:[],err:"",warn:"",loading:false,...r});
  const stOf=r=>r.loading?`<span class="st st--load"><i class="spin"></i>Obteniendo fotografías…</span>`:r.err?`<span class="st st--err">✖ ${esc(r.err)}</span>`:!r.gallery?`<span class="st">Sin analizar</span>`:r.sel.length===S.n?`<span class="st st--ok">✔ ${r.gallery.length} fotografías</span>`:`<span class="st st--warn">⚠ Selección incompleta</span>`;
  function cardHtml(r,i){
    const nOk=(r.gallery||[]).length,sel=r.sel.length,diff=sel-S.n;
    const cnt=r.gallery?`<div class="pc__cnt ${diff===0?"ok":"bad"}"><b>${sel} DE ${S.n} IMÁGENES SELECCIONADAS</b><span>${nOk} disponibles${diff>0?` · te pasas en ${diff}`:diff<0?` · falta${-diff>1?"n":""} ${-diff}`:""}</span></div>`:"";
    const g=(r.gallery||[]).map((p,j)=>{const k=r.sel.indexOf(j);return `<button type="button" class="ph ph--l${k>=0?" is-sel":""}${!p.ok||p.dup?" is-bad":""}" ${k>=0?'draggable="true"':""} data-r="${r.id}" data-p="${j}" title="${esc(p.why||(k>=0?"Seleccionada · arrastra para ordenar":"Clic para elegir"))}"><img src="${esc(thumb(p.src,200))}" alt="" loading="lazy" draggable="false"><span class="ph__z" data-big="${r.id}:${j}" title="Ampliar">⤢</span>${k>=0?`<b>${k+1}</b><em>✅</em>`:""}${!p.ok||p.dup?`<u>${esc(p.why)}</u>`:""}</button>`}).join("");
    return `<article class="pc${r.err?" is-err":""}" data-card="${r.id}"><div class="pc__l"><div class="pc__t"><b class="pc__id">#${i+1}</b><div class="cnt pc__n"><input class="input" data-n="${r.id}" value="${esc(r.name)}" placeholder="Nombre del producto" aria-label="Nombre"><small class="${r.name.length>LIM.name?"over":""}">${r.name.length}/${LIM.name}</small></div><button type="button" class="btn btn--sm" data-del="${r.id}" title="Eliminar producto" aria-label="Eliminar">✕</button></div>
<div class="pc__u"><input class="input" data-u="${r.id}" value="${esc(r.url)}" placeholder="https://snackgame.es/products/…" aria-label="URL" spellcheck="false"><button type="button" class="btn btn--sm" data-an="${r.id}">${r.gallery?"Reanalizar":"Analizar"}</button></div>
<div class="cnt"><input class="input" data-s="${r.id}" value="${esc(r.subtitle)}" placeholder="Subtítulo (opcional)" aria-label="Subtítulo"><small class="${r.subtitle.length>LIM.sub?"over":""}">${r.subtitle.length}/${LIM.sub}</small></div>
<div class="pc__s">${stOf(r)}${r.warn?`<span class="st st--warn">⚠ ${esc(r.warn)}</span>`:""}</div></div>
<div class="pc__r">${cnt}<div class="pc__g">${g||`<span class="hint">${r.loading?"":"Las fotografías aparecerán aquí al analizar el enlace."}</span>`}</div></div></article>`;
  }
  const rowById=id=>S.rows.find(r=>r.id===id),idxOf=id=>S.rows.findIndex(r=>r.id===id);
  const valid=()=>S.rows.filter(r=>r.gallery&&r.sel.length===S.n&&!r.loading);
  const problems=()=>S.rows.filter(r=>r.loading||(r.gallery&&r.sel.length!==S.n));
  function updCard(id){const i=idxOf(id),el=B.querySelector(`[data-card="${id}"]`);if(i<0||!el)return;const f=document.activeElement;el.outerHTML=cardHtml(S.rows[i],i);if(f&&f.dataset&&B.contains(f)){}renderSum()}
  function sumHtml(){
    const nF=S.fmts.size,v=valid().length,det=S.rows.length,errs=S.rows.filter(r=>r.err).length,photos=S.rows.reduce((t,r)=>t+(r.gallery?r.gallery.length:0),0),sel=S.rows.reduce((t,r)=>t+(r.gallery?r.sel.length:0),0);
    return `<div class="sumline"><span>Productos detectados: <b>${det}</b></span><span>Válidos: <b>${v}</b></span><span>Con errores: <b class="${errs?"over":""}">${errs}</b></span><span>Fotografías disponibles: <b>${photos}</b></span><span>Seleccionadas: <b>${sel}</b></span></div><div class="sumbig">${v*nF} PUBLICACIONES · ${v*nF*S.n} IMÁGENES FINALES</div>`}
  function renderSum(){
    const a=B.querySelector("#sumline");if(a)a.innerHTML=sumHtml();
    const nF=S.fmts.size,ds=dates(),v=valid().length,pr=problems().length,n=B.querySelectorAll(".sums b");
    if(n.length){n[0].textContent=v;n[1].textContent=v*nF;n[2].textContent=v*nF*S.n;n[3].textContent=pr;n[3].className=pr?"over":""}
    const ag=B.querySelector("#addgo");if(ag)ag.disabled=!(v&&!pr);const go=B.querySelector("#go"),sv=B.querySelector("#save");if(go)go.disabled=!(v&&nF&&ds.length&&!pr);if(sv)sv.disabled=!(v&&nF&&!pr);
    const h=B.querySelector("#sumhint");if(h)h.textContent=ds.length?`Primera: ${fmtMadrid(ds[0])} · Última: ${fmtMadrid(ds[Math.max(0,v-1)]||ds[ds.length-1])}`:"Añade productos y días para calcular las fechas.";
    persist();
  }
  function render(){
    if(addTo&&!A){B.innerHTML='<p class="hint">Cargando…</p>';return}
    const ds=dates(),nF=S.fmts.size;
    B.innerHTML=`${A?`<section class="blk"><h2>Lista «${esc(A.name)}»</h2><p class="hint">${S.n} imágenes por publicación · ${[...S.fmts].map(f=>fmtById(f).short).join(", ")} · se programan a continuación de las ${S.skip} existentes.</p></section>`:`
<section class="blk"><h2><span>1</span>Tipo de publicación</h2>${pills(store.types,S.typeId,"ty")}</section>
<section class="blk"><h2><span>2</span>Categoría y preset de producción</h2>${pills(store.cats,S.catId,"ca")}<p class="hint">El preset (plantilla) se elige por formato en el bloque siguiente; se propone el predeterminado de esta combinación. Todo se genera con una copia: editar una publicación no cambia el preset.</p></section>
<section class="blk"><h2><span>3</span>Formato e imágenes</h2><div class="fmts">${FORMATS.map(fmtRow).join("")}</div><div class="field"><label>Imágenes por publicación</label><div class="seg" id="seg-n">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button type="button" data-n="${n}" class="${S.n===n?"is-on":""}">${n}</button>`).join("")}</div><p class="hint">De 1 a 10 imágenes por publicación. Con 2 o más se crea un carrusel; cada diapositiva usa la de la plantilla si existe, y si no copia la anterior.</p></div></section>
<section class="blk"><h2><span>4</span>Frecuencia y horario</h2>
<div class="seg" id="seg-m"><button type="button" data-m="weekdays" class="${S.sched.mode==="weekdays"?"is-on":""}">Días de la semana</button><button type="button" data-m="interval" class="${S.sched.mode==="interval"?"is-on":""}">Cada N días</button></div>
${S.sched.mode==="weekdays"?`<div class="pills" id="days">${DAYS.map((x,i)=>`<button type="button" class="pill${S.sched.days.includes(i)?" is-on":""}" data-d="${i}">${x}</button>`).join("")}</div>`:`<div class="field"><label>Cada (días)</label><div class="seg" id="seg-e">${[1,2,3,4,5].map(n=>`<button type="button" data-e="${n}" class="${S.sched.every===n?"is-on":""}">${n}</button>`).join("")}</div></div>`}
<div class="row2"><div class="field"><label for="sd">Primer día</label><input class="input" type="date" id="sd" value="${S.sched.start}"></div><div class="field"><label for="st">Hora (Europa/Madrid)</label><input class="input" type="time" id="st" value="${S.sched.time}"></div></div></section>
`}<section class="blk"><h2><span>5</span>Detectar productos</h2><textarea class="input area" id="list" placeholder="Pega aquí tu lista. Cada producto: nombre, línea siguiente con el enlace de snackgame.es, y una línea en blanco entre productos:&#10;&#10;Weaponized Rick&#10;https://snackgame.es/products/…&#10;&#10;Rachel Green&#10;https://snackgame.es/products/…" spellcheck="false">${esc(S.text)}</textarea><div class="bar"><button type="button" class="btn btn--accent" id="det"${S.text.trim()?"":" disabled"}>DETECTAR PRODUCTOS</button><span class="hint" id="revmsg">Acepta también «Nombre enlace subtítulo» en una sola línea.</span></div></section>
<section class="blk"><h2><span>6</span>Productos agregados</h2><div id="sumline">${sumHtml()}</div><div class="plist2" id="cards">${S.rows.map(cardHtml).join("")}</div><div class="bar"><button type="button" class="btn" id="add">+ AGREGAR PRODUCTO</button>${S.rows.length?`<button type="button" class="btn btn--sm" id="clr">Descartar lista</button>`:""}</div></section>
${A?`<section class="blk blk--sum"><h2>Resumen</h2><div class="sums"><div><b>${valid().length}</b><span>productos válidos</span></div><div><b>${valid().length*nF}</b><span>publicaciones</span></div><div><b>${valid().length*nF*S.n}</b><span>imágenes</span></div><div><b class="${problems().length?"over":""}">${problems().length}</b><span>incidencias</span></div></div><p class="hint" id="sumhint">${ds.length?`Primera: ${fmtMadrid(ds[0])} · Última: ${fmtMadrid(ds[Math.max(0,valid().length-1)]||ds[ds.length-1])}`:""}</p><div class="bar"><button class="btn btn--accent" id="addgo"${valid().length&&!problems().length?"":" disabled"}>Añadir a la lista</button></div></section>`:`<section class="blk blk--sum"><h2><span>7</span>Resumen y confirmación</h2>
<div class="sums"><div><b>${valid().length}</b><span>productos válidos</span></div><div><b>${valid().length*nF}</b><span>publicaciones</span></div><div><b>${valid().length*nF*S.n}</b><span>imágenes</span></div><div><b class="${problems().length?"over":""}">${problems().length}</b><span>incidencias</span></div></div>
<p class="hint" id="sumhint">${ds.length?`Primera: ${fmtMadrid(ds[0])} · Última: ${fmtMadrid(ds[Math.max(0,valid().length-1)]||ds[ds.length-1])}`:"Añade productos y días para calcular las fechas."}</p>
<div class="field"><label for="cn">Nombre de la lista</label><input class="input" id="cn" value="${esc(S.name||autoName())}"></div>
<p class="hint">Se procesa en la nube aunque cierres el navegador. Tras pulsar Iniciar, el trabajador arranca en 5–15 min. Las incidencias no detienen la lista.</p>
<div class="bar"><button class="btn btn--accent" id="go"${valid().length&&nF&&ds.length&&!problems().length?"":" disabled"}>Iniciar procesamiento</button><button class="btn" id="save"${valid().length&&nF&&!problems().length?"":" disabled"}>Guardar sin iniciar</button></div></section>`}`;
  }
  const autoName=()=>`${store.typeName(S.typeId)||"Lista"} · ${store.catName(S.catId)||"Todas"} · ${S.sched.start}`;
  const autoSel=r=>{const out=[];(r.gallery||[]).forEach((p,j)=>{if(p.ok&&!p.dup&&out.length<S.n)out.push(j)});return out};
  const KEY="studio.batchdraft.v1";let pt=0;
  function persist(){if(addTo)return;clearTimeout(pt);pt=setTimeout(()=>{try{const slim=r=>({id:r.id,name:r.name,url:r.url,subtitle:r.subtitle,err:r.err,warn:r.warn,sel:r.sel,gallery:r.gallery?r.gallery.map(({id,src,w,h,ok,dup,why})=>({id,src,w,h,ok,dup,why})):null});
    localStorage.setItem(KEY,JSON.stringify({v:1,typeId:S.typeId,catId:S.catId,fmts:[...S.fmts],n:S.n,tpls:S.tpls,sched:S.sched,name:S.name,text:S.text,rows:S.rows.map(slim)}))}catch{}},300)}
  const restore=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||"null");if(!d||d.v!==1)return;Object.assign(S,{typeId:d.typeId||S.typeId,catId:d.catId||S.catId,fmts:new Set(d.fmts||[]),n:d.n||2,tpls:d.tpls||{},sched:{...S.sched,...(d.sched||{})},name:d.name||"",text:d.text||""});S.rows=(d.rows||[]).map(r=>mk({...r,loading:false}))}catch{}};
  if(!addTo)restore();
  B.addEventListener("click",async e=>{
    const bg=e.target.closest("[data-big]");
    if(bg){e.stopPropagation();const [id,j]=bg.dataset.big.split(":"),r=rowById(id);if(r)lightbox([r.gallery[+j].src],r.name);return}
    const t=e.target.closest("button");if(!t)return;
    if(t.dataset.ty!==undefined){S.typeId=t.dataset.ty;S.tpls={};render()}
    else if(t.dataset.ca!==undefined){S.catId=t.dataset.ca;S.tpls={};render()}
    else if(t.closest("#seg-n")){S.n=+t.dataset.n;S.rows.forEach(r=>{if(r.gallery)r.sel=autoSel(r)});render()}
    else if(t.closest("#seg-m")){S.sched.mode=t.dataset.m;render()}
    else if(t.closest("#seg-e")){S.sched.every=+t.dataset.e;render()}
    else if(t.dataset.d!==undefined){const k=+t.dataset.d,a=S.sched.days;S.sched.days=a.includes(k)?a.filter(x=>x!==k):[...a,k].sort();render()}
    else if(t.dataset.p!==undefined){const r=rowById(t.dataset.r),j=+t.dataset.p,p=r.gallery[j];if(!p.ok||p.dup)return;const i=r.sel.indexOf(j);if(i>=0)r.sel.splice(i,1);else r.sel.push(j);if(r.sel.length>S.n)toast(`Superas el límite de ${S.n} imágenes: quita una`);updCard(r.id)}
    else if(t.dataset.del!==undefined){S.rows.splice(idxOf(t.dataset.del),1);renderCards()}
    else if(t.dataset.an!==undefined){const r=rowById(t.dataset.an);analyze(r)}
    else if(t.id==="det")detect();
    else if(t.id==="add"){S.rows.push(mk({}));renderCards();const l=B.querySelectorAll("[data-n]");l[l.length-1]?.focus()}
    else if(t.id==="clr"){if(confirm("¿Descartar toda la lista de productos?")){S.rows=[];renderCards()}}
    else if(t.id==="addgo")submitAdd();else if(t.id==="go")submit(true);else if(t.id==="save")submit(false);
  });
  function renderCards(){const c=B.querySelector("#cards");if(c)c.innerHTML=S.rows.map(cardHtml).join("");const x=B.querySelector("#clr");renderSum();if(!S.rows.length&&x)x.remove();else if(S.rows.length&&!x)render()}
  B.addEventListener("change",e=>{
    const t=e.target;
    if(t.dataset.f){t.checked?S.fmts.add(t.dataset.f):S.fmts.delete(t.dataset.f);render()}
    else if(t.dataset.t!==undefined&&t.tagName==="SELECT"){S.tpls[t.dataset.t]=t.value}
    else if(t.id==="sd"){S.sched.start=t.value||S.sched.start;render()}
    else if(t.id==="st"){S.sched.time=t.value||S.sched.time;render()}
    else if(t.dataset.u!==undefined){const r=rowById(t.dataset.u);if(r){const nu=t.value.trim();if(nu!==r.url){r.url=nu;r.err="";analyze(r)}}}
  });
  B.addEventListener("input",e=>{
    const t=e.target;
    if(t.id==="list"){S.text=t.value;B.querySelector("#det").disabled=!S.text.trim();persist()}
    else if(t.dataset.n!==undefined&&t.tagName==="INPUT"){const r=rowById(t.dataset.n);r.name=t.value;t.nextElementSibling.textContent=`${t.value.length}/${LIM.name}`;t.nextElementSibling.className=t.value.length>LIM.name?"over":"";persist()}
    else if(t.dataset.s!==undefined){const r=rowById(t.dataset.s);r.subtitle=t.value;t.nextElementSibling.textContent=`${t.value.length}/${LIM.sub}`;t.nextElementSibling.className=t.value.length>LIM.sub?"over":"";persist()}
    else if(t.dataset.u!==undefined){const r=rowById(t.dataset.u);if(r)r.url=t.value;persist()}
    else if(t.id==="cn")S.name=t.value;
  });
  let drag=null;
  B.addEventListener("dragstart",e=>{const b=e.target.closest&&e.target.closest("[data-p][draggable]");if(!b)return;drag={r:b.dataset.r,p:+b.dataset.p};e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain","x")}catch{}});
  B.addEventListener("dragover",e=>{const b=e.target.closest&&e.target.closest("[data-p][draggable]");if(b&&drag&&b.dataset.r===drag.r){e.preventDefault();b.classList.add("is-over")}});
  B.addEventListener("dragleave",e=>{e.target.closest&&e.target.closest(".ph")?.classList.remove("is-over")});
  B.addEventListener("drop",e=>{const b=e.target.closest&&e.target.closest("[data-p][draggable]");if(!b||!drag||b.dataset.r!==drag.r)return;e.preventDefault();
    const r=rowById(drag.r),from=r.sel.indexOf(drag.p),to=r.sel.indexOf(+b.dataset.p);drag=null;if(from<0||to<0||from===to)return;
    const [x]=r.sel.splice(from,1);r.sel.splice(to,0,x);updCard(r.id)});
  B.addEventListener("dragend",()=>{drag=null;B.querySelectorAll(".is-over").forEach(x=>x.classList.remove("is-over"))});
  async function analyze(r){
    if(!r.url){r.err=r.name?"Nombre sin URL":"Falta el enlace";r.gallery=null;r.sel=[];updCard(r.id);return}
    r.loading=true;r.err="";r.warn="";updCard(r.id);
    const prev=r.gallery,prevIds=prev?r.sel.map(j=>prev[j]&&prev[j].id):[];
    try{
      const info=await fetchProduct(r.url);
      if(!info.images.length)throw new Error("Ficha sin fotografías");
      const g=await validateGallery(info.images);
      if(!g.some(x=>x.ok))throw new Error("Error al descargar imágenes");
      r.gallery=g;
      if(prev){
        const map=prevIds.map(id=>g.findIndex(x=>x.id===id&&x.ok&&!x.dup)).filter(j=>j>=0),lost=prevIds.length-map.length,added=g.filter(x=>!prev.some(o=>o.id===x.id)).length;
        r.sel=map;if(lost)r.warn=`La galería cambió: ${lost} foto(s) seleccionada(s) ya no existe(n). Revisa la selección`;else if(added)r.warn=`La galería cambió: ${added} foto(s) nueva(s)`;
      }else r.sel=autoSel(r);
      if(!r.name&&info.title)r.name=info.title;
    }catch(er){r.err=er.message||"Error";if(!prev)r.gallery=null}
    r.loading=false;updCard(r.id);
  }
  async function detect(){
    const parsed=parseList(S.text);if(!parsed.length)return;
    const rows=parsed.map(x=>mk(x));
    rows.forEach(r=>{if(!r.url)r.err="Nombre sin URL";else if(!handleOf(r.url))r.err="URL incorrecta: debe ser una ficha de snackgame.es"});
    S.rows.push(...rows);S.text="";const ta=B.querySelector("#list");if(ta)ta.value="";B.querySelector("#det").disabled=true;renderCards();
    B.querySelector("#cards").lastElementChild?.scrollIntoView({block:"nearest"});
    const q=rows.filter(r=>!r.err);let i=0;const msg=B.querySelector("#revmsg");let done=0;
    const work=async()=>{while(i<q.length){const r=q[i++];await analyze(r);if(msg)msg.textContent=`${++done}/${q.length} analizados`}};
    await Promise.all([work(),work(),work()]);
    if(msg)msg.textContent=`Análisis terminado: ${rows.filter(r=>r.gallery&&!r.err).length} válidos, ${rows.filter(r=>r.err).length} con errores`;
  }
  async function submit(start){
    const VR=valid();if(!VR.length)return;
    const ds=dates(),btn=B.querySelector(start?"#go":"#save");btn.disabled=true;
    try{
      const fm=[...S.fmts],tpls={};fm.forEach(f=>{const t=tplFor(f);if(t)tpls[f]=t});
      const camp=await db.insert("campaigns",{name:(S.name||autoName()).trim(),type_id:S.typeId||null,category_id:S.catId||null,formats:fm,images_per_post:S.n,templates:tpls,schedule:{...S.sched,tz:"Europe/Madrid"},status:start?"running":"draft",started_at:start?new Date().toISOString():null});
      await db.bulk("campaign_items",VR.map((r,i)=>({campaign_id:camp.id,pos:i+1,name:r.name||"Sin nombre",url:r.url,subtitle:r.subtitle,scheduled_at:ds[i]||null,photos:r.gallery&&r.sel.length?r.sel.map(j=>{const p=r.gallery[j];return {src:p.src,w:p.w,h:p.h,id:p.id}}):null})));
      try{localStorage.removeItem(KEY)}catch{}
      toast(start?"Lista iniciada: se procesa en la nube":"Lista guardada");
      location.hash=`#/automatizaciones/${camp.id}`;
    }catch(e){toast(e.message,{kind:"err"});btn.disabled=false}
  }
  async function submitAdd(){
    const VR=valid();if(!VR.length)return;const btn=B.querySelector("#addgo"),ds=dates();btn.disabled=true;
    try{
      await db.bulk("campaign_items",VR.map((r,i)=>({campaign_id:A.id,pos:S.skip+i+1,name:r.name||"Sin nombre",url:r.url,subtitle:r.subtitle,scheduled_at:ds[i]||null,photos:r.sel.length?r.sel.map(j=>{const p=r.gallery[j];return {src:p.src,w:p.w,h:p.h,id:p.id}}):null})));
      await db.update("campaigns",A.id,{status:A.status==="draft"?"draft":"running"});
      toast(`${VR.length} producto${VR.length>1?"s":""} añadido${VR.length>1?"s":""}`);location.hash=`#/automatizaciones/${A.id}`;
    }catch(e){toast(e.message,{kind:"err"});btn.disabled=false}
  }
  if(addTo)(async()=>{try{
    const [c]=await db.list("campaigns",`select=*&id=eq.${addTo}`),its=await db.list("campaign_items",`select=id&campaign_id=eq.${addTo}`);
    if(!c){B.innerHTML='<p class="hint">Lista no encontrada.</p>';return}
    A=c;S.skip=its.length;S.n=c.images_per_post||1;S.fmts=new Set(c.formats||["post-3x4"]);S.sched={...S.sched,...(c.schedule||{})};S.typeId=c.type_id||"";S.catId=c.category_id||"";S.tpls=c.templates||{};S.rows=[];render()
  }catch(e){B.innerHTML=`<p class="hint">${esc(e.message)}</p>`}})();
  let init=false;
  const ensure=()=>{if(addTo||init||!store.types.length)return;init=true;S.typeId=S.typeId||(store.types.find(t=>t.name==="Diario")||store.types[0]).id;S.catId=S.catId||(store.cats.find(c=>c.name==="Funkos")||store.cats[0]||{}).id||"";render()};
  const off=store.on(ensure);if(!store.loaded)store.load();else ensure();
  render();
  return ()=>off();
}
