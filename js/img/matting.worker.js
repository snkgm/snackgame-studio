import {AutoModel,AutoProcessor,RawImage,env} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";
env.allowLocalModels=false;
const MODEL="onnx-community/ormbg-ONNX";
let model,proc;
const say=(id,m)=>postMessage({id,progress:m});
self.onmessage=async e=>{
  const {id,blob}=e.data;
  try{
    if(!model){
      say(id,"Descargando modelo (solo la primera vez)…");
      const cb=p=>{if(p.status==="progress"&&p.total)say(id,`Descargando modelo… ${Math.round(p.loaded/p.total*100)}%`)};
      const opts=[{dtype:"q8",progress_callback:cb},{dtype:"fp32",progress_callback:cb}];
      let err;
      for(const o of opts){try{model=await AutoModel.from_pretrained(MODEL,o);err=null;break}catch(x){err=x}}
      if(err)throw err;
      proc=await AutoProcessor.from_pretrained(MODEL);
    }
    say(id,"Recortando producto…");
    const img=await RawImage.fromBlob(blob);
    const {pixel_values}=await proc(img);
    const names=model.session?.inputNames||["input"];
    const out=await model({[names[0]]:pixel_values});
    const t=Object.values(out)[0];
    const m=await RawImage.fromTensor(t[0].mul(255).to("uint8")).resize(img.width,img.height);
    const mask=new Uint8Array(m.data);
    postMessage({id,mask,w:img.width,h:img.height},[mask.buffer]);
  }catch(err){postMessage({id,error:String(err&&err.message||err)})}
};
