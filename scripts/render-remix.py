"""Bounded Actions renderer: one MP4 at a time, no SNS requests or write tokens."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import argparse,threading,json,base64,subprocess,os
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--count',type=int,default=5);p.add_argument('--duration',type=int,default=15);p.add_argument('--seed',type=int,default=20261106);p.add_argument('--offset',type=int,default=0);p.add_argument('--width',type=int,default=360);p.add_argument('--output',default='reports/remix-batch');args=p.parse_args()
assert 1<=args.count<=10 and args.duration in [3,15,30,61,75,90] and args.width in [360,540,720] and 0<=args.offset<100
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=b.new_page();page.goto(f'http://127.0.0.1:{server.server_port}');page.evaluate("document.querySelector('#studio-workspace').hidden=true")
  plans=page.evaluate('''async({seed,duration,offset,count})=>{const {makeDesign,ARCHETYPES,performanceChoice}=await import('./remix/design.js');const data=await(await fetch('./remix/research.json')).json(),metrics=await(await fetch('./remix/performance.json')).json();const pick=performanceChoice(ARCHETYPES,metrics.performance,seed,duration);const order=[pick.archetype,...ARCHETYPES.filter(a=>a.id!==pick.archetype.id)];return Array.from({length:count},(_,i)=>makeDesign(order[(offset+i)%10],{seed,duration},data.references[0],offset+i))}''',dict(seed=args.seed&0xffffffff,duration=args.duration,offset=args.offset,count=args.count))
  for i,design in enumerate(plans):
   failure=None
   for attempt in range(3):
    try:
     result=page.evaluate('''async({design,width})=>{const {preflight,inspectEncoded}=await import('./remix/quality.js');const {record}=await import('./engine.js?v=remix1');const qa=await preflight(design);if(!qa.passed)throw Error('preflight failed');const canvas=document.createElement('canvas');document.body.append(canvas);const audio=new AudioContext();await audio.resume();try{const settings={genre:design.genre,seed:design.seed,duration:design.duration,width,sfx:true,bgm:'off',caption:true,remixDesign:design};const blob=await record(canvas,settings,{signal:new AbortController().signal,onProgress(){},audioContext:audio});qa.encoded=await inspectEncoded(blob,settings);if(!blob.recordingStats.soundEvents)throw Error('no sound events');const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});return {data,qa,stats:blob.recordingStats}}finally{await audio.close();canvas.remove()}}''',dict(design=design,width=args.width));raw=OUT/f'{args.offset+i:03d}-raw.mp4';raw.write_bytes(base64.b64decode(result.pop('data')));target=OUT/f'{args.offset+i:03d}-{design["archetype"]}.mp4'
     subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',str(target)],check=True);raw.unlink();probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(target)]));assert {s['codec_type'] for s in probe['streams']}=={'video','audio'};assert any(s.get('codec_name')=='h264' for s in probe['streams']);
     # A real decoded PCM level check, not merely an audio stream declaration.
     levels=subprocess.run(['ffmpeg','-hide_banner','-i',str(target),'-vn','-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True).stderr
     assert 'max_volume: -inf' not in levels and 'max_volume:' in levels
     results.append(dict(design=design,file=target.name,quality=result['qa'],recording=result['stats'],encoded_audio_non_silent=True,attempts=attempt+1));print(f'PASS {args.offset+i+1}: {target.name}',flush=True);failure=None;break
    except Exception as e:
     failure=str(e);print(f'RETRY {i} attempt {attempt+1}: {failure}',flush=True);design=page.evaluate("async d=>{const {makeDesign,ARCHETYPES}=await import('./remix/design.js');return makeDesign(ARCHETYPES.find(a=>a.id===d.archetype),{...d.custom,seed:(d.seed+7919)>>>0,duration:d.duration,genre:d.genre},{reference_id:d.source_reference_id},1)}",design)
   if failure:raise RuntimeError(failure)
   (OUT/'manifest.json').write_text(json.dumps(dict(status='PASS',results=results,iphone_safari='UNTESTED'),ensure_ascii=False,indent=2))
  b.close()
finally:server.shutdown()
