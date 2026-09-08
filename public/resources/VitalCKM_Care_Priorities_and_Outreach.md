# VitalCKM Care Priorities & Outreach

Release: 8 September 2026 · Rule version: `care-priorities-demo-v1`

## Purpose and scope

A population worklist for fictional patients, connecting observed measurements to clinician review and simulated follow-up. It covers 5,000 generated patients plus workspace profiles. The public demo has no real authentication, EHR integration, email service, emergency response service, or appointment booking system. Do not enter real patient information.

This is a rules-based product demonstration, not a clinically validated triage algorithm. Synthetic ML predictions and Framingham percentages are not used. Risk Calculator changes affect the queue only when saved as actual patient metrics or history. Hypothetical What-If scenarios cannot trigger an alert.

## Classification

Evaluate each domain separately. The most urgent supported flag determines overall priority; no averaging occurs. Core measurements are BP, laboratory eGFR, urine ACR, and HbA1c. Glucose is evaluated when present. Missing glucose alone does not make the core record incomplete. Relevant recorded diagnoses and smoking history also contribute.

| Priority | Illustrative thresholds / context | Default demo review target |
|---|---|---|
| P1 Urgent clinical review | BP ≥180 systolic OR ≥120 diastolic; eGFR <15; glucose <70 or ≥300 mg/dL; recorded acute-illness flag | Same day |
| P2 Priority follow-up | BP ≥160 systolic OR ≥100 diastolic, or <90 systolic / <60 diastolic; eGFR <30; >20% eGFR decrease between consecutive results within 180 days; urine ACR ≥300 mg/g; HbA1c ≥9% | 7 days |
| P3 Scheduled monitoring | BP ≥130 systolic OR ≥80 diastolic; eGFR <60; urine ACR ≥30 mg/g; HbA1c ≥5.7%; relevant recorded condition or current smoking | 30 days |
| P4 Routine prevention | No supported flags, with required current measurements valid and reviewed | 180 days |
| Data only / unclassified | No supported flag, but missing or questionable core information | 7 days |

Higher-priority findings take precedence. These targets are workflow placeholders measured from first opening the queue in this browser, not clinical recommendations. Assigned review dates can be changed explicitly. The data-quality filter includes patients with gaps even when they also have a priority flag.

Results more than 180 days old are considered stale by demo policy and do not establish current urgency. Invalid/future dates, nonfinite or invalid values, unsupported units, missing core data, and unreviewed source measurements produce visible concerns. A valid unreviewed abnormal value can still raise a flag. Recorded conditions and an unresolved acute-illness flag remain reasons to review the record even when measurement data are incomplete.

Unit normalization: urine ACR mg/mmol ×8.84 → mg/g; glucose mmol/L ×18.0182 → mg/dL; HbA1c mmol/mol ×0.09148 +2.152 → %. Original values, units, dates and source review states are preserved. For same-day entries, the latest appended observation takes precedence.

A single eGFR or ACR result does not establish chronic kidney disease. P1 does not establish an emergency diagnosis; symptoms and clinical context require assessment. P4 does not certify good health. These initial rules do not cover symptoms in free text, pregnancy, medication interactions, all critical laboratory results, or every CKM attribute.

Clinical background, not validation of this combined rule set:

- [AHA: when high blood pressure needs urgent or emergency attention](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure)
- [KDIGO 2024 CKD guidance](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf)

## Review and outreach

1. Filter and open a patient. Inspect the domain flags, source dates/units, and data gaps.
2. In clinician perspective, enter a fictional note and record a clinical review. This does not change source-observation review markers.
3. Assign a responsible team and review date. A coordinator can arrange ownership before review, but outreach remains blocked until current evidence has been reviewed.
4. For nonurgent cases, preview the generic message and simulate email or phone contact. P1 blocks the email action. Use the approved emergency pathway in real care; the demo makes no calls.
5. Record unsuccessful attempts, or arrange a fictional appointment with a valid future/today date. An unsuccessful attempt leaves the case open.
6. A clinician can resolve with a note or reopen. A contact attempt alone never closes the case automatically.

The action layer checks review, assignment, perspective, dates and required notes, in addition to the visible button states. Staff perspective switching is not real identity or access control.

Clinical evidence is matched using the exact compact source content plus rule version and data-quality state. Changed evidence creates a new pending review state, even if an earlier case was resolved. Prior actions retain their evidence signature, actor perspective, timestamp and note. Age, history, smoking, source review, and relevant observation changes can therefore invalidate an earlier review. Scenario records and experimental model results are excluded.

## Data delivery and persistence

`public/cohort/care-index.json` contains compact clinical inputs, not precomputed risk scores. `scripts/build-care-index.mjs` rebuilds it from the 100 patient source shards during Azure export. It retains the latest required observations plus a prior eGFR for trend checking. Only the selected full patient record needs to be fetched for My Health.

Local generated-patient edits override source summaries. Workspace profiles take precedence. Outreach state is stored separately under `vitalckm-outreach-v1`; only cases with actions are persisted individually. Storage failures produce a session-only warning. There is no cross-device synchronization, real audit service, or background scheduler. Reset clears outreach state and restores the existing demonstration workflow.

## Validation and next steps

The release includes 35 automated tests in total. New tests check classification boundaries, stale/missing/invalid data, unit conversions, evidence changes, hypothetical-record exclusion, review/assignment guards, urgent-email blocking, date validation, failed-contact handling, immutable history, and exact summary/source evaluation parity for all 5,000 patients. Software tests do not establish clinical sensitivity, specificity, benefit, or triage safety. Interactive browser, load, security, and prospective clinical validation remain separate work.

Before production, a clinical team must approve population-specific protocols, emergency escalation, thresholds and response times. Add verified identity, institution-specific permissions, consent/contact preferences, secure communications, assignment and coverage rules, durable audit storage, duplicate suppression, notification failure handling, and escalation of overdue/unreachable cases. Validate against adjudicated real cases, including missed urgent cases, false alerts, workload and subgroup performance. Deploy in a supervised pilot before relying on the queue for patient outreach.
