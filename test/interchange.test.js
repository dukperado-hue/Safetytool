import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as IC from '../js/interchange.js';

const FILES = { bowtie: 'example-wildlife', swiss: 'example-swiss', shell: 'example-shell', hfacs: 'example-hfacs', stamp: 'example-stamp', fram: 'example-fram', pyramid: 'example-pyramid' };
const load = (type) => { const m = JSON.parse(readFileSync(new URL('../data/' + FILES[type] + '.json', import.meta.url), 'utf8')); const a = IC.adapterOf(m); a.normalize(m); IC.ensureIdentity(m); return m; };
const all = () => Object.keys(FILES).map((t) => load(t));
const firstOf = (m, type) => IC.entitiesOf(m).find((e) => e.type === type);
const bowtieStampLinks = (b, s) => [
  IC.newLink({ modelId: s.meta.modelId, entityId: s.hazards[0].id }, { modelId: b.meta.modelId, entityId: b.controls[0].id }, 'references', { status: 'confirmed', note: 'analyst: constraint names this control' }),
  IC.newLink({ modelId: b.meta.modelId, entityId: b.hazard.id }, { modelId: s.meta.modelId, entityId: s.hazards[0].id }, 'candidate_mapping', { status: 'proposed' }),
];

test('identity: ensureIdentity gives a stable id once and never changes it', () => {
  const m = JSON.parse(readFileSync(new URL('../data/example-hfacs.json', import.meta.url), 'utf8'));
  assert.ok(!m.meta.modelId);
  IC.ensureIdentity(m); const id = m.meta.modelId;
  IC.ensureIdentity(m); IC.ensureIdentity(m);
  assert.equal(m.meta.modelId, id); assert.equal(m.meta.revision, 1);
});

test('hashing: timestamps and revision do not change the content hash, content does; revision bumps only on changed exports', async () => {
  const m = load('swiss');
  const h1 = await IC.contentHash(m);
  m.meta.updatedAt = '2030-01-01T00:00:00.000Z'; m.meta.createdAt = '2029-01-01T00:00:00.000Z'; m.meta.revision = 7;
  assert.equal(await IC.contentHash(m), h1, 'volatile fields ignored');
  const copy = JSON.parse(JSON.stringify(m)); copy.hazard.text += ' changed';
  assert.notEqual(await IC.contentHash(copy), h1);
  const x = load('swiss');
  assert.equal(await IC.stampExport(x), false); assert.equal(x.meta.revision, 1);
  assert.equal(await IC.stampExport(x), false, 'same content: no bump');
  x.hazard.text += '!';
  assert.equal(await IC.stampExport(x), true); assert.equal(x.meta.revision, 2);
});

test('entity index: every model type exposes stable ids, interchange types and its evidence', () => {
  for (const m of all()) {
    const es = IC.entitiesOf(m);
    assert.ok(es.length > 0, m.schema);
    assert.equal(new Set(es.map((e) => e.id)).size, es.length, 'unique ids in ' + m.schema);
    es.forEach((e) => assert.ok(IC.ENTITY_TYPES.includes(e.type), e.type));
  }
  const s = load('stamp');
  assert.ok(IC.hasEntity(s, s.hazards[0].id + '#constraint'), 'constraint text is addressable through a derived id');
  assert.deepEqual(Object.keys(IC.SCHEMA_OF).sort(), Object.keys(FILES).sort());
});

test('links: the vocabulary has no causal relation and each relation is defined', () => {
  assert.deepEqual(IC.RELATION_IDS.sort(), ['candidate_mapping', 'derived_from', 'references', 'related_to', 'supports']);
  assert.ok(!IC.RELATION_IDS.some((r) => /caus|lead|result|effect/i.test(r)));
  IC.RELATION_IDS.forEach((r) => assert.ok(IC.RELATIONS[r].en.length > 20 && IC.RELATIONS[r].th.length > 5));
  assert.ok(/no claim about cause/i.test(IC.RELATIONS.related_to.en));
  assert.ok(/not independent verification/i.test(IC.RELATIONS.derived_from.en));
});

