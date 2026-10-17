// Safetytool — browser UI: bowtie (click-to-edit diagram), Swiss cheese and SHELL (form + diagram).
import * as M from './model.js';
import * as SW from './swiss.js';
import * as SH from './shell.js';
import { lint as lintBowtie, summarize } from './lint.js';
import { renderModel, exportSvgString, exportPngBlob, installCanvasMeasurer } from './render.js';
import { buildSwissForm, buildShellForm, buildHfacsForm, buildStampForm } from './forms.js';
import * as HF from './hfacs.js';
import * as ST from './stamp.js';
import * as NT from './newtabs.js';
import * as FR from './fram.js';
import * as PY from './pyramid.js';
import * as IC from './interchange.js';
import * as SO from './safeopen.js';
import { keepFocus, debounce } from './keepfocus.js';
import { modelExample } from './modelintro.js';
import { embeddedFontCss, loadThaiFont } from './fonts.js';
import * as FP from './fptabs.js';
import { buildFramForm, buildPyramidForm, buildSourcesEditor, evidenceChoices } from './forms-fp.js';
import { drawConnections } from './linkspanel.js';
import { STR } from './i18n.js';
import { drawAssurance } from './assurancepanel.js';
import { drawSwissAnalysis } from './swisstab.js';
import { drawReport } from './reporttab.js';
import { drawCompare } from './comparetab.js';
import { drawSimulate } from './simtab.js';
import { drawGuide, GUIDE_STRINGS } from './guide.js';
import { drawGallery, readWorks, writeWorks, upsertWork, newId } from './gallery.js';
import { HELP, GLOSSARY_ORDER, MODEL_INTRO, helpFor, explainShort } from './help.js';

const $ = (s) => document.querySelector(s);
const FOCUS_ROOTS = '#form, #meta, #inspector';   // containers that are redrawn while the user is typing in them
const PREF = 'safetytool.prefs';

// ---------- model-type registry ----------
const TYPES = {
  bowtie: { schema: M.SCHEMA, empty: M.emptyModel, validate: M.validateShape, normalize: M.normalize, lint: lintBowtie, find: M.findNode, example: 'data/example-wildlife.json', tabs: ['diagram', 'simulate', 'compare', 'report', 'table', 'meta'] },
  swiss: { schema: SW.SCHEMA, empty: SW.emptySwiss, validate: SW.validateSwiss, normalize: SW.normalizeSwiss, lint: SW.lintSwiss, find: SW.findSwiss, example: 'data/example-swiss.json', tabs: ['form', 'diagram', 'analysis', 'table', 'meta'] },
  shell: { schema: SH.SCHEMA, empty: SH.emptyShell, validate: SH.validateShell, normalize: SH.normalizeShell, lint: SH.lintShell, find: SH.findShell, example: 'data/example-shell.json', tabs: ['form', 'diagram', 'table', 'meta'] },
  hfacs: { schema: HF.SCHEMA, empty: HF.emptyHfacs, validate: HF.validateHfacs, normalize: HF.normalizeHfacs, lint: HF.lintHfacs, find: HF.findHfacs, example: 'data/example-hfacs.json', tabs: ['form', 'diagram', 'analysis', 'table', 'meta'] },
  stamp: { schema: ST.SCHEMA, empty: ST.emptyStamp, validate: ST.validateStamp, normalize: ST.normalizeStamp, lint: ST.lintStamp, find: ST.findStamp, example: 'data/example-stamp.json', tabs: ['form', 'diagram', 'analysis', 'table', 'meta'] },
  fram: { schema: FR.SCHEMA, empty: FR.emptyFram, validate: FR.validateFram, normalize: FR.normalizeFram, lint: FR.lintFram, find: FR.findFram, example: 'data/example-fram.json', tabs: ['form', 'diagram', 'analysis', 'table', 'meta'] },
  pyramid: { schema: PY.SCHEMA, empty: PY.emptyPyramid, validate: PY.validatePyramid, normalize: PY.normalizePyramid, lint: PY.lintPyramid, find: PY.findPyramid, example: 'data/example-pyramid.json', tabs: ['form', 'diagram', 'analysis', 'table', 'meta'] },
};
const TYPE_IDS = Object.keys(TYPES);

