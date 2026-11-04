import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CUSTOM,normalizeCustom,buildStage,createCustomScene,templateCustomDefaults} from '../docs/custom-physics.js';
function ctx(){const gradient={addColorStop(){}};return new Proxy({}, {get(o,k){if(k in o)return o[k];return(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),'finite '+String(k));return String(k).startsWith('create')?gradient:undefined}},set(o,k,v){if(typeof v==='number')assert.ok(Number.isFinite(v),'finite '+String(k));o[k]=v;return true}})}
const draw=(scene,t)=>scene.draw(ctx(),360,640,t,1/24,false);
const simple=extra=>({...DEFAULT_CUSTOM,ballCount:1,wallCount:0,ringsEnabled:false,gravity:0,airDrag:0,friction:0,ballCollisions:false,glow:0,...extra});
test('first six controls use exact counts and finite deterministic stage objects',()=>{
 for(const ballCount of [1,10,100,200])for(const wallCount of [0,1,20,100]){
  const c=normalizeCustom({ballCount,wallCount,maxBalls:500}),s=buildStage(c);assert.equal(s.balls.length,ballCount);assert.equal(s.walls.length,wallCount);assert.deepEqual(s,buildStage(c));
  const scene=createCustomScene(c);assert.equal(scene.getState().balls.length,ballCount);assert.equal(scene.stats.initialWallCount,wallCount);
 }
 for(const ringCount of [1,10,30]){const scene=createCustomScene({ringCount,ringSpacing:100});assert.equal(scene.getState().rings.length,ringCount);assert.ok(scene.getState().rings.every(r=>r.radius<=220&&r.radius>=8));if(ringCount>1)assert.ok(scene.stats.warnings.length)}
 for(const bad of [{ballCount:0},{ballCount:201},{wallCount:101},{ringCount:0},{ringCount:31},{ballCount:1.5},{seed:-1},{maxBalls:501},{ballCount:20,maxBalls:10}])assert.throws(()=>normalizeCustom(bad));
});
test('gravity and ball speed change motion; restitution changes boundary bounce',()=>{
 const a=createCustomScene(simple({ballSpeed:0,gravity:0})),b=createCustomScene(simple({ballSpeed:0,gravity:300}));draw(a,.5);draw(b,.5);assert.ok(b.getState().balls[0].y>a.getState().balls[0].y+20);
 const stage={balls:[{id:'one',x:300,y:400,heading:0}]};const slow=createCustomScene(simple({stage,ballSpeed:50})),fast=createCustomScene(simple({stage,ballSpeed:150}));draw(slow,.25);draw(fast,.25);assert.ok(fast.getState().balls[0].x>slow.getState().balls[0].x+20);
 const bounce=e=>{const scene=createCustomScene(simple({stage:{balls:[{id:'one',x:495,y:400,heading:0}]},ballSpeed:200,restitution:e}));draw(scene,.1);return scene.getState().balls[0].vx};assert.ok(Math.abs(bounce(1))>Math.abs(bounce(.3))*2);
});
test('range validation, null stage, color safety and exact manual snapshots',()=>{
 assert.equal(normalizeCustom({ballSize:100}).ballSize,50);assert.throws(()=>normalizeCustom({ballSize:100},{strict:true}));assert.ok(!normalizeCustom({stage:null}).stage);
 for(const bad of [{gravity:NaN},{ballColor:'red'},{ringColors:[]},{accuracy:'extreme'},{ballCollisions:'false'},{stage:{balls:[]}}])assert.throws(()=>normalizeCustom(bad));
 const c=normalizeCustom(simple({ballCount:2,stage:{balls:[{id:'a',x:200,y:300,heading:45},{id:'b',x:350,y:400,heading:180}]}}));assert.deepEqual(buildStage(c).balls,c.stage.balls);assert.equal(normalizeCustom({ballColor:'#abc'}).ballColor,'#aabbcc');
});
test('absolute-time solver is independent of draw FPS and redraws',()=>{
 const settings={...DEFAULT_CUSTOM,ballCount:12,wallCount:8,ringCount:4,seed:42,multiplyOnHit:true,maxBalls:40,simulationSpeed:1.4};
 const a=createCustomScene(settings),b=createCustomScene(settings);draw(a,0);for(let i=1;i<=60;i++)draw(a,i/60);for(let i=1;i<=24;i++)draw(b,i/24);assert.deepEqual(a.getState(),b.getState());const state=a.getState();draw(a,1);assert.deepEqual(a.getState(),state);draw(a,0);draw(a,1);assert.deepEqual(a.getState(),state);
});
test('mass affects impulses and damage but not gravitational acceleration',()=>{
 const stage={balls:[{id:'one',x:270,y:300,heading:90}],walls:[{id:'wall',x:270,y:390,length:200,angle:0}]};
 const light=createCustomScene(simple({wallCount:1,ballMass:.1,ballSpeed:300,breakWalls:true,stage})),heavy=createCustomScene(simple({wallCount:1,ballMass:10,ballSpeed:300,breakWalls:true,stage}));draw(light,.4);draw(heavy,.4);assert.ok(heavy.stats.brokenWallCount>light.stats.brokenWallCount);
 const a=createCustomScene(simple({ballSpeed:0,ballMass:.1,gravity:200})),b=createCustomScene(simple({ballSpeed:0,ballMass:10,gravity:200}));draw(a,.3);draw(b,.3);assert.equal(a.getState().balls[0].y,b.getState().balls[0].y);
});
test('merging conserves total mass and momentum; multiplication respects cap',()=>{
 const stage={balls:[{id:'a',x:250,y:400,heading:0},{id:'b',x:270,y:400,heading:180}]};const merged=createCustomScene(simple({ballCount:2,ballCollisions:true,mergeBalls:true,ballMass:2,ballSpeed:100,stage}));draw(merged,.02);const state=merged.getState();assert.equal(state.balls.length,1);assert.equal(state.balls[0].mass,4);assert.ok(Math.abs(state.balls[0].vx)<1e-8);
 const multiply=createCustomScene(simple({stage:{balls:[{id:'a',x:495,y:400,heading:0}]},ballSpeed:500,multiplyOnHit:true,multiplyCount:10,maxBalls:12}));draw(multiply,.5);assert.ok(multiply.stats.ballCount>1&&multiply.stats.ballCount<=12);assert.ok(multiply.stats.spawnedCount>0);
});
test('ring gap passage produces event while solid arc reflects',()=>{
 const base=simple({ringsEnabled:true,ringCount:1,ringRadius:100,ringThickness:5,gapPosition:0,gapWidth:90,ringRotation:0,ballSize:5,ballSpeed:120,stage:{balls:[{id:'a',x:350,y:455,heading:0}],ringCenter:{x:270,y:455}}});
 const open=createCustomScene(base),closed=createCustomScene({...base,gapWidth:0});draw(open,.3);draw(closed,.3);assert.ok(open.getState().balls[0].x>370);assert.ok(closed.getState().balls[0].vx<0);assert.ok(open.eventsBetween(0,.3).some(e=>e.kind==='cross'));
});
test('wall rotation/movement, ring direction and simulation speed affect state',()=>{
 const a=createCustomScene({...DEFAULT_CUSTOM,wallRotation:30,wallMoveSpeed:50,ringRotation:40,ringDirection:'alternate'});draw(a,.5);const s=a.getState();assert.notEqual(s.walls[0].angle,buildStage(DEFAULT_CUSTOM).walls[0].angle);assert.notEqual(s.walls[0].y,buildStage(DEFAULT_CUSTOM).walls[0].y);assert.notEqual(s.rings[0].angle,s.rings[1].angle);
 const b=createCustomScene(simple({ballSpeed:30,simulationSpeed:2}));draw(b,.5);assert.equal(b.stats.steps,120);
});
test('spatial hash, trails and event history stay bounded at supported limits',()=>{
 const scene=createCustomScene({...DEFAULT_CUSTOM,ballCount:200,maxBalls:500,wallCount:100,ringCount:30,ballSize:2,trailLength:80,accuracy:'low',quality:'low'});draw(scene,.1);const s=scene.getState();assert.equal(s.balls.length,200);assert.equal(s.walls.length,100);assert.equal(s.rings.length,30);assert.ok(scene.stats.pairChecks<200*199/2*scene.stats.steps);assert.ok(scene.stats.estimatedBytes<3e6);assert.ok(scene.eventsBetween(-1,.1).length<=1024);
 for(const state of s.balls)for(const key of ['x','y','vx','vy','mass'])assert.ok(Number.isFinite(state[key]));
});
test('15 existing profiles and viral fallback initialize without changing other modules',()=>{
 const ids=['ring-escape','maze','funnel','race','multiplication','spiral','magnetic','sorting','paddles','gap','elastic','orbit','survival','chain-bounce','timing'];for(const id of ids){const c=templateCustomDefaults('phy-'+id,10);assert.equal(c.seed,10);assert.ok(createCustomScene(c).getState().balls.length)}assert.equal(templateCustomDefaults('viral-ring-escape',10).wallCount,0);
});

