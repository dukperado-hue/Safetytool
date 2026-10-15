// Safetytool — SVG renderers (bowtie, Swiss cheese, SHELL). Output is a standalone SVG with its own <style>,
// so exports look the same as the screen and stay vector (sharp at any print size).

import { layoutBowtie, DIM } from './layout.js';
import { wrapText, setMeasurer, textWidth } from './textmetrics.js';
import { effectivenessBand } from './model.js';
import { layoutSwiss } from './swiss.js';
import { layoutShell } from './shell.js';

const NS = 'http://www.w3.org/2000/svg';
const FONT = 'system-ui,-apple-system,"Segoe UI","Noto Sans Thai","Leelawadee UI",sans-serif';

export const SVG_CSS = `
.st-root{--bg:#ffffff;--ink:#14202e;--muted:#5b6675;--line:#7a8594;
 --haz:#fff6d6;--haz-b:#b8860b;--top:#fde7dc;--top-b:#c0501f;
 --thr:#e6eef8;--thr-b:#3b6ea8;--con:#f6e6f0;--con-b:#8a3b6e;
 --ctl:#ffffff;--ctl-b:#475569;--esc:#efe7fb;--esc-b:#7a55b8;--ecl:#f6f1fd;
 --poor:#c62828;--weak:#b26a00;--fair:#c9a227;--strong:#1e7b45;--none:#6b7785;--sel:#1f5fbf;
 --cheese:#fff3bf;--cheese-b:#c9a227;--act:#fde0e0;--act-b:#c0392b;--lat:#e3e8ff;--lat-b:#4c5fd5;--wall:#6b7480;--traj:#d64545;
 --cS:#e8f3ff;--cH:#e6f6ec;--cE:#fff0dc;--cL:#f1e8fb;--cX:#eef0f3;
 --ok:#1e7b45;--bad:#c62828;--unk:#6b7785;
 --okbg:#e8f5ec;--badbg:#fdeaea;--unkbg:#f4f5f7;--sub:#f8f9fb}
.st-root.dark{--bg:#10151c;--ink:#e6ebf2;--muted:#9aa6b5;--line:#7d8898;
 --haz:#3d3210;--haz-b:#d9a31a;--top:#4a2417;--top-b:#e0673f;
 --thr:#14304f;--thr-b:#5b9be0;--con:#4a1a2a;--con-b:#e0708f;
 --ctl:#1a212b;--ctl-b:#8b97a7;--esc:#2b2142;--esc-b:#a98ae0;--ecl:#241c38;--none:#586270;
 --cheese:#4a3f12;--cheese-b:#d9b640;--act:#4a1f1f;--act-b:#ef7b6e;--lat:#1f2650;--lat-b:#8b9bff;--wall:#9aa6b5;
 --cS:#14304f;--cH:#17382a;--cE:#4a3516;--cL:#2f2147;--cX:#222a35;
 --okbg:#143323;--badbg:#4a1f1f;--unkbg:#222a35;--sub:#1a212b}
.st-bg{fill:var(--bg)}
.st-link{fill:none;stroke:var(--line);stroke-width:1.6}
.st-link.esc{stroke-dasharray:4 3;stroke:var(--esc-b)}
.st-link.haz{stroke-width:2.2}
.st-link.traj{stroke:var(--traj);stroke-width:3.2}
.st-link.trajStop{stroke:var(--traj);stroke-width:2;stroke-dasharray:3 6;opacity:.55}
.st-link.ifl{stroke-width:2.4}
.st-link.match{stroke:var(--ok)}.st-link.mismatch{stroke:var(--bad)}.st-link.unknown{stroke:var(--unk);stroke-dasharray:5 4}
.st-node{cursor:pointer;outline:none}
.st-node rect.box,.st-node ellipse.box{stroke-width:1.6}
.st-node rect.box{rx:8}
.st-node text{font:12px ${FONT};fill:var(--ink)}
.st-node .tag{font-size:10px;fill:var(--muted)}
.st-node .ttl{font-size:10px;font-weight:700;fill:var(--muted);letter-spacing:.03em}
.st-node .nm{font-weight:700}
.st-node.sel rect.box,.st-node.sel ellipse.box,.st-node:focus-visible rect.box{stroke:var(--sel);stroke-width:3}
.k-hazard rect.box{fill:var(--haz);stroke:var(--haz-b)}
.k-topEvent rect.box{fill:var(--top);stroke:var(--top-b);stroke-width:2.2}
.k-threat rect.box{fill:var(--thr);stroke:var(--thr-b)}
.k-consequence rect.box{fill:var(--con);stroke:var(--con-b)}
.k-control rect.box{fill:var(--ctl);stroke:var(--ctl-b)}
.k-control.shared rect.box{stroke-dasharray:6 3}
.k-escalation rect.box{fill:var(--esc);stroke:var(--esc-b)}
.k-escalationControl rect.box{fill:var(--ecl);stroke:var(--esc-b);stroke-dasharray:4 2}
.k-loss rect.box{fill:var(--con);stroke:var(--con-b);stroke-width:2.2}
.k-layer rect.box{fill:var(--cheese);stroke:var(--cheese-b);rx:14}
.k-holeActive ellipse.box{fill:var(--act);stroke:var(--act-b)}
.k-holeLatent ellipse.box{fill:var(--lat);stroke:var(--lat-b)}
.k-wall rect.box{fill:var(--wall);stroke:var(--wall);rx:3}
.k-subject rect.box{fill:var(--top);stroke:var(--top-b);stroke-width:2.2}
.k-compS rect.box{fill:var(--cS);stroke:var(--thr-b)}
.k-compH rect.box{fill:var(--cH);stroke:var(--strong)}
.k-compE rect.box{fill:var(--cE);stroke:var(--weak)}
.k-compL rect.box{fill:var(--cL);stroke:var(--esc-b)}
.k-iface rect.box{fill:var(--cX);stroke:var(--unk);stroke-dasharray:5 3}
.k-iface.match rect.box{stroke:var(--ok);stroke-dasharray:none}
.k-iface.mismatch rect.box{stroke:var(--bad);stroke-dasharray:none;stroke-width:2.2}
.st-node.inert{cursor:default}
.k-banner rect.box,.k-legend rect.box{fill:var(--cX);stroke:var(--line);stroke-width:1}
.k-banner.match rect.box{fill:var(--okbg);stroke:var(--ok)}.k-banner.mismatch rect.box{fill:var(--badbg);stroke:var(--bad)}
.k-holeActive rect.box,.k-holeLatent rect.box{rx:10}
.k-holeActive rect.box{fill:var(--act);stroke:var(--act-b);stroke-width:1.6}
.k-holeLatent rect.box{fill:var(--lat);stroke:var(--lat-b);stroke-width:1.6;stroke-dasharray:5 3}
.k-holeActive.al rect.box,.k-holeLatent.al rect.box{stroke:var(--traj);stroke-width:2.6}
.k-layer rect.box{rx:16}
.k-compS rect.box,.k-compH rect.box,.k-compE rect.box,.k-compL rect.box{fill:var(--bg);stroke-width:1.4}
.k-subject rect.box{fill:var(--bg)}
.k-iface rect.box{fill:var(--bg)}
.pr.sub{fill:var(--sub);stroke:var(--line);stroke-width:1}
.pr.bd{stroke:none}.pr.bd-S{fill:var(--thr-b)}.pr.bd-H{fill:var(--strong)}.pr.bd-E{fill:var(--weak)}.pr.bd-L{fill:var(--esc-b)}
.st-node .bdt{fill:#fff;font-weight:700;font-size:13px}
.st-node .mono{font-family:ui-monospace,"IBM Plex Mono",Consolas,monospace;font-size:10px}
.st-node .act{fill:var(--ink);font-size:11.5px;font-style:italic}
.chip-bg{stroke-width:1}
.chip-bg.chip-match{fill:var(--okbg);stroke:var(--ok)}.chip-bg.chip-bad,.chip-bg.chip-mismatch{fill:var(--badbg);stroke:var(--bad)}.chip-bg.chip-unknown{fill:var(--unkbg);stroke:var(--unk)}
.st-node .chip-tx{font-size:10px;font-weight:700}
.st-node .chip-tx-match{fill:var(--ok)}.st-node .chip-tx-bad,.st-node .chip-tx-mismatch{fill:var(--bad)}.st-node .chip-tx-unknown{fill:var(--unk)}
.pr.lg-act{fill:var(--act);stroke:var(--act-b);stroke-width:1.4}
.pr.lg-lat{fill:var(--lat);stroke:var(--lat-b);stroke-width:1.4;stroke-dasharray:3 2}
.pr.lg-wall{fill:var(--wall);stroke:none}
.pr-line{fill:none}.pr-line.lg-traj{stroke:var(--traj);stroke-width:3}
.bar{stroke:none}
.b-poor{fill:var(--poor)}.b-weak{fill:var(--weak)}.b-fair{fill:var(--fair)}.b-strong{fill:var(--strong)}.b-none{fill:var(--none)}
.crit{fill:var(--top-b);font-weight:700}
.st-title{font:600 14px ${FONT};fill:var(--ink)}
`;

