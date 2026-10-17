// Safetytool — data-integrity helpers for opening files and saving to the gallery. Pure: no DOM, no storage.
//
//  * N1  opening a file / gallery work / example replaces the open model of that type. planOpen() says whether that destroys
//        something (a non-blank model whose content differs) and how many cross-model links it would leave dangling;
//        backupPlan() produces the gallery list that keeps the old model first. The caller writes it and must NOT replace the
//        model unless that write succeeded.
//  * N6  a gallery work is identified by its model's meta.modelId. saveWorkPlan() keeps modelId unique across works:
//        "save as new" gives the copy a fresh modelId and never touches the original.
// No schema change: only existing fields (meta.modelId, meta.title) are used.

import * as IC from './interchange.js';
import { upsertWork, MAX_WORKS } from './gallery.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const idOf = (m) => (m && m.meta && m.meta.modelId) || null;
const same = (a, b) => IC.canonical(a) === IC.canonical(b);
const noId = (m) => { const c = clone(m); if (c.meta) delete c.meta.modelId; return c; };
const sameContent = (a, b) => same(noId(a), noId(b));

/**
 * current: the model now in the slot (or null) · incoming: the parsed model about to replace it · links: workspace links.
 * replaces = the open will destroy something. affectedLinks = links that touch an entity of `current` that will no longer exist
 * (every touching link when the model id differs; only links to vanished entities when it is the same model).
 */
export function planOpen({ current, incoming, links = [] }) {
  if (!current || IC.isBlank(current) || same(current, incoming)) return { replaces: false, affectedLinks: 0 };
  const cid = idOf(current);
  const sameModel = !!cid && cid === idOf(incoming);
  const before = IC.entityIdsOf(current);
  const gone = sameModel ? new Set([...before].filter((id) => !IC.entityIdsOf(incoming).has(id))) : before;
  const affectedLinks = cid ? IC.linksTouching(links, cid, gone).length : 0;
  // the same content under another (or no) modelId destroys nothing unless a link was attached to the old id
  if (!sameModel && affectedLinks === 0 && sameContent(current, incoming)) return { replaces: false, affectedLinks: 0 };
  return { replaces: true, sameModel, affectedLinks };
}

const collides = (works, modelId, exceptWorkId) => !!modelId && works.some((w) => w.id !== exceptWorkId && idOf(w.model) === modelId);
const isNew = (works, id) => !works.some((w) => w.id === id);

/**
 * Keep `current` in the gallery before it is replaced.
 * -> { ok:true, works|null (null = nothing to write: an identical copy is already saved), id? }
 *  | { ok:false, reason:'full' }   (adding would silently push the oldest work out: refuse instead)
 * If another saved work has the same modelId but different content, the backup gets a fresh modelId and a "(backup)" title,
 * so the gallery never holds two works with one modelId.
 */
export function backupPlan(works, { type, current, newWorkId, newModelId, now }) {
  if (works.some((w) => w.type === type && same(w.model, current))) return { ok: true, works: null };
  if (works.length >= MAX_WORKS) return { ok: false, reason: 'full' };
  const copy = clone(current);
  IC.ensureIdentity(copy);
  if (collides(works, idOf(copy), null)) {
    copy.meta.modelId = newModelId(); copy.meta.revision = 1; delete copy.meta.lastExportHash;
    copy.meta.title = (copy.meta.title || '') + ' (backup)';
  }
  return { ok: true, works: upsertWork(works, { id: newWorkId, type, model: copy, now }), id: newWorkId };
}

/**
 * Save the open model to the gallery.
 *  asNew=false: update work `id` (or add it). The stored copy keeps the model's modelId unless another work already uses it
 *               (a duplicate that existed before): then it reuses the id it already had, or gets a fresh one.
 *  asNew=true : add a NEW work holding a copy with a fresh modelId; the original work and the open model are untouched.
 * -> { ok:true, works, id, model (the stored copy) } | { ok:false, reason:'full' }
 */
export function saveWorkPlan(works, { id, type, model, asNew, newWorkId, newModelId, now }) {
  const copy = clone(model);
  IC.ensureIdentity(copy);
  const wid = asNew || !id ? newWorkId : id;
  if (isNew(works, wid) && works.length >= MAX_WORKS) return { ok: false, reason: 'full' };
  if (asNew) { copy.meta.modelId = newModelId(); copy.meta.revision = 1; delete copy.meta.lastExportHash; }
  else if (collides(works, idOf(copy), wid)) {
    const prior = idOf((works.find((w) => w.id === wid) || {}).model);
    copy.meta.modelId = prior && !collides(works, prior, wid) ? prior : newModelId();
  }
  return { ok: true, works: upsertWork(works, { id: wid, type, model: copy, now }), id: wid, model: copy };
}

/** modelIds used by more than one work (diagnostic; the gallery should never produce this any more). */
export function duplicateModelIds(works) {
  const seen = new Map();
  works.forEach((w) => { const m = idOf(w.model); if (m) seen.set(m, (seen.get(m) || 0) + 1); });
  return [...seen].filter(([, n]) => n > 1).map(([m]) => m);
}

/**
 * Keep `current` in the gallery before a slot is overwritten WITHOUT asking (the caller has already confirmed, or the replacement is a
 * derived/imported model). Nothing to keep when the slot is empty/blank or the incoming model has identical content. Unlike a bare
 * try/catch around writeWorks (which signals failure by returning false), this checks every result and never lets the gallery push
 * its oldest work out. Content that differs under the SAME modelId is protected too.
 * read() -> works · write(works) -> boolean.  -> { ok:true, backedUp } | { ok:false, reason:'backup-failed' }
 */
export function backupBeforeReplace({ type, current, incoming, read, write, newWorkId, newModelId, now }) {
  if (!current || IC.isBlank(current) || same(current, incoming)) return { ok: true, backedUp: false };
  const b = backupPlan(read(), { type, current, newWorkId, newModelId, now });
  if (!b.ok) return { ok: false, reason: 'backup-failed' };
  if (b.works && !write(b.works)) return { ok: false, reason: 'backup-failed' };
  return { ok: true, backedUp: !!b.works };
}

/**
 * The whole open decision with the side effects injected, so it can be tested without a browser.
 * ask(plan) -> boolean (the confirmation) · read() -> works · write(works) -> boolean.
 * -> { proceed:true, backedUp } | { proceed:false, reason:'cancelled' | 'backup-failed' }.
 * Order is the contract: ask first; write the backup second; only when both succeeded may the caller replace anything.
 */
export function guardedOpen({ type, current, incoming, links, ask, read, write, newWorkId, newModelId, now }) {
  const plan = planOpen({ current, incoming, links });
  if (!plan.replaces) return { proceed: true, backedUp: false, plan };
  if (!ask(plan)) return { proceed: false, reason: 'cancelled', plan };
  const b = backupPlan(read(), { type, current, newWorkId, newModelId, now });
  if (!b.ok) return { proceed: false, reason: 'backup-failed', plan };
  if (b.works && !write(b.works)) return { proceed: false, reason: 'backup-failed', plan };
  return { proceed: true, backedUp: !!b.works, plan };
}
