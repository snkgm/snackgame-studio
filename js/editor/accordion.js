import {I} from "../app/icons.js?v=20261125s";
const K="sg.acc";
const load=()=>{try{return {order:[],closed:[],...JSON.parse(localStorage.getItem(K)||"{}")}}catch{return {order:[],closed:[]}}};
let st=load(),drag=null;
const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch{}};
const title=s=>(s.querySelector(".sec__head .label")?.textContent||"").trim();
export const accState=()=>st;
const CATS=["Lienzo","Transformación","Posición y alineación","Apariencia","Efectos","Tipografía","Opciones de imagen","Otros"];
const MAP={"Lienzo":0,"Zonas seguras (px)":0,"Contenido":5,"Guías personalizadas":0,"Ajuste magnético":0,"Plantilla":0,"Fondo":0,"Biblioteca de fondos":0,"Buscar fondos (Pexels)":0,"Colores del producto":0,"Variaciones":0,"Posición y tamaño":1,"Recorte":1,"Colocación (regla de plantilla)":2,"Colocación":2,"Relleno":3,"Línea":3,"Fusión":3,"Overlay":3,"Viñeta":4,"Degradados desde bordes":4,"Sombra":4,"Contorno y sombra":4,"Sombra de suelo":4,"Texto":5,"Reglas de plantilla":5,"Dato dinámico":5,"Producto":6,"Preset del producto":6,"Ajustes de imagen":6};
const cat=t=>MAP[t]??(/sombra|efecto|vi[ñn]eta|degrad/i.test(t)?4:/posici|alinea/i.test(t)?2:7);
const KEEP="sg.accKeep";export const keepAcc=()=>localStorage.getItem(KEEP)==="1";
export const setKeepAcc=v=>{try{localStorage.setItem(KEEP,v?"1":"0")}catch{}};
export function sessionStart(){if(!keepAcc()){st.open=null;save()}}
export function enhance(root,autoFirst=false){
  const secs=[...root.querySelectorAll(":scope > section.sec")].filter(s=>title(s));
  let prev=null;
  secs.forEach(s=>{const t=title(s);if(!st.order.includes(t)){st.order.splice(prev?st.order.indexOf(prev)+1:0,0,t);save()}prev=t});
  root.querySelectorAll(":scope > .acc__cat").forEach(n=>n.remove());
  secs.sort((a,b)=>(cat(title(a))-cat(title(b)))||(st.order.indexOf(title(a))-st.order.indexOf(title(b)))).forEach(s=>root.appendChild(s));
  let pc=-1;secs.forEach(s=>{const c=cat(title(s));if(c!==pc){pc=c;s.insertAdjacentHTML("beforebegin",`<div class="acc__cat" role="heading" aria-level="3">${CATS[c]}</div>`)}});
  if(autoFirst&&secs.length){st.open=title(secs[0]);save()}
  secs.forEach(s=>{
    const t=title(s),h=s.querySelector(".sec__head");
    if(!h.querySelector(".sec__grip")){
      h.insertAdjacentHTML("afterbegin",`<span class="sec__grip" title="Arrastra para reordenar">${I["grip-vertical"]}</span>`);
      h.insertAdjacentHTML("beforeend",`<span class="sec__chev">${I["chevron-down"]}</span>`);
    }
    const closed=st.open!==t;s.classList.toggle("is-closed",closed);h.setAttribute("aria-expanded",String(!closed));h.draggable=true;h.setAttribute("role","button");h.tabIndex=0;
    const toggle=()=>{const open=s.classList.contains("is-closed");st.open=open?t:null;save();root.querySelectorAll(":scope > section.sec").forEach(x=>{const tt=title(x),c=st.open!==tt,hh=x.querySelector(".sec__head");x.classList.toggle("is-closed",c);if(hh)hh.setAttribute("aria-expanded",String(!c))})};
    h.onclick=e=>{if(e.target.closest("button,input,select,a"))return;toggle()};
    h.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target===h){e.preventDefault();toggle()}};
    h.ondragstart=e=>{drag=t;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",t);s.classList.add("is-drag")};
    h.ondragend=()=>{drag=null;root.querySelectorAll(".is-drag,.drop-before,.drop-after").forEach(n=>n.classList.remove("is-drag","drop-before","drop-after"))};
    s.ondragover=e=>{if(!drag||drag===t)return;e.preventDefault();root.querySelectorAll(".drop-before,.drop-after").forEach(n=>n.classList.remove("drop-before","drop-after"));const r=s.getBoundingClientRect();s.classList.add(e.clientY<r.top+r.height/2?"drop-before":"drop-after")};
    s.ondrop=e=>{
      if(!drag||drag===t)return;e.preventDefault();
      const r=s.getBoundingClientRect(),before=e.clientY<r.top+r.height/2;
      st.order=st.order.filter(x=>x!==drag);let i=st.order.indexOf(t);if(!before)i++;st.order.splice(i,0,drag);save();
      drag=null;enhance(root);root.querySelectorAll(".is-drag,.drop-before,.drop-after").forEach(n=>n.classList.remove("is-drag","drop-before","drop-after"));
    };
  });
}
