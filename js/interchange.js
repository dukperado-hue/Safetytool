// Safetytool — shared interchange layer: model identity, entity index, cross-model links, portable packages.
// Pure: no DOM, no storage. See docs/INTEROP.md for the specification and the semantics of every link relation.
//
// Principles
//  * Native models keep their own schema and meaning. This layer only REFERENCES their entities by stable id.
//  * A link never says "causes". The vocabulary is small and each relation is defined (RELATIONS below).
//  * Importing never changes application state: validatePackage() previews, planImport() decides, the caller applies.
//  * Nothing here executes imported data; strings are only ever stored and later shown as text.

import * as M from './model.js';
import * as SW from './swiss.js';
import * as SH from './shell.js';
import * as HF from './hfacs.js';
import * as ST from './stamp.js';
import * as FR from './fram.js';
import * as PY from './pyramid.js';
import * as BA from './bowtie-analysis.js';

export const ENGINE = { name: 'safetytool', version: '0.1.0', interop: 1 };
export const FORMAT = 'safetytool.package';
export const FORMAT_VERSION = 1;
export const MAX_MEMBERS = 100;

/** Interchange entity vocabulary (a native model may use only the types that make sense for it). */
export const ENTITY_TYPES = [
  'model', 'event', 'context', 'hazard', 'threat', 'consequence', 'loss', 'control', 'escalationFactor', 'safetyConstraint',
  'uca', 'scenario', 'function', 'coupling', 'humanFactorsFinding', 'interface', 'defenceLayer', 'finding', 'evidence', 'assumption',
  'eventCategory', 'eventCount', 'dataset', 'controlStructureNode', 'controlAction', 'item', 'subject', 'correctiveAction',
];

/**
 * Link relations. Each is defined here and in docs/INTEROP.md. NONE of them asserts causation, equivalence or verification.
 */
export const RELATIONS = {
  related_to: { directed: false, en: 'Both entities concern the same subject. No claim about cause, equivalence or verification.', th: 'สองรายการเกี่ยวข้องกับเรื่องเดียวกัน ไม่ได้อ้างว่าเป็นเหตุ เท่ากัน หรือได้รับการยืนยัน' },
  supports: { directed: true, en: 'The source is offered as evidence or support for the target. It does not say how strong or how verified it is.', th: 'ต้นทางถูกเสนอเป็นหลักฐานหรือข้อสนับสนุนของปลายทาง ไม่ได้บอกว่าหนักแน่นหรือยืนยันแล้วแค่ไหน' },
  derived_from: { directed: true, en: 'The source was produced from the target by a recorded copy or transformation. It is not independent verification.', th: 'ต้นทางถูกสร้างจากปลายทางด้วยการคัดลอกหรือการแปลงที่บันทึกไว้ ไม่ใช่การยืนยันอิสระ' },
  candidate_mapping: { directed: true, en: 'The source is proposed to correspond to the target. It needs human review and is not an equivalence.', th: 'เสนอว่าต้นทางสอดคล้องกับปลายทาง ต้องให้คนตรวจ ไม่ใช่การระบุว่าเท่ากัน' },
  references: { directed: true, en: 'The source cites or uses the target as a pointer (for example a constraint that names a control). No claim about effect.', th: 'ต้นทางอ้างถึงหรือใช้ปลายทางเป็นตัวชี้ (เช่น ข้อกำหนดที่ระบุ control) ไม่ได้อ้างผลใด ๆ' },
};
export const RELATION_IDS = Object.keys(RELATIONS);
/** proposed = made by a transformation, not yet reviewed · confirmed = the analyst made or accepted it · rejected = the analyst refused it. */
export const LINK_STATUS = ['proposed', 'confirmed', 'rejected'];

// ---------------------------------------------------------------- entity index per model
const s = (v) => (v == null ? '' : String(v));
const E = (id, type, label, native) => ({ id, type, label: s(label), native });
const evAs = (m) => [
  ...(m.evidence || []).map((x) => E(x.id, 'evidence', x.source || x.reference, 'evidence')),
  ...(m.assumptions || []).map((x) => E(x.id, 'assumption', x.statement, 'assumption')),
];

