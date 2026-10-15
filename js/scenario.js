// Safetytool — barrier-logic scenario + deterministic path engine (schema safetytool.scenario/1). Pure: no DOM.
// Purpose: answer "which hazard→consequence paths are still open under THESE user-set barrier states?"
// It is a LOGICAL model. It does not compute probabilities, and a smaller path count is a Path Count
// Difference, never a "risk reduction". Holes drawn on a Swiss-cheese picture carry no weight here.
//
// Graph: nodes (hazard | threat | event | consequence) joined by edges; each edge may carry barriers.
// A path = one simple route from a start node (hazard/threat with no incoming edge) to a consequence.
// Series rule (spec 6.3): a path is CUT if at least one barrier on it is effective (or degraded with
// logic "blocks"); it is OPEN only if every barrier on it has failed (or degraded with logic "fails");
// otherwise it is INCONCLUSIVE (unknown, or degraded without logic).

export const SCHEMA = 'safetytool.scenario/1';
export const MODEL_VERSION = 'logic-1.0.0';
export const NODE_KINDS = ['hazard', 'threat', 'event', 'consequence'];
export const BARRIER_STATUS = ['effective', 'degraded', 'failed', 'unknown'];
export const DEGRADED_LOGIC = ['blocks', 'fails'];
export const EVIDENCE_KINDS = ['OBSERVED', 'ASSESSED', 'HYPOTHESISED'];
export const RESULT = { CUT: 'cut', OPEN: 'open', INCONCLUSIVE: 'inconclusive' };

export const LIMITATIONS = [
  'Logical path model only: no probabilities, frequencies or severities are computed.',
  'Barrier states are user-defined inputs, not evidence that the real control behaves that way.',
  'Barriers are treated as independent; common-cause failure is not modelled unless the graph shows it.',
  'A change in path count is a Path Count Difference, not a risk reduction.',
];

export function emptyScenario() {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA,
    meta: { id: '', title: '', domain: '', author: '', illustrative: false, createdAt: now, updatedAt: now },
    adrep: { occurrenceCategoryIds: [], eventTypeIds: [] },
    nodes: [],
    edges: [],
    barriers: [],
    evidence: [],
    assumptions: [],
    unknownPolicy: 'inconclusive',
  };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------- validation (V-01..V-07, V-10) ----------
