// Reads the client's marked-up copy of the app's "Held-back questions" page
// (exams/New Held Back Questions.pdf) and works out, per question, what they
// decided. They edited the print-out in place, and the COLOUR of the text is the
// signal:
//
//   orange  #bb4d00  the app's own note ("no correct answer marked", ...)
//   green   #007a55  the answer key the app had (a tick)
//   red     #ff0000  the client's answer
//   black   #000000  text the client typed / un-marked
//
// Only decisions that are unambiguous are returned as "resolved"; everything
// else stays held back and is listed with the reason.

const { readColoredLines } = require('./pdf-runs');

const COLOR = { '#bb4d00': 'N', '#007a55': 'G', '#ff0000': 'R', '#000000': 'B' };
const LIGATURE = { 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl', ' ': ' ' };
const NOISE = /vercel\.app\/exam-management|^Wing Safety Dashboard —|^Page \d+ of \d+|^\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}|^Held-back questions$|^For the client to review/;
// Spaces/tabs only after each phrase: a newline must stay, or the first option
// line would be taken for text the client typed on the note line.
const NOTE_RE = /^(?:(?:spreadsheet and Word file disagree on the correct answer|fewer than 2 options|no correct answer marked|more than one correct answer marked|more than 5 options \(likely merged questions\)|two or more options run together on one line)[ \t]*;?[ \t]*)+(?:-[ \t]*)?/i;
const MARKER_RE = /(?<![A-Za-z0-9])([A-F])\s?\.\s*(?=\S)/g;

