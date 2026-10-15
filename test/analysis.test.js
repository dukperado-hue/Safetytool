import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyModel, addThreat, addConsequence, addControl, addEscalation, addEscalationControl, validateShape, clone } from '../js/model.js';
import { addEvidence, addAssumption, checkEvidence, isIsoDate } from '../js/evidence.js';
import { simulateBowtie, withStates, failureImpact, assuranceRegister, validateBowtieExt, uncontrolledEscalations, bowtieToScenario, compareBowties } from '../js/bowtie-analysis.js';
import { emptySwiss, validateSwiss, analyzeSwiss, swissFromBowtie, addLayer, addHole } from '../js/swiss.js';
import { runSimulation } from '../js/scenario.js';

// Small illustrative bowtie: 2 threats (T1 has P1,P2 ; T2 has P3), 2 consequences (C1 has R1 ; C2 has none).
function bt(states = {}) {
  const m = emptyModel();
  m.meta.title = 'test bowtie'; m.hazard.text = 'hazard'; m.topEvent.text = 'top event';
  const t1 = addThreat(m, 't1'); const t2 = addThreat(m, 't2');
  const c1 = addConsequence(m, 'c1'); const c2 = addConsequence(m, 'c2');
  const p1 = addControl(m, 'prevent', t1.id, 'p1'); const p2 = addControl(m, 'prevent', t1.id, 'p2');
  const p3 = addControl(m, 'prevent', t2.id, 'p3'); const r1 = addControl(m, 'recover', c1.id, 'r1');
  const ids = { p1: p1.id, p2: p2.id, p3: p3.id, r1: r1.id, t1: t1.id, t2: t2.id, c1: c1.id, c2: c2.id };
  for (const [k, v] of Object.entries(states)) m.controls.find((c) => c.id === ids[k]).status = v;
  return { m, ids };
}
const all = (s) => ({ p1: s, p2: s, p3: s, r1: s });

test('bowtie sim: every control effective → all threats cut, top event not reached via modelled threats', () => {
  const { m } = bt(all('effective'));
  const { run } = simulateBowtie(m);
  assert.ok(run.threats.every((t) => t.result === 'cut'));
  assert.equal(run.topEvent.reach, 'no');
  assert.equal(run.consequences.find((c) => c.text === 'c2').result, 'open'); // no recovery control at all
});
test('bowtie sim: one working preventive control per threat is enough (series)', () => {
  const { m, ids } = bt({ p1: 'failed', p2: 'effective', p3: 'failed', r1: 'failed' });
  const { run } = simulateBowtie(m);
  assert.equal(run.threats.find((t) => t.id === ids.t1).result, 'cut');
  assert.equal(run.threats.find((t) => t.id === ids.t2).result, 'open');
  assert.equal(run.topEvent.reach, 'yes');
});
test('bowtie sim: uncontrolled start state is inconclusive, never "safe"', () => {
  const { m } = bt();
  const { run, warnings } = simulateBowtie(m);
  assert.ok(run.paths.every((p) => p.result !== 'cut'));
  assert.equal(run.topEvent.reach, 'possible');
  assert.ok(warnings.some((w) => w.startsWith('V-05')));
});
test('bowtie sim: full paths combine preventive and recovery barriers', () => {
  const { m, ids } = bt({ p1: 'failed', p2: 'failed', p3: 'failed', r1: 'effective' });
  const { run } = simulateBowtie(m);
  const p = (t, c) => run.paths.find((x) => x.threatId === ids[t] && x.consequenceId === ids[c]);
  assert.equal(p('t1', 'c1').result, 'cut'); // r1 recovers c1
  assert.equal(p('t1', 'c2').result, 'open'); // c2 has no recovery barrier
  assert.equal(run.summary.total, 4);
});
test('withStates never mutates the original; unknown control id throws', () => {
  const { m, ids } = bt(all('effective'));
  const before = JSON.stringify(m);
  const alt = withStates(m, { [ids.p1]: 'failed' });
  assert.equal(JSON.stringify(m), before);
  assert.equal(alt.controls.find((c) => c.id === ids.p1).status, 'failed');
  assert.throws(() => withStates(m, { nope: 'failed' }));
});
test('AC-08 bowtie run is reproducible', () => {
  const { m } = bt(all('effective'));
  assert.equal(simulateBowtie(m, { now: 'a' }).run.id, simulateBowtie(m, { now: 'b' }).run.id);
});
test('fragile cut: only blocker has an escalation factor with no escalation control', () => {
  const { m, ids } = bt({ p1: 'failed', p2: 'effective', p3: 'effective', r1: 'failed' });
  addEscalation(m, ids.p2, 'procedure out of date');
  assert.equal(uncontrolledEscalations(m).length, 1);
  const { run } = simulateBowtie(m);
  assert.ok(run.summary.fragileCuts >= 1);
  const e = m.escalations[0];
  addEscalationControl(m, e.id, 'annual procedure review');
  assert.equal(simulateBowtie(m).run.summary.fragileCuts, 0);
});
test('failureImpact lists the controls whose lone failure un-cuts paths', () => {
  const { m, ids } = bt(all('effective'));
  const rows = failureImpact(m).rows;
  const names = rows.map((r) => r.controlId);
  assert.ok(names.includes(ids.p3)); // only blocker of T2
  assert.ok(!names.includes(ids.p1)); // p2 still blocks T1
  assert.ok(!names.includes(ids.r1)); // every full path is also cut upstream by a preventive control
  // with only the recovery control left working, r1 becomes the single point of failure for C1 paths
  const lone = failureImpact(bt({ p1: 'failed', p2: 'failed', p3: 'failed', r1: 'effective' }).m).rows;
  assert.deepEqual(lone.map((r) => r.controlId), [ids.r1].map(() => lone[0].controlId));
  assert.equal(lone.length, 1);
  assert.equal(lone[0].newlyNotCut.length, 2); // T1→C1 and T2→C1
});
test('validation of the optional bowtie fields', () => {
  const { m, ids } = bt();
  m.controls[0].status = 'broken';
  m.controls[1].assurance = { nextReview: '31/12/2026' };
  m.controls[2].evidenceIds = ['ev_missing'];
  const e = validateBowtieExt(m).errors.join('\n');
  assert.match(e, /bad status/); assert.match(e, /YYYY-MM-DD/); assert.match(e, /V-07/);
  assert.equal(simulateBowtie(m).ok, false);
  assert.deepEqual(validateShape(bt().m), []);
  assert.ok(ids);
});
test('assurance register reports factual gaps and overdue reviews', () => {
  const { m, ids } = bt({ p1: 'effective' });
  const ev = addEvidence(m, 'OBSERVED', 'audit report (user supplied)');
  const c = m.controls.find((x) => x.id === ids.p1);
  c.owner = 'post A'; c.critical = true; c.evidenceIds = [ev.id];
  c.assurance = { performanceStandard: 'std', verification: 'audit', lastVerified: '2026-01-10', nextReview: '2026-06-01' };
  const rows = assuranceRegister(m, '2026-10-15');
  const r = rows.find((x) => x.controlId === ids.p1);
  assert.deepEqual(r.gaps, ['review overdue (2026-06-01)']);
  assert.equal(rows[0].controlId, ids.p1); // critical first
  assert.ok(rows.find((x) => x.controlId === ids.p2).gaps.includes('no owner'));
});
test('evidence rules: OBSERVED needs a source, hypothesis needs a way to verify, ids must resolve', () => {
  const m = emptyModel();
  addEvidence(m, 'OBSERVED', '');
  addAssumption(m, 'x');
  const r = checkEvidence(m, []);
  assert.ok(r.warnings.some((w) => w.startsWith('E-01')));
  assert.ok(r.warnings.some((w) => w.startsWith('E-03')));
  m.evidence[0].kind = 'PROVEN';
  assert.ok(checkEvidence(m, []).errors.length);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-02-28'), true);
});
test('bowtie → scenario engine agrees with the bowtie simulator; compareBowties works', () => {
  const { m, ids } = bt({ p1: 'failed', p2: 'failed', p3: 'effective', r1: 'failed' });
  const sc = runSimulation(bowtieToScenario(m)).run;
  const bw = simulateBowtie(m).run;
  const bySc = Object.fromEntries(sc.paths.map((p) => [p.key, p.result]));
  for (const p of bw.paths) assert.equal(bySc[p.key], p.result);
  const alt = withStates(m, { [ids.p1]: 'effective' });
  const d = compareBowties(m, alt).diff;
  assert.equal(d.label, 'Path Count Difference');
  assert.equal(d.structureChanged, false);
  assert.deepEqual(d.barrierChanges, [{ id: ids.p1, change: 'status', from: 'failed', to: 'effective' }]);
  assert.ok(d.newlyCut.length > 0);
});

