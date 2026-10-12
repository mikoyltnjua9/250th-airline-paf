// Parser for the client's Microsoft-Forms exam printouts (the pilot and
// Maintenance Officer Stan/Eval exams). Each question is "N. stem", followed by
// radio-button options; the one the client marked as correct is drawn filled.
//
// Needs Poppler's pdftotext (set PDFTOTEXT to its path): unlike Xpdf's build it
// keeps the filled/empty radio glyphs and subscripts like N₁ / N₂.

const { execFileSync } = require('node:child_process');

const FILLED = '⚫'; // ⚫ the marked (correct) answer
const EMPTY = '⚪'; // ⚪

function pdfText(file, pdftotext = process.env.PDFTOTEXT || 'pdftotext') {
  return execFileSync(pdftotext, ['-layout', '-enc', 'UTF-8', file, '-'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

const clean = (s) => s.replace(/️/g, '').replace(/\s+/g, ' ').trim();

// Stems that point at a picture/table the text-only exam can't show.
const FIGURE_REF = /\b(based on|refer(?:ring)? to|see|using|from|in) the (figure|diagram|illustration|picture|image|chart|graph|table)\b|\b(figure|diagram) (below|above|shown)\b/i;

/** Splits layout text into questions. Returns [{ position, body, options:[{body,isKey}], figure }]. */
function parseFormsText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\f/g, ''));
  const questions = [];
  let cur = null;
  let blankRun = 0;
  const startRe = /^\s{0,4}(\d{1,4})\.(?:\s+(\S.*))?$/;
  const optRe = new RegExp(`^\\s*([${FILLED}${EMPTY}])\\uFE0F?\\s*(.*)$`);

  for (const raw of lines) {
    // "(1 point)" is printed at the right edge of the question and option rows.
    const line = raw.replace(/\s+\(\d+ points?\)\s*$/i, '').replace(/^\s*\(\d+ points?\)\s*$/i, '').trimEnd();
    if (!line.trim()) {
      blankRun++;
      continue;
    }

    const expected = (questions.length ? questions[questions.length - 1].position : 0) + 1;
    const start = line.match(startRe);
    if (start && Number(start[1]) === expected && !optRe.test(line)) {
      // The stem can start on the next line ("106." alone, then the text).
      cur = { position: Number(start[1]), stem: start[2] ? [start[2]] : [], options: [], figure: false };
      questions.push(cur);
      blankRun = 0;
      continue;
    }
    if (!cur) {
      blankRun = 0;
      continue; // title / instructions before question 1
    }

    // A picture sits in the flow as a tall run of blank lines before the options.
    if (blankRun >= 3) cur.figure = true;
    blankRun = 0;

    const opt = line.match(optRe);
    if (opt) {
      cur.options.push({ parts: [opt[2]], isKey: opt[1] === FILLED });
    } else if (cur.options.length) {
      cur.options[cur.options.length - 1].parts.push(line);
    } else {
      cur.stem.push(line);
    }
  }

  return questions.map((q) => {
    let options = q.options.map((o) => ({ body: clean(o.parts.join(' ')), isKey: o.isKey }));
    // Some options are typed "A. text": the app letters them itself, so drop the
    // prefix when every option carries one (A, B, C, ... in order).
    const letters = options.map((o) => o.body.match(/^([A-F])[.)]\s+/));
    if (options.length > 1 && letters.every((m, i) => m && m[1] === String.fromCharCode(65 + i))) {
      options = options.map((o) => ({ ...o, body: o.body.replace(/^[A-F][.)]\s+/, '') }));
    }
    const body = clean(q.stem.join(' '));
    return { position: q.position, body, options, figure: q.figure || FIGURE_REF.test(body) };
  });
}

/** Adds status / review_note: only a question with a clean single key is scored. */
function classify(questions) {
  return questions.map((q) => {
    const problems = [];
    const keys = q.options.filter((o) => o.isKey).length;
    if (q.options.length < 2) problems.push('fewer than 2 options');
    if (q.options.length > 6) problems.push('more than 6 options (likely merged questions)');
    if (keys === 0) problems.push('no correct answer marked');
    if (keys > 1) problems.push('more than one correct answer marked');
    const seen = new Set();
    for (const o of q.options) {
      const k = o.body.toLowerCase();
      if (seen.has(k)) {
        problems.push('two options have identical text');
        break;
      }
      seen.add(k);
    }
    if (q.options.some((o) => !o.body)) problems.push('an option is empty');
    if (!q.body) problems.push('no question text');
    if (q.figure) problems.push("refers to a figure that can't be shown in a text-only exam");
    return {
      ...q,
      status: problems.length ? 'needs_review' : 'ok',
      review_note: problems.length ? problems.join('; ') : null,
    };
  });
}

function parseFormsPdf(file, pdftotext) {
  return classify(parseFormsText(pdfText(file, pdftotext)));
}

module.exports = { parseFormsPdf, parseFormsText, classify, pdfText };
