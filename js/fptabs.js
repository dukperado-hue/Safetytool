// Safetytool — Analysis tab, table rows and CSV for FRAM and the Accident Pyramid. Presents the pure modules' results; adds no logic.

import * as FR from './fram.js';
import * as PY from './pyramid.js';

const S = {
  th: {
    frTitle: 'ภาพรวม FRAM', frNote: 'ตารางนี้แสดงว่า aspect ใดอธิบายแล้ว ยังไม่ได้ประเมิน หรือระบุว่าไม่มี ช่อง "?" หมายถึงยังไม่รู้ ไม่ได้แปลว่าไม่มีหรือปลอดภัย โมเดลนี้ไม่คำนวณความแปรปรวนหรือ resonance',
    fn: 'ฟังก์ชัน', described: 'อธิบายแล้ว', unknown: 'ยังไม่ได้ประเมิน', none: 'ไม่มี', couplings: 'Coupling', variability: 'ความแปรปรวน', gaps: 'ช่องว่างที่ควรตรวจ', noGaps: 'ไม่พบช่องว่างตามกฎ lint', open: 'รายการที่ยังไม่ตรวจทาน',
    pyTitle: 'วิเคราะห์ชุดข้อมูล (Accident Pyramid)', pyNote: 'ภาพนี้อธิบาย dataset ที่ป้อนเข้ามาภายใต้นิยามของมันเท่านั้น ไม่ใช่การพยากรณ์ จำนวนไม่ใช่อัตรา อัตราไม่ใช่ความเสี่ยง ไม่มีสัดส่วนสำเร็จรูปของ Heinrich หรือผู้ใดในระบบนี้',
    tier: 'ระดับ', def: 'นิยาม', count: 'จำนวน', rate: 'อัตรา', countsOnly: 'แสดงเฉพาะจำนวน เพราะ: ', basis: 'ฐานของจำนวน', records: 'record', aggregate: 'จำนวนรวม', dup: 'ซ้ำ (ไม่นับ)', exc: 'ตัดออก', unc: 'ยังไม่จัดระดับ', nodate: 'ไม่มีวันที่ที่ถูกต้อง', outside: 'อยู่นอกช่วงเวลา', unknown2: 'ไม่ทราบ',
    cmp: 'เปรียบเทียบกับชุดข้อมูลอื่น', cmpPick: 'เลือกชุดข้อมูลจากคลังงาน', cmpNone: 'ไม่มีชุดข้อมูล Accident Pyramid อื่นในคลังงาน (บันทึกไว้ก่อน)', level: { compatible: 'เทียบได้ (นิยามตรงกัน)', caution: 'ระวัง: นิยามหรือช่วงเวลาไม่ตรงกัน — ไม่คำนวณผลต่าง', incompatible: 'เทียบไม่ได้: ระดับความรุนแรงต่างกัน — ไม่คำนวณผลต่าง' }, delta: 'ผลต่าง', na: '—', this: 'ชุดนี้', other: 'ชุดที่เลือก', ratesNote: 'อัตราเทียบได้เมื่อหน่วย นิยาม และสเกลของตัวหารตรงกัน',
    inc: 'นับในช่วง', before: 'ก่อนช่วง', after: 'หลังช่วง', winTxt: 'ขอบเขตวันที่: นับเฉพาะ record ที่มีวันที่ถูกต้องตั้งแต่ {a} ถึง {b} (รวมวันแรกและวันสุดท้าย) record นอกช่วงหรือไม่มีวันที่ที่ใช้ได้ไม่ถูกนับ แต่ยังอยู่ในข้อมูลและไม่ถูกลบ', noWin: 'ยังไม่มีช่วงเวลาวิเคราะห์ที่ถูกต้อง จึงไม่ได้กรอง record ตามวันที่ — ตัวเลขอาจรวมเหตุการณ์นอกช่วงที่ต้องการ',
    unusedWarn: 'มีทั้งจำนวนรวมและ record: ตารางด้านบนใช้ "จำนวนรวม" ที่กรอกไว้ และไม่นำ record มานับหรือบวกเพิ่ม (อาจเป็นเหตุการณ์ชุดเดียวกัน) หากต้องการใช้ record เป็นฐาน ให้ล้างจำนวนรวมของทุกระดับก่อน', xcTitle: 'ตรวจเทียบจำนวนรวมกับ record (ไม่ถูกนำมานับ)', xcAgg: 'จำนวนรวม', xcRec: 'record ในช่วง', xcDiff: 'ต่างกัน — ไม่ตัดสินว่าอันไหนถูก', xcSame: 'ตรงกัน',
    el: { activity: 'กิจกรรม', fn: 'ฟังก์ชัน', cp: 'Coupling', asp: 'Aspect', tier: 'ระดับ', rec: 'Record', ds: 'ชุดข้อมูล' },
  },
  en: {
    frTitle: 'FRAM overview', frNote: 'This table shows which aspects are described, not assessed, or stated as none. A "?" means unknown — not "none" and not "safe". This model does not calculate variability or resonance.',
    fn: 'Function', described: 'described', unknown: 'not assessed', none: 'none', couplings: 'Couplings', variability: 'Variability', gaps: 'Gaps to check', noGaps: 'No gaps found by the lint rules', open: 'Items not yet reviewed',
    pyTitle: 'Dataset analysis (Accident Pyramid)', pyNote: 'This picture describes the supplied dataset under its own definitions. It is not a prediction; counts are not rates; rates are not risk. No ready-made ratio (Heinrich’s or anyone’s) is built in.',
    tier: 'Tier', def: 'Definition', count: 'Count', rate: 'Rate', countsOnly: 'Counts only, because: ', basis: 'Basis of counts', records: 'records', aggregate: 'aggregate counts', dup: 'duplicates (not counted)', exc: 'excluded', unc: 'uncategorised', nodate: 'no valid date', outside: 'outside the window', unknown2: 'unknown',
    cmp: 'Compare with another dataset', cmpPick: 'Choose a dataset from the gallery', cmpNone: 'No other Accident Pyramid dataset in the gallery (save one first)', level: { compatible: 'Comparable (definitions match)', caution: 'Caution: definitions or windows differ — no difference is calculated', incompatible: 'Not comparable: different severity tiers — no difference is calculated' }, delta: 'Difference', na: '—', this: 'This dataset', other: 'Chosen dataset', ratesNote: 'Rates are comparable only when the denominator unit, definition and scale match',
    inc: 'counted (in window)', before: 'before the window', after: 'after the window', winTxt: 'Date scope: only records with a valid date from {a} to {b} (first and last day included) are counted. Records outside it, or without a usable date, are not counted — they stay in the data and are not deleted.', noWin: 'There is no valid analysis window, so records are NOT filtered by date — the figures may include events outside the period you intend.',
    unusedWarn: 'Both aggregate counts and records exist: the table above uses the aggregate counts you entered. Records are not counted and never added to them (they may be the same events). To use records as the basis, clear the aggregate counts of every tier first.', xcTitle: 'Cross-check: aggregate counts vs records (records are not counted)', xcAgg: 'aggregate', xcRec: 'records in window', xcDiff: 'differ — the tool does not decide which is right', xcSame: 'match',
    el: { activity: 'Activity', fn: 'Function', cp: 'Coupling', asp: 'Aspect', tier: 'Tier', rec: 'Record', ds: 'Dataset' },
  },
};
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const short = (s, n = 60) => { const x = (s || '').trim(); return x ? (x.length > n ? x.slice(0, n) + '…' : x) : '—'; };

