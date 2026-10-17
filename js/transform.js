// Safetytool — guided transformations between models. Pure: no DOM, no storage.
//
// A transformation never edits an existing model. previewTransform() builds a CANDIDATE destination model plus the list of what
// was copied, what could not be transferred, what needs the analyst's confirmation and the links that would be recorded.
// applyTransform() refuses to run until validation passes and every confirmation was given; it still only RETURNS the new model
// (the caller decides where it goes and must not overwrite anything silently).
//
// Rules for every mapping here:
//  * text is copied verbatim; nothing is invented to make the destination look complete;
//  * generated content is marked prov.origin = "generated", prov.reviewed = false (or a link with status "proposed");
//  * a candidate mapping is never turned into a confirmed hazard, cause, constraint or HFACS category;
//  * destination fields that need a human decision stay EMPTY and are named in needsConfirmation.
// Full mapping table: docs/TRANSFORMS.md.

import * as M from './model.js';
import * as SW from './swiss.js';
import * as HF from './hfacs.js';
import * as ST from './stamp.js';
import * as FR from './fram.js';
import { ensureIdentity, rid, newLink, entitiesOf, adapterOf } from './interchange.js';

const B = (en, th) => ({ en, th });
const clone = (x) => JSON.parse(JSON.stringify(x));
const labelOf = (m, id) => { const e = entitiesOf(m).find((x) => x.id === id); return e ? e.label : ''; };
const typeOf = (m, id) => { const e = entitiesOf(m).find((x) => x.id === id); return e ? e.type : 'item'; };

