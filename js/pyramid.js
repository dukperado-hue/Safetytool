// Safetytool — Accident Pyramid / event-count analysis (schema safetytool.pyramid/1). Pure: no DOM.
//
// What this is: a way to LOOK at a supplied event dataset ordered by severity tiers, under the dataset's own definitions.
// What this is not: a prediction. There is NO built-in ratio (no 1:x:y), no probability and no risk number. Heinrich's
// 1931 triangle and later "pyramid"/"iceberg" pictures are different things; see docs/ACCIDENT-PYRAMID.md.
//  * counts are counts; a rate exists only when the dataset states a valid denominator AND an observation window;
//  * unknown counts stay unknown (never zero); duplicates and exclusions are shown, not hidden;
//  * two datasets are only compared when their definitions allow it, otherwise a warning is shown prominently.

import { uid } from './model.js';
import { wrapText, textWidth } from './textmetrics.js';
import { normalizeGeom } from './swiss.js';
import { checkEvidence, isIsoDate } from './evidence.js';

export const SCHEMA = 'safetytool.pyramid/1';
export const VIEW_MODES = ['triangle'];

export function emptyPyramid() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    dataset: { id: uid('ds'), name: '', description: '', periodStart: '', periodEnd: '', observationNote: '', inclusion: '', exclusion: '', duplicateHandling: '', reportingLimitations: '' },
    exposure: { value: null, unit: '', definition: '', rateScale: 1000 },
    categories: [],
    counts: [],
    records: [],
    evidence: [],
    assumptions: [],
    view: { mode: 'triangle' },
  };
}

export function addCategory(m, label = '', definition = '') {
  const level = m.categories.length ? Math.max(...m.categories.map((c) => c.level)) + 1 : 1;
  const c = { id: uid('ct'), label, definition, level };
  m.categories.push(c);
  return c;
}
export function removeCategory(m, id) {
  m.categories = m.categories.filter((c) => c.id !== id);
  m.counts = m.counts.filter((x) => x.categoryId !== id);
  m.records.forEach((r) => { if (r.categoryId === id) r.categoryId = null; });
}
/** count = null means "unknown" (not zero). */
export function setCount(m, categoryId, count, note = '') {
  let x = m.counts.find((c) => c.categoryId === categoryId);
  if (!x) { x = { id: uid('cn'), categoryId, count: null, note: '', evidenceIds: [] }; m.counts.push(x); }
  x.count = count; if (note) x.note = note;
  return x;
}
export function addRecord(m, fields = {}) {
  const r = { id: uid('rc'), categoryId: null, date: '', reference: '', duplicateOf: null, excluded: false, note: '', evidenceIds: [], ...fields };
  m.records.push(r);
  return r;
}
export function removePyramidNode(m, id) {
  if (m.categories.some((c) => c.id === id)) { removeCategory(m, id); return; }
  if (m.counts.some((c) => c.id === id)) { m.counts = m.counts.filter((c) => c.id !== id); return; }
  if (m.records.some((r) => r.id === id)) { m.records = m.records.filter((r) => r.id !== id); m.records.forEach((r) => { if (r.duplicateOf === id) r.duplicateOf = null; }); }
}
export function findPyramid(m, id) {
  if (m.dataset.id === id) return { kind: 'pyDataset', ref: m.dataset };
  let r = m.categories.find((x) => x.id === id); if (r) return { kind: 'pyTier', ref: r };
  r = m.counts.find((x) => x.id === id); if (r) return { kind: 'pyCount', ref: r };
  r = m.records.find((x) => x.id === id); if (r) return { kind: 'pyRecord', ref: r };
  return null;
}

const dayNum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
/** Length of the observation window in days (inclusive), or null if the window is not fully and validly given. */
export function windowDays(m) {
  const a = m.dataset.periodStart; const b = m.dataset.periodEnd;
  if (!a || !b || !isIsoDate(a) || !isIsoDate(b)) return null;
  const d = dayNum(b) - dayNum(a) + 1;
  return d >= 1 ? d : null;
}

