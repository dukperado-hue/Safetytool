# AGENTS.md — working rules for Claude (and other AI assistants) on Safetytool

Safetytool is a **free, browser-based workbench for aviation-safety models** (bowtie first; fault tree, Swiss cheese and Shell/other models later).
Intended users: aviation safety practitioners, a Wildlife Hazard Management Committee, airborne-object/UAS safety work, and researchers who cite the models in papers.
Because outputs may be used in committees and papers, **precision and traceability matter more than speed or polish.**

## Ground rules (non-negotiable)

1. **Never invent facts.** No made-up statistics, regulations, document numbers, quotations or case details. If something is unknown, write `unknown` / leave the field empty and say so. Put a source (title + URL or document id + date accessed) in the element's `notes` for anything that is not common-sense method guidance.
2. **Never copy copyrighted material.** Do not reproduce text, templates, diagrams, icons or file formats from BowTieXP (Enablon/Wolters Kluwer), the UK CAA bowtie templates, CASA bowties, or any paywalled/licensed source. Re-express the *method* in our own words. Our own data format is `safetytool.bowtie/1` (see `schema/bowtie.schema.json`); we do not read or write `.btf`/`.XP` files.
3. **Do not reverse engineer** BowTieXP or any other vendor software. Features come from published methodology and our own design.
4. **Examples must be labelled** `meta.illustrative: true` and must not look like real operator or regulator data.
5. Models are **thinking and communication aids**; they are not certified safety advice. Keep the disclaimer in the UI and exports.
6. The sibling folder `../` (BowTieXP manual, MSI, CAA templates, papers) is **reference material and is excluded from the public repo. Never commit, copy or link it from this project.**

## The loop to follow on every model change

```
node cli/safetytool.js validate <file.json>      # structure must be OK (exit 0)
node cli/safetytool.js lint <file.json> --json   # read every finding; fix errors, justify or fix warnings
node cli/safetytool.js outline <file.json>       # re-read the model as plain text before reporting on it
npm test                                         # when code (js/, cli/) changed
```
Report findings from these commands, not from memory of the file. When summarising a model, quote element text exactly and cite ids.

## Model types (detected from the file's `schema` field; all CLI commands work on all of them)

| `schema` | Model | JSON Schema | Key idea |
|---|---|---|---|
| `safetytool.bowtie/1` | Bowtie | `schema/bowtie.schema.json` | hazard · top event · threats · preventive/recovery controls · escalation factors |
| `safetytool.swiss/1` | Swiss cheese (J. Reason) | `schema/swiss.schema.json` | defence layers with holes (`active` failure vs `latent` condition); `trajectory` = aligned holes, one per layer |
| `safetytool.shell/1` | SHELL (human factors; Liveware at centre) | `schema/shell.schema.json` | components S/H/E/L + interfaces LS/LH/LE/LL with `status` (unknown/match/mismatch) and findings (severity 1–5, action, owner) |
| `safetytool.hfacs/1` | HFACS classification of one occurrence | `schema/hfacs.schema.json` | `event` + `factors[]` each with one of 17 `category` ids (4 levels), `evidence`, and `influences[]` (ids of factors at a LOWER level only) |
| `safetytool.stamp/1` | STAMP / STPA control structure | `schema/stamp.schema.json` | `system`, `losses`, `hazards` (→ loss ids, `constraint`), `nodes` (controller/process, `level`, `processModel`), `actions` (control down / feedback up), `ucas` (one of 4 types, `context`, hazard ids), `scenarios` |

HFACS and STAMP/STPA rules: the HFACS taxonomy follows Shappell & Wiegmann, DOT/FAA/AM-00/7 (2000) — category names are theirs, definitions are our wording; other editions differ, so say which edition is meant. Skybrary's HFACS page could not be read by our tools (bot check), so it was **not** used as a source. STAMP/STPA follows Leveson, *Engineering a Safer World* (2012) and the MIT 16.63J notes. Neither model has probabilities or scores. An empty HFACS level or an empty UCA cell means **not examined or none found (unknown) — never "safe"**; the lint rules say so. Do not mark a factor as a violation without evidence of intent. Display codes (HF-01, CA-1, UCA-1 …) are derived from list order, never stored.

