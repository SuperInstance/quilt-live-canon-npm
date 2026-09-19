// index.js — Live Canon: AI-Writings as a navigable cell fabric
// 71 papers, byte-exact with Python, C, Rust, Verilog, VHDL, JavaScript.
// 7 operations: NAVIGATE, CONFLUENCE, LINEAGE, GHOST, TICK, CLAIM, DRILL.
// State hash: 0x445185a3a99fd2e7 (F98-F169, canonical serialization)
//
// The canonical state hash is FNV-1a 64-bit over the canonical cell
// serialization (type(1)=0x01 ‖ id(8 LE) ‖ dials(16×int16 LE) ‖
// neighbors(8*N LE)), byte-exact with the Cloudflare Worker
// (quilt-live-canon worker.js). The retired dial-only hash
// (0x7f563ed9982496a1 over this corpus) is kept as
// legacyDialOnlyStateHash() for provenance only.

const FNV_OFFSET = 0xCBF29CE484222325n;
const FNV_PRIME  = 0x00000100000001B3n;
const MASK       = 0xFFFFFFFFFFFFFFFFn;

function fnv1a_64(s) {
  let h = FNV_OFFSET;
  const enc = new TextEncoder();
  const bytes = enc.encode(s);
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * FNV_PRIME) & MASK;
  }
  return h;
}

function cellToDials(p) {
  const year = parseInt((p.date || '1970-01-01').slice(0, 4)) || 1970;
  const yearQ = (year - 1970) * 546;
  const phaseQ = (p.phase || 0) * 218;
  const fQ = (p.f_number || 0) * 218;
  const nRefs = (p.ref_papers || []).length + (p.ref_f_numbers || []).length;
  const nRefsQ = Math.min(0x7FFF, nRefs * 256);
  const th = fnv1a_64(p.title || '');
  const titleLo = Number(th & 0xFFFFn);
  const titleHi = Number((th >> 16n) & 0xFFFFn);
  const num = Math.min(p.number || 0, 500);
  const numQ = num * 131;
  return [numQ, titleLo, fQ, phaseQ, yearQ, nRefsQ, titleHi, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

// ===== Canonical cell serialization (Quilt spec, byte-exact with the Worker) =====
// type(1) || id(8 LE) || dials(32 LE) || neighbors(8*N LE)
function fnv1a64Bytes(bytes) {
  let h = FNV_OFFSET;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * FNV_PRIME) & MASK;
  }
  return h;
}

function serializeCell(cellId, dials, neighbors) {
  const out = new Uint8Array(1 + 8 + 32 + 8 * neighbors.length);
  out[0] = 0x01;
  const dv = new DataView(out.buffer);
  let id = BigInt(cellId);
  for (let i = 0; i < 8; i++) {
    dv.setUint8(1 + i, Number(id & 0xFFn));
    id >>= 8n;
  }
  for (let i = 0; i < 16; i++) {
    dv.setInt16(9 + i * 2, dials[i] | 0, true);
  }
  let off = 41;
  for (const n of neighbors) {
    let nn = BigInt(n);
    for (let i = 0; i < 8; i++) {
      dv.setUint8(off + i, Number(nn & 0xFFn));
      nn >>= 8n;
    }
    off += 8;
  }
  return out;
}

function cellHash(cellId, dials, neighbors) {
  const h = fnv1a64Bytes(serializeCell(cellId, dials, neighbors));
  return `0x${h.toString(16).padStart(16, "0")}`;
}

// Declared canon target: canonical serialization over the 71-paper committed
// corpus. COMPUTED, then pinned — verified by test/test.js.
const CANON_TARGET = 0x445185a3a99fd2e7n;

// Provenance pins (all COMPUTED, then pinned):
//   0x7f563ed9982496a1 — legacy dial-only over this 71-paper bundle (v0.9.0 claim)
//   0xbf27a3631cdee337 — dial-only over the retired 9-paper v0.2.0 bundle (stranded)
const LEGACY_DIAL_ONLY_71 = 0x7f563ed9982496a1n;
const LEGACY_DIAL_ONLY_9 = 0xbf27a3631cdee337n;

function canonicalStateHash(papers) {
  const cells = Object.values(papers).map(p => ({
    id: p.number,
    dials: cellToDials(p),
    neighbors: (p.ref_papers || []).map(n => Number(n)),
  }));
  cells.sort((a, b) => a.id - b.id);
  let combined = new Uint8Array(0);
  for (const c of cells) {
    const enc = serializeCell(c.id, c.dials, c.neighbors);
    const next = new Uint8Array(combined.length + enc.length);
    next.set(combined, 0);
    next.set(enc, combined.length);
    combined = next;
  }
  return fnv1a64Bytes(combined);
}

function stateHash(papers) {
  // The canonical state hash. The dial-only algorithm is retired.
  return canonicalStateHash(papers);
}

function stateHashString(papers) {
  return `0x${stateHash(papers).toString(16).padStart(16, "0")}`;
}