export const ADAPTERS = {
  [M.SCHEMA]: {
    // shape first, then the bowtie extension rules (evidence references, assurance, corrective actions): same rule as `cli validate`
    type: 'bowtie', validate: (m) => { const e = M.validateShape(m); return e.length ? e : BA.validateBowtieExt(m).errors; }, normalize: M.normalize, empty: M.emptyModel,
    entities: (m) => [
      E(m.hazard.id, 'hazard', m.hazard.text, 'hazard'), E(m.topEvent.id, 'event', m.topEvent.text, 'topEvent'),
      ...m.threats.map((x) => E(x.id, 'threat', x.text, 'threat')), ...m.consequences.map((x) => E(x.id, 'consequence', x.text, 'consequence')),
      ...m.controls.map((x) => E(x.id, 'control', x.text, 'control')), ...m.escalations.map((x) => E(x.id, 'escalationFactor', x.text, 'escalation')),
      ...m.escalationControls.map((x) => E(x.id, 'control', x.text, 'escalationControl')),
      ...(m.correctiveActions || []).map((x) => E(x.id, 'correctiveAction', x.text || x.finding, 'correctiveAction')), ...evAs(m),
    ],
  },
  [SW.SCHEMA]: {
    type: 'swiss', validate: SW.validateSwiss, normalize: SW.normalizeSwiss, empty: SW.emptySwiss,
    entities: (m) => [
      E(m.hazard.id, 'hazard', m.hazard.text, 'hazard'), E(m.loss.id, 'loss', m.loss.text, 'loss'),
      ...m.layers.map((l) => E(l.id, 'defenceLayer', l.name, 'layer')),
      ...m.layers.flatMap((l) => l.holes.map((h) => E(h.id, 'finding', h.text, h.type === 'latent' ? 'holeLatent' : 'holeActive'))), ...evAs(m),
    ],
  },
  [SH.SCHEMA]: {
    type: 'shell', validate: SH.validateShell, normalize: SH.normalizeShell, empty: SH.emptyShell,
    entities: (m) => [
      E(m.subject.id, 'subject', m.subject.text, 'subject'), E(m.focus.id, 'context', m.focus.text, 'focus'),
      ...SH.COMPONENTS.flatMap((c) => m.components[c].map((x) => E(x.id, 'item', x.text, 'item' + c))),
      ...SH.INTERFACES.map((i) => E('if_' + i, 'interface', i[0] + '–' + i[1] + ' (' + m.interfaces[i].status + ')', 'interface')),
      ...SH.INTERFACES.flatMap((i) => m.interfaces[i].findings.map((x) => E(x.id, 'humanFactorsFinding', x.text, 'finding'))), ...evAs(m),
    ],
  },
  [HF.SCHEMA]: {
    type: 'hfacs', validate: HF.validateHfacs, normalize: HF.normalizeHfacs, empty: HF.emptyHfacs,
    entities: (m) => [E(m.event.id, 'event', m.event.text, 'hfEvent'), ...m.factors.map((f) => E(f.id, 'humanFactorsFinding', f.text, 'hfFactor')), ...evAs(m)],
  },
  [ST.SCHEMA]: {
    type: 'stamp', validate: ST.validateStamp, normalize: ST.normalizeStamp, empty: ST.emptyStamp,
    entities: (m) => [
      E(m.system.id, 'context', m.system.text, 'stSystem'), ...m.losses.map((x) => E(x.id, 'loss', x.text, 'stLoss')),
      ...m.hazards.map((x) => E(x.id, 'hazard', x.text, 'stHazard')),
      ...m.hazards.filter((x) => (x.constraint || '').trim()).map((x) => E(x.id + '#constraint', 'safetyConstraint', x.constraint, 'systemConstraint')),
      ...m.nodes.map((x) => E(x.id, 'controlStructureNode', x.text, x.role === 'process' ? 'stProcess' : 'stController')),
      ...m.actions.map((x) => E(x.id, 'controlAction', x.text, x.kind === 'feedback' ? 'stFeedback' : 'stAction')),
      ...m.ucas.map((x) => E(x.id, 'uca', x.context, 'stUca')),
      ...m.ucas.filter((x) => (x.constraint || '').trim()).map((x) => E(x.id + '#constraint', 'safetyConstraint', x.constraint, 'controllerConstraint')),
      ...m.scenarios.map((x) => E(x.id, 'scenario', x.text, 'stScenario')), ...evAs(m),
    ],
  },
  [FR.SCHEMA]: {
    type: 'fram', validate: FR.validateFram, normalize: FR.normalizeFram, empty: FR.emptyFram,
    entities: (m) => [
      E(m.activity.id, 'context', m.activity.text, 'framActivity'), ...m.functions.map((f) => E(f.id, 'function', f.name, 'framFunction')),
      ...m.couplings.map((c) => E(c.id, 'coupling', c.text || FR.couplingLabel(m, c), 'framCoupling')),
      ...m.functions.flatMap((f) => FR.ASPECTS.flatMap((a) => f.aspects[a].items.map((i) => E(i.id, 'item', i.text, 'framAspectItem')))),
      ...m.functions.flatMap((f) => f.variability.map((v) => E(v.id, 'finding', v.text, 'framVariability'))), ...evAs(m),
    ],
  },
  [PY.SCHEMA]: {
    type: 'pyramid', validate: PY.validatePyramid, normalize: PY.normalizePyramid, empty: PY.emptyPyramid,
    entities: (m) => [
      E(m.dataset.id, 'dataset', m.dataset.name || m.dataset.description, 'pyDataset'), ...m.categories.map((c) => E(c.id, 'eventCategory', c.label, 'pyCategory')),
      ...m.counts.map((c) => { const k = m.categories.find((x) => x.id === c.categoryId); return E(c.id, 'eventCount', (k ? k.label : '?') + ': ' + (c.count == null ? 'unknown' : c.count), 'pyCount'); }),
      ...m.records.map((r) => E(r.id, 'event', r.reference || r.date || r.note, 'pyRecord')), ...evAs(m),
    ],
  },
};
export const SCHEMA_OF = Object.fromEntries(Object.entries(ADAPTERS).map(([schema, a]) => [a.type, schema]));
export const adapterOf = (m) => (m && ADAPTERS[m.schema]) || null;
export const entitiesOf = (m) => { const a = adapterOf(m); return a ? a.entities(m) : []; };
export const hasEntity = (m, id) => entitiesOf(m).some((e) => e.id === id);
export const isBlank = (m) => entitiesOf(m).every((e) => !e.label.trim());

