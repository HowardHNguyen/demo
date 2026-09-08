# VitalCKM business stakeholder brief

Prepared 7 September 2026. Current implementation and proposed development plan are distinguished throughout.

## Executive description

VitalCKM Care demonstrates a shared cardiovascular, kidney and metabolic workspace for clinicians and patients. Clinicians can review measurements and histories, identify missing information, and manage follow-up. Patients can explore their measurements, record fictional check-ins, report medication adherence and complete goals. The business hypothesis is that a connected workflow can reduce fragmented review and support continuity of care. Improvements in health outcomes, clinician productivity and cost have not yet been demonstrated.

The current product is a functioning demonstration, not a validated prediction platform or a hospital-ready clinical service. It uses synthetic records, browser-local storage and a role-preview switch. No real patient data, hospital integration, production authentication or trained prediction model is present.

## What can be demonstrated today

- A clinician patient directory with search, missing-measurement filtering and patient selection.
- Patient overview covering blood pressure, laboratory eGFR, HbA1c and BMI.
- Dated trends with original measurement units, sources and review states.
- Synthetic observation entry, medication adherence reporting, care-plan tasks and patient check-ins.
- Patient/clinician perspectives, JSON record export and printing of the visible view.
- Transparent BMI, urine ACR conversion, kidney measurement categories and a reference CKD-EPI 2021 creatinine eGFR calculation. These are fixed calculations, not learned AI models.

### Actual evidence available

| Item | Current result | Interpretation |
|---|---|---|
| Starter patients | 8 synthetic patients | Demonstration scenarios, not a research cohort |
| Starter observations | 270 | Repeated observations across those same 8 patients |
| Medication entries | 9 | Fictional medication histories |
| Care-plan items | 16 | Demonstration workflow records |
| Real patients used for model training | 0 | No model development has occurred |
| Trained outcome-prediction models | 0 | PREVENT, KFRE and incident diabetes prediction are not enabled |
| Automated software tests | 9 passed | Selected calculation, boundary, validation and data tests passed |
| Production compilation and TypeScript checks | Passed | The source builds; this does not establish clinical readiness |
| Clinical accuracy, AUROC, AUPRC, sensitivity and specificity | Not available | No trained model has been evaluated against real outcomes |
| Clinical calibration, Brier score and net benefit | Not available | Not measured |
| Measured hospital-scale capacity or clinical impact | Not available | Not tested |

The separate supplied sample workbook contains 50 synthetic rows. Those rows are not the same as the app's eight scenarios and are not additional clinical validation evidence. A nine-of-nine software test result must never be described as 100% diagnostic accuracy. Performance claims on an existing company website or from unrelated studies cannot be attributed to this demo.

## What to train and what not to train

Do not train a model to reproduce BMI, eGFR equations or unit conversions. Implement those deterministically and verify their software implementation. Validate an existing published risk model before deciding whether a new proprietary model adds value.

| Proposed model | Intended population | Target and horizon | Required outcome evidence |
|---|---|---|---|
| Primary-prevention CVD model | Adults eligible for the selected model, without the relevant baseline clinical CVD | A precisely defined first cardiovascular event, initially at a supported horizon such as 5 or 10 years | Adjudicated event dates and components, follow-up and death |
| Incident type 2 diabetes model | People without diabetes at the prediction date | New confirmed T2D within a selected supported horizon | Diagnosis criteria, confirmatory tests, dates and follow-up |
| Incident CKD model | People without established CKD at baseline | New sustained CKD under a frozen protocol | Repeated renal results, chronicity evidence and adjudication |
| CKD progression or kidney-failure model | People with established CKD who meet the model's eligibility criteria | A defined sustained decline or kidney failure; KFRE addresses a specific kidney-failure question | Serial renal data, dialysis/transplant events, confirmation and competing death |

