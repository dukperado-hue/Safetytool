// Safetytool — Thai wording for the engine's English messages (path reasons, warnings, notes, limitations).
// The engine and the CLI keep emitting English (stable, testable); the UI and the report pass text through here.
// Pure, no DOM. A message with no rule is returned unchanged — never dropped, never guessed.

const RULES = [
  // path / stage reasons (scenario.js seriesResult)
  [/^Cut by (.+) under the series rule \(one working barrier is enough\)\.$/, (m) => `ถูกตัดโดย ${m[1]} ตามกฎอนุกรม (มี Barrier ที่ทำงานอยู่ 1 ตัวก็เพียงพอ)`],
  [/^No barrier is set to block, and (.+) cannot be resolved\. More information is needed; this does not mean the barrier failed\.$/, (m) => `ไม่มี Barrier ใดตั้งเป็นตัดได้ และ ${m[1]} ยังสรุปไม่ได้ ต้องการข้อมูลเพิ่ม ไม่ได้หมายความว่า Barrier ล้มเหลว`],
  [/^Every barrier on the path is set to fail: (.+)\.$/, (m) => `ทุก Barrier บนเส้นทางถูกตั้งเป็นล้มเหลว: ${m[1]}`],
  [/^The path has no barriers\.$/, () => 'เส้นทางนี้ไม่มี Barrier'],
  // warnings (scenario.js / bowtie-analysis.js)
  [/^V-03 barrier (.+) is not on any edge \(it cannot affect any path\)$/, (m) => `V-03 Barrier ${m[1]} ไม่ได้อยู่บนเส้นใดเลย (จึงไม่มีผลกับเส้นทางใด)`],
  [/^V-05 (?:control|barrier) (.+) (?:has no known state|is unknown): (?:paths through it can only be inconclusive|affected paths will be inconclusive)$/, (m) => `V-05 Control ${m[1]} ยังไม่ทราบสถานะ เส้นทางที่ผ่าน Control นี้จะสรุปไม่ได้`],
  [/^V-06 (?:control|barrier) (.+) is degraded without logic: (?:paths through it|affected paths) will be inconclusive$/, (m) => `V-06 Control ${m[1]} เสื่อมสภาพแต่ยังไม่ระบุว่ายังตัดเส้นทางได้หรือไม่ เส้นทางที่ผ่านจะสรุปไม่ได้`],
  [/^E-01 OBSERVED evidence (.+) has no source; an observation needs a traceable source$/, (m) => `E-01 หลักฐาน OBSERVED ${m[1]} ไม่มีแหล่งที่มา ข้อสังเกตต้องมีแหล่งที่ตรวจสอบย้อนได้`],
  [/^E-02 OBSERVED evidence (.+) has neither a reference nor a date$/, (m) => `E-02 หลักฐาน OBSERVED ${m[1]} ไม่มีทั้งเอกสารอ้างอิงและวันที่`],
  [/^E-03 hypothesis (.+) has no way to verify it$/, (m) => `E-03 สมมติฐาน ${m[1]} ยังไม่มีวิธีตรวจสอบ`],
  [/^E-04 assumption (.+) has no owner \(who proposed it\)$/, (m) => `E-04 สมมติฐาน ${m[1]} ยังไม่ระบุผู้เสนอ`],
  // barrier assurance and corrective actions (actions.js)
  [/^V-A10 control (.+) is marked effective but no OBSERVED evidence is linked; an effective state should rest on evidence$/, (m) => `V-A10 Control ${m[1]} ถูกตั้งเป็น effective แต่ยังไม่มีหลักฐาน OBSERVED ผูกอยู่ สถานะ effective ควรมีหลักฐานรองรับ`],
  [/^V-A11 control (.+): the review date (.+) has passed; the state may be stale$/, (m) => `V-A11 Control ${m[1]}: เลยกำหนดทบทวน ${m[2]} แล้ว สถานะอาจล้าสมัย`],
  [/^V-A24 action (.+) is not linked to a barrier(?: \(its barrier "(.*)" was deleted\))?$/, (m) => `V-A24 มาตรการ ${m[1]} ไม่ได้ผูกกับ Barrier ใด${m[2] !== undefined ? ` (Barrier "${m[2]}" ถูกลบไปแล้ว)` : ''}`],
  [/^V-A28 action (.+) is overdue \(due (.+)\)$/, (m) => `V-A28 มาตรการ ${m[1]} เลยกำหนด (กำหนด ${m[2]})`],
  [/^V-A29 action (.+) has no responsible role$/, (m) => `V-A29 มาตรการ ${m[1]} ยังไม่ระบุผู้รับผิดชอบ`],
  [/^V-A30 control (.+) is (degraded|failed) and has no corrective action recorded$/, (m) => `V-A30 Control ${m[1]} เป็น ${m[2]} และยังไม่มีมาตรการแก้ไขบันทึกไว้`],
  // comparison notes (scenario.js compareRuns)
  [/^The graph structure differs between the two scenarios; path counts are not like-for-like and must not be read as a change in risk\.$/, () => 'โครงสร้างกราฟของสองโมเดลต่างกัน จำนวนเส้นทางจึงเทียบกันตรง ๆ ไม่ได้ และห้ามอ่านเป็นการเปลี่ยนแปลงของความเสี่ยง'],
  [/^V-08 the runs used different model versions \((.+) vs (.+)\)\.$/, (m) => `V-08 สองการรันใช้เวอร์ชันโมเดลต่างกัน (${m[1]} กับ ${m[2]})`],
  [/^(\d+) path result\(s\) are inconclusive; the comparison is incomplete for those paths\.$/, (m) => `ผลของ ${m[1]} เส้นทางยังสรุปไม่ได้ การเปรียบเทียบจึงไม่ครบสำหรับเส้นทางเหล่านั้น`],
  // limitations
  [/^Logical path model only: no probabilities, frequencies or severities are computed\.$/, () => 'เป็นแบบจำลองเส้นทางเชิงตรรกะเท่านั้น ไม่ได้คำนวณความน่าจะเป็น ความถี่ หรือความรุนแรง'],
  [/^Barrier states are user-defined inputs, not evidence that the real control behaves that way\.$/, () => 'สถานะของ Barrier เป็นข้อมูลที่ผู้ใช้กำหนด ไม่ใช่หลักฐานว่า Control จริงทำงานเช่นนั้น'],
  [/^Barriers are treated as independent; common-cause failure is not modelled unless the graph shows it\.$/, () => 'Barrier ถูกมองว่าเป็นอิสระต่อกัน ความล้มเหลวจากสาเหตุร่วมไม่ถูกจำลอง เว้นแต่กราฟแสดงไว้'],
  [/^A change in path count is a Path Count Difference, not a risk reduction\.$/, () => 'จำนวนเส้นทางที่เปลี่ยนไปคือ “ผลต่างของจำนวนเส้นทาง” ไม่ใช่การลดความเสี่ยง'],
  [/^Top-event reach does not mean the top event or any consequence will occur; it means no modelled barrier is set to stop it\.$/, () => 'การ “ไปถึง” Top event ไม่ได้หมายความว่า Top event หรือ Consequence ใดจะเกิดขึ้น แต่หมายความว่าไม่มี Barrier ในโมเดลที่ตั้งไว้ว่าจะหยุดมัน'],
];

/** Thai text for an engine message when lang is 'th' and a rule matches; otherwise the original string. */
export function localizeMsg(text, lang) {
  if (lang !== 'th' || typeof text !== 'string') return text;
  for (const [re, fn] of RULES) {
    const m = re.exec(text);
    if (m) return fn(m);
  }
  return text;
}

export const MSG_RULE_COUNT = RULES.length;
