import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as M from '../js/model.js';
import * as IC from '../js/interchange.js';
import { upsertWork, MAX_WORKS } from '../js/gallery.js';
import { planOpen, backupPlan, saveWorkPlan, guardedOpen, duplicateModelIds, backupBeforeReplace } from '../js/safeopen.js';
import * as SW from '../js/swiss.js';

const mk = (text, id) => { const m = M.emptyModel(); m.hazard.text = text; IC.ensureIdentity(m); if (id) m.meta.modelId = id; return m; };
const clone = (x) => JSON.parse(JSON.stringify(x));
let n = 0; const ids = () => ({ newWorkId: 'w_new' + (++n), newModelId: () => 'md_fresh' + n });
const link = (a, b) => IC.newLink({ modelId: a.meta.modelId, entityId: a.hazard.id }, { modelId: b.meta.modelId, entityId: b.hazard.id }, 'related_to');
const fullGallery = () => { let f = []; for (let i = 0; i < MAX_WORKS; i++) f = upsertWork(f, { id: 'w' + i, type: 'bowtie', model: mk('w' + i, 'md_w' + i) }); return f; };

test('N1 warn: opening over a model with content asks, and counts the links that lose an end', () => {
  const cur = mk('current', 'md_a'); const inc = mk('other', 'md_b'); const other = mk('third', 'md_c');
  const links = [link(cur, other), link(other, cur)];
  const p = planOpen({ current: cur, incoming: inc, links });
  assert.deepEqual([p.replaces, p.sameModel, p.affectedLinks], [true, false, 2]);
});

test('N1 warn only when something is destroyed: blank current, identical content, or same model that keeps every linked entity', () => {
  assert.equal(planOpen({ current: M.emptyModel(), incoming: mk('x') }).replaces, false);
  const cur = mk('same', 'md_a');
  assert.equal(planOpen({ current: cur, incoming: clone(cur) }).replaces, false);
  const edited = clone(cur); edited.hazard.text = 'edited elsewhere';
  const p = planOpen({ current: cur, incoming: edited, links: [link(cur, mk('t', 'md_t'))] });
  assert.deepEqual([p.replaces, p.sameModel, p.affectedLinks], [true, true, 0]);
});

test('N1 warn: the same content under another modelId is silent unless a link is attached to the old id', () => {
  const cur = mk('same', 'md_a'); const inc = clone(cur); delete inc.meta.modelId;
  assert.equal(planOpen({ current: cur, incoming: inc, links: [] }).replaces, false);
  const p = planOpen({ current: cur, incoming: inc, links: [link(cur, mk('t', 'md_t'))] });
  assert.deepEqual([p.replaces, p.affectedLinks], [true, 1]);
});

test('N1 cancel: nothing is written and the open is refused', () => {
  const cur = mk('keep me', 'md_a'); const before = JSON.stringify(cur); let wrote = 0;
  const r = guardedOpen({ type: 'bowtie', current: cur, incoming: mk('new', 'md_b'), links: [], ask: () => false, read: () => [], write: () => { wrote++; return true; }, ...ids() });
  assert.deepEqual([r.proceed, r.reason, wrote], [false, 'cancelled', 0]);
  assert.equal(JSON.stringify(cur), before);
});

test('N1 confirm: the old model is stored in the gallery (order: ask, write, only then proceed)', () => {
  const cur = mk('keep me', 'md_a'); const calls = []; let store = [];
  const r = guardedOpen({ type: 'bowtie', current: cur, incoming: mk('new', 'md_b'), links: [], ask: () => { calls.push('ask'); return true; }, read: () => store, write: (w) => { calls.push('write'); store = w; return true; }, ...ids() });
  assert.deepEqual(calls, ['ask', 'write']);
  assert.deepEqual([r.proceed, r.backedUp], [true, true]);
  assert.equal(store.length, 1); assert.equal(store[0].model.hazard.text, 'keep me'); assert.equal(store[0].model.meta.modelId, 'md_a');
});

test('N1 backup failure: nothing is replaced (storage refuses, or the gallery is full)', () => {
  const cur = mk('keep me', 'md_a');
  const refused = guardedOpen({ type: 'bowtie', current: cur, incoming: mk('new', 'md_b'), links: [], ask: () => true, read: () => [], write: () => false, ...ids() });
  assert.deepEqual([refused.proceed, refused.reason], [false, 'backup-failed']);
  const full = fullGallery(); let wrote = 0;
  const r = guardedOpen({ type: 'bowtie', current: cur, incoming: mk('new', 'md_b'), links: [], ask: () => true, read: () => full, write: () => { wrote++; return true; }, ...ids() });
  assert.deepEqual([r.proceed, r.reason, wrote], [false, 'backup-failed', 0]);
});

