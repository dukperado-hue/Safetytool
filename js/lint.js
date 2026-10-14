// Safetytool — bowtie quality checks. Pure functions, no DOM.
// Rules come from public bowtie guidance (UK CAA "Bowtie elements" pages, SKYbrary, Aviatize, ASMS-Pro, Wikipedia)
// re-expressed as our own heuristics. They are prompts for human judgement, not verdicts.

import { controlsOf } from './model.js';

const NEG_ANY = /(\b(not|no|non|never|fail(s|ed|ure)?|lack(s|ed)?|without|unable)\b|ไม่|ขาด|ล้มเหลว|บกพร่อง)/i;
const FAIL_WORDS = /(fail(s|ed|ure)?|malfunction|ล้มเหลว|ขัดข้อง|ไม่ทำงาน|เสีย(หาย)?\b)/i;
const NOTHING = /^(no (effect|impact|consequence)|nothing( happens)?|none|ไม่มีผล(กระทบ)?|ไม่เกิดอะไร)/i;
const HAZ_LOOKS_LIKE_EVENT = /(loss of|failure|collision|excursion|incursion|crash|ล้มเหลว|ชน|ออกนอกทาง)/i;

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(/[\s,.;:()/-]+/).filter(Boolean);

/** Rough "is this text too thin to stand alone" test that works for Thai (no spaces) and Latin text. */
export function isVague(text) {
  const t = (text || '').trim();
  if (!t) return true;
  const hasThai = /[฀-๿]/.test(t);
  return hasThai ? t.length < 12 : words(t).length < 3;
}

function overlap(a, b) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let n = 0;
  A.forEach((w) => { if (B.has(w)) n += 1; });
  return n / Math.min(A.size, B.size);
}

export const RULES = {
  L001: { sev: 'error', th: 'ยังไม่ได้ระบุ Hazard', en: 'Hazard is empty' },
  L002: { sev: 'error', th: 'ยังไม่ได้ระบุ Top event', en: 'Top event is empty' },
  L003: { sev: 'warn', th: 'Threat นี้ไม่มี preventive control', en: 'Threat has no preventive control' },
  L004: { sev: 'warn', th: 'Consequence นี้ไม่มี recovery control', en: 'Consequence has no recovery control' },
  L005: { sev: 'info', th: 'ข้อความสั้น/กว้างเกินไป ควรเขียนเป็นประโยคเดียวที่บอกการกระทำหรือเหตุการณ์', en: 'Text is vague; write one sentence naming the action or event' },
  L006: { sev: 'warn', th: 'ข้อความซ้ำกับรายการอื่นในกลุ่มเดียวกัน', en: 'Duplicate of another item in the same group' },
  L007: { sev: 'warn', th: 'ดูเหมือนความล้มเหลวของ control ไม่ใช่ threat — ควรย้ายไปเป็น escalation factor หรือ control', en: 'Looks like a control failure, not a threat; consider an escalation factor' },
  L008: { sev: 'info', th: 'มี control เดียวบนเส้นทางนี้ (single point of failure)', en: 'Only one control on this path (single point of failure)' },
  L009: { sev: 'warn', th: 'Consequence แบบ “ไม่มีผล” ไม่ช่วยอะไร ให้ลบ', en: '"No effect" consequence adds nothing; remove it' },
  L010: { sev: 'warn', th: 'Control ที่สำคัญ (critical) ยังไม่มีผู้รับผิดชอบ', en: 'Critical control has no owner' },
  L011: { sev: 'info', th: 'ยังไม่ได้ประเมิน adequacy/reliability ของ control', en: 'Control is not rated yet' },
  L012: { sev: 'warn', th: 'Escalation factor เป็นแค่การปฏิเสธ control ให้ระบุเหตุผลที่ทำให้ control ด้อยลง', en: 'Escalation factor merely negates the control; state why it degrades' },
  L013: { sev: 'info', th: 'Control หนึ่งตัวมี escalation factor มากกว่า 3 รายการ ลองเลือกเฉพาะที่สำคัญจริง', en: 'More than 3 escalation factors on one control; keep only significant ones' },
  L014: { sev: 'info', th: 'แผนภาพใหญ่มาก (>120 องค์ประกอบ) ควรแตกเป็นหลาย bowtie ที่เชื่อมกัน', en: 'Very large diagram (>120 elements); split into linked bowties' },
  L015: { sev: 'info', th: 'Control ฝั่ง recovery มากกว่า preventive เกิน 2 เท่า — ระบบอาจพึ่งการแก้ปัญหาหลังเสียการควบคุม', en: 'Recovery controls outnumber preventive more than 2:1; check reliance on recovery' },
  L016: { sev: 'warn', th: 'Hazard เขียนเหมือนเหตุการณ์/ความล้มเหลว Hazard ควรเป็นสภาวะ วัตถุ หรือกิจกรรม', en: 'Hazard reads like an event; a hazard should be a condition, object or activity' },
  L017: { sev: 'info', th: 'Escalation factor ไม่มี control ควบคุม', en: 'Escalation factor has no control' },
};

