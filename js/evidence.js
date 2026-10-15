// Safetytool — evidence & assumptions shared by bowtie, Swiss cheese and scenario models. Pure: no DOM.
// Rule: never create a source for the user. An evidence record holds only what the user typed.
//   OBSERVED = fact with a source · ASSESSED = analyst's judgement · HYPOTHESISED = still to verify.

import { uid } from './model.js';

export const EVIDENCE_KINDS = ['OBSERVED', 'ASSESSED', 'HYPOTHESISED'];
export const CONFIDENCE = ['low', 'medium', 'high'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function addEvidence(m, kind, source = '') {
  const e = { id: uid('ev'), kind, source, date: '', reference: '', limitation: '', confidence: null };
  (m.evidence = m.evidence || []).push(e);
  return e;
}

export function addAssumption(m, statement = '') {
  const a = { id: uid('as'), statement, kind: 'HYPOTHESISED', owner: '', reason: '', howToVerify: '', impactIfFalse: '', confidence: null };
  (m.assumptions = m.assumptions || []).push(a);
  return a;
}

export function isIsoDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Structural checks on m.evidence / m.assumptions and on every `evidenceIds` / `assumptionIds` reference
 * found on `holders` (array of objects with an id). Returns { errors, warnings } (codes follow the spec: V-07).
 */
export function checkEvidence(m, holders) {
  const errors = [];
  const warnings = [];
  const ev = m.evidence || [];
  const as = m.assumptions || [];
  const evIds = new Set();
  const asIds = new Set();
  for (const e of ev) {
    if (!e || typeof e.id !== 'string') { errors.push('V-10 evidence without id'); continue; }
    if (evIds.has(e.id)) errors.push('V-02 duplicate evidence id ' + e.id);
    evIds.add(e.id);
    if (!EVIDENCE_KINDS.includes(e.kind)) errors.push('V-10 evidence ' + e.id + ': kind must be one of ' + EVIDENCE_KINDS.join('/'));
    if (e.date && !isIsoDate(e.date)) errors.push('V-10 evidence ' + e.id + ': date must be YYYY-MM-DD');
    if (e.confidence != null && !CONFIDENCE.includes(e.confidence)) errors.push('V-10 evidence ' + e.id + ': bad confidence');
    if (e.kind === 'OBSERVED' && !(e.source || '').trim()) warnings.push('E-01 OBSERVED evidence ' + e.id + ' has no source; an observation needs a traceable source');
    if (e.kind === 'OBSERVED' && !(e.reference || '').trim() && !(e.date || '').trim()) warnings.push('E-02 OBSERVED evidence ' + e.id + ' has neither a reference nor a date');
  }
  for (const a of as) {
    if (!a || typeof a.id !== 'string') { errors.push('V-10 assumption without id'); continue; }
    if (asIds.has(a.id) || evIds.has(a.id)) errors.push('V-02 duplicate id ' + a.id);
    asIds.add(a.id);
    if (a.confidence != null && !CONFIDENCE.includes(a.confidence)) errors.push('V-10 assumption ' + a.id + ': bad confidence');
    if (a.kind === 'HYPOTHESISED' && !(a.howToVerify || '').trim()) warnings.push('E-03 hypothesis ' + a.id + ' has no way to verify it');
    if (!(a.owner || '').trim()) warnings.push('E-04 assumption ' + a.id + ' has no owner (who proposed it)');
  }
  for (const h of holders) {
    for (const id of h.evidenceIds || []) if (!evIds.has(id)) errors.push('V-07 ' + h.id + ' cites missing evidence ' + id);
    for (const id of h.assumptionIds || []) if (!asIds.has(id)) errors.push('V-07 ' + h.id + ' cites missing assumption ' + id);
  }
  return { errors, warnings };
}

/** Evidence and assumptions that mention a given element id — for the "what supports this?" panel. */
export function supportFor(m, holder) {
  const ev = new Map((m.evidence || []).map((e) => [e.id, e]));
  const as = new Map((m.assumptions || []).map((a) => [a.id, a]));
  return {
    evidence: (holder.evidenceIds || []).map((id) => ev.get(id)).filter(Boolean),
    assumptions: (holder.assumptionIds || []).map((id) => as.get(id)).filter(Boolean),
  };
}
