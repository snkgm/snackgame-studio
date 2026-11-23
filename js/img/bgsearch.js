const KEY="studio.pexelsKey";
export const getKey=()=>{try{return localStorage.getItem(KEY)||""}catch{return ""}};
export const setKey=v=>{try{localStorage.setItem(KEY,v.trim())}catch{}};
export async function searchBackgrounds(q){
  const key=getKey();if(!key)throw new Error("Falta la clave de Pexels");
  const r=await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=18&orientation=portrait`,{headers:{Authorization:key}});
  if(r.status===401)throw new Error("Clave de Pexels no válida");
  if(!r.ok)throw new Error("Pexels no responde");
  const j=await r.json();
  return j.photos.map(p=>({id:p.id,thumb:p.src.small,url:p.src.large2x,credit:`Foto de ${p.photographer} en Pexels`,link:p.url}));
}
