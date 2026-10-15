// Safetytool — Event Risk Classification (ERC) lookup. Pure: no DOM.
// ERC is an ANALYST judgement (two answers) read off a matrix. This module only looks the cell up and checks
// that the stored answers exist in the matrix; it never derives the answers from a simulation.
// The matrix lives in data/erc-matrix.json so an organisation can replace it with its own.

export const BARRIER_LEVELS = ['effective', 'limited', 'minimal', 'notEffective'];

export function pickMatrix(file, id) {
  const list = (file && file.matrices) || [];
  return list.find((m) => m.id === (id || file.default)) || null;
}

/** @returns {{score:number, band:string, outcome:string, action:string|null}|null} null when either answer is missing. */
export function ercLookup(matrix, outcomeId, barrierId) {
  if (!matrix || !outcomeId || !barrierId) return null;
  const row = matrix.rows.find((r) => r.id === outcomeId);
  const ci = matrix.columns.findIndex((c) => c.id === barrierId);
  if (!row || ci < 0) return null;
  const cell = row.cells[ci];
  return { score: cell.score, band: cell.band, outcome: row.outcome, action: (matrix.bands && matrix.bands[cell.band]) || null };
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
