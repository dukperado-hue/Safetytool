// Safetytool — bowtie analysis layer (optional fields on safetytool.bowtie/1). Pure: no DOM.
// Adds to the plain bowtie: barrier STATE (effective/degraded/failed/unknown), assurance data,
// evidence links, a deterministic what-if simulation, and a bridge to the scenario graph engine.
// Nothing here computes a probability. "Reachable" means "not shown to be cut under the user's settings".

import { controlsOf } from './model.js';
import { checkEvidence, isIsoDate } from './evidence.js';
import { seriesResult, runSimulation, compareRuns, fingerprint, MODEL_VERSION, LIMITATIONS, RESULT, BARRIER_STATUS, DEGRADED_LOGIC } from './scenario.js';

/** Treat a control as a barrier. A control with no `status` is `unknown` — we never assume it works. */
export function asBarrier(c) {
  return { id: c.id, name: c.text, status: c.status || 'unknown', degradedLogic: c.degradedLogic || null };
}

// ---------- validation of the optional fields ----------
export function validateBowtieExt(m) {
  const errors = [];
  const warnings = [];
  for (const c of m.controls) {
    if (c.status != null && !BARRIER_STATUS.includes(c.status)) errors.push('V-10 control ' + c.id + ': bad status ' + c.status);
    if (c.degradedLogic != null && !DEGRADED_LOGIC.includes(c.degradedLogic)) errors.push('V-10 control ' + c.id + ': bad degradedLogic');
    if (c.assurance) for (const k of ['lastVerified', 'nextReview']) {
      if (c.assurance[k] && !isIsoDate(c.assurance[k])) errors.push('V-10 control ' + c.id + ': assurance.' + k + ' must be YYYY-MM-DD');
    }
    if (c.status === 'unknown' || c.status == null) warnings.push('V-05 control ' + c.id + ' has no known state: paths through it can only be inconclusive');
    if (c.status === 'degraded' && !c.degradedLogic) warnings.push('V-06 control ' + c.id + ' is degraded without logic: paths through it will be inconclusive');
  }
  const holders = [m.hazard, m.topEvent, ...m.threats, ...m.consequences, ...m.controls, ...m.escalations, ...m.escalationControls];
  const e = checkEvidence(m, holders);
  return { errors: errors.concat(e.errors), warnings: warnings.concat(e.warnings) };
}

// ---------- escalation analysis ----------
/** Escalation factors that have no escalation control — the "uncontrolled hole" in a barrier. */
export function uncontrolledEscalations(m) {
  const controlled = new Set(m.escalationControls.map((x) => x.escalationId));
  return m.escalations.filter((e) => !controlled.has(e.id)).map((e) => ({ escalationId: e.id, controlId: e.controlId, text: e.text }));
}

// ---------- simulation ----------
/**
 * Stage-wise result:
 *  - threats: does each threat get through its preventive controls to the top event?
 *  - topEvent.reach: 'yes' (a threat is open), 'possible' (only inconclusive routes), 'no' (all threats cut)
 *  - consequences: does the top event get through the recovery controls of each consequence?
 *  - paths: threat→top event→consequence combined under the same series rule
 * "reach" never says a consequence WILL happen; it says it is not shown to be cut.
 */
export function simulateBowtie(m, { now = new Date().toISOString() } = {}) {
  const v = validateBowtieExt(m);
  if (v.errors.length) return { ok: false, errors: v.errors, warnings: v.warnings };
  const snapshot = JSON.parse(JSON.stringify(m));
  const unctl = uncontrolledEscalations(snapshot);
  const uncontrolledOf = new Set(unctl.map((u) => u.controlId));

  const left = new Map();
  const right = new Map();
  const threats = snapshot.threats.map((t) => {
    const cs = controlsOf(snapshot, 'prevent', t.id);
    left.set(t.id, cs);
    const r = seriesResult(cs.map(asBarrier));
    return { id: t.id, text: t.text, controls: r.roles, result: r.result, reason: r.reason, blockerIds: r.blockerIds };
  });
  const consequences = snapshot.consequences.map((c) => {
    const cs = controlsOf(snapshot, 'recover', c.id);
    right.set(c.id, cs);
    const r = seriesResult(cs.map(asBarrier));
    return { id: c.id, text: c.text, controls: r.roles, result: r.result, reason: r.reason, blockerIds: r.blockerIds };
  });
  const reach = threats.some((t) => t.result === RESULT.OPEN) ? 'yes'
    : threats.some((t) => t.result === RESULT.INCONCLUSIVE) ? 'possible' : 'no';

  const paths = [];
  for (const t of snapshot.threats) {
    for (const c of snapshot.consequences) {
      const all = left.get(t.id).concat(right.get(c.id));
      const r = seriesResult(all.map(asBarrier));
      // a cut that rests on ONE barrier whose escalation factors are uncontrolled is fragile
      const fragile = r.result === RESULT.CUT && r.blockerIds.length === 1 && uncontrolledOf.has(r.blockerIds[0]);
      paths.push({
        key: [snapshot.hazard.id, t.id, snapshot.topEvent.id, c.id].join('>'),
        threatId: t.id, consequenceId: c.id, barriers: r.roles, result: r.result, reason: r.reason, fragileCut: fragile,
      });
    }
  }
  const count = (x) => paths.filter((p) => p.result === x).length;
  const run = {
    kind: 'bowtie',
    modelVersion: MODEL_VERSION,
    inputFingerprint: fingerprint(snapshot),
    createdAt: now,
    inputSnapshot: snapshot,
    threats,
    topEvent: { id: snapshot.topEvent.id, text: snapshot.topEvent.text, reach },
    consequences,
    paths,
    summary: { total: paths.length, cut: count(RESULT.CUT), open: count(RESULT.OPEN), inconclusive: count(RESULT.INCONCLUSIVE), fragileCuts: paths.filter((p) => p.fragileCut).length },
    uncontrolledEscalations: unctl,
    warnings: v.warnings,
    limitations: LIMITATIONS.concat(['Top-event reach does not mean the top event or any consequence will occur; it means no modelled barrier is set to stop it.']),
  };
  run.id = 'RUN-' + run.inputFingerprint + '-' + MODEL_VERSION;
  return { ok: true, run, warnings: v.warnings };
}

