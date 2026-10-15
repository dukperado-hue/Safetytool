import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';
import { simulateBowtie, withStates } from '../js/bowtie-analysis.js';
import { layoutBowtie } from '../js/layout.js';
import { lint } from '../js/lint.js';

function build() {
  const m = M.emptyModel();
  m.hazard.text = 'Wildlife on the aerodrome';
  m.topEvent.text = 'Aircraft contacts wildlife during take-off or landing';
  const a = M.addThreat(m, 'Birds settle on the grass');
  const b = M.addThreat(m, 'Mammals cross the perimeter');
  const co = M.addConsequence(m, 'Collision on the runway');
  const fence = M.addControl(m, 'prevent', a.id, 'Perimeter fence inspected on a schedule');
  const own = M.addControl(m, 'prevent', b.id, 'Dispersal patrol before movements');
  const rec = M.addControl(m, 'recover', co.id, 'Runway inspection after a strike');
  [fence, own, rec].forEach((c) => { c.status = 'effective'; });
  return { m, a, b, co, fence, own, rec };
}

test('shared: one control stands on several lanes, its own controls first', () => {
  const { m, a, b, fence, own } = build();
  assert.equal(M.setShared(m, fence.id, [b.id]), true);
  assert.deepEqual(M.controlsOf(m, 'prevent', a.id).map((c) => c.id), [fence.id]);
  assert.deepEqual(M.controlsOf(m, 'prevent', b.id).map((c) => c.id), [own.id, fence.id]);
  assert.equal(M.isSharedIn(fence, b.id), true);
  assert.equal(M.isSharedIn(fence, a.id), false);
  assert.deepEqual(M.lanesOf(fence), [a.id, b.id]);
  assert.equal(m.controls.length, 3, 'still one control object');
});

test('shared: setShared ignores its own lane, wrong-kind ids and duplicates; empty clears the field', () => {
  const { m, a, b, co, fence } = build();
  M.setShared(m, fence.id, [a.id, co.id, b.id, b.id, 'nope']);
  assert.deepEqual(fence.sharedWith, [b.id]);
  M.setShared(m, fence.id, []);
  assert.equal('sharedWith' in fence, false);
});

test('shared: adding or moving controls only counts a lane\'s own controls', () => {
  const { m, a, b, fence } = build();
  M.setShared(m, fence.id, [b.id]);
  const extra = M.addControl(m, 'prevent', b.id, 'Another control on the second threat');
  assert.equal(extra.order, 1, 'shared control does not take an order slot in the other lane');
  assert.equal(M.moveControl(m, fence.id, 1), false, 'a single own control cannot move');
  void a;
});

test('shared: validateShape rejects unknown, repeated-own and duplicate lanes', () => {
  const { m, a, b, fence } = build();
  fence.sharedWith = ['th_missing'];
  assert.match(M.validateShape(m).join(';'), /unknown threat/);
  fence.sharedWith = [a.id];
  assert.match(M.validateShape(m).join(';'), /repeats its own lane/);
  fence.sharedWith = [b.id, b.id];
  assert.match(M.validateShape(m).join(';'), /duplicate/);
  fence.sharedWith = [b.id];
  assert.deepEqual(M.validateShape(m), []);
});

test('shared: deleting the control\'s home threat hands it to the next lane instead of deleting it', () => {
  const { m, a, b, fence } = build();
  M.setShared(m, fence.id, [b.id]);
  M.removeNode(m, a.id);
  assert.ok(m.controls.find((c) => c.id === fence.id), 'control survives');
  assert.equal(fence.threatId, b.id);
  assert.equal('sharedWith' in fence, false);
  assert.deepEqual(M.validateShape(m), []);
});

test('shared: deleting a lane it was only shared into drops just the reference', () => {
  const { m, a, b, fence } = build();
  M.setShared(m, fence.id, [b.id]);
  M.removeNode(m, b.id);
  assert.ok(m.controls.find((c) => c.id === fence.id));
  assert.equal(fence.threatId, a.id);
  assert.equal('sharedWith' in fence, false);
});

test('shared: a failed shared control fails on every lane, but a lane with another holding control stays cut', () => {
  const { m, a, b, fence } = build();
  M.setShared(m, fence.id, [b.id]);
  const ok = simulateBowtie(m).run;
  assert.equal(ok.summary.cut, 2);
  const failed = simulateBowtie(withStates(m, { [fence.id]: 'failed' })).run;
  const byThreat = (t) => failed.threats.find((x) => x.id === t).result;
  assert.equal(byThreat(a.id), 'open');
  assert.equal(byThreat(b.id), 'cut', 'the second threat still has its own holding control');
});

test('shared: layout draws a reference box per lane with unique ids and no duplicate escalation stack', () => {
  const { m, a, b, fence } = build();
  M.addEscalation(m, fence.id, 'Fence damaged by flooding');
  M.setShared(m, fence.id, [b.id]);
  const L = layoutBowtie(m, { showEsc: true });
  const ids = L.nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'node ids are unique');
  const ref = L.nodes.find((n) => n.shared);
  assert.ok(ref && ref.realId === fence.id && ref.id === fence.id + '@' + b.id);
  assert.equal(L.nodes.filter((n) => n.kind === 'escalation').length, 1);
  void a;
});

test('shared: lint still works and does not flag a shared control as missing from a lane', () => {
  const { m, b, fence } = build();
  M.setShared(m, fence.id, [b.id]);
  const issues = lint(m);
  assert.ok(!issues.some((i) => i.rule === 'L003'), 'both threats have a preventive control');
});
