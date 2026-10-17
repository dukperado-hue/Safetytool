# Resume checklist (uncommitted work after the persona trial)

State: nothing committed or pushed. Base commit `0e19262`. Run `npm test` first.

## Done and verified in Chrome (127.0.0.1, iframes at 894×567 and 1280×720)
- [x] Model-info fields: type in A, click B, type, Tab: nothing lost or overwritten (real mouse/keyboard, 1280 wide).
- [x] HFACS: changing a category keeps focus on that select even though the factor card moves; the next field saves to the right factor; the event field is untouched (894 and 1280).
- [x] First visit opens an empty Bowtie (no title, author, example flag).
- [x] Page fills the viewport (body height = viewport, footer on the bottom edge) at both sizes, Bowtie and Swiss.
- [x] Toolbar: Clear / Fit / Language on the toolbar row (same row as the model tabs at 1280; first row at 894).
- [x] Clicking a node opens the Details tab (was: whichever tab was used last), both sizes.
- [x] New threat is inside the stage at both sizes (4 added in a row).
- [x] Close button stays in view while the sheet body scrolls (894).
- [x] Thai typeface loads (Thai characters only; now Sarabun).
- [x] Export checks (downloads captured, not saved): SVG and report HTML embed the font; PNG is produced (5190×2178); Thai report has no `ct_` text (ids only in SVG attributes), codes show CT-01.
- [x] Swiss tab and slices are yellow (rgb 245,196,0 / 255,230,128), dark text.

## Done in code, covered only by tests (not clicked in a browser)
- [ ] "Copy as new work" bar for examples (makeOwnWork) and Pyramid period/denominator warning, PY019.
- [ ] Clear button confirmation (it runs the existing New handler: confirm + backup). Not clicked: a confirm dialog blocks the browser tool.
- [ ] "View a picture of this model" in the Help tab: checked it exists; not looked at visually.

## Not tested
- [ ] Print preview and PDF (window.print blocks the browser tool). Check the report print frame loads `fonts/` and the Thai is not boxes.
- [ ] Visual look of TH Sarabun (size-adjust 118%) in the diagram, tables and PDF.
- [ ] Phone-width (< 560 px) toolbar wrap with the new quick group.
- [ ] Toolbar scrolling away on long forms at narrow width (not changed).
- [ ] Offline/service worker with the new files (sw.js VERSION is v14; cache list updated and tested by the existing precache test).

## Known gaps / not started (agreed scope: do not start until stabilised)
- ERC wording: still English, source status not shown in Thai.
- English example text in HFACS / FRAM / STAMP data files.
- Persona picker, Thai persona examples, assistant character, gallery redesign, sync.
- Shared `localStorage` origin with other github.io projects (risk noted by the trial).

## Font licence
Thai text uses Sarabun (SIL OFL 1.1, licence text in `fonts/OFL.txt`), Thai-block subsets of the upstream files. The earlier TH Sarabun New files were removed before the first commit and are not in git history.
