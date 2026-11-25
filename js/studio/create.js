import {db} from "../app/db.js?v=20261125f";
import {store} from "../app/store.js?v=20261125f";
import {fmtById} from "../app/formats.js?v=20261125f";
import {composePost} from "./compose.js?v=20261125f";
import {uploadOriginal} from "../img/matting.js?v=20261125f";
export async function createVariants({title,typeId,catId,items,product,blob,when,onStep,status="draft"}){
  const group=crypto.randomUUID();let prod={...(product||{})};const pp=store.presetFor(prod);prod={...prod,...store.catPreset(catId),...(pp?pp.fields:{})};
  if(blob){onStep?.("Subiendo imagen…");prod.image=await uploadOriginal(blob)}
  const names={type:store.typeName(typeId),cat:store.catName(catId)};
  const rows=[];let cut;
  for(let i=0;i<items.length;i++){
    const {fmt,tplId}=items[i],f=fmtById(fmt);
    onStep?.(`Componiendo ${f.short} (${i+1}/${items.length})…`);
    const tpl=tplId?await db.get("templates",tplId):null;
    const r=await composePost({tplData:tpl&&tpl.data&&(tpl.data.c||tpl.data.slides)?tpl.data:null,fmtId:fmt,product:prod,names,blob:i===0?blob:undefined,onProgress:onStep,cutUrl:cut,bgOverride:pp&&pp.bg||undefined});
    cut=r.cutUrl||cut;
    const id=crypto.randomUUID();let thumb=null;
    try{thumb=await db.upload(`thumbs/${id}.jpg`,r.thumb)}catch{}
    rows.push(await store.createPost({id,title:items.length>1?`${title} · ${f.short}`:title,type_id:typeId||null,category_id:catId||null,template_id:tplId||null,format:fmt,group_id:items.length>1?group:null,scheduled_at:when||null,status:when&&status==="scheduled"?"scheduled":"draft",data:r.data,product:r.product,thumb_url:thumb}));
  }
  return rows;
}
