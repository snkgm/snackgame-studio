import {I} from "../app/icons.js?v=20261125n";
import {esc} from "../app/ui.js?v=20261125n";
import {FONTS,loadFont} from "../app/fonts.js?v=20261125n";
import {FORMATS} from "../app/formats.js?v=20261125n";
import {safeOf} from "../studio/skeleton.js?v=20261125n";
import {mountBgPanel} from "./bgpanel.js?v=20261125n";
import {applyProductImage,openProductPicker} from "./product.js?v=20261125n";
import {toast} from "../app/ui.js?v=20261125n";
import {mattingDefaults} from "../img/matting.js?v=20261125n";
import {store} from "../app/store.js?v=20261125n";
import {FIELDS,BLENDS} from "./editor.js?v=20261125n";
import {enhance} from "./accordion.js?v=20261125n";
import {saveSnap} from "./snap.js?v=20261125n";
import {TEXT_STYLES,restyle} from "./textstyles.js?v=20261125n";
import {PF_PRESETS,CATS,getPfx,setPfx,undoPfx,resetCat,resetAll,applyPreset,applyPfx} from "./photofx.js?v=20261125n";
import {Shadow} from "../../vendor/fabric.min.mjs?v=20261125n";
const num=(k,l,extra="")=>`<div class="field"><label for="i-${k}">${l}</label><input class="input" type="number" id="i-${k}" data-k="${k}" ${extra}></div>`;
const rng=(k,l,min,max,step=1)=>`<div class="field"><label for="i-${k}">${l}</label><input type="range" id="i-${k}" data-k="${k}" min="${min}" max="${max}" step="${step}"></div>`;
const rnum=(k,l,pct)=>`<div class="field"><label for="r-${k}">${l}</label><input class="input" type="number" id="r-${k}" data-r="${k}"${pct?" data-pct":""} step="${pct?1:"any"}"></div>`;
const COLRULE=`<div class="field"><label for="r-color">Color automático</label><select class="select" id="r-color" data-r="color"><option value="">Fijo</option><option value="contrast">Contraste con el fondo</option><option value="accent">Acento del producto</option><option value="color2">Color 2 del fondo</option></select></div>`;
const col=(k,l)=>`<div class="field"><label for="i-${k}">${l}</label><input class="input" type="color" id="i-${k}" data-k="${k}"></div>`;
const sec=(t,b,rk)=>`<section class="sec"><div class="sec__head"><span class="label">${t}</span>${rk?`<button class="sec__reset" data-reset="${rk}" title="Restablecer a valores de fábrica" aria-label="Restablecer ${t}">${I["rotate-ccw"]}</button>`:""}</div>${b}</section>`;
const isText=o=>o&&o.type.toLowerCase()==="textbox";
const ROLE={text:"Texto",web:"Dirección web",logo:"Logotipo",product:"Producto",background:"Fondo",shape:"Forma",decor:"Elemento"};
const alignBar=`<div class="alignbar">${[["left","align-start-vertical"],["hcenter","align-center-vertical"],["right","align-end-vertical"],["top","align-start-horizontal"],["vcenter","align-center-horizontal"],["bottom","align-end-horizontal"]].map(([k,i])=>`<button class="btn btn--ghost btn--icon btn--sm" data-align="${k}" title="Alinear ${k}">${I[i]}</button>`).join("")}</div>`;
const SV=d=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TBI={typo:SV('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),dim:SV('<path d="M21 3H3M21 21H3M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'),color:SV('<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H18a4 4 0 0 0 4-4c0-5-4.5-9.4-10-9.4Z"/>'),align:I["align-center"],fx:SV('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z"/>'),pos:SV('<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>')};
const TBN={typo:"Tipografía",dim:"Dimensiones",color:"Color",align:"Alineación",fx:"Efectos",pos:"Posición y transformación"};
const JU=SV('<path d="M3 6h18M3 10h18M3 14h18M3 18h18"/>');
const tg=(k,l,ic)=>`<button type="button" class="tgl" data-tg="${k}" title="${l}" aria-label="${l}" aria-pressed="false">${ic}</button>`;
function textPanels(o){
  const fam=FONTS.find(f=>f.family===o.fontFamily)||FONTS[0];
  const sw=[...new Set([...(JSON.parse(localStorage.getItem("sg.colors")||"[]")),...(window.studio&&window.studio.palette||[])])].slice(0,16);
  return {
   typo:`<div class="field"><label for="i-fontFamily">Fuente</label><select class="select" id="i-fontFamily" data-k="fontFamily">${FONTS.map(f=>`<option value="${f.family}">${f.family}</option>`).join("")}</select></div>
<div class="field"><label for="i-fontWeight">Peso</label><select class="select" id="i-fontWeight" data-k="fontWeight">${fam.weights.map(w=>`<option value="${w}">${w}</option>`).join("")}</select></div>
<div class="tgls">${tg("bold","Negrita",SV('<path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/>'))}${tg("italic","Cursiva",SV('<path d="M19 4h-9M14 20H5M15 4 9 20"/>'))}</div>
<div class="field"><label>Estilos disponibles</label><div class="tsts">${TEXT_STYLES.map(t=>`<button type="button" class="btn btn--sm" data-tst="${t.id}">${t.name}</button>`).join("")}</div></div>`,
   dim:`<div class="row">${num("fontSize","Tamaño de fuente","min=8 max=600")}${num("charSpacing","Espaciado","step=10")}</div><div class="row"><div class="field"><label for="d-w">Anchura del cuadro</label><input class="input" type="number" id="d-w" data-k="w" min="24"></div><div class="field"><label for="d-h">Altura del cuadro</label><input class="input" type="number" id="d-h" data-k="h" min="0"></div></div>${rng("lineHeight","Interlineado",0.6,2.4,0.05)}<span class="hint">El cuadro cambia sin tocar el tamaño de la fuente. La altura nunca baja del texto: no se corta contenido.</span>`,
   color:`${col("fill","Color del texto")}${rng("opacity","Opacidad",0,100)}<div class="field"><label>Colores guardados</label><div class="sws">${sw.map(c=>`<button type="button" class="sw" data-sw="${c}" style="background:${c}" title="${c}" aria-label="${c}"></button>`).join("")}<button type="button" class="sw sw--add" data-savecol title="Guardar el color actual" aria-label="Guardar el color actual">+</button></div></div>`,
   align:`<div class="seg seg--icons" data-k="textAlign">${[["left",I["align-left"]],["center",I["align-center"]],["right",I["align-right"]],["justify",JU]].map(([v,i])=>`<button data-v="${v}" aria-label="${v}" title="${v}">${i}</button>`).join("")}</div>`,
   fx:`<label class="chk"><input type="checkbox" data-k="shadowOn"> Sombra</label><div class="row sh">${col("shColor","Color")}${num("shBlur","Difuminado","min=0 max=200")}</div><div class="row sh">${num("shX","Desp. X","")}${num("shY","Desp. Y","")}</div>
<div class="row">${col("stroke","Contorno")}${num("strokeWidth","Grosor","min=0 max=40")}</div><div class="row">${col("bgc","Fondo del texto")}<div class="field"><label>&nbsp;</label><button type="button" class="btn btn--sm" data-bgoff>Quitar fondo</button></div></div>${rng("opacity","Opacidad",0,100)}<button type="button" class="btn btn--sm" data-reset="tstroke">Restablecer efectos</button>`,
   pos:`${alignBar}<div class="row">${num("x","X")}${num("y","Y")}</div><div class="row"><div class="field"><label for="p-w">Anchura</label><input class="input" type="number" id="p-w" data-k="w" min="24"></div><div class="field"><label for="p-h">Altura</label><input class="input" type="number" id="p-h" data-k="h" min="0"></div></div>${num("angle","Rotación","min=-360 max=360")}`
  };
}
function textHtml(o){
  const P=textPanels(o);
  return sec("Contenido",`<div class="field"><label for="i-text">Texto</label><textarea class="input input--area" id="i-text" data-k="text" rows="3"></textarea></div><span class="hint">La tipografía, el tamaño, el color y los efectos están en la barra superior.</span>`)+
  sec("Reglas de plantilla",`<label class="chk"><input type="checkbox" data-r="fit"> Ajustar tamaño a la caja</label><div class="row">${rnum("min","Tamaño mín.")}${rnum("max","Tamaño máx.")}</div><div class="row">${rnum("maxH","Alto máx.")}${rnum("chars","Límite de caracteres")}</div><div class="field"><label for="r-empty">Si el producto no tiene el dato</label><select class="select" id="r-empty" data-r="empty"><option value="">Dejar vacío</option><option value="hide">Ocultar el elemento</option><option value="alt">Usar texto alternativo</option></select></div><div class="field"><label for="r-alt">Texto alternativo</label><input class="input" id="r-alt" data-r="alt"></div>${COLRULE}`)+
  sec("Dato dinámico",`<div class="field"><label for="i-field">Vincular a</label><select class="select" id="i-field" data-k="field"><option value="">Texto fijo</option>${Object.entries(FIELDS).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
<div class="field" id="pv"><label for="i-pval">Valor del dato</label><input class="input" id="i-pval" data-pv><span class="hint">Cambia el dato del producto: se actualiza en todas las capas que lo usan y en las listas automáticas.</span></div><div class="field" id="pat"><label for="i-pattern">Formato</label><input class="input" id="i-pattern" data-k="pattern" placeholder="{valor}"><span class="hint">Usa {valor}. Ej.: «Nº {valor}» o «{valor} €».</span></div>`)+
  `<div class="tpan" id="tpan" hidden>${Object.keys(P).map(k=>`<div class="tpan__b" data-tpn="${k}" hidden><div class="tpan__h">${TBN[k]}</div>${P[k]}</div>`).join("")}</div>`;
}
const shapeHtml=o=>sec("Reglas de plantilla",COLRULE)+(o.type.toLowerCase()==="line"?sec("Línea",`<div class="row">${col("stroke","Color")}${num("strokeWidth","Grosor","min=1 max=200")}</div>`):sec("Relleno",`<div class="row">${col("fill","Relleno")}${col("stroke","Contorno")}</div><div class="row">${num("strokeWidth","Grosor","min=0 max=80")}${o.type.toLowerCase()==="rect"?num("rx","Radio","min=0 max=600"):"<span></span>"}</div>`))+
  sec("Sombra",`<label class="chk"><input type="checkbox" data-k="shadowOn"> Sombra</label><div class="row sh">${col("shColor","Color")}${num("shBlur","Difuminado","min=0 max=200")}</div><div class="row sh">${num("shX","Desp. X","")}${num("shY","Desp. Y","")}</div>`,"shadow");
const productHtml=()=>sec("Producto",`<div class="row"><button class="btn btn--sm" data-pact="remove">Quitar fondo</button><button class="btn btn--sm" data-pact="remove-ai" title="Recorte con IA, más lento (~40 s la primera vez). Útil si el fondo no es liso.">Quitar con IA</button></div><div class="field"><label for="m-tol">Umbral de fondo: <b id="m-tolv">${mattingDefaults.tol}</b></label><input type="range" id="m-tol" min="2" max="60" value="${mattingDefaults.tol}"><span class="hint">Bajo: protege cajas blancas. Alto: quita sombras y restos de fondo.</span></div><label class="chk"><input type="checkbox" id="m-holes"${mattingDefaults.holes?" checked":""}> Quitar huecos interiores (entre piernas, asas)</label><div class="row"><button class="btn btn--sm" data-pact="retol">Aplicar a esta imagen</button><button class="btn btn--sm" data-pact="tolglobal" title="Usa este umbral en todas las imágenes nuevas, también en las listas automáticas">Usar como general</button></div><button class="btn btn--sm" data-pact="orig">Restaurar original</button><button class="btn btn--sm" data-pact="change">Cambiar producto…</button>`)+sec("Colocación (regla de plantilla)",`<div class="row">${rnum("cx","Centro X %",1)}${rnum("cy","Centro Y %",1)}</div><div class="row">${rnum("maxW","Ancho máx. %",1)}${rnum("maxH","Alto máx. %",1)}</div><div class="row">${rnum("angle","Rotación inicial")}<label class="chk"><input type="checkbox" data-r="shadow"> Sombra auto</label></div><div class="row"><button class="btn btn--sm" data-pact="apply">Aplicar regla</button><button class="btn btn--sm" data-pact="capture">Usar posición actual</button></div>`);
const FL=[["dx","Desplazamiento X",-600,600],["dy","Desplazamiento Y",-600,600],["z","Elevación (Z) · negativo = detrás de la caja",-600,600],["opacity","Opacidad",0,100],["blur","Difuminación",0,200],["spread","Expansión / contracción",-100,200],["size","Tamaño %",30,250],["angle","Ángulo de proyección",0,180],["intensity","Intensidad",0,100],["soft","Suavidad",0,100],["persp","Perspectiva (aplanado)",0,100],["skew","Inclinación de perspectiva",-100,100],["vscale","Altura de la sombra %",20,300]];
const floorHtml=()=>sec("Sombra de suelo",`<label class="chk"><input type="checkbox" data-fl="on"> Activar sombra de contacto</label>${FL.map(([k,l,a,b])=>`<div class="field"><label for="fl-${k}">${l}: <b data-flv="${k}"></b></label><input type="range" id="fl-${k}" data-fl="${k}" min="${a}" max="${b}"></div>`).join("")}<div class="field"><label for="fl-color">Color</label><input class="input" type="color" id="fl-color" data-fl="color"></div><button class="btn btn--sm" data-pact="autofloor" title="Recalcula los valores a partir de la silueta del producto">Restablecer automático</button><span class="hint">Se calcula con la silueta del producto, sigue al producto y se guarda en la plantilla.</span>`,"floor");
const blendHtml=o=>sec("Fusión",`<div class="field"><label for="i-blend">Modo de fusión</label><select class="select" id="i-blend" data-k="blend">${BLENDS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div>`,"blend");
const overlayHtml=o=>sec("Overlay",`<div class="row"><button class="btn btn--sm" data-pact="ovfit">Ajustar al lienzo</button>${o.gen?'<button class="btn btn--sm" data-pact="ovseed">Nueva variación</button>':"<span></span>"}</div>${rng("opacity","Opacidad",0,100)}`,"overlay");
const PXL={bright:["Brillo",-100,100],contrast:["Contraste",-100,100],sat:["Saturación",-100,100],temp:["Temperatura",-100,100],hue:["Tono",-180,180],expo:["Exposición",-100,100],hi:["Luces (aprox.)",-100,100],sh:["Sombras (aprox.)",-100,100],sharp:["Nitidez",0,100],blur:["Desenfoque",0,50],round:["Esquinas redondeadas %",0,50],vig:["Viñeta",0,100],grain:["Grano / textura",0,50],duo:["Duotono",0,100]};
const prx=k=>`<div class="field px"><label for="i-px_${k}">${PXL[k][0]}</label><div class="row px__r"><input type="range" id="i-px_${k}" data-k="px_${k}" min="${PXL[k][1]}" max="${PXL[k][2]}"><input class="input px__n" type="number" data-k="px_${k}" min="${PXL[k][1]}" max="${PXL[k][2]}" aria-label="${PXL[k][0]}"></div></div>`;
const rst=(c,l="Restablecer categoría")=>`<button class="btn btn--ghost btn--sm" data-pact="pxcat" data-c="${c}">${l}</button>`;
const photoHtml=o=>sec("Ajustes básicos",CATS.A.map(prx).join("")+rst("A"),"px-a")
+sec("Filtros",`<div class="gpres px__f">${PF_PRESETS.map(([n],i)=>`<button type="button" class="btn btn--sm${(o.pfx&&o.pfx.preset===i)?" is-on":""}" data-pact="pxpre" data-i="${i}">${n}</button>`).join("")}</div><span class="hint">Se pueden afinar con los ajustes después.</span>`,"px-b")
+sec("Recorte y encuadre",`<div class="row">${num("cropX","Izq.","min=0")}${num("cropY","Arriba","min=0")}</div><div class="row">${num("cropW","Ancho","min=1")}${num("cropH","Alto","min=1")}</div><div class="row"><button class="btn btn--sm" data-pact="rot90">Rotar 90°</button><button class="btn btn--sm" data-pact="flipx">Voltear ↔</button></div><div class="row"><button class="btn btn--sm" data-pact="flipy">Voltear ↕</button><button class="btn btn--sm" data-pact="ovfit">Ajustar al lienzo</button></div><button class="btn btn--sm" data-pact="recrop">Recuperar encuadre original</button>`,"px-c")
+sec("Apariencia",`${rng("opacity","Opacidad",0,100)}${prx("round")}<div class="row">${col("stroke","Borde")}${num("strokeWidth","Grosor","min=0")}</div><button class="btn btn--sm" data-pact="glow">Resplandor</button>`,"px-d")
+sec("Efectos",["vig","grain","duo"].map(prx).join("")+`<div class="row">${`<div class="field"><label for="i-duoA">Duotono A</label><input class="input" type="color" id="i-duoA" data-k="px_duoA"></div><div class="field"><label for="i-duoB">Duotono B</label><input class="input" type="color" id="i-duoB" data-k="px_duoB"></div>`}</div>`+rst("E","Restablecer efectos"),"px-e")
+sec("Restablecer",`<div class="row"><button class="btn btn--sm" data-pact="pxundo">Deshacer último ajuste</button><button class="btn btn--sm" data-pact="pxall">Recuperar originales</button></div><span class="hint">La imagen original nunca se modifica.</span>`,"px-f");
const imageHtml=o=>(o.role==="product"?productHtml()+floorHtml():"")+photoHtml(o)+sec("Sombra",`<label class="chk"><input type="checkbox" data-k="shadowOn"> Sombra</label><div class="row sh">${col("shColor","Color")}${num("shBlur","Difuminado","min=0 max=200")}</div><div class="row sh">${num("shX","Desp. X","")}${num("shY","Desp. Y","")}</div>`,"shadow");
const transformHtml=o=>sec("Posición y tamaño",`${alignBar}<div class="row">${num("x","X")}${num("y","Y")}</div><div class="row">${num("w","Ancho","min=1")}${isText(o)?"<span></span>":num("h","Alto","min=1")}</div><div class="row">${num("angle","Rotación","min=-360 max=360")}${isText(o)?"":rng("opacity","Opacidad",0,100)}</div>`);
export function mountInspector(root,ed,onFormat,getFmt=()=>FORMATS[0],afterProduct=()=>{},getPreset=()=>null){
  let key="";const bgp=mountBgPanel(ed);
  const sh=o=>o.shadow||null;
  const read={
    text:o=>o.text,fontFamily:o=>o.fontFamily,fontWeight:o=>String(o.fontWeight),fontSize:o=>Math.round(o.fontSize*(o.scaleY||1)),fill:o=>typeof o.fill==="string"&&/^#[0-9a-f]{6}$/i.test(o.fill)?o.fill:"#000000",
    textAlign:o=>o.textAlign,opacity:o=>Math.round((o.opacity??1)*100),lineHeight:o=>o.lineHeight,charSpacing:o=>o.charSpacing,
    stroke:o=>typeof o.stroke==="string"&&/^#[0-9a-f]{6}$/i.test(o.stroke)?o.stroke:"#000000",strokeWidth:o=>o.strokeWidth||0,rx:o=>o.rx||0,
    shadowOn:o=>!!sh(o),shColor:o=>sh(o)?.color?.startsWith("#")?sh(o).color:"#000000",shBlur:o=>sh(o)?.blur??30,shX:o=>sh(o)?.offsetX??0,shY:o=>sh(o)?.offsetY??10,
    bgc:o=>typeof o.backgroundColor==="string"&&/^#[0-9a-f]{6}$/i.test(o.backgroundColor)?o.backgroundColor:"#ffc400",field:o=>o.field||"",pattern:o=>o.pattern||"{valor}",
    cropX:o=>Math.round(o.cropX||0),cropY:o=>Math.round(o.cropY||0),cropW:o=>Math.round(o.width),cropH:o=>Math.round(o.height),
    ...Object.fromEntries([...Object.keys(PXL),"duoA","duoB"].map(k=>["px_"+k,o=>getPfx(o)[k]])),
    blend:o=>o.globalCompositeOperation||"source-over",fx_bright:o=>ed.getFx(o).bright,fx_contrast:o=>ed.getFx(o).contrast,fx_sat:o=>ed.getFx(o).sat,fx_blur:o=>ed.getFx(o).blur,
    x:o=>Math.round(ed.xy(o).x),y:o=>Math.round(ed.xy(o).y),w:o=>Math.round(o.getScaledWidth()),h:o=>Math.round(o.getScaledHeight()),angle:o=>Math.round(o.angle||0)
  };
  const setShadow=(o,patch)=>{const c=o.shadow||{};const s=new Shadow({color:patch.color??c.color??"#000000",blur:patch.blur??c.blur??30,offsetX:patch.x??c.offsetX??0,offsetY:patch.y??c.offsetY??10});o.set("shadow",s)};
  const apply=(k,v,o)=>{
    const t=isText(o);
    switch(k){
      case"text":o.set("text",v);if(o.field){o.set("field",null)}break;
      case"fontFamily":{const f=FONTS.find(x=>x.family===v);const w=f.weights.includes(+o.fontWeight)?+o.fontWeight:f.weights.includes(700)?700:f.weights[0];o.set({fontFamily:v,fontWeight:w});loadFont(v,w).then(()=>{o.initDimensions?.();o.dirty=true;ed.canvas.requestRenderAll()});key="";break}
      case"fontWeight":o.set("fontWeight",+v);loadFont(o.fontFamily,+v).then(()=>{o.initDimensions?.();ed.canvas.requestRenderAll()});break;
      case"fontSize":o.set({fontSize:+v,scaleX:1,scaleY:1});o.initDimensions?.();break;
      case"fx_bright":case"fx_contrast":case"fx_sat":case"fx_blur":ed.setFx(o,{[k.slice(3)]:+v});break;
      case"px_bright":case"px_contrast":case"px_sat":case"px_temp":case"px_hue":case"px_expo":case"px_hi":case"px_sh":case"px_sharp":case"px_blur":case"px_round":case"px_vig":case"px_grain":case"px_duo":case"px_duoA":case"px_duoB":{const n=k.slice(3),now=Date.now(),h=!o._pft||now-o._pft>700;o._pft=now;setPfx(o,{[n]:/^duo[AB]$/.test(n)?v:+v,preset:undefined},{hist:h});break}
      case"fill":case"stroke":o.set(k,v);if(k==="stroke"&&!o.strokeWidth)o.set("strokeWidth",t?2:4);break;
      case"bgc":o.set("backgroundColor",v);break;
      case"textAlign":case"lineHeight":case"charSpacing":o.set(k,k==="textAlign"?v:+v);break;
      case"opacity":o.set("opacity",+v/100);break;
      case"blend":ed.setBlend(o,v);break;
      case"strokeWidth":o.set("strokeWidth",+v);break;
      case"rx":o.set({rx:+v,ry:+v});break;
      case"shadowOn":o.set("shadow",v?new Shadow({color:"#000000",blur:30,offsetX:0,offsetY:10}):null);break;
      case"shColor":setShadow(o,{color:v});break;case"shBlur":setShadow(o,{blur:+v});break;case"shX":setShadow(o,{x:+v});break;case"shY":setShadow(o,{y:+v});break;
      case"field":o.set("field",v||null);ed.applyFields();break;
      case"pattern":o.set("pattern",v||"{valor}");ed.applyFields();break;
      case"x":ed.setXY(o,+v,ed.xy(o).y);break;case"y":ed.setXY(o,ed.xy(o).x,+v);break;
      case"w":if(t){o.set({width:Math.max(24,+v),scaleX:1});o.initDimensions()}else o.set("scaleX",+v/o.width);break;
      case"h":if(t){o.set({boxH:Math.max(0,Math.round(+v)),scaleY:1});o.initDimensions()}else o.set("scaleY",+v/o.height);break;
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
      sec("Ajuste magnético",`<label class="chk"><input type="checkbox" data-snap="on"${ed.snapCfg.on?" checked":""}> Activar al mover y redimensionar</label><div class="field"><label for="sn-tol">Tolerancia: <b id="sn-v">${ed.snapCfg.tol}</b> px</label><input type="range" id="sn-tol" data-snap="tol" min="2" max="24" value="${ed.snapCfg.tol}"></div><span class="hint">Mantén Alt al arrastrar para desactivarlo un momento.</span>`)+
      sec("Guías personalizadas",`<div class="row"><input class="input" type="number" id="g-x" placeholder="X (px)" aria-label="Posición X de la guía vertical"><button class="btn btn--sm" data-gadd="x">Guía vertical</button></div><div class="row"><input class="input" type="number" id="g-y" placeholder="Y (px)" aria-label="Posición Y de la guía horizontal"><button class="btn btn--sm" data-gadd="y">Guía horizontal</button></div><div class="glist">${(ed.cfg.guides||[]).map((g,i)=>`<span class="gtag">${g.x!=null?"X "+g.x:"Y "+g.y}<button data-gdel="${i}" aria-label="Quitar guía">${I.x}</button></span>`).join("")||'<span class="hint">Sin guías. Se guardan con la plantilla.</span>'}</div>`)+
      sec("Plantilla",`<label class="chk"><input type="checkbox" data-cfg="removeBg"${!ed.cfg.product||ed.cfg.product.removeBg!==false?" checked":""}> Quitar el fondo del producto automáticamente</label><span class="hint">Selecciona una capa para editarla, o «Fondo» en la lista de capas.</span>`);
    }
    const t=isText(o),img=o.type.toLowerCase()==="image";
    return `<div class="insp__role">${esc(ROLE[o.role]||"Elemento")}<b>${esc(o.name||"")}</b></div>${(!t&&o.role==="overlay"?overlayHtml(o):"")}${t?textHtml(o):img?imageHtml(o)+(o.role==="product"&&getPreset()?sec("Preset del producto",`<button class="btn btn--sm" data-pact="preset" title="Guarda textos y fondo de este producto para reutilizarlos">Guardar como preset del producto</button>`):""):shapeHtml(o)}${t?"":blendHtml(o)}${t?"":transformHtml(o)}`;
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
    if(o.role==="product"){const F=ed.floorOf(o),on=!!(o.rule&&o.rule.floor&&o.rule.floor.on!==false);root.querySelectorAll("[data-fl]").forEach(el=>{if(el===document.activeElement)return;const k=el.dataset.fl;if(k==="on")el.checked=on;else el.value=F[k]});root.querySelectorAll("[data-flv]").forEach(b=>b.textContent=F[b.dataset.flv])}
    const pat=root.querySelector("#pat");if(pat)pat.hidden=!o.field;const pv=root.querySelector("#pv");if(pv){pv.hidden=!o.field;const pi=pv.querySelector("input");if(pi&&pi!==document.activeElement)pi.value=ed.product[o.field]??""}
  }
  let lastSid=null;
  function render(){
    const o=ed.active;
    const k=(o?(o.__uid??=Math.random().toString(36).slice(2))+o.type+o.fontFamily:"")+"|"+(ed.bgSel?"bg":"")+(o?"":ed.W+"x"+ed.H+getFmt().id)+(ed.bgSel?(ed.cfg.bg&&ed.cfg.bg.mode)+(ed.cfg.bg&&ed.cfg.bg.n):"")+(o?"":JSON.stringify(ed.cfg.guides||[]));
    if(k!==key){const sid=(o?o.__uid:"")+"|"+(ed.bgSel?"bg":"");const first=sid!==lastSid;lastSid=sid;key=k;root.innerHTML=html();enhance(root,first)}
    sync();tb();
  }
  let tp=null;const ttb=root.closest(".app")?.querySelector("#ttb");
  if(ttb&&!ttb.dataset.built){ttb.dataset.built=1;ttb.innerHTML=Object.keys(TBN).map(k=>`<button type="button" class="ttb__b" data-tp="${k}" title="${TBN[k]}" aria-label="${TBN[k]}" aria-pressed="false">${TBI[k]}</button>`).join("");
    ttb.addEventListener("click",e=>{const b=e.target.closest("[data-tp]");if(!b)return;tp=tp===b.dataset.tp?null:b.dataset.tp;tb()})}
  function tb(){
    const o=ed.active,show=!!(o&&isText(o)&&!ed.bgSel);
    if(ttb)ttb.hidden=!show;if(!show)tp=null;
    const pan=root.querySelector("#tpan");
    if(ttb)ttb.querySelectorAll("[data-tp]").forEach(b=>{const on=b.dataset.tp===tp;b.classList.toggle("is-on",on);b.setAttribute("aria-pressed",String(on))});
    if(!pan)return;pan.hidden=!tp||!show;
    pan.querySelectorAll("[data-tpn]").forEach(b=>b.hidden=b.dataset.tpn!==tp);
    if(tp&&show&&ttb){const tr=ttb.getBoundingClientRect(),bt=ttb.querySelector(`[data-tp="${tp}"]`).getBoundingClientRect();pan.style.left=(tr.right+8)+"px";pan.style.top=Math.max(8,Math.min(bt.top,innerHeight-pan.offsetHeight-8))+"px"}
    if(o&&isText(o)){root.querySelectorAll("[data-tg]").forEach(b=>{const on=b.dataset.tg==="bold"?+o.fontWeight>=700:o.fontStyle==="italic";b.classList.toggle("is-on",on);b.setAttribute("aria-pressed",String(on))})}
  }
  root.addEventListener("click",async e=>{
    const o=ed.active;if(!o||!isText(o))return;
    const g=e.target.closest("[data-tg]");
    if(g){if(g.dataset.tg==="italic")o.set("fontStyle",o.fontStyle==="italic"?"normal":"italic");else{const ws=(FONTS.find(f=>f.family===o.fontFamily)||FONTS[0]).weights,w=+o.fontWeight>=700?(ws.find(x=>x<=500)||ws[0]):(ws.includes(700)?700:ws[ws.length-1]);o.set("fontWeight",w);await loadFont(o.fontFamily,w)}
      o.initDimensions();o.setCoords();ed.canvas.requestRenderAll();ed.commit();key="";render();return}
    const ts=e.target.closest("[data-tst]");if(ts){await restyle(ed,o,TEXT_STYLES.find(x=>x.id===ts.dataset.tst));key="";render();return}
    const sw=e.target.closest("[data-sw]");if(sw){o.set("fill",sw.dataset.sw);ed.canvas.requestRenderAll();ed.commit();sync();return}
    if(e.target.closest("[data-savecol]")){const l=JSON.parse(localStorage.getItem("sg.colors")||"[]"),c=typeof o.fill==="string"?o.fill:"#ffffff";if(!l.includes(c)){l.unshift(c);try{localStorage.setItem("sg.colors",JSON.stringify(l.slice(0,16)))}catch{}}key="";render();return}
    if(e.target.closest("[data-bgoff]")){o.set("backgroundColor","");ed.canvas.requestRenderAll();ed.commit();return}
  });
  root.addEventListener("input",e=>{
    const el=e.target;
    if(el.dataset.fl&&ed.active&&ed.active.role==="product"){const k=el.dataset.fl;ed.setFloor({[k]:el.type==="checkbox"?el.checked:el.type==="range"?+el.value:el.value,...(k!=="on"&&!(ed.active.rule&&ed.active.rule.floor)?{on:true}:{})},{commit:false});const b=root.querySelector(`[data-flv="${k}"]`);if(b)b.textContent=el.value;if(el.type==="checkbox")ed.commit();return}
    if(el.dataset.pv!==undefined&&ed.active&&ed.active.field){ed.setProduct({[ed.active.field]:el.value});return}
    if(el.dataset.snap){const v=el.type==="checkbox"?el.checked:+el.value;ed.setSnap({[el.dataset.snap]:v});saveSnap(ed.snapCfg);const sv=root.querySelector("#sn-v");if(sv)sv.textContent=ed.snapCfg.tol;return}
    if(el.id==="m-tol"){root.querySelector("#m-tolv").textContent=el.value;return}
    if(el.dataset.safe){ed.cfg.safe={...safeOf(getFmt().id,ed.cfg),[el.dataset.safe]:Math.max(0,+el.value||0)};ed.emit("safe");return}
    if(el.dataset.cfg){(ed.cfg.product??={})[el.dataset.cfg]=el.checked;ed.commit();return}
    if(el.dataset.r&&ed.active){
      const o=ed.active,k=el.dataset.r;let v=el.type==="checkbox"?el.checked:el.dataset.pct?(+el.value)/100:el.type==="number"?+el.value:el.value;
      if(el.type==="number"&&el.value==="")return;
      const base=o.role==="product"?ed.ruleOf(o):(o.rule||{});const r={...base,[k]:v};
      if(k==="fit"&&v){r.max=r.max||Math.round(o.fontSize);r.maxH=r.maxH||Math.round(o.height*(o.scaleY||1))}
      o.set("rule",r);
      if(k==="color")ed.applyColorRules();if(["fit","max","min","maxH","chars","empty","alt"].includes(k))ed.applyFields();
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
    if(el.dataset.fl){ed.commit();return}
    if(ed.active&&(el.dataset.k||el.dataset.r))ed.commit();
  });
  root.addEventListener("click",async e=>{
    const rs=e.target.closest("[data-reset]");
    if(rs&&ed.active){const o=ed.active,k=rs.dataset.reset;
      if(k==="floor")ed.autoFloor();else if(k==="shadow")o.set("shadow",null);else if(k==="tstroke")o.set({stroke:null,strokeWidth:0,shadow:null});
      else if(k==="imgfx")ed.setFx(o,{bright:0,contrast:0,sat:0,blur:0});else if(k==="blend")ed.setBlend(o,"source-over");else if(k==="overlay")o.set("opacity",1);
      o.setCoords();ed.commit();key="";render();return}
    const pa=e.target.closest("[data-pact]")?.dataset.pact,o=ed.active;
    if(pa&&o){
      try{
        if(pa==="retol"||pa==="tolglobal"){
          const tol=+root.querySelector("#m-tol").value,holes=root.querySelector("#m-holes").checked;
          if(pa==="tolglobal"){await store.setMatting(tol,holes);toast("Umbral general guardado: "+tol)}
          else{const t=toast("Recortando…",{ms:600000});try{await applyProductImage(ed,{orig:o.orig||o.getSrc(),remove:true,tol,holes,force:true},m=>{t.querySelector("span").textContent=m})}finally{t.close()}}
        }
        else if(pa==="autofloor"){ed.autoFloor();sync()}
        else if(pa==="ovfit"){const k=Math.max(ed.W/o.width,ed.H/o.height);o.set({scaleX:k,scaleY:k,angle:0});ed.setXY(o,(ed.W-o.width*k)/2,(ed.H-o.height*k)/2);ed.commit()}
        else if(pa==="ovseed"){await ed.reseedOverlay(o)}
        else if(pa==="pxcat"){resetCat(o,CATS[e.target.closest("[data-c]").dataset.c]);ed.commit();key="";render()}
        else if(pa==="pxpre"){applyPreset(o,+e.target.closest("[data-i]").dataset.i);ed.commit();key="";render()}
        else if(pa==="pxundo"){undoPfx(o);ed.commit();key="";render()}
        else if(pa==="pxall"){resetAll(o);if(o.__cropOrig)Object.assign(o,{});ed.commit();key="";render()}
        else if(pa==="rot90"){o.set("angle",((o.angle||0)+90)%360);o.setCoords();ed.commit()}
        else if(pa==="recrop"){const el=o.getElement(),nw=el.naturalWidth||el.width,nh=el.naturalHeight||el.height,dw=o.width*o.scaleX;o.set({cropX:0,cropY:0,width:nw,height:nh,scaleX:dw/nw,scaleY:dw/nw});applyPfx(o);o.setCoords();ed.commit();key="";render()}
        else if(pa==="glow"){o.set("shadow",new Shadow({color:"#ffffff",blur:60,offsetX:0,offsetY:0}));ed.commit();key="";render()}
        else if(pa==="flipx"){o.set("flipX",!o.flipX);ed.commit()}
        else if(pa==="flipy"){o.set("flipY",!o.flipY);ed.commit()}
        else if(pa==="fxreset"){ed.setFx(o,{bright:0,contrast:0,sat:0,blur:0});ed.commit();sync()}
        else if(pa==="remove"||pa==="remove-ai"){const t=toast("Quitando fondo…",{ms:600000});try{await applyProductImage(ed,{orig:o.orig||o.getSrc(),remove:true,method:pa==="remove-ai"?"ai":"auto"},m=>{t.querySelector("span").textContent=m})}finally{t.close()}}
        else if(pa==="orig"){await ed.setProductImage(o.orig||o.getSrc(),{orig:o.orig});ed.commit()}
        else if(pa==="change")openProductPicker(ed,afterProduct);
        else if(pa==="apply"){ed.placeProduct(o);ed.commit()}
        else if(pa==="capture"){ed.captureProductRule(o)}
        else if(pa==="preset"){const f=getPreset();if(f)await f()}
      }catch(err){toast(err.message,{kind:"err"})}
      return;
    }
    const ga=e.target.closest("[data-gadd]");
    if(ga){const ax=ga.dataset.gadd,v=root.querySelector("#g-"+ax).value;if(v==="")return;ed.cfg.guides=[...(ed.cfg.guides||[]),{[ax]:Math.round(+v)}];ed.emit("cguides");ed.commit();key="";render();return}
    const gd=e.target.closest("[data-gdel]");
    if(gd){ed.cfg.guides=(ed.cfg.guides||[]).filter((_,i)=>i!==+gd.dataset.gdel);ed.emit("cguides");ed.commit();key="";render();return}
    const a=e.target.closest("[data-align]");if(a){ed.align(a.dataset.align);return}
    const b=e.target.closest(".seg[data-k] button");if(b&&ed.active){apply(b.parentElement.dataset.k,b.dataset.v,ed.active);ed.commit();sync()}
  });
  bgp.bind(root,()=>{key="";render()});
  ed.on("change",render);ed.on("format",()=>{key="";render()});ed.on("history",()=>{if(ed.active)sync()});
  render();
  return {render,reset:()=>{key="";render()}};
}
