import {Canvas,Rect,Circle,FabricObject,Textbox,FabricImage,Point} from "../../vendor/fabric.min.mjs";
const PROPS=["name","locked","role","field","pattern"];
export const FIELDS={name:"Nombre del producto",number:"Número",collection:"Colección",price:"Precio",category:"Categoría",web:"snackgame.es"};
FabricObject.customProperties=PROPS;
const PAD=48,MAX_HIST=50;
export class Editor{
  constructor(canvasEl,stageEl,boxEl){
    this.stage=stageEl;this.box=boxEl;this.W=1080;this.H=1350;this.scale=1;
    this.listeners={};this.hist=[];this.hi=-1;this.busy=false;this.counter={};
    this.canvas=new Canvas(canvasEl,{width:this.W,height:this.H,backgroundColor:"#ffffff",preserveObjectStacking:true,selection:true,renderOnAddRemove:true});
    FabricObject.prototype.set({transparentCorners:false,cornerColor:"#ffb400",cornerStrokeColor:"#1a1300",borderColor:"#ffb400",cornerSize:14,padding:0});
    this.bgSel=false;this.product={};
    ["selection:created","selection:updated"].forEach(e=>this.canvas.on(e,()=>{this.bgSel=false}));
    ["object:added","object:removed","object:modified","selection:created","selection:updated","selection:cleared","text:changed"].forEach(e=>this.canvas.on(e,()=>this.emit("change")));
    ["object:added","object:removed","object:modified"].forEach(e=>this.canvas.on(e,()=>this.snap()));
    this.ro=new ResizeObserver(()=>this.fit());this.ro.observe(stageEl);
    this.fit();this.snap(true);
  }
  destroy(){this.ro.disconnect();this.listeners={};this.canvas.dispose()}
  toData(){return {W:this.W,H:this.H,c:this.canvas.toObject(PROPS),v:2}}
  async loadData(d,fmt){
    this.busy=true;
    if(d&&d.W){this.W=d.W;this.H=d.H}else if(fmt){this.W=fmt.w;this.H=fmt.h}
    if(d&&d.c)await this.canvas.loadFromJSON(d.c);
    this.canvas.getObjects().forEach(o=>{if(o.locked)o.set({selectable:false,evented:false})});
    this.counter={};this.applyFields();this.canvas.getObjects().forEach(o=>{const m=/^(.*) (\d+)$/.exec(o.name||"");if(m)this.counter[m[1]]=Math.max(this.counter[m[1]]||0,+m[2])});
    this.busy=false;this.hist=[];this.hi=-1;this.fit();this.snap(true);this.emit("change");this.emit("format");
  }
  async exportBlob(type="png",quality=.92){
    this.canvas.discardActiveObject();this.canvas.requestRenderAll();
    const url=this.canvas.toDataURL({format:type==="jpg"?"jpeg":"png",quality,multiplier:1,left:0,top:0,width:this.W,height:this.H,enableRetinaScaling:false});
    return (await fetch(url)).blob();
  }
  async thumbBlob(w=360){
    const url=this.canvas.toDataURL({format:"jpeg",quality:.72,multiplier:w/this.W,left:0,top:0,width:this.W,height:this.H,enableRetinaScaling:false});
    return (await fetch(url)).blob();
  }
  on(e,f){(this.listeners[e]??=[]).push(f)}
  emit(e,d){(this.listeners[e]||[]).forEach(f=>f(d))}
  setFormat(w,h){this.W=w;this.H=h;this.fit();this.snap();this.emit("change")}
  fit(){
    const r=this.stage.getBoundingClientRect();
    const s=Math.max(.05,Math.min((r.width-PAD*2)/this.W,(r.height-PAD*2)/this.H));
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
    const t=new Textbox(opt.text||"Texto",{width:Math.round(this.W*.8),fontFamily:"Montserrat",fontWeight:700,fontSize:72,fill:"#ffffff",textAlign:"center",lineHeight:1.1,charSpacing:0,field:opt.field||null,pattern:"{valor}",...(opt.props||{})});
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
      o.set("text",(o.pattern||"{valor}").replace("{valor}",v||FIELDS[o.field]||""));
    });
    this.canvas.requestRenderAll();
  }
  setProduct(patch){Object.assign(this.product,patch);this.applyFields();this.snap();this.emit("change")}
  selectBackground(){this.canvas.discardActiveObject();this.bgSel=true;this.canvas.requestRenderAll();this.emit("change")}
  commit(){this.canvas.requestRenderAll();this.snap();this.emit("change")}
  xy(o){const p=o.getPointByOrigin("left","top");return{x:p.x,y:p.y}}
  setXY(o,x,y){o.setPositionByOrigin(new Point(x,y),"left","top");o.setCoords()}
  align(k){
    const o=this.active;if(!o)return;const c=o.getCoords();
    const xs=c.map(p=>p.x),ys=c.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    let dx=0,dy=0;
    if(k==="left")dx=-x0;if(k==="hcenter")dx=this.W/2-(x0+x1)/2;if(k==="right")dx=this.W-x1;
    if(k==="top")dy=-y0;if(k==="vcenter")dy=this.H/2-(y0+y1)/2;if(k==="bottom")dy=this.H-y1;
    o.set({left:o.left+dx,top:o.top+dy});o.setCoords();this.commit();
  }
  addRect(){this.place(new Rect({width:Math.round(this.W*.4),height:Math.round(this.W*.4),fill:"#ffb400",rx:0,ry:0}),"Rectángulo");this.snap()}
  addCircle(){this.place(new Circle({radius:Math.round(this.W*.2),fill:"#4da3ff"}),"Círculo");this.snap()}
  layers(){return this.canvas.getObjects().slice().reverse()}
  get active(){return this.canvas.getActiveObject()||null}
  select(o){this.bgSel=false;if(o.selectable!==false){this.canvas.setActiveObject(o);this.canvas.requestRenderAll()}}
  moveTo(o,topIndex){
    const n=this.canvas.getObjects().length;
    this.canvas.moveObjectTo(o,Math.max(0,Math.min(n-1,topIndex)));
    this.canvas.requestRenderAll();this.snap();this.emit("change");
  }
  patch(o,props){o.set(props);o.setCoords();this.canvas.requestRenderAll();this.snap();this.emit("change")}
  toggleVisible(o){this.patch(o,{visible:o.visible===false});if(o.visible===false)this.canvas.discardActiveObject()}
  toggleLock(o){const l=!o.locked;this.patch(o,{locked:l,selectable:!l,evented:!l});if(l)this.canvas.discardActiveObject()}
  remove(o){this.canvas.discardActiveObject();this.canvas.remove(o)}
  async duplicate(o){
    const c=await o.clone(PROPS);
    c.set({name:o.name+" copia",left:o.left+24,top:o.top+24});
    this.canvas.add(c);this.canvas.setActiveObject(c);this.canvas.requestRenderAll();
  }
  nudge(dx,dy){const o=this.active;if(!o)return;o.set({left:o.left+dx,top:o.top+dy});o.setCoords();this.canvas.requestRenderAll();this.snap()}
  snap(init){
    if(this.busy)return;
    const s=JSON.stringify({W:this.W,H:this.H,c:this.canvas.toObject(PROPS)});
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
    this.W=d.W;this.H=d.H;
    await this.canvas.loadFromJSON(d.c);
    this.canvas.getObjects().forEach(o=>{if(o.locked)o.set({selectable:false,evented:false})});
    this.fit();this.busy=false;this.emit("history");this.emit("change");this.emit("format");
  }
}
