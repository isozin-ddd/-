import assert from 'node:assert/strict';
import {ARCHETYPES,designBatch,makeDesign,validateDesign,performanceChoice,extractPrinciples,hash} from '../docs/remix/design.js';
import {normalizeRemixReference,popularityStatus} from '../docs/remix/references.js';
import {freezeRecordingSettings} from '../docs/engine.js';
const ref={reference_id:'R1',original_url:'https://www.instagram.com/reel/example/',principles:['merge','escape']};
const ten=designBatch(ref,{seed:123,duration:15},10);
assert.equal(ten.length,10);for(const key of ['layout','rule','ending'])assert.equal(new Set(ten.map(d=>d[key])).size,10,key);
assert.equal(new Set(ten.map(d=>d.structuralFingerprint)).size,10);assert.deepEqual(ten,designBatch(ref,{seed:123,duration:15},10));
ten.forEach(d=>assert.equal(validateDesign(d).structuralFingerprint,d.structuralFingerprint));assert.equal(ten[0].source_reference_id,'R1');assert.equal(extractPrinciples(ref).method,'manual_tags_to_rules');
for(const n of [1,5,10,20,50,100]){const batch=designBatch(ref,{seed:1,duration:61,ballCount:500,wallCount:100,ringCount:30},n);assert.equal(batch.length,n);assert.equal(new Set(batch.map(d=>d.id)).size,n);batch.forEach(d=>{validateDesign(d);assert.equal(d.custom.ballCount,200);assert.equal(d.custom.maxBalls,500);assert.ok(d.timeline.length>=8);assert.ok(d.limits.reason)})}
for(const duration of [15,30,61,75,90]){const d=makeDesign(ARCHETYPES[0],{duration});const frozen=freezeRecordingSettings({genre:'viral',seed:d.seed,width:360,duration,remixDesign:d,sfx:true,bgm:'off'});assert.ok(Object.isFrozen(frozen.remixDesign.custom.stage.balls));d.custom.ballCount=1;assert.notEqual(frozen.remixDesign.custom.ballCount,1)}
assert.throws(()=>validateDesign({...ten[0],rule:'untrusted'}));assert.throws(()=>makeDesign(ARCHETYPES[0],{wallCount:101}));assert.throws(()=>designBatch(ref,{},101));
const candidate=normalizeRemixReference({...ref,genre:'ball',views:1000001,numeric_evidence_source:'secondary_report',verification_status:'secondary_verified'});assert.equal(popularityStatus(candidate).direct_verified,false);assert.equal(popularityStatus(candidate).threshold_reported,true);assert.throws(()=>normalizeRemixReference({...ref,original_url:'javascript:alert(1)'}));assert.throws(()=>normalizeRemixReference({...ref,verification_status:'direct_verified',numeric_evidence_source:'original'}));
const records=[1,2,3].map(i=>({template_id:'remix-iris',duration:15,completion_rate:90}));let explore=0;for(let i=0;i<1000;i++){const p=performanceChoice(ARCHETYPES,records,i,15);if(p.method==='exploration')explore++;else assert.equal(p.archetype.id,'iris')}assert.ok(explore>250&&explore<350,explore);
assert.notEqual(hash(ten[0]),hash(ten[1]));