test('N1 backup is not duplicated when an identical copy is already saved, and never reuses a modelId for different content', () => {
  const cur = mk('v1', 'md_a');
  const saved = upsertWork([], { id: 'w1', type: 'bowtie', model: cur });
  assert.equal(backupPlan(saved, { type: 'bowtie', current: clone(cur), ...ids() }).works, null);
  const changed = clone(cur); changed.hazard.text = 'v2';
  const b = backupPlan(saved, { type: 'bowtie', current: changed, ...ids() });
  assert.equal(b.ok, true); assert.equal(duplicateModelIds(b.works).length, 0); assert.match(b.works[0].model.meta.title, /\(backup\)/);
});

test('N1 links: opening never edits the link registry; links to the replaced model show as broken and heal when it is reopened', () => {
  const a = mk('A', 'md_a'); const t = mk('T', 'md_t'); const links = [link(a, t)]; const snap = JSON.stringify(links);
  guardedOpen({ type: 'bowtie', current: a, incoming: mk('B', 'md_b'), links, ask: () => true, read: () => [], write: () => true, ...ids() });
  assert.equal(JSON.stringify(links), snap);
  assert.equal(IC.linkHealth(links[0], new Map([['md_b', mk('B', 'md_b')], ['md_t', t]])).state, 'broken-model');
  assert.equal(IC.linkHealth(links[0], new Map([['md_a', a], ['md_t', t]])).state, 'ok');
});

test('N6 save as new: fresh modelId, original work and open model untouched', () => {
  const cur = mk('work', 'md_a'); const works0 = upsertWork([], { id: 'w1', type: 'bowtie', model: cur });
  const r = saveWorkPlan(works0, { id: 'w1', type: 'bowtie', model: cur, asNew: true, ...ids() });
  assert.equal(r.ok, true); assert.equal(r.works.length, 2);
  const orig = r.works.find((w) => w.id === 'w1'); const copy = r.works.find((w) => w.id === r.id);
  assert.equal(orig.model.meta.modelId, 'md_a'); assert.equal(cur.meta.modelId, 'md_a');
  assert.notEqual(copy.model.meta.modelId, 'md_a'); assert.equal(copy.model.hazard.text, 'work');
  assert.notEqual(r.id, 'w1');
});

test('N6 no duplicate modelId after repeated saves (update, save-as-new, update again)', () => {
  const cur = mk('work', 'md_a'); let works = [];
  let r = saveWorkPlan(works, { id: null, type: 'bowtie', model: cur, asNew: false, ...ids() }); works = r.works; const first = r.id;
  r = saveWorkPlan(works, { id: first, type: 'bowtie', model: cur, asNew: false, ...ids() }); works = r.works;
  assert.equal(works.length, 1);
  r = saveWorkPlan(works, { id: first, type: 'bowtie', model: cur, asNew: true, ...ids() }); works = r.works; const second = r.id;
  r = saveWorkPlan(works, { id: second, type: 'bowtie', model: cur, asNew: false, ...ids() }); works = r.works;
  assert.deepEqual([works.length, duplicateModelIds(works).length], [2, 0]);
  assert.equal(works.find((w) => w.id === first).model.meta.modelId, 'md_a');
});

test('N6 duplicates that already exist are resolved on the next save without touching the other work', () => {
  const a = mk('one', 'md_dup'); const b = mk('two', 'md_dup');
  const works = upsertWork(upsertWork([], { id: 'w1', type: 'bowtie', model: a }), { id: 'w2', type: 'bowtie', model: b });
  assert.deepEqual(duplicateModelIds(works), ['md_dup']);
  const r = saveWorkPlan(works, { id: 'w2', type: 'bowtie', model: b, asNew: false, ...ids() });
  assert.deepEqual(duplicateModelIds(r.works), []);
  assert.equal(r.works.find((w) => w.id === 'w1').model.meta.modelId, 'md_dup');
});