/** @returns {{errors:string[], warnings:string[]}} errors block saving/running; warnings do not. */
export function validateScenario(s) {
  const errors = [];
  const warnings = [];
  if (!s || typeof s !== 'object') return { errors: ['not an object'], warnings };
  if (s.schema !== SCHEMA) errors.push('schema: expected ' + SCHEMA + ', got ' + String(s.schema));
  if (!s.meta || !s.meta.id || !s.meta.title) errors.push('V-01 meta.id and meta.title are required');
  for (const k of ['nodes', 'edges', 'barriers', 'evidence', 'assumptions']) {
    if (!Array.isArray(s[k])) errors.push('V-10 ' + k + ' must be an array');
  }
  if (errors.length) return { errors, warnings };

  const ids = new Map();
  const claim = (id, where) => {
    if (typeof id !== 'string' || !id) { errors.push('V-10 ' + where + ': id missing'); return; }
    if (ids.has(id)) errors.push('V-02 duplicate id ' + id + ' (' + where + ' and ' + ids.get(id) + ')');
    else ids.set(id, where);
  };
  s.nodes.forEach((n) => {
    claim(n && n.id, 'node');
    if (n && !NODE_KINDS.includes(n.kind)) errors.push('V-10 node ' + n.id + ': bad kind ' + n.kind);
  });
  s.edges.forEach((e) => claim(e && e.id, 'edge'));
  s.barriers.forEach((b) => {
    claim(b && b.id, 'barrier');
    if (b && !BARRIER_STATUS.includes(b.status)) errors.push('V-10 barrier ' + b.id + ': bad status ' + b.status);
    if (b && b.degradedLogic != null && !DEGRADED_LOGIC.includes(b.degradedLogic)) errors.push('V-10 barrier ' + b.id + ': bad degradedLogic');
  });
  s.evidence.forEach((e) => {
    claim(e && e.id, 'evidence');
    if (e && !EVIDENCE_KINDS.includes(e.kind)) errors.push('V-10 evidence ' + e.id + ': kind must be one of ' + EVIDENCE_KINDS.join('/'));
  });
  s.assumptions.forEach((a) => claim(a && a.id, 'assumption'));

  const nodeIds = new Set(s.nodes.map((n) => n.id));
  const barrierIds = new Set(s.barriers.map((b) => b.id));
  const onEdge = new Set();
  for (const e of s.edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) errors.push('V-03 edge ' + e.id + ' points to a missing node');
    if (!Array.isArray(e.barrierIds)) { errors.push('V-10 edge ' + e.id + ': barrierIds must be an array'); continue; }
    for (const b of e.barrierIds) {
      if (!barrierIds.has(b)) errors.push('V-03 edge ' + e.id + ' references missing barrier ' + b); else onEdge.add(b);
    }
  }
  for (const b of s.barriers) {
    if (!onEdge.has(b.id)) warnings.push('V-03 barrier ' + b.id + ' is not on any edge (it cannot affect any path)');
    if (b.status === 'degraded' && !b.degradedLogic) warnings.push('V-06 barrier ' + b.id + ' is degraded without logic: affected paths will be inconclusive');
    if (b.status === 'unknown') warnings.push('V-05 barrier ' + b.id + ' is unknown: affected paths will be inconclusive');
  }
  const evIds = new Set(s.evidence.map((e) => e.id));
  const asIds = new Set(s.assumptions.map((a) => a.id));
  const refs = [...s.barriers, ...s.nodes];
  for (const r of refs) {
    for (const id of r.evidenceIds || []) if (!evIds.has(id)) errors.push('V-07 ' + r.id + ' cites missing evidence ' + id);
    for (const id of r.assumptionIds || []) if (!asIds.has(id)) errors.push('V-07 ' + r.id + ' cites missing assumption ' + id);
  }
  if (!s.nodes.some((n) => n.kind === 'consequence')) errors.push('V-03 no consequence node');
  if (!s.nodes.some((n) => n.kind === 'hazard' || n.kind === 'threat')) errors.push('V-03 no hazard or threat node');
  if (!errors.length && findCycle(s)) errors.push('V-04 the graph contains a cycle: ' + findCycle(s).join(' → '));
  return { errors, warnings };
}

function adjacency(s) {
  const adj = new Map(s.nodes.map((n) => [n.id, []]));
  for (const e of s.edges) if (adj.has(e.from)) adj.get(e.from).push(e);
  return adj;
}

/** @returns {string[]|null} node ids forming a cycle, or null. */
export function findCycle(s) {
  const adj = adjacency(s);
  const state = new Map(); // 1 = on stack, 2 = done
  const stack = [];
  let found = null;
  const visit = (id) => {
    if (found) return;
    state.set(id, 1); stack.push(id);
    for (const e of adj.get(id) || []) {
      if (!adj.has(e.to)) continue;
      if (state.get(e.to) === 1) { found = stack.slice(stack.indexOf(e.to)).concat(e.to); return; }
      if (!state.has(e.to)) visit(e.to);
      if (found) return;
    }
    stack.pop(); state.set(id, 2);
  };
  for (const n of s.nodes) if (!state.has(n.id)) visit(n.id);
  return found;
}

