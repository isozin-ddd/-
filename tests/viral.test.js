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
