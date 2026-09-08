"""Synthetic-only CKM experiment. Run from repo root with research/requirements.txt.
No downloaded patient records, no fitted real-world distributions, no clinical validity.
The generator and split/model/threshold policy are fixed before the held-out evaluation.
"""
from pathlib import Path
import json, csv, math, hashlib, zipfile, platform
import numpy as np
import sklearn
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, confusion_matrix, roc_curve
import joblib

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/research'; COHORT=ROOT/'public/cohort'
OUT.mkdir(parents=True,exist_ok=True); COHORT.mkdir(parents=True,exist_ok=True)
SEED=20260908; rng=np.random.default_rng(SEED); N=5000
schema=json.loads((ROOT/'research/source-schema.json').read_text()); fields=[r[1] for r in schema]
assert len(fields)==54 and len(set(fields))==54
clip=lambda x,a,b:float(np.clip(x,a,b))
round1=lambda x:round(float(x),1)
def bern(p):return int(rng.random()<p)
def egfr(age,sex,cr):
 s=cr/88.4; k=.7 if sex==2 else .9; alpha=-.241 if sex==2 else -.302
 return 142*min(s/k,1)**alpha*max(s/k,1)**-1.2*.9938**age*(1.012 if sex==2 else 1)
def dump(p,data):p.write_text(json.dumps(data,separators=(',',':'),allow_nan=False))
def csvwrite(name,rows,cols):
 with (OUT/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(rows)
rows=[];outcomes=[];patients=[];index=[];longitudinal=[]
for i in range(N):
 pid=f'SYNTH-{i+1:04d}';age=int(rng.integers(30,85));sex=int(rng.integers(1,3));height=round1(clip(rng.normal(168 if sex==1 else 156,6),135,195));bmi=clip(rng.normal(25,4),17,40);weight=round1(bmi*(height/100)**2)
 diabetes=bern(1/(1+math.exp(-(-2.2+.035*(age-40)+.12*(bmi-25)))));htn=bern(1/(1+math.exp(-(-1+.045*(age-40)+.1*(bmi-25)))))
 smoking=int(rng.choice([0,1,2],p=[.65,.15,.2]));treated=htn*bern(.8);sbp=round1(clip(rng.normal(118+18*htn+.2*(age-50)-5*treated,12),92,195));dia=round1(clip(rng.normal(74+8*htn,7),50,min(110,sbp-15)))
 cr=round1(clip(rng.lognormal(math.log(80+25*diabetes+.5*(age-50)),.28),35,420));g=round1(min(145,egfr(age,sex,cr)));acr=round1(clip(rng.lognormal(2+.7*diabetes+(1 if g<60 else 0),1),0,1800));ckd=int(g<60 or acr>=30)
 stage=(5 if g<15 else 4 if g<30 else 3 if g<60 else 2 if g<90 else 1) if ckd else None
 hdl=round1(clip(rng.normal(1.4-.12*(sex==1)-.08*diabetes,.25),.55,2.6));ldl=round1(clip(rng.normal(3.1+.2*diabetes,.65),1,5.5));tg=round1(clip(rng.lognormal(.3+.15*diabetes,.4),.5,4.5));tc=round1(max(2.6,hdl+ldl+tg/2.2))
 glucose=round1(clip(rng.normal(8.5 if diabetes else 5.2,1.1 if diabetes else .6),3.5,18));a1c=round1(clip((glucose+2.59)/1.59,4.5,11));mi=bern(.025+.055*(age>65));stroke=bern(.015+.035*(age>65));oral=diabetes*bern(.75);insulin=diabetes*bern(.2)
 r={'PATIENT_ID':pid,'SEX':sex,'AGE':age,'ETHNICITY':str(rng.choice([1,2,3,4,5,6,7],p=[.7,.05,.05,.05,.05,.05,.05])),'HEIGHT_CM':height,'WEIGHT_KG':weight,'WAIST_CIRC_CM':round1(clip(2.4*bmi+20+rng.normal(0,4),55,145)),'WAIST_HIP_RATIO':round(clip(rng.normal(.91 if sex==1 else .83,.05),.65,1.2),2),'SMOKING_STATUS':smoking,'SYSBP':sbp,'DIABP':dia,'HEARTRTE':round1(clip(rng.normal(73,9),45,120)),'TOTCHOL':tc,'HDLC':hdl,'LDLC':ldl,'TRIGLYCERIDES':tg,'GLUCOSE':glucose,'HBA1C':round1((a1c-2.152)/.09148),'OGTT_2HR_GLUCOSE':round1(clip(glucose+2+rng.normal(0,1),3,25)),'EGFR':g,'SERUM_CREATININE':cr,'BUN':round1(clip(5+(90-g)/15+rng.normal(0,1),2,30)),'URINE_ACR':acr,'URINE_PROTEIN_DIPSTICK':'Negative' if acr<30 else 'Trace' if acr<100 else '1+' if acr<300 else '2+','CKD_STAGE':stage,'SERUM_POTASSIUM':round1(clip(rng.normal(4.3,.35),3.2,5.8)),'SERUM_SODIUM':round1(clip(rng.normal(139,2.5),130,148)),'HEMOGLOBIN':round1(clip(rng.normal(140 if sex==1 else 128,12)-(10 if ckd else 0),80,180)),'DIABETES':diabetes,'DIABETES_TYPE':2 if diabetes else None,'HYPERTENSION_DX':htn,'CKD_DX':ckd,'AFIB_DX':bern(.025+.04*(age>70)),'DYSLIPIDEMIA_DX':int(ldl>3.4),'NAFLD_DX':bern(.15),'GOUT_DX':bern(.08),'HEPATITIS_B_STATUS':int(rng.choice([0,1,2],p=[.8,.08,.12])),'PRIOR_MI':mi,'PRIOR_STROKE':stroke,'FAMILY_HX_CVD':bern(.2),'FAMILY_HX_DIABETES':bern(.25),'FAMILY_HX_CKD':bern(.1),'PRIOR_DIALYSIS_OR_TRANSPLANT':0,'GESTATIONAL_DIABETES_HX':bern(.12) if sex==2 else 'NA','BPMEDS':treated,'STATIN_USE':bern(.8 if mi or stroke else .3),'ASPIRIN_USE':bern(.7 if mi or stroke else .08),'ANTIDIABETIC_ORAL_USE':oral,'INSULIN_USE':insulin,'NEPHROTOXIC_OR_HERBAL_MED_USE':int(rng.choice([0,1,2],p=[.7,.15,.15])),'PHYSICAL_ACTIVITY':int(rng.choice([1,2,3,4],p=[.3,.35,.3,.05])),'ALCOHOL_USE':int(rng.choice([0,1,2,3],p=[.45,.3,.2,.05])),'DIET_PATTERN':int(rng.integers(1,5)),'BETEL_NUT_USE':bern(.06)}
 # Deliberately artificial stochastic label, NOT a published clinical equation.
 # Includes first OR recurrent CVD event; not comparable with FHS first-event risk.
 latent=-2.6+.045*(age-50)+.022*(sbp-120)+.4*(smoking==2)+.6*diabetes+.012*max(60-g,0)+.13*(ldl-3)+.5*mi+.4*stroke+.25*(diabetes and ckd)+rng.normal(0,.65)
 probability=1/(1+math.exp(-latent));event=bern(probability)
 event_days=int(rng.integers(1,3651)) if event else None
 outcomes.append({'PATIENT_ID':pid,'INDEX_DATE':'2026-09-01','SIMULATED_CVD_EVENT_10Y':event,'EVENT_DAY':event_days,'FOLLOWUP_DAYS':3650,'CENSORED':0,'LABEL_ORIGIN':'synthetic-generator-v1'})
 # Missingness is introduced after label sampling; neither labels nor hidden generator probability enter model inputs.
 for k in ['OGTT_2HR_GLUCOSE','URINE_PROTEIN_DIPSTICK','WAIST_HIP_RATIO','SERUM_POTASSIUM','SERUM_SODIUM','HEMOGLOBIN']:
  if rng.random()<.12:r[k]=None
 for k in ['TOTCHOL','HDLC','URINE_ACR']:
  if rng.random()<.035:r[k]=None
 assert set(r)==set(fields);rows.append(r)
 obs=[]
 metric_map={'SYSBP':('bp','mmHg'),'EGFR':('egfr','mL/min/1.73 m²'),'HBA1C':('hba1c','%'),'URINE_ACR':('uacr','mg/g'),'WEIGHT_KG':('weight','kg'),'SERUM_CREATININE':('creatinine','µmol/L'),'TOTCHOL':('tc','mmol/L'),'HDLC':('hdl','mmol/L'),'LDLC':('ldl','mmol/L'),'GLUCOSE':('glucose','mmol/L'),'HEARTRTE':('heartRate','bpm')}
 for j,date in enumerate(['2026-03-01','2026-06-01','2026-09-01']):
  for k,(kind,unit) in metric_map.items():
   if r[k] is None:continue
   val=r[k]
   if k=='HBA1C':val=val*.09148+2.152
   # Past visits fluctuate without presuming treatment benefit. Renal reference remains consistent with generated creatinine.
   if j<2 and k in ['SYSBP','WEIGHT_KG','TOTCHOL','HDLC','LDLC','GLUCOSE','HEARTRTE']:val*=float(rng.uniform(.96,1.04))
   val=round1(val)
   o={'id':f'{pid}-{kind}-{j}','kind':kind,'value':val,'unit':unit,'date':date,'source':'Laboratory' if kind not in ['bp','weight','heartRate'] else 'Clinic','reviewed':True}
   if kind=='bp':o['second']=dia
   obs.append(o);longitudinal.append({'PATIENT_ID':pid,'OBSERVATION_ID':o['id'],'DATE':date,'METRIC':kind,'VALUE':val,'SECOND_VALUE':o.get('second'),'UNIT':unit,'SOURCE':o['source']})
 conditions=[label for key,label in [('DIABETES','Type 2 diabetes'),('HYPERTENSION_DX','Hypertension'),('CKD_DX','Documented CKD'),('PRIOR_MI','Prior MI'),('PRIOR_STROKE','Prior stroke'),('AFIB_DX','Atrial fibrillation')] if r[key]==1]
 meds=[]
 for key,name,cls in [('BPMEDS','Illustrative antihypertensive','Antihypertensive'),('STATIN_USE','Illustrative statin','Statin'),('ANTIDIABETIC_ORAL_USE','Illustrative oral diabetes medication','Oral antidiabetic'),('INSULIN_USE','Illustrative insulin','Insulin')]:
  if r[key]:meds.append({'id':f'{pid}-{key}','name':name,'dose':'Drug and dose not specified in synthetic baseline','className':cls,'since':'2026-03-01','adherence':'Not reported'})
 patient={'id':pid,'name':f'Synthetic patient {i+1:04d}','age':age,'sex':'Male' if sex==1 else 'Female','height':height,'scenario':'Generated CKM profile','conditions':conditions,'chronicity':'Fictional chronic history across three visits' if ckd else 'No CKD diagnosis in generated history','acute':False,'smoking':['Never','Former','Current'][smoking],'observations':obs,'medications':meds,'tasks':[{'id':f'{pid}-task','title':'Review current measurements and assessment','detail':'Discuss recorded values with the demo care team. No treatment is prescribed.','due':'2026-09-15','done':False}],'reports':[],'attributes':r,'indexDate':'2026-09-01','riskFacts':{'treated':bool(treated),'diabetes':bool(diabetes),'cvd':bool(mi or stroke)},'cohortVersion':'synthetic-5000-v1'}
 patients.append(patient);index.append({'id':pid,'name':patient['name'],'age':age,'sex':patient['sex'],'conditions':conditions,'missing':sum(r[k] is None for k in ['TOTCHOL','HDLC','URINE_ACR']),'shard':i//50})
for shard in range(100):dump(COHORT/f'patients-{shard:03d}.json',patients[shard*50:(shard+1)*50])
dump(COHORT/'index.json',index)
dump(OUT/'schema.json',[{'name':r[1],'category':r[2],'type':r[3],'range':'SYNTH-0001 ... SYNTH-5000' if r[1]=='PATIENT_ID' else r[4],'required':r[5],'description':r[6],'role':'identifier; excluded from model' if r[1]=='PATIENT_ID' else 'baseline feature'} for r in schema])
csvwrite('baseline.csv',rows,fields);csvwrite('outcomes.csv',outcomes,list(outcomes[0]));csvwrite('observations.csv',longitudinal,list(longitudinal[0]))
# Exactly one baseline per patient. All longitudinal data inherit its split and are excluded from fitting.
y=np.array([o['SIMULATED_CVD_EVENT_10Y'] for o in outcomes]);ids=np.arange(N)
train,rest=train_test_split(ids,train_size=3000,stratify=y,random_state=SEED)
val,test=train_test_split(rest,train_size=1000,stratify=y[rest],random_state=SEED+1)
assert not(set(train)&set(val) or set(train)&set(test) or set(val)&set(test))
splits={int(i):s for s,ix in [('training',train),('validation',val),('test',test)] for i in ix}
csvwrite('splits.csv',[{'PATIENT_ID':r['PATIENT_ID'],'SPLIT':splits[i]} for i,r in enumerate(rows)],['PATIENT_ID','SPLIT'])
features=fields[1:];categorical=[r[1] for r in schema[1:] if r[3] in ['int','string'] and r[1] not in ['AGE']];numerical=[f for f in features if f not in categorical]
X=np.array([[np.nan if r[k] is None else str(r[k]) if k in categorical else float(r[k]) for k in features] for r in rows],dtype=object)
num=[features.index(k) for k in numerical];cat=[features.index(k) for k in categorical]
def preprocessing():return ColumnTransformer([('numeric',Pipeline([('imputer',SimpleImputer(strategy='median',add_indicator=True)),('scale',StandardScaler())]),num),('categorical',Pipeline([('imputer',SimpleImputer(strategy='most_frequent')),('onehot',OneHotEncoder(handle_unknown='ignore',sparse_output=False))]),cat)])
models={'Logistic regression (L2)':LogisticRegression(C=.3,max_iter=2000,random_state=SEED),'Gradient boosting':HistGradientBoostingClassifier(max_iter=100,max_leaf_nodes=7,l2_regularization=5,early_stopping=False,random_state=SEED)}
fitted={};validation=[]
for name,model in models.items():
 pipe=Pipeline([('preprocessing',preprocessing()),('model',model)]);pipe.fit(X[train],y[train]);p=pipe.predict_proba(X[val])[:,1]
 assert np.isfinite(p).all() and ((p>=0)&(p<=1)).all()
 if isinstance(model,LogisticRegression):
  tx=pipe['preprocessing'].transform(X[val]);coef=model.coef_[0];inter=float(model.intercept_[0]);assert np.isfinite(tx).all() and np.isfinite(coef).all()
  scalar=np.array([1/(1+math.exp(-(math.fsum(float(a)*float(b) for a,b in zip(x,coef))+inter))) for x in tx]);assert np.max(np.abs(scalar-p))<1e-12
 fitted[name]=pipe;validation.append({'model':name,'auroc':roc_auc_score(y[val],p),'averagePrecision':average_precision_score(y[val],p),'brier':brier_score_loss(y[val],p)})
# Policy fixed: best validation AUROC; threshold maximizes validation Youden J. No fitting on validation or test.
selected=max(validation,key=lambda r:r['auroc'])['model'];pipe=fitted[selected];vp=pipe.predict_proba(X[val])[:,1]
fpr,tpr,thresholds=roc_curve(y[val],vp);finite=np.isfinite(thresholds);threshold=float(thresholds[finite][np.argmax((tpr-fpr)[finite])]);prob=pipe.predict_proba(X[test])[:,1]
def metrics(yy,pp):
 tn,fp,fn,tp=confusion_matrix(yy,pp>=threshold,labels=[0,1]).ravel()
 return {'n':len(yy),'events':int(sum(yy)),'auroc':float(roc_auc_score(yy,pp)) if len(set(yy))>1 else None,'averagePrecision':float(average_precision_score(yy,pp)),'brier':float(brier_score_loss(yy,pp)),'accuracy':float((tp+tn)/len(yy)),'sensitivity':float(tp/(tp+fn)) if tp+fn else None,'specificity':float(tn/(tn+fp)) if tn+fp else None,'ppv':float(tp/(tp+fp)) if tp+fp else None,'npv':float(tn/(tn+fn)) if tn+fn else None,'confusion':{'tp':int(tp),'fp':int(fp),'tn':int(tn),'fn':int(fn)}}
assert np.isfinite(prob).all() and ((prob>=0)&(prob<=1)).all()
numerical_error=None
if isinstance(pipe['model'],LogisticRegression):
 tx=pipe['preprocessing'].transform(X[test]);coef=pipe['model'].coef_[0];inter=float(pipe['model'].intercept_[0]);assert np.isfinite(tx).all() and np.isfinite(coef).all()
 scalar=np.array([1/(1+math.exp(-(math.fsum(float(a)*float(b) for a,b in zip(x,coef))+inter))) for x in tx]);numerical_error=float(np.max(np.abs(scalar-prob)));assert numerical_error<1e-12
test_metrics=metrics(y[test],prob)
boot=np.random.default_rng(SEED+99);samples=[]
for _ in range(500):
 ix=boot.integers(0,len(test),len(test))
 if len(set(y[test][ix]))==2:samples.append(roc_auc_score(y[test][ix],prob[ix]))
test_metrics['auroc95CI']=[float(x) for x in np.quantile(samples,[.025,.975])]
calibration=[]
for ix in np.array_split(np.argsort(prob),10):calibration.append({'n':len(ix),'meanPrediction':float(np.mean(prob[ix])),'eventRate':float(np.mean(y[test][ix]))})
subgroups=[]
for label,mask in [('Female',np.array([rows[i]['SEX']==2 for i in test])),('Male',np.array([rows[i]['SEX']==1 for i in test])),('Age <65',np.array([rows[i]['AGE']<65 for i in test])),('Age ≥65',np.array([rows[i]['AGE']>=65 for i in test]))]:subgroups.append({'group':label,**metrics(y[test][mask],prob[mask])})
csvwrite('test-predictions.csv',[{'PATIENT_ID':rows[int(i)]['PATIENT_ID'],'SYNTHETIC_EVENT':int(yy),'EXPERIMENTAL_PROBABILITY':float(p),'THRESHOLD':threshold} for i,yy,p in zip(test,y[test],prob)],['PATIENT_ID','SYNTHETIC_EVENT','EXPERIMENTAL_PROBABILITY','THRESHOLD'])
joblib.dump(pipe,OUT/'experimental-model.joblib')
report={'version':'synthetic-5000-v1','seed':SEED,'patients':N,'attributes':53,'columnsIncludingId':54,'visitsPerPatient':3,'observations':len(longitudinal),'indexDate':'2026-09-01','endpoint':'Artificial first or recurrent cardiovascular event within 3,650 simulated days; all follow-up complete, no censoring. Not equivalent to the published FHS endpoint.','warning':'Synthetic-only experiment. Not evidence of clinical accuracy, calibration, safety, real-world prevalence or Vietnamese population validity. No experimental score is used in patient care.','split':[{'name':s,'patients':len(ix),'events':int(sum(y[ix]))} for s,ix in [('Training',train),('Validation',val),('Test',test)]],'validation':validation,'selectedModel':selected,'selection':'Highest validation AUROC from two predeclared candidates; threshold maximizes validation Youden J; imputation, encoding and scaling fitted only on training. No refit or tuning on test.','threshold':threshold,'test':test_metrics,'calibration':calibration,'subgroups':subgroups,'baseline':{'alwaysNegativeAccuracy':float(1-np.mean(y[test])),'constantTrainingPrevalenceAUROC':.5,'constantTrainingPrevalenceBrier':float(brier_score_loss(y[test],np.full(len(test),np.mean(y[train])))),'testEventPrevalence':float(np.mean(y[test]))},'missing':[{'field':k,'count':sum(r[k] is None for r in rows)} for k in fields if any(r[k] is None for r in rows)],'features':features,'categoricalFeatures':categorical,'versions':{'python':platform.python_version(),'numpy':np.__version__,'sklearn':sklearn.__version__}}
report['numericalScalarCheckMaxError']=numerical_error
dump(OUT/'evaluation.json',report)
(OUT/'README.md').write_text((ROOT/'research/README.md').read_text())
# Bundle reproducible source, data and fitted artifact. Stored model is for offline research, never loaded by patient UI.
with zipfile.ZipFile(OUT/'VitalCKM-synthetic-research.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.iterdir()):
  if p.suffix in ['.csv','.json','.joblib','.md'] and p.name!='manifest.json':z.write(p,p.name)
 for p in [Path(__file__),ROOT/'research/requirements.txt',ROOT/'research/source-schema.json',ROOT/'research/README.md']:z.write(p,'research/'+p.name)
manifest={'version':report['version'],'seed':SEED,'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.iterdir() if p.is_file() and p.name!='manifest.json'}};dump(OUT/'manifest.json',manifest)
assert len(rows)==5000 and all(len(r)==54 for r in rows)
assert all(o['DATE']<='2026-09-01' for o in longitudinal)
assert all(r['DIABP']<r['SYSBP'] for r in rows)
assert all(r['TOTCHOL'] is None or 2.6<=r['TOTCHOL']<=13 for r in rows)
assert all(r['CKD_STAGE'] is None for r in rows if not r['CKD_DX'])
assert all(p['id'] not in p.get('riskHistory',[]) for p in patients)
print(json.dumps({'selected':selected,'split':report['split'],'test':test_metrics,'observations':len(longitudinal)},indent=2))
