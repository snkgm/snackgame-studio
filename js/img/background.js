import {adjust,rgba,shade,rng,clamp} from "./color.js?v=20261126d";
export const GRAD_DEFAULT={type:"linear",angle:135,cx:50,cy:50,stops:[{p:0,c:"#3b2f8f"},{p:55,c:"#8f2f6a"},{p:100,c:"#ffb400"}]};
export const BG_DEFAULT={mode:"auto",n:3,blur:60,angle:135,spread:50,lum:0,sat:0,light:45,edge:55,opacity:80,seed:1,lightX:50,lightY:42,solid:"#14141c",tex:0,colors:null,img:"",imgFit:"cover"};
const EDGE_CLEAR=1;
export function bgColors(cfg,palette){
  const src=(cfg.colors&&cfg.colors.length?cfg.colors:palette&&palette.length?palette:["#3b2f8f","#8f2f6a","#ffb400"]);
  const base=src.slice(0,cfg.n);while(base.length<cfg.n)base.push(shade(base[0],base.length%2?-.2:.18));
  return base.map(c=>adjust(c,{lum:cfg.lum,sat:cfg.sat}));
}
export function renderBackground(W,H,cfg,palette,out){
  const c=out||document.createElement("canvas");c.width=Math.round(W);c.height=Math.round(H);
  const x=c.getContext("2d");const cols=bgColors(cfg,palette);const rand=rng(cfg.seed*7919+cfg.n);
  const a=(cfg.angle-90)*Math.PI/180,L=Math.abs(Math.cos(a))*W+Math.abs(Math.sin(a))*H,cx=W/2,cy=H/2;
  const g=x.createLinearGradient(cx-Math.cos(a)*L/2,cy-Math.sin(a)*L/2,cx+Math.cos(a)*L/2,cy+Math.sin(a)*L/2);
  const m=clamp(cfg.spread/100,.05,.95);
  if(cols.length===1){g.addColorStop(0,shade(cols[0],.12));g.addColorStop(m,cols[0]);g.addColorStop(1,shade(cols[0],-.2))}
  else if(cols.length===2){g.addColorStop(0,cols[0]);g.addColorStop(m,cols[0]);g.addColorStop(Math.min(1,m+.0001),cols[1]);g.addColorStop(1,cols[1])}
  else{g.addColorStop(0,cols[0]);g.addColorStop(m,cols[1]);g.addColorStop(1,cols[2])}
  if(cols.length===2){const g2=x.createLinearGradient(cx-Math.cos(a)*L/2,cy-Math.sin(a)*L/2,cx+Math.cos(a)*L/2,cy+Math.sin(a)*L/2);const soft=.04+(cfg.blur/100)*.55;g2.addColorStop(0,cols[0]);g2.addColorStop(clamp(m-soft,0,1),cols[0]);g2.addColorStop(clamp(m+soft,0,1),cols[1]);g2.addColorStop(1,cols[1]);x.fillStyle=g2}
  else x.fillStyle=g;
  x.fillRect(0,0,W,H);
  const op=clamp(cfg.opacity/100);
  x.save();x.globalAlpha=op;
  const hard=clamp(1-cfg.blur/100,0,1)*.7;
  cols.forEach((col,i)=>{
    const r=Math.max(W,H)*(.45+rand()*.3),px=W*(.15+rand()*.7),py=H*(.15+rand()*.7);
    const rg=x.createRadialGradient(px,py,0,px,py,r);rg.addColorStop(0,rgba(shade(col,.1),.85));rg.addColorStop(Math.max(.01,hard),rgba(col,.55));rg.addColorStop(1,rgba(col,0));
    x.fillStyle=rg;x.fillRect(0,0,W,H);
  });
  const li=clamp(cfg.light/100);
  if(li>0){const lx=W*cfg.lightX/100,ly=H*cfg.lightY/100,r=Math.max(W,H)*.55;const lg=x.createRadialGradient(lx,ly,0,lx,ly,r);lg.addColorStop(0,rgba(shade(cols[0],.4),.9*li));lg.addColorStop(.5,rgba(shade(cols[0],.25),.35*li));lg.addColorStop(1,rgba(cols[0],0));x.globalCompositeOperation="screen";x.fillStyle=lg;x.fillRect(0,0,W,H);x.globalCompositeOperation="source-over"}
  const ed=clamp(cfg.edge/100);
  if(ed>0){const r=Math.hypot(W,H)/2;const vg=x.createRadialGradient(W/2,H/2,r*.35,W/2,H/2,r);vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,`rgba(0,0,0,${.85*ed})`);x.fillStyle=vg;x.fillRect(0,0,W,H)}
  x.restore();
  const tx=clamp((cfg.tex||0)/100);
  if(tx>0){
    const t=document.createElement("canvas");t.width=t.height=256;const tc=t.getContext("2d"),im=tc.createImageData(256,256),r2=rng(cfg.seed*31+7);
    for(let i=0;i<im.data.length;i+=4){const v=r2()>.5?255:0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}
    tc.putImageData(im,0,0);
    x.save();x.globalAlpha=tx;x.fillStyle=x.createPattern(t,"repeat");x.fillRect(0,0,W,H);x.restore();
  }
  return c;
}
export const bgDataUrl=(W,H,cfg,palette)=>{const c=renderBackground(Math.round(W/2),Math.round(H/2),cfg,palette);return c.toDataURL("image/jpeg",.9)};

