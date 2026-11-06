from playwright.sync_api import sync_playwright
import json,time
url='https://isozin-ddd.github.io/-/'
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
 last=None
 for attempt in range(6):
  try:
   page.goto(url+'?release=remix1-'+str(int(time.time())),wait_until='networkidle')
   page.click('[data-genre="viral"]')
   assert page.locator('#template option').count()==21
   assert page.locator('#duration option[value="90"]').is_enabled()
   assert page.locator('meta[name=app-version]').get_attribute('content')=='remix-v1-2026-11-06'
   page.get_by_role('button',name='詳細カスタマイズ',exact=True).click()
   page.locator('[name=custom-ballCount]').fill('100')
   page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').balls===100")
   assert page.locator('#canvas').get_attribute('data-custom')=='true'
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.get_by_role('button',name='簡単モード',exact=True).click()
   page.click('#remix-tab')
   page.wait_for_function("document.querySelector('#remix-design')&&!document.querySelector('#remix-design').disabled")
   page.click('#remix-design')
   page.wait_for_function("document.querySelectorAll('#remix-designs article').length===10")
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.request.get(url+'samples/remix/iris.mp4').status==200
   page.click('#studio-tab')
   result=page.evaluate('''async()=>{const r=await fetch('./samples/viral/qa.json?check='+Date.now());if(!r.ok)throw Error('sample QA missing');return await r.json()}''')
   assert len(result['results'])>=5
   fps=page.evaluate('''()=>new Promise(resolve=>{let first=0,frames=0;function frame(t){if(!first)first=t;frames++;if(t-first>=1000)resolve((frames-1)*1000/(t-first));else requestAnimationFrame(frame)}requestAnimationFrame(frame)})''')
   print(json.dumps({'preview_raf_fps':fps,'url':url,'templates':20,'mobile_width':390,'sample_results':len(result['results']),'iphone_hardware_tested':False,'custom_preview_balls':100,'release':'remix-v1-2026-11-06'}));last=None;break
  except Exception as e:last=e;time.sleep(10)
 b.close()
 if last:raise last
