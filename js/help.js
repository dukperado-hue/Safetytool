// Safetytool — help content: what each box in each model means. Written for this project (our own wording).
// kind -> { th: {name, what, how, eg, avoid}, en: {...} }. Examples are illustrative only.

const B = {
  hazard: {
    th: { name: 'Hazard (สิ่งที่อาจก่อภัย)', what: 'สภาวะ วัตถุ หรือกิจกรรมที่มีศักยภาพทำให้เกิดอันตราย ใช้กำหนดบริบทและขอบเขตของทั้งแผนภาพ', how: 'เขียนเป็นนามหรือกิจกรรมกลางๆ เช่น "สัตว์ป่าในพื้นที่สนามบิน" ไม่ใช่เหตุการณ์', eg: 'ฝูงนกในและรอบทางวิ่ง', avoid: 'อย่าเขียนเป็นเหตุการณ์หรือความล้มเหลว (เช่น "ชนนก") นั่นคือ Top event หรือ Consequence' },
    en: { name: 'Hazard', what: 'A condition, object or activity that could cause harm; it sets the scope of the whole diagram.', how: 'Write a neutral noun/activity, e.g. "wildlife on the aerodrome", not an event.', eg: 'Flocks of birds on and around the runway', avoid: 'Do not write an event or failure (e.g. "bird strike"); that is a top event or consequence.' },
  },
  topEvent: {
    th: { name: 'Top event (จุดที่เสียการควบคุม)', what: 'ช่วงเวลาที่การควบคุม hazard หลุดไป ยังไม่ใช่อุบัติเหตุ แต่ถ้าไม่ถูกควบคุมจะไปสู่ผลเสียได้', how: 'ถามว่า "ตอนไหนที่เราควบคุมไม่ได้แล้ว" เขียนเป็นเหตุการณ์ชัดเจนหนึ่งเหตุการณ์', eg: 'ฝูงนกอยู่ในเส้นทางของอากาศยานขณะขึ้น-ลง', avoid: 'อย่ารวมหลาย top event ไว้ในแผนภาพเดียว ให้แยกเป็นหลายแผนภาพที่เชื่อมกัน' },
    en: { name: 'Top event', what: 'The moment control of the hazard is lost. Not an accident yet, but it can become one.', how: 'Ask "when have we lost control?" and write one clear event.', eg: 'Birds in the path of an aircraft on take-off or landing', avoid: 'Do not pack several top events into one diagram; split into linked diagrams.' },
  },
  threat: {
    th: { name: 'Threat (สาเหตุโดยตรง)', what: 'สาเหตุโดยตรงที่ทำให้เกิด top event ได้ด้วยตัวเอง อยู่ฝั่งซ้าย', how: 'เขียนเป็นเหตุการณ์ที่เกิดขึ้น เช่น "ฝูงนกเข้ามาพักบนหญ้า" ถามซ้ำว่า "ทำไม" จนได้สาเหตุจริง', eg: 'การอพยพตามฤดูกาลทำให้นกเพิ่มขึ้นฉับพลัน', avoid: 'อย่าเขียนความล้มเหลวของมาตรการป้องกันเป็น threat (นั่นคือ escalation factor) และต้องไม่ต้องพึ่ง threat อื่นร่วมด้วย' },
    en: { name: 'Threat', what: 'A direct cause that can produce the top event on its own (left side).', how: 'Write an event that occurs, e.g. "a flock settles on the grass"; keep asking "why" to reach the real cause.', eg: 'Seasonal migration suddenly increases bird numbers', avoid: 'Do not write a control failure as a threat (that is an escalation factor); it must not need another threat to act.' },
  },
  consequence: {
    th: { name: 'Consequence (ผลที่ตามมา)', what: 'เหตุการณ์ที่ตามมาเมื่อ top event ไม่ถูกควบคุม และนำไปสู่ความสูญเสียโดยตรง อยู่ฝั่งขวา', how: 'เขียนเป็นเหตุการณ์ในภาษาปฏิบัติการ เช่น "ชนกันบนทางวิ่ง" ถ้ามาตรการเหมือนกันให้รวมเป็นรายการเดียว', eg: 'สัตว์ถูกดูดเข้าเครื่องยนต์ขณะบิน', avoid: 'อย่าใส่ "ไม่มีผลกระทบ" และอย่าเขียนแค่ผลลัพธ์กว้างๆ' },
    en: { name: 'Consequence', what: 'An event that follows an uncontrolled top event and leads directly to loss (right side).', how: 'Write an operational event such as "collision on the runway"; merge consequences that share identical controls.', eg: 'Birds ingested by an engine in flight', avoid: 'No "nothing happens" entries and no vague outcomes.' },
  },
  control: {
    th: { name: 'Control (มาตรการควบคุม / barrier)', what: 'สิ่งที่ทำหรือมีอยู่เพื่อขวางเส้นทางจาก threat ไป top event (ซ้าย, preventive) หรือจาก top event ไป consequence (ขวา, recovery)', how: 'หนึ่งประโยคที่บอกว่าใครหรืออะไรทำอะไร แล้วประเมิน Adequacy × Reliability ใส่ผู้รับผิดชอบ แถบสีล่างบอกความแข็งแรง', eg: 'เจ้าหน้าที่ลาดตระเวนไล่นกตามตารางและก่อนเที่ยวบินช่วงเสี่ยง', avoid: 'อย่าเขียนกว้างเกินไป (เช่น "ATC") และอย่าตัดมาตรการที่อ่อนออก ให้ใส่แล้วประเมินตามจริง' },
    en: { name: 'Control (barrier)', what: 'Something done or in place that blocks the path from a threat to the top event (left, preventive) or from the top event to a consequence (right, recovery).', how: 'One sentence saying who/what does which action; rate Adequacy × Reliability and name an owner. The colour bar shows strength.', eg: 'Staff patrol and disperse birds on a schedule and before high-risk flights', avoid: 'Do not be vague ("ATC") and do not leave out weak controls; include and rate them honestly.' },
  },
  escalation: {
    th: { name: 'Escalation factor (ปัจจัยที่ทำให้ control อ่อนลง)', what: 'เงื่อนไขที่ทำให้ control ทำงานแย่ลงหรือล้มเหลว (กล่องม่วง ใต้ control)', how: 'บอกเหตุผลที่ control ด้อยลง เช่น "กำลังคนไม่พอตอนกลางคืน"', eg: 'หมอกหรือแสงน้อยทำให้มองเห็นฝูงนกช้า', avoid: 'อย่าเขียนแค่ปฏิเสธ control ("ตรวจไม่พบ") และห้ามเป็นสาเหตุของ top event เอง' },
    en: { name: 'Escalation factor', what: 'A condition that makes a control work worse or fail (purple box under a control).', how: 'State why the control degrades, e.g. "too few staff at night".', eg: 'Fog or low light delays spotting a flock', avoid: 'Do not merely negate the control ("not detected"); it must not itself cause the top event.' },
  },
  escalationControl: {
    th: { name: 'Escalation factor control', what: 'มาตรการที่จัดการ escalation factor เพื่อไม่ให้ control เดิมอ่อนลง (กล่องม่วงเส้นประ)', how: 'ระบุสิ่งที่ทำกับ escalation factor นั้นโดยตรง', eg: 'จัดเวรให้ครอบคลุมช่วงเสี่ยงและมีเจ้าหน้าที่สำรอง', avoid: 'โดยปกติทำถึงระดับนี้ระดับเดียว อย่าซ้อน escalation ต่อไปอีก' },
    en: { name: 'Escalation factor control', what: 'A measure that manages an escalation factor so the original control stays effective (dashed purple box).', how: 'Say what is done about that factor directly.', eg: 'Rosters cover high-risk periods with reserve staff', avoid: 'Normally stop at this level; do not stack further escalation layers.' },
  },
};

