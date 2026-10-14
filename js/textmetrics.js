// Safetytool — text measuring and line wrapping for Thai (no spaces) and Latin text.
//
// Thai word breaks come from Intl.Segmenter when the browser has it; otherwise a syllable-cluster
// fallback is used so a line never breaks inside a syllable. On top of either, line-break rules keep
// opening brackets with the next word, closing marks/ๆ/ฯ/vowels with the previous word, and glue
// Latin words that sit inside brackets so "(Wildlife on the aerodrome)" is not torn apart.
// In the browser call setMeasurer() with a canvas-based function for exact widths.

let seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
let measurer = null;

/** fn(text, fontSizePx) -> width in px. Pass null to go back to the built-in estimate. */
export function setMeasurer(fn) { measurer = fn; }

const isThaiCombining = (c) => c === 0x0e31 || (c >= 0x0e34 && c <= 0x0e3a) || (c >= 0x0e47 && c <= 0x0e4e);

export function charWidth(ch, fs) {
  const c = ch.codePointAt(0);
  if (isThaiCombining(c)) return 0;
  if (c < 0x80) return fs * 0.56;
  if (c >= 0x0e00 && c <= 0x0e7f) return fs * 0.55;
  return fs * 0.95;
}

export function textWidth(s, fs) {
  if (measurer) return measurer(s, fs);
  let w = 0;
  for (const ch of s) w += charWidth(ch, fs);
  return w;
}

// Characters that must not start a line: Thai following vowels/marks (ะ ั า ำ ิ-ฺ ็-๎ ๅ), ฯ ๆ, closing punctuation.
const NO_START = /^[ฯะ-ฺๅ-๎)\]}»”’>,.;:!?%…]/;
// Characters that must not end a line: Thai leading vowels เ แ โ ใ ไ, opening brackets/quotes.
const NO_END = /[เ-ไ([{«“‘<]$/;

const THAI = /[฀-๿]/;

/** Fallback: split a Thai run into syllable-ish clusters (consonant + its marks; leading vowel joins the next consonant). */
function thaiClusters(run) {
  const out = [];
  let cur = '';
  for (const ch of run) {
    const c = ch.codePointAt(0);
    const leading = c >= 0x0e40 && c <= 0x0e44;
    const consonant = c >= 0x0e01 && c <= 0x0e2e;
    const startsNew = (consonant || leading) && cur && !/[เ-ไ]$/.test(cur);
    if (startsNew) { out.push(cur); cur = ''; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function rawTokens(text) {
  if (seg) return Array.from(seg.segment(text), (x) => x.segment);
  const out = [];
  text.split(/(\s+)/).filter((x) => x !== '').forEach((part) => {
    if (THAI.test(part)) {
      // split Thai and non-Thai sub-runs
      part.match(/[฀-๿]+|[^฀-๿]+/g).forEach((r) => {
        if (THAI.test(r)) out.push(...thaiClusters(r)); else out.push(r);
      });
    } else out.push(part);
  });
  return out;
}

/** Apply line-break rules by merging tokens that must stay together. */
function glue(tokens) {
  const out = [];
  for (const tok of tokens) {
    const prev = out[out.length - 1];
    const blank = /^\s+$/.test(tok);
    if (prev !== undefined && !blank && !/^\s+$/.test(prev) && (NO_START.test(tok) || NO_END.test(prev))) out[out.length - 1] = prev + tok;
    else out.push(tok);
  }
  return out;
}
/** Wrap text into lines no wider than maxW (px) at font size fs. Always returns at least one line. */
export function wrapText(text, maxW, fs = 12) {
  const lines = [];
  let cur = '';
  let curW = 0;
  const flush = () => { lines.push(cur.replace(/\s+$/, '')); cur = ''; curW = 0; };
  for (const tok of glue(rawTokens(String(text || '').replace(/\r?\n/g, ' ')))) {
    const w = textWidth(tok, fs);
    if (/^\s+$/.test(tok)) {
      // whitespace never starts a line; if it would overflow, it is the break point
      if (!cur) continue;
      if (curW + w > maxW) flush(); else { cur += tok; curW += w; }
      continue;
    }
    if (curW + w > maxW && cur) flush();
    if (w > maxW) {
      for (const ch of tok) {
        const cw = textWidth(ch, fs);
        if (curW + cw > maxW && cur) flush();
        cur += ch;
        curW += cw;
      }
    } else {
      cur += tok;
      curW += w;
    }
  }
  if (cur || !lines.length) flush();
  return lines;
}

/** Test hook: pass null to force the no-Segmenter fallback, undefined to restore. */
export function _setSegmenter(s) {
  seg = s === undefined ? (typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null) : s;
}
export const _internals = { glue, rawTokens, thaiClusters };
