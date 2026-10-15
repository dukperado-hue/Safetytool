import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickMatrix, ercLookup, validateErc, barrierContext } from '../js/erc.js';
import { validateBowtieExt, simulateBowtie } from '../js/bowtie-analysis.js';
import { emptyModel, addThreat, addConsequence, addControl } from '../js/model.js';

const file = JSON.parse(readFileSync(new URL('../data/erc-matrix.json', import.meta.url), 'utf8'));

test('org matrix: all 16 scored cells match the supplied reference image', () => {
  const m = pickMatrix(file);
  assert.equal(m.id, 'org-reference');
  const want = {
    catastrophic: [50, 102, 502, 2500], major: [10, 21, 101, 500], minor: [2, 4, 20, 100], noAccident: [1, 1, 1, 1],
  };
  const cols = ['effective', 'limited', 'minimal', 'notEffective'];
  for (const [row, scores] of Object.entries(want)) cols.forEach((c, i) => assert.equal(ercLookup(m, row, c).score, scores[i], row + '/' + c));
  const band = (r, c) => ercLookup(m, r, c).band;
  assert.equal(band('catastrophic', 'notEffective'), 'red');
  assert.equal(band('catastrophic', 'minimal'), 'red');
  assert.equal(band('catastrophic', 'effective'), 'yellow');
  assert.equal(band('major', 'notEffective'), 'red');
  assert.equal(band('major', 'effective'), 'green');
  assert.equal(band('minor', 'notEffective'), 'yellow');
  assert.equal(band('minor', 'limited'), 'green');
  assert.equal(band('noAccident', 'notEffective'), 'green');
  assert.equal(Math.max(...m.rows.flatMap((r) => r.cells.map((c) => c.score))), 2500);
});
test('erc lookup needs both answers and valid ids; never guesses', () => {
  const m = pickMatrix(file);
  assert.equal(ercLookup(m, 'major', null), null);
  assert.equal(ercLookup(m, null, 'limited'), null);
  assert.equal(ercLookup(m, 'nope', 'limited'), null);
  assert.equal(ercLookup(m, 'major', 'nope'), null);
  assert.equal(ercLookup(m, 'major', 'limited').action, null); // no action text is invented for the org matrix
});
test('reference ATSB preset is kept separate and flagged', () => {
  const a = pickMatrix(file, 'atsb-2013');
  assert.match(a.status, /REFERENCE ONLY/);
  assert.equal(ercLookup(a, 'highCapacityCatastrophic', 'notEffective').score, 12500);
  assert.equal(ercLookup(a, 'catastrophic', 'notEffective').action, 'Investigate and take action immediately');
  assert.equal(pickMatrix(file, 'missing'), null);
});
test('erc block validates; stored on a bowtie it does not affect the simulation', () => {
  const m = pickMatrix(file);
  assert.deepEqual(validateErc(null, m), []);
  assert.deepEqual(validateErc({ outcome: 'major', barriers: 'limited' }, m), []);
  assert.ok(validateErc({ outcome: 'zzz' }, m).length);
  assert.ok(validateErc({ barriers: 'good' }, m).length);
  const b = emptyModel();
  b.meta.title = 't'; b.hazard.text = 'h'; b.topEvent.text = 'te';
  const t = addThreat(b, 't'); const c = addConsequence(b, 'c');
  addControl(b, 'prevent', t.id, 'p'); addControl(b, 'recover', c.id, 'r');
  const before = simulateBowtie(b).run.id;
  b.erc = { matrix: 'org-reference', outcome: 'catastrophic', barriers: 'notEffective', rationale: 'x' };
  assert.deepEqual(validateBowtieExt(b).errors, []);
  assert.deepEqual(barrierContext(b), { effective: 0, degraded: 0, failed: 0, unknown: 2, total: 2 });
  b.erc.barriers = 'bad';
  assert.ok(validateBowtieExt(b).errors.some((e) => /erc.barriers/.test(e)));
  delete b.erc;
  assert.equal(simulateBowtie(b).run.id, before);
});
