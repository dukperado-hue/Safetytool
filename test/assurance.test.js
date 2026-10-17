import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../js/model.js';
import * as IC from '../js/interchange.js';
import { addEvidence } from '../js/evidence.js';
import { validateBowtieExt, simulateBowtie, assuranceRegister } from '../js/bowtie-analysis.js';
import { STATUS_STATES, STATE_MEANING, ACTION_STATUS, addAction, actionsOf, closureProblems, setActionStatus, recordAssessment, validateAssurance } from '../js/actions.js';
import { emptySwiss } from '../js/swiss.js';

const wildlife = () => JSON.parse(readFileSync(new URL('../data/example-wildlife.json', import.meta.url), 'utf8'));

function bt() {
  const m = M.emptyModel();
  m.meta.title = 'assurance test'; m.hazard.text = 'hazard'; m.topEvent.text = 'top event';
  const t1 = M.addThreat(m, 'threat'); const c1 = M.addConsequence(m, 'consequence');
  const p = M.addControl(m, 'prevent', t1.id, 'preventive barrier'); const r = M.addControl(m, 'recover', c1.id, 'recovery barrier');
  const ef = M.addEscalation(m, p.id, 'escalation factor'); const ec = M.addEscalationControl(m, ef.id, 'escalation factor control');
  return { m, t1, c1, p, r, ef, ec };
}
const closable = (m, a) => {
  const e = addEvidence(m, 'OBSERVED', 'work order'); e.reference = 'WO-1'; e.date = '2026-10-01';
  a.text = 'Replace the unit'; a.completionEvidenceIds.push(e.id); a.verification = { by: 'QA', at: '2026-10-02', note: 'checked' };
  return e;
};

// 1 ---------------------------------------------------------------- model, identifiers, relationships
test('model: every entity has a stable unique id; preventive and recovery barriers are distinct and linked by id', () => {
  const { m, t1, c1, p, r, ef, ec } = bt();
  assert.equal(p.side, 'prevent'); assert.equal(p.threatId, t1.id); assert.equal(r.side, 'recover'); assert.equal(r.consequenceId, c1.id);
  assert.equal(ef.controlId, p.id); assert.equal(ec.escalationId, ef.id);
  const ids = [m.hazard.id, m.topEvent.id, t1.id, c1.id, p.id, r.id, ef.id, ec.id];
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(M.validateShape(m), []);
});

test('model: a barrier on a missing threat, an escalation on a missing barrier and a duplicate id are all rejected', () => {
  const { m, p } = bt();
  const bad = M.clone(m); bad.controls[0].threatId = 'nope';
  assert.ok(M.validateShape(bad).some((e) => /unknown threat/.test(e)));
  const bad2 = M.clone(m); bad2.escalations[0].controlId = 'nope';
  assert.ok(M.validateShape(bad2).some((e) => /unknown control/.test(e)));
  const bad3 = M.clone(m); bad3.controls[1].id = p.id;
  assert.ok(M.validateShape(bad3).some((e) => /duplicate id/.test(e)));
});

// 2 ---------------------------------------------------------------- references
test('references: an action on a missing barrier, with missing completion evidence, or a duplicate id is an error', () => {
  const { m, p } = bt();
  const a = addAction(m, p.id, 'finding');
  assert.deepEqual(validateAssurance(m).errors, []);
  a.controlId = 'ct_missing';
  assert.ok(validateAssurance(m).errors.some((e) => /V-A23/.test(e)));
  a.controlId = p.id; a.completionEvidenceIds = ['ev_missing'];
  assert.ok(validateAssurance(m).errors.some((e) => /V-A26/.test(e)));
  a.completionEvidenceIds = []; a.id = p.id;
  assert.ok(validateAssurance(m).errors.some((e) => /V-A21/.test(e)));
});

// 3 + 4 ---------------------------------------------------------------- the four states
test('states: all four are defined with a plain-language meaning; unknown is neither failure nor effectiveness', () => {
  assert.deepEqual(STATUS_STATES, ['effective', 'degraded', 'failed', 'unknown']);
  STATUS_STATES.forEach((s) => { assert.ok(STATE_MEANING[s].en && STATE_MEANING[s].th); });
  assert.match(STATE_MEANING.unknown.en, /neither failure nor effectiveness/);
  assert.match(STATE_MEANING.degraded.en, /does not by itself mean/);
  const { m, p, r } = bt();
  // unknown (and never assessed) -> inconclusive, never cut and never open
  const u = simulateBowtie(m).run;
  assert.equal(u.threats[0].result, 'inconclusive');
  assert.equal(u.consequences[0].result, 'inconclusive');
  p.status = 'effective'; r.status = 'effective';
  assert.equal(simulateBowtie(m).run.threats[0].result, 'cut');
  p.status = 'failed';
  assert.equal(simulateBowtie(m).run.threats[0].result, 'open');
  p.status = 'degraded';
  assert.equal(simulateBowtie(m).run.threats[0].result, 'inconclusive', 'degraded without logic is not failed');
  p.status = 'degraded'; p.degradedLogic = 'blocks';
  assert.equal(simulateBowtie(m).run.threats[0].result, 'cut');
});

