// Safetytool — inspector section for a control: state, assurance data, and the evidence / assumptions behind it.
// Writes through mutate() so everything is saved, undoable and exported. Never invents a source or a date.

import { addEvidence, addAssumption, EVIDENCE_KINDS, EVIDENCE_TYPES, CONFIDENCE, isIsoDate } from './evidence.js';
import { ACTION_STATUS, STATE_MEANING, addAction, actionsOf, recordAssessment, setActionStatus, closureProblems, removeAction } from './actions.js';

// Wording for the additions (assessment record, evidence type, corrective actions). Kept apart from S so the older keys stay as they were.
const X = {
  th: {
    stNote: 'ความหมายของสถานะนี้', unkNote: 'ยังไม่ได้ประเมิน', needEv: 'สถานะ effective ควรมีหลักฐาน OBSERVED ผูกอยู่ — ตอนนี้ยังไม่มี', stale: 'เลยกำหนดทบทวนแล้ว สถานะอาจล้าสมัย',
    by: 'ผู้ประเมิน (ชื่อหรือบทบาท)', on: 'วันที่ประเมิน (YYYY-MM-DD)', notes: 'บันทึกการประเมิน', record: 'บันทึกการประเมินนี้ลงประวัติ', recorded: 'บันทึกแล้ว', history: 'ประวัติการประเมิน (แก้ไขย้อนหลังไม่ได้)', noHist: '(ยังไม่เคยบันทึก)',
    owner: 'ผู้รับผิดชอบ (บทบาท)', histNote: 'หมายเหตุ',
    etype: 'ชนิดหลักฐาน', edesc: 'คำอธิบาย', recAt: 'บันทึกในโปรแกรมเมื่อ', recBy: 'ผู้บันทึก', evNote: 'หลักฐานที่ผูกไว้ไม่ได้พิสูจน์ความเป็นเหตุเป็นผลด้วยตัวเอง', none2: '—',
    acts: 'มาตรการแก้ไข (corrective action)', addAct: '+ เพิ่มมาตรการแก้ไข', actNote: 'สถานะของมาตรการแยกจากสถานะของ Barrier: ปิดมาตรการไม่ได้ทำให้ Barrier กลายเป็น effective — ต้องประเมินซ้ำและบันทึกใหม่',
    finding: 'ข้อบกพร่องที่พบ', what: 'มาตรการที่จะทำ', due: 'กำหนดเสร็จ (YYYY-MM-DD)', stat: 'สถานะมาตรการ', compEv: 'หลักฐานว่าทำเสร็จ', addCompEv: '+ เพิ่มหลักฐานการทำเสร็จ',
    verBy: 'ผู้ตรวจสอบผล', verAt: 'วันที่ตรวจสอบ (YYYY-MM-DD)', verNote: 'ผลการตรวจสอบ', del: 'ลบมาตรการ', cannot: 'เปลี่ยนสถานะไม่ได้: ', missing: 'ยังขาด: ',
    as: { open: 'เปิด (open)', in_progress: 'กำลังทำ (in progress)', implemented: 'ทำแล้ว รอตรวจสอบ (implemented)', verified: 'ตรวจสอบผลแล้ว (verified)', closed: 'ปิด (closed)', cancelled: 'ยกเลิก (cancelled)' },
    reassess: 'มีมาตรการที่ปิดหลังการประเมินล่าสุด — ควรประเมิน Barrier ซ้ำ (ระบบไม่เปลี่ยนสถานะให้)',
  },
  en: {
    stNote: 'What this state means', unkNote: 'Not assessed yet', needEv: 'An effective state should have OBSERVED evidence linked; none is linked yet', stale: 'The review date has passed; the state may be stale',
    by: 'Assessed by (name or role)', on: 'Assessed on (YYYY-MM-DD)', notes: 'Assessment notes', record: 'Record this assessment in the history', recorded: 'Recorded', history: 'Assessment history (cannot be edited afterwards)', noHist: '(nothing recorded yet)',
    owner: 'Responsible role', histNote: 'Note',
    etype: 'Evidence type', edesc: 'Description', recAt: 'Recorded in the tool at', recBy: 'Recorded by', evNote: 'Linked evidence does not by itself prove a causal relationship', none2: '—',
    acts: 'Corrective actions', addAct: '+ Add corrective action', actNote: 'An action’s status is separate from the barrier’s state: closing an action does not make the barrier effective. Reassess the barrier and record a new assessment.',
    finding: 'Deficiency found', what: 'Action to take', due: 'Due date (YYYY-MM-DD)', stat: 'Action status', compEv: 'Completion evidence', addCompEv: '+ Add completion evidence',
    verBy: 'Verified by', verAt: 'Verified on (YYYY-MM-DD)', verNote: 'Verification result', del: 'Delete action', cannot: 'Cannot change status: ', missing: 'Still missing: ',
    as: { open: 'open', in_progress: 'in progress', implemented: 'implemented, awaiting verification', verified: 'verified', closed: 'closed', cancelled: 'cancelled' },
    reassess: 'An action was closed after the last recorded assessment. Reassess the barrier (the state is not changed automatically).',
  },
};
const ETYPE = {
  th: { '': '—', inspection: 'ตรวจสอบหน้างาน (inspection)', audit: 'ตรวจประเมิน (audit)', test: 'ทดสอบ (test)', measurement: 'วัดค่า (measurement)', report: 'รายงาน (report)', document: 'เอกสาร (document)', interview: 'สัมภาษณ์ (interview)', other: 'อื่น ๆ (other)' },
  en: { '': '—', inspection: 'inspection', audit: 'audit', test: 'test', measurement: 'measurement', report: 'report', document: 'document', interview: 'interview', other: 'other' },
};

