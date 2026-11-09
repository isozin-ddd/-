import {createQualityScene} from './scene.js';
import {renderQualityAudio,wavBuffer} from './audio.js';
export async function recordQuality(canvas,settings,{signal,onProgress,audioContext},types){
 if(settings.duration>30)throw Error('品質検証中の3作品は30秒までです。');if(settings.bgm!=='off')throw Error('品質版は効果音を優先します。BGMなしを選択してください。');
 if(signal.aborted)throw signal.reason;canvas.width=settings.width;canvas.height=settings.width*16/9;
 const prepare=createQualityScene(settings.templateId,settings.seed,settings);prepare.world.advance(settings.duration);const snapshot=prepare.world.snapshot();if(snapshot.stats.budgetStops)throw Error('衝突計算の上限に達しました。球数や速度を下げてください。');
 const sound=settings.sfx?await renderQualityAudio(snapshot.events,settings.duration):null;
 if(signal.aborted)throw signal.reason;
 const animation=createQualityScene(settings.templateId,settings.seed,settings),ctx=canvas.getContext('2d',{alpha:false});animation.draw(ctx,canvas.width,canvas.height,0,0,settings.caption);
 let stream,source,destination,recorder,frameTrack,manualFrames=false;const lead=sound?.1:0;
 try{
  try{stream=canvas.captureStream(0);frameTrack=stream.getVideoTracks()[0];manualFrames=typeof frameTrack?.requestFrame==='function'}catch{manualFrames=false}if(!manualFrames){stream?.getTracks().forEach(t=>t.stop());stream=canvas.captureStream(60);frameTrack=stream.getVideoTracks()[0]}
  if(sound){if(!audioContext||audioContext.state!=='running')throw Error('音声の開始にはSafariで生成ボタンを押してください。');destination=audioContext.createMediaStreamDestination();source=audioContext.createBufferSource();source.buffer=sound.buffer;source.connect(destination);for(const track of destination.stream.getAudioTracks())stream.addTrack(track)}
  for(const mimeType of types){try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:settings.width>=1080?12000000:settings.width>=720?8000000:3000000,audioBitsPerSecond:160000});break}catch{}}
  if(!recorder)throw Error('このブラウザで品質版MP4を開始できません。');
  return await new Promise((resolve,reject)=>{let chunks=[],bytes=0,raf,timer,stopping=false,failure=null,frames=0,previous=-1,maxGap=0,missed=0;const timings=[],visualOffsets=[];
   const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(timer);signal.removeEventListener('abort',abort)};
   const stop=error=>{if(stopping)return;stopping=true;failure=error||null;cancelAnimationFrame(raf);source?.stop();if(recorder.state!=='inactive')recorder.stop();else{cleanup();reject(failure||Error('録画が停止しています'))}};
   const abort=()=>stop(signal.reason||new DOMException('停止','AbortError'));
   recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>64*1024*1024)stop(Error('録画上限64MiB。解像度を下げてください。'))}};recorder.onerror=e=>stop(Error(e.error?.message||'MP4録画エラー'));
   const wallStart=performance.now(),audioStart=audioContext?.currentTime;const mediaClock=()=> (performance.now()-wallStart)/1000-lead;
   recorder.onstop=()=>{cleanup();if(failure){chunks=[];reject(failure);return}if(!bytes){reject(Error('空のMP4'));return}const blob=new Blob(chunks,{type:'video/mp4'});chunks=[];blob.recordingStats={renderedFrames:frames,elapsedSeconds:(performance.now()-wallStart)/1000,p95FrameMs:timings.slice().sort((a,b)=>a-b)[Math.floor(timings.length*.95)]||0,maxFrameMs:Math.max(0,...timings),soundEvents:sound?.accepted||0,audioPeak:sound?.peak||0,mimeType:recorder.mimeType,measuredIn:'current_browser_not_iphone',quality:{version:'quality-1',seed:settings.seed,leadSeconds:lead,visualTimelineOffsetSeconds:visualOffsets.slice().sort((a,b)=>a-b)[Math.floor(visualOffsets.length/2)]||0,targetFps:60,maxFrameGapSeconds:maxGap,missedDisplayFrames:missed,physics:snapshot.stats,outcome:snapshot.outcome,events:snapshot.events,captureMethod:manualFrames?'explicit canvas requestFrame':'captureStream60 fallback',audioMethod:'offline event-time synthesis; one buffer and RAF timeline anchored to one epoch',audioPolyphonyDrops:sound?.droppedForPolyphony||0}};if(sound)blob.qualityReferenceWav=new Blob([wavBuffer(sound.buffer)],{type:'audio/wav'});resolve(blob)};
   function tick(now){if(stopping)return;const t=Math.max(0,Math.min(settings.duration,(now-wallStart)/1000-lead)),index=Math.floor(t*60+1e-5);
    if(index!==previous||t===0){const before=performance.now();if(previous>=0){maxGap=Math.max(maxGap,(index-previous)/60);missed+=Math.max(0,index-previous-1)}animation.draw(ctx,canvas.width,canvas.height,index/60,1/60,settings.caption);if(manualFrames)frameTrack.requestFrame();timings.push(performance.now()-before);frames++;if(index>6)visualOffsets.push((now-wallStart)/1000-index/60);previous=index;onProgress(t/settings.duration*100)}
    if(mediaClock()>=settings.duration+.04){if(maxGap>.15){stop(Error('映像の描画が遅延しました。解像度を下げてください。'));return}stop();return}raf=requestAnimationFrame(tick);
   }
   signal.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>stop(Error('録画タイムアウト')),(settings.duration+12)*1000);
   try{recorder.start(500);if(source)source.start(audioStart+lead);raf=requestAnimationFrame(tick)}catch(e){cleanup();reject(e)}
  });
 }finally{try{source?.stop()}catch{}source?.disconnect();stream?.getTracks().forEach(t=>t.stop());destination?.stream.getTracks().forEach(t=>t.stop());if(recorder?.state!=='inactive')try{recorder?.stop()}catch{}}
}