export function validatePyramid(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  if (!m.dataset || typeof m.dataset.id !== 'string') errs.push('dataset missing');
  for (const k of ['categories', 'counts', 'records']) if (!Array.isArray(m[k])) errs.push(k + ' must be an array');
  if (errs.length) return errs;
  const ids = new Set([m.dataset.id]);
  const dup = (id) => { if (ids.has(id)) errs.push('duplicate id: ' + id); ids.add(id); };
  ['periodStart', 'periodEnd'].forEach((k) => { const v = m.dataset[k]; if (v && !isIsoDate(v)) errs.push('dataset.' + k + ' must be YYYY-MM-DD'); });
  if (m.dataset.periodStart && m.dataset.periodEnd && isIsoDate(m.dataset.periodStart) && isIsoDate(m.dataset.periodEnd) && m.dataset.periodEnd < m.dataset.periodStart) errs.push('periodEnd is before periodStart');
  const ex = m.exposure || {};
  if (ex.value != null && !(Number.isFinite(ex.value) && ex.value > 0)) errs.push('exposure.value must be a number greater than 0, or null');
  if (ex.rateScale != null && !(Number.isFinite(ex.rateScale) && ex.rateScale > 0)) errs.push('exposure.rateScale must be greater than 0, or null');
  m.categories.forEach((c) => { if (!c || typeof c.id !== 'string') errs.push('category without id'); else dup(c.id); if (c && !(Number.isInteger(c.level) && c.level >= 1)) errs.push('category ' + c.id + ': level must be a whole number >= 1'); });
  const cat = (id) => m.categories.some((c) => c.id === id);
  m.counts.forEach((c) => {
    if (!c || typeof c.id !== 'string') { errs.push('count without id'); return; }
    dup(c.id);
    if (!cat(c.categoryId)) errs.push('count ' + c.id + ': unknown category');
    if (c.count != null && !(Number.isInteger(c.count) && c.count >= 0)) errs.push('count ' + c.id + ': must be a whole number >= 0, or null for unknown');
  });
  m.records.forEach((r) => {
    if (!r || typeof r.id !== 'string') { errs.push('record without id'); return; }
    dup(r.id);
    if (r.categoryId != null && !cat(r.categoryId)) errs.push('record ' + r.id + ': unknown category');
    if (r.date && !isIsoDate(r.date)) errs.push('record ' + r.id + ': date must be YYYY-MM-DD');
  });
  m.records.forEach((r) => {
    if (r.duplicateOf != null) {
      if (r.duplicateOf === r.id) errs.push('record ' + r.id + ': duplicate of itself');
      else if (!m.records.some((x) => x.id === r.duplicateOf)) errs.push('record ' + r.id + ': duplicateOf points to a missing record');
    }
  });
  if (m.view && !VIEW_MODES.includes(m.view.mode)) errs.push('view.mode must be one of ' + VIEW_MODES.join(', '));
  errs.push(...checkEvidence(m, [...m.counts, ...m.records]).errors);
  return errs;
}

export function normalizePyramid(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.dataset = Object.assign({ name: '', description: '', periodStart: '', periodEnd: '', observationNote: '', inclusion: '', exclusion: '', duplicateHandling: '', reportingLimitations: '' }, m.dataset);
  m.exposure = Object.assign({ value: null, unit: '', definition: '', rateScale: 1000 }, m.exposure || {});
  if (!Array.isArray(m.evidence)) m.evidence = [];
  if (!Array.isArray(m.assumptions)) m.assumptions = [];
  if (!m.view) m.view = { mode: 'triangle' };
  m.categories.forEach((c) => { c.label = c.label || ''; c.definition = c.definition || ''; });
  m.counts.forEach((c) => { if (c.count === undefined) c.count = null; c.note = c.note || ''; if (!Array.isArray(c.evidenceIds)) c.evidenceIds = []; });
  m.records.forEach((r) => { if (r.categoryId === undefined) r.categoryId = null; r.date = r.date || ''; r.reference = r.reference || ''; r.note = r.note || ''; if (r.duplicateOf === undefined) r.duplicateOf = null; r.excluded = !!r.excluded; if (!Array.isArray(r.evidenceIds)) r.evidenceIds = []; });
  return m;
}

// ---------------------------------------------------------------- analysis
/** The analysis window, only when both ends are valid dates and in order; otherwise null (no filtering is possible). */
export function analysisWindow(m) {
  const a = m.dataset.periodStart; const b = m.dataset.periodEnd;
  return a && b && isIsoDate(a) && isIsoDate(b) && a <= b ? { start: a, end: b } : null;
}

/**
 * Where one record falls. Mutually exclusive, first match wins: duplicate, excluded, nodate (missing/invalid date, only when a window
 * applies), before / after (outside the window; both ends inclusive; plain YYYY-MM-DD string comparison, so no time zone is involved),
 * uncategorised, counted. Without a valid window nothing can be placed outside it, so dated and undated records are not filtered.
 * Pure: never changes the record.
 */
export function recordStatus(m, rec, by = new Map(m.categories.map((c) => [c.id, c]))) {
  if (rec.duplicateOf) return 'duplicate';
  if (rec.excluded) return 'excluded';
  const w = analysisWindow(m);
  if (w) {
    if (!rec.date || !isIsoDate(rec.date)) return 'nodate';
    if (rec.date < w.start) return 'before';
    if (rec.date > w.end) return 'after';
  }
  return rec.categoryId && by.has(rec.categoryId) ? 'counted' : 'uncategorised';
}