// ---------- paths ----------
/** All simple routes from start nodes (no incoming edge, kind hazard/threat) to consequence nodes. */
export function enumeratePaths(s) {
  const adj = adjacency(s);
  const kind = new Map(s.nodes.map((n) => [n.id, n.kind]));
  const hasIn = new Set(s.edges.map((e) => e.to));
  const starts = s.nodes.filter((n) => (n.kind === 'hazard' || n.kind === 'threat') && !hasIn.has(n.id));
  const out = [];
  const walk = (id, nodes, edges) => {
    if (kind.get(id) === 'consequence') {
      out.push({ key: nodes.join('>'), nodeIds: nodes.slice(), edgeIds: edges.map((e) => e.id) });
      return;
    }
    for (const e of adj.get(id) || []) walk(e.to, nodes.concat(e.to), edges.concat(e));
  };
  for (const st of starts) walk(st.id, [st.id], []);
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// ---------- simulation ----------
function role(b) {
  if (b.status === 'effective') return 'blocks';
  if (b.status === 'failed') return 'fails';
  if (b.status === 'degraded') return b.degradedLogic === 'blocks' ? 'blocks' : b.degradedLogic === 'fails' ? 'fails' : 'undetermined';
  return 'undetermined';
}

/**
 * Series rule for any list of barriers ({id,name,status,degradedLogic}) lying on one route.
 * Shared by the scenario graph and the bow-tie simulator so both give identical answers.
 */
export function seriesResult(barriers) {
  const roles = barriers.map((b) => ({ id: b.id, name: b.name, status: b.status, role: role(b) }));
  const blockers = roles.filter((r) => r.role === 'blocks');
  const undetermined = roles.filter((r) => r.role === 'undetermined');
  let result; let reason;
  if (blockers.length) {
    result = RESULT.CUT;
    reason = 'Cut by ' + blockers.map((r) => r.id).join(', ') + ' under the series rule (one working barrier is enough).';
  } else if (undetermined.length) {
    result = RESULT.INCONCLUSIVE;
    reason = 'No barrier is set to block, and ' + undetermined.map((r) => r.id + ' (' + r.status + ')').join(', ') + ' cannot be resolved. More information is needed; this does not mean the barrier failed.';
  } else {
    result = RESULT.OPEN;
    reason = roles.length ? 'Every barrier on the path is set to fail: ' + roles.map((r) => r.id).join(', ') + '.' : 'The path has no barriers.';
  }
  return { result, reason, roles, blockerIds: blockers.map((r) => r.id) };
}

/** Stable, non-cryptographic fingerprint (FNV-1a) so identical inputs give an identical run id. */
export function fingerprint(obj) {
  const str = JSON.stringify(sortKeys(obj));
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function sortKeys(x) {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])]));
  return x;
}

/**
 * Run the deterministic simulation. Never throws on bad data: returns { ok:false, errors }.
 * The result holds an inputSnapshot so it can be re-opened after the scenario is edited.
 */
export function runSimulation(s, { now = new Date().toISOString() } = {}) {
  const v = validateScenario(s);
  if (v.errors.length) return { ok: false, errors: v.errors, warnings: v.warnings };
  const snapshot = clone(s);
  const bar = new Map(snapshot.barriers.map((b) => [b.id, b]));
  const edge = new Map(snapshot.edges.map((e) => [e.id, e]));
  const paths = enumeratePaths(snapshot).map((p) => {
    const barrierIds = [];
    for (const eid of p.edgeIds) for (const b of edge.get(eid).barrierIds) if (!barrierIds.includes(b)) barrierIds.push(b);
    const { result, reason, roles } = seriesResult(barrierIds.map((id) => bar.get(id)));
    return { key: p.key, nodeIds: p.nodeIds, edgeIds: p.edgeIds, barriers: roles, result, reason };
  });
  const count = (r) => paths.filter((p) => p.result === r).length;
  const run = {
    modelVersion: MODEL_VERSION,
    inputFingerprint: fingerprint(snapshot),
    createdAt: now,
    inputSnapshot: snapshot,
    paths,
    summary: { total: paths.length, cut: count(RESULT.CUT), open: count(RESULT.OPEN), inconclusive: count(RESULT.INCONCLUSIVE) },
    warnings: v.warnings,
    limitations: LIMITATIONS.slice(),
  };
  run.id = 'RUN-' + run.inputFingerprint + '-' + MODEL_VERSION;
  return { ok: true, run, warnings: v.warnings };
}

// ---------- what-if ----------
/** Copy a baseline into an alternative without touching it. */
export function makeAlternative(base, id, title) {
  const alt = clone(base);
  alt.meta.id = id; alt.meta.title = title; alt.meta.baselineId = base.meta.id;
  alt.meta.updatedAt = new Date().toISOString();
  return alt;
}

const structureSig = (s) => fingerprint({
  n: s.nodes.map((n) => [n.id, n.kind]).sort(),
  e: s.edges.map((e) => [e.id, e.from, e.to, [...e.barrierIds].sort()]).sort(),
});

