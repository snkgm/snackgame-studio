import {db} from "./db.js?v=20261127h";
import {toast} from "./ui.js?v=20261127h";
const K="studio.notified.v1",WORKS="downloading,removing_bg,analyzing,background,composing,saving",iso=t=>new Date(t).toISOString();
const seen=()=>{try{return JSON.parse(localStorage.getItem(K)||"{}")}catch{return{}}};
const save=s=>{try{localStorage.setItem(K,JSON.stringify(s))}catch{}};
const hm=t=>new Date(t).toLocaleTimeString("es-ES",{timeZone:"Europe/Madrid",hour:"2-digit",minute:"2-digit"});
export const supported=()=>"Notification" in window;
export const perm=()=>supported()?Notification.permission:"unsupported";
async function show(title,body,tag,url){
  const o={body,tag,icon:"icons/icon-192.png",badge:"icons/icon-192.png",data:{url},renotify:false};
  try{const reg=await navigator.serviceWorker.getRegistration();if(reg)return reg.showNotification(title,o)}catch{}
  try{new Notification(title,o)}catch{}
}
async function tick(){
  if(perm()!=="granted")return;
  const s=seen(),first=!s.__init,now=Date.now();let dirty=false;
  const once=(k,fn)=>{if(s[k])return;s[k]=now;dirty=true;if(!first)fn()};
  try{
    const [posts,items,camps]=await Promise.all([
      db.list("posts",`select=id,title,scheduled_at&status=eq.scheduled&scheduled_at=gte.${iso(now-10*6e4)}&scheduled_at=lte.${iso(now+6*6e4)}`),
      db.list("campaign_items",`select=id,name,status,error,campaign_id,locked_at&status=in.(error,${WORKS})`),
      db.list("campaigns","select=id,name,status&status=eq.done")]);
    for(const p of posts){const dt=new Date(p.scheduled_at).getTime()-now;
      if(dt>0)(s["soon:"+p.id+p.scheduled_at]||(s["soon:"+p.id+p.scheduled_at]=now,dirty=true,show(`Se publica en ${Math.max(1,Math.round(dt/6e4))} min`,`${p.title} · ${hm(p.scheduled_at)}. Revísala por si quieres cambiar algo.`,"soon"+p.id,"#/editor/"+p.id)));
      else once("due:"+p.id+p.scheduled_at,()=>show("Hora de publicar",`${p.title} · programada para las ${hm(p.scheduled_at)}`,"due"+p.id,"#/editor/"+p.id))}
    for(const i of items){const u="#/automatizaciones/"+i.campaign_id;
      if(i.status==="error")once("err:"+i.id+(i.error||""),()=>show(`Error en «${i.name}»`,i.error||"Error",`err${i.id}`,u));
      else if(i.locked_at&&now-new Date(i.locked_at)>9e4)once("stale:"+i.id+i.locked_at,()=>show(`Sin señal en «${i.name}»`,"Se reintenta solo en unos minutos.",`stale${i.id}`,u))}
    for(const c of camps)once("done:"+c.id,()=>show("Lista completada",`«${c.name}»: todas las publicaciones están programadas.`,"done"+c.id,"#/automatizaciones/"+c.id));
    if(first){s.__init=now;dirty=true}
    if(dirty){for(const k in s)if(k!=="__init"&&now-s[k]>7*864e5)delete s[k];save(s)}
  }catch{}
}
function label(b){const p=perm(),t=b.querySelector(".nt");if(t)t.textContent=p==="granted"?"Avisos activos":p==="denied"?"Avisos bloqueados":p==="unsupported"?"No disponible":"Activar avisos";b.classList.toggle("is-on",p==="granted")}
export async function initNotify(){
  if("serviceWorker" in navigator){try{await navigator.serviceWorker.register("sw.js");navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.go)location.hash=e.data.go})}catch{}}
  const b=document.getElementById("bell");
  if(b){label(b);b.onclick=async()=>{
    const p=perm();
    if(p==="unsupported"){toast("Este navegador no admite avisos. En iPhone instala la web en la pantalla de inicio.",{kind:"err"});return}
    if(p==="denied"){toast("Avisos bloqueados: actívalos en los ajustes del sitio del navegador.",{kind:"err"});return}
    if(p==="default"){const r=await Notification.requestPermission();label(b);if(r!=="granted")return;tick()}
    show("Avisos activados","Te avisaremos 5 min antes de cada publicación y si algo falla.","test","#/automatizaciones");label(b)}}
  tick();setInterval(tick,45e3);document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
}
