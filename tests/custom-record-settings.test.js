import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT_CUSTOM,createCustomScene} from '../docs/custom-physics.js';
import {freezeRecordingSettings,simulationDigest} from '../docs/engine.js';
test('recording captures a deeply immutable independent settings snapshot',()=>{
 const input={genre:'ball',templateId:'phy-ring-escape',seed:42,duration:3,width:360,customSettings:{...DEFAULT_CUSTOM,seed:42,ballCount:100,wallCount:30,ringCount:6}};
 const frozen=freezeRecordingSettings(input);input.customSettings.ballCount=1;input.seed=99;assert.equal(frozen.customSettings.ballCount,100);assert.equal(frozen.seed,42);assert.ok(Object.isFrozen(frozen));assert.ok(Object.isFrozen(frozen.customSettings));assert.ok(Object.isFrozen(frozen.customSettings.ringColors));assert.throws(()=>{frozen.customSettings.ringColors.push('#ffffff')});
 assert.throws(()=>freezeRecordingSettings({...input,seed:99}));assert.throws(()=>freezeRecordingSettings({...frozen,duration:90}));
});
test('custom snapshot serialization keeps reproducible geometry and physics',()=>{
 const input={...DEFAULT_CUSTOM,seed:12,ballCount:10,wallCount:5,ringCount:4};const a=createCustomScene(input),b=createCustomScene(JSON.parse(JSON.stringify(input)));a.eventsBetween(0,1);b.eventsBetween(0,1);assert.equal(simulationDigest(a.getState()),simulationDigest(b.getState()));
});