/**
 * Counts per tier (top = lowest level number). A tier with no information is UNKNOWN (null), never 0.
 *
 * Basis (never switched silently, never summed):
 *  - any aggregate count entered -> 'aggregate' (the analyst's own figures). Records, if any, are NOT used for the counts; they are
 *    tallied under `recordsCheck` so the two can be compared, and `basisNote` says so. Aggregate + records are never added: whether
 *    they describe the same events cannot be known from the data.
 *  - no aggregate count but records -> 'records' (only records inside the analysis window are counted).
 *  - neither -> 'aggregate' with every tier unknown.
 * To make records the basis the analyst clears the aggregate counts (a deliberate act); adding a record never changes a figure.
 */
export function tally(m) {
  const by = new Map(m.categories.map((c) => [c.id, c]));
  const w = analysisWindow(m);
  const rows = [...m.categories].sort((a, b) => a.level - b.level).map((c) => ({ categoryId: c.id, label: c.label, level: c.level, count: null, unknown: true }));
  const rowOf = new Map(rows.map((r) => [r.categoryId, r]));
  // records, always classified (diagnostics are independent of the basis)
  const rec = { included: 0, duplicates: 0, excluded: 0, uncategorised: 0, incompleteDates: 0, outsideBefore: 0, outsideAfter: 0 };
  const perTier = new Map(rows.map((r) => [r.categoryId, 0]));
  m.records.forEach((r) => {
    const s = recordStatus(m, r, by);
    if (s === 'duplicate') rec.duplicates += 1; else if (s === 'excluded') rec.excluded += 1;
    else if (s === 'nodate') rec.incompleteDates += 1; else if (s === 'before') rec.outsideBefore += 1; else if (s === 'after') rec.outsideAfter += 1;
    else if (s === 'uncategorised') rec.uncategorised += 1;
    else { rec.included += 1; perTier.set(r.categoryId, perTier.get(r.categoryId) + 1); }
  });
  const hasAggregate = m.counts.some((c) => c.count != null && by.has(c.categoryId));
  const useRecords = !hasAggregate && m.records.length > 0;
  let recordsCheck = null;
  if (useRecords) rows.forEach((r) => { r.count = perTier.get(r.categoryId); r.unknown = false; });
  else {
    rows.forEach((r) => {
      const xs = m.counts.filter((c) => c.categoryId === r.categoryId && c.count != null);
      if (xs.length) { r.count = xs.reduce((s, c) => s + c.count, 0); r.unknown = false; }
    });
    if (m.records.length > 0) {
      const tiers = rows.map((r) => ({ categoryId: r.categoryId, label: r.label, aggregate: r.unknown ? null : r.count, records: perTier.get(r.categoryId), differs: !r.unknown && r.count !== perTier.get(r.categoryId) }));
      recordsCheck = { tiers, differs: tiers.some((t) => t.differs), included: rec.included };
    }
  }
  const known = rows.filter((r) => !r.unknown);
  const basis = useRecords ? 'records' : 'aggregate';
  return {
    basis, basisNote: useRecords ? 'records-only' : (recordsCheck ? 'aggregate-records-unused' : 'aggregate'), recordsCheck,
    rows, total: known.reduce((s, r) => s + r.count, 0), hasUnknown: rows.some((r) => r.unknown),
    window: w, windowApplied: !!w, records: m.records.length,
    duplicates: rec.duplicates, excluded: rec.excluded, uncategorised: rec.uncategorised, included: rec.included,
    incompleteDates: rec.incompleteDates, outsideBefore: rec.outsideBefore, outsideAfter: rec.outsideAfter, outsideWindow: rec.outsideBefore + rec.outsideAfter,
  };
}

/** A rate needs: a positive denominator, a unit, a written definition of the denominator, a scale, and a valid observation window. */
export function exposureCheck(m) {
  const ex = m.exposure || {};
  const missing = [];
  if (!(Number.isFinite(ex.value) && ex.value > 0)) missing.push('denominator value');
  if (!(ex.unit || '').trim()) missing.push('unit');
  if (!(ex.definition || '').trim()) missing.push('definition of the denominator');
  if (!(Number.isFinite(ex.rateScale) && ex.rateScale > 0)) missing.push('rate scale');
  if (windowDays(m) == null) missing.push('observation window (start and end dates)');
  return { valid: missing.length === 0, missing };
}
export function rateOf(m, count) {
  const ck = exposureCheck(m);
  if (count == null || !ck.valid) return { valid: false, reason: count == null ? 'count unknown' : 'no valid denominator: ' + ck.missing.join(', ') };
  const v = (count / m.exposure.value) * m.exposure.rateScale;
  return { valid: true, value: v, text: Number(v.toPrecision(3)) + ' per ' + m.exposure.rateScale + ' ' + m.exposure.unit };
}