export const TRANSFORMS = [
  {
    id: 'bowtie-to-swiss', version: '1', from: 'bowtie', to: 'swiss', supported: true,
    title: B('Bowtie route → Swiss cheese view', 'เส้นทางใน Bowtie → มุมมอง Swiss cheese'),
    decisions: [
      { id: 'threatId', required: true, kind: 'entity', entityType: 'threat', label: B('Threat (route to follow)', 'Threat (เส้นทางที่จะดู)') },
      { id: 'consequenceId', required: false, kind: 'entity', entityType: 'consequence', label: B('Consequence (optional; adds its recovery controls)', 'Consequence (ไม่บังคับ; เพิ่ม control ฝั่งแก้ไข)') },
    ],
    docs: {
      copied: [B('Hazard text; control texts become layer names and defences; escalation factors become latent holes', 'ข้อความ Hazard; ข้อความ control เป็นชื่อและ defence ของชั้น; escalation factor เป็นรู latent'), B('Loss text = the chosen consequence, or the top event if none is chosen', 'Loss = consequence ที่เลือก หรือ top event ถ้าไม่เลือก')],
      transformed: [B('Each control becomes one defence layer (layer.controlId keeps the origin); each escalation factor one hole (hole.escalationId)', 'control หนึ่งตัวเป็นชั้นป้องกันหนึ่งชั้น; escalation factor หนึ่งข้อเป็นหนึ่งรู')],
      notTransferred: [B('Other threats and routes, control state, adequacy, reliability, owner, evidence and assurance, ERC and ADREP data', 'Threat/เส้นทางอื่น สถานะ control ความเพียงพอ ความน่าเชื่อถือ ผู้รับผิดชอบ หลักฐาน และข้อมูล ERC/ADREP')],
      provenance: [B('Layers and holes link back to the bowtie control/escalation with relation derived_from; the destination records this transformation', 'ชั้นและรูเชื่อมกลับไปยัง control/escalation ด้วย derived_from และบันทึกการแปลง')],
      validation: [B('Destination is checked with the Swiss cheese validator', 'ตรวจปลายทางด้วย validator ของ Swiss cheese')],
      limitations: [B('This is the existing bowtie → Swiss behaviour, unchanged. The trajectory is left empty on purpose: only the analyst may say which holes lined up.', 'เป็นพฤติกรรมเดิมของระบบ ไม่ได้เปลี่ยน เส้นทาง (trajectory) ถูกปล่อยว่างโดยตั้งใจ: ผู้วิเคราะห์เท่านั้นที่ระบุว่ารูใดเรียงตัว')],
    },
  },
  {
    id: 'bowtie-to-stamp', version: '1', from: 'bowtie', to: 'stamp', supported: true,
    title: B('Bowtie → proposed STPA starting points', 'Bowtie → จุดเริ่มต้นที่เสนอสำหรับ STPA'),
    decisions: [],
    docs: {
      copied: [B('Consequence texts → proposed losses; top-event text → one proposed hazard', 'ข้อความ consequence → loss ที่เสนอ; ข้อความ top event → hazard ที่เสนอ 1 ข้อ')],
      transformed: [B('The proposed hazard is linked to all proposed losses because the bowtie says the consequences follow the top event', 'hazard ที่เสนอถูกผูกกับ loss ทั้งหมด เพราะ Bowtie ระบุว่า consequence ตามหลัง top event'), B('Bowtie controls are listed in the hazard notes and linked with "references" for the analyst to consider; no constraint text is written', 'control ของ Bowtie ถูกลงไว้ในโน้ตของ hazard และผูกด้วย references เพื่อให้ผู้วิเคราะห์พิจารณา ไม่ได้เขียนข้อกำหนดให้')],
      notTransferred: [B('System and boundary, control structure, control actions, feedback, UCAs, scenarios, constraints: a bowtie does not contain them', 'ระบบและขอบเขต โครงสร้างการควบคุม control action feedback UCA scenario และ constraint: Bowtie ไม่มีข้อมูลเหล่านี้'), B('Threats, escalation factors, control states, owners, evidence', 'Threat, escalation factor, สถานะ control, ผู้รับผิดชอบ, หลักฐาน')],
      provenance: [B('Proposed losses/hazard link back with candidate_mapping (status proposed); controls with references (status proposed)', 'loss/hazard ที่เสนอเชื่อมกลับด้วย candidate_mapping (proposed); control ด้วย references (proposed)')],
      validation: [B('Destination is checked with the STAMP validator; lint will still list what is unfinished', 'ตรวจปลายทางด้วย validator ของ STAMP; lint จะแจ้งสิ่งที่ยังไม่เสร็จ')],
      limitations: [B('A top event is an event; an STPA hazard is a system state. A consequence may be an intermediate event rather than a stakeholder loss. Both need the analyst to rewrite or reject them.', 'top event เป็นเหตุการณ์ แต่ hazard ของ STPA เป็นสถานะของระบบ และ consequence อาจเป็นเหตุการณ์ระหว่างทาง ไม่ใช่ loss ผู้วิเคราะห์ต้องเขียนใหม่หรือปฏิเสธ')],
    },
    confirm: [
      { id: 'system', text: B('The system and boundary are left empty: they cannot be derived from a bowtie and must be written by the analyst.', 'ระบบและขอบเขตถูกปล่อยว่าง: สร้างจาก Bowtie ไม่ได้ ผู้วิเคราะห์ต้องเขียนเอง') },
      { id: 'hazard-state', text: B('The proposed hazard text is a bowtie top event (an event). It must be rewritten as a system state or removed.', 'ข้อความ hazard ที่เสนอมาจาก top event (เป็นเหตุการณ์) ต้องเขียนใหม่เป็นสถานะของระบบหรือลบออก') },
      { id: 'losses', text: B('Proposed losses are bowtie consequences; some may not be stakeholder-unacceptable outcomes.', 'loss ที่เสนอคือ consequence ของ Bowtie บางข้ออาจไม่ใช่ผลลัพธ์ที่ผู้มีส่วนได้เสียไม่ยอมรับ') },
      { id: 'hazard-loss-links', text: B('Hazard → loss links were copied from the bowtie structure and are not an STPA finding.', 'ความเชื่อม hazard → loss คัดลอกจากโครงสร้าง Bowtie ไม่ใช่ข้อค้นพบของ STPA') },
    ],
  },
  {
    id: 'bowtie-to-fram', version: '1', from: 'bowtie', to: 'fram', supported: true,
    title: B('Bowtie controls → proposed FRAM functions', 'control ของ Bowtie → ฟังก์ชัน FRAM ที่เสนอ'),
    decisions: [],
    docs: {
      copied: [B('Each control text becomes a function name; the control owner (if written) becomes a Resource item', 'ข้อความ control เป็นชื่อฟังก์ชัน; ผู้รับผิดชอบ (ถ้าเขียนไว้) เป็นรายการ Resource')],
      transformed: [B('Each escalation factor of a control becomes an ANTICIPATED variability description with provenance "generated"', 'escalation factor ของ control เป็นคำอธิบายความแปรปรวนแบบ anticipated ที่มีที่มา generated')],
      notTransferred: [B('Input, Output, Preconditions, Control and Time of every function stay "unknown" (not assessed); couplings are not created because the order of controls on a bowtie path is not an output→input relation', 'Input Output Precondition Control Time ของทุกฟังก์ชันเป็น "unknown"; ไม่สร้าง coupling เพราะลำดับ control บนเส้นทาง Bowtie ไม่ใช่ความสัมพันธ์ output→input'), B('Threats, consequences, hazard, top event, control states, adequacy, reliability, evidence', 'Threat, consequence, hazard, top event, สถานะ control, ความเพียงพอ, ความน่าเชื่อถือ, หลักฐาน')],
      provenance: [B('Functions and variability link back with candidate_mapping (status proposed); every generated item has prov.origin = generated, reviewed = false', 'ฟังก์ชันและความแปรปรวนเชื่อมกลับด้วย candidate_mapping (proposed); ทุกรายการที่สร้างมี origin = generated, reviewed = false')],
      validation: [B('Destination is checked with the FRAM validator', 'ตรวจปลายทางด้วย validator ของ FRAM')],
      limitations: [B('A bowtie control is a barrier; a FRAM function is an activity. This only gives a starting list of names to be re-described.', 'control ของ Bowtie คือ barrier ส่วนฟังก์ชันของ FRAM คือกิจกรรม การแปลงนี้ให้เพียงรายชื่อเริ่มต้นเพื่อนำไปอธิบายใหม่')],
    },
    confirm: [
      { id: 'activity', text: B('The activity being modelled is left empty and must be written by the analyst.', 'กิจกรรมที่สร้างโมเดลถูกปล่อยว่าง ผู้วิเคราะห์ต้องเขียนเอง') },
      { id: 'aspects', text: B('Aspects other than Resource are unknown; the analyst must describe them.', 'aspect อื่นนอกจาก Resource ยังไม่ทราบ ผู้วิเคราะห์ต้องอธิบาย') },
      { id: 'variability', text: B('Variability items come from bowtie escalation factors, which are conditions that degrade a control, not observed variability.', 'ความแปรปรวนมาจาก escalation factor ของ Bowtie ซึ่งเป็นเงื่อนไขที่ทำให้ control อ่อนลง ไม่ใช่ความแปรปรวนที่สังเกตได้') },
    ],
  },
  {
    id: 'swiss-to-hfacs', version: '1', from: 'swiss', to: 'hfacs', supported: true,
    title: B('Swiss cheese holes → proposed HFACS factors', 'รูใน Swiss cheese → ปัจจัย HFACS ที่เสนอ'),
    decisions: [],
    docs: {
      copied: [B('Each hole text becomes an UNCLASSIFIED factor; the loss text becomes the occurrence text', 'ข้อความของรูแต่ละรูเป็นปัจจัยที่ยังไม่จัดหมวด; ข้อความ loss เป็นข้อความเหตุการณ์')],
      transformed: [B('The hole type (active/latent) and any HFACS level hint are written in the factor notes only', 'ชนิดของรู (active/latent) และ level ที่ระบุไว้ ถูกเขียนในโน้ตของปัจจัยเท่านั้น')],
      notTransferred: [B('HFACS categories (never assigned automatically), influences between factors, evidence, layers, hazard, trajectory, common-cause tags', 'หมวด HFACS (ไม่กำหนดให้อัตโนมัติ) ความเชื่อมระหว่างปัจจัย หลักฐาน ชั้น hazard trajectory และ common cause')],
      provenance: [B('Each factor links to its hole with derived_from; the destination records this transformation', 'ปัจจัยแต่ละข้อเชื่อมกลับไปยังรูด้วย derived_from')],
      validation: [B('Destination is checked with the HFACS validator; lint will list every unclassified factor', 'ตรวจปลายทางด้วย validator ของ HFACS; lint จะแจ้งปัจจัยที่ยังไม่จัดหมวดทุกข้อ')],
      limitations: [B('A Swiss hole is a weakness in a defence layer; an HFACS factor is a classified human-factors finding about an occurrence. Classification requires evidence and human judgement.', 'รูของ Swiss คือจุดอ่อนของชั้นป้องกัน ส่วนปัจจัยของ HFACS คือข้อค้นพบด้านปัจจัยมนุษย์ที่จัดหมวดแล้ว การจัดหมวดต้องมีหลักฐานและวิจารณญาณ')],
    },
    confirm: [
      { id: 'categories', text: B('No HFACS category is assigned; the analyst must classify each factor from evidence.', 'ไม่ได้กำหนดหมวด HFACS ผู้วิเคราะห์ต้องจัดหมวดแต่ละปัจจัยจากหลักฐาน') },
      { id: 'occurrence', text: B('The occurrence text is copied from the Swiss loss (an outcome); check that it states what happened.', 'ข้อความเหตุการณ์คัดลอกจาก loss ของ Swiss (เป็นผลลัพธ์) โปรดตรวจว่าระบุสิ่งที่เกิดขึ้น') },
    ],
  },
  {
    id: 'fram-to-bowtie-stamp', version: '1', from: 'fram', to: 'bowtie', supported: false,
    title: B('FRAM findings → Bowtie or STPA', 'ข้อค้นพบ FRAM → Bowtie หรือ STPA'),
    decisions: [],
    unsupportedReason: B(
      'Not implemented. A FRAM function or coupling does not say which threat, barrier, control structure or constraint it corresponds to, so any automatic mapping would be a guess. Use the Connections panel to create a link yourself (relation candidate_mapping or references), which records your decision without changing either model.',
      'ยังไม่รองรับ: ฟังก์ชันหรือ coupling ของ FRAM ไม่ได้ระบุว่าตรงกับ threat, barrier, โครงสร้างการควบคุม หรือ constraint ใด การแปลงอัตโนมัติจึงเป็นการเดา ให้สร้างลิงก์เองในแผง "เชื่อมโยง" (candidate_mapping หรือ references) ซึ่งบันทึกการตัดสินใจโดยไม่แก้โมเดลใดเลย'),
    docs: { copied: [], transformed: [], notTransferred: [], provenance: [], validation: [], limitations: [] },
  },
  {
    id: 'event-records-to-pyramid', version: '1', from: 'file', to: 'pyramid', supported: true, kind: 'import',
    title: B('Event records (CSV) → Accident Pyramid dataset', 'ข้อมูลเหตุการณ์ (CSV) → ชุดข้อมูล Accident Pyramid'),
    decisions: [],
    docs: {
      copied: [B('Columns id, date, category, reference, note become records', 'คอลัมน์ id date category reference note เป็น record')],
      transformed: [B('Category labels are matched to existing tiers by label; unseen labels are left uncategorised unless the analyst chooses to create tiers', 'ชื่อระดับถูกจับคู่กับระดับที่มีอยู่ ชื่อที่ไม่พบจะไม่ถูกจัดระดับ เว้นแต่ผู้วิเคราะห์เลือกสร้างระดับใหม่')],
      notTransferred: [B('Extra columns are ignored and reported; invalid dates are dropped from the date field and noted on the record', 'คอลัมน์เกินถูกข้ามและแจ้ง; วันที่ไม่ถูกต้องถูกตัดออกจากช่องวันที่และบันทึกไว้ที่ record')],
      provenance: [B('Every imported record carries an importId; the dataset records file name, content hash and row count in its transformation history', 'ทุก record มี importId; ประวัติการแปลงบันทึกชื่อไฟล์ แฮช และจำนวนแถว')],
      validation: [B('A preview shows counts of mapped, unmapped, duplicate and invalid rows before anything is added', 'ตัวอย่างแสดงจำนวนแถวที่จับคู่ได้ ไม่ได้ ซ้ำ และไม่ถูกต้อง ก่อนเพิ่มข้อมูลใด ๆ')],
      limitations: [B('Duplicates are flagged as possible only; nothing is removed automatically.', 'ระบบแจ้งว่า "อาจซ้ำ" เท่านั้น ไม่ลบให้เอง')],
    },
  },
];
export const transformsFrom = (type) => TRANSFORMS.filter((t) => t.from === type);
export const transformById = (id) => TRANSFORMS.find((t) => t.id === id) || null;

