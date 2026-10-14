// Safetytool — browser UI for the bowtie editor.
import * as M from './model.js';
import { lint, summarize } from './lint.js';
import { renderBowtie, exportSvgString, exportPngBlob } from './render.js';
import { STR } from './i18n.js';

const $ = (s) => document.querySelector(s);
const KEY = 'safetytool.bowtie.current';
const PREF = 'safetytool.prefs';

const state = {
  model: M.emptyModel(),
  selectedId: null,
  showEsc: true,
  lang: 'th',
  dark: false,
  tab: 'diagram',
  undo: [],
  redo: [],
  view: { x: 0, y: 0, k: 1 },
  last: null,
};

const t = (k) => k.split('.').reduce((o, p) => (o ? o[p] : undefined), STR[state.lang]) ?? k;

// ---------- persistence (all wrapped: storage can be unavailable) ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

function save() { lsSet(KEY, JSON.stringify(state.model)); }
function savePrefs() { lsSet(PREF, JSON.stringify({ lang: state.lang, dark: state.dark, showEsc: state.showEsc })); }

// ---------- mutations with undo ----------
function snapshot() {
  state.undo.push(JSON.stringify(state.model));
  if (state.undo.length > 100) state.undo.shift();
  state.redo = [];
}
function mutate(fn, { rebuildInspector = false } = {}) {
  snapshot();
  fn(state.model);
  M.touch(state.model);
  save();
  refresh({ inspector: rebuildInspector });
}
function restore(json) {
  state.model = JSON.parse(json);
  if (!M.findNode(state.model, state.selectedId || '')) state.selectedId = null;
  save();
  refresh({ inspector: true });
}
function doUndo() { if (!state.undo.length) return; state.redo.push(JSON.stringify(state.model)); restore(state.undo.pop()); }
function doRedo() { if (!state.redo.length) return; state.undo.push(JSON.stringify(state.model)); restore(state.redo.pop()); }

function loadModel(m, { keepUndo = false } = {}) {
  const errs = M.validateShape(m);
  if (errs.length) { alert(t('badFile') + errs.slice(0, 5).join('; ')); return false; }
  if (!keepUndo) { state.undo = []; state.redo = []; }
  state.model = M.normalize(m);
  state.selectedId = null;
  save();
  refresh({ inspector: true, fit: true });
  return true;
}

// ---------- rendering ----------
function stageSize() {
  const r = $('#stage').getBoundingClientRect();
  return { w: Math.max(200, r.width), h: Math.max(200, r.height) };
}

function applyView() {
  const g = $('#st-viewport');
  if (g) g.setAttribute('transform', `translate(${state.view.x} ${state.view.y}) scale(${state.view.k})`);
}

function fitView() {
  if (!state.last) return;
  const { w, h } = stageSize();
  const k = Math.min(w / state.last.width, h / state.last.height, 1.4);
  state.view.k = k;
  state.view.x = (w - state.last.width * k) / 2;
  state.view.y = (h - state.last.height * k) / 2;
  applyView();
}

function drawDiagram({ fit = false } = {}) {
  const svg = $('#svg');
  const { w, h } = stageSize();
  state.last = renderBowtie(svg, state.model, {
    showEsc: state.showEsc, selectedId: state.selectedId, dark: state.dark,
    onSelect: (id) => { state.selectedId = id; refresh({ inspector: true }); },
  });
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  if (fit) fitView(); else applyView();
}

