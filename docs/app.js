import {capability,pickTypes,scene,record,inspect,newSeed,LABELS,GENRES} from './engine.js';
import * as store from './storage.js';
const $=id=>document.getElementById(id),canvas=$('canvas');
let genre='ball',active=false,controller=null,retryTasks=[],verified='',previewRAF=0,previewScene=scene('ball',2026),previewStart=performance.now(),lastPreview=previewStart;
let playerURL='',playerId='',playerFile=null,recoveryURL='',recoveryFile=null,recoveryMeta=null,wakeLock=null,library=[],supported=false,storageReady=false;
const signature=s=>JSON.stringify([s.width,s.duration,s.bgm,s.sfx,s.caption]);
const config=()=>({genre,width:Number($('resolution').value),duration:Number($('duration').value),bgm:$('bgm').value,sfx:$('sfx').checked,caption:$('caption').checked});
const name=meta=>`infinite-${meta.genre}-${meta.id}.mp4`;
function error(message){$('error').textContent=message}
function updateButtons(){
 $('settings').disabled=active;$('single').disabled=active||!supported||!storageReady||!!recoveryFile;$('batch').disabled=active||!supported||!storageReady||!!recoveryFile||verified!==signature(config());$('stop').disabled=!active;$('retry').disabled=active||!retryTasks.length||!!recoveryFile||!supported||!storageReady;
 $('stage').textContent=verified===signature(config())?'1本の録画・MP4読み込み・端末内保存を確認済み。この設定で10本を試せます。':'同じ解像度・尺・音声設定で1本が完成すると、10本生成を選べます。';
}
function preview(now){
 if(!active && !document.hidden){previewScene.draw(canvas.getContext('2d'),canvas.width,canvas.height,(now-previewStart)/1000,Math.min((now-lastPreview)/1000,.06),$('caption').checked)}lastPreview=now;previewRAF=requestAnimationFrame(preview);
}
function resetPreview(){if(active)return;const s=config();canvas.width=s.width;canvas.height=s.width*16/9;$('format').textContent=`${canvas.width} × ${canvas.height}`;previewScene=scene(genre==='random'?'ball':genre,newSeed());previewStart=performance.now();lastPreview=previewStart;updateButtons()}
document.querySelectorAll('[data-genre]').forEach(button=>button.onclick=()=>{if(active)return;genre=button.dataset.genre;document.querySelectorAll('[data-genre],#random').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});resetPreview()});
$('random').onclick=()=>{if(active)return;genre='random';document.querySelectorAll('[data-genre],#random').forEach(b=>{const selected=b.id==='random';b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});resetPreview()};
for(const id of ['resolution','duration','bgm','sfx','caption'])$(id).onchange=resetPreview;
function makeTasks(count){const s=config();return Array.from({length:count},()=>{const seed=newSeed();return {...s,genre:s.genre==='random'?GENRES[seed%GENRES.length]:s.genre,seed,id:`${Date.now().toString(36)}-${seed.toString(36)}-${newSeed().toString(36)}`}})}
async function start(tasks){
 if(active||!supported||!storageReady||recoveryFile)return;
 // Start/resume audio in this click handler, before any IndexedDB await.
 let context=null,resume=null;const audioWanted=tasks.some(s=>s.sfx||s.bgm!=='off');
 try{if(audioWanted){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('音声合成に対応していません。BGMと効果音をOFFにしてください');context=new Audio();resume=context.resume()}}catch(e){error(e.message);return}
 active=true;controller=new AbortController();retryTasks=tasks.slice();updateButtons();error('');closePlayer();let done=0;const total=tasks.length;$('progress').value=0;$('counter').textContent=`0 / ${total}`;
 try{
  if(resume)await resume;
  if(navigator.wakeLock?.request)try{wakeLock=await navigator.wakeLock.request('screen')}catch{}
  while(retryTasks.length){
   if(controller.signal.aborted)throw controller.signal.reason;
   const task=retryTasks[0];$('status').textContent=`${done+1} / ${total}本目を録画しています。Safariを前面にしてください。`;
   const blob=await record(canvas,task,{signal:controller.signal,audioContext:context,onProgress:p=>{$('progress').value=(done+p/100)/total*100;$('counter').textContent=`${done} / ${total} 完成 · 録画 ${Math.floor(p)}%`}});
   if(controller.signal.aborted)throw controller.signal.reason;
   $('status').textContent=`${done+1}本目のMP4を確認・保存しています…`;
   const info=await inspect(blob);
   if(info.width!==task.width||info.height!==task.width*16/9)throw Error(`指定した解像度で録画されませんでした（${info.width}×${info.height}）。低い解像度で再試行してください。`);
   const meta={id:task.id,genre:task.genre,seed:task.seed,width:info.width,height:info.height,duration:task.duration,created:Date.now(),size:blob.size,title:`${LABELS[task.genre]} #${String(task.seed%10000).padStart(4,'0')}`,tags:`#Shorts #オリジナル #${{ball:'物理演算',asmr:'ASMR',meme:'シュール',domino:'連鎖反応'}[task.genre]}`};
   try{await store.put(meta,blob)}catch(e){showRecovery(meta,blob);retryTasks.shift();throw Error(e.message+' 今回の1本は下の保存ボタンから退避できます。')}
   retryTasks.shift();done++;verified=signature(task);$('progress').value=done/total*100;$('counter').textContent=`${done} / ${total} 完成`;await refreshLibrary();
   if(done<total)await new Promise(resolve=>setTimeout(resolve,150));
  }
  $('status').textContent=`${done}本が完成しました。「再生・保存」からファイルに保存できます。`;
 }catch(e){
  $('status').textContent=`完成 ${done}本 / 未完了 ${retryTasks.length}本。完成済みの動画は残っています。`;
  error(e?.message||String(e));
 }finally{
  try{await context?.close()}catch{}try{await wakeLock?.release()}catch{}wakeLock=null;active=false;controller=null;updateButtons();lastPreview=performance.now();
 }
}
$('single').onclick=()=>start(makeTasks(1));$('batch').onclick=()=>{if(verified===signature(config()))start(makeTasks(10))};$('retry').onclick=()=>start(retryTasks.slice());
function stop(message='停止しました。録画途中の1本は破棄しました。再試行で未完了分から続けられます。'){if(active)controller?.abort(new DOMException(message,'AbortError'))}
$('stop').onclick=()=>stop();document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Safariが非表示になったため停止しました。前面に戻して再試行してください。')});window.addEventListener('pagehide',()=>{stop();closePlayer()});
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n}
async function refreshLibrary(){
 library=await store.list();$('total').textContent=library.length;$('storage').textContent=`${(library.reduce((s,m)=>s+m.size,0)/1024/1024).toFixed(1)} / 200 MiB`;
 const parent=$('jobs');parent.replaceChildren();if(!library.length){const empty=node('div','まだ動画はありません。まず1本、作ってみましょう。');empty.className='empty';parent.append(empty);return}
 for(const meta of library){const card=node('article');card.className='card';card.dataset.id=meta.id;const thumb=node('div',{ball:'◉',asmr:'◎',meme:'✧',domino:'▥'}[meta.genre]);thumb.className='thumb';card.append(thumb,node('h3',meta.title),node('p',`${meta.width} × ${meta.height} · ${meta.duration}秒 · ${(meta.size/1024/1024).toFixed(1)}MiB`),node('p',meta.tags));
  const view=node('button','▷ 再生・保存');view.type='button';view.onclick=async()=>{view.disabled=true;try{await openPlayer(meta)}catch(e){error(e.message)}finally{view.disabled=false}};card.append(view);
  const copy=node('button','タイトル・タグをコピー');copy.type='button';copy.onclick=async()=>{const text=meta.title+'\n'+meta.tags;try{await navigator.clipboard.writeText(text);copy.textContent='コピーしました'}catch{window.prompt('コピーしてください',text)}};card.append(copy);
  const del=node('button','削除して容量を空ける');del.className='delete';del.type='button';del.onclick=async()=>{if(!window.confirm('この端末内の動画を削除しますか？「ファイル」に保存した動画は削除されません。'))return;try{if(playerId===meta.id)closePlayer();await store.remove(meta.id);await refreshLibrary()}catch(e){error(e.message)}};card.append(del);parent.append(card);
 }
}
function closePlayer(){const video=$('player');video.pause();video.removeAttribute('src');video.load();if(playerURL)URL.revokeObjectURL(playerURL);playerURL='';playerId='';playerFile=null;$('download-file').removeAttribute('href');$('player-panel').hidden=true}
async function openPlayer(meta){
 closePlayer();const blob=await store.get(meta.id);playerURL=URL.createObjectURL(blob);playerId=meta.id;playerFile=new File([blob],name(meta),{type:'video/mp4'});$('player').src=playerURL;$('player-title').textContent=meta.title;$('download-file').href=playerURL;$('download-file').download=name(meta);$('player-panel').hidden=false;
 const share=!!(navigator.canShare&&navigator.share&&navigator.canShare({files:[playerFile]}));$('save-file').disabled=!share;$('save-hint').textContent=share?'「共有からファイルに保存」を押し、共有シートで「ファイルに保存」を選びます。':'ファイル共有に非対応です。「MP4をダウンロード」を押してください。';$('player-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function shareFile(file){if(!file)return;try{navigator.share({files:[file]}).catch(e=>{if(e.name!=='AbortError')error('共有できませんでした。「MP4をダウンロード」を使用してください。')})}catch{error('共有できませんでした。「MP4をダウンロード」を使用してください。')}}
$('save-file').onclick=()=>shareFile(playerFile);$('close-player').onclick=closePlayer;
function showRecovery(meta,blob){
 if(recoveryURL)URL.revokeObjectURL(recoveryURL);recoveryURL=URL.createObjectURL(blob);recoveryMeta=meta;recoveryFile=new File([blob],name(meta),{type:'video/mp4'});$('recovery').hidden=false;$('recover-download').href=recoveryURL;$('recover-download').download=name(meta);$('recover-share').disabled=!(navigator.canShare&&navigator.canShare({files:[recoveryFile]}));updateButtons();
}
$('recover-share').onclick=()=>shareFile(recoveryFile);
// Explicit acknowledgement prevents losing the only in-memory copy after a quota error.
const recoveryDone=node('button','保存できたので、この一時動画を破棄する');recoveryDone.type='button';recoveryDone.onclick=()=>{if(!confirm('ファイルに保存できたことを確認しましたか？'))return;if(recoveryURL)URL.revokeObjectURL(recoveryURL);recoveryURL='';recoveryFile=null;recoveryMeta=null;$('recover-download').removeAttribute('href');$('recovery').hidden=true;updateButtons()};$('recovery').append(recoveryDone);
async function boot(){
 const reason=capability();supported=!reason;$('support').classList.toggle('bad',!!reason);$('support').textContent=reason||`MP4録画APIに対応しています。実際の録画・保存は「まず1本」で確認します。`;
 try{await store.openDB();await refreshLibrary();storageReady=true}catch(e){error(e.message)}
 $('status').textContent=supported&&storageReady?'まず低解像度で1本を生成してください。':'録画を開始できません。対応状況・エラーを確認してください。';updateButtons();resetPreview();previewRAF=requestAnimationFrame(preview);
}
boot();