const state = {
  baseline: null,
  swissSource: null,
  type: 'bowtie',
  models: {},
  undo: { bowtie: [], swiss: [], shell: [], hfacs: [], stamp: [], fram: [], pyramid: [] },
  links: [],
  redo: { bowtie: [], swiss: [], shell: [], hfacs: [], stamp: [], fram: [], pyramid: [] },
  selectedId: null,
  selectedKind: null,
  showEsc: true,
  fs: 1,            // interface text scale (a UI preference, never part of a model)
  panelOpen: true,  // the details panel (inspector, quality, help ...); a bottom sheet on narrow screens
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
const BASE_KEY = 'safetytool.baseline';
const SRC_KEY = 'safetytool.swissSource';

// ---------- persistence (storage can be unavailable) ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
const save = () => lsSet(keyOf(state.type), JSON.stringify(cur()));
const savePrefs = () => lsSet(PREF, JSON.stringify({ lang: state.lang, dark: state.dark, showEsc: state.showEsc, help: state.help, type: state.type, fs: state.fs }));

// ---------- interface text size (a local UI preference; the diagram and exports are not scaled by it) ----------
const FONT_SCALES = [0.9, 1, 1.1, 1.2];
function applyFontScale() {
  document.documentElement.style.setProperty('--fs', String(state.fs));
  document.querySelectorAll('input[name=fs]').forEach((r) => { r.checked = Number(r.value) === state.fs; });
}
function setFontScale(v) {
  const n = Number(v);
  state.fs = FONT_SCALES.includes(n) ? n : 1;
  applyFontScale(); savePrefs();
  if (state.tab === 'diagram') drawDiagram({ fit: true });   // the stage may have changed size (header wraps differently)
}

// ---------- details panel: a side column on wide screens, a bottom sheet on narrow ones ----------
const narrowMQ = window.matchMedia('(max-width: 900px)');
function setPanel(open, { focus = false } = {}) {
  state.panelOpen = open;
  document.body.dataset.panel = open ? 'open' : 'closed';
  const b = document.querySelector('#b-panel');
  [b, document.querySelector('#b-panel-fab')].forEach((x) => { if (x) x.setAttribute('aria-expanded', String(open)); });
  if (focus) { if (open) { const t0 = document.querySelector('#side [role=tab][aria-selected=true]'); if (t0) t0.focus(); } else { const f = document.querySelector('#b-panel-fab'); (f && getComputedStyle(f).display !== 'none' ? f : b).focus(); } }
  if (state.tab === 'diagram' && state.last) drawDiagram({ fit: true });
}

// ---------- mutations with undo ----------
function snapshot() {
  const u = state.undo[state.type];
  u.push(JSON.stringify(cur()));
  if (u.length > 100) u.shift();
  state.redo[state.type] = [];
}
/**
 * Apply an edit. `rebuild` redraws the form and the inspector (structure changed). `keepMeta` is for the model-info tab itself:
 * its fields already show what was typed, so redrawing them only destroys the field the user is moving to.
 * When the edit comes from a field's "change" event (focus is on its way to another field) the rebuild waits until focus has
 * landed, then focus and caret are put back on the same field.
 */
function mutate(fn, { rebuild = false, keepMeta = false } = {}) {
  snapshot();
  const wasExample = !!cur().meta.illustrative;
  const period = state.type === 'pyramid' ? cur().dataset.periodStart + '|' + cur().dataset.periodEnd : null;
  fn(cur());
  M.touch(cur());
  if (wasExample && cur().meta.illustrative) exEdited.add(exKey());
  save();
  refresh({ meta: !keepMeta });
  if (period != null && period !== cur().dataset.periodStart + '|' + cur().dataset.periodEnd && cur().exposure.value != null) flash(t('pyPeriodDenom'));
  if (!rebuild) return;
  const redo = () => keepFocus(FOCUS_ROOTS, document, () => { if (state.tab === 'form') drawForm(); drawInspector(); });
  const fromChange = typeof window.event !== 'undefined' && window.event && window.event.type === 'change';
  if (fromChange) setTimeout(redo, 0); else redo();
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
  // an opened file is checked as strictly as a package member (adds evidence, assurance and corrective-action rules for bowties)
  const errs = (IC.adapterOf(m) || TYPES[type]).validate(m);
  if (errs.length) { alert(t('badFile') + errs.slice(0, 5).join('; ')); return false; }
  const switched = type !== state.type;
  state.type = type;
  state.undo[type] = [];
  state.redo[type] = [];
  state.models[type] = TYPES[type].normalize(m);
  state.galleryId = null;
  setSwissSource(null);
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

// ---------- an example the user has started to edit: offer to make it their own work ----------
const exEdited = new Set();      // modelIds of examples the user has edited
const exKept = new Set();        // ...and chose to keep editing as the example
const exKey = () => cur().meta.modelId || state.type;
function drawExampleBar() {
  const b = $('#exbar');
  if (!b) return;
  const m = state.models[state.type];
  if (!m || !(m.meta.illustrative && exEdited.has(exKey()) && !exKept.has(exKey()))) { b.hidden = true; return; }
  b.textContent = '';
  const p = document.createElement('p');
  p.textContent = t('exMsg');
  const row = document.createElement('div');
  row.className = 'wl-actions';
  const copy = btn(t('exCopy'), makeOwnWork, 'primary');
  const keep = btn(t('exKeep'), () => { exKept.add(exKey()); drawExampleBar(); });
  row.append(copy, keep);
  b.append(p, row);
  b.hidden = false;
}
/** The user's edits stay; what marks the model as the teaching example (title, author, scope, flag, identity, a borrowed denominator) goes. */
function makeOwnWork() {
  snapshot();
  const m = cur();
  m.meta.title = ''; m.meta.author = ''; m.meta.scope = ''; m.meta.illustrative = false;
  m.meta.modelId = IC.rid('md');
  if (state.type === 'pyramid') {
    m.exposure = { value: null, unit: '', definition: '', rateScale: 1000 };
    ['name', 'description', 'observationNote', 'inclusion', 'exclusion', 'duplicateHandling', 'reportingLimitations'].forEach((k) => { if (/synthetic/i.test(m.dataset[k] || '')) m.dataset[k] = ''; });
  }
  state.galleryId = null;       // saving must not overwrite the example's gallery entry
  M.touch(m);
  save();
  refresh({ inspector: true, form: true });
  flash(t('exCopied') + (state.type === 'pyramid' ? ' ' + t('exCopiedPy') : ''));
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
  state.viewFitted = true;   // until the user pans/zooms: a resize then refits the diagram to the new size
  applyView();
}
const explain = (kind) => (state.help ? explainShort(state.type, kind, state.lang) : '');

function onSelect(id, kind) {
  state.selectedId = id;
  state.selectedKind = kind || (spec().find(cur(), id) || {}).kind || null;
  // choosing a bow-tie element always shows its details (it used to open whichever panel was used last, leaving the details one click away)
  const tab = id && state.type === 'bowtie' ? 'inspector' : state.help ? 'help' : state.type === 'bowtie' ? 'inspector' : state.rtab;
  if (tab !== state.rtab) setRightTab(tab);
  refresh({ inspector: true });
  if (id && narrowMQ.matches && !state.panelOpen) setPanel(true); // on a phone the details open as a sheet when something is chosen
}

/** A node that was just added must not sit outside the visible stage: if any part of it is cut off, centre on it. */
function revealNode(id) {
  const lay = state.last && state.last.layout;
  const items = lay && (lay.items || lay.nodes);
  const it = items && items.find((x) => x.id === id || x.realId === id);
  if (!it || ![it.x, it.y, it.w, it.h].every(Number.isFinite)) return;
  const { w, h } = stageSize();
  const k = state.view.k;
  const x0 = it.x * k + state.view.x; const y0 = it.y * k + state.view.y;
  if (x0 < 0 || y0 < 0 || x0 + it.w * k > w || y0 + it.h * k > h) centerOn(id);
}

function drawDiagram({ fit = false } = {}) {
  const svg = $('#svg');
  const { w, h } = stageSize();
  state.last = renderModel(svg, state.type, cur(), {
    showEsc: state.showEsc, selectedId: state.selectedId, dark: state.dark, kindTags: state.help, explain, onSelect, lang: state.lang,
  });
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  drawStat();
  if (fit) fitView(); else applyView();
}

/** One quiet row of counts above the picture (derived from the model; no scores). */
function drawStat() {
  const host = $('#statline');
  if (!host) return;
  host.textContent = '';
  const m = cur();
  const chip = (label, n, cls) => { const s = document.createElement('span'); s.className = 'sl' + (cls ? ' ' + cls : ''); s.textContent = n == null ? label : label + ': ' + n; host.appendChild(s); };
  if (state.type === 'bowtie') { chip('THREATS', m.threats.length); chip('BARRIERS', m.controls.length); chip('CONSEQUENCES', m.consequences.length); chip('ESCALATIONS', m.escalations.length); }
  else if (state.type === 'swiss') { const holes = m.layers.flatMap((l) => l.holes); chip('LAYERS', m.layers.length); chip('ACTIVE', holes.filter((h) => h.type === 'active').length); chip('LATENT', holes.filter((h) => h.type === 'latent').length); chip('ALIGNED', m.trajectory.length); }
  else if (state.type === 'shell') { chip('ITEMS', SH.COMPONENTS.reduce((s, c) => s + m.components[c].length, 0)); chip('FINDINGS', SH.INTERFACES.reduce((s, i) => s + m.interfaces[i].findings.length, 0)); chip('MISMATCH', SH.INTERFACES.filter((i) => m.interfaces[i].status === 'mismatch').length, 'bad'); chip('UNKNOWN', SH.INTERFACES.filter((i) => m.interfaces[i].status === 'unknown').length); }
  else if (state.type === 'hfacs') { const a = HF.analyzeHfacs(m); chip('FACTORS', a.total); chip('LEVELS COVERED', (4 - a.levelsWithNothing.length) + '/4'); chip('UNCLASSIFIED', a.unclassified); }
  else if (state.type === 'stamp') { const a = ST.analyzeStamp(m); chip('CONTROL ACTIONS', a.counts.controlActions); chip('UCAs', a.counts.ucas); chip('SCENARIOS', a.counts.scenarios); }
  if (m.meta && m.meta.illustrative) chip(state.lang === 'th' ? 'ตัวอย่างประกอบ' : 'ILLUSTRATIVE EXAMPLE', null, 'warn');
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
    setRightTab('inspector');
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
  if (state.type === 'hfacs') return NT.hfacsRows(m, add, rows, state.lang);
  if (state.type === 'stamp') return NT.stampRows(m, add, rows, state.lang);
  if (state.type === 'fram') return FP.framRows(m, add, rows, state.lang);
  if (state.type === 'pyramid') return FP.pyramidRows(m, add, rows, state.lang);
  if (state.type === 'bowtie') {
    const ctlDetail = (c) => {
      const bits = [];
      if (c.function) bits.push(t('fn.' + c.function));
      if (c.type) bits.push(t('ty.' + c.type));
      if (c.critical) bits.push('★ critical');
      if (Array.isArray(c.sharedWith) && c.sharedWith.length) bits.push('⇄ ×' + (c.sharedWith.length + 1));
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

function fieldEl(ref, key, type, { keepMeta = false } = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'fld';
  const cap = document.createElement('span');
  cap.textContent = t('f.' + key);
  wrap.appendChild(cap);
  let input;
  const commit = (v) => mutate(() => { ref[key] = v; }, { keepMeta });
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

/** A control can stand on several threats' (or consequences') lanes: still ONE object, one state, one set of evidence. */
function drawSharing(host, m, c) {
  const rec = c.side === 'recover';
  const lanes = rec ? m.consequences : m.threats;
  const own = rec ? c.consequenceId : c.threatId;
  const box = document.createElement('section');
  box.className = 'assure';
  const h = document.createElement('h3');
  h.textContent = t(rec ? 'sharedHeadRec' : 'sharedHead');
  box.appendChild(h);
  const note = document.createElement('p');
  note.className = 'muted';
  note.textContent = t('sharedNote');
  box.appendChild(note);
  const home = lanes.find((x) => x.id === own);
  const hp = document.createElement('p');
  hp.textContent = t('sharedHome') + ': ' + ((home && home.text) || own);
  box.appendChild(hp);
  const others = lanes.filter((x) => x.id !== own);
  if (!others.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = t('sharedOnly'); box.appendChild(p); }
  others.forEach((x) => {
    const lab = document.createElement('label');
    lab.className = 'fld chk';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = Array.isArray(c.sharedWith) && c.sharedWith.includes(x.id);
    cb.addEventListener('change', () => mutate((model) => {
      const cur2 = new Set((model.controls.find((k) => k.id === c.id).sharedWith) || []);
      if (cb.checked) cur2.add(x.id); else cur2.delete(x.id);
      M.setShared(model, c.id, [...cur2]);
    }, { rebuild: true }));
    const sp = document.createElement('span');
    sp.textContent = x.text || x.id;
    lab.append(cb, sp);
    box.appendChild(lab);
  });
  host.appendChild(box);
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
  if (kind === 'control') { drawSharing(host, cur(), ref); drawAssurance(host, cur(), ref, { lang: state.lang, mutate, flash, confirmDelete }); }
  const row = document.createElement('div');
  row.className = 'btnrow';
  const pick = (id, kd) => { state.selectedId = id; state.selectedKind = kd; refresh({ inspector: true }); requestAnimationFrame(() => revealNode(id)); };
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
      if (!confirmDelete((x) => M.removeNode(x, ref.id))) return;
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
function startGuide() { state.guide = { on: true, step: 0 }; setRightTab('help'); if (narrowMQ.matches) setPanel(true); }

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
  const ex = modelExample(state.type, state.lang);
  if (ex) {   // optional, collapsed: a small picture of what this model looks like (drawn for this tool, js/modelintro.js)
    const d = mk('details', null, 'gloss model-ex');
    d.appendChild(mk('summary', t('viewExample')));
    const fig = mk('div'); fig.innerHTML = ex.svg;   // static markup from our own module, no user data
    d.append(fig, mk('p', ex.caption, 'muted'));
    host.appendChild(d);
  }

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
  if (on && narrowMQ.matches) setPanel(true);   // help lives in the details panel, which is closed by default on a phone
}
function syncHelpButton() { $('#b-help').setAttribute('aria-pressed', String(state.help)); }

function setRightTab(name) {
  state.rtab = name;
  ['inspector', 'quality', 'help', 'gallery', 'links'].forEach((n) => {
    $('#rp-' + n).hidden = n !== name;
    const b = $('#r-' + n);
    b.setAttribute('aria-selected', String(n === name));
    b.tabIndex = n === name ? 0 : -1;
  });
  if (name === 'help') drawHelp();
  if (name === 'gallery') drawGalleryPane();
  if (name === 'links') drawLinks();
}

// ---------- meta tab ----------
function drawMeta() {
  const host = $('#meta');
  host.textContent = '';
  const m = cur().meta;
  [['title', 'line'], ['scope', 'area'], ['author', 'line']].forEach(([k, ty]) => host.appendChild(fieldEl(m, k, ty, { keepMeta: true })));
  host.appendChild(fieldEl(m, 'illustrative', 'bool', { keepMeta: true }));
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = t('disclaimer');
  host.appendChild(p);
}

// ---------- form tab ----------
function drawForm() {
  const host = $('#form');
  const api = { t, mutate, lang: state.lang, confirmDelete };
  const top = host.scrollTop;
  if (state.type === 'swiss') { buildSwissForm(host, cur(), { ...api, evidenceFor: (holder) => evidenceChoices(cur(), holder, api) }); buildSourcesEditor(host, cur(), api); }
  else if (state.type === 'shell') buildShellForm(host, cur(), api);
  else if (state.type === 'hfacs') buildHfacsForm(host, cur(), api);
  else if (state.type === 'stamp') buildStampForm(host, cur(), api);
  else if (state.type === 'fram') buildFramForm(host, cur(), api);
  else if (state.type === 'pyramid') buildPyramidForm(host, cur(), api);
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
  // modelId stays unique across gallery works; "save as new" stores a copy with a fresh modelId and leaves the original alone (js/safeopen.js)
  IC.ensureIdentity(cur());   // the open model needs its id before a copy is made, or the copy and the original would disagree
  const r = SO.saveWorkPlan(readWorks(), { id: state.galleryId, type: state.type, model: cur(), asNew, newWorkId: newId(), newModelId: () => IC.rid('md') });
  if (!r.ok || !writeWorks(r.works)) return null;
  state.galleryId = r.id;
  return r.id;
}
/**
 * Opening a model replaces the open model of its type. When that would destroy a model that has content, ask first (saying how many
 * cross-model links lose their end), keep the old model in the gallery, and replace nothing if the backup cannot be written.
 */
function openGuarded(m, opts) {
  const type = detectType(m);
  const bad = type ? (IC.adapterOf(m) || TYPES[type]).validate(m) : ['x'];
  if (!type || bad.length) return loadModel(m, opts);   // loadModel shows its own error
  const r = SO.guardedOpen({
    type, current: loadSlot(type), incoming: m, links: state.links, read: readWorks, write: writeWorks, newWorkId: newId(), newModelId: () => IC.rid('md'),
    ask: (plan) => confirm(t('confirmOpen') + (plan.affectedLinks ? '\n\n' + t('confirmDeleteLinks').replace('{n}', String(plan.affectedLinks)) : '')),
  });
  if (!r.proceed) { if (r.reason === 'backup-failed') alert(t('openBackupFail')); return false; }
  if (r.backedUp) flash(t('openBackedUp'));
  return loadModel(m, opts);
}
function drawGalleryPane() {
  drawGallery($('#gallery'), {
    lang: state.lang, currentType: state.type, currentId: state.galleryId, thumbSvg,
    openModel: (m, workId) => { if (openGuarded(m)) { state.galleryId = workId; drawGalleryPane(); } },
    saveCurrent: saveToGallery,
    onChange: drawGalleryPane,
  });
}

// ---------- labels / layout ----------
const WELCOME_KEY = 'safetytool.welcomed';
const FEEDBACK_URL = 'https://github.com/dukperado-hue/Safetytool/issues/new?template=pilot-feedback.yml';
/** First visit only: what this is, four steps, a way to give feedback. Dismissing is remembered in this browser. */
function drawWelcome() {
  const w = $('#welcome');
  if (!w) return;
  if (lsGet(WELCOME_KEY)) { w.hidden = true; return; }
  w.textContent = '';
  const el = (tag, text, attrs = {}) => { const e = document.createElement(tag); if (text != null) e.textContent = text; Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  w.appendChild(el('h2', t('welcomeTitle')));
  w.appendChild(el('p', t('welcomeBody')));
  t('welcomeSteps').split(/\s{2,}/).forEach((s) => w.appendChild(el('p', s)));   // one line per step
  w.appendChild(el('p', t('welcomeNote'), { class: 'muted' }));
  const row = el('div', null, { class: 'wl-actions' });
  const guide = el('button', t('welcomeGuide'), { type: 'button' });
  guide.addEventListener('click', () => { if (!state.help) setHelp(true); else setRightTab('help'); });
  const blank = el('button', t('welcomeNew'), { type: 'button' });
  blank.addEventListener('click', () => $('#b-new').click());
  const fb = el('a', t('welcomeFeedback'), { href: FEEDBACK_URL, target: '_blank', rel: 'noopener noreferrer' });
  const close = el('button', t('welcomeClose'), { type: 'button' });
  close.addEventListener('click', () => { lsSet(WELCOME_KEY, '1'); w.hidden = true; });
  row.append(guide, blank, fb, close);
  w.appendChild(row);
  w.hidden = false;
}
function labels() {
  drawWelcome();
  drawExampleBar();
  document.documentElement.lang = state.lang;
  document.title = `${t('app')} — ${t('m' + state.type[0].toUpperCase() + state.type.slice(1))}`;
  const map = {
    '#b-save .lbs': 'saveShort', '#b-file': 'fileMenu', '#b-view': 'viewMenu', '#b-settings': 'settingsMenu', '#b-panel': 'panel', '#b-panel-fab': 'panel', '#b-panel-close': 'panelClose',
    '#fs-legend': 'fsLegend', '#fs-l90': 'fs90', '#fs-l100': 'fs100', '#fs-l110': 'fs110', '#fs-l120': 'fs120', '#fs-reset': 'fsReset',
    '#b-example': 'example', '#b-new': 'new', '#b-open': 'open', '#b-save': 'save', '#b-svg': 'svg', '#b-png': 'png', '#b-csv': 'csv', '#b-print': 'print',
    '#b-undo': 'undo', '#b-redo': 'redo', '#b-fit': 'fit', '#b-lang': 'lang', '#b-clear': 'clearModel', '#b-fit2': 'fit', '#b-lang2': 'lang', '#b-theme': 'theme', '#b-help': 'help',
    '#tab-diagram': 'tabDiagram', '#tab-simulate': 'tabSimulate', '#tab-compare': 'tabCompare', '#tab-report': 'tabReport', '#tab-analysis': 'tabAnalysis', '#tab-table': 'tabTable', '#tab-meta': 'tabMeta', '#tab-form': 'tabForm',
    '#r-inspector': 'rInspector', '#r-help': 'rHelp', '#r-gallery': 'rGallery', '#r-links': 'rLinks',
    '#m-bowtie': 'mBowtie', '#m-swiss': 'mSwiss', '#m-shell': 'mShell', '#m-hfacs': 'mHfacs', '#m-stamp': 'mStamp', '#m-fram': 'mFram', '#m-pyramid': 'mPyramid', '#events-label': 'eventsLabel',
  };
  // a button that also carries an icon keeps it: only its .lb part is text (and the full label becomes its tooltip)
  Object.entries(map).forEach(([sel, key]) => { const e = $(sel); const lb = e.querySelector('.lb'); (lb || e).textContent = t(key); if (lb) e.title = t(key); });
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
  const src = JSON.parse(JSON.stringify(cur()));
  const made = SW.swissFromBowtie(src, { threatId, consequenceId: consequenceId || null });
  const sw = loadSlot('swiss');
  // same Safe Open contract as any other open: one confirmation (only when a Swiss model with layers would be replaced; it also names
  // the links that lose an end), the old model is kept in the gallery first, and nothing is replaced if that backup cannot be written
  const r = SO.guardedOpen({
    type: 'swiss', current: sw, incoming: made, links: state.links, read: readWorks, write: writeWorks, newWorkId: newId(), newModelId: () => IC.rid('md'),
    ask: (plan) => !(sw && sw.layers && sw.layers.length) || confirm(t('replaceSwiss') + (plan.affectedLinks ? '\n\n' + t('confirmDeleteLinks').replace('{n}', String(plan.affectedLinks)) : '')),
  });
  if (!r.proceed) { if (r.reason === 'backup-failed') alert(t('openBackupFail')); return; }
  if (r.backedUp) flash(t('openBackedUp'));
  state.type = 'bowtie';
  if (loadModel(made)) { setSwissSource(src); setTab('analysis'); }
}
const openSwiss = openSwissFromBowtie;
/** The pinned baseline survives a reload (browser-local, like the autosave). Stored as { title, model }. */
function setBaseline(b) {
  state.baseline = b;
  try { if (b) localStorage.setItem(BASE_KEY, JSON.stringify(b)); else localStorage.removeItem(BASE_KEY); } catch { /* storage unavailable: baseline lasts for this session only */ }
  refresh();
}
/** The bowtie a Swiss view was built from (for the uncontrolled-hole list). Browser-local, cleared whenever another file is loaded. */
function setSwissSource(src) {
  state.swissSource = src;
  try { if (src) localStorage.setItem(SRC_KEY, JSON.stringify(src)); else localStorage.removeItem(SRC_KEY); } catch { /* session only */ }
}
function loadBaseline() {
  try {
    const s = JSON.parse(lsGet(SRC_KEY) || 'null');
    if (s && !M.validateShape(s).length) state.swissSource = M.normalize(s);
  } catch { /* ignore */ }
  try {
    const b = JSON.parse(lsGet(BASE_KEY) || 'null');
    if (b && b.model && !M.validateShape(b.model).length) state.baseline = { title: String(b.title || ''), model: M.normalize(b.model) };
  } catch { /* ignore a damaged value */ }
}

function applyTheme() { document.documentElement.dataset.theme = state.dark ? 'dark' : 'light'; }

function refresh({ inspector = false, fit = false, form = false, meta = true } = {}) {
  drawLint();
  drawExampleBar();
  if (state.tab === 'diagram') drawDiagram({ fit });
  if (state.tab === 'simulate') drawSimulate($('#simulate'), cur(), { lang: state.lang, mutate, openSwiss });
  if (state.tab === 'analysis') {
    if (state.type === 'hfacs') NT.drawHfacsAnalysis($('#analysis'), cur(), { lang: state.lang });
    else if (state.type === 'stamp') NT.drawStampAnalysis($('#analysis'), cur(), { lang: state.lang });
    else if (state.type === 'fram') FP.drawFramAnalysis($('#analysis'), cur(), { lang: state.lang });
    else if (state.type === 'pyramid') FP.drawPyramidAnalysis($('#analysis'), cur(), { lang: state.lang, works: readWorks() });
    else drawSwissAnalysis($('#analysis'), cur(), { lang: state.lang, bowtie: state.swissSource });
  }
  if (state.tab === 'report') drawReport($('#report'), cur(), { lang: state.lang, baseline: state.baseline, svg: reportSvg, download, fileBase });
  if (state.tab === 'compare') drawCompare($('#compare'), cur(), { lang: state.lang, baseline: state.baseline, setBaseline });
  if (state.tab === 'table') drawTable();
  if (state.tab === 'meta' && meta) drawMeta();
  if (state.tab === 'form' && form) drawForm();
  if (inspector) drawInspector();
  if (state.rtab === 'help') drawHelp();
  if (!cur().meta.modelId) { IC.ensureIdentity(cur()); save(); }
  if (state.rtab === 'links') drawLinks();
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
  TYPE_IDS.forEach((id) => {
    const b = $('#m-' + id);
    b.setAttribute('aria-pressed', String(id === state.type));
    if (id === state.type && b.scrollIntoView) b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); // the strip scrolls sideways on a phone
  });
  $('#chk-esc').closest('label').hidden = state.type !== 'bowtie';  labels();
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
const fileBase = () => (cur().meta.title || state.type).replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '_').slice(0, 60) || state.type;
const csvQ = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

function toCsv() {
  if (state.type === 'hfacs' || state.type === 'stamp') return NT.toCsv(state.type, cur());
  if (state.type === 'fram' || state.type === 'pyramid') return FP.toCsv(state.type, cur());
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

/** Models whose example also exists in Thai (data/example-<type>.th.json); the other examples are a single file. */
const THAI_EXAMPLES = ['hfacs', 'fram', 'stamp'];
const exampleFile = (type, lang) => (lang === 'th' && THAI_EXAMPLES.includes(type) ? TYPES[type].example.replace(/\.json$/, '.th.json') : TYPES[type].example);

async function loadExample() {
  try {
    let r = await fetch(exampleFile(state.type, state.lang), { cache: 'no-cache' });
    if (!r.ok && exampleFile(state.type, state.lang) !== spec().example) r = await fetch(spec().example, { cache: 'no-cache' });   // no Thai file: use the English one rather than nothing
    if (!r.ok) throw new Error(String(r.status));
    openGuarded(await r.json());
  } catch (e) {
    alert(t('badFile') + e.message);
  }
}

/** Print / save as PDF: a clean vector copy of the diagram scaled to the page. */
function printDiagram() {
  const root = $('#print-root');
  root.textContent = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const out = renderModel(svg, state.type, cur(), { showEsc: state.showEsc, forExport: true, dark: false, kindTags: state.help, lang: state.lang });
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

// ---------- connections: identity, links, derived models, packages ----------
const LINKS_KEY = 'safetytool.links';
function loadLinks() { try { const a = JSON.parse(lsGet(LINKS_KEY) || '[]'); state.links = Array.isArray(a) ? a : []; } catch { state.links = []; } }
function setLinks(l) { state.links = l; lsSet(LINKS_KEY, JSON.stringify(l)); }

// ---------- deleting something that other models link to ----------
const modelsById = () => new Map(workspace().map((w) => [w.model.meta.modelId, w.model]));
/**
 * Ask before an edit that removes entities. `apply(copy)` is the same edit the caller will run, tried on a copy to see what it would remove
 * (a cascade counts too). With no link affected this is exactly the confirmation the caller always had (`ask` = it had one);
 * with links it says how many, and that they stay (shown as broken, removable by hand). Links are never deleted or rewritten here.
 */
function confirmDelete(apply, { ask = true } = {}) {
  const m = cur();
  IC.ensureIdentity(m);
  const { links } = IC.deleteImpact(state.links, m, apply);
  if (!links.length) return ask ? confirm(t('confirmDelete')) : true;
  return confirm(t('confirmDeleteLinks').replace('{n}', String(links.length)));
}

// ---------- go to the entity a link points at ----------
function centerOn(id) {
  const lay = state.last && state.last.layout;   // renderModel returns { width, height, layout }; a bowtie layout calls its boxes `nodes`, the others `items`
  const items = lay && (lay.items || lay.nodes);
  const it = items && items.find((x) => x.id === id || x.realId === id);
  if (!it || ![it.x, it.y, it.w, it.h].every(Number.isFinite)) return;
  const { w, h } = stageSize();
  const k = Math.max(state.view.k, 0.8);
  const cy = narrowMQ.matches && state.panelOpen ? h * 0.22 : h / 2;   // on a phone the details sheet covers the lower part
  state.viewFitted = false;
  state.view = { k, x: w / 2 - (it.x + it.w / 2) * k, y: cy - (it.y + it.h / 2) * k };
  applyView();
}
/** ref = { modelId, entityId } of one end of a link. Only an end that resolves in the workspace can be visited; nothing is changed in any model. */
async function goToEntity(ref) {
  const nav = IC.navigationTarget(modelsById(), ref);
  if (!nav.ok) { flash(t('navMissing')); return false; }
  const stayOnLinks = state.rtab === 'links';
  if (nav.modelType !== state.type) await switchType(nav.modelType);   // the existing model switch (the open model of each type is kept as it is)
  setTab('diagram');
  const hit = spec().find(cur(), nav.baseId);
  if (!hit) { flash(t('navNoDiagram')); if (stayOnLinks) setRightTab('links'); return true; }   // evidence, assumptions, interfaces: no node to select
  onSelect(nav.baseId, hit.kind);
  centerOn(nav.baseId);
  if (stayOnLinks) setRightTab('links');
  return true;
}
function loadSlot(type) {
  if (state.models[type]) return state.models[type];
  const saved = lsGet(keyOf(type));
  if (saved) { try { const m = JSON.parse(saved); if (!TYPES[type].validate(m).length) state.models[type] = TYPES[type].normalize(m); } catch { /* ignore a damaged slot */ } }
  return state.models[type] || null;
}
function workspace() { TYPE_IDS.forEach(loadSlot); return TYPE_IDS.filter((id) => state.models[id]).map((id) => ({ type: id, model: state.models[id] })); }
function persistAll() { TYPE_IDS.forEach((id) => { if (state.models[id]) lsSet(keyOf(id), JSON.stringify(state.models[id])); }); }
function ensureIdentities() { workspace().forEach((w) => IC.ensureIdentity(w.model)); persistAll(); }
/** Keep the model now in a slot in the gallery before `model` replaces it (also when the modelId is the same but the content differs). -> { ok, backedUp }; ok=false means: replace nothing. */
function backupSlot(type, model) {
  return SO.backupBeforeReplace({ type, current: state.models[type] || loadSlot(type), incoming: model, read: readWorks, write: writeWorks, newWorkId: newId(), newModelId: () => IC.rid('md') });
}
/**
 * Put a model into its slot. The previous model is saved to the gallery first; if that cannot be done (gallery full, storage refused)
 * nothing is replaced and { ok:false } is returned. Undo/redo of that slot are cleared on success, as before.
 */
function setSlot(type, model, { backedUp = false } = {}) {
  const b = backedUp ? { ok: true, backedUp: false } : backupSlot(type, model);
  if (!b.ok) return b;
  state.models[type] = TYPES[type].normalize(model);
  IC.ensureIdentity(state.models[type]);
  state.undo[type] = []; state.redo[type] = [];
  lsSet(keyOf(type), JSON.stringify(state.models[type]));
  return b;
}
/** Add links. An identical link is skipped; a link whose id exists with different content gets a new id (nothing is overwritten). */
function mergeLinks(links) {
  const byId = new Map(state.links.map((x) => [x.id, JSON.stringify(x)]));
  const add = [];
  links.forEach((l) => { const had = byId.get(l.id); if (had === JSON.stringify(l)) return; add.push(had ? { ...l, id: IC.rid('lk') } : l); });
  setLinks([...state.links, ...add]);
}
function applyDerived(result, destType) {
  if (!setSlot(destType, result.model).ok) { alert(t('openBackupFail')); return false; }
  mergeLinks(result.links);
  state.type = destType; state.selectedId = null; state.selectedKind = null; state.galleryId = null;
  applyType({ fit: true });
  return true;
}
function applyImport(plan) {
  let saved = 0;
  // all-or-nothing: every slot that would be replaced is backed up first; if any backup fails nothing is replaced and no link is merged
  const backups = [];
  if (!plan.actions.every((a) => { const b = backupSlot(a.type, a.model); backups.push(b); return b.ok; })) { alert(t('openBackupFail')); return false; }
  saved = backups.filter((b) => b.backedUp).length;
  plan.actions.forEach((a) => setSlot(a.type, a.model, { backedUp: true }));
  mergeLinks(plan.links);
  if (plan.actions.length && !plan.actions.some((a) => a.type === state.type)) state.type = plan.actions[0].type;
  state.selectedId = null; state.selectedKind = null; state.galleryId = null;
  applyType({ fit: true });
  if (saved) flash((state.lang === 'th' ? 'บันทึกโมเดลเดิมลงคลังงานก่อนแทนที่: ' : 'Previous models saved to the gallery before being replaced: ') + saved);
  return true;
}
function drawLinks() {
  drawConnections($('#links'), {
    lang: state.lang, current: { type: state.type, model: cur() }, selectedId: state.selectedId,
    mutate: (fn, o) => { mutate(fn, o); if (o && o.rebuild) drawLinks(); },
    workspace, getLinks: () => state.links, setLinks, ensureIdentities, persistAll, applyDerived, applyImport, download, flash, refresh: drawLinks, goTo: goToEntity, confirmDelete,
  });
}

// ---------- wiring ----------
function bind() {
  // Header menus (<details class="more">): close after a command, on a click elsewhere, when focus leaves, and on Escape (focus returns to the menu button).
  // A switch inside a menu (the Escalation checkbox) does not close it. The commands themselves are bound by id below.
  document.querySelectorAll('details.more').forEach((menu) => {
    const btn = menu.querySelector('summary');
    menu.addEventListener('click', (ev) => { if (ev.target.closest('.menu button')) { menu.open = false; btn.focus(); } });
    menu.addEventListener('focusout', (ev) => { if (menu.open && ev.relatedTarget && !menu.contains(ev.relatedTarget)) menu.open = false; });
    menu.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && menu.open) { ev.stopPropagation(); menu.open = false; btn.focus(); } });
    // keep an opened menu inside the viewport (a menu near the right edge of a narrow screen would otherwise be cut off)
    menu.addEventListener('toggle', () => {
      const m = menu.querySelector('.menu');
      if (!m) return;
      m.style.transform = '';
      if (!menu.open) return;
      const r = m.getBoundingClientRect(); const vw = document.documentElement.clientWidth;
      if (r.right > vw - 6) m.style.transform = 'translateX(' + Math.round(vw - 6 - r.right) + 'px)';
      else if (r.left < 6) m.style.transform = 'translateX(' + Math.round(6 - r.left) + 'px)';
    });
  });
  document.addEventListener('click', (ev) => {
    document.querySelectorAll('details.more[open]').forEach((menu) => { if (!menu.contains(ev.target)) menu.open = false; });
  });
  $('#b-example').addEventListener('click', loadExample);
  $('#b-new').addEventListener('click', () => {
    // "New" replaces the whole model, so every link that touches it will point at something that is gone: say so first
    const affected = IC.linksTouching(state.links, cur().meta.modelId, IC.entityIdsOf(cur())).length;
    if (!confirm(t('confirmNew') + (affected ? '\n\n' + t('confirmDeleteLinks').replace('{n}', String(affected)) : ''))) return;
    // keep the model being replaced in the gallery first (undo does not survive a reload); nothing is replaced if that cannot be done
    const fresh = spec().empty();
    const kept = backupSlot(state.type, fresh);
    if (!kept.ok) { alert(t('openBackupFail')); return; }
    if (kept.backedUp) flash(t('openBackedUp'));
    snapshot();
    state.models[state.type] = fresh;
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
    try { openGuarded(JSON.parse(await f.text())); } catch (e) { alert(e instanceof SyntaxError ? t('notJson') : t('badFile') + e.message); }
  });
  $('#b-save').addEventListener('click', () => download(fileBase() + '.' + state.type + '.json', new Blob([JSON.stringify(cur(), null, 2)], { type: 'application/json' })));
  $('#b-svg').addEventListener('click', async () => download(fileBase() + '.svg', new Blob([exportSvgString(state.type, cur(), { showEsc: state.showEsc, kindTags: state.help, lang: state.lang, fontCss: await embeddedFontCss() })], { type: 'image/svg+xml' })));
  $('#b-png').addEventListener('click', async () => download(fileBase() + '.png', await exportPngBlob(state.type, cur(), { showEsc: state.showEsc, kindTags: state.help, lang: state.lang }, 3)));
  $('#b-csv').addEventListener('click', () => download(fileBase() + '.csv', new Blob([toCsv()], { type: 'text/csv;charset=utf-8' })));
  $('#b-print').addEventListener('click', printDiagram);
  $('#b-undo').addEventListener('click', doUndo);
  $('#b-redo').addEventListener('click', doRedo);
  $('#b-fit').addEventListener('click', fitView);
  // quick copies of Clear / Fit / Language on the toolbar row: they run the same handlers as the menu entries (Clear = "New": confirms and backs up first)
  $('#b-clear').addEventListener('click', () => $('#b-new').click());
  $('#b-fit2').addEventListener('click', () => $('#b-fit').click());
  $('#b-lang2').addEventListener('click', () => $('#b-lang').click());
  $('#b-lang').addEventListener('click', () => { state.lang = state.lang === 'th' ? 'en' : 'th'; savePrefs(); labels(); refresh({ inspector: true, form: true }); });
  $('#b-theme').addEventListener('click', () => { state.dark = !state.dark; applyTheme(); savePrefs(); refresh(); });
  $('#b-help').addEventListener('click', () => setHelp(!state.help));
  $('#chk-esc').addEventListener('change', (ev) => { state.showEsc = ev.target.checked; savePrefs(); drawDiagram({ fit: true }); });
  document.querySelectorAll('input[name=fs]').forEach((r) => r.addEventListener('change', () => { if (r.checked) setFontScale(r.value); }));
  $('#fs-reset').addEventListener('click', () => setFontScale(1));
  $('#b-panel').addEventListener('click', () => setPanel(!state.panelOpen, { focus: true }));
  $('#b-panel-fab').addEventListener('click', () => setPanel(true, { focus: true }));
  $('#b-panel-close').addEventListener('click', () => setPanel(false, { focus: true }));
  document.addEventListener('keydown', (ev) => {   // Escape closes the details sheet on a narrow screen (an open menu takes Escape first)
    if (ev.key === 'Escape' && narrowMQ.matches && state.panelOpen && !document.querySelector('details.more[open]') && ev.target.closest && $('#side').contains(ev.target)) setPanel(false, { focus: true });
  });
  narrowMQ.addEventListener('change', () => setPanel(!narrowMQ.matches));   // each width class starts from its own default
  $('#b-addthreat').addEventListener('click', () => { if (state.type !== 'bowtie') return; let id; mutate((m) => { id = M.addThreat(m).id; }); state.selectedId = id; state.selectedKind = 'threat'; setRightTab('inspector'); setTab('diagram'); drawInspector(); requestAnimationFrame(() => revealNode(id)); });
  $('#b-addcons').addEventListener('click', () => { if (state.type !== 'bowtie') return; let id; mutate((m) => { id = M.addConsequence(m).id; }); state.selectedId = id; state.selectedKind = 'consequence'; setRightTab('inspector'); setTab('diagram'); drawInspector(); requestAnimationFrame(() => revealNode(id)); });
  ['form', 'diagram', 'simulate', 'compare', 'report', 'analysis', 'table', 'meta'].forEach((n) => $('#tab-' + n).addEventListener('click', () => setTab(n)));
  ['inspector', 'quality', 'help', 'gallery', 'links'].forEach((n) => $('#r-' + n).addEventListener('click', () => setRightTab(n)));
  TYPE_IDS.forEach((id) => $('#m-' + id).addEventListener('click', () => { switchType(id); }));

  const stage = $('#stage');
  stage.addEventListener('click', () => { if (state.selectedId) { state.selectedId = null; state.selectedKind = null; refresh({ inspector: true }); } });
  let drag = null;
  // touch: two fingers pinch-zoom around their midpoint (one finger pans, as with the mouse)
  const pts = new Map();
  let pinch = null;
  const pinchGeom = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
  stage.addEventListener('pointerdown', (ev) => {
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) { pinch = Object.assign(pinchGeom(), { k: state.view.k, vx: state.view.x, vy: state.view.y }); drag = null; stage.setPointerCapture(ev.pointerId); return; }
    if (ev.target.closest('.st-node')) return;
    drag = { x: ev.clientX, y: ev.clientY, vx: state.view.x, vy: state.view.y, moved: false };
    stage.setPointerCapture(ev.pointerId);
  });
  const endPointer = (ev) => { pts.delete(ev.pointerId); if (pts.size < 2) pinch = null; };
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('pointermove', (ev) => {
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pts.size === 2) {
      const g = pinchGeom();
      const r = stage.getBoundingClientRect();
      const k1 = Math.min(3, Math.max(0.1, pinch.k * (g.d / pinch.d)));
      const px = pinch.cx - r.left; const py = pinch.cy - r.top;
      state.viewFitted = false;
      state.view.k = k1;
      state.view.x = px - (px - pinch.vx) * (k1 / pinch.k) + (g.cx - pinch.cx);
      state.view.y = py - (py - pinch.vy) * (k1 / pinch.k) + (g.cy - pinch.cy);
      applyView();
      return;
    }
    if (!drag) return;
    const dx = ev.clientX - drag.x; const dy = ev.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    state.viewFitted = false;
    state.view.x = drag.vx + dx; state.view.y = drag.vy + dy; applyView();
  });
  stage.addEventListener('pointerup', (ev) => { endPointer(ev); if (drag && drag.moved) ev.stopPropagation(); drag = null; });
  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const r = stage.getBoundingClientRect();
    const px = ev.clientX - r.left; const py = ev.clientY - r.top;
    const k0 = state.view.k;
    const k1 = Math.min(3, Math.max(0.1, k0 * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
    state.viewFitted = false;
    state.view.x = px - (px - state.view.x) * (k1 / k0);
    state.view.y = py - (py - state.view.y) * (k1 / k0);
    state.view.k = k1;
    applyView();
  }, { passive: false });

  // Window resized or device rotated: the stage has a new size, so redraw the diagram at that size. A diagram the user has not
  // moved or zoomed is refitted to the new stage; one the user positioned keeps its own zoom and position. Debounced: a drag-resize
  // fires many events. Other tabs are plain flowing HTML and re-flow by themselves; the details sheet follows its media query.
  const onResize = debounce(() => {
    if (state.tab === 'diagram' && state.last) drawDiagram({ fit: state.viewFitted !== false });
  }, 120);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest('input,textarea,select')) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); doRedo(); }
  });
}

