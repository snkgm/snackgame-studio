import {Editor} from "./editor.js";
import {LayersPanel} from "./layers.js";
import {FORMATS,DEFAULT_FORMAT} from "./formats.js";
import {I} from "./icons.js";
const $=s=>document.querySelector(s);
const ed=new Editor($("#cv"),$("#stage"),$("#box"));
window.studio=ed;
new LayersPanel($("#layers"),ed);
$("#ic-undo").innerHTML=I.undo;$("#ic-redo").innerHTML=I.redo;
$("#t-rect").insertAdjacentHTML("afterbegin",I.rect);
$("#t-circle").insertAdjacentHTML("afterbegin",I.circle);
$("#t-text").insertAdjacentHTML("afterbegin",I.text);
$("#t-image").insertAdjacentHTML("afterbegin",I.image);
$("#t-product").insertAdjacentHTML("afterbegin",I.box);
const fmt=$("#fmt");
fmt.innerHTML=FORMATS.map(f=>`<option value="${f.id}">${f.label}</option>`).join("");
fmt.value=DEFAULT_FORMAT;
const applyFmt=()=>{const f=FORMATS.find(x=>x.id===fmt.value);ed.setFormat(f.w,f.h)};
fmt.addEventListener("change",applyFmt);applyFmt();
ed.on("format",()=>{const f=FORMATS.find(x=>x.w===ed.W&&x.h===ed.H);if(f)fmt.value=f.id});
const bg=$("#bg");bg.value=ed.bg;
bg.addEventListener("input",()=>ed.setBg(bg.value));
ed.on("format",()=>{bg.value=ed.bg});ed.on("history",()=>{bg.value=ed.bg});
$("#t-rect").onclick=()=>ed.addRect();
$("#t-circle").onclick=()=>ed.addCircle();
$("#undo").onclick=()=>ed.undo();$("#redo").onclick=()=>ed.redo();
const hist=()=>{$("#undo").disabled=!ed.canUndo;$("#redo").disabled=!ed.canRedo};
ed.on("history",hist);hist();
ed.on("zoom",s=>{$("#zoom").textContent=Math.round(s*100)+"%"});
const props=$("#props"),fill=$("#p-fill"),op=$("#p-op");
const syncProps=()=>{
  const o=ed.active;props.hidden=!o;
  if(!o)return;
  fill.value=typeof o.fill==="string"&&/^#[0-9a-f]{6}$/i.test(o.fill)?o.fill:"#000000";
  op.value=Math.round((o.opacity??1)*100);
};
ed.on("change",syncProps);syncProps();
fill.addEventListener("input",()=>{const o=ed.active;if(o)ed.patch(o,{fill:fill.value})});
op.addEventListener("input",()=>{const o=ed.active;if(o)ed.patch(o,{opacity:op.value/100})});
addEventListener("keydown",e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&document.activeElement.type!=="color")return;
  const m=e.ctrlKey||e.metaKey,o=ed.active;
  if(m&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?ed.redo():ed.undo();return}
  if(m&&e.key.toLowerCase()==="y"){e.preventDefault();ed.redo();return}
  if(m&&e.key.toLowerCase()==="d"&&o){e.preventDefault();ed.duplicate(o);return}
  if((e.key==="Delete"||e.key==="Backspace")&&o){e.preventDefault();ed.remove(o);return}
  const st=e.shiftKey?10:1,k={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];
  if(k&&o){e.preventDefault();ed.nudge(...k)}
});
