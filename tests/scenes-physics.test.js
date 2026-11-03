import test from 'node:test';
import assert from 'node:assert/strict';
import * as physics from '../docs/scenes/physics.js';
import * as chain from '../docs/scenes/chain.js';
function context(){
 const numbers=[],gradient={addColorStop(offset,color){assert.ok(offset>=0&&offset<=1);assert.equal(typeof color,'string')}};
 const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];return (...args)=>{for(const value of args)if(typeof value==='number'){assert.ok(Number.isFinite(value),String(key)+' must receive finite values');numbers.push(value)}return String(key).startsWith('create')?gradient:undefined}},set(target,key,value){if(typeof value==='number')assert.ok(Number.isFinite(value));target[key]=value;return true}});return {ctx,numbers};
}
test('30 physics and chain templates have distinct ids, motions and bounded drawing',()=>{
 assert.equal(physics.templates.length,15);assert.equal(chain.templates.length,15);
 const all=[...physics.templates,...chain.templates];assert.equal(new Set(all.map(t=>t.id)).size,30);assert.equal(new Set(all.map(t=>t.motion)).size,30);
 for(const module of [physics,chain])for(const meta of module.templates)for(const duration of [3,6,15]){
  const scene=module.create(meta.id,20261103,{duration});const {ctx}=context();
  for(const t of [0,.5,duration*.5,duration-.01,duration])scene.draw(ctx,360,640,t,1/24,true);
  const events=scene.eventsBetween(-.001,duration);assert.ok(events.every(e=>Number.isFinite(e.time)&&e.time>=0&&e.time<=duration&&e.intensity>0&&Number.isFinite(e.pitch)),meta.id);
  assert.ok(events.length<=180,meta.id+' bounded sound event count');
  if(module===physics){assert.ok(scene.stats.bodyCount<=18);const b=scene.stats.trajectoryBounds;assert.ok(b.minX>=5&&b.maxX<=535&&b.minY>=110&&b.maxY<=790,meta.id+' physical trajectories stay in safe stage bounds: '+JSON.stringify(b))}
  else assert.ok(scene.stats.particleCount<=48);
 }
});
test('Seeds alter actual geometric trajectories or layout, beyond color strings',()=>{
 for(const module of [physics,chain])for(const meta of module.templates){
  const a=context(),b=context();module.create(meta.id,1,{duration:6}).draw(a.ctx,540,960,2.1,1/24,false);module.create(meta.id,2,{duration:6}).draw(b.ctx,540,960,2.1,1/24,false);
  // Physics trajectories and chain route / composition geometry must change too.
  assert.notDeepEqual(a.numbers,b.numbers,meta.id+' numerical geometry should vary');
 }
});
