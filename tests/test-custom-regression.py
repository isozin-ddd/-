"""Real Canvas regression over catalog defaults and archived engine replay.

This deliberately omits app.js/UI and customSettings to test the old factory path
while custom controls evolve. It is not an all-template MP4 or iPhone test.
"""
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime, timezone
import threading, json, os, traceback
ROOT=Path(__file__).resolve().parents[1]
class H(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'docs'),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/__canvas_regression__':
   body=b'<!doctype html><meta charset="utf-8"><title>Isolated Canvas regression</title>'
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  super().do_GET()
result={'verified_at':datetime.now(timezone.utc).isoformat(),'environment':'Headless desktop Chromium, isolated local static Canvas harness, viewport 390x844','iphone_safari':'UNTESTED','recording_scope':'No MP4 recording in this regression. Rendering/state checks do not establish MP4 recording, audio playback, sharing, Files save, or iPhone support.','custom_settings_scope':'customSettings omitted in all catalog/default comparisons. Custom physics itself is tested separately.','seed':20261104,'resolution':[360,640],'duration_seconds':3,'moments':[0,.5,1.5,2.99]}
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.getenv('BROWSER_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/__canvas_regression__');data=page.evaluate('''async()=>{
   const catalog=await import('./catalog.js');
   const modules={viral:await import('./scenes/viral.js'),ball:await import('./scenes/physics.js'),asmr:await import('./scenes/asmr.js'),meme:await import('./scenes/surreal.js'),domino:await import('./scenes/chain.js')};
   const archived={'viral-1':await import('./scenes/viral-v1.js'),'viral-2':await import('./scenes/viral-v2.js')};
   const times=[0,.5,1.5,2.99],seed=20261104,records=[],archives=[];
   const hash=ctx=>{const pixels=ctx.getImageData(0,0,360,640).data;let value=2166136261;for(let i=0;i<pixels.length;i+=13)value=Math.imul(value^pixels[i],16777619);return value>>>0};
   function canvas(){const c=document.createElement('canvas');c.width=360;c.height=640;const ctx=c.getContext('2d',{alpha:false});let balance=0;const save=ctx.save.bind(ctx),restore=ctx.restore.bind(ctx);ctx.save=()=>{balance++;save()};ctx.restore=()=>{balance--;restore()};const methods=['arc','arcTo','ellipse','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','fillRect','strokeRect','translate','scale','rotate','setTransform'];for(const key of methods){const original=ctx[key].bind(ctx);ctx[key]=(...args)=>{for(const value of args)if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite '+key);return original(...args)}}return{c,ctx,balance:()=>balance}}
   function finite(value,path='state',seen=new Set()){
    if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Nonfinite '+path);return}
    if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const [key,entry]of Object.entries(value))finite(entry,path+'.'+key,seen)}
   }
   function render(scene,target){let last=0,hashes=[],events=0;for(const t of times){scene.draw(target.ctx,360,640,t,t-last,true);if(target.balance()!==0)throw Error('Unbalanced Canvas save/restore');finite(target.ctx.getTransform().toFloat64Array());finite({globalAlpha:target.ctx.globalAlpha});if(scene.world)finite(scene.world);const emitted=scene.eventsBetween?.(last,t)||[];finite(emitted);events+=emitted.length;hashes.push(hash(target.ctx));last=t}return{hashes,events,finite_state:true,finite_canvas_parameters:true,balanced_context:true}}
   for(const template of catalog.CATALOG){const options={templateId:template.id,duration:3};try{const viaCatalog=catalog.studioScene(template.genre,seed,options),direct=modules[template.genre].create(template.id,seed,options),a=render(viaCatalog,canvas()),b=render(direct,canvas());records.push({id:template.id,genre:template.genre,...a,unique_frame_hashes:new Set(a.hashes).size,default_factory_matches:JSON.stringify(a.hashes)===JSON.stringify(b.hashes),passed:new Set(a.hashes).size>1&&JSON.stringify(a.hashes)===JSON.stringify(b.hashes)})}catch(error){records.push({id:template.id,genre:template.genre,passed:false,error:error.message})}}
   for(const [version,module]of Object.entries(archived))for(const template of module.templates){try{const options={templateId:template.id,duration:3,engineVersion:version};const viaCatalog=catalog.studioScene('viral',seed,options),direct=module.create(template.id,seed,options);const a=render(viaCatalog,canvas()),b=render(direct,canvas());archives.push({engineVersion:version,id:template.id,...a,unique_frame_hashes:new Set(a.hashes).size,archived_factory_matches:JSON.stringify(a.hashes)===JSON.stringify(b.hashes),passed:new Set(a.hashes).size>1&&JSON.stringify(a.hashes)===JSON.stringify(b.hashes)})}catch(error){archives.push({engineVersion:version,id:template.id,passed:false,error:error.message})}}
   const counts={};for(const t of catalog.CATALOG)counts[t.genre]=(counts[t.genre]||0)+1;
   return{catalog_count:catalog.CATALOG.length,unique_catalog_ids:new Set(catalog.CATALOG.map(t=>t.id)).size,genre_counts:counts,filtered_genre_counts:Object.fromEntries(['viral','ball','asmr','meme','domino','random'].map(g=>[g,catalog.templatesFor(g).length])),records,archives};
  }''');result.update(data);result['uncaught_errors']=errors
  expected={'viral':20,'ball':15,'asmr':15,'meme':15,'domino':15}
  assert result['catalog_count']==80 and result['unique_catalog_ids']==80, 'Catalog count/identity changed'
  assert result['genre_counts']==expected, result['genre_counts']
  assert result['filtered_genre_counts']==dict(expected,random=80),result['filtered_genre_counts']
  assert all(r['passed'] for r in result['records']),[r for r in result['records'] if not r['passed']]
  assert len(result['archives'])==23 and all(r['passed'] for r in result['archives']),[r for r in result['archives'] if not r['passed']]
  assert not errors,errors
  result['status']='PASS';print('PASS 80 unique default catalog entries: viral 20; ball/asmr/meme/domino 15 each.');print('PASS All 80 default factory paths draw finite frames and states, change sampled pixels, and exactly match direct factory hashes.');print('PASS 23 archived replay paths: viral-1 (3 IDs) and viral-2 (20 IDs) match direct archived factories.');print('PASS Canvas save/restore balance and numeric drawing parameters.');print('NOTE No all-template MP4 recording, listening, UI controls, Files save, or iPhone Safari test.');browser.close()
except Exception as error:
 result['status']='FAIL';result['failure']=str(error);traceback.print_exc();raise
finally:
 server.shutdown();(ROOT/'reports'/'custom-regression-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
