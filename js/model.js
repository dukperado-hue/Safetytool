// Safetytool — Bowtie data model (schema safetytool.bowtie/1)
// Pure functions, no DOM. Original design; concepts follow the public bowtie method.

export const SCHEMA = 'safetytool.bowtie/1';
export const FUNCTIONS = ['eliminate', 'prevent', 'reduce', 'mitigate'];
export const TYPES = ['policy', 'equipment', 'warning', 'human', 'automated'];
export const SIDES = ['prevent', 'recover'];

let seq = 0;
export function uid(prefix) {
  seq += 1;
  return prefix + '_' + Math.random().toString(36).slice(2, 7) + seq.toString(36);
}

export function emptyModel() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { title: '', scope: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    hazard: { id: uid('hz'), text: '', notes: '' },
    topEvent: { id: uid('te'), text: '', notes: '' },
    threats: [],
    consequences: [],
    controls: [],
    escalations: [],
    escalationControls: [],
  };
}

export function touch(m) {
  m.meta.updatedAt = new Date().toISOString();
  return m;
}

export function addThreat(m, text = '') {
  const t = { id: uid('th'), text, exposure: null, notes: '' };
  m.threats.push(t);
  return t;
}

export function addConsequence(m, text = '') {
  const c = { id: uid('co'), text, severity: null, notes: '' };
  m.consequences.push(c);
  return c;
}

/** side 'prevent' attaches to a threat; side 'recover' attaches to a consequence. */
export function addControl(m, side, parentId, text = '') {
  const siblings = controlsOf(m, side, parentId);
  const c = {
    id: uid('ct'),
    side,
    threatId: side === 'prevent' ? parentId : null,
    consequenceId: side === 'recover' ? parentId : null,
    order: siblings.length,
    text,
    function: side === 'prevent' ? 'prevent' : 'mitigate',
    type: null,
    critical: false,
    adequacy: null,
    reliability: null,
    owner: '',
    notes: '',
  };
  m.controls.push(c);
  return c;
}

export function addEscalation(m, controlId, text = '') {
  const e = { id: uid('ef'), controlId, text, notes: '' };
  m.escalations.push(e);
  return e;
}

export function addEscalationControl(m, escalationId, text = '') {
  const x = { id: uid('ec'), escalationId, text, owner: '', notes: '' };
  m.escalationControls.push(x);
  return x;
}

export function controlsOf(m, side, parentId) {
  return m.controls
    .filter((c) => c.side === side && (side === 'prevent' ? c.threatId : c.consequenceId) === parentId)
    .sort((a, b) => a.order - b.order);
}

function renumber(m, side, parentId) {
  controlsOf(m, side, parentId).forEach((c, i) => { c.order = i; });
}

export function moveControl(m, controlId, delta) {
  const c = m.controls.find((x) => x.id === controlId);
  if (!c) return false;
  const parent = c.side === 'prevent' ? c.threatId : c.consequenceId;
  const list = controlsOf(m, c.side, parent);
  const i = list.findIndex((x) => x.id === controlId);
  const j = i + delta;
  if (j < 0 || j >= list.length) return false;
  list[i].order = j;
  list[j].order = i;
  return true;
}

/** Remove a node and everything hanging off it. Returns number of removed objects. */
export function removeNode(m, id) {
  const gone = new Set();
  const controlIds = new Set();
  const escIds = new Set();
  const markControl = (cid) => {
    controlIds.add(cid);
    m.escalations.filter((e) => e.controlId === cid).forEach((e) => escIds.add(e.id));
  };
  m.threats.filter((t) => t.id === id).forEach((t) => {
    m.controls.filter((c) => c.threatId === t.id).forEach((c) => markControl(c.id));
    gone.add(t.id);
  });
  m.consequences.filter((t) => t.id === id).forEach((t) => {
    m.controls.filter((c) => c.consequenceId === t.id).forEach((c) => markControl(c.id));
    gone.add(t.id);
  });
  if (m.controls.some((c) => c.id === id)) markControl(id);
  if (m.escalations.some((e) => e.id === id)) escIds.add(id);

  const before = m.threats.length + m.consequences.length + m.controls.length + m.escalations.length + m.escalationControls.length;
  const touched = m.controls.filter((c) => controlIds.has(c.id));
  m.threats = m.threats.filter((t) => t.id !== id);
  m.consequences = m.consequences.filter((t) => t.id !== id);
  m.controls = m.controls.filter((c) => !controlIds.has(c.id));
  m.escalations = m.escalations.filter((e) => !escIds.has(e.id));
  m.escalationControls = m.escalationControls.filter((x) => x.id !== id && !escIds.has(x.escalationId));
  touched.forEach((c) => renumber(m, c.side, c.side === 'prevent' ? c.threatId : c.consequenceId));
  const after = m.threats.length + m.consequences.length + m.controls.length + m.escalations.length + m.escalationControls.length;
  return before - after;
}

