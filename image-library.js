/* Device-local saved image library. Blobs and contact settings stay in IndexedDB. */
(function(root){
'use strict';
let opening;
function open(){if(!opening)opening=new Promise((resolve,reject)=>{if(!root.indexedDB){reject(new Error('이 브라우저에서는 이미지 보관함을 저장할 수 없습니다.'));return;}const request=indexedDB.open('blog-prompt-helper-library',1);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('images',{keyPath:'id'});db.createObjectStore('settings');};request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=null;};resolve(request.result);};request.onerror=()=>{opening=null;reject(request.error);};request.onblocked=()=>{opening=null;reject(new Error('다른 탭을 닫은 뒤 이미지 보관함을 다시 열어 주세요.'));};});return opening;}
async function transaction(storeName,mode,operation){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,mode);let result;try{operation(tx.objectStore(storeName),value=>{result=value;});}catch(error){tx.abort();reject(error);return;}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error('보관함 저장에 실패했습니다.'));tx.onabort=()=>reject(tx.error||new Error('보관함 저장이 중단되었습니다.'));});}
function all(){return transaction('images','readonly',(store,set)=>{store.getAll().onsuccess=e=>set(e.target.result);});}
function add(record){return transaction('images','readwrite',store=>store.add(record));}
function update(id,patch){return transaction('images','readwrite',(store,set)=>{store.get(id).onsuccess=e=>{const previous=e.target.result;if(!previous){store.transaction.abort();return;}const next={...previous,...patch};store.put(next);set(next);};});}
function remove(id){return transaction('images','readwrite',store=>store.delete(id));}
function setting(key,value){return transaction('settings',value===undefined?'readonly':'readwrite',(store,set)=>{if(value===undefined)store.get(key).onsuccess=e=>set(e.target.result);else store.put(value,key);});}
root.SavedImageLibrary={all,add,update,remove,setting};
})(globalThis);