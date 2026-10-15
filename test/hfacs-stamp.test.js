import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as HF from '../js/hfacs.js';
import * as ST from '../js/stamp.js';
import { STEPS, GUIDE_STRINGS } from '../js/guide.js';

const ex = (f) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));

test('hfacs: the taxonomy has 4 levels and 17 categories, each in a known level', () => {
  assert.equal(HF.LEVELS.length, 4);
  assert.equal(HF.CATEGORIES.length, 17);
  assert.deepEqual(HF.LEVELS.map((l) => HF.categoriesOf(l).length), [3, 4, 5, 5]);
  HF.CATEGORIES.forEach((c) => { assert.ok(HF.LEVELS.includes(c.level)); assert.ok(c.th && c.en && c.def.th && c.def.en); });
});

test('hfacs: an influence only runs from a higher level to a lower one, and survives re-classification only if still valid', () => {
  const m = HF.emptyHfacs();
  const a = HF.addFactor(m, 'resource-management', 'Training hours cut');
  const b = HF.addFactor(m, 'decision-errors', 'Landing continued');
  assert.equal(HF.link(m, a.id, b.id), true);
  assert.equal(HF.link(m, b.id, a.id), false, 'bottom-up is refused');
  assert.equal(HF.link(m, a.id, a.id), false);
  b.category = 'inadequate-supervision'; // now above... still below org, so valid
  HF.pruneInfluences(m);
  assert.deepEqual(a.influences, [b.id]);
  b.category = null;
  HF.pruneInfluences(m);
  assert.deepEqual(a.influences, [], 'unclassified target drops the link');
  HF.removeFactor(m, a.id);
  assert.equal(m.factors.length, 1);
});

test('hfacs: validation and lint', () => {
  const m = HF.emptyHfacs();
  m.event.text = 'An invented event for the test';
  const act = HF.addFactor(m, 'skill-based-errors', 'Brakes were applied late after touchdown');
  assert.deepEqual(HF.validateHfacs(m), []);
  assert.ok(HF.lintHfacs(m).some((i) => i.rule === 'F005'), 'only unsafe acts → look above the act');
  const bad = JSON.parse(JSON.stringify(m)); bad.factors[0].category = 'nope';
  assert.ok(HF.validateHfacs(bad).length);
  const viol = HF.addFactor(m, 'routine-violations', 'Crew skipped the checklist habitually');
  assert.ok(HF.lintHfacs(m).some((i) => i.rule === 'F008' && i.targetId === viol.id), 'a violation without evidence is a warning');
  void act;
});

test('hfacs: the example validates, lints clean and the layout has a card per factor, clickable', () => {
  const m = HF.normalizeHfacs(ex('example-hfacs.json'));
  assert.deepEqual(HF.validateHfacs(m), []);
  assert.equal(HF.lintHfacs(m).filter((i) => i.severity !== 'info').length, 0);
  const g = HF.layoutHfacs(m, { lang: 'en' });
  m.factors.forEach((f) => assert.ok(g.items.find((i) => i.id === f.id && !i.inert), f.id));
  assert.ok(g.items.find((i) => i.id === m.event.id));
  assert.equal(g.links.filter((l) => l.kind === 'infl').length, m.factors.reduce((s, f) => s + f.influences.length, 0));
  assert.ok(HF.outlineHfacs(m).includes('LEVEL 4'));
});

test('stamp: validation refuses a control action that starts at a process, a UCA on feedback, and unknown references', () => {
  const m = ST.emptyStamp();
  const c = ST.addNode(m, 'controller', 'Crew'); const p = ST.addNode(m, 'process', 'Aircraft');
  const fb = ST.addAction(m, 'feedback', p.id, c.id, 'View');
  const ok = ST.addAction(m, 'control', c.id, p.id, 'Brake');
  assert.deepEqual(ST.validateStamp(m), []);
  const u = ST.addUca(m, fb.id);
  assert.ok(ST.validateStamp(m).some((e) => /control action/.test(e)));
  u.actionId = ok.id;
  assert.deepEqual(ST.validateStamp(m), []);
  const bad = ST.addAction(m, 'control', p.id, c.id, 'wrong way');
  assert.ok(ST.validateStamp(m).some((e) => /must start at a controller/.test(e)));
  ST.removeStampNode(m, bad.id);
  assert.equal(ST.UCA_TYPES.length, 4);
});

