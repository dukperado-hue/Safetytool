// Safetytool — "Compare" tab for bowtie models: pinned baseline vs the model being edited.
// Renders what compareBowties() returns. Output is a Path Count Difference, never a "risk reduction".

import { compareBowties } from './bowtie-analysis.js';
import { readWorks } from './gallery.js';
import { localizeMsg } from './msgs.js';

const S = {
  th: {
    title: 'เปรียบเทียบ Baseline กับ Alternative',
    note: 'วิธีใช้: กด "ปักโมเดลนี้เป็น Baseline" แล้วไปแก้โมเดล (เช่น เปลี่ยนสถานะหรือเพิ่ม Barrier) จากนั้นกลับมาดูความต่างที่นี่ ผลคือ "ความต่างของจำนวนเส้นทาง" ไม่ใช่การลดความเสี่ยง',
    pin: 'ปักโมเดลนี้เป็น Baseline', pinned: 'Baseline', alt: 'Alternative (โมเดลที่เปิดอยู่)', clear: 'ล้าง Baseline',
    fromWork: 'หรือใช้งานที่บันทึกไว้เป็น Baseline', pickWork: '— เลือกจากคลังผลงาน —', none: 'ยังไม่มี Baseline',
    heading: 'Path Count Difference (ความต่างของจำนวนเส้นทาง)',
    newlyCut: 'ถูกตัดเพิ่ม', newlyOpen: 'กลับมาไม่ถูกตัด', notCut: 'ไม่ถูกตัดรวม (ต่าง)', paths: 'เส้นทาง',
    colSet: 'ชุด', total: 'ทั้งหมด', cut: 'ถูกตัด', open: 'ยังไม่ถูกตัด', inc: 'สรุปไม่ได้',
    barrierDiff: 'การเปลี่ยนแปลงของ Barrier', assumDiff: 'การเปลี่ยนแปลงของสมมติฐาน', nChanges: 'รายการ',
    status: { effective: 'ทำงาน', degraded: 'เสื่อม', failed: 'ล้มเหลว', unknown: 'ไม่ทราบ' },
    ch: { status: 'เปลี่ยนสถานะ', added: 'เพิ่มใหม่', removed: 'ถูกลบ', edited: 'แก้ข้อความ' },
    colBar: 'Barrier', colChange: 'การเปลี่ยนแปลง', pathsNewlyCut: 'เส้นทางที่ถูกตัดเพิ่ม', pathsNewlyOpen: 'เส้นทางที่กลับมาไม่ถูกตัด',
    onlyBase: 'มีเฉพาะใน Baseline', onlyAlt: 'มีเฉพาะใน Alternative', nothing: 'ไม่มี', warn: 'ข้อควรระวัง',
    same: 'Baseline กับ Alternative ไม่ต่างกัน', cannot: 'เปรียบเทียบไม่ได้: ', needs: 'ต้องมี Threat และ Consequence อย่างน้อยอย่างละ 1 ทั้งสองโมเดล',
    pinnedMsg: 'ปัก Baseline แล้ว', unnamed: '(ไม่มีชื่อ)',
  },
  en: {
    title: 'Compare baseline with alternative',
    note: 'How: press "Pin this model as baseline", then edit the model (change a state, add a barrier) and come back to see the difference. The result is a path count difference, not a risk reduction.',
    pin: 'Pin this model as baseline', pinned: 'Baseline', alt: 'Alternative (the open model)', clear: 'Clear baseline',
    fromWork: 'Or use a saved work as the baseline', pickWork: '— choose from the gallery —', none: 'No baseline yet',
    heading: 'Path Count Difference',
    newlyCut: 'Newly cut', newlyOpen: 'No longer cut', notCut: 'Not cut in total (diff)', paths: 'paths',
    colSet: 'Set', total: 'Total', cut: 'Cut', open: 'Not cut', inc: 'Inconclusive',
    barrierDiff: 'Barrier changes', assumDiff: 'Assumption changes', nChanges: 'changes',
    status: { effective: 'effective', degraded: 'degraded', failed: 'failed', unknown: 'unknown' },
    ch: { status: 'state changed', added: 'added', removed: 'removed', edited: 'text edited' },
    colBar: 'Barrier', colChange: 'Change', pathsNewlyCut: 'Paths newly cut', pathsNewlyOpen: 'Paths no longer cut',
    onlyBase: 'Only in baseline', onlyAlt: 'Only in alternative', nothing: 'none', warn: 'Warnings',
    same: 'Baseline and alternative are identical', cannot: 'Cannot compare: ', needs: 'Both models need at least one threat and one consequence',
    pinnedMsg: 'Baseline pinned', unnamed: '(untitled)',
  },
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const title = (m, L) => (m.meta && m.meta.title) || (m.hazard && m.hazard.text) || L.unnamed;
const clone = (m) => JSON.parse(JSON.stringify(m));

/** Human label for a path key "id>id>id" using node texts from both models. */
function pathLabel(key, names) {
  return key.split('>').map((id) => names.get(id) || id).join(' → ');
}

/**
 * ctx: { lang, baseline: {title, model}|null, setBaseline(obj|null) }
 */
export function drawCompare(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.title));
  host.appendChild(el('p', 'muted', L.note));

  const bar = el('div', 'sim-bar');
  const pin = el('button', 'primary', L.pin);
  pin.type = 'button';
  pin.addEventListener('click', () => ctx.setBaseline({ title: title(m, L), model: clone(m) }));
  bar.appendChild(pin);
  if (ctx.baseline) {
    const clr = el('button', null, L.clear);
    clr.type = 'button';
    clr.addEventListener('click', () => ctx.setBaseline(null));
    bar.appendChild(clr);
  }
  host.appendChild(bar);

  const works = readWorks().filter((w) => w.type === 'bowtie');
  if (works.length) {
    const lab = el('label', 'muted', L.fromWork + ': ');
    const sel = el('select');
    sel.id = 'cmp-work';
    lab.htmlFor = 'cmp-work';
    const o0 = el('option', null, L.pickWork); o0.value = ''; sel.appendChild(o0);
    works.forEach((w) => { const o = el('option', null, w.title || w.id); o.value = w.id; sel.appendChild(o); });
    sel.addEventListener('change', () => {
      const w = works.find((x) => x.id === sel.value);
      if (w) ctx.setBaseline({ title: w.title || title(w.model, L), model: clone(w.model) });
    });
    host.append(lab, sel);
  }

  if (!ctx.baseline) { host.appendChild(el('p', 'muted', L.none)); return; }
  const base = ctx.baseline.model;

  const names = new Map();
  [base, m].forEach((x) => {
    [x.hazard, x.topEvent, ...x.threats, ...x.consequences].forEach((n) => n && names.set(n.id, n.text || n.id));
  });
  const ctlNames = new Map();
  [base, m].forEach((x) => x.controls.forEach((c) => ctlNames.set(c.id, c.text || c.id)));

  const row = el('div', 'cmp-heads');
  const b1 = el('div', 'cmp-head'); b1.append(el('strong', null, L.pinned), el('span', null, ctx.baseline.title));
  const b2 = el('div', 'cmp-head'); b2.append(el('strong', null, L.alt), el('span', null, title(m, L)));
  row.append(b1, b2);
  host.appendChild(row);

  const ok = (x) => x.threats.length && x.consequences.length;
  if (!ok(base) || !ok(m)) { host.appendChild(el('p', null, L.needs)); return; }
  const r = compareBowties(base, m);
  if (!r.ok) { host.appendChild(el('p', 'sim-err', L.cannot + r.errors.slice(0, 3).join('; '))); return; }
  const d = r.diff;

  if (d.notes.length) {
    const w = el('div', 'callout cmp-warn');
    w.appendChild(el('strong', null, '▲ ' + L.warn));
    const ul = el('ul', 'sim-list');
    d.notes.forEach((n) => ul.appendChild(el('li', null, localizeMsg(n, ctx.lang))));
    w.appendChild(ul);
    host.appendChild(w);
  }

  host.appendChild(el('h3', null, L.heading));
  const cards = el('div', 'cmp-cards');
  const card = (cls, icon, label, n) => {
    const c = el('div', 'cmp-card sim-' + cls);
    c.append(el('span', 'cmp-n', (n > 0 ? '+' : '') + n), el('span', null, `${icon} ${label}`), el('span', 'muted', L.paths));
    return c;
  };
  cards.appendChild(card('cut', '■', L.newlyCut, d.newlyCut.length));
  cards.appendChild(card('open', '▲', L.newlyOpen, d.newlyOpen.length));
  cards.appendChild(card('inconclusive', '?', L.notCut, d.pathCount.notCutDifference));
  host.appendChild(cards);

  const tbl = el('table', 'sim-table');
  const h = tbl.createTHead().insertRow();
  [L.colSet, L.total, L.cut, L.open, L.inc].forEach((t) => h.appendChild(el('th', null, t)));
  const tb = tbl.createTBody();
  [[L.pinned, d.pathCount.baseline], [L.alt, d.pathCount.alternative]].forEach(([name, s]) => {
    const tr = tb.insertRow();
    [name, s.total, s.cut, s.open, s.inconclusive].forEach((v) => tr.insertCell().textContent = String(v));
  });
  host.appendChild(tbl);

  const list = (heading, keys, cls) => {
    host.appendChild(el('h3', null, `${heading} (${keys.length})`));
    if (!keys.length) { host.appendChild(el('p', 'muted', L.nothing)); return; }
    const ul = el('ul', 'sim-list');
    keys.forEach((k) => { const li = el('li', cls, pathLabel(k, names)); ul.appendChild(li); });
    host.appendChild(ul);
  };

  host.appendChild(el('h3', null, `${L.barrierDiff} (${d.barrierChanges.length} ${L.nChanges})`));
  if (!d.barrierChanges.length) host.appendChild(el('p', 'muted', L.nothing));
  else {
    const bt = el('table', 'sim-table');
    const bh = bt.createTHead().insertRow();
    [L.colBar, L.colChange].forEach((t) => bh.appendChild(el('th', null, t)));
    const bb = bt.createTBody();
    d.barrierChanges.forEach((c) => {
      const tr = bb.insertRow();
      tr.insertCell().textContent = ctlNames.get(c.id) || c.id;
      const st = (v) => L.status[v] || v || '—';
      tr.insertCell().textContent = c.change === 'status' ? `${L.ch.status}: ${st(c.from)} → ${st(c.to)}` : `${L.ch[c.change]}${c.to ? ': ' + st(c.to) : ''}`;
    });
    host.appendChild(bt);
  }
  if (d.assumptionChanges.length) {
    host.appendChild(el('h3', null, `${L.assumDiff} (${d.assumptionChanges.length})`));
    const ul = el('ul', 'sim-list');
    d.assumptionChanges.forEach((c) => ul.appendChild(el('li', null, `${c.id}: ${L.ch[c.change]}`)));
    host.appendChild(ul);
  }

  list(L.pathsNewlyCut, d.newlyCut, 'sim-cut-text');
  list(L.pathsNewlyOpen, d.newlyOpen, 'sim-open-text');
  if (d.structureChanged) { list(L.onlyBase, d.onlyBaseline, null); list(L.onlyAlt, d.onlyAlternative, null); }
  if (!d.barrierChanges.length && !d.assumptionChanges.length && !d.structureChanged) host.appendChild(el('p', 'muted', L.same));
}
