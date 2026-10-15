// Safetytool — UI strings (Thai / English). Technical terms (bowtie, hazard, threat, SHELL ...) stay in English in both languages.

export const STR = {
  th: {
    app: 'Safetytool', tagline: 'เครื่องมือสร้างโมเดลความปลอดภัยทางการบิน (ฟรี)',
    example: 'ตัวอย่าง', new: 'ใหม่', open: 'เปิดไฟล์', save: 'บันทึก JSON', svg: 'ส่งออก SVG', png: 'ส่งออก PNG', csv: 'ส่งออก CSV', print: 'พิมพ์ / PDF',
    undo: 'เลิกทำ', redo: 'ทำซ้ำ', fit: 'พอดีหน้าจอ', esc: 'แสดง Escalation', theme: 'ธีม', lang: 'EN', help: 'ช่วยเหลือ',
    models: 'ชนิดโมเดล', mBowtie: 'Bowtie', mSwiss: 'Swiss cheese', mShell: 'SHELL',
    tabDiagram: 'แผนภาพ', tabSimulate: 'จำลอง (Simulate)', tabCompare: 'เปรียบเทียบ (Compare)', tabReport: 'รายงาน (Report)', tabAnalysis: 'วิเคราะห์', replaceSwiss: 'โมเดล Swiss cheese ที่เปิดอยู่จะถูกแทนที่ ต้องการดำเนินการต่อหรือไม่?', tabTable: 'ตาราง', tabMeta: 'ข้อมูลโมเดล', tabForm: 'ฟอร์มกรอกข้อมูล',
    rInspector: 'รายละเอียด', rQuality: 'คุณภาพ', rHelp: 'คู่มือ', rGallery: 'คลังงาน',
    addThreat: '+ Threat', addConsequence: '+ Consequence',
    addControl: '+ Control', addEscalation: '+ Escalation factor', addEscControl: '+ Escalation control',
    sharedHead: 'ใช้ร่วมกับ Threat อื่น', sharedHeadRec: 'ใช้ร่วมกับ Consequence อื่น', sharedNote: 'Control ตัวเดียวกัน สถานะและหลักฐานเดียวกัน ปรากฏในหลายเส้นทาง ถ้าล้มเหลวจะล้มเหลวพร้อมกันทุกเส้นทาง', sharedOnly: 'ยังไม่มี Threat อื่นให้เลือก', sharedHome: 'ตัวจริงอยู่ที่', sharedElsewhere: 'Control นี้ถูกแชร์มาจากเส้นทางอื่น แก้ไขและจัดลำดับที่เส้นทางต้นทาง',
    moveUp: 'เลื่อนขึ้น', moveDown: 'เลื่อนลง', delete: 'ลบ', confirmDelete: 'ลบรายการนี้และสิ่งที่ผูกอยู่ทั้งหมด?',
    confirmNew: 'เริ่มโมเดลใหม่? (โมเดลปัจจุบันยังเลิกทำได้)',
    inspector: 'รายละเอียด', nothingSelected: 'คลิกองค์ประกอบในแผนภาพ หรือเพิ่ม Threat / Consequence',
    formHint: 'ใช้แท็บ "ฟอร์มกรอกข้อมูล" เพื่อแก้ไขโมเดลนี้ ส่วนแท็บ "แผนภาพ" ใช้ดูผลและส่งออก',
    quality: 'ตรวจคุณภาพ', noIssues: 'ไม่พบข้อสังเกต', errors: 'ข้อผิดพลาด', warns: 'คำเตือน', infos: 'ข้อเสนอแนะ',
    kind: {
      hazard: 'Hazard', topEvent: 'Top event', threat: 'Threat', consequence: 'Consequence', control: 'Control', escalation: 'Escalation factor', escalationControl: 'Escalation factor control',
      loss: 'Loss', layer: 'ชั้นป้องกัน', holeActive: 'Active failure', holeLatent: 'Latent condition', wall: 'ชั้นที่ป้องกันได้',
      subject: 'Liveware (ตรงกลาง)', focus: 'งาน/สถานการณ์', compS: 'Software', compH: 'Hardware', compE: 'Environment', compL: 'Other liveware', iface: 'Interface', item: 'รายการ', finding: 'ข้อค้นพบ',
    },
    f: { text: 'ข้อความ', notes: 'หมายเหตุ', exposure: 'Threat exposure (1–5)', severity: 'Severity (1–5)', function: 'หน้าที่ (function)', type: 'ประเภท (type)', critical: 'Critical control', adequacy: 'Adequacy (1–4)', reliability: 'Reliability (1–4)', owner: 'ผู้รับผิดชอบ (post holder)', title: 'ชื่อโมเดล', scope: 'ขอบเขต/หมายเหตุ', author: 'ผู้จัดทำ', illustrative: 'เป็นตัวอย่างประกอบการสอน' },
    fn: { eliminate: 'Eliminate', prevent: 'Prevent', reduce: 'Reduce', mitigate: 'Mitigate' },
    ty: { policy: 'นโยบาย/ขั้นตอน', equipment: 'อุปกรณ์/โครงสร้างพื้นฐาน', warning: 'ระบบเตือน', human: 'การแทรกแซงโดยคน', automated: 'ระบบแก้ไขอัตโนมัติ' },
    none: '— ไม่ระบุ —', badFile: 'ไฟล์ไม่ถูกต้อง: ', saved: 'บันทึกอัตโนมัติในเบราว์เซอร์นี้',
    wrongType: 'ไฟล์นี้เป็นโมเดลชนิดอื่น เปลี่ยนไปที่ชนิดนั้นให้อัตโนมัติ',
    disclaimer: 'เครื่องมือช่วยคิดและสื่อสาร ผลลัพธ์ต้องผ่านการพิจารณาโดยผู้เชี่ยวชาญ ไม่ใช่คำแนะนำด้านความปลอดภัยที่รับรองแล้ว',
    colElement: 'องค์ประกอบ', colText: 'ข้อความ', colDetail: 'รายละเอียด',
    legendTitle: 'สีแถบล่าง Control = Adequacy × Reliability', poor: 'แย่', weak: 'อ่อน', fair: 'พอใช้', strong: 'แข็งแรง', unrated: 'ยังไม่ประเมิน',
    helpMode: 'โหมดช่วยเหลือ', helpModeHint: 'เปิดแล้วจะแสดงป้ายชนิดบนทุกกล่อง และคำอธิบายเมื่อเอาเมาส์ชี้หรือเลือกกล่อง',
    helpAbout: 'โมเดลนี้คืออะไร', helpBoxes: 'แต่ละกล่องคืออะไร', helpSelected: 'กล่องที่เลือก', helpWhat: 'คืออะไร', helpHow: 'เขียนอย่างไร', helpEg: 'ตัวอย่าง', helpAvoid: 'ควรหลีกเลี่ยง',
    helpTips: 'เคล็ดลับ: คลิกกล่องเพื่อแก้ไข, ลากพื้นที่ว่างเพื่อเลื่อน, เลื่อนล้อเมาส์เพื่อซูม',
    sw: {
      addLayer: '+ เพิ่มชั้นป้องกัน', addHole: '+ เพิ่มรู (จุดอ่อน)', layerName: 'ชื่อชั้น', defence: 'การป้องกัน (defence): ชั้นนี้ป้องกันอะไรและอย่างไร', category: 'หมวดของชั้น',
      holeType: 'ชนิดรู', aligned: 'เรียงตัวในเส้นทางอุบัติเหตุ', hazard: 'Hazard', loss: 'Loss (ความสูญเสียปลายทาง)', layers: 'ชั้นป้องกัน', noLayers: 'ยังไม่มีชั้นป้องกัน',
      cat: { organisation: 'องค์กร/นโยบาย', supervision: 'การกำกับดูแล', preconditions: 'เงื่อนไขเบื้องต้น (คน/อุปกรณ์/สภาพแวดล้อม)', acts: 'การปฏิบัติ/การตัดสินใจ', engineered: 'ระบบ/อุปกรณ์', procedural: 'ขั้นตอน', other: 'อื่นๆ' },
      hole: { active: 'Active failure', latent: 'Latent condition' },
    },
    sh: {
      subject: 'Liveware ตรงกลาง (บุคคล/ตำแหน่งที่วิเคราะห์)', focus: 'งาน/สถานการณ์ที่วิเคราะห์', components: 'องค์ประกอบ', interfaces: 'Interface (รอยต่อ)',
      S: 'S — Software (ขั้นตอน คู่มือ เช็กลิสต์ กฎ)', H: 'H — Hardware (อุปกรณ์ จอ ตัวควบคุม)', E: 'E — Environment (กายภาพและองค์กร)', L: 'L — Other Liveware (คนอื่นที่เกี่ยวข้อง)',
      LS: 'L–S: คน ↔ Software', LH: 'L–H: คน ↔ Hardware', LE: 'L–E: คน ↔ Environment', LL: 'L–L: คน ↔ คนอื่น',
      status: 'สถานะ', st: { unknown: 'ยังไม่ประเมิน', match: 'พอดีกัน (match)', mismatch: 'ไม่พอดี (mismatch)' },
      addItem: '+ เพิ่มรายการ', addFinding: '+ เพิ่มข้อค้นพบ', finding: 'ข้อค้นพบ', severity: 'ความรุนแรง (1–5)', action: 'มาตรการ/การแก้ไข', owner: 'ผู้รับผิดชอบ',
    },
  },
  en: {
    app: 'Safetytool', tagline: 'Free safety-model workbench for aviation',
    example: 'Example', new: 'New', open: 'Open', save: 'Save JSON', svg: 'Export SVG', png: 'Export PNG', csv: 'Export CSV', print: 'Print / PDF',
    undo: 'Undo', redo: 'Redo', fit: 'Fit', esc: 'Show escalation', theme: 'Theme', lang: 'ไทย', help: 'Help',
    models: 'Model type', mBowtie: 'Bowtie', mSwiss: 'Swiss cheese', mShell: 'SHELL',
    tabDiagram: 'Diagram', tabSimulate: 'Simulate', tabCompare: 'Compare', tabReport: 'Report', tabAnalysis: 'Analysis', replaceSwiss: 'The open Swiss cheese model will be replaced. Continue?', tabTable: 'Table', tabMeta: 'Model info', tabForm: 'Data entry form',
    rInspector: 'Details', rQuality: 'Quality', rHelp: 'Guide / Help', rGallery: 'Gallery',
    addThreat: '+ Threat', addConsequence: '+ Consequence',
    addControl: '+ Control', addEscalation: '+ Escalation factor', addEscControl: '+ Escalation control',
    sharedHead: 'Shared with other threats', sharedHeadRec: 'Shared with other consequences', sharedNote: 'The same control: one state, one set of evidence, shown on several routes. If it fails it fails on all of them at once.', sharedOnly: 'No other threats to pick yet', sharedHome: 'Lives under', sharedElsewhere: 'This control is shared in from another route; edit and reorder it at its home route.',
    moveUp: 'Move up', moveDown: 'Move down', delete: 'Delete', confirmDelete: 'Delete this item and everything attached to it?',
    confirmNew: 'Start a new model? (the current one can still be undone)',
    inspector: 'Details', nothingSelected: 'Click an element in the diagram, or add a Threat / Consequence',
    formHint: 'Use the "Data entry form" tab to edit this model; the "Diagram" tab is for viewing and export.',
    quality: 'Quality checks', noIssues: 'No findings', errors: 'errors', warns: 'warnings', infos: 'suggestions',
    kind: {
      hazard: 'Hazard', topEvent: 'Top event', threat: 'Threat', consequence: 'Consequence', control: 'Control', escalation: 'Escalation factor', escalationControl: 'Escalation factor control',
      loss: 'Loss', layer: 'Defence layer', holeActive: 'Active failure', holeLatent: 'Latent condition', wall: 'Layer holds',
      subject: 'Liveware (centre)', focus: 'Task / situation', compS: 'Software', compH: 'Hardware', compE: 'Environment', compL: 'Other liveware', iface: 'Interface', item: 'Item', finding: 'Finding',
    },
    f: { text: 'Text', notes: 'Notes', exposure: 'Threat exposure (1–5)', severity: 'Severity (1–5)', function: 'Function', type: 'Type', critical: 'Critical control', adequacy: 'Adequacy (1–4)', reliability: 'Reliability (1–4)', owner: 'Owner (post holder)', title: 'Model title', scope: 'Scope / notes', author: 'Author', illustrative: 'Illustrative teaching example' },
    fn: { eliminate: 'Eliminate', prevent: 'Prevent', reduce: 'Reduce', mitigate: 'Mitigate' },
    ty: { policy: 'Policy / procedure', equipment: 'Equipment / infrastructure', warning: 'Warning system', human: 'Human intervention', automated: 'Automated corrective system' },
    none: '— none —', badFile: 'Invalid file: ', saved: 'Autosaved in this browser',
    wrongType: 'This file is a different model type; switched to it automatically.',
    disclaimer: 'A thinking and communication aid. Results need expert review and are not certified safety advice.',
    colElement: 'Element', colText: 'Text', colDetail: 'Details',
    legendTitle: 'Control bar colour = Adequacy × Reliability', poor: 'Poor', weak: 'Weak', fair: 'Fair', strong: 'Strong', unrated: 'Not rated',
    helpMode: 'Help mode', helpModeHint: 'When on, every box shows its type label, with an explanation on hover or selection.',
    helpAbout: 'What is this model?', helpBoxes: 'What each box means', helpSelected: 'Selected box', helpWhat: 'What it is', helpHow: 'How to write it', helpEg: 'Example', helpAvoid: 'Avoid',
    helpTips: 'Tip: click a box to edit, drag empty space to pan, use the mouse wheel to zoom.',
    sw: {
      addLayer: '+ Add defence layer', addHole: '+ Add hole (weakness)', layerName: 'Layer name', defence: 'Defence: what this layer protects against, and how', category: 'Layer category',
      holeType: 'Hole type', aligned: 'Aligned on the accident trajectory', hazard: 'Hazard', loss: 'Loss (end outcome)', layers: 'Defence layers', noLayers: 'No layers yet',
      cat: { organisation: 'Organisation / policy', supervision: 'Supervision', preconditions: 'Preconditions (people / equipment / environment)', acts: 'Acts / decisions', engineered: 'Engineered / equipment', procedural: 'Procedural', other: 'Other' },
      hole: { active: 'Active failure', latent: 'Latent condition' },
    },
    sh: {
      subject: 'Central Liveware (person / role analysed)', focus: 'Task / situation analysed', components: 'Components', interfaces: 'Interfaces',
      S: 'S — Software (procedures, manuals, checklists, rules)', H: 'H — Hardware (equipment, displays, controls)', E: 'E — Environment (physical and organisational)', L: 'L — Other Liveware (other people involved)',
      LS: 'L–S: person ↔ Software', LH: 'L–H: person ↔ Hardware', LE: 'L–E: person ↔ Environment', LL: 'L–L: person ↔ other people',
      status: 'Status', st: { unknown: 'Not assessed', match: 'Match', mismatch: 'Mismatch' },
      addItem: '+ Add item', addFinding: '+ Add finding', finding: 'Finding', severity: 'Severity (1–5)', action: 'Action', owner: 'Owner',
    },
  },
};

