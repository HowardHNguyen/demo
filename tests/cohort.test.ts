import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {type Patient,latest} from '../lib/demo.ts';
import {profileFromPatient} from '../lib/patient-workflow.ts';
import {riskPercent} from '../lib/risk.ts';
const read=(s:string)=>readFileSync(new URL('../public/'+s,import.meta.url),'utf8');
test('Full cohort has 5,000 unique 54-column baselines, correct partitions and no outcome leakage',()=>{
 const index=JSON.parse(read('cohort/index.json'));const schema=JSON.parse(read('research/schema.json'));const report=JSON.parse(read('research/evaluation.json'));const ids=new Set<string>();let observations=0;
 assert.equal(index.length,5000);assert.equal(schema.length,54);const keys=schema.map((s:{name:string})=>s.name).sort();
 for(let shard=0;shard<100;shard++)for(const p of JSON.parse(read(`cohort/patients-${String(shard).padStart(3,'0')}.json`)) as Patient[]){
  assert.ok(!ids.has(p.id));ids.add(p.id);assert.deepEqual(Object.keys(p.attributes!).sort(),keys);assert.equal(p.attributes!.PATIENT_ID,p.id);assert.ok(!('SIMULATED_CVD_EVENT_10Y' in p));assert.ok(!('SIMULATED_CVD_EVENT_10Y' in p.attributes!));
  for(const o of p.observations){assert.ok(o.date<='2026-09-01');assert.ok(Number.isFinite(o.value));if(o.kind==='bp')assert.ok(o.value>o.second!);}observations+=p.observations.length;
  if(p.attributes!.TOTCHOL!==null)assert.ok(Number(p.attributes!.TOTCHOL)>=2.6&&Number(p.attributes!.TOTCHOL)<=13);
  if(p.attributes!.TOTCHOL===null){assert.equal(latest(p,'tc'),undefined);assert.equal(riskPercent(profileFromPatient(p)),null);}
  if(p.attributes!.CKD_DX===0)assert.equal(p.attributes!.CKD_STAGE,null);
 }
 assert.equal(ids.size,5000);assert.equal(observations,report.observations);
 const splitLines=read('research/splits.csv').trim().split(/\r?\n/).slice(1);const counts:Record<string,number>={};const splitIds=new Set<string>();
 for(const line of splitLines){const [id,split]=line.split(',');assert.ok(ids.has(id));assert.ok(!splitIds.has(id));splitIds.add(id);counts[split]=(counts[split]||0)+1;}
 assert.deepEqual(counts,{training:3000,validation:1000,test:1000});assert.equal(splitIds.size,5000);
 assert.equal(report.features.length,53);assert.ok(!report.features.includes('PATIENT_ID'));
 const c=report.test.confusion;assert.equal(c.tp+c.tn+c.fp+c.fn,1000);assert.equal(c.tp+c.fn,report.test.events);assert.equal((c.tp+c.tn)/1000,report.test.accuracy);
});
