# Safetytool

เครื่องมือบนเว็บ **ฟรี** สำหรับสร้างโมเดลความปลอดภัยทางการบิน เริ่มจาก **Bowtie** และจะเพิ่ม Fault tree, Swiss cheese, Shell model ต่อไป
เป้าหมายคือให้คณะกรรมการ (เช่น Wildlife Hazard Management Committee), งานด้าน airborne object/UAS และนักวิจัยใช้สร้างโมเดลที่ตรวจสอบย้อนกลับได้และอ้างอิงใน paper ได้

A free, browser-based workbench for aviation-safety models (bowtie first). No server, no account, no tracking; data stays in your browser or in a JSON file you control.

> เครื่องมือช่วยคิดและสื่อสาร ผลลัพธ์ต้องผ่านการพิจารณาโดยผู้เชี่ยวชาญ ไม่ใช่คำแนะนำด้านความปลอดภัยที่รับรองแล้ว
> A thinking and communication aid, not certified safety advice.

## สถานะ (v0.2.0)

- **3 โมเดล:** Bowtie · **Swiss cheese** (ชั้นป้องกัน, active failure / latent condition, เส้นทางอุบัติเหตุ) · **SHELL** (ปัจจัยมนุษย์: Liveware ตรงกลาง + Software/Hardware/Environment/Liveware อื่น และ interface L–S, L–H, L–E, L–L) — Fault tree ยังไม่ได้ทำ
- **โหมดช่วยเหลือ** (แท็บ "ช่วยเหลือ" ด้านขวา เปิด-ปิดได้): ป้ายชนิดบนทุกกล่อง, คำอธิบายเมื่อชี้/เลือกกล่อง, อภิธานศัพท์ว่าแต่ละกล่องคืออะไร เขียนอย่างไร ตัวอย่าง และสิ่งที่ควรหลีกเลี่ยง
- **การตัดคำภาษาไทย:** ใช้ `Intl.Segmenter` + กติกาการขึ้นบรรทัด (ไม่ทิ้ง "(" ท้ายบรรทัด, ไม่ขึ้นบรรทัดด้วยสระ/วรรณยุกต์/ๆ) + ตัวสำรองเมื่อเบราว์เซอร์ไม่มี Segmenter + วัดความกว้างด้วย canvas จริง
- พิมพ์/บันทึก PDF แบบ vector (ปุ่ม "พิมพ์ / PDF") และ PNG ความละเอียด 3 เท่า
- ตัวแก้ไข Bowtie: Hazard, Top event, Threats, Consequences, Preventive/Recovery controls, Escalation factors และ controls ของมัน
- จัดวางแผนภาพอัตโนมัติ รองรับข้อความไทย ซูม/เลื่อนได้ มีมุมมอง **ตาราง** ที่เทียบเท่าแผนภาพ (สำหรับโปรแกรมอ่านหน้าจอ)
- ประเมิน control ด้วย Adequacy × Reliability (สเกล 1–4 ของเราเอง), critical, function, type, owner
- **ตรวจคุณภาพ 17 กติกา** (เช่น threat ที่จริงคือ control ล้มเหลว, escalation factor ที่แค่ปฏิเสธ control, single point of failure)
- นำเข้า/ส่งออก JSON (`safetytool.bowtie/1`), SVG, PNG, CSV · เลิกทำ/ทำซ้ำ · บันทึกอัตโนมัติในเบราว์เซอร์
- ตัวอย่าง: `data/example-wildlife.json` (เขียนเอง ไม่ใช่ข้อมูลจริงของหน่วยงานใด)

## ใช้งาน

```
node cli/serve.js          # เปิด http://127.0.0.1:8765/
npm test                   # 16 unit tests (Node >= 20, ไม่มี dependency)
node cli/safetytool.js validate data/example-wildlife.json
node cli/safetytool.js lint data/example-wildlife.json --json
node cli/safetytool.js outline data/example-wildlife.json
```

เว็บเป็นไฟล์สถิตล้วน (HTML/CSS/ES modules) จึงโฮสต์บน GitHub Pages ได้โดยไม่ต้อง build

## ให้ Claude ช่วยงานได้แม่นยำ

อ่าน [`AGENTS.md`](AGENTS.md) (และ `CLAUDE.md`) — กำหนดกติกา "ห้ามเดา ห้ามคัดลอก", ลูปตรวจ `validate → lint → outline`, และ schema ที่เครื่องอ่านได้ใน `schema/bowtie.schema.json`
Claude ทำงานกับไฟล์โมเดลและ CLI โดยตรง ไม่ต้องพึ่งภาพหน้าจอ

## ที่มาและสิทธิ์

ดู [`docs/SOURCES.md`](docs/SOURCES.md) · โครงการนี้ใช้ **วิธี Bowtie** ซึ่งเป็นแนวคิดสาธารณะ แต่ **ไม่ใช้** ซอฟต์แวร์ คู่มือ เทมเพลต หรือรูปแบบไฟล์ของ BowTieXP, UK CAA หรือ CASA
**ใบอนุญาต: ยังไม่กำหนด** (รอเจ้าของโครงการเลือก ก่อนเผยแพร่) · ข้อเสนอ: โค้ด MIT หรือ Apache-2.0, เนื้อหา/ตัวอย่าง CC BY 4.0

## แผนต่อ

ดู [`docs/ROADMAP.md`](docs/ROADMAP.md)
