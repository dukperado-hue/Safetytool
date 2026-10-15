// Safetytool — "Analysis" tab for Swiss cheese models. Renders analyzeSwiss(); adds no logic of its own.

import { analyzeSwiss, HFACS_LEVELS } from './swiss.js';

const S = {
  th: {
    title: 'วิเคราะห์ Swiss cheese', note: 'ภาพของจุดอ่อน ไม่ใช่ความน่าจะเป็น ชั้นที่มีสาเหตุร่วมกันไม่ได้เป็นอิสระต่อกัน จึงห้ามเอาความน่าเชื่อถือมาคูณกัน',
    traj: 'เส้นทางของอุบัติการณ์ (Trajectory)', noTraj: 'ยังไม่ได้เลือกว่ารูใดเรียงตัวกัน ผู้วิเคราะห์เป็นผู้เลือกจากข้อเท็จจริงเท่านั้น',
    complete: 'เลือกครบทุกชั้นแล้ว', blocked: 'ชั้นที่ยังไม่มีรูบนเส้นทาง',
    cc: 'สาเหตุร่วม (Common cause)', noCc: 'ไม่มีสาเหตุร่วมที่ติดแท็กไว้ใน 2 ชั้นขึ้นไป', layers: 'ชั้น',
    hf: 'ระดับ HFACS ของรู', unclassified: 'ยังไม่จัดระดับ',
    lvl: { 'unsafe-acts': 'Unsafe acts', preconditions: 'Preconditions', 'unsafe-supervision': 'Unsafe supervision', 'organisational-influences': 'Organisational influences' },
    nohole: 'ชั้นที่ยังไม่มีรู', unctl: 'รูที่มาจาก Escalation Factor ที่ Bowtie ยังไม่มีมาตรการควบคุม', none: 'ไม่มี',
    noSrc: 'รายการนี้ต้องใช้ Bowtie ต้นทาง: สร้างมุมมองนี้จากแท็บ Simulate ของ Bowtie ในเซสชันนี้',
    layer: 'ชั้น', hole: 'รู',
  },
  en: {
    title: 'Swiss cheese analysis', note: 'A picture of weaknesses, not a probability. Layers that share a common cause are not independent, so never multiply their reliabilities.',
    traj: 'Event trajectory', noTraj: 'No holes chosen as lined up yet. Only the analyst may choose them, from facts.',
    complete: 'Every layer has a hole on the trajectory', blocked: 'Layers with no hole on the trajectory',
    cc: 'Common cause', noCc: 'No common cause tagged in 2 or more layers', layers: 'layers',
    hf: 'HFACS level of holes', unclassified: 'unclassified',
    lvl: { 'unsafe-acts': 'Unsafe acts', preconditions: 'Preconditions', 'unsafe-supervision': 'Unsafe supervision', 'organisational-influences': 'Organisational influences' },
    nohole: 'Layers without holes', unctl: 'Holes from escalation factors that have no control in the bowtie', none: 'none',
    noSrc: 'This list needs the source bowtie: build the view from the bowtie\'s Simulate tab in this session.',
    layer: 'Layer', hole: 'Hole',
  },
};

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

/** ctx: { lang, bowtie: model|null } */
export function drawSwissAnalysis(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  const a = analyzeSwiss(m, ctx.bowtie || null);
  const layerName = (id) => { const l = m.layers.find((x) => x.id === id); return (l && (l.name || l.defence)) || id; };
  const holeName = (lid, hid) => { const l = m.layers.find((x) => x.id === lid); const h = l && l.holes.find((x) => x.id === hid); return (h && h.text) || hid; };
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.title));
  host.appendChild(el('p', 'muted', L.note));

  host.appendChild(el('h3', null, L.traj));
  if (!a.trajectory.selected) host.appendChild(el('p', 'muted', L.noTraj));
  else if (a.trajectory.complete) host.appendChild(el('p', null, '■ ' + L.complete));
  else {
    host.appendChild(el('p', null, '▲ ' + L.blocked + ':'));
    const ul = el('ul', 'sim-list');
    a.trajectory.blockedAt.forEach((id) => ul.appendChild(el('li', null, layerName(id))));
    host.appendChild(ul);
  }

  host.appendChild(el('h3', null, L.cc));
  if (!a.commonCause.length) host.appendChild(el('p', 'muted', L.noCc));
  a.commonCause.forEach((g) => {
    const box = el('div', 'sim-group');
    box.appendChild(el('strong', null, `${g.id} — ${g.layerIds.length} ${L.layers}`));
    const ul = el('ul', 'sim-list');
    g.holes.forEach((h) => ul.appendChild(el('li', null, `${layerName(h.layerId)} → ${holeName(h.layerId, h.holeId)}`)));
    box.appendChild(ul);
    host.appendChild(box);
  });

  host.appendChild(el('h3', null, L.hf));
  const tbl = el('table', 'sim-table');
  const tb = tbl.createTBody();
  HFACS_LEVELS.forEach((k) => { const r = tb.insertRow(); r.insertCell().textContent = L.lvl[k]; r.insertCell().textContent = String(a.hfacs.counts[k]); });
  const ur = tb.insertRow(); ur.insertCell().textContent = L.unclassified; ur.insertCell().textContent = String(a.hfacs.unclassified);
  host.appendChild(tbl);

  host.appendChild(el('h3', null, L.nohole));
  if (!a.layersWithoutHoles.length) host.appendChild(el('p', 'muted', L.none));
  else { const ul = el('ul', 'sim-list'); a.layersWithoutHoles.forEach((id) => ul.appendChild(el('li', null, layerName(id)))); host.appendChild(ul); }

  host.appendChild(el('h3', null, L.unctl));
  if (!ctx.bowtie) host.appendChild(el('p', 'muted', L.noSrc));
  else if (!a.uncontrolledHoles.length) host.appendChild(el('p', 'muted', L.none));
  else { const ul = el('ul', 'sim-list'); a.uncontrolledHoles.forEach((h) => ul.appendChild(el('li', null, `${layerName(h.layerId)} → ${holeName(h.layerId, h.holeId)}`))); host.appendChild(ul); }
}
