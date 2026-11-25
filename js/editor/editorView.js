import {ActiveSelection} from "../../vendor/fabric.min.mjs?v=20261126e";
import {Editor} from "./editor.js?v=20261126e";
import {LayersPanel} from "./layers.js?v=20261126e";
import {mountInspector} from "./inspector.js?v=20261126e";
import {loadAllFonts} from "../app/fonts.js?v=20261126e";
import {FORMATS,fmtById} from "../app/formats.js?v=20261126e";
import {sessionStart} from "./accordion.js?v=20261126e";
import {scrollFade} from "./scrollfade.js?v=20261126e";
import {openTplSettings} from "./tplsettings.js?v=20261126e";
import {openExport} from "./exporter.js?v=20261126e";
import {statusHtml,mountStatusBar} from "./statusbar.js?v=20261126e";
import {mountCtxBar} from "./ctxbar.js?v=20261126e";
import {mountComposer} from "./composer.js?v=20261126e";
import {safeOf} from "../studio/skeleton.js?v=20261126e";
import {openProductPicker} from "./product.js?v=20261126e";
import {openImageTool,openShapes,openTextStyles,openOverlayTool,closePop} from "./tools.js?v=20261126e";
import {zipBlobs} from "../app/zip.js?v=20261126e";
import {I} from "../app/icons.js?v=20261126e";
import {db} from "../app/db.js?v=20261126e";
import {store} from "../app/store.js?v=20261126e";
import {esc,STATUS,STATUS_KEYS,toast,openMenu,modal} from "../app/ui.js?v=20261126e";
import {toInput,fromInput} from "../app/dates.js?v=20261126e";
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
 <label class="etop__name" title="Nombre del diseño"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg><input class="etop__title" id="title" value="${esc(post.title)}" placeholder="Nombre del diseño" aria-label="Nombre del diseño"></label>
 ${template?`<span class="chip chip--fmt">${esc(store.typeName(post.type_id)||"Sin tipo")} · ${esc(store.catName(post.category_id)||"Sin categoría")} · ${esc(fmtById(post.format).short)}</span>`:""}
 <span class="top__sep"></span>
 <button class="btn btn--icon" id="undo" title="Deshacer (Ctrl+Z)">${I["undo-2"]}</button>
 <button class="btn btn--icon" id="redo" title="Rehacer (Ctrl+Shift+Z)">${I["redo-2"]}</button>
 <span class="grow"></span>
 ${template?`<button class="btn" id="tplset" title="Valores predeterminados y ajustes de esta plantilla">${I.settings||I.sliders||""}<span>Ajustes de plantilla</span></button>`:""}
 <button class="btn savebtn" id="savebtn" title="Guardar (Ctrl+S)" disabled>Guardado 💾</button>
 ${template?`<button class="btn" id="tdef">${I.check||""}Predeterminada</button>`:`<select class="select etop__status" id="status" aria-label="Estado">${STATUS_KEYS.map(s=>`<option value="${s}"${s===post.status?" selected":""}>${STATUS[s].label}</option>`).join("")}</select>
 <input class="input etop__date" type="datetime-local" id="when" value="${toInput(post.scheduled_at)}" aria-label="Fecha y hora">
 <button class="btn" id="sched">${I["calendar-clock"]}<span>Programar</span></button>
 <button class="btn" id="totpl" title="Guardar como plantilla">${I.copy}<span>Plantilla</span></button>`}
 <button class="btn btn--accent" id="export">${I.download}<span>Exportar</span></button>
</header>
<div class="lsplit" id="lsplit" role="separator" aria-orientation="vertical" aria-label="Ajustar anchura del panel de herramientas de edición" title="Arrastra para ajustar la anchura"></div>
<div class="bar2" id="bar2" role="toolbar" aria-label="Reglas, guías y alineación"></div>
<aside class="tools"><div class="pnl-t">Agregar</div>
 <button class="tool" id="t-text" title="Añadir texto">${I.type}<span>Texto</span></button>
 <button class="tool" id="t-img" title="Subir imagen, elegir de la biblioteca o añadir un producto">${I.image}<span>Imagen</span></button>
 <button class="tool" id="t-shapes" data-pop title="Formas">${I.square}<span>Formas</span></button>
 <button class="tool" id="t-ov" title="Overlays: destellos, grano, texturas, luces…">${I.layers}<span>Overlays</span></button>
 <div class="tools__sep"></div>
 <div class="lyr"><div class="lyr__box" id="lbox"><div class="lyr__head"><span>Capas</span><button type="button" class="lyr__b" id="lmerge" hidden title="Fusionar capas seleccionadas" aria-label="Fusionar selección">${I.layers}</button><button type="button" class="lyr__b" id="lexp" title="Expandir o contraer capas" aria-label="Expandir capas" aria-pressed="false">${I["chevron-down"]}</button></div><div class="layers layers--c" id="layers"></div><div class="lyr__bg" id="lbg"></div></div></div>