const S = {
  hazard: B.hazard,
  loss: {
    th: { name: 'Loss (ความสูญเสียปลายทาง)', what: 'ผลเสียสุดท้ายที่เกิดเมื่อรูในทุกชั้นเรียงตัวกัน (กล่องสีชมพูด้านขวา)', how: 'เขียนเป็นเหตุการณ์ความสูญเสียที่ชัดเจน', eg: 'อากาศยานชนนกขณะลงจอดจนเสียหาย', avoid: 'อย่าเขียนกว้างเกินไป เช่น "อุบัติเหตุ"' },
    en: { name: 'Loss', what: 'The end outcome that occurs when holes in every layer line up (pink box on the right).', how: 'Write a clear loss event.', eg: 'Aircraft damaged by a bird strike on landing', avoid: 'Do not be vague, e.g. "an accident".' },
  },
  layer: {
    th: { name: 'ชั้นป้องกัน (defence layer / "แผ่นเนยแข็ง")', what: 'มาตรการหรือกลไกหนึ่งชั้นที่ขวางระหว่าง hazard กับความสูญเสีย เช่น องค์กร การกำกับดูแล ขั้นตอน อุปกรณ์ การตัดสินใจของคน', how: 'ตั้งชื่อชั้น และอธิบายว่าป้องกันอะไรอย่างไร (defence) แล้วเพิ่มรู (จุดอ่อน) ของชั้นนั้น', eg: 'การตรวจและไล่นกบริเวณทางวิ่ง', avoid: 'อย่ารวมหลายมาตรการต่างระดับในชั้นเดียว ให้แยกชั้น' },
    en: { name: 'Defence layer ("cheese slice")', what: 'One protective layer between the hazard and the loss: organisation, supervision, procedures, equipment, human decisions.', how: 'Name the layer, say what the defence is and does, then add its holes (weaknesses).', eg: 'Bird inspection and dispersal on the runway', avoid: 'Do not mix unrelated measures in one layer; split them.' },
  },
  holeActive: {
    th: { name: 'Active failure (ความล้มเหลวที่เกิดขึ้นขณะปฏิบัติ)', what: 'การกระทำหรือการละเว้นที่เกิดขึ้นทันทีและมีผลเร็ว เช่น ข้ามขั้นตอน ตัดสินใจพลาด (วงรีสีชมพู)', how: 'เขียนสิ่งที่เกิดขึ้นจริงหรืออาจเกิดขึ้น ไม่ใช่การโทษบุคคล', eg: 'นักบินตัดสินใจลงจอดต่อทั้งที่ได้รับแจ้งว่ามีนกใกล้ทางวิ่ง', avoid: 'ลองถามต่อว่ามีเงื่อนไขแฝง (latent) อะไรทำให้เกิดการกระทำนี้ได้ง่าย' },
    en: { name: 'Active failure', what: 'An action or omission with immediate effect, e.g. skipping a step or a wrong decision (pink oval).', how: 'Describe what happens or could happen; do not just blame a person.', eg: 'Crew continues to land despite a bird warning', avoid: 'Ask which latent conditions make this act likely.' },
  },
  holeLatent: {
    th: { name: 'Latent condition (เงื่อนไขแฝง)', what: 'ปัญหาที่ฝังอยู่ในระบบมานาน เช่น การออกแบบ งบประมาณ กำลังคน วัฒนธรรมองค์กร ซึ่งรอให้เหตุการณ์มาเจอ (วงรีสีน้ำเงินม่วง)', how: 'เขียนเงื่อนไขของระบบที่ทำให้ชั้นนี้อ่อนแอ', eg: 'ลดงบและกำลังคนควบคุมสัตว์ป่าโดยไม่ประเมินความเสี่ยง', avoid: 'อย่าเขียนเป็นความผิดของคนคนเดียว ให้เขียนเงื่อนไขของระบบ' },
    en: { name: 'Latent condition', what: 'A problem built into the system long before the event: design, budget, staffing, culture (blue-violet oval).', how: 'Describe the system condition that weakens this layer.', eg: 'Wildlife-control budget and staff cut without a risk assessment', avoid: 'Do not write it as one person’s fault; write the system condition.' },
  },
  wall: {
    th: { name: 'ชั้นนี้ป้องกันได้ (แผ่นทึบ)', what: 'ถ้าเลือกเส้นทางอุบัติเหตุแล้วชั้นนี้ไม่มีรูที่เรียงตัว แผนภาพจะแสดงเป็นแผ่นทึบ หมายถึงเส้นทางถูกขวาง', how: 'เลือกรูที่เรียงตัว (aligned) ในแต่ละชั้นเพื่อวาดเส้นทาง', eg: '', avoid: '' },
    en: { name: 'Layer holds (solid wall)', what: 'When a trajectory is chosen and this layer has no aligned hole, it is drawn as a solid wall: the path is blocked.', how: 'Mark one aligned hole per layer to draw the trajectory.', eg: '', avoid: '' },
  },
};

