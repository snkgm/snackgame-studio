import {CONFIG} from "./config.js?v=20261124c";
const KEY="sg.auth",URL_=CONFIG.SUPABASE_URL+"/auth/v1/";
let S=null;try{S=JSON.parse(localStorage.getItem(KEY))}catch{}
const put=s=>{S=s;try{s?localStorage.setItem(KEY,JSON.stringify(s)):localStorage.removeItem(KEY)}catch{}};
const call=async(q,body)=>{const r=await fetch(URL_+q,{method:"POST",headers:{apikey:CONFIG.SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error_description||j.msg||"Credenciales no válidas");return {access_token:j.access_token,refresh_token:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1e3,email:j.user&&j.user.email}};
export const auth={
  token:()=>S&&S.access_token||null,
  ok:()=>!!(S&&S.refresh_token),
  email:()=>S&&S.email||"",
  async login(email,password){put(await call("token?grant_type=password",{email,password}))},
  async fresh(){
    if(!S||S.exp-Date.now()>90e3)return;
    try{put(await call("token?grant_type=refresh_token",{refresh_token:S.refresh_token}))}catch(e){if(/invalid|expired|not found/i.test(e.message))put(null)}
  },
  logout(){put(null);location.reload()}
};