/** Apply "what-if" state overrides without touching the original: { controlId: 'failed' | {status, degradedLogic} }. */
export function withStates(m, overrides) {
  const c = JSON.parse(JSON.stringify(m));
  for (const [id, o] of Object.entries(overrides)) {
    const ct = c.controls.find((x) => x.id === id);
    if (!ct) throw new Error('unknown control ' + id);
    const s = typeof o === 'string' ? { status: o } : o;
    ct.status = s.status;
    ct.degradedLogic = s.degradedLogic || null;
  }
  return c;
}

/** Single point of failure analysis: for each control, what changes if ONLY that control fails? */
export function failureImpact(m) {
  const base = simulateBowtie(m);
  if (!base.ok) return base;
  const rows = m.controls.map((c) => {
    const r = simulateBowtie(withStates(m, { [c.id]: 'failed' }));
    return {
      controlId: c.id, text: c.text, side: c.side,
      newlyNotCut: r.run.paths.filter((p, i) => base.run.paths[i].result === RESULT.CUT && p.result !== RESULT.CUT).map((p) => p.key),
    };
  });
  return { ok: true, rows: rows.filter((r) => r.newlyNotCut.length).sort((a, b) => b.newlyNotCut.length - a.newlyNotCut.length) };
}

// ---------- assurance register ----------
/** One row per control; gaps are factual (field empty / date passed), nothing is scored. */
export function assuranceRegister(m, asOf = new Date().toISOString().slice(0, 10)) {
  const evIds = new Set((m.evidence || []).map((e) => e.id));
  return m.controls.map((c) => {
    const a = c.assurance || {};
    const gaps = [];
    if (!(c.owner || '').trim()) gaps.push('no owner');
    if (!(a.performanceStandard || '').trim()) gaps.push('no performance standard');
    if (!(a.verification || '').trim()) gaps.push('no verification method');
    if (!a.lastVerified) gaps.push('never verified');
    if (!a.nextReview) gaps.push('no review date');
    else if (a.nextReview < asOf) gaps.push('review overdue (' + a.nextReview + ')');
    if (!(c.evidenceIds || []).some((id) => evIds.has(id))) gaps.push('no evidence linked');
    return {
      controlId: c.id, side: c.side, text: c.text, critical: !!c.critical, status: c.status || 'unknown', owner: c.owner || '',
      performanceStandard: a.performanceStandard || '', verification: a.verification || '', lastVerified: a.lastVerified || '', nextReview: a.nextReview || '',
      evidenceCount: (c.evidenceIds || []).length, gaps,
    };
  }).sort((x, y) => (Number(y.critical) - Number(x.critical)) || (y.gaps.length - x.gaps.length));
}

// ---------- bridge to the scenario graph engine ----------
export function bowtieToScenario(m) {
  const nodes = [{ id: m.hazard.id, kind: 'hazard', text: m.hazard.text }];
  const edges = [];
  const barriers = m.controls.map((c) => ({ ...asBarrier(c), role: c.side === 'prevent' ? 'preventive' : 'recovery', evidenceIds: c.evidenceIds || [], assumptionIds: c.assumptionIds || [] }));
  m.threats.forEach((t) => {
    nodes.push({ id: t.id, kind: 'threat', text: t.text });
    edges.push({ id: 'h>' + t.id, from: m.hazard.id, to: t.id, barrierIds: [] });
    edges.push({ id: t.id + '>te', from: t.id, to: m.topEvent.id, barrierIds: controlsOf(m, 'prevent', t.id).map((c) => c.id) });
  });
  nodes.push({ id: m.topEvent.id, kind: 'event', text: m.topEvent.text });
  m.consequences.forEach((c) => {
    nodes.push({ id: c.id, kind: 'consequence', text: c.text });
    edges.push({ id: 'te>' + c.id, from: m.topEvent.id, to: c.id, barrierIds: controlsOf(m, 'recover', c.id).map((x) => x.id) });
  });
  return {
    schema: 'safetytool.scenario/1',
    meta: { id: (m.meta && m.meta.id) || 'BT-' + m.hazard.id, title: (m.meta && m.meta.title) || '(untitled)', domain: '', author: '', illustrative: !!(m.meta && m.meta.illustrative), createdAt: '', updatedAt: '' },
    adrep: m.adrep || { occurrenceCategoryIds: [], eventTypeIds: [] },
    nodes, edges, barriers,
    evidence: m.evidence || [], assumptions: m.assumptions || [], unknownPolicy: 'inconclusive',
  };
}

/** Baseline vs alternative bowtie (e.g. a control added, removed, or its state changed). Path Count Difference only. */
export function compareBowties(base, alt) {
  const a = runSimulation(bowtieToScenario(base));
  const b = runSimulation(bowtieToScenario(alt));
  if (!a.ok || !b.ok) return { ok: false, errors: [...(a.errors || []), ...(b.errors || [])] };
  return { ok: true, diff: compareRuns(a.run, b.run) };
}