test('N6 full gallery: saving a new work is refused instead of silently dropping the oldest', () => {
  const full = fullGallery();
  assert.equal(saveWorkPlan(full, { id: null, type: 'bowtie', model: mk('x', 'md_x'), asNew: false, ...ids() }).ok, false);
  assert.equal(saveWorkPlan(full, { id: 'w3', type: 'bowtie', model: mk('x', 'md_x'), asNew: false, ...ids() }).ok, true);
});

test('N6 package interop: a saved copy exports with its own modelId and imports as a separate member', async () => {
  const cur = mk('work', 'md_a'); const r = saveWorkPlan([], { id: null, type: 'bowtie', model: cur, asNew: true, ...ids() });
  const pkg = await IC.buildPackage([{ model: cur }, { model: r.works[0].model }], {});
  assert.equal(pkg.validation.ok, true);
  const prev = await IC.validatePackage(pkg, []);
  assert.deepEqual(prev.members.map((x) => x.status), ['new', 'new']);
});

test('wiring: every file open goes through the guard, the gallery uses the planners, the service worker caches the module', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /openModel: \(m, workId\) => \{ if \(openGuarded\(m\)\)/);
  assert.match(app, /openGuarded\(JSON\.parse\(await f\.text\(\)\)\)/);
  assert.match(app, /openGuarded\(await r\.json\(\)\)/);
  assert.match(app, /SO\.saveWorkPlan\(/);
  assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /js\/safeopen\.js/);
});

// ---------------------------------------------------------------- review follow-up: setSlot / openSwissFromBowtie
const bt = () => JSON.parse(readFileSync(new URL('../data/example-wildlife.json', import.meta.url), 'utf8'));
const bb = (o) => backupBeforeReplace({ type: 'bowtie', newWorkId: 'w_bk', newModelId: () => 'md_fresh_bk', now: '2026-01-01T00:00:00.000Z', ...o });

test('setSlot backup: success keeps the old model in the gallery before anything is replaced', () => {
  const cur = mk('old', 'md_a'); let written = null;
  const r = bb({ current: cur, incoming: mk('new', 'md_b'), read: () => [], write: (w) => { written = w; return true; } });
  assert.deepEqual([r.ok, r.backedUp], [true, true]);
  assert.equal(written.length, 1); assert.equal(written[0].model.hazard.text, 'old');
});

test('setSlot backup: a write that RETURNS false (storage refused) refuses the replace; it is not swallowed', () => {
  const r = bb({ current: mk('old', 'md_a'), incoming: mk('new', 'md_b'), read: () => [], write: () => false });
  assert.deepEqual([r.ok, r.reason], [false, 'backup-failed']);
});

test('setSlot backup: a full gallery refuses the replace and the oldest work is not pushed out', () => {
  const full = fullGallery(); let wrote = false;
  const r = bb({ current: mk('old', 'md_a'), incoming: mk('new', 'md_b'), read: () => full, write: () => { wrote = true; return true; } });
  assert.deepEqual([r.ok, r.reason, wrote], [false, 'backup-failed', false]);
  assert.equal(full.length, MAX_WORKS);
});

test('setSlot backup: same modelId but different content IS protected (the old rule skipped it); a colliding backup gets a fresh id', () => {
  const cur = mk('old text', 'md_a'); const inc = clone(cur); inc.hazard.text = 'changed text';
  let written = null;
  const r = bb({ current: cur, incoming: inc, read: () => [], write: (w) => { written = w; return true; } });
  assert.equal(r.backedUp, true); assert.equal(written[0].model.hazard.text, 'old text');
  const other = upsertWork([], { id: 'w_x', type: 'bowtie', model: mk('someone else', 'md_a') });
  bb({ current: cur, incoming: inc, read: () => other, write: (w) => { written = w; return true; } });
  assert.equal(duplicateModelIds(written).length, 0, 'never two works with one modelId');
});

test('setSlot backup: nothing to keep for a blank slot or identical content; an identical copy already saved is not duplicated', () => {
  const never = () => { throw new Error('must not read or write'); };
  assert.deepEqual(bb({ current: M.emptyModel(), incoming: mk('x'), read: never, write: never }), { ok: true, backedUp: false });
  assert.deepEqual(bb({ current: null, incoming: mk('x'), read: never, write: never }), { ok: true, backedUp: false });
  const cur = mk('same', 'md_a');
  assert.deepEqual(bb({ current: cur, incoming: clone(cur), read: never, write: never }), { ok: true, backedUp: false });
  const saved = upsertWork([], { id: 'w_s', type: 'bowtie', model: cur });
  assert.deepEqual(bb({ current: cur, incoming: mk('new', 'md_b'), read: () => saved, write: never }), { ok: true, backedUp: false });
});

