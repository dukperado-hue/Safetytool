// Safetytool — step-by-step guide shown inside the existing Help tab (no extra menu).
// Each step reuses the glossary text from help.js (what / how / example / avoid) and lets the user type the
// element right there. The guide only writes to the model through the mutate() passed in by app.js.

import * as M from './model.js';
import * as SW from './swiss.js';
import * as SH from './shell.js';
import { helpFor } from './help.js';

const T = {
  th: {
    guide: 'คู่มือทีละขั้น', step: 'ขั้นที่', of: 'จาก', back: 'ย้อนกลับ', next: 'ถัดไป', done: 'จบคู่มือ', close: 'ปิดคู่มือ', start: 'เริ่มคู่มือทีละขั้น',
    what: 'คืออะไร', how: 'เขียนอย่างไร', eg: 'ตัวอย่าง (เพื่อประกอบ)', avoid: 'ที่ควรเลี่ยง', yourText: 'ของคุณ', filled: 'กรอกแล้ว', todo: 'ยังไม่ได้กรอก',
    addMore: 'เพิ่ม', placeholder: 'พิมพ์ที่นี่แล้วกด Enter หรือคลิกที่อื่น',
    openSim: 'เปิดแท็บจำลอง (Simulate)', saveGallery: 'บันทึกลงคลังผลงาน', saved: 'บันทึกแล้ว — ดูได้ที่แท็บ "คลังผลงาน"',
    offline: 'ใช้งานได้ทั้งออนไลน์และออฟไลน์: งานถูกบันทึกในเบราว์เซอร์นี้อัตโนมัติ และเก็บเป็นไฟล์ได้ด้วยปุ่ม "บันทึก"',
    needFirst: 'ยังไม่มีรายการให้ผูก — ย้อนกลับไปเพิ่มในขั้นก่อนหน้าก่อน', prevent: 'มาตรการป้องกัน (preventive)', recover: 'มาตรการแก้ไข (recovery)', holeType: 'ชนิดของรู', unclassified: '— ยังไม่ระบุ —', tActive: 'Active failure (ความล้มเหลวหน้างาน)', tLatent: 'Latent condition (เงื่อนไขแฝง)', pickHole: 'รูที่เรียงตัวบนเส้นทาง (เลือกเมื่อข้อเท็จจริงสนับสนุน)', noHole: '— ไม่เลือก —', ifaceStatus: 'สถานะ', stUnknown: 'ไม่ทราบ', stMatch: 'เข้ากัน', stMismatch: 'ไม่เข้ากัน', ctlOf: 'Control', escOf: 'Escalation factor ของ',
  },
  en: {
    guide: 'Step-by-step guide', step: 'Step', of: 'of', back: 'Back', next: 'Next', done: 'Finish guide', close: 'Close guide', start: 'Start the step-by-step guide',
    what: 'What it is', how: 'How to write it', eg: 'Example (illustration only)', avoid: 'Avoid', yourText: 'Yours', filled: 'filled in', todo: 'not filled in yet',
    addMore: 'Add', placeholder: 'Type here, then press Enter or click elsewhere',
    openSim: 'Open the Simulate tab', saveGallery: 'Save to gallery', saved: 'Saved — see the "Gallery" tab',
    offline: 'Works online and offline: your work autosaves in this browser, and the "Save" button downloads a file.',
    needFirst: 'Nothing to attach to yet — go back and add items in an earlier step', prevent: 'preventive controls', recover: 'recovery controls', holeType: 'Hole type', unclassified: '— not set —', tActive: 'Active failure', tLatent: 'Latent condition', pickHole: 'Hole lined up on the trajectory (choose only when the facts support it)', noHole: '— none —', ifaceStatus: 'Status', stUnknown: 'unknown', stMatch: 'match', stMismatch: 'mismatch', ctlOf: 'Control', escOf: 'Escalation factors of',
  },
};

