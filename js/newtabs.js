// Safetytool — Analysis tab, table rows and CSV for the HFACS and STAMP/STPA models. Presents analyzeHfacs()/analyzeStamp(); adds no logic.

import * as HF from './hfacs.js';
import * as ST from './stamp.js';

const S = {
  th: {
    hfTitle: 'วิเคราะห์ HFACS', hfNote: 'ตัวเลขนี้คือจำนวนปัจจัยที่ผู้วิเคราะห์เขียนไว้ในแต่ละหมวด ไม่ใช่ความน่าจะเป็นหรือความเสี่ยง และขึ้นกับว่าสืบค้นลึกแค่ไหน',
    byLevel: 'จำนวนปัจจัยตามระดับและหมวด', unclassified: 'ยังไม่จัดหมวด', nothing: 'ระดับที่ยังไม่มีปัจจัย (ยังไม่ได้ตรวจ หรือตรวจแล้วไม่พบ — ไม่ทราบ)', none: 'ไม่มี',
    chains: 'สายเหตุที่ผูกไว้ (จากการกระทำย้อนขึ้นไปหาเงื่อนไขระดับบน)', noChains: 'ยังไม่ได้ผูกปัจจัยระหว่างระดับ', links: 'จำนวนความเชื่อมโยง', noEvidence: 'ปัจจัยที่ยังไม่มีหลักฐาน',
    level: 'ระดับ', cat: 'หมวด', n: 'จำนวน',
    stTitle: 'วิเคราะห์ STPA', stNote: 'ช่องว่างในตาราง = ยังไม่ได้วิเคราะห์ หรือวิเคราะห์แล้วไม่พบ (ไม่ทราบ) ไม่ได้แปลว่าปลอดภัย โมเดลนี้ไม่มีความน่าจะเป็น',
    grid: 'ตาราง UCA: control action × ชนิด', ca: 'Control action', noCa: 'ยังไม่มี control action',
    cov: 'ความครอบคลุม', caNo: 'Control action ที่ยังไม่มี UCA', hzNo: 'Hazard ที่ยังไม่มี UCA', ucNo: 'UCA ที่ยังไม่มี scenario', lsNo: 'Loss ที่ยังไม่มี Hazard',
    counts: 'สรุป',
    rows: { event: 'เหตุการณ์', level: 'ระดับ', cat: 'หมวด' },
  },
  en: {
    hfTitle: 'HFACS analysis', hfNote: 'These numbers count the factors the analyst wrote in each category. They are not probabilities or risk, and they depend on how deep the investigation went.',
    byLevel: 'Factors by level and category', unclassified: 'unclassified', nothing: 'Levels with no factor (not examined, or examined and none found — unknown)', none: 'none',
    chains: 'Linked chains (from an act back up to higher-level conditions)', noChains: 'No factors are linked across levels yet', links: 'Links', noEvidence: 'Factors with no evidence',
    level: 'Level', cat: 'Category', n: 'Count',
    stTitle: 'STPA analysis', stNote: 'An empty cell means not analysed yet, or analysed and none found (unknown); it does not mean safe. This model has no probabilities.',
    grid: 'UCA table: control action × type', ca: 'Control action', noCa: 'No control actions yet',
    cov: 'Coverage', caNo: 'Control actions with no UCA', hzNo: 'Hazards with no UCA', ucNo: 'UCAs with no scenario', lsNo: 'Losses with no hazard',
    counts: 'Summary',
    rows: { event: 'Occurrence', level: 'Level', cat: 'Category' },
  },
};

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const list = (host, arr) => { if (!arr.length) return false; const ul = el('ul', 'sim-list'); arr.forEach((s) => ul.appendChild(el('li', null, s))); host.appendChild(ul); return true; };
const short = (s, n = 60) => { const x = (s || '').trim(); return x ? (x.length > n ? x.slice(0, n) + '…' : x) : '—'; };

