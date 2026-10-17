import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STR } from '../js/i18n.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const KEYS = ['welcomeTitle', 'welcomeBody', 'welcomeSteps', 'welcomeNote', 'welcomeGuide', 'welcomeNew', 'welcomeFeedback', 'welcomeClose', 'notJson'];

test('pilot: the first-visit text and the "not a JSON file" message exist in Thai and English', () => {
  for (const lang of ['th', 'en']) KEYS.forEach((k) => assert.ok(STR[lang][k] && STR[lang][k].length > 10, lang + '.' + k));
  assert.match(STR.th.welcomeSteps, /บันทึก JSON/); assert.match(STR.en.welcomeSteps, /Save JSON/);
});

test('pilot: download file names keep Thai vowels and tone marks (they used to become underscores)', () => {
  const m = app.match(/const fileBase = \(\) => .*?\.replace\((\/.*?\/gu), '_'\)/);
  assert.ok(m, 'fileBase found');
  const re = new RegExp(m[1].slice(1, -3), 'gu');
  assert.equal('ตัวอย่าง: สัตว์ป่า (Wildlife)'.replace(re, '_'), 'ตัวอย่าง_สัตว์ป่า_Wildlife_');
});

test('pilot wiring (source): welcome strip is remembered once dismissed; New keeps the old model first; a non-JSON file gets a plain message', () => {
  assert.ok(/lsGet\(WELCOME_KEY\)\) \{ w\.hidden = true/.test(app) && /lsSet\(WELCOME_KEY, '1'\)/.test(app));
  assert.ok(/function labels\(\) \{\n?\s*drawWelcome\(\)/.test(app.replace(/\r/g, '')), 'language switch redraws it');
  const nw = app.slice(app.indexOf("$('#b-new').addEventListener"), app.indexOf("$('#b-open')"));
  assert.ok(nw.indexOf('backupSlot') >= 0 && nw.indexOf('backupSlot') < nw.indexOf('snapshot()') && /if \(!kept\.ok\)/.test(nw), 'New: backup first, refuse if it fails');
  assert.ok(/e instanceof SyntaxError \? t\('notJson'\)/.test(app));
  assert.ok(/pilot-feedback\.yml/.test(app) && readFileSync(new URL('../.github/ISSUE_TEMPLATE/pilot-feedback.yml', import.meta.url), 'utf8').includes('What were you trying to accomplish'));
});
