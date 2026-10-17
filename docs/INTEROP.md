# Interchange specification (format `safetytool.package`, version 1)

Status: implemented in `js/interchange.js`, `js/transform.js`, `js/linkspanel.js`, `cli/safetytool.js`. Schema: `schema/package.schema.json`.
Tests: `test/interchange.test.js`, `test/transform.test.js`, `test/cli-interop.test.js`.

## Principles

1. **Native models keep their own meaning.** The interchange layer only *references* entities by stable id; it never merges models or rewrites their schemas.
2. **Nothing is inferred.** A link never says "causes". Shared ids, temporal order or similar wording are not evidence of a relationship.
3. **Preview, then decide.** Importing and transforming only *return* a plan. Nothing is applied until the analyst confirms; nothing is overwritten silently.
4. **Provenance is kept apart from content.** Timestamps, revision numbers and export times are not part of a model's semantic hash.
5. **Imported data is never executed.** It is validated, stored as data, and displayed as text.

## Model identity and revision

| Field | Meaning |
|---|---|
| `meta.modelId` | Stable identity (`md_…`). Assigned once (`ensureIdentity`), never changed. |
| `meta.revision` | Integer. Increases when a model is exported and its semantic content differs from the previous export. |
| `meta.lastExportHash` | SHA-256 of the canonical content at the last export. |
| `meta.transformations[]` | History of transformations/imports that produced the model (`transformId`, `version`, `at`, `from`, `decisions`, `confirmations`, `omitted`, `summary`). |
| `evidence[]`, `assumptions[]` | The existing shared mechanism (`js/evidence.js`): `OBSERVED` (fact with a source), `ASSESSED` (analyst judgement), `HYPOTHESISED` (to verify). Optional on every model. |
| element `prov` | `{ origin: analyst \| reported \| generated, reviewed, via, from }`. `generated` = a Safetytool transformation suggestion; **a generated suggestion is not evidence**. |

**Canonical content** = the model with keys sorted and `meta.createdAt`, `meta.updatedAt`, `meta.revision`, `meta.lastExportHash`, and `meta.transformations[].at` removed. The **content hash** is SHA-256 of that text. Export time is never hashed.

## Entity vocabulary

`model, event, context, hazard, threat, consequence, loss, control, escalationFactor, safetyConstraint, uca, scenario, function, coupling, humanFactorsFinding, interface, defenceLayer, finding, evidence, assumption, eventCategory, eventCount, dataset, controlStructureNode, controlAction, item, subject`.
Each model maps its own elements to these types (`ADAPTERS` in `interchange.js`). Not every model has every type. STPA constraint text is addressable through the derived id `<hazardOrUcaId>#constraint`.

## Link relations (all defined; none asserts causation, equivalence or verification)

| Relation | Direction | Meaning |
|---|---|---|
| `related_to` | undirected | Both entities concern the same subject. No claim about cause, equivalence or verification. |
| `supports` | from → to | The source is offered as evidence or support for the target. Says nothing about strength or verification. |
| `derived_from` | from → to | The source was produced from the target by a recorded copy or transformation. Not independent verification. |
| `candidate_mapping` | from → to | The source is *proposed* to correspond to the target. Needs human review; not an equivalence. |
| `references` | from → to | The source cites or uses the target as a pointer (e.g. a constraint naming a control). No claim about effect. |

Link status: `proposed` (made by a transformation, not reviewed), `confirmed` (made or accepted by the analyst), `rejected`.
Mechanical provenance links (`derived_from` from a transformation) are recorded as `confirmed` with `by: "transformation"`; mapping suggestions (`candidate_mapping`, `references`) are always `proposed`.
A link: `{ id, from:{modelId,entityId}, to:{modelId,entityId}, relation, status, note, by, via }`. Validation (`checkLinks`): unknown relation, bad status, missing model, missing entity, duplicate id, self-link.
Workspace links are stored in the browser (`safetytool.links`); a standalone model JSON does **not** carry them — a package does.

## Package

One JSON file (`*.stpkg.json`):

```
{ format: "safetytool.package", formatVersion: 1, exportedAt, engine:{name,version,interop},
  packageHash,            // SHA-256 over members' (path, modelId, contentHash), sorted links, history — not exportedAt
  members: [{ path:"models/<type>-<modelId>.json", kind:"model", schema, type, modelId, revision, title, contentHash, content }],
  links: [...], history: [...], validation: {...}, unsupportedMembers: [...], extensions: {...} }
```

