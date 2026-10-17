import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../js/model.js';
import * as SW from '../js/swiss.js';
import * as IC from '../js/interchange.js';
import { STR } from '../js/i18n.js';

const ex = (n) => JSON.parse(readFileSync(new URL('../data/example-' + n + '.json', import.meta.url), 'utf8'));
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// a bowtie and a Swiss model, each with its own identity, and links between them
function setup() {
  const bt = M.normalize(ex('wildlife')); const sw = SW.normalizeSwiss(ex('swiss'));
  IC.ensureIdentity(bt); IC.ensureIdentity(sw);
  const ctl = bt.controls[0]; const esc = bt.escalations[0];
  const thr = bt.threats.find((x) => x.id !== ctl.threatId);   // a threat that does not own the linked barrier, so deleting it does not cascade onto it
  const hole = sw.layers.flatMap((l) => l.holes)[0]; const layer = sw.layers[0];
  const mk = (a, b, rel = 'related_to', status = 'confirmed') => IC.newLink({ modelId: a.m.meta.modelId, entityId: a.id }, { modelId: b.m.meta.modelId, entityId: b.id }, rel, { status });
  const links = [
    mk({ m: bt, id: ctl.id }, { m: sw, id: layer.id }),                     // bowtie -> swiss
    mk({ m: sw, id: hole.id }, { m: bt, id: ctl.id }, 'candidate_mapping', 'proposed'),   // swiss -> bowtie (same bowtie entity, other direction)
    mk({ m: bt, id: thr.id }, { m: sw, id: hole.id }, 'references'),         // another bowtie entity
  ];
  const models = () => new Map([[bt.meta.modelId, bt], [sw.meta.modelId, sw]]);
  return { bt, sw, ctl, esc, thr, hole, layer, links, models, mk };
}

// ---- link health (1-3)
test('health: both ends present -> ok, with each end described by its own model', () => {
  const { links, models, ctl, layer } = setup();
  const h = IC.linkHealth(links[0], models());
  assert.equal(h.state, 'ok'); assert.deepEqual(h.codes, []);
  assert.equal(h.from.modelType, 'bowtie'); assert.equal(h.from.entityType, 'control'); assert.equal(h.from.native, 'control'); assert.equal(h.from.label, ctl.text);
  assert.equal(h.to.modelType, 'swiss'); assert.equal(h.to.entityType, 'defenceLayer'); assert.equal(h.to.label, layer.name);
});

test('health: a missing source or target MODEL is broken-model with the existing code L-06', () => {
  const { links, bt, sw } = setup();
  const onlyBt = new Map([[bt.meta.modelId, bt]]); const onlySw = new Map([[sw.meta.modelId, sw]]);
  let h = IC.linkHealth(links[0], onlyBt);     // target (swiss) gone
  assert.equal(h.state, 'broken-model'); assert.deepEqual(h.codes, ['L-06']); assert.equal(h.to.reason, 'model'); assert.equal(h.from.ok, true);
  h = IC.linkHealth(links[0], onlySw);         // source (bowtie) gone
  assert.equal(h.state, 'broken-model'); assert.equal(h.from.reason, 'model'); assert.equal(h.to.ok, true);
  assert.equal(IC.linkHealth(links[0], new Map()).state, 'broken-model');
  // agrees with checkLinks
  assert.ok(IC.checkLinks([links[0]], onlyBt).some((i) => i.code === 'L-06'));
});

test('health: a missing source or target ENTITY (model still there) is broken-entity with L-07', () => {
  const { links, bt, sw, models, ctl, hole } = setup();
  M.removeNode(bt, ctl.id);
  let h = IC.linkHealth(links[0], models());
  assert.equal(h.state, 'broken-entity'); assert.deepEqual(h.codes, ['L-07']); assert.equal(h.from.reason, 'entity'); assert.equal(h.from.modelType, 'bowtie');
  assert.equal(h.to.ok, true);
  assert.ok(IC.checkLinks([links[0]], models()).some((i) => i.code === 'L-07'));
  SW.removeHole(sw, hole.id);
  h = IC.linkHealth(links[2], models());   // bowtie threat -> removed swiss hole
  assert.equal(h.state, 'broken-entity'); assert.equal(h.to.reason, 'entity'); assert.equal(h.from.ok, true);
});

