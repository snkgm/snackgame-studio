import {store} from "../app/store.js?v=20261124u";
import {db} from "../app/db.js?v=20261124u";
import {esc,toast,modal} from "../app/ui.js?v=20261124u";
import {I} from "../app/icons.js?v=20261124u";
import {renderBackground,BG_DEFAULT} from "../img/background.js?v=20261124u";
import {extractPalette} from "../img/color.js?v=20261124u";
import {FX_DEFAULT} from "../img/fx.js?v=20261124u";
import {hashKey} from "../img/matting.js?v=20261124u";
import {searchBackgrounds,getKey,setKey} from "../img/bgsearch.js?v=20261124u";
const rng=(k,l,min,max)=>`<div class="field"><label for="b-${k}">${l}</label><input type="range" id="b-${k}" data-b="${k}" min="${min}" max="${max}"></div>`;
const fxv=(path,def)=>path.split(".").reduce((a,k)=>a&&a[k],def);
const fr=(p,l,min,max)=>`<div class="field"><label for="fx-${p}">${l}</label><input type="range" id="fx-${p}" data-fx="${p}" min="${min}" max="${max}"></div>`;
const fc=(p,l)=>`<label class="chk"><input type="checkbox" data-fx="${p}"> ${l}</label>`;
const fk=(p,l)=>`<div class="field"><label for="fx-${p}">${l}</label><input class="input" type="color" id="fx-${p}" data-fx="${p}"></div>`;
const FXHTML=`<section class="sec"><div class="sec__head"><span class="label">Viñeta</span><button class="sec__reset" data-fxreset="vig" title="Restablecer a valores de fábrica" aria-label="Restablecer viñeta">${I["rotate-ccw"]}</button></div>${fc("vig.on","Activar viñeta")}${fr("vig.intensity","Intensidad",0,100)}${fr("vig.size","Tamaño del área central",0,100)}${fr("vig.soft","Suavidad",0,100)}${fr("vig.opacity","Opacidad",0,100)}${fk("vig.color","Color")}</section>
<section class="sec"><div class="sec__head"><span class="label">Degradados desde bordes</span><button class="sec__reset" data-fxreset="edges" title="Restablecer a valores de fábrica" aria-label="Restablecer degradados">${I["rotate-ccw"]}</button></div><div class="row">${fc("edges.t","Superior")}${fc("edges.b","Inferior")}</div><div class="row">${fc("edges.l","Izquierdo")}${fc("edges.r","Derecho")}</div>${fr("edges.extent","Extensión",5,100)}${fr("edges.intensity","Intensidad",0,100)}${fr("edges.opacity","Opacidad",0,100)}${fr("edges.soft","Suavidad de transición",0,100)}${fk("edges.color","Color")}<span class="hint">Se aplican sobre el fondo, debajo del producto: las fotos originales no se tocan.</span></section>`;
const MODES=[["auto","Automático"],["solid","Color"],["image","Imagen"]];
export function mountBgPanel(ed){
  let pending=null,running=false,found=[],tag="",msg="";
  const cfg=()=>ed.bgCfg;
  async function run(){
    if(running)return;running=true;
    while(pending){const p=pending;pending=null;try{await ed.applyBg(p)}catch(e){toast(e.message,{kind:"err"})}}
    running=false;
  }
  const apply=p=>{pending={...(pending||{}),...p};run()};
  function variants(){
    const c=cfg(),out=[];
    for(let i=1;i<=4;i++){const s=c.seed+i;const cv=renderBackground(96,120,{...c,seed:s},ed.palette);out.push(`<button class="vari" data-seed="${s}" title="Variación ${i}"><img src="${cv.toDataURL("image/jpeg",.7)}" alt="Variación ${i}"></button>`)}
    return out.join("");
  }
  function html(){
    const c=cfg(),cols=ed.colors();
    const tags=[...new Set(store.backgrounds.map(b=>b.tag).filter(Boolean))];
    const lib=store.backgrounds.filter(b=>!tag||b.tag===tag);
    return `<section class="sec"><div class="sec__head"><span class="label">Fondo</span></div>
<div class="seg" id="bg-mode">${MODES.map(([k,l])=>`<button data-mode="${k}" class="${c.mode===k?"is-on":""}">${l}</button>`).join("")}</div></section>
${c.mode==="auto"?`<section class="sec"><div class="sec__head"><span class="label">Colores del producto</span></div>
<div class="seg" id="bg-n">${[1,2,3].map(n=>`<button data-n="${n}" class="${c.n===n?"is-on":""}">${n} color${n>1?"es":""}</button>`).join("")}</div>
<div class="swatches">${cols.map((x,i)=>`<input type="color" data-col="${i}" value="${x}" aria-label="Color ${i+1}">`).join("")}</div>
<div class="row"><button class="btn btn--sm" data-act="extract">${I["rotate-ccw"]}Extraer del producto</button><button class="btn btn--sm" data-act="reset-cols">Restablecer</button></div>
${rng("angle","Dirección del degradado",0,360)}${rng("spread","Distribución de color",5,95)}${rng("blur","Intensidad de desenfoque",0,100)}
${rng("lum","Luminosidad",-60,60)}${rng("sat","Saturación",-100,100)}${rng("tex","Textura (grano %)",0,30)}${rng("light","Intensidad de luz",0,100)}${rng("lightX","Luz: posición X",0,100)}${rng("lightY","Luz: posición Y",0,100)}${rng("edge","Oscuridad de bordes",0,100)}${rng("opacity","Opacidad de efectos",0,100)}
</section>
<section class="sec"><div class="sec__head"><span class="label">Variaciones</span><button class="btn btn--ghost btn--sm" data-act="regen" title="Regenerar">Regenerar</button></div><div class="varis">${variants()}</div></section>`:""}
${c.mode==="solid"?`<section class="sec"><div class="field"><label for="b-solid">Color de fondo</label><input class="input" type="color" id="b-solid" data-b="solid" value="${c.solid}"></div></section>`:""}
${FXHTML}
<section class="sec"><div class="sec__head"><span class="label">Biblioteca de fondos</span><button class="btn btn--ghost btn--sm" data-act="upload">${I.upload}Subir</button></div>
<div class="row"><select class="select" id="b-tag" aria-label="Categoría"><option value="">Todas</option>${tags.map(t=>`<option${t===tag?" selected":""}>${esc(t)}</option>`).join("")}</select><button class="btn btn--sm" data-act="save-cur" title="Guardar el fondo actual en la biblioteca">Guardar actual</button></div>
<div class="lib">${lib.map(b=>`<div class="lib__it${c.mode==="image"&&c.img===b.url?" is-on":""}" data-id="${b.id}"><img src="${esc(b.url)}" alt="${esc(b.name)}" loading="lazy"><span>${esc(b.name)}</span><div class="lib__act"><button data-act="edit" title="Editar">${I.pencil}</button><button data-act="del" title="Eliminar">${I["trash-2"]}</button></div></div>`).join("")||'<div class="hint">Sin fondos guardados. Sube imágenes o guarda el fondo actual.</div>'}</div></section>
<section class="sec"><div class="sec__head"><span class="label">Buscar fondos (Pexels)</span></div>
${getKey()?`<form class="row" id="b-sf"><input class="input" id="b-q" placeholder="Ej. neón, galaxia, madera" required><button class="btn btn--sm">Buscar</button></form><div class="lib">${found.map((f,i)=>`<div class="lib__it" data-f="${i}"><img src="${esc(f.thumb)}" alt="" loading="lazy"><span>${esc(f.credit)}</span></div>`).join("")}</div><button class="btn btn--ghost btn--sm" data-act="key">Cambiar clave</button>`:`<form class="row" id="b-kf"><input class="input" id="b-k" placeholder="Clave gratuita de Pexels" required><button class="btn btn--sm">Guardar</button></form><span class="hint">Se obtiene gratis en pexels.com/api. Solo se guarda en este navegador.</span>`}
${msg?`<span class="hint">${esc(msg)}</span>`:""}</section>`;
  }
  const fxGet=p=>{const f=ed.cfg.bgfx;const a=p.split(".");const own=f&&f[a[0]]&&f[a[0]][a[1]];return own!==undefined?own:FX_DEFAULT[a[0]][a[1]]};
  const fxSet=p=>{};
  function sync(root){
    root.querySelectorAll("[data-fx]").forEach(el=>{if(el===document.activeElement)return;const v=fxGet(el.dataset.fx);if(el.type==="checkbox")el.checked=!!v;else el.value=v});
    const c=cfg();root.querySelectorAll("[data-b]").forEach(el=>{if(el!==document.activeElement&&c[el.dataset.b]!==undefined)el.value=c[el.dataset.b]});
  }
  async function reExtract(){
    const pl=ed.productLayer();if(!pl){toast("Añade un producto para extraer colores",{kind:"err"});return}
    ed.palette=extractPalette(pl.getElement());apply({colors:null});
  }
  async function uploadFile(file,tagV){
    const key=await hashKey(await file.arrayBuffer());
    const url=await db.upload(`bg/${key}.jpg`,file);
    return store.addBackground({name:file.name.replace(/\.[^.]+$/,"").slice(0,40)||"Fondo",tag:tagV||tag||"",url});
  }
  let raf=0;
  function setFx(el){
    const [g,k]=el.dataset.fx.split(".");const f=ed.cfg.bgfx||(ed.cfg.bgfx=JSON.parse(JSON.stringify(FX_DEFAULT)));
    f[g]={...f[g],[k]:el.type==="checkbox"?el.checked:el.type==="range"?+el.value:el.value};
    if(g==="vig"&&k!=="on"&&!f.vig.on&&el.type==="range"){}
    cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>ed.applyBgFx());
  }
  function bind(root,rebuild){
    root.addEventListener("click",e=>{const b=e.target.closest("[data-fxreset]");if(!b)return;const g=b.dataset.fxreset,f=ed.cfg.bgfx||(ed.cfg.bgfx=JSON.parse(JSON.stringify(FX_DEFAULT)));f[g]={...FX_DEFAULT[g]};ed.applyBgFx();ed.commit();rebuild()});
    root.addEventListener("input",e=>{if(e.target.dataset.fx)setFx(e.target)});
    root.addEventListener("change",e=>{if(e.target.dataset.fx){setFx(e.target);setTimeout(()=>ed.commit(),80)}});
    root.addEventListener("input",e=>{const el=e.target;if(!el.dataset.b)return;const k=el.dataset.b;apply({[k]:el.type==="range"?+el.value:el.value,...(k==="solid"?{mode:"solid"}:{})});if(k==="solid"){ed.canvas.backgroundColor=el.value;ed.canvas.requestRenderAll()}
      if(el.dataset.col!==undefined)return});
    root.addEventListener("input",e=>{const el=e.target;if(el.dataset.col===undefined)return;const cs=ed.colors();cs[+el.dataset.col]=el.value;apply({colors:cs})});
    root.addEventListener("change",e=>{
      const el=e.target;
      if(el.dataset.b||el.dataset.col!==undefined){setTimeout(()=>ed.commit(),60)}
      if(el.id==="b-tag"){tag=el.value;rebuild()}
    });
    root.addEventListener("submit",async e=>{
      e.preventDefault();
      if(e.target.id==="b-kf"){setKey(root.querySelector("#b-k").value);rebuild();return}
      if(e.target.id==="b-sf"){msg="Buscando…";try{found=await searchBackgrounds(root.querySelector("#b-q").value);msg=found.length?"":"Sin resultados"}catch(err){msg=err.message;found=[]}rebuild()}
    });
    root.addEventListener("click",async e=>{
      const t=e.target;
      const m=t.closest("#bg-mode [data-mode]");
      if(m){const mode=m.dataset.mode;if(mode==="image"&&!cfg().img){msg="Elige una imagen de la biblioteca o súbela";cfg().mode="image";ed.cfg.bg.mode="image";rebuild();return}if(mode==="auto"&&!ed.palette.length)ed.palette=BG_DEFAULT&&["#3b2f8f","#8f2f6a","#ffb400"];await ed.applyBg({mode},{snap:true});rebuild();return}
      const n=t.closest("#bg-n [data-n]");if(n){await ed.applyBg({n:+n.dataset.n,colors:null},{snap:true});rebuild();return}
      const v=t.closest("[data-seed]");if(v){await ed.applyBg({seed:+v.dataset.seed},{snap:true});rebuild();return}
      const li=t.closest(".lib__it[data-id]");
      const act=t.closest("[data-act]")?.dataset.act;
      if(li&&!act){const b=store.backgrounds.find(x=>x.id===li.dataset.id);if(b){await ed.applyBg({mode:"image",img:b.url,credit:""},{snap:true});rebuild()}return}
      const fi=t.closest(".lib__it[data-f]");if(fi){const f=found[+fi.dataset.f];await ed.applyBg({mode:"image",img:f.url,credit:f.credit},{snap:true});rebuild();return}
      if(act==="regen"){await ed.applyBg({seed:Math.floor(Math.random()*9000)+1,colors:null},{snap:true});rebuild()}
      else if(act==="extract"){await reExtract();ed.commit();rebuild()}
      else if(act==="reset-cols"){await ed.applyBg({colors:null},{snap:true});rebuild()}
      else if(act==="key"){setKey("");rebuild()}
      else if(act==="upload"){const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.onchange=async()=>{try{for(const f of i.files)await uploadFile(f);toast("Fondo guardado en la biblioteca")}catch(err){toast(err.message,{kind:"err"})}rebuild()};i.click()}
      else if(act==="save-cur"){
        try{
          const c=cfg();let blob;
          if(c.mode==="auto"){const cv=renderBackground(ed.W,ed.H,c,ed.palette);blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.92))}
          else if(c.mode==="image"&&c.img)blob=await (await fetch(c.img)).blob();
          else throw new Error("El fondo actual no se puede guardar");
          await uploadFile(new File([blob],"Fondo "+new Date().toLocaleDateString("es-ES")+".jpg",{type:"image/jpeg"}));toast("Fondo guardado en la biblioteca");rebuild();
        }catch(err){toast(err.message,{kind:"err"})}
      }
      else if(act==="edit"){
        const b=store.backgrounds.find(x=>x.id===li.dataset.id);
        modal("Editar fondo",`<div class="field"><label for="e-n">Nombre</label><input class="input" id="e-n" value="${esc(b.name)}"></div><div class="field"><label for="e-t">Categoría</label><input class="input" id="e-t" value="${esc(b.tag)}" placeholder="Ej. Neón, Oscuro, Pokémon"></div>`,{ok:"Guardar",onOk:async f=>{await store.patchBackground(b.id,{name:f.querySelector("#e-n").value.trim()||b.name,tag:f.querySelector("#e-t").value.trim()});rebuild()}});
      }
      else if(act==="del"){const b=store.backgrounds.find(x=>x.id===li.dataset.id);try{await store.removeBackground(b.id);toast("Fondo eliminado");rebuild()}catch(err){toast(err.message,{kind:"err"})}}
    });
  }
  return {html,sync,bind};
}