test('swissFromBowtie: layers = controls on the route, holes = escalation factors, trajectory left empty', () => {
  const { m, ids } = bt();
  const e1 = addEscalation(m, ids.p1, 'staff not trained');
  addEscalation(m, ids.p2, 'equipment not maintained');
  addEscalationControl(m, e1.id, 'training programme');
  const s = swissFromBowtie(m, { threatId: ids.t1, consequenceId: ids.c1 });
  assert.equal(s.layers.length, 3); // p1, p2, r1
  assert.deepEqual(s.trajectory, []);
  assert.deepEqual(validateSwiss(s), []);
  const h = s.layers[0].holes[0];
  assert.equal(h.type, 'latent'); assert.equal(h.escalationId, e1.id); assert.match(h.notes, /training programme/);
  assert.match(s.layers[1].holes[0].notes, /No escalation control recorded/);
  const a = analyzeSwiss(s, m);
  assert.equal(a.uncontrolledHoles.length, 1);
  assert.equal(a.layersWithoutHoles.length, 1);
});
test('analyzeSwiss: common-cause groups across layers, HFACS counts, validation', () => {
  const s = emptySwiss();
  s.meta.title = 't'; s.hazard.text = 'h'; s.loss.text = 'l';
  const a = addLayer(s, 'A'); const b = addLayer(s, 'B'); addLayer(s, 'C');
  const h1 = addHole(s, a.id, 'x'); const h2 = addHole(s, b.id, 'y'); const h3 = addHole(s, b.id, 'z');
  h1.commonCauseId = h2.commonCauseId = 'cc1'; h3.commonCauseId = 'cc2';
  h1.hfacsLevel = 'organisational-influences';
  const r = analyzeSwiss(s);
  assert.equal(r.commonCause.length, 1); // cc2 is inside one layer only
  assert.deepEqual(r.commonCause[0].layerIds, [a.id, b.id]);
  assert.equal(r.hfacs.counts['organisational-influences'], 1);
  assert.equal(r.hfacs.unclassified, 2);
  assert.match(r.note, /not independent/);
  h3.hfacsLevel = 'made-up';
  assert.ok(validateSwiss(s).some((e) => /hfacsLevel/.test(e)));
});
test('clone helper still isolates models', () => {
  const { m } = bt();
  const c = clone(m); c.controls[0].status = 'failed';
  assert.equal(m.controls[0].status, undefined);
});
