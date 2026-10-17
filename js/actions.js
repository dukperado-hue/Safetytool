// Safetytool — bowtie barrier assurance records and corrective actions (optional fields on safetytool.bowtie/1). Pure: no DOM.
//
// Two separate things, kept separate on purpose:
//   * the BARRIER's assurance state (control.status: effective | degraded | failed | unknown, plus control.assurance) is an
//     analyst's assessment of the barrier. `failed` is this project's word for "ineffective": the analyst states the barrier cannot
//     meet its performance standard. `unknown` means the information is not enough; it is neither failure nor effectiveness.
//   * a CORRECTIVE ACTION (model.correctiveActions[]) is a piece of work. Closing it does NOT change the barrier's state: the
//     barrier must be reassessed and a new assessment recorded. Nothing here computes a probability or a score.
//
// Assessments are append-only: recordAssessment() copies the current state into control.assurance.history[]; nothing edits or
// removes an earlier entry.

import { uid } from './model.js';
import { isIsoDate } from './evidence.js';

export const ACTION_STATUS = ['open', 'in_progress', 'implemented', 'verified', 'closed', 'cancelled'];
/** Allowed moves. A move into verified/closed also has to satisfy closureProblems(). */
const NEXT = {
  open: ['in_progress', 'implemented', 'cancelled'],
  in_progress: ['open', 'implemented', 'cancelled'],
  implemented: ['in_progress', 'verified', 'cancelled'],
  verified: ['implemented', 'closed'],
  closed: [],
  cancelled: ['open'],
};
export const STATUS_STATES = ['effective', 'degraded', 'failed', 'unknown'];
const isDone = (a) => a.status === 'closed' || a.status === 'cancelled';

// ------------------------------------------------------------------ assessments (append-only history)
/**
 * Append the control's CURRENT state to its history. Returns the entry. Earlier entries are never touched.
 * `now` is only the time the entry was recorded; `assessedOn` (the date of the assessment) is whatever the analyst entered.
 */
export function recordAssessment(c, { now = new Date().toISOString(), note = '' } = {}) {
  const a = (c.assurance = c.assurance || {});
  const entry = {
    id: uid('as'), recordedAt: now,
    status: c.status || 'unknown', degradedLogic: c.degradedLogic || null,
    assessedBy: a.assessedBy || '', assessedOn: a.assessedOn || '', lastVerified: a.lastVerified || '',
    performanceStandard: a.performanceStandard || '', note: note || a.assessmentNotes || '',
    evidenceIds: [...(c.evidenceIds || [])],
  };
  (a.history = a.history || []).push(entry);
  return entry;
}

/** One-line reading of a state for the UI and reports. Deliberately says what the state does NOT mean. */
export const STATE_MEANING = {
  effective: { th: 'ผู้ประเมินระบุว่า barrier ทำงานตามมาตรฐานสมรรถนะ และควรมีหลักฐานที่ตรวจสอบได้รองรับ', en: 'The assessor states the barrier meets its performance standard; supporting evidence should be linked.' },
  degraded: { th: 'พบข้อบกพร่องหรือสมรรถนะลดลง ยังไม่ได้แปลว่าใช้การไม่ได้ (ดูตรรกะ "ถ้าเสื่อม")', en: 'A deficiency or reduced capability is known. This does not by itself mean the barrier has failed.' },
  failed: { th: 'ผู้ประเมินระบุชัดว่า barrier ไม่สามารถทำตามมาตรฐานสมรรถนะ (ineffective)', en: 'The assessor explicitly states the barrier cannot meet its performance standard (ineffective).' },
  unknown: { th: 'ข้อมูลไม่พอจะบอกสภาพ — ไม่ใช่ล้มเหลว และไม่ใช่ทำงานปกติ', en: 'Not enough information to say. This is neither failure nor effectiveness.' },
};

// ------------------------------------------------------------------ corrective actions
export function addAction(m, controlId = null, finding = '') {
  const a = {
    id: uid('ca'), controlId, finding, text: '', ownerRole: '', dueDate: '', status: 'open',
    completionEvidenceIds: [], verification: { by: '', at: '', note: '' }, closedAt: '', createdAt: new Date().toISOString(), notes: '',
  };
  (m.correctiveActions = m.correctiveActions || []).push(a);
  return a;
}
export const actionsOf = (m, controlId) => (m.correctiveActions || []).filter((a) => a.controlId === controlId);

/** What is still missing before an action can be verified or closed. [] = nothing missing. */
export function closureProblems(m, a) {
  const out = [];
  const ev = new Set((m.evidence || []).map((e) => e.id));
  if (!(a.text || '').trim()) out.push('the action is not described');
  if (!(a.completionEvidenceIds || []).some((id) => ev.has(id))) out.push('no completion evidence is linked');
  const v = a.verification || {};
  if (!(v.by || '').trim()) out.push('no verifier is recorded');
  if (!v.at || !isIsoDate(v.at)) out.push('no verification date (YYYY-MM-DD)');
  return out;
}

/** Move an action to a new status if allowed. Never changes any barrier. Returns { ok, reason?, missing? }. */
export function setActionStatus(m, id, status, { now = new Date().toISOString() } = {}) {
  const a = (m.correctiveActions || []).find((x) => x.id === id);
  if (!a) return { ok: false, reason: 'unknown action' };
  if (!ACTION_STATUS.includes(status)) return { ok: false, reason: 'unknown status' };
  if (status === a.status) return { ok: true };
  if (!NEXT[a.status].includes(status)) return { ok: false, reason: 'cannot move from ' + a.status + ' to ' + status };
  if (status === 'verified' || status === 'closed') {
    const missing = closureProblems(m, a);
    if (missing.length) return { ok: false, reason: 'closure conditions are not met', missing };
  }
  a.status = status;
  if (status === 'closed') a.closedAt = now; // a full timestamp, so "closed after the last assessment" also works within one day
  else if (a.closedAt) a.closedAt = '';
  return { ok: true };
}

