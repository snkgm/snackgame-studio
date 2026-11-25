import {searchCatalog} from "../app/catalog.js?v=20261126j";
import {esc} from "../app/ui.js?v=20261126j";
import {I} from "../app/icons.js?v=20261126j";
export const productSearchHtml=()=>`<div class="psearch"><div class="row"><input class="input" id="ps-q" placeholder="Buscar en la tienda (nombre, colección…)" autocomplete="off"><button class="btn" type="button" data-up>${I.upload}Subir imagen</button></div><div class="plist" id="ps-l" role="listbox" aria-label="Productos"></div><div class="psel" id="ps-s" hidden></div></div>`;
export function bindProductSearch(root,onPick){
  const q=root.querySelector("#ps-q"),list=root.querySelector("#ps-l"),sel=root.querySelector("#ps-s");let t,items=[];
  const show=p=>{sel.hidden=!p;if(p)sel.innerHTML=`<img src="${esc(p.image||p.preview)}" alt=""><div><b>${esc(p.name||"Imagen subida")}</b><span>${esc([p.price,p.collection].filter(Boolean).join(" · "))}</span></div>`};
  async function load(){
    list.innerHTML='<div class="hint">Cargando catálogo…</div>';
    try{items=await searchCatalog(q.value);list.innerHTML=items.map((p,i)=>`<button type="button" class="pitem" data-i="${i}" role="option"><img src="${esc(p.image)}" alt="" loading="lazy"><span>${esc(p.name)}</span><em>${esc(p.price)}</em></button>`).join("")||'<div class="hint">Sin resultados</div>'}
    catch(e){list.innerHTML=`<div class="hint">${esc(e.message)}. Puedes subir la imagen a mano.</div>`}
  }
  q.addEventListener("input",()=>{clearTimeout(t);t=setTimeout(load,250)});
  list.addEventListener("click",e=>{const b=e.target.closest(".pitem");if(!b)return;const p=items[+b.dataset.i];list.querySelectorAll(".is-on").forEach(n=>n.classList.remove("is-on"));b.classList.add("is-on");show(p);onPick({product:p,blob:null})});
  root.querySelector("[data-up]").onclick=()=>{const i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=()=>{const f=i.files[0];if(!f)return;const p={name:f.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," "),preview:URL.createObjectURL(f),web:"snackgame.es"};show(p);onPick({product:p,blob:f})};i.click()};
  load();
  return {clear:()=>show(null)};
}
