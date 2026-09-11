import {identities,researchIdentity} from './governance-identities.ts';
/** Local demonstration controls; no identity verification or clinical release authority. */
export const GOVERNANCE_VERSION='governance-demo-v1';
export const GOVERNANCE_STORE='vitalckm-governance-v1';
export type SystemId='reference'|'priorities'|'research';
export type System={id:SystemId;name:string;version:string;fingerprint:string;owner:string;reviewer:string;due:string;paused:boolean;reason:string;reviewedAt?:string};
export type Incident={id:string;system:SystemId;severity:'low'|'high';summary:string;owner:string;status:'open'|'closed';createdAt:string;resolution?:string};
export type Event={id:string;at:string;actor:string;action:string;system?:SystemId;detail:unknown};
export type Governance={version:string;systems:System[];incidents:Incident[];events:Event[]};
export function initialGovernance():Governance{return {version:GOVERNANCE_VERSION,systems:[{id:'reference',name:'Framingham reference equation',version:'FHS-2008-lipids-v1',fingerprint:identities.reference,owner:'',reviewer:'',due:'',paused:false,reason:'Published equation for demonstration; no local clinical validation.'},{id:'priorities',name:'Care priority rules and outreach',version:'care-priorities-demo-v1',fingerprint:identities.priorities,owner:'',reviewer:'',due:'',paused:false,reason:'Illustrative rules; not an emergency monitoring service.'},{id:'research',name:'Synthetic ML evaluation',version:researchIdentity,fingerprint:identities.research,owner:'',reviewer:'',due:'',paused:false,reason:'Synthetic research only; no real-patient validation.'}],incidents:[],events:[]};}
export function event(state:Governance,actor:string,action:string,detail:unknown,system?:SystemId):Governance{return {...state,events:[{id:crypto.randomUUID(),at:new Date().toISOString(),actor,action,detail,system},...state.events]};}
export function changeSystem(state:Governance,id:SystemId,patch:Partial<System>,actor:string):Governance{
 const old=state.systems.find(s=>s.id===id);if(!old)throw Error('Unknown system');
 const next={...old,...patch,id};
 if(!actor.trim()||!next.reason.trim())throw Error('Record your name and the reason for this decision.');
 if(old.paused&&!next.paused){if(!next.owner.trim()||!next.reviewer.trim()||!next.due||next.due<new Date().toISOString().slice(0,10))throw Error('Resuming requires an owner, reviewer and current review date.');if(state.incidents.some(i=>i.system===id&&i.severity==='high'&&i.status==='open'))throw Error('Resolve open high-severity incidents before resuming.');}
 return event({...state,systems:state.systems.map(s=>s.id===id?next:s)},actor,'System control changed',{before:old,after:next},id);
}
export function addIncident(state:Governance,input:Omit<Incident,'id'|'createdAt'|'status'>,actor:string):Governance{
 if(!actor.trim()||!input.summary.trim()||!input.owner.trim())throw Error('Reporter, summary and incident owner are required.');
 const incident={...input,id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'open' as const};
 return event({...state,incidents:[incident,...state.incidents],systems:state.systems.map(s=>s.id===input.system&&input.severity==='high'?{...s,paused:true,reason:'Automatically paused for high-severity incident '+incident.id}:s)},actor,'Incident opened',incident,input.system);
}
export function closeIncident(state:Governance,id:string,resolution:string,actor:string):Governance{
 if(!resolution.trim()||!actor.trim())throw Error('Reviewer and resolution are required.');
 const old=state.incidents.find(i=>i.id===id);if(!old||old.status==='closed')throw Error('Incident is not open.');
 return event({...state,incidents:state.incidents.map(i=>i.id===id?{...i,status:'closed',resolution}:i)},actor,'Incident resolved',{id,resolution},old.system);
}
export function parseGovernance(raw:string):Governance{
 const s=JSON.parse(raw) as Governance;
 if(s.version!==GOVERNANCE_VERSION||!Array.isArray(s.systems)||s.systems.length!==3||!Array.isArray(s.events)||!Array.isArray(s.incidents))throw Error('Invalid governance record');
 for(const id of ['reference','priorities','research']){const matches=s.systems.filter(x=>x.id===id);if(matches.length!==1||typeof matches[0].paused!=='boolean'||['owner','reviewer','due','reason','version','name'].some(k=>typeof (matches[0] as unknown as Record<string,unknown>)[k]!=='string'))throw Error('Invalid system record');}
 for(const e of s.events)if(!e||['id','at','actor','action'].some(k=>typeof (e as unknown as Record<string,unknown>)[k]!=='string'))throw Error('Invalid event record');
 for(const i of s.incidents)if(!i||['id','owner','createdAt'].some(k=>typeof (i as unknown as Record<string,unknown>)[k]!=='string')||!['reference','priorities','research'].includes(i.system)||!['low','high'].includes(i.severity)||!['open','closed'].includes(i.status)||typeof i.summary!=='string')throw Error('Invalid incident record');
 for(const current of initialGovernance().systems){const saved=s.systems.find(x=>x.id===current.id)!;if(saved.fingerprint!==current.fingerprint){saved.paused=true;saved.reason='Implementation or evidence changed. Review required before resuming demo use.';saved.version=current.version;saved.fingerprint=current.fingerprint;saved.reviewedAt=undefined;}}
 return s;
}
export function isBlocked(s:Governance,id:SystemId){return s.systems.find(x=>x.id===id)?.paused!==false||s.incidents.some(i=>i.system===id&&i.severity==='high'&&i.status==='open');}
