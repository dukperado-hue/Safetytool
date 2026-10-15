// Safetytool — browser UI: bowtie (click-to-edit diagram), Swiss cheese and SHELL (form + diagram).
import * as M from './model.js';
import * as SW from './swiss.js';
import * as SH from './shell.js';
import { lint as lintBowtie, summarize } from './lint.js';
import { renderModel, exportSvgString, exportPngBlob, installCanvasMeasurer } from './render.js';
import { buildSwissForm, buildShellForm } from './forms.js';
import { STR } from './i18n.js';
import { drawSwissAnalysis } from './swisstab.js';
import { drawReport } from './reporttab.js';
import { drawCompare } from './comparetab.js';
import { drawSimulate } from './simtab.js';
import { drawGuide, GUIDE_STRINGS } from './guide.js';
import { drawGallery, readWorks, writeWorks, upsertWork, newId } from './gallery.js';
import { HELP, GLOSSARY_ORDER, MODEL_INTRO, helpFor, explainShort } from './help.js';

const $ = (s) => document.querySelector(s);
const PREF = 'safetytool.prefs';

// ---------- model-type registry ----------
const TYPES = {
  bowtie: { schema: M.SCHEMA, empty: M.emptyModel, validate: M.validateShape, normalize: M.normalize, lint: lintBowtie, find: M.findNode, example: 'data/example-wildlife.json', tabs: ['diagram', 'simulate', 'compare', 'report', 'table', 'meta'] },
  swiss: { schema: SW.SCHEMA, empty: SW.emptySwiss, validate: SW.validateSwiss, normalize: SW.normalizeSwiss, lint: SW.lintSwiss, find: SW.findSwiss, example: 'data/example-swiss.json', tabs: ['form', 'diagram', 'analysis', 'table', 'meta'] },
  shell: { schema: SH.SCHEMA, empty: SH.emptyShell, validate: SH.validateShell, normalize: SH.normalizeShell, lint: SH.lintShell, find: SH.findShell, example: 'data/example-shell.json', tabs: ['form', 'diagram', 'table', 'meta'] },
};
const TYPE_IDS = Object.keys(TYPES);

const state = {
  baseline: null,
  swissSource: null,
  type: 'bowtie',
  models: {},
  undo: { bowtie: [], swiss: [], shell: [] },
  redo: { bowtie: [], swiss: [], shell: [] },
  selectedId: null,
  selectedKind: null,
  showEsc: true,
  help: false,
  lang: 'th',
  dark: false,
  tab: 'diagram',
  rtab: 'inspector',
  view: { x: 0, y: 0, k: 1 },
  last: null,
  guide: { on: false, step: 0 },
  galleryId: null,
};

const t = (k) => k.split('.').reduce((o, p) => (o ? o[p] : undefined), STR[state.lang]) ?? k;
const cur = () => state.models[state.type];
const spec = () => TYPES[state.type];
const keyOf = (type) => 'safetytool.' + type + '.current';

// ---------- persistence (storage can be unavailable) ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
const save = () => lsSet(keyOf(state.type), JSON.stringify(cur()));
const savePrefs = () => lsSet(PREF, JSON.stringify({ lang: state.lang, dark: state.dark, showEsc: state.showEsc, help: state.help, type: state.type }));

// ---------- mutations with undo ----------
function snapshot() {
  const u = state.undo[state.type];
  u.push(JSON.stringify(cur()));
  if (u.length > 100) u.shift();
  state.redo[state.type] = [];
}
function mutate(fn, { rebuild = false } = {}) {
  snapshot();
  fn(cur());
  M.touch(cur());
  save();
  refresh({ inspector: rebuild, form: rebuild });
}
function restore(json) {
  state.models[state.type] = JSON.parse(json);
  if (state.selectedId && !spec().find(cur(), state.selectedId)) state.selectedId = null;
  save();
  refresh({ inspector: true, form: true });
}
function doUndo() { const u = state.undo[state.type]; if (!u.length) return; state.redo[state.type].push(JSON.stringify(cur())); restore(u.pop()); }
function doRedo() { const r = state.redo[state.type]; if (!r.length) return; state.undo[state.type].push(JSON.stringify(cur())); restore(r.pop()); }

function detectType(m) {
  const found = TYPE_IDS.find((id) => TYPES[id].schema === (m && m.schema));
  return found || null;
}

