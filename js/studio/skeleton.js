import {withHeadless} from "./headless.js?v=20261123e";
import {fmtById} from "../app/formats.js?v=20261123e";
import {BG_DEFAULT} from "../img/background.js?v=20261123e";
import {logoUrl} from "../app/brand.js?v=20261123e";
const R=(o,rule)=>{o.set("rule",rule);return o};
export function safeOf(fmt,cfg){return {...fmtById(fmt).safe,...((cfg&&cfg.safe)||{})}}
async function slideContent(ed,kind,f,s,names){
  const W=ed.W,H=ed.H,mx=s.l,top=s.t,bot=H-s.b;
  const tw=W-mx*2;
  if(kind!=="cta"){
    if(names.type)ed.addText({text:names.type.toUpperCase(),name:"Etiqueta tipo",top:top+Math.round(H*.04),props:{width:tw,fontSize:34,fontWeight:600,charSpacing:300,fill:"#ffb400"}}).set("rule",{color:"accent"});
  }
  if(kind==="main"||kind==="cover"){
    const o=ed.addText({text:"Nombre del producto",name:"Título",field:"name",top:top+Math.round(H*.04)+(names.type?64:0),props:{width:tw,fontSize:f.title,fontWeight:800}});R(o,{fit:true,max:f.title,maxH:f.titleH,color:"contrast"});
    ed.addText({text:"Nº 000",name:"Número",field:"number",top:Math.round(bot-H*.17),props:{width:tw,fontSize:46,fontWeight:700}}).set({pattern:"Nº {valor}",rule:{color:"accent"}});
  }
  if(kind==="detail"){
    ed.addText({text:"Nombre del producto",name:"Título",field:"name",top:top+Math.round(H*.05),props:{width:tw,fontSize:56,fontWeight:700}}).set("rule",{fit:true,max:56,maxH:140,color:"contrast"});
    ed.addText({text:"00,00 €",name:"Precio",field:"price",top:Math.round(bot-H*.2),props:{width:tw,fontSize:96,fontWeight:800}}).set("rule",{color:"accent"});
  }
  if(kind==="cta"){
    ed.addText({text:"Ya disponible en tienda",name:"Llamada",top:Math.round(H*.36),props:{width:tw,fontSize:84,fontWeight:800}}).set("rule",{fit:true,max:84,maxH:300,color:"contrast"});
  }
  const lu=await logoUrl().catch(()=>null);
  const by=bot-Math.round(H*.07);
  if(lu){const l=await ed.addImage(lu,{role:"logo",name:"Logotipo",maxFrac:kind==="cta"?.3:.14});ed.setXY(l,mx,by-l.getScaledHeight()/2)}
  const w=ed.addText({text:"snackgame.es",name:"Dirección web",role:"web",field:"web",top:by-20,props:{width:lu&&kind!=="cta"?Math.round(tw*.5):tw,fontSize:36,fontWeight:600,textAlign:lu&&kind!=="cta"?"right":"center"}});
  w.set("rule",{color:"contrast"});if(lu&&kind!=="cta")ed.setXY(w,W-mx-w.getScaledWidth(),by-20);
}
const PROD={"post-4x5":{cy:.53,maxW:.82,maxH:.5},"post-1x1":{cy:.54,maxW:.7,maxH:.5},"story-9x16":{cy:.5,maxW:.84,maxH:.4},"carousel-4x5":{cy:.53,maxW:.82,maxH:.5},"reel-cover":{cy:.5,maxW:.84,maxH:.38}};
export async function buildSkeleton(fmtId,names={}){
  const fmt=fmtById(fmtId);
  return withHeadless(async ed=>{
    const s=safeOf(fmtId);
    const f={title:fmtId==="post-1x1"?72:fmtId==="story-9x16"||fmtId==="reel-cover"?92:80,titleH:fmtId==="post-1x1"?170:fmtId==="story-9x16"||fmtId==="reel-cover"?300:230};
    await ed.loadData(null,fmt);
    ed.cfg={bg:{...BG_DEFAULT},product:{removeBg:true},safe:{...s}};
    ed.palette=["#3b2f8f","#8f2f6a","#ffb400"];
    const plan=fmt.slides?[["cover",PROD[fmtId]],["detail",{...PROD[fmtId],maxW:.9,maxH:.52,cy:.5}],["cta",null]]:[["main",PROD[fmtId]]];
    for(let i=0;i<plan.length;i++){
      if(i>0){ed.slides[ed.cur]=ed.canvas.toObject(["name","locked","role","field","pattern","rule","orig"]);ed.slides.push({version:"6",objects:[]});await ed.gotoSlideRaw(i)}
      await ed.applyBg();
      await slideContent(ed,plan[i][0],f,s,names);
      if(plan[i][1]){
        const c=document.createElement("canvas");c.width=400;c.height=520;const x=c.getContext("2d");
        const g=x.createLinearGradient(0,0,0,520);g.addColorStop(0,"#ffffff");g.addColorStop(1,"#cfcfe0");x.fillStyle=g;x.beginPath();x.roundRect(40,10,320,500,48);x.fill();
        const o=await ed.setProductImage(c.toDataURL("image/png"),{place:false});
        o.set("rule",{...ed.ruleOf(o),...plan[i][1],shadow:true});ed.placeProduct(o);o.set("name","Producto (ejemplo)");
      }
    }
    return ed.toData();
  });
}