function legacyDialOnlyStateHash(papers) {
  // RETIRED v0.9.0-and-earlier algorithm. Kept for provenance only —
  // a number produced by this function can never equal a canonical hash.
  const dials = Object.values(papers).map(cellToDials);
  dials.sort((a, b) => a[0] - b[0]);
  let h = FNV_OFFSET;
  for (const d of dials) {
    for (const v of d) {
      const lo = v & 0xFF;
      const hi = (v >> 8) & 0xFF;
      h ^= BigInt(lo);
      h = (h * FNV_PRIME) & MASK;
      h ^= BigInt(hi);
      h = (h * FNV_PRIME) & MASK;
    }
  }
  return h;
}

function classifyTargetProvenance(target) {
  const t = BigInt(target);
  if (t === CANON_TARGET) return "live";
  if (t === LEGACY_DIAL_ONLY_71) return "reachable"; // right corpus, retired algorithm
  if (t === LEGACY_DIAL_ONLY_9) return "stranded";  // retired algorithm + retired corpus
  return "unknown";
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 16; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  na = Math.sqrt(na);
  nb = Math.sqrt(nb);
  if (na === 0 || nb === 0) return 0;
  return dot / (na * nb);
}

function navigate(canon, start, depth = 1) {
  const visited = new Set([start]);
  const result = [];
  const queue = [[start, 0]];
  while (queue.length > 0) {
    const [num, d] = queue.shift();
    const paper = canon[num];
    if (paper) {
      result.push({ depth: d, paper });
      if (d < depth) {
        for (const ref of (paper.ref_papers || [])) {
          if (canon[ref] && !visited.has(ref)) {
            visited.add(ref);
            queue.push([ref, d + 1]);
          }
        }
      }
    }
  }
  return result;
}

function confluence(canon, paperNums) {
  if (!paperNums || paperNums.length === 0) return { error: "no papers" };
  let sharedRefs = null;
  let sharedF = null;
  const titles = [];
  for (const num of paperNums) {
    const p = canon[num];
    if (!p) continue;
    titles.push(p.title);
    const refs = new Set(p.ref_papers || []);
    sharedRefs = sharedRefs === null ? refs : new Set([...sharedRefs].filter(x => refs.has(x)));
    const fs = new Set(p.ref_f_numbers || []);
    sharedF = sharedF === null ? fs : new Set([...sharedF].filter(x => fs.has(x)));
  }
  let suggested = `Composition of ${paperNums.length} papers`;
  if (sharedF && sharedF.size > 0) {
    const first = [...sharedF].sort((a, b) => a - b)[0];
    suggested = `F${first} Synthesis: ${titles.join(", ")}`;
  }
  const maxN = Math.max(...Object.keys(canon).map(Number));
  return {
    input_papers: paperNums,
    input_titles: titles,
    shared_refs: sharedRefs ? [...sharedRefs].sort((a, b) => a - b) : [],
    shared_f_numbers: sharedF ? [...sharedF].sort((a, b) => a - b) : [],
    suggested_title: suggested,
    ghost_paper: `paper-${maxN + 1}.md`,
  };
}

function lineage(canon, fNumber) {
  const result = [];
  for (const p of Object.values(canon)) {
    if ((p.ref_f_numbers || []).includes(fNumber)) {
      result.push(p);
    }
  }
  result.sort((a, b) => (a.phase || 0) - (b.phase || 0));
  return result;
}

function ghost(canon, paperNum, k = 5) {
  const target = canon[paperNum];
  if (!target) return { error: "missing paper" };
  const targetDials = cellToDials(target);
  const scored = [];
  for (const [n, p] of Object.entries(canon)) {
    if (Number(n) === paperNum) continue;
    const score = cosine(targetDials, cellToDials(p));
    scored.push({ id: `p${String(n).padStart(4, '0')}`, score: Math.round(score * 10000) / 10000 });
  }
  scored.sort((a, b) => b.score - a.score);
  return {
    source_paper: `paper-${paperNum}.md`,
    neighbors: scored.slice(0, k),
    suggested_title: `A Bridge between F${target.f_number || 0} and its neighbors`,
  };
}

function tick(canon) {
  return { ticked_cells: Object.keys(canon).length };
}

function scorePaper(canon, bodies, paperNum, paper, qTokens, queryFns) {
  const title = (paper.title || '').toLowerCase();
  const bodyData = bodies[paperNum] || {};
  const body = (bodyData.excerpt || '').toLowerCase();
  const h1 = (bodyData.h1 || '').toLowerCase();

  let titleMatches = 0, h1Matches = 0, bodyMatches = 0, fnMatches = 0;
  for (const t of qTokens) {
    if (title.includes(t)) titleMatches++;
    if (h1.includes(t)) h1Matches++;
    if (body.includes(t)) bodyMatches++;
  }
  for (const f of queryFns) {
    if ((paper.ref_f_numbers || []).includes(f)) fnMatches++;
  }
  const recency = (paper.f_number || 0) * 0.1;
  const score = titleMatches * 100 + h1Matches * 50 + bodyMatches * 25 + fnMatches * 200 + recency;
  return {
    score: Math.round(score * 10) / 10,
    breakdown: { title: titleMatches, h1: h1Matches, body: bodyMatches, fn: fnMatches, recency: Math.round(recency * 10) / 10 }
  };
}

