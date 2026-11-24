const KEY="sg.snap";
export const loadSnap=()=>{try{return {on:true,tol:8,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {on:true,tol:8}}};
export const saveSnap=c=>{try{localStorage.setItem(KEY,JSON.stringify(c))}catch{}};
const active=(ed,ev)=>ed.snapCfg.on&&!(ev&&ev.altKey);
function targets(ed,o){
  const W=ed.W,H=ed.H,m=ed.margins();
  const tx=[[0,"e"],[m.l,"m"],[W/2,"c"],[W-m.r,"m"],[W,"e"]],ty=[[0,"e"],[m.t,"m"],[H/2,"c"],[H-m.b,"m"],[H,"e"]];
  (ed.cfg.guides||[]).forEach(g=>{if(g.x!=null)tx.push([g.x,"g"]);if(g.y!=null)ty.push([g.y,"g"])});
  ed.canvas.getObjects().forEach(x=>{if(x===o||x.role==="background"||x.visible===false)return;const q=x.getCoords(),xs=q.map(p=>p.x),ys=q.map(p=>p.y),a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...ys),d=Math.max(...ys);tx.push([a,"o"],[(a+b)/2,"o"],[b,"o"]);ty.push([c,"o"],[(c+d)/2,"o"],[d,"o"])});
  return {tx,ty};
}
const box=o=>{const q=o.getCoords(),xs=q.map(p=>p.x),ys=q.map(p=>p.y);return {L:Math.min(...xs),R:Math.max(...xs),T:Math.min(...ys),B:Math.max(...ys)}};
const best=(es,ts,thr)=>{let b=null;es.forEach(e=>ts.forEach(([t])=>{const d=t-e;if(Math.abs(d)<=thr&&(!b||Math.abs(d)<Math.abs(b.d)))b={d,t,e}}));return b};
export function snapMove(ed,o,ev){
  if(!o||o.role==="background"||o.locked)return;
  if(!active(ed,ev)){ed.setGuides([]);return}
  const thr=ed.snapCfg.tol/Math.max(.05,ed.scale),{tx,ty}=targets(ed,o),b=box(o),rot=(o.angle||0)%90!==0;
  const ex=rot?[(b.L+b.R)/2]:[b.L,(b.L+b.R)/2,b.R],ey=rot?[(b.T+b.B)/2]:[b.T,(b.T+b.B)/2,b.B];
  const bx=best(ex,tx,thr),by=best(ey,ty,thr),g=[];
  if(bx){o.set("left",o.left+bx.d);g.push({x:bx.t})}if(by){o.set("top",o.top+by.d);g.push({y:by.t})}
  if(bx||by)o.setCoords();ed.setGuides(g);
}
export function snapResize(ed,e){
  const tr=e.transform,o=(tr&&tr.target)||e.target,c=tr&&tr.corner;
  if(!o||!c||o.role==="background"||o.locked||(o.angle||0)%360!==0)return;
  if(!active(ed,e.e)){ed.setGuides([]);return}
  const thr=ed.snapCfg.tol/Math.max(.05,ed.scale),{tx,ty}=targets(ed,o),b=box(o);
  const hasL=c.includes("l")&&c!=="mt"&&c!=="mb",hasR=c.includes("r")&&c!=="mt"&&c!=="mb",hasT=c.includes("t")&&c!=="ml"&&c!=="mr",hasB=c.includes("b")&&c!=="ml"&&c!=="mr";
  const w=b.R-b.L,h=b.B-b.T;if(w<2||h<2)return;
  let bx=null,by=null;
  if(hasL||hasR)bx=best([hasL?b.L:b.R],tx,thr);
  if(hasT||hasB)by=best([hasT?b.T:b.B],ty,thr);
  if(!bx&&!by){ed.setGuides([]);return}
  const corner=["tl","tr","bl","br"].includes(c)&&!(e.e&&e.e.altKey);
  const text=o.type.toLowerCase()==="textbox";
  let kx=1,ky=1;
  if(bx){const nw=hasL?b.R-bx.t:bx.t-b.L;if(nw>4)kx=nw/w}
  if(by){const nh=hasT?b.B-by.t:by.t-b.T;if(nh>4)ky=nh/h}
  if(corner){ // proporcional: manda el eje con el imán más cercano
    const useX=bx&&(!by||Math.abs(bx.d)<=Math.abs(by.d));const k=useX?kx:ky;kx=ky=k;
  }
  const fixed={x:hasL?b.R:b.L,y:hasT?b.B:b.T};
  if(text&&(c==="ml"||c==="mr"))o.set({width:Math.max(20,o.width*kx),scaleX:1});
  else{if(kx!==1||corner)o.set("scaleX",o.scaleX*kx);if(ky!==1||corner)o.set("scaleY",o.scaleY*ky)}
  o.setCoords();const nb=box(o);
  o.set({left:o.left+(fixed.x-(hasL?nb.R:nb.L)),top:o.top+(fixed.y-(hasT?nb.B:nb.T))});o.setCoords();
  const g=[];if(bx)g.push({x:bx.t});if(by)g.push({y:by.t});ed.setGuides(g);
}
