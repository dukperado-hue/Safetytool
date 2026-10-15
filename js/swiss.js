// Safetytool — Swiss cheese model (schema safetytool.swiss/1). Pure: no DOM.
// Concept: J. Reason's layered-defence model. A hazard reaches a loss only when "holes" (weaknesses) in
// successive defence layers line up. Holes are active failures (unsafe acts, short-lived) or latent
// conditions (design, management, resources, culture — present long before the event).

import { uid, controlsOf } from './model.js';
import { checkEvidence } from './evidence.js';
import { wrapText } from './textmetrics.js';

export const SCHEMA = 'safetytool.swiss/1';
export const HOLE_TYPES = ['active', 'latent'];
// HFACS levels (Shappell & Wiegmann, public framework) — optional classification of a hole's root cause.
export const HFACS_LEVELS = ['unsafe-acts', 'preconditions', 'unsafe-supervision', 'organisational-influences'];
export const LAYER_CATEGORIES = ['organisation', 'supervision', 'preconditions', 'acts', 'engineered', 'procedural', 'other'];

export function emptySwiss() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    hazard: { id: uid('hz'), text: '' },
    loss: { id: uid('ls'), text: '' },
    layers: [],
    trajectory: [], // hole ids that line up, at most one per layer
  };
}

export function addLayer(m, name = '') {
  const l = { id: uid('ly'), name, defence: '', category: null, holes: [], notes: '' };
  m.layers.push(l);
  return l;
}

export function addHole(m, layerId, text = '') {
  const l = m.layers.find((x) => x.id === layerId);
  if (!l) return null;
  const h = { id: uid('ho'), text, type: null, notes: '' };
  l.holes.push(h);
  return h;
}

export function removeLayer(m, id) {
  const l = m.layers.find((x) => x.id === id);
  if (!l) return false;
  const gone = new Set(l.holes.map((h) => h.id));
  m.layers = m.layers.filter((x) => x.id !== id);
  m.trajectory = m.trajectory.filter((h) => !gone.has(h));
  return true;
}

export function removeHole(m, id) {
  m.layers.forEach((l) => { l.holes = l.holes.filter((h) => h.id !== id); });
  m.trajectory = m.trajectory.filter((h) => h !== id);
}

export function moveLayer(m, id, delta) {
  const i = m.layers.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= m.layers.length) return false;
  [m.layers[i], m.layers[j]] = [m.layers[j], m.layers[i]];
  return true;
}

/** Put a hole on (or take it off) the accident trajectory; only one hole per layer is allowed on it. */
export function setAligned(m, holeId, on) {
  const layer = m.layers.find((l) => l.holes.some((h) => h.id === holeId));
  if (!layer) return false;
  const ids = new Set(layer.holes.map((h) => h.id));
  m.trajectory = m.trajectory.filter((h) => !ids.has(h));
  if (on) m.trajectory.push(holeId);
  return true;
}

export function findSwiss(m, id) {
  if (m.hazard.id === id) return { kind: 'hazard', ref: m.hazard };
  if (m.loss.id === id) return { kind: 'loss', ref: m.loss };
  for (const l of m.layers) {
    if (l.id === id) return { kind: 'layer', ref: l };
    const h = l.holes.find((x) => x.id === id);
    if (h) return { kind: h.type === 'latent' ? 'holeLatent' : 'holeActive', ref: h, layer: l };
  }
  return null;
}