const norm = (x) => (x || '').toLowerCase().replace(/\s+/g, ' ').trim();
/**
 * Compare two datasets. level: compatible | caution | incompatible. Differences (deltas) are only produced when level is
 * "compatible"; otherwise counts are shown side by side with warnings. Rates are only comparable when both have valid, identical
 * denominator unit and definition.
 */
export function comparePyramids(a, b) {
  const warnings = [];
  let level = 'compatible';
  const raise = (l) => { if (l === 'incompatible' || (l === 'caution' && level === 'compatible')) level = l; };
  const ca = [...a.categories].sort((x, y) => x.level - y.level); const cb = [...b.categories].sort((x, y) => x.level - y.level);
  const la = ca.map((c) => norm(c.label)); const lb = cb.map((c) => norm(c.label));
  if (JSON.stringify(la) !== JSON.stringify(lb)) { raise('incompatible'); warnings.push('The two datasets use different severity categories; only categories with the same label can be shown side by side, and no difference is computed.'); }
  else if (JSON.stringify(ca.map((c) => norm(c.definition))) !== JSON.stringify(cb.map((c) => norm(c.definition)))) { raise('caution'); warnings.push('Category labels match but their definitions differ: the tiers may not mean the same thing.'); }
  const da = windowDays(a); const db = windowDays(b);
  if (da == null || db == null) { raise('caution'); warnings.push('At least one dataset has no valid observation window: counts cannot be placed on the same time basis.'); }
  else if (da !== db) { raise('caution'); warnings.push('Observation windows differ (' + da + ' vs ' + db + ' days): counts are not directly comparable.'); }
  const ea = exposureCheck(a); const eb = exposureCheck(b);
  let ratesComparable = false;
  if (!ea.valid || !eb.valid) warnings.push('At least one dataset has no valid denominator: only counts can be shown, no rates.');
  else if (norm(a.exposure.unit) !== norm(b.exposure.unit) || norm(a.exposure.definition) !== norm(b.exposure.definition) || a.exposure.rateScale !== b.exposure.rateScale) { raise('caution'); warnings.push('Denominators differ in unit, definition or scale: rates are not comparable.'); }
  else ratesComparable = true;
  for (const k of ['inclusion', 'exclusion', 'duplicateHandling']) if (norm(a.dataset[k]) !== norm(b.dataset[k])) { raise('caution'); warnings.push('Datasets state different ' + (k === 'duplicateHandling' ? 'duplicate handling' : k + ' criteria') + '.'); }
  const ta = tally(a); const tb = tally(b);
  const rows = ta.rows.map((r) => {
    const o = tb.rows.find((x) => norm(x.label) === norm(r.label));
    const ra = rateOf(a, r.count); const rb = o ? rateOf(b, o.count) : { valid: false };
    return {
      label: r.label, a: { count: r.count, rate: ra.valid ? ra.text : null }, b: o ? { count: o.count, rate: rb.valid ? rb.text : null } : null,
      delta: level === 'compatible' && o && r.count != null && o.count != null ? o.count - r.count : null,
      rateDelta: level === 'compatible' && ratesComparable && ra.valid && rb.valid ? Number((rb.value - ra.value).toPrecision(3)) : null,
    };
  });
  if (ta.basis !== tb.basis) { raise('caution'); warnings.push('One dataset is built from records and the other from aggregate counts.'); }
  return { level, comparable: level === 'compatible', ratesComparable, warnings, rows };
}

// ---------------------------------------------------------------- event records import (CSV text)
const COLS = ['id', 'date', 'category', 'reference', 'note'];
function splitCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i += 1; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
export const MAX_IMPORT_ROWS = 20000;
/** Header row required. Known columns: id, date, category, reference, note (extra columns are ignored and reported). */
export function parseEventCsv(text) {
  const errors = []; const ignored = [];
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return { rows: [], errors: ['empty input'], ignored };
  const head = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  if (!head.includes('category')) errors.push('header must contain a "category" column (known columns: ' + COLS.join(', ') + ')');
  head.filter((h) => !COLS.includes(h)).forEach((h) => ignored.push(h));
  if (lines.length - 1 > MAX_IMPORT_ROWS) errors.push('too many rows (' + (lines.length - 1) + ' > ' + MAX_IMPORT_ROWS + ')');
  if (errors.length) return { rows: [], errors, ignored };
  const rows = lines.slice(1).map((l, i) => { const f = splitCsvLine(l); const o = { line: i + 2 }; COLS.forEach((c) => { const k = head.indexOf(c); o[c] = k >= 0 ? (f[k] || '').trim() : ''; }); return o; });
  return { rows, errors, ignored };
}