/** Load a parsed file into its own model type (switching type if needed). */
function loadModel(m, { fit = true } = {}) {
  const type = detectType(m);
  if (!type) { alert(t('badFile') + 'unsupported schema: ' + String(m && m.schema)); return false; }
  const errs = TYPES[type].validate(m);
  if (errs.length) { alert(t('badFile') + errs.slice(0, 5).join('; ')); return false; }
  const switched = type !== state.type;
  state.type = type;
  state.undo[type] = [];
  state.redo[type] = [];
  state.models[type] = TYPES[type].normalize(m);
  state.galleryId = null;
  state.swissSource = null;
  state.selectedId = null;
  state.selectedKind = null;
  save();
  savePrefs();
  applyType({ fit });
  if (switched) flash(t('wrongType'));
  return true;
}

let flashTimer = null;
function flash(msg) {
  const f = $('#flash');
  f.textContent = msg;
  f.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { f.hidden = true; }, 3500);
}

// ---------- diagram ----------
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
  state.view = { k, x: (w - state.last.width * k) / 2, y: (h - state.last.height * k) / 2 };
  applyView();
}
const explain = (kind) => (state.help ? explainShort(state.type, kind, state.lang) : '');

function onSelect(id, kind) {
  state.selectedId = id;
  state.selectedKind = kind || (spec().find(cur(), id) || {}).kind || null;
  if (state.help) state.rtab = 'help';
  else if (state.type === 'bowtie') state.rtab = 'inspector';
  refresh({ inspector: true });
}

function drawDiagram({ fit = false } = {}) {
  const svg = $('#svg');
  const { w, h } = stageSize();
  state.last = renderModel(svg, state.type, cur(), {
    showEsc: state.showEsc, selectedId: state.selectedId, dark: state.dark, kindTags: state.help, explain, onSelect,
  });
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  if (fit) fitView(); else applyView();
}

// ---------- quality panel ----------
function drawLint() {
  const issues = spec().lint(cur());
  const s = summarize(issues);
  const box = $('#lint');
  box.textContent = '';
  const head = document.createElement('div');
  head.className = 'lint-head';
  head.textContent = `${s.error} ${t('errors')} · ${s.warn} ${t('warns')} · ${s.info} ${t('infos')}`;
  box.appendChild(head);
  $('#r-quality').textContent = `${t('rQuality')} (${s.error + s.warn + s.info})`;
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
    const node = spec().find(cur(), i.targetId);
    const label = node ? `${t('kind.' + node.kind)}${node.ref.text ? ': ' + node.ref.text.slice(0, 40) : ''}` : '';
    b.textContent = `[${i.rule}] ${i[state.lang]}${label ? ' — ' + label : ''}`;
    b.addEventListener('click', () => gotoTarget(i.targetId, node));
    li.appendChild(b);
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

/** Jump to an element: select it (bowtie) or focus its form field (swiss/shell). */
function gotoTarget(id, node) {
  state.selectedId = id;
  state.selectedKind = node ? node.kind : null;
  if (state.type === 'bowtie') {
    state.rtab = 'inspector';
    refresh({ inspector: true });
    return;
  }
  setTab('form');
  requestAnimationFrame(() => {
    const el = $('#form').querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), 1800);
    const inp = el.matches('input,textarea,select') ? el : el.querySelector('input,textarea,select');
    if (inp) inp.focus({ preventScroll: true });
  });
}

