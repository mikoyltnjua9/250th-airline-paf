// Parses the client's exam files into a normalized structure. No DB access here.
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../exams/2026 Stan Eval updated/STANEVAL EXAM').split(path.sep).join('/');

const norm = (s) => String(s).toLowerCase().replace(/^\s*[a-e][\.\)]\s+/, '').replace(/[^a-z0-9]+/g, '');
const clean = (s) => String(s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const stripLetter = (s) => clean(s).replace(/^\(?[a-eA-E][\.\)]\s*/, '');
const stripNumber = (s) => clean(s).replace(/^\d+[\.\)]\s*/, '');

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
}

// ---------- spreadsheet: structure + key ----------
function parseXlsx(file) {
  const wb = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  const questions = [];
  let cur = null;
  for (const r of rows) {
    const a = String(r[0]).trim();
    const b = String(r[1]).trim();
    const isOption = /^\(?[a-eA-E][\.\)]/.test(b);
    if (isOption && cur) {
      cur.options.push({ body: stripLetter(b), isKey: a === '*' });
    } else if (a && a !== '*') {
      cur = { body: stripNumber(a), options: [] };
      questions.push(cur);
    } else if (!isOption && b && !/^\d+$/.test(b) && cur && cur.options.length === 0 && !a) {
      cur.body = clean(cur.body + ' ' + b); // wrapped question text
    }
  }
  return questions;
}

// ---------- Word file: bold text = correct answer (used to cross-check / derive keys) ----------
async function docxBoldSet(file) {
  const html = (await mammoth.convertToHtml({ path: file })).value;
  const set = new Set();
  for (const m of html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)) {
    const t = norm(m[1].replace(/<[^>]+>/g, ''));
    if (t.length > 0) set.add(t);
  }
  return set;
}

// ---------- Maintenance Officer / QCI docx: "1. question / (ref) / A. .. B. .." with bold answer ----------
async function parseLetteredDocx(file) {
  const html = (await mammoth.convertToHtml({ path: file })).value;
  const paras = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => ({
    text: clean(m[1].replace(/<[^>]+>/g, '')),
    bold: [...m[1].matchAll(/<strong>([\s\S]*?)<\/strong>/g)].some((x) => clean(x[1].replace(/<[^>]+>/g, '')).replace(/^[A-E][\.\)]\s*/, '').length > 2),
  }));
  const questions = [];
  let cur = null;
  for (const p of paras) {
    if (!p.text) continue;
    const q = p.text.match(/^(\d+)\.\s+(.*)$/);
    const o = p.text.match(/^([A-E])[\.\)]\s+(.*)$/);
    if (q && !(o && cur && cur.options.length && cur.options.length < 4 && false)) {
      // a new numbered question (options are lettered, never numbered)
      cur = { body: q[2], options: [], reference: null, issues: [] };
      questions.push(cur);
    } else if (o && cur) {
      // two options crammed into one paragraph ("A. x B. y") -> malformed, flag
      if (/\s[B-E][\.\)]\s/.test(o[2])) cur.issues.push('two or more options run together on one line');
      cur.options.push({ body: o[2], isKey: p.bold });
    } else if (cur && cur.options.length === 0 && /^\(.*\)$/.test(p.text)) {
      cur.reference = p.text.replace(/^\(|\)$/g, '');
    } else if (cur && cur.options.length === 0 && !/^\(/.test(p.text)) {
      cur.body = clean(cur.body + ' ' + p.text);
    }
  }
  return questions;
}