// HFACS and STAMP/STPA strings
Object.assign(STR.th, { mHfacs: 'HFACS', mStamp: 'STAMP / STPA' });
Object.assign(STR.en, { mHfacs: 'HFACS', mStamp: 'STAMP / STPA' });
Object.assign(STR.th.kind, {
  hfEvent: 'เหตุการณ์ที่วิเคราะห์', hfFactor: 'ปัจจัย (factor)', hfViolation: 'ปัจจัย (การฝ่าฝืน)', hfLevel: 'ระดับ HFACS', hfCell: 'หมวด HFACS',
  stSystem: 'ระบบ/ขอบเขต', stLoss: 'Loss', stHazard: 'Hazard (ระดับระบบ)', stController: 'Controller', stProcess: 'Controlled process', stAction: 'Control action', stFeedback: 'Feedback', stUca: 'Unsafe control action (UCA)', stScenario: 'Causal scenario', stRow: 'ระดับ',
});
Object.assign(STR.en.kind, {
  hfEvent: 'Occurrence analysed', hfFactor: 'Factor', hfViolation: 'Factor (violation)', hfLevel: 'HFACS level', hfCell: 'HFACS category',
  stSystem: 'System / boundary', stLoss: 'Loss', stHazard: 'Hazard (system-level)', stController: 'Controller', stProcess: 'Controlled process', stAction: 'Control action', stFeedback: 'Feedback', stUca: 'Unsafe control action (UCA)', stScenario: 'Causal scenario', stRow: 'Level',
});
STR.th.hf = {
  event: 'เหตุการณ์ (occurrence) ที่นำมาจัดหมวด', factor: 'ปัจจัย: เงื่อนไขหรือข้อเท็จจริงที่พบ (เขียนเป็นสภาพของระบบ ไม่ใช่การโทษบุคคล)', category: 'หมวด HFACS', unclassified: 'ยังไม่จัดหมวด',
  evidence: 'หลักฐานที่สนับสนุนการจัดหมวด (แหล่งข้อมูล)', influences: 'ปัจจัยนี้ส่งผลต่อ (ปัจจัยในระดับที่ต่ำกว่า)', level: 'ระดับ', addFactor: '+ เพิ่มปัจจัย',
};
STR.en.hf = {
  event: 'The occurrence being classified', factor: 'Factor: the condition or fact found (write the state of the system, not blame on a person)', category: 'HFACS category', unclassified: 'Unclassified',
  evidence: 'Evidence for this classification (source)', influences: 'This factor contributed to (factors at a lower level)', level: 'Level', addFactor: '+ Add factor',
};
STR.th.stm = {
  system: 'ระบบและขอบเขตที่วิเคราะห์', losses: 'Losses (ความสูญเสียที่ไม่ยอมรับ)', addLoss: '+ เพิ่ม Loss', hazards: 'Hazards (ระดับระบบ)', hazard: 'Hazard: สถานะของระบบที่ร่วมกับสภาพแวดล้อมที่แย่ที่สุดจะนำไปสู่ Loss', addHazard: '+ เพิ่ม Hazard',
  leadsTo: 'นำไปสู่ Loss', constraint: 'ข้อกำหนดความปลอดภัยระดับระบบ (system-level constraint)', structure: 'โครงสร้างการควบคุม (controller และ controlled process)',
  role: { controller: 'Controller', process: 'Controlled process' }, nodeText: 'ชื่อ (บทบาท/ส่วนประกอบ)', level: 'ระดับ (0 = บนสุด)', processModel: 'Process model: สิ่งที่ controller เชื่อว่าเป็นสถานะของกระบวนการ',
  addController: '+ เพิ่ม Controller', addProcess: '+ เพิ่ม Controlled process', actions: 'Control action (ลงล่าง) และ Feedback (ขึ้นบน)', kind: { control: 'Control action', feedback: 'Feedback' },
  actionText: 'ข้อความ', from: 'จาก', to: 'ถึง', addControl: '+ Control action', addFeedback: '+ Feedback', ucas: 'Unsafe control actions (UCA)', noActions: 'เพิ่ม control action ก่อน แล้วจึงวิเคราะห์ UCA',
  addUca: '+ เพิ่ม UCA', ucaType: 'ชนิด UCA', context: 'บริบท: เงื่อนไขที่ทำให้การสั่ง/ไม่สั่งนี้ไม่ปลอดภัย', ucaConstraint: 'ข้อกำหนดของ controller (controller constraint)', scenario: 'Causal scenario: ทำไม UCA นี้จึงเกิดได้', addScenario: '+ เพิ่ม scenario',
};
STR.en.stm = {
  system: 'The system and its boundary', losses: 'Losses (unacceptable outcomes)', addLoss: '+ Add loss', hazards: 'Hazards (system-level)', hazard: 'Hazard: a system state that, with worst-case conditions, leads to a loss', addHazard: '+ Add hazard',
  leadsTo: 'Leads to loss', constraint: 'System-level safety constraint', structure: 'Control structure (controllers and controlled process)',
  role: { controller: 'Controller', process: 'Controlled process' }, nodeText: 'Name (role / component)', level: 'Level (0 = top)', processModel: 'Process model: what the controller believes about the state of the process',
  addController: '+ Add controller', addProcess: '+ Add controlled process', actions: 'Control actions (down) and feedback (up)', kind: { control: 'Control action', feedback: 'Feedback' },
  actionText: 'Text', from: 'From', to: 'To', addControl: '+ Control action', addFeedback: '+ Feedback', ucas: 'Unsafe control actions (UCAs)', noActions: 'Add a control action first, then analyse its UCAs',
  addUca: '+ Add UCA', ucaType: 'UCA type', context: 'Context: the condition that makes giving / not giving it unsafe', ucaConstraint: 'Controller constraint', scenario: 'Causal scenario: why could this UCA happen', addScenario: '+ Add scenario',
};
