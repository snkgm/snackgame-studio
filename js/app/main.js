import {store} from "./store.js?v=20261123m";
import {mountCenter} from "../center/center.js?v=20261123m";
import {mountSettings} from "../center/settings.js?v=20261123m";
import {mountEditor} from "../editor/editorView.js?v=20261123m";
import {mountTemplates} from "../center/templates.js?v=20261123m";
import {mountAutomations,mountCampaign} from "../center/automations.js?v=20261123m";
import {mountCampaignNew} from "../center/campaignNew.js?v=20261123m";
import {closeMenu} from "./ui.js?v=20261123m";
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
addEventListener("hashchange",route);
route();
