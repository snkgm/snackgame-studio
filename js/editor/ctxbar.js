import {FONTS,loadFont} from "../app/fonts.js?v=20261125h";
import {BLENDS} from "./editor.js?v=20261125h";
import {Shadow} from "../../vendor/fabric.min.mjs?v=20261125h";
const S=d=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC={
 b:S('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>'),i:S('<path d="M19 4h-9M14 20H5M15 4 9 20"/>'),
 al:S('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),ac:S('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),ar:S('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
 minus:S('<path d="M5 12h14"/>'),plus:S('<path d="M12 5v14M5 12h14"/>'),chev:S('<path d="m6 9 6 6 6-6"/>'),
 op:S('<circle cx="12" cy="12" r="8"/><path d="M12 4v16M12 8h4M12 12h4M12 16h3"/>'),st:S('<path d="M5 19 12 4l7 15M8 13h8"/><path d="M3 21h18" opacity=".5"/>'),shd:S('<rect x="4" y="4" width="11" height="11" rx="2"/><path d="M9 20h11V9" opacity=".6"/>'),lh:S('<path d="M8 6h12M8 12h12M8 18h12M4 4v16M2.5 5.5 4 4l1.5 1.5M2.5 18.5 4 20l1.5-1.5"/>'),cs:S('<path d="M7 17 12 5l5 12M9 13h6M3 4v16M21 4v16"/>'),fx:S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),sp:S('<path d="M8 4 4 8l4 4M16 4l4 4-4 4M4 8h16M4 18h16"/>'),
 fh:S('<path d="M12 3v18M8 7 3 12l5 5zM16 7l5 5-5 5z"/>'),fv:S('<path d="M3 12h18M7 8l5-5 5 5zM7 16l5 5 5-5z"/>'),rot:S('<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>'),
 fit:S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),sh:S('<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 20h12V8"/>')
};
const WN={100:"Fina",200:"Extra ligera",300:"Ligera",400:"Regular",500:"Media",600:"Seminegrita",700:"Negrita",800:"Extra negrita",900:"Black"};
const isT=o=>o&&/text/i.test(o.type||"");
const isI=o=>o&&o.type==="image"&&o.role!=="background";
const hex=c=>typeof c==="string"&&/^#[0-9a-f]{6}$/i.test(c)?c:"#000000";
export function mountCtxBar(root,ed){
  const bar2=root.querySelector("#bar2");if(!bar2)return;
  const cb=document.createElement("div");cb.className="bar2 ctx";cb.id="ctxbar";cb.hidden=true;cb.setAttribute("role","toolbar");bar2.after(cb);
  const c=ed.canvas;let kind=null,pop=null;
  const sel=()=>c.getActiveObjects();
  const texts=()=>sel().filter(isT),imgs=()=>sel().filter(isI);
  const done=()=>{c.requestRenderAll();ed.commit()};
  const live=()=>{c.requestRenderAll()};
  const dim=o=>{o.initDimensions?.();o.setCoords()};
  const ws=o=>(FONTS.find(f=>f.family===o.fontFamily)||FONTS[0]).weights;
  const btn=(a,ic,t,x="")=>`<button type="button" class="b2" data-c="${a}" title="${t}" aria-label="${t}" aria-pressed="false"${x}>${ic}</button>`;
  const num=(a,t,min,max,w=56)=>`<input class="ctx__n" type="number" data-c="${a}" min="${min}" max="${max}" title="${t}" aria-label="${t}" style="width:${w}px">`;
  const sl=(a,t,min,max,step=1,u="")=>`<input type="range" class="cpop__s" data-c="${a}" min="${min}" max="${max}" step="${step}" data-u="${u}" title="${t}" aria-label="${t}"><output></output>`;
  const pb=(k,ic,t)=>`<button type="button" class="b2" data-pop="${k}" title="${t}" aria-label="${t}" aria-haspopup="true">${ic}</button>`;
  const tg=(a,ic,t,pk)=>`<span class="b2sp"><button type="button" class="b2" data-c="${a}" title="${t}" aria-label="${t}" aria-pressed="false">${ic}</button><button type="button" class="b2 b2--mini" data-pop="${pk}" title="Ajustes de ${t.toLowerCase()}" aria-label="Ajustes de ${t.toLowerCase()}" aria-haspopup="true">${IC.chev}</button></span>`;
  const TEXT=`<div class="b2g"><select class="ctx__s" data-c="font" title="Fuente" aria-label="Fuente">${FONTS.map(f=>`<option>${f.family}</option>`).join("")}</select><select class="ctx__s ctx__w" data-c="weight" title="Peso tipográfico (grosor de la fuente)" aria-label="Peso tipográfico"></select>${btn("bold",IC.b,"Negrita")}${btn("italic",IC.i,"Cursiva")}</div><i class="b2s"></i>
<div class="b2g">${btn("sz-",IC.minus,"Reducir tamaño")}${num("size","Tamaño de fuente",8,600,64)}${btn("sz+",IC.plus,"Aumentar tamaño")}</div><i class="b2s"></i>
<div class="b2g"><input class="ctx__c" type="color" data-c="fill" title="Color del texto" aria-label="Color del texto">${pb("op",IC.op,"Opacidad")}${tg("stT",IC.st,"Contorno","st")}${tg("shT",IC.shd,"Sombra","sh")}</div><i class="b2s"></i>
<div class="b2g">${btn("al",IC.al,"Alinear a la izquierda",' data-v="left"')}${btn("ac",IC.ac,"Centrar",' data-v="center"')}${btn("ar",IC.ar,"Alinear a la derecha",' data-v="right"')}</div><i class="b2s"></i>
<div class="b2g">${pb("lh",IC.lh,"Interlineado")}${pb("cs",IC.cs,"Espaciado entre letras")}</div>`;
  const IMG=`<div class="b2g">${pb("iop",IC.op,"Opacidad")}<select class="ctx__s" data-c="blend" title="Modo de fusión" aria-label="Modo de fusión">${BLENDS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div><i class="b2s"></i>
<div class="b2g">${btn("fh",IC.fh,"Voltear horizontal")}${btn("fv",IC.fv,"Voltear vertical")}${btn("rot",IC.rot,"Rotar 90°")}${btn("fit",IC.fit,"Ajustar al lienzo")}${btn("ishadow",IC.sh,"Activar o quitar sombra")}</div>`;
  const popHtml={
    op:()=>`<div class="cpop__r"><label>Opacidad</label>${sl("opacity","Opacidad",0,100,1,"%")}</div>`,
    iop:()=>`<div class="cpop__r"><label>Opacidad</label>${sl("iopacity","Opacidad",0,100,1,"%")}</div>`,
    st:()=>`<div class="cpop__r"><label>Contorno</label><input type="color" data-c="stroke" aria-label="Color del contorno"></div><div class="cpop__r"><label>Grosor</label>${sl("sw","Grosor del contorno",0,40,1," px")}</div>`,
    sh:()=>`<div class="cpop__r"><label>Color</label><input type="color" data-c="shC" aria-label="Color de la sombra"></div><div class="cpop__r"><label>Difuminado</label>${sl("shB","Difuminado",0,100,1," px")}</div><div class="cpop__r"><label>Horizontal</label>${sl("shX","Desplazamiento horizontal",-80,80,1," px")}</div><div class="cpop__r"><label>Vertical</label>${sl("shY","Desplazamiento vertical",-80,80,1," px")}</div>`,
    lh:()=>`<div class="cpop__r"><label>Interlineado</label>${sl("lh","Interlineado",0.6,2.5,0.05,"")}</div>`,
    cs:()=>`<div class="cpop__r"><label>Letras</label>${sl("cs","Espaciado entre letras",-100,600,10,"")}</div>`
  };
  function closePop(){if(pop){pop.remove();pop=null}}
  function openPop(b){const k=b.dataset.pop;if(pop&&pop.dataset.k===k){closePop();return}closePop();pop=document.createElement("div");pop.className="cpop";pop.dataset.k=k;pop.innerHTML=popHtml[k]();document.body.appendChild(pop);const r=b.getBoundingClientRect();pop.style.left=Math.min(r.left,innerWidth-pop.offsetWidth-8)+"px";pop.style.top=r.bottom+4+"px";bindAll(pop);sync()}
  document.addEventListener("pointerdown",e=>{if(pop&&!pop.contains(e.target)&&!e.target.closest("[data-pop]"))closePop()});
  const q=(k,scope=null)=>(scope||[cb,pop]).flatMap?.(r=>r?[...r.querySelectorAll(`[data-c="${k}"]`)]:[])||[];
  function setSh(o,p){const s=o.shadow||{};o.set("shadow",new Shadow({color:p.color??s.color??"#000000",blur:p.blur??s.blur??12,offsetX:p.x??s.offsetX??0,offsetY:p.y??s.offsetY??4}))}
  function act(k,v,commit){
    const T=texts(),I=imgs();
    if(["font","weight","bold","italic","sz-","sz+","size","fill","opacity","stroke","sw","shT","stT","shC","shB","shX","shY","al","ac","ar","lh","cs"].includes(k)){
      T.forEach(o=>{
        if(k==="font"){const f=FONTS.find(x=>x.family===v),w=f.weights.includes(+o.fontWeight)?+o.fontWeight:f.weights.includes(700)?700:f.weights[0];o.set({fontFamily:v,fontWeight:w});loadFont(v,w).then(()=>{dim(o);o.dirty=true;live();sync()})}
        else if(k==="weight"){o.set("fontWeight",+v);loadFont(o.fontFamily,+v).then(()=>{dim(o);o.dirty=true;live()})}
        else if(k==="bold"){const w=ws(o),n=+o.fontWeight>=700?(w.find(x=>x<=500)||w[0]):(w.find(x=>x>=700)||w[w.length-1]);o.set("fontWeight",n);loadFont(o.fontFamily,n).then(()=>{dim(o);o.dirty=true;live();sync()})}
        else if(k==="italic")o.set("fontStyle",o.fontStyle==="italic"?"normal":"italic");
        else if(k==="sz-"||k==="sz+"){const n=Math.max(8,Math.round(o.fontSize*(o.scaleY||1))+(k==="sz+"?2:-2));o.set({fontSize:n,scaleX:1,scaleY:1})}
        else if(k==="size")o.set({fontSize:Math.max(8,+v||8),scaleX:1,scaleY:1});
        else if(k==="fill")o.set("fill",v);
        else if(k==="opacity")o.set("opacity",Math.max(0,Math.min(100,+v))/100);
        else if(k==="stroke"){o.set("stroke",v);if(!o.strokeWidth)o.set("strokeWidth",4)}
        else if(k==="sw")o.set({strokeWidth:Math.max(0,+v||0),stroke:o.stroke||"#000000"});
        else if(k==="shT")o.set("shadow",o.shadow?null:new Shadow({color:"#000000",blur:12,offsetX:0,offsetY:4}));
        else if(k==="stT"){if(o.strokeWidth>0){o._sw=o.strokeWidth;o.set("strokeWidth",0)}else o.set({strokeWidth:o._sw||4,stroke:o.stroke||"#000000"})}
        else if(k==="shC")setSh(o,{color:v});else if(k==="shB")setSh(o,{blur:+v||0});else if(k==="shX")setSh(o,{x:+v||0});else if(k==="shY")setSh(o,{y:+v||0});
        else if(k==="al"||k==="ac"||k==="ar")o.set("textAlign",{al:"left",ac:"center",ar:"right"}[k]);
        else if(k==="lh")o.set("lineHeight",+v||1);else if(k==="cs")o.set("charSpacing",+v||0);
        dim(o);o.dirty=true;
      });
    } else {
      I.forEach(o=>{
        if(k==="iopacity")o.set("opacity",Math.max(0,Math.min(100,+v))/100);
        else if(k==="blend")ed.setBlend?ed.setBlend(o,v):o.set("globalCompositeOperation",v);
        else if(k==="fh")o.set("flipX",!o.flipX);else if(k==="fv")o.set("flipY",!o.flipY);
        else if(k==="rot"){o.set("angle",((o.angle||0)+90)%360)}
        else if(k==="fit"){const f=Math.max(ed.W/o.width,ed.H/o.height);o.set({scaleX:f,scaleY:f,angle:0});ed.setXY(o,(ed.W-o.width*f)/2,(ed.H-o.height*f)/2)}
        else if(k==="ishadow")o.set("shadow",o.shadow?null:new Shadow({color:"rgba(0,0,0,.45)",blur:30,offsetX:0,offsetY:12}));
        o.setCoords();
      });
    }
    live();if(commit)done();
  }
  function bindAll(r){
    r.querySelectorAll("[data-c]").forEach(el=>{
      const k=el.dataset.c;
      if(el.tagName==="BUTTON"){el.onclick=()=>{act(k,null,true);sync()};return}
      if(el.type==="checkbox"){el.onchange=()=>{act(k,el.checked,true);sync()};return}
      if(el.tagName==="SELECT"){el.onchange=()=>{act(k,el.value,true);sync()};return}
      el.oninput=()=>{act(k,el.value,false);if(el.type==="range"){const out=el.nextElementSibling;if(out&&out.tagName==="OUTPUT")out.textContent=Number(el.value).toFixed(el.step<1?2:0)+(el.dataset.u||"")}};
      el.onchange=()=>{if(el.value!=="")act(k,el.value,true);sync()};
    });
  }
  function build(k){kind=k;closePop();cb.innerHTML=k==="text"?TEXT:IMG;bindAll(cb);cb.querySelectorAll("[data-pop]").forEach(b=>b.onclick=()=>openPop(b))}
  function sync(){
    const o=ed.active,k=ed.bgSel||!o?null:isT(o)?"text":isI(o)?"img":null;
    if(k!==kind||(k&&!cb.firstChild)){if(k)build(k);else{kind=null;closePop()}}
    cb.hidden=!k;bar2.hidden=!!k;
    if(!k)return;
    const set=(key,v)=>[cb,pop].forEach(r=>r&&r.querySelectorAll(`[data-c="${key}"]`).forEach(el=>{if(el===document.activeElement)return;if(el.type==="checkbox")el.checked=!!v;else el.value=v;if(el.type==="range"){const out=el.nextElementSibling;if(out&&out.tagName==="OUTPUT")out.textContent=Number(v).toFixed(el.step<1?2:0)+(el.dataset.u||"")}}));
    if(k==="text"){
      const o2=o.type&&texts()[0]||o,w=ws(o2),wsel=cb.querySelector('[data-c="weight"]');
      if(wsel&&wsel!==document.activeElement){wsel.innerHTML=w.map(x=>`<option value="${x}">${WN[x]||"Peso"} · ${x}</option>`).join("")}
      set("font",o2.fontFamily);set("weight",String(o2.fontWeight));set("size",Math.round(o2.fontSize*(o2.scaleY||1)));set("fill",hex(o2.fill));set("opacity",Math.round((o2.opacity??1)*100));
      set("stroke",hex(o2.stroke));set("sw",o2.strokeWidth||0);const sh=o2.shadow;set("shOn",!!sh);set("shC",hex(sh&&sh.color));set("shB",sh?sh.blur:12);set("shX",sh?sh.offsetX:0);set("shY",sh?sh.offsetY:4);set("lh",o2.lineHeight);set("cs",o2.charSpacing||0);
      const tg=(a,on)=>cb.querySelectorAll(`[data-c="${a}"]`).forEach(b=>{b.classList.toggle("is-on",on);b.setAttribute("aria-pressed",String(on))});
      tg("bold",+o2.fontWeight>=700);tg("stT",(o2.strokeWidth||0)>0);tg("shT",!!o2.shadow);tg("italic",o2.fontStyle==="italic");tg("al",o2.textAlign==="left"||!o2.textAlign);tg("ac",o2.textAlign==="center");tg("ar",o2.textAlign==="right");
    } else {
      set("iopacity",Math.round((o.opacity??1)*100));set("blend",o.globalCompositeOperation||"source-over");
      const sb=cb.querySelector('[data-c="ishadow"]');if(sb){sb.classList.toggle("is-on",!!o.shadow)}
    }
  }
  ["selection:created","selection:updated","selection:cleared","object:modified","text:changed"].forEach(n=>c.on(n,sync));
  ed.on("change",sync);ed.on("history",sync);
  sync();
}
