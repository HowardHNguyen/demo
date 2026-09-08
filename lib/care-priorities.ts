import type { Patient, Observation, Metric } from "./demo.ts";

export const CARE_VERSION = "care-priorities-demo-v1";
export const CARE_STORE = "vitalckm-outreach-v1";
export const FRESH_DAYS = 180;
export type Domain = "cardiovascular" | "kidney" | "metabolic";
export type Priority = 1 | 2 | 3 | 4;
export type CareInput = Pick<
  Patient,
  "id" | "name" | "age" | "sex" | "conditions" | "acute" | "observations" | "riskFacts" | "smoking"
>;
export const DOMAINS: Domain[] = ["cardiovascular", "kidney", "metabolic"];
export const DOMAIN_LABEL: Record<Domain, string> = {
  cardiovascular: "Cardiovascular",
  kidney: "Kidney",
  metabolic: "Metabolic",
};
export const PRIORITY_LABEL: Record<Priority, string> = {
  1: "Urgent clinical review",
  2: "Priority follow-up",
  3: "Scheduled monitoring",
  4: "Routine prevention",
};
export type Signal = {
  domain: Domain;
  priority: Priority;
  reason: string;
  observation?: Observation;
};
export type CareEvaluation = {
  priority: Priority | null;
  domains: Record<Domain, Priority | null>;
  signals: Signal[];
  gaps: { domain: Domain; reason: string }[];
  fingerprint: string;
  version: string;
};
const relevant: Metric[] = ["bp", "egfr", "uacr", "hba1c", "glucose"];
const day = 86400000;
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function datePlus(s: string, days: number) {
  return new Date(Date.parse(s.slice(0, 10)) + days * day).toISOString().slice(0, 10);
}
export function compactCareInput(p: CareInput): CareInput {
  const observations = relevant.flatMap((kind) =>
    p.observations
      .filter((o) => o.kind === kind)
      .map((o, i) => ({ o, i }))
      .sort((a, b) => b.o.date.localeCompare(a.o.date) || b.i - a.i)
      .slice(0, kind === "egfr" ? 2 : 1)
      .map((x) => x.o),
  );
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    sex: p.sex,
    conditions: [...p.conditions],
    acute: p.acute,
    smoking: p.smoking,
    riskFacts: p.riskFacts,
    observations,
  };
}
function value(o: Observation): number {
  if (!Number.isFinite(o.value)) return NaN;
  if (o.kind === "bp")
    return o.unit === "mmHg" &&
      o.value >= 40 &&
      o.value <= 300 &&
      Number.isFinite(o.second) &&
      o.second! >= 20 &&
      o.second! < o.value
      ? o.value
      : NaN;
  if (o.kind === "egfr")
    return ["mL/min/1.73 m²", "mL/min/1.73m²", "mL/min/1.73m2"].includes(o.unit) &&
      o.value > 0 &&
      o.value <= 250
      ? o.value
      : NaN;
  if (o.kind === "uacr") {
    const v = o.unit === "mg/g" ? o.value : o.unit === "mg/mmol" ? o.value * 8.84 : NaN;
    return v >= 0 && v <= 20000 ? v : NaN;
  }
  if (o.kind === "hba1c") {
    const v = o.unit === "%" ? o.value : o.unit === "mmol/mol" ? o.value * 0.09148 + 2.152 : NaN;
    return v >= 2 && v <= 25 ? v : NaN;
  }
  if (o.kind === "glucose") {
    const v = o.unit === "mg/dL" ? o.value : o.unit === "mmol/L" ? o.value * 18.0182 : NaN;
    return v >= 20 && v <= 1000 ? v : NaN;
  }
  return NaN;
}
export function evaluateCare(
  patient: CareInput,
  today = new Date().toISOString().slice(0, 10),
): CareEvaluation {
  if (!validDate(today)) throw Error("Invalid evaluation date.");
  const p = compactCareInput(patient),
    signals: Signal[] = [],
    gaps: CareEvaluation["gaps"] = [];
  const add = (domain: Domain, priority: Priority, reason: string, observation?: Observation) =>
    signals.push({ domain, priority, reason, observation });
  const read = (kind: Metric, domain: Domain, required = true) => {
    const o = p.observations.find((o) => o.kind === kind);
    if (!o) {
      if (required) gaps.push({ domain, reason: `${kind}: no measurement recorded` });
      return undefined;
    }
    if (!validDate(o.date) || o.date > today || !Number.isFinite(value(o))) {
      gaps.push({ domain, reason: `${kind}: invalid date, value or unsupported unit` });
      return undefined;
    }
    if (Date.parse(today) - Date.parse(o.date) > FRESH_DAYS * day) {
      gaps.push({
        domain,
        reason: `${kind}: result from ${o.date} is over ${FRESH_DAYS} days old; current status unknown`,
      });
      return undefined;
    }
    if (!o.reviewed)
      gaps.push({ domain, reason: `${kind}: ${o.date} result awaits source review` });
    return { o, v: value(o) };
  };
  const bp = read("bp", "cardiovascular"),
    g = read("egfr", "kidney"),
    a = read("uacr", "kidney"),
    h = read("hba1c", "metabolic"),
    gl = read("glucose", "metabolic", false);
  if (bp) {
    const d = bp.o.second!;
    if (bp.v >= 180 || d >= 120)
      add(
        "cardiovascular",
        1,
        "Markedly elevated recorded blood pressure; assess promptly and check symptoms.",
        bp.o,
      );
    else if (bp.v < 90 || d < 60)
      add(
        "cardiovascular",
        2,
        "Low recorded blood pressure; review symptoms and clinical context.",
        bp.o,
      );
    else if (bp.v >= 160 || d >= 100)
      add("cardiovascular", 2, "Elevated blood pressure meets the priority demo threshold.", bp.o);
    else if (bp.v >= 130 || d >= 80)
      add("cardiovascular", 3, "Blood pressure meets the monitoring demo threshold.", bp.o);
  }
  if (
    p.riskFacts?.cvd === true ||
    p.conditions.some((c) =>
      /hypertension|prior mi|prior stroke|coronary|heart failure|atrial/i.test(c),
    )
  )
    add("cardiovascular", 3, "Recorded cardiovascular condition requires ongoing follow-up.");
  if (p.smoking === "Current")
    add("cardiovascular", 3, "Current smoking is recorded; include prevention follow-up.");
  if (p.acute)
    add(
      "kidney",
      1,
      "Record identifies acute illness / kidney change requiring clinical review; not a CKD diagnosis.",
    );
  if (g) {
    if (g.v < 15)
      add(
        "kidney",
        1,
        "Very low recorded eGFR: assess context promptly; urgency is not determined by eGFR alone.",
        g.o,
      );
    else if (g.v < 30) add("kidney", 2, "Low eGFR meets the priority demo threshold.", g.o);
    else if (g.v < 60)
      add("kidney", 3, "Reduced eGFR merits review of persistence and clinical context.", g.o);
    const before = p.observations
      .filter(
        (o) =>
          o.kind === "egfr" &&
          o.date < g.o.date &&
          validDate(o.date) &&
          Date.parse(g.o.date) - Date.parse(o.date) <= FRESH_DAYS * day &&
          Number.isFinite(value(o)),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (before && g.v < value(before) * 0.8)
      add(
        "kidney",
        2,
        `eGFR fell more than 20% from ${value(before)} on ${before.date}; review the change.`,
        g.o,
      );
  }
  if (a) {
    if (a.v >= 300)
      add("kidney", 2, "Urine ACR meets the priority demo threshold; review persistence.", a.o);
    else if (a.v >= 30)
      add(
        "kidney",
        3,
        "Urine ACR meets the monitoring demo threshold; a single result does not diagnose CKD.",
        a.o,
      );
  }
  if (p.conditions.some((c) => /ckd|chronic kidney/i.test(c)))
    add("kidney", 3, "Recorded kidney condition requires ongoing follow-up.");
  if (h) {
    if (h.v >= 9)
      add("metabolic", 2, "HbA1c meets the priority demo threshold; arrange clinical review.", h.o);
    else if (h.v >= 5.7)
      add(
        "metabolic",
        3,
        "HbA1c meets the monitoring demo threshold; interpret with clinical history.",
        h.o,
      );
  }
  if (gl) {
    if (gl.v < 70 || gl.v >= 300)
      add(
        "metabolic",
        1,
        "Recorded glucose meets a critical-value demo flag; check timing, symptoms and the clinical protocol.",
        gl.o,
      );
  }
  if (
    p.riskFacts?.diabetes === true ||
    p.conditions.some((c) => /diabetes|dyslipid|metabolic/i.test(c))
  )
    add("metabolic", 3, "Recorded metabolic history requires ongoing follow-up.");
  const domains = Object.fromEntries(
    DOMAINS.map((d) => {
      const flags = signals.filter((s) => s.domain === d);
      return [
        d,
        flags.length
          ? Math.min(...flags.map((s) => s.priority))
          : gaps.some((g) => g.domain === d)
            ? null
            : 4,
      ];
    }),
  ) as Record<Domain, Priority | null>;
  const active = signals.map((s) => s.priority);
  const priority = active.length ? (Math.min(...active) as Priority) : gaps.length ? null : 4;
  // Full evidence string avoids hash collisions and excludes all riskHistory / hypothetical scenarios.
  const fingerprint = JSON.stringify([CARE_VERSION, p, domains, gaps.map((g) => g.reason)]);
  return {
    priority,
    domains,
    signals: signals.sort((a, b) => a.priority - b.priority),
    gaps,
    fingerprint,
    version: CARE_VERSION,
  };
}
export type CareStatus =
  | "flagged"
  | "reviewed"
  | "assigned"
  | "contacted"
  | "scheduled"
  | "resolved";
export type Actor = "clinician" | "coordinator";
export type CareEvent = {
  id: string;
  at: string;
  actor: Actor;
  action: string;
  note: string;
  fingerprint: string;
};
export type CareCase = {
  patientId: string;
  fingerprint: string;
  status: CareStatus;
  reviewedAt?: string;
  owner?: string;
  due?: string;
  appointment?: string;
  events: CareEvent[];
};
export type CareAction =
  | "review"
  | "assign"
  | "email"
  | "phone"
  | "failed"
  | "schedule"
  | "resolve"
  | "reopen";
export function effectiveCase(
  record: CareCase | undefined,
  p: CareInput,
  e: CareEvaluation,
): CareCase {
  if (record?.patientId === p.id && record.fingerprint === e.fingerprint) return record;
  return {
    patientId: p.id,
    fingerprint: e.fingerprint,
    status: "flagged",
    owner: record?.owner,
    events: record?.events || [],
  };
}
export function updateCareCase(
  record: CareCase | undefined,
  p: CareInput,
  e: CareEvaluation,
  action: CareAction,
  actor: Actor,
  note: string,
  fields: { owner?: string; due?: string; appointment?: string } = {},
  now = new Date().toISOString(),
): CareCase {
  const c = effectiveCase(record, p, e);
  if (!note.trim()) throw Error("Add a brief fictional review or outcome note.");
  if (["review", "resolve", "reopen"].includes(action) && actor !== "clinician")
    throw Error("Clinical review and resolution require clinician perspective.");
  if (c.status === "resolved" && action !== "reopen")
    throw Error("Reopen the case before recording another action.");
  if (!["review", "assign", "reopen"].includes(action) && !c.reviewedAt)
    throw Error("Review the current evidence before simulated outreach.");
  if (["email", "phone", "failed", "schedule"].includes(action) && !c.owner)
    throw Error("Assign a care-team owner before simulated outreach.");
  if (action === "email" && e.priority === 1)
    throw Error("Urgent cases use the escalation / phone workflow, not email.");
  if (
    action === "assign" &&
    (!fields.owner?.trim() ||
      !fields.due ||
      !validDate(fields.due) ||
      fields.due < now.slice(0, 10))
  )
    throw Error("Choose an owner and a valid review date today or later.");
  if (
    action === "schedule" &&
    (!fields.appointment || !validDate(fields.appointment) || fields.appointment < now.slice(0, 10))
  )
    throw Error("Choose an appointment date today or later.");
  const next = {
    ...c,
    events: [
      ...c.events,
      {
        id: `${now}-${c.events.length}`,
        at: now,
        actor,
        action,
        note: note.trim(),
        fingerprint: e.fingerprint,
      },
    ],
  };
  if (action === "review") {
    next.reviewedAt = now;
    if (c.status === "flagged") next.status = "reviewed";
  }
  if (action === "assign") {
    next.owner = fields.owner;
    next.due = fields.due;
    if (["flagged", "reviewed", "assigned"].includes(c.status)) next.status = "assigned";
  }
  if (action === "email" || action === "phone") {
    if (c.status !== "scheduled") next.status = "contacted";
  }
  if (action === "schedule") {
    next.status = "scheduled";
    next.appointment = fields.appointment;
  }
  if (action === "resolve") next.status = "resolved";
  if (action === "reopen") {
    next.status = "flagged";
    next.reviewedAt = undefined;
    next.due = undefined;
    next.appointment = undefined;
  }
  return next;
}
export function reviewDue(c: CareCase, e: CareEvaluation, startedAt: string) {
  return (
    c.due ||
    datePlus(
      startedAt,
      e.priority === 1
        ? 0
        : e.priority === 2 || e.priority === null
          ? 7
          : e.priority === 3
            ? 30
            : 180,
    )
  );
}

export function isReviewOverdue(c: CareCase, deadline: string, today: string) {
  return c.status !== "resolved" && !c.reviewedAt && deadline < today;
}
