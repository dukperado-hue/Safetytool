// Safetytool — FRAM functional model (schema safetytool.fram/1). Pure: no DOM.
//
// FRAM (Functional Resonance Analysis Method, E. Hollnagel) describes work as a network of FUNCTIONS. Each function is
// characterised by six aspects — Input, Output, Preconditions, Resources, Control, Time — and functions are COUPLED when
// the output of one is an input, precondition, resource, control or time aspect of another.
// Sources: E. Hollnagel (2012) "FRAM: The Functional Resonance Analysis Method" (Ashgate); the FRAM Handbook and glossary on
// functionalresonance.com (accessed 2026-10-15). See docs/FRAM.md for what is and is not implemented.
//
// Scope of this module — deliberately limited:
//   * it records functions, aspects, couplings, variability DESCRIPTIONS and the evidence behind them;
//   * it does NOT compute variability scores, resonance, probabilities or any "risk" number;
//   * missing information stays "unknown" (never read as "safe").

import { uid } from './model.js';
import { wrapText, textWidth } from './textmetrics.js';
import { normalizeGeom } from './swiss.js';
import { checkEvidence } from './evidence.js';

export const SCHEMA = 'safetytool.fram/1';
export const ASPECTS = ['input', 'output', 'precondition', 'resource', 'control', 'time'];
export const ASPECT_INFO = {
  input: { letter: 'I', th: 'Input (อินพุต)', en: 'Input', def: { th: 'สิ่งที่ฟังก์ชันใช้หรือแปลง และสิ่งที่เริ่มฟังก์ชัน', en: 'What the function uses or transforms, and what starts it.' } },
  output: { letter: 'O', th: 'Output (ผลลัพธ์)', en: 'Output', def: { th: 'สิ่งที่ฟังก์ชันผลิตหรือเปลี่ยนแปลง', en: 'What the function produces or changes.' } },
  precondition: { letter: 'P', th: 'Precondition (เงื่อนไขก่อน)', en: 'Precondition', def: { th: 'เงื่อนไขที่ต้องเป็นจริงก่อนฟังก์ชันจะทำงานได้', en: 'Conditions that must hold before the function can be carried out.' } },
  resource: { letter: 'R', th: 'Resource (ทรัพยากร)', en: 'Resource', def: { th: 'สิ่งที่ถูกใช้หรือบริโภคขณะทำฟังก์ชัน (บุคลากร เครื่องมือ พลังงาน ข้อมูล)', en: 'What is needed or consumed while the function is carried out (staff, tools, energy, information).' } },
  control: { letter: 'C', th: 'Control (การควบคุม)', en: 'Control', def: { th: 'สิ่งที่กำกับหรือปรับฟังก์ชัน (ขั้นตอน กฎ แผน การตรวจสอบ)', en: 'What supervises or adjusts the function (procedures, rules, plans, monitoring).' } },
  time: { letter: 'T', th: 'Time (เวลา)', en: 'Time', def: { th: 'ข้อจำกัดด้านเวลา เช่น ต้องทำก่อน/หลัง/ภายในช่วงใด', en: 'Time constraints: before, after, within, or for how long.' } },
};
/** A coupling runs from an OUTPUT to one of these aspects of another function. */
export const TARGET_ASPECTS = ['input', 'precondition', 'resource', 'control', 'time'];
/** unknown = not assessed (the default) · described = items listed · none = the analyst states there is none. */
export const ASPECT_STATUS = ['unknown', 'described', 'none'];
export const VARIABILITY_STATE = ['observed', 'anticipated', 'unknown'];
/** Who produced an element: the analyst, a cited report, or a Safetytool transformation (a suggestion until reviewed). */
export const ORIGINS = ['analyst', 'reported', 'generated'];

const emptyAspects = () => Object.fromEntries(ASPECTS.map((a) => [a, { status: 'unknown', items: [] }]));

export function emptyFram() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    activity: { id: uid('ac'), text: '' }, // the activity or situation being modelled
    limitations: '',
    functions: [],
    couplings: [],
    evidence: [],
    assumptions: [],
  };
}