test('stamp: deleting a node removes its actions, their UCAs and scenarios', () => {
  const m = ST.emptyStamp();
  const c = ST.addNode(m, 'controller', 'Crew'); const p = ST.addNode(m, 'process', 'Aircraft');
  const a = ST.addAction(m, 'control', c.id, p.id, 'Brake');
  const u = ST.addUca(m, a.id); ST.addScenario(m, u.id, 'why');
  ST.removeStampNode(m, p.id);
  assert.equal(m.actions.length, 0); assert.equal(m.ucas.length, 0); assert.equal(m.scenarios.length, 0);
  assert.deepEqual(ST.validateStamp(m), []);
});

test('stamp: "no UCA recorded" is reported as unknown, never as safe; the grid covers every control action', () => {
  const m = ST.normalizeStamp(ex('example-stamp.json'));
  assert.deepEqual(ST.validateStamp(m), []);
  const a = ST.analyzeStamp(m);
  assert.equal(a.grid.length, m.actions.filter((x) => x.kind === 'control').length);
  assert.ok(a.ucasWithoutScenario.length > 0, 'the example leaves some scenarios open on purpose');
  const q = ST.emptyStamp(); q.system.text = 'A system for the test';
  const c = ST.addNode(q, 'controller', 'Crew'); const p = ST.addNode(q, 'process', 'Aircraft'); ST.addAction(q, 'control', c.id, p.id, 'Brake the aircraft');
  const l = ST.lintStamp(q);
  assert.ok(l.some((i) => i.rule === 'S007' && /unknown/.test(i.en)));
  assert.ok(l.some((i) => i.rule === 'S016'), 'a controller with no feedback is flagged');
});

test('stamp: layout puts controllers above the process, has arrows for every action and labels that can be clicked', () => {
  const m = ST.normalizeStamp(ex('example-stamp.json'));
  const g = ST.layoutStamp(m, { lang: 'en' });
  const top = g.items.find((i) => i.id === m.nodes.find((n) => n.level === 0).id);
  const proc = g.items.find((i) => i.id === m.nodes.find((n) => n.role === 'process').id);
  assert.ok(top.y < proc.y);
  assert.equal(g.links.length, m.actions.length);
  m.actions.forEach((a) => assert.ok(g.items.find((i) => i.id === a.id && !i.inert), a.id));
  assert.ok(g.links.every((l) => /^M[\d.,-]+( [VH][\d.-]+)*$/.test(l.d)), 'only M/H/V commands (normalizeGeom shifts these)');
  assert.ok(ST.outlineStamp(m).includes('UNSAFE CONTROL ACTIONS'));
});

test('guide: HFACS and STAMP steps are writable (groups add items to the model)', () => {
  const L = GUIDE_STRINGS.en;
  const h = HF.emptyHfacs();
  const org = STEPS.hfacs.find((s) => s.id === 'lvl-organisational-influences').groups(h, L);
  assert.equal(org.length, 3);
  org[0].add(h);
  assert.equal(h.factors[0].category, 'resource-management');
  const m = ST.emptyStamp();
  STEPS.stamp.find((s) => s.id === 'controllers').groups(m, L)[0].add(m);
  STEPS.stamp.find((s) => s.id === 'process').groups(m, L)[0].add(m);
  const acts = STEPS.stamp.find((s) => s.id === 'actions').groups(m, L);
  acts[0].add(m).from = m.nodes[0].id;
  assert.equal(m.actions[0].kind, 'control');
  m.actions[0].to = m.nodes[1].id;
  const ucas = STEPS.stamp.find((s) => s.id === 'ucas').groups(m, L);
  assert.equal(ucas.length, 1);
  ucas[0].add(m);
  assert.equal(ucas[0].prop, 'context');
  assert.equal(STEPS.stamp.find((s) => s.id === 'scenarios').groups(m, L).length, 1);
});
