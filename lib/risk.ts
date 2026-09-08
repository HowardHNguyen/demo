/** Framingham 2008 general CVD, lipid model. No local fitting or calibration.
 * https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/
 */
export const RISK_VERSION='FHS-2008-lipids-v1';
export const RISK_SOURCE='https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/';
export type RiskProfile={age:number;sex:'Female'|'Male';sbp:number;tc:number;hdl:number;treated:boolean;smoker:boolean;diabetes:boolean;cvd:boolean;acute:boolean;bmi:number;ldl:number;glucose:number;heartRate:number};
export const EXAMPLE:RiskProfile={age:55,sex:'Male',sbp:144,tc:210,hdl:50,treated:true,smoker:true,diabetes:false,cvd:false,acute:false,bmi:27,ldl:120,glucose:90,heartRate:70};
export function riskError(p:RiskProfile):string|null {
 if(!p||!['Female','Male'].includes(p.sex))return 'Select the sex used by the published equation.';
 for(const k of ['treated','smoker','diabetes','cvd','acute'] as const)if(typeof p[k]!=='boolean')return 'Complete the medical history fields.';
 if(p.cvd)return 'No estimate: this primary-prevention equation excludes established cardiovascular disease, including prior heart attack, stroke or heart failure.';
 if(p.acute)return 'No estimate during an acute illness. This demonstration requires a stable baseline.';
 if(!Number.isInteger(p.age)||p.age<30||p.age>74)return 'This equation applies to ages 30–74 only.';
 for(const [key,min,max] of [['sbp',90,200],['tc',100,400],['hdl',20,100],['bmi',15,60],['ldl',20,350],['glucose',40,400],['heartRate',40,180]] as const){if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)return `Check ${key}: enter a value from ${min} to ${max}. These are demo input bounds, not normal ranges.`;}
 if(p.hdl>=p.tc)return 'HDL must be below total cholesterol.';
 return null;
}
export function riskPercent(p:RiskProfile):number|null {
 if(riskError(p))return null;
 const male=p.sex==='Male';
 const c=male?[3.06117,1.12370,-.93263,p.treated?1.99881:1.93303,.65451,.57367,23.9802,.88936]:[2.32888,1.20904,-.70833,p.treated?2.82263:2.76157,.52873,.69154,26.1931,.95012];
 const sum=c[0]*Math.log(p.age)+c[1]*Math.log(p.tc)+c[2]*Math.log(p.hdl)+c[3]*Math.log(p.sbp)+c[4]*Number(p.smoker)+c[5]*Number(p.diabetes);
 return -Math.expm1(Math.log(c[7])*Math.exp(sum-c[6]))*100;
}
export function riskBand(n:number){return n<10?'Lower':n<20?'Intermediate':'Higher';}
export function comparisons(p:RiskProfile){const base=riskPercent(p);if(base===null)return [];return [
 {label:'Not currently smoking',patch:{smoker:false}},
 {label:'Systolic BP 10 mmHg lower',patch:{sbp:Math.max(90,p.sbp-10)}},
 {label:'Total cholesterol 20 mg/dL lower',patch:{tc:Math.max(100,p.hdl+1,p.tc-20)}},
 {label:'HDL 5 mg/dL higher',patch:{hdl:Math.min(100,p.tc-1,p.hdl+5)}},
 ].map(x=>({...x,value:riskPercent({...p,...x.patch})!,delta:riskPercent({...p,...x.patch})!-base})).sort((a,b)=>a.delta-b.delta);}
export type Assessment={id:string;date:string;profile:RiskProfile;version:string};
export function validAssessment(x:unknown):x is Assessment{if(!x||typeof x!=='object')return false;const a=x as Assessment;return typeof a.id==='string'&&typeof a.date==='string'&&Number.isFinite(Date.parse(a.date))&&a.version===RISK_VERSION&&riskError(a.profile)===null;}
export function exampleHistory():Assessment[]{return [154,149,144].map((sbp,i)=>({id:`example-${i}`,date:`2026-0${6+i}-20T09:00:00.000Z`,profile:{...EXAMPLE,sbp,tc:230-i*10},version:RISK_VERSION}));}