// ---------------------------------------------------------------- identity, canonical form, hashing
export function rid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

/** Give a model a stable id once. Never changes an existing id. */
export function ensureIdentity(m) {
  if (!m.meta) m.meta = {};
  if (!m.meta.modelId) m.meta.modelId = rid('md');
  if (!Number.isInteger(m.meta.revision) || m.meta.revision < 1) m.meta.revision = 1;
  return m;
}

const VOLATILE_META = ['createdAt', 'updatedAt', 'revision', 'lastExportHash'];
function sortKeys(x) {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])]));
  return x;
}
/** Semantic content as text: sorted keys, volatile fields (timestamps, revision, export hash, transformation times) removed. */
export function canonical(m) {
  const c = JSON.parse(JSON.stringify(m));
  if (c.meta) {
    VOLATILE_META.forEach((k) => { delete c.meta[k]; });
    if (Array.isArray(c.meta.transformations)) c.meta.transformations.forEach((h) => { delete h.at; });
  }
  return JSON.stringify(sortKeys(c));
}
export async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const d = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const contentHash = async (m) => sha256Hex(canonical(m));

/** Revision counts exports whose content differs from the previous export. Returns true when it was bumped. */
export async function stampExport(m) {
  ensureIdentity(m);
  const h = await contentHash(m);
  if (m.meta.lastExportHash && m.meta.lastExportHash !== h) { m.meta.revision += 1; m.meta.lastExportHash = h; return true; }
  if (!m.meta.lastExportHash) m.meta.lastExportHash = h;
  return false;
}

