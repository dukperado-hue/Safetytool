import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  emptyModel, addThreat, addConsequence, addControl, addEscalation, addEscalationControl,
  removeNode, moveControl, controlsOf, validateShape, normalize, effectivenessBand, findNode,
} from '../js/model.js';
import { lint, isVague, summarize } from '../js/lint.js';
import { layoutBowtie } from '../js/layout.js';
import { wrapText } from '../js/textmetrics.js';

const here = dirname(fileURLToPath(import.meta.url));
const example = () => JSON.parse(readFileSync(join(here, '..', 'data', 'example-wildlife.json'), 'utf8'));

test('example file is structurally valid', () => {
  assert.deepEqual(validateShape(example()), []);
});

test('validateShape catches dangling references', () => {
  const m = example();
  m.controls[0].threatId = 'nope';
  assert.ok(validateShape(m).some((e) => e.includes('unknown threat')));
  const m2 = example();
  m2.escalations[0].controlId = 'nope';
  assert.ok(validateShape(m2).some((e) => e.includes('unknown control')));
  const m3 = example();
  m3.schema = 'x';
  assert.ok(validateShape(m3).some((e) => e.includes('unsupported schema')));
});

test('removeNode cascades from threat down to escalation controls', () => {
  const m = example();
  const n = removeNode(m, 'th_1'); // th_1 -> ct_1, ct_2 -> ef_1, ef_2 -> ec_1
  assert.equal(n, 1 + 2 + 2 + 1);
  assert.deepEqual(validateShape(m), []);
  assert.equal(m.escalationControls.some((x) => x.id === 'ec_1'), false);
});

test('removeNode on a control renumbers siblings', () => {
  const m = example();
  removeNode(m, 'ct_5');
  assert.deepEqual(controlsOf(m, 'prevent', 'th_4').map((c) => c.order), [0]);
});

test('moveControl swaps order', () => {
  const m = example();
  assert.equal(moveControl(m, 'ct_5', 1), true);
  assert.deepEqual(controlsOf(m, 'prevent', 'th_4').map((c) => c.id), ['ct_6', 'ct_5']);
  assert.equal(moveControl(m, 'ct_5', 1), false);
});

test('effectiveness bands', () => {
  assert.equal(effectivenessBand({ adequacy: null, reliability: 3 }), null);
  assert.equal(effectivenessBand({ adequacy: 1, reliability: 3 }), 'poor');
  assert.equal(effectivenessBand({ adequacy: 2, reliability: 3 }), 'weak');
  assert.equal(effectivenessBand({ adequacy: 3, reliability: 3 }), 'fair');
  assert.equal(effectivenessBand({ adequacy: 4, reliability: 4 }), 'strong');
});

test('lint: empty model reports hazard and top event errors', () => {
  const issues = lint(emptyModel());
  const rules = issues.map((i) => i.rule);
  assert.ok(rules.includes('L001'));
  assert.ok(rules.includes('L002'));
  assert.equal(summarize(issues).error, 2);
});

test('lint: threat without control, single-point, and no-effect consequence', () => {
  const m = emptyModel();
  m.hazard.text = 'Wildlife on the aerodrome';
  m.topEvent.text = 'Wildlife in the path of an aircraft on the runway';
  const t1 = addThreat(m, 'Birds flock onto the grass area near the runway');
  const t2 = addThreat(m, 'Fence damaged allowing animals onto the movement area');
  addControl(m, 'prevent', t2.id, 'Inspect the perimeter fence on a fixed schedule');
  const c1 = addConsequence(m, 'No effect');
  const rules = lint(m).map((i) => [i.rule, i.targetId]);
  assert.ok(rules.some(([r, id]) => r === 'L003' && id === t1.id));
  assert.ok(rules.some(([r, id]) => r === 'L008' && id === t2.id));
  assert.ok(rules.some(([r, id]) => r === 'L009' && id === c1.id));
  assert.ok(rules.some(([r, id]) => r === 'L004' && id === c1.id));
});

