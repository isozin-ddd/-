from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import json,threading,os,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT/'docs'),**k)
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True,accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function("!document.querySelector('#single').disabled")
 page.click('[data-quality-work=escape]');page.wait_for_function("document.querySelector('#canvas').dataset.engineVersion==='quality-1'");assert page.locator('#quality-controls').is_visible();assert page.locator('#single').is_enabled();assert page.locator('#bgm').input_value()=='off' and page.locator('#bgm').is_disabled();assert page.locator('#batch20').is_disabled();assert page.locator('#template option').count()==21
 for key,value in [('rings',5),('balls',4),('gap',.8),('rotation',.4)]:
  page.locator('[name=quality-'+key+']').fill(str(value));page.locator('[name=quality-'+key+']').dispatch_event('change')
 page.wait_for_function("JSON.parse(document.querySelector('#canvas').dataset.qualityCounts).rings===5&&JSON.parse(document.querySelector('#canvas').dataset.qualityCounts).balls===4")
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('[name=quality-balls]').fill('999');page.locator('[name=quality-balls]').dispatch_event('change');assert page.locator('#single').is_disabled();page.locator('[name=quality-balls]').fill('4');page.locator('[name=quality-balls]').dispatch_event('change');assert page.locator('#single').is_enabled()
 # Short actual UI recording verifies settings snapshots and download, not sample aesthetics.
 page.select_option('#resolution','360');page.select_option('#duration','3');page.click('#single');page.wait_for_function("document.querySelector('#total').textContent==='1'",timeout=20000);meta=page.evaluate("async()=>(await(await import('./storage.js')).list())[0]");assert meta['settings']['qualitySettings']['rings']==5 and meta['settings']['qualitySettings']['balls']==4;assert meta['engineVersion']=='quality-1';assert meta['recordingStats']['quality']['physics']['budgetStops']==0
 page.locator('.card').first.get_by_role('button',name='▷ 再生・保存').click()
 with tempfile.TemporaryDirectory() as temp:
  with page.expect_download() as e:page.click('#download-file')
  target=Path(temp)/'quality.mp4';e.value.save_as(target);probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-of','json',str(target)]));assert {s['codec_type'] for s in probe['streams']}=={'video','audio'}
 page.click('#close-player');page.locator('.card').first.get_by_role('button',name='同じシード・設定を読み込む').click();assert page.locator('[name=quality-rings]').input_value()=='5';assert page.locator('[name=quality-balls]').input_value()=='4'
 for mode,count in [('multiply','1'),('last','12')]:
  page.click('[data-quality-work='+mode+']');assert page.locator('[name=quality-balls]').input_value()==count
 assert not errors,errors;page.screenshot(path=str(ROOT/'reports/quality/mobile.png'),full_page=True);(ROOT/'reports/quality/ui.json').write_text(json.dumps({'status':'PASS','checks':['existing20 viral selector entries preserved','quality work buttons','real preview4balls5rings','invalid input disables recording','actual MP4 with audio','frozen settings and library recall','bulk paused','390px no overflow','no JavaScript errors'],'iphone_hardware':'UNTESTED'},indent=2));print('PASS quality UI and actual MP4');b.close()
s.shutdown()