test('states: unknown raises no "effective needs evidence" and no "no corrective action" warning; effective without OBSERVED evidence does', () => {
  const { m, p } = bt();
  p.status = 'unknown';
  let w = validateBowtieExt(m).warnings.join('\n');
  assert.doesNotMatch(w, /V-A10|V-A30/);
  p.status = 'effective';
  w = validateBowtieExt(m).warnings.join('\n');
  assert.match(w, /V-A10/);
  const e = addEvidence(m, 'OBSERVED', 'inspection record'); e.reference = 'INS-1'; p.evidenceIds = [e.id];
  assert.doesNotMatch(validateBowtieExt(m).warnings.join('\n'), /V-A10/);
  const a = addEvidence(m, 'ASSESSED', 'my opinion'); p.evidenceIds = [a.id];
  assert.match(validateBowtieExt(m).warnings.join('\n'), /V-A10/, 'an analyst judgement is not observed evidence');
  p.status = 'degraded';
  assert.match(validateBowtieExt(m).warnings.join('\n'), /V-A30/);
});

test('states: a barrier state is never turned into a number', () => {
  const { m, p } = bt();
  p.status = 'failed';
  const run = simulateBowtie(m).run;
  assert.ok(!JSON.stringify(run.summary).match(/risk|probab|score/i));
  assert.ok(assuranceRegister(m).every((row) => !('score' in row) && !('risk' in row)));
});

// 5 ---------------------------------------------------------------- evidence and provenance
test('evidence: type, description, recorder and timestamps survive a save/reload; an unknown type is an error', () => {
  const { m, p } = bt();
  const e = addEvidence(m, 'OBSERVED', 'Airport inspection'); e.evidenceType = 'inspection'; e.description = 'Fence check'; e.recordedBy = 'Safety officer'; e.date = '2026-09-30'; e.reference = 'INS-77';
  p.evidenceIds = [e.id];
  assert.ok(e.recordedAt, 'creation time is recorded by the tool');
  assert.notEqual(e.recordedAt.slice(0, 10), '', 'recordedAt is separate from the observation date');
  const back = M.normalize(JSON.parse(JSON.stringify(m)));
  const e2 = back.evidence.find((x) => x.id === e.id);
  assert.deepEqual([e2.evidenceType, e2.description, e2.recordedBy, e2.recordedAt, e2.date, e2.reference], [e.evidenceType, e.description, e.recordedBy, e.recordedAt, e.date, e.reference]);
  assert.deepEqual(validateBowtieExt(back).errors, []);
  e2.evidenceType = 'rumour';
  assert.ok(validateBowtieExt(back).errors.some((x) => /evidenceType/.test(x)));
});

test('evidence: evidence and assumptions are different records and a link to evidence says nothing about causation', () => {
  const { m, p } = bt();
  const e = addEvidence(m, 'OBSERVED', 'x');
  assert.ok(m.evidence.includes(e)); assert.equal((m.assumptions || []).length, 0);
  assert.ok(!('causes' in e) && !('causal' in e));
  p.evidenceIds = [e.id];
  assert.ok(IC.entitiesOf(m).find((x) => x.id === e.id).type === 'evidence');
});

// 6 + 7 ---------------------------------------------------------------- actions
test('actions: an action keeps its link to the barrier through save/reload and through deleting other nodes', () => {
  const { m, p, r } = bt();
  const a = addAction(m, p.id, 'worn seal');
  const back = JSON.parse(JSON.stringify(m));
  assert.equal(back.correctiveActions[0].controlId, p.id);
  M.removeNode(back, r.id);
  assert.equal(actionsOf(back, p.id).length, 1);
  assert.equal(a.status, 'open');
});

test('actions: deleting the barrier keeps the action, drops the live link, remembers the barrier and warns', () => {
  const { m, p } = bt();
  const a = addAction(m, p.id, 'worn seal'); a.text = 'fix';
  M.removeNode(m, p.id);
  assert.equal(m.correctiveActions.length, 1);
  assert.equal(m.correctiveActions[0].controlId, null);
  assert.equal(m.correctiveActions[0].formerControl.id, p.id);
  assert.deepEqual(validateAssurance(m).errors, []);
  assert.ok(validateAssurance(m).warnings.some((w) => /V-A24/.test(w)));
});

