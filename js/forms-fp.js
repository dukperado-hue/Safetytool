// Safetytool — data-entry forms for FRAM and the Accident Pyramid, plus a shared evidence / assumptions editor.
// api: { t(key), mutate(fn, {rebuild}), lang }. Same conventions as forms.js (text commits on "change", structure rebuilds).

import { mk, field, textInput, select, button, section, choices, short } from './forms.js';
import * as FR from './fram.js';
import * as PY from './pyramid.js';
import { EVIDENCE_KINDS, CONFIDENCE, addEvidence, addAssumption } from './evidence.js';

const S = {
  th: {
    activity: 'กิจกรรม/สถานการณ์ที่สร้างโมเดล', limitations: 'ข้อจำกัดของโมเดล', functions: 'ฟังก์ชัน', addFunction: '+ เพิ่มฟังก์ชัน', fname: 'ชื่อฟังก์ชัน (ขึ้นต้นด้วยคำกริยา)', description: 'คำอธิบาย', context: 'บริบท',
    status: 'สถานะ', st: { unknown: 'ยังไม่ได้ประเมิน (unknown)', described: 'อธิบายแล้ว (described)', none: 'ไม่มี (none)' }, addItem: '+ รายการ', item: 'รายการ', reviewed: 'ตรวจทานแล้ว (รายการนี้ระบบแนะนำมา)',
    variability: 'ความแปรปรวน (คำอธิบาย ไม่มีคะแนน)', addVar: '+ เพิ่มความแปรปรวน', vstate: 'สถานะ', vs: { observed: 'สังเกตเห็น (observed)', anticipated: 'คาดการณ์ (anticipated)', unknown: 'ไม่ทราบ (unknown)' }, vaspect: 'เกี่ยวกับ aspect', evidence: 'หลักฐาน',
    couplings: 'Coupling (Output → aspect ของอีกฟังก์ชัน)', addCoupling: '+ เพิ่ม coupling', from: 'จากฟังก์ชัน (Output)', to: 'ไปยังฟังก์ชัน', toAspect: 'ที่ aspect', ctext: 'ข้อความ (สิ่งที่ส่งต่อ)', noFn: 'เพิ่มฟังก์ชันก่อน',
    sources: 'หลักฐานและสมมติฐาน', addEvidence: '+ เพิ่มหลักฐาน', addAssumption: '+ เพิ่มสมมติฐาน', ekind: 'ชนิด', esource: 'แหล่งที่มา', eref: 'เลขอ้างอิง', edate: 'วันที่ (YYYY-MM-DD)', elimit: 'ข้อจำกัด', econf: 'ความมั่นใจ', astate: 'ข้อความสมมติฐาน', aowner: 'ผู้เสนอ', averify: 'วิธีตรวจสอบ', areviewed: 'ตรวจทานแล้ว',
    ds: 'ชุดข้อมูล', dname: 'ชื่อชุดข้อมูล', ddesc: 'ชุดข้อมูลนี้นับเหตุการณ์อะไร', pstart: 'ช่วงสังเกต: เริ่ม (YYYY-MM-DD)', pend: 'ช่วงสังเกต: สิ้นสุด (YYYY-MM-DD)', onote: 'หมายเหตุการสังเกต', incl: 'เกณฑ์การรวมเหตุการณ์', excl: 'เกณฑ์การตัดออก', dup: 'วิธีจัดการข้อมูลซ้ำ', rlim: 'ข้อจำกัดของการรายงาน',
    exposure: 'ตัวหาร (exposure) — ใส่เมื่อมีนิยามที่ชัดเจนเท่านั้น', evalue: 'ค่าตัวหาร (ตัวเลข)', eunit: 'หน่วย (เช่น ชั่วโมงบิน)', edef: 'นิยามของตัวหาร', escale: 'แสดงอัตราต่อ (เช่น 1000)',
    cats: 'ระดับ (บนสุด = รุนแรงที่สุด)', addCat: '+ เพิ่มระดับ', clabel: 'ชื่อระดับ', cdef: 'นิยามของระดับ', clevel: 'ลำดับ (1 = บนสุด)',
    counts: 'จำนวนรวม (aggregate) — เว้นว่าง = ไม่ทราบ ไม่ใช่ศูนย์', countNote: 'จำนวนรวมที่กรอกไว้คือยอดหลัก ส่วน record ใช้ตรวจเทียบเท่านั้น ไม่ถูกนำมานับแทนหรือบวกเพิ่ม (ล้างจำนวนรวมของทุกระดับหากต้องการใช้ record เป็นฐาน)', records: 'Record เหตุการณ์', addRecord: '+ เพิ่ม record', rdate: 'วันที่', rcat: 'ระดับ', rref: 'เลขอ้างอิง', rdup: 'ซ้ำกับ record', rexc: 'ตัดออกจากการนับ', rnote: 'หมายเหตุ', none: '— ไม่ระบุ —',
    imp: 'นำเข้าเหตุการณ์ (CSV)', impHint: 'วางข้อความ CSV มีหัวคอลัมน์ id,date,category,reference,note (ต้องมี category) — ดูตัวอย่างก่อนเพิ่มเสมอ', impPreview: 'ดูตัวอย่าง', impCreate: 'สร้างระดับใหม่สำหรับชื่อที่ไม่พบ (ไม่เลือก = ไม่จัดระดับ)', impApply: 'เพิ่ม record', impFile: 'ชื่อไฟล์/แหล่งที่มา (ถ้ามี)',
    delete: 'ลบ', confirmDelete: 'ลบรายการนี้และสิ่งที่ผูกอยู่?', showing: 'แสดง {n} จาก {total} record',
  },
  en: {
    activity: 'Activity or situation modelled', limitations: 'Model limitations', functions: 'Functions', addFunction: '+ Add function', fname: 'Function name (start with a verb)', description: 'Description', context: 'Context',
    status: 'Status', st: { unknown: 'Not assessed (unknown)', described: 'Described', none: 'None (stated by analyst)' }, addItem: '+ Item', item: 'Item', reviewed: 'Reviewed (this item was suggested by the tool)',
    variability: 'Variability (descriptions only — no scores)', addVar: '+ Add variability', vstate: 'State', vs: { observed: 'Observed', anticipated: 'Anticipated', unknown: 'Unknown' }, vaspect: 'Concerns aspect', evidence: 'Evidence',
    couplings: 'Couplings (Output → an aspect of another function)', addCoupling: '+ Add coupling', from: 'From function (Output)', to: 'To function', toAspect: 'At aspect', ctext: 'Text (what is passed on)', noFn: 'Add functions first',
    sources: 'Evidence and assumptions', addEvidence: '+ Add evidence', addAssumption: '+ Add assumption', ekind: 'Kind', esource: 'Source', eref: 'Reference', edate: 'Date (YYYY-MM-DD)', elimit: 'Limitation', econf: 'Confidence', astate: 'Assumption', aowner: 'Proposed by', averify: 'How to verify', areviewed: 'Reviewed',
    ds: 'Dataset', dname: 'Dataset name', ddesc: 'What events does this dataset count?', pstart: 'Observation window: start (YYYY-MM-DD)', pend: 'Observation window: end (YYYY-MM-DD)', onote: 'Observation note', incl: 'Inclusion criteria', excl: 'Exclusion criteria', dup: 'Duplicate handling', rlim: 'Reporting limitations',
    exposure: 'Denominator (exposure) — fill in only with a clear definition', evalue: 'Denominator value (number)', eunit: 'Unit (e.g. flight hours)', edef: 'Definition of the denominator', escale: 'Show rates per (e.g. 1000)',
    cats: 'Tiers (top = most severe)', addCat: '+ Add tier', clabel: 'Tier label', cdef: 'Tier definition', clevel: 'Order (1 = top)',
    counts: 'Aggregate counts — leave empty for unknown (not zero)', countNote: 'The aggregate counts you enter are the main totals. Records are a cross-check only: they are not counted instead of, or added to, the aggregate (clear the aggregate count of every tier to use records as the basis)', records: 'Event records', addRecord: '+ Add record', rdate: 'Date', rcat: 'Tier', rref: 'Reference', rdup: 'Duplicate of record', rexc: 'Excluded from counts', rnote: 'Note', none: '— none —',
    imp: 'Import events (CSV)', impHint: 'Paste CSV text with a header row id,date,category,reference,note (category is required). Always preview before adding.', impPreview: 'Preview', impCreate: 'Create tiers for unseen labels (unchecked = leave uncategorised)', impApply: 'Add records', impFile: 'File name / source (optional)',
    delete: 'Delete', confirmDelete: 'Delete this item and what is attached to it?', showing: 'Showing {n} of {total} records',
  },
};
const L = (lang) => S[lang] || S.th;

