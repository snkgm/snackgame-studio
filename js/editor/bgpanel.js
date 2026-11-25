import {store} from "../app/store.js?v=20261125x";
import {db} from "../app/db.js?v=20261125x";
import {esc,toast,modal} from "../app/ui.js?v=20261125x";
import {I} from "../app/icons.js?v=20261125x";
import {renderBackground,BG_DEFAULT,GRAD_DEFAULT,GRAD_PRESETS,gradCss} from "../img/background.js?v=20261125x";
import {extractPalette} from "../img/color.js?v=20261125x";
import {FX_DEFAULT} from "../img/fx.js?v=20261125x";
import {hashKey} from "../img/matting.js?v=20261125x";
import {searchBackgrounds,getKey,setKey} from "../img/bgsearch.js?v=20261125x";
const rng=(k,l,min,max)=>`<div class="field"><label for="b-${k}">${l}</label><input type="range" id="b-${k}" data-b="${k}" min="${min}" max="${max}"></div>`;
const fxv=(path,def)=>path.split(".").reduce((a,k)=>a&&a[k],def);
const fr=(p,l,min,max)=>`<div class="field"><label for="fx-${p}">${l}</label><input type="range" id="fx-${p}" data-fx="${p}" min="${min}" max="${max}"></div>`;
const fc=(p,l)=>`<label class="chk"><input type="checkbox" data-fx="${p}"> ${l}</label>`;
const fk=(p,l)=>`<div class="field"><label for="fx-${p}">${l}</label><input class="input" type="color" id="fx-${p}" data-fx="${p}"></div>`;
const FXHTML=`<section class="sec"><div class="sec__head"><span class="label">Viñeta</span><button class="sec__reset" data-fxreset="vig" title="Restablecer a valores de fábrica" aria-label="Restablecer viñeta">${I["rotate-ccw"]}</button></div>${fc("vig.on","Activar viñeta")}${fr("vig.intensity","Intensidad",0,100)}${fr("vig.size","Tamaño del área central",0,100)}${fr("vig.soft","Suavidad",0,100)}${fr("vig.opacity","Opacidad",0,100)}${fk("vig.color","Color")}</section>
<section class="sec"><div class="sec__head"><span class="label">Degradados desde bordes</span><button class="sec__reset" data-fxreset="edges" title="Restablecer a valores de fábrica" aria-label="Restablecer degradados">${I["rotate-ccw"]}</button></div><div class="row">${fc("edges.t","Superior")}${fc("edges.b","Inferior")}</div><div class="row">${fc("edges.l","Izquierdo")}${fc("edges.r","Derecho")}</div>${fr("edges.extent","Extensión",5,100)}${fr("edges.intensity","Intensidad",0,100)}${fr("edges.opacity","Opacidad",0,100)}${fr("edges.soft","Suavidad de transición",0,100)}${fk("edges.color","Color")}<span class="hint">Se aplican sobre el fondo, debajo del producto: las fotos originales no se tocan.</span></section>`;
const SV=d=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MODES=[["auto","Fondo automático",SV('<path d="m15 4 5 5L9 20l-5-5z"/><path d="m13 6 5 5"/><path d="M5 3v3M3.5 4.5h3M19 15v3M17.5 16.5h3"/>')],["solid","Color sólido",SV('<circle cx="12" cy="12" r="8" fill="currentColor"/>')],["grad","Degradado",SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8v8M11 8v8M15 8v8" opacity=".7"/>')],["image","Imagen de fondo",SV('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>')]];
const LS=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
const pushLS=(k,c,max=12)=>{const l=LS(k).filter(x=>x!==c);l.unshift(c);try{localStorage.setItem(k,JSON.stringify(l.slice(0,max)))}catch{}};
const BRAND=["#ffc400","#111111","#ffffff","#ff3d9a","#19d3ff","#3b2f8f"];
const hexOf=c=>/^#[0-9a-f]{6}$/i.test(c)?c:"#000000";
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(hexOf(h).slice(i,i+2),16)),A=p(a),B=p(b);return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("")};
const colorAt=(stops,p)=>{const st=[...stops].sort((a,b)=>a.p-b.p);if(p<=st[0].p)return st[0].c;for(let i=0;i<st.length-1;i++)if(p<=st[i+1].p){const t=(p-st[i].p)/Math.max(1,st[i+1].p-st[i].p);return mix(st[i].c,st[i+1].c,t)}return st[st.length-1].c};
const sw=(arr,attr)=>arr.map(c=>`<button type="button" class="sw" ${attr}="${c}" style="background:${c}" title="${c}" aria-label="${c}"></button>`).join("");
export function mountBgPanel(ed){
  let pending=null,running=false,found=[],tag="",msg="",gsel=0;
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
    const mode=c.mode==="solid"||c.mode==="grad"||c.mode==="image"?c.mode:"auto";
    const g={...GRAD_DEFAULT,...(c.grad||{})},gs=Math.min(gsel,g.stops.length-1),cur=g.stops[gs]||g.stops[0];
    const autoB=`<div class="field"><label>Colores del producto</label><div class="seg" id="bg-n">${[1,2,3].map(n=>`<button data-n="${n}" class="${c.n===n?"is-on":""}">${n} color${n>1?"es":""}</button>`).join("")}</div></div>
<div class="swatches">${cols.map((x,i)=>`<input type="color" data-col="${i}" value="${x}" aria-label="Color ${i+1}">`).join("")}</div>
<div class="row"><button class="btn btn--sm" data-act="extract">${I["rotate-ccw"]}Extraer del producto</button><button class="btn btn--sm" data-act="reset-cols">Restablecer</button></div>
${rng("angle","Dirección del degradado",0,360)}${rng("spread","Distribución de color",5,95)}${rng("blur","Intensidad de desenfoque",0,100)}
${rng("lum","Luminosidad",-60,60)}${rng("sat","Saturación",-100,100)}${rng("tex","Textura (grano %)",0,30)}${rng("light","Intensidad de luz",0,100)}${rng("lightX","Luz: posición X",0,100)}${rng("lightY","Luz: posición Y",0,100)}${rng("edge","Oscuridad de bordes",0,100)}${rng("opacity","Intensidad de efectos",0,100)}
<div class="field"><label>Variaciones <button class="btn btn--ghost btn--sm" data-act="regen" title="Regenerar">Regenerar</button></label><div class="varis">${variants()}</div></div>`;
    const solidB=`<div class="row"><div class="field"><label for="b-solid">Color</label><input class="input" type="color" id="b-solid" data-b="solid" value="${hexOf(c.solid)}"></div><div class="field"><label for="b-hex">Código HEX</label><input class="input" id="b-hex" maxlength="7" value="${hexOf(c.solid)}" spellcheck="false"></div></div>
<div class="field"><label>Recientes</label><div class="sws">${sw(LS("sg.recent"),"data-sc")||'<span class="hint">Aún no hay colores recientes</span>'}</div></div>
<div class="field"><label>Guardados <button class="btn btn--ghost btn--sm" data-savebg>Guardar este color</button></label><div class="sws">${sw(LS("sg.colors"),"data-sc")||'<span class="hint">Sin colores guardados</span>'}</div></div>
<div class="field"><label>Paleta de marca y producto</label><div class="sws">${sw([...new Set([...BRAND,...ed.palette])],"data-sc")}</div></div>`;
    const gradB=`<div class="seg" id="g-type"><button data-gt="linear" class="${g.type==="linear"?"is-on":""}">Lineal</button><button data-gt="radial" class="${g.type==="radial"?"is-on":""}">Radial</button></div>
<div class="field"><label>Colores (clic en la barra para añadir)</label><div class="gbar" id="gbar" style="background:${gradCss({...g,type:"linear",angle:90})}"><i class="gtk" style="left:0"></i><i class="gtk" style="left:25%"></i><i class="gtk gtk--c" style="left:50%"></i><i class="gtk" style="left:75%"></i><i class="gtk" style="left:100%"></i><i class="gsnap" hidden></i>${g.stops.map((st,i)=>`<button type="button" class="gstop${i===gs?" is-on":""}" data-gi="${i}" style="left:${st.p}%;background:${st.c}" aria-label="Color ${i+1}"></button>`).join("")}</div></div>
<div class="row"><div class="field"><label for="g-c">Color del punto</label><input class="input" type="color" id="g-c" data-gc value="${hexOf(cur.c)}"></div><div class="field"><label for="g-p">Posición %</label><input class="input" type="number" id="g-p" data-gp min="0" max="100" value="${cur.p}"></div></div>
<div class="row"><button class="btn btn--sm" data-gdup>Duplicar punto</button><button class="btn btn--sm" data-gdel${g.stops.length<=2?" disabled":""}>Eliminar punto</button></div>
${g.type==="linear"?`<div class="field"><label for="g-a">Dirección: <b id="g-av">${g.angle}</b>°</label><input type="range" id="g-a" data-g="angle" min="0" max="360" value="${g.angle}"></div>`:`<div class="field"><label for="g-x">Centro X</label><input type="range" id="g-x" data-g="cx" min="0" max="100" value="${g.cx}"></div><div class="field"><label for="g-y">Centro Y</label><input type="range" id="g-y" data-g="cy" min="0" max="100" value="${g.cy}"></div>`}
<div class="field"><label>Presets</label><div class="gpres">${GRAD_PRESETS.map((p,i)=>`<button type="button" class="gpre" data-gpre="${i}" title="${p.n}" aria-label="${p.n}" style="background:${gradCss(p.g)}"></button>`).join("")}</div></div>`;
    const imgB=`<div class="field"><label>Adaptación</label><div class="seg" id="bg-fit">${[["cover","Cubrir"],["contain","Sin recortar"],["manual","Manual"]].map(([k,l])=>`<button data-fit="${k}" class="${(c.imgFit||"cover")===k?"is-on":""}">${l}</button>`).join("")}</div></div>
${c.img?`<div class="row"><button class="btn btn--sm" data-act="separate" title="Vuelve a ser una capa de imagen independiente">Separar imagen del fondo</button></div>`:""}
<div class="field"><label>Biblioteca <button class="btn btn--ghost btn--sm" data-act="upload">${I.upload}Subir</button></label></div>
<div class="row"><select class="select" id="b-tag" aria-label="Categoría"><option value="">Todas</option>${tags.map(t=>`<option${t===tag?" selected":""}>${esc(t)}</option>`).join("")}</select><button class="btn btn--sm" data-act="save-cur" title="Guardar el fondo actual en la biblioteca">Guardar actual</button></div>
<div class="lib">${lib.map(b=>`<div class="lib__it${c.mode==="image"&&c.img===b.url?" is-on":""}" data-id="${b.id}"><img src="${esc(b.url)}" alt="${esc(b.name)}" loading="lazy"><span>${esc(b.name)}</span><div class="lib__act"><button data-act="edit" title="Editar">${I.pencil}</button><button data-act="del" title="Eliminar">${I["trash-2"]}</button></div></div>`).join("")||'<div class="hint">Sin fondos guardados. Pulsa Subir.</div>'}</div>
<div class="field"><label>Buscar fondos (Pexels)</label></div>
${getKey()?`<form class="row" id="b-sf"><input class="input" id="b-q" placeholder="Ej. neón, galaxia, madera" required><button class="btn btn--sm">Buscar</button></form><div class="lib">${found.map((f,i)=>`<div class="lib__it" data-f="${i}"><img src="${esc(f.thumb)}" alt="" loading="lazy"><span>${esc(f.credit)}</span></div>`).join("")}</div><button class="btn btn--ghost btn--sm" data-act="key">Cambiar clave</button>`:`<form class="field" id="b-kf"><input class="input" id="b-k" placeholder="Clave de la API de Pexels"><button class="btn btn--sm">Guardar clave</button></form>`}
${msg?`<span class="hint">${esc(msg)}</span>`:""}`;
    return `<section class="sec"><div class="sec__head"><span class="label">Fondo</span></div>
<div class="seg seg--ico" id="bg-mode" role="group" aria-label="Tipo de fondo">${MODES.map(([k,l,ic])=>`<button type="button" data-mode="${k}" class="${mode===k?"is-on":""}" title="${l}" aria-label="${l}" aria-pressed="${mode===k}">${ic}</button>`).join("")}</div><div class="hint bg-cap">${MODES.find(m=>m[0]===mode)[1]}</div>
${mode==="auto"?autoB:mode==="solid"?solidB:mode==="grad"?gradB:imgB}</section>
${FXHTML}`;
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
    const setG=(g,rb)=>{apply({mode:"grad",grad:g});if(rb)rebuild()};
    const G=()=>{const c=cfg();return JSON.parse(JSON.stringify({...GRAD_DEFAULT,...(c.grad||{})}))};
    root.addEventListener("pointerdown",e=>{
      const st=e.target.closest(".gstop");const bar=e.target.closest("#gbar");
      if(st){e.preventDefault();gsel=+st.dataset.gi;const g=G(),i=gsel,r=st.parentElement.getBoundingClientRect();
        root.querySelectorAll(".gstop").forEach(x=>x.classList.toggle("is-on",+x.dataset.gi===i));
        const mv=ev=>{let pp=Math.max(0,Math.min(100,Math.round((ev.clientX-r.left)/r.width*100)));const sn=ev.ctrlKey||ev.metaKey;if(sn)pp=50;const gs2=root.querySelector(".gsnap");if(gs2)gs2.hidden=!sn;g.stops[i].p=pp;st.style.left=g.stops[i].p+"%";const pi=root.querySelector("#g-p");if(pi)pi.value=g.stops[i].p;root.querySelector("#gbar").style.background=gradCss({...g,type:"linear",angle:90});setG(g,false)};
        const up=()=>{const gs2=root.querySelector(".gsnap");if(gs2)gs2.hidden=true;window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);setTimeout(()=>{ed.commit();rebuild()},120)};
        window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up);return}
      if(bar&&(e.target===bar||e.target.classList.contains("gtk"))){const r=bar.getBoundingClientRect(),p=Math.max(0,Math.min(100,Math.round((e.clientX-r.left)/r.width*100))),g=G();g.stops.push({p,c:colorAt(g.stops,p)});gsel=g.stops.length-1;setG(g,true);setTimeout(()=>ed.commit(),150)}
    });
    root.addEventListener("input",e=>{const el=e.target;
      if(el.dataset.gc!==undefined){const g=G();g.stops[Math.min(gsel,g.stops.length-1)].c=el.value;const sp=root.querySelector(`.gstop[data-gi="${gsel}"]`);if(sp)sp.style.background=el.value;root.querySelector("#gbar").style.background=gradCss({...g,type:"linear",angle:90});setG(g,false)}
      if(el.dataset.g){const g=G();g[el.dataset.g]=+el.value;const av=root.querySelector("#g-av");if(av&&el.dataset.g==="angle")av.textContent=el.value;setG(g,false)}
    });
    root.addEventListener("change",e=>{const el=e.target;
      if(el.dataset.gc!==undefined||el.dataset.g){setTimeout(()=>ed.commit(),150);return}
      if(el.dataset.gp!==undefined){const g=G();g.stops[Math.min(gsel,g.stops.length-1)].p=Math.max(0,Math.min(100,+el.value||0));setG(g,true);setTimeout(()=>ed.commit(),150);return}
      if(el.id==="b-hex"){const v=el.value.trim();const h=/^#?[0-9a-f]{6}$/i.test(v)?(v[0]==="#"?v:"#"+v):null;if(h){pushLS("sg.recent",h);apply({solid:h,mode:"solid"});ed.canvas.backgroundColor=h;ed.canvas.requestRenderAll();setTimeout(()=>{ed.commit();rebuild()},120)}else el.value=hexOf(cfg().solid);return}
      if(el.dataset.b==="solid")pushLS("sg.recent",el.value);
    });
    root.addEventListener("click",e=>{const t=e.target;
      const gt=t.closest("[data-gt]");if(gt){const g=G();g.type=gt.dataset.gt;setG(g,true);setTimeout(()=>ed.commit(),150);return}
      const gp=t.closest("[data-gpre]");if(gp){const g=JSON.parse(JSON.stringify({...GRAD_DEFAULT,...GRAD_PRESETS[+gp.dataset.gpre].g}));gsel=0;setG(g,true);setTimeout(()=>ed.commit(),150);return}
      if(t.closest("[data-gdup]")){const g=G(),i=Math.min(gsel,g.stops.length-1),s0=g.stops[i];g.stops.push({p:Math.min(100,s0.p+8),c:s0.c});gsel=g.stops.length-1;setG(g,true);setTimeout(()=>ed.commit(),150);return}
      if(t.closest("[data-gdel]")){const g=G();if(g.stops.length>2){g.stops.splice(Math.min(gsel,g.stops.length-1),1);gsel=0;setG(g,true);setTimeout(()=>ed.commit(),150)}return}
      const sc=t.closest("[data-sc]");if(sc){const c=sc.dataset.sc;pushLS("sg.recent",c);apply({solid:c,mode:"solid"});ed.canvas.backgroundColor=c;ed.canvas.requestRenderAll();setTimeout(()=>{ed.commit();rebuild()},120);return}
      if(t.closest("[data-savebg]")){pushLS("sg.colors",cfg().solid);rebuild();return}
      const ft=t.closest("[data-fit]");if(ft){ed.applyBg({imgFit:ft.dataset.fit},{snap:true}).then(rebuild);return}
      if(t.closest('[data-act="separate"]')){ed.separateBg().then(rebuild);return}
    });
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
      if(m){const mode=m.dataset.mode;if(mode==="image"&&!cfg().img){msg="Elige una imagen de la biblioteca o súbela";cfg().mode="image";ed.cfg.bg.mode="image";rebuild();return}if(mode==="grad"){await ed.applyBg({mode:"grad",grad:cfg().grad||GRAD_DEFAULT},{snap:true});rebuild();return}if(mode==="solid"){await ed.applyBg({mode:"solid"},{snap:true});rebuild();return}if(mode==="auto"&&!ed.palette.length)ed.palette=BG_DEFAULT&&["#3b2f8f","#8f2f6a","#ffb400"];await ed.applyBg({mode},{snap:true});rebuild();return}
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
