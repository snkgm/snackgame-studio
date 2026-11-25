import {modal,toast,esc} from "../app/ui.js?v=20261126f";
import {I} from "../app/icons.js?v=20261126f";
import {db} from "../app/db.js?v=20261126f";
import {store} from "../app/store.js?v=20261126f";
import {hashKey} from "../img/matting.js?v=20261126f";
import {logoUrl,uploadLogo} from "../app/brand.js?v=20261126f";
import {openProductPicker} from "./product.js?v=20261126f";
const sv=(d,x="")=>`<svg viewBox="0 0 48 48" width="40" height="40" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" ${x}>${d}</svg>`;
const SHAPES=[["rect","Rectángulo",sv('<rect x="6" y="12" width="36" height="24" rx="0"/>')],["rrect","Rect. redondeado",sv('<rect x="6" y="12" width="36" height="24" rx="8"/>')],["square","Cuadrado",sv('<rect x="10" y="10" width="28" height="28"/>')],["circle","Círculo",sv('<circle cx="24" cy="24" r="15"/>')],["ellipse","Elipse",sv('<ellipse cx="24" cy="24" rx="19" ry="12"/>')],["triangle","Triángulo",sv('<path d="M24 8 42 38H6z"/>')],["rhombus","Rombo",sv('<path d="M24 6 42 24 24 42 6 24z"/>')],["star","Estrella",sv('<path d="m24 5 5.6 12.2 13.4 1.5-10 9 2.8 13.1L24 34l-11.8 6.8 2.8-13.1-10-9 13.4-1.5z"/>')],["hexagon","Hexágono",sv('<path d="M24 6 39.6 15v18L24 42 8.4 33V15z"/>')],["line","Línea",sv('<path d="M8 24h32" fill="none" stroke-width="5" stroke-linecap="round"/>')]];
import {TEXT_STYLES,addStyled} from "./textstyles.js?v=20261126f";
let pop=null;
export function closePop(){if(pop){pop.remove();pop=null;document.removeEventListener("mousedown",outside,true)}}
const outside=e=>{if(pop&&!pop.contains(e.target)&&!e.target.closest("[data-pop]"))closePop()};
export function openShapes(anchor,ed){
  if(pop){closePop();return}
  pop=document.createElement("div");pop.className="shapes";
  pop.innerHTML=`<div class="shapes__h"><span>Formas</span><button type="button" class="shapes__x" data-x aria-label="Cerrar">${I.x||"×"}</button></div><div class="shapes__g">${SHAPES.map(([k,l,s])=>`<button class="shp" data-k="${k}" title="${l}" aria-label="${l}">${s}<span>${l}</span></button>`).join("")}</div>`;
  pop.onclick=e=>{if(e.target.closest("[data-x]")){closePop();return}const b=e.target.closest(".shp");if(!b)return;ed.addShape(b.dataset.k);closePop()};
  document.body.appendChild(pop);const r=anchor.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;pop.style.left=Math.max(8,Math.min(r.right+8,innerWidth-pw-8))+"px";pop.style.top=Math.max(8,Math.min(r.top,innerHeight-ph-8))+"px";setTimeout(()=>document.addEventListener("mousedown",outside,true),0);
  const esc=e=>{if(e.key==="Escape"){closePop();document.removeEventListener("keydown",esc)}};document.addEventListener("keydown",esc);
}
const pickFile=(multi)=>new Promise(r=>{const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=!!multi;i.onchange=()=>r([...i.files]);i.click()});
export async function normalizeImage(file,max=2400){
  const bmp=await createImageBitmap(file);const k=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  return new Promise(r=>c.toBlob(r,"image/png"));
}
export async function uploadAsset(file,folder){
  const blob=await normalizeImage(file);const key=await hashKey(await blob.arrayBuffer());
  return db.upload(`${folder}/${key}.png`,blob);
}
export function openImageTool(ed,{afterProduct}={}){
  const m=modal("Imagen",`<div class="imgt"><div class="imgt__bar"><button type="button" class="btn btn--accent" data-a="up">${I.upload}<span>Subir imágenes</span></button><button type="button" class="btn" data-a="prod">${I.package}<span>Producto…</span></button><button type="button" class="btn" data-a="logo">${I.image}<span>Logotipo de la marca</span></button></div><p class="hint">Admite PNG con transparencia. Pulsa una imagen de tu biblioteca para añadirla como capa.</p><div class="lib lib--img" id="imgl"></div></div>`,{ok:"Cerrar",wide:true,onOk:()=>true});
  const grid=m.el.querySelector("#imgl");
  const paint=()=>{const a=store.assets("image");grid.innerHTML=a.map(x=>`<div class="lib__it" data-id="${x.id}"><img src="${esc(x.fields.url)}" alt="${esc(x.name)}" loading="lazy"><span>${esc(x.name)}</span><div class="lib__act"><button type="button" data-del title="Eliminar de la biblioteca">${I["trash-2"]}</button></div></div>`).join("")||'<div class="hint">Todavía no hay imágenes. Sube las tuyas con el botón de arriba.</div>'};
  paint();
  m.el.addEventListener("click",async e=>{
    const del=e.target.closest("[data-del]");
    if(del){const id=del.closest(".lib__it").dataset.id;try{await store.removeAsset(id);paint()}catch(er){toast(er.message,{kind:"err"})}return}
    const it=e.target.closest(".lib__it");
    if(it){const x=store.assets("image").find(a=>a.id===it.dataset.id);if(x){try{await ed.addImage(x.fields.url,{name:x.name,role:"decor",maxFrac:.5});m.close()}catch(er){toast(er.message,{kind:"err"})}}return}
    const a=e.target.closest("[data-a]")?.dataset.a;if(!a)return;
    try{
      if(a==="up"){const fs=await pickFile(true);if(!fs.length)return;const t=toast("Subiendo…",{ms:600000});try{for(const f of fs){const url=await uploadAsset(f,"img");await store.addAsset("image",f.name.replace(/\.[^.]+$/,"").slice(0,40)||"Imagen",url);if(fs.length===1)await ed.addImage(url,{name:f.name.replace(/\.[^.]+$/,"").slice(0,30)||"Imagen",role:"decor",maxFrac:.5})}}finally{t.close()}if(fs.length===1)m.close();else paint()}
      else if(a==="prod"){m.close();openProductPicker(ed,afterProduct)}
      else if(a==="logo"){let u=await logoUrl();if(!u){const fs=await pickFile();if(!fs[0])return;toast("Subiendo logotipo…");u=await uploadLogo(fs[0])}await ed.addImage(u,{role:"logo",name:"Logotipo",maxFrac:.22});m.close()}
    }catch(er){toast("No se pudo añadir: "+er.message,{kind:"err"})}
  });
}
import {OVERLAYS,renderOverlay} from "../img/overlays.js?v=20261126f";
export function openOverlayTool(ed){
  const thumbs=OVERLAYS.map(o=>{const c=renderOverlay(o.id,144,192,3);return `<button type="button" class="ovt" data-ov="${o.id}" title="${esc(o.name)}"><span class="ovt__img"><img src="${c.toDataURL("image/png")}" alt=""></span><span>${esc(o.name)}</span></button>`}).join("");
  const m=modal("Overlays",`<div class="imgt"><div class="imgt__bar"><button type="button" class="btn btn--accent" data-a="up">${I.upload}<span>Subir mi overlay (PNG)</span></button></div><p class="hint">Se añaden como capa independiente con su modo de fusión. Cambia modo, opacidad, posición u orden desde el panel derecho.</p><div class="ovgrid">${thumbs}</div><h3 class="imgt__h">Mis overlays</h3><div class="lib lib--img" id="ovl"></div></div>`,{ok:"Cerrar",wide:true,onOk:()=>true});
  const grid=m.el.querySelector("#ovl");
  const paint=()=>{grid.innerHTML=store.assets("overlay").map(x=>`<div class="lib__it" data-id="${x.id}"><img src="${esc(x.fields.url)}" alt="${esc(x.name)}" loading="lazy"><span>${esc(x.name)}</span><div class="lib__act"><button type="button" data-del title="Eliminar">${I["trash-2"]}</button></div></div>`).join("")||'<div class="hint">Aún no has subido overlays.</div>'};paint();
  m.el.addEventListener("click",async e=>{
    try{
      const del=e.target.closest("[data-del]");if(del){await store.removeAsset(del.closest(".lib__it").dataset.id);paint();return}
      const it=e.target.closest(".lib__it");if(it){const x=store.assets("overlay").find(a=>a.id===it.dataset.id);if(x){await ed.addOverlayImage(x.fields.url,x.name);m.close()}return}
      const ov=e.target.closest("[data-ov]");if(ov){await ed.addOverlay(ov.dataset.ov);m.close();return}
      if(e.target.closest('[data-a="up"]')){const fs=await pickFile(true);if(!fs.length)return;const t=toast("Subiendo…",{ms:600000});try{for(const f of fs){const url=await uploadAsset(f,"ov");await store.addAsset("overlay",f.name.replace(/\.[^.]+$/,"").slice(0,40)||"Overlay",url)}}finally{t.close()}paint()}
    }catch(er){toast(er.message,{kind:"err"})}
  });
}

