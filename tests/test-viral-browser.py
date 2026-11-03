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
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/index.html');page.wait_for_selector('#single:not([disabled])')
  page.click('[data-genre="viral"]');assert page.locator('#template option').count()==4
  page.select_option('#duration','90');page.fill('#seed','10');page.dispatch_event('#seed','change')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'mobile horizontal overflow'
  page.screenshot(path=str(out/'mobile.png'),full_page=True)
  for mode,seed,legacy in [('escape',2,'phy-ring-escape'),('multiply',42,'phy-multiplication'),('center',10,'phy-ring-escape')]:
   frames=page.evaluate('''async({mode,seed,legacy})=>{const {scene}=await import('./engine.js?v=viral1');const c=document.createElement('canvas');c.width=540;c.height=960;const a=scene('viral',seed,{templateId:'viral-'+mode,duration:15});a.draw(c.getContext('2d'),540,960,7,0,true);const after=c.toDataURL();const b=scene('ball',seed,{templateId:legacy,duration:15});b.draw(c.getContext('2d'),540,960,7,0,true);return {after,before:c.toDataURL()}}''',{'mode':mode,'seed':seed,'legacy':legacy})
   for key,data in frames.items():(out/f'{mode}-{key}.png').write_bytes(base64.b64decode(data.split(',')[1]))
   video=page.evaluate('''async({mode,seed})=>{const {record,inspect}=await import('./engine.js?v=viral1');const canvas=document.createElement('canvas');document.body.append(canvas);const audio=new AudioContext();await audio.resume();try{const blob=await record(canvas,{genre:'viral',templateId:'viral-'+mode,seed,width:360,duration:15,sfx:true,bgm:'off',caption:true},{signal:new AbortController().signal,audioContext:audio,onProgress(){}});const info=await inspect(blob);const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});return {data,info,stats:blob.recordingStats}}finally{canvas.remove();await audio.close()}}''',{'mode':mode,'seed':seed})
   file=out/f'{mode}.mp4';file.write_bytes(base64.b64decode(video.pop('data')))
   probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(file)]))
   assert {s['codec_type'] for s in probe['streams']}=={'video','audio'}
   assert 14<=float(probe['format']['duration'])<=18
   assert video['info']['width']==360 and video['info']['height']==640
   assert video['stats']['soundEvents']>0
   results.append({'mode':mode,'seed':seed,**video,'streams':[{'type':s['codec_type'],'codec':s['codec_name']} for s in probe['streams']]})
  assert not errors,errors
  browser.close()
 (out/'qa.json').write_text(json.dumps({'browser':'Chromium GitHub Actions; iPhone hardware untested','results':results},indent=2))
finally:server.shutdown()
