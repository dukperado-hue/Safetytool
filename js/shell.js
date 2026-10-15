// Safetytool — SHELL(L) model (schema safetytool.shell/1). Pure: no DOM.
// Concept: the SHELL model of human factors (Edwards 1972; Hawkins; used in ICAO human-factors guidance):
// the person (Liveware, centre) interacts with Software (procedures, checklists, rules, symbology),
// Hardware (equipment, controls, displays), Environment (physical and organisational) and other
// Liveware (crew, controllers, ground staff). Trouble sits at the interfaces where they do not match.
// NOTE: "Shell" is also the name of a company associated with the bowtie method; this module is the
// human-factors SHELL model. Confirm this is the model you want.

import { uid } from './model.js';
import { wrapText, textWidth } from './textmetrics.js';
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
export const SH = { fs: 12, lh: 15, padX: 12, padY: 10, wComp: 250, wCentre: 250, wIface: 270, gap: 34, minH: 56, headH: 38, subPad: 7, subGap: 6, sumH: 36 };

const STATUS_CHIP = { match: '■ MATCH', mismatch: '▲ MISMATCH', unknown: '? UNKNOWN' };
const SEV = (n) => '●'.repeat(Math.max(0, Math.min(5, n))) + '○'.repeat(5 - Math.max(0, Math.min(5, n)));

/**
 * Cross layout: other Liveware (left) – LL card – CENTRE – LH card – Hardware (right),
 * Software above (LS card between), Environment below (LE card between), a summary strip underneath.
 * Cards carry `prims` (text / rect / chip primitives relative to the card); the renderer only draws them.
 */
