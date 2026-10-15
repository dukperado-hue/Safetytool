import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyScenario, validateScenario, runSimulation, enumeratePaths, makeAlternative, compareRuns, resolveAdrep, findCycle, MODEL_VERSION } from '../js/scenario.js';

const load = (f) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const example = () => load('example-scenario.json');

// Serial chain T → X → Y → C with barriers A, B, C1 on one edge each (spec 6.3).
function chain(statuses, logic = {}) {
  const s = emptyScenario();
  s.meta.id = 'SCN-T'; s.meta.title = 'chain';
  s.nodes = [{ id: 'T', kind: 'threat' }, { id: 'X', kind: 'event' }, { id: 'Y', kind: 'event' }, { id: 'C', kind: 'consequence' }];
  s.edges = [{ id: 'e1', from: 'T', to: 'X', barrierIds: ['A'] }, { id: 'e2', from: 'X', to: 'Y', barrierIds: ['B'] }, { id: 'e3', from: 'Y', to: 'C', barrierIds: ['C1'] }];
  s.barriers = ['A', 'B', 'C1'].map((id, i) => ({ id, name: id, status: statuses[i], degradedLogic: logic[id] || null }));
  return s;
}
const res = (s) => runSimulation(s).run.paths[0].result;

test('AC-03 any working barrier cuts a serial path', () => {
  assert.equal(res(chain(['effective', 'effective', 'effective'])), 'cut');
  assert.equal(res(chain(['failed', 'failed', 'effective'])), 'cut');
  assert.equal(res(chain(['failed', 'effective', 'failed'])), 'cut');
});
test('AC-04 all barriers failed → path reaches the consequence', () => {
  assert.equal(res(chain(['failed', 'failed', 'failed'])), 'open');
});
test('AC-05 unknown / degraded-without-logic is never a definite result', () => {
  assert.equal(res(chain(['failed', 'unknown', 'failed'])), 'inconclusive');
  assert.equal(res(chain(['failed', 'degraded', 'failed'])), 'inconclusive');
  const r = runSimulation(chain(['failed', 'unknown', 'failed']));
  assert.match(r.run.paths[0].reason, /does not mean the barrier failed/);
  assert.ok(r.warnings.some((w) => w.startsWith('V-05')));
});
test('a working barrier still cuts the path even if another is unknown', () => {
  assert.equal(res(chain(['unknown', 'effective', 'failed'])), 'cut');
});
test('degraded with explicit logic is resolved', () => {
  assert.equal(res(chain(['failed', 'degraded', 'failed'], { B: 'blocks' })), 'cut');
  assert.equal(res(chain(['failed', 'degraded', 'failed'], { B: 'fails' })), 'open');
});
test('a path with no barriers is open', () => {
  const s = chain(['failed', 'failed', 'failed']);
  s.edges.forEach((e) => { e.barrierIds = []; });
  s.barriers = [];
  assert.equal(res(s), 'open');
});

test('multiple paths and a barrier shared by several paths', () => {
  const s = example();
  assert.equal(enumeratePaths(s).length, 2);
  assert.equal(runSimulation(s).run.summary.cut, 2); // BR-04 is on the shared final edge
  s.barriers.find((b) => b.id === 'BR-04').status = 'failed';
  const byKey = Object.fromEntries(runSimulation(s).run.paths.map((p) => [p.key, p.result]));
  assert.equal(byKey['HZ-01>TH-01>EV-01>CS-01'], 'cut'); // BR-01 effective
  assert.equal(byKey['HZ-01>TH-02>EV-01>CS-01'], 'inconclusive'); // BR-02 unknown, BR-03 degraded
});
test('one barrier linked to two consequences', () => {
  const s = chain(['effective', 'failed', 'failed']);
  s.nodes.push({ id: 'C2', kind: 'consequence' });
  s.edges.push({ id: 'e4', from: 'X', to: 'C2', barrierIds: ['A'] });
  const { run } = runSimulation(s);
  assert.equal(run.paths.length, 2);
  assert.ok(run.paths.every((p) => p.result === 'cut'));
});

