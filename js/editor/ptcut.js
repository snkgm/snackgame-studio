import {modal,toast,esc} from "../app/ui.js?v=20261126t";
import {outline,simplify,polyToMask,trimCanvas,uploadCut} from "../img/matting.js?v=20261126t";
import {applyProductImage} from "./product.js?v=20261126t";
const load=u=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=()=>rej(new Error("No se pudo cargar la imagen"));i.src=u});
const BGS={checker:"Cuadros",dark:"Oscuro",white:"Blanco",red:"Rojo"};
export async function openPointsCut(ed,o){
  const origUrl=o.orig||o.getSrc(),t=toast("Cargando imagen…",{ms:600000});let im;
  try{im=await load(origUrl)}catch(e){t.close();throw e}t.close();
  const k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),iw=Math.round(im.naturalWidth*k),ih=Math.round(im.naturalHeight*k);
  const src=document.createElement("canvas");src.width=iw;src.height=ih;src.getContext("2d").drawImage(im,0,0,iw,ih);
  const S={pts:[],sel:-1,feather:1,expand:0,bg:"checker",prev:false,s:1,ox:0,oy:0,drag:null,pan:null,space:false};
  const html=`<div class="ptc"><div class="ptc__stage" id="pt-st"><canvas id="pt-c"></canvas><canvas id="pt-l" class="ptc__loupe" width="160" height="160" hidden></canvas></div>
<div class="ptc__side"><button class="btn btn--accent" type="button" data-a="auto">Detectar vértices automáticamente</button><button class="btn" type="button" data-a="clear">Borrar todos los puntos</button>
<label class="chk"><input type="checkbox" id="pt-pv"> Vista previa del recorte</label>
<div class="field"><label>Suavizado del borde: <b id="pt-fv">1</b> px</label><input type="range" id="pt-f" min="0" max="20" value="1"></div>
<div class="field"><label>Expandir / contraer: <b id="pt-xv">0</b> px</label><input type="range" id="pt-x" min="-20" max="20" value="0"></div>
<div class="field"><label>Fondo de vista</label><div class="seg" id="pt-bg">${Object.entries(BGS).map(([v,l])=>`<button type="button" data-bg="${v}" class="${v==="checker"?"is-on":""}">${l}</button>`).join("")}</div></div>
<div class="field"><label>Zoom: <b id="pt-zv">100</b> %</label><input type="range" id="pt-z" min="10" max="1600" value="100"></div>
<p class="hint">Clic sobre el borde: añade un punto. Arrastra un punto: lupa ×4. Doble clic o Supr: quitar. Flechas: mover 1 px. Rueda: zoom. Espacio + arrastrar: mover la vista.</p></div></div>`;
  const m=modal("Quitar fondo con puntos",html,{ok:"Aplicar recorte",wide:true,onOk:async()=>{
    if(S.pts.length<3)throw new Error("Coloca al menos 3 puntos");
    const tt=toast("Aplicando recorte…",{ms:600000});
    try{const out=cut(),blob=await new Promise(r=>out.toBlob(r,"image/png")),url=await uploadCut(blob);
      const r=await applyProductImage(ed,{orig:url,remove:false});if(r)r.orig=origUrl;tt.close();toast("Recorte aplicado")}
    catch(e){tt.close();throw e}}});
  const $=q=>m.el.querySelector(q),st=$("#pt-st"),cv=$("#pt-c"),lp=$("#pt-l"),g=cv.getContext("2d"),lg=lp.getContext("2d");let dpr=1;
  const resize=()=>{dpr=window.devicePixelRatio||1;cv.width=st.clientWidth*dpr;cv.height=st.clientHeight*dpr;draw()};
  const fit=()=>{const W=st.clientWidth,H=st.clientHeight;S.s=Math.min(W/iw,H/ih)*.95;S.ox=(W-iw*S.s)/2;S.oy=(H-ih*S.s)/2;zsync()};
  const zsync=()=>{$("#pt-zv").textContent=Math.round(S.s*100);$("#pt-z").value=Math.max(10,Math.min(1600,Math.round(S.s*100)))};
  const toI=(x,y)=>[(x-S.ox)/S.s,(y-S.oy)/S.s],toS=p=>[p[0]*S.s+S.ox,p[1]*S.s+S.oy];
  function cut(){const mask=polyToMask(S.pts,iw,ih,{expand:S.expand,feather:S.feather}),o2=document.createElement("canvas");o2.width=iw;o2.height=ih;const c=o2.getContext("2d");c.drawImage(src,0,0);c.globalCompositeOperation="destination-in";c.drawImage(mask,0,0);return trimCanvas(o2)}
  function draw(){
    const W=cv.width,H=cv.height;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.setTransform(dpr,0,0,dpr,0,0);
    const w=st.clientWidth,h=st.clientHeight;
    if(S.bg==="checker"){g.fillStyle="#1b1f27";g.fillRect(0,0,w,h);g.fillStyle="#252a34";for(let y=0;y<h;y+=16)for(let x=((y/16)%2)*16;x<w;x+=32)g.fillRect(x,y,16,16)}else{g.fillStyle={dark:"#111",white:"#fff",red:"#c44"}[S.bg];g.fillRect(0,0,w,h)}
    g.imageSmoothingQuality="high";
    if(S.prev&&S.pts.length>=3){const mk=polyToMask(S.pts,iw,ih,{expand:S.expand,feather:S.feather}),t2=document.createElement("canvas");t2.width=iw;t2.height=ih;const c=t2.getContext("2d");c.drawImage(src,0,0);c.globalCompositeOperation="destination-in";c.drawImage(mk,0,0);g.drawImage(t2,S.ox,S.oy,iw*S.s,ih*S.s)}
    else{g.drawImage(src,S.ox,S.oy,iw*S.s,ih*S.s);
      if(S.pts.length>=3){g.save();g.fillStyle="rgba(0,0,0,.5)";g.beginPath();g.rect(0,0,w,h);S.pts.forEach((p,i)=>{const q=toS(p);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath();g.fill("evenodd");g.restore()}}
    if(S.pts.length){g.lineWidth=1.5;g.strokeStyle="#ffc400";g.beginPath();S.pts.forEach((p,i)=>{const q=toS(p);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});if(S.pts.length>2)g.closePath();g.stroke();
      S.pts.forEach((p,i)=>{const q=toS(p);g.beginPath();g.arc(q[0],q[1],i===S.sel?6:4.5,0,7);g.fillStyle=i===S.sel?"#ffc400":"#fff";g.fill();g.strokeStyle="#111";g.lineWidth=1.5;g.stroke()})}
  }
  function loupe(p){lp.hidden=false;const R=20,z=lp.width/(R*2);lg.imageSmoothingEnabled=false;lg.fillStyle="#222";lg.fillRect(0,0,lp.width,lp.height);lg.drawImage(src,p[0]-R,p[1]-R,R*2,R*2,0,0,lp.width,lp.height);
    lg.strokeStyle="#ffc400";lg.lineWidth=1;lg.beginPath();lg.moveTo(lp.width/2,0);lg.lineTo(lp.width/2,lp.height);lg.moveTo(0,lp.height/2);lg.lineTo(lp.width,lp.height/2);lg.stroke();lg.strokeRect(lp.width/2-z/2,lp.height/2-z/2,z,z)}
  const pos=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
  const hit=(x,y)=>{let b=-1,bd=11;S.pts.forEach((p,i)=>{const q=toS(p),d=Math.hypot(q[0]-x,q[1]-y);if(d<bd){bd=d;b=i}});return b};
  const edgeHit=(x,y)=>{if(S.pts.length<3)return null;let best=null,bd=9;for(let i=0;i<S.pts.length;i++){const a=toS(S.pts[i]),b=toS(S.pts[(i+1)%S.pts.length]),dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/L)),px=a[0]+dx*t,py=a[1]+dy*t,d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best={i,p:toI(px,py)}}}return best};
  const clamp=p=>[Math.max(0,Math.min(iw,p[0])),Math.max(0,Math.min(ih,p[1]))];
  cv.addEventListener("pointerdown",e=>{const [x,y]=pos(e);cv.setPointerCapture(e.pointerId);
    if(e.button===1||S.space||e.button===2){S.pan={x,y,ox:S.ox,oy:S.oy};return}
    let i=hit(x,y);
    if(i<0){const eh=edgeHit(x,y);if(eh){S.pts.splice(eh.i+1,0,clamp(eh.p));i=eh.i+1}else if(S.pts.length<3){S.pts.push(clamp(toI(x,y)));i=S.pts.length-1}}
    S.sel=i;if(i>=0){S.drag=i;loupe(S.pts[i])}draw()});
  cv.addEventListener("pointermove",e=>{const [x,y]=pos(e);
    if(S.pan){S.ox=S.pan.ox+x-S.pan.x;S.oy=S.pan.oy+y-S.pan.y;draw();return}
    if(S.drag!=null){S.pts[S.drag]=clamp(toI(x,y));loupe(S.pts[S.drag]);draw();return}
    cv.style.cursor=S.space?"grab":hit(x,y)>=0?"move":edgeHit(x,y)?"copy":"crosshair"});
  const up=()=>{S.drag=null;S.pan=null;lp.hidden=true;draw()};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
  cv.addEventListener("contextmenu",e=>e.preventDefault());
  cv.addEventListener("dblclick",e=>{const [x,y]=pos(e),i=hit(x,y);if(i>=0&&S.pts.length>3){S.pts.splice(i,1);S.sel=-1;draw()}});
  cv.addEventListener("wheel",e=>{e.preventDefault();const [x,y]=pos(e),f=e.deltaY<0?1.15:1/1.15,ns=Math.max(.1,Math.min(16,S.s*f)),p=toI(x,y);S.s=ns;S.ox=x-p[0]*ns;S.oy=y-p[1]*ns;zsync();draw()},{passive:false});
  const key=e=>{if(!m.el.isConnected)return removeEventListener("keydown",key);
    if(e.code==="Space"&&!/INPUT|TEXTAREA/.test(e.target.tagName)){S.space=true;e.preventDefault();cv.style.cursor="grab";return}
    if(S.sel<0)return;
    if((e.key==="Delete"||e.key==="Backspace")&&S.pts.length>3){S.pts.splice(S.sel,1);S.sel=-1;e.preventDefault();draw()}
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();S.pts[S.sel]=clamp([S.pts[S.sel][0]+d[0],S.pts[S.sel][1]+d[1]]);draw()}};
  const ku=e=>{if(e.code==="Space")S.space=false};addEventListener("keydown",key);addEventListener("keyup",ku);
  m.el.addEventListener("click",e=>{const a=e.target.closest("[data-a]"),b=e.target.closest("[data-bg]");
    if(a){if(a.dataset.a==="clear"){S.pts=[];S.sel=-1;draw()}else{const r=outline(src);if(!r){toast("No se detectó una silueta clara. Coloca los puntos a mano.",{kind:"err"});return}S.pts=simplify(r.hull,r.solidity>=.9?6:12);S.sel=-1;draw();toast(`${S.pts.length} vértices detectados${r.solidity>=.95?" (caja)":""}`)}}
    if(b){S.bg=b.dataset.bg;m.el.querySelectorAll("[data-bg]").forEach(x=>x.classList.toggle("is-on",x===b));draw()}});
  $("#pt-pv").onchange=e=>{S.prev=e.target.checked;draw()};
  $("#pt-f").oninput=e=>{S.feather=+e.target.value;$("#pt-fv").textContent=S.feather;draw()};
  $("#pt-x").oninput=e=>{S.expand=+e.target.value;$("#pt-xv").textContent=S.expand;draw()};
  $("#pt-z").oninput=e=>{const W=st.clientWidth/2,H=st.clientHeight/2,p=toI(W,H),ns=+e.target.value/100;S.s=ns;S.ox=W-p[0]*ns;S.oy=H-p[1]*ns;zsync();draw()};
  resize();fit();draw();addEventListener("resize",()=>{if(m.el.isConnected){resize()}});
  const r0=outline(src);if(r0){S.pts=simplify(r0.hull,r0.solidity>=.95?6:12);draw()}
}