"Shell" is ambiguous (the human-factors SHELL model vs Shell the company's bowtie style). The tool implements the **human-factors SHELL model**; confirm with the user if they meant something else. Fault tree is planned, not built.

Swiss cheese writing rules: layers are defences between hazard and loss; a hole is a weakness of that layer. Prefer finding **latent conditions** behind each active failure; do not blame individuals. Only mark holes as aligned on the trajectory when the user's facts support it. SHELL writing rules: describe roles not names; every mismatch finding gets an action, severe ones (4–5) an owner.

## Data model in one paragraph (bowtie)

`hazard` and `topEvent` (one each) · `threats[]` (left) · `consequences[]` (right) · `controls[]` each with `side` (`prevent` → `threatId`, `recover` → `consequenceId`) and `order` (position along the path, 0 = nearest the threat/top event as built) · `escalations[]` (each → one `controlId`) · `escalationControls[]` (each → one `escalationId`; we deliberately go only one escalation level deep). Control attributes: `function` (eliminate/prevent/reduce/mitigate), `type` (policy/equipment/warning/human/automated), `critical`, `adequacy` and `reliability` (1–4 each; effectiveness = product), `owner` (a real post, not "CEO"). Threats carry `exposure` (1–5, assessed *before* controls), consequences carry `severity` (1–5). The effectiveness bands and 1–4 scales are **our own convention**, not taken from any regulator.

## Writing good elements (our wording of public method guidance)

- **Hazard**: a condition, object or activity that sets the scope — not an event or a failure.
- **Top event**: the moment control of the hazard is lost; not yet an accident. Hardest and most important step. Several top events for one hazard → several linked bowties.
- **Threat**: a direct cause that can produce the top event *on its own*, written as an event ("flock settles on the grass"), not as a control failure.
- **Consequence**: an event that follows an uncontrolled top event ("collision on the runway"), not a vague outcome; no "nothing happens" entries; merge consequences that share identical controls.
- **Control**: one sentence naming who/what does which action. Include weak controls and rate them honestly (avoid defaulting to mid-range).
- **Escalation factor**: a credible condition that degrades a control, stated with its reason; never merely the negation of the control; must not itself cause the top event.
- Keep diagrams readable (roughly ≤ 120 elements); otherwise split into linked bowties.

## Domain notes for the first use cases

- **Wildlife hazard management (aerodromes):** typical threat families — attractants on/off the aerodrome, wildlife movement and migration, habitat and grass management, fencing, bird/animal control activities, reporting/strike data, NOTAM/ATIS warnings. Do not quote strike statistics or local species facts unless the user supplies a source.
- **Airborne objects:** the exact scope (UAS/drones, balloons, unidentified objects, bird-like objects) must be agreed with the user before modelling. Ask; do not assume.
- **Papers:** the model JSON is the reproducible artefact. Keep `schema`, `meta.updatedAt`, and the git tag/commit referenced in the paper's methods section. Report lint results as a limitation, not as validation.

## Code conventions

- Vanilla JS ES modules, no build step, no runtime dependencies; must run on GitHub Pages and from `node cli/serve.js`.
- `js/model.js`, `js/lint.js`, `js/layout.js`, `js/textmetrics.js` are **pure** (no DOM) and covered by `test/model.test.js`. Add a test for every new rule or model operation.
- UI strings live in `js/i18n.js` (Thai + English). Technical bowtie terms stay in English.
- Accessibility is a requirement: keyboard operable, labelled controls, a table view equivalent to the diagram, no information by colour alone.
- Never store personal data. Autosave is browser-local only.

## When unsure

Ask the user. Especially for: scope definitions, which regulator/ICAO document applies, whether a statement needs a citation, licence choices, and anything that would be published.

## Analysis layer (added 2026-10-15)

- `safetytool.scenario/1` (`schema/scenario.schema.json`, `js/scenario.js`): hazard/threat/event/consequence nodes, edges carrying barriers, deterministic series rule → each path is `cut` / `open` / `inconclusive`. Unknown or degraded-without-logic is **never** treated as cut or failed.
- Bowtie optional fields (`js/bowtie-analysis.js`): control `status` (effective/degraded/failed/unknown; missing = unknown), `degradedLogic`, `assurance{performanceStandard,verification,lastVerified,nextReview}`, `evidenceIds`, plus model-level `evidence[]`, `assumptions[]`, `adrep`.
- Swiss optional fields: layer `controlId`; hole `hfacsLevel`, `commonCauseId`, `escalationId`. `swissFromBowtie` builds the deep-dive view (holes = escalation factors) and leaves the trajectory empty on purpose.
- New CLI: `simulate [--set id=status[:blocks|fails]]`, `impact`, `register [--as-of]`, `diff`, `swiss-from-bowtie`. Report these outputs, not memory.
- Wording rule: a changed path count is a **Path Count Difference**, never "risk reduction"; "reachable" means "not shown to be cut", never "will occur".
- `data/adrep-taxonomy.json`: ICAO ADREP ids/codes/names only (see docs/SOURCES.md); source PDFs stay outside the repo.

## UI tabs added after the engine (2026-10)
- Bowtie tabs: diagram, Simulate (barrier states, Swiss builder, ERC), Compare (pinned baseline vs open model), Report, table, info.
- Swiss tabs: form, diagram, Analysis (common cause, HFACS counts, trajectory, uncontrolled holes), table, info.
- Inspector for a control: state, assurance, evidence, assumptions (js/assurancepanel.js).
- js/report.js is pure (HTML string, escapes all text); js/reporttab.js does print/download. Reports never print signatures, approvals or compliance claims.
- Shared controls: a control may carry `sharedWith: [threatId|consequenceId, ...]` — ONE object (one state, one evidence set) standing on several lanes. `controlsOf()` returns own controls then shared ones, so simulate/lint/layout/report all follow; `primaryControlsOf()` is for ordering. Escalation factors are drawn only under the control's home lane. Deleting a control's home lane hands it to its next lane (never deletes it). Edit it in the inspector ("Shared with other threats").
- Swiss and SHELL pictures are built from positioned primitives (`prims`: text/rect/line/chip) attached to layout items; `render.js` only draws them. Swiss: banner (trajectory state), layer chips HELD/PENETRATED (only when the analyst chose a trajectory), legend. SHELL: component cards with item rows, interface cards with ■ ▲ ? status chips, summary strip. Items with `inert` are not clickable.
- Engine messages stay English in the engine/CLI; `js/msgs.js` (`localizeMsg`) gives the Thai text in the UI and report. Add a rule there whenever the engine gets a new message (a test fails if a bowtie message has no Thai rule).
- Persistence (browser-local): pinned baseline `safetytool.baseline`, Swiss source bowtie `safetytool.swissSource` (cleared when another file is loaded).
- Narrow screens (<=900px): the page scrolls as a whole; toolbar/tabs scroll sideways; the stage is 58vh; two-finger pinch zooms the diagram.
- Licence (working default, owner may change): MIT for code, CC BY 4.0 for own content; ADREP taxonomy and the ERC matrix are excluded (`LICENSE-CONTENT.md`).
- Bowtie cards (Stitch style): header row = derived code (TH-01, CT-03 …) + chip (control state as glyph + word, or EXP/SEV); control footer = function, ★ critical, ⇄ shared, owner, 4-segment strength meter (adequacy × reliability). `bowtieCodes()` in layout.js.
- New model types follow the Swiss/SHELL pattern: a pure module with `empty/validate/normalize/lint/find/layout/outline`, a layout that returns positioned primitives (`js/hfacs.js`, `js/stamp.js`), a form in `forms.js`, Analysis tab + table rows + CSV in `newtabs.js`, help in `help.js`, guide steps in `guide.js`, an entry in the `TYPES` registry (app.js) and in `cli/safetytool.js`. Layout link paths may only use M/H/V commands (`normalizeGeom` shifts only those).
- FRAM (js/fram.js) and Accident Pyramid (js/pyramid.js) are models 6 and 7; the interchange layer (js/interchange.js: identity, entity index, links, packages), transformations (js/transform.js) and the Connections panel (js/linkspanel.js) are specified in docs/INTEROP.md and docs/TRANSFORMS.md. Rules: link relations never mean causation; transformations only preview until confirmed and never overwrite; FRAM has no scores; the pyramid has no built-in ratio and shows counts only without a valid denominator; imported data is never executed.
- Service worker cache name must be bumped when the shell file list changes (currently safetytool-v10). 	est/shell-files.test.js checks the list.