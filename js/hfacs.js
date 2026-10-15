// Safetytool — HFACS classification of an occurrence (schema safetytool.hfacs/1). Pure: no DOM.
// Method source: Shappell, S.A. & Wiegmann, D.A. (2000) "The Human Factors Analysis and Classification System—HFACS",
// DOT/FAA/AM-00/7, FAA Office of Aviation Medicine (public report). It builds on J. Reason's latent/active failure model.
// This module follows that report's four levels and 17 categories. Names are the report's; the one-line
// definitions below are our own wording. Other HFACS editions use different category lists — if you need a
// specific edition, say so in the model's scope.
// HFACS classifies the human factors behind an occurrence. It is NOT a barrier model and gives no probabilities.

import { uid } from './model.js';
import { wrapText, textWidth } from './textmetrics.js';
import { normalizeGeom } from './swiss.js';

export const SCHEMA = 'safetytool.hfacs/1';
/** Top (most latent) to bottom (closest to the occurrence). Ids match the optional `hfacsLevel` of a Swiss hole. */
export const LEVELS = ['organisational-influences', 'unsafe-supervision', 'preconditions', 'unsafe-acts'];

export const LEVEL_INFO = {
  'organisational-influences': { n: 4, th: 'อิทธิพลระดับองค์กร', en: 'Organisational influences' },
  'unsafe-supervision': { n: 3, th: 'การกำกับดูแลที่ไม่ปลอดภัย', en: 'Unsafe supervision' },
  preconditions: { n: 2, th: 'เงื่อนไขก่อนเกิดการกระทำที่ไม่ปลอดภัย', en: 'Preconditions for unsafe acts' },
  'unsafe-acts': { n: 1, th: 'การกระทำที่ไม่ปลอดภัย', en: 'Unsafe acts' },
};

