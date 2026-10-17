#!/usr/bin/env node
// Safetytool CLI — lets Claude (or any script) validate, check and outline a model file deterministically.
// Works on all model types; the type is detected from the file's "schema" field.
//   node cli/safetytool.js validate <file.json>      structural check (exit 1 on errors)
//   node cli/safetytool.js lint <file.json> [--json]  quality checks (exit 1 if any error-level finding)
//   node cli/safetytool.js outline <file.json>        plain-text outline (good for reading/quoting)
//   node cli/safetytool.js new <bowtie|swiss|shell|hfacs|stamp|fram|pyramid|scenario> [title]   print an empty model to stdout
//   node cli/safetytool.js simulate <file.json> [--set id=status[:blocks|fails] ...] [--json]   bowtie or scenario
//   node cli/safetytool.js impact <bowtie.json>       which single control failures leave paths un-cut
//   node cli/safetytool.js register <bowtie.json> [--as-of YYYY-MM-DD]   barrier assurance register (gaps only)
//   node cli/safetytool.js diff <a.json> <b.json> [--json]   Path Count Difference (two bowties or two scenarios)
//   node cli/safetytool.js swiss-from-bowtie <bowtie.json> <threatId> [consequenceId]   Swiss view of one route
//   node cli/safetytool.js pyramid-summary <pyramid.json> [--compare other.json] [--json]   counts, rates (only with a valid denominator), comparability
//   node cli/safetytool.js assign-id <model.json>     write a stable meta.modelId into the file (explicit; other commands never modify inputs)
//   node cli/safetytool.js inspect <model.json|package.json>   provenance and dependency summary
//   node cli/safetytool.js transforms                 list transformations and whether they are supported
//   node cli/safetytool.js transform-preview <id> <model.json> [--decision k=v ...] [--json]   preview only; nothing is written
//   node cli/safetytool.js transform-run <id> <model.json> --out <file> [--decision k=v ...] [--confirm all|id,id] [--links-out <file>]
//   node cli/safetytool.js package-build <out.json> <model.json ...> [--links links.json]   linked-model package
//   node cli/safetytool.js package-validate <package.json> [--json]
//   node cli/safetytool.js package-diff <a.json> <b.json> [--json]
//   node cli/safetytool.js links-validate <links.json> <model.json ...> [--json]
// Machine-readable output (--json) carries "outputVersion": 1.
// pyramid-summary is not in any commit yet (never released), so its first shape is version 1; bump outputVersion for any change after it ships.
import { readFileSync as readRaw, existsSync } from 'node:fs';
// JSON files saved by some Windows tools start with a byte-order mark; accept them
const readFileSync = (f, enc) => { const t = readRaw(f, enc); return typeof t === 'string' ? t.replace(/^﻿/, '') : t; };
import * as M from '../js/model.js';
import * as SW from '../js/swiss.js';
import * as SH from '../js/shell.js';
import * as HF from '../js/hfacs.js';
import * as ST from '../js/stamp.js';
import * as FR from '../js/fram.js';
import * as PY from '../js/pyramid.js';
import * as IC from '../js/interchange.js';
import * as TR from '../js/transform.js';
import { writeFileSync } from 'node:fs';
import * as SC from '../js/scenario.js';
import * as BA from '../js/bowtie-analysis.js';
import { lint as lintBowtie, summarize } from '../js/lint.js';

function outlineScenario(m) {
  const out = [`# ${m.meta.title}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}  (${m.meta.id})`];
  m.nodes.forEach((n) => out.push(`${n.kind.toUpperCase().padEnd(11)} ${n.id}: ${n.text || ''}`));
  m.edges.forEach((e) => out.push(`  ${e.from} -> ${e.to}${e.barrierIds.length ? '  via ' + e.barrierIds.join(' + ') : ''}`));
  m.barriers.forEach((b) => out.push(`BARRIER ${b.id} [${b.status}${b.degradedLogic ? ':' + b.degradedLogic : ''}] ${b.name}`));
  return out.join('\n');
}

