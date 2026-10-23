// Attaches the holding-pattern entry-sector figure to the pilot "Based on the
// Figure, which sector requires a Direct / Parallel / Offset Entry" questions
// and scores them.
//
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/attach-figures.js            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/attach-figures.js --commit   (write)
//
// Needs migration 20261020000000_exam_question_figures.sql applied first. The
// picture (exams/figures/holding-entry-sectors.png, git-ignored client data) is
// the same one printed in every pilot exam. The answers follow the figure and
// match the client's own marked key: Parallel = Sector 1, Offset = Sector 2,
// Direct = Sector 3. Questions on an exam someone has already taken are skipped.
// Everything changed is backed up first.

const fs = require('fs');
const path = require('path');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const FIGURE = path.join(__dirname, '../../exams/figures/holding-entry-sectors.png');
const STORAGE_PATH = 'holding-entry-sectors.png';
const SECTOR = { direct: 3, parallel: 1, offset: 2 };
const STEM = /^Based on the Figure, which sector requires an? (Direct|Parallel|Offset) Entry to holding pattern\.?\s*$/i;

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: sets, error: setErr } = await sb.from('exam_sets').select('id, title').eq('audience', 'pilot');
  if (setErr) throw setErr;
  const title = Object.fromEntries(sets.map((s) => [s.id, s.title]));

  const { data: qs, error } = await sb
    .from('exam_questions')
    .select('id, exam_set_id, position, body, status, image_path, exam_options(id, position, body, is_correct)')
    .in('exam_set_id', sets.map((s) => s.id))
    .ilike('body', 'Based on the Figure, which sector%')
    .limit(1000);
  if (error) throw new Error(`${error.message} (is the migration applied?)`);

  const { data: attempts } = await sb.from('exam_attempts').select('exam_set_id').in('exam_set_id', sets.map((s) => s.id));
  const taken = new Set((attempts ?? []).map((a) => a.exam_set_id));

  const plan = [];
  for (const q of qs) {
    const m = q.body.match(STEM);
    if (!m) continue;
    const label = `${title[q.exam_set_id]} #${q.position}`;
    if (taken.has(q.exam_set_id)) { console.log(`SKIP (exam already taken) ${label}`); continue; }
    const want = SECTOR[m[1].toLowerCase()];
    const opts = [...q.exam_options].sort((a, b) => a.position - b.position);
    const right = opts.find((o) => o.body.trim() === `Sector ${want}`);
    if (opts.length !== 3 || !right) { console.log(`SKIP (options not Sector 1-3) ${label}`); continue; }
    plan.push({ q, label, right, opts, entry: m[1] });
  }

  for (const p of plan) console.log(`${p.label}: ${p.entry} Entry -> ${p.right.body}  [${p.q.status}${p.q.image_path ? ', has image' : ''}]`);
  console.log(`\n${plan.length} questions to update.`);
  if (!COMMIT) return console.log('(report only; pass --commit to write)');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(__dirname, `../../exams/backup-figures-${stamp}.json`), JSON.stringify(plan.map((p) => p.q), null, 1));

  const up = await sb.storage.from('exam-figures').upload(STORAGE_PATH, fs.readFileSync(FIGURE), { contentType: 'image/png', upsert: true });
  if (up.error) throw up.error;

  for (const p of plan) {
    const flags = await Promise.all(p.opts.map((o) => sb.from('exam_options').update({ is_correct: o.id === p.right.id }).eq('id', o.id)));
    const bad = flags.find((r) => r.error);
    if (bad) throw bad.error;
    const r = await sb.from('exam_questions').update({ image_path: STORAGE_PATH, status: 'ok', review_note: null }).eq('id', p.q.id);
    if (r.error) throw r.error;
  }
  console.log(`Done: ${plan.length} questions now show the figure and are scored.`);
})().catch((e) => { console.error(e); process.exit(1); });
