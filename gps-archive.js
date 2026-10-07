/* Batch download archive, ZIP STORE (UTF-8, no image recompression). */
(function(root){
'use strict';
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
async function zip(entries,onProgress=()=>{},isCurrent=()=>true){
 const parts=[],directory=[];let offset=0;const now=new Date();const year=Math.max(1980,Math.min(2107,now.getFullYear()));const date=((year-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();const time=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2);
 for(let i=0;i<entries.length;i++){
  if(!isCurrent())throw new Error('파일이나 좌표가 변경되어 ZIP 생성을 중단했습니다.');
  const entry=entries[i],name=new TextEncoder().encode(entry.name),data=new Uint8Array(await entry.blob.arrayBuffer());const checksum=crc(data),size=data.length;
  const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(10,time,true);lv.setUint16(12,date,true);lv.setUint32(14,checksum,true);lv.setUint32(18,size,true);lv.setUint32(22,size,true);lv.setUint16(26,name.length,true);local.set(name,30);parts.push(local,entry.blob);
  const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(12,time,true);cv.setUint16(14,date,true);cv.setUint32(16,checksum,true);cv.setUint32(20,size,true);cv.setUint32(24,size,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=local.length+size;onProgress(i+1,entries.length);await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(!isCurrent())throw new Error('파일이나 좌표가 변경되어 ZIP 생성을 중단했습니다.');
 const length=directory.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
}
root.ImageArchive={zip};
})(globalThis);