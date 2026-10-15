import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseWorks, upsertWork, removeWork, newId, MAX_WORKS } from '../js/gallery.js';
import { STEPS } from '../js/guide.js';
import { HELP } from '../js/help.js';
import * as M from '../js/model.js';
import * as SW from '../js/swiss.js';
import * as SH from '../js/shell.js';

const model = (title) => ({ schema: 'x', meta: { title }, n: 1 });

test('gallery: upsert adds newest first, updates same id, copies the model', () => {
  const m = model('A');
  let w = upsertWork([], { id: 'w1', type: 'bowtie', model: m, now: 't1' });
  w = upsertWork(w, { id: 'w2', type: 'swiss', model: model('B'), now: 't2' });
  assert.deepEqual(w.map((x) => x.id), ['w2', 'w1']);
  m.meta.title = 'changed later';
  assert.equal(w[1].title, 'A'); // stored copy is independent
  w = upsertWork(w, { id: 'w1', type: 'bowtie', model: model('A2'), now: 't3' });
  assert.deepEqual(w.map((x) => [x.id, x.title]), [['w1', 'A2'], ['w2', 'B']]);
});
test('gallery: remove, cap, and defensive parsing', () => {
  let w = [];
  for (let i = 0; i < MAX_WORKS + 5; i++) w = upsertWork(w, { id: 'w' + i, type: 'bowtie', model: model('t' + i) });
  assert.equal(w.length, MAX_WORKS);
  assert.equal(removeWork(w, w[0].id).length, MAX_WORKS - 1);
  assert.deepEqual(parseWorks('not json'), []);
  assert.deepEqual(parseWorks('{"a":1}'), []);
  assert.deepEqual(parseWorks('[{"id":"x"},{"id":"y","type":"bowtie","model":{}}]').map((x) => x.id), ['y']);
  assert.notEqual(newId(1, 0.123), newId(1, 0.456));
});

test('guide: every step refers to existing help text and works on a fresh model', () => {
  const fresh = { bowtie: M.emptyModel(), swiss: SW.emptySwiss(), shell: SH.emptyShell() };
  for (const [type, steps] of Object.entries(STEPS)) {
    assert.ok(steps.length >= 4);
    for (const s of steps) {
      if (s.kind) for (const lang of ['th', 'en']) assert.ok(HELP[type][s.kind] && HELP[type][s.kind][lang].what, `${type}/${s.kind}/${lang}`);
      if (!s.kind) assert.ok(s.title || s.body, s.id);
      assert.equal(typeof s.done(fresh[type]), 'boolean');
      if (s.field) assert.equal(typeof fresh[type][s.field[0]][s.field[1]], 'string');
      if (s.list) assert.ok(Array.isArray(fresh[type][s.list.key]));
    }
  }
});
test('guide: steps become done when the model is filled', () => {
  const m = M.emptyModel();
  const by = Object.fromEntries(STEPS.bowtie.map((s) => [s.id, s]));
  assert.equal(by.hazard.done(m), false);
  m.hazard.text = 'h'; m.topEvent.text = 'te';
  M.addThreat(m, 't'); M.addConsequence(m, 'c');
  const c = M.addControl(m, 'prevent', m.threats[0].id, 'ctl');
  M.addEscalation(m, c.id, 'e');
  for (const id of ['hazard', 'topEvent', 'threat', 'consequence', 'control', 'escalation']) assert.equal(by[id].done(m), true, id);
});
