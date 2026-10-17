import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as PY from '../js/pyramid.js';
import { textWidth } from '../js/textmetrics.js';

const ex = () => PY.normalizePyramid(JSON.parse(readFileSync(new URL('../data/example-pyramid.json', import.meta.url), 'utf8')));
const mk = (start = '2025-01-01', end = '2025-12-31') => {
  const m = PY.emptyPyramid(); m.dataset.description = 'Invented dataset for the test'; m.dataset.periodStart = start; m.dataset.periodEnd = end;
  ['Severe', 'Moderate', 'Minor'].forEach((l) => PY.addCategory(m, l, l + ' (definition)'));
  return m;
};

test('pyramid: counts come from aggregate entries; an unrecorded tier is UNKNOWN, never zero', () => {
  const m = mk();
  PY.setCount(m, m.categories[0].id, 3); PY.setCount(m, m.categories[2].id, 40);
  const t = PY.tally(m);
  assert.deepEqual(t.rows.map((r) => r.count), [3, null, 40]);
  assert.deepEqual(t.rows.map((r) => r.unknown), [false, true, false]);
  assert.equal(t.total, 43);
  assert.ok(PY.lintPyramid(m).some((i) => i.rule === 'PY008' && i.targetId === m.categories[1].id));
});

test('pyramid: records are the basis when present; duplicates, exclusions and uncategorised records are reported, not hidden', () => {
  const m = mk();
  const [a, b] = m.categories;
  const r1 = PY.addRecord(m, { categoryId: a.id, date: '2025-02-01', reference: 'R-1' });
  PY.addRecord(m, { categoryId: a.id, date: '2025-02-01', reference: 'R-1', duplicateOf: r1.id });
  PY.addRecord(m, { categoryId: b.id, date: '2025-03-01', excluded: true });
  PY.addRecord(m, { categoryId: null, date: '2025-04-01' });
  PY.addRecord(m, { categoryId: b.id, date: '' });
  PY.addRecord(m, { categoryId: b.id, date: '2024-12-31' });
  const t = PY.tally(m);
  assert.equal(t.basis, 'records');
  assert.deepEqual(t.rows.map((r) => r.count), [1, 0, 0], 'records with no valid date or outside the window are reported, not counted');
  assert.deepEqual([t.duplicates, t.excluded, t.uncategorised, t.incompleteDates, t.outsideWindow], [1, 1, 1, 1, 1]);
  assert.deepEqual(PY.validatePyramid(m), []);
  m.records[1].duplicateOf = 'rc_missing';
  assert.ok(PY.validatePyramid(m).some((e) => /missing record/.test(e)));
});

test('pyramid: possible duplicates are flagged but never removed automatically', () => {
  const m = mk(); const a = m.categories[0];
  PY.addRecord(m, { categoryId: a.id, date: '2025-02-01', reference: 'R-9' });
  PY.addRecord(m, { categoryId: a.id, date: '2025-02-01', reference: 'r-9' });
  assert.ok(PY.lintPyramid(m).some((i) => i.rule === 'PY017'));
  assert.equal(PY.tally(m).rows[0].count, 2);
});

test('pyramid: no rate without a valid denominator, unit, written definition, scale and observation window', () => {
  const m = mk(); PY.setCount(m, m.categories[0].id, 4);
  assert.equal(PY.rateOf(m, 4).valid, false);
  m.exposure.value = 1000; m.exposure.unit = 'flight hours';
  assert.equal(PY.exposureCheck(m).valid, false, 'definition missing');
  assert.ok(PY.lintPyramid(m).some((i) => i.rule === 'PY010'));
  m.exposure.definition = 'Invented: hours flown in the period';
  assert.equal(PY.exposureCheck(m).valid, true);
  const r = PY.rateOf(m, 4);
  assert.equal(r.valid, true); assert.equal(r.value, 4); // 4 / 1000 * 1000
  assert.match(r.text, /^4 per 1000 flight hours$/);
  m.dataset.periodEnd = '';
  assert.equal(PY.rateOf(m, 4).valid, false, 'no window → counts only');
  assert.equal(PY.rateOf(m, null).valid, false, 'unknown count has no rate');
  m.exposure.value = 0;
  assert.ok(PY.validatePyramid(m).some((e) => /greater than 0/.test(e)));
});

