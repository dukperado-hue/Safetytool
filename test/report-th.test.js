import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReport, SECTIONS } from '../js/report.js';
import * as M from '../js/model.js';

const ex = () => M.normalize(JSON.parse(readFileSync(new URL('../data/example-wildlife.json', import.meta.url), 'utf8')));

test('report (th): all sections build, engine messages come out in Thai, nothing throws', () => {
  const base = ex();
  const alt = JSON.parse(JSON.stringify(base));
  alt.controls.forEach((c) => { c.status = 'effective'; });
  const html = buildReport(alt, { lang: 'th', sections: SECTIONS, baseline: base });
  assert.match(html, /แบบจำลองเส้นทางเชิงตรรกะเท่านั้น/);
  assert.ok(!/Logical path model only/.test(html));
  assert.ok(!/under the series rule/.test(html));
});
