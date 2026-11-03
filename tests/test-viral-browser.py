"""Real Chromium recording gate; outputs comparison samples into Pages artifact."""
import base64,json,subprocess,threading,http.server,functools,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'docs/samples/viral';out.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root/'docs')))
threading.Thread(target=server.serve_forever,daemon=True).start()
results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
  page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True)
  page.set_default_timeout(180000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/index.html');page.wait_for_selector('#single:not([disabled])')
  page.click('[data-genre="viral"]');assert page.locator('#template option').count()==21
  page.select_option('#duration','90');page.fill('#seed','10');page.dispatch_event('#seed','change')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'mobile horizontal overflow'
  page.screenshot(path=str(out/'mobile.png'),full_page=True)
  gallery=page.evaluate('''async()=>{const {templates,create}=await import('./scenes/viral.js');const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;return templates.map(t=>{const a=create(t.id,10,{duration:15});for(const time of [0,3,7,14.5,15])a.draw(canvas.getContext('2d'),360,640,time,0,true);if(a.world.balls.some(b=>!Number.isFinite(b.x+b.y+b.r)))throw Error(t.id);return {id:t.id,image:canvas.toDataURL()}})}''')
  for entry in gallery:(out/(entry['id']+'.png')).write_bytes(base64.b64decode(entry['image'].split(',')[1]))
  for mode,seed,legacy in [('escape',2,'phy-ring-escape'),('multiply',42,'phy-multiplication'),('center',10,'phy-ring-escape')]:
   frames=page.evaluate('''async({mode,seed,legacy})=>{const {scene}=await import('./engine.js?v=viral2');const c=document.createElement('canvas');c.width=540;c.height=960;const a=scene('viral',seed,{templateId:'viral-'+mode,duration:15});a.draw(c.getContext('2d'),540,960,7,0,true);const after=c.toDataURL();const b=scene('ball',seed,{templateId:legacy,duration:15});b.draw(c.getContext('2d'),540,960,7,0,true);return {after,before:c.toDataURL()}}''',{'mode':mode,'seed':seed,'legacy':legacy})
   for key,data in frames.items():(out/f'{mode}-{key}.png').write_bytes(base64.b64decode(data.split(',')[1]))
   video=page.evaluate('''async({mode,seed})=>{const {record,inspect}=await import('./engine.js?v=viral2');const canvas=document.createElement('canvas');document.body.append(canvas);const audio=new AudioContext();await audio.resume();try{const blob=await record(canvas,{genre:'viral',templateId:'viral-'+mode,seed,width:360,duration:15,sfx:true,bgm:'off',caption:true},{signal:new AbortController().signal,audioContext:audio,onProgress(){}});const info=await inspect(blob);const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});return {data,info,stats:blob.recordingStats}}finally{canvas.remove();await audio.close()}}''',{'mode':mode,'seed':seed})
   file=out/f'{mode}.mp4';file.write_bytes(base64.b64decode(video.pop('data')))
   native=out/f'{mode}-native.mp4';file.rename(native)
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(native),'-c:v','libx264','-pix_fmt','yuv420p','-crf','21','-c:a','aac','-movflags','+faststart',str(file)],check=True)
   native.unlink()
   probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(file)]))
   assert {s['codec_type'] for s in probe['streams']}=={'video','audio'}
   assert 14<=float(probe['format']['duration'])<=18
   assert video['info']['width']==360 and video['info']['height']==640
   assert video['stats']['soundEvents']>0
   results.append({'mode':mode,'seed':seed,**video,'streams':[{'type':s['codec_type'],'codec':s['codec_name']} for s in probe['streams']]})
  # Exercise the actual UI queue, persistence and duplicate guard.
  page.select_option('#duration','3');page.select_option('#template','viral-escape');page.fill('#seed','123');page.click('#single')
  page.wait_for_function("document.querySelector('#status').textContent.includes('1本が完成')")
  page.click('#single');assert '保存済み' in page.locator('#error').inner_text()
  page.fill('#seed','');page.click('#batch20')
  page.wait_for_function("document.querySelector('#status').textContent.includes('20本が完成')",timeout=180000)
  assert page.locator('#jobs .card').count()==21
  queue=page.evaluate("JSON.parse(localStorage.getItem('infinite-shorts-pending-v1'))")
  assert queue==[]
  results.append({'ui_batch_completed':20,'persisted_videos':21,'duplicate_guard':True})
  # A real long recording, not a simulated duration claim.
  long_info=page.evaluate('''async()=>{const {record,inspect}=await import('./engine.js?v=viral2');const c=document.createElement('canvas');document.body.append(c);try{const blob=await record(c,{genre:'viral',templateId:'viral-center',seed:10,width:360,duration:61,sfx:false,bgm:'off',caption:true},{signal:new AbortController().signal,onProgress(){}});return {info:await inspect(blob),stats:blob.recordingStats}}finally{c.remove()}}''')
  assert 60<=long_info['info']['duration']<=64
  results.append({'long_recording':long_info})
  assert not errors,errors
  browser.close()
 (out/'qa.json').write_text(json.dumps({'browser':'Chromium GitHub Actions; iPhone hardware untested','results':results},indent=2))
finally:server.shutdown()
