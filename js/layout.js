// Safetytool — automatic bowtie layout. Pure: model in, positioned nodes + link paths out.
// Left side: threats -> preventive controls -> top event. Right side: top event -> recovery controls -> consequences.

import { wrapText } from './textmetrics.js';
import { controlsOf, primaryControlsOf, isSharedIn } from './model.js';

// tagH = card header row (code + chip), badgeH = footer row of a control (owner + strength segments)
export const DIM = {
  fs: 12, lh: 15, padX: 10, padY: 9,
  wThreat: 190, wCtrl: 176, wTop: 230, wCons: 190, wHaz: 250, wEsc: 176,
  gapX: 46, gapY: 16, badgeH: 20, tagH: 22, minH: 56, hazGap: 70, margin: 24, escGap: 10,
};

/** Display codes (TH-01, CT-03 …) follow the order on the diagram; they are derived, never stored. */
export function bowtieCodes(m) {
  const code = {};
  const pad = (n) => String(n + 1).padStart(2, '0');
  m.threats.forEach((x, i) => { code[x.id] = 'TH-' + pad(i); });
  m.consequences.forEach((x, i) => { code[x.id] = 'CO-' + pad(i); });
  let k = 0;
  m.threats.forEach((t) => primaryControlsOf(m, 'prevent', t.id).forEach((c) => { code[c.id] = 'CT-' + pad(k++); }));
  m.consequences.forEach((c0) => primaryControlsOf(m, 'recover', c0.id).forEach((c) => { code[c.id] = 'CT-' + pad(k++); }));
  m.escalations.forEach((x, i) => { code[x.id] = 'EF-' + pad(i); });
  m.escalationControls.forEach((x, i) => { code[x.id] = 'EC-' + pad(i); });
  code[m.hazard.id] = 'HZ-01';
  code[m.topEvent.id] = 'TE-01';
  return code;
}

const r1 = (v) => Math.round(v * 10) / 10;

function boxH(text, w, extra = 0) {
  const n = wrapText(text, w - 2 * DIM.padX, DIM.fs).length;
  return Math.max(DIM.minH, n * DIM.lh + 2 * DIM.padY + extra + DIM.tagH);
}

/**
 * @param {object} m model
 * @param {{showEsc?:boolean}} opts
 * @returns {{nodes:object[], links:object[], width:number, height:number}}
 */
