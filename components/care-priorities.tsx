"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Phone,
  Mail,
  AlertTriangle,
  ArrowUpRight,
  Users,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Patient } from "@/lib/demo";
import {
  CARE_STORE,
  CARE_VERSION,
  DOMAINS,
  DOMAIN_LABEL,
  PRIORITY_LABEL,
  evaluateCare,
  effectiveCase,
  updateCareCase,
  reviewDue,
  isReviewOverdue,
  datePlus,
  type CareInput,
  type CareCase,
  type Actor,
  type CareAction,
  type Priority,
} from "@/lib/care-priorities";

type Saved = { startedAt: string; records: Record<string, CareCase> };
function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="priority-field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => v !== null && onChange(String(v))}>
        <SelectTrigger aria-label={label}>
          <SelectValue>{options.find((o) => o[0] === value)?.[1] || value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
function Badge({ priority, short = false }: { priority: Priority | null; short?: boolean }) {
  return (
    <span className={`priority-badge priority-${priority ?? "unknown"}`}>
      {priority === null
        ? "Data needed"
        : short
          ? `P${priority}`
          : `P${priority} · ${PRIORITY_LABEL[priority]}`}
    </span>
  );
}
const statusLabels: Record<string, string> = {
  flagged: "Needs review",
  reviewed: "Reviewed",
  assigned: "Assigned",
  contacted: "Contact simulated",
  scheduled: "Follow-up arranged",
  resolved: "Resolved",
};
const actionLabels: Record<CareAction, string> = {
  review: "Clinical review",
  assign: "Assignment",
  email: "Email simulation",
  phone: "Phone / escalation simulation",
  failed: "Unsuccessful contact simulation",
  schedule: "Appointment simulation",
  resolve: "Clinical resolution",
  reopen: "Reopened",
};
export default function CarePriorities({
  patients,
  onOpen,
  onAudit,
}: {
  patients: Patient[];
  onAudit?: (detail: unknown) => void;
  onOpen: (p: Patient) => void;
}) {
  const [cohort, setCohort] = useState<CareInput[]>([]),
    [local, setLocal] = useState<Record<string, CareInput>>({}),
    [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<Saved>({ startedAt: "", records: {} }),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("all"),
    [domain, setDomain] = useState("all"),
    [status, setStatus] = useState("open"),
    [ownerFilter, setOwnerFilter] = useState("all"),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [actor, setActor] = useState<Actor>("clinician"),
    [opening, setOpening] = useState(false);
  const [note, setNote] = useState(""),
    [owner, setOwner] = useState("Clinical team A"),
    [due, setDue] = useState(""),
    [appointment, setAppointment] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    setLoaded(false);
    fetch("/cohort/care-index.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("The generated cohort could not be loaded.");
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length !== 5000)
          throw Error("The cohort index is incomplete.");
        setCohort(data as CareInput[]);
        setLoaded(true);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoadError(e.message);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    let initial: Saved = { startedAt: new Date().toISOString(), records: {} };
    try {
      const raw = localStorage.getItem(CARE_STORE);
      if (raw) {
        const x = JSON.parse(raw);
        if (
          typeof x.startedAt !== "string" ||
          !Number.isFinite(Date.parse(x.startedAt)) ||
          !x.records ||
          typeof x.records !== "object"
        )
          throw Error();
        for (const r of Object.values(x.records) as CareCase[])
          if (
            !r ||
            typeof r.patientId !== "string" ||
            typeof r.fingerprint !== "string" ||
            !Array.isArray(r.events)
          )
            throw Error();
        initial = x;
      }
      const overrides: Record<string, CareInput> = {};
      for (const key of Object.keys(localStorage).filter((k) =>
        k.startsWith("vitalckm-patient-"),
      )) {
        try {
          const p = JSON.parse(localStorage.getItem(key)!);
          if (
            p.id === key.slice("vitalckm-patient-".length) &&
            Array.isArray(p.observations) &&
            Array.isArray(p.conditions)
          )
            overrides[p.id] = p;
        } catch {
          setMessage(
            "Some stored patient edits could not be read; source profiles are shown for those records.",
          );
        }
      }
      setLocal(overrides);
    } catch {
      setMessage(
        "Saved outreach state could not be read. This queue starts a new local demonstration.",
      );
    }
    setSaved(initial);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(CARE_STORE, JSON.stringify(saved));
      } catch {
        setMessage(
          "Storage is unavailable or full. Outreach changes are retained for this session only.",
        );
      }
  }, [saved, ready]);
  const inputs = useMemo(() => {
    const all = new Map(cohort.map((p) => [p.id, p]));
    for (const p of Object.values(local)) all.set(p.id, p);
    for (const p of patients) all.set(p.id, p);
    return [...all.values()];
  }, [cohort, local, patients]);
  const evaluations = useMemo(
    () => inputs.map((p) => ({ p, e: evaluateCare(p, today) })),
    [inputs, today],
  );
  const rows = useMemo(
    () =>
      evaluations
        .map(({ p, e }) => {
          const c = effectiveCase(saved.records[p.id], p, e);
          const deadline = reviewDue(c, e, saved.startedAt || today);
          return { p, e, c, deadline, overdue: isReviewOverdue(c, deadline, today) };
        })
        .sort(
          (a, b) =>
            (a.e.priority ?? 3.5) - (b.e.priority ?? 3.5) ||
            a.deadline.localeCompare(b.deadline) ||
            a.p.id.localeCompare(b.p.id),
        ),
    [evaluations, saved, today],
  );
  const filtered = rows.filter(
    (r) =>
      (group === "all" || group === "gaps"
        ? group === "all" || r.e.gaps.length > 0
        : String(r.e.priority) === group) &&
      (domain === "all" ||
        r.e.signals.some((s) => s.domain === domain) ||
        r.e.gaps.some((g) => g.domain === domain)) &&
      (status === "all" ||
        (status === "open" && r.c.status !== "resolved") ||
        (status === "overdue" && r.overdue) ||
        status === r.c.status) &&
      (ownerFilter === "all" ||
        (ownerFilter === "unassigned" && !r.c.owner) ||
        ownerFilter === r.c.owner) &&
      `${r.p.id} ${r.p.name} ${r.p.conditions.join(" ")} ${r.e.signals.map((s) => s.reason).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    safePage = Math.min(page, pages - 1),
    active = rows.find((r) => r.p.id === selected);
  function change(setter: (s: string) => void) {
    return (s: string) => {
      setter(s);
      setPage(0);
    };
  }
  function select(id: string) {
    const r = rows.find((r) => r.p.id === id)!;
    setSelected(id);
    setNote("");
    setOwner(r.c.owner || "Clinical team A");
    setDue(r.deadline < today ? today : r.deadline);
    setAppointment(r.c.appointment || datePlus(today, 7));
    setError("");
    setMessage("");
  }
  function act(action: CareAction) {
    if (!active) return;
    try {
      const next = updateCareCase(
        saved.records[active.p.id],
        active.p,
        active.e,
        action,
        actor,
        note,
        { owner, due, appointment },
      );
      onAudit?.({patientId:active.p.id,actor,action,ruleVersion:CARE_VERSION,evaluation:active.e,before:saved.records[active.p.id],after:next});
      setSaved((s) => ({ ...s, records: { ...s.records, [active.p.id]: next } }));
      setNote("");
      setError("");
      setMessage(
        `${actionLabels[action]} recorded locally. No message was sent and no appointment was booked.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function openPatient() {
    if (!active) return;
    setOpening(true);
    setError("");
    try {
      let p = patients.find((p) => p.id === active.p.id);
      if (!p && local[active.p.id]) {
        const raw = JSON.parse(localStorage.getItem(`vitalckm-patient-${active.p.id}`) || "null");
        if (raw?.id === active.p.id && Array.isArray(raw.tasks)) p = raw;
      }
      if (!p) {
        const shard = Math.floor((Number(active.p.id.replace("SYNTH-", "")) - 1) / 50);
        const response = await fetch(`/cohort/patients-${String(shard).padStart(3, "0")}.json`);
        if (!response.ok) throw Error("Could not open the full patient record.");
        const data: Patient[] = await response.json();
        p = data.find((p) => p.id === active.p.id);
      }
      if (!p) throw Error("Patient record not found.");
      onOpen(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpening(false);
    }
  }
  const counts = [1, 2, 3, 4].map((level) => rows.filter((r) => r.e.priority === level).length);
  return (
    <div className="care-priorities">
      <div className="priority-intro">
        <div>
          <span className="eyebrow">POPULATION FOLLOW-UP</span>
          <h2>Find the next person who needs review</h2>
          <p>
            Four care priorities, with a separate data-quality queue. Counts include resolved cases;
            filters below control the worklist.
          </p>
        </div>
        <span className="priority-demo">
          <ShieldCheck size={17} />
          Simulated clinical workflow
        </span>
      </div>
      <div className="priority-cards">
        {([1, 2, 3, 4] as Priority[]).map((level, i) => (
          <button
            key={level}
            aria-pressed={group === String(level)}
            className={`priority-card priority-${level}`}
            onClick={() => change(setGroup)(group === String(level) ? "all" : String(level))}
          >
            <span>
              P{level} · {PRIORITY_LABEL[level]}
            </span>
            <strong>{counts[i].toLocaleString()}</strong>
            <small>
              {level === 1
                ? "Assess findings and symptoms"
                : level === 2
                  ? "Arrange earlier follow-up"
                  : level === 3
                    ? "Track ongoing care"
                    : "No current priority flags"}
            </small>
          </button>
        ))}
        <button
          className="priority-card priority-unknown"
          aria-pressed={group === "gaps"}
          onClick={() => change(setGroup)(group === "gaps" ? "all" : "gaps")}
        >
          <span>Data quality queue</span>
          <strong>{rows.filter((r) => r.e.gaps.length).length.toLocaleString()}</strong>
          <small>May overlap with P1–P3</small>
        </button>
      </div>
      <div className="priority-safety">
        <AlertTriangle size={20} />
        <p>
          <strong>Demo rules, not a clinical triage service.</strong> Urgent review is not an
          emergency diagnosis. If an emergency is suspected, use local emergency services; do not
          wait for email. Symptoms are not assessed by this queue. No clinical emails or
          appointments are sent.
        </p>
      </div>
      <section className="panel priority-worklist">
        <div className="panel-head">
          <div>
            <h2>Care team worklist</h2>
            <p>
              {loaded
                ? `${rows.length.toLocaleString()} profiles · 5,000 generated plus workspace profiles`
                : "Loading the population index…"}{" "}
              · Evaluated {today}
            </p>
          </div>
          <Choice
            label="Demo staff perspective"
            value={actor}
            onChange={(v) => setActor(v as Actor)}
            options={[
              ["clinician", "Clinician"],
              ["coordinator", "Care coordinator / admin"],
            ]}
          />
        </div>
        <div className="priority-filters">
          <label className="priority-field">
            <span>Search patients or flag reasons</span>
            <Input
              value={query}
              placeholder="Patient ID, name, condition…"
              onChange={(e) => change(setQuery)(e.target.value)}
            />
          </label>
          <Choice
            label="Priority"
            value={group}
            onChange={change(setGroup)}
            options={[
              ["all", "All priorities"],
              ...[1, 2, 3, 4].map(
                (n) => [String(n), `P${n} · ${PRIORITY_LABEL[n as Priority]}`] as [string, string],
              ),
              ["gaps", "Data quality queue"],
            ]}
          />
          <Choice
            label="Domain with a flag or gap"
            value={domain}
            onChange={change(setDomain)}
            options={[
              ["all", "All domains"],
              ...DOMAINS.map((d) => [d, DOMAIN_LABEL[d]] as [string, string]),
            ]}
          />
          <Choice
            label="Work status"
            value={status}
            onChange={change(setStatus)}
            options={[
              ["open", "All open cases"],
              ["all", "All statuses"],
              ["overdue", "Overdue review"],
              ...Object.entries(statusLabels),
            ]}
          />
          <Choice
            label="Assigned team"
            value={ownerFilter}
            onChange={change(setOwnerFilter)}
            options={[
              ["all", "All teams"],
              ["unassigned", "Unassigned"],
              ["Clinical team A", "Clinical team A"],
              ["Clinical team B", "Clinical team B"],
              ["Care coordination", "Care coordination"],
            ]}
          />
        </div>
        {loadError && (
          <div role="alert" className="priority-error">
            {loadError} Counts currently cover only available workspace records.{" "}
            <Button variant="outline" onClick={() => setRetry(retry + 1)}>
              Retry cohort loading
            </Button>
          </div>
        )}
        {message && !active && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Patient",
                "Care priority / reason",
                "C / K / M",
                "Review by",
                "Owner / status",
                "",
              ].map((x, i) => (
                <TableHead key={i}>
                  {x || <span className="sr-only">Review patient</span>}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(safePage * 20, safePage * 20 + 20).map((r) => (
              <TableRow key={r.p.id}>
                <TableCell>
                  <strong>{r.p.id}</strong>
                  <small>
                    {r.p.name} · {r.p.age} · {r.p.sex}
                  </small>
                </TableCell>
                <TableCell>
                  <Badge priority={r.e.priority} />
                  <p className="priority-reason">
                    {r.e.signals[0]?.reason ||
                      (r.e.gaps.length
                        ? "Complete or review missing information before classification."
                        : "No flags in the supported current measurements. This does not establish good health.")}
                  </p>
                  {r.e.gaps.length > 0 && (
                    <small>
                      {r.e.gaps.length} data-quality concern{r.e.gaps.length > 1 ? "s" : ""}
                    </small>
                  )}
                </TableCell>
                <TableCell>
                  <div className="priority-domain-badges">
                    {DOMAINS.map((d) => (
                      <span
                        key={d}
                        title={`${DOMAIN_LABEL[d]}: ${r.e.domains[d] === null ? "Data needed" : PRIORITY_LABEL[r.e.domains[d]!]}`}
                      >
                        <span className="sr-only">{DOMAIN_LABEL[d]} </span>
                        <Badge priority={r.e.domains[d]} short />
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={r.overdue ? "priority-overdue" : ""}>{r.deadline}</span>
                  <small>
                    {r.c.status === "resolved"
                      ? "Closed"
                      : r.c.reviewedAt
                        ? "Review recorded"
                        : r.overdue
                          ? "Overdue"
                          : r.deadline === today
                            ? "Today"
                            : "Demo review target"}
                  </small>
                </TableCell>
                <TableCell>
                  {r.c.owner || "Unassigned"}
                  <small>{statusLabels[r.c.status]}</small>
                </TableCell>
                <TableCell>
                  <Button variant="outline" onClick={() => select(r.p.id)}>
                    Review <ArrowUpRight size={15} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <div className="empty-state">
            <Users />
            <h3>No matching cases</h3>
            <p>Try another priority, team, or status filter.</p>
          </div>
        )}
        <div className="priority-pagination">
          <span>
            {filtered.length.toLocaleString()} matches · Page {safePage + 1} of {pages}
          </span>
          <Button variant="outline" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={safePage + 1 >= pages}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </section>
      <details className="panel priority-policy">
        <summary>How these demo priorities work</summary>
        <p>
          The most actionable domain determines overall priority; domains are never averaged.
          Missing, invalid, unsupported-unit, future-dated, unreviewed, or over-180-day-old core
          measurements prevent a routine classification when no other flags exist. Stale values do
          not establish current urgency. Existing recorded conditions still require follow-up.
        </p>
        <ul>
          <li>
            <strong>P1:</strong> recorded BP ≥180 systolic or ≥120 diastolic; eGFR &lt;15; glucose
            &lt;70 or ≥300 mg/dL; or an acute-illness flag.
          </li>
          <li>
            <strong>P2:</strong> BP ≥160/100 or &lt;90 systolic / &lt;60 diastolic; eGFR &lt;30 or a
            &gt;20% fall within 180 days; urine ACR ≥300 mg/g; HbA1c ≥9%.
          </li>
          <li>
            <strong>P3:</strong> BP ≥130/80; eGFR &lt;60; urine ACR ≥30 mg/g; HbA1c ≥5.7%; or a
            relevant recorded condition.
          </li>
          <li>
            <strong>P4:</strong> no supported flags and all required core measurements are recent,
            valid and reviewed. This is not a healthy-person certification.
          </li>
        </ul>
        <p>
          Thresholds and review targets are illustrative product rules requiring clinical approval.
          Default review targets are same day / 7 / 30 / 180 days for P1–P4 and 7 days for data-only
          cases, measured from first opening this queue in this browser. Clinicians can assign a
          different date. No automated background monitoring is running.
        </p>
        <p>
          New evidence reopens previously reviewed cases. What-If scenarios and synthetic ML
          predictions are excluded. The full 53-field schema is not covered by these initial rules;
          free-text symptoms, medication interactions, pregnancy, and other critical laboratory
          results require additional protocols.
        </p>
        <p>
          Clinical background:{" "}
          <a
            href="https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure"
            target="_blank"
            rel="noreferrer"
          >
            AHA blood-pressure emergency guidance
          </a>{" "}
          ·{" "}
          <a
            href="https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf"
            target="_blank"
            rel="noreferrer"
          >
            KDIGO kidney guidance
          </a>
          . These do not validate this combined demo algorithm.
        </p>
        <p>
          <a href="/resources/VitalCKM_Care_Priorities_and_Outreach.md" download>
            Download the workflow and rule guide
          </a>
        </p>
        <small>
          {CARE_VERSION} · Local demonstration only · Staff switching is not access control
        </small>
      </details>
      <Dialog open={!!active} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="priority-dialog">
          <DialogHeader>
            <DialogTitle>{active?.p.id} · Care review & outreach</DialogTitle>
            <DialogDescription>
              Fictional information only. Review findings, assign an owner, and practice follow-up.
              No communication is sent.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <>
              <div className="priority-detail-head">
                <Badge priority={active.e.priority} />
                <Button variant="outline" disabled={opening} onClick={openPatient}>
                  {opening ? "Opening…" : "Open My Health"} <ArrowUpRight size={15} />
                </Button>
              </div>
              <p>
                {active.p.name} · {active.p.age} · {active.p.sex} ·{" "}
                {actor === "clinician" ? "Clinician" : "Care coordinator / admin"} perspective
              </p>
              {saved.records[active.p.id] &&
                saved.records[active.p.id].fingerprint !== active.e.fingerprint && (
                  <p className="priority-safety">
                    Evidence changed since the last action. This case needs a new clinical review;
                    prior activity is retained below.
                  </p>
                )}
              <div className="priority-domain-grid">
                {DOMAINS.map((d) => (
                  <section key={d}>
                    <h3>{DOMAIN_LABEL[d]}</h3>
                    <Badge priority={active.e.domains[d]} />
                    {active.e.signals
                      .filter((s) => s.domain === d)
                      .map((s, i) => (
                        <div className="priority-evidence" key={i}>
                          <p>{s.reason}</p>
                          {s.observation && (
                            <small>
                              {s.observation.value}
                              {s.observation.second ? `/${s.observation.second}` : ""}{" "}
                              {s.observation.unit} · {s.observation.date} · {s.observation.source} ·{" "}
                              {s.observation.reviewed
                                ? "Source reviewed"
                                : "Source awaiting review"}
                            </small>
                          )}
                        </div>
                      ))}
                    {active.e.gaps
                      .filter((g) => g.domain === d)
                      .map((g, i) => (
                        <p key={i} className="priority-gap">
                          {g.reason}
                        </p>
                      ))}
                  </section>
                ))}
              </div>
              <details>
                <summary>Source measurements and dates</summary>
                <ul>
                  {active.p.observations
                    .filter((o) => ["bp", "egfr", "uacr", "hba1c", "glucose"].includes(o.kind))
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 12)
                    .map((o) => (
                      <li key={o.id}>
                        {o.kind}: {o.value}
                        {o.second ? `/${o.second}` : ""} {o.unit} · {o.date} · {o.source} ·{" "}
                        {o.reviewed ? "reviewed" : "awaiting review"}
                      </li>
                    ))}
                </ul>
              </details>
              <section className="priority-case">
                <h3>
                  <ClipboardList size={18} /> {statusLabels[active.c.status]}
                </h3>
                <p>
                  Owner: {active.c.owner || "Unassigned"} · Review by {active.deadline}
                  {active.c.appointment ? ` · Demo appointment ${active.c.appointment}` : ""}
                </p>
                <p>
                  Clinical evidence review:{" "}
                  {active.c.reviewedAt ? new Date(active.c.reviewedAt).toLocaleString() : "Pending"}
                  . Reviewing this queue does not alter source-observation review markers.
                </p>
                <div className="priority-form-grid">
                  <Choice
                    label="Assigned owner"
                    value={owner}
                    onChange={setOwner}
                    options={[
                      ["Clinical team A", "Clinical team A"],
                      ["Clinical team B", "Clinical team B"],
                      ["Care coordination", "Care coordination"],
                    ]}
                  />
                  <label className="priority-field">
                    <span>Review date</span>
                    <Input
                      type="date"
                      value={due}
                      min={today}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </label>
                  <label className="priority-field">
                    <span>Simulated appointment date</span>
                    <Input
                      type="date"
                      value={appointment}
                      min={today}
                      onChange={(e) => setAppointment(e.target.value)}
                    />
                  </label>
                </div>
                <label className="priority-field">
                  <span>Review / outcome note (required for every action)</span>
                  <textarea
                    rows={2}
                    maxLength={800}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Fictional review, contact result, or reason for resolution…"
                  />
                </label>
                <div className="priority-buttons">
                  <Button
                    disabled={!ready || actor !== "clinician" || active.c.status === "resolved"}
                    onClick={() => act("review")}
                  >
                    <ShieldCheck size={16} />
                    Review evidence
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!ready || active.c.status === "resolved"}
                    onClick={() => act("assign")}
                  >
                    Assign owner & date
                  </Button>
                </div>
                {actor === "coordinator" && (
                  <p className="priority-gap">
                    Coordinators arrange follow-up after clinical review. Only the clinician
                    perspective can review, resolve, or reopen a case.
                  </p>
                )}
              </section>
              <section className="priority-outreach">
                <h3>
                  {active.e.priority === 1 ? <Phone size={18} /> : <Mail size={18} />}{" "}
                  {active.e.priority === 1 ? "Urgent escalation simulation" : "Message preview"}
                </h3>
                {active.e.priority === 1 ? (
                  <p>
                    Assess symptoms and the approved emergency pathway. Do not wait for an email
                    response. Record a simulated phone/escalation outcome below; this app contacts
                    nobody.
                  </p>
                ) : (
                  <blockquote>
                    Your care team would like to review your recent health information. Please sign
                    in to your secure portal or contact the clinic to arrange follow-up.
                  </blockquote>
                )}
                <p>
                  No recipient addresses are collected. Real outreach requires verified contact
                  preferences, consent and a secure communication service.
                </p>
                <div className="priority-buttons">
                  <Button
                    variant="outline"
                    disabled={
                      !active.c.reviewedAt ||
                      !active.c.owner ||
                      active.c.status === "resolved" ||
                      active.e.priority === 1
                    }
                    onClick={() => act("email")}
                  >
                    Simulate email
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !active.c.reviewedAt || !active.c.owner || active.c.status === "resolved"
                    }
                    onClick={() => act("phone")}
                  >
                    Log simulated phone / escalation
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !active.c.reviewedAt || !active.c.owner || active.c.status === "resolved"
                    }
                    onClick={() => act("failed")}
                  >
                    Log unsuccessful contact
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !active.c.reviewedAt || !active.c.owner || active.c.status === "resolved"
                    }
                    onClick={() => act("schedule")}
                  >
                    Record demo appointment
                  </Button>
                </div>
              </section>
              <div className="priority-buttons">
                <Button
                  variant="outline"
                  disabled={
                    actor !== "clinician" || !active.c.reviewedAt || active.c.status === "resolved"
                  }
                  onClick={() => act("resolve")}
                >
                  Resolve with note
                </Button>
                <Button
                  variant="outline"
                  disabled={actor !== "clinician" || active.c.status !== "resolved"}
                  onClick={() => act("reopen")}
                >
                  Reopen case
                </Button>
              </div>
              {error && (
                <p role="alert" className="priority-error">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="notice">
                  {message}
                </p>
              )}
              <details open={active.c.events.length > 0}>
                <summary>Activity history ({active.c.events.length})</summary>
                {!active.c.events.length ? (
                  <p>No actions recorded.</p>
                ) : (
                  <ol className="priority-timeline">
                    {[...active.c.events].reverse().map((ev) => (
                      <li key={ev.id}>
                        <strong>{actionLabels[ev.action as CareAction] || ev.action}</strong>
                        <small>
                          {new Date(ev.at).toLocaleString()} · {ev.actor}
                          {ev.fingerprint !== active.e.fingerprint ? " · Earlier evidence" : ""}
                        </small>
                        <p>{ev.note}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </details>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
