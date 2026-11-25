import {auth} from "../app/auth.js?v=20261125j";
import {db} from "../app/db.js?v=20261125j";
import {runItem} from "./pipeline.js?v=20261125j";
import {Fatal} from "./gallery.js?v=20261125j";
const rpc=async(fn,b={})=>{const r=await fetch(db.REST+"rpc/"+fn,{method:"POST",headers:db.H,body:JSON.stringify(b)});if(!r.ok)throw new Error(fn+" "+r.status);return r.json()};
const patch=(id,p)=>db.update("campaign_items",id,p);
async function closeIfDone(cid){
  const r=await fetch(`${db.REST}campaign_items?campaign_id=eq.${cid}&status=in.(pending,downloading,removing_bg,analyzing,background,composing,saving)&select=id&limit=1`,{headers:db.H}).then(x=>x.json());
  if(!r.length)await fetch(`${db.REST}campaigns?id=eq.${cid}&status=eq.running`,{method:"PATCH",headers:db.H,body:JSON.stringify({status:"done"})});
}
window.__pending=()=>rpc("queue_pending");
window.__drain=async(wid,maxMs)=>{
  const t0=Date.now(),log=[];await rpc("fail_stale");
  while(Date.now()-t0<maxMs){
    const r=await rpc("claim_item",{worker:wid});if(!r.length)break;
    const item=r[0],camp=await db.get("campaigns",item.campaign_id);let chain=Promise.resolve();
    const report=s=>{chain=chain.then(()=>patch(item.id,{status:s,locked_at:new Date().toISOString()})).catch(()=>{})};
    try{
      const res=await runItem(item,camp,report);await chain;
      await patch(item.id,{status:"scheduled",error:null,post_ids:res.post_ids,product:res.product,locked_by:null});log.push([item.name,"ok"]);
    }catch(e){
      await chain;const fatal=e instanceof Fatal||item.attempts>=3;
      await patch(item.id,{status:fatal?"error":"pending",error:String(e.message||e).slice(0,300),locked_by:null}).catch(()=>{});log.push([item.name,"fail",e.message]);
    }
    await closeIfDone(item.campaign_id).catch(()=>{});
  }
  return log;
};
window.__login=(e,p)=>auth.login(e,p);
window.__ready=true;
