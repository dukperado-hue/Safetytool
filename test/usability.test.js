// Regression tests for the findings of the persona trial (focus, example vs own work, report codes, Thai text).
// DOM-level behaviour is tested here against a small stand-in for the DOM; the same flows still need a check in a real browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captureFocus, restoreFocus, keepFocus } from '../js/keepfocus.js';
import { localizeMsg, showCodes } from '../js/msgs.js';
import { buildReport } from '../js/report.js';
import { bowtieCodes } from '../js/layout.js';
import * as M from '../js/model.js';
import * as PY from '../js/pyramid.js';
import { relativeFontCss, THAI_FAMILY } from '../js/fonts.js';

const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

// ---- a stand-in form: controls in a root; "rebuild" replaces every control with a fresh one (what drawForm does)
function fakeForm(n) {
  const root = { controls: [], contains(x) { return this.controls.includes(x); }, querySelectorAll() { return this.controls; } };
  const doc = { activeElement: null };
  const make = (i, value = '') => {
    const e = { i, value, selectionStart: value.length, selectionEnd: value.length, matches: () => true, closest: () => root,
      focus() { doc.activeElement = e; }, setSelectionRange(a, b) { e.selectionStart = a; e.selectionEnd = b; } };
    return e;
  };
  root.rebuild = (values) => { root.controls = values.map((v, i) => make(i, v)); doc.activeElement = null; };
  root.rebuild(Array.from({ length: n }, () => ''));
  return { root, doc };
}

test('focus: the field being moved to survives a rebuild, with its caret (type in A, go to B, form redrawn)', () => {
  const { root, doc } = fakeForm(3);
  doc.activeElement = root.controls[1]; root.controls[1].selectionStart = 2; root.controls[1].selectionEnd = 4;
  keepFocus({ }, doc, () => {}); // no root match is a no-op (closest is the stub below)
  const roots = 'x';
  doc.activeElement.closest = () => root;
  keepFocus(roots, doc, () => root.rebuild(['a', 'bbbb', 'c']));
  assert.equal(doc.activeElement.i, 1);
  assert.deepEqual([doc.activeElement.selectionStart, doc.activeElement.selectionEnd], [2, 4]);
});

test('focus: nothing is restored when the number of fields changed (a row was added), rather than focusing the wrong field', () => {
  const { root, doc } = fakeForm(3);
  const snap = captureFocus(root, root.controls[2]);
  root.rebuild(['', '', '', '']);
  assert.equal(restoreFocus(root, snap), false);
  assert.equal(doc.activeElement, null);
});

test('focus: a button or an element outside the form is never captured', () => {
  const { root } = fakeForm(2);
  assert.equal(captureFocus(root, { matches: () => false, closest: () => root }), null);
  assert.equal(captureFocus(root, { matches: () => true }), null);   // not inside root
});

test('wiring (source): the model-info tab does not redraw itself while the user types; a rebuild from a change event waits for focus to land', () => {
  assert.match(app, /fieldEl\(m, k, ty, \{ keepMeta: true \}\)/);
  assert.match(app, /if \(state\.tab === 'meta' && meta\) drawMeta\(\)/);
  assert.match(app, /window\.event\.type === 'change'/);
  assert.match(app, /setTimeout\(redo, 0\)/);
});

test('wiring (source): Delete buttons are out of the Tab order', () => {
  assert.match(readFileSync(new URL('../js/forms.js', import.meta.url), 'utf8'), /\\bdanger\\b.*tabIndex = -1/);
});

// ---- state level: what the user typed is what is saved, undo/redo and JSON reload keep it
test('state: several edits in a row, undo and redo, and a JSON round trip keep what was entered', () => {
  const m = M.emptyModel();
  const undo = []; const redo = [];
  const edit = (fn) => { undo.push(JSON.stringify(m)); fn(m); };
  edit((x) => { x.meta.title = 'ชื่อโมเดล'; });
  edit((x) => { x.meta.author = 'ผู้จัดทำ'; });
  edit((x) => { x.meta.scope = 'ขอบเขต'; });
  assert.deepEqual([m.meta.title, m.meta.author, m.meta.scope], ['ชื่อโมเดล', 'ผู้จัดทำ', 'ขอบเขต']);
  const back = JSON.parse(undo.pop()); redo.push(JSON.stringify(m));
  assert.equal(back.meta.scope, ''); assert.equal(back.meta.author, 'ผู้จัดทำ');
  const again = JSON.parse(redo.pop());
  assert.equal(again.meta.scope, 'ขอบเขต');
  const reloaded = M.normalize(JSON.parse(JSON.stringify(again)));
  assert.deepEqual([reloaded.meta.title, reloaded.meta.author, reloaded.meta.scope], ['ชื่อโมเดล', 'ผู้จัดทำ', 'ขอบเขต']);
});

