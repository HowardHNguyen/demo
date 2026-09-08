# VitalCKM clinical data review

Recommended schema for a clinician and patient application
Vietnam dataset v4 • Review date 7 September 2026

The proposed attributes are a strong starting point for CKM screening and a working application prototype. Keep the existing core measurements. The priority is to make them dated, interpretable and traceable, and to add the clinical history and follow-up records needed for longitudinal care. More biomarkers alone will not make the dataset suitable for training or validating a clinical prediction model.

### What the files contain

The workbook contains 50 synthetic patient records and 54 columns: one patient identifier plus 53 clinical attributes. Its dictionary has 36 entries marked Required, including the identifier, one conditionally required diabetes subtype, and 17 optional entries. The Word request describes future outcomes, but the sample workbook includes no outcome columns, index date or measurement dates.

### What is already useful

Age, sex, height, weight, smoking, blood pressure, lipids, glycemic tests, creatinine, eGFR, urine ACR, diagnoses and medication flags cover much of the core CKM clinical picture. Waist circumference, family history and regional exposures can add context. Preserve raw measurements and calculate BMI consistently downstream. The AHA PREVENT input set also shows why these core fields are useful, although that model is not automatically validated for Vietnam. [S3]

### What the revised workbook adds

- 31 baseline fields, with new values left blank, alongside the original 54 columns. The 50 supplied records are retained without clinical correction or invented follow-up.

- Separate empty tables for observations, medication episodes, condition history, outcomes, care workflow and versioned assessments. These support repeated records instead of a single permanent patient row.

- 108 new field definitions across those tables, with Core, Conditional, Derived, Research, App and Optional priorities. These are data structures, not 108 additional tests to order.

- A corrections register, optional measurement catalogue and source list. The original dictionary remains available as a historical reference; use the corrections register when implementing the revised schema.

### Recommended first release

Build patient intake, verified clinical measurements, trends, medication reconciliation and clinician review first. Introduce clinical scores only with explicit eligibility, documented equations and validation appropriate to the target population. Synthetic examples can test software behavior; they cannot demonstrate predictive performance.

## Corrections before implementation

### Kidney status and measurement units

Replace the single legacy CKD_STAGE value with separate G and A categories and evidence of chronicity. CKD requires persistent abnormality or other evidence of chronic disease; a single low eGFR is insufficient. G1 or G2 alone does not establish CKD, and a protein dipstick is not an interchangeable quantitative UACR result. Keep the original values for audit. [S1]

Nineteen synthetic rows have CKD_STAGE populated while CKD_DX is zero. This illustrates ambiguity in the sample, not 19 confirmed diagnostic errors. The lack of dates and longitudinal evidence prevents adjudication.

The urine ACR conversion in Appendix C is incorrect. Use mg/mmol = mg/g × 0.11312, or mg/g = mg/mmol × 8.84. For example, 30 mg/g is approximately 3.39 mg/mmol. Store the actual unit with every result. Clinical category cutoffs in different units may use guideline rounding; do not replace them with improvised thresholds.

Clarify whether BUN refers to nitrogen mass or urea. Prefer an explicit UREA_MMOL_L or BUN_MG_DL analyte label. Urea mmol/L = BUN mg/dL × 0.357; urea mmol/L = urea mg/dL × 0.1665. These are different conversions. Keep source analyte and unit before normalization.

### Diabetes and cardiovascular definitions

Record fasting status, test dates and diagnostic confirmation. Without unequivocal hyperglycemia, diabetes diagnosis generally requires two abnormal results; a single threshold crossing should not automatically create a confirmed diagnosis or incident T2D endpoint. Separate current pregnancy from gestational diabetes history. [S2]

The proposed CVD composite includes MI, revascularization, stroke/TIA, cardiovascular death and HF hospitalization. Define it as a custom endpoint, with components and an adjudication protocol. Do not equate it to WHO or SCORE2 outcomes. Separate TIA from stroke; sequelae codes such as I69 alone do not establish a new acute stroke.

### Regional references and data typing

Viet Nam appears in the 2019 WHO Southeast Asia risk chart. The chart region must not be confused with WHO administrative regions. [S6] The cited 2004 BMI consultation identifies additional action points including 23 and 27.5; it does not establish a universal Asian obesity cutoff of 25. Record the locally adopted classification and its version. [S7]

Several integer-coded sample fields contain text values. Normalize types in an import layer while preserving source values. Keep no, unknown, not measured and not applicable distinct. Treat the supplied numeric ranges as quality-review flags, not universal clinical reference ranges or automatic deletion rules.

## Prioritized clinical and application additions

### Core clinical additions

- Timing and provenance: site, index encounter, index date, care setting, measurement time, result availability time, source and verification status. These determine whether a result belongs in the baseline assessment.

- Kidney interpretation: eGFR equation, ACR unit, chronicity status, kidney cause when known, AKI context, and separate dialysis and transplant status. Retain repeat creatinine/eGFR and UACR observations. [S1]

- Cardiovascular history: heart failure, coronary artery disease, peripheral artery disease, revascularization and a separate TIA history. MI and stroke flags alone leave important clinical disease unrepresented. [S5]

- Medication detail: ingredient/class, dose, route, frequency, start/stop dates and reconciliation date. Distinguish SGLT2 inhibitors, GLP-1 and dual GIP/GLP-1 agents, ACE inhibitors/ARBs/ARNI, MRAs and non-statin lipid therapies. Drug class flags do not substitute for reconciliation.

### Useful conditional and optional measures

