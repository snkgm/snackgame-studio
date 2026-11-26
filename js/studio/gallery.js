import {CONFIG} from "../app/config.js?v=20261126q";
import {toProduct} from "../app/catalog.js?v=20261126q";
export class Fatal extends Error{}
export const handleOf=u=>{try{const x=new URL(String(u).trim());if(!/(^|\.)snackgame\.es$/.test(x.hostname))return null;const m=/\/products\/([^/?#]+)/.exec(x.pathname);return m?decodeURIComponent(m[1]):null}catch{return null}};
export async function fetchProduct(url){
  const h=handleOf(url);if(!h)throw new Fatal("URL no válida: debe ser una ficha de snackgame.es");
  const r=await fetch(`${CONFIG.SHOP_URL}/products/${h}.json`);
  if(r.status===404)throw new Fatal("Producto no encontrado en la tienda");
  if(!r.ok)throw new Error("No se pudo leer la ficha ("+r.status+")");
  const p=(await r.json()).product;if(typeof p.tags==="string")p.tags=p.tags.split(",").map(t=>t.trim()).filter(Boolean);
  const images=(p.images||[]).slice().sort((a,b)=>a.position-b.position).map(i=>({id:i.id,src:i.src,w:i.width,h:i.height,alt:i.alt||""}));
  return {handle:h,title:p.title,images,product:toProduct(p)};
}
const thumbUrl=(src,w)=>{const u=new URL(src);u.searchParams.set("width",w);return u.toString()};
async function dhash(src){
  const r=await fetch(thumbUrl(src,72),{mode:"cors"});if(!r.ok)throw new Error("img");
  const bmp=await createImageBitmap(await r.blob());
  const c=document.createElement("canvas");c.width=9;c.height=8;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(bmp,0,0,9,8);
  const d=x.getImageData(0,0,9,8).data,g=i=>d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;let bits="";
  for(let y=0;y<8;y++)for(let i=0;i<8;i++)bits+=g(y*9+i)>g(y*9+i+1)?"1":"0";
  return bits;
}
const ham=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n};
export async function validateGallery(images,minPx=400){
  const out=[],seen=[];
  for(const im of images){
    const o={...im,ok:true,dup:false,why:""};
    if(im.w&&im.h&&Math.min(im.w,im.h)<minPx){o.ok=false;o.why="Resolución baja"}
    else try{
      const h=await dhash(im.src);o.hash=h;
      if(seen.some(s=>ham(s,h)<=4)){o.dup=true;o.why="Duplicada"}else seen.push(h);
    }catch{o.ok=false;o.why="No se puede descargar"}
    out.push(o);
  }
  return out;
}
export const usable=g=>g.filter(x=>x.ok&&!x.dup);
