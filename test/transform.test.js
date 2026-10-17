import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as IC from '../js/interchange.js';
import * as TR from '../js/transform.js';
import * as SW from '../js/swiss.js';
import * as ST from '../js/stamp.js';
import * as HF from '../js/hfacs.js';
import * as FR from '../js/fram.js';

const load = (f) => { const m = JSON.parse(readFileSync(new URL('../data/' + f + '.json', import.meta.url), 'utf8')); IC.adapterOf(m).normalize(m); IC.ensureIdentity(m); return m; };
const bowtie = () => load('example-wildlife');
const ALL = (p) => p.needsConfirmation.map((c) => c.id);

test('registry: every transformation documents what is copied, transformed, not transferred, its provenance, validation and limits', () => {
  assert.ok(TR.TRANSFORMS.length >= 6);
  for (const t of TR.TRANSFORMS) {
    assert.ok(t.title.en && t.title.th, t.id);
    for (const k of ['copied', 'transformed', 'notTransferred', 'provenance', 'validation', 'limitations']) assert.ok(Array.isArray(t.docs[k]), t.id + '.' + k);
    if (t.supported) assert.ok(t.docs.copied.length && t.docs.limitations.length, t.id);
    else assert.ok(t.unsupportedReason.en && t.unsupportedReason.th, t.id);
  }
  assert.ok(!TR.transformById('fram-to-bowtie-stamp').supported, 'FRAM → Bowtie/STPA is explained as unsupported, not faked');
});

test('bowtie → swiss: preserves the existing behaviour, needs a route decision, never touches the source', () => {
  const b = bowtie(); const before = JSON.stringify(b);
  assert.equal(TR.previewTransform('bowtie-to-swiss', b, {}).ok, false, 'no threat chosen');
  const t = b.threats[0];
  const p = TR.previewTransform('bowtie-to-swiss', b, { threatId: t.id });
  assert.equal(p.ok, true, JSON.stringify(p.decisionErrors));
  const direct = SW.swissFromBowtie(JSON.parse(before), { threatId: t.id, consequenceId: null });
  assert.deepEqual(p.destination.layers.map((l) => [l.name, l.defence, l.controlId, l.holes.map((h) => [h.text, h.type, h.escalationId, h.notes])]), direct.layers.map((l) => [l.name, l.defence, l.controlId, l.holes.map((h) => [h.text, h.type, h.escalationId, h.notes])]));
  assert.deepEqual(p.destination.trajectory, [], 'trajectory left empty on purpose');
  assert.equal(p.destination.loss.text, b.topEvent.text);
  assert.equal(JSON.stringify(b), before, 'source untouched');
  assert.ok(p.links.length > 0 && p.links.every((l) => l.relation === 'derived_from' && l.from.modelId === p.destination.meta.modelId && l.to.modelId === b.meta.modelId));
  assert.ok(p.omitted.length >= 3);
  assert.deepEqual(p.needsConfirmation, []);
  assert.notEqual(p.destination.meta.modelId, b.meta.modelId);
});

test('apply: refuses until the preview is valid and every confirmation is given; records the transformation', async () => {
  const b = bowtie();
  const p = TR.previewTransform('bowtie-to-stamp', b, {});
  assert.equal(p.ok, true); assert.equal(p.needsConfirmation.length, 4);
  let r = await TR.applyTransform(p, []);
  assert.equal(r.ok, false); assert.ok(r.errors.some((e) => /not confirmed: system/.test(e)));
  r = await TR.applyTransform(p, ['system', 'hazard-state']);
  assert.equal(r.ok, false, 'partial confirmation is not enough');
  r = await TR.applyTransform(p, ALL(p), { now: '2026-10-15T00:00:00.000Z', decisions: {} });
  assert.equal(r.ok, true);
  const h = r.model.meta.transformations.at(-1);
  assert.equal(h.transformId, 'bowtie-to-stamp'); assert.equal(h.from.modelId, b.meta.modelId); assert.deepEqual(h.confirmations.sort(), ALL(p).sort()); assert.ok(h.omitted.length > 0);
  assert.equal((await TR.applyTransform(TR.previewTransform('fram-to-bowtie-stamp', FR.emptyFram(), {}), [])).ok, false);
  const broken = TR.previewTransform('bowtie-to-swiss', b, {});
  assert.equal((await TR.applyTransform(broken, [])).ok, false, 'a preview with missing decisions cannot be applied');
});