export function drawFramAnalysis(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  const codes = FR.framCodes(m);
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.frTitle));
  host.appendChild(el('p', 'muted', L.frNote));
  const tbl = el('table', 'sim-table');
  const head = tbl.createTHead().insertRow();
  head.appendChild(el('th', null, L.fn));
  FR.ASPECTS.forEach((a) => head.appendChild(el('th', null, FR.ASPECT_INFO[a].letter + ' ' + FR.ASPECT_INFO[a].en)));
  const tb = tbl.createTBody();
  const sym = { described: '■ ' + L.described, unknown: '? ' + L.unknown, none: '– ' + L.none };
  m.functions.forEach((f) => {
    const r = tb.insertRow();
    r.insertCell().textContent = `${codes[f.id]} ${short(f.name, 40)}`;
    FR.ASPECTS.forEach((a) => { const c = r.insertCell(); c.textContent = sym[f.aspects[a].status] + (f.aspects[a].items.length ? ' (' + f.aspects[a].items.length + ')' : ''); if (f.aspects[a].status === 'unknown') c.className = 'muted'; });
  });
  host.appendChild(tbl);
  host.appendChild(el('p', null, `${L.couplings}: ${m.couplings.length} · ${L.variability}: ${m.functions.reduce((s, f) => s + f.variability.length, 0)}`));
  const issues = FR.lintFram(m).filter((i) => i.severity !== 'info' || ['FR011', 'FR012'].includes(i.rule));
  host.appendChild(el('h3', null, L.gaps));
  if (!issues.length) host.appendChild(el('p', 'muted', L.noGaps));
  else { const ul = el('ul', 'sim-list'); issues.slice(0, 60).forEach((i) => ul.appendChild(el('li', null, `[${i.rule}] ${i[ctx.lang]}`))); host.appendChild(ul); }
}

