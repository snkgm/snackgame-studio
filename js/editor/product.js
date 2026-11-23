import {modal,toast,esc} from "../app/ui.js?v=20261123e";
import {cutoutFor,uploadOriginal} from "../img/matting.js?v=20261123e";
import {extractPalette} from "../img/color.js?v=20261123e";
import {productSearchHtml,bindProductSearch} from "../studio/productSearch.js?v=20261123e";
const img=u=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=()=>rej(new Error("No se pudo cargar la imagen"));i.src=u});
export async function applyProductImage(ed,{orig,blob,remove,method},onProgress){
  const rm=remove??(!ed.cfg.product||ed.cfg.product.removeBg!==false);
  const url=rm?await cutoutFor(orig,{blob,onProgress,method}):orig;
  const o=await ed.setProductImage(url,{orig});
  ed.palette=extractPalette(await img(url));
  if(ed.cfg.bg&&ed.cfg.bg.mode==="auto")await ed.applyBg();else ed.applyColorRules();
  ed.canvas.setActiveObject(o);ed.applyFields();ed.commit();return o;
}
export function openProductPicker(ed,afterApply){
  let pick=null;
  const m=modal("Producto",productSearchHtml(),{ok:"Usar este producto",wide:true,onOk:async()=>{
    if(!pick)throw new Error("Elige un producto o sube una imagen");
    const t=toast("Preparando producto…",{ms:600000});
    try{
      let orig=pick.product.image;
      if(pick.blob)orig=await uploadOriginal(pick.blob);
      const {image,preview,handle,...fields}=pick.product;
      ed.product={...ed.product,...fields,image:orig};
      await applyProductImage(ed,{orig,blob:pick.blob},msg=>{t.querySelector("span").textContent=msg});
      afterApply?.();t.close();toast("Producto aplicado");
    }catch(e){t.close();throw e}
  }});
  bindProductSearch(m.el,p=>{pick=p});
}