export function renderGradient(W,H,g,out){
  g={...GRAD_DEFAULT,...(g||{})};const c=out||document.createElement("canvas");c.width=Math.round(W);c.height=Math.round(H);const x=c.getContext("2d");
  let gr;
  if(g.type==="radial"){const cx=W*g.cx/100,cy=H*g.cy/100,r=Math.max(Math.hypot(Math.max(cx,W-cx),Math.max(cy,H-cy)),1);gr=x.createRadialGradient(cx,cy,0,cx,cy,r)}
  else{const a=(g.angle-90)*Math.PI/180,L=Math.abs(Math.cos(a))*W+Math.abs(Math.sin(a))*H,cx=W/2,cy=H/2;gr=x.createLinearGradient(cx-Math.cos(a)*L/2,cy-Math.sin(a)*L/2,cx+Math.cos(a)*L/2,cy+Math.sin(a)*L/2)}
  [...g.stops].sort((a,b)=>a.p-b.p).forEach(s=>gr.addColorStop(Math.max(0,Math.min(1,s.p/100)),s.c));
  x.fillStyle=gr;x.fillRect(0,0,W,H);return c;
}
export const gradDataUrl=(W,H,g)=>renderGradient(Math.round(W/2),Math.round(H/2),g).toDataURL("image/jpeg",.92);
export const gradCss=g=>{g={...GRAD_DEFAULT,...(g||{})};const st=[...g.stops].sort((a,b)=>a.p-b.p).map(s=>`${s.c} ${s.p}%`).join(",");return g.type==="radial"?`radial-gradient(circle at ${g.cx}% ${g.cy}%,${st})`:`linear-gradient(${g.angle}deg,${st})`};
export const GRAD_PRESETS=[
 {n:"Azul mono",g:{type:"linear",angle:160,stops:[{p:0,c:"#0b1f4d"},{p:50,c:"#1e4fd8"},{p:100,c:"#8fb4ff"}]}},
 {n:"Rosa mono",g:{type:"linear",angle:160,stops:[{p:0,c:"#4a0d2b"},{p:50,c:"#c2185b"},{p:100,c:"#ffb3d1"}]}},
 {n:"Complementarios",g:{type:"linear",angle:135,stops:[{p:0,c:"#ff7a18"},{p:100,c:"#2563eb"}]}},
 {n:"Atardecer",g:{type:"linear",angle:135,stops:[{p:0,c:"#ff512f"},{p:50,c:"#dd2476"},{p:100,c:"#4a00e0"}]}},
 {n:"Noche",g:{type:"linear",angle:160,stops:[{p:0,c:"#0f0c29"},{p:50,c:"#302b63"},{p:100,c:"#24243e"}]}},
 {n:"Carbón",g:{type:"linear",angle:180,stops:[{p:0,c:"#000000"},{p:60,c:"#1c1c28"},{p:100,c:"#3a3a52"}]}},
 {n:"Claro",g:{type:"linear",angle:135,stops:[{p:0,c:"#ffffff"},{p:50,c:"#f3e7ff"},{p:100,c:"#ffd6e8"}]}},
 {n:"Vibrante",g:{type:"linear",angle:120,stops:[{p:0,c:"#ff0080"},{p:50,c:"#ff8c00"},{p:100,c:"#40e0d0"}]}},
 {n:"Pastel suave",g:{type:"linear",angle:150,stops:[{p:0,c:"#ffecd2"},{p:50,c:"#fcb69f"},{p:100,c:"#cfd9ff"}]}},
 {n:"Radial brillo",g:{type:"radial",angle:0,cx:50,cy:40,stops:[{p:0,c:"#fff6b7"},{p:55,c:"#f6416c"},{p:100,c:"#2b0a3d"}]}}
];