export function drawHfacsAnalysis(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  const a = HF.analyzeHfacs(m);
  const codes = HF.factorCodes(m);
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.hfTitle));
  host.appendChild(el('p', 'muted', L.hfNote));
  host.appendChild(el('h3', null, L.byLevel));
  const tbl = el('table', 'sim-table');
  const head = tbl.createTHead().insertRow();
  [L.level, L.cat, L.n].forEach((x) => head.appendChild(el('th', null, x)));
  const tb = tbl.createTBody();
  HF.LEVELS.forEach((lv) => {
    HF.categoriesOf(lv).forEach((c, i) => {
      const r = tb.insertRow();
      r.insertCell().textContent = i === 0 ? `${HF.LEVEL_INFO[lv].n} · ${HF.LEVEL_INFO[lv][ctx.lang]} (${a.byLevel[lv]})` : '';
      r.insertCell().textContent = c[ctx.lang];
      r.insertCell().textContent = String(a.byCategory[c.id]);
    });
  });
  const ur = tb.insertRow(); ur.insertCell().textContent = ''; ur.insertCell().textContent = L.unclassified; ur.insertCell().textContent = String(a.unclassified);
  host.appendChild(tbl);

  host.appendChild(el('h3', null, L.nothing));
  if (!list(host, a.levelsWithNothing.map((lv) => `${HF.LEVEL_INFO[lv].n} · ${HF.LEVEL_INFO[lv][ctx.lang]}`))) host.appendChild(el('p', 'muted', L.none));

  host.appendChild(el('h3', null, L.chains));
  const up = {};
  m.factors.forEach((f) => f.influences.forEach((t) => { (up[t] = up[t] || []).push(f.id); }));
  const label = (id) => { const f = m.factors.find((x) => x.id === id); const c = f && HF.catOf(f.category); return `${codes[id]} ${c ? '(' + c[ctx.lang] + ') ' : ''}${short(f && f.text, 48)}`; };
  const chains = [];
  const walk = (id, trail) => {
    const parents = up[id] || [];
    if (!parents.length) { if (trail.length > 1) chains.push(trail.slice().reverse()); return; }
    parents.forEach((p) => { if (!trail.includes(p)) walk(p, [...trail, p]); });
  };
  m.factors.filter((f) => HF.levelOf(m, f) === 'unsafe-acts').forEach((f) => walk(f.id, [f.id]));
  if (!chains.length) host.appendChild(el('p', 'muted', L.noChains));
  else list(host, chains.map((c) => c.map(label).join('  →  ')));
  host.appendChild(el('p', 'muted', `${L.links}: ${a.links}`));

  host.appendChild(el('h3', null, L.noEvidence));
  if (!list(host, m.factors.filter((f) => f.category && !f.evidence.trim()).map((f) => label(f.id)))) host.appendChild(el('p', 'muted', L.none));
}

export function drawStampAnalysis(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  const a = ST.analyzeStamp(m);
  const codes = ST.stampCodes(m);
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.stTitle));
  host.appendChild(el('p', 'muted', L.stNote));
  host.appendChild(el('h3', null, L.counts));
  host.appendChild(el('p', null, `Losses ${a.counts.losses} · Hazards ${a.counts.hazards} · Control actions ${a.counts.controlActions} · UCAs ${a.counts.ucas} · Scenarios ${a.counts.scenarios}`));

  host.appendChild(el('h3', null, L.grid));
  if (!a.grid.length) host.appendChild(el('p', 'muted', L.noCa));
  else {
    const tbl = el('table', 'sim-table');
    const head = tbl.createTHead().insertRow();
    head.appendChild(el('th', null, L.ca));
    ST.UCA_TYPES.forEach((k) => head.appendChild(el('th', null, ST.UCA_INFO[k][ctx.lang])));
    const tb = tbl.createTBody();
    a.grid.forEach((row) => {
      const act = m.actions.find((x) => x.id === row.actionId);
      const r = tb.insertRow();
      r.insertCell().textContent = `${codes[act.id]} ${short(act.text, 40)}`;
      ST.UCA_TYPES.forEach((k) => {
        const c = r.insertCell();
        if (!row.cells[k].length) { c.textContent = '—'; c.className = 'muted'; return; }
        row.cells[k].forEach((id) => { const u = m.ucas.find((x) => x.id === id); const d = el('div', null, `${codes[id]}: ${short(u.context, 70)}`); c.appendChild(d); });
      });
    });
    host.appendChild(tbl);
  }

  host.appendChild(el('h3', null, L.cov));
  const block = (title, ids, name) => {
    host.appendChild(el('h4', null, title));
    if (!list(host, ids.map(name))) host.appendChild(el('p', 'muted', L.none));
  };
  const nameOf = (id) => { const x = [...m.actions, ...m.hazards, ...m.ucas, ...m.losses].find((y) => y.id === id); return `${codes[id]} ${short(x && (x.text || x.context), 70)}`; };
  block(L.caNo, a.actionsWithoutUca, nameOf);
  block(L.hzNo, a.hazardsWithoutUca, nameOf);
  block(L.ucNo, a.ucasWithoutScenario, nameOf);
  block(L.lsNo, a.lossesWithoutHazard, nameOf);
}