const KIND_LABEL = {
  hazard: 'HAZARD', topEvent: 'TOP EVENT', threat: 'THREAT', consequence: 'CONSEQUENCE',
  control: 'CONTROL', escalation: 'ESCALATION', escalationControl: 'ESC. CONTROL',
  loss: 'LOSS', layer: 'LAYER', holeActive: 'ACTIVE FAILURE', holeLatent: 'LATENT CONDITION', wall: 'DEFENCE HOLDS',
  subject: 'LIVEWARE', compS: 'SOFTWARE', compH: 'HARDWARE', compE: 'ENVIRONMENT', compL: 'OTHER LIVEWARE', iface: 'INTERFACE',
};

const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => { if (v != null) e.setAttribute(k, String(v)); });
  if (parent) parent.appendChild(e);
  return e;
};

/** Use the real font metrics of the browser for wrapping (call once at start-up). */
export function installCanvasMeasurer() {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    const cache = new Map();
    setMeasurer((s, fs) => {
      const key = fs + '|' + s;
      let w = cache.get(key);
      if (w === undefined) {
        ctx.font = `${fs}px ${FONT}`;
        w = ctx.measureText(s).width;
        if (cache.size > 5000) cache.clear();
        cache.set(key, w);
      }
      return w;
    });
  } catch { /* keep the estimate */ }
}