const NOW = () => new Date().toISOString();

/** Build a preview. source must have meta.modelId (call ensureIdentity first). Nothing is modified. */
export function previewTransform(id, source, decisions = {}, ctx = {}) {
  const t = transformById(id);
  const P = { ok: false, transformId: id, version: t ? t.version : null, supported: !!(t && t.supported), title: t ? t.title : null, destType: t ? t.to : null, destination: null, mappings: [], omitted: [], warnings: [], conflicts: [], needsConfirmation: [], validation: { errors: [], warnings: [] }, links: [], decisionErrors: [], docs: t ? t.docs : null, unsupportedReason: t && !t.supported ? t.unsupportedReason : null, source: null };
  if (!t) { P.decisionErrors.push(B('Unknown transformation', 'ไม่รู้จักการแปลงนี้')); return P; }
  if (!t.supported) return P;
  const a = adapterOf(source);
  if (!a || a.type !== t.from) { P.decisionErrors.push(B('The source model is not a ' + t.from + ' model', 'โมเดลต้นทางไม่ใช่ชนิด ' + t.from)); return P; }
  if (!source.meta || !source.meta.modelId) { P.decisionErrors.push(B('The source model has no modelId yet', 'โมเดลต้นทางยังไม่มี modelId')); return P; }
  const srcErrors = a.validate(source);
  if (srcErrors.length) { P.decisionErrors.push(B('The source model is not valid: ' + srcErrors.slice(0, 3).join('; '), 'โมเดลต้นทางไม่ผ่านการตรวจ: ' + srcErrors.slice(0, 3).join('; '))); return P; }
  const src = clone(source);
  const srcRef = { modelId: src.meta.modelId, revision: src.meta.revision || 1 };
  P.source = { ...srcRef, type: a.type, title: src.meta.title || '' };
  const via = t.id + '@' + t.version;
  const gen = (entityId) => ({ origin: 'generated', reviewed: false, via, from: { modelId: srcRef.modelId, entityId } });
  let dest;
  const link = (destEntityId, srcEntityId, relation, status, note = '') => newLink({ modelId: null, entityId: destEntityId }, { modelId: srcRef.modelId, entityId: srcEntityId }, relation, { status, note, by: 'transformation', via });
  const map = (srcEntityId, destEntityId, relation, note = '', destModel = null) => P.mappings.push({ from: { entityId: srcEntityId, type: typeOf(src, srcEntityId), label: labelOf(src, srcEntityId) }, to: { entityId: destEntityId, label: destModel ? labelOf(destModel, destEntityId) : '' }, relation, note });
  const omit = (en, th) => P.omitted.push({ what: B(en, th) });

  if (t.id === 'bowtie-to-swiss') {
    const threat = src.threats.find((x) => x.id === decisions.threatId);
    if (!decisions.threatId || !threat) { P.decisionErrors.push(B('Choose the threat whose route should be viewed', 'เลือก threat ที่ต้องการดูเส้นทาง')); return P; }
    const cons = decisions.consequenceId ? src.consequences.find((x) => x.id === decisions.consequenceId) : null;
    if (decisions.consequenceId && !cons) { P.decisionErrors.push(B('The chosen consequence does not exist', 'consequence ที่เลือกไม่มีอยู่')); return P; }
    dest = SW.swissFromBowtie(src, { threatId: threat.id, consequenceId: cons ? cons.id : null });
    dest.layers.forEach((l) => {
      if (l.controlId) map(l.controlId, l.id, 'derived_from', '', dest);
      l.holes.forEach((h) => { if (h.escalationId) map(h.escalationId, h.id, 'derived_from', '', dest); });
    });
    if (!dest.layers.some((l) => l.holes.length)) P.warnings.push(B('No escalation factors on the chosen route: the Swiss view will have layers without holes (not examined, or solid?).', 'ไม่มี escalation factor บนเส้นทางที่เลือก: ชั้นป้องกันจะไม่มีรู (ยังไม่ได้ตรวจ หรือแข็งแรงจริง?)'));
    if (!dest.layers.length) P.warnings.push(B('The chosen route has no controls: no layers were created.', 'เส้นทางที่เลือกไม่มี control: จึงไม่ได้สร้างชั้นใด'));
    omit('Other threats and routes', 'Threat และเส้นทางอื่น'); omit('Control state, adequacy, reliability, owner, evidence, assurance', 'สถานะ control ความเพียงพอ ความน่าเชื่อถือ ผู้รับผิดชอบ หลักฐาน assurance'); omit('Trajectory (left empty: only the analyst chooses aligned holes)', 'Trajectory (ปล่อยว่าง: ผู้วิเคราะห์เป็นผู้เลือกรูที่เรียงตัว)');
    ensureIdentity(dest);
    dest.layers.forEach((l) => { if (l.controlId) P.links.push(link(l.id, l.controlId, 'derived_from', 'confirmed')); l.holes.forEach((h) => { if (h.escalationId) P.links.push(link(h.id, h.escalationId, 'derived_from', 'confirmed')); }); });
  } else if (t.id === 'bowtie-to-stamp') {
    dest = ST.emptyStamp();
    dest.system.text = '';
    src.consequences.forEach((c) => {
      const l = ST.addLoss(dest, c.text); l.notes = '[PROPOSED from Bowtie consequence ' + c.id + '; not reviewed]';
      map(c.id, l.id, 'candidate_mapping', '', dest); P.links.push(link(l.id, c.id, 'candidate_mapping', 'proposed'));
    });
    const h = ST.addHazard(dest, src.topEvent.text);
    h.lossIds = dest.losses.map((x) => x.id);
    const ctl = src.controls.filter((c) => (c.text || '').trim());
    h.notes = '[PROPOSED from Bowtie top event ' + src.topEvent.id + '; not reviewed]' + (ctl.length ? '\nBowtie controls to consider when writing constraints (none written):\n' + ctl.map((c) => '- ' + c.text).join('\n') : '');
    map(src.topEvent.id, h.id, 'candidate_mapping', '', dest); P.links.push(link(h.id, src.topEvent.id, 'candidate_mapping', 'proposed'));
    ctl.forEach((c) => P.links.push(link(h.id, c.id, 'references', 'proposed', 'Bowtie control possibly relevant to this hazard’s constraint; no constraint text was generated')));
    if (!src.topEvent.text.trim()) P.warnings.push(B('The bowtie top event is empty, so the proposed hazard is empty.', 'top event ของ Bowtie ว่าง hazard ที่เสนอจึงว่าง'));
    if (!src.consequences.length) P.warnings.push(B('The bowtie has no consequences: no losses were proposed.', 'Bowtie ไม่มี consequence จึงไม่เสนอ loss'));
    omit('System and boundary (not in a bowtie)', 'ระบบและขอบเขต (Bowtie ไม่มี)'); omit('Control structure, control actions, feedback, UCAs, scenarios, constraints (not in a bowtie)', 'โครงสร้างการควบคุม control action feedback UCA scenario constraint (Bowtie ไม่มี)'); omit('Threats and escalation factors', 'Threat และ escalation factor'); omit('Control states, owners, evidence', 'สถานะ control ผู้รับผิดชอบ หลักฐาน');
    t.confirm.forEach((c) => P.needsConfirmation.push(c));
  } else if (t.id === 'bowtie-to-fram') {
    dest = FR.emptyFram();
    const laneOf = (c) => { const p = c.side === 'prevent' ? src.threats.find((x) => x.id === c.threatId) : src.consequences.find((x) => x.id === c.consequenceId); return p ? p.text : ''; };
    const ordered = [...src.threats.flatMap((th) => M.primaryControlsOf(src, 'prevent', th.id)), ...src.consequences.flatMap((co) => M.primaryControlsOf(src, 'recover', co.id))];
    ordered.forEach((c) => {
      const f = FR.addFunction(dest, c.text);
      f.context = '[PROPOSED from Bowtie ' + c.side + ' control; lane: ' + laneOf(c) + '; not reviewed]';
      if ((c.owner || '').trim()) FR.addAspectItem(dest, f.id, 'resource', c.owner.trim(), gen(c.id));
      map(c.id, f.id, 'candidate_mapping', '', dest); P.links.push(link(f.id, c.id, 'candidate_mapping', 'proposed'));
      src.escalations.filter((e) => e.controlId === c.id).forEach((e) => {
        const v = FR.addVariability(dest, f.id, e.text);
        v.state = 'anticipated'; v.prov = gen(e.id);
        const ecs = src.escalationControls.filter((x) => x.escalationId === e.id);
        v.notes = 'Bowtie escalation factor (a condition said to degrade the control; not an observed variability).' + (ecs.length ? ' Escalation control(s): ' + ecs.map((x) => x.text).join('; ') : '');
        map(e.id, v.id, 'candidate_mapping', '', dest); P.links.push(link(v.id, e.id, 'candidate_mapping', 'proposed'));
      });
    });
    dest.meta.scope = 'Starting list derived from Bowtie "' + (src.meta.title || '') + '" (' + srcRef.modelId + '). Candidate content only; every function must be re-described by the analyst.';
    if (!ordered.length) P.warnings.push(B('The bowtie has no controls: no functions were proposed.', 'Bowtie ไม่มี control จึงไม่เสนอฟังก์ชัน'));
    omit('Couplings (the order of controls on a bowtie path is not an output→input relation)', 'Coupling (ลำดับ control บนเส้นทาง Bowtie ไม่ใช่ความสัมพันธ์ output→input)'); omit('Input, Output, Precondition, Control, Time of every function (unknown)', 'Input Output Precondition Control Time ของทุกฟังก์ชัน (unknown)'); omit('Threats, consequences, hazard, top event, control states, adequacy, reliability, evidence', 'Threat consequence hazard top event สถานะ control ความเพียงพอ ความน่าเชื่อถือ หลักฐาน');
    t.confirm.forEach((c) => P.needsConfirmation.push(c));
  } else if (t.id === 'swiss-to-hfacs') {
    dest = HF.emptyHfacs();
    dest.event.text = src.loss.text;
    src.layers.forEach((l) => l.holes.forEach((h) => {
      const f = HF.addFactor(dest, null, h.text);
      f.notes = '[PROPOSED from Swiss ' + (h.type || 'unclassified') + ' hole in layer "' + (l.name || '') + '"' + (h.hfacsLevel ? '; level hint: ' + h.hfacsLevel : '') + '; no HFACS category assigned; not reviewed]';
      map(h.id, f.id, 'derived_from', '', dest); P.links.push(link(f.id, h.id, 'derived_from', 'confirmed'));
    }));
    map(src.loss.id, dest.event.id, 'candidate_mapping', '', dest); P.links.push(link(dest.event.id, src.loss.id, 'candidate_mapping', 'proposed'));
    if (!dest.factors.length) P.warnings.push(B('The Swiss model has no holes: no factors were proposed.', 'Swiss ไม่มีรู จึงไม่เสนอปัจจัย'));
    omit('HFACS categories (never assigned automatically)', 'หมวด HFACS (ไม่กำหนดให้อัตโนมัติ)'); omit('Influences between factors, evidence', 'ความเชื่อมระหว่างปัจจัย หลักฐาน'); omit('Layers, hazard, trajectory, common-cause tags', 'ชั้น hazard trajectory common cause');
    t.confirm.forEach((c) => P.needsConfirmation.push(c));
  }

  ensureIdentity(dest);
  dest.meta.title = dest.meta.title && t.id === 'bowtie-to-swiss' ? dest.meta.title : 'Candidate ' + t.to.toUpperCase() + ' from ' + t.from + ': ' + (src.meta.title || '(untitled)');
  dest.meta.illustrative = !!(src.meta && src.meta.illustrative);
  if (!dest.meta.scope) dest.meta.scope = 'Derived from ' + t.from + ' "' + (src.meta.title || '') + '" (' + srcRef.modelId + ', revision ' + srcRef.revision + ') by ' + via + '. Candidate content only; review before use.';
  const da = adapterOf(dest);
  P.validation.errors = da.validate(dest);
  P.links.forEach((l) => { l.from.modelId = dest.meta.modelId; });
  P.destination = dest;
  P.ok = P.decisionErrors.length === 0 && P.validation.errors.length === 0;
  return P;
}

