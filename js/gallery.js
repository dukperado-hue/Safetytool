// Safetytool — gallery of saved work, shown in the right-hand panel (no extra menu).
// "My work" lives in this browser only (localStorage); the example models ship with the app.
// The pure helpers at the top have no DOM and are covered by test/gallery.test.js.

export const KEY = 'safetytool.gallery';
export const MAX_WORKS = 40;

export const EXAMPLES = [
  { type: 'bowtie', file: 'data/example-wildlife.json' },
  { type: 'swiss', file: 'data/example-swiss.json' },
  { type: 'shell', file: 'data/example-shell.json' },
  { type: 'hfacs', file: 'data/example-hfacs.json' },
  { type: 'stamp', file: 'data/example-stamp.json' },
  { type: 'fram', file: 'data/example-fram.json' },
  { type: 'pyramid', file: 'data/example-pyramid.json' },
];

/** Parse stored JSON defensively: anything malformed becomes []. */
export function parseWorks(raw) {
  try {
    const a = JSON.parse(raw || '[]');
    return Array.isArray(a) ? a.filter((w) => w && typeof w.id === 'string' && w.model && typeof w.type === 'string') : [];
  } catch { return []; }
}

/** Insert or update (same id). Newest first, capped. Never mutates the input list. */
export function upsertWork(works, { id, type, model, now = new Date().toISOString() }) {
  const title = (model.meta && model.meta.title) || (model.hazard && model.hazard.text) || (model.subject && model.subject.text) || '';
  const item = { id, type, title, savedAt: now, model: JSON.parse(JSON.stringify(model)) };
  const rest = works.filter((w) => w.id !== id);
  return [item, ...rest].slice(0, MAX_WORKS);
}

export function removeWork(works, id) {
  return works.filter((w) => w.id !== id);
}

export function newId(now = Date.now(), rnd = Math.random()) {
  return 'w_' + now.toString(36) + rnd.toString(36).slice(2, 6);
}

// ---------- browser storage ----------
export function readWorks() {
  try { return parseWorks(localStorage.getItem(KEY)); } catch { return []; }
}
/** @returns {boolean} false when the browser refuses (private mode / quota). */
export function writeWorks(works) {
  try { localStorage.setItem(KEY, JSON.stringify(works)); return true; } catch { return false; }
}

// ---------- rendering ----------
const S = {
  th: {
    saveNow: 'บันทึกงานปัจจุบันลงคลัง', saveNew: 'บันทึกเป็นงานใหม่', myWork: 'งานของฉัน (เก็บในเบราว์เซอร์นี้)', examples: 'ตัวอย่างประกอบ',
    empty: 'ยังไม่มีงานที่บันทึก กด "บันทึกงานปัจจุบันลงคลัง" ด้านบน', open: 'เปิด', del: 'ลบ', confirmDel: 'ลบงานนี้ออกจากคลัง?',
    note: 'งานในคลังเก็บในเบราว์เซอร์นี้เท่านั้น ใช้ได้ทั้งออนไลน์และออฟไลน์ ถ้าล้างข้อมูลเบราว์เซอร์งานจะหาย จึงควรกด "บันทึก" ที่แถบบนเพื่อเก็บเป็นไฟล์สำรอง',
    savedOk: 'บันทึกแล้ว', savedFail: 'บันทึกไม่ได้ (พื้นที่เบราว์เซอร์เต็มหรือถูกปิดไว้) ให้ใช้ปุ่ม "บันทึก" เป็นไฟล์แทน', untitled: '(ไม่มีชื่อ)',
    types: { bowtie: 'Bowtie', swiss: 'Swiss cheese', shell: 'SHELL', hfacs: 'HFACS', stamp: 'STAMP / STPA', fram: 'FRAM', pyramid: 'Accident Pyramid' }, illustrative: 'ตัวอย่างประกอบ', loadFail: 'โหลดไม่ได้',
  },
  en: {
    saveNow: 'Save current work to gallery', saveNew: 'Save as a new work', myWork: 'My work (stored in this browser)', examples: 'Examples',
    empty: 'Nothing saved yet. Press "Save current work to gallery" above.', open: 'Open', del: 'Delete', confirmDel: 'Remove this work from the gallery?',
    note: 'Gallery work is stored in this browser only, online or offline. Clearing browser data erases it, so also use "Save" in the top bar to keep a file copy.',
    savedOk: 'Saved', savedFail: 'Could not save (browser storage full or blocked). Use the "Save" button to download a file instead.', untitled: '(untitled)',
    types: { bowtie: 'Bowtie', swiss: 'Swiss cheese', shell: 'SHELL', hfacs: 'HFACS', stamp: 'STAMP / STPA', fram: 'FRAM', pyramid: 'Accident Pyramid' }, illustrative: 'illustrative example', loadFail: 'Could not load',
  },
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const exampleCache = new Map();
async function loadExample(file) {
  if (!exampleCache.has(file)) exampleCache.set(file, fetch(file).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }));
  return exampleCache.get(file);
}