// ---------------------------------------------------------------- links
export function newLink(from, to, relation, opts = {}) {
  return { id: rid('lk'), from: { modelId: from.modelId, entityId: from.entityId }, to: { modelId: to.modelId, entityId: to.entityId }, relation, status: opts.status || 'confirmed', note: opts.note || '', by: opts.by || 'analyst', via: opts.via || '' };
}
const known = (models, ref) => { const m = models.get(ref.modelId); return m ? hasEntity(m, ref.entityId) : null; };

/** models: Map(modelId -> model). Returns [{ linkId, severity: 'error'|'warn', code, message }]. A link is only usable if it has no error. */
export function checkLinks(links, models) {
  const out = [];
  const seen = new Set();
  const add = (l, severity, code, message) => out.push({ linkId: l && l.id, severity, code, message });
  (links || []).forEach((l) => {
    if (!l || typeof l.id !== 'string') { add(l, 'error', 'L-01', 'link without id'); return; }
    if (seen.has(l.id)) add(l, 'error', 'L-02', 'duplicate link id ' + l.id);
    seen.add(l.id);
    if (!RELATION_IDS.includes(l.relation)) add(l, 'error', 'L-03', 'unsupported relation "' + l.relation + '" (Safetytool links never assert causation; use one of ' + RELATION_IDS.join(', ') + ')');
    if (!LINK_STATUS.includes(l.status)) add(l, 'error', 'L-04', 'bad status ' + l.status);
    for (const side of ['from', 'to']) {
      const r = l[side];
      if (!r || typeof r.modelId !== 'string' || typeof r.entityId !== 'string') { add(l, 'error', 'L-05', side + ' reference is incomplete'); continue; }
      const ok = known(models, r);
      if (ok === null) add(l, 'error', 'L-06', side + ' points to a model that is not in this set: ' + r.modelId);
      else if (!ok) add(l, 'error', 'L-07', side + ' points to an entity that does not exist: ' + r.entityId + ' in ' + r.modelId);
    }
    if (l.from && l.to && l.from.modelId === l.to.modelId && l.from.entityId === l.to.entityId) add(l, 'error', 'L-08', 'a link cannot point to itself');
    if (l.relation === 'derived_from' && l.status === 'confirmed' && !(l.note || '').trim() && l.by !== 'analyst') add(l, 'warn', 'L-09', 'derived_from is provenance, not verification');
  });
  return out;
}

// ---------------------------------------------------------------- link health, deletion impact, navigation (all derived from the current workspace; nothing here is stored)
/**
 * Where does one end of a link point right now? models: Map(modelId -> model).
 * reason: 'incomplete' (L-05) | 'model' (L-06, the model is not in the workspace) | 'entity' (L-07, the model is there but the entity is gone).
 * When the end resolves, the native description comes from the model's own adapter (its type, the entity's label and native kind).
 */
