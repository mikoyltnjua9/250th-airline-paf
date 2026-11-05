// Loads the ground-equipment authorizations the client sent (16 maintenance
// personnel, seminar of 3 Aug 2026, each authorized for the same 17 pieces of
// ground support equipment).
//
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-equipment-authorizations.js            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-equipment-authorizations.js --commit   (write)
//
// People are found by serial number. Anyone who already has an authorization
// for a piece of equipment keeps it as it is. Needs migration 20261105000000.

const fs = require('fs');
const path = require('path');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');

// Kept in exams/equipment-people.json with the other client data (git-ignored:
// it is real names and serial numbers):
//   seminarDate   when the seminar was held
//   people        [ "RANK NAME", serial ] as written on the client's sheets
//   serialFixes   sheet serial -> serial on file, where the two differ (one of them
//                 is a typo); such people are matched by name and flagged for the client
const { seminarDate: SEMINAR_DATE, people: SHEET_SERIALS, serialFixes: SERIAL_FIXES } = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../exams/equipment-people.json'), 'utf8'),
);

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const wanted = SHEET_SERIALS.map(([label, sn]) => ({ label, sn: SERIAL_FIXES[sn] ?? sn, sheetSn: sn }));
  const { data: people, error } = await sb.from('pilots').select('id, afsn, full_name').in('afsn', wanted.map((w) => w.sn));
  if (error) throw error;
  const bySn = new Map(people.map((p) => [p.afsn, p]));
  const missing = wanted.filter((w) => !bySn.has(w.sn));
  for (const w of wanted) if (w.sn !== w.sheetSn) console.log(`NOTE: ${w.label}: sheet serial ${w.sheetSn}, on file ${w.sn} (matched by name)`);
  for (const m of missing) console.log(`MISSING: ${m.label} (${m.sn})`);

  const { data: equipment, error: eqError } = await sb.from('equipment_types').select('code').eq('active', true);
  if (eqError) throw new Error(`Equipment list not found (${eqError.message}). Apply migration 20261105000000 first.`);
  const { data: have } = await sb.from('equipment_authorizations').select('pilot_id, equipment_code').in('pilot_id', people.map((p) => p.id));
  const haveKey = new Set((have ?? []).map((h) => `${h.pilot_id}:${h.equipment_code}`));

  const rows = [];
  for (const p of people) for (const e of equipment) {
    if (!haveKey.has(`${p.id}:${e.code}`)) rows.push({ pilot_id: p.id, equipment_code: e.code, seminar_date: SEMINAR_DATE });
  }
  console.log(`\n${people.length} people found, ${equipment.length} equipment items each, ${rows.length} authorizations to add (${haveKey.size} already on file).`);
  if (!COMMIT) return console.log('(report only; pass --commit to write)');

  for (let i = 0; i < rows.length; i += 200) {
    const { error: insError } = await sb.from('equipment_authorizations').insert(rows.slice(i, i + 200));
    if (insError) throw insError;
  }
  console.log(`Done: ${rows.length} authorizations added.`);
})().catch((e) => { console.error(e); process.exit(1); });
