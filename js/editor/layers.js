import {I} from "../app/icons.js?v=20261125q";
import {ActiveSelection} from "../../vendor/fabric.min.mjs?v=20261125q";
import {modal,toast,openMenu} from "../app/ui.js?v=20261125q";
let LID=0;
const TH=new WeakMap();
const thumb=o=>{
  const key=[o.text||"",typeof o.fill==="string"?o.fill:"",Math.round(o.getScaledWidth()),Math.round(o.getScaledHeight()),o.getSrc?o.getSrc().slice(-24):"",o.stroke||"",o.fontFamily||"",o.fontWeight||"",(o.filters||[]).length].join("|");
  const c=TH.get(o);if(c&&c.key===key)return c.url;
  let url="";
  try{const m=Math.min(1,72/Math.max(o.getScaledWidth(),o.getScaledHeight(),1));url=o.toDataURL({multiplier:m,enableRetinaScaling:false,withoutShadow:true})}catch{}
  TH.set(o,{key,url});return url;
};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export class LayersPanel{
  constructor(root,ed){
    this.root=root;this.ed=ed;this.drag=null;this.t=null;this.pin=localStorage.getItem("sg.lpin")==="1";
    this.box=root.closest(".lyr__box");this.bgRoot=this.box.querySelector("#lbg");this.mergeBtn=this.box.querySelector("#lmerge");this.expBtn=this.box.querySelector("#lexp");
    ed.on("change",()=>{clearTimeout(this.t);this.t=setTimeout(()=>this.render(),90)});
    const wrap=this.box.parentElement;let lt=0;
    this.box.addEventListener("mouseenter",()=>{clearTimeout(lt);this.setOpen(true)});
    this.box.addEventListener("mouseleave",()=>{lt=setTimeout(()=>{if(!this.pin&&!this.drag)this.setOpen(false)},140)});
    const UL='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';
    const LK='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const paintPin=()=>{this.expBtn.innerHTML=this.pin?LK:UL;this.expBtn.classList.toggle("is-pin",this.pin);this.expBtn.title=this.pin?"Panel de capas fijado: clic para volver al modo automático":"Fijar el panel de capas expandido";this.expBtn.setAttribute("aria-pressed",String(this.pin))};
    const togglePin=()=>{this.pin=!this.pin;try{localStorage.setItem("sg.lpin",this.pin?"1":"0")}catch{}paintPin();this.setOpen(this.pin||this.box.matches(":hover"))};
    paintPin();if(this.pin)this.setOpen(true);
    this.expBtn.onclick=e=>{e.stopPropagation();togglePin()};
    this.box.querySelector(".lyr__head").addEventListener("click",e=>{if(e.target.closest("button"))return;togglePin()});
    this.mergeBtn.onclick=()=>this.mergeSel();
    this.render();
  }
  setOpen(v){this.box.classList.toggle("is-open",v)}
  selected(){return this.ed.canvas.getActiveObjects().filter(o=>this.ed.mergeable(o))}
  async mergeSel(){const s=this.selected();if(s.length<2){toast("Selecciona al menos dos capas (Ctrl/Mayús + clic)");return}await this.mergeFlow(s)}
  async mergeBelow(o){const l=this.ed.layers(),i=l.indexOf(o),b=l[i+1];if(!b){toast("No hay capa inferior para combinar");return}await this.mergeFlow([o,b])}
  mergeFlow(objs){
    const warn=objs.filter(o=>o.type.toLowerCase()==="textbox"||o.role==="product"||o.gen);
    return new Promise(res=>{
      modal("Fusionar capas",`<p>Se combinarán <b>${objs.length}</b> capas en una sola capa de imagen. El resto del documento no se modifica.</p>${warn.length?`<p class="hint" style="color:var(--c-accent)">Atención: ${warn.some(o=>o.type.toLowerCase()==="textbox")?"el texto dejará de ser editable":"las capas pasarán a ser contenido gráfico"} y perderán sus vínculos con datos de plantilla.</p>`:""}<label class="chk"><input type="checkbox" id="mg-keep"> Conservar las capas originales (ocultas)</label><p class="hint">Puedes deshacerlo con Ctrl+Z.</p>`,{ok:"Fusionar",onOk:async f=>{const keep=f.querySelector("#mg-keep").checked;try{await this.ed.mergeLayers(objs,{keep});this.sig=null;this.render();toast("Capas fusionadas")}catch(e){toast(e.message,{kind:"err"})}res()}});
    });
  }
  thumbHtml(o){const ty=o.type.toLowerCase(),u=thumb(o);if(u)return `<img src="${u}" alt="" draggable="false">`;return ty==="textbox"?I.type:ty==="image"?I.image:`<i style="background:${typeof o.fill==="string"?o.fill:"#888"}"></i>`}
  pick(o,e){
    const c=this.ed.canvas;
    if(e&&(e.ctrlKey||e.metaKey||e.shiftKey)){
      const cur=c.getActiveObjects().filter(x=>this.ed.mergeable(x)),has=cur.includes(o),next=has?cur.filter(x=>x!==o):[...cur,o];
      c.discardActiveObject();this.ed.bgSel=false;
      if(next.length===1)c.setActiveObject(next[0]);else if(next.length>1)c.setActiveObject(new ActiveSelection(next,{canvas:c}));
      c.requestRenderAll();this.ed.emit("change");return;
    }
    this.ed.select(o);
  }
  menu(o,e){
    e.preventDefault();const items=[];
    const img=o.type.toLowerCase()==="image"&&o.role!=="overlay"&&!o.gen;
    if(img)items.push({label:"Establecer como fondo",icon:"image",run:async()=>{try{await this.ed.setBgFromLayer(o);toast("Imagen establecida como fondo")}catch(er){toast(er.message,{kind:"err"})}}});
    items.push({label:"Duplicar",icon:"copy",run:()=>this.ed.duplicate(o)},{label:"Fusionar con la inferior",icon:"layers",run:()=>this.mergeBelow(o)},"-",{label:"Eliminar",icon:"trash-2",danger:true,run:()=>this.ed.remove(o)});
    openMenu(null,items,{x:e.clientX,y:e.clientY});
  }
  render(){
    const list=this.ed.layers(),act=this.ed.canvas.getActiveObjects(),isSel=o=>act.includes(o);
    const sig=JSON.stringify([list.map(o=>[(o.__lid??=++LID),o.name,o.visible,o.locked,o.role,typeof o.fill==="string"?o.fill:"",o.type,Math.round(o.getScaledWidth()),Math.round(o.getScaledHeight()),o.text||"",(o.filters||[]).length]),list.map(isSel),this.ed.bgSel,this.ed.bg,JSON.stringify(this.ed.cfg.bg||0),!!this.ed.bgLayer()]);
    if(sig===this.sig)return;this.sig=sig;
    const nsel=list.filter(isSel).length;this.mergeBtn.hidden=nsel<2;
    this.root.innerHTML="";
    list.forEach((o,i)=>{
      const el=document.createElement("div");
      el.className="layer"+(isSel(o)?" is-sel":"")+(o.visible===false?" is-hidden":"")+(o.locked?" is-locked":"");
      el.draggable=true;el.title=o.name||"Capa";el.tabIndex=0;el.setAttribute("role","button");el.setAttribute("aria-label",o.name||"Capa");
      el.innerHTML=`<span class="layer__thumb">${this.thumbHtml(o)}${o.locked||o.visible===false?`<span class="layer__ind${o.locked?"":" layer__ind--hid"}" aria-hidden="true">${o.locked?I.lock:I["eye-off"]}</span>`:""}</span><input class="layer__name" value="" readonly aria-label="Nombre"><span class="layer__acts"><button class="layer__btn${o.visible===false?" is-on":""}" data-a="vis" title="${o.visible===false?"Mostrar":"Ocultar"}" aria-label="Mostrar u ocultar">${o.visible===false?I["eye-off"]:I.eye}</button><button class="layer__btn${o.locked?" is-on":""}" data-a="lock" title="${o.locked?"Desbloquear":"Bloquear"}" aria-label="Bloquear o desbloquear">${o.locked?I.lock:I["lock-open"]}</button><button class="layer__btn" data-a="merge" title="${isSel(o)&&nsel>1?"Fusionar selección":"Combinar con la capa inferior"}" aria-label="Fusionar"${(i===list.length-1&&nsel<2)?" disabled":""}>${I.layers}</button><button class="layer__btn" data-a="del" title="Eliminar" aria-label="Eliminar">${I["trash-2"]}</button></span>`;
      const inp=el.querySelector(".layer__name");inp.value=o.name||"Capa";
      inp.addEventListener("dblclick",()=>{inp.readOnly=false;el.draggable=false;inp.focus();inp.select()});
      const done=()=>{if(inp.readOnly)return;inp.readOnly=true;el.draggable=true;const v=inp.value.trim();if(v&&v!==o.name)this.ed.patch(o,{name:v})};
      inp.addEventListener("blur",done);inp.addEventListener("keydown",e=>{if(e.key==="Enter")inp.blur();if(e.key==="Escape"){inp.value=o.name;inp.blur()}});
      el.addEventListener("click",e=>{
        const a=e.target.closest("[data-a]")?.dataset.a;
        if(a==="vis"){this.ed.toggleVisible(o)}else if(a==="lock"){this.ed.toggleLock(o)}
        else if(a==="merge"){if(isSel(o)&&nsel>1)this.mergeSel();else this.mergeBelow(o)}
        else if(a==="del"){this.ed.remove(o)}
        else if(e.target!==inp||inp.readOnly)this.pick(o,e);
      });
      el.addEventListener("contextmenu",e=>{if(!isSel(o))this.pick(o);this.menu(o,e)});
      el.addEventListener("keydown",e=>{if(e.target===el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();this.pick(o,e)}});
      el.addEventListener("dragstart",e=>{this.drag=o;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain","x")});
      el.addEventListener("dragend",()=>{this.drag=null;this.clearMarks()});
      el.addEventListener("dragover",e=>{
        if(!this.drag||this.drag===o)return;e.preventDefault();this.clearMarks();
        const r=el.getBoundingClientRect();el.classList.add(e.clientY<r.top+r.height/2?"drop-before":"drop-after");
      });
      el.addEventListener("drop",e=>{
        e.preventDefault();if(!this.drag||this.drag===o)return;
        const r=el.getBoundingClientRect(),before=e.clientY<r.top+r.height/2;
        const objs=this.ed.canvas.getObjects(),ti=objs.indexOf(o),fi=objs.indexOf(this.drag);
        let idx=before?ti+1:ti;if(fi<idx)idx--;
        this.ed.moveTo(this.drag,idx);this.drag=null;this.clearMarks();this.sig=null;
      });
      this.root.appendChild(el);
    });
    if(!list.length)this.root.innerHTML='<div class="lyr__empty">Sin capas</div>';
    // fondo anclado
    const b=document.createElement("div");b.className="layer layer--bg"+(this.ed.bgSel?" is-sel":"");const bl=this.ed.bgLayer(),cfgb=this.ed.cfg.bg;
    const st=bl?`background:url('${bl.getSrc()}') center/cover`:`background:${this.ed.bg}`;
    b.title="Fondo (anclado abajo)";b.tabIndex=0;b.innerHTML=`<span class="layer__thumb" style="${st}"></span><span class="layer__name layer__name--bg">Fondo</span>`;
    b.addEventListener("click",()=>this.ed.selectBackground());
    b.addEventListener("contextmenu",e=>{e.preventDefault();this.ed.selectBackground();if(cfgb&&cfgb.mode==="image"&&cfgb.img)openMenu(null,[{label:"Separar imagen del fondo",icon:"image",run:()=>this.ed.separateBg()}],{x:e.clientX,y:e.clientY})});
    this.bgRoot.innerHTML="";this.bgRoot.appendChild(b);
  }
  clearMarks(){this.root.querySelectorAll(".drop-before,.drop-after").forEach(n=>n.classList.remove("drop-before","drop-after"))}
}
