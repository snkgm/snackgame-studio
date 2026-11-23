import {chromium} from "playwright";
const SITE=process.env.SITE||"https://snkgm.github.io/snackgame-studio/";
const URL_=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_KEY;
const LIMIT=(+process.env.MAX_MIN||300)*60e3,t0=Date.now(),wid="gha-"+(process.env.GITHUB_RUN_ID||Date.now());
const pending=async()=>{const r=await fetch(URL_+"/rest/v1/rpc/queue_pending",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:"{}"});return r.ok?await r.json():0};
let rounds=0;
while(Date.now()-t0<LIMIT&&await pending()>0&&rounds++<50){
  const ctx=await chromium.launchPersistentContext("./.pw-profile",{headless:true,args:["--no-sandbox"]});
  try{
    const page=await ctx.newPage();
    page.on("console",m=>{if(["error","warning"].includes(m.type()))console.log("[page]",m.text().slice(0,200))});
    await page.goto(SITE+"worker.html?t="+Date.now(),{waitUntil:"load"});
    await page.waitForFunction(()=>window.__ready,null,{timeout:60e3});
    if(process.env.STUDIO_EMAIL)await page.evaluate(([e,p])=>window.__login(e,p),[process.env.STUDIO_EMAIL,process.env.STUDIO_PASSWORD]);
    const log=await page.evaluate(([w,ms])=>window.__drain(w,ms),[wid,Math.max(60e3,LIMIT-(Date.now()-t0)-120e3)]);
    console.log(JSON.stringify(log));
  }catch(e){console.log("round error",e.message)}
  finally{await ctx.close().catch(()=>{})}
}
console.log("fin; pendientes:",await pending());
