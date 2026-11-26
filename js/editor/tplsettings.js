import {modal,esc} from "../app/ui.js?v=20261126y";
import {FIELDS} from "./editor.js?v=20261126y";
const isT=o=>o&&/text/i.test(o.type||"");
const EMPTY=[["","Dejar vacío"],["alt","Usar el valor predeterminado"],["hide","Ocultar la capa"]];
export function openTplSettings(ed,post){
  const dyn=ed.canvas.getObjects().filter(o=>isT(o)&&o.field);
  const cfg=ed.cfg,pr=cfg.product||{};
  const rows=dyn.map((o,i)=>{const R=o.rule||{};return `<div class="tps__r" data-i="${i}">
<div class="tps__h"><b>${esc(o.name||"Texto")}</b><span class="chip">${esc(FIELDS[o.field]||o.field)}</span></div>
<div class="row"><div class="field"><label>Formato (usa {valor})</label><input class="input" data-k="pattern" value="${esc(o.pattern||"{valor}")}"></div><div class="field"><label>Valor de muestra</label><input class="input" data-k="sample" value="${esc((ed.product&&ed.product[o.field])||"")}"></div></div>
<div class="row"><div class="field"><label>Si el producto no tiene el dato</label><select class="select" data-k="empty">${EMPTY.map(([v,l])=>`<option value="${v}"${(R.empty||"")===v?" selected":""}>${l}</option>`).join("")}</select></div><div class="field"><label>Valor predeterminado</label><input class="input" data-k="alt" value="${esc(R.alt||"")}" placeholder="Texto de reserva"></div></div>
</div>`}).join("");
  const html=`<div class="tps">
<p class="hint">Cada plantilla guarda su diseño y estos valores predeterminados. Al generar una publicación, los datos de cada producto sustituyen a los valores de muestra; el valor predeterminado solo se usa cuando el producto no trae el dato.</p>
<h3 class="tps__t">Datos dinámicos (${dyn.length})</h3>${rows||'<p class="hint">Esta plantilla no tiene textos vinculados a datos del producto. Selecciona un texto y elige su dato en «Dato dinámico».</p>'}
<h3 class="tps__t">Documento</h3>
<label class="chk"><input type="checkbox" id="t-rm"${pr.removeBg!==false?" checked":""}> Quitar el fondo de la foto del producto automáticamente</label>
<label class="chk"><input type="checkbox" id="t-ms"${cfg.mshow!==0?" checked":""}> Mostrar márgenes en el editor</label>
<label class="chk"><input type="checkbox" id="t-ml"${cfg.mlock!==0?" checked":""}> Márgenes bloqueados</label>
<h3 class="tps__t">Qué se guarda en esta plantilla</h3>
<p class="hint">Capas y su orden, tipografías, fondo (automático, sólido, degradado o imagen), ajustes de foto, overlays y destellos con su fusión y opacidad, márgenes y guías, y estos valores predeterminados.</p>
</div>`;
  const m=modal("Ajustes de plantilla · "+(post.title||post.name||""),html,{ok:"Aplicar",wide:true,onOk:()=>{
    dyn.forEach((o,i)=>{const r=m.el.querySelector(`[data-i="${i}"]`),g=k=>r.querySelector(`[data-k="${k}"]`).value;
      o.set("pattern",g("pattern")||"{valor}");o.rule={...(o.rule||{}),empty:g("empty")||undefined,alt:g("alt")||undefined};
      ed.setProduct({[o.field]:g("sample")})});
    (cfg.product??={}).removeBg=m.el.querySelector("#t-rm").checked;
    cfg.mshow=m.el.querySelector("#t-ms").checked?1:0;cfg.mlock=m.el.querySelector("#t-ml").checked?1:0;
    ed.applyFields();ed.emit("safe");ed.canvas.requestRenderAll();ed.commit();
  }});
}