const C = (id, level, th, en, dth, den, group) => ({ id, level, group: group || null, th, en, def: { th: dth, en: den } });
export const CATEGORIES = [
  C('resource-management', 'organisational-influences', 'การบริหารทรัพยากร', 'Resource management',
    'การตัดสินใจระดับองค์กรเรื่องการจัดสรรและดูแลบุคลากร งบประมาณ และอุปกรณ์/สิ่งอำนวยความสะดวก', 'Corporate decisions on how people, money, equipment and facilities are allocated and maintained.'),
  C('organisational-climate', 'organisational-influences', 'บรรยากาศองค์กร', 'Organisational climate',
    'บรรยากาศการทำงาน: โครงสร้าง (สายบังคับบัญชา การมอบอำนาจ การสื่อสาร ความรับผิดชอบ) นโยบาย และวัฒนธรรม', 'The working atmosphere: structure (chain of command, delegation, communication, accountability), policies and culture.'),
  C('operational-process', 'organisational-influences', 'กระบวนการปฏิบัติการ', 'Operational process',
    'กฎและการตัดสินใจที่กำกับงานประจำวัน เช่น ขั้นตอนมาตรฐาน จังหวะงาน แรงกดดันด้านเวลา ตารางงาน แรงจูงใจ และการตรวจสอบถ่วงดุล', 'Rules and decisions that govern everyday work: procedures, tempo, time pressure, schedules, incentives and oversight.'),
  C('inadequate-supervision', 'unsafe-supervision', 'การกำกับดูแลไม่เพียงพอ', 'Inadequate supervision',
    'ผู้กำกับดูแลไม่ได้ให้แนวทาง โอกาสฝึกอบรม ภาวะผู้นำ หรือการติดตามที่จำเป็นเพื่อให้ผู้ปฏิบัติทำงานสำเร็จ', 'The supervisor did not provide the guidance, training opportunity, leadership or oversight people need to succeed.'),
  C('planned-inappropriate-operations', 'unsafe-supervision', 'การวางแผนปฏิบัติการที่ไม่เหมาะสม', 'Planned inappropriate operations',
    'ตารางบิน จังหวะงาน หรือการจับคู่ลูกเรือที่ทำให้คนเสี่ยงเกินควรในการปฏิบัติปกติ', 'Scheduling, tempo or crew pairing that puts people at unacceptable risk during normal operations.'),
  C('failed-to-correct-known-problem', 'unsafe-supervision', 'ไม่แก้ปัญหาที่ทราบอยู่แล้ว', 'Failed to correct a known problem',
    'ผู้กำกับดูแลทราบข้อบกพร่องของคน อุปกรณ์ หรือการฝึก แต่ปล่อยให้เป็นต่อไป', 'Deficiencies in people, equipment or training were known to the supervisor but allowed to continue.'),
  C('supervisory-violations', 'unsafe-supervision', 'ผู้กำกับดูแลฝ่าฝืนกฎ', 'Supervisory violations',
    'ผู้กำกับดูแลจงใจละเลยกฎหรือระเบียบ เช่น อนุญาตให้ปฏิบัติงานโดยไม่มีคุณสมบัติหรือใบอนุญาตปัจจุบัน', 'Rules or regulations wilfully disregarded by a supervisor, e.g. allowing work without current qualification.'),
  C('adverse-mental-states', 'preconditions', 'สภาวะจิตใจไม่เหมาะสม', 'Adverse mental states',
    'สภาวะจิตใจที่ลดประสิทธิภาพ เช่น เสียความตระหนักรู้สถานการณ์ จดจ่อเกินไป วอกแวก เหนื่อยล้าทางสมอง ประมาท มั่นใจเกินไป', 'Mental conditions that degrade performance: lost situational awareness, task fixation, distraction, mental fatigue, complacency, overconfidence.', 'conditions'),
  C('adverse-physiological-states', 'preconditions', 'สภาวะร่างกายไม่เหมาะสม', 'Adverse physiological states',
    'สภาวะทางการแพทย์หรือสรีรวิทยาที่ขัดขวางการปฏิบัติงานอย่างปลอดภัย เช่น เจ็บป่วย ยา เหนื่อยล้าทางกาย สับสนทิศทาง ภาพลวงตา', 'Medical or physiological conditions that preclude safe operation: illness, medication, physical fatigue, spatial disorientation, illusions.', 'conditions'),
  C('physical-mental-limitations', 'preconditions', 'ข้อจำกัดทางกายภาพ/จิตใจ', 'Physical / mental limitations',
    'ข้อเรียกร้องของงานเกินความสามารถของบุคคล เช่น ข้อจำกัดของการมองเห็น เวลาตอบสนอง หรือความเหมาะสมทางกายและความถนัด', 'Task demands exceed what the individual can do: sensory limits, reaction time, physical fit or aptitude.', 'conditions'),
  C('crew-resource-mismanagement', 'preconditions', 'การจัดการทรัพยากรลูกเรือบกพร่อง', 'Crew resource mismanagement',
    'การประสานงานไม่ดีภายในลูกเรือและกับ ATC งานซ่อมบำรุง และเจ้าหน้าที่สนับสนุน รวมถึงการบรีฟและดีบรีฟ', 'Poor coordination within the crew and with ATC, maintenance and support staff, including briefing and debriefing.', 'practices'),
  C('personal-readiness', 'preconditions', 'ความพร้อมส่วนบุคคล', 'Personal readiness',
    'ผู้ปฏิบัติไม่เตรียมร่างกายหรือจิตใจให้พร้อมก่อนปฏิบัติหน้าที่ เช่น ฝ่าฝืนกฎการพัก หรือใช้ยาเอง', 'Individuals failed to prepare physically or mentally for duty, e.g. breaking rest rules or self-medicating.', 'practices'),
  C('skill-based-errors', 'unsafe-acts', 'ข้อผิดพลาดด้านทักษะ', 'Skill-based errors',
    'ความล้มเหลวด้านความสนใจ ความจำ หรือเทคนิคในการกระทำที่ทำจนชำนาญโดยไม่ต้องคิดมาก เช่น ข้ามขั้นตอน เสียการกวาดสายตา', 'Attention, memory or technique failures in highly practised actions, e.g. an omitted step or a broken visual scan.', 'errors'),
  C('decision-errors', 'unsafe-acts', 'ข้อผิดพลาดในการตัดสินใจ', 'Decision errors',
    'ทำตามแผนที่ตั้งใจ แต่แผนไม่เหมาะกับสถานการณ์ (ใช้ขั้นตอนผิด เลือกทางเลือกไม่ดี หรือแก้ปัญหาไม่ถูก)', 'Behaviour proceeds as intended but the plan is inadequate for the situation (wrong procedure, poor choice, faulty problem solving).', 'errors'),
  C('perceptual-errors', 'unsafe-acts', 'ข้อผิดพลาดด้านการรับรู้', 'Perceptual errors',
    'การตอบสนองที่ผิดต่อข้อมูลประสาทสัมผัสที่ผิดปกติหรือเสื่อมคุณภาพ เช่น ภาพลวงตา สับสนทิศทาง ประเมินระยะ/ความสูงผิด (จัดที่การตอบสนอง ไม่ใช่ตัวภาพลวงตาเอง)', 'The erroneous response to degraded or unusual sensory input (illusion, disorientation, misjudged distance); the response is classified, not the illusion itself.', 'errors'),
  C('routine-violations', 'unsafe-acts', 'การฝ่าฝืนเป็นปกติวิสัย', 'Routine violations',
    'การละเมิดกฎที่ทำเป็นนิสัยและมักถูกปล่อยผ่านโดยผู้มีอำนาจ ถ้าพบ ให้ดูต่อว่าใครในสายบังคับบัญชาไม่บังคับใช้กฎ', 'Habitual breaches of rules that authority tends to tolerate; if found, look up the chain for who is not enforcing the rule.', 'violations'),
  C('exceptional-violations', 'unsafe-acts', 'การฝ่าฝืนเป็นกรณีพิเศษ', 'Exceptional violations',
    'การละเมิดเป็นครั้งคราวที่ไม่ใช่พฤติกรรมปกติของบุคคลและผู้บริหารไม่ได้ยอมรับ', 'Isolated departures from authority that are neither typical of the individual nor condoned by management.', 'violations'),
];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || null;
export const categoriesOf = (level) => CATEGORIES.filter((c) => c.level === level);
const VIOLATIONS = ['routine-violations', 'exceptional-violations', 'supervisory-violations'];