test('health: an incomplete end does not crash anything', () => {
  const { models } = setup();
  const h = IC.linkHealth({ id: 'lk_x', relation: 'related_to', status: 'confirmed', from: { modelId: 'a' }, to: null }, models());
  assert.equal(h.state, 'broken-model'); assert.deepEqual(h.codes, ['L-05']);
  assert.doesNotThrow(() => IC.linkHealth(undefined, models()));
});

// ---- deletion impact (4-8)
test('delete: an entity nobody links to has no impact (existing behaviour is kept)', () => {
  const { bt, links, esc, thr, ctl } = setup();
  const lonely = bt.threats.find((x) => x.id !== thr.id && x.id !== ctl.threatId);   // no link points at this threat or anything under it
  const r = IC.deleteImpact(links, bt, (x) => M.removeNode(x, lonely.id));
  assert.equal(r.links.length, 0);
  assert.ok(r.removed.has(lonely.id));
  assert.ok(esc);
});

test('delete: one linked entity -> one link; a link touching both removed ends is still counted once; both directions are found', () => {
  const { bt, sw, links, ctl, thr, hole, models } = setup();
  const r = IC.deleteImpact(links, bt, (x) => M.removeNode(x, thr.id));
  assert.deepEqual(r.links.map((l) => l.id), [links[2].id]);           // thr: one outgoing link
  const r2 = IC.deleteImpact(links, bt, (x) => M.removeNode(x, ctl.id));
  assert.deepEqual(r2.links.map((l) => l.id).sort(), [links[0].id, links[1].id].sort());   // ctl: one outgoing (from) and one incoming (to)
  // both ends in the same deleted set: a self-model link
  const self = IC.newLink({ modelId: bt.meta.modelId, entityId: ctl.id }, { modelId: bt.meta.modelId, entityId: thr.id }, 'related_to');
  const r3 = IC.deleteImpact([self], bt, (x) => { M.removeNode(x, ctl.id); M.removeNode(x, thr.id); });
  assert.equal(r3.links.length, 1);
  // a link of ANOTHER model's entity with the same id string must not be counted
  const r4 = IC.deleteImpact(links, sw, (x) => SW.removeHole(x, hole.id));
  assert.deepEqual(r4.links.map((l) => l.id).sort(), [links[1].id, links[2].id].sort());
  assert.ok(models().size === 2);
});

test('delete: a cascade counts what goes with the entity (deleting a barrier removes its escalation factors)', () => {
  const { bt, links, esc } = setup();
  const withEsc = [...links, IC.newLink({ modelId: bt.meta.modelId, entityId: esc.id }, { modelId: 'md_other', entityId: 'x' }, 'related_to')];
  const r = IC.deleteImpact(withEsc, bt, (x) => M.removeNode(x, esc.controlId));
  assert.ok(r.removed.has(esc.id));
  assert.ok(r.links.some((l) => l.from.entityId === esc.id));
});

test('delete: the impact check runs on a copy; cancelling changes neither the entity nor the links', () => {
  const { bt, links, ctl } = setup();
  const modelBefore = JSON.stringify(bt); const linksBefore = JSON.stringify(links);
  IC.deleteImpact(links, bt, (x) => M.removeNode(x, ctl.id));
  assert.equal(JSON.stringify(bt), modelBefore);
  assert.equal(JSON.stringify(links), linksBefore);
  assert.ok(bt.controls.some((c) => c.id === ctl.id));
  // an edit that throws is treated as "nothing removed", not a crash
  assert.deepEqual(IC.deleteImpact(links, bt, () => { throw new Error('boom'); }).links, []);
});

