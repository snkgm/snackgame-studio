import {store} from "../app/store.js?v=20261125q";
import {db} from "../app/db.js?v=20261125q";
import {FORMATS,fmtById} from "../app/formats.js?v=20261125q";
import {lightbox} from "../app/lightbox.js?v=20261125q";
import {I} from "../app/icons.js?v=20261125q";
import {esc,toast} from "../app/ui.js?v=20261125q";
import {scheduleDates,fmtMadrid,parseList} from "../studio/schedule.js?v=20261125q";
import {fetchProduct,validateGallery,usable} from "../studio/gallery.js?v=20261125q";
const LIM={name:40,sub:60},DAYS=["L","M","X","J","V","S","D"],pad=n=>String(n).padStart(2,"0");
const thumb=(src,w=140)=>{try{const u=new URL(src);u.searchParams.set("width",w);return u.toString()}catch{return src}};
export function mountCampaignNew(root){
  const d=new Date();d.setDate(d.getDate()+1);
  const S={typeId:(store.types.find(t=>t.name==="Diario")||{}).id||"",catId:(store.cats.find(c=>c.name==="Funkos")||{}).id||"",fmts:new Set(["post-3x4"]),n:2,tpls:{},sched:{mode:"weekdays",days:[0,2,4],every:1,time:"18:00",start:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`},text:"",rows:[],name:""};
  root.innerHTML=`<div class="auto"><a class="btn btn--sm auto__back" href="#/automatizaciones">${I["arrow-left"]}<span>Automatizaciones</span></a><h1 class="auto__h">Programación por lotes</h1><div id="blocks" class="auto__blocks"></div></div>`;
  const B=root.querySelector("#blocks");
  const opts=(arr,v)=>arr.map(t=>`<option value="${t.id}"${t.id===v?" selected":""}>${esc(t.name)}</option>`).join("");
  const pills=(arr,v,k)=>`<div class="pills">${arr.map(t=>`<button type="button" class="pill${t.id===v?" is-on":""}" data-${k}="${t.id}">${esc(t.name)}</button>`).join("")}</div>`;
  const tplFor=f=>S.tpls[f]!==undefined?S.tpls[f]:(store.resolveTemplate(S.typeId||null,S.catId||null,f)||{}).id||"";
  const dates=()=>scheduleDates({...S.sched},S.rows.length);
  function fmtRow(f){const list=store.templates.filter(t=>t.format===f.id),cur=tplFor(f.id);
    return `<div class="fmt"><label class="chk"><input type="checkbox" data-f="${f.id}"${S.fmts.has(f.id)?" checked":""}> ${esc(f.short)} <em>${f.w}×${f.h}</em></label>${S.fmts.has(f.id)?`<select class="select" data-t="${f.id}"><option value="">Diseño básico automático</option>${opts(list,cur)}</select>`:""}</div>`}
  function rowHtml(r,i){
    const g=(r.gallery||[]).map((p,j)=>`<button type="button" class="ph${r.sel.includes(j)?" is-sel":""}${!p.ok||p.dup?" is-bad":""}" data-r="${i}" data-p="${j}" title="${esc(p.why||(r.sel.includes(j)?"Seleccionada":"Clic para elegir"))}"><img src="${esc(thumb(p.src))}" alt="" loading="lazy"><span class="ph__z" data-big="${i}:${j}" title="Ampliar">⤢</span>${r.sel.includes(j)?`<b>${r.sel.indexOf(j)+1}</b>`:""}</button>`).join("");
    const st=r.err?`<span class="st st--err">✖ ${esc(r.err)}</span>`:!r.gallery?`<span class="st">Sin revisar</span>`:r.sel.length<S.n?`<span class="st st--warn">⚠ ${r.sel.length}/${S.n} fotos válidas</span>`:`<span class="st st--ok">✔ ${r.sel.length} fotos</span>`;
    return `<div class="prow"><div class="prow__f"><div class="cnt"><input class="input" data-n="${i}" value="${esc(r.name)}" aria-label="Nombre"><small class="${r.name.length>LIM.name?"over":""}">${r.name.length}/${LIM.name}</small></div><div class="cnt"><input class="input" data-s="${i}" value="${esc(r.subtitle)}" placeholder="Subtítulo (opcional)" aria-label="Subtítulo"><small class="${r.subtitle.length>LIM.sub?"over":""}">${r.subtitle.length}/${LIM.sub}</small></div></div><div class="prow__u">${esc(r.url||"Sin URL")}</div><div class="prow__g">${g}${st}</div></div>`}
  function render(){
    const ds=dates(),nF=S.fmts.size,bad=S.rows.filter(r=>r.err||(r.gallery&&r.sel.length<S.n)).length;
    B.innerHTML=`
<section class="blk"><h2><span>1</span>Tipo de publicación</h2>${pills(store.types,S.typeId,"ty")}</section>
<section class="blk"><h2><span>2</span>Categoría y preset de producción</h2>${pills(store.cats,S.catId,"ca")}<p class="hint">El preset (plantilla) se elige por formato en el bloque siguiente; se propone el predeterminado de esta combinación. Todo se genera con una copia: editar una publicación no cambia el preset.</p></section>
<section class="blk"><h2><span>3</span>Formato e imágenes</h2><div class="fmts">${FORMATS.map(fmtRow).join("")}</div><div class="field"><label>Imágenes por publicación</label><div class="seg" id="seg-n">${[1,2,3,4].map(n=>`<button type="button" data-n="${n}" class="${S.n===n?"is-on":""}">${n}</button>`).join("")}</div><p class="hint">Con 2 o más imágenes se crea un carrusel: mismo diseño en todas las diapositivas, solo cambia el producto.</p></div></section>
<section class="blk"><h2><span>4</span>Frecuencia y horario</h2>
<div class="seg" id="seg-m"><button type="button" data-m="weekdays" class="${S.sched.mode==="weekdays"?"is-on":""}">Días de la semana</button><button type="button" data-m="interval" class="${S.sched.mode==="interval"?"is-on":""}">Cada N días</button></div>
${S.sched.mode==="weekdays"?`<div class="pills" id="days">${DAYS.map((x,i)=>`<button type="button" class="pill${S.sched.days.includes(i)?" is-on":""}" data-d="${i}">${x}</button>`).join("")}</div>`:`<div class="field"><label>Cada (días)</label><div class="seg" id="seg-e">${[1,2,3,4,5].map(n=>`<button type="button" data-e="${n}" class="${S.sched.every===n?"is-on":""}">${n}</button>`).join("")}</div></div>`}
<div class="row2"><div class="field"><label for="sd">Primer día</label><input class="input" type="date" id="sd" value="${S.sched.start}"></div><div class="field"><label for="st">Hora (Europa/Madrid)</label><input class="input" type="time" id="st" value="${S.sched.time}"></div></div></section>
<section class="blk"><h2><span>5</span>Lista de productos</h2><textarea class="input area" id="list" placeholder="Una línea por producto:&#10;Rúben Dias https://snackgame.es/products/… Subtítulo opcional" spellcheck="false">${esc(S.text)}</textarea><div class="bar"><button type="button" class="btn" id="rev"${S.text.trim()?"":" disabled"}>Revisar fotografías</button><span class="hint" id="revmsg"></span></div><div class="plist2">${S.rows.map(rowHtml).join("")}</div></section>
<section class="blk blk--sum"><h2><span>6</span>Resumen y confirmación</h2>
<div class="sums"><div><b>${S.rows.length}</b><span>productos</span></div><div><b>${S.rows.length*nF}</b><span>publicaciones</span></div><div><b>${S.rows.length*nF*S.n}</b><span>imágenes</span></div><div><b class="${bad?"over":""}">${bad}</b><span>incidencias</span></div></div>
<p class="hint">${ds.length?`Primera: ${fmtMadrid(ds[0])} · Última: ${fmtMadrid(ds[ds.length-1])}`:"Añade productos y días para calcular las fechas."}</p>
<div class="field"><label for="cn">Nombre de la lista</label><input class="input" id="cn" value="${esc(S.name||autoName())}"></div>
<p class="hint">Se procesa en la nube aunque cierres el navegador. Tras pulsar Iniciar, el trabajador arranca en 5–15 min. Las incidencias no detienen la lista.</p>
<div class="bar"><button class="btn btn--accent" id="go"${S.rows.length&&nF&&ds.length?"":" disabled"}>Iniciar procesamiento</button><button class="btn" id="save"${S.rows.length&&nF?"":" disabled"}>Guardar sin iniciar</button></div></section>`;
  }
  const autoName=()=>`${store.typeName(S.typeId)||"Lista"} · ${store.catName(S.catId)||"Todas"} · ${S.sched.start}`;
  B.addEventListener("click",async e=>{
    const bg=e.target.closest("[data-big]");
    if(bg){const [i,j]=bg.dataset.big.split(":").map(Number),r=S.rows[i];lightbox([r.gallery[j].src],r.name);return}
    const t=e.target.closest("button");if(!t)return;
    if(t.dataset.ty!==undefined){S.typeId=t.dataset.ty;S.tpls={};render()}
    else if(t.dataset.ca!==undefined){S.catId=t.dataset.ca;S.tpls={};render()}
    else if(t.closest("#seg-n")){S.n=+t.dataset.n;S.rows.forEach(r=>{if(r.gallery)r.sel=autoSel(r)});render()}
    else if(t.closest("#seg-m")){S.sched.mode=t.dataset.m;render()}
    else if(t.closest("#seg-e")){S.sched.every=+t.dataset.e;render()}
    else if(t.dataset.d!==undefined){const k=+t.dataset.d,a=S.sched.days;S.sched.days=a.includes(k)?a.filter(x=>x!==k):[...a,k].sort();render()}
    else if(t.dataset.p!==undefined){const r=S.rows[+t.dataset.r],j=+t.dataset.p,p=r.gallery[j];if(!p.ok)return;const i=r.sel.indexOf(j);if(i>=0)r.sel.splice(i,1);else if(r.sel.length<S.n)r.sel.push(j);else{toast(`Máximo ${S.n} fotos: quita una antes`);return}render()}
    else if(t.id==="rev")review();
    else if(t.id==="go")submit(true);else if(t.id==="save")submit(false);
  });
  const autoSel=r=>{const out=[];(r.gallery||[]).forEach((p,j)=>{if(p.ok&&!p.dup&&out.length<S.n)out.push(j)});return out};
  B.addEventListener("change",e=>{
    const t=e.target;
    if(t.dataset.f){t.checked?S.fmts.add(t.dataset.f):S.fmts.delete(t.dataset.f);render()}
    else if(t.dataset.t!==undefined&&t.tagName==="SELECT"){S.tpls[t.dataset.t]=t.value}
    else if(t.id==="sd"){S.sched.start=t.value||S.sched.start;render()}
    else if(t.id==="st"){S.sched.time=t.value||S.sched.time;render()}
  });
  B.addEventListener("input",e=>{
    const t=e.target;
    if(t.id==="list"){S.text=t.value;S.rows=parseList(t.value).map(r=>({...r,gallery:null,sel:[],err:""}));B.querySelector("#rev").disabled=!S.text.trim();B.querySelector(".plist2").innerHTML=S.rows.map(rowHtml).join("");sum()}
    else if(t.dataset.n!==undefined&&t.tagName==="INPUT"){const r=S.rows[+t.dataset.n];r.name=t.value;t.nextElementSibling.textContent=`${t.value.length}/${LIM.name}`;t.nextElementSibling.className=t.value.length>LIM.name?"over":""}
    else if(t.dataset.s!==undefined){const r=S.rows[+t.dataset.s];r.subtitle=t.value;t.nextElementSibling.textContent=`${t.value.length}/${LIM.sub}`;t.nextElementSibling.className=t.value.length>LIM.sub?"over":""}
    else if(t.id==="cn")S.name=t.value;
  });
  function sum(){
    const nF=S.fmts.size,ds=dates(),n=B.querySelectorAll(".sums b");
    if(n.length){n[0].textContent=S.rows.length;n[1].textContent=S.rows.length*nF;n[2].textContent=S.rows.length*nF*S.n}
    B.querySelector("#go").disabled=!(S.rows.length&&nF&&ds.length);B.querySelector("#save").disabled=!(S.rows.length&&nF);
  }
  async function review(){
    const msg=B.querySelector("#revmsg"),rows=S.rows;let done=0,i=0;
    B.querySelector("#rev").disabled=true;
    const work=async()=>{while(i<rows.length){const r=rows[i++];
      try{const info=await fetchProduct(r.url);r.gallery=await validateGallery(info.images);r.sel=autoSel(r);r.err=r.gallery.some(x=>x.ok)?"":"Sin fotografías válidas"}
      catch(er){r.gallery=null;r.sel=[];r.err=er.message||"Error"}
      msg.textContent=`${++done}/${rows.length} revisadas`;
    }};
    await Promise.all([work(),work(),work()]);
    const y=window.scrollY;render();window.scrollTo(0,y);
  }
  async function submit(start){
    if(!S.rows.length)return;
    const ds=dates(),btn=B.querySelector(start?"#go":"#save");btn.disabled=true;
    try{
      const fm=[...S.fmts],tpls={};fm.forEach(f=>{const t=tplFor(f);if(t)tpls[f]=t});
      const camp=await db.insert("campaigns",{name:(S.name||autoName()).trim(),type_id:S.typeId||null,category_id:S.catId||null,formats:fm,images_per_post:S.n,templates:tpls,schedule:{...S.sched,tz:"Europe/Madrid"},status:start?"running":"draft",started_at:start?new Date().toISOString():null});
      await db.bulk("campaign_items",S.rows.map((r,i)=>({campaign_id:camp.id,pos:i+1,name:r.name||"Sin nombre",url:r.url,subtitle:r.subtitle,scheduled_at:ds[i]||null,photos:r.gallery&&r.sel.length?r.sel.map(j=>{const p=r.gallery[j];return {src:p.src,w:p.w,h:p.h,id:p.id}}):null})));
      toast(start?"Lista iniciada: se procesa en la nube":"Lista guardada");
      location.hash=`#/automatizaciones/${camp.id}`;
    }catch(e){toast(e.message,{kind:"err"});btn.disabled=false}
  }
  let init=false;
  const ensure=()=>{if(init||!store.types.length)return;init=true;S.typeId=S.typeId||(store.types.find(t=>t.name==="Diario")||store.types[0]).id;S.catId=S.catId||(store.cats.find(c=>c.name==="Funkos")||store.cats[0]||{}).id||"";render()};
  const off=store.on(ensure);if(!store.loaded)store.load();else ensure();
  render();
  return ()=>off();
}
