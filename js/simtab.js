// Safetytool — "Simulate" tab for bowtie models. Renders what js/bowtie-analysis.js returns; adds no logic of its own.
// Barrier states are written into the model (control.status / control.degradedLogic) through app.js mutate(),
// so they are saved, undoable and exported with the file.

import { controlsOf } from './model.js';
import { simulateBowtie, assuranceRegister } from './bowtie-analysis.js';

const S = {
  th: {
    title: 'จำลองสถานการณ์ (What-if)',
    note: 'โมเดลเชิงตรรกะ ไม่ใช่การประเมินความเสี่ยง: ตั้งสถานะ Barrier เองเพื่อดูว่าเส้นทางใดยังไม่ถูกตัด "ไม่ทราบ" ไม่ได้แปลว่าล้มเหลว และ "ยังไม่ถูกตัด" ไม่ได้แปลว่าจะเกิดเหตุ',
    threats: 'Threat → Top Event (Preventive)', consequences: 'Top Event → Consequence (Recovery)', paths: 'เส้นทางทั้งหมด',
    topEvent: 'Top Event', reach: { yes: 'ไปถึงได้ (มี Threat ที่ยังไม่ถูกตัด)', possible: 'อาจไปถึง (ยังสรุปไม่ได้)', no: 'ไม่ถึงผ่าน Threat ที่ระบุ' },
    result: { cut: 'ถูกตัด', open: 'ยังไม่ถูกตัด', inconclusive: 'สรุปไม่ได้' },
    status: { effective: 'ทำงาน (effective)', degraded: 'เสื่อม (degraded)', failed: 'ล้มเหลว (failed)', unknown: 'ไม่ทราบ (unknown)' },
    logic: { '': 'ระบุ logic…', blocks: 'ยังตัดเส้นทางได้', fails: 'ถือว่าล้มเหลว' }, logicLabel: 'logic เมื่อเสื่อม',
    stateOf: 'สถานะของ', noControls: '(ไม่มี Barrier — เส้นทางนี้เปิดอยู่)', fragile: 'ตัดด้วย Barrier ตัวเดียวที่ Escalation Factor ยังไม่มีมาตรการควบคุม',
    summary: (s) => `ทั้งหมด ${s.total} เส้นทาง · ถูกตัด ${s.cut} · ยังไม่ถูกตัด ${s.open} · สรุปไม่ได้ ${s.inconclusive}`,
    warnings: 'ข้อควรระวัง', limits: 'ข้อจำกัดของโมเดล', unctl: 'Escalation Factor ที่ยังไม่มีมาตรการควบคุม',
    setAll: 'ตั้งทุก Barrier เป็น', resetAll: 'รีเซ็ตเป็น "ไม่ทราบ"', col: { threat: 'Threat', cons: 'Consequence', res: 'ผล', why: 'เหตุผล' },
    empty: 'ต้องมีอย่างน้อย 1 Threat และ 1 Consequence จึงจะจำลองได้', err: 'จำลองไม่ได้: ', gaps: 'ช่องว่างของ Barrier (ตามข้อมูลที่กรอก)', noGaps: 'ไม่มีช่องว่างที่บันทึก',
  },
  en: {
    title: 'What-if simulation',
    note: 'A logical model, not a risk assessment: set barrier states yourself to see which paths are not cut. "Unknown" does not mean failed, and "not cut" does not mean an event will happen.',
    threats: 'Threat → Top Event (preventive)', consequences: 'Top Event → Consequence (recovery)', paths: 'All paths',
    topEvent: 'Top event', reach: { yes: 'reachable (a threat is not cut)', possible: 'possibly reachable (inconclusive)', no: 'not reached via the modelled threats' },
    result: { cut: 'cut', open: 'not cut', inconclusive: 'inconclusive' },
    status: { effective: 'effective', degraded: 'degraded', failed: 'failed', unknown: 'unknown' },
    logic: { '': 'choose logic…', blocks: 'still cuts the path', fails: 'treated as failed' }, logicLabel: 'logic when degraded',
    stateOf: 'State of', noControls: '(no barriers — this route is open)', fragile: 'cut by a single barrier whose escalation factor has no control',
    summary: (s) => `${s.total} paths · cut ${s.cut} · not cut ${s.open} · inconclusive ${s.inconclusive}`,
    warnings: 'Warnings', limits: 'Model limitations', unctl: 'Escalation factors without a control',
    setAll: 'Set every barrier to', resetAll: 'Reset to "unknown"', col: { threat: 'Threat', cons: 'Consequence', res: 'Result', why: 'Reason' },
    empty: 'Add at least one threat and one consequence to simulate', err: 'Cannot simulate: ', gaps: 'Barrier assurance gaps (from entered data only)', noGaps: 'No gaps recorded',
  },
};
const ICON = { cut: '■', open: '▲', inconclusive: '?' }; // shape + text + colour: never colour alone

let pendingFocus = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const badge = (L, result) => el('span', 'sim-badge sim-' + result, `${ICON[result]} ${L.result[result]}`);
const short = (s, n = 70) => ((s || '').length > n ? s.slice(0, n - 1) + '…' : s || '—');

