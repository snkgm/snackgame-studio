import {AutoModel,AutoProcessor,RawImage,env} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";
env.allowLocalModels=false;
const MODELS=[{id:"onnx-community/BiRefNet_lite",gpu:true,dtypes:["fp32"],key:"input_image",sig:true,name:"BiRefNet"},{id:"onnx-community/ormbg-ONNX",dtypes:["q8","fp32"],key:"pixel_values",sig:false,name:"ORMBG"}];
const loaded=[];
const say=(id,m)=>postMessage({id,progress:m});
async function get(i,id){
  if(loaded[i])return loaded[i];
  const M=MODELS[i];say(id,`Descargando modelo ${M.name} (solo la primera vez)…`);
  const cb=p=>{if(p.status==="progress"&&p.total)say(id,`Descargando ${M.name}… ${Math.round(p.loaded/p.total*100)}%`)};
  let model,err;
  const devs=M.gpu&&self.navigator&&navigator.gpu?["webgpu","wasm"]:["wasm"];
  for(const dv of devs)for(const d of M.dtypes){try{model=await AutoModel.from_pretrained(M.id,{dtype:d,device:dv,progress_callback:cb});err=null;M.dev=dv;break}catch(x){err=x}if(!err)break}
  if(err)throw err;
  const proc=await AutoProcessor.from_pretrained(M.id);if(M.name==='BiRefNet'&&M.dev==='wasm'&&proc.image_processor)proc.image_processor.size={width:768,height:768};
  return loaded[i]={model,proc,M};
}
self.onmessage=async e=>{
  const {id,blob,only}=e.data;let last;
  for(let i=0;i<MODELS.length;i++){if(MODELS[i].bad||(only&&MODELS[i].name!==only))continue;
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