export function emptyHfacs() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    event: { id: uid('ev'), text: '' }, // the occurrence being classified
    factors: [],
  };
}

export function addFactor(m, category = null, text = '') {
  const f = { id: uid('hf'), text, category, evidence: '', influences: [], notes: '' };
  m.factors.push(f);
  return f;
}

export function removeFactor(m, id) {
  m.factors = m.factors.filter((f) => f.id !== id);
  m.factors.forEach((f) => { f.influences = f.influences.filter((x) => x !== id); });
}

export const levelOf = (m, f) => { const c = f && catOf(f.category); return c ? c.level : null; };
const rank = (lv) => LEVELS.indexOf(lv); // 0 = most latent
export const rankOf = (m, f) => rank(levelOf(m, f));

/** Drop influences that no longer run from a higher level to a lower one (after a factor was re-classified). */
export function pruneInfluences(m) {
  m.factors.forEach((f) => {
    f.influences = f.influences.filter((id) => { const g = m.factors.find((x) => x.id === id); const a = rankOf(m, f); const b = g ? rankOf(m, g) : -1; return a >= 0 && b >= 0 && a < b; });
  });
}

/** Record that factor `fromId` contributed to factor `toId`. Only top-down (a higher level to a lower one) is accepted. */
export function link(m, fromId, toId) {
  const a = m.factors.find((f) => f.id === fromId);
  const b = m.factors.find((f) => f.id === toId);
  if (!a || !b || a === b) return false;
  const ra = rank(levelOf(m, a)); const rb = rank(levelOf(m, b));
  if (ra < 0 || rb < 0 || ra >= rb) return false;
  if (!a.influences.includes(toId)) a.influences.push(toId);
  return true;
}
export function unlink(m, fromId, toId) {
  const a = m.factors.find((f) => f.id === fromId);
  if (a) a.influences = a.influences.filter((x) => x !== toId);
}

