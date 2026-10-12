// Reads a PDF into visual lines whose text segments carry the fill colour they
// were drawn in. Used for the client's held-back-questions PDF, where the
// client typed corrections in red / black over the app's own print-out.
//
//   const lines = await readColoredLines(path)
//   -> [{ page, y, segs: [{ color: "#ff0000", text: "B. Simulation" }, ...] }]

const fs = require("node:fs");
const path = require("node:path");

async function loadPdfjs() {
  return import(
    "file:///" +
      path.join(__dirname, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs").replace(/\\/g, "/")
  );
}

const hex = (v) => Math.round(v).toString(16).padStart(2, "0");
const rgb = (r, g, b) => "#" + hex(r) + hex(g) + hex(b);

function mul(m, n) {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

async function readColoredLines(file, { yTolerance = 2.5 } = {}) {
  const pdfjs = await loadPdfjs();
  const { OPS } = pdfjs;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true }).promise;
  const out = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    let fill = "#000000";
    let ctm = [1, 0, 0, 1, 0, 0];
    let tm = [1, 0, 0, 1, 0, 0];
    let tlm = [1, 0, 0, 1, 0, 0];
    let leading = 0;
    const stack = [];
    const runs = [];

    const moveText = (tx, ty) => {
      tlm = mul([1, 0, 0, 1, tx, ty], tlm);
      tm = tlm.slice();
    };

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const a = ops.argsArray[i];
      switch (fn) {
        case OPS.save: stack.push({ fill, ctm: ctm.slice() }); break;
        case OPS.restore: { const s = stack.pop(); if (s) { fill = s.fill; ctm = s.ctm; } break; }
        case OPS.transform: ctm = mul(a, ctm); break;
        case OPS.setFillRGBColor: fill = rgb(a[0], a[1], a[2]); break;
        case OPS.setFillGray: fill = rgb(a[0], a[0], a[0]); break;
        case OPS.beginText: tm = [1, 0, 0, 1, 0, 0]; tlm = tm.slice(); break;
        case OPS.setTextMatrix: tm = a.slice(); tlm = a.slice(); break;
        case OPS.moveText: moveText(a[0], a[1]); break;
        case OPS.setLeadingMoveText: leading = -a[1]; moveText(a[0], a[1]); break;
        case OPS.setLeading: leading = a[0]; break;
        case OPS.nextLine: moveText(0, -leading); break;
        case OPS.showText:
        case OPS.showSpacedText:
        case OPS.nextLineShowText:
        case OPS.nextLineSetSpacingShowText: {
          if (fn === OPS.nextLineShowText || fn === OPS.nextLineSetSpacingShowText) moveText(0, -leading);
          const glyphs = Array.isArray(a[0]) ? a[0] : a[2] ?? [];
          const text = glyphs.map((g) => (g && typeof g === "object" && "unicode" in g ? g.unicode : "")).join("");
          if (text.length) {
            const dev = mul(tm, ctm);
            runs.push({ x: dev[4], y: dev[5], color: fill, text });
          }
          break;
        }
        default: break;
      }
    }

    // Group runs into visual lines (same baseline), keeping stream order.
    const lines = [];
    for (const r of runs) {
      let line = lines.length ? lines[lines.length - 1] : null;
      if (!line || Math.abs(line.y - r.y) > yTolerance) {
        line = { page: p, y: r.y, segs: [] };
        lines.push(line);
      }
      const last = line.segs[line.segs.length - 1];
      if (last && last.color === r.color) last.text += r.text;
      else line.segs.push({ color: r.color, text: r.text });
    }
    out.push(...lines);
  }
  return out;
}

module.exports = { readColoredLines };