test('pyramid: datasets are compared only under compatible definitions; otherwise a warning and no difference', () => {
  const a = mk(); const b = mk();
  a.categories.forEach((c, i) => { PY.setCount(a, c.id, [2, 9, 30][i]); }); b.categories.forEach((c, i) => { PY.setCount(b, c.id, [1, 11, 28][i]); });
  const same = PY.comparePyramids(a, b);
  assert.equal(same.level, 'compatible');
  assert.deepEqual(same.rows.map((r) => r.delta), [-1, 2, -2]);
  assert.equal(same.ratesComparable, false, 'no denominators → counts only');
  b.dataset.periodEnd = '2025-06-30';
  const win = PY.comparePyramids(a, b);
  assert.equal(win.level, 'caution'); assert.ok(win.warnings.some((w) => /windows differ/.test(w))); assert.ok(win.rows.every((r) => r.delta === null));
  b.categories[0].label = 'Fatal';
  const cat = PY.comparePyramids(a, b);
  assert.equal(cat.level, 'incompatible'); assert.ok(cat.warnings.some((w) => /different severity categories/.test(w)));
  assert.ok(cat.rows.every((r) => r.delta === null));
});

test('pyramid: rates are compared only when unit, definition and scale match', () => {
  const a = mk(); const b = mk();
  [a, b].forEach((m, k) => { m.categories.forEach((c) => PY.setCount(m, c.id, 10 * (k + 1))); Object.assign(m.exposure, { value: 1000, unit: 'flight hours', definition: 'Invented hours', rateScale: 1000 }); });
  const ok = PY.comparePyramids(a, b);
  assert.equal(ok.ratesComparable, true); assert.equal(ok.rows[0].rateDelta, 10);
  b.exposure.unit = 'movements';
  const no = PY.comparePyramids(a, b);
  assert.equal(no.ratesComparable, false); assert.ok(no.rows.every((r) => r.rateDelta === null)); assert.ok(no.warnings.some((w) => /Denominators differ/.test(w)));
});

test('pyramid: an empty dataset has an empty tally, a warning-free picture and no crash', () => {
  const m = PY.emptyPyramid();
  assert.equal(PY.tally(m).rows.length, 0);
  const g = PY.layoutPyramid(m, { lang: 'en' });
  assert.ok(g.items.some((i) => i.id === 'pyramid_empty'));
  assert.ok(PY.lintPyramid(m).some((i) => i.rule === 'PY003'));
  assert.deepEqual(PY.validatePyramid(m), []);
});

test('pyramid: nothing in the module or the example hard-codes a universal accident ratio', () => {
  const src = readFileSync(new URL('../js/pyramid.js', import.meta.url), 'utf8');
  assert.ok(!/1\s*:\s*29|29\s*:\s*300|:\s*300\b|\b300\s*:|1-10-30|ratio\s*=/.test(src), 'no ratio constants');
  const m = ex();
  const t = PY.tally(m);
  const ratios = t.rows.slice(1).map((r, i) => r.count / t.rows[i].count);
  assert.ok(m.meta.illustrative && /SYNTHETIC/i.test(m.meta.title), 'demo is labelled synthetic');
  assert.ok(ratios.some((x) => x !== ratios[0]), 'demo tiers are not in a fixed proportion');
});

test('pyramid: example validates; the layout has one clickable tier per category and states what it is', () => {
  const m = ex();
  assert.deepEqual(PY.validatePyramid(m), []);
  const g = PY.layoutPyramid(m, { lang: 'en' });
  m.categories.forEach((c) => assert.ok(g.items.find((i) => i.id === c.id && !i.inert)));
  const banner = g.items.find((i) => i.id === 'pyramid_banner');
  assert.ok(banner.prims.some((p) => /not a prediction/.test(p.s || '')), 'limits stated in the picture');
  assert.ok(PY.outlinePyramid(m).includes('DENOMINATOR'));
  const noDen = ex(); noDen.exposure.value = null;
  assert.ok(PY.layoutPyramid(noDen, { lang: 'en' }).items.find((i) => i.id === 'pyramid_banner').prims.some((p) => /COUNTS ONLY/.test(p.s || '')));
});