export function findHfacs(m, id) {
  if (m.event.id === id) return { kind: 'hfEvent', ref: m.event };
  const f = m.factors.find((x) => x.id === id);
  if (f) return { kind: 'hfFactor', ref: f };
  return null;
}

export function validateHfacs(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  if (!m.event || typeof m.event.id !== 'string') errs.push('event missing');
  if (!Array.isArray(m.factors)) { errs.push('factors must be an array'); return errs; }
  const ids = new Set();
  if (m.event) ids.add(m.event.id);
  m.factors.forEach((f) => {
    if (!f || typeof f.id !== 'string') { errs.push('factor without id'); return; }
    if (ids.has(f.id)) errs.push('duplicate id: ' + f.id);
    ids.add(f.id);
    if (f.category != null && !CATEGORY_IDS.includes(f.category)) errs.push('factor ' + f.id + ': unknown category ' + String(f.category));
    if (f.influences !== undefined && !Array.isArray(f.influences)) errs.push('factor ' + f.id + ': influences must be an array');
  });
  m.factors.forEach((f) => {
    (Array.isArray(f.influences) ? f.influences : []).forEach((x) => {
      const t = m.factors.find((y) => y.id === x);
      if (!t) { errs.push('factor ' + f.id + ': influences unknown factor ' + x); return; }
      if (t === f) { errs.push('factor ' + f.id + ': influences itself'); return; }
      const ra = rank(levelOf(m, f)); const rb = rank(levelOf(m, t));
      if (ra >= 0 && rb >= 0 && ra >= rb) errs.push('factor ' + f.id + ': an influence must run from a higher level to a lower one (' + x + ')');
    });
  });
  return errs;
}

export function normalizeHfacs(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.event.text = m.event.text || '';
  m.factors.forEach((f) => {
    f.text = f.text || ''; f.evidence = f.evidence || ''; f.notes = f.notes || '';
    if (f.category === undefined) f.category = null;
    if (!Array.isArray(f.influences)) f.influences = [];
  });
  return m;
}

const vague = (s) => {
  const t = (s || '').trim();
  if (!t) return true;
  return /[฀-๿]/.test(t) ? t.length < 10 : t.split(/\s+/).length < 3;
};

export const HFACS_RULES = {
  F001: { sev: 'error', th: 'ยังไม่ได้ระบุเหตุการณ์ที่วิเคราะห์', en: 'The occurrence being classified is empty' },
  F002: { sev: 'info', th: 'ยังไม่มีปัจจัย (factor) ใด ๆ', en: 'No factors written yet' },
  F003: { sev: 'info', th: 'ปัจจัยนี้ยังไม่ได้จัดหมวด HFACS', en: 'Factor is not classified yet' },
  F004: { sev: 'warn', th: 'ข้อความสั้น/กว้างเกินไป', en: 'Text is vague' },
  F005: { sev: 'warn', th: 'จัดหมวดไว้เฉพาะ Unsafe acts — ยังไม่ได้พิจารณาเงื่อนไขแฝงในระดับที่สูงกว่า (ถามต่อว่าทำไมจึงเกิดการกระทำนี้)', en: 'Only unsafe acts are classified — no condition above the act was considered (keep asking why)' },
  F006: { sev: 'info', th: 'ระดับนี้ยังไม่มีปัจจัย — ยังไม่ได้ตรวจ หรือตรวจแล้วไม่พบ? (ไม่ทราบ)', en: 'No factor at this level — not examined, or examined and none found? (unknown)' },
  F007: { sev: 'info', th: 'ยังไม่ได้ระบุหลักฐานที่สนับสนุนการจัดหมวดนี้', en: 'No evidence recorded for this classification' },
  F008: { sev: 'warn', th: 'จัดเป็นการฝ่าฝืน (violation) ซึ่งหมายถึงการจงใจละเลยกฎ แต่ยังไม่มีหลักฐาน', en: 'Classified as a violation (wilful disregard of a rule) but no evidence is recorded' },
  F009: { sev: 'warn', th: 'ข้อความซ้ำกับปัจจัยอื่น', en: 'Duplicate text' },
  F010: { sev: 'info', th: 'การกระทำที่ไม่ปลอดภัยนี้ยังไม่มีปัจจัยระดับสูงกว่าที่ผูกไว้', en: 'No higher-level factor is linked to this unsafe act' },
};

