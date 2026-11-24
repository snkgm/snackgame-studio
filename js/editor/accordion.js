import {I} from "../app/icons.js?v=20261124x";
const K="sg.acc";
const load=()=>{try{return {order:[],closed:[],...JSON.parse(localStorage.getItem(K)||"{}")}}catch{return {order:[],closed:[]}}};
let st=load(),drag=null;
const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch{}};
const title=s=>(s.querySelector(".sec__head .label")?.textContent||"").trim();
export const accState=()=>st;
export function enhance(root){
  const secs=[...root.querySelectorAll(":scope > section.sec")].filter(s=>title(s));
  let prev=null;
  secs.forEach(s=>{const t=title(s);if(!st.order.includes(t)){st.order.splice(prev?st.order.indexOf(prev)+1:0,0,t);save()}prev=t});
  secs.sort((a,b)=>st.order.indexOf(title(a))-st.order.indexOf(title(b))).forEach(s=>root.appendChild(s));
  secs.forEach(s=>{
    const t=title(s),h=s.querySelector(".sec__head");
    if(!h.querySelector(".sec__grip")){
      h.insertAdjacentHTML("afterbegin",`<span class="sec__grip" title="Arrastra para reordenar">${I["grip-vertical"]}</span>`);
      h.insertAdjacentHTML("beforeend",`<span class="sec__chev">${I["chevron-down"]}</span>`);
    }
    const closed=st.closed.includes(t);s.classList.toggle("is-closed",closed);h.setAttribute("aria-expanded",String(!closed));h.draggable=true;h.setAttribute("role","button");h.tabIndex=0;
    const toggle=()=>{const c=!s.classList.contains("is-closed");s.classList.toggle("is-closed",c);h.setAttribute("aria-expanded",String(!c));st.closed=c?[...new Set([...st.closed,t])]:st.closed.filter(x=>x!==t);save()};
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
