import {esc} from "./ui.js?v=20261126p";
import {I} from "./icons.js?v=20261126p";
export function lightbox(urls,caption=""){
  if(!urls||!urls.length)return;
  const el=document.createElement("div");el.className="lbx";el.setAttribute("role","dialog");el.setAttribute("aria-label","Vista previa");
  el.innerHTML=`<button class="btn btn--icon lbx__x" aria-label="Cerrar">${I.x}</button><div class="lbx__row">${urls.map(u=>`<img src="${esc(u)}" alt="">`).join("")}</div>${caption?`<small>${esc(caption)}</small>`:""}`;
  const close=()=>{el.remove();removeEventListener("keydown",key)},key=e=>{if(e.key==="Escape")close()};
  addEventListener("keydown",key);el.addEventListener("mousedown",e=>{if(!e.target.closest("img"))close()});
  el.querySelector(".lbx__x").onclick=close;document.body.appendChild(el);
}