export function resolveRef(models, ref) {
  if (!ref || typeof ref.modelId !== 'string' || typeof ref.entityId !== 'string') return { ok: false, reason: 'incomplete', code: 'L-05' };
  const m = models.get(ref.modelId);
  if (!m) return { ok: false, reason: 'model', code: 'L-06' };
  const a = adapterOf(m);
  const base = { modelType: a ? a.type : null, modelTitle: (m.meta && m.meta.title) || '' };
  const e = entitiesOf(m).find((x) => x.id === ref.entityId);
  if (!e) return { ok: false, reason: 'entity', code: 'L-07', ...base };
  return { ok: true, ...base, entityType: e.type, native: e.native, label: e.label };
}
/** state: 'ok' | 'broken-model' (an end's model is unavailable) | 'broken-entity' (a model is there but an entity is gone). Uses the codes of checkLinks. */
export function linkHealth(link, models) {
  const from = resolveRef(models, link && link.from); const to = resolveRef(models, link && link.to);
  const bad = [from, to].filter((x) => !x.ok);
  const state = !bad.length ? 'ok' : bad.some((x) => x.reason === 'model' || x.reason === 'incomplete') ? 'broken-model' : 'broken-entity';
  return { state, from, to, codes: [...new Set(bad.map((x) => x.code))] };
}
export const entityIdsOf = (m) => new Set(entitiesOf(m).map((e) => e.id));
/** Links that have an end on one of `ids` inside model `modelId`. Each link is returned once, however many of its ends match. */
export function linksTouching(links, modelId, ids) {
  return (links || []).filter((l) => l && ((l.from && l.from.modelId === modelId && ids.has(l.from.entityId)) || (l.to && l.to.modelId === modelId && ids.has(l.to.entityId))));
}
/**
 * What would an edit remove? `apply` is run on a COPY of the model; the entities present before and gone after are returned together with the links
 * that point at them. The model passed in is never touched.
 */
export function deleteImpact(links, model, apply) {
  const copy = JSON.parse(JSON.stringify(model));
  const before = entityIdsOf(model);
  try { apply(copy); } catch { return { removed: new Set(), links: [] }; }
  const after = entityIdsOf(copy);
  const removed = new Set([...before].filter((id) => !after.has(id)));
  return { removed, links: linksTouching(links, model.meta && model.meta.modelId, removed) };
}
/** Can the user be taken to this end? A derived id such as `<id>#constraint` leads to the entity it belongs to. */
export function navigationTarget(models, ref) {
  const r = resolveRef(models, ref);
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, modelType: r.modelType, entityId: ref.entityId, baseId: ref.entityId.replace(/#constraint$/, '') };
}

// ---------------------------------------------------------------- package: build
const slug = (x) => String(x).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 60);
export function memberPath(type, modelId) { return 'models/' + slug(type) + '-' + slug(modelId) + '.json'; }

/**
 * members: [{ model }] (each with meta.modelId). Returns the package object (plain JSON).
 * opts: { links, history, extensions, unsupported, now }
 */
export async function buildPackage(members, opts = {}) {
  const errors = [];
  const out = [];
  for (const { model } of members) {
    const a = adapterOf(model);
    if (!a) { errors.push('unknown schema ' + (model && model.schema)); continue; }
    if (!model.meta || !model.meta.modelId) { errors.push('model "' + ((model.meta && model.meta.title) || a.type) + '" has no meta.modelId (call ensureIdentity first)'); continue; }
    const content = JSON.parse(JSON.stringify(model));
    out.push({ path: memberPath(a.type, content.meta.modelId), kind: 'model', schema: content.schema, type: a.type, modelId: content.meta.modelId, revision: content.meta.revision || 1, title: content.meta.title || '', contentHash: await contentHash(content), content });
  }
  if (errors.length) throw new Error(errors.join('; '));
  const models = new Map(out.map((x) => [x.modelId, x.content]));
  const links = JSON.parse(JSON.stringify(opts.links || []));
  const linkIssues = checkLinks(links, models);
  const perMember = Object.fromEntries(out.map((x) => [x.path, adapterOf(x.content).validate(x.content).length]));
  const semantic = { members: out.map((x) => ({ path: x.path, modelId: x.modelId, contentHash: x.contentHash })), links: [...links].sort((a, b) => a.id.localeCompare(b.id)), history: opts.history || [] };
  return {
    format: FORMAT, formatVersion: FORMAT_VERSION,
    exportedAt: opts.now || new Date().toISOString(), engine: { ...ENGINE },
    packageHash: await sha256Hex(JSON.stringify(sortKeys(semantic))),
    members: out, links, history: JSON.parse(JSON.stringify(opts.history || [])),
    validation: { memberErrors: perMember, linkIssues: linkIssues.length, ok: Object.values(perMember).every((n) => n === 0) && !linkIssues.some((i) => i.severity === 'error') },
    unsupportedMembers: opts.unsupported || [],
    extensions: opts.extensions || {},
  };
}

