// Safetytool — Event Risk Classification (ERC) lookup. Pure: no DOM.
// ERC is an ANALYST judgement (two answers) read off a matrix. This module only looks the cell up and checks
// that the stored answers exist in the matrix; it never derives the answers from a simulation.
// The matrix lives in data/erc-matrix.json so an organisation can replace it with its own.

export const BARRIER_LEVELS = ['effective', 'limited', 'minimal', 'notEffective'];

export function pickMatrix(file, id) {
  const list = (file && file.matrices) || [];
  return list.find((m) => m.id === (id || file.default)) || null;
}

/**
 * Wording of a matrix, a row or the file in the interface language. The Thai wording lives beside the English in the same JSON
 * (`th: { … }`); scores, bands and ids are language-free. A field with no Thai text falls back to the English, never to nothing.
 */
export function ercText(obj, key, lang) {
  if (!obj) return undefined;
  const th = lang === 'th' && obj.th && obj.th[key];
  return th || obj[key];
}

/** 'unverified' | 'reference-only' | null — how far the table's source can be trusted. Shown with the table, never hidden. */
export const ercSourceStatus = (matrix) => (matrix && matrix.sourceStatus) || null;

/** @returns {{score:number, band:string, outcome:string, action:string|null}|null} null when either answer is missing. */
export function ercLookup(matrix, outcomeId, barrierId, lang) {
  if (!matrix || !outcomeId || !barrierId) return null;
  const row = matrix.rows.find((r) => r.id === outcomeId);
  const ci = matrix.columns.findIndex((c) => c.id === barrierId);
  if (!row || ci < 0) return null;
  const cell = row.cells[ci];
  const bandsTh = lang === 'th' && matrix.th && matrix.th.bands;
  return { score: cell.score, band: cell.band, outcome: ercText(row, 'outcome', lang), action: (bandsTh && bandsTh[cell.band]) || (matrix.bands && matrix.bands[cell.band]) || null };
}

/** Structural check of an `erc` block against a matrix. Returns error strings. */
export function validateErc(erc, matrix) {
  if (erc == null) return [];
  const errs = [];
  if (typeof erc !== 'object') return ['V-10 erc must be an object'];
  if (erc.outcome != null && typeof erc.outcome !== 'string') errs.push('V-10 erc.outcome must be a string');
  else if (erc.outcome != null && matrix && !matrix.rows.some((r) => r.id === erc.outcome)) errs.push('V-10 erc.outcome is not a row of the matrix: ' + erc.outcome);
  if (erc.barriers != null && !BARRIER_LEVELS.includes(erc.barriers)) errs.push('V-10 erc.barriers must be one of ' + BARRIER_LEVELS.join('/'));
  return errs;
}

/** Context shown next to Question 2 — counts of control states in the model. Informational only. */
export function barrierContext(m) {
  const c = { effective: 0, degraded: 0, failed: 0, unknown: 0, total: m.controls.length };
  for (const k of m.controls) c[k.status || 'unknown'] += 1;
  return c;
}
