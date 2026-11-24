const mk=(W,H)=>{const c=document.createElement("canvas");c.width=Math.max(1,Math.round(W));c.height=Math.max(1,Math.round(H));return c};
const rgba=(hex,a)=>{const h=(hex||"#000000").replace("#","");const n=h.length===3?h.split("").map(x=>x+x).join(""):h.padEnd(6,"0");return `rgba(${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)},${a})`};
export const FX_DEFAULT={vig:{on:false,intensity:60,size:45,soft:60,opacity:100,color:"#000000"},edges:{t:false,b:false,l:false,r:false,extent:35,intensity:70,opacity:100,color:"#000000",soft:60}};
export const fxActive=f=>!!f&&((f.vig&&f.vig.on)||(f.edges&&(f.edges.t||f.edges.b||f.edges.l||f.edges.r)));
const ease=(c,col,a,soft,steps=8)=>{ // parada con curva suavizada: soft 0=lineal brusco, 100=muy suave
  const p=1+soft/40;for(let i=0;i<=steps;i++){const t=i/steps;c.addColorStop(t,rgba(col,a*Math.pow(1-t,p)))}
};
export function renderBgFx(W,H,fx){
  if(!fxActive(fx))return null;
  const c=mk(W,H),g=c.getContext("2d"),v=fx.vig,e=fx.edges;
  if(v&&v.on){
    const R=Math.hypot(W,H)/2,rIn=R*(v.size/100)*.95,rOut=rIn+(R*1.02-rIn)*(.2+.8*v.soft/100);
    g.save();g.translate(W/2,H/2);g.scale(1,H/W);
    const rr=(x)=>x*(W/Math.hypot(W,H));const q=g.createRadialGradient(0,0,rr(rIn),0,0,rr(rOut));
    const a=(v.intensity/100)*(v.opacity/100);
    for(let i=0;i<=8;i++){const t=i/8,s=t*t*(3-2*t);q.addColorStop(t,rgba(v.color,a*s))}
    g.fillStyle=q;const big=Math.max(W,H)*2;g.fillRect(-big,-big*(W/H),big*2,big*2*(W/H));g.restore();
  }
  if(e){
    const a=(e.intensity/100)*(e.opacity/100),ex=e.extent/100;
    const edge=(x0,y0,x1,y1,rect)=>{const q=g.createLinearGradient(x0,y0,x1,y1);ease(q,e.color,a,e.soft);g.fillStyle=q;g.fillRect(...rect)};
    if(e.t)edge(0,0,0,H*ex,[0,0,W,H*ex]);
    if(e.b)edge(0,H,0,H-H*ex,[0,H-H*ex,W,H*ex]);
    if(e.l)edge(0,0,W*ex,0,[0,0,W*ex,H]);
    if(e.r)edge(W,0,W-W*ex,0,[W-W*ex,0,W*ex,H]);
  }
  return c;
}
export const FLOOR_DEFAULT={on:true,dx:0,dy:0,z:0,opacity:60,blur:24,spread:0,size:100,angle:90,intensity:70,color:"#000000",soft:50,persp:35};
const FP=new WeakMap();
// Silueta: banda inferior del producto (alfa) → huella de apoyo.
function footprint(el){
  if(FP.has(el))return FP.get(el);
  const w=el.naturalWidth||el.width,h=el.naturalHeight||el.height;if(!w||!h)return null;
  const k=Math.min(1,256/Math.max(w,h)),sw=Math.max(2,Math.round(w*k)),sh=Math.max(2,Math.round(h*k));
  const s=mk(sw,sh),g=s.getContext("2d",{willReadFrequently:true});g.drawImage(el,0,0,sw,sh);
  const d=g.getImageData(0,0,sw,sh).data;let top=sh,bot=-1,l=sw,r=-1;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(d[(y*sw+x)*4+3]>40){if(y<top)top=y;if(y>bot)bot=y;if(x<l)l=x;if(x>r)r=x}
  if(bot<0){FP.set(el,null);return null}
  const bh=bot-top+1,band=Math.max(3,Math.round(bh*.14)),y0=Math.max(top,bot-band+1);
  const f=mk(r-l+1,bot-y0+1),fg=f.getContext("2d");fg.drawImage(s,l,y0,r-l+1,bot-y0+1,0,0,f.width,f.height);
  fg.globalCompositeOperation="source-in";fg.fillStyle="#000";fg.fillRect(0,0,f.width,f.height);
  const res={fp:f,box:{l:l/sw,r:(r+1)/sw,t:top/sh,b:(bot+1)/sh},bandFrac:f.height/bh};FP.set(el,res);return res;
}
export const siluetaInfo=el=>{const f=footprint(el);return f?f.box:null};
/** geom: {x,y,w,h} del producto en lienzo (sin rotar). Devuelve {canvas,left,top} o null. */
export function renderFloorShadow(el,geom,P){
  const F=footprint(el);if(!F)return null;
  const bw=(F.box.r-F.box.l)*geom.w,bx=geom.x+(F.box.l+F.box.r)/2*geom.w,by=geom.y+F.box.b*geom.h;
  const z=Math.max(0,P.z),th=(P.angle-90)*Math.PI/180;
  const sc=(P.size/100)/(1+z/500),flat=.12+.5*(P.persp/100),cast=1+Math.abs(Math.sin(th))*.45;
  const sw0=bw*sc*cast,sh0=Math.max(4,F.fp.height/F.fp.width*bw*flat*sc*2+bw*.03*flat);
  const spread=P.spread,sw1=Math.max(4,sw0+spread*2),sh1=Math.max(3,sh0+spread);
  const cx=bx+P.dx+Math.sin(th)*z*.9+Math.sin(th)*bw*.08,cy=by+P.dy+z*.6+sh1*.15;
  const blurAmb=(P.blur+z*.22)*(.5+P.soft/100),blurCon=Math.max(1,blurAmb*.28);
  const pad=Math.ceil(blurAmb*2.4+Math.abs(spread)+8),CW=Math.ceil(sw1*1.5+pad*2),CH=Math.ceil(sh1*1.8+pad*2);
  const c=mk(CW,CH),g=c.getContext("2d"),OFF=CW+200,fade=1/(1+z/450);
  const pass=(wf,hf,blur,alpha)=>{
    g.save();g.shadowColor=rgba(P.color,Math.min(1,alpha));g.shadowBlur=blur;g.shadowOffsetX=OFF;g.shadowOffsetY=0;
    g.translate(CW/2-OFF,CH/2);g.transform(1,0,-Math.sin(th)*.35,1,0,0);g.scale(1,1);
    g.drawImage(F.fp,-sw1*wf/2,-sh1*hf/2,sw1*wf,sh1*hf);g.restore();
  };
  const op=(P.opacity/100)*fade,it=P.intensity/100;
  pass(1.0,1.15,blurAmb,op*.55);          // sombra ambiental ancha
  pass(.92,.8,blurAmb*.55,op*.5*(.5+it));  // penumbra
  pass(.78,.45,blurCon,op*it);             // contacto, más oscura y pegada
  return {canvas:c,left:cx-CW/2,top:cy-CH/2};
}
