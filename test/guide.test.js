import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS } from '../js/guide.js';
import * as M from '../js/model.js';
import * as SW from '../js/swiss.js';
import * as SH from '../js/shell.js';

const L = new Proxy({}, { get: (_, k) => String(k) });

test('guide: bowtie control and escalation steps let the user write them in the guide (not only read about them)', () => {
  const m = M.emptyModel();
  const t = M.addThreat(m, 'Birds feed on the grass beside the runway');
  const c = M.addConsequence(m, 'Engine failure after a bird strike');
  const step = (id) => STEPS.bowtie.find((s) => s.id === id);
  const groups = step('control').groups(m, L);
  assert.equal(groups.length, 2, 'one group per threat and per consequence');
  const made = groups[0].add(m);
  assert.equal(made.side, 'prevent'); assert.equal(made.threatId, t.id);
  assert.equal(groups[1].add(m).consequenceId, c.id);
  made.text = 'Cut the grass on a schedule';
  const esc = step('escalation').groups(m, L);
  assert.equal(esc.length, 1, 'only controls that have text');
  assert.equal(esc[0].add(m).controlId, made.id);
  assert.equal(step('control').done(m), true);
});

test('guide: swiss holes and trajectory, shell components and interfaces are writable too', () => {
  const sw = SW.emptySwiss();
  const l = SW.addLayer(sw, 'Grass management');
  const holes = STEPS.swiss.find((s) => s.id === 'hole').groups(sw, L);
  const h = holes[0].add(sw);
  assert.equal(sw.layers[0].holes[0], h);
  assert.equal(holes[0].find(sw, h.id), h);
  assert.ok(STEPS.swiss.find((s) => s.id === 'trajectory').trajectory);
  void l;

  const sh = SH.emptyShell();
  const comps = STEPS.shell.find((s) => s.id === 'components').groups(sh, L);
  assert.equal(comps.length, 4);
  comps[0].add(sh).text = 'Go-around checklist';
  assert.equal(sh.components.S.length, 1);
  assert.equal(STEPS.shell.find((s) => s.id === 'components').done(sh), true);
  const ifs = STEPS.shell.find((s) => s.id === 'iface').groups(sh, L);
  assert.equal(ifs.length, 4);
  ifs[0].add(sh);
  assert.equal(sh.interfaces.LS.findings.length, 1);
  assert.equal(sh.interfaces.LS.status, 'mismatch');
});
