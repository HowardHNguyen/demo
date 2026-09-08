import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedPatients,latest,type Patient} from '../lib/demo.ts';
import {riskPercent,riskError} from '../lib/risk.ts';
import {profileFromPatient,normalized,recordChanges,makeAssessment,patientHistory,staleInputs} from '../lib/patient-workflow.ts';
const shard:Patient[]=JSON.parse(readFileSync(new URL('../public/cohort/patients-000.json',import.meta.url),'utf8'));
const fixture=shard.find(p=>riskError(profileFromPatient(p))===null)!;
assert.ok(fixture);
let serial=0;const id=()=>`unit-${++serial}`;
test('Patient adapter converts original lipids while preserving raw values and missing history',()=>{
 const p=profileFromPatient(fixture);assert.equal(p.tc,latest(fixture,'tc')!.value*38.67);
 assert.equal(latest(fixture,'tc')!.unit,'mmol/L');assert.equal(p.sbp,latest(fixture,'bp')!.value);
 const legacy=profileFromPatient(seedPatients()[0]);assert.ok(Number.isNaN(legacy.tc));assert.equal(legacy.treated,null);assert.equal(riskPercent(legacy),null);
 assert.ok(Number.isNaN(normalized({...latest(fixture,'tc')!,unit:'unknown'})));
});
test('New reported measurements append, flow back to the calculator and leave baseline untouched',()=>{
 const before=JSON.stringify(fixture);const draft={...profileFromPatient(fixture),tc:200};const changed=recordChanges(fixture,draft,'2026-09-02','patient',id);
 assert.equal(JSON.stringify(fixture),before);assert.equal(latest(changed,'tc')!.value,200);assert.equal(latest(changed,'tc')!.source,'Home');assert.equal(latest(changed,'tc')!.reviewed,false);assert.equal(profileFromPatient(changed).tc,200);
 assert.deepEqual(changed.attributes,fixture.attributes);assert.equal(changed.observations.length,fixture.observations.length+1);
});
test('Patient-specific snapshots are immutable and scenarios cannot enter the recorded history',()=>{
 const profile=profileFromPatient(fixture);const snapshot=makeAssessment(fixture,profile,'assessment','patient','a','2026-09-02T10:00:00Z');const scenario=makeAssessment(fixture,{...profile,sbp:120},'scenario','patient','b','2026-09-02T10:01:00Z');
 const p={...fixture,riskHistory:[snapshot,scenario,{...snapshot,id:'foreign',patientId:'OTHER'}]};assert.equal(patientHistory(p,'assessment').length,1);assert.equal(patientHistory(p,'scenario').length,1);
 const later=recordChanges(p,{...profile,tc:205},'2026-09-03','clinician',id);assert.equal(snapshot.profile.tc,profile.tc);assert.equal(scenario.baselineProfile!.sbp,profile.sbp);assert.notEqual(profileFromPatient(later).tc,snapshot.profile.tc);
 assert.equal(latest(p,'bp')!.value,profile.sbp);
});
test('Backdated, future and contradictory BP updates are rejected',()=>{
 const p=profileFromPatient(fixture);assert.throws(()=>recordChanges(fixture,{...p,tc:200},'2026-08-01','patient',id),/on or after/);
 assert.throws(()=>recordChanges(fixture,{...p,tc:200},'2099-01-01','patient',id));
 const bad={...fixture,observations:fixture.observations.map(o=>o.kind==='bp'?{...o,second:110}:o)};assert.throws(()=>recordChanges(bad,{...profileFromPatient(bad),sbp:100},'2026-09-02','patient',id),/Diastolic/);
});
test('Existing cardiovascular history cannot be negated by calculator inputs',()=>{
 const p={...fixture,conditions:['Prior MI'],riskFacts:{treated:false,diabetes:false,cvd:false}};assert.equal(profileFromPatient(p).cvd,true);
 assert.throws(()=>recordChanges(p,{...profileFromPatient(fixture),cvd:false},'2026-09-02','patient',id),/cannot be removed/);
});
test('Freshness flags inspect measurement dates, without substituting values',()=>{
 assert.equal(staleInputs(fixture,'2026-09-08').length,0);assert.equal(staleInputs(fixture,'2027-09-08').length,3);
});
