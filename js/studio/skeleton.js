import {withHeadless} from "./headless.js?v=20261125z";
import {fmtById} from "../app/formats.js?v=20261125z";
import {BG_DEFAULT} from "../img/background.js?v=20261125z";
import {FLOOR_DEFAULT} from "../img/fx.js?v=20261125z";
import {logoUrl} from "../app/brand.js?v=20261125z";
const R=(o,rule)=>{o.set("rule",rule);return o};
export function safeOf(fmt,cfg){return {...fmtById(fmt).safe,...((cfg&&cfg.safe)||{})}}
async function slideContent(ed,kind,f,s,names){
  const W=ed.W,H=ed.H,mx=s.l,top=s.t,bot=H-s.b,tw=W-mx*2,sc=H>1500?1.15:1;
  const ht=ed.addText({text:"#Hashtag",name:"Hashtag",field:"hashtag",top:top+Math.round(H*.045),props:{width:tw,fontSize:Math.round(32*sc),fontWeight:700,fontFamily:"Montserrat"}});ht.set("rule",{color:"contrast"});
  if(kind==="main"||kind==="cover"||kind==="detail"){
    const big=kind==="detail"?96:f.title;
    ed.addText({text:"NOMBRE",name:"Título",field:"name",top:top+Math.round(H*.045)+Math.round(52*sc),props:{width:tw,fontSize:big,fontWeight:400,fontFamily:"Anton",lineHeight:.95}}).set("rule",{fit:true,max:big,maxH:kind==="detail"?120:f.titleH,upper:true,color:"contrast"});
    if(kind!=="detail")ed.addText({text:"Frase del producto",name:"Frase",field:"tagline",top:top+Math.round(H*.045)+Math.round(52*sc)+f.titleH+8,props:{width:tw,fontSize:Math.round(44*sc),fontWeight:700,fontFamily:"Montserrat",fontStyle:"italic"}}).set("rule",{color:"accent"});
  }
  if(kind==="detail"){
    ed.addText({text:"00,00 €",name:"Precio",field:"price",top:Math.round(bot-H*.24),props:{width:tw,fontSize:110,fontWeight:400,fontFamily:"Anton"}}).set("rule",{color:"accent"});
    ed.addText({text:"Descripción breve",name:"Descripción",field:"desc",top:Math.round(bot-H*.135),props:{width:tw,fontSize:36,fontWeight:600,fontFamily:"Montserrat"}}).set("rule",{fit:true,max:36,maxH:110,color:"contrast"});
  }
  if(kind==="cta")ed.addText({text:"YA DISPONIBLE EN TIENDA",name:"Llamada",top:Math.round(H*.36),props:{width:tw,fontSize:120,fontWeight:400,fontFamily:"Anton",lineHeight:.95}}).set("rule",{fit:true,max:120,maxH:340,color:"contrast"});
  const lu=kind==="cta"?await logoUrl().catch(()=>null):null;
  if(lu){const l=await ed.addImage(lu,{role:"logo",name:"Logotipo",maxFrac:.3});ed.setXY(l,(W-l.getScaledWidth())/2,Math.round(H*.2))}
  const w=ed.addText({text:"Snackgame.es",name:"Dirección web",role:"web",field:"web",top:bot-Math.round(H*.07),props:{width:tw,fontSize:Math.round(42*sc),fontWeight:400,fontFamily:"Anton"}});
  w.set({rule:{color:"contrast"},shadow:null});
}
const PROD={"post-3x4":{cy:.6,maxW:.9,maxH:.6},"post-4x5":{cy:.63,maxW:.9,maxH:.56},"post-1x1":{cy:.6,maxW:.8,maxH:.56},"story-9x16":{cy:.56,maxW:.9,maxH:.44},"carousel-4x5":{cy:.63,maxW:.9,maxH:.56},"reel-cover":{cy:.56,maxW:.9,maxH:.42}};
export async function buildSkeleton(fmtId,names={}){
  const fmt=fmtById(fmtId);
  return withHeadless(async ed=>{
    const s=safeOf(fmtId);
    const f={title:fmtId==="post-3x4"?200:fmtId==="post-1x1"?130:fmtId==="story-9x16"||fmtId==="reel-cover"?170:150,titleH:fmtId==="post-3x4"?300:fmtId==="post-1x1"?150:fmtId==="story-9x16"||fmtId==="reel-cover"?330:210};
    await ed.loadData(null,fmt);ed.tplMode=true;
    ed.cfg={bg:{...BG_DEFAULT},product:{removeBg:true},safe:{...s},msym:{h:true,v:true},mshow:1};
    ed.palette=["#3b2f8f","#8f2f6a","#ffb400"];
    const plan=fmt.slides?[["cover",PROD[fmtId]],["detail",{...PROD[fmtId],maxW:.9,maxH:.5,cy:.5}],["cta",null]]:[["main",PROD[fmtId]]];
    for(let i=0;i<plan.length;i++){
      if(i>0){ed.slides[ed.cur]=ed.canvas.toObject(["name","locked","role","field","pattern","rule","orig"]);ed.slides.push({version:"6",objects:[]});await ed.gotoSlideRaw(i)}
      await ed.applyBg();
      await slideContent(ed,plan[i][0],f,s,names);
      if(plan[i][1]){
        const c=document.createElement("canvas");c.width=400;c.height=520;const x=c.getContext("2d");
        const g=x.createLinearGradient(0,0,0,520);g.addColorStop(0,"#ffffff");g.addColorStop(1,"#cfcfe0");x.fillStyle=g;x.beginPath();x.roundRect(40,10,320,500,48);x.fill();
        const o=await ed.setProductImage(c.toDataURL("image/png"),{place:false});
        o.set("rule",{...ed.ruleOf(o),...plan[i][1],shadow:false,floor:{...FLOOR_DEFAULT,blur:42}});ed.placeProduct(o);o.set("name","Producto (ejemplo)");
      }
    }
    return ed.toData();
  });
}

export async function buildBlank(fmtId){
  const fmt=fmtById(fmtId);
  return withHeadless(async ed=>{
    await ed.loadData(null,fmt);ed.tplMode=true;
    ed.cfg={bg:{...BG_DEFAULT,mode:"solid",solid:"#ffffff"},product:{removeBg:true},safe:{...ed.cfg.safe},msym:{h:true,v:true},mshow:1,mlock:1};
    ed.palette=[];ed.canvas.backgroundColor="#ffffff";
    await ed.applyBg();
    return ed.toData();
  });
}
