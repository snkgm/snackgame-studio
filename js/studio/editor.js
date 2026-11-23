import {Canvas,Rect,Circle,FabricObject} from "../../vendor/fabric.min.mjs";
const PROPS=["name","locked"];
FabricObject.customProperties=PROPS;
const PAD=48,MAX_HIST=50;
export class Editor{
  constructor(canvasEl,stageEl,boxEl){
    this.stage=stageEl;this.box=boxEl;this.W=1080;this.H=1350;this.scale=1;
    this.listeners={};this.hist=[];this.hi=-1;this.busy=false;this.counter={};
    this.canvas=new Canvas(canvasEl,{width:this.W,height:this.H,backgroundColor:"#ffffff",preserveObjectStacking:true,selection:true,renderOnAddRemove:true});
    FabricObject.prototype.set({transparentCorners:false,cornerColor:"#ffb400",cornerStrokeColor:"#1a1300",borderColor:"#ffb400",cornerSize:14,padding:0});
    ["object:added","object:removed","object:modified","selection:created","selection:updated","selection:cleared"].forEach(e=>this.canvas.on(e,()=>this.emit("change")));
    ["object:added","object:removed","object:modified"].forEach(e=>this.canvas.on(e,()=>this.snap()));
    new ResizeObserver(()=>this.fit()).observe(stageEl);
    this.fit();this.snap(true);
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
  place(o,base){
    o.set({name:this.nextName(base),left:this.W/2,top:this.H/2,originX:"center",originY:"center"});
    this.canvas.add(o);this.canvas.setActiveObject(o);this.canvas.requestRenderAll();
  }
  addRect(){this.place(new Rect({width:Math.round(this.W*.4),height:Math.round(this.W*.4),fill:"#ffb400",rx:0,ry:0}),"Rectángulo")}
  addCircle(){this.place(new Circle({radius:Math.round(this.W*.2),fill:"#4da3ff"}),"Círculo")}
  layers(){return this.canvas.getObjects().slice().reverse()}
  get active(){return this.canvas.getActiveObject()||null}
  select(o){if(o.selectable!==false){this.canvas.setActiveObject(o);this.canvas.requestRenderAll()}}
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
