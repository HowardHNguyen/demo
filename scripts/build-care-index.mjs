import { readFileSync, writeFileSync, readdirSync } from "node:fs";
// Compact source observations only. Clinical rules are evaluated in the browser, never copied ML predictions.
const kinds = ["bp", "egfr", "uacr", "hba1c", "glucose"];
const rows = readdirSync("public/cohort")
  .filter((n) => /^patients-\d+\.json$/.test(n))
  .sort()
  .flatMap((file) =>
    JSON.parse(readFileSync(`public/cohort/${file}`, "utf8")).map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      sex: p.sex,
      conditions: p.conditions,
      acute: p.acute,
      smoking: p.smoking,
      riskFacts: p.riskFacts,
      observations: kinds.flatMap((kind) =>
        p.observations
          .filter((o) => o.kind === kind)
          .map((o, i) => ({ o, i }))
          .sort((a, b) => b.o.date.localeCompare(a.o.date) || b.i - a.i)
          .slice(0, kind === "egfr" ? 2 : 1)
          .map((x) => x.o),
      ),
    })),
  );
if (rows.length !== 5000 || new Set(rows.map((p) => p.id)).size !== 5000)
  throw Error("Expected 5,000 unique generated patients.");
writeFileSync("public/cohort/care-index.json", JSON.stringify(rows));
console.log(`Care index: ${rows.length} synthetic profiles.`);
