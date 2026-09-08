import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { seedPatients, type Patient, type Observation } from "../lib/demo.ts";
import {
  evaluateCare,
  compactCareInput,
  effectiveCase,
  updateCareCase,
  reviewDue,
  isReviewOverdue,
  type CareInput,
} from "../lib/care-priorities.ts";
const today = "2026-09-08",
  now = today + "T12:00:00Z";
function obs(kind: Observation["kind"], value: number, unit: string, second?: number): Observation {
  return {
    id: kind,
    kind,
    value,
    unit,
    second,
    date: "2026-09-01",
    source: "Laboratory",
    reviewed: true,
  };
}
function normal(): Patient {
  return {
    ...seedPatients()[0],
    id: "test",
    conditions: [],
    acute: false,
    smoking: "Never",
    riskFacts: { treated: false, diabetes: false, cvd: false },
    observations: [
      obs("bp", 118, "mmHg", 76),
      obs("egfr", 90, "mL/min/1.73 m²"),
      obs("uacr", 10, "mg/g"),
      obs("hba1c", 5.3, "%"),
    ],
  };
}
test("Four independent priority bands and combined priority never average away an urgent domain", () => {
  const p = normal();
  assert.equal(evaluateCare(p, today).priority, 4);
  p.observations[0].value = 135;
  assert.equal(evaluateCare(p, today).priority, 3);
  p.observations[0].value = 160;
  assert.equal(evaluateCare(p, today).priority, 2);
  p.observations[0].value = 180;
  const e = evaluateCare(p, today);
  assert.equal(e.priority, 1);
  assert.equal(e.domains.kidney, 4);
  assert.equal(e.domains.metabolic, 4);
});
test("Diastolic boundary alone can flag urgency; abnormal low BP does not become routine", () => {
  const p = normal();
  p.observations[0] = { ...p.observations[0], value: 170, second: 120 };
  assert.equal(evaluateCare(p, today).priority, 1);
  p.observations[0] = { ...p.observations[0], value: 85, second: 50 };
  assert.equal(evaluateCare(p, today).priority, 2);
});
test("Missing, stale, future, invalid and unreviewed data never silently become routine", () => {
  for (const mutate of [
    (p: Patient) => p.observations.pop(),
    (p: Patient) => (p.observations[0].date = "2025-01-01"),
    (p: Patient) => (p.observations[0].date = "2099-01-01"),
    (p: Patient) => (p.observations[0].unit = "unknown"),
    (p: Patient) => (p.observations[0].reviewed = false),
    (p: Patient) => (p.observations[0].value = NaN),
  ]) {
    const p = normal();
    mutate(p);
    const e = evaluateCare(p, today);
    assert.equal(e.priority, null);
    assert.ok(e.gaps.length > 0);
  }
  const p = normal();
  p.observations[0].value = 190;
  p.observations[0].date = "2025-01-01";
  assert.equal(evaluateCare(p, today).priority, null);
});
test("Data gaps coexist with urgent evidence; unreviewed concerning values are not suppressed", () => {
  const p = normal();
  p.observations.pop();
  p.observations[0].value = 190;
  p.observations[0].reviewed = false;
  const e = evaluateCare(p, today);
  assert.equal(e.priority, 1);
  assert.equal(e.gaps.length, 2);
});
test("ACR, HbA1c and glucose units normalize before classification; unknown units stay unknown", () => {
  const p = normal();
  p.observations[2] = obs("uacr", 40, "mg/mmol");
  assert.equal(evaluateCare(p, today).domains.kidney, 2);
  p.observations[3] = obs("hba1c", 80, "mmol/mol");
  assert.equal(evaluateCare(p, today).domains.metabolic, 2);
  p.observations.push(obs("glucose", 3, "mmol/L"));
  assert.equal(evaluateCare(p, today).domains.metabolic, 1);
  p.observations[4].unit = "unknown";
  const e = evaluateCare(p, today);
  assert.equal(e.domains.metabolic, 2);
  assert.ok(e.gaps.some((g) => g.reason.includes("glucose")));
});
test("Kidney changes and recorded conditions are retained even when other measurements appear normal", () => {
  const p = normal();
  p.observations[1].value = 70;
  p.observations.push({
    ...obs("egfr", 100, "mL/min/1.73 m²"),
    id: "previous",
    date: "2026-06-01",
  });
  assert.equal(evaluateCare(p, today).priority, 2);
  const q = normal();
  q.acute = true;
  assert.equal(evaluateCare(q, today).priority, 1);
  q.acute = false;
  q.riskFacts!.diabetes = true;
  assert.equal(evaluateCare(q, today).priority, 3);
  q.riskFacts!.diabetes = false;
  q.smoking = "Current";
  assert.equal(evaluateCare(q, today).domains.cardiovascular, 3);
});
test("Historical / hypothetical assessments cannot change queue classification or evidence fingerprint", () => {
  const p = normal();
  const before = evaluateCare(p, today);
  p.riskHistory = [{ kind: "scenario", profile: { sbp: 240 } }] as Patient["riskHistory"];
  assert.deepEqual(evaluateCare(p, today), before);
});
test("Latest same-day appended observation wins; original baseline and history are unchanged", () => {
  const p = normal();
  const before = JSON.stringify(p);
  const q = {
    ...p,
    observations: [...p.observations, { ...p.observations[0], id: "new-bp", value: 190 }],
  };
  assert.equal(evaluateCare(q, today).priority, 1);
  assert.equal(JSON.stringify(p), before);
});
test("Outreach requires clinical review and assignment; urgent email is blocked in the action layer", () => {
  const p = normal();
  p.acute = true;
  const e = evaluateCare(p, today);
  assert.throws(
    () => updateCareCase(undefined, p, e, "review", "coordinator", "note", {}, now),
    /clinician/,
  );
  assert.throws(
    () => updateCareCase(undefined, p, e, "phone", "clinician", "note", {}, now),
    /Review/,
  );
  let c = updateCareCase(undefined, p, e, "review", "clinician", "Evidence reviewed", {}, now);
  assert.throws(() => updateCareCase(c, p, e, "phone", "coordinator", "note", {}, now), /Assign/);
  c = updateCareCase(
    c,
    p,
    e,
    "assign",
    "coordinator",
    "Assigned",
    { owner: "Clinical team A", due: today },
    now,
  );
  assert.throws(() => updateCareCase(c, p, e, "email", "coordinator", "note", {}, now), /Urgent/);
  const next = updateCareCase(c, p, e, "phone", "coordinator", "Simulated escalation", {}, now);
  assert.equal(next.status, "contacted");
  assert.equal(c.status, "assigned");
});
test("Failed contact does not resolve a case; scheduling and clinical closure retain an immutable history", () => {
  const p = normal(),
    e = evaluateCare(p, today);
  let c = updateCareCase(undefined, p, e, "review", "clinician", "Reviewed", {}, now);
  c = updateCareCase(
    c,
    p,
    e,
    "assign",
    "coordinator",
    "Assigned",
    { owner: "Care coordination", due: today },
    now,
  );
  c = updateCareCase(c, p, e, "failed", "coordinator", "No reply", {}, now);
  assert.equal(c.status, "assigned");
  assert.equal(c.events.length, 3);
  assert.throws(
    () =>
      updateCareCase(
        c,
        p,
        e,
        "schedule",
        "coordinator",
        "Booked",
        { appointment: "2026-02-30" },
        now,
      ),
    /appointment/,
  );
  c = updateCareCase(
    c,
    p,
    e,
    "schedule",
    "coordinator",
    "Demo appointment",
    { appointment: "2026-09-14" },
    now,
  );
  assert.equal(c.status, "scheduled");
  assert.throws(
    () => updateCareCase(c, p, e, "resolve", "coordinator", "Done", {}, now),
    /clinician/,
  );
  const closed = updateCareCase(
    c,
    p,
    e,
    "resolve",
    "clinician",
    "Review complete; ongoing plan documented",
    {},
    now,
  );
  assert.equal(closed.status, "resolved");
  assert.equal(c.status, "scheduled");
  assert.throws(
    () => updateCareCase(closed, p, e, "email", "clinician", "More", {}, now),
    /Reopen/,
  );
  assert.equal(
    updateCareCase(closed, p, e, "reopen", "clinician", "New review requested", {}, now).reviewedAt,
    undefined,
  );
});
test("New evidence reopens resolved cases and cannot inherit earlier clinical approval", () => {
  const p = normal(),
    e = evaluateCare(p, today);
  let c = updateCareCase(undefined, p, e, "review", "clinician", "Reviewed", {}, now);
  c = updateCareCase(c, p, e, "resolve", "clinician", "Resolved", {}, now);
  const q = normal();
  q.observations[0].value = 190;
  const fresh = evaluateCare(q, today);
  const next = effectiveCase(c, q, fresh);
  assert.equal(next.status, "flagged");
  assert.equal(next.reviewedAt, undefined);
  assert.equal(next.events.length, 2);
  assert.throws(
    () => updateCareCase(c, q, fresh, "phone", "clinician", "Attempt", {}, now),
    /Review/,
  );
});
test("Review deadlines stay anchored and missing-data cases use their own target", () => {
  const p = normal(),
    e = evaluateCare(p, today),
    c = effectiveCase(undefined, p, e);
  assert.equal(reviewDue(c, e, now), "2027-03-07");
  assert.equal(isReviewOverdue(c, "2026-09-01", today), true);
  assert.equal(isReviewOverdue({ ...c, reviewedAt: now }, "2026-09-01", today), false);
  p.observations = [];
  assert.equal(reviewDue(c, evaluateCare(p, today), now), "2026-09-15");
  assert.throws(
    () =>
      updateCareCase(
        undefined,
        p,
        e,
        "assign",
        "coordinator",
        "Assign",
        { owner: "Team", due: "2026-02-30" },
        now,
      ),
    /valid review date/,
  );
  assert.throws(
    () => updateCareCase(undefined, p, e, "review", "clinician", "  ", {}, now),
    /note/,
  );
});
test("Population summary equals source-patient evaluation for every generated patient", () => {
  const index: CareInput[] = JSON.parse(
    readFileSync(new URL("../public/cohort/care-index.json", import.meta.url), "utf8"),
  );
  assert.equal(index.length, 5000);
  const map = new Map(index.map((p) => [p.id, p]));
  assert.equal(map.size, 5000);
  for (const name of readdirSync(new URL("../public/cohort/", import.meta.url)).filter((n) =>
    /^patients-\d+\.json$/.test(n),
  )) {
    const patients: Patient[] = JSON.parse(
      readFileSync(new URL(`../public/cohort/${name}`, import.meta.url), "utf8"),
    );
    for (const p of patients) {
      assert.deepEqual(map.get(p.id), JSON.parse(JSON.stringify(compactCareInput(p))));
      assert.deepEqual(evaluateCare(map.get(p.id)!, today), evaluateCare(p, today));
    }
  }
});