const H = {
  subject: {
    th: { name: 'Liveware ตรงกลาง (L)', what: 'บุคคลหรือตำแหน่งที่เราวิเคราะห์ เป็นศูนย์กลางของโมเดล SHELL (กล่องสีส้มตรงกลาง)', how: 'ระบุบทบาทและขั้นตอนงาน เช่น "นักบินผู้ทำการบินช่วงเข้าใกล้และลงจอด"', eg: 'ช่างซ่อมบำรุงกะกลางคืน', avoid: 'อย่าใส่ชื่อบุคคลจริง ใช้บทบาทแทน' },
    en: { name: 'Central Liveware (L)', what: 'The person or role being analysed, at the centre of the SHELL model (orange box).', how: 'State the role and the phase of work, e.g. "pilot flying during approach and landing".', eg: 'Night-shift maintenance engineer', avoid: 'Use roles, not real names.' },
  },
  focus: {
    th: { name: 'งาน/สถานการณ์ที่วิเคราะห์', what: 'ภารกิจหรือเหตุการณ์ที่ใช้พิจารณา interface ทั้งสี่', how: 'ระบุบริบท เวลา และเงื่อนไขสำคัญ', eg: 'ลงจอดตอนพลบค่ำขณะมีรายงานกิจกรรมนก', avoid: 'อย่ากว้างเกินไป เช่น "การบิน"' },
    en: { name: 'Task / situation analysed', what: 'The task or event used to examine the four interfaces.', how: 'State context, time and key conditions.', eg: 'Landing at dusk while bird activity is reported', avoid: 'Do not be too broad, e.g. "flying".' },
  },
  compS: {
    th: { name: 'S — Software', what: 'สิ่งที่ไม่ใช่ตัวอุปกรณ์แต่กำหนดการทำงาน: ขั้นตอน คู่มือ เช็กลิสต์ กฎ ระเบียบ สัญลักษณ์', how: 'ลิสต์ของที่ผู้ปฏิบัติใช้จริงในงานนี้', eg: 'ขั้นตอน go-around เมื่อมีรายงานนก', avoid: '' },
    en: { name: 'S — Software', what: 'The non-physical things that govern work: procedures, manuals, checklists, rules, symbology.', how: 'List what the person actually uses in this task.', eg: 'Go-around procedure when birds are reported', avoid: '' },
  },
  compH: {
    th: { name: 'H — Hardware', what: 'อุปกรณ์ เครื่องมือ หน้าจอ ตัวควบคุม และสิ่งที่จับต้องได้ที่ใช้ทำงาน', how: 'ลิสต์อุปกรณ์และข้อจำกัดที่เกี่ยวข้อง', eg: 'วิทยุสื่อสาร หน้าจอแสดงข้อมูล', avoid: '' },
    en: { name: 'H — Hardware', what: 'Equipment, tools, displays, controls and other physical items used in the work.', how: 'List the equipment and relevant limitations.', eg: 'Radio, flight displays', avoid: '' },
  },
  compE: {
    th: { name: 'E — Environment', what: 'สภาพแวดล้อมทางกายภาพ (แสง เสียง อุณหภูมิ สภาพอากาศ) และทางองค์กร (เวลา แรงกดดัน วัฒนธรรม)', how: 'ลิสต์เงื่อนไขที่กระทบการทำงานของคน', eg: 'แสงน้อยช่วงพลบค่ำ แรงกดดันด้านตารางเวลา', avoid: '' },
    en: { name: 'E — Environment', what: 'The physical (light, noise, temperature, weather) and organisational (time, pressure, culture) setting.', how: 'List conditions that affect the person’s performance.', eg: 'Low light at dusk; schedule pressure', avoid: '' },
  },
  compL: {
    th: { name: 'L — Other Liveware', what: 'คนอื่นที่ทำงานร่วมหรือเกี่ยวข้อง เช่น ลูกเรือ ผู้ควบคุมจราจร ช่างภาคพื้น หัวหน้า', how: 'ลิสต์บทบาทที่ต้องสื่อสารหรือประสานงาน', eg: 'ผู้ควบคุมจราจรทางอากาศ นักบินผู้ช่วย', avoid: '' },
    en: { name: 'L — Other Liveware', what: 'Other people involved: crew, controllers, ground staff, supervisors.', how: 'List the roles the person must communicate or coordinate with.', eg: 'Air traffic controller; pilot monitoring', avoid: '' },
  },
  iface: {
    th: { name: 'Interface (รอยต่อ L–S, L–H, L–E, L–L)', what: 'จุดที่คนกับองค์ประกอบอื่นทำงานร่วมกัน ปัญหามักเกิดเมื่อสองฝั่ง "ไม่พอดีกัน" (mismatch) เส้นเขียว = พอดี แดง = ไม่พอดี เทา = ยังไม่ประเมิน', how: 'ตั้งสถานะ แล้วเขียนข้อค้นพบพร้อมความรุนแรง มาตรการ และผู้รับผิดชอบ', eg: 'ข้อมูลเตือนนกถึงนักบินช้าและไม่ระบุตำแหน่ง → กำหนดวลีมาตรฐานและเวลาแจ้ง', avoid: 'ข้อค้นพบทุกข้อควรมีมาตรการ และข้อที่รุนแรงควรมีผู้รับผิดชอบ' },
    en: { name: 'Interface (L–S, L–H, L–E, L–L)', what: 'Where the person meets another component. Trouble arises when the two do not fit (mismatch). Green line = match, red = mismatch, grey = not assessed.', how: 'Set the status, then write findings with severity, action and owner.', eg: 'Bird warnings reach the pilot late with no location → standard phrase and timing', avoid: 'Every finding should have an action; severe ones need an owner.' },
  },
};


