import {Canvas,Rect,Circle,Ellipse,Triangle,Polygon,Line,FabricObject,Textbox,FabricImage,Point,Shadow,filters as FX} from "../../vendor/fabric.min.mjs?v=20261124p";
import {bgDataUrl,bgColors,BG_DEFAULT} from "../img/background.js?v=20261124p";
import {loadSnap,snapMove,snapResize} from "./snap.js?v=20261124p";
import {renderOverlay,overlayById} from "../img/overlays.js?v=20261124p";
import {renderBgFx,fxActive,renderFloorShadow,FLOOR_DEFAULT} from "../img/fx.js?v=20261124p";
import {contrastText,shade,lumOf,rgbToHex} from "../img/color.js?v=20261124p";
const PROPS=["name","locked","role","field","pattern","rule","orig","gen","globalCompositeOperation"];
const PLACE="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAIA";
export const BLENDS=[["source-over","Normal"],["multiply","Multiplicar"],["screen","Trama"],["overlay","Superponer"],["soft-light","Luz suave"],["hard-light","Luz fuerte"],["darken","Oscurecer"],["lighten","Aclarar"],["color-dodge","Sobreexponer color"],["color-burn","Subexponer color"]];
const _toObj=FabricImage.prototype.toObject;FabricImage.prototype.toObject=function(p){const j=_toObj.call(this,p);if(this.gen)j.src=PLACE;return j};
const BLOBS=new Map();
async function genUrl(k,s){const key=k+":"+s;if(BLOBS.has(key))return BLOBS.get(key);const c=renderOverlay(k,1080,1440,s);const u=URL.createObjectURL(await new Promise(r=>c.toBlob(r,"image/png")));BLOBS.set(key,u);return u}
const DERIVED=["bgfx","floorshadow"];
export const FIELDS={name:"Nombre del producto",number:"Número",collection:"Colección",price:"Precio",category:"Categoría",web:"snackgame.es",hashtag:"#Hashtag",tagline:"Frase del producto",desc:"Descripción breve"};
FabricObject.customProperties=PROPS;
const PAD=48,MAX_HIST=50;
export class Editor{
  constructor(canvasEl,stageEl,boxEl){
    this.stage=stageEl;this.box=boxEl;this.W=1080;this.H=1350;this.scale=1;
    this.listeners={};this.hist=[];this.hi=-1;this.busy=false;this.counter={};
    this.canvas=new Canvas(canvasEl,{width:this.W,height:this.H,backgroundColor:"#ffffff",preserveObjectStacking:true,selection:true,renderOnAddRemove:true});
    FabricObject.prototype.set({transparentCorners:false,cornerStyle:"circle",cornerColor:"#ffffff",cornerStrokeColor:"#ff3d9a",borderColor:"#ffb400",cornerSize:18,touchCornerSize:32,borderScaleFactor:3,padding:2});
    this.snapCfg=loadSnap();this.initSelectionFx();
    this.bgSel=false;this.product={};this.cfg={};this.palette=[];this.slides=null;this.cur=0;
    ["selection:created","selection:updated"].forEach(e=>this.canvas.on(e,()=>{this.bgSel=false}));
    ["object:added","object:removed","object:modified","selection:created","selection:updated","selection:cleared","text:changed"].forEach(e=>this.canvas.on(e,ev=>{if(this._derived||(ev&&ev.target&&DERIVED.includes(ev.target.role)))return;this.emit("change")}));
    ["object:added","object:removed","object:modified"].forEach(e=>this.canvas.on(e,ev=>{if(this._derived||(ev&&ev.target&&DERIVED.includes(ev.target.role)))return;this.snap()}));
    ["object:moving","object:scaling","object:rotating","object:modified"].forEach(e=>this.canvas.on(e,ev=>{if(ev.target&&ev.target.role==="product")this.applyFloorShadow()}));
    this.ro=new ResizeObserver(()=>this.fit());this.ro.observe(stageEl);
    this.fit();this.snap(true);
    this.canvas.on("object:moving",e=>this.snapMove(e.target,e.e));["object:scaling","object:resizing"].forEach(n=>this.canvas.on(n,e=>snapResize(this,e)));this.canvas.on("object:added",e=>this.styleControls(e.target));
    this.canvas.on("mouse:up",()=>this.setGuides([]));
  }
  margins(){const f=this.fmt&&this.fmt.safe||{};const c=this.cfg.safe||{};return {t:c.t??f.t??0,b:c.b??f.b??0,l:c.l??f.l??48,r:c.r??f.r??48}}
  setGuides(g){const a=JSON.stringify(g);if(a===this._g)return;this._g=a;this.emit("guides",g)}
  snapMove(o,ev){snapMove(this,o,ev)}
  destroy(){clearInterval(this._fx);this.ro.disconnect();this.listeners={};this.canvas.dispose()}
  toData(){
    const o={W:this.W,H:this.H,v:3,cfg:this.cfg,palette:this.palette};
    if(this.slides){this.slides[this.cur]=this.canvas.toObject(PROPS);o.slides=this.slides.slice()}else o.c=this.canvas.toObject(PROPS);
    return o;
  }
  async loadData(d,fmt){
    this.busy=true;
    if(d&&d.W){this.W=d.W;this.H=d.H}else if(fmt){this.W=fmt.w;this.H=fmt.h}
    this.fmt=fmt||this.fmt;this.cfg=d&&d.cfg?JSON.parse(JSON.stringify(d.cfg)):{};this.palette=(d&&d.palette)||[];
    this.slides=d&&d.slides&&d.slides.length?d.slides.slice():(fmt&&fmt.slides?[null]:null);this.cur=0;
    const c0=this.slides?this.slides[0]:d&&d.c;
    if(c0)await this.canvas.loadFromJSON(c0);
    if(this.slides&&!this.slides[0])this.slides[0]=this.canvas.toObject(PROPS);
    this.canvas.getObjects().forEach(o=>{if(o.locked)o.set({selectable:false,evented:false})});
    this.counter={};this.applyFields();this.canvas.getObjects().forEach(o=>{const m=/^(.*) (\d+)$/.exec(o.name||"");if(m)this.counter[m[1]]=Math.max(this.counter[m[1]]||0,+m[2])});
    await this.rebuild();
    this.busy=false;this.hist=[];this.hi=-1;this.fit();this.snap(true);this.emit("change");this.emit("format");
  }
  shot(format,quality,outW){
    const c=this.canvas,z=c.getZoom(),w=c.getWidth(),h=c.getHeight();
    c.setDimensions({width:this.W,height:this.H});c.setZoom(1);
    try{return c.toDataURL({format,quality,multiplier:outW/this.W,left:0,top:0,width:this.W,height:this.H,enableRetinaScaling:false})}
    finally{c.setDimensions({width:w,height:h});c.setZoom(z);c.requestRenderAll()}
  }
  async exportBlob(type="png",quality=.92){
    this.canvas.discardActiveObject();this.canvas.requestRenderAll();
    return (await fetch(this.shot(type==="jpg"?"jpeg":"png",quality,this.W))).blob();
  }
  async thumbBlob(w=360){return (await fetch(this.shot("jpeg",.72,w))).blob()}
  on(e,f){(this.listeners[e]??=[]).push(f)}
  emit(e,d){(this.listeners[e]||[]).forEach(f=>f(d))}
  async setFormat(w,h){this.W=w;this.H=h;this.fit();await this.applyBg();this.applyBgFx();this.applyFloorShadow();this.snap();this.emit("change")}
  fit(){
    const r=this.stage.getBoundingClientRect();
    const pb=parseFloat(getComputedStyle(this.stage).paddingBottom)||0;
    const s=Math.max(.05,Math.min((r.width-PAD*2)/this.W,(r.height-pb-PAD*2)/this.H));
    this.scale=s;
    this.canvas.setDimensions({width:Math.round(this.W*s),height:Math.round(this.H*s)});
    this.canvas.setZoom(s);this.canvas.calcOffset();this.canvas.requestRenderAll();
    this.emit("zoom",s);
  }
  setBg(c){this.canvas.backgroundColor=c;this.canvas.requestRenderAll();this.snap();this.emit("change")}
  get bg(){return this.canvas.backgroundColor||"#ffffff"}
  nextName(base){this.counter[base]=(this.counter[base]||0)+1;return `${base} ${this.counter[base]}`}
  place(o,base,role="shape"){
    o.set({name:this.nextName(base),role,originX:"left",originY:"top"});
    this.canvas.add(o);
    o.set({left:(this.W-o.getScaledWidth())/2,top:(this.H-o.getScaledHeight())/2});o.setCoords();
    this.canvas.setActiveObject(o);this.canvas.requestRenderAll();return o;
  }
  addText(opt={}){
    const t=new Textbox(opt.text||"Texto",{width:Math.round(this.W*.8),fontFamily:"Montserrat",fontWeight:700,fontSize:72,fill:"#ffffff",textAlign:"center",lineHeight:1,charSpacing:0,field:opt.field||null,pattern:"{valor}",...(opt.props||{})});
    const o=this.place(t,opt.name||"Texto",opt.role||"text");
    if(opt.top!=null)o.set({top:opt.top});
    if(opt.field)this.applyFields();
    this.canvas.requestRenderAll();this.snap();this.emit("change");return o;
  }
  async addImage(url,{role="decor",name="Imagen",maxFrac=.4}={}){
    const img=await FabricImage.fromURL(url,{crossOrigin:"anonymous"});
    const k=Math.min(1,(this.W*maxFrac)/img.width,(this.H*maxFrac)/img.height);img.set({scaleX:k,scaleY:k});
    const o=this.place(img,name,role);this.snap();this.emit("change");return o;
  }
  applyFields(){
    const p={web:"snackgame.es",...this.product};
    this.canvas.getObjects().forEach(o=>{
      if(!o.field||o.type.toLowerCase()!=="textbox")return;
      const v=(p[o.field]??"").toString().trim();
      let t=v?(o.pattern||"{valor}").replace("{valor}",v):(this.tplMode?FIELDS[o.field]||"":"");if(o.rule&&o.rule.upper)t=t.toUpperCase();o.set("text",t);
    });
    this.canvas.getObjects().forEach(o=>this.fitText(o));
    this.canvas.requestRenderAll();
  }
  setProduct(patch){Object.assign(this.product,patch);this.applyFields();this.snap();this.emit("change")}
  selectBackground(){this.canvas.discardActiveObject();this.bgSel=true;this.canvas.requestRenderAll();this.emit("change")}
  commit(){this.applyFloorShadow();this.canvas.requestRenderAll();this.snap();this.emit("change")}
  xy(o){const p=o.getPointByOrigin("left","top");return{x:p.x,y:p.y}}
  setXY(o,x,y){o.setPositionByOrigin(new Point(x,y),"left","top");o.setCoords()}
  align(k){
    const o=this.active;if(!o)return;const c=o.getCoords(),m=this.margins();
    const xs=c.map(p=>p.x),ys=c.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    let dx=0,dy=0;
    if(k==="left")dx=m.l-x0;if(k==="hcenter")dx=this.W/2-(x0+x1)/2;if(k==="right")dx=this.W-m.r-x1;
    if(k==="top")dy=m.t-y0;if(k==="vcenter")dy=this.H/2-(y0+y1)/2;if(k==="bottom")dy=this.H-m.b-y1;
    o.set({left:o.left+dx,top:o.top+dy});o.setCoords();this.commit();
  }
  getFx(o){const f=(o.filters||[]),g=n=>f.find(x=>x.type===n);return {bright:g("Brightness")?Math.round(g("Brightness").brightness*100):0,contrast:g("Contrast")?Math.round(g("Contrast").contrast*100):0,sat:g("Saturation")?Math.round(g("Saturation").saturation*100):0,blur:g("Blur")?Math.round(g("Blur").blur*100):0}}
  setFx(o,patch){
    const v={...this.getFx(o),...patch},f=[];
    if(v.bright)f.push(new FX.Brightness({brightness:v.bright/100}));
    if(v.contrast)f.push(new FX.Contrast({contrast:v.contrast/100}));
    if(v.sat)f.push(new FX.Saturation({saturation:v.sat/100}));
    if(v.blur)f.push(new FX.Blur({blur:v.blur/100}));
    o.set("filters",f);o.applyFilters();this.canvas.requestRenderAll();
  }
  initSelectionFx(){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    let t=0;const c1=[255,180,0],c2=[255,61,154];
    this._fx=setInterval(()=>{const o=this.canvas.getActiveObject();if(!o||document.hidden)return;t=(t+1)%36;const k=(Math.sin(t/36*Math.PI*2)+1)/2;
      o.set("borderColor",`rgb(${c1.map((v,i)=>Math.round(v+(c2[i]-v)*k)).join(",")})`);this.canvas.requestRenderAll()},90);
  }
  styleControls(o){
    if(o&&o.set&&!o.__sgs){o.__sgs=1;o.set({transparentCorners:false,cornerStyle:"circle",cornerColor:"#ffffff",cornerStrokeColor:"#ff3d9a",borderColor:"#ffb400",cornerSize:18,touchCornerSize:32,borderScaleFactor:3,padding:2})}
    const m=o&&o.controls&&o.controls.mtr;if(!m||m.__sg)return;m.__sg=1;
    const svg=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="white" stroke="#1a1300" stroke-width="1.5"/><path d="M17 12a5 5 0 1 1-1.6-3.7M17 6v3h-3" fill="none" stroke="#1a1300" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    m.cursorStyleHandler=()=>`url("data:image/svg+xml,${svg}") 14 14, grab`;
    m.offsetY=-36;m.withConnection=true;m.sizeX=m.sizeY=30;
    m.render=(ctx,left,top)=>{ctx.save();ctx.translate(left,top);ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fillStyle="#ffffff";ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle="#ffb400";ctx.stroke();ctx.beginPath();ctx.arc(0,0,6.5,-0.4,Math.PI*1.45);ctx.lineWidth=2.4;ctx.strokeStyle="#1a1300";ctx.lineCap="round";ctx.stroke();ctx.beginPath();ctx.moveTo(5.2,-6.6);ctx.lineTo(7.8,-2.2);ctx.lineTo(2.4,-2.6);ctx.closePath();ctx.fillStyle="#1a1300";ctx.fill();ctx.restore()};
  }
  async addOverlay(id,{seed=Math.floor(Math.random()*9000)+1}={}){
    const d=overlayById(id);if(!d)return;const url=await genUrl(id,seed);
    const img=await FabricImage.fromURL(url,{crossOrigin:"anonymous"});
    const k=Math.max(this.W/img.width,this.H/img.height);
    img.set({scaleX:k,scaleY:k,left:(this.W-img.width*k)/2,top:(this.H-img.height*k)/2,originX:"left",originY:"top",name:d.name,role:"overlay",gen:{k:id,s:seed},globalCompositeOperation:d.blend,opacity:d.opacity});
    img.set("name",this.nextName(d.name));this.canvas.add(img);this.canvas.setActiveObject(img);img.setCoords();this.canvas.requestRenderAll();this.snap();this.emit("change");return img;
  }
  async addOverlayImage(url,name="Overlay"){
    const img=await FabricImage.fromURL(url,{crossOrigin:"anonymous"});
    const k=Math.max(this.W/img.width,this.H/img.height);
    img.set({scaleX:k,scaleY:k,left:(this.W-img.width*k)/2,top:(this.H-img.height*k)/2,originX:"left",originY:"top",name:this.nextName(name),role:"overlay",globalCompositeOperation:"source-over",opacity:1});
    this.canvas.add(img);this.canvas.setActiveObject(img);img.setCoords();this.canvas.requestRenderAll();this.snap();this.emit("change");return img;
  }
  async reseedOverlay(o){if(!o||!o.gen)return;const s=Math.floor(Math.random()*9000)+1,el=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;genUrl(o.gen.k,s).then(u=>i.src=u)});o.set("gen",{k:o.gen.k,s});o.setElement(el);o.dirty=true;this.canvas.requestRenderAll();this.commit()}
  setBlend(o,mode){o.set("globalCompositeOperation",mode);o.dirty=true;this.canvas.requestRenderAll()}
  async regenGen(){
    for(const o of this.canvas.getObjects()){
      if(!o.gen||o.type.toLowerCase()!=="image")continue;
      const u=await genUrl(o.gen.k,o.gen.s),el=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u});
      o.setElement(el);o.dirty=true;
    }
  }
  applyBgFx(){
    const f=this.cfg.bgfx,c=fxActive(f)?renderBgFx(this.W,this.H,f):null;
    let o=this.canvas.getObjects().find(x=>x.role==="bgfx");
    this._derived=true;
    try{
      if(!c){if(o)this.canvas.remove(o)}
      else if(o){o.setElement(c);o.set({width:c.width,height:c.height,left:0,top:0});o.dirty=true;o.setCoords()}
      else{const img=new FabricImage(c,{left:0,top:0,originX:"left",originY:"top",selectable:false,evented:false,excludeFromExport:true,role:"bgfx",name:"Efectos de fondo",hoverCursor:"default"});const bg=this.bgLayer(),i=bg?this.canvas.getObjects().indexOf(bg)+1:0;this.canvas.insertAt(i,img)}
    }finally{this._derived=false}
    this.canvas.requestRenderAll();
  }
  floorOf(o){return {...FLOOR_DEFAULT,...((o&&o.rule&&o.rule.floor)||{})}}
  applyFloorShadow(){
    const p=this.productLayer();let sh=this.canvas.getObjects().find(x=>x.role==="floorshadow");
    const rf=p&&p.rule&&p.rule.floor,el=p&&p.getElement&&p.getElement();
    this._derived=true;
    try{
      if(!p||!rf||rf.on===false||!el||p.visible===false){if(sh)this.canvas.remove(sh);return}
      const q=p.getCoords(),xs=q.map(a=>a.x),ys=q.map(a=>a.y),x=Math.min(...xs),y=Math.min(...ys);
      const r=renderFloorShadow(el,{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y},this.floorOf(p));
      if(!r){if(sh)this.canvas.remove(sh);return}
      if(sh){sh.setElement(r.canvas);sh.set({width:r.canvas.width,height:r.canvas.height,left:r.left,top:r.top});sh.dirty=true;sh.setCoords()}
      else{sh=new FabricImage(r.canvas,{left:r.left,top:r.top,originX:"left",originY:"top",selectable:false,evented:false,excludeFromExport:true,role:"floorshadow",name:"Sombra de suelo",hoverCursor:"default"})}
      if(!sh.canvas)this.canvas.insertAt(Math.max(0,this.canvas.getObjects().indexOf(p)),sh);
      else{const i=this.canvas.getObjects().indexOf(p),j=this.canvas.getObjects().indexOf(sh);if(j!==i-1&&i>0)this.canvas.moveObjectTo(sh,j<i?i-1:i)}
    }finally{this._derived=false}
    this.canvas.requestRenderAll();
  }
  setFloor(patch,{commit=true}={}){const p=this.productLayer();if(!p)return;p.set("rule",{...this.ruleOf(p),floor:{...FLOOR_DEFAULT,...(p.rule&&p.rule.floor||{}),...patch}});this.applyFloorShadow();if(commit)this.commit()}
  autoFloor(){const p=this.productLayer();if(!p)return;const w=p.getScaledWidth();this.setFloor({...FLOOR_DEFAULT,on:true,blur:Math.round(w*.045),opacity:60,dy:0,dx:0,z:0,size:100,persp:35,intensity:70,soft:50,spread:0,angle:90,color:"#000000"})}
  async rebuild(){await this.regenGen();this.applyBgFx();this.applyFloorShadow()}
  setSnap(p){this.snapCfg={...this.snapCfg,...p};this.emit("snap")}
  addShape(kind){
    const W=this.W,u=Math.round(W*.3),C="#ffb400",poly=(pts,n)=>new Polygon(pts.map(([x,y])=>({x:x*u,y:y*u})),{fill:C,strokeLineJoin:"round"});
    const star=[];for(let i=0;i<10;i++){const r=i%2?.2:.5,a=-Math.PI/2+i*Math.PI/5;star.push([.5+r*Math.cos(a),.5+r*Math.sin(a)])}
    const hex=[];for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;hex.push([.5+.5*Math.cos(a),.5+.5*Math.sin(a)])}
    const M={
      rect:["Rectángulo",()=>new Rect({width:Math.round(W*.4),height:Math.round(W*.26),fill:C})],
      rrect:["Rect. redondeado",()=>new Rect({width:Math.round(W*.4),height:Math.round(W*.26),fill:C,rx:48,ry:48})],
      square:["Cuadrado",()=>new Rect({width:u,height:u,fill:C})],
      circle:["Círculo",()=>new Circle({radius:Math.round(u/2),fill:C})],
      ellipse:["Elipse",()=>new Ellipse({rx:Math.round(u*.7),ry:Math.round(u*.42),fill:C})],
      triangle:["Triángulo",()=>new Triangle({width:u,height:Math.round(u*.9),fill:C})],
      rhombus:["Rombo",()=>poly([[.5,0],[1,.5],[.5,1],[0,.5]])],
      star:["Estrella",()=>poly(star)],
      hexagon:["Hexágono",()=>poly(hex)],
      line:["Línea",()=>new Line([0,0,Math.round(W*.5),0],{stroke:C,strokeWidth:10,strokeLineCap:"round",fill:null})]
    };
    const m=M[kind];if(!m)return;const o=this.place(m[1](),m[0],"shape");this.snap();this.emit("change");return o;
  }
  addRect(){this.place(new Rect({width:Math.round(this.W*.4),height:Math.round(this.W*.4),fill:"#ffb400",rx:0,ry:0}),"Rectángulo");this.snap()}
  addCircle(){this.place(new Circle({radius:Math.round(this.W*.2),fill:"#4da3ff"}),"Círculo");this.snap()}
  bgLayer(){return this.canvas.getObjects().find(o=>o.role==="background")||null}
  get bgCfg(){return this.cfg.bg||(this.cfg.bg={...BG_DEFAULT,mode:"solid",solid:this.canvas.backgroundColor||"#ffffff"})}
  async applyBg(patch,{snap=false}={}){
    if(patch)this.cfg.bg={...this.bgCfg,...patch};
    const c=this.bgCfg,old=this.bgLayer();
    if(!this.cfg.bg||c.mode==="solid"){const was=this.busy;this.busy=true;if(old)this.canvas.remove(old);this.busy=was;if(c.mode==="solid")this.canvas.backgroundColor=c.solid;this.canvas.requestRenderAll();if(snap)this.commit();return}
    let url;
    if(c.mode==="auto")url=bgDataUrl(this.W,this.H,c,this.palette);
    else if(c.mode==="image"&&c.img)url=c.img;
    else return;
    const img=await FabricImage.fromURL(url,{crossOrigin:"anonymous"});
    const k=Math.max(this.W/img.width,this.H/img.height);
    img.set({scaleX:k,scaleY:k,left:(this.W-img.width*k)/2,top:(this.H-img.height*k)/2,originX:"left",originY:"top",name:"Fondo",role:"background",selectable:false,evented:false,hoverCursor:"default"});
    const was=this.busy;this.busy=true;
    if(old)this.canvas.remove(old);
    this.canvas.add(img);this.canvas.sendObjectToBack(img);img.setCoords();this.busy=was;
    this.canvas.requestRenderAll();this.applyColorRules();this.applyBgFx();
    if(snap)this.commit();else this.emit("change");
  }
  productLayer(){return this.canvas.getObjects().find(o=>o.role==="product")||null}
  ruleOf(o){return {cx:.5,cy:.5,maxW:.8,maxH:.6,angle:0,shadow:true,...(this.cfg.product||{}),...((o&&o.rule)||{})}}
  placeProduct(o=this.productLayer()){
    if(!o)return;const r=this.ruleOf(o);
    const k=Math.min(r.maxW*this.W/o.width,r.maxH*this.H/o.height);
    o.set({scaleX:k,scaleY:k,angle:r.angle||0,shadow:r.shadow?new Shadow({color:"rgba(0,0,0,0.45)",blur:40,offsetX:0,offsetY:24}):null});
    o.setPositionByOrigin(new Point(r.cx*this.W,r.cy*this.H),"center","center");o.setCoords();
    this.applyFloorShadow();this.canvas.requestRenderAll();
  }
  captureProductRule(o=this.productLayer()){
    if(!o)return;const c=o.getCenterPoint(),w=o.getScaledWidth(),h=o.getScaledHeight();
    o.set("rule",{...this.ruleOf(o),cx:+(c.x/this.W).toFixed(4),cy:+(c.y/this.H).toFixed(4),maxW:+(w/this.W).toFixed(4),maxH:+(h/this.H).toFixed(4),angle:Math.round(o.angle||0),shadow:!!o.shadow});
    this.snap();this.emit("change");
  }
  async setProductImage(url,{orig,place=true}={}){
    let o=this.productLayer();
    if(o){await o.setSrc(url,{crossOrigin:"anonymous"});o.set({orig:orig||url});o.setCoords()}
    else{
      const img=await FabricImage.fromURL(url,{crossOrigin:"anonymous"});
      img.set({name:"Producto",role:"product",orig:orig||url,originX:"left",originY:"top"});
      this.canvas.add(img);const bg=this.bgLayer();if(bg)this.canvas.moveObjectTo(img,this.canvas.getObjects().indexOf(bg)+1);o=img;
    }
    if(/ejemplo/i.test(o.name||""))o.set("name","Producto");
    if(place)this.placeProduct(o);
    this.canvas.requestRenderAll();return o;
  }
  colors(){return bgColors(this.bgCfg,this.palette)}
  bgLumAt(o){
    const bl=this.bgLayer(),el=bl&&bl.getElement&&bl.getElement();
    if(!el)return null;
    try{
      const cs=o.getCoords(),xs=cs.map(p=>p.x),ys=cs.map(p=>p.y),x0=Math.min(...xs),y0=Math.min(...ys),w=Math.max(...xs)-x0,h=Math.max(...ys)-y0;
      const kx=bl.scaleX||1,ky=bl.scaleY||1;
      const c=document.createElement("canvas");c.width=c.height=8;const g=c.getContext("2d",{willReadFrequently:true});
      g.drawImage(el,Math.max(0,(x0-bl.left)/kx),Math.max(0,(y0-bl.top)/ky),Math.max(1,w/kx),Math.max(1,h/ky),0,0,8,8);
      const d=g.getImageData(0,0,8,8).data;let L=0;
      for(let i=0;i<d.length;i+=4)L+=lumOf(rgbToHex(d[i],d[i+1],d[i+2]));
      return L/64;
    }catch{return null}
  }
  applyColorRules(){
    const cols=this.colors();
    this.canvas.getObjects().forEach(o=>{
      const c=o.rule&&o.rule.color;if(!c||!["text","web","shape"].includes(o.role||"text")&&o.role!=="text")return;
      const L=this.bgLumAt(o)??lumOf(cols[0]);const darkBg=L<.35;
      const base=this.palette[0]||cols[0];
      let v=null;
      if(c==="contrast")v=darkBg?"#ffffff":"#111111";
      else if(c==="accent"){v=darkBg?shade(base,Math.max(.0,.62-lumOf(base)*.5)):shade(base,-.35);if(Math.abs(lumOf(v)-L)<.28)v=darkBg?"#ffffff":"#111111"}
      else if(c==="color2")v=cols[Math.min(1,cols.length-1)];
      if(v)o.set("fill",v);
    });
    this.canvas.requestRenderAll();
  }
  fitText(o){
    const r=o.rule;if(!r||!r.fit||o.type.toLowerCase()!=="textbox")return;
    let sz=r.max||o.fontSize;o.set({fontSize:sz,scaleX:1,scaleY:1});o.initDimensions();
    while(o.height>r.maxH&&sz>20){sz-=4;o.set("fontSize",sz);o.initDimensions()}
  }
  fitReport(){return this.canvas.getObjects().filter(o=>o.rule&&o.rule.fit&&o.type.toLowerCase()==="textbox"&&(o.text||"").length&&o.height>o.rule.maxH+1).map(o=>o.name||o.field)}
  newSlide(dup=true){
    if(!this.slides)return;const cur=this.canvas.toObject(PROPS);this.slides[this.cur]=cur;
    const src=dup?JSON.parse(JSON.stringify(cur)):{...JSON.parse(JSON.stringify(cur)),objects:cur.objects.filter(o=>o.role==="background").map(o=>JSON.parse(JSON.stringify(o)))};
    this.slides.splice(this.cur+1,0,src);return this.gotoSlideRaw(this.cur+1);
  }
  async gotoSlide(i){
    if(!this.slides||i<0||i>=this.slides.length||i===this.cur)return;
    this.slides[this.cur]=this.canvas.toObject(PROPS);return this.gotoSlideRaw(i);
  }
  async removeSlide(){
    if(!this.slides||this.slides.length<2)return;
    this.slides.splice(this.cur,1);return this.gotoSlideRaw(Math.min(this.cur,this.slides.length-1));
  }
  async gotoSlideRaw(i){
    this.cur=i;this.busy=true;this.canvas.discardActiveObject();await this.canvas.loadFromJSON(this.slides[i]);
    this.canvas.getObjects().forEach(o=>{if(o.locked)o.set({selectable:false,evented:false})});
    this.applyFields();await this.rebuild();this.busy=false;this.hist=[];this.hi=-1;this.snap(true);this.emit("change");this.emit("slides");
  }
  moveSlide(d){
    const j=this.cur+d;if(!this.slides||j<0||j>=this.slides.length)return;
    this.slides[this.cur]=this.canvas.toObject(PROPS);const [s]=this.slides.splice(this.cur,1);this.slides.splice(j,0,s);this.cur=j;this.emit("slides");this.emit("history");
  }
  async exportAll(type){
    if(!this.slides)return [{name:"1",blob:await this.exportBlob(type)}];
    const keep=this.cur;this.slides[keep]=this.canvas.toObject(PROPS);const out=[];
    for(let i=0;i<this.slides.length;i++){await this.gotoSlideRaw(i);out.push({name:String(i+1),blob:await this.exportBlob(type)})}
    this.slides[this.cur]=this.canvas.toObject(PROPS);await this.gotoSlideRaw(keep);return out;
  }
  layers(){return this.canvas.getObjects().filter(o=>o.role!=="background"&&!DERIVED.includes(o.role)).reverse()}
  get active(){return this.canvas.getActiveObject()||null}
  select(o){this.bgSel=false;if(o.selectable!==false){this.canvas.setActiveObject(o);this.canvas.requestRenderAll()}}
  moveTo(o,topIndex){
    const n=this.canvas.getObjects().length;
    this.canvas.moveObjectTo(o,Math.max(this.bgLayer()?1:0,Math.min(n-1,topIndex)));
    this.canvas.requestRenderAll();this.snap();this.emit("change");
  }
  patch(o,props){o.set(props);o.setCoords();if(o.role==='product')this.applyFloorShadow();this.canvas.requestRenderAll();this.snap();this.emit("change")}
  toggleVisible(o){this.patch(o,{visible:o.visible===false});if(o.visible===false)this.canvas.discardActiveObject()}
  toggleLock(o){const l=!o.locked;this.patch(o,{locked:l,selectable:!l,evented:!l});if(l)this.canvas.discardActiveObject()}
  remove(o){this.canvas.discardActiveObject();this.canvas.remove(o)}
  async duplicate(o){
    const c=await o.clone(PROPS);if(o.gen){c.set('gen',{...o.gen});}
    c.set({name:o.name+" copia",left:o.left+24,top:o.top+24});
    this.canvas.add(c);this.canvas.setActiveObject(c);if(o.gen)await this.regenGen();this.canvas.requestRenderAll();
  }
  nudge(dx,dy){const o=this.active;if(!o)return;o.set({left:o.left+dx,top:o.top+dy});o.setCoords();this.canvas.requestRenderAll();this.snap()}
  snap(init){
    if(this.busy)return;
    const s=JSON.stringify({W:this.W,H:this.H,c:this.canvas.toObject(PROPS),cfg:this.cfg,pal:this.palette});
    if(!init&&this.hist[this.hi]===s)return;
    this.hist=this.hist.slice(0,this.hi+1);this.hist.push(s);
    if(this.hist.length>MAX_HIST)this.hist.shift();
    this.hi=this.hist.length-1;this.emit("history");
  }
  get canUndo(){return this.hi>0}
  get canRedo(){return this.hi<this.hist.length-1}
  async undo(){if(this.canUndo)await this.restore(--this.hi)}
  async redo(){if(this.canRedo)await this.restore(++this.hi)}
  async restore(i){
    this.busy=true;
    const d=JSON.parse(this.hist[i]);
    this.W=d.W;this.H=d.H;this.cfg=d.cfg||{};this.palette=d.pal||[];
    await this.canvas.loadFromJSON(d.c);
    this.canvas.getObjects().forEach(o=>{if(o.locked)o.set({selectable:false,evented:false})});
    await this.rebuild();this.fit();this.busy=false;this.emit("history");this.emit("change");this.emit("format");
  }
}
