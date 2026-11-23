import {I} from "./icons.js";
export class LayersPanel{
  constructor(root,ed){this.root=root;this.ed=ed;this.drag=null;ed.on("change",()=>this.render());this.render()}
  render(){
    if(this.root.contains(document.activeElement)&&document.activeElement.matches("input.layer__name:not([readonly])"))return;
    const list=this.ed.layers(),act=this.ed.active;
    this.root.innerHTML="";
    if(!list.length){this.root.innerHTML='<div class="empty">Sin capas. Añade una forma.</div>';return}
    list.forEach(o=>{
      const el=document.createElement("div");
      el.className="layer"+(o===act?" is-sel":"")+(o.visible===false?" is-hidden":"");
      el.draggable=true;
      const fill=typeof o.fill==="string"?o.fill:"#888";
      el.innerHTML=`<span class="layer__thumb" style="background:${fill}"></span><input class="layer__name" value="" readonly><button class="layer__btn" data-a="vis" title="Visibilidad">${o.visible===false?I.eyeOff:I.eye}</button><button class="layer__btn" data-a="lock" title="Bloquear">${o.locked?I.lock:I.unlock}</button><button class="layer__btn" data-a="del" title="Eliminar">${I.trash}</button>`;
      const inp=el.querySelector(".layer__name");inp.value=o.name||"Capa";
      inp.addEventListener("dblclick",()=>{inp.readOnly=false;el.draggable=false;inp.focus();inp.select()});
      const done=()=>{if(inp.readOnly)return;inp.readOnly=true;el.draggable=true;const v=inp.value.trim();if(v&&v!==o.name)this.ed.patch(o,{name:v});else this.render()};
      inp.addEventListener("blur",done);
      inp.addEventListener("keydown",e=>{if(e.key==="Enter")inp.blur();if(e.key==="Escape"){inp.value=o.name;inp.blur()}});
      el.addEventListener("click",e=>{
        const a=e.target.closest("[data-a]")?.dataset.a;
        if(a==="vis")this.ed.toggleVisible(o);
        else if(a==="lock")this.ed.toggleLock(o);
        else if(a==="del")this.ed.remove(o);
        else this.ed.select(o);
      });
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
        let idx=before?ti+1:ti;
        if(fi<idx)idx--;
        this.ed.moveTo(this.drag,idx);this.drag=null;this.clearMarks();
      });
      this.root.appendChild(el);
    });
  }
  clearMarks(){this.root.querySelectorAll(".drop-before,.drop-after").forEach(n=>n.classList.remove("drop-before","drop-after"))}
}
