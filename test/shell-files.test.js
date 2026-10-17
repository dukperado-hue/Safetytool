import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const list = sw.slice(sw.indexOf('const SHELL = ['), sw.indexOf('];', sw.indexOf('const SHELL = [')));
const files = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('service worker: every pre-cached file exists, and the cache name was bumped for this file list', () => {
  const missing = files.filter((f) => f !== './' && !existsSync(new URL(f, root)));
  assert.deepEqual(missing, []);
  assert.match(sw, /const VERSION = 'safetytool-v(\d+)'/);
  assert.ok(Number(/safetytool-v(\d+)/.exec(sw)[1]) >= 10, 'cache name bumped after adding FRAM / pyramid / interchange files');
});

test('service worker: every module the app imports at start-up is pre-cached (offline would otherwise break)', () => {
  const need = new Set(); const seen = new Set();
  const walk = (rel) => {
    if (seen.has(rel)) return; seen.add(rel); need.add(rel);
    const src = readFileSync(new URL(rel, root), 'utf8');
    for (const m of src.matchAll(/from '\.\/([A-Za-z0-9_-]+\.js)'/g)) walk('js/' + m[1]);
  };
  walk('js/app.js');
  const cached = new Set(files);
  assert.deepEqual([...need].filter((f) => !cached.has(f)), []);
  // every example the app can load (model registry + gallery list) must be available offline
  const used = new Set();
  for (const f of ['js/app.js', 'js/gallery.js']) for (const m of readFileSync(new URL(f, root), 'utf8').matchAll(/'(data\/[A-Za-z0-9_.-]+\.json)'/g)) used.add(m[1]);
  assert.ok(used.size >= 7);
  for (const e of used) assert.ok(cached.has(e), e + ' is pre-cached');
  void readdirSync;
});
