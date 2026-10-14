// Safetytool — data-entry forms for the Swiss cheese and SHELL models (keyboard- and screen-reader-friendly).
// api: { t(key), mutate(fn, {rebuild}) }. Text edits commit on "change" and do not rebuild the form (keeps focus);
// structural edits (add/remove/move) rebuild it.
import * as SW from './swiss.js';
import * as SH from './shell.js';

const mk = (tag, attrs = {}, text) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (v != null && v !== false) e.setAttribute(k, v === true ? '' : String(v)); });
  if (text != null) e.textContent = text;
  return e;
};

function field(label, input, id) {
  const l = mk('label', { class: 'fld', 'data-id': id });
  l.appendChild(mk('span', {}, label));
  l.appendChild(input);
  return l;
}
function textInput(value, onChange, area, rows = 2) {
  const i = area ? mk('textarea', { rows }) : mk('input', { type: 'text' });
  i.value = value || '';
  i.addEventListener('change', () => onChange(i.value));
  return i;
}
function select(value, options, onChange) {
  const s = mk('select');
  options.forEach(([v, l]) => { const o = mk('option', { value: v }, l); s.appendChild(o); });
  s.value = value == null ? '' : String(value);
  s.addEventListener('change', () => onChange(s.value));
  return s;
}
function button(label, fn, cls) {
  const b = mk('button', { type: 'button', class: cls }, label);
  b.addEventListener('click', fn);
  return b;
}
function section(title, id) {
  const s = mk('section', { class: 'fsec', 'data-id': id });
  s.appendChild(mk('h3', {}, title));
  return s;
}

// ------------------------------------------------------------------ Swiss cheese
export function buildSwissForm(host, m, api) {
  const { t, mutate } = api;
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
    head.appendChild(button(t('delete'), () => { if (confirm(t('confirmDelete'))) mutate(() => SW.removeLayer(m, l.id), { rebuild: true }); }, 'mini danger'));
    card.appendChild(head);
    card.appendChild(field(t('sw.layerName'), textInput(l.name, (v) => mutate(() => { l.name = v; })), l.id));
    card.appendChild(field(t('sw.category'), select(l.category, [['', t('none')], ...SW.LAYER_CATEGORIES.map((c) => [c, t('sw.cat.' + c)])], (v) => mutate(() => { l.category = v || null; }))));
    card.appendChild(field(t('sw.defence'), textInput(l.defence, (v) => mutate(() => { l.defence = v; }), true)));
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
      side.appendChild(button(t('delete'), () => mutate(() => SW.removeHole(m, h.id), { rebuild: true }), 'mini danger'));
      row.appendChild(side);
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
  const { t, mutate } = api;
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
      row.appendChild(button(t('delete'), () => mutate(() => SH.removeShellNode(m, it.id), { rebuild: true }), 'mini danger'));
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
      card.appendChild(button(t('delete'), () => mutate(() => SH.removeShellNode(m, x.id), { rebuild: true }), 'mini danger'));
      sec.appendChild(card);
    });
    sec.appendChild(button(t('sh.addFinding'), () => mutate(() => SH.addFinding(m, i), { rebuild: true })));
    host.appendChild(sec);
  });
}
