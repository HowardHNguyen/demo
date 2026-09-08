# VitalCKM synthetic research demonstration

This package contains 5,000 entirely generated patients. It is not MESA, NHANES, Framingham participant data, or hospital data, and is not fitted to a real population. Counts, associations, missingness and outcomes are engineering assumptions. Reproducing them is not clinical validation.

## Schema reconciliation

The supplied workbook says “53 attributes” and enumerates 54 columns: PATIENT_ID plus 53 clinical/context attributes. All 54 source column names are retained. `baseline.csv` has one row per patient. `source-schema.json` preserves the source dictionary. `schema.json` describes the generated data. The 53 non-ID baseline fields are candidate model features; categorical codes are one-hot encoded rather than treated as continuous measurements.

Baseline age is generated from 30 to 84, within the source's wider 18–95 range. Sex and ethnicity codes preserve the source format; frequencies are invented and must not be represented as Vietnamese population prevalence. Diabetes is generated as type 2 only; dialysis/transplant history is zero in this generator. These are limitations in coverage, not observed prevalence. OGTT, dipstick and selected optional labs have approximately 12% missingness; total cholesterol, HDL and urine ACR approximately 3.5%. Conditional not-applicable values remain blank.

Original units: cholesterol mmol/L; glucose mmol/L; HbA1c mmol/mol; creatinine µmol/L; urine ACR mg/g. The app converts cholesterol to mg/dL and HbA1c to percent where required, retaining source values. BMI is derived from height/weight. eGFR uses the already documented CKD-EPI 2021 creatinine equation. The generated CKD label represents a fictional chronic history across three visits; CKD_STAGE is null for records without that diagnosis. Do not infer real CKD from this generator or one low result. The original dictionary's CKD staging shorthand is not a clinical diagnostic rule.

## Separate tables

- baseline.csv: 5,000 rows and 54 columns; no future outcomes.
- observations.csv: three historical visits (2026-03-01, 2026-06-01, 2026-09-01), measurement value, original/declared unit and source; missing values are omitted, not replaced.
- outcomes.csv: artificial event flag, event day, complete 3,650-day simulated follow-up, index date and label provenance. The endpoint is a first OR recurrent CVD event and differs from the patient-facing Framingham first-event reference.
- splits.csv: one immutable partition per patient (3,000 training / 1,000 validation / 1,000 test). Every visit inherits its patient's partition.
- test-predictions.csv: outcomes and probabilities for the held-out synthetic test set only.

No real follow-up has occurred. Future event days are generated labels, not observed events. All follow-up is complete and uncensored by construction. The experiment does not validate survival methods or competing-risk handling.

## Generation and evaluation policy

The script specifies physiological correlations and samples a Bernoulli event from an explicitly invented logistic relationship plus hidden noise. It does not use the Framingham equation to create labels, copy risk percentages, or tune labels to achieve a requested AUC. The latent generating probability is never a predictor.

Only baseline records enter fitting. Patient ID, outcome columns, future event times, follow-up, cohort split and historical observations are excluded. Preprocessing (median numeric imputation with indicators, categorical most-frequent imputation, one-hot encoding and numeric scaling) is fit on training only.

Two predeclared candidates: L2 logistic regression (C=0.3) and histogram gradient boosting (100 iterations, 7 leaves, L2=5, no early stopping). Select by validation AUROC; fix the classification threshold by validation Youden J. Do not refit on validation or tune on test. Report the untouched test results after selection, with a constant-prevalence/always-negative baseline. No target accuracy is imposed.

AUROC confidence intervals use 500 patient bootstrap resamples. Average precision is the precision–recall summary, not trapezoidal PR AUC. Calibration is reported in ten equal-count groups; no calibration model is fit on the test set. Subgroup summaries are descriptive without confidence intervals and are not evidence of fairness.

## Reproduce

From the repository root, create a Python environment, install `research/requirements.txt`, then run:

    OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python research/generate_and_train.py

The downloaded bundle can also be reproduced: extract it into an empty directory, keep the `research/` folder, create `public/`, and run the same command from that directory. The script creates `public/research` and `public/cohort` outputs.

Seed: 20260908. The report records Python, NumPy and scikit-learn versions. The selected fitted pipeline is exported for offline research only. It is never loaded by patient-facing code. Joblib files should only be loaded when their origin is trusted; this package's source and checksums accompany the model.

The local numerical runtime emitted floating-point warnings during BLAS-backed logistic operations. Independent scalar recomputation verified the exported probabilities to floating-point precision; finite preprocessing, weights and predictions are asserted. This check is a numerical software check, not clinical evidence.

## Sources for methods

- https://scikit-learn.org/stable/common_pitfalls.html
- https://scikit-learn.org/stable/modules/model_evaluation.html
- https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/

Real-data deployment requires endpoint-specific eligibility, adequate events and follow-up, separate external validation, calibration and subgroup assessment, clinical workflow review, real identity/access controls, durable shared records and governance. Increasing synthetic volume does not satisfy those requirements.
