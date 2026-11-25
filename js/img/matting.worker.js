import {AutoModel,AutoProcessor,RawImage,env} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";
env.allowLocalModels=false;
const MODELS=[{id:"onnx-community/BiRefNet_lite",dtypes:["fp32"],key:"input_image",sig:true,name:"BiRefNet"},{id:"onnx-community/ormbg-ONNX",dtypes:["q8","fp32"],key:"pixel_values",sig:false,name:"ORMBG"}];
const loaded=[];
const say=(id,m)=>postMessage({id,progress:m});
async function get(i,id){
  if(loaded[i])return loaded[i];
  const M=MODELS[i];say(id,`Descargando modelo ${M.name} (solo la primera vez)…`);
  const cb=p=>{if(p.status==="progress"&&p.total)say(id,`Descargando ${M.name}… ${Math.round(p.loaded/p.total*100)}%`)};
  let model,err;
  for(const d of M.dtypes){try{model=await AutoModel.from_pretrained(M.id,{dtype:d,progress_callback:cb});err=null;break}catch(x){err=x}}
  if(err)throw err;
  return loaded[i]={model,proc:await AutoProcessor.from_pretrained(M.id),M};
}
self.onmessage=async e=>{
  const {id,blob}=e.data;let last;
  for(let i=0;i<MODELS.length;i++){if(MODELS[i].bad)continue;
    try{
      const {model,proc,M}=await get(i,id);
      say(id,`Recortando producto (${M.name})…`);
      const img=await RawImage.fromBlob(blob),{pixel_values}=await proc(img),out=await model({[M.key]:pixel_values});
      let t=Object.values(out)[0];t=t[0];if(M.sig)t=t.sigmoid();
      const m=await RawImage.fromTensor(t.mul(255).to("uint8")).resize(img.width,img.height),mask=new Uint8Array(m.data);
      return postMessage({id,mask,w:img.width,h:img.height},[mask.buffer]);
    }catch(err){last=err;loaded[i]=null;MODELS[i].bad=true}
  }
  postMessage({id,error:String(last&&last.message||last)});
};
