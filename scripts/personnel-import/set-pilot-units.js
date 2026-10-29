// Sets the Unit of the pilots from their position, as the client confirmed:
// Fixed-Wing Pilots are in the 251st (251PAS), Rotary Pilots in the 252nd
// (252PAS). Only people with NO unit yet are touched.
//
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/set-pilot-units.js            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/set-pilot-units.js --commit   (write)

const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const UNIT_OF_POSITION = { 'Fixed-Wing Pilot': '251st', 'Rotary Pilot': '252nd' };

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: people, error } = await sb
    .from('pilots')
    .select('id, position, unit_section')
    .in('position', Object.keys(UNIT_OF_POSITION))
    .limit(1000);
  if (error) throw error;

  const todo = people.filter((p) => !(p.unit_section ?? '').trim());
  const skipped = people.length - todo.length;
  const counts = {};
  for (const p of todo) counts[UNIT_OF_POSITION[p.position]] = (counts[UNIT_OF_POSITION[p.position]] ?? 0) + 1;
  console.log(`${people.length} pilots, ${skipped} already have a unit, ${todo.length} to update:`, counts);
  if (!COMMIT) return console.log('(report only; pass --commit to write)');

  for (const [position, unit] of Object.entries(UNIT_OF_POSITION)) {
    const ids = todo.filter((p) => p.position === position).map((p) => p.id);
    if (!ids.length) continue;
    const r = await sb.from('pilots').update({ unit_section: unit }).in('id', ids);
    if (r.error) throw r.error;
  }
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
