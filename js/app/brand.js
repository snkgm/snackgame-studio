import {db,publicUrl} from "./db.js?v=20261125b";
const PATH="brand/logo.png";
let cache;
export async function logoUrl(force){
  if(cache!==undefined&&!force)return cache;
  try{const r=await fetch(publicUrl(PATH),{method:"HEAD",cache:"no-store"});cache=r.ok?publicUrl(PATH)+"?v="+Date.now():null}catch{cache=null}
  return cache;
}
export async function uploadLogo(file){
  const bmp=await createImageBitmap(file);
  const c=document.createElement("canvas");const k=Math.min(1,2000/Math.max(bmp.width,bmp.height));c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));
  await db.upload(PATH,blob);cache=undefined;return logoUrl(true);
}
