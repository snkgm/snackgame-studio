const TZ="Europe/Madrid";
const offsetMin=ms=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:TZ,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return (Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute,+p.second)-ms)/6e4};
export function madridIso(y,m,d,hh,mm){const g=Date.UTC(y,m-1,d,hh,mm);let t=g-offsetMin(g)*6e4;t=g-offsetMin(t)*6e4;return new Date(t).toISOString()}
export function scheduleDates(s,count,skip=0){
  const [y,m,d]=s.start.split("-").map(Number),[hh,mm]=s.time.split(":").map(Number),out=[],step=Math.max(1,+s.every||1);
  if(s.mode==="weekdays"&&!(s.days||[]).length)return [];
  for(let i=0;out.length<skip+count&&i<5000;i++){
    const day=new Date(Date.UTC(y,m-1,d+i));
    const ok=s.mode==="weekdays"?s.days.includes((day.getUTCDay()+6)%7):i%step===0;
    if(ok)out.push(madridIso(day.getUTCFullYear(),day.getUTCMonth()+1,day.getUTCDate(),hh,mm));
  }
  return out.slice(skip);
}
export const fmtMadrid=iso=>iso?new Date(iso).toLocaleString("es-ES",{timeZone:TZ,weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
export function parseList(text){
  const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean),out=[];let pend=null;
  const strip=t=>t.replace(/^[\s|;,\-–—:\t]+|[\s|;,\-–—:\t]+$/g,"").trim();
  const clean=u=>{try{const x=new URL(u);return x.origin+x.pathname}catch{return u}};
  for(const l of lines){
    const m=/https?:\/\/[^\s|;]+/.exec(l);
    if(!m){if(pend)out.push(pend);pend={name:l.replace(/[|;\t]+/g," ").trim(),url:"",subtitle:""};continue}
    const before=strip(l.slice(0,m.index)),after=strip(l.slice(m.index+m[0].length));
    if(!before&&pend&&!pend.url){pend.url=clean(m[0]);pend.subtitle=after;out.push(pend);pend=null}
    else{if(pend){out.push(pend);pend=null}out.push({name:before,url:clean(m[0]),subtitle:after})}
  }
  if(pend)out.push(pend);return out;
}
