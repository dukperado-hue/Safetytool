// Safetytool — Thai typeface (Sarabun) for the screen, the diagrams, the report and the exports.
// Sarabun is Copyright 2018 The Sarabun Project Authors, SIL Open Font License 1.1 (fonts/OFL.txt). The woff files are Thai-block subsets
// of the upstream Sarabun-Regular/Bold (https://github.com/cadsondemak/Sarabun, via google/fonts ofl/sarabun); no other change was made.
// The font files live in fonts/ (subset to the Thai block; Latin letters and digits keep the interface font, so English terms and
// codes such as CT-01 are not changed). A page's own @font-face is NOT visible inside a downloaded SVG, an SVG drawn into a PNG,
// or a downloaded report, so those embed the files as data: URIs (embeddedFontCss). Printing the report uses relativeFontCss because
// the print frame is built from the app page and resolves fonts/ against it.
export const THAI_FAMILY = '"Sarabun"';
export const THAI_RANGE = 'U+0E00-0E7F,U+200B-200D,U+25CC';
export const THAI_SIZE_ADJUST = '118%';   // Sarabun is drawn small; this brings it to the size of the Latin text beside it
export const FONT_FILES = [
  { weight: 400, file: 'fonts/sarabun-regular.woff' },
  { weight: 700, file: 'fonts/sarabun-bold.woff' },
];

const face = (weight, src) => `@font-face{font-family:${THAI_FAMILY};src:url(${src}) format("woff");font-weight:${weight};font-style:normal;font-display:swap;unicode-range:${THAI_RANGE};size-adjust:${THAI_SIZE_ADJUST}}`;

/** @font-face rules that point at the files next to the app (for a frame that shares the app's base URL). */
export const relativeFontCss = () => FONT_FILES.map((f) => face(f.weight, f.file)).join('');

let embedded = null;
/** @font-face rules with the font files inlined, so a downloaded file looks the same anywhere. Returns '' if the files cannot be read. */
export async function embeddedFontCss(fetchFn = (typeof fetch === 'function' ? fetch : null)) {
  if (embedded != null) return embedded;
  if (!fetchFn) return '';
  try {
    const parts = [];
    for (const f of FONT_FILES) {
      const r = await fetchFn(f.file);
      if (!r.ok) throw new Error(String(r.status));
      const bytes = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      parts.push(face(f.weight, 'data:font/woff;base64,' + btoa(bin)));
    }
    embedded = parts.join('');
  } catch { return ''; }   // not cached on failure: try again next time
  return embedded;
}

/** Make sure the face is ready before text is measured for wrapping (waits at most `ms`). */
export async function loadThaiFont(doc = (typeof document !== 'undefined' ? document : null), ms = 2000) {
  if (!doc || !doc.fonts || !doc.fonts.load) return false;
  const one = (w) => doc.fonts.load(`${w} 14px ${THAI_FAMILY}`, 'กำไร');
  const timeout = new Promise((res) => setTimeout(() => res(false), ms));
  try { return await Promise.race([Promise.all([one(400), one(700)]).then(() => true), timeout]); } catch { return false; }
}
