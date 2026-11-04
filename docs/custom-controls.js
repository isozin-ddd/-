import {DEFAULT_CUSTOM,normalizeCustom,templateCustomDefaults,buildStage} from './custom-physics.js';

export const CUSTOM_PRESET_KEY='gvfactory-custom-presets-v1';
export const CUSTOM_PRESET_LIMIT=30;
export const CUSTOM_STORAGE_LIMIT=1024*1024;
export const CUSTOM_IMPORT_LIMIT=256*1024;
const clone=value=>JSON.parse(JSON.stringify(value));
const merged=(seed,values)=>({...clone(DEFAULT_CUSTOM),seed,...values,stage:null});
export const BUILTIN_CUSTOM_PRESETS=[
 {id:'simple',name:'シンプル',settings:merged(1101,{ballCount:1,ballSize:18,ballSpeed:120,wallCount:2,wallLength:170,ringsEnabled:false,gravity:280,glow:3,trailLength:4,multiplyOnHit:false,mergeBalls:false,maxBalls:50})},
 {id:'many-balls',name:'ボール大量',settings:merged(1102,{ballCount:128,ballSize:5,ballSpeed:120,wallCount:2,ringsEnabled:false,glow:0,trailLength:0,accuracy:'medium',quality:'low',gravity:180,maxBalls:160})},
 {id:'many-walls',name:'壁大量',settings:merged(1103,{ballCount:12,ballSize:7,ballSpeed:190,wallCount:48,wallLength:47,wallThickness:5,wallArrangement:'random',wallAngle:25,ringsEnabled:false,gravity:200,glow:4,trailLength:6,maxBalls:100})},
 {id:'multi-rings',name:'多重リング',settings:merged(1104,{ballCount:8,ballSize:7,ballSpeed:150,wallCount:0,ringsEnabled:true,ringCount:12,ringRadius:215,ringSpacing:15,ringThickness:4,ringRotation:24,gapWidth:38,gapCount:1,gravity:160,trailLength:10,maxBalls:120})},
 {id:'high-speed',name:'超高速',settings:merged(1105,{ballCount:12,ballSize:9,ballSpeed:800,wallCount:5,wallLength:120,ringsEnabled:false,gravity:100,restitution:.95,accuracy:'high',trailLength:20,glow:8,simulationSpeed:1,maxBalls:120})},
 {id:'high-bounce',name:'高反発',settings:merged(1106,{ballCount:8,ballSize:13,ballSpeed:220,wallCount:6,wallLength:110,ringsEnabled:false,restitution:1.08,friction:0,airDrag:.005,gravity:360,accuracy:'high',glow:6,trailLength:12,maxBalls:100})},
 {id:'multiply',name:'ボール増殖',settings:merged(1107,{ballCount:2,ballSize:8,ballSpeed:180,wallCount:4,wallLength:130,ringsEnabled:false,multiplyOnHit:true,multiplyCount:1,maxBalls:100,mergeBalls:false,gravity:230,glow:4,trailLength:4})},
 {id:'merge',name:'ボール合体',settings:merged(1108,{ballCount:40,ballSize:6,ballSpeed:100,wallCount:0,ringsEnabled:false,mergeBalls:true,multiplyOnHit:false,maxBalls:80,gravity:280,restitution:.65,glow:6,trailLength:8})},
 {id:'neon-asmr',name:'ネオンASMR',settings:merged(1109,{ballCount:6,ballSize:12,ballSpeed:100,wallCount:0,ringsEnabled:true,ringCount:5,ringRadius:200,ringSpacing:25,ringThickness:7,ringRotation:12,ringDirection:'alternate',gapWidth:50,ringEvent:'color',colorMode:'rainbow',glow:24,trailLength:32,gravity:60,maxBalls:80})},
 {id:'chaos',name:'カオスチャレンジ',settings:merged(1110,{ballCount:32,ballSize:7,ballSpeed:340,wallCount:18,wallLength:65,wallThickness:5,wallArrangement:'random',wallRotation:35,wallMoveSpeed:20,ringsEnabled:true,ringCount:5,ringRadius:205,ringSpacing:27,ringThickness:5,ringRotation:50,gapWidth:45,gapCount:2,gravity:520,gravityDirection:65,restitution:1,multiplyOnHit:true,multiplyCount:1,maxBalls:96,glow:4,trailLength:6,accuracy:'high',quality:'medium'})}
];

