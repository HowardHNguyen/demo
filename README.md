# VitalCKM Care demonstration

A working clinician and patient demo built with React, TypeScript, Vinext and the supplied Sites component library. All patient records are fictional. No MESA, NHANES or real hospital data is included.

## Run locally in Chrome

Requirements: **Node.js 22.13 or newer**, npm (included with Node.js), Google Chrome, and internet access for the first dependency installation. Download Node.js from https://nodejs.org if needed.

1. Extract the complete ZIP; do not launch files from inside the ZIP.
2. On macOS, double-click **Start VitalCKM.command** in the package root. On Windows, double-click **Start VitalCKM.cmd**.
3. Keep the Terminal window open. The launcher installs the exact locked dependencies on the first run and opens Chrome at **http://localhost:4173/**.
4. Press **Control+C** in the Terminal window to stop the app.

If macOS will not launch the command file, open Terminal and run `bash ` followed by dragging the command file into the Terminal window, then press Return.

Manual alternative, from the `app-source` folder:

```sh
npm ci
npm run demo
```

Or start the development server without automatically opening Chrome:

```sh
npm run dev -- --host 127.0.0.1 --port 4173
```

Then enter http://localhost:4173/ in Chrome. The app needs its local server; opening `page.tsx` or an HTML file directly will not run it. No API key or paid service is needed for the demo. The source also supports the configured private Sites deployment, but a Sites account is not needed for the local demonstration.

If port 4173 is in use, stop the previous app terminal. Alternatively, on macOS/Linux use `PORT=4174 npm run demo` from `app-source` and open http://localhost:4174/.

## Try the workflow

1. Start in clinician view. Open **Patient directory**, search a scenario and select a patient.
2. Inspect measurement trends and switch between blood pressure, kidney, glycemic, weight and creatinine data.
3. Add a synthetic observation. Open **Measurements** and mark it reviewed in clinician view.
4. Switch to **Patient view** to record a fictional check-in under **My care plan**, complete a goal or update medication adherence.
5. Switch back to clinician view to review the check-in.
6. Export the complete synthetic patient record as JSON, or use **Print summary** and Chrome's Save as PDF.
7. Create a new demo patient from the directory to explore the missing-data state. Use **Reset demo** to restore the eight initial scenarios.

The print action prints the currently visible patient view/tab. Exports contain the full selected record. Records are saved only in browser localStorage on the current origin. They are not synced, uploaded, or sent to a care team. A different port or browser has a separate demo store. Clearing browser data removes changes. The role switch is not authentication or authorization.

## Source map

| Location | Purpose |
|---|---|
| `app/page.tsx` | Patient and clinician screens, forms and browser-local workflows |
| `app/layout.tsx` | Metadata and app-level styles/fonts |
| `app/globals.css`, `app/care.css`, `app/workflow.css` | Shared theme, dashboard and responsive styling |
| `lib/demo.ts` | Eight deterministic synthetic scenarios, observation validation and latest-result lookup |
| `lib/clinical.ts` | BMI, CKD-EPI 2021 creatinine eGFR reference, UACR conversion and G/A measurement categories |
| `components/ui/`, `hooks/` | Reusable interface primitives and hooks |
| `tests/clinical.test.ts` | Clinical calculation boundaries and synthetic-data checks |
| `scripts/start-local.mjs` | Cross-platform local launcher |
| `package.json`, `package-lock.json` | Application dependencies and exact installation lockfile |
| `vite.config.ts`, `next.config.ts`, `tsconfig.json` | Framework and TypeScript configuration |
| `.openai/hosting.json` | Existing private Sites project configuration; contains no credential |
| `dist/` | Production build snapshot; use `npm run build` to regenerate |

## Checks and build

```sh
npm run test
npm run typecheck
npm run build
```

The source includes no enabled outcome-prediction model. PREVENT, KFRE and incident diabetes prediction remain explicit integration points. Do not treat their disabled status as a failed calculation. The NIDDK-based eGFR calculation is a reference estimate and does not replace laboratory-reported values. G/A categories are measurements, not CKD diagnoses; chronicity and acute illness require clinical assessment. No autonomous diagnosis, treatment recommendation or clinical alerting service is implemented.

## Data and documentation in the full package

- `data/synthetic-patients.json`: the eight starter scenarios and their repeated observations.
- `data/recommended-schema.json`: the proposed expanded field definitions and correction register.
- `artifacts/`: the previously delivered review and recommended workbook.
- `references/`: the two original user-supplied Word and Excel files, retained unchanged.
- `VALIDATION.md`: checks completed and known limits.

Machine-generated build caches, `node_modules`, Git history, local browser changes and credentials are intentionally not included. `npm ci` restores dependencies from the lockfile. The dependency tree inherits the scaffold's pinned releases; do not run `npm audit fix --force` blindly because it may break framework compatibility.

## Clinical sources

- https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults
- https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf

Future research imports should use adapters to the normalized schema, retain original values and units, and separate baseline predictors from outcomes. Clinical deployment needs validated models, authentication, access controls, secure storage, audit trails and an approved clinical workflow beyond this demonstration.

## September 2026 feature update

The Azure demo includes the original VitalCKM logo and brand palette from the `cardio-app` repository, a separate fictional Risk Calculator workspace, saved Risk Over Time snapshots, What-If comparisons, and a Resources reader with the three original planning documents and Markdown downloads.

The calculator uses **Framingham 2008 general CVD, lipid-based equation**, not the cardio application's trained stacked model or approximate JavaScript fallback. Its coefficients are transcribed from the Framingham Heart Study's published risk function. It is restricted to ages 30–74 without established CVD; acute illness is also blocked as a demo precaution. The UI labels hypothetical comparisons as sensitivity analysis rather than treatment effects. Context-only measurements do not alter the score. No locally trained model or clinical accuracy/AUC is claimed. Earlier planning documents describe the previous release; their original text is retained alongside a current-release notice.

Source: https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/

Risk assessments are independent fictional profiles, not inferred from incomplete patient-directory measurements. They use a separate versioned local-storage key. History records store the input snapshot and model version. The comparison workspace does not alter saved assessments. Print / Save PDF uses the browser print dialog. Clinical production still requires the validation and infrastructure described in Resources.

Validation: 15 automated tests (including reference values, eligibility, invalid inputs, scenario consistency and stored-data validation), TypeScript checking and the Azure export build passed. Automated tests verify software behavior, not clinical prediction performance. This change was not subjected to a full interactive browser or load-test suite.
