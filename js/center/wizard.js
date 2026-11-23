import {store} from "../app/store.js?v=20261123j";
import {FORMATS} from "../app/formats.js?v=20261123j";
import {esc,toast,modal} from "../app/ui.js?v=20261123j";
import {fromInput} from "../app/dates.js?v=20261123j";
import {productSearchHtml,bindProductSearch} from "../studio/productSearch.js?v=20261123j";
import {createVariants} from "../studio/create.js?v=20261123j";
export function openWizard(dayKey){
  const dt=dayKey?`${dayKey}T12:00`:"";
  const opts=(arr)=>`<option value="">—</option>`+arr.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("");
  let pick=null;
  const m=modal("Nueva publicación",`<div class="field"><label for="n-t">Título</label><input class="input" id="n-t" placeholder="Ej. Funko Pop Stitch" required></div>
<div class="wz__h">1 · Contenido y producto</div>
<div class="row"><div class="field"><label for="n-ty">Tipo de contenido</label><select class="select" id="n-ty">${opts(store.types)}</select></div><div class="field"><label for="n-c">Categoría de producto</label><select class="select" id="n-c">${opts(store.cats)}</select></div></div>
${productSearchHtml()}
<div class="wz__h">2 · Formatos y plantillas <span class="hint">Se crea una versión editable por cada formato marcado, con su propia composición.</span></div>
<div class="wz__fmts" id="n-fm">${FORMATS.map(f=>`<div class="wz__fmt"><label class="chk"><input type="checkbox" value="${f.id}"${f.id==="post-4x5"||f.id==="story-9x16"?" checked":""}> ${esc(f.label)} <em>${f.w}×${f.h}</em></label><select class="select" data-tpl="${f.id}" aria-label="Plantilla ${esc(f.label)}"></select></div>`).join("")}</div>
<div class="field"><label for="n-d">Fecha y hora (opcional)</label><input class="input" type="datetime-local" id="n-d" value="${dt}"></div>`,{ok:"Crear y abrir editor",wide:true,onOk:async f=>{
    const title=f.querySelector("#n-t").value.trim();if(!title)throw new Error("Escribe un título");
    const items=[...f.querySelectorAll("#n-fm input:checked")].map(i=>({fmt:i.value,tplId:f.querySelector(`[data-tpl="${i.value}"]`).value||null}));
    if(!items.length)throw new Error("Marca al menos un formato");
    const t=toast("Creando…",{ms:600000});
    try{
      let product=pick&&pick.product?{...pick.product}:null;if(product){delete product.preview}
      const rows=await createVariants({title,typeId:f.querySelector("#n-ty").value,catId:f.querySelector("#n-c").value,items,product,blob:pick&&pick.blob,when:fromInput(f.querySelector("#n-d").value),onStep:s=>{t.querySelector("span").textContent=s}});
      t.close();toast(rows.length>1?`${rows.length} versiones creadas. Abro la primera.`:"Publicación creada");
      location.hash=`#/editor/${rows[0].id}`;
    }catch(e){t.close();throw e}
  }});
  const f=m.form;
  const fill=()=>{
    const ty=f.querySelector("#n-ty").value,ca=f.querySelector("#n-c").value;
    FORMATS.forEach(x=>{
      const sel=f.querySelector(`[data-tpl="${x.id}"]`),cur=sel.value;
      const list=store.templates.filter(t=>t.format===x.id);
      const best=store.resolveTemplate(ty||null,ca||null,x.id);
      sel.innerHTML=`<option value="">Plantilla base automática</option>`+list.map(t=>`<option value="${t.id}">${esc(t.name)}${t.is_default?" ★":""}</option>`).join("");
      sel.value=(cur&&list.some(t=>t.id===cur))?cur:(best?best.id:"");
    });
  };
  f.querySelector("#n-ty").onchange=fill;f.querySelector("#n-c").onchange=fill;fill();
  bindProductSearch(f,p=>{pick=p;if(p.product&&p.product.category&&!f.querySelector("#n-c").value){const c=store.cats.find(x=>x.name.toLowerCase().includes((p.product.category||"").toLowerCase().replace("funko pop","funko"))||(p.product.category||"").toLowerCase().includes(x.name.toLowerCase().replace(/s$/,"")));if(c){f.querySelector("#n-c").value=c.id;fill()}}if(!f.querySelector("#n-t").value)f.querySelector("#n-t").value=p.product.name||""});
}
