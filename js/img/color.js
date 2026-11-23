export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function hexToRgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
export const rgbToHex=(r,g,b)=>"#"+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,"0")).join("");
export function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;const d=mx-mn;if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
export function hslToRgb(h,s,l){h=((h%360)+360)%360/360;if(!s){const v=l*255;return[v,v,v]}const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;const f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p};return[f(h+1/3)*255,f(h)*255,f(h-1/3)*255]}
export function adjust(hex,{lum=0,sat=0}={}){const[h,s,l]=rgbToHsl(...hexToRgb(hex));return rgbToHex(...hslToRgb(h,clamp(s*(1+sat/100)),clamp(l+lum/200)))}
export const shade=(hex,dl)=>{const[h,s,l]=rgbToHsl(...hexToRgb(hex));return rgbToHex(...hslToRgb(h,s,clamp(l+dl)))};
export const lumOf=hex=>{const[r,g,b]=hexToRgb(hex).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
export const contrastText=hex=>lumOf(hex)>.45?"#111111":"#ffffff";
export function rgba(hex,a){const[r,g,b]=hexToRgb(hex);return `rgba(${r},${g},${b},${a})`}
export function rng(seed){let s=(seed|0)||1;return()=>{s=(s*1664525+1013904223)|0;return((s>>>0)%100000)/100000}}
export function extractPalette(src,n=3){
  const w=src.naturalWidth||src.width,h=src.naturalHeight||src.height,k=Math.min(1,96/Math.max(w,h));
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
  const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(src,0,0,c.width,c.height);
  const d=x.getImageData(0,0,c.width,c.height).data;
  const hasAlpha=(()=>{for(let i=3;i<d.length;i+=4)if(d[i]<250)return true;return false})();
  const corner=[0,(c.width-1)*4,(c.height-1)*c.width*4,(c.width*c.height-1)*4].map(o=>[d[o],d[o+1],d[o+2]]);
  const bg=hasAlpha?null:[0,1,2].map(i=>corner.reduce((a,p)=>a+p[i],0)/4);
  const B=new Map();
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<128)continue;
    const r=d[i],g=d[i+1],b=d[i+2];
    if(bg&&Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2])<54)continue;
    const key=(r>>4)<<8|(g>>4)<<4|(b>>4);const e=B.get(key)||{n:0,r:0,g:0,b:0};e.n++;e.r+=r;e.g+=g;e.b+=b;B.set(key,e);
  }
  const list=[...B.values()].map(e=>{const r=e.r/e.n,g=e.g/e.n,b=e.b/e.n,[,s,l]=rgbToHsl(r,g,b);const pen=l<.08||l>.95?.15:1;return{rgb:[r,g,b],score:e.n*(.35+s*1.65)*pen}}).sort((a,b)=>b.score-a.score);
  const out=[];
  for(const e of list){if(out.every(o=>Math.hypot(o.rgb[0]-e.rgb[0],o.rgb[1]-e.rgb[1],o.rgb[2]-e.rgb[2])>70))out.push(e);if(out.length>=n)break}
  const hex=out.map(e=>rgbToHex(...e.rgb));
  const fallback=["#3b2f8f","#1a1a2e","#ffb400"];
  while(hex.length<n)hex.push(shade(hex[0]||fallback[hex.length],hex.length%2?-.18:.15));
  return hex;
}