// ---- example vs own work
test('wiring (source): editing an example offers a copy; the copy clears title, author, scope, flag, identity and a pyramid denominator', () => {
  assert.match(app, /function makeOwnWork\(\)/);
  const body = app.slice(app.indexOf('function makeOwnWork()'), app.indexOf('// ---------- diagram ----------'));
  for (const s of ["m.meta.title = ''", "m.meta.author = ''", "m.meta.scope = ''", 'm.meta.illustrative = false', "IC.rid('md')", 'm.exposure = {', 'state.galleryId = null']) assert.ok(body.includes(s), s);
  assert.match(app, /pyPeriodDenom/);
});

test('pyramid: a denominator that still says Synthetic on a work not flagged as an example is flagged (PY019); the example itself is not', () => {
  const ex = PY.normalizePyramid(json('../data/example-pyramid.json'));
  assert.ok(!PY.lintPyramid(ex).some((i) => i.rule === 'PY019'));
  const own = JSON.parse(JSON.stringify(ex)); own.meta.illustrative = false;
  assert.ok(PY.lintPyramid(own).some((i) => i.rule === 'PY019'));
  own.exposure = { value: null, unit: '', definition: '', rateScale: 1000 };
  assert.ok(!PY.lintPyramid(own).some((i) => i.rule === 'PY019'));
});

test('first visit opens an empty bow-tie (no example name, author, flag)', () => {
  const e = M.emptyModel();
  assert.equal(e.meta.title, ''); assert.equal(!!e.meta.illustrative, false); assert.equal(e.meta.author || '', '');
  assert.match(app, /!loaded && state\.type === 'bowtie'/);
});

// ---- report and messages: codes and Thai text
test('report (Thai): no internal control ids, recorded gaps in Thai', () => {
  const m = M.normalize(json('../data/example-wildlife.json'));
  const html = buildReport(m, { lang: 'th', sections: ['paths', 'barriers'] });
  assert.ok(!/\bct_[a-z0-9]+/i.test(html), 'internal ct_ id shown');
  assert.ok(!/no owner|no performance standard|never verified|no review date/.test(html), 'English gap text shown');
  const codes = bowtieCodes(m);
  assert.ok(Object.values(codes).some((c) => /^CT-/.test(c)) && html.includes('CT-01'));
});

test('msgs: ids become diagram codes; gaps and denominator gaps have Thai wording', () => {
  assert.equal(showCodes('Cut by ct_abc123 and ct_zzz999.', { ct_abc123: 'CT-01' }), 'Cut by CT-01 and ct_zzz999.');
  assert.equal(localizeMsg('no owner', 'th'), 'ยังไม่ระบุผู้รับผิดชอบ');
  assert.equal(localizeMsg('denominator value', 'th'), 'ค่าตัวหาร');
  assert.equal(localizeMsg('review overdue (2026-01-01)', 'th'), 'เลยกำหนดทบทวน (2026-01-01)');
  assert.equal(localizeMsg('no owner', 'en'), 'no owner');
});

