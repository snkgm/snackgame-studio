import {db} from "../app/db.js?v=20261126v";
import {store} from "../app/store.js?v=20261126v";
import {fmtById} from "../app/formats.js?v=20261126v";
import {composeMulti} from "./compose.js?v=20261126v";
import {fetchProduct,validateGallery,usable,Fatal} from "./gallery.js?v=20261126v";
import {cutoutFor,mattingInfo} from "../img/matting.js?v=20261126v";
const ext=b=>(b.type.split("/")[1]||"jpg").replace("jpeg","jpg");
export const STAGES={pending:"Pendiente",downloading:"Descargando fotografías",removing_bg:"Eliminando fondo",analyzing:"Analizando colores",background:"Generando fondo",composing:"Componiendo imágenes",saving:"Guardando",scheduled:"Programada",error:"Error",cancelled:"Cancelada"};
function limitWarnings(tpl,prod){
  const objs=tpl&&tpl.data?((tpl.data.c||(tpl.data.slides&&tpl.data.slides[0])||{}).objects||[]):[],w=[];
  objs.forEach(o=>{const m=o.rule&&o.rule.maxChars,v=o.field&&prod[o.field];if(m&&v&&String(v).length>m)w.push(`${o.name||o.field}: ${String(v).length}/${m} caracteres`)});
  return w;
}
export const captionOf=(p)=>[p.name,p.tagline,"",[p.hashtag,p.web].filter(Boolean).join(" ")].filter((x,i)=>x||i===2).join("\n").trim();
export async function runItem(item,camp,report=()=>{}){
  await store.load();
  const n=Math.max(1,Math.min(10,camp.images_per_post||2));
  report("downloading");
  const info=await fetchProduct(item.url);
  let photos=item.photos&&item.photos.length?item.photos:null,pool=[];
  if(!photos){pool=usable(await validateGallery(info.images));photos=pool.slice(0,n)}
  else pool=info.images.filter(x=>!photos.some(p=>p.src===x.src));
  if(photos.length<n)throw new Fatal(`Solo ${photos.length} fotografías válidas (se necesitan ${n})`);
  photos=photos.slice(0,n);
  const base=`campaigns/${camp.id}/${item.id}`,blobs=[],origs=[];
  const vars=src=>{const o=[src];for(const w of [2048,1600,1000]){try{const u=new URL(src);u.searchParams.set("width",w);o.push(u.toString())}catch{}}return o};
  const get=async src=>{for(let k=0;k<2;k++){for(const u of vars(src)){try{const r=await fetch(u,{mode:"cors"});if(r.ok)return await r.blob()}catch{}}await new Promise(r=>setTimeout(r,600))}return null};
  const used=new Set(photos.map(p=>p.src));
  for(let i=0;i<n;i++){
    let b=await get(photos[i].src);
    while(!b){const alt=pool.find(x=>!used.has(x.src));if(!alt)throw new Error("Descarga de fotografía fallida (404): "+photos[i].src.split("/").pop().split("?")[0]);used.add(alt.src);photos[i]=alt;b=await get(alt.src)}
    blobs.push(b);origs.push(await db.upload(`${base}/orig-${i+1}.${ext(b)}`,b));
  }
  report("removing_bg");
  const cuts=[],methods=[];
  for(let i=0;i<n;i++){mattingInfo.method="";cuts.push(await cutoutFor(photos[i].src,{blob:blobs[i]}));methods.push(mattingInfo.method||"caché")}
  const key={handle:info.handle,name:item.name};
  const pp=store.presetFor(key);
  const prod={...info.product,...store.catPreset(camp.category_id),...(pp?pp.fields:{}),name:item.name,image:photos[0].src};
  if(item.subtitle)prod.tagline=item.subtitle;
  const names={type:store.typeName(camp.type_id),cat:store.catName(camp.category_id)};
  const fmts=camp.formats&&camp.formats.length?camp.formats:["post-3x4"],group=crypto.randomUUID();
  const out=[],warnings=[],finals={},thumbs={},tpls={};let bgUrl=null;
  for(const fmt of fmts){
    const tid=(camp.templates&&camp.templates[fmt])||(store.resolveTemplate(camp.type_id,camp.category_id,fmt)||{}).id||null;
    const tpl=tid?await db.get("templates",tid):null;
    const tplData=tpl&&tpl.data&&(tpl.data.c||tpl.data.slides)?tpl.data:null;
    const bgOverride=(pp&&pp.bg)||((!tplData||!tplData.cfg||!tplData.cfg.bg)?{mode:"auto",n:2,sat:35,light:55,edge:30,tex:5}:undefined);
    const r=await composeMulti({tplData,fmtId:fmt,product:prod,names,cutUrls:cuts,origs,bgOverride,onStage:report});
    report("saving");
    warnings.push(...limitWarnings(tpl,prod),...r.warnings.map(x=>`${x}: el texto no cabe`));
    finals[fmt]=[];
    for(let i=0;i<r.finals.length;i++)finals[fmt].push(await db.upload(`${base}/${fmt}-final-${i+1}.jpg`,r.finals[i]));
    if(r.bgBlob&&!bgUrl)bgUrl=await db.upload(`${base}/fondo.jpg`,r.bgBlob);
    thumbs[fmt]=await db.upload(`thumbs/c-${item.id}-${fmt}.jpg`,r.thumb);tpls[fmt]=tid;
    out.push({fmt,r});
  }
  await fetch(`${db.REST}posts?item_id=eq.${item.id}`,{method:"DELETE",headers:db.H});
  const ids=[];
  for(const {fmt,r} of out){
    const f=fmtById(fmt);
    const row=await db.insert("posts",{title:fmts.length>1?`${item.name} · ${f.short}`:item.name,status:"scheduled",scheduled_at:item.scheduled_at||null,type_id:camp.type_id,category_id:camp.category_id,template_id:tpls[fmt],format:fmt,group_id:fmts.length>1?group:null,data:r.data,product:r.product,thumb_url:thumbs[fmt],campaign_id:camp.id,item_id:item.id,product_id:info.handle,caption:captionOf(prod),assets:{originals:origs,cuts,methods,bg:bgUrl,finals:finals[fmt],order:finals[fmt].map((_,i)=>i+1),template_id:tpls[fmt],photos:photos.map(p=>p.src),meta:{prepared:true,published:false}}});
    ids.push(row.id);
  }
  return {post_ids:ids,warnings,product:{...info.product,handle:info.handle,warnings,methods}};
}
