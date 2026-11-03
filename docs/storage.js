export const MAX_BYTES=200*1024*1024,MAX_FILES=30;
let opening;
export function openDB(){
 if(!opening)opening=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('端末内保存（IndexedDB）が利用できません'));return}
  const request=indexedDB.open('infinite-shorts-canvas-v1',1);
  request.onupgradeneeded=()=>{for(const name of ['meta','videos'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'})};
  request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=null};resolve(request.result)};
  request.onerror=()=>{opening=null;reject(Error('端末内保存を開けません。Safariの容量・プライベートブラウズ設定を確認してください'))};
  request.onblocked=()=>reject(Error('別タブのアプリを閉じて再読み込みしてください'));
 });return opening;
}
export async function list(){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction('meta').objectStore('meta').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.created-a.created));r.onerror=()=>reject(r.error)})}
export async function get(id){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction('videos').objectStore('videos').get(id);r.onsuccess=()=>r.result?resolve(r.result.blob):reject(Error('動画が見つかりません。Safariのデータが削除された可能性があります'));r.onerror=()=>reject(r.error)})}
export async function put(meta,blob){
 const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['meta','videos'],'readwrite');let message='';
  const request=tx.objectStore('meta').getAll();request.onsuccess=()=>{const all=request.result;if(all.length>=MAX_FILES||all.reduce((s,m)=>s+m.size,0)+blob.size>MAX_BYTES){message='端末内保存の上限です。不要な動画を削除してください';tx.abort();return}tx.objectStore('meta').put(meta);tx.objectStore('videos').put({id:meta.id,blob})};
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(Error(message||'端末内保存に失敗しました。容量を空けてください'));tx.onerror=()=>{};
 });
}
export async function remove(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(['meta','videos'],'readwrite');tx.objectStore('meta').delete(id);tx.objectStore('videos').delete(id);tx.oncomplete=resolve;tx.onabort=()=>reject(Error('削除できませんでした'))})}
export async function updateMetadata(id,patch){
 const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction('meta','readwrite'),meta=tx.objectStore('meta'),request=meta.get(id);
  request.onsuccess=()=>{if(!request.result){tx.abort();return}meta.put({...request.result,...patch,id})};tx.oncomplete=resolve;tx.onabort=()=>reject(Error('品質メモを保存できませんでした'));
 });
}
