// Safetytool — STAMP / STPA control-structure model (schema safetytool.stamp/1). Pure: no DOM.
// Concept: STAMP (Systems-Theoretic Accident Model and Processes) treats safety as a control problem: accidents come from
// inadequate control (missing or unsafe control actions, wrong process models), not only from component failure.
// STPA is the analysis built on it: losses → hazards → control structure → unsafe control actions (UCAs) → causal scenarios.
// Sources: N. Leveson, "Engineering a Safer World" (MIT Press, 2012); J. Thomas / MIT 16.63J System Safety lecture notes
// ("Systems Theoretic Process Analysis (STPA)", MIT OpenCourseWare, 2016). Names and structure follow those; the wording
// of everything here is our own. There are no probabilities and no scores in this model.

import { uid } from './model.js';
import { wrapText } from './textmetrics.js';
import { normalizeGeom } from './swiss.js';

export const SCHEMA = 'safetytool.stamp/1';
export const ROLES = ['controller', 'process'];
export const KINDS = ['control', 'feedback'];
/** The four ways a control action can be unsafe (STPA step 1). */
export const UCA_TYPES = ['not-provided', 'provided', 'wrong-timing', 'wrong-duration'];
export const UCA_INFO = {
  'not-provided': { th: 'ไม่ได้สั่ง', en: 'Not provided', def: { th: 'การสั่งที่จำเป็นเพื่อความปลอดภัยไม่ถูกสั่ง', en: 'A control action needed for safety is not given.' } },
  provided: { th: 'สั่งแล้วไม่ปลอดภัย', en: 'Provided (unsafe)', def: { th: 'การสั่งในบริบทนั้นทำให้เกิดอันตราย', en: 'Giving the control action in that context causes a hazard.' } },
  'wrong-timing': { th: 'เร็ว/ช้า/ผิดลำดับ', en: 'Too early / too late / wrong order', def: { th: 'การสั่งที่อาจปลอดภัยแต่เร็วไป ช้าไป หรือผิดลำดับ', en: 'A potentially safe action given too early, too late or out of order.' } },
  'wrong-duration': { th: 'หยุดเร็ว/นานไป', en: 'Stopped too soon / applied too long', def: { th: 'การสั่งหยุดเร็วเกินไป หรือคงไว้นานเกินไป', en: 'The control action stops too soon or is applied too long.' } },
};

export function emptyStamp() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    system: { id: uid('sy'), text: '' }, // the system and its boundary
    losses: [],
    hazards: [],
    nodes: [],
    actions: [],
    ucas: [],
    scenarios: [],
  };
}

export const addLoss = (m, text = '') => { const x = { id: uid('ls'), text, notes: '' }; m.losses.push(x); return x; };
export const addHazard = (m, text = '') => { const x = { id: uid('hz'), text, lossIds: [], constraint: '', notes: '' }; m.hazards.push(x); return x; };
export function addNode(m, role = 'controller', text = '') {
  // a new controller starts a new row under the last controller row; the controlled process goes under everything
  const pool = role === 'process' ? m.nodes : m.nodes.filter((n) => n.role === 'controller');
  const level = pool.length ? Math.max(...pool.map((n) => n.level)) + 1 : 0;
  const x = { id: uid('nd'), role, text, level, processModel: '', notes: '' };
  m.nodes.push(x);
  return x;
}
export const addAction = (m, kind = 'control', from = null, to = null, text = '') => { const x = { id: uid('ac'), kind, from, to, text, notes: '' }; m.actions.push(x); return x; };
export const addUca = (m, actionId, type = 'not-provided') => { const x = { id: uid('uc'), actionId, type, context: '', hazardIds: [], constraint: '', notes: '' }; m.ucas.push(x); return x; };
export const addScenario = (m, ucaId, text = '') => { const x = { id: uid('sc'), ucaId, text, notes: '' }; m.scenarios.push(x); return x; };