export function addFunction(m, name = '') {
  const f = { id: uid('fn'), name, description: '', context: '', aspects: emptyAspects(), variability: [], evidenceIds: [], assumptionIds: [], notes: '' };
  m.functions.push(f);
  return f;
}
export function addAspectItem(m, functionId, aspect, text = '', prov = null) {
  const f = m.functions.find((x) => x.id === functionId);
  if (!f) return null;
  const it = { id: uid('ai'), text };
  if (prov) it.prov = prov;
  f.aspects[aspect].items.push(it);
  if (f.aspects[aspect].status !== 'described') f.aspects[aspect].status = 'described';
  return it;
}
export function addVariability(m, functionId, text = '') {
  const f = m.functions.find((x) => x.id === functionId);
  if (!f) return null;
  const v = { id: uid('vr'), text, state: 'unknown', aspect: null, evidenceIds: [], assumptionIds: [], notes: '' };
  f.variability.push(v);
  return v;
}
export function addCoupling(m, from, to, text = '') {
  const c = { id: uid('cp'), from: { functionId: from.functionId, aspect: from.aspect || 'output' }, to: { functionId: to.functionId, aspect: to.aspect }, text, evidenceIds: [], assumptionIds: [], notes: '' };
  m.couplings.push(c);
  return c;
}
export function removeFramNode(m, id) {
  if (m.functions.some((f) => f.id === id)) {
    m.functions = m.functions.filter((f) => f.id !== id);
    m.couplings = m.couplings.filter((c) => c.from.functionId !== id && c.to.functionId !== id);
    return;
  }
  if (m.couplings.some((c) => c.id === id)) { m.couplings = m.couplings.filter((c) => c.id !== id); return; }
  for (const f of m.functions) {
    f.variability = f.variability.filter((v) => v.id !== id);
    for (const a of ASPECTS) f.aspects[a].items = f.aspects[a].items.filter((i) => i.id !== id);
  }
}

export function findFram(m, id) {
  if (m.activity.id === id) return { kind: 'framActivity', ref: m.activity };
  let r = m.functions.find((x) => x.id === id); if (r) return { kind: 'framFunction', ref: r };
  r = m.couplings.find((x) => x.id === id); if (r) return { kind: 'framCoupling', ref: r };
  return null;
}

/** Display codes FN-01 / CP-01 (derived from list order; never stored). */
export function framCodes(m) {
  const c = {};
  m.functions.forEach((f, i) => { c[f.id] = 'FN-' + String(i + 1).padStart(2, '0'); });
  m.couplings.forEach((x, i) => { c[x.id] = 'CP-' + String(i + 1).padStart(2, '0'); });
  return c;
}
export function couplingLabel(m, c) {
  const f = m.functions.find((x) => x.id === c.from.functionId); const t = m.functions.find((x) => x.id === c.to.functionId);
  return `${(f && f.name) || '?'} → ${(t && t.name) || '?'} (${ASPECT_INFO[c.to.aspect] ? ASPECT_INFO[c.to.aspect].en : c.to.aspect})`;
}