/**
 * Apply a preview: returns { ok, errors, model, links, history }. Requires every confirmation id. Does NOT touch any stored model.
 */
export async function applyTransform(preview, confirmed = [], opts = {}) {
  const errors = [];
  if (!preview || !preview.supported) errors.push('this transformation is not supported');
  else {
    if (!preview.ok) errors.push('the preview has validation errors or missing decisions; nothing was created');
    const have = new Set(confirmed);
    preview.needsConfirmation.forEach((c) => { if (!have.has(c.id)) errors.push('not confirmed: ' + c.id); });
  }
  if (errors.length) return { ok: false, errors };
  const model = clone(preview.destination);
  const now = opts.now || NOW();
  const history = { id: rid('tr'), transformId: preview.transformId, version: preview.version, at: now, from: { modelId: preview.source.modelId, revision: preview.source.revision, contentHash: opts.sourceHash || '' }, decisions: opts.decisions || {}, confirmations: [...confirmed], omitted: preview.omitted.map((o) => o.what.en), summary: 'Created ' + preview.mappings.length + ' mapped item(s); ' + preview.omitted.length + ' kind(s) of information not transferred.' };
  model.meta.transformations = [...(model.meta.transformations || []), history];
  const links = clone(preview.links);
  return { ok: true, errors: [], model, links, history };
}
