from playwright.sync_api import sync_playwright
import json,time
url='https://isozin-ddd.github.io/-/'
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome');context=b.new_context(viewport={'width':390,'height':844},has_touch=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));last=None
 for attempt in range(8):
  try:
   page.goto(url+'?release=quality1-'+str(int(time.time())),wait_until='networkidle');assert page.locator('meta[name=app-version]').get_attribute('content')=='quality-v1-2026-11-09';page.click('[data-quality-work=escape]');page.wait_for_function("document.querySelector('#canvas').dataset.engineVersion==='quality-1'");assert page.locator('#quality-controls').is_visible();assert page.locator('#single').is_enabled();assert page.locator('#batch20').is_disabled();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#template option').count()==21
   gallery=context.new_page();response=gallery.goto(url+'samples/quality/index.html?check='+str(int(time.time())));assert response.status==200;assert gallery.locator('video').count()==6
   decoded=[]
   for index in [1,3,5]:
    result=gallery.locator('video').nth(index).evaluate('''v=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Sample metadata timeout')),15000);v.onloadedmetadata=()=>{clearTimeout(timeout);resolve({width:v.videoWidth,height:v.videoHeight,duration:v.duration})};v.onerror=()=>{clearTimeout(timeout);reject(Error('Sample video error '+v.error?.code))};v.preload='auto';v.load()})''');assert result['width']==720 and result['height']==1280 and 14<result['duration']<16;decoded.append(result)
   gallery.close();assert not errors,errors;print(json.dumps({'status':'PASS','published_url':url,'decoded_after_samples':decoded,'mobile_width':390,'quality_engine':'quality-1','catalog':80,'bulk':'paused','iphone_safari':'UNTESTED'}),flush=True);last=None;break
  except Exception as e:
   last=e;print(str(e),flush=True)
   for extra in context.pages:
    if extra!=page:extra.close()
   time.sleep(10)
 b.close()
 if last:raise last