export function openTextStyles(anchor,ed){
  if(pop){closePop();return}
  pop=document.createElement("div");pop.className="shapes tstyles";
  pop.innerHTML=`<div class="shapes__h"><span>Añadir texto</span><button type="button" class="shapes__x" data-x aria-label="Cerrar">${I.x}</button></div><div class="tstyles__l">${TEXT_STYLES.map(t=>{const p=t.p;return `<button type="button" class="tsty" data-id="${t.id}" aria-label="${t.name}"><span class="tsty__pv"><span style="font-family:'${p.fontFamily}';font-weight:${p.fontWeight};color:${p.fill};letter-spacing:${(p.charSpacing||0)/1000}em;${p.backgroundColor?`background:${p.backgroundColor};padding:2px 8px;`:""}${t.sh?"text-shadow:0 2px 6px rgba(0,0,0,.5);":""}font-size:${t.id==="title"||t.id==="price"?26:t.id==="tag"?16:t.id==="sub"?18:13}px">${({title:"Título",sub:"Subtítulo",tag:"NOVEDAD",body:"Frase breve…",price:"17,95 €"})[t.id]}</span></span><span class="tsty__t"><b>${t.name}</b><em>${t.hint}</em></span></button>`}).join("")}</div>`;
  pop.onclick=async e=>{if(e.target.closest("[data-x]")){closePop();return}const b=e.target.closest(".tsty");if(!b)return;const st=TEXT_STYLES.find(x=>x.id===b.dataset.id);closePop();await addStyled(ed,st)};
  document.body.appendChild(pop);const r=anchor.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;pop.style.left=Math.max(8,Math.min(r.right+8,innerWidth-pw-8))+"px";pop.style.top=Math.max(8,Math.min(r.top,innerHeight-ph-8))+"px";
  setTimeout(()=>document.addEventListener("mousedown",outside,true),0);
  const esc=e=>{if(e.key==="Escape"){closePop();document.removeEventListener("keydown",esc)}};document.addEventListener("keydown",esc);
}
