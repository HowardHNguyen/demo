import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAMPLE,RISK_VERSION,riskPercent,riskError,comparisons,validAssessment,exampleHistory} from '../lib/risk.ts';

test('Male and female reference profiles match independently calculated published-formula values',()=>{
 assert.ok(Math.abs(riskPercent(EXAMPLE)!-33.185607394121874)<1e-9);
 assert.ok(Math.abs(riskPercent({...EXAMPLE,sex:'Female'})!-18.570709589740865)<1e-9);
});
test('Eligibility excludes established CVD, acute illness and ages outside 30–74',()=>{
 for(const patch of [{age:29},{age:75},{age:NaN},{cvd:true},{acute:true}])assert.equal(riskPercent({...EXAMPLE,...patch}),null);
 for(const age of [30,74])assert.notEqual(riskPercent({...EXAMPLE,age}),null);
});
test('Invalid inputs do not silently become defaults or plausible risk estimates',()=>{
 for(const patch of [{sbp:0},{tc:NaN},{hdl:Infinity},{hdl:100,tc:100},{sbp:201}])assert.equal(riskPercent({...EXAMPLE,...patch}),null);
 assert.ok(riskError({...EXAMPLE,age:29}));
});
test('Context-only factors never claim predictive influence',()=>{
 assert.equal(riskPercent({...EXAMPLE,bmi:35,ldl:180,glucose:190,heartRate:100}),riskPercent(EXAMPLE));
});
test('What-if changes are deterministic, preserve baseline, and agree with recalculation',()=>{
 const before=JSON.stringify(EXAMPLE);const rows=comparisons(EXAMPLE);
 assert.equal(rows.length,4);
 for(const r of rows){assert.equal(r.value,riskPercent({...EXAMPLE,...r.patch}));assert.ok(r.delta<=0);}
 assert.equal(JSON.stringify(EXAMPLE),before);
 assert.equal(comparisons({...EXAMPLE,smoker:false}).find(x=>x.label==='Not currently smoking')!.delta,0);
});
test('Stored assessments reject malformed data and incompatible method versions',()=>{
 for(const a of exampleHistory())assert.ok(validAssessment(a));
 assert.equal(validAssessment({profile:EXAMPLE}),false);
 assert.equal(validAssessment({...exampleHistory()[0],version:'different-model'}),false);
 assert.equal(validAssessment({...exampleHistory()[0],date:'invalid'}),false);
 assert.equal(validAssessment({...exampleHistory()[0],profile:{...EXAMPLE,cvd:true}}),false);
 assert.equal(exampleHistory()[0].version,RISK_VERSION);
});