function card(L, { type, title, sub, thumb, onOpen, onDelete }) {
  const c = el('li', 'gal-card');
  const img = el('img', 'gal-thumb');
  img.alt = '';
  img.loading = 'lazy';
  if (thumb) thumb().then((src) => { if (src) img.src = src; else img.classList.add('gal-nothumb'); }).catch(() => img.classList.add('gal-nothumb'));
  c.appendChild(img);
  const body = el('div', 'gal-body');
  body.appendChild(el('strong', null, title || L.untitled));
  body.appendChild(el('span', 'muted', [L.types[type], sub].filter(Boolean).join(' · ')));
  const row = el('div', 'gal-actions');
  const o = el('button', null, L.open);
  o.type = 'button';
  o.addEventListener('click', onOpen);
  row.appendChild(o);
  if (onDelete) {
    const d = el('button', null, L.del);
    d.type = 'button';
    d.addEventListener('click', onDelete);
    row.appendChild(d);
  }
  body.appendChild(row);
  c.appendChild(body);
  return c;
}

/**
 * ctx: { lang, currentType, currentId (gallery id of the open work or null), thumbSvg(type, model) -> string,
 *        openModel(model, workId|null), saveCurrent(asNew) -> id|null (null = storage refused), onChange() }
 */
export function drawGallery(host, ctx) {
  const L = S[ctx.lang] || S.th;
  host.textContent = '';
  const msg = el('p', 'muted gal-msg');
  msg.setAttribute('role', 'status');

  const save = el('button', 'primary', L.saveNow);
  save.type = 'button';
  save.addEventListener('click', () => { const id = ctx.saveCurrent(false); if (id) ctx.onChange(); else msg.textContent = L.savedFail; });
  host.appendChild(save);
  if (ctx.currentId) {
    const nw = el('button', null, L.saveNew);
    nw.type = 'button';
    nw.addEventListener('click', () => { const id = ctx.saveCurrent(true); if (id) ctx.onChange(); else msg.textContent = L.savedFail; });
    host.appendChild(nw);
  }
  host.appendChild(msg);

  const works = readWorks();
  host.appendChild(el('h3', null, L.myWork));
  if (!works.length) host.appendChild(el('p', 'muted', L.empty));
  else {
    const ul = el('ul', 'gal-list');
    works.forEach((w) => ul.appendChild(card(L, {
      type: w.type, title: w.title, sub: w.savedAt ? w.savedAt.slice(0, 10) : '',
      thumb: async () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ctx.thumbSvg(w.type, w.model)),
      onOpen: () => ctx.openModel(JSON.parse(JSON.stringify(w.model)), w.id),
      onDelete: () => { if (confirm(L.confirmDel)) { writeWorks(removeWork(readWorks(), w.id)); ctx.onChange(); } },
    })));
    host.appendChild(ul);
  }

  host.appendChild(el('h3', null, L.examples));
  const ul2 = el('ul', 'gal-list');
  EXAMPLES.forEach((ex) => {
    ul2.appendChild(card(L, {
      type: ex.type, title: L.types[ex.type], sub: L.illustrative,
      thumb: async () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ctx.thumbSvg(ex.type, await loadExample(ex.file))),
      onOpen: async () => { try { ctx.openModel(JSON.parse(JSON.stringify(await loadExample(ex.file))), null); } catch { msg.textContent = L.loadFail; } },
    }));
  });
  host.appendChild(ul2);
  host.appendChild(el('p', 'muted', L.note));
}
