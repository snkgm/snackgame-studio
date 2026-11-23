import {db,publicUrl} from "../app/db.js?v=20261123d";
let worker,seq=0;const waits=new Map();
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL("./matting.worker.js?v=20261123d",import.meta.url),{type:"module"});
  worker.onmessage=e=>{const w=waits.get(e.data.id);if(!w)return;if(e.data.progress){w.onp?.(e.data.progress);return}waits.delete(e.data.id);e.data.error?w.rej(new Error(e.data.error)):w.res(e.data)};
  worker.onerror=e=>{waits.forEach(w=>w.rej(new Error("El modelo no se pudo iniciar")));waits.clear();worker=null};
  return worker;
}
const MAXPX=1600;
async function toBitmapCanvas(blob){
  const bmp=await createImageBitmap(blob);const k=Math.min(1,MAXPX/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);return c;
}
export function alphaBBox(c,thr=12){
  const x=c.getContext("2d",{willReadFrequently:true}),d=x.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=-1,y1=-1;
  for(let y=0;y<c.height;y++)for(let i=0;i<c.width;i++){if(d[(y*c.width+i)*4+3]>thr){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y}}
  return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
export function trimCanvas(c,pad=2){
  const b=alphaBBox(c);if(!b)return c;
  const x=Math.max(0,b.x-pad),y=Math.max(0,b.y-pad),w=Math.min(c.width-x,b.w+pad*2),h=Math.min(c.height-y,b.h+pad*2);
  const o=document.createElement("canvas");o.width=w;o.height=h;o.getContext("2d").drawImage(c,x,y,w,h,0,0,w,h);return o;
}
export async function removeBackground(blob,onProgress){
  const c=await toBitmapCanvas(blob);
  let mask;
  if(globalThis.__mockMatting){mask=await globalThis.__mockMatting(c)}
  else{
    const id=++seq;const small=await new Promise(r=>c.toBlob(r,"image/png"));
    const res=await new Promise((res,rej)=>{waits.set(id,{res,rej,onp:onProgress});getWorker().postMessage({id,blob:small})});
    mask=res.mask;
  }
  const x=c.getContext("2d",{willReadFrequently:true}),im=x.getImageData(0,0,c.width,c.height);
  for(let i=0;i<mask.length;i++)im.data[i*4+3]=mask[i];
  x.putImageData(im,0,0);
  const t=trimCanvas(c);
  return new Promise(r=>t.toBlob(r,"image/png"));
}
async function sha1(s){const b=await crypto.subtle.digest("SHA-1",typeof s==="string"?new TextEncoder().encode(s):s);return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,"0")).join("")}
export const hashKey=sha1;
const exists=async u=>{try{return (await fetch(u,{method:"HEAD"})).ok}catch{return false}};
export async function cutoutFor(srcUrl,{blob,onProgress}={}){
  const key=await sha1(srcUrl);const path=`cut/${key}.png`;const url=publicUrl(path);
  if(await exists(url))return url;
  const b=blob||await (await fetch(srcUrl,{mode:"cors"})).blob();
  const cut=await removeBackground(b,onProgress);
  return db.upload(path,cut);
}
export async function uploadOriginal(file){
  const key=await sha1(await file.arrayBuffer());const ext=(file.type.split("/")[1]||"png").replace("jpeg","jpg");
  return db.upload(`orig/${key}.${ext}`,file);
}
