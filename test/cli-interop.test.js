import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = (...a) => spawnSync(process.execPath, [join(root, 'cli/safetytool.js'), ...a], { encoding: 'utf8', cwd: root });
const tmp = mkdtempSync(join(tmpdir(), 'st-cli-'));
const data = (f) => join(root, 'data', f);

test('cli: new/validate/lint work for FRAM and the Accident Pyramid', () => {
  for (const t of ['fram', 'pyramid']) {
    const made = run('new', t, 'CLI test');
    assert.equal(made.status, 0); writeFileSync(join(tmp, t + '.json'), made.stdout);
    assert.equal(run('validate', join(tmp, t + '.json')).status, 0);
  }
  assert.equal(run('validate', data('example-fram.json')).status, 0);
  const sum = JSON.parse(run('pyramid-summary', data('example-pyramid.json'), '--json').stdout);
  assert.equal(sum.outputVersion, 1); assert.equal(sum.ratesAvailable, true); assert.equal(sum.rows.length, 4);
  assert.ok(['basisNote', 'window', 'records'].every((k) => k in sum), 'basis note, window and record breakdown are part of the summary');
  assert.deepEqual(Object.keys(sum.records).sort(), ['countedInWindow', 'crossCheck', 'noValidDate', 'outsideAfter', 'outsideBefore', 'total']);
  const empty = JSON.parse(run('pyramid-summary', join(tmp, 'pyramid.json'), '--json').stdout);
  assert.equal(empty.ratesAvailable, false); assert.ok(empty.ratesUnavailableBecause.length > 0);
});

test('cli: a transformation never runs without its confirmations, never overwrites, and the source file is untouched', () => {
  const b = join(tmp, 'b.json'); copyFileSync(data('example-wildlife.json'), b);
  assert.equal(run('assign-id', b).status, 0);
  const before = readFileSync(b, 'utf8'); const out = join(tmp, 'stamp-out.json');
  const refused = run('transform-run', 'bowtie-to-stamp', b, '--out', out);
  assert.equal(refused.status, 1); assert.match(refused.stderr, /not confirmed: system/); assert.ok(!existsSync(out));
  const ok = run('transform-run', 'bowtie-to-stamp', b, '--out', out, '--confirm', 'all', '--links-out', join(tmp, 'l.json'));
  assert.equal(ok.status, 0, ok.stderr); assert.ok(existsSync(out));
  assert.equal(run('validate', out).status, 0);
  assert.equal(run('transform-run', 'bowtie-to-stamp', b, '--out', out, '--confirm', 'all').status, 2, 'existing output is not overwritten');
  assert.equal(readFileSync(b, 'utf8'), before);
  assert.equal(run('transform-preview', 'fram-to-bowtie-stamp', data('example-fram.json')).status, 1, 'unsupported mapping does not claim success');
  assert.equal(run('transform-preview', 'bowtie-to-swiss', b).status, 1, 'needs a threat decision');
  const prev = run('transform-preview', 'bowtie-to-swiss', b, '--json');
  assert.equal(prev.status, 1); assert.equal(JSON.parse(prev.stdout).outputVersion, 1);
});

test('cli: package build / validate / diff, and a package with an unsafe path is rejected', () => {
  const b = join(tmp, 'b.json'); const s = join(tmp, 's.json'); copyFileSync(data('example-stamp.json'), s); run('assign-id', s);
  const pkg = join(tmp, 'pkg.json');
  assert.equal(run('package-build', pkg, b, s).status, 0);
  assert.equal(run('package-validate', pkg).status, 0);
  assert.equal(run('package-diff', pkg, pkg).status, 0);
  const bad = join(tmp, 'bad.json'); writeFileSync(bad, readFileSync(pkg, 'utf8').replace('models/bowtie-', 'models/../bowtie-'));
  const r = run('package-validate', bad, '--json');
  assert.equal(r.status, 1); assert.equal(JSON.parse(r.stdout).ok, false);
  const noId = join(tmp, 'noid.json'); copyFileSync(data('example-swiss.json'), noId);
  assert.equal(run('package-build', join(tmp, 'x.json'), noId).status, 1, 'a model without a stable id cannot be packaged');
});