export function validateFram(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  if (!m.activity || typeof m.activity.id !== 'string') errs.push('activity missing');
  for (const k of ['functions', 'couplings']) if (!Array.isArray(m[k])) errs.push(k + ' must be an array');
  if (errs.length) return errs;
  const ids = new Set([m.activity.id]);
  const dup = (id) => { if (ids.has(id)) errs.push('duplicate id: ' + id); ids.add(id); };
  const holders = [];
  m.functions.forEach((f) => {
    if (!f || typeof f.id !== 'string') { errs.push('function without id'); return; }
    dup(f.id); holders.push(f);
    if (!f.aspects || typeof f.aspects !== 'object') { errs.push('function ' + f.id + ': aspects missing'); return; }
    ASPECTS.forEach((a) => {
      const x = f.aspects[a];
      if (!x || !Array.isArray(x.items)) { errs.push('function ' + f.id + ': aspect ' + a + ' is incomplete'); return; }
      if (!ASPECT_STATUS.includes(x.status)) errs.push('function ' + f.id + ': aspect ' + a + ': bad status ' + String(x.status));
      x.items.forEach((it) => {
        if (!it || typeof it.id !== 'string') errs.push('function ' + f.id + ': aspect item without id'); else dup(it.id);
        if (it && it.prov && !ORIGINS.includes(it.prov.origin)) errs.push('item ' + it.id + ': bad origin');
      });
    });
    Object.keys(f.aspects).filter((k) => !ASPECTS.includes(k)).forEach((k) => errs.push('function ' + f.id + ': unknown aspect ' + k));
    (f.variability || []).forEach((v) => {
      if (!v || typeof v.id !== 'string') { errs.push('variability without id'); return; }
      dup(v.id); holders.push(v);
      if (!VARIABILITY_STATE.includes(v.state)) errs.push('variability ' + v.id + ': bad state');
      if (v.aspect != null && !ASPECTS.includes(v.aspect)) errs.push('variability ' + v.id + ': bad aspect');
    });
  });
  m.couplings.forEach((c) => {
    if (!c || typeof c.id !== 'string') { errs.push('coupling without id'); return; }
    dup(c.id); holders.push(c);
    const f = c.from && m.functions.find((x) => x.id === c.from.functionId); const t = c.to && m.functions.find((x) => x.id === c.to.functionId);
    if (!f) errs.push('coupling ' + c.id + ': source function not found');
    if (!t) errs.push('coupling ' + c.id + ': target function not found');
    if (c.from && c.from.aspect !== 'output') errs.push('coupling ' + c.id + ': a coupling must start at an Output aspect');
    if (c.to && !TARGET_ASPECTS.includes(c.to.aspect)) errs.push('coupling ' + c.id + ': a coupling must end at Input, Precondition, Resource, Control or Time');
    if (c.prov && !ORIGINS.includes(c.prov.origin)) errs.push('coupling ' + c.id + ': bad origin');
  });
  const ev = checkEvidence(m, holders);
  errs.push(...ev.errors);
  return errs;
}

export function normalizeFram(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.activity.text = m.activity.text || '';
  m.limitations = m.limitations || '';
  if (!Array.isArray(m.evidence)) m.evidence = [];
  if (!Array.isArray(m.assumptions)) m.assumptions = [];
  m.functions.forEach((f) => {
    f.name = f.name || ''; f.description = f.description || ''; f.context = f.context || ''; f.notes = f.notes || '';
    if (!Array.isArray(f.evidenceIds)) f.evidenceIds = [];
    if (!Array.isArray(f.assumptionIds)) f.assumptionIds = [];
    if (!Array.isArray(f.variability)) f.variability = [];
    if (!f.aspects) f.aspects = emptyAspects();
    ASPECTS.forEach((a) => { if (!f.aspects[a]) f.aspects[a] = { status: 'unknown', items: [] }; f.aspects[a].items.forEach((it) => { it.text = it.text || ''; }); });
    f.variability.forEach((v) => { v.text = v.text || ''; v.notes = v.notes || ''; if (!Array.isArray(v.evidenceIds)) v.evidenceIds = []; if (!Array.isArray(v.assumptionIds)) v.assumptionIds = []; if (v.aspect === undefined) v.aspect = null; });
  });
  m.couplings.forEach((c) => { c.text = c.text || ''; c.notes = c.notes || ''; if (!Array.isArray(c.evidenceIds)) c.evidenceIds = []; if (!Array.isArray(c.assumptionIds)) c.assumptionIds = []; });
  return m;
}

// ---------------------------------------------------------------- lint
const vague = (s) => { const t = (s || '').trim(); if (!t) return true; return /[฀-๿]/.test(t) ? t.length < 6 : t.split(/\s+/).length < 2 && t.length < 6; };
const asp = (a, l) => ASPECT_INFO[a][l];

