import {store} from "../app/store.js?v=20261125n";
import {FORMATS} from "../app/formats.js?v=20261125n";
import {esc,toast,modal} from "../app/ui.js?v=20261125n";
import {searchCatalog} from "../app/catalog.js?v=20261125n";
import {createVariants} from "../studio/create.js?v=20261125n";
const pad=n=>String(n).padStart(2,"0");
export function openBatch(){
  const opts=arr=>`<option value="">—</option>`+arr.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("");
  const d=new Date();d.setDate(d.getDate()+1);const day=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  let items=[];const sel=new Map();
  const m=modal("Programar en lote",`<p class="hint">Elige varios productos y una frecuencia: se crea una publicación programada por producto con su plantilla, preset de categoría y preset de producto. Luego puedes editar cada una.</p>
<div class="row"><div class="field"><label for="b-ty">Tipo de contenido</label><select class="select" id="b-ty">${opts(store.types)}</select></div><div class="field"><label for="b-c">Categoría de producto</label><select class="select" id="b-c">${opts(store.cats)}</select></div></div>
<div class="wz__fmts">${FORMATS.filter(f=>f.id!=="reel-cover").map(f=>`<label class="chk"><input type="checkbox" value="${f.id}"${f.id==="post-4x5"?" checked":""}> ${esc(f.label)} <em>${f.w}×${f.h}</em></label>`).join("")}</div>
<div class="row"><div class="field"><label for="b-d">Primer día</label><input class="input" type="date" id="b-d" value="${day}"></div><div class="field"><label for="b-h">Hora</label><input class="input" type="time" id="b-h" value="19:00"></div><div class="field"><label for="b-e">Cada (días)</label><input class="input" type="number" id="b-e" min="1" max="30" value="1"></div></div>
<div class="field"><label for="b-q">Productos</label><input class="input" id="b-q" placeholder="Buscar en la tienda…" autocomplete="off"></div>
<div class="plist" id="b-l" style="max-height:260px"></div><div class="hint" id="b-n">0 productos elegidos</div>`,{ok:"Crear y programar",wide:true,onOk:async f=>{
    const chosen=[...sel.values()];if(!chosen.length)throw new Error("Elige al menos un producto");
    const fm=[...f.querySelectorAll(".wz__fmts input:checked")].map(i=>({fmt:i.value,tplId:store.resolveTemplate(f.querySelector("#b-ty").value||null,f.querySelector("#b-c").value||null,i.value)?.id||null}));
    if(!fm.length)throw new Error("Marca al menos un formato");
    const every=Math.max(1,+f.querySelector("#b-e").value||1),[hh,mm]=f.querySelector("#b-h").value.split(":").map(Number),start=new Date(f.querySelector("#b-d").value+"T12:00");
    const t=toast("Preparando…",{ms:3600000});let n=0;
    try{
      for(let i=0;i<chosen.length;i++){
        const when=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i*every,hh,mm).toISOString();
        const p=chosen[i];
        await createVariants({title:p.name,typeId:f.querySelector("#b-ty").value,catId:f.querySelector("#b-c").value,items:fm,product:{...p},when,status:"scheduled",onStep:s=>{t.querySelector("span").textContent=`${i+1}/${chosen.length} · ${p.name.slice(0,28)} · ${s}`}});n++;
      }
      t.close();toast(`${n} producto${n>1?"s":""} programado${n>1?"s":""}`);
    }catch(e){t.close();if(n)toast(`Se crearon ${n} antes del error`);throw e}
  }});
  const f=m.form,list=f.querySelector("#b-l"),cnt=f.querySelector("#b-n");let tm;
  const paint=()=>{list.innerHTML=items.map((p,i)=>`<label class="pitem" style="cursor:pointer"><input type="checkbox" data-i="${i}"${sel.has(p.handle)?" checked":""}><span>${esc(p.name)}</span><em>${esc(p.price)}</em></label>`).join("")||'<div class="hint">Sin resultados</div>';cnt.textContent=`${sel.size} producto${sel.size===1?"":"s"} elegido${sel.size===1?"":"s"}`};
  const load=async()=>{list.innerHTML='<div class="hint">Cargando catálogo…</div>';try{items=await searchCatalog(f.querySelector("#b-q").value,60);paint()}catch(e){list.innerHTML=`<div class="hint">${esc(e.message)}</div>`}};
  f.querySelector("#b-q").oninput=()=>{clearTimeout(tm);tm=setTimeout(load,250)};
  list.onchange=e=>{const i=e.target.dataset.i;if(i===undefined)return;const p=items[+i];e.target.checked?sel.set(p.handle,p):sel.delete(p.handle);cnt.textContent=`${sel.size} producto${sel.size===1?"":"s"} elegido${sel.size===1?"":"s"}`};
  load();
}
