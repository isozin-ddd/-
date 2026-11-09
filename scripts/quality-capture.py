from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import argparse,threading,json,base64,subprocess,os
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--version',choices=['before','after'],required=True);p.add_argument('--modes',default='escape,multiply,last');p.add_argument('--width',type=int,default=720);p.add_argument('--duration',type=int,default=15);p.add_argument('--seed',type=int,default=10);a=p.parse_args();OUT=ROOT/'reports/quality'/a.version;OUT.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*x,**k):super().__init__(*x,directory=str(ROOT/'docs'),**k)
 def log_message(self,*x):pass
s=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=b.new_page();page.goto(f'http://127.0.0.1:{s.server_port}');page.evaluate("document.querySelector('#studio-workspace').hidden=true");results=[]
 for mode in a.modes.split(','):
  result=page.evaluate('''async args=>{const engine=await import(args.version==='before'?'./quality/legacy-engine.js':'./engine.js?v=quality1');const settings={genre:'viral',templateId:'viral-'+args.mode,engineVersion:args.version==='before'?'viral-3':'quality-1',seed:args.seed,width:args.width,duration:args.duration,sfx:true,bgm:'off',caption:true};const canvas=document.createElement('canvas');document.body.append(canvas);const audio=new AudioContext();await audio.resume();try{const blob=await engine.record(canvas,settings,{signal:new AbortController().signal,onProgress(){},audioContext:audio});const reference=blob.qualityReferenceWav?await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob.qualityReferenceWav)}):null;const bytes=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob)});const animation=engine.scene('viral',args.seed,settings),ctx=canvas.getContext('2d');animation.draw(ctx,args.width,args.width*16/9,args.duration,0,true);return {bytes,reference,stats:blob.recordingStats,world:animation.world?.snapshot?.()||{outcome:animation.world?.outcome,hits:animation.world?.hits,events:animation.world?.events},settings}}finally{canvas.remove();await audio.close()}}''',dict(version=a.version,mode=mode,width=a.width,duration=a.duration,seed=a.seed))
  reference=result.pop('reference',None)
  if reference:(OUT/(mode+'-reference.wav')).write_bytes(base64.b64decode(reference))
  raw=OUT/(mode+'-raw.mp4');raw.write_bytes(base64.b64decode(result.pop('bytes')));target=OUT/(mode+'.mp4');subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-fps_mode','passthrough','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',str(target)],check=True);raw.rename(OUT/(mode+'-native.mp4'));result['native_frames']=int(json.loads(subprocess.check_output(['ffprobe','-v','quiet','-select_streams','v','-count_frames','-show_entries','stream=nb_read_frames','-of','json',str(OUT/(mode+'-native.mp4'))]))['streams'][0]['nb_read_frames']);result['probe']=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(target)]));(OUT/(mode+'.json')).write_text(json.dumps(result,indent=2));
  for t in [1,7,14]:subprocess.run(['ffmpeg','-v','error','-y','-ss',str(min(t,a.duration-.1)),'-i',str(target),'-frames:v','1',str(OUT/(mode+'-'+str(t)+'.png'))],check=True)
  print('PASS actual '+a.version+' '+mode,flush=True)
 b.close()
s.shutdown()
