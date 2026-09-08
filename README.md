# VitalCKM — Connected CKM Care Demo

**Live demo: [demo.vitalckm.com](https://demo.vitalckm.com)**  
Current release: September 2026 · Patient and clinician experiences · 5,000 synthetic patients

VitalCKM explores a connected approach to **cardiovascular, kidney, and metabolic (CKM) health**: understand current measurements, review risk estimates, explore hypothetical changes, and carry those discussions into a care plan. It gives business stakeholders and clinical teams a working product to evaluate while real research data and hospital partnerships are being arranged.

**This is an educational and research demonstration. All patient data is fictional.** The public app has no hospital connection, production authentication, or shared clinical database. Do not enter real patient information. Synthetic experiment results are not evidence of clinical accuracy, safety, or benefit.

## Purpose and current capabilities

The intended value is continuity between a patient's health dashboard and the clinician's review workflow. Patients should not have to repeatedly reconstruct their profile, and clinicians should be able to distinguish measured values, calculated results, and hypothetical scenarios.

| Area | What the demo supports today |
|---|---|
| My Health / Patient Overview | Current measurements, trends, source information, review status, and the original baseline attributes |
| Patient Directory | Eight hand-authored scenarios plus a searchable, paginated cohort of 5,000 synthetic patients |
| Risk Calculator | Loads the selected patient's available current metrics; checks eligibility and missing inputs; saves a dated assessment snapshot |
| Risk Over Time | Patient-specific assessment history with preserved inputs and calculation version; hypothetical scenarios stay outside the actual assessment trajectory |
| What-If | Recalculates a hypothetical profile and saves it separately from recorded measurements |
| My Care Plan | Goals, check-ins, medication-adherence entries, and discussion tasks linked to an assessment or scenario |
| Clinician review | Demonstration review markers and timestamps for observations and records |
| Research Lab | Synthetic training, validation, and test results, assumptions, and downloadable research artifacts |
| Resources and exports | Planning documents, patient JSON exports, assessment CSV exports, and browser Print / Save as PDF |

### Try the connected workflow

1. Open **Patient Directory**, search for **SYNTH-0001**, and select the patient.
2. Review **My Health**, including measurement dates, units, and baseline provenance.
3. Open **Risk Calculator** to load current available metrics. Adjust a measurement and save an actual assessment.
4. Open **Risk Over Time** to compare saved assessments.
5. Open **What-If**, adjust the hypothetical profile, and save a scenario.
6. Add a care-plan discussion task and switch to clinician view to explore review.

New measurements are appended; the original synthetic baseline remains unchanged. Saved assessments preserve their input snapshot and sources. Missing predictors and unknown history do not silently become normal values. A hypothetical improvement does not become an achieved measurement or an automatic treatment order.

The patient/clinician switch is a simulated perspective switch, **not authentication**. Changes are stored in the current browser's localStorage, with patient-specific persistence for modified generated records. They do not synchronize across users, devices, browsers, or origins. Clearing browser storage removes local edits; reset restores the demonstration state.

## Calculations and research are separate

### Patient-facing reference calculations

The cardiovascular calculator implements the published **Framingham 2008 general CVD lipid-based equation**, using age, sex, systolic blood pressure, blood-pressure treatment, total cholesterol, HDL cholesterol, smoking, and diabetes. It is restricted to eligible profiles aged 30–74 without established cardiovascular disease; acute illness is also excluded by the demo. Required missing inputs prevent calculation.

This is a published equation implementation, not a model trained on this repository's synthetic patients. Its general CVD endpoint is broader than ASCVD alone. The demo does not establish performance in Vietnam or any other local clinical population. See the [Framingham risk function](https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/) and [implementation](lib/risk.ts).

Other helpers include BMI, a CKD-EPI 2021 creatinine-based eGFR reference, unit normalization, and kidney measurement categories. They do not establish a CKD diagnosis or replace laboratory results and clinical review. What-If shows mathematical sensitivity to changed inputs, not proven treatment benefit.

**The 53 attributes are a patient data schema, not 53 independently validated predictions or one validated combined CKM score.** Kidney-failure and incident-diabetes prediction models are not enabled. The experimental research model described below is never used to calculate patient-facing risk.

### Synthetic dataset

The generator creates **5,000 patients with 53 clinical/context attributes plus `PATIENT_ID` — 54 baseline columns**. Attributes cover demographics, body measurements, vital signs, lipid and glucose measurements, kidney markers, diagnoses, history, medications, and lifestyle.

| Dataset characteristic | Current release |
|---|---|
| Generator version / random seed | `synthetic-5000-v1` / `20260908` |
| Generated ages | 30–84 years |
| Visits per patient | 3: March 1, June 1, and September 1, 2026 |
| Longitudinal observations | 163,467; missing observations are omitted |
| Baseline index date | September 1, 2026 |
| Experimental outcome | Artificial first **or recurrent** CVD event within 3,650 simulated days |
| Follow-up | Complete by construction; no censoring |

These are invented records and outcomes, not MESA, NHANES, Framingham participants, or hospital data. The generator is not fitted to real population distributions. Its assumptions, restricted disease coverage, and artificial relationships limit what can be learned from it. More synthetic records support software and pipeline testing; they do not create clinical evidence.

### Training, validation, and test design

Patients are partitioned once, with outcome stratification and no patient overlap. All visits belonging to a patient remain in the same partition. Only baseline predictors enter training; identifiers, future outcomes, follow-up information, and visit histories are excluded.

| Partition | Patients | Artificial events | Purpose |
|---|---:|---:|---|
| Training | 3,000 | 592 | Fit preprocessing and model parameters |
| Validation | 1,000 | 197 | Select the model and classification threshold |
| Test | 1,000 | 197 | Evaluate the selected model without test-set tuning |

Numeric imputation, scaling, categorical imputation, and encoding are fitted using training data only. Two predefined candidates are compared: L2 logistic regression and histogram gradient boosting. Logistic regression is selected by validation AUROC: **0.761**, versus **0.753** for gradient boosting. The threshold, **0.1860**, maximizes validation Youden J; it is an experimental classification threshold, not a clinical action threshold.

### Measured test results — synthetic experiment only

| Metric | Held-out test result |
|---|---:|
| AUROC | **0.714** |
| AUROC 95% bootstrap interval | **0.680–0.751** |
| Average precision (PR summary) | 0.373 |
| Brier score | 0.144 |
| Accuracy | 67.3% |
| Sensitivity / recall | 64.5% |
| Specificity | 68.0% |
| Positive predictive value | 33.1% |
| Negative predictive value | 88.6% |
| True positives / false positives | 127 / 257 |
| True negatives / false negatives | 546 / 70 |

AUROC describes ranking, while Brier score measures probability error; neither alone establishes clinical usefulness. Test event prevalence is 19.7%. An always-negative classifier would achieve **80.3% accuracy while missing every event**, illustrating why accuracy alone is misleading. The constant training-prevalence baseline has AUROC 0.500 and Brier score 0.158.

The AUROC interval uses 500 patient bootstrap samples and reflects uncertainty within this synthetic experiment, not uncertainty about transport to real patients. Calibration bins and subgroup summaries are exploratory; no clinical calibration or fairness claim is made. The artificial first-or-recurrent-event endpoint also differs from the published calculator's endpoint, so these metrics must not be presented as validation of that calculator.

The release passed **22 automated tests**, TypeScript checking, the Azure static export, and artifact checksum checks. These verify software and data behavior. Full interactive browser, load, security, prospective clinical, and health-outcome evaluations remain outstanding. Exact metrics and methods are available in [evaluation.json](public/research/evaluation.json) and the [research protocol](research/README.md).

## Current architecture

The deployed application is a static web frontend. Model training runs separately in Python; the deployed site serves its reports and downloadable artifacts.

```text
GitHub main → GitHub Actions → Azure Static Web Apps → demo.vitalckm.com
                                                    ↓
                                         React UI in the browser
                                         ├─ reference calculations
                                         ├─ static synthetic cohort and reports
                                         └─ localStorage for demo edits

Offline Python generator / training → versioned data, model, and evaluation files
```

| Layer | Implementation |
|---|---|
| Interface | React 19, TypeScript, Tailwind CSS, reusable Base UI / shadcn components |
| Build | Vinext with Vite; Azure-specific static export |
| Clinical and workflow logic | TypeScript modules with automated tests |
| Cohort delivery | Searchable index plus 100 JSON files of 50 patients each; selected-patient data loaded on demand |
| Demo persistence | Browser localStorage; no application backend or shared database |
| Research | Python, NumPy, SciPy, scikit-learn; reproducible generation and evaluation |
| Hosting and delivery | Azure Static Web Apps, GitHub Actions, GoDaddy-managed DNS and custom domain |

### Repository map

| Location | Purpose |
|---|---|
| [app/](app/) and [components/](components/) | Screens, theme, and reusable interface components |
| [lib/clinical.ts](lib/clinical.ts), [lib/risk.ts](lib/risk.ts) | Reference calculations and eligibility checks |
| [lib/patient-workflow.ts](lib/patient-workflow.ts) | Connected assessment and patient-record behavior |
| [public/cohort/](public/cohort/) | Generated patient index and patient data files |
| [research/](research/) | Generator, training script, source schema, and methodology |
| [public/research/](public/research/) | Baseline data, observations, outcomes, splits, predictions, model, evaluation, and checksums |
| [public/resources/](public/resources/) | Stakeholder and technical documents |
| [tests/](tests/) | Clinical helper, risk, patient workflow, and cohort checks |
| [.github/workflows/azure-demo.yml](.github/workflows/azure-demo.yml) | Automated Azure build and deployment |
| [scripts/build-azure.mjs](scripts/build-azure.mjs) | Azure export to `dist/client/` |

## Run locally and reproduce the research

Use Node.js **22.13 or newer**; Node 22 is used by CI. From Terminal:

```sh
git clone https://github.com/HowardHNguyen/demo.git
cd demo
npm ci
npm run demo
```

Keep Terminal open and use [localhost:4173](http://localhost:4173/) in Chrome. Stop the server with Control+C. Opening source files directly will not run the app. No API key is needed.

Application checks and the Azure build:

```sh
npm test
npm run typecheck
node scripts/build-azure.mjs
```

Pushing to `main` triggers GitHub Actions: dependency installation, tests, type checking, static export, then deployment of `dist/client/`. Azure deployment uses the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`; never commit its value. No application API is deployed by this workflow.

To regenerate the synthetic experiment, use a separate Python environment and the pinned research dependencies:

```sh
python3 -m venv ../vitalckm-research-env
source ../vitalckm-research-env/bin/activate
pip install -r research/requirements.txt
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python research/generate_and_train.py
```

The recorded run used Python 3.13.1. Regeneration writes data and reports under `public/`; review resulting changes before committing. See [research/README.md](research/README.md) for assumptions and reproducibility details, or download the [complete synthetic research bundle](https://demo.vitalckm.com/research/VitalCKM-synthetic-research.zip).

## EHR, hospital, and clinic integration plan

**The following is proposed work, not an existing integration.** Start with one partner and an agreed read-only use case before expanding to multiple institutions or writing results back.

### Interoperability and data mapping

Use each partner's supported FHIR version, profiles, terminology, and server capabilities. FHIR supplies structured healthcare resources and exchange interfaces; local mapping and conformance testing are still necessary. See the [HL7 FHIR architecture overview](https://hl7.org/fhir/R4/overview-arch.html).

| VitalCKM information | Proposed FHIR mapping to confirm with each partner |
|---|---|
| Patient identity and visits | `Patient`, `Encounter` |
| Measurements and laboratory results | `Observation`, `DiagnosticReport` |
| Diagnoses and clinical history | `Condition` and appropriate history resources |
| Prescribed versus reported medication use | `MedicationRequest`, `MedicationStatement` |
| Assessments and follow-up | `RiskAssessment`, `CarePlan`, `Goal`, `Task` |
| Patient questionnaires | `QuestionnaireResponse` |
| Provenance, permissions, and audit | `Provenance`, `Consent`, `AuditEvent`, plus enforced application controls |

Where supported, use SMART on FHIR for authorized EHR launch with patient context, or SMART Backend Services for approved background exchange. Access scopes should match the agreed purpose. See the [official SMART specification](https://hl7.org/fhir/smart-app-launch/). Legacy HL7 v2 feeds or controlled file imports would pass through a server-side integration adapter.

Preserve original values, units, source identifiers, clinical timestamps, and correction history. Normalize units and terminology through documented mappings, including LOINC or applicable local codes. Reconcile patient identities, distinguish missing from negative findings, and handle duplicates, delayed results, corrected results, and retries explicitly. Imported measurements must remain distinguishable from patient entries and scenarios.

### Proposed production infrastructure

Retain the web interface and add an authenticated backend, shared database, and integration workers. A candidate Azure design is an API on App Service or Container Apps, managed PostgreSQL, object storage, and queued ingestion jobs. Final service choices should follow partner requirements, expected volume, operational skills, and cost evaluation.

Required capabilities include real patient and staff identity, role-based and institution-specific access, consent enforcement, encryption, secrets management, durable audit history, backups and recovery, monitoring, and incident response. Browser storage would no longer be the system of record. Hosting on Azure alone does not establish healthcare compliance. The current beta framework and dependencies also need a production support and security assessment.

### Delivery stages

1. **Partner agreement and sandbox:** define intended use, permitted data, identity matching, endpoint definitions, responsibilities, and acceptance criteria.
2. **Read-only pilot:** validate mappings and reconcile an approved sample against the source EHR, including missingness, corrections, access boundaries, and failure recovery.
3. **Shadow evaluation:** compare calculated outputs with approved references and evaluate real outcomes without changing patient treatment.
4. **Controlled clinical rollout:** proceed only after clinical, security, operational, and applicable regulatory review; establish monitoring and rollback.
5. **Reviewed write-back and expansion:** introduce agreed summaries or care-plan tasks, then onboard additional institutions. Automatic prescribing is not part of this demo or initial integration plan.

## Future direction and production evidence

The product direction is a shared CKM workspace: patients maintain observations and follow-up, while clinicians review longitudinal context, documented assessments, and care-plan progress. Potential extensions include approved device feeds, multilingual experiences, consent-based reminders, and coordinated care across clinics.

Real-data readiness requires more than replacing a CSV and retraining. MESA access is pending; no MESA data is currently included. Any research dataset must first be assessed for permitted use, population coverage, available attributes, endpoint compatibility, follow-up, and missingness. It may not contain all 53 fields or represent the intended deployment population.

Before any predictive model is used clinically, the proposed research program should:

- Define separate cardiovascular, kidney, and metabolic endpoints and intended decisions; select suitable predictors rather than forcing all 53 fields into every model.
- Set sample requirements using event counts, model complexity, and desired precision. A fixed number of records alone does not establish adequacy.
- Separate development from independent temporal or hospital validation; account for censoring and competing events where relevant.
- Compare against appropriate published baselines and report discrimination, calibration, uncertainty, subgroup performance, and decision usefulness.
- Evaluate workflow burden, clinician usability, and prospective impact before claiming improved outcomes.
- Version datasets and models, monitor drift, and require reviewed releases with rollback. Patient edits should not automatically retrain a production model.

The current release demonstrates the connected workflow and a reproducible synthetic research pipeline. Production readiness, generalizable prediction performance, hospital interoperability, and improved patient outcomes remain objectives to establish through the staged program above.

## Further documentation

- [Synthetic generation and modeling protocol](research/README.md)
- [Exact evaluation results](public/research/evaluation.json)
- [Clinical data dictionary](public/research/schema.json)
- [Artifact checksum manifest](public/research/manifest.json)
- [Business Stakeholder Brief](public/resources/VitalCKM_Business_Stakeholder_Brief.md)
- [Clinical Data Review](public/resources/VitalCKM_Clinical_Data_Review.md)
- [Technical Architecture and Scaling](public/resources/VitalCKM_Technical_Architecture_and_Scaling.md)

The three original planning documents are retained as historical references and predate the connected synthetic-cohort release. This README and the research protocol describe the current implementation and measured experiment.