// ---------------------------------------------------------------- package: validate (preview; never mutates anything)
const SAFE_PATH = /^models\/[A-Za-z0-9_-][A-Za-z0-9._-]*\.json$/;
export const isSafePath = (p) => typeof p === 'string' && p.length <= 200 && SAFE_PATH.test(p) && !p.includes('..');
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SCRIPTY = /<\s*script\b|javascript\s*:/i;

function scan(x, path, issues) {
  if (typeof x === 'string') { if (SCRIPTY.test(x)) issues.push('script-like content at ' + path); return; }
  if (Array.isArray(x)) { x.forEach((v, i) => scan(v, path + '[' + i + ']', issues)); return; }
  if (x && typeof x === 'object') {
    for (const k of Object.keys(x)) { if (UNSAFE_KEYS.has(k)) issues.push('unsafe key "' + k + '" at ' + path); else scan(x[k], path + '.' + k, issues); }
  }
}

/**
 * existing: [{ modelId, type, revision, hash, title }] already in the workspace.
 * Returns { ok, errors, warnings, members:[{ path,type,modelId,status,issues }], conflicts, links:[{ link, usable, issues }], unknown, unsupported }.
 * status: new | identical | conflict | invalid | unsupported
 */
export async function validatePackage(pkg, existing = []) {
  const r = { ok: false, errors: [], warnings: [], members: [], conflicts: [], links: [], unknown: {}, unsupported: [] };
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) { r.errors.push('not a package object'); return r; }
  const unsafe = []; scan(pkg, '$', unsafe);
  if (unsafe.length) { r.errors.push(...unsafe.slice(0, 10).map((u) => 'rejected: ' + u)); return r; }
  if (pkg.format !== FORMAT) { r.errors.push('not a Safetytool package (format = ' + String(pkg.format) + ')'); return r; }
  if (!Number.isInteger(pkg.formatVersion) || pkg.formatVersion < 1) { r.errors.push('unsupported format version ' + String(pkg.formatVersion) + ' (no migration path)'); return r; }
  if (pkg.formatVersion > FORMAT_VERSION) { r.errors.push('package format version ' + pkg.formatVersion + ' is newer than this Safetytool understands (' + FORMAT_VERSION + '); nothing was imported'); return r; }
  if (!Array.isArray(pkg.members)) { r.errors.push('members must be an array'); return r; }
  if (pkg.members.length > MAX_MEMBERS) { r.errors.push('too many members (' + pkg.members.length + ' > ' + MAX_MEMBERS + ')'); return r; }
  const KNOWN_TOP = new Set(['format', 'formatVersion', 'exportedAt', 'engine', 'packageHash', 'members', 'links', 'history', 'validation', 'unsupportedMembers', 'extensions']);
  Object.keys(pkg).filter((k) => !KNOWN_TOP.has(k)).forEach((k) => { r.unknown[k] = pkg[k]; });
  if (Object.keys(r.unknown).length) r.warnings.push('unknown top-level fields kept as extensions: ' + Object.keys(r.unknown).join(', '));

  const paths = new Set(); const ids = new Set(); const models = new Map();
  for (const mem of pkg.members) {
    const issues = [];
    const row = { path: mem && mem.path, type: mem && mem.type, modelId: mem && mem.modelId, title: mem && mem.title, status: 'invalid', issues };
    r.members.push(row);
    if (!mem || typeof mem !== 'object') { issues.push('member is not an object'); continue; }
    if (mem.kind !== 'model') { issues.push('unexpected member kind "' + String(mem.kind) + '" (only "model" is accepted)'); continue; }
    if (!isSafePath(mem.path)) { issues.push('unsafe or invalid path "' + String(mem.path) + '"'); continue; }
    if (paths.has(mem.path)) { issues.push('duplicate path'); continue; }
    paths.add(mem.path);
    const c = mem.content;
    if (!c || typeof c !== 'object' || Array.isArray(c)) { issues.push('content must be a JSON object'); continue; }
    const a = adapterOf(c);
    if (!a) { row.status = 'unsupported'; issues.push('unsupported model schema "' + String(c.schema) + '"; kept aside, not imported'); r.unsupported.push(mem); continue; }
    if (!c.meta || typeof c.meta.modelId !== 'string' || !c.meta.modelId) { issues.push('missing meta.modelId'); continue; }
    if (mem.modelId !== c.meta.modelId) { issues.push('manifest modelId does not match the model'); continue; }
    if (ids.has(c.meta.modelId)) { issues.push('duplicate modelId ' + c.meta.modelId); continue; }
    ids.add(c.meta.modelId);
    const errs = a.validate(c);
    if (errs.length) { issues.push(...errs.slice(0, 8).map((e) => 'invalid: ' + e)); continue; }
    const h = await contentHash(c);
    row.type = a.type; row.hash = h; row.revision = c.meta.revision || 1;
    if (mem.contentHash && mem.contentHash !== h) r.warnings.push(mem.path + ': content differs from the hash recorded at export (edited after export?)');
    const ex = existing.find((e) => e.modelId === c.meta.modelId);
    if (!ex) row.status = 'new';
    else if (ex.hash === h) row.status = 'identical';
    else { row.status = 'conflict'; r.conflicts.push({ modelId: c.meta.modelId, type: a.type, path: mem.path, existing: { revision: ex.revision, hash: ex.hash, title: ex.title }, incoming: { revision: row.revision, hash: h, title: c.meta.title || '' }, options: ['keep-existing', 'import-as-copy', 'replace'] }); }
    models.set(c.meta.modelId, c);
  }
  // links are checked against everything the package carries (plus nothing else: a package must be self-contained)
  const issues = checkLinks(pkg.links || [], models);
  (pkg.links || []).forEach((l) => {
    const li = issues.filter((i) => i.linkId === (l && l.id));
    r.links.push({ link: l, usable: !li.some((i) => i.severity === 'error'), issues: li });
  });
  const broken = r.links.filter((x) => !x.usable).length;
  if (broken) r.warnings.push(broken + ' link(s) cannot be used (dangling or invalid) and will not be imported');
  const bad = r.members.filter((x) => x.status === 'invalid');
  bad.forEach((x) => r.errors.push((x.path || '(member)') + ': ' + x.issues.join('; ')));
  r.ok = r.errors.length === 0;
  return r;
}

