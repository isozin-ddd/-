from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading,json,tempfile
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def do_GET(self):
  if self.path=='/custom-smoke':
   body=b'<!doctype html><html><head><link rel="stylesheet" href="./style.css"><link rel="stylesheet" href="./custom.css"></head><body><main><div id="custom"></div></main></body></html>';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  else:super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,condition=True):
 assert condition,name;checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/custom-smoke');page.evaluate("async()=>{const {mountCustomControls}=await import('./custom-controls.js');window.events=[];window.ui=mountCustomControls(document.querySelector('#custom'),{onChange:v=>events.push(v)})}")
 check('Defaults remain in easy mode',page.evaluate("ui.getValue().mode==='easy'&&!ui.getValue().enabled&&ui.getValue().valid"))
 page.evaluate("ui.setMode('advanced',{notify:false})");check('Mode recall API supports suppressed notification',page.evaluate("ui.getValue().enabled&&events.length===0"));page.evaluate("ui.setMode('easy')");page.get_by_role('button',name='詳細カスタマイズ',exact=True).click();check('Advanced physics enabled',page.evaluate("ui.getValue().enabled&&ui.getValue().valid"));check('Priority quick controls include restitution and radius',page.locator('.custom-quick-grid .custom-field').count()==7 and page.locator('.custom-quick-grid [name=custom-restitution]').count()==1)
 page.locator('details').evaluate_all('(nodes)=>nodes.forEach(n=>n.open=true)')
 page.locator('[name=custom-ballCount]').fill('0');check('Invalid count disables through API without contaminating settings',page.evaluate("!ui.getValue().valid&&ui.getValue().settings.ballCount===8"));page.locator('[name=custom-ballCount]').fill('4');check('Count repaired',page.evaluate('ui.getValue().valid&&ui.getValue().settings.ballCount===4'))
 page.evaluate("async()=>{const {buildStage}=await import('./custom-physics.js');const c=ui.getValue().settings,s=buildStage(c);ui.replaceSettings({...c,stage:{balls:s.balls,walls:s.walls,ringCenter:s.ringCenter}})}")
 page.locator('[name=custom-gravity]').fill('100');check('Gravity edits preserve manual stage',page.evaluate('ui.getValue().settings.stage.balls.length===4'));page.locator('[name=custom-ballCount]').fill('5');check('Count edits regenerate manual stage',page.evaluate('!ui.getValue().settings.stage&&ui.getValue().settings.ballCount===5'))
 page.locator('[name=custom-ballSize]').fill('1');check('Radius lower bound1 accepted',page.evaluate('ui.getValue().valid&&ui.getValue().settings.ballSize===1'));page.locator('[name=custom-ballSize]').fill('50');check('Radius upper bound50 accepted',page.evaluate('ui.getValue().valid&&ui.getValue().settings.ballSize===50'))
 page.get_by_role('combobox',name='物理プリセット',exact=True).select_option('builtin:multi-rings');page.get_by_role('button',name='プリセットを読み込む',exact=True).click();check('Built-in applies actual geometry settings',page.evaluate('ui.getValue().settings.ringCount===12&&ui.getValue().settings.wallCount===0'))
 page.get_by_role('textbox',name='保存するプリセット名',exact=True).fill('My stage');page.get_by_role('button',name='この設定を保存',exact=True).click();check('Preset persists',page.evaluate("JSON.parse(localStorage.getItem('gvfactory-custom-presets-v1')).length===1"));page.get_by_role('button',name='複製して保存',exact=True).click();check('Preset duplicates independent IDs',page.evaluate("JSON.parse(localStorage.getItem('gvfactory-custom-presets-v1')).length===2"))
 with page.expect_download() as event:page.get_by_role('button',name='現在の設定をJSON保存',exact=True).click()
 with tempfile.TemporaryDirectory() as tmp:
  file=Path(tmp)/'config.json';event.value.save_as(file);record=json.loads(file.read_text());export_bytes=file.read_bytes();check('Real JSON export contains settings',record['presets'][0]['settings']['ringCount']==12)
 page.locator('input[type=file]').set_input_files({'name':'valid.json','mimeType':'application/json','buffer':export_bytes});page.get_by_role('button',name='JSONを読み込む',exact=True).click();page.wait_for_function("document.querySelector('.custom-message').textContent.includes('件の設定を検証')");check('Valid exported JSON imports and selects saved settings',page.evaluate("ui.getValue().settings.ringCount===12&&JSON.parse(localStorage.getItem('gvfactory-custom-presets-v1')).length===3"))
 page.locator('input[type=file]').set_input_files({'name':'unsafe.json','mimeType':'application/json','buffer':json.dumps({'name':'bad','settings':{'apiKey':'secret'}}).encode()});page.get_by_role('button',name='JSONを読み込む',exact=True).click();page.wait_for_function("document.querySelector('.custom-message').textContent.includes('秘密情報')");check('Secret-containing JSON rejected')
 page.evaluate("ui.setTemplate({id:'asmr-jelly-compression',genre:'asmr'})");check('Advanced unsupported genres keep base generation and disable custom controls',page.evaluate("!ui.getValue().enabled&&ui.getValue().valid&&document.querySelector('.custom-fields').disabled"))
 page.evaluate("ui.setTemplate({id:'viral-test',genre:'viral'})");check('VIRAL supports custom free stage',page.evaluate('ui.getValue().enabled&&ui.getValue().valid'))
 page.evaluate('ui.setLocked(true)');check('Recording lock disables mode and settings',page.get_by_role('button',name='簡単モード',exact=True).is_disabled() and page.locator('[name=custom-ballCount]').is_disabled());page.evaluate('ui.setLocked(false)')
 check('Mobile viewport has no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));check('No uncaught JavaScript errors',not errors);b.close()
server.shutdown();result={'status':'PASS','browser':'Chromium 390x844','iphone_safari':'UNTESTED','checks':checks};(ROOT/'tests'/'custom-controls-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