test('links: dangling, duplicate, self and non-vocabulary links are reported as errors', () => {
  const b = load('bowtie'); const s = load('stamp');
  const models = new Map([[b.meta.modelId, b], [s.meta.modelId, s]]);
  const ok = bowtieStampLinks(b, s);
  assert.deepEqual(IC.checkLinks(ok, models), []);
  const dang = IC.newLink({ modelId: b.meta.modelId, entityId: 'nope' }, { modelId: s.meta.modelId, entityId: s.hazards[0].id }, 'supports');
  assert.ok(IC.checkLinks([dang], models).some((i) => i.code === 'L-07'));
  const nomodel = IC.newLink({ modelId: 'md_gone', entityId: 'x' }, { modelId: s.meta.modelId, entityId: s.hazards[0].id }, 'supports');
  assert.ok(IC.checkLinks([nomodel], models).some((i) => i.code === 'L-06'));
  const dupe = { ...ok[0] };
  assert.ok(IC.checkLinks([ok[0], dupe], models).some((i) => i.code === 'L-02'));
  const self = IC.newLink({ modelId: b.meta.modelId, entityId: b.hazard.id }, { modelId: b.meta.modelId, entityId: b.hazard.id }, 'related_to');
  assert.ok(IC.checkLinks([self], models).some((i) => i.code === 'L-08'));
  const causal = { ...ok[0], id: 'lk_c', relation: 'causes' };
  assert.ok(IC.checkLinks([causal], models).some((i) => i.code === 'L-03' && /never assert causation/.test(i.message)));
});

test('package: all seven model types round-trip through JSON text with ids, links, unknown fields and provenance intact', async () => {
  const models = all();
  const b = models[0]; const s = models.find((m) => m.schema === 'safetytool.stamp/1');
  b.x_custom = { keep: 'me' }; b.meta.x_note = 'extension in meta';
  b.meta.transformations = [{ id: 'tr_1', transformId: 'bowtie-to-swiss', version: '1', at: '2026-01-01T00:00:00.000Z', from: { modelId: 'md_x', revision: 1, hash: 'h' }, summary: 'kept' }];
  const links = bowtieStampLinks(b, s);
  const pkg = await IC.buildPackage(models.map((model) => ({ model })), { links, history: [{ note: 'package-level history' }], extensions: { 'x-org': { a: 1 } }, now: '2026-10-15T00:00:00.000Z' });
  assert.equal(pkg.format, 'safetytool.package'); assert.equal(pkg.validation.ok, true);
  const other = JSON.parse(JSON.stringify(pkg)); // "another computer": only the text crosses
  const pre = await IC.validatePackage(other, []);
  assert.equal(pre.ok, true, pre.errors.join('; '));
  assert.ok(pre.members.every((x) => x.status === 'new'));
  const plan = IC.planImport(other, pre, {}, { now: '2026-10-16T00:00:00.000Z' });
  assert.equal(plan.actions.length, 7);
  plan.actions.forEach((a) => { const orig = models.find((m) => m.meta.modelId === a.modelId); assert.equal(IC.canonical(a.model), IC.canonical(orig), 'identical semantic content: ' + a.type); });
  const bb = plan.actions.find((a) => a.type === 'bowtie').model;
  assert.deepEqual(bb.x_custom, { keep: 'me' }); assert.equal(bb.meta.x_note, 'extension in meta'); assert.equal(bb.meta.transformations[0].transformId, 'bowtie-to-swiss');
  assert.deepEqual(plan.links.map((l) => l.id).sort(), links.map((l) => l.id).sort());
  assert.deepEqual(plan.links.find((l) => l.relation === 'references').from, links[0].from, 'direction and endpoints kept');
  assert.equal(plan.droppedLinks.length, 0);
  assert.deepEqual(pkg.history, [{ note: 'package-level history' }]); assert.deepEqual(pkg.extensions, { 'x-org': { a: 1 } });
});

test('package: hash is stable when only the export time differs, and changes when content or links change', async () => {
  const models = all().map((model) => ({ model }));
  const a = await IC.buildPackage(models, { now: '2026-01-01T00:00:00.000Z' });
  const b = await IC.buildPackage(models, { now: '2027-06-06T00:00:00.000Z' });
  assert.equal(a.packageHash, b.packageHash); assert.notEqual(a.exportedAt, b.exportedAt);
  models[0].model.hazard.text += ' (edited)';
  assert.notEqual((await IC.buildPackage(models)).packageHash, a.packageHash);
  const d = IC.diffPackages(a, await IC.buildPackage(models));
  assert.equal(d.modelsChanged.length, 1); assert.equal(d.identicalContent, false);
});

