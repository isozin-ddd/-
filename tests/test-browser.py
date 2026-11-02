"""Actual Chromium MP4 tests. This is NOT an iPhone/Safari test."""
from playwright.sync_api import sync_playwright
import http.server,threading,json,subprocess,tempfile,time,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT/'docs'),**kw)
 def do_GET(self):
  if self.path.startswith('/-/'):self.path=self.path[2:]
  super().do_GET()
 def log_message(self,*a):pass
http=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=http.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(http.server_port)+'/-/'
results={'browser':'Chromium desktop, mobile viewport 390x844','iphone_safari':'UNTESTED','checks':[]}
def check(name,condition=True):
 assert condition,name;results['checks'].append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,accept_downloads=True)
 context.add_init_script('''window.maxRecorders=0;window.liveRecorders=0;const Original=window.MediaRecorder;window.MediaRecorder=class extends Original {start(...args){super.start(...args);window.liveRecorders++;window.maxRecorders=Math.max(window.maxRecorders,window.liveRecorders);this.addEventListener('stop',()=>window.liveRecorders--,{once:true})}};''')
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base);page.wait_for_function("!document.querySelector('#single').disabled")
 check('Project-subpath assets load; no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
 check('Ten-file mode gated before first single',page.locator('#batch').is_disabled())
 page.select_option('#duration','3');page.click('#single');page.wait_for_function("document.querySelector('#total').textContent==='1'",timeout=25000);page.wait_for_function("!document.querySelector('#single').disabled")
 check('One real MP4 generated, decoded and persisted',page.locator('#error').inner_text()=='')
 check('Ten-file mode unlocked',not page.locator('#batch').is_disabled())
 page.click('#random');page.click('#batch');page.wait_for_function("document.querySelector('#total').textContent==='11'",timeout=80000);page.wait_for_function("!document.querySelector('#single').disabled")
 check('Ten additional real MP4s generated serially',page.locator('#error').inner_text()=='' and page.locator('#counter').inner_text()=='10 / 10 完成')
 check('No concurrent MediaRecorder instances',page.evaluate('window.maxRecorders')==1 and page.evaluate('window.liveRecorders')==0)
 metas=page.evaluate("async()=>{const s=await import('./storage.js');return s.list()}");check('Every video has a unique seed',len({x['seed'] for x in metas})==11)
 with tempfile.TemporaryDirectory() as tmp:
  for i in range(11):
   page.locator('.card').nth(i).get_by_role('button',name='▷ 再生・保存').click();page.wait_for_function("!document.querySelector('#player-panel').hidden")
   with page.expect_download() as event:page.click('#download-file')
   dest=Path(tmp)/f'{i}.mp4';event.value.save_as(dest)
   info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',str(dest)]));video=next(s for s in info['streams'] if s['codec_type']=='video');assert (video['width'],video['height'],video['codec_name'])==(360,640,'h264'),info;assert any(s['codec_type']=='audio' for s in info['streams']),info
   assert float(info['format']['duration'])>=2.5,info
   page.click('#close-player')
 check('All eleven downloads are decodable 360x640 H.264 MP4 with audio')
 page.reload();page.wait_for_function("document.querySelector('#total').textContent==='11'");check('IndexedDB survives reload; no server required')
 page.select_option('#duration','3');page.click('#single');page.wait_for_timeout(600);page.click('#stop');page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000)
 check('Stop discards current partial file',page.locator('#total').inner_text()=='11' and not page.locator('#retry').is_disabled())
 page.click('#retry');page.wait_for_function("document.querySelector('#total').textContent==='12'",timeout=25000);page.wait_for_function("!document.querySelector('#single').disabled")
 check('Retry completes only the unfinished item')
 for width in ['540','720','1080']:
  page.select_option('#resolution',width);check(f'{width}p resets ten-file verification gate',page.locator('#batch').is_disabled());page.click('#single');total=str(13+['540','720','1080'].index(width));page.wait_for_function(f"document.querySelector('#total').textContent==='{total}'",timeout=25000);page.wait_for_function("!document.querySelector('#single').disabled");check(f'{width}p single MP4 recorded and metadata decoded (Chromium only)',page.locator('#error').inner_text()=='')
 page.select_option('#resolution','360');page.click('#single');page.wait_for_timeout(400)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000);check('Visibility-change handler cancels recording', '非表示' in page.locator('#error').inner_text());page.evaluate("delete document.hidden")
 page.screenshot(path=str(ROOT/'tests'/'mobile-preview.png'),full_page=True)
 check('No uncaught JavaScript errors',not errors)
 # Browser format failure must be explicit, never substitute WebM.
 unsupported=browser.new_context();unsupported.add_init_script("MediaRecorder.isTypeSupported=()=>false");u=unsupported.new_page();u.goto(base);u.wait_for_timeout(500);check('Unsupported MP4 shows error and disables recording',u.locator('#single').is_disabled() and 'MP4録画に対応していません' in u.locator('#support').inner_text());unsupported.close()
 # Deterministic storage-cap rejection, with no large allocations.
 page.evaluate("async()=>{const s=await import('./storage.js');for(const m of await s.list())await s.remove(m.id);for(let i=0;i<30;i++){const b=new Blob(['x'],{type:'video/mp4'});await s.put({id:'quota'+i,created:i,size:b.size},b)} }")
 page.reload();page.wait_for_function("!document.querySelector('#single').disabled");page.select_option('#duration','3');page.click('#single');page.wait_for_function("!document.querySelector('#recovery').hidden",timeout=25000);page.wait_for_function("!document.querySelector('#settings').disabled")
 check('Storage cap preserves current MP4 for manual recovery',page.locator('#single').is_disabled() and bool(page.locator('#recover-download').get_attribute('href')))
 context.close();browser.close()
http.shutdown();results['status']='PASS';(ROOT/'tests'/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False),flush=True)