async function init() {
  await loadThaiFont();   // text is measured for wrapping with this face: have it ready (waits at most 2 s, then the fallback is used)
  installCanvasMeasurer();
  registerOffline();
  window.addEventListener('online', netStatus);
  window.addEventListener('offline', netStatus);
  try {
    const p = JSON.parse(lsGet(PREF) || '{}');
    if (p.lang) state.lang = p.lang;
    state.dark = typeof p.dark === 'boolean' ? p.dark : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (typeof p.showEsc === 'boolean') state.showEsc = p.showEsc;
    if (FONT_SCALES.includes(p.fs)) state.fs = p.fs;
    if (typeof p.help === 'boolean') state.help = p.help;
    if (TYPE_IDS.includes(p.type)) state.type = p.type;
  } catch { /* ignore */ }
  $('#chk-esc').checked = state.showEsc;
  loadBaseline();
  loadLinks();
  applyTheme();
  applyFontScale();
  syncHelpButton();
  bind();
  setPanel(!narrowMQ.matches);
  if (state.help) state.rtab = 'help';
  let loaded = false;
  const saved = lsGet(keyOf(state.type));
  if (saved) {
    try { const m = JSON.parse(saved); if (!spec().validate(m).length) { state.models[state.type] = spec().normalize(m); loaded = true; } } catch { /* ignore */ }
  }
  setRightTab(state.rtab === 'inspector' && state.type !== 'bowtie' ? 'quality' : state.rtab);
  if (!loaded && state.type === 'bowtie') {
    // first visit: an empty bow-tie to start on (no example name, author, flag or numbers to carry into real work); examples are one click away
    state.models.bowtie = spec().empty();
    save();
    loaded = true;
  }
  if (!loaded) { await loadExample(); return; }
  state.tab = null;
  applyType({ fit: true });
}

init();
