import {store} from "../app/store.js?v=20261123o";
import {I} from "../app/icons.js?v=20261123o";
import {esc,toast} from "../app/ui.js?v=20261123o";
import {logoUrl,uploadLogo} from "../app/brand.js?v=20261123o";
export function mountSettings(root){
  const block=(table,title,arr,ph)=>`<section class="set"><h2 class="set__h">${title}</h2><div class="set__list">${arr.map(a=>`<div class="set__row" data-table="${table}" data-id="${a.id}"><input class="input" value="${esc(a.name)}" data-name aria-label="Nombre"><button class="btn btn--ghost btn--icon" data-del aria-label="Eliminar" title="Eliminar">${I["trash-2"]}</button></div>`).join("")||'<div class="empty">Sin elementos.</div>'}</div><form class="set__add" data-table="${table}"><input class="input" placeholder="${ph}" required><button class="btn btn--accent">${I.plus}Añadir</button></form></section>`;
  function render(){
    if(!store.loaded){root.innerHTML='<div class="empty">Cargando…</div>';return}
    root.innerHTML=`<div class="settings"><div class="ctools"><h1 class="ctools__title">Tipos y categorías</h1></div><p class="hint">Se usan para clasificar publicaciones y, más adelante, plantillas. Al eliminar uno, las publicaciones que lo usaban quedan sin tipo o categoría.</p><div class="set__grid">${block("post_types","Tipos de publicación",store.types,"Nuevo tipo")}${block("categories","Categorías de producto",store.cats,"Nueva categoría")}<section class="set"><h2 class="set__h">Preset de texto por categoría</h2><p class="hint">Texto que se repite en todas las publicaciones de la categoría: hashtag de arriba y web de abajo.</p><div class="set__list">${store.cats.map(c=>`<div class="set__row set__row--p" data-cid="${c.id}"><span class="plabel">${esc(c.name)}</span><input class="input" data-preset="hashtag" value="${esc((c.preset||{}).hashtag||"")}" placeholder="#Hashtag" aria-label="Hashtag de ${esc(c.name)}"><input class="input" data-preset="web" value="${esc((c.preset||{}).web||"")}" placeholder="Snackgame.es" aria-label="Web de ${esc(c.name)}"></div>`).join("")}</div></section><section class="set"><h2 class="set__h">Marca</h2><div class="brand"><div class="brand__logo" id="logo-prev">${I.image}</div><div><button class="btn" id="logo-up">${I.upload}Subir logotipo</button><p class="hint">Se usa como capa independiente en el editor. Se guarda como PNG.</p></div></div></section></div></div>`;
    logoUrl().then(u=>{const p=root.querySelector("#logo-prev");if(u&&p)p.innerHTML=`<img src="${u}" alt="Logotipo">`});
  }
  root.addEventListener("change",async e=>{
    if(e.target.dataset.preset){const r=e.target.closest("[data-cid]"),c=store.cats.find(x=>x.id===r.dataset.cid);try{await store.setCatPreset(c.id,{...(c.preset||{}),[e.target.dataset.preset]:e.target.value.trim()});toast("Preset guardado")}catch(err){toast(err.message,{kind:"err"})}return}
    const row=e.target.closest(".set__row");if(!row||!e.target.matches("[data-name]"))return;
    const name=e.target.value.trim();if(!name){render();return}
    try{await store.renameLookup(row.dataset.table,row.dataset.id,name)}catch(err){toast(err.message.includes("unique")||err.message.includes("duplicate")?"Ya existe ese nombre":err.message,{kind:"err"});render()}
  });
  root.addEventListener("click",async e=>{
    if(e.target.closest("#logo-up")){const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=async()=>{if(!i.files[0])return;try{const u=await uploadLogo(i.files[0]);root.querySelector("#logo-prev").innerHTML=`<img src="${u}" alt="Logotipo">`;toast("Logotipo guardado")}catch(err){toast(err.message,{kind:"err"})}};i.click();return}
    const b=e.target.closest("[data-del]");if(!b)return;const row=b.closest(".set__row");
    try{await store.removeLookup(row.dataset.table,row.dataset.id);toast("Eliminado")}catch(err){toast(err.message,{kind:"err"})}
  });
  root.addEventListener("submit",async e=>{
    e.preventDefault();const f=e.target.closest(".set__add");const i=f.querySelector("input");const name=i.value.trim();if(!name)return;
    try{await store.addLookup(f.dataset.table,name);i.value=""}catch(err){toast(err.message.includes("duplicate")||err.message.includes("unique")?"Ya existe ese nombre":err.message,{kind:"err"})}
  });
  const off=store.on(()=>{if(!root.contains(document.activeElement)||document.activeElement.tagName!=="INPUT")render()});
  render();if(!store.loaded&&!store.error)store.load();
  return off;
}