Limits and safety (`validatePackage`): format and version checked (newer versions are refused, versions below 1 have no migration path); at most 100 members; member `kind` must be `model`; paths must match `models/<name>.json` (no `..`, no leading `/`, no backslash, no scheme); `content` must be a JSON object; keys `__proto__`/`constructor`/`prototype` and strings containing `<script` or `javascript:` are rejected; duplicate paths and model ids are errors; each model is validated with its own validator; the recorded content hash is compared (a difference is a warning: edited after export?).
The browser panel also refuses files over 20 MB.

**Unknown fields.** Unknown top-level package fields are kept in `extensions`. Unknown fields inside a model stay in the model (native normalizers do not remove them) and survive a round trip (tested). A member with an unsupported `schema` is *set aside* (reported, not imported, listed in `unsupportedMembers`).

**Schema/version policy.** Only `safetytool.<type>/1` schemas exist today; an unknown schema string is "unsupported", never guessed. Future model-schema versions must add an entry to a migration registry before they can be imported; until then they are set aside.

## Import and conflicts

`validatePackage(pkg, existing)` → preview (`new` / `identical` / `conflict` / `invalid` / `unsupported` per member, usable links, warnings, conflicts). `planImport(pkg, preview, resolutions)` → actions. A *conflict* is the same `modelId` with a different content hash. Resolutions, chosen explicitly per conflict: `keep-existing`, `import-as-copy` (new `modelId`, revision 1, history entry, links remapped with **new link ids**), `replace` (the previous model is saved to the gallery first). **An unresolved conflict is skipped and reported.**
Links whose endpoints are not applied, or that are dangling, are dropped from the import and listed.
After an import-as-copy, older links still point at the original `modelId`; if that model is no longer in the workspace they show as "endpoint missing" and "Validate all linked models" reports them. Nothing is deleted automatically.

## Link health, deleting, and "Go to"

* **Link health is derived, never stored.** `linkHealth(link, models)` looks at both ends in the current workspace: `ok`, `broken-model` (an end's model is not in the workspace — `L-06`; an incomplete end is `L-05`) or `broken-entity` (the model is there, the entity is gone — `L-07`). It uses the same codes as `checkLinks`; relation and status validity (`L-03`, `L-04`) stay with `checkLinks`. Nothing is written onto the link.
* **Deleting is informed, not blocked.** Every delete in the editor (and "New", which replaces a whole model) first asks `deleteImpact(links, model, edit)`: the same edit is tried on a *copy*, the entities that would disappear (cascades included) are collected, and the links with an end on any of them are counted — each link once. If there are none, the confirmation is exactly what it was before. If there are, the message gives the count and says the links stay. After a confirmed delete the links are **not** changed or removed; they show as broken in the Connections tab and the user removes them with "Delete" when they wish.
* **"Go to"** (`navigationTarget`) switches to the model that holds the end (the open model of each type is kept as it is), selects the entity and centres it. An end that is broken has no button. Items that are not on a diagram (evidence, assumptions, shell interfaces) open the model and say so. A derived id `<id>#constraint` leads to the hazard or UCA it belongs to. Undo history of the model you leave is kept (it is per model type).
* **A link is a traceability reference, not a causal claim.** There is no causal relation type. `confirmed` means the analyst made or accepted the reference; it does not mean the referenced item is unchanged or that either item caused the other. `derived_from` records where something was copied from; it is not independent verification.
* **Events are not one concept.** `event` in the interchange vocabulary covers a bowtie's top event (`topEvent`), an HFACS event (`hfEvent`) and an Accident Pyramid record (`pyRecord`). The Connections panel now shows the native kind next to the type, so the three can be told apart; no shared event identity exists or is implied.

## Transformations

See `docs/TRANSFORMS.md`. CLI: `transforms`, `transform-preview`, `transform-run`; package commands `package-build`, `package-validate`, `package-diff`, `links-validate`, `inspect`, `assign-id`. Machine-readable output carries `"outputVersion": 1`.

## Known limitations

* Revision and `lastExportHash` are written by exporting; they are informational for people and used with the content hash for conflict detection.
* The package is a single JSON file, not a zip (no runtime dependencies). Evidence that lives outside the models (files, URLs) is only referenced by the text the analyst wrote.
* No digital signatures: a package hash detects accidental change, not tampering by someone who recomputes it.
* Conflict resolution works per model; there is no field-level merge.
