// Safetytool — approximate text measuring/wrapping that works for Thai (no spaces) and Latin text.
// Thai gets word breaks from Intl.Segmenter when available.

const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;

function isThaiCombining(c) {
  return c === 0x0e31 || (c >= 0x0e34 && c <= 0x0e3a) || (c >= 0x0e47 && c <= 0x0e4e);
}

export function charWidth(ch, fs) {
  const c = ch.codePointAt(0);
  if (isThaiCombining(c)) return 0;
  if (c < 0x80) return fs * 0.56;
  if (c >= 0x0e00 && c <= 0x0e7f) return fs * 0.55;
  return fs * 0.95;
}

export function textWidth(s, fs) {
  let w = 0;
  for (const ch of s) w += charWidth(ch, fs);
  return w;
}

function tokens(text) {
  if (seg) return Array.from(seg.segment(text), (x) => x.segment);
  return text.split(/(\s+)/).filter((x) => x !== '');
}

/** Wrap text into lines no wider than maxW (px) at font size fs. Always returns at least one line. */
export function wrapText(text, maxW, fs = 12) {
  const lines = [];
  let cur = '';
  let curW = 0;
  const flush = () => { lines.push(cur.replace(/\s+$/, '')); cur = ''; curW = 0; };
  for (const tok of tokens(String(text || '').replace(/\r?\n/g, ' '))) {
    if (!cur && /^\s+$/.test(tok)) continue;
    const w = textWidth(tok, fs);
    if (curW + w > maxW && cur) flush();
    if (w > maxW) {
      for (const ch of tok) {
        const cw = charWidth(ch, fs);
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
