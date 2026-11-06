import {ARCHETYPES} from './remix/design.js';
import {mountRemix} from './remix/ui.js?v=remix1';
import {mountCustomControls} from './custom-controls.js?v=custom1';
import {mountStageEditor} from './stage-editor.js?v=custom1';
import {normalizeCustom} from './custom-physics.js';
import {CATALOG,templatesFor,templateFor,englishMetadata,productionAssessment} from './catalog.js?v=remix1';
import {mountResearch} from './research-ui.js';
import {mountAnalytics} from './insights.js';
import {capability,pickTypes,createAudio,scene,record,inspect,newSeed,rng,simulationDigest,LABELS,GENRES} from './engine.js?v=remix1';
import * as store from './storage.js?v=global60';
const $=id=>document.getElementById(id),canvas=$('canvas');
let previewAudio=null,previewContext=null,previewTime=-.001;
let selectedEngineVersion='viral-3';
let genre='ball',active=false,controller=null,retryTasks=[],verified='',previewRAF=0,previewScene=scene('ball',2026),previewStart=performance.now(),lastPreview=previewStart;
let playerRequest=0,playerURL='',playerId='',playerFile=null,recoveryURL='',recoveryFile=null,recoveryMeta=null,wakeLock=null,library=[],supported=false,storageReady=false;
const signature=s=>JSON.stringify([s.width,s.duration,s.bgm,s.sfx,s.caption,s.customSettings||null]);
const config=()=>({genre,engineVersion:selectedEngineVersion,width:Number($('resolution').value),duration:Number($('duration').value),bgm:$('bgm').value,sfx:$('sfx').checked,caption:$('caption').checked,templateId:$('template').value,...(customValue.enabled?{customSettings:clone(customValue.settings)}:{})});
let customControls=null,stageEditor=null,customValue={mode:'easy',enabled:false,valid:true,settings:null},previewPaused=false,previewElapsed=0,previewTask=null,previewDirty=true,lastPaint=0,previewStatsTime=0,applyingEditor=false;
const clone=value=>JSON.parse(JSON.stringify(value));
const name=meta=>`infinite-${meta.genre}-${meta.id}.mp4`;
function saveQueue(){try{localStorage.setItem('infinite-shorts-pending-v1',JSON.stringify(retryTasks))}catch{}}
function validCustomTask(t){try{if(!t.customSettings)return true;const c=normalizeCustom(t.customSettings,{strict:true});return ['ball','viral'].includes(t.genre)&&t.seed===c.seed&&t.duration<=15}catch{return false}}
function readQueue(){try{const tasks=JSON.parse(localStorage.getItem('infinite-shorts-pending-v1')||'[]');if(!Array.isArray(tasks)||tasks.length>20)return [];return tasks.filter(t=>t&&validCustomTask(t)&&GENRES.includes(t.genre)&&[360,540,720,1080].includes(t.width)&&[3,6,10,15,30,61,75,90].includes(t.duration)&&Number.isInteger(t.seed)&&['calm','beat','off'].includes(t.bgm)&&typeof t.sfx==='boolean'&&typeof t.caption==='boolean'&&/^[a-z0-9-]+$/.test(t.id)&&(!t.templateId||CATALOG.some(x=>x.id===t.templateId&&x.genre===t.genre))&&!library.some(m=>m.id===t.id))}catch{return []}}
function error(message){$('error').textContent=message}
function updateButtons(){
 const invalid=!customValue.valid;customControls?.setLocked(active);stageEditor?.setLocked();$('seed').disabled=active||customValue.enabled;$('adaptive').disabled=active||customValue.enabled;for(const id of ['preview-pause','preview-reset'])$(id).disabled=active;
 $('settings').disabled=active;$('preview-audio').disabled=active;for(const id of ['batch3','batch5','batch20'])$(id).disabled=active||invalid||!supported||!storageReady||!!recoveryFile||verified!==signature(config());$('single').disabled=active||invalid||!supported||!storageReady||!!recoveryFile;$('batch').disabled=active||invalid||!supported||!storageReady||!!recoveryFile||verified!==signature(config());$('stop').disabled=!active;$('retry').disabled=active||!retryTasks.length||!!recoveryFile||!supported||!storageReady;
 $('stage').textContent=customValue.enabled?'詳細モードではプレビューの初期配置・設定・シードを固定します。同じ設定の連続録画は同じシミュレーションを再現します。':verified===signature(config())?'1本の録画・MP4読み込み・端末内保存を確認済み。この設定で10本を試せます。':'同じ解像度・尺・音声設定で1本が完成すると、10本生成を選べます。';
}
function chosenTemplate(){return CATALOG.find(t=>t.id===$('template').value)||templatesFor(genre==='random'?'ball':genre)[0]}
function loadCustomTemplate(){if(customControls){customValue=customControls.setTemplate(chosenTemplate());stageEditor?.clearHistory()}}
function previewButtons(){const b=$('preview-pause');b.textContent=previewPaused?'再開':'一時停止';b.setAttribute('aria-pressed',String(previewPaused))}
function preview(now){
 const dt=Math.max(0,(now-lastPreview)/1000);lastPreview=now;
 if($('studio-workspace')?.hidden){previewRAF=requestAnimationFrame(preview);return}
 if(!active&&!document.hidden&&previewTask&&!previewPaused){if(dt>1.5){previewPaused=true;previewButtons();error('高負荷でプレビューを停止しました。解像度や精度・発光を下げて再開してください。')}else previewElapsed+=dt}
 if(!active&&!document.hidden&&previewTask&&(!customValue.enabled||now-lastPaint>=1000/24)){
  lastPaint=now;
  if(!previewPaused||previewDirty){
   if(!customValue.enabled&&genre==='viral'&&previewElapsed>previewTask.duration+1){resetPreview()}else{
    try{
     const t=previewElapsed;previewScene.draw(canvas.getContext('2d'),canvas.width,canvas.height,t,dt,previewTask.caption);stageEditor?.drawOverlay(canvas.getContext('2d'),canvas.width,canvas.height);
     if(previewAudio&&!previewPaused)for(const event of previewScene.eventsBetween?.(previewTime,t)||[])previewAudio.hit(event);previewTime=t;previewDirty=false;
     if(customValue.enabled&&(now-previewStatsTime>200||previewPaused)){const stats=previewScene.stats,counts=stats.currentCounts;canvas.dataset.stageCounts=JSON.stringify(counts);canvas.dataset.configFingerprint=stats.configFingerprint;canvas.dataset.stateDigest=simulationDigest(previewScene.getState());canvas.dataset.stateTime=String(t);previewStatsTime=now;const bytes=stats.estimatedBytes||stats.initialBallCount*(256+customValue.settings.trailLength*16)+stats.initialWallCount*160+stats.initialRingCount*160;$('simulation-status').textContent=`初期 ${stats.initialBallCount}球 / 現在 ${counts.balls}球 · 壁 ${counts.walls}本 · リング ${counts.rings}個 · ${stats.fixedHz}Hz固定計算 · データ概算 ${(bytes/1024).toFixed(0)}KiB`}
    }catch(e){previewPaused=true;previewButtons();error(e.message)}
   }
  }
 }
 previewRAF=requestAnimationFrame(preview);
}
function resetPreview(){
 if(active)return;if(!customValue.valid){updateButtons();return}
 const longAllowed=genre==='viral'&&!customValue.enabled;for(const o of $('duration').options)o.disabled=Number(o.value)>15&&!longAllowed;if(!longAllowed&&Number($('duration').value)>15)$('duration').value='15';
 const settings=config(),template=chosenTemplate(),seed=customValue.enabled?customValue.settings.seed:$('seed').value===''?newSeed():Number($('seed').value);
 previewTask={...settings,genre:template.genre,templateId:template.id,seed};
 const heavy=customValue.enabled&&(customValue.settings.ballCount>80||customValue.settings.wallCount>40||customValue.settings.ringCount>12||customValue.settings.multiplyOnHit||customValue.settings.ringEvent==='multiply');
 canvas.width=customValue.enabled?Math.min(settings.width,heavy?180:360):settings.width;canvas.height=canvas.width*16/9;
 $('format').textContent=customValue.enabled?`プレビュー ${canvas.width}×${canvas.height} / 出力 ${settings.width}×${settings.width*16/9}`:`${canvas.width} × ${canvas.height}`;
 previewScene=scene(template.genre,seed,previewTask);canvas.dataset.previewSeed=String(seed);canvas.dataset.previewTemplate=template.id;canvas.dataset.custom=String(customValue.enabled);delete canvas.dataset.stageCounts;delete canvas.dataset.configFingerprint;delete canvas.dataset.stateDigest;
 stageEditor?.setEnabled(customValue.enabled);canvas.classList.toggle('custom-stage',customValue.enabled);
 $('template-note').textContent=customValue.enabled?'選択テンプレートをもとにした編集可能な物理フリーステージ。専用の勝利条件や拘束は再現せず、録画は15秒までです。':$('template').value==='auto'?'作品ごとにテンプレート・構図・展開・結末を選び直します。':`${template.description||template.name} · loop: ${template.loop||'reset'}`;
 if(!customValue.enabled)$('simulation-status').textContent='かんたん生成：既存テンプレートの演出を維持します。';
 previewStart=performance.now();lastPreview=previewStart;previewElapsed=0;previewTime=-.001;previewDirty=true;previewButtons();updateButtons();
}
document.querySelectorAll('[data-genre]').forEach(button=>button.onclick=()=>{if(active)return;genre=button.dataset.genre;selectedEngineVersion='viral-3';document.querySelectorAll('[data-genre],#random').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});fillTemplates();loadCustomTemplate();resetPreview()});
$('random').onclick=()=>{if(active)return;genre='random';document.querySelectorAll('[data-genre],#random').forEach(b=>{const selected=b.id==='random';b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});fillTemplates();loadCustomTemplate();resetPreview()};
function fillTemplates(){const select=$('template'),previous=select.value;select.replaceChildren(new Option('作品ごとに自動選択','auto'));for(const t of templatesFor(genre))select.add(new Option(t.name,t.id));if([...select.options].some(o=>o.value===previous))select.value=previous}
for(const id of ['seed','template','resolution','duration','bgm','sfx','caption'])$(id).onchange=()=>{if(id==='template')loadCustomTemplate();resetPreview()};
function makeTasks(count){
 if(customValue.enabled){if(!customValue.valid)return [];const base=config(),template=chosenTemplate(),snapshot=normalizeCustom(customValue.settings,{strict:true});return Array.from({length:count},()=>({...base,genre:template.genre,templateId:template.id,engineVersion:'custom-1',seed:snapshot.seed,customSettings:clone(snapshot),id:`${Date.now().toString(36)}-${snapshot.seed.toString(36)}-${newSeed().toString(36)}`}))}
 const s=config(),choices=s.templateId==='auto'?templatesFor(genre):[CATALOG.find(t=>t.id===s.templateId)].filter(Boolean);for(let i=choices.length-1;i>0;i--){const j=newSeed()%(i+1);[choices[i],choices[j]]=[choices[j],choices[i]]}
 return Array.from({length:count},(_,index)=>{const seed=$('seed').value===''?newSeed():(Number($('seed').value)+index)>>>0;let template=choices[index%choices.length];if($('adaptive').checked&&s.templateId==='auto')template=chooseFromPerformance(choices,seed,s.duration);return {...s,genre:template.genre,templateId:template.id,seed,id:`${Date.now().toString(36)}-${seed.toString(36)}-${newSeed().toString(36)}`}});
}
async function start(tasks){
 if(active||!customValue.valid||!supported||!storageReady||recoveryFile)return;
 if(!customValue.enabled&&$('seed').value!==''&&(!Number.isInteger(Number($('seed').value))||Number($('seed').value)<0||Number($('seed').value)>4294967295)){error('シードは0〜4294967295の整数です');return}
 const seen=new Set(library.map(m=>m.fingerprint).filter(Boolean));for(const t of tasks){t.fingerprint=JSON.stringify([t.engineVersion||'viral-3',t.genre,t.templateId,t.seed,t.width,t.duration,t.bgm,t.sfx,t.caption,...(t.customSettings?[t.customSettings]:[])]);if(t.customSettings)continue;if(seen.has(t.fingerprint)){error('同じ設定・シードの動画が保存済みです。シードを変えるか、保存済み動画を確認してください。');return}seen.add(t.fingerprint)}
 // Start/resume audio in this click handler, before any IndexedDB await.
 let context=null,resume=null;const audioWanted=tasks.some(s=>s.sfx||s.bgm!=='off');
 try{if(audioWanted){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('音声合成に対応していません。BGMと効果音をOFFにしてください');context=new Audio();resume=context.resume()}}catch(e){error(e.message);return}
 previewAudio?.close();previewAudio=null;previewContext?.close();previewContext=null;$('preview-audio').textContent='♪ プレビュー音声 OFF';$('preview-audio').setAttribute('aria-pressed','false');
 active=true;controller=new AbortController();retryTasks=tasks.slice();saveQueue();updateButtons();error('');closePlayer();let done=0;const total=tasks.length;$('progress').value=0;$('counter').textContent=`0 / ${total}`;
 try{
  if(resume)await resume;
  if(navigator.wakeLock?.request)try{wakeLock=await navigator.wakeLock.request('screen')}catch{}
  while(retryTasks.length){
   if(controller.signal.aborted)throw controller.signal.reason||new DOMException('停止しました','AbortError');
   const task=retryTasks[0];$('status').textContent=`${done+1} / ${total}本目を録画しています。Safariを前面にしてください。`;
   const blob=await record(canvas,task,{signal:controller.signal,audioContext:context,onProgress:p=>{$('progress').value=(done+p/100)/total*100;$('counter').textContent=`${done} / ${total} 完成 · 録画 ${Math.floor(p)}%`}});
   if(controller.signal.aborted)throw controller.signal.reason||new DOMException('停止しました','AbortError');
   $('status').textContent=`${done+1}本目のMP4を確認・保存しています…`;
   const info=await inspect(blob);
   if(info.width!==task.width||info.height!==task.width*16/9)throw Error(`指定した解像度で録画されませんでした（${info.width}×${info.height}）。低い解像度で再試行してください。`);
   if(controller.signal.aborted)throw controller.signal.reason||new DOMException('停止しました','AbortError');
   const template=templateFor(task.templateId,task.genre),text=englishMetadata(template,task.seed);if(task.customSettings){text.title=`Custom Physics - ${template.name} #${task.seed}`;text.tags='#Shorts #OriginalAnimation #Physics #CustomSimulation'}
   const meta={settings:{...task},fingerprint:task.fingerprint,engineVersion:task.engineVersion||'viral-3',templateId:template.id,templateName:template.name,recordingStats:blob.recordingStats||null,assessment:productionAssessment(template,blob.recordingStats),id:task.id,genre:task.genre,seed:task.seed,width:info.width,height:info.height,duration:task.duration,created:Date.now(),size:blob.size,title:text.title,tags:text.tags};
   try{await store.put(meta,blob)}catch(e){showRecovery(meta,blob);throw Error(e.message+' 今回の1本は下の保存ボタンから退避できます。')}
   retryTasks.shift();saveQueue();done++;verified=signature(task);$('progress').value=done/total*100;$('counter').textContent=`${done} / ${total} 完成`;await refreshLibrary();
   if(done<total)await new Promise(resolve=>setTimeout(resolve,150));
  }
  $('status').textContent=`${done}本が完成しました。「再生・保存」からファイルに保存できます。`;
 }catch(e){
  $('status').textContent=`完成 ${done}本 / 未完了 ${retryTasks.length}本。完成済みの動画は残っています。`;
  error(e?.message||String(e));
 }finally{
  try{await context?.close()}catch{}try{await wakeLock?.release()}catch{}wakeLock=null;active=false;controller=null;updateButtons();resetPreview();lastPreview=performance.now();
 }
}
$('batch20').onclick=()=>{if(verified===signature(config()))start(makeTasks(20))};
$('single').onclick=()=>start(makeTasks(1));$('batch3').onclick=()=>{if(verified===signature(config()))start(makeTasks(3))};$('batch5').onclick=()=>{if(verified===signature(config()))start(makeTasks(5))};$('batch').onclick=()=>{if(verified===signature(config()))start(makeTasks(10))};$('retry').onclick=()=>start(retryTasks.slice());
function stop(message='停止しました。録画途中の1本は破棄しました。再試行で未完了分から続けられます。'){if(active)controller?.abort(new DOMException(message,'AbortError'))}
$('stop').onclick=()=>stop();document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Safariが非表示になったため停止しました。前面に戻して再試行してください。');lastPreview=performance.now()});window.addEventListener('pagehide',()=>{stop();closePlayer()});
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n}
async function refreshLibrary(){
 library=await store.list();$('total').textContent=library.length;$('storage').textContent=`${(library.reduce((s,m)=>s+m.size,0)/1024/1024).toFixed(1)} / 200 MiB`;
 const parent=$('jobs');parent.replaceChildren();if(!library.length){const empty=node('div','まだ動画はありません。まず1本、作ってみましょう。');empty.className='empty';parent.append(empty);return}
 for(const meta of library){const card=node('article');card.className='card';card.dataset.id=meta.id;const thumb=node('div',{viral:'◌',ball:'◉',asmr:'◎',meme:'✧',domino:'▥'}[meta.genre]);thumb.className='thumb';card.append(thumb,node('h3',meta.title),node('p',meta.templateName||'Legacy template'),node('p',`${meta.width} × ${meta.height} · ${meta.duration}秒 · ${(meta.size/1024/1024).toFixed(1)}MiB`),node('p',meta.tags));
  const view=node('button','▷ 再生・保存');view.type='button';view.onclick=async()=>{view.disabled=true;try{await openPlayer(meta)}catch(e){error(e.message)}finally{view.disabled=false}};card.append(view);if(meta.settings){const regen=node('button','同じシード・設定を読み込む');regen.type='button';regen.onclick=()=>{if(!active)restoreTask({...meta.settings,genre:meta.genre,templateId:meta.templateId,seed:meta.seed,engineVersion:meta.engineVersion||'viral-1'},{scroll:true})};card.append(regen)}
  const copy=node('button','タイトル・タグをコピー');copy.type='button';copy.onclick=async()=>{const text=meta.title+'\n'+meta.tags;try{await navigator.clipboard.writeText(text);copy.textContent='コピーしました'}catch{window.prompt('コピーしてください',text)}};card.append(copy);
  const del=node('button','削除して容量を空ける');del.className='delete';del.type='button';del.onclick=async()=>{if(!window.confirm('この端末内の動画を削除しますか？「ファイル」に保存した動画は削除されません。'))return;try{if(playerId===meta.id)closePlayer();await store.remove(meta.id);await refreshLibrary()}catch(e){error(e.message)}};card.append(del);parent.append(card);
 }
}
function restoreTask(task,{scroll=false}={}){
 if(active)return;
 if(stageEditor?.isEditing())stageEditor.setEditing(false);
 document.querySelector(`[data-genre="${task.genre}"]`)?.click();
 for(const id of ['resolution','duration','bgm'])$(id).value=String(task[id==='resolution'?'width':id]);
 selectedEngineVersion=task.engineVersion||'viral-3';$('template').value=task.templateId;$('seed').value=task.seed;$('sfx').checked=task.sfx;$('caption').checked=task.caption;
 loadCustomTemplate();
 if(task.customSettings){customControls.setMode('advanced',{notify:false});customValue=customControls.replaceSettings(task.customSettings,{notify:false})}else customValue=customControls.setMode('easy',{notify:false});
 previewPaused=false;resetPreview();if(scroll)$('settings').scrollIntoView({behavior:'smooth'});
}
function closePlayer(){playerRequest++;const video=$('player');video.pause();video.removeAttribute('src');video.load();if(playerURL)URL.revokeObjectURL(playerURL);playerURL='';playerId='';playerFile=null;$('download-file').removeAttribute('href');$('player-panel').hidden=true}
async function openPlayer(meta){
 closePlayer();const request=playerRequest;const blob=await store.get(meta.id);if(request!==playerRequest)return;playerURL=URL.createObjectURL(blob);playerId=meta.id;playerFile=new File([blob],name(meta),{type:'video/mp4'});$('player').src=playerURL;$('player-title').textContent=meta.title;$('download-file').href=playerURL;$('download-file').download=name(meta);$('player-panel').hidden=false;mountQuality(meta);
 const share=!!(navigator.canShare&&navigator.share&&navigator.canShare({files:[playerFile]}));$('save-file').disabled=!share;$('save-hint').textContent=share?'「共有からファイルに保存」を押し、共有シートで「ファイルに保存」を選びます。':'ファイル共有に非対応です。「MP4をダウンロード」を押してください。';$('player-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function mountQuality(meta){
 const root=$('quality-review');root.replaceChildren();const detail=node('details'),summary=node('summary','品質チェック・視聴メモ');detail.append(summary);
 const measured=meta.recordingStats;
 detail.append(node('p',measured?`ブラウザ計測：${(measured.renderedFrames/(measured.elapsedSeconds||1)).toFixed(1)}描画/秒 · 描画処理P95 ${measured.p95FrameMs.toFixed(1)}ms · 発音イベント ${measured.soundEvents}件`:'旧版動画：描画時間の計測値はありません。'));
 detail.append(node('p','自動計測は端末内の制作指標です。SNS人気・収益・法的な独自性のスコアではありません。音と映像の体感同期は実際に視聴して確認してください。'));
 const form=node('form'),fields={};form.className='quality-form';
 for(const [key,label] of [['visual','映像の質感'],['smoothness','滑らかさ'],['satisfaction','視覚的な満足感'],['story','展開の面白さ'],['sound','音の同期'],['loop','ループ/再開の自然さ'],['originality','自分で確認した独自性'],['readability','スマホでの視認性'],['principles','制作原則の反映']]){const wrap=node('label',label),select=node('select');select.add(new Option('未確認',''));for(let i=1;i<=5;i++)select.add(new Option(String(i),String(i)));select.value=meta.qualityReview?.ratings?.[key]??'';wrap.append(select);form.append(wrap);fields[key]=select}
 const label=node('label','改善メモ'),notes=node('textarea');notes.maxLength=2000;notes.value=meta.qualityReview?.notes||'';label.append(notes);form.append(label);const save=node('button','品質メモを保存');save.type='submit';const status=node('p');status.setAttribute('role','status');form.append(save,status);
 form.onsubmit=async event=>{event.preventDefault();try{const ratings={};for(const [key,input] of Object.entries(fields))ratings[key]=input.value?Number(input.value):null;await store.updateMetadata(meta.id,{qualityReview:{ratings,notes:notes.value,reviewedAt:new Date().toISOString(),source:'manual_review_not_social_metrics'}});status.textContent='端末内に保存しました';await refreshLibrary()}catch(e){status.textContent=e.message}};
 detail.append(form);root.append(detail);
}
function shareFile(file){if(!file)return;try{navigator.share({files:[file]}).catch(e=>{if(e.name!=='AbortError')error('共有できませんでした。「MP4をダウンロード」を使用してください。')})}catch{error('共有できませんでした。「MP4をダウンロード」を使用してください。')}}
$('save-file').onclick=()=>shareFile(playerFile);$('close-player').onclick=closePlayer;
function showRecovery(meta,blob){
 if(recoveryURL)URL.revokeObjectURL(recoveryURL);recoveryURL=URL.createObjectURL(blob);recoveryMeta=meta;recoveryFile=new File([blob],name(meta),{type:'video/mp4'});$('recovery').hidden=false;$('recover-download').href=recoveryURL;$('recover-download').download=name(meta);$('recover-share').disabled=!(navigator.canShare&&navigator.canShare({files:[recoveryFile]}));updateButtons();
}
$('recover-share').onclick=()=>shareFile(recoveryFile);
// Explicit acknowledgement prevents losing the only in-memory copy after a quota error.
const recoveryDone=node('button','保存できたので、この一時動画を破棄する');recoveryDone.type='button';recoveryDone.onclick=()=>{if(!confirm('ファイルに保存できたことを確認しましたか？'))return;if(recoveryURL)URL.revokeObjectURL(recoveryURL);if(retryTasks[0]?.id===recoveryMeta?.id){retryTasks.shift();saveQueue()}recoveryURL='';recoveryFile=null;recoveryMeta=null;$('recover-download').removeAttribute('href');$('recovery').hidden=true;updateButtons()};$('recovery').append(recoveryDone);
async function boot(){
 fillTemplates();
 customControls=mountCustomControls($('custom-controls'),{onChange:value=>{if(value.mode==='easy'&&selectedEngineVersion==='custom-1')selectedEngineVersion='viral-3';customValue=value;if(!applyingEditor)stageEditor?.clearHistory();resetPreview()}});
 loadCustomTemplate();
 stageEditor=mountStageEditor(canvas,$('stage-editor'),{readConfig:()=>customValue.enabled?customValue.settings:null,onChange:next=>{applyingEditor=true;try{customControls.replaceSettings(next)}finally{applyingEditor=false}},onEditingChange:editing=>{previewPaused=editing;resetPreview()},isLocked:()=>active,onInvalidate:()=>{previewDirty=true}});

 const reason=capability();supported=!reason;$('support').classList.toggle('bad',!!reason);$('support').textContent=reason||`MP4録画APIに対応しています。実際の録画・保存は「まず1本」で確認します。`;
 try{await store.openDB();await refreshLibrary();storageReady=true;retryTasks=readQueue();saveQueue();if(retryTasks[0]?.customSettings)restoreTask(retryTasks[0])}catch(e){error(e.message)}
 $('status').textContent=supported&&storageReady?(retryTasks.length?`未完了 ${retryTasks.length}本が残っています。「再試行」で続けられます。`:'まず低解像度で1本を生成してください。'):'録画を開始できません。対応状況・エラーを確認してください。';updateButtons();resetPreview();previewRAF=requestAnimationFrame(preview);
 let seedReferences=[];try{const response=await fetch('./references/reference_manifest.json');if(response.ok){const data=await response.json();seedReferences=Array.isArray(data)?data:[...(data.references||[]),...(data.discovery_leads_without_original_url||[])]}}catch{}
 try{await mountResearch($('reference-manager'),{templates:CATALOG,seedReferences});await mountAnalytics($('analytics-manager'),{templates:[...CATALOG,...ARCHETYPES.map(a=>({id:'remix-'+a.id,name:a.name}))]})}catch(e){const note=document.createElement('p');note.textContent='管理画面の読み込みに失敗しました: '+e.message;$('reference-manager').append(note)}
}
document.querySelectorAll('.section-nav a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{const target=document.querySelector(a.getAttribute('href'));const details=target?.closest('details');if(details)details.open=true}));
let remixController=null;
for(const tab of ['studio','remix'])$(tab+'-tab').onclick=()=>{if(active||remixController?.isRunning())return;for(const name of ['studio','remix']){$(name+'-workspace').hidden=name!==tab;$(name+'-tab').setAttribute('aria-selected',String(name===tab))}lastPreview=performance.now();if(tab==='remix'&&previewContext){previewAudio?.close();previewContext.close();previewContext=null;previewAudio=null;$('preview-audio').textContent='♪ プレビュー音声 OFF';$('preview-audio').setAttribute('aria-pressed','false')}};
boot().then(async()=>{try{remixController=await mountRemix($('remix-workspace'),{isStudioBusy:()=>active,acquire:()=>{if(active)return false;active=true;updateButtons();return true},release:()=>{active=false;updateButtons();resetPreview()},onLibraryChange:refreshLibrary})}catch(e){$('remix-workspace').textContent='REMIXを読み込めません: '+e.message}});



function chooseFromPerformance(choices,seed,duration){
 // Exploration remains 30%; measurements select candidates, never predict virality.
 try{const random=rng(seed);const explore=()=>choices[Math.floor(random()*choices.length)];const rows=JSON.parse(localStorage.getItem('gvfactory-performance-v1')||'[]');if(random()<.3)return explore();const scored=choices.map(t=>{const r=rows.filter(x=>x.template_id===t.id&&Number(x.duration)===duration&&x.completion_rate!==null&&Number.isFinite(Number(x.completion_rate)));return {t,n:r.length,score:r.reduce((v,x)=>v+Number(x.completion_rate),0)/Math.max(1,r.length)}}).filter(x=>x.n>=3).sort((a,b)=>b.score-a.score);return scored[0]?.t||explore()}catch{return choices[seed%choices.length]}
}

$('preview-audio').onclick=async()=>{try{if(previewContext){previewAudio?.close();await previewContext.close();previewContext=null;previewAudio=null;}else{previewContext=new (window.AudioContext||window.webkitAudioContext)();await previewContext.resume();previewAudio=createAudio(previewContext,{...config(),bgm:'off',sfx:true},0);previewAudio.monitor();}const enabled=!!previewAudio;$('preview-audio').textContent='♪ プレビュー音声 '+(enabled?'ON':'OFF');$('preview-audio').setAttribute('aria-pressed',String(enabled))}catch(e){error(e.message)}};

$('preview-pause').onclick=()=>{if(active)return;if(stageEditor?.isEditing()){stageEditor.setEditing(false);return}previewPaused=!previewPaused;lastPreview=performance.now();previewDirty=true;previewButtons()};
$('preview-reset').onclick=()=>{if(!active)resetPreview()};
