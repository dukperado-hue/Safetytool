// Safetytool — SVG renderer for a laid-out bowtie. Standalone SVG (own <style>) so exports look the same as the screen.

import { layoutBowtie, DIM } from './layout.js';
import { wrapText } from './textmetrics.js';
import { effectivenessBand } from './model.js';

const NS = 'http://www.w3.org/2000/svg';

export const SVG_CSS = `
.st-root{--bg:#ffffff;--ink:#1b2430;--muted:#5b6675;--line:#7a8594;
 --haz:#fff1c2;--haz-b:#c58a00;--top:#ffe0d2;--top-b:#c4411c;
 --thr:#e3eefc;--thr-b:#2b6cb0;--con:#fde4ea;--con-b:#b83254;
 --ctl:#ffffff;--ctl-b:#56616f;--esc:#efe7fb;--esc-b:#7a55b8;--ecl:#f6f1fd;
 --poor:#d64545;--weak:#e8883a;--fair:#e6c230;--strong:#3a9d5d;--none:#b9c0c9;--sel:#0b57d0}
.st-root.dark{--bg:#10151c;--ink:#e6ebf2;--muted:#9aa6b5;--line:#7d8898;
 --haz:#3d3210;--haz-b:#d9a31a;--top:#4a2417;--top-b:#e0673f;
 --thr:#14304f;--thr-b:#5b9be0;--con:#4a1a2a;--con-b:#e0708f;
 --ctl:#1a212b;--ctl-b:#8b97a7;--esc:#2b2142;--esc-b:#a98ae0;--ecl:#241c38;--none:#586270}
.st-bg{fill:var(--bg)}
.st-link{fill:none;stroke:var(--line);stroke-width:1.6}
.st-link.esc{stroke-dasharray:4 3;stroke:var(--esc-b)}
.st-link.haz{stroke-width:2.2}
.st-node{cursor:pointer;outline:none}
.st-node rect.box{stroke-width:1.6;rx:8}
.st-node text{font:12px system-ui,-apple-system,"Segoe UI","Noto Sans Thai","Leelawadee UI",sans-serif;fill:var(--ink)}
.st-node .tag{font-size:10px;fill:var(--muted)}
.st-node.sel rect.box,.st-node:focus-visible rect.box{stroke:var(--sel);stroke-width:3}
.k-hazard rect.box{fill:var(--haz);stroke:var(--haz-b)}
.k-topEvent rect.box{fill:var(--top);stroke:var(--top-b);stroke-width:2.2}
.k-threat rect.box{fill:var(--thr);stroke:var(--thr-b)}
.k-consequence rect.box{fill:var(--con);stroke:var(--con-b)}
.k-control rect.box{fill:var(--ctl);stroke:var(--ctl-b)}
.k-escalation rect.box{fill:var(--esc);stroke:var(--esc-b)}
.k-escalationControl rect.box{fill:var(--ecl);stroke:var(--esc-b);stroke-dasharray:4 2}
.bar{stroke:none}
.b-poor{fill:var(--poor)}.b-weak{fill:var(--weak)}.b-fair{fill:var(--fair)}.b-strong{fill:var(--strong)}.b-none{fill:var(--none)}
.crit{fill:var(--top-b);font-weight:700}
.st-title{font:600 14px system-ui,sans-serif;fill:var(--ink)}
`;

const KIND_LABEL = {
  hazard: 'HAZARD', topEvent: 'TOP EVENT', threat: 'THREAT', consequence: 'CONSEQUENCE',
  control: 'CONTROL', escalation: 'ESCALATION', escalationControl: 'ESC. CONTROL',
};

const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => { if (v != null) e.setAttribute(k, String(v)); });
  if (parent) parent.appendChild(e);
  return e;
};

/**
 * Render into an existing <svg>. Returns {width,height,layout}.
 * @param {SVGSVGElement} svg
 * @param {object} model
 * @param {{showEsc?:boolean, selectedId?:string, dark?:boolean, onSelect?:(id:string)=>void, forExport?:boolean}} opts
 */
