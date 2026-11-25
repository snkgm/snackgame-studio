export function scrollFade(el,{h=28}={}){
  if(!el)return;
  const up=()=>{const t=el.scrollTop,m=el.scrollHeight-el.clientHeight;el.style.setProperty("--fu",t>2?h+"px":"0px");el.style.setProperty("--fd",m-t>2?h+"px":"0px")};
  el.classList.add("sfade");el.addEventListener("scroll",up,{passive:true});
  new ResizeObserver(up).observe(el);new MutationObserver(up).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:["class","hidden","style"]});
  up();setTimeout(up,300);
}
