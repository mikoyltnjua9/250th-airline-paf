// Sets the Unit of the enlisted personnel from the roster each person came from:
// 251PAS -> 251st, 480MSG -> 480th, 481FMS -> 481st. The aircrew list doesn't
// say which unit its people belong to, so they are left alone (unless they also
// appear on a unit roster). Only people with NO unit yet are touched, and anyone
// on two different unit rosters is reported and skipped.
//
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/set-units.js            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/set-units.js --commit   (write)

const fs = require('fs');
const path = require('path');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const UNIT_OF_FILE = { '251PAS': '251st', '480MSG': '480th', '481FMS': '481st' };

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const rows = JSON.parse(fs.readFileSync(path.join(__dirname, '../../exams/enlisted-personnel.json'), 'utf8'));

  const unitsBySn = new Map();
  for (const r of rows) {
    const unit = UNIT_OF_FILE[r.src];
    if (!unit) continue;
    if (!unitsBySn.has(r.sn)) unitsBySn.set(r.sn, new Set());
    unitsBySn.get(r.sn).add(unit);
  }

  const { data: people, error } = await sb
    .from('pilots')
    .select('id, afsn, full_name, unit_section')
    .in('afsn', [...unitsBySn.keys()])
    .limit(1000);
  if (error) throw error;

  const todo = [];
  for (const p of people) {
    const units = [...unitsBySn.get(p.afsn)];
    if (units.length > 1) { console.log(`SKIP (on ${units.join(' and ')} rosters) ${p.afsn} ${p.full_name}`); continue; }
    if (p.unit_section) { console.log(`SKIP (already ${p.unit_section}) ${p.afsn} ${p.full_name}`); continue; }
    todo.push({ id: p.id, unit: units[0] });
  }

  const counts = {};
  for (const t of todo) counts[t.unit] = (counts[t.unit] ?? 0) + 1;
  console.log(`\n${todo.length} people to update:`, counts);
  if (!COMMIT) return console.log('(report only; pass --commit to write)');

  for (const unit of Object.keys(counts)) {
    const ids = todo.filter((t) => t.unit === unit).map((t) => t.id);
    const r = await sb.from('pilots').update({ unit_section: unit }).in('id', ids);
    if (r.error) throw r.error;
  }
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
