import {store} from "../app/store.js?v=20261125g";
import {FORMATS,fmtById} from "../app/formats.js?v=20261125g";
import {I} from "../app/icons.js?v=20261125g";
import {esc,toast,modal,openMenu} from "../app/ui.js?v=20261125g";
import {db} from "../app/db.js?v=20261125g";
import {buildSkeleton,buildBlank} from "../studio/skeleton.js?v=20261125g";
export function mountTemplates(root){
  const S={ty:"",ca:"",fm:""};
  const opt=(arr,sel,all)=>`<option value="">${all}</option>`+arr.map(x=>`<option value="${x.id}"${x.id===sel?" selected":""}>${esc(x.name)}</option>`).join("");
  function render(){
    if(!store.loaded){root.innerHTML=`<div class="empty">${store.error?esc(store.error):"Cargando…"}</div>`;return}
    const list=store.templates.filter(t=>(!S.ty||t.type_id===S.ty)&&(!S.ca||t.category_id===S.ca)&&(!S.fm||t.format===S.fm));
    const groups=new Map();
    list.forEach(t=>{const k=(t.type_id||"")+"|"+(t.category_id||"");(groups.get(k)||groups.set(k,[]).get(k)).push(t)});
    root.innerHTML=`<div class="settings"><div class="ctools"><h1 class="ctools__title">Plantillas</h1><span class="grow"></span>
<select class="select" id="f-ty" aria-label="Tipo de contenido">${opt(store.types,S.ty,"Todos los tipos")}</select>
<select class="select" id="f-ca" aria-label="Categoría">${opt(store.cats,S.ca,"Todas las categorías")}</select>
<select class="select" id="f-fm" aria-label="Formato"><option value="">Todos los formatos</option>${FORMATS.map(f=>`<option value="${f.id}"${f.id===S.fm?" selected":""}>${esc(f.label)}</option>`).join("")}</select>
<button class="btn btn--accent" data-new>${I.plus}Nueva plantilla</button></div>
<p class="hint">Cada combinación de tipo de contenido, categoría y formato puede tener su propia plantilla. La marcada con ★ es la predeterminada al crear publicaciones. Editar una plantilla no cambia las publicaciones ya creadas.</p>
${[...groups.entries()].map(([k,arr])=>{const [ty,ca]=k.split("|");return `<section class="tg"><h2 class="tg__h">${esc(store.typeName(ty)||"Sin tipo")} <span>·</span> ${esc(store.catName(ca)||"Sin categoría")}</h2><div class="tgrid">${arr.map(card).join("")}</div></section>`}).join("")||'<div class="empty">Aún no hay plantillas. Crea una nueva, o abre una publicación y usa «Guardar como plantilla».</div>'}</div>`;
  }
  const card=t=>{const f=fmtById(t.format);return `<article class="tcard" data-id="${t.id}"><button class="tcard__img" data-prev style="aspect-ratio:${f.w}/${f.h}" aria-label="Vista previa de ${esc(t.name)}">${t.thumb_url?`<img src="${esc(t.thumb_url)}" alt="" loading="lazy">`:I.image}</button><div class="tcard__b"><b>${esc(t.name)}</b><span class="chip chip--fmt">${esc(f.short)}${t.is_default?" ★":""}</span></div><div class="tcard__a"><button class="btn btn--sm" data-edit>${I.pencil}Editar</button><button class="btn btn--sm btn--icon" data-more aria-label="Más acciones">${I.ellipsis}</button></div></article>`};
  function classify(t,title){
    modal(title,`<div class="field"><label for="t-n">Nombre</label><input class="input" id="t-n" value="${esc(t?.name||"")}" required></div><div class="row"><div class="field"><label for="t-ty">Tipo de contenido</label><select class="select" id="t-ty">${opt(store.types,t?.type_id||S.ty,"—")}</select></div><div class="field"><label for="t-ca">Categoría de producto</label><select class="select" id="t-ca">${opt(store.cats,t?.category_id||S.ca,"—")}</select></div></div>
${t?`<p class="hint">Formato: ${esc(fmtById(t.format).label)} (no se puede cambiar: cada formato tiene su propia composición).</p>`:`<div class="field"><label for="t-fm">Formato</label><select class="select" id="t-fm">${FORMATS.map(f=>`<option value="${f.id}"${f.id===(S.fm||"post-4x5")?" selected":""}>${esc(f.label)} · ${f.w}×${f.h}</option>`).join("")}</select></div><p class="hint">Se crea con una composición base pensada para ese formato (zonas seguras incluidas). Después la editas libremente.</p>`}`,{ok:t?"Guardar":"Crear y abrir editor",onOk:async f=>{
      const name=f.querySelector("#t-n").value.trim();if(!name)throw new Error("Escribe un nombre");
      const ty=f.querySelector("#t-ty").value||null,ca=f.querySelector("#t-ca").value||null;
      if(t){await store.patchTemplate(t.id,{name,type_id:ty,category_id:ca});if(t.is_default){t.is_default=false;db.update("templates",t.id,{is_default:false}).catch(()=>{})}return}
      const fm=f.querySelector("#t-fm").value,w=toast("Creando plantilla…",{ms:600000});
      try{
        const data=await buildBlank(fm);
        const r=await store.createTemplate({name,type_id:ty,category_id:ca,format:fm,data,is_default:false});
        w.close();location.hash=`#/plantilla/${r.id}`;
      }catch(e){w.close();throw e}
    }});
  }
  root.addEventListener("change",e=>{const m={"f-ty":"ty","f-ca":"ca","f-fm":"fm"}[e.target.id];if(m){S[m]=e.target.value;render()}});
  root.addEventListener("click",e=>{
    const t=e.target;
    if(t.closest("[data-new]")){classify(null,"Nueva plantilla");return}
    const el=t.closest(".tcard");if(!el)return;const tp=store.tpl(el.dataset.id);if(!tp)return;
    if(t.closest("[data-edit]")){location.hash=`#/plantilla/${tp.id}`;return}
    if(t.closest("[data-prev]")){const f=fmtById(tp.format);modal(tp.name,`<div class="prev"><img src="${esc(tp.thumb_url||"")}" alt="Vista previa" style="aspect-ratio:${f.w}/${f.h}"></div>`,{ok:"Editar",onOk:()=>{location.hash=`#/plantilla/${tp.id}`}});return}
    const more=t.closest("[data-more]");
    if(more)openMenu(more,[
      {label:"Editar",icon:"pencil",run:()=>location.hash=`#/plantilla/${tp.id}`},
      {label:tp.is_default?"Es la predeterminada":"Usar como predeterminada",icon:"check",run:async()=>{try{await store.setDefault(tp.id);toast("Predeterminada de su combinación")}catch(err){toast(err.message,{kind:"err"})}}},
      {label:"Renombrar o reclasificar…",icon:"pencil",run:()=>classify(tp,"Editar plantilla")},
      {label:"Duplicar",icon:"copy",run:async()=>{try{await store.duplicateTemplate(tp.id);toast("Plantilla duplicada")}catch(err){toast(err.message,{kind:"err"})}}},
      "-",
      {label:"Eliminar",icon:"trash-2",danger:true,run:()=>modal("Eliminar plantilla",`<p>Se eliminará «${esc(tp.name)}». Las publicaciones creadas con ella no cambian.</p>`,{ok:"Eliminar",onOk:async()=>{await store.removeTemplate(tp.id);toast("Plantilla eliminada")}})}
    ]);
  });
  const off=store.on(render);render();if(!store.loaded&&!store.error)store.load();
  return off;
}