// ---- Thai typeface
test('font: Sarabun is the Thai face on screen, in diagrams and in the report; the font files exist; exports can embed it', () => {
  assert.match(readFileSync(new URL('../css/app.css', import.meta.url), 'utf8'), /@font-face\{font-family:"Sarabun"/);
  assert.match(readFileSync(new URL('../js/render.js', import.meta.url), 'utf8'), /const FONT = '"Sarabun"/);
  assert.match(readFileSync(new URL('../js/report.js', import.meta.url), 'utf8'), /\.rpt\{font:13px\/20px "Sarabun"/);
  for (const f of ['regular', 'bold']) assert.ok(readFileSync(new URL(`../fonts/sarabun-${f}.woff`, import.meta.url)).length > 10000);
  assert.ok(relativeFontCss().includes(THAI_FAMILY) && relativeFontCss().includes('unicode-range:U+0E00'));
});

// ---- item 7 follow-up: unmapped ids, unknown messages, saved-model compatibility
test('msgs: an id with no display code and a message with no rule are left exactly as they are', () => {
  assert.equal(showCodes('barrier xx_999 is unknown', { ct_1: 'CT-01' }), 'barrier xx_999 is unknown');
  assert.equal(localizeMsg('some new engine message ct_1', 'th'), 'some new engine message ct_1');
  assert.equal(localizeMsg('some new engine message ct_1', 'th', { ct_1: 'CT-01' }), 'some new engine message CT-01');
  assert.equal(showCodes(undefined, {}), undefined);
});

test('compat: display codes are derived only; reading codes or reporting never changes a saved model or its ids', () => {
  const raw = json('../data/example-wildlife.json');
  const before = JSON.stringify(M.normalize(JSON.parse(JSON.stringify(raw))));
  const m = M.normalize(JSON.parse(JSON.stringify(raw)));
  bowtieCodes(m); buildReport(m, { lang: 'th' }); buildReport(m, { lang: 'en' });
  assert.equal(JSON.stringify(m), before);
  assert.ok(m.controls.every((c) => /^ct_/.test(c.id)), 'ids stay internal');
});

test('report (English): ids are shown as codes too, text stays English', () => {
  const m = M.normalize(json('../data/example-wildlife.json'));
  const html = buildReport(m, { lang: 'en', sections: ['paths', 'barriers'] });
  assert.ok(!/\bct_[a-z0-9]+/i.test(html));
  assert.match(html, /no owner|no performance standard/);
});

// ---- keep focus: a card that moved
test('focus: a field is found again inside its card (data-id) even when the card moved elsewhere in the form', () => {
  const mkCtl = (n) => ({ n, matches: () => true, focus() { this.focused = true; }, setSelectionRange() {} });
  const card = (id, ctls) => ({ getAttribute: (k) => (k === 'data-id' ? id : null), querySelectorAll: () => ctls });
  const a1 = mkCtl('a'); const a2 = mkCtl('b');
  const before = card('f2', [a1, a2]);
  const root = { contains: () => true, querySelectorAll: (s) => (s === '[data-id]' ? [before] : [a1, a2]) };
  a2.closest = () => before; a2.selectionStart = 1; a2.selectionEnd = 1;
  const snap = captureFocus(root, a2);
  assert.deepEqual(snap.owner, { id: 'f2', within: 1 });
  const b1 = mkCtl('a'); const b2 = mkCtl('b'); const x = mkCtl('x');
  const after = card('f2', [b1, b2]);
  const root2 = { querySelectorAll: (s) => (s === '[data-id]' ? [card('f1', [x]), after] : [x, b1, b2, mkCtl('y')]) };
  assert.equal(restoreFocus(root2, snap), true);
  assert.equal(b2.focused, true); assert.ok(!x.focused);
});

// ---- toolbar, details tab, example picture, Swiss yellow
test('wiring (source): Clear / Fit / Language sit on the toolbar and run the existing handlers; Clear is the confirmed, backed-up New', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['b-clear', 'b-fit2', 'b-lang2']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(app, /\$\('#b-clear'\)\.addEventListener\('click', \(\) => \$\('#b-new'\)\.click\(\)\)/);
  assert.ok(/clearModel:/.test(readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8')));
  assert.match(html, /class="danger"/);
});

test('wiring (source): choosing a bow-tie element opens its details tab; a new node is brought into view', () => {
  assert.match(app, /id && state\.type === 'bowtie' \? 'inspector'/);
  assert.match(app, /function revealNode\(id\)/);
  assert.match(app, /requestAnimationFrame\(\(\) => revealNode\(id\)\)/);
});

test('model pictures: drawn for this tool, Bowtie and Swiss only, Thai and English, no external image', async () => {
  const { modelExample } = await import('../js/modelintro.js');
  for (const lang of ['th', 'en']) for (const type of ['bowtie', 'swiss']) {
    const e = modelExample(type, lang);
    assert.ok(e.svg.startsWith('<svg') && !/<image|href=|xlink/.test(e.svg), type + lang);
    assert.ok(e.title && e.caption);
  }
  assert.equal(modelExample('fram', 'th'), null);
});

test('Swiss cheese is yellow: tab colour, slice fill, dark text on it', () => {
  const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
  assert.match(css, /#m-swiss\[aria-pressed=true\]\{background:#f5c400;color:#1b1500/);
  assert.match(readFileSync(new URL('../js/render.js', import.meta.url), 'utf8'), /--cheese:#ffe680/);
});
