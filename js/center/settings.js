import {store} from "../app/store.js?v=20261126c";
import {I} from "../app/icons.js?v=20261126c";
import {esc,toast} from "../app/ui.js?v=20261126c";
import {logoUrl,uploadLogo} from "../app/brand.js?v=20261126c";
export function mountSettings(root){
  const ST={post_types:{open:false,ren:{},del:new Set()},categories:{open:false,ren:{},del:new Set()}};
  const dirty=t=>Object.keys(ST[t].ren).length>0||ST[t].del.size>0;
  const block=(table,title,arr,ph)=>{const s=ST[table];return `<section class="set" data-blk="${table}"><div class="set__head"><h2 class="set__h">${title}</h2>${s.open?`<button class="btn${dirty(table)?" btn--accent":""}" data-save="${table}"${dirty(table)?"":" disabled"}>Guardar cambios</button><button class="btn" data-close="${table}">Cerrar</button>`:`<button class="btn" data-edit="${table}">${I.pencil}Editar</button>`}</div>${s.open?`<div class="set__list">${arr.map(a=>`<div class="set__row${s.del.has(a.id)?" is-del":""}" data-table="${table}" data-id="${a.id}"><input class="input" value="${esc(s.ren[a.id]??a.name)}" data-name aria-label="Nombre"${s.del.has(a.id)?" disabled":""}><button class="btn btn--ghost btn--icon" data-del aria-label="${s.del.has(a.id)?"Deshacer":"Eliminar"}" title="${s.del.has(a.id)?"Deshacer":"Eliminar"}">${s.del.has(a.id)?I["rotate-ccw"]||"↺":I["trash-2"]}</button></div>`).join("")||'<div class="empty">Sin elementos.</div>'}</div><form class="set__add" data-table="${table}"><input class="input" placeholder="${ph}" required><button class="btn">${I.plus}Añadir</button></form>`:`<div class="setr">${arr.map(a=>`<span class="tagx">${esc(a.name)}</span>`).join("")||'<span class="hint">Sin elementos.</span>'}</div>`}</section>`};
  function render(){
    if(!store.loaded){root.innerHTML='<div class="empty">Cargando…</div>';return}
    root.innerHTML=`<div class="settings"><div class="ctools"><h1 class="ctools__title">Tipos y categorías</h1></div><p class="hint">Se usan para clasificar publicaciones y, más adelante, plantillas. Al eliminar uno, las publicaciones que lo usaban quedan sin tipo o categoría.</p><div class="set__grid">${block("post_types","Tipos de publicación",store.types,"Nuevo tipo")}${block("categories","Categorías de producto",store.cats,"Nueva categoría")}<section class="set"><h2 class="set__h">Preset de texto por categoría</h2><p class="hint">Texto que se repite en todas las publicaciones de la categoría: hashtag de arriba y web de abajo.</p><div class="set__list">${store.cats.map(c=>`<div class="set__row set__row--p" data-cid="${c.id}"><span class="plabel">${esc(c.name)}</span><input class="input" data-preset="hashtag" value="${esc((c.preset||{}).hashtag||"")}" placeholder="#Hashtag" aria-label="Hashtag de ${esc(c.name)}"><input class="input" data-preset="web" value="${esc((c.preset||{}).web||"")}" placeholder="Snackgame.es" aria-label="Web de ${esc(c.name)}"></div>`).join("")}</div></section><section class="set"><h2 class="set__h">Marca</h2><div class="brand"><div class="brand__logo" id="logo-prev">${I.image}</div><div><button class="btn" id="logo-up">${I.upload}Subir logotipo</button><p class="hint">Se usa como capa independiente en el editor. Se guarda como PNG.</p></div></div></section></div></div>`;
    logoUrl().then(u=>{const p=root.querySelector("#logo-prev");if(u&&p)p.innerHTML=`<img src="${u}" alt="Logotipo">`});
  }
  root.addEventListener("change",async e=>{
    if(e.target.dataset.preset){const r=e.target.closest("[data-cid]"),c=store.cats.find(x=>x.id===r.dataset.cid);try{await store.setCatPreset(c.id,{...(c.preset||{}),[e.target.dataset.preset]:e.target.value.trim()});toast("Preset guardado")}catch(err){toast(err.message,{kind:"err"})}return}
    const row=e.target.closest(".set__row");if(!row||!e.target.matches("[data-name]"))return;
    const t=row.dataset.table,orig=(t==="post_types"?store.types:store.cats).find(x=>x.id===row.dataset.id),v=e.target.value.trim();
    if(!v||v===orig.name)delete ST[t].ren[orig.id];else ST[t].ren[orig.id]=v;render();
  });
  root.addEventListener("click",async e=>{
    if(e.target.closest("#logo-up")){const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=async()=>{if(!i.files[0])return;try{const u=await uploadLogo(i.files[0]);root.querySelector("#logo-prev").innerHTML=`<img src="${u}" alt="Logotipo">`;toast("Logotipo guardado")}catch(err){toast(err.message,{kind:"err"})}};i.click();return}
    const g=k=>e.target.closest(`[data-${k}]`);
    let x;
    if(x=g("edit")){ST[x.dataset.edit].open=true;render();return}
    if(x=g("close")){const t=x.dataset.close;ST[t].open=false;ST[t].ren={};ST[t].del=new Set();render();return}
    if(x=g("save")){const t=x.dataset.save,S=ST[t];try{for(const id of S.del)await store.removeLookup(t,id);for(const[id,n]of Object.entries(S.ren))if(!S.del.has(id))await store.renameLookup(t,id,n);S.ren={};S.del=new Set();toast("Cambios guardados");render()}catch(err){toast(err.message.includes("unique")||err.message.includes("duplicate")?"Ya existe ese nombre":err.message,{kind:"err"})}return}
    const b=g("del");if(!b)return;const row=b.closest(".set__row"),S=ST[row.dataset.table];S.del.has(row.dataset.id)?S.del.delete(row.dataset.id):S.del.add(row.dataset.id);render();
  });
  root.addEventListener("submit",async e=>{
    e.preventDefault();const f=e.target.closest(".set__add");const i=f.querySelector("input");const name=i.value.trim();if(!name)return;
    try{await store.addLookup(f.dataset.table,name);i.value=""}catch(err){toast(err.message.includes("duplicate")||err.message.includes("unique")?"Ya existe ese nombre":err.message,{kind:"err"})}
  });
  const off=store.on(()=>{if(!root.contains(document.activeElement)||document.activeElement.tagName!=="INPUT")render()});
  render();if(!store.loaded&&!store.error)store.load();
  return off;
}