export function renderBowtie(svg, model, opts = {}) {
  const L = layoutBowtie(model, { showEsc: opts.showEsc });
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('class', 'st-root' + (opts.dark ? ' dark' : ''));
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(L.width)} ${Math.ceil(L.height)}`);
  const style = el('style', {}, svg);
  style.textContent = SVG_CSS;
  el('rect', { class: 'st-bg', x: 0, y: 0, width: Math.ceil(L.width), height: Math.ceil(L.height) }, svg);
  const g = el('g', { id: 'st-viewport' }, svg);

  L.links.forEach((l) => el('path', { class: 'st-link ' + l.kind, d: l.d }, g));

  L.nodes.forEach((n) => {
    const cls = `st-node k-${n.kind}` + (opts.selectedId === n.id ? ' sel' : '');
    const grp = el('g', { class: cls, 'data-id': n.id, tabindex: opts.forExport ? null : 0, role: opts.forExport ? null : 'button' }, g);
    const text = n.ref.text || '';
    const label = `${KIND_LABEL[n.kind]}: ${text || '(empty)'}`;
    el('title', {}, grp).textContent = label;
    if (!opts.forExport) grp.setAttribute('aria-label', label);
    if (n.kind === 'topEvent') {
      el('rect', { class: 'box', x: n.x, y: n.y, width: n.w, height: n.h, rx: Math.min(34, n.h / 2) }, grp);
    } else {
      el('rect', { class: 'box', x: n.x, y: n.y, width: n.w, height: n.h }, grp);
    }
    const lines = wrapText(text || '—', n.w - 2 * DIM.padX, DIM.fs);
    const extra = n.kind === 'control' ? DIM.badgeH : 0;
    const textBlockH = lines.length * DIM.lh;
    let ty = n.y + (n.h - extra - textBlockH) / 2 + DIM.lh * 0.78;
    const t = el('text', { x: n.x + n.w / 2, 'text-anchor': 'middle' }, grp);
    lines.forEach((ln, i) => {
      const ts = el('tspan', { x: n.x + n.w / 2, y: ty + i * DIM.lh }, t);
      ts.textContent = ln;
    });
    if (n.kind === 'control') {
      const c = n.ref;
      const band = effectivenessBand(c) || 'none';
      el('rect', { class: 'bar b-' + band, x: n.x + 1, y: n.y + n.h - 5, width: n.w - 2, height: 4, rx: 2 }, grp);
      const tag = el('text', { class: 'tag', x: n.x + 8, y: n.y + n.h - 9 }, grp);
      tag.textContent = (c.function || '').slice(0, 3).toUpperCase();
      if (c.critical) {
        const s = el('text', { class: 'crit', x: n.x + n.w - 8, y: n.y + n.h - 9, 'text-anchor': 'end' }, grp);
        s.textContent = '★ critical';
      }
    }
    if (n.kind === 'threat' && n.ref.exposure) {
      const tag = el('text', { class: 'tag', x: n.x + 8, y: n.y + 11 }, grp);
      tag.textContent = 'exp ' + n.ref.exposure;
    }
    if (n.kind === 'consequence' && n.ref.severity) {
      const tag = el('text', { class: 'tag', x: n.x + 8, y: n.y + 11 }, grp);
      tag.textContent = 'sev ' + n.ref.severity;
    }
    if (!opts.forExport && opts.onSelect) {
      grp.addEventListener('click', (ev) => { ev.stopPropagation(); opts.onSelect(n.id); });
      grp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); opts.onSelect(n.id); }
      });
    }
  });

  if (model.meta && model.meta.title) {
    const t = el('text', { class: 'st-title', x: 12, y: 18 }, svg);
    t.textContent = model.meta.title;
  }
  return { width: L.width, height: L.height, layout: L };
}

/** Standalone SVG text for download (light theme, no interactivity). */
export function exportSvgString(model, showEsc) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  const { width, height } = renderBowtie(svg, model, { showEsc, forExport: true, dark: false });
  svg.setAttribute('width', Math.ceil(width));
  svg.setAttribute('height', Math.ceil(height));
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
}

export async function exportPngBlob(model, showEsc, scale = 2) {
  const svgText = exportSvgString(model, showEsc);
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width * scale;
    c.height = img.height * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise((res) => c.toBlob(res, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
