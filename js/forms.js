// Safetytool — data-entry forms for the Swiss cheese and SHELL models (keyboard- and screen-reader-friendly).
// api: { t(key), mutate(fn, {rebuild}) }. Text edits commit on "change" and do not rebuild the form (keeps focus);
// structural edits (add/remove/move) rebuild it.
import * as SW from './swiss.js';
import * as SH from './shell.js';
import * as HF from './hfacs.js';
import * as ST from './stamp.js';

export const mk = (tag, attrs = {}, text) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (v != null && v !== false) e.setAttribute(k, v === true ? '' : String(v)); });
  if (text != null) e.textContent = text;
  return e;
};

export function field(label, input, id) {
  const l = mk('label', { class: 'fld', 'data-id': id });
  l.appendChild(mk('span', {}, label));
  l.appendChild(input);
  return l;
}
export function textInput(value, onChange, area, rows = 2) {
  const i = area ? mk('textarea', { rows }) : mk('input', { type: 'text' });
  i.value = value || '';
  i.addEventListener('change', () => onChange(i.value));
  return i;
}
export function select(value, options, onChange) {
  const s = mk('select');
  options.forEach(([v, l]) => { const o = mk('option', { value: v }, l); s.appendChild(o); });
  s.value = value == null ? '' : String(value);
  s.addEventListener('change', () => onChange(s.value));
  return s;
}
export function button(label, fn, cls) {
  const b = mk('button', { type: 'button', class: cls }, label);
  if (/\bdanger\b/.test(cls || '')) b.tabIndex = -1;   // Tab from a text field must never land on a Delete button (Enter there would delete); the mouse still works
  b.addEventListener('click', fn);
  return b;
}
export function section(title, id) {
  const s = mk('section', { class: 'fsec', 'data-id': id });
  s.appendChild(mk('h3', {}, title));
  return s;
}