const S = {
  th: {
    head: 'สถานะและหลักฐานของ Barrier', status: 'สถานะ', logic: 'ถ้าเสื่อม ยังตัดเส้นทางได้ไหม', pickLogic: '— ยังไม่ระบุ —',
    st: { '': 'ไม่ทราบ (unknown)', effective: 'ทำงาน (effective)', degraded: 'เสื่อม (degraded)', failed: 'ล้มเหลว / ใช้ไม่ได้ (failed = ineffective)' },
    lg: { blocks: 'ยังตัดได้ (blocks)', fails: 'ถือว่าล้มเหลว (fails)' },
    std: 'มาตรฐานสมรรถนะ (performance standard)', ver: 'วิธีตรวจสอบ', last: 'ตรวจล่าสุด (YYYY-MM-DD)', next: 'ทบทวนครั้งถัดไป (YYYY-MM-DD)', badDate: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD',
    ev: 'หลักฐาน', as: 'สมมติฐาน', addEv: '+ เพิ่มหลักฐาน', addAs: '+ เพิ่มสมมติฐาน', none: '(ยังไม่มี)', remove: 'เลิกผูก',
    kind: { OBSERVED: 'OBSERVED — สังเกตได้ (ต้องมีแหล่งที่มา)', ASSESSED: 'ASSESSED — ผู้วิเคราะห์ประเมิน', HYPOTHESISED: 'HYPOTHESISED — ยังต้องตรวจสอบ' },
    source: 'แหล่งที่มา', ref: 'เอกสารอ้างอิง', date: 'วันที่ (YYYY-MM-DD)', limit: 'ข้อจำกัด', conf: 'ความเชื่อมั่น', stmt: 'ข้อความสมมติฐาน', how: 'จะตรวจสอบได้อย่างไร', owner: 'ผู้เสนอ',
    note: 'โปรแกรมไม่สร้างแหล่งที่มาให้ ใส่เฉพาะที่มีจริง', conf3: { '': '—', low: 'ต่ำ', medium: 'กลาง', high: 'สูง' },
  },
  en: {
    head: 'Barrier state and evidence', status: 'State', logic: 'If degraded, does it still cut the path?', pickLogic: '— not specified —',
    st: { '': 'unknown', effective: 'effective', degraded: 'degraded', failed: 'failed (ineffective)' },
    lg: { blocks: 'still cuts (blocks)', fails: 'treated as failed (fails)' },
    std: 'Performance standard', ver: 'Verification method', last: 'Last verified (YYYY-MM-DD)', next: 'Next review (YYYY-MM-DD)', badDate: 'Date must be YYYY-MM-DD',
    ev: 'Evidence', as: 'Assumptions', addEv: '+ Add evidence', addAs: '+ Add assumption', none: '(none yet)', remove: 'Unlink',
    kind: { OBSERVED: 'OBSERVED — a fact (needs a source)', ASSESSED: 'ASSESSED — analyst judgement', HYPOTHESISED: 'HYPOTHESISED — still to verify' },
    source: 'Source', ref: 'Reference', date: 'Date (YYYY-MM-DD)', limit: 'Limitation', conf: 'Confidence', stmt: 'Assumption', how: 'How to verify', owner: 'Proposed by',
    note: 'The tool never creates a source for you. Enter only what exists.', conf3: { '': '—', low: 'low', medium: 'medium', high: 'high' },
  },
};

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function field(label, input) {
  const w = el('label', 'fld');
  w.append(el('span', null, label), input);
  return w;
}
function text(value, on, { area = false, placeholder = '' } = {}) {
  const i = el(area ? 'textarea' : 'input');
  if (area) i.rows = 2;
  i.value = value || '';
  if (placeholder) i.placeholder = placeholder;
  i.addEventListener('change', () => on(i.value));
  return i;
}
function select(options, value, on) {
  const s = el('select');
  options.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; s.appendChild(o); });
  s.value = value == null ? '' : value;
  s.addEventListener('change', () => on(s.value));
  return s;
}
function dateField(L, label, value, on) {
  const i = text(value, (v) => on(v.trim()), { placeholder: 'YYYY-MM-DD' });
  const w = field(label, i);
  const check = () => { const bad = i.value.trim() && !isIsoDate(i.value.trim()); i.setAttribute('aria-invalid', String(!!bad)); i.title = bad ? L.badDate : ''; };
  i.addEventListener('input', check); check();
  return w;
}