test('package: unsupported versions, unknown schemas and bad structure are refused or set aside — never imported', async () => {
  const pkg = await IC.buildPackage(all().map((model) => ({ model })));
  const bad = (f) => { const p = JSON.parse(JSON.stringify(pkg)); f(p); return IC.validatePackage(p, []); };
  let r = await bad((p) => { p.formatVersion = 99; }); assert.equal(r.ok, false); assert.match(r.errors[0], /newer than this Safetytool/);
  r = await bad((p) => { p.formatVersion = 0; }); assert.equal(r.ok, false); assert.match(r.errors[0], /no migration path/);
  r = await bad((p) => { p.format = 'something.else'; }); assert.equal(r.ok, false);
  r = await bad((p) => { p.members[0].content.schema = 'safetytool.bowtie/2'; });
  assert.equal(r.members[0].status, 'unsupported'); assert.equal(r.unsupported.length, 1); assert.ok(r.ok, 'the other members are still importable');
  r = await bad((p) => { delete p.members[1].content.meta.modelId; }); assert.equal(r.ok, false);
  r = await bad((p) => { p.members[2].content.subject = null; }); assert.equal(r.ok, false); assert.equal(r.members[2].status, 'invalid', 'a structurally broken model is rejected');
  r = await bad((p) => { p.members[3].modelId = 'md_other'; }); assert.equal(r.ok, false);
  r = await bad((p) => { p.members.push(JSON.parse(JSON.stringify(p.members[0]))); }); assert.equal(r.ok, false, 'duplicate path / modelId');
  r = await bad((p) => { p.zzz_future = { a: 1 }; }); assert.ok(r.ok); assert.ok('zzz_future' in r.unknown); assert.ok(r.warnings.some((w) => /unknown top-level fields/.test(w)));
  r = await bad((p) => { p.members[0].content.hazard.text = 'changed after export'; }); assert.ok(r.warnings.some((w) => /differs from the hash/.test(w)));
});

test('package: unsafe paths, prototype keys, script-like content and foreign member kinds are rejected', async () => {
  const pkg = await IC.buildPackage(all().map((model) => ({ model })));
  const bad = (f) => { const p = JSON.parse(JSON.stringify(pkg)); f(p); return IC.validatePackage(p, []); };
  for (const p of ['../evil.json', '/etc/passwd', 'models/../../x.json', 'models\\x.json', 'http://x/y.json', 'models/a b.json', 'js/app.js', 'models/x.js']) {
    const r = await bad((q) => { q.members[0].path = p; }); assert.equal(r.members[0].status, 'invalid', p); assert.equal(r.ok, false, p);
  }
  assert.equal(IC.isSafePath('models/bowtie-md_abc123.json'), true);
  let r = await bad((q) => { q.members[0].kind = 'script'; }); assert.equal(r.ok, false);
  r = await bad((q) => { q.members[0].content = '<script>alert(1)</script>'; }); assert.equal(r.ok, false);
  r = await bad((q) => { q.members[0].content.hazard.text = 'x <script>alert(1)</script>'; }); assert.equal(r.ok, false); assert.match(r.errors[0], /script-like/);
  r = await bad((q) => { q.members[0].content.hazard.text = 'javascript:alert(1)'; }); assert.equal(r.ok, false);
  const proto = JSON.parse(JSON.stringify(pkg).replace('"format"', '"__proto__":{"x":1},"format"'));
  r = await IC.validatePackage(proto, []); assert.equal(r.ok, false); assert.match(r.errors[0], /unsafe key/);
  assert.equal(({}).x, undefined, 'nothing polluted Object.prototype');
  r = await bad((q) => { q.members = Array.from({ length: IC.MAX_MEMBERS + 1 }, () => q.members[0]); }); assert.equal(r.ok, false); assert.match(r.errors[0], /too many members/);
});