/** Compare two completed runs. Pure set arithmetic on path keys; no risk wording. */
export function compareRuns(baseRun, altRun) {
  const bs = baseRun.inputSnapshot; const as = altRun.inputSnapshot;
  const bMap = new Map(baseRun.paths.map((p) => [p.key, p]));
  const aMap = new Map(altRun.paths.map((p) => [p.key, p]));
  const open = (p) => p && p.result !== RESULT.CUT; // open or inconclusive = not shown to be cut
  const stillOpen = (p) => p && p.result === RESULT.OPEN;
  const barrierChanges = [];
  const aBar = new Map(as.barriers.map((b) => [b.id, b]));
  const bBar = new Map(bs.barriers.map((b) => [b.id, b]));
  for (const [id, b] of bBar) {
    const a = aBar.get(id);
    if (!a) barrierChanges.push({ id, change: 'removed', from: b.status });
    else if (a.status !== b.status || (a.degradedLogic || null) !== (b.degradedLogic || null)) barrierChanges.push({ id, change: 'status', from: b.status, to: a.status });
  }
  for (const [id, a] of aBar) if (!bBar.has(id)) barrierChanges.push({ id, change: 'added', to: a.status });
  const aAs = new Map(as.assumptions.map((x) => [x.id, x.statement]));
  const bAs = new Map(bs.assumptions.map((x) => [x.id, x.statement]));
  const assumptionChanges = [];
  for (const [id, t] of bAs) { if (!aAs.has(id)) assumptionChanges.push({ id, change: 'removed' }); else if (aAs.get(id) !== t) assumptionChanges.push({ id, change: 'edited' }); }
  for (const id of aAs.keys()) if (!bAs.has(id)) assumptionChanges.push({ id, change: 'added' });

  const notes = [];
  const structureChanged = structureSig(bs) !== structureSig(as);
  if (structureChanged) notes.push('The graph structure differs between the two scenarios; path counts are not like-for-like and must not be read as a change in risk.');
  if (baseRun.modelVersion !== altRun.modelVersion) notes.push('V-08 the runs used different model versions (' + baseRun.modelVersion + ' vs ' + altRun.modelVersion + ').');
  const inconcl = altRun.summary.inconclusive + baseRun.summary.inconclusive;
  if (inconcl) notes.push(inconcl + ' path result(s) are inconclusive; the comparison is incomplete for those paths.');

  const keys = (m, f) => [...m.keys()].filter(f).sort();
  return {
    label: 'Path Count Difference',
    pathCount: { baseline: baseRun.summary, alternative: altRun.summary,
      notCutDifference: altRun.paths.filter(open).length - baseRun.paths.filter(open).length,
      openDifference: altRun.summary.open - baseRun.summary.open },
    onlyBaseline: keys(bMap, (k) => !aMap.has(k)),
    onlyAlternative: keys(aMap, (k) => !bMap.has(k)),
    inBoth: keys(bMap, (k) => aMap.has(k)),
    newlyCut: keys(bMap, (k) => aMap.has(k) && open(bMap.get(k)) && aMap.get(k).result === RESULT.CUT),
    newlyOpen: keys(bMap, (k) => aMap.has(k) && bMap.get(k).result === RESULT.CUT && open(aMap.get(k))),
    stillOpenInBoth: keys(bMap, (k) => stillOpen(bMap.get(k)) && stillOpen(aMap.get(k))),
    barrierChanges, assumptionChanges, structureChanged, notes,
  };
}

// ---------- ADREP link ----------
/** Look up ADREP ids in a loaded taxonomy file (data/adrep-taxonomy.json); returns unknown ids too. */
export function resolveAdrep(s, taxonomy) {
  const cat = new Map(taxonomy.occurrenceCategories.map((c) => [c.id, c]));
  const ev = new Map(taxonomy.eventTypes.map((c) => [c.id, c]));
  const a = s.adrep || {};
  return {
    categories: (a.occurrenceCategoryIds || []).map((id) => cat.get(id) || { id, unknown: true }),
    events: (a.eventTypeIds || []).map((id) => ev.get(id) || { id, unknown: true }),
  };
}