// ---------- table (read-only, equivalent to the diagram) ----------
function tableRows() {
  const m = cur();
  const rows = [];
  const add = (kind, ref, detail = '', indent = 0, textOverride) => rows.push({ id: ref.id, kind, text: textOverride ?? ref.text, detail, indent });
  if (state.type === 'bowtie') {
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
    const escRows = (c, ind) => m.escalations.filter((e) => e.controlId === c.id).forEach((e) => {
      add('escalation', e, '', ind);
      m.escalationControls.filter((x) => x.escalationId === e.id).forEach((x) => add('escalationControl', x, x.owner || '', ind + 1));
    });
    add('hazard', m.hazard); add('topEvent', m.topEvent);
    m.threats.forEach((th) => { add('threat', th, th.exposure ? 'exposure ' + th.exposure : ''); M.controlsOf(m, 'prevent', th.id).forEach((c) => { add('control', c, ctlDetail(c), 1); escRows(c, 2); }); });
    m.consequences.forEach((co) => { add('consequence', co, co.severity ? 'severity ' + co.severity : ''); M.controlsOf(m, 'recover', co.id).forEach((c) => { add('control', c, ctlDetail(c), 1); escRows(c, 2); }); });
  } else if (state.type === 'swiss') {
    add('hazard', m.hazard); add('loss', m.loss);
    m.layers.forEach((l) => {
      add('layer', l, [l.category ? t('sw.cat.' + l.category) : '', l.defence].filter(Boolean).join(' — '), 0, l.name);
      l.holes.forEach((h) => add(h.type === 'latent' ? 'holeLatent' : 'holeActive', h, m.trajectory.includes(h.id) ? '★ aligned' : '', 1));
    });
  } else {
    add('subject', m.subject); add('focus', m.focus);
    SH.COMPONENTS.forEach((c) => m.components[c].forEach((x) => add('comp' + c, x, '', 0)));
    SH.INTERFACES.forEach((i) => {
      const f = m.interfaces[i];
      rows.push({ id: 'sec_' + i, kind: 'iface', text: t('sh.' + i) + ' — ' + t('sh.st.' + f.status), detail: '', indent: 0 });
      f.findings.forEach((x) => add('finding', x, [x.severity ? 'sev ' + x.severity : '', x.action ? '→ ' + x.action : '', x.owner].filter(Boolean).join(' · '), 1));
    });
  }
  return rows;
}

