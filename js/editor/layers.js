import {I} from "../app/icons.js?v=20261125d";
let LID=0;
const TH=new WeakMap();
const thumb=o=>{
  const ty=o.type.toLowerCase();
  const key=[o.text||"",typeof o.fill==="string"?o.fill:"",Math.round(o.getScaledWidth()),Math.round(o.getScaledHeight()),o.getSrc?o.getSrc().slice(-24):"",o.stroke||"",o.fontFamily||"",o.fontWeight||""].join("|");
  const c=TH.get(o);if(c&&c.key===key)return c.url;
  let url="";
  try{const m=Math.min(1,72/Math.max(o.getScaledWidth(),o.getScaledHeight(),1));url=o.toDataURL({multiplier:m,enableRetinaScaling:false,withoutShadow:true})}catch{}
  TH.set(o,{key,url});return url;
};
export class LayersPanel{
  constructor(root,ed){this.root=root;this.ed=ed;this.drag=null;this.fly=null;this.t=null;ed.on("change",()=>{clearTimeout(this.t);this.t=setTimeout(()=>this.render(),90)});this.render();
    document.addEventListener("pointerdown",e=>{if(this.fly&&!this.fly.contains(e.target)&&!e.target.closest(".layer"))this.closeFly()},true);
    window.addEventListener("resize",()=>this.closeFly())}
  closeFly(){if(this.fly){this.fly.remove();this.fly=null}}
  openFly(el,o){
    this.closeFly();const r=el.getBoundingClientRect(),f=document.createElement("div");f.className="lfly";
    f.innerHTML=`<span class="lfly__t">${this.thumbHtml(o)}</span><span class="lfly__n">${(o.name||"Capa").replace(/</g,"&lt;")}</span><button class="layer__btn" data-a="vis" title="${o.visible===false?"Mostrar":"Ocultar"}" aria-label="Mostrar u ocultar">${o.visible===false?I["eye-off"]:I.eye}</button><button class="layer__btn" data-a="lock" title="${o.locked?"Desbloquear":"Bloquear"}" aria-label="Bloquear o desbloquear">${o.locked?I.lock:I["lock-open"]}</button><button class="layer__btn" data-a="dup" title="Duplicar" aria-label="Duplicar">${I.copy}</button><button class="layer__btn" data-a="del" title="Eliminar" aria-label="Eliminar">${I["trash-2"]}</button>`;
    f.style.left=r.left+"px";f.style.top=r.top+"px";f.style.height=r.height+"px";
    f.onclick=e=>{const a=e.target.closest("[data-a]")?.dataset.a;if(!a){this.ed.select(o);return}
      if(a==="vis")this.ed.toggleVisible(o);else if(a==="lock")this.ed.toggleLock(o);else if(a==="dup")this.ed.duplicate(o);else if(a==="del")this.ed.remove(o);
      this.closeFly();this.sig=null;this.render()};
    f.onmouseleave=()=>this.closeFly();
    document.body.appendChild(f);this.fly=f;this.flyFor=o;
  }
  thumbHtml(o){const ty=o.type.toLowerCase(),u=thumb(o);if(u)return `<img src="${u}" alt="" draggable="false">`;return ty==="textbox"?I.type:ty==="image"?I.image:`<i style="background:${typeof o.fill==="string"?o.fill:"#888"}"></i>`}
  render(){
    if(this.fly&&this.fly.matches(":hover"))return;
    const list=this.ed.layers(),act=this.ed.active;
    const sig=JSON.stringify([list.map(o=>[(o.__lid??=++LID),o.name,o.visible,o.locked,o.role,typeof o.fill==="string"?o.fill:"",o.type,Math.round(o.getScaledWidth()),Math.round(o.getScaledHeight()),o.text||""]),list.indexOf(act),this.ed.bgSel,this.ed.bg,JSON.stringify(this.ed.cfg.bg||0),!!this.ed.bgLayer()]);
    if(sig===this.sig)return;this.sig=sig;this.closeFly();
    this.root.innerHTML="";
    const bgRow=()=>{const b=document.createElement("div");b.className="layer layer--bg"+(this.ed.bgSel?" is-sel":"");const bl=this.ed.bgLayer();const st=bl?`background:url('${bl.getSrc()}') center/cover`:`background:${this.ed.bg}`;b.title="Fondo";b.innerHTML=`<span class="layer__thumb" style="${st}"></span>`;b.addEventListener("click",()=>this.ed.selectBackground());return b};
    if(!list.length){this.root.appendChild(bgRow());return}
    list.forEach(o=>{
      const el=document.createElement("div");
      el.className="layer"+(o===act?" is-sel":"")+(o.visible===false?" is-hidden":"")+(o.locked?" is-locked":"");
      el.draggable=true;el.title=o.name||"Capa";el.tabIndex=0;el.setAttribute("role","button");el.setAttribute("aria-label",o.name||"Capa");
      el.innerHTML=`<span class="layer__thumb">${this.thumbHtml(o)}</span>${o.locked?`<span class="layer__flag">${I.lock}</span>`:""}`;
      el.addEventListener("mouseenter",e=>{if(this.drag)return;this.openFly(el,o)});
      el.addEventListener("click",e=>{this.ed.select(o);if(!this.fly||this.flyFor!==o)this.openFly(el,o)});
      el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();this.ed.select(o);this.openFly(el,o)}});
      el.addEventListener("dragstart",e=>{this.closeFly();this.drag=o;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain","x")});
      el.addEventListener("dragend",()=>{this.drag=null;this.clearMarks()});
      el.addEventListener("dragover",e=>{
        if(!this.drag||this.drag===o)return;e.preventDefault();this.clearMarks();
        const r=el.getBoundingClientRect();el.classList.add(e.clientY<r.top+r.height/2?"drop-before":"drop-after");
      });
      el.addEventListener("drop",e=>{
        e.preventDefault();if(!this.drag||this.drag===o)return;
        const r=el.getBoundingClientRect(),before=e.clientY<r.top+r.height/2;
        const objs=this.ed.canvas.getObjects(),ti=objs.indexOf(o),fi=objs.indexOf(this.drag);
        let idx=before?ti+1:ti;
        if(fi<idx)idx--;
        this.ed.moveTo(this.drag,idx);this.drag=null;this.clearMarks();
      });
      this.root.appendChild(el);
    });
    this.root.appendChild(bgRow());
  }
  clearMarks(){this.root.querySelectorAll(".drop-before,.drop-after").forEach(n=>n.classList.remove("drop-before","drop-after"))}
}