export function removeStampNode(m, id) {
  if (m.losses.some((x) => x.id === id)) { m.losses = m.losses.filter((x) => x.id !== id); m.hazards.forEach((h) => { h.lossIds = h.lossIds.filter((l) => l !== id); }); return; }
  if (m.hazards.some((x) => x.id === id)) { m.hazards = m.hazards.filter((x) => x.id !== id); m.ucas.forEach((u) => { u.hazardIds = u.hazardIds.filter((h) => h !== id); }); return; }
  if (m.nodes.some((x) => x.id === id)) {
    m.nodes = m.nodes.filter((x) => x.id !== id);
    const gone = m.actions.filter((a) => a.from === id || a.to === id).map((a) => a.id);
    gone.forEach((a) => removeStampNode(m, a));
    return;
  }
  if (m.actions.some((x) => x.id === id)) {
    m.actions = m.actions.filter((x) => x.id !== id);
    const gone = m.ucas.filter((u) => u.actionId === id).map((u) => u.id);
    gone.forEach((u) => removeStampNode(m, u));
    return;
  }
  if (m.ucas.some((x) => x.id === id)) { m.ucas = m.ucas.filter((x) => x.id !== id); m.scenarios = m.scenarios.filter((s) => s.ucaId !== id); return; }
  m.scenarios = m.scenarios.filter((x) => x.id !== id);
}

export function findStamp(m, id) {
  if (m.system.id === id) return { kind: 'stSystem', ref: m.system };
  let r = m.losses.find((x) => x.id === id); if (r) return { kind: 'stLoss', ref: r };
  r = m.hazards.find((x) => x.id === id); if (r) return { kind: 'stHazard', ref: r };
  r = m.nodes.find((x) => x.id === id); if (r) return { kind: r.role === 'process' ? 'stProcess' : 'stController', ref: r };
  r = m.actions.find((x) => x.id === id); if (r) return { kind: r.kind === 'feedback' ? 'stFeedback' : 'stAction', ref: r };
  r = m.ucas.find((x) => x.id === id); if (r) return { kind: 'stUca', ref: r };
  r = m.scenarios.find((x) => x.id === id); if (r) return { kind: 'stScenario', ref: r };
  return null;
}

export function validateStamp(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  if (!m.system || typeof m.system.id !== 'string') errs.push('system missing');
  for (const k of ['losses', 'hazards', 'nodes', 'actions', 'ucas', 'scenarios']) if (!Array.isArray(m[k])) errs.push(k + ' must be an array');
  if (errs.length) return errs;
  const ids = new Set([m.system.id]);
  const all = [...m.losses, ...m.hazards, ...m.nodes, ...m.actions, ...m.ucas, ...m.scenarios];
  all.forEach((x) => { if (!x || typeof x.id !== 'string') errs.push('element without id'); else { if (ids.has(x.id)) errs.push('duplicate id: ' + x.id); ids.add(x.id); } });
  const has = (arr, id) => arr.some((x) => x.id === id);
  m.hazards.forEach((h) => (h.lossIds || []).forEach((l) => { if (!has(m.losses, l)) errs.push('hazard ' + h.id + ': unknown loss ' + l); }));
  m.nodes.forEach((n) => {
    if (!ROLES.includes(n.role)) errs.push('node ' + n.id + ': bad role');
    if (!Number.isInteger(n.level) || n.level < 0) errs.push('node ' + n.id + ': level must be a whole number >= 0');
  });
  m.actions.forEach((a) => {
    if (!KINDS.includes(a.kind)) errs.push('action ' + a.id + ': bad kind');
    const f = m.nodes.find((n) => n.id === a.from); const t = m.nodes.find((n) => n.id === a.to);
    if (!f) errs.push('action ' + a.id + ': unknown source'); if (!t) errs.push('action ' + a.id + ': unknown target');
    if (f && t && f === t) errs.push('action ' + a.id + ': source and target are the same');
    if (f && a.kind === 'control' && f.role !== 'controller') errs.push('action ' + a.id + ': a control action must start at a controller');
    if (t && a.kind === 'feedback' && t.role !== 'controller') errs.push('action ' + a.id + ': feedback must end at a controller');
  });
  m.ucas.forEach((u) => {
    const a = m.actions.find((x) => x.id === u.actionId);
    if (!a) errs.push('uca ' + u.id + ': unknown action'); else if (a.kind !== 'control') errs.push('uca ' + u.id + ': must refer to a control action');
    if (!UCA_TYPES.includes(u.type)) errs.push('uca ' + u.id + ': bad type');
    (u.hazardIds || []).forEach((h) => { if (!has(m.hazards, h)) errs.push('uca ' + u.id + ': unknown hazard ' + h); });
  });
  m.scenarios.forEach((s) => { if (!has(m.ucas, s.ucaId)) errs.push('scenario ' + s.id + ': unknown uca'); });
  return errs;
}

