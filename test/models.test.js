import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  emptySwiss, addLayer, addHole, removeLayer, removeHole, moveLayer, setAligned,
  validateSwiss, normalizeSwiss, lintSwiss, layoutSwiss, outlineSwiss, findSwiss,
} from '../js/swiss.js';
import {
  emptyShell, addItem, addFinding, removeShellNode, validateShell, normalizeShell, lintShell, layoutShell, outlineShell, findShell,
} from '../js/shell.js';
import { wrapText, _setSegmenter } from '../js/textmetrics.js';

const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(here, '..', 'data', f), 'utf8'));

// ---------- Swiss cheese ----------
test('swiss example validates, lints without errors, and has a complete trajectory', () => {
  const m = load('example-swiss.json');
  assert.deepEqual(validateSwiss(m), []);
  const issues = lintSwiss(normalizeSwiss(m));
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  assert.ok(issues.some((i) => i.rule === 'S012'));
});

test('swiss: only one aligned hole per layer; setAligned replaces', () => {
  const m = load('example-swiss.json');
  assert.equal(setAligned(m, 'ho_3', true), true);
  assert.ok(m.trajectory.includes('ho_3') && !m.trajectory.includes('ho_2'));
  assert.deepEqual(validateSwiss(m), []);
  m.trajectory.push('ho_2');
  assert.ok(validateSwiss(m).some((e) => e.includes('two holes')));
  setAligned(m, 'ho_3', false);
  assert.ok(!m.trajectory.includes('ho_3'));
});

test('swiss: removing layer/hole cleans the trajectory; moveLayer reorders', () => {
  const m = load('example-swiss.json');
  removeHole(m, 'ho_5');
  assert.ok(!m.trajectory.includes('ho_5'));
  removeLayer(m, 'ly_2');
  assert.ok(!m.trajectory.includes('ho_2'));
  assert.deepEqual(validateSwiss(m), []);
  assert.equal(moveLayer(m, 'ly_3', -1), true);
  assert.equal(m.layers[0].id, 'ly_3');
  assert.equal(moveLayer(m, 'ly_3', -1), false);
});

test('swiss lint: empty model, blocked trajectory, unclassified hole, all-active', () => {
  const e = lintSwiss(emptySwiss()).map((i) => i.rule);
  assert.ok(e.includes('S001') && e.includes('S002') && e.includes('S003'));

  const m = emptySwiss();
  m.hazard.text = 'Birds on and around the runway';
  m.loss.text = 'Bird strike damages the aircraft on landing';
  const a = addLayer(m, 'Aerodrome bird control programme');
  a.defence = 'Dispersal patrols before high-risk periods';
  const b = addLayer(m, 'Pilot decision making');
  b.defence = 'Go-around if birds are reported near the runway';
  const h1 = addHole(m, a.id, 'Patrol skipped because of staff shortage');
  h1.type = 'active';
  addHole(m, b.id, 'Crew continued to land after the warning'); // unclassified
  setAligned(m, h1.id, true); // layer b not aligned -> blocked
  const rules = lintSwiss(m);
  assert.ok(rules.some((i) => i.rule === 'S006'));
  assert.ok(rules.some((i) => i.rule === 'S008' && i.targetId === b.id));
  assert.ok(rules.some((i) => i.rule === 'S009')); // no latent condition recorded anywhere
});

test('swiss layout: aligned holes share the trajectory axis; walls where blocked; no overlaps', () => {
  const m = normalizeSwiss(load('example-swiss.json'));
  const L = layoutSwiss(m);
  const aligned = L.items.filter((i) => i.aligned);
  assert.equal(aligned.length, 4);
  const centres = new Set(aligned.map((i) => Math.round(i.y + i.h / 2)));
  assert.equal(centres.size, 1);
  for (let i = 0; i < L.items.length; i += 1) {
    for (let j = i + 1; j < L.items.length; j += 1) {
      const a = L.items[i]; const b = L.items[j];
      if (a.kind === 'layer' || b.kind === 'layer') continue; // slices are backgrounds
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!(ox && oy), `${a.id} overlaps ${b.id}`);
    }
  }
  m.trajectory = ['ho_1', 'ho_4']; // layers 2 and 4 blocked
  const L2 = layoutSwiss(m);
  assert.ok(L2.items.some((i) => i.kind === 'wall'));
  assert.ok(L2.links.some((l) => l.kind === 'trajStop'));
});

test('swiss findSwiss/outline work', () => {
  const m = load('example-swiss.json');
  assert.equal(findSwiss(m, 'ho_2').kind, 'holeLatent');
  assert.equal(findSwiss(m, 'ho_3').kind, 'holeActive');
  assert.match(outlineSwiss(m), /ALIGNED/);
});