/** Preview only: nothing is added. createCategories: whether unseen category labels would become new tiers. */
export function previewEventImport(m, rows, { createCategories = false } = {}) {
  const byLabel = new Map(m.categories.map((c) => [norm(c.label), c]));
  const byId = new Map(m.categories.map((c) => [c.id, c]));
  const existingIds = new Set(m.records.map((r) => r.id));
  const seenIds = new Set(); const seenKeys = new Set(m.records.map((r) => [r.date, r.categoryId, norm(r.reference)].join('|')));
  const unmapped = new Set();
  const p = { total: rows.length, accepted: 0, skippedExistingId: 0, unmappedLabels: [], uncategorised: 0, invalidDates: 0, missingDates: 0, outsideWindow: 0, possibleDuplicates: 0, wouldCreateCategories: createCategories };
  const a = m.dataset.periodStart; const b = m.dataset.periodEnd;
  rows.forEach((r) => {
    if (r.id && (existingIds.has(r.id) || seenIds.has(r.id))) { p.skippedExistingId += 1; return; }
    if (r.id) seenIds.add(r.id);
    p.accepted += 1;
    const label = norm(r.category);
    const cat = byLabel.get(label) || byId.get(r.category);
    if (!label) p.uncategorised += 1; else if (!cat) unmapped.add(r.category.trim());
    if (!r.date) p.missingDates += 1; else if (!isIsoDate(r.date)) p.invalidDates += 1; else if (a && b && isIsoDate(a) && isIsoDate(b) && (r.date < a || r.date > b)) p.outsideWindow += 1;
    if (r.reference) { const k = [r.date, cat ? cat.id : label, norm(r.reference)].join('|'); const k2 = [r.date, cat ? cat.id : null, norm(r.reference)].join('|'); if (seenKeys.has(k) || seenKeys.has(k2)) p.possibleDuplicates += 1; seenKeys.add(k); }
  });
  p.unmappedLabels = [...unmapped];
  if (!createCategories) p.uncategorised += rows.filter((r) => norm(r.category) && !byLabel.get(norm(r.category)) && !byId.get(r.category)).length;
  return p;
}

/** Adds the records. Rows with an invalid date keep date '' (and say so in the note); nothing is invented. */
export function applyEventImport(m, rows, { createCategories = false, source = {}, now = new Date().toISOString() } = {}) {
  const importId = uid('im');
  const byLabel = new Map(m.categories.map((c) => [norm(c.label), c]));
  const byId = new Map(m.categories.map((c) => [c.id, c]));
  const existingIds = new Set(m.records.map((r) => r.id));
  let added = 0; let created = 0;
  rows.forEach((r) => {
    if (r.id && existingIds.has(r.id)) return;
    let cat = byLabel.get(norm(r.category)) || byId.get(r.category) || null;
    if (!cat && createCategories && norm(r.category)) { cat = addCategory(m, r.category.trim()); byLabel.set(norm(r.category), cat); created += 1; }
    const okDate = r.date && isIsoDate(r.date);
    const rec = addRecord(m, { categoryId: cat ? cat.id : null, date: okDate ? r.date : '', reference: r.reference, note: (r.note || '') + (r.date && !okDate ? ' [import: invalid date "' + r.date + '" dropped]' : '') });
    if (r.id) { rec.id = r.id; existingIds.add(r.id); }
    rec.importId = importId;
    added += 1;
  });
  m.meta.transformations = [...(m.meta.transformations || []), { id: importId, transformId: 'event-records-to-pyramid', version: '1', at: now, from: { file: source.name || '', hash: source.hash || '', rows: rows.length }, summary: 'Imported ' + added + ' record(s)' + (created ? ', created ' + created + ' category(ies)' : '') + '.' }];
  return { added, created, importId };
}