// ---- table rows (the read-only equivalent of the diagram) ----
export function hfacsRows(m, add, rows, lang) {
  const codes = HF.factorCodes(m);
  add('hfEvent', m.event);
  HF.LEVELS.forEach((lv) => {
    HF.categoriesOf(lv).forEach((c) => {
      const fs = m.factors.filter((f) => f.category === c.id);
      if (!fs.length) return;
      rows.push({ id: 'cat_' + c.id, kind: 'hfCell', text: `${HF.LEVEL_INFO[lv].n} · ${c[lang]}`, detail: String(fs.length), indent: 0 });
      fs.forEach((f) => add('hfFactor', f, [codes[f.id], f.evidence ? 'evidence: ' + short(f.evidence, 60) : 'no evidence', f.influences.length ? '→ ' + f.influences.map((x) => codes[x]).join(', ') : ''].filter(Boolean).join(' · '), 1));
    });
  });
  const unc = m.factors.filter((f) => !f.category);
  if (unc.length) { rows.push({ id: 'sec_unclassified', kind: 'hfCell', text: lang === 'th' ? 'ยังไม่จัดหมวด' : 'Unclassified', detail: String(unc.length), indent: 0 }); unc.forEach((f) => add('hfFactor', f, codes[f.id], 1)); }
  return rows;
}

export function stampRows(m, add, rows, lang) {
  const c = ST.stampCodes(m);
  const nm = (id) => { const n = m.nodes.find((x) => x.id === id); return n ? `${c[id]} ${short(n.text, 24)}` : '?'; };
  add('stSystem', m.system);
  m.losses.forEach((x) => add('stLoss', x, c[x.id]));
  m.hazards.forEach((x) => add('stHazard', x, [c[x.id], x.lossIds.length ? '→ ' + x.lossIds.map((l) => c[l]).join(', ') : '', x.constraint ? 'constraint: ' + short(x.constraint, 50) : ''].filter(Boolean).join(' · ')));
  [...m.nodes].sort((a, b) => a.level - b.level).forEach((x) => add(x.role === 'process' ? 'stProcess' : 'stController', x, `${c[x.id]} · L${x.level}`));
  m.actions.forEach((x) => add(x.kind === 'feedback' ? 'stFeedback' : 'stAction', x, `${c[x.id]} · ${nm(x.from)} → ${nm(x.to)}`, 1));
  m.ucas.forEach((u) => {
    const a = m.actions.find((x) => x.id === u.actionId);
    add('stUca', u, `${c[u.id]} · ${ST.UCA_INFO[u.type][lang]} · ${a ? c[a.id] : '?'}${u.hazardIds.length ? ' → ' + u.hazardIds.map((h) => c[h]).join(', ') : ''}`, 1, u.context);
    m.scenarios.filter((s) => s.ucaId === u.id).forEach((s) => add('stScenario', s, c[s.id], 2));
  });
  return rows;
}

const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
export function toCsv(type, m) {
  const rows = [];
  if (type === 'hfacs') {
    const codes = HF.factorCodes(m);
    rows.push(['level', 'category', 'code', 'factor', 'evidence', 'contributed_to'].map(q).join(','));
    m.factors.forEach((f) => { const c = HF.catOf(f.category); rows.push([c ? HF.LEVEL_INFO[c.level].en : '', c ? c.en : '', codes[f.id], f.text, f.evidence, f.influences.map((x) => codes[x]).join(' | ')].map(q).join(',')); });
  } else {
    const c = ST.stampCodes(m);
    rows.push(['uca', 'control_action', 'source', 'target', 'type', 'context', 'hazards', 'controller_constraint', 'scenarios'].map(q).join(','));
    m.ucas.forEach((u) => {
      const a = m.actions.find((x) => x.id === u.actionId);
      const nm = (id) => { const n = m.nodes.find((x) => x.id === id); return n ? n.text : ''; };
      rows.push([c[u.id], a ? a.text : '', a ? nm(a.from) : '', a ? nm(a.to) : '', ST.UCA_INFO[u.type].en, u.context, u.hazardIds.map((h) => c[h]).join(' | '), u.constraint, m.scenarios.filter((s) => s.ucaId === u.id).map((s) => s.text).join(' | ')].map(q).join(','));
    });
  }
  return '﻿' + rows.join('\r\n');
}