export function drawPyramidAnalysis(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  const t = PY.tally(m); const ck = PY.exposureCheck(m);
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.pyTitle));
  host.appendChild(el('p', 'muted', L.pyNote));
  if (!ck.valid) host.appendChild(el('p', 'warn-note', L.countsOnly + ck.missing.join('; ')));
  const tbl = el('table', 'sim-table');
  const head = tbl.createTHead().insertRow();
  [L.tier, L.def, L.count, L.rate].forEach((x) => head.appendChild(el('th', null, x)));
  const tb = tbl.createTBody();
  t.rows.forEach((r) => {
    const c = m.categories.find((x) => x.id === r.categoryId);
    const row = tb.insertRow(); const rt = PY.rateOf(m, r.count);
    row.insertCell().textContent = `${r.level}. ${r.label || '—'}`;
    row.insertCell().textContent = c ? c.definition : '';
    row.insertCell().textContent = r.unknown ? L.unknown2 : String(r.count);
    row.insertCell().textContent = rt.valid ? rt.text : L.na;
  });
  host.appendChild(tbl);
  const bits = [`${L.basis}: ${t.basis === 'records' ? L.records : L.aggregate}`];
  if (t.records) bits.push(`${t.records} ${L.records}`, `${L.inc}: ${t.included}`, `${L.dup}: ${t.duplicates}`, `${L.exc}: ${t.excluded}`, `${L.unc}: ${t.uncategorised}`, `${L.nodate}: ${t.incompleteDates}`, `${L.outside}: ${t.outsideWindow} (${L.before} ${t.outsideBefore} / ${L.after} ${t.outsideAfter})`);
  host.appendChild(el('p', 'muted', bits.join(' · ')));
  if (t.records) host.appendChild(el('p', t.windowApplied ? 'muted' : 'warn-note', t.windowApplied ? L.winTxt.replace('{a}', t.window.start).replace('{b}', t.window.end) : L.noWin));
  if (t.recordsCheck) {
    host.appendChild(el('p', 'warn-note', L.unusedWarn));
    host.appendChild(el('h3', null, L.xcTitle));
    const xt = el('table', 'sim-table'); const xh = xt.createTHead().insertRow();
    [L.tier, L.xcAgg, L.xcRec, ''].forEach((x) => xh.appendChild(el('th', null, x)));
    const xb = xt.createTBody();
    t.recordsCheck.tiers.forEach((x) => { const r2 = xb.insertRow(); r2.insertCell().textContent = x.label || '—'; r2.insertCell().textContent = x.aggregate == null ? L.unknown2 : String(x.aggregate); r2.insertCell().textContent = String(x.records); r2.insertCell().textContent = x.aggregate == null ? '' : (x.differs ? L.xcDiff : L.xcSame); });
    host.appendChild(xt);
  }

  host.appendChild(el('h3', null, L.cmp));
  const works = (ctx.works || []).filter((w) => w.type === 'pyramid' && w.model && w.model.meta && w.model.meta.modelId !== m.meta.modelId);
  if (!works.length) { host.appendChild(el('p', 'muted', L.cmpNone)); return; }
  const sel = el('select', 'guide-input'); sel.setAttribute('aria-label', L.cmpPick);
  const o0 = el('option', null, L.cmpPick); o0.value = ''; sel.appendChild(o0);
  works.forEach((w, i) => { const o = el('option', null, w.model.meta.title || w.id); o.value = String(i); sel.appendChild(o); });
  const out = el('div');
  sel.addEventListener('change', () => {
    out.textContent = '';
    if (sel.value === '') return;
    const other = PY.normalizePyramid(JSON.parse(JSON.stringify(works[Number(sel.value)].model)));
    const c = PY.comparePyramids(m, other);
    out.appendChild(el('p', c.level === 'compatible' ? 'ok-note' : 'warn-note', '■ ' + L.level[c.level]));
    if (c.warnings.length) { const ul = el('ul', 'sim-list'); c.warnings.forEach((w) => ul.appendChild(el('li', null, w))); out.appendChild(ul); }
    const tt = el('table', 'sim-table'); const hr = tt.createTHead().insertRow();
    [L.tier, L.this, L.other, L.delta].forEach((x) => hr.appendChild(el('th', null, x)));
    const body = tt.createTBody();
    c.rows.forEach((r) => {
      const row = body.insertRow(); row.insertCell().textContent = r.label;
      const f = (x) => (x ? (x.count == null ? L.unknown2 : String(x.count)) + (x.rate ? ' (' + x.rate + ')' : '') : L.na);
      row.insertCell().textContent = f(r.a); row.insertCell().textContent = f(r.b);
      row.insertCell().textContent = r.delta == null ? L.na : (r.delta > 0 ? '+' : '') + r.delta + (r.rateDelta != null ? ' (' + (r.rateDelta > 0 ? '+' : '') + r.rateDelta + ')' : '');
    });
    out.appendChild(tt); out.appendChild(el('p', 'muted', L.ratesNote));
  });
  host.append(sel, out);
}