// ---------------------------------------------------------------- lint
export const PYRAMID_RULES = {
  PY001: { sev: 'warn', th: 'ยังไม่ได้อธิบายว่า dataset นี้นับเหตุการณ์อะไร', en: 'The dataset does not say what events it counts' },
  PY002: { sev: 'warn', th: 'ยังไม่ได้ระบุช่วงเวลาสังเกต (วันเริ่ม–วันสิ้นสุด) ที่ถูกต้อง', en: 'No valid observation window (start and end dates)' },
  PY003: { sev: 'warn', th: 'ยังไม่มีระดับ (category)', en: 'No tiers (categories) yet' },
  PY004: { sev: 'info', th: 'ระดับนี้ยังไม่มีคำนิยาม', en: 'Tier has no definition' },
  PY005: { sev: 'warn', th: 'ชื่อระดับซ้ำกัน', en: 'Duplicate tier label' },
  PY006: { sev: 'warn', th: 'มีหลายระดับใช้ลำดับ (level) เดียวกัน', en: 'Two tiers share the same level; their order is ambiguous' },
  PY007: { sev: 'warn', th: 'มีทั้งจำนวนรวม (aggregate) และ record — ระบบใช้จำนวนรวมที่กรอกไว้ และไม่นำ record มานับ (ไม่บวกรวมกัน เพราะอาจนับเหตุการณ์ซ้ำ) ดูตารางตรวจเทียบ', en: 'Both aggregate counts and records exist: the aggregate counts you entered are used and records are NOT counted (never added together, since they may be the same events). See the cross-check' },
  PY008: { sev: 'info', th: 'ระดับนี้ไม่มีข้อมูลจำนวน (ไม่ทราบ) — ไม่ใช่ศูนย์', en: 'Tier has no count (unknown) — this is not zero' },
  PY009: { sev: 'info', th: 'ไม่มีตัวหาร (exposure) ที่ใช้ได้ — แสดงเฉพาะจำนวน ไม่แสดงอัตรา', en: 'No usable denominator: counts only, no rates' },
  PY010: { sev: 'warn', th: 'ตัวหารระบุไม่ครบ (ค่า หน่วย นิยาม สเกล หรือช่วงเวลา) — ระบบจึงไม่คำนวณอัตรา', en: 'Denominator is incomplete (value, unit, definition, scale or window): rates are not calculated' },
  PY011: { sev: 'warn', th: 'ยังไม่ได้ระบุเกณฑ์การรวมเหตุการณ์ (inclusion)', en: 'Inclusion criteria are not written' },
  PY012: { sev: 'warn', th: 'ยังไม่ได้ระบุวิธีจัดการข้อมูลซ้ำ', en: 'Duplicate handling is not described' },
  PY013: { sev: 'info', th: 'ยังไม่ได้เขียนข้อจำกัดของการรายงาน', en: 'Reporting limitations are not written' },
  PY014: { sev: 'info', th: 'record นี้ไม่มีวันที่หรือวันที่ไม่ถูกต้อง', en: 'Record has no valid date' },
  PY015: { sev: 'warn', th: 'record นี้อยู่นอกช่วงเวลาสังเกต', en: 'Record falls outside the observation window' },
  PY016: { sev: 'info', th: 'record นี้ยังไม่ได้จัดระดับ', en: 'Record has no tier' },
  PY018: { sev: 'warn', th: 'จำนวนรวมที่กรอกไว้ไม่ตรงกับจำนวน record ในช่วงเวลา — ระบบไม่ตัดสินว่าอันไหนถูก', en: 'The aggregate counts differ from the records inside the window: the tool does not decide which is right' },
  PY017: { sev: 'info', th: 'อาจซ้ำกับ record อื่น (วันที่ ระดับ และเลขอ้างอิงเหมือนกัน) — ระบบไม่ลบให้เอง', en: 'Possible duplicate (same date, tier and reference); nothing was removed automatically' },
};

