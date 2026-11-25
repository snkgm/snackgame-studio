import {FabricImage,Rect,filters as FX} from "../../vendor/fabric.min.mjs?v=20261125y";
export const PF0={bright:0,contrast:0,sat:0,temp:0,hue:0,expo:0,hi:0,sh:0,sharp:0,blur:0,gray:0,sepia:0,duo:0,duoA:"#1b1464",duoB:"#ffc400",grain:0,vig:0,round:0};
export const CATS={
  A:["bright","contrast","sat","temp","hue","expo","hi","sh","sharp","blur"],
  D:["round"],
  E:["vig","grain","duo","blur"]
};
export const PF_PRESETS=[
  ["Natural",{}],
  ["Vibrante",{sat:35,contrast:12}],
  ["Frío",{temp:-30,sat:8,bright:2}],
  ["Cálido",{temp:30,sat:10}],
  ["Cinematográfico",{contrast:22,sat:-12,temp:-8,sh:-10,vig:35}],
  ["Alto contraste",{contrast:45,sat:10,sharp:20}],
  ["B/N",{gray:1,contrast:12}],
  ["Vintage",{sepia:1,contrast:-10,bright:5,vig:30,grain:10}],
  ["Suave",{contrast:-15,bright:6,sat:-8,blur:2}],
  ["Oscuro",{bright:-22,contrast:18,vig:25}]
];
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255);
export const getPfx=o=>({...PF0,...(o.pfx||{})});
export function applyPfx(o){
  const v=getPfx(o),f=[];
  if(v.expo||v.temp||v.hi){const e=Math.pow(2,v.expo/50),r=e*(1+v.temp/250),b=e*(1-v.temp/250),h=1+v.hi/400;f.push(new FX.ColorMatrix({matrix:[r*h,0,0,0,0, 0,e*h,0,0,0, 0,0,b*h,0,0, 0,0,0,1,0]}))}
  if(v.sh)f.push(new FX.Gamma({gamma:[1+v.sh/80,1+v.sh/80,1+v.sh/80]}));
  if(v.bright)f.push(new FX.Brightness({brightness:v.bright/100}));
  if(v.contrast)f.push(new FX.Contrast({contrast:v.contrast/100}));
  if(v.sat)f.push(new FX.Saturation({saturation:v.sat/100}));
  if(v.hue)f.push(new FX.HueRotation({rotation:v.hue/180}));
  if(v.gray)f.push(new FX.Grayscale());
  if(v.sepia)f.push(new FX.Sepia());
  if(v.duo){const A=hex(v.duoA),B=hex(v.duoB),t=v.duo/100,L=[.2126,.7152,.0722],m=[];[0,1,2].forEach(i=>{const row=L.map((l,j)=>(1-t)*(i===j?1:0)+t*(B[i]-A[i])*l);m.push(...row,0,t*A[i])});f.push(new FX.ColorMatrix({matrix:[...m,0,0,0,1,0]}))}
  if(v.sharp){const k=v.sharp/100*1.2;f.push(new FX.Convolute({opaque:false,matrix:[0,-k,0,-k,1+4*k,-k,0,-k,0]}))}
  if(v.grain)f.push(new FX.Noise({noise:v.grain*4}));
  if(v.blur)f.push(new FX.Blur({blur:v.blur/100}));
  o.set("filters",f);o.applyFilters();
  if(v.round>0){const w=o.width,h=o.height,r=Math.min(w,h)*v.round/100;o.set("clipPath",new Rect({width:w,height:h,rx:r,ry:r,originX:"center",originY:"center",left:0,top:0}))}
  else if(o.clipPath&&o.clipPath.__pf)o.set("clipPath",undefined);
  if(o.clipPath&&v.round>0)o.clipPath.__pf=1;
  o.dirty=true;
}
export function setPfx(o,patch,{hist=true}={}){
  const cur=getPfx(o);
  if(hist){(o._pfh??=[]).push({...(o.pfx||{})});if(o._pfh.length>40)o._pfh.shift()}
  o.pfx={...(o.pfx||{}),...patch};
  for(const k in o.pfx)if(o.pfx[k]===PF0[k])delete o.pfx[k];
  applyPfx(o);
}
export const undoPfx=o=>{const h=o._pfh;if(!h||!h.length)return false;o.pfx=h.pop();applyPfx(o);return true};
export const resetCat=(o,keys)=>{const p={};keys.forEach(k=>p[k]=PF0[k]);setPfx(o,p)};
export const resetAll=o=>{(o._pfh??=[]).push({...(o.pfx||{})});o.pfx={};o.set({opacity:1,stroke:null,strokeWidth:0,shadow:null,flipX:false,flipY:false});applyPfx(o)};
export const applyPreset=(o,i)=>{const base={};Object.keys(PF0).forEach(k=>{if(!/^duo[AB]$/.test(k))base[k]=PF0[k]});setPfx(o,{...base,...PF_PRESETS[i][1],preset:i})};
// viñeta (se dibuja sobre los píxeles existentes del objeto)
const _r=FabricImage.prototype._render;
FabricImage.prototype._render=function(ctx){_r.call(this,ctx);const v=this.pfx&&this.pfx.vig;if(!v)return;
  const w=this.width,h=this.height,r=Math.hypot(w,h)/2;ctx.save();ctx.globalCompositeOperation="source-atop";
  const g=ctx.createRadialGradient(0,0,r*.35,0,0,r);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,`rgba(0,0,0,${Math.min(.9,v/100*.9)})`);
  ctx.fillStyle=g;ctx.fillRect(-w/2,-h/2,w,h);ctx.restore()};