// kind: glossary entry to show; field: single text bound to model path; list: array of items with .text
export const STEPS = {
  bowtie: [
    { id: 'overview', title: { th: 'ภาพรวม: Bowtie อ่านอย่างไร', en: 'Overview: how to read a bowtie' },
      body: { th: 'ตรงกลางคือ Hazard และ Top event ฝั่งซ้ายคือสาเหตุ (Threat) พร้อมมาตรการป้องกัน ฝั่งขวาคือผลที่ตามมา (Consequence) พร้อมมาตรการแก้ไข เราจะสร้างทีละส่วนตามลำดับ: Hazard → Top event → Threat → Consequence → มาตรการ → Escalation → จำลอง', en: 'The centre holds the Hazard and the Top event. The left side shows causes (threats) with preventive controls; the right side shows outcomes (consequences) with recovery controls. We build it in order: Hazard → Top event → Threats → Consequences → Controls → Escalation → Simulate.' },
      done: () => true },
    { id: 'hazard', kind: 'hazard', field: ['hazard', 'text'], done: (m) => !!m.hazard.text.trim() },
    { id: 'topEvent', kind: 'topEvent', field: ['topEvent', 'text'], done: (m) => !!m.topEvent.text.trim() },
    { id: 'threat', kind: 'threat', list: { key: 'threats', add: M.addThreat }, done: (m) => m.threats.some((x) => x.text.trim()) },
    { id: 'consequence', kind: 'consequence', list: { key: 'consequences', add: M.addConsequence }, done: (m) => m.consequences.some((x) => x.text.trim()) },
    { id: 'control', kind: 'control', done: (m) => m.controls.some((c) => c.text.trim()), groups: bowtieControlGroups,
      body: { th: 'เขียน control ของแต่ละ Threat (ฝั่งซ้าย) และแต่ละ Consequence (ฝั่งขวา) ได้ตรงนี้ เรียงจากใกล้ต้นทางไปปลายทาง ส่วนผู้รับผิดชอบ ความเพียงพอ ความน่าเชื่อถือ และสถานะ ตั้งได้โดยคลิก control ในแผนภาพแล้วใช้แท็บ "รายละเอียด"', en: 'Write the controls of each threat (left) and each consequence (right) right here, from the source outward. Owner, adequacy, reliability and state are set by clicking a control in the diagram and using the "Details" tab.' } },
    { id: 'escalation', kind: 'escalation', done: (m) => m.escalations.length > 0, optional: true, groups: bowtieEscalationGroups,
      body: { th: 'เขียน escalation factor ของ control ที่เกี่ยวข้องได้ตรงนี้ (ข้ามได้) มาตรการควบคุมของ escalation factor เพิ่มได้โดยคลิก factor ในแผนภาพแล้วใช้แท็บ "รายละเอียด"', en: 'Write escalation factors for the controls here (optional). To add a control for a factor, click the factor in the diagram and use the "Details" tab.' } },
    { id: 'simulate', done: () => true, action: 'simulate',
      body: { th: 'ตั้งสถานะของแต่ละ control (ทำงาน / เสื่อม / ล้มเหลว / ไม่ทราบ) เพื่อดูว่าเส้นทางใดยังไม่ถูกตัด "ไม่ทราบ" ไม่ได้แปลว่าล้มเหลว ผลนี้เป็นตรรกะของเส้นทาง ไม่ใช่การประเมินความเสี่ยง', en: 'Set each control to effective / degraded / failed / unknown to see which paths are not cut. "Unknown" does not mean failed. The result is path logic, not a risk assessment.' } },
    { id: 'save', done: () => true, action: 'gallery',
      body: { th: 'บันทึกงานลงคลังผลงานเพื่อเปิดกลับมาแก้ได้ และกด "บันทึก" ด้านบนเพื่อเก็บเป็นไฟล์ JSON', en: 'Save your work to the gallery to reopen it later, and use "Save" at the top to download a JSON file.' } },
  ],
  swiss: [
    { id: 'overview', title: { th: 'ภาพรวม: Swiss cheese', en: 'Overview: Swiss cheese' }, body: { th: 'มองระบบเป็นชั้นป้องกันหลายชั้น แต่ละชั้นมีรู (จุดอ่อน) อุบัติเหตุเกิดเมื่อรูเรียงตัวกัน เราจะสร้าง: Hazard → Loss → ชั้นป้องกัน → รู → เส้นทาง', en: 'Defences are layered slices, each with holes (weaknesses); a loss needs the holes to line up. We build: Hazard → Loss → Layers → Holes → Trajectory.' }, done: () => true },
    { id: 'hazard', kind: 'hazard', field: ['hazard', 'text'], done: (m) => !!m.hazard.text.trim() },
    { id: 'loss', kind: 'loss', field: ['loss', 'text'], done: (m) => !!m.loss.text.trim() },
    { id: 'layer', kind: 'layer', list: { key: 'layers', add: (m) => SW.addLayer(m), label: 'name' }, done: (m) => m.layers.length >= 2 },
    { id: 'hole', kind: 'holeLatent', done: (m) => m.layers.some((l) => l.holes.some((h) => h.text.trim())), groups: swissHoleGroups,
      body: { th: 'เขียนรูของแต่ละชั้นตรงนี้ แล้วระบุว่าเป็น active failure หรือ latent condition พยายามหา latent condition เบื้องหลังเสมอ และอย่าชี้ตัวบุคคล (รายละเอียดอื่น เช่น หมวด HFACS ตั้งในแท็บ "ฟอร์มกรอกข้อมูล")', en: 'Write each layer\'s holes here and classify them as active failure or latent condition. Look for the latent conditions behind each failure and avoid blaming individuals. (Other details such as the HFACS level are in the "Data entry form" tab.)' } },
    { id: 'trajectory', done: (m) => m.trajectory.length > 0, trajectory: true,
      body: { th: 'เลือกรูที่เรียงตัวกันเฉพาะเมื่อข้อเท็จจริงสนับสนุน ถ้าไม่มีข้อมูลให้ปล่อยว่าง', en: 'Mark holes as aligned only when the facts support it. If you have no facts, leave it empty.' } },
    { id: 'save', done: () => true, action: 'gallery', body: { th: 'บันทึกงานลงคลังผลงานและกด "บันทึก" เพื่อเก็บเป็นไฟล์', en: 'Save to the gallery and use "Save" to download a file.' } },
  ],
  shell: [
    { id: 'overview', title: { th: 'ภาพรวม: SHELL', en: 'Overview: SHELL' }, body: { th: 'SHELL คือแบบจำลองปัจจัยมนุษย์ มี Liveware (คน) อยู่ตรงกลาง และดูว่าแต่ละส่วน (Software, Hardware, Environment, Liveware อื่น) เข้ากับคนคนนั้นหรือไม่', en: 'SHELL is a human-factors model with Liveware (the person) at the centre. It asks whether each other component (Software, Hardware, Environment, other Liveware) fits that person.' }, done: () => true },
    { id: 'subject', kind: 'subject', field: ['subject', 'text'], done: (m) => !!m.subject.text.trim() },
    { id: 'focus', kind: 'focus', field: ['focus', 'text'], done: (m) => !!m.focus.text.trim() },
    { id: 'components', kind: 'compS', done: (m) => SH.COMPONENTS.some((c) => m.components[c].some((x) => x.text.trim())), groups: shellComponentGroups,
      title: { th: 'ส่วนประกอบรอบตัวบุคคล (S · H · E · L)', en: 'Components around the person (S · H · E · L)' },
      body: { th: 'เขียนสิ่งที่เกี่ยวข้องกับบทบาทนี้ในแต่ละด้าน: Software (ขั้นตอน เช็กลิสต์ กฎ) Hardware (อุปกรณ์ จอ เครื่องมือ) Environment (สภาพแวดล้อมทางกายภาพและองค์กร) และ Liveware อื่น (ทีมงาน ผู้ควบคุม) เขียนเป็นบทบาท ไม่ใช่ชื่อคน', en: 'List what matters for this role in each area: Software (procedures, checklists, rules), Hardware (equipment, displays, tools), Environment (physical and organisational) and other Liveware (crew, controllers). Describe roles, not names.' } },
    { id: 'iface', kind: 'iface', done: (m) => Object.values(m.interfaces).some((i) => i.status !== 'unknown'), groups: shellIfaceGroups,
      body: { th: 'ตั้งสถานะแต่ละ interface (ไม่ทราบ / เข้ากัน / ไม่เข้ากัน) ถ้าไม่เข้ากันให้เขียน finding ตรงนี้ ส่วนความรุนแรง การดำเนินการ และผู้รับผิดชอบ ตั้งในแท็บ "ฟอร์มกรอกข้อมูล" (finding ระดับ 4–5 ต้องมีผู้รับผิดชอบ)', en: 'Set each interface to unknown / match / mismatch. For a mismatch write the finding here; severity, action and owner are set in the "Data entry form" tab (severity 4–5 needs an owner).' } },
    { id: 'save', done: () => true, action: 'gallery', body: { th: 'บันทึกงานลงคลังผลงานและกด "บันทึก" เพื่อเก็บเป็นไฟล์', en: 'Save to the gallery and use "Save" to download a file.' } },
  ],
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let focusId = null;

const short = (t) => { const x = (t || '').trim(); return x ? (x.length > 48 ? x.slice(0, 48) + '…' : x) : '—'; };
// A group = one parent with its own editable items. find(model, id) returns the live node inside the model being mutated.
function bowtieControlGroups(m, L) {
  const mk = (side, parent, label) => ({
    heading: label + ': ' + short(parent.text) + ' — ' + L[side === 'prevent' ? 'prevent' : 'recover'],
    items: M.primaryControlsOf(m, side, parent.id).map((c) => ({ id: c.id, text: c.text, ref: c })),
    add: (x) => M.addControl(x, side, parent.id),
    find: (x, id) => x.controls.find((c) => c.id === id),
  });
  return [...m.threats.map((t) => mk('prevent', t, 'Threat')), ...m.consequences.map((c) => mk('recover', c, 'Consequence'))];
}
function bowtieEscalationGroups(m, L) {
  return m.controls.filter((c) => c.text.trim()).map((c) => ({
    heading: L.escOf + ' ' + short(c.text),
    items: m.escalations.filter((e) => e.controlId === c.id).map((e) => ({ id: e.id, text: e.text, ref: e })),
    add: (x) => M.addEscalation(x, c.id),
    find: (x, id) => x.escalations.find((e) => e.id === id),
  }));
}
function swissHoleGroups(m, L) {
  return m.layers.map((l) => ({
    heading: 'Layer: ' + short(l.name),
    items: l.holes.map((h) => ({ id: h.id, text: h.text, ref: h })),
    add: (x) => SW.addHole(x, l.id),
    find: (x, id) => x.layers.flatMap((y) => y.holes).find((h) => h.id === id),
    extra: (it, ctx) => typeSelect(it, ctx, L),
  }));
}
function shellComponentGroups(m) {
  const names = { S: 'Software (S)', H: 'Hardware (H)', E: 'Environment (E)', L: 'Other Liveware (L)' };
  return SH.COMPONENTS.map((c) => ({
    heading: names[c],
    items: m.components[c].map((x) => ({ id: x.id, text: x.text, ref: x })),
    add: (x) => SH.addItem(x, c),
    find: (x, id) => x.components[c].find((y) => y.id === id),
  }));
}
function shellIfaceGroups(m, L) {
  return SH.INTERFACES.map((k) => ({
    heading: 'Interface ' + k[0] + '–' + k[1],
    head: (ctx) => {
      const sel = el('select', 'guide-input');
      sel.setAttribute('aria-label', L.ifaceStatus + ' ' + k);
      [['unknown', L.stUnknown], ['match', L.stMatch], ['mismatch', L.stMismatch]].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; sel.appendChild(o); });
      sel.value = m.interfaces[k].status;
      sel.addEventListener('change', () => ctx.mutate((x) => { x.interfaces[k].status = sel.value; }));
      return sel;
    },
    items: m.interfaces[k].findings.map((f) => ({ id: f.id, text: f.text, ref: f })),
    add: (x) => SH.addFinding(x, k),
    find: (x, id) => x.interfaces[k].findings.find((f) => f.id === id),
  }));
}
function typeSelect(it, ctx, L) {
  const sel = el('select', 'guide-input');
  sel.setAttribute('aria-label', L.holeType);
  [['', L.unclassified], ['active', L.tActive], ['latent', L.tLatent]].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; sel.appendChild(o); });
  sel.value = it.ref.type || '';
  sel.addEventListener('change', () => ctx.mutate((x) => { const h = x.layers.flatMap((y) => y.holes).find((z) => z.id === it.id); if (h) h.type = sel.value || null; }));
  return sel;
}

