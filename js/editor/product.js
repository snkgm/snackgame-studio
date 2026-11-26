import {modal,toast,esc} from "../app/ui.js?v=20261127e";
import {cutoutFor,uploadOriginal} from "../img/matting.js?v=20261127e";
import {extractPalette} from "../img/color.js?v=20261127e";
import {store} from "../app/store.js?v=20261127e";
import {fetchProduct} from "../studio/gallery.js?v=20261127e";
import {productSearchHtml,bindProductSearch} from "../studio/productSearch.js?v=20261127e";
const img=u=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=()=>rej(new Error("No se pudo cargar la imagen"));i.src=u});
export async function applyProductImage(ed,{orig,blob,remove,method,tol,holes,force},onProgress){
  const rm=remove??(!ed.cfg.product||ed.cfg.product.removeBg!==false);
  const url=rm?await cutoutFor(orig,{blob,onProgress,method,tol,holes,force}):orig;
  const had=!!ed.productLayer();
  const o=await ed.setProductImage(url,{orig});
  if(!had&&!(o.rule&&o.rule.floor))ed.autoFloor();
  ed.palette=extractPalette(await img(url));
  if(ed.cfg.bg&&ed.cfg.bg.mode==="auto")await ed.applyBg();else ed.applyColorRules();
  ed.canvas.setActiveObject(o);ed.applyFields();ed.commit();return o;
}
export function openProductPicker(ed,afterApply){
  let pick=null,gal=null,sel=[0];
  const m=modal("Producto",productSearchHtml(),{ok:"Usar este producto",wide:true,onOk:async()=>{
    if(!pick)throw new Error("Elige un producto o sube una imagen");
    const t=toast("Preparando producto…",{ms:600000});
    try{
      let orig=pick.product.image;const extra=pick.extra;
      if(pick.blob)orig=await uploadOriginal(pick.blob);
      const {image,preview,...fields}=pick.product;
      const pp=store.presetFor(pick.product);
      ed.product={...ed.product,...fields,...(pp?pp.fields:{}),image:orig};
      if(pp&&pp.bg){ed.cfg.bg={...ed.bgCfg,...pp.bg};await ed.applyBg()}
      await applyProductImage(ed,{orig,blob:pick.blob},msg=>{t.querySelector("span").textContent=msg});
      if(extra)await ed.addImage(extra,{name:"Imagen 2"});
      afterApply?.();t.close();toast("Producto aplicado");
    }catch(e){t.close();throw e}
  }});
  const root=m.el.querySelector(".psearch"),th=(u,w=160)=>{try{const x=new URL(u);x.searchParams.set("width",w);return x.toString()}catch{return u}};
  root.insertAdjacentHTML("afterbegin",`<div class="row"><input class="input" id="pu" placeholder="Pega un enlace de snackgame.es/products/…" autocomplete="off"><button class="btn" type="button" data-pu>Cargar enlace</button></div>`);
  root.insertAdjacentHTML("beforeend",`<div class="pgal" id="pg" hidden></div>`);
  const G=root.querySelector("#pg"),box=root.querySelector("#ps-s");
  const upd=()=>{if(!gal)return;const a=sel.map(i=>gal.images[i]).filter(Boolean);
    pick={product:{...gal.product,image:a[0]?.src||gal.product.image},extra:a[1]?.src||null,blob:null};
    G.querySelectorAll(".pg").forEach((b,i)=>{const k=sel.indexOf(i);b.classList.toggle("is-on",k>=0);b.dataset.n=k>=0?k+1:""});
    box.hidden=false;box.innerHTML=`<img src="${esc(th(pick.product.image,96))}" alt=""><div><b>${esc(pick.product.name)}</b><span>${esc([pick.product.price,pick.product.collection].filter(Boolean).join(" · "))}${pick.extra?" · 2 imágenes":""}</span></div>`};
  async function loadGal(url){
    G.hidden=false;G.innerHTML='<div class="hint">Leyendo la ficha…</div>';
    try{gal=await fetchProduct(url);sel=gal.images.length?[0]:[];
      G.innerHTML=`<div class="hint">Elige 1 o 2 imágenes (la 1.ª es el producto, la 2.ª se añade como capa)</div><div class="pg__r">${gal.images.map((im,i)=>`<button type="button" class="pg" data-i="${i}"><img src="${esc(th(im.src))}" alt="" loading="lazy"></button>`).join("")}</div>`;upd()}
    catch(e){gal=null;G.innerHTML=`<div class="hint">${esc(e.message)}</div>`}
  }
  G.addEventListener("click",e=>{const b=e.target.closest(".pg");if(!b)return;const i=+b.dataset.i,k=sel.indexOf(i);
    if(k>=0){if(sel.length>1)sel.splice(k,1)}else if(sel.length<2)sel.push(i);else sel[1]=i;upd()});
  const go=()=>{const v=root.querySelector("#pu").value.trim();if(v)loadGal(v)};
  root.querySelector("[data-pu]").onclick=go;root.querySelector("#pu").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go()}});
  root.querySelector("#pu").addEventListener("paste",()=>setTimeout(go,50));
  bindProductSearch(m.el,p=>{pick=p;gal=null;G.hidden=true;if(p.product&&p.product.handle)loadGal("https://snackgame.es/products/"+p.product.handle)});
}