Start with one well-defined cardiovascular use case and published comparators. Add the diabetes and kidney endpoints when the data support them. Do not merge incident CKD and progression in existing CKD into one ambiguous label. Do not promise one universal CKM score.

For custom models, begin with a parsimonious regression or survival model, then compare carefully regularized tree-based methods. A small cohort does not justify deep learning simply because the product uses the term AI. Explanations identify associations or model contributions; they do not establish causal treatment benefits.

## Training and testing record counts

Count unique eligible patients and confirmed outcome events separately from rows. One person with 100 measurements is still one independent patient for splitting and much of the sample-size planning.

The following is an **illustrative budgeting scenario, not an established sample-size requirement or an observed event rate**. Assume 80% of eligible patients form the development cohort and 20% form a locked temporal or site-held-out test cohort. Within development, use grouped resampling for tuning and internal validation. Patients and all their visits stay in one partition.

| Eligible unique patients | Development patients | Locked test patients | Expected test events at 10% | At 5% | At 2% |
|---:|---:|---:|---:|---:|---:|
| 5,000 | 4,000 | 1,000 | 100 | 50 | 20 |
| 10,000 | 8,000 | 2,000 | 200 | 100 | 40 |
| 25,000 | 20,000 | 5,000 | 500 | 250 | 100 |
| 50,000 | 40,000 | 10,000 | 1,000 | 500 | 200 |

For example, a 25,000-patient cohort with an assumed 10% event proportion would contain approximately 2,000 development events and 500 test events. At 2%, those counts fall to 400 and 100. Actual analyzable counts can be lower after eligibility exclusions, missing outcome ascertainment and censoring. Do not substitute these arithmetic proportions for a survival sample-size calculation.

