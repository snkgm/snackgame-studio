import {ActiveSelection} from "../../vendor/fabric.min.mjs?v=20261127i";
import {ZONES,MARGINS,loadPresets,savePresets,uid,zonesFor} from "./zones.js?v=20261127i";
import {saveSnap} from "./snap.js?v=20261127i";
import {keepAcc,setKeepAcc} from "./accordion.js?v=20261127i";
import {I} from "../app/icons.js?v=20261127i";
import {esc,modal,toast} from "../app/ui.js?v=20261127i";
const VK="sg.view",DV={rulers:1,guides:1,margins:0,zones:0,meas:"drag",glock:0,mlock:1};
const lv=()=>{try{return {...DV,...JSON.parse(localStorage.getItem(VK)||"{}")}}catch{return {...DV}}};
const S=d=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={
 ruler:S('<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>'),
 guides:S('<path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'),
 margins:S('<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="10" height="10" stroke-dasharray="2 2"/>'),
 zones:S('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 7h12M6 16h12"/>'),
 magnet:S('<path d="M6 15V4h4v11a2 2 0 0 0 4 0V4h4v11a6 6 0 0 1-12 0Z"/><path d="M6 8h4M14 8h4"/>'),
 tol:S('<path d="M3 12h4M17 12h4M12 5v14"/><path d="m9 9 3 3-3 3M15 9l-3 3 3 3"/>'),
 meas:S('<path d="M3 12h18M3 8v8M21 8v8"/>'),
 lock:I.lock,unlock:I["lock-open"],eye:I.eye,eyeoff:I["eye-off"],trash:I["trash-2"],plus:I.plus,
 al:I["align-left"],ac:I["align-center"],ar:I["align-right"],at:I["align-start-vertical"],am:I["align-center-vertical"],ab:I["align-end-vertical"],
 dh:S('<path d="M3 4v16M21 4v16"/><rect x="9" y="8" width="6" height="8"/>'),dv:S('<path d="M4 3h16M4 21h16"/><rect x="8" y="9" width="8" height="6"/>'),
 eq:S('<rect x="2" y="8" width="4" height="8"/><rect x="10" y="8" width="4" height="8"/><rect x="18" y="8" width="4" height="8"/>'),
 chev:I["chevron-down"]
};
const NS="http://www.w3.org/2000/svg";
const R=n=>Math.round(n);
const bx=o=>{o.setCoords();const q=o.getCoords(),xs=q.map(p=>p.x),ys=q.map(p=>p.y);return {L:Math.min(...xs),R:Math.max(...xs),T:Math.min(...ys),B:Math.max(...ys)}};
const TOLS=[["Suave",4],["Normal",8],["Fuerte",14]];
export function mountComposer(root,ed){
  const $=s=>root.querySelector(s),box=$("#box"),stage=$("#stage"),bar=$("#bar2");
  let V=lv();const saveV=()=>{try{localStorage.setItem(VK,JSON.stringify(V))}catch{}};
  const cfg=()=>ed.cfg;
  {let l0=V.mlock;delete V.mlock;Object.defineProperty(V,"mlock",{enumerable:true,configurable:true,get:()=>cfg().mlock!==undefined?cfg().mlock:l0,set:v=>{l0=v;cfg().mlock=v?1:0}})}
  {let m0=V.margins;delete V.margins;Object.defineProperty(V,"margins",{enumerable:true,configurable:true,get:()=>cfg().mshow!==undefined?cfg().mshow:m0,set:v=>{m0=v;cfg().mshow=v?1:0}})}
  const guides=()=>cfg().guides||(cfg().guides=[]);
  const mk=(id,cls)=>{let e=box.querySelector("#"+id);if(!e){e=document.createElement("div");e.id=id;e.className=cls;box.appendChild(e)}return e};
  const zEl=mk("zn","cmp cmp--z"),gEl=mk("gl","cmp cmp--g"),mEl=mk("mg","cmp cmp--m"),meEl=mk("me","cmp cmp--me");
  const rt=document.createElement("canvas"),rl=document.createElement("canvas"),rc=document.createElement("div");rt.className="rul rul--t";rl.className="rul rul--l";rc.className="rul rul--c";stage.append(rt,rl,rc);
  const sc=()=>box.getBoundingClientRect().width/ed.W||ed.scale;
  const doc=(cx,cy)=>{const r=box.getBoundingClientRect(),k=r.width/ed.W;return {x:(cx-r.left)/k,y:(cy-r.top)/k}};
  // ---------- reglas
  function drawRulers(){
    const on=!!V.rulers;rt.hidden=rl.hidden=rc.hidden=!on;stage.classList.toggle("has-rul",on);
    if(!on)return;
    const sr=stage.getBoundingClientRect(),br=box.getBoundingClientRect(),k=br.width/ed.W,dpr=window.devicePixelRatio||1,T=20;
    const paint=(cv,len,horiz)=>{
      const cw=horiz?len:T,ch=horiz?T:len;cv.width=cw*dpr;cv.height=ch*dpr;cv.style.width=cw+"px";cv.style.height=ch+"px";
      const g=cv.getContext("2d");g.scale(dpr,dpr);g.fillStyle="#171a21";g.fillRect(0,0,cw,ch);g.strokeStyle="#4a5163";g.fillStyle="#9aa3b5";g.font="10px Inter,sans-serif";g.lineWidth=1;
      const off=horiz?br.left-sr.left-T:br.top-sr.top-T,tot=horiz?ed.W:ed.H;
      const steps=[1,2,5,10,20,50,100,200,500,1000],M=steps.find(s=>s*k>=70)||1000,m=steps.find(s=>s*k>=7&&M%s===0&&M/s<=10)||M;
      g.beginPath();
      for(let v=0;v<=tot;v+=m){const p=off+v*k+.5,major=v%M===0,mid=!major&&v%(M/2)===0,h=major?T:mid?10:6;
        if(p<0||p>len)continue;
        if(horiz){g.moveTo(p,T);g.lineTo(p,T-h)}else{g.moveTo(T,p);g.lineTo(T-h,p)}
        if(major){if(horiz)g.fillText(String(v),p+3,10);else{g.save();g.translate(10,p+3);g.rotate(-Math.PI/2);g.fillText(String(v),-(String(v).length*5)-2,0);g.restore()}}}
      g.stroke();
      // borde del documento
      g.strokeStyle="#ffb300";g.beginPath();const a=off+.5,b=off+tot*k+.5;if(horiz){g.moveTo(a,0);g.lineTo(a,T);g.moveTo(b,0);g.lineTo(b,T)}else{g.moveTo(0,a);g.lineTo(T,a);g.moveTo(0,b);g.lineTo(T,b)}g.stroke();
    };
    paint(rt,sr.width-T,true);paint(rl,sr.height-T,false);
  }
  // arrastrar guías desde las reglas
  function startGuide(ax,e){
    if(e.button!==0)return;e.preventDefault();
    const ghost=document.createElement("div");ghost.className="gghost gghost--"+ax;const tag=document.createElement("span");tag.className="gtag2";ghost.append(tag);box.appendChild(ghost);
    const mv=ev=>{const p=doc(ev.clientX,ev.clientY),v=R(ax==="y"?p.y:p.x),max=ax==="y"?ed.H:ed.W,ok=v>=0&&v<=max;ghost.style[ax==="y"?"top":"left"]=(v/(ax==="y"?ed.H:ed.W)*100)+"%";tag.textContent=(ax==="y"?"Y ":"X ")+v+" px";ghost.classList.toggle("is-del",!ok);ghost.dataset.v=ok?v:"";};
    const up=ev=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);const v=ghost.dataset.v;ghost.remove();if(v!==""&&v!=null){guides().push({[ax]:+v});V.guides=1;saveV();ed.emit("cguides");ed.commit();toast(`Guía ${ax==="y"?"horizontal":"vertical"} en ${v} px`)}};
    window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);mv(e);
  }
  rt.addEventListener("pointerdown",e=>startGuide("y",e));rl.addEventListener("pointerdown",e=>startGuide("x",e));
  // ---------- guías personalizadas (interactivas)
  function drawGuides(){
    gEl.hidden=!V.guides;if(!V.guides){gEl.innerHTML="";return}
    gEl.innerHTML=guides().map((g,i)=>{const x=g.x!=null,p=(x?g.x/ed.W:g.y/ed.H)*100;if(g.hide)return"";const lk=g.lock||V.glock;
      return `<i class="gl gl--${x?"x":"y"}${lk?" is-lock":""}" data-i="${i}" style="${x?"left":"top"}:${p.toFixed(3)}%"><b></b></i>`}).join("");
  }
  gEl.addEventListener("pointerdown",e=>{
    const el=e.target.closest(".gl");if(!el||el.classList.contains("is-lock"))return;e.preventDefault();e.stopPropagation();
    const i=+el.dataset.i,g=guides()[i],ax=g.x!=null?"x":"y";
    const mv=ev=>{const p=doc(ev.clientX,ev.clientY),v=R(ax==="y"?p.y:p.x),max=ax==="y"?ed.H:ed.W;g[ax]=Math.max(-50,Math.min(max+50,v));el.classList.toggle("is-del",v<0||v>max);el.style[ax==="y"?"top":"left"]=(g[ax]/max*100)+"%";el.dataset.t=(ax==="y"?"Y ":"X ")+g[ax]+" px"};
    const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);if(g[ax]<0||g[ax]>(ax==="y"?ed.H:ed.W))guides().splice(i,1);ed.emit("cguides");ed.commit()};
    window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);
  });
  // ---------- márgenes (editables sobre el lienzo)
  const sym=()=>cfg().msym||(cfg().msym={h:false,v:false});
  function setMargin(k,v,live){
    const m={...ed.margins()},s=sym();v=Math.max(0,R(v));m[k]=v;
    if(s.h&&(k==="l"||k==="r"))m[k==="l"?"r":"l"]=v;if(s.v&&(k==="t"||k==="b"))m[k==="t"?"b":"t"]=v;
    cfg().safe=m;ed.emit("safe");if(!live)ed.commit();
  }
  function drawMargins(){
    mEl.hidden=!V.margins;mEl.classList.toggle("is-locked",!!V.mlock);if(!V.margins){mEl.innerHTML="";return}
    const m=ed.margins(),W=ed.W,H=ed.H,p=(v,t)=>(v/t*100).toFixed(3)+"%";
    mEl.innerHTML=`<div class="mgbox" style="left:${p(m.l,W)};right:${p(m.r,W)};top:${p(m.t,H)};bottom:${p(m.b,H)}"></div>`+
     [["l",`left:${p(m.l,W)};top:0;bottom:0`,"x"],["r",`right:${p(m.r,W)};top:0;bottom:0`,"x"],["t",`top:${p(m.t,H)};left:0;right:0`,"y"],["b",`bottom:${p(m.b,H)};left:0;right:0`,"y"]].map(([k,st,a])=>`<i class="mgl mgl--${a}" data-k="${k}" style="${st}"><b>${R(m[k])}</b></i>`).join("");
  }
  mEl.addEventListener("pointerdown",e=>{
    const el=e.target.closest(".mgl");if(!el||V.mlock)return;e.preventDefault();e.stopPropagation();const k=el.dataset.k;
    const mv=ev=>{const p=doc(ev.clientX,ev.clientY);setMargin(k,k==="l"?p.x:k==="r"?ed.W-p.x:k==="t"?p.y:ed.H-p.y,true)};
    const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);ed.commit()};
    window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);
  });
  // ---------- zonas seguras
  function drawZones(){
    const z=cfg().zone;zEl.hidden=!V.zones||!z;ed.zoneLines=null;
    if(zEl.hidden){zEl.innerHTML="";return}
    const r=zonesFor(z,ed.W,ed.H),W=ed.W,H=ed.H,f=r.frame,s=r.safe,rc=a=>`M${a.x} ${a.y}h${a.w}v${a.h}h${-a.w}Z`;
    ed.zoneLines={x:[s.x,s.x+s.w],y:[s.y,s.y+s.h]};
    zEl.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M0 0h${W}v${H}h${-W}ZM${f.x} ${f.y}h${f.w}v${f.h}h${-f.w}Z" fill="rgba(255,69,58,.18)" fill-rule="evenodd"/><path d="${rc(f)}${rc(s)}" fill="rgba(255,196,0,.17)" fill-rule="evenodd"/>${r.rail?`<path d="${rc(r.rail)}" fill="rgba(255,196,0,.17)"/>`:""}<path d="${rc(s)}" fill="rgba(52,199,89,.05)" stroke="rgba(52,199,89,.9)" stroke-width="${2/sc()}" stroke-dasharray="${8/sc()} ${6/sc()}"/></svg><span class="zlab">${esc(z.name)} · ${z.kind==="official"?"oficial":z.kind==="reco"?"recomendación":"personalizada"}</span>`;
  }
  // ---------- medidas
  const mkL=(x1,y1,x2,y2,txt,cls="")=>{const k=sc(),f=11/k,tx=(x1+x2)/2,ty=(y1+y2)/2;return `<g class="ml ${cls}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${1/k}"/><line x1="${x1}" y1="${y1}" x2="${x1+(y1===y2?0:-4/k)}" y2="${y1+(y1===y2?-4/k:0)}" stroke-width="${1/k}"/><text x="${tx}" y="${ty-3/k}" font-size="${f}" text-anchor="middle" stroke-width="${3/k}">${txt}</text></g>`};
  function info(){
    const el=root.querySelector("#b-info");if(!el)return;
    const objs=c.getActiveObjects().filter(o=>o.visible!==false);if(!objs.length||ed.bgSel){el.textContent="";return}
    const bs=objs.map(bx),sel={L:Math.min(...bs.map(b=>b.L)),R:Math.max(...bs.map(b=>b.R)),T:Math.min(...bs.map(b=>b.T)),B:Math.max(...bs.map(b=>b.B))},m=ed.margins(),W=ed.W,H=ed.H;
    const ml=V.margins?m.l:0,mr=V.margins?m.r:0,mt=V.margins?m.t:0,mb=V.margins?m.b:0;
    const dh=(sel.L-ml)-(W-mr-sel.R),dv=(sel.T-mt)-(H-mb-sel.B),oh=Math.abs(dh)<=1,ov=Math.abs(dv)<=1;
    el.innerHTML=`<span class="${oh?"ok":"no"}">${oh?"✓":"Δ"} Horizontal${oh?" centrado":" "+R(Math.abs(dh))+" px"}</span><span class="${ov?"ok":"no"}">${ov?"✓":"Δ"} Vertical${ov?" centrado":" "+R(Math.abs(dv))+" px"}</span>`;
  }
  function measure(){
    const mode=V.meas;meEl.innerHTML="";if(mode==="off")return;
    if(mode==="drag"&&!ed._dragging)return;
    const objs=ed.canvas.getActiveObjects().filter(o=>o.visible!==false);if(!objs.length||ed.bgSel)return;
    const W=ed.W,H=ed.H,k=sc();let out="";
    const all=ed.canvas.getObjects().filter(o=>!["background","bgfx","floorshadow","overlay"].includes(o.role)&&o.visible!==false&&!objs.includes(o));
    const m=ed.margins(),gs=guides().filter(g=>!g.hide);
    const boxes=objs.map(bx);
    const sel={L:Math.min(...boxes.map(b=>b.L)),R:Math.max(...boxes.map(b=>b.R)),T:Math.min(...boxes.map(b=>b.T)),B:Math.max(...boxes.map(b=>b.B))};
    const cx=(sel.L+sel.R)/2,cy=(sel.T+sel.B)/2;
    out+=`<rect x="${sel.L}" y="${sel.T}" width="${sel.R-sel.L}" height="${sel.B-sel.T}" fill="none" stroke="#ff3d9a" stroke-width="${1/k}"/>`;
    // bordes del lienzo
    const eL=sel.L,eR=W-sel.R,eT=sel.T,eB=H-sel.B;
    out+=mkL(0,cy,sel.L,cy,R(eL),"e")+mkL(sel.R,cy,W,cy,R(eR),"e")+mkL(cx,0,cx,sel.T,R(eT),"e")+mkL(cx,sel.B,cx,H,R(eB),"e");
    // elementos vecinos
    const ob=all.map(bx);let nl=null,nr=null,nt=null,nb=null;
    ob.forEach(b=>{const ov=b.T<sel.B&&b.B>sel.T,oh=b.L<sel.R&&b.R>sel.L;
      if(ov&&b.R<=sel.L&&(!nl||b.R>nl.R))nl=b;if(ov&&b.L>=sel.R&&(!nr||b.L<nr.L))nr=b;if(oh&&b.B<=sel.T&&(!nt||b.B>nt.B))nt=b;if(oh&&b.T>=sel.B&&(!nb||b.T<nb.T))nb=b});
    const yy=cy+14/k,xx=cx+14/k;
    if(nl)out+=mkL(nl.R,yy,sel.L,yy,R(sel.L-nl.R),"o");if(nr)out+=mkL(sel.R,yy,nr.L,yy,R(nr.L-sel.R),"o");if(nt)out+=mkL(xx,nt.B,xx,sel.T,R(sel.T-nt.B),"o");if(nb)out+=mkL(xx,sel.B,xx,nb.T,R(nb.T-sel.B),"o");
    // guías más cercanas
    const gx=gs.filter(g=>g.x!=null).map(g=>g.x),gy=gs.filter(g=>g.y!=null).map(g=>g.y);
    const near=(a,v)=>a.length?a.reduce((p,c)=>Math.abs(c-v)<Math.abs(p-v)?c:p):null;
    const gl=near(gx,sel.L),gr=near(gx,sel.R),gt=near(gy,sel.T),gb=near(gy,sel.B);
    if(gl!=null&&Math.abs(gl-sel.L)>.5)out+=mkL(gl,sel.T+8/k,sel.L,sel.T+8/k,R(Math.abs(sel.L-gl)),"g");
    if(gr!=null&&Math.abs(gr-sel.R)>.5)out+=mkL(sel.R,sel.B-8/k,gr,sel.B-8/k,R(Math.abs(gr-sel.R)),"g");
    if(gt!=null&&Math.abs(gt-sel.T)>.5)out+=mkL(sel.L+8/k,gt,sel.L+8/k,sel.T,R(Math.abs(sel.T-gt)),"g");
    if(gb!=null&&Math.abs(gb-sel.B)>.5)out+=mkL(sel.R-8/k,sel.B,sel.R-8/k,gb,R(Math.abs(gb-sel.B)),"g");
    // márgenes
    if(V.margins){if(sel.L>=m.l)out+=mkL(m.l,sel.T+20/k,sel.L,sel.T+20/k,R(sel.L-m.l),"m");if(W-m.r>=sel.R)out+=mkL(sel.R,sel.B-20/k,W-m.r,sel.B-20/k,R(W-m.r-sel.R),"m")}
    // simetría
    const ml=V.margins?m.l:0,mr=V.margins?m.r:0,mt=V.margins?m.t:0,mb=V.margins?m.b:0;
    const dh=(sel.L-ml)-(W-mr-sel.R),dv=(sel.T-mt)-(H-mb-sel.B);
    // varios elementos: separaciones
    if(objs.length>1){
      const gaps=(key,a,b)=>{const s=[...boxes].sort((p,q)=>p[a]-q[a]),gs=[];let s2="";for(let i=0;i<s.length-1;i++)gs.push(s[i+1][a]-s[i][b]);const eq=gs.length>1&&gs.every(v=>Math.abs(v-gs[0])<=1);
        s.slice(0,-1).forEach((p,i)=>{const q=s[i+1];s2+=key==="x"?mkL(p.R,(p.T+p.B)/2,q.L,(p.T+p.B)/2,R(gs[i])+(eq?" =":""),eq?"eq":"o"):mkL((p.L+p.R)/2,p.B,(p.L+p.R)/2,q.T,R(gs[i])+(eq?" =":""),eq?"eq":"o")});return s2};
      out+=gaps("x","L","R")+gaps("y","T","B");
    }
    meEl.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${out}</svg>`;
  }
  // ---------- alineación
  async function align(op){
    const c=ed.canvas,a=c.getActiveObject();if(!a)return;
    const objs=a.type==="activeselection"?a.getObjects().slice():[a];
    if(a.type==="activeselection")c.discardActiveObject();
    const bs=objs.map(bx),m=ed.margins();
    const ref=objs.length>1?{L:Math.min(...bs.map(b=>b.L)),R:Math.max(...bs.map(b=>b.R)),T:Math.min(...bs.map(b=>b.T)),B:Math.max(...bs.map(b=>b.B))}:{L:m.l,R:ed.W-m.r,T:m.t,B:ed.H-m.b};
    const mv=(o,dx,dy)=>{o.set({left:o.left+dx,top:o.top+dy});o.setCoords()};
    const idx=objs.map((o,i)=>i);
    if(op==="al")idx.forEach(i=>mv(objs[i],ref.L-bs[i].L,0));
    if(op==="ar")idx.forEach(i=>mv(objs[i],ref.R-bs[i].R,0));
    if(op==="ac")idx.forEach(i=>mv(objs[i],(ref.L+ref.R)/2-(bs[i].L+bs[i].R)/2,0));
    if(op==="at")idx.forEach(i=>mv(objs[i],0,ref.T-bs[i].T));
    if(op==="ab")idx.forEach(i=>mv(objs[i],0,ref.B-bs[i].B));
    if(op==="am")idx.forEach(i=>mv(objs[i],0,(ref.T+ref.B)/2-(bs[i].T+bs[i].B)/2));
    if(["dh","dv","eq"].includes(op)&&objs.length>2){
      const horiz=op==="dh"||(op==="eq"&&(ref.R-ref.L)>=(ref.B-ref.T)),A=horiz?"L":"T",Bk=horiz?"R":"B";
      const ord=idx.sort((p,q)=>(bs[p][A]+bs[p][Bk])-(bs[q][A]+bs[q][Bk]));
      if(op==="eq"){const tot=ord.reduce((s,i)=>s+(bs[i][Bk]-bs[i][A]),0),gap=((horiz?ref.R-ref.L:ref.B-ref.T)-tot)/(ord.length-1);let pos=horiz?ref.L:ref.T;ord.forEach(i=>{const d=pos-bs[i][A];horiz?mv(objs[i],d,0):mv(objs[i],0,d);pos+=bs[i][Bk]-bs[i][A]+gap})}
      else{const f=ord[0],l=ord[ord.length-1],c0=(bs[f][A]+bs[f][Bk])/2,c1=(bs[l][A]+bs[l][Bk])/2;ord.forEach((i,n)=>{const t=c0+(c1-c0)*n/(ord.length-1),d=t-(bs[i][A]+bs[i][Bk])/2;horiz?mv(objs[i],d,0):mv(objs[i],0,d)})}
    }
    if(objs.length>1){const s=new ActiveSelection(objs,{canvas:c});c.setActiveObject(s)}else c.setActiveObject(objs[0]);
    c.requestRenderAll();ed.commit();measure();
  }
  // ---------- barra 2
  const btn=(id,ic,tip,extra="")=>`<button class="b2" id="${id}" title="${tip}" aria-label="${tip}" aria-pressed="false"${extra}>${ic}</button>`;
  const dd=(id,ic,lab,tip)=>`<button class="b2 b2--dd" id="${id}" title="${tip}" aria-label="${tip}" aria-haspopup="true" aria-pressed="false">${ic}<span>${lab}</span>${IC.chev}</button>`;
  bar.innerHTML=`<div class="b2g">${btn("b-rul",IC.ruler,"Mostrar/ocultar reglas")}${dd("b-gui",IC.guides,"Guías","Guías: mostrar, crear y editar")}${dd("b-mar",IC.margins,"Márgenes","Márgenes: mostrar, presets y valores")}${dd("b-zon",IC.zones,"Zonas","Zonas seguras por plataforma")}</div><i class="b2s"></i>
<div class="b2g">${btn("b-snap",IC.magnet,"Ajuste magnético (mantén Alt para desactivarlo al arrastrar)")}${dd("b-tol","" ,"","Sensibilidad del imán")}${btn("b-smart",S('<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>'),"Guías inteligentes: alinear con bordes y centros de otros elementos")}</div><i class="b2s"></i>
<div class="b2g">${btn("b-meas",IC.meas,"Medidas y distancias: ocultas / al mover / siempre")}${btn("b-glock",IC.lock,"Bloquear/desbloquear guías")}<button class="b2 b2--t" id="b-mlock" title="Bloquear márgenes: impide moverlos arrastrando sobre el lienzo" aria-pressed="false">${IC.lock}<span>Bloquear márgenes</span></button></div><i class="b2s"></i>
<div class="b2g" id="b-al">${[["al",IC.al,"Alinear a la izquierda"],["ac",IC.ac,"Centrar horizontalmente"],["ar",IC.ar,"Alinear a la derecha"],["at",IC.at,"Alinear arriba"],["am",IC.am,"Centrar verticalmente"],["ab",IC.ab,"Alinear abajo"],["dh",IC.dh,"Distribuir horizontalmente (3 o más)"],["dv",IC.dv,"Distribuir verticalmente (3 o más)"],["eq",IC.eq,"Igualar espacios entre elementos (3 o más)"]].map(([k,i,t])=>btn("al-"+k,i,t,` data-al="${k}"`)).join("")}</div>`;
  bar.querySelector("#b-tol").innerHTML=`${IC.tol}<span id="tol-l"></span>${IC.chev}`;
  const setOn=(id,on,t)=>{const b=bar.querySelector("#"+id);b.classList.toggle("is-on",!!on);b.setAttribute("aria-pressed",String(!!on));if(t)b.dataset.state=t};
  function sync(){
    setOn("b-rul",V.rulers);setOn("b-gui",V.guides);setOn("b-mar",V.margins);setOn("b-zon",V.zones&&cfg().zone);
    setOn("b-snap",ed.snapCfg.on);setOn("b-smart",ed.snapCfg.smart!==false&&ed.snapCfg.on);setOn("b-meas",V.meas!=="off");setOn("b-glock",V.glock);setOn("b-mlock",V.mlock);bar.querySelector("#b-mlock").innerHTML=(V.mlock?IC.lock:IC.unlock)+"<span>Bloquear márgenes</span>";info();
    const tl=bar.querySelector("#tol-l"),n=TOLS.find(t=>t[1]===ed.snapCfg.tol);tl.textContent=n?n[0]:ed.snapCfg.tol+" px";
    bar.querySelector("#b-meas").title="Medidas: "+({off:"ocultas",drag:"solo al mover",on:"siempre"}[V.meas])+" (clic para cambiar)";bar.querySelector("#b-meas").classList.toggle("is-dim",V.meas==="drag");
    bar.querySelector("#b-glock").innerHTML=V.glock?IC.lock:IC.unlock;
    const n2=ed.canvas.getActiveObjects().length;bar.querySelectorAll("[data-al]").forEach(b=>{const k=b.dataset.al;b.disabled=n2<1||(["dh","dv","eq"].includes(k)&&n2<3)});
  }
  function redraw(){drawRulers();drawGuides();drawMargins();drawZones();measure();sync();renderPop()}
  // ---------- popovers
  let pop=null,popFor=null;
  const closePop2=()=>{if(pop){pop.remove();pop=null;popFor=null;bar.querySelectorAll(".b2--dd").forEach(b=>b.setAttribute("aria-pressed","false"))}};
  const openPop=(id,html,bind)=>{closePop2();popFor={id,html,bind};const b=bar.querySelector("#"+id),r=b.getBoundingClientRect();pop=document.createElement("div");pop.className="pop2";pop.innerHTML=html();document.body.appendChild(pop);
    const w=pop.offsetWidth;pop.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left))+"px";pop.style.top=(r.bottom+4)+"px";b.setAttribute("aria-pressed","true");bind(pop)};
  function renderPop(){if(!pop||!popFor)return;const sc0=pop.scrollTop,ae=document.activeElement&&pop.contains(document.activeElement)&&document.activeElement.id;pop.innerHTML=popFor.html();popFor.bind(pop);pop.scrollTop=sc0;if(ae){const e=pop.querySelector("#"+ae);if(e)e.focus()}}
  document.addEventListener("pointerdown",ev=>{if(pop&&!pop.contains(ev.target)&&!ev.target.closest("#bar2 .b2--dd"))closePop2()});
  // presets
  let PR=loadPresets();const savePR=()=>savePresets(PR);
  const allZones=()=>[...ZONES,...PR.zones];
  const applyZone=z=>{cfg().zone=z?JSON.parse(JSON.stringify(z)):null;if(z)V.zones=1;saveV();ed.emit("safe");ed.commit();redraw()};
  const applyMargins=(m,s)=>{cfg().safe={t:m.t,b:m.b,l:m.l,r:m.r};if(s)cfg().msym={...s};V.margins=1;saveV();ed.emit("safe");ed.commit();redraw()};
  const num=(k,v)=>`<label class="pf"><span>${k}</span><input class="input" type="number" min="0" data-m="${k}" value="${R(v)}"></label>`;
  const marginsPop=()=>{const m=ed.margins(),s=sym(),sk=ed.W/1080;return `<div class="pp"><div class="pp__h">Márgenes</div>
   <label class="chk"><input type="checkbox" data-v="margins"${V.margins?" checked":""}> Mostrar márgenes</label>
   <div class="pp__g">${[["t","Superior"],["b","Inferior"],["l","Izquierdo"],["r","Derecho"]].map(([k,l])=>`<label class="pf"><span>${l}</span><input class="input" type="number" min="0" data-m="${k}" value="${R(m[k])}"></label>`).join("")}</div>
   <label class="chk"><input type="checkbox" data-sym="h"${s.h?" checked":""}> Simetría horizontal (izq. = der.)</label><label class="chk"><input type="checkbox" data-sym="v"${s.v?" checked":""}> Simetría vertical (sup. = inf.)</label>
   <div class="pp__h">Presets</div><div class="pp__l">${MARGINS.map(p=>`<button class="pi" data-mp="${p.id}">${esc(p.name)}<em>${R(p.px*sk)} px</em></button>`).join("")}${PR.margins.map(p=>`<button class="pi" data-mp="${p.id}">${esc(p.name)}<em>${p.t}/${p.b}/${p.l}/${p.r}</em></button>`).join("")}</div>
   <div class="pp__r"><button class="btn btn--accent btn--sm" id="mp-add">Añadir márgenes</button><button class="btn btn--sm" id="mp-save">Guardar como preset</button><button class="btn btn--sm" id="mp-man">Gestionar</button></div></div>`};
  const zonesPop=()=>{const z=cfg().zone,all=allZones(),r=z&&zonesFor(z,ed.W,ed.H);return `<div class="pp"><div class="pp__h">Zonas seguras</div>
   <label class="chk"><input type="checkbox" data-v="zones"${V.zones?" checked":""}> Mostrar zonas</label>
   <div class="pp__l">${all.map(p=>`<button class="pi${z&&z.id===p.id?" is-sel":""}" data-zp="${p.id}">${esc(p.name)}<em>${p.kind==="official"?"oficial":p.kind==="reco"?"recom.":"propio"}</em></button>`).join("")}<button class="pi" data-zp="">Sin zona</button></div>
   <div class="pp__lg"><i class="lg lg--s"></i>Segura<i class="lg lg--c"></i>Precaución (interfaz)<i class="lg lg--o"></i>Exterior (recorte)</div>
   ${z?`<p class="pp__n">${esc(z.note||"")}${r&&r.adapted?" <b>Recalculada para este lienzo: el encuadre de la plataforma se ajusta y centra dentro del formato actual.</b>":""}</p>`:""}
   <div class="pp__r"><button class="btn btn--sm" id="zp-dup"${z?"":" disabled"}>Duplicar y editar</button><button class="btn btn--sm" id="mp-man">Gestionar</button></div></div>`};
  const guidesPop=()=>{const gs=guides();return `<div class="pp"><div class="pp__h">Guías</div>
   <label class="chk"><input type="checkbox" data-v="guides"${V.guides?" checked":""}> Mostrar guías</label>
   <div class="pp__r"><button class="btn btn--sm" data-gc="cx">Centro vertical</button><button class="btn btn--sm" data-gc="cy">Centro horizontal</button></div>
   <div class="pp__r"><input class="input" type="number" id="g-px" placeholder="px"><button class="btn btn--sm" data-ga="x">+ Vertical</button><button class="btn btn--sm" data-ga="y">+ Horizontal</button></div>
   <div class="pp__r"><select class="select" id="g-div"><option value="2">Mitades</option><option value="3">Tercios</option><option value="4">Cuartos</option><option value="5">Quintos</option><option value="phi">Proporción áurea</option></select><button class="btn btn--sm" data-gd="x">Vert.</button><button class="btn btn--sm" data-gd="y">Horiz.</button></div>
   <div class="pp__l pp__gl">${gs.map((g,i)=>`<div class="gr"><span>${g.x!=null?"X":"Y"}</span><input class="input" type="number" data-gv="${i}" value="${g.x!=null?g.x:g.y}"><button class="b2" data-gk="lock:${i}" title="${g.lock?"Desbloquear":"Bloquear"}">${g.lock?IC.lock:IC.unlock}</button><button class="b2" data-gk="hide:${i}" title="${g.hide?"Mostrar":"Ocultar"}">${g.hide?IC.eyeoff:IC.eye}</button><button class="b2" data-gk="del:${i}" title="Eliminar">${IC.trash}</button></div>`).join("")||'<span class="hint">Sin guías. Arrastra desde una regla o créalas aquí.</span>'}</div>
   <div class="pp__r"><button class="btn btn--sm" id="g-clear"${gs.length?"":" disabled"}>Limpiar guías (conserva márgenes)</button></div></div>`};
  const tolPop=()=>{const t=ed.snapCfg.tol;return `<div class="pp"><div class="pp__h">Sensibilidad del imán</div><div class="pp__l">${TOLS.map(([l,v])=>`<button class="pi${t===v?" is-sel":""}" data-tol="${v}">${l}<em>${v} px</em></button>`).join("")}</div><label class="pf"><span>Distancia (px)</span><input class="input" type="number" min="1" max="40" id="tol-px" value="${t}"></label><span class="hint">Mantén Alt para desactivar el imán mientras arrastras.</span></div>`};
  const mBind=p=>{
    p.querySelectorAll("[data-m]").forEach(i=>i.onchange=()=>{setMargin(i.dataset.m.length===1?i.dataset.m:"l",+i.value);renderPop()});
    p.querySelectorAll("[data-sym]").forEach(c=>c.onchange=()=>{sym()[c.dataset.sym]=c.checked;if(c.checked){const m=ed.margins();if(c.dataset.sym==="h")setMargin("l",m.l);else setMargin("t",m.t)}else ed.commit();renderPop()});
    p.querySelector("[data-v=margins]").onchange=e=>{V.margins=e.target.checked?1:0;saveV();redraw()};
    p.querySelectorAll("[data-mp]").forEach(b=>b.onclick=()=>{const id=b.dataset.mp,g=MARGINS.find(x=>x.id===id);if(g){const v=R(g.px*ed.W/1080);applyMargins({t:v,b:v,l:v,r:v},{h:true,v:true})}else{const c=PR.margins.find(x=>x.id===id);applyMargins(c,c.sym)}});
    p.querySelector("#mp-add").onclick=()=>marginModal();
    p.querySelector("#mp-save").onclick=()=>{const m=ed.margins();modal("Guardar preset de márgenes",`<div class="field"><label for="pn">Nombre</label><input class="input" id="pn" value="Mis márgenes"></div>`,{ok:"Guardar",onOk:()=>{const n=document.querySelector("#pn").value.trim()||"Mis márgenes";PR.margins.push({id:uid(),name:n,...m,sym:{...sym()}});savePR();toast("Preset guardado");renderPop()}})};
    p.querySelector("#mp-man").onclick=()=>manage();
  };
  function marginModal(){
    const m=ed.margins(),s=sym();
    modal("Añadir márgenes",`<div class="pp__g">${[["t","Superior"],["b","Inferior"],["l","Izquierdo"],["r","Derecho"]].map(([k,l])=>`<label class="pf"><span>${l} (px)</span><input class="input" type="number" min="0" id="mm-${k}" value="${R(m[k])}"></label>`).join("")}</div><label class="chk"><input type="checkbox" id="mm-h"${s.h?" checked":""}> Simetría horizontal</label><label class="chk"><input type="checkbox" id="mm-v"${s.v?" checked":""}> Simetría vertical</label>`,{ok:"Aplicar",onOk:()=>{
      const g=k=>Math.max(0,R(+document.querySelector("#mm-"+k).value||0)),h=document.querySelector("#mm-h").checked,v=document.querySelector("#mm-v").checked,o={t:g("t"),b:g("b"),l:g("l"),r:g("r")};
      if(h)o.r=o.l;if(v)o.b=o.t;applyMargins(o,{h,v})}});
    const L=document.querySelector("#mm-l"),Rr=document.querySelector("#mm-r"),T=document.querySelector("#mm-t"),B=document.querySelector("#mm-b"),H=document.querySelector("#mm-h"),Vv=document.querySelector("#mm-v");
    if(L){L.oninput=()=>{if(H.checked)Rr.value=L.value};Rr.oninput=()=>{if(H.checked)L.value=Rr.value};T.oninput=()=>{if(Vv.checked)B.value=T.value};B.oninput=()=>{if(Vv.checked)T.value=B.value}}
  }
  function manage(){
    const html=()=>`<div class="pp__m"><h4>Márgenes guardados</h4>${PR.margins.map(p=>`<div class="mr" data-id="${p.id}" data-t="margins"><input class="input" data-n value="${esc(p.name)}">${["t","b","l","r"].map(k=>`<input class="input in-s" type="number" data-k="${k}" value="${p[k]}" title="${k}">`).join("")}<button class="btn btn--sm" data-d>Duplicar</button><button class="btn btn--sm btn--danger" data-x>Eliminar</button></div>`).join("")||'<span class="hint">Sin presets propios.</span>'}
      <h4>Zonas seguras propias</h4>${PR.zones.map(p=>`<div class="mr" data-id="${p.id}" data-t="zones"><input class="input" data-n value="${esc(p.name)}">${["t","b","l","r"].map(k=>`<input class="input in-s" type="number" step="0.5" data-k="${k}" value="${R(p.ui[k]*1000)/10}" title="${k} %">`).join("")}<button class="btn btn--sm" data-d>Duplicar</button><button class="btn btn--sm btn--danger" data-x>Eliminar</button></div>`).join("")||'<span class="hint">Sin zonas propias. Usa «Duplicar y editar» en Zonas. Valores en % del encuadre: arriba, abajo, izquierda, derecha.</span>'}</div>`;
    const m=modal("Gestionar presets",html(),{ok:"Cerrar",onOk:()=>{renderPop()}});
    const body=()=>document.querySelector(".modal .pp__m")?.parentElement;
    const wire=()=>{const b=body();if(!b)return;
      b.onchange=e=>{const r=e.target.closest(".mr");if(!r)return;const L=PR[r.dataset.t],p=L.find(x=>x.id===r.dataset.id);if(e.target.matches("[data-n]"))p.name=e.target.value.trim()||p.name;else if(e.target.matches("[data-k]")){const k=e.target.dataset.k,v=Math.max(0,+e.target.value||0);if(r.dataset.t==="margins")p[k]=R(v);else p.ui[k]=Math.min(.9,v/100)}savePR()};
      b.onclick=e=>{const r=e.target.closest(".mr");if(!r)return;const L=PR[r.dataset.t],i=L.findIndex(x=>x.id===r.dataset.id);
        if(e.target.closest("[data-x]")){L.splice(i,1);savePR()}else if(e.target.closest("[data-d]")){const c=JSON.parse(JSON.stringify(L[i]));c.id=uid();c.name+=" (copia)";L.splice(i+1,0,c);savePR()}else return;
        b.innerHTML=html();}};
    wire();
  }
  const zBind=p=>{
    p.querySelector("[data-v=zones]").onchange=e=>{V.zones=e.target.checked?1:0;saveV();redraw()};
    p.querySelectorAll("[data-zp]").forEach(b=>b.onclick=()=>{const id=b.dataset.zp;if(!id){cfg().zone=null;ed.emit("safe");ed.commit();redraw();return}applyZone(allZones().find(z=>z.id===id))});
    p.querySelector("#zp-dup").onclick=()=>{const z=cfg().zone;if(!z)return;const c=JSON.parse(JSON.stringify(z));c.id=uid();c.name=z.name+" (copia)";c.kind="custom";PR.zones.push(c);savePR();applyZone(c);toast("Copia creada. Edita sus valores en Gestionar");manage()};
    p.querySelector("#mp-man").onclick=()=>manage();
  };
  const gBind=p=>{
    p.querySelector("[data-v=guides]").onchange=e=>{V.guides=e.target.checked?1:0;saveV();redraw()};
    const add=o=>{guides().push(o);V.guides=1;saveV();ed.emit("cguides");ed.commit();redraw()};
    p.querySelectorAll("[data-gc]").forEach(b=>b.onclick=()=>add(b.dataset.gc==="cx"?{x:R(ed.W/2)}:{y:R(ed.H/2)}));
    p.querySelectorAll("[data-ga]").forEach(b=>b.onclick=()=>{const v=p.querySelector("#g-px").value;if(v==="")return;add({[b.dataset.ga]:R(+v)})});
    p.querySelectorAll("[data-gd]").forEach(b=>b.onclick=()=>{const a=b.dataset.gd,d=p.querySelector("#g-div").value,T=a==="x"?ed.W:ed.H;if(d==="phi"){add({[a]:R(T*.382)});add({[a]:R(T*.618)})}else for(let i=1;i<+d;i++)add({[a]:R(T*i/ +d)})});
    p.querySelectorAll("[data-gv]").forEach(i=>i.onchange=()=>{const g=guides()[+i.dataset.gv];g[g.x!=null?"x":"y"]=R(+i.value);ed.emit("cguides");ed.commit();redraw()});
    p.querySelectorAll("[data-gk]").forEach(b=>b.onclick=()=>{const [a,i]=b.dataset.gk.split(":"),g=guides()[+i];if(a==="del")guides().splice(+i,1);else g[a]=!g[a];ed.emit("cguides");ed.commit();redraw()});
    p.querySelector("#g-clear").onclick=()=>{cfg().guides=[];ed.emit("cguides");ed.commit();redraw()};
  };
  const tBind=p=>{
    const set=v=>{ed.setSnap({tol:Math.max(1,Math.min(40,R(v)))});saveSnap(ed.snapCfg);cfg().snap={...ed.snapCfg};ed.commit();sync();renderPop()};
    p.querySelectorAll("[data-tol]").forEach(b=>b.onclick=()=>set(+b.dataset.tol));p.querySelector("#tol-px").onchange=e=>set(+e.target.value||8);
  };
  const tgl=(id,fn)=>bar.querySelector("#"+id).addEventListener("click",()=>{closePop2();fn();saveV();redraw()});
  tgl("b-rul",()=>V.rulers=V.rulers?0:1);
  tgl("b-mlock",()=>V.mlock=V.mlock?0:1);ed.on("safe",()=>{});
  tgl("b-glock",()=>V.glock=V.glock?0:1);
  tgl("b-meas",()=>{V.meas=V.meas==="drag"?"on":V.meas==="on"?"off":"drag"});
  const snapSet=p=>{ed.setSnap(p);saveSnap(ed.snapCfg);cfg().snap={...ed.snapCfg};ed.commit()};
  tgl("b-snap",()=>snapSet({on:!ed.snapCfg.on}));tgl("b-smart",()=>snapSet({smart:ed.snapCfg.smart===false}));
  bar.querySelector("#b-gui").onclick=()=>popFor&&popFor.id==="b-gui"?closePop2():openPop("b-gui",guidesPop,gBind);
  bar.querySelector("#b-mar").onclick=()=>popFor&&popFor.id==="b-mar"?closePop2():openPop("b-mar",marginsPop,mBind);
  bar.querySelector("#b-zon").onclick=()=>popFor&&popFor.id==="b-zon"?closePop2():openPop("b-zon",zonesPop,zBind);
  bar.querySelector("#b-tol").onclick=()=>popFor&&popFor.id==="b-tol"?closePop2():openPop("b-tol",tolPop,tBind);
  bar.querySelectorAll("[data-al]").forEach(b=>b.onclick=()=>align(b.dataset.al));
  // ---------- eventos del editor
  const c=ed.canvas;
  const dragOn=()=>{ed._dragging=true;measure();info()},dragOff=()=>{ed._dragging=false;measure()};
  ["object:moving","object:scaling","object:resizing","object:rotating"].forEach(n=>c.on(n,dragOn));
  ["mouse:up","object:modified"].forEach(n=>c.on(n,dragOff));
  ["selection:created","selection:updated","selection:cleared"].forEach(n=>c.on(n,()=>{measure();sync()}));
  const offs=[];const on=(e,f)=>{ed.on(e,f)};
  ["zoom","format","cguides","safe","change","snap"].forEach(e=>on(e,()=>{if(e==="snap"){sync();return}if(e==="change"){measure();sync();return}redraw()}));
  window.addEventListener("resize",redraw);
  const ro=new ResizeObserver(()=>redraw());ro.observe(stage);
  window.addEventListener("keydown",e=>{if(e.key==="Escape")closePop2()});
  // aplicar configuración guardada en el documento
  if(cfg().snap)ed.setSnap(cfg().snap);
  stage.addEventListener("pointermove",e=>{});
  redraw();
  return {redraw,destroy(){closePop2();window.removeEventListener("resize",redraw);ro.disconnect();rt.remove();rl.remove();rc.remove()}};
}
