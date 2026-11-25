import {db,publicUrl} from "../app/db.js?v=20261125n";
let worker,seq=0;const waits=new Map();
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL("./matting.worker.js?v=20261125n",import.meta.url),{type:"module"});
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
export const mattingDefaults={tol:10,holes:true};
export function flatMask(c,tol=mattingDefaults.tol,holes=mattingDefaults.holes){
  const w=c.width,h=c.height,d=c.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
  const px=(x,y)=>(y*w+x)*4,border=[];
  for(let x=0;x<w;x++){border.push(px(x,0),px(x,h-1))}for(let y=1;y<h-1;y++){border.push(px(0,y),px(w-1,y))}
  const med=k=>{const v=border.map(o=>d[o+k]).sort((a,b)=>a-b);return v[v.length>>1]};
  const bg=[med(0),med(1),med(2)];
  const dist=o=>Math.max(Math.abs(d[o]-bg[0]),Math.abs(d[o+1]-bg[1]),Math.abs(d[o+2]-bg[2]));
  const near=o=>dist(o)<=tol&&d[o+3]>200;
  const ok=border.filter(near).length/border.length;
  if(ok<.9)return null;
  const N=w*h,cand=new Uint8Array(N);
  for(let i=0;i<N;i++)if(near(i*4))cand[i]=1;
  const shrink=(a,r)=>{let cur=a;for(let k=0;k<r;k++){const n=new Uint8Array(N);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;n[i]=cur[i]&&cur[i-1]&&cur[i+1]&&cur[i-w]&&cur[i+w]?1:0}cur=n}return cur};
  const R=Math.max(2,Math.round(Math.max(w,h)/300));
  const core=shrink(cand,R);
  const isbg=new Uint8Array(N),st=new Int32Array(N);let sp=0;
  const push=(x,y)=>{const i=y*w+x;if(!isbg[i]&&core[i]){isbg[i]=1;st[sp++]=i}};
  for(let x=0;x<w;x++){for(let k=0;k<=R+1;k++){push(x,k);push(x,h-1-k)}}for(let y=0;y<h;y++){for(let k=0;k<=R+1;k++){push(k,y);push(w-1-k,y)}}
  while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;if(x>0)push(x-1,y);if(x<w-1)push(x+1,y);if(y>0)push(x,y-1);if(y<h-1)push(x,y+1)}
  for(let k=0;k<R;k++){const add=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!isbg[i]&&cand[i]&&(isbg[i-1]||isbg[i+1]||isbg[i-w]||isbg[i+w]))add.push(i)}add.forEach(i=>isbg[i]=1)}
  let fa=0;for(let i=0;i<N;i++)if(!isbg[i])fa++;
  const seen=new Uint8Array(N),htol=Math.max(4,Math.min(24,Math.round(tol/2.5))),tight=i=>dist(i*4)<=htol&&d[i*4+3]>200;
  for(let i0=0;holes&&i0<N;i0++){
    if(isbg[i0]||seen[i0]||!tight(i0))continue;
    const comp=[i0];seen[i0]=1;
    for(let k=0;k<comp.length;k++){const i=comp[k],x=i%w,y=(i/w)|0;
      for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!isbg[j]&&!seen[j]&&tight(j)){seen[j]=1;comp.push(j)}}
    if(comp.length>=150&&comp.length<fa*.06)for(const i of comp)isbg[i]=1;
  }
  const fg=new Uint8Array(N);for(let i=0;i<N;i++)fg[i]=isbg[i]?0:1;
  const er=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;er[i]=fg[i]&&(x>0?fg[i-1]:0)&&(x<w-1?fg[i+1]:0)&&(y>0?fg[i-w]:0)&&(y<h-1?fg[i+w]:0)?1:0}
  const m=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let a=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&X<w&&Y>=0&&Y<h){a+=er[Y*w+X];n++}}m[y*w+x]=Math.round(a/n*255)}
  return m;
}
export function defringe(im,w,h){
  const d=im.data,N=w*h,ring=Math.max(2,Math.round(Math.max(w,h)/700));
  const er=(a,r)=>{let c=a;for(let k=0;k<r;k++){const n=new Uint8Array(N);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let v=c[i];if(x>0&&c[i-1]<v)v=c[i-1];if(x<w-1&&c[i+1]<v)v=c[i+1];if(y>0&&c[i-w]<v)v=c[i-w];if(y<h-1&&c[i+w]<v)v=c[i+w];n[i]=v}c=n}return c};
  let a=new Uint8Array(N);for(let i=0;i<N;i++)a[i]=d[i*4+3];
  a=er(a,1);
  const src=new Uint8Array(N);for(let i=0;i<N;i++)src[i]=a[i]>=250?255:0;
  const col=er(src,ring),got=new Uint8Array(N);for(let i=0;i<N;i++)got[i]=col[i]?1:0;
  for(let p=0;p<ring+3;p++){const upd=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(got[i]||!a[i])continue;let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(got[j]){r+=d[j*4];g+=d[j*4+1];b+=d[j*4+2];n++}}
      if(n)upd.push(i,r/n,g/n,b/n)}
    for(let k=0;k<upd.length;k+=4){const i=upd[k];d[i*4]=upd[k+1];d[i*4+1]=upd[k+2];d[i*4+2]=upd[k+3];got[i]=1}
    if(!upd.length)break}
  const o=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(a[i]===255||a[i]===0){o[i]=a[i];continue}let s2=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<w&&Y<h){s2+=a[Y*w+X];n++}}o[i]=s2/n}
  for(let i=0;i<N;i++)d[i*4+3]=o[i];
  return im;
}
export function boxMask(c,minSolid=.9){
  const w=c.width,h=c.height,N=w*h,d=c.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
  const med=k=>{const v=[];for(let x=0;x<w;x++){v.push(d[(x)*4+k],d[((h-1)*w+x)*4+k])}for(let y=1;y<h-1;y++){v.push(d[(y*w)*4+k],d[(y*w+w-1)*4+k])}v.sort((a,b)=>a-b);return v[v.length>>1]};
  const bg=[med(0),med(1),med(2)];
  const cand=new Uint8Array(N);
  for(let i=0;i<N;i++){const o=i*4;if(d[o+3]<128)continue;const r=d[o],g=d[o+1],b=d[o+2],dist=Math.max(Math.abs(r-bg[0]),Math.abs(g-bg[1]),Math.abs(b-bg[2])),chroma=Math.max(r,g,b)-Math.min(r,g,b);
    if(chroma>=28?dist>30:dist>(bg[0]+bg[1]+bg[2]>600?95:60))cand[i]=1}
  const R=Math.max(2,Math.round(Math.max(w,h)/400)),dil=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!cand[y*w+x])continue;for(let dy=-R;dy<=R;dy++){const Y=y+dy;if(Y<0||Y>=h)continue;for(let dx=-R;dx<=R;dx++){const X=x+dx;if(X>=0&&X<w)dil[Y*w+X]=1}}}
  const lab=new Int32Array(N);let best=0,bestN=0,id=0;const st=new Int32Array(N);
  for(let i0=0;i0<N;i0++){if(!dil[i0]||lab[i0])continue;id++;let sp=0,n=0;st[sp++]=i0;lab[i0]=id;
    while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;if(cand[i])n++;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&dil[j]&&!lab[j]){lab[j]=id;st[sp++]=j}}
    if(n>bestN){bestN=n;best=id}}
  if(!best||bestN<N*.03)return null;
  const comp=new Uint8Array(N);for(let i=0;i<N;i++)comp[i]=cand[i]&&lab[i]===best?1:0;
  const pts=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(comp[i]&&(x===0||!comp[i-1]||x===w-1||!comp[i+1]||y===0||!comp[i-w]||y===h-1||!comp[i+w]))pts.push([x,y])}
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let k=pts.length-1;k>=0;k--){const p=pts[k];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  const hull=lo.slice(0,-1).concat(up.slice(0,-1));if(hull.length<4)return null;
  let area=0;for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];area+=a[0]*b[1]-b[0]*a[1]}area=Math.abs(area)/2;
  const o=document.createElement("canvas");o.width=w;o.height=h;const g=o.getContext("2d");g.fillStyle="#fff";g.beginPath();hull.forEach((p,i)=>i?g.lineTo(p[0]+.5,p[1]+.5):g.moveTo(p[0]+.5,p[1]+.5));g.closePath();g.fill();
  const hd=g.getImageData(0,0,w,h).data,m=new Uint8Array(N);let hullPx=0,inCand=0;
  for(let i=0;i<N;i++){m[i]=hd[i*4+3];if(m[i]>127){hullPx++;if(comp[i])inCand++}}
  // caja Funko: silueta convexa con pocos vértices (hexágono/rectángulo) y bastante contenido impreso
  const per=hull.reduce((t,p,i)=>{const q=hull[(i+1)%hull.length];return t+Math.hypot(p[0]-q[0],p[1]-q[1])},0),eps=per*.01;
  const dp=(pp,e)=>{if(pp.length<3)return 1;const A=pp[0],B=pp[pp.length-1];let mx=0,k=0;for(let i=1;i<pp.length-1;i++){const dd=Math.abs((B[0]-A[0])*(A[1]-pp[i][1])-(A[0]-pp[i][0])*(B[1]-A[1]))/(Math.hypot(B[0]-A[0],B[1]-A[1])||1);if(dd>mx){mx=dd;k=i}}return mx>e?dp(pp.slice(0,k+1),e)+dp(pp.slice(k),e):1};
  let far=0,fi=0;for(let i=1;i<hull.length;i++){const dd=Math.hypot(hull[i][0]-hull[0][0],hull[i][1]-hull[0][1]);if(dd>far){far=dd;fi=i}}
  const nv=dp(hull.slice(0,fi+1),eps)+dp(hull.slice(fi).concat([hull[0]]),eps);
  mattingInfo.box={nv,cover:inCand/Math.max(1,hullPx)};
  if(nv>8||inCand/Math.max(1,hullPx)<.2)return null;
  return m;
}
export const mattingInfo={method:""};
export async function removeBackground(blob,onProgress,method="auto",opt={}){
  const c=await toBitmapCanvas(blob);
  let mask=opt.box===false?null:boxMask(c);mattingInfo.method=mask?"caja":"";
  if(!mask){mask=method==="ai"?null:flatMask(c,opt.tol??mattingDefaults.tol,opt.holes??mattingDefaults.holes);mattingInfo.method=mask?"plano":"ia"}
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
  defringe(im,c.width,c.height);x.putImageData(im,0,0);
  const t=trimCanvas(c);
  return new Promise(r=>t.toBlob(r,"image/png"));
}
async function sha1(s){const b=await crypto.subtle.digest("SHA-1",typeof s==="string"?new TextEncoder().encode(s):s);return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,"0")).join("")}
export const hashKey=sha1;
const exists=async u=>{try{return (await fetch(u,{method:"HEAD"})).ok}catch{return false}};
export async function cutoutFor(srcUrl,{blob,onProgress,method="auto",tol,holes,force}={}){
  const t=tol??mattingDefaults.tol,h=holes??mattingDefaults.holes;
  const key=await sha1(srcUrl);const path=`cut/${key}-d3${method==="ai"?"-ai":`${t!==10?"-t"+t:""}${h?"":"-nh"}`}.png`;const url=publicUrl(path);
  if(!force&&await exists(url))return url;
  const b=blob||await (await fetch(srcUrl,{mode:"cors"})).blob();
  const cut=await removeBackground(b,onProgress,method,{tol:t,holes:h});
  return db.upload(path,cut);
}
export async function uploadOriginal(file){
  const key=await sha1(await file.arrayBuffer());const ext=(file.type.split("/")[1]||"png").replace("jpeg","jpg");
  return db.upload(`orig/${key}.${ext}`,file);
}
