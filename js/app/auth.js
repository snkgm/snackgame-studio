import {CONFIG} from "./config.js?v=20261124j";
const KEY="sg.auth",URL_=CONFIG.SUPABASE_URL+"/auth/v1/";
let S=null;try{S=JSON.parse(localStorage.getItem(KEY))}catch{}
const put=s=>{S=s;try{s?localStorage.setItem(KEY,JSON.stringify(s)):localStorage.removeItem(KEY)}catch{}};
const LK="sg.lock";
const lockInfo=()=>{try{return JSON.parse(localStorage.getItem(LK))||{n:0,until:0}}catch{return{n:0,until:0}}};
export const lockLeft=()=>Math.max(0,Math.ceil((lockInfo().until-Date.now())/1e3));
const fail=()=>{const l=lockInfo(),n=l.n+1,wait=n>=5?Math.min(3600,60*2**(n-5)):0;try{localStorage.setItem(LK,JSON.stringify({n,until:wait?Date.now()+wait*1e3:0}))}catch{}};
const okay=()=>{try{localStorage.removeItem(LK)}catch{}};
const call=async(q,body)=>{const r=await fetch(URL_+q,{method:"POST",headers:{apikey:CONFIG.SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error_description||j.msg||"Credenciales no válidas");return {access_token:j.access_token,refresh_token:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1e3,email:j.user&&j.user.email}};
export const auth={
  token:()=>S&&S.access_token||null,
  ok:()=>!!(S&&S.refresh_token),
  email:()=>S&&S.email||"",
  async login(email,password,captcha){
    const w=lockLeft();if(w)throw new Error(`Demasiados intentos. Espera ${w>60?Math.ceil(w/60)+" min":w+" s"}.`);
    try{put(await call("token?grant_type=password",{email,password,...(captcha?{gotrue_meta_security:{captcha_token:captcha}}:{})}));okay()}
    catch(e){fail();throw new Error(/rate|many|429/i.test(e.message)?"Demasiados intentos. Espera unos minutos.":"Email o contraseña incorrectos")}
  },
  async fresh(){
    if(!S||S.exp-Date.now()>90e3)return;
    try{put(await call("token?grant_type=refresh_token",{refresh_token:S.refresh_token}))}catch(e){if(/invalid|expired|not found/i.test(e.message))put(null)}
  },
  logout(){put(null);location.reload()}
};