function claim(canon, bodies, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return { error: 'empty query' };
  const qTokens = q.split(/\s+/).filter(t => t.length >= 2);
  if (qTokens.length === 0) return { error: 'query too short' };
  const queryFns = (q.match(/f\s*(\d+)/gi) || []).map(s => parseInt(s.replace(/f\s*/i, ''), 10));

  const scored = [];
  for (const [nStr, paper] of Object.entries(canon)) {
    const n = Number(nStr);
    const r = scorePaper(canon, bodies, n, paper, qTokens, queryFns);
    if (r.score > 0) {
      const bodyData = bodies[n] || {};
      scored.push({
        number: n,
        title: paper.title,
        f_number: paper.f_number,
        phase: paper.phase,
        date: paper.date,
        ref_f_numbers: paper.ref_f_numbers || [],
        score: r.score,
        match_breakdown: r.breakdown,
        excerpt: bodyData.excerpt || '',
      });
    }
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.f_number || 0) !== (a.f_number || 0)) return (b.f_number || 0) - (a.f_number || 0);
    return b.ref_f_numbers.length - a.ref_f_numbers.length;
  });
  return {
    query: query,
    tokens: qTokens,
    winner: scored[0] || null,
    runners_up: scored.slice(1, 4),
    total_candidates: scored.length,
  };
}

function drill(canon, bodies, query) {
  const c = claim(canon, bodies, query);
  if (c.error) return c;
  if (!c.winner) return { error: 'no matching paper', query };
  let top = [c.winner, ...(c.runners_up || [])].slice(0, 3);
  while (top.length < 3) top.push(null);

  if (top.every(t => t)) {
    const refSets = top.map(t => new Set(t.ref_f_numbers || []));
    const citedBy = top.map((t, i) =>
      refSets.reduce((acc, s, j) => acc + (j !== i && s.has(t.f_number) ? 1 : 0), 0)
    );
    const maxIdx = citedBy.indexOf(Math.max(...citedBy));
    if (maxIdx !== 0) {
      [top[0], top[maxIdx]] = [top[maxIdx], top[0]];
    }
  }

  const card = (t, role) => {
    if (!t) return null;
    return {
      number: t.number, title: t.title, f_number: t.f_number,
      phase: t.phase, date: t.date, role,
      score: t.score,
      excerpt: (t.excerpt || '').slice(0, 500),
    };
  };
  return {
    query: query,
    curriculum: {
      doctrine: card(top[0], 'DOCTRINE — the paper that defines the concept'),
      implementation: card(top[1], 'IMPLEMENTATION — the paper that builds the thing'),
      verification: card(top[2], 'VERIFICATION — the paper that audits the result'),
    },
  };
}

// Load the bundled canon and bodies from data.json (sibling of index.js)
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'data.json');
const _data = fs.existsSync(dataPath)
  ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  : { canon: {}, bodies: {} };
const DEFAULT_CANON = {};
for (const [k, v] of Object.entries(_data.canon || {})) {
  DEFAULT_CANON[Number(k)] = v;
}
const BODIES = {};
for (const [k, v] of Object.entries(_data.bodies || {})) {
  BODIES[Number(k)] = v;
}

class LiveCanon {
  constructor(canon = null, bodies = null) {
    this._canon = canon || DEFAULT_CANON;
    this._bodies = bodies || BODIES;
  }
  get canon() { return this._canon; }
  get bodies() { return this._bodies; }
  papers() { return Object.values(this._canon); }
  get paperCount() { return Object.keys(this._canon).length; }
  get bodyCount() { return Object.keys(this._bodies).length; }
  stateHash() { return stateHash(this._canon); }
  get stateHashString() { return stateHashString(this._canon); }
  navigate(start, depth = 1) { return navigate(this._canon, start, depth); }
  confluence(paperNums) { return confluence(this._canon, paperNums); }
  lineage(fNumber) { return lineage(this._canon, fNumber); }
  ghost(paperNum, k = 5) { return ghost(this._canon, paperNum, k); }
  tick() { return tick(this._canon); }
  claim(query) { return claim(this._canon, this._bodies, query); }
  drill(query) { return drill(this._canon, this._bodies, query); }
}

module.exports = {
  LiveCanon, fnv1a_64, stateHash, stateHashString, cellToDials,
  serializeCell, cellHash, canonicalStateHash, legacyDialOnlyStateHash,
  classifyTargetProvenance, CANON_TARGET,
  DEFAULT_CANON, BODIES,
};
