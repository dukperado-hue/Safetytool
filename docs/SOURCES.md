# Sources and what we took from them

Principle: **we use the public method and general safety knowledge; we do not copy any vendor's or regulator's expression, templates, software, or file formats.**
"Read" means a person or AI read it in October 2026; the summaries were produced through automated page fetching, so wording may be incomplete.

## Method guidance consulted (concepts re-expressed in our own words)

| Source | Used for | Status / caveat |
|---|---|---|
| UK CAA — Bowtie section (about, elements steps 1–8, developing & evaluating, safety risk priorities, implementing into SMS), www.caa.co.uk/safety-initiatives/working-with-industry/bowtie/ | 8 elements; quality pitfalls (threat vs control failure, escalation factor negation, vague controls, one escalation level, readable size); control function/type/criticality; ownership by post holder; threat exposure; SPIs; review triggers | © UK CAA. Rating-scale details are in images we could not read; our 1–4 adequacy × reliability bands are **our own**. |
| UK CAA — Bowtie templates pages | Awareness only | States CAA remains owner, internal business use only, written consent for use outside the organisation; another page says templates are no longer maintained. **We do not use or ship these templates.** Conditions-of-use PDF not opened. |
| CASA (Australia) — "Using our bowtie risk analysis" | Reading conventions; threats/escalation separate "human/technical/organisational" bowties | Page retrieved in a browser. CASA offers `.XP` files on request; we do not use them. |
| Wikipedia — Bow-tie diagram | History (ICI/Univ. of Queensland 1979; Viner; Shell), relation to fault/event trees, IEC 31010 | Secondary source; verify before citing. |
| Aviatize glossary — Bowtie analysis | Single points of failure, ownership, linkage to assurance | Vendor page; feature claims not verified. |
| ASMS-Pro blog (5-step walkthrough; PHAT) | Practical steps; SMS integration; template vs flexible building | Vendor blog; PHAT details not available. |
| TO70 article | Colours/filters for responsibility, one structure across proactive and incident use | Short article. |
| LinkedIn article (A. Venetz) — bowtie for unmanned aviation | UAS top events; preventive barriers preferred over reliance on recovery | Opinion piece, author promotes own platform. |
| Leitão et al. 2022, *J. Aerosp. Technol. Manag.* 14:e1722 (spin-training bowtie, CC BY) | Example of a bowtie in a paper; RBS idea | Open access, CC BY. |
| Montero et al. 2025, *Safety Science* 185:106777 (quantified bowtie with AHP) | Future quantitative option (AHP weights, 5×5 matrix) | © Elsevier; ideas only. |
| SKYbrary "Bow Tie Risk Management Methodology" | — | **Not read**: page content did not load for the fetching tools (bot check). Please read it manually and add notes here. |
| IATA/UKCA "Bowtie model — carriage of lithium batteries" PDF | — | Image-only PDF; **not analysed**. |

## Models added in v0.2 (concepts from general knowledge — sources NOT re-read this session)

| Model | Concept | Status / caveat |
|---|---|---|
| Swiss cheese | J. Reason's layered-defence model; active failures vs latent conditions; optional layer categories echo HFACS-style groupings (Shappell & Wiegmann) | Written from general knowledge of the public concept; **cite Reason (1990, 1997) directly in any paper and verify our wording**. |
| SHELL | Human-factors SHELL model (Edwards 1972, Hawkins 1975; used in ICAO human-factors guidance) | Same caveat. "Shell" may also mean the company's bowtie style; we implemented the human-factors model. |

## Materials deliberately NOT used

- BowTieXP software (MSI) and manual — © Enablon Netherlands B.V.; the manual's own terms restrict use to BowTieXP training and forbid public distribution. We did not install or decompile the MSI. One read-only attempt to list its metadata tables failed and returned nothing, so no information from the installer was used. Nothing from it is in this repo.
- UK CAA "CFIT 3.1" and other templates (see above), CASA bowtie PDFs/`.XP` files.
- The reference folder `../` is excluded from version control on purpose.

## To do before publishing

- [ ] Choose licences (code and content) — see README.
- [ ] Read SKYbrary and the CAA conditions-of-use PDF; record conclusions here.
- [ ] If the UK CAA's or another regulator's templates are to be supported as *imports*, obtain written permission first; import must read the user's own files only.
- [ ] Have a domain expert review any shipped example before it is described as anything other than illustrative.
