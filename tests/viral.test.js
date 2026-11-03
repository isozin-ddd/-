import test from 'node:test';
import assert from 'node:assert/strict';
import {World,create,templates} from '../docs/scenes/viral.js';
test('representative stages produce earned success and honest timeouts',()=>{
 for(const [mode,seed] of [['escape',2],['multiply',42],['center',10]]){const w=new World(mode,seed,15);w.advance(15);assert.ok(w.won,mode);assert.ok(w.events.some(e=>e.type==='goal'));}
 const w=new World('center',42,15);w.advance(15);assert.match(w.outcome,/TIME UP/);assert.ok(!w.won);
});
test('fixed-step results independent of display frame rate',()=>{for(const t of templates){const a=new World(t.mode,73,30),b=new World(t.mode,73,30);a.advance(30);for(let i=0;i<=900;i++)b.advance(i/30);assert.deepEqual(a.balls,b.balls);assert.deepEqual(a.events,b.events);}});
test('long sequences remain finite with bounded population and effect buffers',()=>{for(const mode of ['escape','center','multiply'])for(const seed of [0,1,10,4294967295]){const w=new World(mode,seed,90);w.advance(90);assert.equal(w.chapter,3);assert.ok(w.balls.length<=32);assert.ok(w.particles.length<=100);assert.ok(w.events.length<=400);assert.ok(w.balls.every(b=>Number.isFinite(b.x+b.y+b.vx+b.vy)));}});
test('different seeds yield different motion, and audio follows collisions',()=>{const a=new World('escape',2),b=new World('escape',4);a.advance(5);b.advance(5);assert.notDeepEqual(a.balls,b.balls);assert.ok(a.events.every(e=>e.time<=5&&e.intensity<=1&&e.pitch>0));});
test('20 templates have distinct mechanism IDs and achievable goals',()=>{
 assert.equal(templates.length,20);assert.equal(new Set(templates.map(t=>t.mode)).size,20);
 const seeds={escape:2,multiply:42,center:10,last:1,color:1,spiral:1,gravity:1,fusion:1,destroy:1,timing:2,oneexit:1,magnetic:1,shrink:2,reverse:1,race:1,chain:1,split:1,impossible:28,transform:2,ultimate:12};
 for(const t of templates){const w=new World(t.mode,seeds[t.mode],15);w.advance(15);assert.ok(w.won,t.id);assert.ok(w.balls.length<=w.maxBalls);assert.ok(w.balls.every(b=>Number.isFinite(b.x+b.y+b.r)),t.id);}
});
test('fusion conserves ball area; survival removes actual bodies',()=>{const f=new World('fusion',1,15),area=f.balls.reduce((s,b)=>s+b.r*b.r,0);f.advance(15);assert.equal(f.balls.length,1);assert.ok(Math.abs(f.balls[0].r**2-area)<1e-8);const w=new World('last',1,15);w.advance(15);assert.equal(w.balls.length,1);assert.equal(w.eliminated,11);});
test('long clips introduce different mechanisms rather than repeat the opening',()=>{const w=new World('center',10,90);assert.equal(w.mode,'center');w.advance(24);assert.equal(w.mode,'gravity');w.advance(46);assert.equal(w.mode,'fusion');w.advance(69);assert.equal(w.mode,'ultimate');});
test('ultimate passage creates exactly one bonus ring',()=>{const w=new World('ultimate',12,15);const initial=w.rings.length;w.advance(15);assert.ok(w.won);assert.equal(w.rings.length,initial+1);assert.equal(w.extraRing,true);});
