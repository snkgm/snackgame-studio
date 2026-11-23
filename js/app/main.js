import {store} from "./store.js?v=20261123e";
import {mountCenter} from "../center/center.js?v=20261123e";
import {mountSettings} from "../center/settings.js?v=20261123e";
import {mountEditor} from "../editor/editorView.js?v=20261123e";
import {mountTemplates} from "../center/templates.js?v=20261123e";
import {closeMenu} from "./ui.js?v=20261123e";
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
  else if(a==="ajustes")c=mountSettings(view);
  else c=mountCenter(view);
  if(my!==token){c?.();return}
  cleanup=c;
}
addEventListener("hashchange",route);
route();
