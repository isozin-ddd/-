from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import subprocess,json,tempfile,base64,threading,os
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT/'docs'),**k)
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=s.serve_forever,daemon=True).start();results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox']);page=b.new_page();page.goto(f'http://127.0.0.1:{s.server_port}');page.evaluate("document.querySelector('#studio-workspace').hidden=true")
 for mode in ['seed-10','seed-40','seed-47']:
  folder=ROOT/'reports/same-prompt';meta=folder/(mode+'.json');video=folder/(mode+'.mp4')
  if not meta.exists():continue
  data=json.loads(meta.read_text());frames=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-select_streams','v','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(video)]))['frames'];samples=[]
  with tempfile.TemporaryDirectory() as temp:
   for n in [int(len(frames)*fraction) for fraction in [.04+i*.044 for i in range(21)]]:
    target=Path(temp)/(str(n)+'.png');subprocess.run(['ffmpeg','-v','error','-y','-i',str(video),'-vf',f'select=eq(n\\,{n}),scale=180:320','-fps_mode','vfr','-frames:v','1',str(target)],check=True);samples.append({'pts':float(frames[n]['best_effort_timestamp_time']),'image':base64.b64encode(target.read_bytes()).decode()})
  score=page.evaluate('''async({settings,samples})=>{const {createQualityScene}=await import('./quality/scene.js');const c=document.createElement('canvas');c.width=180;c.height=320;const ctx=c.getContext('2d',{willReadFrequently:true}),actual=[];for(const s of samples){const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='data:image/png;base64,'+s.image});ctx.drawImage(image,0,0);actual.push(ctx.getImageData(0,0,180,320).data)}const scores=[];for(let k=-12;k<=48;k++){const lag=k/240,scene=createQualityScene(settings.templateId,settings.seed,settings);let sum=0;for(let j=0;j<samples.length;j++){scene.draw(ctx,180,320,Math.max(0,samples[j].pts-lag),0,true);const ref=ctx.getImageData(0,0,180,320).data,real=actual[j];for(let y=56;y<267;y++)for(let x=13;x<167;x++){const i=(y*180+x)*4;sum+=(ref[i]-real[i])**2+(ref[i+1]-real[i+1])**2+(ref[i+2]-real[i+2])**2}}scores.push({lag,mse:sum/(samples.length*211*154*3)})}return scores.sort((a,b)=>a.mse-b.mse)}''',{'settings':data['settings'],'samples':samples});row={'mode':mode,'video_timeline_offset_seconds':score[0]['lag'],'mse':score[0]['mse'],'next_candidates':score[1:4],'method':'21 actual encoded frames, geometry fit against independent deterministic renderer;4.17ms search bins'};results.append(row);print(json.dumps(row),flush=True)
 b.close()
s.shutdown();(ROOT/'reports/same-prompt/video-offset.json').write_text(json.dumps(results,indent=2))