const TYPES = {
  [SC.SCHEMA]: { id: 'scenario', validate: (m) => SC.validateScenario(m).errors, normalize: (m) => m, lint: () => [], empty: SC.emptyScenario, outline: outlineScenario },
  [M.SCHEMA]: { id: 'bowtie', validate: (m) => { const e = M.validateShape(m); return e.length ? e : BA.validateBowtieExt(m).errors; }, normalize: M.normalize, lint: lintBowtie, empty: M.emptyModel },
  [SW.SCHEMA]: { id: 'swiss', validate: SW.validateSwiss, normalize: SW.normalizeSwiss, lint: SW.lintSwiss, empty: SW.emptySwiss, outline: SW.outlineSwiss },
  [SH.SCHEMA]: { id: 'shell', validate: SH.validateShell, normalize: SH.normalizeShell, lint: SH.lintShell, empty: SH.emptyShell, outline: SH.outlineShell },
  [HF.SCHEMA]: { id: 'hfacs', validate: HF.validateHfacs, normalize: HF.normalizeHfacs, lint: HF.lintHfacs, empty: HF.emptyHfacs, outline: HF.outlineHfacs },
  [FR.SCHEMA]: { id: 'fram', validate: FR.validateFram, normalize: FR.normalizeFram, lint: FR.lintFram, empty: FR.emptyFram, outline: FR.outlineFram },
  [PY.SCHEMA]: { id: 'pyramid', validate: PY.validatePyramid, normalize: PY.normalizePyramid, lint: PY.lintPyramid, empty: PY.emptyPyramid, outline: PY.outlinePyramid },
  [ST.SCHEMA]: { id: 'stamp', validate: ST.validateStamp, normalize: ST.normalizeStamp, lint: ST.lintStamp, empty: ST.emptyStamp, outline: ST.outlineStamp },
};
const BY_ID = Object.fromEntries(Object.values(TYPES).map((t) => [t.id, t]));

const [cmd, arg, ...rest] = process.argv.slice(2);
const asJson = rest.includes('--json');

function load(file) {
  if (!file) { console.error('missing <file.json>'); process.exit(2); }
  let m;
  try { m = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error('cannot read/parse: ' + e.message); process.exit(2); }
  const type = TYPES[m && m.schema];
  if (!type) { console.error('INVALID: unsupported schema: ' + String(m && m.schema) + '\nknown: ' + Object.keys(TYPES).join(', ')); process.exit(1); }
  const errs = type.validate(m);
  if (errs.length) { console.error('INVALID:\n- ' + errs.join('\n- ')); process.exit(1); }
  return { m: type.normalize(m), type };
}

/** Text of any element by id (for readable lint output). */
function textOf(m, id) {
  const stack = [m];
  while (stack.length) {
    const o = stack.pop();
    if (Array.isArray(o)) { o.forEach((x) => stack.push(x)); continue; }
    if (o && typeof o === 'object') {
      if (o.id === id) return o.text ?? o.name ?? '';
      Object.values(o).forEach((v) => { if (v && typeof v === 'object') stack.push(v); });
    }
  }
  return '';
}