export function lintPyramid(m) {
  const out = [];
  const add = (rule, targetId) => out.push({ rule, severity: PYRAMID_RULES[rule].sev, targetId, th: PYRAMID_RULES[rule].th, en: PYRAMID_RULES[rule].en });
  const d = m.dataset;
  if (!(d.description || '').trim() && !(d.name || '').trim()) add('PY001', d.id);
  if (windowDays(m) == null) add('PY002', d.id);
  if (!m.categories.length) add('PY003', d.id);
  const seen = new Set(); const levels = new Set();
  m.categories.forEach((c) => {
    if (!c.definition.trim()) add('PY004', c.id);
    const k = norm(c.label); if (k) { if (seen.has(k)) add('PY005', c.id); seen.add(k); }
    if (levels.has(c.level)) add('PY006', c.id); levels.add(c.level);
  });
  const t = tally(m);
  if (t.recordsCheck) { add('PY007', d.id); if (t.recordsCheck.differs) add('PY018', d.id); }
  if (t.basis === 'aggregate') t.rows.filter((r) => r.unknown).forEach((r) => add('PY008', r.categoryId));
  const ex = m.exposure; const any = ex.value != null || (ex.unit || '').trim() || (ex.definition || '').trim();
  if (!any) add('PY009', d.id); else if (!exposureCheck(m).valid) add('PY010', d.id);
  if (!(d.inclusion || '').trim()) add('PY011', d.id);
  if (!(d.duplicateHandling || '').trim()) add('PY012', d.id);
  if (!(d.reportingLimitations || '').trim()) add('PY013', d.id);
  const keys = new Map();
  m.records.forEach((r) => {
    if (!r.date || !isIsoDate(r.date)) add('PY014', r.id);
    else if (analysisWindow(m) && (r.date < d.periodStart || r.date > d.periodEnd)) add('PY015', r.id);
    if (!r.categoryId) add('PY016', r.id);
    if (r.reference.trim() && !r.duplicateOf) { const k = [r.date, r.categoryId, norm(r.reference)].join('|'); if (keys.has(k)) add('PY017', r.id); keys.set(k, r.id); }
  });
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------- layout
export const PG = { triW: 380, tierH: 66, gap: 3, colX: 410, colW: 380, bannerPad: 12 };
const TXT = {
  th: {
    notice: 'ภาพนี้แสดง dataset ที่ป้อนเข้ามา ภายใต้นิยามและข้อจำกัดที่ระบุไว้เท่านั้น ขนาดของแต่ละชั้นไม่เป็นสัดส่วนกับจำนวน ไม่ใช่การพยากรณ์ จำนวนไม่ใช่อัตรา และอัตราไม่ใช่ความเสี่ยง',
    countsOnly: 'แสดงเฉพาะจำนวน — ไม่มีตัวหารที่ใช้ได้', rates: 'อัตราต่อ', unknown: 'ไม่ทราบ', empty: 'ยังไม่มีระดับ — เพิ่มระดับ หรือโหลดชุดข้อมูลสาธิต (สมมติ)',
    basis: { records: 'ฐาน: record', aggregate: 'ฐาน: จำนวนรวม' }, period: 'ช่วงเวลา', dup: 'ซ้ำ (ไม่นับ)', exc: 'ตัดออก', unc: 'ยังไม่จัดระดับ', noWin: 'ยังไม่มีช่วงเวลาที่ถูกต้อง', denom: 'ตัวหาร',
    inc: 'นับในช่วง', out: 'นอกช่วง (ไม่นับ)', nod: 'ไม่มีวันที่ที่ใช้ได้ (ไม่นับ)', unused: 'มี record แต่ไม่ถูกนำมานับ — ใช้จำนวนรวม',
  },
  en: {
    notice: 'This picture shows the supplied dataset under its stated definitions and limits. Tier size is not proportional to counts. It is not a prediction; counts are not rates, and rates are not risk.',
    countsOnly: 'COUNTS ONLY — no valid denominator', rates: 'rates per', unknown: 'unknown', empty: 'No tiers yet — add tiers or load the synthetic demonstration dataset',
    basis: { records: 'basis: records', aggregate: 'basis: aggregate counts' }, period: 'period', dup: 'duplicates (not counted)', exc: 'excluded', unc: 'uncategorised', noWin: 'no valid window', denom: 'denominator',
    inc: 'counted (in window)', out: 'outside window (not counted)', nod: 'no usable date (not counted)', unused: 'records exist but are NOT counted — aggregate counts used',
  },
};

export function layoutPyramid(m, opts = {}) {
  const lang = opts.lang === 'en' ? 'en' : 'th';
  const T = TXT[lang]; const D = PG;
  const t = tally(m);
  const ck = exposureCheck(m);
  const items = [];
  const width = D.colX + D.colW + 8;
  // banner
  const lines = wrapText(T.notice, width - 2 * D.bannerPad - 4, 11);
  const second = ck.valid ? `${T.rates} ${m.exposure.rateScale} ${m.exposure.unit} · ${T.denom}: ${m.exposure.definition}` : T.countsOnly;
  const l2 = wrapText(second, width - 2 * D.bannerPad - 4, 11);
  const bh = 14 + (lines.length + l2.length) * 14 + 8;
  const bp = [];
  lines.forEach((s, i) => bp.push({ t: 'text', x: D.bannerPad, y: 18 + i * 14, s, cls: 'tag' }));
  l2.forEach((s, i) => bp.push({ t: 'text', x: D.bannerPad, y: 18 + (lines.length + i) * 14 + 2, s, cls: ck.valid ? 'nm' : 'warnTx' }));
  items.push({ id: 'pyramid_banner', kind: 'banner', status: ck.valid ? 'match' : 'unknown', inert: true, shape: 'card', x: 0, y: 0, w: width, h: bh, lines: [], prims: bp });
  const top = bh + 18;
  const n = t.rows.length;
  if (!n) {
    items.push({ id: 'pyramid_empty', kind: 'legend', inert: true, shape: 'card', x: 0, y: top, w: width, h: 80, lines: [], prims: [{ t: 'text', x: width / 2, y: 46, s: T.empty, cls: 'nm', anchor: 'middle' }] });
    return normalizeGeom({ items, links: [], width, height: top + 80 });
  }
  const H = n * D.tierH;
  const cx = D.triW / 2;
  const hw = (y) => (D.triW / 2) * (y / H);
  t.rows.forEach((r, i) => {
    const a0 = i * D.tierH + D.gap / 2; const a1 = (i + 1) * D.tierH - D.gap / 2; // absolute, for the triangle geometry
    const y0 = D.gap / 2; const y1 = D.tierH - D.gap / 2; // inside this tier's item
    const pts = [[cx - hw(a0), y0], [cx + hw(a0), y0], [cx + hw(a1), y1], [cx - hw(a1), y1]];
    const rate = rateOf(m, r.count);
    const prims = [{ t: 'poly', pts, cls: 'pyt pyt-' + (i % 5) }];
    const midW = hw((a0 + a1) / 2) * 2;
    if (midW > 70) prims.push({ t: 'text', x: cx, y: (y0 + y1) / 2 + 5, s: r.unknown ? '?' : String(r.count), cls: 'pyn', anchor: 'middle' });
    const cat = m.categories.find((c) => c.id === r.categoryId);
    wrapText(r.label || '—', D.colW - 120, 12).slice(0, 2).forEach((s, k) => prims.push({ t: 'text', x: D.colX, y: y0 + 20 + k * 15, s, cls: 'nm' }));
    prims.push({ t: 'text', x: D.colX + D.colW - 6, y: y0 + 22, s: r.unknown ? T.unknown : String(r.count), cls: 'pyn', anchor: 'end' });
    prims.push({ t: 'text', x: D.colX + D.colW - 6, y: y0 + 38, s: rate.valid ? rate.text : '', cls: 'tag', anchor: 'end' });
    if (cat && cat.definition) wrapText(cat.definition, D.colW - 20, 10.5).slice(0, 1).forEach((s) => prims.push({ t: 'text', x: D.colX, y: y0 + 56, s, cls: 'tag' }));
    prims.push({ t: 'line', x1: cx + hw((a0 + a1) / 2) + 8, y1: (y0 + y1) / 2, x2: D.colX - 10, y2: (y0 + y1) / 2, cls: 'pyl' });
    items.push({ id: r.categoryId, kind: 'pyTier', shape: 'card', x: 0, y: top + i * D.tierH, w: width, h: D.tierH, lines: [], prims });
  });
  const fp = [];
  const parts = [T.basis[t.basis], `${T.period}: ${m.dataset.periodStart && m.dataset.periodEnd ? m.dataset.periodStart + ' → ' + m.dataset.periodEnd : T.noWin}`];
  if (t.records) parts.push(`${t.records} records`, `${T.inc}: ${t.included}`, `${T.dup}: ${t.duplicates}`, `${T.exc}: ${t.excluded}`, `${T.unc}: ${t.uncategorised}`, `${T.out}: ${t.outsideWindow}`, `${T.nod}: ${t.incompleteDates}`);
  if (t.basisNote === 'aggregate-records-unused') parts.push(T.unused);
  let px = 12; let row = 0;
  parts.forEach((s) => {
    const w = textWidth(s, 10);
    if (px > 12 && px + w > width - 12) { row += 1; px = 12; }
    fp.push({ t: 'text', x: px, y: 23 + row * 16, s, cls: 'tag' }); px += w + 22;
  });
  const fh = 36 + row * 16;
  items.push({ id: 'pyramid_footer', kind: 'legend', inert: true, shape: 'card', x: 0, y: top + H + 14, w: width, h: fh, lines: [], prims: fp });
  return normalizeGeom({ items, links: [], width, height: top + H + 14 + fh });
}

export function outlinePyramid(m) {
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE / SYNTHETIC]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  const d = m.dataset; const t = tally(m); const ck = exposureCheck(m);
  out.push(`DATASET: ${d.name || ''} ${d.description || ''}`.trim(), `PERIOD: ${d.periodStart || '?'} to ${d.periodEnd || '?'}`);
  out.push(`INCLUSION: ${d.inclusion || '(not written)'}`, `EXCLUSION: ${d.exclusion || '(not written)'}`, `DUPLICATES: ${d.duplicateHandling || '(not written)'}`, `LIMITATIONS: ${d.reportingLimitations || '(not written)'}`);
  out.push(ck.valid ? `DENOMINATOR: ${m.exposure.value} ${m.exposure.unit} — ${m.exposure.definition} (rates per ${m.exposure.rateScale})` : `DENOMINATOR: none usable (${ck.missing.join('; ')}) — counts only`, `BASIS: ${t.basis}`, '');
  t.rows.forEach((r) => { const rt = rateOf(m, r.count); out.push(`TIER ${r.level}  ${r.label}: ${r.unknown ? 'unknown' : r.count}${rt.valid ? '  (' + rt.text + ')' : ''}`); });
  if (t.records) out.push(`records ${t.records}; counted in window ${t.included}; duplicates not counted ${t.duplicates}; excluded ${t.excluded}; uncategorised ${t.uncategorised}; no valid date (not counted${t.windowApplied ? '' : ' only when a window is given'}) ${t.incompleteDates}; outside window before ${t.outsideBefore} / after ${t.outsideAfter}`);
  if (t.basisNote === 'aggregate-records-unused') out.push('NOTE: records exist but are NOT counted; the aggregate counts above are used and are never added to records.');
  if (t.records && !t.windowApplied) out.push('NOTE: no valid analysis window — records are not filtered by date.');
  return out.join('\n');
}
