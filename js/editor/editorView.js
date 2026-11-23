import {Editor} from "./editor.js";
import {LayersPanel} from "./layers.js";
import {mountInspector} from "./inspector.js";
import {logoUrl,uploadLogo} from "../app/brand.js";
import {loadAllFonts} from "../app/fonts.js";
import {FORMATS} from "../app/formats.js";
import {I} from "../app/icons.js";
import {db} from "../app/db.js";
import {store} from "../app/store.js";
import {esc,STATUS,STATUS_KEYS,toast,openMenu} from "../app/ui.js";
import {toInput,fromInput} from "../app/dates.js";
export async function mountEditor(root,id){
  root.innerHTML='<div class="empty">Cargando…</div>';
  let post;
  try{post=await db.get("posts",id)}catch(e){root.innerHTML=`<div class="empty">No se pudo cargar: ${esc(e.message)}</div>`;return()=>{}}
  if(!post){toast("La publicación no existe",{kind:"err"});location.hash="#/";return()=>{}}
  if(!document.body.contains(root))return()=>{};
  root.innerHTML=`<div class="app">
<header class="etop">
 <button class="btn btn--ghost btn--icon" id="back" aria-label="Volver al calendario" title="Volver al calendario">${I["arrow-left"]}</button>
 <input class="etop__title" id="title" value="${esc(post.title)}" aria-label="Título">
 <span class="top__sep"></span>
 <button class="btn btn--icon" id="undo" title="Deshacer (Ctrl+Z)">${I["undo-2"]}</button>
 <button class="btn btn--icon" id="redo" title="Rehacer (Ctrl+Shift+Z)">${I["redo-2"]}</button>
 <span class="grow"></span>
 <span class="save" id="save"></span>
 <span class="top__zoom" id="zoom"></span>
 <select class="select etop__status" id="status" aria-label="Estado">${STATUS_KEYS.map(s=>`<option value="${s}"${s===post.status?" selected":""}>${STATUS[s].label}</option>`).join("")}</select>
 <input class="input etop__date" type="datetime-local" id="when" value="${toInput(post.scheduled_at)}" aria-label="Fecha y hora">
 <button class="btn" id="sched">${I["calendar-clock"]}Programar</button>
 <button class="btn btn--accent" id="export">${I.download}Exportar</button>
</header>
<aside class="tools">
 <button class="tool" id="t-text" title="Añadir texto">${I.type}<span>Texto</span></button>
 <button class="tool" id="t-web" title="Dirección web como capa">${I.globe}<span>Web</span></button>
 <button class="tool" id="t-logo" title="Logotipo como capa">${I.image}<span>Logo</span></button>
 <button class="tool" id="t-rect" title="Rectángulo">${I.square}<span>Rect.</span></button>
 <button class="tool" id="t-circle" title="Círculo">${I.circle}<span>Círculo</span></button>
</aside>
<main class="stage" id="stage"><div class="stage__box" id="box"><canvas id="cv"></canvas></div></main>
<aside class="panel">
 <div class="panel__scroll" id="insp"></div>
 <section class="sec"><div class="sec__head"><span class="label">Datos del producto</span></div>
  <div class="field"><input class="input" data-p="name" placeholder="Nombre del producto" aria-label="Nombre del producto"></div>
  <div class="row"><input class="input" data-p="number" placeholder="Número" aria-label="Número"><input class="input" data-p="price" placeholder="Precio" aria-label="Precio"></div>
  <div class="row"><input class="input" data-p="collection" placeholder="Colección" aria-label="Colección"><input class="input" data-p="category" placeholder="Categoría" aria-label="Categoría"></div>
  <input class="input" data-p="web" placeholder="Web (snackgame.es)" aria-label="Web"></section>
 <section class="sec sec--layers"><div class="sec__head"><span class="label">Capas</span></div><div class="layers" id="layers"></div></section>
</aside></div>`;
  const $=s=>root.querySelector(s);
  const ed=new Editor($("#cv"),$("#stage"),$("#box"));
  window.studio=ed;
  const fmtOf=()=>FORMATS.find(f=>f.id===post.format)||FORMATS[1];
  await loadAllFonts();
  ed.product=post.product||{};
  await ed.loadData(post.data&&post.data.c?post.data:null,fmtOf());
  if(!document.body.contains(root)){ed.destroy();return()=>{}}
  const layers=new LayersPanel($("#layers"),ed);
  const setFmt=id=>{const f=FORMATS.find(x=>x.id===id);post.format=f.id;ed.setFormat(f.w,f.h)};
  ed.on("format",()=>{const f=FORMATS.find(x=>x.w===ed.W&&x.h===ed.H);if(f)post.format=f.id});
  const insp=mountInspector($("#insp"),ed,setFmt);
  ed.product=post.product||{};ed.applyFields();
  root.querySelectorAll("[data-p]").forEach(i=>{i.value=ed.product[i.dataset.p]||"";i.oninput=()=>{ed.setProduct({[i.dataset.p]:i.value})}});
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
  async function persist(){
    if(saving){dirty=true;return}
    saving=true;dirty=false;setSave("Guardando…");
    try{
      const blob=await ed.thumbBlob();
      let thumb=post.thumb_url;
      try{thumb=await db.upload(`thumbs/${post.id}.jpg`,blob)}catch{}
      const body={data:ed.toData(),format:post.format,thumb_url:thumb,product:ed.product};
      await (store.loaded?store.patchPost(post.id,body):db.update("posts",post.id,body));
      post.thumb_url=thumb;setSave("Guardado");
    }catch(e){setSave("Error al guardar",true);toast(e.message,{kind:"err"})}
    saving=false;if(dirty)persist();
  }
  const queue=()=>{if(ed.busy)return;dirty=true;setSave("Sin guardar…");clearTimeout(timer);timer=setTimeout(persist,900)};
  ed.on("history",queue);
  const meta=async patch=>{
    try{if(store.loaded)await store.patchPost(post.id,patch);else await db.update("posts",post.id,patch);Object.assign(post,patch);setSave("Guardado")}
    catch(e){toast(e.message,{kind:"err"})}
  };
  $("#title").onchange=e=>{const v=e.target.value.trim()||"Sin título";e.target.value=v;meta({title:v})};
  $("#status").onchange=e=>{const s=e.target.value;if(s==="scheduled"&&!fromInput($("#when").value)){toast("Elige fecha y hora para programar",{kind:"err"});e.target.value=post.status;return}meta({status:s})};
  $("#when").onchange=e=>meta({scheduled_at:fromInput(e.target.value)});
  $("#sched").onclick=async()=>{
    const iso=fromInput($("#when").value);if(!iso){toast("Elige fecha y hora",{kind:"err"});return}
    await meta({scheduled_at:iso,status:"scheduled"});$("#status").value="scheduled";toast("Programada para "+new Date(iso).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"}));
  };
  const download=async type=>{
    try{
      const blob=await ed.exportBlob(type);const f=fmtOf();
      const name=(post.title||"publicacion").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase();
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${name||"publicacion"}-${ed.W}x${ed.H}.${type}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    }catch(e){toast("No se pudo exportar: "+e.message,{kind:"err"})}
  };
  $("#export").onclick=e=>openMenu(e.currentTarget,[{label:"Descargar PNG",icon:"image",run:()=>download("png")},{label:"Descargar JPG",icon:"image",run:()=>download("jpg")}]);
  $("#back").onclick=async()=>{if(dirty||saving){clearTimeout(timer);await persist()}location.hash="#/"};
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
    if(dirty){const d=ed.toData();db.update("posts",post.id,{data:d,format:post.format}).catch(()=>{})}
    ed.destroy();delete window.studio;
  };
}
