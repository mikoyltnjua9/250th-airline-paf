// Loads the Flight Attendants and Maintenance Officers the client listed in
// "FOR ENCODING FA AND MO.xlsx" (sheets "FA" and "MO", one "RANK NAME SERIAL PAF"
// line per person).
//
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-fa-mo.js <file.xlsx>            (report only)
//   node --experimental-websocket --env-file=.env.local scripts/personnel-import/import-fa-mo.js <file.xlsx> --commit   (write)
//
// Flight Attendants become position "Flight Attendant", officers "Maintenance
// Officer". The sheets don't say which unit anyone belongs to, so Unit is left
// blank. Anyone whose serial number is already in the system is skipped. A list
// of what was created is saved so the load can be undone.

const fs = require('fs');
const path = require('path');
const XLSX = require('../exam-import/node_modules/xlsx');
const { createClient } = require('../../node_modules/@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const file = process.argv.find((a) => /\.xlsx$/i.test(a));
if (!file) throw new Error('Pass the .xlsx as an argument.');

const SHEETS = { FA: 'Flight Attendant', MO: 'Maintenance Officer' };
const RANK_CODE = { LTC: 'LtCol', MAJ: 'Maj', CPT: 'Capt', '1LT': '1Lt', '2LT': '2Lt', COL: 'Col', MSG: 'MSg', TSG: 'TSg', SSG: 'SSg', SGT: 'Sgt' };

const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\bJr\b/, 'Jr');

// "MSg Venus S Baltazar 830859 PAF" -> rank, name, serial. Officer serials are
// O-nnnn; the client typed one with a zero ("0-148189"), so a leading 0- is read as O-.
function parse(line, position) {
  const m = line.trim().replace(/\s+/g, ' ').match(/^(\S+) (.+) ((?:[O0]-)?\d+) PAF$/i);
  if (!m) return { error: `could not read: "${line}"` };
  const [, rankText, name, sn] = m;
  const rank = RANK_CODE[rankText.toUpperCase()];
  if (!rank) return { error: `unknown rank "${rankText}" in: "${line}"` };
  const afsn = sn.replace(/^0-/, 'O-').toUpperCase();
  return { rank, name: titleCase(name), afsn, position, note: sn !== afsn ? `serial "${sn}" read as ${afsn}` : '' };
}

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const wb = XLSX.readFile(file);

  const people = [];
  for (const [sheet, position] of Object.entries(SHEETS)) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
    for (const r of rows) {
      if (typeof r[0] !== 'number' || !String(r[1]).trim()) continue;
      const p = parse(String(r[1]), position);
      if (p.error) throw new Error(p.error);
      if (p.note) console.log('NOTE:', p.name, '-', p.note);
      people.push(p);
    }
  }

  const sns = new Set();
  for (const p of people) {
    if (sns.has(p.afsn)) throw new Error(`Serial number ${p.afsn} appears twice in the file.`);
    sns.add(p.afsn);
  }

  const { data: ranks } = await sb.from('ranks').select('code');
  const known = new Set((ranks ?? []).map((r) => r.code));
  const missing = [...new Set(people.map((p) => p.rank).filter((r) => !known.has(r)))];
  if (missing.length) throw new Error(`Ranks not in the system: ${missing.join(', ')}`);

  const { data: existing } = await sb.from('pilots').select('afsn').in('afsn', people.map((p) => p.afsn));
  const already = new Set((existing ?? []).map((e) => e.afsn));
  const todo = people.filter((p) => !already.has(p.afsn));

  console.log(`\n${people.length} people in the file, ${already.size} already in the system, ${todo.length} to add.`);
  for (const p of todo) console.log(`  ${p.position.padEnd(20)} ${p.rank.padEnd(5)} ${p.name.padEnd(32)} ${p.afsn}`);
  if (!COMMIT) return console.log('\n(report only; pass --commit to write)');

  const { data, error } = await sb
    .from('pilots')
    .insert(todo.map((p) => ({ full_name: p.name, rank_code: p.rank, afsn: p.afsn, position: p.position })))
    .select('id, afsn');
  if (error) throw error;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(__dirname, `../../exams/created-fa-mo-${stamp}.json`), JSON.stringify(data, null, 1));
  console.log(`Done: ${data.length} people added.`);
})().catch((e) => { console.error(e); process.exit(1); });