export const FRAM_RULES = {
  FR001: { sev: 'error', th: 'ยังไม่ได้ระบุกิจกรรม/สถานการณ์ที่สร้างโมเดล', en: 'The activity or situation being modelled is empty' },
  FR002: { sev: 'warn', th: 'ยังไม่มีฟังก์ชัน', en: 'No functions yet' },
  FR003: { sev: 'error', th: 'ฟังก์ชันนี้ยังไม่มีชื่อ', en: 'Function has no name' },
  FR004: { sev: 'info', th: 'aspect นี้ยังไม่ได้ประเมิน (unknown) — ไม่ได้แปลว่าไม่มี', en: 'Aspect not assessed (unknown) — this does not mean there is none' },
  FR005: { sev: 'warn', th: 'aspect ถูกตั้งเป็น described แต่ยังไม่มีรายการ', en: 'Aspect is marked described but has no items' },
  FR006: { sev: 'warn', th: 'aspect มีรายการแต่สถานะไม่ใช่ described', en: 'Aspect has items but is not marked described' },
  FR007: { sev: 'warn', th: 'ฟังก์ชันนี้ยังไม่ได้อธิบาย Input หรือ Output อย่างน้อยหนึ่งอย่าง (ฟังก์ชันหลักควรมีทั้งสอง)', en: 'Input or Output of this function is not described (foreground functions need at least both)' },
  FR008: { sev: 'info', th: 'ฟังก์ชันนี้ยังไม่ได้ต่อกับฟังก์ชันอื่นด้วย coupling ใด ๆ', en: 'Function has no coupling to any other function' },
  FR009: { sev: 'warn', th: 'coupling เข้าสู่ aspect ที่ยังไม่ได้อธิบาย (unknown/none) — สถานะขัดกัน', en: 'A coupling ends at an aspect that is not described (unknown/none): inconsistent' },
  FR010: { sev: 'warn', th: 'อ้างว่าเป็นสิ่งที่สังเกตหรือรายงาน แต่ยังไม่ได้ผูกหลักฐาน — ข้ออ้างที่ยังไม่มีที่มา', en: 'Claimed as observed or reported but no evidence is linked: unsupported claim' },
  FR011: { sev: 'info', th: 'รายการที่ระบบแนะนำ (generated) ยังไม่ได้ตรวจทานโดยผู้วิเคราะห์', en: 'A generated suggestion has not been reviewed by the analyst' },
  FR012: { sev: 'warn', th: 'สมมติฐานนี้ยังไม่ได้ตรวจทาน', en: 'Assumption has not been reviewed' },
  FR013: { sev: 'info', th: 'ยังไม่ได้เขียนข้อจำกัดของโมเดล', en: 'Model limitations are not written' },
  FR014: { sev: 'warn', th: 'ชื่อฟังก์ชันซ้ำกัน', en: 'Duplicate function name' },
  FR015: { sev: 'info', th: 'Output นี้ยังไม่ได้ต่อไปยัง aspect ของฟังก์ชันใด', en: 'The function’s output is not coupled to any aspect of another function' },
  FR016: { sev: 'warn', th: 'coupling เชื่อมฟังก์ชันกับตัวเอง — ตรวจว่าตั้งใจหรือไม่', en: 'Coupling connects a function to itself: check that this is intended' },
  FR017: { sev: 'warn', th: 'ความแปรปรวนแบบ observed ยังไม่มีหลักฐาน', en: 'Observed variability has no evidence linked' },
};

