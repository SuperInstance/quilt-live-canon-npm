// test/canon-hash.test.js — the drift-closure contract for the npm package.
// The bundled CANON must hash (under canonical serialization) to
// CANON_TARGET. If this fails, the drift front is OPEN again.
// Run: node test/canon-hash.test.js
const assert = require('node:assert');
const { DEFAULT_CANON, stateHash, CANON_TARGET } = require('../index.js');

const n = Object.keys(DEFAULT_CANON).length;
const h = stateHash(DEFAULT_CANON);

console.log(`papers: ${n}`);
console.log(`state_hash:   ${h}`);
console.log(`canon_target: ${CANON_TARGET}`);

assert.strictEqual(n, 71, `corpus incomplete: ${n} papers bundled, expected 71`);
assert.strictEqual(h, CANON_TARGET, `FAIL — drift front open: ${h} ≠ ${CANON_TARGET}`);
console.log('PASS — bundled canon equals the fleet canon target.');
process.exit(0);