// ---------- SHELL ----------
test('shell example validates and lints; findings keep severity/owner rules', () => {
  const m = load('example-shell.json');
  assert.deepEqual(validateShell(m), []);
  const issues = lintShell(normalizeShell(m));
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  // fd_2 is severity 3, no owner -> no H007; fd_1/fd_3 high severity have owners
  assert.ok(!issues.some((i) => i.rule === 'H007'));
});

test('shell lint: unknown interface, mismatch without finding, missing action, owner for high severity, status conflict', () => {
  const m = emptyShell();
  m.subject.text = 'Aircraft maintenance engineer on a night shift';
  m.focus.text = 'Replacing a component during a short ground time';
  const f = addFinding(m, 'LS', 'The task card step order differs from the manual');
  f.severity = 5;
  m.interfaces.LH.status = 'mismatch';
  m.interfaces.LE.status = 'match';
  addFinding(m, 'LE', 'Poor lighting at the work position');
  m.interfaces.LE.status = 'match';
  const r = lintShell(m);
  const has = (rule, id) => r.some((i) => i.rule === rule && (id === undefined || i.targetId === id));
  assert.ok(has('H004', 'sec_LL'));
  assert.ok(has('H005', 'sec_LH'));
  assert.ok(has('H006', f.id));
  assert.ok(has('H007', f.id));
  assert.ok(has('H008', 'sec_LE'));
});

test('shell validate catches duplicate ids and bad status; remove works', () => {
  const m = load('example-shell.json');
  m.interfaces.LS.status = 'weird';
  assert.ok(validateShell(m).some((e) => e.includes('bad status')));
  const m2 = load('example-shell.json');
  m2.components.S[0].id = 'it_3';
  assert.ok(validateShell(m2).some((e) => e.includes('duplicate id')));
  const m3 = load('example-shell.json');
  removeShellNode(m3, 'fd_1');
  assert.equal(m3.interfaces.LS.findings.length, 0);
  addItem(m3, 'S', 'New item');
  assert.equal(findShell(m3, 'fd_2').kind, 'finding');
});

test('shell layout: cross arrangement, no overlaps, positive coordinates', () => {
  const m = normalizeShell(load('example-shell.json'));
  const L = layoutShell(m);
  const get = (id) => L.items.find((i) => i.id === id);
  assert.ok(get('comp_S').y < get('if_LS').y && get('if_LS').y < get(m.subject.id).y);
  assert.ok(get(m.subject.id).y < get('if_LE').y && get('if_LE').y < get('comp_E').y);
  assert.ok(get('comp_L').x < get('if_LL').x && get('if_LL').x < get(m.subject.id).x);
  assert.ok(get(m.subject.id).x < get('if_LH').x && get('if_LH').x < get('comp_H').x);
  L.items.forEach((i) => assert.ok(i.x >= 0 && i.y >= 0, i.id));
  for (let i = 0; i < L.items.length; i += 1) {
    for (let j = i + 1; j < L.items.length; j += 1) {
      const a = L.items[i]; const b = L.items[j];
      const ox = a.x < b.x + b.w && b.x < a.x + a.w;
      const oy = a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!(ox && oy), `${a.id} overlaps ${b.id}`);
    }
  }
  assert.match(outlineShell(m), /INTERFACE L–S: MISMATCH/);
});

// ---------- Thai wrapping ----------
test('wrapText: never ends a line with an opening bracket or starts one with ๆ/closing bracket', () => {
  const samples = [
    'สัตว์ป่าอยู่ในเส้นทางของอากาศยานขณะขึ้น-ลงหรือเคลื่อนที่บนพื้นที่เคลื่อนไหว (Wildlife in the path of an aircraft on the movement area)',
    'ทำซ้ำๆ เป็นประจำ เช่น ตรวจรั้ว ฯลฯ และ (ตรวจสอบ) เป็นระยะ',
  ];
  for (const mode of ['segmenter', 'fallback']) {
    _setSegmenter(mode === 'fallback' ? null : undefined);
    for (const s of samples) {
      for (const w of [110, 130, 150, 170]) {
        wrapText(s, w, 12).forEach((line) => {
          assert.ok(!/[เ-ไ(]$/.test(line), `${mode} w=${w}: line ends badly: "${line}"`);
          assert.ok(!/^[ะ-ฺๅ-๎ๆ)]/.test(line), `${mode} w=${w}: line starts badly: "${line}"`);
          assert.ok(!/^\s/.test(line), `${mode} w=${w}: leading space`);
        });
      }
    }
  }
  _setSegmenter(undefined);
});
