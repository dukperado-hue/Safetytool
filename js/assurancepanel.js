// Safetytool — inspector section for a control: state, assurance data, and the evidence / assumptions behind it.
// Writes through mutate() so everything is saved, undoable and exported. Never invents a source or a date.

import { addEvidence, addAssumption, EVIDENCE_KINDS, CONFIDENCE, isIsoDate } from './evidence.js';

const S = {
  th: {
    head: 'สถานะและหลักฐานของ Barrier', status: 'สถานะ', logic: 'ถ้าเสื่อม ยังตัดเส้นทางได้ไหม', pickLogic: '— ยังไม่ระบุ —',
    st: { '': 'ไม่ทราบ (unknown)', effective: 'ทำงาน (effective)', degraded: 'เสื่อม (degraded)', failed: 'ล้มเหลว (failed)' },
    lg: { blocks: 'ยังตัดได้ (blocks)', fails: 'ถือว่าล้มเหลว (fails)' },
    std: 'มาตรฐานสมรรถนะ (performance standard)', ver: 'วิธีตรวจสอบ', last: 'ตรวจล่าสุด (YYYY-MM-DD)', next: 'ทบทวนครั้งถัดไป (YYYY-MM-DD)', badDate: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD',
    ev: 'หลักฐาน', as: 'สมมติฐาน', addEv: '+ เพิ่มหลักฐาน', addAs: '+ เพิ่มสมมติฐาน', none: '(ยังไม่มี)', remove: 'เลิกผูก',
    kind: { OBSERVED: 'OBSERVED — สังเกตได้ (ต้องมีแหล่งที่มา)', ASSESSED: 'ASSESSED — ผู้วิเคราะห์ประเมิน', HYPOTHESISED: 'HYPOTHESISED — ยังต้องตรวจสอบ' },
    source: 'แหล่งที่มา', ref: 'เอกสารอ้างอิง', date: 'วันที่ (YYYY-MM-DD)', limit: 'ข้อจำกัด', conf: 'ความเชื่อมั่น', stmt: 'ข้อความสมมติฐาน', how: 'จะตรวจสอบได้อย่างไร', owner: 'ผู้เสนอ',
    note: 'โปรแกรมไม่สร้างแหล่งที่มาให้ ใส่เฉพาะที่มีจริง', conf3: { '': '—', low: 'ต่ำ', medium: 'กลาง', high: 'สูง' },
  },
  en: {
    head: 'Barrier state and evidence', status: 'State', logic: 'If degraded, does it still cut the path?', pickLogic: '— not specified —',
    st: { '': 'unknown', effective: 'effective', degraded: 'degraded', failed: 'failed' },
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
  const mut = (fn, rebuild = false) => ctx.mutate(fn, { rebuild });
  const box = el('section', 'assure');
  box.appendChild(el('h3', null, L.head));
  box.appendChild(el('p', 'muted', L.note));

  box.appendChild(field(L.status, select(Object.entries(L.st), c.status || '', (v) => mut(() => { c.status = v || null; if (v !== 'degraded') c.degradedLogic = null; }, true))));
  if (c.status === 'degraded') {
    box.appendChild(field(L.logic, select([['', L.pickLogic], ['blocks', L.lg.blocks], ['fails', L.lg.fails]], c.degradedLogic || '', (v) => mut(() => { c.degradedLogic = v || null; }))));
  }
  const a = () => (c.assurance = c.assurance || {});
  box.appendChild(field(L.std, text(c.assurance && c.assurance.performanceStandard, (v) => mut(() => { a().performanceStandard = v; }), { area: true })));
  box.appendChild(field(L.ver, text(c.assurance && c.assurance.verification, (v) => mut(() => { a().verification = v; }), { area: true })));
  box.appendChild(dateField(L, L.last, c.assurance && c.assurance.lastVerified, (v) => mut(() => { a().lastVerified = v; })));
  box.appendChild(dateField(L, L.next, c.assurance && c.assurance.nextReview, (v) => mut(() => { a().nextReview = v; })));

  // --- evidence ---
  box.appendChild(el('h3', null, L.ev));
  const evs = (c.evidenceIds || []).map((id) => (m.evidence || []).find((e) => e.id === id)).filter(Boolean);
  if (!evs.length) box.appendChild(el('p', 'muted', L.none));
  evs.forEach((e) => {
    const card = el('div', 'fcard');
    card.appendChild(el('code', null, e.id));
    card.appendChild(field(L.source, text(e.source, (v) => mut(() => { e.source = v; }))));
    card.appendChild(field('', select(EVIDENCE_KINDS.map((k) => [k, L.kind[k]]), e.kind, (v) => mut(() => { e.kind = v; }))));
    card.appendChild(field(L.ref, text(e.reference, (v) => mut(() => { e.reference = v; }))));
    card.appendChild(dateField(L, L.date, e.date, (v) => mut(() => { e.date = v; })));
    card.appendChild(field(L.limit, text(e.limitation, (v) => mut(() => { e.limitation = v; }), { area: true })));
    card.appendChild(field(L.conf, select(['', ...CONFIDENCE].map((k) => [k, L.conf3[k]]), e.confidence || '', (v) => mut(() => { e.confidence = v || null; }))));
    const un = el('button', 'mini', L.remove); un.type = 'button';
    un.addEventListener('click', () => mut(() => { c.evidenceIds = c.evidenceIds.filter((x) => x !== e.id); }, true));
    card.appendChild(un);
    box.appendChild(card);
  });
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

  host.appendChild(box);
}