// ------------------------------------------------------------------ Swiss cheese
export function buildSwissForm(host, m, api) {
  const { t, mutate, confirmDelete } = api;
  host.textContent = '';
  const top = section(t('kind.hazard') + ' / ' + t('kind.loss'));
  top.appendChild(field(t('sw.hazard'), textInput(m.hazard.text, (v) => mutate(() => { m.hazard.text = v; }), true), m.hazard.id));
  top.appendChild(field(t('sw.loss'), textInput(m.loss.text, (v) => mutate(() => { m.loss.text = v; }), true), m.loss.id));
  host.appendChild(top);

  const ls = section(t('sw.layers'));
  if (!m.layers.length) ls.appendChild(mk('p', { class: 'muted' }, t('sw.noLayers')));
  m.layers.forEach((l, i) => {
    const card = mk('div', { class: 'fcard', 'data-id': l.id });
    const head = mk('div', { class: 'fhead' });
    head.appendChild(mk('strong', {}, `${i + 1}.`));
    head.appendChild(button('↑', () => mutate(() => SW.moveLayer(m, l.id, -1), { rebuild: true }), 'mini'));
    head.appendChild(button('↓', () => mutate(() => SW.moveLayer(m, l.id, 1), { rebuild: true }), 'mini'));
    head.appendChild(button(t('delete'), () => { if (confirmDelete((x) => SW.removeLayer(x, l.id))) mutate(() => SW.removeLayer(m, l.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(t('sw.layerName'), textInput(l.name, (v) => mutate(() => { l.name = v; })), l.id));
    card.appendChild(field(t('sw.category'), select(l.category, [['', t('none')], ...SW.LAYER_CATEGORIES.map((c) => [c, t('sw.cat.' + c)])], (v) => mutate(() => { l.category = v || null; }))));
    card.appendChild(field(t('sw.defence'), textInput(l.defence, (v) => mutate(() => { l.defence = v; }), true)));
    const lev = api.evidenceFor && api.evidenceFor(l); if (lev) card.appendChild(lev);   // evidence attached to the layer (supplied by the caller; absent in older callers)
    l.holes.forEach((h) => {
      const row = mk('div', { class: 'frow', 'data-id': h.id });
      row.appendChild(field(t('kind.holeActive') + ' / ' + t('kind.holeLatent'), textInput(h.text, (v) => mutate(() => { h.text = v; }), true), h.id));
      const side = mk('div', { class: 'fside' });
      side.appendChild(field(t('sw.holeType'), select(h.type, [['', t('none')], ...SW.HOLE_TYPES.map((x) => [x, t('sw.hole.' + x)])], (v) => mutate(() => { h.type = v || null; }, { rebuild: false }))));
      const chk = mk('input', { type: 'checkbox' });
      chk.checked = m.trajectory.includes(h.id);
      chk.addEventListener('change', () => mutate(() => SW.setAligned(m, h.id, chk.checked), { rebuild: true }));
      const cl = mk('label', { class: 'fld chk' });
      cl.appendChild(chk);
      cl.appendChild(mk('span', {}, t('sw.aligned')));
      side.appendChild(cl);
      side.appendChild(button(t('delete'), () => { if (confirmDelete((x) => SW.removeHole(x, h.id), { ask: false })) mutate(() => SW.removeHole(m, h.id), { rebuild: true }); }, 'mini danger'));
      row.appendChild(side);
      const hev = api.evidenceFor && api.evidenceFor(h); if (hev) row.appendChild(hev);
      card.appendChild(row);
    });
    card.appendChild(button(t('sw.addHole'), () => mutate(() => SW.addHole(m, l.id), { rebuild: true })));
    ls.appendChild(card);
  });
  ls.appendChild(button(t('sw.addLayer'), () => mutate(() => SW.addLayer(m), { rebuild: true }), 'primary'));
  host.appendChild(ls);
}

// ------------------------------------------------------------------ SHELL
export function buildShellForm(host, m, api) {
  const { t, mutate, confirmDelete } = api;
  host.textContent = '';
  const top = section(t('kind.subject'));
  top.appendChild(field(t('sh.subject'), textInput(m.subject.text, (v) => mutate(() => { m.subject.text = v; }), true), m.subject.id));
  top.appendChild(field(t('sh.focus'), textInput(m.focus.text, (v) => mutate(() => { m.focus.text = v; }), true), m.focus.id));
  host.appendChild(top);

  SH.COMPONENTS.forEach((c) => {
    const sec = section(t('sh.' + c), 'sec_' + c);
    m.components[c].forEach((it) => {
      const row = mk('div', { class: 'frow', 'data-id': it.id });
      row.appendChild(field(t('kind.item'), textInput(it.text, (v) => mutate(() => { it.text = v; }), false), it.id));
      row.appendChild(button(t('delete'), () => { if (confirmDelete((y) => SH.removeShellNode(y, it.id), { ask: false })) mutate(() => SH.removeShellNode(m, it.id), { rebuild: true }); }, 'mini danger'));
      sec.appendChild(row);
    });
    sec.appendChild(button(t('sh.addItem'), () => mutate(() => SH.addItem(m, c), { rebuild: true })));
    host.appendChild(sec);
  });

  SH.INTERFACES.forEach((i) => {
    const sec = section(t('sh.' + i), 'sec_' + i);
    const f = m.interfaces[i];
    sec.appendChild(field(t('sh.status'), select(f.status, SH.STATUSES.map((s) => [s, t('sh.st.' + s)]), (v) => mutate(() => { f.status = v; }))));
    f.findings.forEach((x) => {
      const card = mk('div', { class: 'fcard', 'data-id': x.id });
      card.appendChild(field(t('sh.finding'), textInput(x.text, (v) => mutate(() => { x.text = v; }), true), x.id));
      card.appendChild(field(t('sh.severity'), select(x.severity, [['', t('none')], ...[1, 2, 3, 4, 5].map((n) => [String(n), String(n)])], (v) => mutate(() => { x.severity = v ? Number(v) : null; }))));
      card.appendChild(field(t('sh.action'), textInput(x.action, (v) => mutate(() => { x.action = v; }), true)));
      card.appendChild(field(t('sh.owner'), textInput(x.owner, (v) => mutate(() => { x.owner = v; }), false)));
      card.appendChild(button(t('delete'), () => { if (confirmDelete((y) => SH.removeShellNode(y, x.id), { ask: false })) mutate(() => SH.removeShellNode(m, x.id), { rebuild: true }); }, 'mini danger'));
      sec.appendChild(card);
    });
    sec.appendChild(button(t('sh.addFinding'), () => mutate(() => SH.addFinding(m, i), { rebuild: true })));
    host.appendChild(sec);
  });
}

// ------------------------------------------------------------------ HFACS
export const short = (s, n = 46) => { const x = (s || '').trim(); return x ? (x.length > n ? x.slice(0, n) + '…' : x) : '—'; };

/** A group of checkboxes (e.g. which losses a hazard leads to). */
export function choices(legend, rows, isOn, onToggle) {
  const box = mk('fieldset', { class: 'fchoices' });
  box.appendChild(mk('legend', {}, legend));
  rows.forEach(([id, label]) => {
    const l = mk('label', { class: 'fld chk' });
    const c = mk('input', { type: 'checkbox' });
    c.checked = isOn(id);
    c.addEventListener('change', () => onToggle(id, c.checked));
    l.appendChild(c);
    l.appendChild(mk('span', {}, label));
    box.appendChild(l);
  });
  return box;
}

export function buildHfacsForm(host, m, api) {
  const { t, mutate, lang, confirmDelete } = api;
  host.textContent = '';
  const codes = HF.factorCodes(m);
  const top = section(t('kind.hfEvent'));
  top.appendChild(field(t('hf.event'), textInput(m.event.text, (v) => mutate(() => { m.event.text = v; }), true), m.event.id));
  host.appendChild(top);

  const factorCard = (f) => {
    const card = mk('div', { class: 'fcard', 'data-id': f.id });
    const head = mk('div', { class: 'fhead' });
    head.appendChild(mk('strong', {}, codes[f.id]));
    head.appendChild(button(t('delete'), () => { if (confirmDelete((x) => HF.removeFactor(x, f.id))) mutate(() => HF.removeFactor(m, f.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(t('hf.factor'), textInput(f.text, (v) => mutate(() => { f.text = v; }), true), f.id));
    card.appendChild(field(t('hf.category'), select(f.category, [['', t('hf.unclassified')], ...HF.CATEGORIES.map((c) => [c.id, `${HF.LEVEL_INFO[c.level].n} · ${c[lang]}`])], (v) => mutate(() => { f.category = v || null; HF.pruneInfluences(m); }, { rebuild: true }))));
    card.appendChild(field(t('hf.evidence'), textInput(f.evidence, (v) => mutate(() => { f.evidence = v; }), true)));
    const lower = m.factors.filter((g) => g !== f && f.category && g.category && HF.rankOf(m, f) < HF.rankOf(m, g));
    if (lower.length) {
      card.appendChild(choices(t('hf.influences'), lower.map((g) => [g.id, `${codes[g.id]} ${short(g.text)}`]), (id) => f.influences.includes(id),
        (id, on) => mutate(() => { if (on) HF.link(m, f.id, id); else HF.unlink(m, f.id, id); })));
    }
    return card;
  };

  HF.LEVELS.forEach((lv) => {
    const sec = section(`${t('hf.level')} ${HF.LEVEL_INFO[lv].n} — ${HF.LEVEL_INFO[lv][lang]}`, 'lvl_' + lv);
    HF.categoriesOf(lv).forEach((c) => {
      sec.appendChild(mk('h4', { class: 'fcat' }, c[lang]));
      sec.appendChild(mk('p', { class: 'muted small' }, c.def[lang]));
      m.factors.filter((f) => f.category === c.id).forEach((f) => sec.appendChild(factorCard(f)));
      sec.appendChild(button(t('hf.addFactor'), () => mutate(() => HF.addFactor(m, c.id), { rebuild: true })));
    });
    host.appendChild(sec);
  });
  const us = section(t('hf.unclassified'), 'sec_unclassified');
  m.factors.filter((f) => !f.category).forEach((f) => us.appendChild(factorCard(f)));
  us.appendChild(button(t('hf.addFactor'), () => mutate(() => HF.addFactor(m, null), { rebuild: true })));
  host.appendChild(us);
}

// ------------------------------------------------------------------ STAMP / STPA
export function buildStampForm(host, m, api) {
  const { t, mutate, lang, confirmDelete } = api;
  host.textContent = '';
  const codes = ST.stampCodes(m);
  const nodeOpts = () => [['', t('none')], ...m.nodes.map((n) => [n.id, `${codes[n.id]} ${short(n.text, 30)}`])];
  const del = (id) => button(t('delete'), () => { if (confirmDelete((x) => ST.removeStampNode(x, id))) mutate(() => ST.removeStampNode(m, id), { rebuild: true }); }, 'mini danger');
  const head = (label, id) => { const h = mk('div', { class: 'fhead' }); h.appendChild(mk('strong', {}, label)); h.appendChild(del(id)); return h; };

  const sys = section(t('kind.stSystem'));
  sys.appendChild(field(t('stm.system'), textInput(m.system.text, (v) => mutate(() => { m.system.text = v; }), true), m.system.id));
  host.appendChild(sys);

  const ls = section(t('stm.losses'), 'sec_losses');
  m.losses.forEach((l) => {
    const row = mk('div', { class: 'frow', 'data-id': l.id });
    row.appendChild(field(codes[l.id], textInput(l.text, (v) => mutate(() => { l.text = v; }), true), l.id));
    row.appendChild(del(l.id));
    ls.appendChild(row);
  });
  ls.appendChild(button(t('stm.addLoss'), () => mutate(() => ST.addLoss(m), { rebuild: true })));
  host.appendChild(ls);

  const hs = section(t('stm.hazards'), 'sec_hazards');
  m.hazards.forEach((h) => {
    const card = mk('div', { class: 'fcard', 'data-id': h.id });
    card.appendChild(head(codes[h.id], h.id));
    card.appendChild(field(t('stm.hazard'), textInput(h.text, (v) => mutate(() => { h.text = v; }), true), h.id));
    if (m.losses.length) card.appendChild(choices(t('stm.leadsTo'), m.losses.map((l) => [l.id, `${codes[l.id]} ${short(l.text)}`]), (id) => h.lossIds.includes(id),
      (id, on) => mutate(() => { h.lossIds = on ? [...new Set([...h.lossIds, id])] : h.lossIds.filter((x) => x !== id); })));
    card.appendChild(field(t('stm.constraint'), textInput(h.constraint, (v) => mutate(() => { h.constraint = v; }), true)));
    hs.appendChild(card);
  });
  hs.appendChild(button(t('stm.addHazard'), () => mutate(() => ST.addHazard(m), { rebuild: true })));
  host.appendChild(hs);

  const ns = section(t('stm.structure'), 'sec_nodes');
  m.nodes.forEach((n) => {
    const card = mk('div', { class: 'fcard', 'data-id': n.id });
    card.appendChild(head(`${codes[n.id]} · ${t('stm.role.' + n.role)}`, n.id));
    card.appendChild(field(t('stm.nodeText'), textInput(n.text, (v) => mutate(() => { n.text = v; }), false), n.id));
    card.appendChild(field(t('stm.level'), textInput(String(n.level), (v) => mutate(() => { const k = Number.parseInt(v, 10); if (Number.isInteger(k) && k >= 0) n.level = k; }, { rebuild: true }), false)));
    if (n.role === 'controller') card.appendChild(field(t('stm.processModel'), textInput(n.processModel, (v) => mutate(() => { n.processModel = v; }), true)));
    ns.appendChild(card);
  });
  ns.appendChild(button(t('stm.addController'), () => mutate(() => ST.addNode(m, 'controller'), { rebuild: true })));
  ns.appendChild(button(t('stm.addProcess'), () => mutate(() => ST.addNode(m, 'process'), { rebuild: true })));
  host.appendChild(ns);

  const as = section(t('stm.actions'), 'sec_actions');
  m.actions.forEach((a) => {
    const card = mk('div', { class: 'fcard', 'data-id': a.id });
    card.appendChild(head(`${codes[a.id]} · ${t('stm.kind.' + a.kind)}`, a.id));
    card.appendChild(field(t('stm.actionText'), textInput(a.text, (v) => mutate(() => { a.text = v; }), false), a.id));
    card.appendChild(field(t('stm.from'), select(a.from, nodeOpts(), (v) => mutate(() => { a.from = v || null; }))));
    card.appendChild(field(t('stm.to'), select(a.to, nodeOpts(), (v) => mutate(() => { a.to = v || null; }))));
    as.appendChild(card);
  });
  as.appendChild(button(t('stm.addControl'), () => mutate(() => ST.addAction(m, 'control'), { rebuild: true })));
  as.appendChild(button(t('stm.addFeedback'), () => mutate(() => ST.addAction(m, 'feedback'), { rebuild: true })));
  host.appendChild(as);

  const us = section(t('stm.ucas'), 'sec_ucas');
  if (!m.actions.some((a) => a.kind === 'control')) us.appendChild(mk('p', { class: 'muted' }, t('stm.noActions')));
  m.actions.filter((a) => a.kind === 'control').forEach((a) => {
    us.appendChild(mk('h4', { class: 'fcat' }, `${codes[a.id]} ${short(a.text, 60)}`));
    m.ucas.filter((u) => u.actionId === a.id).forEach((u) => {
      const card = mk('div', { class: 'fcard', 'data-id': u.id });
      card.appendChild(head(codes[u.id], u.id));
      card.appendChild(field(t('stm.ucaType'), select(u.type, ST.UCA_TYPES.map((k) => [k, ST.UCA_INFO[k][lang]]), (v) => mutate(() => { u.type = v; }))));
      card.appendChild(field(t('stm.context'), textInput(u.context, (v) => mutate(() => { u.context = v; }), true), u.id));
      if (m.hazards.length) card.appendChild(choices(t('stm.hazards'), m.hazards.map((h) => [h.id, `${codes[h.id]} ${short(h.text)}`]), (id) => u.hazardIds.includes(id),
        (id, on) => mutate(() => { u.hazardIds = on ? [...new Set([...u.hazardIds, id])] : u.hazardIds.filter((x) => x !== id); })));
      card.appendChild(field(t('stm.ucaConstraint'), textInput(u.constraint, (v) => mutate(() => { u.constraint = v; }), true)));
      m.scenarios.filter((s) => s.ucaId === u.id).forEach((s) => {
        const row = mk('div', { class: 'frow', 'data-id': s.id });
        row.appendChild(field(`${codes[s.id]} ${t('stm.scenario')}`, textInput(s.text, (v) => mutate(() => { s.text = v; }), true), s.id));
        row.appendChild(del(s.id));
        card.appendChild(row);
      });
      card.appendChild(button(t('stm.addScenario'), () => mutate(() => ST.addScenario(m, u.id), { rebuild: true })));
      us.appendChild(card);
    });
    us.appendChild(button(t('stm.addUca'), () => mutate(() => ST.addUca(m, a.id), { rebuild: true })));
  });
  host.appendChild(us);
}
