import {CONFIG} from "./config.js?v=20261123e";
let cache=null,loading=null;
const fmtPrice=p=>p?Number(p).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €":"";
const clean=t=>t.replace(/^\s*(LANZAMIENTO|NOVEDAD|PRÓXIMAMENTE|RESERVA)[^|]*\|\s*/i,"").trim();
export function toProduct(p){
  const t=clean(p.title),n=/#\s?(\d{1,4})\b|\bn[ºo°]\s?(\d{1,4})\b/i.exec(p.title);
  return {name:t,number:n?(n[1]||n[2]):"",collection:(p.tags||[]).find(x=>/^[A-ZÁÉÍÓÚ0-9 ]{4,}$/.test(x)&&!/FUNKO|MARCAS/.test(x))||p.vendor||"",price:fmtPrice(p.variants&&p.variants[0]&&p.variants[0].price),category:p.product_type||"",web:"snackgame.es",image:(p.images&&p.images[0]&&p.images[0].src)||"",handle:p.handle};
}
export async function loadCatalog(){
  if(cache)return cache;
  loading??=(async()=>{
    const all=[];
    for(let page=1;page<=8;page++){
      const r=await fetch(`${CONFIG.SHOP_URL}/products.json?limit=250&page=${page}`);
      if(!r.ok)throw new Error("No se pudo leer el catálogo de la tienda");
      const j=await r.json();all.push(...j.products);if(j.products.length<250)break;
    }
    cache=all.filter(p=>p.images&&p.images.length);return cache;
  })().finally(()=>{loading=null});
  return loading;
}
export async function searchCatalog(q,limit=30){
  const all=await loadCatalog(),s=q.trim().toLowerCase();
  const list=s?all.filter(p=>(p.title+" "+(p.tags||[]).join(" ")+" "+p.product_type).toLowerCase().includes(s)):all;
  return list.slice(0,limit).map(toProduct);
}
