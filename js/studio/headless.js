import {Editor} from "../editor/editor.js?v=20261126i";
import {loadAllFonts} from "../app/fonts.js?v=20261126i";
export async function withHeadless(fn){
  await loadAllFonts();
  const host=document.createElement("div");host.style.cssText="position:fixed;left:-99999px;top:0;width:600px;height:600px;pointer-events:none";
  const cv=document.createElement("canvas");host.appendChild(cv);document.body.appendChild(host);
  const ed=new Editor(cv,host,host);
  try{return await fn(ed)}finally{ed.destroy();host.remove()}
}
