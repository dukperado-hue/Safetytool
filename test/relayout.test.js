import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeSwiss, layoutSwiss } from '../js/swiss.js';
import { normalizeShell, layoutShell } from '../js/shell.js';

const load = (f) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const chips = (it) => (it.prims || []).filter((p) => p.t === 'chip').map((p) => p.s);
const texts = (it) => (it.prims || []).filter((p) => p.t === 'text').map((p) => p.s).join(' ');

test('swiss picture: banner says what the trajectory does and never claims one that was not chosen', () => {
  const m = normalizeSwiss(load('example-swiss.json'));
  const full = layoutSwiss(m, { lang: 'en' }).items.find((i) => i.id === 'swiss_banner');
  assert.equal(full.status, 'mismatch');
  assert.match(texts(full), /line up in every layer/);

  m.trajectory = ['ho_1', 'ho_4'];
  const stop = layoutSwiss(m, { lang: 'en' }).items.find((i) => i.id === 'swiss_banner');
  assert.equal(stop.status, 'match');
  assert.match(texts(stop), /stopped at layer 2/);

  m.trajectory = [];
  const none = layoutSwiss(m, { lang: 'th' }).items.find((i) => i.id === 'swiss_banner');
  assert.equal(none.status, 'unknown');
  assert.match(texts(none), /ผู้วิเคราะห์เป็นผู้เลือก/);
});

test('swiss picture: layer chips are HELD / PENETRATED only when a trajectory exists; legend and banner are inert', () => {
  const m = normalizeSwiss(load('example-swiss.json'));
  m.trajectory = ['ho_1', 'ho_4'];
  const L = layoutSwiss(m);
  const layerChips = L.items.filter((i) => i.kind === 'layer').map((i) => chips(i)[0]);
  assert.ok(layerChips.includes('■ HELD') && layerChips.includes('▲ PENETRATED'));
  m.trajectory = [];
  const none = layoutSwiss(m).items.filter((i) => i.kind === 'layer').flatMap(chips);
  assert.deepEqual(none, [], 'no verdict on a layer before the analyst chooses a trajectory');
  const inert = layoutSwiss(m).items.filter((i) => i.inert).map((i) => i.kind).sort();
  assert.deepEqual(inert, ['banner', 'legend']);
});

test('swiss picture: holes keep type by border style (active solid, latent dashed) and show their tags', () => {
  const m = normalizeSwiss(load('example-swiss.json'));
  m.layers[0].holes[0].commonCauseId = 'cc_1';
  m.layers[0].holes[0].hfacsLevel = 'organisational-influences';
  const L = layoutSwiss(m);
  const h = L.items.find((i) => i.id === m.layers[0].holes[0].id);
  assert.match(texts(h), /CC cc_1/);
  assert.match(texts(h), /HFACS ORG/);
  assert.ok(L.items.filter((i) => i.kind === 'holeLatent' || i.kind === 'holeActive').every((i) => i.shape === 'card'));
});

test('shell picture: every interface card carries a status chip with a shape, and a summary strip counts them', () => {
  const m = normalizeShell(load('example-shell.json'));
  const L = layoutShell(m);
  ['if_LS', 'if_LH', 'if_LE', 'if_LL'].forEach((id) => {
    const it = L.items.find((i) => i.id === id);
    assert.ok(chips(it).some((c) => /^(■ MATCH|▲ MISMATCH|\? UNKNOWN)$/.test(c)), id);
  });
  const sum = L.items.find((i) => i.id === 'shell_summary');
  assert.ok(sum && sum.inert);
  assert.match(chips(sum).join(' '), /MATCH \d.*MISMATCH \d.*UNKNOWN \d/);
});

test('shell picture: each component item is its own row and findings show severity as dots plus a number', () => {
  const m = normalizeShell(load('example-shell.json'));
  const L = layoutShell(m);
  const comp = L.items.find((i) => i.id === 'comp_S');
  assert.equal(comp.prims.filter((p) => p.t === 'rect' && p.cls === 'sub').length, m.components.S.length);
  const withFinding = ['LS', 'LH', 'LE', 'LL'].find((k) => m.interfaces[k].findings.length);
  const card = L.items.find((i) => i.id === 'if_' + withFinding);
  assert.match(texts(card), /[●○]{5} SEV \d/);
});
