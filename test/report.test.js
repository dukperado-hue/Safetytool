import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReport, standaloneHtml, esc, SECTIONS } from '../js/report.js';
import * as M from '../js/model.js';

const ex = () => M.normalize(JSON.parse(readFileSync(new URL('../data/example-wildlife.json', import.meta.url), 'utf8')));

test('report: escapes model text (no HTML injection)', () => {
  const m = ex();
  m.hazard.text = '<img src=x onerror=alert(1)>';
  const html = buildReport(m, { lang: 'en' });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x'));
  assert.equal(esc('"&'), '&quot;&amp;');
});
test('report: carries run id, limitations, disclaimer; never signatures or compliance claims', () => {
  const html = buildReport(ex(), { lang: 'en' });
  assert.match(html, /RUN-[0-9a-f]+-logic-1\.0\.0/);
  assert.match(html, /not a risk assessment/i);
  assert.match(html, /not certified safety advice/);
  assert.ok(!/signed|compliant|approved|verified & audited/i.test(html));
});
test('report: sections can be left out; compare needs a baseline', () => {
  const m = ex();
  const some = buildReport(m, { lang: 'th', sections: ['summary'] });
  assert.ok(!some.includes('<h2>' + 'ทะเบียน Barrier'));
  const noBase = buildReport(m, { lang: 'en', sections: ['compare'] });
  assert.ok(!noBase.includes('Comparison with baseline'));
  const base = JSON.parse(JSON.stringify(m));
  const alt = JSON.parse(JSON.stringify(m)); alt.controls.forEach((c) => { c.status = 'effective'; });
  assert.match(buildReport(alt, { lang: 'en', sections: ['compare'], baseline: base }), /not a risk reduction/);
});
test('report: ERC shows analyst choice and rationale, says when unset', () => {
  const m = ex();
  assert.match(buildReport(m, { lang: 'en', sections: ['erc'] }), /has not chosen/);
  m.erc = { matrix: null, outcome: 'major', barriers: 'limited', rationale: 'because X' };
  assert.match(buildReport(m, { lang: 'en', sections: ['erc'] }), /because X/);
});
test('report: standalone document is complete and every section is known', () => {
  const doc = standaloneHtml(ex(), { lang: 'en', sections: SECTIONS });
  assert.ok(doc.startsWith('<!doctype html>') && doc.includes('<style>') && doc.includes('</article>'));
  assert.equal(SECTIONS.length, 8);
});