test('delete: confirming keeps every link (ids, ends, relation, status) and they show as broken; explicit removal works', () => {
  const { bt, links, ctl, models } = setup();
  const before = JSON.parse(JSON.stringify(links));
  M.removeNode(bt, ctl.id);                         // what the app does after the user confirms
  assert.deepEqual(links, before, 'links untouched');
  const states = links.map((l) => IC.linkHealth(l, models()).state);
  assert.deepEqual(states, ['broken-entity', 'broken-entity', 'ok']);
  // the user removes the broken ones by hand (what the Delete button in the Connections panel does)
  const left = links.filter((l) => IC.linkHealth(l, models()).state === 'ok');
  assert.equal(left.length, 1); assert.equal(left[0].id, links[2].id);
  assert.deepEqual(left[0], before[2]);
});

test('delete: no linked entity of ANOTHER model is touched when one model is edited', () => {
  const { sw, bt, links, ctl, models } = setup();
  M.removeNode(bt, ctl.id);
  assert.ok(IC.hasEntity(sw, links[0].to.entityId));
  assert.equal(IC.linkHealth(links[0], models()).to.ok, true);
});

// ---- navigation (10-11)
test('navigation: a resolvable end gives the right model type and entity; a missing one fails gracefully', () => {
  const { links, models, ctl, hole, bt } = setup();
  assert.deepEqual(IC.navigationTarget(models(), links[0].from), { ok: true, modelType: 'bowtie', entityId: ctl.id, baseId: ctl.id });
  const t = IC.navigationTarget(models(), links[1].from);
  assert.equal(t.modelType, 'swiss'); assert.equal(t.entityId, hole.id);
  M.removeNode(bt, ctl.id);
  assert.deepEqual(IC.navigationTarget(models(), links[0].from), { ok: false, reason: 'entity' });
  assert.deepEqual(IC.navigationTarget(new Map(), links[0].to), { ok: false, reason: 'model' });
  assert.deepEqual(IC.navigationTarget(models(), null), { ok: false, reason: 'incomplete' });
});

test('navigation: a derived constraint id leads to the entity it belongs to', () => {
  const st = JSON.parse(readFileSync(new URL('../data/example-stamp.json', import.meta.url), 'utf8')); IC.ensureIdentity(st);
  const c = IC.entitiesOf(st).find((e) => e.id.endsWith('#constraint'));
  assert.ok(c, 'example has a constraint entity');
  const t = IC.navigationTarget(new Map([[st.meta.modelId, st]]), { modelId: st.meta.modelId, entityId: c.id });
  assert.equal(t.ok, true); assert.equal(t.baseId, c.id.replace('#constraint', ''));
});

test('navigation: every one of the seven example models resolves its own entities to its own type', () => {
  const kinds = { wildlife: 'bowtie', swiss: 'swiss', shell: 'shell', hfacs: 'hfacs', stamp: 'stamp', fram: 'fram', pyramid: 'pyramid' };
  for (const [file, type] of Object.entries(kinds)) {
    const m = ex(file); IC.ensureIdentity(m);
    const e = IC.entitiesOf(m).find((x) => x.label);
    const t = IC.navigationTarget(new Map([[m.meta.modelId, m]]), { modelId: m.meta.modelId, entityId: e.id });
    assert.equal(t.ok, true, file); assert.equal(t.modelType, type, file);
  }
});

// ---- compatibility (12-14)
test('compat: links keep ids, ends, relations and statuses through a package round trip', async () => {
  const { bt, sw, links } = setup();
  const pkg = JSON.parse(JSON.stringify(await IC.buildPackage([{ model: bt }, { model: sw }], { links, now: '2026-10-16T00:00:00Z' })));
  const pv = await IC.validatePackage(pkg, []);
  assert.equal(pv.ok, true);
  const plan = IC.planImport(pkg, pv, {});
  assert.deepEqual(plan.links.map((l) => ({ ...l })), links.map((l) => ({ ...l })));
  assert.equal(plan.droppedLinks.length, 0);
});

