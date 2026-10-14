// Applies the client's answers from the returned "Exam questions to confirm"
// spreadsheet (sheet 1: one correct answer per held-back question).
//
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/apply-client-answers.js <answers.xlsx>            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/apply-client-answers.js <answers.xlsx> --commit   (write)
//
// For each answered question: the held question is finished (options come from
// a hand-written fix, else the client's marked-up PDF, else the database) and
// scored with the client's answer. A question the client answered DIFFERENTLY
// in different exams is left held (there is no single answer to apply).
//
// By default only the held questions change. Pass --carry to also change the
// key on the identical question in other exams (not used: it would rewrite
// hundreds of already-scored questions, some with answers that contradict each
// other) -- unsafe-looking answers are never carried either way.
// Writes exams/client-answers-report.csv; a backup of everything it changes
// goes to exams/backup-client-answers-<time>.json (all git-ignored).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { createClient } = require('../../node_modules/@supabase/supabase-js');
const { readHeldFixes, norm } = require('./held-fixes');

const COMMIT = process.argv.includes('--commit');
const CARRY = process.argv.includes('--carry');
const file = process.argv.find((a) => a.endsWith('.xlsx'));
if (!file) throw new Error('Pass the answers .xlsx as an argument.');
const EXAMS_DIR = path.resolve(__dirname, '../../exams');
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const setKey = (skill, category, title) => `${skill || ''}|${category}|${title}`;
const UNSAFE = /defuel|depuddl|fuel tank cell|respiratory protection|wiping spills of oil/i;