Promote waist circumference where feasible. Consider cystatin C and combined creatinine/cystatin eGFR, NT-proBNP, LVEF, existing coronary calcium results, lipoprotein(a), ApoB, liver tests, platelets and bicarbonate when the clinical workflow justifies them. These are proposed extensions, not universal screening requirements. Preserve lipoprotein(a) assay units rather than applying a fixed mass-to-molar conversion.

Quantify activity and alcohol exposure where feasible. Collect affordability and food-access barriers to support care. Keep hepatitis B, herbal products and betel-nut exposure as contextual or exploratory variables until incremental value is demonstrated locally. Replace the combined rice/high-sodium diet label with a defined dietary instrument; rice intake and sodium exposure should not be assumed equivalent.

### Patient and clinician use

Patients should see plain-language results, dated trends, agreed goals and follow-up status. Home readings and symptoms need source labels and review status. Clinicians need the measurement provenance, medication and diagnosis history, missing inputs, model eligibility, and a record of what they reviewed. Care-team assignment, preferred language and consent events support this workflow.

Keep app identity/contact information in a protected identity service rather than the research table. Production also needs access roles, audit events, allergies and adverse reactions, notification preferences and consent-policy history. The workbook illustrates clinical data structures; it is not the complete security or application database specification.

### Avoid unnecessary collection burden

Core means important for a particular workflow, not that every patient must provide every result. Permit missingness with reasons and disable only the calculation that lacks necessary inputs. Derive clinical stages centrally under a versioned rule; do not ask patients to choose a CKM or CKD stage themselves.

## Outcome design and model readiness

### Make follow-up usable

Retain event dates, component types, confirmation evidence, endpoint-specific last follow-up, death and ascertainment sources. Patients with short event-free follow-up have an unknown 10-year outcome, not a negative label. A suitable survival analysis can retain their censored follow-up. Separate incident T2D, incident CKD, CKD progression and kidney failure instead of combining different baseline populations into one target.

Replace a one-stage CKD change as the sole progression definition with a prespecified sustained decline or kidney-failure endpoint appropriate to the research question. Define confirmation, acute illness handling and death as a competing event in the analysis protocol. The revised workbook deliberately does not invent a universal endpoint rule.

### Prevent leakage and selection bias

For each prediction time, select only measurements and diagnoses that were available then. A symmetric six-month window risks using future information. Prespecify variable-specific lookback windows and flag stale results. Keep outcomes, later treatments and post-index stages outside the baseline feature set.

Keep all visits from a patient in the same training or validation partition. Use temporal validation and, when available, external hospital validation. Evaluate performance and calibration by sex, age, baseline disease and relevant population groups. A cohort from a rehabilitation and occupational-disease hospital may differ substantially from a general primary-care population.

### Choose and validate models deliberately

AHA PREVENT may be a useful benchmark within its intended population and input limits. WHO regional models and kidney-specific models may answer different questions. Choose each endpoint, time horizon and eligible population explicitly. Record the equation, local calibration version, input snapshot and eligibility reason with each output. Do not extrapolate a model simply because the data request includes ages 18 to 95. [S3]

The requested 25,000 patients are a recruitment target, not a guarantee of adequate model development or subgroup validation. Size the study using observed event rates, censoring, candidate model complexity and precision goals. Begin with an extraction feasibility audit, then finalize the analysis plan.

### Keep predictions separate from treatment effects

Changing inputs in a risk calculator does not establish the causal benefit of an intervention. AHA specifically cautions against using PREVENT changes after treatment initiation as an estimate of treatment-related risk reduction. Label any scenario simulation according to the evidence it actually supports. [S4]

Before patient-care deployment, have the clinical team approve the staging, diagnostic and alert logic, and assess local calibration with real outcomes. The original document’s legal and commercial provisions remain outside this clinical attribute review; this addendum does not certify the privacy framework or authorize a data transfer.

## References and implementation handoff

The field priorities and normalized table design are recommendations for VitalCKM. Clinical sources support the specific definitions and model limitations cited in the review; they do not prescribe this exact database schema.

### S1 KDIGO 2024 CKD guideline

Chronicity, kidney categories and risk assessment.

https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf

### S2 ADA Standards of Care 2026 diagnosis

Confirmation of diabetes diagnosis.

https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes

### S3 AHA PREVENT calculator

Inputs and intended population.

https://professional.heart.org/en/guidelines-and-statements/about-prevent-calculator

### S4 AHA PREVENT FAQ

Input requirements and limits on treatment what-if interpretation.

https://professional.heart.org/en/-/media/PHD-Files/Guidelines-and-Statements/PREVENT/PREVENT-FAQs-FINAL-082825.pdf

### S5 2026 CKM guideline

Integrated clinical CKM framework.

https://professional.heart.org/en/science-news/2026-guideline-for-the-prevention-detection-evaluation-and-management-of-ckm-syndrome

### S6 WHO Southeast Asia risk chart

Lists Viet Nam in Southeast Asia chart region.

https://www.who.int/docs/default-source/cardiovascular-diseases/southeast-asia.pdf?sfvrsn=cbbee748_2

### S7 WHO Expert Consultation 2004 BMI

Asian BMI action points; not universal obesity at BMI 25.

https://pubmed.ncbi.nlm.nih.gov/14726171/

### Files reviewed

VitalCKM_v4_Clinical_Data_Request_Vietnam.docx
VitalCKM_v4_Sample_Data_Vietnam.xlsx

### Workbook handoff

VitalCKM_v4_Recommended_Schema.xlsx retains the source sheets and adds Review, Corrections, Added Fields, six related record templates, Optional measures and Sources. The original Sample Data sheet has 31 appended blank columns. The added table headers are templates; they contain no fabricated patient histories, outcomes or predictions.