// ---- table rows (the read-only equivalent of the diagram) ----
export function framRows(m, add, rows, lang) {
  const L = S[lang] || S.th; const codes = FR.framCodes(m);
  add('framActivity', m.activity);
  m.functions.forEach((f) => {
    const n = FR.ASPECTS.filter((a) => f.aspects[a].status === 'described').length;
    add('framFunction', f, `${codes[f.id]} · ${n}/6 ${L.described}`, 0, f.name);
    FR.ASPECTS.forEach((a) => {
      const x = f.aspects[a];
      rows.push({ id: f.id, kind: 'framAspect', text: `${FR.ASPECT_INFO[a].en}: ${x.status === 'described' ? x.items.map((i) => i.text).join(' | ') : '[' + L[x.status] + ']'}`, detail: x.items.some((i) => i.prov && i.prov.origin === 'generated' && !i.prov.reviewed) ? 'generated, not reviewed' : '', indent: 1 });
    });
    f.variability.forEach((v) => add('framVariability', v, `${v.state}${v.aspect ? ' · ' + v.aspect : ''}${v.evidenceIds.length ? ' · evidence ' + v.evidenceIds.length : ''}`, 1));
  });
  m.couplings.forEach((c) => add('framCoupling', c, `${codes[c.id]} · ${codes[c.from.functionId] || '?'}.output → ${codes[c.to.functionId] || '?'}.${c.to.aspect}`, 0));
  return rows;
}
export function pyramidRows(m, add, rows, lang) {
  const L = S[lang] || S.th; const t = PY.tally(m);
  add('pyDataset', m.dataset, `${m.dataset.periodStart || '?'} → ${m.dataset.periodEnd || '?'}`, 0, m.dataset.name || m.dataset.description);
  t.rows.forEach((r) => { const rt = PY.rateOf(m, r.count); const c = m.categories.find((x) => x.id === r.categoryId); add('pyTier', c, `${r.unknown ? L.unknown2 : r.count}${rt.valid ? ' · ' + rt.text : ''}`, 0, `${r.level}. ${r.label}`); });
  m.records.slice(0, 500).forEach((r) => add('pyRecord', r, [r.date || 'no date', (m.categories.find((c) => c.id === r.categoryId) || {}).label || 'uncategorised', r.duplicateOf ? 'duplicate' : '', r.excluded ? 'excluded' : ''].filter(Boolean).join(' · '), 1, r.reference || r.note));
  return rows;
}

const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
export function toCsv(type, m) {
  const rows = [];
  if (type === 'fram') {
    const codes = FR.framCodes(m);
    rows.push(['kind', 'code', 'function', 'aspect', 'status', 'text', 'to'].map(q).join(','));
    m.functions.forEach((f) => FR.ASPECTS.forEach((a) => rows.push(['aspect', codes[f.id], f.name, a, f.aspects[a].status, f.aspects[a].items.map((i) => i.text).join(' | '), ''].map(q).join(','))));
    m.functions.forEach((f) => f.variability.forEach((v) => rows.push(['variability', codes[f.id], f.name, v.aspect || '', v.state, v.text, ''].map(q).join(','))));
    m.couplings.forEach((c) => rows.push(['coupling', codes[c.id], (m.functions.find((f) => f.id === c.from.functionId) || {}).name || '', 'output', '', c.text, `${(m.functions.find((f) => f.id === c.to.functionId) || {}).name || ''} / ${c.to.aspect}`].map(q).join(',')));
  } else {
    const t = PY.tally(m);
    rows.push(['tier', 'level', 'count', 'rate', 'basis', 'period_start', 'period_end', 'records_total', 'records_counted_in_window', 'records_outside_window', 'records_no_valid_date', 'records_not_used_for_counts'].map(q).join(','));
    t.rows.forEach((r) => { const rt = PY.rateOf(m, r.count); rows.push([r.label, r.level, r.unknown ? 'unknown' : r.count, rt.valid ? rt.text : '', t.basis, m.dataset.periodStart, m.dataset.periodEnd, t.records, t.included, t.outsideWindow, t.incompleteDates, t.basisNote === 'aggregate-records-unused' ? t.records : 0].map(q).join(',')); });
  }
  return '﻿' + rows.join('\r\n');
}
