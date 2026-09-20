// test/test.js — verify the Live Canon npm package (71-paper canon,
// canonical serialization). The canon-hash guard is the drift-closure
// contract: stateHash(bundled canon) MUST equal CANON_TARGET.
const assert = require('node:assert');
const {
  LiveCanon, DEFAULT_CANON, BODIES, CANON_TARGET,
  fnv1a_64, fnv1a_64_bytes, serializeCell, stateHash, stateHashInt, cellToDials,
} = require('../index.js');

const canon = new LiveCanon();
let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed++; console.log('✓ ' + msg); }

// ---- Canon-hash guard (the contract) ----
ok(canon.paperCount === 71, `71 papers bundled (got ${canon.paperCount})`);
ok(canon.bodyCount === 71, `71 bodies bundled (got ${canon.bodyCount})`);
const h = canon.stateHash();
ok(h === CANON_TARGET, `state hash == CANON_TARGET ${CANON_TARGET} (got ${h})`);
ok(canon.stateHashString === CANON_TARGET, 'stateHashString alias matches');
ok(stateHashInt(DEFAULT_CANON) === BigInt(CANON_TARGET), 'stateHashInt matches');
ok(stateHash(DEFAULT_CANON) === h, 'module-level stateHash matches instance');

// ---- Serialization primitives ----
const enc = serializeCell(1, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], [2,3]);
ok(enc.length === 41 + 16, `serializeCell length 41+8*n (got ${enc.length})`);
ok(enc[0] === 0x01, 'serializeCell tag 0x01');
ok(fnv1a_64('F115 — The Logical Routes') === fnv1a_64('F115 — The Logical Routes'),
   'fnv1a_64 deterministic');

// Dials sanity for paper 425 (F115) — first dial = min(number,500)*131
const d425 = cellToDials(DEFAULT_CANON[425]);
ok(d425.length === 16 && d425[0] === 425 * 131, 'cellToDials(425)[0] = 425*131');

// ---- The 7 operations ----
const nav = canon.navigate(425, 2);
ok(nav.length > 0 && nav[0].paper.number === 425, `NAVIGATE(425,2) → ${nav.length} cells`);

const conf = canon.confluence([425, 432, 439]);
ok(typeof conf.suggested_title === 'string' && conf.suggested_title.length > 0,
   `CONFLUENCE: "${String(conf.suggested_title).slice(0, 50)}..."`);

const lin = canon.lineage(115);
ok(lin.length > 0 && lin.some(p => p.f_number === 116), `LINEAGE(F115) → ${lin.length} papers`);

const g = canon.ghost(425, 5);
ok(g.neighbors.length === 5, `GHOST(425,5) → top ${g.neighbors[0].id} (score ${g.neighbors[0].score})`);

const tk = canon.tick();
ok(tk.ticked_cells === 71, `TICK → ${tk.ticked_cells} cells`);

const cl = canon.claim('trust ladder');
ok(cl.winner && cl.winner.f_number === 168, `CLAIM("trust ladder") → F${cl.winner && cl.winner.f_number}`);

const dr = canon.drill('Mudra vessel bridge');
ok(dr.curriculum && dr.curriculum.doctrine && dr.curriculum.doctrine.f_number === 164,
   `DRILL("Mudra vessel bridge") → F${dr.curriculum && dr.curriculum.doctrine && dr.curriculum.doctrine.f_number}`);

console.log(`\n${passed} tests passed. Canon state == ${h} — the front is closed by convergence.`);