export function layoutShell(m) {
  const D = SH;
  const wrap = (s, w) => wrapText(s || '—', w, D.fs);

  const header = (letter, title, right, w) => {
    const p = [
      { t: 'rect', x: D.padX, y: 8, w: 22, h: 22, cls: 'bd bd-' + letter, rx: 5 },
      { t: 'text', x: D.padX + 11, y: 24, s: letter, cls: 'bdt', anchor: 'middle' },
      { t: 'text', x: D.padX + 32, y: 24, s: title, cls: 'nm' },
    ];
    if (right) p.push(right);
    void w;
    return p;
  };

  const compCard = (c, label) => {
    const inner = D.wComp - 2 * D.padX;
    const rows = m.components[c].map((x) => ({ lines: wrap(x.text, inner - 2 * D.subPad) }));
    const prims = header(c, label, { t: 'text', x: D.wComp - D.padX, y: 24, s: rows.length + (rows.length === 1 ? ' item' : ' items'), cls: 'tag', anchor: 'end' }, D.wComp);
    let y = D.headH;
    rows.forEach((r) => {
      const hh = r.lines.length * D.lh + 2 * D.subPad;
      prims.push({ t: 'rect', x: D.padX, y, w: inner, h: hh, cls: 'sub', rx: 6 });
      r.lines.forEach((s, i) => prims.push({ t: 'text', x: D.padX + D.subPad, y: y + D.subPad + D.lh * 0.78 + i * D.lh, s }));
      y += hh + D.subGap;
    });
    if (!rows.length) { prims.push({ t: 'text', x: D.padX, y: D.headH + 14, s: '— none listed', cls: 'tag' }); y += 22; }
    return { prims, h: Math.max(D.minH, y + D.padY - D.subGap) };
  };

  const ifaceCard = (key, label) => {
    const f = m.interfaces[key];
    const inner = D.wIface - 2 * D.padX;
    const n = f.findings.length;
    const prims = [
      { t: 'text', x: D.padX, y: 24, s: label, cls: 'nm' },
      { t: 'chip', x: D.wIface - D.padX, y: 9, s: STATUS_CHIP[f.status] || STATUS_CHIP.unknown, cls: f.status, anchor: 'end' },
    ];
    let y = D.headH;
    if (!n) {
      prims.push({ t: 'text', x: D.padX, y: y + 4, s: f.status === 'match' ? 'no findings — the interface matches' : f.status === 'mismatch' ? '(no findings written yet)' : '(not assessed yet)', cls: 'tag' });
      y += 20;
    }
    f.findings.forEach((x) => {
      const tl = wrap(x.text, inner - 2 * D.subPad);
      const al = x.action ? wrap('→ ' + x.action, inner - 2 * D.subPad) : [];
      const hh = 20 + tl.length * D.lh + (al.length ? 4 + al.length * D.lh : 0) + D.subPad;
      prims.push({ t: 'rect', x: D.padX, y, w: inner, h: hh, cls: 'sub', rx: 6 });
      prims.push({ t: 'text', x: D.padX + D.subPad, y: y + 14, s: SEV(x.severity || 0) + (x.severity ? ' SEV ' + x.severity : ' SEV ?'), cls: 'tag' });
      if (x.owner) prims.push({ t: 'text', x: D.padX + inner - D.subPad, y: y + 14, s: x.owner, cls: 'tag mono', anchor: 'end' });
      tl.forEach((s, i) => prims.push({ t: 'text', x: D.padX + D.subPad, y: y + 20 + D.lh * 0.78 + i * D.lh, s }));
      al.forEach((s, i) => prims.push({ t: 'text', x: D.padX + D.subPad, y: y + 20 + tl.length * D.lh + 4 + D.lh * 0.78 + i * D.lh, s, cls: 'act' }));
      y += hh + D.subGap;
    });
    return { prims, h: Math.max(D.minH, y + D.padY - D.subGap), status: f.status };
  };

  const cS = compCard('S', 'SOFTWARE');
  const cH = compCard('H', 'HARDWARE');
  const cE = compCard('E', 'ENVIRONMENT');
  const cL = compCard('L', 'OTHER LIVEWARE');
  const iS = ifaceCard('LS', 'L–S');
  const iH = ifaceCard('LH', 'L–H');
  const iE = ifaceCard('LE', 'L–E');
  const iL = ifaceCard('LL', 'L–L');

  // centre card: the liveware in focus + the task
  const cin = D.wCentre - 2 * D.padX;
  const subjL = wrap(m.subject.text, cin);
  const focusL = m.focus.text ? wrap(m.focus.text, cin) : [];
  const cPrims = header('L', 'LIVEWARE (CORE)', null, D.wCentre);
  let cy0 = D.headH + 2;
  subjL.forEach((s, i) => cPrims.push({ t: 'text', x: D.padX, y: cy0 + D.lh * 0.78 + i * D.lh, s, cls: 'nm' }));
  cy0 += subjL.length * D.lh + 8;
  if (focusL.length) {
    cPrims.push({ t: 'text', x: D.padX, y: cy0 + 8, s: 'TASK / SITUATION', cls: 'ttl' });
    cy0 += 14;
    focusL.forEach((s, i) => cPrims.push({ t: 'text', x: D.padX, y: cy0 + D.lh * 0.78 + i * D.lh, s }));
    cy0 += focusL.length * D.lh;
  }
  const centreH = Math.max(90, cy0 + D.padY);

  const colL = 0;
  const colLL = colL + D.wComp + D.gap;
  const colC = colLL + D.wIface + D.gap;
  const colLH = colC + D.wCentre + D.gap;
  const colH = colLH + D.wIface + D.gap;
  const width = colH + D.wComp;
  const cx = colC + D.wCentre / 2;

  const items = [];
  const links = [];
  const card = (id, kind, x, y, w, c, extra = {}) => items.push({ id, kind, shape: 'card', x, y, w, h: c.h, lines: [], prims: c.prims, ...extra });
  let y = 0;
  const sx = cx - D.wComp / 2;
  card('comp_S', 'compS', sx, y, D.wComp, cS);
  const sBottom = y + cS.h;
  y = sBottom + D.gap;
  card('if_LS', 'iface', cx - D.wIface / 2, y, D.wIface, iS, { status: iS.status });
  links.push({ kind: 'ifl ' + iS.status, d: `M${cx},${sBottom} V${y}` });
  const iSBottom = y + iS.h;
  y = iSBottom + D.gap;
  const midH = Math.max(centreH, cL.h, cH.h, iL.h, iH.h);
  const midC = y + midH / 2;
  card(m.subject.id, 'subject', colC, midC - centreH / 2, D.wCentre, { prims: cPrims, h: centreH });
  links.push({ kind: 'ifl ' + iS.status, d: `M${cx},${iSBottom} V${midC - centreH / 2}` });
  card('comp_L', 'compL', colL, midC - cL.h / 2, D.wComp, cL);
  card('if_LL', 'iface', colLL, midC - iL.h / 2, D.wIface, iL, { status: iL.status });
  links.push({ kind: 'ifl ' + iL.status, d: `M${colL + D.wComp},${midC} H${colLL}` });
  links.push({ kind: 'ifl ' + iL.status, d: `M${colLL + D.wIface},${midC} H${colC}` });
  card('if_LH', 'iface', colLH, midC - iH.h / 2, D.wIface, iH, { status: iH.status });
  card('comp_H', 'compH', colH, midC - cH.h / 2, D.wComp, cH);
  links.push({ kind: 'ifl ' + iH.status, d: `M${colC + D.wCentre},${midC} H${colLH}` });
  links.push({ kind: 'ifl ' + iH.status, d: `M${colLH + D.wIface},${midC} H${colH}` });
  y += midH + D.gap;
  card('if_LE', 'iface', cx - D.wIface / 2, y, D.wIface, iE, { status: iE.status });
  links.push({ kind: 'ifl ' + iE.status, d: `M${cx},${midC + centreH / 2} V${y}` });
  const iEBottom = y + iE.h;
  y = iEBottom + D.gap;
  card('comp_E', 'compE', cx - D.wComp / 2, y, D.wComp, cE);
  links.push({ kind: 'ifl ' + iE.status, d: `M${cx},${iEBottom} V${y}` });
  y += cE.h + 22;

  // summary strip under the cross
  const counts = { match: 0, mismatch: 0, unknown: 0 };
  let findings = 0;
  INTERFACES.forEach((i) => { counts[m.interfaces[i].status] = (counts[m.interfaces[i].status] || 0) + 1; findings += m.interfaces[i].findings.length; });
  const sp = [{ t: 'text', x: D.padX, y: 23, s: 'INTERFACES', cls: 'ttl' }];
  let px = D.padX + 82;
  [['match', '■ MATCH ' + counts.match], ['mismatch', '▲ MISMATCH ' + counts.mismatch], ['unknown', '? UNKNOWN ' + counts.unknown]].forEach(([k, s]) => {
    sp.push({ t: 'chip', x: px, y: 10, s, cls: k });
    px += textWidth(s, 10) + 12 + 10;
  });
  sp.push({ t: 'text', x: px + 8, y: 23, s: 'FINDINGS ' + findings, cls: 'tag' });
  sp.push({ t: 'text', x: width - D.padX, y: 23, s: 'severity 1 (minor) – 5 (critical)', cls: 'tag', anchor: 'end' });
  items.push({ id: 'shell_summary', kind: 'legend', inert: true, shape: 'card', x: 0, y, w: width, h: D.sumH, lines: [], prims: sp });
  return normalizeGeom({ items, links, width, height: y + D.sumH });
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
