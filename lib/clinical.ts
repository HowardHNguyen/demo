// Measurement calculations only. No trained prognostic model is active.
export const METHOD_VERSION = 'ckm-measurements-1.0';
export function bmi(weight:number|null,heightCm:number|null){return weight!=null&&heightCm!=null&&Number.isFinite(weight)&&Number.isFinite(heightCm)&&weight>0&&heightCm>0?weight/(heightCm/100)**2:null}
export function egfr2021(age:number,sex:'Female'|'Male',creatinine:number,unit:'µmol/L'|'mg/dL',acute=false){
 if(!Number.isFinite(age)||age<18||!Number.isFinite(creatinine)||creatinine<=0||acute||!['Female','Male'].includes(sex)||!['µmol/L','mg/dL'].includes(unit))return null;
 const scr=unit==='µmol/L'?creatinine/88.4:creatinine,k=sex==='Female'?.7:.9,a=sex==='Female'?-.241:-.302;
 return 142*Math.min(scr/k,1)**a*Math.max(scr/k,1)**-1.2*.9938**age*(sex==='Female'?1.012:1);
}
export function normalizeAcr(value:number|null,unit:string){if(value==null||!Number.isFinite(value)||value<0)return null;return unit==='mg/g'?value:unit==='mg/mmol'?value*8.84:null}
export function gCategory(value:number|null){if(value==null||!Number.isFinite(value)||value<0)return 'Unknown';return value>=90?'G1':value>=60?'G2':value>=45?'G3a':value>=30?'G3b':value>=15?'G4':'G5'}
export function aCategory(value:number|null){if(value==null||!Number.isFinite(value)||value<0)return 'Unknown';return value<30?'A1':value<=300?'A2':'A3'}
export function display(value:number|null,precision=0){return value==null||!Number.isFinite(value)?'—':value.toFixed(precision)}
export const riskModels=[{id:'prevent',name:'Cardiovascular event risk',method:'PREVENT',status:'Not enabled',reason:'Equation integration and target-population validation are pending.'},{id:'kfre',name:'Kidney failure risk',method:'KFRE',status:'Not enabled',reason:'Eligibility checks and a verified regional implementation are pending.'},{id:'metabolic',name:'Incident type 2 diabetes',method:'Future outcome model',status:'Awaiting data',reason:'No longitudinal model has been trained. HbA1c is a measurement, not a forecast.'}] as const;