function drawTable() {
  const host = $('#table');
  host.textContent = '';
  const mk = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const table = mk('table');
  const hr = mk('tr');
  [t('colElement'), t('colText'), t('colDetail')].forEach((x) => hr.appendChild(mk('th', x)));
  table.appendChild(mk('thead')).appendChild(hr);
  const tb = mk('tbody');
  tableRows().forEach((r) => {
    const tr = mk('tr', null, state.selectedId === r.id ? 'sel' : '');
    const th = mk('th');
    th.scope = 'row';
    const b = mk('button', t('kind.' + r.kind));
    b.type = 'button';
    b.style.marginLeft = r.indent * 14 + 'px';
    b.addEventListener('click', () => gotoTarget(r.id, spec().find(cur(), r.id)));
    th.appendChild(b);
    tr.append(th, mk('td', r.text || '—'), mk('td', r.detail));
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  host.appendChild(table);
}

// ---------- inspector (bowtie) ----------
const SPECS = {
  hazard: [['text', 'area'], ['notes', 'area']],
  topEvent: [['text', 'area'], ['notes', 'area']],
  threat: [['text', 'area'], ['exposure', 'num5'], ['notes', 'area']],
  consequence: [['text', 'area'], ['severity', 'num5'], ['notes', 'area']],
  control: [['text', 'area'], ['function', 'fn'], ['type', 'ty'], ['critical', 'bool'], ['adequacy', 'num4'], ['reliability', 'num4'], ['owner', 'line'], ['notes', 'area']],
  escalation: [['text', 'area'], ['notes', 'area']],
  escalationControl: [['text', 'area'], ['owner', 'line'], ['notes', 'area']],
};

function fieldEl(ref, key, type) {
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
    input.addEventListener('change', () => commit(input.value === '' ? null : (type === 'fn' || type === 'ty') ? input.value : Number(input.value)));
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

function callout(kind) {
  const h = helpFor(state.type, kind, state.lang);
  if (!h) return null;
  const d = document.createElement('div');
  d.className = 'callout';
  d.textContent = h.what;
  return d;
}

function drawInspector() {
  const host = $('#inspector');
  host.textContent = '';
  const mkp = (txt) => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = txt; return p; };
  if (state.type !== 'bowtie') { host.appendChild(mkp(t('formHint'))); return; }
  const node = state.selectedId ? M.findNode(cur(), state.selectedId) : null;
  if (!node) { host.appendChild(mkp(t('nothingSelected'))); return; }
  const { kind, ref } = node;
  const h = document.createElement('h3');
  h.textContent = t('kind.' + kind);
  host.appendChild(h);
  if (state.help) { const c = callout(kind); if (c) host.appendChild(c); }
  SPECS[kind].forEach(([k, ty]) => host.appendChild(fieldEl(ref, k, ty)));
  const row = document.createElement('div');
  row.className = 'btnrow';
  const pick = (id, kd) => { state.selectedId = id; state.selectedKind = kd; refresh({ inspector: true }); };
  if (kind === 'threat') row.appendChild(btn(t('addControl'), () => { let id; mutate((m) => { id = M.addControl(m, 'prevent', ref.id).id; }); pick(id, 'control'); }));
  if (kind === 'consequence') row.appendChild(btn(t('addControl'), () => { let id; mutate((m) => { id = M.addControl(m, 'recover', ref.id).id; }); pick(id, 'control'); }));
  if (kind === 'control') {
    row.appendChild(btn(t('addEscalation'), () => { let id; mutate((m) => { id = M.addEscalation(m, ref.id).id; }); pick(id, 'escalation'); }));
    row.appendChild(btn('↑ ' + t('moveUp'), () => mutate((m) => { M.moveControl(m, ref.id, -1); }, { rebuild: true })));
    row.appendChild(btn('↓ ' + t('moveDown'), () => mutate((m) => { M.moveControl(m, ref.id, 1); }, { rebuild: true })));
  }
  if (kind === 'escalation') row.appendChild(btn(t('addEscControl'), () => { let id; mutate((m) => { id = M.addEscalationControl(m, ref.id).id; }); pick(id, 'escalationControl'); }));
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

// ---------- help tab ----------
function guideCtx() {
  return {
    type: state.type, model: cur(), lang: state.lang, step: state.guide.step,
    setStep: (n) => { state.guide.step = n; drawHelp(); },
    close: () => { state.guide.on = false; drawHelp(); },
    refreshGuide: () => drawHelp(),
    mutate,
    openSimulate: () => setTab('simulate'),
    saveGallery: () => !!saveToGallery(false),
  };
}
function startGuide() { state.guide = { on: true, step: 0 }; setRightTab('help'); }

function drawHelp() {
  const host = $('#help');
  host.textContent = '';
  const mk = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
  if (state.guide.on) { drawGuide(host, guideCtx()); return; }
  const gs = mk('button', GUIDE_STRINGS[state.lang].start, 'primary');
  gs.type = 'button';
  gs.addEventListener('click', startGuide);
  host.appendChild(gs);

  const sw = mk('label', null, 'fld chk helpswitch');
  const cb = mk('input');
  cb.type = 'checkbox';
  cb.checked = state.help;
  cb.addEventListener('change', () => setHelp(cb.checked));
  sw.append(cb, mk('span', t('helpMode')));
  host.appendChild(sw);
  host.appendChild(mk('p', t('helpModeHint'), 'muted'));

  host.appendChild(mk('h3', t('helpAbout')));
  host.appendChild(mk('p', MODEL_INTRO[state.type][state.lang]));

  const entry = (kind, open) => {
    const h = helpFor(state.type, kind, state.lang);
    if (!h) return null;
    const d = mk('details', null, 'gloss');
    if (open) d.open = true;
    const s = mk('summary');
    s.append(Object.assign(mk('span', null, 'sw k-' + kind), { 'aria-hidden': 'true' }), mk('span', h.name));
    d.appendChild(s);
    const row = (label, txt) => { if (!txt) return; const p = mk('p'); p.append(mk('strong', label + ': '), document.createTextNode(txt)); d.appendChild(p); };
    row(t('helpWhat'), h.what); row(t('helpHow'), h.how); row(t('helpEg'), h.eg); row(t('helpAvoid'), h.avoid);
    return d;
  };

  const selKind = state.selectedKind || (state.selectedId && (spec().find(cur(), state.selectedId) || {}).kind);
  if (selKind) {
    const e = entry(selKind, true);
    if (e) { host.appendChild(mk('h3', t('helpSelected'))); e.classList.add('picked'); host.appendChild(e); }
  }
  host.appendChild(mk('h3', t('helpBoxes')));
  GLOSSARY_ORDER[state.type].forEach((k) => { if (k !== selKind) { const e = entry(k, false); if (e) host.appendChild(e); } });
  host.appendChild(mk('p', t('helpTips'), 'muted'));
}

function setHelp(on) {
  state.help = on;
  if (on) state.rtab = 'help';
  savePrefs();
  syncHelpButton();
  setRightTab(state.rtab);
  refresh({ inspector: true });
}
function syncHelpButton() { $('#b-help').setAttribute('aria-pressed', String(state.help)); }

function setRightTab(name) {
  state.rtab = name;
  ['inspector', 'quality', 'help', 'gallery'].forEach((n) => {
    $('#rp-' + n).hidden = n !== name;
    const b = $('#r-' + n);
    b.setAttribute('aria-selected', String(n === name));
    b.tabIndex = n === name ? 0 : -1;
  });
  if (name === 'help') drawHelp();
  if (name === 'gallery') drawGalleryPane();
}

// ---------- meta tab ----------
function drawMeta() {
  const host = $('#meta');
  host.textContent = '';
  const m = cur().meta;
  [['title', 'line'], ['scope', 'area'], ['author', 'line']].forEach(([k, ty]) => host.appendChild(fieldEl(m, k, ty)));
  host.appendChild(fieldEl(m, 'illustrative', 'bool'));
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = t('disclaimer');
  host.appendChild(p);
}

// ---------- form tab ----------
function drawForm() {
  const host = $('#form');
  const api = { t, mutate };
  const top = host.scrollTop;
  if (state.type === 'swiss') buildSwissForm(host, cur(), api);
  else if (state.type === 'shell') buildShellForm(host, cur(), api);
  else host.textContent = '';
  host.scrollTop = top;
}

// ---------- online / offline ----------
function netStatus() {
  const f = $('#footer');
  if (!f) return;
  let s = f.querySelector('#net');
  if (!s) { s = document.createElement('span'); s.id = 'net'; f.appendChild(s); }
  const on = navigator.onLine !== false;
  const lbl = state.lang === 'th' ? (on ? 'ออนไลน์' : 'ออฟไลน์ — ใช้งานต่อได้ งานเก็บในเบราว์เซอร์') : (on ? 'online' : 'offline — still works; work is kept in this browser');
  s.textContent = '';
  const dot = document.createElement('span');
  dot.className = 'net-dot' + (on ? '' : ' off');
  dot.setAttribute('aria-hidden', 'true');
  s.append(dot, lbl);
}
function registerOffline() {
  if (!('serviceWorker' in navigator)) return;
  const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && !/[?&]sw=1/.test(location.search);
  if (dev) return; // keep local development uncached; add ?sw=1 to test offline mode locally
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
}

// ---------- gallery ----------
function thumbSvg(type, model) {
  const m = TYPES[type].normalize(JSON.parse(JSON.stringify(model)));
  return exportSvgString(type, m, { showEsc: false, kindTags: false });
}
function saveToGallery(asNew) {
  const id = !asNew && state.galleryId ? state.galleryId : newId();
  const works = upsertWork(readWorks(), { id, type: state.type, model: cur() });
  if (!writeWorks(works)) return null;
  state.galleryId = id;
  return id;
}
function drawGalleryPane() {
  drawGallery($('#gallery'), {
    lang: state.lang, currentType: state.type, currentId: state.galleryId, thumbSvg,
    openModel: (m, workId) => { if (loadModel(m)) { state.galleryId = workId; drawGalleryPane(); } },
    saveCurrent: saveToGallery,
    onChange: drawGalleryPane,
  });
}

// ---------- labels / layout ----------
function labels() {
  document.documentElement.lang = state.lang;
  document.title = `${t('app')} — ${t('m' + state.type[0].toUpperCase() + state.type.slice(1))}`;
  $('#tagline').textContent = t('tagline');
  const map = {
    '#b-example': 'example', '#b-new': 'new', '#b-open': 'open', '#b-save': 'save', '#b-svg': 'svg', '#b-png': 'png', '#b-csv': 'csv', '#b-print': 'print',
    '#b-undo': 'undo', '#b-redo': 'redo', '#b-fit': 'fit', '#b-lang': 'lang', '#b-theme': 'theme', '#b-help': 'help',
    '#tab-diagram': 'tabDiagram', '#tab-simulate': 'tabSimulate', '#tab-compare': 'tabCompare', '#tab-report': 'tabReport', '#tab-analysis': 'tabAnalysis', '#tab-table': 'tabTable', '#tab-meta': 'tabMeta', '#tab-form': 'tabForm',
    '#r-inspector': 'rInspector', '#r-help': 'rHelp', '#r-gallery': 'rGallery',
    '#m-bowtie': 'mBowtie', '#m-swiss': 'mSwiss', '#m-shell': 'mShell',
  };
  Object.entries(map).forEach(([sel, key]) => { $(sel).textContent = t(key); });
  $('#lbl-esc').textContent = t('esc');
  $('#footer').textContent = t('disclaimer');
  netStatus();
  $('#models-label').textContent = t('models');
  $('#b-addthreat').textContent = t('addThreat');
  $('#b-addcons').textContent = t('addConsequence');
  $('#b-addthreat').hidden = state.type !== 'bowtie';
  $('#b-addcons').hidden = state.type !== 'bowtie';
  const lg = $('#legend');
  lg.textContent = '';
  if (state.type === 'bowtie') {
    lg.append(t('legendTitle') + ': ');
    [['poor', 'poor'], ['weak', 'weak'], ['fair', 'fair'], ['strong', 'strong'], ['none', 'unrated']].forEach(([cls, key]) => {
      const s = document.createElement('span');
      s.className = 'lg b-' + cls;
      s.textContent = t(key);
      lg.appendChild(s);
    });
  }
}

function reportSvg() { return exportSvgString('bowtie', cur(), { showEsc: state.showEsc, kindTags: false }); }
/** Deep-dive: one Swiss layer per control on the chosen route. Keeps the bowtie as source for the uncontrolled-hole list. */
function openSwissFromBowtie(threatId, consequenceId) {
  const sw = state.models.swiss;
  if (sw && sw.layers && sw.layers.length && !confirm(t('replaceSwiss'))) return;
  const src = JSON.parse(JSON.stringify(cur()));
  const made = SW.swissFromBowtie(src, { threatId, consequenceId: consequenceId || null });
  state.type = 'bowtie';
  if (loadModel(made)) { state.swissSource = src; setTab('analysis'); }
}
const openSwiss = openSwissFromBowtie;
function setBaseline(b) { state.baseline = b; refresh(); }

function applyTheme() { document.documentElement.dataset.theme = state.dark ? 'dark' : 'light'; }

function refresh({ inspector = false, fit = false, form = false } = {}) {
  drawLint();
  if (state.tab === 'diagram') drawDiagram({ fit });
  if (state.tab === 'simulate') drawSimulate($('#simulate'), cur(), { lang: state.lang, mutate, openSwiss });
  if (state.tab === 'analysis') drawSwissAnalysis($('#analysis'), cur(), { lang: state.lang, bowtie: state.swissSource });
  if (state.tab === 'report') drawReport($('#report'), cur(), { lang: state.lang, baseline: state.baseline, svg: reportSvg, download, fileBase });
  if (state.tab === 'compare') drawCompare($('#compare'), cur(), { lang: state.lang, baseline: state.baseline, setBaseline });
  if (state.tab === 'table') drawTable();
  if (state.tab === 'meta') drawMeta();
  if (state.tab === 'form' && form) drawForm();
  if (inspector) drawInspector();
  if (state.rtab === 'help') drawHelp();
  $('#b-undo').disabled = !state.undo[state.type].length;
  $('#b-redo').disabled = !state.redo[state.type].length;
}

function setTab(name) {
  const allowed = spec().tabs;
  if (!allowed.includes(name)) name = allowed[0];
  state.tab = name;
  ['form', 'diagram', 'simulate', 'compare', 'report', 'analysis', 'table', 'meta'].forEach((n) => {
    const show = allowed.includes(n);
    $('#tab-' + n).hidden = !show;
    $('#pane-' + n).hidden = n !== name;
    const tb = $('#tab-' + n);
    tb.setAttribute('aria-selected', String(n === name));
    tb.tabIndex = n === name ? 0 : -1;
  });
  refresh({ fit: name === 'diagram', form: name === 'form' });
}

/** Switch model type (or reload the current one after loading a file). */
function applyType({ fit = true } = {}) {
  ['bowtie', 'swiss', 'shell'].forEach((id) => {
    const b = $('#m-' + id);
    b.setAttribute('aria-pressed', String(id === state.type));
  });
  $('#chk-esc').closest('label').hidden = state.type !== 'bowtie';
  labels();
  const first = spec().tabs[0] === 'form' ? 'form' : 'diagram';
  setTab(state.tab && spec().tabs.includes(state.tab) && fit === false ? state.tab : first);
  drawInspector();
  if (state.rtab === 'help') drawHelp();
  if (state.rtab === 'inspector' && state.type !== 'bowtie') setRightTab('quality');
  savePrefs();
}

async function switchType(type) {
  if (type === state.type) return;
  state.type = type;
  state.selectedId = null;
  state.selectedKind = null;
  if (!state.models[type]) {
    let loaded = false;
    const saved = lsGet(keyOf(type));
    if (saved) {
      try { const m = JSON.parse(saved); if (!TYPES[type].validate(m).length) { state.models[type] = TYPES[type].normalize(m); loaded = true; } } catch { /* ignore */ }
    }
    if (!loaded) { await loadExample(); return; }
  }
  applyType();
}

// ---------- files / export ----------
function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const fileBase = () => (cur().meta.title || state.type).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || state.type;
const csvQ = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

function toCsv() {
  const m = cur();
  const rows = [];
  if (state.type === 'bowtie') {
    rows.push(['side', 'parent', 'order', 'control', 'function', 'type', 'critical', 'adequacy', 'reliability', 'effectiveness', 'owner', 'escalation_factors', 'escalation_controls'].map(csvQ).join(','));
    const emit = (side, parent, c) => {
      const efs = m.escalations.filter((e) => e.controlId === c.id);
      const ecs = efs.flatMap((e) => m.escalationControls.filter((x) => x.escalationId === e.id));
      rows.push([side, parent.text, c.order + 1, c.text, c.function, c.type, c.critical ? 'yes' : '', c.adequacy, c.reliability, M.effectiveness(c), c.owner, efs.map((e) => e.text).join(' | '), ecs.map((x) => x.text).join(' | ')].map(csvQ).join(','));
    };
    m.threats.forEach((th) => { const cs = M.controlsOf(m, 'prevent', th.id); if (!cs.length) rows.push(['prevent', th.text].map(csvQ).join(',')); cs.forEach((c) => emit('prevent', th, c)); });
    m.consequences.forEach((co) => { const cs = M.controlsOf(m, 'recover', co.id); if (!cs.length) rows.push(['recover', co.text].map(csvQ).join(',')); cs.forEach((c) => emit('recover', co, c)); });
  } else if (state.type === 'swiss') {
    rows.push(['layer_no', 'layer', 'category', 'defence', 'hole', 'type', 'aligned'].map(csvQ).join(','));
    m.layers.forEach((l, i) => {
      if (!l.holes.length) rows.push([i + 1, l.name, l.category, l.defence].map(csvQ).join(','));
      l.holes.forEach((h) => rows.push([i + 1, l.name, l.category, l.defence, h.text, h.type, m.trajectory.includes(h.id) ? 'yes' : ''].map(csvQ).join(',')));
    });
  } else {
    rows.push(['section', 'status', 'item_or_finding', 'severity', 'action', 'owner'].map(csvQ).join(','));
    SH.COMPONENTS.forEach((c) => m.components[c].forEach((x) => rows.push([c, '', x.text].map(csvQ).join(','))));
    SH.INTERFACES.forEach((i) => {
      const f = m.interfaces[i];
      if (!f.findings.length) rows.push([i, f.status].map(csvQ).join(','));
      f.findings.forEach((x) => rows.push([i, f.status, x.text, x.severity, x.action, x.owner].map(csvQ).join(',')));
    });
  }
  return '﻿' + rows.join('\r\n');
}

async function loadExample() {
  try {
    const r = await fetch(spec().example, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    loadModel(await r.json());
  } catch (e) {
    alert(t('badFile') + e.message);
  }
}

/** Print / save as PDF: a clean vector copy of the diagram scaled to the page. */
function printDiagram() {
  const root = $('#print-root');
  root.textContent = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const out = renderModel(svg, state.type, cur(), { showEsc: state.showEsc, forExport: true, dark: false, kindTags: state.help });
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(out.width)} ${Math.ceil(out.height)}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  root.appendChild(svg);
  const cap = document.createElement('p');
  cap.className = 'print-cap';
  cap.textContent = `${cur().meta.title || ''} · Safetytool · ${new Date().toLocaleDateString(state.lang === 'th' ? 'th-TH' : 'en-GB')} · ${t('disclaimer')}`;
  root.appendChild(cap);
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); root.textContent = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

// ---------- wiring ----------
function bind() {
  $('#b-example').addEventListener('click', loadExample);
  $('#b-new').addEventListener('click', () => {
    if (!confirm(t('confirmNew'))) return;
    snapshot();
    state.models[state.type] = spec().empty();
    state.selectedId = null; state.selectedKind = null;
    state.galleryId = null;
    save();
    applyType();
    startGuide();
  });
  $('#b-open').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try { loadModel(JSON.parse(await f.text())); } catch (e) { alert(t('badFile') + e.message); }
  });
  $('#b-save').addEventListener('click', () => download(fileBase() + '.' + state.type + '.json', new Blob([JSON.stringify(cur(), null, 2)], { type: 'application/json' })));
  $('#b-svg').addEventListener('click', () => download(fileBase() + '.svg', new Blob([exportSvgString(state.type, cur(), { showEsc: state.showEsc, kindTags: state.help })], { type: 'image/svg+xml' })));
  $('#b-png').addEventListener('click', async () => download(fileBase() + '.png', await exportPngBlob(state.type, cur(), { showEsc: state.showEsc, kindTags: state.help }, 3)));
  $('#b-csv').addEventListener('click', () => download(fileBase() + '.csv', new Blob([toCsv()], { type: 'text/csv;charset=utf-8' })));
  $('#b-print').addEventListener('click', printDiagram);
  $('#b-undo').addEventListener('click', doUndo);
  $('#b-redo').addEventListener('click', doRedo);
  $('#b-fit').addEventListener('click', fitView);
  $('#b-lang').addEventListener('click', () => { state.lang = state.lang === 'th' ? 'en' : 'th'; savePrefs(); labels(); refresh({ inspector: true, form: true }); });
  $('#b-theme').addEventListener('click', () => { state.dark = !state.dark; applyTheme(); savePrefs(); refresh(); });
  $('#b-help').addEventListener('click', () => setHelp(!state.help));
  $('#chk-esc').addEventListener('change', (ev) => { state.showEsc = ev.target.checked; savePrefs(); drawDiagram({ fit: true }); });
  $('#b-addthreat').addEventListener('click', () => { if (state.type !== 'bowtie') return; let id; mutate((m) => { id = M.addThreat(m).id; }); state.selectedId = id; state.selectedKind = 'threat'; state.rtab = 'inspector'; setRightTab('inspector'); setTab('diagram'); drawInspector(); });
  $('#b-addcons').addEventListener('click', () => { if (state.type !== 'bowtie') return; let id; mutate((m) => { id = M.addConsequence(m).id; }); state.selectedId = id; state.selectedKind = 'consequence'; state.rtab = 'inspector'; setRightTab('inspector'); setTab('diagram'); drawInspector(); });
  ['form', 'diagram', 'simulate', 'compare', 'report', 'analysis', 'table', 'meta'].forEach((n) => $('#tab-' + n).addEventListener('click', () => setTab(n)));
  ['inspector', 'quality', 'help', 'gallery'].forEach((n) => $('#r-' + n).addEventListener('click', () => setRightTab(n)));
  TYPE_IDS.forEach((id) => $('#m-' + id).addEventListener('click', () => { switchType(id); }));

  const stage = $('#stage');
  stage.addEventListener('click', () => { if (state.selectedId) { state.selectedId = null; state.selectedKind = null; refresh({ inspector: true }); } });
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

async function init() {
  installCanvasMeasurer();
  registerOffline();
  window.addEventListener('online', netStatus);
  window.addEventListener('offline', netStatus);
  try {
    const p = JSON.parse(lsGet(PREF) || '{}');
    if (p.lang) state.lang = p.lang;
    state.dark = typeof p.dark === 'boolean' ? p.dark : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (typeof p.showEsc === 'boolean') state.showEsc = p.showEsc;
    if (typeof p.help === 'boolean') state.help = p.help;
    if (TYPE_IDS.includes(p.type)) state.type = p.type;
  } catch { /* ignore */ }
  $('#chk-esc').checked = state.showEsc;
  applyTheme();
  syncHelpButton();
  bind();
  if (state.help) state.rtab = 'help';
  let loaded = false;
  const saved = lsGet(keyOf(state.type));
  if (saved) {
    try { const m = JSON.parse(saved); if (!spec().validate(m).length) { state.models[state.type] = spec().normalize(m); loaded = true; } } catch { /* ignore */ }
  }
  setRightTab(state.rtab === 'inspector' && state.type !== 'bowtie' ? 'quality' : state.rtab);
  if (!loaded) { await loadExample(); return; }
  state.tab = null;
  applyType({ fit: true });
}

init();
