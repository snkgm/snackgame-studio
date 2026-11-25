const KEY="sg.mpresets";
const UI=(t,b,l,r)=>({t,b,l,r});
const META="Meta (guía de anuncios, 9:16): 14% arriba, 35% abajo y 6% a los lados, publicados como porcentajes del encuadre. Se aplica igual a contenido orgánico por recomendación.";
export const ZONES=[
 {id:"ig-feed",name:"Instagram Feed",kind:"reco",ratio:null,grid:true,ui:UI(.04,.04,.04,.04),note:"Meta no publica márgenes oficiales para el feed. Se marca el recorte de la cuadrícula del perfil (3:4) y un margen de cortesía del 4%. Recomendación, no medida oficial."},
 {id:"ig-stories",name:"Instagram Stories",kind:"official",ratio:[9,16],ui:UI(.14,.35,.06,.06),note:META},
 {id:"ig-reels",name:"Instagram Reels",kind:"official",ratio:[9,16],ui:UI(.14,.35,.06,.06),rail:{w:.21,h:.40},note:META+" Columna de botones: 40% inferior derecho, 21% del ancho."},
 {id:"tiktok",name:"TikTok",kind:"reco",ratio:[9,16],ui:UI(.083,.229,.074,.074),note:"TikTok no publica una medida fija: ofrece plantillas descargables que cambian con la longitud del texto. Valores medidos de su plantilla estándar (160 px arriba, 440 abajo, 80 a los lados en 1080×1920). Recomendación."},
 {id:"fb-reels",name:"Facebook Reels",kind:"official",ratio:[9,16],ui:UI(.14,.35,.06,.06),note:META},
 {id:"yt-shorts",name:"YouTube Shorts",kind:"official",ratio:[9,16],ui:UI(.15,.35,.0444,.1778),note:"Google (plantilla oficial de zona segura vertical, 1080×1920): 288 px arriba, 672 abajo, 48 izquierda y 192 derecha."},
 {id:"yt",name:"YouTube tradicional",kind:"reco",ratio:[16,9],ui:UI(.05,.05,.05,.05),note:"YouTube no publica márgenes oficiales para vídeo horizontal. Se usa el 5% de seguridad de acción habitual. Recomendación."}
];
export const MARGINS=[
 {id:"m-s",name:"Márgenes pequeños",px:32},{id:"m-m",name:"Márgenes medios",px:64},{id:"m-l",name:"Márgenes amplios",px:120}
];
const load=()=>{try{return {margins:[],zones:[],...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {margins:[],zones:[]}}};
export const loadPresets=load;
export const savePresets=p=>{try{localStorage.setItem(KEY,JSON.stringify(p))}catch{}};
export const uid=()=>"c"+Math.random().toString(36).slice(2,8);
// Recalcula la zona para el lienzo actual: el encuadre de la plataforma se ajusta y centra dentro del lienzo.
export function zonesFor(z,W,H){
  if(!z)return null;
  let fw=W,fh=H,fx=0,fy=0;
  if(z.ratio){const r=z.ratio[0]/z.ratio[1];if(W/H>r){fh=H;fw=H*r}else{fw=W;fh=W/r}fx=(W-fw)/2;fy=(H-fh)/2}
  const u=z.ui||{t:0,b:0,l:0,r:0};
  const safe={x:fx+fw*u.l,y:fy+fh*u.t,w:fw*(1-u.l-u.r),h:fh*(1-u.t-u.b)};
  let cut=null;
  if(z.grid){const g=.75,c=W/H;if(c>g){const nw=H*g;cut={x:(W-nw)/2,y:0,w:nw,h:H}}else if(c<g){const nh=W/g;cut={x:0,y:(H-nh)/2,w:W,h:nh}}}
  const frame=cut||{x:fx,y:fy,w:fw,h:fh};
  const s2=cut?{x:cut.x+cut.w*u.l,y:cut.y+cut.h*u.t,w:cut.w*(1-u.l-u.r),h:cut.h*(1-u.t-u.b)}:safe;
  const rail=z.rail?{x:frame.x+frame.w*(1-z.rail.w),y:frame.y+frame.h*(1-z.rail.h),w:frame.w*z.rail.w,h:frame.h*z.rail.h}:null;
  return {frame,safe:s2,rail,adapted:!!z.ratio&&Math.abs(fw-W)+Math.abs(fh-H)>2};
}