test('pyramid import: CSV is parsed, previewed without changing the model, then applied with provenance', () => {
  const m = mk(); const before = JSON.stringify(m);
  const csv = 'id,date,category,reference,note\nE1,2025-03-04,Severe,R-1,first\nE2,2025-13-40,Moderate,R-2,bad date\nE3,,Unknown tier,R-3,\nE4,2025-05-05,,R-4,\n';
  const parsed = PY.parseEventCsv(csv);
  assert.equal(parsed.rows.length, 4); assert.deepEqual(parsed.errors, []);
  const pre = PY.previewEventImport(m, parsed.rows);
  assert.equal(JSON.stringify(m), before, 'preview changes nothing');
  assert.deepEqual([pre.accepted, pre.invalidDates, pre.missingDates, pre.unmappedLabels.length], [4, 1, 1, 1]);
  const res = PY.applyEventImport(m, parsed.rows, { createCategories: false, source: { name: 'events.csv', hash: 'abc', rows: 4 }, now: '2026-01-01T00:00:00.000Z' });
  assert.equal(res.added, 4);
  assert.equal(m.categories.length, 3, 'unseen label did not create a tier');
  assert.ok(m.records.every((r) => r.importId === res.importId));
  assert.equal(m.records[1].date, '', 'invalid date dropped, not guessed'); assert.match(m.records[1].note, /invalid date/);
  assert.equal(m.meta.transformations[0].transformId, 'event-records-to-pyramid');
  assert.deepEqual(PY.validatePyramid(m), []);
  assert.equal(PY.previewEventImport(m, parsed.rows).skippedExistingId, 4, 'all four rows now exist by id: they are skipped, not duplicated');
  assert.ok(PY.parseEventCsv('a,b\n1,2').errors.length, 'a category column is required');
});

// ---------------------------------------------------------------- Sprint B: G2 window filtering
const recs = (m, rows) => rows.forEach(([cat, date, extra]) => PY.addRecord(m, { categoryId: m.categories[cat].id, date, ...(extra || {}) }));
const counts = (m) => PY.tally(m).rows.map((r) => r.count);

test('G2: records all inside the window are all counted', () => {
  const m = mk(); recs(m, [[0, '2025-02-01'], [0, '2025-06-30'], [1, '2025-12-01']]);
  const t = PY.tally(m);
  assert.deepEqual(counts(m), [2, 1, 0]);
  assert.deepEqual([t.included, t.outsideWindow, t.incompleteDates, t.windowApplied], [3, 0, 0, true]);
});

test('G2: records before and after the window are not counted and are reported separately', () => {
  const m = mk(); recs(m, [[0, '2024-12-31'], [0, '2025-06-01'], [0, '2026-01-01'], [1, '2020-01-01']]);
  const t = PY.tally(m);
  assert.deepEqual(counts(m), [1, 0, 0]);
  assert.deepEqual([t.outsideBefore, t.outsideAfter, t.outsideWindow, t.included], [2, 1, 3, 1]);
});

test('G2: the first and the last day of the window are included (inclusive both ends)', () => {
  const m = mk('2025-03-01', '2025-03-31'); recs(m, [[0, '2025-03-01'], [0, '2025-03-31'], [0, '2025-02-28'], [0, '2025-04-01']]);
  assert.deepEqual(counts(m), [2, 0, 0]);
  const one = mk('2025-03-05', '2025-03-05'); recs(one, [[0, '2025-03-05'], [0, '2025-03-04'], [0, '2025-03-06']]);
  assert.deepEqual(counts(one), [1, 0, 0], 'a one-day window holds exactly that day');
});

test('G2: a record outside the window never adds to the window total', () => {
  const m = mk(); recs(m, [[0, '2025-05-05']]);
  const before = PY.tally(m);
  recs(m, [[0, '1999-01-01'], [1, '2031-01-01']]);
  const after = PY.tally(m);
  assert.deepEqual(after.rows.map((r) => r.count), before.rows.map((r) => r.count));
  assert.equal(after.total, before.total);
});

test('G2: a record with no date, or an impossible date, is not counted as in-window', () => {
  const m = mk(); recs(m, [[0, ''], [0, '2025-02-30'], [0, '2025-13-01'], [0, '2025-3-1'], [0, '2025-03-01T10:00:00Z'], [0, '2025-03-01']]);
  const t = PY.tally(m);
  assert.deepEqual(counts(m), [1, 0, 0]);
  assert.equal(t.incompleteDates, 5);
  assert.equal(t.outsideWindow, 0, 'bad dates are not mislabelled as outside');
  assert.equal(PY.lintPyramid(m).filter((i) => i.rule === 'PY014').length, 5);
});

test('G2: a window with no records inside it gives zero on a records basis, with every record accounted for', () => {
  const m = mk('2025-01-01', '2025-01-31'); recs(m, [[0, '2025-02-01'], [1, '2024-12-31']]);
  const t = PY.tally(m);
  assert.deepEqual(counts(m), [0, 0, 0]); assert.equal(t.basis, 'records'); assert.equal(t.hasUnknown, false);
  assert.equal(t.records, t.included + t.duplicates + t.excluded + t.uncategorised + t.incompleteDates + t.outsideWindow, 'buckets reconcile with the record total');
});

