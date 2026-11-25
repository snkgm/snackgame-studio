import {withHeadless} from "./headless.js?v=20261126f";
import {buildSkeleton} from "./skeleton.js?v=20261126f";
import {fmtById} from "../app/formats.js?v=20261126f";
import {cutoutFor} from "../img/matting.js?v=20261126f";
import {extractPalette} from "../img/color.js?v=20261126f";
const loadImg=u=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=()=>rej(new Error("No se pudo cargar la imagen del producto"));i.src=u});
export async function composePost({tplData,fmtId,product,names,blob,onProgress,cutUrl,bgOverride}){
  const fmt=fmtById(fmtId);
  const data=tplData||await buildSkeleton(fmtId,names);
  return withHeadless(async ed=>{
    await ed.loadData(JSON.parse(JSON.stringify(data)),fmt);
    ed.product={...(product||{})};
    if(bgOverride)ed.cfg.bg={...ed.bgCfg,...bgOverride};
    const orig=product&&product.image;let prodUrl=null,palette=null;
    if(orig){
      const rm=!ed.cfg.product||ed.cfg.product.removeBg!==false;
      prodUrl=cutUrl||(rm?await cutoutFor(orig,{blob,onProgress}):orig);
      palette=extractPalette(await loadImg(prodUrl));
    }
    const n=ed.slides?ed.slides.length:1;
    for(let i=0;i<n;i++){
      if(i>0)await ed.gotoSlide(i);
      if(prodUrl&&(ed.productLayer()||!ed.slides))await ed.setProductImage(prodUrl,{orig});
      if(palette)ed.palette=palette;
      if(ed.cfg.bg&&(ed.cfg.bg.mode==="auto"||bgOverride))await ed.applyBg();else ed.applyColorRules();
      ed.applyFields();
    }
    if(ed.slides)await ed.gotoSlide(0);
    const thumb=await ed.thumbBlob();
    return {data:ed.toData(),product:ed.product,thumb,cutUrl:prodUrl};
  });
}
export async function composeMulti({tplData,fmtId,product,names,cutUrls,origs,bgOverride,onStage}){
  const fmt={...fmtById(fmtId)};
  let base=tplData||await buildSkeleton(fmtId,names);
  const c0=base.slides&&base.slides.length?base.slides[0]:base.c,multi=cutUrls.length>1;
  base={...base,c:multi?undefined:c0,slides:multi?[c0]:undefined};
  if(multi)fmt.slides=true;
  return withHeadless(async ed=>{
    await ed.loadData(JSON.parse(JSON.stringify(base)),fmt);
    ed.product={...(product||{})};
    if(bgOverride)ed.cfg.bg={...ed.bgCfg,...bgOverride};
    onStage?.("analyzing");
    ed.palette=extractPalette(await loadImg(cutUrls[0]));
    onStage?.("background");
    await ed.setProductImage(cutUrls[0],{orig:origs&&origs[0]});
    if(ed.cfg.bg&&(ed.cfg.bg.mode==="auto"||bgOverride))await ed.applyBg();else ed.applyColorRules();
    ed.applyFields();
    onStage?.("composing");
    const warnings=ed.fitReport();
    let bgBlob=null;
    try{const b=ed.bgLayer();if(b)bgBlob=await (await fetch(b.toDataURL({format:"jpeg",quality:.85}))).blob()}catch{}
    for(let i=1;i<cutUrls.length;i++){await ed.newSlide(true);await ed.setProductImage(cutUrls[i],{orig:origs&&origs[i]})}
    if(ed.slides)await ed.gotoSlide(0);
    const finals=(await ed.exportAll("jpg")).map(s=>s.blob);
    const thumb=await ed.thumbBlob();
    return {data:ed.toData(),product:ed.product,thumb,finals,bgBlob,warnings};
  });
}
