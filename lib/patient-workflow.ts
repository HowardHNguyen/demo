import {latest,validateObservation,type Patient,type Metric,type Observation} from './demo.ts';
import {riskError,RISK_VERSION,type RiskProfile,type PatientAssessment,type InputSource} from './risk.ts';
const lipids=['tc','hdl','ldl'];
export function normalized(o:Observation|undefined):number {if(!o)return NaN;if(lipids.includes(o.kind)){if(o.unit==='mmol/L')return o.value*38.67;if(o.unit==='mg/dL')return o.value;return NaN;}if(o.kind==='glucose'){if(o.unit==='mmol/L')return o.value*18.0182;if(o.unit==='mg/dL')return o.value;return NaN;}return o.value;}
export function profileFromPatient(p:Patient):RiskProfile {
 const w=latest(p,'weight');
 return {age:p.age,sex:p.sex,sbp:normalized(latest(p,'bp')),tc:normalized(latest(p,'tc')),hdl:normalized(latest(p,'hdl')),treated:p.riskFacts?.treated??null,smoker:p.smoking==='Current'?true:['Never','Former'].includes(p.smoking)?false:null,diabetes:p.conditions.some(c=>/^Type [12] diabetes$/i.test(c))?true:(p.riskFacts?.diabetes??null),cvd:p.conditions.some(c=>/prior mi|prior stroke|heart failure|coronary artery/i.test(c))?true:(p.riskFacts?.cvd??null),acute:p.acute,bmi:w?w.value/(p.height/100)**2:NaN,ldl:normalized(latest(p,'ldl')),glucose:normalized(latest(p,'glucose')),heartRate:normalized(latest(p,'heartRate'))};
}
export function inputSources(p:Patient):Record<string,InputSource>{const result:Record<string,InputSource>={};for(const kind of ['bp','tc','hdl'] as Metric[]){const o=latest(p,kind);if(o)result[kind]={id:o.id,date:o.date,source:o.source,reviewed:o.reviewed,value:o.value,unit:o.unit};}return result;}
export function staleInputs(p:Patient,today=new Date().toISOString().slice(0,10)):string[]{return Object.entries(inputSources(p)).filter(([,o])=>Date.parse(today)-Date.parse(o.date)>180*86400000).map(([k])=>k);}
export function recordChanges(p:Patient,draft:RiskProfile,date:string,role:string,newId:()=>string):Patient {
 const err=riskError(draft);if(err)throw new Error(err);
 const base=profileFromPatient(p);if(base.cvd===true&&draft.cvd!==true)throw new Error('An existing CVD history cannot be removed in the calculator. This primary-prevention equation is not eligible.');if(base.diabetes===true&&draft.diabetes!==true)throw new Error('An existing diabetes diagnosis cannot be removed in this calculator. Review the history with the care team.');const source=role==='patient'?'Home':'Clinic';const added:Observation[]=[];
 for(const [key,kind,unit] of [['sbp','bp','mmHg'],['tc','tc','mg/dL'],['hdl','hdl','mg/dL']] as const){
  if(!Number.isFinite(base[key])||Math.abs(draft[key]-base[key])>.005){
   const old=latest(p,kind);if(old&&date<old.date)throw new Error(`Use a date on or after the current ${kind} measurement (${old.date}), or add a historical observation from My Health.`);
   const second=kind==='bp'?latest(p,'bp')?.second:undefined;
   const problem=validateObservation(kind,draft[key],second,date);if(problem)throw new Error(problem);
   added.push({id:newId(),kind,value:draft[key],...(kind==='bp'?{second}:{}),unit,date,source,reviewed:false});
  }
 }
 const dateCheck=new Date(date+'T12:00:00Z');if(!Number.isFinite(+dateCheck)||dateCheck.toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10))throw new Error('Choose a valid date, not in the future.');
 const facts={treated:draft.treated,diabetes:draft.diabetes,cvd:draft.cvd};
 const changed=base.age!==draft.age||base.sex!==draft.sex||base.smoker!==draft.smoker||base.treated!==draft.treated||base.diabetes!==draft.diabetes||base.cvd!==draft.cvd;
 return {...p,age:draft.age,sex:draft.sex,smoking:draft.smoker?'Current':p.smoking==='Former'?'Former':'Never',riskFacts:facts,observations:[...p.observations,...added],historyChanges:changed?[...(p.historyChanges||[]),{date,source:role==='patient'?'Patient reported':'Clinician entered',before:{age:base.age,sex:base.sex,smoker:base.smoker,...p.riskFacts},after:{age:draft.age,sex:draft.sex,smoker:draft.smoker,...facts}}]:p.historyChanges};
}
export function makeAssessment(p:Patient,profile:RiskProfile,kind:'assessment'|'scenario',role:string,id:string,date:string,linkedAssessmentId?:string):PatientAssessment {
 const err=riskError(profile);if(err)throw new Error(err);
 return {id,date,patientId:p.id,kind,profile:{...profile},version:RISK_VERSION,sources:inputSources(p),savedBy:role,linkedAssessmentId,...(kind==='scenario'?{baselineProfile:profileFromPatient(p)}:{})};
}
export function patientHistory(p:Patient,kind:'assessment'|'scenario'){return (p.riskHistory||[]).filter(a=>a.patientId===p.id&&a.kind===kind&&a.version===RISK_VERSION&&!riskError(a.profile)).sort((a,b)=>a.date.localeCompare(b.date));}