export function lintHfacs(m) {
  const out = [];
  const add = (rule, targetId) => out.push({ rule, severity: HFACS_RULES[rule].sev, targetId, th: HFACS_RULES[rule].th, en: HFACS_RULES[rule].en });
  const n = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!m.event.text.trim()) add('F001', m.event.id); else if (vague(m.event.text)) add('F004', m.event.id);
  if (!m.factors.length) { add('F002', m.event.id); return out; }
  const seen = new Set();
  const incoming = new Set(m.factors.flatMap((f) => f.influences));
  m.factors.forEach((f) => {
    if (vague(f.text)) add('F004', f.id);
    const k = n(f.text);
    if (k) { if (seen.has(k)) add('F009', f.id); else seen.add(k); }
    if (!f.category) { add('F003', f.id); return; }
    if (!f.evidence.trim()) add(VIOLATIONS.includes(f.category) ? 'F008' : 'F007', f.id);
    if (levelOf(m, f) === 'unsafe-acts' && !incoming.has(f.id) && m.factors.some((g) => g !== f && levelOf(m, g) && levelOf(m, g) !== 'unsafe-acts')) add('F010', f.id);
  });
  const classified = m.factors.filter((f) => f.category);
  if (classified.length && classified.every((f) => levelOf(m, f) === 'unsafe-acts')) add('F005', m.event.id);
  if (classified.length) LEVELS.forEach((lv) => { if (!classified.some((f) => levelOf(m, f) === lv)) add('F006', 'lvl_' + lv); });
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Counts per level and category (a distribution of what the analyst wrote — not a measure of risk). */
export function analyzeHfacs(m) {
  const cat = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0]));
  const lvl = Object.fromEntries(LEVELS.map((id) => [id, 0]));
  let unclassified = 0;
  m.factors.forEach((f) => {
    if (!f.category) { unclassified += 1; return; }
    cat[f.category] += 1; lvl[levelOf(m, f)] += 1;
  });
  const links = m.factors.reduce((s, f) => s + f.influences.length, 0);
  return { total: m.factors.length, byCategory: cat, byLevel: lvl, unclassified, links, levelsWithNothing: LEVELS.filter((l) => !lvl[l]) };
}

/** Display code HF-01 … in list order (derived, never stored). */
export const factorCodes = (m) => Object.fromEntries(m.factors.map((f, i) => [f.id, 'HF-' + String(i + 1).padStart(2, '0')]));

// ---------------- layout ----------------
export const HF = { fs: 12, lh: 15, labelW: 150, cellW5: 214, gap: 10, padX: 10, headH: 34, cardPad: 8, cardGap: 8, bandGap: 14, evH: 64, minCell: 68 };

/**
 * Four horizontal bands (organisation at the top, unsafe acts at the bottom) with one cell per category; each factor is a
 * card in its category's cell. Influences are drawn as elbow lines from a higher card to a lower one. The occurrence sits underneath.
 */