test('package: dangling links are detected, dropped from the plan and reported', async () => {
  const b = load('bowtie'); const s = load('stamp');
  const good = bowtieStampLinks(b, s);
  const dang = IC.newLink({ modelId: b.meta.modelId, entityId: b.hazard.id }, { modelId: 'md_not_in_package', entityId: 'x' }, 'related_to');
  const pkg = await IC.buildPackage([{ model: b }, { model: s }], { links: [...good, dang] });
  assert.equal(pkg.validation.ok, false, 'export-time validation already says so');
  const pre = await IC.validatePackage(JSON.parse(JSON.stringify(pkg)), []);
  assert.equal(pre.ok, true); assert.ok(pre.warnings.some((w) => /1 link\(s\) cannot be used/.test(w)));
  const plan = IC.planImport(pkg, pre, {});
  assert.equal(plan.links.length, 2); assert.equal(plan.droppedLinks.length, 1);
});

test('conflicts: a different model with the same id is never overwritten silently; each resolution is explicit', async () => {
  const b = load('bowtie'); const s = load('stamp');
  const pkg = JSON.parse(JSON.stringify(await IC.buildPackage([{ model: b }, { model: s }], { links: bowtieStampLinks(b, s) })));
  const existingB = JSON.parse(JSON.stringify(b)); existingB.hazard.text = 'EDITED LOCALLY';
  const existing = [{ modelId: b.meta.modelId, type: 'bowtie', revision: 1, hash: await IC.contentHash(existingB), title: b.meta.title }];
  const pre = await IC.validatePackage(pkg, existing);
  assert.equal(pre.conflicts.length, 1); assert.deepEqual(pre.conflicts[0].options, ['keep-existing', 'import-as-copy', 'replace']);
  assert.equal(pre.members.find((m) => m.type === 'stamp').status, 'new');
  // 1. no decision: the conflicting model is skipped, nothing is replaced
  let plan = IC.planImport(pkg, pre, {});
  assert.deepEqual(plan.actions.map((a) => a.type), ['stamp']); assert.ok(plan.skipped.some((x) => /unresolved conflict/.test(x.reason)));
  assert.equal(plan.links.length, 0, 'links to a model that was not applied are not applied either');
  // 2. keep existing
  plan = IC.planImport(pkg, pre, { [b.meta.modelId]: 'keep-existing' }, { existingIds: [b.meta.modelId] });
  assert.deepEqual(plan.actions.map((a) => a.type), ['stamp']); assert.equal(plan.links.length, 2, 'links point at the model that stays');
  // 3. import as copy: new id, links remapped, history says so
  plan = IC.planImport(pkg, pre, { [b.meta.modelId]: 'import-as-copy' }, { newId: () => 'md_copy_1' });
  const copy = plan.actions.find((a) => a.copyOf);
  assert.equal(copy.modelId, 'md_copy_1'); assert.equal(copy.model.meta.revision, 1); assert.match(copy.model.meta.title, /imported copy/);
  assert.equal(copy.model.meta.transformations.at(-1).transformId, 'import-as-copy');
  assert.ok(plan.links.every((l) => [l.from.modelId, l.to.modelId].includes('md_copy_1')));
  assert.equal(plan.remap[b.meta.modelId], 'md_copy_1');
  assert.ok(plan.links.every((l) => !pkg.links.some((o) => o.id === l.id)), 'remapped links get new ids so they can sit next to the originals');
  // 4. replace only when asked
  plan = IC.planImport(pkg, pre, { [b.meta.modelId]: 'replace' });
  assert.equal(plan.actions.find((a) => a.type === 'bowtie').action, 'replace');
  // identical content is not a conflict
  const same = [{ modelId: b.meta.modelId, type: 'bowtie', revision: 1, hash: await IC.contentHash(b), title: '' }];
  const pre2 = await IC.validatePackage(pkg, same);
  assert.equal(pre2.conflicts.length, 0); assert.equal(pre2.members.find((m) => m.type === 'bowtie').status, 'identical');
});

test('inspect: provenance and dependency summary of a model', () => {
  const b = load('bowtie'); const s = load('stamp');
  const info = IC.inspectModel(b, bowtieStampLinks(b, s));
  assert.equal(info.modelId, b.meta.modelId); assert.equal(info.linksOut, 1); assert.equal(info.linksIn, 1); assert.ok(info.entities > 10);
});
