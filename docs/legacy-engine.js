export const WIDTHS=[360,540,720,1080];
export const GENRES=['ball','asmr','meme','domino'];
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
const palette=['#b0ff76','#9d8aff','#ffb26c','#f58ab9','#7ce1df'];
export function scene(genre,seed){
 const random=rng(seed),phase=random()*Math.PI*2;
 const balls=Array.from({length:9},(_,i)=>({x:45+random()*450,y:170+random()*330,vx:(random()-.5)*150,vy:random()*80,r:15+random()*15,color:palette[i%5]}));
 let elapsed=0;
 return {draw(ctx,w,h,t,dt,caption){
  ctx.save();ctx.scale(w/540,h/960);ctx.fillStyle='#101626';ctx.fillRect(0,0,540,960);
  ctx.strokeStyle='#222c43';ctx.lineWidth=1;for(let y=110;y<820;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(540,y);ctx.stroke()}
  if(genre==='ball'){
   // Fixed substeps and real gravity / wall / pair collisions.
   let remaining=Math.min(dt,.1);while(remaining>0){const step=Math.min(remaining,1/120);remaining-=step;
    for(const b of balls){b.vy+=480*step;b.x+=b.vx*step;b.y+=b.vy*step;if(b.x<b.r+20){b.x=b.r+20;b.vx=Math.abs(b.vx)*.96}if(b.x>520-b.r){b.x=520-b.r;b.vx=-Math.abs(b.vx)*.96}if(b.y>760-b.r){b.y=760-b.r;b.vy=-Math.abs(b.vy)*.94}if(b.y<130+b.r){b.y=130+b.r;b.vy=Math.abs(b.vy)}}
    for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;if(d>0&&d<sum){const nx=dx/d,ny=dy/d,over=(sum-d)/2;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=v*nx;a.vy+=v*ny;b.vx-=v*nx;b.vy-=v*ny}}}
   }
   ctx.fillStyle='#44536a';ctx.fillRect(20,761,500,5);
   for(const b of balls){const grad=ctx.createRadialGradient(b.x-b.r*.3,b.y-b.r*.4,1,b.x,b.y,b.r);grad.addColorStop(0,'#ffffff');grad.addColorStop(.25,b.color);grad.addColorStop(1,b.color);ctx.fillStyle=grad;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}
  }else if(genre==='asmr'){
   ctx.save();ctx.translate(270,450);ctx.rotate(t*.13+phase);
   for(let i=25;i>0;i--){const radius=13+i*11+Math.sin(t*2+i*.35+phase)*12;ctx.strokeStyle=palette[(i+seed)%5];ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(0,0,radius,radius*(.67+.13*Math.sin(t*.8)),0,0,Math.PI*2);ctx.stroke()}ctx.restore();
  }else if(genre==='meme'){
   for(let i=0;i<5;i++){const x=270+Math.sin(t*(.7+(seed%7)/12)+i+phase)*155,y=220+i*112+Math.cos(t*2+i)*25;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t+i+phase)*.4);ctx.fillStyle=palette[(i+seed)%5];ctx.beginPath();ctx.ellipse(0,0,46,32,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0e1422';for(const eye of [-18,18]){ctx.beginPath();ctx.ellipse(eye,-2,8,12,0,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,9,9,0,Math.PI);ctx.stroke();ctx.restore()}
  }else{
   for(let i=35;i>=0;i--){const row=Math.floor(i/6),col=i%6,x=62+col*79+Math.sin(row+phase)*10,y=245+row*85,delay=i*(.07+(seed%25)/700);const a=Math.max(0,Math.min(1,(t-delay)*4))*1.38;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=palette[(i+seed)%5];ctx.fillRect(-9,-61,18,61);ctx.fillStyle='#ffffff50';ctx.fillRect(-9,-61,5,61);ctx.restore()}
  }
  elapsed+=dt;ctx.fillStyle='#9cabc2';ctx.font='16px -apple-system, sans-serif';ctx.fillText('INFINITE / ORIGINAL',28,57);ctx.fillStyle='#b0ff76';ctx.fillRect(28,86,40,3);
  if(caption){ctx.fillStyle='#202b40';ctx.fillRect(20,806,500,76);ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold 27px -apple-system, sans-serif';ctx.fillText(LABELS[genre],270,854,470)}
  ctx.restore();
 }};
}
export function createAudio(context,settings,seed){
 const destination=context.createMediaStreamDestination(),nodes=[],master=context.createGain();master.gain.value=.4;master.connect(destination);nodes.push(master);
 const now=context.currentTime,seconds=settings.duration;
 function tone(freq,start,length,gain,type='sine'){
  const oscillator=context.createOscillator(),volume=context.createGain();oscillator.type=type;oscillator.frequency.value=freq;volume.gain.setValueAtTime(.0001,start);volume.gain.exponentialRampToValueAtTime(gain,start+.008);volume.gain.exponentialRampToValueAtTime(.0001,start+length);oscillator.connect(volume);volume.connect(master);oscillator.start(start);oscillator.stop(start+length+.01);nodes.push(oscillator,volume);
 }
 if(settings.bgm!=='off')for(let t=0;t<seconds;t+=.5)tone((settings.bgm==='calm'?220:330)*[1,1.25,1.5,1.25][Math.floor(t*2)%4],now+t,.45,.12);
 if(settings.sfx)for(let t=0;t<seconds;t+=.5)tone(520+seed%260,now+t,.10,.25,'triangle');
 return {stream:destination.stream,close(){for(const node of nodes){try{node.stop?.()}catch{}try{node.disconnect()}catch{}}destination.stream.getTracks().forEach(t=>t.stop())}};
}
export async function record(canvas,settings,{signal,onProgress,audioContext}){
 if(signal.aborted)throw signal.reason;
 canvas.width=settings.width;canvas.height=settings.width*16/9;
 const ctx=canvas.getContext('2d',{alpha:false}),animation=scene(settings.genre,settings.seed);animation.draw(ctx,canvas.width,canvas.height,0,0,settings.caption);
 let stream,audio,recorder;
 try{
  stream=canvas.captureStream(24);
  if(!stream.getVideoTracks().length)throw Error('Canvasから映像トラックを取得できませんでした');
  if(settings.sfx||settings.bgm!=='off'){
   if(!audioContext||audioContext.state!=='running')throw Error('音声を開始できません。Safariでボタンを押し直すか、音声をOFFにしてください');
   audio=createAudio(audioContext,settings,settings.seed);for(const track of audio.stream.getAudioTracks())stream.addTrack(track);
  }
  let lastError;
  for(const mimeType of pickTypes())try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:settings.width>=1080?4000000:settings.width>=720?2500000:1200000,audioBitsPerSecond:96000});break}catch(e){lastError=e}
  if(!recorder)throw Error('MP4録画の初期化に失敗しました: '+(lastError?.message||'対応形式なし'));
  return await new Promise((resolve,reject)=>{
   let chunks=[],size=0,raf=0,watchdog,stopping=false,failure=null;const start=performance.now();let last=start;
   const cleanup=()=>{cancelAnimationFrame(raf);clearTimeout(watchdog);signal.removeEventListener('abort',abort)};
   const stop=(reason)=>{if(stopping)return;stopping=true;failure=reason||null;cancelAnimationFrame(raf);try{if(recorder.state!=='inactive')recorder.stop();else{cleanup();reject(failure||Error('録画が開始されていません'))}}catch(e){cleanup();reject(e)}};
   const abort=()=>stop(signal.reason||new DOMException('停止しました','AbortError'));
   recorder.ondataavailable=e=>{if(e.data?.size){chunks.push(e.data);size+=e.data.size;if(size>24*1024*1024)stop(Error('1本のメモリ上限24MiBに達しました。解像度や尺を下げてください'))}};
   recorder.onerror=e=>stop(Error(e.error?.message||'Safariの録画処理でエラーが発生しました'));
   recorder.onstop=()=>{cleanup();if(failure){chunks=[];reject(failure);return}if(!size){reject(Error('MP4データが空です。低い解像度で再試行してください'));return}const type=recorder.mimeType||chunks[0]?.type;if(!/^video\/mp4(?:;|$)/i.test(type||'')){reject(Error('録画結果がMP4ではありません。保存を中止しました'));return}const blob=new Blob(chunks,{type:'video/mp4'});chunks=[];resolve(blob)};
   function tick(now){if(stopping)return;const elapsed=(now-start)/1000,dt=(now-last)/1000;last=now;if(dt>1.5){stop(Error('描画が長時間停止しました。解像度を下げ、Safariを前面にして再試行してください'));return}animation.draw(ctx,canvas.width,canvas.height,Math.min(elapsed,settings.duration),dt,settings.caption);onProgress(Math.min(100,elapsed/settings.duration*100));if(elapsed>=settings.duration){stop();return}raf=requestAnimationFrame(tick)}
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
