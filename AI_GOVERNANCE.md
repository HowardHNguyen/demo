# VitalCKM AI Governance — demonstration and production pathway

## Purpose and scope
The clinician navigation now includes **AI Governance**. It turns safety and accountability concepts into reviewable workflows for the Framingham reference equation, care-priority rules and synthetic ML research. These are three distinct systems; a published equation, illustrative triage rules and synthetic model metrics do not provide equivalent evidence.

No system is approved for clinical deployment. This update does not establish clinical safety, regulatory compliance or validated diagnostic performance. Use fictional information only.

## Demonstrate the workflow
1. Choose Clinician and open AI Governance → Registry. Enter a reviewer name, accountable owner, clinical reviewer, next review date and decision rationale.
2. Open Incidents and create a fictional high-severity incident for the reference equation. Risk Calculator, Risk Over Time and What-If become unavailable in this browser; patient measurements remain accessible.
3. Document the investigation and corrective action, then resolve the incident. The affected system remains paused.
4. In Registry, explicitly resume demo availability with an owner, reviewer, current review date and rationale. An unresolved high-severity incident prevents resumption.
5. Review Decision history and export the JSON governance record. Saved workspace updates contain before/after snapshots and calculated outputs for compatible saved assessments. Care-priority actions include their evaluation and before/after records. Resetting patient demo data retains governance history.

## Five capabilities
| Pillar | Implemented in this demo | Required before clinical use |
|---|---|---|
| Patient safety | System-specific pause controls; high-severity incident pause; separate reviewed resumption | Clinically approved intended use, hazard analysis, escalation protocol, response owners and tested downtime procedures |
| Clinical validation | Separate evidence records and links; explicit synthetic-only and local-validation gaps | Representative real-world data, prespecified endpoints, patient-level and temporal separation, external evaluation, calibration, sensitivity/specificity, predictive values and subgroup results with confidence intervals |
| Accountability | Owner, reviewer, rationale and review-date fields; incident owner | Verified identities, role-based permissions, clinical safety lead and accountable approval committee |
| Traceability | Version fingerprints, local decision events, saved assessment inputs/outputs, export | Server-side durable audit events, access controls, retention policy, evidence storage and signed release records |
| Continuous oversight | Current workspace missingness, review queue and incident register | Live data-quality and distribution checks, outcome-linked performance monitoring, scheduled reviews, tested alerting and rollback |

## Implementation details and limits
Governance state uses browser localStorage (`vitalckm-governance-v1`). Names are self-declared. Controls apply to this browser, not every user of the public website. Records are mutable and removable; there is no authenticated approval, tamper-proof logging, background monitoring, emergency service or outbound notification. The demo role switch is not access control.

The Azure build generates SHA-256 identities from the reference equation/input mapping, priority rules and research evidence. On loading existing governance records, a changed identity pauses that system for renewed review. This detects changes only in the covered files; UI, population, schema and workflow changes still require an explicit review. Invalid saved governance state pauses all systems. Storage failures are surfaced; export session records before closing the browser if persistence is unavailable.

Missing or overdue reviews are visible warnings, not automatic clinical approvals or expiry enforcement. AUC on generated data is not real-world validation. Drift is displayed as **not measured**, because no clinical feed, labelled outcomes or approved reference distribution is connected.

## Hospital implementation sequence (planning estimates)
- **Weeks 1–2:** agree intended use, decision responsibility, clinical safety lead, data rights, hazards, escalation and acceptance criteria.
- **Weeks 3–6:** authenticated roles, backend governance registry, durable audit store, incident workflow, secure evidence storage and release controls. Enforce suspension at the API, across every user.
- **Weeks 5–10:** connect an approved data source, validate identity/unit/provenance mapping, establish quality baselines and evaluate representative real data with the hospital. Duration depends on access, sample size and outcome availability.
- **Weeks 10–12 or later:** supervised shadow evaluation, usability review, incident/rollback drills and an explicit hospital go/no-go decision. Calendar completion alone does not authorise clinical deployment.
- **Ongoing:** review outcome-linked performance, calibration, subgroups, data changes and incidents at agreed intervals; reassess material model and workflow changes before release.

These estimates assume staffed engineering and clinical teams with timely hospital access. Evidence collection may take substantially longer than software development.

## References
- [WHO: Ethics and governance of artificial intelligence for health](https://www.who.int/publications/i/item/9789240029200)
- [WHO: Regulatory considerations on artificial intelligence for health](https://www.who.int/publications/i/item/9789240078871)

These sources inform the approach; this demo is not a certification against either publication.
