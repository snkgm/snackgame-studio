import {db,publicUrl} from "../app/db.js?v=20261123l";
let worker,seq=0;const waits=new Map();
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL("./matting.worker.js?v=20261123l",import.meta.url),{type:"module"});
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
export function flatMask(c,tol=30){
  const w=c.width,h=c.height,d=c.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
  const px=(x,y)=>(y*w+x)*4,border=[];
  for(let x=0;x<w;x++){border.push(px(x,0),px(x,h-1))}for(let y=1;y<h-1;y++){border.push(px(0,y),px(w-1,y))}
  const med=k=>{const v=border.map(o=>d[o+k]).sort((a,b)=>a-b);return v[v.length>>1]};
  const bg=[med(0),med(1),med(2)];
  const near=o=>Math.max(Math.abs(d[o]-bg[0]),Math.abs(d[o+1]-bg[1]),Math.abs(d[o+2]-bg[2]))<=tol&&d[o+3]>200;
  const ok=border.filter(near).length/border.length;
  if(ok<.9)return null;
  const isbg=new Uint8Array(w*h),st=new Int32Array(w*h);let sp=0;
  const push=(x,y)=>{const i=y*w+x;if(!isbg[i]&&near(i*4)){isbg[i]=1;st[sp++]=i}};
  for(let x=0;x<w;x++){push(x,0);push(x,h-1)}for(let y=0;y<h;y++){push(0,y);push(w-1,y)}
  while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;if(x>0)push(x-1,y);if(x<w-1)push(x+1,y);if(y>0)push(x,y-1);if(y<h-1)push(x,y+1)}
  const fg=new Uint8Array(w*h);
  for(let i=0;i<fg.length;i++)fg[i]=isbg[i]?0:1;
  const er=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;er[i]=fg[i]&&(x>0?fg[i-1]:0)&&(x<w-1?fg[i+1]:0)&&(y>0?fg[i-w]:0)&&(y<h-1?fg[i+w]:0)?1:0}
  const m=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let a=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&X<w&&Y>=0&&Y<h){a+=er[Y*w+X];n++}}m[y*w+x]=Math.round(a/n*255)}
  return m;
}
export const mattingInfo={method:""};
export async function removeBackground(blob,onProgress,method="auto"){
  const c=await toBitmapCanvas(blob);
  let mask=method==="ai"?null:flatMask(c);mattingInfo.method=mask?"plano":"ia";
  if(!mask){
    if(globalThis.__mockMatting){mask=await globalThis.__mockMatting(c)}
    else{
      const id=++seq;const small=await new Promise(r=>c.toBlob(r,"image/png"));
      const res=await new Promise((res,rej)=>{waits.set(id,{res,rej,onp:onProgress});getWorker().postMessage({id,blob:small})});
      mask=res.mask;
    }
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
export async function cutoutFor(srcUrl,{blob,onProgress,method="auto"}={}){
  const key=await sha1(srcUrl);const path=`cut/${key}${method==="ai"?"-ai":""}.png`;const url=publicUrl(path);
  if(await exists(url))return url;
  const b=blob||await (await fetch(srcUrl,{mode:"cors"})).blob();
  const cut=await removeBackground(b,onProgress,method);
  return db.upload(path,cut);
}
export async function uploadOriginal(file){
  const key=await sha1(await file.arrayBuffer());const ext=(file.type.split("/")[1]||"png").replace("jpeg","jpg");
  return db.upload(`orig/${key}.${ext}`,file);
}
