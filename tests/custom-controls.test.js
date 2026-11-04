import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CUSTOM,normalizeCustom,buildStage} from '../docs/custom-physics.js';
import {BUILTIN_CUSTOM_PRESETS,applyCustomPatch,parseCustomPresets,normalizeUserPreset,CUSTOM_PRESET_LIMIT} from '../docs/custom-controls.js';

test('ten named built-in presets contain actual valid and different settings',()=>{
 assert.deepEqual(BUILTIN_CUSTOM_PRESETS.map(p=>p.name),['シンプル','ボール大量','壁大量','多重リング','超高速','高反発','ボール増殖','ボール合体','ネオンASMR','カオスチャレンジ']);
 const presets=parseCustomPresets(BUILTIN_CUSTOM_PRESETS);assert.equal(presets.length,10);assert.equal(new Set(presets.map(p=>JSON.stringify(p.settings))).size,10);
 for(const preset of presets){const stage=buildStage(preset.settings);assert.equal(stage.balls.length,preset.settings.ballCount);assert.equal(stage.walls.length,preset.settings.wallCount);assert.ok(preset.settings.maxBalls<=200)}
});
test('layout-affecting edits invalidate manual arrangement; visual and physical edits preserve it',()=>{
 const base=normalizeCustom({...DEFAULT_CUSTOM,ballCount:2,wallCount:1});const stage=buildStage(base);const manual=normalizeCustom({...base,stage:{balls:stage.balls,walls:stage.walls,ringCenter:stage.ringCenter}});
 assert.ok(manual.stage);assert.equal(applyCustomPatch(manual,{ballColor:'#ffffff'}).stage.balls.length,2);assert.equal(applyCustomPatch(manual,{gravity:120}).stage.balls.length,2);
 assert.equal(applyCustomPatch(manual,{ballCount:3}).stage,undefined);assert.equal(applyCustomPatch(manual,{seed:111}).stage,undefined);assert.equal(applyCustomPatch(manual,{wallAngle:45}).stage,undefined);
 assert.deepEqual(applyCustomPatch(manual,{ballCount:2,stage:manual.stage},{preserveStage:true}).stage,manual.stage);
});
test('preset importer preserves manual degree headings and rejects invalid counts, stage lengths and secrets',()=>{
 const input={...DEFAULT_CUSTOM,ballCount:1,wallCount:1,stage:{balls:[{id:'b',x:100,y:200,heading:90}],walls:[{id:'w',x:270,y:400,length:120,angle:45}],ringCenter:{x:270,y:455}}};
 const preset=normalizeUserPreset({name:'Manual',settings:input});assert.equal(preset.settings.stage.balls[0].heading,90);assert.equal(preset.settings.stage.walls[0].angle,45);
 assert.throws(()=>normalizeUserPreset({settings:{...input,ballCount:2}}));assert.throws(()=>normalizeUserPreset({settings:{...input,ballCount:0}}));assert.throws(()=>normalizeUserPreset({settings:{...input,apiKey:'never-store-this'}}));assert.throws(()=>normalizeUserPreset({settings:{...input,ballMass:Infinity}}));
 assert.throws(()=>normalizeUserPreset({settings:{...DEFAULT_CUSTOM,ballSpeed:1501}}));
 assert.throws(()=>parseCustomPresets(Array.from({length:CUSTOM_PRESET_LIMIT+1},(_,i)=>({id:'p'+i,settings:DEFAULT_CUSTOM}))));
 assert.throws(()=>parseCustomPresets([{id:'same',settings:DEFAULT_CUSTOM},{id:'same',settings:DEFAULT_CUSTOM}]));
});

test('visible UI patch dependencies remain operative rather than silently inactive',()=>{
 const initial={...DEFAULT_CUSTOM,ballCount:1,maxBalls:5,ringsEnabled:false,ballCollisions:false,mergeBalls:false};
 const many=applyCustomPatch(initial,{ballCount:100});assert.equal(many.ballCount,100);assert.equal(many.maxBalls,100);
 assert.equal(applyCustomPatch(initial,{ringCount:6}).ringsEnabled,true);
 assert.equal(applyCustomPatch(initial,{mergeBalls:true}).ballCollisions,true);
 assert.equal(applyCustomPatch({...initial,ballCollisions:true,mergeBalls:true},{ballCollisions:false}).mergeBalls,false);
 assert.throws(()=>normalizeCustom({...initial,mergeBalls:true},{strict:true}));
});