/** A line as parallel arrays: characters and their colour class. */
function expandLine(segs) {
  const chars = [];
  const cols = [];
  for (const seg of segs) {
    const cls = COLOR[seg.color] ?? 'D';
    for (const ch of seg.text) {
      const rep = LIGATURE[ch] ?? ch;
      for (const c of rep) {
        chars.push(c);
        cols.push(cls);
      }
    }
  }
  return { chars, cols };
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/** Splits the colored PDF lines into [{ setKey, position, lines:[{chars,cols}] }]. */
async function readBlocks(file) {
  const raw = await readColoredLines(file);
  const blocks = [];
  let set = null;
  let cur = null;
  for (const l of raw) {
    const text = l.segs.map((s) => s.text).join('').trim();
    if (!text || NOISE.test(text)) continue;
    if (l.segs.every((s) => s.color === '#515f6e')) continue; // sticky page header
    if (text.startsWith('▾')) {
      // "▾5th Skill — Category / Title <count>"
      const head = l.segs.filter((s) => s.color !== '#0e294a').map((s) => s.text).join('');
      const t = [...head.replace(/^▾/, '')].map((c) => LIGATURE[c] ?? c).join('').trim();
      const m = t.match(/^(?:(3rd|5th|7th) Skill\s*—\s*)?(.+?)\s+\/\s+(.+)$/);
      if (!m) throw new Error('Unparsed heading: ' + t);
      // The client typed "no answer" onto one heading (Turbo Propulsion C295, 5th
      // skill) to say that exam had no key; it isn't part of the exam's name.
      set = { skill: m[1] || null, category: m[2].trim(), title: m[3].trim().replace(/\s+no$/i, '') };
      cur = null;
      continue;
    }
    const q = text.match(/^#(\d+)\s/);
    if (q && l.segs[0] && !COLOR[l.segs[0].color]) {
      cur = { set, position: Number(q[1]), lines: [] };
      blocks.push(cur);
    }
    if (cur) cur.lines.push(expandLine(l.segs));
  }
  return blocks;
}

/** Text of a run of characters, with the colours kept alongside. */
function sliceOf(chars, cols, from, to) {
  return { text: chars.slice(from, to).join(''), cols: cols.slice(from, to) };
}

const hasRed = (cols, chars) => cols.some((c, i) => c === 'R' && chars[i].trim() && chars[i] !== '✓');

/** Splits "A. foo B. bar C. baz" (colours kept) into lettered items. */
function splitLettered(text, cols) {
  const marks = [...text.matchAll(MARKER_RE)];
  const items = marks.map((m, i) => {
    const from = m.index + m[0].length;
    const to = i + 1 < marks.length ? marks[i + 1].index : text.length;
    const body = text.slice(from, to);
    const red = cols.slice(m.index, to).some((c, k) => c === 'R' && text[m.index + k].trim() && text[m.index + k] !== '✓');
    return { letter: m[1], text: collapse(body.replace(/✓/g, '')).replace(/\s*-\s*$/, ''), red };
  });
  return items;
}

function analyze(block) {
  // One text with newlines, colours alongside.
  const chars = [];
  const cols = [];
  block.lines.forEach((l, i) => {
    if (i) { chars.push('\n'); cols.push('D'); }
    chars.push(...l.chars);
    cols.push(...l.cols);
  });
  const text = chars.join('');
  const out = { setKey: null, position: block.position, stem: '', oldKey: null, problems: [] };

  const noteAt = cols.indexOf('N');
  if (noteAt < 0) return { ...out, status: 'unresolved', reason: 'no note found in the print-out' };
  out.stem = collapse(text.slice(0, noteAt).replace(/^#\d+\s+/, ''));

  const afterNote = text.slice(noteAt);
  const noteMatch = afterNote.match(NOTE_RE);
  if (!noteMatch) return { ...out, status: 'unresolved', reason: 'could not read the note' };
  const noteEnd = noteAt + noteMatch[0].length;
  out.note = collapse(noteMatch[0]);

  // The app's old key: the green tick.
  const optionStartRe = /^\s*(?:[A-F]\s?\.)/;
  const restLines = [];
  {
    let from = noteEnd;
    for (let i = from; i <= text.length; i++) {
      if (i === text.length || text[i] === '\n') {
        restLines.push({ from, to: i });
        from = i + 1;
      }
    }
  }

  // First rest line = whatever the client typed after the note; later lines are
  // the app's option lines (or wrapped continuations).
  const tailLine = restLines[0] ?? { from: noteEnd, to: noteEnd };
  let tail = sliceOf(chars, cols, tailLine.from, tailLine.to);
  const options = []; // { letter, parts:[{text,cols}] }
  for (const ln of restLines.slice(1)) {
    const seg = sliceOf(chars, cols, ln.from, ln.to);
    if (!seg.text.trim()) continue;
    const m = seg.text.match(optionStartRe);
    if (m) {
      const letter = seg.text.trim()[0];
      options.push({ letter, parts: [seg] });
    } else if (options.length) {
      options[options.length - 1].parts.push(seg);
    } else {
      // Wrapped continuation of what the client typed on the note line.
      tail = { text: tail.text + ' ' + seg.text, cols: [...tail.cols, 'D', ...seg.cols] };
    }
  }

  const optionItems = options.map((o) => {
    const text2 = o.parts.map((p) => p.text).join(' ');
    const cols2 = o.parts.flatMap((p, i) => (i ? ['D', ...p.cols] : p.cols));
    const body = collapse(text2.replace(/^\s*[A-F]\s?\.\s*/, '').replace(/✓/g, ''));
    const red = hasRed(cols2, [...text2]);
    const green = cols2.some((c, i) => c === 'G' && [...text2][i] === '✓') || cols2[0] === 'G' && text2.includes('✓');
    return { letter: o.letter, text: body, red, green, raw: text2 };
  });
  const greenOpt = optionItems.find((o) => o.green);
  out.oldKey = greenOpt ? greenOpt.letter : null;

  const tailTrim = tail.text.trim();
  const tailRed = hasRed(tail.cols, [...tail.text]);

  // ---- Tier 1: options intact, exactly one marked red -----------------------
  if (!tailTrim) {
    if (optionItems.length < 2) return { ...out, status: 'unresolved', reason: 'options are not intact in the print-out' };
    const letters = optionItems.map((o) => o.letter).join('');
    if (letters !== 'ABCDEF'.slice(0, optionItems.length)) return { ...out, status: 'unresolved', reason: `option letters out of order (${letters})` };
    const reds = optionItems.filter((o) => o.red);
    if (reds.length === 0) return { ...out, status: 'unresolved', reason: 'the client did not mark an answer (nothing in red)' };
    if (reds.length > 1) return { ...out, status: 'unresolved', reason: 'more than one answer marked in red' };
    // An option line containing "X - Y" is the client editing text, not just marking.
    if (optionItems.some((o) => / - [A-F]\.\s/.test(o.raw))) return { ...out, status: 'unresolved', reason: 'the client typed over an option' };
    return {
      ...out,
      status: 'resolved',
      tier: 1,
      options: optionItems.map((o) => o.text),
      correctIndex: optionItems.findIndex((o) => o.red),
    };
  }

  // ---- the client typed something after the note ----------------------------
  const typed = splitLettered(tail.text, tail.cols);

  // Tier 2: intact option lines plus ONE lettered red answer that completes them.
  if (optionItems.length >= 2 && typed.length === 1 && typed[0].red && !optionItems.some((o) => o.red)) {
    const t = typed[0];
    const have = optionItems.map((o) => o.letter);
    if (have.includes(t.letter)) return { ...out, status: 'unresolved', reason: `the client's answer ${t.letter} clashes with an existing option ${t.letter}` };
    const all = [...optionItems.map((o) => ({ letter: o.letter, text: o.text })), { letter: t.letter, text: t.text }].sort((a, b) => a.letter.localeCompare(b.letter));
    const letters = all.map((o) => o.letter).join('');
    if (letters !== 'ABCDEF'.slice(0, all.length)) return { ...out, status: 'unresolved', reason: `options are incomplete (have ${letters})` };
    if (!t.text) return { ...out, status: 'unresolved', reason: 'the typed answer is empty' };
    return { ...out, status: 'resolved', tier: 2, options: all.map((o) => o.text), correctIndex: all.findIndex((o) => o.letter === t.letter) };
  }

  // Tier 3: the client re-typed the whole option list on the note line.
  if (optionItems.length === 0 && typed.length >= 3) {
    const letters = typed.map((o) => o.letter).join('');
    const reds = typed.filter((o) => o.red);
    if (letters !== 'ABCDEF'.slice(0, typed.length)) return { ...out, status: 'unresolved', reason: `typed options out of order (${letters})` };
    if (reds.length !== 1) return { ...out, status: 'unresolved', reason: `${reds.length} answers in red in the typed list` };
    if (typed.some((o) => !o.text)) return { ...out, status: 'unresolved', reason: 'a typed option is empty' };
    // The stem still has the run-on options at its end: cut it where the first
    // typed option's text begins, when that can be found.
    let stem = out.stem;
    const probe = typed.find((o) => !o.red) ?? typed[0];
    const at = stem.toLowerCase().indexOf(probe.text.toLowerCase());
    if (at > 8) stem = collapse(stem.slice(0, at));
    return { ...out, status: 'resolved', tier: 3, stem, options: typed.map((o) => o.text), correctIndex: typed.findIndex((o) => o.red) };
  }

  return { ...out, status: 'unresolved', reason: 'only part of the answer was typed; the other options are missing or run together in the question', clientText: collapse(tail.text) };
}

/** Cleans artefacts of the print-out: kerning splits in typed text, and section
 * headings of the source that got glued onto the end of an option. */
function tidy(s) {
  return s
    .replace(/Fals e/g, 'False')
    .replace(/fals e/g, 'false')
    .replace(/Microprocesso r/g, 'Microprocessor')
    .replace(/(None of the above|All of the above|Overtime Training)s+Safety Management System(?:s+d+s*items)?$/i, '$1')
    .replace(/s+(?:Research and )?Techniques Related to .+? - d+s*items$/i, '');
}

async function readHeldFixes(file) {
  const blocks = await readBlocks(file);
  return blocks.map((b) => {
    const r = analyze(b);
    if (r.status === 'resolved') {
      r.stem = tidy(r.stem);
      r.options = r.options.map(tidy);
    }
    return { ...r, set: b.set };
  });
}

module.exports = { readHeldFixes, norm };
