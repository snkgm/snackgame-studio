import {modal,toast,esc} from "../app/ui.js?v=20261126v";
import {zipBlobs} from "../app/zip.js?v=20261126v";
const K="sg.export";
const D={fmt:"png",scale:1,w:0,q:92,transp:false,fill:"#ffffff",mode:"color",which:"cur",name:""};
const load=()=>{try{return {...D,...JSON.parse(localStorage.getItem(K)||"{}")}}catch{return {...D}}};
const MIME={png:"image/png",jpg:"image/jpeg",webp:"image/webp"};
const img=u=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u});
const toBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q));
export async function renderCanvas(ed,o,outW){
  const c=ed.canvas;c.discardActiveObject();
  const bgc=c.backgroundColor,hid=o.transp?c.getObjects().filter(x=>["background","bgfx"].includes(x.role)&&x.visible!==false):[];
  let url;
  try{hid.forEach(x=>x.set("visible",false));if(o.transp)c.backgroundColor="";url=ed.shot("png",1,outW)}
  finally{hid.forEach(x=>x.set("visible",true));c.backgroundColor=bgc;c.requestRenderAll()}
  const im=await img(url),W=Math.round(outW),H=Math.round(outW*ed.H/ed.W);
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");g.imageSmoothingQuality="high";
  const opaque=o.fmt==="jpg"||o.fmt==="pdf"||!o.transp;
  if(opaque||o.fill){if(o.fmt==="jpg"||o.fmt==="pdf"||(o.transp&&false)){g.fillStyle=o.fill;g.fillRect(0,0,W,H)}}
  g.drawImage(im,0,0,W,H);
  if(o.mode!=="color"){const d=g.getImageData(0,0,W,H),p=d.data;for(let i=0;i<p.length;i+=4){let y=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];if(o.mode==="bw")y=y>=128?255:0;p[i]=p[i+1]=p[i+2]=y}g.putImageData(d,0,0)}
  return cv;
}
function pdf(pages){
  const te=new TextEncoder(),ch=[],off=[];let len=0;const push=b=>{ch.push(b);len+=b.length};const s=t=>push(te.encode(t));
  const N=2+pages.length*3;s("%PDF-1.4\n");
  const ob=(n,f)=>{off[n]=len;s(`${n} 0 obj\n`);f();s("\nendobj\n")};
  ob(1,()=>s("<< /Type /Catalog /Pages 2 0 R >>"));
  ob(2,()=>s(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(" ")}] >>`));
  pages.forEach((p,i)=>{const a=3+i*3;
    ob(a,()=>s(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im${i} ${a+2} 0 R >> >> /Contents ${a+1} 0 R >>`));
    const cs=`q ${p.w} 0 0 ${p.h} 0 0 cm /Im${i} Do Q`;ob(a+1,()=>s(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    ob(a+2,()=>{s(`<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`);push(p.jpg);s("\nendstream")})});
  const xr=len;s(`xref\n0 ${N+1}\n0000000000 65535 f \n`);for(let n=1;n<=N;n++)s(String(off[n]).padStart(10,"0")+" 00000 n \n");
  s(`trailer\n<< /Size ${N+1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
  return new Blob(ch,{type:"application/pdf"});
}
const save=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
export function openExport(ed,{slug}){
  let o=load();if(!o.name)o.name=slug;
  const many=!!ed.slides;
  const html=`<div class="exp">
<div class="exp__prev"><div class="exp__pv" id="x-pv"><img id="x-img" alt="Vista previa de la exportación"></div><div class="hint" id="x-info"></div></div>
<div class="exp__f">
<div class="field"><label for="x-name">Nombre del archivo</label><input class="input" id="x-name" value="${esc(o.name)}"></div>
<div class="field"><label>Tipo de archivo</label><div class="seg" id="x-fmt">${[["png","PNG"],["jpg","JPG"],["webp","WebP"],["pdf","PDF"]].map(([k,l])=>`<button type="button" data-f="${k}">${l}</button>`).join("")}</div></div>
<div class="row"><div class="field"><label for="x-sc">Escala</label><select class="select" id="x-sc">${[[.5,"0,5×"],[1,"1× (tamaño real)"],[1.5,"1,5×"],[2,"2×"],[3,"3×"],[0,"Ancho personalizado"]].map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></div><div class="field"><label for="x-w">Ancho (px)</label><input class="input" id="x-w" type="number" min="64" max="8192"></div></div>
<div class="field" id="x-qf"><label for="x-q">Calidad: <b id="x-qv"></b>%</label><input type="range" id="x-q" min="40" max="100"></div>
<div class="field"><label>Color</label><div class="seg" id="x-mode">${[["color","Color"],["gray","Escala de grises"],["bw","Blanco y negro"]].map(([k,l])=>`<button type="button" data-m="${k}">${l}</button>`).join("")}</div></div>
<div class="row" id="x-bgr"><label class="chk" id="x-tl"><input type="checkbox" id="x-tr"> Fondo transparente (solo PNG/WebP)</label><div class="field"><label for="x-fill">Color de relleno</label><input class="input" type="color" id="x-fill"></div></div>
${many?`<div class="field"><label for="x-wh">Diapositivas</label><select class="select" id="x-wh"><option value="cur">Solo la actual</option><option value="all">Todas (ZIP con una imagen por diapositiva)</option><option value="pdf">Todas en un solo PDF</option></select></div>`:""}
</div></div>`;
  const m=modal("Exportar",html,{ok:"Exportar",wide:true,onOk:async()=>{
    const v=read(),W=Math.round(v.w||ed.W*v.scale),sel=many?m.el.querySelector("#x-wh").value:"cur";
    const t=toast("Exportando…",{ms:600000});
    try{
      const base=(v.name||slug).replace(/[\\/:*?"<>|]+/g,"-").trim()||slug;
      const fmt=sel==="pdf"?"pdf":v.fmt;const oo={...v,fmt};
      const one=async()=>{const cv=await renderCanvas(ed,oo,W);if(fmt==="pdf"){const b=await toBlob(cv,"image/jpeg",v.q/100);return {pdf:{w:cv.width,h:cv.height,pw:cv.width,ph:cv.height,jpg:new Uint8Array(await b.arrayBuffer())}}}return {blob:await toBlob(cv,MIME[fmt],v.q/100)}};
      if(!many||sel==="cur"){const r=await one();save(fmt==="pdf"?pdf([r.pdf]):r.blob,`${base}-${W}x${Math.round(W*ed.H/ed.W)}.${fmt}`)}
      else{const rs=await ed.eachSlide(one);
        if(sel==="pdf")save(pdf(rs.map(r=>r.pdf)),`${base}-carrusel.pdf`);
        else save(await zipBlobs(rs.map((r,i)=>({name:`${base}-${i+1}.${fmt}`,blob:r.blob}))),`${base}-carrusel-${W}px.zip`)}
      try{localStorage.setItem(K,JSON.stringify({...v,name:""}))}catch{}
    }finally{t.close()}
  }});
  const $=s=>m.el.querySelector(s);
  const read=()=>({name:$("#x-name").value,fmt:$("#x-fmt .is-on")?.dataset.f||"png",scale:+$("#x-sc").value,w:+$("#x-sc").value?0:+$("#x-w").value||ed.W,q:+$("#x-q").value,transp:$("#x-tr").checked,fill:$("#x-fill").value,mode:$("#x-mode .is-on")?.dataset.m||"color"});
  const paint=()=>{
    $("#x-fmt").querySelectorAll("button").forEach(b=>b.classList.toggle("is-on",b.dataset.f===o.fmt));
    $("#x-mode").querySelectorAll("button").forEach(b=>b.classList.toggle("is-on",b.dataset.m===o.mode));
    $("#x-sc").value=String(o.w?0:o.scale);$("#x-w").value=o.w||Math.round(ed.W*o.scale);$("#x-w").disabled=!!o.scale&&!o.w&&+$("#x-sc").value!==0;
    $("#x-q").value=o.q;$("#x-qv").textContent=o.q;$("#x-tr").checked=o.transp;$("#x-fill").value=o.fill;
    const lossy=o.fmt!=="png";$("#x-qf").style.display=lossy?"":"none";
    $("#x-tr").disabled=o.fmt==="jpg"||o.fmt==="pdf";$("#x-tl").style.opacity=$("#x-tr").disabled?.5:1;
  };
  let tm;const prev=()=>{clearTimeout(tm);tm=setTimeout(async()=>{try{const v=read(),cv=await renderCanvas(ed,{...v},360),ct=cv.getContext("2d");$("#x-img").src=cv.toDataURL("image/png");$("#x-pv").classList.toggle("is-t",v.transp&&v.fmt!=="jpg"&&v.fmt!=="pdf");const W=v.w||Math.round(ed.W*v.scale);$("#x-info").textContent=`${W} × ${Math.round(W*ed.H/ed.W)} px · ${v.fmt.toUpperCase()}`}catch{}},120)};
  const upd=()=>{const rr=read();delete rr.fmt;delete rr.mode;o={...o,...rr};if(o.fmt==="jpg"||o.fmt==="pdf")o.transp=false;if(+$("#x-sc").value){o.w=0;o.scale=+$("#x-sc").value}else o.w=+$("#x-w").value||ed.W;paint();prev()};
  m.el.addEventListener("click",e=>{const f=e.target.closest("[data-f]"),mo=e.target.closest("[data-m]");if(f){o.fmt=f.dataset.f;if(o.fmt==="jpg"||o.fmt==="pdf")o.transp=false;upd()}if(mo){o.mode=mo.dataset.m;upd()}});
  m.el.addEventListener("input",e=>{if(e.target.id==="x-w"){o.w=+e.target.value;$("#x-sc").value="0";prev();return}if(e.target.id==="x-q")$("#x-qv").textContent=e.target.value;if(e.target.id==="x-name")return;upd()});
  paint();prev();
}