test('compat: invalid links are still reported by checkLinks exactly as before, and health never replaces it', () => {
  const { bt, sw, links, models } = setup();
  const bad = { ...links[0], id: 'lk_bad', relation: 'causes' };
  assert.ok(IC.checkLinks([bad], models()).some((i) => i.code === 'L-03'));
  assert.equal(IC.linkHealth(bad, models()).state, 'ok', 'health is about the ends only; relation validity stays with checkLinks');
  assert.ok(IC.checkLinks([{ ...links[0], status: 'maybe' }], models()).some((i) => i.code === 'L-04'));
  assert.ok(IC.RELATION_IDS.every((r) => r !== 'causes'));
  assert.ok(bt && sw);
});

test('compat: health is derived from the workspace, never stored on a link', () => {
  const { links, models } = setup();
  IC.linkHealth(links[0], models());
  links.forEach((l) => assert.ok(!('health' in l) && !('state' in l) && !('broken' in l)));
});

// ---- wiring: every deletion path asks through the same guard
test('wiring: no delete handler in the UI keeps its own link-blind confirmation', () => {
  const forms = read('../js/forms.js'); const fp = read('../js/forms-fp.js'); const app = read('../js/app.js'); const ap = read('../js/assurancepanel.js');
  assert.doesNotMatch(forms, /confirm\(t\('confirmDelete'\)\)/);
  assert.doesNotMatch(fp.replace(/api\.confirmDelete \|\|[^\n]*\n/g, ''), /confirm\(T\.confirmDelete\)/);
  assert.doesNotMatch(app, /confirm\(t\('confirmDelete'\)\)\) return;\n\s*mutate\(\(m\) => \{ M\.removeNode/);
  for (const name of ['SW.removeLayer', 'SW.removeHole', 'SH.removeShellNode', 'HF.removeFactor', 'ST.removeStampNode']) {
    const lines = forms.split('\n').filter((l) => l.includes(name + '('));
    assert.ok(lines.length > 0, name);
    lines.forEach((l) => assert.match(l, /confirmDelete\(/, name + ' goes through confirmDelete'));
  }
  for (const name of ['FR.removeFramNode', 'PY.removeCategory', 'PY.removePyramidNode']) fp.split('\n').filter((l) => l.includes(name + '(') && /button\(T\.delete/.test(l)).forEach((l) => assert.match(l, /confirmDelete\(/, name));
  assert.match(fp, /stripRef\(x, e\.id\); \}; if \(confirmDelete\(del\)\)/);
  assert.match(ap, /ctx\.confirmDelete\(drop, \{ ask: false \}\)/);
  assert.match(app, /M\.removeNode\(x, ref\.id\)\)\) return;/);
  assert.match(app, /const api = \{ t, mutate, lang: state\.lang, confirmDelete \}/);
});

test('wiring: the Connections panel never deletes or edits a link when something is removed; it only shows health and offers Go to', () => {
  const lp = read('../js/linkspanel.js'); const app = read('../js/app.js');
  assert.match(lp, /IC\.linkHealth\(l, modelsMap\(\)\)/);
  assert.match(lp, /L\.goTo/);
  assert.match(app, /goTo: goToEntity/);
  assert.doesNotMatch(read('../js/model.js'), /\blinks\b/);   // removing a node never reaches the workspace links
});

test('i18n: the new messages exist in both languages and carry the count placeholder', () => {
  ['confirmDeleteLinks', 'navMissing', 'navNoDiagram'].forEach((k) => assert.ok(STR.th[k] && STR.en[k], k));
  assert.match(STR.th.confirmDeleteLinks, /\{n\}/); assert.match(STR.en.confirmDeleteLinks, /\{n\}/);
  assert.match(STR.en.confirmDeleteLinks, /not deleted/); assert.match(STR.th.confirmDeleteLinks, /ไม่ถูกลบ/);
});
