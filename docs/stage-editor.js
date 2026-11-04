import {buildStage,normalizeCustom} from './custom-physics.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const bound=(v,min,max)=>Math.max(min,Math.min(max,v));
const uid=kind=>kind+'-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
function wallEnds(w){const a=w.angle*Math.PI/180,dx=Math.cos(a)*w.length/2,dy=Math.sin(a)*w.length/2;return [{x:w.x-dx,y:w.y-dy},{x:w.x+dx,y:w.y+dy}]}
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,u=bound(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy)}
export function mountStageEditor(canvas,container,{readConfig,onChange,onEditingChange=()=>{},isLocked=()=>false,onInvalidate=()=>{}}){
 let enabled=false,editing=false,selection=null,drag=null,tool='select',undo=[],redo=[];
 const root=document.createElement('div');root.className='stage-editor';
 const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.id='stage-edit-toggle';label.append(toggle,document.createTextNode(' 初期配置をステージで直接編集'));root.append(label);
 const tools=document.createElement('div');tools.className='stage-tools';const buttons=[];
 function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=handler;tools.append(b);buttons.push(b);return b}
 const selectButton=button('選択・ドラッグ',()=>{tool='select';render()}),ballButton=button('タップでボール追加',()=>{tool='ball';render()}),wallButton=button('タップで壁追加',()=>{tool='wall';render()});
 const duplicate=button('選択を複製',()=>modify('duplicate')),remove=button('選択を削除',()=>modify('delete'));
 const undoButton=button('取り消し',()=>history(false)),redoButton=button('やり直し',()=>history(true));
 const reset=button('初期配置へ戻す',()=>{const before=snapshot();if(!before)return;push(before);const next=clone(before);delete next.stage;selection=null;publish(next);message('設定値から初期配置を作り直しました。取り消しで戻せます。')});
 const notice=document.createElement('p');notice.className='micro';notice.setAttribute('role','status');notice.id='stage-editor-status';
 const hint=document.createElement('p');hint.className='micro';hint.textContent='編集時はプレビューを停止し、初期配置を表示します。壁の丸い端点をドラッグすると長さと角度を変更できます。動的な増殖・合体の結果ではなく、録画開始時の配置を編集します。';
 root.append(tools,notice,hint);container.append(root);
 function snapshot(){const value=readConfig();if(!value)return null;const c=clone(value);if(!c.stage)c.stage=buildStage(c);return c}
 function message(text){notice.textContent=text}
 function push(before){undo.push(clone(before));if(undo.length>20)undo.shift();redo=[];render()}
 function publish(next){try{const valid=normalizeCustom(next);onChange(valid);render();return true}catch(e){message(e.message);return false}}
 function render(){const blocked=!enabled||isLocked();toggle.disabled=blocked;toggle.checked=editing;for(const b of buttons)b.disabled=blocked||!editing;duplicate.disabled=remove.disabled=blocked||!editing||!selection;undoButton.disabled=blocked||!editing||!undo.length;redoButton.disabled=blocked||!editing||!redo.length;selectButton.setAttribute('aria-pressed',String(tool==='select'));ballButton.setAttribute('aria-pressed',String(tool==='ball'));wallButton.setAttribute('aria-pressed',String(tool==='wall'));canvas.style.touchAction=editing&&!blocked?'none':'auto';onInvalidate();if(!enabled)message('詳細カスタマイズの物理ステージで利用できます。')}
 toggle.onchange=()=>{if(!enabled||isLocked())return;editing=toggle.checked;selection=null;drag=null;onEditingChange(editing);if(editing)message('初期配置の編集モードです。追加ツールを選んでステージをタップしてください。');render()};
 function coords(e){const rect=canvas.getBoundingClientRect();return {x:bound((e.clientX-rect.left)/rect.width*540,20,520),y:bound((e.clientY-rect.top)/rect.height*960,120,780)}}
 function hit(config,p){
  if(selection?.kind==='wall'){const w=config.stage.walls.find(w=>w.id===selection.id);if(w){const ends=wallEnds(w);for(let i=0;i<2;i++)if(Math.hypot(p.x-ends[i].x,p.y-ends[i].y)<34)return {...selection,handle:i}}}
  for(const b of [...config.stage.balls].reverse())if(Math.hypot(b.x-p.x,b.y-p.y)<Math.max(config.ballSize+12,32))return {kind:'ball',id:b.id};
  for(const w of [...config.stage.walls].reverse()){const [a,b]=wallEnds(w);if(segmentDistance(p,a,b)<Math.max(config.wallThickness/2+14,26))return {kind:'wall',id:w.id}}
  return null;
 }
 function position(config,object,p,kind){
  if(kind==='ball'){const r=config.ballSize;object.x=bound(p.x,25+r,515-r);object.y=bound(p.y,135+r,755-r)}else{const a=object.angle*Math.PI/180,dx=Math.abs(Math.cos(a))*object.length/2,dy=Math.abs(Math.sin(a))*object.length/2;object.x=bound(p.x,20+dx,520-dx);object.y=bound(p.y,120+dy,780-dy)}
 }
 canvas.addEventListener('pointerdown',e=>{
  if(!enabled||!editing||isLocked())return;e.preventDefault();const before=snapshot();if(!before)return;const p=coords(e);
  if(tool==='ball'){
   if(before.ballCount>=Math.min(200,before.maxBalls)){message('初期ボールは200個かつ最大ボール数以内です。');return}push(before);const next=clone(before),b={id:uid('ball'),x:p.x,y:p.y,heading:(next.seed+next.ballCount*73)%360};position(next,b,p,'ball');next.stage.balls.push(b);next.ballCount=next.stage.balls.length;selection={kind:'ball',id:b.id};publish(next);message(`初期ボール ${next.ballCount}個`);return;
  }
  if(tool==='wall'){
   if(before.wallCount>=100){message('壁は最大100本です。');return}push(before);const next=clone(before),w={id:uid('wall'),x:p.x,y:p.y,length:next.wallLength,angle:next.wallAngle};position(next,w,p,'wall');next.stage.walls.push(w);next.wallCount=next.stage.walls.length;next.wallArrangement='manual';selection={kind:'wall',id:w.id};publish(next);message(`壁 ${next.wallCount}本`);return;
  }
  selection=hit(before,p);if(selection){const list=selection.kind==='ball'?before.stage.balls:before.stage.walls,obj=list.find(v=>v.id===selection.id);drag={before,p,selection:{...selection},origin:clone(obj),moved:false};canvas.setPointerCapture(e.pointerId);message(selection.kind==='wall'?'壁の移動。選択した壁の端点で長さを変更できます。':'ボールをドラッグして初期位置を変更します。')}else drag=null;render();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag||!editing||isLocked())return;e.preventDefault();const p=coords(e),next=clone(drag.before),selected=drag.selection,list=selected.kind==='ball'?next.stage.balls:next.stage.walls,obj=list.find(v=>v.id===selected.id);if(!obj)return;
  if(selected.kind==='wall'&&selected.handle!==undefined){const ends=wallEnds(drag.origin),fixed=ends[1-selected.handle],length=bound(Math.hypot(p.x-fixed.x,p.y-fixed.y),10,480);obj.length=length;obj.x=(p.x+fixed.x)/2;obj.y=(p.y+fixed.y)/2;obj.angle=Math.atan2(p.y-fixed.y,p.x-fixed.x)*180/Math.PI;position(next,obj,obj,'wall');next.wallArrangement='manual'}else position(next,obj,{x:drag.origin.x+p.x-drag.p.x,y:drag.origin.y+p.y-drag.p.y},selected.kind);
  drag.moved=true;publish(next);
 });
 function finish(e){if(!drag)return;if(drag.moved)push(drag.before);drag=null;try{canvas.releasePointerCapture(e.pointerId)}catch{}render()}
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
 function modify(action){
  const before=snapshot();if(!before||!selection||!editing||isLocked())return;const next=clone(before),list=selection.kind==='ball'?next.stage.balls:next.stage.walls,index=list.findIndex(v=>v.id===selection.id);if(index<0){selection=null;render();return}
  if(action==='delete'){if(selection.kind==='ball'&&next.ballCount<=1){message('初期ボールは最低1個必要です。');return}push(before);list.splice(index,1);selection=null}else{if(selection.kind==='ball'&&next.ballCount>=Math.min(200,next.maxBalls)||selection.kind==='wall'&&next.wallCount>=100){message('オブジェクト数の上限です。');return}push(before);const obj=clone(list[index]);obj.id=uid(selection.kind);position(next,obj,{x:obj.x+24,y:obj.y+24},selection.kind);list.push(obj);selection={kind:selection.kind,id:obj.id}}
  next.ballCount=next.stage.balls.length;next.wallCount=next.stage.walls.length;next.wallArrangement='manual';publish(next);message(action==='delete'?'選択オブジェクトを削除しました。':'選択オブジェクトを複製しました。');
 }
 function history(forward){if(!editing||isLocked())return;const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;to.push(snapshot());const config=from.pop();selection=null;publish(config);message(forward?'やり直しました。':'取り消しました。');render()}
 function drawOverlay(c,w,h){
  if(!editing||!enabled||isLocked()||!selection)return;const cfg=snapshot();if(!cfg)return;c.save();c.scale(w/540,h/960);c.strokeStyle='#ffffff';c.fillStyle='#b0ff76';c.lineWidth=3;c.setLineDash([8,5]);
  if(selection.kind==='ball'){const b=cfg.stage.balls.find(v=>v.id===selection.id);if(b){c.beginPath();c.arc(b.x,b.y,cfg.ballSize+8,0,Math.PI*2);c.stroke()}}else{const wall=cfg.stage.walls.find(v=>v.id===selection.id);if(wall){const [a,b]=wallEnds(wall);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.setLineDash([]);for(const p of [a,b]){c.beginPath();c.arc(p.x,p.y,15,0,Math.PI*2);c.fill();c.stroke()}}}c.restore();
 }
 render();return {setEnabled(value){enabled=value;if(!enabled&&editing){editing=false;onEditingChange(false)}render()},setLocked(){render()},drawOverlay,isEditing:()=>editing,clearHistory(){undo=[];redo=[];selection=null;drag=null;render()},setEditing(value){if(!enabled||isLocked())return;toggle.checked=!!value;toggle.dispatchEvent(new Event('change'))},getSelection:()=>selection?{...selection}:null};
}
