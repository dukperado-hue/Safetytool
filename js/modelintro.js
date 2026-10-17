// Safetytool — small explanatory pictures of the Bowtie and Swiss cheese models. Drawn for this tool (plain shapes and text), so no
// third-party image or licence is involved. Static markup with no user data; shown on demand in the Help tab.
const FONT = '"Sarabun",system-ui,sans-serif';

const TEXT = {
  bowtie: {
    th: { title: 'Bowtie: Threat → Barrier → เหตุการณ์สำคัญ → Barrier → ผลที่ตามมา', cap: 'ซ้ายคือการป้องกัน (ไม่ให้เกิดเหตุการณ์สำคัญ) ขวาคือการกู้คืน (ลดผลที่ตามมา) Barrier คือสิ่งที่ขวางเส้นทาง ภาพนี้เป็นตัวอย่างโครงสร้าง ไม่ใช่ข้อมูลจริง',
      hz: 'Hazard', th1: 'Threat', b1: 'Barrier', te: 'Top event', b2: 'Barrier', cq: 'Consequence' },
    en: { title: 'Bowtie: Threat → Barrier → Top event → Barrier → Consequence', cap: 'Left is prevention (stop the top event), right is recovery (limit the consequence). A barrier is something standing in the path. This picture shows the structure only; it is not real data.',
      hz: 'Hazard', th1: 'Threat', b1: 'Barrier', te: 'Top event', b2: 'Barrier', cq: 'Consequence' },
  },
  swiss: {
    th: { title: 'Swiss cheese: ชั้นป้องกันที่มีรู', cap: 'แต่ละแผ่นคือชั้นป้องกัน รูคือจุดอ่อน (ล้มเหลวขณะปฏิบัติ หรือเงื่อนไขแฝง) เหตุเกิดเมื่อรูในหลายชั้นเรียงตรงกันพอดี ภาพนี้เป็นตัวอย่างโครงสร้าง ไม่ใช่ข้อมูลจริง', hz: 'Hazard', ls: 'Loss', l: 'ชั้นที่' },
    en: { title: 'Swiss cheese: defence layers with holes', cap: 'Each slice is a defence layer. A hole is a weakness (active failure or latent condition). An event gets through only when holes in several layers line up. This picture shows the structure only; it is not real data.', hz: 'Hazard', ls: 'Loss', l: 'Layer' },
  },
};

const box = (x, y, w, h, fill, stroke, label, dash) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"${dash ? ' stroke-dasharray="5 3"' : ''}/><text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="14" font-family='${FONT}' fill="#14202e">${label}</text>`;
const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="2" marker-end="url(#ar)"/>`;
const DEFS = '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>';

function bowtie(L) {
  return `${DEFS}
${box(120, 4, 96, 28, '#fff6d6', '#b8860b', L.hz)}
${arrow(168, 32, 168, 56)}
${box(4, 66, 66, 36, '#e6eef8', '#3b6ea8', L.th1)}
${arrow(70, 84, 92, 84)}
${box(94, 66, 66, 36, '#ffffff', '#475569', L.b1)}
${arrow(160, 84, 182, 84)}
${box(184, 62, 92, 44, '#fde7dc', '#c0501f', L.te)}
${arrow(276, 84, 298, 84)}
${box(300, 66, 66, 36, '#ffffff', '#475569', L.b2)}
${arrow(366, 84, 388, 84)}
${box(390, 66, 86, 36, '#f6e6f0', '#8a3b6e', L.cq)}`;
}

function swiss(L) {
  const slice = (x, hole) => `<rect x="${x}" y="14" width="46" height="100" rx="10" fill="#ffe680" stroke="#b8860b" stroke-width="2"/><ellipse cx="${x + 23}" cy="${hole}" rx="11" ry="15" fill="#ffffff" stroke="#b8860b" stroke-width="1.5"/>`;
  return `${DEFS}
${box(4, 50, 70, 32, '#fff6d6', '#b8860b', L.hz)}
${slice(110, 40)}${slice(190, 88)}${slice(270, 62)}${slice(350, 64)}
<text x="133" y="130" text-anchor="middle" font-size="13" font-family='${FONT}' fill="#5b6675">${L.l} 1</text><text x="213" y="130" text-anchor="middle" font-size="13" font-family='${FONT}' fill="#5b6675">${L.l} 2</text><text x="293" y="130" text-anchor="middle" font-size="13" font-family='${FONT}' fill="#5b6675">${L.l} 3</text><text x="373" y="130" text-anchor="middle" font-size="13" font-family='${FONT}' fill="#5b6675">${L.l} 4</text>
${arrow(76, 66, 108, 66)}
<path d="M80 66 L133 40 L213 88 L293 62 L373 64 L410 64" fill="none" stroke="#d64545" stroke-width="2.5" stroke-dasharray="6 3" marker-end="url(#ar)"/>
${box(414, 50, 64, 32, '#f6e6f0', '#8a3b6e', L.ls)}`;
}

/** Returns { title, caption, svg } for 'bowtie' or 'swiss'; null for other models. */
export function modelExample(type, lang) {
  const T = TEXT[type];
  if (!T) return null;
  const L = T[lang] || T.th;
  const body = type === 'bowtie' ? bowtie(L) : swiss(L);
  const h = type === 'bowtie' ? 112 : 140;
  return { title: L.title, caption: L.cap, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 ${h}" role="img" aria-label="${L.title.replace(/"/g, '')}" style="width:100%;height:auto;background:#fff;border:1px solid #d8dce2;border-radius:8px">${body}</svg>` };
}