/** Index of the option the answer names (a letter, or the option's text), or -1. */
function pick(options, answer) {
  const a = String(answer).trim();
  if (/^[A-F]$/i.test(a)) {
    const i = a.toUpperCase().charCodeAt(0) - 65;
    return i < options.length ? i : -1;
  }
  const n = norm(a);
  if (!n) return -1;
  const exact = options.findIndex((o) => norm(o) === n);
  if (exact >= 0) return exact;
  const near = options.map((o, i) => [i, norm(o)]).filter(([, x]) => x && (x.includes(n) || n.includes(x)));
  return near.length === 1 ? near[0][0] : -1;
}

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // ---- the client's answers ----------------------------------------------
  const wb = XLSX.readFile(file);
  const sheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, range: 2, defval: '' });
  const answers = sheet
    .slice(1)
    .filter((r) => String(r[7]).trim())
    .map((r) => {
      const m = String(r[0]).match(/^(?:(3rd|5th|7th) Skill - )?(.+?) \/ (.+)$/);
      return { skill: m?.[1] || null, category: m?.[2], title: m?.[3], position: Number(r[1]), question: String(r[2]), otherAnswer: String(r[5]).trim(), answer: String(r[7]).trim() };
    });
  console.log(`Answers read: ${answers.length}`);

  // The same question answered differently in different exams has no single answer.
  const answersByQuestion = new Map();
  for (const a of answers) {
    const k = norm(a.question).slice(0, 90);
    if (!answersByQuestion.has(k)) answersByQuestion.set(k, new Set());
    answersByQuestion.get(k).add(norm(a.answer));
  }
  const contradictory = (a) => answersByQuestion.get(norm(a.question).slice(0, 90)).size > 1;

  // ---- everything in the bank, indexed by identical question text ----------
  const { data: sets } = await sb.from('exam_sets').select('id, skill_level, category, title');
  const setByKey = new Map(sets.map((s) => [setKey(s.skill_level, s.category, s.title), s]));
  const setById = new Map(sets.map((s) => [s.id, s]));
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('exam_questions').select('id, exam_set_id, position, body, status, exam_options(id, position, body, is_correct)').order('id').range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
  }
  const byStem = new Map();
  for (const q of all) {
    const k = norm(q.body);
    if (!byStem.has(k)) byStem.set(k, []);
    byStem.get(k).push(q);
  }
  const byPos = new Map(all.map((q) => [`${q.exam_set_id}#${q.position}`, q]));

  // ---- where a finished question's options come from ------------------------
  const manualPath = path.join(EXAMS_DIR, 'held-fixes-manual.json');
  const manual = fs.existsSync(manualPath) ? JSON.parse(fs.readFileSync(manualPath, 'utf8')) : [];
  const fixes = await readHeldFixes(path.join(EXAMS_DIR, 'New Held Back Questions.pdf'));

  const report = [];
  const writes = []; // { q, stem, options[], correctIndex }
  const targetIds = new Set();
  for (const a of answers) {
    const base = { exam: `${a.category} / ${a.title}`, skill: a.skill || '', position: a.position, question: a.question };
    const set = setByKey.get(setKey(a.skill, a.category, a.title));
    const q = set && byPos.get(`${set.id}#${a.position}`);
    if (contradictory(a)) { report.push({ ...base, result: 'Left held', note: 'the client answered this same question differently in other exams: needs one answer' }); continue; }
    if (!q) { report.push({ ...base, result: 'Left held', note: 'question not found in the database' }); continue; }
    if (q.status === 'ok') { report.push({ ...base, result: 'Skipped', note: 'already scored' }); continue; }
    if (a.question && norm(q.body).slice(0, 20) !== norm(a.question).slice(0, 20) && !manual.some((m) => m.exam === base.exam && (m.skill || null) === a.skill && m.position === a.position)) {
      // (the sheet shows the question text as it was; allow for fixed stems)
    }

    const dbOpts = [...q.exam_options].sort((x, y) => x.position - y.position).map((o) => o.body);
    const man = manual.find((m) => m.exam === base.exam && (m.skill || null) === a.skill && m.position === a.position && m.options);
    const fix = fixes.find((f) => `${f.set.category} / ${f.set.title}` === base.exam && (f.set.skill || null) === a.skill && f.position === a.position && f.status === 'resolved');
    let stem = q.body;
    let options = dbOpts;
    let source = 'database';
    if (man) { stem = man.stem; options = man.options; source = 'hand-written fix'; }
    else if (fix) { stem = fix.stem; options = fix.options; source = "client's marked-up PDF"; }
    else if (dbOpts.length < 2) { report.push({ ...base, result: 'Left held', note: 'the options are incomplete and the answer cannot be matched' }); continue; }

    const idx = pick(options, a.answer);
    if (idx < 0) { report.push({ ...base, result: 'Left held', note: `answer "${a.answer}" does not match any option (${source})` }); continue; }

    const unsafe = UNSAFE.test(a.question) && norm(a.answer) !== norm(a.otherAnswer);
    writes.push({ q, stem, options, correctIndex: idx, unsafe, answerText: options[idx], source, base });
    targetIds.add(q.id);
    report.push({ ...base, result: COMMIT ? 'Applied' : 'Would apply', answer: options[idx], note: `${source}${unsafe ? '; UNSAFE-looking answer, applied as the client wrote it, NOT carried to other exams' : ''}` });
  }

  // ---- carry the client's answer to the identical question elsewhere ----------
  const carried = [];
  for (const w of writes) {
    if (!CARRY || w.unsafe) continue;
    for (const other of byStem.get(norm(w.stem)) || byStem.get(norm(w.q.body)) || []) {
      if (other.id === w.q.id || targetIds.has(other.id) || other.status !== 'ok') continue;
      const opts = [...other.exam_options].sort((x, y) => x.position - y.position);
      const keyNow = opts.find((o) => o.is_correct);
      const j = pick(opts.map((o) => o.body), w.answerText);
      if (j < 0 || (keyNow && keyNow.id === opts[j].id)) continue;
      carried.push({ other, optionId: opts[j].id, newKey: opts[j].body, oldKey: keyNow?.body ?? '', from: w.base });
    }
  }
  // one change per question, in case several answers point at it
  const carriedById = new Map();
  for (const c of carried) if (!carriedById.has(c.other.id)) carriedById.set(c.other.id, c);

  // ---- report ----------------------------------------------------------------
  const tally = {};
  report.forEach((r) => (tally[r.result] = (tally[r.result] || 0) + 1));
  const unsafeN = writes.filter((w) => w.unsafe).length;
  console.log('Held questions:', tally, `(of which unsafe-looking, applied as written: ${unsafeN})`);
  console.log(CARRY ? `Identical questions in other exams to update to the client's answer: ${carriedById.size}` : 'Other exams are left as they are (no --carry).');
  const rows = [['Exam', 'Skill', 'Question #', 'Question', 'Result', "Client's answer / new key", 'Previous key', 'Note']];
  report.forEach((r) => rows.push([r.exam, r.skill, r.position, r.question, r.result, r.answer || '', '', r.note || '']));
  for (const c of carriedById.values()) {
    const s = setById.get(c.other.exam_set_id);
    rows.push([`${s.category} / ${s.title}`, s.skill_level || '', c.other.position, c.other.body, COMMIT ? 'Key changed (copy)' : 'Would change key (copy)', c.newKey, c.oldKey, `to match the client's answer for ${c.from.exam} #${c.from.position}`]);
  }
  const reportPath = path.join(EXAMS_DIR, 'client-answers-report.csv');
  fs.writeFileSync(reportPath, '﻿' + rows.map((r) => r.map(csv).join(',')).join('\r\n'));
  console.log('Report:', reportPath);
  if (!COMMIT) return console.log('\nReport only. Re-run with --commit to write.');

  // ---- backup, then write -----------------------------------------------------
  const touched = [...writes.map((w) => w.q.id), ...carriedById.keys()];
  const before = [];
  for (let i = 0; i < touched.length; i += 100) {
    const { data, error } = await sb.from('exam_questions').select('*, exam_options(*)').in('id', touched.slice(i, i + 100));
    if (error) throw error;
    before.push(...data);
  }
  const backupPath = path.join(EXAMS_DIR, `backup-client-answers-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(before, null, 2));
  console.log(`Backed up ${before.length} questions to ${backupPath}`);

  for (const w of writes) {
    const del = await sb.from('exam_options').delete().eq('question_id', w.q.id);
    if (del.error) throw del.error;
    const ins = await sb.from('exam_options').insert(w.options.map((body, i) => ({ id: crypto.randomUUID(), question_id: w.q.id, position: i + 1, body, is_correct: i === w.correctIndex })));
    if (ins.error) throw ins.error;
    const up = await sb.from('exam_questions').update({ body: w.stem, status: 'ok', review_note: null }).eq('id', w.q.id);
    if (up.error) throw up.error;
  }
  for (const c of carriedById.values()) {
    const off = await sb.from('exam_options').update({ is_correct: false }).eq('question_id', c.other.id);
    if (off.error) throw off.error;
    const on = await sb.from('exam_options').update({ is_correct: true }).eq('id', c.optionId);
    if (on.error) throw on.error;
  }
  console.log(`\nApplied ${writes.length} held questions and changed the key on ${carriedById.size} identical questions in other exams.`);
})().catch((e) => { console.error('FAILED:', e.message || e); process.exit(1); });
