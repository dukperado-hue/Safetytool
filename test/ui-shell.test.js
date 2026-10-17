import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STR } from '../js/i18n.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const ids = (s) => [...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const MODELS = ['bowtie', 'swiss', 'shell', 'hfacs', 'stamp', 'fram', 'pyramid'];
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + 1));
const menuOf = (id) => between(html, `<details id="${id}"`, '</details>');

test('header: no tagline element and the app code no longer writes one; the Safetytool name stays', () => {
  assert.doesNotMatch(html, /id="tagline"/);
  assert.doesNotMatch(appJs, /#tagline/);
  assert.match(html, /<div class="brand"><strong>Safetytool<\/strong><\/div>/);
  assert.match(html, /<title>Safetytool<\/title>/);
});

test('header: all seven models have a tab in the model group, none in the toolbar', () => {
  const models = between(html, 'class="models"', 'class="tools"');
  const tools = between(html, 'class="tools"', '</header>');
  MODELS.forEach((m) => { assert.match(models, new RegExp('id="m-' + m + '"')); assert.doesNotMatch(tools, new RegExp('id="m-' + m + '"')); });
  assert.match(models, /role="group"/);
  assert.match(tools, /role="toolbar"/);
});

test('toolbar: every command exists exactly once', () => {
  const all = ids(html);
  ['b-example', 'b-new', 'b-open', 'b-save', 'b-svg', 'b-png', 'b-csv', 'b-print', 'b-undo', 'b-redo', 'b-fit', 'b-help', 'b-theme', 'b-lang', 'chk-esc',
    'b-file', 'b-view', 'b-settings', 'b-panel', 'b-panel-fab', 'b-panel-close', 'fs-reset'].forEach((id) => assert.equal(all.filter((x) => x === id).length, 1, id));
});

test('toolbar: frequent actions stay visible (undo, redo, save); the rest sit in three clear menus, with no nesting', () => {
  const tools = between(html, 'class="tools"', '</header>');
  const outside = tools.replace(/<details[\s\S]*?<\/details>/g, '');
  ['b-undo', 'b-redo', 'b-save'].forEach((id) => assert.match(outside, new RegExp('id="' + id + '"')));
  const file = menuOf('file-menu'); const view = menuOf('view-menu'); const set = menuOf('settings-menu');
  ['b-example', 'b-new', 'b-open', 'b-svg', 'b-png', 'b-csv', 'b-print'].forEach((id) => assert.match(file, new RegExp('id="' + id + '"'), 'File menu: ' + id));
  ['b-panel', 'b-fit', 'chk-esc', 'fs-reset'].forEach((id) => assert.match(view, new RegExp('id="' + id + '"'), 'View menu: ' + id));
  ['b-help', 'b-theme', 'b-lang'].forEach((id) => assert.match(set, new RegExp('id="' + id + '"'), 'Settings menu: ' + id));
  [file, view, set].forEach((m) => assert.equal((m.match(/<details/g) || []).length, 1, 'no nested menus'));
  assert.equal((tools.match(/<details id=/g) || []).length, 3);
});

test('i18n: every new label exists in Thai and English', () => {
  ['fileMenu', 'viewMenu', 'settingsMenu', 'panel', 'panelClose', 'saveShort', 'fsLegend', 'fs90', 'fs100', 'fs110', 'fs120', 'fsReset'].forEach((k) => {
    assert.ok(STR.th[k] && STR.en[k], k);
  });
  assert.match(STR.th.fs90, /90%/); assert.match(STR.en.fs120, /120%/);
});

test('ids: every selector the label map writes to exists in index.html', () => {
  const map = appJs.slice(appJs.indexOf('const map = {'), appJs.indexOf('Object.entries(map)'));
  const present = new Set(ids(html));
  const used = [...map.matchAll(/'#([A-Za-z0-9_-]+)(?: [^']*)?'/g)].map((m) => m[1]);
  assert.ok(used.length > 20);
  assert.deepEqual(used.filter((u) => !present.has(u)), []);
});

// ---- model colours
test('styles: each model tab keeps its own accent (light and dark); the toolbar uses none of them', () => {
  MODELS.forEach((m) => {
    assert.match(css, new RegExp('--mc-' + m + ':#'), 'light ' + m);
    assert.match(css, new RegExp('#m-' + m + '\\{--mc:var\\(--mc-' + m + '\\)\\}'), 'wired ' + m);
  });
  assert.match(css, /\.models button\[aria-pressed=true\]\{[^}]*border-bottom-color:var\(--mc\)[^}]*font-weight:600/);
  const toolRules = css.slice(css.indexOf('/* toolbar buttons: neutral */'), css.indexOf('details.more{'));
  assert.doesNotMatch(toolRules, /--mc/);
});

// ---- interface text size
test('text size: four options, Standard is the default and can be restored', () => {
  assert.match(appJs, /const FONT_SCALES = \[0\.9, 1, 1\.1, 1\.2\]/);
  ['0.9', '1', '1.1', '1.2'].forEach((v) => assert.match(html, new RegExp('<input type="radio" name="fs" value="' + v.replace('.', '\\.') + '"')));
  assert.match(html, /name="fs" value="1" checked/);
  assert.match(appJs, /\$\('#fs-reset'\)\.addEventListener\('click', \(\) => setFontScale\(1\)\)/);
  assert.match(appJs, /state\.fs = FONT_SCALES\.includes\(n\) \? n : 1/);   // an unknown value falls back to Standard
  assert.match(appJs, /fs: 1,/);
});