function outlineBowtie(m) {
  const rate = (c) => {
    const e = M.effectiveness(c);
    return [c.function, c.type, c.critical ? 'CRITICAL' : '', e != null ? `A${c.adequacy}xR${c.reliability}=${e}` : 'unrated', c.owner ? 'owner: ' + c.owner : ''].filter(Boolean).join(', ');
  };
  const out = [`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`];
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  out.push(`HAZARD: ${m.hazard.text}`, `TOP EVENT: ${m.topEvent.text}`, '');
  const esc = (c, pad) => m.escalations.filter((e) => e.controlId === c.id).forEach((e) => {
    out.push(`${pad}! escalation factor: ${e.text}`);
    m.escalationControls.filter((x) => x.escalationId === e.id).forEach((x) => out.push(`${pad}  + escalation control: ${x.text}${x.owner ? ' (owner: ' + x.owner + ')' : ''}`));
  });
  out.push('LEFT SIDE (threats -> preventive controls -> top event)');
  m.threats.forEach((t, i) => {
    out.push(`T${i + 1}. ${t.text}${t.exposure ? ` [exposure ${t.exposure}]` : ''}`);
    M.controlsOf(m, 'prevent', t.id).forEach((c, j) => { out.push(`   P${j + 1}. ${c.text} (${rate(c)})`); esc(c, '       '); });
  });
  out.push('', 'RIGHT SIDE (top event -> recovery controls -> consequences)');
  m.consequences.forEach((co, i) => {
    out.push(`C${i + 1}. ${co.text}${co.severity ? ` [severity ${co.severity}]` : ''}`);
    M.controlsOf(m, 'recover', co.id).forEach((c, j) => { out.push(`   R${j + 1}. ${c.text} (${rate(c)})`); esc(c, '       '); });
  });
  return out.join('\n');
}

