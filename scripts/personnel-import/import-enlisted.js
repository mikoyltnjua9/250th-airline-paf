// Loads the enlisted maintenance + aircrew rosters the client sent (four files:
// 251PAS maintenance personnel, 480MSG and 481FMS rosters, aircrew qualifications).
//
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-enlisted.js <people.json>            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-enlisted.js <people.json> --commit   (write)
//
// <people.json> is kept with the other client data in exams/ (git-ignored: it
// is real names and serial numbers): [{ src, rank, name, sn, role }].
//
// Everyone becomes a Maintenance Technician; the client's wording goes in
// "designation". Where the wording names exactly one aircraft the person also
// gets that aircraft as a Current qualification. Anyone whose serial number is
// already in the system is skipped. A list of what was created is saved so the
// load can be undone.

const fs = require('fs');
const path = require('path');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const file = process.argv.find((a) => a.endsWith('.json'));
if (!file) throw new Error('Pass the people .json as an argument.');

const AIRCRAFT = [
  ['c295', /\bC-?295\b/i],
  ['g280', /\bG-?280\b/i],
  ['h800xp', /\bH-?800\s?XP\b/i],
  ['bell412', /\b(?:B|BELL)[- ]?412\b/i],
  ['s70i', /\bS-?70\s?i\b/i],
];

const RANK_FIX = { Msg: 'MSg' };
const DESIGNATION_FIX = [[/Airfraame Apprentie\b/i, 'Airframe Apprentice']];

function normalise(p) {
  let name = p.name.replace(/\s+/g, ' ').trim().replace(/\bJR\b/, 'Jr');
  let designation = p.role.replace(/\s+/g, ' ').trim();
  for (const [re, to] of DESIGNATION_FIX) designation = designation.replace(re, to);
  return { rank: RANK_FIX[p.rank] ?? p.rank, name, afsn: p.sn, designation, sources: [p.src] };
}

function aircraftFor(designation) {
  const hits = AIRCRAFT.filter(([, re]) => re.test(designation)).map(([code]) => code);
  // Several aircraft named (e.g. a structures supervisor for six types), or a type
  // not in the fleet list alongside one that is: leave it as wording only.
  const extra = /\b(F-?28|HS-?125)\b/i.test(designation);
  return hits.length === 1 && !extra ? hits[0] : null;
}

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));

  // One person per serial number (a person can appear in two files).
  const bySn = new Map();
  for (const p of raw.map(normalise)) {
    const have = bySn.get(p.afsn);
    if (have) { have.sources.push(...p.sources); console.log(`MERGED duplicate ${p.afsn} ${p.name}: keeping "${have.designation}" (also "${p.designation}")`); }
    else bySn.set(p.afsn, p);
  }
  const people = [...bySn.values()];

  const { data: ranks } = await sb.from('ranks').select('code');
  const known = new Set((ranks ?? []).map((r) => r.code));
  const missing = [...new Set(people.map((p) => p.rank).filter((r) => !known.has(r)))];
  if (missing.length) {
    const msg = `Ranks not in the system yet: ${missing.join(', ')} (apply migration 20261023000000 first)`;
    if (COMMIT) throw new Error(msg);
    console.log('NOTE:', msg);
  }

  const { data: existing } = await sb.from('pilots').select('afsn').in('afsn', people.map((p) => p.afsn));
  const already = new Set((existing ?? []).map((e) => e.afsn));

  const todo = people.filter((p) => !already.has(p.afsn)).map((p) => ({ ...p, aircraft: aircraftFor(p.designation) }));
  console.log(`\n${people.length} people in the files, ${already.size} already in the system, ${todo.length} to add.`);
  const byRank = {}; todo.forEach((p) => (byRank[p.rank] = (byRank[p.rank] || 0) + 1));
  console.log('by rank:', JSON.stringify(byRank));
  const byAc = {}; todo.forEach((p) => p.aircraft && (byAc[p.aircraft] = (byAc[p.aircraft] || 0) + 1));
  console.log('aircraft qualifications to add:', JSON.stringify(byAc), '=', todo.filter((p) => p.aircraft).length);

  const csv = ['rank,name,afsn,designation,aircraft,sources', ...todo.map((p) => [p.rank, p.name, p.afsn, p.designation, p.aircraft ?? '', p.sources.join('+')].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  fs.writeFileSync(path.join(__dirname, '../../exams/enlisted-preview.csv'), csv);
  if (!COMMIT) return console.log('(report only; preview in exams/enlisted-preview.csv; pass --commit to write)');

  const created = [];
  for (let i = 0; i < todo.length; i += 40) {
    const chunk = todo.slice(i, i + 40);
    const { data, error } = await sb
      .from('pilots')
      .insert(chunk.map((p) => ({ full_name: p.name, rank_code: p.rank, afsn: p.afsn, position: 'Maintenance Technician', designation: p.designation })))
      .select('id, afsn');
    if (error) throw error;
    created.push(...data);
  }
  const idBySn = new Map(created.map((c) => [c.afsn, c.id]));
  const quals = todo.filter((p) => p.aircraft).map((p) => ({ pilot_id: idBySn.get(p.afsn), aircraft_type_code: p.aircraft, status: 'current' }));
  if (quals.length) {
    const { error } = await sb.from('qualifications').insert(quals);
    if (error) throw error;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(__dirname, `../../exams/created-enlisted-${stamp}.json`), JSON.stringify(created, null, 1));
  console.log(`Done: ${created.length} people added, ${quals.length} aircraft qualifications.`);
})().catch((e) => { console.error(e); process.exit(1); });
