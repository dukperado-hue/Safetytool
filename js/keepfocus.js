// Safetytool — keep the user's place when a form is redrawn.
// A form field commits on "change" (when it loses focus). If the form is then rebuilt, the field the user just
// clicked or tabbed to is replaced and whatever they type next goes nowhere (or into the first field). These functions
// remember which field had focus and the caret, and put focus back once the rebuild is done.
// A field is found again by (1) the card it is in (data-id) and its position inside that card — this survives a card
// moving elsewhere in the form, e.g. an HFACS factor whose category was just changed — or else (2) its position among all
// controls, but only if the number of controls is unchanged. If neither fits, nothing is restored rather than focusing a wrong field.
export const CONTROLS = 'input,select,textarea';

const ownerOf = (root, el) => {
  const o = el.closest ? el.closest('[data-id]') : null;
  const id = o && o !== root && o.getAttribute ? o.getAttribute('data-id') : null;
  return id ? { id, within: [...o.querySelectorAll(CONTROLS)].indexOf(el) } : null;
};

/** `root` is the container being rebuilt, `active` the focused element. Returns null when there is nothing to keep. */
export function captureFocus(root, active) {
  if (!root || !active || !root.contains(active) || !active.matches(CONTROLS)) return null;
  const all = [...root.querySelectorAll(CONTROLS)];
  const index = all.indexOf(active);
  if (index < 0) return null;
  let start = null; let end = null;
  try { start = active.selectionStart; end = active.selectionEnd; } catch { /* not a text control */ }
  return { index, count: all.length, start, end, owner: ownerOf(root, active) };
}

/** Put focus (and caret) back after the rebuild. Returns whether it did. */
export function restoreFocus(root, snap) {
  if (!root || !snap) return false;
  let el = null;
  if (snap.owner && snap.owner.within >= 0 && root.querySelectorAll) {
    const card = [...root.querySelectorAll('[data-id]')].find((c) => c.getAttribute('data-id') === snap.owner.id);
    if (card) el = [...card.querySelectorAll(CONTROLS)][snap.owner.within] || null;
  }
  if (!el) {
    const all = [...root.querySelectorAll(CONTROLS)];
    if (all.length === snap.count) el = all[snap.index] || null;
  }
  if (!el) return false;
  el.focus({ preventScroll: true });
  if (el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest' }); } catch { /* ignore */ } }
  if (snap.start != null) { try { el.setSelectionRange(snap.start, snap.end); } catch { /* ignore */ } }
  return true;
}

/** Run `rebuild()` and keep the focused field of whichever root contains it. */
export function keepFocus(roots, doc, rebuild) {
  const active = doc.activeElement;
  const root = active && active.closest ? active.closest(roots) : null;
  const snap = captureFocus(root, active);
  rebuild();
  if (snap) restoreFocus(root, snap);
}

/** Run `fn` once, `ms` after the last call (the trailing call wins): a drag-resize fires many events but redraws once. */
export function debounce(fn, ms) {
  let timer = null;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => { timer = null; fn(...args); }, ms); };
}