function begin(svg, width, height, opts) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('class', 'st-root' + (opts.dark ? ' dark' : ''));
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`);
  el('style', {}, svg).textContent = SVG_CSS;
  el('rect', { class: 'st-bg', x: 0, y: 0, width: Math.ceil(width), height: Math.ceil(height) }, svg);
  return el('g', { id: 'st-viewport' }, svg);
}

function titleText(svg, model) {
  if (model.meta && model.meta.title) el('text', { class: 'st-title', x: 12, y: 18 }, svg).textContent = model.meta.title;
}

function textBlock(parent, lines, cx, startY, lh, attrs = {}) {
  const t = el('text', Object.assign({ x: cx, 'text-anchor': 'middle' }, attrs), parent);
  lines.forEach((ln, i) => { el('tspan', { x: cx, y: startY + i * lh }, t).textContent = ln; });
  return t;
}

/** Bowtie. opts: showEsc, selectedId, dark, onSelect, forExport, kindTags, explain(kind)->string */
export function renderBowtie(svg, model, opts = {}) {
  const L = layoutBowtie(model, { showEsc: opts.showEsc });
  const g = begin(svg, L.width, L.height, opts);
  L.links.forEach((l) => el('path', { class: 'st-link ' + l.kind, d: l.d }, g));

  L.nodes.forEach((n) => {
    const rid = n.realId || n.id;
    const cls = `st-node k-${n.kind}` + (n.shared ? ' shared' : '') + (opts.selectedId === rid ? ' sel' : '');
    const grp = el('g', { class: cls, 'data-id': n.id, 'data-real': rid, tabindex: opts.forExport ? null : 0, role: opts.forExport ? null : 'button' }, g);
    const text = n.ref.text || '';
    const label = `${KIND_LABEL[n.kind]}${n.shared ? ' (shared)' : ''}: ${text || '(empty)'}`;
    const tip = opts.explain && !opts.forExport ? opts.explain(n.kind) : '';
    el('title', {}, grp).textContent = tip ? `${label}\n— ${tip}` : label;
    if (!opts.forExport) grp.setAttribute('aria-label', label);
    el('rect', { class: 'box', x: n.x, y: n.y, width: n.w, height: n.h, rx: n.kind === 'topEvent' ? Math.min(34, n.h / 2) : null }, grp);
    const lines = wrapText(text || '—', n.w - 2 * DIM.padX, DIM.fs);
    const extra = n.kind === 'control' ? DIM.badgeH : 0;
    const ty = n.y + DIM.tagH + (n.h - DIM.tagH - extra - lines.length * DIM.lh) / 2 + DIM.lh * 0.78;
    textBlock(grp, lines, n.x + n.w / 2, ty, DIM.lh);
    if (n.kind === 'control') {
      const c = n.ref;
      el('rect', { class: 'bar b-' + (effectivenessBand(c) || 'none'), x: n.x + 1, y: n.y + n.h - 5, width: n.w - 2, height: 4, rx: 2 }, grp);
      el('text', { class: 'tag', x: n.x + 8, y: n.y + n.h - 9 }, grp).textContent = (c.function || '').slice(0, 3).toUpperCase();
      if (c.critical) el('text', { class: 'crit', x: n.x + n.w - 8, y: n.y + n.h - 9, 'text-anchor': 'end' }, grp).textContent = '★ critical';
      const lanes = 1 + (Array.isArray(c.sharedWith) ? c.sharedWith.length : 0);
      if (lanes > 1) el('text', { class: 'tag', x: n.x + n.w - 8, y: n.y + 11, 'text-anchor': 'end' }, grp).textContent = (n.shared ? '↗ shared ×' : '⇄ shared ×') + lanes;
    }
    if (n.kind === 'threat' && n.ref.exposure) el('text', { class: 'tag', x: n.x + n.w - 8, y: n.y + 11, 'text-anchor': 'end' }, grp).textContent = 'exp ' + n.ref.exposure;
    if (n.kind === 'consequence' && n.ref.severity) el('text', { class: 'tag', x: n.x + n.w - 8, y: n.y + 11, 'text-anchor': 'end' }, grp).textContent = 'sev ' + n.ref.severity;
    if (opts.kindTags) el('text', { class: 'ttl', x: n.x + 8, y: n.y + 11 }, grp).textContent = KIND_LABEL[n.kind];
    if (!opts.forExport && opts.onSelect) {
      grp.addEventListener('click', (ev) => { ev.stopPropagation(); opts.onSelect(rid, n.kind); });
      grp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); opts.onSelect(rid, n.kind); } });
    }
  });
  titleText(svg, model);
  return { width: L.width, height: L.height, layout: L };
}

/** Draw the positioned primitives a layout attached to an item (text / rect / line / chip). */
function drawPrims(parent, it) {
  it.prims.forEach((p) => {
    if (p.t === 'rect') el('rect', { class: 'pr ' + (p.cls || ''), x: it.x + p.x, y: it.y + p.y, width: p.w, height: p.h, rx: p.rx || 0 }, parent);
    else if (p.t === 'line') el('line', { class: 'pr-line ' + (p.cls || ''), x1: it.x + p.x1, y1: it.y + p.y1, x2: it.x + p.x2, y2: it.y + p.y2 }, parent);
    else if (p.t === 'text') el('text', { class: p.cls || null, x: it.x + p.x, y: it.y + p.y, 'text-anchor': p.anchor || null }, parent).textContent = p.s;
    else if (p.t === 'chip') {
      const w = Math.ceil(textWidth(p.s, 10)) + 14;
      const x0 = p.anchor === 'end' ? it.x + p.x - w : it.x + p.x;
      el('rect', { class: 'chip-bg chip-' + p.cls, x: x0, y: it.y + p.y, width: w, height: 16, rx: 8 }, parent);
      el('text', { class: 'chip-tx chip-tx-' + p.cls, x: x0 + w / 2, y: it.y + p.y + 11.5, 'text-anchor': 'middle' }, parent).textContent = p.s;
    }
  });
}

/** Swiss cheese / SHELL: draws the geometry produced by layoutSwiss/layoutShell. */
function renderGeometry(svg, model, G, opts) {
  const g = begin(svg, G.width, G.height, opts);
  G.links.forEach((l) => el('path', { class: 'st-link ' + l.kind, d: l.d }, g));
  const fs = 12; const lh = 15;
  G.items.forEach((it) => {
    const cls = `st-node k-${it.kind}` + (it.status ? ' ' + it.status : '') + (it.aligned ? ' al' : '') + (it.inert ? ' inert' : '') + (opts.selectedId === it.id ? ' sel' : '');
    const grp = el('g', { class: cls, 'data-id': it.id }, g);
    const label = KIND_LABEL[it.kind] || it.kind;
    const tip = opts.explain && !opts.forExport ? opts.explain(it.kind) : '';
    el('title', {}, grp).textContent = tip ? `${label}\n— ${tip}` : label;
    if (it.prims) {
      el('rect', { class: 'box', x: it.x, y: it.y, width: it.w, height: it.kind === 'layer' ? it.fullH : it.h, rx: it.kind === 'layer' ? 16 : 10 }, grp);
      drawPrims(grp, it);
    } else if (it.shape === 'ellipse') {
      el('ellipse', { class: 'box', cx: it.x + it.w / 2, cy: it.y + it.h / 2, rx: it.w / 2, ry: it.h / 2 }, grp);
    } else {
      el('rect', { class: 'box', x: it.x, y: it.y, width: it.w, height: it.kind === 'layer' ? it.fullH : it.h }, grp);
    }
    if (it.prims) { /* drawn above */ } else if (it.kind === 'layer') {
      const t1 = textBlock(grp, it.nameLines, it.x + it.w / 2, it.y + 8 + lh * 0.8, lh);
      t1.setAttribute('class', 'nm');
      textBlock(grp, it.defLines, it.x + it.w / 2, it.y + 8 + it.nameLines.length * lh + 6 + lh * 0.8, lh);
    } else if (it.shape !== 'wall') {
      const hasTitle = !!it.title;
      const total = it.lines.length * lh + (hasTitle ? 13 : 0);
      let y0 = it.y + (it.h - total) / 2;
      if (hasTitle) { el('text', { class: 'ttl', x: it.x + it.w / 2, y: y0 + 9, 'text-anchor': 'middle' }, grp).textContent = it.title; y0 += 13; }
      textBlock(grp, it.lines, it.x + it.w / 2, y0 + lh * 0.8, lh);
    }
    if (!opts.forExport && opts.onSelect && !it.inert) {
      grp.style.cursor = 'pointer';
      grp.addEventListener('click', (ev) => { ev.stopPropagation(); opts.onSelect(it.id, it.kind); });
    }
    if (opts.kindTags && it.kind === 'layer') el('text', { class: 'ttl', x: it.x + it.w / 2, y: it.y + it.fullH - 8, 'text-anchor': 'middle' }, grp).textContent = 'DEFENCE LAYER';
  });
  titleText(svg, model);
  void fs;
  return { width: G.width, height: G.height, layout: G };
}

export function renderSwiss(svg, model, opts = {}) { return renderGeometry(svg, model, layoutSwiss(model, { lang: opts.lang }), opts); }
export function renderShell(svg, model, opts = {}) { return renderGeometry(svg, model, layoutShell(model), opts); }

/** type: 'bowtie' | 'swiss' | 'shell' */
export function renderModel(svg, type, model, opts = {}) {
  if (type === 'swiss') return renderSwiss(svg, model, opts);
  if (type === 'shell') return renderShell(svg, model, opts);
  return renderBowtie(svg, model, opts);
}

/** Standalone SVG text for download (light theme, no interactivity). */
export function exportSvgString(type, model, opts = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  const { width, height } = renderModel(svg, type, model, { showEsc: opts.showEsc, forExport: true, dark: false, kindTags: !!opts.kindTags, lang: opts.lang });
  svg.setAttribute('width', Math.ceil(width));
  svg.setAttribute('height', Math.ceil(height));
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
}

/** PNG at an explicit pixel scale (default 3x). Large diagrams are capped to stay within canvas limits. */
export async function exportPngBlob(type, model, opts = {}, scale = 3) {
  const svgText = exportSvgString(type, model, opts);
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const MAX = 16000;
    const k = Math.max(1, Math.min(scale, MAX / img.width, MAX / img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d');
    ctx.scale(k, k);
    ctx.drawImage(img, 0, 0);
    return await new Promise((res) => c.toBlob(res, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
