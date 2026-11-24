import {store} from "./store.js?v=20261124c";
import {mountCenter} from "../center/center.js?v=20261124c";
import {mountSettings} from "../center/settings.js?v=20261124c";
import {mountEditor} from "../editor/editorView.js?v=20261124c";
import {mountTemplates} from "../center/templates.js?v=20261124c";
import {mountAutomations,mountCampaign} from "../center/automations.js?v=20261124c";
import {mountCampaignNew} from "../center/campaignNew.js?v=20261124c";
import {CONFIG} from "./config.js?v=20261124c";
import {auth} from "./auth.js?v=20261124c";
import {closeMenu} from "./ui.js?v=20261124c";
let view=document.getElementById("view");
let cleanup=null,token=0;
async function route(){
  const my=++token;
  cleanup?.();cleanup=null;closeMenu();const fresh=view.cloneNode(false);view.replaceWith(fresh);view=fresh;
  const [a,id]=location.hash.replace(/^#\/?/,"").split("/");
  document.body.classList.toggle("is-editor",a==="editor"||a==="plantilla");
  document.querySelectorAll("[data-nav]").forEach(n=>n.classList.toggle("is-on",n.dataset.nav===(a||"")));
  let c;
  if(a==="editor"&&id){store.flush();c=await mountEditor(view,id)}
  else if(a==="plantilla"&&id){store.flush();c=await mountEditor(view,id,{template:true})}
  else if(a==="plantillas")c=mountTemplates(view);
  else if(a==="automatizaciones"&&id==="nueva")c=mountCampaignNew(view);
  else if(a==="automatizaciones"&&id)c=mountCampaign(view,id);
  else if(a==="automatizaciones")c=mountAutomations(view);
  else if(a==="ajustes")c=mountSettings(view);
  else c=mountCenter(view);
  if(my!==token){c?.();return}
  cleanup=c;
}
function gate(){
  const f=document.createElement("form");f.className="login";
  f.innerHTML=`<div class="login__box"><h1>Snack<span>Game</span> Studio</h1><div class="field"><label for="lg-e">Email</label><input class="input" id="lg-e" type="email" autocomplete="username" required></div><div class="field"><label for="lg-p">Contraseña</label><input class="input" id="lg-p" type="password" autocomplete="current-password" required></div><p class="login__err" id="lg-m" role="alert"></p><button class="btn btn--accent">Entrar</button></div>`;
  document.body.appendChild(f);f.querySelector("#lg-e").focus();
  f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector("button");b.disabled=true;try{await auth.login(f.querySelector("#lg-e").value.trim(),f.querySelector("#lg-p").value);f.remove();start()}catch(er){f.querySelector("#lg-m").textContent=er.message;b.disabled=false}};
}
function start(){
  const lo=document.getElementById("logout");if(lo&&auth.ok()){lo.hidden=false;lo.onclick=()=>auth.logout()}
  addEventListener("hashchange",route);route();
}
auth.ok()||!CONFIG.AUTH_REQUIRED?start():gate();
