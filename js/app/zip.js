const T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc=u=>{let c=~0;for(let i=0;i<u.length;i++)c=T[(c^u[i])&255]^(c>>>8);return(~c)>>>0};
export async function zipBlobs(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  for(const f of files){
    const data=new Uint8Array(await f.blob.arrayBuffer()),name=enc.encode(f.name),c=crc(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint32(14,c,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
    parts.push(h.buffer,name,data);
    const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint32(16,c,true);e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,off,true);
    cen.push(e.buffer,name);off+=30+name.length+data.length;
  }
  const csz=cen.reduce((a,b)=>a+b.byteLength,0);
  const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,csz,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cen,end.buffer],{type:"application/zip"});
}