// ---------- Flight Attendant: HTML export, filled circle marks the answer ----------
function parseFlightAttendant(file) {
  const html = fs.readFileSync(file, 'utf8');
  const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
  const text = (s) => clean(decode(s.replace(/<[^>]+>/g, ' ')));
  const parts = html.split('<table class="question-block">').slice(1);
  return parts.map((blk) => {
    const qHtml = blk.split('</table>')[0];
    const qCell = qHtml.match(/<td width="100%"[^>]*>([\s\S]*?)<\/td>/);
    const body = stripNumber(qCell ? text(qCell[1]) : '');
    const ansHtml = blk.split('class="answer"')[1] || '';
    const rows = [...ansHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
    const options = rows.map((r) => ({ body: text((r.match(/<p>([\s\S]*?)<\/p>/) || [, ''])[1]), isKey: r.includes('&#x26AB;') })).filter((o) => o.body);
    return { body, options, issues: [] };
  });
}

// ---------- assemble ----------
function finalize(questions, { boldSet, sourceHasKeys }) {
  return questions.map((q, i) => {
    const issues = [...(q.issues || [])];
    let keys = q.options.filter((o) => o.isKey).length;
    // No key in the sheet: derive it from the Word file's bold text, if exactly one option matches.
    if (!sourceHasKeys && boldSet) {
      const hit = q.options.map((o) => boldSet.has(norm(o.body)));
      if (hit.filter(Boolean).length === 1) {
        q.options.forEach((o, k) => (o.isKey = hit[k]));
        keys = 1;
      }
    } else if (keys === 1 && boldSet) {
      const key = q.options.find((o) => o.isKey);
      // Cross-check: the key option should also be bold in the Word file. Only complain when
      // *another* option is bold instead (a real disagreement, not a formatting gap).
      const others = q.options.filter((o) => !o.isKey && boldSet.has(norm(o.body)));
      if (!boldSet.has(norm(key.body)) && others.length === 1) issues.push('spreadsheet and Word file disagree on the correct answer');
    }
    if (q.options.length < 2) issues.push('fewer than 2 options');
    if (q.options.length > 5) issues.push('more than 5 options (likely merged questions)');
    if (keys === 0) issues.push('no correct answer marked');
    if (keys > 1) issues.push('more than one correct answer marked');
    if (!q.body) issues.push('empty question text');
    return { position: i + 1, body: q.body, reference: q.reference || null, options: q.options, status: issues.length ? 'needs_review' : 'ok', review_note: issues.join('; ') || null };
  });
}

const skillOf = (s) => (s.match(/(3rd|5th|7th)(?=[\s_\/]|$)/i) || [])[1] || null;
const codeOf = (s) => (s.match(/(?:^|[\\/\s])(\d{5})(?=\s*[-–])/) || [])[1] || null;

async function buildAll() {
  const files = walk(ROOT).map((f) => f.split(path.sep).join('/'));
  const sets = [];
  const skipped = [];

  // 1) Folder-based sets: categories 1, 2, 3(Analysis), 4 -- one exam per (folder, skill)
  const leaf = {};
  for (const f of files) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/');
    if (/References|MO_QCI|\.zip$|Flight Attendant|5th Skill\/5th Skill/.test(rel)) continue;
    if (!/\.(xlsx|docx|csv)$/i.test(rel)) continue;
    const dir = path.dirname(rel);
    const skill = skillOf(rel.replace(/.*\//, '')) && /Maintenance Management_Analysis/.test(dir) ? skillOf(rel.replace(/.*\//, '')) : skillOf(dir);
    const key = dir + '|' + skill;
    (leaf[key] = leaf[key] || { dir, skill, xlsx: [], docx: [], csv: [] })[path.extname(rel).slice(1).toLowerCase()].push(f);
  }
  for (const g of Object.values(leaf)) {
    const parts = g.dir.split('/');
    const category = parts[0].replace(/^\d+\.\s*/, '');
    const subject = parts[parts.length - 1].replace(/^\d+\.\s*/, '').replace(/^\d(st|nd|rd|th) Skill$/, '') || parts[parts.length - 2].replace(/^\d+\.\s*/, '');
    const title = /Maintenance Management_Analysis/.test(g.dir) ? 'Maintenance Management Analysis' : subject.replace(/\s+/g, ' ').trim();
    if (!g.xlsx.length) { skipped.push({ dir: g.dir, skill: g.skill, reason: 'no answer-key spreadsheet (' + (g.csv.length ? 'only a csv: ' + path.basename(g.csv[0]) : 'Word file only') + ')' }); continue; }
    // best spreadsheet = the one with the most keys marked
    let best = null;
    for (const x of g.xlsx) {
      const qs = parseXlsx(x);
      const keyed = qs.filter((q) => q.options.some((o) => o.isKey)).length;
      if (!best || keyed > best.keyed || (keyed === best.keyed && qs.length > best.qs.length)) best = { x, qs, keyed };
    }
    const docx = g.docx[0];
    const boldSet = docx ? await docxBoldSet(docx) : null;
    const sourceHasKeys = best.keyed > best.qs.length / 2;
    sets.push({
      code: codeOf(path.basename(best.x)) || codeOf(docx || ''), title, category, skill_level: g.skill, audience: 'maintenance',
      source_file: path.relative(ROOT, best.x).split(path.sep).join('/'),
      note: !sourceHasKeys ? 'key taken from the Word file (spreadsheet had no answers marked)' : null,
      questions: finalize(best.qs, { boldSet, sourceHasKeys }),
    });
  }

  // 2) Maintenance Officer + QCI (Word only, lettered)
  for (const [file, title] of [['3. Maintenance Management/MO_QCI/MAINTENANCE OFFICER STANEVAL EXAM.docx', 'Maintenance Officer'], ['3. Maintenance Management/MO_QCI/Quality Control Inspector.docx', 'Quality Control Inspector']]) {
    const qs = await parseLetteredDocx(path.join(ROOT, file));
    sets.push({ code: null, title, category: 'Maintenance Management', skill_level: null, audience: 'maintenance', source_file: file, note: null, questions: finalize(qs, { boldSet: null, sourceHasKeys: true }) });
  }
  skipped.push({ dir: '3. Maintenance Management/MO_QCI/MO QCI REVIEWER.docx', skill: null, reason: 'study reviewer: the Maintenance Officer + QCI exams combined (298 items) -- covered by the two exams above' });

  // 3) Flight attendant
  const fa = parseFlightAttendant(path.join(ROOT, '5. Flight Attendant/Flight Attendant.doc'));
  sets.push({ code: null, title: 'Flight Attendant', category: 'Flight Attendant', skill_level: null, audience: 'cabin_crew', source_file: '5. Flight Attendant/Flight Attendant.doc', note: 'answer = the filled circle in the export (assumed to be the key)', questions: finalize(fa, { boldSet: null, sourceHasKeys: true }) });

  skipped.push({ dir: '4. Rotary Specialization/5th Skill.zip + References_Rotary/*', skill: null, reason: 'older / alternate copies of banks already imported (reference material)' });
  return { sets, skipped };
}

module.exports = { buildAll };
if (require.main === module) {
  buildAll().then(({ sets, skipped }) => {
    let total = 0, ok = 0, review = 0;
    for (const s of sets) { const r = s.questions.filter((q) => q.status !== 'ok').length; total += s.questions.length; review += r; ok += s.questions.length - r; }
    console.log('sets:', sets.length, '| questions:', total, '| ok:', ok, '| needs review:', review);
    console.log('\nPER SET (skill | title | questions | needs_review):');
    for (const s of sets) console.log(' ', (s.skill_level || '--').padEnd(4), '|', (s.category.slice(0, 12) + ' / ' + s.title).padEnd(55), '|', String(s.questions.length).padStart(3), '|', s.questions.filter((q) => q.status !== 'ok').length, s.note ? '  <- ' + s.note : '');
    console.log('\nSKIPPED:'); skipped.forEach((s) => console.log('  -', s.dir, s.skill || '', '=>', s.reason));
    fs.writeFileSync('parsed.json', JSON.stringify({ sets, skipped }));
  });
}
