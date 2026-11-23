import {store} from "./store.js";
import {mountCenter} from "../center/center.js";
import {mountSettings} from "../center/settings.js";
import {mountEditor} from "../editor/editorView.js";
import {closeMenu} from "./ui.js";
const view=document.getElementById("view");
let cleanup=null,token=0;
async function route(){
  const my=++token;
  cleanup?.();cleanup=null;closeMenu();view.innerHTML="";
  const [a,id]=location.hash.replace(/^#\/?/,"").split("/");
  document.body.classList.toggle("is-editor",a==="editor");
  document.querySelectorAll("[data-nav]").forEach(n=>n.classList.toggle("is-on",n.dataset.nav===(a||"")));
  let c;
  if(a==="editor"&&id){store.flush();c=await mountEditor(view,id)}
  else if(a==="ajustes")c=mountSettings(view);
  else c=mountCenter(view);
  if(my!==token){c?.();return}
  cleanup=c;
}
addEventListener("hashchange",route);
route();
