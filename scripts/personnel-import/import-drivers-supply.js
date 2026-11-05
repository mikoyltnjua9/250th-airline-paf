// Loads the drivers and the warehouse/supply personnel the client sent
// (9 enlisted people, 482nd). They are Ground Crew; the client's wording
// ("Driver", "Warehouse/Supply") goes in "designation".
//
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-drivers-supply.js            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-drivers-supply.js --commit   (write)
//
// Anyone whose serial number is already in the system is skipped. A list of
// what was created is saved so the load can be undone.

const fs = require('fs');
const path = require('path');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const UNIT = '482nd';

// [designation, rank, name, serial] per person. Kept in exams/drivers-supply.json
// with the other client data (git-ignored: it is real names and serial numbers).
const PEOPLE = JSON.parse(fs.readFileSync(path.join(__dirname, '../../exams/drivers-supply.json'), 'utf8'));

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const sns = PEOPLE.map((p) => p[3]);
  if (new Set(sns).size !== sns.length) throw new Error('A serial number appears twice in the list.');

  const { data: ranks } = await sb.from('ranks').select('code');
  const known = new Set((ranks ?? []).map((r) => r.code));
  const missingRanks = [...new Set(PEOPLE.map((p) => p[1]).filter((r) => !known.has(r)))];
  if (missingRanks.length) throw new Error(`Ranks not in the system: ${missingRanks.join(', ')}`);

  const { data: existing } = await sb.from('pilots').select('afsn, full_name').in('afsn', sns);
  const already = new Map((existing ?? []).map((e) => [e.afsn, e.full_name]));
  for (const [sn, name] of already) console.log(`SKIP (already on file) ${sn} ${name}`);

  const todo = PEOPLE.filter((p) => !already.has(p[3]));
  console.log(`\n${PEOPLE.length} people in the list, ${already.size} already in the system, ${todo.length} to add to ${UNIT}.`);
  for (const [role, rank, name, sn] of todo) console.log(`  ${role.padEnd(17)} ${rank.padEnd(4)} ${name.padEnd(30)} ${sn}`);
  if (!COMMIT) return console.log('\n(report only; pass --commit to write)');

  const { data, error } = await sb
    .from('pilots')
    .insert(todo.map(([role, rank, name, sn]) => ({
      full_name: name, rank_code: rank, afsn: sn, position: 'Ground Crew', designation: role, unit_section: UNIT,
    })))
    .select('id, afsn');
  if (error) throw error;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(__dirname, `../../exams/created-drivers-supply-${stamp}.json`), JSON.stringify(data, null, 1));
  console.log(`Done: ${data.length} people added.`);
})().catch((e) => { console.error(e); process.exit(1); });
