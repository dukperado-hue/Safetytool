import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../js/model.js';
import { simulateBowtie, compareBowties, withStates } from '../js/bowtie-analysis.js';
import { localizeMsg } from '../js/msgs.js';

const ex = () => M.normalize(JSON.parse(readFileSync(new URL('../data/example-wildlife.json', import.meta.url), 'utf8')));

test('msgs: English passes through untouched; unknown text is never dropped', () => {
  assert.equal(localizeMsg('anything', 'en'), 'anything');
  assert.equal(localizeMsg('a message with no rule', 'th'), 'a message with no rule');
  assert.equal(localizeMsg(undefined, 'th'), undefined);
});

test('msgs: every message the bowtie engine produces has a Thai rendering', () => {
  const m = ex();
  m.controls[0].status = 'degraded';          // degraded without logic -> V-06 + inconclusive
  m.controls[1].status = 'failed';
  m.controls[2].status = 'effective';
  const sim = simulateBowtie(m);
  assert.ok(sim.ok);
  const texts = [
    ...sim.run.warnings, ...sim.run.limitations,
    ...sim.run.threats.map((t) => t.reason), ...sim.run.consequences.map((c) => c.reason), ...sim.run.paths.map((p) => p.reason),
  ];
  const alt = withStates(m, { [m.controls[0].id]: 'failed' });
  const cmp = compareBowties(m, alt);
  assert.ok(cmp.ok);
  texts.push(...cmp.diff.notes);
  const missing = [...new Set(texts)].filter((x) => localizeMsg(x, 'th') === x);
  assert.deepEqual(missing, [], 'untranslated engine messages');
});

test('msgs: ids and counts are carried into the Thai text', () => {
  assert.match(localizeMsg('Cut by ct_1, ct_2 under the series rule (one working barrier is enough).', 'th'), /ct_1, ct_2/);
  assert.match(localizeMsg('12 path result(s) are inconclusive; the comparison is incomplete for those paths.', 'th'), /12/);
});