/** ctx: { lang, mutate(fn, {rebuild}) } — `m` is the live model, `c` a control inside it. */
export function drawAssurance(host, m, c, ctx) {
  const L = S[ctx.lang] || S.th;
  const Q = X[ctx.lang] || X.th;
  const lang = ctx.lang === 'en' ? 'en' : 'th';
  const mut = (fn, rebuild = false) => ctx.mutate(fn, { rebuild });
  const box = el('section', 'assure');
  box.appendChild(el('h3', null, L.head));
  box.appendChild(el('p', 'muted', L.note));

  box.appendChild(field(L.status, select(Object.entries(L.st), c.status || '', (v) => mut(() => { c.status = v || null; if (v !== 'degraded') c.degradedLogic = null; }, true))));
  if (c.status === 'degraded') {
    box.appendChild(field(L.logic, select([['', L.pickLogic], ['blocks', L.lg.blocks], ['fails', L.lg.fails]], c.degradedLogic || '', (v) => mut(() => { c.degradedLogic = v || null; }))));
  }
  // What the state means (words, not colour) and what is missing or stale behind it.
  const stateKey = c.status || 'unknown';
  box.appendChild(el('p', 'muted small', Q.stNote + ': ' + STATE_MEANING[stateKey][lang]));
  if (c.status === 'effective' && !(c.evidenceIds || []).some((id) => (m.evidence || []).some((e) => e.id === id && e.kind === 'OBSERVED'))) box.appendChild(el('p', 'warn-note', '▲ ' + Q.needEv));
  const today = new Date().toISOString().slice(0, 10);
  if (c.assurance && c.assurance.nextReview && isIsoDate(c.assurance.nextReview) && c.assurance.nextReview < today) box.appendChild(el('p', 'warn-note', '▲ ' + Q.stale + ' (' + c.assurance.nextReview + ')'));
  const a = () => (c.assurance = c.assurance || {});
  box.appendChild(field(L.std, text(c.assurance && c.assurance.performanceStandard, (v) => mut(() => { a().performanceStandard = v; }), { area: true })));
  box.appendChild(field(L.ver, text(c.assurance && c.assurance.verification, (v) => mut(() => { a().verification = v; }), { area: true })));
  box.appendChild(dateField(L, L.last, c.assurance && c.assurance.lastVerified, (v) => mut(() => { a().lastVerified = v; })));
  box.appendChild(dateField(L, L.next, c.assurance && c.assurance.nextReview, (v) => mut(() => { a().nextReview = v; })));
  box.appendChild(field(Q.by, text(c.assurance && c.assurance.assessedBy, (v) => mut(() => { a().assessedBy = v; }))));
  box.appendChild(dateField(L, Q.on, c.assurance && c.assurance.assessedOn, (v) => mut(() => { a().assessedOn = v; })));
  box.appendChild(field(Q.notes, text(c.assurance && c.assurance.assessmentNotes, (v) => mut(() => { a().assessmentNotes = v; }), { area: true })));
  const rec = el('button', null, Q.record); rec.type = 'button';
  rec.addEventListener('click', () => mut(() => { recordAssessment(c); }, true));
  box.appendChild(rec);
  box.appendChild(el('h3', null, Q.history));
  const hist = ((c.assurance && c.assurance.history) || []).slice().reverse();
  if (!hist.length) box.appendChild(el('p', 'muted', Q.noHist));
  hist.forEach((h) => {
    const row = el('div', 'fcard');
    row.appendChild(el('code', null, (h.recordedAt || '').slice(0, 16).replace('T', ' ') + ' · ' + (L.st[h.status] || h.status)));
    const bits = [h.assessedBy && (Q.by.split(' (')[0] + ': ' + h.assessedBy), h.assessedOn && h.assessedOn, h.note && (Q.histNote + ': ' + h.note), (h.evidenceIds || []).length && (L.ev + ': ' + h.evidenceIds.length)].filter(Boolean);
    if (bits.length) row.appendChild(el('p', 'muted small', bits.join(' · ')));
    box.appendChild(row);
  });
  const act0 = actionsOf(m, c.id);
  const lastRec = hist.length ? hist[0].recordedAt : '';
  if (act0.some((x) => x.status === 'closed' && x.closedAt && (!lastRec || x.closedAt > lastRec))) box.appendChild(el('p', 'warn-note', '▲ ' + Q.reassess));

  // --- evidence ---
  box.appendChild(el('h3', null, L.ev));
  const evs = (c.evidenceIds || []).map((id) => (m.evidence || []).find((e) => e.id === id)).filter(Boolean);
  if (!evs.length) box.appendChild(el('p', 'muted', L.none));
  // One evidence record, editable in place. `unlink` removes the link from the holder; the record itself stays in model.evidence.
  const evidenceCard = (e, unlink) => {
    const card = el('div', 'fcard');
    card.appendChild(el('code', null, e.id));
    card.appendChild(field(L.source, text(e.source, (v) => mut(() => { e.source = v; }))));
    card.appendChild(field('', select(EVIDENCE_KINDS.map((k) => [k, L.kind[k]]), e.kind, (v) => mut(() => { e.kind = v; }))));
    card.appendChild(field(Q.etype, select(['', ...EVIDENCE_TYPES].map((k) => [k, ETYPE[lang][k]]), e.evidenceType || '', (v) => mut(() => { e.evidenceType = v || null; }))));
    card.appendChild(field(Q.edesc, text(e.description, (v) => mut(() => { e.description = v; }), { area: true })));
    card.appendChild(field(L.ref, text(e.reference, (v) => mut(() => { e.reference = v; }))));
    card.appendChild(dateField(L, L.date, e.date, (v) => mut(() => { e.date = v; })));
    card.appendChild(field(Q.recBy, text(e.recordedBy, (v) => mut(() => { e.recordedBy = v; }))));
    if (e.recordedAt) card.appendChild(el('p', 'muted small', Q.recAt + ': ' + e.recordedAt.slice(0, 16).replace('T', ' ')));
    card.appendChild(field(L.limit, text(e.limitation, (v) => mut(() => { e.limitation = v; }), { area: true })));
    card.appendChild(field(L.conf, select(['', ...CONFIDENCE].map((k) => [k, L.conf3[k]]), e.confidence || '', (v) => mut(() => { e.confidence = v || null; }))));
    const un = el('button', 'mini', L.remove); un.type = 'button';
    un.addEventListener('click', () => mut(() => { unlink(); }, true));
    card.appendChild(un);
    return card;
  };
  evs.forEach((e) => box.appendChild(evidenceCard(e, () => { c.evidenceIds = c.evidenceIds.filter((x) => x !== e.id); })));
  if (evs.length) box.appendChild(el('p', 'muted small', Q.evNote));
  const addE = el('button', null, L.addEv); addE.type = 'button';
  addE.addEventListener('click', () => mut((model) => { const e = addEvidence(model, 'ASSESSED'); (c.evidenceIds = c.evidenceIds || []).push(e.id); }, true));
  box.appendChild(addE);

  // --- assumptions ---
  box.appendChild(el('h3', null, L.as));
  const ass = (c.assumptionIds || []).map((id) => (m.assumptions || []).find((x) => x.id === id)).filter(Boolean);
  if (!ass.length) box.appendChild(el('p', 'muted', L.none));
  ass.forEach((x) => {
    const card = el('div', 'fcard');
    card.appendChild(el('code', null, x.id));
    card.appendChild(field(L.stmt, text(x.statement, (v) => mut(() => { x.statement = v; }), { area: true })));
    card.appendChild(field(L.how, text(x.howToVerify, (v) => mut(() => { x.howToVerify = v; }), { area: true })));
    card.appendChild(field(L.owner, text(x.owner, (v) => mut(() => { x.owner = v; }))));
    const un = el('button', 'mini', L.remove); un.type = 'button';
    un.addEventListener('click', () => mut(() => { c.assumptionIds = c.assumptionIds.filter((i) => i !== x.id); }, true));
    card.appendChild(un);
    box.appendChild(card);
  });
  const addA = el('button', null, L.addAs); addA.type = 'button';
  addA.addEventListener('click', () => mut((model) => { const x = addAssumption(model, ''); (c.assumptionIds = c.assumptionIds || []).push(x.id); }, true));
  box.appendChild(addA);

  // --- corrective actions (separate from the barrier's state) ---
  box.appendChild(el('h3', null, Q.acts));
  box.appendChild(el('p', 'muted small', Q.actNote));
  const acts = actionsOf(m, c.id);
  if (!acts.length) box.appendChild(el('p', 'muted', L.none));
  acts.forEach((x) => {
    const card = el('div', 'fcard');
    card.appendChild(el('code', null, x.id));
    card.appendChild(field(Q.finding, text(x.finding, (v) => mut(() => { x.finding = v; }), { area: true })));
    card.appendChild(field(Q.what, text(x.text, (v) => mut(() => { x.text = v; }), { area: true })));
    card.appendChild(field(Q.owner, text(x.ownerRole, (v) => mut(() => { x.ownerRole = v; }))));
    card.appendChild(dateField(L, Q.due, x.dueDate, (v) => mut(() => { x.dueDate = v; })));
    const msg = el('p', 'warn-note');
    card.appendChild(field(Q.stat, select(ACTION_STATUS.map((s) => [s, Q.as[s]]), x.status, (v) => {
      // the model refuses a move that breaks the closure rules; the message says what is missing
      let r = { ok: true };
      mut((model) => { r = setActionStatus(model, x.id, v); }, true);
      if (!r.ok) { msg.textContent = '▲ ' + Q.cannot + r.reason + (r.missing ? ' — ' + Q.missing + r.missing.join('; ') : ''); if (ctx.flash) ctx.flash(msg.textContent); }
    })));
    card.appendChild(msg);
    const miss = closureProblems(m, x);
    if (x.status !== 'closed' && x.status !== 'cancelled' && miss.length) card.appendChild(el('p', 'muted small', Q.missing + miss.join('; ')));
    card.appendChild(el('h4', null, Q.compEv));
    (x.completionEvidenceIds || []).map((id) => (m.evidence || []).find((e) => e.id === id)).filter(Boolean)
      .forEach((e) => card.appendChild(evidenceCard(e, () => { x.completionEvidenceIds = x.completionEvidenceIds.filter((i) => i !== e.id); })));
    const addCE = el('button', 'mini', Q.addCompEv); addCE.type = 'button';
    addCE.addEventListener('click', () => mut((model) => { const e = addEvidence(model, 'OBSERVED'); (x.completionEvidenceIds = x.completionEvidenceIds || []).push(e.id); }, true));
    card.appendChild(addCE);
    x.verification = x.verification || { by: '', at: '', note: '' };
    card.appendChild(field(Q.verBy, text(x.verification.by, (v) => mut(() => { x.verification.by = v; }))));
    card.appendChild(dateField(L, Q.verAt, x.verification.at, (v) => mut(() => { x.verification.at = v; })));
    card.appendChild(field(Q.verNote, text(x.verification.note, (v) => mut(() => { x.verification.note = v; }), { area: true })));
    const del = el('button', 'mini danger', Q.del); del.type = 'button';
    del.addEventListener('click', () => {
      const drop = (model) => removeAction(model, x.id);
      if (!ctx.confirmDelete || ctx.confirmDelete(drop, { ask: false })) mut(drop, true);   // only asks when a cross-model link points at the action
    });
    card.appendChild(del);
    box.appendChild(card);
  });
  const addX = el('button', null, Q.addAct); addX.type = 'button';
  addX.addEventListener('click', () => mut((model) => { addAction(model, c.id, ''); }, true));
  box.appendChild(addX);

  host.appendChild(box);
}