export function validateSwiss(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  if (!m.hazard || typeof m.hazard.id !== 'string') errs.push('hazard missing');
  if (!m.loss || typeof m.loss.id !== 'string') errs.push('loss missing');
  if (!Array.isArray(m.layers)) errs.push('layers must be an array');
  if (!Array.isArray(m.trajectory)) errs.push('trajectory must be an array');
  if (errs.length) return errs;
  const ids = new Set([m.hazard.id, m.loss.id]);
  const holeLayer = new Map();
  for (const l of m.layers) {
    if (!l || typeof l.id !== 'string') { errs.push('layer without id'); continue; }
    if (ids.has(l.id)) errs.push('duplicate id: ' + l.id);
    ids.add(l.id);
    if (!Array.isArray(l.holes)) { errs.push('layer ' + l.id + ': holes must be an array'); continue; }
    for (const h of l.holes) {
      if (!h || typeof h.id !== 'string') { errs.push('hole without id'); continue; }
      if (ids.has(h.id)) errs.push('duplicate id: ' + h.id);
      ids.add(h.id);
      holeLayer.set(h.id, l.id);
      if (h.type != null && !HOLE_TYPES.includes(h.type)) errs.push('hole ' + h.id + ': bad type');
    }
  }
  for (const l of m.layers) for (const h of l.holes) {
    if (h.hfacsLevel != null && !HFACS_LEVELS.includes(h.hfacsLevel)) errs.push('hole ' + h.id + ': bad hfacsLevel');
  }
  if (m.evidence || m.assumptions) {
    const holders = [m.hazard, m.loss, ...m.layers, ...m.layers.flatMap((l) => l.holes)];
    errs.push(...checkEvidence(m, holders).errors);
  }
  const used = new Set();
  for (const hid of m.trajectory) {
    if (!holeLayer.has(hid)) errs.push('trajectory: unknown hole ' + hid);
    else if (used.has(holeLayer.get(hid))) errs.push('trajectory: two holes in layer ' + holeLayer.get(hid));
    else used.add(holeLayer.get(hid));
  }
  return errs;
}

export function normalizeSwiss(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.hazard.text = m.hazard.text || '';
  m.loss.text = m.loss.text || '';
  m.layers.forEach((l) => {
    l.name = l.name || '';
    l.defence = l.defence || '';
    if (l.category === undefined) l.category = null;
    if (l.controlId === undefined) l.controlId = null;
    l.holes.forEach((h) => {
      h.text = h.text || '';
      if (h.type === undefined) h.type = null;
      if (h.hfacsLevel === undefined) h.hfacsLevel = null;
      if (h.commonCauseId === undefined) h.commonCauseId = null;
    });
  });
  return m;
}

// ---------------- quality checks ----------------
const vague = (s) => {
  const t = (s || '').trim();
  if (!t) return true;
  return /[฀-๿]/.test(t) ? t.length < 10 : t.split(/\s+/).length < 3;
};

export const SWISS_RULES = {
  S001: { sev: 'error', th: 'ยังไม่ได้ระบุ Hazard', en: 'Hazard is empty' },
  S002: { sev: 'error', th: 'ยังไม่ได้ระบุ Loss (ความสูญเสียปลายทาง)', en: 'Loss (end outcome) is empty' },
  S003: { sev: 'warn', th: 'มีชั้นป้องกันน้อยกว่า 2 ชั้น โมเดล Swiss cheese ต้องมีหลายชั้น', en: 'Fewer than 2 defence layers; the model needs several layers' },
  S004: { sev: 'warn', th: 'ชั้นป้องกันนี้ยังไม่ได้อธิบายว่าป้องกันอะไรและอย่างไร (defence)', en: 'Layer does not say what the defence is or does' },
  S005: { sev: 'info', th: 'ชั้นนี้ยังไม่มีรู (จุดอ่อน) — แข็งแรงจริง หรือยังไม่ได้ตรวจ?', en: 'No holes listed for this layer: truly solid, or not examined?' },
  S006: { sev: 'warn', th: 'รูนี้ยังไม่ได้ระบุว่าเป็น active failure หรือ latent condition', en: 'Hole is not classified as active failure or latent condition' },
  S007: { sev: 'info', th: 'ยังไม่ได้เลือกรูที่เรียงตัวกัน (trajectory) แผนภาพจึงยังไม่แสดงเส้นทางอุบัติเหตุ', en: 'No aligned holes selected, so no accident trajectory is drawn' },
  S008: { sev: 'info', th: 'เส้นทางถูกชั้นนี้ขวางไว้ (ไม่มีรูที่เรียงตัว) — ตรวจว่าตั้งใจให้ชั้นนี้ป้องกันได้', en: 'Trajectory is blocked at this layer (no aligned hole)' },
  S009: { sev: 'info', th: 'ทุกรูเป็น active failure — ลองหา latent conditions เบื้องหลัง (การออกแบบ ทรัพยากร การบริหาร)', en: 'All holes are active failures; look for latent conditions behind them' },
  S010: { sev: 'info', th: 'ข้อความสั้น/กว้างเกินไป', en: 'Text is vague' },
  S011: { sev: 'warn', th: 'ข้อความซ้ำกับรายการอื่นในกลุ่มเดียวกัน', en: 'Duplicate text within the same group' },
  S012: { sev: 'info', th: 'เส้นทางผ่านครบทุกชั้น — ทุกชั้นมีรูเรียงตัวกัน (ความสูญเสียเกิดได้)', en: 'Trajectory passes every layer: all holes line up' },
};