test('actions: closing needs completion evidence and a verification record, in the right order', () => {
  const { m, p } = bt();
  const a = addAction(m, p.id, 'finding');
  assert.ok(closureProblems(m, a).length >= 3);
  let r = setActionStatus(m, a.id, 'closed');
  assert.equal(r.ok, false); assert.match(r.reason, /cannot move from open to closed/);
  assert.equal(setActionStatus(m, a.id, 'implemented').ok, true);
  r = setActionStatus(m, a.id, 'verified');
  assert.equal(r.ok, false); assert.ok(r.missing.some((x) => /completion evidence/.test(x)));
  assert.equal(a.status, 'implemented', 'a refused move changes nothing');
  closable(m, a);
  assert.deepEqual(closureProblems(m, a), []);
  assert.equal(setActionStatus(m, a.id, 'verified').ok, true);
  assert.equal(setActionStatus(m, a.id, 'closed', { now: '2026-10-05T10:00:00Z' }).ok, true);
  assert.equal(a.closedAt, '2026-10-05T10:00:00Z');
  assert.deepEqual(validateAssurance(m).errors, []);
  assert.equal(setActionStatus(m, a.id, 'open').ok, false, 'a closed action cannot be reopened silently');
});

test('actions: a closed or verified action that breaks the closure rules is invalid data', () => {
  const { m, p } = bt();
  const a = addAction(m, p.id, 'finding'); a.status = 'closed';
  assert.ok(validateAssurance(m).errors.some((e) => /V-A27/.test(e)));
  a.status = 'bogus';
  assert.ok(validateAssurance(m).errors.some((e) => /V-A22/.test(e)));
});

test('actions: closing an action does NOT change the barrier; it asks for reassessment and the history is append-only', () => {
  const { m, p } = bt();
  p.status = 'degraded'; p.degradedLogic = 'blocks'; p.assurance = { assessedBy: 'AM', assessedOn: '2026-09-01', performanceStandard: 'must hold 5 min' };
  const first = recordAssessment(p, { now: '2026-09-01T08:00:00.000Z' });
  const a = addAction(m, p.id, 'seal worn'); a.ownerRole = 'Maintenance manager';
  setActionStatus(m, a.id, 'implemented'); closable(m, a);
  setActionStatus(m, a.id, 'verified'); setActionStatus(m, a.id, 'closed', { now: '2026-10-05T00:00:00Z' });
  assert.equal(a.status, 'closed');
  assert.equal(p.status, 'degraded', 'barrier state is untouched');
  assert.equal(p.degradedLogic, 'blocks');
  const row = assuranceRegister(m, '2026-10-06').find((x) => x.controlId === p.id);
  assert.equal(row.status, 'degraded');
  assert.equal(row.actions.closed, 1); assert.equal(row.actions.reassessmentDue, true);
  assert.ok(row.gaps.some((g) => /reassess/.test(g)));
  // a new assessment is a new history entry; the first one is unchanged
  p.status = 'effective';
  const second = recordAssessment(p, { now: '2026-10-07T08:00:00.000Z' });
  assert.equal(p.assurance.history.length, 2);
  assert.equal(p.assurance.history[0], first); assert.equal(first.status, 'degraded'); assert.equal(second.status, 'effective');
  assert.equal(assuranceRegister(m, '2026-10-08').find((x) => x.controlId === p.id).actions.reassessmentDue, false);
});

test('actions: an action closed later on the SAME day as an assessment still asks for reassessment', () => {
  const { m, p } = bt();
  p.status = 'degraded';
  recordAssessment(p, { now: '2026-10-05T08:00:00.000Z' });
  const a = addAction(m, p.id, 'x'); setActionStatus(m, a.id, 'implemented'); closable(m, a);
  setActionStatus(m, a.id, 'verified'); setActionStatus(m, a.id, 'closed', { now: '2026-10-05T16:00:00.000Z' });
  assert.equal(assuranceRegister(m, '2026-10-06').find((x) => x.controlId === p.id).actions.reassessmentDue, true);
});

test('actions: action status is a separate vocabulary from the barrier state', () => {
  assert.ok(!ACTION_STATUS.some((s) => STATUS_STATES.includes(s)));
});

// 8 ---------------------------------------------------------------- interchange
async function roundTrip(models, links = []) {
  const pkg = await IC.buildPackage(models.map((model) => ({ model })), { links, now: '2026-10-16T00:00:00Z' });
  const wire = JSON.parse(JSON.stringify(pkg));
  const pv = await IC.validatePackage(wire, []);
  return { pkg: wire, pv, plan: IC.planImport(wire, pv, {}, { now: '2026-10-16T00:00:00Z' }) };
}