export function normalizeStamp(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.system.text = m.system.text || '';
  m.losses.forEach((x) => { x.text = x.text || ''; x.notes = x.notes || ''; });
  m.hazards.forEach((x) => { x.text = x.text || ''; x.notes = x.notes || ''; x.constraint = x.constraint || ''; if (!Array.isArray(x.lossIds)) x.lossIds = []; });
  m.nodes.forEach((x) => { x.text = x.text || ''; x.notes = x.notes || ''; x.processModel = x.processModel || ''; if (!Number.isInteger(x.level)) x.level = 0; });
  m.actions.forEach((x) => { x.text = x.text || ''; x.notes = x.notes || ''; });
  m.ucas.forEach((x) => { x.context = x.context || ''; x.constraint = x.constraint || ''; x.notes = x.notes || ''; if (!Array.isArray(x.hazardIds)) x.hazardIds = []; });
  m.scenarios.forEach((x) => { x.text = x.text || ''; x.notes = x.notes || ''; });
  return m;
}

/** Display codes (derived, never stored). */
export function stampCodes(m) {
  const c = {};
  const p = (pre, arr) => arr.forEach((x, i) => { c[x.id] = pre + '-' + (i + 1); });
  p('L', m.losses); p('H', m.hazards); p('CA', m.actions.filter((a) => a.kind === 'control')); p('FB', m.actions.filter((a) => a.kind === 'feedback'));
  p('UCA', m.ucas); p('LS', m.scenarios);
  m.nodes.filter((n) => n.role === 'controller').forEach((n, i) => { c[n.id] = 'C' + (i + 1); });
  m.nodes.filter((n) => n.role === 'process').forEach((n, i) => { c[n.id] = 'P' + (i + 1); });
  return c;
}

const vague = (s) => {
  const t = (s || '').trim();
  if (!t) return true;
  return /[฀-๿]/.test(t) ? t.length < 8 : t.split(/\s+/).length < 2;
};

