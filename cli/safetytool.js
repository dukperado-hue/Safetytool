#!/usr/bin/env node
// Safetytool CLI — lets Claude (or any script) validate, check and outline a model file deterministically.
// Works on all model types; the type is detected from the file's "schema" field.
//   node cli/safetytool.js validate <file.json>      structural check (exit 1 on errors)
//   node cli/safetytool.js lint <file.json> [--json]  quality checks (exit 1 if any error-level finding)
//   node cli/safetytool.js outline <file.json>        plain-text outline (good for reading/quoting)
//   node cli/safetytool.js new <bowtie|swiss|shell> [title]   print an empty model to stdout
import { readFileSync } from 'node:fs';
import * as M from '../js/model.js';
import * as SW from '../js/swiss.js';
import * as SH from '../js/shell.js';
import { lint as lintBowtie, summarize } from '../js/lint.js';

const TYPES = {
  [M.SCHEMA]: { id: 'bowtie', validate: M.validateShape, normalize: M.normalize, lint: lintBowtie, empty: M.emptyModel },
  [SW.SCHEMA]: { id: 'swiss', validate: SW.validateSwiss, normalize: SW.normalizeSwiss, lint: SW.lintSwiss, empty: SW.emptySwiss, outline: SW.outlineSwiss },
  [SH.SCHEMA]: { id: 'shell', validate: SH.validateShell, normalize: SH.normalizeShell, lint: SH.lintShell, empty: SH.emptyShell, outline: SH.outlineShell },
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
  if (!type) { console.error('usage: new <bowtie|swiss|shell> [title]'); process.exit(2); }
  const m = type.empty();
  m.meta.title = rest.filter((x) => x !== '--json').join(' ');
  console.log(JSON.stringify(m, null, 2));
} else {
  console.error('usage: node cli/safetytool.js <validate|lint|outline|new> <file.json|type> [--json]');
  process.exit(2);
}