test('visual settings do not change the deterministic physical trajectory',()=>{
 const base=simple({ballCount:2,ballSpeed:400,multiplyOnHit:true,maxBalls:20,stage:{balls:[{id:'a',x:495,y:350,heading:0},{id:'b',x:200,y:450,heading:180}]}});
 const a=createCustomScene({...base,colorMode:'single',quality:'low',collisionEffect:'none',trailLength:0}),b=createCustomScene({...base,colorMode:'random',quality:'high',collisionEffect:'spark',trailLength:80});draw(a,.7);draw(b,.7);
 const physical=s=>s.getState().balls.map(({id,x,y,vx,vy,mass,radius})=>({id,x,y,vx,vy,mass,radius}));assert.deepEqual(physical(a),physical(b));
});

test('ring event none/spark/color/multiply have distinct actual outcomes',()=>{
 const base=simple({ringsEnabled:true,ringCount:1,ringRadius:100,ringRotation:0,ringThickness:5,gapWidth:90,gapPosition:0,ballSize:5,ballSpeed:120,collisionEffect:'none',stage:{balls:[{id:'a',x:350,y:455,heading:0}],ringCenter:{x:270,y:455}},colorMode:'single',ballColor:'#ffffff'});
 const make=ringEvent=>{const s=createCustomScene({...base,ringEvent});draw(s,.3);return s};const none=make('none'),spark=make('spark'),colored=make('color'),multi=make('multiply');
 assert.equal(none.stats.effectCount,0);assert.ok(spark.stats.effectCount>0);assert.notEqual(colored.getState().balls[0].color,'#ffffff');assert.ok(multi.stats.ballCount>1);
});

test('generated wall angles preserve orientation when normalized as manual snapshots',()=>{
 for(const wallAngle of [-180,180])for(const wallArrangement of ['even','random']){
  const config=normalizeCustom({...DEFAULT_CUSTOM,wallCount:100,wallAngle,wallArrangement,seed:11});const stage=buildStage(config);
  assert.ok(stage.walls.every(w=>w.angle>=-180&&w.angle<=180));
  const imported=normalizeCustom({...config,stage},{strict:true});assert.deepEqual(imported.stage.walls,stage.walls);
 }
});

test('VIRAL custom profiles load meaningful matching initial counts while dedicated rules stay separate',()=>{
 assert.equal(templateCustomDefaults('viral-oneexit').ballCount,100);assert.equal(templateCustomDefaults('viral-oneexit').ringCount,1);
 assert.equal(templateCustomDefaults('viral-fusion').ballCount,10);assert.equal(templateCustomDefaults('viral-fusion').mergeBalls,true);
 assert.equal(templateCustomDefaults('viral-reverse').gravityDirection,-90);assert.equal(templateCustomDefaults('viral-split').ringEvent,'multiply');
 assert.equal(templateCustomDefaults('viral-center').stage.balls[0].x,475);
});
