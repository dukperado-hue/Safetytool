# Roadmap (draft — to discuss)

## v0.1 (done) — Bowtie MVP
Editor · auto layout · table view · 17 quality rules · JSON/SVG/PNG/CSV · CLI (`validate`/`lint`/`outline`) · JSON Schema · AGENTS.md.

## v0.2 — Make it trustworthy for committees and papers
- Per-element **source/evidence** field (citation, URL, date) with a lint rule for unsourced factual claims
- Model **version history** (named snapshots) and a "report" export: Markdown/DOCX-ready outline, control register (CSV), lint appendix
- `CITATION.cff` + Zenodo DOI recipe; stable model hash in exports
- Shared controls across threats; multiple linked bowties (one hazard, several top events)
- Printable A-size export with legend
- Keyboard shortcuts and a full screen-reader pass with a blind user

## v0.3 — Wildlife hazard management pack
- Neutral, sourced checklist of wildlife-hazard threat/control families (from public ICAO/State guidance — each item cited)
- Link controls to monitoring indicators (SPIs): activity vs outcome
- Strike-data import (user-supplied CSV) to compare controls against occurrences — kept local

## v0.4 — More model types in one workbench
- **Fault tree** (AND/OR gates, minimal cut sets) · **Swiss cheese** (layers, holes, active vs latent failures) · **Shell/other** models as separate modules sharing one project file
- Cross-model links (a fault-tree basic event ↔ a bowtie threat)

## v0.5 — Claude as an accurate co-analyst
- MCP server exposing `validate`, `lint`, `outline`, `diff` and safe edit operations on model files (so Claude edits through typed operations, not free text)
- Evals: a fixed set of known-bad models; Claude must find the intended lint issues

## Open questions for the owner
1. "Airborne object" — UAS/drones, balloons, unidentified objects, or all of them?
2. Licence for code and content (proposal: MIT/Apache-2.0 + CC BY 4.0).
3. Public host: this repo's GitHub Pages, or under the existing site?
4. Will a regulator or committee need offline use (single-file build)?
