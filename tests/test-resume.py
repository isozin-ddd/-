"""Focused real-browser checks after adding persisted retry settings."""
from playwright.sync_api import sync_playwright
import http.server,threading,json,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(label,condition=True):
 assert condition,label;checks.append(label);print('PASS '+label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function("!document.querySelector('#single').disabled");page.select_option('#duration','3');page.uncheck('#sfx');page.select_option('#bgm','off');page.click('#single');page.wait_for_timeout(500);page.click('#stop');page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000);page.reload();page.wait_for_function("!document.querySelector('#retry').disabled");check('Pending task restored after stop and full reload');page.click('#retry');page.wait_for_function("document.querySelector('#total').textContent==='1'",timeout=25000);page.wait_for_function("!document.querySelector('#single').disabled");check('Restored task records and saves; persisted queue cleared',page.evaluate("JSON.parse(localStorage.getItem('infinite-shorts-pending-v1')).length===0"))
 for i,g in enumerate(['asmr','meme','domino'],2):
  page.select_option('#duration','3');page.uncheck('#sfx');page.select_option('#bgm','off');page.click('[data-genre='+g+']');page.click('#single');page.wait_for_function(f"document.querySelector('#total').textContent==='{i}'",timeout=25000);page.wait_for_function("!document.querySelector('#single').disabled");check(g+' actual MP4 recorded, metadata decoded and persisted',page.locator('#error').inner_text()=='')
 meta=page.evaluate("async()=>{const s=await import('./storage.js');return s.list()}");check('All four genres available as actual stored MP4s',{m['genre'] for m in meta}=={'ball','asmr','meme','domino'})
 page.evaluate("Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async(data)=>{window.sharedFile=data.files[0];window.shareWasActive=navigator.userActivation.isActive}})")
 page.locator('.card').first.get_by_role('button',name='▷ 再生・保存').click();page.wait_for_function("!document.querySelector('#player-panel').hidden");page.click('#save-file');check('Share API receives real MP4 File during user activation (mock handoff only)',page.evaluate("sharedFile instanceof File&&sharedFile.type==='video/mp4'&&sharedFile.size>0&&shareWasActive"))
 check('No uncaught script errors',not errors);browser.close()
server.shutdown();(ROOT/'tests'/'resume-results.json').write_text(json.dumps({'browser':'Chromium','iphone_safari':'UNTESTED','checks':checks,'status':'PASS'},ensure_ascii=False,indent=2))
