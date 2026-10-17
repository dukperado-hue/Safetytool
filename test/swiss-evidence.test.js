import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as SW from '../js/swiss.js';
import * as IC from '../js/interchange.js';
import { addEvidence } from '../js/evidence.js';
import { evidenceChoices, stripRef } from '../js/forms-fp.js';

const raw = () => JSON.parse(readFileSync(new URL('../data/example-swiss.json', import.meta.url), 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const withEvidence = () => {
  const m = SW.normalizeSwiss(raw()); IC.ensureIdentity(m);
  const ev = addEvidence(m, 'OBSERVED', 'Invented inspection report'); ev.reference = 'INV-1';
  const l = m.layers[0]; const h = l.holes[0];
  l.evidenceIds = [ev.id]; h.evidenceIds = [ev.id];
  return { m, ev, l, h };
};

// a tiny DOM, enough for the form helpers (the app itself is not run here)
class El {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.listeners = {}; this.textContent = ''; this.checked = false; this.value = ''; }
  setAttribute(k, v) { this.attrs[k] = v; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  fire(t) { (this.listeners[t] || []).forEach((f) => f()); }
  all(tag) { return this.children.flatMap((c) => [...(c.tag === tag ? [c] : []), ...c.all(tag)]); }
}
globalThis.document = { createElement: (t) => new El(t) };
const run = (m, holder, lang) => { const calls = []; const el = evidenceChoices(m, holder, { lang, mutate: (fn) => { calls.push(1); fn(m); } }); return { el, calls }; };

test('G1 swiss: a legacy file without evidenceIds, evidence or assumptions still validates and normalizes unchanged', () => {
  const m = raw();
  assert.ok(!JSON.stringify(m).includes('evidenceIds'));
  assert.deepEqual(SW.validateSwiss(SW.normalizeSwiss(clone(m))), []);
  const once = SW.normalizeSwiss(clone(m)); const twice = SW.normalizeSwiss(clone(once));
  assert.equal(JSON.stringify(twice), JSON.stringify(once), 'normalizing again changes nothing');
  assert.ok(!JSON.stringify(once).includes('evidenceIds'), 'normalization does not invent evidence fields on legacy files');
});

test('G1 swiss: layers and holes can cite existing evidence; normalization keeps the references', () => {
  const { m, ev, l, h } = withEvidence();
  assert.deepEqual(SW.validateSwiss(m), []);
  const n = SW.normalizeSwiss(clone(m));
  assert.deepEqual(n.layers[0].evidenceIds, [ev.id]); assert.deepEqual(n.layers[0].holes[0].evidenceIds, [ev.id]);
  assert.deepEqual(SW.validateSwiss(n), []);
  assert.equal(n.layers[0].id, l.id); assert.equal(n.layers[0].holes[0].id, h.id);
});

test('G1 swiss: a missing evidence reference gives the established V-07 error, with or without an evidence list; a non-array is rejected', () => {
  const { m, l, h } = withEvidence();
  h.evidenceIds = ['ev_nope'];
  assert.ok(SW.validateSwiss(m).includes('V-07 ' + h.id + ' cites missing evidence ev_nope'));
  const bare = SW.normalizeSwiss(raw()); bare.layers[0].evidenceIds = ['ev_nope'];   // no m.evidence at all
  assert.ok(SW.validateSwiss(bare).some((e) => e === 'V-07 ' + bare.layers[0].id + ' cites missing evidence ev_nope'));
  const odd = withEvidence(); odd.l.evidenceIds = 'ev_x';
  assert.ok(SW.validateSwiss(odd.m).some((e) => /evidenceIds must be an array/.test(e)));
  assert.ok(l.id);
});

test('G1 swiss: the interchange adapter lists the evidence, and a package round trip keeps the references', async () => {
  const { m, ev, l, h } = withEvidence();
  const ents = IC.entitiesOf(m);
  assert.ok(ents.some((e) => e.id === ev.id && e.type === 'evidence'));
  const pkg = await IC.buildPackage([{ model: m }], { now: '2026-10-17T00:00:00.000Z' });
  assert.equal(pkg.validation.ok, true, JSON.stringify(pkg.validation));
  const other = JSON.parse(JSON.stringify(pkg));
  const pre = await IC.validatePackage(other, []);
  assert.equal(pre.ok, true, pre.errors.join('; '));
  const back = IC.planImport(other, pre, {}, { now: '2026-10-18T00:00:00.000Z' }).actions[0].model;
  assert.equal(IC.canonical(back), IC.canonical(m), 'identical semantic content');
  assert.deepEqual(back.layers[0].evidenceIds, [ev.id]); assert.deepEqual(back.layers[0].holes[0].evidenceIds, [ev.id]);
  assert.ok(l.id && h.id);
});

test('G1 swiss: deleting an evidence entry strips it from every layer and hole, and the link-impact flow counts links that point at it', () => {
  const { m, ev, l } = withEvidence();
  const peer = SW.normalizeSwiss(raw()); IC.ensureIdentity(peer);
  const lk = IC.newLink({ modelId: m.meta.modelId, entityId: ev.id }, { modelId: 'md_peer', entityId: 'x' }, 'related_to');
  const del = (x) => { x.evidence = x.evidence.filter((v) => v.id !== ev.id); stripRef(x, ev.id); };   // exactly what the sources editor's delete does
  const impact = IC.deleteImpact([lk], m, del);
  assert.deepEqual([...impact.removed], [ev.id]); assert.equal(impact.links.length, 1, 'confirmation can name the link');
  assert.deepEqual(m.layers[0].evidenceIds, [ev.id], 'impact check works on a copy');
  del(m);
  assert.deepEqual(m.layers[0].evidenceIds, []); assert.deepEqual(m.layers[0].holes[0].evidenceIds, []);
  assert.deepEqual(SW.validateSwiss(m), []);
  assert.ok(l.id);
});

test('G1 swiss UI: the attach control exists in Thai and English, ticks and unticks, and works on a holder with no evidenceIds yet', () => {
  const { m, ev } = withEvidence();
  const th = run(m, m.layers[0], 'th'); const en = run(m, m.layers[0], 'en');
  const legend = (r) => r.el.all('legend')[0].textContent;
  assert.equal(legend(th), 'หลักฐาน'); assert.equal(legend(en), 'Evidence');
  const box = en.el.all('input')[0];
  assert.equal(box.checked, true);
  box.checked = false; box.fire('change');
  assert.deepEqual(m.layers[0].evidenceIds, []);
  box.checked = true; box.fire('change');
  assert.deepEqual(m.layers[0].evidenceIds, [ev.id]);
  const legacy = SW.normalizeSwiss(raw()); const e2 = addEvidence(legacy, 'ASSESSED', 'Invented');
  const hole = legacy.layers[0].holes[0]; assert.equal(hole.evidenceIds, undefined);
  const r = run(legacy, hole, 'en'); const b2 = r.el.all('input')[0];
  assert.equal(b2.checked, false);
  b2.checked = true; b2.fire('change');
  assert.deepEqual(hole.evidenceIds, [e2.id]);
  assert.equal(run(SW.normalizeSwiss(raw()), hole, 'en').el, null, 'no evidence in the model: no control (the sources section adds it)');
});

test('G1 swiss wiring (source): the Swiss form offers the control on layers and holes, and the sources editor follows it', () => {
  const forms = readFileSync(new URL('../js/forms.js', import.meta.url), 'utf8');
  assert.ok(/api\.evidenceFor && api\.evidenceFor\(l\)/.test(forms) && /api\.evidenceFor && api\.evidenceFor\(h\)/.test(forms));
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(/state\.type === 'swiss'\) \{ buildSwissForm\(host, cur\(\), \{ \.\.\.api, evidenceFor/.test(app) && /buildSourcesEditor\(host, cur\(\), api\)/.test(app));
  const lp = readFileSync(new URL('../js/forms-fp.js', import.meta.url), 'utf8');
  assert.ok(/api\.confirmDelete \|\|/.test(lp), 'deletion goes through the shared confirmDelete');
});