const HFH = {
  hfEvent: {
    th: { name: 'เหตุการณ์ที่วิเคราะห์ (occurrence)', what: 'เหตุการณ์หรือสภาพที่เรานำมาจัดหมวดปัจจัยมนุษย์ เป็นปลายทางของทุกปัจจัยในภาพ', how: 'เขียนสิ่งที่เกิดขึ้นเป็นข้อเท็จจริง สั้น ชัด ไม่ใส่สาเหตุ', eg: 'เครื่องบินไถลออกนอกปลายทางวิ่งขณะลงจอด (ตัวอย่างสมมติ)', avoid: 'อย่าเขียนข้อสรุปว่าใครผิด' },
    en: { name: 'Occurrence analysed', what: 'The event or condition whose human factors you are classifying; the end point of every factor in the picture.', how: 'State what happened as a fact: short, clear, without causes.', eg: 'Aircraft ran off the end of the runway on landing (invented example)', avoid: 'Do not write a conclusion about who was at fault.' },
  },
  hfFactor: {
    th: { name: 'ปัจจัย (factor)', what: 'เงื่อนไขหรือข้อเท็จจริงหนึ่งข้อที่พบในการสืบสวน และจัดเข้าหมวด HFACS หนึ่งหมวด', how: 'เขียนสภาพของระบบ ระบุหลักฐาน แล้วถามต่อว่า "ทำไมสิ่งนี้จึงเกิดได้" เพื่อหาปัจจัยระดับที่สูงกว่า', eg: 'ลดชั่วโมงฝึกในเครื่องฝึกบินประจำปี (ตัวอย่างสมมติ)', avoid: 'อย่าจัดหมวดโดยไม่มีหลักฐาน และอย่าหยุดที่การกระทำของคนหน้างาน' },
    en: { name: 'Factor', what: 'One condition or fact found in the investigation, placed in one HFACS category.', how: 'Write the state of the system, record the evidence, then ask "why could this happen?" to find higher-level factors.', eg: 'Recurrent simulator hours were reduced (invented example)', avoid: 'Do not classify without evidence, and do not stop at the act of the person at the sharp end.' },
  },
  hfViolation: {
    th: { name: 'ปัจจัยประเภทการฝ่าฝืน (violation)', what: 'การจงใจละเลยกฎ แยกจาก "ข้อผิดพลาด" ที่ไม่ได้ตั้งใจ ใช้ได้กับการกระทำที่ไม่ปลอดภัยและกับผู้กำกับดูแล (เส้นประสีแดง)', how: 'ใช้เมื่อมีหลักฐานว่าตั้งใจเลี่ยงกฎ และดูต่อว่ากฎถูกปล่อยผ่านโดยผู้มีอำนาจหรือไม่', eg: '', avoid: 'อย่าเรียกว่า violation ถ้าไม่มีหลักฐานเรื่องความตั้งใจ' },
    en: { name: 'Factor classified as a violation', what: 'Wilful disregard of a rule, as opposed to an unintended error. Applies to unsafe acts and to supervisors (red dashed outline).', how: 'Use it only when evidence shows the rule was knowingly bypassed; then ask whether authority tolerated it.', eg: '', avoid: 'Do not call something a violation without evidence of intent.' },
  },
  hfCell: {
    th: { name: 'หมวด HFACS', what: 'HFACS แบ่งปัจจัยมนุษย์เป็น 4 ระดับ จากบนลงล่าง: อิทธิพลระดับองค์กร → การกำกับดูแล → เงื่อนไขก่อนเกิดการกระทำ → การกระทำที่ไม่ปลอดภัย แต่ละระดับมีหมวดย่อย (รวม 17 หมวดตามรายงาน FAA ปี 2000)', how: 'วางเมาส์บนหมวดเพื่อดูคำอธิบายสั้น ๆ หมวดที่ว่างหมายถึงยังไม่ได้ตรวจหรือไม่พบ ไม่ได้แปลว่าไม่มีปัญหา', eg: '', avoid: '' },
    en: { name: 'HFACS category', what: 'HFACS splits human factors into four levels, top to bottom: organisational influences → supervision → preconditions → unsafe acts. Each has categories (17 in the 2000 FAA report).', how: 'Hover a category for a short definition. An empty category means not examined or none found; it does not mean no problem.', eg: '', avoid: '' },
  },
};
const STH = {
  stSystem: {
    th: { name: 'ระบบและขอบเขต', what: 'ระบบที่วิเคราะห์ และเส้นแบ่งว่าอะไรอยู่ในระบบ อะไรเป็นสภาพแวดล้อม', how: 'ระบุวัตถุประสงค์ของระบบและขอบเขตให้ชัด', eg: 'ระบบเบรกขณะลงจอดของอากาศยาน (ตัวอย่างสมมติ)', avoid: 'อย่ากว้างจนวิเคราะห์ไม่ได้' },
    en: { name: 'System and boundary', what: 'The system analysed and the line between what is inside it and what is environment.', how: 'State the purpose of the system and its boundary clearly.', eg: 'Landing deceleration system of an aircraft (invented example)', avoid: 'Do not make it so broad it cannot be analysed.' },
  },
  stLoss: {
    th: { name: 'Loss (ความสูญเสีย)', what: 'ผลลัพธ์ที่ผู้มีส่วนได้ส่วนเสียไม่ยอมรับ เช่น การเสียชีวิต ความเสียหายต่อทรัพย์สิน การเสียภารกิจ', how: 'เขียนผลลัพธ์ ไม่ใช่สาเหตุ', eg: 'ผู้โดยสารบาดเจ็บ (ตัวอย่างสมมติ)', avoid: 'อย่าเขียนเป็นความล้มเหลวของชิ้นส่วน' },
    en: { name: 'Loss', what: 'An outcome stakeholders find unacceptable: loss of life, damage, loss of mission.', how: 'Write the outcome, not a cause.', eg: 'Passengers injured (invented example)', avoid: 'Do not write a component failure here.' },
  },
  stHazard: {
    th: { name: 'Hazard (ระดับระบบ)', what: 'สถานะของระบบที่ เมื่อรวมกับสภาพแวดล้อมที่แย่ที่สุด จะนำไปสู่ Loss เป็นสิ่งที่เราควบคุมได้ในการออกแบบ', how: 'เขียนเป็นสถานะของระบบ แล้วผูกกับ Loss และเขียนข้อกำหนดความปลอดภัย (constraint) ที่คู่กัน', eg: 'อากาศยานไม่ชะลอความเร็วได้เพียงพอบนทางวิ่ง (ตัวอย่างสมมติ)', avoid: 'อย่าเขียนเป็นสาเหตุหรือเป็นการกระทำ' },
    en: { name: 'Hazard (system-level)', what: 'A system state that, together with worst-case environment conditions, leads to a loss. It is something we can control by design.', how: 'Write a system state, link it to losses, and write the matching safety constraint.', eg: 'Aircraft cannot decelerate enough on the runway (invented example)', avoid: 'Do not write a cause or an action.' },
  },
  stController: {
    th: { name: 'Controller', what: 'ผู้หรือสิ่งที่ตัดสินใจและสั่งการ อาจเป็นคน ซอฟต์แวร์ หรือองค์กร ใช้ process model ในการเลือกคำสั่ง', how: 'วางระดับ (0 = บนสุด) และเขียน process model: สิ่งที่มันเชื่อว่าเป็นสถานะของกระบวนการ', eg: 'หน่วยควบคุมเบรก (ซอฟต์แวร์)', avoid: 'อุบัติเหตุมักเกิดเมื่อ process model ผิด ไม่ใช่แค่ชิ้นส่วนเสีย' },
    en: { name: 'Controller', what: 'Who or what decides and commands: a person, software or an organisation. It uses a process model to choose control actions.', how: 'Set its level (0 = top) and write the process model: what it believes about the state of the process.', eg: 'Brake control unit (software)', avoid: 'Accidents often arise when the process model is wrong, not only when a part breaks.' },
  },
  stProcess: {
    th: { name: 'Controlled process', what: 'สิ่งที่ถูกควบคุม อยู่ล่างสุดของโครงสร้าง', how: 'ระบุกระบวนการหรืออุปกรณ์ที่ได้รับคำสั่งและส่ง feedback กลับ', eg: 'การชะลอความเร็วของอากาศยาน', avoid: '' },
    en: { name: 'Controlled process', what: 'What is being controlled, at the bottom of the structure.', how: 'Name the process or equipment that receives commands and returns feedback.', eg: 'Aircraft deceleration', avoid: '' },
  },
  stAction: {
    th: { name: 'Control action', what: 'คำสั่งจาก controller ไปยังผู้ถูกควบคุม วาดเป็นลูกศรทึบลงล่าง แต่ละคำสั่งนำไปวิเคราะห์ UCA ได้', how: 'เขียนเป็นคำสั่ง เช่น "สั่งเบรก" และเลือกต้นทาง/ปลายทาง', eg: 'ปล่อยเบรกล้อ', avoid: '' },
    en: { name: 'Control action', what: 'A command from a controller to what it controls, drawn as a solid arrow going down. Each one can be analysed for UCAs.', how: 'Write it as a command, e.g. "apply brakes", and choose source and target.', eg: 'Apply wheel brakes', avoid: '' },
  },
  stFeedback: {
    th: { name: 'Feedback', what: 'ข้อมูลที่ controller ได้รับกลับมา ใช้ปรับ process model วาดเป็นเส้นประขึ้นบน', how: 'ระบุข้อมูลที่ส่งกลับและจากใคร ถ้า controller ไม่มี feedback ให้ถามว่ามันรู้สถานะได้อย่างไร', eg: 'ความเร็วล้อ', avoid: '' },
    en: { name: 'Feedback', what: 'Information a controller receives back; it updates the process model. Drawn as a dashed arrow going up.', how: 'Name the information and where it comes from. If a controller gets no feedback, ask how it knows the state.', eg: 'Wheel speed', avoid: '' },
  },
  stUca: {
    th: { name: 'Unsafe control action (UCA)', what: 'control action ที่ในบริบทหนึ่งนำไปสู่ hazard มี 4 ชนิด: ไม่ได้สั่ง / สั่งแล้วไม่ปลอดภัย / เร็วหรือช้าหรือผิดลำดับ / หยุดเร็วหรือนานเกินไป', how: 'เลือกชนิด เขียนบริบท ผูกกับ hazard และเขียนข้อกำหนดของ controller', eg: 'ไม่สั่งเบรกหลังแตะพื้นขณะทางวิ่งเปียก (ตัวอย่างสมมติ)', avoid: 'ช่องว่างในตารางไม่ได้แปลว่าปลอดภัย แปลว่ายังไม่ได้วิเคราะห์หรือไม่พบ' },
    en: { name: 'Unsafe control action (UCA)', what: 'A control action that, in a given context, leads to a hazard. Four types: not provided / provided and unsafe / too early, too late or out of order / stopped too soon or applied too long.', how: 'Pick the type, write the context, link the hazards and write the controller constraint.', eg: 'Brakes not commanded after touchdown on a wet runway (invented example)', avoid: 'An empty cell does not mean safe; it means not analysed or none found.' },
  },
  stScenario: {
    th: { name: 'Causal scenario', what: 'คำอธิบายว่า UCA นี้เกิดได้อย่างไร เช่น process model ผิด feedback หาย หรือคำสั่งไม่ถึงปลายทาง', how: 'เขียนเป็นเรื่องสั้น ๆ ที่ตรวจสอบได้ แล้วจึงคิดมาตรการ', eg: '', avoid: 'อย่าข้ามไปที่มาตรการก่อนเข้าใจสาเหตุ' },
    en: { name: 'Causal scenario', what: 'An explanation of how the UCA could happen: a wrong process model, missing feedback, a command that never arrives.', how: 'Write a short, checkable story, then think about measures.', eg: '', avoid: 'Do not jump to measures before understanding the cause.' },
  },
};

