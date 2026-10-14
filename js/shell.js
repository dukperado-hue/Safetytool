// Safetytool — SHELL(L) model (schema safetytool.shell/1). Pure: no DOM.
// Concept: the SHELL model of human factors (Edwards 1972; Hawkins; used in ICAO human-factors guidance):
// the person (Liveware, centre) interacts with Software (procedures, checklists, rules, symbology),
// Hardware (equipment, controls, displays), Environment (physical and organisational) and other
// Liveware (crew, controllers, ground staff). Trouble sits at the interfaces where they do not match.
// NOTE: "Shell" is also the name of a company associated with the bowtie method; this module is the
// human-factors SHELL model. Confirm this is the model you want.

import { uid } from './model.js';
import { wrapText } from './textmetrics.js';
import { normalizeGeom } from './swiss.js';

export const SCHEMA = 'safetytool.shell/1';
export const COMPONENTS = ['S', 'H', 'E', 'L'];
export const INTERFACES = ['LS', 'LH', 'LE', 'LL'];
export const STATUSES = ['unknown', 'match', 'mismatch'];
const COMP_OF = { LS: 'S', LH: 'H', LE: 'E', LL: 'L' };

export function emptyShell() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    subject: { id: uid('sj'), text: '' }, // the Liveware at the centre: role/person
    focus: { id: uid('fc'), text: '' },   // the task, event or situation analysed
    components: { S: [], H: [], E: [], L: [] },
    interfaces: {
      LS: { status: 'unknown', findings: [] },
      LH: { status: 'unknown', findings: [] },
      LE: { status: 'unknown', findings: [] },
      LL: { status: 'unknown', findings: [] },
    },
  };
}

export function addItem(m, comp, text = '') {
  const it = { id: uid('it'), text };
  m.components[comp].push(it);
  return it;
}

export function addFinding(m, iface, text = '') {
  const f = { id: uid('fd'), text, severity: null, action: '', owner: '' };
  m.interfaces[iface].findings.push(f);
  if (m.interfaces[iface].status === 'unknown') m.interfaces[iface].status = 'mismatch';
  return f;
}

export function removeShellNode(m, id) {
  for (const c of COMPONENTS) m.components[c] = m.components[c].filter((x) => x.id !== id);
  for (const i of INTERFACES) m.interfaces[i].findings = m.interfaces[i].findings.filter((x) => x.id !== id);
}

export function findShell(m, id) {
  if (m.subject.id === id) return { kind: 'subject', ref: m.subject };
  if (m.focus.id === id) return { kind: 'focus', ref: m.focus };
  for (const c of COMPONENTS) { const r = m.components[c].find((x) => x.id === id); if (r) return { kind: 'item' + c, ref: r }; }
  for (const i of INTERFACES) { const r = m.interfaces[i].findings.find((x) => x.id === id); if (r) return { kind: 'finding', ref: r, iface: i }; }
  return null;
}

export function validateShell(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  if (!m.subject || typeof m.subject.id !== 'string') errs.push('subject missing');
  if (!m.focus || typeof m.focus.id !== 'string') errs.push('focus missing');
  if (!m.components || !m.interfaces) { errs.push('components/interfaces missing'); return errs; }
  const ids = new Set();
  const dup = (id) => { if (ids.has(id)) errs.push('duplicate id: ' + id); ids.add(id); };
  if (m.subject) dup(m.subject.id);
  if (m.focus) dup(m.focus.id);
  for (const c of COMPONENTS) {
    if (!Array.isArray(m.components[c])) { errs.push('components.' + c + ' must be an array'); continue; }
    m.components[c].forEach((x) => { if (!x || typeof x.id !== 'string') errs.push('item without id'); else dup(x.id); });
  }
  for (const i of INTERFACES) {
    const f = m.interfaces[i];
    if (!f || !Array.isArray(f.findings)) { errs.push('interfaces.' + i + '.findings must be an array'); continue; }
    if (!STATUSES.includes(f.status)) errs.push('interfaces.' + i + ': bad status');
    f.findings.forEach((x) => { if (!x || typeof x.id !== 'string') errs.push('finding without id'); else dup(x.id); });
  }
  return errs;
}