The 80/20 split is a planning illustration. Do not automatically waste a large portion of a small cohort on an underpowered test set. A statistician should choose between efficient internal validation and an adequately sized independent test design. Calculate development and external-validation requirements for each endpoint using event frequency, follow-up, censoring, candidate parameter complexity, anticipated performance and desired confidence-interval precision. A fixed 10-events-per-variable rule or 100/200-event validation rule is not a sufficient justification. [External-validation sample-size methods](https://www.bmj.com/content/384/bmj-2023-074821)

An external validation cohort is a separate evaluation budget, not the same 20% internal test set. After any model is recalibrated on local data, assess the updated model on a further untouched cohort or suitable resampling design; do not call performance on the adaptation data external validation.

### How MESA fits

MESA originally enrolled 6,814 adults aged 45–84 without known CVD at baseline. The actual approved delivery, usable endpoints and eligible subset will determine the available research sample. Repeated examinations do not multiply the independent participant count. MESA can support valuable model evaluation and, where justified, development, but it does not by itself validate performance in Vietnamese clinics, younger adults or secondary prevention. [MESA overview](https://mesa-nhlbi.org/about/overview)

With MESA, first audit the delivered tables, variables, endpoint definitions, event counts and permitted uses. Benchmark existing models, then decide whether recalibration or new development is justified. Obtain a local hospital cohort for transportability assessment and external validation before making Vietnam-specific performance claims.

## How training and evaluation should work

1. Freeze the intended user, clinical decision, eligible population, index date, endpoint definition and horizon.
2. Audit data provenance, duplicates, units, missingness, loss to follow-up and event adjudication.
3. Freeze patient-level and preferably temporal/site-based partitions before model selection. Fit imputers, preprocessing and feature selection only within training folds.
4. Compare a published applicable model and a simple baseline against candidate proprietary models using the same eligible cohort and endpoint. Existing equations are benchmarks, not automatically trained anew.
5. Select the model and operating threshold inside development data. Address death and censoring with appropriate time-to-event methods; a short event-free follow-up is not a negative 10-year label.
6. Evaluate the locked model once on untouched data. Report uncertainty, calibration and operational burden, not just a favorable AUC.
7. Conduct independent local validation and a prospective silent pilot. A short silent pilot tests workflow and data movement; it cannot produce ten-year outcome validation in a few months.
8. Introduce clinically approved decision support under oversight, then measure care-process and patient outcomes in a suitable prospective study.

## What performance to report

| Metric | Business meaning | Required context |
|---|---|---|
| AUROC or time-dependent AUC | Ability to rank people who experience the endpoint above those who do not | Endpoint, horizon, censoring method and 95% confidence interval |
| AUPRC | Precision/recall performance when events are uncommon | Event prevalence, horizon and appropriate survival handling |
| Sensitivity and specificity | Events identified versus non-events correctly excluded | A threshold selected before final testing |
| PPV and NPV | How often positive/negative results are correct | Prevalence and threshold in the deployment population |
| Calibration plot, slope and intercept or observed/expected ratio | Whether stated probabilities match observed frequencies | Overall and clinically important risk ranges |
| Brier score | Overall probability prediction error | Time horizon and censoring adjustment where needed |
| Decision-curve net benefit | Whether acting on the model may improve decision-making relative to alternatives | Clinically justified thresholds and comparator strategies |
| Review burden | Number of flagged patients and false positives the team must handle | For example, flags per 1,000 assessments |
| Subgroup performance | Whether results generalize across patient groups | Sample/event counts and confidence intervals per group/site |

Use TRIPOD+AI to structure transparent reporting. These reporting practices do not certify safety or regulatory compliance. [TRIPOD+AI](https://www.tripod-statement.org/)

### Why accuracy alone is misleading

**Hypothetical example only; not VitalCKM results:** among 1,000 patients with 100 events, a classifier with 80% sensitivity and 85% specificity produces 80 true positives, 20 false negatives, 765 true negatives and 135 false positives. Accuracy is 84.5%, PPV is 37.2%, and 215 patients are flagged. An always-negative classifier would have 90% accuracy while missing every event. AUROC cannot be derived from this one confusion matrix; it requires ranked predictions across thresholds.

There is no defensible promised AUC for an untrained model. Agree on clinical operating requirements after establishing baseline performance and stakeholder costs of errors. An AUC target alone is not a launch criterion. Avoid publishing arbitrary targets such as “98% accuracy” or “AUC above 0.90” as expected results.

### Model results template

For each future model, publish: version, intended use, data source and dates, eligible patient count, event count, follow-up/censoring summary, validation design, AUROC/time-AUC and CI, AUPRC, calibration, Brier score, threshold, sensitivity, specificity, PPV, NPV, flags per 1,000, subgroup results and limitations. For the current demo every clinical prediction result is **not available**.

## Commercial and operational milestones

| Stage | Proposed scope | What success establishes |
|---|---|---|
| Product discovery | Approximately 5–10 clinicians and 10–20 representative patient participants using synthetic scenarios | Usability and workflow relevance, not clinical effectiveness |
| Integration pilot | One hospital/clinic, initially read-only, with a small approved reconciliation sample | Correct identity matching, mapping and workflow access |
| Model research | Endpoint-specific real cohorts sized using formal calculations | Retrospective performance within stated populations |
| Silent prospective pilot | One or two sites, scope/duration agreed with clinical owners | Data freshness, review burden, reliability and workflow fit |
| Controlled clinical rollout | Bounded intended use and trained staff | Real-world utility and safety monitoring under governance |
| Expansion | Additional sites with independent mapping and validation | Transportability and sustainable operations |

Measure time to assemble a patient summary, missing-test detection, follow-up completion, user task success, patient understanding and clinician adoption. Do not claim reduced admissions, improved renal outcomes or cost savings without a suitable outcomes study. Revenue models such as clinic subscriptions or per-patient contracts remain commercial hypotheses until pilot value, procurement needs and delivery costs are established.

Business approval should fund the next evidence-producing milestone: clinical leadership, statistical planning, secure integration and a controlled pilot. The demonstration already helps stakeholders agree on the workflow while real data access is pending.
