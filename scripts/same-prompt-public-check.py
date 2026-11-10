from playwright.sync_api import sync_playwright
import json,time,os,hashlib
from pathlib import Path
url=os.getenv('SAME_PROMPT_URL','https://isozin-ddd.github.io/-/samples/same-prompt/')
with sync_playwright() as p:
 b=p.chromium.launch(**({'executable_path':os.environ['BROWSER_PATH']} if os.getenv('BROWSER_PATH') else {'channel':'chrome'}));context=b.new_context(viewport={'width':390,'height':844},has_touch=True);page=context.new_page();last=None
 for attempt in range(8):
  try:
   response=page.goto(url+'index.html?check='+str(int(time.time())));assert response.status==200,f"Public sample HTTP {response.status}: {page.title()}"
   manifest=context.request.get(url+'manifest.json').json();assert len(manifest['videos'])==3
   text=context.request.get(url+'common-prompt.txt').body();assert hashlib.sha256(text).hexdigest()==manifest['prompt_sha256']
   assert page.locator('video').count()==3;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.three').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==3
   decoded=[]
   for i,row in enumerate(manifest['videos']):
    assert context.request.get(url+f"seed-{row['seed']}-prompt.txt").body()==text
    media=context.request.get(url+row['video']);assert media.status==200,f"MP4 HTTP {media.status}";assert hashlib.sha256(media.body()).hexdigest()==row['video_sha256'],'Published MP4 content hash mismatch'
    result=page.locator('video').nth(i).evaluate('''v=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('MP4 metadata timeout')),15000);v.onloadedmetadata=()=>{clearTimeout(t);resolve({width:v.videoWidth,height:v.videoHeight,duration:v.duration})};v.onerror=()=>reject(Error('MP4 decode error '+v.error?.code));v.load()})''');assert result['width']==720 and result['height']==1280 and 15<result['duration']<16;decoded.append(result)
   page.click('#play');page.wait_for_timeout(1200);assert page.locator('video').evaluate_all('vs=>vs.every(v=>v.currentTime>0&&!v.paused)');assert page.locator('video').evaluate_all('vs=>vs.filter(v=>!v.muted).length')==1;page.click('#pause');assert page.locator('video').evaluate_all('vs=>vs.every(v=>v.paused)')
   print(json.dumps({'status':'PASS','url':url,'decoded':decoded,'identical_prompt_sha256':manifest['prompt_sha256'],'iphone_safari':'UNTESTED'}),flush=True);last=None;break
  except Exception as e:last=e;print(str(e),flush=True);time.sleep(10)
 b.close()
 if last:raise last