export function removeAction(m, id) { m.correctiveActions = (m.correctiveActions || []).filter((a) => a.id !== id); }

// ------------------------------------------------------------------ validation
/**
 * Errors = structurally wrong (dangling reference, unknown state, a closed action that breaks the closure rules).
 * Warnings = something the analyst should look at; none of them changes a barrier's state.
 */
export function validateAssurance(m, { asOf = new Date().toISOString().slice(0, 10) } = {}) {
  const errors = []; const warnings = [];
  const ev = new Map((m.evidence || []).map((e) => [e.id, e]));
  const ctl = new Map((m.controls || []).map((c) => [c.id, c]));
  const used = new Set([m.hazard && m.hazard.id, m.topEvent && m.topEvent.id, ...(m.threats || []).map((x) => x.id), ...(m.consequences || []).map((x) => x.id), ...ctl.keys(), ...(m.escalations || []).map((x) => x.id), ...(m.escalationControls || []).map((x) => x.id), ...ev.keys(), ...(m.assumptions || []).map((x) => x.id)]);

  for (const c of m.controls || []) {
    const a = c.assurance;
    if (a && a.history != null) {
      if (!Array.isArray(a.history)) errors.push('V-A01 control ' + c.id + ': assurance.history must be an array');
      else a.history.forEach((h) => {
        if (!h || typeof h.id !== 'string') { errors.push('V-A01 control ' + c.id + ': an assessment history entry has no id'); return; }
        if (!STATUS_STATES.includes(h.status)) errors.push('V-A02 control ' + c.id + ': history entry ' + h.id + ' has a bad status');
        if (h.assessedOn && !isIsoDate(h.assessedOn)) errors.push('V-A02 control ' + c.id + ': history entry ' + h.id + ' assessedOn must be YYYY-MM-DD');
      });
    }
    if (a && a.assessedOn && !isIsoDate(a.assessedOn)) errors.push('V-A02 control ' + c.id + ': assurance.assessedOn must be YYYY-MM-DD');
    if (c.status === 'effective') {
      const observed = (c.evidenceIds || []).some((id) => ev.get(id) && ev.get(id).kind === 'OBSERVED');
      if (!observed) warnings.push('V-A10 control ' + c.id + ' is marked effective but no OBSERVED evidence is linked; an effective state should rest on evidence');
    }
    if (a && a.nextReview && isIsoDate(a.nextReview) && a.nextReview < asOf) warnings.push('V-A11 control ' + c.id + ': the review date ' + a.nextReview + ' has passed; the state may be stale');
  }

  const seen = new Set();
  for (const a of m.correctiveActions || []) {
    if (!a || typeof a.id !== 'string') { errors.push('V-A20 corrective action without id'); continue; }
    if (seen.has(a.id) || used.has(a.id)) errors.push('V-A21 duplicate id ' + a.id);
    seen.add(a.id);
    if (!ACTION_STATUS.includes(a.status)) errors.push('V-A22 action ' + a.id + ': bad status ' + String(a.status));
    if (a.controlId != null && !ctl.has(a.controlId)) errors.push('V-A23 action ' + a.id + ' points to a barrier that does not exist: ' + a.controlId);
    if (a.controlId == null) warnings.push('V-A24 action ' + a.id + ' is not linked to a barrier' + (a.formerControl ? ' (its barrier "' + (a.formerControl.text || a.formerControl.id) + '" was deleted)' : ''));
    if (a.dueDate && !isIsoDate(a.dueDate)) errors.push('V-A25 action ' + a.id + ': dueDate must be YYYY-MM-DD');
    if (a.verification && a.verification.at && !isIsoDate(a.verification.at)) errors.push('V-A25 action ' + a.id + ': verification.at must be YYYY-MM-DD');
    for (const id of a.completionEvidenceIds || []) if (!ev.has(id)) errors.push('V-A26 action ' + a.id + ' cites missing evidence ' + id);
    if ((a.status === 'verified' || a.status === 'closed') && ACTION_STATUS.includes(a.status)) {
      const miss = closureProblems(m, a);
      if (miss.length) errors.push('V-A27 action ' + a.id + ' is ' + a.status + ' but ' + miss.join('; '));
    }
    if (!isDone(a) && a.dueDate && isIsoDate(a.dueDate) && a.dueDate < asOf) warnings.push('V-A28 action ' + a.id + ' is overdue (due ' + a.dueDate + ')');
    if (!isDone(a) && !(a.ownerRole || '').trim()) warnings.push('V-A29 action ' + a.id + ' has no responsible role');
  }
  for (const c of m.controls || []) {
    if ((c.status === 'degraded' || c.status === 'failed') && !actionsOf(m, c.id).length) warnings.push('V-A30 control ' + c.id + ' is ' + c.status + ' and has no corrective action recorded');
  }
  return { errors, warnings };
}

/** Per-control summary used by the assurance register. A closed action never raises a barrier's state; it only asks for reassessment. */
export function actionSummary(m, c) {
  const acts = actionsOf(m, c.id);
  const open = acts.filter((a) => !isDone(a)).length;
  const lastAssessed = ((c.assurance && c.assurance.history) || []).map((h) => h.recordedAt).sort().pop() || '';
  const closedSince = acts.filter((a) => a.status === 'closed' && a.closedAt && (!lastAssessed || a.closedAt > lastAssessed));
  return { total: acts.length, open, closed: acts.filter((a) => a.status === 'closed').length, reassessmentDue: closedSince.length > 0 };
}