/** Remove an evidence/assumption id from every evidenceIds / assumptionIds array in a model. */
export function stripRef(x, id) {
  if (Array.isArray(x)) { x.forEach((v) => stripRef(v, id)); return; }
  if (x && typeof x === 'object') {
    for (const k of Object.keys(x)) {
      if ((k === 'evidenceIds' || k === 'assumptionIds') && Array.isArray(x[k])) x[k] = x[k].filter((v) => v !== id);
      else stripRef(x[k], id);
    }
  }
}

/** Evidence and assumptions editor for any model that stores m.evidence / m.assumptions. */
export function buildSourcesEditor(host, m, api) {
  const { mutate, lang } = api; const T = L(lang);
  const confirmDelete = api.confirmDelete || ((apply, o = {}) => (o.ask === false ? true : confirm(T.confirmDelete)));
  const sec = section(T.sources, 'sec_sources');
  (m.evidence || []).forEach((e) => {
    const card = mk('div', { class: 'fcard', 'data-id': e.id });
    const head = mk('div', { class: 'fhead' }); head.appendChild(mk('strong', {}, e.id));
    head.appendChild(button(T.delete, () => { const del = (x) => { x.evidence = x.evidence.filter((v) => v.id !== e.id); stripRef(x, e.id); }; if (confirmDelete(del)) mutate(del, { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(T.ekind, select(e.kind, EVIDENCE_KINDS.map((k) => [k, k]), (v) => mutate(() => { e.kind = v; }))));
    card.appendChild(field(T.esource, textInput(e.source, (v) => mutate(() => { e.source = v; }), true), e.id));
    card.appendChild(field(T.eref, textInput(e.reference, (v) => mutate(() => { e.reference = v; }))));
    card.appendChild(field(T.edate, textInput(e.date, (v) => mutate(() => { e.date = v.trim(); }))));
    card.appendChild(field(T.elimit, textInput(e.limitation, (v) => mutate(() => { e.limitation = v; }), true)));
    card.appendChild(field(T.econf, select(e.confidence, [['', T.none], ...CONFIDENCE.map((k) => [k, k])], (v) => mutate(() => { e.confidence = v || null; }))));
    sec.appendChild(card);
  });
  sec.appendChild(button(T.addEvidence, () => mutate((x) => addEvidence(x, 'ASSESSED'), { rebuild: true })));
  (m.assumptions || []).forEach((a) => {
    const card = mk('div', { class: 'fcard', 'data-id': a.id });
    const head = mk('div', { class: 'fhead' }); head.appendChild(mk('strong', {}, a.id));
    head.appendChild(button(T.delete, () => { const del = (x) => { x.assumptions = x.assumptions.filter((v) => v.id !== a.id); stripRef(x, a.id); }; if (confirmDelete(del)) mutate(del, { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(T.astate, textInput(a.statement, (v) => mutate(() => { a.statement = v; }), true), a.id));
    card.appendChild(field(T.aowner, textInput(a.owner, (v) => mutate(() => { a.owner = v; }))));
    card.appendChild(field(T.averify, textInput(a.howToVerify, (v) => mutate(() => { a.howToVerify = v; }), true)));
    const l = mk('label', { class: 'fld chk' }); const c = mk('input', { type: 'checkbox' }); c.checked = a.reviewed === true;
    c.addEventListener('change', () => mutate(() => { a.reviewed = c.checked; })); l.appendChild(c); l.appendChild(mk('span', {}, T.areviewed)); card.appendChild(l);
    sec.appendChild(card);
  });
  sec.appendChild(button(T.addAssumption, () => mutate((x) => addAssumption(x), { rebuild: true })));
  host.appendChild(sec);
}

// tolerant of a holder that has no evidenceIds yet (a legacy Swiss file): the array is created only when the user ticks something
const evChoices = (T, m, holder, mutate) => (m.evidence || []).length
  ? choices(T.evidence, m.evidence.map((e) => [e.id, short(e.source || e.reference || e.id)]), (id) => (holder.evidenceIds || []).includes(id), (id, on) => mutate(() => { const cur = holder.evidenceIds || []; holder.evidenceIds = on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id); }))
  : null;
/** The "which evidence supports this?" checkbox group for one holder (a Swiss layer or hole); null when the model has no evidence yet. */
export const evidenceChoices = (m, holder, api) => evChoices(L(api.lang), m, holder, api.mutate);

// ------------------------------------------------------------------ FRAM
export function buildFramForm(host, m, api) {
  const { mutate, lang } = api; const T = L(lang);
  const confirmDelete = api.confirmDelete || ((apply, o = {}) => (o.ask === false ? true : confirm(T.confirmDelete)));
  host.textContent = '';
  const codes = FR.framCodes(m);
  const top = section(api.t('kind.framActivity'));
  top.appendChild(field(T.activity, textInput(m.activity.text, (v) => mutate(() => { m.activity.text = v; }), true), m.activity.id));
  top.appendChild(field(T.limitations, textInput(m.limitations, (v) => mutate(() => { m.limitations = v; }), true)));
  host.appendChild(top);

  const fs = section(T.functions, 'sec_functions');
  if (!m.functions.length) fs.appendChild(mk('p', { class: 'muted' }, T.noFn));
  m.functions.forEach((f) => {
    const card = mk('div', { class: 'fcard', 'data-id': f.id });
    const head = mk('div', { class: 'fhead' }); head.appendChild(mk('strong', {}, codes[f.id]));
    head.appendChild(button(T.delete, () => { if (confirmDelete((x) => FR.removeFramNode(x, f.id))) mutate((x) => FR.removeFramNode(x, f.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(T.fname, textInput(f.name, (v) => mutate(() => { f.name = v; })), f.id));
    card.appendChild(field(T.description, textInput(f.description, (v) => mutate(() => { f.description = v; }), true)));
    card.appendChild(field(T.context, textInput(f.context, (v) => mutate(() => { f.context = v; }), true)));
    FR.ASPECTS.forEach((a) => {
      const box = mk('fieldset', { class: 'fchoices' });
      box.appendChild(mk('legend', {}, `${FR.ASPECT_INFO[a].letter} — ${FR.ASPECT_INFO[a][lang]}`));
      box.appendChild(mk('p', { class: 'muted small' }, FR.ASPECT_INFO[a].def[lang]));
      const x = f.aspects[a];
      box.appendChild(field(T.status, select(x.status, FR.ASPECT_STATUS.map((k) => [k, T.st[k]]), (v) => mutate(() => { x.status = v; }, { rebuild: true }))));
      x.items.forEach((it) => {
        const row = mk('div', { class: 'frow', 'data-id': it.id });
        row.appendChild(field(T.item, textInput(it.text, (v) => mutate(() => { it.text = v; })), it.id));
        row.appendChild(button(T.delete, () => { if (confirmDelete((y) => FR.removeFramNode(y, it.id), { ask: false })) mutate((y) => FR.removeFramNode(y, it.id), { rebuild: true }); }, 'mini danger'));
        box.appendChild(row);
        if (it.prov && it.prov.origin === 'generated') {
          const l = mk('label', { class: 'fld chk' }); const c = mk('input', { type: 'checkbox' }); c.checked = it.prov.reviewed === true;
          c.addEventListener('change', () => mutate(() => { it.prov.reviewed = c.checked; })); l.appendChild(c); l.appendChild(mk('span', {}, T.reviewed)); box.appendChild(l);
        }
      });
      box.appendChild(button(T.addItem, () => mutate((y) => FR.addAspectItem(y, f.id, a), { rebuild: true })));
      card.appendChild(box);
    });
    const vb = mk('fieldset', { class: 'fchoices' }); vb.appendChild(mk('legend', {}, T.variability));
    f.variability.forEach((v) => {
      const row = mk('div', { class: 'fcard', 'data-id': v.id });
      row.appendChild(field(T.variability, textInput(v.text, (val) => mutate(() => { v.text = val; }), true), v.id));
      row.appendChild(field(T.vstate, select(v.state, FR.VARIABILITY_STATE.map((k) => [k, T.vs[k]]), (val) => mutate(() => { v.state = val; }))));
      row.appendChild(field(T.vaspect, select(v.aspect, [['', T.none], ...FR.ASPECTS.map((k) => [k, FR.ASPECT_INFO[k][lang]])], (val) => mutate(() => { v.aspect = val || null; }))));
      const ec = evChoices(T, m, v, mutate); if (ec) row.appendChild(ec);
      if (v.prov && v.prov.origin === 'generated') {
        const l = mk('label', { class: 'fld chk' }); const c = mk('input', { type: 'checkbox' }); c.checked = v.prov.reviewed === true;
        c.addEventListener('change', () => mutate(() => { v.prov.reviewed = c.checked; })); l.appendChild(c); l.appendChild(mk('span', {}, T.reviewed)); row.appendChild(l);
      }
      row.appendChild(button(T.delete, () => { if (confirmDelete((y) => FR.removeFramNode(y, v.id), { ask: false })) mutate((y) => FR.removeFramNode(y, v.id), { rebuild: true }); }, 'mini danger'));
      vb.appendChild(row);
    });
    vb.appendChild(button(T.addVar, () => mutate((y) => FR.addVariability(y, f.id), { rebuild: true })));
    card.appendChild(vb);
    const ec = evChoices(T, m, f, mutate); if (ec) card.appendChild(ec);
    fs.appendChild(card);
  });
  fs.appendChild(button(T.addFunction, () => mutate((y) => FR.addFunction(y), { rebuild: true }), 'primary'));
  host.appendChild(fs);

  const cs = section(T.couplings, 'sec_couplings');
  const fnOpts = [['', T.none], ...m.functions.map((f) => [f.id, `${codes[f.id]} ${short(f.name, 30)}`])];
  m.couplings.forEach((c) => {
    const card = mk('div', { class: 'fcard', 'data-id': c.id });
    const head = mk('div', { class: 'fhead' }); head.appendChild(mk('strong', {}, codes[c.id]));
    head.appendChild(button(T.delete, () => { if (confirmDelete((y) => FR.removeFramNode(y, c.id), { ask: false })) mutate((y) => FR.removeFramNode(y, c.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(T.from, select(c.from.functionId, fnOpts, (v) => mutate(() => { c.from.functionId = v; }))));
    card.appendChild(field(T.to, select(c.to.functionId, fnOpts, (v) => mutate(() => { c.to.functionId = v; }))));
    card.appendChild(field(T.toAspect, select(c.to.aspect, FR.TARGET_ASPECTS.map((k) => [k, FR.ASPECT_INFO[k][lang]]), (v) => mutate(() => { c.to.aspect = v; }))));
    card.appendChild(field(T.ctext, textInput(c.text, (v) => mutate(() => { c.text = v; }), true), c.id));
    const ec = evChoices(T, m, c, mutate); if (ec) card.appendChild(ec);
    if (c.prov && c.prov.origin === 'generated') {
      const l = mk('label', { class: 'fld chk' }); const k = mk('input', { type: 'checkbox' }); k.checked = c.prov.reviewed === true;
      k.addEventListener('change', () => mutate(() => { c.prov.reviewed = k.checked; })); l.appendChild(k); l.appendChild(mk('span', {}, T.reviewed)); card.appendChild(l);
    }
    cs.appendChild(card);
  });
  cs.appendChild(button(T.addCoupling, () => { if (m.functions.length < 2) return; mutate((y) => FR.addCoupling(y, { functionId: y.functions[0].id }, { functionId: y.functions[1].id, aspect: 'input' }), { rebuild: true }); }));
  host.appendChild(cs);
  buildSourcesEditor(host, m, api);
}

// ------------------------------------------------------------------ Accident Pyramid
export function buildPyramidForm(host, m, api) {
  const { mutate, lang } = api; const T = L(lang);
  const confirmDelete = api.confirmDelete || ((apply, o = {}) => (o.ask === false ? true : confirm(T.confirmDelete)));
  host.textContent = '';
  const d = m.dataset;
  const ds = section(T.ds, 'sec_dataset');
  [['dname', 'name', false], ['ddesc', 'description', true], ['pstart', 'periodStart', false], ['pend', 'periodEnd', false], ['onote', 'observationNote', true], ['incl', 'inclusion', true], ['excl', 'exclusion', true], ['dup', 'duplicateHandling', true], ['rlim', 'reportingLimitations', true]]
    .forEach(([lab, key, area]) => ds.appendChild(field(T[lab], textInput(d[key], (v) => mutate(() => { d[key] = v.trim() === v ? v : v.trim(); }), area), key === 'description' ? d.id : undefined)));
  host.appendChild(ds);

  const ex = section(T.exposure, 'sec_exposure');
  ex.appendChild(field(T.evalue, textInput(m.exposure.value == null ? '' : String(m.exposure.value), (v) => mutate(() => { const n = Number(v.replace(/,/g, '')); m.exposure.value = v.trim() === '' || !Number.isFinite(n) ? null : n; }))));
  ex.appendChild(field(T.eunit, textInput(m.exposure.unit, (v) => mutate(() => { m.exposure.unit = v; }))));
  ex.appendChild(field(T.edef, textInput(m.exposure.definition, (v) => mutate(() => { m.exposure.definition = v; }), true)));
  ex.appendChild(field(T.escale, textInput(m.exposure.rateScale == null ? '' : String(m.exposure.rateScale), (v) => mutate(() => { const n = Number(v); m.exposure.rateScale = Number.isFinite(n) && n > 0 ? n : null; }))));
  host.appendChild(ex);

  const cs = section(T.cats, 'sec_categories');
  [...m.categories].sort((a, b) => a.level - b.level).forEach((c) => {
    const card = mk('div', { class: 'fcard', 'data-id': c.id });
    const head = mk('div', { class: 'fhead' }); head.appendChild(mk('strong', {}, String(c.level)));
    head.appendChild(button(T.delete, () => { if (confirmDelete((x) => PY.removeCategory(x, c.id))) mutate((x) => PY.removeCategory(x, c.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(T.clabel, textInput(c.label, (v) => mutate(() => { c.label = v; })), c.id));
    card.appendChild(field(T.cdef, textInput(c.definition, (v) => mutate(() => { c.definition = v; }), true)));
    card.appendChild(field(T.clevel, textInput(String(c.level), (v) => mutate(() => { const n = Number.parseInt(v, 10); if (Number.isInteger(n) && n >= 1) c.level = n; }, { rebuild: true }))));
    cs.appendChild(card);
  });
  cs.appendChild(button(T.addCat, () => mutate((x) => PY.addCategory(x), { rebuild: true }), 'primary'));
  host.appendChild(cs);

  const ns = section(T.counts, 'sec_counts');
  ns.appendChild(mk('p', { class: 'muted small' }, T.countNote));
  [...m.categories].sort((a, b) => a.level - b.level).forEach((c) => {
    const cur = m.counts.find((x) => x.categoryId === c.id);
    ns.appendChild(field(c.label || '—', textInput(cur && cur.count != null ? String(cur.count) : '', (v) => mutate(() => { const t = v.trim(); if (t === '') PY.setCount(m, c.id, null); else { const n = Number(t); PY.setCount(m, c.id, Number.isInteger(n) && n >= 0 ? n : null); } }, { rebuild: true })), cur ? cur.id : undefined));
  });
  host.appendChild(ns);

  const rs = section(T.records, 'sec_records');
  const MAXSHOW = 200;
  m.records.slice(0, MAXSHOW).forEach((r) => {
    const card = mk('div', { class: 'fcard', 'data-id': r.id });
    const head = mk('div', { class: 'fhead' }); head.appendChild(mk('strong', {}, short(r.reference || r.id, 30)));
    head.appendChild(button(T.delete, () => { if (confirmDelete((x) => PY.removePyramidNode(x, r.id), { ask: false })) mutate((x) => PY.removePyramidNode(x, r.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(T.rdate, textInput(r.date, (v) => mutate(() => { r.date = v.trim(); })), r.id));
    card.appendChild(field(T.rcat, select(r.categoryId, [['', T.none], ...m.categories.map((c) => [c.id, c.label])], (v) => mutate(() => { r.categoryId = v || null; }))));
    card.appendChild(field(T.rref, textInput(r.reference, (v) => mutate(() => { r.reference = v; }))));
    card.appendChild(field(T.rdup, select(r.duplicateOf, [['', T.none], ...m.records.filter((x) => x.id !== r.id).slice(0, MAXSHOW).map((x) => [x.id, short(x.reference || x.date || x.id, 30)])], (v) => mutate(() => { r.duplicateOf = v || null; }))));
    const l = mk('label', { class: 'fld chk' }); const c = mk('input', { type: 'checkbox' }); c.checked = !!r.excluded;
    c.addEventListener('change', () => mutate(() => { r.excluded = c.checked; })); l.appendChild(c); l.appendChild(mk('span', {}, T.rexc)); card.appendChild(l);
    card.appendChild(field(T.rnote, textInput(r.note, (v) => mutate(() => { r.note = v; }), true)));
    rs.appendChild(card);
  });
  if (m.records.length > MAXSHOW) rs.appendChild(mk('p', { class: 'muted' }, T.showing.replace('{n}', MAXSHOW).replace('{total}', m.records.length)));
  rs.appendChild(button(T.addRecord, () => mutate((x) => PY.addRecord(x), { rebuild: true })));
  host.appendChild(rs);

  // CSV import: preview first, nothing is added until the analyst presses the second button
  const im = section(T.imp, 'sec_import');
  im.appendChild(mk('p', { class: 'muted small' }, T.impHint));
  const ta = mk('textarea', { rows: 6, 'aria-label': T.imp });
  const fileIn = mk('input', { type: 'text', 'aria-label': T.impFile, placeholder: T.impFile });
  const create = mk('input', { type: 'checkbox' });
  const out = mk('div', { class: 'muted', role: 'status' });
  let parsed = null;
  const cl = mk('label', { class: 'fld chk' }); cl.appendChild(create); cl.appendChild(mk('span', {}, T.impCreate));
  const doPreview = button(T.impPreview, () => {
    parsed = PY.parseEventCsv(ta.value);
    if (parsed.errors.length) { out.textContent = parsed.errors.join('; '); apply.disabled = true; return; }
    const p = PY.previewEventImport(m, parsed.rows, { createCategories: create.checked });
    const bits = [`rows ${p.total}`, `accepted ${p.accepted}`, `skipped (id exists) ${p.skippedExistingId}`, `unseen labels ${p.unmappedLabels.length ? p.unmappedLabels.join(' | ') : '0'}`, `uncategorised ${p.uncategorised}`, `invalid dates ${p.invalidDates}`, `missing dates ${p.missingDates}`, `outside window ${p.outsideWindow}`, `possible duplicates ${p.possibleDuplicates}`];
    if (parsed.ignored.length) bits.push('ignored columns: ' + parsed.ignored.join(', '));
    out.textContent = bits.join(' · '); apply.disabled = p.accepted === 0;
  });
  const apply = button(T.impApply, async () => {
    if (!parsed || parsed.errors.length) return;
    const text = ta.value;
    let hash = '';
    try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); } catch { /* hash is optional */ }
    mutate((x) => { PY.applyEventImport(x, parsed.rows, { createCategories: create.checked, source: { name: fileIn.value.trim(), hash } }); }, { rebuild: true });
  });
  apply.disabled = true;
  [ta, fileIn, cl, doPreview, apply, out].forEach((e) => im.appendChild(e));
  host.appendChild(im);
  buildSourcesEditor(host, m, api);
}