test('interchange: assurance, history, evidence, actions and ids survive a package round trip unchanged', async () => {
  const { m, p } = bt();
  p.status = 'degraded'; p.degradedLogic = 'blocks'; p.owner = 'Airside ops'; p.assurance = { performanceStandard: 'std', lastVerified: '2026-09-01', nextReview: '2027-01-01', assessedBy: 'AM', assessedOn: '2026-09-01', assessmentNotes: 'n' };
  const e = addEvidence(m, 'OBSERVED', 'Inspection'); e.evidenceType = 'inspection'; e.reference = 'INS-1'; e.date = '2026-09-01'; p.evidenceIds = [e.id];
  recordAssessment(p, { now: '2026-09-01T08:00:00.000Z' });
  const a = addAction(m, p.id, 'finding'); a.text = 'do it'; a.ownerRole = 'Maintenance'; a.dueDate = '2026-12-01';
  IC.ensureIdentity(m);
  const { pv, plan } = await roundTrip([m]);
  assert.equal(pv.ok, true, pv.errors.join('; '));
  const got = plan.actions[0].model;
  assert.equal(IC.canonical(got), IC.canonical(m), 'no supported field lost');
  assert.equal(got.correctiveActions[0].controlId, p.id);
  assert.equal(got.controls.find((c) => c.id === p.id).assurance.history.length, 1);
  assert.ok(IC.entitiesOf(got).some((x) => x.id === a.id && x.type === 'correctiveAction'));
});

test('interchange: an unsupported extra field on a bowtie is preserved and not silently dropped by the package', async () => {
  const { m } = bt(); IC.ensureIdentity(m);
  m.extraNote = { keep: 'me' };
  const { plan } = await roundTrip([m]);
  assert.deepEqual(plan.actions[0].model.extraNote, { keep: 'me' });
});

test('interchange: an invalid action in a package makes the member invalid; nothing is imported and existing data is untouched', async () => {
  const { m, p } = bt(); IC.ensureIdentity(m);
  const a = addAction(m, p.id, 'x'); a.status = 'closed';   // closed with no evidence or verification
  const pkg = await IC.buildPackage([{ model: m }], {});
  const wire = JSON.parse(JSON.stringify(pkg));
  const pv = await IC.validatePackage(wire, []);
  assert.equal(pv.ok, false);
  assert.ok(pv.errors.some((e) => /V-A27/.test(e)), pv.errors.join('|'));
  const plan = IC.planImport(wire, pv, {});
  assert.equal(plan.actions.length, 0);
});

test('interchange: a clashing model id is a conflict, never an overwrite by name', async () => {
  const { m } = bt(); IC.ensureIdentity(m);
  const pkg = JSON.parse(JSON.stringify(await IC.buildPackage([{ model: m }], {})));
  const other = M.clone(m); other.meta.title = 'same id, different content'; other.hazard.text = 'changed';
  const pv = await IC.validatePackage(pkg, [{ modelId: other.meta.modelId, type: 'bowtie', revision: 1, hash: await IC.contentHash(other), title: 'x' }]);
  assert.equal(pv.conflicts.length, 1);
  assert.equal(IC.planImport(pkg, pv, {}).actions.length, 0, 'unresolved conflicts are skipped');
});

test('interchange: a corrective action can be linked to another model without claiming causation', async () => {
  const { m, p } = bt(); IC.ensureIdentity(m);
  const a = addAction(m, p.id, 'x'); a.text = 'do';
  const sw = emptySwiss(); IC.ensureIdentity(sw);
  const swEnt = IC.entitiesOf(sw)[0];
  const models = new Map([[m.meta.modelId, m], [sw.meta.modelId, sw]]);
  const ok = IC.newLink({ modelId: m.meta.modelId, entityId: a.id }, { modelId: sw.meta.modelId, entityId: swEnt.id }, 'related_to');
  assert.deepEqual(IC.checkLinks([ok], models), []);
  const bad = IC.newLink({ modelId: m.meta.modelId, entityId: a.id }, { modelId: sw.meta.modelId, entityId: swEnt.id }, 'causes');
  assert.ok(IC.checkLinks([bad], models).some((i) => i.code === 'L-03'));
});

// 10 ---------------------------------------------------------------- legacy
test('legacy: a model saved before assurance history and corrective actions existed still validates, loads and simulates', () => {
  const m = wildlife();
  assert.ok(!('correctiveActions' in m));
  assert.deepEqual(M.validateShape(m), []);
  assert.deepEqual(validateBowtieExt(m).errors, []);
  M.normalize(m);
  assert.ok(simulateBowtie(m).ok);
  assert.ok(assuranceRegister(m).every((row) => row.actions.total === 0 && row.actions.reassessmentDue === false));
  assert.equal(IC.adapterOf(m).validate(m).length, 0);
});

test('legacy: the same model, saved and reloaded as JSON text, is identical in content', () => {
  const m = M.normalize(wildlife());
  assert.equal(IC.canonical(JSON.parse(JSON.stringify(m))), IC.canonical(m));
});