function drawLint() {
  const issues = lint(state.model);
  const s = summarize(issues);
  const box = $('#lint');
  box.textContent = '';
  const head = document.createElement('div');
  head.className = 'lint-head';
  head.textContent = `${t('quality')} — ${s.error} ${t('errors')} · ${s.warn} ${t('warns')} · ${s.info} ${t('infos')}`;
  box.appendChild(head);
  if (!issues.length) {
    const ok = document.createElement('p');
    ok.className = 'muted';
    ok.textContent = t('noIssues');
    box.appendChild(ok);
    return;
  }
  const ul = document.createElement('ul');
  issues.forEach((i) => {
    const li = document.createElement('li');
    li.className = 'sev-' + i.severity;
    const b = document.createElement('button');
    b.type = 'button';
    const node = M.findNode(state.model, i.targetId);
    const label = node ? `${t('kind.' + node.kind)}${node.ref.text ? ': ' + node.ref.text.slice(0, 40) : ''}` : '';
    b.textContent = `[${i.rule}] ${i[state.lang]}${label ? ' — ' + label : ''}`;
    b.addEventListener('click', () => { state.selectedId = i.targetId; refresh({ inspector: true }); });
    li.appendChild(b);
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

function drawTable() {
  const m = state.model;
  const host = $('#table');
  host.textContent = '';
  const mk = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const table = mk('table');
  const thead = mk('thead');
  const hr = mk('tr');
  [t('colElement'), t('colText'), t('colDetail')].forEach((x) => hr.appendChild(mk('th', x)));
  thead.appendChild(hr);
  table.appendChild(thead);
  const tb = mk('tbody');
  const row = (kind, ref, detail, indent = 0) => {
    const tr = mk('tr', null, state.selectedId === ref.id ? 'sel' : '');
    const th = mk('th', null);
    th.scope = 'row';
    const btn = mk('button', t('kind.' + kind));
    btn.type = 'button';
    btn.style.marginLeft = indent * 14 + 'px';
    btn.addEventListener('click', () => { state.selectedId = ref.id; refresh({ inspector: true }); });
    th.appendChild(btn);
    tr.appendChild(th);
    tr.appendChild(mk('td', ref.text || '—'));
    tr.appendChild(mk('td', detail));
    tb.appendChild(tr);
  };
  const ctlDetail = (c) => {
    const bits = [];
    if (c.function) bits.push(t('fn.' + c.function));
    if (c.type) bits.push(t('ty.' + c.type));
    if (c.critical) bits.push('★ critical');
    const e = M.effectiveness(c);
    if (e != null) bits.push(`A${c.adequacy}×R${c.reliability}=${e}`);
    if (c.owner) bits.push(c.owner);
    return bits.join(' · ');
  };
  const escRows = (c, indent) => {
    m.escalations.filter((e) => e.controlId === c.id).forEach((e) => {
      row('escalation', e, '', indent);
      m.escalationControls.filter((x) => x.escalationId === e.id).forEach((x) => row('escalationControl', x, x.owner || '', indent + 1));
    });
  };
  row('hazard', m.hazard, '');
  row('topEvent', m.topEvent, '');
  m.threats.forEach((th) => {
    row('threat', th, th.exposure ? 'exposure ' + th.exposure : '');
    M.controlsOf(m, 'prevent', th.id).forEach((c) => { row('control', c, ctlDetail(c), 1); escRows(c, 2); });
  });
  m.consequences.forEach((co) => {
    row('consequence', co, co.severity ? 'severity ' + co.severity : '');
    M.controlsOf(m, 'recover', co.id).forEach((c) => { row('control', c, ctlDetail(c), 1); escRows(c, 2); });
  });
  table.appendChild(tb);
  host.appendChild(table);
}

// ---------- inspector ----------
const SPECS = {
  hazard: [['text', 'area'], ['notes', 'area']],
  topEvent: [['text', 'area'], ['notes', 'area']],
  threat: [['text', 'area'], ['exposure', 'num5'], ['notes', 'area']],
  consequence: [['text', 'area'], ['severity', 'num5'], ['notes', 'area']],
  control: [['text', 'area'], ['function', 'fn'], ['type', 'ty'], ['critical', 'bool'], ['adequacy', 'num4'], ['reliability', 'num4'], ['owner', 'line'], ['notes', 'area']],
  escalation: [['text', 'area'], ['notes', 'area']],
  escalationControl: [['text', 'area'], ['owner', 'line'], ['notes', 'area']],
};

function fieldEl(kind, ref, key, type) {
  const wrap = document.createElement('label');
  wrap.className = 'fld';
  const cap = document.createElement('span');
  cap.textContent = t('f.' + key);
  wrap.appendChild(cap);
  let input;
  const commit = (v) => mutate(() => { ref[key] = v; });
  if (type === 'area' || type === 'line') {
    input = document.createElement(type === 'area' ? 'textarea' : 'input');
    if (type === 'area') input.rows = key === 'text' ? 3 : 2;
    input.value = ref[key] || '';
    input.addEventListener('change', () => commit(input.value));
  } else if (type === 'bool') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!ref[key];
    input.addEventListener('change', () => commit(input.checked));
    wrap.classList.add('chk');
  } else {
    input = document.createElement('select');
    const opts = type === 'fn' ? M.FUNCTIONS : type === 'ty' ? M.TYPES : [1, 2, 3, 4, 5].slice(0, type === 'num4' ? 4 : 5);
    const none = document.createElement('option');
    none.value = '';
    none.textContent = t('none');
    input.appendChild(none);
    opts.forEach((o) => {
      const op = document.createElement('option');
      op.value = String(o);
      op.textContent = type === 'fn' ? t('fn.' + o) : type === 'ty' ? t('ty.' + o) : String(o);
      input.appendChild(op);
    });
    input.value = ref[key] == null ? '' : String(ref[key]);
    input.addEventListener('change', () => {
      const v = input.value;
      commit(v === '' ? null : (type === 'fn' || type === 'ty') ? v : Number(v));
    });
  }
  wrap.appendChild(input);
  return wrap;
}

function btn(label, fn, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener('click', fn);
  return b;
}

function drawInspector() {
  const host = $('#inspector');
  host.textContent = '';
  const node = state.selectedId ? M.findNode(state.model, state.selectedId) : null;
  if (!node) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = t('nothingSelected');
    host.appendChild(p);
    return;
  }
  const { kind, ref } = node;
  const h = document.createElement('h3');
  h.textContent = t('kind.' + kind);
  host.appendChild(h);
  SPECS[kind].forEach(([k, ty]) => host.appendChild(fieldEl(kind, ref, k, ty)));

  const row = document.createElement('div');
  row.className = 'btnrow';
  const select = (id) => { state.selectedId = id; };
  if (kind === 'threat') row.appendChild(btn(t('addControl'), () => { let id; mutate((m) => { id = M.addControl(m, 'prevent', ref.id).id; }); select(id); refresh({ inspector: true }); }));
  if (kind === 'consequence') row.appendChild(btn(t('addControl'), () => { let id; mutate((m) => { id = M.addControl(m, 'recover', ref.id).id; }); select(id); refresh({ inspector: true }); }));
  if (kind === 'control') {
    row.appendChild(btn(t('addEscalation'), () => { let id; mutate((m) => { id = M.addEscalation(m, ref.id).id; }); select(id); refresh({ inspector: true }); }));
    row.appendChild(btn('↑ ' + t('moveUp'), () => mutate((m) => { M.moveControl(m, ref.id, -1); }, { rebuildInspector: true })));
    row.appendChild(btn('↓ ' + t('moveDown'), () => mutate((m) => { M.moveControl(m, ref.id, 1); }, { rebuildInspector: true })));
  }
  if (kind === 'escalation') row.appendChild(btn(t('addEscControl'), () => { let id; mutate((m) => { id = M.addEscalationControl(m, ref.id).id; }); select(id); refresh({ inspector: true }); }));
  if (!['hazard', 'topEvent'].includes(kind)) {
    row.appendChild(btn(t('delete'), () => {
      if (!confirm(t('confirmDelete'))) return;
      mutate((m) => { M.removeNode(m, ref.id); });
      state.selectedId = null;
      refresh({ inspector: true });
    }, 'danger'));
  }
  host.appendChild(row);
}

function drawMeta() {
  const host = $('#meta');
  host.textContent = '';
  const m = state.model.meta;
  [['title', 'line'], ['scope', 'area'], ['author', 'line']].forEach(([k, ty]) => host.appendChild(fieldEl('meta', m, k, ty)));
  host.appendChild(fieldEl('meta', m, 'illustrative', 'bool'));
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = t('disclaimer');
  host.appendChild(p);
}

// ---------- static labels ----------
function labels() {
  document.documentElement.lang = state.lang;
  document.title = `${t('app')} — Bowtie`;
  $('#tagline').textContent = t('tagline');
  const map = {
    '#b-example': 'example', '#b-new': 'new', '#b-open': 'open', '#b-save': 'save', '#b-svg': 'svg', '#b-png': 'png', '#b-csv': 'csv',
    '#b-undo': 'undo', '#b-redo': 'redo', '#b-fit': 'fit', '#b-lang': 'lang', '#b-theme': 'theme',
    '#b-addthreat': 'addThreat', '#b-addcons': 'addConsequence', '#tab-diagram': 'tabDiagram', '#tab-table': 'tabTable', '#tab-meta': 'tabMeta',
  };
  Object.entries(map).forEach(([sel, key]) => { $(sel).textContent = t(key); });
  $('#lbl-esc').textContent = t('esc');
  $('#h-inspector').textContent = t('inspector');
  $('#footer').textContent = t('disclaimer');
  const lg = $('#legend');
  lg.textContent = t('legendTitle') + ': ';
  [['poor', 'poor'], ['weak', 'weak'], ['fair', 'fair'], ['strong', 'strong'], ['none', 'unrated']].forEach(([cls, key]) => {
    const s = document.createElement('span');
    s.className = 'lg b-' + cls;
    s.textContent = t(key);
    lg.appendChild(s);
  });
}

function refresh({ inspector = false, fit = false } = {}) {
  drawLint();
  if (state.tab === 'diagram') drawDiagram({ fit });
  if (state.tab === 'table') drawTable();
  if (state.tab === 'meta') drawMeta();
  if (inspector) drawInspector();
  $('#b-undo').disabled = !state.undo.length;
  $('#b-redo').disabled = !state.redo.length;
}

function setTab(name) {
  state.tab = name;
  ['diagram', 'table', 'meta'].forEach((n) => {
    $('#pane-' + n).hidden = n !== name;
    const tb = $('#tab-' + n);
    tb.setAttribute('aria-selected', String(n === name));
    tb.tabIndex = n === name ? 0 : -1;
  });
  refresh({ fit: name === 'diagram' });
}

// ---------- files ----------
function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const fileBase = () => (state.model.meta.title || 'bowtie').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'bowtie';

function toCsv(m) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['side', 'parent', 'order', 'control', 'function', 'type', 'critical', 'adequacy', 'reliability', 'effectiveness', 'owner', 'escalation_factors', 'escalation_controls'];
  const rows = [head.map(q).join(',')];
  const emit = (side, parent, c) => {
    const efs = m.escalations.filter((e) => e.controlId === c.id);
    const ecs = efs.flatMap((e) => m.escalationControls.filter((x) => x.escalationId === e.id));
    rows.push([side, parent.text, c.order + 1, c.text, c.function, c.type, c.critical ? 'yes' : '', c.adequacy, c.reliability, M.effectiveness(c), c.owner,
      efs.map((e) => e.text).join(' | '), ecs.map((x) => x.text).join(' | ')].map(q).join(','));
  };
  m.threats.forEach((th) => {
    const cs = M.controlsOf(m, 'prevent', th.id);
    if (!cs.length) rows.push(['prevent', th.text, '', '', '', '', '', '', '', '', '', '', ''].map(q).join(','));
    cs.forEach((c) => emit('prevent', th, c));
  });
  m.consequences.forEach((co) => {
    const cs = M.controlsOf(m, 'recover', co.id);
    if (!cs.length) rows.push(['recover', co.text, '', '', '', '', '', '', '', '', '', '', ''].map(q).join(','));
    cs.forEach((c) => emit('recover', co, c));
  });
  return '﻿' + rows.join('\r\n');
}