</aside>
<main class="stage" id="stage"><div class="ttb" id="ttb" role="toolbar" aria-label="Herramientas de texto" hidden></div><div class="stage__box" id="box"><canvas id="cv"></canvas><div class="guides" id="guides"></div></div></main>
${statusHtml()}
<aside class="panel">
 <div class="pnl-t pnl-t--r">Herramientas de edición</div>
 <div class="panel__scroll" id="insp"></div>
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
  const syncP=()=>insp&&insp.reset();
  sessionStart();
  {const lw=+localStorage.getItem("sg.rightw")||0;if(lw)root.querySelector(".app")?.style.setProperty("--right-w",Math.max(288,Math.min(440,lw))+"px");
   const sp=$("#lsplit"),app=root.querySelector(".app")||root;
   sp.onpointerdown=e=>{e.preventDefault();sp.setPointerCapture(e.pointerId);const mv=ev=>{const w=Math.max(288,Math.min(440,Math.round(app.getBoundingClientRect().right-ev.clientX)));app.style.setProperty("--right-w",w+"px");sp.dataset.w=w;ed.fit&&ed.fit()};const up=()=>{sp.removeEventListener("pointermove",mv);sp.removeEventListener("pointerup",up);if(sp.dataset.w)try{localStorage.setItem("sg.rightw",sp.dataset.w)}catch{}};sp.addEventListener("pointermove",mv);sp.addEventListener("pointerup",up)}}
  let savePreset=null;const insp=mountInspector($("#insp"),ed,setFmt,fmtOf,syncP,()=>savePreset);
  if(!template)ed.product=post.product||{};ed.applyFields();
  $("#t-img").onclick=()=>openImageTool(ed,syncP);
  $("#t-ov").onclick=()=>openOverlayTool(ed);
  $("#t-shapes").onclick=e=>openShapes(e.currentTarget,ed);
  const addText=()=>ed.addText({text:"Título",name:"Título",top:Math.round(ed.H*.06),props:{fontSize:84}});
  $("#t-text").onclick=e=>openTextStyles(e.currentTarget,ed);
  $("#undo").onclick=()=>ed.undo();$("#redo").onclick=()=>ed.redo();
  const hist=()=>{$("#undo").disabled=!ed.canUndo;$("#redo").disabled=!ed.canRedo};ed.on("history",hist);hist();
  let dirty=false,saving=false,timer;
  const setSave=(t,err)=>{const b=$("#savebtn");if(!b)return;const st=t==="Guardado"?"clean":t==="Guardando…"?"saving":err&&t!=="Cambios sin guardar"?"err":"dirty";b.dataset.st=st;b.disabled=st==="clean"||st==="saving";b.classList.toggle("btn--accent",st==="dirty"||st==="err");b.textContent={clean:"Guardado 💾",saving:"Guardando…",dirty:"Guardar cambios",err:"Error · reintentar"}[st]};
  setSave("Guardado");
  const upd=(patch)=>template?(store.loaded?store.patchTemplate(post.id,patch):db.update("templates",post.id,patch)):(store.loaded?store.patchPost(post.id,patch):db.update("posts",post.id,patch));
  const bodyOf=thumb=>{const data=ed.toData();return template?{data:{...data,sample:ed.product},format:post.format,thumb_url:thumb}:{data,format:post.format,thumb_url:thumb,product:ed.product}};
  async function persist(){
    if(saving)return;
    saving=true;dirty=false;setSave("Guardando…");
    try{
      const blob=await ed.thumbBlob();
      let thumb=post.thumb_url;
      try{thumb=await db.upload(`thumbs/${template?"t-":""}${post.id}.jpg`,blob)}catch{}
      await upd(bodyOf(thumb));
      post.thumb_url=thumb;mark();setSave("Guardado");
    }catch(e){dirty=true;setSave("Error al guardar",true);toast(e.message,{kind:"err"})}
    saving=false;
  }
  let base=null;const mark=()=>{base=JSON.stringify(ed.toData())};setTimeout(mark,1200);
  const queue=()=>{if(ed.busy||base===null)return;dirty=JSON.stringify(ed.toData())!==base;setSave(dirty?"Cambios sin guardar":"Guardado",dirty)};
  const lockBtn=()=>{};
  $("#savebtn").onclick=async()=>{clearTimeout(timer);await persist();lockBtn()};
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
    savePreset=async()=>{try{const f={};["name","tagline","desc","number","collection","price"].forEach(k=>{if(ed.product[k])f[k]=ed.product[k]});const b=ed.cfg.bg;await store.savePreset(ed.product,{fields:f,bg:b&&b.mode==="image"?b:null,image:ed.product.image});toast("Preset guardado: se aplicará cada vez que uses este producto")}catch(e){toast(e.message,{kind:"err"})}};
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
  if($("#tplset"))$("#tplset").onclick=()=>openTplSettings(ed,post);
  $("#export").onclick=()=>openExport(ed,{slug:slug()});
  $("#back").onclick=()=>{location.hash=template?"#/plantillas":"#/"};
  const slidesEl=$("#slides");slidesEl.hidden=true;$("#sbar .sbs--sl").hidden=true;
  const slp=Object.assign(document.createElement("div"),{className:"slp",id:"slp"});$("#stage").appendChild(slp);
  let thT;
  function drawSlides(){
    const n=ed.slides?ed.slides.length:1,cur=ed.slides?ed.cur:0;
    if(ed.slides)ed.th[cur]=ed.grabTh();
    const th=i=>ed.slides&&ed.th[i]||"";
    slp.innerHTML=Array.from({length:n},(_,i)=>`<div class="slp__i${i===cur?" is-on":""}" data-i="${i}" role="button" tabindex="0" aria-label="Imagen ${i+1}" title="Imagen ${i+1}">${(i===cur&&!ed.slides?ed.grabTh():th(i))?`<img src="${i===cur&&!ed.slides?ed.grabTh():th(i)}" alt="" draggable="false">`:`<span>${i+1}</span>`}${n>1&&i===cur?`<button class="slp__x" data-del="1" aria-label="Eliminar imagen" title="Eliminar imagen">×</button>`:""}</div>`).join("")+(n<ed.maxSlides?`<button class="slp__add" data-add="1" title="Añadir imagen: copia de la actual sin el producto" aria-label="Añadir imagen">+</button>`:"")+`<small class="slp__n">${cur+1}/${n}</small>`;
  }
  slp.onclick=async e=>{
    if(e.target.closest("[data-del]")){if(ed.slides&&ed.slides.length>1){await ed.removeSlide();drawSlides()}return}
    if(e.target.closest("[data-add]")){await ed.newSlide(true,true);drawSlides();return}
    const it=e.target.closest("[data-i]");if(it&&ed.slides){await ed.gotoSlide(+it.dataset.i);drawSlides()}
  };
  ed.on("change",()=>{clearTimeout(thT);thT=setTimeout(drawSlides,500)});
  ed.on("slides",drawSlides);drawSlides();
  ed.on("guides",g=>{$("#guides").innerHTML=g.map(a=>a.x!==undefined?`<i style="left:${(a.x/ed.W*100).toFixed(3)}%;top:0;bottom:0;width:0;border-left:1px solid #ff3d9a"></i>`:`<i style="top:${(a.y/ed.H*100).toFixed(3)}%;left:0;right:0;height:0;border-top:1px solid #ff3d9a"></i>`).join("")});
  const hitIn=R=>ed.canvas.getObjects().filter(o=>ed.mergeable(o)&&o.visible!==false&&o.selectable!==false&&!o.locked&&(()=>{o.setCoords();const q=o.getCoords(),xs=q.map(p=>p.x),ys=q.map(p=>p.y);return Math.min(...xs)<=R.r&&Math.max(...xs)>=R.l&&Math.min(...ys)<=R.b&&Math.max(...ys)>=R.t})());
  const hlShow=objs=>{let h=$("#box").querySelector("#hlb");if(!h){h=document.createElement("div");h.id="hlb";h.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:6";$("#box").appendChild(h)}
    h.innerHTML=(objs||[]).map(o=>{o.setCoords();const q=o.getCoords(),xs=q.map(p=>p.x),ys=q.map(p=>p.y),l=Math.min(...xs),t=Math.min(...ys);return `<div class="hl" style="left:${l/ed.W*100}%;top:${t/ed.H*100}%;width:${(Math.max(...xs)-l)/ed.W*100}%;height:${(Math.max(...ys)-t)/ed.H*100}%"></div>`}).join("")};
  ed.canvas.on("mouse:move",()=>{const g=ed.canvas._groupSelector;if(!g){if(!ed._marq&&$("#hlb")&&$("#hlb").innerHTML)hlShow([]);return}const x2=g.x+g.deltaX,y2=g.y+g.deltaY;hlShow(hitIn({l:Math.min(g.x,x2),r:Math.max(g.x,x2),t:Math.min(g.y,y2),b:Math.max(g.y,y2)}))});
  ed.canvas.on("mouse:up",()=>hlShow([]));
  $("#stage").addEventListener("pointerdown",e=>{
    if(e.button!==0||e.target.closest(".canvas-container,.slides,.shapes,.rul,.cmp,.ttb,.pop2"))return;
    closePop();const sx=e.clientX,sy=e.clientY,add=e.shiftKey||e.ctrlKey||e.metaKey;let mq=null,moved=false;const base=add?ed.canvas.getActiveObjects().filter(o=>ed.mergeable(o)):[];
    const rect=()=>({l:Math.min(sx,cx),t:Math.min(sy,cy),r:Math.max(sx,cx),b:Math.max(sy,cy)});let cx=sx,cy=sy;
    const mv=ev=>{cx=ev.clientX;cy=ev.clientY;if(!moved&&Math.hypot(cx-sx,cy-sy)<5)return;moved=true;ed._marq=true;
      if(!mq){mq=document.createElement("div");mq.className="marq";document.body.appendChild(mq)}
      const r=rect();Object.assign(mq.style,{left:r.l+"px",top:r.t+"px",width:r.r-r.l+"px",height:r.b-r.t+"px"});{const br=$("#box").getBoundingClientRect(),k=br.width/ed.W;hlShow(hitIn({l:(r.l-br.left)/k,r:(r.r-br.left)/k,t:(r.t-br.top)/k,b:(r.b-br.top)/k}))}};
    const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);
      ed._marq=false;if(mq)mq.remove();hlShow([]);
      if(!moved){if(!add){ed.canvas.discardActiveObject();ed.bgSel=false;ed.canvas.requestRenderAll();ed.emit("change")}return}
      const br=$("#box").getBoundingClientRect(),k=br.width/ed.W,r=rect(),R={l:(r.l-br.left)/k,r:(r.r-br.left)/k,t:(r.t-br.top)/k,b:(r.b-br.top)/k};
      const hit=ed.canvas.getObjects().filter(o=>ed.mergeable(o)&&o.visible!==false&&o.selectable!==false&&!o.locked&&(()=>{o.setCoords();const q=o.getCoords(),xs=q.map(p=>p.x),ys=q.map(p=>p.y);return Math.min(...xs)<=R.r&&Math.max(...xs)>=R.l&&Math.min(...ys)<=R.b&&Math.max(...ys)>=R.t})());
      const all=[...new Set([...base,...hit])];ed.canvas.discardActiveObject();ed.bgSel=false;
      if(all.length===1)ed.canvas.setActiveObject(all[0]);else if(all.length>1)ed.canvas.setActiveObject(new ActiveSelection(all,{canvas:ed.canvas}));
      ed.canvas.requestRenderAll();ed.emit("change")};
    window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);
  });
  const cmp=mountComposer($("#box").closest(".app")||document,ed);
  scrollFade($("#layers"));scrollFade($(".panel"));
  mountStatusBar($("#box").closest(".app"),ed);
  mountCtxBar($("#box").closest(".app"),ed);
  const key=e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&document.activeElement.type!=="color"&&document.activeElement.type!=="range")return;
    const m=e.ctrlKey||e.metaKey,o=ed.active,k=e.key.toLowerCase();
    if(e.key==="Escape"&&!document.querySelector(".modal")){ed.canvas.discardActiveObject();ed.bgSel=false;ed.canvas.requestRenderAll();ed.emit("change");closePop();return}
    if(m&&k==="s"){e.preventDefault();if(dirty)$("#savebtn").click();return}
    if(m&&k==="z"){e.preventDefault();e.shiftKey?ed.redo():ed.undo();return}
    if(m&&k==="y"){e.preventDefault();ed.redo();return}
    if(m&&k==="d"&&o){e.preventDefault();ed.duplicate(o);return}
    if((e.key==="Delete"||e.key==="Backspace")&&o){e.preventDefault();ed.remove(o);return}
    const st=e.shiftKey?10:1,d={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];
    if(d&&o){e.preventDefault();ed.nudge(...d)}
  };
  addEventListener("keydown",key);
  const bu=e=>{if(dirty){e.preventDefault();e.returnValue=""}};addEventListener("beforeunload",bu);
  window.__leaveGuard=(go)=>{
    if(!dirty)return false;
    modal("Hay cambios sin guardar","<p>Has modificado esta imagen y los cambios todavía no están guardados.</p>",{ok:"Guardar y salir",onOk:async()=>{await persist();if(dirty)throw new Error("No se pudo guardar");go()}}).el.querySelector(".modal__foot").insertAdjacentHTML("afterbegin",'<button type="button" class="btn btn--ghost" data-discard>Salir sin guardar</button>');
    const el=document.querySelector(".modal");el.querySelector("[data-discard]").onclick=()=>{dirty=false;el.remove();go()};
    return true;
  };
  return ()=>{
    removeEventListener("beforeunload",bu);window.__leaveGuard=null;
    removeEventListener("keydown",key);clearTimeout(timer);
    ed.destroy();delete window.studio;
  };
}
