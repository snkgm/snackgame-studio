import {I} from "../app/icons.js";
import {esc} from "../app/ui.js";
import {FONTS,loadFont} from "../app/fonts.js";
import {FORMATS} from "../app/formats.js";
import {safeOf} from "../studio/skeleton.js";
import {mountBgPanel} from "./bgpanel.js";
import {applyProductImage,openProductPicker} from "./product.js";
import {toast} from "../app/ui.js";
import {FIELDS} from "./editor.js";
import {Shadow} from "../../vendor/fabric.min.mjs";
const num=(k,l,extra="")=>`<div class="field"><label for="i-${k}">${l}</label><input class="input" type="number" id="i-${k}" data-k="${k}" ${extra}></div>`;
const rng=(k,l,min,max,step=1)=>`<div class="field"><label for="i-${k}">${l}</label><input type="range" id="i-${k}" data-k="${k}" min="${min}" max="${max}" step="${step}"></div>`;
const rnum=(k,l,pct)=>`<div class="field"><label for="r-${k}">${l}</label><input class="input" type="number" id="r-${k}" data-r="${k}"${pct?" data-pct":""} step="${pct?1:"any"}"></div>`;
const COLRULE=`<div class="field"><label for="r-color">Color automático</label><select class="select" id="r-color" data-r="color"><option value="">Fijo</option><option value="contrast">Contraste con el fondo</option><option value="accent">Acento del producto</option><option value="color2">Color 2 del fondo</option></select></div>`;
const col=(k,l)=>`<div class="field"><label for="i-${k}">${l}</label><input class="input" type="color" id="i-${k}" data-k="${k}"></div>`;
const sec=(t,b)=>`<section class="sec"><div class="sec__head"><span class="label">${t}</span></div>${b}</section>`;
const isText=o=>o&&o.type.toLowerCase()==="textbox";
const ROLE={text:"Texto",web:"Dirección web",logo:"Logotipo",product:"Producto",background:"Fondo",shape:"Forma",decor:"Elemento"};
const alignBar=`<div class="alignbar">${[["left","align-start-vertical"],["hcenter","align-center-vertical"],["right","align-end-vertical"],["top","align-start-horizontal"],["vcenter","align-center-horizontal"],["bottom","align-end-horizontal"]].map(([k,i])=>`<button class="btn btn--ghost btn--icon btn--sm" data-align="${k}" title="Alinear ${k}">${I[i]}</button>`).join("")}</div>`;
function textHtml(o){
  const fam=FONTS.find(f=>f.family===o.fontFamily)||FONTS[0];
  return sec("Texto",`<div class="field"><label for="i-text">Contenido</label><textarea class="input input--area" id="i-text" data-k="text" rows="2"></textarea></div>
<div class="row"><div class="field"><label for="i-fontFamily">Fuente</label><select class="select" id="i-fontFamily" data-k="fontFamily">${FONTS.map(f=>`<option value="${f.family}">${f.family}</option>`).join("")}</select></div>
<div class="field"><label for="i-fontWeight">Peso</label><select class="select" id="i-fontWeight" data-k="fontWeight">${fam.weights.map(w=>`<option value="${w}">${w}</option>`).join("")}</select></div></div>
<div class="row">${num("fontSize","Tamaño","min=8 max=600")}${col("fill","Color")}</div>
<div class="row"><div class="field"><label>Alineación</label><div class="seg seg--icons" data-k="textAlign">${[["left","align-left"],["center","align-center"],["right","align-right"]].map(([v,i])=>`<button data-v="${v}" aria-label="${v}">${I[i]}</button>`).join("")}</div></div>${rng("opacity","Opacidad",0,100)}</div>
<div class="row">${rng("lineHeight","Interlineado",0.6,2.4,0.05)}${rng("charSpacing","Espaciado",-100,800,10)}</div>`)+
  sec("Contorno y sombra",`<div class="row">${col("stroke","Contorno")}${num("strokeWidth","Grosor","min=0 max=40")}</div>
<label class="chk"><input type="checkbox" data-k="shadowOn"> Sombra</label>
<div class="row sh">${col("shColor","Color")}${num("shBlur","Difuminado","min=0 max=200")}</div><div class="row sh">${num("shX","Desp. X","")}${num("shY","Desp. Y","")}</div>`)+
  sec("Reglas de plantilla",`<label class="chk"><input type="checkbox" data-r="fit"> Ajustar tamaño a la caja</label><div class="row">${rnum("max","Tamaño máx.")}${rnum("maxH","Alto máx.")}</div>${COLRULE}`)+
  sec("Dato dinámico",`<div class="field"><label for="i-field">Vincular a</label><select class="select" id="i-field" data-k="field"><option value="">Texto fijo</option>${Object.entries(FIELDS).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
<div class="field" id="pat"><label for="i-pattern">Formato</label><input class="input" id="i-pattern" data-k="pattern" placeholder="{valor}"><span class="hint">Usa {valor}. Ej.: «Nº {valor}» o «{valor} €».</span></div>`);
}
const shapeHtml=o=>sec("Reglas de plantilla",COLRULE)+sec("Relleno",`<div class="row">${col("fill","Relleno")}${col("stroke","Contorno")}</div><div class="row">${num("strokeWidth","Grosor","min=0 max=80")}${o.type.toLowerCase()==="rect"?num("rx","Radio","min=0 max=600"):"<span></span>"}</div>`)+
  sec("Sombra",`<label class="chk"><input type="checkbox" data-k="shadowOn"> Sombra</label><div class="row sh">${col("shColor","Color")}${num("shBlur","Difuminado","min=0 max=200")}</div><div class="row sh">${num("shX","Desp. X","")}${num("shY","Desp. Y","")}</div>`);