export function layoutHfacs(m, opts = {}) {
  const D = HF;
  const lang = opts.lang === 'en' ? 'en' : 'th';
  const codes = factorCodes(m);
  const totalW = 5 * D.cellW5 + 4 * D.gap;
  const width = D.labelW + D.gap + totalW;
  const items = [];
  const pos = {};
  let y = 0;

  const cardH = (f, w) => {
    const lines = wrapText(f.text || '—', w - 2 * D.cardPad, D.fs);
    return { lines, h: 20 + lines.length * D.lh + D.cardPad };
  };

  const bandOf = (lv) => {
    const cats = categoriesOf(lv);
    const cellW = (totalW - (cats.length - 1) * D.gap) / cats.length;
    const cells = cats.map((c) => {
      const fs = m.factors.filter((f) => f.category === c.id).map((f) => ({ f, ...cardH(f, cellW - 2 * D.cardPad) }));
      const inner = fs.reduce((s, x) => s + x.h + D.cardGap, 0);
      return { c, fs, h: Math.max(D.minCell, D.headH + (inner || 22) + D.cardPad - D.cardGap) };
    });
    return { lv, cells, cellW, h: Math.max(...cells.map((x) => x.h)) };
  };

  const bands = LEVELS.map(bandOf);
  const unc = m.factors.filter((f) => !f.category);
  bands.forEach((b) => {
    const info = LEVEL_INFO[b.lv];
    const lp = [
      { t: 'text', x: D.padX, y: 22, s: 'LEVEL ' + info.n, cls: 'ttl' },
      ...wrapText(info[lang], D.labelW - 2 * D.padX, D.fs).map((s, i) => ({ t: 'text', x: D.padX, y: 42 + i * D.lh, s, cls: 'nm' })),
    ];
    items.push({ id: 'lvl_' + b.lv, kind: 'hfLevel', status: 'L' + info.n, inert: true, shape: 'card', x: 0, y, w: D.labelW, h: b.h, lines: [], prims: lp });
    let x = D.labelW + D.gap;
    b.cells.forEach((cell) => {
      const cp = [
        { t: 'text', x: D.padX, y: 21, s: cell.c[lang], cls: 'nm' },
      ];
      const cnt = cell.fs.length;
      cp.push({ t: 'text', x: b.cellW - D.padX, y: 21, s: String(cnt), cls: 'tag mono', anchor: 'end' });
      if (!cnt) cp.push({ t: 'text', x: D.padX, y: D.headH + 16, s: '—', cls: 'tag' });
      items.push({ id: 'cat_' + cell.c.id, kind: 'hfCell', status: 'L' + info.n, inert: true, shape: 'card', x, y, w: b.cellW, h: b.h, lines: [], prims: cp, tip: cell.c.def[lang] });
      let cy = y + D.headH;
      cell.fs.forEach(({ f, lines, h }) => {
        const w = b.cellW - 2 * D.cardPad;
        const ev = f.evidence.trim();
        const p = [
          { t: 'text', x: D.padX - 2, y: 14, s: codes[f.id], cls: 'code' },
          { t: 'text', x: w - D.padX + 2, y: 14, s: ev ? '◆ evidence' : '◇ no evidence', cls: 'tag', anchor: 'end' },
          ...lines.map((s, i) => ({ t: 'text', x: D.padX - 2, y: 20 + D.lh * 0.78 + i * D.lh, s })),
        ];
        const it = { id: f.id, kind: VIOLATIONS.includes(f.category) ? 'hfViolation' : 'hfFactor', shape: 'card', x: x + D.cardPad, y: cy, w, h, lines: [], prims: p, bandBottom: y + b.h };
        items.push(it);
        pos[f.id] = it;
        cy += h + D.cardGap;
      });
      x += b.cellW + D.gap;
    });
    b.y = y;
    y += b.h + D.bandGap;
  });

  if (unc.length) {
    const fw = D.cellW5 - 2 * D.cardPad;
    const rows = unc.map((f) => ({ f, ...cardH(f, fw + 2 * D.cardPad) }));
    const perRow = 5;
    let x = D.labelW + D.gap; let ry = y + D.headH; let rowH = 0; let col = 0; let maxY = ry;
    rows.forEach(({ f, lines, h }) => {
      if (col === perRow) { col = 0; x = D.labelW + D.gap; ry += rowH + D.cardGap; rowH = 0; }
      const p = [{ t: 'text', x: D.padX - 2, y: 14, s: codes[f.id], cls: 'code' }, { t: 'text', x: fw - D.padX + 2, y: 14, s: '? unclassified', cls: 'tag', anchor: 'end' },
        ...lines.map((s, i) => ({ t: 'text', x: D.padX - 2, y: 20 + D.lh * 0.78 + i * D.lh, s }))];
      const it = { id: f.id, kind: 'hfFactor', shape: 'card', x, y: ry, w: fw, h, lines: [], prims: p };
      items.push(it);
      pos[f.id] = it;
      rowH = Math.max(rowH, h); maxY = Math.max(maxY, ry + h); x += D.cellW5 + D.gap; col += 1;
    });
    items.push({ id: 'cat_unclassified', kind: 'hfCell', status: 'L0', inert: true, shape: 'card', x: D.labelW + D.gap, y, w: totalW, h: maxY - y + D.cardPad, lines: [], prims: [{ t: 'text', x: D.padX, y: 21, s: lang === 'th' ? 'ยังไม่ได้จัดหมวด' : 'UNCLASSIFIED', cls: 'nm' }] });
    // the cell is pushed after its cards; move it behind them
    items.unshift(items.pop());
    y = maxY + D.cardPad + D.bandGap;
  }

  const cx = D.labelW + D.gap + totalW / 2;
  const evW = 420;
  const evLines = wrapText(m.event.text || '—', evW - 2 * D.padX, D.fs);
  const evH = Math.max(D.evH, 34 + evLines.length * D.lh + 12);
  const ev = { id: m.event.id, kind: 'hfEvent', shape: 'card', x: cx - evW / 2, y: y + 6, w: evW, h: evH, lines: [],
    prims: [{ t: 'text', x: evW / 2, y: 20, s: lang === 'th' ? 'เหตุการณ์ที่วิเคราะห์ / OCCURRENCE' : 'OCCURRENCE', cls: 'ttl', anchor: 'middle' }, ...evLines.map((s, i) => ({ t: 'text', x: evW / 2, y: 38 + i * D.lh, s, cls: 'nm', anchor: 'middle' }))] };
  items.push(ev);

  // influence lines: from the bottom of the higher card to the top of the lower one
  const links = [];
  let k = 0;
  m.factors.forEach((f) => f.influences.forEach((t) => {
    const a = pos[f.id]; const b = pos[t];
    if (!a || !b) return;
    const x1 = a.x + a.w / 2 + ((k % 3) - 1) * 10; const x2 = b.x + b.w / 2 + ((k % 3) - 1) * 10;
    const y1 = a.y + a.h; const y2 = b.y;
    const ym = (a.bandBottom != null ? a.bandBottom : y1) + D.bandGap / 2 + ((k % 3) - 1) * 3; // the horizontal jog runs in the gap under the source band
    links.push({ kind: 'infl', d: `M${Math.round(x1)},${Math.round(y1)} V${Math.round(ym)} H${Math.round(x2)} V${Math.round(y2)}` });
    k += 1;
  }));
  // a quiet line from the lowest band to the occurrence
  links.push({ kind: 'path', d: `M${Math.round(cx)},${Math.round(y - D.bandGap)} V${Math.round(ev.y)}` });
  return normalizeGeom({ items, links, width, height: ev.y + evH });
}

export function outlineHfacs(m) {
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  out.push(`OCCURRENCE: ${m.event.text}`, '');
  const codes = factorCodes(m);
  LEVELS.forEach((lv) => {
    out.push(`LEVEL ${LEVEL_INFO[lv].n} — ${LEVEL_INFO[lv].en}`);
    categoriesOf(lv).forEach((c) => {
      const fs = m.factors.filter((f) => f.category === c.id);
      if (!fs.length) return;
      out.push(`  ${c.en}`);
      fs.forEach((f) => {
        out.push(`    ${codes[f.id]} ${f.text}`);
        out.push(`        evidence: ${f.evidence || '(none recorded)'}`);
        if (f.influences.length) out.push(`        contributed to: ${f.influences.map((x) => codes[x] || x).join(', ')}`);
      });
    });
  });
  const unc = m.factors.filter((f) => !f.category);
  if (unc.length) { out.push('UNCLASSIFIED'); unc.forEach((f) => out.push(`    ${codes[f.id]} ${f.text}`)); }
  void textWidth;
  return out.join('\n');
}
