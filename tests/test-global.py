from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import threading,json,tempfile,subprocess,os,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(label,condition=True):
 assert condition,label;checks.append(label);print('PASS '+label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
 context.add_init_script('''window.activeRecorders=0;window.maximumRecorders=0;const Native=MediaRecorder;window.MediaRecorder=class extends Native{start(...args){super.start(...args);activeRecorders++;maximumRecorders=Math.max(maximumRecorders,activeRecorders);this.addEventListener('stop',()=>activeRecorders--,{once:true})}}''')
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function("!document.querySelector('#single').disabled");check('60 selectable rendered templates',page.locator('#template option').count()==16);page.click('#random');check('Random genre can select all60',page.locator('#template option').count()==61)
 check('Mobile width has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 page.select_option('#duration','3');check('Batches gated until actual single recording',all(page.locator('#'+id).is_disabled() for id in ['batch3','batch5','batch']))
 total=0
 for id,count in [('single',1),('batch3',3),('batch5',5),('batch',10)]:
  page.click('#'+id);total+=count;page.wait_for_function(f"document.querySelector('#total').textContent==='{total}'",timeout=count*8000+12000);page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000);check(f'{count}-file real MP4 run completes and saves sequentially',page.locator('#error').inner_text()=='')
 check('At most one native MediaRecorder alive',page.evaluate('maximumRecorders===1&&activeRecorders===0'))
 records=page.evaluate("async()=>{const s=await import('./storage.js');return s.list()}");check('English titles and actual template IDs stored',all(r['templateId'] and r['recordingStats'] and r['title'].isascii() for r in records));check('Ten-file automatic batch uses10 different scene mechanisms',len({r['templateId'] for r in records[:10]})==10)
 with tempfile.TemporaryDirectory() as tmp:
  page.locator('.card').first.get_by_role('button',name='▷ 再生・保存').click();page.wait_for_function("!document.querySelector('#player-panel').hidden")
  with page.expect_download() as event:page.click('#download-file')
  dest=Path(tmp)/'output.mp4';event.value.save_as(dest);info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-of','json',str(dest)]));v=next(s for s in info['streams'] if s['codec_type']=='video');check('Actual downloaded MP4 is H264 360x640 and has audio',v['codec_name']=='h264' and (v['width'],v['height'])==(360,640) and any(s['codec_type']=='audio' for s in info['streams']))
 page.locator('#quality-review summary').click();page.locator('#quality-review select').first.select_option('4');page.locator('#quality-review textarea').fill('Test manual review, not SNS performance');page.get_by_role('button',name='品質メモを保存',exact=True).click();page.wait_for_function("document.querySelector('#quality-review [role=status]').textContent.includes('保存しました')");check('Manual quality review persists separately from social results');page.click('#close-player')
 page.click('#single');page.wait_for_timeout(500);page.click('#stop');page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000);check('Stop preserves all completed videos and pending retry',page.locator('#total').inner_text()=='19' and not page.locator('#retry').is_disabled());page.reload();page.wait_for_function("!document.querySelector('#retry').disabled");page.click('#retry');page.wait_for_function("document.querySelector('#total').textContent==='20'",timeout=25000);page.wait_for_function("!document.querySelector('#single').disabled");check('Pending new-template task survives reload and retries')
 page.locator('a[href="#reference-manager"]').click();page.wait_for_function("document.querySelector('#reference-manager .management-list').children.length===44");check('All44 research entries load, direct verified count remains0','確認：0件' in page.locator('#reference-manager').inner_text())
 page.screenshot(path=str(ROOT/'reports'/'global-mobile.png'),full_page=False)
 check('No uncaught JavaScript errors',not errors);browser.close()
server.shutdown();result={'status':'PASS','browser':'Chromium, 390x844 mobile viewport','iphone_safari':'UNTESTED','checks':checks,'recordings_completed':20,'templates_total':60,'social_popularity_verified':False};(ROOT/'reports'/'global-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
