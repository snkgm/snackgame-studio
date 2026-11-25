import {Shadow} from "../../vendor/fabric.min.mjs?v=20261126l";
import {loadFont} from "../app/fonts.js?v=20261126l";
export const TEXT_STYLES=[
 {id:"title",name:"Título principal",hint:"Nombres de producto y titulares",sample:"TÍTULO PRINCIPAL",wf:.86,top:.06,p:{fontFamily:"Anton",fontWeight:400,fontSize:112,fill:"#ffffff",textAlign:"center",lineHeight:1,charSpacing:10},sh:{color:"rgba(0,0,0,.45)",blur:18,x:0,y:6}},
 {id:"sub",name:"Subtítulo",hint:"Información secundaria bajo el título",sample:"Subtítulo del producto",wf:.8,top:.2,p:{fontFamily:"Montserrat",fontWeight:600,fontSize:52,fill:"#ffffff",textAlign:"center",lineHeight:1.15,charSpacing:0}},
 {id:"tag",name:"Etiqueta",hint:"NOVEDAD, COLECCIÓN, PRÓXIMAMENTE…",sample:"NOVEDAD",wf:.34,top:.04,p:{fontFamily:"Oswald",fontWeight:700,fontSize:38,fill:"#111111",textAlign:"center",lineHeight:1.1,charSpacing:200,backgroundColor:"#ffc400",padding:14}},
 {id:"body",name:"Texto descriptivo",hint:"Frases breves e información extra",sample:"Una frase breve que complementa la publicación.",wf:.7,top:.78,p:{fontFamily:"Inter",fontWeight:400,fontSize:34,fill:"#ffffff",textAlign:"left",lineHeight:1.35,charSpacing:0}},
 {id:"price",name:"Precio / destacado",hint:"Precios, ofertas y avisos",sample:"17,95 €",wf:.5,top:.86,p:{fontFamily:"Bebas Neue",fontWeight:400,fontSize:130,fill:"#ffc400",textAlign:"center",lineHeight:1,charSpacing:20},sh:{color:"rgba(0,0,0,.5)",blur:14,x:0,y:5}}
];
export const styleProps=(st,W)=>{const k=W/1080,p={...st.p};p.fontSize=Math.round(p.fontSize*k);if(p.padding)p.padding=Math.round(p.padding*k);if(st.sh)p.shadow=new Shadow({color:st.sh.color,blur:Math.round(st.sh.blur*k),offsetX:st.sh.x,offsetY:Math.round(st.sh.y*k)});else p.shadow=null;if(!p.backgroundColor)p.backgroundColor="";if(!p.padding)p.padding=0;return p};
const hx=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(typeof c==="string"?c:"");return m?[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)):null};
export function bgRgb(ed){
  const bl=ed.bgLayer&&ed.bgLayer();
  if(bl&&bl.visible!==false){try{const c=document.createElement("canvas");c.width=c.height=8;const g=c.getContext("2d");g.drawImage(bl.getElement(),0,0,8,8);const d=g.getImageData(0,0,8,8).data;let r=0,gg=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2]}const n=d.length/4;return [r/n,gg/n,b/n]}catch{}}
  return hx(ed.canvas.backgroundColor)||[255,255,255];
}
const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
export function contrastFill(ed,fill){
  const bg=bgRgb(ed),f=hx(fill);
  if(f&&ratio(f,bg)>=3)return fill;
  return ratio([17,17,17],bg)>=ratio([255,255,255],bg)?"#111111":"#ffffff";
}
export async function addStyled(ed,st){
  const p=styleProps(st,ed.W);p.fill=contrastFill(ed,p.fill);await loadFont(p.fontFamily,p.fontWeight);
  const w=Math.round(ed.W*st.wf);
  const o=ed.addText({text:st.sample,name:st.name,top:Math.round(ed.H*st.top),props:{...p,width:w}});
  o.set({left:Math.round((ed.W-w)/2)});o.initDimensions?.();o.setCoords();ed.canvas.requestRenderAll();ed.commit();return o;
}
export async function restyle(ed,o,st){
  const p=styleProps(st,ed.W);p.fill=contrastFill(ed,p.fill);await loadFont(p.fontFamily,p.fontWeight);o.set(p);o.initDimensions?.();o.setCoords();ed.canvas.requestRenderAll();ed.commit();
}