export const HELP = { bowtie: B, swiss: S, shell: H, hfacs: HFH, stamp: STH };

/** Short one-line explanation for tooltips. */
export function explainShort(type, kind, lang) {
  const h = HELP[type] && HELP[type][kind] && HELP[type][kind][lang];
  return h ? h.what : '';
}

export function helpFor(type, kind, lang) {
  return (HELP[type] && HELP[type][kind] && HELP[type][kind][lang]) || null;
}

/** Order shown in the glossary. */
export const GLOSSARY_ORDER = {
  bowtie: ['hazard', 'topEvent', 'threat', 'consequence', 'control', 'escalation', 'escalationControl'],
  swiss: ['hazard', 'loss', 'layer', 'holeActive', 'holeLatent', 'wall'],
  shell: ['subject', 'focus', 'compS', 'compH', 'compE', 'compL', 'iface'],
  hfacs: ['hfEvent', 'hfFactor', 'hfViolation', 'hfCell'],
  stamp: ['stSystem', 'stLoss', 'stHazard', 'stController', 'stProcess', 'stAction', 'stFeedback', 'stUca', 'stScenario'],
};

export const MODEL_INTRO = {
  bowtie: {
    th: 'Bowtie แสดงหนึ่ง hazard และหนึ่ง top event ตรงกลาง ซ้ายคือสาเหตุ (threats) พร้อมมาตรการป้องกัน ขวาคือผลที่ตามมา (consequences) พร้อมมาตรการแก้ไข เหมาะกับการดูว่า "เรามีมาตรการอะไร และแข็งแรงแค่ไหน"',
    en: 'A bowtie shows one hazard and one top event in the centre; causes (threats) with preventive controls on the left, outcomes (consequences) with recovery controls on the right. Use it to see which controls exist and how strong they are.',
  },
  swiss: {
    th: 'Swiss cheese (Reason) มองระบบเป็นแผ่นป้องกันหลายชั้น แต่ละชั้นมีรู (จุดอ่อน) อุบัติเหตุเกิดเมื่อรูในทุกชั้นเรียงตัวกัน รูมี 2 แบบ: active failure (การกระทำขณะปฏิบัติ) และ latent condition (เงื่อนไขแฝงของระบบ) เหมาะกับการสอบสวนเหตุการณ์และหาสาเหตุเชิงระบบ',
    en: 'The Swiss cheese model (Reason) sees defences as layered slices, each with holes (weaknesses). A loss occurs when holes in every layer line up. Holes are active failures (acts at the sharp end) or latent conditions (built into the system). Good for investigation and system-level causes.',
  },
  shell: {
    th: 'SHELL (ปัจจัยมนุษย์) วางคนไว้ตรงกลาง (Liveware) ล้อมด้วย Software, Hardware, Environment และ Liveware อื่น ปัญหามักอยู่ที่รอยต่อที่ไม่พอดีกัน เหมาะกับการดูปัจจัยมนุษย์ในงานหนึ่งๆ  หมายเหตุ: "Shell" นี้คือโมเดลปัจจัยมนุษย์ ไม่ใช่ bowtie ของบริษัท Shell',
    en: 'SHELL (human factors) puts the person (Liveware) at the centre, surrounded by Software, Hardware, Environment and other Liveware. Problems sit at interfaces that do not fit. Use it to examine human factors in a task. Note: this is the human-factors SHELL model, not Shell the company’s bowtie.',
  },
};