export const STAMP_RULES = {
  S001: { sev: 'error', th: 'ยังไม่ได้ระบุระบบและขอบเขตที่วิเคราะห์', en: 'The system and its boundary are empty' },
  S002: { sev: 'warn', th: 'ยังไม่มี Loss (ความสูญเสียที่ไม่ยอมรับ)', en: 'No losses written yet' },
  S003: { sev: 'warn', th: 'Hazard นี้ยังไม่ได้ผูกกับ Loss ใด', en: 'Hazard is not linked to any loss' },
  S004: { sev: 'info', th: 'Loss นี้ยังไม่มี Hazard ที่นำไปสู่', en: 'No hazard leads to this loss yet' },
  S005: { sev: 'info', th: 'Hazard นี้ยังไม่มีข้อกำหนดความปลอดภัย (system-level constraint)', en: 'Hazard has no safety constraint written' },
  S006: { sev: 'info', th: 'Controller นี้ยังไม่ได้เขียน process model (สิ่งที่มันเชื่อเกี่ยวกับสถานะของกระบวนการ)', en: 'Controller has no process model written (what it believes about the process state)' },
  S007: { sev: 'info', th: 'ยังไม่มี UCA ของ control action นี้ — ยังไม่ได้วิเคราะห์ หรือวิเคราะห์แล้วไม่พบ? (ไม่ทราบ)', en: 'No unsafe control action recorded for this control action — not analysed yet, or none found? (unknown)' },
  S008: { sev: 'warn', th: 'UCA นี้ยังไม่ได้ผูกกับ Hazard', en: 'UCA is not linked to any hazard' },
  S009: { sev: 'info', th: 'UCA นี้ยังไม่ได้ระบุบริบท (เงื่อนไขที่ทำให้การสั่งไม่ปลอดภัย)', en: 'UCA has no context (the condition that makes it unsafe)' },
  S010: { sev: 'info', th: 'UCA นี้ยังไม่มีสถานการณ์สาเหตุ (causal scenario)', en: 'UCA has no causal scenario yet' },
  S011: { sev: 'info', th: 'UCA นี้ยังไม่มีข้อกำหนดของ controller (controller constraint)', en: 'UCA has no controller constraint yet' },
  S012: { sev: 'warn', th: 'ส่วนประกอบนี้ยังไม่ต่อกับเส้น control หรือ feedback ใดเลย', en: 'Element is not connected by any control action or feedback' },
  S013: { sev: 'info', th: 'ยังไม่มี controlled process ในโครงสร้าง', en: 'No controlled process in the structure' },
  S014: { sev: 'info', th: 'ข้อความสั้น/กว้างเกินไป', en: 'Text is vague' },
  S015: { sev: 'warn', th: 'UCA ซ้ำ (control action, ชนิด และบริบทเดียวกัน)', en: 'Duplicate UCA (same control action, type and context)' },
  S016: { sev: 'info', th: 'Controller นี้สั่งงานแต่ไม่ได้รับ feedback ใด — จะปรับ process model ได้อย่างไร', en: 'Controller issues control actions but receives no feedback — how does it update its process model?' },
};