test('G2: a window spanning a month and a year boundary uses calendar dates, not durations', () => {
  const m = mk('2024-12-15', '2025-01-15'); recs(m, [[0, '2024-12-14'], [0, '2024-12-15'], [0, '2024-12-31'], [0, '2025-01-01'], [0, '2025-01-15'], [0, '2025-01-16']]);
  const t = PY.tally(m);
  assert.deepEqual(counts(m), [4, 0, 0]);
  assert.deepEqual([t.outsideBefore, t.outsideAfter], [1, 1]);
  assert.equal(PY.windowDays(m), 32);
});

test('G2: tallying never changes the stored records (nothing is deleted or edited because it is outside the window)', () => {
  const m = mk(); recs(m, [[0, '2024-01-01'], [0, ''], [1, '2025-05-05'], [1, 'garbage']]);
  const snap = JSON.stringify(m);
  PY.tally(m); PY.lintPyramid(m); PY.outlinePyramid(m); PY.layoutPyramid(m, { lang: 'en' }); PY.recordStatus(m, m.records[0]);
  assert.equal(JSON.stringify(m), snap);
  assert.equal(m.records.length, 4);
});

test('G2: with no valid window nothing can be filtered by date; this is reported, not hidden', () => {
  const m = mk('', ''); recs(m, [[0, '1990-01-01'], [0, '']]);
  const t = PY.tally(m);
  assert.equal(t.windowApplied, false); assert.equal(t.window, null);
  assert.deepEqual(counts(m), [2, 0, 0]);
  assert.ok(PY.lintPyramid(m).some((i) => i.rule === 'PY002'));
  assert.match(PY.outlinePyramid(m), /no valid analysis window/);
  const rev = mk('2025-12-31', '2025-01-01'); recs(rev, [[0, '2025-06-01']]);
  assert.equal(PY.tally(rev).windowApplied, false, 'a reversed window is not a window');
});

test('G2: a record that is both a duplicate and out of the window is reported once, as a duplicate', () => {
  const m = mk(); const r1 = PY.addRecord(m, { categoryId: m.categories[0].id, date: '2025-05-05', reference: 'A' });
  PY.addRecord(m, { categoryId: m.categories[0].id, date: '2019-05-05', reference: 'A', duplicateOf: r1.id });
  const t = PY.tally(m);
  assert.deepEqual([t.duplicates, t.outsideWindow, t.included], [1, 0, 1]);
});

// ---------------------------------------------------------------- Sprint B: G3 stable basis
const agg = (m, v) => v.forEach((x, i) => { if (x != null) PY.setCount(m, m.categories[i].id, x); });

test('G3: no records -> aggregate basis, exactly as before (unknown stays unknown)', () => {
  const m = mk(); agg(m, [3, null, 40]);
  const t = PY.tally(m);
  assert.equal(t.basis, 'aggregate'); assert.equal(t.basisNote, 'aggregate'); assert.equal(t.recordsCheck, null);
  assert.deepEqual(t.rows.map((r) => r.count), [3, null, 40]);
});

test('G3: adding the first record does not change a single aggregate figure', () => {
  const m = mk(); agg(m, [3, 9, 40]);
  const before = PY.tally(m);
  PY.addRecord(m, { categoryId: m.categories[0].id, date: '2025-02-02' });
  const after = PY.tally(m);
  assert.equal(after.basis, 'aggregate');
  assert.deepEqual(after.rows.map((r) => r.count), before.rows.map((r) => r.count));
  assert.equal(after.total, before.total);
  assert.equal(after.basisNote, 'aggregate-records-unused');
});

test('G3: aggregate larger than the records: aggregate is kept, the difference is shown and linted, nothing is summed', () => {
  const m = mk(); agg(m, [10, 20, 30]); recs(m, [[0, '2025-01-05'], [0, '2025-01-06'], [1, '2025-02-01']]);
  const t = PY.tally(m);
  assert.deepEqual(t.rows.map((r) => r.count), [10, 20, 30], 'not 12/21/30 and not 2/1/0');
  assert.equal(t.total, 60);
  assert.deepEqual(t.recordsCheck.tiers.map((x) => [x.aggregate, x.records, x.differs]), [[10, 2, true], [20, 1, true], [30, 0, true]]);
  assert.equal(t.recordsCheck.differs, true);
  const rules = PY.lintPyramid(m).map((i) => i.rule);
  assert.ok(rules.includes('PY007') && rules.includes('PY018'));
});

