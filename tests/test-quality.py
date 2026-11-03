"""Real Canvas quality artifacts. No remote videos downloaded. iPhone untested."""
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import threading,json,base64,time,subprocess,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs'/'samples';OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000)
 stats=page.evaluate('''async()=>{
  const {CATALOG,studioScene}=await import('./catalog.js');const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const ctx=canvas.getContext('2d');
  const hash=()=>{const a=ctx.getImageData(0,0,360,640).data;let h=2166136261;for(let i=0;i<a.length;i+=13)h=Math.imul(h^a[i],16777619);return h>>>0};
  const results=[];for(const template of CATALOG){const model=studioScene(template.genre,20261103,{templateId:template.id,duration:3}),times=[0,.1,.75,1.5,2.25,2.997],hashes=[],drawMs=[];
   for(const t of times){const start=performance.now();model.draw(ctx,360,640,t,1/24,true);drawMs.push(performance.now()-start);hashes.push(hash())}
   model.draw(ctx,360,640,0,1/24,false);const first=ctx.getImageData(0,0,360,640).data;model.draw(ctx,360,640,2.997,1/24,false);const last=ctx.getImageData(0,0,360,640).data;let delta=0;for(let i=0;i<first.length;i+=4)delta+=Math.abs(first[i]-last[i])+Math.abs(first[i+1]-last[i+1])+Math.abs(first[i+2]-last[i+2]);
   const events=model.eventsBetween(-.001,3);if(events.some(e=>!Number.isFinite(e.time)||e.time<0||e.time>3||!Number.isFinite(e.pitch)||!Number.isFinite(e.intensity)))throw Error(template.id+' invalid events');
   results.push({id:template.id,genre:template.genre,motion:template.motion,unique_frame_hashes:new Set(hashes).size,hashes,draw_ms:drawMs,loop:template.loop,endpoint_mean_absolute_rgb_difference:delta/(360*640*3),sound_events:events.length,stats:model.stats||null})
  }return results;
 }''')
 assert len(stats)==60 and all(r['unique_frame_hashes']>1 for r in stats),stats
 print('PASS all60 real Canvas scenes, animation changes and finite audio events',flush=True)
 catalog=page.evaluate("async()=>[...(await import('./catalog.js')).CATALOG]");featured=[]
 for genre in ['ball','asmr','meme','domino']:featured.extend([t for t in catalog if t['genre']==genre][:3])
 entries=[]
 for template in featured:
  result=page.evaluate('''async(template)=>{const {studioScene}=await import('./catalog.js');const c=document.createElement('canvas');c.width=360;c.height=640;const scene=studioScene(template.genre,20261103,{templateId:template.id,duration:3});scene.draw(c.getContext('2d'),360,640,1.4,1/24,true);return c.toDataURL('image/png').split(',')[1]}''',template)
  filename=template['id']+'.png';(OUT/filename).write_bytes(base64.b64decode(result));entries.append({'id':template['id'],'genre':template['genre'],'name':template['name'],'image':filename,'loop':template['loop'],'note':'Canvas2D stylized approximation; original procedural geometry'})
 for genre in ['ball','asmr','meme','domino']:
  png=page.evaluate('''async(genre)=>{const {scene}=await import('./legacy-engine.js');const c=document.createElement('canvas');c.width=360;c.height=640;const m=scene(genre,20261103);for(let i=0;i<=34;i++)m.draw(c.getContext('2d'),360,640,i/24,1/24,true);return c.toDataURL('image/png').split(',')[1]}''',genre);(OUT/(genre+'-before.png')).write_bytes(base64.b64decode(png))
 representative=[next(t for t in featured if t['genre']==g) for g in ['ball','asmr','meme','domino']]
 for template in representative:
  for version in ['before','after']:
   result=page.evaluate('''async({template,version})=>{const module=await import(version==='before'?'./legacy-engine.js':'./engine.js');const Audio=window.AudioContext||window.webkitAudioContext;const context=new Audio();await context.resume();const canvas=document.createElement('canvas');document.body.append(canvas);try{const blob=await module.record(canvas,{genre:template.genre,templateId:template.id,seed:20261103,width:360,duration:3,caption:true,sfx:true,bgm:'calm'},{signal:new AbortController().signal,onProgress:()=>{},audioContext:context});const meta=await module.inspect(blob);const data=await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result.split(',')[1]);f.readAsDataURL(blob)});return {data,meta,stats:blob.recordingStats||null}}finally{canvas.remove();await context.close()}}''',{'template':template,'version':version})
   file=OUT/(template['genre']+'-'+version+'.mp4');file.write_bytes(base64.b64decode(result['data']));delivery=file.with_suffix('.aac.mp4');subprocess.run(['ffmpeg','-v','error','-y','-i',str(file),'-c:v','copy','-c:a','aac','-b:a','96k','-movflags','+faststart',str(delivery)],check=True);delivery.replace(file);info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-of','json',str(file)]));v=next(x for x in info['streams'] if x['codec_type']=='video');assert (v['width'],v['height'],v['codec_name'])==(360,640,'h264');assert any(x['codec_type']=='audio' for x in info['streams']);
   match=next(e for e in entries if e['id']==template['id']);match[version+'_video']=file.name;match[version+'_recording_stats']=result['stats'];match[version+'_bytes']=file.stat().st_size;match[version+'_delivery_audio_codec']='aac';match[version+'_native_recording_note']='Browser native audio may be Opus; delivery sample normalized offline to AAC. App has no FFmpeg dependency.';match[version+'_codec_streams']=[{'type':x['codec_type'],'codec':x['codec_name']} for x in info['streams']]
   print('PASS '+file.name+' real MP4 decoded',flush=True)
 assert not errors,errors
 page.screenshot(path=str(ROOT/'reports'/'global-mobile.png'),full_page=False);browser.close()
report={'verified_in':'Chromium desktop at mobile viewport 390x844','iphone_safari':'UNTESTED','seed':20261103,'resolution':[360,640],'duration_seconds':3,'reference_media_used':False,'template_count':60,'featured_count':12,'sample_mp4_count':8,'evaluation_limits':['Draw timings are local browser CPU observations, not iPhone performance','Endpoint pixel difference includes background; does not prove a perceptually seamless loop','No human popularity, revenue, originality legal or aesthetic score is inferred','Audio presence and event scheduling checked; subjective sound quality/sync requires listening'],'scenes':stats,'featured':entries}
(ROOT/'reports'/'quality-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));(OUT/'comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));server.shutdown();print('PASS sample quality artifacts complete',flush=True)