test('lint: escalation factor that only negates the control', () => {
  const m = emptyModel();
  m.hazard.text = 'Driving on a busy road';
  m.topEvent.text = 'Driver loses control of the car';
  const t = addThreat(m, 'Tyre blow-out at speed on the motorway');
  const c = addControl(m, 'prevent', t.id, 'Conflict visually detected by driver');
  const e = addEscalation(m, c.id, 'Conflict not visually detected by driver');
  addEscalationControl(m, e.id, 'Driver training for low visibility conditions');
  const e2 = addEscalation(m, c.id, 'Low visibility conditions prevent visual detection by driver');
  assert.ok(lint(m).some((i) => i.rule === 'L012' && i.targetId === e.id));
  assert.ok(!lint(m).some((i) => i.rule === 'L012' && i.targetId === e2.id));
});

test('lint: critical control without owner; hazard that reads like an event', () => {
  const m = emptyModel();
  m.hazard.text = 'Runway excursion on landing';
  m.topEvent.text = 'Aircraft cannot stop within the available distance';
  const t = addThreat(m, 'Unstable approach continued to landing');
  const c = addControl(m, 'prevent', t.id, 'Mandatory go-around criteria in the operations manual');
  c.critical = true;
  const rules = lint(m).map((i) => i.rule);
  assert.ok(rules.includes('L010'));
  assert.ok(rules.includes('L016'));
});

test('isVague works for Latin and Thai', () => {
  assert.equal(isVague('ATC'), true);
  assert.equal(isVague('ATC detect incorrect presence on runway and issue instructions'), false);
  assert.equal(isVague('ตรวจรั้ว'), true);
  assert.equal(isVague('เจ้าหน้าที่ลาดตระเวนไล่สัตว์ตามตารางทุกวัน'), false);
});

test('layout places every node once, in order left-to-right, with positive coordinates', () => {
  const m = normalize(example());
  const L = layoutBowtie(m, { showEsc: true });
  const ids = L.nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  const expected = 2 + m.threats.length + m.consequences.length + m.controls.length + m.escalations.length + m.escalationControls.length;
  assert.equal(ids.length, expected);
  L.nodes.forEach((n) => { assert.ok(n.x >= 0 && n.y >= 0, n.id); });
  const x = (id) => L.nodes.find((n) => n.id === id).x;
  assert.ok(x('th_4') < x('ct_5') && x('ct_5') < x('ct_6') && x('ct_6') < x('te_1'));
  assert.ok(x('te_1') < x('ct_7') && x('ct_7') < x('ct_8') && x('ct_8') < x('co_1'));
  L.links.forEach((l) => assert.match(l.d, /^M[\d. -]+/));
});

test('layout has no overlapping boxes in the same column', () => {
  const m = normalize(example());
  const L = layoutBowtie(m, { showEsc: true });
  for (let i = 0; i < L.nodes.length; i += 1) {
    for (let j = i + 1; j < L.nodes.length; j += 1) {
      const a = L.nodes[i]; const b = L.nodes[j];
      const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
      const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!(overlapX && overlapY), `${a.id} overlaps ${b.id}`);
    }
  }
});

test('layout of an empty model does not throw', () => {
  const L = layoutBowtie(emptyModel());
  assert.equal(L.nodes.length, 2);
});

test('wrapText never returns empty and respects width for Thai', () => {
  assert.equal(wrapText('', 100).length, 1);
  const lines = wrapText('เจ้าหน้าที่ลาดตระเวนไล่สัตว์ตามตารางและก่อนเที่ยวบินในช่วงเสี่ยง', 120, 12);
  assert.ok(lines.length > 1);
  assert.equal(lines.join('').replace(/\s/g, ''), 'เจ้าหน้าที่ลาดตระเวนไล่สัตว์ตามตารางและก่อนเที่ยวบินในช่วงเสี่ยง');
});

test('findNode resolves every id in the example', () => {
  const m = example();
  const all = [m.hazard, m.topEvent, ...m.threats, ...m.consequences, ...m.controls, ...m.escalations, ...m.escalationControls];
  all.forEach((n) => assert.ok(findNode(m, n.id), n.id));
});
