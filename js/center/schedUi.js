const DAYS=["L","M","X","J","V","S","D"],ED=[1,2,3,4,5,6,7],EH=[1,2,3,4,6,8,12,24];
const seg=(id,k,list,cur,sfx)=>`<div class="seg" id="${id}">${list.map(n=>`<button type="button" data-${k}="${n}" class="${cur===n?"is-on":""}">${n}${sfx}</button>`).join("")}</div>`;
export const schedBody=s=>`<div class="seg" id="seg-m">${[["weekdays","Días de la semana"],["interval","Cada X días"],["hours","Cada X horas"]].map(([m,l])=>`<button type="button" data-m="${m}" class="${s.mode===m?"is-on":""}">${l}</button>`).join("")}</div>
${s.mode==="weekdays"?`<div class="pills" id="days">${DAYS.map((x,i)=>`<button type="button" class="pill${(s.days||[]).includes(i)?" is-on":""}" data-d="${i}">${x}</button>`).join("")}</div>`:s.mode==="interval"?`<div class="field"><label>Cada cuántos días</label>${seg("seg-e","e",ED,+s.every||1,"")}</div>`:`<div class="field"><label>Cada cuántas horas</label>${seg("seg-h","h",EH,+s.hours||6,"h")}</div>`}
<div class="row2"><div class="field"><label for="sd">Primer día</label><input class="input" type="date" id="sd" value="${s.start}"></div><div class="field"><label for="st">${s.mode==="hours"?"Hora de la primera":"Hora"} (Europa/Madrid)</label><input class="input" type="time" id="st" value="${s.time}"></div></div>`;
export function schedClick(s,t){
  if(t.closest("#seg-m")){s.mode=t.dataset.m;return true}
  if(t.closest("#seg-e")){s.every=+t.dataset.e;return true}
  if(t.closest("#seg-h")){s.hours=+t.dataset.h;return true}
  if(t.dataset.d!==undefined){const k=+t.dataset.d,a=s.days||[];s.days=a.includes(k)?a.filter(x=>x!==k):[...a,k].sort();return true}
  return false;
}
export function schedChange(s,t){
  if(t.id==="sd"){s.start=t.value||s.start;return true}
  if(t.id==="st"){s.time=t.value||s.time;return true}
  return false;
}
