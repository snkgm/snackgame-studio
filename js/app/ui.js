import {I} from "./icons.js?v=20261125o";
export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const STATUS={
  draft:{label:"Borrador"},review:{label:"Pendiente de revisión"},scheduled:{label:"Programada"},
  published:{label:"Publicada"},cancelled:{label:"Cancelada"},error:{label:"Error"}
};
export const STATUS_KEYS=Object.keys(STATUS);
let host;
export function toast(msg,{kind,action,onAction,ms=4000}={}){
  host??=document.body.appendChild(Object.assign(document.createElement("div"),{className:"toast-host"}));
  const t=document.createElement("div");t.className="toast"+(kind==="err"?" toast--err":"");
  t.innerHTML=`<span>${esc(msg)}</span>${action?`<button>${esc(action)}</button>`:""}`;
  const close=()=>t.remove();
  if(action)t.querySelector("button").onclick=()=>{onAction?.();close()};
  host.appendChild(t);const id=setTimeout(close,ms);t.close=()=>{clearTimeout(id);close()};return t;
}
let openMenuEl;
export function closeMenu(){openMenuEl?.remove();openMenuEl=null}
export function openMenu(anchor,items,{x,y}={}){
  closeMenu();
  const m=document.createElement("div");m.className="menu";
  items.forEach(it=>{
    if(it==="-"){m.insertAdjacentHTML("beforeend",'<div class="menu__sep"></div>');return}
    const b=document.createElement("button");b.className="menu__item"+(it.danger?" menu__item--danger":"");
    b.innerHTML=`${it.dot?`<span class="dot" data-s="${it.dot}"></span>`:it.icon?I[it.icon]:""}<span>${esc(it.label)}</span>`;
    b.onclick=e=>{e.stopPropagation();closeMenu();it.run()};m.appendChild(b);
  });
  document.body.appendChild(m);openMenuEl=m;
  const r=anchor?anchor.getBoundingClientRect():{left:x,bottom:y,right:x,top:y};
  const w=m.offsetWidth,h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-w-8,(x??r.left)))+"px";
  const top=(y??r.bottom)+4;m.style.top=(top+h>innerHeight-8?Math.max(8,(anchor?r.top:y)-h-4):top)+"px";
  setTimeout(()=>{addEventListener("click",closeMenu,{once:true});addEventListener("keydown",e=>e.key==="Escape"&&closeMenu(),{once:true})});
}
export function modal(title,bodyHtml,{ok="Aceptar",onOk,wide}={}){
  const el=document.createElement("div");el.className="modal";
  el.innerHTML=`<div class="modal__box${wide?" modal__box--wide":""}" role="dialog" aria-label="${esc(title)}"><div class="modal__head"><h2>${esc(title)}</h2><button class="btn btn--ghost btn--icon btn--sm" data-x aria-label="Cerrar">${I.x}</button></div><form class="modal__body">${bodyHtml}</form><div class="modal__foot"><button class="btn" data-x type="button">Cancelar</button><button class="btn btn--accent" data-ok type="button">${esc(ok)}</button></div></div>`;
  const close=()=>{el.remove();removeEventListener("keydown",key)};
  const key=e=>{if(e.key==="Escape")close()};
  addEventListener("keydown",key);
  el.addEventListener("mousedown",e=>{if(e.target===el)close()});
  el.querySelectorAll("[data-x]").forEach(b=>b.onclick=close);
  const form=el.querySelector("form");
  const submit=async()=>{const btn=el.querySelector("[data-ok]");btn.disabled=true;try{const r=await onOk?.(form,el);if(r!==false)close()}catch(e){toast(e.message,{kind:"err"})}btn.disabled=false};
  el.querySelector("[data-ok]").onclick=submit;form.onsubmit=e=>{e.preventDefault();submit()};
  document.body.appendChild(el);el.querySelector("input,select")?.focus();return {el,close,form};
}
export const thumbHtml=p=>p.thumb_url?`<img src="${esc(p.thumb_url)}" alt="" loading="lazy" draggable="false">`:`<span class="thumb__empty">${I.image}</span>`;