const layoutKeys=new Set(['ballCount','ballSize','wallCount','wallLength','wallThickness','wallAngle','wallArrangement','seed']);
export function applyCustomPatch(current,patch,{preserveStage=false}={}){
 const next={...clone(current),...clone(patch)};
 if(patch.ballCount!==undefined&&patch.maxBalls===undefined&&next.ballCount>next.maxBalls)next.maxBalls=next.ballCount;
 if(patch.ringCount!==undefined&&patch.ringsEnabled===undefined)next.ringsEnabled=true;
 if(patch.mergeBalls===true&&patch.ballCollisions===undefined)next.ballCollisions=true;
 if(patch.ballCollisions===false)next.mergeBalls=false;

 if(!preserveStage&&![...Object.keys(patch)].includes('stage')&&Object.keys(patch).some(key=>layoutKeys.has(key)&&patch[key]!==current[key]))next.stage=null;
 return normalizeCustom(next);
}
function noSecrets(value){
 if(!value||typeof value!=='object')return;
 for(const [key,v] of Object.entries(value)){if(/(?:api.?key|access.?token|password|secret)/i.test(key))throw Error('APIキーや秘密情報を含む設定は読み込めません');if(v&&typeof v==='object')noSecrets(v)}
}
export function normalizeUserPreset(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('プリセットのJSON形式が不正です');noSecrets(value);
 const name=String(value.name||'読み込んだ設定').trim();if(!name||name.length>80)throw Error('プリセット名は1〜80文字です');
 const settings=normalizeCustom(value.settings||value.config||value,{strict:true});return {id:typeof value.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)?value.id:'user-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name,settings:clone(settings)};
}
export function parseCustomPresets(input){const list=Array.isArray(input)?input:Array.isArray(input?.presets)?input.presets:[input];if(list.length>CUSTOM_PRESET_LIMIT)throw Error('保存プリセットは最大30件です');const next=list.map(normalizeUserPreset);if(new Set(next.map(x=>x.id)).size!==next.length)throw Error('プリセットIDが重複しています');return next}
function bytes(value){return new Blob([JSON.stringify(value)]).size}
function readPresets(){try{const raw=localStorage.getItem(CUSTOM_PRESET_KEY);return raw?parseCustomPresets(JSON.parse(raw)):[]}catch(error){throw Error('保存プリセットを読み込めません: '+error.message)}}
function writePresets(value){if(value.length>CUSTOM_PRESET_LIMIT)throw Error('保存プリセットは最大30件です');if(bytes(value)>CUSTOM_STORAGE_LIMIT)throw Error('保存設定の上限1MiBを超えています');try{localStorage.setItem(CUSTOM_PRESET_KEY,JSON.stringify(value))}catch{throw Error('端末内に設定を保存できません。容量やSafariの保存設定を確認してください')}}
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node};
const button=(label,fn)=>{const node=el('button',label);node.type='button';node.onclick=fn;return node};
const sectionTitles={balls:'ボールの詳細',walls:'壁・障害物',rings:'リングと出口',physics:'物理・描画・乱数',presets:'プリセット・JSON'};
const controls=[
 ['ballCount','ボール数',1,200,1,'quick'],['ballSize','ボール半径',1,50,1,'quick','px'],['ballSpeed','初速',0,1500,10,'quick','px/s'],['wallCount','壁の数',0,100,1,'quick'],['ringCount','リング数',1,30,1,'quick'],['gravity','重力の強さ',0,1500,10,'quick','px/s²'],
 ['ballMass','ボールの質量',.05,50,.05,'balls'],['ballCollisions','ボール同士の衝突','boolean',null,null,'balls'],['colorMode','ボールの配色','select',[['single','単色'],['rainbow','虹色'],['random','ランダム']],null,'balls'],['ballColor','単色の色','color',null,null,'balls'],['glow','発光量',0,30,1,'balls'],['trailLength','残像の長さ',0,80,1,'balls'],['multiplyOnHit','衝突で増殖','boolean',null,null,'balls'],['multiplyCount','衝突1回で追加する数',1,10,1,'balls'],['maxBalls','増殖を含む最大数',1,500,1,'balls'],['mergeBalls','接触したボールを合体','boolean',null,null,'balls'],
 ['wallLength','壁の長さ',10,500,1,'walls','px'],['wallThickness','壁の厚み',2,40,1,'walls','px'],['wallAngle','壁の角度',-180,180,1,'walls','°'],['wallArrangement','配置','select',[['even','均等'],['random','ランダム'],['manual','手動・直接編集']],null,'walls'],['wallRotation','壁の回転速度',-360,360,1,'walls','°/s'],['wallMoveSpeed','壁の移動速度',0,200,1,'walls','px/s'],['wallColor','壁の色','color',null,null,'walls'],['breakWalls','衝突で壁を破壊','boolean',null,null,'walls'],['collisionEffect','衝突エフェクト','select',[['none','なし'],['spark','火花'],['ripple','波紋']],null,'walls'],
 ['ringsEnabled','リングを有効にする','boolean',null,null,'rings'],['ringRadius','いちばん外の半径',20,220,1,'rings','px'],['ringSpacing','リングの間隔',0,100,1,'rings','px'],['ringThickness','リングの線幅',2,30,1,'rings','px'],['ringRotation','リングの回転速度',0,360,1,'rings','°/s'],['ringDirection','回転方向','select',[['clockwise','時計回り'],['counterclockwise','反時計回り'],['alternate','交互']],null,'rings'],['gapWidth','出口の幅',0,180,1,'rings','°'],['gapPosition','出口の角度',-360,360,1,'rings','°'],['gapCount','出口の数',1,8,1,'rings'],['ringColorMode','リングの配色','select',[['rainbow','虹色'],['custom','指定色']],null,'rings'],['ringColors','指定色（カンマ区切り）','colors',null,null,'rings'],['ringEvent','出口・接触イベント','select',[['none','なし'],['spark','火花'],['color','色を変える'],['multiply','増殖']],null,'rings'],
 ['gravityDirection','重力の向き',-360,360,1,'physics','°（90°=下）'],['restitution','反発係数',0,1.2,.01,'quick'],['friction','接触の摩擦',0,1,.01,'physics'],['airDrag','空気抵抗',0,3,.01,'physics'],['simulationSpeed','シミュレーション速度',.1,4,.1,'physics','倍'],['accuracy','計算精度','select',[['low','低 / 軽量'],['medium','中 / 120Hz'],['high','高 / 負荷増']],null,'physics'],['quality','描画品質','select',[['low','低'],['medium','中'],['high','高']],null,'physics'],['seed','乱数シード',0,4294967295,1,'physics']
];