const productHtml=()=>sec("Producto",`<div class="row"><button class="btn btn--sm" data-pact="remove">Quitar fondo</button><button class="btn btn--sm" data-pact="orig">Ver original</button></div><button class="btn btn--sm" data-pact="change">Cambiar producto…</button>`)+sec("Colocación (regla de plantilla)",`<div class="row">${rnum("cx","Centro X %",1)}${rnum("cy","Centro Y %",1)}</div><div class="row">${rnum("maxW","Ancho máx. %",1)}${rnum("maxH","Alto máx. %",1)}</div><div class="row">${rnum("angle","Rotación inicial")}<label class="chk"><input type="checkbox" data-r="shadow"> Sombra auto</label></div><div class="row"><button class="btn btn--sm" data-pact="apply">Aplicar regla</button><button class="btn btn--sm" data-pact="capture">Usar posición actual</button></div>`);
const imageHtml=o=>(o.role==="product"?productHtml():"")+sec("Recorte",`<div class="row">${num("cropX","Izq.","min=0")}${num("cropY","Arriba","min=0")}</div><div class="row">${num("cropW","Ancho","min=1")}${num("cropH","Alto","min=1")}</div>`)+sec("Imagen",`<label class="chk"><input type="checkbox" data-k="shadowOn"> Sombra</label><div class="row sh">${col("shColor","Color")}${num("shBlur","Difuminado","min=0 max=200")}</div><div class="row sh">${num("shX","Desp. X","")}${num("shY","Desp. Y","")}</div>`);
const transformHtml=o=>sec("Posición y tamaño",`${alignBar}<div class="row">${num("x","X")}${num("y","Y")}</div><div class="row">${num("w","Ancho","min=1")}${isText(o)?"<span></span>":num("h","Alto","min=1")}</div><div class="row">${num("angle","Rotación","min=-360 max=360")}${isText(o)?"":rng("opacity","Opacidad",0,100)}</div>`);
export function mountInspector(root,ed,onFormat,getFmt=()=>FORMATS[0],afterProduct=()=>{}){
  let key="";const bgp=mountBgPanel(ed);
  const sh=o=>o.shadow||null;
  const read={
    text:o=>o.text,fontFamily:o=>o.fontFamily,fontWeight:o=>String(o.fontWeight),fontSize:o=>Math.round(o.fontSize*(o.scaleY||1)),fill:o=>typeof o.fill==="string"&&/^#[0-9a-f]{6}$/i.test(o.fill)?o.fill:"#000000",
    textAlign:o=>o.textAlign,opacity:o=>Math.round((o.opacity??1)*100),lineHeight:o=>o.lineHeight,charSpacing:o=>o.charSpacing,
    stroke:o=>typeof o.stroke==="string"&&/^#[0-9a-f]{6}$/i.test(o.stroke)?o.stroke:"#000000",strokeWidth:o=>o.strokeWidth||0,rx:o=>o.rx||0,
    shadowOn:o=>!!sh(o),shColor:o=>sh(o)?.color?.startsWith("#")?sh(o).color:"#000000",shBlur:o=>sh(o)?.blur??30,shX:o=>sh(o)?.offsetX??0,shY:o=>sh(o)?.offsetY??10,
    field:o=>o.field||"",pattern:o=>o.pattern||"{valor}",
    cropX:o=>Math.round(o.cropX||0),cropY:o=>Math.round(o.cropY||0),cropW:o=>Math.round(o.width),cropH:o=>Math.round(o.height),
    x:o=>Math.round(ed.xy(o).x),y:o=>Math.round(ed.xy(o).y),w:o=>Math.round(o.getScaledWidth()),h:o=>Math.round(o.getScaledHeight()),angle:o=>Math.round(o.angle||0)
  };
  const setShadow=(o,patch)=>{const c=o.shadow||{};const s=new Shadow({color:patch.color??c.color??"#000000",blur:patch.blur??c.blur??30,offsetX:patch.x??c.offsetX??0,offsetY:patch.y??c.offsetY??10});o.set("shadow",s)};
  const apply=(k,v,o)=>{
    const t=isText(o);
    switch(k){
      case"text":o.set("text",v);if(o.field){o.set("field",null)}break;
      case"fontFamily":{const f=FONTS.find(x=>x.family===v);const w=f.weights.includes(+o.fontWeight)?+o.fontWeight:f.weights.includes(700)?700:f.weights[0];o.set({fontFamily:v,fontWeight:w});loadFont(v,w).then(()=>{o.initDimensions?.();o.dirty=true;ed.canvas.requestRenderAll()});key="";break}
      case"fontWeight":o.set("fontWeight",+v);loadFont(o.fontFamily,+v).then(()=>{o.initDimensions?.();ed.canvas.requestRenderAll()});break;
      case"fontSize":o.set({fontSize:+v,scaleX:1,scaleY:1});break;
      case"fill":case"stroke":o.set(k,v);if(k==="stroke"&&!o.strokeWidth)o.set("strokeWidth",t?2:4);break;
      case"textAlign":case"lineHeight":case"charSpacing":o.set(k,k==="textAlign"?v:+v);break;
      case"opacity":o.set("opacity",+v/100);break;
      case"strokeWidth":o.set("strokeWidth",+v);break;
      case"rx":o.set({rx:+v,ry:+v});break;
      case"shadowOn":o.set("shadow",v?new Shadow({color:"#000000",blur:30,offsetX:0,offsetY:10}):null);break;
      case"shColor":setShadow(o,{color:v});break;case"shBlur":setShadow(o,{blur:+v});break;case"shX":setShadow(o,{x:+v});break;case"shY":setShadow(o,{y:+v});break;
      case"field":o.set("field",v||null);ed.applyFields();break;
      case"pattern":o.set("pattern",v||"{valor}");ed.applyFields();break;
      case"x":ed.setXY(o,+v,ed.xy(o).y);break;case"y":ed.setXY(o,ed.xy(o).x,+v);break;
      case"w":if(t)o.set({width:+v,scaleX:1});else o.set("scaleX",+v/o.width);break;
      case"h":o.set("scaleY",+v/o.height);break;
      case"angle":o.set("angle",+v);break;
      case"cropX":case"cropY":o.set(k,Math.max(0,+v));break;case"cropW":o.set("width",Math.max(1,+v));break;case"cropH":o.set("height",Math.max(1,+v));break;
    }
    o.setCoords();
  };
  function html(){
    const o=ed.active;
    if(!o&&ed.bgSel)return bgp.html();
    if(!o){
      const f=getFmt(),sf=safeOf(f.id,ed.cfg);
      return sec("Lienzo",`<div class="field"><label for="fmt">Formato</label><select class="select" id="fmt">${FORMATS.filter(x=>!x.slides||x.id===f.id).map(x=>`<option value="${x.id}">${x.label} · ${x.w}×${x.h}</option>`).join("")}</select></div>`)+
      sec("Zonas seguras (px)",`<div class="row"><div class="field"><label for="s-t">Arriba</label><input class="input" type="number" id="s-t" data-safe="t" min="0" value="${sf.t}"></div><div class="field"><label for="s-b">Abajo</label><input class="input" type="number" id="s-b" data-safe="b" min="0" value="${sf.b}"></div></div><div class="row"><div class="field"><label for="s-l">Izquierda</label><input class="input" type="number" id="s-l" data-safe="l" min="0" value="${sf.l}"></div><div class="field"><label for="s-r">Derecha</label><input class="input" type="number" id="s-r" data-safe="r" min="0" value="${sf.r}"></div></div><span class="hint">Se dibujan con el botón Zonas. Las plantillas nuevas las respetan.</span>`)+
      sec("Plantilla",`<label class="chk"><input type="checkbox" data-cfg="removeBg"${!ed.cfg.product||ed.cfg.product.removeBg!==false?" checked":""}> Quitar el fondo del producto automáticamente</label><span class="hint">Selecciona una capa para editarla, o «Fondo» en la lista de capas.</span>`);
    }
    const t=isText(o),img=o.type.toLowerCase()==="image";
    return `<div class="insp__role">${esc(ROLE[o.role]||"Elemento")}<b>${esc(o.name||"")}</b></div>${t?textHtml(o):img?imageHtml(o):shapeHtml(o)}${transformHtml(o)}`;
  }
  function sync(){
    const o=ed.active;
    if(!o&&!ed.bgSel){const f=root.querySelector("#fmt");if(f)f.value=getFmt().id;return}
    if(!o){bgp.sync(root);return}
    if(!o)return;
    root.querySelectorAll("[data-k]").forEach(el=>{
      const k=el.dataset.k;if(!(k in read)||el===document.activeElement)return;
      const v=read[k](o);
      if(el.type==="checkbox")el.checked=v;
      else if(el.classList.contains("seg")){el.querySelectorAll("button").forEach(b=>b.classList.toggle("is-on",b.dataset.v===v))}
      else el.value=v;
    });
    root.querySelectorAll("[data-r]").forEach(el=>{if(el===document.activeElement)return;const r=o.role==="product"?ed.ruleOf(o):(o.rule||{});let v=r[el.dataset.r];if(el.dataset.pct)v=Math.round((v??0)*100);if(el.type==="checkbox")el.checked=!!v;else el.value=v??""});
    root.querySelectorAll(".sh").forEach(r=>r.hidden=!read.shadowOn(o));
    const pat=root.querySelector("#pat");if(pat)pat.hidden=!o.field;
  }
  function render(){
    const o=ed.active;
    const k=(o?(o.__uid??=Math.random().toString(36).slice(2))+o.type+o.fontFamily:"")+"|"+(ed.bgSel?"bg":"")+(o?"":ed.W+"x"+ed.H+getFmt().id)+(ed.bgSel?(ed.cfg.bg&&ed.cfg.bg.mode)+(ed.cfg.bg&&ed.cfg.bg.n):"");
    if(k!==key){key=k;root.innerHTML=html();}
    sync();
  }
  root.addEventListener("input",e=>{
    const el=e.target;
    if(el.dataset.safe){ed.cfg.safe={...safeOf(getFmt().id,ed.cfg),[el.dataset.safe]:Math.max(0,+el.value||0)};ed.emit("safe");return}
    if(el.dataset.cfg){(ed.cfg.product??={})[el.dataset.cfg]=el.checked;ed.commit();return}
    if(el.dataset.r&&ed.active){
      const o=ed.active,k=el.dataset.r;let v=el.type==="checkbox"?el.checked:el.dataset.pct?(+el.value)/100:el.type==="number"?+el.value:el.value;
      if(el.type==="number"&&el.value==="")return;
      const base=o.role==="product"?ed.ruleOf(o):(o.rule||{});const r={...base,[k]:v};
      if(k==="fit"&&v){r.max=r.max||Math.round(o.fontSize);r.maxH=r.maxH||Math.round(o.height*(o.scaleY||1))}
      o.set("rule",r);
      if(k==="color")ed.applyColorRules();if(k==="fit"||k==="max"||k==="maxH")ed.applyFields();
      if(el.type==="checkbox"||el.tagName==="SELECT")ed.commit();return;
    }
    const o=ed.active;if(!o||!el.dataset.k)return;
    const v=el.type==="checkbox"?el.checked:el.value;
    if(el.type==="number"&&v==="")return;
    apply(el.dataset.k,v,o);ed.canvas.requestRenderAll();
    if(el.type==="checkbox"||el.tagName==="SELECT"){ed.commit();sync()}
    else root.querySelectorAll(".sh").forEach(r=>r.hidden=!read.shadowOn(o));
  });
  root.addEventListener("change",e=>{
    const el=e.target;
    if(el.id==="fmt"){onFormat(el.value);return}
    if(el.dataset.safe)return;
    if(ed.active&&(el.dataset.k||el.dataset.r))ed.commit();
  });
  root.addEventListener("click",async e=>{
    const pa=e.target.closest("[data-pact]")?.dataset.pact,o=ed.active;
    if(pa&&o){
      try{
        if(pa==="remove"){const t=toast("Quitando fondo…",{ms:600000});try{await applyProductImage(ed,{orig:o.orig||o.getSrc(),remove:true},m=>{t.querySelector("span").textContent=m})}finally{t.close()}}
        else if(pa==="orig"){await ed.setProductImage(o.orig||o.getSrc(),{orig:o.orig});ed.commit()}
        else if(pa==="change")openProductPicker(ed,afterProduct);
        else if(pa==="apply"){ed.placeProduct(o);ed.commit()}
        else if(pa==="capture"){ed.captureProductRule(o)}
      }catch(err){toast(err.message,{kind:"err"})}
      return;
    }
    const a=e.target.closest("[data-align]");if(a){ed.align(a.dataset.align);return}
    const b=e.target.closest(".seg[data-k] button");if(b&&ed.active){apply(b.parentElement.dataset.k,b.dataset.v,ed.active);ed.commit();sync()}
  });
  bgp.bind(root,()=>{key="";render()});
  ed.on("change",render);ed.on("format",()=>{key="";render()});ed.on("history",()=>{if(ed.active)sync()});
  render();
  return {render,reset:()=>{key="";render()}};
}