test('G3: aggregate and records are never double counted, even when they agree', () => {
  const m = mk(); agg(m, [2, 1, 0]); recs(m, [[0, '2025-01-05'], [0, '2025-01-06'], [1, '2025-02-01']]);
  const t = PY.tally(m);
  assert.deepEqual(t.rows.map((r) => r.count), [2, 1, 0]); assert.equal(t.total, 3);
  assert.equal(t.recordsCheck.differs, false);
  assert.ok(!PY.lintPyramid(m).some((i) => i.rule === 'PY018'));
});

test('G3: records are the basis only when no aggregate count has been entered; null/unknown counts do not count as entered', () => {
  const m = mk(); recs(m, [[0, '2025-01-05'], [2, '2025-02-01']]);
  PY.setCount(m, m.categories[1].id, null);
  const t = PY.tally(m);
  assert.equal(t.basis, 'records'); assert.equal(t.basisNote, 'records-only'); assert.equal(t.recordsCheck, null);
  assert.deepEqual(t.rows.map((r) => r.count), [1, 0, 1]);
  PY.setCount(m, m.categories[1].id, 0);
  assert.equal(PY.tally(m).basis, 'aggregate', 'an entered 0 is a stated figure, not unknown');
});

test('G3: switching to records is the analyst\'s explicit act (clearing the aggregate), and the result then follows the window rule', () => {
  const m = mk(); agg(m, [10, 20, 30]); recs(m, [[0, '2025-01-05'], [0, '2030-01-01']]);
  assert.equal(PY.tally(m).basis, 'aggregate');
  m.counts.forEach((c) => { c.count = null; });
  const t = PY.tally(m);
  assert.equal(t.basis, 'records'); assert.deepEqual(t.rows.map((r) => r.count), [1, 0, 0]); assert.equal(t.outsideAfter, 1);
});

test('G3: the cross-check applies the same window rule as the records basis', () => {
  const m = mk(); agg(m, [5, 0, 0]); recs(m, [[0, '2025-01-05'], [0, '2031-01-01'], [0, '']]);
  const x = PY.tally(m).recordsCheck;
  assert.equal(x.tiers[0].records, 1); assert.equal(x.included, 1);
});

test('G3: picture, outline and CSV-facing note say which basis was used and that records were not counted', () => {
  const m = mk(); agg(m, [4, 3, 2]); recs(m, [[0, '2025-01-05']]);
  const g = PY.layoutPyramid(m, { lang: 'en' });
  const txt = g.items.find((i) => i.id === 'pyramid_footer').prims.map((p) => p.s).join(' | ');
  assert.match(txt, /basis: aggregate counts/); assert.match(txt, /NOT counted/);
  const out = PY.outlinePyramid(m);
  assert.match(out, /BASIS: aggregate/); assert.match(out, /records exist but are NOT counted/);
  const th = PY.layoutPyramid(m, { lang: 'th' }).items.find((i) => i.id === 'pyramid_footer').prims.map((p) => p.s).join(' ');
  assert.match(th, /ไม่ถูกนำมานับ/);
});

test('G3 limit: nothing in the output claims the records are complete (the data cannot prove it)', () => {
  const m = mk(); recs(m, [[0, '2025-01-05']]);
  assert.ok(!/complete/i.test(PY.outlinePyramid(m)));
  assert.equal(PY.tally(m).basis, 'records');
});

test('G3/G2: the footer wraps, so every part of the basis and window statement stays inside the card', () => {
  for (const lang of ['en', 'th']) {
    const m = mk(); agg(m, [4, 3, 2]); recs(m, [[0, '2025-01-05'], [0, '2030-01-01'], [0, '']]);
    const g = PY.layoutPyramid(m, { lang });
    const f = g.items.find((i) => i.id === 'pyramid_footer');
    f.prims.filter((p) => p.t === 'text').forEach((p) => assert.ok(p.x + textWidth(p.s, 10) <= g.width, lang + ': ' + p.s));
  }
});

test('form note: the data-entry hint states the current rule in Thai and English (aggregate = main totals, records = cross-check only)', () => {
  const src = readFileSync(new URL('../js/forms-fp.js', import.meta.url), 'utf8');
  const notes = [...src.matchAll(/countNote: '((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
  assert.equal(notes.length, 2, 'one Thai and one English note');
  const [th, en] = notes;
  assert.match(th, /จำนวนรวม.*ยอดหลัก/); assert.match(th, /record.*ตรวจเทียบ/); assert.match(th, /ไม่ถูกนำมานับแทนหรือบวกเพิ่ม/);
  assert.match(en, /aggregate counts.*main totals/i); assert.match(en, /cross-check/); assert.match(en, /not counted instead of, or added to/);
  assert.ok(!/counts come from the records instead|นับจาก record แทน/.test(src), 'the old, opposite wording is gone');
});
