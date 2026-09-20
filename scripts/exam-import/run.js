// Loads the client's exam question banks into Supabase.
//
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/run.js            (dry run: report only)
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/run.js --commit   (write to the database)
//
// Safe to re-run: a set that already exists is replaced with the fresh parse,
// EXCEPT when anyone has already taken it -- attempts freeze their question
// order, so changing the questions underneath would corrupt them. Those sets
// are skipped with a warning.
//
// Also writes exams/import-review.csv (git-ignored): every question held out
// of scoring and why, to send back to the client for correction.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('../../node_modules/@supabase/supabase-js');
const { buildAll } = require('./parse');

const COMMIT = process.argv.includes('--commit');
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function writeReviewCsv(sets) {
  const rows = [['Exam', 'Skill level', 'Question #', 'Problem', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Marked correct']];
  for (const s of sets) {
    for (const q of s.questions.filter((x) => x.status !== 'ok')) {
      const marked = q.options.map((o, i) => (o.isKey ? String.fromCharCode(65 + i) : null)).filter(Boolean).join(', ') || 'none';
      rows.push([`${s.category} / ${s.title}`, s.skill_level || '', q.position, q.review_note, q.body, ...[0, 1, 2, 3, 4].map((i) => q.options[i]?.body ?? ''), marked]);
    }
  }
  const out = path.resolve(__dirname, '../../exams/import-review.csv');
  fs.writeFileSync(out, '﻿' + rows.map((r) => r.map(csv).join(',')).join('\r\n'));
  return { out, count: rows.length - 1 };
}

(async () => {
  const { sets, skipped } = await buildAll();
  const total = sets.reduce((a, s) => a + s.questions.length, 0);
  const review = sets.reduce((a, s) => a + s.questions.filter((q) => q.status !== 'ok').length, 0);
  const rv = writeReviewCsv(sets);
  console.log(`Parsed ${sets.length} exam sets, ${total} questions (${total - review} usable, ${review} held for review).`);
  console.log(`Review list: ${rv.out} (${rv.count} rows)`);
  console.log('Not imported:');
  skipped.forEach((s) => console.log(`  - ${s.dir}${s.skill ? ' (' + s.skill + ')' : ''}: ${s.reason}`));
  if (!COMMIT) return console.log('\nDry run only. Re-run with --commit to write to the database.');

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let done = 0, skippedSets = 0;
  for (const s of sets) {
    const { data: existing, error: e1 } = await sb.from('exam_sets').select('id').eq('source_file', s.source_file).maybeSingle();
    if (e1) throw e1;
    let setId = existing?.id;
    if (setId) {
      const { count } = await sb.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_set_id', setId);
      if (count > 0) { console.log(`  SKIP (already taken ${count}x): ${s.title} ${s.skill_level || ''}`); skippedSets++; continue; }
      const del = await sb.from('exam_questions').delete().eq('exam_set_id', setId);
      if (del.error) throw del.error;
      const up = await sb.from('exam_sets').update({ code: s.code, title: s.title, category: s.category, skill_level: s.skill_level, audience: s.audience }).eq('id', setId);
      if (up.error) throw up.error;
    } else {
      const ins = await sb.from('exam_sets').insert({ code: s.code, title: s.title, category: s.category, skill_level: s.skill_level, audience: s.audience, source_file: s.source_file }).select('id').single();
      if (ins.error) throw ins.error;
      setId = ins.data.id;
    }
    const qRows = [], oRows = [];
    for (const q of s.questions) {
      const qid = crypto.randomUUID();
      qRows.push({ id: qid, exam_set_id: setId, position: q.position, body: q.body, reference: q.reference, status: q.status, review_note: q.review_note });
      q.options.forEach((o, i) => oRows.push({ id: crypto.randomUUID(), question_id: qid, position: i + 1, body: o.body, is_correct: !!o.isKey }));
    }
    for (const part of chunk(qRows, 400)) { const r = await sb.from('exam_questions').insert(part); if (r.error) throw r.error; }
    for (const part of chunk(oRows, 800)) { const r = await sb.from('exam_options').insert(part); if (r.error) throw r.error; }
    done++;
    console.log(`  ok: ${(s.skill_level || '--').padEnd(3)} ${s.category} / ${s.title} (${s.questions.length} questions)`);
  }
  console.log(`\nImported ${done} sets${skippedSets ? `, skipped ${skippedSets}` : ''}.`);
})().catch((e) => { console.error('FAILED:', e.message || e); process.exit(1); });
