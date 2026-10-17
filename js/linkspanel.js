// Safetytool — "Connections" panel: provenance, cross-model links, guided transformations and portable packages.
// It only calls the pure modules (interchange.js, transform.js) and the app's ctx; every button here performs a real operation.
//
// ctx: {
//   lang, current: { type, model }, selectedId, mutate(fn,{rebuild}),
//   workspace() -> [{ type, model }]        every model held in this browser session (one per type)
//   getLinks() / setLinks(links)            workspace links (browser-local)
//   ensureIdentities()                      gives every workspace model a stable id (persisted)
//   setModel(type, model, { saveOld })      put a model into its slot; saveOld first stores the previous one in the gallery
//   works()                                 gallery works (for finding earlier versions)
//   download(name, blob), flash(text), refresh()
// }

import * as IC from './interchange.js';
import * as TR from './transform.js';
import { buildSourcesEditor } from './forms-fp.js';

const S = {
  th: {
    title: 'เชื่อมโยงโมเดล', note: 'ลิงก์ระหว่างโมเดลไม่ได้ระบุว่าอะไรเป็นสาเหตุของอะไร และไม่ได้รวมโมเดลเข้าด้วยกัน โมเดลแต่ละอันยังเป็นของมันเอง',
    prov: 'ที่มาและหลักฐานของโมเดลนี้', modelId: 'รหัสโมเดล', revision: 'revision (นับเมื่อส่งออกแล้วเนื้อหาเปลี่ยน)', created: 'สร้างเมื่อ', updated: 'แก้ไขเมื่อ', author: 'ผู้จัดทำ', illustrative: 'ตัวอย่างประกอบ', yes: 'ใช่', no: 'ไม่ใช่', history: 'ประวัติการแปลง', noHistory: 'ไม่มี (โมเดลนี้ไม่ได้สร้างจากการแปลง)', fromModel: 'จากโมเดล', origin: 'การแยกแยะที่มา: ข้อเท็จจริงที่สังเกต (OBSERVED) ข้อมูลที่รายงาน การตีความของผู้วิเคราะห์ (ASSESSED/HYPOTHESISED) และข้อเสนอที่ระบบสร้าง (origin = generated) ถือเป็นคนละอย่าง ข้อเสนอที่ระบบสร้างไม่ใช่หลักฐาน',
    links: 'ลิงก์ข้ามโมเดล', noLinks: 'โมเดลนี้ยังไม่มีลิงก์', addLink: 'สร้างลิงก์', relation: 'ความสัมพันธ์', fromEntity: 'จาก (ในโมเดลนี้)', toModel: 'ไปยังโมเดล', toEntity: 'รายการปลายทาง', note2: 'หมายเหตุ', create: 'สร้างลิงก์', noOther: 'ยังไม่มีโมเดลอื่นให้ผูก (เปิดหรือสร้างโมเดลชนิดอื่นก่อน)', status: { proposed: 'เสนอ (ยังไม่ตรวจ)', confirmed: 'ยืนยันโดยผู้วิเคราะห์', rejected: 'ปฏิเสธ' }, del: 'ลบ', out: '→', inn: '←', broken: '(ปลายทางหาย)', goTo: 'ไปที่', brokenModel: 'ลิงก์เสีย: ไม่พบโมเดลปลายทางในเครื่องนี้', brokenEntity: 'ลิงก์เสีย: โมเดลยังอยู่ แต่ไม่พบรายการนี้แล้ว', brokenKeep: 'ลิงก์ยังเก็บไว้ ไม่ถูกแก้หรือลบเอง กด "ลบ" ถ้าไม่ต้องการ', selfModel: '(โมเดลนี้)',
    validate: 'ตรวจโมเดลที่เชื่อมโยงทั้งหมด', validateRun: 'ตรวจทั้งหมด', allOk: 'ทุกโมเดลและลิงก์ผ่านการตรวจโครงสร้าง', modelsChecked: 'โมเดลที่ตรวจ',
    derive: 'สร้างโมเดลต่อยอด (ตรวจตัวอย่างก่อนเสมอ)', none: 'ไม่มีการแปลงสำหรับโมเดลชนิดนี้', unsupported: 'ยังไม่รองรับ', decisions: 'การตัดสินใจที่ต้องเลือก', choose: '— เลือก —', preview: 'ดูตัวอย่างการแปลง', copied: 'คัดลอกโดยตรง', transformed: 'ถูกแปลง', notTransferred: 'ไม่สามารถถ่ายโอน', provenance2: 'ที่มาที่เก็บไว้', validation2: 'การตรวจสอบ', limitations: 'ข้อจำกัด',
    pDest: 'โมเดลปลายทาง (ยังไม่ได้สร้าง)', pMap: 'การจับคู่ที่เสนอ', pOmit: 'ข้อมูลที่ไม่ได้ถ่ายโอน', pWarn: 'คำเตือน', pValid: 'ผลการตรวจปลายทาง', pOk: 'ผ่านการตรวจโครงสร้าง', pNeed: 'ต้องยืนยันก่อนสร้าง', pReplace: 'โมเดล {type} ที่เปิดอยู่มีเนื้อหา: ระบบจะบันทึกไว้ในคลังงานก่อน แล้วจึงแทนที่ — ติ๊กเพื่อยืนยัน', createDest: 'สร้างโมเดลปลายทาง', created: 'สร้างโมเดลแล้ว (ลิงก์ที่เสนอทั้งหมดมีสถานะ "เสนอ")', cannot: 'ยังสร้างไม่ได้', map: { from: 'ต้นทาง', rel: 'ความสัมพันธ์', to: 'ปลายทาง' }, importHint: 'นำเข้าข้อมูลเหตุการณ์ (CSV) ได้ที่แท็บ "ฟอร์มกรอกข้อมูล" ของ Accident Pyramid',
    pkg: 'แพ็กเกจโมเดลที่เชื่อมโยง (ย้ายข้ามเครื่องได้)', pkgNote: 'ไฟล์ JSON ไฟล์เดียวรวมโมเดล ลิงก์ ที่มา และประวัติการแปล ไม่ต้องพึ่ง localStorage ของเครื่องต้นทาง', pkgExport: 'ส่งออกแพ็กเกจ', pkgSelect: 'โมเดลที่จะใส่ในแพ็กเกจ', pkgNoModels: 'ไม่มีโมเดลที่มีเนื้อหา', pkgDone: 'ส่งออกแล้ว', pkgImport: 'นำเข้าแพ็กเกจ', pkgPreview: 'ตัวอย่างการนำเข้า (ยังไม่เปลี่ยนอะไร)', pkgErr: 'ข้อผิดพลาด', pkgWarn: 'คำเตือน', pkgMembers: 'โมเดลในแพ็กเกจ', pkgLinks: 'ลิงก์', pkgUsable: 'ใช้ได้', pkgBroken: 'ใช้ไม่ได้ (จะไม่ถูกนำเข้า)', pkgConflict: 'ขัดแย้งกับโมเดลที่มีอยู่ — ต้องเลือกเอง', pkgApply: 'นำเข้าตามที่เลือก', pkgApplied: 'นำเข้าแล้ว', pkgSkipped: 'ข้าม', pkgTooBig: 'ไฟล์ใหญ่เกินไป', pkgBadJson: 'อ่านไฟล์ไม่ได้ (ไม่ใช่ JSON)',
    st: { new: 'ใหม่', identical: 'เหมือนเดิม', conflict: 'ขัดแย้ง', invalid: 'ไม่ผ่าน', unsupported: 'ไม่รองรับ' }, resolve: { '': '— เลือกวิธีจัดการ —', 'keep-existing': 'เก็บของเดิม (ไม่นำเข้า)', 'import-as-copy': 'นำเข้าเป็นสำเนา (รหัสใหม่)', replace: 'แทนที่ของเดิม (บันทึกของเดิมในคลังก่อน)' },
  },
  en: {
    title: 'Connections', note: 'Links between models do not say what causes what, and they do not merge models. Each model stays its own.',
    prov: 'Provenance and evidence of this model', modelId: 'Model id', revision: 'Revision (counts exports whose content changed)', created: 'Created', updated: 'Modified', author: 'Author', illustrative: 'Illustrative', yes: 'yes', no: 'no', history: 'Transformation history', noHistory: 'None (this model was not made by a transformation)', fromModel: 'from model', origin: 'Origins are kept apart: observed facts (OBSERVED), reported information, analyst interpretation (ASSESSED / HYPOTHESISED) and tool-generated suggestions (origin = generated). A generated suggestion is not evidence.',
    links: 'Cross-model links', noLinks: 'No links for this model yet', addLink: 'Create a link', relation: 'Relation', fromEntity: 'From (in this model)', toModel: 'To model', toEntity: 'Target entity', note2: 'Note', create: 'Create link', noOther: 'No other model to link to (open or create a model of another type first)', status: { proposed: 'proposed (not reviewed)', confirmed: 'confirmed by analyst', rejected: 'rejected' }, del: 'Delete', out: '→', inn: '←', broken: '(endpoint missing)', goTo: 'Go to', brokenModel: 'Broken link: the target model is not in this browser', brokenEntity: 'Broken link: the model is there but this item no longer exists', brokenKeep: 'The link is kept, not changed or removed automatically. Press "Delete" if you do not want it.', selfModel: '(this model)',
    validate: 'Validate all linked models', validateRun: 'Validate all', allOk: 'Every model and link passed the structural checks', modelsChecked: 'Models checked',
    derive: 'Create a derived model (always preview first)', none: 'No transformation for this model type', unsupported: 'Not supported', decisions: 'Decisions needed', choose: '— choose —', preview: 'Preview transformation', copied: 'Copied directly', transformed: 'Transformed', notTransferred: 'Cannot be transferred', provenance2: 'Provenance kept', validation2: 'Validation', limitations: 'Limitations',
    pDest: 'Destination model (not created yet)', pMap: 'Proposed mappings', pOmit: 'Information not transferred', pWarn: 'Warnings', pValid: 'Destination validation', pOk: 'passed the structural checks', pNeed: 'Confirm before creating', pReplace: 'The open {type} model has content: it will be saved to the gallery first, then replaced — tick to confirm', createDest: 'Create the destination model', created: 'Model created (every proposed link has status "proposed")', cannot: 'Cannot create yet', map: { from: 'Source', rel: 'Relation', to: 'Destination' }, importHint: 'Import event data (CSV) in the "Data entry form" tab of the Accident Pyramid',
    pkg: 'Linked-model package (portable between computers)', pkgNote: 'One JSON file holding the models, links, provenance and transformation history. It does not depend on the original browser’s localStorage.', pkgExport: 'Export package', pkgSelect: 'Models to include', pkgNoModels: 'No model has content yet', pkgDone: 'Exported', pkgImport: 'Import a package', pkgPreview: 'Import preview (nothing has changed yet)', pkgErr: 'Errors', pkgWarn: 'Warnings', pkgMembers: 'Models in the package', pkgLinks: 'Links', pkgUsable: 'usable', pkgBroken: 'unusable (will not be imported)', pkgConflict: 'Conflicts with an existing model — you must choose', pkgApply: 'Import as chosen', pkgApplied: 'Imported', pkgSkipped: 'skipped', pkgTooBig: 'File too large', pkgBadJson: 'Cannot read the file (not JSON)',
    st: { new: 'new', identical: 'identical', conflict: 'conflict', invalid: 'invalid', unsupported: 'unsupported' }, resolve: { '': '— choose how to handle —', 'keep-existing': 'Keep existing (do not import)', 'import-as-copy': 'Import as a copy (new id)', replace: 'Replace existing (existing is saved to the gallery first)' },
  },
};
const MAX_BYTES = 20 * 1024 * 1024;

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, fn, cls) { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
const short = (s, n = 44) => { const x = (s || '').trim(); return x ? (x.length > n ? x.slice(0, n) + '…' : x) : '—'; };
function sel(options, value, onChange, label) {
  const s = el('select', 'guide-input'); if (label) s.setAttribute('aria-label', label);
  options.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; s.appendChild(o); });
  s.value = value == null ? '' : value; s.addEventListener('change', () => onChange(s.value)); return s;
}
function details(title, open) { const d = el('details', 'conn-sec'); if (open) d.open = true; d.appendChild(el('summary', null, title)); return d; }
function list(items, cls = 'sim-list') { const ul = el('ul', cls); items.forEach((x) => ul.appendChild(el('li', null, x))); return ul; }
const bi = (x, lang) => (x ? x[lang] || x.en : '');
const entityOptions = (m) => IC.entitiesOf(m).map((e) => [e.id, `${e.type}${e.native && e.native !== e.type ? ' (' + e.native + ')' : ''} · ${short(e.label)} · ${e.id.slice(0, 10)}`]);

