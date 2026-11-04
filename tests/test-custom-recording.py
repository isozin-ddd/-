"""Verify frozen recording settings and actual encoded-frame fidelity."""
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import threading,json,tempfile,subprocess,base64,os
ROOT=Path(__file__).resolve().parents[1]
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=b.new_page();page.goto(f'http://127.0.0.1:{s.server_port}')
 result=page.evaluate('''async()=>{
  const {DEFAULT_CUSTOM,normalizeCustom,createCustomScene}=await import('./custom-physics.js');const {record,inspect,simulationDigest}=await import('./engine.js?v=custom1');
  const config=normalizeCustom({...DEFAULT_CUSTOM,ballCount:100,maxBalls:200,ballSize:3,wallCount:0,ringsEnabled:true,ringCount:6,ringRadius:220,ringSpacing:20,ringRotation:0,gravity:0,ballSpeed:0,ballCollisions:false,airDrag:0,friction:0,glow:0,trailLength:0,collisionEffect:'none',ringEvent:'none',quality:'low',seed:12345});
  const canvas=document.createElement('canvas');document.body.append(canvas);const input={genre:'ball',templateId:'phy-ring-escape',seed:config.seed,width:360,duration:3,sfx:false,bgm:'off',caption:false,customSettings:config};
  const original=JSON.parse(JSON.stringify(input));const promise=record(canvas,input,{signal:new AbortController().signal,onProgress(){}});
  // Prove recording does not retain references to mutable inputs.
  input.customSettings.ballCount=1;input.customSettings.seed=999;input.width=1080;input.duration=15;input.seed=999;
  const blob=await promise,info=await inspect(blob);const expected=document.createElement('canvas');expected.width=360;expected.height=640;const scene=createCustomScene(original.customSettings);scene.draw(expected.getContext('2d'),360,640,3,0,false);
  const data=await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result.split(',')[1]);f.readAsDataURL(blob)});canvas.remove();
  return {video:data,image:expected.toDataURL().split(',')[1],info,stats:blob.recordingStats,expectedFingerprint:scene.stats.configFingerprint,expectedDigest:simulationDigest(scene.getState())};
 }''')
 assert result['info']['width']==360 and result['info']['height']==640 and result['info']['duration']<4
 stats=result['stats']['customSimulation'];assert stats['initialCounts']['balls']==100 and stats['initialCounts']['rings']==6 and stats['configFingerprint']==result['expectedFingerprint'];assert stats['finalStateDigest']==result['expectedDigest']
 with tempfile.TemporaryDirectory() as tmp:
  video=Path(tmp)/'actual.mp4';expected=Path(tmp)/'expected.png';actual=Path(tmp)/'encoded.png';video.write_bytes(base64.b64decode(result.pop('video')));expected.write_bytes(base64.b64decode(result.pop('image')))
  subprocess.run(['ffmpeg','-v','error','-y','-ss','0.5','-i',str(video),'-frames:v','1',str(actual)],check=True)
  a=Image.open(actual).convert('RGB');e=Image.open(expected).convert('RGB');assert a.size==e.size==(360,640)
  crop=(16,84,344,524);mae=sum(ImageStat.Stat(ImageChops.difference(a.crop(crop),e.crop(crop))).mean)/3
  assert mae<5,mae
 result.update({'status':'PASS','browser':'Chromium','iphone_safari':'UNTESTED','encoded_static_stage_mean_absolute_rgb_error':mae,'image_comparison_limit':'A static100-ball6-ring stage verifies encoded geometry/settings; this is not frame-exact verification of every moving case','checks':['Changing source settings duringrecording doesnotchange frozenrecording','ActualMP4 retains360x6403sec and100balls6rings','Normalizedconfiguration fingerprint agrees','Finalsolver state agrees with independent scene','DecodedMP4frame matches renderedstaticstage withincodecerror']})
 (ROOT/'reports'/'custom-recording-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));b.close()
s.shutdown()
