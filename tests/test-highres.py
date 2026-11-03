"""Twelve sequential high-resolution native MP4 recordings in desktop Chromium.
This is a bounded desktop observation, NOT an iPhone test or long-run stress test.
No output video is retained; each recording is inspected then discarded.
"""
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from datetime import datetime,timezone
import json,os,base64,tempfile,subprocess
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'docs'),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/_highres_qa.html':
   data=b'<!doctype html><html><body><canvas id="canvas"></canvas></body></html>'
   self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);Thread(target=server.serve_forever,daemon=True).start()
report={'verified_at':datetime.now(timezone.utc).isoformat(),'environment':'Desktop Chromium headless, local static HTTP, mobile-sized viewport; application preview loop omitted to isolate recording. Other workspace tests may share CPU.','iphone_safari':'UNTESTED','scope':'Four genres × 540/720/1080 widths × one 3-second recording; sequential, not ten high-resolution files or long-duration stress.','records':[]}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  page=browser.new_page(viewport={'width':390,'height':844});page.goto(f'http://127.0.0.1:{server.server_port}/_highres_qa.html')
  page.evaluate('''() => { window.capturedTracks=[];const capture=HTMLCanvasElement.prototype.captureStream;HTMLCanvasElement.prototype.captureStream=function(...args){const stream=capture.apply(this,args);window.capturedTracks.push(...stream.getTracks());return stream};const Audio=window.AudioContext;const destination=Audio.prototype.createMediaStreamDestination;Audio.prototype.createMediaStreamDestination=function(...args){const result=destination.apply(this,args);window.capturedTracks.push(...result.stream.getTracks());return result}; }''')
  for width in [540,720,1080]:
   for genre in ['ball','asmr','meme','domino']:
    print(f'RECORD {genre} {width}x{width*16//9}',flush=True)
    result=page.evaluate('''async ({width,genre})=>{
     const {record,inspect}=await import('./engine.js'),{CATALOG}=await import('./catalog.js');
     const template=CATALOG.find(t=>t.genre===genre),context=new AudioContext();const before=window.capturedTracks.length;
     try{
      await context.resume();const settings={genre,templateId:template.id,width,duration:3,caption:true,sfx:true,bgm:'calm',seed:20261103};
      const blob=await record(document.querySelector('#canvas'),settings,{signal:new AbortController().signal,onProgress:()=>{},audioContext:context});const metadata=await inspect(blob);
      const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
      return {ok:true,genre,template_id:template.id,width,metadata,size:blob.size,type:blob.type,recording:blob.recordingStats,track_states:window.capturedTracks.slice(before).map(t=>({kind:t.kind,state:t.readyState})),base64:btoa(binary)};
     }catch(e){return {ok:false,genre,width,error:e.message||String(e)}}finally{await context.close()}
    }''',{'width':width,'genre':genre})
    if result.get('ok'):
     raw=base64.b64decode(result.pop('base64'))
     with tempfile.TemporaryDirectory() as directory:
      target=Path(directory)/'single.mp4';target.write_bytes(raw)
      info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(target)]));streams=info['streams']
      video=next(s for s in streams if s['codec_type']=='video');audio=next((s for s in streams if s['codec_type']=='audio'),None)
      result['ffprobe']={'video_codec':video['codec_name'],'width':video['width'],'height':video['height'],'avg_frame_rate':video.get('avg_frame_rate'),'audio_codec':audio['codec_name'] if audio else None,'duration':float(info['format']['duration'])}
     del raw
     result['passed']=result['metadata']['width']==width and result['metadata']['height']==width*16//9 and video['width']==width and video['height']==width*16//9 and audio is not None and result['ffprobe']['duration']>=2.5 and all(t['state']=='ended' for t in result['track_states'])
     stats=result['recording'];stats['observed_fps']=stats['renderedFrames']/stats['elapsedSeconds'];print(json.dumps({k:v for k,v in result.items() if k!='metadata'}),flush=True)
    else:result['passed']=False;print(json.dumps(result),flush=True)
    report['records'].append(result)
  browser.close()
finally:
 server.shutdown();report['status']='PASS' if len(report['records'])==12 and all(r.get('passed') for r in report['records']) else 'FAIL';(ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports'/'highres-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('FINAL '+report['status'],flush=True)
if report['status']!='PASS':raise SystemExit(1)