function controlRow(L, c, api) {
  const row = el('div', 'sim-ctl');
  row.appendChild(el('span', 'sim-ctl-text', short(c.text, 90)));
  const sel = el('select');
  sel.id = 'sim-st-' + c.id;
  sel.setAttribute('aria-label', `${L.stateOf} ${short(c.text, 40)}`);
  Object.keys(L.status).forEach((k) => {
    const o = el('option', null, L.status[k]);
    o.value = k;
    sel.appendChild(o);
  });
  sel.value = c.status || 'unknown';
  sel.addEventListener('change', () => {
    pendingFocus = sel.id;
    api.mutate((m) => {
      const x = m.controls.find((y) => y.id === c.id);
      x.status = sel.value;
      if (sel.value !== 'degraded') x.degradedLogic = null;
    });
  });
  row.appendChild(sel);
  if ((c.status || 'unknown') === 'degraded') {
    const lg = el('select');
    lg.id = 'sim-lg-' + c.id;
    lg.setAttribute('aria-label', `${L.logicLabel}: ${short(c.text, 40)}`);
    Object.keys(L.logic).forEach((k) => { const o = el('option', null, L.logic[k]); o.value = k; lg.appendChild(o); });
    lg.value = c.degradedLogic || '';
    lg.addEventListener('change', () => {
      pendingFocus = lg.id;
      api.mutate((m) => { m.controls.find((y) => y.id === c.id).degradedLogic = lg.value || null; });
    });
    row.appendChild(lg);
  }
  return row;
}

function group(L, title, result, reason, controls, api) {
  const g = el('div', 'sim-group');
  const h = el('div', 'sim-group-head');
  h.appendChild(el('strong', null, short(title, 110)));
  h.appendChild(badge(L, result));
  g.appendChild(h);
  if (!controls.length) g.appendChild(el('div', 'muted', L.noControls));
  controls.forEach((c) => g.appendChild(controlRow(L, c, api)));
  g.appendChild(el('div', 'muted sim-reason', reason));
  return g;
}

export function drawSimulate(host, m, { lang, mutate }) {
  const L = S[lang] || S.th;
  const api = { mutate };
  const top = host.scrollTop;
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.title));
  host.appendChild(el('p', 'muted', L.note));

  const bar = el('div', 'sim-bar');
  bar.appendChild(el('span', null, L.setAll + ':'));
  ['effective', 'failed'].forEach((st) => {
    const b = el('button', null, L.status[st]);
    b.type = 'button';
    b.addEventListener('click', () => mutate((x) => x.controls.forEach((c) => { c.status = st; c.degradedLogic = null; })));
    bar.appendChild(b);
  });
  const reset = el('button', null, L.resetAll);
  reset.type = 'button';
  reset.addEventListener('click', () => mutate((x) => x.controls.forEach((c) => { c.status = 'unknown'; c.degradedLogic = null; })));
  bar.appendChild(reset);
  host.appendChild(bar);

  if (!m.threats.length || !m.consequences.length) {
    host.appendChild(el('p', null, L.empty));
    return;
  }
  const r = simulateBowtie(m);
  if (!r.ok) {
    host.appendChild(el('p', 'sim-err', L.err + r.errors.slice(0, 3).join('; ')));
    return;
  }
  const run = r.run;

  host.appendChild(el('h3', null, L.threats));
  run.threats.forEach((t) => host.appendChild(group(L, t.text, t.result, t.reason, controlsOf(m, 'prevent', t.id), api)));

  const te = el('div', 'sim-te');
  te.appendChild(el('strong', null, `${L.topEvent}: ${short(run.topEvent.text, 100)}`));
  te.appendChild(el('span', 'sim-badge sim-te-' + run.topEvent.reach, L.reach[run.topEvent.reach]));
  host.appendChild(te);

  host.appendChild(el('h3', null, L.consequences));
  run.consequences.forEach((c) => host.appendChild(group(L, c.text, c.result, c.reason, controlsOf(m, 'recover', c.id), api)));

  host.appendChild(el('h3', null, `${L.paths} — ${L.summary(run.summary)}`));
  const table = el('table', 'sim-table');
  const head = table.createTHead().insertRow();
  [L.col.threat, L.col.cons, L.col.res, L.col.why].forEach((c) => head.appendChild(el('th', null, c)));
  const tb = table.createTBody();
  const text = (arr, id) => (arr.find((x) => x.id === id) || {}).text;
  run.paths.forEach((p) => {
    const tr = tb.insertRow();
    tr.insertCell().textContent = short(text(run.threats, p.threatId), 50);
    tr.insertCell().textContent = short(text(run.consequences, p.consequenceId), 50);
    tr.insertCell().appendChild(badge(L, p.result));
    const why = tr.insertCell();
    why.textContent = p.reason + (p.fragileCut ? ' ⚠ ' + L.fragile : '');
  });
  host.appendChild(table);

  if (run.warnings.length) {
    host.appendChild(el('h3', null, L.warnings));
    const ul = el('ul', 'sim-list');
    run.warnings.forEach((w) => ul.appendChild(el('li', null, w)));
    host.appendChild(ul);
  }
  if (run.uncontrolledEscalations.length) {
    host.appendChild(el('h3', null, L.unctl));
    const ul = el('ul', 'sim-list');
    run.uncontrolledEscalations.forEach((u) => ul.appendChild(el('li', null, u.text)));
    host.appendChild(ul);
  }
  host.appendChild(el('h3', null, L.gaps));
  const gaps = assuranceRegister(m).filter((x) => x.gaps.length);
  if (!gaps.length) host.appendChild(el('p', 'muted', L.noGaps));
  else {
    const ul = el('ul', 'sim-list');
    gaps.slice(0, 12).forEach((x) => ul.appendChild(el('li', null, `${x.critical ? '★ ' : ''}${short(x.text, 60)} — ${x.gaps.join('; ')}`)));
    host.appendChild(ul);
  }
  host.appendChild(el('h3', null, L.limits));
  const ul = el('ul', 'sim-list muted');
  run.limitations.forEach((x) => ul.appendChild(el('li', null, x)));
  host.appendChild(ul);
  host.appendChild(el('p', 'muted', run.id));

  host.scrollTop = top;
  if (pendingFocus) { const f = host.querySelector('#' + pendingFocus); if (f) f.focus(); pendingFocus = null; }
}
