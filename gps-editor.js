/* ImageGPS: lossless container metadata edits for JPEG, PNG and WebP. */
(function(root){
'use strict';
const ascii=(bytes,start=0,end=bytes.length)=>String.fromCharCode(...bytes.subarray(start,end));
const text=s=>new TextEncoder().encode(s);
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;};
const view=bytes=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
const check=(condition,message='손상되었거나 지원되지 않는 이미지 구조입니다.')=>{if(!condition)throw new Error(message);};
const exifPrefix=bytes=>bytes.length>=6&&ascii(bytes,0,6)==='Exif\0\0';
function tiffInfo(bytes){
 check(bytes.length>=8);const order=ascii(bytes,0,2);check(order==='II'||order==='MM','지원되지 않는 EXIF 바이트 순서입니다.');const little=order==='II',v=view(bytes);check(v.getUint16(2,little)===42,'지원되지 않는 EXIF 형식입니다.');
 const u16=p=>{check(p>=0&&p+2<=bytes.length);return v.getUint16(p,little);};
 const u32=p=>{check(p>=0&&p+4<=bytes.length);return v.getUint32(p,little);};
 function ifd(offset){check(offset>=8);const count=u16(offset);check(offset+2+count*12+4<=bytes.length);const entries=[];for(let i=0;i<count;i++){const p=offset+2+i*12;entries.push({p,tag:u16(p),type:u16(p+2),count:u32(p+4),value:u32(p+8)});}return {offset,count,entries,next:u32(offset+2+count*12)};}
 const first=u32(4);const primary=ifd(first);return {bytes,v,little,u16,u32,ifd,first,primary};
}
function readGPS(tiff){
 if(!tiff)return null;const info=tiffInfo(tiff);const pointer=info.primary.entries.find(e=>e.tag===34853);if(!pointer||!pointer.value)return null;
 const gps=info.ifd(pointer.value);const byTag=tag=>gps.entries.find(e=>e.tag===tag);
 function coordinate(tag,reference){const e=byTag(tag),ref=byTag(reference);if(!e||!ref||e.type!==5||e.count!==3)return null;check(e.value+24<=tiff.length);let value=0;for(let i=0;i<3;i++){const den=info.u32(e.value+i*8+4);check(den!==0,'GPS 분모가 0인 손상된 EXIF입니다.');value+=(info.u32(e.value+i*8)/den)/[1,60,3600][i];}const direction=String.fromCharCode(tiff[ref.p+8]);return ['S','W'].includes(direction)?-value:value;}
 const lat=coordinate(2,1),lon=coordinate(4,3);return {lat,lon,hasGPS:true};
}
function updateTIFF(input,mode,lat,lon){
 let original=input?input.slice():new Uint8Array([73,73,42,0,8,0,0,0,0,0,0,0,0,0]);const info=tiffInfo(original);const {little}=info;
 const sizes={1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8,13:4};
 const queue=[info.first],visited=new Set();
 while(queue.length){const offset=queue.shift();if(!offset||visited.has(offset))continue;visited.add(offset);check(visited.size<=100,'EXIF 디렉터리 수가 너무 많습니다.');const current=info.ifd(offset);if(current.next)queue.push(current.next);
  for(const e of current.entries){
   if([34665,40965].includes(e.tag)&&e.type===4&&e.count===1)queue.push(e.value);
   if(e.tag===330&&e.type===4){if(e.count===1)queue.push(e.value);else{check(e.count<100&&e.value+e.count*4<=original.length);for(let i=0;i<e.count;i++)queue.push(info.u32(e.value+i*4));}}
   if(e.tag!==34853)continue;
   check(e.type===4&&e.count===1,'지원되지 않는 GPS 디렉터리입니다.');
   if(e.value){const gps=info.ifd(e.value);for(const g of gps.entries){check(sizes[g.type]!==undefined,'지원되지 않는 GPS 태그 형식입니다.');const length=sizes[g.type]*g.count;check(length<=original.length);if(length>4){check(g.value>=8&&g.value+length<=original.length);original.fill(0,g.value,g.value+length);}}
    original.fill(0,gps.offset,gps.offset+2+gps.count*12+4);
   }
  }
  const keep=current.entries.filter(e=>e.tag!==34853).map(e=>original.slice(e.p,e.p+12));let p=offset+2;for(const entry of keep){original.set(entry,p);p+=12;}info.v.setUint16(offset,keep.length,little);info.v.setUint32(p,current.next,little);original.fill(0,p+4,offset+2+current.count*12+4);
 }
 if(mode==='remove')return input?original:null;
 check(Number.isFinite(lat)&&lat>=-90&&lat<=90&&Number.isFinite(lon)&&lon>=-180&&lon<=180,'위도는 -90~90, 경도는 -180~180 범위의 숫자를 입력해 주세요.');
 const base=tiffInfo(original),entries=base.primary.entries.map(e=>original.slice(e.p,e.p+12));const rootOffset=original.length+(original.length%2);const rootSize=2+(entries.length+1)*12+4;const gpsOffset=rootOffset+rootSize;const rationalsOffset=gpsOffset+2+5*12+4;const out=new Uint8Array(rationalsOffset+48);out.set(original);const v=view(out);
 const w16=(p,n)=>v.setUint16(p,n,little),w32=(p,n)=>v.setUint32(p,n,little);
 const gpsPointer=new Uint8Array(12),pv=view(gpsPointer);pv.setUint16(0,34853,little);pv.setUint16(2,4,little);pv.setUint32(4,1,little);pv.setUint32(8,gpsOffset,little);entries.push(gpsPointer);entries.sort((a,b)=>view(a).getUint16(0,little)-view(b).getUint16(0,little));w32(4,rootOffset);w16(rootOffset,entries.length);entries.forEach((entry,i)=>out.set(entry,rootOffset+2+i*12));w32(rootOffset+2+entries.length*12,base.primary.next);
 w16(gpsOffset,5);
 const put=(i,tag,type,count,value)=>{const p=gpsOffset+2+i*12;w16(p,tag);w16(p+2,type);w32(p+4,count);if(Array.isArray(value))out.set(value,p+8);else w32(p+8,value);};
 put(0,0,1,4,[2,3,0,0]);put(1,1,2,2,[lat<0?83:78,0]);put(2,2,5,3,rationalsOffset);put(3,3,2,2,[lon<0?87:69,0]);put(4,4,5,3,rationalsOffset+24);w32(gpsOffset+62,0);
 function dms(value,offset){const total=Math.round(Math.abs(value)*3600*1000000);const degrees=Math.floor(total/3600000000),minutes=Math.floor((total-degrees*3600000000)/60000000),seconds=total-degrees*3600000000-minutes*60000000;[degrees,minutes,seconds].forEach((n,i)=>{w32(offset+i*8,n);w32(offset+i*8+4,i===2?1000000:1);});}
 dms(lat,rationalsOffset);dms(lon,rationalsOffset+24);return out;
}
function jpegParts(bytes){check(bytes[0]===255&&bytes[1]===216);const parts=[];let p=2;while(p<bytes.length){const start=p;check(bytes[p]===255);while(bytes[p]===255)p++;const marker=bytes[p++];check(marker!==undefined);if(marker===218||marker===217){parts.push({marker,raw:bytes.subarray(start),data:bytes.subarray(p)});return parts;}check(marker!==0&&marker!==216&&!(marker>=208&&marker<=215));const length=(bytes[p]<<8)|bytes[p+1];check(length>=2&&p+length<=bytes.length);parts.push({marker,raw:bytes.subarray(start,p+length),data:bytes.subarray(p+2,p+length)});p+=length;}throw new Error('JPEG 이미지 데이터가 없습니다.');}
function jpegEXIF(tiff){const data=join([text('Exif\0\0'),tiff]);check(data.length+2<=65535,'수정된 EXIF가 JPEG 메타데이터 크기 제한을 초과했습니다.');return join([new Uint8Array([255,225,(data.length+2)>>8,(data.length+2)&255]),data]);}
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function pngParts(bytes){check(bytes.length>=8&&ascii(bytes,1,4)==='PNG');let p=8;const parts=[];while(p+12<=bytes.length){const size=view(bytes).getUint32(p);check(p+size+12<=bytes.length);const type=ascii(bytes,p+4,p+8),data=bytes.subarray(p+8,p+8+size),raw=bytes.subarray(p,p+12+size);check(view(bytes).getUint32(p+8+size)===crc(bytes.subarray(p+4,p+8+size)),'PNG 파일의 체크섬이 손상되었습니다.');parts.push({type,data,raw});p+=size+12;if(type==='IEND'){check(p===bytes.length);return parts;}}throw new Error('PNG 이미지가 완전하지 않습니다.');}
function pngChunk(type,data){const result=new Uint8Array(data.length+12),v=view(result);v.setUint32(0,data.length);result.set(text(type),4);result.set(data,8);v.setUint32(data.length+8,crc(result.subarray(4,data.length+8)));return result;}
function webpParts(bytes){check(bytes.length>=12&&ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,12)==='WEBP');check(view(bytes).getUint32(4,true)+8===bytes.length);let p=12;const parts=[];while(p+8<=bytes.length){const size=view(bytes).getUint32(p+4,true);check(p+8+size+(size%2)<=bytes.length);parts.push({type:ascii(bytes,p,p+4),data:bytes.subarray(p+8,p+8+size),raw:bytes.subarray(p,p+8+size+(size%2))});p+=8+size+(size%2);}check(p===bytes.length);return parts;}
function webpChunk(type,data){const out=new Uint8Array(8+data.length+(data.length%2));out.set(text(type));view(out).setUint32(4,data.length,true);out.set(data,8);return out;}
function format(bytes){if(bytes[0]===255&&bytes[1]===216)return 'jpeg';if(bytes.length>=8&&ascii(bytes,0,8)==='\x89PNG\r\n\x1a\n')return 'png';if(bytes.length>=12&&ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,12)==='WEBP')return 'webp';throw new Error('JPG, PNG, WebP 파일을 선택해 주세요. HEIC·GIF 등은 지원하지 않습니다.');}
function getExifData(kind,parts){const part=kind==='jpeg'?parts.find(p=>p.marker===225&&exifPrefix(p.data)):parts.find(p=>p.type===(kind==='png'?'eXIf':'EXIF'));return part?(exifPrefix(part.data)?part.data.subarray(6):part.data):null;}
function dimensions(parts){const image=parts.find(p=>p.type==='VP8 '||p.type==='VP8L');check(image,'WebP 이미지 크기를 읽을 수 없습니다.');const b=image.data;if(image.type==='VP8 '){check(b.length>=10&&b[3]===157&&b[4]===1&&b[5]===42);return {width:(b[6]|b[7]<<8)&16383,height:(b[8]|b[9]<<8)&16383,alpha:parts.some(p=>p.type==='ALPH')};}check(b.length>=5&&b[0]===47);const packed=view(b).getUint32(1,true);return {width:(packed&16383)+1,height:((packed>>>14)&16383)+1,alpha:Boolean(packed&0x10000000)};}
function inspect(bytes){const kind=format(bytes),parts=kind==='jpeg'?jpegParts(bytes):kind==='png'?pngParts(bytes):webpParts(bytes);return {kind,gps:readGPS(getExifData(kind,parts))};}
function edit(bytes,{mode='remove',lat,lon}={}){
 check(mode==='remove'||mode==='set');const kind=format(bytes),parts=kind==='jpeg'?jpegParts(bytes):kind==='png'?pngParts(bytes):webpParts(bytes);const before=readGPS(getExifData(kind,parts));let removedXMP=0,output;
 if(kind==='jpeg'){
  let wrote=false;const result=[bytes.subarray(0,2)];for(const part of parts){
   if(part.marker===225&&exifPrefix(part.data)){result.push(jpegEXIF(updateTIFF(part.data.subarray(6),mode,lat,lon)));wrote=true;continue;}
   if(part.marker===225&&ascii(part.data,0,Math.min(35,part.data.length)).startsWith('http://ns.adobe.com/')){removedXMP++;continue;}
   if(!wrote&&mode==='set'&&(part.marker===218||part.marker===217)){result.push(jpegEXIF(updateTIFF(null,mode,lat,lon)));wrote=true;}
   result.push(part.raw);
  }output=join(result);
 }else if(kind==='png'){
  let wrote=false;const result=[bytes.subarray(0,8)];for(const part of parts){
   if(part.type==='eXIf'){const tiff=exifPrefix(part.data)?part.data.subarray(6):part.data;result.push(pngChunk('eXIf',updateTIFF(tiff,mode,lat,lon)));wrote=true;continue;}
   if(['iTXt','tEXt','zTXt'].includes(part.type)&&ascii(part.data,0,Math.min(part.data.length,30)).startsWith('XML:com.adobe.xmp\0')){removedXMP++;continue;}
   if(!wrote&&mode==='set'&&part.type==='IHDR'){result.push(part.raw,pngChunk('eXIf',updateTIFF(null,mode,lat,lon)));wrote=true;continue;}
   result.push(part.raw);
  }output=join(result);
 }else{
  const result=[];let wrote=false;const hasExif=mode==='set'||parts.some(p=>p.type==='EXIF');const hasVP8X=parts.some(p=>p.type==='VP8X');
  if(!hasVP8X&&hasExif){const d=dimensions(parts);const extended=new Uint8Array(10);extended[0]=8|(d.alpha?16:0);const w=d.width-1,h=d.height-1;extended.set([w&255,(w>>8)&255,(w>>16)&255,h&255,(h>>8)&255,(h>>16)&255],4);result.push(webpChunk('VP8X',extended));}
  for(const part of parts){
   if(part.type==='EXIF'){const prefixed=exifPrefix(part.data);const updated=updateTIFF(prefixed?part.data.subarray(6):part.data,mode,lat,lon);result.push(webpChunk('EXIF',prefixed?join([text('Exif\0\0'),updated]):updated));wrote=true;continue;}
   if(part.type==='XMP '){removedXMP++;continue;}
   if(part.type==='VP8X'){check(part.data.length===10);const updated=part.data.slice();updated[0]=(updated[0]&~12)|(hasExif?8:0);result.push(webpChunk('VP8X',updated));continue;}
   result.push(part.raw);
  }if(!wrote&&mode==='set')result.push(webpChunk('EXIF',updateTIFF(null,mode,lat,lon)));const body=join([text('WEBP'),...result]);const header=new Uint8Array(8);header.set(text('RIFF'));view(header).setUint32(4,body.length,true);output=join([header,body]);
 }
 const after=inspect(output);check(mode==='remove'?!after.gps:after.gps&&Math.abs(after.gps.lat-lat)<0.000001&&Math.abs(after.gps.lon-lon)<0.000001,'GPS 변경 결과를 검증하지 못했습니다.');return {bytes:output,kind,before,after:after.gps,removedXMP};
}
const api={inspect,edit};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ImageGPS=api;
})(globalThis);