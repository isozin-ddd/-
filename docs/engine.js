import {normalizeCustom} from './custom-physics.js';
import {studioScene} from './catalog.js?v=custom1';
export const WIDTHS=[360,540,720,1080];
export const GENRES=['viral','ball','asmr','meme','domino'];
export const LABELS={ball:'跳ねるたび、予想外。',asmr:'ずっと見ていたい波紋',meme:'重力を忘れた宇宙人',domino:'最後までつながる？'};
export const MP4_TYPES=['video/mp4;codecs=avc1.424028,mp4a.40.2','video/mp4;codecs=avc1.424028','video/mp4'];
export function pickTypes(Recorder=globalThis.MediaRecorder){
 if(!Recorder || typeof Recorder.isTypeSupported!=='function')return [];
 return MP4_TYPES.filter(type=>{try{return Recorder.isTypeSupported(type)}catch{return false}});
}
export function capability(env=globalThis){
 if(!env.isSecureContext)return 'HTTPSで開いてください。録画には安全な接続が必要です。';
 if(!env.MediaRecorder)return 'このSafariはMediaRecorderに対応していません。iOSを更新してSafariで開いてください。';
 if(!env.HTMLCanvasElement?.prototype.captureStream)return 'このブラウザはCanvasの録画に対応していません。';
 if(!pickTypes(env.MediaRecorder).length)return 'このブラウザはMP4録画に対応していません。WebMへの自動変更は行いません。';
 return '';
}
export function rng(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}}
export function newSeed(){return crypto.getRandomValues(new Uint32Array(1))[0]}
export function scene(genre,seed,options={}){return studioScene(genre,seed,options)}
export function createAudio(context,settings,seed){
 const destination=context.createMediaStreamDestination(),nodes=new Set(),master=context.createGain(),limiter=context.createDynamicsCompressor();
 master.gain.value=.42;limiter.threshold.value=-12;limiter.ratio.value=8;master.connect(limiter);limiter.connect(destination);let soundEvents=0;
 function tone(freq,start,length,gain,type='sine'){
  const oscillator=context.createOscillator(),volume=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(Math.max(80,Math.min(3000,freq)),start);volume.gain.setValueAtTime(.0001,start);volume.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+.006);volume.gain.exponentialRampToValueAtTime(.0001,start+length);oscillator.connect(volume);volume.connect(master);nodes.add(oscillator);nodes.add(volume);oscillator.onended=()=>{nodes.delete(oscillator);nodes.delete(volume);oscillator.disconnect();volume.disconnect()};oscillator.start(start);oscillator.stop(start+length+.015);
 }
 const now=context.currentTime;
 if(settings.bgm!=='off')for(let t=0;t<settings.duration;t+=.5){const envelope=Math.min(1,t*3+.1,(settings.duration-t)*3);tone((settings.bgm==='calm'?174.61:261.63)*[1,1.25,1.5,1.25][Math.floor(t*2)%4],now+t,.46,.07*envelope)}
 return {stream:destination.stream,monitor(){limiter.connect(context.destination)},hit(event){if(!settings.sfx)return;soundEvents++;tone(event.pitch||500+seed%240,context.currentTime+.004,.07+.12*Math.min(1,event.intensity||.5),.10+.16*Math.min(1,event.intensity||.5),['triangle','sine','triangle','sine'][Math.abs(event.ring||0)%4]);if(event.type==='goal')for(const factor of [1.25,1.5,2])tone((event.pitch||523)*factor,context.currentTime+.02,.4,.05)},get soundEvents(){return soundEvents},close(){for(const node of nodes){try{node.stop?.()}catch{}try{node.disconnect()}catch{}}nodes.clear();master.disconnect();limiter.disconnect();destination.stream.getTracks().forEach(t=>t.stop())}};
}
export function freezeRecordingSettings(input){
 const copy=JSON.parse(JSON.stringify(input));
 if(copy.customSettings){copy.customSettings=normalizeCustom(copy.customSettings,{strict:true});if(copy.seed!==copy.customSettings.seed)throw Error('録画シードがカスタム設定と一致していません');if(copy.duration>15)throw Error('詳細物理ステージの録画は15秒までです')}
 function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value)}return value}
 return freeze(copy);
}
export function simulationDigest(state){
 const payload={balls:state.balls.map(b=>[b.id,b.x,b.y,b.vx,b.vy,b.radius,b.mass,b.color]),walls:state.walls.map(w=>[w.id,w.x,w.y,w.length,w.angle,w.broken]),rings:state.rings.map(r=>[r.id,r.x,r.y,r.radius,r.angle,r.color])};
 let hash=2166136261;for(const ch of JSON.stringify(payload)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)}return(hash>>>0).toString(16).padStart(8,'0');
}
export async function record(canvas,settings,{signal,onProgress,audioContext}){
 settings=freezeRecordingSettings(settings);
 if(signal.aborted)throw signal.reason||new DOMException('停止しました','AbortError');
 canvas.width=settings.width;canvas.height=settings.width*16/9;
 const ctx=canvas.getContext('2d',{alpha:false}),animation=scene(settings.genre,settings.seed,settings);animation.draw(ctx,canvas.width,canvas.height,0,0,settings.caption);
 let stream,audio,recorder;
 try{
  stream=canvas.captureStream(settings.genre==='viral'?30:24);
  if(!stream.getVideoTracks().length)throw Error('Canvasから映像トラックを取得できませんでした');
  if(settings.sfx||settings.bgm!=='off'){
   if(!audioContext||audioContext.state!=='running')throw Error('音声を開始できません。Safariでボタンを押し直すか、音声をOFFにしてください');
   audio=createAudio(audioContext,settings,settings.seed);for(const track of audio.stream.getAudioTracks())stream.addTrack(track);
  }
  let lastError;
  for(const mimeType of pickTypes())try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:settings.width>=1080?4000000:settings.width>=720?2500000:1200000,audioBitsPerSecond:96000});break}catch(e){lastError=e}
  if(!recorder)throw Error('MP4録画の初期化に失敗しました: '+(lastError?.message||'対応形式なし'));
  return await new Promise((resolve,reject)=>{
   let chunks=[],size=0,raf=0,watchdog,stopping=false,failure=null,renderedFrames=0,previousTime=-.001;const frameTimes=[];const start=performance.now();let last=start,lastDraw=start-42;
   const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(watchdog);signal.removeEventListener('abort',abort)};
   const stop=(reason)=>{if(stopping)return;stopping=true;failure=reason||null;cancelAnimationFrame(raf);try{if(recorder.state!=='inactive')recorder.stop();else{cleanup();reject(failure||Error('録画が開始されていません'))}}catch(e){cleanup();reject(e)}};
   const abort=()=>stop(signal.reason||new DOMException('停止しました','AbortError'));
   recorder.ondataavailable=e=>{if(e.data?.size){chunks.push(e.data);size+=e.data.size;if(size>64*1024*1024)stop(Error('1本のメモリ上限64MiBに達しました。解像度や尺を下げてください'))}};
   recorder.onerror=e=>stop(Error(e.error?.message||'Safariの録画処理でエラーが発生しました'));
   recorder.onstop=()=>{cleanup();if(failure){chunks=[];reject(failure);return}if(!size){reject(Error('MP4データが空です。低い解像度で再試行してください'));return}const type=recorder.mimeType||chunks[0]?.type;if(!/^video\/mp4(?:;|$)/i.test(type||'')){reject(Error('録画結果がMP4ではありません。保存を中止しました'));return}const blob=new Blob(chunks,{type:'video/mp4'});chunks=[];const sorted=frameTimes.slice().sort((a,b)=>a-b);blob.recordingStats={renderedFrames,elapsedSeconds:(performance.now()-start)/1000,p95FrameMs:sorted[Math.floor(sorted.length*.95)]||0,maxFrameMs:Math.max(0,...sorted),soundEvents:audio?.soundEvents||0,mimeType:recorder.mimeType,measuredIn:'current_browser_not_iphone',customSimulation:settings.customSettings?{configFingerprint:animation.stats.configFingerprint,initialCounts:{balls:animation.stats.initialBallCount,walls:animation.stats.initialWallCount,rings:animation.stats.initialRingCount},finalCounts:{...animation.stats.currentCounts},finalStateDigest:simulationDigest(animation.getState()),fixedHz:animation.stats.fixedHz,steps:animation.stats.steps,estimatedBytes:animation.stats.estimatedBytes}:null};resolve(blob)};
   function tick(now){
    if(stopping)return;
    const elapsed=(now-start)/1000;
    if(now-lastDraw<1000/(settings.genre==='viral'?30:24)&&elapsed<settings.duration){raf=requestAnimationFrame(tick);return}
    const dt=(now-last)/1000;last=now;lastDraw=Math.max(lastDraw+1000/(settings.genre==='viral'?30:24),now-1000/24);
    if(dt>1.5){stop(Error('描画が長時間停止しました。解像度を下げ、Safariを前面にして再試行してください'));return}
    const before=performance.now(),t=Math.min(elapsed,settings.duration);
    animation.draw(ctx,canvas.width,canvas.height,t,dt,settings.caption);
    const events=animation.eventsBetween?.(previousTime,t)||[];
    for(const event of events.slice(-6))audio?.hit(event);
    previousTime=t;frameTimes.push(performance.now()-before);renderedFrames++;
    onProgress(Math.min(100,elapsed/settings.duration*100));
    if(elapsed>=settings.duration){stop();return}raf=requestAnimationFrame(tick);
   }
   signal.addEventListener('abort',abort,{once:true});
   watchdog=setTimeout(()=>{stop(Error('録画時間の上限を超えました'));setTimeout(()=>{cleanup();reject(failure||Error('録画の終了に失敗しました'))},2000)},(settings.duration+12)*1000);
   try{recorder.start(1000);raf=requestAnimationFrame(tick)}catch(e){cleanup();reject(Error('MP4録画を開始できません: '+e.message))}
  });
 }finally{
  if(recorder?.state!=='inactive')try{recorder?.stop()}catch{}
  stream?.getTracks().forEach(t=>t.stop());audio?.close();
 }
}
export function inspect(blob){
 return new Promise((resolve,reject)=>{
  const video=document.createElement('video'),url=URL.createObjectURL(blob);let settled=false;video.muted=true;video.playsInline=true;video.preload='metadata';
  function finish(error){if(settled)return;settled=true;clearTimeout(timer);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);if(error)reject(error);else resolve(result)}
  let result;const timer=setTimeout(()=>finish(Error('MP4の再生情報を読み込めませんでした')),10000);
  video.onloadedmetadata=()=>{result={width:video.videoWidth,height:video.videoHeight,duration:Number.isFinite(video.duration)?video.duration:null};finish(result.width&&result.height?null:Error('録画した映像の解像度を確認できません'))};
  video.onerror=()=>finish(Error('録画したMP4をこのブラウザで読み込めません'));video.src=url;video.load();
 });
}

