// test/test.js — verify the Live Canon npm package
// Doctrine: numbers are not trusted; they are computed, then pinned.
const assert = require('node:assert');
const {
  LiveCanon, DEFAULT_CANON, BODIES, fnv1a_64, cellToDials, stateHash, stateHashString,
  serializeCell, cellHash, canonicalStateHash, legacyDialOnlyStateHash,
  classifyTargetProvenance, CANON_TARGET,
} = require('../index.js');

const canon = new LiveCanon();

// Test 1: bundled canon has 71 papers
assert.strictEqual(canon.paperCount, 71, 'expected 71 papers');
console.log('✓ 71 papers bundled (F98-F169)');

// Test 2: canonical test cell — the cross-substrate contract
assert.strictEqual(
  cellHash(1, Array.from({ length: 16 }, (_, i) => i + 1), [2, 3, 4]),
  '0xe435d91d6d92a1d8',
  'canonical test cell hash mismatch'
);
console.log('✓ canonical test cell = 0xe435d91d6d92a1d8');

// Test 3: canonical state hash over the bundled corpus == pinned canon target
assert.strictEqual(stateHashString(DEFAULT_CANON), '0x445185a3a99fd2e7', 'canonical state hash mismatch');
assert.strictEqual(canon.stateHashString, '0x445185a3a99fd2e7');
assert.strictEqual(stateHash(DEFAULT_CANON), CANON_TARGET);
console.log('✓ canonical state hash = 0x445185a3a99fd2e7 == CANON_TARGET (computed, then pinned)');

// Test 4: provenance pin — legacy dial-only reproduces the v0.9.0 claim
const legacy = legacyDialOnlyStateHash(DEFAULT_CANON);
assert.strictEqual(legacy, 0x7f563ed9982496a1n, 'legacy dial-only provenance mismatch');
console.log('✓ legacy dial-only = 0x7f563ed9982496a1 (v0.9.0 claim) reproduced over the SAME corpus');

// Test 5: the two algorithms are different surfaces — never silently equal
assert.notStrictEqual(legacy, stateHash(DEFAULT_CANON));
console.log('✓ canonical != legacy (no accidental agreement)');

// Test 6: target provenance classification (quilt-floor drift doctrine)
assert.strictEqual(classifyTargetProvenance(0x445185a3a99fd2e7n), 'live');
assert.strictEqual(classifyTargetProvenance(0x7f563ed9982496a1n), 'reachable');
assert.strictEqual(classifyTargetProvenance(0xbf27a3631cdee337n), 'stranded');
assert.strictEqual(classifyTargetProvenance(0xdeadbeefn), 'unknown');
console.log('✓ provenance classification live/reachable/stranded/unknown');

// Test 7: NAVIGATE
const path = canon.navigate(425, 2);
assert.ok(path.length > 0, 'expected path');
assert.strictEqual(path[0].paper.number, 425, 'first paper should be 425');
console.log(`✓ NAVIGATE(425, 2) returned ${path.length} cells`);

// Test 8: CONFLUENCE
const conf = canon.confluence([425, 432, 439]);
assert.ok(conf.suggested_title, 'expected suggested title');
console.log(`✓ CONFLUENCE: "${conf.suggested_title.slice(0, 50)}..."`);

// Test 9: LINEAGE
const lin = canon.lineage(115);
assert.ok(lin.length > 0, 'expected lineage');
assert.ok(lin.some(p => p.f_number === 116), 'lineage should include F116');
console.log(`✓ LINEAGE(F115): ${lin.length} papers`);

// Test 10: GHOST
const g = canon.ghost(425, 5);
assert.ok(g.neighbors.length > 0, 'expected neighbors');
console.log(`✓ GHOST(425, 5): top = ${g.neighbors[0].id} (score=${g.neighbors[0].score})`);

// Test 11: TICK
const tk = canon.tick();
assert.strictEqual(tk.ticked_cells, 71, 'expected 71 ticked cells');
console.log(`✓ TICK: ${tk.ticked_cells} cells`);

// Test 12: CLAIM + DRILL (the F169 operations)
const cl = canon.claim('polyformalism');
assert.ok(cl, 'expected a claim result');
const dr = canon.drill('polyformalism');
assert.ok(dr, 'expected a drill result');
console.log('✓ CLAIM + DRILL respond');

// Test 13: FNV-1a + dials
const h = fnv1a_64('F115 — The Logical Routes');
console.log(`✓ FNV-1a("F115 — The Logical Routes") = 0x${h.toString(16)}`);
const d425 = cellToDials(DEFAULT_CANON[425]);
assert.strictEqual(d425.length, 16, 'expected 16 dials');
console.log(`✓ cellToDials(paper-425) = [${d425.slice(0, 7).join(', ')}]`);

console.log('\nAll tests passed! Live Canon npm package is byte-exact with the Worker.');
