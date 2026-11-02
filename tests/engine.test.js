import test from 'node:test';
import assert from 'node:assert/strict';
import {capability,pickTypes,rng,GENRES,WIDTHS} from '../docs/engine.js';
const env={isSecureContext:true,HTMLCanvasElement:{prototype:{captureStream(){}}},MediaRecorder:{isTypeSupported:type=>type==='video/mp4'}};
test('MP4 capability failures have explicit reasons',()=>{
 assert.equal(capability(env),'');
 assert.match(capability({...env,isSecureContext:false}),/HTTPS/);
 assert.match(capability({...env,MediaRecorder:null}),/MediaRecorder/);
 assert.match(capability({...env,HTMLCanvasElement:{prototype:{}}}),/Canvas/);
 assert.match(capability({...env,MediaRecorder:{isTypeSupported:t=>t==='video/webm'}}),/MP4録画に対応していません/);
 assert.deepEqual(pickTypes({isTypeSupported:()=>{throw Error('codec error')}}),[]);
});
test('MP4 candidates never silently select WebM',()=>{
 const all=pickTypes({isTypeSupported:()=>true});assert.ok(all.length);assert.ok(all.every(t=>t.startsWith('video/mp4')));
 assert.deepEqual(pickTypes(env.MediaRecorder),['video/mp4']);
});
test('Seeds produce reproducible, distinct patterns',()=>{
 const a=rng(42),b=rng(42),c=rng(43);const aa=Array.from({length:20},a),bb=Array.from({length:20},b),cc=Array.from({length:20},c);
 assert.deepEqual(aa,bb);assert.notDeepEqual(aa,cc);assert.ok(aa.every(n=>n>=0&&n<1));
});
test('All resolution presets preserve exact 9:16 pixels',()=>{
 assert.equal(GENRES.length,4);for(const w of WIDTHS){assert.ok(Number.isInteger(w*16/9));assert.equal(w/(w*16/9),9/16)}
});
