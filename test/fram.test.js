import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as FR from '../js/fram.js';

const ex = () => FR.normalizeFram(JSON.parse(readFileSync(new URL('../data/example-fram.json', import.meta.url), 'utf8')));

test('fram: a function has exactly the six aspects, each starting as "unknown" (not assessed)', () => {
  const m = FR.emptyFram();
  const f = FR.addFunction(m, 'Plan fuel');
  assert.deepEqual(Object.keys(f.aspects), ['input', 'output', 'precondition', 'resource', 'control', 'time']);
  assert.ok(Object.values(f.aspects).every((a) => a.status === 'unknown' && a.items.length === 0));
  assert.deepEqual(FR.validateFram(m), []);
});

test('fram: couplings must start at an Output and end at another aspect of an existing function', () => {
  const m = FR.emptyFram();
  const a = FR.addFunction(m, 'A'); const b = FR.addFunction(m, 'B');
  const c = FR.addCoupling(m, { functionId: a.id }, { functionId: b.id, aspect: 'input' });
  assert.deepEqual(FR.validateFram(m), []);
  c.from.aspect = 'input';
  assert.ok(FR.validateFram(m).some((e) => /must start at an Output/.test(e)));
  c.from.aspect = 'output'; c.to.aspect = 'output';
  assert.ok(FR.validateFram(m).some((e) => /must end at Input/.test(e)));
  c.to.aspect = 'time'; c.to.functionId = 'fn_missing';
  assert.ok(FR.validateFram(m).some((e) => /target function not found/.test(e)));
});

test('fram: removing a function removes its couplings; ids stay stable', () => {
  const m = FR.emptyFram();
  const a = FR.addFunction(m, 'A'); const b = FR.addFunction(m, 'B'); const c = FR.addFunction(m, 'C');
  FR.addCoupling(m, { functionId: a.id }, { functionId: b.id, aspect: 'input' });
  FR.addCoupling(m, { functionId: b.id }, { functionId: c.id, aspect: 'control' });
  const ids = m.functions.map((f) => f.id);
  FR.removeFramNode(m, b.id);
  assert.equal(m.couplings.length, 0);
  assert.deepEqual(m.functions.map((f) => f.id), [ids[0], ids[2]], 'remaining ids unchanged');
  assert.deepEqual(FR.validateFram(m), []);
});

test('fram lint: unknown aspects are reported as not assessed, never as fine', () => {
  const m = FR.emptyFram(); m.activity.text = 'Invented activity for the test';
  FR.addFunction(m, 'Do the thing');
  const l = FR.lintFram(m);
  assert.ok(l.some((i) => i.rule === 'FR004' && /does not mean there is none/.test(i.en)));
  assert.ok(l.some((i) => i.rule === 'FR007'), 'input/output missing');
  assert.ok(l.some((i) => i.rule === 'FR013'), 'no limitations written');
  assert.ok(!l.some((i) => i.severity === 'error'));
});

test('fram lint: observed variability needs evidence; unreviewed generated items and assumptions are flagged', () => {
  const m = FR.emptyFram(); m.activity.text = 'Invented activity for the test';
  const f = FR.addFunction(m, 'Do the thing');
  const v = FR.addVariability(m, f.id, 'Timing varies'); v.state = 'observed';
  assert.ok(FR.lintFram(m).some((i) => i.rule === 'FR017' && i.targetId === v.id));
  m.evidence.push({ id: 'ev_t', kind: 'OBSERVED', source: 'Invented', date: '', reference: 'R1', limitation: '', confidence: null });
  v.evidenceIds.push('ev_t');
  assert.ok(!FR.lintFram(m).some((i) => i.rule === 'FR017'));
  const it = FR.addAspectItem(m, f.id, 'resource', 'Fuel truck', { origin: 'generated', reviewed: false });
  assert.ok(FR.lintFram(m).some((i) => i.rule === 'FR011' && i.targetId === it.id));
  m.assumptions.push({ id: 'as_t', statement: 'x', kind: 'HYPOTHESISED', reviewed: false });
  assert.ok(FR.lintFram(m).some((i) => i.rule === 'FR012'));
  assert.deepEqual(FR.validateFram(m), []);
  v.evidenceIds.push('ev_missing');
  assert.ok(FR.validateFram(m).some((e) => /ev_missing/.test(e)), 'dangling evidence reference');
});

test('fram: a coupling into an aspect that is not described is flagged as inconsistent', () => {
  const m = FR.emptyFram(); m.activity.text = 'Invented activity for the test';
  const a = FR.addFunction(m, 'A'); const b = FR.addFunction(m, 'B');
  FR.addCoupling(m, { functionId: a.id }, { functionId: b.id, aspect: 'time' });
  assert.ok(FR.lintFram(m).some((i) => i.rule === 'FR009'));
});

test('fram: no numeric variability, resonance or probability field exists anywhere in the model or the example', () => {
  const m = ex();
  const text = JSON.stringify(m);
  assert.ok(!/resonance|probab|score|likelihood/i.test(text.replace(/"scope":"[^"]*"|"limitations":"[^"]*"/g, '')));
  m.functions.forEach((f) => f.variability.forEach((v) => assert.ok(!('value' in v) && !('score' in v))));
});

test('fram: example validates; layout draws one hexagon per function, one line per coupling, and every function is clickable', () => {
  const m = ex();
  assert.deepEqual(FR.validateFram(m), []);
  const g = FR.layoutFram(m, { lang: 'en' });
  m.functions.forEach((f) => { const it = g.items.find((i) => i.id === f.id); assert.ok(it && !it.inert); assert.ok(it.prims.some((p) => p.t === 'poly' && p.pts.length === 6), 'hexagon'); assert.equal(it.prims.filter((p) => p.t === 'circle').length, 6, 'six aspect vertices'); });
  assert.equal(g.links.length, m.couplings.length);
  assert.ok(g.links.every((l) => /^M[\d.,-]+( [VH][\d.-]+)*$/.test(l.d)));
  m.couplings.forEach((c) => assert.ok(g.items.find((i) => i.id === c.id)));
  assert.ok(FR.outlineFram(m).includes('COUPLINGS'));
  assert.equal(FR.lintFram(m).filter((i) => i.severity === 'error').length, 0);
});

test('fram: the layout places a downstream function to the right of the one it receives from', () => {
  const m = ex();
  const g = FR.layoutFram(m);
  const plan = g.items.find((i) => i.id === m.functions[0].id); const check = g.items.find((i) => i.id === m.functions[3].id);
  assert.ok(check.x > plan.x);
});