export function findNode(m, id) {
  if (m.hazard.id === id) return { kind: 'hazard', ref: m.hazard };
  if (m.topEvent.id === id) return { kind: 'topEvent', ref: m.topEvent };
  let r = m.threats.find((x) => x.id === id);
  if (r) return { kind: 'threat', ref: r };
  r = m.consequences.find((x) => x.id === id);
  if (r) return { kind: 'consequence', ref: r };
  r = m.controls.find((x) => x.id === id);
  if (r) return { kind: 'control', ref: r };
  r = m.escalations.find((x) => x.id === id);
  if (r) return { kind: 'escalation', ref: r };
  r = m.escalationControls.find((x) => x.id === id);
  if (r) return { kind: 'escalationControl', ref: r };
  return null;
}

// ---- Effectiveness (our own convention: adequacy x reliability, each 1..4) ----
export const RATING_MAX = 4;

export function effectiveness(c) {
  if (!c.adequacy || !c.reliability) return null;
  return c.adequacy * c.reliability; // 1..16
}

/** Returns 'poor' | 'weak' | 'fair' | 'strong' | null */
export function effectivenessBand(c) {
  const v = effectiveness(c);
  if (v == null) return null;
  if (v <= 3) return 'poor';
  if (v <= 6) return 'weak';
  if (v <= 9) return 'fair';
  return 'strong';
}

// ---- Import validation ----
const arr = (x) => Array.isArray(x);
const str = (x) => typeof x === 'string';

/** Returns an array of error strings (empty = OK). Does not mutate. */
export function validateShape(m) {
  const errs = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.schema !== SCHEMA) errs.push('unsupported schema: ' + String(m.schema));
  for (const k of ['threats', 'consequences', 'controls', 'escalations', 'escalationControls']) {
    if (!arr(m[k])) errs.push(k + ' must be an array');
  }
  if (!m.hazard || !str(m.hazard.id)) errs.push('hazard missing');
  if (!m.topEvent || !str(m.topEvent.id)) errs.push('topEvent missing');
  if (errs.length) return errs;

  const ids = new Set([m.hazard.id, m.topEvent.id]);
  const all = [...m.threats, ...m.consequences, ...m.controls, ...m.escalations, ...m.escalationControls];
  for (const n of all) {
    if (!n || !str(n.id)) { errs.push('node without id'); continue; }
    if (ids.has(n.id)) errs.push('duplicate id: ' + n.id);
    ids.add(n.id);
  }
  const th = new Set(m.threats.map((x) => x.id));
  const co = new Set(m.consequences.map((x) => x.id));
  const ct = new Set(m.controls.map((x) => x.id));
  const ef = new Set(m.escalations.map((x) => x.id));
  for (const c of m.controls) {
    if (!SIDES.includes(c.side)) errs.push('control ' + c.id + ': bad side');
    else if (c.side === 'prevent' && !th.has(c.threatId)) errs.push('control ' + c.id + ': unknown threat');
    else if (c.side === 'recover' && !co.has(c.consequenceId)) errs.push('control ' + c.id + ': unknown consequence');
  }
  for (const e of m.escalations) if (!ct.has(e.controlId)) errs.push('escalation ' + e.id + ': unknown control');
  for (const x of m.escalationControls) if (!ef.has(x.escalationId)) errs.push('escalation control ' + x.id + ': unknown escalation');
  return errs;
}

/** Fill missing optional fields so older/hand-written files still work. */
export function normalize(m) {
  m.meta = Object.assign({ title: '', scope: '', author: '', illustrative: false, createdAt: '', updatedAt: '' }, m.meta || {});
  m.hazard.text = m.hazard.text || '';
  m.topEvent.text = m.topEvent.text || '';
  m.threats.forEach((t) => { t.text = t.text || ''; if (t.exposure === undefined) t.exposure = null; });
  m.consequences.forEach((c) => { c.text = c.text || ''; if (c.severity === undefined) c.severity = null; });
  m.controls.forEach((c) => {
    c.text = c.text || '';
    if (c.order == null) c.order = 0;
    if (c.critical == null) c.critical = false;
    if (c.owner == null) c.owner = '';
    if (c.adequacy === undefined) c.adequacy = null;
    if (c.reliability === undefined) c.reliability = null;
    if (c.function === undefined) c.function = null;
    if (c.type === undefined) c.type = null;
  });
  m.escalations.forEach((e) => { e.text = e.text || ''; });
  m.escalationControls.forEach((x) => { x.text = x.text || ''; });
  return m;
}

export function clone(m) {
  return JSON.parse(JSON.stringify(m));
}
