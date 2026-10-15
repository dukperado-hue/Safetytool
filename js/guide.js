// Safetytool — step-by-step guide shown inside the existing Help tab (no extra menu).
// Each step reuses the glossary text from help.js (what / how / example / avoid) and lets the user type the
// element right there. The guide only writes to the model through the mutate() passed in by app.js.

import * as M from './model.js';
import * as SW from './swiss.js';
import { helpFor } from './help.js';

const T = {
  th: {
    guide: 'คู่มือทีละขั้น', step: 'ขั้นที่', of: 'จาก', back: 'ย้อนกลับ', next: 'ถัดไป', done: 'จบคู่มือ', close: 'ปิดคู่มือ', start: 'เริ่มคู่มือทีละขั้น',
    what: 'คืออะไร', how: 'เขียนอย่างไร', eg: 'ตัวอย่าง (เพื่อประกอบ)', avoid: 'ที่ควรเลี่ยง', yourText: 'ของคุณ', filled: 'กรอกแล้ว', todo: 'ยังไม่ได้กรอก',
    addMore: 'เพิ่ม', placeholder: 'พิมพ์ที่นี่แล้วกด Enter หรือคลิกที่อื่น',
    openSim: 'เปิดแท็บจำลอง (Simulate)', saveGallery: 'บันทึกลงคลังผลงาน', saved: 'บันทึกแล้ว — ดูได้ที่แท็บ "คลังผลงาน"',
    offline: 'ใช้งานได้ทั้งออนไลน์และออฟไลน์: งานถูกบันทึกในเบราว์เซอร์นี้อัตโนมัติ และเก็บเป็นไฟล์ได้ด้วยปุ่ม "บันทึก"',
  },
  en: {
    guide: 'Step-by-step guide', step: 'Step', of: 'of', back: 'Back', next: 'Next', done: 'Finish guide', close: 'Close guide', start: 'Start the step-by-step guide',
    what: 'What it is', how: 'How to write it', eg: 'Example (illustration only)', avoid: 'Avoid', yourText: 'Yours', filled: 'filled in', todo: 'not filled in yet',
    addMore: 'Add', placeholder: 'Type here, then press Enter or click elsewhere',
    openSim: 'Open the Simulate tab', saveGallery: 'Save to gallery', saved: 'Saved — see the "Gallery" tab',
    offline: 'Works online and offline: your work autosaves in this browser, and the "Save" button downloads a file.',
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
    { id: 'control', kind: 'control', done: (m) => m.controls.length > 0,
      body: { th: 'คลิก Threat (หรือ Consequence) ในแผนภาพ แล้วใช้แท็บ "รายละเอียด" ด้านขวาเพื่อเพิ่ม control ฝั่ง Threat คือ preventive ฝั่ง Consequence คือ recovery เรียงจากใกล้ต้นทางไปปลายทาง', en: 'Click a threat (or consequence) in the diagram, then use the "Details" tab on the right to add a control. Controls on a threat are preventive; on a consequence they are recovery. Order them from the source outward.' } },
    { id: 'escalation', kind: 'escalation', done: (m) => m.escalations.length > 0, optional: true,
      body: { th: 'คลิก control ในแผนภาพ แล้วเพิ่ม escalation factor ในแท็บ "รายละเอียด" จากนั้นเพิ่มมาตรการควบคุมให้ escalation factor นั้นถ้ามี', en: 'Click a control in the diagram and add an escalation factor in the "Details" tab, then add a control for that factor if one exists.' } },
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
    { id: 'hole', kind: 'holeLatent', done: (m) => m.layers.some((l) => l.holes.length),
      body: { th: 'เพิ่มรูของแต่ละชั้นในแท็บ "ฟอร์มกรอกข้อมูล" แล้วระบุว่าเป็น active failure หรือ latent condition พยายามหา latent condition เบื้องหลังเสมอ และอย่าชี้ตัวบุคคล', en: 'Add each layer\'s holes in the "Data entry form" tab and classify them as active failure or latent condition. Look for the latent conditions behind each failure and avoid blaming individuals.' } },
    { id: 'trajectory', done: (m) => m.trajectory.length > 0,
      body: { th: 'เลือกรูที่เรียงตัวกันเฉพาะเมื่อข้อเท็จจริงสนับสนุน ถ้าไม่มีข้อมูลให้ปล่อยว่าง', en: 'Mark holes as aligned only when the facts support it. If you have no facts, leave it empty.' } },
    { id: 'save', done: () => true, action: 'gallery', body: { th: 'บันทึกงานลงคลังผลงานและกด "บันทึก" เพื่อเก็บเป็นไฟล์', en: 'Save to the gallery and use "Save" to download a file.' } },
  ],
  shell: [
    { id: 'overview', title: { th: 'ภาพรวม: SHELL', en: 'Overview: SHELL' }, body: { th: 'SHELL คือแบบจำลองปัจจัยมนุษย์ มี Liveware (คน) อยู่ตรงกลาง และดูว่าแต่ละส่วน (Software, Hardware, Environment, Liveware อื่น) เข้ากับคนคนนั้นหรือไม่', en: 'SHELL is a human-factors model with Liveware (the person) at the centre. It asks whether each other component (Software, Hardware, Environment, other Liveware) fits that person.' }, done: () => true },
    { id: 'subject', kind: 'subject', field: ['subject', 'text'], done: (m) => !!m.subject.text.trim() },
    { id: 'focus', kind: 'focus', field: ['focus', 'text'], done: (m) => !!m.focus.text.trim() },
    { id: 'iface', kind: 'iface', done: (m) => Object.values(m.interfaces).some((i) => i.status !== 'unknown'),
      body: { th: 'ใน "ฟอร์มกรอกข้อมูล" ตั้งสถานะแต่ละ interface (ไม่ทราบ / เข้ากัน / ไม่เข้ากัน) ถ้าไม่เข้ากันให้บันทึก finding พร้อมการดำเนินการ และผู้รับผิดชอบถ้าระดับสูง', en: 'In the "Data entry form" set each interface to unknown / match / mismatch. For a mismatch record a finding with an action, and an owner if severe.' } },
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

  box.appendChild(el('h3', null, h ? h.name : s.title[ctx.lang]));
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