export function normalizeShell(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.subject.text = m.subject.text || '';
  m.focus.text = m.focus.text || '';
  COMPONENTS.forEach((c) => m.components[c].forEach((x) => { x.text = x.text || ''; }));
  INTERFACES.forEach((i) => m.interfaces[i].findings.forEach((f) => {
    f.text = f.text || ''; f.action = f.action || ''; f.owner = f.owner || '';
    if (f.severity === undefined) f.severity = null;
  }));
  return m;
}

const vague = (s) => {
  const t = (s || '').trim();
  if (!t) return true;
  return /[฀-๿]/.test(t) ? t.length < 10 : t.split(/\s+/).length < 3;
};

export const SHELL_RULES = {
  H001: { sev: 'error', th: 'ยังไม่ได้ระบุ Liveware ตรงกลาง (บุคคล/ตำแหน่งที่วิเคราะห์)', en: 'Central Liveware (the person/role analysed) is empty' },
  H002: { sev: 'warn', th: 'ยังไม่ได้ระบุสถานการณ์หรืองานที่วิเคราะห์', en: 'The task or situation analysed is empty' },
  H003: { sev: 'info', th: 'องค์ประกอบนี้ยังไม่มีรายการ', en: 'No items listed for this component' },
  H004: { sev: 'info', th: 'ยังไม่ได้ประเมิน interface นี้ (unknown)', en: 'Interface not assessed yet' },
  H005: { sev: 'warn', th: 'ระบุว่า mismatch แต่ยังไม่มีข้อค้นพบ', en: 'Marked as mismatch but no finding is written' },
  H006: { sev: 'warn', th: 'ข้อค้นพบนี้ยังไม่มีมาตรการ/การแก้ไข', en: 'Finding has no action' },
  H007: { sev: 'warn', th: 'ข้อค้นพบที่รุนแรง (4–5) ยังไม่มีผู้รับผิดชอบ', en: 'High-severity finding (4–5) has no owner' },
  H008: { sev: 'warn', th: 'ระบุว่า match แต่มีข้อค้นพบอยู่ — สถานะขัดกัน', en: 'Marked as match but findings exist; status conflicts' },
  H009: { sev: 'info', th: 'ข้อความสั้น/กว้างเกินไป', en: 'Text is vague' },
  H010: { sev: 'warn', th: 'ข้อความซ้ำกับรายการอื่นในกลุ่มเดียวกัน', en: 'Duplicate text within the same group' },
};

export function lintShell(m) {
  const out = [];
  const add = (rule, targetId) => out.push({ rule, severity: SHELL_RULES[rule].sev, targetId, th: SHELL_RULES[rule].th, en: SHELL_RULES[rule].en });
  const n = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!m.subject.text.trim()) add('H001', m.subject.id); else if (vague(m.subject.text)) add('H009', m.subject.id);
  if (!m.focus.text.trim()) add('H002', m.focus.id); else if (vague(m.focus.text)) add('H009', m.focus.id);
  COMPONENTS.forEach((c) => {
    if (!m.components[c].length) add('H003', 'sec_' + c);
    const seen = new Set();
    m.components[c].forEach((x) => {
      if (vague(x.text)) add('H009', x.id);
      const k = n(x.text);
      if (k) { if (seen.has(k)) add('H010', x.id); else seen.add(k); }
    });
  });
  INTERFACES.forEach((i) => {
    const f = m.interfaces[i];
    if (f.status === 'unknown') add('H004', 'sec_' + i);
    if (f.status === 'mismatch' && !f.findings.length) add('H005', 'sec_' + i);
    if (f.status === 'match' && f.findings.length) add('H008', 'sec_' + i);
    const seen = new Set();
    f.findings.forEach((x) => {
      if (vague(x.text)) add('H009', x.id);
      if (!x.action.trim()) add('H006', x.id);
      if ((x.severity || 0) >= 4 && !x.owner.trim()) add('H007', x.id);
      const k = n(x.text);
      if (k) { if (seen.has(k)) add('H010', x.id); else seen.add(k); }
    });
  });
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------- layout ----------------
export const SH = { fs: 12, lh: 15, padX: 10, padY: 9, wComp: 230, wCentre: 230, wIface: 250, gap: 34, minH: 50 };

