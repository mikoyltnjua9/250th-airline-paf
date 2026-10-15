// Applies a hand-checked list of fixes to held-back questions.
//
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/apply-fix-list.js <fixes.json>            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/apply-fix-list.js <fixes.json> --commit   (write)
//
// <fixes.json> is a list kept with the other client data in exams/ (git-ignored:
// it contains answer keys). Each entry names one question and what to do:
//
//   { "exam": "Category / Title", "skill": "5th" | null, "position": 45,
//     "match": "start of the question as saved",          // safety check
//     "action": "set",                                    // or "delete"
//     "stem": "...", "options": ["...", "..."], "correctIndex": 2,
//     "extra": [ { "stem", "options", "correctIndex": null } ] }   // optional new questions
//
// "set" rewrites the question and scores it. "delete" removes it. An "extra"
// question with a null correctIndex is added but stays held (no answer yet).
// Questions whose exam has already been taken are skipped. Everything changed
// is backed up first.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const file = process.argv.find((a) => a.endsWith('.json'));
if (!file) throw new Error('Pass the fixes .json as an argument.');
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const fixes = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { data: sets } = await sb.from('exam_sets').select('id, skill_level, category, title');

  const plan = [];
  const log = [];
  for (const f of fixes) {
    const label = `${f.skill || '--'} ${f.exam} #${f.position}`;
    const m = f.exam.match(/^(.+?) \/ (.+)$/);
    const set = sets.find((s) => s.category === m[1] && s.title === m[2] && (s.skill_level || null) === (f.skill || null));
    if (!set) { log.push([label, 'SKIPPED', 'exam not found']); continue; }
    const { count } = await sb.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_set_id', set.id);
    if (count > 0) { log.push([label, 'SKIPPED', 'exam already taken']); continue; }
    const { data: q } = await sb.from('exam_questions').select('id, body, status, exam_options(id, position, body, is_correct)').eq('exam_set_id', set.id).eq('position', f.position).maybeSingle();
    if (!q) { log.push([label, 'SKIPPED', 'question not found (already changed?)']); continue; }
    if (f.match && !norm(q.body).startsWith(norm(f.match))) { log.push([label, 'SKIPPED', `question text does not start with "${f.match}"`]); continue; }
    if (f.action === 'set' && (!f.options || f.options.length < 2 || !(f.correctIndex >= 0 && f.correctIndex < f.options.length))) { log.push([label, 'SKIPPED', 'bad options / correctIndex']); continue; }
    plan.push({ f, q, set, label });
    log.push([label, COMMIT ? 'DONE' : 'WOULD DO', f.action === 'delete' ? 'delete' : `score "${f.options[f.correctIndex]}"${f.extra?.length ? ` + ${f.extra.length} new question(s)` : ''}`]);
  }
  log.forEach((l) => console.log(l[1].padEnd(9), l[0].padEnd(70), l[2]));
  console.log(`\n${plan.length} of ${fixes.length} fixes ready.`);
  if (!COMMIT) return console.log('Report only. Re-run with --commit to write.');

  const before = plan.map((p) => p.q);
  const backupPath = path.resolve(__dirname, `../../exams/backup-fix-list-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(before, null, 2));
  console.log('Backup:', backupPath);

  const addQuestion = async (setId, stem, options, correctIndex, note) => {
    const { data: last } = await sb.from('exam_questions').select('position').eq('exam_set_id', setId).order('position', { ascending: false }).limit(1).single();
    const qid = crypto.randomUUID();
    const held = correctIndex == null;
    const insQ = await sb.from('exam_questions').insert({ id: qid, exam_set_id: setId, position: last.position + 1, body: stem, status: held ? 'needs_review' : 'ok', review_note: held ? note || 'no correct answer marked' : null });
    if (insQ.error) throw insQ.error;
    const insO = await sb.from('exam_options').insert(options.map((body, i) => ({ id: crypto.randomUUID(), question_id: qid, position: i + 1, body, is_correct: i === correctIndex })));
    if (insO.error) throw insO.error;
  };

  for (const { f, q, set } of plan) {
    if (f.action === 'delete') {
      const del = await sb.from('exam_questions').delete().eq('id', q.id);
      if (del.error) throw del.error;
      continue;
    }
    const del = await sb.from('exam_options').delete().eq('question_id', q.id);
    if (del.error) throw del.error;
    const ins = await sb.from('exam_options').insert(f.options.map((body, i) => ({ id: crypto.randomUUID(), question_id: q.id, position: i + 1, body, is_correct: i === f.correctIndex })));
    if (ins.error) throw ins.error;
    const up = await sb.from('exam_questions').update({ body: f.stem ?? q.body, status: 'ok', review_note: null }).eq('id', q.id);
    if (up.error) throw up.error;
    for (const e of f.extra || []) await addQuestion(set.id, e.stem, e.options, e.correctIndex, e.note);
  }
  console.log(`\nApplied ${plan.length} fixes.`);
})().catch((e) => { console.error('FAILED:', e.message || e); process.exit(1); });