test('AC-08 same input → same run id and results', () => {
  const a = runSimulation(example(), { now: 't1' }).run;
  const b = runSimulation(example(), { now: 't2' }).run;
  assert.equal(a.id, b.id);
  assert.deepEqual(a.paths, b.paths);
  assert.equal(a.modelVersion, MODEL_VERSION);
});
test('run keeps an input snapshot independent of later edits', () => {
  const s = example();
  const { run } = runSimulation(s);
  s.barriers[0].status = 'failed';
  assert.equal(run.inputSnapshot.barriers[0].status, 'effective');
});

test('validation: V-01, V-02, V-03, V-04, V-07, V-10', () => {
  const s = example(); s.meta.title = '';
  assert.ok(validateScenario(s).errors.some((e) => e.startsWith('V-01')));
  const d = example(); d.barriers[1].id = 'BR-01';
  assert.ok(validateScenario(d).errors.some((e) => e.startsWith('V-02')));
  const m = example(); m.edges[2].barrierIds.push('BR-99');
  assert.ok(validateScenario(m).errors.some((e) => e.startsWith('V-03')));
  const c = example(); c.edges.push({ id: 'E-99', from: 'EV-01', to: 'TH-01', barrierIds: [] });
  assert.ok(findCycle(c));
  assert.ok(validateScenario(c).errors.some((e) => e.startsWith('V-04')));
  const ev = example(); ev.barriers[0].evidenceIds = ['EV-404'];
  assert.ok(validateScenario(ev).errors.some((e) => e.startsWith('V-07')));
  assert.ok(validateScenario({ schema: 'x' }).errors.length);
  assert.equal(runSimulation(c).ok, false);
});

test('AC-06 alternative does not touch the baseline; diff lists barrier + path changes', () => {
  const base = example();
  const before = JSON.stringify(base);
  const alt = makeAlternative(base, 'SCN-0001-ALT', 'entry procedure confirmed failed');
  alt.barriers.find((b) => b.id === 'BR-02').status = 'failed';
  assert.equal(JSON.stringify(base), before);
  const d = compareRuns(runSimulation(base).run, runSimulation(alt).run);
  assert.equal(d.label, 'Path Count Difference');
  assert.deepEqual(d.barrierChanges, [{ id: 'BR-02', change: 'status', from: 'unknown', to: 'failed' }]);
  assert.equal(d.structureChanged, false);
  assert.equal(d.inBoth.length, 2);
});
test('AC-11 structural change is flagged and not read as a risk change', () => {
  const base = example();
  const alt = makeAlternative(base, 'ALT', 'alt');
  alt.barriers.push({ id: 'BR-05', name: 'Stop bars', status: 'effective', degradedLogic: null });
  alt.edges.find((e) => e.id === 'E-05').barrierIds.push('BR-05');
  alt.nodes.push({ id: 'CS-02', kind: 'consequence' });
  alt.edges.push({ id: 'E-06', from: 'EV-01', to: 'CS-02', barrierIds: [] });
  const d = compareRuns(runSimulation(base).run, runSimulation(alt).run);
  assert.equal(d.structureChanged, true);
  assert.ok(d.notes.some((n) => /not like-for-like/.test(n)));
  assert.equal(d.onlyAlternative.length, 2);
  assert.ok(!JSON.stringify(d).toLowerCase().includes('risk reduc'));
});

test('ADREP ids resolve against the extracted taxonomy', () => {
  const tax = load('adrep-taxonomy.json');
  assert.equal(resolveAdrep(example(), tax).categories[0].code, 'RI');
  const s = example(); s.adrep.occurrenceCategoryIds = [99999];
  assert.equal(resolveAdrep(s, tax).categories[0].unknown, true);
  const codes = tax.occurrenceCategories.map((c) => c.code);
  for (const c of ['LOC-I', 'CFIT', 'MAC', 'RE', 'BIRD', 'WILD']) assert.ok(codes.includes(c), c);
});
