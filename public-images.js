/* Anonymous public image upload. Credentials exist only in the upload server. */
(function(root){
const endpoint='https://blog-prompt-image-upload.blog-prompt-helper.workers.dev/upload';
function validURL(value){try{const u=new URL(value);return u.origin==='https://raw.githubusercontent.com'&&/^\/kingspledu\/blog-prompt-images\/[a-f0-9]{40}\/images\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.(jpg|png|webp)$/.test(u.pathname)&&!u.search&&!u.hash;}catch{return false;}}
async function upload(blob){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000);try{const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':blob.type},body:blob,signal:controller.signal});const value=await result.json();if(!result.ok)throw new Error(value.error||'공개 이미지 업로드에 실패했습니다.');if(!validURL(value.url))throw new Error('서버에서 반환한 이미지 주소가 올바르지 않습니다.');return value.url;}catch(error){if(error.name==='AbortError')throw new Error('업로드 시간이 초과되었습니다. 다시 시도해 주세요.');throw error;}finally{clearTimeout(timeout);}}
root.PublicImages={upload,validURL};
})(globalThis);