test('bowtie → STPA: proposes losses and one hazard, leaves system/constraints/structure empty, confirms nothing', () => {
  const b = bowtie();
  const p = TR.previewTransform('bowtie-to-stamp', b, {});
  const d = p.destination;
  assert.equal(d.losses.length, b.consequences.length);
  assert.deepEqual(d.losses.map((l) => l.text), b.consequences.map((c) => c.text), 'text copied verbatim');
  assert.equal(d.hazards.length, 1); assert.equal(d.hazards[0].text, b.topEvent.text);
  assert.equal(d.system.text, '', 'system and boundary are not invented');
  assert.equal(d.hazards[0].constraint, '', 'no constraint text generated');
  assert.deepEqual([d.nodes.length, d.actions.length, d.ucas.length, d.scenarios.length], [0, 0, 0, 0]);
  assert.ok(d.losses.every((l) => /PROPOSED/.test(l.notes)) && /PROPOSED/.test(d.hazards[0].notes));
  assert.ok(p.links.length > 0 && p.links.every((l) => ['candidate_mapping', 'references'].includes(l.relation) && l.status === 'proposed'), 'nothing is confirmed automatically');
  assert.ok(!p.links.some((l) => l.relation === 'derived_from' && l.status === 'confirmed'));
  assert.ok(ST.lintStamp(d).some((i) => i.rule === 'S001' && i.severity === 'error'), 'the missing system still shows up as an error in lint');
  assert.deepEqual(ST.validateStamp(d), []);
});

test('bowtie → FRAM: functions from controls, variability only as unreviewed anticipated suggestions, no couplings, aspects unknown', () => {
  const b = bowtie();
  const p = TR.previewTransform('bowtie-to-fram', b, {});
  const d = p.destination;
  assert.equal(p.ok, true, p.validation.errors.join('; '));
  assert.equal(d.functions.length, b.controls.length);
  assert.equal(d.couplings.length, 0, 'bowtie order is not an output→input relation');
  assert.equal(d.activity.text, '');
  for (const f of d.functions) {
    ['input', 'output', 'precondition', 'control', 'time'].forEach((a) => assert.equal(f.aspects[a].status, 'unknown'));
    f.variability.forEach((v) => { assert.equal(v.state, 'anticipated'); assert.deepEqual([v.prov.origin, v.prov.reviewed], ['generated', false]); assert.ok(v.prov.from.entityId); });
    f.aspects.resource.items.forEach((i) => { assert.equal(i.prov.origin, 'generated'); assert.equal(i.prov.reviewed, false); });
  }
  const owned = b.controls.filter((c) => (c.owner || '').trim()).length;
  assert.equal(d.functions.filter((f) => f.aspects.resource.items.length).length, owned);
  assert.ok(FR.lintFram(d).some((i) => i.rule === 'FR011'), 'generated items are flagged as unreviewed');
  assert.ok(p.links.every((l) => l.relation === 'candidate_mapping' && l.status === 'proposed'));
});

test('swiss → HFACS: holes become UNCLASSIFIED factors; no category is ever assigned', () => {
  const s = load('example-swiss');
  const p = TR.previewTransform('swiss-to-hfacs', s, {});
  const d = p.destination;
  const holes = s.layers.flatMap((l) => l.holes);
  assert.equal(p.ok, true); assert.equal(d.factors.length, holes.length);
  assert.ok(d.factors.every((f) => f.category === null && f.influences.length === 0 && f.evidence === ''));
  assert.deepEqual(d.factors.map((f) => f.text), holes.map((h) => h.text));
  assert.ok(d.factors.every((f) => /no HFACS category assigned/.test(f.notes)));
  assert.ok(HF.lintHfacs(d).filter((i) => i.rule === 'F003').length === holes.length, 'lint lists each unclassified factor');
  assert.ok(p.links.every((l) => l.relation !== 'causes'));
  assert.deepEqual(ALL(p).sort(), ['categories', 'occurrence']);
});

test('FRAM → Bowtie/STPA: unsupported, with an explanation and no destination', () => {
  const p = TR.previewTransform('fram-to-bowtie-stamp', load('example-fram'), {});
  assert.equal(p.supported, false); assert.equal(p.ok, false); assert.equal(p.destination, null);
  assert.match(p.unsupportedReason.en, /would be a guess/); assert.ok(p.unsupportedReason.th.length > 20);
});

test('transformations: stable source ids, no false causal links, provenance retained, the source is never modified', async () => {
  const b = bowtie(); const before = IC.canonical(b); const ids = IC.entitiesOf(b).map((e) => e.id);
  for (const id of ['bowtie-to-stamp', 'bowtie-to-fram']) {
    const p = TR.previewTransform(id, b, {});
    const r = await TR.applyTransform(p, ALL(p), { sourceHash: await IC.contentHash(b) });
    assert.equal(r.ok, true);
    assert.equal(r.history.from.contentHash, await IC.contentHash(b));
    r.links.forEach((l) => { assert.ok(IC.RELATION_IDS.includes(l.relation)); assert.equal(l.by, 'transformation'); assert.equal(l.via, id + '@1'); });
    const models = new Map([[b.meta.modelId, b], [r.model.meta.modelId, r.model]]);
    assert.deepEqual(IC.checkLinks(r.links, models), [], 'every link endpoint exists in source or destination');
  }
  assert.equal(IC.canonical(b), before); assert.deepEqual(IC.entitiesOf(b).map((e) => e.id), ids);
});