MODEL_INTRO.hfacs = {
  th: 'HFACS (Shappell และ Wiegmann) ใช้จัดหมวดปัจจัยมนุษย์ของเหตุการณ์ 4 ระดับ: อิทธิพลระดับองค์กร → การกำกับดูแล → เงื่อนไขก่อนเกิดการกระทำ → การกระทำที่ไม่ปลอดภัย สร้างต่อจากแนวคิดเงื่อนไขแฝงของ Reason ใช้ตอบว่า "ทำไมการกระทำนี้จึงเกิดได้" ไม่ใช่โมเดลมาตรการควบคุม และไม่ให้ความน่าจะเป็น (ตามรายงาน FAA DOT/FAA/AM-00/7 ปี 2000)',
  en: 'HFACS (Shappell and Wiegmann) classifies the human factors behind an occurrence in four levels: organisational influences → supervision → preconditions → unsafe acts. It builds on Reason’s latent-condition idea and answers "why could this act happen?". It is not a barrier model and gives no probabilities (after the 2000 FAA report DOT/FAA/AM-00/7).',
};
MODEL_INTRO.stamp = {
  th: 'STAMP มองความปลอดภัยเป็นปัญหาการควบคุม: อุบัติเหตุเกิดจากการควบคุมที่ไม่เพียงพอ (สั่งผิด ไม่สั่ง หรือ process model ผิด) ไม่ใช่แค่ชิ้นส่วนเสีย STPA คือวิธีวิเคราะห์: Loss → Hazard → โครงสร้างการควบคุม → Unsafe control action → Causal scenario (อ้างอิง Leveson 2012 และเอกสาร MIT 16.63J) โมเดลนี้ไม่มีความน่าจะเป็นหรือคะแนน',
  en: 'STAMP sees safety as a control problem: accidents come from inadequate control (wrong, missing or mistimed commands, or a wrong process model), not only from broken parts. STPA is the analysis: losses → hazards → control structure → unsafe control actions → causal scenarios (after Leveson 2012 and MIT 16.63J notes). This model has no probabilities or scores.',
};