export function lintStamp(m) {
  const out = [];
  const add = (rule, targetId) => out.push({ rule, severity: STAMP_RULES[rule].sev, targetId, th: STAMP_RULES[rule].th, en: STAMP_RULES[rule].en });
  if (!m.system.text.trim()) add('S001', m.system.id); else if (vague(m.system.text)) add('S014', m.system.id);
  if (!m.losses.length) add('S002', m.system.id);
  m.losses.forEach((l) => { if (vague(l.text)) add('S014', l.id); if (!m.hazards.some((h) => h.lossIds.includes(l.id))) add('S004', l.id); });
  m.hazards.forEach((h) => {
    if (vague(h.text)) add('S014', h.id);
    if (!h.lossIds.length) add('S003', h.id);
    if (!h.constraint.trim()) add('S005', h.id);
  });
  const hasProcess = m.nodes.some((n) => n.role === 'process');
  if (m.nodes.length && !hasProcess) add('S013', m.system.id);
  m.nodes.forEach((n) => {
    if (!n.text.trim()) add('S014', n.id); // a role name such as "Pilot" is short on purpose; only an empty box is flagged
    const linked = m.actions.some((a) => a.from === n.id || a.to === n.id);
    if (!linked) add('S012', n.id);
    if (n.role === 'controller') {
      if (!n.processModel.trim()) add('S006', n.id);
      const sends = m.actions.some((a) => a.kind === 'control' && a.from === n.id);
      const gets = m.actions.some((a) => a.kind === 'feedback' && a.to === n.id);
      if (sends && !gets) add('S016', n.id);
    }
  });
  m.actions.forEach((a) => {
    if (vague(a.text)) add('S014', a.id);
    if (a.kind === 'control' && !m.ucas.some((u) => u.actionId === a.id)) add('S007', a.id);
  });
  const seen = new Set();
  m.ucas.forEach((u) => {
    if (!u.hazardIds.length) add('S008', u.id);
    if (!u.context.trim()) add('S009', u.id);
    if (!m.scenarios.some((s) => s.ucaId === u.id)) add('S010', u.id);
    if (!u.constraint.trim()) add('S011', u.id);
    const k = [u.actionId, u.type, u.context.toLowerCase().replace(/\s+/g, ' ').trim()].join('|');
    if (seen.has(k)) add('S015', u.id); else seen.add(k);
  });
  m.scenarios.forEach((s) => { if (vague(s.text)) add('S014', s.id); });
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** UCA grid (control action × four types) and coverage. "No UCA recorded" means not analysed or none found — never "safe". */
export function analyzeStamp(m) {
  const controlActions = m.actions.filter((a) => a.kind === 'control');
  const grid = controlActions.map((a) => ({
    actionId: a.id,
    cells: Object.fromEntries(UCA_TYPES.map((t) => [t, m.ucas.filter((u) => u.actionId === a.id && u.type === t).map((u) => u.id)])),
  }));
  return {
    grid,
    actionsWithoutUca: controlActions.filter((a) => !m.ucas.some((u) => u.actionId === a.id)).map((a) => a.id),
    hazardsWithoutUca: m.hazards.filter((h) => !m.ucas.some((u) => u.hazardIds.includes(h.id))).map((h) => h.id),
    ucasWithoutScenario: m.ucas.filter((u) => !m.scenarios.some((s) => s.ucaId === u.id)).map((u) => u.id),
    lossesWithoutHazard: m.losses.filter((l) => !m.hazards.some((h) => h.lossIds.includes(l.id))).map((l) => l.id),
    counts: { losses: m.losses.length, hazards: m.hazards.length, controlActions: controlActions.length, ucas: m.ucas.length, scenarios: m.scenarios.length },
  };
}

// ---------------- layout ----------------
export const ST = { fs: 12, lh: 15, padX: 12, headH: 28, nodeW: 250, gapX: 90, minGapY: 96, lineGap: 16, minH: 60, sumH: 36, labelW: 150 };

/** Control structure: rows by `level` (0 at the top). Control actions run down (solid), feedback runs up (dashed); each has a label. */
export function layoutStamp(m, opts = {}) {
  const D = ST;
  const lang = opts.lang === 'en' ? 'en' : 'th';
  const codes = stampCodes(m);
  const levels = [...new Set(m.nodes.map((n) => n.level))].sort((a, b) => a - b);
  const items = []; const links = [];
  const ucaCount = (id) => m.ucas.filter((u) => { const a = m.actions.find((x) => x.id === u.actionId); return a && a.from === id; }).length;

  const cardOf = (n) => {
    const inner = D.nodeW - 2 * D.padX;
    const tl = wrapText(n.text || '—', inner, D.fs);
    const pm = n.role === 'controller' && n.processModel ? wrapText('PM: ' + n.processModel, inner, 11) : [];
    const h = Math.max(D.minH, D.headH + tl.length * D.lh + (pm.length ? 6 + pm.length * 14 : 0) + 12);
    const prims = [{ t: 'text', x: D.padX, y: 17, s: (n.role === 'process' ? (lang === 'th' ? 'CONTROLLED PROCESS' : 'CONTROLLED PROCESS') : 'CONTROLLER') + ' · ' + codes[n.id], cls: 'ttl' }];
    if (n.role === 'controller') { const k = ucaCount(n.id); if (k) prims.push({ t: 'chip', x: D.nodeW - D.padX, y: 6, s: 'UCA ×' + k, cls: 'bad', anchor: 'end' }); }
    tl.forEach((s, i) => prims.push({ t: 'text', x: D.padX, y: D.headH + 4 + D.lh * 0.78 + i * D.lh, s, cls: 'nm' }));
    pm.forEach((s, i) => prims.push({ t: 'text', x: D.padX, y: D.headH + 4 + tl.length * D.lh + 10 + i * 14, s, cls: 'tag' }));
    return { prims, h };
  };

  // gap between rows grows with the number of lines drawn across it
  const rowOf = new Map(levels.map((lv, i) => [lv, i]));
  const rowNodes = levels.map((lv) => m.nodes.filter((n) => n.level === lv));
  const rowW = Math.max(1, ...rowNodes.map((r) => r.length));
  const width = D.labelW + rowW * D.nodeW + (rowW - 1) * D.gapX + 20;
  const rowH = rowNodes.map((r) => Math.max(D.minH, ...r.map((n) => cardOf(n).h)));
  const crossings = (i) => m.actions.filter((a) => { const f = m.nodes.find((n) => n.id === a.from); const t = m.nodes.find((n) => n.id === a.to); if (!f || !t) return false; const ra = rowOf.get(f.level); const rb = rowOf.get(t.level); return Math.min(ra, rb) <= i && Math.max(ra, rb) > i; }).length;
  const rowY = []; let y = 0;
  rowNodes.forEach((r, i) => { rowY.push(y); y += rowH[i] + (i < rowNodes.length - 1 ? Math.max(D.minGapY, 40 + crossings(i) * D.lineGap) : 0); });

  const pos = {};
  rowNodes.forEach((r, i) => {
    const total = r.length * D.nodeW + (r.length - 1) * D.gapX;
    const full = rowW * D.nodeW + (rowW - 1) * D.gapX;
    let x = D.labelW + (full - total) / 2;
    r.forEach((n) => {
      const c = cardOf(n);
      const it = { id: n.id, kind: n.role === 'process' ? 'stProcess' : 'stController', shape: 'card', x, y: rowY[i] + (rowH[i] - c.h) / 2, w: D.nodeW, h: c.h, lines: [], prims: c.prims };
      items.push(it); pos[n.id] = it; x += D.nodeW + D.gapX;
    });
    items.push({ id: 'row_' + i, kind: 'stRow', inert: true, shape: 'card', x: 0, y: rowY[i], w: D.labelW - 20, h: rowH[i], lines: [], prims: [
      { t: 'text', x: 8, y: 20, s: (lang === 'th' ? 'ระดับ ' : 'LEVEL ') + levels[i], cls: 'ttl' },
    ] });
  });

  // lines: one lane per action between the same pair of rows
  const lane = new Map();
  m.actions.forEach((a) => {
    const f = pos[a.from]; const t = pos[a.to];
    if (!f || !t) return;
    const down = f.y < t.y;
    const key = [Math.min(rowOf.get(m.nodes.find((n) => n.id === a.from).level), rowOf.get(m.nodes.find((n) => n.id === a.to).level)), Math.max(rowOf.get(m.nodes.find((n) => n.id === a.from).level), rowOf.get(m.nodes.find((n) => n.id === a.to).level))].join('-');
    const k = lane.get(key) || 0; lane.set(key, k + 1);
    const sameRow = Math.abs(f.y - t.y) < 4;
    const lab = wrapText(a.text || '—', 150, 11);
    const code = codes[a.id];
    if (sameRow) {
      const left = f.x < t.x;
      const x1 = left ? f.x + f.w : f.x; const x2 = left ? t.x : t.x + t.w; const yy = f.y + f.h / 2 + (a.kind === 'feedback' ? 12 : -12);
      links.push({ kind: a.kind === 'feedback' ? 'fb' : 'ctl', d: `M${Math.round(x1)},${Math.round(yy)} H${Math.round(x2)}` });
      items.push({ id: a.id, kind: a.kind === 'feedback' ? 'stFeedback' : 'stAction', shape: 'card', x: Math.min(x1, x2) + 4, y: yy - 15 - (lab.length - 1) * 12, w: Math.abs(x2 - x1) - 8, h: 14 + (lab.length - 1) * 12, lines: [], prims: lab.map((s, i) => ({ t: 'text', x: 0, y: 11 + i * 12, s: (i === 0 ? code + ' ' : '') + s, cls: 'lab' })) });
      return;
    }
    const spread = 34;
    const off = ((k % 6) - 2.5) * spread + (a.kind === 'feedback' ? -spread / 2 : spread / 2) * 0;
    const xs = f.x + f.w / 2 + off; const xt = t.x + t.w / 2 + off;
    const ys = down ? f.y + f.h : f.y; const yt = down ? t.y : t.y + t.h;
    const ym = (ys + yt) / 2 + ((k % 4) - 1.5) * 10;
    links.push({ kind: a.kind === 'feedback' ? 'fb' : 'ctl', d: `M${Math.round(xs)},${Math.round(ys)} V${Math.round(ym)} H${Math.round(xt)} V${Math.round(yt)}`, down });
    const ly = down ? ym + 4 : ym - 4 - (lab.length - 1) * 12;
    items.push({ id: a.id, kind: a.kind === 'feedback' ? 'stFeedback' : 'stAction', shape: 'card', x: xt + 5, y: ly, w: 150, h: 14 + (lab.length - 1) * 12, lines: [], prims: lab.map((s, i) => ({ t: 'text', x: 0, y: 11 + i * 12, s: (i === 0 ? code + ' ' : '') + s, cls: 'lab' })) });
  });

  const a = analyzeStamp(m);
  const sy = y + 26;
  const sp = [{ t: 'text', x: 12, y: 23, s: 'STPA', cls: 'ttl' }];
  let px = 56;
  [['LOSSES', a.counts.losses], ['HAZARDS', a.counts.hazards], ['CONTROL ACTIONS', a.counts.controlActions], ['UCAs', a.counts.ucas], ['SCENARIOS', a.counts.scenarios]].forEach(([k, v]) => {
    const s = k + ' ' + v;
    sp.push({ t: 'text', x: px, y: 23, s, cls: 'tag' });
    px += s.length * 6.6 + 22;
  });
  sp.push({ t: 'text', x: width - 12, y: 23, s: lang === 'th' ? 'เส้นทึบ = control action · เส้นประ = feedback' : 'solid = control action · dashed = feedback', cls: 'tag', anchor: 'end' });
  items.push({ id: 'stamp_summary', kind: 'legend', inert: true, shape: 'card', x: 0, y: sy, w: width, h: D.sumH, lines: [], prims: sp });
  return normalizeGeom({ items, links, width, height: sy + D.sumH });
}

export function outlineStamp(m) {
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  const c = stampCodes(m);
  const nm = (id) => { const n = m.nodes.find((x) => x.id === id); return n ? `${c[id]} ${n.text}` : id; };
  out.push(`SYSTEM: ${m.system.text}`, '', 'LOSSES');
  m.losses.forEach((l) => out.push(`  ${c[l.id]} ${l.text}`));
  out.push('HAZARDS');
  m.hazards.forEach((h) => out.push(`  ${c[h.id]} ${h.text}  [leads to: ${h.lossIds.map((x) => c[x] || x).join(', ') || '-'}]${h.constraint ? `\n      constraint: ${h.constraint}` : ''}`));
  out.push('', 'CONTROL STRUCTURE');
  [...m.nodes].sort((a, b) => a.level - b.level).forEach((n) => out.push(`  L${n.level} ${n.role.toUpperCase()} ${c[n.id]} ${n.text}${n.processModel ? `\n      process model: ${n.processModel}` : ''}`));
  m.actions.forEach((a) => out.push(`  ${c[a.id]} ${a.kind}: ${nm(a.from)} -> ${nm(a.to)} : ${a.text}`));
  out.push('', 'UNSAFE CONTROL ACTIONS');
  m.ucas.forEach((u) => {
    const a = m.actions.find((x) => x.id === u.actionId);
    out.push(`  ${c[u.id]} [${UCA_INFO[u.type].en}] ${a ? c[a.id] + ' ' + a.text : u.actionId}${u.context ? ' — when: ' + u.context : ''}  [hazards: ${u.hazardIds.map((x) => c[x] || x).join(', ') || '-'}]`);
    if (u.constraint) out.push(`      constraint: ${u.constraint}`);
    m.scenarios.filter((s) => s.ucaId === u.id).forEach((s) => out.push(`      ${c[s.id]} scenario: ${s.text}`));
  });
  return out.join('\n');
}
