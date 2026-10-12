// Applies the client's corrections to the held-back questions.
//
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/apply-held-fixes.js            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/exam-import/apply-held-fixes.js --commit   (write)
//
// Reads exams/New Held Back Questions.pdf (see held-fixes.js for how the
// client's markings are read). Only unambiguous decisions are applied; every
// question gets a line in exams/held-fixes-report.csv saying what happened.
// Also cross-checks each applied answer against the original sheet / Word file.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('../../node_modules/@supabase/supabase-js');
const { readHeldFixes, norm } = require('./held-fixes');
const { buildAll } = require('./parse');

const COMMIT = process.argv.includes('--commit');
const EXAMS_DIR = path.resolve(__dirname, '../../exams');
const PDF = path.join(EXAMS_DIR, 'New Held Back Questions.pdf');
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const setKey = (skill, category, title) => `${skill || ''}|${category}|${title}`;

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const fixes = await readHeldFixes(PDF);

  const { data: dbSets, error: setErr } = await sb.from('exam_sets').select('id, skill_level, category, title');
  if (setErr) throw setErr;
  const setByKey = new Map(dbSets.map((s) => [setKey(s.skill_level, s.category, s.title), s]));

  // What the original sheet / Word file said, for the cross-check.
  const wordBySet = new Map();
  try {
    const { sets } = await buildAll();
    for (const s of sets) {
      wordBySet.set(setKey(s.skill_level, s.category, s.title), new Map(s.questions.map((q) => [q.position, q])));
    }
  } catch (e) {
    console.log('(could not re-read the original files for the cross-check: ' + e.message + ')');
  }

  // The same question often appears in several exams (other skill levels, other
  // aircraft). Index every question that has exactly one marked answer, so a
  // correction that contradicts the identical question elsewhere can be caught.
  const keyedElsewhere = new Map(); // normalized stem -> [{ qid, answer }]
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await sb
      .from('exam_questions')
      .select('id, body, exam_options(body, is_correct)')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    for (const q of page) {
      const keys = q.exam_options.filter((o) => o.is_correct);
      if (keys.length !== 1) continue;
      const k = norm(q.body);
      if (!keyedElsewhere.has(k)) keyedElsewhere.set(k, []);
      keyedElsewhere.get(k).push({ qid: q.id, answer: keys[0].body });
    }
    if (page.length < 1000) break;
  }
  const sameAnswer = (a, b) => {
    const x = norm(a);
    const y = norm(b);
    return x === y || x.includes(y) || y.includes(x);
  };
  /** An identical question elsewhere whose marked answer differs, if any. */
  const conflictFor = (qid, stem, answer) =>
    (keyedElsewhere.get(norm(stem)) || []).find((o) => o.qid !== qid && !sameAnswer(o.answer, answer));

  const rows = [];
  const toApply = [];
  const toDelete = [];
  const attemptsCache = new Map();

  // Hand-written fixes for the questions the client answered but that the
  // print-out can't express mechanically (options run together in the stem, one
  // question merged into another, ...). Kept in exams/ with the other client
  // data: it contains answer keys, so it is never committed.
  const manualPath = path.join(EXAMS_DIR, 'held-fixes-manual.json');
  const manual = fs.existsSync(manualPath) ? JSON.parse(fs.readFileSync(manualPath, 'utf8')) : [];
  const manualFor = (f) =>
    manual.find(
      (m) => m.exam === `${f.set.category} / ${f.set.title}` && (m.skill || null) === (f.set.skill || null) && m.position === f.position,
    );

  for (const f of fixes) {
    const key = setKey(f.set.skill, f.set.category, f.set.title);
    const dbSet = setByKey.get(key);
    const base = { exam: `${f.set.category} / ${f.set.title}`, skill: f.set.skill || '', position: f.position, question: f.stem };
    if (!dbSet) { rows.push({ ...base, result: 'Left held', reason: 'exam not found in the database' }); continue; }

    const { data: q } = await sb
      .from('exam_questions')
      .select('id, body, status, exam_options(id, position, body, is_correct)')
      .eq('exam_set_id', dbSet.id)
      .eq('position', f.position)
      .maybeSingle();
    if (!q) { rows.push({ ...base, result: 'Left held', reason: 'question not found in the database' }); continue; }
    if (q.status === 'ok') { rows.push({ ...base, result: 'Skipped', reason: 'already resolved in the database' }); continue; }
    // (A hand-written fix carries its own match check below.)
    if (!manualFor(f) && norm(q.body).slice(0, 25) !== norm(f.stem).slice(0, 25)) {
      rows.push({ ...base, result: 'Left held', reason: 'question text in the print-out differs from the database' });
      continue;
    }

    const dbOptions = [...q.exam_options].sort((a, b) => a.position - b.position);
    base.optionsText = dbOptions.map((o, i) => `${'ABCDEF'[i]}. ${o.body}`).join(' | ');
    const oldKey = dbOptions.find((o) => o.is_correct)?.body ?? '';
    const word = wordBySet.get(key)?.get(f.position)?.wordAnswer ?? '';

    const m = manualFor(f);
    if (m) {
      if (m.match && !norm(q.body).startsWith(norm(m.match))) {
        rows.push({ ...base, result: 'Left held', reason: 'hand-written fix does not match the database question' });
        continue;
      }
      if (!attemptsCache.has(dbSet.id)) {
        const { count } = await sb.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_set_id', dbSet.id);
        attemptsCache.set(dbSet.id, count || 0);
      }
      if (attemptsCache.get(dbSet.id) > 0) {
        rows.push({ ...base, result: 'Left held', reason: 'this exam has already been taken; changing it would corrupt those attempts' });
        continue;
      }
      if (m.action === 'delete') {
        rows.push({ ...base, result: COMMIT ? 'Deleted' : 'Would delete', check: m.note || "removed at the client's request" });
        toDelete.push(q.id);
        continue;
      }
      const mClash = conflictFor(q.id, m.stem, m.options[m.correctIndex]);
      if (mClash) {
        rows.push({
          ...base,
          result: 'Left held',
          reason: `the same question in another exam is keyed differently ("${mClash.answer.slice(0, 80)}") -- needs the client to settle it`,
          clientAnswer: m.options[m.correctIndex],
          otherAnswer: mClash.answer,
        });
        continue;
      }
      rows.push({
        ...base,
        question: m.stem,
        result: COMMIT ? 'Applied' : 'Would apply',
        tier: 'hand',
        clientAnswer: m.options[m.correctIndex],
        previousKey: oldKey,
        wordAnswer: word,
        check: m.note || "hand-written from the client's typed answer",
      });
      toApply.push({ q, stem: m.stem, options: m.options, correctIndex: m.correctIndex, extra: m.extra || [], setId: dbSet.id });
      continue;
    }

    if (f.status !== 'resolved') {
      rows.push({ ...base, result: 'Left held', reason: f.reason, previousKey: oldKey, wordAnswer: word, clientText: f.clientText || '' });
      continue;
    }

    const answer = f.options[f.correctIndex];
    const clash = conflictFor(q.id, f.stem, answer);
    if (clash) {
      rows.push({
        ...base,
        result: 'Left held',
        reason: `the same question in another exam is keyed differently ("${clash.answer.slice(0, 80)}") -- needs the client to settle it`,
        clientAnswer: answer,
        previousKey: oldKey,
        wordAnswer: word,
        otherAnswer: clash.answer,
      });
      continue;
    }
    let check = '';
    if (word && norm(answer) === norm(word)) check = 'matches the Word file';
    else if (oldKey && norm(answer) === norm(oldKey)) check = 'matches the original sheet key';
    else if (word || oldKey) check = 'DIFFERS from both the sheet and the Word file';
    else check = 'no earlier answer to compare';

    if (!attemptsCache.has(dbSet.id)) {
      const { count } = await sb.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_set_id', dbSet.id);
      attemptsCache.set(dbSet.id, count || 0);
    }
    if (attemptsCache.get(dbSet.id) > 0) {
      rows.push({ ...base, result: 'Left held', reason: 'this exam has already been taken; changing it would corrupt those attempts' });
      continue;
    }

    rows.push({ ...base, question: f.stem, result: COMMIT ? 'Applied' : 'Would apply', tier: f.tier, clientAnswer: answer, previousKey: oldKey, wordAnswer: word, check });
    toApply.push({ q, stem: f.stem, options: f.options, correctIndex: f.correctIndex, extra: [], setId: dbSet.id });
  }

  // ---- report ---------------------------------------------------------------
  const header = ['Exam', 'Skill', 'Question #', 'Result', 'Why left held', 'Question', "Client's answer", 'Previous key (sheet)', 'Word file answer', 'Same question elsewhere is keyed', 'Check', 'What the client typed'];
  const lines = [header, ...rows.map((r) => [r.exam, r.skill, r.position, r.result, r.result === 'Left held' || r.result === 'Skipped' ? r.reason : '', r.question, r.clientAnswer || '', r.previousKey || '', r.wordAnswer || '', r.otherAnswer || '', r.check || '', r.clientText || ''])];
  const reportPath = path.join(EXAMS_DIR, 'held-fixes-report.csv');
  fs.writeFileSync(reportPath, '﻿' + lines.map((r) => r.map(csv).join(',')).join('\r\n'));

  // Everything still held, laid out so it can go straight back to the client.
  const confirmHeader = ['Exam', 'Skill', 'Question #', 'Question', 'Options in the system', "What the client marked / typed", 'Word file answer', 'Same question elsewhere is keyed', 'What is needed'];
  const confirmRows = rows
    .filter((r) => r.result === 'Left held' && r.optionsText !== undefined)
    .map((r) => [r.exam, r.skill, r.position, r.question, r.optionsText, r.clientAnswer || r.clientText || '', r.wordAnswer || '', r.otherAnswer || '', r.reason]);
  const confirmPath = path.join(EXAMS_DIR, 'held-fixes-to-confirm.csv');
  fs.writeFileSync(confirmPath, '﻿' + [confirmHeader, ...confirmRows].map((r) => r.map(csv).join(',')).join('\r\n'));
  console.log(`For the client to settle: ${confirmPath} (${confirmRows.length} questions)`);

  const tally = {};
  rows.forEach((r) => (tally[r.result] = (tally[r.result] || 0) + 1));
  console.log(`Questions in the client's PDF: ${fixes.length}`, tally);
  const checks = {};
  rows.filter((r) => r.check).forEach((r) => (checks[r.check] = (checks[r.check] || 0) + 1));
  console.log('Cross-check of the answers to apply:', checks);
  const why = {};
  rows.filter((r) => r.result === 'Left held').forEach((r) => (why[r.reason] = (why[r.reason] || 0) + 1));
  console.log('Left held because:', why);
  const clashRows = rows.filter((r) => r.otherAnswer);
  console.log(`Held because another exam keys the same question differently: ${clashRows.length} (of which the other exam agrees with the Word file: ${clashRows.filter((r) => r.wordAnswer && norm(r.otherAnswer) === norm(r.wordAnswer)).length})`);
  console.log('Report:', reportPath);

  if (!COMMIT) return console.log('\nReport only. Re-run with --commit to apply the resolved questions.');

  // Keep the questions exactly as they were, so any of this can be put back.
  const touched = [...toApply.map((a) => a.q.id), ...toDelete];
  const before = [];
  for (let i = 0; i < touched.length; i += 100) {
    const { data, error } = await sb
      .from('exam_questions')
      .select('*, exam_options(*)')
      .in('id', touched.slice(i, i + 100));
    if (error) throw error;
    before.push(...data);
  }
  const backupPath = path.join(EXAMS_DIR, `backup-held-before-fixes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(before, null, 2));
  console.log(`Backed up ${before.length} questions to ${backupPath}`);

  for (const a of toApply) {
    const del = await sb.from('exam_options').delete().eq('question_id', a.q.id);
    if (del.error) throw del.error;
    const ins = await sb.from('exam_options').insert(
      a.options.map((body, i) => ({ id: crypto.randomUUID(), question_id: a.q.id, position: i + 1, body, is_correct: i === a.correctIndex })),
    );
    if (ins.error) throw ins.error;
    const up = await sb.from('exam_questions').update({ body: a.stem, status: 'ok', review_note: null }).eq('id', a.q.id);
    if (up.error) throw up.error;
    // A merged question split in two: the second half becomes a new question.
    for (const e of a.extra) {
      const { data: last } = await sb.from('exam_questions').select('position').eq('exam_set_id', a.setId).order('position', { ascending: false }).limit(1).single();
      const qid = crypto.randomUUID();
      const insQ = await sb.from('exam_questions').insert({ id: qid, exam_set_id: a.setId, position: last.position + 1, body: e.stem, status: 'ok', review_note: null });
      if (insQ.error) throw insQ.error;
      const insO = await sb.from('exam_options').insert(
        e.options.map((body, i) => ({ id: crypto.randomUUID(), question_id: qid, position: i + 1, body, is_correct: i === e.correctIndex })),
      );
      if (insO.error) throw insO.error;
    }
  }
  for (const id of toDelete) {
    const del = await sb.from('exam_questions').delete().eq('id', id);
    if (del.error) throw del.error;
  }
  console.log(`\nApplied ${toApply.length} corrections${toDelete.length ? `, deleted ${toDelete.length} question(s)` : ''}.`);
})().catch((e) => { console.error('FAILED:', e.message || e); process.exit(1); });
