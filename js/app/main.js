import {store} from "./store.js?v=20261126c";
import {mountCenter} from "../center/center.js?v=20261126c";
import {mountSettings} from "../center/settings.js?v=20261126c";
import {mountEditor} from "../editor/editorView.js?v=20261126c";
import {mountTemplates} from "../center/templates.js?v=20261126c";
import {mountAutomations,mountCampaign} from "../center/automations.js?v=20261126c";
import {mountCampaignNew} from "../center/campaignNew.js?v=20261126c";
import {CONFIG} from "./config.js?v=20261126c";
import {auth} from "./auth.js?v=20261126c";
import {closeMenu} from "./ui.js?v=20261126c";
let view=document.getElementById("view");
let cleanup=null,token=0;
let lastHash=location.hash;
async function route(){
  const nh=location.hash;
  if(window.__leaveGuard&&nh!==lastHash&&window.__leaveGuard(()=>{lastHash="";window.__leaveGuard=null;location.hash=nh})){history.replaceState(null,"",lastHash||"#/");return}
  lastHash=nh;
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
  f.innerHTML=`<div class="login__box"><h1>Snack<span>Game</span> Studio</h1><div class="field"><label for="lg-e">Email</label><input class="input" id="lg-e" type="email" autocomplete="username" required></div><div class="field"><label for="lg-p">Contraseña</label><input class="input" id="lg-p" type="password" autocomplete="current-password" required></div><input class="hp" id="lg-w" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div id="lg-cf"></div><p class="login__err" id="lg-m" role="alert"></p><button class="btn btn--accent">Entrar</button></div>`;
  document.body.appendChild(f);f.querySelector("#lg-e").focus();
  let cf="";
  if(CONFIG.TURNSTILE_SITEKEY){const sc=document.createElement("script");sc.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";sc.onload=()=>window.turnstile.render("#lg-cf",{sitekey:CONFIG.TURNSTILE_SITEKEY,theme:"dark",callback:t=>{cf=t}});document.head.appendChild(sc)}
  f.onsubmit=async e=>{e.preventDefault();if(f.querySelector("#lg-w").value)return;if(CONFIG.TURNSTILE_SITEKEY&&!cf){f.querySelector("#lg-m").textContent="Completa la verificación";return}const b=f.querySelector("button");b.disabled=true;try{await auth.login(f.querySelector("#lg-e").value.trim(),f.querySelector("#lg-p").value,cf);f.remove();start()}catch(er){f.querySelector("#lg-m").textContent=er.message;b.disabled=false;f.querySelector("#lg-p").value="";if(window.turnstile){cf="";try{window.turnstile.reset()}catch{}}}};
}
function start(){
  const lo=document.getElementById("logout");if(lo&&auth.ok()){lo.hidden=false;lo.onclick=()=>auth.logout()}
  addEventListener("hashchange",route);route();
}
auth.ok()||!CONFIG.AUTH_REQUIRED?start():gate();