export function mountCustomControls(container,{onChange=()=>{}}={}){
 let mode='easy',locked=false,template={genre:'ball',id:'phy-ring-escape'},settings=normalizeCustom(clone(DEFAULT_CUSTOM)),valid=true,users=[],selectedPreset='',disposed=false;
 const inputs=new Map(),ranges=new Map(),isPhysics=()=>['ball','viral'].includes(template.genre);container.classList.add('custom-controls');
 const heading=el('h2','自分だけの物理ステージ'),modeButtons=el('div',undefined,'custom-mode-buttons');
 const easy=button('簡単モード',()=>{mode='easy';renderMode();emit()}),advanced=button('詳細カスタマイズ',()=>{mode='advanced';renderMode();emit()});modeButtons.append(easy,advanced);
 const reason=el('p','','custom-note'),notice=el('p','','custom-message');notice.setAttribute('role','status');
 const panel=el('fieldset',undefined,'custom-fields'),legend=el('legend','物理ステージの設定');legend.className='sr';panel.append(legend);
 const quick=el('div',undefined,'custom-quick-grid'),detailSections={};panel.append(quick);
 for(const name of ['balls','walls','rings','physics','presets']){const details=el('details'),summary=el('summary',sectionTitles[name]),body=el('div',undefined,'custom-grid');details.append(summary,body);panel.append(details);detailSections[name]=body}
 detailSections.balls.append(el('p','質量は衝突の運動量、合体、壁破壊や衝突強度に影響します。重力の加速度は質量に依存しません。','custom-note'));
 const layoutNote=el('p','数・サイズ・壁の形／配置・乱数シードを変更すると、直接編集した初期配置を作り直します。色・重力・反発などの変更は初期配置を維持します。','custom-note');panel.append(layoutNote);
 function report(message,isError=false){notice.textContent=message;notice.classList.toggle('error',isError)}
 function emit(){onChange(getValue())}
 function getValue(){return {mode,settings:clone(settings),enabled:mode==='advanced'&&isPhysics(),valid:mode==='easy'||!isPhysics()?true:valid}}
 function collect(){const raw={...clone(settings)};for(const [key,input] of inputs){if(input.type==='checkbox')raw[key]=input.checked;else if(input.dataset.kind==='number'){if(!input.value.trim())throw Error(input.dataset.label+'を入力してください');raw[key]=Number(input.value);if(!input.checkValidity())throw Error(input.dataset.label+'は範囲内の値を入力してください')}else if(input.dataset.kind==='colors')raw[key]=input.value.split(/[\n,]/).map(x=>x.trim()).filter(Boolean);else raw[key]=input.value}return raw}
 function changed(key){
  try{const raw=collect();const patch=Object.fromEntries(Object.entries(raw).filter(([name,value])=>name!=='stage'&&JSON.stringify(value)!==JSON.stringify(settings[name])));const next=applyCustomPatch(settings,patch);const wasManual=!!settings.stage;settings=next;valid=true;syncInputs();selectedPreset='';presetSelect.value='';if(wasManual&&!settings.stage)report('初期配置を再生成しました。球数に応じて最大数、リング数変更時はリング有効、合体時は衝突ONを連動します。必要なら直接編集できます。');else report('設定を更新しました。端末ごとの動作確認が必要です。');if(ranges.has(key)&&inputs.get(key).checkValidity())ranges.get(key).value=inputs.get(key).value;diagnostics();emit()}catch(error){valid=false;report(error.message,true);emit()}
 }
 for(const descriptor of controls){const [key,label,min,max,step,section,unit]=descriptor,wrap=el('label',undefined,'custom-field'),title=el('span',label+(unit?' · '+unit:''));let input;
  if(min==='boolean'){wrap.classList.add('custom-check');input=el('input');input.type='checkbox';wrap.append(title,input)}
  else if(min==='select'){input=el('select');for(const [value,text] of max){const option=el('option',text);option.value=value;input.append(option)}wrap.append(title,input)}
  else if(min==='color'){input=el('input');input.type='color';wrap.append(title,input)}
  else if(min==='colors'){input=el('input');input.type='text';input.dataset.kind='colors';input.placeholder='#8ef1cf, #9d8aff, #ffb26c';wrap.append(title,input)}
  else {input=el('input');input.type='number';input.min=String(min);input.max=String(max);input.step=String(step);input.inputMode=step<1?'decimal':'numeric';input.dataset.kind='number';wrap.append(title,input);if(key!=='seed'){const range=el('input');range.type='range';range.min=String(min);range.max=String(max);range.step=String(step);range.setAttribute('aria-label',label+'スライダー');range.oninput=()=>{input.value=range.value;changed(key)};ranges.set(key,range);wrap.append(range)}}
  input.dataset.label=label;input.name='custom-'+key;input.oninput=()=>changed(key);inputs.set(key,input);(section==='quick'?quick:detailSections[section]).append(wrap);
 }
 const presetSelect=el('select');presetSelect.setAttribute('aria-label','物理プリセット');const presetName=el('input');presetName.type='text';presetName.placeholder='プリセット名';presetName.maxLength=80;presetName.setAttribute('aria-label','保存するプリセット名');
 const presetActions=el('div',undefined,'custom-preset-actions'),presets=detailSections.presets;presets.append(presetSelect,presetName,presetActions);
 function refreshPresets(){presetSelect.replaceChildren();const blank=el('option','プリセットを選択');blank.value='';presetSelect.append(blank);for(const [prefix,title,rows] of [['builtin:','標準プリセット',BUILTIN_CUSTOM_PRESETS],['user:','保存したプリセット',users]]){const group=el('optgroup');group.label=title;for(const item of rows){const op=el('option',item.name);op.value=prefix+item.id;group.append(op)}presetSelect.append(group)}presetSelect.value=selectedPreset}
 function selected(){const [kind,id]=presetSelect.value.split(':');return (kind==='builtin'?BUILTIN_CUSTOM_PRESETS:users).find(x=>x.id===id)}
 function snapshotPreset(name){if(!valid)throw Error('入力エラーを修正してから保存してください');return normalizeUserPreset({name,settings,id:'user-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)})}
 function savePreset(duplicate=false){try{const old=selected(),name=presetName.value.trim()||(old?old.name+(duplicate?' コピー':''):'マイステージ');const item=snapshotPreset(name);let next=users.slice();if(!duplicate&&presetSelect.value.startsWith('user:')&&old){item.id=old.id;next=next.filter(x=>x.id!==old.id)}next.push(item);writePresets(next);users=next;selectedPreset='user:'+item.id;refreshPresets();presetName.value=item.name;report(duplicate?'設定を複製して保存しました。':'設定をこの端末に保存しました。');emit()}catch(error){report(error.message,true)}}
 presetActions.append(button('プリセットを読み込む',()=>{try{const item=selected();if(!item)throw Error('プリセットを選択してください');const selection=presetSelect.value;replaceSettings(item.settings,{notify:false});selectedPreset=selection;presetSelect.value=selection;presetName.value=item.name;report(item.name+'を読み込みました。');emit()}catch(error){report(error.message,true)}}),button('この設定を保存',()=>savePreset(false)),button('複製して保存',()=>savePreset(true)),button('保存プリセットを削除',()=>{const item=selected();if(!presetSelect.value.startsWith('user:')||!item){report('削除できるのは自分で保存したプリセットです。',true);return}if(!confirm('保存プリセット「'+item.name+'」を削除しますか？'))return;try{const next=users.filter(x=>x.id!==item.id);writePresets(next);users=next;selectedPreset='';refreshPresets();report('プリセットを削除しました。')}catch(error){report(error.message,true)}}));
 const exportOne=button('現在の設定をJSON保存',()=>{try{const item=snapshotPreset(presetName.value.trim()||selected()?.name||'マイステージ');download({version:1,presets:[item]},'shorts-custom-stage.json')}catch(error){report(error.message,true)}}),exportAll=button('保存プリセットを一括JSON保存',()=>download({version:1,presets:users},'shorts-custom-presets.json'));
 const file=el('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','物理プリセットJSON');const importButton=button('JSONを読み込む',async()=>{try{const source=file.files?.[0];if(!source)throw Error('JSONファイルを選択してください');if(source.size>CUSTOM_IMPORT_LIMIT)throw Error('JSONファイルは256KiB以下にしてください');const incoming=parseCustomPresets(JSON.parse(await source.text()));const map=new Map(users.map(x=>[x.id,x]));for(const item of incoming)map.set(item.id,item);const next=[...map.values()];writePresets(next);users=next;refreshPresets();if(incoming.length===1){replaceSettings(incoming[0].settings,{notify:false});selectedPreset='user:'+incoming[0].id;refreshPresets();presetName.value=incoming[0].name;emit()}report(incoming.length+'件の設定を検証して読み込みました。')}catch(error){report('読み込めません: '+error.message,true)}});presets.append(button('テンプレートの初期設定に戻す',()=>{replaceSettings(templateCustomDefaults(template.id,DEFAULT_CUSTOM.seed));report('選択テンプレートの初期設定に戻しました。')}),exportOne,exportAll,file,importButton,el('p','設定はこの端末だけに保存します。最大30件・合計1MiB、JSON読込は256KiBまで。APIキーや音声・動画は含めません。','custom-note'));
 const diagnosticsPanel=el('div',undefined,'custom-diagnostics');diagnosticsPanel.setAttribute('aria-live','polite');container.append(heading,modeButtons,reason,notice,panel,diagnosticsPanel);
 function diagnostics(){
  const warnings=[];if(settings.quality==='low'&&settings.glow>0)warnings.push('低画質では発光を省略します。発光量を見たい場合は中・高画質にしてください。');warnings.push('壁の本数は内部障害物の数です。外周の安全枠は固定で、0本でも外周へ衝突します。');if(settings.mergeBalls)warnings.push('合体後は質量と運動量を合算し、半径が大きくなります。表示半径は安全のため最大220pxです。');if(settings.ballCount>80||settings.maxBalls>200||settings.wallCount>40||settings.ringCount>12||settings.accuracy==='high'||settings.trailLength>30)warnings.push('高負荷の設定です。まず低解像度・3秒・1本で確認してください。上限値がiPhoneで安全に動くことは未検証です。');
  if(settings.multiplyOnHit||settings.ringEvent==='multiply')warnings.push('増殖は最大'+settings.maxBalls+'個まで。衝突回数により負荷が変わります。');if(settings.mergeBalls&&(settings.multiplyOnHit||settings.ringEvent==='multiply'))warnings.push('増殖と合体が同時に有効です。増えたボールが再び合体する場合があります。');
  if(settings.ringsEnabled){try{const stage=buildStage(settings);if(stage.warnings.length)warnings.push(...stage.warnings.map(w=>'配置の注意：'+w));warnings.push('有効なリング間隔 '+Number(stage.effectiveRingSpacing).toFixed(2)+'px / 要求 '+settings.ringSpacing+'px。半径・配置に合わせた値です。')}catch(error){warnings.push('リング配置の計算に失敗しました: '+error.message)}}
  const trailEstimate=settings.maxBalls*settings.trailLength*2*8/1024,heap=globalThis.performance?.memory?.usedJSHeapSize;diagnosticsPanel.replaceChildren(el('strong','設定と負荷の目安'),el('p',`初期 ${settings.ballCount}球 / 最大 ${settings.maxBalls}球 · 壁 ${settings.wallCount} · リング ${settings.ringsEnabled?settings.ringCount:0}`),el('p',`設定JSON ${bytes(settings).toLocaleString()} bytes。軌跡座標だけを倍精度2成分で保持すると仮定した概算 ${trailEstimate.toFixed(1)} KiB。オブジェクト・物理計算・Canvas・録画・GPUは含みません。`,'custom-note'),el('p',Number.isFinite(heap)?`現在のJSヒープ観測 ${(heap/1024/1024).toFixed(1)} MiB（非標準API。ブラウザ全体・GPU・録画メモリではありません）。`:'このブラウザではJSヒープ実測APIを利用できません。iPhoneのピークメモリや安全な最大数を事前に保証できません。','custom-note'));
  for(const warning of warnings)diagnosticsPanel.append(el('p',warning,'custom-warning'));
 }
 function syncInputs(){for(const [key,input] of inputs){const value=settings[key];if(input.type==='checkbox')input.checked=!!value;else input.value=Array.isArray(value)?value.join(', '):String(value??'');if(ranges.has(key))ranges.get(key).value=input.value}diagnostics()}
 function renderMode(){easy.classList.toggle('selected',mode==='easy');advanced.classList.toggle('selected',mode==='advanced');easy.setAttribute('aria-pressed',String(mode==='easy'));advanced.setAttribute('aria-pressed',String(mode==='advanced'));easy.disabled=locked;advanced.disabled=locked;panel.hidden=mode==='easy';panel.disabled=locked||mode==='easy'||!isPhysics();reason.textContent=mode==='easy'?'簡単モード：既存テンプレートの演出をそのまま使います。':!isPhysics()?'詳細カスタマイズは物理/VIRAL専用です。ASMR・ミーム・連鎖は従来のスクリプトをそのまま生成します。':'物理/VIRALの初期配置と物理・描画設定を編集できます。詳細モードは物理フリーステージの近似で、磁力・螺旋拘束・リング破壊/縮小・勝利条件など、選択テンプレートの専用ルールは簡単モード専用です。直接編集した配置はJSONにも保存されます。';diagnosticsPanel.hidden=mode==='easy';}
 function replaceSettings(next,{notify=true}={}){const normalized=normalizeCustom(clone(next));settings=clone(normalized);valid=true;selectedPreset='';presetSelect.value='';syncInputs();renderMode();report('設定を反映しました。');if(notify)emit();return getValue()}
 function setTemplate(next,{notify=false}={}){template={id:next?.id||'phy-ring-escape',genre:next?.genre||'ball'};if(isPhysics()){settings=normalizeCustom(templateCustomDefaults(template.id,settings.seed));valid=true;selectedPreset='';syncInputs();presetSelect.value=''}renderMode();if(notify)emit();return getValue()}
 function setMode(value,{notify=true}={}){if(!['easy','advanced'].includes(value))throw Error('モードはeasyまたはadvancedを指定してください');mode=value;renderMode();if(notify)emit();return getValue()}
 function setLocked(value){locked=!!value;renderMode()}
 function download(value,filename){try{const text=JSON.stringify(value,null,2);if(new Blob([text]).size>CUSTOM_STORAGE_LIMIT)throw Error('書き出す設定が1MiBを超えています');const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=filename;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);report('JSONをダウンロードしました。Safariのダウンロード一覧をご確認ください。')}catch(error){report(error.message,true)}}
 try{users=readPresets()}catch(error){report(error.message,true)}refreshPresets();syncInputs();renderMode();const interval=setInterval(()=>{if(disposed||!container.isConnected){clearInterval(interval);return}if(mode==='advanced')diagnostics()},5000);
 return {getValue,setTemplate,replaceSettings,setMode,setLocked,destroy(){disposed=true;clearInterval(interval)}};
}
