/* Deterministic custom 2D laboratory. No network, native assets or precomputed history.
 * Equal global gravity acceleration is mass-independent; mass affects impulses,
 * wall breakage and merge momentum. These are discs/capsules, not rigid 3D bodies.
 */
export const STAGE_BOUNDS=Object.freeze({width:540,height:960,left:24,right:516,top:125,bottom:785});
export const DEFAULT_CUSTOM=Object.freeze({ballCount:8,ballSize:14,ballSpeed:180,ballMass:1,ballCollisions:true,colorMode:'rainbow',ballColor:'#8ef1cf',glow:12,trailLength:12,multiplyOnHit:false,multiplyCount:1,maxBalls:200,mergeBalls:false,wallCount:4,wallLength:160,wallThickness:10,wallAngle:0,wallArrangement:'even',wallRotation:0,wallMoveSpeed:0,wallColor:'#91a9c4',breakWalls:false,collisionEffect:'spark',ringsEnabled:true,ringCount:3,ringRadius:180,ringSpacing:22,ringThickness:8,ringRotation:25,ringDirection:'alternate',gapWidth:45,gapPosition:-90,gapCount:1,ringColorMode:'rainbow',ringColors:['#8ef1cf','#b4a3ff','#ffbe83'],ringEvent:'spark',gravity:320,gravityDirection:90,restitution:.92,friction:.03,airDrag:.02,simulationSpeed:1,accuracy:'medium',seed:20261104,quality:'medium'});
const numeric={ballSize:[1,50],ballSpeed:[0,1500],ballMass:[.05,50],glow:[0,30],wallLength:[10,500],wallThickness:[2,40],wallAngle:[-180,180],wallRotation:[-360,360],wallMoveSpeed:[0,200],ringRadius:[20,220],ringSpacing:[0,100],ringThickness:[2,30],ringRotation:[0,360],gapWidth:[0,180],gapPosition:[-360,360],gravity:[0,1500],gravityDirection:[-360,360],restitution:[0,1.2],friction:[0,1],airDrag:[0,3],simulationSpeed:[.1,4]};
const integers={ballCount:[1,200],wallCount:[0,100],ringCount:[1,30],multiplyCount:[1,10],maxBalls:[1,500],trailLength:[0,80],gapCount:[1,8],seed:[0,4294967295]};
const enums={colorMode:['single','rainbow','random'],wallArrangement:['even','random','manual'],collisionEffect:['none','spark','ripple'],ringDirection:['clockwise','counterclockwise','alternate'],ringColorMode:['rainbow','custom'],ringEvent:['none','spark','color','multiply'],accuracy:['low','medium','high'],quality:['low','medium','high']};
const booleanKeys=['ballCollisions','multiplyOnHit','mergeBalls','breakWalls','ringsEnabled'];
const TAU=Math.PI*2,RAD=Math.PI/180,PALETTE=['#8ef1cf','#b4a3ff','#ffbe83','#7bcfff','#f28fb3','#f3e79b'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapDegrees=value=>((value+180)%360+360)%360-180;
const finite=(v,key)=>{if((typeof v!=='number'&&typeof v!=='string')||v===''||!Number.isFinite(Number(v)))throw Error(`${key}: finite number required`);return Number(v)};
function hex(value,key){if(typeof value!=='string'||!/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value))throw Error(`${key}: use a hex color`);return(value.length===4?'#'+[...value.slice(1)].map(c=>c+c).join(''):value).toLowerCase()}
function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
function point(value,key){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(key+': object required');return{x:clamp(finite(value.x,key+'.x'),24,516),y:clamp(finite(value.y,key+'.y'),125,785)}}
export function normalizeCustom(input={},options={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Custom settings must be an object');
 const c={...DEFAULT_CUSTOM,ringColors:[...DEFAULT_CUSTOM.ringColors]};
 for(const [key,[min,max]] of Object.entries(numeric))if(input[key]!==undefined){const value=finite(input[key],key);if(options.strict&&(value<min||value>max))throw Error(`${key}: ${min}..${max} required`);c[key]=clamp(value,min,max)}
 for(const [key,[min,max]] of Object.entries(integers))if(input[key]!==undefined){const value=finite(input[key],key);if(!Number.isInteger(value)||value<min||value>max)throw Error(`${key}: integer ${min}..${max} required`);c[key]=value}
 for(const [key,values] of Object.entries(enums))if(input[key]!==undefined){if(!values.includes(input[key]))throw Error(`${key}: invalid option`);c[key]=input[key]}
 for(const key of booleanKeys)if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error(key+': boolean required');c[key]=input[key]}
 for(const key of ['ballColor','wallColor'])if(input[key]!==undefined)c[key]=hex(input[key],key);
 if(input.ringColors!==undefined){if(!Array.isArray(input.ringColors)||!input.ringColors.length||input.ringColors.length>30)throw Error('ringColors: 1..30 colors required');c.ringColors=input.ringColors.map((v,i)=>hex(v,'ringColors['+i+']'))}
 if(c.mergeBalls&&!c.ballCollisions)throw Error('合体にはボール同士の衝突をONにしてください');
 if(c.maxBalls<c.ballCount)throw Error('maxBalls must be at least ballCount');
 if(input.stage!==undefined&&input.stage!==null){
  const stage=input.stage;if(!stage||typeof stage!=='object'||Array.isArray(stage))throw Error('stage: object required');c.stage={};
  if(stage.balls!==undefined){if(!Array.isArray(stage.balls)||stage.balls.length!==c.ballCount)throw Error('stage.balls length must equal ballCount');c.stage.balls=stage.balls.map((b,i)=>({...point(b,'stage.balls'),id:String(b.id??'ball-'+i).slice(0,80),heading:clamp(finite(b.heading??0,'heading'),-360,360)}));if(new Set(c.stage.balls.map(b=>b.id)).size!==c.ballCount)throw Error('Ball ids must be unique')}
  if(stage.walls!==undefined){if(!Array.isArray(stage.walls)||stage.walls.length!==c.wallCount)throw Error('stage.walls length must equal wallCount');c.stage.walls=stage.walls.map((w,i)=>({...point(w,'stage.walls'),id:String(w.id??'wall-'+i).slice(0,80),length:clamp(finite(w.length??c.wallLength,'wall.length'),10,500),angle:clamp(finite(w.angle??c.wallAngle,'wall.angle'),-180,180)}));if(new Set(c.stage.walls.map(w=>w.id)).size!==c.wallCount)throw Error('Wall ids must be unique')}
  if(stage.ringCenter!==undefined)c.stage.ringCenter=point(stage.ringCenter,'stage.ringCenter');
 }
 return c;
}
export function templateCustomDefaults(templateId,seed=DEFAULT_CUSTOM.seed){
 const profiles={
 'phy-ring-escape':{wallCount:0,ringsEnabled:true,ringCount:3,gapWidth:40,ringRotation:35},
 'phy-maze':{wallCount:7,wallLength:250,wallArrangement:'even',ringsEnabled:false,ballCount:5,gravity:420},
 'phy-funnel':{wallCount:2,wallLength:340,wallAngle:55,ringsEnabled:false,ballCount:20,ballSize:10},
 'phy-race':{wallCount:35,wallLength:12,wallThickness:12,wallArrangement:'even',ringsEnabled:false,ballCount:15,ballSize:9},
 'phy-multiplication':{ballCount:1,wallCount:0,ringCount:3,multiplyOnHit:true,multiplyCount:1,maxBalls:150},
 'phy-spiral':{wallCount:12,wallLength:90,wallAngle:30,wallArrangement:'even',wallRotation:20,ringsEnabled:true,ringCount:5},
 'phy-magnetic':{wallCount:1,wallRotation:60,wallMoveSpeed:70,ringsEnabled:true,ringRotation:35,ringDirection:'counterclockwise',gravity:80},
 'phy-sorting':{wallCount:6,wallLength:140,ringsEnabled:false,ballCount:18,colorMode:'rainbow',gravity:400},
 'phy-paddles':{wallCount:7,wallRotation:50,wallMoveSpeed:70,ringsEnabled:false},
 'phy-gap':{wallCount:4,wallLength:215,wallArrangement:'even',ballSize:11,ringsEnabled:true,ringCount:1,gapWidth:30},
 'phy-elastic':{wallCount:0,ringsEnabled:false,ballCount:7,gravity:0,restitution:1,airDrag:0,friction:0},
 'phy-orbit':{wallCount:0,ringCount:5,ringRotation:40,gravity:0,ballSpeed:250,trailLength:30},
 'phy-survival':{wallCount:8,wallLength:80,wallRotation:35,ringCount:1,gapWidth:20,ballCount:25,ballSize:8},
 'phy-chain-bounce':{wallCount:10,wallLength:100,wallAngle:25,wallArrangement:'even',ringsEnabled:false,ballCount:6},
 'phy-timing':{wallCount:2,wallLength:210,wallMoveSpeed:100,ringCount:1,gapWidth:40,ringRotation:20,ballCount:4}
 };
 const viral=String(templateId).startsWith('viral-')?{ballCount:1,wallCount:0,ringsEnabled:true,ringCount:3,ballSpeed:200,trailLength:18,...(String(templateId).includes('multipl')?{multiplyOnHit:true,maxBalls:200}:{}),...(String(templateId).includes('sort')?{ballCount:18,wallCount:6,ringsEnabled:false}:{})}:{};
 const viralProfiles={
  escape:{ringCount:3},multiply:{multiplyOnHit:true,multiplyCount:1,maxBalls:32},
  center:{ringCount:4,ringRadius:199,ringSpacing:43,ballSize:6,gapWidth:40},
  last:{ballCount:12,ringCount:1,ballSize:8,ballSpeed:190},
  color:{ballCount:6,ringCount:3,colorMode:'rainbow',ringEvent:'color'},
  spiral:{wallCount:12,wallLength:80,wallAngle:25,ringsEnabled:false},
  gravity:{ringCount:3,gravity:420,gravityDirection:90},
  fusion:{ballCount:10,ringCount:1,mergeBalls:true,gravity:0,ballSpeed:100},
  destroy:{ringCount:3,collisionEffect:'spark'},
  timing:{ringCount:1,gapWidth:28,ringRotation:60},
  oneexit:{ballCount:100,maxBalls:100,ballSize:4,ringCount:1,ringRadius:215,gapWidth:20,glow:0,trailLength:0,quality:'low'},
  magnetic:{ringCount:3,gravity:120,ballSpeed:260},
  shrink:{ringCount:1,ringRadius:220},
  reverse:{ringCount:1,gravityDirection:-90,gapPosition:-90},
  race:{ballCount:5,ballSize:8,wallCount:25,wallLength:10,wallThickness:8,ringsEnabled:false,ballSpeed:80},
  chain:{ringCount:3,ringEvent:'spark'},
  split:{ringCount:3,ringEvent:'multiply',multiplyCount:1,maxBalls:32},
  impossible:{ringCount:4,gapWidth:22,wallCount:5,wallLength:20,wallArrangement:'random'},
  transform:{ringCount:3,ringEvent:'color'},
  ultimate:{ringCount:3,wallCount:4,wallLength:22,gapWidth:40,ringRotation:35}
 };
 const viralProfile=String(templateId).startsWith('viral-')?viralProfiles[String(templateId).slice(6)]||{}:{};
 const c=normalizeCustom({...DEFAULT_CUSTOM,...viral,...viralProfile,...(profiles[templateId]||{}),seed});
 if(templateId==='viral-center'||templateId==='viral-impossible')c.stage={balls:[{id:'ball-0',x:475,y:455,heading:180}]};

 if(templateId==='phy-funnel')c.stage={walls:[{id:'wall-0',x:155,y:430,length:340,angle:58},{id:'wall-1',x:385,y:430,length:340,angle:122}]};
 return c;
}
export function buildStage(input={}){
 const c=normalizeCustom(input),random=rng(c.seed),warnings=[],center=c.stage?.ringCenter||{x:270,y:455};
 const fit=Math.max(4,Math.min(220,center.x-24,516-center.x,center.y-125,785-center.y));
 const outer=Math.min(c.ringRadius,fit),spacing=c.ringCount>1?Math.min(c.ringSpacing,Math.max(0,(outer-8)/(c.ringCount-1))):0;
 if(c.ringsEnabled&&(outer<c.ringRadius||spacing<c.ringSpacing&&c.ringCount>1))warnings.push('Ring radius/spacing reduced to fit the 220px stage limit; ring count is unchanged.');
 if(c.ringsEnabled&&c.gapWidth*c.gapCount>=360)warnings.push('Gap openings cover the entire ring; no solid arc remains.');
 const rings=c.ringsEnabled?Array.from({length:c.ringCount},(_,i)=>({id:'ring-'+i,x:center.x,y:center.y,radius:outer-i*spacing,angle:c.gapPosition,rotation:c.ringRotation*(c.ringDirection==='counterclockwise'?-1:c.ringDirection==='alternate'&&i%2?-1:1),thickness:c.ringThickness,color:c.ringColorMode==='custom'?c.ringColors[i%c.ringColors.length]:PALETTE[i%PALETTE.length]})):[];
 const balls=c.stage?.balls?c.stage.balls.map(b=>({...b})):Array.from({length:c.ballCount},(_,i)=>{
  let x,y;if(rings.length){const inner=rings.at(-1).radius,space=Math.max(0,inner-c.ballSize-5),a=i*2.399963229728653+random()*.25,r=space*Math.sqrt((i+.5)/c.ballCount);x=center.x+Math.cos(a)*r;y=center.y+Math.sin(a)*r}
  else{const cols=Math.ceil(Math.sqrt(c.ballCount*.75)),rows=Math.ceil(c.ballCount/cols);x=55+(i%cols+.5)/cols*430;y=155+(Math.floor(i/cols)+.5)/rows*570}
  return{id:'ball-'+i,x:clamp(x,24+c.ballSize,516-c.ballSize),y:clamp(y,125+c.ballSize,785-c.ballSize),heading:random()*360};
 });
 const walls=c.stage?.walls?c.stage.walls.map(w=>({...w})):Array.from({length:c.wallCount},(_,i)=>{
  const cols=Math.ceil(Math.sqrt(c.wallCount*.7)),rows=Math.ceil(c.wallCount/cols),randomized=c.wallArrangement==='random';
  return{id:'wall-'+i,x:randomized?55+random()*430:55+(i%cols+.5)/cols*430,y:randomized?190+random()*510:190+(Math.floor(i/cols)+.5)/rows*510,length:c.wallLength,angle:wrapDegrees(randomized?c.wallAngle+(random()-.5)*120:c.wallAngle+(c.wallCount>1&&i%2?-10:10))};
 });
 if(c.wallArrangement==='manual'&&!c.stage?.walls)warnings.push('Manual wall snapshot absent; deterministic even arrangement generated.');
 const area=rings.length?Math.PI*Math.max(1,rings.at(-1).radius-c.ballSize)**2:492*660;
 if(c.ballCount*Math.PI*c.ballSize*c.ballSize>area*.55)warnings.push('High initial density: discs can overlap and performance may drop. Reduce size/count or enlarge spacing.');
 return{balls,walls,ringCenter:{...center},rings,effectiveRingSpacing:spacing,warnings};
}
function fingerprint(c){let h=2166136261;for(const ch of JSON.stringify(c)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')}
export function createCustomScene(input={}){
 const c=normalizeCustom(input),stage=buildStage(c),hz={low:60,medium:120,high:240}[c.accuracy],step=1/hz;
 let balls,walls,rings,tick=0,eventLog=[],effects=[],spawnQueue=[],nextId=c.ballCount,random,colorRandom,totalMerges=0,totalSpawned=0,totalBroken=0,limitWarned=false;
 const stats={initialBallCount:c.ballCount,initialWallCount:c.wallCount,requestedRingCount:c.ringCount,initialRingCount:stage.rings.length,ballCount:c.ballCount,wallCount:c.wallCount,ringCount:stage.rings.length,currentCounts:{balls:c.ballCount,walls:c.wallCount,rings:stage.rings.length},steps:0,pairChecks:0,estimatedBytes:0,configFingerprint:fingerprint(c),warnings:[...stage.warnings],solver:'fixed-step discs/capsules with spatial-hash disc pairs',fixedHz:hz,effectiveRingSpacing:stage.effectiveRingSpacing};
 function color(i){return c.colorMode==='single'?c.ballColor:c.colorMode==='rainbow'?PALETTE[i%PALETTE.length]:`#${Math.floor(colorRandom()*0xffffff).toString(16).padStart(6,'0')}`}
 function reset(){random=rng(c.seed^0x9e3779b9);colorRandom=rng(c.seed^0x85ebca6b);balls=stage.balls.map((b,i)=>({...b,vx:Math.cos(b.heading*RAD)*c.ballSpeed,vy:Math.sin(b.heading*RAD)*c.ballSpeed,radius:c.ballSize,mass:c.ballMass,color:color(i),trail:[],lastMultiply:-1,lastHit:-1,crossings:new Map(),alive:true}));walls=stage.walls.map((w,i)=>({...w,baseX:w.x,baseY:w.y,baseAngle:w.angle,phase:i*1.71,health:350+w.length*c.wallThickness*.2,broken:false}));rings=stage.rings.map(r=>({...r,baseAngle:r.angle}));tick=0;eventLog=[];effects=[];spawnQueue=[];nextId=c.ballCount;totalMerges=0;totalSpawned=0;totalBroken=0;limitWarned=false;stats.steps=0;stats.pairChecks=0;stats.ballCount=balls.length;stats.wallCount=walls.length;stats.ringCount=rings.length;stats.currentCounts={balls:balls.length,walls:walls.length,rings:rings.length};stats.mergedCount=0;stats.spawnedCount=0;stats.brokenWallCount=0;stats.effectCount=0;stats.estimatedBytes=balls.length*256+walls.length*160+rings.length*160;stats.warnings=[...stage.warnings]}
 reset();
 function addEffect(x,y,time,intensity,type){if(type==='none')return;const cap=c.quality==='low'?24:c.quality==='medium'?48:96;effects.push({x,y,time,intensity,type,phase:((Math.sin(x*12.9898+y*78.233+time*37.719)*43758.5453)%1+1)%1*TAU});if(effects.length>cap)effects.splice(0,effects.length-cap)}
 function emit(b,time,impulse,type='hit',ring=null){
  if(type==='cross'&&c.ringEvent==='none')return;
  if(type==='hit'){if(time-b.lastHit<.04)return;b.lastHit=time;}
  const intensity=clamp(impulse/300,.05,1);eventLog.push({time:time/c.simulationSpeed,intensity,pitch:clamp(850-Math.log2(1+b.mass)*180+Math.abs(impulse)%220,100,1600),kind:type,x:b.x,y:b.y,mass:b.mass});if(eventLog.length>1024)eventLog.splice(0,512);
  addEffect(b.x,b.y,time,intensity,type==='cross'?(c.ringEvent==='spark'?'spark':'none'):c.collisionEffect);
  if(type==='hit'&&c.multiplyOnHit||type==='cross'&&c.ringEvent==='multiply')multiply(b,time);
  if(type==='cross'&&c.ringEvent==='color')b.color=ring?.color||PALETTE[Math.floor(colorRandom()*PALETTE.length)];
 }
 function multiply(b,time){if(time-b.lastMultiply<.16)return;b.lastMultiply=time;
  const count=Math.min(c.multiplyCount,c.maxBalls-balls.length-spawnQueue.length,500-balls.length-spawnQueue.length);
  if(count<=0){if(!limitWarned){stats.warnings.push('Maximum ball count reached; further multiplication paused.');limitWarned=true}return}
  for(let i=0;i<count;i++){const a=Math.atan2(b.vy,b.vx)+(i-(count-1)/2)*.5+(.2+random()*.25),radius=c.ballSize;spawnQueue.push({id:'spawn-'+nextId++,x:clamp(b.x+Math.cos(a)*radius*.7,24+radius,516-radius),y:clamp(b.y+Math.sin(a)*radius*.7,125+radius,785-radius),vx:Math.cos(a)*Math.max(c.ballSpeed,Math.hypot(b.vx,b.vy)*.8),vy:Math.sin(a)*Math.max(c.ballSpeed,Math.hypot(b.vx,b.vy)*.8),radius,mass:c.ballMass,color:color(nextId),trail:[],lastMultiply:time,lastHit:time,crossings:new Map(),alive:true})}
 }
 function updateGeometry(time){for(const w of walls){w.angle=w.baseAngle+c.wallRotation*time;w.x=w.baseX;w.y=clamp(w.baseY+(c.wallMoveSpeed?60*(Math.sin(time*c.wallMoveSpeed/60+w.phase)-Math.sin(w.phase)):0),125,785)}for(const r of rings)r.angle=r.baseAngle+r.rotation*time}
 function collideWall(b,w,time,oldX,oldY){
  if(w.broken)return;const a=w.angle*RAD,ux=Math.cos(a),uy=Math.sin(a),half=w.length/2,ax=w.x-ux*half,ay=w.y-uy*half,along=clamp((b.x-ax)*ux+(b.y-ay)*uy,0,w.length),px=ax+ux*along,py=ay+uy*along,dx=b.x-px,dy=b.y-py,dist=Math.hypot(dx,dy),reach=b.radius+c.wallThickness/2;
  const prev=(oldX-w.x)*(-uy)+(oldY-w.y)*ux,current=(b.x-w.x)*(-uy)+(b.y-w.y)*ux,raw=(b.x-ax)*ux+(b.y-ay)*uy,swept=prev*current<0&&raw>=0&&raw<=w.length;
  if(dist>=reach&&!swept)return;let nx,ny;if(swept){const sign=prev<0?-1:1;nx=-uy*sign;ny=ux*sign}else if(dist>.00001){nx=dx/dist;ny=dy/dist}else{nx=-uy;ny=ux}
  b.x=px+nx*(reach+.001);b.y=py+ny*(reach+.001);
  const omega=c.wallRotation*RAD,wallVx=-omega*(py-w.y),wallVy=(c.wallMoveSpeed?c.wallMoveSpeed*Math.cos(time*c.wallMoveSpeed/60+w.phase):0)+omega*(px-w.x),rvx=b.vx-wallVx,rvy=b.vy-wallVy,vn=rvx*nx+rvy*ny;
  if(vn<0){const impulse=-(1+c.restitution)*vn*b.mass;b.vx-=((1+c.restitution)*vn)*nx;b.vy-=((1+c.restitution)*vn)*ny;const tangent=b.vx*(-ny)+b.vy*nx;b.vx+=tangent*c.friction*ny;b.vy-=tangent*c.friction*nx;emit(b,time,impulse);if(c.breakWalls){w.health-=impulse;if(w.health<=0){w.broken=true;totalBroken++;if(c.collisionEffect!=='none')addEffect(w.x,w.y,time,1,c.collisionEffect)}}}
 }
 function inGap(angle,r,bRadius){if(c.gapWidth===0)return false;const extent=c.gapWidth*RAD/2-Math.asin(Math.min(.999,bRadius/Math.max(1,r.radius)));if(extent<0)return false;for(let k=0;k<c.gapCount;k++){const mid=r.angle*RAD+k*TAU/c.gapCount,delta=Math.atan2(Math.sin(angle-mid),Math.cos(angle-mid));if(Math.abs(delta)<=extent)return true}return false}
 function collideRing(b,r,time,oldX,oldY){
  const dx=b.x-r.x,dy=b.y-r.y,d=Math.hypot(dx,dy),oldD=Math.hypot(oldX-r.x,oldY-r.y),angle=Math.atan2(dy,dx),reach=b.radius+c.ringThickness/2;
  if(inGap(angle,r,b.radius)){
   if((oldD<r.radius&&d>=r.radius||oldD>r.radius&&d<=r.radius)&&time-(b.crossings.get(r.id)??-1)>.12){b.crossings.set(r.id,time);emit(b,time,b.mass*Math.hypot(b.vx,b.vy),'cross',r)}return;
  }
  const inside=oldD<r.radius,target=r.radius+(inside?-reach:reach),overlap=Math.abs(d-r.radius)<reach,crossed=inside?oldD<=target&&d>target:oldD>=target&&d<target;
  if(!overlap&&!crossed||d<.00001)return;const nx=dx/d*(inside?-1:1),ny=dy/d*(inside?-1:1);b.x=r.x+dx/d*Math.max(0,target);b.y=r.y+dy/d*Math.max(0,target);
  const vn=b.vx*nx+b.vy*ny;if(vn<0){const impulse=-(1+c.restitution)*vn*b.mass;b.vx-=((1+c.restitution)*vn)*nx;b.vy-=((1+c.restitution)*vn)*ny;const surface=r.rotation*RAD*r.radius,tangent=b.vx*(-ny)+b.vy*nx;b.vx+=(surface-tangent)*c.friction*(-ny);b.vy+=(surface-tangent)*c.friction*nx;emit(b,time,impulse)}
 }
 function constrain(b,time){const oldVx=b.vx,oldVy=b.vy;if(b.x<24+b.radius){b.x=24+b.radius;b.vx=Math.abs(b.vx)*c.restitution;b.vy*=1-c.friction}else if(b.x>516-b.radius){b.x=516-b.radius;b.vx=-Math.abs(b.vx)*c.restitution;b.vy*=1-c.friction}if(b.y<125+b.radius){b.y=125+b.radius;b.vy=Math.abs(b.vy)*c.restitution;b.vx*=1-c.friction}else if(b.y>785-b.radius){b.y=785-b.radius;b.vy=-Math.abs(b.vy)*c.restitution;b.vx*=1-c.friction}if(oldVx!==b.vx||oldVy!==b.vy)emit(b,time,b.mass*Math.hypot(oldVx-b.vx,oldVy-b.vy))}
 function pairs(time){
  if(!c.ballCollisions)return;const size=Math.max(2,Math.max(...balls.map(b=>b.radius))*2),hash=new Map();for(let i=0;i<balls.length;i++){const b=balls[i],x=Math.floor(b.x/size),y=Math.floor(b.y/size),key=x+','+y;if(!hash.has(key))hash.set(key,[]);hash.get(key).push(i)}
  for(let i=0;i<balls.length;i++){const a=balls[i];if(!a.alive)continue;const gx=Math.floor(a.x/size),gy=Math.floor(a.y/size);for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const bucket=hash.get((gx+ox)+','+(gy+oy));if(!bucket)continue;for(const j of bucket){if(j<=i)continue;const b=balls[j];if(!b.alive)continue;stats.pairChecks++;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.radius+b.radius;if(d>=sum)continue;if(d<.000001){dx=i%2?1:-1;dy=0;d=1}const nx=dx/d,ny=dy/d;
   if(c.mergeBalls){const mass=a.mass+b.mass;a.vx=(a.vx*a.mass+b.vx*b.mass)/mass;a.vy=(a.vy*a.mass+b.vy*b.mass)/mass;a.x=(a.x*a.mass+b.x*b.mass)/mass;a.y=(a.y*a.mass+b.y*b.mass)/mass;a.mass=mass;const radius=Math.hypot(a.radius,b.radius);a.radius=Math.min(220,radius);if(radius>220&&!stats.warnings.includes('Merged visual radius capped at 220px; mass and momentum remain conserved.'))stats.warnings.push('Merged visual radius capped at 220px; mass and momentum remain conserved.');b.alive=false;totalMerges++;emit(a,time,mass*40,'merge');continue}
   const mass=a.mass+b.mass,over=sum-d;a.x-=nx*over*b.mass/mass;a.y-=ny*over*b.mass/mass;b.x+=nx*over*a.mass/mass;b.y+=ny*over*a.mass/mass;const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const impulse=-(1+c.restitution)*rel/(1/a.mass+1/b.mass);a.vx-=impulse*nx/a.mass;a.vy-=impulse*ny/a.mass;b.vx+=impulse*nx/b.mass;b.vy+=impulse*ny/b.mass;emit(a,time,impulse);emit(b,time,impulse)}
  }}}
  balls=balls.filter(b=>b.alive);
 }
 function advance(){
  const time=(tick+1)*step;updateGeometry(time);const gravityX=Math.cos(c.gravityDirection*RAD)*c.gravity,gravityY=Math.sin(c.gravityDirection*RAD)*c.gravity,drag=Math.exp(-c.airDrag*step);
  for(const b of balls){const oldX=b.x,oldY=b.y;b.vx=(b.vx+gravityX*step)*drag;b.vy=(b.vy+gravityY*step)*drag;b.vx=clamp(b.vx,-3000,3000);b.vy=clamp(b.vy,-3000,3000);b.x+=b.vx*step;b.y+=b.vy*step;for(const wall of walls)collideWall(b,wall,time,oldX,oldY);for(const ring of rings)collideRing(b,ring,time,oldX,oldY);constrain(b,time)}
  pairs(time);for(const b of balls)constrain(b,time);
  if(spawnQueue.length){totalSpawned+=spawnQueue.length;balls.push(...spawnQueue);spawnQueue=[]}
  if(c.trailLength&&tick%Math.max(1,Math.round(hz/30))===0)for(const b of balls){b.trail.push({x:b.x,y:b.y});if(b.trail.length>c.trailLength)b.trail.splice(0,b.trail.length-c.trailLength)}
  tick++;stats.steps=tick;stats.ballCount=balls.length;stats.wallCount=walls.reduce((n,w)=>n+!w.broken,0);stats.ringCount=rings.length;stats.currentCounts={balls:stats.ballCount,walls:stats.wallCount,rings:stats.ringCount};stats.mergedCount=totalMerges;stats.spawnedCount=totalSpawned;stats.brokenWallCount=totalBroken;stats.effectCount=effects.length;stats.estimatedBytes=balls.length*(256+c.trailLength*16)+walls.length*160+rings.length*160+effects.length*64+eventLog.length*96;effects=effects.filter(e=>time-e.time<.65);
 }
 function seek(realTime){const target=Math.max(0,Math.floor(Math.max(0,finite(realTime,'time'))*c.simulationSpeed*hz+1e-7));if(target<tick)reset();while(tick<target)advance()}
 function snapshot(){return{time:tick*step/c.simulationSpeed,simulationTime:tick*step,balls:balls.map(({id,x,y,vx,vy,radius,mass,color})=>({id,x,y,vx,vy,heading:Math.atan2(vy,vx)/RAD,radius,mass,color})),walls:walls.map(({id,x,y,length,angle,broken,health})=>({id,x,y,length,angle,broken,health})),rings:rings.map(r=>({...r})),ringCenter:{...stage.ringCenter},stats:JSON.parse(JSON.stringify(stats))}}
 function background(ctx){const gradient=ctx.createLinearGradient(0,0,540,960);gradient.addColorStop(0,'#182840');gradient.addColorStop(.6,'#080f20');gradient.addColorStop(1,'#1b3042');ctx.fillStyle=gradient;ctx.fillRect(0,0,540,960);ctx.strokeStyle='#b5d3ed14';ctx.lineWidth=1;for(let y=125;y<=785;y+=60){ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(516,y);ctx.stroke()}ctx.strokeStyle='#8fb5ce88';ctx.strokeRect(24,125,492,660)}
 function draw(ctx,w,h,t,dt,caption){
  seek(t);const simTime=tick*step;ctx.save();ctx.scale(w/540,h/960);background(ctx);
  for(const ring of rings){ctx.save();ctx.strokeStyle=ring.color;ctx.lineWidth=c.ringThickness;ctx.shadowBlur=c.quality==='low'?0:c.glow*.65;ctx.shadowColor=ring.color;for(let k=0;k<c.gapCount;k++){const start=ring.angle*RAD+k*TAU/c.gapCount+c.gapWidth*RAD/2,end=ring.angle*RAD+(k+1)*TAU/c.gapCount-c.gapWidth*RAD/2;if(end>start){ctx.beginPath();ctx.arc(ring.x,ring.y,ring.radius,start,end);ctx.stroke()}}ctx.restore()}
  for(const wall of walls){if(wall.broken)continue;ctx.save();ctx.translate(wall.x,wall.y);ctx.rotate(wall.angle*RAD);const gradient=ctx.createLinearGradient(0,-c.wallThickness/2,0,c.wallThickness/2);gradient.addColorStop(0,'#e8f8ff');gradient.addColorStop(.3,c.wallColor);gradient.addColorStop(1,'#20314b');ctx.fillStyle=gradient;ctx.fillRect(-wall.length/2,-c.wallThickness/2,wall.length,c.wallThickness);ctx.restore()}
  for(const b of balls){if(c.trailLength&&b.trail.length>1){ctx.save();ctx.strokeStyle=b.color;ctx.lineWidth=Math.max(1,b.radius*.3);ctx.globalAlpha=.22;ctx.beginPath();b.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore()}ctx.save();ctx.shadowBlur=c.quality==='low'?0:c.glow;ctx.shadowColor=b.color;const gradient=ctx.createRadialGradient(b.x-b.radius*.35,b.y-b.radius*.42,Math.max(.01,b.radius*.03),b.x,b.y,b.radius*1.2);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.22,b.color);gradient.addColorStop(.75,b.color);gradient.addColorStop(1,'#172b43');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,TAU);ctx.fill();if(c.quality==='high'){ctx.shadowBlur=0;ctx.strokeStyle='#ffffff88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x-b.radius*.1,b.y-b.radius*.15,b.radius*.7,3.4,5.2);ctx.stroke()}ctx.restore()}
  for(const e of effects){const age=simTime-e.time;if(age<0||age>.65)continue;ctx.save();ctx.globalAlpha=(1-age/.65)*.7;ctx.strokeStyle='#d9fff1';ctx.fillStyle='#d9fff1';ctx.lineWidth=1.5;if(e.type==='ripple'){ctx.beginPath();ctx.arc(e.x,e.y,4+age*80,0,TAU);ctx.stroke()}else{const n=c.quality==='low'?3:c.quality==='medium'?5:8;for(let i=0;i<n;i++){const a=e.phase+i*TAU/n,r=age*(35+e.intensity*60);ctx.beginPath();ctx.arc(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r+age*age*40,1.5,0,TAU);ctx.fill()}}ctx.restore()}
  ctx.fillStyle='#abc9de';ctx.font='12px -apple-system,sans-serif';ctx.fillText('CUSTOM / PHYSICS LAB',30,64);ctx.fillStyle='#a8f5d4';ctx.font='12px -apple-system,sans-serif';ctx.fillText(`${balls.length} balls · ${stats.wallCount} walls · ${rings.length} rings`,30,91);if(caption){ctx.fillStyle='#081120bb';ctx.fillRect(25,824,490,60);ctx.fillStyle='#effbff';ctx.textAlign='center';ctx.font='bold 23px -apple-system,sans-serif';ctx.fillText('One small change. A new outcome.',270,863,470)}ctx.restore();
 }
 return{draw,eventsBetween(a,b){seek(b);return eventLog.filter(e=>e.time>a&&e.time<=b)},stats,getState(){return snapshot()},config:JSON.parse(JSON.stringify(c)),buildStage:()=>JSON.parse(JSON.stringify(stage))};
}