export function drawConnections(host, ctx) {
  const L = S[ctx.lang] || S.th;
  host.textContent = '';
  host.appendChild(el('h3', null, L.title));
  host.appendChild(el('p', 'muted small', L.note));
  const cur = ctx.current.model; const type = ctx.current.type;
  IC.ensureIdentity(cur);
  const ws = () => ctx.workspace();
  const modelsMap = () => new Map(ws().map((w) => [w.model.meta.modelId, w.model]));
  // one end of a link: what it is in its own model (type, native kind, label) and a "Go to" button when it can be reached
  const endNode = (ref, res) => {
    const w = el('span', 'conn-end');
    if (!res.ok) { w.appendChild(el('span', 'warn-note', `${L.broken}${res.modelType ? ' · ' + res.modelType : ''} · ${String(ref && ref.entityId).slice(0, 12)}`)); return w; }
    const kind = res.native && res.native !== res.entityType ? `${res.entityType} (${res.native})` : res.entityType;
    w.appendChild(el('span', null, `${res.modelType}${res.modelTitle ? ' “' + short(res.modelTitle, 18) + '”' : ''} · ${kind} · ${short(res.label, 34)}`));
    const go = btn(L.goTo, () => { if (ctx.goTo) ctx.goTo(ref); }, 'mini'); go.setAttribute('aria-label', `${L.goTo}: ${short(res.label, 40)}`); w.appendChild(go);
    return w;
  };

  // ---------------------------------------------------------------- 1. provenance
  const dp = details(L.prov, false);
  const info = IC.inspectModel(cur, ctx.getLinks());
  const rows = [[L.modelId, info.modelId], [L.revision, String(info.revision)], ['schema', info.schema], [L.created, info.createdAt || '—'], [L.updated, info.updatedAt || '—'], [L.author, info.author || '—'], [L.illustrative, info.illustrative ? L.yes : L.no]];
  const t0 = el('table', 'sim-table'); const b0 = t0.createTBody();
  rows.forEach(([k, v]) => { const r = b0.insertRow(); r.insertCell().textContent = k; r.insertCell().textContent = v; });
  dp.appendChild(t0);
  dp.appendChild(el('h4', null, L.history));
  const hist = (cur.meta && cur.meta.transformations) || [];
  if (!hist.length) dp.appendChild(el('p', 'muted', L.noHistory));
  else dp.appendChild(list(hist.map((h) => `${h.transformId}@${h.version} · ${h.at || ''} · ${L.fromModel} ${(h.from && (h.from.modelId || h.from.file)) || '?'}${h.summary ? ' — ' + h.summary : ''}`)));
  dp.appendChild(el('p', 'muted small', L.origin));
  const holder = el('div', 'conn-form'); dp.appendChild(holder);
  buildSourcesEditor(holder, cur, { mutate: ctx.mutate, lang: ctx.lang, confirmDelete: ctx.confirmDelete });
  host.appendChild(dp);

  // ---------------------------------------------------------------- 2. links
  const dl = details(L.links, true);
  const mine = ctx.getLinks().filter((l) => l.from.modelId === cur.meta.modelId || l.to.modelId === cur.meta.modelId);
  if (!mine.length) dl.appendChild(el('p', 'muted', L.noLinks));
  mine.forEach((l) => {
    const outgoing = l.from.modelId === cur.meta.modelId;
    const h = IC.linkHealth(l, modelsMap());   // derived from the workspace right now; never stored on the link
    const row = el('div', 'conn-row' + (h.state === 'ok' ? '' : ' conn-broken'));
    row.appendChild(el('span', 'conn-rel', l.relation));
    row.appendChild(endNode(l.from, h.from));
    row.appendChild(el('span', null, outgoing ? L.out : L.inn));
    row.appendChild(endNode(l.to, h.to));
    row.appendChild(sel(IC.LINK_STATUS.map((s) => [s, L.status[s]]), l.status, (v) => { ctx.setLinks(ctx.getLinks().map((x) => (x.id === l.id ? { ...x, status: v } : x))); ctx.refresh(); }, L.status.confirmed));
    row.appendChild(btn(L.del, () => { ctx.setLinks(ctx.getLinks().filter((x) => x.id !== l.id)); ctx.refresh(); }, 'mini danger'));
    row.title = IC.RELATIONS[l.relation] ? IC.RELATIONS[l.relation][ctx.lang] : '';
    if (l.note) row.appendChild(el('span', 'muted small', ' — ' + l.note));
    if (l.by === 'transformation') row.appendChild(el('span', 'muted small', ' [' + l.via + ']'));
    if (h.state !== 'ok') row.appendChild(el('p', 'warn-note conn-why', '▲ ' + (h.state === 'broken-model' ? L.brokenModel : L.brokenEntity) + ' ' + L.brokenKeep + ' [' + h.codes.join(', ') + ']'));
    dl.appendChild(row);
  });
  const others = ws().filter((w) => w.model !== cur && !IC.isBlank(w.model));
  dl.appendChild(el('h4', null, L.addLink));
  if (!others.length) dl.appendChild(el('p', 'muted', L.noOther));
  else {
    const f = { rel: 'related_to', from: (ctx.selectedId && IC.hasEntity(cur, ctx.selectedId) ? ctx.selectedId : (IC.entitiesOf(cur)[0] || {}).id), toType: others[0].type, to: '', note: '' };
    const toModel = () => others.find((o) => o.type === f.toType).model;
    const relHelp = el('p', 'muted small', IC.RELATIONS[f.rel][ctx.lang]);
    const form = el('div', 'conn-form');
    form.appendChild(el('label', 'fld')).append(el('span', null, L.relation), sel(IC.RELATION_IDS.map((r) => [r, r]), f.rel, (v) => { f.rel = v; relHelp.textContent = IC.RELATIONS[v][ctx.lang]; }, L.relation));
    form.appendChild(relHelp);
    form.appendChild(el('label', 'fld')).append(el('span', null, L.fromEntity), sel(entityOptions(cur), f.from, (v) => { f.from = v; }, L.fromEntity));
    const toWrap = el('label', 'fld'); const toSel = el('span');
    const drawTo = () => { toSel.textContent = ''; const opts = entityOptions(toModel()); f.to = opts[0] ? opts[0][0] : ''; toSel.appendChild(sel(opts, f.to, (v) => { f.to = v; }, L.toEntity)); };
    form.appendChild(el('label', 'fld')).append(el('span', null, L.toModel), sel(others.map((o) => [o.type, `${o.type}: ${short(o.model.meta.title || '(untitled)', 30)}`]), f.toType, (v) => { f.toType = v; drawTo(); }, L.toModel));
    toWrap.append(el('span', null, L.toEntity), toSel); form.appendChild(toWrap); drawTo();
    const note = el('input'); note.type = 'text'; note.setAttribute('aria-label', L.note2); note.placeholder = L.note2; note.addEventListener('change', () => { f.note = note.value; });
    form.appendChild(note);
    form.appendChild(btn(L.create, () => {
      if (!f.from || !f.to) return;
      const link = IC.newLink({ modelId: cur.meta.modelId, entityId: f.from }, { modelId: toModel().meta.modelId, entityId: f.to }, f.rel, { status: 'confirmed', note: f.note, by: 'analyst' });
      const issues = IC.checkLinks([link], modelsMap()).filter((i) => i.severity === 'error');
      if (issues.length) { ctx.flash(issues[0].message); return; }
      ctx.setLinks([...ctx.getLinks(), link]); ctx.refresh();
    }, 'primary'));
    dl.appendChild(form);
  }
  dl.appendChild(el('h4', null, L.validate));
  const vOut = el('div', 'muted');
  dl.appendChild(btn(L.validateRun, () => {
    vOut.textContent = '';
    const msgs = [];
    ws().forEach((w) => { const a = IC.adapterOf(w.model); const errs = a.validate(w.model); if (errs.length) msgs.push(`${w.type}: ${errs.slice(0, 3).join('; ')}`); });
    IC.checkLinks(ctx.getLinks(), modelsMap()).filter((i) => i.severity === 'error').forEach((i) => msgs.push(`link ${i.linkId}: ${i.message}`));
    vOut.appendChild(el('p', null, `${L.modelsChecked}: ${ws().length}`));
    if (!msgs.length) vOut.appendChild(el('p', 'ok-note', '■ ' + L.allOk)); else vOut.appendChild(list(msgs));
  }));
  dl.appendChild(vOut);
  host.appendChild(dl);

  // ---------------------------------------------------------------- 3. transformations
  const dd = details(L.derive, false);
  const ts = TR.transformsFrom(type);
  if (type === 'pyramid') dd.appendChild(el('p', 'muted', L.importHint));
  if (!ts.length && type !== 'pyramid') dd.appendChild(el('p', 'muted', L.none));
  ts.forEach((tr) => {
    const box = el('div', 'conn-box');
    box.appendChild(el('h4', null, bi(tr.title, ctx.lang) + (tr.supported ? '' : ' — ' + L.unsupported)));
    if (!tr.supported) { box.appendChild(el('p', null, bi(tr.unsupportedReason, ctx.lang))); dd.appendChild(box); return; }
    const docs = el('div', 'muted small');
    [['copied', L.copied], ['transformed', L.transformed], ['notTransferred', L.notTransferred], ['provenance', L.provenance2], ['validation', L.validation2], ['limitations', L.limitations]].forEach(([k, lab]) => {
      if (!tr.docs[k] || !tr.docs[k].length) return;
      docs.appendChild(el('strong', null, lab + ': ')); docs.appendChild(document.createTextNode(tr.docs[k].map((x) => bi(x, ctx.lang)).join(' · '))); docs.appendChild(el('br'));
    });
    box.appendChild(docs);
    const dec = {};
    tr.decisions.forEach((d) => {
      const opts = [['', L.choose], ...IC.entitiesOf(cur).filter((e) => e.type === d.entityType).map((e) => [e.id, short(e.label, 50)])];
      const lab = el('label', 'fld'); lab.append(el('span', null, bi(d.label, ctx.lang) + (d.required ? ' *' : '')), sel(opts, '', (v) => { dec[d.id] = v || undefined; }, bi(d.label, ctx.lang))); box.appendChild(lab);
    });
    const out = el('div'); box.appendChild(out);
    box.appendChild(btn(L.preview, () => {
      out.textContent = '';
      IC.ensureIdentity(cur);
      const p = TR.previewTransform(tr.id, cur, dec);
      if (!p.ok && !p.destination) { out.appendChild(list(p.decisionErrors.map((e) => bi(e, ctx.lang)))); return; }
      out.appendChild(el('h4', null, `${L.pDest}: ${p.destType} — ${short(p.destination.meta.title, 70)}`));
      if (p.mappings.length) {
        out.appendChild(el('h4', null, `${L.pMap} (${p.mappings.length})`));
        const t = el('table', 'sim-table'); const h = t.createTHead().insertRow(); [L.map.from, L.map.rel, L.map.to].forEach((x) => h.appendChild(el('th', null, x)));
        const tb = t.createTBody();
        p.mappings.slice(0, 80).forEach((m) => { const r = tb.insertRow(); r.insertCell().textContent = `${m.from.type}: ${short(m.from.label, 40)}`; r.insertCell().textContent = m.relation; r.insertCell().textContent = short(m.to.label, 40); });
        out.appendChild(t);
        if (p.mappings.length > 80) out.appendChild(el('p', 'muted small', `… +${p.mappings.length - 80}`));
      }
      out.appendChild(el('h4', null, L.pOmit)); out.appendChild(list(p.omitted.map((o) => bi(o.what, ctx.lang))));
      if (p.warnings.length) { out.appendChild(el('h4', null, L.pWarn)); out.appendChild(list(p.warnings.map((w) => bi(w, ctx.lang)))); }
      out.appendChild(el('h4', null, L.pValid));
      if (!p.validation.errors.length) out.appendChild(el('p', 'ok-note', '■ ' + L.pOk)); else out.appendChild(list(p.validation.errors));
      const ticks = new Map();
      const create = btn(L.createDest, async () => {
        const r = await TR.applyTransform(p, [...ticks.entries()].filter(([, v]) => v).map(([k]) => k), { decisions: dec, sourceHash: await IC.contentHash(cur) });
        if (!r.ok) { ctx.flash(L.cannot + ': ' + r.errors.join('; ')); return; }
        if (ctx.applyDerived(r, p.destType)) ctx.flash(L.created);
      }, 'primary');
      const gate = () => { const allTicked = p.needsConfirmation.every((c) => ticks.get(c.id)) && (!existing || ticks.get('__replace')); create.disabled = !(p.ok && allTicked); };
      const existing = ws().some((w) => w.type === p.destType && !IC.isBlank(w.model));
      if (p.needsConfirmation.length || existing) out.appendChild(el('h4', null, L.pNeed));
      p.needsConfirmation.forEach((c) => {
        const l = el('label', 'fld chk'); const k = el('input'); k.type = 'checkbox'; k.addEventListener('change', () => { ticks.set(c.id, k.checked); gate(); });
        l.append(k, el('span', null, bi(c.text, ctx.lang))); out.appendChild(l);
      });
      if (existing) { const l = el('label', 'fld chk'); const k = el('input'); k.type = 'checkbox'; k.addEventListener('change', () => { ticks.set('__replace', k.checked); gate(); }); l.append(k, el('span', null, L.pReplace.replace('{type}', p.destType))); out.appendChild(l); }
      out.appendChild(create); gate();
    }));
    dd.appendChild(box);
  });
  host.appendChild(dd);

  // ---------------------------------------------------------------- 4. packages
  const dk = details(L.pkg, false);
  dk.appendChild(el('p', 'muted small', L.pkgNote));
  const exportable = ws().filter((w) => !IC.isBlank(w.model));
  dk.appendChild(el('h4', null, L.pkgSelect));
  const pick = new Map(exportable.map((w) => [w.type, true]));
  if (!exportable.length) dk.appendChild(el('p', 'muted', L.pkgNoModels));
  exportable.forEach((w) => { const l = el('label', 'fld chk'); const k = el('input'); k.type = 'checkbox'; k.checked = true; k.addEventListener('change', () => pick.set(w.type, k.checked)); l.append(k, el('span', null, `${w.type}: ${short(w.model.meta.title || '(untitled)', 50)}`)); dk.appendChild(l); });
  const eOut = el('div', 'muted');
  dk.appendChild(btn(L.pkgExport, async () => {
    eOut.textContent = '';
    ctx.ensureIdentities();
    const chosen = exportable.filter((w) => pick.get(w.type));
    if (!chosen.length) return;
    for (const w of chosen) await IC.stampExport(w.model);
    ctx.persistAll();
    const ids = new Set(chosen.map((w) => w.model.meta.modelId));
    const links = ctx.getLinks().filter((l) => ids.has(l.from.modelId) && ids.has(l.to.modelId));
    const pkg = await IC.buildPackage(chosen.map((w) => ({ model: w.model })), { links });
    ctx.download(`safetytool-package-${new Date().toISOString().slice(0, 10)}.stpkg.json`, new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' }));
    eOut.appendChild(el('p', pkg.validation.ok ? 'ok-note' : 'warn-note', `${pkg.validation.ok ? '■' : '▲'} ${L.pkgDone}: ${pkg.members.length} / ${L.pkgLinks} ${pkg.links.length}${pkg.validation.ok ? '' : ' — validation: ' + JSON.stringify(pkg.validation.memberErrors) + ' links:' + pkg.validation.linkIssues}`));
  }));
  dk.appendChild(eOut);
  dk.appendChild(el('h4', null, L.pkgImport));
  const file = el('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.setAttribute('aria-label', L.pkgImport);
  const iOut = el('div');
  file.addEventListener('change', async () => {
    iOut.textContent = '';
    const f = file.files[0]; file.value = '';
    if (!f) return;
    if (f.size > MAX_BYTES) { iOut.appendChild(el('p', 'warn-note', L.pkgTooBig)); return; }
    let pkg;
    try { pkg = JSON.parse(await f.text()); } catch { iOut.appendChild(el('p', 'warn-note', L.pkgBadJson)); return; }
    ctx.ensureIdentities();
    const existing = await Promise.all(ws().map(async (w) => ({ modelId: w.model.meta.modelId, type: w.type, revision: w.model.meta.revision || 1, hash: await IC.contentHash(w.model), title: w.model.meta.title || '' })));
    const pre = await IC.validatePackage(pkg, existing);
    iOut.appendChild(el('h4', null, L.pkgPreview));
    if (pre.errors.length) { iOut.appendChild(el('strong', null, L.pkgErr)); iOut.appendChild(list(pre.errors)); }
    if (pre.warnings.length) { iOut.appendChild(el('strong', null, L.pkgWarn)); iOut.appendChild(list(pre.warnings)); }
    if (pre.members.length) {
      iOut.appendChild(el('strong', null, L.pkgMembers));
      iOut.appendChild(list(pre.members.map((m) => `${m.type || '?'} · ${short(m.title || m.path, 40)} — ${L.st[m.status] || m.status}${m.issues && m.issues.length ? ' (' + m.issues.join('; ') + ')' : ''}`)));
    }
    const usable = pre.links.filter((x) => x.usable).length;
    iOut.appendChild(el('p', null, `${L.pkgLinks}: ${usable} ${L.pkgUsable}, ${pre.links.length - usable} ${L.pkgBroken}`));
    const res = {};
    if (pre.conflicts.length) iOut.appendChild(el('p', 'warn-note', '▲ ' + L.pkgConflict));
    pre.conflicts.forEach((c) => {
      const row = el('label', 'fld'); row.append(el('span', null, `${c.type}: ${short(c.incoming.title || c.path, 40)} (rev ${c.existing.revision} → ${c.incoming.revision})`), sel(Object.entries(L.resolve), '', (v) => { res[c.modelId] = v; }, L.pkgConflict)); iOut.appendChild(row);
    });
    if (pre.ok) iOut.appendChild(btn(L.pkgApply, () => {
      const plan = IC.planImport(pkg, pre, res, { existingIds: ws().map((w) => w.model.meta.modelId) });
      if (ctx.applyImport(plan)) ctx.flash(`${L.pkgApplied}: ${plan.actions.length} · ${L.pkgSkipped}: ${plan.skipped.length} · ${L.pkgLinks}: ${plan.links.length}`);
    }, 'primary'));
  });
  dk.append(file, iOut);
  host.appendChild(dk);
}