/**
 * Decide what to apply. resolutions: { [modelId]: 'keep-existing' | 'import-as-copy' | 'replace' } for conflicts.
 * An unresolved conflict is skipped and reported — never overwritten. Pure: returns what to do.
 */
export function planImport(pkg, preview, resolutions = {}, opts = {}) {
  const newId = opts.newId || (() => rid('md'));
  const remap = {};
  const actions = []; const skipped = [];
  for (const row of preview.members) {
    if (row.status === 'invalid' || row.status === 'unsupported') { skipped.push({ path: row.path, reason: row.status }); continue; }
    const mem = pkg.members.find((x) => x.path === row.path);
    const model = JSON.parse(JSON.stringify(mem.content));
    if (row.status === 'identical') { skipped.push({ path: row.path, reason: 'identical to the existing model' }); continue; }
    if (row.status === 'new') { actions.push({ action: 'add', type: row.type, modelId: row.modelId, model }); continue; }
    const choice = resolutions[row.modelId];
    if (choice === 'replace') actions.push({ action: 'replace', type: row.type, modelId: row.modelId, model });
    else if (choice === 'import-as-copy') {
      const nid = newId(); remap[row.modelId] = nid;
      model.meta.modelId = nid; model.meta.revision = 1; delete model.meta.lastExportHash;
      model.meta.title = (model.meta.title || '') + ' (imported copy)';
      model.meta.transformations = [...(model.meta.transformations || []), { id: rid('tr'), transformId: 'import-as-copy', version: '1', at: opts.now || new Date().toISOString(), from: { modelId: row.modelId, revision: row.revision, hash: row.hash }, summary: 'Imported as a copy because a different model with the same id already existed.' }];
      actions.push({ action: 'add', type: row.type, modelId: nid, model, copyOf: row.modelId });
    } else skipped.push({ path: row.path, reason: choice === 'keep-existing' ? 'kept the existing model' : 'unresolved conflict (nothing was changed)' });
  }
  const applied = new Set(actions.map((a) => a.copyOf || a.modelId));
  const present = new Set([...applied, ...(opts.existingIds || [])]);
  const links = [];
  const droppedLinks = [];
  for (const x of preview.links) {
    if (!x.usable) { droppedLinks.push({ id: x.link && x.link.id, reason: 'invalid or dangling' }); continue; }
    const l = JSON.parse(JSON.stringify(x.link));
    if (remap[l.from.modelId] || remap[l.to.modelId]) { l.note = ((l.note || '') + ' [remapped to an imported copy; original link id ' + l.id + ']').trim(); l.id = rid('lk'); } // new id so it can sit next to the original link
    if (remap[l.from.modelId]) l.from.modelId = remap[l.from.modelId];
    if (remap[l.to.modelId]) l.to.modelId = remap[l.to.modelId];
    if (!present.has(l.from.modelId) && !Object.values(remap).includes(l.from.modelId)) { droppedLinks.push({ id: l.id, reason: 'source model not applied' }); continue; }
    if (!present.has(l.to.modelId) && !Object.values(remap).includes(l.to.modelId)) { droppedLinks.push({ id: l.id, reason: 'target model not applied' }); continue; }
    links.push(l);
  }
  return { actions, skipped, links, droppedLinks, remap, extensions: preview.unknown };
}