export function lintSwiss(m) {
  const out = [];
  const add = (rule, targetId) => out.push({ rule, severity: SWISS_RULES[rule].sev, targetId, th: SWISS_RULES[rule].th, en: SWISS_RULES[rule].en });
  const n = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  if (!m.hazard.text.trim()) add('S001', m.hazard.id); else if (vague(m.hazard.text)) add('S010', m.hazard.id);
  if (!m.loss.text.trim()) add('S002', m.loss.id); else if (vague(m.loss.text)) add('S010', m.loss.id);
  if (m.layers.length < 2) add('S003', m.hazard.id);

  const names = new Map();
  let allActive = true;
  let anyHole = false;
  m.layers.forEach((l) => {
    const k = n(l.name);
    if (k) { if (names.has(k)) add('S011', l.id); else names.set(k, l.id); }
    if (!l.name.trim() || vague(l.name)) add('S010', l.id);
    if (!l.defence.trim()) add('S004', l.id);
    if (!l.holes.length) add('S005', l.id);
    const seen = new Set();
    l.holes.forEach((h) => {
      anyHole = true;
      if (!h.type) add('S006', h.id);
      if (h.type === 'latent') allActive = false;
      if (vague(h.text)) add('S010', h.id);
      const hk = n(h.text);
      if (hk) { if (seen.has(hk)) add('S011', h.id); else seen.add(hk); }
    });
  });
  if (anyHole && allActive && m.layers.some((l) => l.holes.some((h) => h.type === 'active'))) add('S009', m.hazard.id);

  if (!m.trajectory.length) {
    if (m.layers.length) add('S007', m.loss.id);
  } else {
    let blocked = false;
    m.layers.forEach((l) => {
      if (!l.holes.some((h) => m.trajectory.includes(h.id))) { add('S008', l.id); blocked = true; }
    });
    if (!blocked) add('S012', m.loss.id);
  }
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------- layout (pure geometry; renderer draws it) ----------------
export const SW = { fs: 12, lh: 15, padX: 10, padY: 8, wEnd: 170, wLayer: 190, gap: 30, holeW: 168, slotH: 64, minHole: 40 };

/**
 * Items: {id, kind, shape:'rect'|'ellipse'|'wall', x,y,w,h, title?, lines:[]}. Links: {kind,d}.
 * The accident trajectory is a straight line at axisY through the aligned hole of each layer
 * (a solid wall where the layer holds).
 */
export function layoutSwiss(m) {
  const D = SW;
  const items = [];
  const links = [];
  const textLines = (s, w) => wrapText(s || '—', w - 2 * D.padX, D.fs);
  const boxH = (lines, extra = 0) => Math.max(D.minHole, lines.length * D.lh + 2 * D.padY + extra);
  // holes are ellipses: wrap narrower than the bounding box and leave room for the type label
  const holeLines = (s) => wrapText(s || '—', D.holeW * 0.74 - D.padX, D.fs);
  const holeH = (lines) => Math.max(D.minHole + 14, lines.length * D.lh + 13 + 2 * D.padY + 12);

  const headerBlocks = m.layers.map((l) => {
    const nameL = textLines(l.name, D.wLayer);
    const defL = textLines(l.defence ? '▸ ' + l.defence : '', D.wLayer);
    return { nameL, defL, h: nameL.length * D.lh + defL.length * D.lh + 3 * D.padY };
  });
  const headerH = Math.max(60, ...headerBlocks.map((b) => b.h));
  const axisY = headerH + 16 + D.slotH / 2;

  const hazL = textLines(m.hazard.text, D.wEnd);
  const lossL = textLines(m.loss.text, D.wEnd);
  const hazH = boxH(hazL);
  const lossH = boxH(lossL);

  let x = 0;
  items.push({ id: m.hazard.id, kind: 'hazard', shape: 'rect', x, y: axisY - hazH / 2, w: D.wEnd, h: hazH, title: 'HAZARD', lines: hazL });
  x += D.wEnd + D.gap;
  const startX = D.wEnd;

  const layerRects = [];
  m.layers.forEach((l, i) => {
    const hb = headerBlocks[i];
    const lx = x;
    const aligned = l.holes.find((h) => m.trajectory.includes(h.id)) || null;
    const others = l.holes.filter((h) => h !== aligned);
    // plate (cheese slice) behind everything in the layer
    items.push({ id: l.id, kind: 'layer', shape: 'rect', x: lx, y: 0, w: D.wLayer, h: headerH, title: null, lines: [], nameLines: hb.nameL, defLines: hb.defL });
    let cy = headerH + 16;
    const slotCenter = axisY;
    if (aligned) {
      const lines = holeLines(aligned.text);
      const h = Math.max(D.slotH, holeH(lines));
      items.push({ id: aligned.id, kind: aligned.type === 'latent' ? 'holeLatent' : 'holeActive', shape: 'ellipse', x: lx + (D.wLayer - D.holeW) / 2, y: slotCenter - h / 2, w: D.holeW, h, title: aligned.type ? aligned.type.toUpperCase() : null, lines, aligned: true });
      cy = Math.max(cy + D.slotH, slotCenter + h / 2) + 14;
    } else {
      items.push({ id: l.id + '_wall', kind: 'wall', shape: 'wall', x: lx + D.wLayer / 2 - 7, y: headerH + 12, w: 14, h: D.slotH + 8, title: null, lines: [] });
      cy = headerH + 16 + D.slotH + 14;
    }
    others.forEach((h) => {
      const lines = holeLines(h.text);
      const hh = holeH(lines);
      items.push({ id: h.id, kind: h.type === 'latent' ? 'holeLatent' : 'holeActive', shape: 'ellipse', x: lx + (D.wLayer - D.holeW) / 2, y: cy, w: D.holeW, h: hh, title: h.type ? h.type.toUpperCase() : null, lines, aligned: false });
      cy += hh + 12;
    });
    layerRects.push({ x: lx, bottom: cy, aligned: !!aligned, id: l.id });
    x += D.wLayer + D.gap;
  });
  const lossX = x;
  items.push({ id: m.loss.id, kind: 'loss', shape: 'rect', x: lossX, y: axisY - lossH / 2, w: D.wEnd, h: lossH, title: 'LOSS', lines: lossL });

  // trajectory line: hazard -> through aligned layers -> loss, or stopping at the first wall
  let endX = lossX;
  let blockedAt = null;
  for (const lr of layerRects) { if (!lr.aligned) { blockedAt = lr; break; } }
  if (m.trajectory.length) {
    if (blockedAt) {
      links.push({ kind: 'traj', d: `M${startX},${axisY} H${blockedAt.x + D.wLayer / 2 - 7}` });
      links.push({ kind: 'trajStop', d: `M${blockedAt.x + D.wLayer / 2 + 7},${axisY} H${lossX}` });
    } else {
      links.push({ kind: 'traj', d: `M${startX},${axisY} H${endX}` });
    }
  }

  const H = Math.max(...layerRects.map((l) => l.bottom), axisY + lossH / 2, axisY + hazH / 2) + 10;
  items.filter((i) => i.kind === 'layer').forEach((i) => { i.fullH = H; });
  const width = lossX + D.wEnd;
  return normalizeGeom({ items, links, width, height: H });
}

/** Shift to a 24px margin and return final size (shared by swiss/shell). */
export function normalizeGeom(g, margin = 24) {
  g.items.forEach((i) => { i.x += margin; i.y += margin; });
  g.links.forEach((l) => {
    l.d = l.d.replace(/([MHV])(-?[\d.]+)(?:,(-?[\d.]+))?/g, (all, c, a, b) => {
      if (c === 'M') return `M${Number(a) + margin},${Number(b) + margin}`;
      if (c === 'H') return `H${Number(a) + margin}`;
      return `V${Number(a) + margin}`;
    });
  });
  g.width += 2 * margin;
  g.height += 2 * margin;
  return g;
}

export function outlineSwiss(m) {
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  out.push(`HAZARD: ${m.hazard.text}`, `LOSS: ${m.loss.text}`, '');
  m.layers.forEach((l, i) => {
    out.push(`L${i + 1}. ${l.name}${l.category ? ` [${l.category}]` : ''}`);
    if (l.defence) out.push(`   defence: ${l.defence}`);
    if (!l.holes.length) out.push('   (no holes listed)');
    l.holes.forEach((h, j) => out.push(`   H${i + 1}.${j + 1} [${h.type || 'unclassified'}]${m.trajectory.includes(h.id) ? ' *ALIGNED*' : ''} ${h.text}`));
  });
  out.push('', `TRAJECTORY: ${m.trajectory.length ? m.trajectory.join(' -> ') : '(none selected)'}`);
  return out.join('\n');
}

// ---------------- analysis & bowtie bridge ----------------
/**
 * Cross-layer reading of a Swiss model. `commonCause` lists latent conditions the user has tagged with the
 * same `commonCauseId` in 2+ layers: those layers are NOT independent, so never multiply their reliabilities.
 * Pass the source bowtie to also list holes that come from an escalation factor with no escalation control.
 */
export function analyzeSwiss(m, bowtie = null) {
  const groups = new Map();
  const hfacs = Object.fromEntries(HFACS_LEVELS.map((k) => [k, 0]));
  let unclassified = 0;
  const uncontrolled = new Set(bowtie ? bowtie.escalations.filter((e) => !bowtie.escalationControls.some((x) => x.escalationId === e.id)).map((e) => e.id) : []);
  const uncontrolledHoles = [];
  for (const l of m.layers) {
    for (const h of l.holes) {
      if (h.commonCauseId) {
        if (!groups.has(h.commonCauseId)) groups.set(h.commonCauseId, []);
        groups.get(h.commonCauseId).push({ layerId: l.id, holeId: h.id });
      }
      if (h.hfacsLevel) hfacs[h.hfacsLevel] += 1; else unclassified += 1;
      if (h.escalationId && uncontrolled.has(h.escalationId)) uncontrolledHoles.push({ layerId: l.id, holeId: h.id, escalationId: h.escalationId });
    }
  }
  const commonCause = [...groups].map(([id, hs]) => ({ id, holes: hs, layerIds: [...new Set(hs.map((x) => x.layerId))] })).filter((g) => g.layerIds.length >= 2);
  const blockedAt = m.trajectory.length ? m.layers.filter((l) => !l.holes.some((h) => m.trajectory.includes(h.id))).map((l) => l.id) : null;
  return {
    commonCause,
    hfacs: { counts: hfacs, unclassified },
    uncontrolledHoles,
    layersWithoutHoles: m.layers.filter((l) => !l.holes.length).map((l) => l.id),
    trajectory: { selected: m.trajectory.length > 0, complete: blockedAt ? blockedAt.length === 0 : null, blockedAt },
    note: 'Layers sharing a common cause are not independent. This model is a picture of weaknesses, not a probability.',
  };
}

/**
 * Deep-dive view of a bowtie: one layer per control on a threat's route (and optionally a consequence's recovery
 * route); every escalation factor of that control becomes a latent hole. The trajectory is left EMPTY: only the
 * analyst, using facts, may say which holes lined up.
 */
export function swissFromBowtie(b, { threatId, consequenceId = null }) {
  const m = emptySwiss();
  m.meta.title = (b.meta && b.meta.title ? b.meta.title : '') + ' — Swiss cheese view';
  m.meta.illustrative = !!(b.meta && b.meta.illustrative);
  m.hazard.text = b.hazard.text;
  const cons = consequenceId ? b.consequences.find((c) => c.id === consequenceId) : null;
  m.loss.text = cons ? cons.text : b.topEvent.text;
  const ctrls = controlsOf(b, 'prevent', threatId).concat(consequenceId ? controlsOf(b, 'recover', consequenceId) : []);
  for (const c of ctrls) {
    const layer = addLayer(m, c.text);
    layer.defence = c.text;
    layer.controlId = c.id;
    for (const e of b.escalations.filter((x) => x.controlId === c.id)) {
      const ecs = b.escalationControls.filter((x) => x.escalationId === e.id);
      const h = addHole(m, layer.id, e.text);
      h.type = 'latent';
      h.escalationId = e.id;
      h.notes = ecs.length ? 'Escalation control(s): ' + ecs.map((x) => x.text).join('; ') : 'No escalation control recorded in the bowtie.';
    }
  }
  return m;
}
