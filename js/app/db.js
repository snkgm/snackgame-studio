import {CONFIG} from "./config.js?v=20261126q";
import {auth} from "./auth.js?v=20261126q";
const hd=()=>({apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:"Bearer "+(auth.token()||CONFIG.SUPABASE_ANON_KEY)});
const REST=CONFIG.SUPABASE_URL+"/rest/v1/",STORE=CONFIG.SUPABASE_URL+"/storage/v1/";
async function req(path,{method="GET",body,keepalive}={}){
  await auth.fresh();
  const r=await fetch(REST+path,{method,keepalive,headers:{...hd(),"Content-Type":"application/json",Prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body)});
  if(!r.ok){let m=r.statusText;try{m=(await r.json()).message||m}catch{}throw new Error(m)}
  return r.status===204?null:r.json();
}
export const db={
  bulk:async(t,rows)=>{await auth.fresh();const r=await fetch(REST+t,{method:"POST",headers:{...hd(),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(rows)});if(!r.ok){let m=r.statusText;try{m=(await r.json()).message||m}catch{}throw new Error(m)}},
  REST,get H(){return {...hd(),"Content-Type":"application/json"}},
  list:(t,q="")=>req(`${t}?${q}`),
  get:async(t,id)=>(await req(`${t}?id=eq.${id}&select=*`))[0]||null,
  insert:async(t,row)=>(await req(t,{method:"POST",body:row}))[0],
  update:async(t,id,patch)=>(await req(`${t}?id=eq.${id}`,{method:"PATCH",body:patch}))[0],
  remove:(t,id,keepalive)=>req(`${t}?id=eq.${id}`,{method:"DELETE",keepalive}),
  async upload(path,blob){
    await auth.fresh();
    const r=await fetch(`${STORE}object/studio/${path}`,{method:"POST",headers:{...hd(),"x-upsert":"true","Content-Type":blob.type||"application/octet-stream"},body:blob});
    if(!r.ok)throw new Error("Subida fallida");
    return `${STORE}object/public/studio/${path}?v=${Date.now()}`;
  }
};
export const publicUrl=path=>`${STORE}object/public/studio/${path}`;
export const COLS="id,title,status,scheduled_at,type_id,category_id,template_id,format,thumb_url,error_msg,group_id,campaign_id,item_id,product_id,caption,assets,updated_at,created_at";
export const TCOLS="id,name,type_id,category_id,format,thumb_url,is_default,updated_at,created_at";
