import ImageGPS from '../gps-editor.js';
const ORIGIN='https://kingspledu.github.io',MAX_BYTES=10*1024*1024;
function respond(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export default {async fetch(request,env){
 const url=new URL(request.url);if(url.pathname==='/health'&&request.method==='GET')return respond({ok:true});
 if(url.pathname!=='/upload')return respond({error:'Not found'},404);
 if(request.headers.get('Origin')!==ORIGIN)return respond({error:'이 페이지에서 업로드해 주세요.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400','Vary':'Origin'}});
 if(request.method!=='POST')return respond({error:'POST required'},405);
 if(!env.GITHUB_TOKEN)return respond({error:'업로드 서버가 준비되지 않았습니다.'},503);
 try{
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 if(!(await env.IP_LIMIT.limit({key:ip})).success||!(await env.TOTAL_LIMIT.limit({key:'uploads'})).success)return respond({error:'업로드가 많습니다. 1분 후 다시 시도해 주세요.'},429);
 const length=Number(request.headers.get('Content-Length'));if(!length||length>MAX_BYTES||length<12)return respond({error:'이미지는 10MB 이하로 선택해 주세요.'},413);
 const reader=request.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();return respond({error:'10MB를 초과했습니다.'},413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let ext;if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)ext='jpg';else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))ext='png';else if(String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP')ext='webp';else return respond({error:'JPG·PNG·WebP 이미지만 올릴 수 있습니다.'},415);
 try{ImageGPS.inspect(bytes);}catch{return respond({error:'손상되었거나 지원되지 않는 이미지입니다.'},415);}
 const path='images/'+new Date().toISOString().slice(0,10)+'/'+crypto.randomUUID()+'.'+ext;
 let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 const result=await fetch('https://api.github.com/repos/kingspledu/blog-prompt-images/contents/'+path,{method:'PUT',headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,'User-Agent':'blog-prompt-helper-upload','Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({message:'Upload public blog image',content:btoa(binary)})});
 if(!result.ok)return respond({error:result.status===403||result.status===429?'GitHub 업로드 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':'GitHub에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'},502);
 const saved=await result.json();return respond({url:'https://raw.githubusercontent.com/kingspledu/blog-prompt-images/'+saved.commit.sha+'/'+path,path},201);
 }catch{return respond({error:'업로드 연결에 실패했습니다. 다시 시도해 주세요.'},502);}
}};