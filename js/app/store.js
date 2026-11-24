import {db,COLS,TCOLS} from "./db.js?v=20261124u";
import {mattingDefaults} from "../img/matting.js?v=20261124u";
import {toast} from "./ui.js?v=20261124u";
const L=new Set();
const pending=new Map();
export const store={
  posts:[],types:[],cats:[],templates:[],backgrounds:[],presets:[],loaded:false,error:null,
  on(f){L.add(f);return()=>L.delete(f)},
  emit(){L.forEach(f=>f())},
  async load(){
    try{
      const [p,t,c,tp,bg,pr]=await Promise.all([db.list("posts",`select=${COLS}&order=created_at.desc`),db.list("post_types","select=*&order=sort.asc,name.asc"),db.list("categories","select=*&order=sort.asc,name.asc"),db.list("templates",`select=${TCOLS}&order=created_at.desc`),db.list("backgrounds","select=*&order=created_at.desc"),db.list("product_presets","select=*").catch(()=>[])]);
      this.posts=p;this.types=t;this.cats=c;this.templates=tp;this.backgrounds=bg;this.presets=pr;{const g=pr.find(x=>x.key==="__global");if(g&&g.fields){if(g.fields.tol!=null)mattingDefaults.tol=+g.fields.tol;if(g.fields.holes!=null)mattingDefaults.holes=!!g.fields.holes}}this.loaded=true;this.error=null;
    }catch(e){this.error=e.message||"Sin conexión"}
    this.emit();
  },
  post:id=>store.posts.find(p=>p.id===id),
  typeName:id=>store.types.find(t=>t.id===id)?.name||"",
  catName:id=>store.cats.find(c=>c.id===id)?.name||"",
  async createPost(f){const row=await db.insert("posts",f);this.posts.unshift(strip(row));this.emit();return row},
  async patchPost(id,patch){
    const p=this.post(id);const old=p?{...p}:null;
    if(p){Object.assign(p,strip(patch,true));this.emit()}
    try{const r=await db.update("posts",id,patch);if(p&&r)Object.assign(p,strip(r));this.emit();return r}
    catch(e){if(p){Object.assign(p,old);this.emit()}throw e}
  },
  tpl:id=>store.templates.find(t=>t.id===id),
  async createTemplate(f){const r=await db.insert("templates",f);this.templates.unshift(tstrip(r));this.emit();return r},
  async patchTemplate(id,patch){const r=await db.update("templates",id,patch);const t=this.tpl(id);if(t&&r)Object.assign(t,tstrip(r));this.emit();return r},
  async removeTemplate(id){await db.remove("templates",id);this.templates=this.templates.filter(t=>t.id!==id);this.emit()},
  async setDefault(id){
    const t=this.tpl(id);if(!t)return;
    const same=this.templates.filter(x=>x.id!==id&&x.is_default&&x.format===t.format&&(x.type_id||null)===(t.type_id||null)&&(x.category_id||null)===(t.category_id||null));
    for(const x of same){await db.update("templates",x.id,{is_default:false});x.is_default=false}
    await db.update("templates",id,{is_default:true});t.is_default=true;this.emit();
  },
  async duplicateTemplate(id){const full=await db.get("templates",id);const {id:_i,created_at,updated_at,...rest}=full;const r=await this.createTemplate({...rest,name:full.name+" (copia)",is_default:false});return r},
  resolveTemplate(typeId,catId,format){
    const f=this.templates.filter(t=>t.format===format);
    const best=a=>a.find(t=>t.is_default)||a[0]||null;
    const T=typeId||null,C=catId||null;
    return best(f.filter(t=>(t.type_id||null)===T&&(t.category_id||null)===C))||best(f.filter(t=>(t.type_id||null)===T))||best(f.filter(t=>(t.category_id||null)===C))||best(f);
  },
  catPreset:id=>(store.cats.find(c=>c.id===id)||{}).preset||{},
  async setCatPreset(id,preset){const r=await db.update("categories",id,{preset});const c=this.cats.find(x=>x.id===id);if(c&&r)c.preset=r.preset;this.emit()},
  presetFor(p){const k=presetKey(p);return k?this.presets.find(x=>x.key===k)||null:null},
  async savePreset(p,{fields,bg,image}){
    const key=presetKey(p);if(!key)throw new Error("El producto necesita un nombre");
    const row={key,name:p.name||key,fields,bg:bg||null,image:image||p.image||null};
    const old=this.presets.find(x=>x.key===key);
    if(old){const r=await db.update("product_presets",old.id,row);Object.assign(old,r)}else this.presets.push(await db.insert("product_presets",row));
    this.emit();
  },
  assets(kind){return this.presets.filter(x=>x.key.startsWith("asset:")&&x.fields&&x.fields.kind===kind).sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""))},
  async addAsset(kind,name,url,extra={}){const r=await db.insert("product_presets",{key:`asset:${kind}:${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,name,fields:{kind,url,...extra}});this.presets.push(r);this.emit();return r},
  async removeAsset(id){await db.remove("product_presets",id);this.presets=this.presets.filter(x=>x.id!==id);this.emit()},
  async setMatting(tol,holes){
    mattingDefaults.tol=tol;mattingDefaults.holes=holes;
    const old=this.presets.find(x=>x.key==="__global"),row={key:"__global",name:"Ajustes generales",fields:{tol,holes}};
    if(old){const r=await db.update("product_presets",old.id,row);Object.assign(old,r)}else this.presets.push(await db.insert("product_presets",row));
  },
  async addBackground(row){const r=await db.insert("backgrounds",row);this.backgrounds.unshift(r);this.emit();return r},
  async patchBackground(id,patch){const r=await db.update("backgrounds",id,patch);const b=this.backgrounds.find(x=>x.id===id);if(b&&r)Object.assign(b,r);this.emit()},
  async removeBackground(id){await db.remove("backgrounds",id);this.backgrounds=this.backgrounds.filter(b=>b.id!==id);this.emit()},
  async duplicate(id){
    const full=await db.get("posts",id);if(!full)throw new Error("No existe");
    const {id:_i,created_at,updated_at,...rest}=full;
    return this.createPost({...rest,title:full.title+" (copia)",status:"draft",scheduled_at:null,error_msg:null});
  },
  remove(id){
    const i=this.posts.findIndex(p=>p.id===id);if(i<0)return;
    const [p]=this.posts.splice(i,1);this.emit();
    const t=setTimeout(()=>{pending.delete(id);db.remove("posts",id).catch(e=>{this.posts.splice(i,0,p);this.emit();toast(e.message,{kind:"err"})})},6000);
    pending.set(id,{t,p,i});
    toast("Publicación eliminada",{action:"Deshacer",ms:6000,onAction:()=>{clearTimeout(t);pending.delete(id);this.posts.splice(Math.min(i,this.posts.length),0,p);this.emit()}});
  },
  flush(){pending.forEach(({t,p},id)=>{clearTimeout(t);db.remove("posts",id,true).catch(()=>{})});pending.clear()},
  async addLookup(table,name){const arr=table==="post_types"?this.types:this.cats;const r=await db.insert(table,{name,sort:arr.length+1});arr.push(r);this.emit();return r},
  async renameLookup(table,id,name){const arr=table==="post_types"?this.types:this.cats;const r=await db.update(table,id,{name});const x=arr.find(a=>a.id===id);if(x)x.name=r.name;this.emit()},
  async removeLookup(table,id){
    await db.remove(table,id);
    if(table==="post_types"){this.types=this.types.filter(a=>a.id!==id);this.posts.forEach(p=>{if(p.type_id===id)p.type_id=null})}
    else{this.cats=this.cats.filter(a=>a.id!==id);this.posts.forEach(p=>{if(p.category_id===id)p.category_id=null})}
    this.emit();
  }
};
export const presetKey=p=>((p&&(p.handle||p.name))||"").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const tstrip=(r)=>{const o={};TCOLS.split(",").forEach(k=>{o[k]=r[k]});return o};
const strip=(r,partial)=>{const o={};COLS.split(",").forEach(k=>{if(!partial||k in r)o[k]=r[k]});return o};
addEventListener("beforeunload",()=>store.flush());
