const S=d=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const VK="sg.viewbg";
const VIEWS=[["dark","Cuadrícula de transparencia oscura",S('<rect x="3" y="3" width="18" height="18" rx="2" fill="#2a2d34"/><path d="M3 12h9V3M12 21v-9h9" fill="currentColor" opacity=".45" stroke="none"/>')],["gray","Cuadrícula de transparencia gris",S('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h9V3M12 21v-9h9" fill="currentColor" opacity=".5" stroke="none"/>')],["black","Fondo negro",S('<rect x="3" y="3" width="18" height="18" rx="2" fill="#000"/>')],["white","Fondo blanco",S('<rect x="3" y="3" width="18" height="18" rx="2" fill="#fff"/>')]];
export function statusHtml(){
  return `<footer class="sbar" id="sbar" role="toolbar" aria-label="Información y vista del lienzo">
<button type="button" class="sb sb--dim" id="s-dim" title="Tamaño del documento. Clic para cambiar el formato" aria-label="Tamaño del documento"></button>
<i class="sbs"></i><span class="b2i" id="b-info" role="status" aria-live="polite"></span>
<span class="grow"></span>
<div class="slides" id="slides" hidden></div>
<i class="sbs sbs--sl" hidden></i>
<div class="sbg" id="s-view" role="group" aria-label="Fondo de visualización del lienzo (no afecta al diseño)">${VIEWS.map(([k,l,ic])=>`<button type="button" class="sb sb--i" data-view="${k}" title="${l}" aria-label="${l}" aria-pressed="false">${ic}</button>`).join("")}</div>
<i class="sbs"></i>
<div class="sbg" id="s-zoom" role="group" aria-label="Zoom"><button type="button" class="sb sb--i" data-z="out" title="Reducir zoom" aria-label="Reducir zoom">${S('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>')}</button><label class="sb__zl" title="Zoom del lienzo (solo visualización)">${S('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}<span>Zoom</span><input id="s-zv" inputmode="numeric" aria-label="Porcentaje de zoom" size="3"><b>%</b></label><button type="button" class="sb sb--i" data-z="in" title="Aumentar zoom" aria-label="Aumentar zoom">${S('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/>')}</button><button type="button" class="sb sb--t" data-z="fit" title="Ajustar lienzo a la pantalla">Ajustar</button><button type="button" class="sb sb--t" data-z="100" title="Tamaño real (100%)">100%</button></div>
</footer>`;
}
export function mountStatusBar(root,ed,getFmt){
  const $=s=>root.querySelector(s),stage=$("#stage");
  const dim=()=>{$("#s-dim").innerHTML=`${S('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16"/>')}<span>${ed.W} × ${ed.H} px</span>`};
  ed.on("format",dim);ed.on("change",dim);dim();
  $("#s-dim").onclick=()=>{ed.canvas.discardActiveObject();ed.canvas.requestRenderAll();setTimeout(()=>{const f=root.querySelector("#fmt");if(f){f.scrollIntoView({block:"center"});f.focus()}},60)};
  // fondo de visualización (solo editor)
  let v=localStorage.getItem(VK)||"dark";
  const setV=k=>{v=k;try{localStorage.setItem(VK,k)}catch{}stage.dataset.view=k;root.querySelectorAll("[data-view]").forEach(b=>{const on=b.dataset.view===k;b.classList.toggle("is-on",on);b.setAttribute("aria-pressed",String(on))})};
  setV(v);$("#s-view").onclick=e=>{const b=e.target.closest("[data-view]");if(b)setV(b.dataset.view)};
  // zoom
  const zv=$("#s-zv"),show=()=>{if(document.activeElement!==zv)zv.value=Math.round(ed.scale*100)};
  ed.on("zoom",show);show();
  const set=z=>ed.zoomTo(z);
  $("#s-zoom").onclick=e=>{const b=e.target.closest("[data-z]");if(!b)return;const k=b.dataset.z;if(k==="in")set(ed.scale*1.25);else if(k==="out")set(ed.scale/1.25);else if(k==="fit")set(null);else set(1)};
  zv.onkeydown=e=>{if(e.key==="Enter"){const n=parseFloat(zv.value);if(n>0)set(n/100);zv.blur()}if(e.key==="Escape"){zv.blur()}};zv.onblur=()=>{zv.value=Math.round(ed.scale*100)};
  stage.addEventListener("wheel",e=>{
    if(e.ctrlKey||e.metaKey){e.preventDefault();set(ed.scale*(e.deltaY<0?1.1:1/1.1));return}
    if(ed.userZoom){e.preventDefault();ed.panBy(-e.deltaX,-e.deltaY)}
  },{passive:false});
  let pn=null,sp=false;
  const typing=()=>/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&document.activeElement.type!=="range"&&document.activeElement.type!=="color"||(ed.active&&ed.active.isEditing);
  addEventListener("keydown",e=>{if(e.code==="Space"&&!typing()){e.preventDefault();if(!sp){sp=true;stage.classList.add("is-pan")}}});
  addEventListener("keyup",e=>{if(e.code==="Space"){sp=false;stage.classList.remove("is-pan");stage.classList.remove("is-panning")}});
  addEventListener("blur",()=>{sp=false;stage.classList.remove("is-pan")});
  stage.addEventListener("pointerdown",e=>{if(e.button===1||(e.button===0&&sp)){e.preventDefault();e.stopPropagation();stage.classList.add("is-panning");pn={x:e.clientX,y:e.clientY};stage.setPointerCapture?.(e.pointerId)}},true);
  stage.addEventListener("pointermove",e=>{if(!pn)return;ed.panBy(e.clientX-pn.x,e.clientY-pn.y);pn={x:e.clientX,y:e.clientY}});
  stage.addEventListener("pointerup",()=>{pn=null;stage.classList.remove("is-panning")});
}