/**
 * Cross layout: other Liveware (left) – LL card – CENTRE – LH card – Hardware (right),
 * Software above (LS card between), Environment below (LE card between).
 */
export function layoutShell(m) {
  const D = SH;
  const lines = (s, w) => wrapText(s || '—', w - 2 * D.padX, D.fs);
  const compBox = (c, label) => {
    const rows = m.components[c].length ? m.components[c].map((x) => '• ' + x.text) : ['—'];
    const ls = rows.flatMap((r) => lines(r, D.wComp));
    return { lines: ls, title: label, h: Math.max(D.minH, (ls.length + 1) * D.lh + 2 * D.padY) };
  };
  const ifaceCard = (key, label) => {
    const f = m.interfaces[key];
    const rows = f.findings.length
      ? f.findings.map((x, i) => `${i + 1}. ${x.text}${x.severity ? ` [sev ${x.severity}]` : ''}${x.action ? ' → ' + x.action : ''}`)
      : [f.status === 'match' ? '✓ match' : f.status === 'mismatch' ? '(no findings written)' : '(not assessed)'];
    const ls = rows.flatMap((r) => lines(r, D.wIface));
    return { lines: ls, title: `${label} · ${f.status.toUpperCase()}${f.findings.length ? ' (' + f.findings.length + ')' : ''}`, status: f.status, h: Math.max(D.minH, (ls.length + 1) * D.lh + 2 * D.padY) };
  };
  const cS = compBox('S', 'S — SOFTWARE');
  const cH = compBox('H', 'H — HARDWARE');
  const cE = compBox('E', 'E — ENVIRONMENT');
  const cL = compBox('L', 'L — OTHER LIVEWARE');
  const iS = ifaceCard('LS', 'L–S');
  const iH = ifaceCard('LH', 'L–H');
  const iE = ifaceCard('LE', 'L–E');
  const iL = ifaceCard('LL', 'L–L');
  const subjL = lines(m.subject.text, D.wCentre);
  const focusL = lines(m.focus.text ? 'งาน/สถานการณ์: ' + m.focus.text : '', D.wCentre);
  const centreH = Math.max(90, (subjL.length + focusL.length + 2) * D.lh + 2 * D.padY);

  const colL = 0;
  const colLL = colL + D.wComp + D.gap;
  const colC = colLL + D.wIface + D.gap;
  const colLH = colC + D.wCentre + D.gap;
  const colH = colLH + D.wIface + D.gap;
  const width = colH + D.wComp;
  const cx = colC + D.wCentre / 2;

  const items = [];
  const links = [];
  let y = 0;
  // top: software box, LS card
  const sx = cx - D.wComp / 2;
  items.push({ id: 'comp_S', kind: 'compS', shape: 'rect', x: sx, y, w: D.wComp, h: cS.h, title: cS.title, lines: cS.lines });
  const sBottom = y + cS.h;
  y = sBottom + D.gap;
  items.push({ id: 'if_LS', kind: 'iface', status: iS.status, shape: 'rect', x: cx - D.wIface / 2, y, w: D.wIface, h: iS.h, title: iS.title, lines: iS.lines });
  links.push({ kind: 'ifl ' + iS.status, d: `M${cx},${sBottom} V${y}` });
  const iSBottom = y + iS.h;
  y = iSBottom + D.gap;
  // middle row
  const midH = Math.max(centreH, cL.h, cH.h, iL.h, iH.h);
  const midC = y + midH / 2;
  items.push({ id: m.subject.id, kind: 'subject', shape: 'rect', x: colC, y: midC - centreH / 2, w: D.wCentre, h: centreH, title: 'L — LIVEWARE (CENTRE)', lines: [...subjL, '', ...focusL] });
  links.push({ kind: 'ifl ' + iS.status, d: `M${cx},${iSBottom} V${midC - centreH / 2}` });
  items.push({ id: 'comp_L', kind: 'compL', shape: 'rect', x: colL, y: midC - cL.h / 2, w: D.wComp, h: cL.h, title: cL.title, lines: cL.lines });
  items.push({ id: 'if_LL', kind: 'iface', status: iL.status, shape: 'rect', x: colLL, y: midC - iL.h / 2, w: D.wIface, h: iL.h, title: iL.title, lines: iL.lines });
  links.push({ kind: 'ifl ' + iL.status, d: `M${colL + D.wComp},${midC} H${colLL}` });
  links.push({ kind: 'ifl ' + iL.status, d: `M${colLL + D.wIface},${midC} H${colC}` });
  items.push({ id: 'if_LH', kind: 'iface', status: iH.status, shape: 'rect', x: colLH, y: midC - iH.h / 2, w: D.wIface, h: iH.h, title: iH.title, lines: iH.lines });
  items.push({ id: 'comp_H', kind: 'compH', shape: 'rect', x: colH, y: midC - cH.h / 2, w: D.wComp, h: cH.h, title: cH.title, lines: cH.lines });
  links.push({ kind: 'ifl ' + iH.status, d: `M${colC + D.wCentre},${midC} H${colLH}` });
  links.push({ kind: 'ifl ' + iH.status, d: `M${colLH + D.wIface},${midC} H${colH}` });
  y += midH + D.gap;
  // bottom: LE card, environment box
  items.push({ id: 'if_LE', kind: 'iface', status: iE.status, shape: 'rect', x: cx - D.wIface / 2, y, w: D.wIface, h: iE.h, title: iE.title, lines: iE.lines });
  links.push({ kind: 'ifl ' + iE.status, d: `M${cx},${midC + centreH / 2} V${y}` });
  const iEBottom = y + iE.h;
  y = iEBottom + D.gap;
  items.push({ id: 'comp_E', kind: 'compE', shape: 'rect', x: cx - D.wComp / 2, y, w: D.wComp, h: cE.h, title: cE.title, lines: cE.lines });
  links.push({ kind: 'ifl ' + iE.status, d: `M${cx},${iEBottom} V${y}` });
  const height = y + cE.h;
  return normalizeGeom({ items, links, width, height });
}

export function outlineShell(m) {
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  out.push(`LIVEWARE (centre): ${m.subject.text}`, `TASK/SITUATION: ${m.focus.text}`, '');
  const label = { S: 'SOFTWARE', H: 'HARDWARE', E: 'ENVIRONMENT', L: 'OTHER LIVEWARE' };
  COMPONENTS.forEach((c) => {
    out.push(`${c} — ${label[c]}`);
    if (!m.components[c].length) out.push('   (none listed)');
    m.components[c].forEach((x) => out.push(`   - ${x.text}`));
  });
  out.push('');
  INTERFACES.forEach((i) => {
    const f = m.interfaces[i];
    out.push(`INTERFACE L–${COMP_OF[i]}: ${f.status.toUpperCase()}`);
    f.findings.forEach((x, k) => out.push(`   ${k + 1}. ${x.text}${x.severity ? ` [severity ${x.severity}]` : ''}\n      action: ${x.action || '(none)'}${x.owner ? ` | owner: ${x.owner}` : ''}`));
  });
  return out.join('\n');
}