async function loadExample() {
  try {
    const r = await fetch('data/example-wildlife.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    loadModel(await r.json());
  } catch (e) {
    alert(t('badFile') + e.message);
  }
}

// ---------- wiring ----------
function bind() {
  $('#b-example').addEventListener('click', loadExample);
  $('#b-new').addEventListener('click', () => { if (confirm('?')) loadModel(M.emptyModel()); });
  $('#b-open').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try { loadModel(JSON.parse(await f.text())); } catch (e) { alert(t('badFile') + e.message); }
  });
  $('#b-save').addEventListener('click', () => download(fileBase() + '.bowtie.json', new Blob([JSON.stringify(state.model, null, 2)], { type: 'application/json' })));
  $('#b-svg').addEventListener('click', () => download(fileBase() + '.svg', new Blob([exportSvgString(state.model, state.showEsc)], { type: 'image/svg+xml' })));
  $('#b-png').addEventListener('click', async () => download(fileBase() + '.png', await exportPngBlob(state.model, state.showEsc, 2)));
  $('#b-csv').addEventListener('click', () => download(fileBase() + '.csv', new Blob([toCsv(state.model)], { type: 'text/csv;charset=utf-8' })));
  $('#b-undo').addEventListener('click', doUndo);
  $('#b-redo').addEventListener('click', doRedo);
  $('#b-fit').addEventListener('click', fitView);
  $('#b-lang').addEventListener('click', () => { state.lang = state.lang === 'th' ? 'en' : 'th'; savePrefs(); labels(); refresh({ inspector: true }); });
  $('#b-theme').addEventListener('click', () => { state.dark = !state.dark; applyTheme(); savePrefs(); refresh(); });
  $('#chk-esc').addEventListener('change', (ev) => { state.showEsc = ev.target.checked; savePrefs(); drawDiagram({ fit: true }); });
  $('#b-addthreat').addEventListener('click', () => { let id; mutate((m) => { id = M.addThreat(m).id; }); state.selectedId = id; setTab('diagram'); drawInspector(); });
  $('#b-addcons').addEventListener('click', () => { let id; mutate((m) => { id = M.addConsequence(m).id; }); state.selectedId = id; setTab('diagram'); drawInspector(); });
  ['diagram', 'table', 'meta'].forEach((n) => $('#tab-' + n).addEventListener('click', () => setTab(n)));

  // select hazard / top event by clicking them is handled via onSelect; background click clears selection
  const stage = $('#stage');
  stage.addEventListener('click', () => { if (state.selectedId) { state.selectedId = null; refresh({ inspector: true }); } });

  // pan & zoom
  let drag = null;
  stage.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.st-node')) return;
    drag = { x: ev.clientX, y: ev.clientY, vx: state.view.x, vy: state.view.y, moved: false };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const dx = ev.clientX - drag.x; const dy = ev.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    state.view.x = drag.vx + dx; state.view.y = drag.vy + dy; applyView();
  });
  stage.addEventListener('pointerup', (ev) => { if (drag && drag.moved) ev.stopPropagation(); drag = null; });
  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const r = stage.getBoundingClientRect();
    const px = ev.clientX - r.left; const py = ev.clientY - r.top;
    const k0 = state.view.k;
    const k1 = Math.min(3, Math.max(0.1, k0 * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
    state.view.x = px - (px - state.view.x) * (k1 / k0);
    state.view.y = py - (py - state.view.y) * (k1 / k0);
    state.view.k = k1;
    applyView();
  }, { passive: false });

  window.addEventListener('resize', () => { if (state.tab === 'diagram') drawDiagram(); });
  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest('input,textarea,select')) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); doRedo(); }
  });
}

function applyTheme() { document.documentElement.dataset.theme = state.dark ? 'dark' : 'light'; }

function init() {
  try {
    const p = JSON.parse(lsGet(PREF) || '{}');
    if (p.lang) state.lang = p.lang;
    if (typeof p.dark === 'boolean') state.dark = p.dark;
    else state.dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    if (typeof p.showEsc === 'boolean') state.showEsc = p.showEsc;
  } catch { /* ignore */ }
  $('#chk-esc').checked = state.showEsc;
  applyTheme();
  labels();
  bind();
  const saved = lsGet(KEY);
  let loaded = false;
  if (saved) {
    try { const m = JSON.parse(saved); if (!M.validateShape(m).length) { state.model = M.normalize(m); loaded = true; } } catch { /* ignore */ }
  }
  setTab('diagram');
  if (!loaded) loadExample();
  else drawInspector();
}

init();
