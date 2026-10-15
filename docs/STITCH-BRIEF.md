# Stitch design brief — Safetytool (aviation safety models workbench)

How to use this file with Google Stitch
1. Paste **Section 1 (Master prompt)** first so every screen shares one design language.
2. Then paste **one screen prompt at a time** from Section 4 (Stitch works best one screen per prompt). Ask for "desktop, 1440 x 900" unless stated.
3. Use Section 3 (design tokens) to correct drift: if Stitch changes a colour or font, paste the token table back.
4. Ask Stitch for light and dark variants of each screen only after the light version is approved.
5. Everything on screen is **real content from the product** (Section 5). Do not let Stitch invent statistics, airline names, regulator logos or stock photos of aircraft.

Language: write prompts in English (Stitch follows English best). The UI itself is **bilingual Thai + English**; show Thai as the primary label with English technical terms kept in English (Hazard, Top event, Threat, Barrier). Thai needs a Thai-capable font and slightly taller line height (1.6).

---

## 1. Master prompt (paste first)

> Design a desktop-first web app called **Safetytool**: a free workbench where aviation safety practitioners build and test **bow-tie**, **Swiss-cheese** and **SHELL** models, then run a **what-if simulation** of which hazard-to-consequence paths are cut or still open when barriers fail. Users: safety managers, SMS inspectors, wildlife-hazard committees, trainers and researchers. It must feel like a **calm, precise instrument for committees and papers** — not a flashy dashboard and not a toy.
>
> Visual language: warm light-grey canvas (#F5F4F1), white panels with 1px hairline borders and 8px radius, deep navy ink (#14202E), one accent colour — aviation blue (#1F5FBF). Generous whitespace, strong typographic hierarchy, thin 1.5px line work for diagrams, no gradients, no drop shadows heavier than a 1px hairline plus a very soft 0 1px 2px shadow, no illustrations of aircraft, no stock photos. Typefaces: **IBM Plex Sans** with **IBM Plex Sans Thai** for Thai, **IBM Plex Mono** for IDs and codes. Base 15px, Thai line-height 1.6.
>
> Status must never rely on colour alone: every status uses a **colour + a distinct shape/icon + a text label**. Cut = green filled square/shield "■ ถูกตัด / cut"; Open (not cut) = red triangle "▲ ยังไม่ถูกตัด / not cut"; Inconclusive = amber dashed-outline circle with "?" "สรุปไม่ได้ / inconclusive". Barrier states: effective ✓ solid, degraded ◐ half-filled, failed ✕, unknown ? dashed.
>
> Always show a quiet persistent footer line: "A thinking and communication aid. Results need expert review and are not certified safety advice." Never use the words "safe", "risk reduced" or percentages for path counts — use "Path Count Difference".
>
> Layout shell for all screens: top bar (brand, model switcher Bowtie | Swiss cheese | SHELL, small tool buttons, language TH/EN, light/dark), a slim tab row above the canvas, the canvas on the left (about 70%), and a right panel (about 30%) with four tabs: **Details · Quality · Guide/Help · Gallery**. Footer with disclaimer and a small online/offline indicator dot. Keep the number of menus minimal; no left sidebar.
>
> Accessibility: WCAG AA contrast, visible 2px focus ring in the accent colour, keyboard operable, every diagram has a table equivalent. Touch targets at least 36px even on desktop.

---

## 2. Product concept in one page (give Stitch as context)

**What it does**
- **Bow-tie:** one **Hazard** and one **Top event** in the centre; **Threats** (causes) on the left with **preventive controls** (barriers) between each threat and the top event; **Consequences** on the right with **recovery controls**; **Escalation factors** hang under a control (why it may weaken) with their own controls.
- **Simulate (what-if):** the user sets each control to *effective / degraded / failed / unknown*. The engine says, for each route, **cut / not cut / inconclusive**, with a plain-language reason. One working barrier on a route cuts it. *Unknown never means failed.* Results are path logic, **not a risk estimate**.
- **ERC (Event Risk Classification) panel:** analyst answers two questions — (1) most probable accident outcome, (2) effectiveness of remaining barriers — and reads a score from a 4×4 matrix (top-right 2500) with three colours. The tool never computes the answers.
- **Swiss cheese:** layered defences with holes; hole = *active failure* or *latent condition*; layers that share a common cause are flagged as **not independent**.
- **SHELL:** Liveware at the centre; interfaces to Software, Hardware, Environment, other Liveware marked match / mismatch / unknown, with findings.
- **Guide:** a step-by-step coach inside the right panel that starts when the user presses New (Hazard → Top event → Threats → Consequences → Controls → Escalation → Simulate → Save).
- **Gallery:** saved work (browser-local) and shipped examples, with thumbnails.
- Works **online and offline**.

**Tone of voice:** plain, careful, non-alarmist, never blaming individuals. Describe roles, not names.

**Design principles**
1. *Evidence over decoration* — every number or status can be traced to an input.
2. *Say what is unknown* — an explicit "unknown / inconclusive" is a first-class state, never hidden.
3. *One screen, one job* — diagram canvas dominant, one right panel for context.
4. *Calm colour* — saturated colour is reserved for status and for the five diagram element kinds.
5. *Readable Thai* — never truncate Thai mid-word; wrap boxes, don't shrink fonts below 13px.

---

## 3. Design tokens (give Stitch to lock the system)

| Token | Light | Dark |
|---|---|---|
| canvas | #F5F4F1 | #0E1319 |
| panel | #FFFFFF | #151C25 |
| ink | #14202E | #E8EDF3 |
| muted | #5B6675 | #9AA6B5 |
| hairline | #D8DCE2 | #2B3644 |
| accent (aviation blue) | #1F5FBF | #7FB0FF |
| callout bg | #EEF4FF | #16243A |
| **cut** (green) | #1E7B45 | #5CC987 |
| **not cut / open** (red) | #C62828 | #FF8A80 |
| **inconclusive** (amber) | #B26A00 | #F2B35E |
| **unknown barrier** (grey dashed) | #6B7785 | #8793A2 |

Diagram element kinds (fills are pale, borders are the strong colour, text is ink):
| Kind | Border | Fill | Shape |
|---|---|---|---|
| Hazard | #B8860B | #FFF6D6 | rounded rectangle, label "HAZARD" |
| Top event | #C0501F | #FDE7DC | larger rounded rectangle, 2px border, label "TOP EVENT" |
| Threat | #3B6EA8 | #E6EEF8 | rounded rectangle, left side |
| Consequence | #8A3B6E | #F6E6F0 | rounded rectangle, right side |
| Control (barrier) | slate #475569 | white | slim vertical bar crossing the path, with a strength meter below |
| Escalation factor | #6D4AA8 | #EFE8FA | small box under a control; its control uses a dashed border |

ERC colours (exactly three, from the organisation's matrix): red #E00000 (white text), yellow #FFE600 (black text), green #9ACD00 (black text), each with icon ▲ ◆ ■ and the colour name in text.

Type scale: 12 / 13 / 15 / 17 / 20 / 26. Spacing 4 / 8 / 12 / 16 / 24 / 32. Radius 8 (panels), 6 (buttons), 999 (status pills). Motion: 120 ms ease-out for state changes; no bouncing; respect reduced-motion.

---

## 4. Screen prompts (paste one at a time)

### S1 — Home / Gallery (first screen a visitor sees)
> Using the Safetytool design system, design the **home state**: the diagram canvas shows a friendly empty state with a thin-line abstract bow-tie outline (no illustration of aircraft) and the heading "เริ่มสร้างโมเดลแรกของคุณ / Start your first model" with a primary button "ใหม่ + คู่มือทีละขั้น / New + guided steps" and secondary "เปิดตัวอย่าง / Open an example". The right panel is on the **Gallery** tab: a top primary button "บันทึกงานปัจจุบันลงคลัง / Save current work to gallery", a section "งานของฉัน (เก็บในเบราว์เซอร์นี้) / My work" with 3 cards, a section "ตัวอย่างประกอบ / Examples" with 3 cards. Each card: 96×64 thumbnail of the diagram, bold title, a quiet line "Bowtie · 2026-10-15", buttons Open and Delete. Below, a muted note that work is stored only in this browser and to use Save for a file backup. Footer shows the disclaimer and a green dot "ออนไลน์ / online".

### S2 — Bow-tie canvas with the Guide (the core screen)
> Design the **bow-tie editor** with the **Guide** open on step 4 of 9 "Threat". Canvas: HAZARD box top centre (text "ฝูงนกในและรอบทางวิ่ง / Flocks of birds on and around the runway"); TOP EVENT box in the centre ("ฝูงนกอยู่ในเส้นทางของอากาศยานขณะขึ้น-ลง"); four THREAT boxes stacked on the left, each joined to the top event by a curved 1.5px line crossing 1–2 slim vertical **control bars** each with a small strength meter (four segments) and a tiny owner initial-role tag; three CONSEQUENCE boxes on the right with recovery control bars; two purple ESCALATION boxes hanging under controls, one with a dashed control box. Lines are smooth cubic curves. Zoom/fit controls bottom-right of canvas; a legend strip at the bottom. Right panel on the **Guide** tab: a bordered callout with "คู่มือทีละขั้น · ขั้นที่ 4 จาก 9", nine numbered step dots (1–3 completed in green outline, 4 filled blue, 5–9 empty), heading "Threat (สาเหตุโดยตรง)", four short labelled paragraphs (คืออะไร / เขียนอย่างไร / ตัวอย่าง / ที่ควรเลี่ยง), two text inputs for threats, a "+ เพิ่ม" button, a status line "✓ กรอกแล้ว", and Back / Next buttons at the bottom.

### S3 — Simulate (what-if) tab
> Design the **Simulate tab**. Heading "จำลองสถานการณ์ (What-if)" and a one-sentence muted note that this is logic, not a risk assessment. A bar "ตั้งทุก Barrier เป็น: [ทำงาน] [ล้มเหลว] [รีเซ็ตเป็นไม่ทราบ]". Then three stacked groups for threats: each card has the threat title, a status pill on the right, one row per control with a select (ทำงาน / เสื่อม / ล้มเหลว / ไม่ทราบ), a second select appearing only when "เสื่อม" is chosen ("ยังตัดเส้นทางได้ / ถือว่าล้มเหลว"), and a muted reason line ("No barrier is set to block, and ct_1 (unknown)… does not mean the barrier failed"). Between the two halves a centred bordered **Top event** strip with a pill "ไปถึงได้ (มี Threat ที่ยังไม่ถูกตัด)". Then consequence groups the same way. Then a **paths table** (Threat · Consequence · Result pill · Reason) with 12 rows, a ⚠ marker on a "fragile cut". Then warnings, uncontrolled escalation factors and a muted "Model limitations" list, ending with the run id in mono (RUN-02cff738-logic-1.0.0). Make unknown/inconclusive visually calm, not alarming.

### S4 — ERC panel
> Design the **ERC section** at the bottom of the Simulate tab. Heading "ERC (Event Risk Classification)" with a muted note: "The analyst chooses both answers; nothing is computed from the simulation." Two labelled selects: "คำถามที่ 1: If this event had escalated into an accident, what would have been the most probable outcome?" and "คำถามที่ 2: What was the effectiveness of the remaining barriers…?". Under Q2 a muted hint line with the meaning of the chosen level. A muted line "สถานะ control ในโมเดลนี้ (ข้อมูลประกอบ ไม่ใช่คำตอบ): ทำงาน 0 · เสื่อม 0 · ล้มเหลว 0 · ไม่ทราบ 10". A large result chip "▲ คะแนน ERC: 500 · แดง". Then the matrix table: columns Effective / Limited / Minimal / Not effective; rows Catastrophic accident (50 yellow, 102 yellow, 502 red, 2500 red), Major accident (10 green, 21 yellow, 101 yellow, 500 red), Minor injuries or damage (2 green, 4 green, 20 yellow, 100 yellow), No accident outcome (a merged cell "1", green). The selected cell has a thick 4px blue inner outline and bold underlined number. Below, a "เหตุผลของผู้วิเคราะห์" textarea and a small muted provenance line about the matrix source and that it must be confirmed with the official one.

### S5 — Barrier detail drawer (Details tab)
> Design the **Details tab** for a selected control: title "Control (barrier) — preventive", editable one-sentence text, owner (a role, not a name), type chips (policy / equipment / warning / human / automated), function (eliminate / prevent / reduce / mitigate), **Adequacy 1–4 and Reliability 1–4** as two segmented controls with the product shown as a four-band strength meter (poor / weak / fair / strong), a **State** segmented control (effective / degraded / failed / unknown), an **Assurance** group (performance standard, verification method, last verified date, next review date) with a red "review overdue" tag when the date has passed, an **Evidence** list with badges OBSERVED / ASSESSED / HYPOTHESISED (source, date, reference, limitation), and a "Gaps" list ("no performance standard; never verified; no evidence linked"). Compact and form-like, with clear grouping.

### S6 — Swiss-cheese view
> Design the **Swiss-cheese view**: a horizontal sequence — HAZARD box, four translucent rounded "cheese slice" panels (pale yellow, slightly rounded, with a thin darker edge), LOSS box. Each slice has a header with the defence name and a one-line description, and 1–3 elliptical holes inside (active failure = solid outline, latent condition = dashed outline with a small clock glyph), each hole with 2–3 lines of text. A thin straight trajectory line passes through aligned holes and stops at a solid wall where a layer holds. Layers that share a common cause are linked by a thin dotted bracket labelled "common cause — not independent". Right panel Quality tab lists plain-language checks such as "Hole is not classified as active or latent". This must look like a precise diagram, not a cartoon of cheese.

### S7 — SHELL view
> Design the **SHELL view** as a cross layout: **Liveware** in a larger central box (role + task), four boxes around it for Software, Hardware, Environment and Liveware (others), and four interface links (L–S, L–H, L–E, L–L), each with a status pill match / mismatch / unknown and a small finding count badge. Mismatch findings appear in the right panel as cards with severity 1–5 (as filled dots, not just colour), an action line and an owner (required when severity is 4–5).

### S8 — Compare (baseline vs alternative)
> Design a **Compare view** reachable from the Simulate tab: two columns, "Baseline" and "Alternative", each with the bow-tie thumbnail and the path summary ("12 paths · cut 11 · not cut 0 · inconclusive 1"). Between them a centred heading **"Path Count Difference"** (never "risk reduction"). Below: lists "Barriers changed" (id, from → to), "Newly cut paths", "No longer cut", "Only in baseline", "Only in alternative", and a yellow-outlined notice when structures differ: "The graph structure differs; path counts are not like-for-like and must not be read as a change in risk."

### S9 — Report / export preview
> Design a **report preview**: an A4 portrait page on a grey desk. Sections: title and model version; diagram image; barrier register table (barrier, owner, state, last verified, next review, gaps); simulation result with the path table; baseline vs alternative; evidence and assumptions with OBSERVED / ASSESSED / HYPOTHESISED badges; ERC block (answers, score, rationale, matrix source note); model limitations; footer with date, version and the disclaimer. Top bar buttons: PNG, SVG, PDF, JSON. If no simulation has been run, a clear "Draft / Model preview" stamp.

### S10 — Offline, error and empty states
> Design four small states in one sheet: (a) footer indicator online (green dot) vs offline (amber dot, "ออฟไลน์ — ใช้งานต่อได้ งานเก็บในเบราว์เซอร์"); (b) an import error panel "ไฟล์ไม่ตรง schema" listing field-level errors without overwriting the current work; (c) the Simulate tab when there is no threat or consequence ("ต้องมีอย่างน้อย 1 Threat และ 1 Consequence จึงจะจำลองได้") with a button that opens the Guide; (d) a gallery storage-full message offering "Save as file".

### S11 — Mobile / narrow (read-only companion)
> Design a **narrow (390 px) read-only view**: the diagram collapses into a vertically stacked outline (Hazard → Top event → Threats with their controls → Consequences with their controls), each control showing its state pill; a bottom sheet for the Guide. Editing is desktop-first; this is for review in meetings.

---

## 5. Real content to use (do not invent other data)

**Bow-tie example (illustrative wildlife-hazard model)**
- Hazard: ฝูงนกในและรอบทางวิ่ง / Flocks of birds on and around the runway
- Top event: ฝูงนกอยู่ในเส้นทางของอากาศยานขณะขึ้น-ลง / Birds in the path of an aircraft on take-off or landing
- Threats: นกเข้ามาหาอาหารหรือพักบนพื้นที่หญ้า · แหล่งดึงดูดสัตว์นอกรั้วสนามบิน · สัตว์บกเข้าผ่านรั้วชำรุด · การอพยพตามฤดูกาลทำให้นกเพิ่มฉับพลัน
- Preventive controls: จัดการพื้นที่หญ้า · ลาดตระเวนไล่สัตว์ตามตาราง · ประสานเจ้าของพื้นที่ลดแหล่งดึงดูด · ตรวจและซ่อมรั้ว · ติดตามกิจกรรมนกและออก NOTAM · ปรับตารางปฏิบัติการช่วงอพยพ
- Consequences: อากาศยานชนสัตว์ระหว่างวิ่งขึ้น-ลง · สัตว์ถูกดูดเข้าเครื่องยนต์ขณะบิน · ชนสัตว์แล้วโครงสร้างหรือกระจกหน้าเสียหาย
- Recovery controls: ATC/นักบินแจ้งกันทันที · RESA ที่ออกแบบและบำรุงรักษา · ขั้นตอนฉุกเฉินเมื่อเครื่องยนต์เสียหาย · ตรวจอากาศยานหลังชนสัตว์
- Escalation factor example: หมอกหรือแสงน้อยทำให้มองเห็นฝูงนกช้า; its control: จัดเวรให้ครอบคลุมช่วงเสี่ยงและมีเจ้าหน้าที่สำรอง

**Runway-incursion scenario (for the compare and report screens)** — Hazard: conflicting runway occupancy; threats: vehicle enters runway without clearance / aircraft crosses a holding position; barriers: clearance and communication, entry procedure, surveillance and alerting, response by crew and controller.

**Status vocabulary (TH / EN):** ถูกตัด / cut · ยังไม่ถูกตัด / not cut · สรุปไม่ได้ / inconclusive · ทำงาน / effective · เสื่อม / degraded · ล้มเหลว / failed · ไม่ทราบ / unknown.

**Evidence badges:** OBSERVED (fact with source) · ASSESSED (analyst judgement) · HYPOTHESISED (to be verified).

## 6. Do / Don't for Stitch

Do: keep diagrams thin-lined and legible; give the canvas most of the space; show IDs in mono; make Thai text wrap inside boxes; include both light and dark variants after approval; show keyboard focus rings.
Don't: add aircraft illustrations, 3-D cheese, gradients, emoji, stock photos, real airline or regulator logos, BowTieXP-style copies, risk-percentage gauges, "safety score" dials, or any label like "safe / unsafe".

## 7. What to ask Stitch to return (so engineering can use it)

- Light and dark variants of S1–S4 first (these map to existing code), then S5–S9.
- Exported colour and type tokens matching Section 3.
- Component sheet: status pill (3 variants), barrier state control (4), strength meter (4 bands), evidence badge (3), step dot (3 states), gallery card, matrix cell (3 colours + selected).
- Note: the product is built with vanilla ES modules and CSS custom properties; it will **adopt the tokens and layouts**, not copy generated code.
