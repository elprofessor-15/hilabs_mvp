# HiLabs Care Workbench

A static, synthetic-data MVP for an RN case manager. The workbench demonstrates a source-aware queue, member review, outreach preparation, nurse-confirmed documentation, a transparent impact model, and a structured Excel annex.

> **Not for clinical use. Synthetic data only. No real PHI. No production health-system integration, authentication, messaging, or clinical decision support.**

## Live demo

[Open the Vercel deployment](https://hilabs-care-workbench.vercel.app)

The site is a static export. It does not use a Vercel function or an application server at runtime.

## Run and validate

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/queue`.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run export:annex
```

The build produces a static site in `out/`. The annex script writes `data/synthetic-annex.xlsx` from the same Zod-validated scenario records used by the app. The Data and Sources screen downloads the same workbook structure.

## What works in this prototype

- **Queue:** all 48 synthetic queue rows are filterable and ranked from their current records. Detailed cases link to Member 360 and outreach. Lightweight background cases open a real summary dialog rather than a dead-end detail route.
- **Prioritization:** executable rules inspect event timestamps, medication fill history, contact outcomes, pending utilization records, source quality, and open gaps. Weighted factors are derived from those inputs. The rules are illustrative and are not clinically validated.
- **Member review:** source, event time, received time, freshness, structured lab observations, medication details, and quality flags remain visible. Missing information is shown as unknown, not as proof that care did not occur.
- **Outreach:** route status is based on recorded contact evidence. Selecting an outcome records it in the local session; the prototype does not place calls or send messages.
- **Documentation:** deterministic drafts are labeled **Record-derived draft**, each generated line cites visible source records, and a nurse must confirm the drafts. The final note and care plan are saved in the current browser session.
- **Audit and state:** workflow changes, confirmations, overrides, and saved documentation persist in `sessionStorage`. Audit timestamps advance on a simulated scenario clock. This is not a durable or compliant production audit log.
- **Impact model:** case counts are read from the queue seed. Workflow volume, system counts, time inputs, and all reduction percentages are visible adjustable assumptions. No unsupported baseline or outcome target is presented as an observed fact.
- **Excel annex:** one summary sheet plus one sheet per data domain, with record and claim IDs, coding fields, structured lab values and units, event and received times, quality flags, and planted imperfections.

## Architecture

```text
Next.js App Router with static export
  ├─ (workbench): queue, member, outreach, documentation, impact, data, scope
  ├─ components: accessible navigation and workflow surfaces
  ├─ data/seed.ts: synthetic scenario records and lightweight queue cases
  ├─ data/datasets.ts: 16 source-domain definitions
  ├─ lib/engines.ts: executable action rules, scoring, freshness, queue metrics
  ├─ lib/annex-export.ts: shared browser and script workbook generation
  ├─ lib/store.ts: session persistence and simulated audit events
  └─ .github/workflows/ci.yml: lint, typecheck, test, and production build
```

Priority weights are configured as 35% clinical urgency, 25% recent events, 20% open gaps, 15% time sensitivity, and 5% source confidence. The band thresholds, program-level starting points, task-time estimates, and freshness windows are example configuration only. They require clinical, operational, and data-governance review before any real-world use.

## Data, assumptions, and limitations

- Five detailed scenarios and 43 lightweight cases represent the case brief's 48-case load. Every person, identifier, event, claim, observation, and contact detail is synthetic.
- The source catalogue describes integration concepts. No plan, pharmacy, EHR, HIE, provider, UM, or messaging system is connected.
- Source quality flags and the "planted imperfection" column are intentionally visible so data-quality decisions can be inspected.
- Impact defaults are assumptions, not cited benchmarks. The app provides their derivation and confidence and makes the reduction inputs adjustable. Collect a measured baseline before setting pilot targets.
- The rules prioritize review tasks only. They do not diagnose, assess risk, reconcile medication lists, or act autonomously. Protocol flags require human clinical review.
- There is no model endpoint. Documentation templates are deterministic and locally generated. No generated sentence is accepted without a source citation and explicit nurse confirmation.
- Production use would require clinical governance, validated data matching, authentication, authorization, secure storage, durable audit controls, accessibility testing, integration agreements, and legal/compliance review.

## Security and deployment

The app is configured with `output: "export"` and the deployment serves prebuilt static files. Do not switch to a self-hosted Next.js server without reassessing the Next.js 14 security advisories reported by `npm audit`. There is no patched Next.js 14 release available for all current advisories; upgrading across major versions is a separate compatibility change. PostCSS and ExcelJS's UUID dependency are pinned to patched compatible versions through npm overrides.

Deployments are configured on Vercel. For a new Vercel project, import the GitHub repository and use the standard Next.js build; static output is written to `out`. No environment variables are required.

GitHub Actions runs lint, typecheck, tests, and a production build on pushes to `main` and pull requests.
