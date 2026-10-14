#!/usr/bin/env node
// Safetytool CLI — lets Claude (or any script) validate, check and outline a bowtie file deterministically.
//   node cli/safetytool.js validate <file.json>      structural check (exit 1 on errors)
//   node cli/safetytool.js lint <file.json> [--json]  quality checks (exit 1 if any error-level finding)
//   node cli/safetytool.js outline <file.json>        plain-text outline (good for reading/quoting)
//   node cli/safetytool.js new <title>                print an empty model to stdout
import { readFileSync } from 'node:fs';
import { emptyModel, validateShape, normalize, controlsOf, effectiveness } from '../js/model.js';
import { lint, summarize } from '../js/lint.js';

const [cmd, arg, ...rest] = process.argv.slice(2);
const asJson = rest.includes('--json');

function load(file) {
  if (!file) { console.error('missing <file.json>'); process.exit(2); }
  let m;
  try { m = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error('cannot read/parse: ' + e.message); process.exit(2); }
  const errs = validateShape(m);
  if (errs.length) { console.error('INVALID:\n- ' + errs.join('\n- ')); process.exit(1); }
  return normalize(m);
}

function textOf(m, id) {
  const all = [m.hazard, m.topEvent, ...m.threats, ...m.consequences, ...m.controls, ...m.escalations, ...m.escalationControls];
  const n = all.find((x) => x.id === id);
  return n ? n.text : '';
}

if (cmd === 'validate') {
  const m = load(arg);
  console.log(`OK schema=${m.schema} threats=${m.threats.length} consequences=${m.consequences.length} controls=${m.controls.length} escalations=${m.escalations.length}`);
} else if (cmd === 'lint') {
  const m = load(arg);
  const issues = lint(m).map((i) => ({ rule: i.rule, severity: i.severity, targetId: i.targetId, target: textOf(m, i.targetId), message_en: i.en, message_th: i.th }));
  if (asJson) console.log(JSON.stringify({ summary: summarize(issues), issues }, null, 2));
  else {
    issues.forEach((i) => console.log(`${i.severity.toUpperCase().padEnd(5)} ${i.rule} ${i.targetId}: ${i.message_en}\n        "${i.target}"`));
    const s = summarize(issues);
    console.log(`\n${s.error} error(s), ${s.warn} warning(s), ${s.info} suggestion(s)`);
  }
  process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
} else if (cmd === 'outline') {
  const m = load(arg);
  const rate = (c) => {
    const e = effectiveness(c);
    return [c.function, c.type, c.critical ? 'CRITICAL' : '', e != null ? `A${c.adequacy}xR${c.reliability}=${e}` : 'unrated', c.owner ? 'owner: ' + c.owner : ''].filter(Boolean).join(', ');
  };
  const out = [];
  out.push(`# ${m.meta.title || '(untitled)'}${m.meta.illustrative ? '  [ILLUSTRATIVE EXAMPLE]' : ''}`);
  if (m.meta.scope) out.push(`Scope: ${m.meta.scope}`);
  out.push(`HAZARD: ${m.hazard.text}`, `TOP EVENT: ${m.topEvent.text}`, '');
  const esc = (c, pad) => m.escalations.filter((e) => e.controlId === c.id).forEach((e) => {
    out.push(`${pad}! escalation factor: ${e.text}`);
    m.escalationControls.filter((x) => x.escalationId === e.id).forEach((x) => out.push(`${pad}  + escalation control: ${x.text}${x.owner ? ' (owner: ' + x.owner + ')' : ''}`));
  });
  out.push('LEFT SIDE (threats -> preventive controls -> top event)');
  m.threats.forEach((t, i) => {
    out.push(`T${i + 1}. ${t.text}${t.exposure ? ` [exposure ${t.exposure}]` : ''}`);
    controlsOf(m, 'prevent', t.id).forEach((c, j) => { out.push(`   P${j + 1}. ${c.text} (${rate(c)})`); esc(c, '       '); });
  });
  out.push('', 'RIGHT SIDE (top event -> recovery controls -> consequences)');
  m.consequences.forEach((co, i) => {
    out.push(`C${i + 1}. ${co.text}${co.severity ? ` [severity ${co.severity}]` : ''}`);
    controlsOf(m, 'recover', co.id).forEach((c, j) => { out.push(`   R${j + 1}. ${c.text} (${rate(c)})`); esc(c, '       '); });
  });
  console.log(out.join('\n'));
} else if (cmd === 'new') {
  const m = emptyModel();
  m.meta.title = arg || '';
  console.log(JSON.stringify(m, null, 2));
} else {
  console.error('usage: node cli/safetytool.js <validate|lint|outline|new> <file.json> [--json]');
  process.exit(2);
}