export function lintFram(m) {
  const out = [];
  const add = (rule, targetId, extra = '') => out.push({ rule, severity: FRAM_RULES[rule].sev, targetId, th: FRAM_RULES[rule].th + extra, en: FRAM_RULES[rule].en + extra });
  const n = (x) => (x || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!m.activity.text.trim()) add('FR001', m.activity.id); else if (vague(m.activity.text)) add('FR001', m.activity.id);
  if (!m.functions.length) add('FR002', m.activity.id);
  const names = new Map();
  const linked = new Set(); const outCoupled = new Set();
  m.couplings.forEach((c) => { linked.add(c.from.functionId); linked.add(c.to.functionId); outCoupled.add(c.from.functionId); });
  m.functions.forEach((f) => {
    if (!f.name.trim()) add('FR003', f.id);
    else { const k = n(f.name); if (names.has(k)) add('FR014', f.id); else names.set(k, f.id); }
    ASPECTS.forEach((a) => {
      const x = f.aspects[a];
      if (x.status === 'unknown' && !x.items.length) add('FR004', f.id, ' — ' + asp(a, 'en'));
      if (x.status === 'described' && !x.items.length) add('FR005', f.id, ' — ' + asp(a, 'en'));
      if (x.status !== 'described' && x.items.length) add('FR006', f.id, ' — ' + asp(a, 'en'));
      x.items.forEach((it) => {
        if (it.prov && it.prov.origin === 'generated' && !it.prov.reviewed) add('FR011', it.id);
        if (it.prov && it.prov.origin === 'reported' && !f.evidenceIds.length) add('FR010', it.id);
      });
    });
    if (f.aspects.input.status !== 'described' || f.aspects.output.status !== 'described') add('FR007', f.id);
    if (m.functions.length > 1 && !linked.has(f.id)) add('FR008', f.id);
    if (f.aspects.output.status === 'described' && m.functions.length > 1 && !outCoupled.has(f.id)) add('FR015', f.id);
    f.variability.forEach((v) => {
      if (v.state === 'observed' && !v.evidenceIds.length) add('FR017', v.id);
      else if (v.prov && v.prov.origin === 'reported' && !v.evidenceIds.length) add('FR010', v.id);
      if (v.prov && v.prov.origin === 'generated' && !v.prov.reviewed) add('FR011', v.id);
    });
  });
  m.couplings.forEach((c) => {
    const t = m.functions.find((x) => x.id === c.to.functionId);
    if (t && t.aspects[c.to.aspect].status !== 'described') add('FR009', c.id);
    if (c.from.functionId === c.to.functionId) add('FR016', c.id);
    if (c.prov && c.prov.origin === 'reported' && !c.evidenceIds.length) add('FR010', c.id);
    if (c.prov && c.prov.origin === 'generated' && !c.prov.reviewed) add('FR011', c.id);
  });
  m.assumptions.forEach((a) => { if (a.reviewed !== true) add('FR012', a.id); });
  if (!m.limitations.trim()) add('FR013', m.activity.id);
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------- layout (prims; the renderer only draws them)
export const FG = { hexW: 200, hexH: 120, leftW: 130, rightW: 130, topH: 46, botH: 46, gapX: 80, gapY: 40, fs: 12, tfs: 11 };
const NODE_W = () => FG.leftW + FG.hexW + FG.rightW;
const NODE_H = () => FG.topH + FG.hexH + FG.botH;

/** Vertex of an aspect inside the node box. */
export function vertexOf(aspect) {
  const L = FG.leftW; const T = FG.topH;
  return {
    input: [L, T + FG.hexH / 2], output: [L + FG.hexW, T + FG.hexH / 2],
    time: [L + 30, T], control: [L + FG.hexW - 30, T],
    precondition: [L + 30, T + FG.hexH], resource: [L + FG.hexW - 30, T + FG.hexH],
  }[aspect];
}

function depths(m) {
  const d = Object.fromEntries(m.functions.map((f) => [f.id, 0]));
  const edges = m.couplings.filter((c) => c.from.functionId !== c.to.functionId && d[c.from.functionId] != null && d[c.to.functionId] != null);
  for (let i = 0; i < m.functions.length; i += 1) {
    let changed = false;
    edges.forEach((c) => { if (d[c.to.functionId] < d[c.from.functionId] + 1 && d[c.from.functionId] + 1 < m.functions.length) { d[c.to.functionId] = d[c.from.functionId] + 1; changed = true; } });
    if (!changed) break;
  }
  return d;
}

const STATUS_CLS = { described: 'ok', unknown: 'unknown', none: 'none' };

export function layoutFram(m, opts = {}) {
  const lang = opts.lang === 'en' ? 'en' : 'th';
  const codes = framCodes(m);
  const W = NODE_W(); const H = NODE_H();
  const items = []; const links = [];
  const dp = depths(m);
  const cols = new Map();
  m.functions.forEach((f) => { const k = dp[f.id]; if (!cols.has(k)) cols.set(k, []); cols.get(k).push(f); });
  const pos = {};
  [...cols.keys()].sort((a, b) => a - b).forEach((k, ci) => {
    cols.get(k).forEach((f, ri) => { pos[f.id] = { x: ci * (W + FG.gapX), y: ri * (H + FG.gapY) }; });
  });
  const clamp = (lines, n) => (lines.length > n ? [...lines.slice(0, n - 1), lines[n - 1].replace(/.{0,2}$/, '…')] : lines);
  const aspText = (f, a) => {
    const x = f.aspects[a];
    if (x.status === 'none') return lang === 'th' ? '— ไม่มี —' : '— none —';
    if (x.status === 'unknown' && !x.items.length) return '?';
    return x.items.map((i) => i.text || '…').join(' · ') || '?';
  };

  m.functions.forEach((f) => {
    const o = pos[f.id];
    const L = FG.leftW; const T = FG.topH; const hw = FG.hexW; const hh = FG.hexH;
    const prims = [];
    const hex = [[30, 0], [hw - 30, 0], [hw, hh / 2], [hw - 30, hh], [30, hh], [0, hh / 2]].map(([x, y]) => [L + x, T + y]);
    prims.push({ t: 'poly', pts: hex, cls: 'fhex' });
    prims.push({ t: 'text', x: L + hw / 2, y: T + 22, s: codes[f.id], cls: 'code', anchor: 'middle' });
    const nameL = clamp(wrapText(f.name || '—', hw - 60, FG.fs), 3);
    nameL.forEach((s, i) => prims.push({ t: 'text', x: L + hw / 2, y: T + 44 + i * 15, s, cls: 'nm', anchor: 'middle' }));
    ASPECTS.forEach((a) => {
      const [vx, vy] = vertexOf(a);
      const st = f.aspects[a].status;
      prims.push({ t: 'circle', cx: vx, cy: vy, r: 9, cls: 'fv fv-' + STATUS_CLS[st] });
      prims.push({ t: 'text', x: vx, y: vy + 3.5, s: ASPECT_INFO[a].letter, cls: 'fvl fvl-' + STATUS_CLS[st], anchor: 'middle' });
      const txt = aspText(f, a);
      const muted = st !== 'described' ? ' faint' : '';
      if (a === 'input' || a === 'output') {
        const ls = clamp(wrapText(txt, FG.leftW - 26, FG.tfs), 3);
        ls.forEach((s, i) => prims.push({ t: 'text', x: a === 'input' ? vx - 14 : vx + 14, y: vy - 8 - (ls.length - 1 - i) * 12, s, cls: 'asp' + muted, anchor: a === 'input' ? 'end' : 'start' }));
      } else if (a === 'time' || a === 'control') {
        const ls = clamp(wrapText(txt, 130, FG.tfs), 2);
        ls.forEach((s, i) => prims.push({ t: 'text', x: vx, y: vy - 16 - (ls.length - 1 - i) * 12, s, cls: 'asp' + muted, anchor: 'middle' }));
      } else {
        const ls = clamp(wrapText(txt, 130, FG.tfs), 2);
        ls.forEach((s, i) => prims.push({ t: 'text', x: vx, y: vy + 24 + i * 12, s, cls: 'asp' + muted, anchor: 'middle' }));
      }
    });
    items.push({ id: f.id, kind: 'framFunction', shape: 'card', x: o.x, y: o.y, w: W, h: H, lines: [], prims, tip: f.description || '' });
  });

  // couplings: orthogonal lines from an Output vertex to the target aspect vertex
  m.couplings.forEach((c, k) => {
    const a = pos[c.from.functionId]; const b = pos[c.to.functionId];
    if (!a || !b) return;
    const [sx, sy] = vertexOf('output'); const [tx, ty] = vertexOf(c.to.aspect);
    const x1 = a.x + sx; const y1 = a.y + sy; const x2 = b.x + tx; const y2 = b.y + ty;
    const lane = (k % 5) * 7;
    const xm = x2 > x1 + 60 ? Math.round((x1 + x2) / 2) + lane : x1 + 28 + lane;
    let d;
    if (c.to.aspect === 'input') d = `M${x1},${y1} H${xm} V${y2} H${x2}`;
    else if (c.to.aspect === 'time' || c.to.aspect === 'control') d = `M${x1},${y1} H${xm} V${y2 - 22 - lane} H${x2} V${y2}`;
    else d = `M${x1},${y1} H${xm} V${y2 + 22 + lane} H${x2} V${y2}`;
    links.push({ kind: 'cpl' + (c.prov && c.prov.origin === 'generated' && !c.prov.reviewed ? ' proposed' : ''), d });
    items.push({ id: c.id, kind: 'framCoupling', shape: 'card', x: xm + 4, y: Math.min(y1, y2) + Math.abs(y2 - y1) / 2 - 7, w: 140, h: 14, lines: [], prims: [{ t: 'text', x: 0, y: 11, s: codes[c.id] + (c.text ? ' ' + c.text.slice(0, 22) : ''), cls: 'lab' }] });
  });

  const totalW = Math.max(W, ...Object.values(pos).map((p) => p.x + W), 320);
  const totalH = Math.max(H, ...Object.values(pos).map((p) => p.y + H), 120);
  const cnt = { described: 0, unknown: 0, none: 0 };
  m.functions.forEach((f) => ASPECTS.forEach((a) => { cnt[f.aspects[a].status] += 1; }));
  const sp = [{ t: 'text', x: 12, y: 23, s: 'FRAM', cls: 'ttl' }];
  const parts = [`FUNCTIONS ${m.functions.length}`, `COUPLINGS ${m.couplings.length}`, `ASPECTS DESCRIBED ${cnt.described}`, `NOT ASSESSED ${cnt.unknown}`];
  let px = 56;
  parts.forEach((s) => { sp.push({ t: 'text', x: px, y: 23, s, cls: 'tag' }); px += textWidth(s, 10) + 24; });
  sp.push({ t: 'text', x: totalW - 12, y: 23, s: lang === 'th' ? 'ไม่มีคะแนนความแปรปรวนหรือ resonance — โมเดลนี้เป็นการอธิบาย ไม่ใช่การคำนวณ' : 'No variability or resonance scores: this model describes, it does not calculate', cls: 'tag', anchor: 'end' });
  items.push({ id: 'fram_summary', kind: 'legend', inert: true, shape: 'card', x: 0, y: totalH + 20, w: Math.max(totalW, 760), h: 36, lines: [], prims: sp });
  return normalizeGeom({ items, links, width: Math.max(totalW, 760), height: totalH + 20 + 36 });
}

export function outlineFram(m) {
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  if (m.limitations) out.push(`Limitations: ${m.limitations}`);
  out.push(`ACTIVITY: ${m.activity.text}`, '');
  const codes = framCodes(m);
  m.functions.forEach((f) => {
    out.push(`${codes[f.id]} ${f.name}${f.description ? ' — ' + f.description : ''}`);
    ASPECTS.forEach((a) => {
      const x = f.aspects[a];
      out.push(`   ${ASPECT_INFO[a].en}: ${x.status === 'described' ? x.items.map((i) => i.text).join(' | ') : '[' + x.status + ']'}`);
    });
    f.variability.forEach((v) => out.push(`   variability [${v.state}${v.aspect ? ', ' + v.aspect : ''}]: ${v.text}${v.evidenceIds.length ? '  (evidence: ' + v.evidenceIds.join(', ') + ')' : ''}`));
  });
  out.push('', 'COUPLINGS');
  m.couplings.forEach((c) => out.push(`   ${codes[c.id]} ${codes[c.from.functionId]}.output -> ${codes[c.to.functionId]}.${c.to.aspect}${c.text ? ' : ' + c.text : ''}`));
  return out.join('\n');
}