// ---------------------------------------------------------------- package: compare
export function diffPackages(a, b) {
  const ma = new Map((a.members || []).map((x) => [x.modelId, x])); const mb = new Map((b.members || []).map((x) => [x.modelId, x]));
  const la = new Map((a.links || []).map((x) => [x.id, x])); const lb = new Map((b.links || []).map((x) => [x.id, x]));
  return {
    modelsAdded: [...mb.keys()].filter((k) => !ma.has(k)), modelsRemoved: [...ma.keys()].filter((k) => !mb.has(k)),
    modelsChanged: [...mb.keys()].filter((k) => ma.has(k) && ma.get(k).contentHash !== mb.get(k).contentHash),
    linksAdded: [...lb.keys()].filter((k) => !la.has(k)), linksRemoved: [...la.keys()].filter((k) => !lb.has(k)),
    linksChanged: [...lb.keys()].filter((k) => la.has(k) && JSON.stringify(sortKeys(la.get(k))) !== JSON.stringify(sortKeys(lb.get(k)))),
    identicalContent: a.packageHash === b.packageHash,
  };
}

/** Plain-text provenance and dependency listing for one model or a whole package (used by the CLI and the UI). */
export function inspectModel(m, links = []) {
  const id = m.meta && m.meta.modelId;
  return {
    schema: m.schema, type: (adapterOf(m) || {}).type || null, modelId: id || null, revision: (m.meta && m.meta.revision) || null,
    title: (m.meta && m.meta.title) || '', author: (m.meta && m.meta.author) || '', illustrative: !!(m.meta && m.meta.illustrative),
    createdAt: (m.meta && m.meta.createdAt) || '', updatedAt: (m.meta && m.meta.updatedAt) || '',
    evidence: (m.evidence || []).length, assumptions: (m.assumptions || []).length,
    transformations: ((m.meta && m.meta.transformations) || []).map((h) => ({ transformId: h.transformId, version: h.version, from: h.from })),
    entities: entitiesOf(m).length,
    linksOut: links.filter((l) => l.from.modelId === id).length, linksIn: links.filter((l) => l.to.modelId === id).length,
  };
}
