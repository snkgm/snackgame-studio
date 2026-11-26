const SB=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_KEY,TOK=process.env.IG_TOKEN,IG=process.env.IG_USER_ID||"17841457354040174",DRY=process.env.DRY==="1";
const LOC=process.env.IG_LOCATION_ID||"";
const G="https://graph.facebook.com/v23.0/";
if(!TOK){console.log("Sin IG_TOKEN");process.exit(0)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const lg=await fetch(SB+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({email:process.env.STUDIO_EMAIL,password:process.env.STUDIO_PASSWORD})}).then(r=>r.json());
if(!lg.access_token){console.log("Login fallido");process.exit(1)}
const H={apikey:KEY,Authorization:"Bearer "+lg.access_token,"Content-Type":"application/json"};
const rest=(p,o={})=>fetch(SB+"/rest/v1/"+p,{headers:H,...o}).then(async r=>{if(!r.ok)throw new Error(p+" "+r.status);return r.status===204?null:r.json()});
const ig=async(path,params,method="POST")=>{
  const u=new URL(G+path);const b=new URLSearchParams({access_token:TOK,...params});
  const r=method==="GET"?await fetch(u+"?"+b):await fetch(u,{method,body:b});
  const j=await r.json();if(!r.ok||j.error)throw new Error(j.error?.error_user_msg||j.error?.message||"IG "+r.status);return j;
};
const ready=async id=>{for(let i=0;i<30;i++){const s=await ig(id,{fields:"status_code,status"},"GET");if(s.status_code==="FINISHED")return;if(s.status_code==="ERROR"||s.status_code==="EXPIRED")throw new Error("Contenedor "+s.status_code+": "+(s.status||""));await sleep(4e3)}throw new Error("Contenedor sin terminar")};
const now=new Date().toISOString();
const posts=await rest(`posts?status=eq.scheduled&scheduled_at=lte.${now}&select=id,title,format,group_id,item_id,caption,assets,scheduled_at&order=scheduled_at.asc&limit=20`);
const seen=new Set();let n=0;
for(const p of posts){
  const m=p.assets?.meta||{};if(m.published)continue;
  const isStory=p.format==="story-9x16",isFeed=/^(post-|carousel-)/.test(p.format);
  if(!isStory&&!isFeed)continue;
  const g=p.assets?.ig||{},mode=g.mode==="publicar"?"publicar":"prueba",cap=(p.caption||"").trim();
  const key=(p.group_id||p.item_id||p.id)+(isStory?":s":":f");
  const set=async(patch)=>rest(`posts?id=eq.${p.id}`,{method:"PATCH",body:JSON.stringify(patch)});
  if(seen.has(key)){await set({status:mode==="publicar"?"published":"review",assets:{...p.assets,meta:{...m,published:mode==="publicar",skipped:"duplicado de formato"}}});continue}
  seen.add(key);
  const urls=(p.assets?.finals||[]).slice(0,10);
  if(!urls.length){await set({status:"error",error_msg:"Sin imágenes finales"});continue}
  if(!isStory&&mode==="publicar"&&!cap){await set({status:"error",error_msg:"Falta la descripción"});continue}
  const alt=(g.alt||p.title||"").slice(0,1000),col=(g.collab||"").split(/[,\s]+/).map(x=>x.replace(/^@/,"")).filter(Boolean),ex={};
  if(LOC&&g.loc!==false)ex.location_id=LOC;if(col.length)ex.collaborators=JSON.stringify(col);
  try{
    if(DRY){console.log("DRY",p.title,urls.length);continue}
    let cid;
    if(isStory)cid=(await ig(IG+"/media",{image_url:urls[0],media_type:"STORIES"})).id;
    else if(urls.length===1)cid=(await ig(IG+"/media",{image_url:urls[0],caption:cap,alt_text:alt,...ex})).id;
    else{
      const kids=[];for(const u of urls)kids.push((await ig(IG+"/media",{image_url:u,is_carousel_item:"true",alt_text:alt})).id);
      for(const k of kids)await ready(k);
      cid=(await ig(IG+"/media",{media_type:"CAROUSEL",children:kids.join(","),caption:cap,...ex})).id;
    }
    await ready(cid);
    if(mode!=="publicar"){await set({status:"review",error_msg:null,assets:{...p.assets,meta:{...m,tested_at:new Date().toISOString(),test_ok:true}}});console.log("Prueba OK",p.title);continue}
    const pub=await ig(IG+"/media_publish",{creation_id:cid});
    await set({status:"published",error_msg:null,assets:{...p.assets,meta:{...m,published:true,ig_media_id:pub.id,published_at:new Date().toISOString()}}});
    console.log("Publicado",p.title,pub.id);n++;
  }catch(e){
    const t=(m.ig_tries||0)+1;
    await set({status:t>=3?"error":"scheduled",error_msg:("Instagram: "+e.message).slice(0,300),assets:{...p.assets,meta:{...m,ig_tries:t}}}).catch(()=>{});
    console.log("Fallo",p.title,e.message);
  }
}
console.log("fin; publicadas:",n);