/**
 * ctx: { type, model, lang, step, setStep(n), close(), mutate(fn), openSimulate(), saveGallery() -> bool }
 */
export function drawGuide(host, ctx) {
  const L = T[ctx.lang] || T.th;
  const steps = STEPS[ctx.type];
  const i = Math.max(0, Math.min(ctx.step, steps.length - 1));
  const s = steps[i];
  const m = ctx.model;
  const h = s.kind ? helpFor(ctx.type, s.kind, ctx.lang) : null;

  const box = el('section', 'guide');
  box.setAttribute('aria-label', L.guide);
  const top = el('div', 'guide-top');
  top.appendChild(el('strong', null, `${L.guide} · ${L.step} ${i + 1} ${L.of} ${steps.length}`));
  const x = el('button', null, L.close);
  x.type = 'button';
  x.addEventListener('click', ctx.close);
  top.appendChild(x);
  box.appendChild(top);

  const bar = el('div', 'guide-dots');
  steps.forEach((st, k) => {
    const d = el('button', 'guide-dot' + (k === i ? ' on' : '') + (st.done(m) && k !== i ? ' ok' : ''), String(k + 1));
    d.type = 'button';
    d.setAttribute('aria-label', `${L.step} ${k + 1}`);
    if (k === i) d.setAttribute('aria-current', 'step');
    d.addEventListener('click', () => ctx.setStep(k));
    bar.appendChild(d);
  });
  box.appendChild(bar);

  box.appendChild(el('h3', null, s.title ? s.title[ctx.lang] : h ? h.name : ''));
  if (s.body) box.appendChild(el('p', null, s.body[ctx.lang]));
  if (h) {
    [[L.what, h.what], [L.how, h.how], [L.eg, h.eg], [L.avoid, h.avoid]].forEach(([k, v]) => {
      if (!v) return;
      const p = el('p');
      p.append(el('strong', null, k + ': '), document.createTextNode(v));
      box.appendChild(p);
    });
  }

  const field = (id, value, onChange) => {
    const inp = el('textarea', 'guide-input');
    inp.id = id;
    inp.rows = 2;
    inp.value = value || '';
    inp.placeholder = L.placeholder;
    inp.setAttribute('aria-label', L.yourText);
    inp.addEventListener('change', () => { focusId = id; onChange(inp.value); });
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); inp.blur(); } });
    return inp;
  };
  if (s.field) {
    const [a, b] = s.field;
    box.appendChild(field('g-' + a, m[a][b], (v) => ctx.mutate((x2) => { x2[a][b] = v; })));
  }
  if (s.list) {
    const key = s.list.key;
    const prop = s.list.label || 'text';
    m[key].forEach((it) => box.appendChild(field('g-' + it.id, it[prop], (v) => ctx.mutate((x2) => { x2[key].find((y) => y.id === it.id)[prop] = v; }))));
    const add = el('button', null, '+ ' + L.addMore);
    add.type = 'button';
    add.addEventListener('click', () => { const created = []; ctx.mutate((x2) => { created.push(s.list.add(x2)); }); focusId = 'g-' + created[0].id; ctx.refreshGuide(); });
    box.appendChild(add);
  }
  if (s.groups) {
    const groups = s.groups(m, L);
    if (!groups.length) box.appendChild(el('p', 'muted', L.needFirst));
    groups.forEach((g) => {
      box.appendChild(el('h4', 'guide-group', g.heading));
      if (g.head) box.appendChild(g.head(ctx));
      g.items.forEach((it) => {
        box.appendChild(field('g-' + it.id, it.text, (v) => ctx.mutate((x2) => { const node = g.find(x2, it.id); if (node) node.text = v; })));
        if (g.extra) box.appendChild(g.extra(it, ctx));
      });
      const add = el('button', null, '+ ' + L.addMore);
      add.type = 'button';
      add.addEventListener('click', () => { const created = []; ctx.mutate((x2) => { created.push(g.add(x2)); }); focusId = 'g-' + created[0].id; ctx.refreshGuide(); });
      box.appendChild(add);
    });
  }
  if (s.trajectory) {
    if (!m.layers.some((l) => l.holes.length)) box.appendChild(el('p', 'muted', L.needFirst));
    m.layers.filter((l) => l.holes.length).forEach((l) => {
      box.appendChild(el('h4', 'guide-group', 'Layer: ' + short(l.name)));
      const sel = el('select', 'guide-input');
      sel.setAttribute('aria-label', L.pickHole + ' — ' + short(l.name));
      const none = el('option', null, L.noHole); none.value = ''; sel.appendChild(none);
      l.holes.forEach((h) => { const o = el('option', null, short(h.text)); o.value = h.id; sel.appendChild(o); });
      const cur = l.holes.find((h) => m.trajectory.includes(h.id));
      sel.value = cur ? cur.id : '';
      sel.addEventListener('change', () => ctx.mutate((x2) => {
        const layer = x2.layers.find((y) => y.id === l.id);
        const was = layer.holes.find((h) => x2.trajectory.includes(h.id));
        if (was) SW.setAligned(x2, was.id, false);
        if (sel.value) SW.setAligned(x2, sel.value, true);
      }));
      box.appendChild(sel);
    });
  }
  if (s.action === 'simulate' && ctx.type === 'bowtie') {
    const b = el('button', null, L.openSim);
    b.type = 'button';
    b.addEventListener('click', ctx.openSimulate);
    box.appendChild(b);
  }
  if (s.action === 'gallery') {
    const b = el('button', null, L.saveGallery);
    b.type = 'button';
    const msg = el('p', 'muted');
    b.addEventListener('click', () => { msg.textContent = ctx.saveGallery() ? L.saved : ''; });
    box.append(b, msg, el('p', 'muted', L.offline));
  }

  const status = el('p', 'muted guide-status', s.optional && !s.done(m) ? '' : (s.done(m) ? '✓ ' + L.filled : '○ ' + L.todo));
  box.appendChild(status);

  const nav = el('div', 'guide-nav');
  const back = el('button', null, L.back);
  back.type = 'button';
  back.disabled = i === 0;
  back.addEventListener('click', () => ctx.setStep(i - 1));
  const next = el('button', 'primary', i === steps.length - 1 ? L.done : L.next);
  next.type = 'button';
  next.addEventListener('click', () => (i === steps.length - 1 ? ctx.close() : ctx.setStep(i + 1)));
  nav.append(back, next);
  box.appendChild(nav);

  host.appendChild(box);
  if (focusId) { const f = host.querySelector('#' + focusId); if (f) f.focus(); focusId = null; }
}

export const GUIDE_STRINGS = T;
