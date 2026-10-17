# Barrier assurance and corrective actions (bowtie)

Status: implemented in `js/actions.js` (rules), `js/assurancepanel.js` (inspector UI), `js/bowtie-analysis.js` (validation hook, assurance register), `js/model.js` (`removeNode`), `js/interchange.js` (entity type, strict bowtie validation). Schema: `schema/bowtie.schema.json`. Tests: `test/assurance.test.js`.

All fields are **optional additions to `safetytool.bowtie/1`**. A model saved before they existed loads, validates and exports exactly as before; no migration, no version bump.

## What already existed and was reused

| Need | Existing mechanism |
|---|---|
| Entities with stable ids, preventive vs recovery barriers, escalation factors and their controls | `js/model.js` (`controls[].side = prevent \| recover`, `escalations`, `escalationControls`) |
| Barrier state | `control.status` = `effective \| degraded \| failed \| unknown` (+ `degradedLogic`), used by the path simulation |
| Owner, performance standard, last verified, next review, verification method | `control.owner`, `control.assurance.*` |
| Evidence and assumptions, kinds OBSERVED / ASSESSED / HYPOTHESISED | `js/evidence.js`, `model.evidence[]`, `model.assumptions[]`, `control.evidenceIds` |
| Cross-model links, provenance, packages | `js/interchange.js` (see INTEROP.md) |

## What was added

* `control.assurance.assessedBy`, `assessedOn`, `assessmentNotes` — who assessed, when, and the reasoning.
* `control.assurance.history[]` — **append-only** snapshots (`recordAssessment`). The UI offers "record this assessment" and shows the list read-only. An earlier entry is never edited or removed by the tool.
* `evidence[].evidenceType` (inspection, audit, test, measurement, report, document, interview, other), `description`, `recordedBy`, `recordedAt`. `recordedAt` is when the record was created in the tool; `date` stays the observation date. Nothing is invented: empty stays empty.
* `model.correctiveActions[]` — `{ id, controlId, finding, text, ownerRole, dueDate, status, completionEvidenceIds[], verification{by,at,note}, closedAt, createdAt, notes }`.
* Interchange entity type `correctiveAction`.

## Meaning of the barrier states

| State | Meaning | It does **not** mean |
|---|---|---|
| `effective` | The assessor states the barrier meets its performance standard. Should have OBSERVED evidence linked (warning `V-A10` if not). | A probability of success. |
| `degraded` | A deficiency or reduced capability is known. `degradedLogic` says whether the barrier still cuts the path. | That the barrier has failed. |
| `failed` | **This project's word for "ineffective"**: the assessor explicitly states the barrier cannot meet its performance standard. | A cause of any occurrence. |
| `unknown` (or empty) | Not enough information. Paths through it are *inconclusive*. | Failure, and also not effectiveness. |

The state is never computed from a single KPI, an occurrence, or the number of other barriers. No score, probability or "number of failed barriers" is produced anywhere.

## Corrective action workflow

`open → in_progress → implemented → verified → closed` (also `cancelled`; `cancelled → open`; a `closed` action cannot be reopened silently).

* `verified` and `closed` are refused unless: the action is described, **at least one existing completion evidence** is linked, and the verification has **a verifier and a valid date** (`closureProblems`). The same rule is checked when data is loaded (`V-A27`).
* **Action status and barrier state are separate vocabularies.** Closing an action never edits the barrier. The register instead shows `reassessmentDue` ("a corrective action was closed after the last recorded assessment"). A new assessment must be made and recorded by a person.
* A closed action is not proof that risk was reduced. The tool says nothing about residual risk.
* Deleting a barrier keeps its actions: `controlId` becomes `null`, `formerControl` remembers the barrier, and warning `V-A24` is shown. Nothing is destroyed silently.

## Validation codes (`validateAssurance`, merged into `validateBowtieExt`)

Errors: `V-A01/02` bad history entry · `V-A20/21` action id missing/duplicate · `V-A22` bad status · `V-A23` action points to a missing barrier · `V-A25` bad date · `V-A26` missing completion evidence · `V-A27` verified/closed without closure conditions.
Warnings: `V-A10` effective without OBSERVED evidence · `V-A11` review date passed · `V-A24` action without a barrier · `V-A28` overdue · `V-A29` no responsible role · `V-A30` degraded/failed barrier with no corrective action.

## Interchange

A bowtie travels inside a package with all of the above (the whole model is the member content; unknown extra fields are kept). `IC.ADAPTERS` for bowtie now runs the extension rules as well as the shape check, so a package or an opened file with a broken action or assurance record is rejected before anything is applied, with the reason shown. Opening a **saved browser slot** still uses the shape check only, so a half-typed date can never make a saved model disappear on reload; the problem is reported by validation instead.

## Limits

* Identity of evidence is per model. The same real inspection recorded in two models is two records; link them with `related_to` if wanted. Use `evidence.reference` for an external reference number. Avoid copying personal data or sensitive occurrence-report text into evidence records.
* Report/PDF output does not yet print the assessment history or the actions.
* The older `adequacy × reliability` band in `model.js` is an existing convention and is not used by anything added here.
