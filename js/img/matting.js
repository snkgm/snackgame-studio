import {db,publicUrl} from "../app/db.js?v=20261127e";
let worker,seq=0,noMain=false;const waits=new Map();
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL("./matting.worker.js?v=20261127e",import.meta.url),{type:"module"});
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
const hullOf=pts=>{pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let k=pts.length-1;k>=0;k--){const p=pts[k];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  return lo.slice(0,-1).concat(up.slice(0,-1))};
const edgePts=(m,w,h)=>{const pts=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(m[i]&&(x===0||!m[i-1]||x===w-1||!m[i+1]||y===0||!m[i-w]||y===h-1||!m[i+w]))pts.push([x,y])}return pts};
export function outline(c){
  const w=c.width,h=c.height,N=w*h,d=c.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
  const bd=[];for(let x=0;x<w;x++){bd.push(x*4,((h-1)*w+x)*4)}for(let y=1;y<h-1;y++){bd.push(y*w*4,(y*w+w-1)*4)}
  const med=k=>{const v=bd.map(o=>d[o+k]).sort((a,b)=>a-b);return v[v.length>>1]};
  const bg=[med(0),med(1),med(2)],dst=o=>d[o+3]<128?0:Math.max(Math.abs(d[o]-bg[0]),Math.abs(d[o+1]-bg[1]),Math.abs(d[o+2]-bg[2]));
  const bs=bd.map(dst).sort((a,b)=>a-b);if(bs[Math.floor(bs.length*.9)]>12)return null;
  const tb=Math.max(2,Math.min(10,bs[Math.floor(bs.length*.99)]+1)),like=new Uint8Array(N);
  for(let i=0;i<N;i++)like[i]=dst(i*4)<=tb?1:0;
  const out=new Uint8Array(N),st=new Int32Array(N);let sp=0;const push=i=>{if(like[i]&&!out[i]){out[i]=1;st[sp++]=i}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(y>0)push(i-w);if(y<h-1)push(i+w)}
  // sin motas sueltas: componentes del primer plano pequeños se descartan
  const F=new Uint8Array(N);let fa=0;for(let i=0;i<N;i++)if(!out[i]){F[i]=1;fa++}
  if(fa<N*.02||fa>N*.97)return null;
  const lab=new Int32Array(N),cnt=[0];let id=0;
  for(let i0=0;i0<N;i0++){if(!F[i0]||lab[i0])continue;id++;let n=0;sp=0;st[sp++]=i0;lab[i0]=id;
    while(sp){const i=st[--sp],x=i%w,y=(i/w)|0;n++;for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&F[j]&&!lab[j]){lab[j]=id;st[sp++]=j}}cnt.push(n)}
  const minN=Math.max(30,Math.round(N*.0005)),G=new Uint8Array(N);let ga=0;
  for(let i=0;i<N;i++)if(F[i]&&cnt[lab[i]]>=minN){G[i]=1;ga++}
  if(!ga)return null;
  const hull=hullOf(edgePts(G,w,h));if(hull.length<3)return null;
  let A=0;for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];A+=a[0]*b[1]-b[0]*a[1]}A=Math.abs(A)/2;
  return {hull,solidity:ga/Math.max(1,A),w,h,G};
}
export function simplify(hull,maxN=14){
  const per=hull.reduce((t,p,i)=>{const q=hull[(i+1)%hull.length];return t+Math.hypot(p[0]-q[0],p[1]-q[1])},0);
  const dp=(pp,e)=>{if(pp.length<3)return [pp[0]];const A=pp[0],B=pp[pp.length-1];let mx=0,k=0;for(let i=1;i<pp.length-1;i++){const dd=Math.abs((B[0]-A[0])*(A[1]-pp[i][1])-(A[0]-pp[i][0])*(B[1]-A[1]))/(Math.hypot(B[0]-A[0],B[1]-A[1])||1);if(dd>mx){mx=dd;k=i}}return mx>e?dp(pp.slice(0,k+1),e).concat(dp(pp.slice(k),e)):[A]};
  let far=0,fi=0;for(let i=1;i<hull.length;i++){const dd=Math.hypot(hull[i][0]-hull[0][0],hull[i][1]-hull[0][1]);if(dd>far){far=dd;fi=i}}
  let f=.005,r;for(let t=0;t<12;t++){r=dp(hull.slice(0,fi+1),per*f).concat(dp(hull.slice(fi).concat([hull[0]]),per*f));if(r.length<=maxN)break;f*=1.4}
  return r;
}
export function polyToMask(poly,w,h,{expand=0,feather=0}={}){
  const o=document.createElement("canvas");o.width=w;o.height=h;const g=o.getContext("2d");g.fillStyle="#fff";g.strokeStyle="#fff";g.lineJoin="round";
  const path=()=>{g.beginPath();poly.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()};
  path();g.fill();if(expand>0){g.lineWidth=expand*2;path();g.stroke()}
  if(expand<0){g.globalCompositeOperation="destination-out";g.lineWidth=-expand*2;path();g.stroke();g.globalCompositeOperation="source-over"}
  if(feather<=0)return o;
  const f=document.createElement("canvas");f.width=w;f.height=h;const fg=f.getContext("2d");fg.filter=`blur(${feather}px)`;fg.drawImage(o,0,0);return f;
}
export function boxMask(c){
  const r=outline(c);if(!r||r.solidity<.95)return null;
  const o=polyToMask(r.hull,c.width,c.height),d=o.getContext("2d").getImageData(0,0,c.width,c.height).data,m=new Uint8Array(c.width*c.height);
  for(let i=0;i<m.length;i++)m[i]=d[i*4+3];mattingInfo.box={solidity:r.solidity};return m;
}
export async function uploadCut(blob){
  const key=await sha1(await blob.arrayBuffer());return db.upload(`cut/pt-${key}.png`,blob);
}
export const mattingInfo={method:""};
export async function removeBackground(blob,onProgress,method="auto",opt={}){
  const c=await toBitmapCanvas(blob);
  let mask=(opt.box??(method==="ai"||method==="smart"))?boxMask(c):null;mattingInfo.method=mask?"caja":"";
  if(!mask){mask=(method==="ai"||method==="smart")?null:flatMask(c,opt.tol??mattingDefaults.tol,opt.holes??mattingDefaults.holes);mattingInfo.method=mask?"plano":"ia"}
  if(!mask&&globalThis.__cutServiceUrl){
    try{const small=await new Promise(r=>c.toBlob(r,"image/png"));onProgress?.("Recortando en la nube (BiRefNet)…");
      const rr=await fetch(globalThis.__cutServiceUrl,{method:"POST",body:small});if(!rr.ok)throw new Error("servicio "+rr.status);
      const bm=await createImageBitmap(await rr.blob());if(bm.width!==c.width||bm.height!==c.height)throw new Error("tamaño");
      const t=document.createElement("canvas");t.width=bm.width;t.height=bm.height;const tx=t.getContext("2d",{willReadFrequently:true});tx.drawImage(bm,0,0);
      const d=tx.getImageData(0,0,t.width,t.height).data;mask=new Uint8Array(t.width*t.height);for(let i=0;i<mask.length;i++)mask[i]=d[i*4];mattingInfo.method="birefnet";
    }catch(e){mask=null}
  }
  if(!mask){
    if(globalThis.__mockMatting){mask=await globalThis.__mockMatting(c)}
    else try{
      const id=++seq;const small=await new Promise(r=>c.toBlob(r,"image/png"));
      const run=only=>new Promise((res,rej)=>{const i2=++seq;waits.set(i2,{res,rej,onp:onProgress});getWorker().postMessage({id:i2,blob:small,only})});
      let res;try{res=await run(noMain?"ORMBG":undefined)}catch(e){if(noMain)throw e;noMain=true;try{worker?.terminate()}catch{}worker=null;onProgress?.("Modelo principal falló; usando el alternativo…");res=await run("ORMBG")}
      mask=res.mask;
    }catch(e){if(method!=="smart")throw e;mask=null}
    if(mask)    {mask=solidify(mask,c.width,c.height);if(mattingInfo.method!=="birefnet")mask=completeWithSilhouette(mask,c);
    }
    if(!mask){mask=flatMask(c,opt.tol??mattingDefaults.tol,opt.holes??mattingDefaults.holes);mattingInfo.method="plano"}
  }
  const x=c.getContext("2d",{willReadFrequently:true}),im=x.getImageData(0,0,c.width,c.height);
  for(let i=0;i<mask.length;i++)im.data[i*4+3]=mask[i];
  defringe(im,c.width,c.height);x.putImageData(im,0,0);
  const t=trimCanvas(c);
  return new Promise(r=>t.toBlob(r,"image/png"));
}
export function solidify(m,w,h,r=3){
  const N=w*h,o=new Uint8Array(N);
  for(let i=0;i<N;i++){const a=m[i];o[i]=a<14?0:a>=110?255:Math.round((a-14)/96*255)}
  const bin=new Uint8Array(N);for(let i=0;i<N;i++)bin[i]=o[i]>12?1:0;
  const out=new Uint8Array(N),st=[];
  const push=i=>{if(!bin[i]&&!out[i]){out[i]=1;st.push(i)}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(st.length){const i=st.pop(),x=i%w;if(x>0)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<N-w)push(i+w)}
  for(let i=0;i<N;i++)if(!bin[i]&&!out[i])o[i]=255;
  const e=new Uint8Array(N),f=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=1;for(let d=-r;d<=r&&k;d++){const xx=x+d;if(xx<0||xx>=w||!(bin[y*w+xx]||(!out[y*w+xx])))k=0}e[y*w+x]=k}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let k=1;for(let d=-r;d<=r&&k;d++){const yy=y+d;if(yy<0||yy>=h||!e[yy*w+x])k=0}f[y*w+x]=k}
  for(let i=0;i<N;i++)if(f[i])o[i]=255;
  return o;
}
export function completeWithSilhouette(mask,c){
  try{
    const o=outline(c);if(!o||!o.G)return mask;
    const w=c.width,h=c.height,N=w*h,bin=new Uint8Array(N);for(let i=0;i<N;i++)bin[i]=mask[i]>128?1:0;
    const hh=hullOf(edgePts(bin,w,h));if(hh.length<3)return mask;
    const hm=polyToMask(hh,w,h,{expand:Math.max(6,Math.round(Math.max(w,h)/80))}).getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
    const out=new Uint8Array(mask);
    const D=new Uint8Array(N);for(let i=0;i<N;i++)D[i]=(o.G[i]&&hm[i*4+3]>128&&!bin[i])?1:0;
    const r=Math.max(2,Math.round(Math.max(w,h)/260));
    const step=(a,er)=>{const n=new Uint8Array(N);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let v=a[i];if(er){if(v){if(x>0&&!a[i-1]||x<w-1&&!a[i+1]||y>0&&!a[i-w]||y<h-1&&!a[i+w])v=0}}else if(!v){if(x>0&&a[i-1]||x<w-1&&a[i+1]||y>0&&a[i-w]||y<h-1&&a[i+w])v=1}n[i]=v}return n};
    let E=D;for(let k=0;k<r;k++)E=step(E,true);
    for(let k=0;k<r-1;k++){E=step(E,false);for(let i=0;i<N;i++)if(!D[i])E[i]=0}
    const lab=new Int32Array(N),cn=[0],stk=[];let id=0;
    for(let i0=0;i0<N;i0++){if(!E[i0]||lab[i0])continue;id++;let n=0;stk.length=0;stk.push(i0);lab[i0]=id;
      while(stk.length){const i=stk.pop(),x=i%w;n++;if(x>0&&E[i-1]&&!lab[i-1]){lab[i-1]=id;stk.push(i-1)}if(x<w-1&&E[i+1]&&!lab[i+1]){lab[i+1]=id;stk.push(i+1)}if(i>=w&&E[i-w]&&!lab[i-w]){lab[i-w]=id;stk.push(i-w)}if(i<N-w&&E[i+w]&&!lab[i+w]){lab[i+w]=id;stk.push(i+w)}}cn.push(n)}
    const minA=N*.0025;
    for(let i=0;i<N;i++)if(E[i]&&cn[lab[i]]>=minA&&out[i]<255)out[i]=255;
    const Fm=new Uint8Array(N);for(let i=0;i<N;i++)Fm[i]=(o.G[i]&&hm[i*4+3]>128&&!bin[i])?1:0;
    const lb=new Int32Array(N),stk2=[];let id2=0;
    for(let i0=0;i0<N;i0++){if(!Fm[i0]||lb[i0])continue;id2++;const mem=[];let ins=0,outs=0;stk2.length=0;stk2.push(i0);lb[i0]=id2;
      while(stk2.length){const i=stk2.pop(),x=i%w;mem.push(i);
        const nb=[x>0?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<N-w?i+w:-1];
        for(const j of nb){if(j<0){outs++;continue}if(Fm[j]){if(!lb[j]){lb[j]=id2;stk2.push(j)}}else if(bin[j])ins++;else outs++}}
      if(mem.length>=4&&ins>=outs*1.5)for(const i of mem)out[i]=255}
    return out;
  }catch{return mask}
}
async function sha1(s){const b=await crypto.subtle.digest("SHA-1",typeof s==="string"?new TextEncoder().encode(s):s);return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,"0")).join("")}
export const hashKey=sha1;
const exists=async u=>{try{return (await fetch(u,{method:"HEAD"})).ok}catch{return false}};
export async function cutoutFor(srcUrl,{blob,onProgress,method="smart",tol,holes,force}={}){
  const t=tol??mattingDefaults.tol,h=holes??mattingDefaults.holes;
  const key=await sha1(srcUrl);const path=`cut/${key}-d15${method==="smart"?"-sm":""}${method==="ai"?"-ai":`${t!==10?"-t"+t:""}${h?"":"-nh"}`}.png`;const url=publicUrl(path);
  if(!force&&await exists(url))return url;
  const b=blob||await (await fetch(srcUrl,{mode:"cors"})).blob();
  const cut=await removeBackground(b,onProgress,method,{tol:t,holes:h});
  return db.upload(path,cut);
}
export async function uploadOriginal(file){
  const key=await sha1(await file.arrayBuffer());const ext=(file.type.split("/")[1]||"png").replace("jpeg","jpg");
  return db.upload(`orig/${key}.${ext}`,file);
}
