import {Editor} from "./editor.js?v=20261123g";
import {LayersPanel} from "./layers.js?v=20261123g";
import {mountInspector} from "./inspector.js?v=20261123g";
import {logoUrl,uploadLogo} from "../app/brand.js?v=20261123g";
import {loadAllFonts} from "../app/fonts.js?v=20261123g";
import {FORMATS,fmtById} from "../app/formats.js?v=20261123g";
import {safeOf} from "../studio/skeleton.js?v=20261123g";
import {openProductPicker} from "./product.js?v=20261123g";
import {zipBlobs} from "../app/zip.js?v=20261123g";
import {I} from "../app/icons.js?v=20261123g";
import {db} from "../app/db.js?v=20261123g";
import {store} from "../app/store.js?v=20261123g";
import {esc,STATUS,STATUS_KEYS,toast,openMenu,modal} from "../app/ui.js?v=20261123g";
import {toInput,fromInput} from "../app/dates.js?v=20261123g";
export async function mountEditor(root,id,{template=false}={}){
  const table=template?"templates":"posts";
  root.innerHTML='<div class="empty">Cargando…</div>';
  let post;
  try{post=await db.get(table,id)}catch(e){root.innerHTML=`<div class="empty">No se pudo cargar: ${esc(e.message)}</div>`;return()=>{}}
  if(!post){toast(template?"La plantilla no existe":"La publicación no existe",{kind:"err"});location.hash=template?"#/plantillas":"#/";return()=>{}}
  if(template)post.title=post.name;
  if(!document.body.contains(root))return()=>{};
  root.innerHTML=`<div class="app">
<header class="etop">
 <button class="btn btn--ghost btn--icon" id="back" aria-label="Volver al calendario" title="Volver al calendario">${I["arrow-left"]}</button>
 <input class="etop__title" id="title" value="${esc(post.title)}" aria-label="${template?"Nombre de la plantilla":"Título"}">
 ${template?`<span class="chip chip--fmt">${esc(store.typeName(post.type_id)||"Sin tipo")} · ${esc(store.catName(post.category_id)||"Sin categoría")} · ${esc(fmtById(post.format).short)}</span>`:""}
 <span class="top__sep"></span>
 <button class="btn btn--icon" id="undo" title="Deshacer (Ctrl+Z)">${I["undo-2"]}</button>
 <button class="btn btn--icon" id="redo" title="Rehacer (Ctrl+Shift+Z)">${I["redo-2"]}</button>
 <span class="grow"></span>
 <span class="save" id="save"></span>
 <span class="top__zoom" id="zoom"></span>
 ${template?`<button class="btn" id="tdef">${I.check||""}Predeterminada</button>`:`<select class="select etop__status" id="status" aria-label="Estado">${STATUS_KEYS.map(s=>`<option value="${s}"${s===post.status?" selected":""}>${STATUS[s].label}</option>`).join("")}</select>
 <input class="input etop__date" type="datetime-local" id="when" value="${toInput(post.scheduled_at)}" aria-label="Fecha y hora">
 <button class="btn" id="sched">${I["calendar-clock"]}Programar</button>
 <button class="btn" id="totpl" title="Guardar como plantilla">${I.copy}Plantilla</button>`}
 <button class="btn btn--accent" id="export">${I.download}Exportar</button>
</header>
<aside class="tools">
 <button class="tool" id="t-text" title="Añadir texto">${I.type}<span>Texto</span></button>
 <button class="tool" id="t-web" title="Dirección web como capa">${I.globe}<span>Web</span></button>
 <button class="tool" id="t-logo" title="Logotipo como capa">${I.image}<span>Logo</span></button>
 <button class="tool" id="t-prod" title="Elegir o cambiar producto">${I.image}<span>Producto</span></button>
 <button class="tool" id="t-rect" title="Rectángulo">${I.square}<span>Rect.</span></button>
 <button class="tool" id="t-circle" title="Círculo">${I.circle}<span>Círculo</span></button>
 <button class="tool" id="t-safe" title="Mostrar zonas seguras">${I.square}<span>Zonas</span></button>
</aside>
<main class="stage" id="stage"><div class="stage__box" id="box"><canvas id="cv"></canvas><div class="safe" id="safe" hidden></div></div><div class="slides" id="slides" hidden></div></main>
<aside class="panel">
 <div class="panel__scroll" id="insp"></div>
 <section class="sec"><div class="sec__head"><span class="label">Datos del producto</span></div>
  <div class="field"><input class="input" data-p="name" placeholder="Nombre del producto" aria-label="Nombre del producto"></div>
  <div class="row"><input class="input" data-p="number" placeholder="Número" aria-label="Número"><input class="input" data-p="price" placeholder="Precio" aria-label="Precio"></div>
  <div class="row"><input class="input" data-p="collection" placeholder="Colección" aria-label="Colección"><input class="input" data-p="category" placeholder="Categoría" aria-label="Categoría"></div>
  <div class="row"><input class="input" data-p="hashtag" placeholder="#Hashtag" aria-label="Hashtag"><input class="input" data-p="web" placeholder="Web" aria-label="Web"></div>
  <input class="input" data-p="tagline" placeholder="Frase del producto" aria-label="Frase del producto">
  <textarea class="input input--area" data-p="desc" rows="2" placeholder="Descripción breve" aria-label="Descripción"></textarea>
  ${template?"":`<button class="btn btn--sm" id="p-save" title="Guarda textos y fondo de este producto para reutilizarlos">${I.save}Guardar como preset del producto</button>`}</section>
 <section class="sec sec--layers"><div class="sec__head"><span class="label">Capas</span></div><div class="layers" id="layers"></div></section>
</aside></div>`;
  const $=s=>root.querySelector(s);
  const ed=new Editor($("#cv"),$("#stage"),$("#box"));
  window.studio=ed;
  const fmtOf=()=>fmtById(post.format);
  await loadAllFonts();
  ed.product=post.product||{};
  await ed.loadData(post.data&&(post.data.c||post.data.slides)?post.data:null,fmtOf());
  if(template){ed.tplMode=true;ed.product=post.data&&post.data.sample||{}}
  if(!document.body.contains(root)){ed.destroy();return()=>{}}
  const layers=new LayersPanel($("#layers"),ed);
  const setFmt=async id=>{const f=fmtById(id);post.format=f.id;await ed.setFormat(f.w,f.h);insp.reset()};
  const syncP=()=>root.querySelectorAll("[data-p]").forEach(i=>{if(i!==document.activeElement)i.value=ed.product[i.dataset.p]||""});
  const insp=mountInspector($("#insp"),ed,setFmt,fmtOf,syncP);
  if(!template)ed.product=post.product||{};ed.applyFields();
  root.querySelectorAll("[data-p]").forEach(i=>{i.value=ed.product[i.dataset.p]||"";i.oninput=()=>{ed.setProduct({[i.dataset.p]:i.value})}});
  $("#t-prod").onclick=()=>openProductPicker(ed,syncP);
  const addText=()=>ed.addText({text:"Título",name:"Título",top:Math.round(ed.H*.06),props:{fontSize:84}});
  $("#t-text").onclick=addText;
  $("#t-web").onclick=()=>ed.addText({text:"snackgame.es",name:"Dirección web",role:"web",field:"web",top:Math.round(ed.H*.93),props:{fontSize:36,fontWeight:600}});
  $("#t-logo").onclick=async()=>{
    try{
      let u=await logoUrl();
      if(!u){const f=await pickFile();if(!f)return;toast("Subiendo logotipo…");u=await uploadLogo(f)}
      await ed.addImage(u,{role:"logo",name:"Logotipo",maxFrac:.22});
    }catch(e){toast("No se pudo añadir el logotipo: "+e.message,{kind:"err"})}
  };
  const pickFile=()=>new Promise(r=>{const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=()=>r(i.files[0]||null);i.click()});
  $("#t-rect").onclick=()=>ed.addRect();$("#t-circle").onclick=()=>ed.addCircle();
  $("#undo").onclick=()=>ed.undo();$("#redo").onclick=()=>ed.redo();
  const hist=()=>{$("#undo").disabled=!ed.canUndo;$("#redo").disabled=!ed.canRedo};ed.on("history",hist);hist();
  ed.on("zoom",s=>{$("#zoom").textContent=Math.round(s*100)+"%"});$("#zoom").textContent=Math.round(ed.scale*100)+"%";
  const saveEl=$("#save");let dirty=false,saving=false,timer;
  const setSave=(t,err)=>{saveEl.textContent=t;saveEl.classList.toggle("is-err",!!err)};
  setSave("Guardado");
  const upd=(patch)=>template?(store.loaded?store.patchTemplate(post.id,patch):db.update("templates",post.id,patch)):(store.loaded?store.patchPost(post.id,patch):db.update("posts",post.id,patch));
  const bodyOf=thumb=>{const data=ed.toData();return template?{data:{...data,sample:ed.product},format:post.format,thumb_url:thumb}:{data,format:post.format,thumb_url:thumb,product:ed.product}};
  async function persist(){
    if(saving){dirty=true;return}
    saving=true;dirty=false;setSave("Guardando…");
    try{
      const blob=await ed.thumbBlob();
      let thumb=post.thumb_url;
      try{thumb=await db.upload(`thumbs/${template?"t-":""}${post.id}.jpg`,blob)}catch{}
      await upd(bodyOf(thumb));
      post.thumb_url=thumb;setSave("Guardado");
    }catch(e){setSave("Error al guardar",true);toast(e.message,{kind:"err"})}
    saving=false;if(dirty)persist();
  }
  const queue=()=>{if(ed.busy)return;dirty=true;setSave("Sin guardar…");clearTimeout(timer);timer=setTimeout(persist,900)};
  ed.on("history",queue);
  const meta=async patch=>{
    try{await upd(patch);Object.assign(post,patch);if(patch.name)post.title=patch.name;setSave("Guardado")}
    catch(e){toast(e.message,{kind:"err"})}
  };
  $("#title").onchange=e=>{const v=e.target.value.trim()||(template?"Plantilla":"Sin título");e.target.value=v;meta(template?{name:v}:{title:v})};
  if(template){
    const tb=$("#tdef"),paint=()=>{const on=store.tpl(post.id)?.is_default;tb.classList.toggle("is-on",!!on);tb.title=on?"Es la plantilla predeterminada de esta combinación":"Usar como predeterminada de esta combinación"};paint();
    tb.onclick=async()=>{try{await persist();await store.setDefault(post.id);paint();toast("Plantilla predeterminada de esta combinación")}catch(e){toast(e.message,{kind:"err"})}};
  }else{
    $("#status").onchange=e=>{const s=e.target.value;if(s==="scheduled"&&!fromInput($("#when").value)){toast("Elige fecha y hora para programar",{kind:"err"});e.target.value=post.status;return}meta({status:s})};
    $("#when").onchange=e=>meta({scheduled_at:fromInput(e.target.value)});
    $("#sched").onclick=async()=>{
      const iso=fromInput($("#when").value);if(!iso){toast("Elige fecha y hora",{kind:"err"});return}
      await meta({scheduled_at:iso,status:"scheduled"});$("#status").value="scheduled";toast("Programada para "+new Date(iso).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"}));
    };
    $("#p-save").onclick=async()=>{try{const f={};["name","tagline","desc","number","collection","price"].forEach(k=>{if(ed.product[k])f[k]=ed.product[k]});const b=ed.cfg.bg;await store.savePreset(ed.product,{fields:f,bg:b&&b.mode==="image"?b:null,image:ed.product.image});toast("Preset guardado: se aplicará cada vez que uses este producto")}catch(e){toast(e.message,{kind:"err"})}};
    $("#totpl").onclick=()=>{
      const opt=(arr,sel)=>`<option value="">—</option>`+arr.map(x=>`<option value="${x.id}"${x.id===sel?" selected":""}>${esc(x.name)}</option>`).join("");
      modal("Guardar como plantilla",`<div class="field"><label for="p-n">Nombre</label><input class="input" id="p-n" value="${esc(post.title.replace(/ · .*$/,""))}" required></div><div class="row"><div class="field"><label for="p-t">Tipo de contenido</label><select class="select" id="p-t">${opt(store.types,post.type_id)}</select></div><div class="field"><label for="p-c">Categoría de producto</label><select class="select" id="p-c">${opt(store.cats,post.category_id)}</select></div></div><p class="hint">Formato: ${esc(fmtById(post.format).label)}. Se guardan capas, fondo y sus reglas, colocación del producto, zonas seguras, logotipo y web. Las publicaciones ya creadas no cambian.</p><label class="chk"><input type="checkbox" id="p-d" checked> Usar como predeterminada de esta combinación</label>`,{ok:"Guardar plantilla",onOk:async f=>{
        const name=f.querySelector("#p-n").value.trim();if(!name)throw new Error("Escribe un nombre");
        let thumb=null;const id=crypto.randomUUID();try{thumb=await db.upload(`thumbs/t-${id}.jpg`,await ed.thumbBlob())}catch{}
        const data=ed.toData();
        const r=await store.createTemplate({id,name,type_id:f.querySelector("#p-t").value||null,category_id:f.querySelector("#p-c").value||null,format:post.format,data:{...data,sample:ed.product},thumb_url:thumb,is_default:false});
        if(f.querySelector("#p-d").checked)await store.setDefault(r.id);
        toast("Plantilla guardada",{action:"Ver plantillas",onAction:()=>location.hash="#/plantillas"});
      }});
    };
  }
  const slug=()=>(post.title||"publicacion").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"publicacion";
  const save=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
  const download=async type=>{
    try{
      if(ed.slides){
        const files=await ed.exportAll(type);
        save(await zipBlobs(files.map(f=>({name:`${slug()}-${f.name}.${type}`,blob:f.blob}))),`${slug()}-carrusel-${ed.W}x${ed.H}.zip`);
      }else save(await ed.exportBlob(type),`${slug()}-${ed.W}x${ed.H}.${type}`);
    }catch(e){toast("No se pudo exportar: "+e.message,{kind:"err"})}
  };
  $("#export").onclick=e=>openMenu(e.currentTarget,[{label:ed.slides?"Descargar PNG (ZIP)":"Descargar PNG",icon:"image",run:()=>download("png")},{label:ed.slides?"Descargar JPG (ZIP)":"Descargar JPG",icon:"image",run:()=>download("jpg")}]);
  $("#back").onclick=async()=>{if(dirty||saving){clearTimeout(timer);await persist()}location.hash=template?"#/plantillas":"#/"};
  const slidesEl=$("#slides");
  function drawSlides(){
    const had=!slidesEl.hidden;
    if(!ed.slides){slidesEl.hidden=true;return}slidesEl.hidden=false;if(!had){$("#stage").style.paddingBottom="48px";ed.fit()}
    slidesEl.innerHTML=ed.slides.map((_,i)=>`<button class="sl${i===ed.cur?" is-on":""}" data-i="${i}" aria-label="Diapositiva ${i+1}">${i+1}</button>`).join("")+`<span class="top__sep"></span><button class="sl" data-a="dup" title="Añadir copia de la diapositiva actual">${I.plus}</button><button class="sl" data-a="blank" title="Añadir diapositiva solo con el fondo">${I.square}</button><button class="sl" data-a="left" title="Mover a la izquierda">‹</button><button class="sl" data-a="right" title="Mover a la derecha">›</button><button class="sl" data-a="del" title="Eliminar diapositiva">${I["trash-2"]}</button>`;
  }
  slidesEl.onclick=async e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.dataset.i!==undefined)await ed.gotoSlide(+b.dataset.i);
    else if(b.dataset.a==="dup")await ed.newSlide(true);
    else if(b.dataset.a==="blank")await ed.newSlide(false);
    else if(b.dataset.a==="left"){ed.moveSlide(-1)}
    else if(b.dataset.a==="right"){ed.moveSlide(1)}
    else if(b.dataset.a==="del"){if(ed.slides.length<2)toast("Un carrusel necesita al menos una diapositiva",{kind:"err"});else await ed.removeSlide()}
    drawSlides();
  };
  ed.on("slides",drawSlides);drawSlides();
  const safeEl=$("#safe");let safeOn=false;
  function drawSafe(){
    safeEl.hidden=!safeOn;$("#t-safe").classList.toggle("is-on",safeOn);if(!safeOn)return;
    const s=safeOf(post.format,ed.cfg),W=ed.W,H=ed.H,p=(v,t)=>(v/t*100).toFixed(3)+"%";
    safeEl.innerHTML=`<i style="left:0;right:0;top:0;height:${p(s.t,H)}"></i><i style="left:0;right:0;bottom:0;height:${p(s.b,H)}"></i><i style="top:${p(s.t,H)};bottom:${p(s.b,H)};left:0;width:${p(s.l,W)}"></i><i style="top:${p(s.t,H)};bottom:${p(s.b,H)};right:0;width:${p(s.r,W)}"></i>`;
  }
  $("#t-safe").onclick=()=>{safeOn=!safeOn;drawSafe()};ed.on("safe",drawSafe);ed.on("format",drawSafe);
  const key=e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&document.activeElement.type!=="color"&&document.activeElement.type!=="range")return;
    const m=e.ctrlKey||e.metaKey,o=ed.active,k=e.key.toLowerCase();
    if(m&&k==="z"){e.preventDefault();e.shiftKey?ed.redo():ed.undo();return}
    if(m&&k==="y"){e.preventDefault();ed.redo();return}
    if(m&&k==="d"&&o){e.preventDefault();ed.duplicate(o);return}
    if((e.key==="Delete"||e.key==="Backspace")&&o){e.preventDefault();ed.remove(o);return}
    const st=e.shiftKey?10:1,d={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];
    if(d&&o){e.preventDefault();ed.nudge(...d)}
  };
  addEventListener("keydown",key);
  return ()=>{
    removeEventListener("keydown",key);clearTimeout(timer);
    if(dirty){const d=ed.toData();db.update(table,post.id,{data:template?{...d,sample:ed.product}:d,format:post.format}).catch(()=>{})}
    ed.destroy();delete window.studio;
  };
}