test('text size: it is a UI preference (saved with the other preferences, read back on start), never part of a model', () => {
  assert.match(appJs, /savePrefs = \(\) => lsSet\(PREF, JSON\.stringify\(\{[^}]*fs: state\.fs/);
  assert.match(appJs, /if \(FONT_SCALES\.includes\(p\.fs\)\) state\.fs = p\.fs/);
  // no model, schema, interchange or export code knows about it
  readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'app.js').forEach((f) => {
    const src = readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /safetytool\.prefs|state\.fs\b|--fs/, f);
  });
  assert.doesNotMatch(readFileSync(new URL('../schema/bowtie.schema.json', import.meta.url), 'utf8'), /"fs"|fontScale/);
});

test('text size: it works through one custom property; no zoom or transform, and every UI font size follows it', () => {
  assert.match(css, /:root\{--fs:1;/);
  assert.doesNotMatch(css, /(^|[;{\s])zoom:/);
  assert.doesNotMatch(appJs, /style\.zoom|transform: *scale|setProperty\('zoom'/);
  const printAt = css.indexOf('@media print{');
  assert.ok(printAt > 0);
  // find the print block's end: the first "\n}" after its start
  const printEnd = css.indexOf('\n}', printAt) + 2;
  const outsidePrint = css.slice(0, printAt) + css.slice(printEnd);
  const bare = [...outsidePrint.matchAll(/font(?:-size)?:[^;}]*?(?<![*(])\b\d+(?:\.\d+)?px/g)].map((m) => m[0]).filter((x) => !/calc\(/.test(x) && !/var\(--mono\)|\/1 /.test(x) || /^font-size:\d/.test(x));
  assert.deepEqual(bare.filter((x) => /^font-size:\d/.test(x)), [], 'a fixed font-size slipped past the scale: ' + bare.join(' | '));
  assert.match(css, /@media print\{:root\{--fs:1\}\}/);   // a printout never follows the screen preference
});

test('text size: the diagram and the exports do not read it', () => {
  const exportsBlock = appJs.slice(appJs.indexOf('function exportSvgString'), appJs.indexOf('function exportSvgString') + 600);
  assert.doesNotMatch(exportsBlock, /state\.fs/);
  assert.doesNotMatch(readFileSync(new URL('../js/render.js', import.meta.url), 'utf8'), /--fs|state\.fs/);
});

// ---- details panel and responsive layout
test('panel: a column on wide screens, a bottom sheet on narrow ones, always reopenable', () => {
  assert.match(css, /body\[data-panel=closed\] \.side\{display:none\}/);
  assert.match(css, /@media \(max-width:900px\)\{[\s\S]*?\.side\{position:fixed;left:0;right:0;bottom:0/);
  assert.match(css, /body\[data-panel=closed\] \.fab\{display:block;position:fixed/);
  assert.match(appJs, /matchMedia\('\(max-width: 900px\)'\)/);
  assert.match(appJs, /if \(id && narrowMQ\.matches && !state\.panelOpen\) setPanel\(true\)/);   // choosing something opens the sheet
  assert.match(appJs, /ev\.key === 'Escape' && narrowMQ\.matches && state\.panelOpen/);
  assert.match(html, /id="b-panel-fab" type="button" class="fab" aria-controls="side" aria-expanded="false"/);
});

test('responsive: models and workspace tabs scroll sideways instead of wrapping; header has one-row, two-row and phone layouts', () => {
  assert.match(css, /\.models\{order:4;flex:1 1 100%;min-width:0;display:flex;flex-wrap:nowrap;[^}]*overflow-x:auto/);
  assert.match(css, /@media \(min-width:1180px\)\{[\s\S]*?\.models\{order:2;flex:1 1 0\}/);
  assert.match(css, /@media \(max-width:560px\)\{[\s\S]*?\.tg-main\{order:4;flex:1 1 100%/);
  assert.match(css, /@media \(max-width:1180px\)\{[\s\S]*?\.tabs\{flex-wrap:nowrap;overflow-x:auto/);
  assert.match(css, /\.hd-top,\.tools\{display:contents\}/);
});

test('menus: every <details class="more"> closes on Escape, on outside click, on focus leaving, and after a command; focus returns to its button', () => {
  assert.match(appJs, /querySelectorAll\('details\.more'\)/);
  assert.match(appJs, /ev\.key === 'Escape' && menu\.open[\s\S]{0,120}btn\.focus\(\)/);
  assert.match(appJs, /closest\('\.menu button'\)\) \{ menu\.open = false; btn\.focus\(\); \}/);
  assert.match(appJs, /focusout/);
  assert.match(appJs, /translateX/);   // an opened menu is kept inside the viewport
});

test('escalation switch: still only for bowties, same handler and preference', () => {
  assert.match(appJs, /\$\('#chk-esc'\)\.closest\('label'\)\.hidden = state\.type !== 'bowtie'/);
  assert.match(appJs, /\$\('#chk-esc'\)\.addEventListener\('change'/);
  assert.doesNotMatch(appJs, /\$\('#view-menu'\)\.hidden/);   // the View menu itself now also holds Fit, the details panel and text size
});
