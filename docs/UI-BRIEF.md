# UI brief — Safetytool v1.0 redesign (for Claude Design / Gemini image concepts)

Engine and data are finished and tested (`npm test`, 56 tests). The UI must only *show* what the engine returns; it must not invent logic.

## One scenario, two views
- **Bow-Tie view** (primary): threats left → preventive barriers → TOP EVENT → recovery barriers → consequences right; hazard above the top event; escalation factors hanging under a barrier.
- **Swiss-cheese view** (deep dive on a chosen route): slices = barriers on that route; holes = escalation factors / latent conditions; "common cause" tags link holes across slices. Never imply holes are probabilities.

## Must-have interactions
1. Click a barrier to cycle its state: effective · degraded (choose blocks/fails) · failed · unknown. Paths recolour live: **cut / open / inconclusive** (never rely on colour alone: add pattern + icon + text).
2. "Run" panel lists every path with the plain-language reason from the engine; unknown/degraded show "needs information", not "failed".
3. What-if: duplicate as Alternative; side-by-side diff headed **Path Count Difference**, plus a banner when the structure differs.
4. Barrier drawer: owner, performance standard, verification, last verified, next review, linked evidence (OBSERVED / ASSESSED / HYPOTHESISED badges), gaps list.
5. Fragile-cut marker: a path cut by a single barrier whose escalation factor has no control.
6. Export: PNG/SVG/PDF with limitations footer; JSON round-trip.

## Constraints
Thai + English labels, keyboard operable, table view equivalent to the diagram, light/dark, works on GitHub Pages with no build step (vanilla ES modules), desktop-first, 120 elements readable. Always show the disclaimer: logical model, not a risk estimate.

## Image assets worth generating (Gemini)
Hero/empty-state illustration, six small icons (hazard, threat, top event, consequence, barrier-preventive, barrier-recovery), Swiss-cheese slice texture. No logos, no real airline/regulator marks, no BowTieXP-style imitation.