if (cmd === 'validate') {
  const { m, type } = load(arg);
  console.log(`OK type=${type.id} schema=${m.schema}`);
} else if (cmd === 'lint') {
  const { m } = load(arg);
  const type = TYPES[m.schema];
  const issues = type.lint(m).map((i) => ({ rule: i.rule, severity: i.severity, targetId: i.targetId, target: textOf(m, i.targetId), message_en: i.en, message_th: i.th }));
  if (asJson) console.log(JSON.stringify({ type: type.id, summary: summarize(issues), issues }, null, 2));
  else {
    issues.forEach((i) => console.log(`${i.severity.toUpperCase().padEnd(5)} ${i.rule} ${i.targetId}: ${i.message_en}\n        "${i.target}"`));
    const s = summarize(issues);
    console.log(`\n${s.error} error(s), ${s.warn} warning(s), ${s.info} suggestion(s)`);
  }
  process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
} else if (cmd === 'outline') {
  const { m, type } = load(arg);
  console.log(type.id === 'bowtie' ? outlineBowtie(m) : type.outline(m));
} else if (cmd === 'new') {
  const type = BY_ID[arg];
  if (!type) { console.error('usage: new <bowtie|swiss|shell|hfacs|stamp|fram|pyramid|scenario> [title]'); process.exit(2); }
  const m = type.empty();
  m.meta.title = rest.filter((x) => x !== '--json').join(' ');
  console.log(JSON.stringify(m, null, 2));
} else if (cmd === 'simulate' || cmd === 'impact') {
  const { m, type } = load(arg);
  const sets = {};
  rest.forEach((x, i) => {
    if (x !== '--set') return;
    const [id, v] = String(rest[i + 1] || '').split('=');
    const [status, degradedLogic] = (v || '').split(':');
    if (!id || !status) { console.error('--set expects id=status[:blocks|fails]'); process.exit(2); }
    sets[id] = { status, degradedLogic: degradedLogic || null };
  });
  const fail = (r) => { console.error('CANNOT SIMULATE:\n- ' + r.errors.join('\n- ')); process.exit(1); };
  if (type.id === 'bowtie') {
    if (cmd === 'impact') {
      const r = BA.failureImpact(m);
      if (!r.ok) fail(r);
      if (asJson) console.log(JSON.stringify(r.rows, null, 2));
      else r.rows.forEach((x) => console.log(`${x.controlId} (${x.side}) "${textOf(m, x.controlId)}": ${x.newlyNotCut.length} path(s) no longer cut if it alone fails`));
      process.exit(0);
    }
    let target = m;
    try { if (Object.keys(sets).length) target = BA.withStates(m, sets); } catch (e) { console.error(e.message); process.exit(2); }
    const r = BA.simulateBowtie(target);
    if (!r.ok) fail(r);
    if (asJson) { console.log(JSON.stringify(r.run, null, 2)); process.exit(0); }
    const { run } = r;
    console.log(`run ${run.id}  (logical paths only; not a risk estimate)`);
    run.threats.forEach((t) => console.log(`THREAT ${t.id} -> top event: ${t.result.toUpperCase()}  "${t.text}"`));
    console.log(`TOP EVENT reach: ${run.topEvent.reach}`);
    run.consequences.forEach((c) => console.log(`CONSEQUENCE ${c.id} recovery: ${c.result.toUpperCase()}  "${c.text}"`));
    console.log(`PATHS: ${run.summary.total} total, ${run.summary.cut} cut, ${run.summary.open} open, ${run.summary.inconclusive} inconclusive, ${run.summary.fragileCuts} fragile cut(s)`);
    run.warnings.forEach((w) => console.log('warning: ' + w));
  } else if (type.id === 'scenario') {
    if (cmd === 'impact') { console.error('impact is available for bowtie files'); process.exit(2); }
    const c = JSON.parse(JSON.stringify(m));
    for (const [id, v] of Object.entries(sets)) {
      const b = c.barriers.find((x) => x.id === id);
      if (!b) { console.error('unknown barrier ' + id); process.exit(2); }
      b.status = v.status; b.degradedLogic = v.degradedLogic;
    }
    const r = SC.runSimulation(c);
    if (!r.ok) fail(r);
    if (asJson) { console.log(JSON.stringify(r.run, null, 2)); process.exit(0); }
    console.log(`run ${r.run.id}`);
    r.run.paths.forEach((p) => console.log(`${p.result.toUpperCase().padEnd(12)} ${p.key}\n             ${p.reason}`));
    const sm = r.run.summary;
    console.log(`PATHS: ${sm.total} total, ${sm.cut} cut, ${sm.open} open, ${sm.inconclusive} inconclusive`);
    r.warnings.forEach((w) => console.log('warning: ' + w));
  } else { console.error('simulate works on bowtie and scenario files'); process.exit(2); }
} else if (cmd === 'register') {
  const { m, type } = load(arg);
  if (type.id !== 'bowtie') { console.error('register works on bowtie files'); process.exit(2); }
  const i = rest.indexOf('--as-of');
  const rows = BA.assuranceRegister(m, i >= 0 ? rest[i + 1] : undefined);
  if (asJson) console.log(JSON.stringify(rows, null, 2));
  else rows.forEach((r) => console.log(`${r.critical ? 'CRITICAL ' : ''}${r.controlId} [${r.status}] ${r.text}\n   owner: ${r.owner || '-'} | gaps: ${r.gaps.length ? r.gaps.join('; ') : 'none recorded'}`));
} else if (cmd === 'diff') {
  const a = load(arg);
  const b = load(rest[0]);
  if (a.type.id !== b.type.id || !['bowtie', 'scenario'].includes(a.type.id)) { console.error('diff needs two bowtie files or two scenario files'); process.exit(2); }
  let d;
  if (a.type.id === 'bowtie') {
    const r = BA.compareBowties(a.m, b.m);
    if (!r.ok) { console.error('CANNOT COMPARE:\n- ' + r.errors.join('\n- ')); process.exit(1); }
    d = r.diff;
  } else {
    const ra = SC.runSimulation(a.m);
    const rb = SC.runSimulation(b.m);
    if (!ra.ok || !rb.ok) { console.error('CANNOT COMPARE:\n- ' + [...(ra.errors || []), ...(rb.errors || [])].join('\n- ')); process.exit(1); }
    d = SC.compareRuns(ra.run, rb.run);
  }
  if (asJson) console.log(JSON.stringify(d, null, 2));
  else {
    const nc = (s) => s.open + s.inconclusive;
    console.log(`${d.label}: paths not shown to be cut ${nc(d.pathCount.baseline)} -> ${nc(d.pathCount.alternative)}`);
    d.barrierChanges.forEach((c) => console.log(`barrier ${c.id}: ${c.change} ${c.from || ''}${c.to ? ' -> ' + c.to : ''}`));
    d.newlyCut.forEach((k) => console.log('newly cut: ' + k));
    d.newlyOpen.forEach((k) => console.log('no longer cut: ' + k));
    d.onlyBaseline.forEach((k) => console.log('only in baseline: ' + k));
    d.onlyAlternative.forEach((k) => console.log('only in alternative: ' + k));
    d.notes.forEach((n) => console.log('NOTE: ' + n));
  }
} else if (cmd === 'pyramid-summary') {
  const { m, type } = load(arg);
  if (type.id !== 'pyramid') { console.error('pyramid-summary works on pyramid files'); process.exit(2); }
  const t = PY.tally(m); const ck = PY.exposureCheck(m);
  const out = { outputVersion: 1, basis: t.basis, total: t.total, rows: t.rows.map((r) => ({ label: r.label, level: r.level, count: r.unknown ? null : r.count, rate: PY.rateOf(m, r.count).valid ? PY.rateOf(m, r.count).text : null })), duplicates: t.duplicates, excluded: t.excluded, uncategorised: t.uncategorised, basisNote: t.basisNote, window: t.window, records: { total: t.records, countedInWindow: t.included, outsideBefore: t.outsideBefore, outsideAfter: t.outsideAfter, noValidDate: t.incompleteDates, crossCheck: t.recordsCheck }, ratesAvailable: ck.valid, ratesUnavailableBecause: ck.valid ? [] : ck.missing };
  const ci = rest.indexOf('--compare');
  if (ci >= 0) { const o = load(rest[ci + 1]); if (o.type.id !== 'pyramid') { console.error('--compare needs a pyramid file'); process.exit(2); } out.comparison = PY.comparePyramids(m, o.m); }
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    console.log('This describes the supplied dataset under its stated definitions; it is not a prediction, and counts are not rates or risk.');
    out.rows.forEach((r) => console.log(`TIER ${r.level} ${r.label}: ${r.count == null ? 'unknown' : r.count}${r.rate ? '  (' + r.rate + ')' : ''}`));
    if (!ck.valid) console.log('COUNTS ONLY: ' + ck.missing.join('; '));
    if (t.records) console.log(`RECORDS: ${t.records} total; counted in window ${t.included}; outside window ${t.outsideWindow} (before ${t.outsideBefore}, after ${t.outsideAfter}); no valid date ${t.incompleteDates}${t.windowApplied ? '' : ' (no valid window: not filtered)'}`);
    if (t.basisNote === 'aggregate-records-unused') console.log('NOTE: records are NOT counted; aggregate counts are used and never added to records.' + (t.recordsCheck.differs ? ' They DIFFER from the records in the window.' : ''));
    if (out.comparison) { console.log('COMPARISON: ' + out.comparison.level); out.comparison.warnings.forEach((w) => console.log('  warning: ' + w)); }
  }
} else if (cmd === 'assign-id') {
  const { m } = load(arg);
  if (m.meta.modelId) { console.log('already has modelId ' + m.meta.modelId); process.exit(0); }
  const raw = JSON.parse(readFileSync(arg, 'utf8')); IC.ensureIdentity(raw); writeFileSync(arg, JSON.stringify(raw, null, 2) + '\n'); console.log('wrote modelId ' + raw.meta.modelId + ' to ' + arg);
} else if (cmd === 'inspect') {
  const raw = JSON.parse(readFileSync(arg, 'utf8'));
  if (raw && raw.format === IC.FORMAT) { const rows = (raw.members || []).map((x) => IC.inspectModel(x.content, raw.links || [])); console.log(JSON.stringify({ outputVersion: 1, package: { formatVersion: raw.formatVersion, packageHash: raw.packageHash, members: rows.length, links: (raw.links || []).length }, models: rows }, null, 2)); }
  else { const { m } = load(arg); console.log(JSON.stringify({ outputVersion: 1, ...IC.inspectModel(m) }, null, 2)); }
} else if (cmd === 'transforms') {
  const rows = TR.TRANSFORMS.map((t) => ({ id: t.id, version: t.version, from: t.from, to: t.to, supported: t.supported, title: t.title.en }));
  if (asJson) console.log(JSON.stringify({ outputVersion: 1, transforms: rows }, null, 2)); else rows.forEach((r) => console.log(`${r.id}@${r.version}  ${r.from} -> ${r.to}  ${r.supported ? 'supported' : 'UNSUPPORTED'}  ${r.title}`));
} else if (cmd === 'transform-preview' || cmd === 'transform-run') {
  const { m } = load(rest[0]);
  const decisions = {}; rest.forEach((x, i) => { if (x === '--decision') { const [k, v] = String(rest[i + 1] || '').split('='); decisions[k] = v; } });
  IC.ensureIdentity(m);
  const p = TR.previewTransform(arg, m, decisions);
  const brief = { outputVersion: 1, transformId: p.transformId, version: p.version, supported: p.supported, ok: p.ok, source: p.source, destType: p.destType, mappings: p.mappings.length, omitted: p.omitted.map((o) => o.what.en), warnings: p.warnings.map((w) => w.en), decisionErrors: p.decisionErrors.map((e) => e.en), validationErrors: p.validation.errors, needsConfirmation: p.needsConfirmation.map((c) => ({ id: c.id, text: c.text.en })), unsupportedReason: p.unsupportedReason ? p.unsupportedReason.en : null };
  if (cmd === 'transform-preview') {
    if (asJson) console.log(JSON.stringify(brief, null, 2));
    else { console.log(`${p.transformId}@${p.version}: ${p.ok ? 'preview OK' : 'CANNOT RUN'}`); if (brief.unsupportedReason) console.log('unsupported: ' + brief.unsupportedReason); brief.decisionErrors.forEach((e) => console.log('decision needed: ' + e)); brief.validationErrors.forEach((e) => console.log('invalid: ' + e)); console.log(`mappings: ${brief.mappings}`); brief.omitted.forEach((o) => console.log('not transferred: ' + o)); brief.warnings.forEach((w) => console.log('warning: ' + w)); brief.needsConfirmation.forEach((c) => console.log(`needs confirmation [${c.id}]: ${c.text}`)); }
    process.exit(p.ok ? 0 : 1);
  }
  const oi = rest.indexOf('--out');
  if (oi < 0) { console.error('transform-run needs --out <file> (an existing file is never overwritten silently)'); process.exit(2); }
  const outFile = rest[oi + 1];
  if (existsSync(outFile)) { console.error('refusing to overwrite existing file ' + outFile); process.exit(2); }
  const ci = rest.indexOf('--confirm'); const conf = ci < 0 ? [] : (rest[ci + 1] === 'all' ? p.needsConfirmation.map((c) => c.id) : String(rest[ci + 1] || '').split(','));
  const r = await TR.applyTransform(p, conf, { decisions, sourceHash: await IC.contentHash(m) });
  if (!r.ok) { console.error('NOT CREATED:\n- ' + r.errors.join('\n- ')); process.exit(1); }
  writeFileSync(outFile, JSON.stringify(r.model, null, 2) + '\n');
  const li = rest.indexOf('--links-out'); if (li >= 0) writeFileSync(rest[li + 1], JSON.stringify(r.links, null, 2) + '\n');
  console.log('created ' + outFile + ' (' + p.destType + '), ' + r.links.length + ' proposed/derived link(s)' + (li >= 0 ? ' written to ' + rest[li + 1] : ' (not saved: use --links-out)'));
} else if (cmd === 'package-build') {
  const oi = rest.indexOf('--links'); const files = rest.filter((x, i) => x !== '--links' && (oi < 0 || i !== oi + 1));
  const models = [arg === undefined ? null : null].filter(Boolean);
  const inputs = files;
  const loaded = inputs.map((f) => load(f).m);
  const missing = loaded.map((m, i) => (m.meta.modelId ? null : inputs[i])).filter(Boolean);
  if (missing.length) { console.error('no meta.modelId in: ' + missing.join(', ') + '\nrun: node cli/safetytool.js assign-id <file>'); process.exit(1); }
  const links = oi >= 0 ? JSON.parse(readFileSync(rest[oi + 1], 'utf8')) : [];
  const pkg = await IC.buildPackage(loaded.map((model) => ({ model })), { links });
  void models;
  if (existsSync(arg)) { console.error('refusing to overwrite existing file ' + arg); process.exit(2); }
  writeFileSync(arg, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`wrote ${arg}: ${pkg.members.length} model(s), ${pkg.links.length} link(s), validation ${pkg.validation.ok ? 'OK' : 'PROBLEMS'}`);
  process.exit(pkg.validation.ok ? 0 : 1);
} else if (cmd === 'package-validate') {
  const pkg = JSON.parse(readFileSync(arg, 'utf8'));
  const r = await IC.validatePackage(pkg, []);
  const out = { outputVersion: 1, ok: r.ok, errors: r.errors, warnings: r.warnings, members: r.members.map((x) => ({ path: x.path, type: x.type, status: x.status, issues: x.issues })), links: { usable: r.links.filter((x) => x.usable).length, unusable: r.links.filter((x) => !x.usable).length }, unsupported: r.unsupported.length };
  if (asJson) console.log(JSON.stringify(out, null, 2)); else { console.log(r.ok ? 'PACKAGE OK' : 'PACKAGE INVALID'); r.errors.forEach((e) => console.log('error: ' + e)); r.warnings.forEach((e) => console.log('warning: ' + e)); out.members.forEach((x) => console.log(`  ${x.status.padEnd(11)} ${x.type || '?'} ${x.path}`)); }
  process.exit(r.ok ? 0 : 1);
} else if (cmd === 'package-diff') {
  const d = IC.diffPackages(JSON.parse(readFileSync(arg, 'utf8')), JSON.parse(readFileSync(rest[0], 'utf8')));
  if (asJson) console.log(JSON.stringify({ outputVersion: 1, ...d }, null, 2)); else { console.log(d.identicalContent ? 'identical semantic content' : 'content differs'); Object.entries(d).filter(([k, v]) => Array.isArray(v) && v.length).forEach(([k, v]) => console.log(k + ': ' + v.join(', '))); }
  process.exit(d.identicalContent ? 0 : 1);
} else if (cmd === 'links-validate') {
  const links = JSON.parse(readFileSync(arg, 'utf8'));
  const models = new Map(rest.filter((x) => x !== '--json').map((f) => load(f).m).map((m) => [m.meta.modelId, m]));
  const issues = IC.checkLinks(links, models);
  if (asJson) console.log(JSON.stringify({ outputVersion: 1, ok: !issues.some((i) => i.severity === 'error'), issues }, null, 2)); else { issues.forEach((i) => console.log(`${i.severity.toUpperCase()} ${i.code} ${i.linkId}: ${i.message}`)); console.log(issues.length ? '' : 'links OK'); }
  process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
} else if (cmd === 'swiss-from-bowtie') {
  const { m, type } = load(arg);
  if (type.id !== 'bowtie' || !rest[0]) { console.error('usage: swiss-from-bowtie <bowtie.json> <threatId> [consequenceId]'); process.exit(2); }
  if (!m.threats.some((t) => t.id === rest[0])) { console.error('unknown threat ' + rest[0]); process.exit(2); }
  console.log(JSON.stringify(SW.swissFromBowtie(m, { threatId: rest[0], consequenceId: rest[1] || null }), null, 2));
} else {
  console.error('usage: node cli/safetytool.js <validate|lint|outline|new|simulate|impact|register|diff|swiss-from-bowtie|pyramid-summary|assign-id|inspect|transforms|transform-preview|transform-run|package-build|package-validate|package-diff|links-validate> <file.json|type> [--json]');
  process.exit(2);
}