export function layoutBowtie(m, opts = {}) {
  const D = DIM;
  const showEsc = !!opts.showEsc;
  const nodes = [];
  const links = [];
  const codes = bowtieCodes(m);

  const stackFor = (c) => {
    const items = [];
    if (!showEsc) return items;
    m.escalations.filter((e) => e.controlId === c.id).forEach((e) => {
      items.push({ kind: 'escalation', ref: e, h: boxH(e.text, D.wEsc) });
      m.escalationControls.filter((x) => x.escalationId === e.id).forEach((x) => {
        items.push({ kind: 'escalationControl', ref: x, h: boxH(x.text, D.wEsc) });
      });
    });
    return items;
  };

  // Build row descriptors for one side.
  const rows = (list, side, wEnd, endKind) => list.map((end) => {
    const ctrls = controlsOf(m, side, end.id).map((c) => {
      const h = boxH(c.text, D.wCtrl, D.badgeH);
      const shared = isSharedIn(c, end.id);
      const stack = shared ? [] : stackFor(c); // escalation factors are drawn once, under the control's own lane
      const stackH = stack.reduce((s, it) => s + it.h + D.escGap, 0);
      return { c, h, stack, stackH, shared };
    });
    const he = boxH(end.text, wEnd);
    const A = Math.max(he, ...ctrls.map((x) => x.h), D.minH) / 2;
    const rowH = Math.max(A + he / 2, ...ctrls.map((x) => A + x.h / 2 + x.stackH), 0);
    return { end, endKind, he, ctrls, A, rowH };
  });

  const L = rows(m.threats, 'prevent', D.wThreat, 'threat');
  const R = rows(m.consequences, 'recover', D.wCons, 'consequence');
  const maxPrev = Math.max(0, ...L.map((r) => r.ctrls.length));
  const maxRec = Math.max(0, ...R.map((r) => r.ctrls.length));
  const colW = D.wCtrl + D.gapX;

  const x0 = D.wThreat + D.gapX;
  const leftEnd = maxPrev > 0 ? x0 + maxPrev * colW - D.gapX : D.wThreat;
  const topX = leftEnd + 2 * D.gapX;
  const rightStart = topX + D.wTop + 2 * D.gapX;
  const consX = maxRec > 0 ? rightStart + maxRec * colW : rightStart;

  const sumH = (rs) => rs.reduce((s, r) => s + r.rowH, 0) + Math.max(0, rs.length - 1) * D.gapY;
  const HL = sumH(L);
  const HR = sumH(R);
  const topH = Math.max(boxH(m.topEvent.text, D.wTop), 90);
  const H = Math.max(HL, HR, topH);
  const topCy = H / 2;

  const place = (rs, offsetY, side) => {
    let y = offsetY;
    rs.forEach((r) => {
      const axis = y + r.A;
      const endX = side === 'left' ? 0 : consX;
      const endW = side === 'left' ? D.wThreat : D.wCons;
      nodes.push({ id: r.end.id, kind: r.endKind, x: endX, y: axis - r.he / 2, w: endW, h: r.he, ref: r.end, code: codes[r.end.id] });
      const n = r.ctrls.length;
      r.ctrls.forEach((cc, k) => {
        const col = side === 'left' ? maxPrev - n + k : k;
        const cx = side === 'left' ? x0 + col * colW : rightStart + col * colW;
        const cy = axis - cc.h / 2;
        nodes.push({ id: cc.shared ? cc.c.id + '@' + r.end.id : cc.c.id, realId: cc.c.id, shared: cc.shared || undefined, kind: 'control', x: cx, y: cy, w: D.wCtrl, h: cc.h, ref: cc.c, code: codes[cc.c.id] });
        let sy = cy + cc.h;
        let prevId = cc.c.id;
        let prevBottom = sy;
        cc.stack.forEach((it) => {
          const ny = prevBottom + D.escGap;
          nodes.push({ id: it.ref.id, kind: it.kind, x: cx, y: ny, w: D.wEsc, h: it.h, ref: it.ref, code: codes[it.ref.id] });
          links.push({ kind: 'esc', seg: [['M', cx + D.wEsc / 2, prevBottom], ['V', ny]], from: prevId, to: it.ref.id });
          prevId = it.ref.id;
          prevBottom = ny + it.h;
        });
      });
      // main path
      if (side === 'left') {
        const startX = D.wThreat;
        links.push({ kind: 'path', from: r.end.id, to: m.topEvent.id,
          seg: [['M', startX, axis], ['H', leftEnd], ['C', leftEnd + D.gapX, axis, topX - D.gapX, topCy, topX, topCy]] });
      } else {
        links.push({ kind: 'path', from: m.topEvent.id, to: r.end.id,
          seg: [['M', topX + D.wTop, topCy], ['C', topX + D.wTop + D.gapX, topCy, rightStart - D.gapX, axis, rightStart, axis], ['H', consX]] });
      }
      y += r.rowH + D.gapY;
    });
  };
  place(L, (H - HL) / 2, 'left');
  place(R, (H - HR) / 2, 'right');

  const hazH = boxH(m.hazard.text, D.wHaz);
  const hazY = topCy - topH / 2 - D.hazGap - hazH;
  nodes.push({ id: m.hazard.id, kind: 'hazard', x: topX + D.wTop / 2 - D.wHaz / 2, y: hazY, w: D.wHaz, h: hazH, ref: m.hazard, code: codes[m.hazard.id] });
  nodes.push({ id: m.topEvent.id, kind: 'topEvent', x: topX, y: topCy - topH / 2, w: D.wTop, h: topH, ref: m.topEvent, code: codes[m.topEvent.id] });
  links.push({ kind: 'haz', from: m.hazard.id, to: m.topEvent.id, seg: [['M', topX + D.wTop / 2, hazY + hazH], ['V', topCy - topH / 2]] });

  // normalise to positive coordinates
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
  });
  const dx = D.margin - minX;
  const dy = D.margin - minY;
  nodes.forEach((n) => { n.x += dx; n.y += dy; });
  links.forEach((l) => {
    l.d = l.seg.map(([cmd, ...n]) => {
      if (cmd === 'H') return 'H' + r1(n[0] + dx);
      if (cmd === 'V') return 'V' + r1(n[0] + dy);
      return cmd + n.map((v, k) => r1(v + (k % 2 === 0 ? dx : dy))).join(' ');
    }).join(' ');
    delete l.seg;
  });

  return { nodes, links, width: maxX - minX + 2 * D.margin, height: maxY - minY + 2 * D.margin };
}
