from playwright.sync_api import sync_playwright
import json,time
url='https://isozin-ddd.github.io/-/'
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 last=None
 for attempt in range(6):
  try:
   page.goto(url+'?release=viral2-'+str(int(time.time())),wait_until='networkidle')
   page.click('[data-genre="viral"]')
   assert page.locator('#template option').count()==21
   assert page.locator('#duration option[value="90"]').is_enabled()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   result=page.evaluate('''async()=>{const r=await fetch('./samples/viral/qa.json?check='+Date.now());if(!r.ok)throw Error('sample QA missing');return await r.json()}''')
   assert len(result['results'])>=5
   fps=page.evaluate('''()=>new Promise(resolve=>{let first=0,frames=0;function frame(t){if(!first)first=t;frames++;if(t-first>=1000)resolve((frames-1)*1000/(t-first));else requestAnimationFrame(frame)}requestAnimationFrame(frame)})''')
   print(json.dumps({'preview_raf_fps':fps,'url':url,'templates':20,'mobile_width':390,'sample_results':len(result['results']),'iphone_hardware_tested':False}));last=None;break
  except Exception as e:last=e;time.sleep(10)
 b.close()
 if last:raise last