/**
 * @returns {{rule:string, severity:'error'|'warn'|'info', targetId:string, th:string, en:string}[]}
 */
export function lint(m) {
  const out = [];
  const add = (rule, targetId) => out.push({ rule, severity: RULES[rule].sev, targetId, th: RULES[rule].th, en: RULES[rule].en });

  if (!m.hazard.text.trim()) add('L001', m.hazard.id);
  else if (HAZ_LOOKS_LIKE_EVENT.test(m.hazard.text)) add('L016', m.hazard.id);
  if (!m.topEvent.text.trim()) add('L002', m.topEvent.id);
  else if (isVague(m.topEvent.text)) add('L005', m.topEvent.id);

  const dupCheck = (items) => {
    const seen = new Map();
    items.forEach((it) => {
      const k = norm(it.text);
      if (!k) return;
      if (seen.has(k)) add('L006', it.id); else seen.set(k, it.id);
    });
  };
  dupCheck(m.threats);
  dupCheck(m.consequences);

  let prevCount = 0;
  let recCount = 0;

  m.threats.forEach((t) => {
    if (isVague(t.text)) add('L005', t.id);
    if (FAIL_WORDS.test(t.text) && /(control|barrier|system|alert|warning|ระบบ|เตือน|อุปกรณ์)/i.test(t.text)) add('L007', t.id);
    const cs = controlsOf(m, 'prevent', t.id);
    prevCount += cs.length;
    if (cs.length === 0) add('L003', t.id);
    else if (cs.length === 1) add('L008', t.id);
    dupCheck(cs);
  });

  m.consequences.forEach((c) => {
    if (isVague(c.text)) add('L005', c.id);
    if (NOTHING.test((c.text || '').trim())) add('L009', c.id);
    const cs = controlsOf(m, 'recover', c.id);
    recCount += cs.length;
    if (cs.length === 0) add('L004', c.id);
    else if (cs.length === 1) add('L008', c.id);
    dupCheck(cs);
  });

  m.controls.forEach((c) => {
    if (isVague(c.text)) add('L005', c.id);
    if (c.critical && !(c.owner || '').trim()) add('L010', c.id);
    if (!c.adequacy || !c.reliability) add('L011', c.id);
    const efs = m.escalations.filter((e) => e.controlId === c.id);
    if (efs.length > 3) add('L013', c.id);
    efs.forEach((e) => {
      if (NEG_ANY.test(e.text) && overlap(e.text, c.text) >= 0.6) add('L012', e.id);
      else if (isVague(e.text)) add('L005', e.id);
    });
  });

  m.escalations.forEach((e) => {
    if (!m.escalationControls.some((x) => x.escalationId === e.id)) add('L017', e.id);
  });

  const total = 2 + m.threats.length + m.consequences.length + m.controls.length + m.escalations.length + m.escalationControls.length;
  if (total > 120) add('L014', m.topEvent.id);
  if (prevCount > 0 && recCount > prevCount * 2) add('L015', m.topEvent.id);

  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function summarize(issues) {
  const s = { error: 0, warn: 0, info: 0 };
  issues.forEach((i) => { s[i.severity] += 1; });
  return s;
}
