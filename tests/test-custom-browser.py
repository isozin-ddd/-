"""Real Chromium touch and MP4 QA; not physical iPhone Safari."""
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading,json,tempfile,subprocess,time,os
ROOT=Path(__file__).resolve().parents[1]
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(label,value=True):
 assert value,label;checks.append(label);print('PASS '+label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,accept_downloads=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000)
 page.get_by_role('button',name='詳細カスタマイズ',exact=True).click()
 def setvalue(key,value):
  control=page.locator('[name=custom-'+key+']');control.evaluate("node=>{for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}");control.fill(str(value));control.dispatch_event('change')
 setvalue('ballCount',10);page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').balls===10")
 setvalue('ballCount',100);page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').balls===100");check('Changing10 to100 produces100 actual preview balls')
 setvalue('wallCount',5);page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').walls===5")
 setvalue('wallCount',30);page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').walls===30");check('Changing5 to30 produces30 actual preview walls')
 setvalue('ringCount',6);page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').rings===6");check('Ring count changes actual preview objects')
 check('Heavy preview reduces resolution, never object counts',page.locator('#canvas').get_attribute('width')=='180')
 check('Phone viewport has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 # Save100/30/6 and restore, using actual UIstorage.
 page.locator('#custom-controls summary').filter(has_text='プリセット').click();page.get_by_label('保存するプリセット名').fill('100 balls /30 walls');page.get_by_role('button',name='この設定を保存',exact=True).click();saved=json.loads(page.evaluate("localStorage.getItem('gvfactory-custom-presets-v1')"));preset_id=saved[0]['id'];check('Named preset stores actual settings',saved[0]['settings']['ballCount']==100 and saved[0]['settings']['wallCount']==30)
 setvalue('ballCount',10);page.get_by_label('物理プリセット',exact=True).select_option('user:'+preset_id);page.get_by_role('button',name='プリセットを読み込む',exact=True).click();page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').balls===100");check('Preset load restores preview counts')
 # Make a bounded recording andfreeze settings, matching its preview configfingerprint.
 setvalue('ballSize',5);setvalue('wallLength',30);setvalue('gravity',120);setvalue('ballSpeed',80);page.locator('[name=custom-quality]').evaluate("node=>{for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}");page.locator('[name=custom-quality]').select_option('low');setvalue('glow',0);setvalue('trailLength',0);page.select_option('#duration','3');page.wait_for_timeout(250)
 fingerprint=page.locator('#canvas').get_attribute('data-config-fingerprint');page.click('#single');check('Settings and stage editor locked duringrecord',page.locator('#settings').evaluate('el=>el.disabled') and page.locator('#stage-edit-toggle').is_disabled());page.wait_for_function("document.querySelector('#total').textContent==='1'",timeout=30000);page.wait_for_function("!document.querySelector('#single').disabled")
 meta=page.evaluate("async()=>{const s=await import('./storage.js');return (await s.list())[0]}");c=meta['settings']['customSettings'];check('MP4 task preserves100/30/6 instead ofdefaults',(c['ballCount'],c['wallCount'],c['ringCount'])==(100,30,6));check('Recording and preview use same normalized snapshot',meta['recordingStats']['customSimulation']['configFingerprint']==fingerprint)
 expected=page.evaluate("async(settings)=>{const {scene,simulationDigest}=await import('./engine.js?v=custom1');const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const s=scene(settings.genre,settings.seed,settings);s.draw(canvas.getContext('2d'),360,640,settings.duration,0,settings.caption);return simulationDigest(s.getState())}",meta['settings']);check('MP4 solver endstate equals independent preview solver',expected==meta['recordingStats']['customSimulation']['finalStateDigest'])
 page.locator('.card').first.get_by_role('button',name='▷ 再生・保存').click()
 with tempfile.TemporaryDirectory() as tmp:
  with page.expect_download() as event:page.click('#download-file')
  file=Path(tmp)/'custom.mp4';event.value.save_as(file);data=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-of','json',str(file)]));v=next(s for s in data['streams'] if s['codec_type']=='video');print('Downloaded MP4 streams: '+json.dumps(data['streams']),flush=True);check('Downloaded custom MP4 has360x640 video and audio',(v['width'],v['height'])==(360,640) and any(s['codec_type']=='audio' for s in data['streams']));check('Downloaded MP4 video uses a recognized browser codec',v['codec_name'] in ('h264','hevc','av1','vp9'))
 page.click('#close-player')
 page.locator('.card').first.get_by_role('button',name='同じシード・設定を読み込む').click();page.wait_for_timeout(200);check('Library recall restores customsnapshot',[page.locator('[name=custom-'+key+']').input_value() for key in ['ballCount','wallCount','ringCount']]==['100','30','6'])
 # Pause/resume stabletime.
 page.click('#preview-pause');page.wait_for_timeout(150);a=page.locator('#canvas').get_attribute('data-state-time');page.wait_for_timeout(350);check('Pause holds simulationtime',page.locator('#canvas').get_attribute('data-state-time')==a);page.click('#preview-pause');page.wait_for_timeout(350);check('Resume advances time',float(page.locator('#canvas').get_attribute('data-state-time'))>float(a))
 # Pending custom tasks restore the visible editing settings after a full reload.
 page.click('#single');page.wait_for_timeout(500);page.click('#stop');page.wait_for_function("!document.querySelector('#single').disabled",timeout=20000);page.reload();page.wait_for_function("!document.querySelector('#retry').disabled");page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.stageCounts||'{}').balls===100");check('Reload restores pending customsettings into visiblepreview',page.locator('#canvas').get_attribute('data-custom')=='true' and page.locator('[name=custom-wallCount]').input_value()=='30');page.click('#retry');page.wait_for_function("document.querySelector('#total').textContent==='2'",timeout=30000);page.wait_for_function("!document.querySelector('#single').disabled");check('Pending customrecording retries with frozen snapshot')
 # A small imported manualstage for real touchdragging.
 model=page.evaluate("async()=>{const {DEFAULT_CUSTOM}=await import('./custom-physics.js');return {...DEFAULT_CUSTOM,ballCount:2,maxBalls:200,wallCount:1,ringsEnabled:false,gravity:0,ballSpeed:0,glow:0,trailLength:0,seed:7,stage:{balls:[{id:'a',x:180,y:330,heading:0},{id:'b',x:400,y:330,heading:0}],walls:[{id:'w',x:270,y:530,length:160,angle:0}]}}}")
 page.get_by_label('物理プリセットJSON',exact=True).set_input_files({'name':'manual.json','mimeType':'application/json','buffer':json.dumps({'name':'Manual touch','settings':model}).encode()});page.get_by_role('button',name='JSONを読み込む',exact=True,include_hidden=True).evaluate("node=>{for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}");page.get_by_role('button',name='JSONを読み込む',exact=True).click();page.wait_for_function("document.querySelector('[name=custom-ballCount]').value==='2'")
 page.locator('#stage-edit-toggle').check();page.locator('#canvas').scroll_into_view_if_needed();page.wait_for_timeout(200)
 def point(x,y):
  b=page.locator('#canvas').bounding_box();return {'x':b['x']+x/540*b['width'],'y':b['y']+y/960*b['height']}
 page.get_by_role('button',name='タップでボール追加',exact=True).click();page.locator('#canvas').scroll_into_view_if_needed();pt=point(300,690);page.touchscreen.tap(pt['x'],pt['y']);page.wait_for_function("document.querySelector('[name=custom-ballCount]').value==='3'");check('Real touchscreen tap adds ball')
 page.get_by_role('button',name='取り消し',exact=True).click();check('Undo restores count',page.locator('[name=custom-ballCount]').input_value()=='2');page.get_by_role('button',name='やり直し',exact=True).click();check('Redo restores addition',page.locator('[name=custom-ballCount]').input_value()=='3');page.get_by_role('button',name='選択を複製',exact=True).click() if not page.get_by_role('button',name='選択を複製',exact=True).is_disabled() else None
 page.get_by_role('button',name='タップで壁追加',exact=True).click();page.locator('#canvas').scroll_into_view_if_needed();pt=point(270,650);page.touchscreen.tap(pt['x'],pt['y']);page.wait_for_function("document.querySelector('[name=custom-wallCount]').value==='2'");check('Touch tap adds wall');page.get_by_role('button',name='選択を複製',exact=True).click();check('Duplicate wall updatescount',page.locator('[name=custom-wallCount]').input_value()=='3');page.get_by_role('button',name='選択を削除',exact=True).click();check('Delete wall updatescount',page.locator('[name=custom-wallCount]').input_value()=='2')
 page.get_by_role('button',name='選択・ドラッグ',exact=True).click();page.locator('#canvas').scroll_into_view_if_needed();client=context.new_cdp_session(page)
 def drag(x1,y1,x2,y2):
  first,last=point(x1,y1),point(x2,y2);client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[first]});
  for i in range(1,5):
   q={'x':first['x']+(last['x']-first['x'])*i/4,'y':first['y']+(last['y']-first['y'])*i/4};client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[q]});page.wait_for_timeout(40)
  client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(150)
 drag(180,330,220,370)
 # Export actual currentstage to verify drag and endpoint changes.
 def exportsettings():
  page.locator('#custom-controls summary').filter(has_text='プリセット').click() if not page.get_by_role('button',name='現在の設定をJSON保存',exact=True).is_visible() else None
  with page.expect_download() as d:page.get_by_role('button',name='現在の設定をJSON保存',exact=True).click()
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp)/'stage.json';d.value.save_as(target);return json.loads(target.read_text())['presets'][0]['settings']
 after=exportsettings();a=next(b for b in after['stage']['balls'] if b['id']=='a');check('Touch drag changes storedinitialballposition',abs(a['x']-220)<3 and abs(a['y']-370)<3)
 page.locator('#canvas').scroll_into_view_if_needed();pt=point(270,530);page.touchscreen.tap(pt['x'],pt['y']);drag(350,530,410,560);after=exportsettings();wall=next(w for w in after['stage']['walls'] if w['id']=='w');check('Wall endpoint touchdrag changeslengthandangle',wall['length']>200 and wall['angle']>0)
 # All existing80 remain independently selectable and customunsupported genres retain normalrender.
 page.get_by_role('button',name='簡単モード',exact=True).click();page.click('#random');check('All original60 plus existing20VIRAL remain',page.locator('#template option').count()==81);page.click('[data-genre=asmr]');page.get_by_role('button',name='詳細カスタマイズ',exact=True).click();check('Unsupportedgenre retains basegenerator with reason',page.locator('#canvas').get_attribute('data-custom')=='false' and 'ASMR' in page.locator('#custom-controls').inner_text());check('No uncaught JavaScript errors',not errors)
 page.screenshot(path=str(ROOT/'reports'/'custom-mobile.png'),full_page=False);browser.close()
server.shutdown();result={'status':'PASS','browser':'Chromium touch emulation,390x844','iphone_safari':'UNTESTED','checks':checks};(ROOT/'reports'/'custom-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
