// Loads the client's PDF exams (pilot Stan/Eval exams + the Maintenance Officer
// Stan/Eval exam) into Supabase. Separate from run.js on purpose: re-running
// run.js would reset every correction made since it first ran.
//
//   PDFTOTEXT=<poppler pdftotext.exe> node --experimental-websocket --env-file=.env.local scripts/exam-import/run-pdf.js
//   ... run-pdf.js --commit
//
// Safe to re-run: a set that already exists is replaced with the fresh parse,
// unless somebody has already taken it (attempts freeze their question order).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('../../node_modules/@supabase/supabase-js');
const { parseFormsPdf } = require('./pdf-forms');

const COMMIT = process.argv.includes('--commit');
const EXAMS_DIR = path.resolve(__dirname, '../../exams');
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const PILOT = { category: 'Pilot Stan/Eval', audience: 'pilot' };
const SETS = [
  { file: 'exam-pilots/BELL412 STAN_EVAL EXAM (OPEN BOOK).pdf', title: 'Bell 412 (Open Book)', aircraft: 'bell412', ...PILOT },
  { file: 'exam-pilots/C295 STANEVAL EXAM (OPEN BOOK).pdf', title: 'C295 (Open Book)', aircraft: 'c295', ...PILOT },
  { file: 'exam-pilots/G280 STAN_EVAL EXAM (OPEN BOOK).pdf', title: 'Gulfstream G280 (Open Book)', aircraft: 'g280', ...PILOT },
  { file: 'exam-pilots/HAWKER 800XP STANEVAL EXAM (OPEN BOOK).pdf', title: 'H800XP (Open Book)', aircraft: 'h800xp', ...PILOT },
  { file: 'exam-pilots/S70i Blackhawk STANEVAL EXAM (OPEN-BOOK).pdf', title: 'S-70i Black Hawk (Open Book)', aircraft: 's70i', ...PILOT },
  {
    file: 'exam-maintenance-officers/MAINTENANCE OFFICER STAN_EVAL EXAM.pdf',
    title: 'Maintenance Officer Stan/Eval',
    category: 'Maintenance Management',
    audience: 'maintenance',
    aircraft: null,
  },
];

(async () => {
  const sets = SETS.map((s) => {
    const questions = parseFormsPdf(path.join(EXAMS_DIR, s.file));
    return { ...s, source_file: 'pdf:' + s.file, questions };
  });

  const rows = [['Exam', 'Question #', 'Problem', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Marked correct']];
  for (const s of sets) {
    const held = s.questions.filter((q) => q.status !== 'ok');
    const optCounts = {};
    s.questions.forEach((q) => (optCounts[q.options.length] = (optCounts[q.options.length] || 0) + 1));
    console.log(`${s.title.padEnd(32)} ${String(s.questions.length).padStart(4)} questions, ${s.questions.length - held.length} usable, ${held.length} held  (options per question: ${JSON.stringify(optCounts)})`);
    for (const q of held) {
      const marked = q.options.map((o, i) => (o.isKey ? String.fromCharCode(65 + i) : null)).filter(Boolean).join(', ') || 'none';
      rows.push([`${s.category} / ${s.title}`, q.position, q.review_note, q.body, ...[0, 1, 2, 3, 4].map((i) => q.options[i]?.body ?? ''), marked]);
    }
  }
  const reviewPath = path.join(EXAMS_DIR, 'import-review-pdf.csv');
  fs.writeFileSync(reviewPath, '﻿' + rows.map((r) => r.map(csv).join(',')).join('\r\n'));
  console.log(`Held-back list: ${reviewPath} (${rows.length - 1} rows)`);

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // How much of the existing 150-question Maintenance Officer set is in the new exam?
  const mo = sets.find((s) => s.audience === 'maintenance');
  const { data: oldSet } = await sb.from('exam_sets').select('id').eq('category', 'Maintenance Management').eq('title', 'Maintenance Officer').maybeSingle();
  if (oldSet) {
    const { data: oldQs } = await sb.from('exam_questions').select('body').eq('exam_set_id', oldSet.id);
    const newStems = new Set(mo.questions.map((q) => norm(q.body)));
    const inNew = (oldQs || []).filter((q) => newStems.has(norm(q.body))).length;
    console.log(`Existing "Maintenance Officer" set: ${inNew} of ${(oldQs || []).length} questions also appear in the new exam.`);
  }

  if (!COMMIT) return console.log('\nDry run only. Re-run with --commit to write to the database.');

  let done = 0;
  for (const s of sets) {
    const meta = {
      title: s.title,
      category: s.category,
      skill_level: null,
      audience: s.audience,
      aircraft_type_code: s.aircraft,
    };
    const { data: existing, error: e1 } = await sb.from('exam_sets').select('id').eq('source_file', s.source_file).maybeSingle();
    if (e1) throw e1;
    let setId = existing?.id;
    if (setId) {
      const { count } = await sb.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_set_id', setId);
      if (count > 0) { console.log(`  SKIP (already taken ${count}x): ${s.title}`); continue; }
      const del = await sb.from('exam_questions').delete().eq('exam_set_id', setId);
      if (del.error) throw del.error;
      const up = await sb.from('exam_sets').update(meta).eq('id', setId);
      if (up.error) throw up.error;
    } else {
      const ins = await sb.from('exam_sets').insert({ ...meta, source_file: s.source_file }).select('id').single();
      if (ins.error) throw ins.error;
      setId = ins.data.id;
    }
    const qRows = [], oRows = [];
    for (const q of s.questions) {
      const qid = crypto.randomUUID();
      qRows.push({ id: qid, exam_set_id: setId, position: q.position, body: q.body, status: q.status, review_note: q.review_note });
      q.options.forEach((o, i) => oRows.push({ id: crypto.randomUUID(), question_id: qid, position: i + 1, body: o.body, is_correct: !!o.isKey }));
    }
    for (const part of chunk(qRows, 400)) { const r = await sb.from('exam_questions').insert(part); if (r.error) throw r.error; }
    for (const part of chunk(oRows, 800)) { const r = await sb.from('exam_options').insert(part); if (r.error) throw r.error; }
    done++;
    console.log(`  ok: ${s.category} / ${s.title} (${s.questions.length} questions)`);
  }
  console.log(`\nImported ${done} sets.`);
})().catch((e) => { console.error('FAILED:', e.message || e); process.exit(1); });
