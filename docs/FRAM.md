# FRAM in Safetytool

Model: `safetytool.fram/1` (`js/fram.js`, `schema/fram.schema.json`, sample `data/example-fram.json`, tests `test/fram.test.js`).

## What it is

FRAM (Functional Resonance Analysis Method, E. Hollnagel) describes work as a network of **functions**. Each function has six **aspects**: Input, Output, Precondition, Resource, Control, Time. Two functions are **coupled** when the Output of one is the Input, Precondition, Resource, Control or Time of the other.

## What Safetytool implements

* Functions with stable ids, description and context; the six aspects, each with a status `unknown` (not assessed — the default), `described` (items listed) or `none` (the analyst states there is none).
* Couplings from an **Output** to an aspect of another function (validated: both functions must exist, the start must be Output, the end one of the five others).
* Variability **descriptions** (`observed` / `anticipated` / `unknown`) with optional aspect and linked evidence.
* Evidence and assumptions (the project's shared mechanism), element provenance (`prov.origin`, `reviewed`), model limitations.
* A hexagon network picture (six vertices = six aspects, filled = described, dashed = not assessed), orthogonal coupling lines, zoom and pan, an aspect-coverage table (Analysis tab), a table-equivalent view, CSV, outline, lint (`FR001`–`FR017`), form, guide, help.

## What it does NOT implement

No variability scores, no resonance, no probabilities, no simulation, no instantiation engine. It records and shows the structure the analyst supplies. It is **not** a validated quantitative FRAM tool and must not be described as one. Missing information is reported as *unknown or incomplete*, never as evidence that a function is safe. Observed or reported claims without linked evidence are flagged as unsupported; generated suggestions and unreviewed assumptions are flagged until reviewed.

## Layout limits

Functions are placed in columns by coupling depth; lines are orthogonal and may cross boxes in dense models. Use zoom/pan, the table, or the coverage view for large models.

## Sources (see `docs/SOURCES.md`)

Primary: Hollnagel (2012), *FRAM: The Functional Resonance Analysis Method* (book, not read in this project). Secondary (read via search summaries on 2026-10-15): FRAM Handbook and glossary, functionalresonance.com — the six aspects; that not all six must be described for every function; that foreground functions need at least Input and Output (this is why `FR007` exists). Implementation choices: the `unknown/described/none` status, the coupling validation rules, and the provenance fields are ours.
