from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import threading,json,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'docs'),**kw)
 def do_GET(self):
  if self.path=='/management-smoke':
   body=b'<!doctype html><html><head><link rel="stylesheet" href="./management.css"></head><body><section id="research"></section><section id="analytics"></section></body></html>';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  else:super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/management-smoke');page.evaluate("async()=>{const {mountResearch}=await import('./research-ui.js');const {mountAnalytics}=await import('./insights.js');const templates=[{id:'phy-test',name:'Test'}];await mountResearch(document.querySelector('#research'),{templates,seedReferences:[{reference_id:'seed',original_url:'https://example.com/seed',genre:'asmr',likes:null,numeric_evidence_source:'secondary_report',verification_status:'candidate_unverified'}]});await mountAnalytics(document.querySelector('#analytics'),{templates})}")
 root=page.locator('#research');root.locator('[name=original_url]').fill('https://example.com/reference');root.locator('[name=platform]').fill('YouTube');root.locator('[name=likes]').fill('100000');root.locator('[name=verification_status]').select_option('direct_verified');root.locator('[name=numeric_evidence_source]').select_option('original');root.get_by_role('button',name='参考資料を保存',exact=True).click();assert '確認：1件' in root.inner_text();assert len(json.loads(page.evaluate("localStorage.getItem('gvfactory-references-v1')")))==2
 with page.expect_download() as dl:root.get_by_role('button',name='JSONを書き出す',exact=True).click()
 assert dl.value.suggested_filename=='shorts-references.json'
 with tempfile.TemporaryDirectory() as tmp:
  export=Path(tmp)/'references.json';dl.value.save_as(export);assert len(json.loads(export.read_text())['references'])==2
 imported={'reference_id':'imported','original_url':'https://example.com/imported','genre':'physics','likes':200000,'verification_status':'snippet_only','numeric_evidence_source':'search_snippet'}
 root.locator('input[type=file]').set_input_files({'name':'valid.json','mimeType':'application/json','buffer':json.dumps({'references':[imported]}).encode()});root.get_by_role('button',name='JSONを読み込んで統合').click();page.wait_for_function("JSON.parse(localStorage.getItem('gvfactory-references-v1')).length===3");assert '確認：1件' in root.inner_text()
 card=root.locator('.management-card').filter(has_text='https://example.com/reference');card.get_by_role('button',name='編集・観察内容を見る').click();root.locator('[name=likes]').fill('150000');root.get_by_role('button',name='変更を保存',exact=True).click();assert json.loads(page.evaluate("localStorage.getItem('gvfactory-references-v1')"))[-1]['likes']==150000
 page.once('dialog',lambda dialog:dialog.accept());root.locator('.management-card').filter(has_text='https://example.com/imported').get_by_role('button',name='この資料を削除').click();assert len(json.loads(page.evaluate("localStorage.getItem('gvfactory-references-v1')")))==2
 root.locator('input[type=file]').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps([{'reference_id':'bad','original_url':'javascript:1','genre':'ball'}]).encode()});root.get_by_role('button',name='JSONを読み込んで統合').click();page.wait_for_function("document.querySelector('#research [role=status]').textContent.includes('http://')")
 a=page.locator('#analytics');a.locator('[name=template_id]').select_option('phy-test');a.locator('[name=views]').fill('200');a.locator('[name=likes]').fill('20');a.locator('[name=completion_rate]').fill('75');a.get_by_role('button',name='実測値を保存',exact=True).click();assert '合算いいね率 10%' in a.inner_text();assert len(json.loads(page.evaluate("localStorage.getItem('gvfactory-performance-v1')")))==1
 page.reload();page.evaluate("async()=>{const {mountResearch}=await import('./research-ui.js');await mountResearch(document.querySelector('#research'),{templates:[],seedReferences:[]})}");assert '確認：1件' in page.locator('#research').inner_text();assert not errors,errors
 result={'status':'PASS','browser':'Chromium desktop, 390x844 viewport','iphone_safari':'UNTESTED','checks':['Seed reference with secondary_report provenance loads','Reference create, edit and delete','Original-only qualified count excludes snippet values','Reference JSON import and actual download/export','Unsafe imported URL rejected','Posted metrics saved and aggregated with measured denominators','Persistence after reload','No uncaught JavaScript errors']};(ROOT/'tests'/'management-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));b.close()
server.shutdown()
