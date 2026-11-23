import {db,COLS} from "./db.js";
import {toast} from "./ui.js";
const L=new Set();
const pending=new Map();
export const store={
  posts:[],types:[],cats:[],loaded:false,error:null,
  on(f){L.add(f);return()=>L.delete(f)},
  emit(){L.forEach(f=>f())},
  async load(){
    try{
      const [p,t,c]=await Promise.all([db.list("posts",`select=${COLS}&order=created_at.desc`),db.list("post_types","select=*&order=sort.asc,name.asc"),db.list("categories","select=*&order=sort.asc,name.asc")]);
      this.posts=p;this.types=t;this.cats=c;this.loaded=true;this.error=null;
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
const strip=(r,partial)=>{const o={};COLS.split(",").forEach(k=>{if(!partial||k in r)o[k]=r[k]});return o};
addEventListener("beforeunload",()=>store.flush());
