/** Render event-locked original foley offline, then play one timestamped buffer.
 * All events share one simulation clock; no frame-based batching or last-six loss.
 */
export async function renderQualityAudio(events,duration,rate=48000){
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw Error('このSafariはオフライン音声合成に対応していません。効果音OFFで録画してください。');
 const context=new Offline(2,Math.ceil((duration+.35)*rate),rate),master=context.createGain(),compressor=context.createDynamicsCompressor();master.gain.value=.34;compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=10;compressor.attack.value=.002;compressor.release.value=.08;master.connect(compressor);compressor.connect(context.destination);
 let accepted=0;const slots=new Map();
 function tone(freq,start,length,gain,pan=0){const osc=context.createOscillator(),amp=context.createGain(),panner=context.createStereoPanner();osc.type='sine';osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(freq*.78,start+length);amp.gain.setValueAtTime(.00001,start);amp.gain.exponentialRampToValueAtTime(gain,start+.002);amp.gain.exponentialRampToValueAtTime(.00001,start+length);panner.pan.value=pan;osc.connect(amp);amp.connect(panner);panner.connect(master);osc.start(start);osc.stop(start+length+.002)}
 for(const e of events){if(!['hit','escape','multiply','merge','eliminate','goal'].includes(e.type))continue;if(e.time<0||e.time>=duration)continue;const bucket=Math.floor(e.time/.012),count=slots.get(bucket)||0;if(count>=8)continue;slots.set(bucket,count+1);accepted++;const pan=Math.max(-.6,Math.min(.6,(e.x-270)/400)),pitch=360+(e.ball||0)%5*58,start=e.time+.002;
  if(e.type==='hit'){tone(pitch,start,.065,.12*Math.sqrt(e.intensity||.5),pan);tone(pitch*2.76,start,.027,.022,pan)}
  else if(e.type==='escape'){tone(660,start,.14,.13,pan);tone(990,start+.025,.18,.08,pan)}
  else if(e.type==='multiply'){tone(740,start,.075,.10,pan);tone(1110,start+.015,.07,.06,pan)}
  else if(e.type==='merge'){tone(330,start,.14,.14,pan);tone(495,start,.18,.08,pan)}
  else if(e.type==='eliminate')tone(190,start,.12,.12,pan);
  else if(e.type==='goal')for(const [i,f] of [523.25,659.25,783.99].entries())tone(f,start+i*.045,.28,.10,pan);
 }
 const buffer=await context.startRendering();let peak=0;for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]))}const gain=peak>0?Math.min(6,.65/peak):1;if(gain!==1)for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++)data[i]*=gain}
 return {buffer,accepted,peak:peak*gain,droppedForPolyphony:events.filter(e=>e.type!=='timeout').length-accepted};
}
export function wavBuffer(buffer){const frames=buffer.length,channels=buffer.numberOfChannels,bytes=new ArrayBuffer(44+frames*channels*2),v=new DataView(bytes),str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};str(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*channels*2,true);let at=44;for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){v.setInt16(at,clampPCM(buffer.getChannelData(c)[i])*32767,true);at+=2}return bytes}
const clampPCM=v=>Math.max(-1,Math.min(1,v));
