// Safetytool — "Report" tab (bowtie): choose sections, preview, print/save PDF, download standalone HTML.
// All content comes from js/report.js.

import { buildReport, standaloneHtml, SECTIONS, REPORT_CSS } from './report.js';

const S = {
  th: { title: 'รายงาน', note: 'เลือกหัวข้อที่จะใส่ในรายงาน ดูตัวอย่างด้านล่าง แล้วพิมพ์/บันทึกเป็น PDF หรือดาวน์โหลดเป็นไฟล์ HTML ที่เปิดได้โดยไม่ต้องใช้โปรแกรมนี้',
    sec: { summary: 'สรุปภาพรวม', diagram: 'แผนภาพ', paths: 'ผลรายเส้นทาง', barriers: 'ทะเบียน Barrier', erc: 'ERC', evidence: 'หลักฐานและสมมติฐาน', compare: 'เปรียบเทียบกับ Baseline', limits: 'ข้อจำกัดของโมเดล' },
    print: 'พิมพ์ / บันทึกเป็น PDF', html: 'ดาวน์โหลด HTML', noBase: '(ยังไม่ได้ปัก Baseline ในแท็บ Compare)' },
  en: { title: 'Report', note: 'Pick the sections, check the preview, then print / save as PDF or download a standalone HTML file that opens without this tool.',
    sec: { summary: 'Summary', diagram: 'Diagram', paths: 'Paths', barriers: 'Barrier register', erc: 'ERC', evidence: 'Evidence and assumptions', compare: 'Comparison with baseline', limits: 'Model limitations' },
    print: 'Print / save as PDF', html: 'Download HTML', noBase: '(no baseline pinned in the Compare tab)' },
};

let ercFile = null;
let ercTried = false;
const chosen = new Set(SECTIONS.filter((s) => s !== 'compare'));

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

/** ctx: { lang, baseline, svg() -> string, download(name, blob), fileBase() } */
export function drawReport(host, m, ctx) {
  const L = S[ctx.lang] || S.th;
  if (!ercTried) {
    ercTried = true;
    fetch('data/erc-matrix.json').then((r) => (r.ok ? r.json() : null)).then((j) => { ercFile = j; if (j && host.isConnected) drawReport(host, m, ctx); }).catch(() => {});
  }
  host.textContent = '';
  host.appendChild(el('h2', 'sim-title', L.title));
  host.appendChild(el('p', 'muted', L.note));

  const box = el('div', 'rpt-sections');
  SECTIONS.forEach((k) => {
    const lab = el('label', 'chk');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = chosen.has(k);
    if (k === 'compare' && !ctx.baseline) cb.disabled = true;
    cb.addEventListener('change', () => { cb.checked ? chosen.add(k) : chosen.delete(k); drawReport(host, m, ctx); });
    lab.append(cb, el('span', null, ' ' + L.sec[k] + (k === 'compare' && !ctx.baseline ? ' ' + L.noBase : '')));
    box.appendChild(lab);
  });
  host.appendChild(box);

  const opts = () => ({ lang: ctx.lang, sections: SECTIONS.filter((s) => chosen.has(s)), svg: ctx.svg(), baseline: ctx.baseline ? ctx.baseline.model : null, ercFile });
  const bar = el('div', 'sim-bar');
  const pr = el('button', 'primary', L.print); pr.type = 'button';
  pr.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.srcdoc = standaloneHtml(m, opts());
    f.onload = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); };
    document.body.appendChild(f);
  });
  const dl = el('button', null, L.html); dl.type = 'button';
  dl.addEventListener('click', () => ctx.download(ctx.fileBase() + '.report.html', new Blob([standaloneHtml(m, opts())], { type: 'text/html;charset=utf-8' })));
  bar.append(pr, dl);
  host.appendChild(bar);

  const style = el('style'); style.textContent = REPORT_CSS;
  const prev = el('div', 'rpt-preview');
  prev.innerHTML = buildReport(m, opts()); // content is escaped inside buildReport; svg comes from our own renderer
  host.append(style, prev);
}