test('Swiss-from-Bowtie replace (real swissFromBowtie output, a linked model): cancel keeps everything; links are counted; backup fail and full gallery refuse', () => {
  const src = bt(); IC.ensureIdentity(src);
  const made = SW.swissFromBowtie(clone(src), { threatId: src.threats[0].id, consequenceId: null });
  const swiss = clone(made); IC.ensureIdentity(swiss); swiss.meta.modelId = 'md_swiss_old'; swiss.meta.title = 'old swiss';
  const peer = mk('peer', 'md_peer');
  const lk = IC.newLink({ modelId: 'md_swiss_old', entityId: [...IC.entityIdsOf(swiss)][0] }, { modelId: 'md_peer', entityId: peer.hazard.id }, 'related_to');
  const base = { type: 'swiss', current: swiss, incoming: made, links: [lk], ...ids() };
  let asked = 0; let wrote = 0;
  const cancel = guardedOpen({ ...base, ask: (p) => { asked += 1; assert.equal(p.affectedLinks, 1, 'the dialog can name the link that loses an end'); return false; }, read: () => [], write: () => { wrote += 1; return true; } });
  assert.deepEqual([cancel.proceed, cancel.reason, asked, wrote], [false, 'cancelled', 1, 0]);
  const failed = guardedOpen({ ...base, ask: () => true, read: () => [], write: () => false });
  assert.deepEqual([failed.proceed, failed.reason], [false, 'backup-failed']);
  const full = guardedOpen({ ...base, ask: () => true, read: () => fullGallery(), write: () => { wrote += 1; return true; } });
  assert.deepEqual([full.proceed, full.reason, wrote], [false, 'backup-failed', 0]);
  let kept = null; asked = 0;
  const ok = guardedOpen({ ...base, ask: () => { asked += 1; return true; }, read: () => [], write: (w) => { kept = w; return true; } });
  assert.deepEqual([ok.proceed, ok.backedUp, asked], [true, true, 1], 'exactly one confirmation');
  assert.equal(kept[0].model.meta.title, 'old swiss'); assert.equal(kept[0].type, 'swiss');
});

test('wiring (source): openSwissFromBowtie, setSlot and applyImport use the Safe Open helpers and check their results', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const body = (name) => { const i = app.indexOf('function ' + name + '('); assert.ok(i >= 0, name); return app.slice(i, app.indexOf('\n}\n', i)); };
  const sw = body('openSwissFromBowtie');
  assert.ok(sw.includes('SO.guardedOpen'), 'Swiss open goes through guardedOpen');
  assert.ok(sw.indexOf('SO.guardedOpen') < sw.indexOf('loadModel(made)'), 'the guard runs before the model is replaced');
  assert.equal((sw.match(/confirm\(/g) || []).length, 1, 'a single confirmation');
  const ss = body('setSlot');
  assert.ok(!/try\s*\{/.test(ss) && ss.includes('backupSlot') && ss.includes('if (!b.ok) return b'), 'setSlot checks the backup result, no try/catch around a boolean');
  assert.ok(app.includes('SO.backupBeforeReplace'));
  const imp = body('applyImport');
  assert.ok(imp.indexOf('backupSlot') < imp.indexOf('setSlot(') && imp.indexOf('openBackupFail') < imp.indexOf('mergeLinks'), 'import backs up every slot before replacing any, and fails before merging links');
  assert.match(body('applyDerived'), /setSlot\(destType, result\.model\)\.ok/);
  const lp = readFileSync(new URL('../js/linkspanel.js', import.meta.url), 'utf8');
  assert.ok(/if \(ctx\.applyDerived\(/.test(lp) && /if \(ctx\.applyImport\(/.test(lp), 'success messages only after success');
});

test('syntax: the browser-only modules that tests read as text still parse (app.js, forms-fp.js, linkspanel.js)', () => {
  for (const f of ['app.js', 'forms-fp.js', 'linkspanel.js']) {
    const r = spawnSync(process.execPath, ['--check', fileURLToPath(new URL('../js/' + f, import.meta.url))], { encoding: 'utf8' });
    assert.equal(r.status, 0, f + ': ' + r.stderr.slice(0, 300));
  }
});
